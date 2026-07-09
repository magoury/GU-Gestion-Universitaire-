// src/pages/SuspendedTenantPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page de blocage d'université suspendue.
// S'affiche lorsqu'un utilisateur tente d'accéder à son espace
// alors que la licence de son université est suspendue par le Super Admin.
// ─────────────────────────────────────────────────────────────────────────────

import { signOut } from 'firebase/auth';
import { auth } from '@fb';

export default function SuspendedTenantPage() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('[SuspendedTenantPage] Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#E2E8F0',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '3.5rem',
        fontWeight: 800,
        color: '#EF4444',
        marginBottom: '16px',
      }}>
        ⚠️
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>
        Université Suspendue
      </h1>
      <p style={{
        color: '#94A3B8',
        maxWidth: '500px',
        lineHeight: 1.6,
        fontSize: '1rem',
        marginBottom: '24px'
      }}>
        L'accès aux services en ligne de votre établissement a été temporairement suspendu par l'administration de la plateforme. Veuillez contacter votre direction des études ou le secrétariat de votre université pour régulariser cette situation.
      </p>
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563EB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3B82F6';
        }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
