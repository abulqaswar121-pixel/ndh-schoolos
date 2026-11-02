import { createFileRoute } from "@tanstack/react-router";
import { SchoolOSApplication } from "@/components/schoolos/SchoolOSApplication";

export const Route = createFileRoute("/app")({
  component: SchoolOSApplication,
});
