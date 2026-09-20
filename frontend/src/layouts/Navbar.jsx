import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Database,
  Radio,
  LogOut,
  LogIn,
  User,
  ShieldAlert,
  Hospital,
  FlaskConical,
  Bell
} from 'lucide-react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import { notificationService } from '../services/notificationService';

export default function Navbar() {
  const { health, loading, refresh } = useSystemHealth(15000);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const loadNotifications = async () => { if (!isAuthenticated) return; try { const r = await notificationService.list({limit: 12}); setNotifications(r.data?.notifications || []); } catch (_) {} };

  useEffect(() => { loadNotifications(); const poll=setInterval(loadNotifications, 20000); return () => clearInterval(poll); }, [isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Adaptive nav items based on role
  const isCoordinator = user?.role === 'COORDINATOR' || user?.role === 'ADMIN';
  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

  const navItems = isHospitalAdmin ? [
    { to: '/hospital-admin/dashboard', label: 'My Facility Command', icon: Hospital },
    { to: '/resources', label: 'Facility Resources', icon: Activity },
    { to: '/emergency', label: 'Triage Dispatches', icon: AlertTriangle, badge: 'ACTIVE' },
  ] : [
    { to: isCoordinator ? '/coordinator/dashboard' : '/', label: 'Command Center', icon: Activity },
    { to: '/hospitals', label: 'Hospital Network', icon: Building2 },
    { to: '/resources', label: 'Resources', icon: Radio },
    { to: '/emergency', label: 'Emergency Console', icon: AlertTriangle, badge: 'LIVE' },
    { to: '/simulator', label: 'Simulator', icon: FlaskConical, badge: 'SYNTHETIC' },
    { to: '/analytics', label: 'Demand Analytics', icon: BarChart3 },
  ];

  const dbConnected = health?.database?.connected;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link to={isHospitalAdmin ? '/hospital-admin/dashboard' : isCoordinator ? '/coordinator/dashboard' : '/'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold tracking-wider text-xl bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  MEDSYNC
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  PROTOTYPE v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                Smart Hospital Resource Coordination Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`ml-1 text-[9px] font-mono px-1 py-0.5 rounded border ${
                      item.badge === 'SYNTHETIC'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Status, User Profile & Auth Controls */}
          <div className="flex items-center gap-3">
            {/* Database status */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              <Database className={`w-3.5 h-3.5 ${dbConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-slate-300 font-mono text-[11px]">
                {dbConnected ? 'PG: ACTIVE' : 'PG: STANDBY'}
              </span>
            </div>

            {/* H4 live notifications */}
            {isAuthenticated && <div className="relative">
              <button onClick={() => setShowNotifications(v => !v)} className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800" title="Operational notifications">
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.is_read).length > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">{notifications.filter(n => !n.is_read).length}</span>}
              </button>
              {showNotifications && <div className="absolute right-0 top-11 w-80 max-h-96 overflow-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl z-50">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between"><span className="font-semibold text-white text-sm">Operational Notifications</span><button onClick={async()=>{await notificationService.markAllRead(); loadNotifications();}} className="text-[10px] text-cyan-400">Mark all read</button></div>
                {notifications.length===0 ? <div className="p-4 text-xs text-slate-500">No active notifications.</div> : notifications.map(n=><button key={n.id} onClick={async()=>{if(!n.live && !n.is_read) await notificationService.markRead(n.id); loadNotifications();}} className="w-full text-left p-3 border-b border-slate-900 hover:bg-slate-900"><div className="flex justify-between gap-2"><span className={`text-xs font-semibold ${n.severity==='CRITICAL'?'text-rose-300':n.severity==='WARNING'?'text-amber-300':'text-cyan-300'}`}>{n.title}</span>{!n.is_read&&<span className="text-[9px] text-cyan-400">NEW</span>}</div><p className="text-[11px] text-slate-400 mt-1">{n.message}</p></button>)}
              </div>}
            </div>}

            {/* User Profile Badge if Logged In */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-semibold text-white max-w-[130px] truncate">{user?.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                      user?.role === 'COORDINATOR' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                      user?.role === 'HOSPITAL_ADMIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {user?.role}
                    </span>
                  </div>
                  {user?.hospital_name && (
                    <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[150px]">
                      {user.hospital_name}
                    </span>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Sign out of MedSync"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Manual Refresh button */}
            <button
              onClick={refresh}
              disabled={loading}
              title="Refresh System Health"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
