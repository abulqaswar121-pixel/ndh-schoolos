import { createFileRoute } from "@tanstack/react-router";
import { LoginPortalScreen } from "@/components/schoolos/LoginPortalScreen";
import { getPublicSchoolBranding } from "@/services/publicSchoolBranding.functions";
import { SchoolOSApplication } from "@/components/schoolos/SchoolOSApplication";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { useEffect } from "react";
import { offlineBranding, rememberSchoolBranding } from "@/services/offlineBranding";

export const Route = createFileRoute("/s/$schoolId")({
  loader: ({ params }) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      const saved = offlineBranding(params.schoolId);
      if (saved) return saved;
    }
    return getPublicSchoolBranding({ data: params });
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.name || "School Portal"} | NDH SchoolOS`;
    const description = `Sign in to ${loaderData?.name || "your school"}'s staff and parent portal.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "apple-mobile-web-app-title", content: loaderData?.name || "School" }], links: loaderData ? [{ rel: "manifest", href: `/api/public/school-app/${loaderData.schoolId}` }, { rel: "apple-touch-icon", href: `/api/public/school-app/${loaderData.schoolId}?icon=192` }, { rel: "icon", href: `/api/public/school-app/${loaderData.schoolId}?icon=192` }] : [] };
  },
  component: SchoolPortalPage,
});
function SchoolPortalPage() {
  const school = Route.useLoaderData();
  const { portal, cloudSchool } = useSchoolOS();
  useEffect(() => { rememberSchoolBranding(school); }, [school]);
  return portal.isAuthenticated && cloudSchool?.id === school.schoolId ? <SchoolOSApplication /> : <LoginPortalScreen schoolBranding={school} />;
}