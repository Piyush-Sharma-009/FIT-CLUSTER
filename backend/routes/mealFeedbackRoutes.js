import express from "express";
import multer from "multer";
import { getAllFoods, submitMissingFood } from "../controllers/mealFeedbackController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/foods", getAllFoods);
router.post("/custom-food", upload.single("file"), submitMissingFood);

export default router;