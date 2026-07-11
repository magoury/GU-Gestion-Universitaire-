// src/components/landing/Footer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Footer — Pied de page de la Landing Page.
// Conserve à l'identique l'ensemble des textes, liens et structures.
// Adapté visuellement au design system "Arbor Tech".
// ─────────────────────────────────────────────────────────────────────────────

export default function Footer() {
  const scrollVersSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="bg-arbor-bg py-16 text-arbor-on-surface border-t border-white/5 font-arbor-body">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Col 1 : Logo & Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-full bg-arbor-surface border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-arbor-primary"
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
            <span className="font-arbor-display font-extrabold text-lg text-white tracking-tight">GU</span>
          </div>
          <p className="text-arbor-on-surface-variant text-xs leading-relaxed max-w-xs">
            Plateforme SaaS de gestion universitaire pilotée par l'IA, conçue pour les établissements africains et francophones.
          </p>
        </div>

        {/* Col 2 : Produit */}
        <div>
          <span className="text-[10px] font-bold tracking-widest text-arbor-primary block mb-4 uppercase font-arbor-mono">
            PRODUIT
          </span>
          <ul className="flex flex-col gap-2.5">
            {['Fonctionnalités', 'Tarifs', 'Roadmap', 'Changelog'].map((link) => (
              <li key={link}>
                <button
                  onClick={() => {
                    if (link === 'Fonctionnalités') scrollVersSection('features');
                    else if (link === 'Tarifs') scrollVersSection('pricing');
                  }}
                  className="text-xs text-arbor-on-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  {link}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 : Ressources */}
        <div>
          <span className="text-[10px] font-bold tracking-widest text-arbor-primary block mb-4 uppercase font-arbor-mono">
            RESSOURCES
          </span>
          <ul className="flex flex-col gap-2.5">
            {['Documentation', 'API Reference', 'Guide Onboarding', 'Blog'].map((link) => (
              <li key={link}>
                <span className="text-xs text-arbor-on-surface-variant hover:text-white transition-colors cursor-default">
                  {link}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 : Légal */}
        <div>
          <span className="text-[10px] font-bold tracking-widest text-arbor-primary block mb-4 uppercase font-arbor-mono">
            LÉGAL
          </span>
          <ul className="flex flex-col gap-2.5">
            {['Politique RGPD', 'CGU', 'Sécurité', 'Contact'].map((link) => (
              <li key={link}>
                {link === 'Contact' ? (
                  <button
                    onClick={() => scrollVersSection('contact')}
                    className="text-xs text-arbor-on-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Contact
                  </button>
                ) : (
                  <span className="text-xs text-arbor-on-surface-variant hover:text-white transition-colors cursor-default">
                    {link}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Ligne du bas (Copyright) */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 border-t border-white/5 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-arbor-on-surface-variant/40">
        <span>© 2025 GU — Gestion Universitaire. Tous droits réservés.</span>
        <span>Plateforme conçue avec l'IA · Sécurisée pour les établissements académiques</span>
      </div>
    </footer>
  );
}
