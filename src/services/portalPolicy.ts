import { getAuthorizedSnapshot, evaluateScoreWritePermission } from "./accessControl";
import type { ActivePortalSession, SchoolDatabaseSnapshot } from "@/types/school";

export function mergePortalChanges(raw: SchoolDatabaseSnapshot, next: SchoolDatabaseSnapshot, portal: ActivePortalSession): SchoolDatabaseSnapshot {
  const scope = getAuthorizedSnapshot(raw, portal);
  const allowed: Array<keyof SchoolDatabaseSnapshot> = portal.role === "bursar"
    ? ["students", "payments", "payroll", "parentNotices", "feeItems"]
    : portal.role === "secretary" ? ["students", "attendance", "parentNotices", "examPapers"]
    : portal.role === "parent" ? ["payments"]
    : ["scores", "attendance", "affective", "quranRecords", "examPapers", "pendingScoreEdits", "termLocks"];
  const merged = { ...raw };
  for (const key of Object.keys(scope) as Array<keyof SchoolDatabaseSnapshot>) {
    // Client audit text is never trusted; keep the server's existing audit trail.
    if (key === "auditLogs") continue;
    if (!allowed.includes(key)) {
      if (JSON.stringify(next[key]) !== JSON.stringify(scope[key])) throw new Error("Your account cannot change these records.");
      continue;
    }
    const before = scope[key];
    const after = next[key];
    if (!Array.isArray(before) || !Array.isArray(after)) continue;
    const visibleIds = new Set((before as Array<{id: string}>).map((r) => r.id));
    const all = raw[key] as Array<{id: string}>;
    const hiddenIds = new Set(all.filter((r) => !visibleIds.has(r.id)).map((r) => r.id));
    if ((after as Array<{id: string}>).some((r) => hiddenIds.has(r.id))) throw new Error("Record outside your assigned access.");
    // Read-only portals do not mutate academic data. Every changed teaching record must remain in scope.
    if (["scores", "attendance", "affective", "quranRecords", "pendingScoreEdits"].includes(key)) {
      for (const record of after as Array<{id: string; studentId?: string; classId?: string; subjectId?: string}>) {
        if (record.studentId && !scope.students.some((s) => s.id === record.studentId)) throw new Error("Student outside your assigned classes.");
        if (record.classId && !scope.classes.some((c) => c.id === record.classId)) throw new Error("Class outside your assignment.");
        if (record.subjectId && !scope.subjects.some((s) => s.id === record.subjectId)) throw new Error("Subject outside your assignment.");
      }
    }
    if (key === "termLocks" && !["exam_officer"].includes(portal.role) && !portal.isExamOfficer) {
      if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error("Only exam officers can change result locks.");
    }
    if (key === "scores" && !(portal.role === "exam_officer" || portal.isExamOfficer)) {
      for (const r of after as SchoolDatabaseSnapshot["scores"]) {
        const original = raw.scores.find((old) => old.id === r.id);
        if (JSON.stringify(original) !== JSON.stringify(r)) {
          const permission = evaluateScoreWritePermission(raw, portal, r);
          if (!permission.allowed || permission.mode !== "direct") throw new Error("Score change outside your teaching permission.");
        }
        const lock = raw.termLocks.find((t) => t.session === r.session && t.term === r.term);
        if ((lock?.isLocked || lock?.isPublished) && JSON.stringify(original) !== JSON.stringify(r)) throw new Error("Published or locked scores require approval.");
      }
      for (const old of raw.scores.filter((r) => visibleIds.has(r.id))) {
        const lock = raw.termLocks.find((t) => t.session === old.session && t.term === old.term);
        if ((lock?.isLocked || lock?.isPublished) && !(after as SchoolDatabaseSnapshot["scores"]).some((r) => r.id === old.id)) throw new Error("Locked scores cannot be removed.");
      }
    }
    if (key === "pendingScoreEdits" && !(portal.role === "exam_officer" || portal.isExamOfficer)) {
      for (const request of after as SchoolDatabaseSnapshot["pendingScoreEdits"]) {
        const old = raw.pendingScoreEdits.find((r) => r.id === request.id);
        if (JSON.stringify(old) === JSON.stringify(request)) continue;
        if (old || request.status !== "pending") throw new Error("Only officers can approve score changes.");
      }
    }
    if (key === "quranRecords" && !raw.settings.enableQuranModule && after.length) throw new Error("Qur’an tools are disabled.");
    if (key === "examPapers" && !(portal.role === "exam_officer" || portal.isExamOfficer)) {
      if (portal.role === "secretary" && JSON.stringify(after) !== JSON.stringify(before)) throw new Error("Secretary exam access is read-only.");
      for (const paper of after as NonNullable<SchoolDatabaseSnapshot["examPapers"]>) {
        const old = raw.examPapers?.find((r) => r.id === paper.id);
        if (JSON.stringify(old) === JSON.stringify(paper)) continue;
        if (old && old.submittedByStaffId !== portal.staffId) throw new Error("Only your own exam papers can be changed.");
        if (paper.submittedByStaffId !== portal.staffId || !["draft","submitted"].includes(paper.status) || paper.classIds.some((id) => !scope.classes.some((c) => c.id === id)) || !scope.subjects.some((s) => s.id === paper.subjectId)) throw new Error("Exam paper outside your assignment.");
      }
      for (const old of raw.examPapers || []) if (visibleIds.has(old.id) && !(after as NonNullable<SchoolDatabaseSnapshot["examPapers"]>).some((p) => p.id === old.id) && old.submittedByStaffId !== portal.staffId) throw new Error("Only your own papers can be removed.");
    }
    if (key === "payments" && portal.role === "parent") {
      for (const payment of after as SchoolDatabaseSnapshot["payments"]) {
        const original = raw.payments.find((r) => r.id === payment.id);
        if (original && JSON.stringify(original) !== JSON.stringify(payment)) throw new Error("Existing payments cannot be changed.");
        if (!original && (!portal.parentStudentIds?.includes(payment.studentId) || payment.method !== "Bank Transfer" || payment.confirmationStatus !== "Pending Confirmation")) throw new Error("Only pending transfers for your children are allowed.");
      }
      if (before.some((r) => !(after as Array<{id:string}>).some((a) => a.id === (r as {id:string}).id))) throw new Error("Payments cannot be removed.");
    }
    Object.assign(merged, { [key]: [...all.filter((r) => !visibleIds.has(r.id)), ...after] });
  }
  return merged;
}