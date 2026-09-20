import React from 'react';
import { 
  Radio, 
  Target, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  CheckCheck, 
  XCircle 
} from 'lucide-react';

export default function EmergencyStatusBadge({ status, size = 'md' }) {
  const norm = (status || 'SEARCHING').toUpperCase();

  const configs = {
    SEARCHING: {
      bg: 'bg-amber-950/60 border-amber-600/70 text-amber-300',
      icon: Radio,
      pulse: true,
      label: 'SEARCHING'
    },
    MATCH_FOUND: {
      bg: 'bg-indigo-950/60 border-indigo-500/70 text-indigo-300',
      icon: Target,
      pulse: true,
      label: 'MATCH FOUND'
    },
    PENDING_ACCEPTANCE: {
      bg: 'bg-purple-950/60 border-purple-500/70 text-purple-300',
      icon: Clock,
      pulse: true,
      label: 'PENDING ACCEPTANCE'
    },
    ACCEPTED: {
      bg: 'bg-cyan-950/60 border-cyan-500/70 text-cyan-300',
      icon: CheckCircle2,
      pulse: false,
      label: 'ACCEPTED'
    },
    RESERVED: {
      bg: 'bg-blue-950/60 border-blue-500/70 text-blue-300',
      icon: ShieldCheck,
      pulse: false,
      label: 'RESERVED'
    },
    ALLOCATED: {
      bg: 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300',
      icon: Truck,
      pulse: false,
      label: 'ALLOCATED'
    },
    COMPLETED: {
      bg: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400',
      icon: CheckCheck,
      pulse: false,
      label: 'COMPLETED'
    },
    CANCELLED: {
      bg: 'bg-rose-950/60 border-rose-600/70 text-rose-400',
      icon: XCircle,
      pulse: false,
      label: 'CANCELLED'
    }
  };

  const config = configs[norm] || {
    bg: 'bg-slate-800 border-slate-700 text-slate-300',
    icon: Clock,
    pulse: false,
    label: norm
  };

  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5 gap-1' 
    : size === 'lg'
    ? 'text-sm px-3 py-1.5 gap-2 font-bold'
    : 'text-xs px-2.5 py-1 gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center font-mono rounded-md border tracking-wider uppercase ${config.bg} ${sizeClasses}`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
}
