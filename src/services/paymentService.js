// src/services/paymentService.js
// ──────────────────────────────────────────────────────────────
// Service de gestion financière / paiements.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ──────────────────────────────────────────────────────────────

import { ref, set, get, push, query, orderByChild, equalTo } from 'firebase/database';
import { database, auth } from '@fb';
import { genererNumeroRecu } from '../lib/utils.js';
import { ecrireAuditLog } from './auditService.js';

/**
 * Configure les frais de scolarité pour une filière.
 *
 * @param {string} universityId
 * @param {string} filiere — identifiant ou nom de la filière
 * @param {{ montantTotal: number, devise: string, echeances: Array<{ date: string, montant: number }>, anneeAcademique: string }} config
 * @returns {Promise<void>}
 */
async function configurerFraisScolarite(universityId, filiere, config) {
  if (!universityId || !filiere) {
    throw new Error('universityId et filiere requis.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const fraisRef = ref(database, `universities/${universityId}/frais/${filiere}`);
  
  await set(fraisRef, {
    filiere,
    montantTotal: Number(config.montantTotal),
    devise: config.devise || 'FCFA',
    echeances: config.echeances || [],
    anneeAcademique: config.anneeAcademique,
    dateDerniereConfig: Date.now(),
  });

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'FRAIS_CONFIGURES',
    cible: filiere,
    detail: `Configuration des frais scolaires pour la filière "${filiere}" : ${config.montantTotal} ${config.devise}.`,
  });
}

/**
 * Enregistre un paiement étudiant.
 *
 * @param {string} universityId
 * @param {{ studentId: string, montant: number, modePaiement: 'especes'|'virement'|'mobile_money'|'cheque', reference?: string, description?: string }} data
 * @returns {Promise<string>} — clé du paiement créé
 */
async function enregistrerPaiement(universityId, data) {
  if (!universityId) {
    throw new Error('universityId requis pour enregistrer un paiement.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  const paymentsRef = ref(database, `universities/${universityId}/payments`);
  const newPaymentRef = push(paymentsRef);
  const paymentId = newPaymentRef.key;

  const numeroRecu = genererNumeroRecu();

  const paymentData = {
    id: paymentId,
    studentId: data.studentId,
    montant: Number(data.montant),
    modePaiement: data.modePaiement || 'especes',
    reference: data.reference || '',
    description: data.description || '',
    numeroRecu,
    timestamp: Date.now(),
  };

  await set(newPaymentRef, paymentData);

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'PAIEMENT_ENREGISTRE',
    cible: data.studentId,
    detail: `Enregistrement du paiement ${numeroRecu} d'un montant de ${data.montant} pour l'étudiant ${data.studentId}.`,
  });

  return paymentId;
}

/**
 * Liste tous les paiements d'un étudiant.
 *
 * @param {string} universityId
 * @param {string} studentId
 * @returns {Promise<Array<Object>>}
 */
async function listerPaiementsEtudiant(universityId, studentId) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const paymentsRef = ref(database, `universities/${universityId}/payments`);
  const snapshot = await get(paymentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const payments = [];
  snapshot.forEach((childSnapshot) => {
    const payment = childSnapshot.val();
    if (payment.studentId === studentId) {
      payments.push(payment);
    }
  });

  // Trier par date décroissante
  payments.sort((a, b) => b.timestamp - a.timestamp);

  return payments;
}

/**
 * Vérifie le statut financier d'un étudiant (à jour / en retard / bloqué).
 *
 * @param {string} universityId
 * @param {string} studentId
 * @returns {Promise<{ statut: 'a_jour'|'en_retard'|'bloque', montantRestant: number, prochainEcheance: string|null }>}
 */
async function verifierStatutFinancier(universityId, studentId) {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  // 1. Lire les infos de l'étudiant pour connaître sa filière
  const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
  const studentSnap = await get(studentRef);
  
  if (!studentSnap.exists()) {
    return { statut: 'a_jour', montantRestant: 0, prochainEcheance: null };
  }
  const studentData = studentSnap.val();
  const filiere = studentData.filiere;

  // 2. Charger les frais configurés pour cette filière
  const fraisRef = ref(database, `universities/${universityId}/frais/${filiere}`);
  const fraisSnap = await get(fraisRef);

  if (!fraisSnap.exists()) {
    // Si aucun frais n'est configuré, l'élève est considéré "à jour" avec 0 restant
    return { statut: 'a_jour', montantRestant: 0, prochainEcheance: null };
  }
  const configFrais = fraisSnap.val();
  const montantTotalDu = configFrais.montantTotal;

  // 3. Charger tous les paiements effectués
  const paiements = await listerPaiementsEtudiant(universityId, studentId);
  const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);

  const montantRestant = Math.max(montantTotalDu - totalPaye, 0);

  if (montantRestant === 0) {
    return { statut: 'a_jour', montantRestant: 0, prochainEcheance: null };
  }

  // 4. Analyser les échéances
  const echeances = configFrais.echeances || [];
  const dateActuelle = new Date();
  
  let statut = 'a_jour';
  let prochainEcheance = null;
  let cumuleDu = 0;

  for (let i = 0; i < echeances.length; i++) {
    const echeance = echeances[i];
    const dateEcheance = new Date(echeance.date);
    cumuleDu += Number(echeance.montant);

    if (dateActuelle > dateEcheance) {
      // Si la date actuelle a dépassé l'échéance et que l'étudiant a payé moins que le cumul requis
      if (totalPaye < cumuleDu) {
        statut = 'en_retard';
        // Si le cumul est largement supérieur au paiement, on passe en bloqué (ex: retard de plus de 2 échéances ou retard important)
        if (cumuleDu - totalPaye > configFrais.montantTotal * 0.3) {
          statut = 'bloque';
        }
      }
    } else if (!prochainEcheance) {
      prochainEcheance = echeance.date;
    }
  }

  return { statut, montantRestant, prochainEcheance };
}

export {
  configurerFraisScolarite,
  enregistrerPaiement,
  listerPaiementsEtudiant,
  verifierStatutFinancier,
};
