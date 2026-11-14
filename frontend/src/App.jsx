import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}