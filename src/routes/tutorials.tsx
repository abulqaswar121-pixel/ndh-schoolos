import { createFileRoute } from "@tanstack/react-router";
import { TutorialsPage } from "@/components/schoolos/public/TutorialsPage";

export const Route = createFileRoute("/tutorials")({
  head: () => ({
    meta: [
      { title: "Video Tutorials \u2014 NDH SchoolOS" },
      { name: "description", content: "Short video guides that show admins, teachers, bursars and parents how to use NDH SchoolOS." },
      { property: "og:title", content: "Video Tutorials \u2014 NDH SchoolOS" },
      { property: "og:description", content: "Short video guides that show admins, teachers, bursars and parents how to use NDH SchoolOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TutorialsPage,
});
