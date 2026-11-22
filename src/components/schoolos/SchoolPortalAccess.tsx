import { useEffect, useState } from "react";
import { Copy, KeyRound, Mail, Phone, Trash2, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { supabase } from "@/integrations/supabase/client";
import { createPhoneLogin, inviteSchoolAccount, listPortalLogins, removeSchoolAccount, resetPhonePin } from "@/services/schoolPortal.functions";
import { isValidPhone, isValidPin, normalizePhone } from "@/services/phoneLogin";
import { normalizeSchoolSlug, validSchoolSlug } from "@/services/schoolApp";

type Account = { user_id: string; role: string; staff_id: string | null; login: string; isPhone: boolean };

export function SchoolPortalAccess() {
  const { cloudSchool, db, portal } = useSchoolOS();
  const invite = useServerFn(inviteSchoolAccount);
  const createPhone = useServerFn(createPhoneLogin);
  const resetPin = useServerFn(resetPhonePin);
  const listLogins = useServerFn(listPortalLogins);
  const remove = useServerFn(removeSchoolAccount);
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [target, setTarget] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const reload = async () => {
    if (!cloudSchool || portal.role !== "admin") return;
    try { setAccounts(await listLogins({ data: { schoolId: cloudSchool.id } })); }
    catch { toast.error("Unable to load portal accounts."); }
  };
  useEffect(() => {
    if (!cloudSchool) return;
    setUrl(`${window.location.origin}/s/${cloudSchool.id}`);
    void supabase.from("school_portal_branding").select("slug").eq("school_id", cloudSchool.id).maybeSingle().then(({ data }) => {
      setSlug(data?.slug || "");
      setUrl(`${window.location.origin}/s/${data?.slug || cloudSchool.id}`);
    });
    void reload();
  }, [cloudSchool?.id]);
  if (portal.role !== "admin" || !cloudSchool) return null;

  const pickTarget = (value: string) => {
    setTarget(value);
    setStudentIds([]);
    setPin("");
    const s = db.staff.find((x) => x.id === value);
    setEmail(s?.email || "");
    setPhone(s?.phone || "");
  };
  const onPhoneChange = (value: string) => {
    setPhone(value);
    if (target === "parent") {
      const n = normalizePhone(value);
      const matches = isValidPhone(value) ? db.students.filter((s) => s.parentPhone && normalizePhone(s.parentPhone) === n).map((s) => s.id) : [];
      setStudentIds(matches);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await supabase.from("school_portal_branding").upsert({ school_id: cloudSchool.id, name: db.settings.name, motto: db.settings.motto, logo_url: db.settings.logoDataUrl || null });
      const staffId = target === "parent" ? undefined : target;
      if (method === "phone") {
        if (!isValidPhone(phone)) throw new Error("Enter a valid phone number.");
        if (!isValidPin(pin)) throw new Error("PIN must be exactly 4 numbers.");
        const res = await createPhone({ data: { schoolId: cloudSchool.id, phone, pin, staffId, studentIds } });
        toast.success(res.existing ? "This phone already had a login. It is now linked here — they keep their old PIN." : "Phone login created. Share the phone number and PIN privately.");
        setPin("");
      } else {
        await invite({ data: { schoolId: cloudSchool.id, email, staffId, studentIds, origin: window.location.origin } });
        toast.success("Invitation sent. They can open the email to set their password.");
        setEmail("");
      }
      setStudentIds([]);
      await reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create login."); }
    finally { setBusy(false); }
  };

  return <section className="space-y-4 border-t border-border pt-5">
    <h2 className="text-base font-bold">School portal & accounts</h2>
    <form className="flex flex-wrap items-end gap-2" onSubmit={async (event) => {
      event.preventDefault();
      const next = normalizeSchoolSlug(slug);
      if (!validSchoolSlug(next)) { toast.error("Use 3–32 small letters, numbers or hyphens. Start and end with a letter or number."); return; }
      setSavingLink(true);
      try {
        const { error } = await supabase.from("school_portal_branding").upsert({ school_id: cloudSchool.id, name: db.settings.name, motto: db.settings.motto, logo_url: db.settings.logoDataUrl || null, slug: next });
        if (error) throw new Error(error.code === "23505" ? "Another school already uses this short link." : "Could not save school link.");
        setSlug(next); setUrl(`${window.location.origin}/s/${next}`); toast.success("School link saved. Your original link still works.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save school link."); }
      finally { setSavingLink(false); }
    }}>
      <div className="min-w-0 flex-1 space-y-1"><Label htmlFor="school-short-link">Short school link</Label><Input id="school-short-link" placeholder="markaz" maxLength={32} value={slug} onChange={event => setSlug(event.target.value)} /></div>
      <Button type="submit" disabled={savingLink}>{savingLink ? "Saving…" : "Save short link"}</Button>
    </form>
    <div className="flex min-w-0 gap-2">
      <Input aria-label="School portal link" readOnly value={url} className="min-w-0" />
      <Button variant="outline" size="icon" title="Copy school portal link" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("School link copied."); }}><Copy className="h-4 w-4" /></Button>
    </div>
    <form className="space-y-3" onSubmit={submit}>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={method === "phone" ? "default" : "outline"} onClick={() => setMethod("phone")}><Phone className="mr-1.5 h-4 w-4" />Phone + PIN</Button>
        <Button type="button" size="sm" variant={method === "email" ? "default" : "outline"} onClick={() => setMethod("email")}><Mail className="mr-1.5 h-4 w-4" />Email invite</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="portal-person">Account for</Label><select id="portal-person" required value={target} onChange={(e) => pickTarget(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose staff or parent</option>{db.staff.filter((s) => s.systemRole !== "admin" && s.status === "Active" && (s.systemRole !== "muallim" || db.settings.enableQuranModule)).map((s) => <option key={s.id} value={s.id}>{s.fullName} — {s.role}</option>)}<option value="parent">Parent / Guardian</option></select></div>
        {method === "email"
          ? <div className="space-y-1"><Label htmlFor="portal-email">Email</Label><Input id="portal-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          : <div className="grid grid-cols-[1fr_6rem] gap-2">
              <div className="space-y-1"><Label htmlFor="portal-phone">Phone number</Label><Input id="portal-phone" type="tel" inputMode="tel" required placeholder="08012345678" value={phone} onChange={(e) => onPhoneChange(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="portal-pin">4-digit PIN</Label><Input id="portal-pin" inputMode="numeric" maxLength={4} required placeholder="1234" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
            </div>}
      </div>
      {target === "parent" && <div className="space-y-1"><Label htmlFor="portal-children">Linked children {method === "phone" && <span className="font-normal text-muted-foreground">(children with this parent phone are picked for you)</span>}</Label><select id="portal-children" multiple required value={studentIds} onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="h-36 w-full rounded-md border border-input bg-background p-2 text-sm">{db.students.map((s) => <option key={s.id} value={s.id}>{s.admissionId} — {s.fullName}</option>)}</select></div>}
      <Button type="submit" disabled={busy || !target || (target === "parent" && !studentIds.length)}>{method === "phone" ? <KeyRound className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}{busy ? "Saving…" : method === "phone" ? "Create phone login" : "Send account invitation"}</Button>
    </form>
    {accounts.length > 0 && <div className="divide-y divide-border">{accounts.map((a) => <div key={a.user_id} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0"><span className="font-semibold">{db.staff.find((s) => s.id === a.staff_id)?.fullName || "Parent / Guardian"}</span> · {a.role.replaceAll("_", " ")}<span className="block truncate text-xs text-muted-foreground">{a.login}</span></span><div className="flex shrink-0 gap-1">
      <Button variant="ghost" size="icon" title={a.isPhone ? "Set a new PIN" : "Send password reset"} onClick={async () => {
        if (a.isPhone) {
          const next = window.prompt("New 4-digit PIN"); if (!next) return;
          if (!isValidPin(next)) { toast.error("PIN must be exactly 4 numbers."); return; }
          try { await resetPin({ data: { schoolId: cloudSchool.id, userId: a.user_id, pin: next } }); toast.success("New PIN saved. Share it privately."); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not change PIN."); }
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(a.login, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) toast.error(error.message); else toast.success("Password reset email sent.");
      }}><RotateCcw className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" title="Remove school access" onClick={async () => { if (!window.confirm("Remove this account's school access?")) return; try { await remove({ data: { schoolId: cloudSchool.id, userId: a.user_id } }); await reload(); } catch { toast.error("Unable to remove access."); } }}><Trash2 className="h-4 w-4" /></Button>
    </div></div>)}</div>}
  </section>;
}
