import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../hooks/useFirebaseData.js';
import { BellIcon, SearchIcon, HelpIcon } from '../icons/Icons.jsx';

/**
 * @param {{ title: string }} props
 */
function AdminHeader({ title }) {
  const { userProfile } = useAuth();
  const { universityId } = useTenant();

  // Écouter les notifications en temps réel pour le badge
  const { data: notificationsData } = useFirebaseData('notifications', universityId);

  const nbNonLues = useMemo(() => {
    if (!notificationsData || !userProfile) return 0;
    
    // Les notifications de la base sont sous forme d'objet dictionnaire
    return Object.values(notificationsData).filter(
      (notif) => (notif.destinataireId === userProfile.uid || notif.destinataireId === 'all') && !notif.lue
    ).length;
  }, [notificationsData, userProfile]);

  return (
    <header className="sticky top-0 z-20 h-14 min-h-[56px] bg-bg/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 w-full gap-4">
      
      {/* Titre Section */}
      <h1 className="font-display font-bold text-lg text-on-surface truncate flex-shrink-0 pr-4">
        {title}
      </h1>

      {/* Barre de Recherche DaisyUI */}
      <div className="relative max-w-xs w-56 md:w-64">
        <input
          type="text"
          placeholder="Rechercher..."
          className="input input-bordered bg-surface w-full pr-10 text-xs h-8 py-1 border-white/10 text-on-surface focus:border-primary focus:outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-muted pointer-events-none">
          <SearchIcon className="w-3.5 h-3.5 text-on-surface-muted" />
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Icône Notification */}
        <div className="dropdown dropdown-end">
          <button className="btn btn-ghost btn-circle relative h-8 w-8 flex items-center justify-center">
            <BellIcon className="w-4 h-4 text-on-surface" />
            {nbNonLues > 0 && (
              <span className="badge badge-warning badge-sm absolute top-0.5 right-0.5 border-bg font-bold scale-90">
                {nbNonLues}
              </span>
            )}
          </button>
          
          {/* Liste rapide de notifications en dropdown */}
          <div className="dropdown-content menu p-3 shadow-2xl bg-surface border border-white/10 rounded-xl w-80 mt-2 z-30">
            <h3 className="font-semibold text-xs mb-1.5 text-on-surface">Notifications Récentes</h3>
            {notificationsData ? (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                {Object.values(notificationsData)
                  .filter((n) => n.destinataireId === userProfile?.uid || n.destinataireId === 'all')
                  .slice(0, 5)
                  .map((n) => (
                    <div key={n.id} className="p-2 hover:bg-surface-high/50 rounded-lg text-xs flex flex-col gap-1 border-b border-white/5 last:border-0">
                      <div className="flex justify-between font-bold text-on-surface">
                        <span>{n.titre}</span>
                        {!n.lue && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </div>
                      <p className="text-on-surface-muted leading-relaxed text-[11px]">{n.message}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-xs text-on-surface-muted py-4 text-center">Aucune notification.</div>
            )}
          </div>
        </div>

        {/* Aide */}
        <button className="btn btn-ghost btn-circle h-8 w-8 flex items-center justify-center text-on-surface-muted hover:text-on-surface">
          <HelpIcon className="w-4 h-4 text-on-surface-muted" />
        </button>
      </div>

    </header>
  );
}

export default AdminHeader;
export { AdminHeader };
