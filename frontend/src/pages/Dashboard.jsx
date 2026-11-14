import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Dashboard() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [todayLog, setTodayLog] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick meal logger state
  const [mealForm, setMealForm] = useState({
    name: '',
    calories: '',
    protein: '',
    cost: '',
  });
  const [loggingMeal, setLoggingMeal] = useState(false);

  // Quick weight logger state
  const [weightInput, setWeightInput] = useState(user?.profile?.weight || '');
  const [updatingWeight, setUpdatingWeight] = useState(false);



  const metrics = user?.fitnessMetrics || {};
  const profile = user?.profile || {};

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await API.get('/dashboard');
        setTodayLog(data.todayLog);
        setAnalytics(data.analytics || []);
        setRecommendations(data.recommendations || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleToggleExercise = async (exerciseId) => {
    try {
      const { data } = await API.patch(`/dashboard/workout/${exerciseId}`);
      setTodayLog(data.todayLog);

      // Sync today's workout completion bar in analytics
      const total = data.todayLog.exercises.length || 1;
      const done = data.todayLog.exercises.filter((ex) => ex.completed).length;
      const pct = Math.round((done / total) * 100);
      const todayShort = data.todayLog.date.slice(5);

      setAnalytics((prev) =>
        prev.map((item) =>
          item.date === todayShort ? { ...item, workoutCompletion: pct } : item
        )
      );
    } catch {
      setError('Could not update exercise status.');
    }
  };

  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealForm.name || !mealForm.calories || !mealForm.protein) return;

    setLoggingMeal(true);
    setError('');
    try {
      const { data } = await API.post('/dashboard/meals', mealForm);
      setTodayLog(data.todayLog);
      if (data.recommendations) setRecommendations(data.recommendations);
      setMealForm({ name: '', calories: '', protein: '', cost: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log meal.');
    } finally {
      setLoggingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    setError('');
    try {
      const { data } = await API.delete(`/dashboard/meals/${mealId}`);
      setTodayLog(data.todayLog);
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete meal entry.');
    }
  };

  const handleWeightUpdate = async (e) => {
    e.preventDefault();
    if (!weightInput) return;

    setUpdatingWeight(true);
    setError('');
    try {
      const { data } = await API.patch('/dashboard/weight', {
        weight: Number(weightInput),
      });

      if (typeof setUser === 'function') {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                profile: { ...(prev.profile || {}), weight: data.weight },
                fitnessMetrics: data.fitnessMetrics,
              }
            : prev
        );
      } else {
        console.warn('setUser is not available on AuthContext:', { user, setUser });
      }

      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Actual catch error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to update weight.'
      );
    } finally {
      setUpdatingWeight(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Progress bar percentage calculations
  const calConsumed = todayLog?.totals?.caloriesConsumed || 0;
  const calTarget = metrics.dailyCalories || 2000;
  const calPct = Math.min(100, Math.round((calConsumed / calTarget) * 100));

  const proConsumed = todayLog?.totals?.proteinConsumed || 0;
  const proTarget = metrics.dailyProtein || 120;
  const proPct = Math.min(100, Math.round((proConsumed / proTarget) * 100));

  const budgetSpent = todayLog?.totals?.budgetSpent || 0;
  const budgetLimit = profile.dailyFoodBudget || 250;
  const budgetPct = Math.min(100, Math.round((budgetSpent / budgetLimit) * 100));

  const completedExercises =
    todayLog?.exercises?.filter((ex) => ex.completed).length || 0;
  const totalExercises = todayLog?.exercises?.length || 0;


  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-500 font-semibold tracking-wider animate-pulse">
          LOADING FITCLUSTER COMMAND CENTER...
        </div>
      </div>
    );
  }


 return (
    <div className="min-h-screen bg-black text-white px-4 py-8 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-red-500">
              FITCLUSTER COMMAND CENTER
            </span>
            <h1 className="text-3xl font-bold mt-1">Welcome, {user?.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/onboarding')}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm text-neutral-300 transition"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-600 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* PROFILE & ACTIVE GOAL BANNER */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-600 text-red-400 text-xs font-bold uppercase">
              {profile.goal}
            </span>
            <span className="text-sm text-neutral-400">
              {profile.workoutPreference} • {profile.experience} •{' '}
              {profile.dietaryPreference} • {profile.height} cm / {profile.weight} kg
            </span>
          </div>
          <div className="text-sm text-neutral-300">
            Daily Food Budget:{' '}
            <span className="font-bold text-red-500">₹{budgetLimit}</span>
          </div>
        </div>

        {/* CALCULATED FITNESS METRICS (5 CARDS) */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <p className="text-xs uppercase tracking-wider text-neutral-400">BMI</p>
              <p className="text-3xl font-extrabold mt-2">{metrics.bmi ?? '--'}</p>
              <span className="inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-900 text-red-400 border border-neutral-800">
                {metrics.bmiCategory || 'N/A'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <p className="text-xs uppercase tracking-wider text-neutral-400">BMR</p>
              <p className="text-3xl font-extrabold mt-2">
                {metrics.bmr ?? '--'}
                <span className="text-sm font-normal text-neutral-400 ml-1">kcal</span>
              </p>
              <p className="mt-2 text-xs text-neutral-500">Resting burn rate</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <p className="text-xs uppercase tracking-wider text-neutral-400">TDEE</p>
              <p className="text-3xl font-extrabold mt-2">
                {metrics.tdee ?? '--'}
                <span className="text-sm font-normal text-neutral-400 ml-1">kcal</span>
              </p>
              <p className="mt-2 text-xs text-neutral-500">Maintenance calories</p>
            </div>

            <div className="p-5 rounded-2xl bg-linear-to-b from-red-950/40 to-neutral-950 border border-red-600/70">
              <p className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                Calorie Target
              </p>
              <p className="text-3xl font-extrabold mt-2">
                {metrics.dailyCalories ?? '--'}
                <span className="text-sm font-normal text-neutral-300 ml-1">kcal</span>
              </p>
              <p className="mt-2 text-xs text-neutral-400">Goal adjusted</p>
            </div>

            <div className="p-5 rounded-2xl bg-linear-to-b from-red-950/40 to-neutral-950 border border-red-600/70">
              <p className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                Protein Target
              </p>
              <p className="text-3xl font-extrabold mt-2">
                {metrics.dailyProtein ?? '--'}
                <span className="text-sm font-normal text-neutral-300 ml-1">g</span>
              </p>
              <p className="mt-2 text-xs text-neutral-400">Daily minimum</p>
            </div>
          </div>
        </section>

        {/* MAIN COMMAND GRID: WORKOUT + NUTRITION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TODAY'S WORKOUT SCHEDULE (7 cols) */}
          <section className="lg:col-span-7 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-red-500 font-bold">
                    Today&apos;s Workout
                  </span>
                  <h2 className="text-xl font-bold mt-0.5">
                    {todayLog?.workoutTitle || 'Rest Day'}
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300">
                  {completedExercises}/{totalExercises} Done
                </span>
              </div>

              <div className="space-y-2.5 mt-4">
                {todayLog?.exercises?.map((exercise) => (
                  <div
                    key={exercise._id}
                    onClick={() => handleToggleExercise(exercise._id)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      exercise.completed
                        ? 'bg-red-950/20 border-red-600/40 text-neutral-400'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={exercise.completed}
                        onChange={() => {}}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                      <span
                        className={`font-medium text-sm ${
                          exercise.completed ? 'line-through text-neutral-500' : ''
                        }`}
                      >
                        {exercise.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-red-400 bg-black/60 px-2.5 py-1 rounded">
                      {exercise.sets}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-5 text-xs text-neutral-500">
              Click any exercise to mark it complete and update your adherence score.
            </p>
          </section>

          {/* DAILY NUTRITION PROGRESS & QUICK LOG (5 cols) */}
          <section className="lg:col-span-5 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-red-500 font-bold">
                Daily Nutrition Progress
              </span>
              <h2 className="text-xl font-bold mt-0.5">Intake & Budget</h2>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-300 font-medium">Calories</span>
                  <span className="text-neutral-400">
                    <strong className="text-white">{calConsumed}</strong> / {calTarget} kcal
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-300 font-medium">Protein</span>
                  <span className="text-neutral-400">
                    <strong className="text-white">{proConsumed}g</strong> / {proTarget}g
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${proPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-300 font-medium">Budget Used</span>
                  <span className="text-neutral-400">
                    <strong className="text-white">₹{budgetSpent}</strong> / ₹{budgetLimit}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      budgetSpent > budgetLimit ? 'bg-amber-500' : 'bg-neutral-400'
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Meal Log Form */}
            <form onSubmit={handleLogMeal} className="pt-4 border-t border-neutral-900 space-y-3">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Quick Log Meal
              </p>
              <input
                type="text"
                placeholder="Meal name (e.g., 100g Soya Chunks + Rice)"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="kcal"
                  value={mealForm.calories}
                  onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                />
                <input
                  type="number"
                  placeholder="Protein (g)"
                  value={mealForm.protein}
                  onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                />
                <input
                  type="number"
                  placeholder="Cost (₹)"
                  value={mealForm.cost}
                  onChange={(e) => setMealForm({ ...mealForm, cost: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>
              <button
                type="submit"
                disabled={loggingMeal}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {loggingMeal ? 'Adding...' : '+ Log Meal'}
              </button>
            </form>

           
           {/* Recent Logged Meals List */}
            {todayLog?.meals?.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {todayLog.meals.map((meal) => (
                  <div
                    key={meal._id}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-neutral-900/60 border border-neutral-900 text-neutral-300"
                  >
                    <span className="truncate max-w-[48%]">{meal.name}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-neutral-400">
                        {meal.calories} kcal •{' '}
                        <strong className="text-red-400">{meal.protein}g</strong> • ₹
                        {meal.cost}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal._id)}
                        title="Remove entry"
                        className="text-neutral-500 hover:text-red-500 font-bold text-sm leading-none transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* BOTTOM ROW: ANALYTICS + RECOMMENDATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FITNESS PROGRESS & ANALYTICS (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-red-500 font-bold">
                    Fitness Analytics
                  </span>
                  <h2 className="text-xl font-bold mt-0.5">7-Day Workout Consistency</h2>
                </div>
                <span className="text-xs text-neutral-400">
                  Current Weight: <strong className="text-white">{profile.weight} kg</strong>
                </span>
              </div>

              {/* 7-Day Bar Chart */}
              <div className="h-40 flex items-end gap-3 pt-6 pb-2 px-2 bg-neutral-900/40 rounded-xl border border-neutral-900">
                {analytics.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {day.workoutCompletion}%
                    </span>
                    <div className="w-full h-24 bg-neutral-900 rounded-md flex items-end overflow-hidden">
                      <div
                        className="w-full bg-red-600 rounded-md transition-all duration-300"
                        style={{ height: `${Math.max(8, day.workoutCompletion)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-neutral-400">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Weight Check-in */}
            <form
              onSubmit={handleWeightUpdate}
              className="mt-5 pt-4 border-t border-neutral-900 flex items-center gap-3"
            >
              <label className="text-xs uppercase tracking-wider text-neutral-400 whitespace-nowrap">
                Log Today&apos;s Weight (kg):
              </label>
              <input
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-600"
              />
              <button
                type="submit"
                disabled={updatingWeight}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-600 text-xs font-semibold text-white transition"
              >
                {updatingWeight ? 'Saving...' : 'Update'}
              </button>
            </form>
          </section>

          {/* IMPORTANT RECOMMENDATIONS (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-2xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs uppercase tracking-wider text-red-500 font-bold">
              Actionable Insights
            </span>
            <h2 className="text-xl font-bold mt-0.5 mb-4">
              Important Recommendations
            </h2>

            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-neutral-900/70 border-l-4 border-red-600 text-sm text-neutral-200 leading-relaxed"
                >
                  {rec}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}