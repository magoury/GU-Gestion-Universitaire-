// src/routes/RoleRoute.jsx
// ──────────────────────────────────────────────────────────────
// Route par rôle (RBAC) : exige un des rôles autorisés.
// Redirige vers /unauthorized si non autorisé, ou /login si non authentifié.
// ──────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * @param {{ roles: Array<'super_admin_plateforme'|'admin_universite'|'teacher'|'student'|'parent'> }} props
 */
function RoleRoute({ roles }) {
  const { userProfile } = useAuth();

  if (!userProfile || !userProfile.role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
