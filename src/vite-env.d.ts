/// <reference types="vite/client" />

/**
 * Typage strict des variables d'environnement Vite.
 *
 * Toutes les variables VITE_FIREBASE_* sont déclarées en `readonly string`
 * afin que TypeScript garantisse leur présence et leur type lors de la
 * migration progressive des fichiers JS → TS (notamment firebase.js → firebase.ts).
 *
 * ⚠️  Ne JAMAIS exposer les valeurs réelles ici — ce fichier est versionné.
 *     Les valeurs restent exclusivement dans .env (non versionné).
 */

interface ImportMetaEnv {
  // ── Firebase Configuration ─────────────────────────────────────────────────
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_DATABASE_URL: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
