import mongoose from 'mongoose';

const foodCorrectionLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    foodKey: { type: String, required: true },
    foodName: { type: String, required: true },
    predictedGrams: { type: Number, required: true },
    correctedGrams: { type: Number, required: true },
    areaRatio: { type: Number, default: 0 },
    bbox: [{ type: Number }],
    plateBox: [{ type: Number }],
    fineTunedApplied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('FoodCorrectionLog', foodCorrectionLogSchema);