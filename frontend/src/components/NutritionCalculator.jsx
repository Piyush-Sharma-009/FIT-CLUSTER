// Feature 3 — BMI, BMR, TDEE & Nutritional Calculator): Sends biometric inputs to /api/calculator/compute so users can calculate or simulate their BMI, Basal Metabolic Rate, Total Daily Energy Expenditure, and daily protein/carb/fat targets.
import { useState } from 'react';
import API from '../api/axios';

export default function NutritionCalculator({ initialValues }) {
  const [inputs, setInputs] = useState({
    age: initialValues?.age || 28,
    gender: initialValues?.gender || 'male',
    heightCm: initialValues?.heightCm || 178,
    weightKg: initialValues?.weightKg || 76,
    activityLevel: initialValues?.activityLevel || 'moderate',
    fitnessGoal: initialValues?.fitnessGoal || 'muscle_gain',
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await API.post('/calculator/compute', inputs);
      setResults(data.results);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to calculate nutrition targets.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
      <h2 className="text-xl font-bold">BMI, BMR, TDEE & Nutritional Requirement Calculator</h2>
      <p className="text-sm text-slate-400 mt-1 mb-6">
        Simulate different biometric values or goals to compute exact calorie and protein targets.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Age</label>
          <input
            type="number"
            required
            value={inputs.age}
            onChange={(e) => setInputs({ ...inputs, age: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Gender</label>
          <select
            value={inputs.gender}
            onChange={(e) => setInputs({ ...inputs, gender: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Height (cm)</label>
          <input
            type="number"
            required
            value={inputs.heightCm}
            onChange={(e) => setInputs({ ...inputs, heightCm: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Weight (kg)</label>
          <input
            type="number"
            required
            value={inputs.weightKg}
            onChange={(e) => setInputs({ ...inputs, weightKg: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Activity Level</label>
          <select
            value={inputs.activityLevel}
            onChange={(e) => setInputs({ ...inputs, activityLevel: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very Active</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Fitness Goal</label>
          <select
            value={inputs.fitnessGoal}
            onChange={(e) => setInputs({ ...inputs, fitnessGoal: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="strength_building">Strength Building</option>
            <option value="general_fitness">General Fitness</option>
          </select>
        </div>

        <button
          type="submit"
          className="sm:col-span-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition"
        >
          Compute Biometrics & Nutritional Targets
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <ResultBox label="BMI" value={`${results.bmi} (${results.bmiCategory})`} />
          <ResultBox label="BMR" value={`${results.bmr} kcal/day`} />
          <ResultBox label="TDEE" value={`${results.tdee} kcal/day`} />
          <ResultBox
            label="Daily Calorie Target"
            value={`${results.dailyCalories} kcal`}
            accent="text-emerald-400"
          />
          <ResultBox
            label="Protein Target"
            value={`${results.proteinTargetGrams} g`}
            accent="text-sky-400"
          />
          <ResultBox label="Carbs Target" value={`${results.carbsTargetGrams} g`} />
          <ResultBox label="Fat Target" value={`${results.fatTargetGrams} g`} />
        </div>
      )}
    </div>
  );
}

function ResultBox({ label, value, accent = 'text-white' }) {
  return (
    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}