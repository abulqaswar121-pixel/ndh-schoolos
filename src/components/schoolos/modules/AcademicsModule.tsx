import {
  Check,
  Download,
  Lock,
  LockOpen,
  Palette,
  Plus,
  Printer,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { QURAN_SURAHS, getSurahByNumber } from "@/data/quranSurahs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { getTermControl } from "@/services/accessControl";
import {
  computeClassBroadsheet,
  computeQuranProgressPercent,
  computeSubjectMarksheet,
  exportRowsToCsv,
  formatOrdinal,
  getActiveProgrammes,
  getGradingComponents,
} from "@/services/calculations";
import { getResolvedCustomization } from "@/services/customizationDefaults";
import type { MurajaahStatus, ProgrammeId } from "@/types/school";

export function AcademicsModule() {
  const {
    db,
    portal,
    setActiveNav,
    updateScoreCell,
    setTermResultStatus,
    reviewPendingScoreEdit,
    upsertQuranRecord,
    upsertAffectiveRating,
    applyGradeAutoCommentsToClass,
    upsertSubject,
    deleteSubject,
    openPrintPreview,
  } = useSchoolOS();
  const {
    settings,
    classes,
    subjects,
    students,
    scores,
    pendingScoreEdits,
    quranRecords,
    affective,
  } = db;

  const isAdmin = portal.role === "admin";
  const canViewBroadsheet =
    portal.role === "admin" ||
    portal.role === "class_teacher" ||
    portal.role === "muallim";

  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  const [selectedSession, setSelectedSession] = useState(
    settings.currentSession
  );
  const [selectedTerm, setSelectedTerm] = useState(settings.currentTerm);
  const [selectedProgId, setSelectedProgId] = useState<ProgrammeId>(
    classes[0]?.programmeId ?? activeProgrammes[0]?.id ?? "prog-main"
  );

  const progClasses = useMemo(
    () => classes.filter((c) => c.programmeId === selectedProgId),
    [classes, selectedProgId]
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    progClasses[0]?.id ?? ""
  );
  const activeClassId = progClasses.some((c) => c.id === selectedClassId)
    ? selectedClassId
    : (progClasses[0]?.id ?? "");

  const progSubjects = useMemo(
    () => subjects.filter((s) => s.programmeId === selectedProgId),
    [subjects, selectedProgId]
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    progSubjects[0]?.id ?? ""
  );
  const activeSubjectId = progSubjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : (progSubjects[0]?.id ?? "");

  const termControl = getTermControl(db, selectedSession, selectedTerm);
  const pendingRequests = useMemo(
    () => pendingScoreEdits.filter((r) => r.status === "pending"),
    [pendingScoreEdits]
  );

  const components = useMemo(
    () => getGradingComponents(settings, selectedProgId, activeClassId),
    [settings, selectedProgId, activeClassId]
  );

  const marksheet = useMemo(
    () =>
      computeSubjectMarksheet({
        students,
        scores,
        components,
        gradeBands: settings.grading.gradeBands,
        classId: activeClassId,
        subjectId: activeSubjectId,
        programmeId: selectedProgId,
        session: selectedSession,
        term: selectedTerm,
      }),
    [
      students,
      scores,
      components,
      settings.grading.gradeBands,
      activeClassId,
      activeSubjectId,
      selectedProgId,
      selectedSession,
      selectedTerm,
    ]
  );

  const broadsheetRows = useMemo(
    () =>
      computeClassBroadsheet({
        students,
        subjects,
        scores,
        settings,
        classId: activeClassId,
        programmeId: selectedProgId,
        session: selectedSession,
        term: selectedTerm,
      }),
    [
      students,
      subjects,
      scores,
      settings,
      activeClassId,
      selectedProgId,
      selectedSession,
      selectedTerm,
    ]
  );

  // Add Subject form state (Admin)
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");

  // Optional Qur'an tracker state (only active when settings.enableQuranModule is true)
  const [quranStudentId, setQuranStudentId] = useState<string>(
    students[0]?.id ?? ""
  );
  const activeQuranStudent =
    students.find((s) => s.id === quranStudentId) ?? students[0];
  const existingQuranRec = activeQuranStudent
    ? quranRecords.find((q) => q.studentId === activeQuranStudent.id)
    : undefined;

  const [surahNum, setSurahNum] = useState<number>(
    existingQuranRec?.currentSurahNumber ?? 1
  );
  const [ayahFrom, setAyahFrom] = useState<number>(
    existingQuranRec?.ayahFrom ?? 1
  );
  const [ayahTo, setAyahTo] = useState<number>(existingQuranRec?.ayahTo ?? 7);
  const [juzDone, setJuzDone] = useState<number>(
    existingQuranRec?.juzCompleted ?? 1
  );
  const [recitationScore, setRecitationScore] = useState<number>(
    existingQuranRec?.recitationScore ?? 85
  );
  const [revStatus, setRevStatus] = useState<MurajaahStatus>(
    existingQuranRec?.revisionStatus ?? "Strong"
  );
  const [quranNote, setQuranNote] = useState<string>(
    existingQuranRec?.teacherNotes ?? ""
  );

  const activeSubject = progSubjects.find((s) => s.id === activeSubjectId);
  const activeClass = progClasses.find((c) => c.id === activeClassId);

  const handleExportMarksheetCsv = () => {
    exportRowsToCsv(
      `${settings.code}_marksheet_${activeClass?.name ?? "class"}_${activeSubject?.code ?? "sub"}`,
      [
        "Admission ID",
        "Student Name",
        ...components.map((c) => `${c.label} (${c.maxScore})`),
        "Total",
        "Position",
        "Grade",
        "Remark",
      ],
      marksheet.rows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        ...components.map((c) => (r.hasEntry ? (r.scores[c.id] ?? 0) : "")),
        r.hasEntry ? r.total : "",
        r.position ? formatOrdinal(r.position) : "",
        r.grade,
        r.remark,
      ])
    );
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) {
      toast.error("Enter subject name and short code.");
      return;
    }
    upsertSubject({
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      code: newSubCode.trim().toUpperCase(),
      programmeId: selectedProgId,
    });
    setNewSubName("");
    setNewSubCode("");
    toast.success("Subject added.");
  };

  const handleSaveQuranLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuranStudent) return;
    const surahMeta = getSurahByNumber(surahNum);
    const clampedTo = Math.min(surahMeta.ayahCount, Math.max(1, ayahTo));
    const clampedFrom = Math.min(clampedTo, Math.max(1, ayahFrom));
    upsertQuranRecord({
      studentId: activeQuranStudent.id,
      currentSurahNumber: surahNum,
      ayahFrom: clampedFrom,
      ayahTo: clampedTo,
      juzCompleted: Math.min(30, Math.max(0, juzDone)),
      hizbCompleted: Math.min(60, Math.max(0, juzDone * 2)),
      revisionStatus: revStatus,
      recitationScore: Math.min(100, Math.max(0, recitationScore)),
      teacherNotes: quranNote,
      appendLog: true,
    });
    toast.success(`Saved Qur'an progress for ${activeQuranStudent.fullName}`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header + Admin Result Lock & Publish Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Results & Report Cards
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Enter CA1, CA2 and Exam scores once. Totals, grades, positions and printable report cards compute automatically.
          </p>
        </div>

        {/* Admin Term Result Lock & Publish Bar */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const nextPub = !termControl.isPublished;
                setTermResultStatus({
                  session: selectedSession,
                  term: selectedTerm,
                  isPublished: nextPub,
                });
                toast.success(
                  nextPub
                    ? `${selectedTerm} results published. Teacher score edits now require Admin approval.`
                    : `${selectedTerm} results returned to draft.`
                );
              }}
              className={`text-xs font-bold ${
                termControl.isPublished
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {termControl.isPublished
                ? "Published (Click to Unpublish)"
                : "Publish Term Results"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                const nextLock = !termControl.isLocked;
                setTermResultStatus({
                  session: selectedSession,
                  term: selectedTerm,
                  isLocked: nextLock,
                });
                toast.success(
                  nextLock
                    ? `${selectedTerm} results LOCKED. Teachers can no longer edit scores.`
                    : `${selectedTerm} results UNLOCKED by Admin.`
                );
              }}
              className={`text-xs font-bold text-white ${
                termControl.isLocked
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-[#0F172A] hover:bg-[#1E3A8A]"
              }`}
            >
              {termControl.isLocked ? (
                <>
                  <LockOpen className="mr-1.5 h-3.5 w-3.5" />
                  Unlock Term Results
                </>
              ) : (
                <>
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Lock Term Results
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Status Banner for Locked or Published Term Results */}
      {termControl.isLocked ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-950">
          <Lock className="h-4 w-4 shrink-0 text-red-700" />
          <span>
            <strong>{selectedTerm} ({selectedSession}) Results are LOCKED:</strong>{" "}
            Teachers cannot edit locked scores. Only the Proprietor / Admin can unlock this term.
          </span>
        </div>
      ) : termControl.isPublished ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-xs font-semibold text-[#0F172A]">
          <Send className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
          <span>
            <strong>{selectedTerm} ({selectedSession}) Results are PUBLISHED:</strong>{" "}
            Any score edit entered by a teacher requires Proprietor / Admin approval before changing published results.
          </span>
        </div>
      ) : null}

      {/* Admin Pending Published Score Edit Approvals Queue */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="ndh-card border-amber-300 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-amber-950">
              Pending Teacher Edits to Published Results ({pendingRequests.length})
            </h2>
            <span className="text-[11px] font-semibold text-amber-800">
              Approval required before score updates
            </span>
          </div>

          <div className="divide-y divide-amber-200 rounded-xl border border-amber-200 bg-white">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div>
                  <div className="font-bold text-[#0F172A]">
                    {req.studentName} • {req.subjectName} ({req.className})
                  </div>
                  <div className="text-slate-600">
                    {req.componentLabel}:{" "}
                    <span className="font-mono font-semibold">
                      {req.oldValue ?? "Empty"}
                    </span>{" "}
                    →{" "}
                    <strong className="font-mono text-[#1E3A8A]">
                      {req.newValue}
                    </strong>{" "}
                    • Requested by {req.requestedBy}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      reviewPendingScoreEdit(req.id, "approved");
                      toast.success("Approved and updated published score.");
                    }}
                    className="h-8 bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      reviewPendingScoreEdit(req.id, "rejected");
                      toast.info("Rejected score change request.");
                    }}
                    className="h-8 border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selector Bar (Session, Term, Programme, Class, Subject) */}
      <div className="ndh-card flex flex-wrap items-center gap-2.5 p-3.5 sm:p-4">
        <select
          aria-label="Select session"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
        >
          {settings.sessions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Select term"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
        >
          {settings.terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {settings.multiProgrammeEnabled && (
          <select
            aria-label="Select programme"
            value={selectedProgId}
            onChange={(e) => setSelectedProgId(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
          >
            {activeProgrammes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <select
          aria-label={`Select ${settings.labels.classSingular.toLowerCase()}`}
          value={activeClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
        >
          {progClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Select subject"
          value={activeSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-[#1E3A8A]"
        >
          {progSubjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name} ({sub.code})
            </option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="marksheet" className="space-y-4">
        <TabsList className="flex flex-wrap bg-slate-200/80 h-auto p-1">
          <TabsTrigger value="marksheet" className="text-xs font-bold">
            Subject Marksheet
          </TabsTrigger>
          {canViewBroadsheet && (
            <TabsTrigger value="broadsheet" className="text-xs font-bold">
              {settings.labels.classSingular} Broadsheet & Report Cards
            </TabsTrigger>
          )}
          {canViewBroadsheet && (
            <TabsTrigger value="remarks" className="text-xs font-bold">
              Conduct & Remarks
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="subjects" className="text-xs font-bold">
              Subjects Setup
            </TabsTrigger>
          )}
          {/* Optional 114-Surah Qur'an Tracker — HIDDEN ENTIRELY WHEN OFF */}
          {settings.enableQuranModule && canViewBroadsheet && (
            <TabsTrigger value="quran" className="text-xs font-bold">
              Qur'an Progress (Optional)
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. Subject Marksheet Tab */}
        <TabsContent value="marksheet" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700">
              <strong>{activeClass?.name ?? "—"}</strong> •{" "}
              <strong>{activeSubject?.name ?? "—"}</strong> • Class Avg:{" "}
              <strong>{marksheet.classAverage}%</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportMarksheetCsv}
                className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-[#1E3A8A]" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  openPrintPreview({
                    type: "table",
                    title: `${activeClass?.name ?? ""} — ${activeSubject?.name ?? ""} Marksheet`,
                    subtitle: `${selectedSession} • ${selectedTerm}`,
                    headers: [
                      "Admission ID",
                      "Student Name",
                      ...components.map((c) => `${c.label} (${c.maxScore})`),
                      "Total",
                      "Pos",
                      "Grade",
                    ],
                    rows: marksheet.rows.map((r) => [
                      r.student.admissionId,
                      r.student.fullName,
                      ...components.map((c) =>
                        r.hasEntry ? (r.scores[c.id] ?? 0) : "—"
                      ),
                      r.hasEntry ? r.total : "—",
                      formatOrdinal(r.position),
                      r.grade,
                    ]),
                  })
                }
                className="h-8 bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Marksheet
              </Button>
            </div>
          </div>

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Student</th>
                    {components.map((comp) => (
                      <th key={comp.id} className="px-3 py-3 text-center">
                        {comp.label} (/{comp.maxScore})
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">Total</th>
                    <th className="px-3 py-3 text-center">Position</th>
                    <th className="px-3 py-3 text-center">Grade</th>
                    <th className="px-4 py-3">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {marksheet.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={components.length + 5}
                        className="px-4 py-8 text-center text-xs text-slate-500"
                      >
                        No active students in this {settings.labels.classSingular.toLowerCase()}.
                      </td>
                    </tr>
                  ) : (
                    marksheet.rows.map((row) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-[#0F172A]">
                            {row.student.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {row.student.admissionId}
                          </div>
                        </td>
                        {components.map((comp) => {
                          const currentVal = row.scores[comp.id];
                          return (
                            <td key={comp.id} className="px-3 py-2.5 text-center">
                              <input
                                type="number"
                                min={0}
                                max={comp.maxScore}
                                disabled={termControl.isLocked}
                                defaultValue={
                                  currentVal !== undefined ? currentVal : ""
                                }
                                key={`${row.student.id}_${activeSubjectId}_${comp.id}_${currentVal ?? "empty"}_${termControl.isLocked}`}
                                onBlur={(e) => {
                                  if (e.target.value === "") return;
                                  const num = Math.max(
                                    0,
                                    Math.min(
                                      comp.maxScore,
                                      Number(e.target.value) || 0
                                    )
                                  );
                                  if (num === currentVal) return;
                                  updateScoreCell({
                                    studentId: row.student.id,
                                    subjectId: activeSubjectId,
                                    classId: activeClassId,
                                    programmeId: selectedProgId,
                                    session: selectedSession,
                                    term: selectedTerm,
                                    componentId: comp.id,
                                    value: num,
                                  });
                                }}
                                aria-label={`${row.student.fullName} ${comp.label}`}
                                className="h-9 w-16 rounded-lg border border-slate-300 bg-white text-center text-xs font-bold text-[#0F172A] focus:border-[#1E3A8A] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center font-extrabold text-[#0F172A]">
                          {row.hasEntry ? row.total : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#1E3A8A]">
                          {formatOrdinal(row.position)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#0F172A]">
                          {row.grade}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">
                          {row.remark}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 2. Broadsheet & Report Cards Tab */}
        {canViewBroadsheet && (
          <TabsContent value="broadsheet" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">
                Master Broadsheet — <strong>{activeClass?.name ?? ""}</strong> (
                {selectedTerm})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveNav("customize")}
                    className="h-8 border-[#9ed9d6] bg-[#edf7f6] text-xs font-bold text-[#1a4a6e] hover:bg-[#d8efed]"
                  >
                    <Palette className="mr-1.5 h-3.5 w-3.5" />
                    Customize Report Sheet
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() =>
                    openPrintPreview({
                      type: "broadsheet",
                      classId: activeClassId,
                      programmeId: selectedProgId,
                      session: selectedSession,
                      term: selectedTerm,
                    })
                  }
                  className="h-8 bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print A4 Broadsheet
                </Button>
              </div>
            </div>

            <div className="ndh-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold text-[#0F172A] uppercase">
                      {getResolvedCustomization(settings).reportSheet
                        .rankingMode !== "grade_only" && (
                        <th className="px-3 py-3 text-center">Pos</th>
                      )}
                      <th className="px-3 py-3">Student</th>
                      {progSubjects.map((sub) => (
                        <th key={sub.id} className="px-2 py-3 text-center">
                          {sub.code}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center">Total</th>
                      <th className="px-3 py-3 text-center">Avg %</th>
                      <th className="px-3 py-3 text-center">Grade</th>
                      <th className="px-3 py-3 text-right">Report Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {broadsheetRows.map((row) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/70">
                        {getResolvedCustomization(settings).reportSheet
                          .rankingMode !== "grade_only" && (
                          <td className="px-3 py-2.5 text-center font-extrabold text-[#1E3A8A]">
                            {formatOrdinal(row.position)}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-[#0F172A]">
                            {row.student.fullName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {row.student.admissionId}
                          </div>
                        </td>
                        {progSubjects.map((sub) => {
                          const cell = row.subjectTotals[sub.id];
                          return (
                            <td
                              key={sub.id}
                              className="px-2 py-2.5 text-center font-medium text-slate-700"
                            >
                              {cell?.hasEntry ? cell.total : "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center font-bold text-[#0F172A]">
                          {row.grandTotal}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#0F172A]">
                          {row.averagePercentage}%
                        </td>
                        <td className="px-3 py-2.5 text-center font-extrabold text-[#1a4a6e]">
                          {row.overallGrade}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPrintPreview({
                                type: "report_card",
                                studentId: row.student.id,
                                session: selectedSession,
                                term: selectedTerm,
                                layout: settings.reportCardDefaultLayout,
                              })
                            }
                            className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5 text-[#1E3A8A]" />
                            Print Card
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        {/* 3. Conduct & Teacher Remarks Tab */}
        {canViewBroadsheet && (
          <TabsContent value="remarks" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div>
                <div className="font-bold text-[#0F172A]">
                  Auto-Comments by Final Grade (A, B, C, D, E, F)
                </div>
                <div className="text-[11px] text-slate-500">
                  Generate personalized teacher{isAdmin ? " & principal" : ""} remarks for all graded students in {activeClass?.name ?? "this class"} based on their final grade.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveNav("customize")}
                    className="h-8 border-slate-300 bg-white text-xs font-semibold text-slate-700"
                  >
                    <Palette className="mr-1.5 h-3.5 w-3.5 text-[#1a4a6e]" />
                    Edit A–F Comment Rules
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const count = applyGradeAutoCommentsToClass({
                      classId: activeClassId,
                      programmeId: selectedProgId,
                      session: selectedSession,
                      term: selectedTerm,
                    });
                    if (count > 0) {
                      toast.success(
                        `Auto-filled remarks for ${count} graded ${
                          count === 1 ? "student" : "students"
                        } based on Final Grade (A–F).`
                      );
                    } else {
                      toast.info(
                        "Enter subject scores first so each student has a computed Final Grade (A–F)."
                      );
                    }
                  }}
                  className="h-8 bg-[#067647] text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Auto-Fill Remarks by Grade (A–F)
                </Button>
              </div>
            </div>

            <div className="ndh-card divide-y divide-slate-200">
              {broadsheetRows.map((row) => {
                const aff = affective.find(
                  (a) =>
                    a.studentId === row.student.id &&
                    a.session === selectedSession &&
                    a.term === selectedTerm
                ) ?? {
                  id: `${row.student.id}_${selectedSession}_${selectedTerm}`,
                  studentId: row.student.id,
                  session: selectedSession,
                  term: selectedTerm,
                  punctuality: 5,
                  neatness: 5,
                  politeness: 5,
                  honesty: 5,
                  classTeacherRemark:
                    "Attentive in class and completes assignments on time.",
                  headTeacherRemark: "Good term progress. Keep working hard.",
                };

                return (
                  <div
                    key={`${row.student.id}-${aff.classTeacherRemark}-${aff.headTeacherRemark}`}
                    className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-12 lg:items-center"
                  >
                    <div className="lg:col-span-3">
                      <div className="text-sm font-bold text-[#0F172A]">
                        {row.student.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {getResolvedCustomization(settings).reportSheet
                          .rankingMode !== "grade_only"
                          ? `Position: ${formatOrdinal(row.position)} • `
                          : ""}
                        Avg: {row.averagePercentage}% • Grade:{" "}
                        <strong className="text-[#1a4a6e]">
                          {row.overallGrade}
                        </strong>
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <Label className="text-[11px] font-bold text-slate-600">
                        {settings.labels.classSingular}{" "}
                        {settings.labels.teacherSingular} Remark
                      </Label>
                      <Input
                        defaultValue={aff.classTeacherRemark}
                        onBlur={(e) =>
                          upsertAffectiveRating({
                            ...aff,
                            classTeacherRemark: e.target.value,
                          })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <Label className="text-[11px] font-bold text-slate-600">
                        Principal / Proprietor Remark
                      </Label>
                      <Input
                        defaultValue={aff.headTeacherRemark}
                        disabled={!isAdmin}
                        onBlur={(e) =>
                          upsertAffectiveRating({
                            ...aff,
                            headTeacherRemark: e.target.value,
                          })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-1 lg:text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openPrintPreview({
                            type: "report_card",
                            studentId: row.student.id,
                            session: selectedSession,
                            term: selectedTerm,
                            layout: settings.reportCardDefaultLayout,
                          })
                        }
                        className="h-9 border-slate-200 bg-white text-xs text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        )}

        {/* 4. Subjects Setup Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="subjects" className="space-y-4">
            <form
              onSubmit={handleAddSubject}
              className="ndh-card flex flex-wrap items-end gap-3 p-4"
            >
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs font-bold">Subject Name</Label>
                <Input
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Agricultural Science"
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs font-bold">Short Code</Label>
                <Input
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="AGR"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Subject
              </Button>
            </form>

            <div className="ndh-card divide-y divide-slate-200">
              {progSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm"
                >
                  <div>
                    <span className="font-bold text-[#0F172A]">{sub.name}</span>{" "}
                    <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                      {sub.code}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      deleteSubject(sub.id);
                      toast.success(`Removed ${sub.name}`);
                    }}
                    className="h-8 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {/* 5. Optional 114-Surah Qur'an Tracker (ONLY rendered when settings.enableQuranModule === true) */}
        {settings.enableQuranModule && canViewBroadsheet && (
          <TabsContent value="quran">
            <form
              onSubmit={handleSaveQuranLog}
              className="ndh-card space-y-4 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#0F172A]">
                    Optional 114-Surah Qur'an Tracker
                  </h2>
                  <p className="text-xs text-slate-600">
                    Record Surah, Ayah range, Juz completed and recitation score.
                  </p>
                </div>
                {existingQuranRec && (
                  <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                    Progress: {computeQuranProgressPercent(existingQuranRec)}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Student</Label>
                  <select
                    value={activeQuranStudent?.id ?? ""}
                    onChange={(e) => {
                      const sid = e.target.value;
                      setQuranStudentId(sid);
                      const rec = quranRecords.find((q) => q.studentId === sid);
                      if (rec) {
                        setSurahNum(rec.currentSurahNumber);
                        setAyahFrom(rec.ayahFrom);
                        setAyahTo(rec.ayahTo);
                        setJuzDone(rec.juzCompleted);
                        setRecitationScore(rec.recitationScore);
                        setRevStatus(rec.revisionStatus);
                        setQuranNote(rec.teacherNotes);
                      }
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold">
                    Surah (1–114)
                  </Label>
                  <select
                    value={surahNum}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setSurahNum(n);
                      setAyahFrom(1);
                      setAyahTo(getSurahByNumber(n).ayahCount);
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                  >
                    {QURAN_SURAHS.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {s.transliteration} ({s.arabicName}) —{" "}
                        {s.ayahCount} Ayahs
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Ayah From</Label>
                  <Input
                    type="number"
                    min={1}
                    max={getSurahByNumber(surahNum).ayahCount}
                    value={ayahFrom}
                    onChange={(e) => setAyahFrom(Number(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">
                    Ayah To (Max {getSurahByNumber(surahNum).ayahCount})
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={getSurahByNumber(surahNum).ayahCount}
                    value={ayahTo}
                    onChange={(e) => setAyahTo(Number(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">
                    Juz Completed (0–30)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={juzDone}
                    onChange={(e) => setJuzDone(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">
                    Recitation Score (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={recitationScore}
                    onChange={(e) =>
                      setRecitationScore(Number(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Revision Status</Label>
                  <select
                    value={revStatus}
                    onChange={(e) =>
                      setRevStatus(e.target.value as MurajaahStatus)
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                  >
                    <option value="Fluent">Fluent</option>
                    <option value="Strong">Strong</option>
                    <option value="Needs Work">Needs Work</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Teacher Note</Label>
                  <Input
                    value={quranNote}
                    onChange={(e) => setQuranNote(e.target.value)}
                    placeholder="Short progress note"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                Save Qur'an Progress
              </Button>
            </form>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
