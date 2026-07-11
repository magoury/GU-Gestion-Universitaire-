// src/services/authService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service d'authentification Firebase — version TypeScript strict.
// Migré depuis authService.js (M2) — comportement runtime INCHANGÉ.
//
// Gère :
//   - login / logout / getCurrentUser / resetPassword
//   - createUserWithRole (self-service uniquement pour admin_universite)
//   - Ré-exporte les fonctions du système d'activation par code
//     (generateAccessCode, activateAccountWithCode, validateAccessCode,
//      checkAndRenewExpiringCodes) depuis accessCodeService.ts
//
// Les composants .jsx importent depuis 'authService.js' — la résolution
// Vite/TS trouve ce fichier .ts en priorité (allowJs + moduleResolution Bundler).
// ─────────────────────────────────────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, database } from '@fb'
import type { Role, UserProfile } from '@/types'
import { ecrireAuditLog } from './auditService.js'

// ── Ré-exports du système d'activation par code ───────────────────────────────
// Les composants qui importent depuis authService.js continuent de fonctionner.

export type {
  GenerateAccessCodeParams,
  ActivationInfoSup,
} from './accessCodeService.js'

export {
  generateAccessCode,
  activateAccountWithCode,
  validateAccessCode,
  checkAndRenewExpiringCodes,
} from './accessCodeService.js'

// ── Traduction des erreurs Firebase Auth ─────────────────────────────────────

/**
 * Traduit les codes d'erreur Firebase Auth en messages français conviviaux.
 *
 * AVANT : function traduireErreurFirebase(code) { … }
 * APRÈS : function traduireErreurFirebase(code: string): string { … }
 */
export function traduireErreurFirebase(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return "L'adresse e-mail saisie est invalide."
    case 'auth/user-disabled':
      return "Ce compte utilisateur a été désactivé par l'administrateur."
    case 'auth/user-not-found':
      return 'Aucun utilisateur trouvé avec cette adresse e-mail.'
    case 'auth/wrong-password':
      return 'Le mot de passe saisi est incorrect.'
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte utilisateur.'
    case 'auth/weak-password':
      return 'Le mot de passe choisi est trop faible. Il doit contenir au moins 6 caractères.'
    case 'auth/operation-not-allowed':
      return "Cette méthode de connexion n'est pas activée sur la plateforme."
    case 'auth/invalid-credential':
      return 'Identifiants incorrects ou expirés. Veuillez réessayer.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Votre compte a été temporairement bloqué. Réessayez plus tard.'
    case 'auth/network-request-failed':
      return "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion Internet."
    case 'auth/requires-recent-login':
      return 'Cette action nécessite une réauthentification récente. Veuillez vous reconnecter puis réessayer.'
    case 'auth/popup-closed-by-user':
      return "La fenêtre de connexion Google a été fermée avant la fin de l'authentification."
    case 'auth/account-exists-with-different-credential':
      return "Un compte existe déjà avec cette adresse email mais utilise une autre méthode de connexion (ex: mot de passe)."
    default:
      return "Une erreur d'authentification est survenue. Veuillez réessayer."
  }
}

// ── login ─────────────────────────────────────────────────────────────────────

/**
 * Connecte un utilisateur par email/mot de passe.
 * Charge et retourne le profil complet depuis /users/$uid.
 * Écrit un log d'audit CONNEXION si l'utilisateur appartient à un tenant.
 *
 * AVANT : async function login(email, password) { … } → retour implicite
 * APRÈS : paramètres et retour explicitement typés
 *
 * @param email    - Adresse e-mail de connexion
 * @param password - Mot de passe
 * @returns Le profil utilisateur complet (UserProfile)
 */
export async function login(email: string, password: string): Promise<UserProfile> {
  if (!email || !password) {
    throw new Error('Veuillez renseigner votre email et votre mot de passe.')
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const uid = userCredential.user.uid

    const profileRef = ref(database, `users/${uid}`)
    const snapshot = await get(profileRef)

    if (!snapshot.exists()) {
      throw new Error(`Profil utilisateur introuvable pour l'identifiant: ${uid}`)
    }

    const profileData = snapshot.val() as Record<string, unknown>

    if (profileData.universityId) {
      await ecrireAuditLog(profileData.universityId as string, {
        acteurId: uid,
        acteurNom: `${profileData.prenom} ${profileData.nom}`,
        acteurRole: profileData.role as string,
        action: 'CONNEXION',
        cible: uid,
        detail: `Connexion de l'utilisateur ${email}`,
      })
    }

    return {
      uid,
      email: userCredential.user.email,
      role: profileData.role as Role,
      universityId: (profileData.universityId as string) || null,
      nom: (profileData.nom as string) || '',
      prenom: (profileData.prenom as string) || '',
      photoURL: (profileData.photoURL as string) || null,
    }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurFirebase(firebaseError.code))
    }
    throw error
  }
}

// ── logout ────────────────────────────────────────────────────────────────────

/**
 * Déconnecte l'utilisateur courant de Firebase Auth.
 *
 * AVANT : async function logout() { … }
 * APRÈS : retour Promise<void> explicite
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurFirebase(firebaseError.code))
    }
    throw error
  }
}

// ── getCurrentUser ─────────────────────────────────────────────────────────────

/**
 * Retourne l'utilisateur Firebase Auth actuellement connecté, ou null.
 *
 * AVANT : function getCurrentUser() { return auth.currentUser; }
 * APRÈS : retour FirebaseUser | null explicite
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

// ── createUserWithRole ────────────────────────────────────────────────────────

/**
 * Crée un compte Firebase Auth avec un rôle et écrit le profil dans /users/$uid.
 *
 * ⚠️  Ce flux self-service reste UNIQUEMENT pour admin_universite (onboarding).
 *     Pour student / teacher / parent, utiliser generateAccessCode() +
 *     activateAccountWithCode() à la place (règle métier M2).
 *
 * AVANT : async function createUserWithRole(email, password, role, universityId, nom, prenom, photoURL = null)
 * APRÈS : tous les paramètres typés avec Role et string
 *
 * @param email        - Email du compte à créer
 * @param password     - Mot de passe initial
 * @param role         - Rôle attribué au compte
 * @param universityId - Tenant (null pour super_admin_plateforme)
 * @param nom          - Nom de famille
 * @param prenom       - Prénom
 * @param photoURL     - URL photo de profil (optionnel)
 * @returns { uid } — identifiant du compte créé
 */
export async function createUserWithRole(
  email: string,
  password: string,
  role: Role,
  universityId: string | null,
  nom: string,
  prenom: string,
  photoURL: string | null = null
): Promise<{ uid: string }> {
  if (!email || !password || !role || !nom || !prenom) {
    throw new Error('Tous les champs requis doivent être renseignés.')
  }

  const rolesValides: Role[] = [
    'super_admin_plateforme',
    'admin_universite',
    'teacher',
    'student',
    'parent',
  ]
  if (!rolesValides.includes(role)) {
    throw new Error(`Rôle spécifié invalide: ${role}.`)
  }

  if (role !== 'super_admin_plateforme' && !universityId) {
    throw new Error(
      `L'identifiant de l'université (universityId) est requis pour le rôle ${role}.`
    )
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const uid = userCredential.user.uid

    const profileRef = ref(database, `users/${uid}`)
    await set(profileRef, {
      email,
      role,
      universityId: universityId ?? null,
      nom,
      prenom,
      photoURL,
      dateCreation: Date.now(),
      actif: true,
    })

    if (universityId) {
      await ecrireAuditLog(universityId, {
        acteurId: uid,
        acteurNom: `${prenom} ${nom}`,
        acteurRole: role,
        action: 'COMPTE_CREE',
        cible: uid,
        detail: `Création du compte utilisateur avec le rôle ${role}`,
      })
    }

    return { uid }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurFirebase(firebaseError.code))
    }
    throw error
  }
}

// ── resetPassword ─────────────────────────────────────────────────────────────

/**
 * Envoie un email de réinitialisation de mot de passe.
 *
 * AVANT : async function resetPassword(email) { … }
 * APRÈS : email: string, retour Promise<void>
 *
 * @param email - Adresse e-mail du compte
 */
export async function resetPassword(email: string): Promise<void> {
  if (!email) {
    throw new Error('Veuillez renseigner votre adresse e-mail.')
  }

  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurFirebase(firebaseError.code))
    }
    throw error
  }
}

// ── Google Sign-In ────────────────────────────────────────────────────────────

export type GoogleAuthResult =
  | UserProfile
  | {
      isNewUser: true
      email: string
      uid: string
      displayName: string | null
      photoURL: string | null
    }

/**
 * Connecte ou inscrit un utilisateur via Google Sign-In (Popup).
 * Applique des règles de validation strictes :
 *   1. Si onboarding (isRegistration=true) : vérifie si un profil existe déjà pour
 *      éviter d'écraser un tenant existant (si oui, retourne le profil existant).
 *   2. Si connexion (isRegistration=false) :
 *      - Rejette immédiatement (signOut) si le rôle est student, teacher ou parent
 *        (connexion Google réservée aux admins).
 *      - Rejette si l'université de l'utilisateur est suspendue.
 *      - Rejette si aucun compte n'est associé à cette adresse Google.
 *
 * @param isRegistration - Indique si l'action est menée dans le tunnel d'onboarding
 */
export async function signInWithGooglePopup(
  isRegistration: boolean = false
): Promise<GoogleAuthResult> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  try {
    const userCredential = await signInWithPopup(auth, provider)
    const user = userCredential.user
    const uid = user.uid

    // Vérifier l'existence du profil dans la base de données
    const profileRef = ref(database, `users/${uid}`)
    const snapshot = await get(profileRef)

    if (snapshot.exists()) {
      const profileData = snapshot.val() as Record<string, unknown>
      const role = profileData.role as Role
      const universityId = (profileData.universityId as string) || null

      if (!isRegistration) {
        // Garde 2 : Restriction de rôle sur le LOGIN
        const rolesInterdits: Role[] = ['student', 'teacher', 'parent']
        if (rolesInterdits.includes(role)) {
          await signOut(auth)

          if (universityId) {
            await ecrireAuditLog(universityId, {
              acteurId: uid,
              acteurNom: `${profileData.prenom} ${profileData.nom}`,
              acteurRole: role,
              action: 'CONNEXION_REFUSEE',
              cible: uid,
              detail: `Tentative de connexion via Google par un ${role} (Google réservé aux administrateurs).`,
            })
          }

          throw new Error(
            'Connexion Google non autorisée pour votre rôle. Veuillez utiliser la connexion standard avec vos identifiants.'
          )
        }

        // Vérifier si l'université de l'admin est suspendue
        if (universityId) {
          const statusSnapshot = await get(ref(database, `saas_admin/universites/${universityId}/statut`))
          if (statusSnapshot.exists() && statusSnapshot.val() === 'suspendu') {
            await signOut(auth)
            throw new Error(
              'Accès refusé. Cette université a été temporairement suspendue par la plateforme.'
            )
          }
        }
      }

      // Retourner le profil complet existant
      return {
        uid,
        email: user.email,
        role,
        universityId,
        nom: (profileData.nom as string) || '',
        prenom: (profileData.prenom as string) || '',
        photoURL: (profileData.photoURL as string) || null,
      }
    } else {
      // Le profil n'existe pas en base de données

      // Garde 3 :LoginPage et aucun profil existant
      if (!isRegistration) {
        await signOut(auth)
        throw new Error(
          "Aucun compte associé à cette adresse Google. Utilisez le tunnel d'inscription si vous souhaitez inscrire une nouvelle université."
        )
      }

      // Cas 1 : Onboarding et nouveau compte
      return {
        isNewUser: true,
        email: user.email || '',
        uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }
    }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    if (firebaseError.code) {
      throw new Error(traduireErreurFirebase(firebaseError.code))
    }
    throw error
  }
}

// ── Export default (compatibilité composants .jsx existants) ──────────────────
// Les 7 fichiers .jsx qui importent depuis 'authService.js' utilisent
// soit les named exports ci-dessus, soit le default export ci-dessous.

export default {
  login,
  logout,
  getCurrentUser,
  createUserWithRole,
  resetPassword,
  signInWithGooglePopup,
  traduireErreurFirebase,
}
