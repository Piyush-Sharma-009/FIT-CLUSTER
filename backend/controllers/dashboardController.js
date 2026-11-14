import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import { calculateFitnessMetrics } from '../utils/fitnessCalculator.js';
import {
  generateTodaysWorkout,
  generateRecommendations,
} from '../utils/planGenerator.js';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

// @route   GET /api/dashboard
export const getDashboardData = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.isOnboarded || !user.profile) {
      res.status(400);
      throw new Error('Complete onboarding first to access dashboard data');
    }

    const today = getTodayDateString();

    // Find today's log or initialize a fresh one automatically
    let todayLog = await DailyLog.findOne({ user: user._id, date: today });
    if (!todayLog) {
      const generatedPlan = generateTodaysWorkout(user.profile);
      todayLog = await DailyLog.create({
        user: user._id,
        date: today,
        workoutTitle: generatedPlan.title,
        exercises: generatedPlan.exercises,
        meals: [],
        totals: { caloriesConsumed: 0, proteinConsumed: 0, budgetSpent: 0 },
        loggedWeight: user.profile.weight,
      });
    }

    // Fetch last 7 logs for progress & analytics chart
    const recentLogs = await DailyLog.find({ user: user._id })
      .sort({ date: -1 })
      .limit(7);

    const analytics = recentLogs.reverse().map((log) => {
      const totalExercises = log.exercises.length || 1;
      const completedExercises = log.exercises.filter((ex) => ex.completed).length;
      return {
        date: log.date.slice(5), // MM-DD format
        calories: log.totals.caloriesConsumed,
        protein: log.totals.proteinConsumed,
        weight: log.loggedWeight || user.profile.weight,
        workoutCompletion: Math.round((completedExercises / totalExercises) * 100),
      };
    });

    const recommendations = generateRecommendations(
      user.profile,
      user.fitnessMetrics,
      todayLog.totals
    );

    res.status(200).json({
      success: true,
      todayLog,
      analytics,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/dashboard/workout/:exerciseId
export const toggleExerciseCompletion = async (req, res, next) => {
  try {
    const today = getTodayDateString();
    const log = await DailyLog.findOne({ user: req.user._id, date: today });

    if (!log) {
      res.status(404);
      throw new Error('Today’s log not found');
    }

    const exercise = log.exercises.id(req.params.exerciseId);
    if (!exercise) {
      res.status(404);
      throw new Error('Exercise not found');
    }

    exercise.completed = !exercise.completed;
    await log.save();

    res.status(200).json({ success: true, todayLog: log });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/dashboard/meals
export const logMeal = async (req, res, next) => {
  try {
    const { name, calories, protein, cost } = req.body;
    if (!name || calories === undefined || protein === undefined) {
      res.status(400);
      throw new Error('Meal name, calories, and protein are required');
    }

    const today = getTodayDateString();
    const log = await DailyLog.findOne({ user: req.user._id, date: today });

    if (!log) {
      res.status(404);
      throw new Error('Today’s log not found');
    }

    log.meals.push({
      name,
      calories: Number(calories),
      protein: Number(protein),
      cost: Number(cost) || 0,
    });

    log.totals.caloriesConsumed += Number(calories);
    log.totals.proteinConsumed += Number(protein);
    log.totals.budgetSpent += Number(cost) || 0;

    await log.save();

    const recommendations = generateRecommendations(
      req.user.profile,
      req.user.fitnessMetrics,
      log.totals
    );

    res.status(201).json({ success: true, todayLog: log, recommendations });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/dashboard/weight
// @route   PATCH /api/dashboard/weight
export const logBodyWeight = async (req, res, next) => {
  try {
    const numericWeight = Number(req.body.weight);
    if (!numericWeight || numericWeight < 30 || numericWeight > 300) {
      res.status(400);
      throw new Error('Please provide a valid weight between 30 and 300 kg');
    }

    const today = getTodayDateString();

    const todayLog = await DailyLog.findOneAndUpdate(
      { user: req.user._id, date: today },
      { loggedWeight: numericWeight },
      { new: true }
    );

    const user = await User.findById(req.user._id).lean();
    if (!user || !user.profile) {
      res.status(404);
      throw new Error('User profile not found');
    }

    const updatedProfile = {
      ...user.profile,
      weight: numericWeight,
    };
    const updatedMetrics = calculateFitnessMetrics(updatedProfile);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profile: updatedProfile,
        fitnessMetrics: updatedMetrics,
      },
      { new: true }
    );

    const recommendations = generateRecommendations(
      updatedUser.profile,
      updatedUser.fitnessMetrics,
      todayLog?.totals
    );

    res.status(200).json({
      success: true,
      fitnessMetrics: updatedUser.fitnessMetrics,
      weight: numericWeight,
      recommendations
    });
  } catch (error) {
    next(error);
  }
};


// @route   DELETE /api/dashboard/meals/:mealId
export const deleteMeal = async (req, res, next) => {
  try {
    const today = getTodayDateString();
    const log = await DailyLog.findOne({ user: req.user._id, date: today });

    if (!log) {
      res.status(404);
      throw new Error('Today’s log not found');
    }

    const meal = log.meals.id(req.params.mealId);
    if (!meal) {
      res.status(404);
      throw new Error('Meal entry not found');
    }

    // Subtract deleted meal values and guard against negative numbers
    log.totals.caloriesConsumed = Math.max(0, log.totals.caloriesConsumed - meal.calories);
    log.totals.proteinConsumed = Math.max(0, log.totals.proteinConsumed - meal.protein);
    log.totals.budgetSpent = Math.max(0, log.totals.budgetSpent - (meal.cost || 0));

    meal.deleteOne();
    await log.save();

    const recommendations = generateRecommendations(
      req.user.profile,
      req.user.fitnessMetrics,
      log.totals
    );

    res.status(200).json({ success: true, todayLog: log, recommendations });
  } catch (error) {
    next(error);
  }
};