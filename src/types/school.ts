export type ProgrammeId = string;

export interface SchoolProgramme {
  id: ProgrammeId;
  name: string;
  description?: string | undefined;
}

export type UserRole =
  | "admin"
  | "exam_officer"
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
  | "exams"
  | "attendance"
  | "fees"
  | "notices"
  | "staff"
  | "audit"
  | "customize"
  | "backups"
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

export type WorkspaceThemePresetId =
  | "ndh_navy"
  | "royal_emerald"
  | "sovereign_burgundy"
  | "imperial_indigo"
  | "forest_gold"
  | "slate_executive"
  | "custom";

export type WorkspaceFontId =
  | "modern_sans"
  | "geometric"
  | "classic_serif"
  | "system_clean";

export type CrestShapeId = "rounded" | "circle" | "shield";

export interface WorkspaceThemeConfig {
  presetId: WorkspaceThemePresetId;
  primaryColor: string;
  accentColor: string;
  highlightColor: string;
  workspaceFont: WorkspaceFontId;
  crestShape: CrestShapeId;
  tableDensity: "comfortable" | "compact";
  lowDataMode: boolean;
}

export type ReportTemplateId =
  | "classic_grid"
  | "executive_banner"
  | "compact_single_page"
  | "royal_certificate";

export type ReportRankingMode =
  | "positions_and_grade"
  | "class_position_only"
  | "grade_only";

export type ReportFontFamily = "sans" | "serif" | "mono_tabular";
export type ReportFontScale = "compact" | "standard" | "large";
export type ReportPaperTint = "white" | "warm_ivory" | "cool_ice";

export interface AffectiveSkillLabels {
  punctuality: string;
  neatness: string;
  politeness: string;
  honesty: string;
}

export interface ReportSheetDesignConfig {
  template: ReportTemplateId;
  syncWithWorkspaceTheme: boolean;
  primaryColor: string;
  accentColor: string;
  paperTint: ReportPaperTint;
  fontFamily: ReportFontFamily;
  fontScale: ReportFontScale;
  tableStriped: boolean;
  showWatermark: boolean;
  borderStyle: "solid" | "double" | "minimal";
  customReportTitle: string;
  rankingMode: ReportRankingMode;
  broadsheetShowPositions: boolean;
  consolidateCA: boolean;
  showSubjectRemarks: boolean;
  showClassAverage: boolean;
  showOverallGradeBadge: boolean;
  showStudentPhotoBox: boolean;
  showAttendanceSummary: boolean;
  showAffectiveSkills: boolean;
  affectiveSkillLabels: AffectiveSkillLabels;
  showGradingKey: boolean;
  showNextTermDate: boolean;
  nextTermBegins: string;
  showNextTermFeeNote: boolean;
  nextTermFeeNote: string;
  principalTitleLabel: string;
  principalSignatureName: string;
  principalSignatureDataUrl?: string | undefined;
  footerNote: string;
}

export type GradeLetterKey = "A" | "B" | "C" | "D" | "E" | "F";

export interface GradeAutoCommentRule {
  grade: GradeLetterKey;
  teacherComment: string;
  principalComment: string;
}

export interface AutoCommentConfig {
  enabled: boolean;
  mode: "fallback_when_empty" | "override_all";
  rules: Record<GradeLetterKey, GradeAutoCommentRule>;
}

export interface DocumentCustomizationConfig {
  receiptHeaderTitle: string;
  receiptFooterNote: string;
  showBankDetailsOnReceipt: boolean;
  cashierTitleLabel: string;
  admissionNumberPrefix: string;
}

export interface SchoolCustomizationConfig {
  workspaceTheme: WorkspaceThemeConfig;
  reportSheet: ReportSheetDesignConfig;
  autoComments: AutoCommentConfig;
  documents: DocumentCustomizationConfig;
  lastExternalBackupAt?: string | undefined;
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
  customization?: SchoolCustomizationConfig | undefined;
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

export interface StudentClassTransferEntry {
  id: string;
  date: string;
  session: string;
  term: string;
  programmeId: ProgrammeId;
  fromClassId: string;
  fromClassName: string;
  toClassId: string;
  toClassName: string;
  reason: string;
  transferredBy: string;
  carriedCurrentTermScores: boolean;
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
  transferHistory?: StudentClassTransferEntry[] | undefined;
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
  | "result_lock"
  | "student_transfer"
  | "exam_paper";

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
  | "Exam Officer"
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
  /**
   * Optional additional duty toggle allowing a Class Teacher, Subject Teacher,
   * or Vice Principal to also act as the school's Exam Officer (reviewing/printing
   * exam question papers and all classes' broadsheets & report sheets).
   */
  isExamOfficer?: boolean | undefined;
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

/**
 * Combined / Cross-Class Teaching Group (for Integrated Schools, Multi-Stream Halqahs,
 * Electives, or Practicals where a Subject Teacher gathers students from different
 * classes/groups into one combined session and records scores once).
 */
export interface SubjectTeachingGroup {
  id: string;
  name: string;
  programmeId: ProgrammeId;
  subjectId: string;
  teacherStaffId?: string | undefined;
  classIds: string[];
  studentIds: string[];
}

export type ExamPaperStatus = "draft" | "submitted" | "returned" | "approved";

export interface ExamObjectiveQuestion {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  marks: number;
}

export interface ExamTheoryQuestion {
  id: string;
  questionText: string;
  markingGuide: string;
  marks: number;
}

export interface ExamPaperSubmission {
  id: string;
  programmeId: ProgrammeId;
  classIds: string[];
  subjectId: string;
  session: string;
  term: string;
  assessmentTitle: string;
  durationLabel: string;
  generalInstructions: string;
  sectionAInstruction: string;
  sectionBInstruction: string;
  paperLayout: "standard" | "compact_two_column";
  objectives: ExamObjectiveQuestion[];
  theory: ExamTheoryQuestion[];
  generalMarkingNotes: string;
  sourcePhotoDataUrl?: string | undefined;
  rawDraftText?: string | undefined;
  status: ExamPaperStatus;
  submittedByStaffId?: string | undefined;
  submittedByName: string;
  submittedAt?: string | undefined;
  reviewedByName?: string | undefined;
  reviewedAt?: string | undefined;
  reviewerFeedback?: string | undefined;
  updatedAt: string;
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
  teachingGroups?: SubjectTeachingGroup[] | undefined;
  examPapers?: ExamPaperSubmission[] | undefined;
}

export interface ActivePortalSession {
  isAuthenticated: boolean;
  role: UserRole;
  isExamOfficer?: boolean | undefined;
  schoolCode?: string | undefined;
  staffId?: string | undefined;
  parentPhone?: string | undefined;
  displayName: string;
  subtitle: string;
}
