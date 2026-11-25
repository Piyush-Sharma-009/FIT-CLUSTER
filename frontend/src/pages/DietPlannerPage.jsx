import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function DietPlannerPage() {
  const [excludeInput, setExcludeInput] = useState("");
  const [excludedFoods, setExcludedFoods] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLatestPlan = async () => {
      try {
        const token = localStorage.getItem("fitcluster_token");
        const { data } = await axios.get(`${API_BASE}/ml/latest-diet`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (data?.plan) setPlan(data.plan);
      } catch {
        // No saved plan yet
      }
    };
    loadLatestPlan();
  }, []);

  const addExclusion = (e) => {
    e.preventDefault();
    const item = excludeInput.trim();
    if (item && !excludedFoods.some((f) => f.toLowerCase() === item.toLowerCase())) {
      setExcludedFoods([...excludedFoods, item]);
    }
    setExcludeInput("");
  };

  const removeExclusion = (item) => {
    setExcludedFoods(excludedFoods.filter((f) => f !== item));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("fitcluster_token");
      const { data } = await axios.post(
        `${API_BASE}/ml/optimize-diet`,
        { excludedFoods },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setPlan(data.plan);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to generate diet.");
    } finally {
      setLoading(false);
    }
  };

  const groupedMeals = (plan?.meals || []).reduce((acc, item) => {
    const slot = item.mealSlot || "lunch";
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
            Smart Meal Engine
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            AI Budget Diet Plan
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tailored automatically to your profile macros, diet preference, and daily budget.
          </p>
        </div>

        {/* Control Bar: Optional Exclusions + Generate CTA */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={addExclusion} className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Optional: Exclude any food (e.g. Banana, Paneer)..."
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                Exclude
              </button>
            </form>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              {loading ? "Optimizing..." : "Generate Diet Plan"}
            </button>
          </div>

          {excludedFoods.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Excluded:</span>
              {excludedFoods.map((food) => (
                <span
                  key={food}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-red-950/60 border border-red-800/60 text-red-300"
                >
                  {food}
                  <button
                    type="button"
                    onClick={() => removeExclusion(food)}
                    className="hover:text-white font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Result Section */}
        {!plan ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 py-16 text-center px-4">
            <p className="text-sm text-zinc-400">
              Click <span className="text-white font-medium">Generate Diet Plan</span> to compute your optimal daily meals.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Slack Warnings */}
            {plan.warnings?.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-1">
                {plan.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-amber-200">
                    • {w}
                  </p>
                ))}
              </div>
            )}

            {/* Macro & Cost Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <MetricBox label="Daily Cost" value={`₹${plan.summary?.cost}`} accent />
              <MetricBox label="Calories" value={`${plan.summary?.calories} kcal`} />
              <MetricBox label="Protein" value={`${plan.summary?.protein}g`} />
              <MetricBox label="Carbs" value={`${plan.summary?.carbs}g`} />
              <MetricBox label="Fats" value={`${plan.summary?.fats}g`} />
            </div>

            {/* Meal Cards */}
            <div className="space-y-4">
              {["breakfast", "lunch", "dinner", "snack"].map((slot) => {
                const items = groupedMeals[slot];
                if (!items?.length) return null;

                return (
                  <div
                    key={slot}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-red-500">
                        {slot}
                      </h2>
                      <span className="text-xs text-zinc-400">
                        {items.reduce((s, i) => s + i.calories, 0).toFixed(0)} kcal • ₹
                        {items.reduce((s, i) => s + i.cost, 0).toFixed(1)}
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-800/60">
                      {items.map((item, i) => (
                        <div key={i} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {item.name}
                              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-red-600/20 text-red-400 font-semibold">
                                {item.grams}g
                              </span>
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {item.calories} kcal • P: {item.protein}g • C: {item.carbs}g • F: {item.fats}g
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-200">₹{item.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-xl p-3.5 border ${
        accent ? "bg-red-950/30 border-red-800/70" : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-base font-bold mt-1 ${accent ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}