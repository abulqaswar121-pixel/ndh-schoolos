import { createFileRoute } from "@tanstack/react-router";
import { FeaturesPage } from "@/components/schoolos/public/FeaturesPage";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});
