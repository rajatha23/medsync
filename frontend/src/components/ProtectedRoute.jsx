import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">
          Verifying Clinical Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles required, enforce RBAC
  if (allowedRoles && !allowedRoles.includes(user?.role) && user?.role !== 'ADMIN') {
    // Redirect to their own authorized dashboard
    if (user?.role === 'COORDINATOR') {
      return <Navigate to="/coordinator/dashboard" replace />;
    }
    if (user?.role === 'HOSPITAL_ADMIN') {
      return <Navigate to="/hospital-admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
