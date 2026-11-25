import axios from 'axios';
import FormData from 'form-data';
import DailyLog from '../models/DailyLog.js';
import FoodCorrectionLog from '../models/FoodCorrectionLog.js';
import { getCurrentWeekContext } from '../utils/weekHelper.js';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const parseFeedbackBox = (value) => {
  let box;
  try {
    box = JSON.parse(value);
  } catch {
    return null;
  }
  if (
    !Array.isArray(box) ||
    box.length !== 4 ||
    !box.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  ) {
    return null;
  }
  return box;
};

// @route   POST /api/vision/analyze
// @desc    Forward uploaded plate photo to FastAPI (Model 3 YOLOv8 + Model 4 ResNet18)
export const analyzeMealPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a plate image file');
    }

    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'plate.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });

    const { data } = await axios.post(`${ML_URL}/api/ml/analyze-meal-image`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: 9 * 1024 * 1024,
      timeout: 60_000,
    });

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    if (error.response?.data?.detail) {
      const upstreamStatus = error.response.status || 500;
      res.status(upstreamStatus >= 500 ? 502 : upstreamStatus);
      return next(
        new Error(
          upstreamStatus >= 500
            ? 'Meal analysis service failed. Please try again later.'
            : error.response.data.detail
        )
      );
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504);
      return next(new Error('Meal analysis timed out. Please try again.'));
    }
    if (error.code === 'ECONNREFUSED') {
      res.status(503);
      return next(new Error('Meal analysis service is unavailable.'));
    }
    next(error);
  }
};

// @route   POST /api/vision/log-meal
// @desc    Log scanned items to today's DailyLog and record user portion corrections
export const logScannedMealAndFeedback = async (req, res, next) => {
  try {
    const { items, plateBox, detectorMode } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
      res.status(400);
      throw new Error('Provide between 1 and 20 detected food items to log');
    }

    const { todayDate } = getCurrentWeekContext();

    // 1. Format scanned items into DailyLog meal entries
    const mealEntries = items.map((item) => {
      const calories = item?.calories;
      const protein = item?.protein;
      const quantityGrams = item?.finalGrams;
      if (
        typeof item?.name !== 'string' ||
        !item.name.trim() ||
        item.name.length > 100 ||
        typeof calories !== 'number' ||
        !Number.isFinite(calories) ||
        calories < 0 ||
        calories > 10000 ||
        typeof protein !== 'number' ||
        !Number.isFinite(protein) ||
        protein < 0 ||
        protein > 1000 ||
        typeof quantityGrams !== 'number' ||
        !Number.isFinite(quantityGrams) ||
        quantityGrams < 5 ||
        quantityGrams > 1000
      ) {
        res.status(400);
        throw new Error('Each meal item must have a valid name, portion, and nutrition values');
      }

      return {
        name: item.name.trim(),
        calories,
        protein,
        quantityGrams,
        cost: 0,
      };
    });

    const caloriesConsumed = mealEntries.reduce(
      (total, meal) => total + meal.calories,
      0
    );
    const proteinConsumed = mealEntries.reduce(
      (total, meal) => total + meal.protein,
      0
    );

    const dailyLog = await DailyLog.findOneAndUpdate(
      { user: req.user._id, date: todayDate },
      {
        $push: {
          meals: { $each: mealEntries },
        },
        $inc: {
          'totals.caloriesConsumed': caloriesConsumed,
          'totals.proteinConsumed': proteinConsumed,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 2. Record user-corrected portion weights for offline review
    const correctionDocs = [];
    if (detectorMode === 'custom-yolov8') {
      for (const item of items) {
        const predicted = item.estimatedGrams;
        const corrected = item.finalGrams;
        const areaRatio = item.areaRatio;
        const bboxIsValid =
          Array.isArray(item.bbox) &&
          item.bbox.length === 4 &&
          item.bbox.every((coordinate) => Number.isFinite(Number(coordinate)));
        const plateBoxIsValid =
          Array.isArray(plateBox) &&
          plateBox.length === 4 &&
          plateBox.every((coordinate) => Number.isFinite(Number(coordinate)));
        if (
          typeof item.foodKey === 'string' &&
          item.foodKey.length <= 80 &&
          Number.isFinite(predicted) &&
          predicted >= 5 &&
          predicted <= 1000 &&
          Number.isFinite(corrected) &&
          corrected >= 5 &&
          corrected <= 1000 &&
          Number.isFinite(areaRatio) &&
          areaRatio >= 0 &&
          areaRatio <= 1 &&
          bboxIsValid &&
          plateBoxIsValid &&
          Math.abs(corrected - predicted) >= 2
        ) {
          correctionDocs.push({
            user: req.user._id,
            foodKey: item.foodKey,
            foodName: item.name,
            predictedGrams: predicted,
            correctedGrams: corrected,
            areaRatio,
            bbox: item.bbox.map(Number),
            plateBox: plateBox.map(Number),
            fineTunedApplied: false,
          });
        }
      }
    }

    if (correctionDocs.length > 0) {
      await FoodCorrectionLog.insertMany(correctionDocs);
    }

    res.status(200).json({
      success: true,
      loggedCount: mealEntries.length,
      correctionsRecorded: correctionDocs.length,
      dailyLog,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/vision/submit-feedback
// @desc   Queue validated portion corrections for review without updating shared weights
export const sendPortionFeedbackToML = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Image file is required for portion feedback');
    }

    const apiKey = process.env.ML_SERVICE_API_KEY;
    if (!apiKey) {
      res.status(503);
      throw new Error('Meal feedback service is not configured');
    }

    const { foodKey } = req.body;
    const predictedGrams = Number(req.body.predictedGrams);
    const correctedGrams = Number(req.body.correctedGrams);
    const bbox = parseFeedbackBox(req.body.bbox);
    const plateBox = parseFeedbackBox(req.body.plateBox);
    if (
      typeof foodKey !== 'string' ||
      !/^[a-z0-9_]{1,64}$/.test(foodKey) ||
      !Number.isFinite(predictedGrams) ||
      predictedGrams < 5 ||
      predictedGrams > 1000 ||
      !Number.isFinite(correctedGrams) ||
      correctedGrams < 5 ||
      correctedGrams > 1000 ||
      Math.abs(correctedGrams - predictedGrams) < 2 ||
      !bbox ||
      !plateBox
    ) {
      res.status(400);
      throw new Error('Portion feedback contains invalid food, weight, or bounding-box data');
    }

    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'plate.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });
    form.append('food_key', foodKey);
    form.append('predicted_grams', String(predictedGrams));
    form.append('corrected_grams', String(correctedGrams));
    form.append('bbox', JSON.stringify(bbox));
    form.append('plate_box', JSON.stringify(plateBox));
    form.append('user_id', String(req.user._id));

    const { data } = await axios.post(`${ML_URL}/feedback/correction`, form, {
      headers: {
        ...form.getHeaders(),
        'X-ML-Service-Key': apiKey,
      },
      maxBodyLength: 9 * 1024 * 1024,
      timeout: 30_000,
    });

    res.status(202).json({
      success: true,
      queued: Boolean(data.queued),
      sampleId: data.sampleId,
      status: data.status,
    });
  } catch (error) {
    if (error.response?.data?.detail) {
      const upstreamStatus = error.response.status || 500;
      res.status(upstreamStatus >= 500 ? 502 : upstreamStatus);
      return next(
        new Error(
          upstreamStatus >= 500
            ? 'Meal feedback service failed. Please try again later.'
            : error.response.data.detail
        )
      );
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504);
      return next(new Error('Meal feedback submission timed out.'));
    }
    if (error.code === 'ECONNREFUSED') {
      res.status(503);
      return next(new Error('Meal feedback service is unavailable.'));
    }
    next(error);
  }
};