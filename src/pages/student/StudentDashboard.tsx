// src/pages/student/StudentDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Page principale de l'espace Étudiant — version TSX.
// Assure la navigation et l'affichage des 7 sections.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import ForestBackground from '../../components/layout/ForestBackground';
import StudentSidebar from '../../components/student/StudentSidebar';
import StudentHeader from '../../components/student/StudentHeader';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../hooks/useFirebaseData';
import type { Student } from '@/types';

// Sections
import StudentOverview from '../../components/student/sections/StudentOverview';
import StudentCourses from '../../components/student/sections/StudentCourses';
import StudentGrades from '../../components/student/sections/StudentGrades';
import StudentSchedule from '../../components/student/sections/StudentSchedule';
import StudentLibrary from '../../components/student/sections/StudentLibrary';
import StudentPayments from '../../components/student/sections/StudentPayments';
import StudentRGPD from '../../components/student/sections/StudentRGPD';

type StudentSection = 'dashboard' | 'courses' | 'notes' | 'schedule' | 'library' | 'payments' | 'rgpd';

const SECTION_TITLES: Record<StudentSection, string> = {
  dashboard: 'Tableau de Bord Étudiant',
  courses: 'Mes Cours Inscrits',
  notes: 'Mes Notes & Bulletins',
  schedule: 'Mon Emploi du Temps Semestriel',
  library: 'Bibliothèque & Ressources',
  payments: 'Gestion de mes Paiements & Facturation',
  rgpd: 'Conformité RGPD & Données Personnelles',
};

function StudentDashboard(): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  // Charger le profil étudiant complet
  const { data: rawStudentProfile, loading: loadingStudent } = useFirebaseData(`students/${user?.uid}`, universityId);
  const studentProfile = rawStudentProfile as Student | null;

  const [activeSection, setActiveSection] = useState<StudentSection>('dashboard');
  const [courseFilter, setCourseFilter] = useState<string | null>(null);

  const handleNavigateToLibrary = (courseId: string) => {
    setCourseFilter(courseId);
    setActiveSection('library');
  };

  if (loadingStudent) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg relative">
        <ForestBackground />
        <div className="flex flex-col items-center gap-3 z-10">
          <span className="loading loading-spinner text-accent loading-md animate-spin"></span>
          <span className="text-on-surface-muted text-xs font-body">Initialisation de votre espace étudiant...</span>
        </div>
      </div>
    );
  }

  // Si le profil de l'étudiant est introuvable après chargement, afficher une alerte
  if (!studentProfile) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg relative">
        <ForestBackground />
        <div className="glass-card p-6 border border-white/10 rounded-lg max-w-md text-center z-10 font-body flex flex-col gap-3">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider">Profil Étudiant Introuvable</h2>
          <p className="text-xs text-on-surface-muted">Votre compte n'est pas encore enregistré sous la fiche étudiante de cet établissement.</p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <StudentOverview onNavigate={(sec) => setActiveSection(sec as StudentSection)} studentProfile={studentProfile} />;
      case 'courses':
        return <StudentCourses onNavigateToLibrary={handleNavigateToLibrary} studentProfile={studentProfile} />;
      case 'notes':
        return <StudentGrades />;
      case 'schedule':
        return <StudentSchedule studentProfile={studentProfile} />;
      case 'library':
        return <StudentLibrary preselectedCourseId={courseFilter} onClearFilter={() => setCourseFilter(null)} studentProfile={studentProfile} />;
      case 'payments':
        return <StudentPayments />;
      case 'rgpd':
        return <StudentRGPD />;
      default:
        return <StudentOverview onNavigate={(sec) => setActiveSection(sec as StudentSection)} studentProfile={studentProfile} />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex font-body text-xs text-on-surface bg-bg select-none relative">
      {/* Fond forêt */}
      <ForestBackground />

      {/* Sidebar */}
      <StudentSidebar activeSection={activeSection} onSectionChange={setActiveSection} studentProfile={studentProfile} />

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
export { StudentDashboard };
