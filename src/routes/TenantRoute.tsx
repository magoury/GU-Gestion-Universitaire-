// src/routes/TenantRoute.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Route de tenant : exige un identifiant d'université (universityId).
// Assure l'isolation multi-tenant stricte et la vérification de suspension du tenant.
// Redirige vers /suspended si le tenant est suspendu (sauf pour le super admin).
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../contexts/TenantContext';
import { LoadingSpinner } from './PrivateRoute';

export default function TenantRoute() {
  const { userProfile } = useAuth();
  const { estSuspendu, loadingTenant } = useTenant();

  if (!userProfile || !userProfile.universityId) {
    return <Navigate to="/login" replace />;
  }

  // Empêcher l'affichage du dashboard pendant le chargement de la config du tenant
  if (loadingTenant) {
    return <LoadingSpinner />;
  }

  // 🔐 Blocage d'université suspendue
  // Le super_admin_plateforme doit toujours pouvoir accéder pour effectuer des actions d'administration.
  if (estSuspendu && userProfile.role !== 'super_admin_plateforme') {
    return <Navigate to="/suspended" replace />;
  }

  return <Outlet />;
}
