// src/contexts/AuthContext.jsx
// ──────────────────────────────────────────────────────────────
// AuthProvider : écoute Firebase Auth + charge le profil utilisateur
// depuis /users/$uid dans Realtime Database.
// Fournit également le hook useAuth() directement.
// ──────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, database } from '@fb';

/**
 * @typedef {Object} UserProfile
 * @property {string} uid
 * @property {string} email
 * @property {'super_admin_plateforme'|'admin_universite'|'teacher'|'student'|'parent'} role
 * @property {string|null} universityId
 * @property {string} nom
 * @property {string} prenom
 * @property {string|null} photoURL
 */

/** @type {import('react').Context<{currentUser: import('firebase/auth').User|null, userProfile: UserProfile|null, loading: boolean}|null>} */
const AuthContext = createContext(null);

/**
 * AuthProvider — wrapper global.
 * Écoute onAuthStateChanged, puis charge le profil complet
 * depuis /users/$uid dans Realtime Database.
 */
function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileRef = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Cleanup ancien listener profil si existant
      if (profileRef) {
        off(profileRef);
        profileRef = null;
      }

      if (firebaseUser) {
        setCurrentUser(firebaseUser);

        // Charger profil depuis /users/$uid
        profileRef = ref(database, `users/${firebaseUser.uid}`);

        onValue(
          profileRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setUserProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: data.role || null,
                universityId: data.universityId || null,
                nom: data.nom || '',
                prenom: data.prenom || '',
                photoURL: data.photoURL || null,
              });
            } else {
              // Utilisateur auth existe mais pas de profil DB
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('[AuthContext] Erreur lecture profil:', error);
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        // Déconnecté
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup au démontage
    return () => {
      authUnsubscribe();
      if (profileRef) {
        off(profileRef);
      }
    };
  }, []);

  const value = { currentUser, userProfile, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook personnalisé useAuth pour consommer le contexte d'authentification.
 */
function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error(
      'useAuth() doit être utilisé à l\'intérieur d\'un <AuthProvider>. ' +
      'Vérifiez que AuthProvider enveloppe votre arbre de composants.'
    );
  }
  return context;
}

export { AuthContext, AuthProvider, useAuth };
