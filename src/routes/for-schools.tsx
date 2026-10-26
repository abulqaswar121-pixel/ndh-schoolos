import { createFileRoute } from "@tanstack/react-router";
import { ForSchoolsPage } from "@/components/schoolos/public/ForSchoolsPage";

export const Route = createFileRoute("/for-schools")({
  component: ForSchoolsPage,
});
