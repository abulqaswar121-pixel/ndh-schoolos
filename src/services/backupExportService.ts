import {
  computeClassBroadsheet,
  computeStudentInvoices,
  evaluateGrade,
  getActiveProgrammes,
  getGradingComponents,
  getStudentClassName,
} from "./calculations";
import type { SchoolDatabaseSnapshot, UserRole } from "@/types/school";

/**
 * Offline Backup, Local Rolling Snapshot Vault (IndexedDB + LocalStorage fallback)
 * & Multi-Format Export Engine (Multi-Sheet Excel .xls, Single-Sheet Excel .xls, CSV, JSON)
 */

const IDB_NAME = "ndh_schoolos_vault_v3";
const IDB_VERSION = 1;
const STORE_MIRROR = "db_mirror";
const STORE_SNAPSHOTS = "rolling_snapshots";
const LS_SNAPSHOTS_FALLBACK_KEY = "ndh_schoolos_snapshots_v3";
const MAX_LOCAL_SNAPSHOTS = 8;

export interface LocalSnapshotRecord {
  id: string;
  label: string;
  createdAt: string;
  schoolName: string;
  session: string;
  term: string;
  studentCount: number;
  scoreCount: number;
  paymentCount: number;
  checksum: string;
  snapshot: SchoolDatabaseSnapshot;
}

export interface BackupEnvelope {
  format: "ndh-schoolos-backup";
  schemaVersion: number;
  exportedAt: string;
  schoolName: string;
  schoolCode: string;
  session: string;
  term: string;
  checksum: string;
  counts: {
    students: number;
    classes: number;
    subjects: number;
    scores: number;
    attendance: number;
    payments: number;
    staff: number;
  };
  snapshot: SchoolDatabaseSnapshot;
}

export interface ExcelWorksheetSpec {
  name: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  headers: string[];
  rows: Array<Array<string | number | undefined | null>>;
}

export function computeFastChecksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_MIRROR)) {
          db.createObjectStore(STORE_MIRROR);
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function mirrorDatabaseToIndexedDB(
  snapshot: SchoolDatabaseSnapshot
): Promise<void> {
  const idb = await openVaultDb();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_MIRROR, "readwrite");
      tx.objectStore(STORE_MIRROR).put(snapshot, "latest");
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        resolve();
      };
    } catch {
      idb.close();
      resolve();
    }
  });
}

function readFallbackSnapshots(): LocalSnapshotRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_SNAPSHOTS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalSnapshotRecord[]) : [];
  } catch {
    return [];
  }
}

function writeFallbackSnapshots(list: LocalSnapshotRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_SNAPSHOTS_FALLBACK_KEY,
      JSON.stringify(list.slice(0, 4))
    );
  } catch {
    // Ignore localStorage quota limits when IndexedDB holds full snapshots
  }
}

export async function listLocalSnapshots(): Promise<LocalSnapshotRecord[]> {
  const idb = await openVaultDb();
  if (!idb) {
    return readFallbackSnapshots().sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(STORE_SNAPSHOTS, "readonly");
      const req = tx.objectStore(STORE_SNAPSHOTS).getAll();
      req.onsuccess = () => {
        idb.close();
        const items = Array.isArray(req.result)
          ? (req.result as LocalSnapshotRecord[])
          : [];
        if (items.length === 0) {
          resolve(
            readFallbackSnapshots().sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt)
            )
          );
          return;
        }
        resolve(
          items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      };
      req.onerror = () => {
        idb.close();
        resolve(readFallbackSnapshots());
      };
    } catch {
      idb.close();
      resolve(readFallbackSnapshots());
    }
  });
}

export async function createLocalSnapshot(
  snapshot: SchoolDatabaseSnapshot,
  label: string
): Promise<LocalSnapshotRecord> {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as SchoolDatabaseSnapshot;
  const serialized = JSON.stringify(cloned);
  const record: LocalSnapshotRecord = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: label.trim() || "Manual Restore Point",
    createdAt: new Date().toISOString(),
    schoolName: cloned.settings.name,
    session: cloned.settings.currentSession,
    term: cloned.settings.currentTerm,
    studentCount: cloned.students.length,
    scoreCount: cloned.scores.length,
    paymentCount: cloned.payments.length,
    checksum: computeFastChecksum(serialized),
    snapshot: cloned,
  };

  const existing = await listLocalSnapshots();
  const nextList = [record, ...existing].slice(0, MAX_LOCAL_SNAPSHOTS);
  writeFallbackSnapshots(nextList);

  const idb = await openVaultDb();
  if (idb) {
    await new Promise<void>((resolve) => {
      try {
        const tx = idb.transaction(STORE_SNAPSHOTS, "readwrite");
        const store = tx.objectStore(STORE_SNAPSHOTS);
        store.clear();
        nextList.forEach((item) => store.put(item));
        tx.oncomplete = () => {
          idb.close();
          resolve();
        };
        tx.onerror = () => {
          idb.close();
          resolve();
        };
      } catch {
        idb.close();
        resolve();
      }
    });
  }

  return record;
}

export async function deleteLocalSnapshot(id: string): Promise<void> {
  const existing = await listLocalSnapshots();
  const filtered = existing.filter((s) => s.id !== id);
  writeFallbackSnapshots(filtered);

  const idb = await openVaultDb();
  if (!idb) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = idb.transaction(STORE_SNAPSHOTS, "readwrite");
      tx.objectStore(STORE_SNAPSHOTS).delete(id);
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        resolve();
      };
    } catch {
      idb.close();
      resolve();
    }
  });
}

function triggerFileDownload(
  blob: Blob,
  filename: string
): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildBackupEnvelope(
  snapshot: SchoolDatabaseSnapshot
): BackupEnvelope {
  const serialized = JSON.stringify(snapshot);
  return {
    format: "ndh-schoolos-backup",
    schemaVersion: snapshot.version,
    exportedAt: new Date().toISOString(),
    schoolName: snapshot.settings.name,
    schoolCode: snapshot.settings.code,
    session: snapshot.settings.currentSession,
    term: snapshot.settings.currentTerm,
    checksum: computeFastChecksum(serialized),
    counts: {
      students: snapshot.students.length,
      classes: snapshot.classes.length,
      subjects: snapshot.subjects.length,
      scores: snapshot.scores.length,
      attendance: snapshot.attendance.length,
      payments: snapshot.payments.length,
      staff: snapshot.staff.length,
    },
    snapshot,
  };
}

export function downloadFullSchoolBackup(
  snapshot: SchoolDatabaseSnapshot
): BackupEnvelope {
  const envelope = buildBackupEnvelope(snapshot);
  const safeCode = (snapshot.settings.code || "school")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const datePart = envelope.exportedAt.slice(0, 10);
  const filename = `${safeCode}-backup-${datePart}.ndhbackup.json`;
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  triggerFileDownload(blob, filename);
  return envelope;
}

export function parseAndValidateBackupJson(rawText: string): {
  ok: true;
  envelope: BackupEnvelope;
  checksumVerified: boolean;
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(rawText) as Partial<BackupEnvelope> &
      Partial<SchoolDatabaseSnapshot>;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "Invalid JSON backup file." };
    }

    const candidateSnapshot = (
      parsed.format === "ndh-schoolos-backup" && parsed.snapshot
        ? parsed.snapshot
        : parsed
    ) as Partial<SchoolDatabaseSnapshot>;

    if (
      !candidateSnapshot ||
      typeof candidateSnapshot !== "object" ||
      !candidateSnapshot.settings ||
      typeof candidateSnapshot.settings.name !== "string" ||
      !Array.isArray(candidateSnapshot.classes) ||
      !Array.isArray(candidateSnapshot.subjects) ||
      !Array.isArray(candidateSnapshot.students) ||
      !Array.isArray(candidateSnapshot.scores)
    ) {
      return {
        ok: false,
        error:
          "File does not match the NDH SchoolOS backup format (missing required school tables).",
      };
    }

    const normalizedSnapshot: SchoolDatabaseSnapshot = {
      version: 3,
      settings: candidateSnapshot.settings,
      classes: candidateSnapshot.classes,
      subjects: candidateSnapshot.subjects,
      students: candidateSnapshot.students,
      scores: candidateSnapshot.scores,
      termLocks: Array.isArray(candidateSnapshot.termLocks)
        ? candidateSnapshot.termLocks
        : [],
      pendingScoreEdits: Array.isArray(candidateSnapshot.pendingScoreEdits)
        ? candidateSnapshot.pendingScoreEdits
        : [],
      auditLogs: Array.isArray(candidateSnapshot.auditLogs)
        ? candidateSnapshot.auditLogs
        : [],
      quranRecords: Array.isArray(candidateSnapshot.quranRecords)
        ? candidateSnapshot.quranRecords
        : [],
      affective: Array.isArray(candidateSnapshot.affective)
        ? candidateSnapshot.affective
        : [],
      attendance: Array.isArray(candidateSnapshot.attendance)
        ? candidateSnapshot.attendance
        : [],
      feeItems: Array.isArray(candidateSnapshot.feeItems)
        ? candidateSnapshot.feeItems
        : [],
      payments: Array.isArray(candidateSnapshot.payments)
        ? candidateSnapshot.payments
        : [],
      parentNotices: Array.isArray(candidateSnapshot.parentNotices)
        ? candidateSnapshot.parentNotices
        : [],
      staff: Array.isArray(candidateSnapshot.staff)
        ? candidateSnapshot.staff
        : [],
      payroll: Array.isArray(candidateSnapshot.payroll)
        ? candidateSnapshot.payroll
        : [],
    };

    const computedChecksum = computeFastChecksum(
      JSON.stringify(candidateSnapshot)
    );
    const providedChecksum =
      typeof parsed.checksum === "string" ? parsed.checksum : computedChecksum;

    const envelope: BackupEnvelope = {
      format: "ndh-schoolos-backup",
      schemaVersion: 3,
      exportedAt:
        typeof parsed.exportedAt === "string"
          ? parsed.exportedAt
          : new Date().toISOString(),
      schoolName: normalizedSnapshot.settings.name,
      schoolCode: normalizedSnapshot.settings.code || "SCH",
      session: normalizedSnapshot.settings.currentSession,
      term: normalizedSnapshot.settings.currentTerm,
      checksum: computedChecksum,
      counts: {
        students: normalizedSnapshot.students.length,
        classes: normalizedSnapshot.classes.length,
        subjects: normalizedSnapshot.subjects.length,
        scores: normalizedSnapshot.scores.length,
        attendance: normalizedSnapshot.attendance.length,
        payments: normalizedSnapshot.payments.length,
        staff: normalizedSnapshot.staff.length,
      },
      snapshot: normalizedSnapshot,
    };

    return {
      ok: true,
      envelope,
      checksumVerified: providedChecksum === computedChecksum,
    };
  } catch {
    return {
      ok: false,
      error: "Could not parse file. Please choose a valid .json or .ndhbackup.json file.",
    };
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeSheetName(raw: string, fallbackIndex: number): string {
  const cleaned = raw
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || `Sheet ${fallbackIndex + 1}`;
}

export function buildSpreadsheetXmlWorkbook(
  sheets: ExcelWorksheetSpec[],
  headerHexColor = "#0C2340"
): string {
  const usedNames = new Set<string>();

  const worksheetsXml = sheets
    .map((sheet, idx) => {
      let wsName = sanitizeSheetName(sheet.name, idx);
      if (usedNames.has(wsName)) {
        wsName = `${wsName.slice(0, 27)} (${idx + 1})`;
      }
      usedNames.add(wsName);

      const colCount = Math.max(1, sheet.headers.length);
      const colWidthsXml = sheet.headers
        .map((h) => {
          const width = Math.max(95, Math.min(240, h.length * 9 + 28));
          return `<Column ss:AutoFitWidth="1" ss:Width="${width}"/>`;
        })
        .join("");

      const titleRowsXml: string[] = [];
      if (sheet.title) {
        titleRowsXml.push(
          `<Row ss:Height="24"><Cell ss:MergeAcross="${
            colCount - 1
          }" ss:StyleID="TitleCell"><Data ss:Type="String">${escapeXml(
            sheet.title
          )}</Data></Cell></Row>`
        );
      }
      if (sheet.subtitle) {
        titleRowsXml.push(
          `<Row ss:Height="18"><Cell ss:MergeAcross="${
            colCount - 1
          }" ss:StyleID="SubtitleCell"><Data ss:Type="String">${escapeXml(
            sheet.subtitle
          )}</Data></Cell></Row>`
        );
      }

      const headerXml = `<Row ss:Height="22">${sheet.headers
        .map(
          (h) =>
            `<Cell ss:StyleID="HeaderCell"><Data ss:Type="String">${escapeXml(
              h
            )}</Data></Cell>`
        )
        .join("")}</Row>`;

      const dataRowsXml = sheet.rows
        .map((row, rIdx) => {
          const rowStyle = rIdx % 2 === 1 ? "AltDataCell" : "DataCell";
          const numStyle = rIdx % 2 === 1 ? "AltNumCell" : "NumCell";
          const cells = sheet.headers
            .map((_, cIdx) => {
              const rawVal = row[cIdx];
              if (
                typeof rawVal === "number" &&
                Number.isFinite(rawVal)
              ) {
                return `<Cell ss:StyleID="${numStyle}"><Data ss:Type="Number">${rawVal}</Data></Cell>`;
              }
              const strVal =
                rawVal === null || rawVal === undefined ? "" : String(rawVal);
              return `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(
                strVal
              )}</Data></Cell>`;
            })
            .join("");
          return `<Row ss:Height="18">${cells}</Row>`;
        })
        .join("");

      return `<Worksheet ss:Name="${escapeXml(wsName)}"><Table>${colWidthsXml}${titleRowsXml.join(
        ""
      )}${headerXml}${dataRowsXml}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="TitleCell">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="${escapeXml(
     headerHexColor
   )}"/>
  </Style>
  <Style ss:ID="SubtitleCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="HeaderCell">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="${escapeXml(headerHexColor)}" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders>
  </Style>
  <Style ss:ID="AltDataCell">
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders>
  </Style>
  <Style ss:ID="NumCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders>
  </Style>
  <Style ss:ID="AltNumCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders>
  </Style>
 </Styles>
 ${worksheetsXml}
</Workbook>`;
}

export function exportSpreadsheetWorkbookXls(
  filename: string,
  sheets: ExcelWorksheetSpec[],
  headerHexColor = "#0C2340"
): void {
  const xml = buildSpreadsheetXmlWorkbook(sheets, headerHexColor);
  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const cleanName = filename.replace(/\.(csv|xls|xlsx)$/i, "") + ".xls";
  triggerFileDownload(blob, cleanName);
}

export function exportDatasetAsJson(
  filename: string,
  payload: unknown
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const cleanName = filename.replace(/\.json$/i, "") + ".json";
  triggerFileDownload(blob, cleanName);
}

/**
 * Builds role-authorized multi-sheet Excel worksheets from an already RBAC-filtered snapshot.
 */
export function buildMasterSchoolWorkbookSheets(
  scopedDb: SchoolDatabaseSnapshot,
  role: UserRole
): ExcelWorksheetSpec[] {
  const { settings, classes, subjects, students, scores, attendance, feeItems, payments, staff, payroll, auditLogs } =
    scopedDb;
  const session = settings.currentSession;
  const term = settings.currentTerm;
  const periodSubtitle = `${settings.name} • ${session} (${term})`;
  const activeProgs = getActiveProgrammes(settings);
  const mainProgId = activeProgs[0]?.id ?? "prog-main";

  const sheets: ExcelWorksheetSpec[] = [];

  // 1. Summary Sheet
  sheets.push({
    name: "School Summary",
    title: `${settings.name} — School Data Workbook`,
    subtitle: `Exported ${new Date().toISOString().slice(0, 10)} • ${session} • ${term}`,
    headers: ["Metric", "Value"],
    rows: [
      ["School Name", settings.name],
      ["School Code", settings.code],
      ["Active Session", session],
      ["Active Term", term],
      ["Active Students", students.filter((s) => s.status === "Active").length],
      ["Total Classes", classes.length],
      ["Total Subjects", subjects.length],
      ["Score Entries (All Terms)", scores.length],
      ["Attendance Records", attendance.length],
      ...(role === "admin" || role === "bursar"
        ? ([
            ["Confirmed Payments", payments.filter((p) => p.confirmationStatus === "Confirmed").length],
            ["Staff Members", staff.length],
          ] as Array<[string, number]>)
        : []),
    ],
  });

  // 2. Students Register
  sheets.push({
    name: "Students Register",
    title: "Students Admission & Guardian Register",
    subtitle: periodSubtitle,
    headers: [
      "Admission ID",
      "Full Name",
      "Gender",
      "Date of Birth",
      settings.labels.classSingular,
      "Status",
      "Guardian Name",
      "Guardian Phone",
      "Guardian Email",
      "Home Address",
    ],
    rows: students.map((s) => [
      s.admissionId,
      s.fullName,
      s.gender,
      s.dateOfBirth,
      getStudentClassName(s, classes, settings),
      s.status,
      s.guardianName,
      s.parentPhone,
      s.parentEmail,
      s.homeAddress,
    ]),
  });

  // 3. Classes & Subjects
  sheets.push({
    name: "Classes & Subjects",
    title: "Configured Classes & Subjects",
    subtitle: periodSubtitle,
    headers: ["Record Type", "Code / Order", "Name", "Programme", "Details"],
    rows: [
      ...classes.map((c) => [
        settings.labels.classSingular,
        c.levelOrder,
        c.name,
        settings.programmes.find((p) => p.id === c.programmeId)?.name ?? "Main School",
        c.room ?? "",
      ]),
      ...subjects.map((sub) => [
        "Subject",
        sub.code,
        sub.name,
        settings.programmes.find((p) => p.id === sub.programmeId)?.name ?? "Main School",
        sub.isCore ? "Core" : "Elective",
      ]),
    ],
  });

  // 4. Term Scores & Grades
  if (role === "admin" || role === "class_teacher" || role === "subject_teacher") {
    const comps = getGradingComponents(settings, mainProgId);
    const maxScore = comps.reduce((s, c) => s + c.maxScore, 0) || 100;
    sheets.push({
      name: "Scores & Grades",
      title: `Subject Scores & Grades (${session} • ${term})`,
      subtitle: periodSubtitle,
      headers: [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Subject",
        ...comps.map((c) => `${c.label} (${c.maxScore})`),
        `Total (${maxScore})`,
        "Grade",
        "Remark",
      ],
      rows: scores
        .filter((r) => r.session === session && r.term === term)
        .map((rec) => {
          const st = students.find((s) => s.id === rec.studentId);
          const cls = classes.find((c) => c.id === rec.classId);
          const sub = subjects.find((s) => s.id === rec.subjectId);
          const compVals = comps.map((c) => Number(rec.scores[c.id] ?? 0));
          const tot = compVals.reduce((a, b) => a + b, 0);
          const pct = (tot / maxScore) * 100;
          const { grade, remark } = evaluateGrade(pct, settings.grading.gradeBands);
          return [
            st?.admissionId ?? rec.studentId,
            st?.fullName ?? "—",
            cls?.name ?? "—",
            sub?.name ?? rec.subjectId,
            ...compVals,
            tot,
            grade,
            remark,
          ];
        }),
    });

    // 5. Class Broadsheet Rollup
    const broadsheetRowsAll: Array<Array<string | number>> = [];
    for (const cls of classes.filter((c) => c.programmeId === mainProgId)) {
      const bRows = computeClassBroadsheet({
        students,
        subjects,
        scores,
        settings,
        classId: cls.id,
        programmeId: mainProgId,
        session,
        term,
      });
      for (const r of bRows) {
        broadsheetRowsAll.push([
          cls.name,
          r.student.admissionId,
          r.student.fullName,
          r.subjectsCounted,
          r.grandTotal,
          r.averagePercentage,
          r.overallGrade,
          r.overallRemark,
          r.position || "—",
        ]);
      }
    }
    sheets.push({
      name: "Broadsheet Summary",
      title: `Termly Class Broadsheet Summary (${session} • ${term})`,
      subtitle: periodSubtitle,
      headers: [
        settings.labels.classSingular,
        "Admission ID",
        "Student Name",
        "Subjects Graded",
        "Grand Total",
        "Average (%)",
        "Final Grade",
        "Remark",
        "Class Position",
      ],
      rows: broadsheetRowsAll,
    });
  }

  // 6. Attendance Log
  sheets.push({
    name: "Attendance",
    title: `Attendance Records (${session} • ${term})`,
    subtitle: periodSubtitle,
    headers: ["Date", settings.labels.classSingular, "Admission ID", "Student Name", "Status", "Note"],
    rows: attendance
      .filter((a) => a.session === session && a.term === term)
      .map((a) => {
        const st = students.find((s) => s.id === a.studentId);
        const cls = classes.find((c) => c.id === a.classId);
        return [
          a.date,
          cls?.name ?? "—",
          st?.admissionId ?? a.studentId,
          st?.fullName ?? "—",
          a.status,
          a.note ?? "",
        ];
      }),
  });

  // 7 & 8 & 9. Finance & Payroll (Admin & Bursar only)
  if (role === "admin" || role === "bursar") {
    const feeRows: Array<Array<string | number>> = [];
    for (const st of students.filter((s) => s.status === "Active")) {
      const invs = computeStudentInvoices({
        student: st,
        allStudents: students,
        feeItems,
        payments,
        settings,
        session,
        term,
      });
      for (const inv of invs) {
        feeRows.push([
          st.admissionId,
          st.fullName,
          getStudentClassName(st, classes, settings),
          st.guardianName,
          st.parentPhone,
          inv.grossSubtotal,
          inv.siblingDiscountAmount + inv.manualWaiverAmount,
          inv.netPayable,
          inv.amountPaid,
          inv.balance,
          inv.status,
        ]);
      }
    }

    sheets.push({
      name: "Fee Ledger & Debtors",
      title: `Term Fee Billing & Debtors Ledger (${settings.currencyCode})`,
      subtitle: periodSubtitle,
      headers: [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Guardian",
        "Guardian Phone",
        `Gross Bill (${settings.currencySymbol})`,
        `Discounts/Waivers (${settings.currencySymbol})`,
        `Net Payable (${settings.currencySymbol})`,
        `Amount Paid (${settings.currencySymbol})`,
        `Balance Owing (${settings.currencySymbol})`,
        "Status",
      ],
      rows: feeRows,
    });

    sheets.push({
      name: "Payment Receipts",
      title: "Official Fee Payment & Transfer Receipts",
      subtitle: periodSubtitle,
      headers: [
        "Receipt No",
        "Date",
        "Admission ID",
        "Student Name",
        `Amount (${settings.currencySymbol})`,
        "Method",
        "Confirmation Status",
        "Reference",
        "Recorded By",
      ],
      rows: payments.map((p) => {
        const st = students.find((s) => s.id === p.studentId);
        return [
          p.receiptNumber,
          p.date,
          st?.admissionId ?? p.studentId,
          st?.fullName ?? "—",
          p.amount,
          p.method,
          p.confirmationStatus,
          p.reference,
          p.recordedBy,
        ];
      }),
    });

    sheets.push({
      name: "Staff & Payroll",
      title: "Staff Directory & Monthly Payroll Ledger",
      subtitle: periodSubtitle,
      headers: [
        "Staff ID",
        "Full Name",
        "Role",
        "Phone",
        "Bank Name",
        "Account Number",
        `Base Salary (${settings.currencySymbol})`,
        `Allowances (${settings.currencySymbol})`,
        `Deductions (${settings.currencySymbol})`,
        `Net Salary (${settings.currencySymbol})`,
        "Latest Payroll Status",
      ],
      rows: staff.map((m) => {
        const latestPay = payroll.find((pr) => pr.staffId === m.id);
        const grossAdd =
          m.salary.teachingAllowance + m.salary.overtime + m.salary.transport;
        const totDed =
          m.salary.absenceFines +
          m.salary.pension +
          m.salary.salaryAdvanceRepayment;
        const net = Math.max(0, m.salary.baseSalary + grossAdd - totDed);
        return [
          m.staffCode,
          m.fullName,
          m.role,
          m.phone,
          m.bankName,
          m.accountNumber,
          m.salary.baseSalary,
          grossAdd,
          totDed,
          latestPay ? latestPay.netSalary : net,
          latestPay ? `${latestPay.monthLabel}: ${latestPay.status}` : "Configured",
        ];
      }),
    });
  }

  // 10. Audit Log (Admin Only)
  if (role === "admin") {
    sheets.push({
      name: "Audit Log",
      title: "Tamper-Evident Administrative Audit Log",
      subtitle: periodSubtitle,
      headers: [
        "Timestamp",
        "Actor",
        "Role",
        "Category",
        "Action",
        "Target",
        "Old Value",
        "New Value",
      ],
      rows: auditLogs.map((l) => [
        l.timestamp,
        l.actorName,
        l.actorRole,
        l.category,
        l.action,
        l.targetLabel,
        l.oldValue,
        l.newValue,
      ]),
    });
  }

  return sheets;
}
