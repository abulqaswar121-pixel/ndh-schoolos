import { createFileRoute } from "@tanstack/react-router";
import { SchoolOSApplication } from "@/components/schoolos/SchoolOSApplication";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "School Workspace \u2014 NDH SchoolOS" },
      { name: "description", content: "Your school's private workspace for students, results, fees, staff and reports." },
      { property: "og:title", content: "School Workspace \u2014 NDH SchoolOS" },
      { property: "og:description", content: "Your school's private workspace for students, results, fees, staff and reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchoolOSApplication,
});
