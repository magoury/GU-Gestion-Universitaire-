// src/components/ui/KPICard.tsx
// ──────────────────────────────────────────────────────────────
// Carte KPI réutilisable pour l'overview et statistiques.
// Supporte l'injection de children (progress bars, badges etc.).
// ──────────────────────────────────────────────────────────────

import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  variant?: 'accent' | 'primary' | 'success' | 'warning' | 'error' | 'default' | 'none';
  children?: ReactNode;
}

export function KPICard({
  label,
  value,
  sub,
  icon,
  variant = 'default',
  children
}: KPICardProps) {
  const valueColorClass = {
    accent: 'text-accent',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    default: 'text-accent',
    none: 'text-on-surface'
  }[variant];

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-3 w-full">
        <div>
          <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">{label}</div>
          <div className={`text-xl font-bold font-display mt-1 ${valueColorClass}`}>{value}</div>
          {sub && <span className="text-[9px] text-on-surface-muted/60 block mt-0.5">{sub}</span>}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-md bg-surface-high border border-white/5 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {children && <div className="w-full mt-1">{children}</div>}
    </div>
  );
}

export default KPICard;
