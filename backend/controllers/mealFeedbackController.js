import Food from "../models/Food.js"; // Your seeded Indian food Mongoose model

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

// GET /api/meals/foods — populates the React select bar
export const getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find({})
      .select("name foodKey priceInr calPer100g proPer100g carbsPer100g fatPer100g")
      .sort({ name: 1 });
    return res.status(200).json({ foods });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load foods", error: err.message });
  }
};

// POST /api/meals/custom-food — saves custom food & triggers active learning
export const submitMissingFood = async (req, res) => {
  try {
    const {
      name,
      foodKey,
      grams,
      priceInr,
      calPer100g,
      proPer100g,
      carbsPer100g,
      fatPer100g,
      bbox,      // JSON string: "[x1, y1, x2, y2]"
      plateBox,  // JSON string: "[x1, y1, x2, y2]"
      isNewFood, // "true" or "false"
    } = req.body;

    const normalizedKey = (foodKey || name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    // 1. Upsert into MongoDB if the user created a new food
    let savedFood = null;
    if (isNewFood === "true") {
      savedFood = await Food.findOneAndUpdate(
        { foodKey: normalizedKey },
        {
          name: name.trim(),
          foodKey: normalizedKey,
          priceInr: Number(priceInr) || 0,
          calPer100g: Number(calPer100g) || 0,
          proPer100g: Number(proPer100g) || 0,
          carbsPer100g: Number(carbsPer100g) || 0,
          fatPer100g: Number(fatPer100g) || 0,
        },
        { upsert: true, new: true }
      );
    }

    // 2. Forward image + correction to FastAPI active learning loop
    let mlResult = null;
    if (req.file) {
      const formData = new FormData();
      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append("file", imageBlob, req.file.originalname || "plate.jpg");
      formData.append("food_key", normalizedKey);
      formData.append("corrected_grams", String(grams));
      formData.append("bbox", bbox || "[0, 0, 100, 100]");
      formData.append("plate_box", plateBox || "[0, 0, 640, 640]");

      // Do NOT set Content-Type manually so fetch generates the multipart boundary
      const mlResponse = await fetch(`${ML_SERVICE_URL}/feedback/correction`, {
        method: "POST",
        body: formData,
      });

      if (mlResponse.ok) {
        mlResult = await mlResponse.json();
      }
    }

    return res.status(200).json({
      message: "Food logged and feedback sent to ML service",
      savedFood,
      mlResult,
    });
  } catch (err) {
    return res.status(500).json({ message: "Feedback submission failed", error: err.message });
  }
};