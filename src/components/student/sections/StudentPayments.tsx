// src/components/student/sections/StudentPayments.tsx
// ──────────────────────────────────────────────────────────────
// Section de consultation de l'état financier et des reçus — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { listerPaiementsEtudiant, verifierStatutFinancier } from '../../../services/paymentService';
import { formatDate, formatMontant } from '../../../lib/utils.js';
import { FileIcon, MoneyIcon } from '../../icons/Icons.jsx';
import type { Payment } from '@/types';

interface FinanceSummary {
  statut: string;
  montantRestant: number;
  prochainEcheance: string | number | null;
}

function StudentPayments(): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ statut: 'a_jour', montantRestant: 0, prochainEcheance: null });
  const [paiements, setPaiements] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données financières
  useEffect(() => {
    if (universityId && user?.uid) {
      setLoading(true);
      Promise.all([
        verifierStatutFinancier(universityId, user.uid),
        listerPaiementsEtudiant(universityId, user.uid)
      ])
        .then(([summary, history]) => {
          setFinanceSummary(summary);
          setPaiements(history as Payment[]);
        })
        .catch((err) => console.error('Erreur chargement données financières:', err))
        .finally(() => setLoading(false));
    }
  }, [universityId, user]);

  // Calculer le total payé
  const totalPaye = useMemo(() => {
    return paiements.reduce((acc, p) => acc + p.montant, 0);
  }, [paiements]);

  // Calculer le total dû
  const totalDu = useMemo(() => {
    return totalPaye + financeSummary.montantRestant;
  }, [totalPaye, financeSummary]);

  // Calcul du countdown pour l'échéance
  const countdownText = useMemo(() => {
    if (!financeSummary.prochainEcheance) return 'Aucune échéance à venir';
    
    const diffTime = new Date(financeSummary.prochainEcheance).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} jour(s)`;
    if (diffDays === 0) return "Échéance aujourd'hui";
    return `Dans ${diffDays} jour(s) (${formatDate(new Date(financeSummary.prochainEcheance).getTime())})`;
  }, [financeSummary]);

  // Exporter le reçu en JSON
  const handleTelechargerRecu = (paiement: Payment) => {
    const reçu = {
      description: "Reçu de paiement de frais de scolarité GU",
      dateEdition: new Date().toISOString(),
      recuNumero: paiement.numeroRecu,
      etudiantId: paiement.studentId,
      montantPaye: paiement.montant,
      modePaiement: paiement.modePaiement,
      reference: paiement.reference || 'Aucune',
      details: paiement.description || 'Paiement de scolarité',
      datePaiement: new Date(paiement.timestamp).toISOString(),
    };

    const blob = new Blob([JSON.stringify(reçu, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `recu_${paiement.numeroRecu}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
        <span className="text-on-surface-muted text-xs">Chargement de vos paiements...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      {/* ── BILAN COMPTABLE CARD ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Dû */}
        <div className="glass-card p-4 border border-white/5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider">Total Scolarité</div>
            <div className="text-xl font-bold font-display text-on-surface mt-1">{formatMontant(totalDu)}</div>
          </div>
          <div className="p-2 bg-white/5 rounded text-on-surface-muted">
            <MoneyIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Total Payé */}
        <div className="glass-card p-4 border border-white/5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider">Montant Versé</div>
            <div className="text-xl font-bold font-display text-green-400 mt-1">{formatMontant(totalPaye)}</div>
          </div>
          <div className="p-2 bg-green-500/10 rounded text-green-400">
            <MoneyIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Solde restant */}
        <div className="glass-card p-4 border border-white/5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider">Reste à recouvrer</div>
            <div className="text-xl font-bold font-display text-accent mt-1">{formatMontant(financeSummary.montantRestant)}</div>
          </div>
          <div className="p-2 bg-accent/10 rounded text-accent">
            <MoneyIcon className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* ── COMPTE À REBOURS ÉCHÉANCE ── */}
      {financeSummary.montantRestant > 0 && (
        <div className="glass-card p-4 border border-white/5 rounded-lg flex justify-between items-center text-xs">
          <span>Prochaine échéance de versement :</span>
          <strong className={`badge border-none px-2.5 py-1 text-[10px] font-bold uppercase ${
            financeSummary.statut === 'en_retard' || financeSummary.statut === 'bloque'
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {countdownText}
          </strong>
        </div>
      )}

      {/* ── TABLEAU HISTORIQUE DES VERSEMENTS ── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">Historique de mes règlements</h3>
        
        <div className="glass-card border border-white/5 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs text-on-surface">
              <thead>
                <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px] uppercase">
                  <th className="py-3 pl-4">Date de Paiement</th>
                  <th className="py-3">Montant réglé</th>
                  <th className="py-3">Mode</th>
                  <th className="py-3">Référence / Pièce</th>
                  <th className="py-3">N° de Reçu</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paiements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-on-surface-muted italic">
                      Aucun versement n'a encore été enregistré pour cette année.
                    </td>
                  </tr>
                ) : (
                  paiements.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                      <td className="py-2.5 pl-4">{formatDate(p.timestamp)}</td>
                      <td className="py-2.5 font-bold text-green-400">{formatMontant(p.montant)}</td>
                      <td className="py-2.5 capitalize">{p.modePaiement}</td>
                      <td className="py-2.5 text-on-surface-muted">{p.reference || 'Aucune'}</td>
                      <td className="py-2.5 font-mono text-accent font-semibold">{p.numeroRecu}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <button
                          onClick={() => handleTelechargerRecu(p)}
                          className="btn btn-xs h-6 px-2.5 bg-surface hover:bg-surface-hover text-on-surface border border-white/10 rounded flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <FileIcon className="w-3 h-3" />
                          <span>Reçu JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

export default StudentPayments;
export { StudentPayments };
