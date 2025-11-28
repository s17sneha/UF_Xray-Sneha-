import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

const PublicRoute = ({ children }) => {
  const { loading, isAuthenticated } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated() ? <Navigate to="/" replace /> : children;
};

export default PublicRoute;
