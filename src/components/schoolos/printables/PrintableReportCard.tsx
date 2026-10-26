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
import {
  getReportFontStack,
  getResolvedCustomization,
  resolveReportCardRemarks,
} from "@/services/customizationDefaults";
import type {
  GradeLetterKey,
  ProgrammeId,
  SchoolDatabaseSnapshot,
  ScoreComponentConfig,
} from "@/types/school";

interface PrintableReportCardProps {
  db: SchoolDatabaseSnapshot;
  studentId: string;
  session: string;
  term: string;
  layout: "merged" | "per_programme";
  programmeFilter?: ProgrammeId | undefined;
}

interface RenderedSubjectRow {
  id: string;
  subjectName: string;
  compValues: number[];
  total: number;
  position: number;
  grade: string;
  remark: string;
  hasEntry: boolean;
}

interface RenderedProgrammeBlock {
  programmeId: string;
  programmeName: string;
  className: string;
  components: ScoreComponentConfig[];
  maxPerSubject: number;
  subjectRows: RenderedSubjectRow[];
  grandTotal: number;
  averagePercentage: number;
  overallGrade: string;
  overallRemark: string;
  position: number;
  classSize: number;
  classAveragePct: number;
  attendance: {
    daysOpened: number;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
    ratePercent: number;
  };
}

interface CoreReportSheetRendererProps {
  db: SchoolDatabaseSnapshot;
  session: string;
  term: string;
  subtitle: string;
  studentInfo: {
    fullName: string;
    admissionId: string;
    gender: string;
    dateOfBirth: string;
    photoUrl?: string | undefined;
  };
  programmeBlocks: RenderedProgrammeBlock[];
  affectiveValues: {
    punctuality: number;
    neatness: number;
    politeness: number;
    honesty: number;
    classTeacherRemark?: string | undefined;
    headTeacherRemark?: string | undefined;
  };
  quranSummary?: {
    surahNumber: number;
    transliteration: string;
    arabicName: string;
    ayahFrom: number;
    ayahTo: number;
    juzCompleted: number;
    quranPct: number;
    recitationScore: number;
    revisionStatus: string;
  } | null;
  previewBadgeLabel?: string | undefined;
}

function CoreReportSheetRenderer({
  db,
  session,
  term,
  subtitle,
  studentInfo,
  programmeBlocks,
  affectiveValues,
  quranSummary,
  previewBadgeLabel,
}: CoreReportSheetRendererProps) {
  const { settings } = db;
  const custom = getResolvedCustomization(settings);
  const design = custom.reportSheet;

  const primaryColor = design.primaryColor || "#0c2340";
  const accentColor = design.accentColor || "#1a4a6e";
  const fontStack = getReportFontStack(design.fontFamily);

  const paperBg =
    design.paperTint === "warm_ivory"
      ? "#FFFDF7"
      : design.paperTint === "cool_ice"
        ? "#F8FBFF"
        : "#FFFFFF";

  const isCompact =
    design.template === "compact_single_page" || design.fontScale === "compact";
  const isLarge = design.fontScale === "large";
  const isBanner = design.template === "executive_banner";
  const isRoyal =
    design.template === "royal_certificate" || design.borderStyle === "double";

  const cellPad = isCompact
    ? "px-2 py-1"
    : isLarge
      ? "px-3 py-2"
      : "px-2.5 py-1.5";
  const tableTextClass = isCompact
    ? "text-[11px]"
    : isLarge
      ? "text-[13px]"
      : "text-xs";

  const showClassPosition =
    design.rankingMode === "positions_and_grade" ||
    design.rankingMode === "class_position_only";
  const showSubjectPosition = design.rankingMode === "positions_and_grade";

  const primaryBlock = programmeBlocks[0];
  const resolvedRemarks = resolveReportCardRemarks({
    customization: custom,
    overallGrade: primaryBlock?.overallGrade ?? "—",
    averagePercentage: primaryBlock?.averagePercentage ?? 0,
    studentName: studentInfo.fullName,
    manualTeacherRemark: affectiveValues.classTeacherRemark,
    manualPrincipalRemark: affectiveValues.headTeacherRemark,
  });

  const outerBorderStyle: React.CSSProperties = isRoyal
    ? {
        borderWidth: "4px",
        borderStyle: "double",
        borderColor: primaryColor,
        backgroundColor: paperBg,
        fontFamily: fontStack,
      }
    : design.borderStyle === "minimal"
      ? {
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "#cbd5e1",
          backgroundColor: paperBg,
          fontFamily: fontStack,
        }
      : {
          borderWidth: "2px",
          borderStyle: "solid",
          borderColor: primaryColor,
          backgroundColor: paperBg,
          fontFamily: fontStack,
        };

  const initials = studentInfo.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const effectiveTitle = design.customReportTitle.trim() || subtitle;

  return (
    <section
      className={`relative mx-auto max-w-[200mm] overflow-hidden rounded-xl text-slate-900 ${
        isCompact ? "p-4 sm:p-5" : "p-5 sm:p-6"
      }`}
      style={outerBorderStyle}
    >
      {/* Optional Preview Ribbon (Only in Customize Studio sample mode) */}
      {previewBadgeLabel && (
        <div className="no-print mb-2.5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900">
          <span>{previewBadgeLabel}</span>
          <span>Live WYSIWYG Preview</span>
        </div>
      )}

      {/* Optional Subtle Crest Watermark */}
      {design.showWatermark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]"
        >
          {settings.logoDataUrl ? (
            <img
              src={settings.logoDataUrl}
              alt=""
              className="h-72 w-72 object-contain"
            />
          ) : (
            <div className="scale-[4]">
              <SchoolCrest settings={settings} size="lg" />
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">
        {/* Letterhead — Executive Colored Banner vs Classic Centered Header */}
        {isBanner ? (
          <div
            className="rounded-xl p-4 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-xl bg-white/95 p-1">
                <SchoolCrest settings={settings} size={isCompact ? "md" : "lg"} />
              </div>
              <div className="min-w-0 flex-1 text-center">
                <h1
                  className={`font-extrabold tracking-tight text-white uppercase ${
                    isCompact ? "text-lg" : "text-xl"
                  }`}
                >
                  {settings.name}
                </h1>
                {settings.arabicName && (
                  <div
                    dir="rtl"
                    lang="ar"
                    className="font-arabic text-sm font-bold text-white/90"
                  >
                    {settings.arabicName}
                  </div>
                )}
                {settings.motto && (
                  <p className="text-xs italic text-white/85">
                    “{settings.motto}”
                  </p>
                )}
                {(settings.address || settings.phone) && (
                  <p className="mt-0.5 text-[11px] text-white/80">
                    {[settings.address, settings.phone ? `Tel: ${settings.phone}` : ""]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
                <div
                  className="mt-1.5 inline-block rounded-full px-3.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.16)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  {effectiveTitle} — {session} ({term})
                </div>
              </div>
              {design.showStudentPhotoBox && (
                <div className="flex h-15 w-15 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/15 text-center text-white">
                  {studentInfo.photoUrl ? (
                    <img
                      src={studentInfo.photoUrl}
                      alt={studentInfo.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-sm font-extrabold">{initials}</span>
                      <span className="text-[8px] font-semibold tracking-wider opacity-80">
                        PUPIL
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="pb-3"
            style={{ borderBottom: `2px solid ${primaryColor}` }}
          >
            <div className="flex items-center justify-between gap-3">
              <SchoolCrest settings={settings} size={isCompact ? "md" : "lg"} />
              <div className="min-w-0 flex-1 text-center">
                <h1
                  className={`font-extrabold tracking-tight uppercase ${
                    isCompact ? "text-lg" : "text-xl"
                  }`}
                  style={{ color: primaryColor }}
                >
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
                {settings.motto && (
                  <p className="text-xs italic text-slate-600">
                    “{settings.motto}”
                  </p>
                )}
                {(settings.address || settings.phone) && (
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {[settings.address, settings.phone ? `Tel: ${settings.phone}` : ""]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
                <div
                  className="mt-1.5 inline-block rounded-md px-3 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase sm:text-[11px]"
                  style={{ backgroundColor: primaryColor }}
                >
                  {effectiveTitle} — {session} ({term})
                </div>
              </div>
              {design.showStudentPhotoBox && (
                <div className="flex h-15 w-15 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50 text-center">
                  {studentInfo.photoUrl ? (
                    <img
                      src={studentInfo.photoUrl}
                      alt={studentInfo.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <span
                        className="text-sm font-extrabold"
                        style={{ color: primaryColor }}
                      >
                        {initials}
                      </span>
                      <span className="text-[8px] font-semibold text-slate-500">
                        STUDENT
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Student Bio Band */}
        <div
          className={`mt-2.5 grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-50/90 ${
            isCompact ? "p-2 text-[11px]" : "p-2.5 text-xs"
          } sm:grid-cols-4`}
        >
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase">
              Student Name
            </span>
            <span className="font-bold text-slate-900">
              {studentInfo.fullName}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase">
              Admission No
            </span>
            <span className="font-mono font-bold text-slate-900">
              {studentInfo.admissionId}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase">
              {settings.labels.classSingular}
            </span>
            <span className="font-bold text-slate-900">
              {programmeBlocks.map((r) => r.className).join(" • ") || "—"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase">
              Gender / DOB
            </span>
            <span className="font-bold text-slate-900">
              {studentInfo.gender}
              {studentInfo.dateOfBirth ? ` • ${studentInfo.dateOfBirth}` : ""}
            </span>
          </div>
        </div>

        {/* Programme Academic Marksheets */}
        {programmeBlocks.map((block) => {
          const showProgTitle = programmeBlocks.length > 1;
          const displayComponents = design.consolidateCA
            ? (() => {
                const examComp =
                  block.components[block.components.length - 1] ?? {
                    id: "exam",
                    label: "Exam",
                    maxScore: 60,
                  };
                const caComps = block.components.slice(0, -1);
                if (caComps.length <= 1) return block.components;
                const caMax = caComps.reduce((s, c) => s + c.maxScore, 0);
                return [
                  { id: "__ca_combined", label: "CA Total", maxScore: caMax },
                  examComp,
                ];
              })()
            : block.components;

          return (
            <div key={block.programmeId} className="mt-3">
              {/* Standing Summary Strip */}
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div
                  className="text-xs font-extrabold tracking-wider uppercase"
                  style={{ color: primaryColor }}
                >
                  {showProgTitle
                    ? `${block.programmeName} (${block.className})`
                    : `${settings.labels.classSingular}: ${block.className} — Academic Performance`}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-slate-700">
                  <span>
                    Total:{" "}
                    <strong className="text-slate-900">{block.grandTotal}</strong>
                  </span>
                  <span>
                    Pupil Avg:{" "}
                    <strong className="text-slate-900">
                      {block.averagePercentage}%
                    </strong>
                  </span>
                  {design.showClassAverage && block.classAveragePct > 0 && (
                    <span>
                      Class Avg:{" "}
                      <strong className="text-slate-800">
                        {block.classAveragePct}%
                      </strong>
                    </span>
                  )}
                  {showClassPosition && (
                    <span>
                      Position:{" "}
                      <strong style={{ color: accentColor }}>
                        {block.position > 0
                          ? `${formatOrdinal(block.position)} of ${block.classSize}`
                          : "—"}
                      </strong>
                    </span>
                  )}
                  {design.showOverallGradeBadge && (
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Final Grade: {block.overallGrade}
                    </span>
                  )}
                </div>
              </div>

              {/* Scores Table */}
              <table
                className={`w-full border-collapse border border-slate-300 ${tableTextClass} ${
                  design.fontFamily === "mono_tabular" ? "tabular-nums" : ""
                }`}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor:
                        design.template === "executive_banner"
                          ? primaryColor
                          : "#f1f5f9",
                      color:
                        design.template === "executive_banner"
                          ? "#ffffff"
                          : primaryColor,
                    }}
                  >
                    <th
                      className={`border border-slate-300 ${cellPad} text-left font-bold`}
                    >
                      Subject
                    </th>
                    {displayComponents.map((c) => (
                      <th
                        key={c.id}
                        className={`border border-slate-300 ${cellPad} text-center font-bold`}
                      >
                        {c.label} ({c.maxScore})
                      </th>
                    ))}
                    <th
                      className={`border border-slate-300 ${cellPad} text-center font-bold`}
                    >
                      Total ({block.maxPerSubject})
                    </th>
                    {showSubjectPosition && (
                      <th
                        className={`border border-slate-300 ${cellPad} text-center font-bold`}
                      >
                        Pos
                      </th>
                    )}
                    <th
                      className={`border border-slate-300 ${cellPad} text-center font-bold`}
                    >
                      Grade
                    </th>
                    {design.showSubjectRemarks && (
                      <th
                        className={`border border-slate-300 ${cellPad} text-left font-bold`}
                      >
                        Remark
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {block.subjectRows.map((row) => {
                    const renderedVals =
                      design.consolidateCA && row.compValues.length > 2
                        ? [
                            row.compValues
                              .slice(0, -1)
                              .reduce((s, n) => s + n, 0),
                            row.compValues[row.compValues.length - 1] ?? 0,
                          ]
                        : row.compValues;

                    return (
                      <tr
                        key={row.id}
                        className={
                          design.tableStriped ? "even:bg-slate-50/75" : ""
                        }
                      >
                        <td
                          className={`border border-slate-300 ${cellPad} font-semibold text-slate-900`}
                        >
                          {row.subjectName}
                        </td>
                        {renderedVals.map((v, idx) => (
                          <td
                            key={idx}
                            className={`border border-slate-300 ${cellPad} text-center text-slate-700`}
                          >
                            {!row.hasEntry ? "—" : v}
                          </td>
                        ))}
                        <td
                          className={`border border-slate-300 ${cellPad} text-center font-bold text-slate-900`}
                        >
                          {!row.hasEntry ? "—" : row.total}
                        </td>
                        {showSubjectPosition && (
                          <td
                            className={`border border-slate-300 ${cellPad} text-center font-semibold`}
                            style={{ color: accentColor }}
                          >
                            {row.hasEntry && row.position > 0
                              ? formatOrdinal(row.position)
                              : "—"}
                          </td>
                        )}
                        <td
                          className={`border border-slate-300 ${cellPad} text-center font-extrabold`}
                          style={{ color: primaryColor }}
                        >
                          {row.grade}
                        </td>
                        {design.showSubjectRemarks && (
                          <td
                            className={`border border-slate-300 ${cellPad} text-slate-700`}
                          >
                            {row.remark}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Attendance Strip */}
              {design.showAttendanceSummary && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700">
                  <span>
                    Attendance:{" "}
                    <strong>{block.attendance.daysPresent}</strong> of{" "}
                    <strong>{block.attendance.daysOpened}</strong> days opened (
                    <strong>{block.attendance.ratePercent}%</strong>)
                  </span>
                  <span>
                    Late: <strong>{block.attendance.daysLate}</strong> • Absent:{" "}
                    <strong>{block.attendance.daysAbsent}</strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Optional Qur'an Memorization Box */}
        {settings.enableQuranModule && quranSummary && (
          <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs">
            <div className="font-bold text-emerald-950 uppercase">
              Optional Qur'an Progress Summary
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-emerald-900">
              <span>
                Current Surah:{" "}
                <strong>
                  {quranSummary.surahNumber}. {quranSummary.transliteration}
                </strong>{" "}
                <span dir="rtl" lang="ar" className="font-arabic">
                  ({quranSummary.arabicName})
                </span>{" "}
                • Ayah {quranSummary.ayahFrom}–{quranSummary.ayahTo}
              </span>
              <span>
                Juz Completed: <strong>{quranSummary.juzCompleted}/30</strong> (
                {quranSummary.quranPct}%) • Score:{" "}
                <strong>{quranSummary.recitationScore}%</strong> (
                {quranSummary.revisionStatus})
              </span>
            </div>
          </div>
        )}

        {/* Conduct Skills + Auto/Manual Teacher & Principal Remarks */}
        <div
          className={`mt-2.5 grid grid-cols-1 gap-2.5 text-xs ${
            design.showAffectiveSkills ? "sm:grid-cols-3" : ""
          }`}
        >
          {design.showAffectiveSkills && (
            <div className="rounded-lg border border-slate-300 bg-white/80 p-2.5">
              <div
                className="text-[10px] font-bold uppercase"
                style={{ color: primaryColor }}
              >
                Conduct & Skills (1–5)
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px]">
                <span>
                  {design.affectiveSkillLabels.punctuality}:{" "}
                  <strong>{affectiveValues.punctuality}/5</strong>
                </span>
                <span>
                  {design.affectiveSkillLabels.neatness}:{" "}
                  <strong>{affectiveValues.neatness}/5</strong>
                </span>
                <span>
                  {design.affectiveSkillLabels.politeness}:{" "}
                  <strong>{affectiveValues.politeness}/5</strong>
                </span>
                <span>
                  {design.affectiveSkillLabels.honesty}:{" "}
                  <strong>{affectiveValues.honesty}/5</strong>
                </span>
              </div>
            </div>
          )}

          <div
            className={`space-y-1.5 rounded-lg border border-slate-300 bg-white/80 p-2.5 ${
              design.showAffectiveSkills ? "sm:col-span-2" : ""
            }`}
          >
            <div>
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: accentColor }}
              >
                {settings.labels.classSingular}{" "}
                {settings.labels.teacherSingular}'s Remark:{" "}
              </span>
              <span className="font-medium text-slate-800">
                {resolvedRemarks.teacherRemark}
              </span>
            </div>
            <div>
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: primaryColor }}
              >
                {design.principalTitleLabel}'s Remark:{" "}
              </span>
              <span className="font-semibold text-slate-900">
                {resolvedRemarks.principalRemark}
              </span>
            </div>
          </div>
        </div>

        {/* Next Term Resumption & Optional Fee Note */}
        {(design.showNextTermDate || design.showNextTermFeeNote) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700">
            {design.showNextTermDate && (
              <span>
                Next {settings.labels.termLabel} Begins:{" "}
                <strong className="text-slate-900">
                  {design.nextTermBegins.trim() || "To Be Announced"}
                </strong>
              </span>
            )}
            {design.showNextTermFeeNote && design.nextTermFeeNote.trim() && (
              <span className="font-semibold" style={{ color: accentColor }}>
                {design.nextTermFeeNote}
              </span>
            )}
          </div>
        )}

        {/* Grading Key */}
        {design.showGradingKey && (
          <div className="mt-2 text-[10px] text-slate-500">
            <strong>Grading Scale:</strong>{" "}
            {settings.grading.gradeBands
              .map((b) => `${b.grade} (${b.min}–${b.max}% ${b.remark})`)
              .join(" • ")}
          </div>
        )}

        {/* Signatures & Uploaded Stamp/Signature */}
        <div
          className={`${
            isCompact ? "mt-4 pt-2" : "mt-6 pt-3"
          } grid grid-cols-2 items-end gap-8 text-xs`}
        >
          <div className="text-center">
            <div className="h-8" />
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
              {settings.labels.classSingular} {settings.labels.teacherSingular}'s
              Signature & Date
            </div>
          </div>
          <div className="text-center">
            <div className="flex h-8 items-end justify-center pb-0.5">
              {design.principalSignatureDataUrl ? (
                <img
                  src={design.principalSignatureDataUrl}
                  alt="Principal signature"
                  className="max-h-8 object-contain"
                />
              ) : design.principalSignatureName.trim() ? (
                <span
                  className="font-serif text-sm italic font-bold"
                  style={{ color: primaryColor }}
                >
                  {design.principalSignatureName}
                </span>
              ) : null}
            </div>
            <div
              className="border-t border-slate-400 pt-1 font-semibold"
              style={{ color: primaryColor }}
            >
              {design.principalTitleLabel}'s Signature & School Stamp
            </div>
          </div>
        </div>

        {/* Custom Footer Line */}
        {design.footerNote.trim() && (
          <div className="mt-2.5 border-t border-slate-200 pt-1.5 text-center text-[9.5px] text-slate-500">
            {design.footerNote}
          </div>
        )}
      </div>
    </section>
  );
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
  );

  const buildProgrammeReportData = (
    programmeId: ProgrammeId
  ): RenderedProgrammeBlock | null => {
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
    const activeStandings = broadsheet.filter((b) => b.subjectsCounted > 0);
    const classAveragePct =
      activeStandings.length > 0
        ? Number(
            (
              activeStandings.reduce((s, r) => s + r.averagePercentage, 0) /
              activeStandings.length
            ).toFixed(1)
          )
        : 0;

    const subjectRows: RenderedSubjectRow[] = progSubjects.map((sub) => {
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
        id: sub.id,
        subjectName: sub.name,
        compValues,
        total,
        position: subPos,
        grade: rec ? grade : "—",
        remark: rec ? remark : "—",
        hasEntry: Boolean(rec),
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
      maxPerSubject: maxPerSub,
      subjectRows,
      grandTotal: myStanding?.grandTotal ?? 0,
      averagePercentage: myStanding?.averagePercentage ?? 0,
      overallGrade: myStanding?.overallGrade ?? "—",
      overallRemark: myStanding?.overallRemark ?? "—",
      position: myStanding?.position ?? 0,
      classSize: broadsheet.length,
      classAveragePct,
      attendance: {
        daysOpened: att.daysOpened,
        daysPresent: att.daysPresent,
        daysLate: att.daysLate,
        daysAbsent: att.daysAbsent,
        ratePercent: att.ratePercent,
      },
    };
  };

  const progReports = activeProgs
    .map((p) => buildProgrammeReportData(p.id))
    .filter((d): d is RenderedProgrammeBlock => Boolean(d));

  const quranSummary =
    settings.enableQuranModule && quranRec && surah
      ? {
          surahNumber: surah.number,
          transliteration: surah.transliteration,
          arabicName: surah.arabicName,
          ayahFrom: quranRec.ayahFrom,
          ayahTo: quranRec.ayahTo,
          juzCompleted: quranRec.juzCompleted,
          quranPct,
          recitationScore: quranRec.recitationScore,
          revisionStatus: quranRec.revisionStatus,
        }
      : null;

  const affectiveValues = {
    punctuality: aff?.punctuality ?? 5,
    neatness: aff?.neatness ?? 5,
    politeness: aff?.politeness ?? 5,
    honesty: aff?.honesty ?? 5,
    classTeacherRemark: aff?.classTeacherRemark,
    headTeacherRemark: aff?.headTeacherRemark,
  };

  const studentInfo = {
    fullName: student.fullName,
    admissionId: student.admissionId,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    photoUrl: student.photoUrl,
  };

  if (layout === "per_programme" && progReports.length > 1) {
    return (
      <div className="space-y-8 print:space-y-0">
        {progReports.map((rep, idx) => (
          <div
            key={rep.programmeId}
            className={idx > 0 ? "print:break-before-page" : ""}
          >
            <CoreReportSheetRenderer
              db={db}
              session={session}
              term={term}
              subtitle={`${rep.programmeName} Report Card`}
              studentInfo={studentInfo}
              programmeBlocks={[rep]}
              affectiveValues={affectiveValues}
              quranSummary={quranSummary}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <CoreReportSheetRenderer
      db={db}
      session={session}
      term={term}
      subtitle="Student Termly Report Sheet"
      studentInfo={studentInfo}
      programmeBlocks={progReports}
      affectiveValues={affectiveValues}
      quranSummary={quranSummary}
    />
  );
}

/**
 * Interactive WYSIWYG Preview Sheet used ONLY inside the Customize & Design Studio
 * so proprietors can preview every Layout, Colour, Font, Ranking Mode & A–F Auto-Comment
 * in real time even before admitting their first student (never touches db.students!).
 */
export function ReportCardDesignPreviewSample({
  db,
  simulatedGrade = "A",
}: {
  db: SchoolDatabaseSnapshot;
  simulatedGrade?: GradeLetterKey;
}) {
  const { settings, classes, subjects } = db;
  const mainProgId = settings.programmes[0]?.id ?? "prog-main";
  const components = getGradingComponents(settings, mainProgId);
  const maxPerSub = components.reduce((s, c) => s + c.maxScore, 0) || 100;

  const targetPctByGrade: Record<GradeLetterKey, number> = {
    A: 84,
    B: 65,
    C: 55,
    D: 47,
    E: 42,
    F: 32,
  };
  const basePct = targetPctByGrade[simulatedGrade];

  const sampleSubjects = subjects.slice(0, 5);
  const effectiveSubjects =
    sampleSubjects.length > 0
      ? sampleSubjects
      : [
          { id: "s1", name: "English Studies" },
          { id: "s2", name: "Mathematics" },
          { id: "s3", name: "Basic Science & Technology" },
          { id: "s4", name: "Civic & National Values" },
        ];

  const offsets = [4, -2, 2, -3, 0];
  const rows: RenderedSubjectRow[] = effectiveSubjects.map((sub, idx) => {
    const pct = Math.max(15, Math.min(98, basePct + (offsets[idx % offsets.length] ?? 0)));
    const targetTotal = Math.round((pct / 100) * maxPerSub);
    let remaining = targetTotal;
    const compValues = components.map((comp, cIdx) => {
      if (cIdx === components.length - 1) {
        return Math.max(0, Math.min(comp.maxScore, remaining));
      }
      const share = Math.min(
        comp.maxScore,
        Math.round((comp.maxScore / maxPerSub) * targetTotal)
      );
      remaining -= share;
      return share;
    });
    const total = compValues.reduce((a, b) => a + b, 0);
    const { grade, remark } = evaluateGrade(
      (total / maxPerSub) * 100,
      settings.grading.gradeBands
    );
    return {
      id: sub.id,
      subjectName: sub.name,
      compValues,
      total,
      position: simulatedGrade === "A" ? 1 : simulatedGrade === "B" ? 4 : simulatedGrade === "C" ? 10 : 18,
      grade,
      remark,
      hasEntry: true,
    };
  });

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const averagePercentage = Number(
    (grandTotal / ((rows.length || 1) * maxPerSub) * 100).toFixed(1)
  );
  const overallEval = evaluateGrade(
    averagePercentage,
    settings.grading.gradeBands
  );

  const sampleBlock: RenderedProgrammeBlock = {
    programmeId: mainProgId,
    programmeName: settings.programmes[0]?.name ?? "Main School",
    className: classes[1]?.name ?? classes[0]?.name ?? "Primary 1",
    components,
    maxPerSubject: maxPerSub,
    subjectRows: rows,
    grandTotal,
    averagePercentage,
    overallGrade: simulatedGrade || overallEval.grade,
    overallRemark: overallEval.remark,
    position:
      simulatedGrade === "A"
        ? 1
        : simulatedGrade === "B"
          ? 5
          : simulatedGrade === "C"
            ? 12
            : simulatedGrade === "D"
              ? 18
              : simulatedGrade === "E"
                ? 21
                : 24,
    classSize: 25,
    classAveragePct: 63.4,
    attendance: {
      daysOpened: settings.daysSchoolOpened || 62,
      daysPresent: 60,
      daysLate: 1,
      daysAbsent: 2,
      ratePercent: 97,
    },
  };

  return (
    <CoreReportSheetRenderer
      db={db}
      session={settings.currentSession}
      term={settings.currentTerm}
      subtitle="Student Termly Report Sheet"
      studentInfo={{
        fullName: "Amina Ibrahim Musa",
        admissionId: `${settings.code || "SCH"}/2026/001`,
        gender: "Female",
        dateOfBirth: "2015-05-14",
      }}
      programmeBlocks={[sampleBlock]}
      affectiveValues={{
        punctuality: simulatedGrade === "F" ? 3 : 5,
        neatness: 5,
        politeness: 5,
        honesty: 5,
      }}
      previewBadgeLabel={`TEMPLATE DESIGN PREVIEW (Simulated Final Grade: ${simulatedGrade})`}
    />
  );
}
