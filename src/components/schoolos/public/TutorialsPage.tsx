import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import React from "react";
import { RoleVideoTutorialPlayer } from "../tutorials/RoleVideoTutorialPlayer";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { useSchoolOS } from "@/context/SchoolOSContext";

const ROLE_CARDS = [
  {
    icon: ShieldCheck,
    role: "School Owner",
    scope: "Full Control",
    summary:
      "School branding and short links, phone/PIN accounts, school-app installation, optional Tahfeez, support-staff payroll & A4 reports.",
  },
  {
    icon: FileCheck2,
    role: "Exam Officer",
    scope: "Exams & All Reports",
    summary:
      "Phone/PIN sign-in, missing-paper tracking, paper review, PDF & Word exports, sync-aware results and A4 reports.",
  },
  {
    icon: BookOpen,
    role: "Class Teacher",
    scope: "Assigned Class",
    summary:
      "Assigned class or Halqah, offline attendance and scores, optional Tahfeez, class and subject duties in one account and A4 reports.",
  },
  {
    icon: ClipboardCheck,
    role: "Subject Teacher",
    scope: "Subjects & Groups",
    summary:
      "Assigned subjects and combined groups, one login for dual-role teaching, offline score drafts, reconnect sync and exam review.",
  },
  {
    icon: Calculator,
    role: "Bursar",
    scope: "Fees & Payroll",
    summary:
      "Fees, verified transfers, official receipts, debtors, and separate teaching / non-teaching payroll without unnecessary teacher logins.",
  },
  {
    icon: Users,
    role: "Secretary",
    scope: "Front Office",
    summary:
      "Branded school links and app-install guidance, admissions, guardian links, synced attendance, notices and authorised A4 printing.",
  },
  {
    icon: Smartphone,
    role: "Parent",
    scope: "Own Children",
    summary:
      "School link, phone + 4-digit PIN, school-branded app, linked children, attendance, published A4 reports, fees & receipts.",
  },
];

export function TutorialsPage() {
  const { setOnboardingWizardOpen } = useSchoolOS();

  return (
    <PublicSiteLayout>
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#edf7f6] px-3.5 py-1 text-xs font-bold text-[#1a4a6e]">
              <Sparkles className="h-3.5 w-3.5" />
              Complete Narrated Video Walkthroughs
            </div>
            <h1 className="font-display mt-2.5 text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Quick video guides for every school role
            </h1>
            <p className="mt-2 text-sm text-[#364152] sm:text-base">
              Seven narrated screen tutorials show the actual website and role portals using
              fictional demo records. Auto selects Phone or Desktop view, with English captions,
              clickable chapters and a manual view switch.
            </p>
          </div>

          <RoleVideoTutorialPlayer
            autoPlay
            onRegisterSchool={() => setOnboardingWizardOpen(true)}
          />
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-[#0b1220]">
            At-a-glance role permissions
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.role}
                  className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c2340] text-[#9ed9d6]">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="rounded-full border border-[#9ed9d6] bg-[#edf7f6] px-2.5 py-0.5 text-[11px] font-bold text-[#1a4a6e]">
                      {card.scope}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-base font-bold text-[#0b1220]">
                    {card.role}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#364152] sm:text-sm">
                    {card.summary}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0c2340] p-6 text-white sm:p-8">
            <div>
              <h3 className="font-display text-xl font-bold">Set up your school in 2 minutes</h3>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                Clean workspace ready for your classes, staff logins, and students.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => setOnboardingWizardOpen(true)}
                className="rounded-full bg-[#9ed9d6] px-5 font-bold text-[#0c2340] hover:bg-white"
              >
                Register School
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/25 bg-white/10 px-5 font-bold text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
