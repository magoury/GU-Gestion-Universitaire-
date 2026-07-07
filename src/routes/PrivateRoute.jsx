// src/routes/PrivateRoute.jsx
// ──────────────────────────────────────────────────────────────
// Route protégée : exige que l'utilisateur soit connecté.
// Affiche un spinner centré sur fond vert forêt #041710
// pendant le chargement. Redirige vers /login sinon.
// ──────────────────────────────────────────────────────────────

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function PrivateRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
