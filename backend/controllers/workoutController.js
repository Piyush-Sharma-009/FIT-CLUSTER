import axios from 'axios';
import WeeklyPlan from '../models/WeeklyPlan.js';
import DailyLog from '../models/DailyLog.js';
import { getCurrentWeekContext } from '../utils/weekHelper.js';
import { generateTodaysWorkout } from '../utils/planGenerator.js';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Helper to parse "4 sets x 8-12 reps" into { baseSets: 4, baseReps: "8-12 reps" }
 */
const parseRepScheme = (scheme = '3 sets x 10-12 reps') => {
  const match = scheme.match(/^(\d+)\s*sets?\s*x\s*(.+)$/i);
  if (!match) return { baseSets: 3, baseReps: '10-12 reps' };
  return { baseSets: Number(match[1]), baseReps: match[2].trim() };
};

/**
 * Builds { [exerciseName]: { weightKg, repsCompleted, completionRate } }
 * from the user's historical WeeklyPlan documents for Model 2's overload regressor.
 */
const buildUserExerciseHistory = async (userId) => {
  const pastPlans = await WeeklyPlan.find({ user: userId })
    .sort({ weekStartDate: -1 })
    .limit(6)
    .lean();

  const historyMap = {};

  for (const plan of pastPlans) {
    for (const day of plan.days || []) {
      const totalEx = day.exercises?.length || 0;
      const completedEx = day.exercises?.filter((e) => e.completed).length || 0;
      const dayCompletionRate = totalEx > 0 ? completedEx / totalEx : 0;

      for (const ex of day.exercises || []) {
        if (historyMap[ex.name]) continue; // Keep most recent logged entry

        const recordedWeight = ex.loggedWeightKg ?? ex.recommendedWeightKg;
        if (recordedWeight !== null && recordedWeight !== undefined && recordedWeight > 0) {
          const parsedReps = Number(String(ex.reps).match(/\d+/)?.[0]) || 10;
          historyMap[ex.name] = {
            weightKg: Number(recordedWeight),
            repsCompleted: ex.loggedReps ? Number(ex.loggedReps) : parsedReps,
            completionRate: ex.completed ? Math.max(0.85, dayCompletionRate) : 0.6,
          };
        }
      }
    }
  }

  return historyMap;
};

/**
 * Fallback blueprint builder if FastAPI ML service is unreachable
 */
const buildFallbackWeeklyBlueprint = (profile, weekDates) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = dayNames.map((dayName, idx) => {
    const isSunday = idx === 6;
    if (isSunday) {
      return {
        dayName,
        date: weekDates[idx],
        focus: 'Complete Rest & Recovery',
        muscleGroups: [],
        isRestDay: true,
        status: 'pending',
        readinessScore: null,
        adaptationNote: '',
        exercises: [],
      };
    }

    const generated = generateTodaysWorkout(profile, (idx + 1) % 7);
    return {
      dayName,
      date: weekDates[idx],
      focus: generated.title,
      muscleGroups: ['Full Body'],
      isRestDay: false,
      status: 'pending',
      readinessScore: null,
      adaptationNote: '',
      exercises: generated.exercises.map((ex) => ({
        name: ex.name,
        muscleGroup: 'General',
        sets: 3,
        reps: '10-12 reps',
        restSeconds: 60,
        equipment: profile.equipment?.[0] || 'Bodyweight Only',
        completed: false,
        recommendedWeightKg: null,
        loggedWeightKg: null,
        loggedReps: null,
        progressionNote: 'Fallback mode — log weight after session',
      })),
    };
  });

  return {
    predictedSplit: 'Push / Pull / Legs (Fallback)',
    baseRepScheme: '3 sets x 10-12 reps',
    baseRestSeconds: 60,
    suggestedEquipment: [],
    days,
  };
};

// @route   GET /api/workouts/weekly
export const getWeeklyWorkoutPlan = async (req, res, next) => {
  try {
    const { profile, fitnessMetrics } = req.user;
    if (!req.user.isOnboarded || !profile) {
      res.status(400);
      throw new Error('Complete onboarding first to generate a workout plan');
    }

    const { weekStartDate, weekDates, todayIndex, todayDate } = getCurrentWeekContext();
    const forceRegenerate = req.query.regenerate === 'true';

    let plan = await WeeklyPlan.findOne({ user: req.user._id, weekStartDate });
    let source = 'cached';

    const historyMap = await buildUserExerciseHistory(req.user._id);

    if (!plan || forceRegenerate) {
      let blueprint;
      try {
        const { data } = await axios.post(`${ML_URL}/api/ml/generate-week`, {
          age: profile.age,
          bmi: fitnessMetrics?.bmi || 22.5,
          goal: profile.goal,
          experience: profile.experience,
          workoutPreference: profile.workoutPreference,
          activityLevel: profile.activityLevel,
          equipment: profile.equipment,
          weekDates,
          historyMap,
        });
        blueprint = data;
        source = 'ml-model';
      } catch {
        blueprint = buildFallbackWeeklyBlueprint(profile, weekDates);
        source = 'fallback';
      }

      plan = await WeeklyPlan.findOneAndUpdate(
        { user: req.user._id, weekStartDate },
        {
          user: req.user._id,
          weekStartDate,
          predictedSplit: blueprint.predictedSplit,
          baseRepScheme: blueprint.baseRepScheme,
          baseRestSeconds: blueprint.baseRestSeconds,
          suggestedEquipment: blueprint.suggestedEquipment || [],
          days: blueprint.days,
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Auto-reschedule any missed days earlier in the current week
    let autoRescheduled = false;
    const hasUnresolvedPastDays = plan.days.slice(0, todayIndex).some(
      (d) =>
        !d.isRestDay &&
        d.status !== 'completed' &&
        d.status !== 'missed' &&
        d.exercises.filter((e) => e.completed).length < Math.ceil(d.exercises.length * 0.5)
    );

    if (hasUnresolvedPastDays && todayIndex > 0) {
      try {
        const { baseSets, baseReps } = parseRepScheme(plan.baseRepScheme);
        const { data } = await axios.post(`${ML_URL}/api/ml/reschedule-week`, {
          days: plan.days.map((d) => d.toObject()),
          todayIndex,
          profile: profile.toObject ? profile.toObject() : profile,
          baseSets,
          baseReps,
          baseRest: plan.baseRestSeconds,
          historyMap,
        });

        if (data.rescheduled) {
          plan.days = data.days;
          await plan.save();
          autoRescheduled = true;
        }
      } catch {
        // Retain existing plan if ML service is offline
      }
    }

    res.status(200).json({
      success: true,
      source,
      todayIndex,
      todayDate,
      autoRescheduled,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/workouts/adapt-today
export const adaptTodaysWorkout = async (req, res, next) => {
  try {
    const { sleepHours, energyLevel, mood } = req.body;

    if (sleepHours === undefined || !energyLevel || !mood) {
      res.status(400);
      throw new Error('sleepHours, energyLevel, and mood are required');
    }

    const { weekStartDate, todayIndex } = getCurrentWeekContext();
    const plan = await WeeklyPlan.findOne({ user: req.user._id, weekStartDate });

    if (!plan) {
      res.status(404);
      throw new Error('Weekly workout plan not found. Generate the weekly plan first.');
    }

    const todayPlan = plan.days[todayIndex].toObject();

    const { data: adaptedDay } = await axios.post(`${ML_URL}/api/ml/adapt-day`, {
      dayPlan: todayPlan,
      sleepHours: Number(sleepHours),
      energyLevel: Number(energyLevel),
      mood,
    });

    plan.days[todayIndex] = adaptedDay;
    await plan.save();

    res.status(200).json({
      success: true,
      todayIndex,
      adaptedDay: plan.days[todayIndex],
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/workouts/reschedule
export const forceRescheduleWeek = async (req, res, next) => {
  try {
    const { profile } = req.user;
    const { weekStartDate, todayIndex } = getCurrentWeekContext();
    const targetIndex =
      req.body.fromDayIndex !== undefined ? Number(req.body.fromDayIndex) : todayIndex;

    const plan = await WeeklyPlan.findOne({ user: req.user._id, weekStartDate });
    if (!plan) {
      res.status(404);
      throw new Error('Weekly plan not found');
    }

    const historyMap = await buildUserExerciseHistory(req.user._id);
    const { baseSets, baseReps } = parseRepScheme(plan.baseRepScheme);

    const { data } = await axios.post(`${ML_URL}/api/ml/reschedule-week`, {
      days: plan.days.map((d) => d.toObject()),
      todayIndex: targetIndex,
      profile: profile.toObject ? profile.toObject() : profile,
      baseSets,
      baseReps,
      baseRest: plan.baseRestSeconds,
      historyMap,
    });

    plan.days = data.days;
    await plan.save();

    res.status(200).json({
      success: true,
      rescheduled: data.rescheduled,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/workouts/toggle-exercise
// @desc    Toggle completion and save actual lifted weight/reps for progressive overload
export const toggleWeeklyExercise = async (req, res, next) => {
  try {
    const { dayIndex, exerciseId, weightKg, repsCompleted, logOnly } = req.body;
    const { weekStartDate, todayIndex, todayDate } = getCurrentWeekContext();

    const plan = await WeeklyPlan.findOne({ user: req.user._id, weekStartDate });
    if (!plan || !plan.days[dayIndex]) {
      res.status(404);
      throw new Error('Day plan not found');
    }

    const dayPlan = plan.days[dayIndex];
    const exercise = dayPlan.exercises.id(exerciseId);
    if (!exercise) {
      res.status(404);
      throw new Error('Exercise not found');
    }

    if (weightKg !== undefined && weightKg !== '') {
      exercise.loggedWeightKg = Number(weightKg);
    }
    if (repsCompleted !== undefined && repsCompleted !== '') {
      exercise.loggedReps = Number(repsCompleted);
    }

    if (!logOnly) {
      exercise.completed = !exercise.completed;
    }

    const allDone =
      dayPlan.exercises.length > 0 && dayPlan.exercises.every((ex) => ex.completed);
    if (allDone) {
      dayPlan.status = 'completed';
    } else if (dayPlan.status === 'completed') {
      dayPlan.status = 'pending';
    }

    await plan.save();

    // Keep Dashboard's DailyLog consistency chart synchronized
    if (Number(dayIndex) === todayIndex) {
      await DailyLog.findOneAndUpdate(
        { user: req.user._id, date: todayDate },
        {
          workoutTitle: dayPlan.focus,
          exercises: dayPlan.exercises.map((ex) => ({
            name: ex.name,
            sets: `${ex.sets} sets x ${ex.reps}${
              ex.loggedWeightKg || ex.recommendedWeightKg
                ? ` @ ${ex.loggedWeightKg ?? ex.recommendedWeightKg}kg`
                : ''
            }`,
            completed: ex.completed,
          })),
        },
        { upsert: true }
      );
    }

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};