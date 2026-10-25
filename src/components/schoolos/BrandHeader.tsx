import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  Calculator,
  ChevronDown,
  ClipboardCheck,
  CloudOff,
  DatabaseBackup,
  LogOut,
  Menu,
  Palette,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { NDHBrandLockup } from "./NDHBrandLockup";
import { SchoolCrest } from "./SchoolCrest";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { getAllowedNavSections } from "@/services/accessControl";
import { getResolvedCustomization } from "@/services/customizationDefaults";
import { useOfflineStatus } from "@/services/offlineService";
import type { UserRole } from "@/types/school";

interface BrandHeaderProps {
  onOpenMobileMenu: () => void;
}

const ROLE_META: Record<
  UserRole,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  admin: { label: "School Owner / Admin", icon: ShieldCheck },
  class_teacher: { label: "Class Teacher", icon: BookOpen },
  subject_teacher: { label: "Subject Teacher", icon: BookOpen },
  bursar: { label: "Bursar / Accountant", icon: Calculator },
  secretary: { label: "School Secretary", icon: ClipboardCheck },
  muallim: { label: "Qur'an Instructor", icon: Sparkles },
  parent: { label: "Parent Portal", icon: Users },
};

export function BrandHeader({ onOpenMobileMenu }: BrandHeaderProps) {
  const navigate = useNavigate();
  const {
    db,
    portal,
    updateSettings,
    logoutSession,
    setOnboardingWizardOpen,
    setActiveNav,
  } = useSchoolOS();
  const { settings } = db;
  const custom = getResolvedCustomization(settings);
  const { primaryColor, highlightColor } = custom.workspaceTheme;
  const offline = useOfflineStatus();
  const allowedNav = getAllowedNavSections(
    portal.role,
    settings.enableQuranModule
  );

  const roleMeta = ROLE_META[portal.role];
  const RoleIcon = roleMeta.icon;

  const handleSignOut = () => {
    logoutSession();
    void navigate({ to: "/login" });
  };

  const handleOfflinePillClick = () => {
    if (allowedNav.includes("backups")) {
      setActiveNav("backups");
    } else {
      toast.success(
        offline.isOnline
          ? "Offline Vault Active — all scores, attendance, and records save directly to this device."
          : "Offline Mode Active — your work is saving locally without internet."
      );
    }
  };

  return (
    <header
      className="no-print sticky top-0 z-30 border-b border-white/10 text-white shadow-sm"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        {/* Left: Mobile Menu + NDH Parent Lockup + Active School */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          {portal.role !== "parent" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              className="h-9 w-9 shrink-0 text-slate-200 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Link to="/" className="shrink-0">
            <NDHBrandLockup theme="dark" compact />
          </Link>

          <div
            className="hidden h-7 w-px bg-white/15 md:block"
            aria-hidden="true"
          />

          <div className="hidden min-w-0 items-center gap-2.5 md:flex">
            <SchoolCrest settings={settings} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-white">
                  {settings.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                <Building2
                  className="h-3 w-3 shrink-0"
                  style={{ color: highlightColor }}
                />
                <span>
                  {settings.currentSession} • {settings.currentTerm}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Offline Pill + Session/Term + Video Guide + Account Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleOfflinePillClick}
            title="Offline & Local Vault Status"
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition ${
              offline.isOnline
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                : "border-amber-300/60 bg-amber-500/25 text-amber-100 hover:bg-amber-500/35"
            }`}
          >
            {offline.isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Offline Ready</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5 text-amber-300" />
                <span>Offline Mode</span>
              </>
            )}
          </button>

          {portal.role === "admin" && (
            <div className="hidden items-center gap-1.5 xl:flex">
              <Select
                value={settings.currentSession}
                onValueChange={(val) =>
                  updateSettings(
                    (prev) => ({ ...prev, currentSession: val }),
                    `Switched active session to ${val}`
                  )
                }
              >
                <SelectTrigger className="h-8 w-[114px] border-white/15 bg-white/10 text-xs font-semibold text-white">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  {settings.sessions.map((ses) => (
                    <SelectItem key={ses} value={ses}>
                      {ses}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={settings.currentTerm}
                onValueChange={(val) =>
                  updateSettings(
                    (prev) => ({ ...prev, currentTerm: val }),
                    `Switched active term to ${val}`
                  )
                }
              >
                <SelectTrigger className="h-8 w-[124px] border-white/15 bg-white/10 text-xs font-semibold text-white">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  {settings.terms.map((trm) => (
                    <SelectItem key={trm} value={trm}>
                      {trm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-8 gap-1.5 border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/15 hover:text-white sm:inline-flex"
          >
            <Link to="/tutorials">
              <PlayCircle
                className="h-3.5 w-3.5"
                style={{ color: highlightColor }}
              />
              <span>Video Guide</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/15 hover:text-white"
              >
                <span style={{ color: highlightColor }}>
                  <RoleIcon className="h-3.5 w-3.5" />
                </span>
                <span className="max-w-[130px] truncate">{roleMeta.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">
                <div className="font-bold text-[#0b1220]">
                  {portal.displayName}
                </div>
                <div className="mt-0.5 text-[11px] font-normal text-[#667085]">
                  {portal.subtitle}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {portal.role === "admin" && (
                <DropdownMenuItem
                  onClick={() => setActiveNav("customize")}
                  className="cursor-pointer text-xs font-medium"
                >
                  <Palette className="mr-2 h-3.5 w-3.5 text-[#1a4a6e]" />
                  Customize Report Sheets & Theme
                </DropdownMenuItem>
              )}

              {allowedNav.includes("backups") && (
                <DropdownMenuItem
                  onClick={() => setActiveNav("backups")}
                  className="cursor-pointer text-xs font-medium"
                >
                  <DatabaseBackup className="mr-2 h-3.5 w-3.5 text-[#067647]" />
                  Backups, Offline & Excel Export
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => void navigate({ to: "/tutorials" })}
                className="cursor-pointer text-xs font-medium"
              >
                <PlayCircle className="mr-2 h-3.5 w-3.5 text-[#1a4a6e]" />
                Watch Role Video Tutorials
              </DropdownMenuItem>

              {portal.role === "admin" && (
                <DropdownMenuItem
                  onClick={() => setOnboardingWizardOpen(true)}
                  className="cursor-pointer text-xs font-medium"
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-[#1a4a6e]" />
                  School Setup Wizard
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-xs font-semibold text-[#b42318] focus:text-[#b42318]"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
