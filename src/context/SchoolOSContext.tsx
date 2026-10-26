import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  DEFAULT_NIGERIAN_CLASS_NAMES,
  createSeedDatabase,
} from "@/data/seedMarkazAcademy";
import {
  canManageClassesAndSubjects,
  canManageFeeWaivers,
  canManageFees,
  canManagePayroll,
  canManageResultLocks,
  canManageSettings,
  canManageStudents,
  canMarkAttendanceForClass,
  canPrintDocument,
  canSendParentNotices,
  evaluateScoreWritePermission,
  getAllowedNavSections,
  getAuthorizedSnapshot,
  hasExamOfficerPrivileges,
} from "@/services/accessControl";
import {
  type BackupEnvelope,
  type LocalSnapshotRecord,
  createLocalSnapshot,
  downloadFullSchoolBackup,
} from "@/services/backupExportService";
import {
  computeClassBroadsheet,
  computeStaffCompensation,
  formatCurrency,
  generateReceiptNumber,
  getGradingComponents,
  normalizePhoneKey,
} from "@/services/calculations";
import {
  formatAutoCommentTemplate,
  getResolvedCustomization,
  normalizeGradeKey,
} from "@/services/customizationDefaults";
import {
  type RegisteredSchoolTenant,
  normalizeSchoolCodeKey,
  schoolRepository,
} from "@/services/schoolRepository";
import type {
  ActivePortalSession,
  AffectiveRatingRecord,
  AttendanceStatus,
  AuditCategory,
  AuditLogEntry,
  ClassGroup,
  ExamPaperSubmission,
  FeePayment,
  FeeScheduleItem,
  NavSectionId,
  ParentNoticeLog,
  PaymentMethod,
  PayrollRecord,
  ProgrammeId,
  QuranProgressRecord,
  SchoolDatabaseSnapshot,
  SchoolProgramme,
  SchoolSettings,
  StaffMember,
  Student,
  StudentClassTransferEntry,
  Subject,
  SubjectTeachingGroup,
  UserRole,
} from "@/types/school";

export type PrintJob =
  | {
      type: "report_card";
      studentId: string;
      session: string;
      term: string;
      layout: "merged" | "per_programme";
      programmeId?: ProgrammeId | undefined;
    }
  | {
      type: "receipt";
      paymentId: string;
    }
  | {
      type: "broadsheet";
      classId: string;
      programmeId: ProgrammeId;
      session: string;
      term: string;
    }
  | {
      type: "payslip";
      payrollId: string;
    }
  | {
      type: "exam_paper";
      examPaperId: string;
      layout?: "standard" | "compact_two_column" | undefined;
    }
  | {
      type: "marking_scheme";
      examPaperId: string;
    }
  | {
      type: "table";
      title: string;
      subtitle?: string;
      headers: string[];
      rows: Array<Array<string | number>>;
    };

export interface PromotionDecision {
  studentId: string;
  promoteByProgramme: Record<ProgrammeId, boolean>;
}

export interface OnboardingPayload {
  schoolName: string;
  country: string;
  currencySymbol: string;
  currencyCode: string;
  schoolPhone?: string | undefined;
  schoolAddress?: string | undefined;
  logoDataUrl?: string | undefined;
  multiProgrammeEnabled: boolean;
  additionalProgrammeNames?: string[] | undefined;
  currentSession: string;
  currentTerm?: string | undefined;
  classNames: string[];
  adminName?: string | undefined;
  adminContact?: string | undefined;
  adminPin?: string | undefined;
}

interface SchoolOSContextValue {
  /**
   * Role-scoped database snapshot enforced at the data layer.
   * Restricted users only ever receive their authorized classes, subjects, students, and records.
   */
  db: SchoolDatabaseSnapshot;
  hydrated: boolean;
  portal: ActivePortalSession;
  onboardingWizardOpen: boolean;
  setOnboardingWizardOpen: (open: boolean) => void;
  completeSchoolOnboarding: (payload: OnboardingPayload) => void;
  activeNav: NavSectionId;
  setActiveNav: (nav: NavSectionId) => void;

  // Live Staff & Parent Authentication (Scoped strictly to School Code)
  registeredSchools: RegisteredSchoolTenant[];
  loginProductionStaff: (params: {
    identifier: string;
    pin: string;
    schoolCode?: string | undefined;
  }) => { ok: boolean; error?: string };
  loginProductionParent: (params: {
    phone: string;
    schoolCode?: string | undefined;
  }) => { ok: boolean; error?: string };
  logoutSession: () => void;

  // In-Portal Role-Locked Video Guide (shows ONLY current portal's role video)
  portalVideoGuideOpen: boolean;
  setPortalVideoGuideOpen: (open: boolean) => void;

  setupWizardOpen: boolean;
  setSetupWizardOpen: (open: boolean) => void;

  // Print portal
  printJob: PrintJob | null;
  openPrintPreview: (job: PrintJob, autoTriggerPrint?: boolean) => void;
  closePrintPreview: () => void;

  // Settings & Setup (Admin only)
  updateSettings: (
    updater: (prev: SchoolSettings) => SchoolSettings,
    auditDescription?: string
  ) => void;

  // Classes, Subjects & Combined Cross-Class Teaching Groups
  upsertClassGroup: (group: ClassGroup) => void;
  deleteClassGroup: (id: string) => void;
  upsertSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  upsertTeachingGroup: (group: SubjectTeachingGroup) => void;
  deleteTeachingGroup: (id: string) => void;

  // Exam Questions & Exam Officer Moderation
  upsertExamPaper: (
    paper: ExamPaperSubmission
  ) => { ok: boolean; error?: string };
  submitExamPaperToOfficer: (
    paperId: string
  ) => { ok: boolean; error?: string };
  reviewExamPaper: (params: {
    paperId: string;
    decision: "approved" | "returned" | "draft";
    feedback?: string | undefined;
  }) => { ok: boolean; error?: string };
  deleteExamPaper: (paperId: string) => void;

  // Students, Mid-Session Class Transfer & End-of-Session Promotion
  upsertStudent: (student: Student) => void;
  transferStudentClass: (params: {
    studentId: string;
    programmeId: ProgrammeId;
    toClassId: string;
    reason: string;
    carryCurrentTermScores?: boolean | undefined;
  }) => { ok: boolean; error?: string; migratedScoresCount?: number };
  deleteStudent: (id: string) => void;
  runEndOfSessionPromotion: (
    decisions: PromotionDecision[],
    advanceToNewSession?: string
  ) => { promotedCount: number; graduatedCount: number; heldBackCount: number };

  // Academics, Result Locks, Published Approvals & Optional Qur'an Module
  updateScoreCell: (params: {
    studentId: string;
    subjectId: string;
    classId: string;
    programmeId: ProgrammeId;
    session: string;
    term: string;
    componentId: string;
    value: number;
  }) => { outcome: "saved" | "queued_for_approval" | "denied"; message?: string };
  setTermResultStatus: (params: {
    session: string;
    term: string;
    isPublished?: boolean;
    isLocked?: boolean;
  }) => void;
  reviewPendingScoreEdit: (
    requestId: string,
    decision: "approved" | "rejected"
  ) => void;
  upsertQuranRecord: (
    record: Omit<QuranProgressRecord, "updatedAt" | "recentLogs"> & {
      appendLog?: boolean;
      recordedBy?: string;
    }
  ) => void;
  upsertAffectiveRating: (record: AffectiveRatingRecord) => void;
  applyGradeAutoCommentsToClass: (params: {
    classId: string;
    programmeId: ProgrammeId;
    session: string;
    term: string;
  }) => number;

  // Backups & Offline Vault (Admin Only for Full Backup / Restore / Snapshots)
  downloadCompleteBackup: () => BackupEnvelope | null;
  createManualSnapshot: (label: string) => Promise<LocalSnapshotRecord | null>;
  restoreFromBackupSnapshot: (
    snapshot: SchoolDatabaseSnapshot,
    sourceLabel: string
  ) => Promise<{ ok: boolean; error?: string }>;

  // Attendance
  setAttendanceStatus: (params: {
    date: string;
    session: string;
    term: string;
    programmeId: ProgrammeId;
    classId: string;
    studentId: string;
    status: AttendanceStatus;
    note?: string;
  }) => void;
  markClassAllPresent: (params: {
    date: string;
    session: string;
    term: string;
    programmeId: ProgrammeId;
    classId: string;
    studentIds: string[];
  }) => void;

  // Fees, Paystack/Flutterwave & Manual Bank Transfer Confirmation
  upsertFeeItem: (item: FeeScheduleItem) => void;
  deleteFeeItem: (id: string) => void;
  recordFeePayment: (params: {
    studentId: string;
    session: string;
    term: string;
    invoiceProgrammeId: "combined" | ProgrammeId;
    amount: number;
    method: PaymentMethod;
    confirmationStatus?: "Confirmed" | "Pending Confirmation" | undefined;
    reference?: string | undefined;
    date?: string | undefined;
    note?: string | undefined;
  }) => FeePayment | null;
  submitParentBankTransfer: (params: {
    studentId: string;
    session: string;
    term: string;
    invoiceProgrammeId: "combined" | ProgrammeId;
    amount: number;
    reference: string;
    note?: string | undefined;
  }) => FeePayment | null;
  confirmBankTransfer: (paymentId: string) => void;

  // SMS & WhatsApp Parent Notices
  sendParentNotice: (params: {
    channel: "SMS" | "WhatsApp";
    audienceLabel: string;
    recipientCount: number;
    subject: string;
    message: string;
  }) => ParentNoticeLog | null;

  // Staff & Payroll
  upsertStaffMember: (staff: StaffMember) => void;
  deleteStaffMember: (id: string) => void;
  generateMonthlyPayroll: (monthKey: string, monthLabel: string) => number;
  updatePayrollRecord: (record: PayrollRecord) => void;
  markPayrollPaidStatus: (
    payrollId: string,
    status: "Paid" | "Pending",
    reference?: string
  ) => void;
  markAllMonthPayrollPaid: (monthKey: string) => number;
}

const SchoolOSContext = createContext<SchoolOSContextValue | null>(null);

const PORTAL_STORAGE_KEY = "ndh_schoolos_portal_v3";

function makeAuditEntry(params: {
  portal: ActivePortalSession;
  category: AuditCategory;
  action: string;
  targetLabel: string;
  oldValue: string;
  newValue: string;
}): AuditLogEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorName: params.portal.displayName,
    actorRole: params.portal.role,
    category: params.category,
    action: params.action,
    targetLabel: params.targetLabel,
    oldValue: params.oldValue,
    newValue: params.newValue,
  };
}

export function buildPortalSessionForRole(
  role: UserRole,
  rawDb: SchoolDatabaseSnapshot,
  options?: {
    staffId?: string | undefined;
    parentPhone?: string | undefined;
    isAuthenticated?: boolean | undefined;
  }
): ActivePortalSession {
  const isAuthenticated = options?.isAuthenticated ?? true;

  const schoolCode = rawDb.settings.code;

  if (role === "admin") {
    const adminStaff =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "admin") ??
      rawDb.staff[0];
    return {
      isAuthenticated,
      role: "admin",
      isExamOfficer: true,
      schoolCode,
      staffId: adminStaff?.id,
      displayName: adminStaff?.fullName ?? "School Proprietor",
      subtitle: "Proprietor / Admin • Full School Access",
    };
  }

  if (role === "exam_officer") {
    const eo =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "exam_officer");
    return {
      isAuthenticated,
      role: "exam_officer",
      isExamOfficer: true,
      schoolCode,
      staffId: eo?.id,
      displayName: eo?.fullName ?? "Exam Officer",
      subtitle:
        "Exam Officer • All-Classes Results, Report Sheets & Question Bank",
    };
  }

  if (role === "class_teacher") {
    const ct =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "class_teacher");
    const classNames = (ct?.assignedClassIds ?? [])
      .map((cid) => rawDb.classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join(", ");
    const eoTag = ct?.isExamOfficer ? " + Exam Officer" : "";
    return {
      isAuthenticated,
      role: "class_teacher",
      isExamOfficer: Boolean(ct?.isExamOfficer),
      schoolCode,
      staffId: ct?.id,
      displayName: ct?.fullName ?? "Class Teacher",
      subtitle: `Class Teacher${eoTag} • ${classNames || "Assigned Class Only"}`,
    };
  }

  if (role === "subject_teacher") {
    const st =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "subject_teacher");
    const classNames = (st?.assignedClassIds ?? [])
      .map((cid) => rawDb.classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join(", ");
    const subNames = (st?.assignedSubjectIds ?? [])
      .map((sid) => rawDb.subjects.find((s) => s.id === sid)?.name)
      .filter(Boolean)
      .join(", ");
    const eoTag = st?.isExamOfficer ? " + Exam Officer" : "";
    return {
      isAuthenticated,
      role: "subject_teacher",
      isExamOfficer: Boolean(st?.isExamOfficer),
      schoolCode,
      staffId: st?.id,
      displayName: st?.fullName ?? "Subject Teacher",
      subtitle: `Subject Teacher${eoTag} • ${subNames || "Subject"} (${classNames || "Assigned Classes"})`,
    };
  }

  if (role === "bursar") {
    const bursar =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "bursar");
    return {
      isAuthenticated,
      role: "bursar",
      schoolCode,
      staffId: bursar?.id,
      displayName: bursar?.fullName ?? "School Bursar",
      subtitle: "Bursar / Accountant • Fees, Receipts, Debtors & Payroll",
    };
  }

  if (role === "secretary") {
    const sec =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "secretary");
    return {
      isAuthenticated,
      role: "secretary",
      schoolCode,
      staffId: sec?.id,
      displayName: sec?.fullName ?? "School Secretary",
      subtitle: "Secretary • Student Records, Attendance & Printing",
    };
  }

  if (role === "muallim") {
    const muallim =
      rawDb.staff.find((s) => s.id === options?.staffId) ??
      rawDb.staff.find((s) => s.systemRole === "muallim");
    const classNames = (muallim?.assignedClassIds ?? [])
      .map((cid) => rawDb.classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join(", ");
    return {
      isAuthenticated,
      role: "muallim",
      schoolCode,
      staffId: muallim?.id,
      displayName: muallim?.fullName ?? "Qur'an Instructor",
      subtitle: `Qur'an Instructor • ${classNames || "Assigned Classes"}`,
    };
  }

  // Parent
  const targetPhone = options?.parentPhone ?? "";
  const normTarget = normalizePhoneKey(targetPhone);
  const matchedStudent =
    (normTarget.length > 0
      ? rawDb.students.find((s) => normalizePhoneKey(s.parentPhone) === normTarget)
      : undefined) ?? rawDb.students[0];
  const matchedPhone = matchedStudent?.parentPhone ?? targetPhone;
  const kidsCount =
    matchedPhone.trim().length > 0
      ? rawDb.students.filter(
          (s) =>
            normalizePhoneKey(s.parentPhone) === normalizePhoneKey(matchedPhone)
        ).length
      : 0;

  return {
    isAuthenticated,
    role: "parent",
    schoolCode,
    parentPhone: matchedPhone,
    displayName: matchedStudent?.guardianName ?? "Parent / Guardian",
    subtitle: `Parent Portal • ${kidsCount} Linked ${kidsCount === 1 ? "Child" : "Children"}`,
  };
}

export function SchoolOSProvider({ children }: { children: React.ReactNode }) {
  const [rawDb, setRawDb] = useState<SchoolDatabaseSnapshot>(() =>
    createSeedDatabase()
  );
  const [hydrated, setHydrated] = useState(false);
  const [onboardingWizardOpen, setOnboardingWizardOpen] = useState(false);
  const [portalVideoGuideOpen, setPortalVideoGuideOpen] = useState(false);
  const [registeredSchools, setRegisteredSchools] = useState<
    RegisteredSchoolTenant[]
  >([]);
  const [activeNav, setActiveNavState] = useState<NavSectionId>("overview");
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  const [portal, setPortal] = useState<ActivePortalSession>(() =>
    buildPortalSessionForRole("admin", createSeedDatabase(), {
      isAuthenticated: false,
    })
  );

  // Hydrate persisted DB & session on client mount
  useEffect(() => {
    const loaded = schoolRepository.loadSnapshot();
    setRawDb(loaded);
    setRegisteredSchools(schoolRepository.listRegisteredSchools());
    try {
      const savedPortal =
        window.sessionStorage.getItem(PORTAL_STORAGE_KEY) ||
        window.localStorage.getItem(PORTAL_STORAGE_KEY);
      if (savedPortal) {
        const parsed = JSON.parse(savedPortal) as ActivePortalSession;
        if (parsed && parsed.role) {
          // Strict cross-school session guard: if session schoolCode mismatches active school, force sign-out
          const sessionCode = normalizeSchoolCodeKey(parsed.schoolCode ?? "");
          const loadedCode = normalizeSchoolCodeKey(loaded.settings.code ?? "");
          if (
            parsed.isAuthenticated &&
            sessionCode &&
            loadedCode &&
            sessionCode !== loadedCode
          ) {
            setPortal(
              buildPortalSessionForRole("admin", loaded, {
                isAuthenticated: false,
              })
            );
          } else if (
            parsed.role === "muallim" &&
            !loaded.settings.enableQuranModule
          ) {
            setPortal(
              buildPortalSessionForRole("class_teacher", loaded, {
                isAuthenticated: parsed.isAuthenticated,
              })
            );
          } else {
            setPortal({
              ...parsed,
              schoolCode: loaded.settings.code,
            });
          }
        }
      }
    } catch {
      // ignore session storage read issue
    }
    setHydrated(true);
  }, []);

  // Persist DB updates after hydration
  useEffect(() => {
    if (!hydrated) return;
    schoolRepository.saveSnapshot(rawDb);
    setRegisteredSchools(schoolRepository.listRegisteredSchools());
  }, [rawDb, hydrated]);

  // Toggle body class for clean @media print isolation
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (printJob) {
      document.body.classList.add("ndh-printing");
    } else {
      document.body.classList.remove("ndh-printing");
    }
    return () => {
      document.body.classList.remove("ndh-printing");
    };
  }, [printJob]);

  // Data-Layer Read Enforcement: every consumer receives ONLY authorized records
  const scopedDb = useMemo(
    () => getAuthorizedSnapshot(rawDb, portal),
    [rawDb, portal]
  );

  const persistPortal = useCallback((next: ActivePortalSession) => {
    setPortal(next);
    if (typeof window !== "undefined") {
      try {
        const serialized = JSON.stringify(next);
        window.sessionStorage.setItem(PORTAL_STORAGE_KEY, serialized);
        if (next.isAuthenticated) {
          window.localStorage.setItem(PORTAL_STORAGE_KEY, serialized);
        } else {
          window.localStorage.removeItem(PORTAL_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const setActiveNav = useCallback(
    (nav: NavSectionId) => {
      const allowed = getAllowedNavSections(
        portal.role,
        rawDb.settings.enableQuranModule,
        hasExamOfficerPrivileges(rawDb, portal)
      );
      if (!allowed.includes(nav)) {
        setActiveNavState("overview");
        return;
      }
      setActiveNavState(nav);
    },
    [rawDb, portal]
  );

  // Production Staff Login (Scoped strictly to target School Workspace Code!)
  const loginProductionStaff = useCallback(
    (params: {
      identifier: string;
      pin: string;
      schoolCode?: string | undefined;
    }) => {
      let targetDb = rawDb;
      if (params.schoolCode && params.schoolCode.trim().length > 0) {
        const requestedCode = normalizeSchoolCodeKey(params.schoolCode);
        const activeCode = normalizeSchoolCodeKey(rawDb.settings.code);
        if (requestedCode !== activeCode) {
          const tenantDb = schoolRepository.loadTenantByCode(requestedCode);
          if (!tenantDb) {
            return {
              ok: false,
              error: `School Code "${requestedCode}" does not match any registered school on this device. Staff from one school cannot enter another school's portal.`,
            };
          }
          targetDb = tenantDb;
          setRawDb(tenantDb);
        }
      }

      const cleanId = params.identifier.trim().toLowerCase();
      const cleanPin = params.pin.trim();
      const matched = targetDb.staff.find((s) => {
        if (s.systemRole === "muallim" && !targetDb.settings.enableQuranModule) {
          return false;
        }
        return (
          s.email.toLowerCase() === cleanId ||
          s.staffCode.toLowerCase() === cleanId ||
          normalizePhoneKey(s.phone) === normalizePhoneKey(params.identifier)
        );
      });

      if (!matched) {
        return {
          ok: false,
          error:
            "Staff record not found in this school workspace. Check your School Code, Staff ID, email or phone.",
        };
      }
      if (matched.loginPin && matched.loginPin !== cleanPin) {
        return {
          ok: false,
          error: "Incorrect staff PIN. Please try again.",
        };
      }

      const nextPortal = buildPortalSessionForRole(
        matched.systemRole,
        targetDb,
        {
          staffId: matched.id,
          isAuthenticated: true,
        }
      );
      persistPortal(nextPortal);
      setActiveNavState("overview");
      return { ok: true };
    },
    [rawDb, persistPortal]
  );

  // Live Parent Login (Scoped strictly to target School Workspace Code!)
  const loginProductionParent = useCallback(
    (params: { phone: string; schoolCode?: string | undefined }) => {
      let targetDb = rawDb;
      if (params.schoolCode && params.schoolCode.trim().length > 0) {
        const requestedCode = normalizeSchoolCodeKey(params.schoolCode);
        const activeCode = normalizeSchoolCodeKey(rawDb.settings.code);
        if (requestedCode !== activeCode) {
          const tenantDb = schoolRepository.loadTenantByCode(requestedCode);
          if (!tenantDb) {
            return {
              ok: false,
              error: `School Code "${requestedCode}" does not match this school workspace. Parents cannot enter another school's portal.`,
            };
          }
          targetDb = tenantDb;
          setRawDb(tenantDb);
        }
      }

      const norm = normalizePhoneKey(params.phone);
      if (norm.length < 7) {
        return {
          ok: false,
          error: "Enter the guardian phone number registered with the school.",
        };
      }
      const matched = targetDb.students.find(
        (s) => normalizePhoneKey(s.parentPhone) === norm
      );
      if (!matched) {
        return {
          ok: false,
          error:
            "No student linked to this phone number in this school workspace. Check the School Code or contact the school secretary.",
        };
      }
      const nextPortal = buildPortalSessionForRole("parent", targetDb, {
        parentPhone: matched.parentPhone,
        isAuthenticated: true,
      });
      persistPortal(nextPortal);
      setActiveNavState("overview");
      return { ok: true };
    },
    [rawDb, persistPortal]
  );

  const logoutSession = useCallback(() => {
    setPrintJob(null);
    persistPortal({
      ...portal,
      isAuthenticated: false,
    });
  }, [portal, persistPortal]);

  // Live School Onboarding -> Creates Proprietor/Admin Account & Signs In Immediately
  const completeSchoolOnboarding = useCallback(
    (payload: OnboardingPayload) => {
      const adminFullName = payload.adminName?.trim() || "School Proprietor";
      const adminContact = payload.adminContact?.trim() || payload.schoolPhone?.trim() || "";
      const isEmailContact = adminContact.includes("@");
      const adminPhone = !isEmailContact ? adminContact : (payload.schoolPhone?.trim() || "");
      const adminEmail = isEmailContact ? adminContact : "";
      const adminPin = payload.adminPin?.trim() || "1234";
      const adminStaffId = "stf-admin-1";

      const adminStaffMember: StaffMember = {
        id: adminStaffId,
        staffCode: "ADM-001",
        fullName: adminFullName,
        role: "Proprietor / Principal",
        systemRole: "admin",
        loginPin: adminPin,
        phone: adminPhone,
        email: adminEmail,
        bankName: "",
        accountNumber: "",
        assignedClassIds: [],
        assignedSubjectIds: [],
        status: "Active",
        joinedDate: new Date().toISOString().slice(0, 10),
        salary: {
          baseSalary: 0,
          teachingAllowance: 0,
          overtime: 0,
          transport: 0,
          absenceFines: 0,
          pension: 0,
          salaryAdvanceRepayment: 0,
        },
      };

      const basePrefix =
        payload.schoolName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .map((w) => (w[0] ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
          .join("") || "SCH";
      const existingCodes = new Set(
        schoolRepository
          .listRegisteredSchools()
          .map((item) => normalizeSchoolCodeKey(item.code))
      );
      let resolvedSchoolCode = basePrefix;
      if (existingCodes.has(normalizeSchoolCodeKey(resolvedSchoolCode))) {
        const suffix = String(Math.floor(1000 + Math.random() * 9000));
        resolvedSchoolCode = `${basePrefix}-${suffix}`;
      }

      setRawDb(() => {
        // Always start a newly registered school from a clean blank tenant snapshot
        // so zero students, staff, scores, or fees ever cross between schools.
        const freshBase = createSeedDatabase();
        const names =
          payload.classNames.length > 0
            ? payload.classNames
            : DEFAULT_NIGERIAN_CLASS_NAMES;

        const mainClasses: ClassGroup[] = names.map((name, idx) => {
          const id = `cls-main-${idx + 1}`;
          const nextId =
            idx < names.length - 1 ? `cls-main-${idx + 2}` : null;
          return {
            id,
            name,
            programmeId: "prog-main",
            levelOrder: idx + 1,
            nextGroupId: nextId,
            room: `Room ${idx + 1}`,
          };
        });

        const programmes: SchoolProgramme[] = [
          {
            id: "prog-main",
            name: "Main School",
            description: "Primary / Secondary Day School",
          },
        ];

        const extraClasses: ClassGroup[] = [];
        if (payload.multiProgrammeEnabled) {
          const extraNames =
            payload.additionalProgrammeNames &&
            payload.additionalProgrammeNames.length > 0
              ? payload.additionalProgrammeNames
              : ["Evening Lessons"];
          extraNames.forEach((pName, pIdx) => {
            const pid = `prog-${pIdx + 2}`;
            programmes.push({
              id: pid,
              name: pName.trim() || `Programme ${pIdx + 2}`,
            });
            extraClasses.push({
              id: `cls-${pid}-1`,
              name: `${pName.trim() || "Programme"} Group 1`,
              programmeId: pid,
              levelOrder: 1,
              nextGroupId: null,
              room: "Hall A",
            });
          });
        }

        const nextSettings: SchoolSettings = {
          ...freshBase.settings,
          name: payload.schoolName.trim() || freshBase.settings.name,
          country: payload.country || "Nigeria",
          code: resolvedSchoolCode,
          address: payload.schoolAddress?.trim() || freshBase.settings.address,
          phone:
            payload.schoolPhone?.trim() ||
            adminPhone ||
            freshBase.settings.phone,
          email: adminEmail || freshBase.settings.email,
          currencySymbol: payload.currencySymbol || "₦",
          currencyCode: payload.currencyCode || "NGN",
          logoDataUrl: payload.logoDataUrl ?? freshBase.settings.logoDataUrl,
          multiProgrammeEnabled: payload.multiProgrammeEnabled,
          programmes,
          enableQuranModule: false,
          setupCompleted: true,
          sessions: freshBase.settings.sessions.includes(payload.currentSession)
            ? freshBase.settings.sessions
            : [...freshBase.settings.sessions, payload.currentSession],
          currentSession: payload.currentSession,
          terms: ["First Term", "Second Term", "Third Term"],
          currentTerm: payload.currentTerm || "First Term",
          labels: {
            classSingular: "Class",
            classPlural: "Classes",
            teacherSingular: "Teacher",
            teacherPlural: "Teachers",
            termLabel: "Term",
          },
        };

        const audit = makeAuditEntry({
          portal: {
            isAuthenticated: true,
            role: "admin",
            schoolCode: resolvedSchoolCode,
            staffId: adminStaffId,
            displayName: adminFullName,
            subtitle: "School Registration",
          },
          category: "settings",
          action: "Registered School Workspace",
          targetLabel: nextSettings.name,
          oldValue: "Unregistered",
          newValue: `${nextSettings.name} (Code: ${resolvedSchoolCode} • ${names.length} classes • Owner: ${adminFullName})`,
        });

        return {
          ...freshBase,
          settings: nextSettings,
          classes: [...mainClasses, ...extraClasses],
          staff: [adminStaffMember],
          auditLogs: [audit],
        };
      });

      setOnboardingWizardOpen(false);
      persistPortal({
        isAuthenticated: true,
        role: "admin",
        schoolCode: resolvedSchoolCode,
        staffId: adminStaffId,
        displayName: adminFullName,
        subtitle: "Proprietor / Admin • Full School Access",
      });
      setActiveNavState("overview");
    },
    [persistPortal]
  );

  // Data-Layer Print Permission Guard
  const openPrintPreview = useCallback(
    (job: PrintJob, autoTriggerPrint = false) => {
      const permitted = canPrintDocument(
        scopedDb,
        portal,
        job.type === "report_card"
          ? { type: "report_card", studentId: job.studentId }
          : job.type === "receipt"
            ? { type: "receipt", paymentId: job.paymentId }
            : job.type === "broadsheet"
              ? { type: "broadsheet", classId: job.classId }
              : job.type === "payslip"
                ? { type: "payslip", payrollId: job.payrollId }
                : job.type === "exam_paper"
                  ? { type: "exam_paper", examPaperId: job.examPaperId }
                  : job.type === "marking_scheme"
                    ? { type: "marking_scheme", examPaperId: job.examPaperId }
                    : { type: "table" }
      );
      if (!permitted) {
        toast.error("Access denied: you cannot print records outside your assigned scope.");
        return;
      }
      setPrintJob(job);
      if (autoTriggerPrint && typeof window !== "undefined") {
        window.setTimeout(() => {
          window.print();
        }, 250);
      }
    },
    [scopedDb, portal]
  );

  const closePrintPreview = useCallback(() => {
    setPrintJob(null);
  }, []);

  const updateSettings = useCallback(
    (
      updater: (prev: SchoolSettings) => SchoolSettings,
      auditDescription?: string
    ) => {
      if (!canManageSettings(portal)) {
        toast.error("Only the Proprietor / Admin can change school settings.");
        return;
      }
      setRawDb((prev) => {
        const next = updater(prev.settings);
        const changes: string[] = [];
        if (prev.settings.name !== next.name) {
          changes.push(`Name: "${prev.settings.name}" -> "${next.name}"`);
        }
        if (prev.settings.multiProgrammeEnabled !== next.multiProgrammeEnabled) {
          changes.push(
            `Multiple Programmes: ${prev.settings.multiProgrammeEnabled ? "On" : "Off"} -> ${next.multiProgrammeEnabled ? "On" : "Off"}`
          );
        }
        if (prev.settings.enableQuranModule !== next.enableQuranModule) {
          changes.push(
            `Optional Qur'an Module: ${prev.settings.enableQuranModule ? "On" : "Off"} -> ${next.enableQuranModule ? "On" : "Off"}`
          );
        }
        if (prev.settings.billingMode !== next.billingMode) {
          changes.push(`Billing Mode: ${prev.settings.billingMode} -> ${next.billingMode}`);
        }
        if (prev.settings.currentTerm !== next.currentTerm) {
          changes.push(`Active Term: ${prev.settings.currentTerm} -> ${next.currentTerm}`);
        }

        const audit = makeAuditEntry({
          portal,
          category: "settings",
          action: auditDescription ?? "Updated School Settings",
          targetLabel: next.name,
          oldValue: `${prev.settings.currentSession} • ${prev.settings.currentTerm}`,
          newValue:
            changes.join("; ") ||
            `${next.currentSession} • ${next.currentTerm}`,
        });

        return {
          ...prev,
          settings: next,
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [portal]
  );

  const upsertClassGroup = useCallback(
    (group: ClassGroup) => {
      if (!canManageClassesAndSubjects(portal)) {
        toast.error("Only the Proprietor / Admin can add or edit classes.");
        return;
      }
      setRawDb((prev) => {
        const exists = prev.classes.some((c) => c.id === group.id);
        return {
          ...prev,
          classes: exists
            ? prev.classes.map((c) => (c.id === group.id ? group : c))
            : [...prev.classes, group],
        };
      });
    },
    [portal]
  );

  const deleteClassGroup = useCallback(
    (id: string) => {
      if (!canManageClassesAndSubjects(portal)) {
        toast.error("Only the Proprietor / Admin can remove classes.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        classes: prev.classes.filter((c) => c.id !== id),
      }));
    },
    [portal]
  );

  const upsertSubject = useCallback(
    (subject: Subject) => {
      if (!canManageClassesAndSubjects(portal)) {
        toast.error("Only the Proprietor / Admin can add or edit subjects.");
        return;
      }
      setRawDb((prev) => {
        const exists = prev.subjects.some((s) => s.id === subject.id);
        return {
          ...prev,
          subjects: exists
            ? prev.subjects.map((s) => (s.id === subject.id ? subject : s))
            : [...prev.subjects, subject],
        };
      });
    },
    [portal]
  );

  const deleteSubject = useCallback(
    (id: string) => {
      if (!canManageClassesAndSubjects(portal)) {
        toast.error("Only the Proprietor / Admin can remove subjects.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== id),
      }));
    },
    [portal]
  );

  // Combined / Cross-Class Teaching Groups (for Multi-Section / Integrated Subject Teachers)
  const upsertTeachingGroup = useCallback(
    (group: SubjectTeachingGroup) => {
      const isOfficer = hasExamOfficerPrivileges(rawDb, portal);
      const isTeacher =
        portal.role === "subject_teacher" ||
        portal.role === "class_teacher" ||
        portal.role === "muallim";
      if (!isOfficer && !isTeacher) {
        toast.error("You do not have permission to manage teaching groups.");
        return;
      }
      const nextGroup: SubjectTeachingGroup = {
        ...group,
        teacherStaffId: group.teacherStaffId ?? portal.staffId,
      };
      setRawDb((prev) => {
        const list = prev.teachingGroups ?? [];
        const exists = list.some((g) => g.id === nextGroup.id);
        return {
          ...prev,
          teachingGroups: exists
            ? list.map((g) => (g.id === nextGroup.id ? nextGroup : g))
            : [...list, nextGroup],
        };
      });
    },
    [rawDb, portal]
  );

  const deleteTeachingGroup = useCallback(
    (id: string) => {
      const isOfficer = hasExamOfficerPrivileges(rawDb, portal);
      const target = (rawDb.teachingGroups ?? []).find((g) => g.id === id);
      if (!target) return;
      if (!isOfficer && target.teacherStaffId !== portal.staffId) {
        toast.error("Only the Admin, Exam Officer, or group teacher can remove this group.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        teachingGroups: (prev.teachingGroups ?? []).filter((g) => g.id !== id),
      }));
    },
    [rawDb, portal]
  );

  // Exam Question Paper Creation, Submission & Exam Officer Review
  const upsertExamPaper = useCallback(
    (paper: ExamPaperSubmission): { ok: boolean; error?: string } => {
      const isOfficer = hasExamOfficerPrivileges(rawDb, portal);
      const isTeacher =
        portal.role === "class_teacher" ||
        portal.role === "subject_teacher" ||
        portal.role === "muallim";

      if (!isOfficer && !isTeacher) {
        return {
          ok: false,
          error: "Your role does not have permission to create or edit exam papers.",
        };
      }

      const existing = (rawDb.examPapers ?? []).find((ep) => ep.id === paper.id);
      if (existing && existing.status === "approved" && !isOfficer) {
        return {
          ok: false,
          error:
            "This paper is already approved and locked for printing. Ask the Exam Officer to unlock it for changes.",
        };
      }

      if (
        paper.status === "submitted" &&
        paper.objectives.length === 0 &&
        paper.theory.length === 0
      ) {
        return {
          ok: false,
          error:
            "Add at least one Objective or Theory question before submitting.",
        };
      }

      const nowIso = new Date().toISOString();
      const normalizedPaper: ExamPaperSubmission = {
        ...paper,
        submittedByStaffId:
          paper.submittedByStaffId ?? existing?.submittedByStaffId ?? portal.staffId,
        submittedByName:
          paper.submittedByName || existing?.submittedByName || portal.displayName,
        ...(paper.status === "submitted" ? { submittedAt: nowIso } : {}),
        updatedAt: nowIso,
      };

      setRawDb((prev) => {
        const list = prev.examPapers ?? [];
        const found = list.some((ep) => ep.id === normalizedPaper.id);
        const subName =
          prev.subjects.find((s) => s.id === normalizedPaper.id)?.name ??
          prev.subjects.find((s) => s.id === normalizedPaper.subjectId)?.name ??
          "Subject";
        const clsNames = normalizedPaper.classIds
          .map((cid) => prev.classes.find((c) => c.id === cid)?.name)
          .filter(Boolean)
          .join(", ");

        return {
          ...prev,
          examPapers: found
            ? list.map((ep) =>
                ep.id === normalizedPaper.id ? normalizedPaper : ep
              )
            : [normalizedPaper, ...list],
          auditLogs:
            normalizedPaper.status === "submitted"
              ? [
                  makeAuditEntry({
                    portal,
                    category: "exam_paper",
                    action: "Submitted Exam Paper to Exam Officer",
                    targetLabel: `${subName} (${clsNames || "Class"})`,
                    oldValue: existing?.status ?? "new",
                    newValue: `submitted (${normalizedPaper.objectives.length} Obj, ${normalizedPaper.theory.length} Theory)`,
                  }),
                  ...prev.auditLogs,
                ]
              : prev.auditLogs,
        };
      });
      return { ok: true };
    },
    [rawDb, portal]
  );

  const submitExamPaperToOfficer = useCallback(
    (paperId: string): { ok: boolean; error?: string } => {
      const existing = (rawDb.examPapers ?? []).find((ep) => ep.id === paperId);
      if (!existing) {
        return { ok: false, error: "Exam paper not found." };
      }
      if (existing.objectives.length === 0 && existing.theory.length === 0) {
        return {
          ok: false,
          error: "Add at least one Objective or Theory question before submitting.",
        };
      }

      const nowIso = new Date().toISOString();
      const subName =
        rawDb.subjects.find((s) => s.id === existing.subjectId)?.name ??
        "Subject";
      const clsNames = existing.classIds
        .map((cid) => rawDb.classes.find((c) => c.id === cid)?.name)
        .filter(Boolean)
        .join(", ");

      setRawDb((prev) => {
        const list = prev.examPapers ?? [];
        const audit = makeAuditEntry({
          portal,
          category: "exam_paper",
          action: "Submitted Exam Paper to Exam Officer",
          targetLabel: `${subName} (${clsNames || "Class"})`,
          oldValue: existing.status,
          newValue: `submitted (${existing.objectives.length} Obj, ${existing.theory.length} Theory)`,
        });
        return {
          ...prev,
          examPapers: list.map((ep) =>
            ep.id === paperId
              ? {
                  ...ep,
                  status: "submitted",
                  submittedAt: nowIso,
                  updatedAt: nowIso,
                }
              : ep
          ),
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return { ok: true };
    },
    [rawDb, portal]
  );

  const reviewExamPaper = useCallback(
    (params: {
      paperId: string;
      decision: "approved" | "returned" | "draft";
      feedback?: string | undefined;
    }): { ok: boolean; error?: string } => {
      if (!hasExamOfficerPrivileges(rawDb, portal)) {
        return {
          ok: false,
          error:
            "Only the Exam Officer or Proprietor/Admin can approve or return submitted exam papers.",
        };
      }
      const existing = (rawDb.examPapers ?? []).find(
        (ep) => ep.id === params.paperId
      );
      if (!existing) {
        return { ok: false, error: "Exam paper not found." };
      }

      const nowIso = new Date().toISOString();
      const subName =
        rawDb.subjects.find((s) => s.id === existing.subjectId)?.name ??
        "Subject";
      const clsNames = existing.classIds
        .map((cid) => rawDb.classes.find((c) => c.id === cid)?.name)
        .filter(Boolean)
        .join(", ");

      setRawDb((prev) => {
        const list = prev.examPapers ?? [];
        const audit = makeAuditEntry({
          portal,
          category: "exam_paper",
          action:
            params.decision === "approved"
              ? "Approved Exam Paper for Printing"
              : params.decision === "returned"
                ? "Returned Exam Paper for Correction"
                : "Unlocked Exam Paper to Draft",
          targetLabel: `${subName} (${clsNames || "Class"})`,
          oldValue: existing.status,
          newValue: `${params.decision}${params.feedback ? ` — ${params.feedback}` : ""}`,
        });
        return {
          ...prev,
          examPapers: list.map((ep) =>
            ep.id === params.paperId
              ? {
                  ...ep,
                  status: params.decision,
                  reviewedByName: portal.displayName,
                  reviewedAt: nowIso,
                  reviewerFeedback: params.feedback?.trim() || ep.reviewerFeedback,
                  updatedAt: nowIso,
                }
              : ep
          ),
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return { ok: true };
    },
    [rawDb, portal]
  );

  const deleteExamPaper = useCallback(
    (paperId: string) => {
      const isOfficer = hasExamOfficerPrivileges(rawDb, portal);
      const target = (rawDb.examPapers ?? []).find((ep) => ep.id === paperId);
      if (!target) return;
      if (
        !isOfficer &&
        (target.submittedByStaffId !== portal.staffId ||
          target.status === "approved")
      ) {
        toast.error("Only the Exam Officer or Admin can delete approved papers.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        examPapers: (prev.examPapers ?? []).filter((ep) => ep.id !== paperId),
      }));
    },
    [rawDb, portal]
  );

  const upsertStudent = useCallback(
    (student: Student) => {
      const existing = rawDb.students.find((s) => s.id === student.id);
      const oldWaiver = existing?.manualFeeWaiver ?? 0;
      const newWaiver = student.manualFeeWaiver ?? 0;

      if (oldWaiver !== newWaiver && !canManageFeeWaivers(portal)) {
        toast.error("Only the Proprietor / Admin can grant or modify fee waivers.");
        return;
      }
      if (!canManageStudents(portal) && !(oldWaiver !== newWaiver && canManageFeeWaivers(portal))) {
        toast.error("Only the Proprietor / Admin or Secretary can edit student records.");
        return;
      }

      setRawDb((prev) => {
        const prevStu = prev.students.find((s) => s.id === student.id);
        const logs = [...prev.auditLogs];
        if ((prevStu?.manualFeeWaiver ?? 0) !== (student.manualFeeWaiver ?? 0)) {
          logs.unshift(
            makeAuditEntry({
              portal,
              category: "fee_waiver",
              action: "Updated Student Fee Waiver",
              targetLabel: `${student.fullName} (${student.admissionId})`,
              oldValue: formatCurrency(
                prevStu?.manualFeeWaiver ?? 0,
                prev.settings.currencySymbol
              ),
              newValue: `${formatCurrency(
                student.manualFeeWaiver ?? 0,
                prev.settings.currencySymbol
              )}${student.manualWaiverReason ? ` (${student.manualWaiverReason})` : ""}`,
            })
          );
        }

        // If a student's class changed via the Edit form, keep current-term scores synced
        let nextScores = prev.scores;
        if (prevStu) {
          Object.entries(student.programmeClasses).forEach(([progId, newClsId]) => {
            const oldClsId = prevStu.programmeClasses[progId];
            if (oldClsId && newClsId && oldClsId !== newClsId) {
              const oldName =
                prev.classes.find((c) => c.id === oldClsId)?.name ?? oldClsId;
              const newName =
                prev.classes.find((c) => c.id === newClsId)?.name ?? newClsId;
              nextScores = nextScores.map((sc) =>
                sc.studentId === student.id &&
                sc.programmeId === progId &&
                sc.session === prev.settings.currentSession &&
                sc.term === prev.settings.currentTerm
                  ? { ...sc, classId: newClsId }
                  : sc
              );
              logs.unshift(
                makeAuditEntry({
                  portal,
                  category: "student_transfer",
                  action: "Changed Student Class",
                  targetLabel: `${student.fullName} (${student.admissionId})`,
                  oldValue: oldName,
                  newValue: newName,
                })
              );
            }
          });
        }

        return {
          ...prev,
          students: prevStu
            ? prev.students.map((s) => (s.id === student.id ? student : s))
            : [student, ...prev.students],
          scores: nextScores,
          auditLogs: logs,
        };
      });
    },
    [rawDb.students, portal]
  );

  const transferStudentClass = useCallback(
    (params: {
      studentId: string;
      programmeId: ProgrammeId;
      toClassId: string;
      reason: string;
      carryCurrentTermScores?: boolean | undefined;
    }) => {
      if (!canManageStudents(portal)) {
        return {
          ok: false,
          error:
            "Only the Proprietor / Admin or Secretary can transfer students between classes.",
        };
      }
      const student = rawDb.students.find((s) => s.id === params.studentId);
      if (!student) {
        return { ok: false, error: "Student record not found." };
      }
      const toClass = rawDb.classes.find((c) => c.id === params.toClassId);
      if (!toClass) {
        return { ok: false, error: "Destination class not found." };
      }
      const fromClassId = student.programmeClasses[params.programmeId] ?? "";
      if (fromClassId === params.toClassId) {
        return {
          ok: false,
          error: `${student.fullName} is already enrolled in ${toClass.name}.`,
        };
      }

      const fromClassName =
        rawDb.classes.find((c) => c.id === fromClassId)?.name ?? "Unassigned";
      const carryScores = params.carryCurrentTermScores ?? true;
      const cleanReason =
        params.reason.trim() || "Mid-session administrative class transfer";
      const migratedScoresCount = carryScores
        ? rawDb.scores.filter(
            (sc) =>
              sc.studentId === student.id &&
              sc.programmeId === params.programmeId &&
              sc.session === rawDb.settings.currentSession &&
              sc.term === rawDb.settings.currentTerm
          ).length
        : 0;

      const transferEntry: StudentClassTransferEntry = {
        id: `trf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString().slice(0, 10),
        session: rawDb.settings.currentSession,
        term: rawDb.settings.currentTerm,
        programmeId: params.programmeId,
        fromClassId,
        fromClassName,
        toClassId: toClass.id,
        toClassName: toClass.name,
        reason: cleanReason,
        transferredBy: portal.displayName,
        carriedCurrentTermScores: carryScores,
      };

      setRawDb((prev) => {
        const nextStudents = prev.students.map((s) => {
          if (s.id !== student.id) return s;
          return {
            ...s,
            programmeClasses: {
              ...s.programmeClasses,
              [params.programmeId]: toClass.id,
            },
            transferHistory: [transferEntry, ...(s.transferHistory ?? [])],
          };
        });

        const nextScores = carryScores
          ? prev.scores.map((sc) =>
              sc.studentId === student.id &&
              sc.programmeId === params.programmeId &&
              sc.session === prev.settings.currentSession &&
              sc.term === prev.settings.currentTerm
                ? { ...sc, classId: toClass.id }
                : sc
            )
          : prev.scores;

        const audit = makeAuditEntry({
          portal,
          category: "student_transfer",
          action: "Mid-Session Class Transfer",
          targetLabel: `${student.fullName} (${student.admissionId})`,
          oldValue: fromClassName,
          newValue: `${toClass.name} (${cleanReason}${carryScores ? ` • ${migratedScoresCount} subject scores carried over` : ""})`,
        });

        return {
          ...prev,
          students: nextStudents,
          scores: nextScores,
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return { ok: true, migratedScoresCount };
    },
    [rawDb, portal]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      if (!canManageSettings(portal)) {
        toast.error("Only the Proprietor / Admin can delete student records.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== id),
      }));
    },
    [portal]
  );

  const runEndOfSessionPromotion = useCallback(
    (decisions: PromotionDecision[], advanceToNewSession?: string) => {
      if (!canManageStudents(portal)) {
        toast.error("Only the Proprietor / Admin or Secretary can run promotions.");
        return { promotedCount: 0, graduatedCount: 0, heldBackCount: 0 };
      }

      let promotedCount = 0;
      let graduatedCount = 0;
      let heldBackCount = 0;

      setRawDb((prev) => {
        const classMap = new Map(prev.classes.map((c) => [c.id, c]));
        const decisionMap = new Map(decisions.map((d) => [d.studentId, d]));

        const updatedStudents = prev.students.map((stu) => {
          if (stu.status !== "Active") return stu;
          const dec = decisionMap.get(stu.id);
          if (!dec) return stu;

          const nextProgrammeClasses: Record<ProgrammeId, string> = {
            ...stu.programmeClasses,
          };
          let nextStatus: Student["status"] = stu.status;
          let moved = false;
          let held = false;

          Object.entries(stu.programmeClasses).forEach(([progId, currClassId]) => {
            if (!currClassId) return;
            const shouldPromote = dec.promoteByProgramme[progId] ?? false;
            if (shouldPromote) {
              const currClass = classMap.get(currClassId);
              if (currClass) {
                if (currClass.nextGroupId) {
                  nextProgrammeClasses[progId] = currClass.nextGroupId;
                  moved = true;
                } else if (progId === "prog-main") {
                  nextStatus = "Graduated";
                  graduatedCount += 1;
                }
              }
            } else {
              held = true;
            }
          });

          if (moved && nextStatus === "Active") promotedCount += 1;
          else if (held && nextStatus === "Active") heldBackCount += 1;

          return {
            ...stu,
            programmeClasses: nextProgrammeClasses,
            status: nextStatus,
          };
        });

        const nextSettings = advanceToNewSession
          ? {
              ...prev.settings,
              sessions: prev.settings.sessions.includes(advanceToNewSession)
                ? prev.settings.sessions
                : [...prev.settings.sessions, advanceToNewSession],
              currentSession: advanceToNewSession,
              currentTerm: prev.settings.terms[0] ?? "First Term",
            }
          : prev.settings;

        return {
          ...prev,
          students: updatedStudents,
          settings: nextSettings,
        };
      });

      return { promotedCount, graduatedCount, heldBackCount };
    },
    [portal]
  );

  // Score Write with Data-Layer RBAC + Result Lock + Published Approval Queue + Audit Log
  const updateScoreCell = useCallback(
    (params: {
      studentId: string;
      subjectId: string;
      classId: string;
      programmeId: ProgrammeId;
      session: string;
      term: string;
      componentId: string;
      value: number;
    }): {
      outcome: "saved" | "queued_for_approval" | "denied";
      message?: string;
    } => {
      const decision = evaluateScoreWritePermission(rawDb, portal, {
        classId: params.classId,
        subjectId: params.subjectId,
        studentId: params.studentId,
        session: params.session,
        term: params.term,
      });

      if (!decision.allowed || decision.mode === "denied") {
        toast.error(decision.reason ?? "Permission denied.");
        return {
          outcome: "denied",
          ...(decision.reason ? { message: decision.reason } : {}),
        };
      }

      const recId = `${params.studentId}_${params.subjectId}_${params.session}_${params.term}`;
      const stu = rawDb.students.find((s) => s.id === params.studentId);
      const sub = rawDb.subjects.find((s) => s.id === params.subjectId);
      const cls = rawDb.classes.find((c) => c.id === params.classId);
      const comps = getGradingComponents(
        rawDb.settings,
        params.programmeId,
        params.classId
      );
      const compLabel =
        comps.find((c) => c.id === params.componentId)?.label ??
        params.componentId.toUpperCase();
      const existingRec = rawDb.scores.find((s) => s.id === recId);
      const oldVal = existingRec?.scores[params.componentId] ?? null;

      if (oldVal === params.value) {
        return { outcome: "saved" };
      }

      // Published results -> queue teacher score edit for Admin approval!
      if (decision.mode === "queued_for_approval") {
        const reqId = `pend_${recId}_${params.componentId}`;
        setRawDb((prev) => {
          const filtered = prev.pendingScoreEdits.filter((p) => p.id !== reqId);
          const nextReq = {
            id: reqId,
            studentId: params.studentId,
            studentName: stu?.fullName ?? params.studentId,
            classId: params.classId,
            className: cls?.name ?? params.classId,
            programmeId: params.programmeId,
            subjectId: params.subjectId,
            subjectName: sub?.name ?? params.subjectId,
            session: params.session,
            term: params.term,
            componentId: params.componentId,
            componentLabel: compLabel,
            oldValue: oldVal,
            newValue: params.value,
            requestedBy: portal.displayName,
            requestedByRole: portal.role,
            requestedAt: new Date().toISOString(),
            status: "pending" as const,
          };
          const audit = makeAuditEntry({
            portal,
            category: "score",
            action: "Submitted Published Result Edit for Approval",
            targetLabel: `${stu?.fullName ?? "Student"} • ${sub?.name ?? "Subject"} (${compLabel})`,
            oldValue: oldVal === null ? "Empty" : String(oldVal),
            newValue: `${params.value} (Pending Admin Approval)`,
          });
          return {
            ...prev,
            pendingScoreEdits: [nextReq, ...filtered],
            auditLogs: [audit, ...prev.auditLogs],
          };
        });
        toast.info(
          "Published result: score change sent to Proprietor / Admin for approval."
        );
        return {
          outcome: "queued_for_approval",
          ...(decision.reason ? { message: decision.reason } : {}),
        };
      }

      // Direct Score Save + Audit Log
      setRawDb((prev) => {
        const existing = prev.scores.find((s) => s.id === recId);
        const now = new Date().toISOString();
        const audit = makeAuditEntry({
          portal,
          category: "score",
          action: `Updated ${compLabel} Score`,
          targetLabel: `${stu?.fullName ?? "Student"} • ${sub?.name ?? "Subject"} (${cls?.name ?? ""})`,
          oldValue:
            existing?.scores[params.componentId] !== undefined
              ? String(existing.scores[params.componentId])
              : "Empty",
          newValue: String(params.value),
        });

        if (existing) {
          const updated: typeof existing = {
            ...existing,
            classId: params.classId,
            programmeId: params.programmeId,
            scores: {
              ...existing.scores,
              [params.componentId]: params.value,
            },
            updatedAt: now,
          };
          return {
            ...prev,
            scores: prev.scores.map((s) => (s.id === recId ? updated : s)),
            auditLogs: [audit, ...prev.auditLogs],
          };
        }
        return {
          ...prev,
          scores: [
            ...prev.scores,
            {
              id: recId,
              studentId: params.studentId,
              subjectId: params.subjectId,
              classId: params.classId,
              programmeId: params.programmeId,
              session: params.session,
              term: params.term,
              scores: { [params.componentId]: params.value },
              updatedAt: now,
            },
          ],
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return { outcome: "saved" };
    },
    [rawDb, portal]
  );

  // Admin Result Locking & Publishing
  const setTermResultStatus = useCallback(
    (params: {
      session: string;
      term: string;
      isPublished?: boolean;
      isLocked?: boolean;
    }) => {
      if (!canManageResultLocks(portal)) {
        toast.error("Only the Proprietor / Admin can lock, unlock or publish term results.");
        return;
      }
      const lockId = `${params.session}__${params.term}`;
      setRawDb((prev) => {
        const existing = prev.termLocks.find(
          (t) =>
            t.id === lockId ||
            (t.session === params.session && t.term === params.term)
        );
        const prevPub = existing?.isPublished ?? false;
        const prevLock = existing?.isLocked ?? false;
        const nextPub = params.isPublished ?? prevPub;
        const nextLock = params.isLocked ?? prevLock;
        const now = new Date().toISOString();

        const nextControl = {
          id: lockId,
          session: params.session,
          term: params.term,
          isPublished: nextPub,
          isLocked: nextLock,
          publishedBy: nextPub ? portal.displayName : undefined,
          publishedAt: nextPub ? existing?.publishedAt ?? now : undefined,
          lockedBy: nextLock ? portal.displayName : undefined,
          lockedAt: nextLock ? existing?.lockedAt ?? now : undefined,
        };

        const exists = Boolean(existing);
        const audit = makeAuditEntry({
          portal,
          category: "result_lock",
          action: "Changed Term Result Lock / Publish Status",
          targetLabel: `${params.session} • ${params.term}`,
          oldValue: `Published: ${prevPub ? "Yes" : "No"}, Locked: ${prevLock ? "Yes" : "No"}`,
          newValue: `Published: ${nextPub ? "Yes" : "No"}, Locked: ${nextLock ? "Yes" : "No"}`,
        });

        return {
          ...prev,
          termLocks: exists
            ? prev.termLocks.map((t) =>
                t.id === existing!.id ? nextControl : t
              )
            : [...prev.termLocks, nextControl],
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [portal]
  );

  // Admin Review of Teacher Edits to Published Results
  const reviewPendingScoreEdit = useCallback(
    (requestId: string, decision: "approved" | "rejected") => {
      if (!canManageResultLocks(portal)) {
        toast.error("Only the Proprietor / Admin can approve or reject published result edits.");
        return;
      }
      setRawDb((prev) => {
        const req = prev.pendingScoreEdits.find((r) => r.id === requestId);
        if (!req || req.status !== "pending") return prev;

        const now = new Date().toISOString();
        let nextScores = prev.scores;

        if (decision === "approved") {
          const recId = `${req.studentId}_${req.subjectId}_${req.session}_${req.term}`;
          const existing = prev.scores.find((s) => s.id === recId);
          if (existing) {
            nextScores = prev.scores.map((s) =>
              s.id === recId
                ? {
                    ...s,
                    scores: { ...s.scores, [req.componentId]: req.newValue },
                    updatedAt: now,
                  }
                : s
            );
          } else {
            nextScores = [
              ...prev.scores,
              {
                id: recId,
                studentId: req.studentId,
                subjectId: req.subjectId,
                classId: req.classId,
                programmeId: req.programmeId,
                session: req.session,
                term: req.term,
                scores: { [req.componentId]: req.newValue },
                updatedAt: now,
              },
            ];
          }
        }

        const audit = makeAuditEntry({
          portal,
          category: "score",
          action:
            decision === "approved"
              ? "Approved Published Score Edit"
              : "Rejected Published Score Edit",
          targetLabel: `${req.studentName} • ${req.subjectName} (${req.componentLabel})`,
          oldValue: req.oldValue === null ? "Empty" : String(req.oldValue),
          newValue:
            decision === "approved"
              ? `${req.newValue} (Requested by ${req.requestedBy})`
              : `Kept ${req.oldValue ?? "Empty"} (Rejected ${req.newValue} from ${req.requestedBy})`,
        });

        return {
          ...prev,
          scores: nextScores,
          pendingScoreEdits: prev.pendingScoreEdits.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: decision,
                  reviewedBy: portal.displayName,
                  reviewedAt: now,
                }
              : r
          ),
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [portal]
  );

  const upsertQuranRecord = useCallback(
    (
      input: Omit<QuranProgressRecord, "updatedAt" | "recentLogs"> & {
        appendLog?: boolean;
        recordedBy?: string;
      }
    ) => {
      if (!rawDb.settings.enableQuranModule) {
        toast.error("Optional Qur'an module is disabled in Settings.");
        return;
      }
      if (
        portal.role !== "admin" &&
        portal.role !== "class_teacher" &&
        portal.role !== "muallim"
      ) {
        toast.error("Permission denied.");
        return;
      }

      setRawDb((prev) => {
        const existing = prev.quranRecords.find(
          (t) => t.studentId === input.studentId
        );
        const nowIso = new Date().toISOString();
        const todayDate = nowIso.slice(0, 10);

        const newLog = input.appendLog
          ? [
              {
                id: `qlog-${input.studentId}-${Date.now()}`,
                date: todayDate,
                surahNumber: input.currentSurahNumber,
                ayahFrom: input.ayahFrom,
                ayahTo: input.ayahTo,
                recitationScore: input.recitationScore,
                revisionStatus: input.revisionStatus,
                note: input.teacherNotes,
                recordedBy: input.recordedBy ?? portal.displayName,
              },
            ]
          : [];

        const nextRecord: QuranProgressRecord = {
          studentId: input.studentId,
          currentSurahNumber: input.currentSurahNumber,
          ayahFrom: input.ayahFrom,
          ayahTo: input.ayahTo,
          juzCompleted: input.juzCompleted,
          hizbCompleted: input.hizbCompleted,
          revisionStatus: input.revisionStatus,
          recitationScore: input.recitationScore,
          teacherNotes: input.teacherNotes,
          arabicTeacherNote: input.arabicTeacherNote,
          updatedAt: nowIso,
          recentLogs: [...newLog, ...(existing?.recentLogs ?? [])].slice(0, 12),
        };

        return {
          ...prev,
          quranRecords: existing
            ? prev.quranRecords.map((t) =>
                t.studentId === input.studentId ? nextRecord : t
              )
            : [...prev.quranRecords, nextRecord],
        };
      });
    },
    [rawDb.settings.enableQuranModule, portal]
  );

  const upsertAffectiveRating = useCallback(
    (record: AffectiveRatingRecord) => {
      if (
        portal.role !== "admin" &&
        portal.role !== "class_teacher" &&
        portal.role !== "muallim"
      ) {
        toast.error("Only the Admin or Class Teacher can update conduct remarks.");
        return;
      }
      setRawDb((prev) => {
        const exists = prev.affective.some((a) => a.id === record.id);
        return {
          ...prev,
          affective: exists
            ? prev.affective.map((a) => (a.id === record.id ? record : a))
            : [...prev.affective, record],
        };
      });
    },
    [portal.role]
  );

  const setAttendanceStatus = useCallback(
    (params: {
      date: string;
      session: string;
      term: string;
      programmeId: ProgrammeId;
      classId: string;
      studentId: string;
      status: AttendanceStatus;
      note?: string;
    }) => {
      if (!canMarkAttendanceForClass(rawDb, portal, params.classId)) {
        toast.error("You do not have permission to mark attendance for this class.");
        return;
      }
      const id = `${params.date}_${params.programmeId}_${params.classId}_${params.studentId}`;
      setRawDb((prev) => {
        const existing = prev.attendance.find((a) => a.id === id);
        const stu = prev.students.find((s) => s.id === params.studentId);
        const cls = prev.classes.find((c) => c.id === params.classId);
        const entry = { id, ...params };
        const audit = makeAuditEntry({
          portal,
          category: "attendance",
          action: "Marked Daily Attendance",
          targetLabel: `${stu?.fullName ?? params.studentId} (${cls?.name ?? params.classId} • ${params.date})`,
          oldValue: existing?.status ?? "Unmarked",
          newValue: params.status,
        });
        return {
          ...prev,
          attendance: existing
            ? prev.attendance.map((a) => (a.id === id ? entry : a))
            : [...prev.attendance, entry],
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [rawDb, portal]
  );

  const markClassAllPresent = useCallback(
    (params: {
      date: string;
      session: string;
      term: string;
      programmeId: ProgrammeId;
      classId: string;
      studentIds: string[];
    }) => {
      if (!canMarkAttendanceForClass(rawDb, portal, params.classId)) {
        toast.error("You do not have permission to mark attendance for this class.");
        return;
      }
      setRawDb((prev) => {
        const cls = prev.classes.find((c) => c.id === params.classId);
        const nextMap = new Map(prev.attendance.map((a) => [a.id, a]));
        params.studentIds.forEach((studentId) => {
          const id = `${params.date}_${params.programmeId}_${params.classId}_${studentId}`;
          nextMap.set(id, {
            id,
            date: params.date,
            session: params.session,
            term: params.term,
            programmeId: params.programmeId,
            classId: params.classId,
            studentId,
            status: "Present",
          });
        });
        const audit = makeAuditEntry({
          portal,
          category: "attendance",
          action: "Marked Entire Class Present",
          targetLabel: `${cls?.name ?? params.classId} (${params.date})`,
          oldValue: `${params.studentIds.length} students`,
          newValue: `All ${params.studentIds.length} marked Present`,
        });
        return {
          ...prev,
          attendance: Array.from(nextMap.values()),
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [rawDb, portal]
  );

  const upsertFeeItem = useCallback(
    (item: FeeScheduleItem) => {
      if (!canManageFees(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can edit fee schedules.");
        return;
      }
      setRawDb((prev) => {
        const exists = prev.feeItems.some((f) => f.id === item.id);
        return {
          ...prev,
          feeItems: exists
            ? prev.feeItems.map((f) => (f.id === item.id ? item : f))
            : [...prev.feeItems, item],
        };
      });
    },
    [portal]
  );

  const deleteFeeItem = useCallback(
    (id: string) => {
      if (!canManageFees(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can remove fee items.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        feeItems: prev.feeItems.filter((f) => f.id !== id),
      }));
    },
    [portal]
  );

  const recordFeePayment = useCallback(
    (params: {
      studentId: string;
      session: string;
      term: string;
      invoiceProgrammeId: "combined" | ProgrammeId;
      amount: number;
      method: PaymentMethod;
      confirmationStatus?: "Confirmed" | "Pending Confirmation" | undefined;
      reference?: string | undefined;
      date?: string | undefined;
      note?: string | undefined;
    }): FeePayment | null => {
      if (!canManageFees(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can record fee payments.");
        return null;
      }
      const year = Number(params.session.split("/")[0]) || 2026;
      const seq = rawDb.settings.nextReceiptSequence || rawDb.payments.length + 1;
      const receiptNumber = generateReceiptNumber(rawDb.settings.code, year, seq);
      const today = params.date ?? "2026-10-24";
      const confirmationStatus = params.confirmationStatus ?? "Confirmed";

      const payment: FeePayment = {
        id: `pay-${Date.now()}`,
        receiptNumber,
        studentId: params.studentId,
        session: params.session,
        term: params.term,
        invoiceProgrammeId: params.invoiceProgrammeId,
        amount: params.amount,
        method: params.method,
        confirmationStatus,
        reference:
          params.reference?.trim() ||
          `${params.method.toUpperCase().replace(/\s+/g, "").slice(0, 4)}-${seq}-${Date.now().toString().slice(-4)}`,
        date: today,
        recordedBy: portal.displayName,
        confirmedBy:
          confirmationStatus === "Confirmed" ? portal.displayName : undefined,
        note: params.note,
      };

      setRawDb((prev) => {
        const stu = prev.students.find((s) => s.id === params.studentId);
        const audit = makeAuditEntry({
          portal,
          category: "payment",
          action: `Recorded ${params.method} Fee Payment`,
          targetLabel: `${stu?.fullName ?? params.studentId} (${receiptNumber})`,
          oldValue: "—",
          newValue: `${formatCurrency(params.amount, prev.settings.currencySymbol)} via ${params.method} (${confirmationStatus})`,
        });
        return {
          ...prev,
          payments: [payment, ...prev.payments],
          settings: {
            ...prev.settings,
            nextReceiptSequence:
              (prev.settings.nextReceiptSequence || prev.payments.length + 1) + 1,
          },
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return payment;
    },
    [rawDb, portal]
  );

  // Parent or Bursar submits Bank Transfer awaiting Bursar confirmation
  const submitParentBankTransfer = useCallback(
    (params: {
      studentId: string;
      session: string;
      term: string;
      invoiceProgrammeId: "combined" | ProgrammeId;
      amount: number;
      reference: string;
      note?: string | undefined;
    }): FeePayment | null => {
      // Ensure parent can only submit for their own linked child
      if (portal.role === "parent") {
        const allowed = scopedDb.students.some((s) => s.id === params.studentId);
        if (!allowed) {
          toast.error("You can only submit payment references for your own child.");
          return null;
        }
      } else if (!canManageFees(portal)) {
        toast.error("Permission denied.");
        return null;
      }

      const year = Number(params.session.split("/")[0]) || 2026;
      const seq = rawDb.settings.nextReceiptSequence || rawDb.payments.length + 1;
      const receiptNumber = generateReceiptNumber(rawDb.settings.code, year, seq);

      const payment: FeePayment = {
        id: `pay-${Date.now()}`,
        receiptNumber,
        studentId: params.studentId,
        session: params.session,
        term: params.term,
        invoiceProgrammeId: params.invoiceProgrammeId,
        amount: params.amount,
        method: "Bank Transfer",
        confirmationStatus: "Pending Confirmation",
        reference: params.reference.trim() || `TRF-${Date.now().toString().slice(-6)}`,
        date: "2026-10-24",
        recordedBy: `${portal.displayName} (${portal.role === "parent" ? "Parent Portal" : "Bursary"})`,
        note: params.note ?? "Bank transfer submitted — awaiting bursar confirmation",
      };

      setRawDb((prev) => {
        const stu = prev.students.find((s) => s.id === params.studentId);
        const audit = makeAuditEntry({
          portal,
          category: "payment",
          action: "Submitted Bank Transfer for Confirmation",
          targetLabel: `${stu?.fullName ?? params.studentId} (Ref: ${payment.reference})`,
          oldValue: "Pending",
          newValue: `${formatCurrency(params.amount, prev.settings.currencySymbol)} awaiting confirmation`,
        });
        return {
          ...prev,
          payments: [payment, ...prev.payments],
          settings: {
            ...prev.settings,
            nextReceiptSequence:
              (prev.settings.nextReceiptSequence || prev.payments.length + 1) + 1,
          },
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      return payment;
    },
    [portal, scopedDb.students, rawDb]
  );

  // Bursar / Admin 1-click Bank Transfer Confirmation
  const confirmBankTransfer = useCallback(
    (paymentId: string) => {
      if (!canManageFees(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can confirm bank transfers.");
        return;
      }
      setRawDb((prev) => {
        const target = prev.payments.find((p) => p.id === paymentId);
        if (!target) return prev;
        const stu = prev.students.find((s) => s.id === target.studentId);
        const audit = makeAuditEntry({
          portal,
          category: "payment",
          action: "Confirmed Manual Bank Transfer",
          targetLabel: `${stu?.fullName ?? target.studentId} (${target.receiptNumber})`,
          oldValue: "Pending Confirmation",
          newValue: `Confirmed (${formatCurrency(target.amount, prev.settings.currencySymbol)} • Ref ${target.reference})`,
        });
        return {
          ...prev,
          payments: prev.payments.map((p) =>
            p.id === paymentId
              ? {
                  ...p,
                  confirmationStatus: "Confirmed",
                  confirmedBy: portal.displayName,
                }
              : p
          ),
          auditLogs: [audit, ...prev.auditLogs],
        };
      });
    },
    [portal]
  );

  // SMS & WhatsApp Parent Notices Placeholder
  const sendParentNotice = useCallback(
    (params: {
      channel: "SMS" | "WhatsApp";
      audienceLabel: string;
      recipientCount: number;
      subject: string;
      message: string;
    }): ParentNoticeLog | null => {
      if (!canSendParentNotices(portal)) {
        toast.error("You do not have permission to send parent notices.");
        return null;
      }
      const entry: ParentNoticeLog = {
        id: `ntc-${Date.now()}`,
        sentAt: new Date().toISOString(),
        channel: params.channel,
        audienceLabel: params.audienceLabel,
        recipientCount: params.recipientCount,
        subject: params.subject,
        message: params.message,
        sentBy: portal.displayName,
        status: "Sent",
      };
      setRawDb((prev) => ({
        ...prev,
        parentNotices: [entry, ...prev.parentNotices],
        settings: {
          ...prev.settings,
          smsCreditsBalance:
            params.channel === "SMS"
              ? Math.max(
                  0,
                  prev.settings.smsCreditsBalance - params.recipientCount
                )
              : prev.settings.smsCreditsBalance,
        },
      }));
      return entry;
    },
    [portal]
  );

  const upsertStaffMember = useCallback(
    (staff: StaffMember) => {
      if (!canManagePayroll(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can manage staff records.");
        return;
      }
      setRawDb((prev) => {
        const exists = prev.staff.some((s) => s.id === staff.id);
        return {
          ...prev,
          staff: exists
            ? prev.staff.map((s) => (s.id === staff.id ? staff : s))
            : [...prev.staff, staff],
        };
      });
    },
    [portal]
  );

  const deleteStaffMember = useCallback(
    (id: string) => {
      if (!canManageSettings(portal)) {
        toast.error("Only the Proprietor / Admin can remove staff records.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        staff: prev.staff.filter((s) => s.id !== id),
      }));
    },
    [portal]
  );

  const generateMonthlyPayroll = useCallback(
    (monthKey: string, monthLabel: string): number => {
      if (!canManagePayroll(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can generate payroll.");
        return 0;
      }
      let createdCount = 0;
      setRawDb((prev) => {
        const existingIds = new Set(prev.payroll.map((p) => p.id));
        const newEntries: PayrollRecord[] = [];

        prev.staff
          .filter(
            (s) =>
              s.status === "Active" &&
              (prev.settings.enableQuranModule || s.systemRole !== "muallim")
          )
          .forEach((stf) => {
            const id = `${monthKey}_${stf.id}`;
            if (existingIds.has(id)) return;
            const { grossAdditions, totalDeductions, netSalary } =
              computeStaffCompensation(stf.salary);
            createdCount += 1;
            newEntries.push({
              id,
              monthKey,
              monthLabel,
              session: prev.settings.currentSession,
              term: prev.settings.currentTerm,
              staffId: stf.id,
              baseSalary: stf.salary.baseSalary,
              teachingAllowance: stf.salary.teachingAllowance,
              overtime: stf.salary.overtime,
              transport: stf.salary.transport,
              absenceFines: stf.salary.absenceFines,
              pension: stf.salary.pension,
              salaryAdvanceRepayment: stf.salary.salaryAdvanceRepayment,
              grossAdditions,
              totalDeductions,
              netSalary,
              status: "Pending",
              paymentReference: "",
            });
          });

        return {
          ...prev,
          payroll: [...newEntries, ...prev.payroll],
        };
      });
      return createdCount;
    },
    [portal]
  );

  const updatePayrollRecord = useCallback(
    (record: PayrollRecord) => {
      if (!canManagePayroll(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can edit payroll.");
        return;
      }
      const { grossAdditions, totalDeductions, netSalary } =
        computeStaffCompensation({
          baseSalary: record.baseSalary,
          teachingAllowance: record.teachingAllowance,
          overtime: record.overtime,
          transport: record.transport,
          absenceFines: record.absenceFines,
          pension: record.pension,
          salaryAdvanceRepayment: record.salaryAdvanceRepayment,
        });
      const recalculated: PayrollRecord = {
        ...record,
        grossAdditions,
        totalDeductions,
        netSalary,
      };
      setRawDb((prev) => ({
        ...prev,
        payroll: prev.payroll.map((p) =>
          p.id === record.id ? recalculated : p
        ),
      }));
    },
    [portal]
  );

  const markPayrollPaidStatus = useCallback(
    (payrollId: string, status: "Paid" | "Pending", reference?: string) => {
      if (!canManagePayroll(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can mark payroll status.");
        return;
      }
      setRawDb((prev) => ({
        ...prev,
        payroll: prev.payroll.map((p) => {
          if (p.id !== payrollId) return p;
          return {
            ...p,
            status,
            paymentReference:
              status === "Paid"
                ? reference?.trim() ||
                  p.paymentReference ||
                  `NIP/${prev.settings.code}/20261024/${p.staffId.toUpperCase()}`
                : "",
            paidDate: status === "Paid" ? "2026-10-24" : undefined,
          };
        }),
      }));
    },
    [portal]
  );

  const markAllMonthPayrollPaid = useCallback(
    (monthKey: string): number => {
      if (!canManagePayroll(portal)) {
        toast.error("Only the Proprietor / Admin or Bursar can disburse payroll.");
        return 0;
      }
      let count = 0;
      setRawDb((prev) => ({
        ...prev,
        payroll: prev.payroll.map((p, idx) => {
          if (p.monthKey !== monthKey || p.status === "Paid") return p;
          count += 1;
          return {
            ...p,
            status: "Paid",
            paymentReference:
              p.paymentReference ||
              `NIP/${prev.settings.code}/${monthKey.replace("-", "")}/0${idx + 1}`,
            paidDate: "2026-10-24",
          };
        }),
      }));
      return count;
    },
    [portal]
  );

  const applyGradeAutoCommentsToClass = useCallback(
    (params: {
      classId: string;
      programmeId: ProgrammeId;
      session: string;
      term: string;
    }): number => {
      if (portal.role !== "admin" && portal.role !== "class_teacher") {
        toast.error("Only Admin or the assigned Class Teacher can update remarks.");
        return 0;
      }
      if (portal.role === "class_teacher") {
        const myStaff = rawDb.staff.find((s) => s.id === portal.staffId);
        if (!myStaff?.assignedClassIds.includes(params.classId)) {
          toast.error("You can only generate remarks for your assigned class.");
          return 0;
        }
      }

      const customization = getResolvedCustomization(rawDb.settings);
      const broadsheet = computeClassBroadsheet({
        students: rawDb.students,
        subjects: rawDb.subjects,
        scores: rawDb.scores,
        settings: rawDb.settings,
        classId: params.classId,
        programmeId: params.programmeId,
        session: params.session,
        term: params.term,
      });

      let updatedCount = 0;
      setRawDb((prev) => {
        const nextAffective = [...prev.affective];
        for (const row of broadsheet) {
          const gradeKey = normalizeGradeKey(row.overallGrade);
          if (!gradeKey) continue;
          const rule = customization.autoComments.rules[gradeKey];
          const formattedTeacher = formatAutoCommentTemplate(
            rule.teacherComment,
            {
              studentName: row.student.fullName,
              averagePercentage: row.averagePercentage,
              grade: row.overallGrade,
            }
          );
          const formattedPrincipal = formatAutoCommentTemplate(
            rule.principalComment,
            {
              studentName: row.student.fullName,
              averagePercentage: row.averagePercentage,
              grade: row.overallGrade,
            }
          );

          const existingIdx = nextAffective.findIndex(
            (a) =>
              a.studentId === row.student.id &&
              a.session === params.session &&
              a.term === params.term
          );

          if (existingIdx >= 0) {
            const cur = nextAffective[existingIdx]!;
            nextAffective[existingIdx] = {
              ...cur,
              classTeacherRemark: formattedTeacher,
              headTeacherRemark:
                portal.role === "admin"
                  ? formattedPrincipal
                  : cur.headTeacherRemark,
            };
          } else {
            nextAffective.push({
              id: `${row.student.id}_${params.session}_${params.term}`,
              studentId: row.student.id,
              session: params.session,
              term: params.term,
              punctuality: 5,
              neatness: 5,
              politeness: 5,
              honesty: 5,
              classTeacherRemark: formattedTeacher,
              headTeacherRemark:
                portal.role === "admin"
                  ? formattedPrincipal
                  : "Good term progress. Keep working hard.",
            });
          }
          updatedCount += 1;
        }

        if (updatedCount === 0) return prev;
        const clsName =
          prev.classes.find((c) => c.id === params.classId)?.name ??
          params.classId;
        return {
          ...prev,
          affective: nextAffective,
          auditLogs: [
            makeAuditEntry({
              portal,
              category: "score",
              action: "Auto-Filled Remarks by Grade (A–F)",
              targetLabel: `${clsName} • ${params.session} (${params.term})`,
              oldValue: "Previous remarks",
              newValue: `${updatedCount} student remarks generated`,
            }),
            ...prev.auditLogs,
          ],
        };
      });

      return updatedCount;
    },
    [portal, rawDb]
  );

  const downloadCompleteBackup = useCallback((): BackupEnvelope | null => {
    if (!canManageSettings(portal)) {
      toast.error("Only the Proprietor / Admin can download a full school backup.");
      return null;
    }
    const nowIso = new Date().toISOString();
    const stampedDb: SchoolDatabaseSnapshot = {
      ...rawDb,
      settings: {
        ...rawDb.settings,
        customization: {
          ...getResolvedCustomization(rawDb.settings),
          lastExternalBackupAt: nowIso,
        },
      },
      auditLogs: [
        makeAuditEntry({
          portal,
          category: "settings",
          action: "Downloaded Full School Backup",
          targetLabel: rawDb.settings.name,
          oldValue: "—",
          newValue: `${rawDb.students.length} students • ${rawDb.scores.length} scores`,
        }),
        ...rawDb.auditLogs,
      ],
    };
    setRawDb(stampedDb);
    return downloadFullSchoolBackup(stampedDb);
  }, [portal, rawDb]);

  const createManualSnapshot = useCallback(
    async (label: string): Promise<LocalSnapshotRecord | null> => {
      if (!canManageSettings(portal)) {
        toast.error("Only the Proprietor / Admin can create restore points.");
        return null;
      }
      const snap = await createLocalSnapshot(rawDb, label);
      return snap;
    },
    [portal, rawDb]
  );

  const restoreFromBackupSnapshot = useCallback(
    async (
      incomingSnapshot: SchoolDatabaseSnapshot,
      sourceLabel: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!canManageSettings(portal)) {
        return {
          ok: false,
          error: "Only the Proprietor / Admin can restore a school backup.",
        };
      }
      // Save automatic pre-restore safety snapshot first!
      await createLocalSnapshot(
        rawDb,
        `Auto-Safety Before Restore (${new Date().toLocaleTimeString()})`
      );

      const auditEntry = makeAuditEntry({
        portal,
        category: "settings",
        action: "Restored School Backup",
        targetLabel: incomingSnapshot.settings.name,
        oldValue: `${rawDb.settings.name} (${rawDb.students.length} students)`,
        newValue: `${sourceLabel} (${incomingSnapshot.students.length} students)`,
      });

      const restoredDb: SchoolDatabaseSnapshot = {
        ...incomingSnapshot,
        version: 3,
        auditLogs: [auditEntry, ...(incomingSnapshot.auditLogs ?? [])],
      };

      setRawDb(restoredDb);
      const nextPortal = buildPortalSessionForRole("admin", restoredDb, {
        isAuthenticated: true,
      });
      persistPortal(nextPortal);
      return { ok: true };
    },
    [portal, rawDb, persistPortal]
  );

  const value = useMemo<SchoolOSContextValue>(
    () => ({
      db: scopedDb,
      hydrated,
      portal,
      onboardingWizardOpen,
      setOnboardingWizardOpen,
      completeSchoolOnboarding,
      activeNav,
      setActiveNav,
      registeredSchools,
      loginProductionStaff,
      loginProductionParent,
      logoutSession,
      portalVideoGuideOpen,
      setPortalVideoGuideOpen,
      setupWizardOpen,
      setSetupWizardOpen,
      printJob,
      openPrintPreview,
      closePrintPreview,
      updateSettings,
      upsertClassGroup,
      deleteClassGroup,
      upsertSubject,
      deleteSubject,
      upsertTeachingGroup,
      deleteTeachingGroup,
      upsertExamPaper,
      submitExamPaperToOfficer,
      reviewExamPaper,
      deleteExamPaper,
      upsertStudent,
      transferStudentClass,
      deleteStudent,
      runEndOfSessionPromotion,
      updateScoreCell,
      setTermResultStatus,
      reviewPendingScoreEdit,
      upsertQuranRecord,
      upsertAffectiveRating,
      applyGradeAutoCommentsToClass,
      downloadCompleteBackup,
      createManualSnapshot,
      restoreFromBackupSnapshot,
      setAttendanceStatus,
      markClassAllPresent,
      upsertFeeItem,
      deleteFeeItem,
      recordFeePayment,
      submitParentBankTransfer,
      confirmBankTransfer,
      sendParentNotice,
      upsertStaffMember,
      deleteStaffMember,
      generateMonthlyPayroll,
      updatePayrollRecord,
      markPayrollPaidStatus,
      markAllMonthPayrollPaid,
    }),
    [
      scopedDb,
      hydrated,
      portal,
      onboardingWizardOpen,
      completeSchoolOnboarding,
      activeNav,
      setActiveNav,
      registeredSchools,
      loginProductionStaff,
      loginProductionParent,
      logoutSession,
      portalVideoGuideOpen,
      setupWizardOpen,
      printJob,
      openPrintPreview,
      closePrintPreview,
      updateSettings,
      upsertClassGroup,
      deleteClassGroup,
      upsertSubject,
      deleteSubject,
      upsertTeachingGroup,
      deleteTeachingGroup,
      upsertExamPaper,
      submitExamPaperToOfficer,
      reviewExamPaper,
      deleteExamPaper,
      upsertStudent,
      transferStudentClass,
      deleteStudent,
      runEndOfSessionPromotion,
      updateScoreCell,
      setTermResultStatus,
      reviewPendingScoreEdit,
      upsertQuranRecord,
      upsertAffectiveRating,
      applyGradeAutoCommentsToClass,
      downloadCompleteBackup,
      createManualSnapshot,
      restoreFromBackupSnapshot,
      setAttendanceStatus,
      markClassAllPresent,
      upsertFeeItem,
      deleteFeeItem,
      recordFeePayment,
      submitParentBankTransfer,
      confirmBankTransfer,
      sendParentNotice,
      upsertStaffMember,
      deleteStaffMember,
      generateMonthlyPayroll,
      updatePayrollRecord,
      markPayrollPaidStatus,
      markAllMonthPayrollPaid,
    ]
  );

  return (
    <SchoolOSContext.Provider value={value}>{children}</SchoolOSContext.Provider>
  );
}

export function useOptionalSchoolOS(): SchoolOSContextValue | null {
  return useContext(SchoolOSContext);
}

export function useSchoolOS(): SchoolOSContextValue {
  const ctx = useContext(SchoolOSContext);
  if (!ctx) {
    throw new Error("useSchoolOS must be used within a SchoolOSProvider");
  }
  return ctx;
}
