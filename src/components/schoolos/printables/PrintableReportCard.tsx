import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import { getSurahByNumber } from "@/data/quranSurahs";
import {
  computeClassBroadsheet,
  computeQuranProgressPercent,
  computeStudentAttendanceSummary,
  evaluateGrade,
  formatOrdinal,
  getActiveProgrammes,
  getGradingComponents,
} from "@/services/calculations";
import type { ProgrammeId, SchoolDatabaseSnapshot } from "@/types/school";

interface PrintableReportCardProps {
  db: SchoolDatabaseSnapshot;
  studentId: string;
  session: string;
  term: string;
  layout: "merged" | "per_programme";
  programmeFilter?: ProgrammeId | undefined;
}

export function PrintableReportCard({
  db,
  studentId,
  session,
  term,
  layout,
  programmeFilter,
}: PrintableReportCardProps) {
  const {
    settings,
    classes,
    subjects,
    students,
    scores,
    quranRecords,
    affective,
    attendance,
  } = db;
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const activeProgs = getActiveProgrammes(settings).filter((prog) => {
    if (programmeFilter && prog.id !== programmeFilter) return false;
    return Boolean(student.programmeClasses[prog.id]);
  });

  const quranRec = settings.enableQuranModule
    ? quranRecords.find((t) => t.studentId === student.id)
    : undefined;
  const surah = quranRec ? getSurahByNumber(quranRec.currentSurahNumber) : null;
  const quranPct = computeQuranProgressPercent(quranRec);

  const aff = affective.find(
    (a) =>
      a.studentId === student.id && a.session === session && a.term === term
  ) ?? {
    punctuality: 5,
    neatness: 5,
    politeness: 5,
    honesty: 5,
    classTeacherRemark:
      "Attentive in class, neat in appearance and completes assignments on time.",
    secondProgrammeRemark: "Steady participation and good effort.",
    headTeacherRemark: "Good term progress. Keep working hard.",
  };

  const buildProgrammeReportData = (programmeId: ProgrammeId) => {
    const classId = student.programmeClasses[programmeId];
    if (!classId) return null;

    const cls = classes.find((c) => c.id === classId);
    const components = getGradingComponents(settings, programmeId, classId);
    const maxPerSub = components.reduce((s, c) => s + c.maxScore, 0) || 100;
    const progSubjects = subjects.filter((s) => s.programmeId === programmeId);

    const broadsheet = computeClassBroadsheet({
      students,
      subjects,
      scores,
      settings,
      classId,
      programmeId,
      session,
      term,
    });
    const myStanding = broadsheet.find((b) => b.student.id === student.id);

    const subjectRows = progSubjects.map((sub) => {
      const rec = scores.find(
        (r) =>
          r.studentId === student.id &&
          r.subjectId === sub.id &&
          r.session === session &&
          r.term === term
      );
      const compValues = components.map((c) => Number(rec?.scores[c.id] ?? 0));
      const total = compValues.reduce((a, b) => a + b, 0);
      const pct = maxPerSub > 0 ? (total / maxPerSub) * 100 : 0;
      const { grade, remark } = evaluateGrade(pct, settings.grading.gradeBands);

      // Compute subject position inside this class
      const classRecTotals = students
        .filter(
          (st) =>
            st.status === "Active" &&
            st.programmeClasses[programmeId] === classId
        )
        .map((st) => {
          const r2 = scores.find(
            (sc) =>
              sc.studentId === st.id &&
              sc.subjectId === sub.id &&
              sc.session === session &&
              sc.term === term
          );
          if (!r2) return null;
          return components.reduce(
            (sum, cp) => sum + Number(r2.scores[cp.id] ?? 0),
            0
          );
        })
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a);

      const subPos = rec ? classRecTotals.indexOf(total) + 1 : 0;

      return {
        subject: sub,
        compValues,
        total,
        position: subPos,
        grade: rec ? grade : "—",
        remark: rec ? remark : "—",
      };
    });

    const att = computeStudentAttendanceSummary({
      attendance,
      studentId: student.id,
      session,
      term,
      programmeId,
      configuredDaysOpened: settings.daysSchoolOpened,
    });

    return {
      programmeId,
      programmeName:
        settings.programmes.find((p) => p.id === programmeId)?.name ??
        "Main School",
      className: cls?.name ?? settings.labels.classSingular,
      components,
      subjectRows,
      standing: myStanding,
      classSize: broadsheet.length,
      attendance: att,
    };
  };

  const progReports = activeProgs
    .map((p) => buildProgrammeReportData(p.id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const renderLetterhead = (subtitle: string) => (
    <div className="border-b-2 border-[#0F172A] pb-3">
      <div className="flex items-center justify-between gap-4">
        <SchoolCrest settings={settings} size="lg" />
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A] uppercase">
            {settings.name}
          </h1>
          {settings.arabicName && (
            <div
              dir="rtl"
              lang="ar"
              className="font-arabic text-base font-bold text-slate-800"
            >
              {settings.arabicName}
            </div>
          )}
          <p className="text-xs italic text-slate-600">“{settings.motto}”</p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {settings.address} • Tel: {settings.phone}
          </p>
          <div className="mt-1.5 inline-block rounded-md bg-[#0F172A] px-3 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">
            {subtitle} — {session} ({term})
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-center">
          <span className="text-base font-extrabold text-[#0F172A]">
            {student.fullName
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </span>
          <span className="text-[9px] font-semibold text-slate-500">STUDENT</span>
        </div>
      </div>
    </div>
  );

  const renderScoresTable = (
    data: NonNullable<ReturnType<typeof buildProgrammeReportData>>,
    showProgrammeHeading: boolean
  ) => (
    <div key={data.programmeId} className="mt-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-extrabold tracking-wider text-[#0F172A] uppercase">
          {showProgrammeHeading
            ? `${data.programmeName} (${data.className})`
            : `${settings.labels.classSingular}: ${data.className} — Academic Report`}
        </div>
        {data.standing && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
            <span>
              Total: <strong className="text-[#0F172A]">{data.standing.grandTotal}</strong>
            </span>
            <span>
              Average:{" "}
              <strong className="text-[#0F172A]">
                {data.standing.averagePercentage}%
              </strong>
            </span>
            <span>
              {settings.labels.classSingular} Position:{" "}
              <strong className="text-[#1E3A8A]">
                {formatOrdinal(data.standing.position)} of {data.classSize}
              </strong>
            </span>
          </div>
        )}
      </div>

      <table className="w-full border-collapse border border-slate-300 text-xs">
        <thead>
          <tr className="bg-slate-100 text-[#0F172A]">
            <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
              Subject
            </th>
            {data.components.map((c) => (
              <th
                key={c.id}
                className="border border-slate-300 px-2 py-1.5 text-center font-bold"
              >
                {c.label} ({c.maxScore})
              </th>
            ))}
            <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
              Total (100)
            </th>
            <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
              Pos
            </th>
            <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
              Grade
            </th>
            <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
              Remark
            </th>
          </tr>
        </thead>
        <tbody>
          {data.subjectRows.map((row) => (
            <tr key={row.subject.id} className="even:bg-slate-50/50">
              <td className="border border-slate-300 px-2.5 py-1.5 font-semibold text-[#0F172A]">
                {row.subject.name}
              </td>
              {row.compValues.map((v, i) => (
                <td
                  key={i}
                  className="border border-slate-300 px-2 py-1.5 text-center text-slate-700"
                >
                  {row.grade === "—" ? "—" : v}
                </td>
              ))}
              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-[#0F172A]">
                {row.grade === "—" ? "—" : row.total}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-[#1E3A8A]">
                {row.position > 0 ? formatOrdinal(row.position) : "—"}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-[#0F172A]">
                {row.grade}
              </td>
              <td className="border border-slate-300 px-2.5 py-1.5 text-slate-700">
                {row.remark}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700">
        <span>
          Attendance: <strong>{data.attendance.daysPresent}</strong> of{" "}
          <strong>{data.attendance.daysOpened}</strong> days opened (
          <strong>{data.attendance.ratePercent}%</strong>)
        </span>
        <span>
          Late: <strong>{data.attendance.daysLate}</strong> • Absent:{" "}
          <strong>{data.attendance.daysAbsent}</strong>
        </span>
      </div>
    </div>
  );

  const renderFooterAndRemarks = () => (
    <>
      {/* Optional Qur'an Memorization Box — ONLY shown when settings.enableQuranModule is ON */}
      {settings.enableQuranModule && quranRec && surah && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <div className="font-bold text-emerald-950 uppercase">
            Optional Qur'an Progress Summary
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-emerald-900">
            <span>
              Current Surah: <strong>{surah.number}. {surah.transliteration}</strong>{" "}
              <span dir="rtl" lang="ar" className="font-arabic">
                ({surah.arabicName})
              </span>{" "}
              • Ayah {quranRec.ayahFrom}–{quranRec.ayahTo}
            </span>
            <span>
              Juz Completed: <strong>{quranRec.juzCompleted}/30</strong> ({quranPct}%) •
              Score: <strong>{quranRec.recitationScore}%</strong> ({quranRec.revisionStatus})
            </span>
          </div>
        </div>
      )}

      {/* Conduct & Remarks */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border border-slate-300 p-2.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase">
            Conduct & Character (1–5)
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px]">
            <span>Punctuality: <strong>{aff.punctuality}/5</strong></span>
            <span>Neatness: <strong>{aff.neatness}/5</strong></span>
            <span>Politeness: <strong>{aff.politeness}/5</strong></span>
            <span>Honesty: <strong>{aff.honesty}/5</strong></span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 p-2.5 sm:col-span-2 space-y-1.5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {settings.labels.classSingular} {settings.labels.teacherSingular}'s Remark:{" "}
            </span>
            <span className="font-medium text-slate-800">
              {aff.classTeacherRemark}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Principal / Proprietor's Remark:{" "}
            </span>
            <span className="font-medium text-[#0F172A]">
              {aff.headTeacherRemark}
            </span>
          </div>
        </div>
      </div>

      {/* Grading Key + Signatures */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>
          Grading Key:{" "}
          {settings.grading.gradeBands
            .map((b) => `${b.grade} (${b.min}–${b.max}% ${b.remark})`)
            .join(" • ")}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 pt-3 text-xs">
        <div className="border-t border-slate-400 pt-1 text-center font-semibold text-slate-700">
          {settings.labels.classSingular} {settings.labels.teacherSingular}'s Signature & Date
        </div>
        <div className="border-t border-slate-400 pt-1 text-center font-semibold text-[#0F172A]">
          Principal / Proprietor's Signature & School Stamp
        </div>
      </div>
    </>
  );

  if (layout === "per_programme" && progReports.length > 1) {
    return (
      <div className="space-y-8 print:space-y-0">
        {progReports.map((rep, idx) => (
          <section
            key={rep.programmeId}
            className={`mx-auto max-w-[200mm] rounded-xl border border-slate-300 bg-white p-6 text-slate-900 print:border-2 print:border-[#0F172A] ${
              idx > 0 ? "print:break-before-page" : ""
            }`}
          >
            {renderLetterhead(`${rep.programmeName} Report Card`)}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-xs sm:grid-cols-4">
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                  Student Name
                </span>
                <span className="font-bold text-[#0F172A]">{student.fullName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                  Admission No
                </span>
                <span className="font-bold text-[#0F172A]">{student.admissionId}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                  {settings.labels.classSingular}
                </span>
                <span className="font-bold text-[#0F172A]">{rep.className}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                  Gender
                </span>
                <span className="font-bold text-[#0F172A]">{student.gender}</span>
              </div>
            </div>
            {renderScoresTable(rep, false)}
            {renderFooterAndRemarks()}
          </section>
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-[200mm] rounded-xl border border-slate-300 bg-white p-6 text-slate-900 print:border-2 print:border-[#0F172A]">
      {renderLetterhead("Student Termly Report Sheet")}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-xs sm:grid-cols-4">
        <div>
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Student Name
          </span>
          <span className="font-bold text-[#0F172A]">{student.fullName}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Admission No
          </span>
          <span className="font-bold text-[#0F172A]">{student.admissionId}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            {settings.labels.classSingular}
          </span>
          <span className="font-bold text-[#0F172A]">
            {progReports.map((r) => r.className).join(" • ") || "—"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
            Gender / DOB
          </span>
          <span className="font-bold text-[#0F172A]">
            {student.gender} • {student.dateOfBirth}
          </span>
        </div>
      </div>

      {progReports.map((rep) =>
        renderScoresTable(rep, progReports.length > 1)
      )}

      {renderFooterAndRemarks()}
    </section>
  );
}
