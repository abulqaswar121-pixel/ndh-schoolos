import {
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ClipboardList,
  DatabaseBackup,
  GraduationCap,
  LayoutDashboard,
  Palette,
  ReceiptText,
  Settings2,
} from "lucide-react";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { getAllowedNavSections } from "@/services/accessControl";
import { getResolvedCustomization } from "@/services/customizationDefaults";
import type { NavSectionId } from "@/types/school";

interface NavItemConfig {
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | undefined;
}

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  const { db, portal, activeNav, setActiveNav } = useSchoolOS();
  const { settings } = db;
  const custom = getResolvedCustomization(settings);
  const { primaryColor, accentColor, highlightColor } = custom.workspaceTheme;

  const allowedSet = new Set(
    getAllowedNavSections(portal.role, settings.enableQuranModule)
  );

  const pendingScoreApprovals =
    portal.role === "admin"
      ? db.pendingScoreEdits.filter((r) => r.status === "pending").length
      : 0;
  const pendingBankTransfers =
    portal.role === "admin" || portal.role === "bursar"
      ? db.payments.filter((p) => p.confirmationStatus === "Pending Confirmation")
          .length
      : 0;

  const navItems: NavItemConfig[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "students",
      label: "Students",
      icon: GraduationCap,
    },
    {
      id: "classes",
      label: settings.labels.classPlural,
      icon: Building2,
    },
    {
      id: "academics",
      label: settings.enableQuranModule
        ? "Results & Qur'an"
        : "Results & Report Cards",
      icon: BookOpenCheck,
      badge: pendingScoreApprovals > 0 ? pendingScoreApprovals : undefined,
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: CalendarCheck2,
    },
    {
      id: "fees",
      label: "Fees & Receipts",
      icon: ReceiptText,
      badge: pendingBankTransfers > 0 ? pendingBankTransfers : undefined,
    },
    {
      id: "notices",
      label: "Parent Notices",
      icon: BellRing,
    },
    {
      id: "staff",
      label: "Staff & Payroll",
      icon: BriefcaseBusiness,
    },
    {
      id: "audit",
      label: "Audit Log",
      icon: ClipboardList,
    },
    {
      id: "customize",
      label: "Customize & Design",
      icon: Palette,
    },
    {
      id: "backups",
      label: "Backups & Offline",
      icon: DatabaseBackup,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings2,
    },
  ];

  const visibleItems = navItems.filter((item) => allowedSet.has(item.id));

  const handleSelect = (id: NavSectionId) => {
    setActiveNav(id);
    onMobileOpenChange(false);
  };

  const renderDrawerInner = () => (
    <div
      className="flex h-full flex-col text-slate-100"
      style={{ backgroundColor: primaryColor }}
    >
      {/* School Identity Block (pr-12 clears mobile Sheet Close [X] button) */}
      <div className="border-b border-white/10 py-4 pr-12 pl-4 lg:px-4">
        <div
          className="text-[11px] font-extrabold tracking-[0.14em] uppercase"
          style={{ color: highlightColor }}
        >
          {settings.multiProgrammeEnabled
            ? `${settings.programmes.length} Programmes Active`
            : "Najeeb Digital Hub • School"}
        </div>
        <div className="mt-1 truncate text-sm font-extrabold text-white">
          {settings.name}
        </div>
        {settings.arabicName && (
          <div
            dir="rtl"
            lang="ar"
            className="font-arabic mt-0.5 truncate text-right text-sm font-bold text-slate-200"
          >
            {settings.arabicName}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                active
                  ? "bg-white font-extrabold text-[#0b1220] shadow-xs"
                  : "text-slate-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  style={{
                    color: active ? accentColor : highlightColor,
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-extrabold text-[#0b1220]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Signed-in User Scope */}
      <div className="border-t border-white/10 p-3.5">
        <div className="rounded-xl bg-black/25 px-3 py-2.5 text-xs">
          <div className="truncate font-semibold text-white">
            {portal.displayName}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-slate-300">
            {portal.subtitle}
          </div>
        </div>
      </div>
    </div>
  );

  if (portal.role === "parent") {
    return null;
  }

  return (
    <>
      <aside
        className="no-print hidden w-64 shrink-0 border-r border-white/10 lg:flex lg:flex-col"
        style={{ backgroundColor: primaryColor }}
      >
        {renderDrawerInner()}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 border-r border-white/10 p-0 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>School Workspace Navigation</SheetTitle>
            <SheetDescription>
              Switch between school modules and tools
            </SheetDescription>
          </SheetHeader>
          {renderDrawerInner()}
        </SheetContent>
      </Sheet>
    </>
  );
}
