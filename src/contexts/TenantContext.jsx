// src/contexts/TenantContext.jsx
// ──────────────────────────────────────────────────────────────
// TenantProvider : charge la configuration de l'université
// depuis /universities/$universityId/config/ en temps réel.
// Dépend de AuthContext pour obtenir universityId.
// Exporte également le hook useTenant() directement.
// ──────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from './AuthContext';

/** @type {import('react').Context<{universityId: string|null, universityConfig: Object|null, loadingTenant: boolean}|null>} */
const TenantContext = createContext(null);

/**
 * TenantProvider — charge la config université.
 * Ne fait rien si le user est super_admin_plateforme (pas de tenant).
 */
function TenantProvider({ children }) {
  const { userProfile } = useAuth();
  const [universityConfig, setUniversityConfig] = useState(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  const universityId = userProfile?.universityId || null;
  const role = userProfile?.role || null;

  useEffect(() => {
    // Super admin n'a pas de tenant
    if (role === 'super_admin_plateforme') {
      setUniversityConfig(null);
      setLoadingTenant(false);
      return;
    }

    // Pas encore de universityId → on attend
    if (!universityId) {
      setUniversityConfig(null);
      setLoadingTenant(false);
      return;
    }

    setLoadingTenant(true);

    const configRef = ref(database, `universities/${universityId}/config`);

    const unsubscribe = onValue(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUniversityConfig(snapshot.val());
        } else {
          setUniversityConfig(null);
        }
        setLoadingTenant(false);
      },
      (error) => {
        console.error('[TenantContext] Erreur chargement config:', error);
        setUniversityConfig(null);
        setLoadingTenant(false);
      }
    );

    return () => {
      off(configRef);
    };
  }, [universityId, role]);

  const value = { universityId, universityConfig, loadingTenant };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook personnalisé useTenant pour consommer le contexte du tenant.
 */
function useTenant() {
  const context = useContext(TenantContext);
  if (context === null) {
    throw new Error(
      'useTenant() doit être utilisé à l\'intérieur d\'un <TenantProvider>. ' +
      'Vérifiez que TenantProvider enveloppe votre arbre de composants.'
    );
  }
  return context;
}

export { TenantContext, TenantProvider, useTenant };
