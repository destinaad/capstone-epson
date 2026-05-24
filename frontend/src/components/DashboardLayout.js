import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LineChart, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isManager, isSupervisor } from '../utils/roles';

const linkClass = ({ isActive }) =>
  [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-electric/15 text-electric'
      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
  ].join(' ');

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const showDashboard = !isManager(user?.role);
  const showPerformance =
    isManager(user?.role) || isSupervisor(user?.role);

  return (
    <div className="min-h-screen bg-charcoal flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-charcoal-surface md:flex">
        <div className="border-b border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-electric">
            Epson QC
          </p>
          <p className="mt-1 text-sm font-medium text-white">Control Center</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {showDashboard && (
            <NavLink to="/app" end className={linkClass}>
              <LayoutDashboard className="h-4 w-4" />
              Live &amp; inspections
            </NavLink>
          )}
          {showPerformance && (
            <NavLink to="/app/performance" className={linkClass}>
              <LineChart className="h-4 w-4" />
              Performance overview
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-charcoal-elevated px-3 py-2 text-xs text-gray-400">
            <User className="h-4 w-4 shrink-0 text-electric" />
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-200">
                {user?.username}
              </p>
              <p className="truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm text-gray-300 transition hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-charcoal-surface px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-white">Epson QC</span>
          <nav className="flex flex-1 items-center justify-center gap-3 text-xs">
            {showDashboard && (
              <NavLink
                to="/app"
                className={({ isActive }) =>
                  isActive ? 'text-electric' : 'text-gray-400'
                }
                end
              >
                Live
              </NavLink>
            )}
            {showPerformance && (
              <NavLink
                to="/app/performance"
                className={({ isActive }) =>
                  isActive ? 'text-electric' : 'text-gray-400'
                }
              >
                Charts
              </NavLink>
            )}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-electric"
          >
            Out
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
