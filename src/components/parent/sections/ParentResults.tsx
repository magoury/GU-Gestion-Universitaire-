// src/components/parent/sections/ParentResults.tsx
// ──────────────────────────────────────────────────────────────
// Section Résultats scolaires (Notes & Bulletins) — Version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { ecrireAuditLog } from '../../../services/auditService';
import type { Student, Grade, Teacher } from '@/types';

interface ParentResultsProps {
  etudiantLie: Student;
}

interface CourseAverage {
  id: string;
  devoir: number[];
  examen: number[];
  projet: number[];
  participation: number[];
  ects: number;
  enseignantId: string;
  enseignantNom: string;
  commentaires: string[];
  devAvg: number | null;
  exAvg: number | null;
  projAvg: number | null;
  partAvg: number | null;
  moyenne: number;
  valide: boolean;
}

function ParentResults({ etudiantLie }: ParentResultsProps): React.JSX.Element {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  const [anneeSelectionnee, setAnneeSelectionnee] = useState<string>('2025-2026');

  // Modal Demande de Rendez-vous
  const [modalOuvert, setModalOuvert] = useState<boolean>(false);
  const [rdvMatiere, setRdvMatiere] = useState<string>('');
  const [rdvMessage, setRdvMessage] = useState<string>('');
  const [envoiEnCours, setEnvoiEnCours] = useState<boolean>(false);
  const [succesMsg, setSuccesMsg] = useState<string>('');
  const [erreurMsg, setErreurMsg] = useState<string>('');

  // Charger les notes de cet élève (sécurisé) et les enseignants de l'université
  const { data: studentGradesData, loading: loadingGrades } = useFirebaseData(`grades_by_student/${etudiantLie.id}`, universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);

  // Mapping des enseignants (id -> Nom Complet)
  const teachersMap = useMemo<Record<string, string>>(() => {
    if (!allTeachers) return {};
    const map: Record<string, string> = {};
    const teachersList = Object.values(allTeachers) as Teacher[];
    teachersList.forEach((t) => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [allTeachers]);

  const studentGrades = useMemo<Grade[]>(() => {
    if (!studentGradesData) return [];
    return Object.values(studentGradesData) as Grade[];
  }, [studentGradesData]);

  // Notes de l'élève pour l'année sélectionnée
  const myGrades = useMemo<Grade[]>(() => {
    return studentGrades.filter(
      (g) => g.anneeAcademique === anneeSelectionnee
    );
  }, [studentGrades, anneeSelectionnee]);

  // Calcul et regroupement par matière
  const gradesByCourse = useMemo<CourseAverage[]>(() => {
    const courses: Record<string, Omit<CourseAverage, 'devAvg' | 'exAvg' | 'projAvg' | 'partAvg' | 'moyenne' | 'valide'>> = {};

    myGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courses[mat]) {
        courses[mat] = {
          id: mat,
          devoir: [],
          examen: [],
          projet: [],
          participation: [],
          ects: 6, // ECTS par défaut
          enseignantId: g.enseignantId,
          enseignantNom: teachersMap[g.enseignantId] || 'Enseignant',
          commentaires: []
        };
      }
      if (g.type === 'devoir' || g.type === 'examen' || g.type === 'projet' || g.type === 'participation') {
        courses[mat][g.type].push(g.note);
      }
      if (g.commentaire) {
        courses[mat].commentaires.push(g.commentaire);
      }
    });

    return Object.values(courses).map((course) => {
      const devAvg = course.devoir.length > 0 ? course.devoir.reduce((a, b) => a + b, 0) / course.devoir.length : null;
      const exAvg = course.examen.length > 0 ? course.examen.reduce((a, b) => a + b, 0) / course.examen.length : null;
      const projAvg = course.projet.length > 0 ? course.projet.reduce((a, b) => a + b, 0) / course.projet.length : null;
      const partAvg = course.participation.length > 0 ? course.participation.reduce((a, b) => a + b, 0) / course.participation.length : null;

      let notesCum = 0;
      let coeffsCum = 0;

      if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0; }
      if (exAvg !== null) { notesCum += exAvg * 2.0; coeffsCum += 2.0; }
      if (projAvg !== null) { notesCum += projAvg * 1.5; coeffsCum += 1.5; }
      if (partAvg !== null) { notesCum += partAvg * 0.5; coeffsCum += 0.5; }

      const moyenne = coeffsCum > 0 ? notesCum / coeffsCum : 0;
      const valide = moyenne >= 10;

      return {
        ...course,
        devAvg,
        exAvg,
        projAvg,
        partAvg,
        moyenne,
        valide
      };
    });
  }, [myGrades, teachersMap]);

  // Moyenne générale
  const summaryCalculations = useMemo(() => {
    if (gradesByCourse.length === 0) {
      return { mga: '0.00', letter: 'F', list: [] };
    }
    const sum = gradesByCourse.reduce((acc, c) => acc + c.moyenne, 0);
    const mgaRaw = sum / gradesByCourse.length;
    const mga = mgaRaw.toFixed(2);

    let letter = 'F';
    if (mgaRaw >= 16) letter = 'A';
    else if (mgaRaw >= 14) letter = 'B';
    else if (mgaRaw >= 12) letter = 'C';
    else if (mgaRaw >= 10) letter = 'D';

    return { mga, letter };
  }, [gradesByCourse]);

  // Déclencher le modal de rendez-vous
  const ouvrirDemandeRdv = (matiere: string) => {
    setRdvMatiere(matiere);
    setRdvMessage(`Bonjour, en tant que parent de ${etudiantLie.prenom} ${etudiantLie.nom}, je souhaiterais solliciter un rendez-vous ou un échange concernant ses résultats en ${matiere}.`);
    setSuccesMsg('');
    setErreurMsg('');
    setModalOuvert(true);
  };

  // Soumettre la demande de rendez-vous
  const handleSoumettreRdv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdvMessage.trim() || !user?.uid) {
      setErreurMsg('Veuillez saisir un message.');
      return;
    }

    setEnvoiEnCours(true);
    setSuccesMsg('');
    setErreurMsg('');

    try {
      const parentName = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`;
      
      // Trouver l'enseignant de la matière
      const courseObj = gradesByCourse.find(c => c.id === rdvMatiere);
      const targetTeacherId = courseObj?.enseignantId || 'all';

      const notifRef = push(ref(database, `universities/${universityId}/notifications`));
      await set(notifRef, {
        id: notifRef.key,
        destinataireId: targetTeacherId,
        titre: `Demande de rendez-vous parent — ${rdvMatiere}`,
        message: `Message du parent de ${etudiantLie.prenom} ${etudiantLie.nom} : "${rdvMessage}"`,
        type: 'rdv_parent',
        senderId: user.uid,
        studentId: etudiantLie.id,
        lue: false,
        timestamp: Date.now()
      });

      // Journal d'audit
      await ecrireAuditLog(universityId!, {
        acteurId: user.uid!,
        acteurNom: parentName,
        acteurRole: 'parent',
        action: 'RDV_DEMANDE',
        cible: targetTeacherId,
        detail: `Demande de rendez-vous envoyée à l'enseignant (${targetTeacherId}) pour le cours ${rdvMatiere}.`
      });

      setSuccesMsg("Votre demande a bien été transmise à l'enseignant.");
      setTimeout(() => setModalOuvert(false), 2000);
    } catch (err) {
      console.error('Erreur lors de l\'envoi de la demande:', err);
      setErreurMsg('Impossible de transmettre votre demande. Réessayez plus tard.');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body animate-fade-in">
      
      {/* Sélecteur d'année */}
      <div className="bg-surface/60 backdrop-blur-md border border-white/10 p-4 rounded-xl flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-on-surface-muted uppercase font-bold">Année Académique</span>
          <select
            value={anneeSelectionnee}
            onChange={(e) => setAnneeSelectionnee(e.target.value)}
            className="bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-on-surface-muted uppercase block font-bold">Moyenne Générale</span>
          <strong className="text-xl text-accent font-display">{summaryCalculations.mga}/20</strong>
        </div>
      </div>

      {/* Liste des matières */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingGrades ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
          </div>
        ) : gradesByCourse.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-on-surface-muted text-xs italic bg-surface/30 rounded-xl border border-white/5">
            Aucune note publiée pour cette année académique.
          </div>
        ) : (
          gradesByCourse.map((c) => (
            <div key={c.id} className="bg-surface/40 backdrop-blur border border-white/5 p-5 rounded-xl flex flex-col justify-between shadow-lg hover:border-accent/20 transition-all gap-4">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-accent font-display uppercase">{c.id}</h3>
                    <p className="text-[10px] text-on-surface-muted mt-0.5">Enseignant : {c.enseignantNom}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    c.valide ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {c.moyenne.toFixed(2)}/20
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4 text-[10px] bg-surface/20 p-2.5 rounded border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-on-surface-muted uppercase">Devoir</span>
                    <span className="font-semibold text-on-surface mt-0.5">{c.devAvg !== null ? `${c.devAvg.toFixed(1)}` : '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-on-surface-muted uppercase">Examen</span>
                    <span className="font-semibold text-on-surface mt-0.5">{c.exAvg !== null ? `${c.exAvg.toFixed(1)}` : '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-on-surface-muted uppercase">Projet</span>
                    <span className="font-semibold text-on-surface mt-0.5">{c.projAvg !== null ? `${c.projAvg.toFixed(1)}` : '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-on-surface-muted uppercase">Part.</span>
                    <span className="font-semibold text-on-surface mt-0.5">{c.partAvg !== null ? `${c.partAvg.toFixed(1)}` : '-'}</span>
                  </div>
                </div>

                {c.commentaires.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-[9px] text-on-surface-muted uppercase font-bold">Remarques de l'enseignant :</span>
                    <ul className="text-[10px] text-on-surface-muted list-disc pl-4 flex flex-col gap-0.5">
                      {c.commentaires.map((rem, i) => (
                        <li key={i} className="italic">"{rem}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-white/5 pt-3">
                <button
                  onClick={() => ouvrirDemandeRdv(c.id)}
                  className="btn btn-xs h-7 px-3 bg-surface hover:bg-accent hover:text-bg text-on-surface border border-white/10 hover:border-transparent text-[10px] font-semibold uppercase tracking-wider rounded transition-all cursor-pointer"
                >
                  💬 Demander un rendez-vous
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Demande de Rendez-vous */}
      {modalOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-surface border border-white/10 p-6 rounded-xl shadow-2xl flex flex-col gap-4 relative animate-scale-up text-xs">
            <h3 className="text-sm font-bold text-accent font-display uppercase">
              Demande d'échange : {rdvMatiere}
            </h3>
            <p className="text-on-surface-muted leading-relaxed">
              Ce message sera directement notifié à l'enseignant responsable de cette matière.
            </p>

            <form onSubmit={handleSoumettreRdv} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-muted">Message à transmettre</label>
                <textarea
                  value={rdvMessage}
                  onChange={(e) => setRdvMessage(e.target.value)}
                  rows={4}
                  className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent"
                  placeholder="Décrivez l'objet de votre échange..."
                />
              </div>

              {erreurMsg && <div className="text-red-400 font-semibold">{erreurMsg}</div>}
              {succesMsg && <div className="text-green-400 font-semibold">{succesMsg}</div>}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOuvert(false)}
                  disabled={envoiEnCours}
                  className="btn btn-xs h-8 px-4 bg-surface hover:bg-surface-muted text-on-surface rounded border border-white/10 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoiEnCours}
                  className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase rounded cursor-pointer disabled:opacity-50"
                >
                  {envoiEnCours ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentResults;
export { ParentResults };
