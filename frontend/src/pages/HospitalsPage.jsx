import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hospitalService } from '../services/hospitalService';
import {
  Building2,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  Phone,
  ArrowRight,
  Edit2,
  Bed,
  Layers,
  HeartPulse,
  Wind,
  Droplets,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import StatusPill from '../components/StatusPill';
import HospitalModal from '../components/HospitalModal';

export default function HospitalsPage() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [traumaFilter, setTraumaFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const data = await hospitalService.getHospitals({
        search,
        status: statusFilter,
        trauma_level: traumaFilter
      });
      setHospitals(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load hospitals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [search, statusFilter, traumaFilter]);

  const handleOpenCreate = () => {
    setEditingHospital(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (hosp, e) => {
    if (e) e.stopPropagation();
    setEditingHospital(hosp);
    setIsModalOpen(true);
  };

  const handleSaveHospital = async (formData, hospitalId) => {
    if (hospitalId) {
      await hospitalService.updateHospital(hospitalId, formData);
      setToastMessage('Hospital updated successfully.');
    } else {
      await hospitalService.createHospital(formData);
      setToastMessage('Hospital registered successfully.');
    }
    setTimeout(() => setToastMessage(null), 3000);
    fetchHospitals();
  };

  // Authorization checks
  const isCoordinator = user?.role === 'COORDINATOR' || user?.role === 'ADMIN';
  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

  const canEditHospital = (hosp) => {
    if (isCoordinator) return true;
    if (isHospitalAdmin && user?.hospital_id === hosp.id) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Regional Hospital Network Directory
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry and management across verified emergency receiving centers in the metropolitan grid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCoordinator && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-900/30 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Hospital</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by facility name, code, address..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Operational Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:border-cyan-500"
          >
            <option value="">All Operational Statuses</option>
            <option value="NORMAL">NORMAL (Operational)</option>
            <option value="SURGE">SURGE (High Load)</option>
            <option value="DIVERT">DIVERT (Diverting Patients)</option>
            <option value="LOCKDOWN">LOCKDOWN</option>
          </select>
        </div>

        {/* Trauma Level Filter */}
        <div>
          <select
            value={traumaFilter}
            onChange={(e) => setTraumaFilter(e.target.value)}
            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:border-cyan-500"
          >
            <option value="">All Trauma Tiers</option>
            <option value="Level 1">Level 1 Trauma Center</option>
            <option value="Level 2">Level 2 Trauma Center</option>
            <option value="Level 3">Level 3 Trauma Center</option>
            <option value="Specialized">Specialized Facility</option>
            <option value="Community">Community Clinic</option>
          </select>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading hospital network telemetry...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
          {error}
        </div>
      ) : hospitals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-base text-white">No Hospitals Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No hospital matches the current search and filter criteria.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white hover:text-cyan-400 transition-colors">
                        <Link to={`/hospitals/${hosp.id}`}>{hosp.name}</Link>
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {hosp.code} • {hosp.tier}
                    </span>
                  </div>
                  <StatusPill status={hosp.status} />
                </div>

                {/* Address & Trauma badge */}
                <div className="space-y-1 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                    <span className="truncate">{hosp.address}, {hosp.city}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{hosp.contact_phone}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-400 font-medium">{hosp.trauma_level}</span>
                  </p>
                </div>

                {/* Resource Metrics Mini Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Available ICU</span>
                    <p className="text-sm font-bold font-mono text-cyan-400">{hosp.available_icu_beds}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">General Beds</span>
                    <p className="text-sm font-bold font-mono text-emerald-400">{hosp.available_general_beds}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Blood Bank</span>
                    <p className="text-sm font-bold font-mono text-amber-400">{hosp.available_blood_units} Units</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Departments</span>
                    <p className="text-sm font-bold font-mono text-white">{hosp.department_count} Depts</p>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {canEditHospital(hosp) ? (
                  <button
                    onClick={(e) => handleOpenEdit(hosp, e)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Edit Facility</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Read-only Network View</span>
                )}

                <Link
                  to={`/hospitals/${hosp.id}`}
                  className="px-3 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30 ml-auto"
                >
                  <span>Departments & Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Hospital Name & Code</th>
                  <th className="py-3.5 px-4">Trauma Tier</th>
                  <th className="py-3.5 px-4">City / Address</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">ICU Free</th>
                  <th className="py-3.5 px-4">General Free</th>
                  <th className="py-3.5 px-4">Depts</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {hospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <Link to={`/hospitals/${hosp.id}`} className="hover:text-cyan-400">
                        {hosp.name}
                      </Link>
                      <span className="block text-[10px] font-mono text-slate-500">{hosp.code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{hosp.trauma_level}</td>
                    <td className="py-3 px-4 text-slate-400">{hosp.address}, {hosp.city}</td>
                    <td className="py-3 px-4"><StatusPill status={hosp.status} /></td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{hosp.available_icu_beds}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{hosp.available_general_beds}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{hosp.department_count}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEditHospital(hosp) && (
                          <button
                            onClick={(e) => handleOpenEdit(hosp, e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                            title="Edit Hospital"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link
                          to={`/hospitals/${hosp.id}`}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 font-semibold text-[11px]"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hospital Modal (Create / Edit) */}
      <HospitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHospital}
        hospital={editingHospital}
      />
    </div>
  );
}
