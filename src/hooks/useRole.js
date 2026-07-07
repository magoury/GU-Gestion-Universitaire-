// src/hooks/useRole.js
// ──────────────────────────────────────────────────────────────
// Hook d'évaluation du rôle de l'utilisateur.
// Fournit le rôle brut et des helpers booléens pratiques.
// ──────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

/**
 * Hook useRole
 * @returns {{
 *   role: 'super_admin_plateforme'|'admin_universite'|'teacher'|'student'|'parent'|null,
 *   isSuperAdmin: boolean,
 *   isAdmin: boolean,
 *   isTeacher: boolean,
 *   isStudent: boolean,
 *   isParent: boolean
 * }}
 */
function useRole() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || null;

  const helpers = useMemo(() => ({
    role,
    isSuperAdmin: role === 'super_admin_plateforme',
    isAdmin: role === 'admin_universite',
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
    isParent: role === 'parent',
  }), [role]);

  return helpers;
}

export { useRole };
export default useRole;
