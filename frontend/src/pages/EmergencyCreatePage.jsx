import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Flame, 
  Activity, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Send, 
  ArrowLeft, 
  Building2, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Sparkles
} from 'lucide-react';
import { emergencyService } from '../services/emergencyService';
import PriorityBadge from '../components/PriorityBadge';

const RESOURCE_TYPES = [
  { value: 'ICU_BED', label: 'ICU Bed (Intensive Care)', category: 'BEDS' },
  { value: 'GENERAL_BED', label: 'General Bed (Inpatient)', category: 'BEDS' },
  { value: 'EMERGENCY_BED', label: 'Emergency Bed (Trauma Bay)', category: 'BEDS' },
  { value: 'VENTILATOR', label: 'Mechanical Ventilator', category: 'EQUIPMENT' },
  { value: 'BLOOD_O_NEG', label: 'Blood: O Negative (Universal)', category: 'BLOOD' },
  { value: 'BLOOD_O_POS', label: 'Blood: O Positive', category: 'BLOOD' },
  { value: 'BLOOD_A_NEG', label: 'Blood: A Negative', category: 'BLOOD' },
  { value: 'BLOOD_A_POS', label: 'Blood: A Positive', category: 'BLOOD' },
  { value: 'BLOOD_B_NEG', label: 'Blood: B Negative', category: 'BLOOD' },
  { value: 'BLOOD_B_POS', label: 'Blood: B Positive', category: 'BLOOD' },
  { value: 'BLOOD_AB_NEG', label: 'Blood: AB Negative', category: 'BLOOD' },
  { value: 'BLOOD_AB_POS', label: 'Blood: AB Positive', category: 'BLOOD' },
];

const PRESETS = [
  {
    name: 'Critical Trauma Alert',
    priority: 'CRITICAL',
    category: 'TRAUMA',
    resources: [
      { resource_type: 'ICU_BED', required_quantity: 1 },
      { resource_type: 'VENTILATOR', required_quantity: 1 },
      { resource_type: 'BLOOD_O_NEG', required_quantity: 2 }
    ]
  },
  {
    name: 'Cardiac Arrest Response',
    priority: 'CRITICAL',
    category: 'CARDIAC',
    resources: [
      { resource_type: 'ICU_BED', required_quantity: 1 },
      { resource_type: 'VENTILATOR', required_quantity: 1 }
    ]
  },
  {
    name: 'Emergency Room Surge',
    priority: 'HIGH',
    category: 'MASS_CASUALTY',
    resources: [
      { resource_type: 'EMERGENCY_BED', required_quantity: 2 },
      { resource_type: 'GENERAL_BED', required_quantity: 2 }
    ]
  },
  {
    name: 'Severe Hemorrhage Urgent',
    priority: 'HIGH',
    category: 'TRAUMA',
    resources: [
      { resource_type: 'BLOOD_O_NEG', required_quantity: 4 },
      { resource_type: 'EMERGENCY_BED', required_quantity: 1 }
    ]
  }
];

export default function EmergencyCreatePage() {
  const navigate = useNavigate();

  // Form State
  const [priority, setPriority] = useState('CRITICAL');
  const [incidentCategory, setIncidentCategory] = useState('TRAUMA');
  const [patientReference, setPatientReference] = useState(
    `PT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('40.7128');
  const [longitude, setLongitude] = useState('-74.0060');
  const [notes, setNotes] = useState('');
  
  // Required Resources demand list
  const [requiredResources, setRequiredResources] = useState([
    { resource_type: 'ICU_BED', required_quantity: 1 },
    { resource_type: 'VENTILATOR', required_quantity: 1 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Add resource row
  const handleAddResource = () => {
    setRequiredResources(prev => [
      ...prev,
      { resource_type: 'EMERGENCY_BED', required_quantity: 1 }
    ]);
  };

  // Update resource row
  const handleResourceChange = (index, field, value) => {
    setRequiredResources(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'required_quantity' ? Math.max(1, parseInt(value, 10) || 1) : value
      };
      return updated;
    });
  };

  // Remove resource row
  const handleRemoveResource = (index) => {
    setRequiredResources(prev => prev.filter((_, idx) => idx !== index));
  };

  // Apply quick preset
  const applyPreset = (preset) => {
    setPriority(preset.priority);
    setIncidentCategory(preset.category);
    setRequiredResources(preset.resources);
  };

  // Quick fill metropolis location coordinates
  const fillMetropolisCoords = (lat, lng, address) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    if (address) setLocation(address);
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const errors = {};
    if (!location.trim()) errors.location = 'Incident location address is required';
    if (isNaN(parseFloat(latitude))) errors.latitude = 'Valid numerical latitude is required';
    if (isNaN(parseFloat(longitude))) errors.longitude = 'Valid numerical longitude is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        location: location.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        priority,
        incident_category: incidentCategory,
        patient_reference: patientReference.trim(),
        notes: notes.trim(),
        required_resources: requiredResources
      };

      const created = await emergencyService.createEmergencyRequest(payload);
      // Navigate to emergency details or console
      navigate(`/emergency?id=${created.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create emergency request:', err);
      setError(err.message || 'Failed to dispatch emergency incident. Please check fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO EMERGENCY CONSOLE</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-950 border border-rose-800/80 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
                Dispatch New Emergency Incident
              </h1>
              <p className="text-xs text-slate-400">
                Initiate emergency dispatch workflow with required resource demands and priority triage.
              </p>
            </div>
          </div>
        </div>

        {/* Dispatch Status Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>INITIAL STATUS: SEARCHING</span>
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-200">Dispatch Request Error</div>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Presets Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Demand Presets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition-colors"
            >
              <div className="text-xs font-semibold text-slate-200">{preset.name}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-cyan-400 font-mono">{preset.priority}</span>
                <span>•</span>
                <span>{preset.resources.length} resources</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dispatch Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Priority Selection */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              1. Triage Priority Level *
            </label>
            <PriorityBadge priority={priority} size="sm" />
          </div>
          <p className="text-xs text-slate-400">
            Select patient urgency grade. CRITICAL requests receive highest routing dispatch priority.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {[
              { 
                level: 'CRITICAL', 
                icon: Flame, 
                desc: 'Imminent loss of life / cardiac / severe shock',
                border: 'border-rose-600',
                activeBg: 'bg-rose-950/50 ring-2 ring-rose-500/50' 
              },
              { 
                level: 'HIGH', 
                icon: AlertTriangle, 
                desc: 'Severe organ threat, open trauma, stroke',
                border: 'border-amber-600',
                activeBg: 'bg-amber-950/50 ring-2 ring-amber-500/50' 
              },
              { 
                level: 'MEDIUM', 
                icon: Activity, 
                desc: 'Urgent acute medical condition, stable vitals',
                border: 'border-cyan-600',
                activeBg: 'bg-cyan-950/50 ring-2 ring-cyan-500/50' 
              },
              { 
                level: 'LOW', 
                icon: Clock, 
                desc: 'Non-emergent transfer, scheduled triage',
                border: 'border-slate-600',
                activeBg: 'bg-slate-800 ring-2 ring-slate-400/50' 
              }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = priority === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setPriority(item.level)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? `${item.activeBg} ${item.border}`
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-white tracking-wider">
                      {item.level}
                    </span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Incident & Patient Classification */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 block">
            2. Incident & Patient Classification
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Clinical Incident Category *
              </label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="TRAUMA">TRAUMA (Multiple trauma / motor collision)</option>
                <option value="CARDIAC">CARDIAC (STEMI / cardiac arrest / arrhythmia)</option>
                <option value="RESPIRATORY">RESPIRATORY (Acute hypoxia / respiratory failure)</option>
                <option value="STROKE">STROKE (Acute cerebrovascular accident)</option>
                <option value="MASS_CASUALTY">MASS CASUALTY (Multi-patient emergency)</option>
                <option value="BURN">BURN (Major thermal/chemical trauma)</option>
                <option value="PEDIATRIC">PEDIATRIC (Pediatric emergency)</option>
                <option value="BLOOD_URGENCY">BLOOD URGENCY (Severe hemorrhage / transfusion)</option>
                <option value="GENERAL">GENERAL (Other acute medical emergency)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Patient Reference Code
                </label>
                <button
                  type="button"
                  onClick={() => setPatientReference(`PT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`)}
                  className="text-[10px] text-cyan-400 font-mono hover:underline"
                >
                  Generate New Code
                </button>
              </div>
              <input
                type="text"
                value={patientReference}
                onChange={(e) => setPatientReference(e.target.value)}
                placeholder="e.g. PT-911-8472"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Incident Location & GPS Coordinates */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              3. Incident Location & GPS Coordinates *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fillMetropolisCoords(40.7128, -74.0060, '120 Broadway Blvd, Financial District')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700"
              >
                Metropolis Center
              </button>
              <button
                type="button"
                onClick={() => fillMetropolisCoords(40.7589, -73.9851, 'Times Square Medical Junction, Midtown')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700"
              >
                Midtown Hub
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Incident Location Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace, Sector 4, Metropolis"
                className={`w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border text-white text-xs focus:border-cyan-500 focus:outline-none ${
                  validationErrors.location ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {validationErrors.location && (
              <p className="text-[10px] text-rose-400 mt-1">{validationErrors.location}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Latitude Coordinates *
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 40.7128"
                className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-white text-xs font-mono focus:border-cyan-500 focus:outline-none ${
                  validationErrors.latitude ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {validationErrors.latitude && (
                <p className="text-[10px] text-rose-400 mt-1">{validationErrors.latitude}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Longitude Coordinates *
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. -74.0060"
                className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-white text-xs font-mono focus:border-cyan-500 focus:outline-none ${
                  validationErrors.longitude ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {validationErrors.longitude && (
                <p className="text-[10px] text-rose-400 mt-1">{validationErrors.longitude}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Requested Resources Demand (request_resources) */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 block">
                4. Required Resources Demand (request_resources)
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Specify critical beds, ventilators, and blood units required for this incident.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddResource}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </button>
          </div>

          {requiredResources.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
              No resources explicitly demanded. Standard ambulance triage will apply.
            </div>
          ) : (
            <div className="space-y-2.5">
              {requiredResources.map((res, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800"
                >
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">
                      Resource Type #{index + 1}
                    </label>
                    <select
                      value={res.resource_type}
                      onChange={(e) => handleResourceChange(index, 'resource_type', e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      {RESOURCE_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          [{opt.category}] {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">
                      Quantity Required
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={res.required_quantity}
                      onChange={(e) => handleResourceChange(index, 'required_quantity', e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono text-center focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(index)}
                      title="Remove resource requirement"
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Dispatch Notes */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 block">
            5. Clinical Notes & Dispatch Information
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical observations, field triage notes, ambulance callsign, or special requirements..."
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            to="/emergency"
            className="px-4 py-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-mono transition-colors"
          >
            Cancel Dispatch
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-mono font-bold shadow-lg shadow-rose-950/40 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Broadcasting Dispatch...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast Emergency Dispatch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
