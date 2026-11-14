
import pulp
from pydantic import BaseModel
from typing import List


# 1. Define incoming data shapes
class FoodItem(BaseModel):
    id: str
    name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    price: float
    is_discrete: bool = False
    max_servings: float = 3.0


class DietRequest(BaseModel):
    foods: List[FoodItem]
    target_calories: float
    min_protein: float
    max_budget: float


def solve_diet_plan(req: DietRequest):

    # 2. Validate input
    if not req.foods:
        return {
            "status": "Invalid",
            "message": "Food library is empty.",
            "plan": []
        }

    if req.target_calories <= 0 or req.min_protein < 0 or req.max_budget < 0:
        return {
            "status": "Invalid",
            "message": "Invalid nutritional or budget targets.",
            "plan": []
        }

    # 3. Initialize minimization problem
    prob = pulp.LpProblem(
        "FITCLUSTER_Diet_Optimizer",
        pulp.LpMinimize
    )

    # 4. Create decision variables
    servings = {}

    for food in req.foods:

        var_type = (
            pulp.LpInteger
            if food.is_discrete
            else pulp.LpContinuous
        )

        servings[food.id] = pulp.LpVariable(
            f"food_{food.id}",
            lowBound=0,
            upBound=food.max_servings,
            cat=var_type
        )

    # 5. Objective: Minimize total daily cost
    total_cost = pulp.lpSum(
        food.price * servings[food.id]
        for food in req.foods
    )

    prob += total_cost, "Total_Cost"

    # 6. Calculate nutritional totals
    total_calories = pulp.lpSum(
        food.calories * servings[food.id]
        for food in req.foods
    )

    total_protein = pulp.lpSum(
        food.protein * servings[food.id]
        for food in req.foods
    )

    # 7. Add constraints
    prob += (
        total_calories >= req.target_calories - 50,
        "Min_Calories"
    )

    prob += (
        total_calories <= req.target_calories + 50,
        "Max_Calories"
    )

    prob += (
        total_protein >= req.min_protein,
        "Min_Protein"
    )

    prob += (
        total_cost <= req.max_budget,
        "Max_Budget"
    )

    # 8. Solve using CBC
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)

    # 9. Check optimization status
    status = pulp.LpStatus[prob.status]

    if status != "Optimal":
        return {
            "status": status,
            "message": (
                "No feasible meal plan found. "
                "Try increasing budget or relaxing nutritional targets."
            ),
            "plan": []
        }

    # 10. Extract optimized meal plan
    selected_plan = []

    final_cals = 0
    final_protein = 0
    final_carbs = 0
    final_fats = 0
    final_cost = 0

    for food in req.foods:

        qty = pulp.value(servings[food.id])

        if qty is None:
            continue

        qty = round(qty, 2)

        if qty > 0:

            calories = food.calories * qty
            protein = food.protein * qty
            carbs = food.carbs * qty
            fats = food.fats * qty
            cost = food.price * qty

            selected_plan.append({
                "food_id": food.id,
                "name": food.name,
                "servings": qty,
                "calories": round(calories, 1),
                "protein": round(protein, 1),
                "carbs": round(carbs, 1),
                "fats": round(fats, 1),
                "cost": round(cost, 2)
            })

            final_cals += calories
            final_protein += protein
            final_carbs += carbs
            final_fats += fats
            final_cost += cost

    # 11. Return optimized result
    return {
        "status": "Optimal",
        "summary": {
            "total_calories": round(final_cals, 1),
            "total_protein": round(final_protein, 1),
            "total_carbs": round(final_carbs, 1),
            "total_fats": round(final_fats, 1),
            "total_cost": round(final_cost, 2)
        },
        "plan": selected_plan
    }
