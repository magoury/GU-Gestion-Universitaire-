// src/services/academicYearService.ts
// ═══════════════════════════════════════════════════════════════════════════════
//
// Service de clôture d'année académique — Module Clôture du cahier des charges.
// Isolation multi-tenant stricte : universityId requis sur toutes les fonctions.
//
// ⚠️  OPÉRATION IRRÉVERSIBLE À GRANDE ÉCHELLE
// La clôture d'une année académique modifie définitivement les niveaux de TOUS
// les étudiants actifs du tenant. Firebase RTDB n'offrant pas de rollback
// atomique multi-chemins, toute erreur partielle doit être traitée manuellement
// via bilan.erreurs[]. Voir JSDoc de cloturerAnneeAcademique pour le protocole.
//
// GARDE OBLIGATOIRE : chaque fonction publique vérifie que l'acteur connecté
// a le rôle 'admin_universite' ET que son universityId correspond au tenant cible.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { ref, get, set, update } from 'firebase/database'
import { database, auth } from '@fb'
import { ecrireAuditLog } from './auditService.js'
import type {
  Student,
  Grade,
  AcademicYearResult,
  Enrollment,
  AcademicYear,
  HistoriqueNiveau,
  NiveauEtude,
  Mention,
} from '@/types'

// ── Types internes ─────────────────────────────────────────────────────────────

/**
 * Résultat de la vérification des prérequis de clôture.
 */
interface ResultatPrealables {
  /** Si false, la clôture est bloquée */
  peutCloturer: boolean
  /** Liste des alertes bloquantes ou informatives */
  alertes: string[]
}

/**
 * Bilan de la clôture d'année académique.
 */
interface BilanCloture {
  /** Nombre d'étudiants admis (MGA ≥ 10) */
  admis: number
  /** Nombre d'étudiants ajournés (MGA < 10) */
  ajournes: number
  /** Nombre d'étudiants diplômés (L3 ou M2 admis) */
  diplomes: number
  /**
   * Liste des erreurs partielles — CRITIQUE.
   *
   * Si erreurs.length > 0, certains étudiants n'ont PAS été traités.
   * L'appelant doit inspecter cette liste et traiter manuellement chaque
   * étudiant en échec. Aucun rollback automatique n'est disponible.
   * Chaque entrée contient : "Échec progression étudiant $id : $message"
   */
  erreurs: string[]
}

/**
 * Table de transition de niveau académique.
 * Seuls les niveaux listés sont valides — tout autre déclenche une erreur explicite.
 *
 * Parcours Licence : L1 → L2 → L3 → diplome
 * Parcours Master  : M1 → M2 → diplome
 *
 * Note : 'diplome' est un terminal — un étudiant à ce niveau est exclu
 * du traitement par le filtre statut === 'actif' (StatutEtudiant: 'diplome').
 */
const TRANSITIONS_NIVEAU: Readonly<Record<string, NiveauEtude>> = {
  L1: 'L2',
  L2: 'L3',
  L3: 'diplome',
  M1: 'M2',
  M2: 'diplome',
} as const

// ── Garde de rôle ──────────────────────────────────────────────────────────────

/**
 * Vérifie que l'utilisateur connecté est un admin_universite du tenant ciblé.
 *
 * Lit le profil depuis /users/$uid (non falsifiable côté client).
 * Vérifie à la fois le rôle ET que l'universityId du profil correspond
 * au tenant cible (isolation multi-tenant).
 *
 * @param universityId - Tenant cible à vérifier
 * @throws {Error} Si non authentifié, profil introuvable, rôle insuffisant
 *                 ou universityId ne correspond pas au tenant de l'acteur
 * @returns UID de l'admin vérifié
 */
async function verifierRoleAdminUniversite(universityId: string): Promise<string> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error(
      '[academicYearService] Accès refusé : aucun utilisateur connecté.'
    )
  }

  const uid = currentUser.uid
  const profilSnap = await get(ref(database, `users/${uid}`))

  if (!profilSnap.exists()) {
    throw new Error(
      `[academicYearService] Profil introuvable pour l'UID : ${uid}`
    )
  }

  const profil = profilSnap.val() as {
    role?: string
    universityId?: string | null
  }

  if (profil.role !== 'admin_universite') {
    throw new Error(
      `[academicYearService] Accès refusé : rôle '${profil.role ?? 'inconnu'}' insuffisant. ` +
        `Seul 'admin_universite' peut déclencher des opérations académiques.`
    )
  }

  if (profil.universityId !== universityId) {
    throw new Error(
      `[academicYearService] Violation multi-tenant : admin du tenant '${profil.universityId ?? 'aucun'}' ` +
        `ne peut pas agir sur le tenant '${universityId}'.`
    )
  }

  return uid
}

// ── incrementerAnnee ───────────────────────────────────────────────────────────

/**
 * Incrémente une année académique d'un an.
 *
 * @example incrementerAnnee("2024-2025") → "2025-2026"
 *
 * AVANT (JS) : function incrementerAnnee(annee) → implicite
 * APRÈS (TS) : paramètre et retour explicitement typés
 *
 * @param annee - Format "AAAA-AAAA" (ex: "2024-2025")
 * @returns Année suivante au même format, ou annee inchangée si format invalide
 */
export function incrementerAnnee(annee: string): string {
  const parties = annee.split('-')
  if (parties.length !== 2) return annee

  const anneeDebut = parseInt(parties[0], 10)
  const anneeFin = parseInt(parties[1], 10)

  if (isNaN(anneeDebut) || isNaN(anneeFin)) return annee

  return `${anneeDebut + 1}-${anneeFin + 1}`
}

// ── verifierPrealables ─────────────────────────────────────────────────────────

/**
 * Vérifie les prérequis avant de clôturer une année académique.
 *
 * 🔐 Garde : `admin_universite` du tenant requis.
 *
 * Vérifications effectuées (dans l'ordre) :
 *   1. Idempotence : si l'année est DÉJÀ 'cloturee' → throw immédiat
 *      (Correction Faille 2 : le JS original retournait peutCloturer: false
 *       sans throw — laissant l'appelant gérer silencieusement le cas)
 *   2. Alertes matières sans notes (non bloquantes — informatives)
 *
 * AVANT (JS) : retournait peutCloturer: false si déjà clôturée (sans throw)
 * APRÈS (TS) : throw immédiat si 'cloturee' + garde de rôle [Faille 1, Faille 2]
 *
 * @param universityId - Identifiant du tenant
 * @param annee        - Année académique (ex: "2024-2025")
 * @returns Résultat des prérequis (alertes informatives uniquement si non bloqué)
 * @throws {Error} Si rôle insuffisant, ou année déjà clôturée (idempotence)
 */
export async function verifierPrealables(
  universityId: string,
  annee: string
): Promise<ResultatPrealables> {
  if (!universityId || !annee) {
    throw new Error(
      '[academicYearService] universityId et annee requis pour la vérification.'
    )
  }

  // 🔐 Garde rôle — Faille 1 corrigée
  await verifierRoleAdminUniversite(universityId)

  const alertes: string[] = []

  // Vérification idempotence — Faille 2 corrigée
  // AVANT : retournait { peutCloturer: false, alertes } sans throw
  // APRÈS : throw immédiat — l'appelant ne peut pas ignorer l'état 'cloturee'
  const statutRef = ref(
    database,
    `universities/${universityId}/academic_years/${annee}/statut`
  )
  const statutSnap = await get(statutRef)

  if (statutSnap.exists() && statutSnap.val() === 'cloturee') {
    throw new Error(
      `[academicYearService] Clôture impossible : l'année académique '${annee}' est déjà clôturée. ` +
        `Cette opération est irréversible et ne peut être exécutée qu'une seule fois par année.`
    )
  }

  // Chargement matières configurées pour détection des matières sans notes
  const configSnap = await get(
    ref(database, `universities/${universityId}/config`)
  )
  const matieresConfig: string[] = []

  if (configSnap.exists()) {
    const config = configSnap.val() as {
      filieres?: Record<string, { matieres?: Record<string, unknown> }>
    }
    if (config.filieres) {
      Object.values(config.filieres).forEach((fil) => {
        if (fil.matieres) {
          Object.keys(fil.matieres).forEach((m) => {
            if (!matieresConfig.includes(m)) {
              matieresConfig.push(m)
            }
          })
        }
      })
    }
  }

  const toutesMatieres =
    matieresConfig.length > 0
      ? matieresConfig
      : [
          'Algorithmique',
          'Bases de données',
          'Architecture Web',
          'Java / OOP',
          'Mathématiques',
          'Réseaux',
          'Sécurité',
          'Anglais',
        ]

  // Détection matières sans notes pour l'année
  const gradesSnap = await get(
    ref(database, `universities/${universityId}/grades`)
  )
  const matieresAvecNotes = new Set<string>()

  if (gradesSnap.exists()) {
    const gradesVal = gradesSnap.val() as Record<
      string,
      { anneeAcademique?: string; courseId?: string; matiereId?: string }
    >
    Object.values(gradesVal).forEach((g) => {
      if (g.anneeAcademique === annee) {
        const mat = g.courseId ?? g.matiereId
        if (mat) matieresAvecNotes.add(mat)
      }
    })
  }

  toutesMatieres.forEach((mat) => {
    if (!matieresAvecNotes.has(mat)) {
      alertes.push(
        `Matière sans note : "${mat}" n'a aucune note saisie pour l'année ${annee}.`
      )
    }
  })

  return { peutCloturer: true, alertes }
}

// ── calculerResultatsFinaux ────────────────────────────────────────────────────

/**
 * Calcule les moyennes générales et décisions de fin d'année pour tous les
 * étudiants actifs du tenant.
 *
 * 🔐 Garde : `admin_universite` du tenant requis.
 *
 * ── Formule de calcul MGA ──────────────────────────────────────────────────
 *
 * Pour chaque matière (courseId/matiereId) :
 *   Moyenne matière = (devAvg × 1.0 + exAvg × 2.0 + projAvg × 1.5 + partAvg × 0.5)
 *                     / (somme des coefficients des types présents uniquement)
 *
 *   Types et coefficients :
 *     - devoir        : coeff 1.0
 *     - examen        : coeff 2.0 (poids fort — évaluation sommative principale)
 *     - projet        : coeff 1.5
 *     - participation : coeff 0.5
 *
 *   Si un type est absent pour une matière, son coefficient n'est pas compté.
 *   Ex: matière avec seulement un examen → Moyenne = note_examen (coeffsCum = 2.0)
 *
 * MGA = moyenne arithmétique simple de toutes les moyennes matières
 *   MGA = (Σ Moyenne_k) / nb_matières
 *
 * ── Seuils de mention ─────────────────────────────────────────────────────
 *   MGA ≥ 16.00 → Très Bien
 *   MGA ≥ 14.00 → Bien
 *   MGA ≥ 12.00 → Assez Bien
 *   MGA ≥ 10.00 → Passable     → admis: true
 *   MGA < 10.00 → Ajourné      → admis: false (redoublement)
 *   Aucune note → Aucune note  → admis: false, mga: 0
 *
 * ── Correction Faille 5 ───────────────────────────────────────────────────
 * AVANT (JS L115) : Object.values(studentsSnap.val()) → student.id = undefined
 *   Conséquence : g.studentId === student.id toujours false → MGA toujours 0
 *   → TOUS les étudiants marqués ajournés par erreur
 * APRÈS (TS) : Object.entries() + injection de clé Firebase → student.id correct
 *
 * @param universityId - Identifiant du tenant
 * @param annee        - Année académique (ex: "2024-2025")
 * @returns Tableau des résultats finaux par étudiant actif
 * @throws {Error} Si rôle insuffisant
 */
export async function calculerResultatsFinaux(
  universityId: string,
  annee: string
): Promise<AcademicYearResult[]> {
  if (!universityId || !annee) {
    throw new Error(
      '[academicYearService] universityId et annee requis.'
    )
  }

  // 🔐 Garde rôle — Faille 1 corrigée
  await verifierRoleAdminUniversite(universityId)

  // Lecture étudiants actifs
  // Faille 5 corrigée : Object.entries() + injection clé Firebase comme id
  const studentsSnap = await get(
    ref(database, `universities/${universityId}/students`)
  )
  if (!studentsSnap.exists()) return []

  const studentsRaw = studentsSnap.val() as Record<string, Omit<Student, 'id'>>
  const students: Student[] = Object.entries(studentsRaw)
    .map(([id, s]) => ({ ...s, id } as Student))
    .filter((s) => s.statut === 'actif')

  // Lecture toutes les notes
  const gradesSnap = await get(
    ref(database, `universities/${universityId}/grades`)
  )
  const gradesRaw = gradesSnap.exists()
    ? (gradesSnap.val() as Record<string, Omit<Grade, 'id'>>)
    : {}
  const allGrades: Grade[] = Object.entries(gradesRaw).map(
    ([id, g]) => ({ ...g, id } as Grade)
  )

  const resultats: AcademicYearResult[] = []

  for (const student of students) {
    // Notes de cet étudiant pour cette année
    const myGrades = allGrades.filter(
      (g) => g.studentId === student.id && g.anneeAcademique === annee
    )

    if (myGrades.length === 0) {
      resultats.push({
        studentId: student.id,
        matricule: student.matricule,
        nom: student.nom,
        prenom: student.prenom,
        filiere: student.filiere,
        niveau: student.niveau,
        mga: 0,
        mention: 'Aucune note' as Mention,
        admis: false,
      })
      continue
    }

    // Regroupement par cours pour moyenne pondérée
    const courses: Record<
      string,
      { devoir: number[]; examen: number[]; projet: number[]; participation: number[] }
    > = {}

    myGrades.forEach((g) => {
      const mat = g.courseId ?? g.matiereId
      if (!courses[mat]) {
        courses[mat] = { devoir: [], examen: [], projet: [], participation: [] }
      }
      if (g.type in courses[mat]) {
        courses[mat][g.type].push(g.note)
      }
    })

    const moyennesCours = Object.values(courses).map((c) => {
      const avg = (notes: number[]): number | null =>
        notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null

      const devAvg = avg(c.devoir)
      const exAvg = avg(c.examen)
      const projAvg = avg(c.projet)
      const partAvg = avg(c.participation)

      let notesCum = 0
      let coeffsCum = 0

      if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0 }
      if (exAvg !== null)  { notesCum += exAvg * 2.0;  coeffsCum += 2.0 }
      if (projAvg !== null){ notesCum += projAvg * 1.5; coeffsCum += 1.5 }
      if (partAvg !== null){ notesCum += partAvg * 0.5; coeffsCum += 0.5 }

      return coeffsCum > 0 ? notesCum / coeffsCum : 0
    })

    const somme = moyennesCours.reduce((acc, v) => acc + v, 0)
    const mgaRaw = moyennesCours.length > 0 ? somme / moyennesCours.length : 0
    const mga = Number(mgaRaw.toFixed(2))

    let mention: Mention = 'Ajourné'
    let admis = false

    if (mgaRaw >= 10) {
      admis = true
      if (mgaRaw >= 16)      mention = 'Très Bien'
      else if (mgaRaw >= 14) mention = 'Bien'
      else if (mgaRaw >= 12) mention = 'Assez Bien'
      else                   mention = 'Passable'
    }

    resultats.push({
      studentId: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      filiere: student.filiere,
      niveau: student.niveau,
      mga,
      mention,
      admis,
    })
  }

  return resultats
}

// ── cloturerAnneeAcademique ────────────────────────────────────────────────────

/**
 * Processus de clôture annuelle académique — opération irréversible.
 *
 * 🔐 Garde : `admin_universite` du tenant requis.
 *
 * ── Étapes d'exécution ────────────────────────────────────────────────────
 *
 * 1. Vérification préalable (verifierPrealables) :
 *    - Idempotence : throw si année déjà 'cloturee'
 *    - Alertes matières sans notes (informatives, non bloquantes)
 *
 * 2. Calcul résultats finaux (calculerResultatsFinaux) :
 *    - MGA par étudiant selon formule pondérée
 *    - Décision admis/ajourné par seuil MGA ≥ 10
 *    - Sauvegarde dans /academic_years/$annee/resultats
 *
 * 3. Gel de l'année :
 *    - /academic_years/$annee → statut: 'cloturee', dateCloture: now
 *    - /academic_years/$annee/grades_archive → copie intégrale des notes
 *
 * 4. Progression par étudiant (boucle séquentielle) :
 *    - Admis (MGA ≥ 10) :
 *        → niveau suivant selon TRANSITIONS_NIVEAU (L1→L2, L2→L3, L3→diplome, M1→M2, M2→diplome)
 *        → si diplome : statut: 'diplome' + historiqueNiveaux mis à jour
 *        → sinon : niveau mis à jour + réinscription auto à la nouvelle année
 *    - Ajourné (MGA < 10) :
 *        → reste au même niveau (redoublement)
 *        → historiqueNiveaux mis à jour avec decision: 'ajourne'
 *        → réinscription auto au même niveau pour la nouvelle année
 *
 * ── Table de transition de niveau ─────────────────────────────────────────
 *   L1 → L2 → L3 → diplome (StatutEtudiant: 'diplome')
 *   M1 → M2 → diplome
 *
 * ── Correction Faille 4 ───────────────────────────────────────────────────
 * AVANT (JS) : transitionsNiveau[ancienNiveau] pouvait être undefined si le niveau
 *   de l'étudiant n'est pas dans la table (ex: données corrompues) → écriture
 *   silencieuse de { niveau: undefined } dans Firebase (ignorée sans erreur)
 * APRÈS (TS) : throw explicite nommant l'étudiant et son niveau problématique
 *
 * ── Comportement en cas d'erreur partielle ────────────────────────────────
 * Firebase RTDB ne supporte pas les transactions multi-chemins atomiques.
 * Si la progression d'un étudiant échoue (ex: perte réseau, règle Firebase),
 * les étudiants déjà traités AVANT lui ne sont pas annulés.
 *
 * Protocole obligatoire pour l'appelant :
 *   const bilan = await cloturerAnneeAcademique(universityId, annee)
 *   if (bilan.erreurs.length > 0) {
 *     // OBLIGATOIRE : inspecter et traiter manuellement chaque échec
 *     bilan.erreurs.forEach(e => console.error(e))
 *   }
 *
 * Chaque entrée de bilan.erreurs identifie l'étudiant ($studentId) et la cause.
 *
 * AVANT (JS) : même comportement — mais non documenté et sans enrichissement
 *              du log d'audit avec le nombre d'erreurs
 * APRÈS (TS) : comportement identique + log d'audit enrichi avec erreurs.length
 *
 * @param universityId - Identifiant du tenant
 * @param annee        - Année académique à clôturer (ex: "2024-2025")
 * @returns Bilan de la clôture (admis, ajournes, diplomes, erreurs)
 * @throws {Error} Si rôle insuffisant, params manquants, ou année déjà clôturée
 */
export async function cloturerAnneeAcademique(
  universityId: string,
  annee: string
): Promise<BilanCloture> {
  if (!universityId || !annee) {
    throw new Error(
      '[academicYearService] universityId et annee requis pour la clôture.'
    )
  }

  // ÉTAPE 1 — Vérification préalable (inclut garde rôle + idempotence)
  // verifierPrealables throw si déjà 'cloturee' — Faille 2 corrigée
  const prealables = await verifierPrealables(universityId, annee)

  // Alertes non bloquantes : informer mais continuer
  if (prealables.alertes.length > 0) {
    console.warn(
      `[academicYearService] Alertes préalables (${prealables.alertes.length}) :`,
      prealables.alertes
    )
  }

  // ÉTAPE 2 — Calcul résultats finaux
  // Note : verifierRoleAdminUniversite est appelé une deuxième fois dans
  // calculerResultatsFinaux — redondant mais défense en profondeur intentionnelle
  const resultats = await calculerResultatsFinaux(universityId, annee)

  // Sauvegarde des résultats calculés
  const anneeRef = ref(
    database,
    `universities/${universityId}/academic_years/${annee}`
  )
  await set(
    ref(database, `universities/${universityId}/academic_years/${annee}/resultats`),
    resultats
  )

  // ÉTAPE 3 — Gel de l'année académique
  await update(anneeRef, {
    statut: 'cloturee' as AcademicYear['statut'],
    dateCloture: Date.now(),
  })

  // Archive des notes de l'année (lecture seule via Firebase rules)
  const gradesSnap = await get(
    ref(database, `universities/${universityId}/grades`)
  )
  if (gradesSnap.exists()) {
    await set(
      ref(
        database,
        `universities/${universityId}/academic_years/${annee}/grades_archive`
      ),
      gradesSnap.val()
    )
  }

  // ÉTAPE 4 — Progression par étudiant
  let admisCount = 0
  let ajournesCount = 0
  let diplomesCount = 0
  const erreurs: string[] = []
  const nouvelleAnnee = incrementerAnnee(annee)

  for (const res of resultats) {
    try {
      const studentRef = ref(
        database,
        `universities/${universityId}/students/${res.studentId}`
      )
      const studentSnap = await get(studentRef)

      if (!studentSnap.exists()) {
        erreurs.push(
          `Étudiant ${res.studentId} introuvable en base — ignoré.`
        )
        continue
      }

      const studentData = studentSnap.val() as Student

      if (res.admis) {
        admisCount++
        const ancienNiveau = studentData.niveau

        // Faille 4 corrigée : guard explicite si niveau hors table de transitions
        // AVANT (JS) : nouveauNiveau pouvait être undefined → Firebase ignorait silencieusement
        // APRÈS (TS) : throw explicite avec identification de l'étudiant et niveau problématique
        const nouveauNiveau = TRANSITIONS_NIVEAU[ancienNiveau]
        if (nouveauNiveau === undefined) {
          throw new Error(
            `[academicYearService] Niveau '${ancienNiveau}' de l'étudiant ${res.prenom} ${res.nom} ` +
              `(ID: ${res.studentId}) absent de la table de transitions. ` +
              `Valeurs attendues : ${Object.keys(TRANSITIONS_NIVEAU).join(', ')}. ` +
              `Vérifier l'intégrité des données de cet étudiant avant de relancer la clôture.`
          )
        }

        const entreeHistorique: HistoriqueNiveau = {
          annee,
          niveau: ancienNiveau,
          mga: res.mga,
          decision: 'admis',
        }
        const historique: HistoriqueNiveau[] = [
          ...(studentData.historiqueNiveaux ?? []),
          entreeHistorique,
        ]

        if (nouveauNiveau === 'diplome') {
          // Diplôme (L3 ou M2 admis)
          diplomesCount++
          await update(studentRef, {
            niveau: 'diplome' as NiveauEtude,
            statut: 'diplome',
            historiqueNiveaux: historique,
          })

          await ecrireAuditLog(universityId, {
            acteurId: 'system',
            acteurNom: 'Automate Académique',
            acteurRole: 'system',
            action: 'ETUDIANT_STATUT_CHANGE',
            cible: res.studentId,
            detail:
              `Étudiant ${res.prenom} ${res.nom} diplômé (${ancienNiveau}) ` +
              `avec MGA de ${res.mga}/20. Mention : ${res.mention}.`,
          })
        } else {
          // Progression de niveau (L1→L2, L2→L3, M1→M2)
          await update(studentRef, {
            niveau: nouveauNiveau,
            historiqueNiveaux: historique,
          })

          await ecrireAuditLog(universityId, {
            acteurId: 'system',
            acteurNom: 'Automate Académique',
            acteurRole: 'system',
            action: 'ETUDIANT_MODIFIE',
            cible: res.studentId,
            detail:
              `Étudiant ${res.prenom} ${res.nom} promu ${ancienNiveau} → ${nouveauNiveau} ` +
              `(MGA: ${res.mga}/20, mention: ${res.mention}).`,
          })

          // Réinscription automatique au niveau supérieur pour la nouvelle année
          const enrollRef = ref(
            database,
            `universities/${universityId}/enrollments/${res.studentId}/${nouvelleAnnee}`
          )
          const enrollData: Enrollment = {
            anneeAcademique: nouvelleAnnee,
            dateInscription: Date.now(),
            niveau: nouveauNiveau,
            statut: 'valide',
          }
          await set(enrollRef, enrollData)
        }
      } else {
        // Ajourné — redoublement au même niveau
        ajournesCount++
        const ancienNiveau = studentData.niveau

        const entreeHistorique: HistoriqueNiveau = {
          annee,
          niveau: ancienNiveau,
          mga: res.mga,
          decision: 'ajourne',
        }
        const historique: HistoriqueNiveau[] = [
          ...(studentData.historiqueNiveaux ?? []),
          entreeHistorique,
        ]

        await update(studentRef, { historiqueNiveaux: historique })

        await ecrireAuditLog(universityId, {
          acteurId: 'system',
          acteurNom: 'Automate Académique',
          acteurRole: 'system',
          action: 'ETUDIANT_MODIFIE',
          cible: res.studentId,
          detail:
            `Étudiant ${res.prenom} ${res.nom} ajourné — redouble ${ancienNiveau} ` +
            `(MGA: ${res.mga}/20, mention: ${res.mention}).`,
        })

        // Réinscription automatique au même niveau
        const enrollRef = ref(
          database,
          `universities/${universityId}/enrollments/${res.studentId}/${nouvelleAnnee}`
        )
        const enrollData: Enrollment = {
          anneeAcademique: nouvelleAnnee,
          dateInscription: Date.now(),
          niveau: ancienNiveau,
          statut: 'valide',
        }
        await set(enrollRef, enrollData)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[academicYearService] Erreur sur l'étudiant ${res.studentId}:`, err)
      erreurs.push(`Échec progression étudiant ${res.studentId} : ${message}`)
    }
  }

  // ÉTAPE 5 — Rapport d'audit global avec bilan complet
  // AVANT (JS) : detail sans compte d'erreurs
  // APRÈS (TS) : erreurs.length inclus pour traçabilité RGPD complète
  const detailBilan =
    `Clôture de l'année ${annee} effectuée. ` +
    `Bilan : ${admisCount} admis, ${ajournesCount} ajournés, ${diplomesCount} diplômés` +
    (erreurs.length > 0
      ? `, ${erreurs.length} ERREUR(S) — vérifier bilan.erreurs[] pour reprise manuelle.`
      : '.')

  await ecrireAuditLog(universityId, {
    acteurId: 'system',
    acteurNom: 'Automate Académique',
    acteurRole: 'system',
    action: 'ANNEE_CLOTUREE',
    cible: annee,
    detail: detailBilan,
  })

  return {
    admis: admisCount,
    ajournes: ajournesCount,
    diplomes: diplomesCount,
    erreurs,
  }
}
