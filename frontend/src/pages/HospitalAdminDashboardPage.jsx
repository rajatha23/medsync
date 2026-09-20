import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import {
  Building2,
  Bed,
  HeartPulse,
  Droplets,
  Wind,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  MapPin,
  RefreshCw,
  Loader2,
  Phone
} from 'lucide-react';
import StatusPill from '../components/StatusPill';
import MetricCard from '../components/MetricCard';

export default function HospitalAdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingResourceId, setSavingResourceId] = useState(null);
  const [saveSuccessId, setSaveSuccessId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Local state for resource edits
  const [resourceEdits, setResourceEdits] = useState({});

  const fetchHospitalData = async () => {
    try {
      setLoading(true);
      const [hospRes, reqRes] = await Promise.all([
        apiClient.get('/hospital-admin/hospital'),
        apiClient.get('/hospital-admin/incoming-requests')
      ]);

      setData(hospRes.data);
      setIncomingRequests(reqRes.data || []);

      // Initialize local editable state
      const initialEdits = {};
      hospRes.data.resources?.forEach(r => {
        initialEdits[r.id] = {
          total_capacity: r.total_capacity,
          occupied_quantity: r.occupied_quantity,
          reserved_quantity: r.reserved_quantity,
          status: r.status
        };
      });
      setResourceEdits(initialEdits);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load hospital management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();
  }, []);

  const handleResourceChange = (resourceId, field, delta) => {
    setResourceEdits(prev => {
      const current = prev[resourceId] || {};
      const newVal = Math.max(0, (current[field] || 0) + delta);
      return {
        ...prev,
        [resourceId]: {
          ...current,
          [field]: newVal
        }
      };
    });
  };

  const handleSaveResource = async (resourceId) => {
    setSavingResourceId(resourceId);
    try {
      const payload = resourceEdits[resourceId];
      await apiClient.put(`/hospital-admin/resources/${resourceId}`, payload);
      setSaveSuccessId(resourceId);
      setTimeout(() => setSaveSuccessId(null), 2000);
      fetchHospitalData();
    } catch (err) {
      alert(err.message || 'Failed to update resource');
    } finally {
      setSavingResourceId(null);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    setActionLoadingId(requestId);
    try {
      await apiClient.patch(`/hospital-admin/requests/${requestId}/status`, {
        status,
        reason: status === 'ACCEPTED' ? 'Triage coordinator accepted patient' : 'Bed/Resource diversion'
      });
      fetchHospitalData();
    } catch (err) {
      alert(err.message || `Failed to update request to ${status}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading facility telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
        {error}
      </div>
    );
  }

  const hospital = data?.hospital;
  const stats = data?.stats;
  const resources = data?.resources || [];

  return (
    <div className="space-y-6">
      {/* Facility Header Banner */}
      <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Building2 className="w-3.5 h-3.5" /> HOSPITAL ADMINISTRATOR
              </span>
              <span className="text-xs text-slate-400">Logged in as {user?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {hospital?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" />{hospital?.address}</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold">{hospital?.trauma_level}</span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-400"><Phone className="w-3 h-3" />{hospital?.contact_phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusPill status={hospital?.status} />
            <button
              onClick={fetchHospitalData}
              title="Refresh Facility State"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Facility Capacity Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Hospital ICU Beds"
          value={`${stats?.available_icu || 0} / ${stats?.total_icu || 0}`}
          subtext="Internal critical care buffer"
          icon={HeartPulse}
          trend={`${stats?.available_icu || 0} Ready`}
          trendPositive={true}
          variant="default"
        />
        <MetricCard
          title="General Ward Inpatient Beds"
          value={`${stats?.available_general || 0} / ${stats?.total_general || 0}`}
          subtext="Available for intake"
          icon={Bed}
          trend="Inpatient capacity"
          trendPositive={true}
          variant="success"
        />
        <MetricCard
          title="Facility Blood Inventory"
          value={`${stats?.total_blood_units || 0} Units`}
          subtext="Stored in internal blood bank"
          icon={Droplets}
          trend="Reserve stock"
          trendPositive={true}
          variant="warning"
        />
        <MetricCard
          title="Operable Ventilators"
          value={`${stats?.available_ventilators || 0} Free`}
          subtext="Biomedical equipment"
          icon={Wind}
          trend="Ready for dispatch"
          trendPositive={true}
          variant="default"
        />
      </div>

      {/* Two Column Layout: Resource Telemetry Editor + Incoming Emergencies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Telemetry Editor */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                <Bed className="w-4 h-4 text-emerald-400" />
                <span>Department Resource Telemetry & Capacity Management</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Update total capacity, occupied beds, and reserved holds. Changes take effect across the network in real-time.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              FACILITY ISOLATION ENFORCED
            </span>
          </div>

          <div className="space-y-3">
            {resources.map((res) => {
              const edit = resourceEdits[res.id] || res;
              const computedAvailable = Math.max(0, edit.total_capacity - edit.occupied_quantity - edit.reserved_quantity);
              const isSaving = savingResourceId === res.id;
              const isSaved = saveSuccessId === res.id;

              return (
                <div
                  key={res.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{res.resource_type.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {res.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{res.department_name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400">Available</span>
                        <p className="text-base font-bold font-mono text-emerald-400">
                          {computedAvailable} <span className="text-xs text-slate-500 font-normal">{res.unit_of_measure}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleSaveResource(res.id)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSaved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        ) : isSaved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Steppers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {/* Total Capacity Stepper */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400">Total Capacity</span>
                        <p className="text-sm font-bold font-mono text-slate-200">{edit.total_capacity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResourceChange(res.id, 'total_capacity', -1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleResourceChange(res.id, 'total_capacity', 1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Occupied Stepper */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400">Occupied</span>
                        <p className="text-sm font-bold font-mono text-amber-400">{edit.occupied_quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResourceChange(res.id, 'occupied_quantity', -1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleResourceChange(res.id, 'occupied_quantity', 1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Reserved Stepper */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400">Reserved (Hold)</span>
                        <p className="text-sm font-bold font-mono text-cyan-400">{edit.reserved_quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResourceChange(res.id, 'reserved_quantity', -1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleResourceChange(res.id, 'reserved_quantity', 1)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incoming Emergency Requests & Triage Actions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="font-semibold text-sm text-white">Incoming Emergency Requests</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40">
              TRIAGE DESK
            </span>
          </div>

          <div className="space-y-3">
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No active incoming requests for {hospital?.name}.
              </p>
            ) : (
              incomingRequests.map((req) => {
                const isActing = actionLoadingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200">{req.tracking_code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        req.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}>
                        {req.priority}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-white">{req.incident_category} • {req.patient_reference}</p>
                      <p className="text-[11px] text-slate-400">{req.incident_address}</p>
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900 p-2 rounded border border-slate-800/60">
                        {req.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-cyan-400">
                        Status: {req.status}
                      </span>

                      {req.status !== 'ACCEPTED' && req.status !== 'COMPLETED' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRequestAction(req.id, 'DIVERTED')}
                            disabled={isActing}
                            className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] font-semibold border border-rose-800/60 transition-colors disabled:opacity-50"
                          >
                            Divert
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, 'ACCEPTED')}
                            disabled={isActing}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
