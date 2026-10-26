import { ExternalLink } from "lucide-react";
import React from "react";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { NDH_PARENT_CONTACT } from "@/data/ndhLinks";

export function EcosystemFooter() {
  const { db, portal, setActiveNav } = useSchoolOS();
  const links = db.settings.ndhFooterLinks ?? [];

  return (
    <footer className="no-print mt-auto border-t border-[#e4e7ec] bg-white px-4 pt-5 pb-20 sm:px-6 sm:pb-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#1a4a6e] uppercase">
            NAJEEB DIGITAL HUB • MADE IN NIGERIA
          </div>
          <p className="mt-0.5 text-xs font-medium text-[#364152]">
            <span className="font-bold text-[#0b1220]">
              © 2026 NDH SchoolOS • A family business of Najeeb Digital Hub
            </span>{" "}
            • {db.settings.name} ({db.settings.currentSession}) • Support:{" "}
            <a
              href={NDH_PARENT_CONTACT.phoneHref}
              className="font-semibold text-[#1a4a6e] hover:underline"
            >
              {NDH_PARENT_CONTACT.phoneDisplay}
            </a>
          </p>
        </div>

        <nav
          aria-label="NDH Ecosystem Links"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#364152] transition-colors hover:text-[#1a4a6e]"
              title={link.tagline || link.label}
            >
              <span>{link.label}</span>
              {link.url.startsWith("http") && (
                <ExternalLink className="h-3 w-3 text-[#667085]" />
              )}
            </a>
          ))}
          {portal.isAuthenticated && portal.role === "admin" && (
            <button
              type="button"
              onClick={() => setActiveNav("settings")}
              className="rounded-md border border-dashed border-[#d0d5dd] bg-[#f5f6f8] px-2 py-0.5 text-[11px] font-medium text-[#364152] transition hover:border-[#1a4a6e] hover:text-[#0b1220]"
              title="Edit NDH footer links in Settings"
            >
              Edit Footer Links
            </button>
          )}
        </nav>
      </div>
    </footer>
  );
}
