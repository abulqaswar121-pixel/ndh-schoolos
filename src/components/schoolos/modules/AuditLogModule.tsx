import { ClipboardList, Download, Printer, Search, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { exportRowsToCsv } from "@/services/calculations";
import type { AuditCategory, UserRole } from "@/types/school";

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  score: "Score Change",
  result_lock: "Result Lock / Publish",
  attendance: "Attendance",
  fee_waiver: "Fee Waiver",
  payment: "Fee Payment",
  settings: "Settings",
  student_transfer: "Class Transfer",
  exam_paper: "Exam Question Paper",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Proprietor / Admin",
  exam_officer: "Exam Officer",
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
  bursar: "Bursar / Accountant",
  secretary: "Secretary",
  parent: "Parent",
  muallim: "Mu'allim",
};

export function AuditLogModule() {
  const { db, portal, openPrintPreview } = useSchoolOS();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">(
    "all"
  );
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.auditLogs.filter((entry) => {
      if (categoryFilter !== "all" && entry.category !== categoryFilter) {
        return false;
      }
      if (roleFilter !== "all" && entry.actorRole !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.targetLabel.toLowerCase().includes(q) ||
        entry.oldValue.toLowerCase().includes(q) ||
        entry.newValue.toLowerCase().includes(q)
      );
    });
  }, [db.auditLogs, search, categoryFilter, roleFilter]);

  if (portal.role !== "admin") {
    return (
      <div className="ndh-card p-6 text-center text-sm text-slate-600">
        Only the Proprietor / Admin can view the school audit log.
      </div>
    );
  }

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
    } catch {
      return iso;
    }
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `${db.settings.code}_audit_log`,
      ["Time", "User", "Role", "Category", "Action", "Record", "Old Value", "New Value"],
      filtered.map((e) => [
        formatTimestamp(e.timestamp),
        e.actorName,
        ROLE_LABELS[e.actorRole],
        CATEGORY_LABELS[e.category],
        e.action,
        e.targetLabel,
        e.oldValue,
        e.newValue,
      ])
    );
  };

  const handlePrint = () => {
    openPrintPreview({
      type: "table",
      title: "School Security & Change Audit Log",
      subtitle: `${filtered.length} recorded changes`,
      headers: [
        "Time",
        "User",
        "Category",
        "Action",
        "Record",
        "Old Value",
        "New Value",
      ],
      rows: filtered.map((e) => [
        formatTimestamp(e.timestamp),
        `${e.actorName} (${ROLE_LABELS[e.actorRole]})`,
        CATEGORY_LABELS[e.category],
        e.action,
        e.targetLabel,
        e.oldValue,
        e.newValue,
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#1E3A8A] uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Accountability Record
          </div>
          <h1 className="mt-0.5 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Audit Log
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Every score edit, result lock, attendance mark, fee waiver, payment and settings change is recorded automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#1E3A8A]" />
            Export CSV
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-[#0F172A] text-xs font-semibold text-white hover:bg-[#1E3A8A]"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Log
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="ndh-card p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, student, score or receipt..."
              className="h-9 border-slate-200 bg-[#F8FAFC] pl-9 text-sm"
            />
          </div>

          <select
            aria-label="Filter audit category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as AuditCategory | "all")
            }
            className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Change Types</option>
            <option value="score">Score Changes</option>
            <option value="result_lock">Result Locks & Approvals</option>
            <option value="attendance">Attendance</option>
            <option value="fee_waiver">Fee Waivers</option>
            <option value="payment">Fee Payments</option>
            <option value="settings">Settings</option>
          </select>

          <select
            aria-label="Filter audit role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Staff & Roles</option>
            <option value="admin">Proprietor / Admin</option>
            <option value="class_teacher">Class Teacher</option>
            <option value="subject_teacher">Subject Teacher</option>
            <option value="bursar">Bursar / Accountant</option>
            <option value="secretary">Secretary</option>
            <option value="parent">Parent</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="ndh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Record Changed</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    <ClipboardList className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                    No audit entries match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F172A]">
                        {entry.actorName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ROLE_LABELS[entry.actorRole]}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0F172A]">
                        {entry.action}
                      </div>
                      <div className="text-xs text-slate-600">
                        {entry.targetLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {entry.oldValue}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1E3A8A]">
                      {entry.newValue}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
