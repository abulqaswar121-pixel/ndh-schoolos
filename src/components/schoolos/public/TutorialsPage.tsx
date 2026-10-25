import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardCheck,
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
    summary: "Setup, staff PINs, fee waivers, score approvals, result lock & Audit Log.",
  },
  {
    icon: BookOpen,
    role: "Class Teacher",
    scope: "Assigned Class",
    summary: "1-tap attendance, CA1/CA2/Exam grading, remarks & A4 report cards.",
  },
  {
    icon: ClipboardCheck,
    role: "Subject Teacher",
    scope: "Assigned Subject",
    summary: "Enters CA & Exam scores for assigned subjects only; requests edits if published.",
  },
  {
    icon: Calculator,
    role: "Bursar",
    scope: "Fees & Payroll",
    summary: "Fee schedules, transfer confirmation, numbered receipts, debtors & payroll.",
  },
  {
    icon: Users,
    role: "Secretary",
    scope: "Front Office",
    summary: "Admissions, sibling phone linking, parent notices & read-only report printing.",
  },
  {
    icon: Smartphone,
    role: "Parent",
    scope: "Own Children",
    summary: "One phone login for all siblings — attendance, report cards, fees & receipts.",
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
              In-Portal Video Walkthroughs (With Voice)
            </div>
            <h1 className="font-display mt-2.5 text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Quick video guides for every school role
            </h1>
            <p className="mt-2 text-sm text-[#364152] sm:text-base">
              Pick any role tab to watch a 20-second screen walkthrough with voice narration — or let the playlist roll automatically.
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
              <h3 className="font-display text-xl font-bold">
                Set up your school in 2 minutes
              </h3>
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
