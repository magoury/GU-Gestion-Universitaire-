import { useEffect, useState, useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { lireAuditLogs } from '../../../services/auditService.js';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, RefreshIcon } from '../../icons/Icons.jsx';

function AuditSection({ universityId: propUniversityId }) {
  const { universityId: contextUniversityId } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreAction, setFiltreAction] = useState('');

  // Recharger les logs à la demande ou au montage
  const chargerLogs = () => {
    if (universityId) {
      setLoading(true);
      lireAuditLogs(universityId, { limite: 100 })
        .then((data) => {
          // Tri décroissant automatique sur le timestamp
          const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
          setLogs(sorted);
        })
        .catch((err) => console.error("Erreur de chargement de l'audit log:", err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    chargerLogs();
  }, [universityId]);

  // Liste des actions uniques pour le filtre
  const actionsUniques = useMemo(() => {
    const list = logs.map((l) => l.action);
    return [...new Set(list)];
  }, [logs]);

  // Logs filtrés
  const logsFiltrés = useMemo(() => {
    return logs.filter((l) => {
      if (filtreAction && l.action !== filtreAction) return false;
      if (recherche) {
        const query = recherche.toLowerCase();
        const enNom = (l.acteurNom || '').toLowerCase();
        const enDetail = (l.detail || '').toLowerCase();
        const enAction = (l.action || '').toLowerCase();
        if (!enNom.includes(query) && !enDetail.includes(query) && !enAction.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [logs, filtreAction, recherche]);

  return (
    <div className="flex flex-col gap-4">
      
      {/* Filtres de recherche */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher par acteur, détail..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="input input-bordered bg-surface text-xs border-white/10 w-56 h-9 min-h-[36px]"
          />
          <select
            value={filtreAction}
            onChange={(e) => setFiltreAction(e.target.value)}
            className="select select-bordered bg-surface text-xs border-white/10 h-9 min-h-[36px] py-1"
          >
            <option value="">Toutes les actions</option>
            {actionsUniques.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <button
          onClick={chargerLogs}
          className="btn btn-sm btn-outline btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
        >
          <RefreshIcon className="w-3.5 h-3.5" /> Rafraîchir
        </button>
      </div>

      {/* Règle RGPD informative */}
      <div className="alert alert-warning text-xs p-2 flex items-start gap-2">
        <AlertIcon className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <strong>Sécurité & RGPD :</strong> Le journal d'audit est en écriture seule (Append-Only) pour le client. Toute suppression ou altération est strictement rejetée par les règles de sécurité Firebase.
        </div>
      </div>

      {/* Tableau historique d'audit */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : logsFiltrés.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm w-full text-on-surface text-xs">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted bg-surface-high/30 text-xs">
                  <th>Horodatage</th>
                  <th>Acteur</th>
                  <th>Rôle</th>
                  <th>Action</th>
                  <th>Détails de l'opération</th>
                  <th>Cible</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltrés.map((log) => {
                  let actionBadge = 'badge-ghost';
                  if (log.action.includes('CREE') || log.action.includes('SAISIE')) actionBadge = 'badge-success text-bg';
                  else if (log.action.includes('MODIFIE')) actionBadge = 'badge-warning text-bg';
                  else if (log.action.includes('CLOTURE') || log.action.includes('STATUT')) actionBadge = 'badge-error text-bg';

                  return (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.01] text-xs">
                      <td className="font-mono text-[10px] text-on-surface-muted">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="font-bold text-xs text-on-surface">{log.acteurNom}</td>
                      <td className="uppercase font-semibold tracking-wider text-[10px] text-primary">
                        {log.acteurRole.replace('_', ' ')}
                      </td>
                      <td>
                        <span className={`badge ${actionBadge} badge-xs font-bold text-[9px]`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="max-w-xs truncate text-xs text-on-surface-muted leading-relaxed" title={log.detail}>
                        {log.detail}
                      </td>
                      <td className="font-mono text-[10px] text-accent font-bold">{log.cible || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucun log d'audit ne correspond aux critères de recherche.
          </div>
        )}
      </div>

    </div>
  );
}

export default AuditSection;
export { AuditSection };
