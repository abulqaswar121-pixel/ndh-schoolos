import type { SchoolDatabaseSnapshot } from "@/types/school";
import { getResolvedCustomization, getReportFontStack, resolveReportCardRemarks } from "@/services/customizationDefaults";

/**
 * Report sheet that copies the Markazus-Salaf Excel "Result" sheet layout:
 * school header, student details grid with attendance, CA1/CA2/Exam table
 * with Grade/Effort/Remark, expected vs learner's mark, 10 affective traits
 * and the Excel formula comments for class teacher and head teacher.
 */

export interface HalqahExcelSubjectRow {
  id: string;
  subjectName: string;
  compValues: number[];
  total: number;
  grade: string;
  hasEntry: boolean;
}

export interface HalqahExcelReportProps {
  db: SchoolDatabaseSnapshot;
  session: string;
  term: string;
  student: { fullName: string; admissionId: string; gender: string; photoUrl?: string | undefined };
  halqahName: string;
  className: string;
  componentLabels: string[];
  maxPerSubject?: number;
  groupLabels?: Array<{ label: string; name: string }>;
  teacherRemark?: string | undefined;
  headRemark?: string | undefined;
  subjectRows: HalqahExcelSubjectRow[];
  learnerAverage: number;
  classAverage: number;
  overallGrade: string;
  attendance: { daysOpened: number; daysPresent: number; daysAbsent: number };
  traits: { punctuality: number; neatness: number; politeness: number; honesty: number };
}

const EFFORT: Record<string, { effort: number; remark: string }> = {
  A: { effort: 5, remark: "Excellent" },
  B: { effort: 4, remark: "Very Good" },
  C: { effort: 3, remark: "Good" },
  D: { effort: 2, remark: "Fair" },
  E: { effort: 1, remark: "Poor" },
  F: { effort: 1, remark: "Poor" },
};

/** Head teacher comment — based on learner's total marks (Excel cell I42). */
export function headTeacherCommentFromTotal(total: number): string {
  if (total >= 500) return "A good student always attentive in class.";
  if (total >= 400) return "A good student ready to learn.";
  if (total >= 300) return "A good student always trying to achieve the best.";
  if (total >= 250) return "A good student needs to buckle up.";
  if (total >= 200) return "A good student needs to stop playing.";
  return "A good student needs to wake up.";
}

/** Class teacher comment — based on learner's average % (Excel cell C19). */
export function classTeacherCommentFromAverage(avg: number): string {
  if (avg >= 70) return "An excellent result, there is always room for more improvement. Keep it up!";
  if (avg >= 60) return "An interesting result, there is always room for more improvement. Keep it up!";
  if (avg >= 50) return "An average result, there is always room for more improvement. Keep the ball rolling!";
  if (avg >= 45) return "A fair result, you need to buckle up next term. Keep trying!";
  return "An unintresting result, you need to wake up and stop playing alot.";
}

const cell = "border border-foreground/70 px-2 py-1";

export function RegisterGridReportDetails(p: HalqahExcelReportProps) {
  const { settings } = p.db;
  const customization = getResolvedCustomization(settings);
  const design = customization.reportSheet;
  const learnerMark = p.subjectRows.reduce((s, r) => s + r.total, 0);
  const expectedMark = p.subjectRows.length * (p.maxPerSubject || 100);
  const comments = resolveReportCardRemarks({ customization, overallGrade: p.overallGrade, averagePercentage: p.learnerAverage, studentName: p.student.fullName, manualTeacherRemark: p.teacherRemark, manualPrincipalRemark: p.headRemark });
  const traitRows: Array<[string, number, number]> = [
    ["Punctuality", Math.min(p.traits.punctuality, 4), 4],
    ["Attendance", 0, 5],
    ["Reliability", 0, 5],
    ["Neatness", p.traits.neatness, 5],
    ["Politeness", p.traits.politeness, 5],
    ["Honesty", p.traits.honesty, 5],
    ["Relationship with pupils", 0, 5],
    ["Self-control", 0, 5],
    ["Attentiveness", 0, 5],
    ["Perseverance", 0, 5],
  ];
  const details: Array<[string, string, string, string]> = [
    ["Name of Learner:", p.student.fullName, "Term:", p.term.toUpperCase()],
    ["Sex:", p.student.gender, "Session:", p.session],
    ...(design.showProgrammeClasses ? (p.groupLabels || []).map((g): [string,string,string,string] => [`${g.label}:`, g.name, "", ""]) : []),
    ["Final Grade:", p.overallGrade, "ATTENDANCE", ""],
    ["Class Average:", `${p.classAverage.toFixed(1)}%`, "Days School Open:", String(p.attendance.daysOpened)],
    ["Learner's Average:", `${p.learnerAverage.toFixed(1)}%`, "Day(s) Present:", String(p.attendance.daysPresent)],
    ["No. of Subject:", String(p.subjectRows.length), "Day(s) Absent:", String(p.attendance.daysAbsent)],
  ];

  return (
    <div
      className="report-register text-[12px] text-foreground"
      style={{ fontFamily: getReportFontStack(design.fontFamily) }}
    >
      <div className="flex items-center gap-4 border-b-2 border-foreground pb-2">
        {settings.logoDataUrl ? (
          <img src={settings.logoDataUrl} alt="School logo" className="h-20 w-20 object-contain" />
        ) : null}
        <div className="flex-1 text-center">
          <h1 className="text-[15px] font-extrabold uppercase leading-tight">{settings.name}</h1>
          {settings.motto ? <p className="font-semibold italic">Motto: {settings.motto}</p> : null}
          {settings.address ? <p className="uppercase">{settings.address}</p> : null}
        </div>
        {design.showStudentPhotoBox && <div className="flex h-20 w-16 shrink-0 items-center justify-center border border-border">{p.student.photoUrl ? <img src={p.student.photoUrl} alt={p.student.fullName} className="h-full w-full object-cover" /> : <span className="text-xs">Photo</span>}</div>}
      </div>
      <h2 className="my-2 text-center text-[13px] font-bold uppercase underline">
        {design.customReportTitle || "Report Sheet"} for {p.term} {p.session} Academic Session
      </h2>
      <div className="mb-2 flex justify-between font-semibold">
        <span>Admission No: {p.student.admissionId}</span>
        {design.showNextTermDate && design.nextTermBegins ? <span>Next Term Begins: {design.nextTermBegins}</span> : null}
      </div>

      <table className="mb-3 w-full border-collapse">
        <thead>
          <tr><th colSpan={4} className={`${cell} bg-muted text-left`}>STUDENT DETAILS</th></tr>
        </thead>
        <tbody>
          {details.filter((r) => design.showAttendanceSummary || !r[2].includes("Day") && r[2] !== "ATTENDANCE").map(([a, b, c, d]) => (
            <tr key={a}>
              <td className={`${cell} w-[22%] font-semibold`}>{a}</td>
              <td className={`${cell} w-[28%]`}>{b}</td>
              <td className={`${cell} w-[22%] font-semibold`}>{c}</td>
              <td className={`${cell} w-[28%]`}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mb-2 w-full border-collapse text-center">
        <thead className="bg-muted">
          <tr>
            <th className={`${cell} text-left`}>SUBJECT</th>
            {p.componentLabels.map((l) => (<th key={l} className={cell}>{l}</th>))}
            <th className={cell}>TOTAL ({p.maxPerSubject || 100})</th>
            <th className={cell}>GRADE</th>
            {design.showEffortColumn && <th className={cell}>EFFORT</th>}
            {design.showSubjectRemarks && <th className={cell}>REMARK</th>}
          </tr>
        </thead>
        <tbody>
          {p.subjectRows.map((r) => {
            const e = EFFORT[r.grade] ?? { effort: 1, remark: "Poor" };
            return (
              <tr key={r.id}>
                <td className={`${cell} text-left font-semibold`}>{r.subjectName}</td>
                {r.compValues.map((v, i) => (<td key={i} className={cell}>{r.hasEntry ? v : ""}</td>))}
                <td className={`${cell} font-bold`}>{r.hasEntry ? r.total : ""}</td>
                <td className={cell}>{r.hasEntry ? r.grade : ""}</td>
                {design.showEffortColumn && <td className={cell}>{r.hasEntry ? e.effort : ""}</td>}
                {design.showSubjectRemarks && <td className={cell}>{r.hasEntry ? e.remark : ""}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-3 flex justify-between gap-4">
        {design.showGradingKey && <p className="font-semibold">
          GRADE DETAILS: {settings.grading.gradeBands.map((b) => `${b.grade} = ${b.min}–${b.max}`).join(", ")}
        </p>}
        {design.showExpectedMarks && <div className="shrink-0 text-right font-semibold">
          <p>Expected Mark: {expectedMark}</p>
          <p>Learner&apos;s Mark: {learnerMark}</p>
        </div>}
      </div>

      {design.showAffectiveSkills && <div className="mb-3 grid grid-cols-2 gap-4">
        <table className="w-full border-collapse">
          <thead className="bg-muted">
            <tr><th className={`${cell} text-left`}>AFFECTIVE TRAITS</th><th className={cell}>RATING</th></tr>
          </thead>
          <tbody>
            {traitRows.filter(([n]) => design.extendedTraits || ["Punctuality", "Neatness", "Politeness", "Honesty"].includes(n)).map(([n, v, m]) => (
              <tr key={n}><td className={cell}>{n}</td><td className={`${cell} text-center`}>{v ? `${v} / ${m}` : "—"}</td></tr>
            ))}
          </tbody>
        </table>
        <table className="h-fit w-full border-collapse">
          <thead className="bg-muted"><tr><th colSpan={2} className={cell}>SCALE</th></tr></thead>
          <tbody>
            {[["5", "Excellence"], ["4", "Very Good"], ["3", "Good"], ["2", "Fair"], ["1", "Poor"]].map(([k, v]) => (
              <tr key={k}><td className={`${cell} text-center`}>{k}</td><td className={cell}>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>}

      <div className="space-y-2">
        <p><span className="font-bold">Class Teacher&apos;s Comment: </span>{comments.teacherRemark}</p>
        <p><span className="font-bold">{design.principalTitleLabel}&apos;s Comment: </span>{comments.principalRemark}</p>
        <div className="flex justify-between pt-6">
          <span className="border-t border-foreground px-6 pt-1">Class Teacher&apos;s Signature</span>
          <span className="border-t border-foreground px-6 pt-1">{design.principalSignatureDataUrl && <img src={design.principalSignatureDataUrl} alt="Signature" className="h-8 object-contain" />}{design.principalTitleLabel}&apos;s Signature</span>
        </div>
      </div>
      {design.footerNote && <p className="mt-3 text-center text-[9px]">{design.footerNote}</p>}
    </div>
  );
}
