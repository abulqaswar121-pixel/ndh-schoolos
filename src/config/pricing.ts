/**
 * Single Editable Pricing & Plan Limits Configuration
 * Supports both Termly and Per-Session (3 Terms with ~17% Session Discount) billing.
 */

export interface PricingTierConfig {
  id: "starter" | "standard" | "large";
  name: string;
  studentLimitLabel: string;
  maxStudents: number | null;
  // Termly billing
  pricePerTermNaira: number | null;
  priceDisplay: string;
  periodDisplay: string;
  // Per-Session (Annual 3-Term) billing with standard discount
  pricePerSessionNaira: number | null;
  sessionRegularNaira: number | null;
  sessionPriceDisplay: string;
  sessionRegularDisplay?: string | undefined;
  sessionSavingsLabel?: string | undefined;
  mostPopular?: boolean | undefined;
  summary: string;
  features: string[];
  ctaLabel: string;
  ctaTarget: "pilot" | "contact";
}

export const PRICING_CONFIG: {
  currencySymbol: string;
  currencyCode: string;
  billingPeriodLabel: string;
  sessionDiscountBadge: string;
  pilotOfferBanner: string;
  optionalSetupFeeNaira: number;
  optionalSetupFeeLabel: string;
  smsCreditsNote: string;
  tiers: PricingTierConfig[];
} = {
  currencySymbol: "₦",
  currencyCode: "NGN",
  billingPeriodLabel: "per term",
  sessionDiscountBadge: "Save 17%",
  pilotOfferBanner: "1st Term Free Pilot for Early Schools",
  optionalSetupFeeNaira: 50000,
  optionalSetupFeeLabel: "Optional setup & staff training: ₦50,000 one-time",
  smsCreditsNote: "SMS units sold separately.",
  tiers: [
    {
      id: "starter",
      name: "Starter",
      studentLimitLabel: "Up to 150 students",
      maxStudents: 150,
      pricePerTermNaira: 30000,
      priceDisplay: "₦30,000",
      periodDisplay: "/ term",
      pricePerSessionNaira: 75000,
      sessionRegularNaira: 90000,
      sessionPriceDisplay: "₦75,000",
      sessionRegularDisplay: "₦90,000",
      sessionSavingsLabel: "Save ₦15,000 per session (3 terms)",
      summary: "Attendance, results, broadsheets & A4 report cards.",
      features: [
        "Up to 150 active students",
        "Daily class attendance",
        "CA 1, CA 2 & Exam grading",
        "Auto-ranked broadsheets",
        "Single-page A4 report cards",
      ],
      ctaLabel: "Register School",
      ctaTarget: "pilot",
    },
    {
      id: "standard",
      name: "Standard",
      studentLimitLabel: "Up to 500 students",
      maxStudents: 500,
      pricePerTermNaira: 80000,
      priceDisplay: "₦80,000",
      periodDisplay: "/ term",
      pricePerSessionNaira: 200000,
      sessionRegularNaira: 240000,
      sessionPriceDisplay: "₦200,000",
      sessionRegularDisplay: "₦240,000",
      sessionSavingsLabel: "Save ₦40,000 per session (3 terms)",
      mostPopular: true,
      summary: "Full academics, Naira fees, receipts, payroll & parent portal.",
      features: [
        "Up to 500 active students",
        "Everything in Starter",
        "Fees, numbered receipts & debtors",
        "Online & bank transfer confirmation",
        "Parent phone portal (all siblings)",
        "WhatsApp/SMS notices & staff payroll",
      ],
      ctaLabel: "Register School",
      ctaTarget: "pilot",
    },
    {
      id: "large",
      name: "Large",
      studentLimitLabel: "500+ or multi-campus",
      maxStudents: null,
      pricePerTermNaira: null,
      priceDisplay: "Contact us",
      periodDisplay: "custom",
      pricePerSessionNaira: null,
      sessionRegularNaira: null,
      sessionPriceDisplay: "Contact us",
      sessionSavingsLabel: "Custom session discount included",
      summary: "Large colleges & multi-branch school groups.",
      features: [
        "500+ students or multiple branches",
        "Everything in Standard",
        "Multi-campus owner overview",
        "Dedicated data migration & training",
        "Priority WhatsApp & phone support",
      ],
      ctaLabel: "Contact NDH Team",
      ctaTarget: "contact",
    },
  ],
};
