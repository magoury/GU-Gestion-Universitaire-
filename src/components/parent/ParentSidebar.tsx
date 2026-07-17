// src/components/parent/ParentSidebar.tsx
// ──────────────────────────────────────────────────────────────
// Sidebar pour l'espace Parent — Version TSX.
// ──────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { logout } from '../../services/authService';
import LogoGU from '../ui/LogoGU.jsx';
import {
  HomeIcon,
  NotesIcon,
  ClockIcon,
  MoneyIcon,
  HelpIcon,
  LogoutIcon
} from '../icons/Icons';
import type { Student } from '@/types';

type ParentSection = 'overview' | 'results' | 'absences' | 'payments' | 'contact';

interface ParentSidebarProps {
  etudiantLie: Student | null;
  activeSection: ParentSection;
  onSectionChange: (section: ParentSection) => void;
}

const MENU_ITEMS: Array<{ id: ParentSection; label: string; Icon: React.ComponentType<any> }> = [
  { id: 'overview', label: "Vue d'ensemble", Icon: HomeIcon },
  { id: 'results', label: 'Résultats', Icon: NotesIcon },
  { id: 'absences', label: 'Absences', Icon: ClockIcon },
  { id: 'payments', label: 'Paiements', Icon: MoneyIcon },
  { id: 'contact', label: "Contacter l'école", Icon: HelpIcon },
];

function ParentSidebar({
  etudiantLie,
  activeSection = 'overview',
  onSectionChange,
}: ParentSidebarProps): React.JSX.Element {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { universityConfig } = useTenant();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  const nomParent = userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Chargement...';
  const initiales = userProfile && userProfile.prenom && userProfile.nom
    ? `${userProfile.prenom.charAt(0)}${userProfile.nom.charAt(0)}`.toUpperCase()
    : 'P';
  const nomUniv = universityConfig?.nom || 'Mon Établissement';
  const nomEtudiant = etudiantLie ? `${etudiantLie.prenom} ${etudiantLie.nom}` : 'Aucun étudiant lié';

  return (
    <aside className="w-52 fixed left-0 top-0 h-screen bg-bg/95 backdrop-blur-md border-r border-white/10 flex flex-col z-30 font-body shrink-0 select-none">
      
      {/* En-tête : Logo & Nom Université */}
      <div className="p-4 border-b border-white/10 flex flex-col items-center gap-1">
        <LogoGU size="sm" showSubtext={false} />
        <div className="text-[10px] text-on-surface-muted text-center truncate max-w-full font-body uppercase mt-1">
          {nomUniv}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {MENU_ITEMS.map((item) => {
          const estActif = activeSection === item.id;
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange?.(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded transition-all text-left cursor-pointer ${
                estActif
                  ? 'border-l-2 border-accent bg-surface/80 text-accent text-xs font-semibold'
                  : 'text-on-surface-muted text-xs hover:bg-surface/50 hover:text-on-surface'
              }`}
            >
              <ItemIcon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pied de page : Profil Parent & Étudiant Lié & Déconnexion */}
      <div className="p-3 border-t border-white/10 flex flex-col gap-3 bg-surface/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-accent flex items-center justify-center font-bold text-xs shrink-0">
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate text-on-surface">{nomParent}</div>
            <div className="text-[9px] text-accent font-medium truncate">Parent / Tuteur</div>
            <div className="text-[9px] text-on-surface-muted truncate">Enfant : {nomEtudiant}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-surface hover:bg-red-500/10 text-on-surface hover:text-red-400 text-xs font-semibold border border-white/5 transition-all cursor-pointer"
        >
          <LogoutIcon className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>

    </aside>
  );
}

export default ParentSidebar;
export { ParentSidebar };
