import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { resourceService } from '../services/resourceService';
import { hospitalService } from '../services/hospitalService';
import StatusPill from '../components/StatusPill';
import ResourceModal from '../components/ResourceModal';
import {
  Bed,
  Droplet,
  Wind,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Edit3,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  Lock
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Assets', icon: Activity },
  { id: 'BEDS', label: 'Beds', icon: Bed },
  { id: 'BLOOD', label: 'Blood Reserves', icon: Droplet },
  { id: 'EQUIPMENT', label: 'Equipment', icon: Wind },
  { id: 'CAPACITY', label: 'Emergency Capacity', icon: Activity }
];

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'LIMITED', 'CRITICAL', 'UNAVAILABLE'];

export default function ResourcesPage() {
  const { user, role } = useAuth();
  const isHospitalAdmin = role === 'HOSPITAL_ADMIN';
  const isCoordinator = role === 'COORDINATOR';

  // State
  const [resources, setResources] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedHospital, setSelectedHospital] = useState(isHospitalAdmin ? (user?.hospital_id || '') : '');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setError(null);
      const params = {};
      if (selectedHospital) params.hospital_id = selectedHospital;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const [resData, sumData] = await Promise.all([
        resourceService.getResources(params),
        resourceService.getResourceSummary({ hospital_id: selectedHospital || undefined })
      ]);

      setResources(resData);
      setSummary(sumData);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load hospitals list for filters
  useEffect(() => {
    async function loadHospitals() {
      try {
        const hospList = await hospitalService.getHospitals();
        setHospitals(hospList);
      } catch (err) {
        console.warn('Failed to fetch hospitals list:', err);
      }
    }
    loadHospitals();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchData();
  }, [selectedHospital, selectedCategory, selectedStatus]);

  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Open Edit modal
  const handleOpenEdit = async (resItem) => {
    setEditingResource(resItem);
    try {
      if (resItem.hospital_id) {
        const depts = await hospitalService.getDepartments(resItem.hospital_id);
        setDepartments(depts || []);
      }
    } catch (err) {
      setDepartments([]);
    }
    setModalOpen(true);
  };

  // Open Create modal
  const handleOpenCreate = async () => {
    setEditingResource(null);
    const targetHospId = user?.hospital_id || selectedHospital;
    if (targetHospId) {
      try {
        const depts = await hospitalService.getDepartments(targetHospId);
        setDepartments(depts || []);
      } catch (err) {
        setDepartments([]);
      }
    }
    setModalOpen(true);
  };

  const handleSaveResource = (saved) => {
    fetchData();
  };

  // Filtered in-memory resources for search input
  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const q = searchQuery.toLowerCase().trim();
    return resources.filter(r =>
      (r.resource_label && r.resource_label.toLowerCase().includes(q)) ||
      (r.resource_type && r.resource_type.toLowerCase().includes(q)) ||
      (r.hospital_name && r.hospital_name.toLowerCase().includes(q)) ||
      (r.department_name && r.department_name.toLowerCase().includes(q))
    );
  }, [resources, searchQuery]);

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-cyan-400" />
              Hospital Resource Management
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 5 Live
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isHospitalAdmin 
              ? `Real-time resource tracking and capacity telemetry for ${user?.hospital_id || 'your facility'}.`
              : 'Network-wide resource intelligence, real-time telemetry, and critical threshold monitoring.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 rounded-xl text-sm font-medium transition-colors shadow-sm"
            title="Refresh resource inventory"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {isHospitalAdmin && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Dashboard Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* ICU Beds */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICU Beds</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{summary.icuBeds.available}</span>
                <span className="text-xs text-slate-400 font-mono">/ {summary.icuBeds.total} Total</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${summary.icuBeds.total > 0 ? (summary.icuBeds.available / summary.icuBeds.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* General Beds */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">General Beds</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{summary.generalBeds.available}</span>
                <span className="text-xs text-slate-400 font-mono">/ {summary.generalBeds.total} Total</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${summary.generalBeds.total > 0 ? (summary.generalBeds.available / summary.generalBeds.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Blood Units */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blood Depository</span>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{summary.bloodUnits.available}</span>
                <span className="text-xs text-slate-400">units in reserve</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Across 8 blood groups (A±, B±, AB±, O±)</p>
            </div>
          </div>

          {/* Ventilators */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventilators</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Wind className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{summary.ventilators.available}</span>
                <span className="text-xs text-slate-400 font-mono">/ {summary.ventilators.total} Ready</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${summary.ventilators.total > 0 ? (summary.ventilators.available / summary.ventilators.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Emergency Capacity */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Bays</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{summary.emergencyCapacity.available}</span>
                <span className="text-xs text-slate-400 font-mono">/ {summary.emergencyCapacity.total} Bays</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${summary.emergencyCapacity.total > 0 ? (summary.emergencyCapacity.available / summary.emergencyCapacity.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown Bar */}
      {summary && (
        <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-2xl gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Threshold Telemetry:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                selectedStatus === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-emerald-500/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Available ({summary.statusBreakdown.AVAILABLE || 0})</span>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'LIMITED' ? 'ALL' : 'LIMITED')}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                selectedStatus === 'LIMITED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Limited ({summary.statusBreakdown.LIMITED || 0})</span>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                selectedStatus === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-rose-500/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Critical ({summary.statusBreakdown.CRITICAL || 0})</span>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'UNAVAILABLE' ? 'ALL' : 'UNAVAILABLE')}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                selectedStatus === 'UNAVAILABLE'
                  ? 'bg-red-950 text-red-300 border-red-700'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-red-500/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>Unavailable ({summary.statusBreakdown.UNAVAILABLE || 0})</span>
            </button>

            {selectedStatus !== 'ALL' && (
              <button
                onClick={() => setSelectedStatus('ALL')}
                className="text-xs text-cyan-400 hover:underline ml-2"
              >
                Clear Status Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Hospital Select & View Mode Toggle */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets (e.g. ICU, Blood O-, Ventilator, hospital name)..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Hospital Selector (for Coordinators) */}
            {isCoordinator && (
              <div className="w-64">
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">All Network Hospitals</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading hospital resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Matching Resources</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            No resources matched your current filter criteria. Try adjusting your search query, status, or category filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              if (!isHospitalAdmin) setSelectedHospital('');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const avail = res.available_quantity ?? 0;
            const total = res.total_quantity ?? res.total_capacity ?? 0;
            const threshold = res.threshold ?? res.critical_threshold ?? 5;
            const percent = total > 0 ? Math.round((avail / total) * 100) : 0;
            const canEdit = isHospitalAdmin && user?.hospital_id === res.hospital_id;

            return (
              <div
                key={res.id}
                className="bg-slate-800/60 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl group"
              >
                <div>
                  {/* Top Bar: Category & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-700/60 text-slate-300 uppercase tracking-wider">
                      {res.category}
                    </span>
                    <StatusPill status={res.status} />
                  </div>

                  {/* Resource Title & Facility */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {res.resource_label || res.resource_type.replace(/_/g, ' ')}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{res.hospital_name || 'Hospital'}</span>
                      {res.department_name && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 truncate">{res.department_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl mb-4 space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Available / Total</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-white">{avail}</span>
                        <span className="text-xs text-slate-400 font-mono">/ {total} {res.unit_of_measure}</span>
                      </div>
                    </div>

                    {/* Headroom Bar */}
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          res.status === 'AVAILABLE' ? 'bg-emerald-500' :
                          res.status === 'LIMITED' ? 'bg-amber-500' :
                          res.status === 'CRITICAL' ? 'bg-rose-500' : 'bg-red-700'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Threshold: {threshold}</span>
                      <span>{percent}% Headroom</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Timestamp & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400" title={`Updated: ${res.last_updated}`}>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Updated {formatTime(res.last_updated)}</span>
                  </div>

                  {canEdit ? (
                    <button
                      onClick={() => handleOpenEdit(res)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 font-semibold border border-cyan-500/20 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400" title="Coordinators have network read-only visibility">
                      <Lock className="w-3 h-3" />
                      <span>Read-Only</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Resource Asset</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Hospital & Department</th>
                  <th className="py-3.5 px-4 font-mono">Available / Total</th>
                  <th className="py-3.5 px-4 font-mono">Threshold</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredResources.map((res) => {
                  const avail = res.available_quantity ?? 0;
                  const total = res.total_quantity ?? res.total_capacity ?? 0;
                  const threshold = res.threshold ?? res.critical_threshold ?? 5;
                  const canEdit = isHospitalAdmin && user?.hospital_id === res.hospital_id;

                  return (
                    <tr key={res.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">
                          {res.resource_label || res.resource_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{res.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {res.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{res.hospital_name}</div>
                        <div className="text-xs text-slate-400">{res.department_name || 'General Facility'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-white">{avail}</span>
                        <span className="text-slate-400 text-xs"> / {total} {res.unit_of_measure}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {threshold}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={res.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatTime(res.last_updated)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {canEdit ? (
                          <button
                            onClick={() => handleOpenEdit(res)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Read-Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Resource Modal */}
      {modalOpen && (
        <ResourceModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingResource(null);
          }}
          onSave={handleSaveResource}
          resource={editingResource}
          hospitalId={user?.hospital_id || selectedHospital}
          hospitalName={editingResource?.hospital_name || (hospitals.find(h => h.id === user?.hospital_id)?.name)}
          departments={departments}
        />
      )}
    </div>
  );
}
