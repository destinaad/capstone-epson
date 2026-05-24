import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isManager } from '../utils/roles';

export default function LoginPage() {
  const { user, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;

  if (isAuthenticated) {
    if (isManager(user.role)) {
      return <Navigate to="/app/performance" replace />;
    }
    const dest = from && from !== '/login' ? from : '/app';
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(username, password);
      if (isManager(loggedIn.role)) {
        navigate('/app/performance', { replace: true });
      } else {
        navigate(from && from !== '/login' ? from : '/app', { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Login failed. Check credentials and API.';
      setError(typeof msg === 'string' ? msg : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-charcoal-surface p-8 shadow-xl shadow-black/40">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-electric">
            Epson
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Smart Quality Control
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in with your operator, supervisor, or manager account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              className="rounded-lg border border-qc-ng/40 bg-qc-ng/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              className="w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2.5 text-white outline-none ring-electric/50 transition focus:border-electric focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2.5 text-white outline-none ring-electric/50 transition focus:border-electric focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-electric py-2.5 text-sm font-semibold text-charcoal transition hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Roles: Manager (read-only overview), Supervisor (full access), Operator
          (own shift records).
        </p>
      </div>
    </div>
  );
}
