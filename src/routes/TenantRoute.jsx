// src/routes/TenantRoute.jsx
// ──────────────────────────────────────────────────────────────
// Route de tenant : exige un identifiant d'université (universityId).
// Assure l'isolation et redirige vers /login si absent.
// ──────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function TenantRoute() {
  const { userProfile } = useAuth();

  if (!userProfile || !userProfile.universityId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default TenantRoute;
