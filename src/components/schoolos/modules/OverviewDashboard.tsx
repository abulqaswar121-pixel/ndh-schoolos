import {
  AlertCircle,
  BellRing,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Coins,
  GraduationCap,
  Lock,
  Printer,
  Settings2,
  Users,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TableToolbar } from "../TableToolbar";
import { Button } from "@/components/ui/button";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  computeStudentAttendanceSummary,
  computeStudentInvoices,
  exportRowsToCsv,
  formatCurrency,
  getStudentClassName,
  isStudentInProgramme,
} from "@/services/calculations";
import type { ProgrammeId } from "@/types/school";

export function OverviewDashboard() {
  const { db, portal, setActiveNav, openPrintPreview } = useSchoolOS();
  const {
    settings,
    students,
    classes,
    subjects,
    scores,
    attendance,
    feeItems,
    payments,
    pendingScoreEdits,
  } = db;
  const cur = settings.currencySymbol;

  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeId | "all">(
    "all"
  );
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState(settings.currentTerm);

  const canSeeFinance = portal.role === "admin" || portal.role === "bursar";
  const canPrintReport = portal.role !== "bursar" && portal.role !== "subject_teacher";

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === "Active"),
    [students]
  );

  // Finance KPIs (Admin & Bursar only)
  const financeMetrics = useMemo(() => {
    if (!canSeeFinance) {
      return {
        totalExpected: 0,
        totalCollected: 0,
        totalBalance: 0,
        debtorsCount: 0,
        pendingTransfers: 0,
      };
    }
    let totalExpected = 0;
    let totalCollected = 0;
    let totalBalance = 0;
    let debtorsCount = 0;

    activeStudents.forEach((stu) => {
      const invs = computeStudentInvoices({
        student: stu,
        allStudents: students,
        feeItems,
        payments,
        settings,
        session: settings.currentSession,
        term: termFilter,
      });
      const stuBal = invs.reduce((s, i) => s + i.balance, 0);
      totalExpected += invs.reduce((s, i) => s + i.netPayable, 0);
      totalCollected += invs.reduce((s, i) => s + i.amountPaid, 0);
      totalBalance += stuBal;
      if (stuBal > 0) debtorsCount += 1;
    });

    const pendingTransfers = payments.filter(
      (p) =>
        p.term === termFilter &&
        p.confirmationStatus === "Pending Confirmation"
    ).length;

    return {
      totalExpected,
      totalCollected,
      totalBalance,
      debtorsCount,
      pendingTransfers,
    };
  }, [
    canSeeFinance,
    activeStudents,
    students,
    feeItems,
    payments,
    settings,
    termFilter,
  ]);

  // Attendance average across authorized students
  const avgAttendance = useMemo(() => {
    if (activeStudents.length === 0 || attendance.length === 0) return 0;
    const sum = activeStudents.reduce((acc, stu) => {
      const att = computeStudentAttendanceSummary({
        attendance,
        studentId: stu.id,
        session: settings.currentSession,
        term: termFilter,
        configuredDaysOpened: settings.daysSchoolOpened,
      });
      return acc + att.ratePercent;
    }, 0);
    return Math.round(sum / activeStudents.length);
  }, [activeStudents, attendance, settings, termFilter]);

  const pendingApprovalsCount = useMemo(
    () => pendingScoreEdits.filter((p) => p.status === "pending").length,
    [pendingScoreEdits]
  );

  // Class enrollment chart (authorized classes only)
  const classChartData = useMemo(() => {
    return classes
      .map((cls) => ({
        name: cls.name,
        students: activeStudents.filter(
          (s) => s.programmeClasses[cls.programmeId] === cls.id
        ).length,
      }))
      .filter((d) => d.students > 0 || classes.length <= 6);
  }, [classes, activeStudents]);

  const feePieData = useMemo(
    () => [
      {
        name: "Collected",
        value: Math.max(0, financeMetrics.totalCollected),
        color: "#0F766E",
      },
      {
        name: "Balance Owing",
        value: Math.max(0, financeMetrics.totalBalance),
        color: "#DC2626",
      },
    ],
    [financeMetrics]
  );

  // Filtered rows for Student Standing Table
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeStudents
      .filter((stu) => {
        if (
          programmeFilter !== "all" &&
          !isStudentInProgramme(stu, programmeFilter)
        ) {
          return false;
        }
        if (
          classFilter !== "all" &&
          !Object.values(stu.programmeClasses).includes(classFilter)
        ) {
          return false;
        }
        if (!q) return true;
        const clsLabel = getStudentClassName(stu, classes, settings);
        return (
          stu.fullName.toLowerCase().includes(q) ||
          stu.admissionId.toLowerCase().includes(q) ||
          stu.guardianName.toLowerCase().includes(q) ||
          clsLabel.toLowerCase().includes(q)
        );
      })
      .map((stu) => {
        const att = computeStudentAttendanceSummary({
          attendance,
          studentId: stu.id,
          session: settings.currentSession,
          term: termFilter,
          configuredDaysOpened: settings.daysSchoolOpened,
        });
        const invs = canSeeFinance
          ? computeStudentInvoices({
              student: stu,
              allStudents: students,
              feeItems,
              payments,
              settings,
              session: settings.currentSession,
              term: termFilter,
            })
          : [];
        const balance = invs.reduce((s, i) => s + i.balance, 0);
        const stuScores = scores.filter(
          (sc) =>
            sc.studentId === stu.id &&
            sc.session === settings.currentSession &&
            sc.term === termFilter
        );
        return {
          student: stu,
          className: getStudentClassName(stu, classes, settings, programmeFilter),
          attendanceRate: att.ratePercent,
          subjectsRecorded: stuScores.length,
          balance,
        };
      });
  }, [
    activeStudents,
    programmeFilter,
    classFilter,
    search,
    classes,
    settings,
    attendance,
    termFilter,
    canSeeFinance,
    students,
    feeItems,
    payments,
    scores,
  ]);

  const handleExportCsv = () => {
    const headers = [
      "Admission ID",
      "Student Name",
      settings.labels.classSingular,
      "Guardian",
      "Guardian Phone",
      ...(portal.role !== "bursar" ? ["Subjects Scored", "Attendance %"] : []),
      ...(canSeeFinance ? ["Fee Balance"] : []),
    ];
    exportRowsToCsv(
      `${settings.code}_dashboard_summary`,
      headers,
      tableRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        r.className,
        r.student.guardianName,
        r.student.parentPhone,
        ...(portal.role !== "bursar"
          ? [r.subjectsRecorded, `${r.attendanceRate}%`]
          : []),
        ...(canSeeFinance ? [formatCurrency(r.balance, cur)] : []),
      ])
    );
  };

  const handlePrintTable = () => {
    const headers = [
      "Admission ID",
      "Student Name",
      settings.labels.classSingular,
      "Guardian Phone",
      ...(portal.role !== "bursar" ? ["Attendance"] : []),
      ...(canSeeFinance ? ["Fee Balance"] : []),
    ];
    openPrintPreview({
      type: "table",
      title: `${settings.name} — ${termFilter} Summary`,
      subtitle: `${tableRows.length} active students`,
      headers,
      rows: tableRows.map((r) => [
        r.student.admissionId,
        r.student.fullName,
        r.className,
        r.student.parentPhone,
        ...(portal.role !== "bursar" ? [`${r.attendanceRate}%`] : []),
        ...(canSeeFinance ? [formatCurrency(r.balance, cur)] : []),
      ]),
    });
  };

  return (
    <div className="space-y-7">
      {/* Header Banner Card with School Campus Cover Photo */}
      <div className="ndh-card overflow-hidden">
        <div className="grid grid-cols-1 items-center lg:grid-cols-12">
          <div className="space-y-4 p-6 sm:p-7 lg:col-span-8">
            <div>
              <div className="text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
                {settings.currentSession} • {termFilter}
              </div>
              <h1 className="font-display mt-1 text-xl font-bold text-[#0b1220] sm:text-2xl">
                {portal.role === "admin"
                  ? `${settings.name} — School Dashboard`
                  : `${portal.displayName}`}
              </h1>
              <p className="mt-1 text-xs text-[#364152] sm:text-sm">
                {portal.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {portal.role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveNav("settings")}
                  className="border-[#d0d5dd] bg-white text-xs font-semibold text-[#0b1220] hover:bg-[#f5f6f8] hover:text-[#0b1220]"
                >
                  <Settings2 className="mr-1.5 h-3.5 w-3.5 text-[#1a4a6e]" />
                  School Settings
                </Button>
              )}
              {(portal.role === "admin" ||
                portal.role === "class_teacher" ||
                portal.role === "subject_teacher") && (
                <Button
                  size="sm"
                  onClick={() => setActiveNav("academics")}
                  className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
                >
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  Enter Scores & Results
                </Button>
              )}
              {portal.role === "bursar" && (
                <Button
                  size="sm"
                  onClick={() => setActiveNav("fees")}
                  className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
                >
                  <Coins className="mr-1.5 h-3.5 w-3.5" />
                  Record Fee Payment
                </Button>
              )}
              {portal.role === "secretary" && (
                <Button
                  size="sm"
                  onClick={() => setActiveNav("attendance")}
                  className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
                >
                  <CalendarCheck2 className="mr-1.5 h-3.5 w-3.5" />
                  Mark Daily Attendance
                </Button>
              )}
            </div>
          </div>

          <div className="hidden h-full min-h-[155px] overflow-hidden border-l border-[#e4e7ec] lg:col-span-4 lg:block">
            <img
              src="/images/ndh-cover-campus-v3.jpg"
              alt="Nigerian school campus"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Live Quick-Start Guide when Workspace has 0 Students */}
      {portal.role === "admin" && students.length === 0 && (
        <div className="ndh-card border-[#9ed9d6] bg-[#edf7f6] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
                Live Workspace Ready • Zero Sample Clutter
              </div>
              <h2 className="font-display mt-0.5 text-base font-bold text-[#0b1220] sm:text-lg">
                Start your school operations in 4 quick steps
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#364152]">
              {classes.length} classes & {subjects.length} subjects ready
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveNav("staff")}
              className="cursor-pointer rounded-xl border border-[#9ed9d6] bg-white p-3.5 text-left transition hover:border-[#1a4a6e] hover:shadow-xs"
            >
              <div className="text-[11px] font-extrabold text-[#1a4a6e]">
                STEP 1 • STAFF LOGINS
              </div>
              <div className="mt-1 text-xs font-bold text-[#0b1220]">
                Add Teachers, Bursar & Secretary
              </div>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                Issue Staff IDs & PINs scoped to assigned classes/subjects.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("fees")}
              className="cursor-pointer rounded-xl border border-[#9ed9d6] bg-white p-3.5 text-left transition hover:border-[#1a4a6e] hover:shadow-xs"
            >
              <div className="text-[11px] font-extrabold text-[#1a4a6e]">
                STEP 2 • FEE STRUCTURE
              </div>
              <div className="mt-1 text-xs font-bold text-[#0b1220]">
                Set Term Tuition & Levies (₦)
              </div>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                Configure class fee schedules and sibling discounts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("students")}
              className="cursor-pointer rounded-xl border border-[#9ed9d6] bg-white p-3.5 text-left transition hover:border-[#1a4a6e] hover:shadow-xs"
            >
              <div className="text-[11px] font-extrabold text-[#1a4a6e]">
                STEP 3 • ADMISSIONS
              </div>
              <div className="mt-1 text-xs font-bold text-[#0b1220]">
                Admit Your First Students
              </div>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                Register pupils & link guardian phone numbers for Parent Portal.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("settings")}
              className="cursor-pointer rounded-xl border border-[#9ed9d6] bg-white p-3.5 text-left transition hover:border-[#1a4a6e] hover:shadow-xs"
            >
              <div className="text-[11px] font-extrabold text-[#1a4a6e]">
                STEP 4 • BANK & CREST
              </div>
              <div className="mt-1 text-xs font-bold text-[#0b1220]">
                Add School Bank Account
              </div>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                Shown automatically on parent fee statements & receipts.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Actionable Alerts (Pending Score Approvals / Pending Bank Transfers) */}
      {(portal.role === "admin" && pendingApprovalsCount > 0) ||
      (canSeeFinance && financeMetrics.pendingTransfers > 0) ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {portal.role === "admin" && pendingApprovalsCount > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-xs">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 shrink-0 text-amber-800" />
                <div>
                  <div className="font-bold text-amber-950">
                    {pendingApprovalsCount} Published Result Edit{" "}
                    {pendingApprovalsCount === 1 ? "Request" : "Requests"}
                  </div>
                  <div className="mt-0.5 text-amber-900">
                    A teacher requested a score change on published results.
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveNav("academics")}
                className="bg-amber-800 text-xs font-bold text-white hover:bg-amber-900"
              >
                Review
              </Button>
            </div>
          )}

          {canSeeFinance && financeMetrics.pendingTransfers > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-sky-300 bg-sky-50 p-5 text-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
                <div>
                  <div className="font-bold text-[#0F172A]">
                    {financeMetrics.pendingTransfers} Bank Transfer{" "}
                    {financeMetrics.pendingTransfers === 1 ? "" : "s"} Awaiting Confirmation
                  </div>
                  <div className="mt-0.5 text-slate-700">
                    Confirm transfer reference in Fees to issue official receipt.
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveNav("fees")}
                className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                Confirm
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Balanced Equal-Height KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>
              {portal.role === "class_teacher" ||
              portal.role === "subject_teacher"
                ? "Assigned Students"
                : "Active Students"}
            </span>
            <GraduationCap className="h-4 w-4 text-[#1E3A8A]" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-[#0F172A]">
            {activeStudents.length}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Across {classes.length} authorized{" "}
            {classes.length === 1
              ? settings.labels.classSingular.toLowerCase()
              : settings.labels.classPlural.toLowerCase()}
          </p>
        </div>

        {canSeeFinance ? (
          <>
            <div className="ndh-card flex h-full flex-col justify-between p-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Fees Collected ({termFilter})</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-emerald-800">
                {formatCurrency(financeMetrics.totalCollected, cur)}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Of {formatCurrency(financeMetrics.totalExpected, cur)} billed
              </p>
            </div>

            <div className="ndh-card flex h-full flex-col justify-between p-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Fees Owing (Debtors)</span>
                <Coins className="h-4 w-4 text-red-600" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-red-700">
                {formatCurrency(financeMetrics.totalBalance, cur)}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                {financeMetrics.debtorsCount} students with unpaid balance
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="ndh-card flex h-full flex-col justify-between p-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Assigned Subjects</span>
                <BookOpen className="h-4 w-4 text-[#1E3A8A]" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-[#0F172A]">
                {subjects.length}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                {subjects.map((s) => s.code).join(", ") || "No subjects"}
              </p>
            </div>

            <div className="ndh-card flex h-full flex-col justify-between p-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Authorized {settings.labels.classPlural}</span>
                <Users className="h-4 w-4 text-[#1E3A8A]" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-[#0F172A]">
                {classes.length}
              </div>
              <p className="mt-1.5 truncate text-xs text-slate-600">
                {classes.map((c) => c.name).join(", ") || "None"}
              </p>
            </div>
          </>
        )}

        <div className="ndh-card flex h-full flex-col justify-between p-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>
              {portal.role === "bursar" ? "Parent Notices" : "Term Attendance"}
            </span>
            {portal.role === "bursar" ? (
              <BellRing className="h-4 w-4 text-[#1E3A8A]" />
            ) : (
              <CalendarCheck2 className="h-4 w-4 text-[#1E3A8A]" />
            )}
          </div>
          <div className="mt-3 text-2xl font-extrabold text-[#0F172A]">
            {portal.role === "bursar"
              ? `${settings.smsCreditsBalance} SMS`
              : `${avgAttendance}%`}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            {portal.role === "bursar"
              ? "Send fee reminders via SMS or WhatsApp"
              : `${settings.daysSchoolOpened} school days opened`}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div
          className={`ndh-card p-6 sm:p-7 ${
            canSeeFinance ? "lg:col-span-7" : "lg:col-span-12"
          }`}
        >
          <h2 className="text-sm font-extrabold text-[#0F172A]">
            Students per {settings.labels.classSingular}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Active student count in your authorized {settings.labels.classPlural.toLowerCase()}
          </p>
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#334155" }}
                />
                <Tooltip />
                <Bar dataKey="students" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {canSeeFinance && (
          <div className="ndh-card p-6 sm:p-7 lg:col-span-5">
            <h2 className="text-sm font-extrabold text-[#0F172A]">
              {termFilter} Fee Collection vs Balance
            </h2>
            <p className="text-xs text-slate-500">
              Confirmed receipts vs unpaid fee balances
            </p>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feePieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {feePieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(Number(val), cur)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Authorized Student Standing Table */}
      {portal.role !== "subject_teacher" && (
        <div>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search student name, admission ID or parent..."
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
            onPrint={handlePrintTable}
            totalCountLabel={`Showing ${tableRows.length} of ${activeStudents.length} authorized students`}
          />

          <div className="ndh-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">{settings.labels.classSingular}</th>
                    <th className="px-4 py-3">Parent / Phone</th>
                    {portal.role !== "bursar" && (
                      <th className="px-4 py-3 text-center">Attendance</th>
                    )}
                    {canSeeFinance && (
                      <th className="px-4 py-3 text-right">Fee Balance</th>
                    )}
                    {canPrintReport && (
                      <th className="px-4 py-3 text-right">Report Card</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tableRows.map((row) => (
                    <tr key={row.student.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F172A]">
                          {row.student.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {row.student.admissionId}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.className}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {row.student.guardianName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.student.parentPhone}
                        </div>
                      </td>
                      {portal.role !== "bursar" && (
                        <td className="px-4 py-3 text-center font-semibold text-slate-800">
                          {row.attendanceRate}%
                        </td>
                      )}
                      {canSeeFinance && (
                        <td
                          className={`px-4 py-3 text-right font-bold ${
                            row.balance > 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {row.balance > 0
                            ? formatCurrency(row.balance, cur)
                            : "Paid"}
                        </td>
                      )}
                      {canPrintReport && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPrintPreview({
                                type: "report_card",
                                studentId: row.student.id,
                                session: settings.currentSession,
                                term: termFilter,
                                layout: settings.reportCardDefaultLayout,
                              })
                            }
                            className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5 text-[#1E3A8A]" />
                            Report Card
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
