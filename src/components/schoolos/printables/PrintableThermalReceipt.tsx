import React from "react";
import { formatCurrency, getStudentClassName } from "@/services/calculations";
import type { SchoolDatabaseSnapshot } from "@/types/school";

export type ReceiptPaper = "a4" | "58mm" | "80mm";

export function PrintableThermalReceipt({ db, paymentId, paper }: { db: SchoolDatabaseSnapshot; paymentId: string; paper: "58mm" | "80mm" }) {
  const payment = db.payments.find((p) => p.id === paymentId);
  const student = payment ? db.students.find((s) => s.id === payment.studentId) : undefined;
  if (!payment || !student) return null;
  const cur = db.settings.currencySymbol;
  const line = (k: string, v: string) => (
    <div className="thermal-row"><span>{k}</span><strong>{v}</strong></div>
  );
  return (
    <section className={`thermal-receipt thermal-${paper}`}>
      <div className="thermal-center thermal-title">{db.settings.name}</div>
      {db.settings.address && <div className="thermal-center">{db.settings.address}</div>}
      <div className="thermal-rule" />
      <div className="thermal-center thermal-title">PAYMENT RECEIPT</div>
      {line("Receipt", payment.receiptNumber)}
      {line("Date", payment.date)}
      <div className="thermal-rule" />
      {line("Learner", student.fullName)}
      {line("Adm. No", student.admissionId)}
      {line("Class", getStudentClassName(student, db.classes, db.settings) || "—")}
      {line("Term", `${payment.term} ${payment.session}`)}
      <div className="thermal-rule" />
      <div className="thermal-row thermal-total"><span>PAID</span><strong>{formatCurrency(payment.amount, cur)}</strong></div>
      {line("Method", payment.method)}
      {payment.confirmationStatus !== "Confirmed" && <div className="thermal-center">** PENDING CONFIRMATION **</div>}
      <div className="thermal-rule" />
      <div className="thermal-center">Received by: {payment.recordedBy}</div>
      <div className="thermal-center">Thank you</div>
    </section>
  );
}
