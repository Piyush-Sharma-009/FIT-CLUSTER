import axios from "axios";
import User from "../models/User.js";
import Food from "../models/Food.js";
import DietPlan from "../models/DietPlan.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export const optimizeDietPlan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    if (!user.isOnboarded || !user.profile) {
      return res.status(400).json({
        success: false,
        message: "Complete onboarding before generating a diet plan.",
      });
    }

    // Pull targets from the saved fitness metrics, while allowing explicit overrides.
    const targetCalories =
      req.body.targetCalories ?? user.fitnessMetrics?.dailyCalories ?? 2000;
    const targetProtein =
      req.body.targetProtein ?? user.fitnessMetrics?.dailyProtein ?? 120;
    const targetCarbs    = req.body.targetCarbs    ?? user.targetCarbs;
    const targetFats     = req.body.targetFats     ?? user.targetFats;
    const maxBudget      = req.body.maxBudget      ?? user.profile.dailyFoodBudget      ?? 200;
    const dietType       = req.body.dietType ??
      (user.profile.dietaryPreference === "Non-vegetarian" ? "non-veg" : "veg");
    const excludedFoods  = Array.isArray(req.body.excludedFoods) ? req.body.excludedFoods : [];

    const dbFoods = await Food.find({ isActive: true });
    if (dbFoods.length === 0) {
      return res.status(503).json({
        success: false,
        message: "Food catalog is empty. Seed the food catalog before generating a diet plan.",
      });
    }

    const formattedFoods = dbFoods.map((f) => ({
      id: f.id,
      name: f.name,
      meal: f.meal || "lunch",
      diet: f.diet || ["veg"],
      cost: f.cost,
      cal: f.cal,
      pro: f.pro,
      carb: f.carb,
      fat: f.fat,
      maxUnits: f.maxUnits || 2.0,
    }));

    const payload = {
      targetCalories: Number(targetCalories),
      targetProtein: Number(targetProtein),
      ...(targetCarbs ? { targetCarbs: Number(targetCarbs) } : {}),
      ...(targetFats ? { targetFats: Number(targetFats) } : {}),
      maxBudget: Number(maxBudget),
      dietType,
      excludedFoods,
      foods: formattedFoods,
    };

    const { data } = await axios.post(`${ML_SERVICE_URL}/api/ml/optimize-diet`, payload, {
      timeout: 10000,
    });

    // Save generated plan to MongoDB if user is authenticated
    const savedPlan = await DietPlan.findOneAndUpdate(
      { userId },
      {
        userId,
        targetCalories: payload.targetCalories,
        targetProtein: payload.targetProtein,
        maxBudget: payload.maxBudget,
        dietType: payload.dietType,
        summary: data.summary,
        warnings: data.warnings || [],
        meals: data.meals || [],
      },
      { new: true, upsert: true }
    );


    return res.status(200).json({ success: true, plan: savedPlan });
  } catch (error) {
    const status = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;
    console.error("[MILP Diet Controller Error]:", detail);

    return res.status(status).json({
      success: false,
      message: "Failed to optimize diet plan.",
      error: detail,
    });
  }
};

export const getLatestDietPlan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const plan = await DietPlan.findOne({ userId });
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};