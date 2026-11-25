import math
from pathlib import Path

import joblib
import pandas as pd
from app.workouts.exercise_recommender import recommend_exercises_for_day

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
split_model = joblib.load(MODEL_DIR / "workout_split_model.joblib")
readiness_model = joblib.load(MODEL_DIR / "readiness_model.joblib")

EXERCISE_CATALOG = [
    # Push
    {"name": "Barbell Bench Press", "muscle": "Push", "equipment": "Barbell & Plates", "level": "Intermediate"},
    {"name": "Dumbbell Bench / Floor Press", "muscle": "Push", "equipment": "Dumbbells", "level": "Beginner"},
    {"name": "Incline Dumbbell Press", "muscle": "Push", "equipment": "Dumbbells", "level": "Intermediate"},
    {"name": "Machine Chest Press", "muscle": "Push", "equipment": "Full Gym Machines", "level": "Beginner"},
    {"name": "Standard Push-Ups", "muscle": "Push", "equipment": "Bodyweight Only", "level": "Beginner"},
    {"name": "Resistance Band Chest Press", "muscle": "Push", "equipment": "Resistance Bands", "level": "Beginner"},
    {"name": "Overhead Dumbbell Press", "muscle": "Push", "equipment": "Dumbbells", "level": "Beginner"},
    {"name": "Barbell Overhead Press", "muscle": "Push", "equipment": "Barbell & Plates", "level": "Intermediate"},
    {"name": "Kettlebell Clean & Press", "muscle": "Push", "equipment": "Kettlebell", "level": "Intermediate"},
    {"name": "Pike Push-Ups", "muscle": "Push", "equipment": "Bodyweight Only", "level": "Intermediate"},
    {"name": "Cable Tricep Pushdowns", "muscle": "Push", "equipment": "Full Gym Machines", "level": "Beginner"},
    {"name": "Chair / Bench Tricep Dips", "muscle": "Push", "equipment": "Bodyweight Only", "level": "Beginner"},

    # Pull
    {"name": "Pull-Ups / Chin-Ups", "muscle": "Pull", "equipment": "Pull-up Bar", "level": "Intermediate"},
    {"name": "Dead Hangs & Scapular Pulls", "muscle": "Pull", "equipment": "Pull-up Bar", "level": "Beginner"},
    {"name": "Lat Pulldown Machine", "muscle": "Pull", "equipment": "Full Gym Machines", "level": "Beginner"},
    {"name": "Bent-Over Barbell Row", "muscle": "Pull", "equipment": "Barbell & Plates", "level": "Intermediate"},
    {"name": "Single-Arm Dumbbell Row", "muscle": "Pull", "equipment": "Dumbbells", "level": "Beginner"},
    {"name": "Kettlebell Gorilla Rows", "muscle": "Pull", "equipment": "Kettlebell", "level": "Beginner"},
    {"name": "Resistance Band Seated Rows", "muscle": "Pull", "equipment": "Resistance Bands", "level": "Beginner"},
    {"name": "Inverted Table / Doorframe Rows", "muscle": "Pull", "equipment": "Bodyweight Only", "level": "Beginner"},
    {"name": "Dumbbell Bicep Curls", "muscle": "Pull", "equipment": "Dumbbells", "level": "Beginner"},
    {"name": "Barbell Bicep Curls", "muscle": "Pull", "equipment": "Barbell & Plates", "level": "Beginner"},
    {"name": "Band Hammer Curls", "muscle": "Pull", "equipment": "Resistance Bands", "level": "Beginner"},

    # Legs & Core
    {"name": "Barbell Back Squats", "muscle": "Legs", "equipment": "Barbell & Plates", "level": "Intermediate"},
    {"name": "Leg Press Machine", "muscle": "Legs", "equipment": "Full Gym Machines", "level": "Beginner"},
    {"name": "Dumbbell Goblet Squats", "muscle": "Legs", "equipment": "Dumbbells", "level": "Beginner"},
    {"name": "Kettlebell Swings", "muscle": "Legs", "equipment": "Kettlebell", "level": "Intermediate"},
    {"name": "Romanian Deadlifts (Dumbbell)", "muscle": "Legs", "equipment": "Dumbbells", "level": "Intermediate"},
    {"name": "Bulgarian Split Squats", "muscle": "Legs", "equipment": "Bodyweight Only", "level": "Intermediate"},
    {"name": "Bodyweight Squats & Reverse Lunges", "muscle": "Legs", "equipment": "Bodyweight Only", "level": "Beginner"},
    {"name": "Resistance Band Leg Press", "muscle": "Legs", "equipment": "Resistance Bands", "level": "Beginner"},
    {"name": "Hanging Knee Raises", "muscle": "Core", "equipment": "Pull-up Bar", "level": "Intermediate"},
    {"name": "Plank & Mountain Climbers", "muscle": "Core", "equipment": "Bodyweight Only", "level": "Beginner"},
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def suggest_equipment_upgrades(profile: dict):
    owned = set(profile.get("equipment") or ["Bodyweight Only"])
    pref = profile.get("workoutPreference", "Home")
    goal = profile.get("goal", "Muscle Gain")
    suggestions = []

    if pref == "Home":
        if "Dumbbells" not in owned and "Kettlebell" not in owned:
            suggestions.append({
                "item": "Adjustable Dumbbells (Pair)",
                "reason": f"Unlocks progressive overload for {goal} without needing a full gym.",
                "unlockedExercises": ["Dumbbell Bench / Floor Press", "Single-Arm Dumbbell Row", "Dumbbell Goblet Squats"],
            })
        if "Pull-up Bar" not in owned:
            suggestions.append({
                "item": "Doorway Pull-Up Bar",
                "reason": "Vertical pulling is the hardest movement pattern to replicate at home with bodyweight alone.",
                "unlockedExercises": ["Pull-Ups / Chin-Ups", "Hanging Knee Raises"],
            })
        if "Resistance Bands" not in owned and len(suggestions) < 2:
            suggestions.append({
                "item": "Loop Resistance Bands Set",
                "reason": "Low-cost joint-friendly resistance for back rows, face pulls, and warm-ups.",
                "unlockedExercises": ["Resistance Band Seated Rows", "Resistance Band Chest Press"],
            })
    else:
        if "Full Gym Machines" not in owned and "Barbell & Plates" not in owned:
            suggestions.append({
                "item": "Gym Cable & Barbell Rack Access",
                "reason": "Maximizes compound loading and isolation tension in a commercial gym setting.",
                "unlockedExercises": ["Barbell Bench Press", "Lat Pulldown Machine", "Barbell Back Squats"],
            })

    return suggestions


def _pick_exercises(muscle_groups, user_equipment, experience, base_sets, base_reps, rest_sec, count=4):
    if not muscle_groups:
        return []

    allowed_eq = set(user_equipment or ["Bodyweight Only"])
    allowed_eq.add("Bodyweight Only")

    matched = [
        ex for ex in EXERCISE_CATALOG
        if ex["muscle"] in muscle_groups
        and ex["equipment"] in allowed_eq
        and (experience != "Beginner" or ex["level"] == "Beginner")
    ]
    if len(matched) < count:
        matched = [
            ex for ex in EXERCISE_CATALOG
            if ex["muscle"] in muscle_groups and ex["equipment"] in allowed_eq
        ]

    # Prioritize specialized gear over pure bodyweight
    matched.sort(key=lambda x: 0 if x["equipment"] != "Bodyweight Only" else 1)

    return [
        {
            "name": ex["name"],
            "muscleGroup": ex["muscle"],
            "sets": int(base_sets),
            "reps": base_reps,
            "restSeconds": int(rest_sec),
            "equipment": ex["equipment"],
            "completed": False,
        }
        for ex in matched[:count]
    ]

def generate_weekly_blueprint(
    profile: dict,
    bmi: float,
    week_dates: list[str],
    history_map: dict | None = None,
):
    input_df = pd.DataFrame([{
        "age": profile.get("age", 22),
        "bmi": bmi or 22.5,
        "goal": profile.get("goal", "Muscle Gain"),
        "experience": profile.get("experience", "Beginner"),
        "workoutPreference": profile.get("workoutPreference", "Home"),
        "activityLevel": profile.get("activityLevel", "Moderately Active"),
    }])

    split_type, base_sets, base_reps, rest_sec = split_model.predict(input_df)[0]
    base_sets_int = int(base_sets)
    rest_sec_int = int(rest_sec)

    if split_type == "3-Day Full Body":
        templates = [
            ("Full Body A (Compound Focus)", ["Push", "Pull", "Legs"], False),
            ("Active Recovery & Mobility", [], True),
            ("Full Body B (Hypertrophy Focus)", ["Legs", "Push", "Core"], False),
            ("Active Recovery & Mobility", [], True),
            ("Full Body C (Posterior & Core)", ["Pull", "Legs", "Core"], False),
            ("Light Cardio & Stretching", [], True),
            ("Complete Rest", [], True),
        ]
    elif split_type == "4-Day Upper/Lower":
        templates = [
            ("Upper Body Power", ["Push", "Pull"], False),
            ("Lower Body & Core", ["Legs", "Core"], False),
            ("Active Recovery & Mobility", [], True),
            ("Upper Body Volume", ["Pull", "Push"], False),
            ("Lower Body Posterior & Core", ["Legs", "Core"], False),
            ("Light Cardio & Mobility", [], True),
            ("Complete Rest", [], True),
        ]
    else:
        templates = [
            ("Push Day A (Chest, Shoulders, Triceps)", ["Push"], False),
            ("Pull Day A (Back & Biceps)", ["Pull"], False),
            ("Leg Day A & Core", ["Legs", "Core"], False),
            ("Push Day B (Volume)", ["Push"], False),
            ("Pull Day B (Volume)", ["Pull"], False),
            ("Leg Day B & Conditioning", ["Legs", "Core"], False),
            ("Complete Rest", [], True),
        ]

    days_payload = []
    for idx, day_name in enumerate(DAYS):
        focus, muscles, is_rest = templates[idx]
        exercises = recommend_exercises_for_day(
            muscle_groups=muscles,
            user_profile=profile,
            base_sets=base_sets_int,
            base_reps=base_reps,
            rest_seconds=rest_sec_int,
            history_map=history_map or {},
            readiness_score=75.0,
            count=4,
        )
        days_payload.append({
            "dayName": day_name,
            "date": week_dates[idx],
            "focus": focus,
            "muscleGroups": muscles,
            "isRestDay": is_rest,
            "status": "pending",
            "readinessScore": None,
            "adaptationNote": "",
            "exercises": exercises,
        })

    return {
        "predictedSplit": split_type,
        "baseRepScheme": f"{base_sets_int} sets x {base_reps}",
        "baseRestSeconds": rest_sec_int,
        "suggestedEquipment": suggest_equipment_upgrades(profile),
        "days": days_payload,
    }


def adapt_single_day_biofeedback(day_plan: dict, sleep_hours: float, energy_level: int, mood: str):
    input_df = pd.DataFrame([{
        "sleep_hours": sleep_hours,
        "energy_level": energy_level,
        "mood": mood,
    }])

    readiness_score, multiplier = readiness_model.predict(input_df)[0]
    readiness_score = round(float(readiness_score), 1)
    multiplier = round(float(multiplier), 2)

    adapted_day = dict(day_plan)
    adapted_day["readinessScore"] = readiness_score

    if day_plan.get("isRestDay") or not day_plan.get("exercises"):
        adapted_day["adaptationNote"] = f"Readiness {readiness_score}/100 — Rest & recovery day maintained."
        return adapted_day

    if multiplier <= 0.55:
        # Very low readiness: convert heavy session into low-impact mobility/recovery
        adapted_day["status"] = "adapted"
        adapted_day["focus"] = f"Recovery Deload ({day_plan['focus']} Deferred)"
        adapted_day["adaptationNote"] = (
            f"Low readiness ({readiness_score}/100 from {sleep_hours}h sleep & {mood} mood). "
            "Switched to light mobility & 50% volume to prevent CNS fatigue."
        )
        for ex in adapted_day["exercises"]:
            ex["sets"] = max(1, math.floor(ex["sets"] * 0.5))
            ex["restSeconds"] = int(ex["restSeconds"] + 30)
    elif multiplier < 1.0:
        adapted_day["status"] = "adapted"
        adapted_day["adaptationNote"] = (
            f"Moderate readiness ({readiness_score}/100). Volume scaled to {int(multiplier * 100)}% with extra rest."
        )
        for ex in adapted_day["exercises"]:
            ex["sets"] = max(2, math.floor(ex["sets"] * multiplier))
            ex["restSeconds"] = int(ex["restSeconds"] + 15)
    elif multiplier > 1.0:
        adapted_day["status"] = "adapted"
        adapted_day["adaptationNote"] = (
            f"Peak readiness ({readiness_score}/100)! Added +1 progressive overload set on primary lifts."
        )
        for idx, ex in enumerate(adapted_day["exercises"]):
            if idx < 2:
                ex["sets"] = ex["sets"] + 1
    else:
        adapted_day["adaptationNote"] = f"Optimal readiness ({readiness_score}/100) — executing baseline volume."

    return adapted_day


def reschedule_remaining_week(
    days: list[dict],
    today_index: int,
    profile: dict,
    base_sets: int,
    base_reps: str,
    base_rest: int,
    history_map: dict | None = None,
):
    """
    Inspects days prior to `today_index`. Any uncompleted workout day is marked `missed`,
    and its muscle groups are redistributed across `today_index..6` using Model 2's
    TF-IDF similarity ranker and progressive overload predictor.
    """
    missed_sessions = []
    for i in range(0, today_index):
        d = days[i]
        if not d.get("isRestDay") and d.get("status") not in ["completed", "missed"]:
            completed_count = sum(1 for ex in d.get("exercises", []) if ex.get("completed"))
            total_count = len(d.get("exercises", []))
            if total_count == 0 or (completed_count / total_count) < 0.5:
                d["status"] = "missed"
                d["adaptationNote"] = "Missed session — automatically queued for weekly rebalancing."
                missed_sessions.append({
                    "focus": d["focus"],
                    "muscleGroups": d.get("muscleGroups", []),
                })
            else:
                d["status"] = "completed"

    if not missed_sessions:
        return days, False

    remaining_indices = list(range(today_index, len(days)))
    if not remaining_indices:
        return days, False

    workout_queue = list(missed_sessions)
    for idx in remaining_indices:
        d = days[idx]
        if not d.get("isRestDay") and d.get("muscleGroups"):
            workout_queue.append({
                "focus": d["focus"],
                "muscleGroups": d["muscleGroups"],
            })

    available_slots = len(remaining_indices)
    if len(workout_queue) > available_slots:
        while len(workout_queue) > available_slots and len(workout_queue) >= 2:
            second = workout_queue.pop()
            first = workout_queue[-1]
            merged_muscles = list(dict.fromkeys(first["muscleGroups"] + second["muscleGroups"]))
            first["focus"] = f"Combined Re-Optimized: {' + '.join(merged_muscles)}"
            first["muscleGroups"] = merged_muscles

    for slot_pos, day_idx in enumerate(remaining_indices):
        if slot_pos < len(workout_queue):
            session = workout_queue[slot_pos]
            muscles = session["muscleGroups"]
            days[day_idx]["focus"] = session["focus"]
            days[day_idx]["muscleGroups"] = muscles
            days[day_idx]["isRestDay"] = False
            days[day_idx]["status"] = "rescheduled"
            days[day_idx]["adaptationNote"] = "Auto-rebalanced to recover missed volume within this week."
            days[day_idx]["exercises"] = recommend_exercises_for_day(
                muscle_groups=muscles,
                user_profile=profile,
                base_sets=base_sets,
                base_reps=base_reps,
                rest_seconds=base_rest,
                history_map=history_map or {},
                readiness_score=days[day_idx].get("readinessScore") or 75.0,
                count=4 if len(muscles) == 1 else 5,
            )
        else:
            days[day_idx]["focus"] = "Recovery & Mobility"
            days[day_idx]["muscleGroups"] = []
            days[day_idx]["isRestDay"] = True
            days[day_idx]["status"] = "rescheduled"
            days[day_idx]["exercises"] = []

    return days, True