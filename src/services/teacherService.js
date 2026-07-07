// src/services/teacherService.js
// ──────────────────────────────────────────────────────────────
// Service de gestion des enseignants.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ──────────────────────────────────────────────────────────────

import { ref, set, get, update, push, child } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';

/**
 * Crée un nouvel enseignant sous /universities/$universityId/teachers/.
 *
 * @param {string} universityId
 * @param {{ nom: string, prenom: string, email: string, specialite: string, departement?: string, telephone?: string }} data
 * @returns {Promise<string>} — clé de l'enseignant créé
 */
async function creerEnseignant(universityId, data) {
  if (!universityId) {
    throw new Error('universityId requis pour créer un enseignant.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const teachersRef = ref(database, `universities/${universityId}/teachers`);
  const newTeacherRef = push(teachersRef);
  const teacherId = newTeacherRef.key;

  const teacherData = {
    id: teacherId,
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    specialite: data.specialite,
    departement: data.departement || '',
    telephone: data.telephone || '',
    cours: {}, // Dictionnaire des cours affectés
    dateRecrutement: Date.now(),
  };

  await set(newTeacherRef, teacherData);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ENSEIGNANT_CREE',
    cible: teacherId,
    detail: `Recrutement de l'enseignant ${data.prenom} ${data.nom} (Spécialité: ${data.specialite})`,
  });

  return teacherId;
}

/**
 * Liste tous les enseignants d'une université.
 *
 * @param {string} universityId
 * @returns {Promise<Array<Object>>}
 */
async function listerEnseignants(universityId) {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  const teachersRef = ref(database, `universities/${universityId}/teachers`);
  const snapshot = await get(teachersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const teachers = [];
  snapshot.forEach((childSnapshot) => {
    teachers.push(childSnapshot.val());
  });

  return teachers;
}

/**
 * Affecte un cours à un enseignant avec un volume horaire spécifié.
 *
 * @param {string} universityId
 * @param {string} teacherId
 * @param {string} courseId - Identifiant ou nom du cours
 * @param {{ nom: string, heures: number }} [courseInfo] - Métadonnées du cours
 * @returns {Promise<void>}
 */
async function affecterCours(universityId, teacherId, courseId, courseInfo = {}) {
  if (!universityId || !teacherId || !courseId) {
    throw new Error('universityId, teacherId et courseId requis.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const coursRef = ref(database, `universities/${universityId}/teachers/${teacherId}/cours/${courseId}`);
  
  const courseData = {
    id: courseId,
    nom: courseInfo.nom || courseId,
    heures: Number(courseInfo.heures || 15), // Volume horaire par défaut de 15h
  };

  await set(coursRef, courseData);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'COURS_AFFECTE',
    cible: teacherId,
    detail: `Affectation du cours "${courseData.nom}" (${courseData.heures}h) à l'enseignant.`,
  });
}

/**
 * Calcule la charge horaire cumulée de toutes les affectations d'un enseignant.
 *
 * @param {string} universityId
 * @param {string} teacherId
 * @returns {Promise<number>} - Charge horaire totale
 */
async function calculerChargeHoraire(universityId, teacherId) {
  if (!universityId || !teacherId) {
    throw new Error('universityId et teacherId requis.');
  }

  const teacherRef = ref(database, `universities/${universityId}/teachers/${teacherId}`);
  const snapshot = await get(teacherRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const teacher = snapshot.val();
  const cours = teacher.cours || {};
  
  let chargeTotale = 0;
  Object.keys(cours).forEach((key) => {
    chargeTotale += Number(cours[key].heures || 0);
  });

  return chargeTotale;
}

/**
 * Lit les informations d'un enseignant.
 *
 * @param {string} universityId
 * @param {string} teacherId
 * @returns {Promise<Object|null>}
 */
async function lireEnseignant(universityId, teacherId) {
  if (!universityId || !teacherId) return null;
  const teacherRef = ref(database, `universities/${universityId}/teachers/${teacherId}`);
  const snap = await get(teacherRef);
  return snap.exists() ? snap.val() : null;
}

/**
 * Lit la liste des cours assignés à un enseignant.
 *
 * @param {string} universityId
 * @param {string} teacherId
 * @returns {Promise<Array<Object>>}
 */
async function lireCoursEnseignant(universityId, teacherId) {
  if (!universityId || !teacherId) return [];
  const coursRef = ref(database, `universities/${universityId}/teachers/${teacherId}/cours`);
  const snap = await get(coursRef);
  if (!snap.exists()) return [];
  return Object.values(snap.val());
}

export {
  creerEnseignant,
  listerEnseignants,
  affecterCours,
  calculerChargeHoraire,
  lireEnseignant,
  lireCoursEnseignant,
};
