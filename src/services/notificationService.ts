// src/services/notificationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion des notifications en temps réel — version TypeScript.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, push, get, set, update } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';
import type { Notification, NotificationType, NotificationsResult } from '@/types';

/**
 * Paramètres pour l'envoi d'une notification.
 */
export interface EnvoyerNotificationParams {
  titre: string;
  message?: string;
  contenu?: string;
  type: NotificationType;
  destinataires?: string[];
  destinataireId?: string;
  lien?: string;
}

/**
 * Envoie une notification à un ou plusieurs destinataires dans le système.
 * 
 * Sécurité (Point 1) :
 *   - L'acteur est résolu via `auth.currentUser`.
 *   - L'acteur `'system'` n'est accessible que si aucun utilisateur n'est connecté 
 *     (tâches automatiques du serveur) ; il ne peut pas être usurpé depuis le client.
 *   - Droits d'envoi selon le rôle :
 *     * `admin_universite`, `super_admin_plateforme`, `system` : autorisés sur tous les types.
 *     * `teacher` : autorisé uniquement sur 'rdv_parent', 'message_parent' et 'absence'.
 *     * Autres rôles : refusés d'envoi.
 *   - logs d'audit 'NOTIFICATION_REFUSEE' en cas de violation.
 * 
 * Sécurité & Ciblage (Point 2) :
 *   - Si le type est 'message_parent' ou 'rdv_parent', la diffusion globale ('all', 'parents', etc.) 
 *     est strictement interdite. Un destinataire ciblé unique (UID de parent) est exigé.
 * 
 * Rétrocompatibilité (Point 5) :
 *   - Initialise à la fois `lu` et `lue` à false.
 *
 * @param universityId - Identifiant unique de l'université
 * @param data - Détails de la notification
 * @returns Clé de la notification créée
 */
export async function envoyerNotification(universityId: string, data: EnvoyerNotificationParams): Promise<string> {
  if (!universityId) {
    throw new Error('universityId requis pour envoyer une notification.');
  }

  const msg = data.message || data.contenu;
  if (!data.titre || !msg) {
    throw new Error('Champs titre et message/contenu obligatoires.');
  }

  const currentUser = auth.currentUser;
  // L'acteur 'system' n'est résolu que s'il n'y a pas d'utilisateur connecté (sécurité contre l'usurpation)
  const acteurId = currentUser ? currentUser.uid : 'system';

  // 1. Détermination du rôle de l'acteur
  let userRole = 'system';
  let userProfile: any = null;
  if (acteurId !== 'system') {
    const userRef = ref(database, `users/${acteurId}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      userProfile = userSnap.val();
      userRole = userProfile.role;
    }
  }

  // 2. Contrôle de permissions selon le rôle et le type de notification
  if (userRole !== 'system' && userRole !== 'super_admin_plateforme' && userRole !== 'admin_universite') {
    let autorise = false;
    if (userRole === 'teacher') {
      autorise = ['rdv_parent', 'message_parent', 'absence'].includes(data.type);
    }

    if (!autorise) {
      const errorMsg = `Non autorisé : Votre rôle "${userRole}" ne vous permet pas d'envoyer des notifications de type "${data.type}".`;
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Utilisateur',
        acteurRole: userRole,
        action: 'NOTIFICATION_REFUSEE' as any,
        cible: data.destinataireId || 'multiple',
        detail: `Tentative refusée d'envoi de notification de type "${data.type}" par ${acteurId}.`,
      });
      throw new Error(errorMsg);
    }
  }

  // 3. Sécurisation du ciblage des messages privés (Point 2)
  const finalDestinataireId = data.destinataireId || (data.destinataires ? data.destinataires[0] : 'all');
  if (['message_parent', 'rdv_parent'].includes(data.type)) {
    if (!finalDestinataireId || finalDestinataireId === 'all' || finalDestinataireId === 'parents' || finalDestinataireId.endsWith('s')) {
      throw new Error(`Le type de notification "${data.type}" est confidentiel et exige un destinataire individuel valide (UID).`);
    }
  }

  const notifsRef = ref(database, `universities/${universityId}/notifications`);
  const newNotifRef = push(notifsRef);
  const notifId = newNotifRef.key;
  if (!notifId) {
    throw new Error('Impossible de générer une clé unique pour la notification.');
  }

  const notifData: Notification = {
    id: notifId,
    titre: data.titre,
    message: msg,
    type: data.type || 'annonce',
    destinataireId: finalDestinataireId,
    destinataires: data.destinataires || null,
    lue: false, // Double marquage (Point 5)
    lu: false,
    timestamp: Date.now(),
    lien: data.lien || '',
  };

  await set(newNotifRef, notifData);
  return notifId;
}

/**
 * Lit et filtre les notifications d'un utilisateur selon son rôle et son UID.
 * 
 * Logique de ciblage & Confidentialité (Point 2 & JSDoc) :
 *   - L'utilisateur ne voit que les notifications adaptées à son rôle (matchType).
 *   - Pour les annonces et alertes globales, le ciblage accepte 'all' ou '${role}s' (ex: 'students').
 *   - Pour les notifications de messages ou RDV privés ('message_parent', 'rdv_parent'),
 *     le ciblage par rôle global ('parents' ou 'all') est ignoré. Le parent doit être ciblé
 *     nommément (soit par son UID direct dans destinataireId, soit dans la liste destinataires[]).
 *
 * @param universityId - Identifiant unique de l'université
 * @param userId - UID de l'utilisateur demandeur
 * @param role - Rôle facultatif (chargé depuis la DB si absent)
 * @returns Liste triée de notifications et compte des non lues
 */
export async function lireNotifications(
  universityId: string,
  userId: string,
  role: string | null = null
): Promise<NotificationsResult> {
  if (!universityId || !userId) {
    throw new Error('universityId et userId requis.');
  }

  let userRole = role;
  if (!userRole) {
    const userRef = ref(database, `users/${userId}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      userRole = userSnap.val().role;
    }
  }

  const notifsRef = ref(database, `universities/${universityId}/notifications`);
  const snapshot = await get(notifsRef);

  if (!snapshot.exists()) {
    return { notifications: [], nbNonLues: 0 };
  }

  const notifications: Notification[] = [];
  snapshot.forEach((childSnapshot) => {
    const notif = childSnapshot.val() as Notification;

    // 1. Filtrer selon le type de notification et le rôle
    let matchType = false;
    if (userRole === 'super_admin_plateforme' || userRole === 'admin_universite') {
      matchType = true; // L'administration a accès à toutes les notifications
    } else if (userRole === 'teacher') {
      matchType = ['rdv_parent', 'message_parent'].includes(notif.type);
    } else if (userRole === 'student') {
      matchType = ['annonce', 'resultat', 'absence'].includes(notif.type);
    } else if (userRole === 'parent') {
      // Les parents ont désormais accès aux messages et RDV privés (Point 2)
      matchType = ['annonce', 'alerte_paiement', 'direction', 'rdv_parent', 'message_parent'].includes(notif.type);
    } else {
      matchType = true;
    }

    // 2. Filtrer le destinataire (Sécurité renforcée sur messages privés)
    const destinatairesList = notif.destinataires || [];
    const isDestinataire = 
      notif.destinataireId === userId || 
      destinatairesList.includes(userId) ||
      // Les ciblages globaux sont interdits pour les messages et RDV confidentiels
      (!['message_parent', 'rdv_parent'].includes(notif.type) && (
        notif.destinataireId === 'all' || 
        (userRole && notif.destinataireId === `${userRole}s`)
      ));

    if (matchType && isDestinataire) {
      notifications.push(notif);
    }
  });

  // Trier par date décroissante
  notifications.sort((a, b) => b.timestamp - a.timestamp);

  // Compter les non lues (Point 5 - double booléen)
  const nbNonLues = notifications.filter((n) => !n.lue && !n.lu).length;

  return { notifications, nbNonLues };
}

/**
 * Marque une notification comme lue.
 * Synchronise les deux booléens de statut pour la rétrocompatibilité (Point 5).
 *
 * @param universityId - Identifiant unique de l'université
 * @param notificationId - Identifiant unique de la notification
 */
export async function marquerCommeLu(universityId: string, notificationId: string): Promise<void> {
  if (!universityId || !notificationId) {
    throw new Error('universityId et notificationId requis.');
  }

  const notifRef = ref(database, `universities/${universityId}/notifications/${notificationId}`);
  await update(notifRef, {
    lu: true, // Champ rétrocompatible
    lue: true // Champ canonique
  });
}

/**
 * Lit tous les étudiants en retard de paiement et envoie une alerte automatique
 * à l'étudiant concerné ainsi qu'à son parent lié.
 *
 * @param universityId - Identifiant unique de l'université
 * @returns Nombre d'alertes envoyées
 */
export async function envoyerAlertesPaiement(universityId: string): Promise<number> {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  // 1. Lire tous les étudiants de l'université
  const studentsSnap = await get(ref(database, `universities/${universityId}/students`));
  if (!studentsSnap.exists()) return 0;
  const students = Object.values(studentsSnap.val()) as any[];

  // 2. Charger les parents pour réconciliation linkedStudentId inverse
  const usersSnap = await get(ref(database, 'users'));
  const parents: Array<{ uid: string; linkedStudentId: string; nom: string }> = [];
  if (usersSnap.exists()) {
    Object.entries(usersSnap.val()).forEach(([uid, u]: [string, any]) => {
      if (u.role === 'parent' && u.linkedStudentId) {
        parents.push({ uid, linkedStudentId: u.linkedStudentId, nom: `${u.prenom} ${u.nom}` });
      }
    });
  }

  let alertesEnvoyees = 0;

  // Import dynamique de verifierStatutFinancier pour éviter les cycles de dépendance
  const { verifierStatutFinancier } = await import('./paymentService.js');

  for (const student of students) {
    if (student.statut !== 'actif') continue;

    const finSummary = await verifierStatutFinancier(universityId, student.id);
    
    // Si l'étudiant a un solde restant impayé et n'est pas à jour
    if (finSummary.montantRestant > 0 && finSummary.statut !== 'a_jour') {
      
      // Notification à l'étudiant
      await envoyerNotification(universityId, {
        destinataireId: student.id,
        titre: "Alerte Facture de Scolarité",
        message: `Rappel de facture : Un montant de ${finSummary.montantRestant.toLocaleString()} FCFA est en retard de paiement. Veuillez régulariser votre situation pédagogique.`,
        type: 'alerte_paiement',
        destinataires: [student.id]
      });
      alertesEnvoyees++;

      // Trouver le parent lié à cet étudiant
      const parentLie = parents.find((p) => p.linkedStudentId === student.id);
      if (parentLie) {
        await envoyerNotification(universityId, {
          destinataireId: parentLie.uid,
          titre: `Alerte Facture Scolarité — ${student.prenom} ${student.nom}`,
          message: `Rappel scolarité pour votre enfant ${student.prenom} ${student.nom} : Un montant de ${finSummary.montantRestant.toLocaleString()} FCFA est impayé. Prochaine échéance ou retard constaté.`,
          type: 'alerte_paiement',
          destinataires: [parentLie.uid]
        });
        alertesEnvoyees++;
      }
    }
  }

  return alertesEnvoyees;
}
