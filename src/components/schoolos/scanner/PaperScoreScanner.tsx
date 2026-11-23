import { Camera, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compressQuestionPhotoToDataUrl } from "@/services/examAiService";
import { readPaperSheet } from "@/services/paperScanner.functions";
import type { ScanColumn, ScanStudent } from "@/services/paperScanner";

interface Props {
  students: ScanStudent[];
  columns: ScanColumn[];
  onApprove: (rows: { studentId: string; columnId: string; value: number }[]) => void;
  disabled?: boolean;
}

export function PaperScoreScanner({ students, columns, onApprove, disabled }: Props) {
  const read = useServerFn(readPaperSheet);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Record<string, string>>>({});

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await compressQuestionPhotoToDataUrl(file);
      setPhoto(url);
      const res = await read({ data: { imageDataUrl: url, students, columns, kind: "scores" } });
      if (res.error) { toast.error(res.error); return; }
      const next: Record<string, Record<string, string>> = {};
      for (const r of res.rows) {
        next[r.studentId] = Object.fromEntries(columns.map((c) => [c.id, r.scores[c.id] == null ? "" : String(r.scores[c.id])]));
      }
      setRows(next);
      toast.success(`Read ${res.rows.length} of ${students.length} learners. Check the marks, then save.`);
    } catch {
      toast.error("Could not read this photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    const out: { studentId: string; columnId: string; value: number }[] = [];
    for (const [sid, cells] of Object.entries(rows)) {
      for (const c of columns) {
        const raw = cells[c.id];
        if (raw === undefined || raw.trim() === "") continue;
        const n = Number(raw);
        if (Number.isFinite(n)) out.push({ studentId: sid, columnId: c.id, value: Math.min(c.max, Math.max(0, n)) });
      }
    }
    if (!out.length) { toast.error("No marks to save."); return; }
    onApprove(out);
    toast.success(`Saved ${out.length} marks.`);
    setOpen(false); setRows({}); setPhoto(null);
  }

  const found = students.filter((s) => rows[s.id]);
  return (
    <>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)} className="h-8 text-xs font-bold">
        <Camera className="mr-1.5 h-3.5 w-3.5" /> Scan paper sheet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan paper score sheet</DialogTitle>
            <DialogDescription>Take a clear photo of the handwritten sheet. Check every mark before saving.</DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm font-semibold">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {busy ? "Reading the sheet…" : photo ? "Take another photo" : "Take or choose photo"}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
              onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {found.length > 0 && (
            <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
              {photo && <img src={photo} alt="Scanned sheet" className="w-full rounded-lg border border-border" />}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left"><th className="p-1.5">Learner</th>
                    {columns.map((c) => <th key={c.id} className="p-1.5 text-center">{c.label} (/{c.max})</th>)}</tr></thead>
                  <tbody>
                    {found.map((s) => (
                      <tr key={s.id} className="border-b border-border">
                        <td className="p-1.5 font-semibold">{s.name}</td>
                        {columns.map((c) => (
                          <td key={c.id} className="p-1">
                            <input aria-label={`${s.name} ${c.label}`} inputMode="decimal"
                              value={rows[s.id]?.[c.id] ?? ""}
                              onChange={(e) => setRows((p) => ({ ...p, [s.id]: { ...p[s.id], [c.id]: e.target.value } }))}
                              className={`h-8 w-14 rounded border text-center ${rows[s.id]?.[c.id] ? "border-border" : "border-destructive bg-destructive/10"}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">Red boxes could not be read — fill them in or leave empty.</p>
                <Button className="mt-3 w-full" onClick={approve}>Approve &amp; save marks</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
