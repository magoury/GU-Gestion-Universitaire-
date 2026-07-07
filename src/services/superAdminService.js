// src/services/superAdminService.js
// ──────────────────────────────────────────────────────────────
// Service SuperAdmin — gestion globale multi-tenant.
// Pas d'isolation universityId ici : le super admin voit tout.
// ──────────────────────────────────────────────────────────────

import { ref, get, update, push, set } from 'firebase/database';
import { database, auth } from '@fb';

/**
 * Écrit un log d'audit global plateforme sous /saas_admin/audit_logs/.
 *
 * @param {Object} log
 * @returns {Promise<void>}
 */
async function ecrireAuditLogGlobal(log) {
  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const auditRef = ref(database, 'saas_admin/audit_logs');
  const newLogRef = push(auditRef);

  await set(newLogRef, {
    acteurId,
    acteurNom: log.acteurNom || 'Super Admin',
    acteurRole: 'super_admin_plateforme',
    action: log.action,
    cible: log.cible || '',
    detail: log.detail || '',
    timestamp: Date.now(),
  });
}

/**
 * Liste toutes les universités inscrites sur la plateforme.
 *
 * @returns {Promise<Array<{ id: string, nom: string, ville: string, pays: string, logo: string|null, plan: string, statut: string, nbEtudiants: number, dateExpiration: number, mrr: number }>>}
 */
async function listerUniversites() {
  const univsRef = ref(database, 'saas_admin/universites');
  const snapshot = await get(univsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const result = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    result.push({
      id: childSnapshot.key,
      nom: data.nom || '',
      ville: data.ville || 'Abidjan',
      pays: data.pays || 'Côte d\'Ivoire',
      logo: data.logo || null,
      plan: data.plan || 'Standard',
      statut: data.statut || 'actif',
      nbEtudiants: Number(data.nbEtudiants || 0),
      dateExpiration: Number(data.dateExpiration || (Date.now() + 365 * 24 * 3600 * 1000)),
      mrr: Number(data.mrr || 150000),
    });
  });

  return result;
}

/**
 * Suspend une université (désactive l'accès pour tous ses utilisateurs).
 *
 * @param {string} universityId
 * @returns {Promise<void>}
 */
async function suspendreUniversite(universityId) {
  if (!universityId) {
    throw new Error('universityId requis pour suspendre l\'université.');
  }

  const univRef = ref(database, `saas_admin/universites/${universityId}`);
  await update(univRef, { statut: 'suspendu' });

  // Également désactiver dans sa configuration locale
  const configRef = ref(database, `universities/${universityId}/config`);
  await update(configRef, { actif: false });

  const currentUser = auth.currentUser;
  await ecrireAuditLogGlobal({
    action: 'UNIVERSITE_SUSPENDUE',
    cible: universityId,
    detail: `Suspension de l'université ${universityId} par le Super Admin (UID: ${currentUser?.uid || 'inconnu'}).`,
  });
}

/**
 * Réactive une université précédemment suspendue.
 *
 * @param {string} universityId
 * @returns {Promise<void>}
 */
async function reactiverUniversite(universityId) {
  if (!universityId) {
    throw new Error('universityId requis pour réactiver l\'université.');
  }

  const univRef = ref(database, `saas_admin/universites/${universityId}`);
  await update(univRef, { statut: 'actif' });

  // Également réactiver dans sa configuration locale
  const configRef = ref(database, `universities/${universityId}/config`);
  await update(configRef, { actif: true });

  const currentUser = auth.currentUser;
  await ecrireAuditLogGlobal({
    action: 'UNIVERSITE_REACTIVEE',
    cible: universityId,
    detail: `Réactivation de l'université ${universityId} par le Super Admin (UID: ${currentUser?.uid || 'inconnu'}).`,
  });
}

/**
 * Lit les KPIs globaux de la plateforme (nombre universités, étudiants, revenus, etc.).
 *
 * @returns {Promise<{ totalUniversites: number, nbUniversitesActives: number, mrr: number, nbTotalEtudiants: number, nbAlertes: number }>}
 */
async function lireKPIsGlobaux() {
  const list = await listerUniversites();

  let nbUniversitesActives = 0;
  let mrr = 0;
  let nbTotalEtudiants = 0;

  list.forEach((univ) => {
    if (univ.statut === 'actif' || univ.statut === 'essai') {
      nbUniversitesActives++;
    }
    mrr += Number(univ.mrr || 0);
    nbTotalEtudiants += Number(univ.nbEtudiants || 0);
  });

  return {
    totalUniversites: list.length,
    nbUniversitesActives,
    mrr,
    nbTotalEtudiants,
    nbAlertes: 0, // Optionnel ou calculé si logs d'erreurs d'infra existants
  };
}

/**
 * Lit les revenus mensuels de la plateforme.
 *
 * @returns {Promise<Array<{ mois: string, montant: number }>>}
 */
async function lireRevenusMensuels() {
  const revRef = ref(database, 'saas_admin/revenue/mensuel');
  const snapshot = await get(revRef);

  if (!snapshot.exists()) {
    // Fallback de secours si non initialisé
    return [
      { mois: 'Jan', montant: 450000 },
      { mois: 'Fév', montant: 600000 },
      { mois: 'Mar', montant: 750000 },
      { mois: 'Avr', montant: 900000 },
      { mois: 'Mai', montant: 1050000 },
      { mois: 'Juin', montant: 1200000 },
      { mois: 'Juil', montant: 1350000 },
    ];
  }

  const result = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    result.push({
      mois: childSnapshot.key,
      montant: Number(data.montant || 0),
    });
  });

  return result;
}

export {
  listerUniversites,
  suspendreUniversite,
  reactiverUniversite,
  lireKPIsGlobaux,
  lireRevenusMensuels,
};
