// src/components/student/sections/StudentOverview.jsx
// ──────────────────────────────────────────────────────────────
// Section Overview pour l'espace Étudiant.
// Affiche la moyenne, les crédits ECTS, et les dernières ressources.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { formatDate } from '../../../lib/utils.js';
import { BookIcon, NotesIcon, ClockIcon, LibraryIcon, FileIcon } from '../../icons/Icons.jsx';

function StudentOverview({ onNavigate }) {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  // Données en temps réel
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);
  const { data: allResources } = useFirebaseData('library/resources', universityId);
  const { data: allNotifs } = useFirebaseData('notifications', universityId);

  // Filtre des notes de cet étudiant
  const myGrades = useMemo(() => {
    if (!allGrades || !user) return [];
    return Object.values(allGrades).filter((g) => g.studentId === user.uid);
  }, [allGrades, user]);

  // Regrouper les notes par matière pour calculer la moyenne générale
  const academicCalculations = useMemo(() => {
    if (myGrades.length === 0) return { mga: '0.00', mention: 'Aucune note', admis: false, ectsObtenus: 0 };

    const notesParMatiere = {};
    myGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!notesParMatiere[mat]) {
        notesParMatiere[mat] = { notes: [], coeffs: [] };
      }
      notesParMatiere[mat].notes.push(g.note);
      notesParMatiere[mat].coeffs.push(g.coefficient || 1);
    });

    let sommeMoyennes = 0;
    let ectsObtenus = 0;
    const matieresKeys = Object.keys(notesParMatiere);

    matieresKeys.forEach((mat) => {
      const { notes, coeffs } = notesParMatiere[mat];
      
      // Calcul moyenne pondérée simple
      let totalNotes = 0;
      let totalCoeffs = 0;
      for (let i = 0; i < notes.length; i++) {
        totalNotes += notes[i] * coeffs[i];
        totalCoeffs += coeffs[i];
      }
      const moyenneMat = totalCoeffs > 0 ? totalNotes / totalCoeffs : 0;
      sommeMoyennes += moyenneMat;

      // Valider les ECTS (ex: 6 ECTS par matière si moyenne >= 10)
      if (moyenneMat >= 10) {
        ectsObtenus += 6; 
      }
    });

    const mgaRaw = matieresKeys.length > 0 ? sommeMoyennes / matieresKeys.length : 0;
    const mga = mgaRaw.toFixed(2);

    let mention = 'Ajourné';
    let admis = false;
    if (mgaRaw >= 10) {
      admis = true;
      if (mgaRaw >= 16) mention = 'Très Bien';
      else if (mgaRaw >= 14) mention = 'Bien';
      else if (mgaRaw >= 12) mention = 'Assez Bien';
      else mention = 'Passable';
    }

    return { mga, mention, admis, ectsObtenus };
  }, [myGrades]);

  // Calculer le taux de présence basé sur les notifications d'absence
  const tauxPresence = useMemo(() => {
    if (!allNotifs || !user) return 100;
    const list = Object.values(allNotifs).filter(
      (n) => n.destinataireId === user.uid && n.titre?.toLowerCase().includes('absence')
    );
    // Chaque absence retire 2%
    return Math.max(100 - list.length * 2, 0);
  }, [allNotifs, user]);

  // Ressources partagées pour sa filière
  const lastResources = useMemo(() => {
    if (!allResources || !userProfile) return [];
    const list = Object.values(allResources);
    
    // Filtrer par filière
    const filtrees = list.filter((r) => !r.courseId || r.courseId.includes(userProfile.filiere || 'Génie'));
    
    // Trier par date
    return filtrees.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [allResources, userProfile]);

  // Dictionnaire des enseignants pour afficher le nom complet
  const teachersMap = useMemo(() => {
    if (!allTeachers) return {};
    const map = {};
    Object.values(allTeachers).forEach((t) => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [allTeachers]);

  if (loadingGrades) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement de vos indicateurs...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface">
      
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-4 gap-4">
        
        {/* Moyenne Générale (MGA) */}
        <div className="glass-card p-4 flex items-center justify-between border border-white/5 rounded-lg">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Moyenne Générale (MGA)</div>
            <div className="text-2xl font-bold font-display text-on-surface mt-1">{academicCalculations.mga}/20</div>
            <div className="text-[9px] text-success mt-1 font-semibold">Mention {academicCalculations.mention}</div>
          </div>
          <div className="p-2.5 rounded-full bg-accent/10 text-accent">
            <NotesIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Crédits ECTS */}
        <div className="glass-card p-4 flex flex-col justify-between border border-white/5 rounded-lg">
          <div className="flex justify-between items-center w-full">
            <div>
              <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Crédits ECTS</div>
              <div className="text-2xl font-bold font-display text-on-surface mt-1">{academicCalculations.ectsObtenus}/120</div>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <BookIcon className="w-5 h-5" />
            </div>
          </div>
          {/* Barre de progression */}
          <div className="mt-3">
            <progress
              className="progress progress-accent w-full h-1.5 bg-surface/50"
              value={academicCalculations.ectsObtenus}
              max="120"
            ></progress>
          </div>
        </div>

        {/* Taux de présence */}
        <div className="glass-card p-4 flex items-center justify-between border border-white/5 rounded-lg">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Taux de Présence</div>
            <div className="text-2xl font-bold font-display text-on-surface mt-1">{tauxPresence}%</div>
            {tauxPresence >= 90 && (
              <span className="badge badge-success text-[8px] font-bold h-4 px-1.5 text-bg border-none mt-1 uppercase">Excellent Standing</span>
            )}
          </div>
          <div className="p-2.5 rounded-full bg-yellow-500/10 text-yellow-400">
            <ClockIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Examens à venir */}
        <div className="glass-card p-4 flex items-center justify-between border border-white/5 rounded-lg">
          <div>
            <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Prochains Examens</div>
            <div className="text-2xl font-bold font-display text-on-surface mt-1">2</div>
            <div className="text-[9px] text-on-surface-muted mt-1">Session normale en cours</div>
          </div>
          <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-400">
            <FileIcon className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ── GRILLE DOUBLE ── */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Notes récentes (Gauche) */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Notes du Semestre en Cours</h2>
            <button
              onClick={() => onNavigate('notes')}
              className="text-[10px] text-accent hover:underline font-bold uppercase tracking-wider"
            >
              Voir le bulletin complet &rarr;
            </button>
          </div>

          <div className="glass-card border border-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full text-xs text-on-surface">
                <thead>
                  <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px]">
                    <th className="py-2.5 pl-4">Matière</th>
                    <th className="py-2.5">Enseignant</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Note</th>
                    <th className="py-2.5 pr-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {myGrades.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-on-surface-muted italic">
                        Aucune note n'a encore été enregistrée pour ce semestre.
                      </td>
                    </tr>
                  ) : (
                    myGrades.slice(0, 6).map((g) => {
                      const estValide = g.note >= 10;
                      return (
                        <tr key={g.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                          <td className="py-2 pl-4 font-semibold text-accent">{g.courseId || g.matiereId}</td>
                          <td className="py-2">{teachersMap[g.enseignantId] || 'Professeur'}</td>
                          <td className="py-2 capitalize">{g.type}</td>
                          <td className="py-2">
                            <span className={`badge badge-xs border-none font-bold px-1.5 py-0.5 ${
                              estValide ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {g.note}/20
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className={`text-[10px] font-bold ${estValide ? 'text-green-400' : 'text-red-400'}`}>
                              {estValide ? 'Acquis' : 'À rattraper'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ressources de cours récentes (Droite) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Ressources Récentes</h2>
          
          <div className="glass-card p-4 border border-white/5 rounded-lg flex flex-col gap-3.5 flex-1 justify-start">
            {lastResources.length === 0 ? (
              <div className="text-center py-8 text-on-surface-muted">
                Aucun support de cours disponible récemment.
              </div>
            ) : (
              lastResources.map((res) => (
                <div key={res.id} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-none last:pb-0">
                  <div className="flex gap-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-surface/50 text-accent mt-0.5 shrink-0">
                      <LibraryIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-on-surface truncate leading-tight">{res.titre}</h4>
                      <span className="text-[9px] text-on-surface-muted block mt-0.5">Matière: {res.courseId}</span>
                    </div>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-xs h-6 px-2.5 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer shrink-0"
                  >
                    Ouvrir
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default StudentOverview;
