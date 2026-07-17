// src/components/admin/sections/StudentsSection.tsx
// ──────────────────────────────────────────────────────────────
// Section de gestion des étudiants : liste, filtres, ajout manuel, import CSV.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import {
  creerEtudiant,
  mettreAJourEtudiant,
  changerStatutEtudiant,
} from '../../../services/studentService';
import Papa from 'papaparse';
import {
  SearchIcon,
  FileIcon,
  PlusIcon,
  SettingsIcon,
  AlertIcon,
  CheckIcon,
  ChevronIcon
} from '../../icons/Icons.jsx';
import type { Student, StatutEtudiant } from '@/types';
import LoadingSpinner from '../../ui/LoadingSpinner';

const FILIERES = [
  'Génie Logiciel',
  'Réseaux & Télécommunications',
  'Intelligence Artificielle & Data',
  'Sécurité Informatique & Cyber',
  'Management des Systèmes d\'Information',
];

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];
const PAR_PAGE = 5;

interface StudentsSectionProps {
  universityId?: string;
}

function StudentsSection({ universityId: propUniversityId }: StudentsSectionProps): React.JSX.Element {
  const { universityId: contextUniversityId, universityConfig: contextUniversityConfig } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [localConfig, setLocalConfig] = useState<any>(null);
  useEffect(() => {
    if (propUniversityId) {
      const configRef = ref(database, `universities/${propUniversityId}/config`);
      const unsubscribe = onValue(configRef, (snapshot) => {
        setLocalConfig(snapshot.val());
      });
      return () => unsubscribe();
    }
  }, [propUniversityId]);

  const universityConfig = propUniversityId ? localConfig : contextUniversityConfig;

  // Écoute de la liste des étudiants en temps réel
  const { data: studentsData, loading } = useFirebaseData('students', universityId);

  // Liste des étudiants convertie en tableau
  const etudiantsList = useMemo<Student[]>(() => {
    if (!studentsData) return [];
    return Object.values(studentsData) as Student[];
  }, [studentsData]);

  // Filtres
  const [filtreFiliere, setFiltreFiliere] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [rechercheNom, setRechercheNom] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // États des Modales
  const [modalAjoutOuverte, setModalAjoutOuverte] = useState(false);
  const [modalCsvOuverte, setModalCsvOuverte] = useState(false);
  const [modalEditOuverte, setModalEditOuverte] = useState(false);

  // Formulaire d'ajout
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', filiere: '', niveau: 'L1', dateNaissance: '', telephone: '' });
  
  // Édition
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Import CSV
  const [previewCsv, setPreviewCsv] = useState<any[]>([]);
  const [nomFichierCsv, setNomFichierCsv] = useState('');
  const [loadingImport, setLoadingImport] = useState(false);

  // États de feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  // Liste des filières éditables réelles (provenant de la config si présente)
  const filieresDisponibles = useMemo(() => {
    if (universityConfig?.filieres) {
      return Object.values(universityConfig.filieres).map((f: any) => f.nom);
    }
    return FILIERES;
  }, [universityConfig]);

  // Réinitialiser la pagination lors du filtrage
  useEffect(() => {
    setPage(1);
  }, [filtreFiliere, filtreNiveau, filtreStatut, rechercheNom]);

  // Filtrage
  const etudiantsFiltrés = useMemo(() => {
    return etudiantsList.filter((st) => {
      if (filtreFiliere && st.filiere !== filtreFiliere) return false;
      if (filtreNiveau && st.niveau !== filtreNiveau) return false;
      if (filtreStatut && st.statut !== filtreStatut) return false;
      if (rechercheNom) {
        const nomComplet = `${st.prenom} ${st.nom}`.toLowerCase();
        if (!nomComplet.includes(rechercheNom.toLowerCase()) && !(st.matricule || '').toLowerCase().includes(rechercheNom.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [etudiantsList, filtreFiliere, filtreNiveau, filtreStatut, rechercheNom]);

  // Données de la page actuelle
  const etudiantsAffiches = useMemo(() => {
    const debut = (page - 1) * PAR_PAGE;
    return etudiantsFiltrés.slice(debut, debut + PAR_PAGE);
  }, [etudiantsFiltrés, page]);

  const totalPages = Math.ceil(etudiantsFiltrés.length / PAR_PAGE) || 1;

  // Soumission Ajout manuel
  const handleAjoutEtudiant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!formData.nom || !formData.prenom || !formData.email || !formData.filiere || !formData.niveau) {
      setErreur('Veuillez remplir les champs obligatoires.');
      return;
    }

    try {
      await creerEtudiant(universityId, formData);
      setSuccess('Étudiant inscrit avec succès !');
      setFormData({ nom: '', prenom: '', email: '', filiere: '', niveau: 'L1', dateNaissance: '', telephone: '' });
      setModalAjoutOuverte(false);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la création de la fiche.');
    }
  };

  // Parsing CSV
  const handleFichierCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomFichierCsv(file.name);
    setErreur('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.errors.length > 0) {
          setErreur('Erreur lors du traitement du fichier CSV.');
          return;
        }
        const premieresLignes = results.data;
        if (premieresLignes.length > 0) {
          const cles = Object.keys(premieresLignes[0] as any);
          if (!cles.includes('nom') || !cles.includes('prenom') || !cles.includes('email') || !cles.includes('filiere') || !cles.includes('niveau')) {
            setErreur('Le fichier CSV doit contenir les colonnes : nom, prenom, email, filiere, niveau.');
            return;
          }
          setPreviewCsv(premieresLignes);
        } else {
          setErreur('Le fichier CSV est vide.');
        }
      }
    });
  };

  // Valider et lancer l'importation massive
  const handleLancerImport = async () => {
    if (!universityId || previewCsv.length === 0) return;

    setErreur('');
    setLoadingImport(true);
    let importes = 0;

    try {
      for (const row of previewCsv) {
        if (row.nom && row.prenom && row.email) {
          await creerEtudiant(universityId, {
            nom: row.nom.trim(),
            prenom: row.prenom.trim(),
            email: row.email.trim(),
            filiere: row.filiere || filieresDisponibles[0],
            niveau: row.niveau || 'L1',
            dateNaissance: row.dateNaissance || '',
            telephone: row.telephone || '',
          });
          importes++;
        }
      }
      setSuccess(`${importes} étudiants importés avec succès depuis le fichier CSV !`);
      setPreviewCsv([]);
      setNomFichierCsv('');
      setModalCsvOuverte(false);
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'importation de certaines lignes.");
    } finally {
      setLoadingImport(false);
    }
  };

  // Soumission Édition
  const handleEditerEtudiant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId || !selectedStudent) return;
    setErreur('');
    setSuccess('');

    try {
      await mettreAJourEtudiant(universityId, selectedStudent.id, selectedStudent);
      setSuccess('Fiche étudiant mise à jour !');
      setModalEditOuverte(false);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleChangerStatut = async (id: string, nouveauStatut: StatutEtudiant) => {
    if (!universityId) return;
    try {
      await changerStatutEtudiant(universityId, id, nouveauStatut);
      setSuccess(`Statut de l'étudiant mis à jour à: ${nouveauStatut}.`);
    } catch {
      setErreur("Impossible de changer le statut.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Barre d'Actions Supérieure */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        {/* Recherche */}
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matricule..."
            value={rechercheNom}
            onChange={(e) => setRechercheNom(e.target.value)}
            className="input input-bordered bg-surface w-full pr-10 text-xs h-9 border-white/10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-muted text-sm">
            <SearchIcon className="w-3.5 h-3.5 text-on-surface-muted" />
          </span>
        </div>

        {/* Boutons Inscriptions */}
        <div className="flex gap-2">
          <button
            onClick={() => setModalCsvOuverte(true)}
            className="btn btn-sm btn-outline btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
          >
            <FileIcon className="w-3.5 h-3.5" /> Importer CSV
          </button>
          <button
            onClick={() => setModalAjoutOuverte(true)}
            className="btn btn-sm btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Ajouter un étudiant
          </button>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Filière */}
        <select
          value={filtreFiliere}
          onChange={(e) => setFiltreFiliere(e.target.value)}
          className="select select-bordered bg-surface text-xs h-9 min-h-[36px] border-white/10 py-1"
        >
          <option value="">Toutes les filières</option>
          {filieresDisponibles.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {/* Niveau */}
        <select
          value={filtreNiveau}
          onChange={(e) => setFiltreNiveau(e.target.value)}
          className="select select-bordered bg-surface text-xs h-9 min-h-[36px] border-white/10 py-1"
        >
          <option value="">Tous les niveaux</option>
          {NIVEAUX.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* Statut */}
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="select select-bordered bg-surface text-xs h-9 min-h-[36px] border-white/10 py-1"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="suspendu">Suspendu</option>
          <option value="diplome">Diplômé</option>
          <option value="exclu">Exclu</option>
        </select>
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Tableau des Étudiants */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Chargement des étudiants..." />
        ) : etudiantsAffiches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm w-full text-on-surface">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted text-xs">
                  <th>Matricule</th>
                  <th>Nom & Prénoms</th>
                  <th>Filière</th>
                  <th>Niveau</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {etudiantsAffiches.map((st) => {
                  let badgeClass = 'badge-success';
                  if (st.statut === 'suspendu') badgeClass = 'badge-warning';
                  else if (st.statut === 'exclu') badgeClass = 'badge-error';
                  else if (st.statut === 'diplome') badgeClass = 'badge-info';

                  return (
                    <tr key={st.id} className="border-b border-white/5 hover:bg-white/[0.01] text-xs">
                      <td className="font-mono text-[11px] font-bold text-accent">{st.matricule}</td>
                      <td>
                        <div className="font-bold text-xs">{st.nom}</div>
                        <div className="text-[10px] text-on-surface-muted mt-0.5">{st.prenom} · {st.email}</div>
                      </td>
                      <td className="text-xs font-semibold">{st.filiere}</td>
                      <td className="text-xs font-semibold">{st.niveau}</td>
                      <td>
                        <span className={`badge ${badgeClass} badge-xs font-bold capitalize`}>
                          {st.statut}
                        </span>
                      </td>
                      <td className="text-right">
                        {/* Dropdown Actions */}
                        <div className="dropdown dropdown-end">
                          <button className="btn btn-ghost btn-circle btn-xs flex items-center justify-center">
                            <SettingsIcon className="w-3.5 h-3.5 text-on-surface-muted hover:text-on-surface" />
                          </button>
                          <ul className="dropdown-content menu p-2 shadow-2xl bg-surface-high border border-white/10 rounded-box w-40 z-10 text-[11px]">
                            <li>
                              <button onClick={() => { setSelectedStudent(st); setModalEditOuverte(true); }}>
                                Modifier
                              </button>
                            </li>
                            <li className="menu-title text-[8px] uppercase tracking-wider text-on-surface-muted mt-1.5 px-2">
                              Statut
                            </li>
                            <li><button onClick={() => void handleChangerStatut(st.id, 'actif')}>Actif</button></li>
                            <li><button onClick={() => void handleChangerStatut(st.id, 'suspendu')}>Suspendu</button></li>
                            <li><button onClick={() => void handleChangerStatut(st.id, 'diplome')}>Diplômé</button></li>
                            <li><button onClick={() => void handleChangerStatut(st.id, 'exclu')}>Exclu</button></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucun étudiant inscrit ne correspond aux critères.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <div className="join">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="join-item btn bg-surface border-white/10 flex items-center justify-center h-10 w-10 p-0"
            >
              <ChevronIcon direction="left" className="w-4 h-4" />
            </button>
            <button className="join-item btn bg-surface-high border-white/10 text-accent font-bold h-10 px-4">
              Page {page} sur {totalPages}
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="join-item btn bg-surface border-white/10 flex items-center justify-center h-10 w-10 p-0"
            >
              <ChevronIcon direction="right" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUT MANUEL ── */}
      {modalAjoutOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 text-on-surface">
            <button onClick={() => setModalAjoutOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-xl text-on-surface border-b border-white/10 pb-2">
              Inscrire un nouvel étudiant
            </h3>
            <form onSubmit={handleAjoutEtudiant} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Adresse E-mail *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Filière *</label>
                  <select
                    value={formData.filiere}
                    onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                    required
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    <option value="">Sélectionner...</option>
                    {filieresDisponibles.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Niveau d'études *</label>
                  <select
                    value={formData.niveau}
                    onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                    required
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    {NIVEAUX.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Valider l'Inscription
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORT CSV ── */}
      {modalCsvOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => { setModalCsvOuverte(false); setPreviewCsv([]); setNomFichierCsv(''); }} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-xl text-on-surface border-b border-white/10 pb-2">
              Importation massive par fichier CSV
            </h3>

            <div className="flex flex-col gap-3">
              <label className="block text-xs font-bold text-on-surface-muted">
                Sélectionnez le fichier (.csv)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFichierCsv}
                className="file-input file-input-bordered file-input-primary w-full bg-surface border-white/10 text-sm"
              />
              <span className="text-[10px] text-on-surface-muted">
                Format obligatoire : nom, prenom, email, filiere, niveau (séparateur: virgule).
              </span>
            </div>

            {/* Aperçu des données avant validation */}
            {previewCsv.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-accent">
                  Aperçu du fichier : {nomFichierCsv} ({previewCsv.length} lignes identifiées)
                </div>
                <div className="max-h-60 overflow-y-auto border border-white/5 rounded-lg">
                  <table className="table table-compact w-full text-xs">
                    <thead>
                      <tr className="bg-surface-high">
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Email</th>
                        <th>Filière</th>
                        <th>Niveau</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewCsv.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td>{row.nom}</td>
                          <td>{row.prenom}</td>
                          <td>{row.email}</td>
                          <td>{row.filiere}</td>
                          <td>{row.niveau}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewCsv.length > 10 && (
                    <div className="p-2 text-center text-[10px] text-on-surface-muted bg-surface-high/30">
                      ... et {previewCsv.length - 10} autres lignes non affichées.
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLancerImport}
                  disabled={loadingImport}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loadingImport ? (
                    <LoadingSpinner size="xs" inline />
                  ) : (
                    <span>Valider et Importer {previewCsv.length} Étudiants</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL MODIFICATION FICHE ── */}
      {modalEditOuverte && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalEditOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-xl text-on-surface border-b border-white/10 pb-2">
              Modifier la fiche : {selectedStudent.matricule}
            </h3>
            <form onSubmit={handleEditerEtudiant} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Nom</label>
                  <input
                    type="text"
                    required
                    value={selectedStudent.nom}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, nom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Prénom</label>
                  <input
                    type="text"
                    required
                    value={selectedStudent.prenom}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, prenom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Adresse E-mail</label>
                <input
                  type="email"
                  required
                  value={selectedStudent.email}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, email: e.target.value })}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Filière</label>
                  <select
                    value={selectedStudent.filiere}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, filiere: e.target.value })}
                    required
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    {filieresDisponibles.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Niveau</label>
                  <select
                    value={selectedStudent.niveau}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, niveau: e.target.value })}
                    required
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    {NIVEAUX.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Sauvegarder les modifications
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default StudentsSection;
export { StudentsSection };
