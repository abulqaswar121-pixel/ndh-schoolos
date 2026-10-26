import { createFileRoute } from "@tanstack/react-router";
import { LoginPortalScreen } from "@/components/schoolos/LoginPortalScreen";
import { SaaSOnboardingWizard } from "@/components/schoolos/SaaSOnboardingWizard";
import { SchoolOSAIAssistant } from "@/components/schoolos/landing/SchoolOSAIAssistant";
import { useSchoolOS } from "@/context/SchoolOSContext";

function LoginRoutePage() {
  const { setOnboardingWizardOpen } = useSchoolOS();

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

export const Route = createFileRoute("/login")({
  component: LoginRoutePage,
});
