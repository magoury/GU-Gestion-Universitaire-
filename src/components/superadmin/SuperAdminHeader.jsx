// src/components/superadmin/SuperAdminHeader.jsx
// ──────────────────────────────────────────────────────────────
// Header horizontal sticky pour le Command Center du Super Admin.
// ──────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, BellIcon, HelpIcon, PlusIcon } from '../icons/Icons.jsx';

function SuperAdminHeader({ title = 'Overview' }) {
  const navigate = useNavigate();

  return (
    <header className="h-14 min-h-[56px] sticky top-0 bg-bg/85 backdrop-blur-md border-b border-white/10 px-6 flex items-center justify-between z-20">
      
      {/* Titre & Recherche */}
      <div className="flex items-center gap-6 flex-1 max-w-xl">
        <h1 className="text-base font-semibold font-display text-on-surface flex-shrink-0 tracking-wide">
          {title}
        </h1>

        {/* Barre de recherche compacte */}
        <div className="relative w-56 md:w-64 hidden sm:block">
          <input
            type="text"
            placeholder="Search tenants, users..."
            className="w-full h-8 pl-8 pr-3 rounded-full bg-white/5 border border-white/10 text-xs text-on-surface placeholder-on-surface-muted/50 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
          />
          <SearchIcon className="w-3.5 h-3.5 text-on-surface-muted/50 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Bouton "+ NEW TENANT" */}
        <button
          onClick={() => navigate('/onboarding')}
          className="btn btn-sm h-8 min-h-[32px] px-3 bg-accent hover:bg-accent/80 text-bg border-none font-semibold text-xs rounded flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
        >
          <PlusIcon className="w-3.5 h-3.5 text-bg stroke-[2]" />
          <span className="hidden md:inline">New Tenant</span>
        </button>

        {/* Aide */}
        <button
          title="Documentation & Aide"
          className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-on-surface text-on-surface-muted transition-all cursor-pointer"
        >
          <HelpIcon className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            title="Notifications d'infrastructure"
            className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-on-surface text-on-surface-muted transition-all cursor-pointer"
          >
            <BellIcon className="w-4 h-4" />
          </button>
          {/* Point rouge de notification */}
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error border border-bg" />
        </div>
      </div>

    </header>
  );
}

export default SuperAdminHeader;
