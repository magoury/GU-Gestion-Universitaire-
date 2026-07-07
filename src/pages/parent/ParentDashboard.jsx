// src/pages/parent/ParentDashboard.jsx
// ──────────────────────────────────────────────────────────────
// Page principale Espace Parent.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../hooks/useAuth.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { lireEtudiant } from '../../services/studentService.js';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import ParentSidebar from '../../components/parent/ParentSidebar.jsx';
import ParentHeader from '../../components/parent/ParentHeader.jsx';

// Import des sections
import ParentOverview from '../../components/parent/sections/ParentOverview.jsx';
import ParentResults from '../../components/parent/sections/ParentResults.jsx';
import ParentAbsences from '../../components/parent/sections/ParentAbsences.jsx';
import ParentPayments from '../../components/parent/sections/ParentPayments.jsx';
import ParentContact from '../../components/parent/sections/ParentContact.jsx';

function ParentDashboard() {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [parentProfile, setParentProfile] = useState(null);
  const [etudiantLie, setEtudiantLie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    async function loadData() {
      if (!user?.uid || !universityId) return;
      setLoading(true);
      try {
        // Récupérer le profil utilisateur complet (incluant linkedStudentId)
        const profileRef = ref(database, `users/${user.uid}`);
        const profileSnap = await get(profileRef);

        if (profileSnap.exists()) {
          const profileVal = profileSnap.val();
          setParentProfile(profileVal);

          if (profileVal.linkedStudentId) {
            const studentData = await lireEtudiant(universityId, profileVal.linkedStudentId);
            setEtudiantLie(studentData);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données parent:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, universityId]);

  // Rendu de la section active
  const renderSection = () => {
    if (!etudiantLie) return null;

    switch (activeSection) {
      case 'overview':
        return <ParentOverview etudiantLie={etudiantLie} setActiveSection={setActiveSection} />;
      case 'results':
        return <ParentResults etudiantLie={etudiantLie} />;
      case 'absences':
        return <ParentAbsences etudiantLie={etudiantLie} />;
      case 'payments':
        return <ParentPayments etudiantLie={etudiantLie} />;
      case 'contact':
        return <ParentContact etudiantLie={etudiantLie} />;
      default:
        return <ParentOverview etudiantLie={etudiantLie} setActiveSection={setActiveSection} />;
    }
  };

  const getTitreSection = () => {
    switch (activeSection) {
      case 'overview': return "Tableau de Bord";
      case 'results': return "Bulletins & Notes";
      case 'absences': return "Suivi de l'Assiduité";
      case 'payments': return "Factures & Paiements";
      case 'contact': return "Espace de Communication";
      default: return "Mon Espace Parent";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-on-surface font-body flex items-center justify-center flex-col gap-2">
        <ForestBackground />
        <span className="loading loading-spinner text-accent loading-md"></span>
        <span className="text-on-surface-muted text-xs">Chargement de votre espace parent...</span>
      </div>
    );
  }

  // Pas d'étudiant lié -> message d'erreur
  if (!parentProfile?.linkedStudentId) {
    return (
      <div className="min-h-screen text-on-surface font-body flex items-center justify-center p-4">
        <ForestBackground />
        <div className="max-w-md w-full bg-surface/90 backdrop-blur-md border border-white/10 p-6 rounded-xl text-center flex flex-col gap-4 shadow-xl">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <h2 className="text-lg font-bold font-display">Aucun étudiant lié</h2>
          <p className="text-sm text-on-surface-muted">
            Aucun étudiant n'est lié à ce compte de parent / tuteur. Veuillez contacter l'administration de l'établissement pour associer votre compte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-on-surface font-body">
      {/* Fond Forêt fixe */}
      <ForestBackground />

      {/* Sidebar fixe à gauche w-52 */}
      <ParentSidebar
        etudiantLie={etudiantLie}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Zone droite ml-52 */}
      <div className="ml-52 flex flex-col min-h-screen">
        {/* Header sticky h-14 */}
        <ParentHeader title={getTitreSection()} etudiantLie={etudiantLie} />

        {/* Zone de contenu scrollable p-6 */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default ParentDashboard;
