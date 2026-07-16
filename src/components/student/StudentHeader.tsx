// src/components/student/StudentHeader.tsx
// ──────────────────────────────────────────────────────────────
// En-tête de l'espace Étudiant — version TSX.
// Affiche le statut financier en temps réel et les notifications.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../hooks/useFirebaseData';
import { verifierStatutFinancier } from '../../services/paymentService';
import { formatMontant } from '../../lib/utils.js';
import { BellIcon } from '../icons/Icons.jsx';
import type { Notification } from '@/types';

interface StudentHeaderProps {
  title?: string;
}

function StudentHeader({ title = 'Tableau de Bord' }: StudentHeaderProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Statut financier de l'étudiant
  const [financeStatut, setFinanceStatut] = useState({ statut: 'a_jour', montantRestant: 0 });

  useEffect(() => {
    if (universityId && user?.uid) {
      verifierStatutFinancier(universityId, user.uid)
        .then((res) => setFinanceStatut(res))
        .catch((err) => console.error('Erreur statut financier:', err));
    }
  }, [universityId, user]);

  // Notifications de l'étudiant connectée
  const { data: notifsData } = useFirebaseData('notifications', universityId);

  const nbNonLues = useMemo(() => {
    if (!notifsData) return 0;
    const list = Object.values(notifsData) as Notification[];
    return list.filter(
      (n) =>
        !n.lue &&
        (n.destinataireId === user?.uid ||
          n.destinataireId === 'all' ||
          n.destinataireId === 'students')
    ).length;
  }, [notifsData, user]);

  return (
    <header className="h-14 min-h-[56px] sticky top-0 bg-bg/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20 font-body">
      
      {/* Titre */}
      <h1 className="text-xl font-display font-bold text-on-surface truncate pr-4">
        {title}
      </h1>

      {/* Badges d'état */}
      <div className="flex items-center gap-4">
        
        {/* Statut Financier */}
        {financeStatut.statut === 'a_jour' ? (
          <span className="badge badge-success text-[10px] h-6 px-3 font-semibold uppercase tracking-wider text-bg border-none rounded">
            À jour
          </span>
        ) : (
          <span className="badge badge-error text-[10px] h-6 px-3 font-semibold uppercase tracking-wider text-white border-none rounded flex items-center gap-1.5 animate-pulse">
            <span>Paiement dû :</span>
            <strong>{formatMontant(financeStatut.montantRestant)}</strong>
          </span>
        )}

        {/* Cloche de Notifications */}
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

export default StudentHeader;
export { StudentHeader };
