// src/pages/public/LandingPage.jsx
// ──────────────────────────────────────────────────────────────
// Page de destination (Landing Page) publique du SaaS GU.
// Design moderne, clair (dégradé blanc/gris), responsive,
// avec animations d'apparition au scroll (Intersection Observer).
// Conteneurs centrés et typographie contrastée pour la lisibilité.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/landing/HeroSection';
import FeaturesGrid from '../../components/landing/FeaturesGrid';
import PricingTable from '../../components/landing/PricingTable';
import TestimonialsSection from '../../components/landing/TestimonialsSection';
import FAQSection from '../../components/landing/FAQSection';
import CTAFinalSection from '../../components/landing/CTAFinalSection';
import Footer from '../../components/landing/Footer';
import ScrollIndicator from '../../components/landing/ScrollIndicator';
import StatsBar from '../../components/landing/StatsBar';

function LandingPage() {
  const navigate = useNavigate();

  // Animations au scroll via Intersection Observer
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    targets.forEach((t) => observer.observe(t));
    return () => {
      targets.forEach((t) => observer.unobserve(t));
    };
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#0b1326] to-[#040914] min-h-screen text-slate-200 font-body relative overflow-x-hidden">
      
      <ScrollIndicator />

      <HeroSection />

      <StatsBar />

      <FeaturesGrid />

      <PricingTable />

      <TestimonialsSection />

      <FAQSection />

      <CTAFinalSection />

      <Footer />
    </div>
  );
}

export default LandingPage;
export { LandingPage };
