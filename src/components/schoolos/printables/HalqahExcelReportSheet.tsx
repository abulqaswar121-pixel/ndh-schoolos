import type { SchoolDatabaseSnapshot } from "@/types/school";

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
  student: { fullName: string; admissionId: string; gender: string };
  halqahName: string;
  className: string;
  componentLabels: string[];
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

export function HalqahExcelReportSheet(p: HalqahExcelReportProps) {
  const { settings } = p.db;
  const design = settings.customization?.reportSheet;
  const learnerMark = p.subjectRows.reduce((s, r) => s + r.total, 0);
  const expectedMark = p.subjectRows.length * 100;
  const traitRows: Array<[string, number, number]> = [
    ["Punctuality", Math.min(p.traits.punctuality, 4), 4],
    ["Attendance", 5, 5],
    ["Reliability", 5, 5],
    ["Neatness", p.traits.neatness, 5],
    ["Politeness", p.traits.politeness, 5],
    ["Honesty", p.traits.honesty, 5],
    ["Relationship with pupils", 5, 5],
    ["Self-control", 5, 5],
    ["Attentiveness", 5, 5],
    ["Perseverance", 5, 5],
  ];
  const details: Array<[string, string, string, string]> = [
    ["Name of Learner:", p.student.fullName, "Term:", p.term.toUpperCase()],
    ["Sex:", p.student.gender, "Halqah:", p.halqahName],
    ["Class:", p.className, "Session:", p.session],
    ["Final Grade:", p.overallGrade, "ATTENDANCE", ""],
    ["Class Average:", `${p.classAverage.toFixed(1)}%`, "Days School Open:", String(p.attendance.daysOpened)],
    ["Learner's Average:", `${p.learnerAverage.toFixed(1)}%`, "Day(s) Present:", String(p.attendance.daysPresent)],
    ["No. of Subject:", String(p.subjectRows.length), "Day(s) Absent:", String(p.attendance.daysAbsent)],
  ];

  return (
    <div
      data-testid="halqah-excel-report"
      className="mx-auto w-full max-w-[210mm] bg-background p-6 text-[12px] text-foreground print:p-4"
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
      </div>
      <h2 className="my-2 text-center text-[13px] font-bold uppercase underline">
        Report Sheet for {p.term} {p.session} Academic Session
      </h2>
      <div className="mb-2 flex justify-between font-semibold">
        <span>Admission No: {p.student.admissionId}</span>
        {design?.nextTermBegins ? <span>Next Term Begins: {design.nextTermBegins}</span> : null}
      </div>

      <table className="mb-3 w-full border-collapse">
        <thead>
          <tr><th colSpan={4} className={`${cell} bg-muted text-left`}>STUDENT DETAILS</th></tr>
        </thead>
        <tbody>
          {details.map(([a, b, c, d]) => (
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
            <th className={cell}>TOTAL (100%)</th>
            <th className={cell}>GRADE</th>
            <th className={cell}>EFFORT</th>
            <th className={cell}>REMARK</th>
          </tr>
        </thead>
        <tbody>
          {p.subjectRows.map((r) => {
            const e = EFFORT[r.grade] ?? EFFORT.F!;
            return (
              <tr key={r.id}>
                <td className={`${cell} text-left font-semibold`}>{r.subjectName}</td>
                {r.compValues.map((v, i) => (<td key={i} className={cell}>{r.hasEntry ? v : ""}</td>))}
                <td className={`${cell} font-bold`}>{r.total}</td>
                <td className={cell}>{r.hasEntry ? r.grade : "F"}</td>
                <td className={cell}>{e.effort}</td>
                <td className={cell}>{e.remark}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-3 flex justify-between gap-4">
        <p className="font-semibold">
          GRADE DETAILS: A = 70-100, B = 60-69, C = 50-59, D = 45-49, E = 40-44, F = 0-39
        </p>
        <div className="shrink-0 text-right font-semibold">
          <p>Expected Mark: {expectedMark}</p>
          <p>Learner&apos;s Mark: {learnerMark}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-4">
        <table className="w-full border-collapse">
          <thead className="bg-muted">
            <tr><th className={`${cell} text-left`}>AFFECTIVE TRAITS</th><th className={cell}>RATING</th></tr>
          </thead>
          <tbody>
            {traitRows.map(([n, v, m]) => (
              <tr key={n}><td className={cell}>{n}</td><td className={`${cell} text-center`}>{v} / {m}</td></tr>
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
      </div>

      <div className="space-y-2">
        <p><span className="font-bold">Class Teacher&apos;s Comment: </span>{classTeacherCommentFromAverage(p.learnerAverage)}</p>
        <p><span className="font-bold">Head Teacher&apos;s Comment: </span>{headTeacherCommentFromTotal(learnerMark)}</p>
        <div className="flex justify-between pt-6">
          <span className="border-t border-foreground px-6 pt-1">Class Teacher&apos;s Signature</span>
          <span className="border-t border-foreground px-6 pt-1">Head Teacher&apos;s Signature</span>
        </div>
      </div>
    </div>
  );
}
