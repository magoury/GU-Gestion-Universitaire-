// src/components/landing/CTAFinalSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CTAFinalSection — Section d'appel à l'action final.
// Conforme au design system "Arbor Tech" (fond sombre, accent teal, boutons).
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';

export default function CTAFinalSection() {
  const navigate = useNavigate();

  const handleStartFree = () => {
    navigate('/onboarding?plan=premium');
  };

  const handleScrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-arbor-surface-low to-arbor-bg text-arbor-on-surface py-24 px-6 lg:px-20 overflow-hidden font-arbor-body border-t border-white/5">
      {/* Grille technique de fond avec estompage graduel par le bas (mask-image) */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)'
        }}
      />

      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-arbor-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1440px] mx-auto text-center flex flex-col items-center">
        <h2 className="font-arbor-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight max-w-3xl mx-auto mb-8">
          Votre université mérite mieux qu’un tableur Excel
        </h2>
        <p className="font-arbor-body text-xs lg:text-sm text-arbor-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Rejoignez les établissements d'enseignement supérieur d'Afrique francophone qui ont choisi l'automatisation académique sécurisée pilotée par l'IA.
        </p>

        <div className="flex flex-wrap gap-4 justify-center items-center font-arbor-body w-full mt-12">
          {/* Bouton Primaire : rounded-lg pour cohérence avec Hero */}
          <button
            onClick={handleStartFree}
            className="px-6 py-3 text-xs lg:text-sm font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-secondary-container hover:text-white border-none rounded-lg shadow-[0_0_15px_rgba(87,241,219,0.15)] hover:shadow-[0_0_25px_rgba(20,79,75,0.40)] transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            Démarrer gratuitement — 30 jours
          </button>
          
          {/* Bouton Secondaire : rounded-lg pour cohérence avec Hero */}
          <button
            onClick={handleScrollToContact}
            className="px-6 py-3 text-xs lg:text-sm font-semibold text-white bg-white/10 hover:bg-arbor-secondary-container/20 border border-white/20 hover:border-arbor-primary/30 rounded-lg backdrop-blur-sm shadow-md transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Demander une démo →
          </button>
        </div>
      </div>
    </section>
  );
}
