import { School } from "lucide-react";
import React from "react";

interface NDHBrandLockupProps {
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  compact?: boolean | undefined;
  onClick?: () => void;
}

/**
 * Official NDH Family Open Gateway Identity (Matches ndh.com.ng)
 * Uses the shared Open Gateway symbol inside the NDH family gradient tile
 * with the School sector badge integrated into the bottom-right corner.
 */
export function NDHBrandLockup({
  theme = "light",
  size = "md",
  compact = false,
  onClick,
}: NDHBrandLockupProps) {
  const effectiveSize = compact ? "sm" : size;
  const tileDimensions =
    effectiveSize === "sm"
      ? "h-10 w-10"
      : effectiveSize === "lg"
        ? "h-12 w-12"
        : "h-11 w-11";

  const topLineClass =
    theme === "dark" ? "text-[#9ed9d6]" : "text-[#1a4a6e]";

  const mainTitleClass =
    theme === "dark" ? "text-white" : "text-[#0b1220]";

  const content = (
    <div className="inline-flex items-center gap-3.5 text-left">
      <span className="ndh-family-symbol" aria-hidden="true">
        <span className={`ndh-family-tile ${tileDimensions}`}>
          <img
            src="/images/ndh-logo-gateway-cropped.png"
            alt=""
            width={684}
            height={679}
          />
        </span>
        <span className="ndh-family-sector">
          <School strokeWidth={2.2} />
        </span>
      </span>

      <div className="min-w-0 leading-tight">
        <div
          className={`truncate text-[10px] font-extrabold tracking-[0.2em] uppercase ${topLineClass}`}
        >
          NAJEEB DIGITAL HUB
        </div>
        <div
          className={`font-display truncate font-bold tracking-tight ${
            size === "sm"
              ? "text-base sm:text-lg"
              : size === "lg"
                ? "text-xl sm:text-2xl"
                : "text-lg sm:text-xl"
          } ${mainTitleClass}`}
        >
          NDH SchoolOS
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a6e]"
      >
        {content}
      </button>
    );
  }

  return content;
}
