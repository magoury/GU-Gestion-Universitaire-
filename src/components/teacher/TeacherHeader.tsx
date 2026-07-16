// src/components/teacher/TeacherHeader.tsx
// ──────────────────────────────────────────────────────────────
// En-tête de l'espace Enseignant — version TSX.
// Sticky, barre de recherche et compteur de notifications non lues.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useAuth } from '../../hooks/useAuth';
import { useFirebaseData } from '../../hooks/useFirebaseData';
import { BellIcon, SearchIcon } from '../icons/Icons.jsx';
import type { Notification } from '@/types';

interface TeacherHeaderProps {
  title?: string;
}

function TeacherHeader({ title = 'Enseignant' }: TeacherHeaderProps): React.JSX.Element {
  const { universityId } = useTenant();
  const { user } = useAuth();

  // Écouter toutes les notifications de l'établissement
  const { data: notifsData } = useFirebaseData('notifications', universityId);

  // Filtrer les notifications pour cet enseignant
  const nbNonLues = useMemo(() => {
    if (!notifsData) return 0;
    const items = Object.values(notifsData) as Notification[];
    return items.filter(
      (n) =>
        !n.lue &&
        (n.destinataireId === 'all' ||
          n.destinataireId === 'teachers' ||
          n.destinataireId === user?.uid)
    ).length;
  }, [notifsData, user]);

  return (
    <header className="h-14 min-h-[56px] sticky top-0 bg-bg/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20">
      
      {/* Titre */}
      <h1 className="text-xl font-display font-bold text-on-surface truncate pr-4">
        {title}
      </h1>

      {/* Recherche et notifications */}
      <div className="flex items-center gap-4">
        
        {/* Barre de recherche */}
        <div className="relative w-48 md:w-64">
          <span className="absolute inset-y-0 left-2.5 flex items-center text-on-surface-muted">
            <SearchIcon className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Rechercher un étudiant..."
            className="w-full bg-surface border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-on-surface placeholder-on-surface-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
          />
        </div>

        {/* Badge Notification */}
        <div className="relative p-1.5 rounded-full hover:bg-surface transition-all cursor-pointer">
          <BellIcon className="w-4 h-4 text-on-surface-muted hover:text-on-surface" />
          {nbNonLues > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
              {nbNonLues}
            </span>
          )}
        </div>

      </div>

    </header>
  );
}

export default TeacherHeader;
export { TeacherHeader };
