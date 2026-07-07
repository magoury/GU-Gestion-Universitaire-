// src/components/teacher/sections/ResourcesSection.jsx
// ──────────────────────────────────────────────────────────────
// Section de dépôt de ressources pédagogiques pour les étudiants.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, PlusIcon, FileIcon, BookIcon } from '../../icons/Icons.jsx';

const TYPES_RESSOURCE = [
  { value: 'PDF', label: 'Document PDF' },
  { value: 'Vidéo', label: 'Support Vidéo / YouTube' },
  { value: 'Lien', label: 'Lien Web Externe' },
  { value: 'Présentation', label: 'Support de Cours (PPTX)' },
];

function ResourcesSection() {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Charger les cours et ressources de la bibliothèque
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);
  const { data: resourcesData, loading: loadingResources } = useFirebaseData('library/resources', universityId);

  // Liste des cours de l'enseignant connecté
  const coursList = useMemo(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours);
  }, [teacherData]);

  // Liste des ressources pédagogiques créées par cet enseignant (ou affectées à ses cours)
  const resourcesList = useMemo(() => {
    if (!resourcesData) return [];
    const list = Object.values(resourcesData);
    // Filtrer par cours de l'enseignant
    return list.filter((r) => coursList.some((c) => c.id === r.courseId));
  }, [resourcesData, coursList]);

  // États du formulaire
  const [modalOuverte, setModalOuverte] = useState(false);
  const [titre, setTitre] = useState('');
  const [typeRes, setTypeRes] = useState('PDF');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [url, setUrl] = useState('');

  // États Feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Ajouter une ressource
  const handleAjouterRessource = async (e) => {
    e.preventDefault();
    setErreur('');
    setSuccess('');

    if (!titre || !selectedCourse || !url) {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoadingAdd(true);
    try {
      const resourceRef = ref(database, `universities/${universityId}/library/resources`);
      const newRef = push(resourceRef);
      const resourceId = newRef.key;

      await set(newRef, {
        id: resourceId,
        titre,
        type: typeRes,
        courseId: selectedCourse,
        url,
        enseignantId: user?.uid,
        timestamp: Date.now(),
      });

      setSuccess('Ressource pédagogique ajoutée avec succès.');
      setTitre('');
      setTypeRes('PDF');
      setSelectedCourse('');
      setUrl('');
      setModalOuverte(false);
    } catch (err) {
      setErreur(err.message || 'Erreur lors de l\'ajout de la ressource.');
    } finally {
      setLoadingAdd(false);
    }
  };

  if (loadingTeacher || loadingResources) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement des ressources...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface">
      
      {/* Barre d'action */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Ressources & Bibliothèque</h2>
        
        <button
          onClick={() => {
            if (coursList.length > 0) setSelectedCourse(coursList[0].id);
            setModalOuverte(true);
          }}
          disabled={coursList.length === 0}
          className="btn btn-xs h-8 px-3.5 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Ajouter une Ressource</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {erreur && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-400 p-3 rounded flex items-center gap-2.5 text-xs">
          <AlertIcon className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success bg-green-500/10 border-green-500/20 text-green-400 p-3 rounded flex items-center gap-2.5 text-xs">
          <CheckIcon className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Liste des ressources */}
      {resourcesList.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Aucune ressource pédagogique partagée pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {resourcesList.map((res) => {
            const coursName = coursList.find((c) => c.id === res.courseId)?.nom || res.courseId;

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
                  <p className="text-[10px] text-on-surface-muted mt-1 truncate">Cours : {coursName}</p>
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-[9px] text-on-surface-muted">
                    Ajouté le {formatDate(res.timestamp)}
                  </span>
                  
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-xs h-6 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded flex items-center gap-1 cursor-pointer"
                  >
                    <BookIcon className="w-3 h-3" />
                    <span>Ouvrir</span>
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL : AJOUTER UNE RESSOURCE ── */}
      {modalOuverte && (
        <div className="modal modal-open">
          <div className="modal-box glass-card border border-white/10 rounded-lg p-6 max-w-lg">
            <h3 className="font-bold text-sm text-accent uppercase tracking-wider font-display mb-4">
              Ajouter une ressource pédagogique
            </h3>

            <form onSubmit={handleAjouterRessource} className="flex flex-col gap-3.5 text-xs">
              {/* Titre */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Titre du document / ressource</label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Syllabus complet du semestre 1"
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Type de ressource */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Type de support</label>
                <select
                  value={typeRes}
                  onChange={(e) => setTypeRes(e.target.value)}
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                >
                  {TYPES_RESSOURCE.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cours concerné */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Cours concerné</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                >
                  <option value="">Sélectionner un cours...</option>
                  {coursList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">URL de la ressource / document</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemples.com/document.pdf"
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Actions */}
              <div className="modal-action gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="btn btn-xs h-8 px-4 bg-surface hover:bg-surface-hover text-on-surface border border-white/10 rounded cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingAdd}
                  className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
                >
                  {loadingAdd ? <span className="loading loading-spinner loading-xs"></span> : 'Ajouter'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ResourcesSection;
