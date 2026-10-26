import type {
  ExamPaperSubmission,
  SchoolDatabaseSnapshot,
} from "@/types/school";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function computeExamPaperTotalMarks(paper: ExamPaperSubmission): {
  objectiveMarks: number;
  theoryMarks: number;
  totalMarks: number;
} {
  const objectiveMarks = paper.objectives.reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );
  const theoryMarks = paper.theory.reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );
  return {
    objectiveMarks,
    theoryMarks,
    totalMarks: objectiveMarks + theoryMarks,
  };
}

/**
 * Generates an editable Microsoft Word (.doc) HTML/WordML document for either:
 * - `"question_paper"` (Student Examination Question Paper — zero answers shown!)
 * - `"marking_scheme"` (Confidential Exam Officer & Marker Answer Key / Rubric)
 */
export function buildExamPaperWordDocumentHtml(
  paper: ExamPaperSubmission,
  db: SchoolDatabaseSnapshot,
  mode: "question_paper" | "marking_scheme"
): string {
  const { settings, classes, subjects } = db;
  const subject = subjects.find((s) => s.id === paper.subjectId);
  const classNames = paper.classIds
    .map((cid) => classes.find((c) => c.id === cid)?.name)
    .filter(Boolean)
    .join(", ");
  const totals = computeExamPaperTotalMarks(paper);
  const isScheme = mode === "marking_scheme";

  const logoImgHtml = settings.logoDataUrl
    ? `<img src="${settings.logoDataUrl}" width="58" height="58" alt="Crest" style="width:58px;height:58px;object-fit:contain;" />`
    : "";

  const objectiveRowsHtml = paper.objectives
    .map((q, idx) => {
      if (isScheme) {
        return `<tr>
          <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;width:12%;text-align:center;">${idx + 1}</td>
          <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;color:#065f46;width:14%;text-align:center;">${escapeHtml(q.correctOption)}</td>
          <td style="padding:5px 8px;border:1px solid #cbd5e1;width:58%;">${escapeHtml(
            q[`option${q.correctOption}` as const]
          )}</td>
          <td style="padding:5px 8px;border:1px solid #cbd5e1;width:16%;text-align:center;">${q.marks} mk${q.marks === 1 ? "" : "s"}</td>
        </tr>`;
      }

      return `<div style="margin-bottom:10pt;page-break-inside:avoid;">
        <p style="margin:0 0 3pt 0;font-size:11pt;line-height:1.35;">
          <strong>${idx + 1}.</strong> ${escapeHtml(q.questionText)}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-left:12pt;font-size:10.5pt;">
          <tr>
            <td style="width:50%;padding:1.5pt 4pt 1.5pt 0;">(A) ${escapeHtml(q.optionA)}</td>
            <td style="width:50%;padding:1.5pt 0;">(B) ${escapeHtml(q.optionB)}</td>
          </tr>
          <tr>
            <td style="width:50%;padding:1.5pt 4pt 1.5pt 0;">(C) ${escapeHtml(q.optionC)}</td>
            <td style="width:50%;padding:1.5pt 0;">(D) ${escapeHtml(q.optionD)}</td>
          </tr>
        </table>
      </div>`;
    })
    .join("\n");

  const theoryRowsHtml = paper.theory
    .map((t, idx) => {
      if (isScheme) {
        return `<div style="margin-bottom:12pt;padding:8pt;border:1px solid #cbd5e1;background:#f8fafc;">
          <p style="margin:0 0 4pt 0;font-size:11pt;">
            <strong>Question ${idx + 1}:</strong> ${escapeHtml(t.questionText)}
            <strong style="float:right;">[${t.marks} Marks]</strong>
          </p>
          <p style="margin:0;font-size:10.5pt;color:#065f46;">
            <strong>Expected Answer / Marking Guide:</strong> ${escapeHtml(
              t.markingGuide || "Award marks for accurate points and clear explanation."
            )}
          </p>
        </div>`;
      }

      return `<div style="margin-bottom:11pt;page-break-inside:avoid;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;font-size:11pt;line-height:1.4;padding-right:8pt;">
              <strong>${idx + 1}.</strong> ${escapeHtml(t.questionText)}
            </td>
            <td style="vertical-align:top;width:85pt;text-align:right;font-size:10pt;font-weight:bold;">
              [${t.marks} Mark${t.marks === 1 ? "" : "s"}]
            </td>
          </tr>
        </table>
      </div>`;
    })
    .join("\n");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(settings.name)} - ${escapeHtml(
      subject?.name ?? "Subject"
    )} ${isScheme ? "Marking Scheme" : "Exam Paper"}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page WordSection1 {
        size: 210mm 297mm;
        margin: 15mm 18mm 15mm 18mm;
      }
      div.WordSection1 { page: WordSection1; }
      body {
        font-family: "Times New Roman", Georgia, serif;
        color: #0b1220;
        font-size: 11pt;
      }
    </style>
  </head>
  <body>
    <div class="WordSection1">
      <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #0b1220;padding-bottom:6pt;margin-bottom:8pt;">
        <tr>
          ${logoImgHtml ? `<td style="width:68px;vertical-align:middle;">${logoImgHtml}</td>` : ""}
          <td style="text-align:center;vertical-align:middle;">
            <div style="font-size:16pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.4pt;">
              ${escapeHtml(settings.name)}
            </div>
            ${
              settings.address
                ? `<div style="font-size:9.5pt;color:#334155;">${escapeHtml(settings.address)}</div>`
                : ""
            }
            ${
              settings.motto
                ? `<div style="font-size:9.5pt;font-style:italic;color:#475569;">Motto: "${escapeHtml(settings.motto)}"</div>`
                : ""
            }
            <div style="margin-top:4pt;font-size:12pt;font-weight:bold;text-transform:uppercase;">
              ${escapeHtml(paper.term)} — ${escapeHtml(paper.assessmentTitle)} (${escapeHtml(paper.session)})
            </div>
            ${
              isScheme
                ? `<div style="margin-top:3pt;font-size:11pt;font-weight:bold;color:#b42318;">CONFIDENTIAL MARKING SCHEME &amp; ANSWER KEY</div>`
                : ""
            }
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;border:1px solid #0b1220;margin-bottom:10pt;font-size:10.5pt;">
        <tr>
          <td style="padding:4pt 8pt;border:1px solid #0b1220;width:50%;">
            <strong>${escapeHtml(settings.labels.classSingular.toUpperCase())}:</strong> ${escapeHtml(classNames || "All Assigned")}
          </td>
          <td style="padding:4pt 8pt;border:1px solid #0b1220;width:50%;">
            <strong>SUBJECT:</strong> ${escapeHtml(subject?.name ?? "Subject")} (${escapeHtml(subject?.code ?? "")})
          </td>
        </tr>
        <tr>
          <td style="padding:4pt 8pt;border:1px solid #0b1220;">
            <strong>TIME ALLOWED:</strong> ${escapeHtml(paper.durationLabel || "1 Hour 30 Minutes")}
          </td>
          <td style="padding:4pt 8pt;border:1px solid #0b1220;">
            <strong>TOTAL MARKS:</strong> ${totals.totalMarks} Marks
          </td>
        </tr>
        ${
          !isScheme
            ? `<tr>
                <td colspan="2" style="padding:5pt 8pt;border:1px solid #0b1220;">
                  <strong>STUDENT NAME:</strong> __________________________________________ &nbsp;&nbsp;
                  <strong>ADM NO:</strong> ____________________
                </td>
              </tr>`
            : ""
        }
      </table>

      ${
        !isScheme && paper.generalInstructions
          ? `<p style="margin:0 0 10pt 0;padding:5pt 8pt;background:#f8fafc;border-left:3px solid #0c2340;font-size:10pt;">
              <strong>INSTRUCTIONS:</strong> ${escapeHtml(paper.generalInstructions)}
            </p>`
          : ""
      }

      ${
        paper.objectives.length > 0
          ? `<div style="margin-top:8pt;">
              <h3 style="margin:0 0 4pt 0;font-size:11.5pt;text-transform:uppercase;border-bottom:1px solid #94a3b8;padding-bottom:2pt;">
                SECTION A: OBJECTIVE QUESTIONS (${totals.objectiveMarks} Marks)
              </h3>
              ${
                !isScheme && paper.sectionAInstruction
                  ? `<p style="margin:0 0 8pt 0;font-size:10pt;font-style:italic;">${escapeHtml(paper.sectionAInstruction)}</p>`
                  : ""
              }
              ${
                isScheme
                  ? `<table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-bottom:14pt;">
                      <thead>
                        <tr style="background:#e2e8f0;">
                          <th style="padding:5px 8px;border:1px solid #cbd5e1;">Q#</th>
                          <th style="padding:5px 8px;border:1px solid #cbd5e1;">Correct Key</th>
                          <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Option Text</th>
                          <th style="padding:5px 8px;border:1px solid #cbd5e1;">Marks</th>
                        </tr>
                      </thead>
                      <tbody>${objectiveRowsHtml}</tbody>
                    </table>`
                  : objectiveRowsHtml
              }
            </div>`
          : ""
      }

      ${
        paper.theory.length > 0
          ? `<div style="margin-top:14pt;">
              <h3 style="margin:0 0 4pt 0;font-size:11.5pt;text-transform:uppercase;border-bottom:1px solid #94a3b8;padding-bottom:2pt;">
                SECTION B: THEORY / ESSAY QUESTIONS (${totals.theoryMarks} Marks)
              </h3>
              ${
                !isScheme && paper.sectionBInstruction
                  ? `<p style="margin:0 0 8pt 0;font-size:10pt;font-style:italic;">${escapeHtml(paper.sectionBInstruction)}</p>`
                  : ""
              }
              ${theoryRowsHtml}
            </div>`
          : ""
      }

      ${
        isScheme && paper.generalMarkingNotes
          ? `<div style="margin-top:12pt;padding:8pt;border:1px solid #94a3b8;">
              <strong>General Moderation Notes:</strong> ${escapeHtml(paper.generalMarkingNotes)}
            </div>`
          : ""
      }
    </div>
  </body>
</html>`;
}

export function exportExamPaperToWordDoc(
  paper: ExamPaperSubmission,
  db: SchoolDatabaseSnapshot,
  mode: "question_paper" | "marking_scheme" = "question_paper"
): string {
  const html = buildExamPaperWordDocumentHtml(paper, db, mode);
  const subject = db.subjects.find((s) => s.id === paper.subjectId);
  const classLabel =
    paper.classIds
      .map((cid) => db.classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join("-") || "Class";
  const safeSlug = (val: string) =>
    val
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const fileName = `${safeSlug(db.settings.code || "SCH")}_${safeSlug(
    classLabel
  )}_${safeSlug(subject?.name || "Subject")}_${
    mode === "marking_scheme" ? "Marking-Scheme" : "Exam-Question-Paper"
  }.doc`;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob(["\ufeff", html], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return fileName;
}
