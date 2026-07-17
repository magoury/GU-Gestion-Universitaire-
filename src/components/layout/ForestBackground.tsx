// src/components/layout/ForestBackground.tsx
// ──────────────────────────────────────────────────────────────
// Composant d'arrière-plan avec dégradé sombre de forêt.
// Utilisé dans les pages d'authentification et les dashboards.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';

export function ForestBackground() {
  const containerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #041710 0%, #0a2318 30%, #0d2d1e 60%, #041710 100%)',
  }), []);

  const overlayStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(4, 23, 16, 0.4)',
    pointerEvents: 'none',
  }), []);

  return (
    <div style={containerStyle} aria-hidden="true" className="select-none pointer-events-none">
      {/* Texture SVG subtile de forêt */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.03] text-[#95D4B3]" 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="forestPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 2 L14 10 L12 10 L16 15 L11 15 L11 18 L9 18 L9 15 L4 15 L8 10 L6 10 Z" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#forestPattern)" />
      </svg>
      <div style={overlayStyle} />
    </div>
  );
}

export default ForestBackground;
