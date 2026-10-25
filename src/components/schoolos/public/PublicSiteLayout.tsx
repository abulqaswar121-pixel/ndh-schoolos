import { Link } from "@tanstack/react-router";
import { Menu, PlayCircle, Sparkles, X } from "lucide-react";
import React, { useState } from "react";
import { NDHBrandLockup } from "../NDHBrandLockup";
import { SaaSOnboardingWizard } from "../SaaSOnboardingWizard";
import { SchoolOSAIAssistant } from "../landing/SchoolOSAIAssistant";
import { Button } from "@/components/ui/button";
import { PRICING_CONFIG } from "@/config/pricing";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { DEFAULT_NDH_ECOSYSTEM_LINKS, NDH_PARENT_CONTACT } from "@/data/ndhLinks";

const NAV_LINKS: Array<{ to: string; label: string }> = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/for-schools", label: "For Schools" },
  { to: "/pricing", label: "Pricing" },
  { to: "/tutorials", label: "Tutorials" },
  { to: "/contact", label: "Contact" },
];

const TICKER_ITEMS = [
  PRICING_CONFIG.pilotOfferBanner,
  "Termly & Discounted Per-Session Plans (Save 17%)",
  "CA 1 • CA 2 • Exam A4 Report Cards & Numbered Receipts",
  `Support: ${NDH_PARENT_CONTACT.phoneDisplay}`,
];

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const { db, portal, setOnboardingWizardOpen } = useSchoolOS();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0b1220]">
      {/* Moving Top Announcement Bar — Static flow so it scrolls away when scrolling down */}
      <div
        aria-label="Platform announcements"
        className="ndh-top-ticker border-b border-[#9ed9d6] bg-[#0c2340] py-2 text-xs font-medium text-white"
      >
        <div className="ndh-top-ticker-track">
          {[0, 1].map((copyIdx) => (
            <div
              key={copyIdx}
              aria-hidden={copyIdx === 1 ? true : undefined}
              className="inline-flex items-center gap-8 pr-8"
            >
              {TICKER_ITEMS.map((msg) => (
                <span key={`${copyIdx}-${msg}`} className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#9ed9d6]" />
                  <span>{msg}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Main Navbar — Stays pinned at top:0 after the moving bar scrolls away */}
      <header className="sticky top-0 z-50 border-b border-[#e4e7ec] bg-white/95 shadow-2xs backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="shrink-0">
            <NDHBrandLockup theme="light" />
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                {...(item.to === "/" ? { activeOptions: { exact: true } } : {})}
                activeProps={{
                  className:
                    "rounded-full bg-[#edf7f6] px-3.5 py-1.5 text-sm font-bold text-[#1a4a6e]",
                }}
                inactiveProps={{
                  className:
                    "rounded-full px-3.5 py-1.5 text-sm font-medium text-[#364152] transition hover:bg-[#f5f6f8] hover:text-[#0b1220]",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 sm:flex">
            {portal.isAuthenticated ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[#1a4a6e] px-4 text-xs font-bold text-white hover:bg-[#0c2340]"
              >
                <Link to="/app">Open Workspace</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-semibold text-[#364152] hover:bg-[#f5f6f8] hover:text-[#0b1220]"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#9ed9d6] bg-[#edf7f6] text-xs font-bold text-[#1a4a6e] hover:bg-[#d8efed] hover:text-[#0c2340]"
                >
                  <Link to="/tutorials">
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                    Tutorials
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOnboardingWizardOpen(true)}
                  className="rounded-full bg-[#1a4a6e] px-4 text-xs font-bold text-white hover:bg-[#0c2340]"
                >
                  {db.settings.setupCompleted ? "Setup Wizard" : "Register School"}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="h-9 w-9 text-[#0b1220] hover:bg-[#f5f6f8] lg:hidden"
            aria-label="Toggle site menu"
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="border-t border-[#e4e7ec] bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  {...(item.to === "/" ? { activeOptions: { exact: true } } : {})}
                  activeProps={{
                    className:
                      "rounded-lg bg-[#edf7f6] px-3 py-2.5 text-sm font-bold text-[#1a4a6e]",
                  }}
                  inactiveProps={{
                    className:
                      "rounded-lg px-3 py-2.5 text-sm font-medium text-[#364152] hover:bg-[#f5f6f8] hover:text-[#0b1220]",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e4e7ec] pt-4 sm:hidden">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[#d0d5dd] bg-white text-xs font-bold text-[#0b1220]"
              >
                <Link to="/login" onClick={() => setMobileNavOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setMobileNavOpen(false);
                  setOnboardingWizardOpen(true);
                }}
                className="bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
              >
                Register School
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Concise NDH Family Footer */}
      <footer className="border-t border-[#e4e7ec] bg-[#f5f6f8] text-[#364152]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="space-y-2.5">
            <NDHBrandLockup theme="light" />
            <p className="text-xs leading-relaxed text-[#364152]">
              Nigerian school software for results, fees, attendance & parent updates.
            </p>
            <div className="space-y-1 text-xs">
              <div>
                <a
                  href={NDH_PARENT_CONTACT.phoneHref}
                  className="font-semibold text-[#1a4a6e] hover:underline"
                >
                  {NDH_PARENT_CONTACT.phoneDisplay}
                </a>{" "}
                •{" "}
                <a
                  href={`mailto:${NDH_PARENT_CONTACT.email}`}
                  className="font-semibold text-[#1a4a6e] hover:underline"
                >
                  {NDH_PARENT_CONTACT.email}
                </a>
              </div>
              <div className="text-[11px] text-[#667085]">
                {NDH_PARENT_CONTACT.address}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#0b1220] uppercase">
              Platform
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs">
              <li>
                <Link to="/features" className="hover:text-[#1a4a6e]">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/for-schools" className="hover:text-[#1a4a6e]">
                  For Schools
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-[#1a4a6e]">
                  Termly & Session Pricing
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="hover:text-[#1a4a6e]">
                  Video Tutorials
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#0b1220] uppercase">
              Access
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setOnboardingWizardOpen(true)}
                  className="cursor-pointer hover:text-[#1a4a6e]"
                >
                  Register School
                </button>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1a4a6e]">
                  Staff & Parent Login
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#1a4a6e]">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#0b1220] uppercase">
              NDH Family
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs">
              {DEFAULT_NDH_ECOSYSTEM_LINKS.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#1a4a6e]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#e4e7ec] bg-white px-4 py-3.5 text-center text-[11px] text-[#667085]">
          © 2026 NDH SchoolOS • Najeeb Digital Hub (ndh.com.ng) • Made in Nigeria
        </div>
      </footer>

      <SchoolOSAIAssistant
        onStartPilot={() => setOnboardingWizardOpen(true)}
      />
      <SaaSOnboardingWizard />
    </div>
  );
}
