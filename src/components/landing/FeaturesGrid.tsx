// src/components/landing/FeaturesGrid.tsx
// ─────────────────────────────────────────────────────────────────────────────
// FeaturesGrid — Grille des fonctionnalités de la Landing Page.
// Segmentée par profil utilisateur (Admin, Enseignant, Étudiant, Parent).
// Grille harmonisée à 3 fonctionnalités par profil (4x3) pour un alignement parfait.
// Respecte strictement le design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import { 
  BuildingIcon, 
  TeacherIcon, 
  StudentsIcon, 
  ParentIcon,
  ShieldIcon,
  MoneyIcon,
  NotesIcon,
  LibraryIcon,
  BookIcon,
  ClockIcon,
  CheckCircleIcon,
  UsersIcon,
  BellIcon
} from '../icons/Icons';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProfileGroup {
  profileName: string;
  profileIcon: React.ComponentType<{ className?: string }>;
  features: FeatureCard[];
}

const PROFILES_DATA: ProfileGroup[] = [
  {
    profileName: "Administration",
    profileIcon: BuildingIcon,
    features: [
      {
        title: "Pilotage Multi-Tenant",
        description: "Isolation stricte des données de l'université. Gestion globale de l'onboarding et clôture d'année académique.",
        icon: BuildingIcon
      },
      {
        title: "Trésorerie & Facturation",
        description: "Suivi des frais de scolarité, tranches de paiement automatisées et intégration avec les passerelles de paiement.",
        icon: MoneyIcon
      },
      {
        title: "Audit & RGPD",
        description: "Logs immuables de toutes les actions administratives. Export en un clic de l'intégralité des données personnelles.",
        icon: ShieldIcon
      }
    ]
  },
  {
    profileName: "Enseignants",
    profileIcon: TeacherIcon,
    features: [
      {
        title: "Saisie de Notes Rapide",
        description: "Saisie de notes individuelle ou import Excel en masse. Calcul automatique des moyennes pondérées par matière.",
        icon: NotesIcon
      },
      {
        title: "Supports Pédagogiques",
        description: "Partage de supports de cours, devoirs avec date limite et communication directe avec les étudiants de sa filière.",
        icon: BookIcon
      },
      {
        title: "Messagerie Directe",
        description: "Échanges simplifiés avec l'administration et canal de communication direct avec les parents d'élèves pour le suivi.",
        icon: BellIcon
      }
    ]
  },
  {
    profileName: "Étudiants",
    profileIcon: StudentsIcon,
    features: [
      {
        title: "Portail e-Learning",
        description: "Accès immédiat aux cours, bibliothèque virtuelle et dépôt sécurisé des devoirs notés.",
        icon: LibraryIcon
      },
      {
        title: "Bulletins en Temps Réel",
        description: "Visualisation transparente de ses moyennes semestrielles et téléchargement des relevés officiels signés.",
        icon: CheckCircleIcon
      },
      {
        title: "Bibliothèque & Annales",
        description: "Accès à la bibliothèque virtuelle de l'université, aux annales d'examens et aux ressources de recherche.",
        icon: BookIcon
      }
    ]
  },
  {
    profileName: "Parents",
    profileIcon: ParentIcon,
    features: [
      {
        title: "Suivi d'Assiduité",
        description: "Notification immédiate en cas d'absence de l'étudiant. Suivi du parcours et calendrier des examens.",
        icon: ClockIcon
      },
      {
        title: "Règlement Scolarité",
        description: "Paiement en ligne sécurisé des tranches scolaires et consultation de l'historique de facturation.",
        icon: MoneyIcon
      },
      {
        title: "Rendez-vous en Ligne",
        description: "Demandes et planification d'entretiens pédagogiques avec les enseignants de l'étudiant en un clic.",
        icon: UsersIcon
      }
    ]
  }
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="relative bg-arbor-surface-low text-arbor-on-surface py-20 px-6 lg:px-20 overflow-hidden font-arbor-body border-t border-white/5">
      
      {/* Grille de fond "Tech" subtile */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Halo lumineux vert en arrière-plan */}
      <div className="absolute top-1/2 left-2/3 w-[300px] h-[300px] bg-arbor-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1440px] mx-auto">
        
        {/* En-tête de section */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-arbor-bg/60 border border-arbor-primary/30 text-arbor-primary text-[10px] font-arbor-mono tracking-widest uppercase mb-4">
            FONCTIONNALITÉS CIBLÉES
          </div>
          <h2 className="font-arbor-display text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">
            Une plateforme pensee pour chaque profil
          </h2>
          <p className="font-arbor-body text-xs lg:text-sm text-arbor-on-surface-variant leading-relaxed">
            Dites adieu aux processus manuels complexes. GU unifie et automatise les flux de travail pour l'ensemble des acteurs de votre écosystème universitaire.
          </p>
        </div>

        {/* Grille des profils utilisateur (4 colonnes de même hauteur) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
          
          {PROFILES_DATA.map((group) => {
            const ProfileIcon = group.profileIcon;
            
            return (
              <div key={group.profileName} className="flex flex-col gap-6">
                
                {/* En-tête de Profil */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <div className="p-1.5 rounded-lg bg-arbor-secondary-container/20 text-arbor-primary">
                    <ProfileIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-arbor-display text-lg font-bold text-white tracking-tight">
                    {group.profileName}
                  </h3>
                </div>

                {/* Liste des cartes du profil (parfaitement alignées avec 3 cartes par colonne) */}
                <div className="flex flex-col gap-4">
                  {group.features.map((feature) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div 
                        key={feature.title}
                        className="group relative p-5 rounded-xl bg-arbor-surface/40 backdrop-blur-md border border-white/10 hover:border-arbor-primary/30 hover:bg-arbor-secondary-container/10 shadow-lg transition-all duration-300 ease-out transform hover:-translate-y-0.5 cursor-pointer"
                        style={{
                          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        {/* Icône de fonctionnalité */}
                        <div className="w-9 h-9 rounded-lg bg-arbor-secondary-container/15 group-hover:bg-arbor-secondary-container/30 text-arbor-primary flex items-center justify-center mb-3 transition-colors duration-300">
                          <FeatureIcon className="w-5 h-5" />
                        </div>

                        {/* Titre */}
                        <h4 className="font-arbor-display text-sm lg:text-base font-bold text-white mb-2 tracking-tight">
                          {feature.title}
                        </h4>

                        {/* Description */}
                        <p className="font-arbor-body text-xs text-arbor-on-surface-variant leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
