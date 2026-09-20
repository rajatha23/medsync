import React, { useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Building2,
  Activity,
  Bed,
  Wind,
  Droplet,
  Users,
  Layers,
  ArrowRight,
  ShieldAlert,
  Flame,
  Radio,
  Sliders,
  Sparkles,
  Info,
  Check,
  AlertOctagon,
  Trash2
} from 'lucide-react';
import { simulationService } from '../services/simulationService';
import PriorityBadge from '../components/PriorityBadge';
import StatusPill from '../components/StatusPill';

// Pre-packaged realistic crisis simulation scenarios
const SCENARIO_PRESETS = [
  {
    id: 'mci',
    name: 'Mass Casualty Incident (MCI)',
    description: 'Major multi-vehicle highway collision or transit derailment requiring intensive surgical triage.',
    casesCount: 30,
    icuDemand: 12,
    generalBedDemand: 25,
    ventilatorDemand: 8,
    bloodDemand: 30,
    category: 'MASS_CASUALTY',
    badgeColor: 'from-rose-500/20 to-rose-600/10 border-rose-500/40 text-rose-300'
  },
  {
    id: 'respiratory',
    name: 'Epidemic / Severe Respiratory Surge',
    description: 'Severe winter viral outbreak overwhelming pulmonary wards and ventilator inventory.',
    casesCount: 50,
    icuDemand: 25,
    generalBedDemand: 45,
    ventilatorDemand: 20,
    bloodDemand: 5,
    category: 'RESPIRATORY',
    badgeColor: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/40 text-cyan-300'
  },
  {
    id: 'collapse',
    name: 'Structural Collapse / Earthquake',
    description: 'Urban seismic event causing high-energy blunt trauma, crush syndromes, and massive blood demand.',
    casesCount: 40,
    icuDemand: 18,
    generalBedDemand: 35,
    ventilatorDemand: 10,
    bloodDemand: 40,
    category: 'TRAUMA',
    badgeColor: 'from-amber-500/20 to-orange-600/10 border-amber-500/40 text-amber-300'
  },
  {
    id: 'chemical',
    name: 'Chemical / Toxic Release Spill',
    description: 'Industrial hazardous material release causing acute respiratory distress across a localized perimeter.',
    casesCount: 20,
    icuDemand: 8,
    generalBedDemand: 15,
    ventilatorDemand: 12,
    bloodDemand: 10,
    category: 'TRAUMA',
    badgeColor: 'from-purple-500/20 to-indigo-600/10 border-purple-500/40 text-purple-300'
  },
  {
    id: 'stress_test',
    name: 'Catastrophic Stress Test',
    description: 'Extreme multi-point disaster designed to expose network tipping points and divert thresholds.',
    casesCount: 80,
    icuDemand: 40,
    generalBedDemand: 70,
    ventilatorDemand: 25,
    bloodDemand: 50,
    category: 'MASS_CASUALTY',
    badgeColor: 'from-fuchsia-500/20 to-pink-600/10 border-fuchsia-500/40 text-fuchsia-300'
  }
];

export default function ScenarioSimulatorPage() {
  // Scenario configuration inputs
  const [selectedPreset, setSelectedPreset] = useState('mci');
  const [scenarioName, setScenarioName] = useState(SCENARIO_PRESETS[0].name);
  const [casesCount, setCasesCount] = useState(SCENARIO_PRESETS[0].casesCount);
  const [icuDemand, setIcuDemand] = useState(SCENARIO_PRESETS[0].icuDemand);
  const [generalBedDemand, setGeneralBedDemand] = useState(SCENARIO_PRESETS[0].generalBedDemand);
  const [ventilatorDemand, setVentilatorDemand] = useState(SCENARIO_PRESETS[0].ventilatorDemand);
  const [bloodDemand, setBloodDemand] = useState(SCENARIO_PRESETS[0].bloodDemand);
  const [location, setLocation] = useState('Metropolis Central District');
  const [category, setCategory] = useState(SCENARIO_PRESETS[0].category);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [error, setError] = useState(null);

  // Apply & Cleanup modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  // Active view tab for results
  const [activeTab, setActiveTab] = useState('overview'); // overview, hospitals, requests, alerts

  // Handle Preset Selection
  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setScenarioName(preset.name);
    setCasesCount(preset.casesCount);
    setIcuDemand(preset.icuDemand);
    setGeneralBedDemand(preset.generalBedDemand);
    setVentilatorDemand(preset.ventilatorDemand);
    setBloodDemand(preset.bloodDemand);
    setCategory(preset.category);
    setError(null);
    setApplyResult(null);
    setCleanupResult(null);
  };

  // Run in-memory simulation
  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    setIsRunning(true);
    setError(null);
    setApplyResult(null);
    setCleanupResult(null);

    try {
      const res = await simulationService.runSimulation({
        scenarioName,
        casesCount: Number(casesCount),
        icuDemand: Number(icuDemand),
        generalBedDemand: Number(generalBedDemand),
        ventilatorDemand: Number(ventilatorDemand),
        bloodDemand: Number(bloodDemand),
        incidentCategory: category,
        location
      });

      if (res.success) {
        setSimResult(res.data);
      } else {
        throw new Error(res.error?.message || 'Simulation execution failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to execute scenario simulation.');
    } finally {
      setIsRunning(false);
    }
  };

  // Explicitly apply simulation to live PostgreSQL
  const handleConfirmApply = async () => {
    if (!simResult) return;
    setIsApplying(true);
    setError(null);

    try {
      const res = await simulationService.applySimulation({
        scenario_name: simResult.scenario_name,
        simulation_id: simResult.simulation_id,
        simulated_requests: simResult.simulated_requests
      });

      if (res.success) {
        setApplyResult(res.data);
        setShowApplyModal(false);
        setConfirmApply(false);
      } else {
        throw new Error(res.error?.message || 'Failed to apply simulation.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to apply simulation to database.');
    } finally {
      setIsApplying(false);
    }
  };

  // Cleanup applied simulations
  const handleCleanup = async () => {
    setIsCleaning(true);
    setError(null);

    try {
      const res = await simulationService.cleanupSimulation();
      if (res.success) {
        setCleanupResult(res.data);
        setApplyResult(null);
      } else {
        throw new Error(res.error?.message || 'Failed to clean up simulation data.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to clean up simulation data.');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. SYNTHETIC SIMULATION MODE BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-amber-950/80 p-5 sm:p-6 shadow-2xl shadow-amber-950/20">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
              <FlaskConical className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-xl sm:text-2xl tracking-wide text-white">
                  EMERGENCY SCENARIO SIMULATOR
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  SYNTHETIC SIMULATION MODE
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                Stress-test network triage, project hospital divert thresholds, and model severe casualty surges. 
                <span className="text-amber-300 font-semibold ml-1">Live database remains unaltered</span> unless you explicitly select "Apply Simulation".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Release any synthetic holds and cancel synthetic dispatches in database"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              {isCleaning ? 'Cleaning...' : 'Reset Applied Holds'}
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS & NOTIFICATION BANNERS */}
      {applyResult && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 flex items-start gap-3 shadow-lg shadow-emerald-950/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-emerald-300">
              [SIMULATION APPLIED] Scenario Successfully Instantiated in Live Database!
            </p>
            <p className="text-xs text-emerald-300/90 mt-1">
              Created {applyResult.emergency_requests_created} emergency dispatches (marked with <code className="bg-emerald-900/80 px-1 py-0.5 rounded">SIM-REQ-...</code>) and placed {applyResult.reservations_created} active resource holds. 
              View them in the Emergency Console or click "Reset Applied Holds" above to restore inventory.
            </p>
          </div>
        </div>
      )}

      {cleanupResult && (
        <div className="p-4 rounded-xl bg-blue-950/80 border border-blue-500/60 text-blue-200 flex items-start gap-3 shadow-lg shadow-blue-950/30">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-blue-300">
              Synthetic Simulation Data Cleaned Up
            </p>
            <p className="text-xs text-blue-300/90 mt-1">
              Released {cleanupResult.released_reservations_count} synthetic resource holds and cancelled {cleanupResult.cancelled_requests_count} simulated requests. Network inventory headroom restored.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 flex items-start gap-3 shadow-lg">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-rose-300">Simulation Error</p>
            <p className="text-xs text-rose-300/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 2. SCENARIO PRESETS SELECTOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Select Crisis Scenario Preset
          </h2>
          <span className="text-xs text-slate-500">Quick-load realistic disaster models</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left p-3.5 rounded-xl border transition-all relative ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-gradient-to-r ${preset.badgeColor}`}>
                    {preset.category}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{preset.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{preset.description}</p>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{preset.casesCount} Cases</span>
                  <span className="text-cyan-400 font-bold">{preset.icuDemand} ICU</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SIMULATION CONFIGURATION CONTROLS */}
      <form onSubmit={handleRunSimulation} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-mono font-bold text-slate-200">Demand & Casualty Parameters</h3>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
            All values adjust synthetic strain
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Cases Count */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Casualty Cases
              </label>
              <span className="font-mono font-bold text-sm text-cyan-400">{casesCount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={casesCount}
              onChange={(e) => { setCasesCount(Number(e.target.value)); setSelectedPreset('custom'); }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Total simulated emergency dispatches</p>
          </div>

          {/* ICU Demand */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                ICU Demand
              </label>
              <span className="font-mono font-bold text-sm text-rose-400">{icuDemand} beds</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={icuDemand}
              onChange={(e) => { setIcuDemand(Number(e.target.value)); setSelectedPreset('custom'); }}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Critical intensive care units</p>
          </div>

          {/* General Bed Demand */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-blue-400" />
                General Beds
              </label>
              <span className="font-mono font-bold text-sm text-blue-400">{generalBedDemand} beds</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={generalBedDemand}
              onChange={(e) => { setGeneralBedDemand(Number(e.target.value)); setSelectedPreset('custom'); }}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Standard medical & trauma beds</p>
          </div>

          {/* Ventilator Demand */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                Ventilators
              </label>
              <span className="font-mono font-bold text-sm text-teal-400">{ventilatorDemand} units</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={ventilatorDemand}
              onChange={(e) => { setVentilatorDemand(Number(e.target.value)); setSelectedPreset('custom'); }}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Mechanical pulmonary ventilators</p>
          </div>

          {/* Blood Demand */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-red-400" />
                Blood Demand
              </label>
              <span className="font-mono font-bold text-sm text-red-400">{bloodDemand} units</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bloodDemand}
              onChange={(e) => { setBloodDemand(Number(e.target.value)); setSelectedPreset('custom'); }}
              className="w-full accent-red-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Universal O- & trauma units</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-64"
              placeholder="Scenario Name"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-64"
              placeholder="Incident Epicenter"
            />
          </div>

          <button
            type="submit"
            disabled={isRunning}
            className="px-6 py-2.5 rounded-xl text-sm font-mono font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Computing Projections...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Scenario Simulation
              </>
            )}
          </button>
        </div>
      </form>

      {/* 4. SIMULATION RESULTS SECTION */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* RESULTS HEADER & ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/80 text-xs font-mono font-bold uppercase">
                  SIMULATION PROJECTION
                </span>
                <h3 className="font-mono font-extrabold text-lg text-white">
                  {simResult.scenario_name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated {simResult.inputs?.cases_count} cases • Computed at {new Date(simResult.before?.timestamp).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab navigation */}
              <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'overview' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview & Telemetry
                </button>
                <button
                  onClick={() => setActiveTab('hospitals')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'hospitals' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Affected Facilities ({simResult.affected_hospitals?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'requests' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simulated Requests ({simResult.simulated_requests?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'alerts' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shortage Alerts ({simResult.shortage_alerts?.length || 0})
                </button>
              </div>

              {/* Explicit Apply Button */}
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Apply Simulation
              </button>
            </div>
          </div>

          {/* PROJECTED SHORTAGES ALERT BANNER */}
          {simResult.projected_shortages?.has_shortages && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 shadow-xl shadow-rose-950/30">
              <div className="flex items-center gap-2 font-mono font-bold text-rose-300 text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>[SIMULATION ALERT] CRITICAL RESOURCE DEFICIT PROJECTED</span>
              </div>
              <p className="text-xs text-rose-200/90 mt-1">
                Under the simulated casualty load, total network demand exceeds available reserves. The following shortages would occur:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {simResult.projected_shortages.icu_beds_deficit > 0 && (
                  <div className="bg-rose-900/40 border border-rose-700/60 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-mono text-rose-300 block">ICU Beds Shortage</span>
                    <span className="text-xl font-mono font-black text-white">-{simResult.projected_shortages.icu_beds_deficit}</span>
                    <span className="text-[10px] text-rose-300/80 block">Critical Deficit</span>
                  </div>
                )}
                {simResult.projected_shortages.general_beds_deficit > 0 && (
                  <div className="bg-rose-900/40 border border-rose-700/60 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-mono text-rose-300 block">General Beds Shortage</span>
                    <span className="text-xl font-mono font-black text-white">-{simResult.projected_shortages.general_beds_deficit}</span>
                    <span className="text-[10px] text-rose-300/80 block">Overcapacity</span>
                  </div>
                )}
                {simResult.projected_shortages.ventilators_deficit > 0 && (
                  <div className="bg-rose-900/40 border border-rose-700/60 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-mono text-rose-300 block">Ventilator Shortage</span>
                    <span className="text-xl font-mono font-black text-white">-{simResult.projected_shortages.ventilators_deficit}</span>
                    <span className="text-[10px] text-rose-300/80 block">Pulmonary Deficit</span>
                  </div>
                )}
                {simResult.projected_shortages.blood_units_deficit > 0 && (
                  <div className="bg-rose-900/40 border border-rose-700/60 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-mono text-rose-300 block">Blood Reserves Deficit</span>
                    <span className="text-xl font-mono font-black text-white">-{simResult.projected_shortages.blood_units_deficit}</span>
                    <span className="text-[10px] text-rose-300/80 block">Transfusion Deficit</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW & BEFORE / AFTER COMPARISON */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* BEFORE vs AFTER METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ICU BEDS COMPARISON */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400" />
                      ICU Beds
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Capacity: {simResult.before?.resources?.icu_beds?.total_capacity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">BEFORE</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {simResult.before?.resources?.icu_beds?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.before?.resources?.icu_beds?.utilization_rate}% util
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 relative">
                      <span className="text-[10px] uppercase font-mono text-amber-400 block">PROJECTED</span>
                      <span className={`text-lg font-mono font-bold ${
                        simResult.after?.resources?.icu_beds?.available_quantity === 0 ? 'text-rose-400' : 'text-amber-300'
                      }`}>
                        {simResult.after?.resources?.icu_beds?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.after?.resources?.icu_beds?.utilization_rate}% util
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Demand:</span>
                    <span className="font-mono font-semibold text-rose-400">+{simResult.inputs?.icu_demand} requested</span>
                  </div>
                </div>

                {/* GENERAL BEDS COMPARISON */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-blue-400" />
                      General Beds
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Capacity: {simResult.before?.resources?.general_beds?.total_capacity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">BEFORE</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {simResult.before?.resources?.general_beds?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.before?.resources?.general_beds?.utilization_rate}% util
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-amber-400 block">PROJECTED</span>
                      <span className={`text-lg font-mono font-bold ${
                        simResult.after?.resources?.general_beds?.available_quantity === 0 ? 'text-rose-400' : 'text-blue-300'
                      }`}>
                        {simResult.after?.resources?.general_beds?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.after?.resources?.general_beds?.utilization_rate}% util
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Demand:</span>
                    <span className="font-mono font-semibold text-blue-400">+{simResult.inputs?.general_bed_demand} requested</span>
                  </div>
                </div>

                {/* VENTILATORS COMPARISON */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-teal-400" />
                      Ventilators
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Capacity: {simResult.before?.resources?.ventilators?.total_capacity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">BEFORE</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {simResult.before?.resources?.ventilators?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.before?.resources?.ventilators?.utilization_rate}% util
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-amber-400 block">PROJECTED</span>
                      <span className={`text-lg font-mono font-bold ${
                        simResult.after?.resources?.ventilators?.available_quantity === 0 ? 'text-rose-400' : 'text-teal-300'
                      }`}>
                        {simResult.after?.resources?.ventilators?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {simResult.after?.resources?.ventilators?.utilization_rate}% util
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Demand:</span>
                    <span className="font-mono font-semibold text-teal-400">+{simResult.inputs?.ventilator_demand} requested</span>
                  </div>
                </div>

                {/* BLOOD UNITS COMPARISON */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-red-400" />
                      Blood Reserves
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Total: {simResult.before?.resources?.blood_units?.total_capacity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">BEFORE</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {simResult.before?.resources?.blood_units?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Available units</span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-amber-400 block">PROJECTED</span>
                      <span className={`text-lg font-mono font-bold ${
                        simResult.after?.resources?.blood_units?.available_quantity === 0 ? 'text-rose-400' : 'text-red-300'
                      }`}>
                        {simResult.after?.resources?.blood_units?.available_quantity}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Remaining units</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Demand:</span>
                    <span className="font-mono font-semibold text-red-400">+{simResult.inputs?.blood_demand} requested</span>
                  </div>
                </div>
              </div>

          {/* WHAT-IF DECISION SUMMARY */}
          {simResult.what_if && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-cyan-400">What-if decision summary</div>
                  <h3 className="text-lg font-bold text-white mt-1">If this scenario happens now…</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl">The simulator changes only the projection, not live hospital inventory. Use these values to decide whether surge, diversion or mutual-aid actions should be prepared.</p>
                </div>
                <div className="text-right"><div className="text-[10px] text-slate-500 uppercase">Scenario severity</div><div className="text-xl font-black text-cyan-300">{simResult.what_if.scenario_severity}</div></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
                {[
                  ['Stress index', simResult.what_if.network_stress_index],
                  ['ICU gap', simResult.what_if.additional_icu_needed],
                  ['Bed gap', simResult.what_if.additional_general_beds_needed],
                  ['Ventilator gap', simResult.what_if.additional_ventilators_needed],
                  ['Blood gap', simResult.what_if.additional_blood_units_needed]
                ].map(([label,value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"><div className="text-[10px] text-slate-500">{label}</div><div className="text-lg font-mono font-bold text-white mt-1">{value}{label==='Stress index' ? '%' : ''}</div></div>)}
              </div>
              <div className="mt-3 rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-300"><span className="font-semibold text-cyan-300">Recommended planning action: </span>{simResult.what_if.recommended_action}</div>
            </div>
          )}

              {/* NETWORK BED OCCUPANCY & HOSPITAL STATUS SHIFT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Network Occupancy Meter */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Overall Bed Occupancy
                  </h4>

                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-2xl font-mono font-black text-white">
                      {simResult.after?.projected_bed_occupancy_rate}%
                    </span>
                    <span className="text-xs text-slate-400">
                      Baseline: {simResult.before?.network_bed_occupancy_rate}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        simResult.after?.projected_bed_occupancy_rate >= 90
                          ? 'bg-rose-500'
                          : simResult.after?.projected_bed_occupancy_rate >= 75
                          ? 'bg-amber-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, simResult.after?.projected_bed_occupancy_rate)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                    Projected network bed occupancy across all operational hospital facilities under simulated surge.
                  </p>
                </div>

                {/* Operational Status Transitions Breakdown */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md md:col-span-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    Hospital Status Distribution (Before vs Projected)
                  </h4>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-mono text-emerald-400 block">NORMAL</span>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm font-mono text-slate-400">{simResult.before?.hospital_breakdown?.normal}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-lg font-mono font-bold text-white">{simResult.after?.hospital_breakdown?.normal}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-mono text-amber-400 block">SURGE</span>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm font-mono text-slate-400">{simResult.before?.hospital_breakdown?.surge}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-lg font-mono font-bold text-amber-400">{simResult.after?.hospital_breakdown?.surge}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-mono text-rose-400 block">DIVERT</span>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm font-mono text-slate-400">{simResult.before?.hospital_breakdown?.divert}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-lg font-mono font-bold text-rose-400">{simResult.after?.hospital_breakdown?.divert}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 block">OFFLINE</span>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm font-mono text-slate-400">{simResult.before?.hospital_breakdown?.offline}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-lg font-mono font-bold text-slate-400">{simResult.after?.hospital_breakdown?.offline}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AFFECTED HOSPITALS STATUS SHIFT MATRIX */}
          {activeTab === 'hospitals' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-mono font-bold text-slate-200">
                    Projected Facility Impact & Divert Analysis
                  </h3>
                  <p className="text-xs text-slate-400">
                    Identifies facilities pushed into SURGE or DIVERT status under simulated casualty intake.
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-300">
                  {simResult.affected_hospitals?.length} Facilities Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Hospital Name</th>
                      <th className="p-3.5">Trauma Level</th>
                      <th className="p-3.5">Status Transition</th>
                      <th className="p-3.5">Bed Occupancy (Proj)</th>
                      <th className="p-3.5">Proj Avail ICU</th>
                      <th className="p-3.5">Allocated Cases</th>
                      <th className="p-3.5">Impact Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simResult.affected_hospitals?.map((h) => {
                      const isDivert = h.projected_status === 'DIVERT';
                      const isSurge = h.projected_status === 'SURGE';
                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isDivert ? 'bg-rose-950/10' : isSurge ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-200">{h.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{h.code} • {h.city}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                              {h.trauma_level || 'Community'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <StatusPill status={h.current_status} />
                              {h.status_changed && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <StatusPill status={h.projected_status} />
                                </>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="w-24">
                              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                <span className={h.projected_occupancy_rate >= 90 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                  {h.projected_occupancy_rate}%
                                </span>
                                <span className="text-slate-500">{h.before_occupancy_rate}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    h.projected_occupancy_rate >= 95
                                      ? 'bg-rose-500'
                                      : h.projected_occupancy_rate >= 80
                                      ? 'bg-amber-500'
                                      : 'bg-cyan-500'
                                  }`}
                                  style={{ width: `${Math.min(100, h.projected_occupancy_rate)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`font-mono font-bold ${
                              h.projected_available_icu === 0 ? 'text-rose-400' : 'text-slate-300'
                            }`}>
                              {h.projected_available_icu}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">/ {h.before_available_icu}</span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                              {h.allocated_cases}
                            </span>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {h.impact_summary}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATED EMERGENCY REQUESTS INSPECTOR */}
          {activeTab === 'requests' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-mono font-bold text-slate-200">
                    Synthetic Emergency Dispatches Queue
                  </h3>
                  <p className="text-xs text-slate-400">
                    Realistic incident cases synthesized to match scenario casualty distribution.
                  </p>
                </div>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/80 border border-purple-800/60 px-2.5 py-1 rounded">
                  {simResult.simulated_requests?.length} Synthetic Incidents
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Tracking Code</th>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">Patient Ref</th>
                      <th className="p-3.5">Demanded Resources</th>
                      <th className="p-3.5">Assigned Facility</th>
                      <th className="p-3.5">Location Sector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simResult.simulated_requests?.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                        <td className="p-3.5 font-bold text-cyan-400">
                          {req.tracking_code}
                        </td>
                        <td className="p-3.5">
                          <PriorityBadge priority={req.priority} size="sm" />
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {req.patient_reference}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {req.demanded_resources?.map((r, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-sans"
                              >
                                {r.resource_type}: <strong className="font-mono text-cyan-300">{r.required_quantity}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {req.assigned_hospital_name}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px] font-sans">
                          {req.incident_address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SIMULATED SHORTAGE ALERTS FEED */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono font-bold text-slate-200">
                  Projected Shortage & Overcapacity Alerts Feed
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {simResult.shortage_alerts?.length} Alerts Synthesized
                </span>
              </div>

              <div className="space-y-2.5">
                {simResult.shortage_alerts?.map((alert) => {
                  const isCritical = alert.type === 'CRITICAL';
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border flex items-start gap-3 shadow-md ${
                        isCritical
                          ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                          : 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isCritical ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                          }`}>
                            {alert.type}
                          </span>
                          <span className="font-bold text-white text-sm">{alert.title}</span>
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-300">{alert.message}</p>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Synthesized Alert • {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. APPLY SIMULATION CONFIRMATION MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">
                  Apply Simulation to Live System?
                </h3>
                <p className="text-xs text-amber-400/90 font-mono">
                  CRITICAL ACTION: Modifies persistent database state
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Applying this simulation will instantiate <strong className="text-white">{simResult?.simulated_requests?.length} real emergency incident records</strong> in the PostgreSQL database and place <strong className="text-white">live resource reservations</strong> at receiving facilities.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>All dispatches will be tagged with <code className="text-cyan-400">SIM-REQ-...</code> tracking codes.</li>
                <li>Live available inventory headroom will be decreased by the reserved amounts.</li>
                <li>You can rollback and release these holds at any time using the "Reset Applied Holds" button.</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={confirmApply}
                onChange={(e) => setConfirmApply(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>I confirm I want to instantiate these synthetic cases in the live system.</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmApply || isApplying}
                onClick={handleConfirmApply}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Applying Transaction...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm & Apply to Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
