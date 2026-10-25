import React from "react";
import { SchoolCrest } from "../SchoolCrest";
import type { SchoolSettings } from "@/types/school";

interface PrintableDataTableProps {
  settings: SchoolSettings;
  title: string;
  subtitle?: string | undefined;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function PrintableDataTable({
  settings,
  title,
  subtitle,
  headers,
  rows,
}: PrintableDataTableProps) {
  return (
    <section className="mx-auto max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0">
      <div className="flex items-center justify-between gap-4 border-b-2 border-[#0F172A] pb-3">
        <SchoolCrest settings={settings} size="md" />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] uppercase">
            {settings.name}
          </h1>
          <p className="text-xs text-slate-600">
            {settings.address} • Tel: {settings.phone}
          </p>
          <div className="mt-1 inline-block rounded bg-[#0F172A] px-3 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">
            {title}
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] font-medium text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-right text-[11px] text-slate-500">
          <div className="font-bold text-[#0F172A]">{settings.currentSession}</div>
          <div>{settings.currentTerm}</div>
          <div>Records: {rows.length}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 text-left font-bold text-[#0F172A]">
              {headers.map((h, i) => (
                <th key={i} className="border border-slate-300 px-2.5 py-1.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="border border-slate-300 px-3 py-6 text-center text-slate-500"
                >
                  No records match the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="even:bg-slate-50/50">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border border-slate-300 px-2.5 py-1.5 text-slate-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
