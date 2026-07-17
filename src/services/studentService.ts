// src/services/studentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion des étudiants — version TypeScript strict.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, set, get, update } from 'firebase/database';
import { database, auth } from '@fb';
import { generateMatricule } from '../lib/utils.js';
import { ecrireAuditLog } from './auditService';
import type { Student, StatutEtudiant } from '@/types';

/**
 * Pré-crée une fiche étudiant par un administrateur avec un état d'activation 'pending'.
 * Ce profil n'a pas encore d'utilisateur Firebase Auth associé.
 * 
 * @param universityId - Identifiant unique de l'université (multi-tenant)
 * @param studentData - Fiche étudiant sans les champs générés automatiquement
 * @param createdBy - UID de l'administrateur à l'origine de l'action
 * @returns La fiche Student complète créée
 */
export async function createStudentByAdmin(
  universityId: string,
  studentData: Omit<Student, 'id' | 'matricule' | 'dateInscription' | 'statut' | 'accountStatus'>,
  createdBy: string
): Promise<Student> {
  if (!universityId) {
    throw new Error('universityId requis pour pré-créer un étudiant.');
  }

  // Générer un matricule unique
  const matricule = generateMatricule(universityId);
  const studentId = matricule;

  const newStudent: Student = {
    ...studentData,
    id: studentId,
    matricule,
    statut: 'actif' as StatutEtudiant,
    accountStatus: 'pending' as const, // Profil pré-créé en attente de code d'accès
    dateInscription: Date.now(),
  };

  await set(ref(database, `universities/${universityId}/students/${studentId}`), newStudent);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId: createdBy,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ETUDIANT_CREE',
    cible: studentId,
    detail: `Pré-création de la fiche étudiant ${studentData.prenom} ${studentData.nom} (Matricule: ${matricule})`,
  });

  return newStudent;
}

/**
 * Crée un nouvel étudiant sous /universities/$universityId/students/.
 * Conservée et adaptée pour garantir la rétrocompatibilité avec l'UI existante.
 *
 * @param universityId - Identifiant de l'université
 * @param data - Données du formulaire
 * @returns ID (matricule) de l'étudiant créé
 */
export async function creerEtudiant(
  universityId: string,
  data: {
    nom: string;
    prenom: string;
    email: string;
    filiere: string;
    niveau: string;
    dateNaissance?: string;
    telephone?: string;
  }
): Promise<string> {
  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const student = await createStudentByAdmin(universityId, data, acteurId);
  return student.id;
}

/**
 * Lit un étudiant par son ID (qui est son matricule).
 *
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @returns Le profil étudiant ou null
 */
export async function lireEtudiant(universityId: string, studentId: string): Promise<Student | null> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const snapshot = await get(studentRef);

  if (snapshot.exists()) {
    return snapshot.val() as Student;
  }
  return null;
}

/**
 * Liste les étudiants d'une université avec filtres optionnels.
 *
 * @param universityId - Identifiant de l'université
 * @param filtres - Critères optionnels (filiere, niveau, statut)
 * @returns Liste filtrée des étudiants
 */
export async function listerEtudiants(
  universityId: string,
  filtres: { filiere?: string; niveau?: string; statut?: string } = {}
): Promise<Student[]> {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  const studentsRef = ref(database, `universities/${universityId}/students`);
  const snapshot = await get(studentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const students: Student[] = [];
  snapshot.forEach((childSnapshot) => {
    students.push(childSnapshot.val() as Student);
  });

  // Filtrage multi-critères
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
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @param data - Champs à modifier
 */
export async function mettreAJourEtudiant(
  universityId: string,
  studentId: string,
  data: Partial<Student>
): Promise<void> {
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
 * Change le statut académique d'un étudiant.
 *
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @param statut - Nouveau statut (actif, suspendu, diplome, exclu)
 */
export async function changerStatutEtudiant(
  universityId: string,
  studentId: string,
  statut: StatutEtudiant
): Promise<void> {
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
