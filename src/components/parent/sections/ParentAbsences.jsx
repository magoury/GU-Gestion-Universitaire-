// src/components/parent/sections/ParentAbsences.jsx
// ──────────────────────────────────────────────────────────────
// Section Suivi des absences de l'élève.
// ──────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { formatDate } from '../../../lib/utils.js';

function ParentAbsences({ etudiantLie }) {
  const { universityId } = useTenant();

  // Écouter les absences de l'université et les enseignants
  const { data: allAbsences, loading: loadingAbsences } = useFirebaseData('absences', universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);

  // Mapping des enseignants (id -> Nom Complet)
  const teachersMap = useMemo(() => {
    if (!allTeachers) return {};
    const map = {};
    Object.values(allTeachers).forEach((t) => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [allTeachers]);

  // Absences de cet élève
  const myAbsences = useMemo(() => {
    if (!allAbsences || !etudiantLie) return [];
    
    const list = Object.values(allAbsences)
      .filter((a) => a.studentId === etudiantLie.id);

    // Trier par date décroissante
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    <div className="flex flex-col gap-6 text-on-surface font-body">
      
      {/* 3 KPI Cards Synthese */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Absences */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Total Absences</span>
            <span className="text-xl">📅</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-on-surface">
            {stats.total} <span className="text-xs font-sans text-on-surface-muted">créneau(x)</span>
          </div>
        </div>

        {/* Absences Justifiées */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Absences Justifiées</span>
            <span className="text-xl">✓</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-success">
            {stats.justifiees} <span className="text-xs font-sans text-on-surface-muted">justifiée(s)</span>
          </div>
        </div>

        {/* Absences Injustifiées */}
        <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-on-surface-muted uppercase">Absences Injustifiées</span>
            <span className="text-xl">⚠️</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-error">
            {stats.injustifiees} <span className="text-xs font-sans text-on-surface-muted">injustifiée(s)</span>
          </div>
        </div>

      </div>

      {/* Table des Absences */}
      <div className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
        <h3 className="font-bold font-display text-lg mb-4 border-b border-white/5 pb-3">
          Historique des Absences & Assiduité
        </h3>

        {loadingAbsences ? (
          <div className="py-16 flex justify-center items-center flex-col gap-2">
            <span className="loading loading-spinner text-accent loading-md"></span>
            <span className="text-xs text-on-surface-muted">Chargement des absences...</span>
          </div>
        ) : myAbsences.length === 0 ? (
          <div className="py-16 text-center text-success flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center text-xl">
              🌟
            </div>
            <div>
              <p className="font-semibold text-sm">Aucune absence enregistrée. Félicitations !</p>
              <p className="text-xs text-on-surface-muted mt-1">L'élève est parfaitement assidu.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted font-semibold uppercase">
                  <th className="py-3">Date</th>
                  <th className="py-3">Matière</th>
                  <th className="py-3">Enseignant</th>
                  <th className="py-3">Statut</th>
                  <th className="py-3 pl-4">Justification / Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {myAbsences.map((a) => {
                  const estJustifiee = a.statut === 'justifiee' || a.statut?.toLowerCase() === 'justifiée';
                  return (
                    <tr key={a.id || Math.random()} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3.5 font-medium">{formatDate(a.date)}</td>
                      <td className="py-3.5 font-semibold text-on-surface">{a.matiere || a.courseId || 'Matière'}</td>
                      <td className="py-3.5 text-on-surface-muted">
                        {teachersMap[a.enseignantId] || a.enseignantNom || 'Enseignant'}
                      </td>
                      <td className="py-3.5">
                        {estJustifiee ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase">
                            Justifiée
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-error/10 text-error border border-error/20 uppercase">
                            Injustifiée
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 text-on-surface-muted italic">
                        {a.commentaire || '—'}
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
        <div className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
          <h3 className="font-bold font-display text-lg mb-6 border-b border-white/5 pb-3">
            Répartition Mensuelle des Absences
          </h3>
          
          <div className="flex justify-between items-end h-40 pt-4 px-2 gap-2 border-b border-white/10">
            {monthlyData.map((data) => (
              <div key={data.nom} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                {/* Info bulle hover */}
                {data.count > 0 && (
                  <div className="absolute bottom-full mb-1 bg-surface-high border border-white/10 text-on-surface text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.count} abs.
                  </div>
                )}
                {/* Barre de graphe */}
                <div
                  style={{ height: `${data.count > 0 ? Math.max(data.percentage, 8) : 0}%` }}
                  className={`w-full max-w-[28px] rounded-t transition-all ${
                    data.count > 0 ? 'bg-gradient-to-t from-accent/60 to-accent shadow-lg' : 'bg-transparent'
                  }`}
                />
                {/* Label du mois */}
                <span className="text-[10px] text-on-surface-muted mt-2 font-medium">
                  {data.nom}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentAbsences;
