import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { apiClient } from '../services/apiClient';
import StatusPill from '../components/StatusPill';
import {
  Activity,
  Building2,
  AlertTriangle,
  HeartPulse,
  Bed,
  Droplet,
  Wind,
  Search,
  CheckCircle2,
  Clock,
  Radio,
  BarChart3,
  MapPin,
  X,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Flame,
  Phone,
  Eye,
  AlertCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function CoordinatorDashboardPage() {
  const { user } = useAuth();

  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(15); // 15s default
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospitalStatus, setSelectedHospitalStatus] = useState('ALL');

  // Emergency Request Modal
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [formData, setFormData] = useState({
    priority: 'CRITICAL',
    incident_category: 'TRAUMA',
    patient_reference: '',
    incident_address: '',
    notes: ''
  });

  const timerRef = useRef(null);

  // Fetch telemetry
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      setError(null);
      const overview = await dashboardService.getOverview();
      setData(overview);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load command center overview:', err);
      setError(err.message || 'Failed to connect to Command Center telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Real-time polling timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchData();
    }, autoRefreshInterval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval]);

  // Create emergency request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      await apiClient.post('/coordinator/emergency-requests', formData);
      setModalSuccess(true);
      setTimeout(() => {
        setModalSuccess(false);
        setShowModal(false);
        setFormData({
          priority: 'CRITICAL',
          incident_category: 'TRAUMA',
          patient_reference: '',
          incident_address: '',
          notes: ''
        });
        fetchData();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to dispatch emergency incident');
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    if (!data?.hospital_status?.hospitals) return [];
    return data.hospital_status.hospitals.filter(h => {
      const matchesSearch = !searchTerm ||
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.trauma_level.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedHospitalStatus === 'ALL' || h.status === selectedHospitalStatus;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, selectedHospitalStatus]);

  // Format relative/short time
  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // --------------------------------------------------------------------------
  // RENDER: LOADING SKELETON STATE
  // --------------------------------------------------------------------------
  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-72 bg-slate-800 rounded-lg" />
            <div className="h-4 w-96 bg-slate-800/60 rounded-lg" />
          </div>
          <div className="h-10 w-44 bg-slate-800 rounded-xl" />
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-800/40 border border-slate-800 p-4 space-y-3">
              <div className="h-4 w-24 bg-slate-700/60 rounded" />
              <div className="h-8 w-32 bg-slate-700 rounded" />
              <div className="h-2 w-full bg-slate-800 rounded" />
            </div>
          ))}
        </div>

        {/* Big Panels Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-slate-800/30 border border-slate-800" />
          <div className="h-96 rounded-2xl bg-slate-800/30 border border-slate-800" />
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // --------------------------------------------------------------------------
  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-slate-900 border border-rose-800/80 text-center shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Telemetry Link Interrupted</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all shadow-lg shadow-rose-600/30"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const emgReqs = data?.active_emergency_requests?.list || [];
  const alerts = data?.critical_alerts || [];
  const bloodShortages = data?.blood_groups_below_threshold || [];
  const util = data?.resource_utilization || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. COMMAND HEADER */}
      <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                REGIONAL COMMAND CENTER • PHASE 6
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                DATABASE TELEMETRY LIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Metropolis Hospital Resource Oversight
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time synchronization across {data?.total_hospitals} regional facilities. Live capacity tracking for emergency coordination and smart patient distribution.
            </p>
          </div>

          {/* Controls & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-refresh select */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Poll:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-white">5s</option>
                <option value={15} className="bg-slate-900 text-white">15s</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
                <option value={0} className="bg-slate-900 text-white">Manual</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{lastUpdated ? formatTime(lastUpdated) : 'Refresh'}</span>
            </button>

            {/* Dispatch Incident Modal Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch Emergency</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI CARDS (8 Critical Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Operational Hospitals */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hospital Facilities</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.operational_hospitals}</span>
              <span className="text-xs text-slate-400 font-mono">/ {data?.total_hospitals} Active</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{Math.round(((data?.operational_hospitals || 0) / (data?.total_hospitals || 1)) * 100)}% Operational Readiness</span>
            </div>
          </div>
        </div>

        {/* Available ICU Beds */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available ICU Beds</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.available_icu_beds}</span>
              <span className="text-xs text-slate-400 font-mono">/ {data?.total_icu_beds} Total</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all"
                style={{ width: `${util?.icu_utilization || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Occupancy: {util?.icu_utilization}%</span>
              <span className="text-rose-400 font-semibold">High Care</span>
            </div>
          </div>
        </div>

        {/* Available General Beds */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available General Beds</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.available_general_beds}</span>
              <span className="text-xs text-slate-400 font-mono">/ {data?.total_general_beds} Total</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${util?.general_bed_utilization || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Occupancy: {util?.general_bed_utilization}%</span>
              <span className="text-emerald-400 font-semibold">Inpatient Wings</span>
            </div>
          </div>
        </div>

        {/* Emergency Bay Capacity */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency Bay Capacity</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.emergency_capacity?.available}</span>
              <span className="text-xs text-slate-400 font-mono">/ {data?.emergency_capacity?.total} Bays</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${data?.emergency_capacity?.utilization || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Utilization: {data?.emergency_capacity?.utilization}%</span>
              <span className="text-amber-400 font-semibold">Trauma / Bays</span>
            </div>
          </div>
        </div>

        {/* Available Ventilators */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Ventilators</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.available_ventilators}</span>
              <span className="text-xs text-slate-400 font-mono">/ {data?.total_ventilators} Devices</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all"
                style={{ width: `${util?.ventilator_utilization || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Deployed: {util?.ventilator_utilization}%</span>
              <span className="text-cyan-400 font-semibold">Biomedical</span>
            </div>
          </div>
        </div>

        {/* Blood Depository Below Threshold */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Blood Below Threshold</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">{data?.blood_deficit_count || 0}</span>
              <span className="text-xs text-slate-400 font-mono">Groups at Risk</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Total available: <strong className="text-white font-mono">{util?.total_blood_units}</strong> blood units network-wide
            </p>
          </div>
        </div>

        {/* Active Emergency Requests */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Emergencies</span>
            <div className="p-2 rounded-xl bg-rose-600/10 text-rose-400 border border-rose-600/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{data?.active_emergency_requests?.total_active || 0}</span>
              <span className="text-xs text-rose-400 font-bold">({data?.active_emergency_requests?.critical_count || 0} CRITICAL)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>{data?.active_emergency_requests?.high_count || 0} High Priority</span>
              <Link to="/emergency" className="text-cyan-400 hover:underline font-semibold">
                Open Console →
              </Link>
            </div>
          </div>
        </div>

        {/* Overall System Headroom */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Bed Headroom</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{100 - (util?.overall_bed_utilization || 0)}%</span>
              <span className="text-xs text-slate-400 font-mono">Free Buffer</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${util?.overall_bed_utilization || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Utilized: {util?.overall_bed_utilization}%</span>
              <span className="text-purple-300 font-semibold">City Buffer</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CRITICAL ALERTS TICKER / BANNER */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-rose-900/50 bg-slate-900/90 p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>LIVE CRITICAL ALERTS ({alerts.length})</span>
            </div>
            <span className="text-xs text-slate-400">Immediate coordinator intervention required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                  alert.type === 'CRITICAL'
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${alert.type === 'CRITICAL' ? 'bg-rose-400 animate-ping' : 'bg-amber-400'}`} />
                      {alert.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{formatTime(alert.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                {alert.hospital_id && (
                  <Link
                    to={`/hospitals/${alert.hospital_id}`}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 pt-1"
                  >
                    <span>View Facility Telemetry</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT SPLIT: Hospital Status & Resource Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Network Hospitals Live Status Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-lg text-white">Hospital Status & Live Capacity</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time bed occupancy, blood stores, and facility operational tiers.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter facility..."
                  className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Status pills toggle */}
              <select
                value={selectedHospitalStatus}
                onChange={(e) => setSelectedHospitalStatus(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NORMAL">NORMAL</option>
                <option value="SURGE">SURGE</option>
                <option value="DIVERT">DIVERT</option>
              </select>
            </div>
          </div>

          {/* Hospitals Cards List */}
          {filteredHospitals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
              No hospitals matching the search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHospitals.map((h) => {
                const isDivert = h.status === 'DIVERT';
                const isSurge = h.status === 'SURGE';

                return (
                  <div
                    key={h.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all hover:border-slate-600 ${
                      isDivert ? 'bg-rose-950/20 border-rose-800/40' :
                      isSurge ? 'bg-amber-950/20 border-amber-800/40' :
                      'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-white hover:text-cyan-400 transition-colors">
                            <Link to={`/hospitals/${h.id}`}>{h.name}</Link>
                          </h4>
                          <span className="text-[10px] text-slate-400">{h.city} • {h.trauma_level} • {h.tier}</span>
                        </div>
                        <StatusPill status={h.status} />
                      </div>

                      {/* Bed Occupancy Bar */}
                      <div className="space-y-1 my-2.5">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>Occupancy: {h.occupancy_rate}%</span>
                          <span>{h.available_beds} Free / {h.total_beds} Total</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              h.occupancy_rate >= 90 ? 'bg-rose-500' :
                              h.occupancy_rate >= 75 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, h.occupancy_rate)}%` }}
                          />
                        </div>
                      </div>

                      {/* Key metrics row */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
                        <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
                          <div className="text-[10px] text-slate-400">ICU Free</div>
                          <div className="text-xs font-bold text-white">{h.available_icu}</div>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
                          <div className="text-[10px] text-slate-400">Gen Free</div>
                          <div className="text-xs font-bold text-white">{h.available_gen}</div>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
                          <div className="text-[10px] text-slate-400">Vents</div>
                          <div className="text-xs font-bold text-white">{h.available_vent}</div>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80">
                          <div className="text-[10px] text-slate-400">Bays</div>
                          <div className="text-xs font-bold text-white">{h.available_bays}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {h.phone}
                      </span>
                      <Link
                        to={`/hospitals/${h.id}`}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-0.5"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Resource Utilization & Blood Depository Alerts */}
        <div className="space-y-6">
          {/* Resource Utilization Radar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Resource Utilization</h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">LIVE TELEMETRY</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* ICU Beds */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>ICU Beds ({data?.available_icu_beds} Free / {data?.total_icu_beds} Total)</span>
                  <span className="font-mono font-bold text-rose-400">{util?.icu_utilization}% In Use</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${util?.icu_utilization}%` }} />
                </div>
              </div>

              {/* General Beds */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>General Beds ({data?.available_general_beds} Free / {data?.total_general_beds} Total)</span>
                  <span className="font-mono font-bold text-emerald-400">{util?.general_bed_utilization}% In Use</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${util?.general_bed_utilization}%` }} />
                </div>
              </div>

              {/* Ventilators */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Ventilators ({data?.available_ventilators} Free / {data?.total_ventilators} Total)</span>
                  <span className="font-mono font-bold text-cyan-400">{util?.ventilator_utilization}% Deployed</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${util?.ventilator_utilization}%` }} />
                </div>
              </div>

              {/* Emergency Capacity */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Emergency Bays ({data?.emergency_capacity?.available} Free / {data?.emergency_capacity?.total} Bays)</span>
                  <span className="font-mono font-bold text-amber-400">{data?.emergency_capacity?.utilization}% In Use</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${data?.emergency_capacity?.utilization}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Complete asset inventory:</span>
              <Link to="/resources" className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
                <span>Resource Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Blood Shortages Watchlist */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-base text-white">Blood Depository Alerts</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">
                {bloodShortages.length} Deficits
              </span>
            </div>

            {bloodShortages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-900">
                All blood groups operating within safe reserve thresholds.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {bloodShortages.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/40 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-300 font-mono">{b.resource_label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-semibold">
                          Deficit: -{b.deficit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{b.hospital_name}</p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-white">{b.available_quantity} {b.unit_of_measure}</div>
                      <div className="text-[10px] text-slate-400">Min: {b.threshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. ACTIVE EMERGENCY INCIDENTS FEED */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="font-bold text-lg text-white">
                Active Emergency Incidents ({emgReqs.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live incoming triage dispatches and hospital routing assignments.
            </p>
          </div>

          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <span>Open Triage Dispatch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {emgReqs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
            No active emergency incidents currently requiring hospital routing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tracking Code</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Patient Reference</th>
                  <th className="py-3 px-4">Incident Location</th>
                  <th className="py-3 px-4">Assigned Facility</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {emgReqs.map((emg) => {
                  const isCrit = emg.priority === 'CRITICAL';
                  const isHigh = emg.priority === 'HIGH';

                  return (
                    <tr key={emg.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                      <td className="py-3.5 px-4 font-bold text-cyan-400">
                        {emg.tracking_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
                          isHigh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {emg.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-semibold text-white">
                        {emg.incident_category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {emg.patient_reference}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300 max-w-[200px] truncate" title={emg.incident_address}>
                        {emg.incident_address}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        {emg.assigned_hospital_name ? (
                          <span className="text-emerald-400 font-semibold">{emg.assigned_hospital_name}</span>
                        ) : (
                          <span className="text-amber-400 italic">Pending Assignment</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <StatusPill status={emg.status === 'PENDING' ? 'SURGE' : 'ONLINE'} customLabel={emg.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatTime(emg.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. DISPATCH EMERGENCY REQUEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-rose-800/80 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/30">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-bold text-white text-base">Dispatch Regional Emergency Incident</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-sm">
              {modalSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emergency incident dispatched into coordination network!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Severity Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL (Immediate Life Threat)</option>
                    <option value="HIGH">HIGH (Urgent Intervention)</option>
                    <option value="MEDIUM">MEDIUM (Stable / Monitored)</option>
                    <option value="LOW">LOW (Non-Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Incident Category
                  </label>
                  <select
                    value={formData.incident_category}
                    onChange={(e) => setFormData({ ...formData, incident_category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="TRAUMA">TRAUMA</option>
                    <option value="CARDIAC">CARDIAC</option>
                    <option value="RESPIRATORY">RESPIRATORY</option>
                    <option value="MASS_CASUALTY">MASS CASUALTY</option>
                    <option value="BLOOD_URGENCY">BLOOD URGENCY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Patient Reference Code
                </label>
                <input
                  type="text"
                  value={formData.patient_reference}
                  onChange={(e) => setFormData({ ...formData, patient_reference: e.target.value })}
                  placeholder="e.g. ANON-PT-9421 or ER-881"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Incident Street Address / Location
                </label>
                <input
                  type="text"
                  value={formData.incident_address}
                  onChange={(e) => setFormData({ ...formData, incident_address: e.target.value })}
                  placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Triage Notes / Required Resources
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Requires 2 units O- Blood and 1 mechanical ventilator en route"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{modalLoading ? 'Dispatching...' : 'Dispatch Incident'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
