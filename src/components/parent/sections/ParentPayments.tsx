// src/components/parent/sections/ParentPayments.tsx
// ──────────────────────────────────────────────────────────────
// Section Paiements (Lecture + action Payer en ligne) — Version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import {
  verifierStatutFinancier,
  listerPaiementsEtudiant,
  enregistrerPaiement
} from '../../../services/paymentService';
import { formatDate, formatMontant } from '../../../lib/utils';
import { FileIcon } from '../../icons/Icons';
import type { Student, Payment, FraisConfig } from '@/types';

interface ParentPaymentsProps {
  etudiantLie: Student;
}

function ParentPayments({ etudiantLie }: ParentPaymentsProps): React.JSX.Element {
  const { universityId } = useTenant();

  const [financeSummary, setFinanceSummary] = useState<{ statut: string; montantRestant: number; prochainEcheance: string | null }>({
    statut: 'a_jour',
    montantRestant: 0,
    prochainEcheance: null
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Modal Paiement
  const [checkoutModal, setCheckoutModal] = useState<boolean>(false);
  const [montantSaisi, setMontantSaisi] = useState<string>('');
  const [nomCarte, setNomCarte] = useState<string>('');
  const [numCarte, setNumCarte] = useState<string>('');
  const [expCarte, setExpCarte] = useState<string>('');
  const [cvcCarte, setCvcCarte] = useState<string>('');
  const [payementEnCours, setPayementEnCours] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Charger les configurations de frais
  const { data: allFrais } = useFirebaseData('frais', universityId);

  // Charger les données financières
  useEffect(() => {
    if (universityId && etudiantLie?.id) {
      setLoading(true);
      Promise.all([
        verifierStatutFinancier(universityId, etudiantLie.id),
        listerPaiementsEtudiant(universityId, etudiantLie.id)
      ])
        .then(([summary, history]) => {
          setFinanceSummary({
            statut: summary.statut,
            montantRestant: summary.montantRestant,
            prochainEcheance: summary.prochainEcheance || null
          });
          setPayments(history);
        })
        .catch((err) => console.error('Erreur chargement données financières:', err))
        .finally(() => setLoading(false));
    }
  }, [universityId, etudiantLie, reloadKey]);

  // Frais configurés pour la filière de l'étudiant
  const configFrais = useMemo<FraisConfig | null>(() => {
    if (!allFrais || !etudiantLie || !etudiantLie.filiere) return null;
    const configMap = allFrais as Record<string, FraisConfig>;
    return configMap[etudiantLie.filiere] || null;
  }, [allFrais, etudiantLie]);

  // Total des frais de l'année
  const totalFrais = useMemo(() => {
    return configFrais?.montantTotal || 0;
  }, [configFrais]);

  // Montant payé à ce jour
  const totalPaye = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.montant, 0);
  }, [payments]);

  // Solde restant
  const soldeRestant = useMemo(() => {
    return Math.max(totalFrais - totalPaye, 0);
  }, [totalFrais, totalPaye]);

  // Reçu téléchargement JSON
  const handleTelechargerRecu = (paiement: Payment) => {
    const reçu = {
      description: "Reçu de paiement de frais de scolarité GU - Espace Parent",
      dateEdition: new Date().toISOString(),
      recuNumero: paiement.numeroRecu,
      etudiantId: paiement.studentId,
      etudiantNom: `${etudiantLie.prenom} ${etudiantLie.nom}`,
      matricule: etudiantLie.matricule,
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
    link.download = `recu_parent_${paiement.numeroRecu}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOuvrirCheckout = () => {
    setMontantSaisi(Math.min(financeSummary.montantRestant, soldeRestant).toString());
    setNomCarte('');
    setNumCarte('');
    setExpCarte('');
    setCvcCarte('');
    setCheckoutSuccess(false);
    setCheckoutError('');
    setCheckoutModal(true);
  };

  const handlePaiementCB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId || !etudiantLie?.id) return;

    const montant = Number(montantSaisi);
    if (isNaN(montant) || montant <= 0) {
      setCheckoutError('Veuillez saisir un montant de paiement valide.');
      return;
    }
    if (montant > soldeRestant) {
      setCheckoutError(`Le montant saisi dépasse le solde restant à payer (${formatMontant(soldeRestant)}).`);
      return;
    }

    if (!nomCarte.trim() || numCarte.replace(/\s/g, '').length !== 16 || !expCarte.trim() || cvcCarte.replace(/\s/g, '').length !== 3) {
      setCheckoutError('Veuillez renseigner des coordonnées de carte de paiement valides.');
      return;
    }

    setPayementEnCours(true);
    setCheckoutError('');

    try {
      // Simuler le délai de la passerelle de paiement
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enregistrer le paiement dans Firebase
      await enregistrerPaiement(universityId, {
        studentId: etudiantLie.id,
        montant,
        modePaiement: 'carte_bancaire',
        description: `Règlement scolarité par carte - Espace Parent`,
        reference: `CB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      });

      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutModal(false);
        setReloadKey((prev) => prev + 1);
      }, 2000);
    } catch (err) {
      console.error('Erreur transaction financière:', err);
      setCheckoutError('La transaction a été rejetée par la banque. Veuillez réessayer.');
    } finally {
      setPayementEnCours(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body animate-fade-in">
      
      {/* 3 KPI Cards Finances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Frais Scolarité de l'Année */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Scolarité Annuelle</span>
            <span className="text-sm">💵</span>
          </div>
          <div className="mt-2 text-xl font-bold font-display text-on-surface">
            {formatMontant(totalFrais)}
          </div>
        </div>

        {/* Montant Déjà Réglé */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Montant Réglé</span>
            <span className="text-sm">✓</span>
          </div>
          <div className="mt-2 text-xl font-bold font-display text-green-400">
            {formatMontant(totalPaye)}
          </div>
        </div>

        {/* Reste à Payer (Solde) */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Reste à Solder</span>
            <span className="text-sm">⚠️</span>
          </div>
          <div className="mt-2 text-xl font-bold font-display text-accent">
            {formatMontant(soldeRestant)}
          </div>
        </div>

      </div>

      {/* Bouton de paiement en ligne si solde > 0 */}
      {soldeRestant > 0 && (
        <div className="bg-surface/60 backdrop-blur border border-white/10 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">Règlement en ligne des frais</h3>
            <p className="text-[10px] text-on-surface-muted mt-1">
              Vous pouvez régler tout ou partie des frais restants par carte bancaire de manière entièrement sécurisée.
            </p>
          </div>
          <button
            onClick={handleOuvrirCheckout}
            className="btn btn-xs h-8 px-6 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded transition-all cursor-pointer shrink-0"
          >
            💳 Régler par carte
          </button>
        </div>
      )}

      {/* Tableau historique des reçus */}
      <div className="glass-card border border-white/5 rounded-lg overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 bg-surface/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Historique des Paiements & Reçus
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner text-accent loading-sm animate-spin"></span>
            <span className="text-xs text-on-surface-muted ml-2">Chargement des transactions...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-on-surface-muted text-xs italic">
            Aucun paiement n'a encore été enregistré pour cet élève.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs text-on-surface">
              <thead>
                <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px] uppercase">
                  <th className="py-2.5 pl-4">N° Reçu</th>
                  <th className="py-2.5">Date de Transaction</th>
                  <th className="py-2.5">Mode</th>
                  <th className="py-2.5">Référence / Banque</th>
                  <th className="py-2.5">Montant</th>
                  <th className="py-2.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                    <td className="py-2.5 pl-4 font-semibold text-accent">{p.numeroRecu}</td>
                    <td className="py-2.5 text-on-surface-muted">{formatDate(p.timestamp)}</td>
                    <td className="py-2.5 uppercase text-[10px] font-semibold text-on-surface-muted">
                      {p.modePaiement?.replace('_', ' ') || 'Autre'}
                    </td>
                    <td className="py-2.5 italic text-on-surface-muted">{p.reference || 'Aucune'}</td>
                    <td className="py-2.5 font-bold text-on-surface">{formatMontant(p.montant)}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <button
                        onClick={() => handleTelechargerRecu(p)}
                        className="btn btn-xs h-7 bg-surface hover:bg-accent hover:text-bg border border-white/5 hover:border-transparent text-on-surface text-[10px] rounded cursor-pointer transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <FileIcon className="w-3 h-3" />
                        <span>Reçu (JSON)</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Paiement par carte */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-surface border border-white/10 p-6 rounded-xl shadow-2xl flex flex-col gap-4 relative animate-scale-up text-xs">
            <h3 className="text-sm font-bold text-accent font-display uppercase">Règlement Frais de Scolarité</h3>
            
            <form onSubmit={handlePaiementCB} className="flex flex-col gap-3">
              
              {/* Montant à payer */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-muted">Montant à régler (FCFA)</label>
                <input
                  type="number"
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  className="bg-bg border border-white/10 rounded p-2 text-on-surface text-xs font-semibold focus:outline-none focus:border-accent"
                  max={soldeRestant}
                  min={1}
                />
                <span className="text-[9px] text-on-surface-muted">Solde restant à solder : {formatMontant(soldeRestant)}</span>
              </div>

              {/* Titulaire de la carte */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-muted">Titulaire de la carte</label>
                <input
                  type="text"
                  value={nomCarte}
                  onChange={(e) => setNomCarte(e.target.value)}
                  placeholder="EX : DANIEL MAGOURY"
                  className="bg-bg border border-white/10 rounded p-2 text-on-surface uppercase focus:outline-none focus:border-accent"
                />
              </div>

              {/* N° de carte */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-muted">Numéro de carte bancaire</label>
                <input
                  type="text"
                  maxLength={16}
                  value={numCarte}
                  onChange={(e) => setNumCarte(e.target.value.replace(/\D/g, ''))}
                  placeholder="4000 1234 5678 9010"
                  className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent"
                />
              </div>

              {/* Date Exp & CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-muted">Expiration (MM/AA)</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={expCarte}
                    onChange={(e) => setExpCarte(e.target.value)}
                    placeholder="12/28"
                    className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-muted">Code CVC</label>
                  <input
                    type="password"
                    maxLength={3}
                    value={cvcCarte}
                    onChange={(e) => setCvcCarte(e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {checkoutError && <div className="text-red-400 font-semibold">{checkoutError}</div>}
              {checkoutSuccess && <div className="text-green-400 font-semibold">Transaction acceptée ! Traitement...</div>}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutModal(false)}
                  disabled={payementEnCours || checkoutSuccess}
                  className="btn btn-xs h-8 px-4 bg-surface hover:bg-surface-muted text-on-surface rounded border border-white/10 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={payementEnCours || checkoutSuccess}
                  className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase rounded cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {payementEnCours ? (
                    <>
                      <span className="loading loading-spinner loading-xs animate-spin"></span>
                      <span>Transaction...</span>
                    </>
                  ) : (
                    'Confirmer le paiement'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentPayments;
export { ParentPayments };
