import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import { getResolvedCustomization } from "@/services/customizationDefaults";
import { computeExamPaperTotalMarks } from "@/services/examPaperExportService";
import type { SchoolDatabaseSnapshot } from "@/types/school";

interface PrintableExamPaperProps {
  db: SchoolDatabaseSnapshot;
  examPaperId: string;
  mode: "question_paper" | "marking_scheme";
  layoutOverride?: "standard" | "compact_two_column" | undefined;
}

export function PrintableExamPaper({
  db,
  examPaperId,
  mode,
  layoutOverride,
}: PrintableExamPaperProps) {
  const { settings, classes, subjects } = db;
  const paper = (db.examPapers ?? []).find((ep) => ep.id === examPaperId);
  const custom = getResolvedCustomization(settings);
  const primaryColor = custom.reportSheet.syncWithWorkspaceTheme
    ? custom.workspaceTheme.primaryColor
    : custom.reportSheet.primaryColor;

  if (!paper) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center text-sm text-slate-600">
        Exam question paper not found.
      </div>
    );
  }

  const subject = subjects.find((s) => s.id === paper.subjectId);
  const classNames =
    paper.classIds
      .map((cid) => classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join(", ") || "All Assigned";
  const totals = computeExamPaperTotalMarks(paper);
  const effectiveLayout = layoutOverride ?? paper.paperLayout ?? "standard";
  const isCompact = effectiveLayout === "compact_two_column";
  const isScheme = mode === "marking_scheme";

  return (
    <div className="ndh-a4-sheet mx-auto max-w-[210mm] bg-white p-6 text-[#0b1220] shadow-xl sm:p-10 print:max-w-none print:p-5 print:shadow-none">
      {/* Official Branded Examination Header */}
      <div
        className="flex items-center gap-4 border-b-2 pb-4"
        style={{ borderColor: primaryColor }}
      >
        <SchoolCrest settings={settings} size="lg" />
        <div className="min-w-0 flex-1 text-center">
          <h1
            className="text-lg font-extrabold tracking-wide uppercase sm:text-xl"
            style={{ color: primaryColor }}
          >
            {settings.name}
          </h1>
          {settings.address && (
            <p className="text-[11px] text-slate-600">{settings.address}</p>
          )}
          {settings.motto && (
            <p className="text-[11px] italic text-slate-500">
              Motto: &ldquo;{settings.motto}&rdquo;
            </p>
          )}
          <div className="mt-1.5 inline-block rounded border border-slate-300 bg-slate-50 px-3 py-0.5 text-xs font-extrabold tracking-wider uppercase text-[#0b1220]">
            {paper.term} — {paper.assessmentTitle} ({paper.session})
          </div>
          {isScheme && (
            <div className="mt-1 text-xs font-extrabold tracking-wider text-[#b42318] uppercase">
              CONFIDENTIAL MARKING SCHEME &amp; ANSWER KEY
            </div>
          )}
        </div>
      </div>

      {/* Exam Metadata Box */}
      <div className="mt-3 grid grid-cols-2 border border-slate-900 text-xs">
        <div className="border-r border-b border-slate-900 px-3 py-1.5">
          <span className="font-extrabold uppercase">
            {settings.labels.classSingular}:
          </span>{" "}
          <span className="font-semibold">{classNames}</span>
        </div>
        <div className="border-b border-slate-900 px-3 py-1.5">
          <span className="font-extrabold uppercase">SUBJECT:</span>{" "}
          <span className="font-semibold">
            {subject?.name ?? "Subject"}{" "}
            {subject?.code ? `(${subject.code})` : ""}
          </span>
        </div>
        <div
          className={`border-r border-slate-900 px-3 py-1.5 ${
            !isScheme ? "border-b" : ""
          }`}
        >
          <span className="font-extrabold uppercase">TIME ALLOWED:</span>{" "}
          <span className="font-semibold">
            {paper.durationLabel || "1 Hour 30 Minutes"}
          </span>
        </div>
        <div
          className={`border-slate-900 px-3 py-1.5 ${
            !isScheme ? "border-b" : ""
          }`}
        >
          <span className="font-extrabold uppercase">TOTAL MARKS:</span>{" "}
          <span className="font-semibold">{totals.totalMarks} Marks</span>
        </div>
        {!isScheme && (
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-4 px-3 py-2">
            <div>
              <span className="font-extrabold uppercase">STUDENT NAME:</span>{" "}
              <span className="inline-block w-56 border-b border-dotted border-slate-700">
                &nbsp;
              </span>
            </div>
            <div>
              <span className="font-extrabold uppercase">ADMISSION NO:</span>{" "}
              <span className="inline-block w-32 border-b border-dotted border-slate-700">
                &nbsp;
              </span>
            </div>
          </div>
        )}
      </div>

      {/* General Instructions */}
      {!isScheme && paper.generalInstructions && (
        <div className="mt-3 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-relaxed">
          <strong className="uppercase">General Instructions: </strong>
          {paper.generalInstructions}
        </div>
      )}

      {/* SECTION A: OBJECTIVES */}
      {paper.objectives.length > 0 && (
        <section className="mt-5">
          <div
            className="border-b pb-1 text-xs font-extrabold tracking-wider uppercase sm:text-sm"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            SECTION A: OBJECTIVE QUESTIONS ({totals.objectiveMarks} Marks)
          </div>
          {!isScheme && paper.sectionAInstruction && (
            <p className="mt-1 text-xs italic text-slate-700">
              {paper.sectionAInstruction}
            </p>
          )}

          {isScheme ? (
            <table className="mt-2.5 w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-left font-extrabold">
                  <th className="w-14 border border-slate-300 px-2.5 py-1.5 text-center">
                    Q#
                  </th>
                  <th className="w-24 border border-slate-300 px-2.5 py-1.5 text-center">
                    Answer Key
                  </th>
                  <th className="border border-slate-300 px-2.5 py-1.5">
                    Correct Option Text
                  </th>
                  <th className="w-20 border border-slate-300 px-2.5 py-1.5 text-center">
                    Marks
                  </th>
                </tr>
              </thead>
              <tbody>
                {paper.objectives.map((q, idx) => (
                  <tr key={q.id}>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-center font-extrabold text-emerald-800">
                      {q.correctOption}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5">
                      {q[`option${q.correctOption}` as const]}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-center">
                      {q.marks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              className={`mt-3 ${
                isCompact
                  ? "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2 text-[11.5px]"
                  : "space-y-3.5 text-xs sm:text-[13px]"
              }`}
            >
              {paper.objectives.map((q, idx) => (
                <div key={q.id} className="break-inside-avoid">
                  <div className="leading-snug font-medium text-[#0b1220]">
                    <span className="mr-1 font-extrabold">{idx + 1}.</span>
                    <span>{q.questionText}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pl-4 text-slate-800">
                    <div>
                      <span className="font-bold">(A)</span> {q.optionA}
                    </div>
                    <div>
                      <span className="font-bold">(B)</span> {q.optionB}
                    </div>
                    <div>
                      <span className="font-bold">(C)</span> {q.optionC}
                    </div>
                    <div>
                      <span className="font-bold">(D)</span> {q.optionD}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION B: THEORY */}
      {paper.theory.length > 0 && (
        <section className="mt-6">
          <div
            className="border-b pb-1 text-xs font-extrabold tracking-wider uppercase sm:text-sm"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            SECTION B: THEORY / ESSAY QUESTIONS ({totals.theoryMarks} Marks)
          </div>
          {!isScheme && paper.sectionBInstruction && (
            <p className="mt-1 text-xs italic text-slate-700">
              {paper.sectionBInstruction}
            </p>
          )}

          <div className="mt-3 space-y-3.5 text-xs sm:text-[13px]">
            {paper.theory.map((t, idx) => (
              <div key={t.id} className="break-inside-avoid">
                <div className="flex items-start justify-between gap-3 leading-relaxed">
                  <div>
                    <span className="mr-1.5 font-extrabold">{idx + 1}.</span>
                    <span>{t.questionText}</span>
                  </div>
                  <span className="shrink-0 font-bold text-slate-700">
                    [{t.marks} Mark{t.marks === 1 ? "" : "s"}]
                  </span>
                </div>

                {isScheme && (
                  <div className="mt-1.5 rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
                    <strong>Expected Answer / Marking Guide: </strong>
                    {t.markingGuide ||
                      "Award marks for accurate points and clear explanation."}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isScheme && paper.generalMarkingNotes && (
        <div className="mt-5 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
          <strong>Moderation Notes: </strong>
          {paper.generalMarkingNotes}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px] font-semibold text-slate-500">
        {isScheme
          ? `Confidential Marking Guide • Prepared by ${paper.submittedByName}`
          : "Good luck! Check your answers carefully before submitting."}
      </div>
    </div>
  );
}
