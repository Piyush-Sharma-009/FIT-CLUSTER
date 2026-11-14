import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const EQUIPMENT_OPTIONS = [
  'Bodyweight Only',
  'Dumbbells',
  'Barbell & Plates',
  'Resistance Bands',
  'Pull-up Bar',
  'Kettlebell',
  'Full Gym Machines',
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    age: user?.profile?.age || '',
    gender: user?.profile?.gender || 'Male',
    height: user?.profile?.height || '',
    weight: user?.profile?.weight || '',
    activityLevel: user?.profile?.activityLevel || 'Moderately Active',
    experience: user?.profile?.experience || 'Beginner',
    goal: user?.profile?.goal || 'Muscle Gain',
    workoutPreference: user?.profile?.workoutPreference || 'Gym',
    equipment: user?.profile?.equipment?.length
      ? user.profile.equipment
      : ['Full Gym Machines'],
    dietaryPreference: user?.profile?.dietaryPreference || 'Vegetarian',
    dailyFoodBudget: user?.profile?.dailyFoodBudget || '',
  });

  // Sync form if user context finishes loading after mount
  useEffect(() => {
    if (user?.profile) {
      setFormData((prev) => ({
        ...prev,
        ...user.profile,
        equipment: user.profile.equipment?.length
          ? user.profile.equipment
          : prev.equipment,
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEquipment = (item) => {
    setFormData((prev) => {
      const exists = prev.equipment.includes(item);
      return {
        ...prev,
        equipment: exists
          ? prev.equipment.filter((eq) => eq !== item)
          : [...prev.equipment, item],
      };
    });
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && (!formData.age || !formData.height || !formData.weight)) {
      setError('Please enter your age, height, and weight.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.dailyFoodBudget || Number(formData.dailyFoodBudget) <= 0) {
      setError('Please enter a valid daily food budget.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await API.put('/users/onboarding', formData);
      // Update global user state so ProtectedRoute unlocks /dashboard
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl shadow-red-950/20">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-neutral-400 mb-2">
            <span className="text-red-500 font-bold">FITCLUSTER SETUP</span>
            <span>Step {step} of 3</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/60 border border-red-600 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Body Metrics */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">
                Your Body Metrics
              </h2>
              <p className="text-sm text-neutral-400">
                Used to calculate your basal metabolic rate and macro targets.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    name="age"
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="21"
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    min="100"
                    max="250"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="175"
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    min="30"
                    max="300"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="72"
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Training & Equipment */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">
                Training Profile
              </h2>
              <p className="text-sm text-neutral-400">
                Tailors workout splits, volume, and exercise selection.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Activity Level
                  </label>
                  <select
                    name="activityLevel"
                    value={formData.activityLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Sedentary">Sedentary</option>
                    <option value="Lightly Active">Lightly Active</option>
                    <option value="Moderately Active">Moderately Active</option>
                    <option value="Very Active">Very Active</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Fitness Experience
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Primary Fitness Goal
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Weight Loss', 'Muscle Gain', 'Strength', 'General Fitness'].map(
                    (goalOption) => (
                      <button
                        type="button"
                        key={goalOption}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, goal: goalOption }))
                        }
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition ${
                          formData.goal === goalOption
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {goalOption}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Workout Environment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Gym', 'Home'].map((env) => (
                    <button
                      type="button"
                      key={env}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, workoutPreference: env }))
                      }
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                        formData.workoutPreference === env
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Available Equipment (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => {
                    const selected = formData.equipment.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleEquipment(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          selected
                            ? 'bg-red-600/20 border-red-600 text-red-400'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {selected ? `✓ ${item}` : item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Nutrition & Budget */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">
                Nutrition & Budget
              </h2>
              <p className="text-sm text-neutral-400">
                Powers your AI Diet Optimizer within your daily spending limit.
              </p>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Vegetarian', 'Non-vegetarian'].map((diet) => (
                    <button
                      type="button"
                      key={diet}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, dietaryPreference: diet }))
                      }
                      className={`py-3 rounded-lg border text-sm font-semibold transition ${
                        formData.dietaryPreference === diet
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                  Daily Food Budget (₹ INR)
                </label>
                <input
                  type="number"
                  name="dailyFoodBudget"
                  min="50"
                  value={formData.dailyFoodBudget}
                  onChange={handleChange}
                  placeholder="e.g., 250"
                  className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between pt-5 border-t border-neutral-900">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="px-5 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-medium transition"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Saving Profile...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}