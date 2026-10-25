import React, { Suspense, lazy, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { BrandHeader } from "./BrandHeader";
import { EcosystemFooter } from "./EcosystemFooter";
import { LoginPortalScreen } from "./LoginPortalScreen";
import { PrintOverlay } from "./PrintOverlay";
import { SaaSOnboardingWizard } from "./SaaSOnboardingWizard";
import { SchoolOSAIAssistant } from "./landing/SchoolOSAIAssistant";
import { useSchoolOS } from "@/context/SchoolOSContext";

// Lazy-loaded modules for fast, low-data mobile loading across Nigerian networks
const OverviewDashboard = lazy(() =>
  import("./modules/OverviewDashboard").then((m) => ({
    default: m.OverviewDashboard,
  }))
);
const StudentsModule = lazy(() =>
  import("./modules/StudentsModule").then((m) => ({
    default: m.StudentsModule,
  }))
);
const ClassesModule = lazy(() =>
  import("./modules/ClassesModule").then((m) => ({
    default: m.ClassesModule,
  }))
);
const AcademicsModule = lazy(() =>
  import("./modules/AcademicsModule").then((m) => ({
    default: m.AcademicsModule,
  }))
);
const AttendanceModule = lazy(() =>
  import("./modules/AttendanceModule").then((m) => ({
    default: m.AttendanceModule,
  }))
);
const FeesModule = lazy(() =>
  import("./modules/FeesModule").then((m) => ({
    default: m.FeesModule,
  }))
);
const ParentNoticesModule = lazy(() =>
  import("./modules/ParentNoticesModule").then((m) => ({
    default: m.ParentNoticesModule,
  }))
);
const StaffPayrollModule = lazy(() =>
  import("./modules/StaffPayrollModule").then((m) => ({
    default: m.StaffPayrollModule,
  }))
);
const AuditLogModule = lazy(() =>
  import("./modules/AuditLogModule").then((m) => ({
    default: m.AuditLogModule,
  }))
);
const SetupSettingsModule = lazy(() =>
  import("./modules/SetupSettingsModule").then((m) => ({
    default: m.SetupSettingsModule,
  }))
);
const ParentPortalView = lazy(() =>
  import("./modules/ParentPortalView").then((m) => ({
    default: m.ParentPortalView,
  }))
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
  const { portal, activeNav, setOnboardingWizardOpen } = useSchoolOS();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-[#f5f6f8] text-[#0b1220]">
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
