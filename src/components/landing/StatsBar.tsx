// src/components/landing/StatsBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// StatsBar — Barre de statistiques de la Landing Page.
// Format pilule glassmorphism statique dans le flux de la page.
// Conforme au design system "Arbor Tech" (fond sombre, accents teal).
// ─────────────────────────────────────────────────────────────────────────────

export default function StatsBar() {
  return (
    <div className="relative z-20 w-full max-w-5xl mx-auto px-6 py-6 md:py-8">
      <div className="bg-arbor-surface/60 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-full py-4 px-6 md:px-12 shadow-xl shadow-black/25">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-arbor-body">
          <div className="space-y-0.5 flex flex-col items-center justify-center">
            <div className="text-xl lg:text-2xl font-extrabold text-white font-arbor-display tracking-tight">50+</div>
            <div className="text-[9px] md:text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono uppercase">Universités partenaires</div>
          </div>
          <div className="space-y-0.5 flex flex-col items-center justify-center">
            <div className="text-xl lg:text-2xl font-extrabold text-white font-arbor-display tracking-tight">120K+</div>
            <div className="text-[9px] md:text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono uppercase">Étudiants inscrits</div>
          </div>
          <div className="space-y-0.5 flex flex-col items-center justify-center">
            <div className="text-xl lg:text-2xl font-extrabold text-white font-arbor-display tracking-tight">99.99%</div>
            <div className="text-[9px] md:text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono uppercase">Uptime plateforme</div>
          </div>
          <div className="space-y-0.5 flex flex-col items-center justify-center">
            <div className="text-xl lg:text-2xl font-extrabold text-white font-arbor-display tracking-tight">&lt; 48h</div>
            <div className="text-[9px] md:text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono uppercase">Déploiement tenant</div>
          </div>
        </div>
      </div>
    </div>
  );
}
