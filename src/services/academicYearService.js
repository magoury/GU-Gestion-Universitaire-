// src/services/academicYearService.js
// ──────────────────────────────────────────────────────────────
// Service de clôture d'année académique.
// Isolation multi-tenant stricte : universityId requis.
// ──────────────────────────────────────────────────────────────

import { ref, get, set, update } from 'firebase/database';
import { database } from '@fb';
import { ecrireAuditLog } from './auditService.js';

/**
 * Incrémente une année académique (ex: "2024-2025" → "2025-2026").
 *
 * @param {string} annee - ex: "2024-2025"
 * @returns {string} - ex: "2025-2026"
 */
function incrementerAnnee(annee) {
  const parties = annee.split('-');
  if (parties.length !== 2) return annee;
  
  const anneeDebut = parseInt(parties[0]);
  const anneeFin = parseInt(parties[1]);
  
  if (isNaN(anneeDebut) || isNaN(anneeFin)) return annee;
  
  return `${anneeDebut + 1}-${anneeFin + 1}`;
}

/**
 * Vérifie les prérequis avant de clôturer une année académique.
 *
 * @param {string} universityId
 * @param {string} annee
 * @returns {Promise<{ peutCloturer: boolean, alertes: string[] }>}
 */
async function verifierPrealables(universityId, annee) {
  if (!universityId || !annee) {
    throw new Error('universityId et annee requis pour la vérification.');
  }

  const alertes = [];
  let peutCloturer = true;

  // 1. Vérifier si l'année est déjà clôturée
  const statutRef = ref(database, `universities/${universityId}/academic_years/${annee}/statut`);
  const statutSnap = await get(statutRef);
  if (statutSnap.exists() && statutSnap.val() === 'cloturee') {
    alertes.push(`L'année académique ${annee} est déjà clôturée.`);
    peutCloturer = false;
    return { peutCloturer, alertes };
  }

  // 2. Charger les matières configurées dans l'université
  const configSnap = await get(ref(database, `universities/${universityId}/config`));
  const matieresConfig = [];
  if (configSnap.exists()) {
    const config = configSnap.val();
    if (config.filieres) {
      Object.values(config.filieres).forEach((fil) => {
        if (fil.matieres) {
          Object.keys(fil.matieres).forEach((m) => {
            if (!matieresConfig.includes(m)) {
              matieresConfig.push(m);
            }
          });
        }
      });
    }
  }

  // Si aucune matière dans la config, utiliser les matières par défaut pour l'analyse
  const toutesMatieres = matieresConfig.length > 0 
    ? matieresConfig 
    : ['Algorithmique', 'Bases de données', 'Architecture Web', 'Java / OOP', 'Mathématiques', 'Réseaux', 'Sécurité', 'Anglais'];

  // 3. Charger toutes les notes de l'année
  const gradesSnap = await get(ref(database, `universities/${universityId}/grades`));
  const matieresAvecNotes = new Set();
  
  if (gradesSnap.exists()) {
    Object.values(gradesSnap.val()).forEach((g) => {
      if (g.anneeAcademique === annee) {
        const mat = g.courseId || g.matiereId;
        if (mat) matieresAvecNotes.add(mat);
      }
    });
  }

  // Détecter les matières sans note
  toutesMatieres.forEach((mat) => {
    if (!matieresAvecNotes.has(mat)) {
      alertes.push(`Matière sans note : "${mat}" n'a aucune note saisie pour l'année ${annee}.`);
    }
  });

  return { peutCloturer, alertes };
}

/**
 * Calcule les moyennes générales et décisions de fin d'année pour tous les élèves actifs.
 *
 * @param {string} universityId
 * @param {string} annee
 * @returns {Promise<Array<Object>>}
 */
async function calculerResultatsFinaux(universityId, annee) {
  if (!universityId || !annee) {
    throw new Error('universityId et annee requis.');
  }

  // 1. Lire tous les étudiants actifs
  const studentsSnap = await get(ref(database, `universities/${universityId}/students`));
  if (!studentsSnap.exists()) return [];

  const students = Object.values(studentsSnap.val()).filter(s => s.statut === 'actif');

  // 2. Lire toutes les notes
  const gradesSnap = await get(ref(database, `universities/${universityId}/grades`));
  const allGrades = gradesSnap.exists() ? Object.values(gradesSnap.val()) : [];

  const resultats = [];

  students.forEach((student) => {
    // Filtrer les notes pour cet étudiant et cette année
    const myGrades = allGrades.filter(
      (g) => g.studentId === student.id && g.anneeAcademique === annee
    );

    if (myGrades.length === 0) {
      resultats.push({
        studentId: student.id,
        matricule: student.matricule,
        nom: student.nom,
        prenom: student.prenom,
        filiere: student.filiere,
        niveau: student.niveau,
        mga: 0,
        mention: 'Aucune note',
        admis: false
      });
      return;
    }

    // Regrouper par cours pour moyenne pondérée
    const courses = {};
    myGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courses[mat]) {
        courses[mat] = { devoir: [], examen: [], projet: [], participation: [] };
      }
      if (courses[mat][g.type]) {
        courses[mat][g.type].push(g.note);
      }
    });

    const coursesList = Object.keys(courses).map((key) => {
      const c = courses[key];
      const devAvg = c.devoir.length > 0 ? c.devoir.reduce((a, b) => a + b, 0) / c.devoir.length : null;
      const exAvg = c.examen.length > 0 ? c.examen.reduce((a, b) => a + b, 0) / c.examen.length : null;
      const projAvg = c.projet.length > 0 ? c.projet.reduce((a, b) => a + b, 0) / c.projet.length : null;
      const partAvg = c.participation.length > 0 ? c.participation.reduce((a, b) => a + b, 0) / c.participation.length : null;

      let notesCum = 0;
      let coeffsCum = 0;
      if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0; }
      if (exAvg !== null) { notesCum += exAvg * 2.0; coeffsCum += 2.0; }
      if (projAvg !== null) { notesCum += projAvg * 1.5; coeffsCum += 1.5; }
      if (partAvg !== null) { notesCum += partAvg * 0.5; coeffsCum += 0.5; }

      const moyenne = coeffsCum > 0 ? notesCum / coeffsCum : 0;
      return moyenne;
    });

    const sum = coursesList.reduce((acc, val) => acc + val, 0);
    const mgaRaw = coursesList.length > 0 ? sum / coursesList.length : 0;
    const mga = Number(mgaRaw.toFixed(2));

    let mention = 'Ajourné';
    let admis = false;
    if (mgaRaw >= 10) {
      admis = true;
      if (mgaRaw >= 16) mention = 'Très Bien';
      else if (mgaRaw >= 14) mention = 'Bien';
      else if (mgaRaw >= 12) mention = 'Assez Bien';
      else mention = 'Passable';
    }

    resultats.push({
      studentId: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      filiere: student.filiere,
      niveau: student.niveau,
      mga,
      mention,
      admis
    });
  });

  return resultats;
}

/**
 * Processus batch de clôture annuelle académique.
 *
 * @param {string} universityId
 * @param {string} annee
 * @returns {Promise<Object>}
 */
async function cloturerAnneeAcademique(universityId, annee) {
  if (!universityId || !annee) {
    throw new Error('universityId et annee requis pour la clôture.');
  }

  // ÉTAPE 1 — Vérification préalable
  const prealables = await verifierPrealables(universityId, annee);
  if (!prealables.peutCloturer) {
    throw new Error(`Clôture impossible : ${prealables.alertes.join(' | ')}`);
  }

  // ÉTAPE 2 — Calcul résultats finaux
  const resultats = await calculerResultatsFinaux(universityId, annee);
  
  // Sauvegarde des résultats
  await set(ref(database, `universities/${universityId}/academic_years/${annee}/resultats`), resultats);

  // ÉTAPE 3 — Gel des données & Archives
  await update(ref(database, `universities/${universityId}/academic_years/${annee}`), {
    statut: 'cloturee',
    dateCloture: Date.now()
  });

  // Copie de toutes les notes existantes vers l'archive de cette année
  const gradesSnap = await get(ref(database, `universities/${universityId}/grades`));
  if (gradesSnap.exists()) {
    const gradesVal = gradesSnap.val();
    await set(ref(database, `universities/${universityId}/academic_years/${annee}/grades_archive`), gradesVal);
  }

  const transitionsNiveau = {
    'L1': 'L2',
    'L2': 'L3',
    'L3': 'diplome',
    'M1': 'M2',
    'M2': 'diplome'
  };

  let admisCount = 0;
  let ajournesCount = 0;
  let diplomesCount = 0;
  const erreurs = [];

  const nouvelleAnnee = incrementerAnnee(annee);

  // Traiter chaque étudiant
  for (const res of resultats) {
    try {
      const studentRef = ref(database, `universities/${universityId}/students/${res.studentId}`);
      const studentSnap = await get(studentRef);

      if (!studentSnap.exists()) continue;
      const studentData = studentSnap.val();

      if (res.admis) {
        admisCount++;
        const ancienNiveau = studentData.niveau;
        const nouveauNiveau = transitionsNiveau[ancienNiveau];

        // Mettre à jour historique de niveaux
        const historique = studentData.historiqueNiveaux || [];
        historique.push({
          annee,
          niveau: ancienNiveau,
          mga: res.mga,
          decision: 'admis'
        });

        if (nouveauNiveau === 'diplome') {
          // ÉTAPE 4 — Diplômé
          diplomesCount++;
          await update(studentRef, {
            niveau: 'diplome',
            statut: 'diplome',
            historiqueNiveaux: historique
          });

          await ecrireAuditLog(universityId, {
            acteurId: 'system',
            acteurNom: 'Automate Académique',
            acteurRole: 'system',
            action: 'ETUDIANT_STATUT_CHANGE',
            cible: res.studentId,
            detail: `Étudiant ${res.prenom} ${res.nom} diplômé avec succès après MGA de ${res.mga}/20.`
          });
        } else {
          // ÉTAPE 4 — Progression de niveau
          await update(studentRef, {
            niveau: nouveauNiveau,
            historiqueNiveaux: historique
          });

          await ecrireAuditLog(universityId, {
            acteurId: 'system',
            acteurNom: 'Automate Académique',
            acteurRole: 'system',
            action: 'ETUDIANT_MODIFIE',
            cible: res.studentId,
            detail: `Étudiant ${res.prenom} ${res.nom} promu au niveau ${nouveauNiveau} (précédent : ${ancienNiveau}).`
          });

          // ÉTAPE 5 — Réinscription automatique
          const enrollRef = ref(database, `universities/${universityId}/enrollments/${res.studentId}/${nouvelleAnnee}`);
          await set(enrollRef, {
            anneeAcademique: nouvelleAnnee,
            dateInscription: Date.now(),
            niveau: nouveauNiveau,
            statut: 'valide'
          });
        }
      } else {
        // Ajourné (redouble ou reste au même niveau)
        ajournesCount++;
        const ancienNiveau = studentData.niveau;
        const historique = studentData.historiqueNiveaux || [];
        
        historique.push({
          annee,
          niveau: ancienNiveau,
          mga: res.mga,
          decision: 'ajourne'
        });

        await update(studentRef, {
          historiqueNiveaux: historique
        });

        await ecrireAuditLog(universityId, {
          acteurId: 'system',
          acteurNom: 'Automate Académique',
          acteurRole: 'system',
          action: 'ETUDIANT_MODIFIE',
          cible: res.studentId,
          detail: `Étudiant ${res.prenom} ${res.nom} ajourné (redouble ${ancienNiveau}) avec MGA de ${res.mga}/20.`
        });

        // Réinscription automatique au même niveau
        const enrollRef = ref(database, `universities/${universityId}/enrollments/${res.studentId}/${nouvelleAnnee}`);
        await set(enrollRef, {
          anneeAcademique: nouvelleAnnee,
          dateInscription: Date.now(),
          niveau: ancienNiveau,
          statut: 'valide'
        });
      }
    } catch (err) {
      console.error(`Erreur sur l'étudiant ${res.studentId}:`, err);
      erreurs.push(`Échec progression étudiant ${res.studentId} : ${err.message}`);
    }
  }

  // ÉTAPE 6 — Rapport et audit global
  const detailBilan = `Clôture de l'année ${annee} effectuée. Bilan : ${admisCount} admis, ${ajournesCount} ajournés, ${diplomesCount} diplômés.`;
  await ecrireAuditLog(universityId, {
    acteurId: 'system',
    acteurNom: 'Automate Académique',
    acteurRole: 'system',
    action: 'ANNEE_CLOTUREE',
    cible: annee,
    detail: detailBilan
  });

  return {
    admis: admisCount,
    ajournes: ajournesCount,
    diplomes: diplomesCount,
    erreurs
  };
}

export {
  verifierPrealables,
  calculerResultatsFinaux,
  cloturerAnneeAcademique,
  incrementerAnnee
};
export default {
  verifierPrealables,
  calculerResultatsFinaux,
  cloturerAnneeAcademique,
  incrementerAnnee
};
