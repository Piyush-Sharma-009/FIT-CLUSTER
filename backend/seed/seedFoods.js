import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from "mongoose";
import dotenv from "dotenv";
import Food from "../models/Food.js";

dotenv.config();

export const FOODS_DATA = [
  // ==========================================
  // BREAKFAST (14 Items)
  // ==========================================
  { id: "f1", name: "Rolled Oats", meal: "breakfast", diet: ["veg", "vegan"], cost: 16.0, cal: 389, pro: 16.9, carb: 66.3, fat: 6.9, quality: 8.0, minUnits: 0.4, maxUnits: 1.0 },
  { id: "f2", name: "Daliya / Broken Wheat (Cooked)", meal: "breakfast", diet: ["veg", "vegan"], cost: 7.0, cal: 120, pro: 3.5, carb: 25.0, fat: 0.4, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f3", name: "Poha / Flattened Rice (Cooked)", meal: "breakfast", diet: ["veg", "vegan"], cost: 8.0, cal: 130, pro: 2.5, carb: 26.0, fat: 1.8, quality: 6.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f4", name: "Sooji Upma (Cooked)", meal: "breakfast", diet: ["veg", "vegan"], cost: 9.0, cal: 145, pro: 3.8, carb: 25.0, fat: 3.2, quality: 6.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f5", name: "Idli (Steamed)", meal: "breakfast", diet: ["veg", "vegan"], cost: 12.0, cal: 146, pro: 4.5, carb: 30.0, fat: 0.5, quality: 7.5, minUnits: 1.0, maxUnits: 3.0 },
  { id: "f6", name: "Besan Chilla (Dry Mix)", meal: "breakfast", diet: ["veg", "vegan"], cost: 11.0, cal: 387, pro: 22.0, carb: 58.0, fat: 6.7, quality: 8.0, minUnits: 0.5, maxUnits: 1.2 },
  { id: "f7", name: "Moong Dal Chilla (Dry Mix)", meal: "breakfast", diet: ["veg", "vegan"], cost: 14.0, cal: 347, pro: 24.0, carb: 60.0, fat: 1.2, quality: 8.5, minUnits: 0.5, maxUnits: 1.2 },
  { id: "f8", name: "Whole Wheat Brown Bread", meal: "breakfast", diet: ["veg", "vegan"], cost: 12.0, cal: 247, pro: 13.0, carb: 41.0, fat: 3.4, quality: 6.5, minUnits: 0.6, maxUnits: 1.5 },
  { id: "f9", name: "Toned Milk", meal: "breakfast", diet: ["veg"], cost: 6.5, cal: 58, pro: 3.2, carb: 4.8, fat: 3.0, quality: 7.0, minUnits: 1.5, maxUnits: 3.5 },
  { id: "f10", name: "Skimmed / Double Toned Milk", meal: "breakfast", diet: ["veg"], cost: 6.0, cal: 46, pro: 3.3, carb: 5.0, fat: 1.5, quality: 7.5, minUnits: 1.5, maxUnits: 3.5 },
  { id: "f11", name: "Greek Yogurt / Hung Curd", meal: "breakfast", diet: ["veg"], cost: 38.0, cal: 97, pro: 9.0, carb: 3.6, fat: 5.0, quality: 9.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f12", name: "Banana", meal: "breakfast", diet: ["veg", "vegan"], cost: 5.0, cal: 89, pro: 1.1, carb: 22.8, fat: 0.3, quality: 7.0, minUnits: 0.8, maxUnits: 2.0 },
  { id: "f13", name: "Whole Eggs (Boiled / Omelette)", meal: "breakfast", diet: ["non-veg"], cost: 14.0, cal: 155, pro: 13.0, carb: 1.1, fat: 11.0, quality: 8.5, minUnits: 1.0, maxUnits: 3.0 },
  { id: "f14", name: "Egg Whites (Boiled)", meal: "breakfast", diet: ["non-veg"], cost: 18.0, cal: 52, pro: 11.0, carb: 0.7, fat: 0.2, quality: 9.0, minUnits: 1.0, maxUnits: 3.5 },

  // ==========================================
  // LUNCH (16 Items)
  // ==========================================
  { id: "f15", name: "Whole Wheat Roti / Chapati", meal: "lunch", diet: ["veg", "vegan"], cost: 8.0, cal: 297, pro: 11.0, carb: 61.0, fat: 1.7, quality: 7.5, minUnits: 0.6, maxUnits: 2.5 },
  { id: "f16", name: "Jowar Bhakri / Sorghum Roti", meal: "lunch", diet: ["veg", "vegan"], cost: 12.0, cal: 329, pro: 10.4, carb: 70.7, fat: 3.1, quality: 8.0, minUnits: 0.6, maxUnits: 2.0 },
  { id: "f17", name: "Bajra Roti / Pearl Millet", meal: "lunch", diet: ["veg", "vegan"], cost: 11.0, cal: 361, pro: 11.6, carb: 67.5, fat: 5.0, quality: 8.0, minUnits: 0.6, maxUnits: 2.0 },
  { id: "f18", name: "Cooked White Rice", meal: "lunch", diet: ["veg", "vegan"], cost: 6.0, cal: 130, pro: 2.7, carb: 28.0, fat: 0.3, quality: 5.0, minUnits: 1.0, maxUnits: 3.0 },
  { id: "f19", name: "Cooked Brown Rice", meal: "lunch", diet: ["veg", "vegan"], cost: 11.0, cal: 111, pro: 2.6, carb: 23.0, fat: 0.9, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f20", name: "Cooked Quinoa", meal: "lunch", diet: ["veg", "vegan"], cost: 36.0, cal: 120, pro: 4.4, carb: 21.3, fat: 1.9, quality: 9.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f21", name: "Moong Dal (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 12.0, cal: 105, pro: 7.0, carb: 19.0, fat: 0.4, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f22", name: "Toor / Arhar Dal (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 13.0, cal: 118, pro: 7.2, carb: 20.5, fat: 0.6, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f23", name: "Masoor Dal (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 12.0, cal: 116, pro: 9.0, carb: 20.1, fat: 0.4, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f24", name: "Rajma / Kidney Beans (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 14.0, cal: 127, pro: 8.7, carb: 22.8, fat: 0.5, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f25", name: "Kabuli Chana / Chickpeas (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 13.0, cal: 164, pro: 8.9, carb: 27.4, fat: 2.6, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f26", name: "Kala Chana / Black Chickpeas (Boiled)", meal: "lunch", diet: ["veg", "vegan"], cost: 11.0, cal: 160, pro: 8.8, carb: 27.0, fat: 2.5, quality: 8.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f27", name: "Lobia / Black-Eyed Peas (Cooked)", meal: "lunch", diet: ["veg", "vegan"], cost: 12.0, cal: 116, pro: 7.7, carb: 20.8, fat: 0.5, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f28", name: "Soya Chunks (Dry Weight)", meal: "lunch", diet: ["veg", "vegan"], cost: 14.0, cal: 345, pro: 52.0, carb: 33.0, fat: 0.5, quality: 6.0, minUnits: 0.3, maxUnits: 0.8 },
  { id: "f29", name: "Dahi / Plain Curd (Low-Fat)", meal: "lunch", diet: ["veg"], cost: 9.0, cal: 60, pro: 3.5, carb: 4.7, fat: 1.5, quality: 7.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f30", name: "Chaas / Spiced Buttermilk", meal: "lunch", diet: ["veg"], cost: 5.0, cal: 28, pro: 1.8, carb: 2.6, fat: 1.0, quality: 7.0, minUnits: 1.5, maxUnits: 3.5 },

  // ==========================================
  // DINNER (12 Items)
  // ==========================================
  { id: "f31", name: "Paneer (Regular Malai)", meal: "dinner", diet: ["veg"], cost: 42.0, cal: 265, pro: 18.0, carb: 3.5, fat: 20.0, quality: 8.5, minUnits: 0.6, maxUnits: 2.0 },
  { id: "f32", name: "Low-Fat Paneer", meal: "dinner", diet: ["veg"], cost: 48.0, cal: 205, pro: 22.0, carb: 3.8, fat: 11.0, quality: 9.5, minUnits: 0.6, maxUnits: 2.5 },
  { id: "f33", name: "Tofu (Firm Soya Paneer)", meal: "dinner", diet: ["veg", "vegan"], cost: 28.0, cal: 144, pro: 17.3, carb: 2.8, fat: 8.7, quality: 8.5, minUnits: 0.8, maxUnits: 2.5 },
  { id: "f34", name: "Chicken Breast (Boneless)", meal: "dinner", diet: ["non-veg"], cost: 34.0, cal: 165, pro: 31.0, carb: 0.0, fat: 3.6, quality: 9.5, minUnits: 1.0, maxUnits: 3.5 },
  { id: "f35", name: "Chicken Thigh / Curry Cut (Skinless)", meal: "dinner", diet: ["non-veg"], cost: 28.0, cal: 209, pro: 26.0, carb: 0.0, fat: 10.9, quality: 8.0, minUnits: 1.0, maxUnits: 3.0 },
  { id: "f36", name: "Rohu / Katla / Tilapia Fish Fillet", meal: "dinner", diet: ["non-veg"], cost: 48.0, cal: 128, pro: 26.0, carb: 0.0, fat: 2.7, quality: 9.5, minUnits: 1.0, maxUnits: 3.0 },
  { id: "f37", name: "Prawns / Shrimp (Cleaned)", meal: "dinner", diet: ["non-veg"], cost: 75.0, cal: 99, pro: 24.0, carb: 0.2, fat: 0.3, quality: 9.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f38", name: "Mix Veg Sabzi (Bhindi / Beans / Carrot)", meal: "dinner", diet: ["veg", "vegan"], cost: 14.0, cal: 65, pro: 2.2, carb: 9.5, fat: 2.0, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f39", name: "Palak / Spinach Cooked", meal: "dinner", diet: ["veg", "vegan"], cost: 10.0, cal: 45, pro: 3.0, carb: 4.5, fat: 1.5, quality: 8.5, minUnits: 1.0, maxUnits: 2.5 },
  { id: "f40", name: "Sauteed Broccoli & Bell Peppers", meal: "dinner", diet: ["veg", "vegan"], cost: 26.0, cal: 45, pro: 2.8, carb: 7.0, fat: 0.5, quality: 9.0, minUnits: 0.8, maxUnits: 2.0 },
  { id: "f41", name: "Button Mushrooms (Sauteed)", meal: "dinner", diet: ["veg", "vegan"], cost: 24.0, cal: 38, pro: 3.1, carb: 5.3, fat: 0.5, quality: 8.5, minUnits: 0.8, maxUnits: 2.0 },
  { id: "f42", name: "Sweet Potato / Shakarkandi (Boiled)", meal: "dinner", diet: ["veg", "vegan"], cost: 8.0, cal: 86, pro: 1.6, carb: 20.1, fat: 0.1, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },

  // ==========================================
  // SNACKS & SUPPLEMENTS (13 Items)
  // ==========================================
  { id: "f43", name: "Whey Protein Isolate", meal: "snack", diet: ["veg"], cost: 95.0, cal: 370, pro: 80.0, carb: 4.0, fat: 2.0, quality: 9.5, minUnits: 0.3, maxUnits: 0.9 },
  { id: "f44", name: "Whey Protein Concentrate", meal: "snack", diet: ["veg"], cost: 72.0, cal: 385, pro: 75.0, carb: 7.0, fat: 5.0, quality: 9.0, minUnits: 0.3, maxUnits: 0.9 },
  { id: "f45", name: "Plant Protein Powder (Pea + Rice)", meal: "snack", diet: ["veg", "vegan"], cost: 85.0, cal: 360, pro: 75.0, carb: 6.0, fat: 3.0, quality: 9.0, minUnits: 0.3, maxUnits: 0.9 },
  { id: "f46", name: "Roasted Chana / Sattu Powder", meal: "snack", diet: ["veg", "vegan"], cost: 14.0, cal: 369, pro: 20.5, carb: 58.0, fat: 5.2, quality: 8.0, minUnits: 0.3, maxUnits: 0.8 },
  { id: "f47", name: "Sprouted Moong Salad", meal: "snack", diet: ["veg", "vegan"], cost: 12.0, cal: 85, pro: 7.0, carb: 14.5, fat: 0.4, quality: 9.0, minUnits: 0.8, maxUnits: 2.0 },
  { id: "f48", name: "Roasted Makhana / Fox Nuts", meal: "snack", diet: ["veg", "vegan"], cost: 90.0, cal: 347, pro: 9.7, carb: 76.9, fat: 0.1, quality: 8.5, minUnits: 0.2, maxUnits: 0.5 },
  { id: "f49", name: "Almonds / Badam", meal: "snack", diet: ["veg", "vegan"], cost: 85.0, cal: 579, pro: 21.2, carb: 21.6, fat: 49.9, quality: 9.0, minUnits: 0.15, maxUnits: 0.4 },
  { id: "f50", name: "Walnuts / Akhrot", meal: "snack", diet: ["veg", "vegan"], cost: 115.0, cal: 654, pro: 15.2, carb: 13.7, fat: 65.2, quality: 9.5, minUnits: 0.15, maxUnits: 0.35 },
  { id: "f51", name: "Roasted Peanuts / Mungfali", meal: "snack", diet: ["veg", "vegan"], cost: 18.0, cal: 567, pro: 25.8, carb: 16.1, fat: 49.2, quality: 7.5, minUnits: 0.2, maxUnits: 0.5 },
  { id: "f52", name: "Natural Peanut Butter", meal: "snack", diet: ["veg", "vegan"], cost: 42.0, cal: 588, pro: 25.0, carb: 20.0, fat: 50.0, quality: 8.0, minUnits: 0.15, maxUnits: 0.45 },
  { id: "f53", name: "Pumpkin & Chia Seeds Mix", meal: "snack", diet: ["veg", "vegan"], cost: 70.0, cal: 520, pro: 24.0, carb: 28.0, fat: 38.0, quality: 9.5, minUnits: 0.15, maxUnits: 0.35 },
  { id: "f54", name: "Apple", meal: "snack", diet: ["veg", "vegan"], cost: 16.0, cal: 52, pro: 0.3, carb: 13.8, fat: 0.2, quality: 8.0, minUnits: 1.0, maxUnits: 2.0 },
  { id: "f55", name: "Papaya / Guava (Amrood)", meal: "snack", diet: ["veg", "vegan"], cost: 8.0, cal: 43, pro: 0.5, carb: 10.8, fat: 0.3, quality: 8.0, minUnits: 1.0, maxUnits: 2.5 },
];

const seedFoods = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const operations = FOODS_DATA.map((food) => ({
      updateOne: {
        filter: { id: food.id },
        update: { $set: food },
        upsert: true,
      },
    }));

    const result = await Food.bulkWrite(operations);
    console.log(
      `Seeded ${FOODS_DATA.length} foods (Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount})`
    );
    process.exit(0);
  } catch (error) {
    console.error("Food seed failed:", error.message);
    process.exit(1);
  }
};

seedFoods();