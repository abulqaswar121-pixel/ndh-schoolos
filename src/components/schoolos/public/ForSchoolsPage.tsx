import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Layers,
  PlayCircle,
} from "lucide-react";
import React from "react";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { useSchoolOS } from "@/context/SchoolOSContext";

const SCHOOL_TYPES = [
  {
    icon: Building2,
    title: "Nursery & Primary",
    bullets: [
      "Creche & Nursery through Primary 1–6",
      "Fast mobile attendance & behaviour ratings",
      "Automatic sibling fee discounts",
    ],
  },
  {
    icon: GraduationCap,
    title: "JSS & SSS Colleges",
    bullets: [
      "Subject Teacher logins scoped per subject",
      "Auto-ranked JSS 1–3 & SSS 1–3 broadsheets",
      "Principal result lock & edit approvals",
    ],
  },
  {
    icon: Layers,
    title: "Combined Campuses",
    bullets: [
      "Nursery, Primary & Secondary in one workspace",
      "Optional afternoon or specialized tracks",
      "Combined or separate programme fee bills",
    ],
  },
];

export function ForSchoolsPage() {
  const { setOnboardingWizardOpen } = useSchoolOS();

  return (
    <PublicSiteLayout>
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Fits Nursery, Primary & Secondary schools
            </h1>
            <p className="text-sm leading-relaxed text-[#364152] sm:text-base">
              Configure your exact classes, grading weights, and staff roles in minutes — whether you run 80 pupils or 600+ students.
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
                src="/images/ndh-cover-campus-v3.jpg"
                alt="Modern Nigerian private school campus architecture with palms"
                className="h-56 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {SCHOOL_TYPES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c2340] text-[#9ed9d6]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display mt-3.5 text-lg font-bold text-[#0b1220]">
                    {item.title}
                  </h2>
                  <ul className="mt-3 space-y-2 text-xs text-[#364152] sm:text-sm">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#067647]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
