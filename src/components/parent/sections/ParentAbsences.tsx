// src/components/parent/sections/ParentAbsences.tsx
// ──────────────────────────────────────────────────────────────
// Section Suivi des absences de l'élève — Version TSX.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { formatDate } from '../../../lib/utils';
import type { Student, Teacher } from '@/types';

// Composants UI partagés
import LoadingSpinner from '../../ui/LoadingSpinner';
import KPICard from '../../ui/KPICard';
import StatusBadge from '../../ui/StatusBadge';

interface ParentAbsencesProps {
  etudiantLie: Student;
}

interface Absence {
  id: string;
  studentId: string;
  courseId: string;
  matiereId?: string;
  date: string | number;
  statut: 'justifiee' | 'injustifiee' | 'justifiée' | 'injustifiée' | string;
  motif?: string;
  enseignantId: string;
}

function ParentAbsences({ etudiantLie }: ParentAbsencesProps): React.JSX.Element {
  const { universityId } = useTenant();

  // Écouter les absences de l'université et les enseignants
  const { data: allAbsences, loading: loadingAbsences } = useFirebaseData('absences', universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);

  // Mapping des enseignants (id -> Nom Complet)
  const teachersMap = useMemo<Record<string, string>>(() => {
    if (!allTeachers) return {};
    const map: Record<string, string> = {};
    const teachersList = Object.values(allTeachers) as Teacher[];
    teachersList.forEach((t) => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [allTeachers]);

  // Absences de cet élève
  const myAbsences = useMemo<Absence[]>(() => {
    if (!allAbsences || !etudiantLie) return [];
    
    const list = Object.values(allAbsences) as Absence[];
    const filtered = list.filter((a) => a.studentId === etudiantLie.id);

    // Trier par date décroissante
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAbsences, etudiantLie]);

  // Stats
  const stats = useMemo(() => {
    const total = myAbsences.length;
    const justifiees = myAbsences.filter((a) => a.statut === 'justifiee' || a.statut?.toLowerCase() === 'justifiée').length;
    const injustifiees = total - justifiees;
    return { total, justifiees, injustifiees };
  }, [myAbsences]);

  // Regroupement par mois pour le graphique CSS
  const monthlyData = useMemo(() => {
    const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const counts = Array(12).fill(0);

    myAbsences.forEach((a) => {
      const d = new Date(a.date);
      if (!isNaN(d.getTime())) {
        counts[d.getMonth()] += 1;
      }
    });

    const maxCount = Math.max(...counts, 1); // Éviter division par 0
    return moisNoms.map((nom, index) => ({
      nom,
      count: counts[index],
      percentage: (counts[index] / maxCount) * 100
    }));
  }, [myAbsences]);

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body animate-fade-in">
      
      {/* 3 KPI Cards Synthese */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Absences */}
        <KPICard
          label="Total Absences"
          value={`${stats.total} créneau(x)`}
          icon={<span>📅</span>}
          variant="none"
        />

        {/* Absences Justifiées */}
        <KPICard
          label="Absences Justifiées"
          value={`${stats.justifiees} justifiée(s)`}
          icon={<span>✓</span>}
          variant="success"
        />

        {/* Absences Injustifiées */}
        <KPICard
          label="Absences Injustifiées"
          value={`${stats.injustifiees} injustifiée(s)`}
          icon={<span>⚠️</span>}
          variant="error"
        />

      </div>

      {/* Table des Absences */}
      <div className="glass-card border border-white/5 rounded-lg overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 bg-surface/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Historique des Absences & Assiduité
          </h3>
        </div>

        {loadingAbsences ? (
          <LoadingSpinner size="sm" message="Chargement des absences..." />
        ) : myAbsences.length === 0 ? (
          <div className="text-center py-12 text-on-surface-muted text-xs italic">
            Félicitations, aucun créneau d'absence enregistré.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs text-on-surface">
              <thead>
                <tr className="border-b border-white/10 bg-surface/50 text-on-surface-muted text-[10px] uppercase">
                  <th className="py-2.5 pl-4">Cours / Matière</th>
                  <th className="py-2.5">Enseignant</th>
                  <th className="py-2.5">Date & Heure</th>
                  <th className="py-2.5">Motif / Justification</th>
                  <th className="py-2.5 pr-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {myAbsences.map((a) => {
                  const estJustifiee = a.statut === 'justifiee' || a.statut?.toLowerCase() === 'justifiée';
                  return (
                    <tr key={a.id} className="border-b border-white/5 last:border-none hover:bg-surface/20">
                      <td className="py-2.5 pl-4 font-semibold text-accent">{a.courseId || a.matiereId}</td>
                      <td className="py-2.5">{teachersMap[a.enseignantId] || 'Enseignant'}</td>
                      <td className="py-2.5 text-on-surface-muted">
                        {formatDate(typeof a.date === 'string' ? new Date(a.date).getTime() : a.date)}
                      </td>
                      <td className="py-2.5 italic text-on-surface-muted">
                        {estJustifiee ? (a.motif || 'Justifié par certificat médical') : 'Non justifié'}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <StatusBadge status={estJustifiee ? 'justifiée' : 'injustifiée'} customClass="border-none font-bold" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Graphique CSS simple des absences mensuelles */}
      {myAbsences.length > 0 && (
        <div className="bg-surface/40 backdrop-blur border border-white/5 p-5 rounded-xl shadow-lg flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Répartition Mensuelle des Absences
          </h3>
          
          <div className="flex justify-between items-end h-32 pt-4 px-2 bg-surface/20 rounded border border-white/5">
            {monthlyData.map((d) => (
              <div key={d.nom} className="flex flex-col items-center gap-1.5 flex-1 group relative">
                
                {/* Tooltip au survol */}
                <div className="absolute bottom-full mb-1 bg-surface border border-white/10 px-2 py-0.5 rounded text-[8px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.count} abs.
                </div>

                {/* Barre de graphe */}
                <div 
                  className={`w-4 rounded-t transition-all duration-500 ${
                    d.count > 0 ? 'bg-accent/80 group-hover:bg-accent' : 'bg-white/5'
                  }`}
                  style={{ height: `${d.count > 0 ? Math.max(d.percentage, 5) : 2}%` }}
                />
                
                {/* Libellé du mois */}
                <span className="text-[9px] text-on-surface-muted font-semibold uppercase">{d.nom}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentAbsences;
export { ParentAbsences };
