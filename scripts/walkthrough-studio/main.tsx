import React from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SchoolOSProvider, useSchoolOS } from "../../src/context/SchoolOSContext";
import { HomePage } from "../../src/components/schoolos/public/HomePage";
import { SchoolOSApplication } from "../../src/components/schoolos/SchoolOSApplication";
import { LoginPortalScreen } from "../../src/components/schoolos/LoginPortalScreen";
import { SaaSOnboardingWizard } from "../../src/components/schoolos/SaaSOnboardingWizard";
import { Toaster } from "../../src/components/ui/sonner";
import { demoSchool, createRecordingDatabase } from "./demo-data";
import "../../src/styles.css";
import "./recording.css";
const queryClient = new QueryClient();
const root = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <SchoolOSProvider>
        <Outlet />
        <Toaster />
      </SchoolOSProvider>
    </QueryClientProvider>
  ),
});
const home = createRoute({ getParentRoute: () => root, path: "/", component: HomePage });
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  component: () => (
    <>
      <LoginPortalScreen />
      <SaaSOnboardingWizard />
    </>
  ),
});
const app = createRoute({
  getParentRoute: () => root,
  path: "/app",
  component: SchoolOSApplication,
});
const school = createRoute({
  getParentRoute: () => root,
  path: "/s/$schoolId",
  component: function RecordingSchool() {
    const { portal } = useSchoolOS();
    return portal.isAuthenticated ? (
      <SchoolOSApplication />
    ) : (
      <LoginPortalScreen
        schoolBranding={{
          schoolId: demoSchool.id,
          name: demoSchool.name,
          logoUrl: createRecordingDatabase().settings.logoDataUrl,
          motto: "Learning together, growing together",
        }}
      />
    );
  },
});
const router = createRouter({ routeTree: root.addChildren([home, login, app, school]) });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
