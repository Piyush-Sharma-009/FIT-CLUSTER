import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Diet Optimizer", path: "/diet-plan" },
  { label: "Nutrition Calculator", path: "/nutrition-calculator" },
  { label: "Workout AI", path: "/workouts" },
  { label: "Meal Vision", path: "/meal-scanner" },
  { label: "Profile", path: "/profile" },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("fitcluster_token");
    localStorage.removeItem("token");
    logout();
    navigate("/login", { replace: true });
  };

  const linkClasses = ({ isActive }) =>
    `px-3.5 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-red-600/20 text-red-400 border border-red-600/40"
        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
            <span className="text-lg font-extrabold tracking-wider text-white">
              FIT<span className="text-red-500">CLUSTER</span>
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Logout + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:border-red-700/60 hover:text-red-400 text-xs font-semibold text-zinc-400 transition cursor-pointer"
            >
              Logout
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-red-600/20 text-red-400 border border-red-600/40"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-zinc-900"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Active Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}