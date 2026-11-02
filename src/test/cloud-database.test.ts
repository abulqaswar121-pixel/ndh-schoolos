// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const adminA = "00000000-0000-4000-8000-000000000001";
const adminB = "00000000-0000-4000-8000-000000000002";
const parent = "00000000-0000-4000-8000-000000000003";
const owner = "00000000-0000-4000-8000-000000000004";
let db: PGlite;
let schoolA: string;
let schoolB: string;
const snapshot = (name: string) => ({
  version: 3,
  settings: { name, code: "CLIENT-CODE", multiProgrammeEnabled: false },
  students: [{ id: "student-1", fullName: `${name} student`, classId: "class-1" }],
  classes: [{ id: "class-1", name: "JSS 1" }],
  attendance: [
    { id: "attendance-1", studentId: "student-1", classId: "class-1", status: "Present" },
  ],
  subjects: [],
  staff: [],
  feeItems: [{ id: "tuition", amount: 5000 }],
  payments: [],
  scores: [],
  auditLogs: [],
  termLocks: [],
  pendingScoreEdits: [],
  quranRecords: [],
  affective: [],
  parentNotices: [],
  payroll: [],
});
const invoice = [
  {
    id: "invoice-1",
    studentId: "student-1",
    session: "2026/2027",
    term: "First Term",
    netPayable: 5000,
    amountPaid: 0,
    balance: 5000,
  },
];
async function asUser(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`SET ROLE ${role}`);
}
async function createSchool(name: string) {
  const result = await db.query<{
    workspace: { school_id: string; revision: number; snapshot: ReturnType<typeof snapshot> };
  }>("SELECT public.create_school_workspace($1::jsonb,$2::jsonb) AS workspace", [
    JSON.stringify(snapshot(name)),
    JSON.stringify(invoice),
  ]);
  return result.rows[0]!.workspace;
}
async function save(
  schoolId: string,
  revision: number,
  name = "School A Updated",
  invoices = invoice,
) {
  return db.query<{ revision: number }>(
    "SELECT public.save_school_workspace($1::uuid,$2::bigint,$3::jsonb,$4::jsonb) AS revision",
    [schoolId, revision, JSON.stringify(snapshot(name)), JSON.stringify(invoices)],
  );
}

// Actual PostgreSQL migrations and RLS, with only Supabase's auth.uid()/roles stubbed.
// These are local integration tests, not claims of a live Supabase deployment.
describe("cloud migration, atomic writes, and school isolation", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`);
    await db.exec(readFileSync("drizzle/migrations/0000_create_schoolos_core.sql", "utf8"));
    await db.exec(readFileSync("drizzle/migrations/0001_cloud_workspaces.sql", "utf8"));
    await db.query("INSERT INTO auth.users(id) VALUES ($1),($2),($3),($4)", [
      adminA,
      adminB,
      parent,
      owner,
    ]);
    await db.query("INSERT INTO public.platform_owners(user_id) VALUES ($1)", [owner]);
    await asUser(adminA);
    schoolA = (await createSchool("School A")).school_id;
    await asUser(adminB);
    schoolB = (await createSchool("School B")).school_id;
    await db.exec("RESET ROLE");
    await db.query(
      "INSERT INTO public.school_members(school_id,user_id,role) VALUES ($1,$2,'parent')",
      [schoolA, parent],
    );
  }, 30_000);
  afterAll(async () => {
    await db?.close();
  });

  it("creates one workspace per account and assigns membership/code/trial on the server", async () => {
    await asUser(adminA);
    const repeated = await createSchool("Do not replace existing school");
    expect(repeated.school_id).toBe(schoolA);
    expect(repeated.snapshot.settings.name).toBe("School A");
    expect(repeated.snapshot.settings.code).toMatch(/^SCH-/);
    const schools = await db.query<{ subscription_status: string }>("SELECT * FROM schools");
    expect(schools.rows).toHaveLength(1);
    expect(schools.rows[0]!.subscription_status).toBe("Free Trial");
    await expect(
      db.query(
        "INSERT INTO schools(name,created_by,subscription_status) VALUES ('Forged',$1,'Free Trial')",
        [adminA],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it("reads only its own snapshots, students/classes/attendance, and invoices", async () => {
    await asUser(adminA);
    for (const table of ["school_workspaces", "school_records", "school_invoices"]) {
      const result = await db.query<{ school_id: string }>(`SELECT school_id FROM ${table}`);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.school_id === schoolA)).toBe(true);
      expect(
        (await db.query(`SELECT * FROM ${table} WHERE school_id = $1`, [schoolB])).rows,
      ).toEqual([]);
    }
    await expect(save(schoolB, 1)).rejects.toThrow(/administrator access required/i);
    await expect(
      db.query("UPDATE school_workspaces SET snapshot = '{}' WHERE school_id=$1", [schoolA]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("rejects non-owner listing and school subscription escalation", async () => {
    await asUser(adminA);
    await expect(db.query("SELECT * FROM list_registered_schools()")).rejects.toThrow(
      /owner access required/i,
    );
    expect(
      (
        await db.query("UPDATE schools SET subscription_status='Active' WHERE id=$1 RETURNING id", [
          schoolA,
        ])
      ).rows,
    ).toEqual([]);
    await expect(
      db.query("SELECT manage_subscription($1,'Active',365)", [schoolA]),
    ).rejects.toThrow(/only the platform owner/i);
  });
  it("saves atomically, reloads invoice summaries, and rejects stale revisions", async () => {
    await asUser(adminA);
    const updatedInvoice = [{ ...invoice[0]!, amountPaid: 2000, balance: 3000 }];
    expect((await save(schoolA, 1, "School A Updated", updatedInvoice)).rows[0]!.revision).toBe(2);
    const result = await db.query<{
      snapshot: { settings: { name: string; code: string }; feeInvoices: typeof invoice };
      revision: number;
    }>("SELECT snapshot,revision FROM school_workspaces WHERE school_id=$1", [schoolA]);
    expect(result.rows[0]!.snapshot.settings.name).toBe("School A Updated");
    expect(result.rows[0]!.snapshot.settings.code).toMatch(/^SCH-/);
    expect(result.rows[0]!.snapshot.feeInvoices[0]!.balance).toBe(3000);
    await expect(save(schoolA, 1, "STALE")).rejects.toThrow(/another session updated/i);
    await expect(
      save(schoolA, 2, "ROLLBACK", [
        { ...invoice[0]!, id: null } as unknown as (typeof invoice)[number],
      ]),
    ).rejects.toThrow();
    const after = await db.query<{ revision: number; name: string }>(
      "SELECT revision,snapshot->'settings'->>'name' AS name FROM school_workspaces WHERE school_id=$1",
      [schoolA],
    );
    expect(after.rows[0]).toEqual({ revision: 2, name: "School A Updated" });
  });
  it("blocks anonymous and phone-only parent access even when they know the school UUID", async () => {
    await asUser(parent);
    expect(
      (await db.query("SELECT * FROM school_workspaces WHERE school_id=$1", [schoolA])).rows,
    ).toEqual([]);
    expect(
      (await db.query("SELECT * FROM school_records WHERE school_id=$1", [schoolA])).rows,
    ).toEqual([]);
    expect(
      (await db.query("SELECT * FROM school_invoices WHERE school_id=$1", [schoolA])).rows,
    ).toEqual([]);
    await expect(save(schoolA, 2)).rejects.toThrow(/administrator access required/i);
    await asUser("", "anon");
    await expect(db.query("SELECT * FROM school_workspaces")).rejects.toThrow(/permission denied/i);
    await expect(save(schoolA, 2)).rejects.toThrow(/permission denied/i);
  });
  it("lets only the provisioned owner view the registry, not private school workspaces", async () => {
    await asUser(owner);
    const schools = await db.query<{ id: string }>("SELECT * FROM list_registered_schools()");
    expect(new Set(schools.rows.map((s) => s.id))).toEqual(new Set([schoolA, schoolB]));
    expect((await db.query("SELECT * FROM school_workspaces")).rows).toEqual([]);
    expect((await db.query("SELECT * FROM school_invoices")).rows).toEqual([]);
    await db.query("SELECT manage_subscription($1,'Suspended',0)", [schoolA]);
    await asUser(adminA);
    await expect(save(schoolA, 2)).rejects.toThrow(/subscription is inactive/i);
  });
});
