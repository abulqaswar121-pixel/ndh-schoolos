import {
  Award,
  Check,
  Eye,
  FileSpreadsheet,
  LayoutTemplate,
  MessageSquareQuote,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { SchoolCrest } from "../SchoolCrest";
import {
  PrintableReportCard,
  ReportCardDesignPreviewSample,
} from "../printables/PrintableReportCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  DEFAULT_AUTO_COMMENTS_BY_GRADE,
  GRADE_LETTER_KEYS,
  REPORT_TEMPLATE_OPTIONS,
  WORKSPACE_THEME_PRESETS,
  createDefaultCustomization,
  getResolvedCustomization,
} from "@/services/customizationDefaults";
import type {
  CrestShapeId,
  GradeLetterKey,
  ReportFontFamily,
  ReportFontScale,
  ReportPaperTint,
  ReportRankingMode,
  ReportTemplateId,
  SchoolCustomizationConfig,
  WorkspaceFontId,
} from "@/types/school";

export function CustomizeDesignModule() {
  const { db, portal, updateSettings, openPrintPreview } = useSchoolOS();
  const { settings, students } = db;

  const [previewGrade, setPreviewGrade] = useState<GradeLetterKey>("A");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("__sample");
  const [activeCommentGrade, setActiveCommentGrade] =
    useState<GradeLetterKey>("A");

  if (portal.role !== "admin") {
    return (
      <div className="ndh-card p-8 text-center text-sm text-slate-600">
        Only the School Proprietor / Admin can customize school themes and report sheet designs.
      </div>
    );
  }

  const custom = getResolvedCustomization(settings);
  const { workspaceTheme, reportSheet, autoComments, documents } = custom;

  const updateCustom = (
    mutator: (prev: SchoolCustomizationConfig) => SchoolCustomizationConfig,
    auditLabel: string
  ) => {
    updateSettings((prevSettings) => {
      const currentResolved = getResolvedCustomization(prevSettings);
      return {
        ...prevSettings,
        customization: mutator(currentResolved),
      };
    }, auditLabel);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "logo" | "signature"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      if (target === "logo") {
        updateSettings(
          (prev) => ({ ...prev, logoDataUrl: dataUrl }),
          "Uploaded Custom School Logo"
        );
        toast.success("School logo updated across workspace & printables.");
      } else {
        updateCustom(
          (prev) => ({
            ...prev,
            reportSheet: {
              ...prev.reportSheet,
              principalSignatureDataUrl: dataUrl,
            },
          }),
          "Uploaded Principal Signature / Stamp"
        );
        toast.success("Principal signature/stamp saved to report sheets.");
      }
    };
    reader.readAsDataURL(file);
  };

  const totalAssessmentMax = settings.grading.defaultComponents.reduce(
    (s, c) => s + c.maxScore,
    0
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
            <Palette className="h-3.5 w-3.5" />
            Customize & Design Studio
          </div>
          <h1 className="mt-0.5 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Report Sheets, Auto-Comments, Colours & Theme
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Design your school's exact report card layout, colours, fonts, ranking mode (positions vs final grade only), and A–F auto-comments — all saved locally for offline printing.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            updateSettings(
              (prev) => ({
                ...prev,
                customization: createDefaultCustomization(),
              }),
              "Reset School Design & Customization to Defaults"
            );
            toast.success("Restored default design settings.");
          }}
          className="w-fit border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset Design Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        {/* LEFT CONTROLS (6 cols on xl) */}
        <div className="xl:col-span-6">
          <Tabs defaultValue="report_layout" className="space-y-4">
            <TabsList className="bg-slate-200/80 p-1">
              <TabsTrigger value="report_layout" className="text-xs font-bold">
                <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                Report Layout & Style
              </TabsTrigger>
              <TabsTrigger value="grades_comments" className="text-xs font-bold">
                <MessageSquareQuote className="mr-1.5 h-3.5 w-3.5" />
                Positions & A–F Comments
              </TabsTrigger>
              <TabsTrigger value="sections_stamp" className="text-xs font-bold">
                <Stamp className="mr-1.5 h-3.5 w-3.5" />
                Skills, Dates & Stamp
              </TabsTrigger>
              <TabsTrigger value="workspace_theme" className="text-xs font-bold">
                <Palette className="mr-1.5 h-3.5 w-3.5" />
                Theme, Crest & Receipts
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: REPORT SHEET LAYOUT, COLOURS & FONTS */}
            <TabsContent value="report_layout" className="space-y-4">
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-extrabold text-[#0F172A]">
                    1. Choose Report Sheet Layout Template
                  </h2>
                  <p className="text-xs text-slate-500">
                    Switch layouts anytime — preview updates immediately.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {REPORT_TEMPLATE_OPTIONS.map((tpl) => {
                    const active = reportSheet.template === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              reportSheet: {
                                ...prev.reportSheet,
                                template: tpl.id as ReportTemplateId,
                              },
                            }),
                            `Selected Report Template: ${tpl.label}`
                          )
                        }
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-[#1a4a6e] bg-[#edf7f6] ring-2 ring-[#1a4a6e]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#0F172A]">
                            {tpl.label}
                          </span>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-[#067647]" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {tpl.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Report Header Title */}
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-bold">
                    Report Sheet Heading Title
                  </Label>
                  <Input
                    value={reportSheet.customReportTitle}
                    onChange={(e) =>
                      updateCustom(
                        (prev) => ({
                          ...prev,
                          reportSheet: {
                            ...prev.reportSheet,
                            customReportTitle: e.target.value,
                          },
                        }),
                        "Updated Custom Report Title"
                      )
                    }
                    placeholder="e.g. Student Termly Report Sheet"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Report Colours, Paper Tint & Fonts */}
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0F172A]">
                      2. Report Colours, Font & Visual Style
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sync with your portal colour or set a dedicated report sheet palette.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.syncWithWorkspaceTheme}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              syncWithWorkspaceTheme: e.target.checked,
                            },
                          }),
                          "Toggled Report Sheet Theme Colour Sync"
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Match Workspace Colour
                  </label>
                </div>

                {!reportSheet.syncWithWorkspaceTheme && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">
                        Report Primary Colour
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={reportSheet.primaryColor}
                          onChange={(e) =>
                            updateCustom(
                              (prev) => ({
                                ...prev,
                                reportSheet: {
                                  ...prev.reportSheet,
                                  syncWithWorkspaceTheme: false,
                                  primaryColor: e.target.value,
                                },
                              }),
                              "Updated Report Primary Colour"
                            )
                          }
                          className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        />
                        <Input
                          value={reportSheet.primaryColor}
                          onChange={(e) =>
                            updateCustom(
                              (prev) => ({
                                ...prev,
                                reportSheet: {
                                  ...prev.reportSheet,
                                  syncWithWorkspaceTheme: false,
                                  primaryColor: e.target.value,
                                },
                              }),
                              "Updated Report Primary Colour"
                            )
                          }
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">
                        Report Accent / Badge Colour
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={reportSheet.accentColor}
                          onChange={(e) =>
                            updateCustom(
                              (prev) => ({
                                ...prev,
                                reportSheet: {
                                  ...prev.reportSheet,
                                  syncWithWorkspaceTheme: false,
                                  accentColor: e.target.value,
                                },
                              }),
                              "Updated Report Accent Colour"
                            )
                          }
                          className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        />
                        <Input
                          value={reportSheet.accentColor}
                          onChange={(e) =>
                            updateCustom(
                              (prev) => ({
                                ...prev,
                                reportSheet: {
                                  ...prev.reportSheet,
                                  syncWithWorkspaceTheme: false,
                                  accentColor: e.target.value,
                                },
                              }),
                              "Updated Report Accent Colour"
                            )
                          }
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs font-bold">
                      <Type className="h-3.5 w-3.5" />
                      Font Style
                    </Label>
                    <select
                      value={reportSheet.fontFamily}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              fontFamily: e.target.value as ReportFontFamily,
                            },
                          }),
                          "Changed Report Font Family"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="sans">Modern Sans (Clean)</option>
                      <option value="serif">Academic Serif (Formal)</option>
                      <option value="mono_tabular">Tabular Crisp Numbers</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Text Size</Label>
                    <select
                      value={reportSheet.fontScale}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              fontScale: e.target.value as ReportFontScale,
                            },
                          }),
                          "Changed Report Font Scale"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="compact">Compact (Fits 16+ Subjects)</option>
                      <option value="standard">Standard Balanced</option>
                      <option value="large">Large Readable</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Paper Tint</Label>
                    <select
                      value={reportSheet.paperTint}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              paperTint: e.target.value as ReportPaperTint,
                            },
                          }),
                          "Changed Report Paper Tint"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="white">Pure White</option>
                      <option value="warm_ivory">Warm Certificate Ivory</option>
                      <option value="cool_ice">Soft Ice Tint</option>
                    </select>
                  </div>
                </div>

                {/* Border & Visual Checkboxes */}
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.tableStriped}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              tableStriped: e.target.checked,
                            },
                          }),
                          "Toggled Zebra Striped Report Rows"
                        )
                      }
                    />
                    Alternating Striped Subject Rows
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.showWatermark}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              showWatermark: e.target.checked,
                            },
                          }),
                          "Toggled Report Crest Watermark"
                        )
                      }
                    />
                    Subtle Crest Watermark Behind Table
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: POSITIONS VS FINAL GRADE ONLY, GRADING SCALE & AUTO-COMMENTS (A–F) */}
            <TabsContent value="grades_comments" className="space-y-4">
              {/* Ranking Mode Selector */}
              <div className="ndh-card space-y-3.5 p-4 sm:p-5">
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F172A]">
                    <Award className="h-4 w-4 text-[#1a4a6e]" />
                    Positions vs Final Grade Only
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose whether report sheets display student class/subject positions or only their final grade (A–F).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      {
                        id: "positions_and_grade",
                        title: "Show Class Position, Subject Positions & Final Grade",
                        desc: "Displays overall Class Position (e.g. 1st of 25), Subject Pos column, and Final Grade.",
                      },
                      {
                        id: "class_position_only",
                        title: "Show Overall Class Position + Final Grade Only",
                        desc: "Displays overall Class Position in summary bar, hides per-subject Pos column.",
                      },
                      {
                        id: "grade_only",
                        title: "Final Grade Only (Hide All Positions)",
                        desc: "Hides both Class Position and Subject Positions — shows Totals, Averages & Final Grade (A–F).",
                      },
                    ] as const
                  ).map((opt) => {
                    const active = reportSheet.rankingMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              reportSheet: {
                                ...prev.reportSheet,
                                rankingMode: opt.id as ReportRankingMode,
                              },
                            }),
                            `Set Report Ranking Mode: ${opt.title}`
                          )
                        }
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-[#1a4a6e] bg-[#edf7f6] ring-2 ring-[#1a4a6e]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#0F172A]">
                            {opt.title}
                          </span>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-[#067647]" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.consolidateCA}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              consolidateCA: e.target.checked,
                            },
                          }),
                          "Toggled Consolidate CA Columns"
                        )
                      }
                    />
                    Combine CA1 + CA2 into One CA Column
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.showOverallGradeBadge}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              showOverallGradeBadge: e.target.checked,
                            },
                          }),
                          "Toggled Overall Final Grade Badge"
                        )
                      }
                    />
                    Show Final Grade Pill Badge
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.showClassAverage}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              showClassAverage: e.target.checked,
                            },
                          }),
                          "Toggled Show Class Average"
                        )
                      }
                    />
                    Show Class Average Comparison
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportSheet.showSubjectRemarks}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              showSubjectRemarks: e.target.checked,
                            },
                          }),
                          "Toggled Subject Remarks Column"
                        )
                      }
                    />
                    Show Subject Remarks Column
                  </label>
                </div>
              </div>

              {/* Auto-Comments Based on Final Grade (A, B, C, D, E, F) */}
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F172A]">
                      <Sparkles className="h-4 w-4 text-[#067647]" />
                      Auto-Comments Based on Final Grade (A, B, C, D, E, F)
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Customize automatic Class Teacher & Principal remarks for each final grade. Supports{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                        {"{firstName}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                        {"{name}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                        {"{average}"}
                      </code>
                      , and{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                        {"{grade}"}
                      </code>
                      .
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                    <input
                      type="checkbox"
                      checked={autoComments.enabled}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            autoComments: {
                              ...prev.autoComments,
                              enabled: e.target.checked,
                            },
                          }),
                          "Toggled Grade Auto-Comments"
                        )
                      }
                    />
                    Auto-Comments Active
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold">
                      When should Auto-Comments appear on Report Sheets?
                    </Label>
                    <select
                      value={autoComments.mode}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            autoComments: {
                              ...prev.autoComments,
                              mode: e.target.value as
                                | "fallback_when_empty"
                                | "override_all",
                            },
                          }),
                          "Changed Auto-Comment Priority Mode"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="fallback_when_empty">
                        Smart Default — Use Grade Auto-Comment unless a custom remark was typed
                      </option>
                      <option value="override_all">
                        Strict Grade Rule — Always display A–F Auto-Comment on all Report Sheets
                      </option>
                    </select>
                  </div>
                </div>

                {/* Grade A–F Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {GRADE_LETTER_KEYS.map((letter) => {
                    const active = activeCommentGrade === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => {
                          setActiveCommentGrade(letter);
                          setPreviewGrade(letter);
                        }}
                        className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
                          active
                            ? "bg-[#0c2340] text-white shadow-xs"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Grade {letter}
                      </button>
                    );
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateCustom(
                        (prev) => ({
                          ...prev,
                          autoComments: {
                            ...prev.autoComments,
                            rules: {
                              A: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.A },
                              B: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.B },
                              C: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.C },
                              D: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.D },
                              E: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.E },
                              F: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.F },
                            },
                          },
                        }),
                        "Reset Grade A–F Auto-Comments"
                      );
                      toast.success("Restored default A–F auto-comments.");
                    }}
                    className="ml-auto h-7 text-[11px] text-slate-500 hover:text-slate-900"
                  >
                    Reset A–F Texts
                  </Button>
                </div>

                {/* Editor for Currently Selected Grade Letter */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="text-xs font-extrabold text-[#0c2340]">
                    Editing Auto-Comments for Final Grade {activeCommentGrade}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      {settings.labels.classSingular}{" "}
                      {settings.labels.teacherSingular}'s Auto-Comment (Grade{" "}
                      {activeCommentGrade})
                    </Label>
                    <Input
                      value={autoComments.rules[activeCommentGrade].teacherComment}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            autoComments: {
                              ...prev.autoComments,
                              rules: {
                                ...prev.autoComments.rules,
                                [activeCommentGrade]: {
                                  ...prev.autoComments.rules[activeCommentGrade],
                                  teacherComment: e.target.value,
                                },
                              },
                            },
                          }),
                          `Updated Teacher Auto-Comment for Grade ${activeCommentGrade}`
                        )
                      }
                      className="bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      {reportSheet.principalTitleLabel}'s Auto-Comment (Grade{" "}
                      {activeCommentGrade})
                    </Label>
                    <Input
                      value={
                        autoComments.rules[activeCommentGrade].principalComment
                      }
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            autoComments: {
                              ...prev.autoComments,
                              rules: {
                                ...prev.autoComments.rules,
                                [activeCommentGrade]: {
                                  ...prev.autoComments.rules[activeCommentGrade],
                                  principalComment: e.target.value,
                                },
                              },
                            },
                          }),
                          `Updated Principal Auto-Comment for Grade ${activeCommentGrade}`
                        )
                      }
                      className="bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Customizable Grade Scale (A–F Boundaries) & Assessment Weights */}
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0F172A]">
                      Grade Scale Boundaries (A–F) & Score Columns
                    </h2>
                    <p className="text-xs text-slate-500">
                      Customize score columns (current max: {totalAssessmentMax}) and A–F score ranges.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSettings(
                        (prev) => ({
                          ...prev,
                          grading: {
                            ...prev.grading,
                            defaultComponents: [
                              ...prev.grading.defaultComponents,
                              {
                                id: `ca_${Date.now().toString().slice(-4)}`,
                                label: `CA ${prev.grading.defaultComponents.length}`,
                                maxScore: 10,
                              },
                            ],
                          },
                        }),
                        "Added Assessment Score Column"
                      )
                    }
                    className="h-8 text-xs font-bold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Column
                  </Button>
                </div>

                {/* Assessment Components */}
                <div className="space-y-2">
                  {settings.grading.defaultComponents.map((comp, idx) => (
                    <div
                      key={comp.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <Input
                        value={comp.label}
                        onChange={(e) =>
                          updateSettings(
                            (prev) => ({
                              ...prev,
                              grading: {
                                ...prev.grading,
                                defaultComponents:
                                  prev.grading.defaultComponents.map((c, i) =>
                                    i === idx
                                      ? { ...c, label: e.target.value }
                                      : c
                                  ),
                              },
                            }),
                            `Renamed Assessment Column ${comp.label}`
                          )
                        }
                        className="h-8 flex-1 bg-white text-xs font-semibold"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Max:</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={comp.maxScore}
                          onChange={(e) =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                grading: {
                                  ...prev.grading,
                                  defaultComponents:
                                    prev.grading.defaultComponents.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            maxScore: Math.max(
                                              1,
                                              Number(e.target.value) || 0
                                            ),
                                          }
                                        : c
                                    ),
                                },
                              }),
                              `Updated Max Score for ${comp.label}`
                            )
                          }
                          className="h-8 w-20 bg-white text-center text-xs font-bold"
                        />
                      </div>
                      {settings.grading.defaultComponents.length > 2 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                grading: {
                                  ...prev.grading,
                                  defaultComponents:
                                    prev.grading.defaultComponents.filter(
                                      (_, i) => i !== idx
                                    ),
                                },
                              }),
                              `Removed Score Column ${comp.label}`
                            )
                          }
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Grade Bands A–F */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-xs font-bold text-slate-700">
                    Grade Boundaries & Short Subject Remarks
                  </div>
                  {settings.grading.gradeBands.map((band, idx) => (
                    <div
                      key={band.grade + idx}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <div className="col-span-2 font-extrabold text-[#0c2340]">
                        Grade {band.grade}
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Min</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={band.min}
                          onChange={(e) =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                grading: {
                                  ...prev.grading,
                                  gradeBands: prev.grading.gradeBands.map(
                                    (b, i) =>
                                      i === idx
                                        ? {
                                            ...b,
                                            min: Number(e.target.value) || 0,
                                          }
                                        : b
                                  ),
                                },
                              }),
                              `Updated Grade ${band.grade} Min`
                            )
                          }
                          className="h-7 px-1.5 text-center text-xs"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Max</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={band.max}
                          onChange={(e) =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                grading: {
                                  ...prev.grading,
                                  gradeBands: prev.grading.gradeBands.map(
                                    (b, i) =>
                                      i === idx
                                        ? {
                                            ...b,
                                            max: Number(e.target.value) || 0,
                                          }
                                        : b
                                  ),
                                },
                              }),
                              `Updated Grade ${band.grade} Max`
                            )
                          }
                          className="h-7 px-1.5 text-center text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={band.remark}
                          onChange={(e) =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                grading: {
                                  ...prev.grading,
                                  gradeBands: prev.grading.gradeBands.map(
                                    (b, i) =>
                                      i === idx
                                        ? { ...b, remark: e.target.value }
                                        : b
                                  ),
                                },
                              }),
                              `Updated Grade ${band.grade} Remark`
                            )
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: SECTIONS, SKILLS, RESUMPTION DATES & DIGITAL STAMP */}
            <TabsContent value="sections_stamp" className="space-y-4">
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <h2 className="text-sm font-extrabold text-[#0F172A]">
                  Visible Report Card Sections
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  {(
                    [
                      ["showStudentPhotoBox", "Student Passport / Initials Box"],
                      ["showAttendanceSummary", "Attendance Summary Strip"],
                      ["showAffectiveSkills", "Conduct & Skills Rating Box"],
                      ["showGradingKey", "Grading Scale Key Footer"],
                      ["showNextTermDate", "Next Term Resumption Date"],
                      ["showNextTermFeeNote", "Next Term Fee Notice"],
                    ] as const
                  ).map(([field, label]) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(reportSheet[field])}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              reportSheet: {
                                ...prev.reportSheet,
                                [field]: e.target.checked,
                              },
                            }),
                            `Toggled ${label}`
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {/* Custom Conduct Skill Labels */}
                {reportSheet.showAffectiveSkills && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <div className="text-xs font-bold text-slate-700">
                      Customize Conduct / Psychomotor Trait Labels (Rated 1–5)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          "punctuality",
                          "neatness",
                          "politeness",
                          "honesty",
                        ] as const
                      ).map((traitKey) => (
                        <Input
                          key={traitKey}
                          value={reportSheet.affectiveSkillLabels[traitKey]}
                          onChange={(e) =>
                            updateCustom(
                              (prev) => ({
                                ...prev,
                                reportSheet: {
                                  ...prev.reportSheet,
                                  affectiveSkillLabels: {
                                    ...prev.reportSheet.affectiveSkillLabels,
                                    [traitKey]: e.target.value,
                                  },
                                },
                              }),
                              `Renamed Conduct Trait ${traitKey}`
                            )
                          }
                          className="h-8 text-xs"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Term Resumption & Fee Notice */}
                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Next {settings.labels.termLabel} Resumption Date
                    </Label>
                    <Input
                      value={reportSheet.nextTermBegins}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              nextTermBegins: e.target.value,
                            },
                          }),
                          "Updated Next Term Resumption Date"
                        )
                      }
                      placeholder="e.g. Monday, 11th January 2027"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Next {settings.labels.termLabel} Fee Reminder Note
                    </Label>
                    <Input
                      value={reportSheet.nextTermFeeNote}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              nextTermFeeNote: e.target.value,
                            },
                          }),
                          "Updated Next Term Fee Note"
                        )
                      }
                      placeholder="e.g. Fees due on or before resumption"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Principal Signature, Digital Stamp & Footer */}
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <h2 className="text-sm font-extrabold text-[#0F172A]">
                  Principal / Head Teacher Title, Digital Signature & Footer
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Head of School Title Label
                    </Label>
                    <Input
                      value={reportSheet.principalTitleLabel}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              principalTitleLabel: e.target.value,
                            },
                          }),
                          "Updated Principal Title Label"
                        )
                      }
                      placeholder="e.g. Principal / Head Teacher / Director"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Typed Signature Name (if no image)
                    </Label>
                    <Input
                      value={reportSheet.principalSignatureName}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            reportSheet: {
                              ...prev.reportSheet,
                              principalSignatureName: e.target.value,
                            },
                          }),
                          "Updated Typed Principal Signature"
                        )
                      }
                      placeholder="e.g. Dr. A. Ibrahim"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-slate-100">
                    <Upload className="h-3.5 w-3.5 text-[#1a4a6e]" />
                    Upload Signature / Stamp Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "signature")}
                      className="hidden"
                    />
                  </label>
                  {reportSheet.principalSignatureDataUrl && (
                    <>
                      <img
                        src={reportSheet.principalSignatureDataUrl}
                        alt="Uploaded signature"
                        className="h-8 rounded border border-slate-200 bg-white px-2 object-contain"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              reportSheet: {
                                ...prev.reportSheet,
                                principalSignatureDataUrl: undefined,
                              },
                            }),
                            "Removed Principal Signature Image"
                          )
                        }
                        className="h-7 text-xs text-red-600"
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">
                    Bottom Certificate Footer Note
                  </Label>
                  <Input
                    value={reportSheet.footerNote}
                    onChange={(e) =>
                      updateCustom(
                        (prev) => ({
                          ...prev,
                          reportSheet: {
                            ...prev.reportSheet,
                            footerNote: e.target.value,
                          },
                        }),
                        "Updated Report Footer Note"
                      )
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: WORKSPACE THEME, CREST & RECEIPTS */}
            <TabsContent value="workspace_theme" className="space-y-4">
              <div className="ndh-card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-extrabold text-[#0F172A]">
                    School Workspace Colour Theme
                  </h2>
                  <p className="text-xs text-slate-500">
                    Styles your school portal header, sidebar, school crest, receipts, and synced report sheets.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {WORKSPACE_THEME_PRESETS.map((preset) => {
                    const active = workspaceTheme.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: preset.id,
                                primaryColor: preset.primaryColor,
                                accentColor: preset.accentColor,
                                highlightColor: preset.highlightColor,
                              },
                            }),
                            `Applied Workspace Theme: ${preset.label}`
                          )
                        }
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-[#1a4a6e] bg-[#edf7f6] ring-2 ring-[#1a4a6e]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-black/10"
                              style={{ backgroundColor: preset.primaryColor }}
                            />
                            <span
                              className="h-4 w-4 -ml-3 rounded-full border border-white"
                              style={{ backgroundColor: preset.accentColor }}
                            />
                            <span className="text-xs font-extrabold text-[#0F172A]">
                              {preset.label}
                            </span>
                          </div>
                          {active && (
                            <Check className="h-4 w-4 text-[#067647]" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hex Colour Pickers */}
                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Primary Brand</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={workspaceTheme.primaryColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                primaryColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Primary Colour"
                          )
                        }
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                      />
                      <Input
                        value={workspaceTheme.primaryColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                primaryColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Primary Colour"
                          )
                        }
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Secondary Accent</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={workspaceTheme.accentColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                accentColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Accent Colour"
                          )
                        }
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                      />
                      <Input
                        value={workspaceTheme.accentColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                accentColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Accent Colour"
                          )
                        }
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Highlight Tint</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={workspaceTheme.highlightColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                highlightColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Highlight Colour"
                          )
                        }
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                      />
                      <Input
                        value={workspaceTheme.highlightColor}
                        onChange={(e) =>
                          updateCustom(
                            (prev) => ({
                              ...prev,
                              workspaceTheme: {
                                ...prev.workspaceTheme,
                                presetId: "custom",
                                highlightColor: e.target.value,
                              },
                            }),
                            "Customized Workspace Highlight Colour"
                          )
                        }
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Workspace Font, Crest Shape & Logo */}
                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Portal Interface Font
                    </Label>
                    <select
                      value={workspaceTheme.workspaceFont}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            workspaceTheme: {
                              ...prev.workspaceTheme,
                              workspaceFont: e.target.value as WorkspaceFontId,
                            },
                          }),
                          "Changed Portal Interface Font"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="modern_sans">Modern Sans (DM Sans)</option>
                      <option value="geometric">Geometric (Space Grotesk)</option>
                      <option value="classic_serif">Classic Academic Serif</option>
                      <option value="system_clean">Fast System UI</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      School Crest Frame Shape
                    </Label>
                    <select
                      value={workspaceTheme.crestShape}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            workspaceTheme: {
                              ...prev.workspaceTheme,
                              crestShape: e.target.value as CrestShapeId,
                            },
                          }),
                          "Changed School Crest Shape"
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="rounded">Rounded Square</option>
                      <option value="circle">Circular Seal</option>
                      <option value="shield">Academic Shield</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <SchoolCrest settings={settings} size="md" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      Custom School Logo (Saved Offline)
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-slate-100">
                      <Upload className="h-3.5 w-3.5 text-[#1a4a6e]" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "logo")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Fee Receipt & Admission Customization */}
              <div className="ndh-card space-y-3.5 p-4 sm:p-5 text-xs">
                <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F172A]">
                  <FileSpreadsheet className="h-4 w-4 text-[#1a4a6e]" />
                  Official Fee Receipts & Admission ID Format
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Receipt Header Badge Title
                    </Label>
                    <Input
                      value={documents.receiptHeaderTitle}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            documents: {
                              ...prev.documents,
                              receiptHeaderTitle: e.target.value,
                            },
                          }),
                          "Updated Receipt Header Title"
                        )
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Admission ID Prefix (for new students)
                    </Label>
                    <Input
                      value={documents.admissionNumberPrefix}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            documents: {
                              ...prev.documents,
                              admissionNumberPrefix: e.target.value,
                            },
                          }),
                          "Updated Admission ID Prefix"
                        )
                      }
                      placeholder={`e.g. ${settings.code}/2026/`}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold">
                      Receipt Footer Note
                    </Label>
                    <Input
                      value={documents.receiptFooterNote}
                      onChange={(e) =>
                        updateCustom(
                          (prev) => ({
                            ...prev,
                            documents: {
                              ...prev.documents,
                              receiptFooterNote: e.target.value,
                            },
                          }),
                          "Updated Receipt Footer Note"
                        )
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={documents.showBankDetailsOnReceipt}
                    onChange={(e) =>
                      updateCustom(
                        (prev) => ({
                          ...prev,
                          documents: {
                            ...prev.documents,
                            showBankDetailsOnReceipt: e.target.checked,
                          },
                        }),
                        "Toggled Bank Details on Receipt"
                      )
                    }
                  />
                  Display School Bank Account Details on Fee Receipts
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT LIVE WYSIWYG REPORT SHEET PREVIEW (6 cols on xl, sticky) */}
        <div className="space-y-3 xl:sticky xl:top-20 xl:col-span-6">
          <div className="ndh-card p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F172A]">
                <Eye className="h-4 w-4 text-[#1a4a6e]" />
                <span>Live Report Sheet Preview</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {students.length > 0 && (
                  <select
                    aria-label="Select student for preview"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="h-8 max-w-[180px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold"
                  >
                    <option value="__sample">Template Sample Preview</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName}
                      </option>
                    ))}
                  </select>
                )}

                {selectedStudentId !== "__sample" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      openPrintPreview({
                        type: "report_card",
                        studentId: selectedStudentId,
                        session: settings.currentSession,
                        term: settings.currentTerm,
                        layout: settings.reportCardDefaultLayout,
                      })
                    }
                    className="h-8 bg-[#0c2340] text-xs font-bold text-white hover:bg-[#1a4a6e]"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Print A4
                  </Button>
                )}
              </div>
            </div>

            {/* Simulated Final Grade Switcher (A, B, C, D, E, F) */}
            {selectedStudentId === "__sample" && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">
                  Simulate Final Grade & Auto-Comment:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {GRADE_LETTER_KEYS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setPreviewGrade(g);
                        setActiveCommentGrade(g);
                      }}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-extrabold transition ${
                        previewGrade === g
                          ? "bg-[#0c2340] text-white"
                          : "bg-white text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Sheet */}
            <div className="mt-3 max-h-[75dvh] overflow-y-auto rounded-xl bg-slate-100 p-2 sm:p-3">
              {selectedStudentId !== "__sample" ? (
                <PrintableReportCard
                  db={db}
                  studentId={selectedStudentId}
                  session={settings.currentSession}
                  term={settings.currentTerm}
                  layout={settings.reportCardDefaultLayout}
                />
              ) : (
                <ReportCardDesignPreviewSample
                  db={db}
                  simulatedGrade={previewGrade}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
