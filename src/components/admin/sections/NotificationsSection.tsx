// src/components/admin/sections/NotificationsSection.tsx
// ──────────────────────────────────────────────────────────────
// Section de diffusion des annonces aux différents rôles de l'université.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { envoyerNotification } from '../../../services/notificationService';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, BellIcon } from '../../icons/Icons.jsx';
import type { Notification } from '@/types';

const DESTINATAIRES = [
  { value: 'all', label: 'Toute l\'Université (Tous)' },
  { value: 'teachers', label: 'Enseignants uniquement' },
  { value: 'students', label: 'Étudiants uniquement' },
  { value: 'parents', label: 'Parents uniquement' },
];

const TYPES = [
  { value: 'info', label: 'Information standard (Bleu)' },
  { value: 'warning', label: 'Alerte / Attention (Jaune)' },
  { value: 'urgent', label: 'Urgent / Important (Rouge)' },
  { value: 'success', label: 'Succès / Félicitations (Vert)' },
];

interface NotificationsSectionProps {
  universityId?: string;
}

function NotificationsSection({ universityId: propUniversityId }: NotificationsSectionProps): React.JSX.Element {
  const { universityId: contextUniversityId } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  // Écoute des notifications en temps réel
  const { data: notificationsData, loading } = useFirebaseData('notifications', universityId);

  const notificationsList = useMemo<Notification[]>(() => {
    if (!notificationsData) return [];
    return (Object.values(notificationsData) as Notification[]).sort((a, b) => b.timestamp - a.timestamp);
  }, [notificationsData]);

  // Modale
  const [modalEnvoiOuverte, setModalEnvoiOuverte] = useState(false);

  // Formulaire
  const [dest, setDest] = useState('all');
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [lien, setLien] = useState('');

  // Feedbacks
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  const handlePublierAnnonce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!titre || !message) {
      setErreur('Le titre et le message de l\'annonce sont obligatoires.');
      return;
    }

    try {
      await envoyerNotification(universityId, {
        destinataireId: dest,
        titre,
        message,
        type: type as any,
        lien,
      });

      setSuccess('Annonce publiée et envoyée avec succès aux destinataires cibles !');
      setTitre('');
      setMessage('');
      setLien('');
      setModalEnvoiOuverte(false);
    } catch (err: any) {
      setErreur(err.message || 'Une erreur est survenue lors de l\'envoi.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Actions */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-on-surface-muted text-xs font-semibold">
          Diffusion de messages et alertes administratives
        </h3>
        <button
          onClick={() => setModalEnvoiOuverte(true)}
          className="btn btn-sm btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
        >
          <BellIcon className="w-3.5 h-3.5" /> Publier une annonce
        </button>
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Historique des Annonces */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        <div className="p-3 bg-surface-high/30 border-b border-white/10 font-bold text-xs text-on-surface">
          Historique des Annonces diffusées
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md text-primary animate-spin"></span>
          </div>
        ) : notificationsList.length > 0 ? (
          <div className="flex flex-col p-4 gap-3 animate-fade-in">
            {notificationsList.map((notif) => {
              let borderClass = 'border-info/30 bg-info/5';
              let badgeColor = 'badge-info';
              if ((notif.type as any) === 'warning') {
                borderClass = 'border-warning/30 bg-warning/5';
                badgeColor = 'badge-warning';
              } else if ((notif.type as any) === 'urgent') {
                borderClass = 'border-error/30 bg-error/5';
                badgeColor = 'badge-error';
              } else if ((notif.type as any) === 'success') {
                borderClass = 'border-success/30 bg-success/5';
                badgeColor = 'badge-success';
              }

              const lblDest = DESTINATAIRES.find(d => d.value === notif.destinataireId)?.label || `Utilisateur : ${notif.destinataireId}`;

              return (
                <div key={notif.id} className={`p-3 rounded-lg border ${borderClass} flex flex-col gap-1.5 transition-all`}>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${badgeColor} badge-xs`} />
                      <h4 className="font-bold text-xs text-on-surface">{notif.titre}</h4>
                    </div>
                    <span className="text-[9px] text-on-surface-muted font-semibold">
                      Envois à : <strong>{lblDest}</strong> · Le {formatDate(notif.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-on-surface-muted leading-relaxed font-medium">
                    {notif.message}
                  </p>
                  
                  {notif.lien && (
                    <div className="mt-1">
                      <a href={notif.lien} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline font-bold">
                        Lien associé : {notif.lien}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucune annonce n'a encore été diffusée pour le moment.
          </div>
        )}
      </div>

      {/* ── MODAL PUBLIER ANNONCE ── */}
      {modalEnvoiOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalEnvoiOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-lg text-on-surface border-b border-white/10 pb-2">
              Diffuser une nouvelle annonce
            </h3>
            <form onSubmit={handlePublierAnnonce} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Audience Cible *</label>
                <select
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="select select-bordered bg-surface w-full text-sm border-white/10"
                >
                  {DESTINATAIRES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Type d'alerte *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="select select-bordered bg-surface w-full text-sm border-white/10"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Titre de l'Annonce *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fermeture exceptionnelle / Résultats examens"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Message à diffuser *</label>
                <textarea
                  required
                  placeholder="Écrivez le message de l'annonce ici..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="textarea textarea-bordered bg-surface w-full text-sm border-white/10 h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Lien d'action optionnel (URL)</label>
                <input
                  type="url"
                  placeholder="Ex: https://..."
                  value={lien}
                  onChange={(e) => setLien(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Diffuser immédiatement
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default NotificationsSection;
export { NotificationsSection };
