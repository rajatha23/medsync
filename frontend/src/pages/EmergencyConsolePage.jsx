import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Building2, 
  User, 
  Activity, 
  Flame, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { emergencyService } from '../services/emergencyService';
import { hospitalService } from '../services/hospitalService';
import { reservationService } from '../services/reservationService';
import PriorityBadge from '../components/PriorityBadge';
import EmergencyStatusBadge from '../components/EmergencyStatusBadge';
import EmergencyTimeline from '../components/EmergencyTimeline';
import EmergencyTransitionModal from '../components/EmergencyTransitionModal';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Incidents' },
  { key: 'SEARCHING', label: 'Searching' },
  { key: 'MATCH_FOUND', label: 'Match Found' },
  { key: 'PENDING_ACCEPTANCE', label: 'Pending Acceptance' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'ALLOCATED', label: 'Allocated' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

export default function EmergencyConsolePage() {
  const { user } = useAuth();
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIdFromUrl = paramId || searchParams.get('id');

  // Core Data State
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Transition Modal State
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Polling Timer Ref
  const timerRef = useRef(null);

  // Load all emergency requests
  const fetchRequests = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      setError(null);
      const data = await emergencyService.getEmergencyRequests({
        status: activeTab !== 'ALL' ? activeTab : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        search: searchTerm.trim() || undefined,
        // If hospital admin, can see hospital's assigned or floating
        assigned_hospital_id: user?.role === 'HOSPITAL_ADMIN' && user?.hospital_id ? undefined : undefined
      });
      setRequests(data);

      // If URL has an ID, or if we have a currently selected request, refresh its details
      const targetId = selectedIdFromUrl || selectedRequest?.id || data[0]?.id;
      if (targetId && (!selectedRequest || selectedRequest.id === targetId)) {
        fetchRequestDetail(targetId, true);
      }
    } catch (err) {
      console.error('Failed to load emergency requests:', err);
      setError(err.message || 'Failed to communicate with emergency service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load hospitals for the transition modal
  const fetchHospitals = async () => {
    try {
      const data = await hospitalService.getHospitals();
      setHospitals(data || []);
    } catch (err) {
      console.warn('Could not load hospitals list for transition modal:', err);
    }
  };

  // Load single request detail with full timeline and reservations
  const fetchRequestDetail = async (id, isSilent = false) => {
    if (!id) return;
    if (!isSilent) setDetailLoading(true);
    try {
      const [detail, resvs] = await Promise.all([
        emergencyService.getEmergencyRequestById(id),
        reservationService.getReservationsForRequest(id).catch(() => [])
      ]);
      setSelectedRequest(detail);
      setReservations(resvs || []);
    } catch (err) {
      console.error(`Failed to fetch request detail ${id}:`, err);
    } finally {
      if (!isSilent) setDetailLoading(false);
    }
  };

  // Release a held reservation
  const handleReleaseReservation = async (reservationId) => {
    if (!confirm('Are you sure you want to release this resource hold?')) return;
    try {
      await reservationService.releaseReservation(reservationId, 'Released by coordinator from console');
      if (selectedRequest?.id) {
        fetchRequestDetail(selectedRequest.id);
        fetchRequests(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to release reservation');
    }
  };

  // Initial load
  useEffect(() => {
    fetchRequests();
    fetchHospitals();
  }, [activeTab, selectedPriority]);

  // URL query parameter sync
  useEffect(() => {
    if (selectedIdFromUrl && (!selectedRequest || selectedRequest.id !== selectedIdFromUrl)) {
      fetchRequestDetail(selectedIdFromUrl);
    }
  }, [selectedIdFromUrl]);

  // Auto-refresh interval (12 seconds)
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchRequests(true);
    }, 12000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, activeTab, selectedPriority, searchTerm]);

  // Select request handler
  const handleSelectRequest = (req) => {
    setSearchParams({ id: req.id });
    fetchRequestDetail(req.id);
  };

  // Successful transition callback
  const handleTransitionSuccess = (updatedRequest) => {
    setSelectedRequest(updatedRequest);
    fetchRequests(true);
  };

  // Filtered requests count per tab
  const countsByStatus = useMemo(() => {
    const counts = { ALL: requests.length };
    STATUS_TABS.forEach(tab => {
      if (tab.key !== 'ALL') {
        counts[tab.key] = requests.filter(r => r.status === tab.key).length;
      }
    });
    return counts;
  }, [requests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Tab filter
      if (activeTab !== 'ALL' && req.status !== activeTab) return false;
      
      // Priority filter
      if (selectedPriority !== 'ALL' && req.priority !== selectedPriority) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches = 
          req.tracking_code?.toLowerCase().includes(query) ||
          req.patient_reference?.toLowerCase().includes(query) ||
          req.location?.toLowerCase().includes(query) ||
          req.assigned_hospital_name?.toLowerCase().includes(query) ||
          req.incident_category?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [requests, activeTab, selectedPriority, searchTerm]);

  // Format relative or short time
  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isCoordinator = user?.role === 'COORDINATOR' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6 pb-12">
      {/* Console Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
                <span>Emergency Request & Dispatch Console</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Phase 7
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage live incident dispatching, request resources, and drive multi-step triage lifecycles.
              </p>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-colors ${
              autoRefresh 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-rose-400' : 'text-slate-500'}`} />
            <span>{autoRefresh ? 'LIVE RADAR (12s)' : 'RADAR PAUSED'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchRequests()}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Dispatch Incident Button */}
          {isCoordinator && (
            <Link
              to="/emergency/new"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-mono font-semibold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch New Incident</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/60 scrollbar-none">
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = countsByStatus[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Priority Sub-Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search code, address, patient..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-mono">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Main Command Console: 2-Column Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Emergency Request List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Incident Queue ({filteredRequests.length})</span>
            <span>Sorted by Urgency</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-2.5">
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-300">No Incidents Found</div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                No emergency requests match your current tab or search filters.
              </p>
              {isCoordinator && (
                <Link
                  to="/emergency/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono hover:bg-rose-900/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dispatch New Incident</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                const isCritical = req.priority === 'CRITICAL';

                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/70 shadow-lg shadow-cyan-950/30'
                        : isCritical
                        ? 'bg-slate-900/70 border-rose-950/80 hover:border-rose-800/70'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Priority & Status & Time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={req.priority} size="sm" />
                        <EmergencyStatusBadge status={req.status} size="sm" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(req.created_at)}
                      </span>
                    </div>

                    {/* Tracking Code & Category */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-mono text-xs font-bold text-white tracking-wide">
                        {req.tracking_code}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {req.incident_category || 'GENERAL'}
                      </span>
                    </div>

                    {/* Incident Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{req.location}</span>
                    </div>

                    {/* Assigned Hospital if any */}
                    {req.assigned_hospital_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1 font-mono">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{req.assigned_hospital_name}</span>
                      </div>
                    )}

                    {/* Requested Resources Pills */}
                    {req.required_resources && req.required_resources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800/60">
                        {req.required_resources.slice(0, 3).map((res, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60"
                          >
                            {res.resource_type}: {res.required_quantity}
                          </span>
                        ))}
                        {req.required_resources.length > 3 && (
                          <span className="text-[9px] font-mono px-1 py-0.5 text-slate-500">
                            +{req.required_resources.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Selected Right Indicator Arrow */}
                    {isSelected && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed View & Status Timeline (7 Cols) */}
        <div className="lg:col-span-7">
          {detailLoading ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-4">
              <div className="h-6 bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-32 bg-slate-800 rounded w-full" />
            </div>
          ) : selectedRequest ? (
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-6">
              {/* Detail Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold font-mono text-white">
                      {selectedRequest.tracking_code}
                    </h2>
                    <PriorityBadge priority={selectedRequest.priority} size="md" />
                    <EmergencyStatusBadge status={selectedRequest.status} size="md" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span>Category: <strong className="text-slate-200">{selectedRequest.incident_category}</strong></span>
                    <span>•</span>
                    <span>Patient: <strong className="text-slate-200">{selectedRequest.patient_reference}</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRequest.status !== 'COMPLETED' && selectedRequest.status !== 'CANCELLED' && (
                    <Link
                      to={`/emergency/${selectedRequest.id}/match`}
                      className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Match</span>
                    </Link>
                  )}

                  {selectedRequest.status !== 'COMPLETED' && selectedRequest.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      onClick={() => setShowTransitionModal(true)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Update Status</span>
                    </button>
                  ) : (
                    <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                      Terminal State ({selectedRequest.status})
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Summary: Coordinates, Hospital, Caller */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location & GPS */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Incident Location</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      GPS: {Number(selectedRequest.latitude).toFixed(4)}, {Number(selectedRequest.longitude).toFixed(4)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white">
                    {selectedRequest.location}
                  </p>
                </div>

                {/* Receiving Hospital */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Assigned Hospital</span>
                    </span>
                    {selectedRequest.assigned_hospital_phone && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {selectedRequest.assigned_hospital_phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-white">
                    {selectedRequest.assigned_hospital_name 
                      ? `${selectedRequest.assigned_hospital_name} (${selectedRequest.assigned_hospital_city})` 
                      : 'Pending Hospital Assignment'}
                  </p>
                </div>
              </div>

              {/* Clinical & Dispatch Notes */}
              {selectedRequest.notes && (
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Clinical Notes & Dispatch Details
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              {/* Required Resources Demand Checklist */}
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Requested Resources Demand (request_resources)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedRequest.required_resources?.length || 0} Demanded Asset Types
                  </span>
                </div>

                {selectedRequest.required_resources && selectedRequest.required_resources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedRequest.required_resources.map((res) => (
                      <div
                        key={res.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-mono font-semibold text-white">
                            {res.resource_type}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Required: <strong className="text-cyan-400">{res.required_quantity}</strong> • Fulfilled: {res.fulfilled_quantity || 0}
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                          res.status === 'FULFILLED'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                            : 'bg-amber-950/60 text-amber-400 border-amber-800'
                        }`}>
                          {res.status || 'DEMANDED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No specific resource types listed for this emergency request.
                  </p>
                )}
              </div>

              {/* Active Resource Reservations & Holds */}
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Active Resource Holds & Reservations ({reservations.filter(r => r.status === 'HELD' || r.status === 'CONFIRMED').length})</span>
                  </div>
                  <Link
                    to={`/emergency/${selectedRequest.id}/match`}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Match & Reserve</span>
                  </Link>
                </div>

                {reservations.length > 0 ? (
                  <div className="space-y-2">
                    {reservations.map((resv) => {
                      const isActive = resv.status === 'HELD' || resv.status === 'CONFIRMED';
                      return (
                        <div
                          key={resv.id}
                          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{resv.resource_type}</span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                {resv.reserved_quantity} Unit{resv.reserved_quantity > 1 ? 's' : ''}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                isActive
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {resv.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>Facility: <strong className="text-slate-200">{resv.hospital_name}</strong></span>
                              <span>•</span>
                              <span>Held at: {formatTime(resv.reserved_at)}</span>
                            </div>
                          </div>

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleReleaseReservation(resv.id)}
                              className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 text-[11px] font-mono transition-colors"
                              title="Release hold back to facility available pool"
                            >
                              Release Hold
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded bg-slate-900/30 border border-slate-800/80 text-center text-xs text-slate-500 font-mono">
                    No active resource holds placed. Use "Smart Match" above to identify candidate facilities and reserve capacity.
                  </div>
                )}
              </div>

              {/* Interactive Status Timeline & Audit Trail */}
              <EmergencyTimeline
                currentStatus={selectedRequest.status}
                timeline={selectedRequest.timeline || []}
                createdAt={selectedRequest.created_at}
                resolvedAt={selectedRequest.resolved_at}
              />
            </div>
          ) : (
            /* Empty selection state */
            <div className="p-12 rounded-xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
              <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Incident Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select an emergency incident from the queue on the left to inspect live clinical demand, review the 7-step timeline, or execute status transitions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transition Modal */}
      {showTransitionModal && selectedRequest && (
        <EmergencyTransitionModal
          isOpen={showTransitionModal}
          onClose={() => setShowTransitionModal(false)}
          request={selectedRequest}
          hospitals={hospitals}
          onTransitionSuccess={handleTransitionSuccess}
        />
      )}
    </div>
  );
}
