import { createFileRoute } from "@tanstack/react-router";
import { TutorialsPage } from "@/components/schoolos/public/TutorialsPage";

export const Route = createFileRoute("/tutorials")({
  component: TutorialsPage,
});
