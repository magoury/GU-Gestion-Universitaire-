// src/services/notificationService.js
// ──────────────────────────────────────────────────────────────
// Service de notifications temps réel.
// Isolation multi-tenant stricte : universityId requis.
// ──────────────────────────────────────────────────────────────

import { ref, push, get, set, update } from 'firebase/database';
import { database } from '@fb';

/**
 * Envoie une notification à un ou plusieurs destinataires.
 *
 * @param {string} universityId
 * @param {{
 *   titre: string,
 *   message?: string,
 *   contenu?: string,
 *   type: 'annonce'|'alerte_paiement'|'resultat'|'absence'|'direction'|'rdv_parent'|'message_parent',
 *   destinataires?: string[],
 *   destinataireId?: string,
 *   lien?: string
 * }} data
 * @returns {Promise<string>} — clé de la notification créée
 */
async function envoyerNotification(universityId, data) {
  if (!universityId) {
    throw new Error('universityId requis pour envoyer une notification.');
  }

  const msg = data.message || data.contenu;
  if (!data.titre || !msg) {
    throw new Error('Champs titre et message/contenu obligatoires.');
  }

  const notifsRef = ref(database, `universities/${universityId}/notifications`);
  const newNotifRef = push(notifsRef);
  const notifId = newNotifRef.key;

  const notifData = {
    id: notifId,
    titre: data.titre,
    message: msg,
    type: data.type || 'annonce',
    destinataireId: data.destinataireId || (data.destinataires ? data.destinataires[0] : 'all'),
    destinataires: data.destinataires || null,
    lue: false,
    lu: false,
    timestamp: Date.now(),
    lien: data.lien || '',
  };

  await set(newNotifRef, notifData);
  return notifId;
}

/**
 * Lit les notifications d'un utilisateur filtrées selon son rôle.
 *
 * @param {string} universityId
 * @param {string} userId - ID de l'utilisateur
 * @param {string} [role] - Rôle de l'utilisateur (si absent, sera chargé depuis son profil)
 * @returns {Promise<{ notifications: Array<Object>, nbNonLues: number }>}
 */
async function lireNotifications(universityId, userId, role = null) {
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

  const notifications = [];
  snapshot.forEach((childSnapshot) => {
    const notif = childSnapshot.val();

    // 1. Filtrer selon le type de notification et le rôle
    let matchType = false;
    if (userRole === 'super_admin_plateforme' || userRole === 'admin_universite') {
      matchType = true; // Voit tout
    } else if (userRole === 'teacher') {
      matchType = ['rdv_parent', 'message_parent'].includes(notif.type);
    } else if (userRole === 'student') {
      matchType = ['annonce', 'resultat', 'absence'].includes(notif.type);
    } else if (userRole === 'parent') {
      matchType = ['annonce', 'alerte_paiement', 'direction'].includes(notif.type);
    } else {
      matchType = true;
    }

    // 2. Filtrer le destinataire
    const destinatairesList = notif.destinataires || [];
    const isDestinataire = 
      notif.destinataireId === userId || 
      notif.destinataireId === 'all' || 
      (userRole && notif.destinataireId === `${userRole}s`) || // teachers, students, parents
      destinatairesList.includes(userId);

    if (matchType && isDestinataire) {
      notifications.push(notif);
    }
  });

  // Trier par date décroissante
  notifications.sort((a, b) => b.timestamp - a.timestamp);

  // Compter les non lues (vérifie lu et lue pour compatibilité double)
  const nbNonLues = notifications.filter((n) => !n.lue && !n.lu).length;

  return { notifications, nbNonLues };
}

/**
 * Marque une notification comme lue.
 *
 * @param {string} universityId
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
async function marquerCommeLu(universityId, notificationId) {
  if (!universityId || !notificationId) {
    throw new Error('universityId et notificationId requis.');
  }

  const notifRef = ref(database, `universities/${universityId}/notifications/${notificationId}`);
  await update(notifRef, {
    lu: true,
    lue: true
  });
}

/**
 * Lit tous les étudiants en retard de paiement et leur envoie une notification ainsi qu'à leurs parents.
 *
 * @param {string} universityId
 * @returns {Promise<number>} - Nombre d'alertes envoyées
 */
async function envoyerAlertesPaiement(universityId) {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  // 1. Lire tous les étudiants de l'université
  const studentsSnap = await get(ref(database, `universities/${universityId}/students`));
  if (!studentsSnap.exists()) return 0;
  const students = Object.values(studentsSnap.val());

  // 2. Charger les parents pour réconciliation linkedStudentId inverse
  const usersSnap = await get(ref(database, 'users'));
  const parents = [];
  if (usersSnap.exists()) {
    Object.entries(usersSnap.val()).forEach(([uid, u]) => {
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

export {
  envoyerNotification,
  lireNotifications,
  marquerCommeLu,
  envoyerAlertesPaiement
};
export default {
  envoyerNotification,
  lireNotifications,
  marquerCommeLu,
  envoyerAlertesPaiement
};
