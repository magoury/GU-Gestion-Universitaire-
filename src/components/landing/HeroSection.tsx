// src/components/landing/HeroSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Hero Section — Landing Page du SaaS GU - Gestion Universitaire.
// Respecte strictement le design system "Arbor Tech" (Arbor Tech Design System).
//
// Esthétique "Nature-Tech" :
//   - Ambiance sombre immersive (#0b1326)
//   - Layout Split-Screen : panneau éditorial textuel à gauche, nature nette à droite
//   - Verre dépoli (Glassmorphism) et bordures blanches sub-lumineuses (10% opacité)
//   - Typographie : Hanken Grotesk (display-xl) et Inter (body-lg)
// ─────────────────────────────────────────────────────────────────────────────

import forest1 from '../../assets/landing/forest-1.jpg.jpeg';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] lg:min-h-screen bg-arbor-bg text-arbor-on-surface flex flex-col justify-between overflow-hidden font-arbor-body">
      
      {/* Grille de fond "Tech" subtile (lignes de guidage à 3% d'opacité) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Halos de lumière colorés (Teal & Forest Green) en arrière-plan */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-arbor-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/3 w-[600px] h-[600px] bg-arbor-secondary-container/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Structure Split-Screen principale */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 flex-grow items-center py-24 lg:py-0">
        
        {/* PANNEAU GAUCHE : Contenu éditorial (occupant 7 colonnes sur 12 en desktop) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-start text-left">
          
          {/* Badge Pilule "Propulsé par IA" (nature-tech) */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-arbor-surface-low/80 backdrop-blur-md border border-arbor-primary/30 text-arbor-primary text-sm font-arbor-mono tracking-wider mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arbor-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-arbor-primary"></span>
            </span>
            PROPULSÉ PAR IA
          </div>

          {/* Titre Principal H1 — Hanken Grotesk, contrasté, resserré (-0.04em) */}
          <h1 className="font-arbor-display text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Gérez votre université.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arbor-primary via-arbor-secondary to-emerald-400 font-extrabold">
              Sans friction. Sans limite.
            </span>
          </h1>

          {/* Sous-titre — Inter, hautement lisible, text-on-surface-variant */}
          <p className="font-arbor-body text-base lg:text-lg text-arbor-on-surface-variant max-w-xl mb-10 leading-relaxed">
            La première plateforme SaaS multi-tenant conçue pour moderniser l'administration académique. Inscriptions, notes, finances, e-learning et traçabilité d'audit RGPD unifiés en un seul espace sécurisé.
          </p>

          {/* CTAs d'action */}
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* CTA Primaire : Essai gratuit */}
            <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-primary-container rounded-[0.25rem] shadow-[0_0_20px_rgba(87,241,219,0.25)] hover:shadow-[0_0_35px_rgba(87,241,219,0.50)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
              Démarrer un essai gratuit
            </button>

            {/* CTA Secondaire : Demander une démo (Ghost avec backdrop-blur) */}
            <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-[0.25rem] backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
              Demander une démo
            </button>
          </div>

          {/* Petite preuve sociale ou indicateur discret */}
          <div className="mt-12 flex items-center gap-6 text-xs text-arbor-on-surface-variant/70 font-arbor-mono">
            <div>⚡ MULTI-TENANT ISOLÉ</div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div>🛡️ CONFORME RGPD</div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div>📈 SANS ENGAGEMENT</div>
          </div>

        </div>

        {/* PANNEAU DROIT : Image Organique Nette (occupant 5 colonnes sur 12 en desktop) */}
        <div className="lg:col-span-5 w-full h-[320px] sm:h-[450px] lg:h-[600px] relative rounded-[0.75rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          
          {/* Image de Nature Nette de haute qualité */}
          <img 
            src={forest1} 
            alt="Nature organique - Forêt d'Arbor Tech" 
            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          {/* Incrustation d'un panneau de statistiques ou de statut en verre dépoli (marqueur "Tech") */}
          <div className="absolute bottom-6 left-6 right-6 p-6 rounded-[0.75rem] bg-arbor-surface-dim/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono tracking-widest uppercase">DISPONIBILITÉ PLATEFORME</span>
              <span className="text-xl font-bold text-white font-arbor-display tracking-tight">99.99% Uptime</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[11px] text-arbor-primary font-arbor-mono">
              <span className="w-2 h-2 rounded-full bg-arbor-primary animate-pulse"></span>
              ACTIF
            </div>
          </div>

          {/* Vignette sombre d'overlay pour assurer un contraste impeccable */}
          <div className="absolute inset-0 bg-gradient-to-t from-arbor-bg/60 via-transparent to-transparent pointer-events-none" />
        </div>

      </div>

      {/* Indicateur de défilement vertical discret et diamant tech à droite (décrit dans DESIGN.md) */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4 z-40">
        <div className="w-1.5 h-1.5 rotate-45 bg-arbor-primary shadow-[0_0_8px_#57f1db]"></div>
        <div className="w-[1px] h-12 bg-white/20"></div>
        <div className="w-1.5 h-1.5 rotate-45 border border-white/40 hover:bg-white/20 transition-all cursor-pointer"></div>
        <div className="w-1.5 h-1.5 rotate-45 border border-white/40 hover:bg-white/20 transition-all cursor-pointer"></div>
        <div className="w-1.5 h-1.5 rotate-45 border border-white/40 hover:bg-white/20 transition-all cursor-pointer"></div>
      </div>
    </section>
  );
}
