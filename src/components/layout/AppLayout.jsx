// src/components/layout/AppLayout.jsx
// ──────────────────────────────────────────────────────────────
// Layout principal du SaaS GU avec le design system "Sylvan Command".
// Sidebar fixe 240px (fond sombre vert forêt, bordure glass).
// Barre latérale active dorée + texte doré pour l'élément actif.
// Header sticky avec LogoGU + Titre + Recherche + Notifications + Menu.
// ──────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoGU from '../ui/LogoGU.jsx';
import ForestBackground from './ForestBackground.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { logout } from '../../services/authService.js';

// ── Configuration de la Navigation par Rôle ──────────────────

const NAVIGATION = {
  super_admin_plateforme: [
    { label: 'Tableau de bord', path: '/superadmin/dashboard', icon: '📊' },
    { label: 'Statistiques', path: '/superadmin/analytics', icon: '📈' },
    { label: 'Corps Enseignant', path: '/superadmin/faculty', icon: '👨‍🏫' },
    { label: 'Étudiants', path: '/superadmin/students', icon: '🎓' },
    { label: 'Inscriptions', path: '/superadmin/enrollment', icon: '📝' },
    { label: 'Paramètres', path: '/superadmin/settings', icon: '⚙️' },
  ],
  admin_universite: [
    { label: 'Tableau de bord', path: '/admin/dashboard', icon: '📊' },
    { label: 'Statistiques', path: '/admin/analytics', icon: '📈' },
    { label: 'Corps Enseignant', path: '/admin/faculty', icon: '👨‍🏫' },
    { label: 'Étudiants', path: '/admin/students', icon: '🎓' },
    { label: 'Inscriptions', path: '/admin/enrollment', icon: '📝' },
    { label: 'Paramètres', path: '/admin/settings', icon: '⚙️' },
  ],
  teacher: [
    { label: 'Tableau de bord', path: '/teacher/dashboard', icon: '📊' },
    { label: 'Mes Cours', path: '/teacher/courses', icon: '📚' },
    { label: 'Notes & Évaluations', path: '/teacher/grades', icon: '📝' },
    { label: 'Emploi du temps', path: '/teacher/schedule', icon: '📅' },
    { label: 'Bibliothèque', path: '/teacher/library', icon: '📖' },
  ],
  student: [
    { label: 'Tableau de bord', path: '/student/dashboard', icon: '📊' },
    { label: 'Mes Cours', path: '/student/courses', icon: '📚' },
    { label: 'Notes & Bulletins', path: '/student/grades', icon: '📝' },
    { label: 'Emploi du temps', path: '/student/schedule', icon: '📅' },
    { label: 'Bibliothèque', path: '/student/library', icon: '📖' },
    { label: 'Paiements & Scolarité', path: '/student/payments', icon: '💳' },
  ],
  parent: [
    { label: 'Vue d\'ensemble', path: '/parent/dashboard', icon: '📊' },
    { label: 'Résultats scolaires', path: '/parent/results', icon: '📝' },
    { label: 'Présences & Absences', path: '/parent/attendance', icon: '📅' },
    { label: 'Paiements & Factures', path: '/parent/payments', icon: '💳' },
    { label: 'Contacter l\'École', path: '/parent/contact', icon: '✉️' },
  ],
};

const TRADUCTION_ROLES = {
  super_admin_plateforme: 'Super Admin',
  admin_universite: 'Administrateur',
  teacher: 'Enseignant',
  student: 'Étudiant',
  parent: 'Parent',
};

/**
 * @param {{ role: string, children: import('react').ReactNode }} props
 */
function AppLayout({ role, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  const navItems = useMemo(() => NAVIGATION[role] || [], [role]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (erreur) {
      console.error('[AppLayout] Erreur lors de la déconnexion:', erreur);
    }
  }, [navigate]);

  const toggleSidebar = useCallback(() => {
    setSidebarOuverte((prev) => !prev);
  }, []);

  const nomComplet = useMemo(() => {
    if (!userProfile) return '—';
    return `${userProfile.prenom} ${userProfile.nom}`;
  }, [userProfile]);

  const initiales = useMemo(() => {
    if (!userProfile) return '??';
    const p = (userProfile.prenom?.[0] || '').toUpperCase();
    const n = (userProfile.nom?.[0] || '').toUpperCase();
    return `${p}${n}`;
  }, [userProfile]);

  const roleAffiche = useMemo(() => TRADUCTION_ROLES[role] || role, [role]);

  // Trouver le titre de la page courante d'après la navigation
  const titrePage = useMemo(() => {
    const itemActif = navItems.find((item) => item.path === location.pathname);
    return itemActif ? itemActif.label : 'Gestion Universitaire';
  }, [navItems, location.pathname]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      color: 'var(--color-on-surface)',
      fontFamily: "var(--font-body)",
    }}>
      {/* ── Arrière-plan Forêt ── */}
      <ForestBackground />

      {/* ── Overlay mobile pour Sidebar ── */}
      {sidebarOuverte && (
        <div
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 12, 8, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      {/* ── Sidebar Glassmorphic ── */}
      <aside style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: 'rgba(4, 16, 12, 0.9)',
        borderRight: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: sidebarOuverte ? 0 : '-240px',
        zIndex: 50,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Section Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <LogoGU
            size="md"
            onClick={() => navigate('/')}
            clickable={true}
          />
        </div>

        {/* Section Navigation */}
        <nav style={{
          flex: 1,
          padding: '24px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {navItems.map((item) => {
            const actif = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOuverte(false);
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: actif ? 'rgba(45, 106, 79, 0.3)' : 'transparent',
                  color: actif ? 'var(--color-accent)' : 'var(--color-on-surface-muted)',
                  fontSize: '0.875rem',
                  fontWeight: actif ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!actif) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--color-on-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!actif) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-on-surface-muted)';
                  }
                }}
              >
                {/* Barre active dorée à gauche */}
                {actif && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '4px',
                    backgroundColor: 'var(--color-accent)',
                    borderRadius: '0 4px 4px 0',
                  }} />
                )}
                <span style={{ fontSize: '1.2rem', opacity: actif ? 1 : 0.8 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pied de la Sidebar — Infos Utilisateur & Déconnexion */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'rgba(10, 25, 20, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={nomComplet}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid var(--color-primary)',
                }}
              />
            ) : (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-container)',
                border: '1px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                flexShrink: 0,
              }}>
                {initiales}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-on-surface)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {nomComplet}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--color-primary)',
                fontWeight: 500,
              }}>
                {roleAffiche}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 180, 171, 0.05)',
              color: 'var(--color-error)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-error)';
              e.currentTarget.style.color = '#041710';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 180, 171, 0.05)';
              e.currentTarget.style.color = 'var(--color-error)';
            }}
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Zone principale de contenu ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: '240px',
        minWidth: 0,
        height: '100%',
      }}>
        {/* Header Sticky */}
        <header style={{
          height: '64px',
          minHeight: '64px',
          backgroundColor: 'rgba(10, 25, 20, 0.8)',
          borderBottom: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Bouton Hamburger Mobile */}
            <button
              onClick={toggleSidebar}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: 'var(--color-on-surface)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px',
              }}
              className="hamburger-btn"
              aria-label="Menu principal"
            >
              ☰
            </button>

            {/* Titre de la Page Active */}
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0,
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.02em',
              color: 'var(--color-on-surface)',
            }}>
              {titrePage}
            </h1>
          </div>

          {/* Outils Header : Recherche, Notifications, Menu Apps */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}>
            {/* Barre de Recherche Glass */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              className: 'header-search-container',
            }}>
              <input
                type="text"
                placeholder="Rechercher..."
                style={{
                  padding: '8px 16px 8px 36px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '180px',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.width = '240px';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.width = '180px';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                }}
              />
              <span style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--color-on-surface-muted)',
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}>🔍</span>
            </div>

            {/* Cloche Notification avec Badge Doré */}
            <button style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              fontSize: '1.25rem',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span>🔔</span>
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent)',
                border: '1.5px solid #041710',
              }} />
            </button>

            {/* Menu Applications (Grille) */}
            <button style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-surface-muted)',
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-on-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-on-surface-muted)'}
            >
              <span>⣿</span>
            </button>
          </div>
        </header>

        {/* Zone de contenu scrollable avec padding 32px */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px',
        }}>
          {children}
        </main>
      </div>

      {/* ── Rendu responsive sur Mobile ── */}
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .header-search-container { display: none !important; }
          aside { left: ${sidebarOuverte ? '0' : '-240px'} !important; }
          aside + div { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          aside { left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;
