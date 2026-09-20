import React from 'react';

export default function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive = true,
  variant = 'default', // 'default', 'critical', 'warning', 'success'
}) {
  const borderVariants = {
    default: 'border-slate-800 hover:border-slate-700 bg-slate-900/60',
    critical: 'border-rose-900/40 hover:border-rose-700/60 bg-rose-950/20',
    warning: 'border-amber-900/40 hover:border-amber-700/60 bg-amber-950/20',
    success: 'border-emerald-900/40 hover:border-emerald-700/60 bg-emerald-950/20',
  };

  const iconVariants = {
    default: 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/40',
    critical: 'text-rose-400 bg-rose-950/60 border border-rose-800/40',
    warning: 'text-amber-400 bg-amber-950/60 border border-amber-800/40',
    success: 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40',
  };

  return (
    <div className={`rounded-xl p-5 border backdrop-blur-sm transition-all duration-200 ${borderVariants[variant] || borderVariants.default}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">{value}</span>
            {trend && (
              <span className={`text-xs font-medium ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend}
              </span>
            )}
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-slate-400">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconVariants[variant] || iconVariants.default}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
