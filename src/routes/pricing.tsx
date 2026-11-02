import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/components/schoolos/public/PricingPage";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing \u2014 NDH SchoolOS" },
      { name: "description", content: "Simple per-session plans for nursery, primary, secondary and Islamiyya schools using NDH SchoolOS." },
      { property: "og:title", content: "Pricing \u2014 NDH SchoolOS" },
      { property: "og:description", content: "Simple per-session plans for nursery, primary, secondary and Islamiyya schools using NDH SchoolOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});
