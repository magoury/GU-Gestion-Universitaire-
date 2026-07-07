// src/components/teacher/sections/MessagesSection.jsx
// ──────────────────────────────────────────────────────────────
// Section de messagerie et de publication d'annonces aux étudiants.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { envoyerNotification } from '../../../services/notificationService.js';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, PlusIcon, BellIcon } from '../../icons/Icons.jsx';

function MessagesSection() {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Écouter toutes les notifications de l'établissement en temps réel
  const { data: allNotifs, loading: loadingNotifs } = useFirebaseData('notifications', universityId);
  const { data: teacherData, loading: loadingTeacher } = useFirebaseData(`teachers/${user?.uid}`, universityId);

  // Liste des cours de l'enseignant
  const coursList = useMemo(() => {
    if (!teacherData || !teacherData.cours) return [];
    return Object.values(teacherData.cours);
  }, [teacherData]);

  // Notifications reçues (qui lui sont adressées ou globales pour tous / enseignants)
  const notificationsRecues = useMemo(() => {
    if (!allNotifs) return [];
    const list = Object.values(allNotifs);
    return list
      .filter(
        (n) =>
          n.destinataireId === user?.uid ||
          n.destinataireId === 'all' ||
          n.destinataireId === 'teachers'
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allNotifs, user]);

  // États du formulaire
  const [modalOuverte, setModalOuverte] = useState(false);
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('students'); // 'students' par défaut (tous ses étudiants)

  // États Feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);

  // Envoyer une annonce
  const handleEnvoyerAnnonce = async (e) => {
    e.preventDefault();
    setErreur('');
    setSuccess('');

    if (!titre || !message) {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoadingSend(true);
    try {
      // Envoyer via le service de notification multi-tenant
      await envoyerNotification(universityId, {
        destinataireId: selectedCourse, // 'students' ou ID spécifique du cours
        titre,
        message,
        type: 'info',
        lien: '',
      });

      setSuccess('Annonce envoyée avec succès à vos étudiants.');
      setTitre('');
      setMessage('');
      setSelectedCourse('students');
      setModalOuverte(false);
    } catch (err) {
      setErreur(err.message || 'Erreur lors de l\'envoi de l\'annonce.');
    } finally {
      setLoadingSend(false);
    }
  };

  if (loadingNotifs || loadingTeacher) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-2">
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement de la messagerie...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface">
      
      {/* Barre d'action */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Notifications & Annonces</h2>
        
        <button
          onClick={() => setModalOuverte(true)}
          className="btn btn-xs h-8 px-3.5 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Créer une annonce</span>
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

      {/* Historique des messages reçus */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">Boîte de réception</h3>
        
        {notificationsRecues.length === 0 ? (
          <div className="glass-card p-8 border border-white/5 text-center text-on-surface-muted rounded-lg">
            Aucun message ou annonce reçue.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {notificationsRecues.map((notif) => (
              <div key={notif.id} className="glass-card p-4 border border-white/5 rounded-lg flex items-start gap-4">
                <div className="p-2 rounded-full bg-accent/10 text-accent">
                  <BellIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-on-surface leading-tight">{notif.titre}</h4>
                    <span className="text-[9px] text-on-surface-muted font-medium italic">
                      {formatDate(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-muted mt-1 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL : ENVOYER UNE ANNONCE ── */}
      {modalOuverte && (
        <div className="modal modal-open">
          <div className="modal-box glass-card border border-white/10 rounded-lg p-6 max-w-lg">
            <h3 className="font-bold text-sm text-accent uppercase tracking-wider font-display mb-4">
              Créer et diffuser une annonce
            </h3>

            <form onSubmit={handleEnvoyerAnnonce} className="flex flex-col gap-3.5 text-xs">
              {/* Titre */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Objet / Titre de l'annonce</label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Report du cours de Programmation Web 1"
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Cible */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Destinataires</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-surface border border-white/10 rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-accent"
                  required
                >
                  <option value="students">Tous les étudiants inscrits à mes cours</option>
                  {coursList.map((c) => (
                    <option key={c.id} value={`course-${c.id}`}>
                      Étudiants du cours : {c.nom} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-muted uppercase font-bold">Message de l'annonce</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contenu de votre message aux étudiants..."
                  rows="4"
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
                  disabled={loadingSend}
                  className="btn btn-xs h-8 px-4 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded cursor-pointer"
                >
                  {loadingSend ? <span className="loading loading-spinner loading-xs"></span> : 'Diffuser'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default MessagesSection;
