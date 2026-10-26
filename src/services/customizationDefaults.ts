import type {
  GradeAutoCommentRule,
  GradeLetterKey,
  ReportFontFamily,
  ReportTemplateId,
  SchoolCustomizationConfig,
  SchoolSettings,
  WorkspaceFontId,
  WorkspaceThemePresetId,
} from "@/types/school";

export const GRADE_LETTER_KEYS: readonly GradeLetterKey[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const;

export interface WorkspaceThemePresetMeta {
  id: Exclude<WorkspaceThemePresetId, "custom">;
  label: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  highlightColor: string;
}

export const WORKSPACE_THEME_PRESETS: readonly WorkspaceThemePresetMeta[] = [
  {
    id: "ndh_navy",
    label: "NDH Gateway Navy",
    description: "Official deep navy & soft teal highlights",
    primaryColor: "#0c2340",
    accentColor: "#1a4a6e",
    highlightColor: "#9ed9d6",
  },
  {
    id: "royal_emerald",
    label: "Royal Nigerian Emerald",
    description: "Distinguished forest green & mint gold accents",
    primaryColor: "#064e3b",
    accentColor: "#047857",
    highlightColor: "#a7f3d0",
  },
  {
    id: "sovereign_burgundy",
    label: "Sovereign Burgundy",
    description: "Classic academic maroon & warm cream highlights",
    primaryColor: "#4c0519",
    accentColor: "#881337",
    highlightColor: "#fecdd3",
  },
  {
    id: "imperial_indigo",
    label: "Imperial Indigo",
    description: "Modern collegiate indigo & sky-violet accents",
    primaryColor: "#1e1b4b",
    accentColor: "#3730a3",
    highlightColor: "#c7d2fe",
  },
  {
    id: "forest_gold",
    label: "Heritage Pine & Gold",
    description: "Deep heritage green paired with warm amber gold",
    primaryColor: "#14532d",
    accentColor: "#166534",
    highlightColor: "#fde68a",
  },
  {
    id: "slate_executive",
    label: "Slate Executive",
    description: "Crisp monochrome charcoal & steel blue",
    primaryColor: "#0f172a",
    accentColor: "#334155",
    highlightColor: "#bae6fd",
  },
] as const;

export const REPORT_TEMPLATE_OPTIONS: ReadonlyArray<{
  id: ReportTemplateId;
  label: string;
  summary: string;
}> = [
  {
    id: "classic_grid",
    label: "Classic Nigerian Grid",
    summary: "Centered crest, full table gridlines & traditional boxed summary.",
  },
  {
    id: "executive_banner",
    label: "Executive Colored Banner",
    summary: "Solid brand-colored header banner with modern stat pills.",
  },
  {
    id: "compact_single_page",
    label: "Compact Single-Page",
    summary: "Condensed spacing ideal for 14–18 JSS/SSS subjects on one A4 page.",
  },
  {
    id: "royal_certificate",
    label: "Royal Double-Border",
    summary: "Ceremonial double-frame border with optional crest watermark.",
  },
] as const;

export const DEFAULT_AUTO_COMMENTS_BY_GRADE: Record<
  GradeLetterKey,
  GradeAutoCommentRule
> = {
  A: {
    grade: "A",
    teacherComment:
      "An outstanding performance, {firstName}! Attentive, diligent, and exemplary across class activities.",
    principalComment:
      "Excellent result ({average}%). Keep up this remarkable academic standard next term.",
  },
  B: {
    grade: "B",
    teacherComment:
      "A very good result, {firstName}. Shows strong understanding; a little extra polish will bring straight A's.",
    principalComment:
      "Very commendable performance ({average}%). Stay focused and aim even higher next term.",
  },
  C: {
    grade: "C",
    teacherComment:
      "Good credit effort, {firstName}. Needs steadier revision and closer attention to weaker subjects.",
    principalComment:
      "Satisfactory credit pass ({average}%). Capable of much stronger results with consistent study.",
  },
  D: {
    grade: "D",
    teacherComment:
      "A fair pass, {firstName}. Must reduce distractions in class and complete home revision regularly.",
    principalComment:
      "Fair performance ({average}%). Greater daily commitment is required next term.",
  },
  E: {
    grade: "E",
    teacherComment:
      "Borderline pass, {firstName}. Needs close daily academic follow-up and guided practice.",
    principalComment:
      "Weak pass ({average}%). Parents and teachers should monitor study habits closely.",
  },
  F: {
    grade: "F",
    teacherComment:
      "Below expected standard, {firstName}. Urgent remedial support and structured home study are needed.",
    principalComment:
      "Unsatisfactory result ({average}%). Immediate academic intervention and parent follow-up advised.",
  },
};

export function createDefaultCustomization(): SchoolCustomizationConfig {
  return {
    workspaceTheme: {
      presetId: "ndh_navy",
      primaryColor: "#0c2340",
      accentColor: "#1a4a6e",
      highlightColor: "#9ed9d6",
      workspaceFont: "modern_sans",
      crestShape: "rounded",
      tableDensity: "comfortable",
      lowDataMode: false,
    },
    reportSheet: {
      template: "classic_grid",
      syncWithWorkspaceTheme: true,
      primaryColor: "#0c2340",
      accentColor: "#1a4a6e",
      paperTint: "white",
      fontFamily: "sans",
      fontScale: "standard",
      tableStriped: true,
      showWatermark: false,
      borderStyle: "solid",
      customReportTitle: "Student Termly Report Sheet",
      rankingMode: "positions_and_grade",
      broadsheetShowPositions: true,
      consolidateCA: false,
      showSubjectRemarks: true,
      showClassAverage: true,
      showOverallGradeBadge: true,
      showStudentPhotoBox: true,
      showAttendanceSummary: true,
      showAffectiveSkills: true,
      affectiveSkillLabels: {
        punctuality: "Punctuality",
        neatness: "Neatness",
        politeness: "Politeness",
        honesty: "Honesty",
      },
      showGradingKey: true,
      showNextTermDate: true,
      nextTermBegins: "",
      showNextTermFeeNote: false,
      nextTermFeeNote: "",
      principalTitleLabel: "Principal / Proprietor",
      principalSignatureName: "",
      footerNote: "Official computer-generated report sheet — any unauthorized alteration renders it invalid.",
    },
    autoComments: {
      enabled: true,
      mode: "fallback_when_empty",
      rules: {
        A: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.A },
        B: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.B },
        C: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.C },
        D: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.D },
        E: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.E },
        F: { ...DEFAULT_AUTO_COMMENTS_BY_GRADE.F },
      },
    },
    documents: {
      receiptHeaderTitle: "OFFICIAL FEE RECEIPT",
      receiptFooterNote:
        "Please retain this official receipt for termly clearance.",
      showBankDetailsOnReceipt: true,
      cashierTitleLabel: "Bursar / Cashier Signature",
      admissionNumberPrefix: "",
    },
  };
}

export function getResolvedCustomization(
  settings: SchoolSettings
): SchoolCustomizationConfig {
  const def = createDefaultCustomization();
  const raw = settings.customization;
  if (!raw) return def;

  const workspaceTheme = {
    ...def.workspaceTheme,
    ...raw.workspaceTheme,
  };

  const rawReport = raw.reportSheet;
  const syncColor = rawReport?.syncWithWorkspaceTheme ?? true;

  const reportSheet = {
    ...def.reportSheet,
    ...rawReport,
    primaryColor: syncColor
      ? workspaceTheme.primaryColor
      : rawReport?.primaryColor || workspaceTheme.primaryColor,
    accentColor: syncColor
      ? workspaceTheme.accentColor
      : rawReport?.accentColor || workspaceTheme.accentColor,
    affectiveSkillLabels: {
      ...def.reportSheet.affectiveSkillLabels,
      ...rawReport?.affectiveSkillLabels,
    },
  };

  const mergedRules = { ...def.autoComments.rules };
  for (const key of GRADE_LETTER_KEYS) {
    if (raw.autoComments?.rules?.[key]) {
      mergedRules[key] = {
        ...def.autoComments.rules[key],
        ...raw.autoComments.rules[key],
        grade: key,
      };
    }
  }

  return {
    workspaceTheme,
    reportSheet,
    autoComments: {
      ...def.autoComments,
      ...raw.autoComments,
      rules: mergedRules,
    },
    documents: {
      ...def.documents,
      ...raw.documents,
    },
    lastExternalBackupAt: raw.lastExternalBackupAt,
  };
}

export function normalizeGradeKey(grade: string): GradeLetterKey | null {
  const clean = grade.trim().toUpperCase().charAt(0);
  if (
    clean === "A" ||
    clean === "B" ||
    clean === "C" ||
    clean === "D" ||
    clean === "E" ||
    clean === "F"
  ) {
    return clean;
  }
  return null;
}

export function formatAutoCommentTemplate(
  template: string,
  params: {
    studentName: string;
    averagePercentage: number;
    grade: string;
  }
): string {
  const trimmedName = params.studentName.trim() || "Student";
  const firstName = trimmedName.split(/\s+/)[0] || trimmedName;
  const avgStr = Number.isFinite(params.averagePercentage)
    ? params.averagePercentage.toFixed(1)
    : "0.0";

  return template
    .replace(/\{firstName\}/gi, firstName)
    .replace(/\{name\}/gi, trimmedName)
    .replace(/\{average\}/gi, avgStr)
    .replace(/\{grade\}/gi, params.grade || "—");
}

export function resolveReportCardRemarks(params: {
  customization: SchoolCustomizationConfig;
  overallGrade: string;
  averagePercentage: number;
  studentName: string;
  manualTeacherRemark?: string | undefined;
  manualPrincipalRemark?: string | undefined;
}): {
  teacherRemark: string;
  principalRemark: string;
} {
  const {
    customization,
    overallGrade,
    averagePercentage,
    studentName,
    manualTeacherRemark,
    manualPrincipalRemark,
  } = params;

  const gradeKey = normalizeGradeKey(overallGrade);
  const autoRule = gradeKey ? customization.autoComments.rules[gradeKey] : null;
  const autoEnabled = customization.autoComments.enabled && Boolean(autoRule);

  const defaultManualTeacher =
    "Attentive in class, neat in appearance and completes assignments on time.";
  const defaultManualPrincipal = "Good term progress. Keep working hard.";

  const hasCustomTeacher =
    Boolean(manualTeacherRemark?.trim()) &&
    manualTeacherRemark?.trim() !== defaultManualTeacher &&
    manualTeacherRemark?.trim() !==
      "Attentive in class and completes assignments on time.";

  const hasCustomPrincipal =
    Boolean(manualPrincipalRemark?.trim()) &&
    manualPrincipalRemark?.trim() !== defaultManualPrincipal;

  const formattedAutoTeacher = autoRule
    ? formatAutoCommentTemplate(autoRule.teacherComment, {
        studentName,
        averagePercentage,
        grade: overallGrade,
      })
    : "";

  const formattedAutoPrincipal = autoRule
    ? formatAutoCommentTemplate(autoRule.principalComment, {
        studentName,
        averagePercentage,
        grade: overallGrade,
      })
    : "";

  if (autoEnabled && customization.autoComments.mode === "override_all") {
    return {
      teacherRemark: formattedAutoTeacher || manualTeacherRemark || defaultManualTeacher,
      principalRemark:
        formattedAutoPrincipal || manualPrincipalRemark || defaultManualPrincipal,
    };
  }

  return {
    teacherRemark: hasCustomTeacher
      ? manualTeacherRemark!
      : autoEnabled && formattedAutoTeacher
        ? formattedAutoTeacher
        : manualTeacherRemark?.trim() || defaultManualTeacher,
    principalRemark: hasCustomPrincipal
      ? manualPrincipalRemark!
      : autoEnabled && formattedAutoPrincipal
        ? formattedAutoPrincipal
        : manualPrincipalRemark?.trim() || defaultManualPrincipal,
  };
}

export function getWorkspaceFontStack(fontId: WorkspaceFontId): string {
  switch (fontId) {
    case "geometric":
      return '"Space Grotesk", "DM Sans", ui-sans-serif, system-ui, sans-serif';
    case "classic_serif":
      return 'Georgia, Cambria, "Times New Roman", Times, serif';
    case "system_clean":
      return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case "modern_sans":
    default:
      return '"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif';
  }
}

export function getReportFontStack(fontFamily: ReportFontFamily): string {
  switch (fontFamily) {
    case "serif":
      return 'Georgia, Cambria, "Times New Roman", Times, serif';
    case "mono_tabular":
      return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    case "sans":
    default:
      return '"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif';
  }
}
