// src/hooks/useFirebaseData.js
// ──────────────────────────────────────────────────────────────
// Hook d'accès aux données Firebase en temps réel.
// Isolation multi-tenant stricte : universityId requis.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@fb';

/**
 * Hook useFirebaseData
 * Écoute en temps réel les données de la base Realtime Database
 * sous le chemin : /universities/{universityId}/{path}
 *
 * @param {string} path - Le chemin relatif dans les données du tenant
 * @param {string|null} universityId - L'identifiant de l'université
 * @returns {{ data: any, loading: boolean, error: Error|null }}
 */
function useFirebaseData(path, universityId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si pas de tenant ou de chemin, ne fait rien (isolation et sécurité)
    if (!universityId || !path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const fullPath = `universities/${universityId}/${path}`;
    const dbRef = ref(database, fullPath);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData(snapshot.val());
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[useFirebaseData] Erreur de lecture sur ${fullPath}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(dbRef);
    };
  }, [path, universityId]);

  return { data, loading, error };
}

export { useFirebaseData };
export default useFirebaseData;
