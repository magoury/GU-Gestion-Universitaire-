// src/components/teacher/sections/TeacherOverview.tsx
// ──────────────────────────────────────────────────────────────
// Vue d'ensemble (Dashboard) pour l'enseignant connecté — version TSX.
// Affiche des indicateurs clés (KPIs) et ses cours en temps réel.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { formatDate } from '../../../lib/utils.js';
import { BookIcon, StudentsIcon, NotesIcon, FileIcon } from '../../icons/Icons.jsx';
import type { Grade, Student, Assignment } from '@/types';

// Composants UI partagés
import LoadingSpinner from '../../ui/LoadingSpinner';
import KPICard from '../../ui/KPICard';

interface TeacherOverviewProps {
  onNavigateToGrades: (courseId: string) => void;
}

interface ActivityItem {
  id: string;
  texte: string;
  date: number;
}

function TeacherOverview({ onNavigateToGrades }: TeacherOverviewProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Écouter les données nécessaires en temps réel
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);
  const { data: allStudents } = useFirebaseData('students', universityId);
  const { data: allAssignments } = useFirebaseData('assignments', universityId);

  // 1. Liste des cours
  const coursList = useMemo(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours) as any[];
  }, [teacherData]);

  // 2. Calcul du nombre d'étudiants uniques inscrits dans ses cours
  const totalEtudiants = useMemo(() => {
    if (!allStudents || coursList.length === 0) return 0;
    const students = Object.values(allStudents) as Student[];
    const setEtudiants = new Set<string>();

    students.forEach((student) => {
      const match = coursList.some(
        (c) =>
          (!c.filiere || c.filiere === student.filiere) &&
          (!c.niveau || c.niveau === student.niveau)
      );
      if (match) {
        setEtudiants.add(student.id);
      }
    });

    return setEtudiants.size;
  }, [allStudents, coursList]);

  // 3. Notes saisies ce mois-ci par cet enseignant
  const notesSaisiesCeMois = useMemo(() => {
    if (!allGrades) return 0;
    const grades = Object.values(allGrades) as Grade[];
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    return grades.filter(
      (g) => g.enseignantId === user?.uid && g.dateSaisie >= debutMois.getTime()
    ).length;
  }, [allGrades, user]);

  // 4. Devoirs publiés en cours
  const devoirsEnAttente = useMemo(() => {
    if (!allAssignments) return 0;
    const list = Object.values(allAssignments) as Assignment[];
    return list.filter((a) => coursList.some((c) => c.id === a.courseId)).length;
  }, [allAssignments, coursList]);

  // 5. Activité récente (5 dernières notes saisies par cet enseignant)
  const activiteRecente = useMemo<ActivityItem[]>(() => {
    if (!allGrades || !allStudents) return [];
    const grades = (Object.values(allGrades) as Grade[]).filter((g) => g.enseignantId === user?.uid);
    const studentsMap = allStudents as Record<string, Student>;

    const triees = grades.sort((a, b) => b.dateSaisie - a.dateSaisie).slice(0, 5);

    return triees.map((g) => {
      const infoStu = studentsMap[g.studentId];
      const etudiant = infoStu ? `${infoStu.prenom} ${infoStu.nom}` : g.studentId;
      return {
        id: g.id,
        texte: `Note de ${g.note}/20 saisie pour ${etudiant} en ${g.courseId || g.matiereId}`,
        date: g.dateSaisie,
      };
    });
  }, [allGrades, allStudents, user]);

  if (loadingTeacher || loadingGrades) {
    return (
      <LoadingSpinner message="Chargement de vos indicateurs..." />
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface">
      
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Mes Cours */}
        <KPICard
          label="Mes Cours Assignés"
          value={coursList.length}
          icon={<BookIcon className="w-5 h-5" />}
          variant="none"
        />

        {/* Total Étudiants */}
        <KPICard
          label="Total Étudiants"
          value={totalEtudiants}
          icon={<StudentsIcon className="w-5 h-5" />}
          variant="none"
        />

        {/* Notes Saisies Ce Mois */}
        <KPICard
          label="Notes Saisies (Mois)"
          value={notesSaisiesCeMois}
          icon={<NotesIcon className="w-5 h-5 text-yellow-400" />}
          variant="none"
        />

        {/* Devoirs Publiés */}
        <KPICard
          label="Devoirs Publiés"
          value={devoirsEnAttente}
          icon={<FileIcon className="w-5 h-5 text-blue-400" />}
          variant="none"
        />

      </div>

      {/* ── DOUBLE GRILLE CENTRALISÉE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mes Cours (Gauche) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Mes Cours Actifs</h2>
          
          {coursList.length === 0 ? (
            <div className="glass-card p-6 border border-white/5 text-center text-on-surface-muted rounded-lg">
              Aucun cours ne vous a encore été affecté par l'administration.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coursList.map((cours) => {
                const notesCours = allGrades
                  ? (Object.values(allGrades) as Grade[]).filter((g) => g.courseId === cours.id && g.enseignantId === user?.uid)
                  : [];
                const derniereNote = notesCours.sort((a, b) => b.dateSaisie - a.dateSaisie)[0];

                return (
                  <div key={cours.id} className="glass-card p-4 border border-white/5 rounded-lg flex flex-col justify-between gap-3 hover:border-accent/20 transition-all">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="badge badge-xs bg-accent/20 text-accent border-none uppercase text-[8px] font-bold px-1.5 py-0.5">{cours.id}</span>
                        <span className="text-[10px] text-on-surface-muted">{cours.heures}h affectées</span>
                      </div>
                      <h3 className="text-sm font-bold text-on-surface mt-1.5 line-clamp-1">{cours.nom}</h3>
                      <p className="text-[10px] text-on-surface-muted mt-1">
                        Niveau: <span className="text-on-surface font-semibold">{cours.niveau || 'N/A'}</span> · Filière: <span className="text-on-surface font-semibold">{cours.filiere || 'Générale'}</span>
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[10px]">
                      <span className="text-on-surface-muted">
                        Dernière saisie : <strong className="text-on-surface">{derniereNote ? formatDate(derniereNote.dateSaisie) : 'Aucune'}</strong>
                      </span>
                      <button
                        onClick={() => onNavigateToGrades(cours.id)}
                        className="btn btn-xs h-7 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
                      >
                        Saisir notes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activité récente (Droite) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Activité Récente</h2>
          <div className="glass-card p-4 border border-white/5 rounded-lg flex flex-col gap-3.5 flex-1 justify-start">
            {activiteRecente.length === 0 ? (
              <div className="text-center py-8 text-on-surface-muted">
                Aucune saisie de note enregistrée récemment.
              </div>
            ) : (
              activiteRecente.map((act) => (
                <div key={act.id} className="flex gap-2.5 border-b border-white/5 pb-3 last:border-none last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0 animate-ping"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-on-surface leading-snug">{act.texte}</p>
                    <span className="text-[9px] text-on-surface-muted mt-1 block">{formatDate(act.date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default TeacherOverview;
export { TeacherOverview };
