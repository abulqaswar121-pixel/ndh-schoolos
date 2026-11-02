import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/schoolos/public/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NDH SchoolOS \u2014 School Management for Nigerian Schools" },
      { name: "description", content: "Run attendance, results, report cards, fees, payroll and Tahfeez records from one simple platform built for Nigerian schools." },
      { property: "og:title", content: "NDH SchoolOS \u2014 School Management for Nigerian Schools" },
      { property: "og:description", content: "Run attendance, results, report cards, fees, payroll and Tahfeez records from one simple platform built for Nigerian schools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});
