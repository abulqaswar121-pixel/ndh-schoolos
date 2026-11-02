import { createFileRoute } from "@tanstack/react-router";
import { FeaturesPage } from "@/components/schoolos/public/FeaturesPage";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features \u2014 NDH SchoolOS" },
      { name: "description", content: "See every NDH SchoolOS tool: students, CA and exam grading, report cards, fees, payroll, attendance and Quran memorisation tracking." },
      { property: "og:title", content: "Features \u2014 NDH SchoolOS" },
      { property: "og:description", content: "See every NDH SchoolOS tool: students, CA and exam grading, report cards, fees, payroll, attendance and Quran memorisation tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});
