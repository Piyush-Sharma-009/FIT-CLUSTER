import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const STATUS_STYLES = {
  pending: 'bg-neutral-900 text-neutral-400 border-neutral-800',
  completed: 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60',
  missed: 'bg-red-950/80 text-red-400 border-red-700/60',
  rescheduled: 'bg-amber-950/70 text-amber-400 border-amber-700/60',
  adapted: 'bg-red-600/20 text-red-300 border-red-500/60',
};

export default function WorkoutPlan() {
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [todayIndex, setTodayIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [source, setSource] = useState('');
  const [autoRescheduledBanner, setAutoRescheduledBanner] = useState(false);

  const [liftInputs, setLiftInputs] = useState({});

  const [loading, setLoading] = useState(true);
  const [adapting, setAdapting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [savedLogId, setSavedLogId] = useState(null);
  const [error, setError] = useState('');

  // Morning Bio-Feedback Form State
  const [sleepHours, setSleepHours] = useState('7.5');
  const [energyLevel, setEnergyLevel] = useState(7);
  const [mood, setMood] = useState('Normal');

  // Built-in Rest Countdown Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const fetchWeeklyPlan = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      const url = regenerate ? '/workouts/weekly?regenerate=true' : '/workouts/weekly';
      const { data } = await API.get(url);
      setPlan(data.plan);
      setTodayIndex(data.todayIndex ?? 0);
      setSelectedDayIndex(data.todayIndex ?? 0);
      setSource(data.source || '');
      if (data.autoRescheduled) {
        setAutoRescheduledBanner(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load weekly workout plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyPlan(false);
  }, []);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      setTimerActive(false);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startRestTimer = (seconds) => {
    setTimeLeft(seconds);
    setTimerActive(true);
  };

  const handleAdaptToday = async (e) => {
    e.preventDefault();
    setAdapting(true);
    setError('');
    try {
      const { data } = await API.post('/workouts/adapt-today', {
        sleepHours: Number(sleepHours),
        energyLevel: Number(energyLevel),
        mood,
      });
      setPlan(data.plan);
      setSelectedDayIndex(data.todayIndex);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adapt today’s workout.');
    } finally {
      setAdapting(false);
    }
  };

  const handleManualReschedule = async () => {
    setRescheduling(true);
    setError('');
    try {
      const { data } = await API.post('/workouts/reschedule', {
        fromDayIndex: todayIndex,
      });
      setPlan(data.plan);
      if (data.rescheduled) {
        setAutoRescheduledBanner(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rebalance remaining week.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleLiftInputChange = (exerciseId, field, value) => {
    setLiftInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveExerciseLog = async (ex, toggleCheck = false) => {
    setTogglingId(ex._id);
    setError('');
    const currentInput = liftInputs[ex._id] || {};
    const weightVal =
      currentInput.weightKg !== undefined
        ? currentInput.weightKg
        : ex.loggedWeightKg ?? ex.recommendedWeightKg ?? '';
    const repsVal =
      currentInput.repsCompleted !== undefined
        ? currentInput.repsCompleted
        : ex.loggedReps ?? '';

    try {
      const { data } = await API.patch('/workouts/toggle-exercise', {
        dayIndex: selectedDayIndex,
        exerciseId: ex._id,
        weightKg: weightVal,
        repsCompleted: repsVal,
        logOnly: !toggleCheck,
      });
      setPlan(data.plan);

      if (!toggleCheck) {
        setSavedLogId(ex._id);
        setTimeout(() => setSavedLogId(null), 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exercise log.');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-500 font-semibold tracking-widest uppercase animate-pulse">
          COMPUTING ADAPTIVE WORKOUT ROADMAP...
        </div>
      </div>
    );
  }

  const activeDay = plan?.days?.[selectedDayIndex];
  const todayPlan = plan?.days?.[todayIndex];

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold tracking-widest uppercase text-red-500">
                ADAPTIVE ML TRAINING ENGINE
              </span>
              {source && (
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                  {source}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold mt-1">
              {plan?.predictedSplit || 'Weekly Workout Roadmap'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Week starting <strong className="text-neutral-200">{plan?.weekStartDate}</strong> •
              Baseline: <strong className="text-red-400">{plan?.baseRepScheme}</strong> • Rest:{' '}
              <strong className="text-neutral-200">{plan?.baseRestSeconds}s</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleManualReschedule}
              disabled={rescheduling}
              className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-red-600/50 text-xs font-semibold text-red-400 transition disabled:opacity-50"
            >
              {rescheduling ? 'Rebalancing...' : 'Re-Optimize Remaining Week'}
            </button>
            <button
              onClick={() => fetchWeeklyPlan(true)}
              className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 transition"
            >
              Reset Week
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition"
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Alerts & Auto-Reschedule Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-600 text-red-300 text-sm">
            {error}
          </div>
        )}

        {autoRescheduledBanner && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/60 flex items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-amber-200">
              <strong className="text-amber-400 uppercase tracking-wider mr-2">
                Schedule Rebalanced:
              </strong>
              Missed workout volume from earlier this week has been redistributed across your remaining days to preserve weekly muscle stimulus.
            </div>
            <button
              onClick={() => setAutoRescheduledBanner(false)}
              className="text-amber-400 hover:text-white text-sm font-bold px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Row 1: Daily Bio-Feedback Readiness Check-In + Rest Timer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleAdaptToday}
            className="lg:col-span-2 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  DAILY BIO-FEEDBACK CHECK-IN
                </span>
                <h2 className="text-lg font-bold mt-0.5">
                  Auto-Tune Today’s Volume ({todayPlan?.dayName})
                </h2>
              </div>

              {todayPlan?.readinessScore !== null && todayPlan?.readinessScore !== undefined && (
                <div className="px-3.5 py-1.5 rounded-xl bg-black border border-red-600/60 text-right">
                  <span className="text-[10px] uppercase text-neutral-400 block">
                    ML Readiness Score
                  </span>
                  <span className="text-lg font-extrabold text-red-500">
                    {todayPlan.readinessScore} / 100
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label
                  htmlFor="sleepHours"
                  className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5"
                >
                  Last Night Sleep (hrs)
                </label>
                <input
                  id="sleepHours"
                  name="sleepHours"
                  type="number"
                  step="0.5"
                  min="2"
                  max="14"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-sm text-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="energyLevel"
                  className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5"
                >
                  Energy Level: <strong className="text-red-400">{energyLevel}/10</strong>
                </label>
                <input
                  id="energyLevel"
                  name="energyLevel"
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full accent-red-600 mt-2.5 cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="mood"
                  className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5"
                >
                  Current Mood / Recovery
                </label>
                <select
                  id="mood"
                  name="mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-sm text-white focus:border-red-600 focus:outline-none"
                >
                  <option value="Energized">Energized</option>
                  <option value="Normal">Normal</option>
                  <option value="Stressed">Stressed</option>
                  <option value="Fatigued">Fatigued</option>
                  <option value="Sore">Sore</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-neutral-400">
                {todayPlan?.adaptationNote ||
                  'Log sleep, energy, and mood to scale sets & rest dynamically.'}
              </p>
              <button
                type="submit"
                disabled={adapting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold uppercase tracking-wider text-white transition whitespace-nowrap disabled:opacity-50"
              >
                {adapting ? 'Adapting...' : 'Adapt Today’s Session'}
              </button>
            </div>
          </form>

          {/* Built-in Rest Countdown Card */}
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                INTRA-SET RECOVERY
              </span>
              <h2 className="text-lg font-bold mt-0.5">Rest Timer</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Tap any exercise’s rest badge or start your default interval below.
              </p>
            </div>

            <div className="my-4 py-4 rounded-xl bg-black border border-neutral-900 text-center">
              <span className="text-4xl font-mono font-extrabold text-white">
                {timerActive ? `${timeLeft}s` : `${plan?.baseRestSeconds || 60}s`}
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-neutral-500 mt-1">
                {timerActive ? 'Resting — Next Set Ready Soon' : 'Ready'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startRestTimer(plan?.baseRestSeconds || 60)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition"
              >
                Start ({plan?.baseRestSeconds || 60}s)
              </button>
              {timerActive && (
                <button
                  type="button"
                  onClick={() => setTimerActive(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: 7-Day Interactive Day Selector */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {plan?.days?.map((day, idx) => {
              const isSelected = selectedDayIndex === idx;
              const isToday = todayIndex === idx;
              return (
                <button
                  key={day.dayName}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-red-600/15 border-red-600 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white">
                      {day.dayName.slice(0, 3)}
                    </span>
                    {isToday && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-red-600 text-white font-bold">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-1">{day.focus}</p>
                  <span
                    className={`inline-block mt-2 text-[10px] uppercase px-2 py-0.5 rounded border ${
                      STATUS_STYLES[day.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {day.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Exercise List */}
          {activeDay && (
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-red-500 font-bold">
                      {activeDay.dayName} ({activeDay.date})
                    </span>
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                        STATUS_STYLES[activeDay.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {activeDay.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mt-1">{activeDay.focus}</h2>
                  {activeDay.adaptationNote && (
                    <p className="text-xs text-red-300 mt-1">{activeDay.adaptationNote}</p>
                  )}
                </div>

                {activeDay.exercises?.length > 0 && (
                  <div className="text-xs text-neutral-400">
                    Completed:{' '}
                    <strong className="text-white">
                      {activeDay.exercises.filter((e) => e.completed).length} /{' '}
                      {activeDay.exercises.length}
                    </strong>
                  </div>
                )}
              </div>

              {activeDay.isRestDay || !activeDay.exercises?.length ? (
                <div className="p-6 rounded-xl bg-black/60 border border-neutral-900 text-sm text-neutral-400">
                  Recovery & mobility day — focus on hydration, protein intake, and 7–8 hours of quality sleep.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDay.exercises.map((ex) => {
                    const inputState = liftInputs[ex._id] || {};
                    const displayWeight =
                      inputState.weightKg !== undefined
                        ? inputState.weightKg
                        : ex.loggedWeightKg ?? ex.recommendedWeightKg ?? '';
                    const displayReps =
                      inputState.repsCompleted !== undefined
                        ? inputState.repsCompleted
                        : ex.loggedReps ?? '';

                    return (
                      <div
                        key={ex._id}
                        className={`p-4 rounded-xl border space-y-3 transition ${
                          ex.completed
                            ? 'bg-neutral-900/30 border-neutral-900 opacity-75'
                            : 'bg-neutral-900/80 border-neutral-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <label className="flex items-start gap-3.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ex.completed}
                              disabled={togglingId === ex._id}
                              onChange={() => handleSaveExerciseLog(ex, true)}
                              className="mt-1 h-4 w-4 accent-red-600 rounded cursor-pointer"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`font-semibold ${
                                    ex.completed ? 'line-through text-neutral-500' : 'text-white'
                                  }`}
                                >
                                  {ex.name}
                                </h3>
                                {ex.recommendedWeightKg && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-600/20 border border-red-600/50 text-red-300">
                                    Target: {ex.recommendedWeightKg} kg
                                  </span>
                                )}
                                {ex.similarityScore !== null &&
                                  ex.similarityScore !== undefined && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                                      Match: {Math.round(ex.similarityScore * 100)}%
                                    </span>
                                  )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                Target: <span className="text-neutral-300">{ex.muscleGroup}</span> •
                                Gear: <span className="text-neutral-300">{ex.equipment}</span>
                              </p>
                              {ex.progressionNote && (
                                <p className="text-[11px] text-amber-400/90 mt-1">
                                  {ex.progressionNote}
                                </p>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-2.5 self-end sm:self-center">
                            <span className="text-xs font-mono text-red-400 bg-black px-3 py-1.5 rounded-lg border border-neutral-800">
                              {ex.sets} sets × {ex.reps}
                            </span>
                            <button
                              type="button"
                              onClick={() => startRestTimer(ex.restSeconds)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white transition"
                            >
                              Rest {ex.restSeconds}s
                            </button>
                          </div>
                        </div>

                        {/* Progressive Overload Performance Logger */}
                        {ex.equipment !== 'Bodyweight Only' && (
                          <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-neutral-500">
                              Log set performance for next week’s ML load prediction:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="1.25"
                                min="0"
                                placeholder="kg"
                                value={displayWeight}
                                onChange={(e) =>
                                  handleLiftInputChange(ex._id, 'weightKg', e.target.value)
                                }
                                className="w-20 px-2.5 py-1 rounded bg-black border border-neutral-800 text-white focus:border-red-600 focus:outline-none"
                              />
                              <span className="text-neutral-500">kg ×</span>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                placeholder="reps"
                                value={displayReps}
                                onChange={(e) =>
                                  handleLiftInputChange(ex._id, 'repsCompleted', e.target.value)
                                }
                                className="w-16 px-2.5 py-1 rounded bg-black border border-neutral-800 text-white focus:border-red-600 focus:outline-none"
                              />
                              <span className="text-neutral-500">reps</span>
                              <button
                                type="button"
                                disabled={togglingId === ex._id}
                                onClick={() => handleSaveExerciseLog(ex, false)}
                                className={`px-2.5 py-1 rounded font-semibold transition ${
                                  savedLogId === ex._id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white'
                                }`}
                              >
                                {savedLogId === ex._id ? '✓ Saved' : 'Save Log'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 3: Smart Equipment Upgrade Suggestions */}
        {plan?.suggestedEquipment?.length > 0 && (
          <section className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                EQUIPMENT GAP ANALYZER
              </span>
              <h2 className="text-xl font-bold mt-0.5">
                Recommended Gear Upgrades for Your Setup
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.suggestedEquipment.map((eq, idx) => (
                <div
                  key={`${eq.item}-${idx}`}
                  className="p-4 rounded-xl bg-black border border-neutral-800 space-y-2"
                >
                  <h3 className="font-bold text-white">{eq.item}</h3>
                  <p className="text-xs text-neutral-400">{eq.reason}</p>
                  {eq.unlockedExercises?.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {eq.unlockedExercises.map((uEx) => (
                        <span
                          key={uEx}
                          className="text-[11px] px-2.5 py-0.5 rounded bg-red-600/15 border border-red-600/40 text-red-300"
                        >
                          + {uEx}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}