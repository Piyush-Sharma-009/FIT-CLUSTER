# FIT-CLUSTER

## Run locally (Windows)

### Backend

Create `backend/.env` with `MONGO_URI` and `JWT_SECRET`. `CLIENT_URL` and
`ML_SERVICE_URL` are optional; they default to `http://localhost:5173` and
`http://localhost:8000`. Set `ML_SERVICE_API_KEY` in the backend and ML-service
process environments to the same private value to enable portion-correction
submissions.

```powershell
cd backend
npm install
npm run seed:foods
npm run dev
```

### ML service

```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The workout model files are required under `ml-service/models`:

- `workout_split_model.joblib`
- `readiness_model.joblib`
- `progressive_overload_model.joblib`

These model files are not tracked in this repository. The three workout models
are loaded when the ML service starts. Diet generation additionally requires
the seeded food catalog in MongoDB. Without the custom food detector, meal
scanning uses a bootstrap estimate and displays a warning to verify foods
before logging; this is less accurate than the trained detector. Supplying
`food_yolo_best.pt` and `portion_resnet18.pt` under `ml-service/models` enables
the trained food models. Custom-detector portion corrections are recorded with
logged meals. Submitted correction images and metadata are queued under
`ml-service/active_learning/portion_review/` for review; they do not update
shared model weights automatically. Keep `ML_SERVICE_API_KEY` server-side and
set the same value in both services. Any future model retraining should use
independently reviewed data.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` if the backend is not at `http://localhost:5000/api`.