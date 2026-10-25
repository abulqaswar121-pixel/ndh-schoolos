import { BellRing, MessageSquare, Phone, Send } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { computeStudentInvoices, normalizePhoneKey } from "@/services/calculations";

type AudienceOption = "all_parents" | "fee_debtors" | "specific_class";

export function ParentNoticesModule() {
  const { db, portal, sendParentNotice } = useSchoolOS();
  const { settings, students, classes, feeItems, payments } = db;

  const [channel, setChannel] = useState<"WhatsApp" | "SMS">("WhatsApp");
  const [audience, setAudience] = useState<AudienceOption>(
    portal.role === "bursar" ? "fee_debtors" : "all_parents"
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id ?? ""
  );
  const [subject, setSubject] = useState("Term Fee & School Notice");
  const [message, setMessage] = useState(
    `Dear Parent, greetings from ${settings.name}. Kindly check your phone portal for ${settings.currentTerm} updates.`
  );

  // Compute unique guardian phone counts
  const recipientSummary = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === "Active");
    if (audience === "all_parents") {
      const phones = new Set(
        activeStudents.map((s) => normalizePhoneKey(s.parentPhone)).filter(Boolean)
      );
      return {
        count: phones.size,
        label: `All Active Parents (${phones.size} families)`,
      };
    }

    if (audience === "fee_debtors") {
      const owingPhones = new Set<string>();
      activeStudents.forEach((stu) => {
        const invs = computeStudentInvoices({
          student: stu,
          allStudents: students,
          feeItems,
          payments,
          settings,
          session: settings.currentSession,
          term: settings.currentTerm,
        });
        if (invs.some((i) => i.balance > 0)) {
          const p = normalizePhoneKey(stu.parentPhone);
          if (p) owingPhones.add(p);
        }
      });
      return {
        count: owingPhones.size,
        label: `Parents with ${settings.currentTerm} Fee Balance (${owingPhones.size} families)`,
      };
    }

    const cls = classes.find((c) => c.id === selectedClassId);
    const inClass = activeStudents.filter((stu) =>
      Object.values(stu.programmeClasses).includes(selectedClassId)
    );
    const phones = new Set(
      inClass.map((s) => normalizePhoneKey(s.parentPhone)).filter(Boolean)
    );
    return {
      count: phones.size,
      label: `${cls?.name ?? settings.labels.classSingular} Parents (${phones.size} families)`,
    };
  }, [
    audience,
    selectedClassId,
    students,
    classes,
    feeItems,
    payments,
    settings,
  ]);

  const applyTemplate = (kind: "fees" | "results" | "pta") => {
    if (kind === "fees") {
      setAudience("fee_debtors");
      setSubject(`${settings.currentTerm} Fee Reminder`);
      setMessage(
        `Dear Parent, kindly complete your child's ${settings.currentTerm} school fee balance via Paystack/Flutterwave or transfer to ${settings.bankAccountDetails.bankName} (${settings.bankAccountDetails.accountNumber} - ${settings.bankAccountDetails.accountName}). Thank you.`
      );
    } else if (kind === "results") {
      setAudience("all_parents");
      setSubject(`${settings.currentTerm} Results Ready`);
      setMessage(
        `Dear Parent, ${settings.name} ${settings.currentTerm} results and report cards are ready. Sign in on your phone with your registered phone number to view scores and positions.`
      );
    } else {
      setAudience("all_parents");
      setSubject("PTA General Meeting Notice");
      setMessage(
        `Dear Parent, ${settings.name} invites all parents to our ${settings.currentTerm} PTA Meeting this Saturday at 10:00 AM in the school hall. Thank you.`
      );
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Enter a subject and message before sending.");
      return;
    }
    if (recipientSummary.count === 0) {
      toast.error("No parent phone numbers match the selected group.");
      return;
    }
    const logged = sendParentNotice({
      channel,
      audienceLabel: recipientSummary.label,
      recipientCount: recipientSummary.count,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (logged) {
      toast.success(
        `${channel} notice queued for ${recipientSummary.count} parent phone numbers.`
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#1E3A8A] uppercase">
            <BellRing className="h-3.5 w-3.5" />
            SMS & WhatsApp Communication
          </div>
          <h1 className="mt-0.5 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Parent Notices
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Send fee reminders, result alerts and school announcements to parents by WhatsApp or SMS.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-2xs">
          <div className="text-slate-500">SMS Credit Balance</div>
          <div className="text-base font-extrabold text-[#0F172A]">
            {settings.smsCreditsBalance.toLocaleString("en-NG")} units
          </div>
          <div className="text-[11px] text-slate-500">
            SMS credits sold separately • Gateway ready to connect
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Compose Form */}
        <form
          onSubmit={handleSend}
          className="ndh-card space-y-5 p-6 sm:p-7 lg:col-span-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#0F172A]">
              Compose Parent Notice
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate("fees")}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Fee Reminder
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("results")}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Results Ready
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("pta")}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                PTA Meeting
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setChannel("WhatsApp")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                channel === "WhatsApp"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              WhatsApp Notice
            </button>
            <button
              type="button"
              onClick={() => setChannel("SMS")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                channel === "SMS"
                  ? "border-[#1E3A8A] bg-blue-50 text-[#0F172A]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Phone className="h-4 w-4 text-[#1E3A8A]" />
              SMS Text Message
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Recipient Group
            </Label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AudienceOption)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-sm font-medium text-slate-800"
            >
              <option value="all_parents">All Active Parents</option>
              {portal.role !== "secretary" && (
                <option value="fee_debtors">
                  Parents Owing {settings.currentTerm} Fees
                </option>
              )}
              <option value="specific_class">
                Parents in a Specific {settings.labels.classSingular}
              </option>
            </select>
          </div>

          {audience === "specific_class" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Select {settings.labels.classSingular}
              </Label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-sm font-medium text-slate-800"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Notice Title
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-slate-200 bg-[#F8FAFC]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Message ({message.length} characters)
            </Label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-slate-200 bg-[#F8FAFC] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span>
              Recipients: <strong>{recipientSummary.label}</strong>
            </span>
            {channel === "SMS" && (
              <span>
                Est. Cost: <strong>{recipientSummary.count} SMS units</strong>
              </span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#1a4a6e] font-bold text-white hover:bg-[#0c2340]"
          >
            <Send className="mr-2 h-4 w-4" />
            Send {channel} Notice ({recipientSummary.count} Families)
          </Button>
        </form>

        {/* Recent Notice History */}
        <div className="ndh-card p-6 sm:p-7 lg:col-span-6">
          <h2 className="text-base font-bold text-[#0b1220]">
            Recent SMS & WhatsApp Notices
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Delivery log of messages dispatched to parent and guardian phone numbers.
          </p>

          <div className="mt-4 space-y-3">
            {db.parentNotices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                No parent notices sent yet this term.
              </div>
            ) : (
              db.parentNotices.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        item.channel === "WhatsApp"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {item.channel}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.sentAt.slice(0, 10)} • {item.status}
                    </span>
                  </div>
                  <div className="mt-1.5 font-bold text-[#0F172A]">
                    {item.subject}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600">
                    To: {item.audienceLabel}
                  </div>
                  <p className="mt-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700">
                    {item.message}
                  </p>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    Sent by {item.sentBy}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
