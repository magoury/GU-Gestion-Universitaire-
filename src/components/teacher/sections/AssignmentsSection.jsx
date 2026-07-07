// src/components/teacher/sections/AssignmentsSection.jsx
// ──────────────────────────────────────────────────────────────
// Section de publication et suivi des devoirs.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, PlusIcon, FileIcon } from '../../icons/Icons.jsx';

function AssignmentsSection() {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Charger les données de test/Firebase
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);
  const { data: assignmentsData, loading: loadingAssignments } = useFirebaseData('assignments', universityId);

  // Liste des cours de l'enseignant connecté
  const coursList = useMemo(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours);
  }, [teacherData]);

  // Liste des devoirs publiés par cet enseignant (ou pour ses cours)
  const assignmentsList = useMemo(() => {
    if (!assignmentsData) return [];
    const list = Object.values(assignmentsData);
    // Filtrer pour ne garder que ceux qui concernent les cours de cet enseignant
    return list.filter((a) => coursList.some((c) => c.id === a.courseId));
  }, [assignmentsData, coursList]);

  // États du formulaire
  const [modalOuverte, setModalOuverte] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [lienJoint, setLienJoint] = useState('');

  // États Feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingPublish, setLoadingPublish] = useState(false);

  // Publier un devoir
  const handlePublierDevoir = async (e) => {
    e.preventDefault();
    setErreur('');
    setSuccess('');

    if (!titre || !selectedCourse || !dateLimite) {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoadingPublish(true);
    try {
      const assignmentsRef = ref(database, `universities/${universityId}/assignments`);
      const newRef = push(assignmentsRef);
      const assignmentId = newRef.key;

      await set(newRef, {
        id: assignmentId,
        titre,
        description,
        courseId: selectedCourse,
        dateLimite: new Date(dateLimite).getTime(),
        lienJoint,
        enseignantId: user?.uid,
        nbRendus: 0, // Compteur par défaut
        timestamp: Date.now(),
      });

      setSuccess('Devoir publié avec succès.');
      setTitre('');
      setDescription('');
      setSelectedCourse('');
      setDateLimite('');
      setLienJoint('');
      setModalOuverte(false);
    } catch (err) {
      setErreur(err.message || 'Erreur lors de la publication du devoir.');
    } finally {
      setLoadingPublish(false);
    }
  };

  if (loadingTeacher || loadingAssignments) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement des devoirs...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface">
      
      {/* Barre d'action */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Devoirs & Évaluations</h2>
        
        <button
          onClick={() => {
            if (coursList.length > 0) setSelectedCourse(coursList[0].id);
            setModalOuverte(true);
          }}
          disabled={coursList.length === 0}
          className="btn btn-xs h-8 px-3.5 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Publier un Devoir</span>
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

      {/* Liste des devoirs */}
      {assignmentsList.length === 0 ? (
        <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
          Aucun devoir publié pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {assignmentsList.map((asg) => {
            const dateDepassee = Date.now() > asg.dateLimite;
            const coursName = coursList.find((c) => c.id === asg.courseId)?.nom || asg.courseId;

            return (
              <div key={asg.id} className="glass-card p-4 border border-white/5 rounded-lg flex flex-col justify-between gap-3">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge bg-accent/20 text-accent border-none text-[8px] font-bold px-1.5 py-0.5 uppercase">
                      {asg.courseId}
                    </span>
                    
                    <span className={`badge border-none text-[8px] font-bold px-1.5 py-0.5 ${
                      dateDepassee ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      Limite: {formatDate(asg.dateLimite)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface mt-2">{asg.titre}</h3>
                  <p className="text-xs text-on-surface-muted mt-1.5 leading-relaxed line-clamp-3">
                    {asg.description}
                  </p>

                  {asg.lienJoint && (
                    <a
                      href={asg.lienJoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-1 mt-2.5 font-semibold"
                    >
                      <FileIcon className="w-3 h-3" />
                      <span>Ressource / Fiche jointe</span>
                    </a>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[10px]">
                  <span className="text-on-surface-muted">
                    Rendus reçus : <strong className="text-accent">{asg.nbRendus || 0}</strong>
                  </span>
                  <span className="text-on-surface-muted italic">
                    Publié le {formatDate(asg.timestamp)}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL : PUBLIER UN DEVOIR ── */}
      {modalOuverte && (
        <div className="modal modal-open">
          <div className="modal-box glass-card border border-white/10 rounded-lg p-6 max-w-lg">
            <h3 className="font-bold text-sm text-accent uppercase tracking-wider font-display mb-4">
              Publier un nouveau devoir
            </h3>

            <form onSubmit={handlePublierDevoir} className="flex flex-col gap-3.5 text-xs">
              {/* Titre */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Titre du Devoir</label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Devoir de Programmation Web 1"
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                />
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

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Consignes / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sujet, consignes de remise..."
                  rows="3"
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                />
              </div>

              {/* Date limite */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Date et Heure Limite de Remise</label>
                <input
                  type="datetime-local"
                  value={dateLimite}
                  onChange={(e) => setDateLimite(e.target.value)}
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Lien ressources */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Lien vers le sujet (Optionnel)</label>
                <input
                  type="url"
                  value={lienJoint}
                  onChange={(e) => setLienJoint(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
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
                  disabled={loadingPublish}
                  className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
                >
                  {loadingPublish ? <span className="loading loading-spinner loading-xs"></span> : 'Publier'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AssignmentsSection;
