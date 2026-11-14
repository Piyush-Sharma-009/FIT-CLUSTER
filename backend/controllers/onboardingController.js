export const getProfile = (req, res) => {
  res.status(200).json({
    success: true,
    fullName: req.user.fullName,
    email: req.user.email,
    profile: req.user.profile,
  });
};

export const updateProfile = async (req, res) => {
  try {
    const {
      age,
      gender,
      heightCm,
      weightKg,
      activityLevel,
      workoutExperience,
      dietaryPreference,
      fitnessGoal,
      dailyFoodBudget,
    } = req.body;

    req.user.profile = {
      age: Number(age),
      gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      workoutExperience,
      dietaryPreference,
      fitnessGoal,
      dailyFoodBudget: Number(dailyFoodBudget),
      onboardingCompleted: true,
    };

    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding profile saved',
      profile: req.user.profile,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};