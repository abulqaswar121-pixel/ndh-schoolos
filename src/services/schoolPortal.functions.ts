import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAuthorizedSnapshot } from "./accessControl";
import { mergePortalChanges } from "./portalPolicy";
import type { ActivePortalSession, SchoolDatabaseSnapshot } from "@/types/school";

export const loadSchoolPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("school_portal_accounts").select("*").eq("user_id", context.userId);
    if (data.schoolId) query = query.eq("school_id", data.schoolId);
    const { data: account, error } = await query.limit(1).maybeSingle();
    if (error || !account) throw new Error("No portal account is linked to this school. Ask your school administrator.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: workspace } = await supabaseAdmin.from("school_workspaces").select("snapshot,revision").eq("school_id", account.school_id).single();
    const { data: school } = await supabaseAdmin.from("schools").select("*").eq("id", account.school_id).single();
    if (!workspace || !school) throw new Error("School workspace unavailable.");
    const raw = workspace.snapshot as unknown as SchoolDatabaseSnapshot;
    const staff = raw.staff.find((s) => s.id === account.staff_id);
    if (account.role !== "parent" && (!staff || staff.status !== "Active" || staff.systemRole !== account.role)) throw new Error("Staff access is inactive or changed. Ask your administrator.");
    if (account.role === "muallim" && !raw.settings.enableQuranModule) throw new Error("This school has not enabled Qur’an tools.");
    const portal: ActivePortalSession = { isAuthenticated: true, role: account.role as ActivePortalSession["role"], staffId: account.staff_id || undefined, parentStudentIds: account.student_ids, schoolCode: raw.settings.code, displayName: staff?.fullName || "Parent / Guardian", subtitle: account.role.replaceAll("_", " "), isExamOfficer: staff?.isExamOfficer || account.role === "exam_officer" };
    return { school, portal, workspace: { schoolId: account.school_id, revision: Number(workspace.revision), snapshot: getAuthorizedSnapshot(raw, portal) } };
  });

export const saveSchoolPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { schoolId: string; revision: number; snapshot: SchoolDatabaseSnapshot }) => input)
  .handler(async ({ data, context }) => {
    const { data: account } = await context.supabase.from("school_portal_accounts").select("*").eq("school_id", data.schoolId).eq("user_id", context.userId).maybeSingle();
    if (!account) throw new Error("School access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: workspace } = await supabaseAdmin.from("school_workspaces").select("snapshot,revision").eq("school_id", data.schoolId).single();
    if (!workspace || Number(workspace.revision) !== data.revision) throw new Error("School data changed. Reload before saving.");
    const raw = workspace.snapshot as unknown as SchoolDatabaseSnapshot;
    const staff = raw.staff.find((s) => s.id === account.staff_id);
    if (account.role !== "parent" && (!staff || staff.status !== "Active" || staff.systemRole !== account.role)) throw new Error("Staff access is inactive.");
    if (account.role === "muallim" && !raw.settings.enableQuranModule) throw new Error("Qur’an tools are disabled.");
    const portal: ActivePortalSession = { isAuthenticated: true, role: account.role as ActivePortalSession["role"], staffId: account.staff_id || undefined, parentStudentIds: account.student_ids, displayName: staff?.fullName || "Parent", subtitle: "", isExamOfficer: staff?.isExamOfficer || account.role === "exam_officer" };
    const merged = mergePortalChanges(raw, data.snapshot, portal);
    const { buildInvoiceProjection, sanitizeCloudSnapshot } = await import("./cloudSchoolRepository");
    const clean = sanitizeCloudSnapshot(merged);
    const { data: revision, error } = await supabaseAdmin.rpc("save_portal_workspace", { target_school: data.schoolId, expected_revision: data.revision, next_snapshot: JSON.parse(JSON.stringify(clean)), invoices: JSON.parse(JSON.stringify(buildInvoiceProjection(clean))) });
    if (error) throw new Error(error.message);
    return Number(revision);
  });

export const inviteSchoolAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid(), email: z.string().email(), staffId: z.string().optional(), studentIds: z.array(z.string()).default([]), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_school_admin", { _school: data.schoolId, _user: context.userId });
    if (!isAdmin) throw new Error("School administrator access required.");
    const { getRequest } = await import("@tanstack/react-start/server");
    if (new URL(getRequest().url).origin !== new URL(data.origin).origin) throw new Error("Invalid invitation address.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: workspace } = await context.supabase.from("school_workspaces").select("snapshot").eq("school_id", data.schoolId).single();
    if (!workspace) throw new Error("School unavailable.");
    const raw = workspace.snapshot as unknown as SchoolDatabaseSnapshot;
    const staff = raw.staff.find((s) => s.id === data.staffId);
    if (data.staffId && (!staff || staff.status !== "Active")) throw new Error("Choose an active staff member.");
    if (!staff && (!data.studentIds.length || data.studentIds.some((id) => !raw.students.some((s) => s.id === id)))) throw new Error("Choose the children linked to this parent.");
    if (staff?.systemRole === "admin") throw new Error("Use school registration for administrator accounts.");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${data.origin}/reset-password` });
    if (error || !invited.user) throw new Error("Invitation could not be sent. This email may already have an account.");
    const { error: accountError } = await supabaseAdmin.from("school_portal_accounts").upsert({ school_id: data.schoolId, user_id: invited.user.id, role: staff?.systemRole || "parent", staff_id: staff?.id || null, student_ids: staff ? [] : data.studentIds });
    if (accountError) throw new Error("Invitation sent, but school linking failed. Please try again.");
    return { ok: true };
  });

export const createPhoneLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid(), phone: z.string().min(7).max(20), pin: z.string().regex(/^\d{4}$/), staffId: z.string().optional(), studentIds: z.array(z.string()).default([]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_school_admin", { _school: data.schoolId, _user: context.userId });
    if (!isAdmin) throw new Error("School administrator access required.");
    const { isValidPhone, phoneLoginEmail, pinPassword } = await import("./phoneLogin");
    if (!isValidPhone(data.phone)) throw new Error("Enter a valid phone number.");
    const { data: workspace } = await context.supabase.from("school_workspaces").select("snapshot").eq("school_id", data.schoolId).single();
    if (!workspace) throw new Error("School unavailable.");
    const raw = workspace.snapshot as unknown as SchoolDatabaseSnapshot;
    const staff = raw.staff.find((s) => s.id === data.staffId);
    if (data.staffId && (!staff || staff.status !== "Active")) throw new Error("Choose an active staff member.");
    if (!staff && (!data.studentIds.length || data.studentIds.some((id) => !raw.students.some((s) => s.id === id)))) throw new Error("Choose the children linked to this parent.");
    if (staff?.systemRole === "admin") throw new Error("Use school registration for administrator accounts.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneLoginEmail(data.phone);
    let userId: string | null = null;
    let existing = false;
    const { data: found } = await supabaseAdmin.rpc("auth_user_id_by_email", { _email: email });
    if (found) { userId = found as string; existing = true; }
    else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password: pinPassword(data.pin), email_confirm: true, user_metadata: { full_name: staff?.fullName || "Parent / Guardian" } });
      if (error || !created.user) throw new Error("Could not create this login. Please try again.");
      userId = created.user.id;
    }
    let studentIds = data.studentIds;
    if (!staff) {
      const { data: prev } = await supabaseAdmin.from("school_portal_accounts").select("student_ids").eq("school_id", data.schoolId).eq("user_id", userId).maybeSingle();
      studentIds = Array.from(new Set([...(prev?.student_ids || []), ...data.studentIds]));
    }
    const { error: linkError } = await supabaseAdmin.from("school_portal_accounts").upsert({ school_id: data.schoolId, user_id: userId, role: staff?.systemRole || "parent", staff_id: staff?.id || null, student_ids: staff ? [] : studentIds });
    if (linkError) throw new Error("Login created, but linking to the school failed. Please try again.");
    return { ok: true, existing };
  });

export const resetPhonePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid(), userId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_school_admin", { _school: data.schoolId, _user: context.userId });
    if (!isAdmin) throw new Error("School administrator access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("school_portal_accounts").select("user_id").eq("school_id", data.schoolId).eq("user_id", data.userId).maybeSingle();
    if (!link) throw new Error("This person is not linked to your school.");
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const { isPhoneLoginEmail, pinPassword } = await import("./phoneLogin");
    if (!isPhoneLoginEmail(user.user?.email)) throw new Error("This person signs in with email. Send them a password reset instead.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: pinPassword(data.pin) });
    if (error) throw new Error("Could not change the PIN.");
    return { ok: true };
  });

export const listPortalLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_school_admin", { _school: data.schoolId, _user: context.userId });
    if (!isAdmin) throw new Error("School administrator access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("school_portal_accounts").select("user_id,role,staff_id,student_ids").eq("school_id", data.schoolId);
    const { PHONE_LOGIN_DOMAIN } = await import("./phoneLogin");
    return Promise.all((rows || []).map(async (r) => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      const email = u.user?.email || "";
      const phone = email.endsWith(`@${PHONE_LOGIN_DOMAIN}`) ? `+${email.split("@")[0]}` : null;
      return { ...r, login: phone || email, isPhone: Boolean(phone) };
    }));
  });

export const removeSchoolAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ schoolId: z.string().uuid(), userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_school_admin", { _school: data.schoolId, _user: context.userId });
    if (!isAdmin) throw new Error("School administrator access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("school_portal_accounts").delete().eq("school_id", data.schoolId).eq("user_id", data.userId);
    if (error) throw new Error("Unable to remove access.");
    return { ok: true };
  });