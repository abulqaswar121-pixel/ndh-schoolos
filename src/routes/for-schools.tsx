import { createFileRoute } from "@tanstack/react-router";
import { ForSchoolsPage } from "@/components/schoolos/public/ForSchoolsPage";

export const Route = createFileRoute("/for-schools")({
  head: () => ({
    meta: [
      { title: "For Schools \u2014 NDH SchoolOS" },
      { name: "description", content: "How conventional, Islamiyya and integrated schools run their daily work with NDH SchoolOS." },
      { property: "og:title", content: "For Schools \u2014 NDH SchoolOS" },
      { property: "og:description", content: "How conventional, Islamiyya and integrated schools run their daily work with NDH SchoolOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForSchoolsPage,
});
