// src/pages/teacher/TeacherDashboard.jsx
// ──────────────────────────────────────────────────────────────
// Page principale de l'espace Enseignant.
// Gère la navigation et l'affichage des sections pédagogiques.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import TeacherSidebar from '../../components/teacher/TeacherSidebar.jsx';
import TeacherHeader from '../../components/teacher/TeacherHeader.jsx';

// Sections
import TeacherOverview from '../../components/teacher/sections/TeacherOverview.jsx';
import CoursesSection from '../../components/teacher/sections/CoursesSection.jsx';
import GradeEntrySection from '../../components/teacher/sections/GradeEntrySection.jsx';
import AssignmentsSection from '../../components/teacher/sections/AssignmentsSection.jsx';
import ResourcesSection from '../../components/teacher/sections/ResourcesSection.jsx';
import MessagesSection from '../../components/teacher/sections/MessagesSection.jsx';

const SECTION_TITLES = {
  dashboard: 'Tableau de Bord Enseignant',
  courses: 'Mes Cours Assignés',
  notes: 'Saisie des Notes & Bulletins',
  assignments: 'Gestion des Devoirs Publiés',
  resources: 'Dépôt de Ressources Pédagogiques',
  messages: 'Communications & Annonces',
};

function TeacherDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null); // Utile pour présélectionner un cours dans GradeEntry

  const handleNavigateToGrades = (courseId) => {
    setSelectedCourseId(courseId);
    setActiveSection('notes');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <TeacherOverview onNavigate={setActiveSection} onNavigateToGrades={handleNavigateToGrades} />;
      case 'courses':
        return <CoursesSection onNavigateToGrades={handleNavigateToGrades} />;
      case 'notes':
        return <GradeEntrySection preselectedCourseId={selectedCourseId} onClearPreselected={() => setSelectedCourseId(null)} />;
      case 'assignments':
        return <AssignmentsSection />;
      case 'resources':
        return <ResourcesSection />;
      case 'messages':
        return <MessagesSection />;
      default:
        return <TeacherOverview onNavigate={setActiveSection} onNavigateToGrades={handleNavigateToGrades} />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex font-body text-xs text-on-surface bg-bg select-none relative">
      {/* Fond forêt */}
      <ForestBackground />

      {/* Sidebar */}
      <TeacherSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Zone droite */}
      <div className="flex-1 ml-52 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <TeacherHeader title={SECTION_TITLES[activeSection]} />

        {/* Section Active */}
        <main className="flex-1 overflow-y-auto p-6 sidebar-nav">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default TeacherDashboard;
