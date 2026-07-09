// src/services/rgpdService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service d'exportation et d'anonymisation de données personnelles (RGPD).
// Format JSON-LD avec standard schema.org/Person.
// Isolation multi-tenant et inter-étudiant stricte.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, get, update } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';
import type { Student, Grade, Enrollment, AuditLog } from '@/types';
import type { Payment } from '@/types/finance.types';

// ── Types internes pour l'export JSON-LD ─────────────────────────────────────

interface PostalAddressLD {
  '@type': 'PostalAddress';
  addressLocality: string;
  addressCountry: string;
}

interface EducationalOrganizationLD {
  '@type': 'EducationalOrganization';
  identifier: string;
  name: string;
}

interface EducationalOccupationalCredentialLD {
  '@type': 'EducationalOccupationalCredential';
  credentialCategory: string;
  educationalLevel: string;
  about: {
    '@type': 'Course';
    name: string;
    educationalCredentialAwarded: string;
  };
}

interface PayActionLD {
  '@type': 'PayAction';
  recipient: {
    '@type': 'EducationalOrganization';
    identifier: string;
  };
  price: number;
  priceCurrency: 'XOF';
  description: string;
}

interface StudentJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Person';
  identifier: string;
  name: string;
  email: string;
  birthDate: string;
  telephone: string;
  address: PostalAddressLD;
  memberOf: EducationalOrganizationLD;
  hasCredential: EducationalOccupationalCredentialLD[];
  potentialAction: PayActionLD[];
  customAcademicData: {
    filiere: string;
    niveau: string;
    statut: string;
    inscriptions: Record<string, Enrollment>;
    notificationsRecues: Array<{
      titre: string;
      message: string;
      type: string;
      date: string;
    }>;
    historiqueAudits: Array<{
      action: string;
      acteurNom: string;
      acteurRole: string;
      detail: string;
      date: string;
    }>;
    dateExport: string;
  };
}

// ── Gardes de sécurité non falsifiables ────────────────────────────────────────

/**
 * Vérifie si l'acteur connecté a le droit d'exporter les données de l'étudiant.
 * Autorisé si :
 *   - L'acteur est super_admin_plateforme.
 *   - L'acteur est admin_universite du même tenant (universityId).
 *   - L'acteur est l'étudiant lui-même (uid === studentId) et appartient au même tenant.
 */
async function verifierPermissionExport(universityId: string, studentId: string): Promise<{ acteurId: string; role: string; nom: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('[rgpdService] Non authentifié.');
  }

  const acteurId = currentUser.uid;
  const userSnap = await get(ref(database, `users/${acteurId}`));
  if (!userSnap.exists()) {
    throw new Error('[rgpdService] Profil de l\'utilisateur introuvable.');
  }

  const profil = userSnap.val();
  const role = profil.role || 'student';
  const nom = `${profil.prenom || ''} ${profil.nom || ''}`.trim() || 'Utilisateur';

  // 1. Super Admin de la plateforme
  if (role === 'super_admin_plateforme') {
    return { acteurId, role, nom };
  }

  // 2. Admin de l'université
  if (role === 'admin_universite') {
    if (profil.universityId !== universityId) {
      // Tentative de fuite de données inter-universités
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: nom,
        acteurRole: role,
        action: 'EXPORT_RGPD_REFUSE',
        cible: studentId,
        detail: `Tentative refusée d'exportation des données de l'étudiant ${studentId} par un administrateur d'un autre tenant (${profil.universityId}).`,
      });
      throw new Error('[rgpdService] Accès interdit : violation des frontières multi-tenant.');
    }
    return { acteurId, role, nom };
  }

  // 3. L'étudiant lui-même
  if (acteurId === studentId) {
    if (profil.universityId !== universityId) {
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: nom,
        acteurRole: role,
        action: 'EXPORT_RGPD_REFUSE',
        cible: studentId,
        detail: `Tentative d'accès refusée : l'étudiant appartient au tenant '${profil.universityId}' mais a demandé le tenant '${universityId}'.`,
      });
      throw new Error('[rgpdService] Accès interdit : incohérence de tenant.');
    }
    return { acteurId, role, nom: nom || 'Étudiant' };
  }

  // 4. Tout autre accès non autorisé (autre étudiant, parent, enseignant)
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: nom,
    acteurRole: role,
    action: 'EXPORT_RGPD_REFUSE',
    cible: studentId,
    detail: `Accès non autorisé : l'utilisateur ${acteurId} (rôle: ${role}) a tenté d'exporter les données de l'étudiant ${studentId}.`,
  });
  throw new Error('[rgpdService] Accès interdit : droits insuffisants pour exporter ces données.');
}

/**
 * Vérifie si l'acteur connecté a le droit de supprimer/anonymiser les données de l'étudiant.
 * Autorisé si :
 *   - L'acteur est super_admin_plateforme.
 *   - L'acteur est admin_universite du même tenant (universityId).
 */
async function verifierPermissionSuppression(universityId: string, studentId: string): Promise<{ acteurId: string; role: string; nom: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('[rgpdService] Non authentifié.');
  }

  const acteurId = currentUser.uid;
  const userSnap = await get(ref(database, `users/${acteurId}`));
  if (!userSnap.exists()) {
    throw new Error('[rgpdService] Profil de l\'utilisateur introuvable.');
  }

  const profil = userSnap.val();
  const role = profil.role || 'student';
  const nom = `${profil.prenom || ''} ${profil.nom || ''}`.trim() || 'Utilisateur';

  // 1. Super Admin de la plateforme
  if (role === 'super_admin_plateforme') {
    return { acteurId, role, nom };
  }

  // 2. Admin de l'université (du même tenant)
  if (role === 'admin_universite') {
    if (profil.universityId !== universityId) {
      await ecrireAuditLog(universityId, {
        acteurId,
        acteurNom: nom,
        acteurRole: role,
        action: 'ANONYMISATION_REFUSEE',
        cible: studentId,
        detail: `Tentative d'anonymisation refusée pour l'étudiant ${studentId} par un administrateur d'un autre tenant (${profil.universityId}).`,
      });
      throw new Error('[rgpdService] Accès interdit : violation des frontières multi-tenant.');
    }
    return { acteurId, role, nom };
  }

  // 3. Tout autre cas (y compris l'étudiant lui-même) -> Interdit d'auto-anonymisation en direct
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: nom,
    acteurRole: role,
    action: 'ANONYMISATION_REFUSEE',
    cible: studentId,
    detail: `Tentative non autorisée d'anonymisation de l'étudiant ${studentId} par l'utilisateur ${acteurId} (rôle: ${role}).`,
  });
  throw new Error('[rgpdService] Accès interdit : seule l\'administration peut anonymiser un dossier étudiant.');
}

// ── exporterDonneesEtudiant ──────────────────────────────────────────────────

/**
 * Exporte toutes les données personnelles d'un étudiant au format JSON-LD et déclenche le téléchargement.
 *
 * 🔐 Garde : Étudiant lui-même, admin du tenant ou super admin plateforme.
 *
 * @param universityId - Identifiant unique de l'université
 * @param studentId - Identifiant unique de l'étudiant
 */
export async function exporterDonneesEtudiant(universityId: string, studentId: string): Promise<void> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis pour exporter les données.');
  }

  // 🔐 Garde de sécurité non falsifiable
  const acteur = await verifierPermissionExport(universityId, studentId);

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
  const profil = studentSnap.val() as Student;
  const nomUniversite = configSnap.exists() ? (configSnap.val().nom as string) : "Université Locataire GU";

  // 2. Extraire et filtrer les notes (Object.entries pour injecter l'ID comme bonne pratique)
  const notes: Array<{
    id: string;
    matiere: string;
    type: string;
    note: number;
    coefficient: number;
    anneeAcademique: string;
    dateSaisie: string;
  }> = [];

  if (gradesSnap.exists()) {
    const gradesVal = gradesSnap.val() as Record<string, Omit<Grade, 'id'>>;
    Object.entries(gradesVal).forEach(([id, g]) => {
      if (g.studentId === studentId) {
        notes.push({
          id,
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

  // 3. Extraire et filtrer les paiements (Object.entries pour injecter l'ID)
  const paiements: Array<{
    id: string;
    recu: string;
    montant: number;
    mode: string;
    reference: string;
    description: string;
    date: string;
  }> = [];

  if (paymentsSnap.exists()) {
    const paymentsVal = paymentsSnap.val() as Record<string, Omit<Payment, 'id'>>;
    Object.entries(paymentsVal).forEach(([id, p]) => {
      if (p.studentId === studentId) {
        paiements.push({
          id,
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
  const inscriptions = (enrollSnap.exists() ? enrollSnap.val() : {}) as Record<string, Enrollment>;

  // 5. Notifications (Object.entries pour injecter l'ID)
  const notifications: Array<{
    id: string;
    titre: string;
    message: string;
    type: string;
    date: string;
  }> = [];

  if (notifsSnap.exists()) {
    const notifsVal = notifsSnap.val() as Record<string, any>;
    Object.entries(notifsVal).forEach(([id, n]) => {
      if (n.destinataireId === studentId || n.destinataireId === 'all' || n.destinataireId === 'students') {
        notifications.push({
          id,
          titre: n.titre,
          message: n.message,
          type: n.type,
          date: new Date(n.timestamp).toISOString(),
        });
      }
    });
  }

  // 6. Extraire et filtrer l'historique d'audit log (Object.entries pour injecter l'ID)
  const auditLogs: Array<{
    id: string;
    action: string;
    acteurNom: string;
    acteurRole: string;
    detail: string;
    date: string;
  }> = [];

  if (auditSnap.exists()) {
    const auditVal = auditSnap.val() as Record<string, Omit<AuditLog, 'id'>>;
    Object.entries(auditVal).forEach(([id, log]) => {
      if (log.acteurId === studentId || log.cible === studentId) {
        auditLogs.push({
          id,
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
  const jsonLd: StudentJsonLd = {
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

  // 9. Log d'audit de sécurité de succès
  await ecrireAuditLog(universityId, {
    acteurId: acteur.acteurId,
    acteurNom: acteur.nom,
    acteurRole: acteur.role,
    action: 'EXPORT_RGPD',
    cible: studentId,
    detail: `Export complet de conformité RGPD (JSON-LD Person) généré et téléchargé pour l'étudiant ${studentId} (Matricule: ${profil.matricule}).`,
  });
}

// ── supprimerDonneesEtudiant ──────────────────────────────────────────────────

/**
 * Anonymise les données d'un étudiant pour conformité RGPD Art. 17 (Droit à l'oubli).
 * Les données académiques et comptables sont conservées mais déconnectées de l'identité réelle.
 *
 * 🔐 Garde : Admin du tenant ou super admin plateforme uniquement.
 *
 * @param universityId - Identifiant unique de l'université
 * @param studentId - Identifiant unique de l'étudiant à anonymiser
 */
export async function supprimerDonneesEtudiant(universityId: string, studentId: string): Promise<void> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis pour anonymiser les données.');
  }

  // 🔐 Garde de sécurité non falsifiable
  const acteur = await verifierPermissionSuppression(universityId, studentId);

  // 1. Lire les infos de l'étudiant
  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const snap = await get(studentRef);
  if (!snap.exists()) {
    throw new Error(`Étudiant ${studentId} introuvable.`);
  }
  const student = snap.val() as Student;

  // 2. Anonymisation (Droit à l'oubli - Art. 17)
  await update(studentRef, {
    nom: 'Anonymisé',
    prenom: 'Anonymisé',
    email: 'anonymise@rgpd.local',
    telephone: 'Anonymisé',
    dateNaissance: 'Anonymisé',
    statut: 'exclu' as Student['statut']
  });

  // 3. Écrire le journal d'audit de succès
  await ecrireAuditLog(universityId, {
    acteurId: acteur.acteurId,
    acteurNom: acteur.nom,
    acteurRole: acteur.role,
    action: 'DONNEES_ANONYMISEES',
    cible: studentId,
    detail: `Anonymisation complète de l'étudiant (Matricule précédent: ${student.matricule || studentId}) effectuée suite à une demande de droit à l'oubli (RGPD Art. 17).`
  });
}

export default {
  exporterDonneesEtudiant,
  supprimerDonneesEtudiant
};
