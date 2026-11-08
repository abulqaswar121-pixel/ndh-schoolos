import { useEffect, useState } from "react";
import { Copy, Mail, Trash2, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { supabase } from "@/integrations/supabase/client";
import { inviteSchoolAccount, removeSchoolAccount } from "@/services/schoolPortal.functions";

export function SchoolPortalAccess() {
  const { cloudSchool, db, portal } = useSchoolOS();
  const invite = useServerFn(inviteSchoolAccount);
  const remove = useServerFn(removeSchoolAccount);
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [accounts, setAccounts] = useState<Array<{user_id:string;role:string;staff_id:string|null}>>([]);
  const reload = async () => {
    if (!cloudSchool) return;
    const { data, error } = await supabase.from("school_portal_accounts").select("user_id,role,staff_id").eq("school_id", cloudSchool.id);
    if (error) toast.error("Unable to load portal accounts.");
    else setAccounts(data || []);
  };
  useEffect(() => {
    if (!cloudSchool) return;
    setUrl(`${window.location.origin}/s/${cloudSchool.id}`);
    void reload();
  }, [cloudSchool?.id]);
  if (portal.role !== "admin" || !cloudSchool) return null;
  return <section className="space-y-4 border-t border-border pt-5">
    <h2 className="text-base font-bold">School portal & accounts</h2>
    <div className="flex min-w-0 gap-2">
      <Input aria-label="School portal link" readOnly value={url} className="min-w-0" />
      <Button variant="outline" size="icon" title="Copy school portal link" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("School link copied."); }}><Copy className="h-4 w-4" /></Button>
    </div>
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await supabase.from("school_portal_branding").upsert({ school_id: cloudSchool.id, name: db.settings.name, motto: db.settings.motto, logo_url: db.settings.logoDataUrl || null });
        await invite({ data: { schoolId: cloudSchool.id, email, staffId: target === "parent" ? undefined : target, studentIds, origin: window.location.origin } });
        toast.success("Invitation sent. They can open the email to set their password."); setEmail(""); await reload();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Invitation failed."); }
      finally { setBusy(false); }
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="portal-person">Account for</Label><select id="portal-person" required value={target} onChange={(e) => { setTarget(e.target.value); setEmail(db.staff.find((s) => s.id === e.target.value)?.email || ""); }} className="h-10 w-full rounded-md border border-input px-3 text-sm"><option value="">Choose staff or parent</option>{db.staff.filter((s) => s.systemRole !== "admin" && s.status === "Active" && (s.systemRole !== "muallim" || db.settings.enableQuranModule)).map((s) => <option key={s.id} value={s.id}>{s.fullName} — {s.role}</option>)}<option value="parent">Parent / Guardian</option></select></div>
        <div className="space-y-1"><Label htmlFor="portal-email">Email</Label><Input id="portal-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      {target === "parent" && <div className="space-y-1"><Label htmlFor="portal-children">Linked children</Label><select id="portal-children" multiple required value={studentIds} onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="h-36 w-full rounded-md border border-input p-2 text-sm">{db.students.map((s) => <option key={s.id} value={s.id}>{s.admissionId} — {s.fullName}</option>)}</select></div>}
      <Button type="submit" disabled={busy || !target || (target === "parent" && !studentIds.length)}><Mail className="mr-2 h-4 w-4" />{busy ? "Sending…" : "Send account invitation"}</Button>
    </form>
    {accounts.length > 0 && <div className="divide-y divide-border">{accounts.map((a) => <div key={a.user_id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{db.staff.find((s) => s.id === a.staff_id)?.fullName || "Parent / Guardian"} · {a.role.replaceAll("_", " ")}</span><div className="flex gap-1"><Button variant="ghost" size="icon" title="Send password reset" onClick={async () => { const address = db.staff.find((s) => s.id === a.staff_id)?.email || window.prompt("Account email"); if (!address) return; const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/reset-password` }); if (error) toast.error(error.message); else toast.success("Password reset email sent."); }}><RotateCcw className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Remove school access" onClick={async () => { if (!window.confirm("Remove this account's school access?")) return; try { await remove({ data: { schoolId: cloudSchool.id, userId: a.user_id } }); await reload(); } catch { toast.error("Unable to remove access."); } }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
  </section>;
}