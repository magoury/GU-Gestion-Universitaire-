// src/types/university.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Universités et configuration.
// Sources :
//   - /universities/$universityId/config  → UniversityConfig
//   - /saas_admin/universites/$id         → SaasUniversite
//   - /universities/$universityId/frais/  → FraisConfig
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums plan & statut ───────────────────────────────────────────────────────

/** Plan tarifaire de l'université sur la plateforme SaaS */
export type UniversityPlan = 'Starter' | 'Standard' | 'Premium' | 'Enterprise'

/** Statut de l'université sur la plateforme */
export type UniversityStatus = 'actif' | 'suspendu' | 'essai' | 'expire'

// ── Config université (nœud /universities/$id/config) ────────────────────────

/**
 * Matière dans une filière.
 * Structure découverte dans academicYearService.js.
 */
export interface Matiere {
  /** Identifiant/nom de la matière */
  id: string
  /** Intitulé affiché */
  nom?: string
  /** Coefficient de la matière */
  coefficient?: number
}

/**
 * Filière académique telle que configurée dans l'université.
 */
export interface Filiere {
  /** Identifiant de la filière */
  id: string
  /** Nom affiché */
  nom?: string
  /** Dictionnaire des matières : key = id matière */
  matieres?: Record<string, Matiere>
}

/**
 * Configuration d'une université, stockée dans /universities/$universityId/config.
 * Fidèle aux champs écrits dans LoginPage.jsx et lus dans TenantContext.jsx.
 */
export interface UniversityConfig {
  /** Nom complet de l'université */
  nom: string

  /** Identifiant URL-safe (= universityId) */
  slug: string

  /** Timestamp de création (Date.now()) */
  dateCreation: number

  /** Devise par défaut (ex: 'FCFA') */
  devise: string

  /** Indique si l'université est active sur la plateforme */
  actif: boolean

  /** Dictionnaire des filières configurées [NOUVEAU si manquant] */
  filieres?: Record<string, Filiere>

  /** Année académique courante [NOUVEAU] */
  anneeAcademiqueActive?: string

  /** Logo de l'université [NOUVEAU] */
  logo?: string | null
}

// ── SaaS Universite (nœud /saas_admin/universites/$id) ───────────────────────

/**
 * Entrée dans la liste publique des universités de la plateforme.
 * Stockée dans /saas_admin/universites/$universityId.
 * Fidèle aux champs lus/écrits dans superAdminService.js et LoginPage.jsx.
 */
export interface SaasUniversite {
  /** Identifiant unique de l'université (= universityId) */
  id: string

  /** Nom complet de l'université */
  nom: string

  /** Identifiant URL-safe */
  slug: string

  /** Ville du siège */
  ville: string

  /** Pays (ex: 'Côte d\'Ivoire') */
  pays: string

  /** URL du logo (null si non défini) */
  logo: string | null

  /** Plan tarifaire actif */
  plan: UniversityPlan | string

  /** Statut de l'université sur la plateforme */
  statut: UniversityStatus | string

  /** Nombre d'étudiants inscrits */
  nbEtudiants: number

  /** Timestamp d'expiration de la licence (Date.now() + durée) */
  dateExpiration: number

  /** Monthly Recurring Revenue (FCFA) */
  mrr: number
}

// ── Frais de scolarité (/universities/$id/frais/$filiere) ─────────────────────

/**
 * Échéance de paiement dans un plan de scolarité.
 */
export interface Echeance {
  /** Date de l'échéance (format string ISO ou 'YYYY-MM-DD') */
  date: string

  /** Montant attendu à cette échéance */
  montant: number
}

/**
 * Configuration des frais de scolarité pour une filière.
 * Stockée dans /universities/$universityId/frais/$filiere.
 * Fidèle aux champs écrits dans paymentService.js.
 */
export interface FraisConfig {
  /** Identifiant de la filière */
  filiere: string

  /** Montant total annuel de scolarité */
  montantTotal: number

  /** Devise (ex: 'FCFA') */
  devise: string

  /** Liste des échéances planifiées */
  echeances: Echeance[]

  /** Année académique concernée (ex: '2024-2025') */
  anneeAcademique: string

  /** Timestamp de la dernière mise à jour */
  dateDerniereConfig: number
}
