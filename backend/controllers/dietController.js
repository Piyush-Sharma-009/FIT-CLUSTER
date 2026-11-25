

import axios from "axios";
import Food from "../models/Food.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export const generateDietPlan = async (req, res) => {
  try {
    const {
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
      maxBudget,
      dietType,
      excludedFoods = [],
    } = req.body;

    // Fetch active foods from MongoDB, excluding Mongoose internal fields
    const dbFoods = await Food.find({ isActive: true })
      .select("-_id -__v -isActive -createdAt -updatedAt")
      .lean();

    if (!dbFoods.length) {
      return res.status(503).json({
        success: false,
        message: "Food catalog is empty. Run the database seed script first.",
      });
    }

    const { data } = await axios.post(
      `${ML_SERVICE_URL}/optimize-diet`,
      {
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFats,
        maxBudget,
        dietType,
        excludedFoods,
        foods: dbFoods,
      },
      { timeout: 10000 }
    );

    if (!data.success) {
      return res.status(422).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Diet optimization error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate diet plan from ML service.",
      error: error.response?.data || error.message,
    });
  }
};