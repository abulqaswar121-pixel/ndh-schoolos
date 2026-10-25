import { TOTAL_QURAN_JUZ, getSurahByNumber } from "@/data/quranSurahs";
import type {
  AttendanceEntry,
  ClassGroup,
  FeePayment,
  FeeScheduleItem,
  GradeBand,
  ProgrammeId,
  QuranProgressRecord,
  SchoolProgramme,
  SchoolSettings,
  ScoreComponentConfig,
  ScoreRecord,
  StaffMember,
  Student,
  Subject,
} from "@/types/school";

export function formatCurrency(amount: number, symbol = "₦"): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const absFormatted = Math.abs(rounded).toLocaleString("en-NG");
  return rounded < 0 ? `-${symbol}${absFormatted}` : `${symbol}${absFormatted}`;
}

export function formatOrdinal(n: number): string {
  if (!n || n <= 0) return "—";
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function normalizePhoneKey(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^\+234/, "0").trim();
}

export function getStudentSiblings(students: Student[], target: Student): Student[] {
  const phoneKey = normalizePhoneKey(target.parentPhone);
  const emailKey = target.parentEmail.trim().toLowerCase();
  return students.filter((s) => {
    if (s.status === "Withdrawn") return false;
    const samePhone =
      phoneKey.length >= 7 && normalizePhoneKey(s.parentPhone) === phoneKey;
    const sameEmail =
      emailKey.length >= 5 && s.parentEmail.trim().toLowerCase() === emailKey;
    return samePhone || sameEmail;
  });
}

export function getActiveProgrammes(settings: SchoolSettings): SchoolProgramme[] {
  if (!settings.programmes || settings.programmes.length === 0) {
    return [{ id: "prog-main", name: "Main School" }];
  }
  if (!settings.multiProgrammeEnabled) {
    return [settings.programmes[0]!];
  }
  return settings.programmes;
}

export function getProgrammeName(
  settings: SchoolSettings,
  programmeId: ProgrammeId
): string {
  return (
    settings.programmes.find((p) => p.id === programmeId)?.name ?? "Main School"
  );
}

export function isProgrammeEnabled(
  settings: SchoolSettings,
  programmeId: ProgrammeId
): boolean {
  return getActiveProgrammes(settings).some((p) => p.id === programmeId);
}

export function isStudentInProgramme(
  student: Student,
  programmeId: ProgrammeId
): boolean {
  return Boolean(student.programmeClasses?.[programmeId]);
}

export function getStudentClassInProgramme(
  student: Student,
  programmeId: ProgrammeId
): string | undefined {
  return student.programmeClasses?.[programmeId];
}

export function getStudentClassName(
  student: Student,
  classes: ClassGroup[],
  settings?: SchoolSettings,
  programmeFilter?: ProgrammeId | "all"
): string {
  if (programmeFilter && programmeFilter !== "all") {
    const cid = student.programmeClasses?.[programmeFilter];
    return classes.find((c) => c.id === cid)?.name ?? "—";
  }

  const activeProgIds = settings
    ? getActiveProgrammes(settings).map((p) => p.id)
    : Object.keys(student.programmeClasses ?? {});

  const names = activeProgIds
    .map((pid) => {
      const cid = student.programmeClasses?.[pid];
      return cid ? classes.find((c) => c.id === cid)?.name : undefined;
    })
    .filter((n): n is string => Boolean(n));

  return names.length > 0 ? names.join(" • ") : "Unassigned";
}

export function getGradingComponents(
  settings: SchoolSettings,
  programmeId: ProgrammeId,
  classId?: string
): ScoreComponentConfig[] {
  if (classId && settings.grading.classOverrides[classId]?.length) {
    return settings.grading.classOverrides[classId]!;
  }
  if (settings.grading.programmeComponents[programmeId]?.length) {
    return settings.grading.programmeComponents[programmeId]!;
  }
  return settings.grading.defaultComponents;
}

export function evaluateGrade(
  percentage: number,
  gradeBands: GradeBand[]
): { grade: string; remark: string } {
  const rounded = Math.round(percentage);
  const sorted = [...gradeBands].sort((a, b) => b.min - a.min);
  const matched = sorted.find((b) => rounded >= b.min && rounded <= b.max);
  if (matched) return { grade: matched.grade, remark: matched.remark };
  const fallback =
    sorted.find((b) => rounded >= b.min) ?? sorted[sorted.length - 1];
  return fallback
    ? { grade: fallback.grade, remark: fallback.remark }
    : { grade: "—", remark: "—" };
}

export interface EvaluatedSubjectScore {
  student: Student;
  scores: Record<string, number>;
  total: number;
  maxPossible: number;
  percentage: number;
  grade: string;
  remark: string;
  position: number;
  hasEntry: boolean;
}

export function computeSubjectMarksheet(params: {
  students: Student[];
  scores: ScoreRecord[];
  components: ScoreComponentConfig[];
  gradeBands: GradeBand[];
  classId: string;
  subjectId: string;
  programmeId: ProgrammeId;
  session: string;
  term: string;
}): { rows: EvaluatedSubjectScore[]; classAverage: number } {
  const {
    students,
    scores,
    components,
    gradeBands,
    classId,
    subjectId,
    programmeId,
    session,
    term,
  } = params;

  const maxPossible =
    components.reduce((acc, c) => acc + c.maxScore, 0) || 100;
  const enrolled = students.filter(
    (s) => s.status === "Active" && s.programmeClasses?.[programmeId] === classId
  );

  const prelim = enrolled.map((student) => {
    const rec = scores.find(
      (r) =>
        r.studentId === student.id &&
        r.subjectId === subjectId &&
        r.session === session &&
        r.term === term
    );
    const scoreMap: Record<string, number> = {};
    let total = 0;
    let hasEntry = false;
    components.forEach((comp) => {
      const val = rec?.scores[comp.id];
      if (typeof val === "number" && !Number.isNaN(val)) {
        hasEntry = true;
        const clamped = Math.max(0, Math.min(comp.maxScore, val));
        scoreMap[comp.id] = clamped;
        total += clamped;
      }
    });
    const percentage = maxPossible > 0 ? (total / maxPossible) * 100 : 0;
    const { grade, remark } = evaluateGrade(percentage, gradeBands);
    return {
      student,
      scores: scoreMap,
      total,
      maxPossible,
      percentage,
      grade: hasEntry ? grade : "—",
      remark: hasEntry ? remark : "Pending",
      position: 0,
      hasEntry,
    };
  });

  // Compute Nigerian competition positions (1st, 1st, 3rd...) among students with entries
  const withScores = [...prelim]
    .filter((r) => r.hasEntry)
    .sort((a, b) => b.total - a.total);

  let currentRank = 1;
  withScores.forEach((item, index) => {
    const prev = index > 0 ? withScores[index - 1] : undefined;
    if (prev && item.total < prev.total) {
      currentRank = index + 1;
    }
    item.position = currentRank;
  });

  const classAverage =
    withScores.length > 0
      ? Number(
          (
            withScores.reduce((sum, r) => sum + r.percentage, 0) /
            withScores.length
          ).toFixed(1)
        )
      : 0;

  return { rows: prelim, classAverage };
}

export interface BroadsheetStudentRow {
  student: Student;
  subjectTotals: Record<
    string,
    { total: number; grade: string; hasEntry: boolean }
  >;
  grandTotal: number;
  subjectsCounted: number;
  averagePercentage: number;
  overallGrade: string;
  overallRemark: string;
  position: number;
}

export function computeClassBroadsheet(params: {
  students: Student[];
  subjects: Subject[];
  scores: ScoreRecord[];
  settings: SchoolSettings;
  classId: string;
  programmeId: ProgrammeId;
  session: string;
  term: string;
}): BroadsheetStudentRow[] {
  const {
    students,
    subjects,
    scores,
    settings,
    classId,
    programmeId,
    session,
    term,
  } = params;
  const progSubjects = subjects.filter((s) => s.programmeId === programmeId);
  const components = getGradingComponents(settings, programmeId, classId);
  const maxPerSubject = components.reduce((a, c) => a + c.maxScore, 0) || 100;

  const enrolled = students.filter(
    (s) => s.status === "Active" && s.programmeClasses?.[programmeId] === classId
  );

  const rows: BroadsheetStudentRow[] = enrolled.map((student) => {
    const subjectTotals: Record<
      string,
      { total: number; grade: string; hasEntry: boolean }
    > = {};
    let grandTotal = 0;
    let subjectsCounted = 0;

    progSubjects.forEach((sub) => {
      const rec = scores.find(
        (r) =>
          r.studentId === student.id &&
          r.subjectId === sub.id &&
          r.session === session &&
          r.term === term
      );
      if (rec) {
        const tot = components.reduce(
          (sum, comp) => sum + (Number(rec.scores[comp.id]) || 0),
          0
        );
        const pct = maxPerSubject > 0 ? (tot / maxPerSubject) * 100 : 0;
        const { grade } = evaluateGrade(pct, settings.grading.gradeBands);
        subjectTotals[sub.id] = { total: tot, grade, hasEntry: true };
        grandTotal += tot;
        subjectsCounted += 1;
      } else {
        subjectTotals[sub.id] = { total: 0, grade: "—", hasEntry: false };
      }
    });

    const maxAll = subjectsCounted * maxPerSubject;
    const averagePercentage =
      maxAll > 0 ? Number(((grandTotal / maxAll) * 100).toFixed(1)) : 0;
    const { grade, remark } = evaluateGrade(
      averagePercentage,
      settings.grading.gradeBands
    );

    return {
      student,
      subjectTotals,
      grandTotal,
      subjectsCounted,
      averagePercentage,
      overallGrade: subjectsCounted > 0 ? grade : "—",
      overallRemark: subjectsCounted > 0 ? remark : "No Scores",
      position: 0,
    };
  });

  const ranked = [...rows]
    .filter((r) => r.subjectsCounted > 0)
    .sort(
      (a, b) =>
        b.averagePercentage - a.averagePercentage ||
        b.grandTotal - a.grandTotal
    );

  let rank = 1;
  ranked.forEach((row, idx) => {
    const prev = idx > 0 ? ranked[idx - 1] : undefined;
    if (prev && row.averagePercentage < prev.averagePercentage) {
      rank = idx + 1;
    }
    row.position = rank;
  });

  return rows.sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    if (a.position) return -1;
    if (b.position) return 1;
    return a.student.fullName.localeCompare(b.student.fullName);
  });
}

export interface TermAttendanceSummary {
  daysOpened: number;
  daysPresent: number; // Present + Late (physically attended school)
  strictPresent: number;
  daysLate: number;
  daysAbsent: number;
  daysExcused: number;
  ratePercent: number;
}

export function computeStudentAttendanceSummary(params: {
  attendance: AttendanceEntry[];
  studentId: string;
  session: string;
  term: string;
  programmeId?: ProgrammeId | undefined;
  configuredDaysOpened: number;
}): TermAttendanceSummary {
  const {
    attendance,
    studentId,
    session,
    term,
    programmeId,
    configuredDaysOpened,
  } = params;
  const studentLogs = attendance.filter(
    (a) =>
      a.studentId === studentId &&
      a.session === session &&
      a.term === term &&
      (!programmeId || a.programmeId === programmeId)
  );

  const strictPresent = studentLogs.filter((a) => a.status === "Present").length;
  const daysLate = studentLogs.filter((a) => a.status === "Late").length;
  const daysAbsent = studentLogs.filter((a) => a.status === "Absent").length;
  const daysExcused = studentLogs.filter((a) => a.status === "Excused").length;
  const daysPresent = strictPresent + daysLate;

  const recordedCount = studentLogs.length;
  const daysOpened = Math.max(configuredDaysOpened || 0, recordedCount);
  const denominator = recordedCount > 0 ? recordedCount : daysOpened || 1;
  const ratePercent =
    recordedCount > 0 ? Math.round((daysPresent / denominator) * 100) : 0;

  return {
    daysOpened,
    daysPresent,
    strictPresent,
    daysLate,
    daysAbsent,
    daysExcused,
    ratePercent,
  };
}

export interface StudentInvoiceSummary {
  student: Student;
  invoiceProgrammeId: "combined" | ProgrammeId;
  programmeLabel: string;
  items: FeeScheduleItem[];
  grossSubtotal: number;
  siblingCount: number;
  siblingDiscountAmount: number;
  manualWaiverAmount: number;
  netPayable: number;
  amountPaid: number; // Confirmed payments
  pendingAmount: number; // Bank transfers awaiting confirmation
  balance: number;
  status: "Paid" | "Partial" | "Owing";
  payments: FeePayment[];
}

export function computeStudentInvoices(params: {
  student: Student;
  allStudents: Student[];
  feeItems: FeeScheduleItem[];
  payments: FeePayment[];
  settings: SchoolSettings;
  session: string;
  term: string;
  modeOverride?: "combined" | "separate";
}): StudentInvoiceSummary[] {
  const {
    student,
    allStudents,
    feeItems,
    payments,
    settings,
    session,
    term,
    modeOverride,
  } = params;

  const mode = modeOverride ?? settings.billingMode;
  const activeProgs = getActiveProgrammes(settings);
  const siblings = getStudentSiblings(allStudents, student);
  const siblingCount = siblings.length;
  const eligibleForSiblingDiscount =
    settings.siblingDiscount.enabled &&
    siblingCount >= settings.siblingDiscount.minChildren;

  const getItemsForProgramme = (progId: ProgrammeId): FeeScheduleItem[] => {
    const stuClassId = student.programmeClasses?.[progId];
    if (!stuClassId) return [];
    return feeItems.filter(
      (item) =>
        item.mandatory &&
        item.programmeId === progId &&
        (item.applicableClassIds.length === 0 ||
          item.applicableClassIds.includes(stuClassId))
    );
  };

  const progBuckets = activeProgs
    .map((prog) => ({
      programme: prog,
      items: getItemsForProgramme(prog.id),
    }))
    .filter((b) => b.items.length > 0);

  if (progBuckets.length === 0) return [];

  const termPayments = payments.filter(
    (p) => p.studentId === student.id && p.session === session && p.term === term
  );

  const buildSummary = (
    invoiceProgrammeId: "combined" | ProgrammeId,
    programmeLabel: string,
    items: FeeScheduleItem[],
    matchedPayments: FeePayment[],
    waiverShare: number
  ): StudentInvoiceSummary => {
    const grossSubtotal = items.reduce((s, i) => s + i.amount, 0);
    let siblingDiscountAmount = 0;
    if (eligibleForSiblingDiscount && grossSubtotal > 0) {
      if (settings.siblingDiscount.type === "percentage") {
        siblingDiscountAmount = Math.round(
          (grossSubtotal * settings.siblingDiscount.value) / 100
        );
      } else {
        siblingDiscountAmount = Math.min(
          grossSubtotal,
          settings.siblingDiscount.value
        );
      }
    }
    const manualWaiverAmount = Math.min(
      Math.max(0, grossSubtotal - siblingDiscountAmount),
      waiverShare
    );
    const netPayable = Math.max(
      0,
      grossSubtotal - siblingDiscountAmount - manualWaiverAmount
    );
    const confirmedPayments = matchedPayments.filter(
      (p) => p.confirmationStatus !== "Pending Confirmation"
    );
    const pendingPayments = matchedPayments.filter(
      (p) => p.confirmationStatus === "Pending Confirmation"
    );
    const amountPaid = confirmedPayments.reduce((s, p) => s + p.amount, 0);
    const pendingAmount = pendingPayments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, netPayable - amountPaid);
    const status: "Paid" | "Partial" | "Owing" =
      balance <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Owing";

    return {
      student,
      invoiceProgrammeId,
      programmeLabel,
      items,
      grossSubtotal,
      siblingCount,
      siblingDiscountAmount,
      manualWaiverAmount,
      netPayable,
      amountPaid,
      pendingAmount,
      balance,
      status,
      payments: matchedPayments,
    };
  };

  if (mode === "combined" || progBuckets.length === 1) {
    const allItems = progBuckets.flatMap((b) => b.items);
    const singleProg = progBuckets.length === 1 ? progBuckets[0]!.programme : null;
    const invoiceProgId: "combined" | ProgrammeId = singleProg
      ? singleProg.id
      : "combined";
    const label = singleProg
      ? singleProg.name
      : `Combined (${progBuckets.map((b) => b.programme.name).join(" + ")})`;

    return [
      buildSummary(
        invoiceProgId,
        label,
        allItems,
        termPayments,
        student.manualFeeWaiver ?? 0
      ),
    ];
  }

  // Separate invoices per programme
  const totalGross = progBuckets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.amount, 0),
    0
  );

  return progBuckets.map((bucket, idx) => {
    const bucketGross = bucket.items.reduce((s, i) => s + i.amount, 0);
    const bucketPayments = termPayments
      .filter(
        (p) =>
          p.invoiceProgrammeId === bucket.programme.id ||
          p.invoiceProgrammeId === "combined"
      )
      .map((p) =>
        p.invoiceProgrammeId === "combined" && totalGross > 0
          ? { ...p, amount: Math.round((p.amount * bucketGross) / totalGross) }
          : p
      );

    return buildSummary(
      bucket.programme.id,
      bucket.programme.name,
      bucket.items,
      bucketPayments,
      idx === 0 ? student.manualFeeWaiver ?? 0 : 0
    );
  });
}

export function computeStaffCompensation(salary: StaffMember["salary"]): {
  grossAdditions: number;
  totalDeductions: number;
  netSalary: number;
} {
  const grossAdditions =
    (Number(salary.teachingAllowance) || 0) +
    (Number(salary.overtime) || 0) +
    (Number(salary.transport) || 0);
  const totalDeductions =
    (Number(salary.absenceFines) || 0) +
    (Number(salary.pension) || 0) +
    (Number(salary.salaryAdvanceRepayment) || 0);
  const netSalary = Math.max(
    0,
    (Number(salary.baseSalary) || 0) + grossAdditions - totalDeductions
  );
  return { grossAdditions, totalDeductions, netSalary };
}

export function computeQuranProgressPercent(record?: QuranProgressRecord): number {
  if (!record) return 0;
  if (record.hizbCompleted > 0) {
    return Math.min(100, Math.round((record.hizbCompleted / 60) * 100));
  }
  return Math.min(100, Math.round((record.juzCompleted / TOTAL_QURAN_JUZ) * 100));
}

export function formatQuranCitation(record?: QuranProgressRecord): string {
  if (!record) return "Not started";
  const surah = getSurahByNumber(record.currentSurahNumber);
  return `${surah.number}. ${surah.transliteration} (${surah.arabicName}) : Ayah ${record.ayahFrom}–${record.ayahTo}`;
}

export function generateReceiptNumber(
  code: string,
  year: number,
  seq: number
): string {
  const cleanCode =
    (code || "SCH").toUpperCase().replace(/[^A-Z0-9]/g, "") || "SCH";
  const padded = String(seq).padStart(4, "0");
  return `${cleanCode}/${year}/${padded}`;
}

let activeTableExportFormat: "csv" | "xls" = "csv";

export function runAsExcelExport(callback: () => void): void {
  activeTableExportFormat = "xls";
  try {
    callback();
  } finally {
    activeTableExportFormat = "csv";
  }
}

function escapeExcelCellXml(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportRowsToExcelXls(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | undefined | null>>,
  sheetTitle = "NDH SchoolOS Export"
): void {
  if (typeof window === "undefined") return;
  const wsName =
    sheetTitle.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Export";
  const colXml = headers
    .map((h) => `<Column ss:AutoFitWidth="1" ss:Width="${Math.max(95, Math.min(240, h.length * 9 + 28))}"/>`)
    .join("");
  const headXml = `<Row ss:Height="22">${headers
    .map(
      (h) =>
        `<Cell ss:StyleID="Head"><Data ss:Type="String">${escapeExcelCellXml(
          h
        )}</Data></Cell>`
    )
    .join("")}</Row>`;
  const bodyXml = rows
    .map(
      (row) =>
        `<Row ss:Height="18">${headers
          .map((_, idx) => {
            const v = row[idx];
            if (typeof v === "number" && Number.isFinite(v)) {
              return `<Cell ss:StyleID="Num"><Data ss:Type="Number">${v}</Data></Cell>`;
            }
            const s = v === null || v === undefined ? "" : String(v);
            return `<Cell ss:StyleID="Body"><Data ss:Type="String">${escapeExcelCellXml(
              s
            )}</Data></Cell>`;
          })
          .join("")}</Row>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="10"/></Style>
  <Style ss:ID="Head"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0C2340" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Body"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
  <Style ss:ID="Num"><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
 </Styles>
 <Worksheet ss:Name="${escapeExcelCellXml(wsName)}">
  <Table>${colXml}${headXml}${bodyXml}</Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/\.(csv|xls|xlsx)$/i, "") + ".xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | undefined | null>>
): void {
  if (typeof window === "undefined") return;
  if (activeTableExportFormat === "xls") {
    exportRowsToExcelXls(filename, headers, rows);
    return;
  }
  const escapeCell = (val: string | number | undefined | null): string => {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvBody = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvBody], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
