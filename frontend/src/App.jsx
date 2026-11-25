import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import DietPlannerPage from './pages/DietPlannerPage';
import Layout from "./components/Layout";
import WorkoutPlan from './pages/WorkoutPlan';
import MealScanner from './pages/MealScanner';
import NutritionCalculator from './components/NutritionCalculator';

// Blocks unauthenticated access and enforces first-time onboarding
const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Force incomplete profiles to /onboarding before accessing /dashboard
  if (requireOnboarding && !user.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

// Prevents already logged-in users from seeing Login/Signup
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.isOnboarded ? '/dashboard' : '/onboarding'} replace />;
  }
  return children;
};

// Guard: Must be logged in AND have completed onboarding to enter Layout pages
function ProtectedAppGuard({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem("fitcluster_token");
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!user.isOnboarded) return <Navigate to="/onboarding" replace />;
  return children;
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Authenticated App Shell with Shared Navbar */}
        <Route
          element={
            <ProtectedAppGuard>
              <Layout />
            </ProtectedAppGuard>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diet-plan" element={<DietPlannerPage />} />
          <Route
            path="/nutrition-calculator"
            element={<NutritionCalculator />}
          />
          {/* workout  */}
          <Route path="/workouts" element={<ProtectedRoute><WorkoutPlan/></ProtectedRoute>} />
          <Route
            path="/meal-scanner"
            element={
              <ProtectedRoute>
                <MealScanner />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<Onboarding isEditing />} />
        </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}