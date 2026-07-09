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
import {
  StudentsIcon,
  TeachersIcon,
  NotesIcon,
  MoneyIcon,
  LibraryIcon,
  ShieldIcon,
  CheckIcon,
  BuildingIcon,
  ParentIcon,
  TeacherIcon
} from '../../components/icons/Icons.jsx';

const ESPACES_CLES = {
  admin: {
    label: 'Admin Université',
    points: [
      'Tour de contrôle centrale de l\'établissement',
      'Import CSV massif enseignants et étudiants',
      'Clôture d\'année académique automatisée',
      'Relevés et documents officiels en PDF'
    ]
  },
  teacher: {
    label: 'Enseignant',
    points: [
      'Saisie rapide des notes individuelle ou en masse',
      'Publication de devoirs avec date limite',
      'Dépôt de ressources pédagogiques par cours',
      'Communication directe avec les étudiants'
    ]
  },
  student: {
    label: 'Étudiant',
    points: [
      'Consultation notes et bulletins en temps réel',
      'Accès à tous les supports de cours en ligne',
      'Suivi des paiements et téléchargement des reçus',
      'Export RGPD de toutes ses données personnelles'
    ]
  },
  parent: {
    label: 'Parent',
    points: [
      'Suivi des résultats de l\'enfant en temps réel',
      'Alertes automatiques de paiement et d\'absence',
      'Communication directe avec l\'administration',
      'Historique complet des paiements de scolarité'
    ]
  },
  superadmin: {
    label: 'Super Admin',
    points: [
      'Pilotage global de toutes les universités clientes',
      'Monitoring des revenus et abonnements en temps réel',
      'Suspension/réactivation instantanée d\'un tenant',
      'Accès sécurisé via code PIN à 10 chiffres'
    ]
  }
};

function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('admin');

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

  const scrollVersSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const menuTabs = useMemo(() => Object.keys(ESPACES_CLES), []);

  return (
    <div className="bg-gradient-to-b from-white to-slate-50 min-h-screen text-slate-800 font-body relative overflow-x-hidden">
      
      <HeroSection />

      {/* ── SECTION 4 — FONCTIONNALITÉS ── */}
      <section id="fonctionnalites" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-[#2D6A4F] uppercase block mb-2">
              FONCTIONNALITÉS
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#041710] max-w-4xl mx-auto text-center">
              Tout ce dont votre établissement a besoin, en un clic
            </h2>
            <p className="text-gray-600 text-sm max-w-2xl mx-auto mt-4 leading-relaxed text-center">
              Dites adieu aux processus manuels. Automatisez l'ensemble du cycle de vie académique et comptable grâce à notre architecture sécurisée.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <StudentsIcon className="text-[#2D6A4F] w-6 h-6" />,
                title: 'Gestion des étudiants',
                desc: 'Inscription, matricule auto, suivi des statuts et du parcours complet de chaque apprenant.'
              },
              {
                icon: <NotesIcon className="text-[#2D6A4F] w-6 h-6" />,
                title: 'Notes & Bulletins IA',
                desc: 'Calcul automatique des moyennes pondérées, bulletins officiels générés en un clic, classements instantanés.'
              },
              {
                icon: <MoneyIcon className="text-[#2D6A4F] w-6 h-6" />,
                title: 'Finances intégrées',
                desc: 'Suivi des frais, paiements par tranches, reçus numériques et alertes automatiques d\'impayés.'
              },
              {
                icon: <LibraryIcon className="text-[#2D6A4F] w-6 h-6" />,
                title: 'E-learning & Bibliothèque',
                desc: 'Dépôt de ressources pédagogiques, suivi de progression des étudiants et gestion des emprunts.'
              },
              {
                icon: <BuildingIcon className="w-6 h-6 text-[#2D6A4F]" />,
                title: 'Multi-tenant sécurisé',
                desc: 'Isolation totale des données entre universités. Chaque établissement dispose de son espace étanche.'
              },
              {
                icon: <ShieldIcon className="w-6 h-6 text-[#2D6A4F]" />,
                title: 'Audit & Conformité RGPD',
                desc: 'Journalisation immuable de toutes les actions critiques et export des données personnelles (Art. 20).'
              }
            ].map((f, idx) => (
              <div 
                key={idx} 
                className="border border-gray-100 rounded-2xl p-6 bg-white hover:shadow-lg hover:border-green-200 transition-all duration-300 flex flex-col items-start reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out"
              >
                <div className="p-3 bg-green-50 rounded-xl mb-4">
                  {f.icon}
                </div>
                <h3 className="font-serif font-bold text-lg text-[#041710] mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — ESPACES DÉDIÉS ── */}
      <section className="bg-[#041710] py-20 text-white relative">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-12">
            <span className="bg-[#2D6A4F] text-[#95D4B3] text-xs font-bold tracking-widest uppercase rounded px-3 py-1 inline-block mb-3">
              ESPACES DÉDIÉS
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mt-1 max-w-4xl mx-auto text-center">
              Une plateforme, de multiples expériences taillées sur mesure
            </h2>
            <p className="text-[#95D4B3] text-sm max-w-2xl mx-auto mt-3 text-center">
              Chaque acteur accède à une interface optimisée pour ses tâches régulières, avec une étanchéité complète des données.
            </p>
          </div>

          {/* Onglets */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-3xl mx-auto">
            {menuTabs.map((key) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    active 
                      ? 'bg-[#2D6A4F] text-white shadow-md' 
                      : 'text-[#95D4B3] hover:text-white bg-[#10231C]'
                  }`}
                >
                  {ESPACES_CLES[key].label}
                </button>
              );
            })}
          </div>

          {/* Contenu onglet */}
          <div className="bg-[#10231C] border border-white/10 rounded-2xl p-8 mt-10 max-w-3xl mx-auto reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#2D6A4F]/20 flex items-center justify-center text-[#EEC058]">
                {activeTab === 'admin' && <BuildingIcon className="w-5 h-5" />}
                {activeTab === 'teacher' && <TeacherIcon className="w-5 h-5" />}
                {activeTab === 'student' && <StudentsIcon className="w-5 h-5" />}
                {activeTab === 'parent' && <ParentIcon className="w-5 h-5" />}
                {activeTab === 'superadmin' && <ShieldIcon className="w-5 h-5" />}
              </div>
              <h3 className="font-serif font-bold text-xl text-white">
                Rôle {ESPACES_CLES[activeTab].label}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ESPACES_CLES[activeTab].points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-[#EEC058] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm leading-relaxed">
                    {pt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — TARIFS ── */}
      <section id="tarifs" className="bg-[#F8FAFC] py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-[#2D6A4F] uppercase block mb-2">
              TARIFICATION TRANSPARENTE
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#041710] max-w-4xl mx-auto text-center">
              Des forfaits adaptés à la taille de votre école
            </h2>
            <p className="text-gray-600 text-sm max-w-2xl mx-auto mt-4 leading-relaxed text-center">
              Commencez en quelques minutes. Sans engagement, sans frais cachés.
            </p>
          </div>

          {/* Cartes tarifs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Standard */}
            <div className="border border-gray-200 rounded-2xl p-8 bg-white flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <div>
                <span className="text-xs font-bold tracking-widest text-gray-500 block uppercase mb-4">
                  STANDARD
                </span>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-[#041710]">490 000</span>
                  <span className="text-base font-bold text-[#041710] ml-1">FCFA</span>
                  <span className="text-gray-400 text-xs ml-1">/mois</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed mb-6">
                  Pour les établissements jusqu'à 500 étudiants.
                </p>
                <div className="h-px bg-gray-100 my-4" />
                <ul className="flex flex-col gap-3">
                  {['Jusqu\'à 500 étudiants', '5 espaces utilisateurs', 'Gestion notes & bulletins', 'Paiements Stripe', 'Support email 5/7'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckIcon className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => navigate('/login?mode=inscription&plan=standard')}
                className="btn btn-outline border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F] hover:text-white w-full font-bold mt-8 cursor-pointer"
              >
                Commencer
              </button>
            </div>

            {/* Premium (Plus Populaire) */}
            <div className="border-2 border-[#2D6A4F] rounded-2xl p-8 bg-white relative shadow-xl flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <div className="bg-[#EEC058] text-[#041710] text-[10px] font-bold px-4 py-1.5 rounded-full absolute -top-3 left-1/2 -translate-x-1/2 shadow uppercase">
                Plus Populaire
              </div>
              <div>
                <span className="text-xs font-bold tracking-widest text-[#2D6A4F] block uppercase mb-4 mt-2">
                  PREMIUM
                </span>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-[#041710]">1 290 000</span>
                  <span className="text-base font-bold text-[#041710] ml-1">FCFA</span>
                  <span className="text-gray-400 text-xs ml-1">/mois</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed mb-6">
                  Pour les universités exigeant l'intégralité du pilotage IA.
                </p>
                <div className="h-px bg-gray-100 my-4" />
                <ul className="flex flex-col gap-3">
                  {[
                    'Jusqu\'à 2000 étudiants',
                    'E-space e-learning et bibliothèque',
                    'Importation massive CSV / Excel',
                    'Logs d\'audit complets (append-only)',
                    'Clôture d\'année automatique',
                    'Conformité RGPD',
                    'Support prioritaire 7j/7'
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckIcon className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => navigate('/login?mode=inscription&plan=premium')}
                className="btn bg-[#2D6A4F] text-white hover:bg-[#1F4D38] border-none w-full font-bold mt-8 cursor-pointer"
              >
                Démarrer l'essai gratuit
              </button>
            </div>

            {/* Enterprise */}
            <div className="border border-gray-200 rounded-2xl p-8 bg-white flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <div>
                <span className="text-xs font-bold tracking-widest text-gray-500 block uppercase mb-4">
                  ENTERPRISE
                </span>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-bold text-[#041710]">Sur devis</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed mb-6">
                  Pour les réseaux d'établissements et les ministères.
                </p>
                <div className="h-px bg-gray-100 my-4" />
                <ul className="flex flex-col gap-3">
                  {[
                    'Étudiants illimités',
                    'Multi-campus / multi-écoles',
                    'API & intégrations complètes',
                    'SLA 99.9% garanti',
                    'Console dédiée',
                    'Formation & accompagnement'
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckIcon className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="mailto:contact@gu-saas.com"
                className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black w-full font-bold mt-8 text-center"
              >
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — TÉMOIGNAGES ── */}
      <section id="temoignages" className="bg-[#041710] py-20 text-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white max-w-4xl mx-auto text-center">
              Ce que disent nos directeurs
            </h2>
            <p className="text-[#95D4B3] text-sm mt-3 max-w-2xl mx-auto text-center">
              Découvrez les retours d'expérience des premiers établissements à avoir migré vers GU.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#10231C] border border-white/10 rounded-2xl p-6 flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <p className="text-gray-300 text-xs italic leading-relaxed mb-6">
                "En 48 heures, nous avons migré 2 400 étudiants, configuré nos filières et lancé les paiements en ligne. GU a divisé par 6 notre charge administrative."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold font-serif">
                  KB
                </div>
                <div>
                  <span className="text-white text-xs font-bold block">Dr. Konaté Bayliss</span>
                  <span className="text-[#95D4B3] text-[10px] block">Directeur, Université F. Houphouët-Boigny</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#10231C] border border-white/10 rounded-2xl p-6 flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <p className="text-gray-300 text-xs italic leading-relaxed mb-6">
                "La génération automatique des bulletins et le calcul des moyennes nous font économiser 3 semaines de travail à chaque fin de semestre."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#EEC058] text-[#041710] flex items-center justify-center text-xs font-bold font-serif">
                  MD
                </div>
                <div>
                  <span className="text-white text-xs font-bold block">Prof. Miayo Diallo</span>
                  <span className="text-[#95D4B3] text-[10px] block">Doyen, École Supérieure de Dakar</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#10231C] border border-white/10 rounded-2xl p-6 flex flex-col justify-between reveal-on-scroll opacity-0 translate-y-8 transition duration-700 ease-out">
              <p className="text-gray-300 text-xs italic leading-relaxed mb-6">
                "J'apprécie particulièrement avoir une vue en temps réel sur les résultats et les frais de mon fils. Les alertes de paiement sont un vrai plus."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#95D4B3] text-[#041710] flex items-center justify-center text-xs font-bold font-serif">
                  AG
                </div>
                <div>
                  <span className="text-white text-xs font-bold block">Aminata Guira</span>
                  <span className="text-[#95D4B3] text-[10px] block">Parent d'élève, ISGE Ouagadougou</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — CTA FINAL ── */}
      <section className="bg-gradient-to-b from-[#2D6A4F] to-[#041710] py-20 text-white">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-4xl mx-auto text-center">
            Votre université mérite mieux qu'un tableur Excel.
          </h2>
          <p className="text-[#95D4B3] text-sm mt-4 max-w-2xl mx-auto text-center">
            Rejoignez les établissements qui ont choisi l'automatisation académique pilotée par l'IA.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/login?mode=inscription&plan=premium')}
              className="btn btn-md bg-white text-[#2D6A4F] hover:bg-gray-100 border-none font-bold px-6 cursor-pointer"
            >
              Démarrer gratuitement — 30 jours
            </button>
            <button
              onClick={() => scrollVersSection('contact')}
              className="btn btn-md btn-outline border-white text-white hover:bg-white hover:text-[#2D6A4F] px-6 font-bold cursor-pointer"
            >
              Demander une démo →
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 9 — FOOTER ── */}
      <footer id="contact" className="bg-[#041710] py-16 text-white border-t border-white/10">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-2 select-none">
              <div className="w-7 h-7 rounded-full bg-[#2D6A4F] flex items-center justify-center border border-white/10 flex-shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EEC058"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 6 8-4 8 4" />
                  <path d="m18 10 1-4H5l1 4" />
                  <path d="M14 10v4" />
                  <path d="M10 10v4" />
                  <path d="M18 14H6" />
                  <path d="M22 22H2" />
                  <path d="M20 22v-4H4v4" />
                  <path d="M12 18v-4" />
                </svg>
              </div>
              <span className="font-serif font-bold text-base text-white">GU</span>
            </div>
            <p className="text-[#95D4B3] text-xs leading-relaxed mt-4 max-w-xs">
              Plateforme SaaS de gestion universitaire pilotée par l'IA, conçue pour les établissements africains et francophones.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <span className="text-xs font-bold tracking-widest text-[#EEC058] block mb-4 uppercase">
              PRODUIT
            </span>
            <ul className="flex flex-col gap-2.5">
              {['Fonctionnalités', 'Tarifs', 'Roadmap', 'Changelog'].map((link) => (
                <li key={link}>
                  <button 
                    onClick={() => link === 'Fonctionnalités' ? scrollVersSection('fonctionnalites') : scrollVersSection('tarifs')} 
                    className="text-xs text-[#95D4B3] hover:text-white transition-colors cursor-pointer"
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <span className="text-xs font-bold tracking-widest text-[#EEC058] block mb-4 uppercase">
              RESSOURCES
            </span>
            <ul className="flex flex-col gap-2.5">
              {['Documentation', 'API Reference', 'Guide Onboarding', 'Blog'].map((link) => (
                <li key={link}>
                  <span className="text-xs text-[#95D4B3] cursor-default">{link}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <span className="text-xs font-bold tracking-widest text-[#EEC058] block mb-4 uppercase">
              LÉGAL
            </span>
            <ul className="flex flex-col gap-2.5">
              {['Politique RGPD', 'CGU', 'Sécurité', 'Contact'].map((link) => (
                <li key={link}>
                  <span className="text-xs text-[#95D4B3] cursor-default">{link}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ligne du bas */}
        <div className="max-w-6xl mx-auto px-8 border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-500">
          <span>© 2025 GU — Gestion Universitaire. Tous droits réservés.</span>
          <span>Plateforme conçue avec l'IA · Sécurisée pour les établissements académiques</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
export { LandingPage };
