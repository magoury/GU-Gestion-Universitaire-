// src/components/parent/sections/ParentOverview.jsx
// ──────────────────────────────────────────────────────────────
// Section Vue d'ensemble (Parental Command Center).
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { verifierStatutFinancier, listerPaiementsEtudiant } from '../../../services/paymentService.js';
import { formatMontant, formatDate } from '../../../lib/utils.js';

function ParentOverview({ etudiantLie, setActiveSection }) {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  // Données financières
  const [financeSummary, setFinanceSummary] = useState({ statut: 'a_jour', montantRestant: 0, prochainEcheance: null });
  const [payments, setPayments] = useState([]);
  const [loadingFinance, setLoadingFinance] = useState(true);

  useEffect(() => {
    if (universityId && etudiantLie?.id) {
      setLoadingFinance(true);
      Promise.all([
        verifierStatutFinancier(universityId, etudiantLie.id),
        listerPaiementsEtudiant(universityId, etudiantLie.id)
      ])
        .then(([summary, history]) => {
          setFinanceSummary(summary);
          setPayments(history);
        })
        .catch((err) => console.error('Erreur chargement finance overview:', err))
        .finally(() => setLoadingFinance(false));
    }
  }, [universityId, etudiantLie]);

  // Écouter toutes les notes et les notifications
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);
  const { data: allNotifs } = useFirebaseData('notifications', universityId);

  // Filtrer les notes de cet élève
  const studentGrades = useMemo(() => {
    if (!allGrades || !etudiantLie) return [];
    return Object.values(allGrades).filter((g) => g.studentId === etudiantLie.id);
  }, [allGrades, etudiantLie]);

  // Calculer la moyenne générale (MGA) de l'élève
  const academicCalculations = useMemo(() => {
    if (studentGrades.length === 0) {
      return { mga: '0.00', letter: 'N/A', list: [] };
    }

    const courses = {};
    studentGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courses[mat]) {
        courses[mat] = { devoir: [], examen: [], projet: [], participation: [] };
      }
      if (courses[mat][g.type]) {
        courses[mat][g.type].push(g.note);
      }
    });

    const coursesList = Object.keys(courses).map((key) => {
      const c = courses[key];
      const devAvg = c.devoir.length > 0 ? c.devoir.reduce((a, b) => a + b, 0) / c.devoir.length : null;
      const exAvg = c.examen.length > 0 ? c.examen.reduce((a, b) => a + b, 0) / c.examen.length : null;
      const projAvg = c.projet.length > 0 ? c.projet.reduce((a, b) => a + b, 0) / c.projet.length : null;
      const partAvg = c.participation.length > 0 ? c.participation.reduce((a, b) => a + b, 0) / c.participation.length : null;

      let notesCum = 0;
      let coeffsCum = 0;
      if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0; }
      if (exAvg !== null) { notesCum += exAvg * 2.0; coeffsCum += 2.0; }
      if (projAvg !== null) { notesCum += projAvg * 1.5; coeffsCum += 1.5; }
      if (partAvg !== null) { notesCum += partAvg * 0.5; coeffsCum += 0.5; }

      const moyenne = coeffsCum > 0 ? notesCum / coeffsCum : 0;
      return { id: key, moyenne };
    });

    const sum = coursesList.reduce((acc, c) => acc + c.moyenne, 0);
    const mgaRaw = coursesList.length > 0 ? sum / coursesList.length : 0;
    const mga = mgaRaw.toFixed(2);

    let letter = 'F';
    if (mgaRaw >= 16) letter = 'A';
    else if (mgaRaw >= 14) letter = 'B';
    else if (mgaRaw >= 12) letter = 'C';
    else if (mgaRaw >= 10) letter = 'D';

    return { mga, letter, list: coursesList };
  }, [studentGrades]);

  // Calcul du taux de présence à partir des notifications d'absence
  const myAbsenceNotifs = useMemo(() => {
    if (!allNotifs || !user || !etudiantLie) return [];
    return Object.values(allNotifs).filter(
      (n) =>
        (n.destinataireId === user.uid || n.destinataireId === etudiantLie.id) &&
        n.titre?.toLowerCase().includes('absence')
    );
  }, [allNotifs, user, etudiantLie]);

  const tauxPresence = useMemo(() => {
    return Math.max(100 - myAbsenceNotifs.length * 2, 0);
  }, [myAbsenceNotifs]);

  // Notifications du parent (non lues)
  const parentNotifications = useMemo(() => {
    if (!allNotifs || !user) return [];
    return Object.values(allNotifs).filter(
      (n) => n.destinataireId === user.uid || n.destinataireId === 'all' || n.destinataireId === 'parents'
    );
  }, [allNotifs, user]);

  const nonLuesCount = useMemo(() => {
    return parentNotifications.filter((n) => !n.lue).length;
  }, [parentNotifications]);

  const derniereNotif = useMemo(() => {
    if (parentNotifications.length === 0) return null;
    const sorted = [...parentNotifications].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0];
  }, [parentNotifications]);

  // 5 Dernières évaluations
  const evaluationsRecentes = useMemo(() => {
    return [...studentGrades].sort((a, b) => b.dateSaisie - a.dateSaisie).slice(0, 5);
  }, [studentGrades]);

  // Calcul du countdown pour l'échéance de paiement
  const nbJoursEcheance = useMemo(() => {
    if (!financeSummary.prochainEcheance) return null;
    const diff = new Date(financeSummary.prochainEcheance) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [financeSummary]);

  // Exporter la liste des paiements en JSON
  const handleTelechargerReleves = () => {
    const dataExport = {
      titre: `Relevé des paiements - ${etudiantLie.prenom} ${etudiantLie.nom}`,
      dateExport: new Date().toISOString(),
      studentId: etudiantLie.id,
      matricule: etudiantLie.matricule,
      historiquePaiements: payments.map((p) => ({
        numeroRecu: p.numeroRecu,
        montant: p.montant,
        mode: p.modePaiement,
        reference: p.reference || 'N/A',
        description: p.description,
        date: new Date(p.timestamp).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `releve_paiements_${etudiantLie.matricule}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body">
      
      {/* Message d'accueil */}
      <div className="bg-surface/60 backdrop-blur-md border border-white/10 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">
            Bienvenue, {userProfile?.prenom} {userProfile?.nom} 👋
          </h2>
          <p className="text-sm text-on-surface-muted mt-1">
            Voici le dernier résumé du suivi académique et financier de <span className="font-semibold text-accent">{etudiantLie.prenom} {etudiantLie.nom}</span>.
          </p>
        </div>
        <div className="hidden sm:block text-xs bg-accent/15 border border-accent/20 px-3 py-1 rounded text-accent font-medium uppercase tracking-wider">
          Espace Parental
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1 : MOYENNE ACTUELLE */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Moyenne Actuelle</span>
            <span className="text-xl">🎓</span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-accent font-display">
              {academicCalculations.letter} <span className="text-lg text-on-surface font-sans">({academicCalculations.mga}/20)</span>
            </div>
            <div className="text-[10px] text-success font-semibold flex items-center gap-1 mt-1">
              <span>▲ +0.3 vs trimestre prèc.</span>
            </div>
          </div>
          <div className="text-[10px] text-on-surface-muted border-t border-white/5 pt-2">
            Trimestre 2, {currentYear}
          </div>
        </div>

        {/* KPI 2 : TAUX DE PRÉSENCE */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Taux de Présence</span>
            <span className="text-xl">📅</span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-on-surface font-display">{tauxPresence}%</div>
            <div className="mt-1">
              {tauxPresence >= 90 ? (
                <span className="badge badge-success text-[10px] h-5 rounded px-2 text-bg font-bold border-none uppercase">Excellent</span>
              ) : tauxPresence >= 75 ? (
                <span className="badge badge-warning text-[10px] h-5 rounded px-2 text-bg font-bold border-none uppercase">Régulier</span>
              ) : (
                <span className="badge badge-error text-[10px] h-5 rounded px-2 text-white font-bold border-none uppercase">À surveiller</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-on-surface-muted border-t border-white/5 pt-2">
            {myAbsenceNotifs.length} absence(s) signalée(s)
          </div>
        </div>

        {/* KPI 3 : FRAIS EN ATTENTE */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Frais en Attente</span>
            <span className="text-xl">💳</span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-on-surface font-display">
              {formatMontant(financeSummary.montantRestant)}
            </div>
            <div className="mt-1">
              {financeSummary.montantRestant > 0 ? (
                <span className="badge badge-warning text-[9px] h-5 rounded px-2 text-bg font-bold border-none uppercase">
                  {nbJoursEcheance !== null && nbJoursEcheance >= 0
                    ? `Dû dans ${nbJoursEcheance} jours`
                    : nbJoursEcheance !== null
                    ? `Retard de ${Math.abs(nbJoursEcheance)}j`
                    : 'Échéance proche'}
                </span>
              ) : (
                <span className="badge badge-success text-[10px] h-5 rounded px-2 text-bg font-bold border-none uppercase">Réglé</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-on-surface-muted border-t border-white/5 pt-2 flex items-center justify-between">
            <span>Scolarité annuelle</span>
            {financeSummary.montantRestant > 0 && (
              <button
                onClick={() => setActiveSection('payments')}
                className="text-[10px] text-accent font-semibold hover:underline"
              >
                Payer maintenant →
              </button>
            )}
          </div>
        </div>

        {/* KPI 4 : AVIS DE L'ÉCOLE */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Avis de l'école</span>
            <span className="text-xl">🔔</span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-on-surface font-display">
              {nonLuesCount} non lu(s)
            </div>
            <p className="text-[10px] text-on-surface-muted truncate mt-1">
              {derniereNotif ? derniereNotif.titre : 'Aucune annonce récente'}
            </p>
          </div>
          <div className="text-[10px] text-on-surface-muted border-t border-white/5 pt-2 flex items-center justify-between">
            <span>Total : {parentNotifications.length}</span>
            <button
              onClick={() => setActiveSection('contact')}
              className="text-[10px] text-accent font-semibold hover:underline"
            >
              Voir tout →
            </button>
          </div>
        </div>

      </div>

      {/* Bloc "Performances récentes" (Recent Performance & Historique des paiements) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        
        {/* Card Gauche : Recent Performance */}
        <div className="bg-surface/80 backdrop-blur-md border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold font-display text-lg">Performance Récente</h3>
              <span className="text-[10px] text-on-surface-muted uppercase">Dernières notes</span>
            </div>

            {loadingGrades ? (
              <div className="py-12 flex justify-center items-center">
                <span className="loading loading-spinner text-accent loading-sm"></span>
              </div>
            ) : evaluationsRecentes.length === 0 ? (
              <div className="py-12 text-center text-sm text-on-surface-muted">
                Aucune note saisie pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-on-surface-muted">
                      <th className="py-2">Matière</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Note</th>
                      <th className="py-2 pl-4">Commentaire Enseignant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationsRecentes.map((g) => {
                      const noteStyle = g.note >= 12
                        ? 'bg-success/10 text-success border-success/20'
                        : g.note >= 10
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-error/10 text-error border-error/20';

                      const typeLabel = g.type === 'devoir'
                        ? 'Devoir'
                        : g.type === 'examen'
                        ? 'Examen'
                        : g.type === 'projet'
                        ? 'Projet'
                        : 'Participation';

                      return (
                        <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2.5 font-semibold text-xs">{g.courseId || g.matiereId}</td>
                          <td className="py-2.5 text-xs text-on-surface-muted">{typeLabel}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${noteStyle}`}>
                              {g.note.toFixed(1)}/20
                            </span>
                          </td>
                          <td className="py-2.5 pl-4 text-xs text-on-surface-muted truncate max-w-[150px]" title={g.commentaire}>
                            {g.commentaire || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-4 flex justify-end">
            <button
              onClick={() => setActiveSection('results')}
              className="text-xs text-accent font-semibold hover:underline"
            >
              Voir le bulletin complet →
            </button>
          </div>
        </div>

        {/* Card Droite : Historique des paiements */}
        <div className="bg-surface/80 backdrop-blur-md border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold font-display text-lg">Historique des Paiements</h3>
              <button
                onClick={handleTelechargerReleves}
                disabled={payments.length === 0}
                className="btn btn-xs bg-surface-high hover:bg-surface border border-white/10 hover:border-white/20 text-on-surface font-semibold text-[10px] rounded cursor-pointer disabled:opacity-50"
              >
                📥 Télécharger les relevés
              </button>
            </div>

            {loadingFinance ? (
              <div className="py-12 flex justify-center items-center">
                <span className="loading loading-spinner text-accent loading-sm"></span>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-sm text-on-surface-muted">
                Aucune transaction financière enregistrée.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-surface-high/40 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div>
                      <div className="text-xs font-semibold text-on-surface">
                        {p.description || `Reçu scolarité N°${p.numeroRecu}`}
                      </div>
                      <div className="text-[10px] text-on-surface-muted mt-0.5">
                        {formatDate(p.timestamp)} | Mode : {p.modePaiement}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-xs font-bold text-accent">
                        {formatMontant(p.montant)}
                      </div>
                      <span className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center text-[10px] font-bold" title="Payé">
                        ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 mt-4 flex justify-end">
            <button
              onClick={() => setActiveSection('payments')}
              className="text-xs text-accent font-semibold hover:underline"
            >
              Voir tous les paiements →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default ParentOverview;
