// src/components/ui/ConfirmationModal.tsx
// ──────────────────────────────────────────────────────────────
// Modale de confirmation générique et accessible.
// Variantes : danger (destructive), success (positive), info (neutre).
// ──────────────────────────────────────────────────────────────



interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'success' | 'info';
  loading?: boolean;
}

export function ConfirmationModal({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false
}: ConfirmationModalProps) {
  const buttonColorClass = {
    danger: 'bg-error hover:bg-error/80 text-white',
    success: 'bg-success hover:bg-success/80 text-white',
    info: 'bg-primary hover:bg-primary/80 text-white'
  }[variant];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-lg p-5 max-w-sm w-full flex flex-col gap-4 animate-scale-up">
        <div>
          <h3 className="font-semibold text-sm text-on-surface">{title}</h3>
          <p className="text-[10px] text-on-surface-muted mt-1 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={loading}
            className="btn btn-sm btn-ghost h-8 px-3 text-xs border border-white/10"
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            onClick={() => void onConfirm()} 
            disabled={loading}
            className={`btn btn-sm h-8 px-3 text-xs border-none flex items-center gap-1.5 ${buttonColorClass}`}
          >
            {loading && <span className="loading loading-spinner loading-xs text-current animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
