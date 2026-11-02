import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/schoolos/Workspace";

function LoginRoutePage() {
  return <Workspace initialLogin />;
}
export const Route = createFileRoute("/login")({ component: LoginRoutePage });
