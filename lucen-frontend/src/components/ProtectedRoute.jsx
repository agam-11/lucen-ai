// src/components/ProtectedRoute.jsx
import React from "react";
import { useAuth } from "../hooks/useAuth"; // Or your actual path to the hook
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  // Get the user and loading state from our authentication context
  const { user, loading } = useAuth();

  // 1. If the auth state is still being determined, show a loading message.
  //    This prevents redirecting the user before we know if they are logged in.
  if (loading) {
    return <div>Loading...</div>;
  }

  // 2. If loading is finished and there is no user, redirect to the login page.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If loading is finished and there IS a user, render the child route.
  //    <Outlet /> tells react-router to render whatever child route is matched.
  return <Outlet />;
}

export default ProtectedRoute;
