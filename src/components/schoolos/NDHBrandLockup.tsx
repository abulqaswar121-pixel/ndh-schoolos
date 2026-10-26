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
      ? "h-9 w-9 sm:h-10 sm:w-10"
      : effectiveSize === "lg"
        ? "h-11 w-11 sm:h-12 sm:w-12"
        : "h-10 w-10 sm:h-11 sm:w-11";

  const topLineClass =
    theme === "dark" ? "text-[#9ed9d6]" : "text-[#1a4a6e]";

  const mainTitleClass =
    theme === "dark" ? "text-white" : "text-[#0b1220]";

  const content = (
    <div className="inline-flex min-w-0 items-center gap-2.5 text-left sm:gap-3.5">
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
          className={`truncate text-[9px] font-extrabold tracking-[0.14em] uppercase sm:text-[10px] sm:tracking-[0.18em] ${topLineClass}`}
        >
          NAJEEB DIGITAL HUB
        </div>
        <div
          className={`font-display truncate font-bold tracking-tight ${
            effectiveSize === "sm"
              ? "text-base sm:text-lg"
              : effectiveSize === "lg"
                ? "text-lg sm:text-2xl"
                : "text-base sm:text-xl"
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
