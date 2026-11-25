from datetime import datetime, timezone
from io import BytesIO
import json
import math
import os
import re
import shutil
import threading
import uuid
from pathlib import Path

import cv2
import numpy as np
import yaml
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]
AL_DIR = BASE_DIR / "active_learning"
INCOMING_IMG_DIR = AL_DIR / "incoming" / "images"
INCOMING_LBL_DIR = AL_DIR / "incoming" / "labels"
REPLAY_IMG_DIR = AL_DIR / "replay" / "images"
REPLAY_LBL_DIR = AL_DIR / "replay" / "labels"
STAGE_DIR = AL_DIR / "staged_dataset"
YOLO_WEIGHTS_PATH = BASE_DIR / "models" / "food_yolo_best.pt"
PORTION_REVIEW_DIR = AL_DIR / "portion_review"
MAX_PENDING_PORTION_SAMPLES_PER_USER = 50
MAX_FEEDBACK_IMAGE_BYTES = 8 * 1024 * 1024
MAX_FEEDBACK_IMAGE_PIXELS = 20_000_000

RETRAIN_THRESHOLD = 10  # Auto-finetune after every 10 corrections
_train_lock = threading.Lock()


class FeedbackQueueFull(Exception):
    pass


def _validate_feedback_box(box: list, name: str, width: int, height: int) -> list[int]:
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError(f"{name} must contain four coordinates")

    coordinates = []
    for coordinate in box:
        if (
            isinstance(coordinate, bool)
            or not isinstance(coordinate, (int, float))
            or not math.isfinite(coordinate)
            or not float(coordinate).is_integer()
        ):
            raise ValueError(f"{name} coordinates must be finite integers")
        coordinates.append(int(coordinate))

    x1, y1, x2, y2 = coordinates
    if x1 < 0 or y1 < 0 or x2 > width or y2 > height or x1 >= x2 or y1 >= y2:
        raise ValueError(f"{name} must be a non-empty box inside the image")
    return coordinates


def save_portion_correction(
    image_bytes: bytes,
    user_id: str,
    food_key: str,
    predicted_grams: float,
    corrected_grams: float,
    bbox: list,
    plate_box: list,
) -> dict:
    if not re.fullmatch(r"[a-fA-F0-9]{24}", user_id or ""):
        raise ValueError("A valid user ID is required")
    if not re.fullmatch(r"[a-z0-9_]{1,64}", food_key or ""):
        raise ValueError("A valid food key is required")
    if not isinstance(image_bytes, bytes) or not image_bytes:
        raise ValueError("An image is required")
    if len(image_bytes) > MAX_FEEDBACK_IMAGE_BYTES:
        raise ValueError("Image must be 8 MB or smaller")
    if (
        not math.isfinite(predicted_grams)
        or not math.isfinite(corrected_grams)
        or predicted_grams < 5
        or predicted_grams > 1000
        or corrected_grams < 5
        or corrected_grams > 1000
        or abs(corrected_grams - predicted_grams) < 2
    ):
        raise ValueError("Portion weights must be between 5g and 1000g and differ by at least 2g")

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            width, height = image.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("Invalid or unreadable image file") from exc

    if width * height > MAX_FEEDBACK_IMAGE_PIXELS:
        raise ValueError("Image dimensions exceed the supported limit")

    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid or unreadable image file")

    height, width = image.shape[:2]
    normalized_bbox = _validate_feedback_box(bbox, "bbox", width, height)
    normalized_plate_box = _validate_feedback_box(plate_box, "plateBox", width, height)

    user_dir = PORTION_REVIEW_DIR / user_id.lower()
    user_dir.mkdir(parents=True, exist_ok=True)
    pending_count = len(list(user_dir.glob("*.json")))
    if pending_count >= MAX_PENDING_PORTION_SAMPLES_PER_USER:
        raise FeedbackQueueFull("Your portion-feedback review queue is full")

    encoded, normalized_image = cv2.imencode(".jpg", image)
    if not encoded:
        raise ValueError("Unable to normalize the uploaded image")

    sample_id = uuid.uuid4().hex
    image_path = user_dir / f"{sample_id}.jpg"
    metadata_path = user_dir / f"{sample_id}.json"
    temporary_image = user_dir / f".{sample_id}.jpg.tmp"
    temporary_metadata = user_dir / f".{sample_id}.json.tmp"
    metadata = {
        "sampleId": sample_id,
        "userId": user_id.lower(),
        "foodKey": food_key,
        "predictedGrams": predicted_grams,
        "correctedGrams": corrected_grams,
        "bbox": normalized_bbox,
        "plateBox": normalized_plate_box,
        "status": "pending_review",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    try:
        temporary_image.write_bytes(normalized_image.tobytes())
        temporary_metadata.write_text(
            json.dumps(metadata, separators=(",", ":")),
            encoding="utf-8",
        )
        os.replace(temporary_image, image_path)
        os.replace(temporary_metadata, metadata_path)
    except OSError:
        for path in (temporary_image, temporary_metadata, image_path, metadata_path):
            try:
                path.unlink()
            except FileNotFoundError:
                pass
        raise

    return {
        "sampleId": sample_id,
        "status": metadata["status"],
        "pendingCount": pending_count + 1,
    }


def save_yolo_correction(
    image_bytes: bytes,
    bbox: list[int],
    class_name: str,
    model_names: dict[int, str],
) -> dict:
    """
    Saves the corrected image + YOLO normalized label (.txt).
    bbox format: [x1, y1, x2, y2] in pixels.
    """
    INCOMING_IMG_DIR.mkdir(parents=True, exist_ok=True)
    INCOMING_LBL_DIR.mkdir(parents=True, exist_ok=True)

    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image bytes")

    h, w = img.shape[:2]
    x1, y1, x2, y2 = bbox

    # Convert pixel bbox to YOLO normalized format: cx, cy, bw, bh
    cx = ((x1 + x2) / 2.0) / w
    cy = ((y1 + y2) / 2.0) / h
    bw = max(1, x2 - x1) / w
    bh = max(1, y2 - y1) / h

    # Find existing class ID (case-insensitive)
    name_to_id = {v.lower(): k for k, v in model_names.items()}
    cls_key = class_name.strip().lower()
    if cls_key not in name_to_id:
        # Save as a pending new class for future batch review
        pending_file = AL_DIR / "pending_new_classes.jsonl"
        sample_id = uuid.uuid4().hex[:10]
        cv2.imwrite(str(INCOMING_IMG_DIR / f"new_{sample_id}.jpg"), img)
        with open(pending_file, "a", encoding="utf-8") as f:
            f.write(json.dumps({"id": sample_id, "class": class_name, "bbox": bbox}) + "\n")
        return {"queued": True, "retrainReady": False, "note": "Saved as new class sample"}

    cls_id = name_to_id[cls_key]
    sample_id = uuid.uuid4().hex[:10]

    cv2.imwrite(str(INCOMING_IMG_DIR / f"{sample_id}.jpg"), img)
    with open(INCOMING_LBL_DIR / f"{sample_id}.txt", "w", encoding="utf-8") as f:
        f.write(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n")

    incoming_count = len(list(INCOMING_LBL_DIR.glob("*.txt")))
    return {
        "queued": True,
        "incomingCount": incoming_count,
        "retrainReady": incoming_count >= RETRAIN_THRESHOLD,
    }


def run_background_yolo_finetune(model_names: dict[int, str], reload_callback):
    """
    Merges incoming corrections + replay buffer, runs a lightweight frozen-backbone
    fine-tune, replaces food_yolo_best.pt, and reloads the live model.
    """
    if not _train_lock.acquire(blocking=False):
        return  # Already training in background

    try:
        train_imgs = STAGE_DIR / "images" / "train"
        train_lbls = STAGE_DIR / "labels" / "train"
        if STAGE_DIR.exists():
            shutil.rmtree(STAGE_DIR)
        train_imgs.mkdir(parents=True, exist_ok=True)
        train_lbls.mkdir(parents=True, exist_ok=True)

        # Copy both replay buffer and incoming corrections into staged dataset
        for src_img, src_lbl in [(REPLAY_IMG_DIR, REPLAY_LBL_DIR), (INCOMING_IMG_DIR, INCOMING_LBL_DIR)]:
            for lbl_path in src_lbl.glob("*.txt"):
                img_path = src_img / f"{lbl_path.stem}.jpg"
                if img_path.exists():
                    shutil.copy(img_path, train_imgs / img_path.name)
                    shutil.copy(lbl_path, train_lbls / lbl_path.name)

        data_yaml = STAGE_DIR / "data.yaml"
        yaml_content = {
            "path": str(STAGE_DIR.resolve()),
            "train": "images/train",
            "val": "images/train",
            "nc": len(model_names),
            "names": [model_names[i] for i in sorted(model_names.keys())],
        }
        with open(data_yaml, "w", encoding="utf-8") as f:
            yaml.safe_dump(yaml_content, f)

        # Freeze backbone layers & use explicit AdamW + low lr0 to prevent forgetting
        model = YOLO(str(YOLO_WEIGHTS_PATH))
        model.train(
            data=str(data_yaml),
            epochs=5,
            imgsz=640,
            batch=8,
            freeze=10,
            optimizer="AdamW",
            lr0=0.0005,
            project=str(AL_DIR / "runs"),
            name="auto_finetune",
            exist_ok=True,
        )

        best_pt = AL_DIR / "runs" / "auto_finetune" / "weights" / "best.pt"
        if best_pt.exists():
            shutil.copy(best_pt, YOLO_WEIGHTS_PATH)
            reload_callback()

            # Move processed incoming files into replay buffer (keep buffer clean)
            for f in INCOMING_IMG_DIR.glob("*.jpg"):
                if not f.name.startswith("new_"):
                    shutil.move(str(f), str(REPLAY_IMG_DIR / f.name))
            for f in INCOMING_LBL_DIR.glob("*.txt"):
                shutil.move(str(f), str(REPLAY_LBL_DIR / f.name))
    finally:
        _train_lock.release()