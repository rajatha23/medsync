import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Loader2, MapPin, Phone, Mail, ShieldAlert } from 'lucide-react';

export default function HospitalModal({ isOpen, onClose, onSave, hospital = null }) {
  const isEdit = !!hospital;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    tier: 'Regional Core',
    trauma_level: 'Level 2',
    address: '',
    city: 'Metropolis',
    latitude: 40.7128,
    longitude: -74.0060,
    contact_phone: '',
    contact_email: '',
    status: 'NORMAL'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hospital) {
      setFormData({
        name: hospital.name || '',
        code: hospital.code || '',
        tier: hospital.tier || 'Regional Core',
        trauma_level: hospital.trauma_level || 'Level 2',
        address: hospital.address || '',
        city: hospital.city || 'Metropolis',
        latitude: hospital.latitude || 40.7128,
        longitude: hospital.longitude || -74.0060,
        contact_phone: hospital.contact_phone || '',
        contact_email: hospital.contact_email || '',
        status: hospital.status || 'NORMAL'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        tier: 'Regional Core',
        trauma_level: 'Level 2',
        address: '',
        city: 'Metropolis',
        latitude: 40.7128,
        longitude: -74.0060,
        contact_phone: '',
        contact_email: '',
        status: 'NORMAL'
      });
    }
    setError(null);
  }, [hospital, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData, hospital?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save hospital details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white">
              {isEdit ? `Edit Hospital: ${hospital.name}` : 'Register New Regional Hospital'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Hospital Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Metro University Hospital"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Hospital Code *</label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. METRO-01"
                className={`w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono ${
                  isEdit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Row 2: Tier, Trauma Level & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Tier / Role</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Tertiary Referral">Tertiary Referral</option>
                <option value="Regional Core">Regional Core</option>
                <option value="Surgical Specialty">Surgical Specialty</option>
                <option value="Pediatric Specialty">Pediatric Specialty</option>
                <option value="Central Blood Hub">Central Blood Hub</option>
                <option value="Suburban Satellite">Suburban Satellite</option>
              </select>
            </div>

            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Trauma Level</label>
              <select
                value={formData.trauma_level}
                onChange={(e) => setFormData({ ...formData, trauma_level: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="Level 1">Level 1 Trauma Center</option>
                <option value="Level 2">Level 2 Trauma Center</option>
                <option value="Level 3">Level 3 Trauma Center</option>
                <option value="Specialized">Specialized Facility</option>
                <option value="Community">Community Clinic</option>
              </select>
            </div>

            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Operational Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="NORMAL">NORMAL (Full Capacity)</option>
                <option value="SURGE">SURGE (High Load)</option>
                <option value="DIVERT">DIVERT (Diverting Incoming)</option>
                <option value="LOCKDOWN">LOCKDOWN (Emergency Hold)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Street Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 742 University Ave, Downtown"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Metropolis"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Row 4: Geolocation Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Row 5: Contact Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 (555) 019-2831"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="dispatch@metrohealth.demo"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Changes' : 'Register Hospital'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
