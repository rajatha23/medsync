import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/60 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>MEDSYNC Emergency Hospital Telemetry System</span>
          <span className="text-slate-500 font-mono">•</span>
          <span className="text-slate-400">Synthetic Demo Environment</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            Vite + React 18 + Node.js
          </span>
          <span>POSTGRESQL LAYER: READY</span>
        </div>
      </div>
    </footer>
  );
}
