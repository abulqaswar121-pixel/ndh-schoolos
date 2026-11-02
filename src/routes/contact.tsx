import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/schoolos/public/ContactPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us \u2014 NDH SchoolOS" },
      { name: "description", content: "Talk to the Najeeb Digital Hub team about setting up NDH SchoolOS for your school." },
      { property: "og:title", content: "Contact Us \u2014 NDH SchoolOS" },
      { property: "og:description", content: "Talk to the Najeeb Digital Hub team about setting up NDH SchoolOS for your school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});
