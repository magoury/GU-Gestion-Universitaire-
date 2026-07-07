// src/services/authService.js
// ──────────────────────────────────────────────────────────────
// Service d'authentification Firebase complet.
// Gère : login, logout, création user avec rôle, reset password.
// Toutes les écritures profil vont dans /users/$uid.
// Traduction complète des codes d'erreur Firebase Auth en français.
// ──────────────────────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '@fb';
import { ecrireAuditLog } from './auditService.js';

/**
 * Traduit les codes d'erreur Firebase Auth en messages français conviviaux.
 * @param {string} code - Le code d'erreur de Firebase (ex: auth/wrong-password)
 * @returns {string} - Le message en français
 */
function traduireErreurFirebase(code) {
  switch (code) {
    case 'auth/invalid-email':
      return "L'adresse e-mail saisie est invalide.";
    case 'auth/user-disabled':
      return "Ce compte utilisateur a été désactivé par l'administrateur.";
    case 'auth/user-not-found':
      return "Aucun utilisateur trouvé avec cette adresse e-mail.";
    case 'auth/wrong-password':
      return "Le mot de passe saisi est incorrect.";
    case 'auth/email-already-in-use':
      return "Cette adresse e-mail est déjà associée à un compte utilisateur.";
    case 'auth/weak-password':
      return "Le mot de passe choisi est trop faible. Il doit contenir au moins 6 caractères.";
    case 'auth/operation-not-allowed':
      return "Cette méthode de connexion n'est pas activée sur la plateforme.";
    case 'auth/invalid-credential':
      return "Identifiants incorrects ou expirés. Veuillez réessayer.";
    case 'auth/too-many-requests':
      return "Trop de tentatives infructueuses. Votre compte a été temporairement bloqué. Réessayez plus tard.";
    case 'auth/network-request-failed':
      return "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion Internet.";
    case 'auth/requires-recent-login':
      return "Cette action nécessite une réauthentification récente. Veuillez vous reconnecter puis réessayer.";
    default:
      return "Une erreur d'authentification est survenue. Veuillez réessayer.";
  }
}

/**
 * Connecte un utilisateur par email/mot de passe.
 * Retourne le profil complet depuis /users/$uid.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ uid: string, email: string, role: string, universityId: string|null, nom: string, prenom: string, photoURL: string|null }>}
 */
async function login(email, password) {
  if (!email || !password) {
    throw new Error('Veuillez renseigner votre email et votre mot de passe.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Charger le profil utilisateur
    const profileRef = ref(database, `users/${uid}`);
    const snapshot = await get(profileRef);

    if (!snapshot.exists()) {
      throw new Error(`Profil utilisateur introuvable pour l'identifiant: ${uid}`);
    }

    const profileData = snapshot.val();

    if (profileData.universityId) {
      await ecrireAuditLog(profileData.universityId, {
        acteurId: uid,
        acteurNom: `${profileData.prenom} ${profileData.nom}`,
        acteurRole: profileData.role,
        action: 'CONNEXION',
        cible: uid,
        detail: `Connexion de l'utilisateur ${email}`,
      });
    }

    return {
      uid,
      email: userCredential.user.email,
      role: profileData.role,
      universityId: profileData.universityId || null,
      nom: profileData.nom || '',
      prenom: profileData.prenom || '',
      photoURL: profileData.photoURL || null,
    };
  } catch (error) {
    if (error.code) {
      throw new Error(traduireErreurFirebase(error.code));
    }
    throw error;
  }
}

/**
 * Déconnecte l'utilisateur courant.
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    if (error.code) {
      throw new Error(traduireErreurFirebase(error.code));
    }
    throw error;
  }
}

/**
 * Retourne l'utilisateur Firebase actuellement connecté.
 * @returns {import('firebase/auth').User|null}
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Crée un nouvel utilisateur avec un rôle et écrit son profil dans /users/$uid.
 *
 * @param {string} email
 * @param {string} password
 * @param {'super_admin_plateforme'|'admin_universite'|'teacher'|'student'|'parent'} role
 * @param {string|null} universityId
 * @param {string} nom
 * @param {string} prenom
 * @param {string|null} [photoURL]
 * @returns {Promise<{ uid: string }>}
 */
async function createUserWithRole(email, password, role, universityId, nom, prenom, photoURL = null) {
  if (!email || !password || !role || !nom || !prenom) {
    throw new Error('Tous les champs requis doivent être renseignés.');
  }

  const rolesValides = ['super_admin_plateforme', 'admin_universite', 'teacher', 'student', 'parent'];
  if (!rolesValides.includes(role)) {
    throw new Error(`Rôle spécifié invalide: ${role}.`);
  }

  // Les rôles tenant nécessitent un universityId
  if (role !== 'super_admin_plateforme' && !universityId) {
    throw new Error(`L'identifiant de l'université (universityId) est requis pour le rôle ${role}.`);
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Écrire le profil complet dans /users/$uid
    const profileRef = ref(database, `users/${uid}`);
    await set(profileRef, {
      email,
      role,
      universityId: universityId || null,
      nom,
      prenom,
      photoURL,
      dateCreation: Date.now(),
      actif: true,
    });

    if (universityId) {
      await ecrireAuditLog(universityId, {
        acteurId: uid,
        acteurNom: `${prenom} ${nom}`,
        acteurRole: role,
        action: 'COMPTE_CREE',
        cible: uid,
        detail: `Création du compte utilisateur avec le rôle ${role}`,
      });
    }

    return { uid };
  } catch (error) {
    if (error.code) {
      throw new Error(traduireErreurFirebase(error.code));
    }
    throw error;
  }
}

/**
 * Envoie un e-mail de réinitialisation de mot de passe.
 * @param {string} email
 * @returns {Promise<void>}
 */
async function resetPassword(email) {
  if (!email) {
    throw new Error('Veuillez renseigner votre adresse e-mail.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error.code) {
      throw new Error(traduireErreurFirebase(error.code));
    }
    throw error;
  }
}

export {
  login,
  logout,
  getCurrentUser,
  createUserWithRole,
  resetPassword,
  traduireErreurFirebase,
};
export default {
  login,
  logout,
  getCurrentUser,
  createUserWithRole,
  resetPassword,
  traduireErreurFirebase,
};
