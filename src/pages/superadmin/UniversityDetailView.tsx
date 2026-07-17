// src/pages/superadmin/UniversityDetailView.tsx
// ──────────────────────────────────────────────────────────────
// Vue d'impersonnalisation de session universitaire.
// Le Super Admin consulte et gère un tenant universitaire en temps réel.
// ──────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '@fb';

// Composants de structure
import ForestBackground from '../../components/layout/ForestBackground';
import SuperAdminSidebar from '../../components/superadmin/SuperAdminSidebar';
import SuperAdminHeader from '../../components/superadmin/SuperAdminHeader';

// Sections administratives universitaires réutilisées (sans extension pour robustesse)
import OverviewSection from '../../components/admin/sections/OverviewSection';
import StudentsSection from '../../components/admin/sections/StudentsSection';
import TeachersSection from '../../components/admin/sections/TeachersSection';
import NotesSection from '../../components/admin/sections/NotesSection';
import FinancesSection from '../../components/admin/sections/FinancesSection';
import LibrarySection from '../../components/admin/sections/LibrarySection';
import NotificationsSection from '../../components/admin/sections/NotificationsSection';
import AuditSection from '../../components/admin/sections/AuditSection';
import ConfigSection from '../../components/admin/sections/ConfigSection';

const SECTION_TITLES: Record<string, string> = {
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

export function UniversityDetailView() {
  const { universityId } = useParams<{ universityId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [nomUniversite, setNomUniversite] = useState('Chargement...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!universityId) return;

    setLoading(true);
    const nameRef = ref(database, `saas_admin/universites/${universityId}/nom`);

    const unsubscribe = onValue(nameRef, (snapshot) => {
      if (snapshot.exists()) {
        setNomUniversite(snapshot.val());
      } else {
        setNomUniversite('Université inconnue');
      }
      setLoading(false);
    }, (error) => {
      console.error('Erreur chargement nom université:', error);
      setNomUniversite('Erreur de chargement');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [universityId]);

  // Rendu de la section active en y passant la prop universityId={universityId}
  const renderSection = () => {
    if (!universityId) return null;

    switch (activeSection) {
      case 'overview':
        return <OverviewSection onNavigate={setActiveSection} universityId={universityId} />;
      case 'students':
        return <StudentsSection universityId={universityId} />;
      case 'teachers':
        return <TeachersSection universityId={universityId} />;
      case 'notes':
        return <NotesSection universityId={universityId} />;
      case 'finances':
        return <FinancesSection universityId={universityId} />;
      case 'library':
        return <LibrarySection universityId={universityId} />;
      case 'notifications':
        return <NotificationsSection universityId={universityId} />;
      case 'audit':
        return <AuditSection universityId={universityId} />;
      case 'config':
        return <ConfigSection universityId={universityId} />;
      default:
        return <OverviewSection onNavigate={setActiveSection} universityId={universityId} />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col font-body text-xs text-on-surface bg-bg select-none">
      
      {/* ── BANDEAU D'IMPERSONNIFICATION (h-10) ── */}
      <div className="h-10 min-h-[40px] bg-primary-container border-b border-primary/20 flex items-center justify-between px-6 z-50 text-xs font-semibold text-accent">
        <div className="flex items-center gap-2">
          <span>👁️</span>
          <span>Vous consultez · <strong className="text-on-surface">{nomUniversite}</strong> · en tant que Super Admin GU</span>
        </div>
        <button
          onClick={() => navigate('/superadmin/dashboard')}
          className="btn btn-xs h-7 px-3 bg-accent hover:bg-accent/80 text-bg border-none font-bold rounded uppercase tracking-wider transition-colors cursor-pointer"
        >
          &larr; Retour au panel GU
        </button>
      </div>

      {/* ── CONTENU DESSOUS (h-[calc(100vh-40px)]) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Fond forêt */}
        <ForestBackground />

        {/* Sidebar Super Admin en mode impersonation */}
        <SuperAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} mode="impersonate" />

        {/* Zone de contenu droite */}
        <div className="flex-1 ml-52 h-full flex flex-col overflow-hidden">
          {/* Header */}
          <SuperAdminHeader title={SECTION_TITLES[activeSection]} />

          {/* Section Active */}
          <main className="flex-1 overflow-y-auto p-6 sidebar-nav">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center flex-col gap-2">
                <span className="loading loading-spinner text-accent loading-md"></span>
                <span className="text-on-surface-muted text-xs">Chargement du tenant...</span>
              </div>
            ) : (
              renderSection()
            )}
          </main>
        </div>
      </div>

    </div>
  );
}

export default UniversityDetailView;
