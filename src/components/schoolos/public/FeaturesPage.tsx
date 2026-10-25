import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  Calculator,
  CalendarCheck2,
  Layers,
  Lock,
  PlayCircle,
  Printer,
  Users,
} from "lucide-react";
import React from "react";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { useSchoolOS } from "@/context/SchoolOSContext";

const FEATURE_GROUPS = [
  {
    icon: Users,
    title: "Admissions & Promotion",
    summary: "Bio-data, sibling phone linking & end-of-session class promotion.",
  },
  {
    icon: BookOpenCheck,
    title: "CA1, CA2 & Exam Grading",
    summary: "Standard 20/20/60 grading with auto-ranked class broadsheets.",
  },
  {
    icon: Lock,
    title: "Result Lock & Audit Log",
    summary: "Lock published terms; post-publication edits require Admin approval.",
  },
  {
    icon: Calculator,
    title: "Fees, Transfers & Receipts",
    summary: "Naira class bills, sibling discounts & sequential numbered receipts.",
  },
  {
    icon: CalendarCheck2,
    title: "1-Tap Attendance",
    summary: "Fast mobile roll-call synced straight onto term report cards.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Staff Logins & Payroll",
    summary: "Scoped Staff PINs, monthly salary sheets & printable A4 payslips.",
  },
  {
    icon: Printer,
    title: "A4 Printables & CSV",
    summary: "Single-page A4 report cards, broadsheets, receipts & CSV exports.",
  },
  {
    icon: BellRing,
    title: "Parent Portal & Notices",
    summary: "One phone login for all siblings plus WhatsApp & SMS broadcasts.",
  },
  {
    icon: Layers,
    title: "Optional Add-On Tracks",
    summary: "Optional multi-programme & optional Qur'an module (off by default).",
  },
];

export function FeaturesPage() {
  const { setOnboardingWizardOpen } = useSchoolOS();

  return (
    <PublicSiteLayout>
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Practical tools built for fast daily school work
            </h1>
            <p className="text-sm leading-relaxed text-[#364152] sm:text-base">
              Every module is organized around how Nigerian teachers, bursars, principals, and parents work each term.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                type="button"
                onClick={() => setOnboardingWizardOpen(true)}
                className="rounded-full bg-[#1a4a6e] px-5 font-bold text-white hover:bg-[#0c2340]"
              >
                Register School
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#9ed9d6] bg-white px-5 font-bold text-[#1a4a6e] hover:bg-[#edf7f6] hover:text-[#0c2340]"
              >
                <Link to="/tutorials">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Watch Video Guide
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
              <img
                src="/images/cover-features-academics.jpg"
                alt="Nigerian secondary school students and teacher in modern ICT laboratory"
                className="h-56 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.title}
                  className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5 transition hover:border-[#9ed9d6] hover:bg-white"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c2340] text-[#9ed9d6]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="font-display mt-3 text-base font-bold text-[#0b1220]">
                    {group.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#364152] sm:text-sm">
                    {group.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
