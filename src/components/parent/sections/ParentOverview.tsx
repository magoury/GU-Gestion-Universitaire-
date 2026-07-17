// src/components/parent/sections/ParentOverview.tsx
// ──────────────────────────────────────────────────────────────
// Section Vue d'ensemble — Version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { verifierStatutFinancier, listerPaiementsEtudiant } from '../../../services/paymentService';
import { formatMontant, formatDate } from '../../../lib/utils';
import type { Student, Grade, Notification, Payment } from '@/types';

interface ParentOverviewProps {
  etudiantLie: Student;
  setActiveSection: (section: string) => void;
}

function ParentOverview({ etudiantLie, setActiveSection }: ParentOverviewProps): React.JSX.Element {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  // Données financières
  const [financeSummary, setFinanceSummary] = useState<{ statut: string; montantRestant: number; prochainEcheance: string | null }>({
    statut: 'a_jour',
    montantRestant: 0,
    prochainEcheance: null
  });
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (universityId && etudiantLie?.id) {
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
        .catch((err) => console.error('Erreur chargement finance overview:', err));
    }
  }, [universityId, etudiantLie]);

  // Écouter les notes de cet élève (sécurisé) et les notifications
  const { data: studentGradesData, loading: loadingGrades } = useFirebaseData(`grades_by_student/${etudiantLie.id}`, universityId);
  const { data: allNotifs } = useFirebaseData('notifications', universityId);

  // Convertir en tableau
  const studentGrades = useMemo<Grade[]>(() => {
    if (!studentGradesData) return [];
    return Object.values(studentGradesData) as Grade[];
  }, [studentGradesData]);

  // Calculer la moyenne générale (MGA) de l'élève
  const academicCalculations = useMemo(() => {
    if (studentGrades.length === 0) {
      return { mga: '0.00', letter: 'N/A', list: [] };
    }

    const courses: Record<string, { devoir: number[]; examen: number[]; projet: number[]; participation: number[] }> = {};
    studentGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courses[mat]) {
        courses[mat] = { devoir: [], examen: [], projet: [], participation: [] };
      }
      if (g.type === 'devoir' || g.type === 'examen' || g.type === 'projet' || g.type === 'participation') {
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
  const myAbsenceNotifs = useMemo<Notification[]>(() => {
    if (!allNotifs || !user || !etudiantLie) return [];
    const list = Object.values(allNotifs) as Notification[];
    return list.filter(
      (n) =>
        (n.destinataireId === user.uid || n.destinataireId === etudiantLie.id) &&
        n.titre?.toLowerCase().includes('absence')
    );
  }, [allNotifs, user, etudiantLie]);

  const tauxPresence = useMemo(() => {
    return Math.max(100 - myAbsenceNotifs.length * 2, 0);
  }, [myAbsenceNotifs]);

  // Notifications du parent (non lues)
  const parentNotifications = useMemo<Notification[]>(() => {
    if (!allNotifs || !user) return [];
    const list = Object.values(allNotifs) as Notification[];
    return list.filter(
      (n) => n.destinataireId === user.uid || n.destinataireId === 'all' || n.destinataireId === 'parents'
    );
  }, [allNotifs, user]);

  const nonLuesCount = useMemo(() => {
    return parentNotifications.filter((n) => !n.lue).length;
  }, [parentNotifications]);

  const derniereNotif = useMemo<Notification | null>(() => {
    if (parentNotifications.length === 0) return null;
    const sorted = [...parentNotifications].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0];
  }, [parentNotifications]);

  // 5 Dernières évaluations
  const evaluationsRecentes = useMemo<Grade[]>(() => {
    return [...studentGrades].sort((a, b) => b.dateSaisie - a.dateSaisie).slice(0, 5);
  }, [studentGrades]);

  // Calcul du countdown pour l'échéance de paiement
  const nbJoursEcheance = useMemo<number | null>(() => {
    if (!financeSummary.prochainEcheance) return null;
    const diff = new Date(financeSummary.prochainEcheance).getTime() - new Date().getTime();
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

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body animate-fade-in">
      
      {/* Message d'accueil */}
      <div className="bg-surface/60 backdrop-blur-md border border-white/10 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">
            Bienvenue, {userProfile?.prenom} {userProfile?.nom} 👋
          </h2>
          <p className="text-xs text-on-surface-muted mt-1">
            Voici le dernier résumé du suivi académique et financier de <span className="font-semibold text-accent">{etudiantLie.prenom} {etudiantLie.nom}</span>.
          </p>
        </div>
        <div className="hidden sm:block text-[10px] bg-accent/15 border border-accent/20 px-3 py-1 rounded text-accent font-medium uppercase tracking-wider">
          Espace Parental
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1 : MOYENNE ACTUELLE */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Moyenne Actuelle</span>
            <span className="text-sm">🎓</span>
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-accent font-display">
              {academicCalculations.letter} <span className="text-xs text-on-surface font-sans">({academicCalculations.mga}/20)</span>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('results')}
            className="text-[10px] text-accent hover:underline text-left font-semibold"
          >
            Consulter les notes →
          </button>
        </div>

        {/* KPI 2 : ASSIDUITÉ */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Taux de Présence</span>
            <span className="text-sm">📅</span>
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-on-surface font-display">
              {tauxPresence}%
            </div>
          </div>
          <button
            onClick={() => setActiveSection('absences')}
            className="text-[10px] text-accent hover:underline text-left font-semibold"
          >
            Détails des absences ({myAbsenceNotifs.length}) →
          </button>
        </div>

        {/* KPI 3 : FINANCES */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Solde Scolarité</span>
            <span className="text-sm">💰</span>
          </div>
          <div className="my-3">
            <div className={`text-xl font-bold font-display ${financeSummary.statut === 'a_jour' ? 'text-green-400' : 'text-red-400'}`}>
              {formatMontant(financeSummary.montantRestant)}
            </div>
          </div>
          <button
            onClick={() => setActiveSection('payments')}
            className="text-[10px] text-accent hover:underline text-left font-semibold"
          >
            {financeSummary.statut === 'a_jour' ? 'Historique des reçus →' : 'Payer maintenant →'}
          </button>
        </div>

        {/* KPI 4 : NOTIFICATIONS */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase">Messages École</span>
            <span className="text-sm">🔔</span>
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-on-surface font-display">
              {nonLuesCount} <span className="text-[10px] text-on-surface-muted font-sans">non lu(s)</span>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('contact')}
            className="text-[10px] text-accent hover:underline text-left font-semibold"
          >
            Accéder à la messagerie →
          </button>
        </div>

      </div>

      {/* Grid central (Notes récentes & Événements financiers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne Gauche / Centre (Notes récentes) */}
        <div className="lg:col-span-2 bg-surface/40 backdrop-blur border border-white/5 p-6 rounded-xl flex flex-col gap-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">Dernières Évaluations</h3>
          
          {loadingGrades ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner text-accent loading-sm animate-spin"></span>
            </div>
          ) : evaluationsRecentes.length === 0 ? (
            <div className="text-center py-12 text-on-surface-muted text-xs italic">
              Aucune note n'a été publiée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full text-xs text-on-surface">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-muted text-[10px] uppercase">
                    <th className="py-2">Matière</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Date Saisie</th>
                    <th className="py-2 text-right">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluationsRecentes.map((g) => (
                    <tr key={g.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                      <td className="py-2 font-semibold text-accent">{g.courseId || g.matiereId}</td>
                      <td className="py-2 capitalize">{g.type} (x{g.coefficient})</td>
                      <td className="py-2 text-on-surface-muted">{formatDate(g.dateSaisie)}</td>
                      <td className="py-2 text-right font-bold">{g.note.toFixed(2)}/20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne Droite (Situation financière & Prochaine échéance) */}
        <div className="bg-surface/40 backdrop-blur border border-white/5 p-6 rounded-xl flex flex-col gap-4 justify-between shadow-xl">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display mb-4">Situation Financière</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-on-surface-muted">Statut Global</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  financeSummary.statut === 'a_jour' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400 animate-pulse'
                }`}>
                  {financeSummary.statut === 'a_jour' ? 'À JOUR' : 'RETARD'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-on-surface-muted">Reste à solder</span>
                <span className="font-semibold">{formatMontant(financeSummary.montantRestant)}</span>
              </div>
              
              {financeSummary.prochainEcheance && (
                <div className="flex flex-col gap-1.5 mt-2 bg-surface/50 p-3 rounded border border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-muted">Échéance</span>
                    <span className="font-medium text-on-surface">{formatDate(new Date(financeSummary.prochainEcheance).getTime())}</span>
                  </div>
                  {nbJoursEcheance !== null && (
                    <div className={`text-[10px] font-semibold text-right ${
                      nbJoursEcheance < 0 ? 'text-red-400 animate-pulse' : nbJoursEcheance <= 7 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {nbJoursEcheance < 0
                        ? `En retard de ${Math.abs(nbJoursEcheance)} jour(s)`
                        : nbJoursEcheance === 0
                        ? "Aujourd'hui"
                        : `Sous ${nbJoursEcheance} jour(s)`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            {payments.length > 0 && (
              <button
                onClick={handleTelechargerReleves}
                className="w-full btn btn-xs py-2 bg-surface hover:bg-surface/80 text-on-surface font-semibold rounded border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                📥 Télécharger l'historique
              </button>
            )}
            {financeSummary.statut !== 'a_jour' && (
              <button
                onClick={() => setActiveSection('payments')}
                className="w-full btn btn-xs py-2 bg-accent hover:bg-accent/80 text-bg font-bold uppercase rounded border-none flex items-center justify-center gap-1.5 cursor-pointer animate-bounce"
              >
                💳 Effectuer un Paiement
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Dernier Message / Annonce Importante */}
      {derniereNotif && (
        <div className="bg-surface/30 backdrop-blur border border-white/5 p-4 rounded-xl flex items-start gap-3.5 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            📢
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <h4 className="text-xs font-bold text-accent truncate">{derniereNotif.titre}</h4>
              <span className="text-[9px] text-on-surface-muted shrink-0">{formatDate(derniereNotif.timestamp)}</span>
            </div>
            <p className="text-xs text-on-surface-muted mt-1 line-clamp-2">
              {derniereNotif.message}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentOverview;
export { ParentOverview };
