import { normalizePhoneKey } from "./calculations";
import type {
  ActivePortalSession,
  NavSectionId,
  ProgrammeId,
  SchoolDatabaseSnapshot,
  StaffMember,
  Student,
  SubjectTeachingGroup,
  TermResultControl,
  UserRole,
} from "@/types/school";

/**
 * Strict Data-Layer Role-Based Access Control (RBAC)
 * Enforced on EVERY read (`getAuthorizedSnapshot`) and EVERY write (`assert...` / `can...`).
 * Restricted users never receive unauthorized classes, students, scores, fees, payroll,
 * exam papers, or audit logs in menus, search, dashboards, exports, print views, or URLs.
 */

export function getActiveProgrammeIds(db: SchoolDatabaseSnapshot): ProgrammeId[] {
  if (!db.settings.multiProgrammeEnabled) {
    const mainId = db.settings.programmes[0]?.id ?? "prog-main";
    return [mainId];
  }
  return db.settings.programmes.map((p) => p.id);
}

export function getStaffForPortal(
  rawDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession
): StaffMember | undefined {
  if (!portal.staffId) return undefined;
  return rawDb.staff.find((s) => s.id === portal.staffId);
}

/**
 * Returns true if the current portal session is the Admin, a dedicated Exam Officer,
 * or a staff member granted Exam Officer duty (`isExamOfficer: true`).
 */
export function hasExamOfficerPrivileges(
  rawDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession
): boolean {
  if (portal.role === "admin" || portal.role === "exam_officer") return true;
  if (portal.isExamOfficer) return true;
  const staffMember = getStaffForPortal(rawDb, portal);
  return Boolean(staffMember?.isExamOfficer);
}

export function isStudentInAnyClass(
  student: Student,
  allowedClassIds: Set<string>,
  activeProgrammeIds: Set<string>
): boolean {
  return Object.entries(student.programmeClasses).some(
    ([progId, classId]) =>
      activeProgrammeIds.has(progId) &&
      Boolean(classId) &&
      allowedClassIds.has(classId)
  );
}

export function getTermControl(
  rawDb: SchoolDatabaseSnapshot,
  session: string,
  term: string
): TermResultControl {
  const id = `${session}__${term}`;
  const found = rawDb.termLocks.find(
    (t) => t.id === id || (t.session === session && t.term === term)
  );
  return (
    found ?? {
      id,
      session,
      term,
      isPublished: false,
      isLocked: false,
    }
  );
}

export function getAllowedNavSections(
  role: UserRole,
  enableQuranModule: boolean,
  isExamOfficerDuty = false
): NavSectionId[] {
  switch (role) {
    case "admin":
      return [
        "overview",
        "students",
        "classes",
        "academics",
        "exams",
        "attendance",
        "fees",
        "notices",
        "staff",
        "audit",
        "customize",
        "backups",
        "settings",
      ];
    case "exam_officer":
      return [
        "overview",
        "students",
        "classes",
        "academics",
        "exams",
        "attendance",
        "backups",
      ];
    case "class_teacher":
      return isExamOfficerDuty
        ? [
            "overview",
            "students",
            "classes",
            "academics",
            "exams",
            "attendance",
            "backups",
          ]
        : [
            "overview",
            "students",
            "classes",
            "academics",
            "exams",
            "attendance",
          ];
    case "subject_teacher":
      return isExamOfficerDuty
        ? [
            "overview",
            "students",
            "classes",
            "academics",
            "exams",
            "attendance",
            "backups",
          ]
        : ["overview", "academics", "exams"];
    case "bursar":
      return ["overview", "students", "fees", "notices", "staff", "backups"];
    case "secretary":
      return [
        "overview",
        "students",
        "classes",
        "exams",
        "attendance",
        "notices",
        "backups",
      ];
    case "muallim":
      return enableQuranModule
        ? ["overview", "students", "classes", "academics", "exams", "attendance"]
        : ["overview"];
    case "parent":
      return ["overview"];
  }
}

function zeroStaffSalaries(staffList: StaffMember[]): StaffMember[] {
  return staffList.map((s) => ({
    ...s,
    salary: {
      baseSalary: 0,
      teachingAllowance: 0,
      overtime: 0,
      transport: 0,
      absenceFines: 0,
      pension: 0,
      salaryAdvanceRepayment: 0,
    },
  }));
}

function getTeacherAssignedGroups(
  allGroups: SubjectTeachingGroup[],
  staffMember: StaffMember | undefined,
  allowedSubjectIds: Set<string>
): SubjectTeachingGroup[] {
  if (!staffMember) return [];
  return allGroups.filter(
    (g) =>
      g.teacherStaffId === staffMember.id ||
      (!g.teacherStaffId && allowedSubjectIds.has(g.subjectId))
  );
}

/**
 * Filters the entire database snapshot at the data layer BEFORE any UI component,
 * dropdown, search bar, dashboard metric, CSV/Excel/Word export, or print view can read it.
 */
export function getAuthorizedSnapshot(
  rawDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession
): SchoolDatabaseSnapshot {
  const activeProgSet = new Set(getActiveProgrammeIds(rawDb));
  const quranEnabled = Boolean(rawDb.settings.enableQuranModule);
  const allTeachingGroups = (rawDb.teachingGroups ?? []).filter((g) =>
    activeProgSet.has(g.programmeId)
  );
  const allExamPapers = (rawDb.examPapers ?? []).filter((ep) =>
    activeProgSet.has(ep.programmeId)
  );

  // Filter classes & subjects by active programmes first
  const progFilteredClasses = rawDb.classes.filter((c) =>
    activeProgSet.has(c.programmeId)
  );
  const progFilteredSubjects = rawDb.subjects.filter((s) =>
    activeProgSet.has(s.programmeId)
  );
  const progFilteredStaff = quranEnabled
    ? rawDb.staff
    : rawDb.staff.filter((s) => s.systemRole !== "muallim");
  const progFilteredStaffIdSet = new Set(progFilteredStaff.map((s) => s.id));
  const progFilteredPayroll = quranEnabled
    ? rawDb.payroll
    : rawDb.payroll.filter((p) => progFilteredStaffIdSet.has(p.staffId));

  // 1. Proprietor / Admin: full school access
  if (portal.role === "admin") {
    return {
      ...rawDb,
      classes: progFilteredClasses,
      subjects: progFilteredSubjects,
      staff: progFilteredStaff,
      payroll: progFilteredPayroll,
      quranRecords: quranEnabled ? rawDb.quranRecords : [],
      teachingGroups: allTeachingGroups,
      examPapers: allExamPapers,
    };
  }

  // 1B. Dedicated Exam Officer OR Teacher with Exam Officer Duty:
  // Full visibility across ALL classes' students, scores, broadsheets, report cards,
  // and exam question papers for moderation & printing — ZERO access to fees or salaries!
  if (
    portal.role === "exam_officer" ||
    hasExamOfficerPrivileges(rawDb, portal)
  ) {
    return {
      ...rawDb,
      classes: progFilteredClasses,
      subjects: progFilteredSubjects,
      auditLogs: [],
      quranRecords: quranEnabled ? rawDb.quranRecords : [],
      feeItems: [],
      payments: [],
      staff: zeroStaffSalaries(progFilteredStaff),
      payroll: [],
      teachingGroups: allTeachingGroups,
      examPapers: allExamPapers,
    };
  }

  // 2. Class Teacher OR Mu'allim: ONLY assigned classes (plus any combined teaching groups)
  if (portal.role === "class_teacher" || portal.role === "muallim") {
    const staffMember = getStaffForPortal(rawDb, portal);
    const assignedClassSet = new Set(staffMember?.assignedClassIds ?? []);
    const myGroups = allTeachingGroups.filter(
      (g) => g.teacherStaffId === staffMember?.id
    );
    myGroups.forEach((g) => g.classIds.forEach((cid) => assignedClassSet.add(cid)));

    const groupStudentIds = new Set<string>();
    myGroups.forEach((g) => g.studentIds.forEach((sid) => groupStudentIds.add(sid)));

    const allowedStudents = rawDb.students.filter(
      (stu) =>
        isStudentInAnyClass(stu, assignedClassSet, activeProgSet) ||
        groupStudentIds.has(stu.id)
    );
    const allowedStudentIdSet = new Set(allowedStudents.map((s) => s.id));

    // Also include home classes of gathered group students so their class badge resolves cleanly
    allowedStudents.forEach((stu) => {
      Object.entries(stu.programmeClasses).forEach(([pid, cid]) => {
        if (activeProgSet.has(pid) && cid) assignedClassSet.add(cid);
      });
    });

    const allowedClasses = progFilteredClasses.filter((c) =>
      assignedClassSet.has(c.id)
    );
    const allowedClassIdSet = new Set(allowedClasses.map((c) => c.id));
    const allowedProgSetForTeacher = new Set(
      allowedClasses.map((c) => c.programmeId)
    );

    const myExamPapers = allExamPapers.filter(
      (ep) =>
        ep.submittedByStaffId === staffMember?.id ||
        ep.classIds.some((cid) => allowedClassIdSet.has(cid))
    );

    return {
      ...rawDb,
      classes: allowedClasses,
      subjects: progFilteredSubjects.filter((sub) =>
        allowedProgSetForTeacher.has(sub.programmeId)
      ),
      students: allowedStudents,
      scores: rawDb.scores.filter(
        (sc) =>
          allowedClassIdSet.has(sc.classId) &&
          allowedStudentIdSet.has(sc.studentId)
      ),
      pendingScoreEdits: rawDb.pendingScoreEdits.filter((req) =>
        allowedClassIdSet.has(req.classId)
      ),
      auditLogs: [],
      quranRecords: quranEnabled
        ? rawDb.quranRecords.filter((q) => allowedStudentIdSet.has(q.studentId))
        : [],
      affective: rawDb.affective.filter((a) =>
        allowedStudentIdSet.has(a.studentId)
      ),
      attendance: rawDb.attendance.filter(
        (att) =>
          allowedClassIdSet.has(att.classId) &&
          allowedStudentIdSet.has(att.studentId)
      ),
      feeItems: [],
      payments: [],
      parentNotices: [],
      staff: staffMember ? [staffMember] : [],
      payroll: [],
      teachingGroups: myGroups,
      examPapers: myExamPapers,
    };
  }

  // 3. Subject Teacher: ONLY assigned classes/combined groups AND ONLY assigned subjects' scores & exam papers!
  if (portal.role === "subject_teacher") {
    const staffMember = getStaffForPortal(rawDb, portal);
    const assignedClassSet = new Set(staffMember?.assignedClassIds ?? []);
    const assignedSubjectSet = new Set(staffMember?.assignedSubjectIds ?? []);

    const allowedSubjects = progFilteredSubjects.filter((sub) =>
      assignedSubjectSet.has(sub.id)
    );
    const allowedSubjectIdSet = new Set(allowedSubjects.map((s) => s.id));

    const myGroups = getTeacherAssignedGroups(
      allTeachingGroups,
      staffMember,
      allowedSubjectIdSet
    );
    const groupStudentIds = new Set<string>();
    myGroups.forEach((g) => {
      g.classIds.forEach((cid) => assignedClassSet.add(cid));
      g.studentIds.forEach((sid) => groupStudentIds.add(sid));
    });

    const allowedStudents = rawDb.students.filter(
      (stu) =>
        isStudentInAnyClass(stu, assignedClassSet, activeProgSet) ||
        groupStudentIds.has(stu.id)
    );
    const allowedStudentIdSet = new Set(allowedStudents.map((s) => s.id));

    // Include home classes of any cross-class students gathered in a Combined Teaching Group
    // so recording scores once in the combined sheet routes directly to each student's home class!
    allowedStudents.forEach((stu) => {
      Object.entries(stu.programmeClasses).forEach(([pid, cid]) => {
        if (activeProgSet.has(pid) && cid) {
          assignedClassSet.add(cid);
        }
      });
    });

    const allowedClasses = progFilteredClasses.filter((c) =>
      assignedClassSet.has(c.id)
    );
    const allowedClassIdSet = new Set(allowedClasses.map((c) => c.id));

    const myExamPapers = allExamPapers.filter(
      (ep) =>
        ep.submittedByStaffId === staffMember?.id ||
        (allowedSubjectIdSet.has(ep.subjectId) &&
          ep.classIds.some((cid) => allowedClassIdSet.has(cid)))
    );

    return {
      ...rawDb,
      classes: allowedClasses,
      subjects: allowedSubjects,
      students: allowedStudents,
      scores: rawDb.scores.filter(
        (sc) =>
          allowedClassIdSet.has(sc.classId) &&
          allowedSubjectIdSet.has(sc.subjectId) &&
          allowedStudentIdSet.has(sc.studentId)
      ),
      pendingScoreEdits: rawDb.pendingScoreEdits.filter(
        (req) =>
          allowedClassIdSet.has(req.classId) &&
          allowedSubjectIdSet.has(req.subjectId)
      ),
      auditLogs: [],
      quranRecords: [],
      affective: [],
      attendance: [],
      feeItems: [],
      payments: [],
      parentNotices: [],
      staff: staffMember ? [staffMember] : [],
      payroll: [],
      teachingGroups: myGroups,
      examPapers: myExamPapers,
    };
  }

  // 4. Bursar / Accountant: Fees, Receipts, Debtors, Payroll; NO score editing or exam papers
  if (portal.role === "bursar") {
    return {
      ...rawDb,
      classes: progFilteredClasses,
      subjects: progFilteredSubjects,
      scores: [],
      pendingScoreEdits: [],
      auditLogs: [],
      quranRecords: [],
      affective: [],
      attendance: [],
      staff: progFilteredStaff,
      payroll: progFilteredPayroll,
      teachingGroups: [],
      examPapers: [],
    };
  }

  // 5. Secretary: Student records, Attendance, Notices & Approved Exam Paper Printing; NO fees, payroll, or unapproved drafts
  if (portal.role === "secretary") {
    return {
      ...rawDb,
      classes: progFilteredClasses,
      subjects: progFilteredSubjects,
      pendingScoreEdits: [],
      auditLogs: [],
      quranRecords: quranEnabled ? rawDb.quranRecords : [],
      feeItems: [],
      payments: [],
      staff: zeroStaffSalaries(progFilteredStaff),
      payroll: [],
      teachingGroups: [],
      examPapers: allExamPapers.filter((ep) => ep.status === "approved"),
    };
  }

  // 6. Parent: ONLY their own linked children! ZERO exam question papers!
  const targetPhoneKey = normalizePhoneKey(portal.parentPhone ?? "");
  const myChildren = rawDb.students.filter(
    (s) =>
      targetPhoneKey.length >= 7 &&
      normalizePhoneKey(s.parentPhone) === targetPhoneKey
  );
  const childIdSet = new Set(myChildren.map((c) => c.id));
  const childClassIdSet = new Set<string>();
  myChildren.forEach((child) => {
    Object.entries(child.programmeClasses).forEach(([progId, cid]) => {
      if (activeProgSet.has(progId) && cid) {
        childClassIdSet.add(cid);
      }
    });
  });

  return {
    ...rawDb,
    classes: progFilteredClasses.filter((c) => childClassIdSet.has(c.id)),
    subjects: progFilteredSubjects,
    students: myChildren,
    scores: rawDb.scores.filter((sc) => childIdSet.has(sc.studentId)),
    pendingScoreEdits: [],
    auditLogs: [],
    quranRecords: quranEnabled
      ? rawDb.quranRecords.filter((q) => childIdSet.has(q.studentId))
      : [],
    affective: rawDb.affective.filter((a) => childIdSet.has(a.studentId)),
    attendance: rawDb.attendance.filter((att) => childIdSet.has(att.studentId)),
    feeItems: rawDb.feeItems.filter((f) => activeProgSet.has(f.programmeId)),
    payments: rawDb.payments.filter((p) => childIdSet.has(p.studentId)),
    parentNotices: [],
    staff: [],
    payroll: [],
    teachingGroups: [],
    examPapers: [],
  };
}

/**
 * Data-Layer Write Permission Checks
 */
export function canManageSettings(portal: ActivePortalSession): boolean {
  return portal.role === "admin";
}

export function canManageResultLocks(
  portal: ActivePortalSession,
  rawDb?: SchoolDatabaseSnapshot
): boolean {
  if (portal.role === "admin" || portal.role === "exam_officer") return true;
  if (rawDb && hasExamOfficerPrivileges(rawDb, portal)) return true;
  return Boolean(portal.isExamOfficer);
}

export function canManageStudents(portal: ActivePortalSession): boolean {
  return portal.role === "admin" || portal.role === "secretary";
}

export function canManageClassesAndSubjects(portal: ActivePortalSession): boolean {
  return portal.role === "admin";
}

export function canManageFees(portal: ActivePortalSession): boolean {
  return portal.role === "admin" || portal.role === "bursar";
}

export function canManageFeeWaivers(portal: ActivePortalSession): boolean {
  return portal.role === "admin";
}

export function canManagePayroll(portal: ActivePortalSession): boolean {
  return portal.role === "admin" || portal.role === "bursar";
}

export function canSendParentNotices(portal: ActivePortalSession): boolean {
  return (
    portal.role === "admin" ||
    portal.role === "bursar" ||
    portal.role === "secretary"
  );
}

export function canMarkAttendanceForClass(
  rawDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession,
  classId: string
): boolean {
  if (portal.role === "admin" || portal.role === "secretary") return true;
  if (portal.role === "class_teacher" || portal.role === "muallim") {
    const staffMember = getStaffForPortal(rawDb, portal);
    return Boolean(staffMember?.assignedClassIds.includes(classId));
  }
  return false;
}

export interface ScoreWriteDecision {
  allowed: boolean;
  mode: "direct" | "queued_for_approval" | "denied";
  reason?: string;
}

export function evaluateScoreWritePermission(
  rawDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession,
  params: {
    classId: string;
    subjectId: string;
    studentId?: string | undefined;
    session: string;
    term: string;
  }
): ScoreWriteDecision {
  const termControl = getTermControl(rawDb, params.session, params.term);

  // Admin or Exam Officer can moderate/enter scores across classes unless locked
  if (
    portal.role === "admin" ||
    portal.role === "exam_officer" ||
    hasExamOfficerPrivileges(rawDb, portal)
  ) {
    if (termControl.isLocked) {
      return {
        allowed: false,
        mode: "denied",
        reason: `${params.term} (${params.session}) results are locked. Unlock the term first to edit scores.`,
      };
    }
    return { allowed: true, mode: "direct" };
  }

  // Non-teaching roles can NEVER edit scores
  if (
    portal.role === "bursar" ||
    portal.role === "secretary" ||
    portal.role === "parent"
  ) {
    return {
      allowed: false,
      mode: "denied",
      reason: "Your role does not have permission to edit academic scores.",
    };
  }

  const staffMember = getStaffForPortal(rawDb, portal);
  if (!staffMember) {
    return {
      allowed: false,
      mode: "denied",
      reason: "Staff record not found.",
    };
  }

  // Check direct class assignment OR membership in a Combined Teaching Group for this subject
  const inDirectClass = staffMember.assignedClassIds.includes(params.classId);
  const inCombinedGroup = (rawDb.teachingGroups ?? []).some((g) => {
    const teacherMatches =
      g.teacherStaffId === staffMember.id ||
      (!g.teacherStaffId &&
        staffMember.assignedSubjectIds.includes(g.subjectId));
    if (!teacherMatches || g.subjectId !== params.subjectId) return false;
    return (
      g.classIds.includes(params.classId) ||
      (params.studentId ? g.studentIds.includes(params.studentId) : false)
    );
  });

  if (!inDirectClass && !inCombinedGroup) {
    return {
      allowed: false,
      mode: "denied",
      reason:
        "You can only enter scores for your assigned class or combined teaching group.",
    };
  }

  if (
    portal.role === "subject_teacher" &&
    !staffMember.assignedSubjectIds.includes(params.subjectId)
  ) {
    return {
      allowed: false,
      mode: "denied",
      reason: "You can only enter scores for your assigned subject.",
    };
  }

  if (termControl.isLocked) {
    return {
      allowed: false,
      mode: "denied",
      reason: `${params.term} results are locked by the Proprietor/Admin. Teachers cannot edit locked scores.`,
    };
  }

  if (termControl.isPublished) {
    return {
      allowed: true,
      mode: "queued_for_approval",
      reason:
        "This term's results are already published. Your score change has been sent to the Proprietor/Admin for approval.",
    };
  }

  return { allowed: true, mode: "direct" };
}

export function canPrintDocument(
  scopedDb: SchoolDatabaseSnapshot,
  portal: ActivePortalSession,
  job:
    | { type: "report_card"; studentId: string }
    | { type: "receipt"; paymentId: string }
    | { type: "broadsheet"; classId: string }
    | { type: "payslip"; payrollId: string }
    | { type: "exam_paper"; examPaperId: string }
    | { type: "marking_scheme"; examPaperId: string }
    | { type: "table" }
): boolean {
  const isOfficer =
    portal.role === "admin" ||
    portal.role === "exam_officer" ||
    Boolean(portal.isExamOfficer);

  switch (job.type) {
    case "report_card":
      return scopedDb.students.some((s) => s.id === job.studentId);
    case "receipt":
      return scopedDb.payments.some((p) => p.id === job.paymentId);
    case "broadsheet":
      if (
        !isOfficer &&
        (portal.role === "subject_teacher" || portal.role === "bursar")
      ) {
        return false;
      }
      return scopedDb.classes.some((c) => c.id === job.classId);
    case "payslip":
      return scopedDb.payroll.some((p) => p.id === job.payrollId);
    case "exam_paper":
      return (scopedDb.examPapers ?? []).some(
        (ep) => ep.id === job.examPaperId
      );
    case "marking_scheme":
      if (portal.role === "secretary" || portal.role === "parent") return false;
      return (scopedDb.examPapers ?? []).some(
        (ep) => ep.id === job.examPaperId
      );
    case "table":
      return true;
  }
}
