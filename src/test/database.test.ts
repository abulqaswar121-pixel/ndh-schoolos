// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

// Ephemeral database fixtures only; these are never shipped or inserted by the app.
describe("Live database tenant policies", () => {
  it("isolates tenants, restricts teachers and parents, protects owner support, and allocates immutable receipts", async () => {
    const db = new PGlite();
    const owner = "10000000-0000-0000-0000-000000000001";
    const adminA = "10000000-0000-0000-0000-000000000002";
    const adminB = "10000000-0000-0000-0000-000000000003";
    const teacher = "10000000-0000-0000-0000-000000000004";
    const parent = "10000000-0000-0000-0000-000000000005";
    const schoolA = "20000000-0000-0000-0000-000000000001";
    const schoolB = "20000000-0000-0000-0000-000000000002";
    try {
      await db.exec(`
        create schema auth;
        create role authenticated;
        create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to authenticated;
      `);
      // pgcrypto is preinstalled by Supabase; PGlite already supplies gen_random_uuid.
      const migration = (
        await readFile(new URL("../../database/001_schoolos.sql", import.meta.url), "utf8")
      ).replace("create extension if not exists pgcrypto;", "");
      await db.exec(migration);
      for (const user of [owner, adminA, adminB, teacher, parent])
        await db.query("insert into auth.users(id) values ($1)", [user]);
      await db.query("insert into platform_owners values ($1)", [owner]);
      await db.query(
        "insert into schools(id,name,school_type) values ($1,'Test tenant A','integrated'),($2,'Test tenant B','conventional')",
        [schoolA, schoolB],
      );
      await db.query(
        "insert into school_memberships(school_id,user_id,role,assigned_class_ids) values ($1,$2,'admin','{}'),($3,$4,'admin','{}'),($1,$5,'teacher','{class-a}'),($1,$6,'parent','{}')",
        [schoolA, adminA, schoolB, adminB, teacher, parent],
      );
      await db.query(
        "insert into school_records(school_id,id,kind,class_id,payload) values ($1,'student-a','student','class-a','{}'),($1,'student-other-class','student','class-other','{}'),($2,'student-b','student','class-b','{}')",
        [schoolA, schoolB],
      );
      await db.query("insert into student_guardians values ($1,$2,$3)", [
        schoolA,
        "student-a",
        parent,
      ]);
      async function as(user: string) {
        await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${user}';`);
      }
      await as(adminA);
      expect((await db.query("select id from schools")).rows).toHaveLength(1);
      expect((await db.query("select id from school_records")).rows).toHaveLength(2);
      await expect(
        db.query("insert into school_records(school_id,id,kind) values ($1,'forbidden','class')", [
          schoolB,
        ]),
      ).rejects.toThrow();
      await expect(
        db.query("select manage_subscription($1,'Active',30)", [schoolA]),
      ).rejects.toThrow("Platform owner permission required");

      await as(teacher);
      expect((await db.query("select id from school_records")).rows).toEqual([{ id: "student-a" }]);
      await db.query(
        "insert into school_records(school_id,id,kind,class_id,student_id,payload) values ($1,'score-a','score','class-a','student-a','{}')",
        [schoolA],
      );
      await expect(
        db.query(
          "insert into school_records(school_id,id,kind,class_id,student_id,payload) values ($1,'score-forbidden','score','class-a','student-other-class','{}')",
          [schoolA],
        ),
      ).rejects.toThrow("Student must belong to the assigned class");
      await expect(
        db.query("update school_records set payload = '{\"published\":true}' where id='score-a'"),
      ).rejects.toThrow("Only school administrators");
      await as(parent);
      expect((await db.query("select id from school_records")).rows).toEqual([{ id: "student-a" }]);

      await as(adminA);
      await db.query("update school_records set payload='{\"published\":true}' where id='score-a'");
      const first = await db.query<{ receipt_number: string }>(
        "insert into fee_payments(school_id,student_id,amount,method,session,term) values ($1,'student-a',100,'Cash','2026/2027','First Term') returning receipt_number",
        [schoolA],
      );
      const second = await db.query<{ receipt_number: string }>(
        "insert into fee_payments(school_id,student_id,amount,method,session,term) values ($1,'student-a',100,'Bank','2026/2027','First Term') returning receipt_number",
        [schoolA],
      );
      expect(first.rows[0]!.receipt_number).toMatch(/^NDH-\d{4}-\d{8}$/);
      expect(first.rows[0]!.receipt_number).not.toBe(second.rows[0]!.receipt_number);
      await expect(db.query("update fee_payments set amount=1")).rejects.toThrow();
      await expect(
        db.query(
          "insert into fee_payments(school_id,student_id,amount,method,session,term,receipt_number) values ($1,'student-a',100,'Cash','2026/2027','First Term','override')",
          [schoolA],
        ),
      ).rejects.toThrow();
      await as(parent);
      expect((await db.query("select id from school_records")).rows).toHaveLength(2);
      expect((await db.query("select id from fee_payments")).rows).toHaveLength(2);
      await as(adminB);
      expect((await db.query("select id from fee_payments")).rows).toHaveLength(0);

      await as(owner);
      expect((await db.query("select id from schools")).rows).toHaveLength(2);
      expect((await db.query("select id from school_records")).rows).toHaveLength(4);
      await expect(
        db.query(
          "insert into school_records(school_id,id,kind) values ($1,'support-write','class')",
          [schoolA],
        ),
      ).rejects.toThrow();
      await db.query("select manage_subscription($1,'Suspended',0)", [schoolA]);
      await as(adminA);
      expect((await db.query("select id from school_records")).rows).toHaveLength(0);
    } finally {
      await db.close();
    }
  }, 30000);
});
