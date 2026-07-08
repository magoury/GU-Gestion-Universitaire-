// src/services/auditService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service d'audit RGPD — traçabilité complète de toutes les actions du SaaS.
// Module 15 du cahier des charges.
//
// Isolation multi-tenant stricte :
//   - ecrireAuditLog : universityId TOUJOURS requis (lecture/écriture tenant)
//   - lireAuditLogs  : vérifie rôle Firebase avant toute lecture
//       → admin_universite : accès à son universityId uniquement
//       → super_admin_plateforme : accès à tout universityId
//
// Ce service est TRANSVERSAL : importé par TOUS les autres services.
// Toute modification de signature doit être validée contre :
//   studentService.ts, teacherService.ts, gradeService.ts, paymentService.ts,
//   notificationService.ts, superAdminService.ts, authService.ts,
//   accessCodeService.ts, academicYearService.js, rgpdService.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from 'firebase/database'
import { database, auth } from '@fb'
import type { AuditLog, AuditLogInput, AuditAction } from '@/types'

// ── Constantes cataloguées ────────────────────────────────────────────────────

/**
 * Catalogue des actions d'audit connues.
 * Utilisable dans les services pour éviter les strings en dur.
 * La source de vérité du type est AuditAction dans audit.types.ts.
 *
 * AVANT (JS) : export const AUDIT_ACTIONS = { ... }  (plain object)
 * APRÈS (TS) : as const + type dérivé de AuditAction
 */
export const AUDIT_ACTIONS = {
  // Étudiants
  ETUDIANT_CREE: 'ETUDIANT_CREE',
  ETUDIANT_MODIFIE: 'ETUDIANT_MODIFIE',
  ETUDIANT_STATUT_CHANGE: 'ETUDIANT_STATUT_CHANGE',
  DONNEES_ANONYMISEES: 'DONNEES_ANONYMISEES',
  // Enseignants
  ENSEIGNANT_CREE: 'ENSEIGNANT_CREE',
  COURS_AFFECTE: 'COURS_AFFECTE',
  // Notes
  NOTE_SAISIE: 'NOTE_SAISIE',
  NOTE_MODIFIEE: 'NOTE_MODIFIEE',
  NOTE_SAISIE_REFUSEE: 'NOTE_SAISIE_REFUSEE',
  // Paiements
  PAIEMENT_ENREGISTRE: 'PAIEMENT_ENREGISTRE',
  PAIEMENT_REGISTRE: 'PAIEMENT_REGISTRE', // ⚠️ Typo dans paymentService.ts:223 — alias temporaire
  PAIEMENT_REFUSE: 'PAIEMENT_REFUSE',
  FRAIS_CONFIGURES: 'FRAIS_CONFIGURES',
  CONFIG_FRAIS_REFUSEE: 'CONFIG_FRAIS_REFUSEE',
  // Notifications
  NOTIFICATION_REFUSEE: 'NOTIFICATION_REFUSEE',
  // Année académique
  ANNEE_CLOTUREE: 'ANNEE_CLOTUREE',
  // RGPD
  EXPORT_RGPD: 'EXPORT_RGPD',
  // Comptes
  COMPTE_CREE: 'COMPTE_CREE',
  CONNEXION: 'CONNEXION',
  // Codes d'accès
  CODE_ACCES_GENERE: 'CODE_ACCES_GENERE',
  CODE_ACCES_UTILISE: 'CODE_ACCES_UTILISE',
  CODE_ACCES_EXPIRE: 'CODE_ACCES_EXPIRE',
  CODE_ACCES_RENOUVELE: 'CODE_ACCES_RENOUVELE',
  // Super Admin
  UNIVERSITE_SUSPENDUE: 'UNIVERSITE_SUSPENDUE',
  UNIVERSITE_REACTIVEE: 'UNIVERSITE_REACTIVEE',
} as const satisfies Record<string, AuditAction>

// ── Types internes ─────────────────────────────────────────────────────────────

/**
 * Filtres pour lireAuditLogs.
 */
interface FiltresAuditLog {
  /** Limite le nombre de résultats (tri par timestamp, les N derniers) */
  limite?: number
  /** Filtre par UID d'acteur */
  acteurId?: string
}

// ── ecrireAuditLog ─────────────────────────────────────────────────────────────

/**
 * Écrit un log d'audit dans /universities/$universityId/audit_logs/.
 *
 * Isolation multi-tenant : universityId TOUJOURS obligatoire.
 * Le timestamp est ajouté automatiquement.
 *
 * Comportement enrichi : si l'acteurId correspond à un super_admin_plateforme,
 * le rôle et le nom sont remplacés par les données réelles Firebase (anti-usurpation).
 *
 * AVANT (JS) : async function ecrireAuditLog(universityId, log) → any
 * APRÈS (TS) :
 *   - universityId: string
 *   - log: AuditLogInput (Omit<AuditLog, 'id' | 'timestamp'>)
 *   - retour: Promise<string> — clé Firebase du log créé
 *
 * Appelé par : studentService, teacherService, gradeService, paymentService,
 *              notificationService, authService, accessCodeService,
 *              academicYearService (js), rgpdService (js)
 *
 * @param universityId - Identifiant du tenant (université) — requis
 * @param log          - Données du log (sans id ni timestamp)
 * @returns Clé Firebase du log créé
 * @throws {Error} Si universityId manquant ou acteurId/action absents
 */
export async function ecrireAuditLog(
  universityId: string,
  log: AuditLogInput
): Promise<string> {
  if (!universityId) {
    throw new Error(
      '[auditService] universityId requis — isolation multi-tenant obligatoire.'
    )
  }

  if (!log.acteurId || !log.action) {
    throw new Error(
      '[auditService] acteurId et action sont requis dans le log.'
    )
  }

  // Enrichissement rôle/nom depuis Firebase si super_admin_plateforme
  // (évite qu'un appelant falsifie le rôle dans le log)
  let acteurRole = log.acteurRole ?? ''
  let acteurNom = log.acteurNom ?? ''

  try {
    const userSnap = await get(ref(database, `users/${log.acteurId}`))
    if (userSnap.exists()) {
      const uData = userSnap.val() as { role?: string; prenom?: string; nom?: string }
      if (uData.role === 'super_admin_plateforme') {
        acteurRole = 'super_admin_plateforme'
        acteurNom = `${uData.prenom ?? ''} ${uData.nom ?? ''} (Super Admin)`.trim()
      }
    }
  } catch (err) {
    // Non bloquant : le log est écrit même si l'enrichissement échoue
    console.warn(
      "[auditService] Échec de récupération de profil pour log d'audit :",
      err
    )
  }

  const auditRef = ref(database, `universities/${universityId}/audit_logs`)

  const auditEntry: Omit<AuditLog, 'id'> = {
    acteurId: log.acteurId,
    acteurNom,
    acteurRole,
    action: log.action as AuditAction,
    cible: log.cible ?? '',
    detail: log.detail ?? '',
    timestamp: Date.now(),
  }

  const newRef = await push(auditRef, auditEntry)

  if (!newRef.key) {
    throw new Error('[auditService] Firebase push() n\'a pas retourné de clé.')
  }

  return newRef.key
}

// ── lireAuditLogs ─────────────────────────────────────────────────────────────

/**
 * Lit les logs d'audit pour une université donnée.
 *
 * 🔐 Garde de rôle (lue depuis Firebase — non falsifiable côté client) :
 *   - `admin_universite`       : accès uniquement à son propre universityId
 *   - `super_admin_plateforme` : accès à tout universityId
 *   - Tout autre rôle          : accès refusé
 *
 * ⚠️  SuperAdminDashboard.jsx appelle lireAuditLogs(univ.id, { limite: 15 })
 *     → couvert par la branche super_admin_plateforme.
 *
 * Isolation multi-tenant : si un admin_universite tente de lire un universityId
 * différent du sien, l'erreur est levée AVANT toute lecture Firebase.
 *
 * AVANT (JS) : async function lireAuditLogs(universityId, filtres = {}) → any[]
 *              Sans aucune vérification de rôle.
 * APRÈS (TS) : garde rôle Firebase, retour Promise<AuditLog[]>
 *
 * @param universityId - Identifiant du tenant cible — requis
 * @param filtres      - Filtres optionnels (limite, acteurId)
 * @returns Logs triés par timestamp décroissant
 * @throws {Error} Si non authentifié, rôle insuffisant, ou cross-tenant interdit
 */
export async function lireAuditLogs(
  universityId: string,
  filtres: FiltresAuditLog = {}
): Promise<AuditLog[]> {
  if (!universityId) {
    throw new Error(
      '[auditService] universityId requis — isolation multi-tenant obligatoire.'
    )
  }

  // 🔐 Vérification rôle — lecture profil Firebase (non falsifiable)
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error(
      '[auditService] Accès refusé : aucun utilisateur connecté.'
    )
  }

  const profilSnap = await get(ref(database, `users/${currentUser.uid}`))
  if (!profilSnap.exists()) {
    throw new Error(
      `[auditService] Profil introuvable pour l'UID : ${currentUser.uid}`
    )
  }

  const profil = profilSnap.val() as {
    role?: string
    universityId?: string | null
  }

  if (profil.role === 'super_admin_plateforme') {
    // Super Admin : accès libre à tout universityId — exception documentée (Module 13)
  } else if (profil.role === 'admin_universite') {
    // Admin tenant : uniquement son propre universityId
    if (profil.universityId !== universityId) {
      throw new Error(
        `[auditService] Accès refusé : admin_universite ne peut lire que les logs de son tenant.` +
        ` Demandé: ${universityId}, autorisé: ${profil.universityId ?? 'aucun'}`
      )
    }
  } else {
    throw new Error(
      `[auditService] Accès refusé : rôle '${profil.role ?? 'inconnu'}' ne peut pas lire les logs d'audit.`
    )
  }

  // Lecture Firebase
  const auditRef = ref(database, `universities/${universityId}/audit_logs`)
  let auditQuery

  if (filtres.acteurId) {
    auditQuery = query(auditRef, orderByChild('acteurId'), equalTo(filtres.acteurId))
  } else if (filtres.limite) {
    auditQuery = query(auditRef, orderByChild('timestamp'), limitToLast(filtres.limite))
  } else {
    auditQuery = query(auditRef, orderByChild('timestamp'))
  }

  const snapshot = await get(auditQuery)

  if (!snapshot.exists()) {
    return []
  }

  const logs: AuditLog[] = []

  snapshot.forEach((childSnapshot) => {
    logs.push({
      id: childSnapshot.key as string,
      ...(childSnapshot.val() as Omit<AuditLog, 'id'>),
    })
  })

  // Tri décroissant par timestamp (les plus récents en premier)
  logs.sort((a, b) => b.timestamp - a.timestamp)

  return logs
}

// ── Export default (compatibilité composants .jsx existants) ──────────────────
// SuperAdminDashboard.jsx et tout autre composant qui importe depuis
// 'auditService.js' reçoit ce default export.

export default { ecrireAuditLog, lireAuditLogs, AUDIT_ACTIONS }
