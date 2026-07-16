// src/types/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel d'exports du catalogue de types GU.
// Importer depuis '@/types' dans tout composant ou service TypeScript.
//
// Exemple :
//   import type { Student, Grade, AuditLog } from '@/types'
// ─────────────────────────────────────────────────────────────────────────────

export type {
  Role,
  TenantRole,
  UserStatus,
  User,
  UserProfile,
} from './user.types'

export type {
  UniversityPlan,
  UniversityStatus,
  Matiere,
  Filiere,
  UniversityConfig,
  SaasUniversite,
  Echeance,
  FraisConfig,
} from './university.types'

export type {
  NiveauEtude,
  StatutEtudiant,
  HistoriqueNiveau,
  Student,
  TeacherCours,
  Teacher,
  GradeType,
  Grade,
  Mention,
  AcademicYearResult,
  StatutEnrollment,
  Enrollment,
  AcademicYearStatus,
  AcademicYear,
  Course,
  Assignment,
} from './academic.types'

export type {
  ModePaiement,
  StatutFinancier,
  Payment,
  SituationFinanciere,
  RevenuMensuel,
  KPIsGlobaux,
} from './finance.types'

export type {
  AccessCodeStatus,
  AccessCode,
  RelationType,
  ParentStudentLink,
} from './access.types'

export type {
  NotificationType,
  Notification,
  NotificationsResult,
} from './notification.types'

export type {
  AuditAction,
  AuditLog,
  AuditLogInput,
  AuditLogGlobal,
} from './audit.types'
