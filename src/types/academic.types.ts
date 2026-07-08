// src/types/academic.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types centralisés : Entités académiques.
// Sources :
//   - /universities/$id/students/   → Student
//   - /universities/$id/teachers/   → Teacher, TeacherCours
//   - /universities/$id/grades/     → Grade
//   - /universities/$id/enrollments → Enrollment
//   - /universities/$id/academic_years → AcademicYear
// ─────────────────────────────────────────────────────────────────────────────

// ── Niveaux d'études ──────────────────────────────────────────────────────────

/**
 * Niveaux académiques valides.
 * Source : academicYearService.js (transitionsNiveau), studentService.js.
 */
export type NiveauEtude = 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'diplome'

// ── Statuts étudiant ──────────────────────────────────────────────────────────

/**
 * Statuts possibles d'un étudiant.
 * Source : studentService.js (changerStatutEtudiant), rgpdService.js.
 */
export type StatutEtudiant = 'actif' | 'suspendu' | 'diplome' | 'exclu'

// ── Historique de niveau (sous-objet de Student) ─────────────────────────────

/**
 * Entrée d'historique de progression de niveau.
 * Ajouté par academicYearService.js lors de la clôture d'année.
 */
export interface HistoriqueNiveau {
  /** Année académique (ex: '2024-2025') */
  annee: string

  /** Niveau à cette époque */
  niveau: NiveauEtude | string

  /** Moyenne générale annuelle */
  mga: number

  /** Décision prise en délibération */
  decision: 'admis' | 'ajourne'
}

// ── Étudiant ──────────────────────────────────────────────────────────────────

/**
 * Fiche académique d'un étudiant.
 * Stockée dans /universities/$universityId/students/$studentId.
 * Fidèle aux champs écrits par studentService.js et LoginPage.jsx.
 */
export interface Student {
  /** Identifiant unique (= matricule dans studentService, = uid dans LoginPage) */
  id: string

  /** Numéro de matricule généré automatiquement */
  matricule: string

  /** Nom de famille */
  nom: string

  /** Prénom */
  prenom: string

  /** Adresse e-mail */
  email: string

  /** Filière d'inscription (ex: 'Informatique') */
  filiere: string

  /** Niveau académique actuel */
  niveau: NiveauEtude | string

  /** Date de naissance (optionnel, format string) */
  dateNaissance?: string

  /** Numéro de téléphone (optionnel) */
  telephone?: string

  /** Statut académique actuel */
  statut: StatutEtudiant

  /** Timestamp d'inscription initiale */
  dateInscription: number

  /**
   * UID Firebase Auth si le compte a été activé.
   * Présent seulement si créé depuis LoginPage (self-service) ou
   * après activation via code d'accès.
   */
  uid?: string

  /**
   * Statut du compte Firebase Auth lié à cet étudiant. [NOUVEAU — M2]
   *
   * - 'pending' : profil pré-créé par admin_universite, en attente d'activation
   *               via code d'accès (aucun compte Firebase Auth existant encore).
   * - 'active'  : compte Firebase Auth activé et lié à ce profil.
   *
   * Distinct de `statut: StatutEtudiant` qui décrit le statut académique.
   */
  accountStatus?: 'pending' | 'active'

  /**
   * Champ hérité de LoginPage.jsx (self-service).
   * @deprecated Préférer accountStatus pour le statut Auth et statut pour l'état académique.
   */
  actif?: boolean

  /** Historique des passages de niveau (ajouté par clôture d'année) */
  historiqueNiveaux?: HistoriqueNiveau[]

  /** Ville de résidence (optionnel, vu dans rgpdService) */
  ville?: string

  /** Pays de résidence (optionnel, vu dans rgpdService) */
  pays?: string
}

// ── Cours enseignant (sous-objet de Teacher) ──────────────────────────────────

/**
 * Cours affecté à un enseignant.
 * Stocké dans /universities/$id/teachers/$id/cours/$courseId.
 */
export interface TeacherCours {
  /** Identifiant du cours */
  id: string

  /** Intitulé du cours */
  nom: string

  /** Volume horaire (heures) */
  heures: number
}

// ── Enseignant ────────────────────────────────────────────────────────────────

/**
 * Fiche d'un enseignant.
 * Stockée dans /universities/$universityId/teachers/$teacherId.
 * Fidèle aux champs écrits par teacherService.js.
 */
export interface Teacher {
  /** Clé unique générée par Firebase push() */
  id: string

  /** Nom de famille */
  nom: string

  /** Prénom */
  prenom: string

  /** Adresse e-mail */
  email: string

  /** Spécialité académique */
  specialite: string

  /** Département d'appartenance (optionnel) */
  departement?: string

  /** Numéro de téléphone (optionnel) */
  telephone?: string

  /** Dictionnaire des cours affectés : key = courseId */
  cours: Record<string, TeacherCours>

  /** Timestamp de recrutement */
  dateRecrutement: number

  /** UID Firebase Auth si le compte a été activé */
  uid?: string

  /**
   * Statut du compte Firebase Auth lié à cet enseignant. [NOUVEAU — M2]
   *
   * - 'pending' : profil pré-créé par admin_universite, en attente d'activation
   *               via code d'accès (aucun compte Firebase Auth existant encore).
   * - 'active'  : compte Firebase Auth activé et lié à ce profil.
   */
  accountStatus?: 'pending' | 'active'

  /** Indique si le compte est actif */
  actif?: boolean
}

// ── Notes ─────────────────────────────────────────────────────────────────────

/** Types de travaux évalués */
export type GradeType = 'devoir' | 'examen' | 'projet' | 'participation'

/**
 * Note saisie par un enseignant pour un étudiant.
 * Stockée dans /universities/$universityId/grades/$gradeId.
 * Fidèle aux champs écrits par gradeService.js.
 */
export interface Grade {
  /** Clé unique générée par Firebase push() */
  id: string

  /** Référence vers l'étudiant */
  studentId: string

  /** Identifiant du cours/matière */
  courseId: string

  /**
   * Alias de courseId — conservé pour rétrocompatibilité.
   * @deprecated Utiliser courseId.
   */
  matiereId: string

  /** UID de l'enseignant ayant saisi la note */
  enseignantId: string

  /** Valeur de la note (0–20) */
  note: number

  /** Coefficient de pondération */
  coefficient: number

  /** Année académique (ex: '2024-2025') */
  anneeAcademique: string

  /** Nature de l'évaluation */
  type: GradeType

  /** Commentaire optionnel de l'enseignant */
  commentaire?: string

  /** Timestamp de saisie */
  dateSaisie: number

  /** Semestre (optionnel — non systématiquement renseigné) */
  semestre?: string
}

// ── Résultat de calcul (non persisté directement, retourné par service) ───────

/** Mention académique attribuée selon la moyenne */
export type Mention =
  | 'Très Bien'
  | 'Bien'
  | 'Assez Bien'
  | 'Passable'
  | 'Ajourné'
  | 'Aucune note'

/** Résultat de fin d'année pour un étudiant */
export interface AcademicYearResult {
  studentId: string
  matricule: string
  nom: string
  prenom: string
  filiere: string
  niveau: string
  mga: number
  mention: Mention
  admis: boolean
}

// ── Inscription annuelle ──────────────────────────────────────────────────────

/** Statut d'une inscription annuelle */
export type StatutEnrollment = 'valide' | 'annule'

/**
 * Inscription d'un étudiant pour une année académique.
 * Stockée dans /universities/$id/enrollments/$studentId/$annee.
 * Fidèle aux champs écrits par academicYearService.js.
 */
export interface Enrollment {
  /** Année académique (ex: '2025-2026') */
  anneeAcademique: string

  /** Timestamp d'inscription */
  dateInscription: number

  /** Niveau au moment de l'inscription */
  niveau: NiveauEtude | string

  /** Statut de l'inscription */
  statut: StatutEnrollment
}

// ── Année académique ──────────────────────────────────────────────────────────

/** Statut d'une année académique */
export type AcademicYearStatus = 'en_cours' | 'cloturee'

/**
 * Entrée d'année académique.
 * Stockée dans /universities/$id/academic_years/$annee.
 */
export interface AcademicYear {
  /** Identifiant/label de l'année (ex: '2024-2025') */
  annee: string

  /** Statut de l'année */
  statut: AcademicYearStatus

  /** Timestamp de clôture (si cloturée) */
  dateCloture?: number

  /** Résultats finaux calculés lors de la clôture */
  resultats?: AcademicYearResult[]
}

// ── Cours (vue agrégée, utilisée côté UI) ────────────────────────────────────

/**
 * Représentation d'un cours côté affichage UI.
 * Agrégé depuis teachers.cours et grades.
 * [NOUVEAU] — non encore persisté en tant que nœud autonome dans Firebase.
 */
export interface Course {
  /** Identifiant du cours */
  id: string

  /** Intitulé */
  nom: string

  /** UID de l'enseignant responsable */
  enseignantId: string

  /** Nom affiché de l'enseignant */
  enseignantNom?: string

  /** Volume horaire */
  heures?: number

  /** Filière concernée */
  filiere?: string

  /** Niveau concerné */
  niveau?: NiveauEtude | string
}
