import { calculateNutritionAndMetrics } from '../utils/fitnessCalculator.js';

export const computeNutrition = (req, res) => {
  const results = calculateNutritionAndMetrics(req.body || {});
  if (!results) {
    return res.status(400).json({ success: false, message: 'Missing required biometric fields' });
  }

  res.status(200).json({ success: true, results });
};