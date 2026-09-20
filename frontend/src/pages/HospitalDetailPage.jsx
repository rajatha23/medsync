import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hospitalService } from '../services/hospitalService';
import {
  Building2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Plus,
  Layers,
  HeartPulse,
  Bed,
  Droplets,
  Wind,
  Trash2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Compass
} from 'lucide-react';
import StatusPill from '../components/StatusPill';
import MetricCard from '../components/MetricCard';
import HospitalModal from '../components/HospitalModal';
import DepartmentModal from '../components/DepartmentModal';
import ResourceModal from '../components/ResourceModal';

export default function HospitalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const fetchHospital = async () => {
    try {
      setLoading(true);
      const data = await hospitalService.getHospitalById(id);
      setHospital(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch hospital details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospital();
  }, [id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Hospital Edit
  const handleSaveHospital = async (formData) => {
    await hospitalService.updateHospital(id, formData);
    showToast('Hospital details updated successfully.');
    fetchHospital();
  };

  // Department Actions
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (formData, deptId) => {
    if (deptId) {
      await hospitalService.updateDepartment(deptId, formData);
      showToast('Department updated successfully.');
    } else {
      await hospitalService.createDepartment(id, formData);
      showToast('Department created successfully.');
    }
    fetchHospital();
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (window.confirm(`Are you sure you want to remove department "${deptName}"?`)) {
      try {
        await hospitalService.deleteDepartment(deptId);
        showToast(`Department "${deptName}" removed.`);
        fetchHospital();
      } catch (err) {
        alert(err.message || 'Failed to delete department.');
      }
    }
  };

  // Authorization check
  const isCoordinator = user?.role === 'COORDINATOR' || user?.role === 'ADMIN';
  const isHospitalAdminForThis = user?.role === 'HOSPITAL_ADMIN' && user?.hospital_id === id;
  const canModify = isCoordinator || isHospitalAdminForThis;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading facility intelligence...</p>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="space-y-4 py-8">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
          {error || 'Hospital not found.'}
        </div>
        <Link
          to="/hospitals"
          className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hospital Directory</span>
        </Link>
      </div>
    );
  }

  const departments = hospital.departments || [];
  const resources = hospital.resources || [];

  // Aggregated resource counters
  const icuAvailable = resources
    .filter(r => r.resource_type === 'ICU_BED')
    .reduce((sum, r) => sum + r.available_quantity, 0);
  const generalAvailable = resources
    .filter(r => r.resource_type === 'GENERAL_BED')
    .reduce((sum, r) => sum + r.available_quantity, 0);
  const bloodAvailable = resources
    .filter(r => r.category === 'BLOOD')
    .reduce((sum, r) => sum + r.available_quantity, 0);
  const ventAvailable = resources
    .filter(r => r.resource_type === 'VENTILATOR')
    .reduce((sum, r) => sum + r.available_quantity, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Button */}
      <div>
        <Link
          to="/hospitals"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hospital Network</span>
        </Link>
      </div>

      {/* Facility Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {hospital.code}
              </span>
              <span className="text-xs font-semibold text-cyan-400 font-mono">
                {hospital.tier}
              </span>
              <StatusPill status={hospital.status} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {hospital.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-500" />
                {hospital.address}, {hospital.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-500 font-mono" />
                Coordinates: <span className="font-mono text-slate-300">{hospital.latitude}, {hospital.longitude}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-500" />
                {hospital.contact_phone}
              </span>
              {hospital.contact_email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-500" />
                  {hospital.contact_email}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canModify ? (
              <button
                onClick={() => setIsHospitalModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Facility</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-500 italic">
                Hospital Admin access restricted to assigned facility
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Facility Resource Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Available ICU Beds"
          value={`${icuAvailable} Free`}
          subtext="Ready for immediate emergency intake"
          icon={HeartPulse}
          variant="default"
        />
        <MetricCard
          title="Available General Beds"
          value={`${generalAvailable} Free`}
          subtext="Inpatient and recovery wards"
          icon={Bed}
          variant="success"
        />
        <MetricCard
          title="Available Blood Units"
          value={`${bloodAvailable} Units`}
          subtext="Stored in internal blood bank"
          icon={Droplets}
          variant="warning"
        />
        <MetricCard
          title="Available Ventilators"
          value={`${ventAvailable} Free`}
          subtext="Biomedical respiratory reserve"
          icon={Wind}
          variant="default"
        />
      </div>

      {/* Department Management Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-base text-white">
                Clinical Departments ({departments.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Departments maintain resource inventories and operational clinical wings.
            </p>
          </div>

          {canModify && (
            <button
              onClick={handleOpenAddDept}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          )}
        </div>

        {departments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No departments configured yet for this hospital.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white">{dept.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                        {dept.department_code}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 pt-1">
                    {dept.head_name && (
                      <p><span className="text-slate-500">Lead:</span> {dept.head_name}</p>
                    )}
                    {dept.floor_location && (
                      <p><span className="text-slate-500">Floor:</span> {dept.floor_location}</p>
                    )}
                    {dept.contact_number && (
                      <p><span className="text-slate-500">Direct:</span> {dept.contact_number}</p>
                    )}
                  </div>
                </div>

                {/* Footer / Department Actions */}
                <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">
                    {dept.resource_count || 0} Resource Pools
                  </span>

                  {canModify && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditDept(dept)}
                        title="Edit Department"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept.id, dept.name)}
                        title="Delete Department"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facility Live Resources Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-base text-white">
                Live Resources & Telemetry ({resources.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current bed allocations, blood reserves, emergency capacity, and critical equipment.
            </p>
          </div>

          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <span>Open Global Resource Dashboard →</span>
          </Link>
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-900">
            No active resources configured for this facility.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res) => {
              const avail = res.available_quantity ?? 0;
              const total = res.total_capacity ?? 0;
              const percent = total > 0 ? Math.round((avail / total) * 100) : 0;

              return (
                <div
                  key={res.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          {res.resource_label || res.resource_type.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {res.category}
                        </span>
                      </div>
                      <StatusPill status={res.status} />
                    </div>

                    {/* Headroom bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Available: <strong className="text-white font-mono">{avail}</strong> / {total} {res.unit_of_measure}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            res.status === 'AVAILABLE' ? 'bg-emerald-500' :
                            res.status === 'LIMITED' ? 'bg-amber-500' :
                            res.status === 'CRITICAL' ? 'bg-rose-500' : 'bg-red-700'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Threshold: {res.critical_threshold ?? 5}
                    </span>

                    {canModify && (
                      <button
                        onClick={() => {
                          setEditingResource(res);
                          setIsResourceModalOpen(true);
                        }}
                        className="p-1 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hospital Edit Modal */}
      <HospitalModal
        isOpen={isHospitalModalOpen}
        onClose={() => setIsHospitalModalOpen(false)}
        onSave={handleSaveHospital}
        hospital={hospital}
      />

      {/* Department Create / Edit Modal */}
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        onSave={handleSaveDept}
        department={editingDept}
        hospitalName={hospital.name}
      />

      {/* Resource Edit Modal */}
      {isResourceModalOpen && (
        <ResourceModal
          isOpen={isResourceModalOpen}
          onClose={() => {
            setIsResourceModalOpen(false);
            setEditingResource(null);
          }}
          onSave={() => {
            fetchHospital();
            setToastMessage('Resource updated successfully.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
          resource={editingResource}
          hospitalId={hospital.id}
          hospitalName={hospital.name}
          departments={departments}
        />
      )}
    </div>
  );
}
