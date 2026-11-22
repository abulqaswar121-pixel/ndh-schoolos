// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

describe("School short links in the database", () => {
  it("enforces unique links and permits old UUID-only school links", async () => {
    const database = new PGlite();
    try {
      await database.exec("CREATE TABLE public.school_portal_branding (school_id text PRIMARY KEY, name text NOT NULL)");
      await database.exec(readFileSync("drizzle/migrations/0006_school_short_links.sql", "utf8"));
      await database.exec("INSERT INTO public.school_portal_branding (school_id,name,slug) VALUES ('school-a','School A','markaz'),('school-b','School B',NULL),('school-c','School C',NULL)");
      await expect(database.exec("UPDATE public.school_portal_branding SET slug='markaz' WHERE school_id='school-b'")).rejects.toThrow(/unique/i);
      await expect(database.exec("UPDATE public.school_portal_branding SET slug='api' WHERE school_id='school-b'")).rejects.toThrow(/school_slug_format/);
      await database.exec("UPDATE public.school_portal_branding SET slug='markaz-school' WHERE school_id='school-a'");
      const result = await database.query<{ school_id: string }>("SELECT school_id FROM public.school_portal_branding WHERE slug='markaz-school'");
      expect(result.rows[0]?.school_id).toBe("school-a");
    } finally { await database.close(); }
  });
});