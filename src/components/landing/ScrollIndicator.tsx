// src/components/landing/ScrollIndicator.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ScrollIndicator — Indicateur de défilement vertical en forme de losanges.
// Se synchronise dynamiquement avec le scroll via IntersectionObserver.
// Permet de naviguer de manière fluide au clic vers n'importe quelle section.
// Conforme au design system "Arbor Tech" (teal, style minimaliste).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'hero', label: 'Accueil' },
  { id: 'features', label: 'Fonctionnalités' },
  { id: 'pricing', label: 'Tarifs' },
  { id: 'testimonials', label: 'Témoignages' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta-final', label: 'Démarrer' },
];

export default function ScrollIndicator() {
  const [activeSectionId, setActiveSectionId] = useState('hero');

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -50% 0px', // Priorité sur la zone centrale haute du viewport
      threshold: 0.1,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      SECTIONS.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, []);

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col items-center z-40 pointer-events-none">
      {/* Ligne verticale d'arrière-plan */}
      <div className="absolute top-2 bottom-2 w-[1px] bg-white/10 z-0" />

      {/* Conteneur des losanges interactifs */}
      <div className="relative z-10 flex flex-col items-center gap-7 pointer-events-auto">
        {SECTIONS.map((section) => {
          const isActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => handleScrollTo(section.id)}
              title={section.label}
              className="group relative flex items-center justify-center w-5 h-5 focus:outline-none cursor-pointer"
            >
              {/* Tooltip textuel au survol */}
              <span className="absolute right-7 px-2 py-1 rounded bg-arbor-surface-high/90 border border-white/10 text-white text-[9px] font-arbor-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg">
                {section.label}
              </span>

              {/* Losange (Diamant) avec halo teal si actif */}
              <div
                className={`w-1.5 h-1.5 rotate-45 transition-all duration-300 ${
                  isActive
                    ? 'bg-arbor-primary border border-arbor-primary shadow-[0_0_10px_#57f1db] scale-125'
                    : 'bg-transparent border border-white/40 hover:border-arbor-primary hover:bg-white/20 scale-100'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
