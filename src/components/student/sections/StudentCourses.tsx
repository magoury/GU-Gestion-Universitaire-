// src/components/student/sections/StudentCourses.tsx
// ──────────────────────────────────────────────────────────────
// Section affichant les cours suivis par l'étudiant — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { LibraryIcon } from '../../icons/Icons.jsx';
import type { Teacher, Grade, Student } from '@/types';

interface StudentCoursesProps {
  onNavigateToLibrary: (courseId: string) => void;
  studentProfile: Student;
}

interface CourseWithTeacher {
  id: string;
  nom: string;
  ects?: number;
  heures?: number;
  syllabus?: string;
  filiere?: string;
  niveau?: string;
  enseignantNom: string;
}

function StudentCourses({ onNavigateToLibrary, studentProfile }: StudentCoursesProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Charger les données de test/Firebase
  const { data: allTeachers, loading: loadingTeachers } = useFirebaseData('teachers', universityId);
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);

  // Reconstruire les cours de sa filière / niveau
  const myCourses = useMemo<CourseWithTeacher[]>(() => {
    if (!allTeachers || !studentProfile) return [];
    
    const courses: CourseWithTeacher[] = [];
    const teachersList = Object.values(allTeachers) as Teacher[];
    
    teachersList.forEach((teacher) => {
      if (!teacher.cours) return;
      Object.values(teacher.cours).forEach((c) => {
        // Le cours doit correspondre à la filière et au niveau de l'étudiant
        if (
          (!c.filiere || c.filiere === studentProfile.filiere) &&
          (!c.niveau || c.niveau === studentProfile.niveau)
        ) {
          // Éviter les doublons de cours
          if (!courses.some((item) => item.id === c.id)) {
            courses.push({
              id: c.id,
              nom: c.nom,
              ects: c.ects,
              heures: c.heures,
              syllabus: c.syllabus,
              filiere: c.filiere,
              niveau: c.niveau,
              enseignantNom: `${teacher.prenom} ${teacher.nom}`,
            });
          }
        }
      });
    });

    return courses;
  }, [allTeachers, studentProfile]);

  // Moyennes par matière
  const averagesMap = useMemo<Record<string, string>>(() => {
    if (!allGrades || !user) return {};
    const gradesList = Object.values(allGrades) as Grade[];
    const studentGrades = gradesList.filter((g) => g.studentId === user.uid);
    const courseGrades: Record<string, number[]> = {};

    studentGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courseGrades[mat]) courseGrades[mat] = [];
      courseGrades[mat].push(g.note);
    });

    const map: Record<string, string> = {};
    Object.entries(courseGrades).forEach(([courseId, notes]) => {
      const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
      map[courseId] = avg.toFixed(2);
    });

    return map;
  }, [allGrades, user]);

  if (loadingTeachers || loadingGrades) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
        <span className="text-on-surface-muted text-xs">Chargement de vos cours...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Mes Inscriptions Pédagogiques</h2>

      {myCourses.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Aucun cours n'est actuellement configuré pour votre classe ({studentProfile?.filiere} - {studentProfile?.niveau}).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {myCourses.map((cours) => {
            const moyenne = averagesMap[cours.id];
            const hasMoyenne = moyenne !== undefined;
            const estValide = hasMoyenne && Number(moyenne) >= 10;

            return (
              <div key={cours.id} className="glass-card p-4.5 border border-white/5 rounded-lg flex flex-col justify-between gap-4">
                
                {/* Contenu */}
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge bg-accent/20 text-accent border-none text-[8px] font-bold px-1.5 py-0.5 uppercase">
                      {cours.id}
                    </span>
                    <span className="text-[9px] text-on-surface-muted font-medium">ECTS : {cours.ects || 6}</span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface mt-2 leading-snug line-clamp-1">{cours.nom}</h3>
                  <p className="text-[10px] text-on-surface-muted mt-1 truncate">Enseignant : <strong className="text-on-surface">{cours.enseignantNom}</strong></p>
                  
                  <p className="text-[11px] text-on-surface-muted mt-2 leading-relaxed line-clamp-3 italic border-l-2 border-white/10 pl-2">
                    {cours.syllabus || 'Aucun syllabus disponible.'}
                  </p>
                </div>

                {/* Moyenne & Actions */}
                <div className="border-t border-white/5 pt-3.5 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-on-surface-muted uppercase font-bold">Moyenne</span>
                    <strong className={`text-xs mt-0.5 ${
                      hasMoyenne
                        ? estValide ? 'text-green-400' : 'text-red-400'
                        : 'text-on-surface-muted'
                    }`}>
                      {hasMoyenne ? `${moyenne}/20` : 'N/A'}
                    </strong>
                  </div>

                  <button
                    onClick={() => onNavigateToLibrary(cours.id)}
                    className="btn btn-xs h-7 px-3 bg-surface hover:bg-surface-hover text-accent border border-white/10 rounded flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <LibraryIcon className="w-3 h-3" />
                    <span>Ressources</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default StudentCourses;
export { StudentCourses };
