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
  head: () => ({
    meta: [
      { title: "Sign In or Register \u2014 NDH SchoolOS" },
      { name: "description", content: "Sign in to your school workspace or register a new school on NDH SchoolOS." },
      { property: "og:title", content: "Sign In or Register \u2014 NDH SchoolOS" },
      { property: "og:description", content: "Sign in to your school workspace or register a new school on NDH SchoolOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginRoutePage,
});
