// src/routes/RoleRoute.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Route filtrée par rôle (RBAC) : exige que le rôle de l'utilisateur
// connecté figure dans la liste des rôles autorisés.
// Redirige vers /unauthorized si non autorisé, ou /login si non authentifié.
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types/user.types';

interface RoleRouteProps {
  /** Liste des rôles autorisés pour accéder aux sous-routes. */
  roles: Role[];
}

export default function RoleRoute({ roles }: RoleRouteProps) {
  const { userProfile } = useAuth();

  if (!userProfile || !userProfile.role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
