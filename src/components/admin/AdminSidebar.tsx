// src/components/admin/AdminSidebar.tsx
// ──────────────────────────────────────────────────────────────
// Sidebar pour l'espace d'administration de l'université.
// Barre de navigation fixe 208px (w-52) au look vert forêt et doré.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoGU from '../ui/LogoGU.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { logout } from '../../services/authService';
import {
  HomeIcon,
  StudentsIcon,
  TeachersIcon,
  NotesIcon,
  MoneyIcon,
  LibraryIcon,
  BellIcon,
  ClockIcon,
  SettingsIcon,
  LogoutIcon
} from '../icons/Icons.jsx';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const MENU_ITEMS = [
  { id: 'overview', label: "Vue d'ensemble", icon: HomeIcon },
  { id: 'students', label: 'Étudiants', icon: StudentsIcon },
  { id: 'teachers', label: 'Enseignants', icon: TeachersIcon },
  { id: 'notes', label: 'Notes & Bulletins', icon: NotesIcon },
  { id: 'finances', label: 'Finances', icon: MoneyIcon },
  { id: 'library', label: 'Bibliothèque', icon: LibraryIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'audit', label: 'Audit & Journaux', icon: ClockIcon },
  { id: 'config', label: 'Configuration', icon: SettingsIcon },
];

function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps): React.JSX.Element {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { universityConfig, universityId } = useTenant();

  const nomUniversite = universityConfig?.nom || universityId || 'Université';

  const nomComplet = userProfile ? `${userProfile.prenom} ${userProfile.nom}` : '—';
  
  const initiales = useMemo(() => {
    if (!userProfile) return 'AD';
    const p = (userProfile.prenom?.[0] || '').toUpperCase();
    const n = (userProfile.nom?.[0] || '').toUpperCase();
    return `${p}${n}`;
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  return (
    <aside className="w-52 fixed left-0 top-0 h-screen bg-bg/95 backdrop-blur-md border-r border-white/10 flex flex-col z-30 animate-slide-right">
      
      {/* En-tête : Logo & Infos Université */}
      <div className="p-4 border-b border-white/10 flex flex-col items-center gap-1.5">
        <LogoGU size="xs" onClick={() => onSectionChange('overview')} clickable={true} showSubtext={false} />
        <div className="text-center mt-1">
          <div className="font-display font-semibold text-on-surface text-xs truncate max-w-[180px]" title={nomUniversite}>
            {nomUniversite}
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-0.5 sidebar-nav">
        {MENU_ITEMS.map((item) => {
          const estActif = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 text-left ${
                estActif
                  ? 'border-l-4 border-accent bg-surface text-accent font-bold'
                  : 'text-on-surface-muted hover:bg-surface/50 hover:text-on-surface'
              }`}
            >
              <Icon className={`w-4 h-4 ${estActif ? 'text-accent' : 'text-on-surface-muted'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pied : Infos Admin & Déconnexion */}
      <div className="p-3 border-t border-white/10 bg-surface-high/30 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="avatar placeholder animate-scale-up">
            <div className="bg-primary-container text-on-surface w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
              <span>{initiales}</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-on-surface truncate max-w-[130px]" title={nomComplet}>
              {nomComplet}
            </div>
            <div className="text-[9px] text-primary uppercase font-bold tracking-wider mt-0.5">
              Administrateur
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-xs btn-ghost text-error w-full flex items-center justify-center gap-1.5 hover:bg-error/10 text-xs py-1"
        >
          <LogoutIcon className="w-3.5 h-3.5 text-error" />
          <span>Déconnexion</span>
        </button>
      </div>

    </aside>
  );
}

export default AdminSidebar;
export { AdminSidebar };
