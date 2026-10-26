import { CalendarCheck2, CheckCheck, Printer } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { TableToolbar } from "../TableToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  computeStudentAttendanceSummary,
  exportRowsToCsv,
  getActiveProgrammes,
  getStudentClassName,
  isStudentInProgramme,
} from "@/services/calculations";
import type { AttendanceStatus, ProgrammeId } from "@/types/school";

const STATUS_OPTIONS: Array<{
  status: AttendanceStatus;
  activeClass: string;
}> = [
  {
    status: "Present",
    activeClass: "bg-emerald-700 text-white border-emerald-700",
  },
  {
    status: "Late",
    activeClass: "bg-amber-600 text-white border-amber-600",
  },
  {
    status: "Absent",
    activeClass: "bg-red-600 text-white border-red-600",
  },
  {
    status: "Excused",
    activeClass: "bg-slate-700 text-white border-slate-700",
  },
];

export function AttendanceModule() {
  const {
    db,
    portal,
    setAttendanceStatus,
    markClassAllPresent,
    updateSettings,
    openPrintPreview,
  } = useSchoolOS();
  const { settings, classes, students, attendance } = db;

  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  // Daily Register State
  const [selectedDate, setSelectedDate] = useState("2026-10-24");
  const [selectedProgId, setSelectedProgId] = useState<ProgrammeId>(
    classes[0]?.programmeId ?? activeProgrammes[0]?.id ?? "prog-main"
  );
  const progClasses = useMemo(
    () => classes.filter((c) => c.programmeId === selectedProgId),
    [classes, selectedProgId]
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    progClasses[0]?.id ?? ""
  );
  const activeClassId = progClasses.some((c) => c.id === selectedClassId)
    ? selectedClassId
    : (progClasses[0]?.id ?? "");

  // Term Summary State
  const [sumSearch, setSumSearch] = useState("");
  const [sumProgFilter, setSumProgFilter] = useState<ProgrammeId | "all">("all");
  const [sumClassFilter, setSumClassFilter] = useState("all");
  const [sumTermFilter, setSumTermFilter] = useState(settings.currentTerm);

  const registerRoster = useMemo(() => {
    return students.filter(
      (s) =>
        s.status === "Active" &&
        s.programmeClasses[selectedProgId] === activeClassId
    );
  }, [students, selectedProgId, activeClassId]);

  const getStudentDayStatus = (
    studentId: string
  ): AttendanceStatus | undefined => {
    return attendance.find(
      (a) =>
        a.date === selectedDate &&
        a.programmeId === selectedProgId &&
        a.classId === activeClassId &&
        a.studentId === studentId
    )?.status;
  };

  const handleMarkAllPresent = () => {
    if (!activeClassId || registerRoster.length === 0) return;
    markClassAllPresent({
      date: selectedDate,
      session: settings.currentSession,
      term: settings.currentTerm,
      programmeId: selectedProgId,
      classId: activeClassId,
      studentIds: registerRoster.map((s) => s.id),
    });
    toast.success(
      `Marked all ${registerRoster.length} students Present for ${selectedDate}`
    );
  };

  const summaryRows = useMemo(() => {
    const q = sumSearch.trim().toLowerCase();
    return students
      .filter((s) => {
        if (s.status !== "Active") return false;
        if (
          sumProgFilter !== "all" &&
          !isStudentInProgramme(s, sumProgFilter)
        ) {
          return false;
        }
        if (
          sumClassFilter !== "all" &&
          !Object.values(s.programmeClasses).includes(sumClassFilter)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admissionId.toLowerCase().includes(q)
        );
      })
      .map((stu) => {
        const sum = computeStudentAttendanceSummary({
          attendance,
          studentId: stu.id,
          session: settings.currentSession,
          term: sumTermFilter,
          programmeId: sumProgFilter === "all" ? undefined : sumProgFilter,
          configuredDaysOpened: settings.daysSchoolOpened,
        });
        return {
          student: stu,
          className: getStudentClassName(stu, classes, settings, sumProgFilter),
          summary: sum,
        };
      });
  }, [
    students,
    sumProgFilter,
    sumClassFilter,
    sumSearch,
    attendance,
    settings,
    sumTermFilter,
    classes,
  ]);

  const handleExportSummary = () => {
    exportRowsToCsv(
      `${settings.code}_attendance_${sumTermFilter}`,
      [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Days Present",
        "Late",
        "Absent",
        "Days Opened",
        "Attendance %",
      ],
      summaryRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        r.className,
        r.summary.daysPresent,
        r.summary.daysLate,
        r.summary.daysAbsent,
        r.summary.daysOpened,
        `${r.summary.ratePercent}%`,
      ])
    );
  };

  const handlePrintSummary = () => {
    openPrintPreview({
      type: "table",
      title: `${settings.name} — ${sumTermFilter} Attendance Summary`,
      subtitle: `${summaryRows.length} students`,
      headers: [
        "Admission ID",
        "Student Name",
        settings.labels.classSingular,
        "Present",
        "Late",
        "Absent",
        "Rate %",
      ],
      rows: summaryRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        r.className,
        r.summary.daysPresent,
        r.summary.daysLate,
        r.summary.daysAbsent,
        `${r.summary.ratePercent}%`,
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Attendance
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Mark daily {settings.labels.classSingular.toLowerCase()} attendance quickly and track term attendance totals.
          </p>
        </div>

        {portal.role === "admin" && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700">
              Days School Opened:
            </span>
            <Input
              type="number"
              min={1}
              max={120}
              value={settings.daysSchoolOpened}
              onChange={(e) =>
                updateSettings(
                  (prev) => ({
                    ...prev,
                    daysSchoolOpened: Math.max(1, Number(e.target.value) || 1),
                  }),
                  "Updated Days School Opened"
                )
              }
              className="h-8 w-20 text-center font-bold"
            />
          </div>
        )}
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="bg-slate-200/80">
          <TabsTrigger value="daily" className="text-xs font-bold">
            Daily Register
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs font-bold">
            Term Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="ndh-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 w-40 border-slate-200 bg-[#F8FAFC] text-xs font-semibold"
              />

              {settings.multiProgrammeEnabled && (
                <select
                  aria-label="Select programme"
                  value={selectedProgId}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
                >
                  {activeProgrammes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label={`Select ${settings.labels.classSingular.toLowerCase()}`}
                value={activeClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-slate-800"
              >
                {progClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleMarkAllPresent}
                className="bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  openPrintPreview({
                    type: "table",
                    title: `Daily Attendance Sheet — ${progClasses.find((c) => c.id === activeClassId)?.name ?? ""} (${selectedDate})`,
                    headers: ["Admission ID", "Student Name", "Status"],
                    rows: registerRoster.map((s) => [
                      s.admissionId,
                      s.fullName,
                      getStudentDayStatus(s.id) ?? "Unmarked",
                    ]),
                  })
                }
                className="border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Sheet
              </Button>
            </div>
          </div>

          <div className="ndh-card overflow-hidden">
            {registerRoster.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CalendarCheck2 className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                No active students enrolled in this{" "}
                {settings.labels.classSingular.toLowerCase()}.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {registerRoster.map((stu) => {
                  const currentStatus = getStudentDayStatus(stu.id);
                  return (
                    <div
                      key={stu.id}
                      className="flex flex-col justify-between gap-2.5 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#0F172A]">
                          {stu.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {stu.admissionId}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = currentStatus === opt.status;
                          return (
                            <button
                              key={opt.status}
                              type="button"
                              onClick={() =>
                                setAttendanceStatus({
                                  date: selectedDate,
                                  session: settings.currentSession,
                                  term: settings.currentTerm,
                                  programmeId: selectedProgId,
                                  classId: activeClassId,
                                  studentId: stu.id,
                                  status: opt.status,
                                })
                              }
                              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                active
                                  ? opt.activeClass
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {opt.status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <TableToolbar
            search={sumSearch}
            onSearchChange={setSumSearch}
            searchPlaceholder="Search student..."
            programmeFilter={sumProgFilter}
            onProgrammeFilterChange={setSumProgFilter}
            classFilter={sumClassFilter}
            onClassFilterChange={setSumClassFilter}
            classes={classes}
            termFilter={sumTermFilter}
            onTermFilterChange={setSumTermFilter}
            terms={settings.terms}
            settings={settings}
            onExportCsv={handleExportSummary}
            onPrint={handlePrintSummary}
          />

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">{settings.labels.classSingular}</th>
                    <th className="px-4 py-3 text-center">Present</th>
                    <th className="px-4 py-3 text-center">Late</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summaryRows.map((r) => (
                    <tr key={r.student.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F172A]">
                          {r.student.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {r.student.admissionId}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {r.className}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-800">
                        {r.summary.daysPresent}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-800">
                        {r.summary.daysLate}
                      </td>
                      <td className="px-4 py-3 text-center text-red-700">
                        {r.summary.daysAbsent}
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-[#0F172A]">
                        {r.summary.ratePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
