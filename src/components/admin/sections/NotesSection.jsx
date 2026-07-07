import { useState, useMemo, useEffect } from 'react';
import { ref, set, get, remove, onValue, off } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { genererBulletin } from '../../../services/gradeService.js';
import { formatDate } from '../../../lib/utils.js';
import { ecrireAuditLog } from '../../../services/auditService.js';
import { AlertIcon, CheckIcon, FileIcon } from '../../icons/Icons.jsx';
import AcademicYearClosure from '../AcademicYearClosure.jsx';

// Liste des filières (par défaut si non configurées)
const FILIERES = [
  'Génie Logiciel',
  'Réseaux & Télécommunications',
  'Intelligence Artificielle & Data',
  'Sécurité Informatique & Cyber',
  'Management des Systèmes d\'Information',
];

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];

function NotesSection({ universityId: propUniversityId }) {
  const { universityId: contextUniversityId, universityConfig: contextUniversityConfig } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [localConfig, setLocalConfig] = useState(null);
  useEffect(() => {
    if (propUniversityId) {
      const configRef = ref(database, `universities/${propUniversityId}/config`);
      const unsubscribe = onValue(configRef, (snapshot) => {
        setLocalConfig(snapshot.val());
      });
      return () => off(configRef);
    }
  }, [propUniversityId]);

  const universityConfig = propUniversityId ? localConfig : contextUniversityConfig;

  // Écouteurs temps réel
  const { data: studentsData } = useFirebaseData('students', universityId);
  const { data: gradesData, loading: loadingGrades } = useFirebaseData('grades', universityId);

  const [filiereSelectionnee, setFiliereSelectionnee] = useState(FILIERES[0]);
  const [niveauSelectionne, setNiveauSelectionne] = useState(NIVEAUX[0]);
  
  // États de modales
  const [modalBulletinOuverte, setModalBulletinOuverte] = useState(false);
  const [bulletinActif, setBulletinActif] = useState(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  

  
  // États de feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  // Liste de matières extraite de la configuration de la filière
  const matieresFiliere = useMemo(() => {
    // Si la config contient des matières pour cette filière, on les utilise
    if (universityConfig?.filieres) {
      const filConfig = Object.values(universityConfig.filieres).find(f => f.nom === filiereSelectionnee);
      if (filConfig?.matieres) {
        return Object.keys(filConfig.matieres);
      }
    }
    // Fallback : matières génériques selon la filière
    if (filiereSelectionnee.includes('Logiciel')) {
      return ['Algorithmique', 'Bases de données', 'Architecture Web', 'Java / OOP'];
    }
    return ['Mathématiques', 'Réseaux', 'Sécurité', 'Anglais'];
  }, [filiereSelectionnee, universityConfig]);

  // Étudiants de la filière et du niveau sélectionnés
  const etudiantsFiltres = useMemo(() => {
    if (!studentsData) return [];
    return Object.values(studentsData).filter(
      st => st.filiere === filiereSelectionnee && st.niveau === niveauSelectionne
    );
  }, [studentsData, filiereSelectionnee, niveauSelectionne]);

  // Calculer la moyenne de chaque étudiant pour chaque matière
  // Structure : { [studentId]: { [matiere]: moyenne } }
  const moyennesTableau = useMemo(() => {
    if (!gradesData || etudiantsFiltres.length === 0) return {};

    const table = {};
    const notesList = Object.values(gradesData);

    etudiantsFiltres.forEach((st) => {
      table[st.id] = {};
      
      matieresFiliere.forEach((mat) => {
        // Filtrer les notes pour cet élève et cette matière
        const notesEleveMat = notesList.filter(
          (g) => g.studentId === st.id && g.matiereId === mat
        );

        if (notesEleveMat.length > 0) {
          const somme = notesEleveMat.reduce((acc, n) => acc + Number(n.note), 0);
          table[st.id][mat] = Math.round((somme / notesEleveMat.length) * 100) / 100;
        } else {
          table[st.id][mat] = null; // Pas de note
        }
      });

      // Calculer aussi la moyenne générale simple des matières possédant des notes
      const moyennesMatieresValides = Object.values(table[st.id]).filter(v => v !== null);
      if (moyennesMatieresValides.length > 0) {
        const sommeGen = moyennesMatieresValides.reduce((acc, m) => acc + m, 0);
        table[st.id]._generale = Math.round((sommeGen / moyennesMatieresValides.length) * 100) / 100;
      } else {
        table[st.id]._generale = null;
      }
    });

    return table;
  }, [gradesData, etudiantsFiltres, matieresFiliere]);

  // Ouvrir et charger le bulletin
  const handleOuvrirBulletin = async (studentId) => {
    setErreur('');
    setLoadingBulletin(true);
    setBulletinActif(null);
    setModalBulletinOuverte(true);

    try {
      const bulletin = await genererBulletin(universityId, studentId, universityConfig?.anneeAcademique || '2025-2026');
      setBulletinActif(bulletin);
    } catch (err) {
      setErreur(err.message || 'Erreur lors de la génération du bulletin.');
    } finally {
      setLoadingBulletin(false);
    }
  };



  return (
    <div className="flex flex-col gap-4">
      
      {/* Sélecteurs de filtres */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <select
            value={filiereSelectionnee}
            onChange={(e) => setFiliereSelectionnee(e.target.value)}
            className="select select-bordered bg-surface text-xs h-9 min-h-[36px] border-white/10 py-1"
          >
            {FILIERES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={niveauSelectionne}
            onChange={(e) => setNiveauSelectionne(e.target.value)}
            className="select select-bordered bg-surface text-xs h-9 min-h-[36px] border-white/10 py-1"
          >
            {NIVEAUX.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <AcademicYearClosure onFinished={() => {}} />
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2"><CheckIcon className="w-3.5 h-3.5 text-success text-bg" /> {success}</div>}

      {/* Tableau Croisé */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        {loadingGrades ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : etudiantsFiltres.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-on-surface">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted bg-surface-high/30 text-xs">
                  <th>Étudiant</th>
                  {matieresFiliere.map((mat, idx) => (
                    <th key={idx}>{mat}</th>
                  ))}
                  <th>Moy. Générale</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {etudiantsFiltres.map((st) => {
                  const moyennesEleve = moyennesTableau[st.id] || {};
                  const moyGen = moyennesEleve._generale;

                  return (
                    <tr key={st.id} className="border-b border-white/5 hover:bg-white/[0.01] text-xs">
                      <td className="font-semibold text-xs">
                        {st.nom} {st.prenom}
                        <div className="text-[9px] text-accent font-mono mt-0.5">{st.matricule}</div>
                      </td>

                      {/* Moyennes Matières */}
                      {matieresFiliere.map((mat, idx) => {
                        const moy = moyennesEleve[mat];
                        let badgeClass = 'badge-ghost text-on-surface-muted';
                        if (moy !== null && moy !== undefined) {
                          badgeClass = moy >= 12 ? 'badge-success text-bg' : moy >= 10 ? 'badge-warning text-bg' : 'badge-error text-bg';
                        }
                        return (
                          <td key={idx}>
                            <span className={`badge ${badgeClass} badge-xs font-bold text-[10px]`}>
                              {moy !== null && moy !== undefined ? moy.toFixed(2) : '—'}
                            </span>
                          </td>
                        );
                      })}

                      {/* Moyenne Générale */}
                      <td className="font-bold">
                        {moyGen !== null && moyGen !== undefined ? (
                          <span className={`badge ${moyGen >= 10 ? 'badge-primary text-bg' : 'badge-error text-bg'} badge-xs font-black text-[10px]`}>
                            {moyGen.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-on-surface-muted text-[10px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <button
                          onClick={() => handleOuvrirBulletin(st.id)}
                          className="btn btn-xs btn-outline btn-primary font-bold text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <FileIcon className="w-3 h-3" /> Bulletin
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucun étudiant inscrit dans cette filière/niveau.
          </div>
        )}
      </div>

      {/* ── MODAL BULLETIN DE NOTES ── */}
      {modalBulletinOuverte && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-8 relative flex flex-col gap-6 text-on-surface bg-[#0A1914]">
            <button onClick={() => setModalBulletinOuverte(false)} className="absolute top-4 right-4 text-xl">✕</button>

            {loadingBulletin ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <span className="text-sm text-on-surface-muted">Calcul des moyennes en cours...</span>
              </div>
            ) : bulletinActif ? (
              <div className="flex flex-col gap-6" id="bulletin-print-area">
                {/* En-tête académique */}
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-display font-black text-xl text-accent">BULLETIN DE NOTES</h4>
                    <div className="text-xs text-on-surface-muted mt-1">
                      Année Académique : <strong>{bulletinActif.anneeAcademique}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <h5 className="font-bold text-sm text-on-surface">{bulletinActif.studentInfo.prenom} {bulletinActif.studentInfo.nom}</h5>
                    <div className="text-xs text-on-surface-muted mt-0.5">
                      Filière : {bulletinActif.studentInfo.filiere} ({bulletinActif.studentInfo.niveau})
                    </div>
                    <div className="text-xs font-mono text-primary font-bold mt-1">
                      Matricule : {bulletinActif.studentInfo.matricule}
                    </div>
                  </div>
                </div>

                {/* Tableau des matières */}
                <div className="overflow-x-auto">
                  <table className="table table-compact w-full text-xs">
                    <thead>
                      <tr className="bg-surface border-b border-white/10">
                        <th>Matière</th>
                        <th>Coeff</th>
                        <th>Moyenne</th>
                        <th>Notes obtenues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulletinActif.matieres.map((mat, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="font-bold">{mat.matiere}</td>
                          <td>{mat.coefficient}</td>
                          <td className="font-bold">{mat.moyenne.toFixed(2)} / 20</td>
                          <td className="text-on-surface-muted">
                            {mat.notes.map((n, i) => `${n.note} (${n.type})`).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Synthèse */}
                <div className="grid grid-cols-3 gap-4 bg-surface p-4 rounded-xl border border-white/5 mt-4">
                  <div className="text-center">
                    <div className="text-[10px] uppercase font-bold text-on-surface-muted">Moyenne Générale</div>
                    <div className="text-xl font-black text-primary mt-1">
                      {bulletinActif.moyenneGenerale.toFixed(2)} / 20
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase font-bold text-on-surface-muted">Mention</div>
                    <div className="text-base font-bold text-accent mt-1.5">
                      {bulletinActif.mention}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase font-bold text-on-surface-muted">Résultat</div>
                    <div className={`text-base font-bold mt-1.5 ${bulletinActif.admis ? 'text-success' : 'text-error'}`}>
                      {bulletinActif.admis ? 'ADMIS' : 'AJOURNÉ'}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-on-surface-muted italic text-center mt-6">
                  Édité le {formatDate(bulletinActif.dateEdition)} · GU - Certificat académique sécurisé
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-error">Impossible d'éditer le bulletin.</div>
            )}
          </div>
        </div>
      )}



    </div>
  );
}

export default NotesSection;
export { NotesSection };
