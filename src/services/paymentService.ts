// src/services/paymentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion financière et paiements — version TypeScript.
// Isolation multi-tenant : universityId requis sur chaque opération.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, set, get, push } from 'firebase/database';
import { database, auth } from '@fb';
import { ecrireAuditLog } from './auditService.js';
import type { Payment, FraisConfig, ModePaiement } from '@/types';

/**
 * Paramètres pour l'enregistrement d'un paiement.
 */
export interface EnregistrerPaiementParams {
  studentId: string;
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  description?: string;
  devise?: string;
}

/**
 * Génère un numéro de reçu de paiement sécurisé (format : REC-{année}-{8 chiffres}).
 * L'utilisation de 8 chiffres aléatoires réduit drastiquement les risques de collisions.
 */
function genererNumeroRecuSecurise(): string {
  const annee = new Date().getFullYear();
  const aleatoire = Math.floor(10000000 + Math.random() * 90000000); // 8 chiffres
  return `REC-${annee}-${aleatoire}`;
}

/**
 * Vérifie l'unicité d'un numéro de reçu dans les paiements du tenant de l'université.
 */
async function verifierRecuUnique(universityId: string, numeroRecu: string): Promise<boolean> {
  const paymentsRef = ref(database, `universities/${universityId}/payments`);
  const snapshot = await get(paymentsRef);
  if (!snapshot.exists()) return true;

  let unique = true;
  snapshot.forEach((childSnapshot) => {
    const payment = childSnapshot.val() as Payment;
    if (payment.numeroRecu === numeroRecu) {
      unique = false;
    }
  });
  return unique;
}

/**
 * Configure les frais de scolarité pour une filière donnée.
 * 
 * Sécurité : Réservée aux administrateurs. Contrôle du rôle de l'acteur.
 * Validation : Le montant total doit être strictement positif.
 *
 * @param universityId - Identifiant unique de l'université
 * @param filiere - Identifiant ou nom de la filière
 * @param config - Configuration des frais et des échéances
 */
export async function configurerFraisScolarite(
  universityId: string,
  filiere: string,
  config: { montantTotal: number; devise: string; echeances: Array<{ date: string; montant: number }>; anneeAcademique: string }
): Promise<void> {
  if (!universityId || !filiere) {
    throw new Error('universityId et filiere requis.');
  }

  const configMontant = Number(config.montantTotal);
  if (isNaN(configMontant) || configMontant <= 0) {
    throw new Error('Le montant total configuré doit être un nombre strictement supérieur à 0.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  // Récupérer le rôle de l'acteur
  const userProfileSnap = await get(ref(database, `users/${acteurId}`));
  const userProfile = userProfileSnap.exists() ? userProfileSnap.val() : null;
  const userRole = userProfile ? userProfile.role : 'teacher';

  if (userRole !== 'super_admin_plateforme' && userRole !== 'admin_universite') {
    const errorMsg = 'Non autorisé : Seul un administrateur de l\'université peut configurer les frais de scolarité.';
    await ecrireAuditLog(universityId, {
      acteurId,
      acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Utilisateur inconnu',
      acteurRole: userRole,
      action: 'CONFIG_FRAIS_REFUSEE',
      cible: filiere,
      detail: `Tentative non autorisée de configuration des frais pour la filière "${filiere}" par ${acteurId}.`,
    });
    throw new Error(errorMsg);
  }

  const fraisRef = ref(database, `universities/${universityId}/frais/${filiere}`);
  
  await set(fraisRef, {
    filiere,
    montantTotal: configMontant,
    devise: config.devise || 'FCFA',
    echeances: config.echeances || [],
    anneeAcademique: config.anneeAcademique,
    dateDerniereConfig: Date.now(),
  });

  // Journal d'audit
  await ecrireAuditLog(universityId, {
    acteurId,
    acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'FRAIS_CONFIGURES',
    cible: filiere,
    detail: `Configuration des frais scolaires pour la filière "${filiere}" : ${configMontant} ${config.devise}.`,
  });
}

/**
 * Enregistre un paiement étudiant.
 * 
 * Sécurité (Point 1) : Réservée aux administrateurs. Contrôle du rôle de l'acteur.
 * Cohérence Devise (Point 2) : Rejette l'enregistrement si la devise spécifiée ne correspond pas à celle de la filière.
 * Validation : Le montant du paiement doit être strictement positif.
 * Génération reçu (Point 3) : Reçu sur 8 chiffres avec détection d'unicité (5 essais maximum).
 *
 * @param universityId - Identifiant unique de l'université
 * @param data - Informations du paiement
 * @returns L'identifiant unique du paiement enregistré
 */
export async function enregistrerPaiement(universityId: string, data: EnregistrerPaiementParams): Promise<string> {
  if (!universityId) {
    throw new Error('universityId requis pour enregistrer un paiement.');
  }

  const paiementMontant = Number(data.montant);
  if (isNaN(paiementMontant) || paiementMontant <= 0) {
    throw new Error('Le montant du paiement doit être un nombre strictement supérieur à 0.');
  }

  const currentUser = auth.currentUser;
  const acteurId = currentUser?.uid || 'system';

  // Récupérer le rôle de l'acteur
  const userProfileSnap = await get(ref(database, `users/${acteurId}`));
  const userProfile = userProfileSnap.exists() ? userProfileSnap.val() : null;
  const userRole = userProfile ? userProfile.role : 'teacher';

  // 1. Contrôle des permissions
  if (userRole !== 'super_admin_plateforme' && userRole !== 'admin_universite') {
    const errorMsg = 'Non autorisé : Seul un administrateur peut enregistrer des paiements.';
    await ecrireAuditLog(universityId, {
      acteurId,
      acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Utilisateur inconnu',
      acteurRole: userRole,
      action: 'PAIEMENT_REFUSE',
      cible: data.studentId,
      detail: `Tentative non autorisée d'enregistrement de paiement par ${acteurId} pour l'étudiant ${data.studentId}.`,
    });
    throw new Error(errorMsg);
  }

  // 2. Vérification de la cohérence de la devise de la filière de l'étudiant
  const studentRef = ref(database, `universities/${universityId}/students/${data.studentId}`);
  const studentSnap = await get(studentRef);
  if (!studentSnap.exists()) {
    throw new Error(`Étudiant ${data.studentId} introuvable.`);
  }
  const studentData = studentSnap.val();
  const filiere = studentData.filiere;

  const fraisRef = ref(database, `universities/${universityId}/frais/${filiere}`);
  const fraisSnap = await get(fraisRef);
  if (!fraisSnap.exists()) {
    throw new Error(`Aucun frais de scolarité n'est configuré pour la filière "${filiere}". Veuillez configurer les frais avant d'enregistrer un paiement.`);
  }
  const configFrais = fraisSnap.val() as FraisConfig;

  if (data.devise && data.devise !== configFrais.devise) {
    throw new Error(`Devise du paiement incohérente avec la filière de l'étudiant (fournie: ${data.devise}, attendue: ${configFrais.devise}).`);
  }

  const paymentsRef = ref(database, `universities/${universityId}/payments`);
  const newPaymentRef = push(paymentsRef);
  const paymentId = newPaymentRef.key;
  if (!paymentId) {
    throw new Error('Impossible de générer une clé unique pour le paiement.');
  }

  // 3. Boucle de génération d'un numéro de reçu unique (max 5 tentatives)
  let numeroRecu = '';
  let unique = false;
  for (let i = 0; i < 5; i++) {
    numeroRecu = genererNumeroRecuSecurise();
    if (await verifierRecuUnique(universityId, numeroRecu)) {
      unique = true;
      break;
    }
  }

  if (!unique) {
    throw new Error('Impossible de générer un numéro de reçu unique après 5 tentatives.');
  }

  const paymentData: Payment = {
    id: paymentId,
    studentId: data.studentId,
    montant: paiementMontant,
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
    acteurNom: userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'PAIEMENT_REGISTRE', // ⚠️ Typo de PAIEMENT_ENREGISTRE — à corriger dans une migration future
    cible: data.studentId,
    detail: `Enregistrement du paiement ${numeroRecu} d'un montant de ${paiementMontant} pour l'étudiant ${data.studentId}.`,
  });

  return paymentId;
}

/**
 * Liste tous les paiements d'un étudiant.
 *
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @returns Liste ordonnée de manière décroissante par date
 */
export async function listerPaiementsEtudiant(universityId: string, studentId: string): Promise<Payment[]> {
  if (!universityId || !studentId) {
    throw new Error('universityId et studentId requis.');
  }

  const paymentsRef = ref(database, `universities/${universityId}/payments`);
  const snapshot = await get(paymentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const payments: Payment[] = [];
  snapshot.forEach((childSnapshot) => {
    const payment = childSnapshot.val() as Payment;
    if (payment.studentId === studentId) {
      payments.push(payment);
    }
  });

  // Trier par date décroissante
  payments.sort((a, b) => b.timestamp - a.timestamp);

  return payments;
}

/**
 * Vérifie le statut financier d'un étudiant.
 * 
 * Logique financière (solde restant) :
 *   Solde_restant = Frais_Filière - Somme(Paiements_Étudiant)
 *
 * @param universityId - Identifiant de l'université
 * @param studentId - Matricule de l'étudiant
 * @returns Statut financier (a_jour, en_retard, bloque), montant restant et prochaine échéance
 */
export async function verifierStatutFinancier(
  universityId: string,
  studentId: string
): Promise<{ statut: 'a_jour' | 'en_retard' | 'bloque'; montantRestant: number; prochainEcheance: string | null }> {
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
    return { statut: 'a_jour', montantRestant: 0, prochainEcheance: null };
  }
  const configFrais = fraisSnap.val() as FraisConfig;
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
  
  let statut: 'a_jour' | 'en_retard' | 'bloque' = 'a_jour';
  let prochainEcheance: string | null = null;
  let cumuleDu = 0;

  for (let i = 0; i < echeances.length; i++) {
    const echeance = echeances[i];
    const dateEcheance = new Date(echeance.date);
    cumuleDu += Number(echeance.montant);

    if (dateActuelle > dateEcheance) {
      if (totalPaye < cumuleDu) {
        statut = 'en_retard';
        // Passage en bloqué si le retard est supérieur à 30% du montant total configuré
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
