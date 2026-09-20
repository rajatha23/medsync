import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Clock, 
  User, 
  ShieldAlert, 
  ArrowRight,
  Radio
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import EmergencyStatusBadge from './EmergencyStatusBadge';

const STAGES = [
  { key: 'SEARCHING', label: 'Searching', desc: 'Resource Search' },
  { key: 'MATCH_FOUND', label: 'Match Found', desc: 'Hospital Identified' },
  { key: 'PENDING_ACCEPTANCE', label: 'Pending Acceptance', desc: 'Hospital Review' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Facility Confirmed' },
  { key: 'RESERVED', label: 'Reserved', desc: 'Resource Hold' },
  { key: 'ALLOCATED', label: 'Allocated', desc: 'Units Mobilized' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Triage Concluded' }
];

const STAGE_ORDER = STAGES.map(s => s.key);

export default function EmergencyTimeline({ currentStatus, timeline = [], createdAt, resolvedAt }) {
  const isCancelled = currentStatus === 'CANCELLED';
  const currentIndex = STAGE_ORDER.indexOf(currentStatus);

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Cancellation Banner if Cancelled */}
      {isCancelled && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-rose-300 uppercase tracking-wide">
              Emergency Request Cancelled
            </div>
            <p className="text-rose-400/90">
              This emergency dispatch was cancelled and concluded at {formatTimestamp(resolvedAt)}. No further status transitions may be applied.
            </p>
          </div>
        </div>
      )}

      {/* Graphical Step-by-step Pipeline Stepper */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Workflow Progression Pipeline</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            {isCancelled ? 'Status: CANCELLED' : `Phase ${currentIndex + 1} of 7`}
          </span>
        </div>

        {/* Responsive Pipeline Nodes */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[680px] flex items-center justify-between relative">
            {/* Connecting Track Line */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
            
            {STAGES.map((stage, idx) => {
              const isPast = !isCancelled && currentIndex > idx;
              const isCurrent = !isCancelled && currentIndex === idx;
              const isFuture = isCancelled || currentIndex < idx;

              return (
                <div key={stage.key} className="flex flex-col items-center relative z-10 text-center px-1">
                  {/* Step Node Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 font-bold shadow-lg shadow-cyan-500/40 animate-pulse'
                        : 'bg-slate-800 border border-slate-700 text-slate-500'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    ) : isCurrent ? (
                      <span className="text-xs font-mono font-bold">{idx + 1}</span>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>

                  {/* Node Label */}
                  <div className="mt-2.5">
                    <span
                      className={`text-[11px] font-semibold block leading-tight font-mono ${
                        isCurrent
                          ? 'text-cyan-400'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {stage.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audit Log / Chronological Status History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail & Event Timeline ({timeline.length} Recorded)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Created {formatTimestamp(createdAt)}
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800 text-xs text-slate-500 text-center">
            No historical timeline events recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-800 space-y-4">
            {timeline.map((event, idx) => (
              <div key={event.id || idx} className="relative group">
                {/* Timeline Pin */}
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-cyan-500/20 border-2 border-cyan-400" />

                <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.previous_status && (
                        <>
                          <EmergencyStatusBadge status={event.previous_status} size="sm" />
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                        </>
                      )}
                      <EmergencyStatusBadge status={event.new_status} size="sm" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatTimestamp(event.created_at)}
                    </span>
                  </div>

                  {/* Notes / Reason */}
                  {event.notes && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/60 font-sans">
                      {event.notes}
                    </p>
                  )}

                  {/* Changed By User */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Logged by:</span>
                    <span className="text-slate-200 font-medium">
                      {event.changed_by_name || 'System Dispatcher'}
                    </span>
                    {event.changed_by_role && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-cyan-400">
                        {event.changed_by_role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
