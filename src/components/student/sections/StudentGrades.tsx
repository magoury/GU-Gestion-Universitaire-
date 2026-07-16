// src/components/student/sections/StudentGrades.tsx
// ──────────────────────────────────────────────────────────────
// Section de consultation des notes et bulletins de l'étudiant — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { genererBulletin } from '../../../services/gradeService';
import { FileIcon } from '../../icons/Icons.jsx';
import type { Student, Grade } from '@/types';

interface CourseAverage {
  id: string;
  devoir: number[];
  examen: number[];
  projet: number[];
  participation: number[];
  ects: number;
  devAvg: number | null;
  exAvg: number | null;
  projAvg: number | null;
  partAvg: number | null;
  moyenne: number;
  valide: boolean;
}

function StudentGrades(): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [anneeSelectionnee, setAnneeSelectionnee] = useState('2025-2026');

  // Écouter toutes les notes et tous les étudiants de l'établissement
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);
  const { data: allStudents, loading: loadingStudents } = useFirebaseData('students', universityId);

  // Notes filtrées de cet étudiant pour l'année sélectionnée
  const myGrades = useMemo<Grade[]>(() => {
    if (!allGrades || !user) return [];
    const list = Object.values(allGrades) as Grade[];
    return list.filter(
      (g) => g.studentId === user.uid && g.anneeAcademique === anneeSelectionnee
    );
  }, [allGrades, user, anneeSelectionnee]);

  // Regrouper les notes par matière et par type
  const gradesByCourse = useMemo<CourseAverage[]>(() => {
    const courses: Record<string, { id: string; devoir: number[]; examen: number[]; projet: number[]; participation: number[]; ects: number }> = {};

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
        };
      }
      if (g.type === 'devoir' || g.type === 'examen' || g.type === 'projet' || g.type === 'participation') {
        courses[mat][g.type].push(g.note);
      }
    });

    // Calculer les moyennes par cours
    return Object.values(courses).map((course) => {
      const devAvg = course.devoir.length > 0 ? course.devoir.reduce((a, b) => a + b, 0) / course.devoir.length : null;
      const exAvg = course.examen.length > 0 ? course.examen.reduce((a, b) => a + b, 0) / course.examen.length : null;
      const projAvg = course.projet.length > 0 ? course.projet.reduce((a, b) => a + b, 0) / course.projet.length : null;
      const partAvg = course.participation.length > 0 ? course.participation.reduce((a, b) => a + b, 0) / course.participation.length : null;

      // Calcul de la moyenne pondérée de la matière
      // Devoir (coeff 1), Examen (coeff 2), Projet (coeff 1.5), Participation (coeff 0.5)
      let notesCumulees = 0;
      let coeffsCumules = 0;

      if (devAvg !== null) { notesCumulees += devAvg * 1.0; coeffsCumules += 1.0; }
      if (exAvg !== null) { notesCumulees += exAvg * 2.0; coeffsCumules += 2.0; }
      if (projAvg !== null) { notesCumulees += projAvg * 1.5; coeffsCumules += 1.5; }
      if (partAvg !== null) { notesCumulees += partAvg * 0.5; coeffsCumules += 0.5; }

      const moyenne = coeffsCumules > 0 ? notesCumulees / coeffsCumules : 0;
      const valide = moyenne >= 10;

      return {
        ...course,
        devAvg,
        exAvg,
        projAvg,
        partAvg,
        moyenne,
        valide,
      };
    });
  }, [myGrades]);

  // Moyenne générale de l'étudiant
  const academicSummary = useMemo(() => {
    if (gradesByCourse.length === 0) {
      return { mga: '0.00', mention: 'N/A', admis: false, totalEcts: 0 };
    }

    const sumMoyennes = gradesByCourse.reduce((acc, c) => acc + c.moyenne, 0);
    const mgaRaw = sumMoyennes / gradesByCourse.length;
    const mga = mgaRaw.toFixed(2);
    const totalEcts = gradesByCourse.filter((c) => c.valide).reduce((acc, c) => acc + c.ects, 0);

    let mention = 'Ajourné';
    let admis = false;
    if (mgaRaw >= 10) {
      admis = true;
      if (mgaRaw >= 16) mention = 'Très Bien';
      else if (mgaRaw >= 14) mention = 'Bien';
      else if (mgaRaw >= 12) mention = 'Assez Bien';
      else mention = 'Passable';
    }

    return {
      mga,
      mention,
      admis,
      totalEcts,
    };
  }, [gradesByCourse]);

  // Calcul du classement de l'étudiant
  const classementText = useMemo(() => {
    if (!allStudents || !allGrades || gradesByCourse.length === 0) return 'Non classé';

    const studentsList = Object.values(allStudents) as Student[];
    const gradesList = Object.values(allGrades) as Grade[];
    const scores: { studentId: string; mga: number }[] = [];

    studentsList.forEach((s) => {
      const studentGrades = gradesList.filter(
        (g) => g.studentId === s.id && g.anneeAcademique === anneeSelectionnee
      );
      if (studentGrades.length === 0) return;

      // Calculer sa moyenne générale
      const coursScores: Record<string, number[]> = {};
      studentGrades.forEach((g) => {
        const mat = g.courseId || g.matiereId;
        if (!coursScores[mat]) coursScores[mat] = [];
        coursScores[mat].push(g.note);
      });

      const averages = Object.values(coursScores).map((notes) => notes.reduce((a, b) => a + b, 0) / notes.length);
      const studentMga = averages.reduce((a, b) => a + b, 0) / averages.length;

      scores.push({ studentId: s.id, mga: studentMga });
    });

    // Trier les étudiants par MGA décroissante
    scores.sort((a, b) => b.mga - a.mga);

    const index = scores.findIndex((x) => x.studentId === user?.uid);
    if (index === -1) return 'Non classé';
    return `${index + 1}er / ${scores.length}`;
  }, [allStudents, allGrades, user, anneeSelectionnee, gradesByCourse]);

  // Exporter le bulletin au format JSON téléchargeable
  const handleTelechargerBulletin = async () => {
    if (!universityId || !user?.uid) return;
    try {
      const bulletin = await genererBulletin(universityId, user.uid, anneeSelectionnee);

      // Création du Blob
      const blob = new Blob([JSON.stringify(bulletin, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `bulletin_${anneeSelectionnee}_${user.uid}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement bulletin:', err);
    }
  };

  if (loadingGrades || loadingStudents) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
        <span className="text-on-surface-muted text-xs">Chargement de vos notes...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      {/* ── EN-TÊTE ET FILTRES ── */}
      <div className="glass-card p-4 border border-white/5 rounded-lg flex justify-between items-center">
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

        <button
          onClick={handleTelechargerBulletin}
          disabled={gradesByCourse.length === 0}
          className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <FileIcon className="w-3.5 h-3.5" />
          <span>Télécharger bulletin (JSON)</span>
        </button>
      </div>

      {/* ── BADGE DE DÉCISION DU JURY ── */}
      {gradesByCourse.length > 0 && (
        <div className={`p-4 rounded-lg border text-center flex items-center justify-center gap-4 ${
          academicSummary.admis
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="text-xl font-bold font-display uppercase tracking-widest">
            Jury Académique : {academicSummary.admis ? 'ADMIS' : 'AJOURNÉ'}
          </div>
          <span className="text-xs text-on-surface-muted">
            avec une moyenne de <strong>{academicSummary.mga}/20</strong> (Mention : {academicSummary.mention})
          </span>
        </div>
      )}

      {/* ── TABLEAU DÉTAILLÉ PAR MATIÈRE ── */}
      <div className="glass-card border border-white/5 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full text-xs text-on-surface">
            <thead>
              <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px] uppercase">
                <th className="py-3 pl-4">Matière</th>
                <th className="py-3">Coeff ECTS</th>
                <th className="py-3">Devoir (x1.0)</th>
                <th className="py-3">Examen (x2.0)</th>
                <th className="py-3">Projet (x1.5)</th>
                <th className="py-3">Part. (x0.5)</th>
                <th className="py-3">Moyenne</th>
                <th className="py-3 pr-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {gradesByCourse.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-on-surface-muted italic">
                    Aucune note n'a été saisie pour l'année académique {anneeSelectionnee}.
                  </td>
                </tr>
              ) : (
                gradesByCourse.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                    <td className="py-2.5 pl-4 font-semibold text-accent">{c.id}</td>
                    <td className="py-2.5">{c.ects} ECTS</td>
                    <td className="py-2.5">{c.devAvg !== null ? `${c.devAvg.toFixed(2)}/20` : '-'}</td>
                    <td className="py-2.5">{c.exAvg !== null ? `${c.exAvg.toFixed(2)}/20` : '-'}</td>
                    <td className="py-2.5">{c.projAvg !== null ? `${c.projAvg.toFixed(2)}/20` : '-'}</td>
                    <td className="py-2.5">{c.partAvg !== null ? `${c.partAvg.toFixed(2)}/20` : '-'}</td>
                    <td className="py-2.5">
                      <span className={`font-bold ${c.valide ? 'text-green-400' : 'text-red-400'}`}>
                        {c.moyenne.toFixed(2)}/20
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`badge badge-xs border-none font-bold px-1.5 py-0.5 ${
                        c.valide ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {c.valide ? 'Validé' : 'Ajourné'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau récapitulatif */}
        {gradesByCourse.length > 0 && (
          <div className="bg-surface/30 p-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-on-surface">
            <div>
              Moyenne Générale : <strong className="text-accent">{academicSummary.mga}/20</strong>
            </div>
            <div>
              Crédits ECTS : <strong className="text-primary">{academicSummary.totalEcts} / 120</strong>
            </div>
            <div>
              Rang de promotion : <strong className="text-yellow-400">{classementText}</strong>
            </div>
            <div>
              Année Scolaire : <strong className="text-on-surface-muted">{anneeSelectionnee}</strong>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default StudentGrades;
export { StudentGrades };
