// src/types/user.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Utilisateurs et rôles.
// Source de vérité : /users/$uid dans Firebase Realtime Database.
// Champs fidèles au runtime — aucun champ inventé sans annotation [NOUVEAU].
// ─────────────────────────────────────────────────────────────────────────────

// ── Rôles ────────────────────────────────────────────────────────────────────

/**
 * Union exhaustive des rôles de la plateforme GU.
 * - super_admin_plateforme : accès global, pas de tenant
 * - admin_universite : gère son université
 * - teacher : enseignant du tenant
 * - student : étudiant du tenant
 * - parent : parent/tuteur lié à un ou plusieurs étudiants
 */
export type Role =
  | 'super_admin_plateforme'
  | 'admin_universite'
  | 'teacher'
  | 'student'
  | 'parent'

/** Rôles appartenant à un tenant (universityId requis) */
export type TenantRole = Exclude<Role, 'super_admin_plateforme'>

// ── Statuts utilisateur ───────────────────────────────────────────────────────

/**
 * Statut du compte utilisateur.
 * - pending  : compte pré-créé par admin, code d'accès non encore utilisé [NOUVEAU — flux AccessCode]
 * - active   : compte activé et opérationnel
 * - suspended: compte suspendu par l'admin
 * - graduated: étudiant diplômé (archivé)
 */
export type UserStatus = 'pending' | 'active' | 'suspended' | 'graduated'

// ── Interface principale ──────────────────────────────────────────────────────

/**
 * Profil complet d'un utilisateur stocké dans /users/$uid.
 *
 * Champs issus du runtime (authService.js, AuthContext.jsx) :
 * - uid, email, role, universityId, nom, prenom, photoURL
 * - dateCreation (timestamp ms), actif (boolean)
 * - linkedStudentId (parent uniquement, singulier — DÉPRÉCIÉ, voir linkedStudentIds)
 * - matricule (étudiant uniquement)
 *
 * Champs [NOUVEAU] : status, createdBy, linkedStudentIds
 */
export interface User {
  /** Identifiant Firebase Auth unique */
  uid: string

  /** Adresse e-mail de connexion */
  email: string

  /** Rôle déterminant les permissions RBAC */
  role: Role

  /**
   * Identifiant du tenant (université).
   * null pour super_admin_plateforme uniquement.
   */
  universityId: string | null

  /** Nom de famille */
  nom: string

  /** Prénom */
  prenom: string

  /** URL de la photo de profil (optionnel) */
  photoURL: string | null

  /**
   * Timestamp de création du compte (Date.now()).
   * Fidèle au champ écrit par authService.js.
   */
  dateCreation: number

  /**
   * Indique si le compte est actif.
   * Fidèle au champ écrit par authService.js.
   * @see UserStatus pour le typage sémantique plus riche
   */
  actif: boolean

  /**
   * Statut sémantique du compte. [NOUVEAU]
   * Complète `actif` avec des états plus granulaires.
   */
  status?: UserStatus

  /**
   * UID de l'administrateur ayant créé ce compte. [NOUVEAU]
   * Traçabilité RGPD — obligatoire pour les comptes créés par flux admin.
   */
  createdBy?: string

  /**
   * Matricule de l'étudiant.
   * Présent uniquement si role === 'student'.
   */
  matricule?: string

  /**
   * Lien vers un étudiant (parent uniquement) — format singulier.
   * @deprecated Utiliser linkedStudentIds[] pour support multi-enfants.
   * Conservé pour compatibilité avec le runtime existant.
   */
  linkedStudentId?: string

  /**
   * Liste des studentId liés (parent uniquement). [NOUVEAU]
   * Remplace linkedStudentId pour supporter la fratrie.
   */
  linkedStudentIds?: Record<string, boolean>
}

// ── Profil contexte Auth (sous-ensemble lu par AuthContext) ───────────────────

/**
 * Profil réduit chargé dans AuthContext depuis /users/$uid.
 * Contient uniquement les champs nécessaires au routing et RBAC côté client.
 */
export interface UserProfile {
  uid: string
  email: string | null
  role: Role
  universityId: string | null
  nom: string
  prenom: string
  photoURL: string | null
}
