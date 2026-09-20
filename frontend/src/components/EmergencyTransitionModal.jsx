import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Building2, 
  FileText,
  Send
} from 'lucide-react';
import { emergencyService } from '../services/emergencyService';
import EmergencyStatusBadge from './EmergencyStatusBadge';

const ALLOWED_TRANSITIONS = {
  SEARCHING: [
    { status: 'MATCH_FOUND', label: 'Match Found (Candidate Identified)', defaultNote: 'Hospital identified with matching trauma capacity', color: 'indigo' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled', color: 'rose' }
  ],
  MATCH_FOUND: [
    { status: 'PENDING_ACCEPTANCE', label: 'Submit for Hospital Acceptance', defaultNote: 'Dispatched to receiving facility triage board', color: 'purple' },
    { status: 'SEARCHING', label: 'Reset to Searching (Clear Match)', defaultNote: 'Match cleared, restarting regional hospital search', color: 'amber' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled', color: 'rose' }
  ],
  PENDING_ACCEPTANCE: [
    { status: 'ACCEPTED', label: 'Accept Dispatch (Facility Confirmation)', defaultNote: 'Hospital confirmed capacity and accepted patient transport', color: 'cyan' },
    { status: 'MATCH_FOUND', label: 'Decline / Return to Match Search', defaultNote: 'Hospital unable to accept; rerouting dispatch', color: 'indigo' },
    { status: 'SEARCHING', label: 'Reset to Searching', defaultNote: 'Reopened candidate search across network', color: 'amber' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled', color: 'rose' }
  ],
  ACCEPTED: [
    { status: 'RESERVED', label: 'Place Resource Hold (Reserve Beds/Vents)', defaultNote: 'Resource hold placed on critical care assets', color: 'blue' },
    { status: 'ALLOCATED', label: 'Mobilize & Direct Allocate', defaultNote: 'Direct allocation confirmed for patient arrival', color: 'emerald' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled', color: 'rose' }
  ],
  RESERVED: [
    { status: 'ALLOCATED', label: 'Confirm Allocation (Patient En Route)', defaultNote: 'Ambulance en route; resources allocated and prepped', color: 'emerald' },
    { status: 'ACCEPTED', label: 'Revert to Accepted', defaultNote: 'Hold released back to accepted status', color: 'cyan' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled', color: 'rose' }
  ],
  ALLOCATED: [
    { status: 'COMPLETED', label: 'Mark Completed (Patient Admitted)', defaultNote: 'Patient safely admitted and handed over to ER team', color: 'emerald' },
    { status: 'CANCELLED', label: 'Cancel Incident', isDestructive: true, defaultNote: 'Emergency dispatch cancelled in transit', color: 'rose' }
  ],
  COMPLETED: [],
  CANCELLED: []
};

export default function EmergencyTransitionModal({ 
  isOpen, 
  onClose, 
  request, 
  hospitals = [], 
  onTransitionSuccess 
}) {
  if (!isOpen || !request) return null;

  const currentStatus = request.status;
  const availableOptions = ALLOWED_TRANSITIONS[currentStatus] || [];

  const [selectedTargetStatus, setSelectedTargetStatus] = useState(
    availableOptions[0]?.status || ''
  );
  const [assignedHospitalId, setAssignedHospitalId] = useState(
    request.assigned_hospital_id || ''
  );
  const [notes, setNotes] = useState(availableOptions[0]?.defaultNote || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // When selected status changes, set default note
  const handleSelectStatus = (option) => {
    setSelectedTargetStatus(option.status);
    setNotes(option.defaultNote || '');
  };

  const isTerminal = currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTargetStatus) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        status: selectedTargetStatus,
        assigned_hospital_id: assignedHospitalId || null,
        notes: notes.trim()
      };

      const updated = await emergencyService.updateEmergencyStatus(request.id, payload);
      onTransitionSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Failed to transition status:', err);
      setError(err.message || 'Failed to update emergency status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                Transition Workflow Status
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Incident: {request.tracking_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isTerminal ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">Terminal State Reached</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              This request is currently in terminal status <strong className="text-white">{currentStatus}</strong>. No further status changes are permitted.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-mono"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Status Display */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Current Status:</span>
              <EmergencyStatusBadge status={currentStatus} size="sm" />
            </div>

            {/* Target Status Selector */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Select Target Status *
              </label>
              <div className="space-y-2">
                {availableOptions.map((opt) => {
                  const isSelected = selectedTargetStatus === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => handleSelectStatus(opt)}
                      className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? opt.isDestructive
                            ? 'bg-rose-950/50 border-rose-600 text-white ring-1 ring-rose-500'
                            : 'bg-cyan-950/40 border-cyan-500 text-white ring-1 ring-cyan-500'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      <EmergencyStatusBadge status={opt.status} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receiving Hospital Assignment (if applicable or already assigned) */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Receiving Hospital Assignment
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <select
                  value={assignedHospitalId}
                  onChange={(e) => setAssignedHospitalId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- No Hospital Assigned (Network Floating) --</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city}) - [{h.trauma_level || 'General'}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transition Reason & Notes */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Transition Notes / Audit Reason *
              </label>
              <textarea
                rows="2"
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="State the reason or clinical authorization for this status change..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedTargetStatus}
                className={`px-4 py-2 rounded-lg font-mono text-xs font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all ${
                  selectedTargetStatus === 'CANCELLED'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                    : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/50'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Transition...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Commit Status Change</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
