import {
  BookOpen,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Printer,
  ReceiptText,
  Users,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { getSurahByNumber } from "@/data/quranSurahs";
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
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  computeClassBroadsheet,
  computeQuranProgressPercent,
  computeStudentAttendanceSummary,
  computeStudentInvoices,
  evaluateGrade,
  formatCurrency,
  formatOrdinal,
  getActiveProgrammes,
  getGradingComponents,
  getStudentClassName,
} from "@/services/calculations";

export function ParentPortalView() {
  const {
    db,
    submitParentBankTransfer,
    openPrintPreview,
  } = useSchoolOS();
  const {
    settings,
    students,
    classes,
    subjects,
    scores,
    attendance,
    quranRecords,
    feeItems,
    payments,
  } = db;
  const cur = settings.currencySymbol;

  // Data-layer RBAC already restricts `students` strictly to this parent's linked children
  const myChildren = students;
  const [selectedChildId, setSelectedChildId] = useState<string>(
    myChildren[0]?.id ?? ""
  );
  const activeChild =
    myChildren.find((c) => c.id === selectedChildId) ?? myChildren[0];

  const [termFilter, setTermFilter] = useState(settings.currentTerm);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payChannel, setPayChannel] = useState<
    "Paystack" | "Flutterwave" | "Bank Transfer"
  >("Bank Transfer");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");

  const activeProgs = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  if (!activeChild) {
    return (
      <div className="ndh-card mx-auto max-w-xl p-8 text-center">
        <h2 className="text-lg font-bold text-[#0F172A]">
          No Linked Children Found
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Contact the school secretary to link your phone number to your child's record.
        </p>
      </div>
    );
  }

  const attSummary = computeStudentAttendanceSummary({
    attendance,
    studentId: activeChild.id,
    session: settings.currentSession,
    term: termFilter,
    configuredDaysOpened: settings.daysSchoolOpened,
  });

  const quranRec = settings.enableQuranModule
    ? quranRecords.find((q) => q.studentId === activeChild.id)
    : undefined;
  const surah = quranRec ? getSurahByNumber(quranRec.currentSurahNumber) : null;
  const quranPct = computeQuranProgressPercent(quranRec);

  const childInvoices = computeStudentInvoices({
    student: activeChild,
    allStudents: myChildren,
    feeItems,
    payments,
    settings,
    session: settings.currentSession,
    term: termFilter,
  });

  const totalNet = childInvoices.reduce((s, i) => s + i.netPayable, 0);
  const totalPaid = childInvoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalPending = childInvoices.reduce((s, i) => s + i.pendingAmount, 0);
  const totalBalance = childInvoices.reduce((s, i) => s + i.balance, 0);

  const childReceipts = payments.filter(
    (p) => p.studentId === activeChild.id && p.term === termFilter
  );

  // Build subject score summaries per active programme
  const programmeResults = activeProgs
    .map((prog) => {
      const classId = activeChild.programmeClasses[prog.id];
      if (!classId) return null;
      const cls = classes.find((c) => c.id === classId);
      const comps = getGradingComponents(settings, prog.id, classId);
      const maxPerSub = comps.reduce((s, c) => s + c.maxScore, 0) || 100;
      const progSubjects = subjects.filter((s) => s.programmeId === prog.id);
      const broadsheet = computeClassBroadsheet({
        students: myChildren,
        subjects,
        scores,
        settings,
        classId,
        programmeId: prog.id,
        session: settings.currentSession,
        term: termFilter,
      });
      const standing = broadsheet.find((b) => b.student.id === activeChild.id);

      const rows = progSubjects.map((sub) => {
        const rec = scores.find(
          (r) =>
            r.studentId === activeChild.id &&
            r.subjectId === sub.id &&
            r.session === settings.currentSession &&
            r.term === termFilter
        );
        const vals = comps.map((c) => Number(rec?.scores[c.id] ?? 0));
        const total = vals.reduce((a, b) => a + b, 0);
        const pct = maxPerSub > 0 ? (total / maxPerSub) * 100 : 0;
        const { grade, remark } = evaluateGrade(pct, settings.grading.gradeBands);
        return {
          subject: sub,
          vals,
          total,
          hasScore: Boolean(rec),
          grade: rec ? grade : "—",
          remark: rec ? remark : "Pending",
        };
      });

      return {
        programme: prog,
        className: cls?.name ?? settings.labels.classSingular,
        comps,
        rows,
        average: standing?.averagePercentage ?? 0,
        position: standing?.position ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const handleOpenPayModal = () => {
    setTransferAmount(String(totalBalance > 0 ? totalBalance : 25000));
    setTransferRef("");
    setPayModalOpen(true);
  };

  const handleSubmitTransferOrGateway = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount in Naira.");
      return;
    }

    if (payChannel === "Bank Transfer") {
      if (!transferRef.trim()) {
        toast.error("Enter your bank transfer reference or teller number.");
        return;
      }
      const created = submitParentBankTransfer({
        studentId: activeChild.id,
        session: settings.currentSession,
        term: termFilter,
        invoiceProgrammeId: childInvoices[0]?.invoiceProgrammeId ?? "combined",
        amount: amt,
        reference: transferRef.trim(),
      });
      if (created) {
        toast.success(
          "Bank transfer reference submitted! The school bursar will confirm and issue your official receipt."
        );
        setPayModalOpen(false);
      }
      return;
    }

    toast.info(
      `${payChannel} checkout ready to connect with your school's live ${payChannel} secret key. Use Bank Transfer Reference to test full bursar confirmation now.`
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* Family Header & Linked Siblings with Parent Cover Banner */}
      <div className="ndh-card overflow-hidden">
        <div className="grid grid-cols-1 items-center lg:grid-cols-12">
          <div className="space-y-4 p-6 sm:p-7 lg:col-span-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900">
                  <Users className="h-3.5 w-3.5" />
                  Parent Phone View • {myChildren.length} Linked{" "}
                  {myChildren.length === 1 ? "Child" : "Children"}
                </div>
                <h1 className="mt-2 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
                  Welcome, {activeChild.guardianName}
                </h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Phone: {activeChild.parentPhone} • {settings.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Select term"
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs font-semibold text-slate-800"
                >
              {settings.terms.map((t) => (
                <option key={t} value={t}>
                  {settings.currentSession} • {t}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() =>
                openPrintPreview({
                  type: "report_card",
                  studentId: activeChild.id,
                  session: settings.currentSession,
                  term: termFilter,
                  layout: settings.reportCardDefaultLayout,
                })
              }
              className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report Card
            </Button>
          </div>
        </div>

        {/* Linked Siblings Switcher */}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {myChildren.map((child) => {
            const active = child.id === activeChild.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left text-xs transition ${
                  active
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : "border-slate-200 bg-[#F8FAFC] text-[#0F172A] hover:bg-white"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-[#22D3EE] text-[#0F172A]"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {child.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-bold">{child.fullName}</div>
                  <div
                    className={`text-[11px] ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {getStudentClassName(child, classes, settings)}
                  </div>
                </div>
              </button>
            );
          })}
            </div>
          </div>

          <div className="hidden h-full min-h-[175px] overflow-hidden border-l border-slate-200 lg:col-span-4 lg:block">
            <img
              src="/images/ndh-cover-parents-v3.jpg"
              alt="Nigerian parents viewing child report card on phone"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 3 Balanced Equal-Height Summary Cards on Mobile/Desktop */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Attendance ({termFilter})</span>
            <CalendarCheck2 className="h-4 w-4 text-[#1E3A8A]" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-[#0F172A]">
            {attSummary.ratePercent}%
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Present {attSummary.daysPresent} of {attSummary.daysOpened} days •
            Absent: {attSummary.daysAbsent}
          </p>
        </div>

        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Term Fee Balance</span>
            <ReceiptText className="h-4 w-4 text-[#1E3A8A]" />
          </div>
          <div
            className={`mt-3 text-2xl font-extrabold ${
              totalBalance > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {formatCurrency(totalBalance, cur)}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Paid {formatCurrency(totalPaid, cur)} of{" "}
            {formatCurrency(totalNet, cur)}
            {totalPending > 0
              ? ` • ${formatCurrency(totalPending, cur)} awaiting confirmation`
              : ""}
          </p>
        </div>

        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Pay School Fees</span>
              <CreditCard className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              Pay online with Paystack / Flutterwave or send bank transfer reference.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenPayModal}
            className="mt-3 w-full bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
          >
            Pay Fees / Submit Transfer
          </Button>
        </div>
      </div>

      {/* Academic Results Table(s) */}
      {programmeResults.map((rep) => (
        <div key={rep.programme.id} className="ndh-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#1E3A8A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A]">
                {settings.multiProgrammeEnabled
                  ? `${rep.programme.name} (${rep.className})`
                  : `${rep.className} — ${termFilter} Results`}
              </h2>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Average: <strong>{rep.average}%</strong>
              {rep.position > 0 && (
                <>
                  {" "}
                  • Position:{" "}
                  <strong className="text-[#1E3A8A]">
                    {formatOrdinal(rep.position)}
                  </strong>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs font-bold text-slate-600 uppercase">
                  <th className="px-4 py-2.5">Subject</th>
                  {rep.comps.map((c) => (
                    <th key={c.id} className="px-3 py-2.5 text-center">
                      {c.label} ({c.maxScore})
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center">Total</th>
                  <th className="px-3 py-2.5 text-center">Grade</th>
                  <th className="px-4 py-2.5">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rep.rows.map((r) => (
                  <tr key={r.subject.id}>
                    <td className="px-4 py-2.5 font-semibold text-[#0F172A]">
                      {r.subject.name}
                    </td>
                    {r.vals.map((v, i) => (
                      <td
                        key={i}
                        className="px-3 py-2.5 text-center text-slate-700"
                      >
                        {r.hasScore ? v : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-bold text-[#0F172A]">
                      {r.hasScore ? r.total : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#1E3A8A]">
                      {r.grade}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {r.remark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Optional Qur'an Progress Card — ONLY rendered when enabled in Settings */}
      {settings.enableQuranModule && quranRec && surah && (
        <div className="ndh-card p-4 sm:p-5">
          <h3 className="text-sm font-extrabold text-[#0F172A]">
            Optional Qur'an Progress
          </h3>
          <p className="mt-1 text-xs text-slate-700">
            Current Surah:{" "}
            <strong>
              {surah.number}. {surah.transliteration} ({surah.arabicName})
            </strong>{" "}
            • Ayah {quranRec.ayahFrom}–{quranRec.ayahTo} •{" "}
            <strong>{quranPct}%</strong> ({quranRec.revisionStatus})
          </p>
        </div>
      )}

      {/* Fee Receipts List */}
      <div className="ndh-card p-4 sm:p-5">
        <h3 className="text-sm font-extrabold text-[#0F172A]">
          Fee Payments & Receipts ({termFilter})
        </h3>
        <div className="mt-3 space-y-2">
          {childReceipts.length === 0 ? (
            <p className="text-xs text-slate-500">
              No fee payments recorded yet for {termFilter}.
            </p>
          ) : (
            childReceipts.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs"
              >
                <div>
                  <div className="font-bold text-[#0F172A]">
                    {formatCurrency(p.amount, cur)} • {p.method}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Receipt {p.receiptNumber} • {p.date} •{" "}
                    <span
                      className={
                        p.confirmationStatus === "Pending Confirmation"
                          ? "font-bold text-amber-800"
                          : "font-bold text-emerald-700"
                      }
                    >
                      {p.confirmationStatus}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openPrintPreview({ type: "receipt", paymentId: p.id })
                  }
                  className="border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Receipt
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pay Fees / Submit Manual Bank Transfer Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              Pay School Fees — {activeChild.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Choose Paystack, Flutterwave or submit your manual bank transfer reference for bursar confirmation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransferOrGateway} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(["Bank Transfer", "Paystack", "Flutterwave"] as const).map(
                (ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setPayChannel(ch)}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-bold transition ${
                      payChannel === ch
                        ? "border-[#0F172A] bg-[#0F172A] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {ch}
                  </button>
                )
              )}
            </div>

            {payChannel === "Bank Transfer" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                  <Building2 className="h-3.5 w-3.5 text-[#1E3A8A]" />
                  School Bank Account Details
                </div>
                <div>
                  Bank: <strong>{settings.bankAccountDetails.bankName}</strong>
                </div>
                <div>
                  Account Number:{" "}
                  <strong className="font-mono">
                    {settings.bankAccountDetails.accountNumber}
                  </strong>
                </div>
                <div>
                  Account Name:{" "}
                  <strong>{settings.bankAccountDetails.accountName}</strong>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Amount ({cur})
              </Label>
              <Input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="border-slate-200 bg-[#F8FAFC]"
              />
            </div>

            {payChannel === "Bank Transfer" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Bank Transfer Session ID / Teller Reference
                </Label>
                <Input
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="e.g. NIP/GTB/20261024/88392"
                  className="border-slate-200 bg-[#F8FAFC]"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {payChannel === "Bank Transfer"
                ? "Submit Transfer for Bursar Confirmation"
                : `Continue with ${payChannel}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
