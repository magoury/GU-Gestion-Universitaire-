// src/services/teacherService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion des enseignants — version TypeScript strict.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, set, get, push } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';
import type { Teacher, TeacherCours } from '@/types';

/**
 * Pré-crée une fiche enseignant par un administrateur avec un statut d'activation 'pending'.
 * Ce profil n'a pas encore de compte de connexion Firebase Auth associé.
 * 
 * @param universityId - Identifiant unique de l'université (tenant)
 * @param teacherData - Données personnelles de l'enseignant
 * @param createdBy - UID de l'administrateur
 * @returns La fiche Teacher complète créée
 */
export async function createTeacherByAdmin(
  universityId: string,
  teacherData: Omit<Teacher, 'id' | 'dateRecrutement' | 'cours' | 'accountStatus'>,
  createdBy: string
): Promise<Teacher> {
  if (!universityId) {
    throw new Error('universityId requis pour pré-créer un enseignant.');
  }

  const teachersRef = ref(database, `universities/${universityId}/teachers`);
  const newTeacherRef = push(teachersRef);
  const teacherId = newTeacherRef.key;
  if (!teacherId) {
    throw new Error("Impossible de générer une clé unique pour l'enseignant.");
  }

  const newTeacher: Teacher = {
    ...teacherData,
    id: teacherId,
    cours: {},
    accountStatus: 'pending' as const, // Profil pré-créé en attente de code d'accès
    dateRecrutement: Date.now(),
  };

  await set(newTeacherRef, newTeacher);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId: createdBy,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'ENSEIGNANT_CREE',
    cible: teacherId,
    detail: `Pré-création de la fiche enseignant ${teacherData.prenom} ${teacherData.nom} (Spécialité: ${teacherData.specialite})`,
  });

  return newTeacher;
}

/**
 * Crée un nouvel enseignant sous /universities/$universityId/teachers/.
 * Conservée et adaptée pour garantir la rétrocompatibilité avec l'UI existante.
 *
 * @param universityId - Identifiant de l'université
 * @param data - Données du formulaire
 * @returns ID généré de l'enseignant créé
 */
export async function creerEnseignant(
  universityId: string,
  data: {
    nom: string;
    prenom: string;
    email: string;
    specialite: string;
    departement?: string;
    telephone?: string;
  }
): Promise<string> {
  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const teacher = await createTeacherByAdmin(universityId, data, acteurId);
  return teacher.id;
}

/**
 * Liste tous les enseignants d'une université.
 *
 * @param universityId - Identifiant de l'université
 * @returns Liste de tous les enseignants du tenant
 */
export async function listerEnseignants(universityId: string): Promise<Teacher[]> {
  if (!universityId) {
    throw new Error('universityId requis.');
  }

  const teachersRef = ref(database, `universities/${universityId}/teachers`);
  const snapshot = await get(teachersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const teachers: Teacher[] = [];
  snapshot.forEach((childSnapshot) => {
    teachers.push(childSnapshot.val() as Teacher);
  });

  return teachers;
}

/**
 * Affecte un cours à un enseignant avec un volume horaire spécifié.
 *
 * @param universityId - Identifiant de l'université
 * @param teacherId - Identifiant de l'enseignant
 * @param courseId - Identifiant unique ou nom du cours
 * @param courseInfo - Métadonnées facultatives (nom, volume d'heures)
 */
export async function affecterCours(
  universityId: string,
  teacherId: string,
  courseId: string,
  courseInfo: { nom?: string; heures?: number } = {}
): Promise<void> {
  if (!universityId || !teacherId || !courseId) {
    throw new Error('universityId, teacherId et courseId requis.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const coursRef = ref(database, `universities/${universityId}/teachers/${teacherId}/cours/${courseId}`);
  
  const courseData: TeacherCours = {
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
 * @returns Charge horaire cumulée
 */
export async function calculerChargeHoraire(universityId: string, teacherId: string): Promise<number> {
  if (!universityId || !teacherId) {
    throw new Error('universityId et teacherId requis.');
  }

  const teacherRef = ref(database, `universities/${universityId}/teachers/${teacherId}`);
  const snapshot = await get(teacherRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const teacher = snapshot.val() as Teacher;
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
 * @param universityId - Identifiant de l'université
 * @param teacherId - Identifiant de l'enseignant
 * @returns Le profil de l'enseignant ou null
 */
export async function lireEnseignant(universityId: string, teacherId: string): Promise<Teacher | null> {
  if (!universityId || !teacherId) return null;
  const teacherRef = ref(database, `universities/${universityId}/teachers/${teacherId}`);
  const snap = await get(teacherRef);
  return snap.exists() ? (snap.val() as Teacher) : null;
}

/**
 * Lit la liste des cours assignés à un enseignant.
 *
 * @param universityId - Identifiant de l'université
 * @param teacherId - Identifiant de l'enseignant
 * @returns Liste de cours assignés
 */
export async function lireCoursEnseignant(universityId: string, teacherId: string): Promise<TeacherCours[]> {
  if (!universityId || !teacherId) return [];
  const coursRef = ref(database, `universities/${universityId}/teachers/${teacherId}/cours`);
  const snap = await get(coursRef);
  if (!snap.exists()) return [];
  return Object.values(snap.val() as Record<string, TeacherCours>);
}
