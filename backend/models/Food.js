import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    meal: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      required: true,
    },
    diet: {
      type: [String],
      enum: ["veg", "vegan", "non-veg"],
      required: true,
    },
    cost: {
      type: Number, // ₹ per 100g
      required: true,
      min: 0,
    },
    cal: {
      type: Number, // kcal per 100g
      required: true,
      min: 0,
    },
    pro: {
      type: Number, // protein (g) per 100g
      required: true,
      min: 0,
    },
    carb: {
      type: Number, // carbs (g) per 100g
      required: true,
      min: 0,
    },
    fat: {
      type: Number, // fats (g) per 100g
      required: true,
      min: 0,
    },
    quality: {
      type: Number, // 1 to 10 nutritional/grade score
      default: 7.0,
      min: 1,
      max: 10,
    },
    minUnits: {
      type: Number, // minimum 100g units if selected
      default: 0.35,
    },
    maxUnits: {
      type: Number, // maximum 100g units per day
      default: 2.0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

foodSchema.index({ isActive: 1, diet: 1 });

export default mongoose.model("Food", foodSchema);