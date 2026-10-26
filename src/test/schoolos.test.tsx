import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { RoleVideoTutorialPlayer } from "@/components/schoolos/tutorials/RoleVideoTutorialPlayer";
import { SchoolOSProvider, useSchoolOS } from "@/context/SchoolOSContext";
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
import { parseRawTextIntoExamQuestions } from "@/services/examAiService";
import { buildExamPaperWordDocumentHtml } from "@/services/examPaperExportService";
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

    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-admin-v4.mp4");
    expect(screen.getByText(/1\. Welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Sign-Up & School Code/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Sign-In & Video Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Fees, Backups & Offline/i)).toBeInTheDocument();

    // When video finishes, automatically rolls into Exam Officer MP4!
    fireEvent.ended(container.querySelector("video")!);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-exam-officer-v4.mp4");
    expect(screen.getByText(/5\. Export PDF & Word \(\.doc\)/i)).toBeInTheDocument();

    // Manual role tab switch to Subject Teacher (Combined Groups + AI Digitizer)
    const subjectTab = screen.getByRole("tab", { name: /Subject Teacher/i });
    fireEvent.click(subjectTab);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-subject-teacher-v4.mp4");
    expect(screen.getByText(/3\. Combined Multi-Class Groups/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. AI Exam Question Digitizer/i)).toBeInTheDocument();

    // Manual role tab switch to Parent
    const parentTab = screen.getByRole("tab", { name: /Parent/i });
    fireEvent.click(parentTab);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-parent-v4.mp4");
    expect(screen.getByText(/2\. School Code \+ Phone Sign-In/i)).toBeInTheDocument();

    // Loops back to School Owner when Parent video ends
    fireEvent.ended(container.querySelector("video")!);
    expect(getVideoSrc()).toBe("/videos/ndh-walkthrough-admin-v4.mp4");
  });

  it("locks in-portal RoleVideoTutorialPlayer strictly to the active portal's role with zero other role tabs", () => {
    const { container, unmount } = render(
      <RoleVideoTutorialPlayer lockedRoleId="exam_officer" autoPlay={false} />
    );

    expect(
      container.querySelector("video")?.getAttribute("src")
    ).toBe("/videos/ndh-walkthrough-exam-officer-v4.mp4");
    expect(
      screen.getByText(/Exam Officer — Portal Video Guide/i)
    ).toBeInTheDocument();
    // Other roles' tabs are completely absent
    expect(screen.queryByRole("tab", { name: /School Owner/i })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Bursar/i })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Parent/i })).toBeNull();

    // Ending the video never rolls into another role's portal video
    fireEvent.ended(container.querySelector("video")!);
    expect(
      container.querySelector("video")?.getAttribute("src")
    ).toBe("/videos/ndh-walkthrough-exam-officer-v4.mp4");
    unmount();

    const parentRender = render(
      <RoleVideoTutorialPlayer lockedRoleId="parent" autoPlay={false} />
    );
    expect(
      parentRender.container.querySelector("video")?.getAttribute("src")
    ).toBe("/videos/ndh-walkthrough-parent-v4.mp4");
    expect(
      screen.getByText(/Parent \/ Guardian — Portal Video Guide/i)
    ).toBeInTheDocument();
  });

  it("supports mid-session class transfers with score carry-over, auto-syncs subject teacher entries to class teacher broadsheet, and blocks cross-school login", () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    let api: ReturnType<typeof useSchoolOS> | null = null;
    function Harness() {
      api = useSchoolOS();
      return null;
    }

    render(
      <SchoolOSProvider>
        <Harness />
      </SchoolOSProvider>
    );

    // 1. Register School A ("Crown Heights School" -> code "CHS")
    act(() => {
      api!.completeSchoolOnboarding({
        schoolName: "Crown Heights School",
        country: "Nigeria",
        currencySymbol: "₦",
        currencyCode: "NGN",
        multiProgrammeEnabled: false,
        currentSession: "2026/2027",
        currentTerm: "First Term",
        classNames: ["JSS 1A", "JSS 1B", "JSS 2A"],
        adminName: "Mrs. Adebayo",
        adminContact: "08030001111",
        adminPin: "4321",
      });
    });

    expect(api!.db.settings.code).toBe("CHS");
    const jss1a = api!.db.classes.find((c) => c.name === "JSS 1A")!;
    const jss1b = api!.db.classes.find((c) => c.name === "JSS 1B")!;
    const math = api!.db.subjects.find((s) => s.code === "MTH")!;

    // Add a student to JSS 1A, plus a Subject Teacher (Mathematics) and JSS 1B Class Teacher
    act(() => {
      api!.upsertStudent({
        id: "stu-trf-1",
        admissionId: "CHS/001",
        fullName: "Zainab Lawal",
        gender: "Female",
        dateOfBirth: "2014-05-12",
        bloodGroup: "O+",
        healthNotes: "",
        homeAddress: "12 Unity Road",
        programmeClasses: { "prog-main": jss1a.id },
        status: "Active",
        admissionDate: "2026-09-10",
        guardianName: "Alhaji Lawal",
        guardianRelationship: "Father",
        parentPhone: "08055556666",
        parentEmail: "",
      });

      api!.upsertStaffMember({
        id: "stf-sub-mth",
        staffCode: "SUB-01",
        fullName: "Mr. Okoro",
        role: "Subject Teacher",
        systemRole: "subject_teacher",
        loginPin: "2222",
        phone: "08030002222",
        email: "okoro@chs.edu",
        bankName: "",
        accountNumber: "",
        assignedClassIds: [jss1a.id, jss1b.id],
        assignedSubjectIds: [math.id],
        status: "Active",
        joinedDate: "2026-09-01",
        salary: {
          baseSalary: 90000,
          teachingAllowance: 0,
          overtime: 0,
          transport: 0,
          absenceFines: 0,
          pension: 0,
          salaryAdvanceRepayment: 0,
        },
      });

      api!.upsertStaffMember({
        id: "stf-ct-1b",
        staffCode: "CT-1B",
        fullName: "Mrs. Danjuma",
        role: "Class Teacher",
        systemRole: "class_teacher",
        loginPin: "3333",
        phone: "08030003333",
        email: "danjuma@chs.edu",
        bankName: "",
        accountNumber: "",
        assignedClassIds: [jss1b.id],
        assignedSubjectIds: [],
        status: "Active",
        joinedDate: "2026-09-01",
        salary: {
          baseSalary: 95000,
          teachingAllowance: 0,
          overtime: 0,
          transport: 0,
          absenceFines: 0,
          pension: 0,
          salaryAdvanceRepayment: 0,
        },
      });
    });

    // 2. Subject Teacher signs in and records Mathematics CA1 (18) + CA2 (17) + Exam (52) = 87
    act(() => {
      const loginSub = api!.loginProductionStaff({
        identifier: "SUB-01",
        pin: "2222",
        schoolCode: "CHS",
      });
      expect(loginSub.ok).toBe(true);
    });
    act(() => {
      api!.updateScoreCell({
        studentId: "stu-trf-1",
        subjectId: math.id,
        classId: jss1a.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "ca1",
        value: 18,
      });
      api!.updateScoreCell({
        studentId: "stu-trf-1",
        subjectId: math.id,
        classId: jss1a.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "ca2",
        value: 17,
      });
      api!.updateScoreCell({
        studentId: "stu-trf-1",
        subjectId: math.id,
        classId: jss1a.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "exam",
        value: 52,
      });
    });

    // 3. Admin signs back in and transfers Zainab mid-session from JSS 1A -> JSS 1B
    act(() => {
      api!.loginProductionStaff({
        identifier: "ADM-001",
        pin: "4321",
        schoolCode: "CHS",
      });
    });
    act(() => {
      const trf = api!.transferStudentClass({
        studentId: "stu-trf-1",
        programmeId: "prog-main",
        toClassId: jss1b.id,
        reason: "Class arm rebalancing mid-term",
        carryCurrentTermScores: true,
      });
      expect(trf.ok).toBe(true);
      expect(trf.migratedScoresCount).toBe(1);
    });

    const transferredStu = api!.db.students.find((s) => s.id === "stu-trf-1")!;
    expect(transferredStu.programmeClasses["prog-main"]).toBe(jss1b.id);
    expect(transferredStu.transferHistory?.[0]?.fromClassName).toBe("JSS 1A");
    expect(transferredStu.transferHistory?.[0]?.toClassName).toBe("JSS 1B");

    // 4. JSS 1B Class Teacher signs in -> Subject Teacher's 87 score automatically appears on her Broadsheet!
    act(() => {
      const ctLogin = api!.loginProductionStaff({
        identifier: "CT-1B",
        pin: "3333",
        schoolCode: "CHS",
      });
      expect(ctLogin.ok).toBe(true);
    });
    const jss1bBroadsheet = computeClassBroadsheet({
      students: api!.db.students,
      subjects: api!.db.subjects,
      scores: api!.db.scores,
      settings: api!.db.settings,
      classId: jss1b.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
    });
    expect(jss1bBroadsheet[0]?.student.fullName).toBe("Zainab Lawal");
    expect(jss1bBroadsheet[0]?.subjectTotals[math.id]?.total).toBe(87);

    // 5. Attempting to sign in with another school's code is strictly rejected!
    act(() => {
      const crossSchoolStaff = api!.loginProductionStaff({
        identifier: "CT-1B",
        pin: "3333",
        schoolCode: "OTHER-SCH",
      });
      expect(crossSchoolStaff.ok).toBe(false);

      const crossSchoolParent = api!.loginProductionParent({
        phone: "08055556666",
        schoolCode: "OTHER-SCH",
      });
      expect(crossSchoolParent.ok).toBe(false);
    });
  });

  it("refines exam questions with AI, exports Exam Papers & Marking Schemes to Word (.doc) & PDF, grants Exam Officer all-classes report access, and routes Combined Teaching Group scores to each student's home class", () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    // 1. Test AI Question Structurer & Mistake Refiner
    const aiParsed = parseRawTextIntoExamQuestions(`
      1. what is the boiling point of pure water A) 50 deg C B) 80 deg C C) 100 deg C D) 120 deg C [Ans: C]
      2. chose the corect unit of force A) Joule B) Newton C) Watt D) Pascal Ans: B
      SECTION B: THEORY
      1. define photosyntesis and state three conditions necesary for it (12 marks)
      Guide: Definition = 4m, Sunlight + Chlorophyll + CO2 = 8m
    `);

    expect(aiParsed.objectives).toHaveLength(2);
    expect(aiParsed.objectives[0]?.questionText).toBe(
      "What is the boiling point of pure water?"
    );
    expect(aiParsed.objectives[0]?.optionC).toBe("100 °C");
    expect(aiParsed.objectives[0]?.correctOption).toBe("C");
    expect(aiParsed.objectives[1]?.questionText).toBe(
      "Choose the correct unit of force."
    );
    expect(aiParsed.objectives[1]?.correctOption).toBe("B");
    expect(aiParsed.theory).toHaveLength(1);
    expect(aiParsed.theory[0]?.questionText).toContain("photosynthesis");
    expect(aiParsed.theory[0]?.questionText).toContain("necessary");
    expect(aiParsed.theory[0]?.marks).toBe(12);
    expect(aiParsed.fixesApplied.length).toBeGreaterThanOrEqual(4);

    // 2. Test Combined Cross-Class Subject Recording + Exam Officer Workflow
    let api: ReturnType<typeof useSchoolOS> | null = null;
    function Harness() {
      api = useSchoolOS();
      return null;
    }

    render(
      <SchoolOSProvider>
        <Harness />
      </SchoolOSProvider>
    );

    act(() => {
      api!.completeSchoolOnboarding({
        schoolName: "Unity Integrated Academy",
        country: "Nigeria",
        currencySymbol: "₦",
        currencyCode: "NGN",
        multiProgrammeEnabled: false,
        currentSession: "2026/2027",
        currentTerm: "First Term",
        classNames: ["JSS 1A", "JSS 1B", "JSS 2A"],
        adminName: "Dr. Ibrahim",
        adminContact: "08031230000",
        adminPin: "1111",
      });
    });

    const jss1a = api!.db.classes.find((c) => c.name === "JSS 1A")!;
    const jss1b = api!.db.classes.find((c) => c.name === "JSS 1B")!;
    const jss2a = api!.db.classes.find((c) => c.name === "JSS 2A")!;
    const eng = api!.db.subjects.find((s) => s.code === "ENG")!;

    act(() => {
      // Three students in THREE DIFFERENT classes
      api!.upsertStudent({
        id: "stu-1a",
        admissionId: "UIA/001",
        fullName: "Musa Bello",
        gender: "Male",
        dateOfBirth: "2014-01-01",
        bloodGroup: "O+",
        healthNotes: "",
        homeAddress: "Sokoto",
        programmeClasses: { "prog-main": jss1a.id },
        status: "Active",
        admissionDate: "2026-09-01",
        guardianName: "Alh. Bello",
        guardianRelationship: "Father",
        parentPhone: "08031112221",
        parentEmail: "",
      });
      api!.upsertStudent({
        id: "stu-1b",
        admissionId: "UIA/002",
        fullName: "Fatima Sani",
        gender: "Female",
        dateOfBirth: "2014-02-02",
        bloodGroup: "A+",
        healthNotes: "",
        homeAddress: "Sokoto",
        programmeClasses: { "prog-main": jss1b.id },
        status: "Active",
        admissionDate: "2026-09-01",
        guardianName: "Mal. Sani",
        guardianRelationship: "Father",
        parentPhone: "08031112222",
        parentEmail: "",
      });
      api!.upsertStudent({
        id: "stu-2a",
        admissionId: "UIA/003",
        fullName: "Kemi Adeyemi",
        gender: "Female",
        dateOfBirth: "2013-03-03",
        bloodGroup: "B+",
        healthNotes: "",
        homeAddress: "Lagos",
        programmeClasses: { "prog-main": jss2a.id },
        status: "Active",
        admissionDate: "2026-09-01",
        guardianName: "Mr. Adeyemi",
        guardianRelationship: "Father",
        parentPhone: "08031112223",
        parentEmail: "",
      });

      // Subject Teacher (initially assigned only JSS 1A, but gathers students from 1A, 1B & 2A into a Combined Group!)
      api!.upsertStaffMember({
        id: "stf-eng",
        staffCode: "ENG-01",
        fullName: "Mrs. Yusuf",
        role: "Subject Teacher",
        systemRole: "subject_teacher",
        loginPin: "5555",
        phone: "08039990001",
        email: "yusuf@uia.edu",
        bankName: "",
        accountNumber: "",
        assignedClassIds: [jss1a.id],
        assignedSubjectIds: [eng.id],
        status: "Active",
        joinedDate: "2026-09-01",
        salary: {
          baseSalary: 100000,
          teachingAllowance: 0,
          overtime: 0,
          transport: 0,
          absenceFines: 0,
          pension: 0,
          salaryAdvanceRepayment: 0,
        },
      });

      // Dedicated Exam Officer
      api!.upsertStaffMember({
        id: "stf-eo",
        staffCode: "EXO-01",
        fullName: "Mr. Abdullahi",
        role: "Exam Officer",
        systemRole: "exam_officer",
        loginPin: "7777",
        phone: "08039990002",
        email: "eo@uia.edu",
        bankName: "",
        accountNumber: "",
        assignedClassIds: [],
        assignedSubjectIds: [],
        status: "Active",
        joinedDate: "2026-09-01",
        salary: {
          baseSalary: 120000,
          teachingAllowance: 0,
          overtime: 0,
          transport: 0,
          absenceFines: 0,
          pension: 0,
          salaryAdvanceRepayment: 0,
        },
      });

      // Create Combined Cross-Class Teaching Group gathering students from JSS 1A, JSS 1B & JSS 2A
      api!.upsertTeachingGroup({
        id: "grp-combined-eng",
        name: "Combined Stream B",
        programmeId: "prog-main",
        subjectId: eng.id,
        teacherStaffId: "stf-eng",
        classIds: [],
        studentIds: ["stu-1a", "stu-1b", "stu-2a"],
      });
    });

    // Subject Teacher signs in -> sees all 3 gathered cross-class students & enters scores ONCE
    act(() => {
      const subLogin = api!.loginProductionStaff({
        identifier: "ENG-01",
        pin: "5555",
        schoolCode: api!.db.settings.code,
      });
      expect(subLogin.ok).toBe(true);
    });
    expect(api!.db.students).toHaveLength(3);

    act(() => {
      // Record once for each gathered student using their home classId
      api!.updateScoreCell({
        studentId: "stu-1a",
        subjectId: eng.id,
        classId: jss1a.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "exam",
        value: 51,
      });
      api!.updateScoreCell({
        studentId: "stu-1b",
        subjectId: eng.id,
        classId: jss1b.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "exam",
        value: 56,
      });
      api!.updateScoreCell({
        studentId: "stu-2a",
        subjectId: eng.id,
        classId: jss2a.id,
        programmeId: "prog-main",
        session: "2026/2027",
        term: "First Term",
        componentId: "exam",
        value: 58,
      });

      // Submit AI-refined Exam Question Paper to Exam Officer
      api!.upsertExamPaper({
        id: "exp-eng-1",
        programmeId: "prog-main",
        classIds: [jss1a.id, jss1b.id],
        subjectId: eng.id,
        session: "2026/2027",
        term: "First Term",
        assessmentTitle: "Examination",
        durationLabel: "1 Hour 30 Minutes",
        generalInstructions: "Answer all questions.",
        sectionAInstruction: "Choose A-D.",
        sectionBInstruction: "Answer all theory questions.",
        paperLayout: "compact_two_column",
        objectives: aiParsed.objectives,
        theory: aiParsed.theory,
        generalMarkingNotes: "Penalize spelling errors lightly.",
        status: "submitted",
        submittedByName: "Mrs. Yusuf",
        updatedAt: new Date().toISOString(),
      });
    });

    expect(api!.db.examPapers?.[0]?.status).toBe("submitted");

    // Exam Officer signs in -> sees ALL 3 classes' students & broadsheets + ZERO fees/payroll + approves paper!
    act(() => {
      const eoLogin = api!.loginProductionStaff({
        identifier: "EXO-01",
        pin: "7777",
        schoolCode: api!.db.settings.code,
      });
      expect(eoLogin.ok).toBe(true);
    });

    expect(api!.db.classes).toHaveLength(3);
    expect(api!.db.students).toHaveLength(3);
    expect(api!.db.payments).toHaveLength(0);
    expect(api!.db.payroll).toHaveLength(0);

    // Verify each gathered student's score automatically appeared in their respective class broadsheet!
    const b1a = computeClassBroadsheet({
      students: api!.db.students,
      subjects: api!.db.subjects,
      scores: api!.db.scores,
      settings: api!.db.settings,
      classId: jss1a.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
    });
    const b1b = computeClassBroadsheet({
      students: api!.db.students,
      subjects: api!.db.subjects,
      scores: api!.db.scores,
      settings: api!.db.settings,
      classId: jss1b.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
    });
    const b2a = computeClassBroadsheet({
      students: api!.db.students,
      subjects: api!.db.subjects,
      scores: api!.db.scores,
      settings: api!.db.settings,
      classId: jss2a.id,
      programmeId: "prog-main",
      session: "2026/2027",
      term: "First Term",
    });
    expect(b1a[0]?.subjectTotals[eng.id]?.total).toBe(51);
    expect(b1b[0]?.subjectTotals[eng.id]?.total).toBe(56);
    expect(b2a[0]?.subjectTotals[eng.id]?.total).toBe(58);

    // Exam Officer approves paper & verifies Word (.doc) export for both Student Paper & Marking Scheme
    act(() => {
      const rev = api!.reviewExamPaper({
        paperId: "exp-eng-1",
        decision: "approved",
      });
      expect(rev.ok).toBe(true);
    });

    const approvedPaper = api!.db.examPapers![0]!;
    expect(approvedPaper.status).toBe("approved");

    const studentWordHtml = buildExamPaperWordDocumentHtml(
      approvedPaper,
      api!.db,
      "question_paper"
    );
    expect(studentWordHtml).toContain("What is the boiling point of pure water?");
    expect(studentWordHtml).not.toContain("CONFIDENTIAL MARKING SCHEME");

    const schemeWordHtml = buildExamPaperWordDocumentHtml(
      approvedPaper,
      api!.db,
      "marking_scheme"
    );
    expect(schemeWordHtml).toContain("CONFIDENTIAL MARKING SCHEME");
    expect(schemeWordHtml).toContain("Sunlight + Chlorophyll + CO2");
  });
});
