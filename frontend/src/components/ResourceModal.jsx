import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
import { resourceService } from '../services/resourceService';
import StatusPill from './StatusPill';

const CATEGORY_OPTIONS = [
  { value: 'BEDS', label: 'Beds (ICU, General, Emergency)' },
  { value: 'BLOOD', label: 'Blood Reserves (A+, O-, etc.)' },
  { value: 'EQUIPMENT', label: 'Critical Equipment (Ventilators, etc.)' },
  { value: 'CAPACITY', label: 'Emergency Capacity (Bays, Stations)' }
];

const PRESET_TYPES = {
  BEDS: [
    { value: 'ICU_BED', label: 'ICU Bed', unit: 'beds' },
    { value: 'GENERAL_BED', label: 'General Bed', unit: 'beds' },
    { value: 'EMERGENCY_BED', label: 'Emergency Bed', unit: 'beds' },
    { value: 'PEDIATRIC_BED', label: 'Pediatric Bed', unit: 'beds' }
  ],
  BLOOD: [
    { value: 'BLOOD_A_POS', label: 'A+ Blood', unit: 'units' },
    { value: 'BLOOD_A_NEG', label: 'A- Blood', unit: 'units' },
    { value: 'BLOOD_B_POS', label: 'B+ Blood', unit: 'units' },
    { value: 'BLOOD_B_NEG', label: 'B- Blood', unit: 'units' },
    { value: 'BLOOD_AB_POS', label: 'AB+ Blood', unit: 'units' },
    { value: 'BLOOD_AB_NEG', label: 'AB- Blood', unit: 'units' },
    { value: 'BLOOD_O_POS', label: 'O+ Blood', unit: 'units' },
    { value: 'BLOOD_O_NEG', label: 'O- Blood', unit: 'units' }
  ],
  EQUIPMENT: [
    { value: 'VENTILATOR', label: 'Mechanical Ventilator', unit: 'devices' },
    { value: 'DIALYSIS_MACHINE', label: 'Dialysis Machine', unit: 'devices' }
  ],
  CAPACITY: [
    { value: 'EMERGENCY_CAPACITY', label: 'Emergency Capacity', unit: 'units' },
    { value: 'AMBULANCE_BAY', label: 'Ambulance Bay', unit: 'bays' },
    { value: 'RESUSCITATION_STATION', label: 'Resuscitation Station', unit: 'stations' }
  ]
};

export default function ResourceModal({
  isOpen,
  onClose,
  onSave,
  resource = null,
  hospitalId = '',
  hospitalName = '',
  departments = []
}) {
  const isEditing = Boolean(resource?.id);

  const [formData, setFormData] = useState({
    category: 'BEDS',
    resource_type: 'ICU_BED',
    department_id: '',
    total_quantity: 20,
    available_quantity: 15,
    threshold: 5,
    unit_of_measure: 'beds',
    change_reason: 'Routine inventory update'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resource) {
      setFormData({
        category: resource.category || 'BEDS',
        resource_type: resource.resource_type || 'ICU_BED',
        department_id: resource.department_id || '',
        total_quantity: resource.total_quantity ?? resource.total_capacity ?? 0,
        available_quantity: resource.available_quantity ?? 0,
        threshold: resource.threshold ?? resource.critical_threshold ?? 5,
        unit_of_measure: resource.unit_of_measure || 'units',
        change_reason: 'Periodic inventory synchronization'
      });
    } else {
      setFormData({
        category: 'BEDS',
        resource_type: 'ICU_BED',
        department_id: departments[0]?.id || '',
        total_quantity: 20,
        available_quantity: 15,
        threshold: 5,
        unit_of_measure: 'beds',
        change_reason: 'Initial asset registration'
      });
    }
    setError('');
  }, [resource, isOpen, departments]);

  if (!isOpen) return null;

  // Handle category change -> default to first preset type & unit
  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    const firstType = PRESET_TYPES[newCat]?.[0] || { value: '', label: '', unit: 'units' };
    setFormData(prev => ({
      ...prev,
      category: newCat,
      resource_type: firstType.value,
      unit_of_measure: firstType.unit
    }));
  };

  const handleTypeChange = (e) => {
    const selectedVal = e.target.value;
    const foundPreset = PRESET_TYPES[formData.category]?.find(p => p.value === selectedVal);
    setFormData(prev => ({
      ...prev,
      resource_type: selectedVal,
      unit_of_measure: foundPreset?.unit || prev.unit_of_measure
    }));
  };

  // Real-time calculation of status
  const calcStatus = () => {
    const avail = Number(formData.available_quantity) || 0;
    const tot = Number(formData.total_quantity) || 0;
    const thresh = Number(formData.threshold) || 0;

    if (avail <= 0) return 'UNAVAILABLE';
    if (avail <= thresh) return 'CRITICAL';
    if (avail <= thresh * 1.5 || (tot > 0 && (avail / tot) <= 0.3)) return 'LIMITED';
    return 'AVAILABLE';
  };

  const calculatedStatus = calcStatus();
  const totalNum = Number(formData.total_quantity) || 0;
  const availNum = Number(formData.available_quantity) || 0;
  const occupiedNum = Math.max(0, totalNum - availNum);
  const percentAvail = totalNum > 0 ? Math.min(100, Math.round((availNum / totalNum) * 100)) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Quantity validations
    if (totalNum < 0) {
      setError('Total quantity cannot be negative.');
      return;
    }
    if (availNum < 0) {
      setError('Available quantity cannot be negative.');
      return;
    }
    if (availNum > totalNum) {
      setError(`Available quantity (${availNum}) cannot exceed total quantity (${totalNum}).`);
      return;
    }

    setLoading(true);

    try {
      let saved;
      if (isEditing) {
        saved = await resourceService.updateResource(resource.id, {
          total_quantity: totalNum,
          available_quantity: availNum,
          threshold: Number(formData.threshold) || 5,
          unit_of_measure: formData.unit_of_measure,
          department_id: formData.department_id || null,
          change_reason: formData.change_reason
        });
      } else {
        saved = await resourceService.createResource({
          hospital_id: hospitalId,
          department_id: formData.department_id || null,
          category: formData.category,
          resource_type: formData.resource_type,
          total_quantity: totalNum,
          available_quantity: availNum,
          threshold: Number(formData.threshold) || 5,
          unit_of_measure: formData.unit_of_measure
        });
      }

      onSave(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save resource.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                {isEditing ? 'Edit Hospital Resource' : 'Add New Hospital Resource'}
              </h3>
              <p className="text-xs text-slate-400">
                {hospitalName || 'Hospital Network Inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category & Resource Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                disabled={isEditing}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Resource Type
              </label>
              <select
                value={formData.resource_type}
                onChange={handleTypeChange}
                disabled={isEditing}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {PRESET_TYPES[formData.category]?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Department (Optional)
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">-- Unassigned / General Facility --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.department_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Unit of Measure
              </label>
              <input
                type="text"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                placeholder="e.g. beds, units, bays, devices"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Quantities: Total & Available */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Total Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Available Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Critical Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                required
              />
            </div>
          </div>

          {/* Real-time Status Preview Panel */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Calculated System Status:
              </span>
              <StatusPill status={calculatedStatus} />
            </div>

            {/* Utilization Bar */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Availability: {availNum} / {totalNum} {formData.unit_of_measure} ({percentAvail}%)</span>
                <span>Occupied/In-Use: {occupiedNum}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden flex border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    calculatedStatus === 'AVAILABLE' ? 'bg-emerald-500' :
                    calculatedStatus === 'LIMITED' ? 'bg-amber-500' :
                    calculatedStatus === 'CRITICAL' ? 'bg-rose-500' : 'bg-red-700'
                  }`}
                  style={{ width: `${percentAvail}%` }}
                />
              </div>
            </div>

            {/* Rules Clarification */}
            <div className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-1.5 pt-1">
              <span className="text-cyan-400 font-semibold">Phase 5 Status Rules:</span>
              <span>Available &gt; 1.5× threshold &gt; 30% total</span>
              <span className="text-slate-600">|</span>
              <span>≤ 1.5× threshold: Limited</span>
              <span className="text-slate-600">|</span>
              <span>≤ threshold: Critical</span>
              <span className="text-slate-600">|</span>
              <span>0: Unavailable</span>
            </div>
          </div>

          {/* Change Reason (for audit log) */}
          {isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Audit Change Reason
              </label>
              <input
                type="text"
                value={formData.change_reason}
                onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })}
                placeholder="e.g. Bed turnaround completed, ICU patient transferred"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availNum < 0 || totalNum < 0 || availNum > totalNum}
              className="px-5 py-2 text-sm font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 font-semibold transition-all"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : (isEditing ? 'Update Resource' : 'Create Resource')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
