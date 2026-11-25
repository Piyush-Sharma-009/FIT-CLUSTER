from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

INDIAN_FOOD_CLASSES = [
    "roti",
    "rice",
    "dal",
    "paneer_sabzi",
    "chicken_curry",
    "curd",
    "boiled_egg",
    "salad",
]

# Typical reference density (grams at 10% plate area coverage) for synthetic bootstrap training
CLASS_BASE_GRAMS = {
    0: 35.0,   # roti (1 medium piece ~35g)
    1: 140.0,  # rice (1 katori/mound ~140g)
    2: 150.0,  # dal (1 bowl ~150g)
    3: 120.0,  # paneer_sabzi
    4: 140.0,  # chicken_curry
    5: 100.0,  # curd
    6: 50.0,   # boiled_egg (1 whole egg ~50g)
    7: 80.0,   # salad
}


class PortionEstimatorNet(nn.Module):
    """
    Multimodal PyTorch Model (Model 4):
    Fuses ResNet18 visual features from the cropped food bounding box
    with geometric plate-area ratios + food class embedding to regress grams.
    """

    def __init__(
        self,
        num_classes: int = len(INDIAN_FOOD_CLASSES),
        pretrained: bool = True,
    ):
        super().__init__()
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        resnet = models.resnet18(weights=weights)
        in_features = resnet.fc.in_features
        resnet.fc = nn.Identity()  # 512-d visual embedding
        self.backbone = resnet

        self.class_emb = nn.Embedding(num_classes, 16)

        # 512 (visual) + 16 (class) + 3 (area_ratio, width_ratio, height_ratio) = 531
        self.regressor = nn.Sequential(
            nn.Linear(in_features + 16 + 3, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, img_tensor, class_idx, geo_features):
        vis_feat = self.backbone(img_tensor)
        cls_feat = self.class_emb(class_idx)
        fused = torch.cat([vis_feat, cls_feat, geo_features], dim=1)
        return self.regressor(fused).squeeze(1)


class SyntheticPlateCropDataset(Dataset):
    """
    Generates realistic crop tensors + area ratios to initialize weights.
    Later fine-tuned directly on Step 11 user-corrected plate crops.
    """

    def __init__(self, n_samples: int = 800):
        self.n_samples = n_samples
        torch.manual_seed(42)
        self.images = torch.randn(n_samples, 3, 128, 128) * 0.25 + 0.5
        self.class_ids = torch.randint(0, len(INDIAN_FOOD_CLASSES), (n_samples,))

        # area_ratio in [0.04, 0.45], w_ratio, h_ratio
        area_ratios = torch.empty(n_samples).uniform_(0.04, 0.45)
        w_ratios = torch.sqrt(area_ratios) * torch.empty(n_samples).uniform_(0.85, 1.15)
        h_ratios = area_ratios / torch.clamp(w_ratios, min=0.05)
        self.geo = torch.stack([area_ratios, w_ratios, h_ratios], dim=1)

        targets = []
        for i in range(n_samples):
            cid = int(self.class_ids[i].item())
            ratio = float(area_ratios[i].item())
            base = CLASS_BASE_GRAMS[cid]
            # Scale grams non-linearly with relative plate area
            grams = base * (ratio / 0.12) ** 0.85
            targets.append(round(float(grams), 1))
        self.targets = torch.tensor(targets, dtype=torch.float32)

    def __len__(self):
        return self.n_samples

    def __getitem__(self, idx):
        return self.images[idx], self.class_ids[idx], self.geo[idx], self.targets[idx]


def train_portion_regressor(epochs: int = 8):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dataset = SyntheticPlateCropDataset(n_samples=800)
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = PortionEstimatorNet().to(device)
    # Freeze early ResNet layers for fast CPU/GPU training
    for param in list(model.backbone.parameters())[:-10]:
        param.requires_grad = False

    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
    criterion = nn.SmoothL1Loss()

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        for imgs, cids, geo, y in loader:
            imgs, cids, geo, y = imgs.to(device), cids.to(device), geo.to(device), y.to(device)
            optimizer.zero_grad()
            preds = model(imgs, cids, geo)
            loss = criterion(preds, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * imgs.size(0)
        print(f"Epoch {epoch + 1}/{epochs} - SmoothL1 Loss: {total_loss / len(dataset):.2f}")

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "classes": INDIAN_FOOD_CLASSES,
        },
        MODEL_DIR / "portion_resnet18.pt",
    )
    print("Model 4 saved to models/portion_resnet18.pt")


if __name__ == "__main__":
    train_portion_regressor()