import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import { computeStudentInvoices } from "./calculations";
import type { OnboardingPayload } from "@/context/SchoolOSContext";
import type { SchoolDatabaseSnapshot } from "@/types/school";

export function isCloudConfigured(): boolean {
  const server = typeof window === "undefined" && typeof process !== "undefined" ? process.env : {};
  return Boolean(
    (import.meta.env["VITE_SUPABASE_URL"] || server["SUPABASE_URL"]) &&
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || server["SUPABASE_PUBLISHABLE_KEY"]),
  );
}

type CloudDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      school_workspaces: {
        Row: { school_id: string; snapshot: Json; revision: number; updated_at: string };
        Insert: { school_id: string; snapshot: Json; revision?: number; updated_at?: string };
        Update: { snapshot?: Json; revision?: number; updated_at?: string };
        Relationships: [];
      };
      school_invoices: {
        Row: {
          school_id: string;
          id: string;
          student_id: string;
          session: string;
          term: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          school_id: string;
          id: string;
          student_id: string;
          session: string;
          term: string;
          payload: Json;
        };
        Update: { payload?: Json };
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      list_registered_schools: { Args: Record<string, never>; Returns: CloudSchool[] };
      create_school_workspace: {
        Args: { initial_snapshot: Json; initial_invoices: Json };
        Returns: Json;
      };
      save_school_workspace: {
        Args: {
          target_school: string;
          expected_revision: number;
          next_snapshot: Json;
          invoices: Json;
        };
        Returns: number;
      };
    };
  };
};
const database = () => {
  if (!isCloudConfigured())
    throw new Error(
      "Connect Lovable Cloud / Supabase before using cloud accounts. No records have been uploaded.",
    );
  return supabase as unknown as SupabaseClient<CloudDatabase>;
};
export type CloudSchool = Database["public"]["Tables"]["schools"]["Row"];
export interface CloudWorkspace {
  schoolId: string;
  revision: number;
  snapshot: SchoolDatabaseSnapshot;
}
export interface CloudAccount {
  user: User;
  isOwner: boolean;
  school: CloudSchool | null;
  workspace: CloudWorkspace | null;
}
export type CloudSyncStatus = "signed_out" | "loading" | "saved" | "saving" | "error";
const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
export function sanitizeCloudSnapshot(snapshot: SchoolDatabaseSnapshot): SchoolDatabaseSnapshot {
  const { feeInvoices: _derived, ...source } = snapshot;
  return { ...source, staff: snapshot.staff.map(({ loginPin: _pin, ...staff }) => staff) };
}
export function emptyCloudSnapshot(): SchoolDatabaseSnapshot {
  const snapshot = createSeedDatabase();
  snapshot.classes = [];
  snapshot.subjects = [];
  snapshot.settings.code = "";
  snapshot.settings.name = "";
  snapshot.settings.motto = "";
  snapshot.settings.daysSchoolOpened = 0;
  return snapshot;
}
export function buildCloudSchoolSnapshot(input: OnboardingPayload): SchoolDatabaseSnapshot {
  const snapshot = emptyCloudSnapshot();
  const names = [...new Set(input.classNames.map((n) => n.trim()).filter(Boolean))];
  snapshot.settings = {
    ...snapshot.settings,
    name: input.schoolName.trim(),
    email: input.adminContact || "",
    phone: input.schoolPhone || "",
    address: input.schoolAddress || "",
    country: input.country,
    currencyCode: input.currencyCode,
    currencySymbol: input.currencySymbol,
    logoDataUrl: input.logoDataUrl,
    setupCompleted: true,
    multiProgrammeEnabled: input.multiProgrammeEnabled,
    currentSession: input.currentSession,
    sessions: [input.currentSession],
    currentTerm: input.currentTerm || "First Term",
  };
  snapshot.settings.programmes = [
    { id: "prog-main", name: "Main School" },
    ...(input.multiProgrammeEnabled
      ? (input.additionalProgrammeNames || []).map((name, i) => ({ id: `prog-${i + 2}`, name }))
      : []),
  ];
  snapshot.classes = snapshot.settings.programmes.flatMap((programme, programmeIndex) =>
    names.map((name, i) => {
      const prefix = programmeIndex === 0 ? "cls-main" : `cls-extra-${programmeIndex}`;
      return {
        id: `${prefix}-${i + 1}`,
        name,
        programmeId: programme.id,
        levelOrder: i + 1,
        nextGroupId: i + 1 < names.length ? `${prefix}-${i + 2}` : null,
        room: "",
      };
    }),
  );
  snapshot.staff = [
    {
      id: "stf-admin-1",
      staffCode: "ADM-001",
      fullName: input.adminName || "",
      role: "Proprietor / Principal",
      systemRole: "admin",
      phone: input.schoolPhone || "",
      email: input.adminContact || "",
      bankName: "",
      accountNumber: "",
      assignedClassIds: [],
      assignedSubjectIds: [],
      status: "Active",
      joinedDate: new Date().toISOString().slice(0, 10),
      salary: {
        baseSalary: 0,
        teachingAllowance: 0,
        overtime: 0,
        transport: 0,
        absenceFines: 0,
        pension: 0,
        salaryAdvanceRepayment: 0,
      },
    },
  ];
  return snapshot;
}
export function buildInvoiceProjection(snapshot: SchoolDatabaseSnapshot) {
  const periods = new Map<string, { session: string; term: string }>();
  for (const period of [
    { session: snapshot.settings.currentSession, term: snapshot.settings.currentTerm },
    ...snapshot.payments,
    ...snapshot.attendance,
    ...snapshot.termLocks,
  ]) {
    periods.set(JSON.stringify([period.session, period.term]), {
      session: period.session,
      term: period.term,
    });
  }
  return [...periods.values()].flatMap(({ session, term }) =>
    snapshot.students.flatMap((student) =>
      computeStudentInvoices({
        student,
        allStudents: snapshot.students,
        feeItems: snapshot.feeItems,
        payments: snapshot.payments,
        settings: snapshot.settings,
        session,
        term,
      }).map((invoice) => ({
        id: JSON.stringify([student.id, session, term, invoice.invoiceProgrammeId]),
        studentId: student.id,
        session,
        term,
        programmeId: invoice.invoiceProgrammeId,
        grossSubtotal: invoice.grossSubtotal,
        siblingDiscount: invoice.siblingDiscountAmount,
        waiver: invoice.manualWaiverAmount,
        netPayable: invoice.netPayable,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status,
      })),
    ),
  );
}
function workspaceFromJson(value: Json): CloudWorkspace {
  const result = value as unknown as {
    school_id?: string;
    revision?: number;
    snapshot?: SchoolDatabaseSnapshot;
  };
  if (
    !result.school_id ||
    !result.revision ||
    result.snapshot?.version !== 3 ||
    !Array.isArray(result.snapshot.students) ||
    !Array.isArray(result.snapshot.classes)
  )
    throw new Error("Invalid cloud workspace response. Check the database migration.");
  return {
    schoolId: result.school_id,
    revision: Number(result.revision),
    snapshot: result.snapshot,
  };
}
function failure(error: { message: string; code?: string | undefined } | null): void {
  if (!error) return;
  if (error.code === "40001")
    throw new Error(
      "Another session changed this school. Download a backup of unsaved work, then reload cloud data. Your changes have not overwritten the other session.",
    );
  if (["42P01", "PGRST202", "PGRST205"].includes(error.code || ""))
    throw new Error(
      "Apply the SchoolOS cloud workspace migration in Lovable Cloud before signing in.",
    );
  throw new Error(error.message);
}
const draftKey = (email: string) => `ndh_cloud_setup:${email.trim().toLowerCase()}`;
export const cloudSchoolRepository = {
  async signIn(email: string, password: string) {
    const { data, error } = await database().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    failure(error);
    if (!data.user) throw new Error("Unable to verify this account.");
    return data.user;
  },
  async signUp(input: OnboardingPayload, email: string, password: string) {
    const snapshot = buildCloudSchoolSnapshot({ ...input, adminContact: email.trim() });
    // This is an unconfirmed setup draft only. Passwords/tokens are never stored here.
    const db = database();
    try {
      if (typeof window !== "undefined")
        window.sessionStorage.setItem(draftKey(email), JSON.stringify(snapshot));
    } catch {
      /* Cloud auth must work when browser storage is unavailable. */
    }
    const { data, error } = await db.auth.signUp({
      email: email.trim(),
      password,
      options: {
        ...(typeof window !== "undefined"
          ? { emailRedirectTo: `${window.location.origin}/login` }
          : {}),
        data: { school_name: input.schoolName.trim(), full_name: input.adminName || "" },
      },
    });
    failure(error);
    return { user: data.user, needsConfirmation: !data.session };
  },
  async loadAccount(): Promise<CloudAccount> {
    const db = database();
    const { data: auth, error: authError } = await db.auth.getUser();
    failure(authError);
    if (!auth.user) throw new Error("Please sign in to your school account.");
    const user = auth.user;
    const [ownerResult, membershipResult] = await Promise.all([
      db.from("platform_owners").select("user_id").eq("user_id", user.id).maybeSingle(),
      db
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);
    failure(ownerResult.error);
    failure(membershipResult.error);
    const isOwner = Boolean(ownerResult.data);
    let schoolId = membershipResult.data?.school_id;
    let workspace: CloudWorkspace | null = null;
    if (schoolId) {
      const { data, error } = await db
        .from("school_workspaces")
        .select("school_id,snapshot,revision")
        .eq("school_id", schoolId)
        .maybeSingle();
      failure(error);
      if (data) workspace = workspaceFromJson(asJson(data));
    }
    if (!workspace && (!isOwner || schoolId)) {
      let draft: SchoolDatabaseSnapshot | null = null;
      if (typeof window !== "undefined" && user.email) {
        try {
          const raw = window.sessionStorage.getItem(draftKey(user.email));
          if (raw) draft = JSON.parse(raw) as SchoolDatabaseSnapshot;
        } catch {
          /* confirmation can be completed on a different device */
        }
      }
      if (!draft && !schoolId && !user.user_metadata["school_name"])
        throw new Error(
          "No school administrator membership is linked to this account. Contact your school or NDH support.",
        );
      let existingName = "";
      if (schoolId) {
        const { data, error } = await db.from("schools").select("name").eq("id", schoolId).single();
        failure(error);
        existingName = data?.name || "";
      }
      draft ??= buildCloudSchoolSnapshot({
        schoolName: existingName || String(user.user_metadata["school_name"]),
        adminName: String(user.user_metadata["full_name"] || user.email || ""),
        adminContact: user.email || "",
        country: "Nigeria",
        currencyCode: "NGN",
        currencySymbol: "₦",
        classNames: [],
        currentSession: createSeedDatabase().settings.currentSession,
        multiProgrammeEnabled: false,
      });
      const clean = sanitizeCloudSnapshot(draft);
      const { data, error } = await db.rpc("create_school_workspace", {
        initial_snapshot: asJson(clean),
        initial_invoices: asJson(buildInvoiceProjection(clean)),
      });
      failure(error);
      workspace = workspaceFromJson(data);
      schoolId = workspace.schoolId;
      try {
        if (typeof window !== "undefined" && user.email)
          window.sessionStorage.removeItem(draftKey(user.email));
      } catch {
        /* optional setup draft */
      }
    }
    let school: CloudSchool | null = null;
    if (schoolId) {
      const { data, error } = await db.from("schools").select("*").eq("id", schoolId).single();
      failure(error);
      school = data;
    }
    return { user, isOwner, school, workspace };
  },
  async save(
    schoolId: string,
    revision: number,
    snapshot: SchoolDatabaseSnapshot,
  ): Promise<number> {
    const clean = sanitizeCloudSnapshot(snapshot);
    const { data, error } = await database().rpc("save_school_workspace", {
      target_school: schoolId,
      expected_revision: revision,
      next_snapshot: asJson(clean),
      invoices: asJson(buildInvoiceProjection(clean)),
    });
    failure(error);
    return Number(data);
  },
  async listSchools(): Promise<CloudSchool[]> {
    const { data, error } = await database().rpc("list_registered_schools", {});
    failure(error);
    return (data || []).map((s) => ({
      ...s,
      subscription_status:
        ["Active", "Free Trial"].includes(s.subscription_status) &&
        s.subscription_expires_at &&
        Date.parse(s.subscription_expires_at) < Date.now()
          ? "Expired"
          : s.subscription_status,
    }));
  },
  async signOut() {
    const { error } = await database().auth.signOut();
    failure(error);
  },
  subscribe(listener: (userId: string | null) => void) {
    const { data } = database().auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => listener(session?.user.id || null));
    });
    return () => data.subscription.unsubscribe();
  },
  async currentUserId() {
    const { data, error } = await database().auth.getSession();
    failure(error);
    return data.session?.user.id || null;
  },
};

/** Serializes writes and detects stale revisions; never silently overwrites another tab/device. */
export class CloudSaveQueue {
  private pending: SchoolDatabaseSnapshot | null = null;
  private running: Promise<void> | null = null;
  private failed = false;
  private acknowledged: string;
  constructor(
    readonly schoolId: string,
    private revision: number,
    snapshot: SchoolDatabaseSnapshot,
    private readonly save = cloudSchoolRepository.save,
    private readonly onState: (status: CloudSyncStatus, error?: string) => void = () => {},
  ) {
    this.acknowledged = JSON.stringify(sanitizeCloudSnapshot(snapshot));
  }
  get dirty() {
    return Boolean(this.pending || this.running);
  }
  enqueue(snapshot: SchoolDatabaseSnapshot): Promise<void> {
    const clean = sanitizeCloudSnapshot(snapshot);
    if (!this.running && JSON.stringify(clean) === this.acknowledged) return Promise.resolve();
    this.pending = clean;
    if (this.failed)
      return Promise.reject(new Error("Cloud save is paused. Retry or reload cloud data."));
    return this.flush();
  }
  retry(): Promise<void> {
    this.failed = false;
    return this.flush();
  }
  flush(): Promise<void> {
    if (this.running) return this.running;
    if (this.failed)
      return Promise.reject(new Error("Cloud save failed. Retry before signing out."));
    this.running = Promise.resolve()
      .then(async () => {
        while (this.pending) {
          const snapshot = this.pending;
          this.pending = null;
          if (JSON.stringify(snapshot) === this.acknowledged) continue;
          this.onState("saving");
          try {
            this.revision = await this.save(this.schoolId, this.revision, snapshot);
            this.acknowledged = JSON.stringify(snapshot);
          } catch (error) {
            this.pending ??= snapshot;
            this.failed = true;
            this.onState("error", error instanceof Error ? error.message : "Cloud save failed.");
            throw error;
          }
        }
        this.onState("saved");
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }
}
