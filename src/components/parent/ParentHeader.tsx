// src/components/parent/ParentHeader.tsx
// ──────────────────────────────────────────────────────────────
// En-tête de l'espace Parent — Version TSX.
// Intègre la sélection de l'enfant dans le cas de fratrie.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../hooks/useFirebaseData';
import { verifierStatutFinancier } from '../../services/paymentService';
import { formatMontant } from '../../lib/utils';
import { BellIcon } from '../icons/Icons';
import type { Student, Notification } from '@/types';

interface ParentHeaderProps {
  title: string;
  etudiantLie: Student | null;
  linkedStudents: Student[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

function ParentHeader({
  title = 'Tableau de Bord',
  etudiantLie,
  linkedStudents,
  selectedStudentId,
  onSelectStudent,
}: ParentHeaderProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Statut financier de l'étudiant lié
  const [financeStatut, setFinanceStatut] = useState<{ statut: string; montantRestant: number }>({
    statut: 'a_jour',
    montantRestant: 0,
  });

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
    const list = Object.values(notifsData) as Notification[];
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
    <header className="h-14 sticky top-0 bg-bg/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-20 font-body shrink-0">
      
      {/* Titre */}
      <h1 className="text-sm font-display font-bold text-on-surface uppercase tracking-wider truncate flex-shrink-0">
        {title}
      </h1>

      {/* Sélecteur d'enfant si fratrie (> 1), ou texte simple si enfant unique */}
      <div className="flex items-center gap-2">
        {linkedStudents.length > 1 ? (
          <div className="flex items-center gap-1.5 bg-surface/60 px-3 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-on-surface-muted font-medium">Élève :</span>
            <select
              value={selectedStudentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="bg-transparent border-none text-xs text-accent font-semibold focus:outline-none cursor-pointer"
            >
              {linkedStudents.map((s) => (
                <option key={s.id} value={s.id} className="bg-bg text-on-surface">
                  {s.prenom} {s.nom} ({s.matricule})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden md:block text-xs text-on-surface-muted bg-surface/40 px-3 py-1.5 rounded-full border border-white/5">
            Suivi de : <span className="font-semibold text-accent">{nomEtudiant}</span>
          </div>
        )}
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
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
              {nbNonLues}
            </span>
          )}
        </div>

      </div>

    </header>
  );
}

export default ParentHeader;
export { ParentHeader };
