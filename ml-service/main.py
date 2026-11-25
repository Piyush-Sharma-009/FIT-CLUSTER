import json
import os
import secrets
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel, Field
from app.services.diet_optimizer import DietRequest, solve_milp_diet
from app.vision.food_vision_pipeline import analyze_plate_image
from app.learning.active_learning import FeedbackQueueFull, save_portion_correction
from app.vision.train_portion_model import INDIAN_FOOD_CLASSES
from app.workouts.workout_predictor import (
    generate_weekly_blueprint,
    adapt_single_day_biofeedback,
    reschedule_remaining_week,
)
from app.workouts.exercise_recommender import recommend_exercises_for_day

app = FastAPI(title="FIT-CLUSTER ML Service")
MAX_MEAL_IMAGE_BYTES = 8 * 1024 * 1024


class GenerateWeekRequest(BaseModel):
    age: int
    bmi: float
    goal: str
    experience: str
    workoutPreference: str
    activityLevel: str
    equipment: Optional[List[str]] = ["Bodyweight Only"]
    weekDates: List[str]  # 7 YYYY-MM-DD strings (Mon..Sun)
    historyMap: Optional[Dict[str, Any]] = {}


class AdaptBiofeedbackRequest(BaseModel):
    dayPlan: Dict[str, Any]
    sleepHours: float = Field(..., ge=0, le=24)
    energyLevel: int = Field(..., ge=1, le=10)
    mood: str


class RescheduleWeekRequest(BaseModel):
    days: List[Dict[str, Any]]
    todayIndex: int = Field(..., ge=0, le=6)
    profile: Dict[str, Any]
    baseSets: int
    baseReps: str
    baseRest: int
    historyMap: Optional[Dict[str, Any]] = {}


class RecommendExercisesRequest(BaseModel):
    muscleGroups: List[str]
    profile: Dict[str, Any]
    baseSets: int = 3
    baseReps: str = "8-12 reps"
    restSeconds: int = 90
    historyMap: Optional[Dict[str, Any]] = {}
    readinessScore: float = 75.0
    count: int = 4


@app.get("/")
def health_check():
    return {"status": "FIT-CLUSTER ML Service Running"}


def _handle_optimize_diet(payload: DietRequest):
    try:
        result = solve_milp_diet(payload)
        if not result.get("success"):
            raise HTTPException(status_code=422, detail=result.get("error", "Optimization failed"))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"MILP Solver Error: {str(exc)}")


@app.post("/optimize-diet")
@app.post("/api/ml/optimize-diet")
def optimize_diet(payload: DietRequest):
    return _handle_optimize_diet(payload)


@app.post("/api/ml/generate-week")
def api_generate_week(payload: GenerateWeekRequest):
    return generate_weekly_blueprint(
        payload.model_dump(),
        payload.bmi,
        payload.weekDates,
        payload.historyMap,
    )


@app.post("/api/ml/adapt-day")
def api_adapt_day(payload: AdaptBiofeedbackRequest):
    return adapt_single_day_biofeedback(
        payload.dayPlan,
        payload.sleepHours,
        payload.energyLevel,
        payload.mood,
    )


@app.post("/api/ml/reschedule-week")
def api_reschedule_week(payload: RescheduleWeekRequest):
    updated_days, changed = reschedule_remaining_week(
        payload.days,
        payload.todayIndex,
        payload.profile,
        payload.baseSets,
        payload.baseReps,
        payload.baseRest,
        payload.historyMap,
    )
    return {"days": updated_days, "rescheduled": changed}


@app.post("/api/ml/recommend-exercises")
def api_recommend_exercises(payload: RecommendExercisesRequest):
    return {
        "exercises": recommend_exercises_for_day(
            muscle_groups=payload.muscleGroups,
            user_profile=payload.profile,
            base_sets=payload.baseSets,
            base_reps=payload.baseReps,
            rest_seconds=payload.restSeconds,
            history_map=payload.historyMap,
            readiness_score=payload.readinessScore,
            count=payload.count,
        )
    }

@app.post("/api/ml/analyze-meal-image")
async def api_analyze_meal_image(image: UploadFile = File(...)):
    if image.size is not None and image.size > MAX_MEAL_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")

    img_bytes = await image.read(MAX_MEAL_IMAGE_BYTES + 1)
    if len(img_bytes) > MAX_MEAL_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")

    try:
        return analyze_plate_image(img_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vision Pipeline Error: {str(exc)}")


@app.post("/api/ml/portion-feedback", status_code=410)
def disabled_portion_feedback():
    raise HTTPException(
        status_code=410,
        detail="Direct portion-model updates are disabled; corrections must be reviewed before training.",
    )


@app.post("/feedback/correction", status_code=202)
async def submit_meal_correction(
    image: UploadFile = File(...),
    food_key: str = Form(...),
    predicted_grams: float = Form(...),
    corrected_grams: float = Form(...),
    bbox: str = Form(...),
    plate_box: str = Form(...),
    user_id: str = Form(...),
    x_ml_service_key: Optional[str] = Header(default=None, alias="X-ML-Service-Key"),
):
    expected_key = os.getenv("ML_SERVICE_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail="Meal feedback service is not configured",
        )
    if not x_ml_service_key or not secrets.compare_digest(x_ml_service_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid ML service credentials")

    if image.size is not None and image.size > MAX_MEAL_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")
    image_bytes = await image.read(MAX_MEAL_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_MEAL_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")

    if food_key not in INDIAN_FOOD_CLASSES:
        raise HTTPException(
            status_code=422,
            detail="This food class is not supported by the portion estimator",
        )
    try:
        bbox_list = json.loads(bbox)
        plate_box_list = json.loads(plate_box)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Bounding boxes must be valid JSON") from exc

    try:
        queued_sample = save_portion_correction(
            image_bytes=image_bytes,
            user_id=user_id,
            food_key=food_key,
            predicted_grams=predicted_grams,
            corrected_grams=corrected_grams,
            bbox=bbox_list,
            plate_box=plate_box_list,
        )
    except FeedbackQueueFull as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"queued": True, **queued_sample}