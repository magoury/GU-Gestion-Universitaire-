// src/components/landing/Navbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Navbar — Barre de navigation réutilisable pour les pages publiques.
// Respecte le style glassmorphic et les tokens "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-arbor-bg/40 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 h-20 flex items-center justify-between">
        
        {/* LOGO (Gauche) */}
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-white font-arbor-display">
          <div className="w-10 h-10 bg-gradient-to-br from-arbor-primary to-emerald-600 rounded-lg flex items-center justify-center text-arbor-on-primary font-extrabold shadow-lg shadow-arbor-primary/10">
            GU
          </div>
          <span className="hidden sm:inline">GU - Gestion Universitaire</span>
        </div>

        {/* LIENS DE NAVIGATION (Centre) */}
        <div className="hidden md:flex items-center gap-8 font-arbor-body">
          <a className="text-arbor-on-surface-variant hover:text-white text-sm font-medium transition-colors" href="#features">
            Fonctionnalités
          </a>
          <a className="text-arbor-on-surface-variant hover:text-white text-sm font-medium transition-colors" href="#pricing">
            Tarifs
          </a>
          <a className="text-arbor-on-surface-variant hover:text-white text-sm font-medium transition-colors" href="#docs">
            Documentation
          </a>
          <a className="text-arbor-on-surface-variant hover:text-white text-sm font-medium transition-colors" href="#contact">
            Contact
          </a>
        </div>

        {/* BOUTONS D'ACTION (Droite) */}
        <div className="flex items-center gap-4 font-arbor-body">
          <button className="px-4 py-2 text-sm font-medium text-arbor-on-surface-variant hover:text-white transition-colors cursor-pointer">
            Se connecter
          </button>
          
          {/* Bouton Essai Gratuit en style glassmorphic */}
          <button className="px-5 py-2.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg backdrop-blur-sm shadow-lg transition-all duration-300 active:scale-95 cursor-pointer">
            Essai gratuit
          </button>
        </div>

      </div>
    </nav>
  );
}
