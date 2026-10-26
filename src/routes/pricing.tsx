import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/components/schoolos/public/PricingPage";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});
