// src/components/admin/sections/FinancesSection.tsx
// ──────────────────────────────────────────────────────────────
// Section financière : tableau de bord, journal des paiements, configuration des frais.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { configurerFraisScolarite, enregistrerPaiement } from '../../../services/paymentService';
import { formatDate, formatMontant } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, MoneyIcon, SettingsIcon } from '../../icons/Icons.jsx';
import type { Student, Payment, ModePaiement } from '@/types';
import LoadingSpinner from '../../ui/LoadingSpinner';
import KPICard from '../../ui/KPICard';

// Filières par défaut (pour le select)
const FILIERES = [
  'Génie Logiciel',
  'Réseaux & Télécommunications',
  'Intelligence Artificielle & Data',
  'Sécurité Informatique & Cyber',
  'Management des Systèmes d\'Information',
];

const MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' },
];

interface FinancesSectionProps {
  universityId?: string;
}

function FinancesSection({ universityId: propUniversityId }: FinancesSectionProps): React.JSX.Element {
  const { universityId: contextUniversityId, universityConfig: contextUniversityConfig } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [localConfig, setLocalConfig] = useState<any>(null);
  useEffect(() => {
    if (propUniversityId) {
      const configRef = ref(database, `universities/${propUniversityId}/config`);
      const unsubscribe = onValue(configRef, (snapshot) => {
        setLocalConfig(snapshot.val());
      });
      return () => unsubscribe();
    }
  }, [propUniversityId]);

  const universityConfig = propUniversityId ? localConfig : contextUniversityConfig;

  // Données temps réel
  const { data: studentsData } = useFirebaseData('students', universityId);
  const { data: paymentsData, loading: loadingPayments } = useFirebaseData('payments', universityId);
  const { data: fraisData } = useFirebaseData('frais', universityId);

  // Convertir en tableaux
  const etudiantsList = useMemo<Student[]>(() => (studentsData ? Object.values(studentsData) as Student[] : []), [studentsData]);
  const paiementsList = useMemo<Payment[]>(() => (paymentsData ? Object.values(paymentsData) as Payment[] : []), [paymentsData]);

  // États des modales
  const [modalPaiementOuverte, setModalPaiementOuverte] = useState(false);
  const [modalFraisOuverte, setModalFraisOuverte] = useState(false);

  // Formulaire Paiement
  const [pIdEtudiant, setPIdEtudiant] = useState('');
  const [pMontant, setPMontant] = useState('');
  const [pMode, setPMode] = useState<ModePaiement>('mobile_money');
  const [pRef, setPRef] = useState('');
  const [pDesc, setPDesc] = useState('');

  // Formulaire Config Frais
  const [fFiliere, setFFiliere] = useState(FILIERES[0]);
  const [fMontantTotal, setFMontantTotal] = useState('');
  const [fAnnee, setFAnnee] = useState(universityConfig?.anneeAcademique || '2025-2026');
  const [fEcheances, setFEcheances] = useState([
    { date: '', montant: '' },
    { date: '', montant: '' },
    { date: '', montant: '' },
  ]);

  // Feedbacks
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  // Calcul des KPIs financiers
  const kpis = useMemo(() => {
    let totalAttendu = 0;
    
    // Total attendu de tous les étudiants selon leur filière
    etudiantsList.forEach((st) => {
      const config = (fraisData as any)?.[st.filiere];
      if (config) {
        totalAttendu += Number(config.montantTotal || 0);
      }
    });

    // Total encaissé
    const totalEncaisse = paiementsList.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const resteADu = Math.max(totalAttendu - totalEncaisse, 0);
    const tauxRecouvrement = totalAttendu > 0 ? Math.min(Math.round((totalEncaisse / totalAttendu) * 100), 100) : 0;

    return { totalAttendu, totalEncaisse, resteADu, tauxRecouvrement };
  }, [etudiantsList, paiementsList, fraisData]);

  // Soumettre Paiement
  const handleEnregistrerPaiementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!pIdEtudiant || !pMontant || isNaN(Number(pMontant))) {
      setErreur("Veuillez sélectionner un étudiant et saisir un montant valide.");
      return;
    }

    try {
      await enregistrerPaiement(universityId, {
        studentId: pIdEtudiant,
        montant: Number(pMontant),
        modePaiement: pMode,
        reference: pRef,
        description: pDesc,
      });
      setSuccess("Paiement enregistré avec succès !");
      setPMontant('');
      setPRef('');
      setPDesc('');
      setModalPaiementOuverte(false);
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'enregistrement transactionnel.");
    }
  };

  // Soumettre Configuration des Frais
  const handleConfigurerFraisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!fMontantTotal || isNaN(Number(fMontantTotal))) {
      setErreur("Veuillez saisir un montant total valide.");
      return;
    }

    // Filtrer et structurer les échéances
    const echeancesFiltrees = fEcheances
      .filter((ech) => ech.date && ech.montant && !isNaN(Number(ech.montant)))
      .map((ech) => ({
        date: ech.date,
        montant: Number(ech.montant),
      }));

    try {
      await configurerFraisScolarite(universityId, fFiliere, {
        montantTotal: Number(fMontantTotal),
        devise: 'FCFA',
        anneeAcademique: fAnnee,
        echeances: echeancesFiltrees,
      });
      setSuccess(`Frais de scolarité pour la filière "${fFiliere}" configurés avec succès.`);
      setFMontantTotal('');
      setFEcheances([
        { date: '', montant: '' },
        { date: '', montant: '' },
        { date: '', montant: '' },
      ]);
      setModalFraisOuverte(false);
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de la configuration.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Boutons d'Action Financiers */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-on-surface-muted text-xs font-semibold">
          Pilotage Budgétaire & Suivi Scolarité
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setModalFraisOuverte(true)}
            className="btn btn-sm btn-outline btn-accent h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Configurer Frais
          </button>
          <button
            onClick={() => setModalPaiementOuverte(true)}
            className="btn btn-sm btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
          >
            <MoneyIcon className="w-3.5 h-3.5" /> Enregistrer Paiement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Total Encaissé"
          value={formatMontant(kpis.totalEncaisse, 'FCFA')}
          sub="Sur les étudiants inscrits"
          variant="primary"
        />
        
        <KPICard
          label="Reste à Recouvrer"
          value={formatMontant(kpis.resteADu, 'FCFA')}
          sub="Créances académiques en attente"
          variant="error"
        />

        <KPICard
          label="Taux de Recouvrement"
          value={`${kpis.tauxRecouvrement}%`}
          variant="accent"
        >
          <div className="w-full mt-1.5">
            <progress className="progress progress-accent w-full h-1 bg-white/10" value={kpis.tauxRecouvrement} max="100"></progress>
          </div>
        </KPICard>
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Tableau historique */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        <div className="p-3 bg-surface-high/30 border-b border-white/10 font-bold text-xs text-on-surface">
          Journal des Opérations Financières
        </div>
        {loadingPayments ? (
          <LoadingSpinner message="Chargement des transactions..." />
        ) : paiementsList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm w-full text-on-surface text-xs">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted text-xs">
                  <th>Reçu</th>
                  <th>Étudiant</th>
                  <th>Date & Heure</th>
                  <th>Montant</th>
                  <th>Mode de Paiement</th>
                  <th>Référence / Obs.</th>
                </tr>
              </thead>
              <tbody>
                {paiementsList.map((p) => {
                  const student = etudiantsList.find(st => st.id === p.studentId);
                  const studentName = student ? `${student.nom} ${student.prenom}` : '—';
                  const matricule = student ? student.matricule : '—';

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] text-xs">
                      <td className="font-mono font-bold text-accent text-[11px]">{p.numeroRecu}</td>
                      <td>
                        <div className="font-bold text-xs">{studentName}</div>
                        <div className="text-[10px] text-on-surface-muted mt-0.5">{matricule}</div>
                      </td>
                      <td className="text-xs">{formatDate(p.timestamp)}</td>
                      <td className="font-bold text-xs text-primary">{formatMontant(p.montant, 'FCFA')}</td>
                      <td className="capitalize font-semibold text-xs">{(p.modePaiement || '').replace('_', ' ')}</td>
                      <td className="text-on-surface-muted truncate max-w-xs text-xs" title={p.description}>
                        {p.reference || '—'} {p.description ? `(${p.description})` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucun paiement de scolarité n'a encore été enregistré.
          </div>
        )}
      </div>

      {/* ── MODAL ENREGISTRER PAIEMENT ── */}
      {modalPaiementOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalPaiementOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-lg text-on-surface border-b border-white/10 pb-2">
              Enregistrer un paiement de scolarité
            </h3>
            <form onSubmit={handleEnregistrerPaiementSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Sélectionner l'étudiant *</label>
                <select
                  value={pIdEtudiant}
                  onChange={(e) => setPIdEtudiant(e.target.value)}
                  required
                  className="select select-bordered bg-surface w-full text-sm border-white/10"
                >
                  <option value="">Sélectionner...</option>
                  {etudiantsList.map(st => (
                    <option key={st.id} value={st.id}>{st.nom} {st.prenom} ({st.matricule})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Montant (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 150000"
                  value={pMontant}
                  onChange={(e) => setPMontant(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Mode de règlement *</label>
                <select
                  value={pMode}
                  onChange={(e) => setPMode(e.target.value as ModePaiement)}
                  required
                  className="select select-bordered bg-surface w-full text-sm border-white/10"
                >
                  {MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Référence de transaction</label>
                <input
                  type="text"
                  placeholder="Ex: MobMoney-482910 ou chèque n°..."
                  value={pRef}
                  onChange={(e) => setPRef(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Observations / Commentaires</label>
                <textarea
                  placeholder="Échéance 1 ou note additionnelle..."
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="textarea textarea-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Valider l'Encaissement & Émettre un Reçu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIGURER FRAIS ── */}
      {modalFraisOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalFraisOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-lg text-on-surface border-b border-white/10 pb-2">
              Configurer les frais de scolarité par filière
            </h3>
            <form onSubmit={handleConfigurerFraisSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Filière concernée *</label>
                  <select
                    value={fFiliere}
                    onChange={(e) => setFFiliere(e.target.value)}
                    required
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    {FILIERES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Année académique *</label>
                  <input
                    type="text"
                    required
                    value={fAnnee}
                    onChange={(e) => setFAnnee(e.target.value)}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Montant Scolarité Annuel (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="Ex: 1200000"
                  value={fMontantTotal}
                  onChange={(e) => setFMontantTotal(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              {/* Échéancier */}
              <div>
                <label className="block text-xs font-bold text-accent mb-2">Échéancier de Paiement (3 Échéances conseillées)</label>
                <div className="flex flex-col gap-2">
                  {fEcheances.map((ech, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs text-on-surface-muted w-6">E{idx+1}</span>
                      <input
                        type="date"
                        value={ech.date}
                        onChange={(e) => {
                          const list = [...fEcheances];
                          list[idx].date = e.target.value;
                          setFEcheances(list);
                        }}
                        className="input input-bordered bg-surface text-xs border-white/10 flex-1 h-9"
                      />
                      <input
                        type="number"
                        placeholder="Montant"
                        value={ech.montant}
                        onChange={(e) => {
                          const list = [...fEcheances];
                          list[idx].montant = e.target.value;
                          setFEcheances(list);
                        }}
                        className="input input-bordered bg-surface text-xs border-white/10 w-32 h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Enregistrer la Structure Tarifaire
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default FinancesSection;
export { FinancesSection };
