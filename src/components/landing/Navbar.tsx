// src/components/landing/Navbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Navbar — Barre de navigation réutilisable en format pilule flottante.
// Comporte un menu mobile interactif dépliable en hauteur (accordéon vertical).
// Conforme au design system "Arbor Tech" (glassmorphism, accent teal).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const handleScrollTo = (id: string) => {
    setIsOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative z-30 w-full px-4 pt-6">
      {/* Conteneur principal en format pilule flottante */}
      <div
        className={`max-w-5xl mx-auto transition-all duration-300 bg-arbor-surface/70 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 ${
          isOpen ? 'rounded-2xl p-5' : 'rounded-full h-12 px-3 py-1 flex items-center justify-between'
        }`}
      >
        <div className="flex items-center justify-between w-full h-full">
          {/* LOGO (Gauche) - Cercle plein teal avec initiales */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-arbor-primary flex items-center justify-center text-arbor-on-primary font-black shadow-md shadow-arbor-primary/20 text-xs select-none">
              GU
            </div>
            <span className="hidden sm:inline text-white font-bold text-xs tracking-tight font-arbor-display">
              GU - Gestion Universitaire
            </span>
          </div>

          {/* LIENS DE NAVIGATION (Centre - Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 font-arbor-body text-xs flex-shrink-0">
            <button
              onClick={() => handleScrollTo('features')}
              className="text-arbor-on-surface-variant hover:text-arbor-primary px-3 py-1 rounded-full transition-all duration-200 font-medium cursor-pointer"
            >
              Fonctionnalités
            </button>
            <span className="h-3 border-l border-white/10"></span>
            
            <button
              onClick={() => handleScrollTo('pricing')}
              className="text-arbor-on-surface-variant hover:text-arbor-primary px-3 py-1 rounded-full transition-all duration-200 font-medium cursor-pointer"
            >
              Tarifs
            </button>
            <span className="h-3 border-l border-white/10"></span>
            
            <button
              onClick={() => handleScrollTo('testimonials')}
              className="text-arbor-on-surface-variant hover:text-arbor-primary px-3 py-1 rounded-full transition-all duration-200 font-medium cursor-pointer"
            >
              Témoignages
            </button>
            <span className="h-3 border-l border-white/10"></span>

            <button
              onClick={() => handleScrollTo('faq')}
              className="text-arbor-on-surface-variant hover:text-arbor-primary px-3 py-1 rounded-full transition-all duration-200 font-medium cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* BOUTONS D'ACTION (Droite - Desktop) */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Se connecter (texte simple) */}
            <button className="px-3 py-1 text-xs text-arbor-on-surface-variant hover:text-arbor-primary font-medium transition-all duration-200 cursor-pointer">
              Se connecter
            </button>

            {/* Essai gratuit (bouton teal pilule) */}
            <button className="px-3.5 py-1.5 text-xs font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-secondary-container hover:text-white rounded-full shadow-md shadow-arbor-primary/10 transition-all duration-200 active:scale-95 cursor-pointer">
              Essai gratuit
            </button>
          </div>

          {/* BOUTON HAMBURGER (Mobile) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-all duration-200"
          >
            {isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* CONTENU DU MENU DÉPLIÉ (Mobile Only) */}
        {isOpen && (
          <div className="md:hidden flex flex-col gap-3 mt-4 pt-4 border-t border-white/5 w-full font-arbor-body">
            <button
              onClick={() => handleScrollTo('features')}
              className="text-left text-arbor-on-surface-variant hover:text-arbor-primary text-xs font-medium py-1.5 transition-colors duration-200 cursor-pointer"
            >
              Fonctionnalités
            </button>
            <button
              onClick={() => handleScrollTo('pricing')}
              className="text-left text-arbor-on-surface-variant hover:text-arbor-primary text-xs font-medium py-1.5 transition-colors duration-200 cursor-pointer"
            >
              Tarifs
            </button>
            <button
              onClick={() => handleScrollTo('testimonials')}
              className="text-left text-arbor-on-surface-variant hover:text-arbor-primary text-xs font-medium py-1.5 transition-colors duration-200 cursor-pointer"
            >
              Témoignages
            </button>
            <button
              onClick={() => handleScrollTo('faq')}
              className="text-left text-arbor-on-surface-variant hover:text-arbor-primary text-xs font-medium py-1.5 transition-colors duration-200 cursor-pointer"
            >
              FAQ
            </button>
            
            <div className="h-px bg-white/5 my-1" />
            
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-xs text-arbor-on-surface-variant hover:text-arbor-primary font-medium text-left transition-colors duration-200 cursor-pointer"
              >
                Se connecter
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-xs font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-secondary-container hover:text-white rounded-full shadow-md text-center transition-all duration-200 active:scale-95 cursor-pointer"
              >
                Essai gratuit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
