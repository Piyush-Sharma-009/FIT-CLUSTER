import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { computeNutrition } from '../controllers/calculatorController.js';

const router = express.Router();

router.post('/compute', protect, computeNutrition);

export default router;