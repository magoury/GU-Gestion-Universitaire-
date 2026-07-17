// src/components/ui/StatusBadge.tsx
// ──────────────────────────────────────────────────────────────
// Badge de statut réutilisable à variantes multiples.
// Gère de manière intelligente l'association automatique des couleurs.
// ──────────────────────────────────────────────────────────────



interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'ghost' | 'default';
  customClass?: string;
}

export function StatusBadge({ status, variant = 'default', customClass = "" }: StatusBadgeProps) {
  let computedVariant = variant;
  if (variant === 'default') {
    const s = status.toLowerCase();
    if (['actif', 'active', 'valide', 'validé', 'paye', 'payé', 'a_jour', 'a-jour', 'success'].includes(s)) {
      computedVariant = 'success';
    } else if (['suspendu', 'inactive', 'ajourne', 'ajourné', 'bloque', 'bloqué', 'impaye', 'impayé', 'retard', 'error'].includes(s)) {
      computedVariant = 'error';
    } else if (['essai', 'pending', 'attente', 'en_cours', 'en-cours', 'warning'].includes(s)) {
      computedVariant = 'warning';
    } else {
      computedVariant = 'ghost';
    }
  }

  const badgeClass = {
    success: 'badge-success text-white',
    error: 'badge-error text-white',
    warning: 'badge-warning text-black',
    info: 'badge-info text-white',
    ghost: 'badge-ghost',
    default: 'badge-ghost'
  }[computedVariant];

  const formatStatus = (s: string) => {
    if (s === 'a_jour') return 'À jour';
    if (s === 'en_cours') return 'En cours';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <span className={`badge badge-xs text-[9px] font-semibold py-1.5 px-2 ${badgeClass} ${customClass}`}>
      {formatStatus(status)}
    </span>
  );
}

export default StatusBadge;
