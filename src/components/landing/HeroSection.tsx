// src/components/landing/HeroSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Hero Section — Landing Page du SaaS GU - Gestion Universitaire.
// Version avec Image de Fond Plein Écran + Carte Glassmorphic Flottante.
// Respecte strictement le design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import forest1 from '../../assets/landing/forest-1.jpg.jpeg';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-arbor-bg text-arbor-on-surface flex items-center overflow-hidden font-arbor-body">
      
      {/* 1. Image de forêt couvrant toute la section en arrière-plan */}
      <img 
        src={forest1} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 transform scale-105"
      />

      {/* 2. Overlay de dégradé sombre asymétrique pour garantir la lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-r from-arbor-bg via-arbor-bg/85 lg:via-arbor-bg/60 to-arbor-bg/30 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-arbor-bg via-transparent to-transparent z-10 pointer-events-none" />

      {/* Grille de fond "Tech" subtile (lignes à 2% d'opacité, par-dessus l'image) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] z-10 pointer-events-none" />

      {/* Halos de lumière décoratifs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-arbor-primary/5 rounded-full blur-[100px] z-10 pointer-events-none animate-pulse" />

      {/* 3. Conteneur principal du contenu */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-28 pb-16 min-h-screen">
        
        {/* Panneau gauche : Carte Glassmorphic Flottante (occupant 7 colonnes en desktop) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-start text-left p-6 sm:p-10 lg:p-12 rounded-[0.75rem] bg-arbor-surface-low/30 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in">
          
          {/* Badge Pilule "Propulsé par IA" */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-arbor-surface-low/60 backdrop-blur-md border border-arbor-primary/30 text-arbor-primary text-xs font-arbor-mono tracking-wider mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arbor-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-arbor-primary"></span>
            </span>
            PROPULSÉ PAR IA
          </div>

          {/* Titre Principal H1 — Hanken Grotesk, resserré, contrasté */}
          <h1 className="font-arbor-display text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Gerez votre universite.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arbor-primary via-arbor-secondary to-emerald-400 font-extrabold">
              Sans friction. Sans limite.
            </span>
          </h1>

          {/* Sous-titre — Inter, hautement lisible */}
          <p className="font-arbor-body text-sm sm:text-base lg:text-lg text-arbor-on-surface-variant max-w-xl mb-10 leading-relaxed">
            La première plateforme SaaS multi-tenant conçue pour moderniser l'administration académique. Inscriptions, notes, finances, e-learning et traçabilité d'audit RGPD unifiés en un seul espace sécurisé.
          </p>

          {/* CTAs d'action */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* CTA Primaire */}
            <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-primary-container rounded-[0.25rem] shadow-[0_0_20px_rgba(87,241,219,0.25)] hover:shadow-[0_0_35px_rgba(87,241,219,0.50)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
              Demarrer un essai gratuit
            </button>

            {/* CTA Secondaire */}
            <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-[0.25rem] backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
              Demander une demo
            </button>
          </div>

          {/* Petite preuve sociale */}
          <div className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] text-arbor-on-surface-variant/80 font-arbor-mono tracking-wider">
            <div>⚡ MULTI-TENANT ISOLÉ</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div>🛡️ CONFORME RGPD</div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div>📈 SANS ENGAGEMENT</div>
          </div>

        </div>

        {/* 4. Widget de stats repositionné discrètement en bas à droite (occupant 5 colonnes) */}
        <div className="lg:col-span-5 w-full lg:h-[600px] flex items-end justify-center lg:justify-end">
          <div className="w-full sm:w-auto min-w-[280px] p-6 rounded-[0.75rem] bg-arbor-surface-dim/80 backdrop-blur-lg border border-white/10 shadow-2xl flex items-center justify-between gap-6 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex flex-col">
              <span className="text-[10px] text-arbor-on-surface-variant/80 font-arbor-mono tracking-widest uppercase">DISPONIBILITÉ PLATEFORME</span>
              <span className="text-lg font-bold text-white font-arbor-display tracking-tight">99.99% Uptime</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[11px] text-arbor-primary font-arbor-mono">
              <span className="w-2 h-2 rounded-full bg-arbor-primary animate-pulse"></span>
              ACTIF
            </div>
          </div>
        </div>

      </div>

      {/* 5. Garde le marqueur "tech" (indicateur diamant de défilement vertical) */}
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
