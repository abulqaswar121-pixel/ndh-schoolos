import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { RoleVideoTutorialPlayer } from "@/components/schoolos/tutorials/RoleVideoTutorialPlayer";
import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import {
  canManageFeeWaivers,
  canManageFees,
  canManagePayroll,
  canManageSettings,
  canManageStudents,
  canPrintDocument,
  evaluateScoreWritePermission,
  getAllowedNavSections,
  getAuthorizedSnapshot,
} from "@/services/accessControl";
import {
  computeClassBroadsheet,
  computeStaffCompensation,
  computeStudentInvoices,
  computeSubjectMarksheet,
} from "@/services/calculations";
import type { ActivePortalSession, SchoolDatabaseSnapshot } from "@/types/school";

function buildPopulatedTestDatabase(): SchoolDatabaseSnapshot {
  const db = createSeedDatabase();
  const jss1 = db.classes.find((c) => c.name === "JSS 1")!;
  const jss2 = db.classes.find((c) => c.name === "JSS 2")!;
  const eng = db.subjects.find((s) => s.code === "ENG")!;
  const math = db.subjects.find((s) => s.code === "MTH")!;

  db.settings.setupCompleted = true;
  db.settings.name = "Heritage Model Academy";

  db.staff = [
    {
      id: "stf-admin-1",
      staffCode: "ADM-001",
      fullName: "Alhaji Musa Bello",
      role: "Proprietor / Principal",
      systemRole: "admin",
      loginPin: "1111",
      phone: "08031110001",
      email: "admin@heritage.ng",
      bankName: "GTBank",
      accountNumber: "0123456789",
      assignedClassIds: [],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: "2026-09-01",
      salary: {
        baseSalary: 180000,
        teachingAllowance: 20000,
        overtime: 0,
        transport: 15000,
        absenceFines: 0,
        pension: 10000,
        salaryAdvanceRepayment: 5000,
      },
    },
    {
      id: "stf-ct-1",
      staffCode: "TCH-001",
      fullName: "Mrs. Ngozi Okafor",
      role: "Class Teacher",
      systemRole: "class_teacher",
      loginPin: "2222",
      phone: "08031110002",
      email: "ngozi@heritage.ng",
      bankName: "Access Bank",
      accountNumber: "0223456789",
      assignedClassIds: [jss1.id],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: "2026-09-01",
      salary: {
        baseSalary: 95000,
        teachingAllowance: 10000,
        overtime: 5000,
        transport: 10000,
        absenceFines: 2000,
        pension: 5000,
        salaryAdvanceRepayment: 0,
      },
    },
    {
      id: "stf-st-1",
      staffCode: "TCH-002",
      fullName: "Mr. Tunde Balogun",
      role: "Subject Teacher",
      systemRole: "subject_teacher",
      loginPin: "3333",
      phone: "08031110003",
      email: "tunde@heritage.ng",
      bankName: "Zenith Bank",
      accountNumber: "0323456789",
      assignedClassIds: [jss1.id, jss2.id],
      assignedSubjectIds: [math.id],
      status: "Active",
      joinedDate: "2026-09-01",
      salary: {
        baseSalary: 90000,
        teachingAllowance: 10000,
        overtime: 0,
        transport: 10000,
        absenceFines: 0,
        pension: 4500,
        salaryAdvanceRepayment: 0,
      },
    },
    {
      id: "stf-bur-1",
      staffCode: "BUR-001",
      fullName: "Mr. Ibrahim Danjuma",
      role: "Bursar / Accountant",
      systemRole: "bursar",
      loginPin: "4444",
      phone: "08031110004",
      email: "bursar@heritage.ng",
      bankName: "UBA",
      accountNumber: "0423456789",
      assignedClassIds: [],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: "2026-09-01",
      salary: {
        baseSalary: 110000,
        teachingAllowance: 0,
        overtime: 0,
        transport: 12000,
        absenceFines: 0,
        pension: 5500,
        salaryAdvanceRepayment: 0,
      },
    },
    {
      id: "stf-sec-1",
      staffCode: "SEC-001",
      fullName: "Miss Blessing Eze",
      role: "School Secretary",
      systemRole: "secretary",
      loginPin: "5555",
      phone: "08031110005",
      email: "secretary@heritage.ng",
      bankName: "First Bank",
      accountNumber: "0523456789",
      assignedClassIds: [],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: "2026-09-01",
      salary: {
        baseSalary: 75000,
        teachingAllowance: 0,
        overtime: 0,
        transport: 8000,
        absenceFines: 0,
        pension: 3500,
        salaryAdvanceRepayment: 0,
      },
    },
  ];

  db.students = [
    {
      id: "stu-1",
      admissionId: "HMA/2026/001",
      fullName: "Chinedu Nwosu",
      gender: "Male",
      dateOfBirth: "2014-04-12",
      bloodGroup: "O+",
      healthNotes: "None",
      homeAddress: "14 Sultan Abubakar Road",
      programmeClasses: { "prog-main": jss1.id },
      status: "Active",
      admissionDate: "2026-09-10",
      guardianName: "Engr. Emeka Nwosu",
      guardianRelationship: "Father",
      parentPhone: "08032114400",
      parentEmail: "emeka@example.com",
    },
    {
      id: "stu-2",
      admissionId: "HMA/2026/002",
      fullName: "Adaeze Nwosu",
      gender: "Female",
      dateOfBirth: "2013-02-18",
      bloodGroup: "A+",
      healthNotes: "None",
      homeAddress: "14 Sultan Abubakar Road",
      programmeClasses: { "prog-main": jss2.id },
      status: "Active",
      admissionDate: "2026-09-10",
      guardianName: "Engr. Emeka Nwosu",
      guardianRelationship: "Father",
      parentPhone: "08032114400",
      parentEmail: "emeka@example.com",
    },
    {
      id: "stu-3",
      admissionId: "HMA/2026/003",
      fullName: "Zainab Lawal",
      gender: "Female",
      dateOfBirth: "2014-08-05",
      bloodGroup: "B+",
      healthNotes: "None",
      homeAddress: "22 Ahmadu Bello Way",
      programmeClasses: { "prog-main": jss1.id },
      status: "Active",
      admissionDate: "2026-09-11",
      guardianName: "Hajiya Fatima Lawal",
      guardianRelationship: "Mother",
      parentPhone: "08059998877",
      parentEmail: "fatima@example.com",
    },
  ];

  db.feeItems = [
    {
      id: "fee-1",
      label: "Tuition Fee",
      category: "Tuition",
      programmeId: "prog-main",
      applicableClassIds: [],
      amount: 50000,
      mandatory: true,
    },
  ];

  db.payments = [
    {
      id: "pay-1",
      receiptNumber: "SCH-RCT-0001",
      studentId: "stu-1",
      session: "2026/2027",
      term: "First Term",
      invoiceProgrammeId: "combined",
      amount: 25000,
      method: "POS",
      confirmationStatus: "Confirmed",
      reference: "POS-1001",
      date: "2026-10-10",
      recordedBy: "Bursar",
    },
    {
      id: "pay-2",
      receiptNumber: "SCH-RCT-0002",
      studentId: "stu-1",
      session: "2026/2027",
      term: "First Term",
      invoiceProgrammeId: "combined",
      amount: 10000,
      method: "Bank Transfer",
      confirmationStatus: "Pending Confirmation",
      reference: "TRF-9981",
      date: "2026-10-15",
      recordedBy: "Parent Portal",
    },
  ];

  db.scores = [
    {
      id: "scr-1",
      studentId: "stu-1",
      subjectId: math.id,
      classId: jss1.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
      scores: { ca1: 18, ca2: 17, exam: 52 },
    },
    {
      id: "scr-2",
      studentId: "stu-3",
      subjectId: math.id,
      classId: jss1.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
      scores: { ca1: 15, ca2: 14, exam: 44 },
    },
    {
      id: "scr-3",
      studentId: "stu-1",
      subjectId: eng.id,
      classId: jss1.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
      scores: { ca1: 16, ca2: 16, exam: 48 },
    },
  ];

  return db;
}

describe("NDH SchoolOS Production-Ready Blank Seed, RBAC & Video Tutorial Engine", () => {
  it("starts with a clean, zero-demo Nigerian school database ready for live onboarding", () => {
    const fresh = createSeedDatabase();
    expect(fresh.version).toBe(3);
    expect(fresh.settings.setupCompleted).toBe(false);
    expect(fresh.settings.currencySymbol).toBe("₦");
    expect(fresh.settings.multiProgrammeEnabled).toBe(false);
    expect(fresh.settings.enableQuranModule).toBe(false);

    // Zero fake/demo students, scores, fees, payments, or staff
    expect(fresh.students).toHaveLength(0);
    expect(fresh.scores).toHaveLength(0);
    expect(fresh.payments).toHaveLength(0);
    expect(fresh.staff).toHaveLength(0);
    expect(fresh.auditLogs).toHaveLength(0);

    // Pre-configured Nigerian classes & CA1/CA2/Exam grading ready immediately
    expect(fresh.classes.map((c) => c.name)).toContain("Nursery");
    expect(fresh.classes.map((c) => c.name)).toContain("Primary 1");
    expect(fresh.classes.map((c) => c.name)).toContain("JSS 1");
    expect(fresh.classes.map((c) => c.name)).toContain("SSS 3");
    expect(fresh.settings.grading.defaultComponents).toEqual([
      { id: "ca1", label: "CA 1", maxScore: 20 },
      { id: "ca2", label: "CA 2", maxScore: 20 },
      { id: "exam", label: "Exam", maxScore: 60 },
    ]);
  });

  it("enforces strict data-layer RBAC across all 6 school roles", () => {
    const rawDb = buildPopulatedTestDatabase();
    const jss1 = rawDb.classes.find((c) => c.name === "JSS 1")!;
    const jss2 = rawDb.classes.find((c) => c.name === "JSS 2")!;
    const math = rawDb.subjects.find((s) => s.code === "MTH")!;
    const eng = rawDb.subjects.find((s) => s.code === "ENG")!;

    // 1. Class Teacher: sees ONLY JSS 1 students and never sees fee payments or payroll
    const classTeacherSession: ActivePortalSession = {
      isAuthenticated: true,
      role: "class_teacher",
      staffId: "stf-ct-1",
      displayName: "Mrs. Ngozi Okafor",
      subtitle: "Class Teacher • JSS 1",
    };
    const ctDb = getAuthorizedSnapshot(rawDb, classTeacherSession);
    expect(ctDb.classes.map((c) => c.id)).toEqual([jss1.id]);
    expect(ctDb.students.every((s) => s.programmeClasses["prog-main"] === jss1.id)).toBe(true);
    expect(ctDb.payments).toHaveLength(0);
    expect(ctDb.payroll).toHaveLength(0);
    expect(canPrintDocument(ctDb, classTeacherSession, { type: "report_card", studentId: "stu-1" })).toBe(true);
    expect(canPrintDocument(ctDb, classTeacherSession, { type: "report_card", studentId: "stu-2" })).toBe(false);

    // 2. Subject Teacher: can edit Mathematics in JSS 1/JSS 2, blocked from English
    const subjectTeacherSession: ActivePortalSession = {
      isAuthenticated: true,
      role: "subject_teacher",
      staffId: "stf-st-1",
      displayName: "Mr. Tunde Balogun",
      subtitle: "Subject Teacher • Mathematics",
    };
    const stDb = getAuthorizedSnapshot(rawDb, subjectTeacherSession);
    expect(stDb.subjects.map((s) => s.id)).toEqual([math.id]);
    expect(
      evaluateScoreWritePermission(rawDb, subjectTeacherSession, {
        classId: jss1.id,
        subjectId: math.id,
        session: "2026/2027",
        term: "First Term",
      }).mode
    ).toBe("direct");
    expect(
      evaluateScoreWritePermission(rawDb, subjectTeacherSession, {
        classId: jss1.id,
        subjectId: eng.id,
        session: "2026/2027",
        term: "First Term",
      }).mode
    ).toBe("denied");

    // 3. Bursar: manages fees & payroll, blocked from manual waivers & score editing
    const bursarSession: ActivePortalSession = {
      isAuthenticated: true,
      role: "bursar",
      staffId: "stf-bur-1",
      displayName: "Mr. Ibrahim Danjuma",
      subtitle: "Bursar",
    };
    expect(canManageFees(bursarSession)).toBe(true);
    expect(canManagePayroll(bursarSession)).toBe(true);
    expect(canManageFeeWaivers(bursarSession)).toBe(false);
    expect(canManageSettings(bursarSession)).toBe(false);
    expect(
      evaluateScoreWritePermission(rawDb, bursarSession, {
        classId: jss1.id,
        subjectId: math.id,
        session: "2026/2027",
        term: "First Term",
      }).mode
    ).toBe("denied");

    // 4. Secretary: manages admissions/students & printing, blocked from score edits, fees & payroll
    const secretarySession: ActivePortalSession = {
      isAuthenticated: true,
      role: "secretary",
      staffId: "stf-sec-1",
      displayName: "Miss Blessing Eze",
      subtitle: "Secretary",
    };
    expect(canManageStudents(secretarySession)).toBe(true);
    expect(canManageFees(secretarySession)).toBe(false);
    expect(canManagePayroll(secretarySession)).toBe(false);
    expect(getAllowedNavSections("secretary", false)).not.toContain("fees");
    expect(getAllowedNavSections("secretary", false)).not.toContain("audit");

    // 5. Parent: sees ONLY their 2 linked siblings (stu-1 in JSS 1 & stu-2 in JSS 2), never stu-3
    const parentSession: ActivePortalSession = {
      isAuthenticated: true,
      role: "parent",
      parentPhone: "+234 803 211 4400",
      displayName: "Engr. Emeka Nwosu",
      subtitle: "Parent Portal",
    };
    const parentDb = getAuthorizedSnapshot(rawDb, parentSession);
    expect(parentDb.students.map((s) => s.id).sort()).toEqual(["stu-1", "stu-2"]);
    expect(parentDb.classes.map((c) => c.id).sort()).toEqual([jss1.id, jss2.id].sort());
  });

  it("enforces term result locking and Admin approval for published score edits", () => {
    const rawDb = buildPopulatedTestDatabase();
    const jss1 = rawDb.classes.find((c) => c.name === "JSS 1")!;
    const math = rawDb.subjects.find((s) => s.code === "MTH")!;

    const teacher: ActivePortalSession = {
      isAuthenticated: true,
      role: "class_teacher",
      staffId: "stf-ct-1",
      displayName: "Mrs. Ngozi Okafor",
      subtitle: "Class Teacher",
    };

    // Published but unlocked -> needs Admin approval
    rawDb.termLocks = [
      {
        id: "2026/2027__First Term",
        session: "2026/2027",
        term: "First Term",
        isPublished: true,
        isLocked: false,
      },
    ];
    expect(
      evaluateScoreWritePermission(rawDb, teacher, {
        classId: jss1.id,
        subjectId: math.id,
        session: "2026/2027",
        term: "First Term",
      }).mode
    ).toBe("queued_for_approval");

    // Locked -> completely denied for teachers
    rawDb.termLocks[0]!.isLocked = true;
    expect(
      evaluateScoreWritePermission(rawDb, teacher, {
        classId: jss1.id,
        subjectId: math.id,
        session: "2026/2027",
        term: "First Term",
      }).mode
    ).toBe("denied");
  });

  it("computes Nigerian marksheets, broadsheets, sibling discounts, confirmed vs pending transfers, and payroll accurately", () => {
    const db = buildPopulatedTestDatabase();
    const jss1 = db.classes.find((c) => c.name === "JSS 1")!;
    const math = db.subjects.find((s) => s.code === "MTH")!;
    const jss1Students = db.students.filter(
      (s) => s.programmeClasses["prog-main"] === jss1.id
    );

    const marksheet = computeSubjectMarksheet({
      students: jss1Students,
      scores: db.scores,
      components: db.settings.grading.defaultComponents,
      gradeBands: db.settings.grading.gradeBands,
      classId: jss1.id,
      programmeId: "prog-main",
      subjectId: math.id,
      session: "2026/2027",
      term: "First Term",
    });
    expect(marksheet.rows.some((r) => r.total === 87 && r.grade === "A" && r.position === 1)).toBe(true);

    const broadsheet = computeClassBroadsheet({
      students: jss1Students,
      subjects: db.subjects,
      scores: db.scores,
      settings: db.settings,
      classId: jss1.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
    });
    expect(broadsheet[0]?.student.id).toBe("stu-1");
    expect(broadsheet[0]?.position).toBe(1);

    // Sibling discount (10% of 50,000 = 5,000 -> netPayable 45,000) + only Confirmed POS (25,000) counts as paid
    const stu1Invoices = computeStudentInvoices({
      student: db.students[0]!,
      allStudents: db.students,
      feeItems: db.feeItems,
      payments: db.payments,
      settings: db.settings,
      session: "2026/2027",
      term: "First Term",
    });
    expect(stu1Invoices[0]?.siblingDiscountAmount).toBe(5000);
    expect(stu1Invoices[0]?.netPayable).toBe(45000);
    expect(stu1Invoices[0]?.amountPaid).toBe(25000);
    expect(stu1Invoices[0]?.pendingAmount).toBe(10000);
    expect(stu1Invoices[0]?.balance).toBe(20000);

    // Staff payroll net calculation
    const comp = computeStaffCompensation(db.staff[1]!.salary);
    expect(comp.netSalary).toBe(113000);
  });

  it("auto-plays the RoleVideoTutorialPlayer MP4 (Welcome -> Sign-Up -> Sign-In -> All Pages), jumps chapters, switches roles, and rolls into the next video", () => {
    const { container } = render(<RoleVideoTutorialPlayer autoPlay />);

    const getVideoSrc = () =>
      container.querySelector("video")?.getAttribute("src");

    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-admin-v2.mp4");
    expect(screen.getByText(/1\. Welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Sign-Up Wizard/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Sign-In/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Fees, Payroll & Settings/i)).toBeInTheDocument();

    // When video finishes, automatically rolls into Class Teacher MP4!
    fireEvent.ended(container.querySelector("video")!);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-class-teacher-v2.mp4");
    expect(screen.getByText(/1\. Welcome & Account Setup/i)).toBeInTheDocument();

    // Manual role tab switch to Parent
    const parentTab = screen.getByRole("tab", { name: /Parent/i });
    fireEvent.click(parentTab);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-parent-v2.mp4");
    expect(screen.getByText(/2\. Parent Phone Sign-In/i)).toBeInTheDocument();

    // Loops back to School Owner when Parent video ends
    fireEvent.ended(container.querySelector("video")!);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-admin-v2.mp4");
  });
});
