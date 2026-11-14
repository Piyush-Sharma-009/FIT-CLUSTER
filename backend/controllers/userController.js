import User from '../models/User.js';
import { calculateFitnessMetrics } from '../utils/fitnessCalculator.js';


export const completeOnboarding = async (req, res, next) => {
  try {
    const {
      age,
      gender,
      height,
      weight,
      activityLevel,
      experience,
      goal,
      workoutPreference,
      equipment,
      dietaryPreference,
      dailyFoodBudget,
    } = req.body;

    if (
      !age ||
      !gender ||
      !height ||
      !weight ||
      !activityLevel ||
      !experience ||
      !goal ||
      !workoutPreference ||
      !dietaryPreference ||
      !dailyFoodBudget
    ) {
      res.status(400);
      throw new Error('Please complete all required onboarding fields');
    }

    const profileData = {
      age: Number(age),
      gender,
      height: Number(height),
      weight: Number(weight),
      activityLevel,
      experience,
      goal,
      workoutPreference,
      equipment: Array.isArray(equipment) ? equipment : [],
      dietaryPreference,
      dailyFoodBudget: Number(dailyFoodBudget),
    };

    // Compute BMI, BMR, TDEE, daily calories, and daily protein
    const fitnessMetrics = calculateFitnessMetrics(profileData);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profile: profileData,
        fitnessMetrics,
        isOnboarded: true,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isOnboarded: updatedUser.isOnboarded,
        profile: updatedUser.profile,
        fitnessMetrics: updatedUser.fitnessMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
};