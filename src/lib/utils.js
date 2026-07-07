// src/lib/utils.js
// ──────────────────────────────────────────────────────────────
// Fonctions utilitaires communes au projet GU.
// ──────────────────────────────────────────────────────────────

/**
 * Génère un matricule unique.
 * Format : MAT-{année}-{5 chiffres aléatoires}
 *
 * @param {string} universityId — pour traçabilité (non inclus dans le matricule)
 * @returns {string}
 */
function generateMatricule(universityId) {
  if (!universityId) {
    throw new Error('universityId requis pour générer un matricule.');
  }

  const annee = new Date().getFullYear();
  const aleatoire = Math.floor(10000 + Math.random() * 90000); // 5 chiffres
  return `MAT-${annee}-${aleatoire}`;
}

/**
 * Formate un timestamp en date lisible : DD/MM/YYYY à HH:MM.
 *
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return '—';

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) return '—';

  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const annee = date.getFullYear();
  const heures = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
}

/**
 * Formate un montant en devise locale.
 * Supporte le passage direct d'une devise sous forme de chaîne ou d'un objet de configuration d'université.
 *
 * @param {number} nombre — le montant numérique
 * @param {string|{ devise?: string }} [deviseOuConfig] — la devise directement ou un objet de configuration
 * @returns {string} — ex: "150 000 FCFA" ou "1 290 €"
 */
function formatMontant(nombre, deviseOuConfig = 'FCFA') {
  if (nombre === null || nombre === undefined || isNaN(nombre)) return '—';

  let devise = 'FCFA';

  if (typeof deviseOuConfig === 'string') {
    devise = deviseOuConfig;
  } else if (deviseOuConfig && typeof deviseOuConfig === 'object') {
    devise = deviseOuConfig.devise || 'FCFA';
  }

  // Formatage avec séparateur de milliers (espace)
  const montantFormate = Math.round(nombre)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (devise === 'EUR' || devise === '€') {
    return `${montantFormate} €`;
  }

  if (devise === 'USD' || devise === '$') {
    return `$${montantFormate}`;
  }

  // Par défaut : FCFA (contexte ivoirien)
  return `${montantFormate} ${devise}`;
}

/**
 * Calcule une moyenne pondérée.
 *
 * @param {Array<number>} notes
 * @param {Array<number>} coefficients
 * @returns {number} — moyenne pondérée arrondie à 2 décimales
 */
function calculerMoyenne(notes, coefficients) {
  if (!notes || !coefficients || notes.length === 0) {
    return 0;
  }

  if (notes.length !== coefficients.length) {
    throw new Error(
      `Nombre de notes (${notes.length}) ≠ nombre de coefficients (${coefficients.length}).`
    );
  }

  let sommeNotesCoeff = 0;
  let sommeCoeff = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = Number(notes[i]);
    const coeff = Number(coefficients[i]);

    if (isNaN(note) || isNaN(coeff)) {
      throw new Error(`Valeur invalide à l'index ${i}: note=${notes[i]}, coefficient=${coefficients[i]}`);
    }

    sommeNotesCoeff += note * coeff;
    sommeCoeff += coeff;
  }

  if (sommeCoeff === 0) return 0;

  return Math.round((sommeNotesCoeff / sommeCoeff) * 100) / 100;
}

/**
 * Génère un numéro de reçu de paiement unique.
 * Format : REC-{année}-{5 chiffres aléatoires}
 *
 * @returns {string}
 */
function genererNumeroRecu() {
  const annee = new Date().getFullYear();
  const aleatoire = Math.floor(10000 + Math.random() * 90000); // 5 chiffres
  return `REC-${annee}-${aleatoire}`;
}

export {
  generateMatricule,
  formatDate,
  formatMontant,
  calculerMoyenne,
  genererNumeroRecu,
};
export default {
  generateMatricule,
  formatDate,
  formatMontant,
  calculerMoyenne,
  genererNumeroRecu,
};
