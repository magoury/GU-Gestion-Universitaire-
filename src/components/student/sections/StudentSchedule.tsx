// src/components/student/sections/StudentSchedule.tsx
// ──────────────────────────────────────────────────────────────
// Section Emploi du Temps pour l'étudiant — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import LoadingSpinner from '../../ui/LoadingSpinner';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const CRENEAUX_HORAIRES = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

interface ScheduleSlot {
  id: string;
  jour: string;
  horaire: string;
  courseId: string;
  courseName?: string;
  teacherName: string;
  salle: string;
  filiere: string;
  niveau: string;
  semestre: number;
}

import type { Student } from '@/types';

interface StudentScheduleProps {
  studentProfile: Student;
}

function StudentSchedule({ studentProfile }: StudentScheduleProps): React.JSX.Element {
  const { universityId } = useTenant();

  const [semestreActuel, setSemestreActuel] = useState<number>(1);

  // Charger les données de l'emploi du temps
  const { data: scheduleData, loading } = useFirebaseData('schedule', universityId);

  // Filtrer les créneaux de cours correspondant à la filière/niveau de l'étudiant
  const slotsList = useMemo<ScheduleSlot[]>(() => {
    if (!scheduleData || !studentProfile) return [];
    const list = Object.values(scheduleData) as ScheduleSlot[];
    return list.filter(
      (s) =>
        s.filiere === studentProfile.filiere &&
        s.niveau === studentProfile.niveau &&
        s.semestre === semestreActuel
    );
  }, [scheduleData, studentProfile, semestreActuel]);

  // Modéliser les créneaux sous forme de matrice pour la grille
  const gridMatrix = useMemo<Record<string, Record<string, ScheduleSlot | null>>>(() => {
    const matrix: Record<string, Record<string, ScheduleSlot | null>> = {};
    JOURS.forEach((j) => {
      matrix[j] = {};
      CRENEAUX_HORAIRES.forEach((h) => {
        matrix[j][h] = null;
      });
    });

    slotsList.forEach((slot) => {
      if (matrix[slot.jour] && matrix[slot.jour][slot.horaire] !== undefined) {
        matrix[slot.jour][slot.horaire] = slot;
      }
    });

    return matrix;
  }, [slotsList]);

  if (loading) {
    return (
      <LoadingSpinner message="Chargement de votre emploi du temps..." />
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      {/* Sélecteur de Semestre */}
      <div className="glass-card p-4 border border-white/5 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-accent font-display uppercase tracking-wider">Semestre Actif :</span>
          <div className="flex bg-surface border border-white/10 rounded p-0.5">
            <button
              onClick={() => setSemestreActuel(1)}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                semestreActuel === 1 ? 'bg-accent text-bg' : 'text-on-surface-muted hover:text-on-surface'
              }`}
            >
              Semestre 1
            </button>
            <button
              onClick={() => setSemestreActuel(2)}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                semestreActuel === 2 ? 'bg-accent text-bg' : 'text-on-surface-muted hover:text-on-surface'
              }`}
            >
              Semestre 2
            </button>
          </div>
        </div>

        <span className="text-[10px] text-on-surface-muted font-medium">
          Classe : <strong className="text-on-surface">{studentProfile?.filiere} ({studentProfile?.niveau})</strong>
        </span>
      </div>

      {/* Grille Horaire */}
      {slotsList.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Emploi du temps non encore publié pour votre classe pour ce semestre.
        </div>
      ) : (
        <div className="glass-card p-4 border border-white/5 rounded-lg overflow-x-auto">
          <div className="min-w-[800px] grid grid-cols-8 gap-2.5">
            
            {/* Colonne Horaires (En-tête vide) */}
            <div className="flex flex-col gap-2">
              <div className="h-8 flex items-center justify-center font-bold text-[9px] uppercase text-on-surface-muted border-b border-white/5">
                Heures
              </div>
              {CRENEAUX_HORAIRES.map((h) => (
                <div key={h} className="h-16 flex items-center justify-center text-[10px] font-bold text-accent bg-surface/40 border border-white/5 rounded">
                  {h}
                </div>
              ))}
            </div>

            {/* Colonnes Jours */}
            {JOURS.map((jour) => (
              <div key={jour} className="flex flex-col gap-2">
                {/* En-tête jour */}
                <div className="h-8 flex items-center justify-center font-bold text-[10px] uppercase text-on-surface border-b border-white/5">
                  {jour}
                </div>

                {/* Créneaux */}
                {CRENEAUX_HORAIRES.map((horaire) => {
                  const slot = gridMatrix[jour][horaire];
                  return (
                    <div key={horaire} className="h-16 relative">
                      {slot ? (
                        <div className="absolute inset-0 bg-primary-container/80 border-l-2 border-accent rounded p-2 flex flex-col justify-between overflow-hidden shadow-sm animate-scale-up">
                          <div className="text-[10px] font-bold text-on-surface truncate leading-tight">
                            {slot.courseName || slot.courseId}
                          </div>
                          <div className="text-[8px] text-on-surface-muted truncate mt-0.5">
                            Prof: {slot.teacherName}
                          </div>
                          <div className="text-[9px] font-bold text-accent text-right mt-1">
                            Salle {slot.salle}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-surface/10 border border-dashed border-white/5 rounded flex items-center justify-center text-[8px] text-on-surface-muted italic">
                          Libre
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          </div>
        </div>
      )}

    </div>
  );
}

export default StudentSchedule;
export { StudentSchedule };
