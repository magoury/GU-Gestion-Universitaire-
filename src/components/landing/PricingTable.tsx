// src/components/landing/PricingTable.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PricingTable — Tableau de tarification de la Landing Page.
// Comprend 3 offres (Standard, Premium, Enterprise) avec limites d'étudiants.
// Redirection dynamique au clic vers /onboarding?plan=[standard|premium|enterprise].
// Style compact, moderne et conforme au design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { CheckIcon } from '../icons/Icons';

// Interface définissant la structure d'un plan de tarification
interface PricingPlan {
  id: 'standard' | 'premium' | 'enterprise';
  name: string;
  price: string;
  period: string;
  studentLimit: string;
  description: string;
  features: string[];
  ctaText: string;
  isPopular?: boolean;
}

const PLANS_DATA: PricingPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: '130 000',
    period: 'FCFA / mois',
    studentLimit: 'Jusqu\'à 500 étudiants',
    description: 'Idéal pour les petits établissements et instituts spécialisés en pleine croissance.',
    features: [
      'Isolation multi-tenant stricte',
      'Saisie de notes & Bulletins de base',
      'Calcul automatique des moyennes',
      'Accès Enseignants, Étudiants & Parents',
      'Support client par email sous 48h',
    ],
    ctaText: 'Choisir Standard',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '260 000',
    period: 'FCFA / mois',
    studentLimit: 'Jusqu\'à 2000 étudiants',
    description: 'La solution complète pour les universités moyennes souhaitant automatiser leur gestion.',
    features: [
      'Toutes les fonctionnalités Standard',
      'Gestion financière & Facturation (tranches)',
      'Intégration passerelles de paiement locales',
      'Génération automatique de bulletins signés',
      'Tableaux de bord analytiques avancés',
      'Support client prioritaire sous 24h',
    ],
    ctaText: 'Choisir Premium',
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    studentLimit: 'Étudiants illimités',
    description: 'Sur-mesure pour les grandes universités et réseaux d\'établissements d\'envergure.',
    features: [
      'Utilisateurs & Étudiants illimités',
      'Logs d\'audit immuables pour conformité',
      'Intégration d\'outils tiers (API & SSO)',
      'Hébergement dédié ou déploiement On-Premise',
      'Responsable de compte dédié (Account Manager)',
      'Support technique SLA sous 2h',
    ],
    ctaText: 'Contacter le service commercial',
  },
];

export default function PricingTable() {
  const navigate = useNavigate();

  const handleSelectPlan = (planId: 'standard' | 'premium' | 'enterprise') => {
    navigate(`/onboarding?plan=${planId}`);
  };

  return (
    <section id="pricing" className="relative bg-arbor-bg text-arbor-on-surface py-16 px-6 lg:px-20 overflow-hidden font-arbor-body border-t border-white/5">
      {/* Grille technique en fond subtile */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-arbor-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1440px] mx-auto">
        {/* En-tête de section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arbor-bg/60 border border-arbor-primary/30 text-arbor-primary text-[10px] font-arbor-mono tracking-widest uppercase mb-3">
            TARIFICATION TRANSPARENTE
          </div>
          <h2 className="font-arbor-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight mb-3">
            Des plans adaptés à votre établissement
          </h2>
          <p className="font-arbor-body text-xs lg:text-sm text-arbor-on-surface-variant leading-relaxed">
            Choisissez l'offre qui correspond à la taille de votre université. Faites évoluer votre plan à tout moment au rythme de vos inscriptions.
          </p>
        </div>

        {/* Grille des offres de tarification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-[1100px] mx-auto pt-4">
          {PLANS_DATA.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between p-6 rounded-xl transition-all duration-300 backdrop-blur-md ${
                plan.isPopular
                  ? 'bg-arbor-surface-high/60 border-2 border-arbor-primary shadow-xl shadow-arbor-primary/5 -translate-y-2 md:scale-105 z-10'
                  : 'bg-arbor-surface/40 border border-white/10 hover:border-white/20 hover:bg-arbor-surface-high/40 shadow-lg'
              }`}
            >
              {/* Badge "Populaire" */}
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-arbor-primary text-arbor-on-primary text-[10px] font-bold font-arbor-mono tracking-wider uppercase rounded-full shadow-md">
                  Plus populaire
                </span>
              )}

              <div>
                {/* Nom du plan & Limite d'étudiants */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white font-arbor-display">{plan.name}</h3>
                  <p className="text-[11px] font-semibold text-arbor-primary uppercase tracking-wider mt-0.5">
                    {plan.studentLimit}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-arbor-on-surface-variant mb-5 min-h-[40px] leading-relaxed">
                  {plan.description}
                </p>

                {/* Prix */}
                <div className="flex items-baseline gap-2 mb-6">
                  {plan.price === 'Sur devis' ? (
                    <span className="text-2xl font-extrabold text-white font-arbor-display tracking-tight">
                      {plan.price}
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl lg:text-4xl font-extrabold text-white font-arbor-display tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-xs text-arbor-on-surface-variant font-medium">
                        {plan.period}
                      </span>
                    </>
                  )}
                </div>

                {/* Ligne séparatrice */}
                <div className="h-px bg-white/10 mb-5" />

                {/* Liste des fonctionnalités */}
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-arbor-on-surface-variant">
                      <span className={`p-0.5 rounded-full mt-0.5 flex-shrink-0 ${
                        plan.isPopular ? 'bg-arbor-primary/20 text-arbor-primary' : 'bg-white/5 text-arbor-primary'
                      }`}>
                        <CheckIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bouton CTA */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer active:scale-98 ${
                  plan.isPopular
                    ? 'bg-arbor-primary text-arbor-on-primary hover:bg-arbor-primary-container shadow-md shadow-arbor-primary/10'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-arbor-secondary-container hover:border-arbor-primary/40'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
