import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { LoginPortalScreen } from "@/components/schoolos/LoginPortalScreen";

const getBranding = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const client = createClient(process.env['SUPABASE_URL']!, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
    const { data: row, error } = await client.from("school_portal_branding").select("school_id,name,logo_url,motto").eq("school_id", data.schoolId).maybeSingle();
    if (error) throw new Error("School portal is temporarily unavailable.");
    if (!row) throw notFound();
    return { schoolId: String(row.school_id), name: String(row.name), logoUrl: row.logo_url ? String(row.logo_url) : undefined, motto: String(row.motto || "") };
  });

export const Route = createFileRoute("/s/$schoolId")({
  loader: async ({ params }) => { if (!z.string().uuid().safeParse(params.schoolId).success) throw notFound(); return getBranding({ data: params }); },
  head: ({ loaderData }) => {
    const title = `${loaderData?.name || "School Portal"} | NDH SchoolOS`;
    const description = `Sign in to ${loaderData?.name || "your school"}'s staff and parent portal.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: SchoolPortalPage,
});
function SchoolPortalPage() { return <LoginPortalScreen schoolBranding={Route.useLoaderData()} />; }