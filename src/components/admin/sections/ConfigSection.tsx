// src/components/admin/sections/ConfigSection.tsx
// ──────────────────────────────────────────────────────────────
// Section de Configuration de l'Université (Locataire / Tenant).
// Permet d'ajuster le nom, le logo Base64, l'année scolaire,
// la devise et les filières académiques (Coefficients & ECTS).
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { database } from '@fb';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { ecrireAuditLog } from '../../../services/auditService';
import { AlertIcon, CheckIcon, PlusIcon } from '../../icons/Icons.jsx';

interface FiliereConfig {
  nom: string;
  ects: number;
  coef: number;
}

interface ConfigSectionProps {
  universityId?: string;
}

function ConfigSection({ universityId: propUniversityId }: ConfigSectionProps): React.JSX.Element {
  const { universityId: contextUniversityId, universityConfig: contextUniversityConfig } = useTenant();
  const universityId = propUniversityId || contextUniversityId;

  const [localConfig, setLocalConfig] = useState<any>(null);
  useEffect(() => {
    if (propUniversityId) {
      const configRef = ref(database, `universities/${propUniversityId}/config`);
      const unsubscribe = onValue(configRef, (snapshot) => {
        setLocalConfig(snapshot.val());
      });
      return () => unsubscribe();
    }
  }, [propUniversityId]);

  const universityConfig = propUniversityId ? localConfig : contextUniversityConfig;

  // États locaux du formulaire
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('');
  const [devise, setDevise] = useState('FCFA');
  const [annee, setAnnee] = useState('2025-2026');
  const [logoBase64, setLogoBase64] = useState('');
  const [filieres, setFilieres] = useState<FiliereConfig[]>([]);

  // États de feedback
  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les données de la config actuelle au montage
  useEffect(() => {
    if (universityConfig) {
      setNom(universityConfig.nom || '');
      setVille(universityConfig.ville || '');
      setPays(universityConfig.pays || '');
      setDevise(universityConfig.devise || 'FCFA');
      setAnnee(universityConfig.anneeAcademique || '2025-2026');
      setLogoBase64(universityConfig.logo || '');
      
      // Charger les filières
      if (universityConfig.filieres) {
        setFilieres(Object.values(universityConfig.filieres) as FiliereConfig[]);
      } else {
        setFilieres([
          { nom: 'Génie Logiciel', ects: 60, coef: 2 },
          { nom: 'Réseaux & Télécommunications', ects: 60, coef: 2 },
        ]);
      }
    }
  }, [universityConfig]);

  // Convertir l'image logo en Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250000) {
      setErreur('Le logo ne doit pas dépasser 250 Ko (limite Realtime Database).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Gérer l'ajout/suppression de filières dans le tableau
  const handleAjouterFiliere = () => {
    setFilieres([...filieres, { nom: '', ects: 60, coef: 1 }]);
  };

  const handleSupprimerFiliere = (idx: number) => {
    const list = [...filieres];
    list.splice(idx, 1);
    setFilieres(list);
  };

  const handleChangerFiliere = (idx: number, champ: keyof FiliereConfig, valeur: any) => {
    const list = [...filieres];
    list[idx] = {
      ...list[idx],
      [champ]: champ === 'nom' ? valeur : Number(valeur),
    };
    setFilieres(list);
  };

  // Soumission
  const handleSauvegarderConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) return;
    setErreur('');
    setSuccess('');
    setLoading(true);

    if (!nom || !ville || !pays) {
      setErreur('Le nom, la ville et le pays sont requis.');
      setLoading(false);
      return;
    }

    try {
      const filieresDict: Record<string, FiliereConfig> = {};
      filieres.forEach((f) => {
        if (f.nom) {
          filieresDict[f.nom.replace(/[.#$[\]]/g, '_')] = {
            nom: f.nom,
            ects: Number(f.ects || 60),
            coef: Number(f.coef || 1),
          };
        }
      });

      const updateData = {
        nom,
        ville,
        pays,
        devise,
        anneeAcademique: annee,
        logo: logoBase64,
        filieres: filieresDict,
      };

      const configRef = ref(database, `universities/${universityId}/config`);
      await update(configRef, updateData);

      // Audit Log
      await ecrireAuditLog(universityId, {
        acteurId: 'admin',
        acteurNom: 'Administrateur',
        acteurRole: 'admin_universite',
        action: 'CONFIG_MISE_A_JOUR',
        cible: universityId,
        detail: `Mise à jour de la configuration de l'université (Année: ${annee}).`,
      });

      setSuccess('Configuration globale mise à jour avec succès !');
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSauvegarderConfiguration} className="flex flex-col gap-4 max-w-3xl">
      
      {/* Feedbacks */}
      {erreur && <div className="alert alert-error text-xs p-2 flex items-center gap-2 animate-fade-in"><AlertIcon className="w-3.5 h-3.5 text-error" /> {erreur}</div>}
      {success && <div className="alert alert-success text-xs p-2 flex items-center gap-2 animate-fade-in"><CheckIcon className="w-3.5 h-3.5 text-success" /> {success}</div>}

      {/* Identité de l'établissement */}
      <div className="card bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <h4 className="font-display font-bold text-sm text-on-surface border-b border-white/5 pb-2">
          Identité de l'établissement
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Nom de l'Université *</label>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input input-bordered bg-surface w-full text-xs h-9 border-white/10"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Logo de l'établissement</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="file-input file-input-bordered file-input-xs bg-surface border-white/10 flex-1 text-xs"
              />
              {logoBase64 && (
                <img src={logoBase64} alt="Preview" className="w-8 h-8 object-contain rounded border border-white/10 p-0.5" />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Ville *</label>
            <input
              type="text"
              required
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="input input-bordered bg-surface w-full text-xs h-9 border-white/10"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Pays *</label>
            <input
              type="text"
              required
              value={pays}
              onChange={(e) => setPays(e.target.value)}
              className="input input-bordered bg-surface w-full text-xs h-9 border-white/10"
            />
          </div>
        </div>
      </div>

      {/* Paramètres Généraux */}
      <div className="card bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <h4 className="font-display font-bold text-sm text-on-surface border-b border-white/5 pb-2">
          Paramètres de Fonctionnement
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Année académique courante *</label>
            <input
              type="text"
              required
              value={annee}
              placeholder="Ex: 2025-2026"
              onChange={(e) => setAnnee(e.target.value)}
              className="input input-bordered bg-surface w-full text-xs h-9 border-white/10"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-muted mb-1">Devise d'établissement *</label>
            <select
              value={devise}
              onChange={(e) => setDevise(e.target.value)}
              className="select select-bordered bg-surface w-full text-xs h-9 border-white/10 py-1"
            >
              <option value="FCFA">FCFA (Franc CFA Ivory Coast)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structuration des filières */}
      <div className="card bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
          <h4 className="font-display font-bold text-sm text-on-surface">
            Filières, ECTS & Coefficients
          </h4>
          <button
            type="button"
            onClick={handleAjouterFiliere}
            className="btn btn-xs btn-primary font-bold flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" /> Ajouter une filière
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-compact table-sm w-full text-xs">
            <thead>
              <tr className="bg-surface-high text-xs">
                <th>Nom de la filière</th>
                <th>ECTS (An)</th>
                <th>Coefficient global</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filieres.map((f, idx) => (
                <tr key={idx} className="border-b border-white/5">
                  <td>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Génie Logiciel"
                      value={f.nom}
                      onChange={(e) => handleChangerFiliere(idx, 'nom', e.target.value)}
                      className="input input-bordered bg-surface input-xs w-full text-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      required
                      min="1"
                      value={f.ects}
                      onChange={(e) => handleChangerFiliere(idx, 'ects', e.target.value)}
                      className="input input-bordered bg-surface input-xs w-20 text-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      required
                      min="1"
                      value={f.coef}
                      onChange={(e) => handleChangerFiliere(idx, 'coef', e.target.value)}
                      className="input input-bordered bg-surface input-xs w-20 text-xs"
                    />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSupprimerFiliere(idx)}
                      className="btn btn-xs btn-error font-bold h-7 text-[10px]"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-sm btn-primary w-full flex items-center justify-center gap-2 h-9 text-xs"
      >
        {loading ? <span className="loading loading-spinner"></span> : <><CheckIcon className="w-4 h-4" /> <span>Sauvegarder la Configuration</span></>}
      </button>

    </form>
  );
}

export default ConfigSection;
export { ConfigSection };
