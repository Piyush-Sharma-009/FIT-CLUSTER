import mongoose from 'mongoose';

const plannedExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    muscleGroup: { type: String, required: true }, // Push, Pull, Legs, Core, Cardio
    sets: { type: Number, required: true },
    reps: { type: String, required: true },
    restSeconds: { type: Number, default: 60 },
    equipment: { type: String, default: 'Bodyweight Only' },
    completed: { type: Boolean, default: false },
    recommendedWeightKg: { type: Number, default: null },
    loggedWeightKg: { type: Number, default: null },
    loggedReps: { type: Number, default: null },
    progressionNote: { type: String, default: '' },
    similarityScore: { type: Number, default: null },
  },
  { _id: true }
);

const dayPlanSchema = new mongoose.Schema(
  {
    dayName: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    focus: { type: String, required: true },
    muscleGroups: [{ type: String }],
    isRestDay: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed', 'rescheduled', 'adapted'],
      default: 'pending',
    },
    readinessScore: { type: Number, default: null }, // 0 - 100
    adaptationNote: { type: String, default: '' },
    exercises: [plannedExerciseSchema],
  },
  { _id: false }
);

const weeklyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weekStartDate: { type: String, required: true }, // Monday YYYY-MM-DD
    predictedSplit: { type: String, required: true },
    baseRepScheme: { type: String, required: true },
    baseRestSeconds: { type: Number, required: true },
    suggestedEquipment: [
      {
        item: { type: String, required: true },
        reason: { type: String, required: true },
        unlockedExercises: [{ type: String }],
      },
    ],
    days: [dayPlanSchema],
  },
  { timestamps: true }
);

weeklyPlanSchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

export default mongoose.model('WeeklyPlan', weeklyPlanSchema);