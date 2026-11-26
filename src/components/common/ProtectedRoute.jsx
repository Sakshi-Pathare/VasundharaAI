import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';

/**
 * ProtectedRoute: Enforces authentication and role-based access control on frontend routes.
 *
 * @param {React.ReactNode} children - The component to render if authorized.
 * @param {string[]} [allowedRoles] - Optional list of permitted roles (e.g. ['municipal_admin', 'super_admin']).
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-[#74D7CB] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#52665B] font-bold">Verifying authorization token...</p>
      </div>
    );
  }

  // Not authenticated: redirect to login and preserve target location
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check: if specific roles are required and user role is not authorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold tracking-wider text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full border border-rose-200 uppercase">
              Role Access Restricted
            </span>
            <h2 className="text-2xl font-serif font-bold text-[#102F24]">
              Insufficient Permissions
            </h2>
            <p className="text-xs text-[#52665B] leading-relaxed">
              This module requires{' '}
              <span className="font-bold text-[#102F24]">
                {allowedRoles.map((r) => r.replace('_', ' ')).join(' or ')}
              </span>{' '}
              authority. Your current session role is{' '}
              <span className="font-bold text-rose-700 font-mono">
                {user.roleLabel || user.role}
              </span>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link to="/app" className="w-full">
              <Button
                variant="outline"
                size="sm"
                icon={Compass}
                className="w-full font-bold text-xs rounded-full py-2.5"
              >
                Return to Hub
              </Button>
            </Link>
            <Link to="/login" state={{ from: location }} className="w-full">
              <Button
                variant="primary"
                size="sm"
                icon={LogIn}
                className="w-full bg-[#102F24] text-white font-bold text-xs rounded-full py-2.5"
              >
                Switch Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
