from typing import List, Optional
import difflib
import re
import pulp
from pydantic import BaseModel, Field, ConfigDict


class FoodItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    meal: str = "lunch"  # breakfast | lunch | dinner | snack
    diet: List[str] = ["veg"]
    cost: float          # ₹ per 100g
    cal: float           # kcal per 100g
    pro: float           # protein (g) per 100g
    carb: float          # carbs (g) per 100g
    fat: float           # fats (g) per 100g
    quality: Optional[float] = None  # 1-10 nutritional/grade score (defaults to cost-derived)
    min_units: float = Field(default=0.35, alias="minUnits")
    max_units: float = Field(default=2.0, alias="maxUnits")


class DietRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_calories: float = Field(..., alias="targetCalories", gt=400, le=7000)
    target_protein: float = Field(..., alias="targetProtein", gt=10, le=450)
    target_carbs: Optional[float] = Field(default=None, alias="targetCarbs")
    target_fats: Optional[float] = Field(default=None, alias="targetFats")
    max_budget: float = Field(default=300.0, alias="maxBudget", gt=10)
    diet_type: str = Field(default="veg", alias="dietType")
    excluded_foods: List[str] = Field(default_factory=list, alias="excludedFoods")
    foods: Optional[List[FoodItem]] = None


DEFAULT_FOODS= [];
# = [
#     FoodItem(id="f1", name="Rolled Oats", meal="breakfast", diet=["veg", "vegan"], cost=16.0, cal=389, pro=16.9, carb=66.3, fat=6.9, quality=8.0, min_units=0.4, max_units=1.0),
#     FoodItem(id="f2", name="Toned Milk", meal="breakfast", diet=["veg"], cost=6.5, cal=58, pro=3.2, carb=4.8, fat=3.0, quality=6.5, min_units=1.5, max_units=3.0),
#     FoodItem(id="f3", name="Banana", meal="breakfast", diet=["veg", "vegan"], cost=5.0, cal=89, pro=1.1, carb=22.8, fat=0.3, quality=7.0, min_units=0.8, max_units=2.0),
#     FoodItem(id="f4", name="Whole Eggs (2 eggs)", meal="breakfast", diet=["non-veg"], cost=14.0, cal=155, pro=13.0, carb=1.1, fat=11.0, quality=8.5, min_units=1.0, max_units=2.5),
#     FoodItem(id="f5", name="Whole Wheat Roti", meal="lunch", diet=["veg", "vegan"], cost=8.0, cal=297, pro=11.0, carb=61.0, fat=1.7, quality=7.0, min_units=0.6, max_units=2.5),
#     FoodItem(id="f6", name="Cooked White Rice", meal="lunch", diet=["veg", "vegan"], cost=6.0, cal=130, pro=2.7, carb=28.0, fat=0.3, quality=5.0, min_units=1.0, max_units=3.0),
#     FoodItem(id="f7", name="Moong Dal (Cooked)", meal="lunch", diet=["veg", "vegan"], cost=12.0, cal=105, pro=7.0, carb=19.0, fat=0.4, quality=7.5, min_units=1.0, max_units=2.5),
#     FoodItem(id="f8", name="Soya Chunks", meal="lunch", diet=["veg", "vegan"], cost=14.0, cal=345, pro=52.0, carb=33.0, fat=0.5, quality=5.5, min_units=0.3, max_units=0.8),
#     FoodItem(id="f9", name="Paneer", meal="dinner", diet=["veg"], cost=42.0, cal=265, pro=18.0, carb=3.5, fat=20.0, quality=9.0, min_units=0.5, max_units=2.0),
#     FoodItem(id="f10", name="Chicken Breast", meal="dinner", diet=["non-veg"], cost=32.0, cal=165, pro=31.0, carb=0.0, fat=3.6, quality=9.5, min_units=1.0, max_units=2.5),
#     FoodItem(id="f11", name="Whey Protein Isolate", meal="snack", diet=["veg"], cost=95.0, cal=370, pro=80.0, carb=4.0, fat=2.0, quality=9.5, min_units=0.3, max_units=0.6),
#     FoodItem(id="f12", name="Almonds", meal="snack", diet=["veg", "vegan"], cost=85.0, cal=579, pro=21.2, carb=21.6, fat=49.9, quality=9.0, min_units=0.15, max_units=0.35),
# ]


def _is_food_excluded(food_name: str, excluded_keywords: List[str]) -> bool:
    name_lower = food_name.strip().lower()
    name_words = re.findall(r"[a-z0-9]+", name_lower)

    for kw in excluded_keywords:
        if kw in name_lower:
            return True
        for word in name_words:
            if difflib.SequenceMatcher(None, kw, word).ratio() >= 0.80:
                return True
    return False


def solve_milp_diet(req: DietRequest) -> dict:
    source_foods = req.foods if req.foods else DEFAULT_FOODS

    # 1. Filter by dietType and excludedFoods
    diet_lower = req.diet_type.lower()
    allowed_tags = {"vegan"} if diet_lower == "vegan" else (
        {"veg", "vegan"} if diet_lower == "veg" else {"veg", "vegan", "non-veg"}
    )
    excluded_keywords = [name.strip().lower() for name in req.excluded_foods if name.strip()]

    foods = [
        f for f in source_foods
        if any(tag.lower() in allowed_tags for tag in f.diet)
        and not _is_food_excluded(f.name, excluded_keywords)
    ]

    if not foods:
        return {"success": False, "error": "No foods available after applying diet filters."}

    target_carbs = req.target_carbs if req.target_carbs is not None else (req.target_calories * 0.45) / 4.0
    target_fats = req.target_fats if req.target_fats is not None else (req.target_calories * 0.25) / 9.0

    # 2. Initialize MILP Problem
    prob = pulp.LpProblem("FITCLUSTER_Diet_Optimizer", pulp.LpMinimize)

    x = {
        f.id: pulp.LpVariable(f"x_{f.id}", lowBound=0, upBound=f.max_units, cat="Continuous")
        for f in foods
    }
    y = {
        f.id: pulp.LpVariable(f"y_{f.id}", cat="Binary")
        for f in foods
    }

    # 3. Slack Variables (Macros + Two-Sided Budget Alignment)
    cal_under = pulp.LpVariable("cal_under", lowBound=0)
    cal_over = pulp.LpVariable("cal_over", lowBound=0)
    pro_under = pulp.LpVariable("pro_under", lowBound=0)
    pro_over = pulp.LpVariable("pro_over", lowBound=0)
    carb_diff = pulp.LpVariable("carb_diff", lowBound=0)
    fat_diff = pulp.LpVariable("fat_diff", lowBound=0)
    budget_over = pulp.LpVariable("budget_over", lowBound=0)
    budget_under = pulp.LpVariable("budget_under", lowBound=0)

    total_cal = pulp.lpSum(f.cal * x[f.id] for f in foods)
    total_pro = pulp.lpSum(f.pro * x[f.id] for f in foods)
    total_carb = pulp.lpSum(f.carb * x[f.id] for f in foods)
    total_fat = pulp.lpSum(f.fat * x[f.id] for f in foods)
    total_cost = pulp.lpSum(f.cost * x[f.id] for f in foods)
    num_selected_foods = pulp.lpSum(y[f.id] for f in foods)

    # Quality score defaults to cost/10 if a DB item doesn't explicitly define `quality`
    total_quality = pulp.lpSum(
        (f.quality if f.quality is not None else min(10.0, f.cost / 10.0)) * x[f.id]
        for f in foods
    )

    # 4. Objective: Hit exact macros + Maximize Quality & Variety + Utilize Budget Target
    prob += (
        60.0 * pro_under
        + 12.0 * pro_over
        + 15.0 * (cal_under + cal_over)
        + 3.0 * carb_diff
        + 3.0 * fat_diff
        + 30.0 * budget_over      # Strictly avoid exceeding maxBudget
        + 1.5 * budget_under      # Pull total_cost UP toward the target budget window
        - 8.0 * total_quality     # Prefer higher-quality foods (Paneer, Chicken, Whey, Almonds)
        - 12.0 * num_selected_foods
    )

    # 5. Link Binary Toggles to Realistic Portion Sizes
    for f in foods:
        min_u = min(f.min_units, f.max_units)
        prob += x[f.id] >= min_u * y[f.id]
        prob += x[f.id] <= f.max_units * y[f.id]

    prob += num_selected_foods <= 8

    # Ensure at least 1 food in every available main meal slot
    for slot in ("breakfast", "lunch", "dinner"):
        slot_foods = [f.id for f in foods if f.meal.lower() == slot]
        if slot_foods:
            prob += pulp.lpSum(y[fid] for fid in slot_foods) >= 1

    # 6. Macro & Two-Sided Budget Constraints
    prob += total_cal + cal_under >= req.target_calories * 0.97
    prob += total_cal - cal_over <= req.target_calories * 1.03
    prob += total_pro + pro_under >= req.target_protein * 0.98
    prob += total_pro - pro_over <= req.target_protein * 1.15

    prob += total_carb - target_carbs <= carb_diff
    prob += target_carbs - total_carb <= carb_diff
    prob += total_fat - target_fats <= fat_diff
    prob += target_fats - total_fat <= fat_diff

    # Ceiling: never exceed max_budget unless infeasible
    prob += total_cost - budget_over <= req.max_budget
    # Floor target: try to utilize at least 85% of the user's daily budget
    prob += total_cost + budget_under >= req.max_budget * 0.85

    # 7. Solve
    status_code = prob.solve(pulp.PULP_CBC_CMD(msg=False))
    status_str = pulp.LpStatus[status_code]

    if status_str != "Optimal":
        return {"success": False, "error": f"Optimizer returned unexpected status: {status_str}"}

    # 8. Format Output
    meals = []
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0, "cost": 0.0}

    for f in foods:
        if (y[f.id].varValue or 0) == 1:
            units = x[f.id].varValue or 0.0
            grams = round(units * 100)
            c = round(f.cal * units, 1)
            p = round(f.pro * units, 1)
            cb = round(f.carb * units, 1)
            ft = round(f.fat * units, 1)
            rs = round(f.cost * units, 2)

            meals.append({
                "foodId": f.id,
                "name": f.name,
                "mealSlot": f.meal,
                "grams": grams,
                "calories": c,
                "protein": p,
                "carbs": cb,
                "fats": ft,
                "cost": rs,
            })

            totals["calories"] = round(totals["calories"] + c, 1)
            totals["protein"] = round(totals["protein"] + p, 1)
            totals["carbs"] = round(totals["carbs"] + cb, 1)
            totals["fats"] = round(totals["fats"] + ft, 1)
            totals["cost"] = round(totals["cost"] + rs, 2)

    warnings = []
    if (budget_over.varValue or 0.0) > 0.5:
        warnings.append(f"Minimum feasible cost exceeded budget by ₹{round(budget_over.varValue, 2)}.")
    if (pro_under.varValue or 0.0) > 1.0:
        warnings.append(f"Protein fell short by {round(pro_under.varValue, 1)}g due to daily portion caps.")

    return {
        "success": True,
        "status": status_str,
        "summary": totals,
        "warnings": warnings,
        "meals": meals,
    }