import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/schoolos/public/ContactPage";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});
