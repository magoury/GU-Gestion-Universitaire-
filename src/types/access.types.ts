// src/types/access.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Codes d'accès et relations Parent ↔ Étudiant.
//
// ⚠️  SYSTÈME ENTIÈREMENT NOUVEAU — INEXISTANT dans le runtime actuel.
//     Ces types définissent le contrat pour l'implémentation future du
//     module d'activation par code (règle métier #1).
//
// Chemin Firebase prévu :
//   /universities/$universityId/access_codes/$code
//   /universities/$universityId/parent_student_links/$linkId
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from './user.types'

// ── Code d'accès ─────────────────────────────────────────────────────────────

/**
 * Statut d'un code d'accès.
 * - unused  : généré par l'admin, en attente d'utilisation
 * - used    : utilisé pour activer un compte
 * - expired : expiré sans avoir été utilisé
 */
export type AccessCodeStatus = 'unused' | 'used' | 'expired'

/**
 * Code d'accès généré par un admin_universite pour permettre
 * l'activation d'un compte student, teacher ou parent.
 *
 * Flux métier :
 *  1. admin crée le profil pré-existant (Student/Teacher)
 *  2. admin génère un AccessCode → affiché dans le dashboard (bouton copier)
 *  3. admin transmet le code par son canal (email, SMS, courrier)
 *  4. utilisateur saisit code + email + mot de passe sur la page d'activation
 *  5. le code passe de 'unused' → 'used', le compte Firebase Auth est créé
 *
 * ⚠️  [NOUVEAU] — non encore implémenté dans le runtime.
 *     Prévu sous /universities/$universityId/access_codes/$code.
 */
export interface AccessCode {
  /**
   * Le code alphanumérique unique (ex: 'GU-A3F9-K7X2').
   * Utilisé comme clé Firebase ET comme valeur à transmettre.
   */
  code: string

  /** Rôle pour lequel ce code a été généré */
  role: Extract<Role, 'student' | 'teacher' | 'parent'>

  /**
   * Identifiant du tenant où ce code est valide.
   * Isolation multi-tenant : un code d'une université A est invalide sur B.
   */
  universityId: string

  /**
   * UID ou ID de la fiche pré-créée à activer.
   * - Pour student : studentId (matricule)
   * - Pour teacher : teacherId
   * - Pour parent  : null (le lien se fait via linkedStudentIds)
   */
  targetUserId: string | null

  /**
   * Liste des studentId auxquels ce code donne accès.
   * Uniquement renseigné si role === 'parent'.
   * Permet la liaison multi-enfants dès la génération du code.
   */
  linkedStudentIds?: string[]

  /** UID de l'admin ayant généré ce code */
  createdBy: string

  /** Statut du code */
  status: AccessCodeStatus

  /**
   * Timestamp d'expiration.
   * Passé ce délai, le code devient 'expired' si toujours 'unused'.
   */
  expiresAt: number

  /** Timestamp de génération */
  createdAt: number

  /**
   * Code précédent remplacé lors d'un renouvellement automatique.
   * Permet la traçabilité de la chaîne de renouvellements.
   */
  previousCode?: string

  /**
   * Indique si ce code est le résultat d'un renouvellement automatique.
   * Le renouvellement se déclenche côté client (dashboard admin)
   * quand expiresAt est à moins de 48h et que status === 'unused'.
   */
  autoRenewed: boolean

  /**
   * Nombre total de renouvellements automatiques depuis la génération initiale.
   * Utile pour détecter des codes jamais utilisés après plusieurs cycles.
   */
  renewalCount: number

  /**
   * Timestamp d'utilisation du code.
   * Renseigné quand status passe à 'used'.
   */
  usedAt?: number

  /**
   * UID Firebase Auth de l'utilisateur ayant utilisé ce code.
   * Renseigné quand status passe à 'used'.
   */
  usedByUid?: string
}

// ── Relation Parent ↔ Étudiant ────────────────────────────────────────────────

/**
 * Type de relation entre un parent/tuteur et un étudiant.
 */
export type RelationType =
  | 'pere'
  | 'mere'
  | 'tuteur_legal'
  | 'tutrice_legale'
  | 'autre'

/**
 * Lien explicite entre un parent et un étudiant.
 *
 * Complète le champ `linkedStudentId` (singulier, déprécié) de User
 * pour supporter les familles avec plusieurs enfants inscrits.
 *
 * ⚠️  [NOUVEAU] — non encore implémenté dans le runtime.
 *     Prévu sous /universities/$universityId/parent_student_links/$linkId.
 *
 * Isolation multi-tenant : universityId présent pour garantir qu'un parent
 * ne peut voir que les étudiants de son université.
 */
export interface ParentStudentLink {
  /** Clé unique du lien (générée par Firebase push()) */
  id: string

  /** UID Firebase Auth du parent */
  parentUid: string

  /**
   * ID de la fiche étudiant liée (matricule ou studentId).
   * Correspond à Student.id dans /universities/$id/students/.
   */
  studentId: string

  /**
   * Tenant concerné — obligatoire pour l'isolation multi-tenant.
   * Un parent ne peut être lié qu'à des étudiants de la même université.
   */
  universityId: string

  /** Nature de la relation familiale ou légale */
  relationType: RelationType

  /** Timestamp de création du lien */
  createdAt: number

  /** UID de l'admin ayant créé ce lien */
  createdBy: string
}
