import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/schoolos/Workspace";

export const Route = createFileRoute("/app")({
  component: Workspace,
});
