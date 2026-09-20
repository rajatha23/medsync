import React, { useState, useEffect } from 'react';
import { X, Layers, Save, Loader2 } from 'lucide-react';

export default function DepartmentModal({ isOpen, onClose, onSave, department = null, hospitalName }) {
  const isEdit = !!department;

  const [formData, setFormData] = useState({
    name: '',
    department_code: '',
    head_name: '',
    floor_location: '',
    contact_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        department_code: department.department_code || '',
        head_name: department.head_name || '',
        floor_location: department.floor_location || '',
        contact_number: department.contact_number || ''
      });
    } else {
      setFormData({
        name: '',
        department_code: '',
        head_name: '',
        floor_location: '',
        contact_number: ''
      });
    }
    setError(null);
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData, department?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-base text-white">
                {isEdit ? `Edit Department: ${department.name}` : 'Add New Department'}
              </h3>
              {hospitalName && (
                <p className="text-[11px] text-slate-400">Belongs to: {hospitalName}</p>
              )}
            </div>
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
          <div>
            <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Intensive Care Unit (ICU)"
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Department Code *</label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={formData.department_code}
              onChange={(e) => setFormData({ ...formData, department_code: e.target.value.toUpperCase() })}
              placeholder="e.g. ICU-CRIT"
              className={`w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono ${
                isEdit ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div>
            <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Head of Department / Lead</label>
            <input
              type="text"
              value={formData.head_name}
              onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
              placeholder="e.g. Dr. Aris Thorne"
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Floor / Wing Location</label>
              <input
                type="text"
                value={formData.floor_location}
                onChange={(e) => setFormData({ ...formData, floor_location: e.target.value })}
                placeholder="e.g. Floor 3, North Wing"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block uppercase font-mono text-[11px] text-slate-400 mb-1">Direct Contact Number</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g. +1 (555) 019-2833"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

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
              <span>{isEdit ? 'Save Department' : 'Create Department'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
