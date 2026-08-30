import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse-soft text-primary text-headline-md">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={{ pathname: '/auth', search: location.search, hash: location.hash }} replace />;
  }

  return children;
}
