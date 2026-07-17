// src/components/ui/LoadingSpinner.tsx
// ──────────────────────────────────────────────────────────────
// Composant de chargement réutilisable (spinner).
// Supporte les modes centré flex ou inline pour les boutons.
// ──────────────────────────────────────────────────────────────



interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  message?: string;
  textColor?: string;
  inline?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  message,
  textColor = 'text-accent',
  inline = false
}: LoadingSpinnerProps) {
  const sizeClass = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg'
  }[size];

  const spinner = (
    <span className={`loading loading-spinner ${sizeClass} ${textColor} animate-spin`} />
  );

  if (inline) {
    return spinner;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4">
      {spinner}
      {message && <span className="text-on-surface-muted text-[10px]">{message}</span>}
    </div>
  );
}

export default LoadingSpinner;
