// src/services/rgpdService.js
// ──────────────────────────────────────────────────────────────
// Service d'exportation de données personnelles conformes RGPD.
// Format JSON-LD avec standard schema.org.
// Isolation multi-tenant stricte : universityId requis.
// ──────────────────────────────────────────────────────────────

import { ref, get, update } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';

/**
 * Exporte toutes les données personnelles d'un étudiant au format JSON-LD et déclenche le téléchargement.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
async function exporterDonneesEtudiant(universityId, studentId) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis pour exporter les données.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  // 1. Récupération en parallèle pour conformité RGPD & performances optimales
  const [studentSnap, gradesSnap, paymentsSnap, enrollSnap, notifsSnap, auditSnap, configSnap] = await Promise.all([
    get(ref(database, `universities/${universityId}/students/${studentId}`)),
    get(ref(database, `universities/${universityId}/grades`)),
    get(ref(database, `universities/${universityId}/payments`)),
    get(ref(database, `universities/${universityId}/enrollments/${studentId}`)),
    get(ref(database, `universities/${universityId}/notifications`)),
    get(ref(database, `universities/${universityId}/audit_logs`)),
    get(ref(database, `universities/${universityId}/config`))
  ]);

  if (!studentSnap.exists()) {
    throw new Error(`Étudiant ${studentId} introuvable.`);
  }
  const profil = studentSnap.val();
  const nomUniversite = configSnap.exists() ? configSnap.val().nom : "Université Locataire GU";

  // 2. Extraire et filtrer les notes
  const notes = [];
  if (gradesSnap.exists()) {
    Object.values(gradesSnap.val()).forEach((g) => {
      if (g.studentId === studentId) {
        notes.push({
          matiere: g.courseId || g.matiereId,
          type: g.type,
          note: g.note,
          coefficient: g.coefficient || 1,
          anneeAcademique: g.anneeAcademique,
          dateSaisie: new Date(g.dateSaisie).toISOString(),
        });
      }
    });
  }

  // 3. Extraire et filtrer les paiements
  const paiements = [];
  if (paymentsSnap.exists()) {
    Object.values(paymentsSnap.val()).forEach((p) => {
      if (p.studentId === studentId) {
        paiements.push({
          recu: p.numeroRecu,
          montant: p.montant,
          mode: p.modePaiement,
          reference: p.reference || '',
          description: p.description || '',
          date: new Date(p.timestamp).toISOString(),
        });
      }
    });
  }

  // 4. Inscriptions
  const inscriptions = enrollSnap.exists() ? enrollSnap.val() : {};

  // 5. Notifications
  const notifications = [];
  if (notifsSnap.exists()) {
    Object.values(notifsSnap.val()).forEach((n) => {
      if (n.destinataireId === studentId || n.destinataireId === 'all' || n.destinataireId === 'students') {
        notifications.push({
          titre: n.titre,
          message: n.message,
          type: n.type,
          date: new Date(n.timestamp).toISOString(),
        });
      }
    });
  }

  // 6. Extraire et filtrer l'historique d'audit log
  const auditLogs = [];
  if (auditSnap.exists()) {
    Object.values(auditSnap.val()).forEach((log) => {
      if (log.acteurId === studentId || log.cible === studentId) {
        auditLogs.push({
          action: log.action,
          acteurNom: log.acteurNom,
          acteurRole: log.acteurRole,
          detail: log.detail,
          date: new Date(log.timestamp).toISOString()
        });
      }
    });
  }

  // 7. Formater au standard JSON-LD schema.org/Person
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "identifier": profil.matricule,
    "name": `${profil.nom} ${profil.prenom}`,
    "email": profil.email,
    "birthDate": profil.dateNaissance || '',
    "telephone": profil.telephone || '',
    "address": {
      "@type": "PostalAddress",
      "addressLocality": profil.ville || '',
      "addressCountry": profil.pays || 'Côte d\'Ivoire'
    },
    "memberOf": {
      "@type": "EducationalOrganization",
      "identifier": universityId,
      "name": nomUniversite
    },
    "hasCredential": notes.map((n) => ({
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": n.type,
      "educationalLevel": profil.niveau,
      "about": {
        "@type": "Course",
        "name": n.matiere,
        "educationalCredentialAwarded": `${n.note}/20`
      }
    })),
    "potentialAction": paiements.map((p) => ({
      "@type": "PayAction",
      "recipient": {
        "@type": "EducationalOrganization",
        "identifier": universityId
      },
      "price": p.montant,
      "priceCurrency": "XOF",
      "description": `Paiement reçu ${p.recu} via ${p.mode}`
    })),
    "customAcademicData": {
      "filiere": profil.filiere,
      "niveau": profil.niveau,
      "statut": profil.statut,
      "inscriptions": inscriptions,
      "notificationsRecues": notifications,
      "historiqueAudits": auditLogs,
      "dateExport": new Date().toISOString()
    }
  };

  // 8. Déclencher le téléchargement du fichier JSON
  const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: 'application/ld+json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `export-rgpd-${profil.matricule || studentId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // 9. Log d'audit de sécurité
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: acteurId === studentId ? `${profil.prenom} ${profil.nom}` : 'Administrateur',
    acteurRole: acteurId === studentId ? 'student' : 'admin_universite',
    action: 'EXPORT_RGPD',
    cible: studentId,
    detail: `Export complet de conformité RGPD (JSON-LD Person) demandé et généré.`,
  });
}

/**
 * Anonymise les données d'un étudiant pour conformité RGPD Art. 17 (Droit à l'oubli).
 * Les données académiques et comptables sont conservées.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
async function supprimerDonneesEtudiant(universityId, studentId) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis pour anonymiser les données.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  // 1. Lire les infos de l'étudiant pour le journal d'audit
  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const snap = await get(studentRef);
  if (!snap.exists()) {
    throw new Error(`Étudiant ${studentId} introuvable.`);
  }
  const student = snap.val();

  // 2. Anonymisation (Droit à l'oubli)
  await update(studentRef, {
    nom: 'Anonymisé',
    prenom: 'Anonymisé',
    email: 'anonymise@rgpd.local',
    telephone: 'Anonymisé',
    dateNaissance: 'Anonymisé',
    statut: 'exclu'
  });

  // 3. Écrire le journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'DONNEES_ANONYMISEES',
    cible: studentId,
    detail: `Anonymisation complète de l'étudiant (Matricule: ${student.matricule || studentId}) suite à une demande de droit à l'oubli (RGPD Art. 17).`
  });
}

export {
  exporterDonneesEtudiant,
  supprimerDonneesEtudiant
};
export default {
  exporterDonneesEtudiant,
  supprimerDonneesEtudiant
};
