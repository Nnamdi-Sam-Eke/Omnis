// PublicRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Optionally render a loader while checking auth
    return <div>Loading...</div>;
  }

  return !user ? children : <Navigate to="/overview" />;
};

export default PublicRoute;
