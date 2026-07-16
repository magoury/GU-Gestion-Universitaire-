// src/services/superAdminService.ts
// ═══════════════════════════════════════════════════════════════════════════════
//
// ⚠️  EXCEPTION MULTI-TENANT DOCUMENTÉE — MODULE 13 (Facturation SaaS)
//
// Ce service est la SEULE exception légitime à la règle d'isolation par
// universityId dans tout le projet GU.
//
// Il lit et écrit dans /saas_admin/* — un nœud transversal qui couvre TOUTES
// les universités clientes. Cette exception est volontaire et nécessaire pour
// la vue Super Admin Plateforme (KPIs globaux, revenus, suspension de tenant).
//
// GARDE OBLIGATOIRE : CHAQUE fonction publique de ce service vérifie en premier
// que l'acteur connecté a le rôle 'super_admin_plateforme'. Toute modification
// de ce fichier doit maintenir cette invariant sans exception.
//
// Chemins Firebase légitimes pour ce service :
//   - Lecture/écriture : /saas_admin/universites/$universityId
//   - Lecture/écriture : /saas_admin/revenue/mensuel/$mois
//   - Écriture         : /saas_admin/audit_logs/$logId
//   - Écriture sync    : /universities/$universityId/config (statut actif/suspendu)
//
// ═══════════════════════════════════════════════════════════════════════════════

import { ref, get, update, push, set } from 'firebase/database'
import { database, auth } from '@fb'
import type {
  SaasUniversite,
  UniversityStatus,
} from '@/types'
import type { KPIsGlobaux, RevenuMensuel } from '@/types'
import type { AuditLogGlobal, AuditAction } from '@/types'

// ── Types internes ──────────────────────────────────────────────────────────────

/**
 * Entrée partielle pour ecrireAuditLogGlobal — le service complète les champs
 * acteurId, acteurRole et timestamp automatiquement.
 */
interface AuditLogGlobalInput {
  /** Action cataloguée dans AuditAction */
  action: AuditAction
  /** Ressource cible (universityId, uid…) */
  cible?: string
  /** Description humaine */
  detail?: string
  /** Nom de l'acteur (optionnel — fallback 'Super Admin') */
  acteurNom?: string
}

// ── Garde de rôle — point de sécurité central ─────────────────────────────────

/**
 * Vérifie que l'utilisateur Firebase Auth courant est un Super Admin Plateforme.
 *
 * Lit le rôle directement dans /users/$uid pour éviter toute falsification
 * côté client. Lance une Error si la vérification échoue.
 *
 * @throws {Error} Si non authentifié, profil introuvable, ou rôle insuffisant
 * @returns Le UID de l'acteur vérifié
 */
async function verifierRoleSuperAdmin(): Promise<string> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error(
      '[superAdminService] Accès refusé : aucun utilisateur connecté.'
    )
  }

  const uid = currentUser.uid
  const profilRef = ref(database, `users/${uid}`)
  const snapshot = await get(profilRef)

  if (!snapshot.exists()) {
    throw new Error(
      `[superAdminService] Profil introuvable pour l'UID : ${uid}`
    )
  }

  const profil = snapshot.val() as { role?: string }

  if (profil.role !== 'super_admin_plateforme') {
    throw new Error(
      `[superAdminService] Accès refusé : rôle '${profil.role ?? 'inconnu'}' insuffisant. ` +
      `Seul 'super_admin_plateforme' peut accéder aux données transversales.`
    )
  }

  return uid
}

// ── Audit global plateforme ────────────────────────────────────────────────────

/**
 * Écrit un log d'audit global sous /saas_admin/audit_logs/.
 *
 * Fonction interne — appelée après `verifierRoleSuperAdmin()` par chaque
 * fonction publique. Ne pas exporter : pas d'appel externe légitime.
 *
 * @param acteurId - UID du super admin (résultat de verifierRoleSuperAdmin)
 * @param log      - Données de l'événement à journaliser
 */
async function ecrireAuditLogGlobal(
  acteurId: string,
  log: AuditLogGlobalInput
): Promise<void> {
  const auditRef = ref(database, 'saas_admin/audit_logs')
  const newLogRef = push(auditRef)

  const entree: AuditLogGlobal = {
    acteurId,
    acteurNom: log.acteurNom ?? 'Super Admin',
    acteurRole: 'super_admin_plateforme',
    action: log.action,
    cible: log.cible ?? '',
    detail: log.detail ?? '',
    timestamp: Date.now(),
  }

  await set(newLogRef, entree)
}

// ── listerUniversites ──────────────────────────────────────────────────────────

/**
 * Liste toutes les universités inscrites sur la plateforme.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 * 📍 Chemin Firebase : /saas_admin/universites (lecture transversale — exception
 *    documentée au sommet du fichier).
 *
 * AVANT (JS) : async function listerUniversites() → any[]
 * APRÈS (TS) : async function listerUniversites(): Promise<SaasUniversite[]>
 *
 * @returns Liste complète des universités (toutes statuts confondus)
 * @throws  {Error} Si rôle insuffisant ou erreur Firebase
 */
export async function listerUniversites(): Promise<SaasUniversite[]> {
  await verifierRoleSuperAdmin()

  const univsRef = ref(database, 'saas_admin/universites')
  const snapshot = await get(univsRef)

  if (!snapshot.exists()) {
    return []
  }

  const result: SaasUniversite[] = []

  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val() as Partial<SaasUniversite>
    result.push({
      id: childSnapshot.key as string,
      nom: data.nom ?? '',
      slug: data.slug ?? '',
      ville: data.ville ?? 'Abidjan',
      pays: data.pays ?? "Côte d'Ivoire",
      logo: data.logo ?? null,
      plan: data.plan ?? 'Standard',
      // ?? et non || : évite de masquer statut='' (champ vide) par 'actif'
      statut: (data.statut ?? 'actif') as UniversityStatus,
      nbEtudiants: Number(data.nbEtudiants ?? 0),
      dateExpiration: Number(
        data.dateExpiration ?? Date.now() + 365 * 24 * 3600 * 1000
      ),
      mrr: Number(data.mrr ?? 0),
    })
  })

  return result
}

// ── suspendreUniversite ────────────────────────────────────────────────────────

/**
 * Suspend une université : désactive l'accès pour tous ses utilisateurs.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 *
 * Synchronisation : met à jour les DEUX nœuds Firebase pour garantir la
 * cohérence entre vue SaaS et vue applicative :
 *   1. /saas_admin/universites/$universityId → statut: 'suspendu'
 *   2. /universities/$universityId/config    → actif: false
 *
 * ⚠️  Si l'une des deux écritures échoue, l'erreur est propagée et l'opération
 * n'est PAS considérée comme réussie (pas de rollback atomique Firebase RTDB —
 * l'appelant doit gérer l'erreur et re-déclencher si nécessaire).
 *
 * AVANT (JS) : async function suspendreUniversite(universityId) → void (sans garde)
 * APRÈS (TS) : garde super_admin, typage strict, audit avec acteurId vérifié
 *
 * @param universityId - Identifiant unique de l'université à suspendre
 * @throws {Error} Si rôle insuffisant, universityId manquant, ou erreur Firebase
 */
export async function suspendreUniversite(universityId: string): Promise<void> {
  if (!universityId) {
    throw new Error(
      '[superAdminService] universityId requis pour suspendre une université.'
    )
  }

  // 🔐 Vérification rôle — AVANT toute écriture
  const acteurId = await verifierRoleSuperAdmin()

  // 1. Mise à jour nœud SaaS (vue Super Admin)
  const univRef = ref(database, `saas_admin/universites/${universityId}`)
  await update(univRef, { statut: 'suspendu' as UniversityStatus })

  // 2. Synchronisation nœud applicatif (vue tenant)
  //    Les deux nœuds DOIVENT rester cohérents : un tenant 'suspendu' côté SaaS
  //    doit aussi avoir actif=false côté /universities/$id/config.
  const configRef = ref(database, `universities/${universityId}/config`)
  await update(configRef, { actif: false })

  // 3. Audit global plateforme
  await ecrireAuditLogGlobal(acteurId, {
    action: 'UNIVERSITE_SUSPENDUE',
    cible: universityId,
    detail: `Suspension de l'université ${universityId} par le Super Admin (UID: ${acteurId}).`,
  })
}

// ── reactiverUniversite ────────────────────────────────────────────────────────

/**
 * Réactive une université précédemment suspendue.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 *
 * Synchronisation : miroir exact de suspendreUniversite (ordre inverse) :
 *   1. /saas_admin/universites/$universityId → statut: 'actif'
 *   2. /universities/$universityId/config    → actif: true
 *
 * AVANT (JS) : async function reactiverUniversite(universityId) → void (sans garde)
 * APRÈS (TS) : garde super_admin, typage strict, audit avec acteurId vérifié
 *
 * @param universityId - Identifiant unique de l'université à réactiver
 * @throws {Error} Si rôle insuffisant, universityId manquant, ou erreur Firebase
 */
export async function reactiverUniversite(universityId: string): Promise<void> {
  if (!universityId) {
    throw new Error(
      '[superAdminService] universityId requis pour réactiver une université.'
    )
  }

  // 🔐 Vérification rôle — AVANT toute écriture
  const acteurId = await verifierRoleSuperAdmin()

  // 1. Mise à jour nœud SaaS (vue Super Admin)
  const univRef = ref(database, `saas_admin/universites/${universityId}`)
  await update(univRef, { statut: 'actif' as UniversityStatus })

  // 2. Synchronisation nœud applicatif (vue tenant)
  const configRef = ref(database, `universities/${universityId}/config`)
  await update(configRef, { actif: true })

  // 3. Audit global plateforme
  await ecrireAuditLogGlobal(acteurId, {
    action: 'UNIVERSITE_REACTIVEE',
    cible: universityId,
    detail: `Réactivation de l'université ${universityId} par le Super Admin (UID: ${acteurId}).`,
  })
}

// ── lireKPIsGlobaux ────────────────────────────────────────────────────────────

/**
 * Lit les KPIs globaux de la plateforme.
 *
 * 🔐 Garde : `super_admin_plateforme` requis (propagée via listerUniversites).
 *
 * Formule MRR :
 *   MRR = Σ univ.mrr  POUR  univ.statut ∈ {'actif', 'essai'}
 *
 *   Les universités 'suspendu' ou 'expire' sont EXCLUES du MRR car elles ne
 *   génèrent pas de revenu récurrent tant que leur licence n'est pas active.
 *   Elles sont néanmoins comptées dans totalUniversites.
 *
 * Formule nbUniversitesActives :
 *   nbUniversitesActives = |{univ : univ.statut ∈ {'actif', 'essai'}}|
 *
 * Formule nbTotalEtudiants :
 *   nbTotalEtudiants = Σ univ.nbEtudiants  POUR TOUTES les universités
 *   (les étudiants d'une université suspendue restent en base — pas supprimés)
 *
 * AVANT (JS) : mrr incluait TOUTES les universités sans filtre statut
 * APRÈS (TS) : mrr filtré sur statut actif|essai uniquement
 *
 * @returns KPIs calculés à l'instant T depuis /saas_admin/universites
 * @throws  {Error} Si rôle insuffisant ou erreur Firebase
 */
export async function lireKPIsGlobaux(): Promise<KPIsGlobaux> {
  // ⚠️ Garde de sécurité héritée de l'appel à listerUniversites() ci-dessous.
  // NE PAS retirer cet appel ou le remplacer par un accès direct aux données
  // sans ajouter explicitement `await verifierRoleSuperAdmin()` ici.
  const list = await listerUniversites()

  let nbUniversitesActives = 0
  let mrr = 0
  let nbTotalEtudiants = 0

  for (const univ of list) {
    const estActive =
      univ.statut === 'actif' || univ.statut === 'essai'

    if (estActive) {
      nbUniversitesActives++
      // MRR : uniquement universités avec licence active ou en essai
      mrr += Number(univ.mrr ?? 0)
    }

    // Étudiants : comptés pour toutes les universités (données non supprimées)
    nbTotalEtudiants += Number(univ.nbEtudiants ?? 0)
  }

  return {
    totalUniversites: list.length,
    nbUniversitesActives,
    mrr,
    nbTotalEtudiants,
    nbAlertes: 0, // Calculé si logs d'erreurs d'infra Firebase présents
  }
}

// ── lireRevenusMensuels ────────────────────────────────────────────────────────

/**
 * Lit les revenus mensuels de la plateforme depuis /saas_admin/revenue/mensuel.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 *
 * Fallback : si le nœud n'est pas encore initialisé (nouvelle installation),
 * retourne une série historique de démonstration de 7 mois. Ce fallback est
 * intentionnel pour l'affichage initial — à remplacer par un seeding Firebase
 * lors du déploiement production.
 *
 * AVANT (JS) : async function lireRevenusMensuels() → any[] (sans garde)
 * APRÈS (TS) : garde super_admin, retour Promise<RevenuMensuel[]>
 *
 * @returns Tableau de revenus mensuels triés par clé Firebase (ordre d'insertion)
 * @throws  {Error} Si rôle insuffisant ou erreur Firebase
 */
export async function lireRevenusMensuels(): Promise<RevenuMensuel[]> {
  // 🔐 Vérification rôle — AVANT toute lecture
  await verifierRoleSuperAdmin()

  const revRef = ref(database, 'saas_admin/revenue/mensuel')
  const snapshot = await get(revRef)

  if (!snapshot.exists()) {
    // Fallback de démonstration — à seeder en production
    return [
      { mois: 'Jan', montant: 450_000 },
      { mois: 'Fév', montant: 600_000 },
      { mois: 'Mar', montant: 750_000 },
      { mois: 'Avr', montant: 900_000 },
      { mois: 'Mai', montant: 1_050_000 },
      { mois: 'Juin', montant: 1_200_000 },
      { mois: 'Juil', montant: 1_350_000 },
    ]
  }

  const result: RevenuMensuel[] = []

  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val() as { montant?: number }
    result.push({
      mois: childSnapshot.key as string,
      montant: Number(data.montant ?? 0),
    })
  })

  return result
}

// ── lireUtilisateursGlobaux ────────────────────────────────────────────────────

/**
 * Vue agrégée de tous les utilisateurs à travers tous les tenants.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 * 📍 Chemin Firebase : /users (flat — chaque user a son universityId en champ)
 *
 * Note architecture : /users n'est PAS structuré par tenant. Chaque document
 * user contient universityId. Cette lecture transversale est légale uniquement
 * pour le Super Admin et documentée comme exception dans ce fichier.
 *
 * @returns Tableau d'utilisateurs avec uid, role, universityId, nom, prenom, actif
 * @throws  {Error} Si rôle insuffisant ou erreur Firebase
 */
export interface UtilisateurGlobal {
  uid: string
  nom: string
  prenom: string
  email: string
  role: string
  universityId: string | null
  actif: boolean
  dateCreation: number
}

export async function lireUtilisateursGlobaux(): Promise<UtilisateurGlobal[]> {
  await verifierRoleSuperAdmin()

  const usersRef = ref(database, 'users')
  const snapshot = await get(usersRef)

  if (!snapshot.exists()) return []

  const result: UtilisateurGlobal[] = []

  snapshot.forEach((child) => {
    const d = child.val() as Partial<UtilisateurGlobal>
    // Exclure le super_admin_plateforme de la liste (pas de tenant)
    if (d.role === 'super_admin_plateforme') return
    result.push({
      uid: child.key as string,
      nom: d.nom ?? '',
      prenom: d.prenom ?? '',
      email: d.email ?? '',
      role: d.role ?? 'student',
      universityId: d.universityId ?? null,
      actif: d.actif !== false,
      dateCreation: Number(d.dateCreation ?? 0),
    })
  })

  return result
}

// ── Config plateforme ─────────────────────────────────────────────────────────

/**
 * Paramètres globaux de la plateforme stockés dans /saas_admin/config.
 * Ces valeurs s'appliquent à toutes les universités.
 */
export interface ConfigPlateforme {
  /** Durée de la période d'essai gratuit en jours (défaut : 30) */
  dureeEssaiJours: number
  /** Seuil déclenchant une alerte si un tenant dépasse ce nombre d'étudiants (défaut : 500) */
  seuilAlerteEtudiants: number
  /** Seuil MRR minimum (FCFA) en dessous duquel une alerte est levée (défaut : 100_000) */
  seuilAlerteMRR: number
}

const CONFIG_DEFAUT: ConfigPlateforme = {
  dureeEssaiJours: 30,
  seuilAlerteEtudiants: 500,
  seuilAlerteMRR: 100_000,
}

/**
 * Lit la configuration globale de la plateforme.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 * 📍 Chemin Firebase : /saas_admin/config
 *
 * Si le nœud n'existe pas encore (première installation), retourne CONFIG_DEFAUT
 * sans écriture — l'écriture se fait via sauvegarderConfigPlateforme().
 *
 * @returns ConfigPlateforme avec valeurs Firebase ou valeurs par défaut
 */
export async function lireConfigPlateforme(): Promise<ConfigPlateforme> {
  await verifierRoleSuperAdmin()

  const configRef = ref(database, 'saas_admin/config')
  const snapshot = await get(configRef)

  if (!snapshot.exists()) return { ...CONFIG_DEFAUT }

  const data = snapshot.val() as Partial<ConfigPlateforme>
  return {
    dureeEssaiJours: Number(data.dureeEssaiJours ?? CONFIG_DEFAUT.dureeEssaiJours),
    seuilAlerteEtudiants: Number(data.seuilAlerteEtudiants ?? CONFIG_DEFAUT.seuilAlerteEtudiants),
    seuilAlerteMRR: Number(data.seuilAlerteMRR ?? CONFIG_DEFAUT.seuilAlerteMRR),
  }
}

/**
 * Sauvegarde la configuration globale dans /saas_admin/config.
 *
 * 🔐 Garde : `super_admin_plateforme` requis.
 * Écrit un audit log après chaque modification.
 *
 * @param config - Nouvelles valeurs de configuration
 */
export async function sauvegarderConfigPlateforme(
  config: ConfigPlateforme
): Promise<void> {
  const acteurId = await verifierRoleSuperAdmin()

  const configRef = ref(database, 'saas_admin/config')
  await set(configRef, config)

  await ecrireAuditLogGlobal(acteurId, {
    action: 'CONFIG_MODIFIEE',
    detail: `Paramètres plateforme mis à jour : essai=${config.dureeEssaiJours}j, alerteEtu=${config.seuilAlerteEtudiants}, alerteMRR=${config.seuilAlerteMRR}F`,
  })
}

