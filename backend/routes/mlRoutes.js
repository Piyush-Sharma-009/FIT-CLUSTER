import express from "express";
import { optimizeDietPlan, getLatestDietPlan } from "../controllers/mlController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/optimize-diet", protect, optimizeDietPlan);
router.get("/latest-diet", protect, getLatestDietPlan);

export default router;