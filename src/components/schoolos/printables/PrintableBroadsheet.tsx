import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import {
  computeClassBroadsheet,
  formatOrdinal,
  getProgrammeName,
} from "@/services/calculations";
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

  return (
    <section className="mx-auto max-w-[290mm] rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0">
      <div className="flex items-center justify-between gap-4 border-b-2 border-[#0F172A] pb-3">
        <SchoolCrest settings={settings} size="md" />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] uppercase">
            {settings.name}
          </h1>
          <p className="text-xs text-slate-600">
            {settings.address} • Tel: {settings.phone}
          </p>
          <div className="mt-1 inline-block rounded bg-[#0F172A] px-3 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">
            MASTER {settings.labels.classSingular.toUpperCase()} BROADSHEET —{" "}
            {cls?.name ?? settings.labels.classSingular} ({session} • {term})
          </div>
        </div>
        <div className="text-right text-xs text-slate-600">
          {settings.multiProgrammeEnabled && (
            <div className="font-bold text-[#0F172A]">
              {getProgrammeName(settings, programmeId)}
            </div>
          )}
          <div>Students: {rows.length}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 font-bold text-[#0F172A]">
              <th className="border border-slate-300 px-2 py-1.5 text-center">
                Pos
              </th>
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
            {rows.map((r) => (
              <tr key={r.student.id} className="even:bg-slate-50/50">
                <td className="border border-slate-300 px-2 py-1 text-center font-bold text-[#1E3A8A]">
                  {formatOrdinal(r.position)}
                </td>
                <td className="border border-slate-300 px-2 py-1 font-mono text-[10px]">
                  {r.student.admissionId}
                </td>
                <td className="border border-slate-300 px-2 py-1 font-semibold text-[#0F172A]">
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
                <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                  {r.overallGrade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-10 pt-4 text-xs">
        <div className="border-t border-slate-400 pt-1 text-center font-semibold text-slate-700">
          {settings.labels.classSingular} {settings.labels.teacherSingular} Signature & Date
        </div>
        <div className="border-t border-slate-400 pt-1 text-center font-semibold text-[#0F172A]">
          Proprietor / Principal Verification & Stamp
        </div>
      </div>
    </section>
  );
}
