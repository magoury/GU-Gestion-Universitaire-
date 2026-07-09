// src/types/audit.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Logs d'audit RGPD.
// Sources :
//   - /universities/$universityId/audit_logs/$logId → AuditLog
//   - /saas_admin/audit_logs/$logId                  → AuditLogGlobal
// Fidèle aux champs écrits par auditService.js et superAdminService.js.
// ─────────────────────────────────────────────────────────────────────────────

// ── Actions d'audit ───────────────────────────────────────────────────────────

/**
 * Actions d'audit cataloguées dans AUDIT_ACTIONS (auditService.js).
 * Union exhaustive — toute nouvelle action doit être ajoutée ici.
 */
export type AuditAction =
  // Étudiants
  | 'ETUDIANT_CREE'
  | 'ETUDIANT_MODIFIE'
  | 'ETUDIANT_STATUT_CHANGE'
  | 'DONNEES_ANONYMISEES'
  // Enseignants
  | 'ENSEIGNANT_CREE'
  | 'COURS_AFFECTE'
  // Notes
  | 'NOTE_SAISIE'
  | 'NOTE_MODIFIEE'
  | 'NOTE_SAISIE_REFUSEE'
  // Paiements
  | 'PAIEMENT_ENREGISTRE'
  | 'PAIEMENT_REGISTRE'
  | 'PAIEMENT_REFUSE'
  | 'FRAIS_CONFIGURES'
  | 'CONFIG_FRAIS_REFUSEE'
  // Notifications
  | 'NOTIFICATION_REFUSEE'
  // Année académique
  | 'ANNEE_CLOTUREE'
  // RGPD
  | 'EXPORT_RGPD'
  | 'EXPORT_RGPD_REFUSE'
  | 'ANONYMISATION_REFUSEE'
  // Comptes
  | 'COMPTE_CREE'
  | 'CONNEXION'
  | 'CONNEXION_REFUSEE'
  // Codes d'accès [NOUVEAU]
  | 'CODE_ACCES_GENERE'
  | 'CODE_ACCES_UTILISE'
  | 'CODE_ACCES_EXPIRE'
  | 'CODE_ACCES_RENOUVELE'
  // Super Admin
  | 'UNIVERSITE_SUSPENDUE'
  | 'UNIVERSITE_REACTIVEE'
  // Système — fallback pour services .js non encore migrés (academicYearService, rgpdService)
  | string

// ── Log d'audit tenant ────────────────────────────────────────────────────────

/**
 * Entrée de journal d'audit pour un tenant (université).
 * Stockée dans /universities/$universityId/audit_logs/$logId.
 * Fidèle aux champs écrits par auditService.ecrireAuditLog().
 *
 * Invariants RGPD :
 * - Immuable après écriture (règle Firebase : !data.exists())
 * - Toujours isolée par universityId
 * - Doit contenir acteurId et action (validation dans auditService)
 */
export interface AuditLog {
  /** Clé Firebase du log (ajoutée à la lecture : auditService.lireAuditLogs) */
  id?: string

  /** UID de l'acteur ayant déclenché l'action */
  acteurId: string

  /** Nom affiché de l'acteur */
  acteurNom: string

  /** Rôle de l'acteur au moment de l'action */
  acteurRole: string

  /** Action réalisée */
  action: AuditAction

  /**
   * Identifiant de la ressource cible.
   * Ex : studentId, teacherId, filière, uid, annee…
   */
  cible: string

  /** Description humaine de l'action */
  detail: string

  /** Timestamp de l'action (Date.now()) */
  timestamp: number
}

// ── Données d'entrée pour ecrireAuditLog ─────────────────────────────────────

/**
 * Paramètre d'entrée de auditService.ecrireAuditLog().
 * Le champ `timestamp` est ajouté automatiquement par le service.
 */
export type AuditLogInput = Omit<AuditLog, 'id' | 'timestamp'>

// ── Log d'audit global (Super Admin) ─────────────────────────────────────────

/**
 * Log d'audit global de la plateforme.
 * Stocké dans /saas_admin/audit_logs/$logId.
 * Fidèle aux champs écrits par superAdminService.ecrireAuditLogGlobal().
 */
export interface AuditLogGlobal {
  /** UID du super admin ayant déclenché l'action */
  acteurId: string

  /** Nom affiché */
  acteurNom: string

  /** Toujours 'super_admin_plateforme' */
  acteurRole: 'super_admin_plateforme'

  /** Action réalisée */
  action: AuditAction

  /** Ressource cible (universityId, uid…) */
  cible: string

  /** Description de l'action */
  detail: string

  /** Timestamp */
  timestamp: number
}
