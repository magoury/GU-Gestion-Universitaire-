// src/components/parent/sections/ParentPayments.jsx
// ──────────────────────────────────────────────────────────────
// Section Paiements (Lecture + action Payer en ligne).
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import {
  verifierStatutFinancier,
  listerPaiementsEtudiant,
  enregistrerPaiement
} from '../../../services/paymentService.js';
import { formatDate, formatMontant } from '../../../lib/utils.js';
import { FileIcon } from '../../icons/Icons.jsx';

function ParentPayments({ etudiantLie }) {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [financeSummary, setFinanceSummary] = useState({ statut: 'a_jour', montantRestant: 0, prochainEcheance: null });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal Paiement
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [montantSaisi, setMontantSaisi] = useState('');
  const [nomCarte, setNomCarte] = useState('');
  const [numCarte, setNumCarte] = useState('');
  const [expCarte, setExpCarte] = useState('');
  const [cvcCarte, setCvcCarte] = useState('');
  const [payementEnCours, setPayementEnCours] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

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
          setFinanceSummary(summary);
          setPayments(history);
        })
        .catch((err) => console.error('Erreur chargement données financières:', err))
        .finally(() => setLoading(false));
    }
  }, [universityId, etudiantLie, reloadKey]);

  // Frais configurés pour la filière de l'étudiant
  const configFrais = useMemo(() => {
    if (!allFrais || !etudiantLie) return null;
    return allFrais[etudiantLie.filiere] || null;
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
  const handleTelechargerRecu = (paiement) => {
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

  // Liste des échéances avec countdown
  const echeancesAvecCountdown = useMemo(() => {
    if (!configFrais?.echeances) return [];

    let cumulDu = 0;
    return configFrais.echeances.map((ech, idx) => {
      cumulDu += Number(ech.montant);
      
      const dateEch = new Date(ech.date);
      const diffTime = dateEch - new Date();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Est-ce que cette échéance est couverte par ce qui a déjà été payé ?
      const estCouverte = totalPaye >= cumulDu;

      return {
        ...ech,
        numero: idx + 1,
        diffDays,
        estCouverte
      };
    });
  }, [configFrais, totalPaye]);

  // Payer en ligne soumission
  const handlePayementSoumission = async (e) => {
    e.preventDefault();
    const montant = Number(montantSaisi);

    if (isNaN(montant) || montant <= 0) {
      setCheckoutError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    if (montant > soldeRestant) {
      setCheckoutError(`Le montant saisi dépasse le solde restant dû (${formatMontant(soldeRestant)}).`);
      return;
    }

    setPayementEnCours(true);
    setCheckoutError('');
    setCheckoutSuccess(false);

    try {
      // Simulation Stripe
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enregistrer le paiement réel sous Firebase
      await enregistrerPaiement(universityId, {
        studentId: etudiantLie.id,
        montant: montant,
        modePaiement: 'virement',
        reference: `STRIPE-TX-${Math.floor(100000 + Math.random() * 900000)}`,
        description: `Paiement en ligne par CB (Espace Parent) — Frais de scolarité`
      });

      setCheckoutSuccess(true);
      setMontantSaisi('');
      setNomCarte('');
      setNumCarte('');
      setExpCarte('');
      setCvcCarte('');

      // Rafraîchir
      setTimeout(() => {
        setCheckoutModal(false);
        setCheckoutSuccess(false);
        setReloadKey((prev) => prev + 1);
      }, 2000);

    } catch (err) {
      console.error(err);
      setCheckoutError("Une erreur s'est produite lors du traitement du paiement.");
    } finally {
      setPayementEnCours(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2 py-20 text-on-surface">
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement des données comptables...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body">
      
      {/* Résumé Financier (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total des frais */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Scolarité Annuelle</span>
            <span className="text-xl">📊</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-on-surface">
            {formatMontant(totalFrais)}
          </div>
        </div>

        {/* Montant Payé */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Montant Réglé</span>
            <span className="text-xl">✓</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-success">
            {formatMontant(totalPaye)}
          </div>
        </div>

        {/* Solde restant */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Solde Restant</span>
            <span className="text-xl">💳</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-accent">
            {formatMontant(soldeRestant)}
          </div>
        </div>

      </div>

      {/* Bloc "Prochaines échéances" */}
      <div className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
          <h3 className="font-bold font-display text-lg">Échéances de Paiement</h3>
          {soldeRestant > 0 && (
            <button
              onClick={() => {
                setMontantSaisi(soldeRestant.toString());
                setCheckoutModal(true);
              }}
              className="btn btn-xs btn-accent text-bg border-none font-bold rounded cursor-pointer"
            >
              💳 Payer le solde en ligne
            </button>
          )}
        </div>

        {echeancesAvecCountdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-on-surface-muted">
            Aucun échéancier de paiement configuré pour cette filière.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {echeancesAvecCountdown.map((ech) => {
              const warningState = ech.diffDays < 7 && ech.diffDays >= 0 && !ech.estCouverte;
              const errorState = ech.diffDays < 0 && !ech.estCouverte;

              let cardBorder = 'border-white/5';
              let badgeColor = 'bg-white/10 text-on-surface-muted';
              let countdownLabel = `Dans ${ech.diffDays} jours`;

              if (ech.estCouverte) {
                cardBorder = 'border-success/20 bg-success/5';
                badgeColor = 'bg-success/20 text-success';
                countdownLabel = 'Réglé';
              } else if (errorState) {
                cardBorder = 'border-error/30 bg-error/5 animate-pulse';
                badgeColor = 'bg-error/20 text-error';
                countdownLabel = `En retard de ${Math.abs(ech.diffDays)} jour(s)`;
              } else if (warningState) {
                cardBorder = 'border-warning/20 bg-warning/5';
                badgeColor = 'bg-warning/20 text-warning';
              }

              return (
                <div
                  key={ech.numero}
                  className={`p-4 rounded-lg border flex justify-between items-center transition-all ${cardBorder}`}
                >
                  <div>
                    <div className="text-xs font-semibold text-on-surface">
                      Échéance {ech.numero} — {ech.description || 'Paiement intermédiaire'}
                    </div>
                    <div className="text-[10px] text-on-surface-muted mt-1">
                      Date limite : {formatDate(new Date(ech.date).getTime()).split(' à ')[0]}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs font-bold text-accent">{formatMontant(ech.montant)}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${badgeColor}`}>
                      {countdownLabel}
                    </span>
                    {!ech.estCouverte && (
                      <button
                        onClick={() => {
                          setMontantSaisi(ech.montant);
                          setCheckoutModal(true);
                        }}
                        className="text-[9px] text-accent font-semibold hover:underline"
                      >
                        Régler →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table des Historiques de paiement */}
      <div className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
        <h3 className="font-bold font-display text-lg mb-4 border-b border-white/5 pb-3">
          Historique des Paiements Effectués
        </h3>

        {payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-muted">
            Aucune transaction financière n'a été enregistrée pour cet étudiant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted font-semibold uppercase">
                  <th className="py-3">Date</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Montant</th>
                  <th className="py-3">Mode</th>
                  <th className="py-3">N° Reçu</th>
                  <th className="py-3">Statut</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3">{formatDate(p.timestamp)}</td>
                    <td className="py-3 font-medium text-on-surface">{p.description || 'Frais de scolarité'}</td>
                    <td className="py-3 font-bold text-accent">{formatMontant(p.montant)}</td>
                    <td className="py-3 text-on-surface-muted capitalize">{p.modePaiement}</td>
                    <td className="py-3 font-mono text-[10px] text-on-surface-muted">{p.numeroRecu}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-success/15 text-success border border-success/20 uppercase">
                        Validé
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleTelechargerRecu(p)}
                        className="btn btn-xs bg-surface-high hover:bg-surface border border-white/10 text-on-surface text-[10px] rounded cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <FileIcon className="w-3 h-3" />
                        <span>Télécharger reçu</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Paiement en ligne (Stripe Checkout) */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold font-display text-on-surface mb-1">
              Paiement en Ligne Sécurisé
            </h3>
            <p className="text-xs text-on-surface-muted mb-4">
              Passerelle de paiement GU. Simulation de transaction chiffrée.
            </p>

            <form onSubmit={handlePayementSoumission} className="flex flex-col gap-4">
              {checkoutError && (
                <div className="p-2.5 bg-error/15 text-error text-xs rounded border border-error/25 font-semibold">
                  ⚠️ {checkoutError}
                </div>
              )}
              {checkoutSuccess && (
                <div className="p-2.5 bg-success/15 text-success text-xs rounded border border-success/25 font-semibold">
                  ✓ Paiement effectué avec succès ! Vos reçus sont mis à jour.
                </div>
              )}

              <div>
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Montant à régler (FCFA)</label>
                <input
                  type="number"
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  placeholder="Montant en FCFA"
                  className="input input-sm input-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs"
                  required
                  disabled={payementEnCours || checkoutSuccess}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Nom sur la carte</label>
                <input
                  type="text"
                  value={nomCarte}
                  onChange={(e) => setNomCarte(e.target.value)}
                  placeholder="Ex : M. KOFFI Yao"
                  className="input input-sm input-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs"
                  required
                  disabled={payementEnCours || checkoutSuccess}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Numéro de carte</label>
                <input
                  type="text"
                  value={numCarte}
                  onChange={(e) => setNumCarte(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                  placeholder="4000 1234 5678 9010"
                  maxLength="19"
                  className="input input-sm input-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs font-mono"
                  required
                  disabled={payementEnCours || checkoutSuccess}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Expiration</label>
                  <input
                    type="text"
                    value={expCarte}
                    onChange={(e) => setExpCarte(e.target.value)}
                    placeholder="MM/AA"
                    maxLength="5"
                    className="input input-sm input-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs text-center"
                    required
                    disabled={payementEnCours || checkoutSuccess}
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Code CVC</label>
                  <input
                    type="password"
                    value={cvcCarte}
                    onChange={(e) => setCvcCarte(e.target.value)}
                    placeholder="•••"
                    maxLength="3"
                    className="input input-sm input-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs text-center font-mono"
                    required
                    disabled={payementEnCours || checkoutSuccess}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setCheckoutModal(false)}
                  className="btn btn-sm bg-surface-high border border-white/10 hover:bg-surface-high/60 text-on-surface rounded cursor-pointer"
                  disabled={payementEnCours || checkoutSuccess}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-accent text-bg border-none hover:opacity-90 rounded cursor-pointer flex items-center gap-1.5"
                  disabled={payementEnCours || checkoutSuccess}
                >
                  {payementEnCours ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Autorisation...</span>
                    </>
                  ) : checkoutSuccess ? (
                    <span>Succès ✓</span>
                  ) : (
                    <span>Payer {montantSaisi ? `${Number(montantSaisi).toLocaleString()} FCFA` : ''}</span>
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
