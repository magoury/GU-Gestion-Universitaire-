// src/contexts/AuthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider : Écoute l'état d'authentification de Firebase Auth et charge
// le profil utilisateur correspondant depuis /users/$uid dans Realtime Database.
//
// 🔐 ANOMALIE DE SÉCURITÉ :
// Si un compte authentifié a un statut 'pending' (non activé par code d'accès),
// cela représente une anomalie. L'utilisateur est déconnecté immédiatement,
// un log d'audit 'CONNEXION_REFUSEE' est créé, et son accès est rejeté.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, database } from '@fb';
import { ecrireAuditLog } from '../services/auditService.js';
import type { UserProfile } from '../types/user.types';

/**
 * Interface exposée par le contexte d'authentification.
 */
export interface AuthContextValue {
  /** L'utilisateur Firebase Auth canonique. */
  currentUser: FirebaseUser | null;

  /**
   * Alias de currentUser pour compatibilité descendante.
   * @deprecated Dette technique - Utiliser currentUser à la place. Sera supprimé en M12.
   */
  user: FirebaseUser | null;

  /** Le profil utilisateur complet stocké dans la base du tenant. */
  userProfile: UserProfile | null;

  /** État de chargement initial. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — Wrapper global de l'application.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let profileRef: any = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Nettoyage de l'ancien écouteur si existant
      if (profileRef) {
        off(profileRef);
        profileRef = null;
      }

      if (firebaseUser) {
        // Enregistrer temporairement le user Firebase Auth
        setCurrentUser(firebaseUser);

        profileRef = ref(database, `users/${firebaseUser.uid}`);

        onValue(
          profileRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();

              // 🔐 Alerte Sécurité : Cas accountStatus/status === 'pending'
              // Un utilisateur connecté ne doit pas avoir un profil 'pending'.
              // C'est une anomalie de contournement du flux d'activation par code d'accès.
              if (data.status === 'pending' || data.accountStatus === 'pending') {
                const universityId = data.universityId || 'system';
                console.error(
                  `[AuthContext] Anomalie de sécurité détectée : Tentative de connexion avec un compte au statut 'pending' (UID: ${firebaseUser.uid}).`
                );

                // Écriture d'un log d'audit d'anomalie
                try {
                  await ecrireAuditLog(universityId, {
                    acteurId: firebaseUser.uid,
                    acteurNom: `${data.prenom || ''} ${data.nom || ''}`.trim() || 'Utilisateur Suspect',
                    acteurRole: data.role || 'student',
                    action: 'CONNEXION_REFUSEE',
                    cible: firebaseUser.uid,
                    detail: `Connexion refusée : compte au statut 'pending' (non activé via code d'accès). Déconnexion automatique forcée.`,
                  });
                } catch (auditError) {
                  console.error('[AuthContext] Échec de l\'écriture du log d\'audit d\'anomalie:', auditError);
                }

                // Déconnexion forcée et nettoyage immédiat des états
                setCurrentUser(null);
                setUserProfile(null);
                setLoading(false);
                await signOut(auth);
                return;
              }

              // Profil valide et actif
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
              // Firebase Auth existe mais pas de profil utilisateur en base
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
        // Déconnecté : Nettoyage complet
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

  const value: AuthContextValue = {
    currentUser,
    user: currentUser, // Alias pour compatibilité
    userProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook personnalisé useAuth pour consommer le contexte d'authentification.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error(
      "useAuth() doit être utilisé à l'intérieur d'un <AuthProvider>. " +
      "Vérifiez que AuthProvider enveloppe votre arbre de composants."
    );
  }
  return context;
}
