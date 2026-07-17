// src/services/gradeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion des notes et calcul des moyennes — version TypeScript.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, get, push, update } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService';
import { calculerMoyenne } from '../lib/utils.js';
import type { Grade, GradeType } from '@/types';

/**
 * Paramètres pour la saisie d'une note.
 */
export interface SaisirNoteParams {
  studentId: string;
  courseId: string;
  type: GradeType;
  valeur: number;
  commentaire?: string;
  anneeAcademique: string;
  teacherId?: string;
  coefficient?: number;
  semestre?: string;
}

/**
 * Saisit une note pour un étudiant dans le système.
 * 
 * Sécurité (Point 1) : 
 *   - Un enseignant ne peut saisir que pour lui-même.
 *   - Le cours cible doit lui être affecté dans l'université.
 *   - En cas de tentative frauduleuse, un log d'audit 'NOTE_SAISIE_REFUSEE' est généré.
 *
 * @param universityId - Identifiant unique de l'université
 * @param data - Détails de la note
 * @returns La clé unique de la note créée
 */
export async function saisirNote(universityId: string, data: SaisirNoteParams): Promise<string> {
  if (!universityId) {
    throw new Error('universityId requis pour saisir une note.');
  }

  const noteValeur = Number(data.valeur);
  if (isNaN(noteValeur) || noteValeur < 0 || noteValeur > 20) {
    throw new Error('La valeur de la note doit être comprise entre 0 et 20 inclus.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';
  const teacherId = data.teacherId || acteurId;

  // Récupérer le rôle et les informations de l'acteur
  const userProfileSnap = await get(ref(database, `users/${acteurId}`));
  const userProfile = userProfileSnap.exists() ? userProfileSnap.val() : null;
  const userRole = userProfile ? userProfile.role : 'teacher';

  // Contrôles de sécurité pour les non-administrateurs
  if (userRole !== 'super_admin_plateforme' && userRole !== 'admin_universite') {
    // 1. Usurpation d'identifiant d'enseignant
    if (teacherId !== acteurId) {
      const errorMsg = 'Non autorisé : Un enseignant ne peut saisir des notes que pour lui-même.';
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Enseignant inconnu',
        acteurRole: userRole,
        action: 'NOTE_SAISIE_REFUSEE',
        cible: data.studentId,
        detail: `Tentative de saisie de note refusée : usurpation d'identifiant d'enseignant (acteur: ${acteurId}, cible: ${teacherId}).`,
      });
      throw new Error(errorMsg);
    }

    // 2. Vérification que le cours est affecté à l'enseignant
    const coursAssignesRef = ref(database, `universities/${universityId}/teachers/${teacherId}/cours/${data.courseId}`);
    const coursAssignesSnap = await get(coursAssignesRef);
    if (!coursAssignesSnap.exists()) {
      const errorMsg = `Non autorisé : Le cours "${data.courseId}" n'est pas assigné à cet enseignant.`;
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Enseignant inconnu',
        acteurRole: userRole,
        action: 'NOTE_SAISIE_REFUSEE',
        cible: data.studentId,
        detail: `Tentative de saisie de note refusée : le cours "${data.courseId}" n'est pas assigné à l'enseignant ${teacherId}.`,
      });
      throw new Error(errorMsg);
    }
  }

  // Récupérer le nom de l'enseignant
  let enseignantNom = 'Enseignant';
  if (teacherId === acteurId && userProfile) {
    enseignantNom = `${userProfile.prenom} ${userProfile.nom}`;
  } else {
    const teachSnap = await get(ref(database, `universities/${universityId}/teachers/${teacherId}`));
    if (teachSnap.exists()) {
      const t = teachSnap.val();
      enseignantNom = `${t.prenom} ${t.nom}`;
    }
  }

  // Récupérer le nom de l'étudiant
  let etudiantNom = data.studentId;
  const studentSnap = await get(ref(database, `universities/${universityId}/students/${data.studentId}`));
  if (studentSnap.exists()) {
    const s = studentSnap.val();
    etudiantNom = `${s.prenom} ${s.nom}`;
  }

  const gradesRef = ref(database, `universities/${universityId}/grades`);
  const newGradeRef = push(gradesRef);
  const gradeId = newGradeRef.key;
  if (!gradeId) {
    throw new Error('Impossible de générer une clé unique pour la note.');
  }

  const gradeData: Grade = {
    id: gradeId,
    studentId: data.studentId,
    courseId: data.courseId,
    matiereId: data.courseId, // Rétrocompatibilité
    enseignantId: teacherId,
    note: noteValeur,
    coefficient: Number(data.coefficient || 1),
    anneeAcademique: data.anneeAcademique,
    type: data.type || 'devoir',
    commentaire: data.commentaire || '',
    dateSaisie: Date.now(),
    semestre: data.semestre || undefined, // Stocké uniquement si fourni (Point 2)
  };

  // Écriture atomique multi-path
  const updates: Record<string, any> = {};
  updates[`universities/${universityId}/grades/${gradeId}`] = gradeData;
  updates[`universities/${universityId}/grades_by_student/${data.studentId}/${gradeId}`] = gradeData;
  await update(ref(database), updates);

  // Journal d'audit
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const detailLog = `Enseignant ${enseignantNom} a saisi une note de ${noteValeur}/20 pour ${etudiantNom} en ${data.courseId} le ${dateStr}`;

  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: enseignantNom,
    acteurRole: 'teacher',
    action: 'NOTE_SAISIE',
    cible: data.studentId,
    detail: detailLog,
  });

  return gradeId;
}

/**
 * Lit toutes les notes d'un étudiant à partir de son index sécurisé.
 * 
 * @param universityId - Identifiant de l'université
 * @param studentId - Identifiant de l'étudiant
 * @returns Liste de notes, triée par date décroissante
 */
export async function lireNotesEtudiant(universityId: string, studentId: string): Promise<Grade[]> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const studentGradesRef = ref(database, `universities/${universityId}/grades_by_student/${studentId}`);
  const snapshot = await get(studentGradesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const grades: Grade[] = [];
  snapshot.forEach((childSnapshot) => {
    const grade = childSnapshot.val() as Grade;
    grades.push(grade);
  });

  // Trier par date de saisie décroissante
  return grades.sort((a, b) => b.dateSaisie - a.dateSaisie);
}

/**
 * Calcule la moyenne pondérée d'une matière.
 * 
 * Formule mathématique :
 *   Moyenne = Somme(note_i * coeff_i) / Somme(coeff_i)
 * 
 * @param notes - Liste des notes numériques
 * @param coefficients - Liste des coefficients correspondants
 * @throws Error si la somme des coefficients est nulle (évite la division par zéro)
 * @returns Moyenne pondérée arrondie à 2 décimales
 */
export function calculerMoyenneMatiere(notes: number[], coefficients: number[]): number {
  if (notes.length !== coefficients.length) {
    throw new Error(`Incohérence : le nombre de notes (${notes.length}) ne correspond pas au nombre de coefficients (${coefficients.length}).`);
  }
  
  const sommeCoeff = coefficients.reduce((sum, c) => sum + c, 0);
  if (sommeCoeff === 0) {
    throw new Error('Impossible de calculer la moyenne : somme des coefficients nulle.');
  }

  return calculerMoyenne(notes, coefficients);
}

/**
 * Calcule la moyenne générale d'un étudiant pour une année académique.
 * 
 * Formule mathématique :
 *   MGA = Somme(Moyenne_Matiere_j) / Nombre_de_Matieres
 * 
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @param anneeAcademique - Année académique cible (ex: "2024-2025")
 * @returns Moyenne générale, mention et statut d'admission
 */
export async function calculerMoyenneGenerale(
  universityId: string,
  studentId: string,
  anneeAcademique: string
): Promise<{ moyenneGenerale: number; mention: string; admis: boolean }> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const gradesRef = ref(database, `universities/${universityId}/grades`);
  const snapshot = await get(gradesRef);

  if (!snapshot.exists()) {
    return { moyenneGenerale: 0, mention: 'Aucune note', admis: false };
  }

  // Regrouper les notes par matière
  const notesParMatiere: Record<string, { notes: number[]; coeffs: number[] }> = {};

  snapshot.forEach((childSnapshot) => {
    const grade = childSnapshot.val() as Grade;
    if (grade.studentId === studentId && grade.anneeAcademique === anneeAcademique) {
      const mat = grade.matiereId;
      if (!notesParMatiere[mat]) {
        notesParMatiere[mat] = { notes: [], coeffs: [] };
      }
      notesParMatiere[mat].notes.push(grade.note);
      notesParMatiere[mat].coeffs.push(grade.coefficient);
    }
  });

  const matieresKeys = Object.keys(notesParMatiere);
  if (matieresKeys.length === 0) {
    return { moyenneGenerale: 0, mention: 'Aucune note', admis: false };
  }

  // Calculer la moyenne de chaque matière, puis faire la moyenne générale
  let sommeMoyennes = 0;
  const totalMatieres = matieresKeys.length;

  for (const mat of matieresKeys) {
    const { notes, coeffs } = notesParMatiere[mat];
    try {
      const moyenneMat = calculerMoyenneMatiere(notes, coeffs);
      sommeMoyennes += moyenneMat;
    } catch (error) {
      // Propage l'erreur si somme des coefficients nulle sur une matière
      throw new Error(`Erreur de calcul dans la matière "${mat}" pour l'étudiant "${studentId}" : ${(error as Error).message}`);
    }
  }

  const moyenneGenerale = Math.round((sommeMoyennes / totalMatieres) * 100) / 100;
  
  // Déterminer la mention et le statut d'admission
  let mention = 'Ajourné';
  let admis = false;

  if (moyenneGenerale >= 10) {
    admis = true;
    if (moyenneGenerale >= 16) mention = 'Très Bien';
    else if (moyenneGenerale >= 14) mention = 'Bien';
    else if (moyenneGenerale >= 12) mention = 'Assez Bien';
    else mention = 'Passable';
  }

  return { moyenneGenerale, mention, admis };
}

/**
 * Structure de bulletin générée.
 */
export interface BulletinResult {
  studentInfo: {
    matricule: string;
    nom: string;
    prenom: string;
    filiere: string;
    niveau: string;
  };
  anneeAcademique: string;
  matieres: Array<{
    matiere: string;
    coefficient: number;
    moyenne: number;
    notes: Array<{
      note: number;
      type: GradeType;
      semestre?: string;
    }>;
  }>;
  moyenneGenerale: number;
  mention: string;
  admis: boolean;
  dateEdition: number;
}

/**
 * Génère un bulletin complet pour un étudiant.
 * 
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @param anneeAcademique - Année académique concernée
 * @returns Structure complète du bulletin de l'étudiant
 */
export async function genererBulletin(
  universityId: string,
  studentId: string,
  anneeAcademique: string
): Promise<BulletinResult> {
  if (!universityId || !studentId || !anneeAcademique) {
    throw new Error('Paramètres requis manquants pour générer le bulletin.');
  }

  // 1. Lire les infos de l'étudiant
  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const studentSnap = await get(studentRef);
  
  if (!studentSnap.exists()) {
    throw new Error(`Étudiant ${studentId} introuvable.`);
  }
  const studentData = studentSnap.val();

  // 2. Charger les notes
  const gradesRef = ref(database, `universities/${universityId}/grades`);
  const gradesSnap = await get(gradesRef);

  const matieres: Record<string, { nom: string; notes: Array<{ note: number; type: GradeType; semestre?: string }>; coefficient: number }> = {};
  
  if (gradesSnap.exists()) {
    gradesSnap.forEach((childSnapshot) => {
      const grade = childSnapshot.val() as Grade;
      if (grade.studentId === studentId && grade.anneeAcademique === anneeAcademique) {
        const mat = grade.matiereId;
        if (!matieres[mat]) {
          matieres[mat] = {
            nom: mat,
            notes: [],
            coefficient: grade.coefficient || 1,
          };
        }
        matieres[mat].notes.push({
          note: grade.note,
          type: grade.type,
          semestre: grade.semestre || undefined, // Gestion résiliente si semestre absent
        });
      }
    });
  }

  // 3. Calculer les moyennes par matière
  const listeMatieres = Object.keys(matieres).map((key) => {
    const mat = matieres[key];
    const notesArray = mat.notes.map(n => n.note);
    const coeffsArray = Array(notesArray.length).fill(1); // Moyenne simple des notes de la matière
    
    let moyenneMatiere = 0;
    try {
      moyenneMatiere = calculerMoyenneMatiere(notesArray, coeffsArray);
    } catch (e) {
      // S'il y a des matières sans note valide ou coefficients nuls, on signale une erreur
      throw new Error(`Impossible de calculer la moyenne pour la matière "${mat.nom}" : ${(e as Error).message}`);
    }

    return {
      matiere: mat.nom,
      coefficient: mat.coefficient,
      moyenne: moyenneMatiere,
      notes: mat.notes,
    };
  });

  // 4. Calculer la moyenne générale
  const { moyenneGenerale, mention, admis } = await calculerMoyenneGenerale(universityId, studentId, anneeAcademique);

  return {
    studentInfo: {
      matricule: studentData.matricule || '',
      nom: studentData.nom || '',
      prenom: studentData.prenom || '',
      filiere: studentData.filiere || '',
      niveau: studentData.niveau || '',
    },
    anneeAcademique,
    matieres: listeMatieres,
    moyenneGenerale,
    mention,
    admis,
    dateEdition: Date.now(),
  };
}
