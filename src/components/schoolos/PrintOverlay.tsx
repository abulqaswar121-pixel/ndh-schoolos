import { Columns2, FileDown, FileStack, Printer, X } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { PrintableBroadsheet } from "./printables/PrintableBroadsheet";
import { PrintableDataTable } from "./printables/PrintableDataTable";
import { PrintableExamPaper } from "./printables/PrintableExamPaper";
import { PrintablePayslip } from "./printables/PrintablePayslip";
import { PrintableReceipt } from "./printables/PrintableReceipt";
import { PrintableReportCard } from "./printables/PrintableReportCard";
import { Button } from "@/components/ui/button";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { getActiveProgrammes } from "@/services/calculations";
import { exportExamPaperToWordDoc } from "@/services/examPaperExportService";

export function PrintOverlay() {
  const { db, printJob, openPrintPreview, closePrintPreview } = useSchoolOS();

  if (!printJob) return null;

  const activeProgs = getActiveProgrammes(db.settings);
  const targetStudent =
    printJob.type === "report_card"
      ? db.students.find((s) => s.id === printJob.studentId)
      : undefined;
  const studentProgCount = targetStudent
    ? activeProgs.filter((p) => Boolean(targetStudent.programmeClasses[p.id]))
        .length
    : 0;
  const isMultiProgrammeReport =
    printJob.type === "report_card" &&
    db.settings.multiProgrammeEnabled &&
    studentProgCount > 1;

  const activeExamPaper =
    printJob.type === "exam_paper" || printJob.type === "marking_scheme"
      ? (db.examPapers ?? []).find((ep) => ep.id === printJob.examPaperId)
      : undefined;

  return (
    <div
      id="ndh-print-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 p-3 sm:p-6 print:static print:bg-white print:p-0"
    >
      {/* Top Preview Action Bar (Hidden when printing) */}
      <div className="no-print sticky top-0 z-10 mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-[#0F172A] px-4 py-3 text-white shadow-lg">
        <div className="flex items-center gap-2.5">
          <Printer className="h-4 w-4 text-sky-300" />
          <span className="text-sm font-bold">A4 Print &amp; Export Preview</span>
          <span className="hidden text-xs text-slate-300 sm:inline">
            • Menus, buttons &amp; footer are hidden automatically on paper/PDF
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMultiProgrammeReport && printJob.type === "report_card" && (
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() =>
                  openPrintPreview({ ...printJob, layout: "merged" }, false)
                }
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                  printJob.layout === "merged"
                    ? "bg-white text-[#0F172A]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                Merged Report
              </button>
              <button
                type="button"
                onClick={() =>
                  openPrintPreview(
                    { ...printJob, layout: "per_programme" },
                    false
                  )
                }
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                  printJob.layout === "per_programme"
                    ? "bg-white text-[#0F172A]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <FileStack className="h-3.5 w-3.5" />
                Per Programme
              </button>
            </div>
          )}

          {printJob.type === "exam_paper" && activeExamPaper && (
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() =>
                  openPrintPreview(
                    { ...printJob, layout: "standard" },
                    false
                  )
                }
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  (printJob.layout ?? activeExamPaper.paperLayout) ===
                  "standard"
                    ? "bg-white text-[#0F172A]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Standard 1-Col
              </button>
              <button
                type="button"
                onClick={() =>
                  openPrintPreview(
                    { ...printJob, layout: "compact_two_column" },
                    false
                  )
                }
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  (printJob.layout ?? activeExamPaper.paperLayout) ===
                  "compact_two_column"
                    ? "bg-white text-[#0F172A]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                2-Col Paper Saver
              </button>
            </div>
          )}

          {(printJob.type === "exam_paper" ||
            printJob.type === "marking_scheme") &&
            activeExamPaper && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const fname = exportExamPaperToWordDoc(
                    activeExamPaper,
                    db,
                    printJob.type === "marking_scheme"
                      ? "marking_scheme"
                      : "question_paper"
                  );
                  toast.success(`Downloaded editable Word document (${fname}).`);
                }}
                className="bg-emerald-500 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Download Word (.doc)
              </Button>
            )}

          <Button
            type="button"
            size="sm"
            onClick={() => window.print()}
            className="bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print A4 / Save PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={closePrintPreview}
            className="border-slate-500 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 hover:text-white"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </div>

      {/* Printable Document Sheet */}
      <div className="pb-10 print:pb-0">
        {printJob.type === "report_card" && (
          <PrintableReportCard
            db={db}
            studentId={printJob.studentId}
            session={printJob.session}
            term={printJob.term}
            layout={printJob.layout}
            programmeFilter={printJob.programmeId}
          />
        )}
        {printJob.type === "receipt" && (
          <PrintableReceipt db={db} paymentId={printJob.paymentId} />
        )}
        {printJob.type === "broadsheet" && (
          <PrintableBroadsheet
            db={db}
            classId={printJob.classId}
            programmeId={printJob.programmeId}
            session={printJob.session}
            term={printJob.term}
          />
        )}
        {printJob.type === "payslip" && (
          <PrintablePayslip db={db} payrollId={printJob.payrollId} />
        )}
        {printJob.type === "exam_paper" && (
          <PrintableExamPaper
            db={db}
            examPaperId={printJob.examPaperId}
            mode="question_paper"
            layoutOverride={printJob.layout}
          />
        )}
        {printJob.type === "marking_scheme" && (
          <PrintableExamPaper
            db={db}
            examPaperId={printJob.examPaperId}
            mode="marking_scheme"
          />
        )}
        {printJob.type === "table" && (
          <PrintableDataTable
            settings={db.settings}
            title={printJob.title}
            subtitle={printJob.subtitle}
            headers={printJob.headers}
            rows={printJob.rows}
          />
        )}
      </div>
    </div>
  );
}
