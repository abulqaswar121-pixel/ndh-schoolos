import {
  AlertTriangle,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Edit3,
  FileDown,
  FileText,
  KeyRound,
  LockOpen,
  Mic,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { getActiveProgrammes } from "@/services/calculations";
import {
  type VisionAIConfig,
  compressQuestionPhotoToDataUrl,
  loadVisionAIConfig,
  parseRawTextIntoExamQuestions,
  refineExamPaperMistakes,
  saveVisionAIConfig,
  transcribeQuestionPhotoWithVisionAI,
} from "@/services/examAiService";
import {
  computeExamPaperTotalMarks,
  exportExamPaperToWordDoc,
} from "@/services/examPaperExportService";
import type {
  ExamObjectiveQuestion,
  ExamPaperStatus,
  ExamPaperSubmission,
  ExamTheoryQuestion,
  ProgrammeId,
} from "@/types/school";

const STATUS_BADGE: Record<
  ExamPaperStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
  submitted: {
    label: "Submitted to Exam Officer",
    className: "bg-amber-100 text-amber-900 border border-amber-200",
  },
  returned: {
    label: "Returned for Correction",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  approved: {
    label: "Approved & Print-Ready",
    className: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  },
};

export function ExamQuestionsModule() {
  const {
    db,
    portal,
    setActiveNav,
    upsertExamPaper,
    submitExamPaperToOfficer,
    reviewExamPaper,
    deleteExamPaper,
    openPrintPreview,
  } = useSchoolOS();

  const { settings, classes, subjects } = db;
  const examPapers = db.examPapers ?? [];

  const isExamOfficer =
    portal.role === "admin" ||
    portal.role === "exam_officer" ||
    Boolean(portal.isExamOfficer);
  const isSecretaryReadOnly = portal.role === "secretary" && !isExamOfficer;
  const canAuthorPapers = !isSecretaryReadOnly && portal.role !== "bursar";

  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  // Filters
  const [sessionFilter, setSessionFilter] = useState(settings.currentSession);
  const [termFilter, setTermFilter] = useState(settings.currentTerm);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ExamPaperStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");

  // Active Editor Paper
  const [editingPaper, setEditingPaper] = useState<ExamPaperSubmission | null>(
    null
  );
  const [aiReport, setAiReport] = useState<{
    fixes: string[];
    warnings: string[];
  } | null>(null);
  const [transcribingPhoto, setTranscribingPhoto] = useState(false);
  const [dictating, setDictating] = useState(false);

  // Return-for-correction feedback modal
  const [returnModalPaper, setReturnModalPaper] =
    useState<ExamPaperSubmission | null>(null);
  const [returnFeedback, setReturnFeedback] = useState("");

  // Optional Cloud Vision OCR Key Modal
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [visionProvider, setVisionProvider] = useState<"gemini" | "openai">(
    () => loadVisionAIConfig()?.provider ?? "gemini"
  );
  const [visionApiKey, setVisionApiKey] = useState<string>(
    () => loadVisionAIConfig()?.apiKey ?? ""
  );

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const filteredPapers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return examPapers.filter((ep) => {
      if (sessionFilter !== "all" && ep.session !== sessionFilter) return false;
      if (termFilter !== "all" && ep.term !== termFilter) return false;
      if (classFilter !== "all" && !ep.classIds.includes(classFilter)) {
        return false;
      }
      if (statusFilter !== "all" && ep.status !== statusFilter) return false;
      if (!q) return true;
      const subName =
        subjects.find((s) => s.id === ep.subjectId)?.name ?? "";
      const clsNames = ep.classIds
        .map((cid) => classes.find((c) => c.id === cid)?.name ?? "")
        .join(" ");
      return `${subName} ${clsNames} ${ep.submittedByName} ${ep.assessmentTitle}`
        .toLowerCase()
        .includes(q);
    });
  }, [
    examPapers,
    sessionFilter,
    termFilter,
    classFilter,
    statusFilter,
    search,
    subjects,
    classes,
  ]);

  const stats = useMemo(() => {
    const termSet = examPapers.filter(
      (ep) => ep.session === sessionFilter && ep.term === termFilter
    );
    return {
      total: termSet.length,
      submitted: termSet.filter((ep) => ep.status === "submitted").length,
      approved: termSet.filter((ep) => ep.status === "approved").length,
      returned: termSet.filter((ep) => ep.status === "returned").length,
    };
  }, [examPapers, sessionFilter, termFilter]);

  const handleCreateNewPaper = () => {
    const defaultProg = activeProgrammes[0]?.id ?? "prog-main";
    const firstCls =
      classes.find((c) => c.programmeId === defaultProg)?.id ??
      classes[0]?.id ??
      "";
    const firstSub =
      subjects.find((s) => s.programmeId === defaultProg)?.id ??
      subjects[0]?.id ??
      "";

    setAiReport(null);
    setEditingPaper({
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      programmeId: defaultProg,
      classIds: firstCls ? [firstCls] : [],
      subjectId: firstSub,
      session: settings.currentSession,
      term: settings.currentTerm,
      assessmentTitle: "Examination",
      durationLabel: "1 Hour 30 Minutes",
      generalInstructions:
        "Answer ALL questions in Section A and follow the instructions in Section B. Write clearly and neatly.",
      sectionAInstruction:
        "Choose the correct option from A to D for each question.",
      sectionBInstruction: "Answer the following theory questions clearly.",
      paperLayout: "standard",
      objectives: [
        {
          id: `obj-${Date.now()}-1`,
          questionText: "",
          optionA: "",
          optionB: "",
          optionC: "",
          optionD: "",
          correctOption: "A",
          marks: 2,
        },
      ],
      theory: [],
      generalMarkingNotes: "",
      rawDraftText: "",
      status: "draft",
      submittedByStaffId: portal.staffId,
      submittedByName: portal.displayName,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editingPaper) return;

    try {
      const compressedUrl = await compressQuestionPhotoToDataUrl(file);
      const updatedWithPhoto: ExamPaperSubmission = {
        ...editingPaper,
        sourcePhotoDataUrl: compressedUrl,
      };
      setEditingPaper(updatedWithPhoto);

      const visionCfg = loadVisionAIConfig();
      if (visionCfg) {
        setTranscribingPhoto(true);
        const res = await transcribeQuestionPhotoWithVisionAI(
          compressedUrl,
          visionCfg
        );
        setTranscribingPhoto(false);
        if (res.ok && res.parsed) {
          setEditingPaper({
            ...updatedWithPhoto,
            rawDraftText: res.rawTranscription ?? updatedWithPhoto.rawDraftText,
            objectives:
              res.parsed.objectives.length > 0
                ? res.parsed.objectives
                : updatedWithPhoto.objectives,
            theory:
              res.parsed.theory.length > 0
                ? res.parsed.theory
                : updatedWithPhoto.theory,
          });
          setAiReport({
            fixes: res.parsed.fixesApplied,
            warnings: res.parsed.warnings,
          });
          toast.success(
            `AI typed ${res.parsed.objectives.length} Objective and ${res.parsed.theory.length} Theory questions from your photo!`
          );
          return;
        }
        toast.info(res.error ?? "Photo attached side-by-side.");
      } else {
        toast.success(
          "Question photo attached & compressed! Connect an AI Vision key for 1-click handwriting OCR, or dictate/type beside the photo and click 'AI Structure & Fix Mistakes'."
        );
      }
    } catch {
      setTranscribingPhoto(false);
      toast.error("Could not process the selected photo.");
    }
  };

  const handleRunVisionOnAttachedPhoto = async () => {
    if (!editingPaper?.sourcePhotoDataUrl) return;
    const cfg = loadVisionAIConfig();
    if (!cfg) {
      setVisionModalOpen(true);
      return;
    }
    setTranscribingPhoto(true);
    const res = await transcribeQuestionPhotoWithVisionAI(
      editingPaper.sourcePhotoDataUrl,
      cfg
    );
    setTranscribingPhoto(false);
    if (!res.ok || !res.parsed) {
      toast.error(res.error ?? "Could not transcribe image.");
      return;
    }
    setEditingPaper({
      ...editingPaper,
      rawDraftText: res.rawTranscription ?? editingPaper.rawDraftText,
      objectives:
        res.parsed.objectives.length > 0
          ? res.parsed.objectives
          : editingPaper.objectives,
      theory:
        res.parsed.theory.length > 0 ? res.parsed.theory : editingPaper.theory,
    });
    setAiReport({
      fixes: res.parsed.fixesApplied,
      warnings: res.parsed.warnings,
    });
    toast.success("AI typed & refined your photographed questions!");
  };

  const handleVoiceDictate = () => {
    if (typeof window === "undefined" || !editingPaper) return;
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
            onerror: (() => void) | null;
            onend: (() => void) | null;
            start: () => void;
          };
          webkitSpeechRecognition?: new () => {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
            onerror: (() => void) | null;
            onend: (() => void) | null;
            start: () => void;
          };
        }
      ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
            onerror: (() => void) | null;
            onend: (() => void) | null;
            start: () => void;
          };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRec) {
      toast.info(
        "Voice dictation is supported in Chrome/Edge on phone or laptop. Paste or type in the box below instead."
      );
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    setDictating(true);
    rec.onresult = (ev) => {
      const spoken = ev.results[0]?.[0]?.transcript ?? "";
      if (spoken) {
        setEditingPaper((prev) =>
          prev
            ? {
                ...prev,
                rawDraftText: `${prev.rawDraftText ? `${prev.rawDraftText}\n` : ""}${spoken}`,
              }
            : prev
        );
      }
    };
    rec.onerror = () => setDictating(false);
    rec.onend = () => setDictating(false);
    rec.start();
  };

  const handleParseRawDraftWithAI = () => {
    if (!editingPaper) return;
    const raw = (editingPaper.rawDraftText ?? "").trim();
    if (!raw) {
      toast.error(
        "Type, paste, or snap/transcribe your questions in the Quick Draft box first."
      );
      return;
    }
    const result = parseRawTextIntoExamQuestions(raw);
    if (result.objectives.length === 0 && result.theory.length === 0) {
      toast.error("Could not detect any questions in the text.");
      return;
    }
    setEditingPaper({
      ...editingPaper,
      objectives: result.objectives,
      theory: result.theory,
    });
    setAiReport({
      fixes: result.fixesApplied,
      warnings: result.warnings,
    });
    toast.success(
      `Structured ${result.objectives.length} Objective & ${result.theory.length} Theory questions and refined mistakes!`
    );
  };

  const handleRefineExistingQuestionsWithAI = () => {
    if (!editingPaper) return;
    const result = refineExamPaperMistakes({
      objectives: editingPaper.objectives,
      theory: editingPaper.theory,
    });
    setEditingPaper({
      ...editingPaper,
      objectives: result.objectives,
      theory: result.theory,
    });
    setAiReport({
      fixes: result.fixesApplied,
      warnings: result.warnings,
    });
    toast.success(
      result.fixesApplied.length > 0
        ? `AI refined ${result.fixesApplied.length} spelling/punctuation issues.`
        : "Questions checked — capitalization, spelling & punctuation look clean!"
    );
  };

  const handleSaveDraft = () => {
    if (!editingPaper) return;
    if (editingPaper.classIds.length === 0) {
      toast.error(
        `Select at least one ${settings.labels.classSingular.toLowerCase()}.`
      );
      return;
    }
    if (!editingPaper.subjectId) {
      toast.error("Select a subject.");
      return;
    }
    const res = upsertExamPaper(editingPaper);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save paper.");
      return;
    }
    toast.success("Exam paper saved.");
    setEditingPaper(null);
  };

  const handleSaveAndSubmitToOfficer = () => {
    if (!editingPaper) return;
    if (editingPaper.classIds.length === 0) {
      toast.error(
        `Select at least one ${settings.labels.classSingular.toLowerCase()}.`
      );
      return;
    }
    const cleanObjectives = editingPaper.objectives.filter((q) =>
      q.questionText.trim()
    );
    const cleanTheory = editingPaper.theory.filter((t) =>
      t.questionText.trim()
    );
    if (cleanObjectives.length === 0 && cleanTheory.length === 0) {
      toast.error(
        "Add at least one Objective or Theory question before submitting to the Exam Officer."
      );
      return;
    }
    const toSubmit: ExamPaperSubmission = {
      ...editingPaper,
      objectives: cleanObjectives,
      theory: cleanTheory,
      status: "submitted",
    };
    const subRes = upsertExamPaper(toSubmit);
    if (!subRes.ok) {
      toast.error(subRes.error ?? "Unable to submit exam paper.");
      return;
    }
    toast.success(
      "Submitted to the Exam Officer! Ready for moderation, PDF & Word (.doc) export."
    );
    setEditingPaper(null);
  };

  // =========================================================================
  // EDITOR VIEW (When creating or editing an exam paper)
  // =========================================================================
  if (editingPaper) {
    const progClasses = classes.filter(
      (c) => c.programmeId === editingPaper.programmeId
    );
    const progSubjects = subjects.filter(
      (s) => s.programmeId === editingPaper.programmeId
    );
    const totals = computeExamPaperTotalMarks(editingPaper);
    const isLockedForTeacher =
      editingPaper.status === "approved" && !isExamOfficer;

    const updateObjective = (
      idx: number,
      patch: Partial<ExamObjectiveQuestion>
    ) => {
      const next = editingPaper.objectives.map((q, i) =>
        i === idx ? { ...q, ...patch } : q
      );
      setEditingPaper({ ...editingPaper, objectives: next });
    };

    const updateTheory = (idx: number, patch: Partial<ExamTheoryQuestion>) => {
      const next = editingPaper.theory.map((t, i) =>
        i === idx ? { ...t, ...patch } : t
      );
      setEditingPaper({ ...editingPaper, theory: next });
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
              Exam Question Digitizer &amp; Editor
            </div>
            <h1 className="text-lg font-extrabold text-[#0F172A] sm:text-xl">
              {editingPaper.objectives[0]?.questionText ||
              editingPaper.theory[0]?.questionText
                ? "Edit Examination Question Paper"
                : "Create / Snap Examination Question Paper"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setVisionModalOpen(true)}
              className="border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5 text-[#1a4a6e]" />
              AI Vision OCR Key
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditingPaper(null)}
            >
              Back to Question Bank
            </Button>
          </div>
        </div>

        {/* Returned Feedback Alert */}
        {editingPaper.status === "returned" && editingPaper.reviewerFeedback && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900">
            <div className="font-extrabold">
              Returned by Exam Officer ({editingPaper.reviewedByName ?? "Exam Officer"}):
            </div>
            <p className="mt-0.5">{editingPaper.reviewerFeedback}</p>
          </div>
        )}

        {/* Paper Metadata Card */}
        <div className="ndh-card space-y-4 p-4 sm:p-5 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {settings.multiProgrammeEnabled && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Programme</Label>
                <select
                  value={editingPaper.programmeId}
                  onChange={(e) => {
                    const pid = e.target.value as ProgrammeId;
                    const firstCls =
                      classes.find((c) => c.programmeId === pid)?.id ?? "";
                    const firstSub =
                      subjects.find((s) => s.programmeId === pid)?.id ?? "";
                    setEditingPaper({
                      ...editingPaper,
                      programmeId: pid,
                      classIds: firstCls ? [firstCls] : [],
                      subjectId: firstSub,
                    });
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                >
                  {activeProgrammes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Subject</Label>
              <select
                aria-label="Exam paper subject"
                value={editingPaper.subjectId}
                onChange={(e) =>
                  setEditingPaper({ ...editingPaper, subjectId: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
              >
                {progSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Assessment Title</Label>
              <Input
                value={editingPaper.assessmentTitle}
                onChange={(e) =>
                  setEditingPaper({
                    ...editingPaper,
                    assessmentTitle: e.target.value,
                  })
                }
                placeholder="e.g. Examination or Mid-Term Test"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Time Allowed</Label>
              <Input
                value={editingPaper.durationLabel}
                onChange={(e) =>
                  setEditingPaper({
                    ...editingPaper,
                    durationLabel: e.target.value,
                  })
                }
                placeholder="e.g. 1 Hour 30 Minutes"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Print Layout</Label>
              <select
                value={editingPaper.paperLayout}
                onChange={(e) =>
                  setEditingPaper({
                    ...editingPaper,
                    paperLayout: e.target.value as
                      | "standard"
                      | "compact_two_column",
                  })
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
              >
                <option value="standard">Standard Single-Column</option>
                <option value="compact_two_column">
                  Compact 2-Column (Saves Printing Paper)
                </option>
              </select>
            </div>
          </div>

          {/* Target Class(es) Multi-Select Pills */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              Target {settings.labels.classPlural} (Select one or multiple arms/classes)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {progClasses.map((cls) => {
                const selected = editingPaper.classIds.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? editingPaper.classIds.filter((id) => id !== cls.id)
                        : [...editingPaper.classIds, cls.id];
                      setEditingPaper({ ...editingPaper, classIds: next });
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition ${
                      selected
                        ? "border-[#1a4a6e] bg-[#1a4a6e] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">General Instructions</Label>
            <Input
              value={editingPaper.generalInstructions}
              onChange={(e) =>
                setEditingPaper({
                  ...editingPaper,
                  generalInstructions: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* SNAP WRITTEN PHOTO + AI AUTO-TYPE & MISTAKE REFINER */}
        <div className="ndh-card border-[#9ed9d6] bg-[#edf7f6]/55 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0c2340]">
                <WandSparkles className="h-4 w-4 text-[#1a4a6e]" />
                <span>
                  Step 1: Snap Handwritten Question Photo OR Paste/Type Raw Draft → AI Auto-Types &amp; Fixes Mistakes
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Snap a clear photo of your handwritten questions (compressed to &lt;120 KB) or type/dictate raw text below, then refine &amp; edit every line before sending to the Exam Officer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void handlePhotoChosen(e)}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                disabled={transcribingPhoto || isLockedForTeacher}
                onClick={() => photoInputRef.current?.click()}
                className="bg-[#0c2340] text-xs font-bold text-white hover:bg-[#1a4a6e]"
              >
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                {transcribingPhoto
                  ? "AI Reading Photo..."
                  : editingPaper.sourcePhotoDataUrl
                    ? "Replace Question Photo"
                    : "Snap / Upload Question Photo"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={dictating || isLockedForTeacher}
                onClick={handleVoiceDictate}
                className="border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                <Mic className="mr-1.5 h-3.5 w-3.5 text-[#1a4a6e]" />
                {dictating ? "Listening..." : "Voice Dictate"}
              </Button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${
              editingPaper.sourcePhotoDataUrl ? "lg:grid-cols-12" : ""
            }`}
          >
            {editingPaper.sourcePhotoDataUrl && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 lg:col-span-5">
                <div className="flex items-center justify-between text-xs font-bold text-[#0c2340]">
                  <span>Attached Written Question Sheet</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={transcribingPhoto}
                      onClick={() => void handleRunVisionOnAttachedPhoto()}
                      className="h-7 px-2 text-[11px] font-bold text-[#1a4a6e]"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      AI Read Photo
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPaper({
                          ...editingPaper,
                          sourcePhotoDataUrl: undefined,
                        })
                      }
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <img
                  src={editingPaper.sourcePhotoDataUrl}
                  alt="Teacher handwritten question sheet"
                  className="max-h-72 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                />
              </div>
            )}

            <div
              className={`space-y-2.5 ${
                editingPaper.sourcePhotoDataUrl ? "lg:col-span-7" : ""
              }`}
            >
              <Label
                htmlFor="raw-question-draft"
                className="text-xs font-bold text-[#0c2340]"
              >
                Quick Raw Question Pad (AI Auto-Splits Objectives A–D, Answers &amp; Theory)
              </Label>
              <Textarea
                id="raw-question-draft"
                rows={6}
                disabled={isLockedForTeacher}
                value={editingPaper.rawDraftText ?? ""}
                onChange={(e) =>
                  setEditingPaper({
                    ...editingPaper,
                    rawDraftText: e.target.value,
                  })
                }
                placeholder={`Example:\n1. what is the boiling point of pure water A) 50 deg C B) 80 deg C C) 100 deg C D) 120 deg C [Ans: C]\n2. chose the corect unit of force A) Joule B) Newton C) Watt D) Pascal Ans: B\nSECTION B: THEORY\n1. define photosyntesis and list three conditions necesary for it (10 marks)\nGuide: Definition = 4m, Sunlight/Chlorophyll/CO2 = 6m`}
                className="bg-white font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isLockedForTeacher}
                  onClick={handleParseRawDraftWithAI}
                  className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Auto-Structure &amp; Fix Mistakes
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLockedForTeacher}
                  onClick={handleRefineExistingQuestionsWithAI}
                  className="border-[#1a4a6e] bg-white text-xs font-bold text-[#1a4a6e]"
                >
                  <WandSparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Proofread Current Questions
                </Button>
              </div>
            </div>
          </div>

          {aiReport &&
            (aiReport.fixes.length > 0 || aiReport.warnings.length > 0) && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                {aiReport.fixes.length > 0 && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-950">
                    <div className="font-extrabold">
                      AI Refinements Applied ({aiReport.fixes.length}):
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {aiReport.fixes.map((fx) => (
                        <span
                          key={fx}
                          className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-900"
                        >
                          {fx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiReport.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-950">
                    <div className="flex items-center gap-1 font-extrabold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Please Review ({aiReport.warnings.length}):</span>
                    </div>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
                      {aiReport.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* SECTION A: EDITABLE OBJECTIVE QUESTIONS */}
        <div className="ndh-card space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-[#0F172A]">
                Section A: Objective Questions ({editingPaper.objectives.length}{" "}
                Questions • {totals.objectiveMarks} Marks)
              </h2>
              <p className="text-[11px] text-slate-500">
                Review and edit every question and option. Correct answers print ONLY on the confidential Marking Scheme, never on student papers.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLockedForTeacher}
              onClick={() =>
                setEditingPaper({
                  ...editingPaper,
                  objectives: [
                    ...editingPaper.objectives,
                    {
                      id: `obj-${Date.now()}-${editingPaper.objectives.length + 1}`,
                      questionText: "",
                      optionA: "",
                      optionB: "",
                      optionC: "",
                      optionD: "",
                      correctOption: "A",
                      marks: 2,
                    },
                  ],
                })
              }
              className="text-xs font-bold"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Objective Question
            </Button>
          </div>

          <div className="space-y-3">
            {editingPaper.objectives.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex h-6 items-center rounded-md bg-[#0c2340] px-2 font-mono text-[11px] font-bold text-white">
                    Q{idx + 1}
                  </span>
                  <Input
                    aria-label={`Objective question ${idx + 1}`}
                    disabled={isLockedForTeacher}
                    value={q.questionText}
                    onChange={(e) =>
                      updateObjective(idx, { questionText: e.target.value })
                    }
                    placeholder="Type objective question stem..."
                    className="bg-white font-semibold"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isLockedForTeacher}
                    onClick={() =>
                      setEditingPaper({
                        ...editingPaper,
                        objectives: editingPaper.objectives.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="h-9 border-red-200 bg-white px-2.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const field = `option${letter}` as const;
                    return (
                      <div key={letter} className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">
                          {letter}.
                        </span>
                        <Input
                          aria-label={`Q${idx + 1} Option ${letter}`}
                          disabled={isLockedForTeacher}
                          value={q[field]}
                          onChange={(e) =>
                            updateObjective(idx, { [field]: e.target.value })
                          }
                          placeholder={`Option ${letter}`}
                          className="h-8 bg-white text-xs"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-800">
                      Correct Key (Confidential):
                    </span>
                    <select
                      aria-label={`Q${idx + 1} correct option`}
                      disabled={isLockedForTeacher}
                      value={q.correctOption}
                      onChange={(e) =>
                        updateObjective(idx, {
                          correctOption: e.target.value as
                            | "A"
                            | "B"
                            | "C"
                            | "D",
                        })
                      }
                      className="h-7 rounded border border-emerald-300 bg-emerald-50 px-2 font-bold text-emerald-900"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">Marks:</span>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      disabled={isLockedForTeacher}
                      value={q.marks}
                      onChange={(e) =>
                        updateObjective(idx, {
                          marks: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-7 w-16 bg-white text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION B: EDITABLE THEORY QUESTIONS & MARKING GUIDE */}
        <div className="ndh-card space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-[#0F172A]">
                Section B: Theory / Essay Questions ({editingPaper.theory.length}{" "}
                Questions • {totals.theoryMarks} Marks)
              </h2>
              <p className="text-[11px] text-slate-500">
                Include optional marking guide notes for the Exam Officer and subject markers.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLockedForTeacher}
              onClick={() =>
                setEditingPaper({
                  ...editingPaper,
                  theory: [
                    ...editingPaper.theory,
                    {
                      id: `th-${Date.now()}-${editingPaper.theory.length + 1}`,
                      questionText: "",
                      markingGuide: "",
                      marks: 10,
                    },
                  ],
                })
              }
              className="text-xs font-bold"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Theory Question
            </Button>
          </div>

          <div className="space-y-3">
            {editingPaper.theory.map((t, idx) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex h-6 items-center rounded-md bg-[#1a4a6e] px-2 font-mono text-[11px] font-bold text-white">
                    Theory {idx + 1}
                  </span>
                  <Textarea
                    aria-label={`Theory question ${idx + 1}`}
                    rows={2}
                    disabled={isLockedForTeacher}
                    value={t.questionText}
                    onChange={(e) =>
                      updateTheory(idx, { questionText: e.target.value })
                    }
                    placeholder="Type theory / essay question prompt..."
                    className="bg-white font-semibold"
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      disabled={isLockedForTeacher}
                      value={t.marks}
                      onChange={(e) =>
                        updateTheory(idx, {
                          marks: Math.max(1, Number(e.target.value) || 10),
                        })
                      }
                      className="h-9 w-16 bg-white text-center font-bold"
                      title="Marks"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isLockedForTeacher}
                      onClick={() =>
                        setEditingPaper({
                          ...editingPaper,
                          theory: editingPaper.theory.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="h-9 border-red-200 bg-white px-2.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Input
                    disabled={isLockedForTeacher}
                    value={t.markingGuide}
                    onChange={(e) =>
                      updateTheory(idx, { markingGuide: e.target.value })
                    }
                    placeholder="Confidential Marking Guide / Expected Answer points (printed only on Marking Scheme)..."
                    className="h-8 border-emerald-200 bg-emerald-50/40 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="ndh-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-xs font-bold text-[#0F172A]">
            Total Paper Weight: <span className="text-[#1a4a6e]">{totals.totalMarks} Marks</span>{" "}
            ({editingPaper.objectives.length} Obj + {editingPaper.theory.length} Theory)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditingPaper(null)}
            >
              Cancel
            </Button>

            {!isLockedForTeacher && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="font-bold"
                >
                  Save Draft Offline
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAndSubmitToOfficer}
                  className="bg-[#067647] font-bold text-white hover:bg-emerald-800"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Submit to Exam Officer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Cloud Vision API Key Configuration Modal */}
        <Dialog open={visionModalOpen} onOpenChange={setVisionModalOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-[#0F172A]">
                AI Camera Handwriting OCR Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Optional: Connect a Google Gemini or OpenAI API key on this device so snapped photos of cursive handwritten questions are typed automatically when online. Offline proofreading &amp; structuring always work without any key.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cfg: VisionAIConfig | null = visionApiKey.trim()
                  ? { provider: visionProvider, apiKey: visionApiKey.trim() }
                  : null;
                saveVisionAIConfig(cfg);
                setVisionModalOpen(false);
                toast.success(
                  cfg
                    ? `Saved ${visionProvider.toUpperCase()} Vision OCR key on this device.`
                    : "Cleared Vision OCR key."
                );
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-bold">Vision AI Provider</Label>
                <select
                  value={visionProvider}
                  onChange={(e) =>
                    setVisionProvider(e.target.value as "gemini" | "openai")
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                >
                  <option value="gemini">Google Gemini 2.0 Flash Vision</option>
                  <option value="openai">OpenAI GPT-4o-mini Vision</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">API Key</Label>
                <Input
                  type="password"
                  placeholder="Paste API key (stored locally on this device only)"
                  value={visionApiKey}
                  onChange={(e) => setVisionApiKey(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setVisionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#1a4a6e] font-bold text-white"
                >
                  Save Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // MAIN QUESTION BANK & EXAM OFFICER MODERATION QUEUE
  // =========================================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
            <FileText className="h-3.5 w-3.5" />
            {isExamOfficer
              ? "Exam Officer Desk • Moderation • PDF & Word (.doc) Printing"
              : isSecretaryReadOnly
                ? "Approved Exam Papers • PDF & Word (.doc) Printing"
                : "Teacher Exam Question Submission • AI Photo-to-Text & Refiner"}
          </div>
          <h1 className="mt-0.5 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Exam Questions &amp; Question Bank
          </h1>
          <p className="text-xs text-slate-600">
            {isExamOfficer
              ? "Review teacher submissions, return for correction or approve, and export print-ready Exam Papers & Marking Schemes in both PDF and Microsoft Word (.doc)."
              : "Type or snap a photo of your written questions, refine mistakes with AI, edit freely, and submit to the Exam Officer."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isExamOfficer && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveNav("academics")}
              className="border-[#9ed9d6] bg-[#edf7f6] text-xs font-bold text-[#1a4a6e] hover:bg-[#d8efed]"
            >
              <BookOpenCheck className="mr-1.5 h-3.5 w-3.5" />
              All Classes&apos; Broadsheets &amp; Report Sheets
            </Button>
          )}

          {canAuthorPapers && (
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewPaper}
              className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Exam Question Paper
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="ndh-card p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            Papers ({termFilter})
          </div>
          <div className="mt-1 text-xl font-extrabold text-[#0F172A]">
            {stats.total}
          </div>
        </div>
        <div className="ndh-card p-3.5">
          <div className="text-[11px] font-semibold text-amber-800">
            Awaiting Exam Officer
          </div>
          <div className="mt-1 text-xl font-extrabold text-amber-900">
            {stats.submitted}
          </div>
        </div>
        <div className="ndh-card p-3.5">
          <div className="text-[11px] font-semibold text-emerald-800">
            Approved (PDF &amp; .doc Ready)
          </div>
          <div className="mt-1 text-xl font-extrabold text-emerald-900">
            {stats.approved}
          </div>
        </div>
        <div className="ndh-card p-3.5">
          <div className="text-[11px] font-semibold text-red-700">
            Returned for Correction
          </div>
          <div className="mt-1 text-xl font-extrabold text-red-800">
            {stats.returned}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ndh-card flex flex-wrap items-center gap-2.5 p-3.5 text-xs">
        <Input
          placeholder="Search subject, class, or teacher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs text-xs"
        />
        <select
          aria-label="Filter session"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
        >
          <option value="all">All Sessions</option>
          {settings.sessions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter term"
          value={termFilter}
          onChange={(e) => setTermFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
        >
          <option value="all">All Terms</option>
          {settings.terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label={`Filter ${settings.labels.classSingular.toLowerCase()}`}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
        >
          <option value="all">All {settings.labels.classPlural}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter paper status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ExamPaperStatus | "all")
          }
          className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted to Exam Officer</option>
          <option value="approved">Approved &amp; Print-Ready</option>
          <option value="returned">Returned for Correction</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Papers List */}
      {filteredPapers.length === 0 ? (
        <div className="ndh-card p-8 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-400" />
          <h3 className="mt-2 text-sm font-extrabold text-[#0F172A]">
            No Exam Question Papers Yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
            {canAuthorPapers
              ? "Click 'New Exam Question Paper' above to type or snap a photo of your handwritten questions, refine with AI, and submit to the Exam Officer."
              : "Approved exam question papers will appear here once approved by the Exam Officer."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPapers.map((ep) => {
            const sub = subjects.find((s) => s.id === ep.subjectId);
            const clsLabel =
              ep.classIds
                .map((cid) => classes.find((c) => c.id === cid)?.name)
                .filter(Boolean)
                .join(", ") || "—";
            const totals = computeExamPaperTotalMarks(ep);
            const badge = STATUS_BADGE[ep.status];

            return (
              <div
                key={ep.id}
                className="ndh-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-[#0F172A]">
                      {sub?.name ?? "Subject"} — {clsLabel}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {ep.sourcePhotoDataUrl && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                        Photo Attached
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {ep.term} ({ep.session}) • {ep.assessmentTitle} •{" "}
                    <strong>{ep.objectives.length}</strong> Obj +{" "}
                    <strong>{ep.theory.length}</strong> Theory (
                    <strong>{totals.totalMarks} Marks</strong>) • Submitted by{" "}
                    <strong>{ep.submittedByName}</strong>
                  </div>
                  {ep.reviewerFeedback && (
                    <div className="text-[11px] font-semibold text-red-700">
                      Exam Officer Note: {ep.reviewerFeedback}
                    </div>
                  )}
                </div>

                {/* Actions: Edit, Approve/Return, Print PDF & Download Word (.doc) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {canAuthorPapers &&
                    (isExamOfficer || ep.status !== "approved") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAiReport(null);
                          setEditingPaper({
                            ...ep,
                            classIds: [...ep.classIds],
                            objectives: ep.objectives.map((o) => ({ ...o })),
                            theory: ep.theory.map((t) => ({ ...t })),
                          });
                        }}
                        className="h-8 text-xs font-bold"
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}

                  {/* Exam Officer Moderation Controls */}
                  {isExamOfficer && ep.status !== "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        reviewExamPaper({
                          paperId: ep.id,
                          decision: "approved",
                        });
                        toast.success(
                          "Approved & locked! Ready for PDF & Word (.doc) printing."
                        );
                      }}
                      className="h-8 bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  )}

                  {isExamOfficer &&
                    (ep.status === "submitted" || ep.status === "approved") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReturnModalPaper(ep);
                          setReturnFeedback(ep.reviewerFeedback ?? "");
                        }}
                        className="h-8 border-amber-300 bg-amber-50 text-xs font-bold text-amber-900 hover:bg-amber-100"
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Return
                      </Button>
                    )}

                  {isExamOfficer && ep.status === "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reviewExamPaper({
                          paperId: ep.id,
                          decision: "draft",
                        });
                        toast.info("Unlocked paper back to Draft.");
                      }}
                      className="h-8 text-xs font-semibold"
                      title="Unlock for editing"
                    >
                      <LockOpen className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* PDF Print Preview (Question Paper) */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      openPrintPreview({
                        type: "exam_paper",
                        examPaperId: ep.id,
                        layout: ep.paperLayout,
                      })
                    }
                    className="h-8 bg-[#0c2340] text-xs font-bold text-white hover:bg-[#1a4a6e]"
                  >
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    PDF / Print
                  </Button>

                  {/* Word (.doc) Export (Question Paper) */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fname = exportExamPaperToWordDoc(
                        ep,
                        db,
                        "question_paper"
                      );
                      toast.success(`Downloaded Word document (${fname}).`);
                    }}
                    className="h-8 border-[#1a4a6e] bg-white text-xs font-bold text-[#1a4a6e] hover:bg-[#edf7f6]"
                  >
                    <FileDown className="mr-1 h-3.5 w-3.5" />
                    Word (.doc)
                  </Button>

                  {/* Confidential Marking Scheme (Hidden from Secretary) */}
                  {!isSecretaryReadOnly && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openPrintPreview({
                            type: "marking_scheme",
                            examPaperId: ep.id,
                          })
                        }
                        className="h-8 border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                        title="Print Confidential Marking Scheme (PDF)"
                      >
                        Scheme PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const fname = exportExamPaperToWordDoc(
                            ep,
                            db,
                            "marking_scheme"
                          );
                          toast.success(
                            `Downloaded Marking Scheme Word file (${fname}).`
                          );
                        }}
                        className="h-8 border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                        title="Download Confidential Marking Scheme (.doc)"
                      >
                        Scheme .doc
                      </Button>
                    </>
                  )}

                  {canAuthorPapers &&
                    (isExamOfficer || ep.status !== "approved") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          deleteExamPaper(ep.id);
                          toast.success("Removed exam question paper.");
                        }}
                        className="h-8 border-red-200 bg-white px-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return for Correction Dialog */}
      <Dialog
        open={Boolean(returnModalPaper)}
        onOpenChange={(o) => !o && setReturnModalPaper(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              Return Exam Paper for Correction
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Enter clear revision instructions for{" "}
              <strong>{returnModalPaper?.submittedByName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!returnModalPaper) return;
              reviewExamPaper({
                paperId: returnModalPaper.id,
                decision: "returned",
                feedback:
                  returnFeedback.trim() ||
                  "Please review and correct the highlighted questions.",
              });
              toast.info("Returned exam paper to teacher with feedback.");
              setReturnModalPaper(null);
            }}
            className="space-y-3 text-xs"
          >
            <Textarea
              rows={3}
              required
              placeholder="e.g. Please add 5 more objective questions and verify the answer key for Q3."
              value={returnFeedback}
              onChange={(e) => setReturnFeedback(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReturnModalPaper(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-700 font-bold text-white hover:bg-amber-800"
              >
                Return to Teacher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
