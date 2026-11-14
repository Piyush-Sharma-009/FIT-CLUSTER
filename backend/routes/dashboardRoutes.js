import express from 'express';
import {
  getDashboardData,
  toggleExerciseCompletion,
  logMeal,
  deleteMeal,
  logBodyWeight,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getDashboardData);
router.patch('/workout/:exerciseId', toggleExerciseCompletion);
router.post('/meals', logMeal);
router.patch('/weight', logBodyWeight);
router.delete('/meals/:mealId', deleteMeal);

export default router;