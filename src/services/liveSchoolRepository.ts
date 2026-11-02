import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionStatus = "Free Trial" | "Active" | "Expired" | "Suspended";
export interface PlatformSchool {
  id: string;
  name: string;
  school_type: "conventional" | "islamic" | "integrated";
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  created_at: string;
}
export type RecordKind =
  | "student"
  | "class"
  | "subject"
  | "staff"
  | "score"
  | "quran"
  | "attendance"
  | "fee_structure"
  | "payroll"
  | "timetable";
export interface LiveSchoolRecord<T = Record<string, unknown>> {
  id: string;
  school_id: string;
  kind: RecordKind;
  class_id: string | null;
  student_id: string | null;
  session: string | null;
  term: string | null;
  payload: T;
}

let instance: SupabaseClient | null = null;
export function getLiveClient(): SupabaseClient | null {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !key) return null;
  instance ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "ndh_live_session" },
  });
  return instance;
}
function client() {
  const db = getLiveClient();
  if (!db)
    throw new Error(
      "Live database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  return db;
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** The live repository uses the authenticated user's JWT. Never use a service-role key here. */
export const liveSchoolRepository = {
  async signIn(email: string, password: string) {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    check(error);
    return data.session;
  },
  async signOut() {
    const { error } = await client().auth.signOut();
    check(error);
  },
  async isPlatformOwner() {
    const { data: auth } = await client().auth.getUser();
    if (!auth.user) return false;
    const { data, error } = await client()
      .from("platform_owners")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    check(error);
    return Boolean(data);
  },
  async listSchools(): Promise<PlatformSchool[]> {
    const { data, error } = await client()
      .from("schools")
      .select("id,name,school_type,subscription_status,subscription_expires_at,created_at")
      .order("created_at", { ascending: false });
    check(error);
    return (data || []).map((school) => ({
      ...school,
      subscription_status: (["Active", "Free Trial"].includes(school.subscription_status) &&
      school.subscription_expires_at &&
      new Date(school.subscription_expires_at).getTime() <= Date.now()
        ? "Expired"
        : school.subscription_status) as SubscriptionStatus,
    }));
  },
  async platformTotals(): Promise<{ students: number; revenue: number }> {
    const [students, payments] = await Promise.all([
      client()
        .from("school_records")
        .select("id", { count: "exact", head: true })
        .eq("kind", "student"),
      client().from("subscription_payments").select("amount"),
    ]);
    check(students.error);
    check(payments.error);
    return {
      students: students.count || 0,
      revenue: (payments.data || []).reduce((sum, p) => sum + Number(p.amount), 0),
    };
  },
  async addSchool(name: string, schoolType: PlatformSchool["school_type"]) {
    const { data, error } = await client()
      .from("schools")
      .insert({ name: name.trim(), school_type: schoolType })
      .select()
      .single();
    check(error);
    return data as PlatformSchool;
  },
  async setSubscription(schoolId: string, status: SubscriptionStatus, renew = false) {
    const { error } = await client().rpc("manage_subscription", {
      target_school: schoolId,
      next_status: status,
      renew_days: renew ? 30 : 0,
    });
    check(error);
  },
  async records<T = Record<string, unknown>>(
    schoolId: string,
    kind?: RecordKind,
  ): Promise<LiveSchoolRecord<T>[]> {
    let query = client().from("school_records").select("*").eq("school_id", schoolId);
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    check(error);
    return (data || []) as LiveSchoolRecord<T>[];
  },
  async saveRecord<T>(record: LiveSchoolRecord<T>) {
    const { error } = await client()
      .from("school_records")
      .upsert(record, { onConflict: "school_id,id" });
    check(error);
  },
  async deleteRecord(schoolId: string, recordId: string) {
    const { error } = await client()
      .from("school_records")
      .delete()
      .eq("school_id", schoolId)
      .eq("id", recordId);
    check(error);
  },
  async recordPayment(
    schoolId: string,
    studentId: string,
    amount: number,
    method: "Cash" | "Bank",
    session: string,
    term: string,
  ) {
    const { data, error } = await client()
      .from("fee_payments")
      .insert({ school_id: schoolId, student_id: studentId, amount, method, session, term })
      .select()
      .single();
    check(error);
    return data;
  },
};
