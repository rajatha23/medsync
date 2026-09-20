import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import HospitalsPage from './pages/HospitalsPage';
import HospitalDetailPage from './pages/HospitalDetailPage';
import EmergencyConsolePage from './pages/EmergencyConsolePage';
import EmergencyCreatePage from './pages/EmergencyCreatePage';
import MatchingResultsPage from './pages/MatchingResultsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage';
import HospitalAdminDashboardPage from './pages/HospitalAdminDashboardPage';
import ResourcesPage from './pages/ResourcesPage';
import ScenarioSimulatorPage from './pages/ScenarioSimulatorPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

// Smart Home Route that directs authenticated users to their specific dashboard
function HomeRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) {
    if (user?.role === 'COORDINATOR') {
      return <Navigate to="/coordinator/dashboard" replace />;
    }
    if (user?.role === 'HOSPITAL_ADMIN') {
      return <Navigate to="/hospital-admin/dashboard" replace />;
    }
  }
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              {/* Home */}
              <Route index element={<HomeRoute />} />

              {/* Public Authentication */}
              <Route path="login" element={<LoginPage />} />

              {/* Protected Coordinator Dashboard */}
              <Route
                path="coordinator/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR']}>
                    <CoordinatorDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Hospital Admin Dashboard */}
              <Route
                path="hospital-admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}>
                    <HospitalAdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected / General Modules */}
              <Route path="hospitals" element={<HospitalsPage />} />
              <Route path="hospitals/:id" element={<HospitalDetailPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="emergency" element={<EmergencyConsolePage />} />
              <Route path="emergency/:id" element={<EmergencyConsolePage />} />
              <Route path="emergency/:id/match" element={<MatchingResultsPage />} />
              <Route
                path="emergency/new"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
                    <EmergencyCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="simulator"
                element={
                  <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
                    <ScenarioSimulatorPage />
                  </ProtectedRoute>
                }
              />
              <Route path="analytics" element={<AnalyticsPage />} />
              
              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
