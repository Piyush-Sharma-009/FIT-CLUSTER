// Generates today's workout split tailored to environment, goal, and equipment
export const generateTodaysWorkout = (profile, dayIndex = new Date().getDay()) => {
  const isGym = profile.workoutPreference === 'Gym';
  const hasDumbbells = profile.equipment?.includes('Dumbbells');
  const repScheme =
    profile.goal === 'Strength'
      ? '4 sets x 5-6 reps'
      : profile.goal === 'Weight Loss'
      ? '3 sets x 15 reps'
      : '3 sets x 10-12 reps';

  // Sunday = Active Recovery
  if (dayIndex === 0) {
    return {
      title: 'Active Recovery & Mobility',
      exercises: [
        { name: 'Brisk Walk / Light Cycling', sets: '25 mins', completed: false },
        { name: 'Full-Body Dynamic Stretching', sets: '15 mins', completed: false },
        { name: 'Core Planks', sets: '3 sets x 45 sec', completed: false },
      ],
    };
  }

  // Push / Pull / Legs rotation across Mon-Sat
  const splitType = dayIndex % 3; // 1 = Push, 2 = Pull, 0 (Sat) = Legs

  if (splitType === 1) {
    return {
      title: isGym ? 'Push Day (Chest, Shoulders, Triceps)' : 'Home Push & Core',
      exercises: isGym
        ? [
            { name: 'Flat Barbell / Dumbbell Bench Press', sets: repScheme, completed: false },
            { name: 'Incline Dumbbell Press', sets: repScheme, completed: false },
            { name: 'Overhead Shoulder Press', sets: repScheme, completed: false },
            { name: 'Cable / Dumbbell Lateral Raises', sets: '3 sets x 15 reps', completed: false },
            { name: 'Tricep Rope Pushdowns', sets: repScheme, completed: false },
          ]
        : [
            { name: 'Standard / Decline Push-ups', sets: repScheme, completed: false },
            { name: hasDumbbells ? 'Dumbbell Floor Press' : 'Diamond Push-ups', sets: repScheme, completed: false },
            { name: hasDumbbells ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: repScheme, completed: false },
            { name: 'Chair Tricep Dips', sets: '3 sets x 12-15 reps', completed: false },
          ],
    };
  }

  if (splitType === 2) {
    return {
      title: isGym ? 'Pull Day (Back & Biceps)' : 'Home Back & Biceps',
      exercises: isGym
        ? [
            { name: 'Lat Pulldowns / Pull-ups', sets: repScheme, completed: false },
            { name: 'Seated Cable / Barbell Rows', sets: repScheme, completed: false },
            { name: 'Face Pulls', sets: '3 sets x 15 reps', completed: false },
            { name: 'Dumbbell / EZ-Bar Bicep Curls', sets: repScheme, completed: false },
            { name: 'Hammer Curls', sets: '3 sets x 12 reps', completed: false },
          ]
        : [
            { name: 'Pull-ups / Doorframe Rows', sets: repScheme, completed: false },
            { name: hasDumbbells ? 'Bent-Over Dumbbell Rows' : 'Superman Back Extensions', sets: repScheme, completed: false },
            { name: hasDumbbells ? 'Dumbbell Bicep Curls' : 'Towel Isometric Curls', sets: repScheme, completed: false },
            { name: 'Plank Shoulder Taps', sets: '3 sets x 20 taps', completed: false },
          ],
    };
  }

  return {
    title: isGym ? 'Leg Day (Quads, Hamstrings, Calves)' : 'Home Lower Body Conditioning',
    exercises: isGym
      ? [
          { name: 'Barbell Back Squats / Leg Press', sets: repScheme, completed: false },
          { name: 'Romanian Deadlifts', sets: repScheme, completed: false },
          { name: 'Walking Lunges', sets: '3 sets x 12/leg', completed: false },
          { name: 'Leg Curls', sets: repScheme, completed: false },
          { name: 'Standing Calf Raises', sets: '4 sets x 15 reps', completed: false },
        ]
      : [
          { name: hasDumbbells ? 'Dumbbell Goblet Squats' : 'Bodyweight Jump Squats', sets: repScheme, completed: false },
          { name: 'Bulgarian Split Squats', sets: '3 sets x 10/leg', completed: false },
          { name: 'Glute Bridges', sets: '3 sets x 15 reps', completed: false },
          { name: 'Single-Leg Calf Raises', sets: '3 sets x 15/leg', completed: false },
        ],
  };
};

// Produces personalized recommendations from BMI, goal, diet, and INR budget
export const generateRecommendations = (profile, metrics, todayTotals) => {
  const recs = [];

  if (metrics.bmiCategory === 'Underweight') {
    recs.push('Prioritize calorie-dense whole foods (oats, peanut butter, bananas, paneer/eggs) to sustain your surplus.');
  } else if (metrics.bmiCategory === 'Overweight' || metrics.bmiCategory === 'Obese') {
    recs.push('Keep a consistent 400-500 kcal deficit and add 8,000+ daily steps alongside resistance training.');
  }

  if (profile.dietaryPreference === 'Vegetarian' && profile.dailyFoodBudget <= 200) {
    recs.push(`To hit ${metrics.dailyProtein}g protein under ₹${profile.dailyFoodBudget}/day, rely on soya chunks, roasted chana, low-fat paneer, and curd.`);
  } else if (profile.dietaryPreference === 'Non-vegetarian') {
    recs.push(`Whole eggs, chicken breast, and soya chunks give you the highest protein-per-rupee ratio within ₹${profile.dailyFoodBudget}/day.`);
  }

  const remainingProtein = metrics.dailyProtein - (todayTotals?.proteinConsumed || 0);
  if (remainingProtein > 0) {
    recs.push(`You still need ${remainingProtein}g of protein today—spread it across 20-30g servings per meal for optimal synthesis.`);
  } else {
    recs.push('Daily protein target achieved! Focus on hydration (3-3.5L water) and 7-8 hours of sleep for recovery.');
  }

  return recs;
};