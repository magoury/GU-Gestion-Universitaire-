// src/pages/admin/AdminDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Page maîtresse du Tableau de Bord de l'Administrateur Université.
// Gère l'arrière-plan, la sidebar, le header et le routage des 9 sections.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';

// Importation des 9 sections d'administration
import OverviewSection from '../../components/admin/sections/OverviewSection';
import StudentsSection from '../../components/admin/sections/StudentsSection';
import TeachersSection from '../../components/admin/sections/TeachersSection';
import NotesSection from '../../components/admin/sections/NotesSection';
import FinancesSection from '../../components/admin/sections/FinancesSection';
import LibrarySection from '../../components/admin/sections/LibrarySection';
import NotificationsSection from '../../components/admin/sections/NotificationsSection';
import AuditSection from '../../components/admin/sections/AuditSection';
import ConfigSection from '../../components/admin/sections/ConfigSection';

type AdminSection =
  | 'overview'
  | 'students'
  | 'teachers'
  | 'notes'
  | 'finances'
  | 'library'
  | 'notifications'
  | 'audit'
  | 'config';

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: "Vue d'ensemble",
  students: "Gestion des Étudiants",
  teachers: "Gestion du Corps Enseignant",
  notes: "Bulletins & Suivi Académique",
  finances: "Gestion Financière",
  library: "Bibliothèque Numérique",
  notifications: "Annonces & Communication",
  audit: "Journal de Sécurité (Audit Logs)",
  config: "Configuration de l'Université",
};

function AdminDashboard(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  // Rendu de la section active
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection onNavigate={(sec: string) => setActiveSection(sec as AdminSection)} />;
      case 'students':
        return <StudentsSection />;
      case 'teachers':
        return <TeachersSection />;
      case 'notes':
        return <NotesSection />;
      case 'finances':
        return <FinancesSection />;
      case 'library':
        return <LibrarySection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'audit':
        return <AuditSection />;
      case 'config':
        return <ConfigSection />;
      default:
        return <OverviewSection onNavigate={(sec: string) => setActiveSection(sec as AdminSection)} />;
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex text-on-surface select-none">
      
      {/* Arrière-plan Forêt Sombre */}
      <ForestBackground />

      {/* Barre Latérale Fixe (240px) */}
      <AdminSidebar activeSection={activeSection} onSectionChange={(sec: string) => setActiveSection(sec as AdminSection)} />

      {/* Zone principale de contenu (à droite de la Sidebar fixée) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-52 relative">
        
        {/* Header de section */}
        <AdminHeader title={SECTION_TITLES[activeSection]} />

        {/* Espace de travail de la section (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <div className="max-w-6xl mx-auto pb-12">
            {renderSection()}
          </div>
        </main>

      </div>

    </div>
  );
}

export default AdminDashboard;
export { AdminDashboard };
