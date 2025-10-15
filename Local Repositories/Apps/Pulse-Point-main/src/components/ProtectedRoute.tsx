
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // AUTHENTICATION DISABLED FOR TROUBLESHOOTING
  // Component will allow access without checking user authentication
  
  useEffect(() => {
    // Uncomment below to re-enable authentication redirect
    /*
    if (!loading && !user) {
      navigate('/auth');
    }
    */
  }, [user, loading, navigate]);

  /* Uncomment to re-enable loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  */

  return <>{children}</>;
};

export default ProtectedRoute;
