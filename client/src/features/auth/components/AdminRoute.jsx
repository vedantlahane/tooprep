import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute Guard
 * 
 * Ensures that only authenticated users who have profile.is_admin === true
 * can access administrative routes (/admin/*).
 * 
 * If loading: shows a clean Metro loading spinner.
 * If not logged in: redirects to /auth.
 * If logged in as normal student: redirects to / (Knowledge Map) with no leak.
 */
export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
