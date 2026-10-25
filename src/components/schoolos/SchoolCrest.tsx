import React from "react";
import type { SchoolSettings } from "@/types/school";

interface SchoolCrestProps {
  settings: SchoolSettings;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SchoolCrest({
  settings,
  size = "md",
  className = "",
}: SchoolCrestProps) {
  const dims =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-16 w-16 text-base"
        : "h-12 w-12 text-sm";

  if (settings.logoDataUrl) {
    return (
      <img
        src={settings.logoDataUrl}
        alt={`${settings.name} logo`}
        className={`${dims} shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims} relative flex shrink-0 items-center justify-center rounded-xl border border-slate-800/15 bg-[#0F172A] text-white shadow-xs ${className}`}
      aria-label={`${settings.name} crest`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="h-full w-full p-1.5"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer precision shield */}
        <path
          d="M24 4L40 10V23C40 33.4 33.1 40.9 24 44C14.9 40.9 8 33.4 8 23V10L24 4Z"
          stroke="#93C5FD"
          strokeWidth="2"
          fill="#1E293B"
        />
        {/* Open book / knowledge motif */}
        <path
          d="M15 19C18 18.2 21 19 24 20.8C27 19 30 18.2 33 19V29.5C30 28.7 27 29.5 24 31.2C21 29.5 18 28.7 15 29.5V19Z"
          stroke="#F8FAFC"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M24 20.8V31.2" stroke="#93C5FD" strokeWidth="1.5" />
        {/* Eight-point star / compass accent */}
        <circle cx="24" cy="13" r="2.2" fill="#38BDF8" />
      </svg>
    </div>
  );
}
