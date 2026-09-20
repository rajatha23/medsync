import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold font-mono text-white">404 - Not Found</h1>
      <p className="text-sm text-slate-400 max-w-sm">
        The requested command center module or resource could not be found.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Command Center</span>
      </Link>
    </div>
  );
}
