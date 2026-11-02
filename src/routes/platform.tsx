import { createFileRoute } from "@tanstack/react-router";
import { PlatformDashboard } from "@/components/schoolos/PlatformDashboard";

export const Route = createFileRoute("/platform")({ component: PlatformDashboard });
