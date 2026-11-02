import { DEFAULT_NDH_ECOSYSTEM_LINKS } from "./ndhLinks";
import type { SchoolDatabaseSnapshot } from "@/types/school";

/**
 * Standard Nigerian 3-Term School Class Progression (Editable at Onboarding & in Classes)
 */
export const DEFAULT_NIGERIAN_CLASS_NAMES = [
  "Nursery",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SSS 1",
  "SSS 2",
  "SSS 3",
] as const;

/**
 * Clean, Production-Ready Blank Nigerian School Database (Zero Demo / Sample Data)
 * Ready for immediate registration and live use by a real school.
 */
export function createEmptySchoolDatabase(): SchoolDatabaseSnapshot {
  return {
    version: 3,
    settings: {
      name: "",
      country: "Nigeria",
      code: "SCH",
      motto: "",
      address: "",
      phone: "",
      email: "",
      currencySymbol: "₦",
      currencyCode: "NGN",
      setupCompleted: false,
      multiProgrammeEnabled: false,
      programmes: [
        {
          id: "prog-main",
          name: "Main School",
          description: "Nursery, Primary & Secondary Day School",
        },
      ],
      enableQuranModule: false,
      smsCreditsBalance: 0,
      bankAccountDetails: {
        bankName: "",
        accountName: "",
        accountNumber: "",
      },
      labels: {
        classSingular: "Class",
        classPlural: "Classes",
        teacherSingular: "Teacher",
        teacherPlural: "Teachers",
        termLabel: "Term",
      },
      sessions: ["2026/2027", "2027/2028"],
      currentSession: "2026/2027",
      terms: ["First Term", "Second Term", "Third Term"],
      currentTerm: "First Term",
      daysSchoolOpened: 0,
      billingMode: "combined",
      reportCardDefaultLayout: "merged",
      grading: {
        defaultComponents: [
          { id: "ca1", label: "CA 1", maxScore: 20 },
          { id: "ca2", label: "CA 2", maxScore: 20 },
          { id: "exam", label: "Exam", maxScore: 60 },
        ],
        programmeComponents: {},
        classOverrides: {},
        gradeBands: [
          { grade: "A", min: 70, max: 100, remark: "Excellent" },
          { grade: "B", min: 60, max: 69, remark: "Very Good" },
          { grade: "C", min: 50, max: 59, remark: "Credit" },
          { grade: "D", min: 45, max: 49, remark: "Pass" },
          { grade: "E", min: 40, max: 44, remark: "Fair" },
          { grade: "F", min: 0, max: 39, remark: "Fail" },
        ],
      },
      siblingDiscount: {
        enabled: false,
        type: "percentage",
        value: 10,
        minChildren: 2,
      },
      ndhFooterLinks: DEFAULT_NDH_ECOSYSTEM_LINKS,
      nextReceiptSequence: 1,
    },
    classes: [],
    subjects: [],
    students: [],
    scores: [],
    termLocks: [],
    pendingScoreEdits: [],
    auditLogs: [],
    quranRecords: [],
    affective: [],
    attendance: [],
    feeItems: [],
    payments: [],
    parentNotices: [],
    staff: [],
    payroll: [],
    teachingGroups: [],
    examPapers: [],
    timetable: [],
  };
}
