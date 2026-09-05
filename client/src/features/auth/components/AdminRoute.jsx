import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isUserAdmin } from '../context/AuthContext';

/**
 * AdminRoute Guard
 * 
 * Ensures that only authenticated administrators can access
 * administrative routes (/admin/*).
 */
export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const isAdmin = isUserAdmin(user, profile);

  if (loading || (user && profile === undefined && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-primary uppercase tracking-widest">
            Verifying Admin Authorization...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={{ pathname: '/auth', search: location.search, hash: location.hash }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
