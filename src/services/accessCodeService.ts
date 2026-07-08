// src/services/accessCodeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service de gestion des codes d'accès et d'activation de compte.
//
// Règle métier :
//   1. admin_universite génère un AccessCode pour un student/teacher/parent.
//   2. Le code est transmis par l'admin (hors plateforme).
//   3. L'utilisateur s'active via activateAccountWithCode(code, email, password).
//
// Isolation multi-tenant :
//   - Chaque AccessCode porte son universityId.
//   - Le nœud /global_access_codes/$code contient uniquement {universityId}
//     pour un lookup O(1) sans scan. Lisible publiquement par clé exacte,
//     jamais en liste. Écriture réservée à admin_universite authentifié.
//
// ⚠️  AUCUNE importation depuis authService.ts (évite la dépendance circulaire).
// ─────────────────────────────────────────────────────────────────────────────

import { createUserWithEmailAndPassword } from 'firebase/auth'
import { ref, get, set, update, push } from 'firebase/database'
import { auth, database } from '@fb'
import type {
  AccessCode,
  User,
  ParentStudentLink,
} from '@/types'
import type { Role } from '@/types'
import { ecrireAuditLog } from './auditService.js'

// ── Constantes ────────────────────────────────────────────────────────────────

/**
 * Alphabet sans caractères ambigus visuellement.
 * Exclus : 0 (vs O), 1 (vs I/l).
 * 32 caractères → divise 256 exactement → aucun biais modulo.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' as const
const CODE_LONGUEUR = 8 // format : "GU-XXXX-XXXX"

/** Durée de validité par défaut : 7 jours */
const CODE_EXPIRATION_PAR_DEFAUT_MS = 7 * 24 * 60 * 60 * 1000

/** Seuil de renouvellement automatique : 48 h avant expiration */
const CODE_SEUIL_RENOUVELLEMENT_MS = 48 * 60 * 60 * 1000

// ── Traduction des erreurs Firebase Auth (locale, pas de dépendance circulaire) ─

/**
 * Traduit les codes d'erreur Firebase Auth pertinents pour ce service.
 */
function traduireErreurAuth(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte utilisateur.'
    case 'auth/weak-password':
      return 'Le mot de passe choisi est trop faible (6 caractères minimum).'
    case 'auth/invalid-email':
      return "L'adresse e-mail saisie est invalide."
    case 'auth/network-request-failed':
      return 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez patienter avant de réessayer.'
    default:
      return "Une erreur d'authentification est survenue. Veuillez réessayer."
  }
}

// ── Génération du code ────────────────────────────────────────────────────────

/**
 * Génère une chaîne aléatoire cryptographiquement sûre.
 * 32 divisant 256, byte % 32 est parfaitement uniforme — aucun rejection sampling requis.
 * Retourne au format "GU-XXXX-XXXX".
 */
function genererCodeAlphanumerique(): string {
  const bytes = new Uint8Array(CODE_LONGUEUR)
  crypto.getRandomValues(bytes)
  let chars = ''
  for (const byte of bytes) {
    chars += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return `GU-${chars.slice(0, 4)}-${chars.slice(4, 8)}`
}

/**
 * Vérifie si un code existe déjà dans l'index global.
 * Probabilité de collision ≈ 1 / 32^8 ≈ 9×10⁻¹³ — quasi nulle.
 */
async function codeExisteDeja(code: string): Promise<boolean> {
  const snap = await get(ref(database, `global_access_codes/${code}`))
  return snap.exists()
}

/**
 * Génère un code unique avec détection de collision (max 5 tentatives).
 */
async function genererCodeUnique(tentatives = 0): Promise<string> {
  if (tentatives >= 5) {
    throw new Error(
      '[accessCodeService] Échec de génération de code unique après 5 tentatives.'
    )
  }
  const code = genererCodeAlphanumerique()
  if (await codeExisteDeja(code)) {
    return genererCodeUnique(tentatives + 1)
  }
  return code
}

// ── Types internes ────────────────────────────────────────────────────────────

interface ProfilPreCree {
  nom: string
  prenom: string
  email: string
  filiere?: string
  niveau?: string
  specialite?: string
  departement?: string
  matricule?: string
}

// ── Lecture du profil pré-créé ────────────────────────────────────────────────

/**
 * Lit le profil pré-créé (Student ou Teacher) depuis Firebase.
 * Utilisé lors de l'activation pour récupérer les données personnelles
 * et vérifier la correspondance d'email.
 */
async function lireProfilPreCree(
  universityId: string,
  targetUserId: string,
  role: Extract<Role, 'student' | 'teacher'>
): Promise<ProfilPreCree> {
  const nodePath =
    role === 'student'
      ? `universities/${universityId}/students/${targetUserId}`
      : `universities/${universityId}/teachers/${targetUserId}`

  const snap = await get(ref(database, nodePath))
  if (!snap.exists()) {
    throw new Error(
      `Profil pré-créé introuvable pour le rôle "${role}" (ID: ${targetUserId}) ` +
        `dans l'université ${universityId}.`
    )
  }
  return snap.val() as ProfilPreCree
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Paramètres de génération d'un code d'accès.
 */
export interface GenerateAccessCodeParams {
  /** Rôle cible (student, teacher ou parent uniquement) */
  role: Extract<Role, 'student' | 'teacher' | 'parent'>
  /** Tenant propriétaire du code */
  universityId: string
  /**
   * ID du profil pré-créé à activer (matricule pour student, pushKey pour teacher).
   * null pour parent (pas de profil pré-créé dans les nœuds académiques).
   */
  targetUserId: string | null
  /**
   * Liste des studentId liés (uniquement si role === 'parent').
   * Permet la liaison multi-enfants dès la génération du code.
   */
  linkedStudentIds?: string[]
  /** UID de l'admin ayant déclenché la génération */
  createdBy: string
  /** Durée de validité en jours (défaut : 7) */
  expirationJours?: number
}

/**
 * Génère un code d'accès unique et le persiste dans Firebase.
 *
 * Écritures Firebase :
 *   - /universities/$universityId/access_codes/$code (source de vérité complète)
 *   - /global_access_codes/$code → { universityId } (index lookup O(1), lecture publique par clé)
 *
 * Isolation multi-tenant :
 *   - Le code encode son tenant via l'index — impossible d'activer un code
 *     sur un autre tenant sans connaître l'universityId exact.
 *
 * @param params - Voir GenerateAccessCodeParams
 * @returns L'AccessCode complet persisté dans Firebase
 */
export async function generateAccessCode(
  params: GenerateAccessCodeParams
): Promise<AccessCode> {
  const {
    role,
    universityId,
    targetUserId,
    linkedStudentIds,
    createdBy,
    expirationJours = 7,
  } = params

  if (!universityId) {
    throw new Error('[generateAccessCode] universityId requis — isolation multi-tenant obligatoire.')
  }
  if (!createdBy) {
    throw new Error('[generateAccessCode] createdBy requis pour la traçabilité RGPD.')
  }
  if (role === 'parent' && (!linkedStudentIds || linkedStudentIds.length === 0)) {
    throw new Error(
      '[generateAccessCode] linkedStudentIds est requis et non vide pour le rôle "parent".'
    )
  }

  const code = await genererCodeUnique()
  const now = Date.now()
  const expiresAt = now + expirationJours * 24 * 60 * 60 * 1000

  const accessCode: AccessCode = {
    code,
    role,
    universityId,
    targetUserId,
    linkedStudentIds: role === 'parent' ? (linkedStudentIds ?? []) : undefined,
    createdBy,
    status: 'unused',
    expiresAt,
    createdAt: now,
    autoRenewed: false,
    renewalCount: 0,
  }

  // Écriture 1 : source de vérité sous le tenant
  await set(
    ref(database, `universities/${universityId}/access_codes/${code}`),
    accessCode
  )

  // Écriture 2 : index global (lecture publique par clé exacte, sans listing)
  await set(ref(database, `global_access_codes/${code}`), { universityId })

  // Audit log
  await ecrireAuditLog(universityId, {
    acteurId: createdBy,
    acteurNom: 'Administrateur',
    acteurRole: 'admin_universite',
    action: 'CODE_ACCES_GENERE',
    cible: targetUserId ?? role,
    detail: `Code d'accès ${code} généré pour le rôle "${role}"${
      targetUserId ? ` (cible: ${targetUserId})` : ''
    }. Expire le ${new Date(expiresAt).toLocaleDateString('fr-FR')}.`,
  })

  return accessCode
}

/**
 * Valide un code d'accès sans le modifier.
 *
 * Algorithme :
 *   1. Lecture /global_access_codes/$code → universityId (public par clé exacte)
 *   2. Lecture /universities/$universityId/access_codes/$code (source de vérité)
 *
 * Ne lève pas d'exception si le code est invalide — retourne null.
 *
 * @param code - Le code au format "GU-XXXX-XXXX"
 * @returns L'AccessCode complet ou null (code inexistant, expiré ou déjà utilisé)
 */
export async function validateAccessCode(code: string): Promise<AccessCode | null> {
  if (!code || !code.startsWith('GU-')) return null

  // Étape 1 : lookup public par clé exacte pour trouver l'université
  const indexSnap = await get(ref(database, `global_access_codes/${code}`))
  if (!indexSnap.exists()) return null

  const { universityId } = indexSnap.val() as { universityId: string }
  if (!universityId) return null

  // Étape 2 : lire la source de vérité sous le tenant
  const codeSnap = await get(
    ref(database, `universities/${universityId}/access_codes/${code}`)
  )
  if (!codeSnap.exists()) return null

  const accessCode = codeSnap.val() as AccessCode

  // Vérifications statiques (ne modifie rien)
  if (accessCode.status !== 'unused') return null
  if (accessCode.expiresAt < Date.now()) return null

  return accessCode
}

/**
 * Paramètres supplémentaires pour l'activation (requis si role === 'parent').
 */
export interface ActivationInfoSup {
  /** Prénom du parent (aucun profil pré-créé pour ce rôle) */
  nom?: string
  /** Nom du parent */
  prenom?: string
}

/**
 * Active un compte utilisateur à partir d'un code d'accès.
 *
 * Flux complet :
 *   1. Valider le code (existence, status, expiration)
 *   2. Lire le profil pré-créé (student/teacher) et vérifier l'email
 *   3. Créer le compte Firebase Auth (email + password)
 *   4. Écrire /users/$uid avec status: 'active'
 *   5. Lier l'uid au profil pré-créé (student/teacher)
 *   6. Marquer le code comme 'used'
 *   7. Si role === 'parent' : créer les ParentStudentLink
 *   8. Écrire les audit logs
 *
 * Isolation multi-tenant :
 *   - L'universityId est résolu depuis l'index, jamais passé en paramètre
 *     par l'utilisateur final → impossible de forcer une activation croisée.
 *
 * @param code     Code d'accès au format "GU-XXXX-XXXX"
 * @param email    Email de l'utilisateur (doit correspondre au profil pré-créé)
 * @param password Mot de passe choisi par l'utilisateur
 * @param infoSup  Requis si role === 'parent' (pas de profil pré-créé)
 * @returns Le User complet activé
 */
export async function activateAccountWithCode(
  code: string,
  email: string,
  password: string,
  infoSup?: ActivationInfoSup
): Promise<User> {
  // ── Étape 1 : Validation du code ──────────────────────────────────────────
  const accessCode = await validateAccessCode(code)
  if (!accessCode) {
    throw new Error(
      "Ce code d'accès est invalide, déjà utilisé ou expiré. " +
        "Contactez votre administrateur pour obtenir un nouveau code."
    )
  }

  const { universityId, role, targetUserId, linkedStudentIds } = accessCode

  // ── Étape 2 : Lecture du profil pré-créé + vérification email ─────────────
  let nomFinal = infoSup?.nom ?? ''
  let prenomFinal = infoSup?.prenom ?? ''
  let matriculeFinal: string | undefined

  if (role === 'student' || role === 'teacher') {
    if (!targetUserId) {
      throw new Error(
        `[activateAccountWithCode] targetUserId requis pour le rôle "${role}".`
      )
    }

    const profil = await lireProfilPreCree(universityId, targetUserId, role)

    // Vérification de correspondance email (sécurité anti-usurpation)
    if (profil.email && profil.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error(
        "L'adresse e-mail saisie ne correspond pas à celle enregistrée " +
          'dans votre dossier. Veuillez contacter votre administrateur.'
      )
    }

    nomFinal = profil.nom
    prenomFinal = profil.prenom
    if (role === 'student') {
      matriculeFinal = profil.matricule ?? targetUserId
    }
  }

  if (role === 'parent' && (!nomFinal || !prenomFinal)) {
    throw new Error(
      '[activateAccountWithCode] nom et prenom requis dans infoSup pour le rôle "parent".'
    )
  }

  // ── Étape 3 : Création du compte Firebase Auth ────────────────────────────
  let uid: string
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    uid = credential.user.uid
  } catch (err: unknown) {
    const firebaseError = err as { code?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurAuth(firebaseError.code))
    }
    throw err
  }

  const now = Date.now()

  // ── Étape 4 : Écriture du profil /users/$uid ──────────────────────────────
  const userProfile: User = {
    uid,
    email,
    role,
    universityId,
    nom: nomFinal,
    prenom: prenomFinal,
    photoURL: null,
    dateCreation: now,
    actif: true,
    status: 'active',
    createdBy: accessCode.createdBy,
    ...(matriculeFinal && { matricule: matriculeFinal }),
    ...(role === 'parent' && linkedStudentIds && { linkedStudentIds }),
    // Compatibilité avec le champ singulier déprécié (premier étudiant)
    ...(role === 'parent' && linkedStudentIds?.[0] && {
      linkedStudentId: linkedStudentIds[0],
    }),
  }

  await set(ref(database, `users/${uid}`), userProfile)

  // ── Étape 5 : Liaison uid → profil pré-créé (student/teacher) ─────────────
  if ((role === 'student' || role === 'teacher') && targetUserId) {
    const nodePath =
      role === 'student'
        ? `universities/${universityId}/students/${targetUserId}`
        : `universities/${universityId}/teachers/${targetUserId}`
    await update(ref(database, nodePath), { uid, actif: true })
  }

  // ── Étape 6 : Marquer le code comme utilisé ───────────────────────────────
  await update(
    ref(database, `universities/${universityId}/access_codes/${code}`),
    {
      status: 'used' as const,
      usedAt: now,
      usedByUid: uid,
    }
  )
  // L'entrée dans global_access_codes est conservée pour l'audit trail.
  // La tentative de réutilisation échoue au niveau de validateAccessCode (status !== 'unused').

  // ── Étape 7 : Création des ParentStudentLink (role === 'parent') ──────────
  if (role === 'parent' && linkedStudentIds && linkedStudentIds.length > 0) {
    const linksRef = ref(
      database,
      `universities/${universityId}/parent_student_links`
    )
    for (const studentId of linkedStudentIds) {
      const newLinkRef = push(linksRef)
      const link: ParentStudentLink = {
        id: newLinkRef.key ?? `link-${uid}-${studentId}`,
        parentUid: uid,
        studentId,
        universityId,
        relationType: 'autre', // L'admin peut mettre à jour ce champ plus tard
        createdAt: now,
        createdBy: accessCode.createdBy,
      }
      await set(newLinkRef, link)
    }
  }

  // ── Étape 8 : Audit logs ──────────────────────────────────────────────────
  await ecrireAuditLog(universityId, {
    acteurId: uid,
    acteurNom: `${prenomFinal} ${nomFinal}`,
    acteurRole: role,
    action: 'CODE_ACCES_UTILISE',
    cible: code,
    detail: `Code d'accès ${code} utilisé avec succès par ${email}.`,
  })

  await ecrireAuditLog(universityId, {
    acteurId: uid,
    acteurNom: `${prenomFinal} ${nomFinal}`,
    acteurRole: role,
    action: 'COMPTE_CREE',
    cible: uid,
    detail: `Activation du compte ${email} via code d'accès (rôle: ${role}).`,
  })

  return userProfile
}

/**
 * Vérifie tous les codes d'accès 'unused' d'un tenant et renouvelle
 * automatiquement ceux qui arrivent à expiration dans moins de 48 h.
 *
 * Algorithme par code expirant :
 *   1. Générer un nouveau code unique
 *   2. Créer le nouvel AccessCode (autoRenewed: true, renewalCount+1, previousCode)
 *   3. Écrire dans global_access_codes (nouveau code → universityId)
 *   4. Mettre l'ancien code en status: 'expired'
 *   5. Supprimer l'ancien code de global_access_codes (plus activable)
 *   6. Audit log RENOUVELE
 *
 * @param universityId - Tenant à vérifier (isolation multi-tenant)
 */
export async function checkAndRenewExpiringCodes(
  universityId: string
): Promise<void> {
  if (!universityId) {
    throw new Error(
      '[checkAndRenewExpiringCodes] universityId requis — isolation multi-tenant obligatoire.'
    )
  }

  const codesRef = ref(database, `universities/${universityId}/access_codes`)
  const snap = await get(codesRef)

  if (!snap.exists()) return

  const now = Date.now()
  const seuilExpiration = now + CODE_SEUIL_RENOUVELLEMENT_MS

  const codesARenouveler: AccessCode[] = []

  snap.forEach((child) => {
    const code = child.val() as AccessCode
    if (
      code.status === 'unused' &&
      code.expiresAt < seuilExpiration
    ) {
      codesARenouveler.push(code)
    }
  })

  if (codesARenouveler.length === 0) return

  const currentUser = auth.currentUser
  const acteurId = currentUser?.uid ?? 'system'

  for (const ancienCode of codesARenouveler) {
    // Générer un nouveau code unique
    const nouveauCode = await genererCodeUnique()
    const nouvelleExpiration = now + CODE_EXPIRATION_PAR_DEFAUT_MS

    const nouvelAccessCode: AccessCode = {
      ...ancienCode,
      code: nouveauCode,
      status: 'unused',
      expiresAt: nouvelleExpiration,
      createdAt: now,
      autoRenewed: true,
      renewalCount: (ancienCode.renewalCount ?? 0) + 1,
      previousCode: ancienCode.code,
    }

    // Écrire le nouveau code dans le tenant
    await set(
      ref(database, `universities/${universityId}/access_codes/${nouveauCode}`),
      nouvelAccessCode
    )

    // Mettre à jour l'index global avec le nouveau code
    await set(
      ref(database, `global_access_codes/${nouveauCode}`),
      { universityId }
    )

    // Invalider l'ancien code (status + suppression de l'index global)
    await update(
      ref(database, `universities/${universityId}/access_codes/${ancienCode.code}`),
      { status: 'expired' as const }
    )
    // Supprimer l'entrée de l'ancien code dans l'index (empêche toute activation résiduelle)
    await set(ref(database, `global_access_codes/${ancienCode.code}`), null)

    // Audit log
    await ecrireAuditLog(universityId, {
      acteurId,
      acteurNom: currentUser ? 'Administrateur' : 'Automate',
      acteurRole: currentUser ? 'admin_universite' : 'system',
      action: 'CODE_ACCES_RENOUVELE',
      cible: ancienCode.targetUserId ?? ancienCode.role,
      detail:
        `Code ${ancienCode.code} remplacé par ${nouveauCode} ` +
        `(renouvellement #${nouvelAccessCode.renewalCount}). ` +
        `Nouvelle expiration : ${new Date(nouvelleExpiration).toLocaleDateString('fr-FR')}.`,
    })
  }
}
