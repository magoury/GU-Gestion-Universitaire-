// src/components/parent/sections/ParentContact.tsx
// ──────────────────────────────────────────────────────────────
// Section Contact (Communications, notifications, messages admin) — Version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { ecrireAuditLog } from '../../../services/auditService';
import { formatDate } from '../../../lib/utils';
import type { Student, Notification } from '@/types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface ParentContactProps {
  etudiantLie: Student;
}

function ParentContact({ etudiantLie }: ParentContactProps): React.JSX.Element {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  // Formulaire d'envoi de message à l'administration
  const [objet, setObjet] = useState<string>('Paiement');
  const [message, setMessage] = useState<string>('');
  const [envoiEnCours, setEnvoiEnCours] = useState<boolean>(false);
  const [succesMsg, setSuccesMsg] = useState<string>('');
  const [erreurMsg, setErreurMsg] = useState<string>('');

  // Charger les notifications en temps réel
  const { data: allNotifs, loading: loadingNotifs } = useFirebaseData('notifications', universityId);

  // Filtrer les messages et annonces de l'établissement adressés aux parents
  const filteredNotifications = useMemo<Notification[]>(() => {
    if (!allNotifs || !user) return [];
    
    const list = Object.values(allNotifs) as Notification[];
    return list
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
  const handleEnvoyerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user?.uid) {
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
      await ecrireAuditLog(universityId!, {
        acteurId: user.uid!,
        acteurNom: parentName,
        acteurRole: 'parent',
        action: 'MESSAGE_ENVOYE',
        cible: 'admin_universite',
        detail: `Message envoyé à l'administration - Objet: ${objet} - Élève: ${studentName}`
      });

      setSuccesMsg("Votre message a bien été transmis à l'administration de l'établissement.");
      setMessage('');
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setErreurMsg('Impossible de transmettre votre message. Veuillez réessayer.');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-on-surface font-body animate-fade-in text-xs">
      
      {/* Formulaire d'envoi de message à gauche */}
      <div className="lg:col-span-1 bg-surface/40 backdrop-blur border border-white/5 p-6 rounded-xl flex flex-col gap-4 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">
          Contacter l'Administration
        </h3>
        
        <form onSubmit={handleEnvoyerMessage} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-on-surface-muted">Objet de la demande</label>
            <select
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="Paiement">Paiement & Facturation</option>
              <option value="Absence">Justification d'absence</option>
              <option value="Notes">Notes & Trimestres</option>
              <option value="Autre">Autre demande</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-on-surface-muted">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="bg-bg border border-white/10 rounded p-2 text-on-surface focus:outline-none focus:border-accent"
              placeholder="Saisissez votre message..."
            />
          </div>

          {erreurMsg && <div className="text-red-400 font-semibold">{erreurMsg}</div>}
          {succesMsg && <div className="text-green-400 font-semibold">{succesMsg}</div>}

          <button
            type="submit"
            disabled={envoiEnCours}
            className="btn btn-xs h-8 bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase rounded cursor-pointer transition-all w-full disabled:opacity-50"
          >
            {envoiEnCours ? 'Transmission...' : 'Envoyer mon message'}
          </button>
        </form>
      </div>

      {/* Liste des messages / annonces reçus à droite */}
      <div className="lg:col-span-2 bg-surface/40 backdrop-blur border border-white/5 p-6 rounded-xl flex flex-col gap-4 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">
          Boîte de Réception & Annonces
        </h3>

        {loadingNotifs ? (
          <LoadingSpinner message="Chargement des messages..." />
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-on-surface-muted italic">
            Aucun message ou annonce de la direction pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 max-h-[450px] overflow-y-auto pr-1">
            {filteredNotifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-lg border transition-all ${
                  n.type === 'alerte_paiement' 
                    ? 'bg-red-500/5 border-red-500/10' 
                    : 'bg-surface/30 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {n.type === 'alerte_paiement' ? '⚠️' : '📢'}
                    </span>
                    <h4 className="font-bold text-accent">{n.titre}</h4>
                  </div>
                  <span className="text-[10px] text-on-surface-muted font-medium shrink-0">
                    {formatDate(n.timestamp)}
                  </span>
                </div>
                <p className="text-on-surface-muted leading-relaxed mt-2 pl-6">
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default ParentContact;
export { ParentContact };
