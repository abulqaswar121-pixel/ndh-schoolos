// Fictional recording fixtures ONLY. Never imported by src or the production seed.
import demoCrest from "./demo-crest.png?inline";
import { createSeedDatabase } from "../../src/data/seedMarkazAcademy";
import type { SchoolDatabaseSnapshot, StaffMember } from "../../src/types/school";
export const demoSchool = {
  id: "recording-only-school",
  name: "NDH Demo Academy",
  code: "DEMO",
  owner_id: "recording-only-owner",
  created_at: "2026-09-01T00:00:00Z",
  subscription_status: "Active",
  subscription_expires_at: null,
};
export function createRecordingDatabase(tahfeez = false): SchoolDatabaseSnapshot {
  const db = createSeedDatabase();
  Object.assign(db.settings, {
    name: demoSchool.name,
    code: "DEMO",
    setupCompleted: true,
    motto: "Learning together, growing together",
    address: "Fictional training school — no real records",
    email: "owner@example.invalid",
    phone: "",
    logoDataUrl: demoCrest,
  });
  db.classes = db.classes.filter((c) => c.name === "Primary 1" || c.name === "Primary 2");
  db.subjects = db.subjects.slice(0, 3);
  db.students = ["Demo Learner A", "Demo Learner B", "Demo Learner C"].map((fullName, i) => ({
    id: `demo-pupil-${i}`,
    admissionId: `DEMO-00${i + 1}`,
    fullName,
    gender: i === 1 ? "Female" : "Male",
    dateOfBirth: "2020-01-01",
    bloodGroup: "O+",
    healthNotes: "",
    homeAddress: "",
    programmeClasses: { "prog-main": db.classes[0]!.id },
    status: "Active",
    admissionDate: "2026-09-01",
    guardianName: "Demo Guardian",
    guardianRelationship: "Guardian",
    parentPhone: i < 2 ? "00000000000" : "00000000001",
    parentEmail: "parent@example.invalid",
  }));
  const base = {
    staffCode: "",
    phone: "",
    email: "",
    bankName: "",
    accountNumber: "",
    assignedClassIds: [],
    assignedSubjectIds: [],
    status: "Active",
    joinedDate: "2026-09-01",
    salary: {
      baseSalary: 50000,
      teachingAllowance: 0,
      overtime: 0,
      transport: 0,
      absenceFines: 0,
      pension: 0,
      salaryAdvanceRepayment: 0,
    },
  } satisfies Partial<StaffMember>;
  db.staff = [
    {
      ...base,
      id: "demo-owner",
      staffCode: "ADM-001",
      fullName: "Demo School Owner",
      role: "Proprietor / Principal",
      systemRole: "admin",
      email: "owner@example.invalid",
    },
    {
      ...base,
      id: "demo-teacher",
      staffCode: "TCH-001",
      fullName: "Demo Class Teacher",
      role: "Class Teacher",
      systemRole: "class_teacher",
      staffCategory: "teaching",
      assignedClassIds: [db.classes[0]!.id],
      assignedSubjectIds: db.subjects.map((s) => s.id),
    },
    {
      ...base,
      id: "demo-support",
      staffCode: "SUP-001",
      fullName: "Demo Support Staff",
      role: "Support Staff",
      systemRole: "secretary",
      staffCategory: "non_teaching",
      supportDuty: "Cleaner",
    },
  ];
  db.staff.push(
    {
      ...base,
      id: "demo-subject",
      staffCode: "TCH-002",
      fullName: "Demo Subject Teacher",
      role: "Subject Teacher",
      systemRole: "subject_teacher",
      assignedClassIds: db.classes.map((c) => c.id),
      assignedSubjectIds: [db.subjects[0]!.id],
    },
    {
      ...base,
      id: "demo-exam",
      staffCode: "EXM-001",
      fullName: "Demo Exam Officer",
      role: "Exam Officer",
      systemRole: "exam_officer",
    },
    {
      ...base,
      id: "demo-bursar",
      staffCode: "BUR-001",
      fullName: "Demo Bursar",
      role: "Bursar / Accountant",
      systemRole: "bursar",
    },
    {
      ...base,
      id: "demo-secretary",
      staffCode: "SEC-001",
      fullName: "Demo Secretary",
      role: "School Secretary",
      systemRole: "secretary",
    },
  );
  db.teachingGroups = [
    {
      id: "demo-combined",
      name: "Demo combined English group",
      programmeId: "prog-main",
      subjectId: db.subjects[0]!.id,
      teacherStaffId: "demo-subject",
      classIds: db.classes.map((c) => c.id),
      studentIds: db.students.map((s) => s.id),
    },
  ];
  db.feeItems = [
    {
      id: "demo-fee",
      label: "Demo tuition",
      category: "Tuition",
      programmeId: "prog-main",
      applicableClassIds: db.classes.map((c) => c.id),
      amount: 20000,
      mandatory: true,
    },
  ];
  db.payments = [
    {
      id: "demo-payment",
      receiptNumber: "DEMO-RCT-001",
      studentId: db.students[0]!.id,
      session: db.settings.currentSession,
      term: db.settings.currentTerm,
      invoiceProgrammeId: "combined",
      amount: 5000,
      method: "Cash",
      confirmationStatus: "Confirmed",
      reference: "Fictional demo payment",
      date: "2026-10-01",
      recordedBy: "Demo Bursar",
    },
  ];
  db.payroll = db.staff.map((member) => ({
    id: `demo-pay-${member.id}`,
    monthKey: "2026-10",
    monthLabel: "October 2026",
    session: db.settings.currentSession,
    term: db.settings.currentTerm,
    staffId: member.id,
    ...member.salary,
    grossAdditions: 50000,
    totalDeductions: 0,
    netSalary: 50000,
    status: "Pending",
    paymentReference: "",
  }));
  db.termLocks = [
    {
      id: "demo-published",
      session: db.settings.currentSession,
      term: db.settings.currentTerm,
      isPublished: true,
      isLocked: false,
    },
  ];
  db.examPapers = ["submitted", "draft"].map((status, i) => ({
    id: `demo-paper-${i}`,
    programmeId: "prog-main",
    classIds: [db.classes[0]!.id],
    subjectId: db.subjects[0]!.id,
    session: db.settings.currentSession,
    term: db.settings.currentTerm,
    assessmentTitle: "Fictional demo assessment",
    durationLabel: "30 minutes",
    generalInstructions: "Demo questions only. Answer all questions.",
    sectionAInstruction: "Choose the correct answer.",
    sectionBInstruction: "Write your answer.",
    paperLayout: "standard",
    objectives: [
      {
        id: `demo-q-${i}`,
        questionText: "Choose the plural of book.",
        optionA: "books",
        optionB: "booked",
        optionC: "booking",
        optionD: "book",
        correctOption: "A",
        marks: 2,
      },
    ],
    theory: [
      {
        id: `demo-t-${i}`,
        questionText: "Write a short sentence about your school.",
        markingGuide: "Award marks for a complete grammatical sentence.",
        marks: 3,
      },
    ],
    generalMarkingNotes: "Fictional training assessment",
    status,
    submittedByStaffId: "demo-subject",
    submittedByName: "Demo Subject Teacher",
    submittedAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
  })) as SchoolDatabaseSnapshot["examPapers"];
  if (tahfeez) {
    db.settings.enableQuranModule = true;
    db.settings.programmes[0]!.groupLabel = "Halqah";
    db.quranRecords = [
      {
        studentId: db.students[0]!.id,
        currentSurahNumber: 1,
        ayahFrom: 1,
        ayahTo: 7,
        juzCompleted: 0,
        hizbCompleted: 0,
        revisionStatus: "Good",
        recitationScore: 80,
        teacherNotes: "Fictional Tahfeez example",
        updatedAt: "2026-10-01T10:00:00Z",
        recentLogs: [],
      },
    ];
  }
  db.scores = db.students.flatMap((student, i) =>
    db.subjects.map((subject, j) => ({
      id: `demo-score-${i}-${j}`,
      studentId: student.id,
      subjectId: subject.id,
      classId: db.classes[0]!.id,
      programmeId: "prog-main",
      session: db.settings.currentSession,
      term: db.settings.currentTerm,
      scores: { ca1: 15 + i, ca2: 16 + i, exam: 42 + j },
    })),
  );
  return db;
}
