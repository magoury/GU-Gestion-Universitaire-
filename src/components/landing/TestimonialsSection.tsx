// src/components/landing/TestimonialsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TestimonialsSection — Section de preuve sociale (Témoignages).
// Comprend 3 témoignages fictifs d'acteurs de l'enseignement supérieur.
// Conçu avec des avatars à initiales stylisées et des avis en étoiles en couleur teal.
// Style compact, moderne et conforme au design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

import forest3 from '../../assets/landing/forest-3.jpg.jpeg';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  institution: string;
  quote: string;
  rating: number;
  initials: string;
  avatarBgColor: string; // ex: bg-arbor-secondary-container
}

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 'testi-1',
    name: 'Prof. Bakary Diop',
    role: 'Doyen de la Faculté des Sciences Appliquées',
    institution: 'Institut Polytechnique des Collines de Songon (IPCS)',
    quote: '« La transition numérique de notre département s’est faite en un temps record. La centralisation des notes et le cloisonnement multi-tenant assurent une confidentialité totale lors des délibérations d’examens. Un gain d’efficacité inestimable pour notre corps enseignant. »',
    rating: 5,
    initials: 'BD',
    avatarBgColor: 'bg-arbor-secondary-container/50 text-arbor-on-secondary-container',
  },
  {
    id: 'testi-2',
    name: 'Dr. Chantal Lawson',
    role: 'Directrice Générale Adjointe',
    institution: 'Université des Hauts-Plateaux de Mankono (UHPM)',
    quote: '« Avant GU, l’édition de nos bulletins académiques de fin de semestre était un goulot d’étranglement administratif majeur. Aujourd’hui, le calcul automatisé des moyennes pondérées nous a permis de libérer plus de deux semaines de travail administratif à chaque session. »',
    rating: 5,
    initials: 'CL',
    avatarBgColor: 'bg-arbor-primary/20 text-arbor-primary',
  },
  {
    id: 'testi-3',
    name: 'M. Ibrahim Keïta',
    role: 'Responsable de la Scolarité et des Flux Financiers',
    institution: 'Institut Supérieur des Affaires du Littoral de Fresco (ISALF)',
    quote: '« La mise en place de la facturation échelonnée en ligne et le système automatique de relance des scolarités ont transformé notre gestion de trésorerie. Les parents apprécient la transparence et la simplicité des règlements, ce qui a réduit nos impayés de 75%. »',
    rating: 5,
    initials: 'IK',
    avatarBgColor: 'bg-emerald-500/20 text-emerald-300',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative bg-arbor-surface-low text-arbor-on-surface py-16 px-6 lg:px-20 overflow-hidden font-arbor-body border-t border-white/5">
      {/* Image de forêt en arrière-plan à 100% d'opacité */}
      <img
        src={forest3}
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
        loading="lazy"
      />
      {/* Overlay sombre identique à la section Hero (bg-arbor-bg/65 z-10) */}
      <div className="absolute inset-0 bg-arbor-bg/65 z-10 pointer-events-none" />

      {/* Grille technique de fond subtile */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-10" />

      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-arbor-primary/5 rounded-full blur-[110px] pointer-events-none z-10" />

      {/* Conteneur principal avec z-20 pour surmonter l'overlay */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto">
        {/* En-tête de section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arbor-bg/60 border border-arbor-primary/30 text-arbor-primary text-[10px] font-arbor-mono tracking-widest uppercase mb-3">
            RETOUR D’EXPÉRIENCE
          </div>
          <h2 className="font-arbor-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight mb-3">
            Ce que disent nos établissements partenaires
          </h2>
          <p className="font-arbor-body text-xs lg:text-sm text-arbor-on-surface-variant leading-relaxed">
            Découvrez comment des universités et instituts de tailles variées automatisent leur quotidien et sécurisent leur gestion opérationnelle grâce à GU.
          </p>
        </div>

        {/* Grille des témoignages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-[1100px] mx-auto items-stretch">
          {TESTIMONIALS_DATA.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex flex-col justify-between p-6 rounded-xl bg-arbor-surface/40 border border-white/10 hover:border-white/20 hover:bg-arbor-surface-high/40 transition-all duration-300 backdrop-blur-md shadow-lg"
            >
              <div>
                {/* Note en étoiles (Teal) */}
                <div className="flex items-center gap-0.5 mb-4 text-arbor-primary">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ))}
                </div>

                {/* Citation */}
                <blockquote className="text-xs lg:text-[13px] italic text-arbor-on-surface-variant font-arbor-body leading-relaxed mb-6">
                  {testimonial.quote}
                </blockquote>
              </div>

              {/* Auteur */}
              <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                {/* Avatar Initiales */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-arbor-display shadow-md select-none shrink-0 ${testimonial.avatarBgColor}`}>
                  {testimonial.initials}
                </div>

                {/* Nom & Fonction */}
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-white font-arbor-display truncate">
                    {testimonial.name}
                  </span>
                  <span className="block text-[10px] text-arbor-primary font-medium leading-tight truncate">
                    {testimonial.role}
                  </span>
                  <span className="block text-[10px] text-arbor-on-surface-variant mt-0.5 font-medium truncate">
                    {testimonial.institution}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
