// src/components/student/sections/StudentRGPD.tsx
// ──────────────────────────────────────────────────────────────
// Section RGPD pour l'espace Étudiant — version TSX.
// Permet d'exporter ses données personnelles au format JSON-LD.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { exporterDonneesEtudiant } from '../../../services/rgpdService';
import { AlertIcon, CheckIcon, ShieldIcon, FileIcon } from '../../icons/Icons.jsx';

function StudentRGPD(): React.JSX.Element {
  const { user } = useAuth();
  const { universityId } = useTenant();

  const [erreur, setErreur] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExportRGPD = async () => {
    if (!universityId || !user?.uid) return;
    setErreur('');
    setSuccess('');
    setLoading(true);

    try {
      await exporterDonneesEtudiant(universityId, user.uid);
      setSuccess('Le téléchargement de votre archive de données personnelles a débuté. Un log d\'audit a été enregistré.');
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de l\'exportation de vos données.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-body text-on-surface max-w-3xl mx-auto w-full animate-fade-in">
      
      {/* ── CARD INFORMATION RGPD ── */}
      <div className="glass-card p-6 border border-white/5 rounded-lg flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-accent/10 text-accent">
            <ShieldIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent font-display">Vos Droits RGPD & Portabilité</h2>
            <p className="text-[10px] text-on-surface-muted mt-0.5">Conformément au Règlement Général sur la Protection des Données.</p>
          </div>
        </div>

        <div className="text-xs text-on-surface-muted leading-relaxed flex flex-col gap-3">
          <p>
            Dans le cadre de la protection de votre vie privée, la plateforme <strong>GU (Gestion Universitaire)</strong> vous permet d'exercer votre <strong>Droit à la Portabilité</strong>. Vous pouvez récupérer à tout moment l'ensemble des données vous concernant au format standardisé <strong>JSON-LD</strong> (basé sur le modèle sémantique de schema.org).
          </p>
          <p>
            Cette archive structurée et chiffrée en transit contient l'intégralité de vos informations académiques, financières, et de contact, et est exploitable par des tiers ou pour vos archives personnelles.
          </p>
        </div>
      </div>

      {/* ── ALERTS FEEDBACK ── */}
      {erreur && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-400 p-3 rounded flex items-center gap-2.5 text-xs animate-fade-in">
          <AlertIcon className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success bg-green-500/10 border-green-500/20 text-green-400 p-3 rounded flex items-center gap-2.5 text-xs animate-fade-in">
          <CheckIcon className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── LISTE DES DONNÉES INCLUSES ── */}
      <div className="glass-card p-6 border border-white/5 rounded-lg flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-accent font-display">Données incluses dans votre export</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-surface/40 border border-white/5 rounded p-3 flex flex-col gap-1">
            <span className="font-bold text-on-surface">1. Profil Personnel & Identité</span>
            <span className="text-[10px] text-on-surface-muted">Matricule, nom, prénom, email, téléphone, filière et niveau.</span>
          </div>

          <div className="bg-surface/40 border border-white/5 rounded p-3 flex flex-col gap-1">
            <span className="font-bold text-on-surface">2. Évaluations & Notes</span>
            <span className="text-[10px] text-on-surface-muted">Toutes vos notes de devoirs, d'examens, et de projets.</span>
          </div>

          <div className="bg-surface/40 border border-white/5 rounded p-3 flex flex-col gap-1">
            <span className="font-bold text-on-surface">3. Paiements & Règlements</span>
            <span className="text-[10px] text-on-surface-muted">Historique de vos reçus, montants et modes de versement.</span>
          </div>

          <div className="bg-surface/40 border border-white/5 rounded p-3 flex flex-col gap-1">
            <span className="font-bold text-on-surface">4. Inscriptions & Alertes</span>
            <span className="text-[10px] text-on-surface-muted">Historique des notifications de classe et alertes d'absences.</span>
          </div>
        </div>

        {/* Bouton d'export */}
        <button
          onClick={handleExportRGPD}
          disabled={loading}
          className="btn bg-accent hover:bg-accent/80 text-bg border-none font-bold uppercase tracking-wider h-10 w-full mt-2 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <>
              <FileIcon className="w-4 h-4" />
              <span>Exporter toutes mes données (JSON-LD)</span>
            </>
          )}
        </button>

        <div className="text-[9px] text-on-surface-muted text-center italic mt-1">
          Chaque exportation génère automatiquement une ligne dans les journaux d'audit de l'université pour des raisons de conformité.
        </div>
      </div>

      {/* ── DPO CONTACT ── */}
      <div className="text-center text-[10px] text-on-surface-muted">
        Une question sur la gestion de vos données ? Contactez notre Délégué à la Protection des Données (DPO) :{' '}
        <a href="mailto:dpo@gu.ci" className="text-accent hover:underline font-bold">
          dpo@gu.ci
        </a>
      </div>

    </div>
  );
}

export default StudentRGPD;
export { StudentRGPD };
