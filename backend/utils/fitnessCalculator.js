export const calculateFitnessMetrics = (profile) => {
  const { age, gender, height, weight, activityLevel, goal } = profile;

  // 1. BMI Calculation
  const heightInMeters = height / 100;
  const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

  let bmiCategory = 'Normal Weight';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi >= 25 && bmi < 30) bmiCategory = 'Overweight';
  else if (bmi >= 30) bmiCategory = 'Obese';

  // 2. BMR Calculation (Mifflin-St Jeor Equation)
  let genderOffset = -78;
  if (gender === 'Male') genderOffset = 5;
  else if (gender === 'Female') genderOffset = -161;

  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + genderOffset);

  // 3. TDEE Calculation
  const activityMultipliers = {
    Sedentary: 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.2;
  const tdee = Math.round(bmr * multiplier);

  // 4. Daily Calorie Requirement based on Fitness Goal
  const goalCalorieAdjustments = {
    'Weight Loss': -450,
    'Muscle Gain': 350,
    Strength: 200,
    'General Fitness': 0,
  };
  const dailyCalories = Math.max(
    1200,
    tdee + (goalCalorieAdjustments[goal] || 0)
  );

  // 5. Daily Protein Requirement (grams/day)
  const proteinMultipliers = {
    'Weight Loss': 1.8, // Preserves lean mass in a deficit
    'Muscle Gain': 2.0,
    Strength: 2.0,
    'General Fitness': 1.5,
  };
  const dailyProtein = Math.round(weight * (proteinMultipliers[goal] || 1.6));

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    dailyCalories,
    dailyProtein,
  };
};

export const calculateNutritionAndMetrics = (inputs) => {
  const age = Number(inputs.age);
  const height = Number(inputs.heightCm);
  const weight = Number(inputs.weightKg);
  const gender = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  }[String(inputs.gender).toLowerCase()];
  const activityLevel = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Very Active',
    very_active: 'Very Active',
  }[inputs.activityLevel];
  const goal = {
    weight_loss: 'Weight Loss',
    muscle_gain: 'Muscle Gain',
    strength_building: 'Strength',
    general_fitness: 'General Fitness',
  }[inputs.fitnessGoal];

  if (
    !Number.isFinite(age) ||
    age < 13 ||
    age > 100 ||
    !Number.isFinite(height) ||
    height < 100 ||
    height > 250 ||
    !Number.isFinite(weight) ||
    weight < 30 ||
    weight > 300 ||
    !gender ||
    !activityLevel ||
    !goal
  ) {
    return null;
  }

  const metrics = calculateFitnessMetrics({
    age,
    gender,
    height,
    weight,
    activityLevel,
    goal,
  });

  return {
    ...metrics,
    proteinTargetGrams: metrics.dailyProtein,
    carbsTargetGrams: Math.round((metrics.dailyCalories * 0.45) / 4),
    fatTargetGrams: Math.round((metrics.dailyCalories * 0.25) / 9),
  };
};