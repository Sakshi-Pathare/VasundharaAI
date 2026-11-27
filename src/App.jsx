import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LandingLayout } from './layouts/LandingLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Code-split route components via dynamic imports
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AppPortalPage = lazy(() => import('./pages/AppPortalPage').then(m => ({ default: m.AppPortalPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const ReportLitterPage = lazy(() => import('./pages/ReportLitterPage').then(m => ({ default: m.ReportLitterPage })));
const PollutionMapPage = lazy(() => import('./pages/PollutionMapPage').then(m => ({ default: m.PollutionMapPage })));
const MyReportsPage = lazy(() => import('./pages/MyReportsPage').then(m => ({ default: m.MyReportsPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage').then(m => ({ default: m.SuperAdminPage })));
const HotspotIntelligencePage = lazy(() => import('./pages/HotspotIntelligencePage').then(m => ({ default: m.HotspotIntelligencePage })));
const CleanupManagementPage = lazy(() => import('./pages/CleanupManagementPage').then(m => ({ default: m.CleanupManagementPage })));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 text-[#1B4332] animate-spin" />
      <p className="text-xs font-semibold text-charcoal-600">Loading experience...</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
