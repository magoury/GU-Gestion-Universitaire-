// src/components/admin/AcademicYearClosure.jsx
// ──────────────────────────────────────────────────────────────
// Composant de clôture d'année académique.
// ──────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext.jsx';
import {
  verifierPrealables,
  calculerResultatsFinaux,
  cloturerAnneeAcademique
} from '../../services/academicYearService.js';
import { AlertIcon, CheckIcon } from '../icons/Icons.jsx';

function AcademicYearClosure({ onFinished }) {
  const { universityId, universityConfig } = useTenant();
  const anneeCourante = universityConfig?.anneeAcademique || '2025-2026';

  const [modalOuvert, setModalOuvert] = useState(false);
  const [etape, setEtape] = useState(1);
  const [chargement, setChargement] = useState(false);
  
  // Données de vérification préalable
  const [peutCloturer, setPeutCloturer] = useState(true);
  const [alertes, setAlertes] = useState([]);
  const [estimations, setEstimations] = useState({ admis: 0, ajournes: 0, diplomes: 0 });

  // Confirmation
  const [inputText, setInputText] = useState('');
  const [erreur, setErreur] = useState('');
  const [bilanFinal, setBilanFinal] = useState(null);

  // Lancer la première étape : Vérification
  const handleOuvrirModal = async () => {
    setModalOuvert(true);
    setEtape(1);
    setChargement(true);
    setErreur('');
    setBilanFinal(null);
    setInputText('');

    try {
      // 1. Appeler verifierPrealables
      const verif = await verifierPrealables(universityId, anneeCourante);
      setPeutCloturer(verif.peutCloturer);
      setAlertes(verif.alertes);

      // 2. Calculer les estimations
      const resFinaux = await calculerResultatsFinaux(universityId, anneeCourante);
      const admis = resFinaux.filter(r => r.admis).length;
      const ajournes = resFinaux.filter(r => !r.admis).length;
      
      // Compter les diplômés : admis qui sont en L3 ou M2
      const diplomes = resFinaux.filter(r => r.admis && (r.niveau === 'L3' || r.niveau === 'M2')).length;

      setEstimations({ admis, ajournes, diplomes });
    } catch (err) {
      console.error(err);
      setErreur(err.message || "Impossible d'effectuer les vérifications préalables.");
    } finally {
      setChargement(false);
    }
  };

  // Clôture définitive (Étape 2)
  const handleCloturerDefinitif = async () => {
    if (inputText !== anneeCourante) {
      setErreur(`La confirmation doit correspondre exactement à "${anneeCourante}".`);
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      const bilan = await cloturerAnneeAcademique(universityId, anneeCourante);
      setBilanFinal(bilan);
      setEtape(3); // Étape succès
      onFinished?.();
    } catch (err) {
      console.error(err);
      setErreur(err.message || "Une erreur critique s'est produite lors de la clôture.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOuvrirModal}
        className="btn btn-error btn-sm h-9 min-h-[36px] font-bold text-xs cursor-pointer"
      >
        🔒 Clôturer l'année {anneeCourante}
      </button>

      {modalOuvert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-on-surface font-body">
            
            {/* Bouton Fermer */}
            <button
              onClick={() => !chargement && setModalOuvert(false)}
              className="absolute top-4 right-4 text-on-surface-muted hover:text-on-surface text-base"
              disabled={chargement}
            >
              ✕
            </button>

            {/* Titre */}
            <h3 className="font-display font-bold text-lg text-error mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              ⚠️ Clôture de l'Année Académique
            </h3>

            {erreur && (
              <div className="alert alert-error text-xs p-2.5 rounded flex items-start gap-2 mb-4">
                <AlertIcon className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <div>{erreur}</div>
              </div>
            )}

            {chargement ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <span className="loading loading-spinner loading-lg text-error"></span>
                <span className="text-xs text-on-surface-muted">
                  {etape === 1 ? 'Analyse et calcul académique...' : 'Exécution du traitement de clôture batch...'}
                </span>
              </div>
            ) : etape === 1 ? (
              /* ÉTAPE 1 — Analyse & Alertes */
              <div className="flex flex-col gap-4">
                <div className="text-xs text-on-surface-muted leading-relaxed">
                  L'automate va analyser les résultats de tous les étudiants inscrits pour l'année <strong>{anneeCourante}</strong>.
                </div>

                {/* KPI Estimations */}
                <div className="grid grid-cols-3 gap-3 bg-surface-high/30 border border-white/5 p-3 rounded-lg text-center text-xs">
                  <div>
                    <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Admis</div>
                    <div className="text-base font-bold text-success mt-0.5">{estimations.admis}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Ajournés</div>
                    <div className="text-base font-bold text-error mt-0.5">{estimations.ajournes}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Diplômés</div>
                    <div className="text-base font-bold text-accent mt-0.5">{estimations.diplomes}</div>
                  </div>
                </div>

                {/* Liste d'alertes */}
                <div>
                  <div className="text-xs font-semibold text-on-surface-muted mb-2">
                    Alertes détectées ({alertes.length}) :
                  </div>
                  {alertes.length === 0 ? (
                    <div className="text-xs text-success bg-success/15 border border-success/20 p-2.5 rounded">
                      ✓ Aucun problème détecté. Toutes les matières possèdent des notes.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto border border-white/10 rounded p-2 bg-bg/50 flex flex-col gap-1.5 pr-2">
                      {alertes.map((alt, idx) => (
                        <div key={idx} className="text-[10px] text-warning flex items-start gap-1">
                          <span className="flex-shrink-0">⚠️</span>
                          <span>{alt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setModalOuvert(false)}
                    className="btn btn-sm bg-surface-high border border-white/10 hover:bg-surface-high/70 text-on-surface rounded cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setEtape(2)}
                    disabled={!peutCloturer}
                    className="btn btn-sm btn-error text-white font-bold border-none rounded cursor-pointer disabled:opacity-50"
                  >
                    Continuer quand même
                  </button>
                </div>
              </div>
            ) : etape === 2 ? (
              /* ÉTAPE 2 — Confirmation finale */
              <div className="flex flex-col gap-4">
                <div className="alert alert-error text-xs p-3 rounded flex items-start gap-2.5 border border-error/35 bg-error/5">
                  <AlertIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>ATTENTION DANGER :</strong> Cette action est <strong>IRRÉVERSIBLE</strong>.
                    L'année <strong>{anneeCourante}</strong> sera définitivement gelée, les notes archivées, et la promotion des admis sera effective.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-muted mb-2">
                    Pour valider, tapez l'année courante : <strong className="text-accent">{anneeCourante}</strong>
                  </label>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Tapez ${anneeCourante} ici`}
                    className="input input-sm input-bordered w-full bg-bg border-white/10 text-xs rounded focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setEtape(1)}
                    className="btn btn-sm bg-surface-high border border-white/10 hover:bg-surface-high/70 text-on-surface rounded cursor-pointer"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleCloturerDefinitif}
                    disabled={inputText !== anneeCourante}
                    className="btn btn-sm btn-error text-white font-bold border-none rounded cursor-pointer disabled:opacity-50"
                  >
                    Clôturer Définitivement
                  </button>
                </div>
              </div>
            ) : (
              /* ÉTAPE 3 — Succès */
              <div className="flex flex-col gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto text-2xl animate-bounce">
                  ✓
                </div>
                <h4 className="font-bold font-display text-base text-success mt-2">
                  Année {anneeCourante} Clôturée avec Succès !
                </h4>
                <p className="text-xs text-on-surface-muted max-w-sm mx-auto leading-relaxed">
                  Tous les étudiants admis ont progressé de niveau. Les étudiants en fin de cycle (L3, M2) ont reçu le statut "diplômé".
                </p>

                {/* Bilan Final */}
                {bilanFinal && (
                  <div className="grid grid-cols-3 gap-3 bg-surface-high/40 border border-white/5 p-4 rounded-lg text-center text-xs mt-2 max-w-md mx-auto w-full">
                    <div>
                      <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Promus</div>
                      <div className="text-base font-bold text-success mt-0.5">{bilanFinal.admis}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Redoublants</div>
                      <div className="text-base font-bold text-error mt-0.5">{bilanFinal.ajournes}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-muted font-semibold uppercase">Diplômés</div>
                      <div className="text-base font-bold text-accent mt-0.5">{bilanFinal.diplomes}</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setModalOuvert(false)}
                  className="btn btn-sm btn-accent text-bg font-bold border-none rounded mt-4 cursor-pointer max-w-xs mx-auto w-full"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AcademicYearClosure;
export { AcademicYearClosure };
