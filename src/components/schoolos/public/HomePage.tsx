import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Lock,
  PlayCircle,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import React from "react";
import { RoleVideoTutorialPlayer } from "../tutorials/RoleVideoTutorialPlayer";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { PRICING_CONFIG } from "@/config/pricing";
import { useSchoolOS } from "@/context/SchoolOSContext";

const CORE_CAPABILITIES = [
  {
    icon: BookOpenCheck,
    title: "Auto-Graded Results",
    description: "Enter CA 1, CA 2 & Exam once — totals, grades & positions rank automatically.",
  },
  {
    icon: Calculator,
    title: "Fees & Receipts (₦)",
    description: "Class billing, sibling discounts, 1-click transfer confirmation & numbered receipts.",
  },
  {
    icon: Lock,
    title: "Result Lock & Audit",
    description: "Lock published terms against edits and track every change with timestamps.",
  },
  {
    icon: Users,
    title: "6 Scoped Role Logins",
    description: "Owners, Class & Subject Teachers, Bursar, Secretary & Parents see only their scope.",
  },
  {
    icon: Smartphone,
    title: "One Parent Login",
    description: "Parents sign in with one phone number to view all their children's results & bills.",
  },
  {
    icon: ClipboardList,
    title: "Payroll & Payslips",
    description: "Compute monthly staff salaries, allowances & deductions with A4 payslips.",
  },
];

export function HomePage() {
  const { db, portal, setOnboardingWizardOpen } = useSchoolOS();

  return (
    <PublicSiteLayout>
      {/* Concise Hero Section */}
      <section className="border-b border-[#e4e7ec] bg-white py-10 sm:py-14 lg:py-18">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#edf7f6] px-3.5 py-1 text-xs font-bold text-[#1a4a6e]">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Nigerian Schools
            </div>

            <h1 className="font-display text-3xl leading-[1.12] font-bold tracking-tight text-[#0b1220] sm:text-4xl lg:text-[2.75rem]">
              Results, fees, attendance & parents — in one simple workspace.
            </h1>

            <p className="text-base leading-relaxed text-[#364152]">
              Set up your Nursery, Primary, or Secondary school in 2 minutes. Give teachers, bursars, and parents fast, role-scoped access on any device.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {portal.isAuthenticated ? (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#1a4a6e] px-6 font-bold text-white hover:bg-[#0c2340]"
                >
                  <Link to="/app">
                    Open Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setOnboardingWizardOpen(true)}
                  className="rounded-full bg-[#1a4a6e] px-6 font-bold text-white hover:bg-[#0c2340]"
                >
                  {db.settings.setupCompleted ? "Open Setup" : "Register Your School"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-[#9ed9d6] bg-[#edf7f6] px-5 font-bold text-[#1a4a6e] hover:bg-[#d8efed] hover:text-[#0c2340]"
              >
                <a href="#video-walkthrough">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Watch Full Video Guide
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-[#364152]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#067647]" />
                {PRICING_CONFIG.pilotOfferBanner}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#067647]" />
                A4 Report Cards & Receipts
              </span>
            </div>
          </div>

          {/* Executive Classroom Photo */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-[#e4e7ec] bg-[#f5f6f8] shadow-sm">
              <img
                src="/images/ndh-cover-hero-v3.jpg"
                alt="Modern Nigerian private school classroom with teacher and students"
                className="h-68 w-full object-cover sm:h-84"
              />
              <div className="grid grid-cols-3 divide-x divide-[#e4e7ec] border-t border-[#e4e7ec] bg-white py-3 text-center">
                <div>
                  <div className="font-display text-sm font-bold text-[#0b1220]">
                    20 / 20 / 60
                  </div>
                  <div className="text-[11px] text-[#667085]">CA & Exam</div>
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-[#1a4a6e]">
                    6 Roles
                  </div>
                  <div className="text-[11px] text-[#667085]">Scoped Access</div>
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-[#067647]">
                    A4 Print
                  </div>
                  <div className="text-[11px] text-[#667085]">Results & Bills</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real MP4 + Voiceover Video Walkthrough */}
      <section
        id="video-walkthrough"
        className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-12 sm:py-16"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#1a4a6e] uppercase">
                Full Walkthrough Videos (Welcome • Sign-Up • Sign-In • All Pages)
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold text-[#0b1220] sm:text-3xl">
                Watch how each user signs in and uses every feature
              </h2>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-fit border-[#d0d5dd] bg-white text-xs font-bold text-[#0b1220] hover:bg-white hover:text-[#1a4a6e]"
            >
              <Link to="/tutorials">
                All Role Videos
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <RoleVideoTutorialPlayer
            autoPlay
            onRegisterSchool={() => setOnboardingWizardOpen(true)}
          />
        </div>
      </section>

      {/* Fast 6-Card Summary Grid */}
      <section className="border-b border-[#e4e7ec] bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-[#0b1220] sm:text-3xl">
            Everything your school office needs
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CORE_CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5 transition hover:border-[#9ed9d6] hover:bg-white"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf7f6] text-[#1a4a6e]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-display mt-3 text-base font-bold text-[#0b1220]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#364152] sm:text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Distinct Executive Photos: School Owners & Parents */}
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
            <img
              src="/images/ndh-cover-principal-v3.jpg"
              alt="Nigerian school principal reviewing fee analytics on laptop in executive office"
              className="h-56 w-full object-cover"
            />
            <div className="p-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1a4a6e] uppercase">
                <ShieldCheck className="h-4 w-4" />
                School Owners & Principals
              </div>
              <h3 className="font-display mt-1.5 text-lg font-bold text-[#0b1220]">
                Clear Naira revenue & tamper-proof exam records
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#364152] sm:text-sm">
                See collected vs owing fees per class, approve post-publication score edits, and lock term results in one click.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
            <img
              src="/images/ndh-cover-parents-v3.jpg"
              alt="Nigerian parents viewing child report card and fee receipt on smartphone"
              className="h-56 w-full object-cover"
            />
            <div className="p-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#067647] uppercase">
                <Printer className="h-4 w-4" />
                Parents & Guardians
              </div>
              <h3 className="font-display mt-1.5 text-lg font-bold text-[#0b1220]">
                Instant report cards & receipts on any phone
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#364152] sm:text-sm">
                View attendance, download A4 report cards, submit bank transfer references, and keep official receipts for all siblings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Concise Bottom CTA */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#0c2340] p-7 text-white sm:p-10 md:flex-row md:items-center">
            <div>
              <div className="text-xs font-extrabold tracking-wider text-[#9ed9d6] uppercase">
                {PRICING_CONFIG.pilotOfferBanner}
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold text-white sm:text-3xl">
                Ready to launch your school workspace?
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => setOnboardingWizardOpen(true)}
                className="rounded-full bg-[#9ed9d6] px-6 font-bold text-[#0c2340] hover:bg-white"
              >
                Register School
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-white/10 px-5 font-bold text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
