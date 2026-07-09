// src/routes/PrivateRoute.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Route protégée : exige que l'utilisateur soit connecté (currentUser !== null).
// Affiche un spinner centré sur fond vert forêt #041710 pendant le chargement.
// Redirige vers /login sinon.
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Spinner de chargement partagé.
 * Utilise la charte graphique vert forêt #041710.
 */
export function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#041710',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid rgba(149, 212, 179, 0.2)',
        borderTopColor: '#95D4B3',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PrivateRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
