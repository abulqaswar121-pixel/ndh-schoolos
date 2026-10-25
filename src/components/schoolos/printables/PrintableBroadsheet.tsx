import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import {
  computeClassBroadsheet,
  formatOrdinal,
  getProgrammeName,
} from "@/services/calculations";
import {
  getReportFontStack,
  getResolvedCustomization,
} from "@/services/customizationDefaults";
import type { ProgrammeId, SchoolDatabaseSnapshot } from "@/types/school";

interface PrintableBroadsheetProps {
  db: SchoolDatabaseSnapshot;
  classId: string;
  programmeId: ProgrammeId;
  session: string;
  term: string;
}

export function PrintableBroadsheet({
  db,
  classId,
  programmeId,
  session,
  term,
}: PrintableBroadsheetProps) {
  const { settings, classes, subjects, students, scores } = db;
  const custom = getResolvedCustomization(settings);
  const design = custom.reportSheet;
  const primaryColor = design.primaryColor || "#0F172A";
  const accentColor = design.accentColor || "#1E3A8A";
  const showPositions =
    design.broadsheetShowPositions && design.rankingMode !== "grade_only";

  const cls = classes.find((c) => c.id === classId);
  const progSubjects = subjects.filter((s) => s.programmeId === programmeId);
  const rows = computeClassBroadsheet({
    students,
    subjects,
    scores,
    settings,
    classId,
    programmeId,
    session,
    term,
  });

  const displayRows = showPositions
    ? rows
    : [...rows].sort((a, b) =>
        a.student.fullName.localeCompare(b.student.fullName)
      );

  return (
    <section
      className="mx-auto max-w-[290mm] rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0"
      style={{ fontFamily: getReportFontStack(design.fontFamily) }}
    >
      <div
        className="flex items-center justify-between gap-4 pb-3"
        style={{ borderBottom: `2px solid ${primaryColor}` }}
      >
        <SchoolCrest settings={settings} size="md" />
        <div className="flex-1 text-center">
          <h1
            className="text-lg font-extrabold tracking-tight uppercase"
            style={{ color: primaryColor }}
          >
            {settings.name}
          </h1>
          <p className="text-xs text-slate-600">
            {settings.address} • Tel: {settings.phone}
          </p>
          <div
            className="mt-1 inline-block rounded px-3 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase"
            style={{ backgroundColor: primaryColor }}
          >
            MASTER {settings.labels.classSingular.toUpperCase()} BROADSHEET —{" "}
            {cls?.name ?? settings.labels.classSingular} ({session} • {term})
          </div>
        </div>
        <div className="text-right text-xs text-slate-600">
          {settings.multiProgrammeEnabled && (
            <div className="font-bold" style={{ color: primaryColor }}>
              {getProgrammeName(settings, programmeId)}
            </div>
          )}
          <div>Students: {displayRows.length}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr
              className="bg-slate-100 font-bold"
              style={{ color: primaryColor }}
            >
              {showPositions && (
                <th className="border border-slate-300 px-2 py-1.5 text-center">
                  Pos
                </th>
              )}
              <th className="border border-slate-300 px-2 py-1.5 text-left">
                Admission ID
              </th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">
                Student Name
              </th>
              {progSubjects.map((sub) => (
                <th
                  key={sub.id}
                  className="border border-slate-300 px-1.5 py-1.5 text-center"
                  title={sub.name}
                >
                  {sub.code}
                </th>
              ))}
              <th className="border border-slate-300 px-2 py-1.5 text-center">
                Total
              </th>
              <th className="border border-slate-300 px-2 py-1.5 text-center">
                Avg %
              </th>
              <th className="border border-slate-300 px-2 py-1.5 text-center">
                Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r) => (
              <tr
                key={r.student.id}
                className={design.tableStriped ? "even:bg-slate-50/70" : ""}
              >
                {showPositions && (
                  <td
                    className="border border-slate-300 px-2 py-1 text-center font-bold"
                    style={{ color: accentColor }}
                  >
                    {formatOrdinal(r.position)}
                  </td>
                )}
                <td className="border border-slate-300 px-2 py-1 font-mono text-[10px]">
                  {r.student.admissionId}
                </td>
                <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-900">
                  {r.student.fullName}
                </td>
                {progSubjects.map((sub) => {
                  const cell = r.subjectTotals[sub.id];
                  return (
                    <td
                      key={sub.id}
                      className="border border-slate-300 px-1.5 py-1 text-center"
                    >
                      {cell?.hasEntry ? cell.total : "—"}
                    </td>
                  );
                })}
                <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                  {r.grandTotal}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                  {r.averagePercentage}%
                </td>
                <td
                  className="border border-slate-300 px-2 py-1 text-center font-extrabold"
                  style={{ color: primaryColor }}
                >
                  {r.overallGrade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-10 pt-4 text-xs">
        <div className="border-t border-slate-400 pt-1 text-center font-semibold text-slate-700">
          {settings.labels.classSingular} {settings.labels.teacherSingular}{" "}
          Signature & Date
        </div>
        <div
          className="border-t border-slate-400 pt-1 text-center font-semibold"
          style={{ color: primaryColor }}
        >
          {design.principalTitleLabel} Verification & Stamp
        </div>
      </div>
    </section>
  );
}
