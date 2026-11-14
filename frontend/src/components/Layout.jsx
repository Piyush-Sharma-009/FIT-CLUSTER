import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function Layout({ onLogout, children }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    onLogout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-emerald-400">FII-CLUSTER AI</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Foundation
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/onboarding" className={linkClass}>
            Onboarding & Profile
          </NavLink>
          <NavLink to="/calculator" className={linkClass}>
            BMI / TDEE Calculator
          </NavLink>
          <button
            onClick={handleSignOut}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition"
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="p-6">{children ||
        <Outlet />
       }
      </main>
    </div>
  );
}