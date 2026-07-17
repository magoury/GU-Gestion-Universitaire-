// src/components/admin/sections/TeachersSection.tsx
// ──────────────────────────────────────────────────────────────
// Section de gestion des enseignants.
// Recrutement, affectation de cours et calcul des charges horaires.
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { creerEnseignant, affecterCours } from '../../../services/teacherService';
import { PlusIcon, BookIcon, AlertIcon, CheckIcon } from '../../icons/Icons.jsx';
import type { Teacher } from '@/types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface TeachersSectionProps {
  universityId?: string;
}

function TeachersSection({ universityId: propUniversityId }: TeachersSectionProps): React.JSX.Element {
  const { universityId: contextUniversityId } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  // Écoute des enseignants en temps réel
  const { data: teachersData, loading } = useFirebaseData('teachers', universityId);

  // Convertir en tableau
  const teachersList = useMemo<Teacher[]>(() => {
    if (!teachersData) return [];
    return Object.values(teachersData) as Teacher[];
  }, [teachersData]);

  // États des modales
  const [modalAjoutOuverte, setModalAjoutOuverte] = useState(false);
  const [modalAffecterOuverte, setModalAffecterOuverte] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Formulaire d'ajout
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', specialite: '', departement: '', telephone: '' });

  // Formulaire d'affectation
  const [coursId, setCoursId] = useState('');
  const [coursNom, setCoursNom] = useState('');
  const [coursHeures, setCoursHeures] = useState<string | number>(15);

  // États de feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');

  // Soumission Ajout
  const handleRecruterEnseignant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!formData.nom || !formData.prenom || !formData.email || !formData.specialite) {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      await creerEnseignant(universityId, formData);
      setSuccess('Enseignant recruté avec succès !');
      setFormData({ nom: '', prenom: '', email: '', specialite: '', departement: '', telephone: '' });
      setModalAjoutOuverte(false);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la création.');
    }
  };

  // Soumission Affectation de cours
  const handleAffecterCoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');

    if (!selectedTeacher || !coursId || !coursNom) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }

    try {
      await affecterCours(universityId, selectedTeacher.id, coursId, {
        nom: coursNom,
        heures: Number(coursHeures),
      });
      setSuccess(`Cours "${coursNom}" affecté à ${selectedTeacher.prenom} ${selectedTeacher.nom}.`);
      setCoursId('');
      setCoursNom('');
      setCoursHeures(15);
      setModalAffecterOuverte(false);
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'affectation du cours.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Barre d'Actions Supérieure */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-on-surface-muted text-xs font-semibold">
          Gestion des Enseignants & Chargement de cours
        </h3>
        <button
          onClick={() => setModalAjoutOuverte(true)}
          className="btn btn-sm btn-primary h-9 min-h-[36px] flex items-center gap-1.5 text-xs"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Recruter un enseignant
        </button>
      </div>

      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Tableau des Enseignants */}
      <div className="card bg-surface border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Chargement des enseignants..." />
        ) : teachersList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm w-full text-on-surface">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted text-xs">
                  <th>Nom & Prénoms</th>
                  <th>Spécialité / Département</th>
                  <th>Cours assignés</th>
                  <th>Charge horaire</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachersList.map((t) => {
                  const coursList = t.cours ? Object.values(t.cours) : [];
                  const chargeTotale = coursList.reduce((sum, c) => sum + Number(c.heures || 0), 0);

                  return (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.01] text-xs">
                      <td>
                        <div className="font-bold text-xs">{t.nom}</div>
                        <div className="text-[10px] text-on-surface-muted mt-0.5">{t.prenom} · {t.email}</div>
                      </td>
                      <td>
                        <div className="font-semibold text-xs">{t.specialite}</div>
                        <div className="text-[10px] text-primary font-bold mt-0.5">{t.departement || 'Général'}</div>
                      </td>
                      <td>
                        {coursList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {coursList.map((c: any) => (
                              <span key={c.id} className="badge badge-primary badge-xs font-semibold">
                                {c.nom} ({c.heures}h)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-on-surface-muted italic">Aucun cours</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${chargeTotale > 40 ? 'badge-error' : chargeTotale > 25 ? 'badge-warning' : 'badge-success'} badge-xs font-bold`}>
                          {chargeTotale} H / Semestre
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => { setSelectedTeacher(t); setModalAffecterOuverte(true); }}
                          className="btn btn-xs btn-outline btn-accent font-bold flex items-center gap-1"
                        >
                          <BookIcon className="w-3.5 h-3.5" /> Affecter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-on-surface-muted italic">
            Aucun enseignant recruté dans la base.
          </div>
        )}
      </div>

      {/* ── MODAL RECRUTER ENSEIGNANT ── */}
      {modalAjoutOuverte && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalAjoutOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-xl text-on-surface border-b border-white/10 pb-2">
              Recruter un enseignant
            </h3>
            <form onSubmit={handleRecruterEnseignant} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Adresse E-mail *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Spécialité *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Programmation Java"
                    value={formData.specialite}
                    onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Département</label>
                  <input
                    type="text"
                    placeholder="Ex: Informatique"
                    value={formData.departement}
                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                    className="input input-bordered bg-surface w-full text-sm border-white/10"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Valider le Recrutement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AFFECTER UN COURS ── */}
      {modalAffecterOuverte && selectedTeacher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4 text-on-surface animate-scale-up">
            <button onClick={() => setModalAffecterOuverte(false)} className="absolute top-4 right-4 text-lg">✕</button>
            <h3 className="font-display font-bold text-lg text-on-surface border-b border-white/10 pb-2">
              Affecter un cours à {selectedTeacher.prenom} {selectedTeacher.nom}
            </h3>
            <form onSubmit={handleAffecterCoursSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Code / ID du Cours *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: INF-301"
                  value={coursId}
                  onChange={(e) => setCoursId(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Nom du Cours *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Algorithmique Avancée"
                  value={coursNom}
                  onChange={(e) => setCoursNom(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-muted mb-1.5">Volume Horaire (heures/semestre) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={coursHeures}
                  onChange={(e) => setCoursHeures(e.target.value)}
                  className="input input-bordered bg-surface w-full text-sm border-white/10"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Valider l'Affectation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default TeachersSection;
export { TeachersSection };
