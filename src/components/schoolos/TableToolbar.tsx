import { Download, Printer, Search, X } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveProgrammes } from "@/services/calculations";
import type { ClassGroup, ProgrammeId, SchoolSettings } from "@/types/school";

export interface TableToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;

  programmeFilter: ProgrammeId | "all";
  onProgrammeFilterChange: (val: ProgrammeId | "all") => void;
  hideProgrammeFilter?: boolean;

  classFilter: string; // "all" or classId
  onClassFilterChange: (val: string) => void;
  classes: ClassGroup[];
  hideClassFilter?: boolean;

  termFilter: string;
  onTermFilterChange: (val: string) => void;
  terms: string[];

  settings: SchoolSettings;

  onExportCsv: () => void;
  onPrint: () => void;
  exportLabel?: string;
  printLabel?: string;
  extraFilters?: React.ReactNode;
  totalCountLabel?: string;
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search records...",
  programmeFilter,
  onProgrammeFilterChange,
  hideProgrammeFilter = false,
  classFilter,
  onClassFilterChange,
  classes,
  hideClassFilter = false,
  termFilter,
  onTermFilterChange,
  terms,
  settings,
  onExportCsv,
  onPrint,
  exportLabel = "Export CSV",
  printLabel = "Print",
  extraFilters,
  totalCountLabel,
}: TableToolbarProps) {
  const activeProgrammes = getActiveProgrammes(settings);
  const filteredClasses = classes.filter(
    (c) => programmeFilter === "all" || c.programmeId === programmeFilter
  );

  return (
    <div className="no-print ndh-card mb-4 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-slate-200 bg-[#F8FAFC] pr-8 pl-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters + Export/Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Programme Filter (only shown when multi-programme is enabled) */}
          {!hideProgrammeFilter && settings.multiProgrammeEnabled && (
            <select
              aria-label="Filter by programme"
              value={programmeFilter}
              onChange={(e) => {
                const nextProg = e.target.value;
                onProgrammeFilterChange(nextProg);
                if (
                  nextProg !== "all" &&
                  classFilter !== "all" &&
                  classes.find((c) => c.id === classFilter)?.programmeId !==
                    nextProg
                ) {
                  onClassFilterChange("all");
                }
              }}
              className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-700 focus:border-[#1E3A8A] focus:outline-none"
            >
              <option value="all">All Programmes</option>
              {activeProgrammes.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
          )}

          {/* Class Filter */}
          {!hideClassFilter && (
            <select
              aria-label={`Filter by ${settings.labels.classSingular.toLowerCase()}`}
              value={classFilter}
              onChange={(e) => onClassFilterChange(e.target.value)}
              className="h-9 max-w-[190px] rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-700 focus:border-[#1E3A8A] focus:outline-none"
            >
              <option value="all">All {settings.labels.classPlural}</option>
              {filteredClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}

          {/* Term Filter */}
          <select
            aria-label="Filter by term"
            value={termFilter}
            onChange={(e) => onTermFilterChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-700 focus:border-[#1E3A8A] focus:outline-none"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {extraFilters}

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-9 border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-[#1E3A8A]" />
              {exportLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onPrint}
              className="h-9 bg-[#0F172A] text-xs font-semibold text-white hover:bg-[#1E3A8A]"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              {printLabel}
            </Button>
          </div>
        </div>
      </div>

      {totalCountLabel && (
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span>{totalCountLabel}</span>
          <span>
            Session: <strong className="text-slate-700">{settings.currentSession}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
