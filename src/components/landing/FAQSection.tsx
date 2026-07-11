// src/components/landing/FAQSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// FAQSection — Section des questions fréquentes (FAQ).
// Système d'accordéon interactif (une seule question ouverte à la fois).
// Conforme au design system "Arbor Tech" (fond sombre, accents teal, glassmorphism).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Comment l’isolation des données est-elle garantie entre les universités ?',
    answer: 'Notre architecture multi-tenant stricte applique un cloisonnement logique à tous les niveaux. Chaque université possède son propre identifiant unique (universityId) vérifié à chaque requête par les règles de sécurité Firebase. Aucune fuite de données inter-universités n’est possible, garantissant une étanchéité absolue.',
  },
  {
    id: 'faq-2',
    question: 'Comment pouvons-nous migrer nos données existantes vers la plateforme ?',
    answer: 'La transition est simple et encadrée. Vous pouvez importer massivement vos listes d’étudiants, d’enseignants, de classes et de filières à l’aide de fichiers CSV et Excel via notre portail d’onboarding. Nos équipes techniques effectuent des contrôles d’intégrité pour éviter toute perte de données.',
  },
  {
    id: 'faq-3',
    question: 'Quelles sont les différences majeures entre les trois plans tarifaires ?',
    answer: 'Le plan Standard (jusqu’à 500 étudiants) offre les fonctionnalités académiques de base (notes, rôles, bulletins). Le plan Premium (jusqu’à 2000 étudiants) ajoute la gestion financière avancée (paiement en tranches, intégration de passerelles locales) et des analyses de réussite. Le plan Enterprise (étudiants illimités) propose un accompagnement sur-mesure, des API dédiées et un SLA de support sous 2h.',
  },
  {
    id: 'faq-4',
    question: 'La plateforme est-elle conforme au RGPD et permet-elle l’export des données ?',
    answer: 'Oui, la conformité RGPD est intégrée dès la conception. La plateforme dispose d’outils d’exportation en un clic de l’ensemble des données personnelles d’un utilisateur (étudiant, enseignant). De plus, chaque modification sensible fait l’objet de journaux d’audit (audit logs) immuables.',
  },
  {
    id: 'faq-5',
    question: 'Quels sont les délais de support technique disponibles ?',
    answer: 'Notre équipe d’assistance intervient sous 48h par email pour le forfait Standard. Ce délai est ramené à 24h avec traitement prioritaire pour l’offre Premium. Les partenaires du plan Enterprise bénéficient d’une ligne directe d’urgence 24/7 avec une résolution sous 2h.',
  },
  {
    id: 'faq-6',
    question: 'Combien de temps prend le processus d’onboarding complet ?',
    answer: 'La création de votre espace universitaire sécurisé est effective en moins de 48h. L’importation initiale des données et la configuration des filières prennent généralement 3 à 7 jours. Nos guides d’accueil et webinaires facilitent la prise en main rapide par vos équipes administratives.',
  },
  {
    id: 'faq-7',
    question: 'Comment fonctionne l’essai gratuit de 30 jours ?',
    answer: 'L’essai gratuit vous donne un accès complet aux fonctionnalités du plan choisi afin de valider l’adéquation de la plateforme avec vos besoins réels. C’est une formule sans engagement : si vous ne confirmez pas votre abonnement avant la fin des 30 jours, votre espace est simplement suspendu sans facturation.',
  },
  {
    id: 'faq-8',
    question: 'La plateforme gère-t-elle les universités multi-campus et plusieurs filières ?',
    answer: 'Absolument. Vous pouvez configurer un nombre illimité de filières, de départements et de campus géographiques distincts. La plateforme unifie la scolarité et la comptabilité au sein d’un tableau de bord consolidé pour le rectorat, tout en permettant des vues locales filtrées par campus.',
  },
];

export default function FAQSection() {
  // Gestion de l'état d'ouverture (une seule question active à la fois)
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setActiveId(activeId === id ? null : id);
  };

  return (
    <section id="faq" className="relative bg-arbor-bg text-arbor-on-surface py-16 px-6 lg:px-20 overflow-hidden font-arbor-body border-t border-white/5">
      {/* Grille technique de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Halo lumineux décoratif */}
      <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-arbor-primary/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[900px] mx-auto">
        {/* En-tête de section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arbor-bg/60 border border-arbor-primary/30 text-arbor-primary text-[10px] font-arbor-mono tracking-widest uppercase mb-3">
            QUESTIONS FRÉQUENTES
          </div>
          <h2 className="font-arbor-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight mb-3">
            Une réponse à chacune de vos questions
          </h2>
          <p className="font-arbor-body text-xs lg:text-sm text-arbor-on-surface-variant leading-relaxed">
            Retrouvez les détails essentiels concernant la sécurité, la facturation et le déploiement opérationnel de notre outil de gestion.
          </p>
        </div>

        {/* Liste d'accordéons */}
        <div className="space-y-4 pt-2">
          {FAQ_ITEMS.map((item) => {
            const isOpen = activeId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-xl transition-all duration-300 border backdrop-blur-md ${
                  isOpen
                    ? 'bg-arbor-surface-high/55 border-arbor-primary/40 shadow-lg shadow-arbor-primary/5'
                    : 'bg-arbor-surface/30 border-white/10 hover:border-white/20 hover:bg-arbor-surface-high/20'
                }`}
              >
                {/* En-tête cliquable (Question) */}
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs lg:text-sm text-white select-none cursor-pointer transition-colors duration-200 hover:text-arbor-primary focus:outline-none"
                >
                  <span className="pr-4 font-arbor-display">{item.question}</span>
                  
                  {/* Icône Chevron pivotante */}
                  <span className={`transition-transform duration-300 shrink-0 text-arbor-primary`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </button>

                {/* Corps dépliable (Réponse) */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[300px] border-t border-white/5 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <p className="p-4 text-xs lg:text-[13px] text-arbor-on-surface-variant font-arbor-body leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
