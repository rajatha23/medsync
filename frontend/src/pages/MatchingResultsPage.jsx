import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MapPin, 
  Radio, 
  Info, 
  ShieldAlert, 
  Clock, 
  Layers, 
  Navigation, 
  SlidersHorizontal, 
  Sparkles, 
  Send,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { matchingService } from '../services/matchingService';
import { emergencyService } from '../services/emergencyService';
import { reservationService } from '../services/reservationService';
import PriorityBadge from '../components/PriorityBadge';
import EmergencyStatusBadge from '../components/EmergencyStatusBadge';

export default function MatchingResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedClassification, setSelectedClassification] = useState('ALL');
  const [maxDistance, setMaxDistance] = useState(50);
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);
  const [assigningHospitalId, setAssigningHospitalId] = useState(null);
  const [reservingHospitalId, setReservingHospitalId] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState(null);

  // Fetch matches from API
  const fetchMatches = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      setError(null);
      const res = await matchingService.getMatchingHospitals(id, {
        maxDistanceKm: maxDistance
      });
      setData(res);
      // Auto-expand the top match
      if (res?.hospitals?.length > 0 && !expandedHospitalId) {
        setExpandedHospitalId(res.hospitals[0]?.hospital?.id);
      }
    } catch (err) {
      console.error('Failed to load matching hospitals:', err);
      setError(err.message || 'Failed to execute smart resource matching.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMatches();
    }
  }, [id, maxDistance]);

  // Handle direct hospital assignment
  const handleAssignHospital = async (hospital) => {
    setAssigningHospitalId(hospital.id);
    try {
      const payload = {
        status: 'PENDING_ACCEPTANCE',
        assigned_hospital_id: hospital.id,
        notes: `Matched via Smart Resource Coordination Engine. Assigned to ${hospital.name} with score ${hospital.coordination_score || 0}/100.`
      };

      await emergencyService.updateEmergencyStatus(id, payload);
      setAssignSuccess(`Emergency dispatch assigned to ${hospital.name}! Status advanced to PENDING_ACCEPTANCE.`);

      setTimeout(() => {
        navigate(`/emergency?id=${id}`, { replace: true });
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to assign hospital.');
    } finally {
      setAssigningHospitalId(null);
    }
  };

  // Handle resource reservation
  const handleReserveResources = async (hospital) => {
    setReservingHospitalId(hospital.id);
    try {
      await reservationService.reserveAllForHospital(
        id,
        hospital.id,
        `Resources reserved via Smart Resource Matching engine for ${hospital.name}`
      );
      setAssignSuccess(`Resource holds successfully placed at ${hospital.name}! Status updated to RESERVED.`);

      setTimeout(() => {
        navigate(`/emergency?id=${id}`, { replace: true });
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to place resource reservation.');
    } finally {
      setReservingHospitalId(null);
    }
  };

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    if (!data?.hospitals) return [];
    return data.hospitals.filter(h => {
      if (selectedClassification !== 'ALL' && h.classification !== selectedClassification) {
        return false;
      }
      return true;
    });
  }, [data, selectedClassification]);

  const emergency = data?.emergency_request;
  const summary = data?.summary;
  const demanded = data?.demanded_resources || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            to={`/emergency?id=${id}`}
            className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO INCIDENT DETAILS</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
                <span>Smart Resource Matching Engine</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  Phase 8
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-attribute hospital capability matching based on resource demands, travel distance, and capacity headroom.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchMatches()}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Re-evaluate Network</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Medical Explainability Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-900/60 flex items-start gap-3 shadow-lg">
        <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-cyan-300 uppercase font-mono tracking-wider">
            Operational Coordination Score Transparency Notice
          </span>
          <p className="text-slate-300 leading-relaxed">
            The coordination score (0–100) is deterministically computed from <strong>Resource Availability (50%)</strong>, 
            <strong> Proximity Distance (30%)</strong>, and <strong>Capacity Headroom (20%)</strong> with operational status modifiers. 
            <span className="text-cyan-300 font-medium"> This score is designed exclusively for logistical bed and equipment routing and does NOT constitute medical decisions or clinical triage advice.</span>
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {assignSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{assignSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Emergency Incident Context Header Card */}
      {emergency && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400">Target Incident:</span>
              <span className="font-mono text-base font-bold text-white tracking-wide">
                {emergency.tracking_code}
              </span>
              <PriorityBadge priority={emergency.priority} size="sm" />
              <EmergencyStatusBadge status={emergency.status} size="sm" />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Patient Ref: <strong className="text-slate-200">{emergency.patient_reference}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate"><strong>Location:</strong> {emergency.location}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-mono">
              <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
              <span><strong>Coordinates:</strong> {Number(emergency.latitude).toFixed(4)}, {Number(emergency.longitude).toFixed(4)}</span>
            </div>
          </div>

          {/* Demanded Resources Chips */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demanded Resource Requirements:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {demanded.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-2"
                >
                  <span className="text-white font-semibold">{item.resource_type}</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                    Qty: {item.required_quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics & Classification Filter Tabs */}
      {summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400">Total Evaluated</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {summary.total_facilities_evaluated}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Full Matches</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {summary.full_matches}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50">
              <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Partial Matches</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {summary.partial_matches}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>No Matches</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-400 mt-1">
                {summary.no_matches}
              </div>
            </div>
          </div>

          {/* Classification Tab Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              {[
                { key: 'ALL', label: 'All Candidates', count: summary.total_facilities_evaluated },
                { key: 'FULL MATCH', label: 'Full Match', count: summary.full_matches, color: 'text-emerald-400' },
                { key: 'PARTIAL MATCH', label: 'Partial Match', count: summary.partial_matches, color: 'text-amber-400' },
                { key: 'NO MATCH', label: 'No Match', count: summary.no_matches, color: 'text-slate-400' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedClassification(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 border ${
                    selectedClassification === tab.key
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedClassification === tab.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Radius Selector */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Max Radius:</span>
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none"
              >
                <option value={15}>15 km</option>
                <option value={30}>30 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Hospitals Match Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-4">
              <div className="h-6 bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-20 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredHospitals.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Matching Facilities</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No hospital matches were found under the selected classification or within the {maxDistance} km search radius.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHospitals.map((matchItem, index) => {
            const hospital = matchItem.hospital;
            const isFullMatch = matchItem.classification === 'FULL MATCH';
            const isPartialMatch = matchItem.classification === 'PARTIAL MATCH';
            const isNoMatch = matchItem.classification === 'NO MATCH';
            const isOffline = matchItem.operational_status === 'OFFLINE';
            const isDivert = matchItem.operational_status === 'DIVERT';

            const isExpanded = expandedHospitalId === hospital.id;

            return (
              <div
                key={hospital.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isFullMatch
                    ? 'bg-slate-900/70 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                    : isPartialMatch
                    ? 'bg-slate-900/50 border-amber-800/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-80'
                }`}
              >
                {/* Top Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        #{index + 1}
                      </span>
                      <h3 className="text-base font-bold text-white font-mono">
                        {hospital.name}
                      </h3>

                      {/* Operational Status Pill */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                        hospital.status === 'NORMAL'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                          : hospital.status === 'SURGE'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                          : hospital.status === 'DIVERT'
                          ? 'bg-rose-950/60 text-rose-400 border-rose-800 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {hospital.status}
                      </span>

                      {/* Match Classification Badge */}
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 border ${
                        isFullMatch
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isPartialMatch
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {isFullMatch && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {isPartialMatch && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        {isNoMatch && <XCircle className="w-3 h-3 text-slate-500" />}
                        <span>{matchItem.classification}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>{hospital.address}, {hospital.city}</span>
                      <span>•</span>
                      <span>{hospital.trauma_level || 'General Hospital'}</span>
                      {hospital.contact_phone && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400">{hospital.contact_phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score & Assignment Action */}
                  <div className="flex items-center gap-4">
                    {/* Transparent Coordination Score */}
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Coordination Score
                      </div>
                      <div className={`text-2xl font-black font-mono tracking-tight ${
                        matchItem.coordination_score >= 80
                          ? 'text-emerald-400'
                          : matchItem.coordination_score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}>
                        {matchItem.coordination_score}
                        <span className="text-xs text-slate-500 font-normal"> / 100</span>
                      </div>
                    </div>

                    {/* Action Buttons: Reserve Resources & Assign Facility */}
                    {!isOffline && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={reservingHospitalId === hospital.id || assigningHospitalId === hospital.id}
                          onClick={() => handleReserveResources(hospital)}
                          className="px-3 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-950/40 transition-all disabled:opacity-50"
                          title="Place transactional hold on required resources at this hospital"
                        >
                          {reservingHospitalId === hospital.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Reserving...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Reserve Resources</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={assigningHospitalId === hospital.id || reservingHospitalId === hospital.id}
                          onClick={() => handleAssignHospital(hospital)}
                          className={`px-3 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all ${
                            isFullMatch
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {assigningHospitalId === hospital.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Assigning...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Assign</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Metrics Bar: Distance, Utilization, Fulfillment */}
                <div className="p-4 bg-slate-950/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono border-b border-slate-800/40">
                  {/* Distance */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Haversine Distance</div>
                      <div className="text-white font-bold">
                        {matchItem.distance_km} km 
                        <span className="text-[10px] text-slate-500 font-normal ml-1">
                          (~{(matchItem.distance_km * 0.621371).toFixed(1)} mi)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resource Fulfillment */}
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                      matchItem.fulfillment.percentage === 100
                        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                        : 'bg-amber-950/50 border-amber-800 text-amber-400'
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Demand Fulfillment</div>
                      <div className="text-white font-bold">
                        {matchItem.fulfillment.percentage}% Satisfied
                        <span className="text-[10px] text-slate-500 font-normal ml-1">
                          ({matchItem.fulfillment.units_satisfied}/{matchItem.fulfillment.units_required} units)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Facility Utilization */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Resource Utilization</span>
                        <span className="text-slate-200">{matchItem.current_utilization_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            matchItem.current_utilization_pct > 80
                              ? 'bg-rose-500'
                              : matchItem.current_utilization_pct > 60
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, matchItem.current_utilization_pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Resource Breakdown Table & Score Explanation Toggle */}
                <div className="p-4 space-y-4">
                  {/* Demanded vs Available Resources Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Resource Satisfaction Breakdown</span>
                      </span>
                      {matchItem.missing_resources.length > 0 && (
                        <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{matchItem.missing_resources.length} Deficit Items</span>
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Resource Type</th>
                            <th className="py-2 px-3 text-center">Required</th>
                            <th className="py-2 px-3 text-center">Available</th>
                            <th className="py-2 px-3 text-center">Missing</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {matchItem.resources_required.map((reqRes, idx) => {
                            const availRes = matchItem.resources_available.find(r => r.resource_type === reqRes.resource_type);
                            const missingItem = matchItem.missing_resources.find(m => m.resource_type === reqRes.resource_type);
                            const availQty = availRes ? availRes.available_quantity : 0;
                            const missingQty = missingItem ? missingItem.missing_quantity : 0;
                            const isSatisfied = missingQty === 0;

                            return (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="py-2 px-3 font-semibold text-white">
                                  {reqRes.resource_type}
                                </td>
                                <td className="py-2 px-3 text-center text-cyan-400 font-bold">
                                  {reqRes.quantity}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-200">
                                  {availQty}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">
                                  {missingQty > 0 ? (
                                    <span className="text-rose-400">-{missingQty}</span>
                                  ) : (
                                    <span className="text-emerald-400">0</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    isSatisfied
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                      : availQty > 0
                                      ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                                      : 'bg-rose-950/60 text-rose-400 border-rose-800'
                                  }`}>
                                    {isSatisfied ? 'FULFILLED' : availQty > 0 ? 'PARTIAL DEFICIT' : 'UNAVAILABLE'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transparent Score Breakdown Box */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => setExpandedHospitalId(isExpanded ? null : hospital.id)}
                      className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white"
                    >
                      <span className="font-semibold uppercase text-cyan-400 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Transparent Coordination Score Breakdown</span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="pt-2 text-xs space-y-3 font-mono border-t border-slate-800/80 animate-in fade-in">
                        <p className="text-slate-300 leading-relaxed font-sans text-xs">
                          {matchItem.score_breakdown.explanation}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">Resource Match</div>
                            <div className="text-emerald-400 font-bold">
                              +{matchItem.score_breakdown.resource_score} / 50 pts
                            </div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">Proximity Factor</div>
                            <div className="text-cyan-400 font-bold">
                              +{matchItem.score_breakdown.proximity_score} / 30 pts
                            </div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">Capacity Headroom</div>
                            <div className="text-blue-400 font-bold">
                              +{matchItem.score_breakdown.headroom_score} / 20 pts
                            </div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <div className="text-[10px] text-slate-500">Operational Penalty</div>
                            <div className={`font-bold ${matchItem.score_breakdown.operational_penalty > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                              {matchItem.score_breakdown.operational_penalty > 0 
                                ? `-${matchItem.score_breakdown.operational_penalty} pts` 
                                : '0 pts'}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 italic">
                          *{matchItem.score_breakdown.disclaimer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
