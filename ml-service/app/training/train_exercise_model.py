from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def build_overload_dataset(n_samples=2500):
    rng = np.random.default_rng(108)
    experiences = ["Beginner", "Intermediate", "Advanced"]
    mechanics = ["Compound", "Isolation"]

    rows = []
    for _ in range(n_samples):
        prev_weight = round(float(rng.uniform(5.0, 140.0)), 1)
        prev_reps = int(rng.integers(4, 18))
        target_min = int(rng.choice([5, 8, 10, 12]))
        target_max = target_min + 2
        completion_rate = round(float(rng.uniform(0.4, 1.0)), 2)
        readiness = round(float(rng.uniform(40.0, 100.0)), 1)
        exp = rng.choice(experiences)
        mech = rng.choice(mechanics)

        # Domain-grounded progressive overload rules for supervised training
        exp_step = {"Beginner": 2.5, "Intermediate": 2.5, "Advanced": 1.25}[exp]
        if mech == "Isolation":
            exp_step = min(exp_step, 1.25)

        if completion_rate >= 1.0 and prev_reps >= target_max and readiness >= 65.0:
            # Double progression: hit top of rep range cleanly -> increase load, reset reps to target_min
            next_weight = prev_weight + exp_step
            next_reps = target_min
        elif completion_rate >= 0.85 and prev_reps < target_max and readiness >= 60.0:
            # Progress reps first before adding weight
            next_weight = prev_weight
            next_reps = prev_reps + 1
        elif readiness < 50.0 or completion_rate < 0.65:
            # Fatigue or missed reps -> slight deload
            next_weight = max(2.5, round((prev_weight * 0.90) / 1.25) * 1.25)
            next_reps = target_min
        else:
            # Consolidate current weight & reps
            next_weight = prev_weight
            next_reps = prev_reps

        rows.append({
            "prev_weight_kg": prev_weight,
            "prev_reps": prev_reps,
            "target_reps_min": target_min,
            "target_reps_max": target_max,
            "completion_rate": completion_rate,
            "readiness_score": readiness,
            "experience": exp,
            "mechanics": mech,
            "next_weight_kg": round(next_weight, 2),
            "next_reps": int(next_reps),
        })

    return pd.DataFrame(rows)


def train_overload_model():
    df = build_overload_dataset()

    feature_cols = [
        "prev_weight_kg",
        "prev_reps",
        "target_reps_min",
        "target_reps_max",
        "completion_rate",
        "readiness_score",
        "experience",
        "mechanics",
    ]
    target_cols = ["next_weight_kg", "next_reps"]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                ["prev_weight_kg", "prev_reps", "target_reps_min", "target_reps_max", "completion_rate", "readiness_score"],
            ),
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["experience", "mechanics"]),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", MultiOutputRegressor(RandomForestRegressor(n_estimators=150, random_state=42))),
        ]
    )

    pipeline.fit(df[feature_cols], df[target_cols])
    joblib.dump(pipeline, MODEL_DIR / "progressive_overload_model.joblib")
    print("Model 2 trained and saved to models/progressive_overload_model.joblib")


if __name__ == "__main__":
    train_overload_model()