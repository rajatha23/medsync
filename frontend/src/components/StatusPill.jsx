import React from 'react';

const STATUS_CONFIG = {
  // Hospital operational statuses
  NORMAL: {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 animate-pulse',
    label: 'Normal Capacity'
  },
  SURGE: {
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
    label: 'Surge Capacity'
  },
  DIVERT: {
    bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400 animate-ping',
    label: 'Divert / Critical'
  },
  ONLINE: {
    bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-400',
    label: 'System Active'
  },
  OFFLINE: {
    bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Offline'
  },

  // Phase 5 Resource statuses
  AVAILABLE: {
    bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    label: 'Available'
  },
  LIMITED: {
    bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
    label: 'Limited'
  },
  CRITICAL: {
    bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400 animate-pulse',
    label: 'Critical'
  },
  UNAVAILABLE: {
    bg: 'bg-red-950/60 text-red-400 border-red-800/50',
    dot: 'bg-red-500',
    label: 'Unavailable'
  },
  LOW_STOCK: {
    bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
    label: 'Low Stock'
  },
  DEPLETED: {
    bg: 'bg-rose-950/60 text-rose-400 border-rose-800/50',
    dot: 'bg-rose-500',
    label: 'Depleted'
  },
  MAINTENANCE: {
    bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    label: 'Maintenance'
  }
};

export default function StatusPill({ status = 'AVAILABLE', customLabel, className = '' }) {
  const normalizedKey = (status || 'AVAILABLE').toUpperCase();
  const config = STATUS_CONFIG[normalizedKey] || {
    bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    label: status
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${config.bg} ${className}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {customLabel || config.label}
    </span>
  );
}
