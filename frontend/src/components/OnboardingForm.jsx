// Collects and updates the user's biometrics (age, gender, height, weight), activity level, training experience, diet type, fitness goal, and daily food budget via


import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/axios.js';

export default function OnboardingForm({ token, onProfileSaved }) {
  const [form, setForm] = useState({
    age: 26,
    gender: 'male',
    heightCm: 175,
    weightKg: 74,
    activityLevel: 'moderate',
    workoutExperience: 'beginner',
    dietaryPreference: 'omnivore',
    fitnessGoal: 'general_fitness',
    dailyFoodBudget: 15,
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest('/onboarding/profile', { token })
      .then((data) => {
        if (data.profile && data.profile.age) {
          setForm((prev) => ({ ...prev, ...data.profile }));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const data = await apiRequest('/onboarding/profile', {
        method: 'PUT',
        body: form,
        token,
      });
      setStatus({ type: 'success', message: 'Profile updated successfully.' });
      if (onProfileSaved) onProfileSaved(data.profile);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
      <h2 className="text-xl font-bold">User Onboarding & Biometric Profile</h2>
      <p className="text-sm text-slate-400 mt-1 mb-6">
        Complete your physical metrics, training background, dietary preferences, and daily food budget.
      </p>

      {status.message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            status.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Age (years)</label>
          <input
            type="number"
            min={13}
            max={110}
            required
            value={form.age}
            onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
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
            min={100}
            max={250}
            required
            value={form.heightCm}
            onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Weight (kg)</label>
          <input
            type="number"
            min={30}
            max={300}
            required
            value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Activity Level</label>
          <select
            value={form.activityLevel}
            onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="sedentary">Sedentary (Little/no exercise)</option>
            <option value="light">Light (1–3 days/week)</option>
            <option value="moderate">Moderate (3–5 days/week)</option>
            <option value="active">Active (6–7 days/week)</option>
            <option value="very_active">Very Active (Athlete / Physical job)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Workout Experience</label>
          <select
            value={form.workoutExperience}
            onChange={(e) => setForm({ ...form, workoutExperience: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="professional">Professional</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Dietary Preference</label>
          <select
            value={form.dietaryPreference}
            onChange={(e) => setForm({ ...form, dietaryPreference: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="omnivore">Omnivore</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="eggetarian">Eggetarian</option>
            <option value="vegan">Vegan</option>
            <option value="keto">Keto</option>
            <option value="pescatarian">Pescatarian</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 mb-1">Fitness Goal</label>
          <select
            value={form.fitnessGoal}
            onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="strength_building">Strength Building</option>
            <option value="general_fitness">General Fitness</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs uppercase text-slate-400 mb-1">
            Daily Food Budget ($ USD)
          </label>
          <input
            type="number"
            min={1}
            step="0.5"
            required
            value={form.dailyFoodBudget}
            onChange={(e) => setForm({ ...form, dailyFoodBudget: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="md:col-span-2 mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition"
        >
          {saving ? 'Saving Profile...' : 'Save Profile & Go to Dashboard'}
        </button>
      </form>
    </div>
  );
}