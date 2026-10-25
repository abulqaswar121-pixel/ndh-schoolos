import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { PRICING_CONFIG } from "@/config/pricing";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { NDH_PARENT_CONTACT } from "@/data/ndhLinks";

export function PricingPage() {
  const { setOnboardingWizardOpen } = useSchoolOS();
  const [billingCycle, setBillingCycle] = useState<"term" | "session">("term");

  return (
    <PublicSiteLayout>
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#edf7f6] px-4 py-1 text-xs font-bold text-[#1a4a6e]">
              <Sparkles className="h-3.5 w-3.5" />
              {PRICING_CONFIG.pilotOfferBanner}
            </div>

            <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Simple Termly & Per-Session Pricing (₦)
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#364152] sm:text-base">
              Pay per term or pay once per academic session (3 terms) and save 17%.
            </p>

            {/* Termly vs Per-Session Toggle */}
            <div
              role="group"
              aria-label="Billing cycle"
              className="mt-5 inline-flex items-center rounded-full border border-[#d0d5dd] bg-white p-1 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setBillingCycle("term")}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  billingCycle === "term"
                    ? "bg-[#0c2340] text-white"
                    : "text-[#364152] hover:text-[#0b1220]"
                }`}
              >
                Per Term
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("session")}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  billingCycle === "session"
                    ? "bg-[#0c2340] text-white"
                    : "text-[#364152] hover:text-[#0b1220]"
                }`}
              >
                <span>Per Session (3 Terms)</span>
                <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-extrabold text-[#067647]">
                  {PRICING_CONFIG.sessionDiscountBadge}
                </span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
              <img
                src="/images/ndh-cover-pricing-v3.jpg"
                alt="Nigerian school director and bursar reviewing termly and session plans"
                className="h-56 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING_CONFIG.tiers.map((tier) => {
              const highlighted = Boolean(tier.mostPopular);
              const isSession = billingCycle === "session";
              const mainPrice = isSession
                ? tier.sessionPriceDisplay
                : tier.priceDisplay;
              const periodText =
                tier.pricePerTermNaira === null
                  ? "custom"
                  : isSession
                    ? "/ session (3 terms)"
                    : tier.periodDisplay;

              return (
                <div
                  key={tier.id}
                  className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 ${
                    highlighted
                      ? "border-[#1a4a6e] bg-[#0c2340] text-white shadow-md"
                      : "border-[#e4e7ec] bg-[#f5f6f8] text-[#0b1220]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-extrabold tracking-wider uppercase ${
                          highlighted ? "text-[#9ed9d6]" : "text-[#1a4a6e]"
                        }`}
                      >
                        {tier.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          highlighted
                            ? "bg-white/15 text-white"
                            : "border border-[#d0d5dd] bg-white text-[#364152]"
                        }`}
                      >
                        {tier.studentLimitLabel}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-baseline gap-2">
                      {isSession && tier.sessionRegularDisplay && (
                        <span
                          className={`text-base font-semibold line-through ${
                            highlighted ? "text-slate-400" : "text-[#667085]"
                          }`}
                        >
                          {tier.sessionRegularDisplay}
                        </span>
                      )}
                      <span className="font-display text-3xl font-bold sm:text-4xl">
                        {mainPrice}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          highlighted ? "text-slate-300" : "text-[#667085]"
                        }`}
                      >
                        {periodText}
                      </span>
                    </div>

                    {/* Always show session discount clarity */}
                    {tier.pricePerTermNaira !== null ? (
                      <div
                        className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          highlighted
                            ? "bg-[#9ed9d6]/20 text-[#9ed9d6]"
                            : "bg-[#ecfdf3] text-[#067647]"
                        }`}
                      >
                        {isSession
                          ? tier.sessionSavingsLabel
                          : `Or ${tier.sessionPriceDisplay}/session (${PRICING_CONFIG.sessionDiscountBadge})`}
                      </div>
                    ) : (
                      <div
                        className={`mt-2 text-[11px] font-semibold ${
                          highlighted ? "text-[#9ed9d6]" : "text-[#1a4a6e]"
                        }`}
                      >
                        {tier.sessionSavingsLabel}
                      </div>
                    )}

                    <p
                      className={`mt-2.5 text-xs leading-relaxed ${
                        highlighted ? "text-slate-300" : "text-[#364152]"
                      }`}
                    >
                      {tier.summary}
                    </p>

                    <ul className="mt-5 space-y-2 border-t border-current/10 pt-4 text-xs">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              highlighted ? "text-[#9ed9d6]" : "text-[#067647]"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {tier.pricePerTermNaira === null ? (
                      <Button
                        asChild
                        size="lg"
                        className="w-full rounded-full bg-[#1a4a6e] font-bold text-white hover:bg-[#0c2340]"
                      >
                        <Link to="/contact">Contact NDH Team</Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => setOnboardingWizardOpen(true)}
                        className={`w-full rounded-full font-bold ${
                          highlighted
                            ? "bg-[#9ed9d6] text-[#0c2340] hover:bg-white"
                            : "bg-[#1a4a6e] text-white hover:bg-[#0c2340]"
                        }`}
                      >
                        Register School (1st Term Free)
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] px-4 py-3.5 text-center text-xs text-[#364152]">
            <span>{PRICING_CONFIG.optionalSetupFeeLabel}</span>
            <span>•</span>
            <span>{PRICING_CONFIG.smsCreditsNote}</span>
            <span>•</span>
            <Link
              to="/tutorials"
              className="inline-flex items-center gap-1 font-bold text-[#1a4a6e] hover:underline"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Watch Video Guide
            </Link>
            <span>•</span>
            <a
              href={NDH_PARENT_CONTACT.phoneHref}
              className="font-bold text-[#1a4a6e] hover:underline"
            >
              {NDH_PARENT_CONTACT.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
