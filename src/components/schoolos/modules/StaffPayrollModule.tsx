import {
  CheckCheck,
  CheckCircle2,
  Edit3,
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
import { exportRowsToCsv, formatCurrency } from "@/services/calculations";
import type {
  PayrollRecord,
  ProgrammeId,
  StaffJobTitle,
  StaffMember,
  UserRole,
} from "@/types/school";

const PAYROLL_MONTHS = [
  { key: "2026-09", label: "September 2026" },
  { key: "2026-10", label: "October 2026" },
  { key: "2026-11", label: "November 2026" },
  { key: "2026-12", label: "December 2026" },
];

export function StaffPayrollModule() {
  const {
    db,
    portal,
    upsertStaffMember,
    deleteStaffMember,
    generateMonthlyPayroll,
    updatePayrollRecord,
    markPayrollPaidStatus,
    markAllMonthPayrollPaid,
    openPrintPreview,
  } = useSchoolOS();
  const { settings, staff, payroll, classes, subjects } = db;
  const cur = settings.currencySymbol;

  const [selectedMonthKey, setSelectedMonthKey] = useState("2026-10");
  const selectedMonthMeta =
    PAYROLL_MONTHS.find((m) => m.key === selectedMonthKey) ?? PAYROLL_MONTHS[1]!;

  const [paySearch, setPaySearch] = useState("");
  const [payProgFilter, setPayProgFilter] = useState<ProgrammeId | "all">(
    "all"
  );
  const [payClassFilter, setPayClassFilter] = useState("all");
  const [payTerm, setPayTerm] = useState(settings.currentTerm);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(
    null
  );

  // Staff Directory Tab State
  const [stfSearch, setStfSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  const availableSystemRoles: Array<{
    role: Exclude<UserRole, "parent">;
    label: string;
    jobTitle: StaffJobTitle;
  }> = useMemo(() => {
    const base: Array<{
      role: Exclude<UserRole, "parent">;
      label: string;
      jobTitle: StaffJobTitle;
    }> = [
      {
        role: "admin",
        label: "Proprietor / Admin",
        jobTitle: "Proprietor / Principal",
      },
      {
        role: "exam_officer",
        label: "Exam Officer (All-Classes Results & Exam Papers)",
        jobTitle: "Exam Officer",
      },
      {
        role: "class_teacher",
        label: `${settings.labels.classSingular} ${settings.labels.teacherSingular}`,
        jobTitle: "Class Teacher",
      },
      {
        role: "subject_teacher",
        label: `Subject ${settings.labels.teacherSingular}`,
        jobTitle: "Subject Teacher",
      },
      {
        role: "bursar",
        label: "Bursar / Accountant",
        jobTitle: "Bursar / Accountant",
      },
      {
        role: "secretary",
        label: "Secretary",
        jobTitle: "School Secretary",
      },
    ];
    if (settings.enableQuranModule) {
      base.push({
        role: "muallim",
        label: "Mu'allim (Qur'an Module)",
        jobTitle: "Mu'allim",
      });
    }
    return base;
  }, [settings.enableQuranModule, settings.labels]);

  const monthPayrollRows = useMemo(() => {
    const q = paySearch.trim().toLowerCase();
    return payroll
      .filter((p) => p.monthKey === selectedMonthKey)
      .map((rec) => ({
        rec,
        member: staff.find((s) => s.id === rec.staffId),
      }))
      .filter((row): row is { rec: PayrollRecord; member: StaffMember } => {
        if (!row.member) return false;
        if (
          payClassFilter !== "all" &&
          !row.member.assignedClassIds.includes(payClassFilter)
        ) {
          return false;
        }
        if (!q) return true;
        return `${row.member.fullName} ${row.member.role} ${row.member.bankName}`
          .toLowerCase()
          .includes(q);
      });
  }, [payroll, selectedMonthKey, staff, payClassFilter, paySearch]);

  const payrollTotals = useMemo(() => {
    const netTotal = monthPayrollRows.reduce((s, r) => s + r.rec.netSalary, 0);
    const paidTotal = monthPayrollRows
      .filter((r) => r.rec.status === "Paid")
      .reduce((s, r) => s + r.rec.netSalary, 0);
    return { netTotal, paidTotal, pendingTotal: netTotal - paidTotal };
  }, [monthPayrollRows]);

  const filteredStaff = useMemo(() => {
    const q = stfSearch.trim().toLowerCase();
    return staff.filter((s) => {
      if (!q) return true;
      return `${s.fullName} ${s.staffCode} ${s.role} ${s.phone}`
        .toLowerCase()
        .includes(q);
    });
  }, [staff, stfSearch]);

  const openAddStaff = () => {
    const nextNum = String(staff.length + 1).padStart(3, "0");
    setEditingStaff({
      id: `stf-${Date.now()}`,
      staffCode: `${settings.code}/STF/${nextNum}`,
      fullName: "",
      role: "Class Teacher",
      systemRole: "class_teacher",
      loginPin: "1234",
      phone: "+234 ",
      email: "",
      bankName: "GTBank",
      accountNumber: "",
      assignedClassIds: [],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: "2026-10-24",
      salary: {
        baseSalary: 100000,
        teachingAllowance: 10000,
        overtime: 0,
        transport: 15000,
        absenceFines: 0,
        pension: 8000,
        salaryAdvanceRepayment: 0,
      },
    });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.fullName.trim()) {
      toast.error("Enter staff full name.");
      return;
    }
    upsertStaffMember(editingStaff);
    toast.success(`Saved staff record for ${editingStaff.fullName}`);
    setStaffModalOpen(false);
  };

  const handleExportPayrollCsv = () => {
    exportRowsToCsv(
      `${settings.code}_payroll_${selectedMonthKey}`,
      [
        "Staff Code",
        "Full Name",
        "Role",
        "Bank",
        "Account No",
        "Base Salary",
        "Allowances",
        "Deductions",
        "Net Salary",
        "Status",
      ],
      monthPayrollRows.map((r) => [
        r.member.staffCode,
        r.member.fullName,
        r.member.role,
        r.member.bankName,
        r.member.accountNumber,
        r.rec.baseSalary,
        r.rec.grossAdditions,
        r.rec.totalDeductions,
        r.rec.netSalary,
        r.rec.status,
      ])
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Staff & Monthly Payroll
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Manage teachers, bursars and secretaries, assign {settings.labels.classPlural.toLowerCase()} and print monthly payslips.
          </p>
        </div>

        <Button
          size="sm"
          onClick={openAddStaff}
          className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Staff Member
        </Button>
      </div>

      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList className="bg-slate-200/80">
          <TabsTrigger value="payroll" className="text-xs font-bold">
            Monthly Payroll
          </TabsTrigger>
          <TabsTrigger value="directory" className="text-xs font-bold">
            Staff & Role Assignments ({staff.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <div className="ndh-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Select payroll month"
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-bold text-[#0F172A]"
              >
                {PAYROLL_MONTHS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-700">
                Net Payroll:{" "}
                <strong className="text-[#0F172A]">
                  {formatCurrency(payrollTotals.netTotal, cur)}
                </strong>{" "}
                • Paid:{" "}
                <strong className="text-emerald-800">
                  {formatCurrency(payrollTotals.paidTotal, cur)}
                </strong>{" "}
                • Pending:{" "}
                <strong className="text-amber-800">
                  {formatCurrency(payrollTotals.pendingTotal, cur)}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const created = generateMonthlyPayroll(
                    selectedMonthKey,
                    selectedMonthMeta.label
                  );
                  toast.success(
                    created > 0
                      ? `Generated ${created} payroll entries for ${selectedMonthMeta.label}.`
                      : `Payroll for ${selectedMonthMeta.label} is already generated.`
                  );
                }}
                className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              >
                Generate Month Sheet
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const n = markAllMonthPayrollPaid(selectedMonthKey);
                  toast.success(
                    n > 0
                      ? `Marked ${n} salaries Paid for ${selectedMonthMeta.label}.`
                      : "All salaries for this month are already marked Paid."
                  );
                }}
                className="h-8 bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark All Paid
              </Button>
            </div>
          </div>

          <TableToolbar
            search={paySearch}
            onSearchChange={setPaySearch}
            searchPlaceholder="Search staff name or bank..."
            programmeFilter={payProgFilter}
            onProgrammeFilterChange={setPayProgFilter}
            hideProgrammeFilter
            classFilter={payClassFilter}
            onClassFilterChange={setPayClassFilter}
            classes={classes}
            termFilter={payTerm}
            onTermFilterChange={setPayTerm}
            terms={settings.terms}
            settings={settings}
            onExportCsv={handleExportPayrollCsv}
            onPrint={() =>
              openPrintPreview({
                type: "table",
                title: `${settings.name} — ${selectedMonthMeta.label} Payroll`,
                headers: [
                  "Staff",
                  "Role",
                  "Bank & Account",
                  "Net Salary",
                  "Status",
                ],
                rows: monthPayrollRows.map((r) => [
                  r.member.fullName,
                  r.member.role,
                  `${r.member.bankName} (${r.member.accountNumber})`,
                  formatCurrency(r.rec.netSalary, cur),
                  r.rec.status,
                ]),
              })
            }
          />

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Bank Details</th>
                    <th className="px-4 py-3 text-right">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthPayrollRows.map(({ rec, member }) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F172A]">
                          {member.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {member.role} • {member.staffCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {member.bankName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {member.accountNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#0F172A]">
                        {formatCurrency(rec.netSalary, cur)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                            rec.status === "Paid"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPayroll({ ...rec })}
                            className="h-8 border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          {rec.status !== "Paid" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                markPayrollPaidStatus(rec.id, "Paid");
                                toast.success(
                                  `Marked ${member.fullName} Paid.`
                                );
                              }}
                              className="h-8 bg-emerald-700 px-2.5 text-xs font-bold text-white hover:bg-emerald-800"
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Pay
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPrintPreview({
                                type: "payslip",
                                payrollId: rec.id,
                              })
                            }
                            className="h-8 border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5 text-[#1E3A8A]" />
                            Payslip
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Staff Directory & Access Scope */}
        <TabsContent value="directory" className="space-y-4">
          <div className="ndh-card p-3.5">
            <Input
              value={stfSearch}
              onChange={(e) => setStfSearch(e.target.value)}
              placeholder="Search staff by name, code or role..."
              className="max-w-sm border-slate-200 bg-[#F8FAFC]"
            />
          </div>

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Access Role</th>
                    <th className="px-4 py-3">Assigned Scope</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStaff.map((member) => {
                    const clsNames = member.assignedClassIds
                      .map((id) => classes.find((c) => c.id === id)?.name)
                      .filter(Boolean)
                      .join(", ");
                    const subNames = member.assignedSubjectIds
                      .map((id) => subjects.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#0F172A]">
                            {member.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {member.staffCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#1E3A8A]">
                          {member.role}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {member.systemRole === "admin"
                            ? "All Classes & Settings"
                            : member.systemRole === "exam_officer"
                              ? "All Classes' Results, Report Sheets & Exam Papers"
                              : member.systemRole === "bursar"
                                ? "Fees, Receipts & Payroll"
                                : member.systemRole === "secretary"
                                  ? "Students, Attendance & Printing"
                                  : `${clsNames || "No classes"}${subNames ? ` • ${subNames}` : ""}${member.isExamOfficer ? " • + Exam Officer Duty" : ""}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div>{member.phone}</div>
                          <div>{member.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStaff({
                                  ...member,
                                  assignedClassIds: [
                                    ...member.assignedClassIds,
                                  ],
                                  assignedSubjectIds: [
                                    ...member.assignedSubjectIds,
                                  ],
                                  salary: { ...member.salary },
                                });
                                setStaffModalOpen(true);
                              }}
                              className="h-8 border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            {portal.role === "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  deleteStaffMember(member.id);
                                  toast.success(`Removed ${member.fullName}`);
                                }}
                                className="h-8 border-red-200 bg-white px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Payroll Allowances/Deductions Modal */}
      <Dialog
        open={Boolean(editingPayroll)}
        onOpenChange={(o) => !o && setEditingPayroll(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              Adjust Monthly Salary
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Update base pay, allowances or deductions for this month.
            </DialogDescription>
          </DialogHeader>
          {editingPayroll && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updatePayrollRecord(editingPayroll);
                toast.success("Updated monthly salary.");
                setEditingPayroll(null);
              }}
              className="grid grid-cols-2 gap-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-bold">Base Salary</Label>
                <Input
                  type="number"
                  value={editingPayroll.baseSalary}
                  onChange={(e) =>
                    setEditingPayroll({
                      ...editingPayroll,
                      baseSalary: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Teaching Allowance</Label>
                <Input
                  type="number"
                  value={editingPayroll.teachingAllowance}
                  onChange={(e) =>
                    setEditingPayroll({
                      ...editingPayroll,
                      teachingAllowance: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Transport</Label>
                <Input
                  type="number"
                  value={editingPayroll.transport}
                  onChange={(e) =>
                    setEditingPayroll({
                      ...editingPayroll,
                      transport: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Pension / Deduction</Label>
                <Input
                  type="number"
                  value={editingPayroll.pension}
                  onChange={(e) =>
                    setEditingPayroll({
                      ...editingPayroll,
                      pension: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPayroll(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
                >
                  Save Payroll
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Staff Member & Role Assignment Modal */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              {editingStaff?.fullName
                ? `Edit Staff — ${editingStaff.fullName}`
                : "Add Staff Member"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Assign system role, authorized {settings.labels.classPlural.toLowerCase()} and bank details.
            </DialogDescription>
          </DialogHeader>

          {editingStaff && (
            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Full Name</Label>
                  <Input
                    value={editingStaff.fullName}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        fullName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">System Role</Label>
                  <select
                    value={editingStaff.systemRole}
                    onChange={(e) => {
                      const sys = e.target.value as Exclude<UserRole, "parent">;
                      const found = availableSystemRoles.find(
                        (r) => r.role === sys
                      );
                      setEditingStaff({
                        ...editingStaff,
                        systemRole: sys,
                        role: found?.jobTitle ?? editingStaff.role,
                      });
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-semibold"
                  >
                    {availableSystemRoles.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Phone</Label>
                  <Input
                    value={editingStaff.phone}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Login PIN</Label>
                  <Input
                    value={editingStaff.loginPin ?? ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        loginPin: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Bank Name</Label>
                  <Input
                    value={editingStaff.bankName}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        bankName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Account Number</Label>
                  <Input
                    value={editingStaff.accountNumber}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        accountNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {(editingStaff.systemRole === "class_teacher" ||
                editingStaff.systemRole === "subject_teacher" ||
                editingStaff.systemRole === "muallim") && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#9ed9d6] bg-[#edf7f6] p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(editingStaff.isExamOfficer)}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        isExamOfficer: e.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 accent-[#1a4a6e]"
                  />
                  <span className="leading-relaxed text-slate-700">
                    <strong className="text-[#0b1220]">
                      Also Grant Exam Officer Duty
                    </strong>{" "}
                    — allows this teacher to review/approve submitted exam
                    papers (PDF &amp; Word .doc) and view/print all classes&apos;
                    broadsheets &amp; report sheets.
                  </span>
                </label>
              )}

              {(editingStaff.systemRole === "class_teacher" ||
                editingStaff.systemRole === "subject_teacher" ||
                editingStaff.systemRole === "muallim") && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="font-bold text-[#0F172A]">
                    Assigned {settings.labels.classPlural} (Strict Access Scope)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls) => {
                      const checked = editingStaff.assignedClassIds.includes(
                        cls.id
                      );
                      return (
                        <label
                          key={cls.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...editingStaff.assignedClassIds, cls.id]
                                : editingStaff.assignedClassIds.filter(
                                    (id) => id !== cls.id
                                  );
                              setEditingStaff({
                                ...editingStaff,
                                assignedClassIds: next,
                              });
                            }}
                          />
                          <span>{cls.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingStaff.systemRole === "subject_teacher" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="font-bold text-[#0F172A]">
                    Assigned Subjects (Subject Teacher Only)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((sub) => {
                      const checked = editingStaff.assignedSubjectIds.includes(
                        sub.id
                      );
                      return (
                        <label
                          key={sub.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...editingStaff.assignedSubjectIds, sub.id]
                                : editingStaff.assignedSubjectIds.filter(
                                    (id) => id !== sub.id
                                  );
                              setEditingStaff({
                                ...editingStaff,
                                assignedSubjectIds: next,
                              });
                            }}
                          />
                          <span>{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStaffModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
                >
                  Save Staff Member
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
