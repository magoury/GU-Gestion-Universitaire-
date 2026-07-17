// src/types/finance.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Paiements et gestion financière.
// Source : /universities/$universityId/payments/$paymentId
// Fidèle aux champs écrits par paymentService.js.
// ─────────────────────────────────────────────────────────────────────────────

// ── Mode de paiement ──────────────────────────────────────────────────────────

/**
 * Modes de paiement acceptés par la plateforme.
 * Source : paymentService.js (enregistrerPaiement).
 */
export type ModePaiement =
  | 'especes'
  | 'virement'
  | 'mobile_money'
  | 'cheque'
  | 'carte_bancaire'

// ── Statut financier ──────────────────────────────────────────────────────────

/**
 * Statut de la situation financière d'un étudiant.
 * Retourné par paymentService.verifierStatutFinancier().
 */
export type StatutFinancier = 'a_jour' | 'en_retard' | 'bloque'

// ── Paiement ──────────────────────────────────────────────────────────────────

/**
 * Enregistrement d'un paiement étudiant.
 * Stocké dans /universities/$universityId/payments/$paymentId.
 * Fidèle aux champs écrits par paymentService.js (enregistrerPaiement).
 */
export interface Payment {
  /** Clé unique générée par Firebase push() */
  id: string

  /** Référence vers l'étudiant ayant effectué le paiement */
  studentId: string

  /** Montant réglé (en devise locale) */
  montant: number

  /** Mode de règlement utilisé */
  modePaiement: ModePaiement

  /** Référence externe du paiement (virement, reçu mobile, etc.) */
  reference: string

  /** Description libre du paiement */
  description: string

  /** Numéro de reçu généré automatiquement */
  numeroRecu: string

  /** Timestamp du paiement (Date.now()) */
  timestamp: number
}

// ── Résumé financier (retourné par service, non persisté tel quel) ────────────

/**
 * Résumé de la situation financière d'un étudiant.
 * Retourné par paymentService.verifierStatutFinancier() — non stocké directement.
 */
export interface SituationFinanciere {
  /** Statut global de la situation */
  statut: StatutFinancier

  /** Montant restant à payer */
  montantRestant: number

  /** Date de la prochaine échéance non réglée (null si à jour) */
  prochainEcheance: string | null
}

// ── KPIs financiers plateforme (SuperAdmin) ───────────────────────────────────

/**
 * Données de revenus mensuels de la plateforme.
 * Stockées dans /saas_admin/revenue/mensuel/$mois.
 */
export interface RevenuMensuel {
  /** Label du mois (ex: 'Jan', 'Fév') */
  mois: string

  /** Montant encaissé ce mois (FCFA) */
  montant: number
}

/**
 * KPIs globaux de la plateforme SaaS.
 * Calculés par superAdminService.lireKPIsGlobaux().
 */
export interface KPIsGlobaux {
  /** Nombre total d'universités sur la plateforme */
  totalUniversites: number

  /** Nombre d'universités actuellement actives ou en essai */
  nbUniversitesActives: number

  /** Monthly Recurring Revenue total (FCFA) */
  mrr: number

  /** Nombre total d'étudiants sur la plateforme */
  nbTotalEtudiants: number

  /** Nombre d'alertes plateforme en cours */
  nbAlertes: number
}
