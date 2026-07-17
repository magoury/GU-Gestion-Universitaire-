// src/components/teacher/sections/CoursesSection.tsx
// ──────────────────────────────────────────────────────────────
// Section d'affichage des cours et de consultation des étudiants — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { StudentsIcon } from '../../icons/Icons.jsx';
import type { Student } from '@/types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface Course {
  id: string;
  nom: string;
  ects?: number;
  heures?: number;
  syllabus?: string;
  filiere?: string;
  niveau?: string;
}

interface CoursesSectionProps {
  onNavigateToGrades: (courseId: string) => void;
}

function CoursesSection({ onNavigateToGrades }: CoursesSectionProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Charger les données de test/Firebase
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);
  const { data: allStudents, loading: loadingStudents } = useFirebaseData('students', universityId);

  // Liste des cours
  const coursList = useMemo<Course[]>(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours) as Course[];
  }, [teacherData]);

  // Modal Étudiants
  const [modalOuverte, setModalOuverte] = useState(false);
  const [coursSelect, setCoursSelect] = useState<Course | null>(null);

  // Filtrer les étudiants pour un cours donné
  const getStudentsForCourse = (cours: Course | null) => {
    if (!allStudents || !cours) return [];
    const list = Object.values(allStudents) as Student[];
    return list.filter(
      (s) =>
        (!cours.filiere || s.filiere === cours.filiere) &&
        (!cours.niveau || s.niveau === cours.niveau)
    );
  };

  const handleVoirEtudiants = (cours: Course) => {
    setCoursSelect(cours);
    setModalOuverte(true);
  };

  const etudiantsAffiches = useMemo<Student[]>(() => {
    return getStudentsForCourse(coursSelect);
  }, [allStudents, coursSelect]);

  if (loadingTeacher || loadingStudents) {
    return (
      <LoadingSpinner message="Chargement de vos cours..." />
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Mes Enseignements</h2>

      {coursList.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Aucun cours ne vous a été assigné pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coursList.map((cours) => {
            const etudiantsCount = getStudentsForCourse(cours).length;

            return (
              <div key={cours.id} className="glass-card p-5 border border-white/5 rounded-lg flex flex-col justify-between gap-4">
                
                {/* Corps */}
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge bg-accent/20 text-accent border-none text-[9px] font-bold px-2 py-0.5 uppercase">
                      {cours.id}
                    </span>
                    <span className="text-[10px] text-on-surface-muted">ECTS : {cours.ects || 4}</span>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mt-2">{cours.nom}</h3>
                  
                  {/* Syllabus / Description */}
                  <p className="text-xs text-on-surface-muted mt-2 leading-relaxed italic line-clamp-2">
                    {cours.syllabus || 'Aucun syllabus défini pour cette matière. Veuillez vous rapprocher de l\'administration.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
                    <div className="bg-surface/50 border border-white/5 rounded p-2 flex flex-col">
                      <span className="text-on-surface-muted">Filière</span>
                      <strong className="text-on-surface truncate mt-0.5">{cours.filiere || 'Générale'}</strong>
                    </div>
                    <div className="bg-surface/50 border border-white/5 rounded p-2 flex flex-col">
                      <span className="text-on-surface-muted">Niveau</span>
                      <strong className="text-on-surface mt-0.5">{cours.niveau || 'Tout niveau'}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                  <div className="flex items-center gap-1 text-[10px] text-accent">
                    <StudentsIcon className="w-3.5 h-3.5" />
                    <strong>{etudiantsCount} étudiant(s) inscrit(s)</strong>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVoirEtudiants(cours)}
                      className="btn btn-xs h-7 px-3 bg-surface hover:bg-surface-hover text-on-surface border border-white/10 rounded font-semibold cursor-pointer"
                    >
                      Voir liste
                    </button>
                    <button
                      onClick={() => onNavigateToGrades(cours.id)}
                      className="btn btn-xs h-7 px-3 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
                    >
                      Notes
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL : LISTE DES ETUDIANTS DU COURS ── */}
      {modalOuverte && coursSelect && (
        <div className="modal modal-open">
          <div className="modal-box glass-card border border-white/10 rounded-lg p-6 max-w-xl">
            <h3 className="font-bold text-sm text-accent uppercase tracking-wider font-display mb-1">
              Liste des étudiants inscrits
            </h3>
            <p className="text-[10px] text-on-surface-muted mb-4 font-semibold uppercase">{coursSelect.nom}</p>

            <div className="overflow-y-auto max-h-80 border border-white/5 rounded">
              <table className="table table-sm w-full text-xs text-on-surface">
                <thead>
                  <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px]">
                    <th className="py-2 pl-4">Matricule</th>
                    <th className="py-2">Nom Complet</th>
                    <th className="py-2">Filière</th>
                    <th className="py-2 pr-4">Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {etudiantsAffiches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-on-surface-muted italic">
                        Aucun étudiant inscrit dans ce cours.
                      </td>
                    </tr>
                  ) : (
                    etudiantsAffiches.map((s) => (
                      <tr key={s.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                        <td className="py-2 pl-4 font-semibold text-accent">{s.matricule}</td>
                        <td className="py-2">{s.prenom} {s.nom}</td>
                        <td className="py-2">{s.filiere}</td>
                        <td className="py-2 pr-4 font-medium">{s.niveau}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-action mt-4">
              <button
                onClick={() => {
                  setModalOuverte(false);
                  setCoursSelect(null);
                }}
                className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CoursesSection;
export { CoursesSection };
