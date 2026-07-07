// src/components/ui/LogoGU.jsx
// ──────────────────────────────────────────────────────────────
// Logo GU — Gestion Universitaire
// Intègre un icône temple (bâtiment) dans un cercle vert
// et les polices du design system.
// ──────────────────────────────────────────────────────────────

import { useMemo } from 'react';

const TAILLES = {
  xs: { cercle: 24, icone: '12px', sigle: '1.1rem', texte: '0.55rem', gap: '3px' },
  sm: { cercle: 28, icone: '14px', sigle: '1.25rem', texte: '0.65rem', gap: '4px' },
  md: { cercle: 40, icone: '20px', sigle: '1.75rem', texte: '0.75rem', gap: '8px' },
  lg: { cercle: 56, icone: '28px', sigle: '2.5rem', texte: '0.9rem', gap: '12px' },
};

/**
 * @param {{ size?: 'xs'|'sm'|'md'|'lg', onClick?: () => void, clickable?: boolean, showSubtext?: boolean }} props
 */
function LogoGU({ size = 'md', onClick, clickable = false, showSubtext = true }) {
  const taille = useMemo(() => TAILLES[size] || TAILLES.md, [size]);

  const estCliquable = clickable || !!onClick;

  const conteneurStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: taille.gap,
    cursor: estCliquable ? 'pointer' : 'default',
    userSelect: 'none',
  }), [taille.gap, estCliquable]);

  const cercleStyle = useMemo(() => ({
    width: `${taille.cercle}px`,
    height: `${taille.cercle}px`,
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  }), [taille.cercle]);

  const texteConteneurStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }), []);

  const sigleStyle = useMemo(() => ({
    fontSize: taille.sigle,
    fontWeight: 700,
    color: '#EEC058',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontFamily: "'Playfair Display', Georgia, serif",
  }), [taille.sigle]);

  const descriptionStyle = useMemo(() => ({
    fontSize: taille.texte,
    fontWeight: 500,
    color: '#95D4B3',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
    lineHeight: 1.2,
    marginTop: '2px',
  }), [taille.texte]);

  return (
    <div
      style={conteneurStyle}
      onClick={onClick}
      role={estCliquable ? 'button' : undefined}
      tabIndex={estCliquable ? 0 : undefined}
      onKeyDown={estCliquable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
    >
      {/* Icône Temple dans Cercle */}
      <div style={cercleStyle}>
        <svg
          width={taille.icone}
          height={taille.icone}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#EEC058"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 8-4 8 4" />
          <path d="m18 10 1-4H5l1 4" />
          <path d="M14 10v4" />
          <path d="M10 10v4" />
          <path d="M18 14H6" />
          <path d="M22 22H2" />
          <path d="M20 22v-4H4v4" />
          <path d="M12 18v-4" />
        </svg>
      </div>

      <div style={texteConteneurStyle}>
        <span style={sigleStyle}>GU</span>
        {size !== 'sm' && size !== 'xs' && showSubtext && (
          <span style={descriptionStyle}>Gestion Universitaire</span>
        )}
      </div>
    </div>
  );
}

export default LogoGU;
