// src/pages/teacher/TeacherDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Page principale de l'espace Enseignant — version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import TeacherSidebar from '../../components/teacher/TeacherSidebar';
import TeacherHeader from '../../components/teacher/TeacherHeader';

// Sections
import TeacherOverview from '../../components/teacher/sections/TeacherOverview';
import CoursesSection from '../../components/teacher/sections/CoursesSection';
import GradeEntrySection from '../../components/teacher/sections/GradeEntrySection';
import AssignmentsSection from '../../components/teacher/sections/AssignmentsSection';
import ResourcesSection from '../../components/teacher/sections/ResourcesSection';
import MessagesSection from '../../components/teacher/sections/MessagesSection';

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Tableau de Bord Enseignant',
  courses: 'Mes Cours Assignés',
  notes: 'Saisie des Notes & Bulletins',
  assignments: 'Gestion des Devoirs Publiés',
  resources: 'Dépôt de Ressources Pédagogiques',
  messages: 'Communications & Annonces',
};

function TeacherDashboard(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const handleNavigateToGrades = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveSection('notes');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <TeacherOverview onNavigateToGrades={handleNavigateToGrades} />;
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
        return <TeacherOverview onNavigateToGrades={handleNavigateToGrades} />;
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
export { TeacherDashboard };
