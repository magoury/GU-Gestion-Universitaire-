// src/pages/admin/AdminDashboard.jsx
// ──────────────────────────────────────────────────────────────
// Page maîtresse du Tableau de Bord de l'Administrateur Université.
// Gère l'arrière-plan, la sidebar, le header et le routage des 9 sections.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import AdminHeader from '../../components/admin/AdminHeader.jsx';

// Importation des 9 sections d'administration
import OverviewSection from '../../components/admin/sections/OverviewSection.jsx';
import StudentsSection from '../../components/admin/sections/StudentsSection.jsx';
import TeachersSection from '../../components/admin/sections/TeachersSection.jsx';
import NotesSection from '../../components/admin/sections/NotesSection.jsx';
import FinancesSection from '../../components/admin/sections/FinancesSection.jsx';
import LibrarySection from '../../components/admin/sections/LibrarySection.jsx';
import NotificationsSection from '../../components/admin/sections/NotificationsSection.jsx';
import AuditSection from '../../components/admin/sections/AuditSection.jsx';
import ConfigSection from '../../components/admin/sections/ConfigSection.jsx';

const SECTION_TITLES = {
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

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');

  // Rendu de la section active
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection onNavigate={setActiveSection} />;
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
        return <OverviewSection onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex text-on-surface select-none">
      
      {/* Arrière-plan Forêt Sombre */}
      <ForestBackground />

      {/* Barre Latérale Fixe (240px) */}
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

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
