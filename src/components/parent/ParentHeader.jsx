// src/components/parent/ParentHeader.jsx
// ──────────────────────────────────────────────────────────────
// En-tête de l'espace Parent.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../hooks/useFirebaseData.js';
import { verifierStatutFinancier } from '../../services/paymentService.js';
import { formatMontant } from '../../lib/utils.js';
import { BellIcon } from '../icons/Icons.jsx';

function ParentHeader({ title = 'Tableau de Bord', etudiantLie }) {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Statut financier de l'étudiant lié
  const [financeStatut, setFinanceStatut] = useState({ statut: 'a_jour', montantRestant: 0 });

  useEffect(() => {
    if (universityId && etudiantLie?.id) {
      verifierStatutFinancier(universityId, etudiantLie.id)
        .then((res) => setFinanceStatut(res))
        .catch((err) => console.error('Erreur statut financier:', err));
    }
  }, [universityId, etudiantLie]);

  // Notifications de l'utilisateur parent
  const { data: notifsData } = useFirebaseData('notifications', universityId);

  const nbNonLues = useMemo(() => {
    if (!notifsData || !user) return 0;
    const list = Object.values(notifsData);
    return list.filter(
      (n) =>
        !n.lue &&
        (n.destinataireId === user.uid ||
          n.destinataireId === 'all' ||
          n.destinataireId === 'parents')
    ).length;
  }, [notifsData, user]);

  const nomEtudiant = etudiantLie ? `${etudiantLie.prenom} ${etudiantLie.nom}` : 'Chargement...';

  return (
    <header className="h-14 sticky top-0 bg-bg/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20 font-body">
      
      {/* Titre */}
      <h1 className="text-xl font-display font-bold text-on-surface truncate flex-shrink-0">
        {title}
      </h1>

      {/* Texte central discret */}
      <div className="hidden md:block text-xs text-on-surface-muted bg-surface/40 px-3 py-1.5 rounded-full border border-white/5">
        Suivi de : <span className="font-semibold text-accent">{nomEtudiant}</span>
      </div>

      {/* Badges d'état */}
      <div className="flex items-center gap-4">
        
        {/* Statut Financier de l'élève */}
        {financeStatut.statut !== 'a_jour' && financeStatut.montantRestant > 0 && (
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

export default ParentHeader;
