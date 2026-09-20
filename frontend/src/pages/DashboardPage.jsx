import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  HeartPulse,
  Droplets,
  AlertOctagon,
  ArrowRight,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  Radio,
  Layers
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import StatusPill from '../components/StatusPill';
import { useSystemHealth } from '../hooks/useSystemHealth';

export default function DashboardPage() {
  const { health, loading, error, refresh } = useSystemHealth();

  // Synthetic demo hospital preview data
  const previewHospitals = [
    {
      id: 'hosp-001',
      name: 'Metropolitan Trauma & University Hospital',
      tier: 'Level 1 Trauma Center',
      status: 'NORMAL',
      icuAvailable: 14,
      icuTotal: 30,
      generalAvailable: 85,
      generalTotal: 180,
      oNegBlood: 12,
      ventilators: 8
    },
    {
      id: 'hosp-002',
      name: 'St. Jude Regional Medical Center',
      tier: 'Level 2 Trauma Center',
      status: 'SURGE',
      icuAvailable: 3,
      icuTotal: 20,
      generalAvailable: 22,
      generalTotal: 120,
      oNegBlood: 4,
      ventilators: 2
    },
    {
      id: 'hosp-003',
      name: 'Apex Memorial Emergency Center',
      tier: 'Level 2 Surgical Center',
      status: 'NORMAL',
      icuAvailable: 9,
      icuTotal: 25,
      generalAvailable: 64,
      generalTotal: 140,
      oNegBlood: 8,
      ventilators: 5
    }
  ];

  return (
    <div className="space-y-6">
      {/* Command Center Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE REGIONAL DISPATCH
              </span>
              <span className="text-xs text-slate-400">Metropolitan Sector 4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hospital Resource Command Center
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Real-time regional telemetry monitoring bed availability, blood bank reserves, and critical emergency services to streamline clinical decision-making.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-sm shadow-lg shadow-rose-900/30 transition-all transform hover:-translate-y-0.5"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Emergency Dispatch</span>
            </Link>
            <Link
              to="/hospitals"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Hospital Grid</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Available ICU Beds"
          value="42 / 120"
          subtext="35% capacity buffer available"
          icon={HeartPulse}
          trend="+4 since last shift"
          trendPositive={true}
          variant="default"
        />
        <MetricCard
          title="General Ward Beds"
          value="318 / 640"
          subtext="Optimal regional headroom"
          icon={Bed}
          trend="49.6% occupied"
          trendPositive={true}
          variant="success"
        />
        <MetricCard
          title="O-Negative Blood Reserves"
          value="24 Units"
          subtext="Critical alert: threshold is 20"
          icon={Droplets}
          trend="-6 units in 12h"
          trendPositive={false}
          variant="warning"
        />
        <MetricCard
          title="Active Emergency Dispatches"
          value="3 Active"
          subtext="Avg matching time: 1.8s"
          icon={AlertOctagon}
          trend="1 critical trauma"
          trendPositive={false}
          variant="critical"
        />
      </div>

      {/* Two Column Grid: System Diagnostic Card & Hospital Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backend & Database Foundation Health Card */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-sm text-white">System Foundation Health</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              PHASE 1 VERIFICATION
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* API Health */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}`} />
                <div>
                  <p className="font-medium text-slate-200">Express API Gateway</p>
                  <p className="text-[11px] text-slate-400 font-mono">http://localhost:5000/api/health</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                health ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {health ? 'STATUS: OK' : 'OFFLINE'}
              </span>
            </div>

            {/* PostgreSQL Connection Layer */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className={`w-4 h-4 ${health?.database?.connected ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div>
                  <p className="font-medium text-slate-200">PostgreSQL Connection Layer</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {health?.database?.connected
                      ? `Database: ${health.database.databaseName || 'medsync'}`
                      : 'Connection Layer Configured'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                health?.database?.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {health?.database?.connected ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            {/* Uptime & Environment */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>API Uptime:</span>
              </div>
              <span className="font-mono text-slate-200">
                {health ? `${health.uptime} seconds` : '—'}
              </span>
            </div>

            {/* Diagnostic Details */}
            {health?.database?.details && (
              <p className="text-[11px] text-slate-400 italic px-1">
                Note: {health.database.details}
              </p>
            )}
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-2"
          >
            <span>Re-verify Health Endpoint</span>
          </button>
        </div>

        {/* Regional Hospital Network Capacity Preview */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-sm text-white">Regional Hospital Network Status</h2>
            </div>
            <Link
              to="/hospitals"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>View All 6 Hospitals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {previewHospitals.map((hosp) => (
              <div
                key={hosp.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{hosp.name}</h3>
                    <p className="text-xs text-slate-400">{hosp.tier}</p>
                  </div>
                  <StatusPill status={hosp.status} />
                </div>

                {/* Micro Resource Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">ICU Beds</span>
                    <p className="text-sm font-bold font-mono text-cyan-400">
                      {hosp.icuAvailable} <span className="text-xs text-slate-500 font-normal">/ {hosp.icuTotal}</span>
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">General Beds</span>
                    <p className="text-sm font-bold font-mono text-emerald-400">
                      {hosp.generalAvailable} <span className="text-xs text-slate-500 font-normal">/ {hosp.generalTotal}</span>
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">O- Blood</span>
                    <p className="text-sm font-bold font-mono text-amber-400">
                      {hosp.oNegBlood} <span className="text-xs text-slate-500 font-normal">Units</span>
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Ventilators</span>
                    <p className="text-sm font-bold font-mono text-white">
                      {hosp.ventilators} <span className="text-xs text-slate-500 font-normal">Free</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase 1 Completion Confirmation Banner */}
      <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-cyan-200">Phase 1 Foundation Operational</h4>
            <p className="text-xs text-cyan-400/80">
              React + Vite, Tailwind CSS, React Router, Node.js + Express, and PostgreSQL Connection Layer configured.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-xs text-cyan-400 bg-cyan-900/40 px-2.5 py-1 rounded border border-cyan-700/40">
          Ready for Phase 2
        </span>
      </div>
    </div>
  );
}
