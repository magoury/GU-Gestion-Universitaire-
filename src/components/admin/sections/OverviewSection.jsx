import { useEffect, useState, useMemo } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { lireAuditLogs } from '../../../services/auditService.js';
import { formatDate } from '../../../lib/utils.js';
import {
  StudentsIcon,
  TeachersIcon,
  MoneyIcon,
  ClockIcon,
  AlertIcon,
  FileIcon,
  SettingsIcon,
  NotesIcon,
  BookIcon
} from '../../icons/Icons.jsx';

/**
 * @param {{ onNavigate: (sec: string) => void, universityId?: string }} props
 */
function OverviewSection({ onNavigate, universityId: propUniversityId }) {
  const { universityId: contextUniversityId, universityConfig: contextUniversityConfig } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [localConfig, setLocalConfig] = useState(null);
  useEffect(() => {
    if (propUniversityId) {
      const configRef = ref(database, `universities/${propUniversityId}/config`);
      const unsubscribe = onValue(configRef, (snapshot) => {
        setLocalConfig(snapshot.val());
      });
      return () => off(configRef);
    }
  }, [propUniversityId]);

  const universityConfig = propUniversityId ? localConfig : contextUniversityConfig;

  // Écouter les données clés
  const { data: studentsData, loading: loadingStudents } = useFirebaseData('students', universityId);
  const { data: teachersData, loading: loadingTeachers } = useFirebaseData('teachers', universityId);
  const { data: paymentsData, loading: loadingPayments } = useFirebaseData('payments', universityId);
  const { data: fraisData } = useFirebaseData('frais', universityId);
  const { data: gradesData } = useFirebaseData('grades', universityId);

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Charger les audit logs au montage / mise à jour
  useEffect(() => {
    if (universityId) {
      setLoadingAudit(true);
      lireAuditLogs(universityId, { limite: 5 })
        .then((logs) => {
          setAuditLogs(logs);
        })
        .catch((err) => console.error('Erreur chargement logs audit:', err))
        .finally(() => setLoadingAudit(false));
    }
  }, [universityId, paymentsData, studentsData, gradesData]); // recharger si des données changent

  // Compter les entités
  const nbStudents = useMemo(() => (studentsData ? Object.keys(studentsData).length : 0), [studentsData]);
  const nbTeachers = useMemo(() => (teachersData ? Object.keys(teachersData).length : 0), [teachersData]);
  
  const anneeAcademique = useMemo(() => {
    return universityConfig?.anneeAcademique || '2025-2026';
  }, [universityConfig]);

  // Calcul du taux de paiement
  const tauxPaiement = useMemo(() => {
    if (!studentsData || !fraisData) return 0;
    
    const etudiantsList = Object.values(studentsData);
    let totalAttendu = 0;

    // Calculer le montant total attendu pour tous les étudiants inscrits
    etudiantsList.forEach((st) => {
      const configFrais = fraisData[st.filiere];
      if (configFrais) {
        totalAttendu += Number(configFrais.montantTotal || 0);
      }
    });

    if (totalAttendu === 0) return 0;

    // Sommer tous les paiements enregistrés
    const totalPaye = paymentsData 
      ? Object.values(paymentsData).reduce((sum, p) => sum + Number(p.montant || 0), 0)
      : 0;

    return Math.min(Math.round((totalPaye / totalAttendu) * 100), 100);
  }, [studentsData, fraisData, paymentsData]);

  // Alertes financières : étudiants en retard (solde > 0)
  const alertesFinancieres = useMemo(() => {
    if (!studentsData || !fraisData) return [];
    
    const etudiantsList = Object.values(studentsData);
    const retards = [];

    etudiantsList.forEach((st) => {
      const configFrais = fraisData[st.filiere];
      if (!configFrais) return;

      const totalDu = configFrais.montantTotal || 0;
      
      // Sommer les paiements de cet étudiant
      const paye = paymentsData
        ? Object.values(paymentsData)
            .filter((p) => p.studentId === st.id)
            .reduce((sum, p) => sum + Number(p.montant), 0)
        : 0;

      const solde = totalDu - paye;
      if (solde > 0) {
        retards.push({
          id: st.id,
          nom: `${st.prenom} ${st.nom}`,
          matricule: st.matricule,
          solde,
        });
      }
    });

    // Trier par retard le plus élevé
    return retards.sort((a, b) => b.solde - a.solde).slice(0, 5);
  }, [studentsData, fraisData, paymentsData]);

  // Alertes pédagogiques : matières sans aucune note
  const alertesPedagogiques = useMemo(() => {
    if (!universityConfig?.filieres) return [];

    const matieresSansNotes = [];
    const matieresEvaluees = gradesData
      ? new Set(Object.values(gradesData).map((g) => g.matiereId))
      : new Set();

    // Parcourir toutes les matières configurées dans les filières de l'université
    Object.values(universityConfig.filieres).forEach((fil) => {
      const nomMatiere = fil.nom; // Chaque filière a un nom de matière ou une liste de matières associée
      if (nomMatiere && !matieresEvaluees.has(nomMatiere)) {
        matieresSansNotes.push(nomMatiere);
      }
    });

    return [...new Set(matieresSansNotes)].slice(0, 5);
  }, [universityConfig, gradesData]);

  const loadingGlobal = loadingStudents || loadingTeachers || loadingPayments;

  if (loadingGlobal) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Grille KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1 : Étudiants */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-row items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Étudiants Actifs</div>
            <div className="text-2xl font-bold text-on-surface mt-1">{nbStudents}</div>
          </div>
          <div className="bg-primary/10 p-2 rounded-lg">
            <StudentsIcon className="w-4.5 h-4.5 text-primary" />
          </div>
        </div>

        {/* KPI 2 : Enseignants */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-row items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Enseignants</div>
            <div className="text-2xl font-bold text-on-surface mt-1">{nbTeachers}</div>
          </div>
          <div className="bg-accent/10 p-2 rounded-lg">
            <TeachersIcon className="w-4.5 h-4.5 text-accent" />
          </div>
        </div>

        {/* KPI 3 : Taux de Paiement */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-row items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Taux de Paiement</div>
            <div className="text-2xl font-bold text-primary mt-1">{tauxPaiement}%</div>
          </div>
          <div className="bg-success/10 p-2 rounded-lg">
            <MoneyIcon className="w-4.5 h-4.5 text-success" />
          </div>
        </div>

        {/* KPI 4 : Année Académique */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-row items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Année Scolaire</div>
            <div className="text-xl font-bold text-on-surface mt-1.5">{anneeAcademique}</div>
          </div>
          <div className="bg-info/10 p-2 rounded-lg">
            <ClockIcon className="w-4.5 h-4.5 text-info" />
          </div>
        </div>

      </div>

      {/* Grid Alertes et Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Alertes prioritaires */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-col gap-4">
          <h3 className="font-display font-semibold text-base text-on-surface flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-accent" /> Alertes Prioritaires
          </h3>

          {/* Alertes Financières */}
          <div>
            <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">Retards de Scolarité</div>
            {alertesFinancieres.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {alertesFinancieres.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onNavigate('finances')}
                    className="flex justify-between items-center p-2 rounded bg-surface-high/40 hover:bg-surface-high/80 border border-white/5 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-on-surface">{a.nom}</div>
                      <div className="text-[10px] text-on-surface-muted mt-0.5">{a.matricule}</div>
                    </div>
                    <div className="text-xs font-bold text-error">
                      -{a.solde.toLocaleString()} FCFA
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-on-surface-muted italic">Aucun retard de paiement détecté.</div>
            )}
          </div>

          {/* Alertes Pédagogiques */}
          <div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Matières sans Notes</div>
            {alertesPedagogiques.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {alertesPedagogiques.map((mat, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigate('notes')}
                    className="flex items-center gap-2 p-2 rounded bg-surface-high/40 hover:bg-surface-high/80 border border-white/5 cursor-pointer transition-all"
                  >
                    <FileIcon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-on-surface">{mat}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-on-surface-muted italic">Toutes les matières possèdent des évaluations saisies.</div>
            )}
          </div>
        </div>

        {/* Activité récente */}
        <div className="card bg-surface shadow-xl border border-white/5 p-4 flex flex-col gap-3">
          <h3 className="font-display font-semibold text-base text-on-surface flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-accent" /> Journal d'Activité Récent
          </h3>

          {loadingAudit ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {auditLogs.map((log) => {
                let IconComponent = SettingsIcon;
                if (log.action.includes('ETUDIANT')) IconComponent = StudentsIcon;
                else if (log.action.includes('PAIEMENT')) IconComponent = MoneyIcon;
                else if (log.action.includes('NOTE')) IconComponent = NotesIcon;
                else if (log.action.includes('COURS')) IconComponent = BookIcon;

                return (
                  <div key={log.id} className="flex gap-3 items-start border-b border-white/5 pb-2 last:border-0">
                    <div className="bg-surface-high p-1.5 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-on-surface" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-on-surface-muted flex justify-between">
                        <span>{log.acteurNom} ({log.acteurRole.replace('_', ' ')})</span>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-on-surface mt-0.5 font-semibold leading-relaxed">
                        {log.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-on-surface-muted italic py-8 text-center">
              Aucune activité enregistrée sur ce locataire.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default OverviewSection;
export { OverviewSection };
