// src/components/student/sections/StudentLibrary.tsx
// ──────────────────────────────────────────────────────────────
// Section Bibliothèque et Supports de Cours — version TSX.
// Permet de consulter les ressources et de suivre sa progression.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { formatDate } from '../../../lib/utils.js';
import { BookIcon, CheckIcon } from '../../icons/Icons.jsx';

const TYPES_RESSOURCE = ['PDF', 'Vidéo', 'Lien', 'Présentation'];

interface CourseInfo {
  id: string;
  nom: string;
  ects?: number;
  heures?: number;
  syllabus?: string;
  filiere?: string;
  niveau?: string;
}

interface LibraryResource {
  id: string;
  titre: string;
  type: string;
  courseId: string;
  url: string;
  enseignantId: string;
  timestamp: number;
}

import type { Teacher, Student } from '@/types';

interface StudentLibraryProps {
  preselectedCourseId?: string | null;
  onClearFilter?: () => void;
  studentProfile: Student;
}

function StudentLibrary({ preselectedCourseId, onClearFilter, studentProfile }: StudentLibraryProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Données Firebase
  const { data: allResources, loading: loadingResources } = useFirebaseData('library/resources', universityId);
  const { data: progressData } = useFirebaseData(`progress/${user?.uid}`, universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);

  // Filtres actifs
  const [filiereSelectionnee, setFiliereSelectionnee] = useState('');
  const [typeSelectionne, setTypeSelectionne] = useState('');

  useEffect(() => {
    if (preselectedCourseId) {
      setFiliereSelectionnee(preselectedCourseId);
      onClearFilter?.();
    }
  }, [preselectedCourseId, onClearFilter]);

  // Recueillir la liste complète des cours pour le select de filtrage
  const availableCourses = useMemo<CourseInfo[]>(() => {
    if (!allTeachers || !studentProfile) return [];
    const list: CourseInfo[] = [];
    const teachersList = Object.values(allTeachers) as Teacher[];
    
    teachersList.forEach((teacher) => {
      if (!teacher.cours) return;
      Object.values(teacher.cours).forEach((c) => {
        if (
          (!c.filiere || c.filiere === studentProfile.filiere) &&
          (!c.niveau || c.niveau === studentProfile.niveau)
        ) {
          if (!list.some((x) => x.id === c.id)) {
            list.push(c);
          }
        }
      });
    });
    return list;
  }, [allTeachers, studentProfile]);

  // Filtrer les ressources
  const filteredResources = useMemo<LibraryResource[]>(() => {
    if (!allResources) return [];
    let list = Object.values(allResources) as LibraryResource[];

    // Filtrer par défaut pour n'afficher que les ressources de sa filière
    list = list.filter((r) => {
      // Si la ressource est rattachée à un cours, ce cours doit appartenir aux cours disponibles pour sa filière/niveau
      return !r.courseId || availableCourses.some((c) => c.id === r.courseId);
    });

    if (filiereSelectionnee) {
      list = list.filter((r) => r.courseId === filiereSelectionnee);
    }
    if (typeSelectionne) {
      list = list.filter((r) => r.type === typeSelectionne);
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [allResources, filiereSelectionnee, typeSelectionne, availableCourses]);

  // Marquer une ressource comme vue
  const handleMarquerVue = async (resourceId: string) => {
    if (!user || !universityId) return;
    try {
      const progressRef = ref(database, `universities/${universityId}/progress/${user.uid}/${resourceId}`);
      await set(progressRef, {
        vue: true,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Erreur progression:', err);
    }
  };

  const progressRecord = progressData as Record<string, { vue: boolean; timestamp: number }> | null;

  if (loadingResources) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
        <span className="text-on-surface-muted text-xs">Chargement de la bibliothèque...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      {/* ── BARRE DE FILTRES ── */}
      <div className="glass-card p-4 border border-white/5 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        
        <div className="flex flex-wrap gap-4">
          {/* Par Cours */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-muted uppercase font-bold">Filtrer par cours</span>
            <select
              value={filiereSelectionnee}
              onChange={(e) => setFiliereSelectionnee(e.target.value)}
              className="bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
            >
              <option value="">Tous les cours</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Par Type */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-muted uppercase font-bold">Type de support</span>
            <select
              value={typeSelectionne}
              onChange={(e) => setTypeSelectionne(e.target.value)}
              className="bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
            >
              <option value="">Tous les supports</option>
              {TYPES_RESSOURCE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[10px] text-on-surface-muted">
          Supports disponibles : <strong className="text-on-surface">{filteredResources.length}</strong>
        </div>

      </div>

      {/* ── GRID DE CARDS RESSOURCES ── */}
      {filteredResources.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Aucun support de cours ne correspond à vos critères.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const estVue = progressRecord?.[res.id]?.vue || false;

            return (
              <div key={res.id} className="glass-card p-4 border border-white/5 rounded-lg flex flex-col justify-between gap-3.5 hover:border-accent/20 transition-all">
                
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge bg-accent/20 text-accent border-none text-[8px] font-bold px-1.5 py-0.5 uppercase">
                      {res.courseId}
                    </span>
                    <span className="badge bg-surface border border-white/10 text-on-surface-muted text-[8px] font-bold px-1.5 py-0.5 uppercase">
                      {res.type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface mt-2.5 line-clamp-1">{res.titre}</h3>
                  <span className="text-[9px] text-on-surface-muted block mt-1">Ajouté le {formatDate(res.timestamp)}</span>
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  
                  {/* Suivi progression */}
                  {estVue ? (
                    <span className="text-[9px] text-green-400 font-bold flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Terminé</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarquerVue(res.id)}
                      className="btn btn-xs h-6 px-2.5 bg-surface hover:bg-surface-hover text-on-surface border border-white/10 rounded text-[9px] font-bold cursor-pointer"
                    >
                      Marquer comme vu
                    </button>
                  )}

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleMarquerVue(res.id)}
                    className="btn btn-xs h-6 px-2.5 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded flex items-center gap-1 cursor-pointer"
                  >
                    <BookIcon className="w-3.5 h-3.5" />
                    <span>Ouvrir</span>
                  </a>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default StudentLibrary;
export { StudentLibrary };
