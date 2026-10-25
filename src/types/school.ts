export type ProgrammeId = string;

export interface SchoolProgramme {
  id: ProgrammeId;
  name: string;
  description?: string | undefined;
}

export type UserRole =
  | "admin"
  | "class_teacher"
  | "subject_teacher"
  | "bursar"
  | "secretary"
  | "parent"
  | "muallim";

export type NavSectionId =
  | "overview"
  | "students"
  | "classes"
  | "academics"
  | "attendance"
  | "fees"
  | "notices"
  | "staff"
  | "audit"
  | "settings";

export interface ScoreComponentConfig {
  id: string;
  label: string;
  maxScore: number;
}

export interface GradeBand {
  grade: string;
  min: number;
  max: number;
  remark: string;
}

export interface GradingScheme {
  defaultComponents: ScoreComponentConfig[];
  programmeComponents: Record<ProgrammeId, ScoreComponentConfig[]>;
  classOverrides: Record<string, ScoreComponentConfig[]>;
  gradeBands: GradeBand[];
}

export interface SiblingDiscountPolicy {
  enabled: boolean;
  type: "percentage" | "fixed";
  value: number;
  minChildren: number;
}

export interface NDHEcosystemLink {
  id: string;
  label: string;
  url: string;
  tagline?: string | undefined;
  description?: string | undefined;
}

export interface SchoolLabelsConfig {
  classSingular: string;
  classPlural: string;
  teacherSingular: string;
  teacherPlural: string;
  termLabel: string;
}

export interface SchoolSettings {
  name: string;
  country: string;
  arabicName?: string | undefined;
  code: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  logoDataUrl?: string | undefined;
  currencySymbol: string;
  currencyCode: string;
  setupCompleted: boolean;
  multiProgrammeEnabled: boolean;
  programmes: SchoolProgramme[];
  enableQuranModule: boolean;
  smsCreditsBalance: number;
  bankAccountDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  labels: SchoolLabelsConfig;
  sessions: string[];
  currentSession: string;
  terms: string[];
  currentTerm: string;
  daysSchoolOpened: number;
  billingMode: "combined" | "separate";
  reportCardDefaultLayout: "merged" | "per_programme";
  grading: GradingScheme;
  siblingDiscount: SiblingDiscountPolicy;
  ndhFooterLinks: NDHEcosystemLink[];
  nextReceiptSequence: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  arabicName?: string | undefined;
  programmeId: ProgrammeId;
  levelOrder: number;
  nextGroupId?: string | null | undefined;
  formTeacherId?: string | undefined;
  room?: string | undefined;
}

export interface Subject {
  id: string;
  name: string;
  arabicName?: string | undefined;
  code: string;
  programmeId: ProgrammeId;
  isCore?: boolean | undefined;
}

export interface Student {
  id: string;
  admissionId: string;
  fullName: string;
  arabicName?: string | undefined;
  gender: "Male" | "Female";
  dateOfBirth: string;
  bloodGroup: "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-";
  healthNotes: string;
  photoUrl?: string | undefined;
  homeAddress: string;
  programmeClasses: Record<ProgrammeId, string>;
  status: "Active" | "Graduated" | "Withdrawn";
  admissionDate: string;
  guardianName: string;
  guardianRelationship: string;
  parentPhone: string;
  parentEmail: string;
  manualFeeWaiver?: number | undefined;
  manualWaiverReason?: string | undefined;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  programmeId: ProgrammeId;
  session: string;
  term: string;
  scores: Record<string, number>;
  updatedAt?: string | undefined;
  updatedBy?: string | undefined;
}

export interface TermResultControl {
  id: string;
  session: string;
  term: string;
  isPublished: boolean;
  publishedAt?: string | undefined;
  isLocked: boolean;
  lockedAt?: string | undefined;
  lockedBy?: string | undefined;
}

export interface PendingScoreEditRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  programmeId: ProgrammeId;
  subjectId: string;
  subjectName: string;
  session: string;
  term: string;
  componentId: string;
  componentLabel: string;
  oldValue: number | null;
  newValue: number;
  requestedBy: string;
  requestedByRole: UserRole;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string | undefined;
  reviewedAt?: string | undefined;
}

export type AuditActionCategory =
  | "score"
  | "attendance"
  | "fee_waiver"
  | "payment"
  | "settings"
  | "result_lock";

export type AuditCategory = AuditActionCategory;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  category: AuditActionCategory;
  action: string;
  targetLabel: string;
  oldValue: string;
  newValue: string;
}

export type MurajaahStatus =
  | "Fluent"
  | "Strong"
  | "Needs Work"
  | "Excellent"
  | "Good"
  | "Needs Revision"
  | "Pending";

export interface QuranSessionLog {
  id: string;
  date: string;
  surahNumber: number;
  ayahFrom: number;
  ayahTo: number;
  recitationScore: number;
  revisionStatus: MurajaahStatus;
  note: string;
  recordedBy: string;
}

export interface QuranProgressRecord {
  studentId: string;
  currentSurahNumber: number;
  ayahFrom: number;
  ayahTo: number;
  juzCompleted: number;
  hizbCompleted: number;
  revisionStatus: MurajaahStatus;
  recitationScore: number;
  teacherNotes: string;
  arabicTeacherNote?: string | undefined;
  updatedAt: string;
  recentLogs: QuranSessionLog[];
}

export interface AffectiveRatingRecord {
  id: string;
  studentId: string;
  session: string;
  term: string;
  punctuality: number;
  neatness: number;
  politeness: number;
  honesty: number;
  attentiveness?: number | undefined;
  leadership?: number | undefined;
  classTeacherRemark: string;
  secondProgrammeRemark?: string | undefined;
  headTeacherRemark: string;
}

export type AttendanceStatus = "Present" | "Late" | "Absent" | "Excused";

export interface AttendanceEntry {
  id: string;
  date: string;
  session: string;
  term: string;
  programmeId: ProgrammeId;
  classId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string | undefined;
}

export type FeeCategory =
  | "Tuition"
  | "Books"
  | "Books & Materials"
  | "Uniform"
  | "PTA"
  | "PTA / Development"
  | "Feeding"
  | "Bus"
  | "Transport / Bus"
  | "Boarding"
  | "Extra Lessons"
  | "Exam / Assessment"
  | "Other";

export interface FeeScheduleItem {
  id: string;
  label: string;
  category: FeeCategory;
  programmeId: ProgrammeId;
  applicableClassIds: string[];
  amount: number;
  mandatory: boolean;
}

export type PaymentMethod =
  | "Paystack"
  | "Flutterwave"
  | "Bank Transfer"
  | "POS"
  | "Cash";

export interface FeePayment {
  id: string;
  receiptNumber: string;
  studentId: string;
  session: string;
  term: string;
  invoiceProgrammeId: "combined" | ProgrammeId;
  amount: number;
  method: PaymentMethod;
  confirmationStatus: "Confirmed" | "Pending Confirmation";
  reference: string;
  date: string;
  recordedBy: string;
  confirmedBy?: string | undefined;
  note?: string | undefined;
}

export interface ParentNoticeLog {
  id: string;
  sentAt: string;
  channel: "SMS" | "WhatsApp";
  audienceLabel: string;
  recipientCount: number;
  subject: string;
  message: string;
  sentBy: string;
  status: "Sent" | "Recorded";
}

export type StaffJobTitle =
  | "Proprietor / Principal"
  | "Class Teacher"
  | "Subject Teacher"
  | "Bursar / Accountant"
  | "School Secretary"
  | "Programme Instructor"
  | "Mu'allim"
  | "Support Staff";

export interface StaffMember {
  id: string;
  staffCode: string;
  fullName: string;
  arabicName?: string | undefined;
  role: StaffJobTitle;
  systemRole: Exclude<UserRole, "parent">;
  loginPin?: string | undefined;
  phone: string;
  email: string;
  bankName: string;
  accountNumber: string;
  assignedClassIds: string[];
  assignedSubjectIds: string[];
  status: "Active" | "On Leave";
  joinedDate: string;
  salary: {
    baseSalary: number;
    teachingAllowance: number;
    overtime: number;
    transport: number;
    absenceFines: number;
    pension: number;
    salaryAdvanceRepayment: number;
  };
}

export interface PayrollRecord {
  id: string;
  monthKey: string;
  monthLabel: string;
  session: string;
  term: string;
  staffId: string;
  baseSalary: number;
  teachingAllowance: number;
  overtime: number;
  transport: number;
  absenceFines: number;
  pension: number;
  salaryAdvanceRepayment: number;
  grossAdditions: number;
  totalDeductions: number;
  netSalary: number;
  status: "Paid" | "Pending";
  paymentReference: string;
  paidDate?: string | undefined;
}

export interface SchoolDatabaseSnapshot {
  version: number;
  settings: SchoolSettings;
  classes: ClassGroup[];
  subjects: Subject[];
  students: Student[];
  scores: ScoreRecord[];
  termLocks: TermResultControl[];
  pendingScoreEdits: PendingScoreEditRequest[];
  auditLogs: AuditLogEntry[];
  quranRecords: QuranProgressRecord[];
  affective: AffectiveRatingRecord[];
  attendance: AttendanceEntry[];
  feeItems: FeeScheduleItem[];
  payments: FeePayment[];
  parentNotices: ParentNoticeLog[];
  staff: StaffMember[];
  payroll: PayrollRecord[];
}

export interface ActivePortalSession {
  isAuthenticated: boolean;
  role: UserRole;
  staffId?: string | undefined;
  parentPhone?: string | undefined;
  displayName: string;
  subtitle: string;
}
