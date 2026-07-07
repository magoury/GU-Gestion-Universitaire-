// src/services/auditService.js
// ──────────────────────────────────────────────────────────────
// Service d'audit — écrit et lit les logs d'audit dans
// /universities/$universityId/audit_logs/
// Isolation multi-tenant stricte : universityId toujours requis.
// ──────────────────────────────────────────────────────────────

import { ref, push, get, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { database, auth } from '@fb';

export const AUDIT_ACTIONS = {
  // Étudiants
  ETUDIANT_CREE: 'ETUDIANT_CREE',
  ETUDIANT_MODIFIE: 'ETUDIANT_MODIFIE',
  ETUDIANT_STATUT_CHANGE: 'ETUDIANT_STATUT_CHANGE',
  DONNEES_ANONYMISEES: 'DONNEES_ANONYMISEES',
  // Enseignants
  ENSEIGNANT_CREE: 'ENSEIGNANT_CREE',
  // Notes
  NOTE_SAISIE: 'NOTE_SAISIE',
  NOTE_MODIFIEE: 'NOTE_MODIFIEE',
  // Paiements
  PAIEMENT_ENREGISTRE: 'PAIEMENT_ENREGISTRE',
  // Année
  ANNEE_CLOTUREE: 'ANNEE_CLOTUREE',
  // RGPD
  EXPORT_RGPD: 'EXPORT_RGPD',
  // Comptes
  COMPTE_CREE: 'COMPTE_CREE',
  CONNEXION: 'CONNEXION',
  // Super Admin
  UNIVERSITE_SUSPENDUE: 'UNIVERSITE_SUSPENDUE',
  UNIVERSITE_REACTIVEE: 'UNIVERSITE_REACTIVEE',
};


/**
 * Écrit un log d'audit dans /universities/$universityId/audit_logs/.
 *
 * @param {string} universityId — identifiant du tenant (université)
 * @param {{
 *   acteurId: string,
 *   acteurNom: string,
 *   acteurRole: string,
 *   action: string,
 *   cible: string,
 *   detail: string,
 * }} log — données du log (le timestamp est ajouté automatiquement)
 * @returns {Promise<string>} — clé du log créé
 */
async function ecrireAuditLog(universityId, log) {
  if (!universityId) {
    throw new Error('[auditService] universityId requis — isolation multi-tenant obligatoire.');
  }

  if (!log.acteurId || !log.action) {
    throw new Error('[auditService] acteurId et action sont requis dans le log.');
  }

  let acteurRole = log.acteurRole || '';
  let acteurNom = log.acteurNom || '';

  // Intercepter si c'est l'UID du Super Admin connecté
  try {
    const userSnap = await get(ref(database, `users/${log.acteurId}`));
    if (userSnap.exists()) {
      const uData = userSnap.val();
      if (uData.role === 'super_admin_plateforme') {
        acteurRole = 'super_admin_plateforme';
        acteurNom = `${uData.prenom} ${uData.nom} (Super Admin)`;
      }
    }
  } catch (err) {
    console.warn('[auditService] Échec de récupération de profil pour log d\'audit:', err);
  }

  const auditRef = ref(database, `universities/${universityId}/audit_logs`);

  const auditEntry = {
    acteurId: log.acteurId,
    acteurNom,
    acteurRole,
    action: log.action,
    cible: log.cible || '',
    detail: log.detail || '',
    timestamp: Date.now(),
  };

  const newRef = await push(auditRef, auditEntry);
  return newRef.key;
}

/**
 * Lit les logs d'audit pour une université donnée.
 *
 * @param {string} universityId — identifiant du tenant
 * @param {{
 *   limite?: number,
 *   acteurId?: string,
 * }} [filtres] — filtres optionnels de requêtage
 * @returns {Promise<Array<Object>>} — logs triés par timestamp décroissant
 */
async function lireAuditLogs(universityId, filtres = {}) {
  if (!universityId) {
    throw new Error('[auditService] universityId requis — isolation multi-tenant obligatoire.');
  }

  const auditRef = ref(database, `universities/${universityId}/audit_logs`);
  let auditQuery;

  if (filtres.acteurId) {
    auditQuery = query(auditRef, orderByChild('acteurId'), equalTo(filtres.acteurId));
  } else if (filtres.limite) {
    auditQuery = query(auditRef, orderByChild('timestamp'), limitToLast(filtres.limite));
  } else {
    auditQuery = query(auditRef, orderByChild('timestamp'));
  }

  const snapshot = await get(auditQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const logs = [];
  snapshot.forEach((childSnapshot) => {
    logs.push({
      id: childSnapshot.key,
      ...childSnapshot.val(),
    });
  });

  // Tri décroissant par timestamp
  logs.sort((a, b) => b.timestamp - a.timestamp);

  return logs;
}

export { ecrireAuditLog, lireAuditLogs };
export default { ecrireAuditLog, lireAuditLogs };
