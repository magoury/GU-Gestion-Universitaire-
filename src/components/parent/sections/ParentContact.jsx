// src/components/parent/sections/ParentContact.jsx
// ──────────────────────────────────────────────────────────────
// Section Contact (Communications, notifications, messages admin).
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { ecrireAuditLog } from '../../../services/auditService.js';
import { formatDate } from '../../../lib/utils.js';

function ParentContact({ etudiantLie }) {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  // Formulaire d'envoi de message à l'administration
  const [objet, setObjet] = useState('Paiement');
  const [message, setMessage] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [succesMsg, setSuccesMsg] = useState('');
  const [erreurMsg, setErreurMsg] = useState('');

  // Charger les notifications en temps réel
  const { data: allNotifs, loading: loadingNotifs } = useFirebaseData('notifications', universityId);

  // Filtrer les messages et annonces de l'établissement adressés aux parents
  const filteredNotifications = useMemo(() => {
    if (!allNotifs || !user) return [];
    
    return Object.values(allNotifs)
      .filter((n) => {
        // Types pertinents: direction, annonce, alerte_paiement
        const typeValide = ['direction', 'annonce', 'alerte_paiement'].includes(n.type) || !n.type;
        // Destinataire parent ou global
        const destValide = n.destinataireId === user.uid || n.destinataireId === 'all' || n.destinataireId === 'parents';
        return typeValide && destValide;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allNotifs, user]);

  // Marquer automatiquement les notifications comme lues à l'ouverture de la section
  useEffect(() => {
    if (universityId && filteredNotifications.length > 0) {
      const nonLues = filteredNotifications.filter((n) => !n.lue);
      if (nonLues.length > 0) {
        nonLues.forEach((n) => {
          const notifRef = ref(database, `universities/${universityId}/notifications/${n.id}`);
          update(notifRef, { lue: true }).catch((err) =>
            console.error('Erreur lors du marquage comme lu:', err)
          );
        });
      }
    }
  }, [filteredNotifications, universityId]);

  // Envoyer un message à l'administration
  const handleEnvoyerMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setErreurMsg('Veuillez saisir votre message.');
      return;
    }

    setEnvoiEnCours(true);
    setSuccesMsg('');
    setErreurMsg('');

    try {
      const parentName = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`;
      const studentName = `${etudiantLie.prenom} ${etudiantLie.nom}`;

      const notifRef = push(ref(database, `universities/${universityId}/notifications`));
      await set(notifRef, {
        id: notifRef.key,
        destinataireId: 'admin_universite',
        titre: `Message de ${parentName} — Objet: ${objet}`,
        message: `Message du parent de ${studentName} (Matricule: ${etudiantLie.matricule}) : "${message}"`,
        type: 'message_parent',
        objet: objet,
        senderId: user.uid,
        studentId: etudiantLie.id,
        lue: false,
        timestamp: Date.now()
      });

      // Écrire un journal d'audit
      await ecrireAuditLog(universityId, {
        acteurId: user.uid,
        acteurNom: parentName,
        acteurRole: 'parent',
        action: 'MESSAGE_ENVOYE',
        cible: 'admin_universite',
        detail: `Message envoyé à l'administration - Objet: ${objet} - Élève: ${studentName}`
      });

      setSuccesMsg("Votre message a bien été transmis à l'administration de l'établissement.");
      setMessage('');
    } catch (err) {
      console.error(err);
      setErreurMsg("Une erreur s'est produite lors de l'envoi du message.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-on-surface font-body">
      
      {/* 2 Colonnes de gauche : Notifications + Message */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Section Notifications de l'établissement */}
        <div className="bg-surface/85 backdrop-blur border border-white/10 rounded-xl p-5 shadow-xl">
          <h3 className="font-bold font-display text-lg mb-4 border-b border-white/5 pb-3">
            Annonces de l'Établissement
          </h3>

          {loadingNotifs ? (
            <div className="py-12 flex justify-center items-center flex-col gap-2">
              <span className="loading loading-spinner text-accent loading-md"></span>
              <span className="text-xs text-on-surface-muted">Chargement des annonces...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-on-surface-muted">
              Aucune annonce ou notification administrative n'a été publiée.
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-2">
              {filteredNotifications.map((n) => {
                let icon = '📢';
                let borderStyle = 'border-white/5';
                let bgStyle = 'bg-surface-high/20';

                if (n.type === 'alerte_paiement') {
                  icon = '💳';
                  borderStyle = 'border-warning/20';
                  bgStyle = 'bg-warning/5';
                } else if (n.type === 'direction') {
                  icon = '🏛️';
                  borderStyle = 'border-primary/20';
                  bgStyle = 'bg-primary/5';
                }

                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-lg border flex flex-col gap-1 transition-all ${borderStyle} ${bgStyle}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{icon}</span>
                        <span className="text-xs font-semibold text-on-surface">{n.titre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-on-surface-muted">{formatDate(n.timestamp)}</span>
                        {!n.lue && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent text-bg uppercase">
                            Nouveau
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-muted mt-1 leading-relaxed whitespace-pre-wrap">
                      {n.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section Envoyer un message à l'administration */}
        <div className="bg-surface/85 backdrop-blur border border-white/10 rounded-xl p-5 shadow-xl">
          <h3 className="font-bold font-display text-lg mb-4 border-b border-white/5 pb-3">
            Contacter l'Administration
          </h3>

          <form onSubmit={handleEnvoyerMessage} className="flex flex-col gap-4">
            {erreurMsg && (
              <div className="p-2.5 bg-error/15 text-error text-xs rounded border border-error/25 font-semibold">
                ⚠️ {erreurMsg}
              </div>
            )}
            {succesMsg && (
              <div className="p-2.5 bg-success/15 text-success text-xs rounded border border-success/25 font-semibold font-sans">
                ✓ {succesMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Objet de la demande</label>
                <select
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  className="select select-sm select-bordered w-full bg-bg border-white/10 text-xs rounded focus:outline-none"
                  disabled={envoiEnCours}
                >
                  <option value="Paiement">Paiement & Factures</option>
                  <option value="Résultats">Notes & Scolarité</option>
                  <option value="Inscription">Inscription & Dossier</option>
                  <option value="Autre">Autre demande</option>
                </select>
              </div>
              <div className="md:col-span-2 text-xs text-on-surface-muted italic pb-2 text-right">
                Élève lié : {etudiantLie.prenom} {etudiantLie.nom} ({etudiantLie.matricule})
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Votre Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez votre demande ici. Les administrateurs de la scolarité vous répondront dans les plus brefs délais..."
                rows={5}
                className="textarea textarea-sm textarea-bordered w-full bg-bg border-white/10 rounded text-xs focus:outline-none"
                required
                disabled={envoiEnCours}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-sm btn-accent text-bg border-none font-bold rounded cursor-pointer flex items-center gap-1.5"
                disabled={envoiEnCours}
              >
                {envoiEnCours ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    <span>Envoi...</span>
                  </>
                ) : (
                  <span>✉️ Transmettre le message</span>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Colonne de droite : Contacts utiles */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="bg-surface/85 backdrop-blur border border-white/10 rounded-xl p-5 shadow-xl">
          <h3 className="font-bold font-display text-lg mb-4 border-b border-white/5 pb-3">
            Contacts Utiles
          </h3>

          <div className="flex flex-col gap-4">
            
            {/* Secrétariat */}
            <div className="p-3.5 rounded-lg bg-surface-high/30 border border-white/5 flex flex-col gap-1 hover:border-accent/20 transition-all">
              <span className="text-xs font-bold text-accent">Secrétariat Général</span>
              <span className="text-[10px] text-on-surface-muted">Scolarité, inscriptions & dossiers administratifs</span>
              <div className="text-[11px] font-medium text-on-surface mt-2 flex flex-col gap-0.5">
                <span>📞 +225 27 22 40 00 01 (fictif)</span>
                <span>✉️ secretariat@gu-univ.edu</span>
              </div>
            </div>

            {/* Service Financier */}
            <div className="p-3.5 rounded-lg bg-surface-high/30 border border-white/5 flex flex-col gap-1 hover:border-accent/20 transition-all">
              <span className="text-xs font-bold text-accent">Service Financier</span>
              <span className="text-[10px] text-on-surface-muted">Frais de scolarité, reçus, factures & bourses</span>
              <div className="text-[11px] font-medium text-on-surface mt-2 flex flex-col gap-0.5">
                <span>📞 +225 27 22 40 00 02 (fictif)</span>
                <span>✉️ comptabilite@gu-univ.edu</span>
              </div>
            </div>

            {/* Direction Pédagogique */}
            <div className="p-3.5 rounded-lg bg-surface-high/30 border border-white/5 flex flex-col gap-1 hover:border-accent/20 transition-all">
              <span className="text-xs font-bold text-accent">Responsable Pédagogique</span>
              <span className="text-[10px] text-on-surface-muted">Suivi des cours, absences & emplois du temps</span>
              <div className="text-[11px] font-medium text-on-surface mt-2 flex flex-col gap-0.5">
                <span>📞 +225 27 22 40 00 03 (fictif)</span>
                <span>✉️ pedagogie@gu-univ.edu</span>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}

export default ParentContact;
