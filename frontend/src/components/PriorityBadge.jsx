import React from 'react';
import { Flame, AlertTriangle, Activity, Clock } from 'lucide-react';

export default function PriorityBadge({ priority, size = 'md' }) {
  const norm = (priority || 'MEDIUM').toUpperCase();

  const configs = {
    CRITICAL: {
      bg: 'bg-rose-950/80 border-rose-600/80 text-rose-300 shadow-sm shadow-rose-900/50',
      icon: Flame,
      iconColor: 'text-rose-400',
      pulse: true,
      label: 'CRITICAL'
    },
    HIGH: {
      bg: 'bg-amber-950/80 border-amber-600/80 text-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      pulse: false,
      label: 'HIGH'
    },
    MEDIUM: {
      bg: 'bg-cyan-950/80 border-cyan-600/80 text-cyan-300',
      icon: Activity,
      iconColor: 'text-cyan-400',
      pulse: false,
      label: 'MEDIUM'
    },
    LOW: {
      bg: 'bg-slate-800/80 border-slate-600/80 text-slate-300',
      icon: Clock,
      iconColor: 'text-slate-400',
      pulse: false,
      label: 'LOW'
    }
  };

  const config = configs[norm] || configs.MEDIUM;
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
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${config.iconColor} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
}
