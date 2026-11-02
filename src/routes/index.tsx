import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/schoolos/public/HomePage";

export const Route = createFileRoute("/")({
  component: HomePage,
});
