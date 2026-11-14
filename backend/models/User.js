// ==========================================
// 1. DEPENDENCIES & IMPORTS
// ==========================================
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ==========================================
// 2. USER SCHEMA DEFINITION
// ==========================================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Exclude password from query results by default
    },
    // Tracks whether the user completed initial fitness profile setup
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    profile: {
      age: { type: Number, min: 13, max: 100 },
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      height: { type: Number }, // in cm
      weight: { type: Number }, // in kg
      activityLevel: {
        type: String,
        enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'],
      },
      experience: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
      },
      goal: {
        type: String,
        enum: ['Weight Loss', 'Muscle Gain', 'Strength', 'General Fitness'],
      },
      workoutPreference: {
        type: String,
        enum: ['Home', 'Gym'],
      },
      equipment: [{ type: String }],
      dietaryPreference: {
        type: String,
        enum: ['Vegetarian', 'Non-vegetarian'],
      },
      dailyFoodBudget: { type: Number }, // in INR
    },
        //fitness metrics
   
    fitnessMetrics: {
      bmi: { type: Number },
      bmiCategory: { type: String },
      bmr: { type: Number },
      tdee: { type: Number },
      dailyCalories: { type: Number },
      dailyProtein: { type: Number },
    },        

  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
);

// ==========================================
// 3. PASSWORD HASHING HOOK (PRE-SAVE)
// ==========================================
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// 4. INSTANCE METHODS (PASSWORD VERIFICATION)
// ==========================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==========================================
// 5. MODEL EXPORT
// ==========================================
const User = mongoose.model('User', userSchema);
export default User;