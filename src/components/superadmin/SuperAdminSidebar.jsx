// src/components/superadmin/SuperAdminSidebar.jsx
// ──────────────────────────────────────────────────────────────
// Sidebar fixe w-52 h-screen pour le Command Center du Super Admin.
// ──────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { logout } from '../../services/authService.js';
import LogoGU from '../ui/LogoGU.jsx';
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
  LogoutIcon,
  BuildingIcon,
  AnalyticsIcon
} from '../icons/Icons.jsx';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', Icon: HomeIcon },
  { id: 'analytics', label: 'Analytics', Icon: AnalyticsIcon },
  { id: 'universites', label: 'Universités', Icon: BuildingIcon },
  { id: 'utilisateurs', label: 'Utilisateurs', Icon: TeachersIcon },
  { id: 'config', label: 'Paramètres', Icon: SettingsIcon },
];

const TENANT_ITEMS = [
  { id: 'overview', label: "Vue d'ensemble", Icon: HomeIcon },
  { id: 'students', label: 'Étudiants', Icon: StudentsIcon },
  { id: 'teachers', label: 'Enseignants', Icon: TeachersIcon },
  { id: 'notes', label: 'Notes & Bulletins', Icon: NotesIcon },
  { id: 'finances', label: 'Finances', Icon: MoneyIcon },
  { id: 'library', label: 'Bibliothèque', Icon: LibraryIcon },
  { id: 'notifications', label: 'Notifications', Icon: BellIcon },
  { id: 'audit', label: 'Audit & Journaux', Icon: ClockIcon },
  { id: 'config', label: 'Configuration', Icon: SettingsIcon },
];

function SuperAdminSidebar({ activeSection = 'overview', onSectionChange, mode = 'global' }) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const items = mode === 'impersonate' ? TENANT_ITEMS : NAV_ITEMS;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  const prenom = userProfile?.prenom || '';
  const nom = userProfile?.nom || '';
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'SA';

  return (
    <aside className="w-52 fixed left-0 top-0 h-screen bg-bg/95 backdrop-blur-md border-r border-white/10 flex flex-col z-30">
      
      {/* En-tête : Logo & Titre Command Center */}
      <div className="p-4 border-b border-white/10 flex flex-col items-center gap-1">
        <LogoGU size="xs" onClick={() => onSectionChange?.('overview')} clickable={true} showSubtext={false} />
        <div className="text-[9px] text-accent tracking-widest font-semibold font-body uppercase mt-1">
          Command Center
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-0.5 sidebar-nav">
        {items.map((item) => {
          const estActif = activeSection === item.id;
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange?.(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-left ${
                estActif
                  ? 'border-l-2 border-accent bg-surface text-accent text-xs font-semibold'
                  : 'text-on-surface-muted text-xs hover:bg-surface/50 hover:text-on-surface'
              }`}
            >
              <ItemIcon className={`w-4 h-4 ${estActif ? 'text-accent' : 'text-on-surface-muted'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pied de page : Profil Super Admin */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2 bg-surface/20">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Avatar initiales */}
          <div className="w-8 h-8 rounded-full bg-primary-container text-accent flex items-center justify-center text-xs font-bold font-display border border-white/10 flex-shrink-0">
            {initiales}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium text-on-surface truncate leading-tight">
              {prenom} {nom}
            </span>
            <span className="text-[9px] text-accent font-semibold uppercase tracking-wider">
              Super Admin
            </span>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          title="Se déconnecter"
          className="p-1.5 rounded text-on-surface-muted hover:text-error hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <LogoutIcon className="w-4 h-4" />
        </button>
      </div>

    </aside>
  );
}

export default SuperAdminSidebar;
