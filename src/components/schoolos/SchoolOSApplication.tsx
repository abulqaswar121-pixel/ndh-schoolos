import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { BrandHeader } from "./BrandHeader";
import { EcosystemFooter } from "./EcosystemFooter";
import { LoginPortalScreen } from "./LoginPortalScreen";
import { PrintOverlay } from "./PrintOverlay";
import { SaaSOnboardingWizard } from "./SaaSOnboardingWizard";
import { SchoolOSAIAssistant } from "./landing/SchoolOSAIAssistant";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  getResolvedCustomization,
  getWorkspaceFontStack,
} from "@/services/customizationDefaults";

// Lazy-loaded modules + idle pre-warming so switching modules works 100% offline with zero data
const loadOverview = () => import("./modules/OverviewDashboard");
const loadStudents = () => import("./modules/StudentsModule");
const loadClasses = () => import("./modules/ClassesModule");
const loadAcademics = () => import("./modules/AcademicsModule");
const loadAttendance = () => import("./modules/AttendanceModule");
const loadFees = () => import("./modules/FeesModule");
const loadNotices = () => import("./modules/ParentNoticesModule");
const loadStaff = () => import("./modules/StaffPayrollModule");
const loadAudit = () => import("./modules/AuditLogModule");
const loadCustomize = () => import("./modules/CustomizeDesignModule");
const loadBackups = () => import("./modules/BackupsOfflineModule");
const loadSettings = () => import("./modules/SetupSettingsModule");
const loadParent = () => import("./modules/ParentPortalView");

const OverviewDashboard = lazy(() =>
  loadOverview().then((m) => ({ default: m.OverviewDashboard }))
);
const StudentsModule = lazy(() =>
  loadStudents().then((m) => ({ default: m.StudentsModule }))
);
const ClassesModule = lazy(() =>
  loadClasses().then((m) => ({ default: m.ClassesModule }))
);
const AcademicsModule = lazy(() =>
  loadAcademics().then((m) => ({ default: m.AcademicsModule }))
);
const AttendanceModule = lazy(() =>
  loadAttendance().then((m) => ({ default: m.AttendanceModule }))
);
const FeesModule = lazy(() =>
  loadFees().then((m) => ({ default: m.FeesModule }))
);
const ParentNoticesModule = lazy(() =>
  loadNotices().then((m) => ({ default: m.ParentNoticesModule }))
);
const StaffPayrollModule = lazy(() =>
  loadStaff().then((m) => ({ default: m.StaffPayrollModule }))
);
const AuditLogModule = lazy(() =>
  loadAudit().then((m) => ({ default: m.AuditLogModule }))
);
const CustomizeDesignModule = lazy(() =>
  loadCustomize().then((m) => ({ default: m.CustomizeDesignModule }))
);
const BackupsOfflineModule = lazy(() =>
  loadBackups().then((m) => ({ default: m.BackupsOfflineModule }))
);
const SetupSettingsModule = lazy(() =>
  loadSettings().then((m) => ({ default: m.SetupSettingsModule }))
);
const ParentPortalView = lazy(() =>
  loadParent().then((m) => ({ default: m.ParentPortalView }))
);

function ModuleLoadingFallback() {
  return (
    <div className="ndh-card p-6 text-xs font-semibold text-slate-500">
      Loading module...
    </div>
  );
}

/**
 * Authenticated School Platform Workspace (`/app`)
 */
export function SchoolOSApplication() {
  const { db, portal, activeNav, setOnboardingWizardOpen } = useSchoolOS();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const custom = getResolvedCustomization(db.settings);
  const workspaceFontFamily = getWorkspaceFontStack(
    custom.workspaceTheme.workspaceFont
  );

  const preloadAllModules = useCallback(() => {
    return Promise.allSettled([
      loadOverview(),
      loadStudents(),
      loadClasses(),
      loadAcademics(),
      loadAttendance(),
      loadFees(),
      loadNotices(),
      loadStaff(),
      loadAudit(),
      loadCustomize(),
      loadBackups(),
      loadSettings(),
      loadParent(),
    ]);
  }, []);

  // Pre-warm lazy chunks on idle after sign-in so all modules work offline seamlessly
  useEffect(() => {
    if (!portal.isAuthenticated) return;
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("jsdom")
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void preloadAllModules();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [portal.isAuthenticated, preloadAllModules]);

  if (!portal.isAuthenticated) {
    return (
      <>
        <LoginPortalScreen />
        <SchoolOSAIAssistant
          onStartPilot={() => setOnboardingWizardOpen(true)}
        />
        <SaaSOnboardingWizard />
      </>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f5f6f8] text-[#0b1220]"
      style={{ fontFamily: workspaceFontFamily }}
    >
      <BrandHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1">
        <AppSidebar
          mobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<ModuleLoadingFallback />}>
              {portal.role === "parent" ? (
                <ParentPortalView />
              ) : (
                <>
                  {activeNav === "overview" && <OverviewDashboard />}
                  {activeNav === "students" && <StudentsModule />}
                  {activeNav === "classes" && <ClassesModule />}
                  {activeNav === "academics" && <AcademicsModule />}
                  {activeNav === "attendance" && <AttendanceModule />}
                  {activeNav === "fees" && <FeesModule />}
                  {activeNav === "notices" && <ParentNoticesModule />}
                  {activeNav === "staff" && <StaffPayrollModule />}
                  {activeNav === "audit" && <AuditLogModule />}
                  {activeNav === "customize" && <CustomizeDesignModule />}
                  {activeNav === "backups" && (
                    <BackupsOfflineModule
                      preloadAllModules={preloadAllModules}
                    />
                  )}
                  {activeNav === "settings" && <SetupSettingsModule />}
                </>
              )}
            </Suspense>
          </div>
        </main>
      </div>

      <EcosystemFooter />
      <SaaSOnboardingWizard />
      <PrintOverlay />
    </div>
  );
}
