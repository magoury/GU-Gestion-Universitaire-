// src/components/teacher/sections/GradeEntrySection.tsx
// ──────────────────────────────────────────────────────────────
// Section de Saisie des Notes — version TSX.
// Gère la saisie individuelle, en masse et l'import de notes CSV.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { saisirNote } from '../../../services/gradeService';
import Papa from 'papaparse';
import { AlertIcon, CheckIcon, FileIcon } from '../../icons/Icons.jsx';
import type { Student, GradeType } from '@/types';

interface TypesEvaluation {
  value: GradeType;
  label: string;
  coefficient: number;
}

const TYPES_EVALUATION: TypesEvaluation[] = [
  { value: 'devoir', label: 'Devoir (Coeff 1.0)', coefficient: 1 },
  { value: 'examen', label: 'Examen (Coeff 2.0)', coefficient: 2 },
  { value: 'projet', label: 'Projet (Coeff 1.5)', coefficient: 1.5 },
  { value: 'participation', label: 'Participation (Coeff 0.5)', coefficient: 0.5 },
];

interface CourseConfig {
  id: string;
  nom: string;
  ects?: number;
  heures?: number;
  syllabus?: string;
  filiere?: string;
  niveau?: string;
}

interface NotesMasseItem {
  note: string;
  commentaire: string;
}

interface GradeEntrySectionProps {
  preselectedCourseId?: string | null;
  onClearPreselected?: () => void;
}

function GradeEntrySection({ preselectedCourseId, onClearPreselected }: GradeEntrySectionProps): React.JSX.Element {
  const { user } = useAuth();
  const { universityId, universityConfig } = useTenant();

  // Écouter les collections requises
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);
  const { data: allStudents, loading: loadingStudents } = useFirebaseData('students', universityId);

  // Liste des cours de l'enseignant
  const coursList = useMemo<CourseConfig[]>(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours) as CourseConfig[];
  }, [teacherData]);

  // Cours sélectionné
  const [selectedCourse, setSelectedCourse] = useState('');
  useEffect(() => {
    if (preselectedCourseId) {
      setSelectedCourse(preselectedCourseId);
      onClearPreselected?.();
    } else if (coursList.length > 0 && !selectedCourse) {
      setSelectedCourse(coursList[0].id);
    }
  }, [preselectedCourseId, coursList, selectedCourse, onClearPreselected]);

  // Récupérer le cours actif en détail
  const currentCourseInfo = useMemo(() => {
    return coursList.find((c) => c.id === selectedCourse);
  }, [coursList, selectedCourse]);

  // Liste des étudiants inscrits dans le cours sélectionné
  const studentsOfCourse = useMemo<Student[]>(() => {
    if (!allStudents || !currentCourseInfo) return [];
    const list = Object.values(allStudents) as Student[];
    return list.filter(
      (s) =>
        (!currentCourseInfo.filiere || s.filiere === currentCourseInfo.filiere) &&
        (!currentCourseInfo.niveau || s.niveau === currentCourseInfo.niveau)
    );
  }, [allStudents, currentCourseInfo]);

  // États du mode et des formulaires
  const [modeMasse, setModeMasse] = useState(false);
  const [typeEval, setTypeEval] = useState<GradeType>('devoir');
  
  // États Saisie Individuelle
  const [studentId, setStudentId] = useState('');
  const [valeurNote, setValeurNote] = useState('');
  const [commentaire, setCommentaire] = useState('');

  // États Saisie en Masse
  const [notesMasse, setNotesMasse] = useState<Record<string, NotesMasseItem>>({});

  // États Feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Déterminer le coefficient selon le type d'évaluation choisi
  const currentCoeff = useMemo(() => {
    const found = TYPES_EVALUATION.find((t) => t.value === typeEval);
    return found ? found.coefficient : 1;
  }, [typeEval]);

  // Initialiser l'état de saisie en masse quand le cours ou les étudiants changent
  useEffect(() => {
    if (studentsOfCourse.length > 0) {
      const initNotes: Record<string, NotesMasseItem> = {};
      studentsOfCourse.forEach((s) => {
        initNotes[s.id] = { note: '', commentaire: '' };
      });
      setNotesMasse(initNotes);
    }
  }, [studentsOfCourse]);

  // Validation de note individuelle en temps réel
  const estNoteValide = (val: string) => {
    if (val === '') return true;
    const n = Number(val);
    return !isNaN(n) && n >= 0 && n <= 20;
  };

  // Soumission Saisie Individuelle
  const handleSaisieIndividuelle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!selectedCourse || !studentId || valeurNote === '') {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!estNoteValide(valeurNote)) {
      setErreur('Note invalide. Elle doit être comprise entre 0 et 20.');
      return;
    }

    setLoadingAction(true);
    try {
      await saisirNote(universityId, {
        studentId,
        courseId: selectedCourse,
        type: typeEval,
        valeur: Number(valeurNote),
        commentaire,
        anneeAcademique: universityConfig?.anneeAcademique || '2025-2026',
        coefficient: currentCoeff,
        teacherId: user?.uid,
      });

      setSuccess('Note enregistrée et auditée avec succès.');
      setValeurNote('');
      setCommentaire('');
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la saisie de la note.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Soumission Saisie en Masse
  const handleSaisieEnMasse = async () => {
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    const entries = Object.entries(notesMasse);
    const notesAEnregistrer = entries.filter(([_, v]) => v.note !== '');

    if (notesAEnregistrer.length === 0) {
      setErreur('Aucune note saisie à enregistrer.');
      return;
    }

    const notesInvalides = notesAEnregistrer.some(([_, v]) => !estNoteValide(v.note));
    if (notesInvalides) {
      setErreur('Certaines notes saisies sont invalides (hors de [0-20]).');
      return;
    }

    setLoadingAction(true);
    let successCount = 0;
    try {
      for (const [stId, data] of notesAEnregistrer) {
        await saisirNote(universityId, {
          studentId: stId,
          courseId: selectedCourse,
          type: typeEval,
          valeur: Number(data.note),
          commentaire: data.commentaire || '',
          anneeAcademique: universityConfig?.anneeAcademique || '2025-2026',
          coefficient: currentCoeff,
          teacherId: user?.uid,
        });
        successCount++;
      }

      setSuccess(`${successCount} note(s) enregistrée(s) et auditée(s) avec succès.`);
      
      const cleanNotes: Record<string, NotesMasseItem> = {};
      studentsOfCourse.forEach((s) => {
        cleanNotes[s.id] = { note: '', commentaire: '' };
      });
      setNotesMasse(cleanNotes);
    } catch (err: any) {
      setErreur(err.message || 'Une erreur est survenue lors de la saisie en masse.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Gestion de l'import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErreur('');
    setSuccess('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const importData = results.data;
        const updatedNotes = { ...notesMasse };
        let importes = 0;
        let ignores = 0;

        importData.forEach((row: any) => {
          const matricule = row.matricule?.trim();
          const noteStr = row.note?.trim();
          const comment = row.commentaire?.trim() || '';

          if (!matricule || !noteStr) {
            ignores++;
            return;
          }

          const student = studentsOfCourse.find((s) => s.matricule === matricule);
          if (student && estNoteValide(noteStr)) {
            updatedNotes[student.id] = { note: noteStr, commentaire: comment };
            importes++;
          } else {
            ignores++;
          }
        });

        setNotesMasse(updatedNotes);
        setSuccess(`CSV parsé : ${importes} notes importées dans la grille, ${ignores} lignes ignorées.`);
        e.target.value = '';
      },
      error: (err: any) => {
        setErreur(`Erreur de lecture CSV : ${err.message}`);
      },
    });
  };

  if (loadingTeacher || loadingStudents) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
        <span className="text-on-surface-muted text-xs">Chargement de la console de notes...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface animate-fade-in">
      
      {/* ── BARRE D'ENTÊTE ET DE SELECTION DE COURS ── */}
      <div className="glass-card p-4 border border-white/5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-muted uppercase font-bold">Sélectionner un Cours</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
            >
              {coursList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-muted uppercase font-bold">Évaluation / Coeff</span>
            <select
              value={typeEval}
              onChange={(e) => setTypeEval(e.target.value as GradeType)}
              className="bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
            >
              {TYPES_EVALUATION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-surface border border-white/10 rounded p-0.5">
          <button
            onClick={() => setModeMasse(false)}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              !modeMasse ? 'bg-accent text-bg' : 'text-on-surface-muted hover:text-on-surface'
            }`}
          >
            Saisie Individuelle
          </button>
          <button
            onClick={() => setModeMasse(true)}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              modeMasse ? 'bg-accent text-bg' : 'text-on-surface-muted hover:text-on-surface'
            }`}
          >
            Saisie en Masse / CSV
          </button>
        </div>
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {erreur && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-400 p-3 rounded flex items-center gap-2.5 text-xs animate-fade-in">
          <AlertIcon className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success bg-green-500/10 border-green-500/20 text-green-400 p-3 rounded flex items-center gap-2.5 text-xs animate-fade-in">
          <CheckIcon className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── MODE INDIVIDUEL ── */}
      {!modeMasse && (
        <div className="glass-card p-6 border border-white/5 rounded-lg max-w-xl mx-auto w-full">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4 font-display">Saisie Individuelle</h2>
          
          <form onSubmit={handleSaisieIndividuelle} className="flex flex-col gap-4">
            {/* Étudiant */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-muted uppercase font-bold">Étudiant inscrit</label>
              {studentsOfCourse.length === 0 ? (
                <div className="text-xs text-on-surface-muted italic">Aucun étudiant inscrit dans ce cours.</div>
              ) : (
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                >
                  <option value="">Sélectionner un étudiant...</option>
                  {studentsOfCourse.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.matricule} - {s.prenom} {s.nom} ({s.niveau})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-muted uppercase font-bold">Note de l'étudiant (0 à 20)</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.25"
                value={valeurNote}
                onChange={(e) => setValeurNote(e.target.value)}
                placeholder="Note /20"
                className={`bg-surface border rounded px-3 py-2 text-xs text-on-surface focus:outline-none ${
                  valeurNote !== '' && !estNoteValide(valeurNote)
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/10 focus:border-accent'
                }`}
                required
              />
            </div>

            {/* Commentaire */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-muted uppercase font-bold">Observations / Remarques (Optionnel)</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Remarques pédagogiques..."
                rows={3}
                className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
              />
            </div>

            {/* Bouton de validation */}
            <button
              type="submit"
              disabled={loadingAction || studentsOfCourse.length === 0}
              className="btn bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider h-10 w-full mt-2 cursor-pointer disabled:opacity-50"
            >
              {loadingAction ? <span className="loading loading-spinner loading-xs"></span> : 'Enregistrer la note'}
            </button>
          </form>
        </div>
      )}

      {/* ── MODE EN MASSE & CSV ── */}
      {modeMasse && (
        <div className="glass-card p-6 border border-white/5 rounded-lg flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Saisie en Masse</h2>
              <p className="text-[10px] text-on-surface-muted mt-1">Remplissez directement la grille ou chargez un fichier CSV conforme.</p>
            </div>

            {/* Import CSV */}
            <div className="flex items-center gap-3">
              <label className="btn btn-xs h-8 px-3 bg-surface hover:bg-surface-hover text-on-surface border border-white/10 rounded flex items-center gap-2 cursor-pointer">
                <FileIcon className="w-3.5 h-3.5" />
                <span>Importer CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
              <span className="text-[9px] text-on-surface-muted">Format: matricule, note, commentaire</span>
            </div>
          </div>

          {/* Tableau Grille */}
          <div className="overflow-x-auto border border-white/5 rounded">
            <table className="table table-sm w-full text-xs text-on-surface">
              <thead>
                <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px] uppercase">
                  <th className="py-2.5 pl-4">Matricule</th>
                  <th className="py-2.5">Nom Complet</th>
                  <th className="py-2.5 w-32">Note /20</th>
                  <th className="py-2.5 pr-4">Observations</th>
                </tr>
              </thead>
              <tbody>
                {studentsOfCourse.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-on-surface-muted italic">
                      Aucun étudiant inscrit dans ce cours.
                    </td>
                  </tr>
                ) : (
                  studentsOfCourse.map((s) => {
                    const rowData = notesMasse[s.id] || { note: '', commentaire: '' };
                    return (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-surface/20">
                        <td className="py-2 pl-4 font-semibold text-accent">{s.matricule}</td>
                        <td className="py-2">{s.prenom} {s.nom}</td>
                        <td className="py-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.25"
                            value={rowData.note}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNotesMasse({
                                ...notesMasse,
                                [s.id]: { ...rowData, note: val },
                              });
                            }}
                            placeholder="Saisir..."
                            className={`w-full bg-surface border rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none ${
                              rowData.note !== '' && !estNoteValide(rowData.note)
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-white/10 focus:border-accent'
                            }`}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={rowData.commentaire}
                            onChange={(e) => {
                              setNotesMasse({
                                ...notesMasse,
                                [s.id]: { ...rowData, commentaire: e.target.value },
                              });
                            }}
                            placeholder="Observations..."
                            className="w-full bg-surface border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-accent"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Validation */}
          {studentsOfCourse.length > 0 && (
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={handleSaisieEnMasse}
                disabled={loadingAction}
                className="btn btn-sm h-9 px-5 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded cursor-pointer disabled:opacity-50"
              >
                {loadingAction ? <span className="loading loading-spinner loading-xs"></span> : 'Valider la grille'}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default GradeEntrySection;
export { GradeEntrySection };
