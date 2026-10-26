import type {
  ExamObjectiveQuestion,
  ExamTheoryQuestion,
} from "@/types/school";

export interface VisionAIConfig {
  provider: "gemini" | "openai";
  apiKey: string;
}

const VISION_CONFIG_KEY = "ndh_schoolos_vision_ai_v1";

export function loadVisionAIConfig(): VisionAIConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VISION_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisionAIConfig>;
    if (
      parsed &&
      (parsed.provider === "gemini" || parsed.provider === "openai") &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.trim().length > 5
    ) {
      return {
        provider: parsed.provider,
        apiKey: parsed.apiKey.trim(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveVisionAIConfig(config: VisionAIConfig | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!config || !config.apiKey.trim()) {
      window.localStorage.removeItem(VISION_CONFIG_KEY);
      return;
    }
    window.localStorage.setItem(
      VISION_CONFIG_KEY,
      JSON.stringify({
        provider: config.provider,
        apiKey: config.apiKey.trim(),
      })
    );
  } catch {
    // ignore
  }
}

/**
 * Compresses a snapped camera photo or uploaded scan of handwritten questions
 * to a crisp, minimal-data (<120 KB) JPEG data URL for side-by-side preview & AI OCR.
 */
export function compressQuestionPhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const baseUrl = typeof reader.result === "string" ? reader.result : "";
      if (
        typeof document === "undefined" ||
        typeof Image === "undefined" ||
        (typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("jsdom"))
      ) {
        resolve(baseUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(baseUrl);
      img.onload = () => {
        try {
          const maxDim = 1280;
          let width = img.width || 800;
          let height = img.height || 1000;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(baseUrl);
            return;
          }
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.filter = "contrast(1.14) brightness(1.03)";
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.72);
          resolve(compressed || baseUrl);
        } catch {
          resolve(baseUrl);
        }
      };
      img.src = baseUrl;
    };
    reader.readAsDataURL(file);
  });
}

const ACADEMIC_SPELLING_FIXES: Array<[RegExp, string, string]> = [
  [/\bcorect\b/gi, "correct", "corect → correct"],
  [/\bnecesary\b/gi, "necessary", "necesary → necessary"],
  [/\bneccessary\b/gi, "necessary", "neccessary → necessary"],
  [/\bdefinately\b/gi, "definitely", "definately → definitely"],
  [/\bseperate\b/gi, "separate", "seperate → separate"],
  [/\boccured\b/gi, "occurred", "occured → occurred"],
  [/\bgoverment\b/gi, "government", "goverment → government"],
  [/\benviroment\b/gi, "environment", "enviroment → environment"],
  [/\baccomodate\b/gi, "accommodate", "accomodate → accommodate"],
  [/\bcalulate\b/gi, "calculate", "calulate → calculate"],
  [/\bcaculate\b/gi, "calculate", "caculate → calculate"],
  [/\bexplian\b/gi, "explain", "explian → explain"],
  [/\bdiffrence\b/gi, "difference", "diffrence → difference"],
  [/\bphotosyntesis\b/gi, "photosynthesis", "photosyntesis → photosynthesis"],
  [/\btemprature\b/gi, "temperature", "temprature → temperature"],
  [/\brecieve\b/gi, "receive", "recieve → receive"],
  [/\bbelive\b/gi, "believe", "belive → believe"],
  [/\bwich\b/gi, "which", "wich → which"],
  [/\bthier\b/gi, "their", "thier → their"],
  [/\bfollowings\b/gi, "following", "followings → following"],
  [/\binformations\b/gi, "information", "informations → information"],
  [/\bequipments\b/gi, "equipment", "equipments → equipment"],
  [/^chose\s+the\b/i, "Choose the", "Chose the → Choose the"],
  [/\bx\^2\b/g, "x²", "x^2 → x²"],
  [/\bx\^3\b/g, "x³", "x^3 → x³"],
  [/\bdeg\s*C\b/gi, "°C", "deg C → °C"],
];

function cleanSingleLine(
  input: string,
  fixesCollector: Set<string>,
  ensureEndingPunctuation: "question_or_statement" | "option"
): string {
  let text = input
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):-]\s*/i, "")
    .trim();

  if (!text) return "";

  for (const [pattern, replacement, label] of ACADEMIC_SPELLING_FIXES) {
    if (pattern.test(text)) {
      text = text.replace(pattern, (match) => {
        const isCap =
          match[0] !== undefined &&
          match[0] === match[0].toUpperCase() &&
          match[0] !== match[0].toLowerCase();
        if (isCap && replacement.length > 0) {
          return replacement[0]!.toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
      fixesCollector.add(label);
    }
  }

  // Capitalize first letter
  const firstChar = text[0];
  if (firstChar && firstChar !== firstChar.toUpperCase()) {
    text = firstChar.toUpperCase() + text.slice(1);
    fixesCollector.add("Capitalized opening letter");
  }

  if (ensureEndingPunctuation === "question_or_statement") {
    const endsWithPunct = /[?.!:;_]$/.test(text);
    if (!endsWithPunct) {
      const isDirectQuestion =
        /^(what|which|who|whom|whose|where|when|why|how|is|are|was|were|do|does|did|can|could|will|would|should)\b/i.test(
          text
        ) && !/_{3,}/.test(text);
      text = `${text}${isDirectQuestion ? "?" : "."}`;
      fixesCollector.add(
        isDirectQuestion
          ? "Added missing question mark (?)"
          : "Added closing full stop (.)"
      );
    }
  }

  return text;
}

export interface AIRefinementResult {
  objectives: ExamObjectiveQuestion[];
  theory: ExamTheoryQuestion[];
  fixesApplied: string[];
  warnings: string[];
}

/**
 * Refines an exam paper's Objective & Theory questions:
 * - Fixes spelling, capitalization, numbering duplicates, math notation, and punctuation
 * - Audits missing options, duplicate options, or missing mark allocations
 */
export function refineExamPaperMistakes(params: {
  objectives: ExamObjectiveQuestion[];
  theory: ExamTheoryQuestion[];
}): AIRefinementResult {
  const fixes = new Set<string>();
  const warnings: string[] = [];

  const refinedObjectives = params.objectives.map((q, idx) => {
    const stem = cleanSingleLine(
      q.questionText,
      fixes,
      "question_or_statement"
    );
    const optA = cleanSingleLine(q.optionA, fixes, "option");
    const optB = cleanSingleLine(q.optionB, fixes, "option");
    const optC = cleanSingleLine(q.optionC, fixes, "option");
    const optD = cleanSingleLine(q.optionD, fixes, "option");

    if (!stem) {
      warnings.push(`Objective Q${idx + 1} has an empty question stem.`);
    }
    const missingOpts = [
      !optA ? "A" : "",
      !optB ? "B" : "",
      !optC ? "C" : "",
      !optD ? "D" : "",
    ].filter(Boolean);
    if (missingOpts.length > 0) {
      warnings.push(
        `Objective Q${idx + 1} is missing Option ${missingOpts.join(", ")}.`
      );
    } else {
      const normalizedOpts = [optA, optB, optC, optD].map((o) =>
        o.toLowerCase()
      );
      if (new Set(normalizedOpts).size < 4) {
        warnings.push(`Objective Q${idx + 1} contains duplicate options.`);
      }
    }

    return {
      ...q,
      questionText: stem,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      marks: q.marks > 0 ? q.marks : 1,
    };
  });

  const refinedTheory = params.theory.map((t, idx) => {
    const stem = cleanSingleLine(
      t.questionText,
      fixes,
      "question_or_statement"
    );
    const guide = t.markingGuide.trim();
    if (!stem) {
      warnings.push(`Theory Q${idx + 1} has an empty question prompt.`);
    }
    if (!guide) {
      warnings.push(
        `Theory Q${idx + 1} has no marking guide / expected answer yet.`
      );
    }
    return {
      ...t,
      questionText: stem,
      markingGuide: guide,
      marks: t.marks > 0 ? t.marks : 10,
    };
  });

  return {
    objectives: refinedObjectives,
    theory: refinedTheory,
    fixesApplied: Array.from(fixes),
    warnings,
  };
}

/**
 * Parses raw typed, pasted, or OCR-transcribed exam text into structured
 * Section A (Objectives A–D + Correct Option) and Section B (Theory + Marks + Guide),
 * then runs the AI Mistake Refiner automatically!
 */
export function parseRawTextIntoExamQuestions(
  rawText: string
): AIRefinementResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const objectives: ExamObjectiveQuestion[] = [];
  const theory: ExamTheoryQuestion[] = [];

  let inTheorySection = false;
  let currentObj: ExamObjectiveQuestion | null = null;
  let currentTheory: ExamTheoryQuestion | null = null;

  const flushCurrent = () => {
    if (currentObj && currentObj.questionText.trim()) {
      objectives.push(currentObj);
    }
    currentObj = null;
    if (currentTheory && currentTheory.questionText.trim()) {
      theory.push(currentTheory);
    }
    currentTheory = null;
  };

  for (const line of lines) {
    // Detect Section headers
    if (
      /^(?:section\s*b|part\s*b|theory|essay|subjective)\b/i.test(line)
    ) {
      flushCurrent();
      inTheorySection = true;
      continue;
    }
    if (
      /^(?:section\s*a|part\s*a|objective|multiple\s*choice)\b/i.test(line)
    ) {
      flushCurrent();
      inTheorySection = false;
      continue;
    }

    if (inTheorySection) {
      const guideMatch = /^(?:ans(?:wer)?|guide|marking\s*guide|scheme)\s*[:=-]\s*(.+)$/i.exec(
        line
      );
      if (guideMatch && currentTheory) {
        currentTheory.markingGuide = guideMatch[1]?.trim() ?? "";
        continue;
      }

      flushCurrent();
      const marksMatch = /\((\d+)\s*(?:marks?|mks?|pts?)\)|\[(\d+)\s*(?:marks?|mks?|pts?)\]/i.exec(
        line
      );
      const detectedMarks = Number(marksMatch?.[1] ?? marksMatch?.[2] ?? 10);
      const cleanedPrompt = line
        .replace(
          /\(\d+\s*(?:marks?|mks?|pts?)\)|\[\d+\s*(?:marks?|mks?|pts?)\]/gi,
          ""
        )
        .trim();

      currentTheory = {
        id: `th-${Date.now()}-${theory.length + 1}-${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        questionText: cleanedPrompt,
        markingGuide: "",
        marks: detectedMarks > 0 ? detectedMarks : 10,
      };
      continue;
    }

    // Check if this line is a standalone Answer indicator for currentObj
    const ansOnly = /^(?:ans(?:wer)?|correct)\s*[:=-]?\s*\(?([A-Da-d])\)?$/i.exec(
      line
    );
    if (ansOnly && currentObj) {
      currentObj.correctOption = (ansOnly[1]!.toUpperCase() as
        | "A"
        | "B"
        | "C"
        | "D");
      continue;
    }

    // Check if this line has inline options e.g. "A) ... B) ... C) ... D) ..."
    const inlineOptsMatch =
      /(?:^|\s)\(?[Aa][).:-]\s*(.+?)\s+\(?[Bb][).:-]\s*(.+?)\s+\(?[Cc][).:-]\s*(.+?)\s+\(?[Dd][).:-]\s*(.+?)(?:\s*(?:\[|\()?(?:ans(?:wer)?\s*[:=-]?\s*)?([A-Da-d])(?:\]|\))?)?$/i.exec(
        line
      );

    if (inlineOptsMatch) {
      const prefixStem = line.slice(0, inlineOptsMatch.index).trim();
      if (prefixStem) {
        flushCurrent();
        currentObj = {
          id: `obj-${Date.now()}-${objectives.length + 1}-${Math.random()
            .toString(36)
            .slice(2, 5)}`,
          questionText: prefixStem,
          optionA: inlineOptsMatch[1]?.trim() ?? "",
          optionB: inlineOptsMatch[2]?.trim() ?? "",
          optionC: inlineOptsMatch[3]?.trim() ?? "",
          optionD: inlineOptsMatch[4]?.trim() ?? "",
          correctOption: ((inlineOptsMatch[5]?.toUpperCase() as
            | "A"
            | "B"
            | "C"
            | "D"
            | undefined) ?? "A"),
          marks: 2,
        };
        flushCurrent();
      } else if (currentObj) {
        currentObj.optionA = inlineOptsMatch[1]?.trim() ?? "";
        currentObj.optionB = inlineOptsMatch[2]?.trim() ?? "";
        currentObj.optionC = inlineOptsMatch[3]?.trim() ?? "";
        currentObj.optionD = inlineOptsMatch[4]?.trim() ?? "";
        if (inlineOptsMatch[5]) {
          currentObj.correctOption = inlineOptsMatch[5].toUpperCase() as
            | "A"
            | "B"
            | "C"
            | "D";
        }
        flushCurrent();
      }
      continue;
    }

    // Check single-line option: A) ... or B. ...
    const singleOpt = /^\(?([A-Da-d])[).:-]\s*(.+)$/.exec(line);
    if (singleOpt && currentObj) {
      const letter = singleOpt[1]!.toUpperCase() as "A" | "B" | "C" | "D";
      let optText = singleOpt[2]?.trim() ?? "";
      if (/\*|\(correct\)|\[correct\]/i.test(optText)) {
        currentObj.correctOption = letter;
        optText = optText
          .replace(/\*|\(correct\)|\[correct\]/gi, "")
          .trim();
      }
      if (letter === "A") currentObj.optionA = optText;
      if (letter === "B") currentObj.optionB = optText;
      if (letter === "C") currentObj.optionC = optText;
      if (letter === "D") currentObj.optionD = optText;
      continue;
    }

    // Otherwise start a new question! If it contains no options later and mentions marks, treat nicely
    flushCurrent();
    let stemLine = line;
    let inlineAns: "A" | "B" | "C" | "D" = "A";
    const trailingAns = /\s*(?:\[|\()(?:ans(?:wer)?\s*[:=-]?\s*)?([A-Da-d])(?:\]|\))\s*$/i.exec(
      stemLine
    );
    if (trailingAns) {
      inlineAns = trailingAns[1]!.toUpperCase() as "A" | "B" | "C" | "D";
      stemLine = stemLine.slice(0, trailingAns.index).trim();
    }

    currentObj = {
      id: `obj-${Date.now()}-${objectives.length + 1}-${Math.random()
        .toString(36)
        .slice(2, 5)}`,
      questionText: stemLine,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: inlineAns,
      marks: 2,
    };
  }

  flushCurrent();

  // Any "objective" that ended up with zero options at all is actually a Theory question!
  const finalObjectives: ExamObjectiveQuestion[] = [];
  for (const item of objectives) {
    const hasAnyOption = Boolean(
      item.optionA || item.optionB || item.optionC || item.optionD
    );
    if (hasAnyOption) {
      finalObjectives.push(item);
    } else {
      theory.push({
        id: `th-${item.id}`,
        questionText: item.questionText,
        markingGuide: "",
        marks: 10,
      });
    }
  }

  return refineExamPaperMistakes({
    objectives: finalObjectives,
    theory,
  });
}

/**
 * Uses a configured Cloud Vision AI Model (Gemini 2.0 Flash or OpenAI GPT-4o-mini)
 * to read a teacher's handwritten or printed exam question photo directly into structured text,
 * then refines and structures every question automatically.
 */
export async function transcribeQuestionPhotoWithVisionAI(
  imageDataUrl: string,
  config: VisionAIConfig
): Promise<{ ok: boolean; rawTranscription?: string; parsed?: AIRefinementResult; error?: string }> {
  const prompt = `Transcribe every exam question from this handwritten or printed teacher question sheet accurately.
Fix obvious spelling mistakes while preserving the teacher's exact academic meaning.
Format output strictly as plain text using:
SECTION A: OBJECTIVES
1. Question stem?
A) Option A
B) Option B
C) Option C
D) Option D
Ans: B

SECTION B: THEORY
1. Theory question prompt (10 marks)
Guide: Brief marking points if visible`;

  try {
    const commaIdx = imageDataUrl.indexOf(",");
    const base64Data = commaIdx >= 0 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
    const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64/.exec(imageDataUrl);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";

    let rawText = "";

    if (config.provider === "gemini") {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          config.apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } },
                ],
              },
            ],
          }),
        }
      );
      if (!resp.ok) {
        return {
          ok: false,
          error: `Gemini Vision returned HTTP ${resp.status}. Check your API key or internet connection.`,
        };
      }
      const data = (await resp.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      rawText =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("\n") ?? "";
    } else {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });
      if (!resp.ok) {
        return {
          ok: false,
          error: `OpenAI Vision returned HTTP ${resp.status}. Check your API key or internet connection.`,
        };
      }
      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      rawText = data.choices?.[0]?.message?.content ?? "";
    }

    if (!rawText.trim()) {
      return {
        ok: false,
        error: "No readable question text was detected in the image.",
      };
    }

    const parsed = parseRawTextIntoExamQuestions(rawText);
    return {
      ok: true,
      rawTranscription: rawText.trim(),
      parsed,
    };
  } catch {
    return {
      ok: false,
      error:
        "Could not reach the Vision AI service right now. You can transcribe/type beside your snapped photo below and click 'AI Structure & Fix Mistakes' offline.",
    };
  }
}
