import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanScannedRows, type ScanColumn, type ScanStudent } from "./paperScanner";

interface ScanInput {
  imageDataUrl: string;
  students: ScanStudent[];
  columns: ScanColumn[];
  kind: "scores" | "attendance";
}

export const readPaperSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ScanInput) => {
    if (!input.imageDataUrl?.startsWith("data:image/")) throw new Error("Please choose a photo.");
    if (input.imageDataUrl.length > 8_000_000) throw new Error("Photo is too large.");
    if (!input.students?.length || input.students.length > 400) throw new Error("No learners to match.");
    if (!input.columns?.length || input.columns.length > 12) throw new Error("No columns to read.");
    return input;
  })
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const roster = data.students.map((s) => `${s.id} | ${s.name}`).join("\n");
    const cols = data.columns.map((c) => `${c.id} = "${c.label}" (0 to ${c.max})`).join("\n");
    const task =
      data.kind === "attendance"
        ? "This is a handwritten attendance sheet. For each column, use 1 for present (tick, P, ✓) and 0 for absent (A, X, blank)."
        : "This is a handwritten score sheet / broadsheet. Read each learner's marks.";
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${task}\nMatch every written name to the closest learner in this list (names may be misspelt or shortened). Only use ids from the list; skip names you cannot match.\nLearners (id | name):\n${roster}\nColumns to read:\n${cols}\nIf a mark is unclear or empty, use null. Return JSON {"rows":[{"studentId":"...","scores":{"<columnId>":number|null}}]}.`,
              },
              { type: "input_image", image_url: data.imageDataUrl, detail: "high" },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      });
      let text = "";
      for (const item of (res as { output?: unknown[] }).output ?? []) {
        const content = (item as { content?: { type?: string; text?: string }[] }).content ?? [];
        for (const c of content) if (c.type === "output_text" && c.text) text += c.text;
      }
      const parsed = JSON.parse(text || "{}") as { rows?: unknown };
      return { rows: cleanScannedRows(parsed.rows, data.students, data.columns), error: null as string | null };
    } catch (err) {
      console.error("readPaperSheet failed", err);
      if (err instanceof GatewayError && err.httpStatus === 402)
        return { rows: [], error: "AI credits have run out. Please top up and try again." };
      if (err instanceof GatewayError && err.httpStatus === 429)
        return { rows: [], error: "Too many scans right now. Please wait a minute and try again." };
      return { rows: [], error: "Could not read this photo. Try a clearer, well-lit photo." };
    }
  });
