// src/components/landing/Navbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Navbar — Barre de navigation réutilisable pour les pages publiques.
// Version compacte avec effets de survol vert foncé (Arbor Tech Design System).
// ─────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-arbor-bg/40 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 h-16 flex items-center justify-between">
        
        {/* LOGO (Gauche) - Ajusté en taille */}
        <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-white font-arbor-display">
          <div className="w-8 h-8 bg-gradient-to-br from-arbor-primary to-emerald-600 rounded-lg flex items-center justify-center text-arbor-on-primary font-extrabold shadow-lg shadow-arbor-primary/10 text-sm">
            GU
          </div>
          <span className="hidden sm:inline text-base">GU - Gestion Universitaire</span>
        </div>

        {/* LIENS DE NAVIGATION (Centre) - Rendu plus compact avec hover vert foncé */}
        <div className="hidden md:flex items-center gap-6 font-arbor-body">
          <a className="text-arbor-on-surface-variant hover:text-arbor-primary hover:bg-arbor-secondary-container/20 px-3 py-1.5 rounded text-xs lg:text-sm font-medium transition-all duration-300" href="#features">
            Fonctionnalités
          </a>
          <a className="text-arbor-on-surface-variant hover:text-arbor-primary hover:bg-arbor-secondary-container/20 px-3 py-1.5 rounded text-xs lg:text-sm font-medium transition-all duration-300" href="#pricing">
            Tarifs
          </a>
          <a className="text-arbor-on-surface-variant hover:text-arbor-primary hover:bg-arbor-secondary-container/20 px-3 py-1.5 rounded text-xs lg:text-sm font-medium transition-all duration-300" href="#docs">
            Documentation
          </a>
          <a className="text-arbor-on-surface-variant hover:text-arbor-primary hover:bg-arbor-secondary-container/20 px-3 py-1.5 rounded text-xs lg:text-sm font-medium transition-all duration-300" href="#contact">
            Contact
          </a>
        </div>

        {/* BOUTONS D'ACTION (Droite) - Hover vert foncé cohérent */}
        <div className="flex items-center gap-3 font-arbor-body text-xs lg:text-sm">
          <button className="px-3 py-1.5 rounded text-arbor-on-surface-variant hover:text-arbor-primary hover:bg-arbor-secondary-container/30 font-medium transition-all duration-300 cursor-pointer">
            Se connecter
          </button>
          
          {/* Bouton Essai Gratuit - Devient vert foncé au survol */}
          <button className="px-4 py-2 text-xs lg:text-sm font-semibold text-white bg-white/10 hover:bg-arbor-secondary-container border border-white/20 hover:border-arbor-primary/40 rounded-lg backdrop-blur-sm shadow-md transition-all duration-300 active:scale-95 cursor-pointer">
            Essai gratuit
          </button>
        </div>

      </div>
    </nav>
  );
}
