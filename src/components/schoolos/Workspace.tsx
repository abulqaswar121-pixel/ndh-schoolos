import React, { lazy, Suspense, useState, useRef, useEffect } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  LogOut,
  Clock3,
  ContactRound,
  Landmark,
  Mail,
} from "lucide-react";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { DEFAULT_NDH_ECOSYSTEM_LINKS } from "@/data/ndhLinks";
import { PrintOverlay } from "./PrintOverlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportRowsToCsv, computeStudentInvoices } from "@/services/calculations";
import { getAllowedNavSections } from "@/services/accessControl";
import type { NavSectionId } from "@/types/school";
import "./workspace.css";

const RoleOverview = lazy(() =>
  import("./modules/OverviewDashboard").then((m) => ({ default: m.OverviewDashboard })),
);
const Students = lazy(() =>
  import("./modules/StudentsModule").then((m) => ({ default: m.StudentsModule })),
);
const Classes = lazy(() =>
  import("./modules/ClassesModule").then((m) => ({ default: m.ClassesModule })),
);
const Academics = lazy(() =>
  import("./modules/AcademicsModule").then((m) => ({ default: m.AcademicsModule })),
);
const Attendance = lazy(() =>
  import("./modules/AttendanceModule").then((m) => ({ default: m.AttendanceModule })),
);
const Fees = lazy(() => import("./modules/FeesModule").then((m) => ({ default: m.FeesModule })));
const Staff = lazy(() =>
  import("./modules/StaffPayrollModule").then((m) => ({ default: m.StaffPayrollModule })),
);
const Customize = lazy(() =>
  import("./modules/CustomizeDesignModule").then((m) => ({ default: m.CustomizeDesignModule })),
);
const Backups = lazy(() =>
  import("./modules/BackupsOfflineModule").then((m) => ({ default: m.BackupsOfflineModule })),
);
const SchoolSettings = lazy(() =>
  import("./modules/SetupSettingsModule").then((m) => ({ default: m.SetupSettingsModule })),
);
const Timetable = lazy(() =>
  import("./TimetableModule").then((m) => ({ default: m.TimetableModule })),
);
const Quran = lazy(() => import("./WorkspaceExtras").then((m) => ({ default: m.QuranTracker })));
const ParentPortal = lazy(() =>
  import("./modules/ParentPortalView").then((m) => ({ default: m.ParentPortalView })),
);
const IDs = lazy(() => import("./WorkspaceExtras").then((m) => ({ default: m.IdentityCards })));

type View = NavSectionId | "tahfeez" | "ids" | "reports";
const navigation: {
  title: string;
  items: { id: View; label: string; icon: typeof Users; badge?: string }[];
}[] = [
  {
    title: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "students", label: "Students", icon: Users },
      { id: "classes", label: "Classes & groups", icon: Building2 },
      { id: "academics", label: "Academics & results", icon: GraduationCap },
      { id: "tahfeez", label: "Tahfeez & Islamiyya", icon: BookOpen, badge: "NEW" },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { id: "fees", label: "Fees & payments", icon: Wallet },
      { id: "staff", label: "Staff & payroll", icon: ContactRound },
      { id: "ids", label: "ID cards", icon: CreditCard },
      { id: "reports", label: "Reports", icon: ChartNoAxesCombined },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [{ id: "settings", label: "School settings", icon: Settings }],
  },
];
const details: Partial<
  Record<View, { title: string; subtitle: string; add: string; icon: typeof Users }>
> = {
  students: {
    title: "Students",
    subtitle: "Every learner. Every milestone. All in one place.",
    add: "Add Student",
    icon: Users,
  },
  classes: {
    title: "Classes & groups",
    subtitle: "Organize your school, your way.",
    add: "Add Class",
    icon: Building2,
  },
  academics: {
    title: "Academics & results",
    subtitle: "From continuous assessment to terminal report cards.",
    add: "Set up academics",
    icon: GraduationCap,
  },
  tahfeez: {
    title: "Tahfeez & Islamiyya",
    subtitle: "Nurture knowledge, memorization, and beautiful recitation.",
    add: "Add Progress",
    icon: BookOpen,
  },
  attendance: {
    title: "Attendance",
    subtitle: "Make every school day count.",
    add: "Take Attendance",
    icon: ClipboardCheck,
  },
  fees: {
    title: "Fees & payments",
    subtitle: "A clearer picture of your school finances.",
    add: "Create Fee Structure",
    icon: Wallet,
  },
  staff: {
    title: "Staff & payroll",
    subtitle: "Support the people who make your school possible.",
    add: "Add Staff",
    icon: ContactRound,
  },
  ids: {
    title: "ID cards",
    subtitle: "School identity, beautifully simplified.",
    add: "Create ID Card",
    icon: CreditCard,
  },
  reports: {
    title: "Reports",
    subtitle: "Turn your school records into useful insights.",
    add: "View Academics",
    icon: ChartNoAxesCombined,
  },
  settings: {
    title: "School settings",
    subtitle: "Make SchoolOS feel like your school.",
    add: "Set Up School",
    icon: Settings,
  },
};

export function Workspace({ initialLogin = false }: { initialLogin?: boolean } = {}) {
  const { db, portal, logoutSession, setActiveNav } = useSchoolOS();
  const [view, setView] = useState<View>("overview");
  const [attendanceTab, setAttendanceTab] = useState("daily");
  const [settingsTab, setSettingsTab] = useState("profile");
  const [mobile, setMobile] = useState(false);
  const [setup, setSetup] = useState(false);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("First Term");
  const [login, setLogin] = useState(initialLogin);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTerm(db.settings.currentTerm);
  }, [db.settings.currentTerm]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearch("");
        setNotifications(false);
        setProfile(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const ready = portal.isAuthenticated && db.settings.setupCompleted;
  const visibleNavigation = navigation.map((g) => ({
    ...g,
    items: g.items.filter((i) => {
      if (!ready) return true;
      const allowed = getAllowedNavSections(
        portal.role,
        db.settings.enableQuranModule,
        portal.isExamOfficer,
      );
      if (i.id === "tahfeez") return ["admin", "muallim", "class_teacher"].includes(portal.role);
      if (i.id === "ids") return ["admin", "secretary"].includes(portal.role);
      if (i.id === "reports") return allowed.includes("academics");
      return allowed.includes(i.id as NavSectionId);
    }),
  }));
  const navigate = (id: View) => {
    if (!visibleNavigation.some((g) => g.items.some((i) => i.id === id))) {
      toast.error("This module is not available for your role.");
      return;
    }
    setView(id);
    setMobile(false);
    if (!["tahfeez", "ids", "reports"].includes(id)) setActiveNav(id as NavSectionId);
  };
  const requireSetup = (id: View) => {
    navigate(id);
    if (!ready) setSetup(true);
  };
  const allItems = visibleNavigation.flatMap((g) => g.items);
  const selected = allItems.find((i) => i.id === view);
  const info = details[view];
  return (
    <div className="os-workspace">
      {mobile && (
        <button
          className="os-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`os-sidebar ${mobile ? "is-open" : ""}`}>
        <a className="os-brand" href="/" aria-label="NDH SchoolOS home">
          <span className="os-logo">
            <GraduationCap size={25} strokeWidth={1.7} />
          </span>
          <span>
            School<span className="os-brand-green">OS</span>
            <small>BY NAJEEB DIGITAL HUB</small>
          </span>
        </a>
        <button
          className="os-school-switch"
          onClick={() => (ready ? navigate("settings") : setSetup(true))}
        >
          <span className="os-school-icon">
            <Building2 size={19} />
          </span>
          <span>
            {ready ? db.settings.name : "Your school workspace"}
            <small>{ready ? portal.schoolCode : "Let’s get you set up"}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav aria-label="Main navigation">
          {visibleNavigation
            .filter((g) => g.items.length)
            .map((group) => (
              <div className="os-nav-group" key={group.title}>
                <p>{group.title}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`os-nav-item ${view === item.id ? "active" : ""}`}
                  >
                    <item.icon size={18} strokeWidth={1.7} />
                    <span>{item.label}</span>
                    {item.badge && <b>{item.badge}</b>}
                    {view === item.id && <span className="os-active-dot" />}
                  </button>
                ))}
              </div>
            ))}
        </nav>
        <div className="os-sidebar-bottom">
          <div className="os-help-card">
            <span className="os-help-symbol">
              <Sparkles size={19} />
            </span>
            <h4>A little help goes a long way.</h4>
            <p>We’re here to help your school thrive.</p>
            <button onClick={() => setHelp(true)}>
              Visit help centre <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="os-side-account" onClick={() => setProfile(!profile)}>
            <span className="os-avatar">
              {ready ? portal.displayName.slice(0, 2).toUpperCase() : "SA"}
            </span>
            <span>
              {ready ? portal.displayName : "School Administrator"}
              <small>{ready ? portal.role.replaceAll("_", " ") : "Your school. Simplified."}</small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <div className="os-main">
        <header className="os-topbar">
          <div className="os-breadcrumb">
            <button
              className="os-mobile-toggle os-icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{selected?.label || "Reports"}</strong>
          </div>
          <div className="os-header-actions">
            <div className="os-global-search">
              <Search size={17} />
              <input
                ref={searchRef}
                aria-label="Search workspace"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything..."
              />
              <kbd>⌘ K</kbd>
              {search && (
                <div className="os-search-results">
                  {allItems
                    .filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
                    .map((i) => (
                      <button
                        key={i.id}
                        onClick={() => {
                          navigate(i.id);
                          setSearch("");
                        }}
                      >
                        <i.icon size={16} />
                        {i.label}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  {!allItems.some((i) => i.label.toLowerCase().includes(search.toLowerCase())) && (
                    <p>No modules found.</p>
                  )}
                </div>
              )}
            </div>
            <span className="os-header-divider" />
            <button className="os-icon-button" title="Help centre" onClick={() => setHelp(true)}>
              <CircleHelp size={20} />
            </button>
            <div className="os-popover-anchor">
              <button
                className="os-icon-button"
                aria-label="Notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={20} />
              </button>
              {notifications && (
                <div className="os-popover">
                  <h4>Notifications</h4>
                  <Bell size={26} />
                  <p>You’re all caught up.</p>
                  <small>School updates will appear here.</small>
                </div>
              )}
            </div>
            <button
              className="os-header-avatar"
              aria-label="Account menu"
              onClick={() => setProfile(!profile)}
            >
              {ready ? portal.displayName.slice(0, 2).toUpperCase() : "SA"}
            </button>
          </div>
        </header>
        {profile && (
          <div className="os-profile-menu">
            <strong>{ready ? portal.displayName : "Welcome to SchoolOS"}</strong>
            <a className="os-text-button" href="/platform">
              <ShieldCheck size={14} />
              NDH owner portal
            </a>
            <small>{ready ? db.settings.name : "Set up your school to get started"}</small>
            <button
              onClick={() => {
                setProfile(false);
                if (ready) navigate("settings");
                else setSetup(true);
              }}
            >
              <Settings size={16} />
              {ready ? "School settings" : "Set up school"}
            </button>
            <button
              onClick={() => {
                setProfile(false);
                if (ready) {
                  logoutSession();
                  navigate("overview");
                } else setLogin(true);
              }}
            >
              <LogOut size={16} />
              {ready ? "Sign out" : "Sign in to your school"}
            </button>
          </div>
        )}
        <main className="os-content">
          <div className="os-page-heading">
            <div>
              <div className="os-eyebrow">YOUR SCHOOL, CONNECTED</div>
              <h1>{view === "overview" ? "School overview" : info?.title}</h1>
              <p>
                {view === "overview"
                  ? "A fresh start. A clear view. Everything you need to move your school forward."
                  : info?.subtitle}
              </p>
            </div>
            <div className="os-page-filters">
              <span className="os-session">
                <CalendarDays size={15} />
                {db.settings.currentSession} session
              </span>
              {view === "overview" && (
                <label className="os-term">
                  <select
                    aria-label="Academic term"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  >
                    {db.settings.terms.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
              )}
            </div>
          </div>
          {ready && portal.role === "parent" ? (
            <Suspense fallback={<div className="os-loading">Loading your student portal…</div>}>
              <ParentPortal />
            </Suspense>
          ) : ready && portal.role !== "admin" && view === "overview" ? (
            <Suspense fallback={<div className="os-loading">Loading your portal…</div>}>
              <RoleOverview />
            </Suspense>
          ) : view === "overview" ? (
            <Overview
              ready={ready}
              term={term}
              navigate={navigate}
              setup={() => setSetup(true)}
              action={requireSetup}
            />
          ) : (
            <>
              {!ready ? (
                <EmptyModule view={view} onAdd={() => setSetup(true)} />
              ) : (
                <Suspense fallback={<div className="os-loading">Loading your workspace…</div>}>
                  <div className="os-module">
                    {view === "students" && <Students />}
                    {view === "classes" && <Classes />}
                    {(view === "academics" || view === "reports") && <Academics />}
                    {view === "attendance" && (
                      <>
                        <div className="os-view-tabs no-print">
                          <button
                            className={attendanceTab === "daily" ? "selected" : ""}
                            onClick={() => setAttendanceTab("daily")}
                          >
                            Daily attendance
                          </button>
                          <button
                            className={attendanceTab === "timetable" ? "selected" : ""}
                            onClick={() => setAttendanceTab("timetable")}
                          >
                            Weekly timetable
                          </button>
                        </div>
                        {attendanceTab === "daily" ? (
                          <>
                            <WeeklyAttendanceExport />
                            <Attendance />
                          </>
                        ) : (
                          <Timetable />
                        )}
                      </>
                    )}
                    {view === "fees" && <Fees />}
                    {view === "staff" && <Staff />}
                    {view === "settings" && (
                      <>
                        <div className="os-view-tabs no-print">
                          {[
                            { id: "profile", label: "School profile" },
                            { id: "branding", label: "Branding & report design" },
                            { id: "backups", label: "Backups & exports" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              className={settingsTab === t.id ? "selected" : ""}
                              onClick={() => setSettingsTab(t.id)}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        {settingsTab === "profile" ? (
                          <SchoolSettings />
                        ) : settingsTab === "branding" ? (
                          <Customize />
                        ) : (
                          <Backups />
                        )}
                      </>
                    )}
                    {view === "tahfeez" && <Quran />}
                    {view === "ids" && <IDs />}
                  </div>
                </Suspense>
              )}
            </>
          )}
          <footer className="os-footer">
            <span>
              © {new Date().getFullYear()} NDH SchoolOS <span className="os-footer-dot">·</span>{" "}
              Built for schools. Made for impact.
            </span>
            <div>
              <span>PART OF THE NDH FAMILY</span>
              {DEFAULT_NDH_ECOSYSTEM_LINKS.slice(0, 3).map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer">
                  {l.label === "Najeeb Digital Hub" ? "NDH Hub" : l.label}
                  <ArrowUpRight size={11} />
                </a>
              ))}
            </div>
          </footer>
        </main>
      </div>
      <Onboarding open={setup} close={() => setSetup(false)} />
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="os-dialog">
          <DialogHeader>
            <DialogTitle>A little guidance, a big difference.</DialogTitle>
            <DialogDescription>
              Your school’s next chapter starts with a few simple steps.
            </DialogDescription>
          </DialogHeader>
          <div className="os-help-content">
            <BookOpen size={32} />
            <h3>Start with your school profile</h3>
            <p>
              Choose your school type, create your classes, then register your students and staff.
              From there, attendance, results, and fees all work together.
            </p>
            <div className="os-local-note">
              <ShieldCheck size={20} />
              <span>
                This workspace currently saves to this browser. A live database and server
                authentication must be configured before storing sensitive production records.
              </span>
            </div>
            <a href="mailto:support@ndh.com.ng" className="os-primary">
              <Mail size={16} />
              Contact NDH support
            </a>
          </div>
        </DialogContent>
      </Dialog>
      <SignIn open={login && !ready} close={() => setLogin(false)} />
      <PrintOverlay />
    </div>
  );
}

function Overview({
  ready,
  term,
  navigate,
  setup,
  action,
}: {
  ready: boolean;
  term: string;
  navigate: (id: View) => void;
  setup: () => void;
  action: (id: View) => void;
}) {
  const { db, portal } = useSchoolOS();
  const paid = db.payments
    .filter(
      (p) =>
        p.term === term &&
        p.session === db.settings.currentSession &&
        p.confirmationStatus !== "Pending Confirmation",
    )
    .reduce((s, p) => s + p.amount, 0);
  const expectedFees = db.students
    .filter((s) => s.status === "Active")
    .reduce(
      (sum, student) =>
        sum +
        computeStudentInvoices({
          student,
          allStudents: db.students,
          feeItems: db.feeItems,
          payments: db.payments,
          settings: db.settings,
          session: db.settings.currentSession,
          term,
        }).reduce((total, invoice) => total + invoice.netPayable, 0),
      0,
    );
  const collectionPercent =
    expectedFees > 0 ? Math.min(100, Math.round((paid / expectedFees) * 100)) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = db.attendance.filter((a) => a.date === today);
  const rate = todayAttendance.length
    ? Math.round(
        (todayAttendance.filter((a) => a.status === "Present" || a.status === "Late").length /
          todayAttendance.length) *
          100,
      )
    : null;
  const steps = [
    {
      title: "Make it your school",
      desc: "Add your school details, logo, and academic calendar.",
      icon: Building2,
      done: ready,
      click: () => (ready ? navigate("settings") : setup()),
    },
    {
      title: "Create your classes",
      desc: "Set up classes or halqahs that fit your school.",
      icon: BookOpen,
      done: db.classes.length > 0,
      click: () => action("classes"),
    },
    {
      title: "Welcome your students",
      desc: "Register your first students and link their guardians.",
      icon: Users,
      done: db.students.length > 0,
      click: () => action("students"),
    },
    {
      title: "Bring your team on board",
      desc: "Add teachers, ustadhs, and other staff members.",
      icon: ContactRound,
      done: db.staff.some((s) => s.systemRole !== "admin"),
      click: () => action("staff"),
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  const metrics = [
    {
      label: "Total students",
      value: db.students.filter((s) => s.status === "Active").length.toLocaleString(),
      note: "Students enrolled",
      icon: Users,
      color: "green",
      target: "students" as View,
    },
    {
      label: "Staff members",
      value: db.staff.length.toLocaleString(),
      note: "Your school team",
      icon: ContactRound,
      color: "blue",
      target: "staff" as View,
    },
    {
      label: "Fees collected",
      value: `${db.settings.currencySymbol}${paid.toLocaleString()}`,
      note: `${term} collections`,
      icon: Wallet,
      color: "amber",
      target: "fees" as View,
    },
    {
      label: "Attendance today",
      value: rate === null ? "—" : `${rate}%`,
      note: todayAttendance.length
        ? `${todayAttendance.length} records today`
        : "No attendance recorded yet",
      icon: ClipboardCheck,
      color: "purple",
      target: "attendance" as View,
    },
  ];
  return (
    <>
      <section className="os-welcome">
        <div className="os-welcome-copy">
          <span className="os-welcome-tag">
            <span /> A BETTER SCHOOL DAY STARTS HERE
          </span>
          <h2>
            {ready
              ? `Welcome back, ${portal.displayName.split(" ")[0]}.`
              : "Big possibilities. One simple workspace."}
          </h2>
          <p>
            {ready
              ? "A little less administration. A lot more education. Let’s make today count."
              : "From the first roll call to the final report card, bring every part of your school together."}
          </p>
          <div className="os-welcome-bottom">
            <button
              className="os-welcome-button"
              onClick={ready ? () => navigate("students") : setup}
            >
              {ready ? "Manage your students" : "Let’s set up your school"}
              <ArrowRight size={16} />
            </button>
            <span>
              <ShieldCheck size={14} />
              Your school. Your workspace.
            </span>
          </div>
        </div>
        <SchoolIllustration />
      </section>
      <section className="os-metrics" aria-label="School metrics">
        {metrics.map((m) => (
          <button className="os-metric" key={m.label} onClick={() => navigate(m.target)}>
            <div className="os-metric-top">
              <span>{m.label}</span>
              <span className={`os-metric-icon ${m.color}`}>
                <m.icon size={19} strokeWidth={1.6} />
              </span>
            </div>
            <strong>{m.value}</strong>
            <div className="os-metric-note">
              <span className={`os-note-dot ${m.color}`} />
              {m.note}
              <ArrowUpRight size={14} />
            </div>
          </button>
        ))}
      </section>
      <div className="os-middle-grid">
        <section className="os-panel os-setup-panel">
          <div className="os-panel-heading">
            <div>
              <h3>
                Let’s get your school ready <span className="os-soft-tag">GETTING STARTED</span>
              </h3>
              <p>Small steps now. Smoother school days ahead.</p>
            </div>
            <span
              className="os-progress-ring"
              style={{ "--progress": `${completed * 25}%` } as React.CSSProperties}
            >
              {completed}/4
            </span>
          </div>
          <div className="os-progress-track">
            <span style={{ width: `${completed * 25}%` }} />
          </div>
          <div className="os-setup-steps">
            {steps.map((s, i) => (
              <button key={s.title} onClick={s.click} className="os-setup-step">
                <span className={`os-step-number ${s.done ? "done" : ""}`}>
                  {s.done ? <Check size={15} /> : String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.desc}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          <div className="os-setup-foot">
            <Sparkles size={14} />
            <span>A workspace that grows with your school. At your pace.</span>
          </div>
        </section>
        <section className="os-panel os-quick-panel">
          <div className="os-panel-heading">
            <div>
              <h3>Quick actions</h3>
              <p>Less clicking. More doing.</p>
            </div>
            <span className="os-tiny-icon">
              <Sparkles size={17} />
            </span>
          </div>
          <div className="os-quick-grid">
            {[
              {
                label: "Add student",
                hint: "Welcome a new learner",
                icon: Users,
                id: "students" as View,
                color: "green",
              },
              {
                label: "Take attendance",
                hint: "Start the school day",
                icon: ClipboardCheck,
                id: "attendance" as View,
                color: "blue",
              },
              {
                label: "Record payment",
                hint: "Keep fees up to date",
                icon: Wallet,
                id: "fees" as View,
                color: "amber",
              },
              {
                label: "Enter results",
                hint: "Celebrate progress",
                icon: FileText,
                id: "academics" as View,
                color: "purple",
              },
            ].map((a) => (
              <button key={a.id} onClick={() => action(a.id)}>
                <span className={`os-action-icon ${a.color}`}>
                  <a.icon size={21} strokeWidth={1.6} />
                </span>
                <strong>{a.label}</strong>
                <small>{a.hint}</small>
                <ArrowUpRight size={13} className="os-quick-arrow" />
              </button>
            ))}
          </div>
          <div className="os-tip">
            <span>GOOD TO KNOW</span>
            <p>
              Conventional, Islamiyya, or both.
              <br />
              One workspace, built around you.
            </p>
            <BookOpen size={31} strokeWidth={1.2} />
          </div>
        </section>
      </div>
      <div className="os-bottom-grid">
        <section className="os-panel os-finance-panel">
          <div className="os-panel-heading">
            <div>
              <h3>Fee collection overview</h3>
              <p>A little clarity for your school’s finances.</p>
            </div>
            <button className="os-text-button" onClick={() => navigate("fees")}>
              View fees <ArrowRight size={14} />
            </button>
          </div>
          <div className="os-finance-body">
            <div
              className="os-donut"
              style={{ background: `conic-gradient(#7e9b69 ${collectionPercent}%, #f0f2e9 0)` }}
              aria-label={`${collectionPercent}% of expected fees collected`}
            >
              <div>
                <span>TOTAL COLLECTED</span>
                <strong>
                  {db.settings.currencySymbol}
                  {paid.toLocaleString()}
                </strong>
                <small>{term}</small>
              </div>
            </div>
            <div className="os-finance-empty">
              <span className="os-inline-icon amber">
                <Wallet size={20} />
              </span>
              <h4>
                {db.payments.length ? "Your collections, in one place" : "A fresh financial start"}
              </h4>
              <p>
                {db.payments.length
                  ? `${db.payments.filter((p) => p.term === term).length} payments recorded for this term.`
                  : "Create your fee structure to start tracking payments and balances."}
              </p>
              <button className="os-text-button" onClick={() => action("fees")}>
                {db.payments.length ? "View payments" : "Set up school fees"}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="os-finance-legend">
            <span>
              <i className="collected" />
              Collected
            </span>
            <span>
              <i className="outstanding" />
              Outstanding
            </span>
            <small>
              {db.payments.length
                ? "Based on recorded payments"
                : "Your real data will appear here"}
            </small>
          </div>
        </section>
        <section className="os-panel os-activity-panel">
          <div className="os-panel-heading">
            <div>
              <h3>Recent activity</h3>
              <p>The latest from your school.</p>
            </div>
            <Clock3 size={17} className="os-muted" />
          </div>
          {db.auditLogs.length ? (
            <div className="os-activity-list">
              {db.auditLogs.slice(0, 3).map((a) => (
                <div key={a.id}>
                  <span className="os-inline-icon green">
                    <CheckCheck size={16} />
                  </span>
                  <span>
                    <strong>{a.action}</strong>
                    <small>{a.targetLabel}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="os-activity-empty">
              <span className="os-empty-art">
                <Clock3 size={29} strokeWidth={1.4} />
                <span>
                  <Plus size={11} />
                </span>
              </span>
              <h4>Your school’s story starts here</h4>
              <p>
                Student registrations, payments, and school
                <br className="os-desktop-break" /> updates will appear right here.
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="os-trust-line">
        <ShieldCheck size={14} />
        <span>A dedicated workspace for your school.</span>
        <i /> <span>Built for conventional & Islamic education</span>
        <span className="os-local-badge">Browser workspace</span>
      </div>
    </>
  );
}

function WeeklyAttendanceExport() {
  const { db } = useSchoolOS();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const exportWeekly = () => {
    const start = new Date(`${date}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    const from = start.toISOString().slice(0, 10);
    start.setUTCDate(start.getUTCDate() + 7);
    const until = start.toISOString().slice(0, 10);
    const records = db.attendance.filter((a) => a.date >= from && a.date < until);
    exportRowsToCsv(
      `attendance-week-${from}.csv`,
      ["Admission Number", "Student", "Present", "Absent", "Late", "Excused", "Week Starting"],
      db.students
        .filter((s) => records.some((a) => a.studentId === s.id))
        .map((s) => [
          s.admissionId,
          s.fullName,
          ...["Present", "Absent", "Late", "Excused"].map(
            (status) => records.filter((a) => a.studentId === s.id && a.status === status).length,
          ),
          from,
        ]),
    );
  };
  return (
    <div className="os-weekly-export no-print">
      <span>
        <CalendarDays size={16} />
        Weekly attendance summary
      </span>
      <label>
        Week containing{" "}
        <input
          type="date"
          aria-label="Week containing date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button className="os-secondary" onClick={exportWeekly} disabled={!date}>
        <ArrowDownToLine size={14} />
        Export weekly CSV
      </button>
    </div>
  );
}

function EmptyModule({ view, onAdd }: { view: View; onAdd: () => void }) {
  const info = details[view]!;
  const [query, setQuery] = useState("");
  return (
    <section className="os-panel os-empty-module">
      <div className="os-table-toolbar">
        <div className="os-table-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${info.title.toLowerCase()}...`}
          />
        </div>
        <select aria-label="Filter by class">
          <option>All classes</option>
        </select>
        <select aria-label="Filter by term">
          <option>All terms</option>
          <option>First Term</option>
          <option>Second Term</option>
          <option>Third Term</option>
        </select>
        <button
          className="os-secondary"
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob(["Name,Class,Term\n"], { type: "text/csv" }));
            a.download = `${view}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <ArrowDownToLine size={15} />
          Export CSV
        </button>
        <button className="os-secondary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="os-module-empty-body">
        <span className="os-large-empty-icon">
          <info.icon size={34} strokeWidth={1.3} />
        </span>
        <h3>{query ? "No matching records" : `Your ${info.title.toLowerCase()} start here`}</h3>
        <p>
          {query
            ? "Try another search or add your first record."
            : "Nothing here yet. Set up your school to start adding your own records."}
        </p>
        <button className="os-primary" onClick={onAdd}>
          <Plus size={16} />
          {info.add}
        </button>
        <small>No sample records. Just your school’s real data.</small>
      </div>
    </section>
  );
}

function Onboarding({ open, close }: { open: boolean; close: () => void }) {
  const { completeSchoolOnboarding, db } = useSchoolOS();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"conventional" | "islamic" | "integrated">("conventional");
  const [form, setForm] = useState({
    name: "",
    country: "Nigeria",
    address: "",
    phone: "",
    session: db.settings.currentSession,
    classes: "",
    admin: "",
    contact: "",
    pin: "",
  });
  const [logo, setLogo] = useState<string>();
  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    completeSchoolOnboarding({
      schoolName: form.name,
      country: form.country,
      schoolPhone: form.phone,
      schoolAddress: form.address,
      currencyCode: "NGN",
      currencySymbol: "₦",
      multiProgrammeEnabled: type === "integrated",
      schoolType: type,
      additionalProgrammeNames: type === "integrated" ? ["Islamiyya / Tahfeez"] : [],
      currentSession: form.session,
      classNames: form.classes
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      adminName: form.admin,
      adminContact: form.contact,
      adminPin: form.pin,
      logoDataUrl: logo,
    });
    toast.success("Your school workspace is ready. Welcome to SchoolOS!");
    close();
    setStep(0);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="os-dialog os-onboarding">
        <DialogHeader>
          <span className="os-modal-eyebrow">LET’S BUILD SOMETHING GREAT</span>
          <DialogTitle>Make room for your school.</DialogTitle>
          <DialogDescription>
            A few details, and you’re ready for a better school day.
          </DialogDescription>
        </DialogHeader>
        <div className="os-wizard-progress">
          {["Your school", "Academic setup", "Your account"].map((s, i) => (
            <span key={s} className={step >= i ? "current" : ""}>
              <b>{step > i ? <Check size={12} /> : i + 1}</b>
              {s}
            </span>
          ))}
        </div>
        <form onSubmit={submit} className="os-form">
          {step === 0 && (
            <>
              <label>
                School name
                <input
                  required
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="Enter your school’s official name"
                />
              </label>
              <label>School type</label>
              <div className="os-school-types">
                {[
                  {
                    id: "conventional",
                    icon: GraduationCap,
                    name: "Conventional",
                    hint: "Nursery, primary & secondary",
                  },
                  {
                    id: "islamic",
                    icon: BookOpen,
                    name: "Islamiyya / Tahfeez",
                    hint: "Islamic & Quran education",
                  },
                  {
                    id: "integrated",
                    icon: Building2,
                    name: "Integrated",
                    hint: "The best of both, together",
                  },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setType(t.id as typeof type)}
                    className={type === t.id ? "selected" : ""}
                  >
                    <t.icon size={23} />
                    <strong>{t.name}</strong>
                    <small>{t.hint}</small>
                    {type === t.id && <Check size={13} />}
                  </button>
                ))}
              </div>
              <div className="os-form-row">
                <label>
                  Country
                  <input
                    required
                    value={form.country}
                    onChange={(e) => change("country", e.target.value)}
                  />
                </label>
                <label>
                  School phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => change("phone", e.target.value)}
                    placeholder="School contact number"
                  />
                </label>
              </div>
              <label>
                School address
                <input
                  value={form.address}
                  onChange={(e) => change("address", e.target.value)}
                  placeholder="Your school’s address"
                />
              </label>
              <label>
                School logo <span className="os-muted">(optional)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("Choose an image smaller than 2 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setLogo(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                Academic session
                <input
                  required
                  pattern="[0-9]{4}/[0-9]{4}"
                  value={form.session}
                  onChange={(e) => change("session", e.target.value)}
                  placeholder="YYYY/YYYY"
                />
              </label>
              <label>
                Your class or halqah names <span className="os-muted">(optional)</span>
                <textarea
                  rows={5}
                  value={form.classes}
                  onChange={(e) => change("classes", e.target.value)}
                  placeholder="Enter one class name per line. You can also add classes later."
                />
              </label>
              <div className="os-local-note">
                <BookOpen size={21} />
                <span>
                  No classes or subjects are added automatically. Everything starts with the names
                  you choose.
                </span>
              </div>
              <div className="os-grade-preview">
                <strong>Nigerian grading, ready for you</strong>
                <span>
                  CA 1 <b>20</b> + CA 2 <b>20</b> + Exam <b>60</b> = <b>100</b>
                </span>
                <small>Customize your grading scale anytime in School settings.</small>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <label>
                Your full name
                <input
                  required
                  value={form.admin}
                  onChange={(e) => change("admin", e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                Email or phone number
                <input
                  required
                  value={form.contact}
                  onChange={(e) => change("contact", e.target.value)}
                  placeholder="For your administrator account"
                />
              </label>
              <label>
                Create an administrator PIN
                <input
                  required
                  type="password"
                  minLength={6}
                  pattern="[0-9]{6,}"
                  value={form.pin}
                  onChange={(e) => change("pin", e.target.value)}
                  placeholder="At least 6 digits"
                  autoComplete="new-password"
                />
              </label>
              <div className="os-local-note">
                <ShieldCheck size={24} />
                <span>
                  <strong>Browser workspace</strong>
                  <br />
                  Records are stored on this device. Live database and secure server authentication
                  require deployment configuration. Keep backups and avoid sensitive data until
                  connected.
                </span>
              </div>
            </>
          )}
          <div className="os-form-actions">
            {step > 0 ? (
              <button type="button" className="os-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            ) : (
              <button type="button" className="os-secondary" onClick={close}>
                Maybe later
              </button>
            )}
            <button className="os-primary" type="submit">
              {step === 2 ? "Create school workspace" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SignIn({ open, close }: { open: boolean; close: () => void }) {
  const { loginProductionStaff, loginProductionParent } = useSchoolOS();
  const [kind, setKind] = useState("staff");
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="os-dialog">
        <DialogHeader>
          <DialogTitle>Welcome back to your school.</DialogTitle>
          <DialogDescription>Sign in to the school registered on this browser.</DialogDescription>
        </DialogHeader>
        <form
          className="os-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const result =
              kind === "staff"
                ? loginProductionStaff({
                    identifier: String(f.get("identifier")),
                    pin: String(f.get("pin")),
                    schoolCode: String(f.get("code")),
                  })
                : loginProductionParent({
                    phone: String(f.get("phone")),
                    admissionNumber: String(f.get("admission")),
                    schoolCode: String(f.get("code")),
                  });
            if (result.ok) {
              close();
              toast.success("Welcome back.");
            } else setError(result.error || "Unable to sign in.");
          }}
        >
          <label>
            Portal
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="staff">Staff / Administrator</option>
              <option value="parent">Parent / Student</option>
            </select>
          </label>
          <label>
            School code
            <input name="code" required />
          </label>
          {kind === "staff" ? (
            <>
              <label>
                Staff ID, email or phone
                <input name="identifier" required />
              </label>
              <label>
                PIN
                <input name="pin" type="password" required />
              </label>
            </>
          ) : (
            <>
              <label>
                Admission number
                <input name="admission" required />
              </label>
              <label>
                Registered guardian phone
                <input name="phone" type="tel" required />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="os-error">
              {error}
            </p>
          )}
          <button className="os-primary" type="submit">
            Sign in <ArrowRight size={16} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SchoolIllustration() {
  return (
    <div className="os-school-illustration" aria-hidden="true">
      <svg viewBox="0 0 440 230" fill="none">
        <defs>
          <linearGradient
            id="schoolwall"
            x1="180"
            y1="65"
            x2="240"
            y2="205"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#dce7e6" />
            <stop offset="1" stopColor="#b8cdca" />
          </linearGradient>
          <linearGradient
            id="schoolroof"
            x1="230"
            y1="45"
            x2="230"
            y2="115"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#70968e" />
            <stop offset="1" stopColor="#4d746d" />
          </linearGradient>
        </defs>
        <circle cx="284" cy="127" r="94" fill="#fff" fillOpacity=".025" />
        <circle cx="284" cy="127" r="113" stroke="#fff" strokeOpacity=".05" strokeDasharray="4 7" />
        <path d="M68 204H422" stroke="#8caaa1" strokeOpacity=".3" />
        <ellipse cx="251" cy="206" rx="157" ry="10" fill="#071d27" fillOpacity=".3" />
        <path d="M137 112H337V202H137z" fill="url(#schoolwall)" />
        <path d="M123 114L153 83H323L352 114H123Z" fill="url(#schoolroof)" />
        <path d="M198 82H279V203H198z" fill="#e7eeea" />
        <path d="M189 84L238 43L288 84H189Z" fill="#73968c" />
        <path d="M200 80L238 49L276 80H200Z" fill="#c5d9d0" />
        <path d="M238 22V47" stroke="#d9e9de" strokeWidth="2" />
        <path d="M239 22H261L255 29L261 35H239V22Z" fill="#77b395" />
        <circle cx="238" cy="70" r="9" fill="#f1f5e9" />
        <path d="M238 64V70L242 73" stroke="#638279" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M224 165C224 145 252 145 252 165V203H224V165Z" fill="#214c4a" />
        <path d="M238 155V202" stroke="#82a798" />
        <circle cx="234" cy="180" r="1.3" fill="#d6c28a" />
        <circle cx="242" cy="180" r="1.3" fill="#d6c28a" />
        {[152, 176, 289, 313].map((x) => (
          <g key={x}>
            <rect x={x} y="127" width="13" height="22" rx="1" fill="#3c6260" />
            <path d={`M${x + 6.5} 127V149M${x} 137H${x + 13}`} stroke="#a2c0b2" strokeWidth="1.5" />
            <rect x={x} y="163" width="13" height="22" rx="1" fill="#3c6260" />
            <path d={`M${x + 6.5} 163V185M${x} 173H${x + 13}`} stroke="#a2c0b2" strokeWidth="1.5" />
          </g>
        ))}
        <rect x="212" y="95" width="53" height="14" rx="2" fill="#51796d" />
        <text
          x="238"
          y="104"
          textAnchor="middle"
          fill="#edf3dc"
          fontSize="6.3"
          fontFamily="sans-serif"
          letterSpacing="1"
        >
          YOUR SCHOOL
        </text>
        <path d="M214 201H262L271 208H205L214 201Z" fill="#a6c0b4" />
        <path d="M112 161V204" stroke="#869e7b" strokeWidth="4" />
        <path
          d="M112 116C85 132 78 161 92 169C102 176 123 174 133 164C143 154 131 130 112 116Z"
          fill="#4c7e66"
        />
        <path d="M112 140V178M112 157L100 147M112 165L124 150" stroke="#78a286" strokeWidth="1.5" />
        <path d="M376 151V204" stroke="#869e7b" strokeWidth="4" />
        <path
          d="M376 101C349 119 339 150 354 163C365 172 386 170 399 156C410 143 396 116 376 101Z"
          fill="#648d70"
        />
        <path d="M376 129V176M376 149L364 139M376 158L389 142" stroke="#91b08b" strokeWidth="1.5" />
        <path d="M82 202C78 191 86 186 91 198C91 186 103 186 100 202" fill="#799873" />
        <path d="M343 202C338 188 350 183 352 197C355 182 366 187 362 202" fill="#799873" />
        <path
          d="M166 42L173 37L180 42M322 61L328 57L334 61"
          stroke="#a7c5b3"
          strokeOpacity=".5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M117 71H150M124 66H143"
          stroke="#a7c5b3"
          strokeOpacity=".2"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="331" cy="31" r="3" fill="#b4d5aa" fillOpacity=".5" />
        <path d="M194 28V36M190 32H198" stroke="#b4d5aa" strokeOpacity=".7" />
      </svg>
    </div>
  );
}
