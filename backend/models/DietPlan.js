import mongoose from "mongoose";

const mealItemSchema = new mongoose.Schema(
  {
    foodId: String,
    name: { type: String, required: true },
    mealSlot: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"], default: "lunch" },
    grams: { type: Number, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
    cost: { type: Number, required: true },
  },
  { _id: false }
);

const dietPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetCalories: Number,
    targetProtein: Number,
    maxBudget: Number,
    dietType: String,
    summary: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      cost: Number,
    },
    warnings: [String],
    meals: [mealItemSchema],
  },
  { timestamps: true }
);

export default mongoose.model("DietPlan", dietPlanSchema);