import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, isAuthenticated } = useContext(AuthContext);
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;