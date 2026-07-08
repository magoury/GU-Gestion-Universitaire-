import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getDatabase, ref } from "firebase/database";
import type { Database, DatabaseReference } from "firebase/database";

/**
 * Configuration Firebase — valeurs injectées par Vite depuis .env.
 * Les types sont garantis par src/vite-env.d.ts (ImportMetaEnv).
 */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ── Initialisation Firebase ────────────────────────────────────────────────────
const app: FirebaseApp   = initializeApp(firebaseConfig);
const analytics: Analytics = getAnalytics(app);
const auth: Auth           = getAuth(app);
const database: Database   = getDatabase(app);

// ── Helpers multi-tenant (isolation par universityId) ─────────────────────────

/**
 * Retourne la référence Realtime Database racine d'une université.
 * ⚠️  Toute lecture/écriture inter-tenant est impossible par construction :
 *     le chemin est strictement délimité par universityId.
 */
const getUniversityRef = (universityId: string): DatabaseReference =>
  ref(database, `universities/${universityId}`);

/**
 * Retourne la référence Realtime Database d'un utilisateur.
 * Utilisé pour les profils et préférences individuelles (toutes universités).
 */
const getUserRef = (uid: string): DatabaseReference =>
  ref(database, `users/${uid}`);

export { app, analytics, auth, database, getUniversityRef, getUserRef };
