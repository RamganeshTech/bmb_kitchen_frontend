import { useSelector } from 'react-redux';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UserRole } from '../../features/slices/authSlice';
import type { RootState } from '../../features/store/store';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: UserRole[];
}
export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-heading mb-2">Access Restricted</h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            You need to be logged in to view this page. Please sign in to your account to continue.
          </p>
          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-4">
        <div className="max-w-md w-full bg-surface border border-danger/20 rounded-2xl shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} className="text-danger" />
          </div>
          <h2 className="text-2xl font-semibold text-heading mb-2">Unauthorized</h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            You don't have permission to access this area.
          </p>
          <Button variant="secondary" fullWidth onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Renders nested routes via Outlet, or direct children if passed
  return children ? <>{children}</> : <Outlet />;
};
