// src/components/admin/sections/LibrarySection.tsx
// ──────────────────────────────────────────────────────────────
// Section de la bibliothèque numérique : ressources, liens, livres.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ref, set, push } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { formatDate } from '../../../lib/utils.js';
import { AlertIcon, CheckIcon, PlusIcon, BookIcon, FileIcon, HelpIcon, ChevronIcon } from '../../icons/Icons.jsx';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface LibraryResource {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  lien: string;
  description: string;
  timestamp: number;
}

interface LibrarySectionProps {
  universityId?: string;
}

function LibrarySection({ universityId: propUniversityId }: LibrarySectionProps): React.JSX.Element {
  const { universityId: contextUniversityId } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  // Charger les ressources de la bibliothèque en temps réel
  const { data: libraryData, loading } = useFirebaseData('library', universityId);

  const libraryList = useMemo<LibraryResource[]>(() => {
    if (!libraryData) return [];
    return (Object.values(libraryData) as LibraryResource[]).sort((a, b) => b.timestamp - a.timestamp);
  }, [libraryData]);

  // États de modales
  const [modalAjoutOuverte, setModalAjoutOuverte] = useState(false);

  // Formulaire d'ajout
  const [formData, setFormData] = useState({ titre: '', auteur: '', categorie: 'Livre', lien: '', description: '' });

  // Feedbacks
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  const handleAjouterRessource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!formData.titre || !formData.auteur || !formData.lien) {
      setErreur('Veuillez remplir les champs obligatoires (Titre, Auteur, Lien).');
      return;
    }

    try {
      const libraryRef = ref(database, `universities/${universityId}/library`);
      const newResourceRef = push(libraryRef);
      const resourceId = newResourceRef.key;

      await set(newResourceRef, {
        id: resourceId,
        titre: formData.titre,
        auteur: formData.auteur,
        categorie: formData.categorie,
        lien: formData.lien,
        description: formData.description || '',
        timestamp: Date.now(),
      });

      setSuccess('Ressource pédagogique ajoutée à la bibliothèque avec succès !');
      setFormData({ titre: '', auteur: '', categorie: 'Livre', lien: '', description: '' });
      setModalAjoutOuverte(false);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la publication de la ressource.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Barre d'Actions */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-on-surface-muted text-xs font-semibold">
          Ressources d'études, Livres et Manuels partagés
        </h3>
        <button
          onClick={() => setModalAjoutOuverte(true)}
          className="btn btn-sm btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Publier une ressource
        </button>
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Grille des Ressources */}
      {loading ? (
        <LoadingSpinner message="Chargement des ressources..." />
      ) : libraryList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {libraryList.map((res) => {
            let IconComponent = BookIcon;
            let iconColor = 'text-primary';
            if (res.categorie === 'PDF') {
              IconComponent = FileIcon;
              iconColor = 'text-accent';
            } else if (res.categorie === 'Lien de cours') {
              IconComponent = HelpIcon;
              iconColor = 'text-info';
            } else if (res.categorie === 'Vidéo') {
              IconComponent = ChevronIcon;
              iconColor = 'text-warning';
            }

            return (
              <div key={res.id} className="card bg-surface border border-white/10 shadow-xl flex flex-col justify-between p-4">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="bg-surface-high p-1.5 rounded flex items-center justify-center">
                      <IconComponent className={`w-4 h-4 ${iconColor}`} />
                    </span>
                    <span className="badge badge-accent badge-xs font-bold uppercase tracking-wide">
                      {res.categorie}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-sm text-on-surface mt-3 line-clamp-2">
                    {res.titre}
                  </h4>
                  <p className="text-[10px] text-on-surface-muted mt-1 font-semibold">
                    Par {res.auteur}
                  </p>
                  {res.description && (
                    <p className="text-[11px] text-on-surface-muted mt-2 leading-relaxed line-clamp-3">
                      {res.description}
                    </p>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between">
                  <span className="text-[9px] text-on-surface-muted">
                    Ajouté le {formatDate(res.timestamp)}
                  </span>
                  <a
                    href={res.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-xs btn-primary font-bold text-[10px]"
                  >
                    Consulter
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card bg-surface border border-white/10 p-16 text-center text-on-surface-muted italic">
          La bibliothèque numérique est vide. Commencez à publier des manuels et cours.
        </div>
      )}

      {/* ── MODAL AJOUT RESSOURCE ── */}
      {modalAjoutOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalAjoutOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-lg text-on-surface border-b border-white/10 pb-2">
              Référencer une nouvelle ressource d'étude
            </h3>
            <form onSubmit={handleAjouterRessource} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Titre de la ressource *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Programmation Web en JavaScript"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Auteur / Éditeur *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prof. Koffi"
                    value={formData.auteur}
                    onChange={(e) => setFormData({ ...formData, auteur: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Catégorie *</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    className="select select-bordered bg-surface w-full text-sm border-white/10"
                  >
                    <option value="Livre">Livre</option>
                    <option value="PDF">Support PDF</option>
                    <option value="Lien de cours">Lien de cours</option>
                    <option value="Vidéo">Vidéo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Lien d'accès / URL *</label>
                <input
                  type="url"
                  required
                  placeholder="Ex: https://drive.google.com/..."
                  value={formData.lien}
                  onChange={(e) => setFormData({ ...formData, lien: e.target.value })}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Description optionnelle</label>
                <textarea
                  placeholder="Contenu du manuel, chapitres importants..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea textarea-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Publier dans la Bibliothèque
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default LibrarySection;
export { LibrarySection };
