import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Droplets, Siren, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';

const pct = (v) => `${Number(v || 0).toFixed(0)}%`;
function Bar({ value, max=100 }) { const width=Math.min(100, Math.max(0,(Number(value||0)/max)*100)); return <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-cyan-500" style={{width:`${width}%`}} /></div>; }

export default function AnalyticsPage() {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await apiClient.get('/coordinator/analytics');setData(r.data);}catch(e){setError(e.message||'Failed to load analytics.')}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  if(loading) return <div className="p-8 text-slate-400">Loading demand and utilization analytics…</div>;
  if(error) return <div className="p-8 text-rose-300">{error}</div>;
  const d=data||{};
  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div className="flex items-center justify-between border-b border-slate-800 pb-4"><div><div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-400"/><h1 className="text-2xl font-bold text-white">Demand & Utilization Analytics</h1></div><p className="text-xs text-slate-400 mt-1">Live hospital capacity, demand trend, blood reserves and emergency response indicators.</p></div><button onClick={load} className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white"><RefreshCw className="w-4 h-4"/></button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[['Hospitals',d.summary?.hospitals||0,Activity],['High utilization',d.summary?.high_utilization_hospitals||0,Siren],['Blood alerts',d.summary?.total_blood_alerts||0,Droplets],['Requests / 7d',d.summary?.total_requests_7d||0,TrendingUp]].map(([label,value,Icon])=><div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><Icon className="w-4 h-4 text-cyan-400 mb-2"/><div className="text-2xl font-bold text-white">{value}</div><div className="text-xs text-slate-400">{label}</div></div>)}
    </div>
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="font-semibold text-white mb-4">Hospital Bed Utilization</h2><div className="space-y-4">{(d.hospitalOccupancy||[]).map(h=><div key={h.id}><div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{h.hospital_name}</span><span className="text-cyan-400">{pct(h.occupancy_rate)}</span></div><Bar value={h.occupancy_rate}/></div>)}</div></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="font-semibold text-white mb-4">Resource Utilization</h2><div className="space-y-4">{(d.resourceUtilization||[]).slice(0,10).map((r,i)=><div key={`${r.resource_type}-${i}`}><div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{r.resource_type.replaceAll('_',' ')}</span><span className="text-cyan-400">{pct(r.utilization_rate)}</span></div><Bar value={r.utilization_rate}/><div className="text-[10px] text-slate-500 mt-1">Available {r.available_quantity} / {r.total_capacity}</div></div>)}</div></div>
    </section>
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="font-semibold text-white mb-4">7-Day Emergency Demand</h2><div className="space-y-3">{(d.demandTrend||[]).map(x=><div key={x.day} className="flex items-center gap-3"><span className="w-20 text-[10px] text-slate-500">{new Date(x.day).toLocaleDateString()}</span><div className="flex-1"><Bar value={x.requests} max={Math.max(1,...(d.demandTrend||[]).map(y=>y.requests))}/></div><span className="w-10 text-right text-xs text-white">{x.requests}</span><span className="text-[10px] text-rose-300">{x.critical} critical</span></div>)}</div><div className="mt-4 text-xs text-slate-400">Average match time (7d): <span className="text-cyan-300">{d.responseMetrics?.avg_match_minutes == null ? 'No matched sample' : `${d.responseMetrics.avg_match_minutes} min`}</span></div></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Droplets className="w-4 h-4 text-rose-400"/>Blood Reserve Alerts</h2>{(d.bloodAlerts||[]).length===0?<p className="text-sm text-slate-500">No blood resources are at or below their configured threshold.</p>:<div className="space-y-2">{d.bloodAlerts.map((b,i)=><div key={`${b.hospital_name}-${b.resource_type}-${i}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800"><div><div className="text-sm text-white">{b.hospital_name}</div><div className="text-[10px] text-slate-500">{b.resource_type.replaceAll('_',' ')}</div></div><div className="text-right"><div className="text-sm text-rose-300">{b.available_quantity} available</div><div className="text-[10px] text-slate-500">threshold {b.critical_threshold}</div></div></div>)}</div>}</div>
    </section>
  </div>;
}
