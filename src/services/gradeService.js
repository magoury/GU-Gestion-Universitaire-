// src/services/gradeService.js
// ──────────────────────────────────────────────────────────────
// Service de gestion des notes et bulletins.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ──────────────────────────────────────────────────────────────

import { ref, set, get, push, query, orderByChild, equalTo } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';
import { calculerMoyenne } from '../lib/utils.js';

/**
 * Saisit une note pour un étudiant.
 *
 * @param {string} universityId
 * @param {{ studentId: string, courseId: string, type: 'devoir'|'examen'|'projet'|'participation', valeur: number, commentaire?: string, anneeAcademique: string, teacherId?: string, coefficient?: number }} data
 * @returns {Promise<string>} — clé de la note créée
 */
async function saisirNote(universityId, data) {
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

  // Sécurité : Un enseignant ne peut saisir que pour lui-même
  // (On tolère l'écriture si l'acteur est un admin/superadmin via impersonnalisation)
  const userProfileSnap = await get(ref(database, `users/${acteurId}`));
  const userRole = userProfileSnap.exists() ? userProfileSnap.val().role : 'teacher';

  if (userRole !== 'super_admin_plateforme' && userRole !== 'admin_universite' && teacherId !== acteurId) {
    throw new Error('Non autorisé : Un enseignant ne peut saisir des notes que pour ses propres cours.');
  }

  // Récupérer le nom de l'enseignant
  let enseignantNom = 'Enseignant';
  if (teacherId === acteurId && userProfileSnap.exists()) {
    const prof = userProfileSnap.val();
    enseignantNom = `${prof.prenom} ${prof.nom}`;
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

  const gradeData = {
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
  };

  await set(newGradeRef, gradeData);

  // Format de log exigé : "Enseignant [nom] a saisi une note de [valeur]/20 pour [étudiant] en [matière] le [date]"
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
 * Calcule la moyenne pondérée d'une matière.
 *
 * @param {Array<number>} notes
 * @param {Array<number>} coefficients
 * @returns {number}
 */
function calculerMoyenneMatiere(notes, coefficients) {
  return calculerMoyenne(notes, coefficients);
}

/**
 * Calcule la moyenne générale d'un étudiant pour une année académique.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @param {string} anneeAcademique — ex: "2024-2025"
 * @returns {Promise<{ moyenneGenerale: number, mention: string, admis: boolean }>}
 */
async function calculerMoyenneGenerale(universityId, studentId, anneeAcademique) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const gradesRef = ref(database, `universities/${universityId}/grades`);
  const snapshot = await get(gradesRef);

  if (!snapshot.exists()) {
    return { moyenneGenerale: 0, mention: 'Aucune note', admis: false };
  }

  // Regrouper les notes par matière
  const notesParMatiere = {};

  snapshot.forEach((childSnapshot) => {
    const grade = childSnapshot.val();
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
  let totalMatieres = matieresKeys.length;

  matieresKeys.forEach((mat) => {
    const { notes, coeffs } = notesParMatiere[mat];
    const moyenneMat = calculerMoyenne(notes, coeffs);
    sommeMoyennes += moyenneMat;
  });

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
 * Génère un bulletin complet pour un étudiant.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @param {string} anneeAcademique
 * @returns {Promise<Object>} — bulletin structuré
 */
async function genererBulletin(universityId, studentId, anneeAcademique) {
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

  const matieres = {};
  
  if (gradesSnap.exists()) {
    gradesSnap.forEach((childSnapshot) => {
      const grade = childSnapshot.val();
      if (grade.studentId === studentId && grade.anneeAcademique === anneeAcademique) {
        const mat = grade.matiereId;
        if (!matieres[mat]) {
          matieres[mat] = {
            nom: mat,
            notes: [],
            coefficient: grade.coefficient || 1, // On prend le coefficient de la note ou par défaut 1
          };
        }
        matieres[mat].notes.push({
          note: grade.note,
          type: grade.type,
          semestre: grade.semestre
        });
      }
    });
  }

  // 3. Calculer les moyennes par matière
  const listeMatieres = Object.keys(matieres).map((key) => {
    const mat = matieres[key];
    const notesArray = mat.notes.map(n => n.note);
    const coeffsArray = Array(notesArray.length).fill(1); // Moyenne simple des devoirs de la matière
    const moyenneMatiere = calculerMoyenne(notesArray, coeffsArray);
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
      matricule: studentData.matricule,
      nom: studentData.nom,
      prenom: studentData.prenom,
      filiere: studentData.filiere,
      niveau: studentData.niveau,
    },
    anneeAcademique,
    matieres: listeMatieres,
    moyenneGenerale,
    mention,
    admis,
    dateEdition: Date.now(),
  };
}

export {
  saisirNote,
  calculerMoyenneMatiere,
  calculerMoyenneGenerale,
  genererBulletin,
};
