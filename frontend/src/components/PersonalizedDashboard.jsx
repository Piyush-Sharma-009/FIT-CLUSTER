// Feature 4 — Personalized Dashboard): Fetches /api/dashboard to display the user's profile summary, fitness goals, calorie/macro targets, live daily progress bars (with quick-log buttons via PATCH /api/dashboard/progress), weekly workout schedule, and personalized health recommendations.


import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../api/axios.js';

export default function PersonalizedDashboard({ token, onEditProfile }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiRequest('/dashboard', { token });
      setDashboard(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogProgress = async (payload) => {
    await apiRequest('/dashboard/progress', {
      method: 'PATCH',
      body: payload,
      token,
    });
    loadDashboard();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading your dashboard...</div>;
  }

  if (!dashboard) return null;

  const { user, targets, workoutSchedule, dailyProgress, recommendations } = dashboard;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. User Profile & Fitness Goals Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 capitalize">
              Goal: {user.profile.fitnessGoal.replace('_', ' ')}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 capitalize">
              Level: {user.profile.workoutExperience}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 capitalize">
              Diet: {user.profile.dietaryPreference}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300">
              Budget: ${user.profile.dailyFoodBudget}/day
            </span>
          </div>
        </div>

        <button
          onClick={onEditProfile}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition"
        >
          Edit Profile
        </button>
      </div>

      {/* 2. Nutritional & Biometric Targets */}
      {targets ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="BMI" value={`${targets.bmi} (${targets.bmiCategory})`} />
          <StatCard label="BMR / TDEE" value={`${targets.bmr} / ${targets.tdee}`} />
          <StatCard label="Calorie Target" value={`${targets.dailyCalories} kcal`} />
          <StatCard label="Protein Target" value={`${targets.proteinTargetGrams} g`} />
          <StatCard
            label="Carbs / Fats"
            value={`${targets.carbsTargetGrams}g / ${targets.fatTargetGrams}g`}
          />
        </div>
      ) : (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-sm">
          Complete your biometric onboarding profile to generate personalized calorie and macro targets.
        </div>
      )}

      {/* 3. Daily Progress & Quick Actions */}
      {targets && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Daily Progress</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLogProgress({ calories: 500, protein: 35 })}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium"
              >
                + Log Meal (500 kcal / 35g P)
              </button>
              <button
                onClick={() => handleLogProgress({ water: 0.5 })}
                className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium"
              >
                + 0.5L Water
              </button>
              <button
                onClick={() => handleLogProgress({ workoutDone: true })}
                className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium"
              >
                + Complete Workout ({dailyProgress.workoutsCompletedThisWeek} this week)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProgressBar
              label="Calories Consumed"
              current={dailyProgress.caloriesConsumed}
              target={targets.dailyCalories}
              unit="kcal"
            />
            <ProgressBar
              label="Protein Consumed"
              current={dailyProgress.proteinConsumed}
              target={targets.proteinTargetGrams}
              unit="g"
            />
            <ProgressBar
              label="Water Intake"
              current={dailyProgress.waterLiters}
              target={3.0}
              unit="L"
            />
          </div>
        </div>
      )}

      {/* 4. Workout Schedule & Important Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Workout Schedule</h2>
          <ul className="space-y-2.5">
            {workoutSchedule.map((item) => (
              <li
                key={item.day}
                className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm"
              >
                <span className="font-semibold text-emerald-400">{item.day}</span>
                <span className="text-slate-200">{item.workout}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Important Recommendations</h2>
          <ul className="space-y-2.5">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-lg font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function ProgressBar({ label, current, target, unit }) {
  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-200">
          {current} / {target} {unit} ({pct}%)
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}