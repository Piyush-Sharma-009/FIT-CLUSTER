import express from 'express';
import {
  getWeeklyWorkoutPlan,
  adaptTodaysWorkout,
  forceRescheduleWeek,
  toggleWeeklyExercise,
} from '../controllers/workoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/weekly', getWeeklyWorkoutPlan);
router.post('/adapt-today', adaptTodaysWorkout);
router.post('/reschedule', forceRescheduleWeek);
router.patch('/toggle-exercise', toggleWeeklyExercise);

export default router;