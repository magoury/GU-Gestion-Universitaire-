// src/components/landing/HeroSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Hero Section — Landing Page du SaaS GU - Gestion Universitaire.
// Version épurée "Floating Text" sur Fond Plein Écran avec Navbar Intégrée.
// Respecte strictement le design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import forest1 from '../../assets/landing/forest-1.jpg.jpeg';
import Navbar from './Navbar';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-arbor-bg text-arbor-on-surface flex flex-col justify-between overflow-hidden font-arbor-body">
      
      {/* Navbar intégrée (fixe en haut, z-30) */}
      <Navbar />

      {/* 1. Image de forêt couvrant toute la section en arrière-plan */}
      <img 
        src={forest1} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 transform scale-100"
      />

      {/* 2. Overlay sombre uniforme pour garantir la lisibilité du texte (sans dégradé directionnel complexe) */}
      <div className="absolute inset-0 bg-arbor-bg/65 z-10 pointer-events-none" />

      {/* Grille de fond "Tech" subtile (lignes à 2% d'opacité, par-dessus l'overlay) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] z-10 pointer-events-none" />

      {/* Halo de lumière décoratif discret */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-arbor-primary/5 rounded-full blur-[120px] z-10 pointer-events-none" />

      {/* 3. Contenu du Hero (Texte flottant directement sur l'image) */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 lg:px-20 flex-grow flex flex-col justify-center items-start pt-32 pb-12">
        
        <div className="max-w-4xl flex flex-col items-start text-left">
          
          {/* Badge Pilule "Propulsé par IA" (Nature-Tech) */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-arbor-primary/30 text-arbor-primary text-xs font-arbor-mono tracking-wider mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arbor-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-arbor-primary"></span>
            </span>
            PROPULSÉ PAR IA — GESTION DE NOUVELLE GÉNÉRATION
          </div>

          {/* Titre H1 — Hanken Grotesk, sans-serif, sans l'ancien style inline grâce aux classes surchargées de index.css */}
          <h1 className="font-arbor-display text-4xl sm:text-6xl lg:text-[72px] lg:leading-[80px] font-extrabold text-white leading-tight tracking-tight mb-6">
            Gerez votre universite.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arbor-primary via-arbor-secondary to-emerald-400 font-extrabold">
              Sans friction. Sans limite.
            </span>
          </h1>

          {/* Sous-titre — Inter, sans-serif */}
          <p className="font-arbor-body text-base sm:text-lg lg:text-xl text-arbor-on-surface-variant max-w-2xl mb-10 leading-relaxed">
            La première plateforme SaaS multi-tenant conçue pour moderniser l'administration académique. Inscriptions, notes, finances, e-learning et traçabilité d'audit RGPD unifiés en un seul espace sécurisé.
          </p>

          {/* CTAs d'action */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* CTA Primaire (Style Glassmorphic avec accent Teal pour la hiérarchie visuelle) */}
            <button className="group w-full sm:w-auto px-8 py-4 text-base font-semibold text-arbor-on-primary bg-arbor-primary/85 hover:bg-arbor-primary border border-arbor-primary/20 hover:border-arbor-primary/40 rounded-lg backdrop-blur-sm shadow-[0_0_25px_rgba(87,241,219,0.15)] hover:shadow-[0_0_35px_rgba(87,241,219,0.35)] transition-all duration-300 ease-out transform hover:-translate-y-1 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
              <span>Demarrer un essai gratuit</span>
              <svg 
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            {/* CTA Secondaire (Blanc Glassmorphic uniforme) */}
            <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/45 rounded-lg backdrop-blur-sm transition-all duration-300 ease-out transform hover:-translate-y-1 active:scale-95 cursor-pointer flex items-center justify-center">
              Demander une demo
            </button>
          </div>

        </div>

      </div>

      {/* 4. Barre de statistiques épurée et minimaliste tout en bas du Hero */}
      <div className="relative z-20 border-t border-white/5 bg-arbor-bg/40 backdrop-blur-sm py-8">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-left font-arbor-body">
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-white font-arbor-display tracking-tight">50+</div>
            <div className="text-xs text-arbor-on-surface-variant/80 font-arbor-mono">UNIVERSITÉS PARTENAIRES</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-white font-arbor-display tracking-tight">120K+</div>
            <div className="text-xs text-arbor-on-surface-variant/80 font-arbor-mono">ÉTUDIANTS INSCRITS</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-white font-arbor-display tracking-tight">99.99%</div>
            <div className="text-xs text-arbor-on-surface-variant/80 font-arbor-mono">UPTIME DE LA PLATEFORME</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-white font-arbor-display tracking-tight">&lt; 48h</div>
            <div className="text-xs text-arbor-on-surface-variant/80 font-arbor-mono">DÉPLOIEMENT MULTI-TENANT</div>
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
