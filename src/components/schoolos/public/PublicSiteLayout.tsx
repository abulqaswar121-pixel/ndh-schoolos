import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, Phone, PlayCircle, X } from "lucide-react";
import React, { useEffect, useState } from "react";
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

const TICKER_MESSAGES = [
  PRICING_CONFIG.pilotOfferBanner,
  "Pay Termly or Per Session (Save 17%)",
  "CA 1 • CA 2 • Exam Broadsheets & Single-Page A4 Report Cards",
  "One Parent Phone Login for All Linked Siblings",
];

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const { db, portal, setOnboardingWizardOpen } = useSchoolOS();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-[#0b1220]">
      {/* Moving Pre-Nav Bar — Static flow so it scrolls away cleanly on scroll */}
      <div
        aria-label="Platform announcements"
        className="ndh-top-ticker text-xs text-white"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          {/* Left Pinned Live Badge */}
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#9ed9d6]/35 bg-[#1a4a6e]/80 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-[#9ed9d6] uppercase sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Pilot Open
          </span>

          {/* Center Smooth Seamless Moving Marquee (2 identical halves x 2 sets each = >2600px per half, zero gap) */}
          <div className="ndh-top-ticker-viewport">
            <div className="ndh-top-ticker-track">
              {[0, 1].map((halfIdx) => (
                <div
                  key={halfIdx}
                  aria-hidden={halfIdx === 1 ? true : undefined}
                  className="flex shrink-0 items-center"
                >
                  {[0, 1].map((repeatIdx) =>
                    TICKER_MESSAGES.map((msg) => (
                      <span
                        key={`${halfIdx}-${repeatIdx}-${msg}`}
                        className="inline-flex shrink-0 items-center gap-2 pr-8 font-medium text-slate-100"
                      >
                        <span className="h-1 w-1 rounded-full bg-[#9ed9d6]" />
                        <span>{msg}</span>
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Pinned Support & Quick Action */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <a
              href={NDH_PARENT_CONTACT.phoneHref}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 transition hover:text-[#9ed9d6]"
            >
              <Phone className="h-3 w-3 text-[#9ed9d6]" />
              {NDH_PARENT_CONTACT.phoneDisplay}
            </a>
            <span className="h-3 w-px bg-white/20" />
            <button
              type="button"
              onClick={() => setOnboardingWizardOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#9ed9d6] transition hover:text-white"
            >
              Register Free
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Main Navbar — Pins to top:0 once the moving top bar scrolls away */}
      <header
        className={`sticky top-0 z-50 w-full border-b border-[#e4e7ec] bg-white/95 backdrop-blur-md transition-shadow duration-200 ${
          isScrolled ? "shadow-md" : "shadow-2xs"
        }`}
      >
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
