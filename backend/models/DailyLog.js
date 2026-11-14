import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Stored as YYYY-MM-DD so each user has one unique log document per calendar day
    date: {
      type: String,
      required: true,
    },
    workoutTitle: {
      type: String,
      required: true,
    },
    exercises: [
      {
        name: { type: String, required: true },
        sets: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    meals: [
      {
        name: { type: String, required: true },
        calories: { type: Number, required: true },
        protein: { type: Number, required: true },
        cost: { type: Number, default: 0 }, // in INR
        loggedAt: { type: Date, default: Date.now },
      },
    ],
    totals: {
      caloriesConsumed: { type: Number, default: 0 },
      proteinConsumed: { type: Number, default: 0 },
      budgetSpent: { type: Number, default: 0 },
    },
    loggedWeight: {
      type: Number,
    },
  },
  { timestamps: true }
);

dailyLogSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;