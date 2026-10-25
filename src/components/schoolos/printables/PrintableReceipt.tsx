import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import {
  computeStudentInvoices,
  formatCurrency,
  getStudentClassName,
} from "@/services/calculations";
import type { SchoolDatabaseSnapshot } from "@/types/school";

interface PrintableReceiptProps {
  db: SchoolDatabaseSnapshot;
  paymentId: string;
}

export function PrintableReceipt({ db, paymentId }: PrintableReceiptProps) {
  const { settings, students, classes, feeItems, payments } = db;
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;

  const student = students.find((s) => s.id === payment.studentId);
  if (!student) return null;

  const invoices = computeStudentInvoices({
    student,
    allStudents: students,
    feeItems,
    payments,
    settings,
    session: payment.session,
    term: payment.term,
    modeOverride:
      payment.invoiceProgrammeId === "combined" ? "combined" : "separate",
  });

  const matchedInvoice =
    invoices.find(
      (inv) => inv.invoiceProgrammeId === payment.invoiceProgrammeId
    ) ?? invoices[0];

  const cur = settings.currencySymbol;
  const isPending = payment.confirmationStatus === "Pending Confirmation";

  return (
    <section className="mx-auto max-w-[190mm] rounded-xl border border-slate-300 bg-white p-6 text-slate-900 print:border-2 print:border-[#0F172A]">
      {/* Official Header */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-4">
        <div className="flex items-center gap-3.5">
          <SchoolCrest settings={settings} size="lg" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] uppercase">
              {settings.name}
            </h1>
            {settings.arabicName && (
              <div
                dir="rtl"
                lang="ar"
                className="font-arabic text-sm font-bold text-slate-700"
              >
                {settings.arabicName}
              </div>
            )}
            <p className="text-xs text-slate-600">{settings.address}</p>
            <p className="text-xs text-slate-600">
              Tel: {settings.phone} • {settings.email}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`inline-block rounded-md px-3 py-1 text-xs font-extrabold tracking-widest text-white uppercase ${
              isPending ? "bg-amber-600" : "bg-[#0F172A]"
            }`}
          >
            {isPending ? "BANK TRANSFER ADVICE (PENDING)" : "OFFICIAL FEE RECEIPT"}
          </div>
          <div className="mt-2 font-mono text-sm font-extrabold text-[#1E3A8A]">
            Receipt: {payment.receiptNumber}
          </div>
          <div className="font-mono text-xs font-semibold text-slate-700">
            Invoice: INV/{settings.code}/{payment.session.slice(0, 4)}/
            {student.id.replace(/\D/g, "").padStart(3, "0")}
          </div>
          <div className="text-xs text-slate-500">Date: {payment.date}</div>
        </div>
      </div>

      {/* Payer & Student Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-3">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Student Name
          </span>
          <span className="font-bold text-[#0F172A]">{student.fullName}</span>
          <span className="block text-[11px] text-slate-600">
            {student.admissionId}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            {settings.labels.classSingular}
          </span>
          <span className="font-semibold text-[#0F172A]">
            {getStudentClassName(student, classes, settings)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Received From (Guardian)
          </span>
          <span className="font-semibold text-[#0F172A]">
            {student.guardianName}
          </span>
          <span className="block text-[11px] text-slate-600">
            {student.parentPhone}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Academic Period
          </span>
          <span className="font-semibold text-[#0F172A]">
            {payment.session} • {payment.term}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Payment Method & Status
          </span>
          <span className="font-semibold text-[#0F172A]">
            {payment.method} ({payment.confirmationStatus})
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">
            Transaction Reference
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {payment.reference}
          </span>
        </div>
      </div>

      {/* Invoice Itemization */}
      {matchedInvoice && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-bold tracking-wider text-slate-600 uppercase">
            Fee Schedule Breakdown ({matchedInvoice.programmeLabel})
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-left font-bold text-[#0F172A]">
                <th className="border border-slate-300 px-3 py-1.5">Category</th>
                <th className="border border-slate-300 px-3 py-1.5">
                  Fee Description
                </th>
                <th className="border border-slate-300 px-3 py-1.5 text-right">
                  Amount ({cur})
                </th>
              </tr>
            </thead>
            <tbody>
              {matchedInvoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-1.5 font-medium">
                    {item.category}
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 text-slate-700">
                    {item.label}
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 text-right font-semibold">
                    {formatCurrency(item.amount, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals & Payment Confirmation Box */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={`rounded-lg border p-3.5 ${
            isPending
              ? "border-amber-300 bg-amber-50"
              : "border-emerald-200 bg-emerald-50/70"
          }`}
        >
          <div
            className={`text-[10px] font-bold tracking-wider uppercase ${
              isPending ? "text-amber-900" : "text-emerald-800"
            }`}
          >
            {isPending
              ? "Bank Transfer Submitted (Pending Confirmation)"
              : "Amount Received on This Receipt"}
          </div>
          <div
            className={`mt-1 text-2xl font-extrabold ${
              isPending ? "text-amber-950" : "text-emerald-950"
            }`}
          >
            {formatCurrency(payment.amount, cur)}
          </div>
          {payment.note && (
            <p className="mt-1.5 text-xs text-slate-700">Note: {payment.note}</p>
          )}
        </div>

        {matchedInvoice && (
          <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Gross Term Bill:</span>
              <span className="font-semibold">
                {formatCurrency(matchedInvoice.grossSubtotal, cur)}
              </span>
            </div>
            {matchedInvoice.siblingDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Sibling Discount ({matchedInvoice.siblingCount} children):
                </span>
                <span className="font-semibold">
                  -{formatCurrency(matchedInvoice.siblingDiscountAmount, cur)}
                </span>
              </div>
            )}
            {matchedInvoice.manualWaiverAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Fee Waiver / Scholarship:</span>
                <span className="font-semibold">
                  -{formatCurrency(matchedInvoice.manualWaiverAmount, cur)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-[#0F172A]">
              <span>Net Term Payable:</span>
              <span>{formatCurrency(matchedInvoice.netPayable, cur)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Confirmed Paid to Date:</span>
              <span className="font-semibold">
                {formatCurrency(matchedInvoice.amountPaid, cur)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-extrabold">
              <span>Outstanding Balance:</span>
              <span
                className={
                  matchedInvoice.balance > 0 ? "text-red-700" : "text-emerald-700"
                }
              >
                {formatCurrency(matchedInvoice.balance, cur)} (
                {matchedInvoice.status.toUpperCase()})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-8 pt-4 text-xs">
        <div className="border-t border-slate-400 pt-1.5 text-center">
          <div className="font-semibold text-[#0F172A]">
            {payment.confirmedBy ?? payment.recordedBy}
          </div>
          <div className="text-[11px] text-slate-500">
            Bursar / Authorized Cashier Signature
          </div>
        </div>
        <div className="border-t border-slate-400 pt-1.5 text-center">
          <div className="font-semibold text-[#0F172A]">Official Stamp</div>
          <div className="text-[11px] text-slate-500">
            {settings.name} Bursary Office
          </div>
        </div>
      </div>
    </section>
  );
}
