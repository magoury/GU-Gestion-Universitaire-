// src/contexts/TenantContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TenantProvider : charge la configuration de l'université (tenant)
// depuis /universities/$universityId/config/ en temps réel.
// Dépend de AuthContext pour obtenir universityId.
// Exporte également le hook useTenant() directement.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from './AuthContext';
import type { UniversityConfig } from '../types/university.types';

/**
 * Interface exposée par le contexte du tenant.
 */
export interface TenantContextValue {
  /** L'identifiant de l'université active (null pour super_admin_plateforme ou non connecté). */
  universityId: string | null;

  /** La configuration de l'université active. */
  universityConfig: UniversityConfig | null;

  /** Indique si le chargement de la configuration du tenant est en cours. */
  loadingTenant: boolean;

  /**
   * Indique si l'université active est actuellement suspendue par l'administration du SaaS.
   * Calculé à partir du statut `actif === false` de la configuration du tenant.
   * Ce statut doit être exploité par les gardes de route pour restreindre l'accès client.
   */
  estSuspendu: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  children: ReactNode;
}

/**
 * TenantProvider — charge la configuration de l'université pour le tenant actif.
 * Ne fait rien si l'utilisateur connecté est un super admin de la plateforme.
 */
export function TenantProvider({ children }: TenantProviderProps) {
  const { userProfile } = useAuth();
  const [universityConfig, setUniversityConfig] = useState<UniversityConfig | null>(null);
  const [loadingTenant, setLoadingTenant] = useState<boolean>(true);

  const universityId = userProfile?.universityId || null;
  const role = userProfile?.role || null;

  useEffect(() => {
    // Le Super Admin de la plateforme n'a pas de tenant particulier
    if (role === 'super_admin_plateforme') {
      setUniversityConfig(null);
      setLoadingTenant(false);
      return;
    }

    // Pas encore de universityId disponible (utilisateur non connecté ou en cours de chargement)
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
          setUniversityConfig(snapshot.val() as UniversityConfig);
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
      unsubscribe();
    };
  }, [universityId, role]);

  // Si l'université active a son indicateur `actif` explicitement à false, elle est suspendue.
  const estSuspendu = universityConfig ? universityConfig.actif === false : false;

  const value: TenantContextValue = {
    universityId,
    universityConfig,
    loadingTenant,
    estSuspendu,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook personnalisé useTenant pour consommer le contexte du tenant.
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context === null) {
    throw new Error(
      "useTenant() doit être utilisé à l'intérieur d'un <TenantProvider>. " +
      "Vérifiez que TenantProvider enveloppe votre arbre de composants."
    );
  }
  return context;
}
