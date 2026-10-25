import {
  CheckCircle2,
  Coins,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { TableToolbar } from "../TableToolbar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  computeStudentInvoices,
  exportRowsToCsv,
  formatCurrency,
  getActiveProgrammes,
  getProgrammeName,
  getStudentClassName,
  isStudentInProgramme,
} from "@/services/calculations";
import type {
  FeeCategory,
  FeePayment,
  FeeScheduleItem,
  PaymentMethod,
  ProgrammeId,
  Student,
} from "@/types/school";

const FEE_CATEGORIES: FeeCategory[] = [
  "Tuition",
  "Books",
  "Uniform",
  "PTA",
  "Feeding",
  "Bus",
  "Boarding",
  "Extra Lessons",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "Bank Transfer",
  "Paystack",
  "Flutterwave",
  "POS",
  "Cash",
];

export function FeesModule() {
  const {
    db,
    portal,
    recordFeePayment,
    confirmBankTransfer,
    upsertFeeItem,
    deleteFeeItem,
    updateSettings,
    openPrintPreview,
  } = useSchoolOS();
  const { settings, students, classes, feeItems, payments } = db;
  const cur = settings.currencySymbol;

  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  // Filters
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeId | "all">(
    "all"
  );
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState(settings.currentTerm);
  const [statusFilter, setStatusFilter] = useState<"all" | "debtors" | "paid">(
    "all"
  );

  // Payment Modal State
  const [payStudent, setPayStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Bank Transfer");
  const [payStatus, setPayStatus] = useState<
    "Confirmed" | "Pending Confirmation"
  >("Confirmed");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payProgrammeId, setPayProgrammeId] = useState<
    "combined" | ProgrammeId
  >("combined");

  // Fee Schedule Form State
  const [newCategory, setNewCategory] = useState<FeeCategory>("Tuition");
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newProgId, setNewProgId] = useState<ProgrammeId>(
    activeProgrammes[0]?.id ?? "prog-main"
  );

  const invoiceRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (s.status !== "Active") return false;
        if (
          programmeFilter !== "all" &&
          !isStudentInProgramme(s, programmeFilter)
        ) {
          return false;
        }
        if (
          classFilter !== "all" &&
          !Object.values(s.programmeClasses).includes(classFilter)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admissionId.toLowerCase().includes(q) ||
          s.guardianName.toLowerCase().includes(q) ||
          s.parentPhone.toLowerCase().includes(q)
        );
      })
      .flatMap((stu) =>
        computeStudentInvoices({
          student: stu,
          allStudents: students,
          feeItems,
          payments,
          settings,
          session: settings.currentSession,
          term: termFilter,
        })
      )
      .filter((inv) => {
        if (statusFilter === "debtors") return inv.balance > 0;
        if (statusFilter === "paid") return inv.balance <= 0;
        return true;
      });
  }, [
    students,
    programmeFilter,
    classFilter,
    search,
    feeItems,
    payments,
    settings,
    termFilter,
    statusFilter,
  ]);

  const pendingBankTransfers = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.term === termFilter &&
          p.confirmationStatus === "Pending Confirmation"
      ),
    [payments, termFilter]
  );

  const kpis = useMemo(() => {
    const netTotal = invoiceRows.reduce((s, r) => s + r.netPayable, 0);
    const paidTotal = invoiceRows.reduce((s, r) => s + r.amountPaid, 0);
    const balTotal = invoiceRows.reduce((s, r) => s + r.balance, 0);
    const debtorsCount = invoiceRows.filter((r) => r.balance > 0).length;
    return { netTotal, paidTotal, balTotal, debtorsCount };
  }, [invoiceRows]);

  const handleOpenPayModal = (
    student: Student,
    suggestedBalance: number,
    invProgId: "combined" | ProgrammeId
  ) => {
    setPayStudent(student);
    setPayAmount(String(suggestedBalance > 0 ? suggestedBalance : 25000));
    setPayMethod("Bank Transfer");
    setPayStatus("Confirmed");
    setPayRef("");
    setPayNote("");
    setPayProgrammeId(invProgId);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudent) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    const created: FeePayment | null = recordFeePayment({
      studentId: payStudent.id,
      session: settings.currentSession,
      term: termFilter,
      invoiceProgrammeId: payProgrammeId,
      amount: amt,
      method: payMethod,
      confirmationStatus: payStatus,
      reference: payRef.trim() || undefined,
      note: payNote.trim() || undefined,
    });
    if (created) {
      toast.success(
        `Saved ${formatCurrency(amt, cur)} (${created.receiptNumber})`
      );
      setPayStudent(null);
      if (created.confirmationStatus === "Confirmed") {
        openPrintPreview({ type: "receipt", paymentId: created.id }, false);
      }
    }
  };

  const handleAddFeeItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(newAmount);
    if (!newLabel.trim() || !amt || amt <= 0) {
      toast.error("Enter fee description and amount.");
      return;
    }
    const item: FeeScheduleItem = {
      id: `fee-${Date.now()}`,
      category: newCategory,
      label: newLabel.trim(),
      programmeId: newProgId,
      applicableClassIds: [],
      amount: amt,
      mandatory: true,
    };
    upsertFeeItem(item);
    setNewLabel("");
    setNewAmount("");
    toast.success("Added fee schedule item.");
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `${settings.code}_fees_${termFilter}`,
      [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Guardian Phone",
        "Net Payable",
        "Confirmed Paid",
        "Balance Owing",
        "Status",
      ],
      invoiceRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        getStudentClassName(r.student, classes, settings),
        r.student.parentPhone,
        r.netPayable,
        r.amountPaid,
        r.balance,
        r.status,
      ])
    );
  };

  const handlePrintList = () => {
    openPrintPreview({
      type: "table",
      title:
        statusFilter === "debtors"
          ? `${settings.name} — ${termFilter} Debtors List`
          : `${settings.name} — ${termFilter} Fee Register`,
      subtitle: `${invoiceRows.length} student fee records`,
      headers: [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Parent Phone",
        "Net Bill",
        "Paid",
        "Balance",
      ],
      rows: invoiceRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        getStudentClassName(r.student, classes, settings),
        r.student.parentPhone,
        formatCurrency(r.netPayable, cur),
        formatCurrency(r.amountPaid, cur),
        formatCurrency(r.balance, cur),
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Fees, Receipts & Debtors
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Track school fees, confirm manual bank transfers, accept Paystack / Flutterwave payments and print official receipts.
          </p>
        </div>

        {portal.role === "admin" && settings.multiProgrammeEnabled && (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() =>
                updateSettings(
                  (prev) => ({ ...prev, billingMode: "combined" }),
                  "Set Multi-Programme Billing to Combined"
                )
              }
              className={`rounded-lg px-2.5 py-1 font-bold ${
                settings.billingMode === "combined"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600"
              }`}
            >
              Combined Bill
            </button>
            <button
              type="button"
              onClick={() =>
                updateSettings(
                  (prev) => ({ ...prev, billingMode: "separate" }),
                  "Set Multi-Programme Billing to Separate"
                )
              }
              className={`rounded-lg px-2.5 py-1 font-bold ${
                settings.billingMode === "separate"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600"
              }`}
            >
              Separate per Programme
            </button>
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Expected ({termFilter})
          </div>
          <div className="mt-2.5 text-2xl font-extrabold text-[#0F172A]">
            {formatCurrency(kpis.netTotal, cur)}
          </div>
        </div>
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Confirmed Collected
          </div>
          <div className="mt-2.5 text-2xl font-extrabold text-emerald-800">
            {formatCurrency(kpis.paidTotal, cur)}
          </div>
        </div>
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Balance Owing
          </div>
          <div className="mt-2.5 text-2xl font-extrabold text-red-700">
            {formatCurrency(kpis.balTotal, cur)}
          </div>
        </div>
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Students Owing
          </div>
          <div className="mt-2.5 text-2xl font-extrabold text-[#0F172A]">
            {kpis.debtorsCount}
          </div>
        </div>
      </div>

      {/* Pending Manual Bank Transfer Confirmations Banner */}
      {pendingBankTransfers.length > 0 && (
        <div className="ndh-card space-y-4 border-amber-300 bg-amber-50/70 p-6">
          <div>
            <h2 className="text-sm font-extrabold text-amber-950">
              Manual Bank Transfers Awaiting Confirmation ({pendingBankTransfers.length})
            </h2>
            <p className="text-xs text-amber-900">
              Check your school bank alert ({settings.bankAccountDetails.bankName} •{" "}
              {settings.bankAccountDetails.accountNumber}) and click Confirm to issue the receipt.
            </p>
          </div>
          <div className="divide-y divide-amber-200 rounded-xl border border-amber-200 bg-white">
            {pendingBankTransfers.map((trf) => {
              const stu = students.find((s) => s.id === trf.studentId);
              return (
                <div
                  key={trf.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#0F172A]">
                      {stu?.fullName ?? trf.studentId} —{" "}
                      {formatCurrency(trf.amount, cur)}
                    </div>
                    <div className="text-slate-600">
                      Ref: <span className="font-mono font-semibold">{trf.reference}</span> •{" "}
                      {trf.date} • {trf.recordedBy}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        confirmBankTransfer(trf.id);
                        toast.success(
                          `Bank transfer confirmed! Receipt ${trf.receiptNumber} is now active.`
                        );
                      }}
                      className="h-8 bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Confirm Transfer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="bg-slate-200/80">
          <TabsTrigger value="invoices" className="text-xs font-bold">
            Student Balances & Debtors
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-bold">
            Receipts History ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs font-bold">
            Fee Schedule Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search student, admission ID or parent phone..."
            programmeFilter={programmeFilter}
            onProgrammeFilterChange={setProgrammeFilter}
            classFilter={classFilter}
            onClassFilterChange={setClassFilter}
            classes={classes}
            termFilter={termFilter}
            onTermFilterChange={setTermFilter}
            terms={settings.terms}
            settings={settings}
            onExportCsv={handleExportCsv}
            onPrint={handlePrintList}
            printLabel={
              statusFilter === "debtors" ? "Print Debtors List" : "Print List"
            }
            extraFilters={
              <select
                aria-label="Filter fee status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "debtors" | "paid")
                }
                className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-bold text-slate-800"
              >
                <option value="all">All Students</option>
                <option value="debtors">Debtors Only (Owing)</option>
                <option value="paid">Fully Paid</option>
              </select>
            }
          />

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">{settings.labels.classSingular}</th>
                    <th className="px-4 py-3 text-right">Net Bill</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceRows.map((inv) => (
                    <tr
                      key={`${inv.student.id}_${inv.invoiceProgrammeId}`}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F172A]">
                          {inv.student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {inv.student.admissionId} • {inv.student.parentPhone}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <div>
                          {getStudentClassName(inv.student, classes, settings)}
                        </div>
                        {settings.multiProgrammeEnabled && (
                          <div className="text-[11px] text-slate-500">
                            {inv.programmeLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatCurrency(inv.netPayable, cur)}
                        {inv.siblingDiscountAmount > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            Sibling disc. applied
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-800">
                        {formatCurrency(inv.amountPaid, cur)}
                        {inv.pendingAmount > 0 && (
                          <div className="text-[10px] font-bold text-amber-800">
                            +{formatCurrency(inv.pendingAmount, cur)} pending
                          </div>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-extrabold ${
                          inv.balance > 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {inv.balance > 0
                          ? formatCurrency(inv.balance, cur)
                          : "Paid"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleOpenPayModal(
                              inv.student,
                              inv.balance,
                              inv.invoiceProgrammeId
                            )
                          }
                          className="h-8 bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
                        >
                          <Coins className="mr-1.5 h-3.5 w-3.5" />
                          Record Payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="receipts">
          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Method & Ref</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p) => {
                    const stu = students.find((s) => s.id === p.studentId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#1E3A8A]">
                          {p.receiptNumber}
                          <div className="font-sans text-[11px] font-normal text-slate-500">
                            {p.date}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0F172A]">
                          {stu?.fullName ?? p.studentId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {p.method}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {p.reference}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.confirmationStatus === "Pending Confirmation" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                confirmBankTransfer(p.id);
                                toast.success("Confirmed bank transfer!");
                              }}
                              className="h-7 bg-amber-600 text-[11px] font-bold text-white hover:bg-amber-700"
                            >
                              Confirm Transfer
                            </Button>
                          ) : (
                            <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                              Confirmed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#0F172A]">
                          {formatCurrency(p.amount, cur)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPrintPreview({
                                type: "receipt",
                                paymentId: p.id,
                              })
                            }
                            className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5 text-[#1E3A8A]" />
                            Receipt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <form
            onSubmit={handleAddFeeItem}
            className="ndh-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-5 sm:items-end"
          >
            {settings.multiProgrammeEnabled && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Programme</Label>
                <select
                  value={newProgId}
                  onChange={(e) => setNewProgId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold"
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
              <Label className="text-xs font-bold">Category</Label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as FeeCategory)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold"
              >
                {FEE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold">Fee Description</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. First Term Tuition"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-bold">Amount ({cur})</Label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <Button
                type="submit"
                className="h-9 bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="ndh-card divide-y divide-slate-200">
            {feeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm"
              >
                <div>
                  <span className="font-bold text-[#0F172A]">{item.label}</span>{" "}
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {item.category}
                  </span>
                  {settings.multiProgrammeEnabled && (
                    <span className="ml-2 text-xs text-slate-500">
                      • {getProgrammeName(settings, item.programmeId)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[#0F172A]">
                    {formatCurrency(item.amount, cur)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      deleteFeeItem(item.id);
                      toast.success("Removed fee item.");
                    }}
                    className="h-8 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Fee Payment Modal */}
      <Dialog
        open={Boolean(payStudent)}
        onOpenChange={(o) => !o && setPayStudent(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              Record Fee Payment — {payStudent?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Supports Paystack, Flutterwave, Bank Transfer confirmation, POS and Cash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Amount ({cur})</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Payment Method</Label>
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(e.target.value as PaymentMethod)
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {payMethod === "Bank Transfer" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  Bank Transfer Confirmation Status
                </Label>
                <select
                  value={payStatus}
                  onChange={(e) =>
                    setPayStatus(
                      e.target.value as "Confirmed" | "Pending Confirmation"
                    )
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                >
                  <option value="Confirmed">
                    Confirmed in School Bank Account (Issue Receipt Now)
                  </option>
                  <option value="Pending Confirmation">
                    Pending Bank Alert Confirmation
                  </option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">
                Reference / Teller / Receipt Note
              </Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. PSK-882910 or NIP/ZEN/20261024"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Optional Remark</Label>
              <Input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. First instalment"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
              >
                Save & Print Receipt
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
