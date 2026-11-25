import re
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
overload_model = joblib.load(MODEL_DIR / "progressive_overload_model.joblib")


RICH_EXERCISE_CATALOG = [
    # PUSH
    {
        "name": "Barbell Bench Press",
        "muscleGroup": "Push",
        "equipment": "Barbell & Plates",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "push chest triceps front_delts horizontal_press strength muscle_gain barbell compound intermediate",
    },
    {
        "name": "Incline Dumbbell Press",
        "muscleGroup": "Push",
        "equipment": "Dumbbells",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "push upper_chest shoulders triceps incline_press muscle_gain hypertrophy dumbbells compound intermediate",
    },
    {
        "name": "Dumbbell Bench / Floor Press",
        "muscleGroup": "Push",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "push chest triceps horizontal_press beginner muscle_gain general_fitness dumbbells compound",
    },
    {
        "name": "Machine Chest Press",
        "muscleGroup": "Push",
        "equipment": "Full Gym Machines",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "push chest triceps guided_press beginner muscle_gain weight_loss machines compound",
    },
    {
        "name": "Overhead Barbell Press",
        "muscleGroup": "Push",
        "equipment": "Barbell & Plates",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "push shoulders deltoids triceps vertical_press strength muscle_gain barbell compound intermediate",
    },
    {
        "name": "Overhead Dumbbell Press",
        "muscleGroup": "Push",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "push shoulders deltoids triceps vertical_press beginner muscle_gain general_fitness dumbbells compound",
    },
    {
        "name": "Kettlebell Clean & Press",
        "muscleGroup": "Push",
        "equipment": "Kettlebell",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "push shoulders core explosive conditioning weight_loss strength kettlebell compound",
    },
    {
        "name": "Standard Push-Ups",
        "muscleGroup": "Push",
        "equipment": "Bodyweight Only",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "push chest triceps core bodyweight beginner weight_loss general_fitness home compound",
    },
    {
        "name": "Pike Push-Ups",
        "muscleGroup": "Push",
        "equipment": "Bodyweight Only",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "push shoulders deltoids triceps bodyweight intermediate muscle_gain home compound",
    },
    {
        "name": "Resistance Band Chest Press",
        "muscleGroup": "Push",
        "equipment": "Resistance Bands",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "push chest triceps resistance_bands beginner weight_loss general_fitness home compound",
    },
    {
        "name": "Cable Tricep Pushdowns",
        "muscleGroup": "Push",
        "equipment": "Full Gym Machines",
        "level": "Beginner",
        "mechanics": "Isolation",
        "tags": "push triceps arms isolation muscle_gain machines beginner",
    },
    {
        "name": "Dumbbell Lateral Raises",
        "muscleGroup": "Push",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Isolation",
        "tags": "push side_delts shoulders isolation muscle_gain hypertrophy dumbbells beginner",
    },

    # PULL
    {
        "name": "Pull-Ups / Chin-Ups",
        "muscleGroup": "Pull",
        "equipment": "Pull-up Bar",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "pull lats upper_back biceps vertical_pull strength muscle_gain bodyweight pullup_bar compound intermediate",
    },
    {
        "name": "Scapular Pulls & Dead Hangs",
        "muscleGroup": "Pull",
        "equipment": "Pull-up Bar",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull lats grip_strength upper_back beginner pullup_bar general_fitness compound",
    },
    {
        "name": "Bent-Over Barbell Row",
        "muscleGroup": "Pull",
        "equipment": "Barbell & Plates",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "pull mid_back lats rear_delts horizontal_row strength muscle_gain barbell compound intermediate",
    },
    {
        "name": "Single-Arm Dumbbell Row",
        "muscleGroup": "Pull",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull lats mid_back biceps horizontal_row beginner muscle_gain general_fitness dumbbells compound",
    },
    {
        "name": "Lat Pulldown Machine",
        "muscleGroup": "Pull",
        "equipment": "Full Gym Machines",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull lats upper_back biceps vertical_pull beginner muscle_gain weight_loss machines compound",
    },
    {
        "name": "Kettlebell Gorilla Rows",
        "muscleGroup": "Pull",
        "equipment": "Kettlebell",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull back lats core conditioning weight_loss muscle_gain kettlebell compound",
    },
    {
        "name": "Resistance Band Seated Rows",
        "muscleGroup": "Pull",
        "equipment": "Resistance Bands",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull mid_back rear_delts posture beginner general_fitness weight_loss resistance_bands compound",
    },
    {
        "name": "Inverted Doorframe / Table Rows",
        "muscleGroup": "Pull",
        "equipment": "Bodyweight Only",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "pull back biceps horizontal_row bodyweight beginner home general_fitness compound",
    },
    {
        "name": "Dumbbell Bicep Curls",
        "muscleGroup": "Pull",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Isolation",
        "tags": "pull biceps arms isolation muscle_gain dumbbells beginner",
    },

    # LEGS & CORE
    {
        "name": "Barbell Back Squats",
        "muscleGroup": "Legs",
        "equipment": "Barbell & Plates",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "legs quads glutes hamstrings squat strength muscle_gain barbell compound intermediate",
    },
    {
        "name": "Dumbbell Goblet Squats",
        "muscleGroup": "Legs",
        "equipment": "Dumbbells",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "legs quads glutes core squat beginner muscle_gain weight_loss general_fitness dumbbells compound",
    },
    {
        "name": "Romanian Deadlifts (Dumbbell)",
        "muscleGroup": "Legs",
        "equipment": "Dumbbells",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "legs hamstrings glutes posterior_chain hinge muscle_gain strength dumbbells compound intermediate",
    },
    {
        "name": "Leg Press Machine",
        "muscleGroup": "Legs",
        "equipment": "Full Gym Machines",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "legs quads glutes guided_press beginner muscle_gain weight_loss machines compound",
    },
    {
        "name": "Kettlebell Swings",
        "muscleGroup": "Legs",
        "equipment": "Kettlebell",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "legs hamstrings glutes conditioning fat_burn weight_loss kettlebell compound",
    },
    {
        "name": "Bulgarian Split Squats",
        "muscleGroup": "Legs",
        "equipment": "Bodyweight Only",
        "level": "Intermediate",
        "mechanics": "Compound",
        "tags": "legs quads glutes unilateral balance muscle_gain weight_loss bodyweight intermediate compound",
    },
    {
        "name": "Bodyweight Squats & Reverse Lunges",
        "muscleGroup": "Legs",
        "equipment": "Bodyweight Only",
        "level": "Beginner",
        "mechanics": "Compound",
        "tags": "legs quads glutes conditioning beginner weight_loss general_fitness bodyweight home compound",
    },
    {
        "name": "Hanging Knee Raises",
        "muscleGroup": "Core",
        "equipment": "Pull-up Bar",
        "level": "Intermediate",
        "mechanics": "Isolation",
        "tags": "core abs hip_flexors pullup_bar intermediate muscle_gain isolation",
    },
    {
        "name": "Plank & Mountain Climbers",
        "muscleGroup": "Core",
        "equipment": "Bodyweight Only",
        "level": "Beginner",
        "mechanics": "Isolation",
        "tags": "core abs stability conditioning weight_loss general_fitness bodyweight beginner",
    },
]

# Pre-fit TF-IDF vectorizer across exercise catalog tags at module startup
_vectorizer = TfidfVectorizer()
_exercise_matrix = _vectorizer.fit_transform([ex["tags"] for ex in RICH_EXERCISE_CATALOG])


def _parse_rep_range(rep_str: str):
    nums = [int(n) for n in re.findall(r"\d+", str(rep_str))]
    if len(nums) >= 2:
        return nums[0], nums[1]
    if len(nums) == 1:
        return nums[0], nums[0]
    return 8, 12


def predict_progressive_overload(
    exercise_name: str,
    mechanics: str,
    experience: str,
    base_reps_str: str,
    history_map: dict,
    readiness_score: float = 75.0,
):
    """
    Uses trained RandomForestRegressor to predict recommendedWeightKg and recommendedReps
    from the user's previous workout log for `exercise_name`.
    """
    target_min, target_max = _parse_rep_range(base_reps_str)
    past = history_map.get(exercise_name)

    if not past or past.get("weightKg", 0) <= 0:
        return {
            "recommendedWeightKg": None,
            "recommendedReps": base_reps_str,
            "progressionNote": "Baseline calibration — log weight after session",
        }

    prev_weight = float(past["weightKg"])
    prev_reps = int(past.get("repsCompleted", target_min))
    completion_rate = float(past.get("completionRate", 1.0))

    input_df = pd.DataFrame([{
        "prev_weight_kg": prev_weight,
        "prev_reps": prev_reps,
        "target_reps_min": target_min,
        "target_reps_max": target_max,
        "completion_rate": completion_rate,
        "readiness_score": readiness_score,
        "experience": experience,
        "mechanics": mechanics,
    }])

    pred_weight, pred_reps = overload_model.predict(input_df)[0]
    # Round predicted weight to nearest 1.25 kg plate increment
    rounded_weight = round(float(pred_weight) / 1.25) * 1.25
    rounded_reps = int(round(float(pred_reps)))

    if rounded_weight > prev_weight:
        note = f"Progressive Overload: +{round(rounded_weight - prev_weight, 2)} kg from last session ({prev_weight} kg)"
    elif rounded_reps > prev_reps:
        note = f"Rep Progression: +1 rep at {rounded_weight} kg"
    elif rounded_weight < prev_weight:
        note = f"Recovery Deload: -{round(prev_weight - rounded_weight, 2)} kg for form & CNS recovery"
    else:
        note = f"Consolidate Load: {rounded_weight} kg × {rounded_reps} reps"

    return {
        "recommendedWeightKg": rounded_weight,
        "recommendedReps": f"{rounded_reps} reps",
        "progressionNote": note,
    }


def recommend_exercises_for_day(
    muscle_groups: list[str],
    user_profile: dict,
    base_sets: int,
    base_reps: str,
    rest_seconds: int,
    history_map: dict = None,
    readiness_score: float = 75.0,
    count: int = 4,
):
    """
    Ranks exercises using TF-IDF cosine similarity against the user's profile & target muscles,
    enforces equipment constraints, and attaches progressive overload load/rep predictions.
    """
    if not muscle_groups:
        return []

    history_map = history_map or {}
    allowed_eq = set(user_profile.get("equipment") or ["Bodyweight Only"])
    allowed_eq.add("Bodyweight Only")

    goal_token = user_profile.get("goal", "Muscle Gain").lower().replace(" ", "_")
    exp_token = user_profile.get("experience", "Beginner").lower()
    pref_token = user_profile.get("workoutPreference", "Home").lower()
    eq_tokens = " ".join([e.lower().replace(" ", "_") for e in allowed_eq])
    muscle_tokens = " ".join([m.lower() for m in muscle_groups])

    # Build user query vector and compute cosine similarity against all exercises
    query_text = f"{muscle_tokens} {goal_token} {exp_token} {pref_token} {eq_tokens} compound"
    query_vec = _vectorizer.transform([query_text])
    similarities = cosine_similarity(query_vec, _exercise_matrix).flatten()

    scored_candidates = []
    for idx, ex in enumerate(RICH_EXERCISE_CATALOG):
        if ex["muscleGroup"] not in muscle_groups:
            continue
        if ex["equipment"] not in allowed_eq:
            continue
        if exp_token == "beginner" and ex["level"] == "Intermediate":
            continue

        score = float(similarities[idx])
        # Slight boost for specialized gear when user owns it so dumbbells/barbells outrank plain bodyweight
        if ex["equipment"] != "Bodyweight Only":
            score += 0.15

        scored_candidates.append((score, ex))

    # Fallback if beginner filter left too few exercises
    if len(scored_candidates) < count:
        scored_candidates = [
            (float(similarities[idx]), ex)
            for idx, ex in enumerate(RICH_EXERCISE_CATALOG)
            if ex["muscleGroup"] in muscle_groups and ex["equipment"] in allowed_eq
        ]

    scored_candidates.sort(key=lambda pair: pair[0], reverse=True)
    selected = scored_candidates[:count]

    results = []
    for sim_score, ex in selected:
        overload = predict_progressive_overload(
            exercise_name=ex["name"],
            mechanics=ex["mechanics"],
            experience=user_profile.get("experience", "Beginner"),
            base_reps_str=base_reps,
            history_map=history_map,
            readiness_score=readiness_score,
        )
        results.append({
            "name": ex["name"],
            "muscleGroup": ex["muscleGroup"],
            "sets": int(base_sets),
            "reps": overload["recommendedReps"],
            "recommendedWeightKg": overload["recommendedWeightKg"],
            "progressionNote": overload["progressionNote"],
            "similarityScore": round(sim_score, 3),
            "restSeconds": int(rest_seconds),
            "equipment": ex["equipment"],
            "completed": False,
        })

    return results