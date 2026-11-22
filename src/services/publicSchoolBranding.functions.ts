import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
import { validSchoolSlug } from "./schoolApp";

export const getPublicSchoolBranding = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().max(100) }).parse(input))
  .handler(async ({ data }) => {
    const uuid = z.string().uuid().safeParse(data.schoolId).success;
    if (!uuid && !validSchoolSlug(data.schoolId)) throw notFound();
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const client = createClient(process.env['SUPABASE_URL']!, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key); return fetch(input, { ...init, headers });
    } } });
    const { data: row, error } = await client.from("school_portal_branding").select("school_id,name,logo_url,motto,slug").eq(uuid ? "school_id" : "slug", data.schoolId).maybeSingle();
    if (error) throw new Error("School portal is temporarily unavailable.");
    if (!row) throw notFound();
    return { schoolId: String(row.school_id), name: String(row.name), ...(row.logo_url ? { logoUrl: String(row.logo_url) } : {}), motto: String(row.motto || ""), slug: row.slug ? String(row.slug) : null };
  });