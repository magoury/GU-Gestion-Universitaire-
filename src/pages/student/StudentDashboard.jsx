// src/pages/student/StudentDashboard.jsx
// ──────────────────────────────────────────────────────────────
// Page principale de l'espace Étudiant.
// Assure la navigation et l'affichage des 7 sections.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import StudentSidebar from '../../components/student/StudentSidebar.jsx';
import StudentHeader from '../../components/student/StudentHeader.jsx';

// Sections
import StudentOverview from '../../components/student/sections/StudentOverview.jsx';
import StudentCourses from '../../components/student/sections/StudentCourses.jsx';
import StudentGrades from '../../components/student/sections/StudentGrades.jsx';
import StudentSchedule from '../../components/student/sections/StudentSchedule.jsx';
import StudentLibrary from '../../components/student/sections/StudentLibrary.jsx';
import StudentPayments from '../../components/student/sections/StudentPayments.jsx';
import StudentRGPD from '../../components/student/sections/StudentRGPD.jsx';

const SECTION_TITLES = {
  dashboard: 'Tableau de Bord Étudiant',
  courses: 'Mes Cours Inscrits',
  notes: 'Mes Notes & Bulletins',
  schedule: 'Mon Emploi du Temps Semestriel',
  library: 'Bibliothèque & Ressources',
  payments: 'Gestion de mes Paiements & Facturation',
  rgpd: 'Conformité RGPD & Données Personnelles',
};

function StudentDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [courseFilter, setCourseFilter] = useState(null); // Utile pour filtrer la biblio par cours

  const handleNavigateToLibrary = (courseId) => {
    setCourseFilter(courseId);
    setActiveSection('library');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <StudentOverview onNavigate={setActiveSection} />;
      case 'courses':
        return <StudentCourses onNavigateToLibrary={handleNavigateToLibrary} />;
      case 'notes':
        return <StudentGrades />;
      case 'schedule':
        return <StudentSchedule />;
      case 'library':
        return <StudentLibrary preselectedCourseId={courseFilter} onClearFilter={() => setCourseFilter(null)} />;
      case 'payments':
        return <StudentPayments />;
      case 'rgpd':
        return <StudentRGPD />;
      default:
        return <StudentOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex font-body text-xs text-on-surface bg-bg select-none relative">
      {/* Fond forêt */}
      <ForestBackground />

      {/* Sidebar */}
      <StudentSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Zone droite */}
      <div className="flex-1 ml-52 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <StudentHeader title={SECTION_TITLES[activeSection]} />

        {/* Section Active */}
        <main className="flex-1 overflow-y-auto p-6 sidebar-nav">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
