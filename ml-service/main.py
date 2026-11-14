from fastapi import FastAPI
from diet_optimizer import DietRequest, solve_diet_plan

app = FastAPI(title="FIT-CLUSTER ML Service")

@app.get("/")
def health_check():
    return {"status": "FIT-CLUSTER ML Service Running"}

@app.post("/api/ml/optimize-diet")
def optimize_diet(request: DietRequest):
    return solve_diet_plan(request)