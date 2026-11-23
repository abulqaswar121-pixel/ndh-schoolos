export interface ScanColumn { id: string; label: string; max: number }
export interface ScanStudent { id: string; name: string }
export interface ScannedRow { studentId: string; scores: Record<string, number | null> }

/** Keep AI marks inside each column's allowed range; drop unknown students. */
export function cleanScannedRows(
  raw: unknown,
  students: ScanStudent[],
  columns: ScanColumn[]
): ScannedRow[] {
  const ids = new Set(students.map((s) => s.id));
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: ScannedRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as { studentId?: unknown; scores?: unknown };
    const id = typeof r.studentId === "string" ? r.studentId : "";
    if (!ids.has(id) || seen.has(id)) continue;
    seen.add(id);
    const src = (r.scores && typeof r.scores === "object" ? r.scores : {}) as Record<string, unknown>;
    const scores: Record<string, number | null> = {};
    for (const c of columns) {
      const v = src[c.id];
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      scores[c.id] = Number.isFinite(n) ? Math.min(c.max, Math.max(0, n)) : null;
    }
    out.push({ studentId: id, scores });
  }
  return out;
}
