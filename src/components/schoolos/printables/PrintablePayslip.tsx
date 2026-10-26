import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import { formatCurrency } from "@/services/calculations";
import type { SchoolDatabaseSnapshot } from "@/types/school";

interface PrintablePayslipProps {
  db: SchoolDatabaseSnapshot;
  payrollId: string;
}

export function PrintablePayslip({ db, payrollId }: PrintablePayslipProps) {
  const { settings, staff, payroll } = db;
  const record = payroll.find((p) => p.id === payrollId);
  if (!record) return null;

  const member = staff.find((s) => s.id === record.staffId);
  if (!member) return null;

  const cur = settings.currencySymbol;

  return (
    <section className="mx-auto max-w-[190mm] rounded-xl border border-slate-300 bg-white p-6 text-slate-900 print:border-2 print:border-[#0F172A]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-4">
        <div className="flex items-center gap-3.5">
          <SchoolCrest settings={settings} size="lg" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] uppercase">
              {settings.name}
            </h1>
            <p className="text-xs text-slate-600">{settings.address}</p>
            <p className="text-xs text-slate-600">Tel: {settings.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-md bg-[#0F172A] px-3 py-1 text-xs font-extrabold tracking-widest text-white uppercase">
            STAFF SALARY PAYSLIP
          </div>
          <div className="mt-2 text-sm font-bold text-[#1E3A8A]">
            {record.monthLabel}
          </div>
          <div className="text-xs text-slate-500">
            Status:{" "}
            <span
              className={
                record.status === "Paid"
                  ? "font-bold text-emerald-700"
                  : "font-bold text-amber-700"
              }
            >
              {record.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Details */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-3">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Employee Name
          </span>
          <span className="font-bold text-[#0F172A]">{member.fullName}</span>
          <span className="block text-[11px] font-mono text-slate-600">
            {member.staffCode}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Role / Designation
          </span>
          <span className="font-semibold text-[#0F172A]">{member.role}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Bank & Account Number
          </span>
          <span className="font-semibold text-[#0F172A]">{member.bankName}</span>
          <span className="block font-mono text-[11px] text-slate-700">
            {member.accountNumber}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Phone
          </span>
          <span className="font-medium text-slate-800">{member.phone}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Payment Reference
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {record.paymentReference || "Pending Disbursement"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Disbursement Date
          </span>
          <span className="font-medium text-slate-800">
            {record.paidDate || "—"}
          </span>
        </div>
      </div>

      {/* Earnings & Deductions Columns */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-300 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-[#0F172A] uppercase">
            Earnings & Allowances
          </div>
          <div className="divide-y divide-slate-200 p-3 text-xs space-y-2">
            <div className="flex justify-between pt-1">
              <span className="text-slate-600">Base Monthly Salary</span>
              <span className="font-semibold">
                {formatCurrency(record.baseSalary, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-600">Teaching Allowance</span>
              <span className="font-semibold">
                {formatCurrency(record.teachingAllowance, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-600">Overtime Pay</span>
              <span className="font-semibold">
                {formatCurrency(record.overtime, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-600">Transport Allowance</span>
              <span className="font-semibold">
                {formatCurrency(record.transport, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2 font-bold text-[#0F172A]">
              <span>Gross Earnings</span>
              <span>
                {formatCurrency(record.baseSalary + record.grossAdditions, cur)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-[#0F172A] uppercase">
            Statutory & Policy Deductions
          </div>
          <div className="divide-y divide-slate-200 p-3 text-xs space-y-2">
            <div className="flex justify-between pt-1">
              <span className="text-slate-600">Absence / Lateness Fines</span>
              <span className="font-semibold text-red-700">
                -{formatCurrency(record.absenceFines, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-600">Pension Contribution</span>
              <span className="font-semibold text-red-700">
                -{formatCurrency(record.pension, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-600">Salary Advance Repayment</span>
              <span className="font-semibold text-red-700">
                -{formatCurrency(record.salaryAdvanceRepayment, cur)}
              </span>
            </div>
            <div className="flex justify-between pt-2 font-bold text-red-800">
              <span>Total Deductions</span>
              <span>-{formatCurrency(record.totalDeductions, cur)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Pay Banner */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0F172A] px-5 py-4 text-white">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-sky-300 uppercase">
            Net Take-Home Salary
          </div>
          <div className="text-xs text-slate-300">
            Credited to {member.bankName} ({member.accountNumber})
          </div>
        </div>
        <div className="text-2xl font-extrabold">
          {formatCurrency(record.netSalary, cur)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 pt-4 text-xs">
        <div className="border-t border-slate-400 pt-1.5 text-center font-semibold text-slate-700">
          Accountant / Bursar Signature
        </div>
        <div className="border-t border-slate-400 pt-1.5 text-center font-semibold text-[#0F172A]">
          Employee Signature & Date
        </div>
      </div>
    </section>
  );
}
