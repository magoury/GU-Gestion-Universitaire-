// src/services/studentService.js
// ──────────────────────────────────────────────────────────────
// Service de gestion des étudiants.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ──────────────────────────────────────────────────────────────

import { ref, set, get, update, child } from 'firebase/database';
import { database, auth } from '@fb';
import { generateMatricule } from '../lib/utils.js';
import { ecrireAuditLog } from './auditService.js';

/**
 * Crée un nouvel étudiant sous /universities/$universityId/students/.
 *
 * @param {string} universityId
 * @param {{ nom: string, prenom: string, email: string, filiere: string, niveau: string, dateNaissance: string, telephone?: string }} data
 * @returns {Promise<string>} — ID (clé) de l'étudiant créé
 */
async function creerEtudiant(universityId, data) {
  if (!universityId) {
    throw new Error('universityId requis pour créer un étudiant.');
  }

  // Récupérer l'utilisateur courant pour le log
  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  // Générer un matricule unique
  const matricule = generateMatricule(universityId);

  // Générer une clé unique sous le nœud students
  const studentsListRef = ref(database, `universities/${universityId}/students`);
  
  // Utiliser push pour générer un ID unique de manière sécurisée
  const newStudentRef = child(studentsListRef, matricule); // On utilise le matricule comme ID unique ou une clé générée. Utilisons une clé push pour de futurs liaisons Auth, et stockons le matricule dedans.
  const studentId = matricule; // Utiliser le matricule comme ID unique de la fiche simplifie la réconciliation.

  const studentData = {
    id: studentId,
    matricule,
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    filiere: data.filiere,
    niveau: data.niveau,
    dateNaissance: data.dateNaissance || '',
    telephone: data.telephone || '',
    statut: 'actif',
    dateInscription: Date.now(),
  };

  await set(ref(database, `universities/${universityId}/students/${studentId}`), studentData);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ETUDIANT_CREE',
    cible: studentId,
    detail: `Création de l'étudiant ${data.prenom} ${data.nom} (Matricule: ${matricule})`,
  });

  return studentId;
}

/**
 * Lit un étudiant par son ID (qui est son matricule).
 *
 * @param {string} universityId
 * @param {string} studentId
 * @returns {Promise<Object|null>}
 */
async function lireEtudiant(universityId, studentId) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const snapshot = await get(studentRef);

  if (snapshot.exists()) {
    return snapshot.val();
  }
  return null;
}

/**
 * Liste les étudiants d'une université avec filtres optionnels.
 *
 * @param {string} universityId
 * @param {{ filiere?: string, niveau?: string, statut?: string }} [filtres]
 * @returns {Promise<Array<Object>>}
 */
async function listerEtudiants(universityId, filtres = {}) {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  const studentsRef = ref(database, `universities/${universityId}/students`);
  const snapshot = await get(studentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const students = [];
  snapshot.forEach((childSnapshot) => {
    students.push(childSnapshot.val());
  });

  // Filtrage côté client pour flexibilité multi-critères
  return students.filter(student => {
    if (filtres.filiere && student.filiere !== filtres.filiere) return false;
    if (filtres.niveau && student.niveau !== filtres.niveau) return false;
    if (filtres.statut && student.statut !== filtres.statut) return false;
    return true;
  });
}

/**
 * Met à jour les données d'un étudiant.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @param {Object} data — champs à mettre à jour
 * @returns {Promise<void>}
 */
async function mettreAJourEtudiant(universityId, studentId, data) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  
  // Exclure les champs sensibles non modifiables directement
  const { id, matricule, dateInscription, ...champsModifiables } = data;

  await update(studentRef, champsModifiables);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ETUDIANT_MODIFIE',
    cible: studentId,
    detail: `Mise à jour des informations de l'étudiant ${studentId}.`,
  });
}

/**
 * Change le statut d'un étudiant (actif, suspendu, diplômé, exclu).
 *
 * @param {string} universityId
 * @param {string} studentId
 * @param {'actif'|'suspendu'|'diplome'|'exclu'} statut
 * @returns {Promise<void>}
 */
async function changerStatutEtudiant(universityId, studentId, statut) {
  if (!universityId || !studentId || !statut) {
    throw new Error('universityId, studentId et statut requis.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  await update(studentRef, { statut });

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ETUDIANT_STATUT_CHANGE',
    cible: studentId,
    detail: `Statut de l'étudiant ${studentId} changé à: ${statut}.`,
  });
}

export {
  creerEtudiant,
  lireEtudiant,
  listerEtudiants,
  mettreAJourEtudiant,
  changerStatutEtudiant,
};
