import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LandingLayout } from './layouts/LandingLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { AppPortalPage } from './pages/AppPortalPage';
import { LoginPage } from './pages/LoginPage';
import { UserDashboard } from './pages/UserDashboard';
import { ReportLitterPage } from './pages/ReportLitterPage';
import { PollutionMapPage } from './pages/PollutionMapPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { HotspotIntelligencePage } from './pages/HotspotIntelligencePage';
import { CleanupManagementPage } from './pages/CleanupManagementPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* STAGE 1: Complete Public Landing Website */}
          <Route element={<LandingLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* STAGE 2: Functional Environmental Intelligence Application */}
          <Route element={<AppLayout />}>
            <Route path="/app" element={<AppPortalPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/map" element={<PollutionMapPage />} />
            <Route path="/hotspots" element={<HotspotIntelligencePage />} />

            {/* Authenticated Citizen & User Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportLitterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Municipal Administrator Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['municipal_admin', 'super_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleanups"
              element={
                <ProtectedRoute allowedRoles={['municipal_admin', 'super_admin']}>
                  <CleanupManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Super Administrator Routes */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
