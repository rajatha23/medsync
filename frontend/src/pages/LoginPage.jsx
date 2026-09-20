import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Building2, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already logged in, redirect to respective role dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'COORDINATOR') {
        navigate('/coordinator/dashboard', { replace: true });
      } else if (user.role === 'HOSPITAL_ADMIN') {
        navigate('/hospital-admin/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      const destination = location.state?.from?.pathname || (
        loggedUser.role === 'COORDINATOR' ? '/coordinator/dashboard' :
        loggedUser.role === 'HOSPITAL_ADMIN' ? '/hospital-admin/dashboard' : '/'
      );
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setLoading(true);
    login(demoEmail, demoPassword)
      .then((loggedUser) => {
        const dest = loggedUser.role === 'COORDINATOR' ? '/coordinator/dashboard' : '/hospital-admin/dashboard';
        navigate(dest, { replace: true });
      })
      .catch((err) => {
        setError(err.message || 'Demo login failed');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-md mx-auto py-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20 mb-1">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            MedSync Command Login
          </h1>
          <p className="text-xs text-slate-400">
            Secure Role-Based Access for Healthcare Coordinators & Hospital Admins
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@medsync.demo"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-[11px] font-mono font-medium text-slate-500">
              One-Click Demo Credentials
            </span>
          </div>
        </div>

        {/* Quick Demo Sign-In Buttons (Hackathon Ready) */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('coordinator@medsync.demo', 'Password123!')}
            className="w-full p-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-800/40 hover:border-cyan-600/60 text-left text-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-cyan-300">Regional Coordinator</p>
                <p className="text-[11px] text-slate-400">Marcus Drake • City-wide oversight</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/40">
              COORDINATOR
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('admin.metro@medsync.demo', 'Password123!')}
            className="w-full p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-800/40 hover:border-emerald-600/60 text-left text-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-emerald-300">Metropolitan Trauma Admin</p>
                <p className="text-[11px] text-slate-400">Sarah Jenkins, RN • Level 1 Center</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">
              HOSPITAL_ADMIN
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('admin.stjude@medsync.demo', 'Password123!')}
            className="w-full p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-950/60 border border-amber-800/40 hover:border-amber-600/60 text-left text-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-300">St. Jude Regional Admin</p>
                <p className="text-[11px] text-slate-400">Dr. Robert Chen • Level 2 Center (Surge)</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/40">
              HOSPITAL_ADMIN
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
