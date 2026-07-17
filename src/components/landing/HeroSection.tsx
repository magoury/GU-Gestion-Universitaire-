// src/components/landing/HeroSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Hero Section — Landing Page du SaaS GU - Gestion Universitaire.
// Version compacte avec effet hover vert foncé et typographie équilibrée.
// Respecte strictement le design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import forest1 from '../../assets/Landing/forest-1.jpg.jpeg';
import Navbar from './Navbar';

export default function HeroSection() {
  const navigate = useNavigate();

  const handleScrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen bg-arbor-bg text-arbor-on-surface flex flex-col justify-between overflow-hidden font-arbor-body">
      
      {/* Navbar intégrée (fixe en haut, z-30) */}
      <Navbar />

      {/* 1. Image de forêt couvrant toute la section en arrière-plan */}
      <img 
        src={forest1} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 transform scale-100"
      />

      {/* 2. Overlay sombre uniforme pour garantir la lisibilité du texte */}
      <div className="absolute inset-0 bg-arbor-bg/65 z-10 pointer-events-none" />

      {/* Grille de fond "Tech" subtile (lignes à 2% d'opacité, par-dessus l'overlay) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] z-10 pointer-events-none" />

      {/* Halo de lumière décoratif discret */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-arbor-primary/5 rounded-full blur-[100px] z-10 pointer-events-none" />

      {/* 3. Contenu du Hero (Texte flottant directement sur l'image - Version compacte) */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 lg:px-20 flex-grow flex flex-col justify-center items-start pt-16 pb-16">
        
        <div className="max-w-4xl flex flex-col items-start text-left">
          
          {/* Badge Pilule "Propulsé par IA" (Taille réduite et marge resserrée) */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-arbor-primary/30 text-arbor-primary text-[10px] font-arbor-mono tracking-wider mb-5 animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arbor-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-arbor-primary"></span>
            </span>
            PROPULSÉ PAR IA — GESTION DE NOUVELLE GÉNÉRATION
          </div>

          {/* Titre H1 — Réduit à text-4xl lg:text-5xl et leading-[56px] pour un aspect plus dense */}
          <h1 className="font-arbor-display text-3xl sm:text-4xl lg:text-5xl lg:leading-[56px] font-extrabold text-white tracking-tight mb-4">
            Gerez votre universite.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arbor-primary via-arbor-secondary to-emerald-400 font-extrabold">
              Sans friction. Sans limite.
            </span>
          </h1>

          {/* Sous-titre — Réduit à text-sm lg:text-base et largeur resserrée à max-w-xl */}
          <p className="font-arbor-body text-xs sm:text-sm lg:text-base text-arbor-on-surface-variant max-w-xl mb-8 leading-relaxed">
            La première plateforme SaaS multi-tenant conçue pour moderniser l'administration académique. Inscriptions, notes, finances, e-learning et traçabilité d'audit RGPD unifiés en un seul espace sécurisé.
          </p>

          {/* CTAs d'action — Padding px-6 py-3 et texte text-sm, avec effet de survol vert foncé */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto font-arbor-body">
            {/* CTA Primaire : Démarrer un essai gratuit (Survol vert foncé : hover:bg-arbor-secondary-container hover:text-white) */}
            <button
              onClick={() => navigate('/onboarding?plan=standard')}
              className="group w-full sm:w-auto px-6 py-3 text-sm font-semibold text-arbor-on-primary bg-arbor-primary hover:bg-arbor-secondary-container hover:text-white border-none outline-none rounded-lg shadow-[0_0_15px_rgba(87,241,219,0.15)] hover:shadow-[0_0_25px_rgba(20,79,75,0.40)] transition-all duration-300 ease-out transform hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Demarrer un essai gratuit</span>
              <svg 
                className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            {/* CTA Secondaire : Demander une démo (Survol vert foncé translucide : hover:bg-arbor-secondary-container/20) */}
            <button
              onClick={handleScrollToContact}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-white/10 hover:bg-arbor-secondary-container/20 border border-white/20 hover:border-arbor-primary/30 outline-none rounded-lg backdrop-blur-sm transition-all duration-300 ease-out transform hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center justify-center"
            >
              Demander une demo
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
