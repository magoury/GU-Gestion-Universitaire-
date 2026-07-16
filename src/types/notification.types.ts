// src/types/notification.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Notifications temps réel.
// Source : /universities/$universityId/notifications/$notifId
// Fidèle aux champs écrits par notificationService.js.
// ─────────────────────────────────────────────────────────────────────────────

// ── Type de notification ──────────────────────────────────────────────────────

/**
 * Catégories de notifications de la plateforme.
 * Source : notificationService.js (envoyerNotification).
 *
 * Filtrage par rôle (notificationService.lireNotifications) :
 *  - admin/superadmin : toutes
 *  - teacher   : rdv_parent, message_parent
 *  - student   : annonce, resultat, absence
 *  - parent    : annonce, alerte_paiement, direction
 */
export type NotificationType =
  | 'annonce'
  | 'alerte_paiement'
  | 'resultat'
  | 'absence'
  | 'direction'
  | 'rdv_parent'
  | 'message_parent'
  | 'message_cours'

// ── Notification ─────────────────────────────────────────────────────────────

/**
 * Notification temps réel.
 * Stockée dans /universities/$universityId/notifications/$notifId.
 * Fidèle aux champs écrits par notificationService.js.
 *
 * Note : `lue` et `lu` coexistent dans le runtime pour rétrocompatibilité.
 * La valeur canonique est `lue` ; `lu` est un alias conservé.
 */
export interface Notification {
  /** Clé unique générée par Firebase push() */
  id: string

  /** Titre court affiché dans la cloche de notifications */
  titre: string

  /** Corps du message */
  message: string

  /** Catégorie de la notification */
  type: NotificationType

  /**
   * Destinataire principal.
   * Peut être :
   * - un UID spécifique
   * - 'all' (tous les utilisateurs du tenant)
   * - 'teachers', 'students', 'parents' (groupe par rôle)
   */
  destinataireId: string

  /**
   * Liste étendue de destinataires individuels.
   * null si destinataireId suffit.
   */
  destinataires: string[] | null

  /**
   * Indique si la notification a été lue.
   * Champ canonique.
   */
  lue: boolean

  /**
   * Alias de `lue` — conservé pour rétrocompatibilité avec les données existantes.
   * @deprecated Utiliser `lue`.
   */
  lu: boolean

  /** Timestamp de création de la notification */
  timestamp: number

  /** Lien interne optionnel (route de l'application) */
  lien?: string
}

// ── Résultat de lecture (retourné par service) ────────────────────────────────

/**
 * Résultat structuré de notificationService.lireNotifications().
 */
export interface NotificationsResult {
  /** Liste filtrée et triée par date décroissante */
  notifications: Notification[]

  /** Nombre de notifications non lues */
  nbNonLues: number
}
