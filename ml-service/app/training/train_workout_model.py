from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.multioutput import MultiOutputClassifier, MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def build_split_dataset(n_samples=2000):
    rng = np.random.default_rng(42)
    goals = ["Weight Loss", "Muscle Gain", "Strength", "General Fitness"]
    experiences = ["Beginner", "Intermediate", "Advanced"]
    preferences = ["Home", "Gym"]
    activities = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"]

    rows = []
    for _ in range(n_samples):
        age = int(rng.integers(16, 60))
        bmi = round(float(rng.uniform(16.5, 36.0)), 1)
        goal = rng.choice(goals)
        exp = rng.choice(experiences)
        pref = rng.choice(preferences)
        act = rng.choice(activities)

        if exp == "Beginner" or pref == "Home":
            split = "3-Day Full Body" if exp == "Beginner" else "4-Day Upper/Lower"
        elif exp == "Intermediate":
            split = "4-Day Upper/Lower" if goal in ["Strength", "General Fitness"] else "6-Day Push/Pull/Legs"
        else:
            split = "6-Day Push/Pull/Legs" if goal != "General Fitness" else "4-Day Upper/Lower"

        if goal == "Strength":
            base_sets, base_reps, rest_sec = "4", "5-6 reps", "120"
        elif goal == "Muscle Gain":
            base_sets = "4" if exp != "Beginner" else "3"
            base_reps, rest_sec = "8-12 reps", "90"
        elif goal == "Weight Loss":
            base_sets, base_reps, rest_sec = "3", "15-18 reps", "45"
        else:
            base_sets, base_reps, rest_sec = "3", "12 reps", "60"

        rows.append({
            "age": age,
            "bmi": bmi,
            "goal": goal,
            "experience": exp,
            "workoutPreference": pref,
            "activityLevel": act,
            "split_type": split,
            "base_sets": base_sets,
            "base_reps": base_reps,
            "rest_seconds": rest_sec,
        })

    return pd.DataFrame(rows)


def build_readiness_dataset(n_samples=2000):
    rng = np.random.default_rng(99)
    moods = ["Energized", "Normal", "Stressed", "Fatigued", "Sore"]

    rows = []
    for _ in range(n_samples):
        sleep = round(float(rng.uniform(3.5, 9.5)), 1)
        energy = int(rng.integers(1, 11))
        mood = rng.choice(moods)

        mood_bonus = {
            "Energized": 12.0,
            "Normal": 4.0,
            "Stressed": -8.0,
            "Fatigued": -15.0,
            "Sore": -12.0,
        }[mood]

        # Readiness score (0-100)
        sleep_score = np.clip((sleep / 8.0) * 45.0, 10.0, 50.0)
        energy_score = energy * 4.5
        readiness = float(np.clip(sleep_score + energy_score + mood_bonus + rng.normal(0, 2.0), 15.0, 100.0))

        # Volume multiplier (0.50 = recovery mode, 1.0 = normal, 1.15 = progressive push)
        if readiness < 40:
            multiplier = 0.50
        elif readiness < 60:
            multiplier = 0.75
        elif readiness < 82:
            multiplier = 1.00
        else:
            multiplier = 1.15

        rows.append({
            "sleep_hours": sleep,
            "energy_level": energy,
            "mood": mood,
            "readiness_score": round(readiness, 1),
            "volume_multiplier": multiplier,
        })

    return pd.DataFrame(rows)


def train_all():
    # 1. Train Weekly Split & Volume Classifier
    df_split = build_split_dataset()
    X_split = df_split[["age", "bmi", "goal", "experience", "workoutPreference", "activityLevel"]]
    y_split = df_split[["split_type", "base_sets", "base_reps", "rest_seconds"]]

    split_preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["age", "bmi"]),
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["goal", "experience", "workoutPreference", "activityLevel"]),
        ]
    )
    split_pipeline = Pipeline(
        steps=[
            ("preprocessor", split_preprocessor),
            ("classifier", MultiOutputClassifier(RandomForestClassifier(n_estimators=150, random_state=42))),
        ]
    )
    split_pipeline.fit(X_split, y_split)
    joblib.dump(split_pipeline, MODEL_DIR / "workout_split_model.joblib")

    # 2. Train Daily Readiness & Volume Multiplier Regressor
    df_ready = build_readiness_dataset()
    X_ready = df_ready[["sleep_hours", "energy_level", "mood"]]
    y_ready = df_ready[["readiness_score", "volume_multiplier"]]

    ready_preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["sleep_hours", "energy_level"]),
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["mood"]),
        ]
    )
    ready_pipeline = Pipeline(
        steps=[
            ("preprocessor", ready_preprocessor),
            ("regressor", MultiOutputRegressor(RandomForestRegressor(n_estimators=120, random_state=42))),
        ]
    )
    ready_pipeline.fit(X_ready, y_ready)
    joblib.dump(ready_pipeline, MODEL_DIR / "readiness_model.joblib")

    print("Trained and saved both models in ml-service/models/")


if __name__ == "__main__":
    train_all()