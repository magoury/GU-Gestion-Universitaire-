// src/pages/parent/ParentDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Page principale Espace Parent — Version TSX.
// Gère le chargement multi-enfants (fratrie) et la sélection.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { lireEtudiant } from '../../services/studentService';
import ForestBackground from '../../components/layout/ForestBackground';
import ParentSidebar from '../../components/parent/ParentSidebar';
import ParentHeader from '../../components/parent/ParentHeader';
import type { Student, ParentStudentLink } from '@/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Import des sections
import ParentOverview from '../../components/parent/sections/ParentOverview';
import ParentResults from '../../components/parent/sections/ParentResults';
import ParentAbsences from '../../components/parent/sections/ParentAbsences';
import ParentPayments from '../../components/parent/sections/ParentPayments';
import ParentContact from '../../components/parent/sections/ParentContact';

type ParentSection = 'overview' | 'results' | 'absences' | 'payments' | 'contact';

function ParentDashboard(): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [linkedStudents, setLinkedStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<ParentSection>('overview');

  useEffect(() => {
    async function loadData() {
      if (!user?.uid || !universityId) return;
      setLoading(true);
      try {
        // 1. Charger le profil utilisateur global
        const profileRef = ref(database, `users/${user.uid}`);
        const profileSnap = await get(profileRef);

        if (profileSnap.exists()) {
          const profileVal = profileSnap.val();

          // Ensemble d'IDs d'étudiants uniques à charger
          const studentIdsSet = new Set<string>();

          // Compatibilité 1 : linkedStudentId (singulier, historique)
          if (profileVal.linkedStudentId && typeof profileVal.linkedStudentId === 'string') {
            studentIdsSet.add(profileVal.linkedStudentId);
          }

          // Compatibilité 2 : linkedStudentIds (nouveau format, tableau ou dictionnaire)
          if (profileVal.linkedStudentIds) {
            if (Array.isArray(profileVal.linkedStudentIds)) {
              profileVal.linkedStudentIds.forEach((id: unknown) => {
                if (typeof id === 'string') studentIdsSet.add(id);
              });
            } else if (typeof profileVal.linkedStudentIds === 'object') {
              Object.keys(profileVal.linkedStudentIds).forEach((id) => {
                if (profileVal.linkedStudentIds[id] === true) {
                  studentIdsSet.add(id);
                }
              });
            }
          }

          // 2. Charger les liaisons ParentStudentLink de la base Firebase de cette université
          const linksRef = ref(database, `universities/${universityId}/parent_student_links`);
          const linksSnap = await get(linksRef);
          if (linksSnap.exists()) {
            const linksData = linksSnap.val() as Record<string, ParentStudentLink>;
            Object.values(linksData).forEach((link) => {
              if (link.parentUid === user.uid && link.studentId) {
                studentIdsSet.add(link.studentId);
              }
            });
          }

          // 3. Charger les fiches étudiants en parallèle
          const studentIdsList = Array.from(studentIdsSet);
          if (studentIdsList.length > 0) {
            const loadedStudents: Student[] = [];
            await Promise.all(
              studentIdsList.map(async (studentId) => {
                try {
                  const studentData = await lireEtudiant(universityId, studentId);
                  if (studentData) {
                    loadedStudents.push(studentData);
                  }
                } catch (err) {
                  console.error(`Erreur de chargement de l'étudiant ${studentId}:`, err);
                }
              })
            );
            setLinkedStudents(loadedStudents);
            if (loadedStudents.length > 0) {
              setSelectedStudentId(loadedStudents[0].id);
            }
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

  // Étudiant actuellement sélectionné
  const etudiantLie = linkedStudents.find((s) => s.id === selectedStudentId) || null;

  // Rendu de la section active
  const renderSection = () => {
    if (!etudiantLie) return null;

    switch (activeSection) {
      case 'overview':
        return <ParentOverview etudiantLie={etudiantLie} setActiveSection={(sec) => setActiveSection(sec as ParentSection)} />;
      case 'results':
        return <ParentResults etudiantLie={etudiantLie} />;
      case 'absences':
        return <ParentAbsences etudiantLie={etudiantLie} />;
      case 'payments':
        return <ParentPayments etudiantLie={etudiantLie} />;
      case 'contact':
        return <ParentContact etudiantLie={etudiantLie} />;
      default:
        return <ParentOverview etudiantLie={etudiantLie} setActiveSection={(sec) => setActiveSection(sec as ParentSection)} />;
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
      <div className="min-h-screen text-on-surface font-body flex items-center justify-center flex-col gap-2 relative">
        <ForestBackground />
        <LoadingSpinner message="Chargement de votre espace parent..." />
      </div>
    );
  }

  // Pas d'étudiant lié -> message d'erreur
  if (linkedStudents.length === 0) {
    return (
      <div className="min-h-screen text-on-surface font-body flex items-center justify-center p-4 relative">
        <ForestBackground />
        <div className="max-w-md w-full bg-surface/90 backdrop-blur-md border border-white/10 p-6 rounded-xl text-center flex flex-col gap-4 shadow-xl z-10">
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
    <div className="min-h-screen text-on-surface font-body select-none relative overflow-hidden flex w-screen h-screen">
      {/* Fond Forêt fixe */}
      <ForestBackground />

      {/* Sidebar fixe à gauche w-52 */}
      <ParentSidebar
        etudiantLie={etudiantLie}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Zone droite ml-52 */}
      <div className="flex-1 ml-52 flex flex-col h-full overflow-hidden">
        {/* Header sticky h-14 */}
        <ParentHeader
          title={getTitreSection()}
          etudiantLie={etudiantLie}
          linkedStudents={linkedStudents}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
        />

        {/* Zone de contenu scrollable p-6 */}
        <main className="flex-1 p-6 overflow-y-auto sidebar-nav">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default ParentDashboard;
export { ParentDashboard };
