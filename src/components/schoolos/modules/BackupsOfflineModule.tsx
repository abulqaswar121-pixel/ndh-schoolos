import {
  CheckCircle2,
  CloudOff,
  DatabaseBackup,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  History,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Wifi,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  type BackupEnvelope,
  type LocalSnapshotRecord,
  buildMasterSchoolWorkbookSheets,
  deleteLocalSnapshot,
  exportDatasetAsJson,
  exportSpreadsheetWorkbookXls,
  listLocalSnapshots,
  parseAndValidateBackupJson,
} from "@/services/backupExportService";
import { exportRowsToCsv } from "@/services/calculations";
import { getResolvedCustomization } from "@/services/customizationDefaults";
import {
  useOfflineStatus,
  warmAllPortalModulesAndRoutes,
} from "@/services/offlineService";

interface BackupsOfflineModuleProps {
  preloadAllModules?: () => Promise<unknown>;
}

export function BackupsOfflineModule({
  preloadAllModules,
}: BackupsOfflineModuleProps) {
  const {
    db,
    portal,
    updateSettings,
    downloadCompleteBackup,
    createManualSnapshot,
    restoreFromBackupSnapshot,
  } = useSchoolOS();
  const offline = useOfflineStatus();
  const isAdmin = portal.role === "admin";
  const custom = getResolvedCustomization(db.settings);

  const [warmingOffline, setWarmingOffline] = useState(false);
  const [snapshots, setSnapshots] = useState<LocalSnapshotRecord[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [pendingRestore, setPendingRestore] = useState<{
    envelope: BackupEnvelope;
    checksumVerified: boolean;
    fileName: string;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const refreshSnapshots = useCallback(async () => {
    if (!isAdmin) return;
    const list = await listLocalSnapshots();
    setSnapshots(list);
  }, [isAdmin]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots, db]);

  const handleSaveOffline = async () => {
    setWarmingOffline(true);
    const res = await warmAllPortalModulesAndRoutes(preloadAllModules);
    setWarmingOffline(false);
    if (res.ok) {
      toast.success(
        "App modules & pages saved to this device for zero-data offline work."
      );
    } else {
      toast.info(
        "Local database is already saved offline on this device."
      );
    }
  };

  const workbookSheets = buildMasterSchoolWorkbookSheets(db, portal.role);
  const safeCode = (db.settings.code || "school")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const todayStr = new Date().toISOString().slice(0, 10);

  const handleMasterExcelDownload = () => {
    exportSpreadsheetWorkbookXls(
      `${safeCode}-master-workbook-${todayStr}.xls`,
      workbookSheets,
      custom.workspaceTheme.primaryColor
    );
    toast.success(
      `Downloaded multi-sheet Excel workbook (${workbookSheets.length} sheets).`
    );
  };

  const handleBackupFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseAndValidateBackupJson(text);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      setPendingRestore({
        envelope: parsed.envelope,
        checksumVerified: parsed.checksumVerified,
        fileName: file.name,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setRestoring(true);
    const res = await restoreFromBackupSnapshot(
      pendingRestore.envelope.snapshot,
      `File: ${pendingRestore.fileName}`
    );
    setRestoring(false);
    if (!res.ok) {
      toast.error(res.error ?? "Restore failed.");
      return;
    }
    setPendingRestore(null);
    await refreshSnapshots();
    toast.success(
      `Restored ${pendingRestore.envelope.schoolName} workspace (a pre-restore safety point was saved automatically).`
    );
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      `${db.settings.currentTerm} Restore Point (${new Date().toLocaleDateString()})`;
    const created = await createManualSnapshot(label);
    if (created) {
      setSnapshotLabel("");
      await refreshSnapshots();
      toast.success("Saved local restore point on this device.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#1a4a6e] uppercase">
            <DatabaseBackup className="h-3.5 w-3.5" />
            Offline Engine • Backups • Excel & Multi-Format Exports
          </div>
          <h1 className="mt-0.5 text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Offline Mode, Backups & Data Exports
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Work smoothly without internet, download complete school backups, restore snapshots, and export any record to Excel (.xls), CSV, or JSON.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleMasterExcelDownload}
          className="w-fit bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
        >
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Export All to Excel (.xls)
        </Button>
      </div>

      {/* 1. OFFLINE READINESS & MINIMAL-DATA CARD */}
      <div className="ndh-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                  offline.isOnline
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {offline.isOnline ? (
                  <>
                    <Wifi className="h-3.5 w-3.5" />
                    Online • Zero-Data Local Storage Active
                  </>
                ) : (
                  <>
                    <CloudOff className="h-3.5 w-3.5" />
                    Offline Mode • Working Without Internet
                  </>
                )}
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Local Vault: {Math.max(1, offline.storageUsedKb)} KB used
              </span>
            </div>

            <h2 className="text-base font-extrabold text-[#0F172A]">
              Works 100% Offline for Daily School Operations
            </h2>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
              Admissions, attendance, CA & exam grading, report sheet printing, fee receipts, payroll, and Excel/CSV exports run directly on your device with zero mobile data required. Internet is only needed when sending external WhatsApp/SMS links or streaming tutorial videos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={warmingOffline}
              onClick={() => void handleSaveOffline()}
              className="border-[#9ed9d6] bg-[#edf7f6] text-xs font-bold text-[#1a4a6e] hover:bg-[#d8efed]"
            >
              <HardDriveDownload className="mr-1.5 h-3.5 w-3.5" />
              {warmingOffline
                ? "Saving Modules Offline..."
                : "Save App for Offline Use"}
            </Button>

            {isAdmin && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={custom.workspaceTheme.lowDataMode}
                  onChange={(e) => {
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        customization: {
                          ...getResolvedCustomization(prev),
                          workspaceTheme: {
                            ...getResolvedCustomization(prev).workspaceTheme,
                            lowDataMode: e.target.checked,
                          },
                        },
                      }),
                      "Toggled Low-Data Mode"
                    );
                    toast.success(
                      e.target.checked
                        ? "Low-Data Mode enabled — video autoplay paused to save data."
                        : "Standard media mode restored."
                    );
                  }}
                />
                Low-Data Mode
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 2. EXPORT EVERYTHING TO EXCEL (.XLS), CSV (.CSV) & JSON */}
      <div className="ndh-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A]">
              Export School Records to Excel, CSV & JSON
            </h2>
            <p className="text-xs text-slate-600">
              Download a single multi-sheet Microsoft Excel workbook (.xls) with all {workbookSheets.length} tables, or export individual sheets below.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleMasterExcelDownload}
              className="bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Master Excel Workbook ({workbookSheets.length} Tabs)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workbookSheets.map((sheet) => {
            const slug = sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <div
                key={sheet.name}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0F172A]">
                      {sheet.name}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                      {sheet.rows.length} rows
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {sheet.title ?? sheet.name}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      exportSpreadsheetWorkbookXls(
                        `${safeCode}-${slug}-${todayStr}.xls`,
                        [sheet],
                        custom.workspaceTheme.primaryColor
                      );
                      toast.success(`Exported ${sheet.name} to Excel (.xls)`);
                    }}
                    className="h-7 border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
                  >
                    <FileSpreadsheet className="mr-1 h-3 w-3" />
                    Excel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      exportRowsToCsv(
                        `${safeCode}-${slug}-${todayStr}.csv`,
                        sheet.headers,
                        sheet.rows
                      );
                      toast.success(`Exported ${sheet.name} to CSV`);
                    }}
                    className="h-7 bg-white px-2.5 text-[11px] font-bold text-slate-700"
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    CSV
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const jsonObjects = sheet.rows.map((r) => {
                        const obj: Record<string, string | number | null | undefined> =
                          {};
                        sheet.headers.forEach((h, i) => {
                          obj[h] = r[i];
                        });
                        return obj;
                      });
                      exportDatasetAsJson(
                        `${safeCode}-${slug}-${todayStr}.json`,
                        jsonObjects
                      );
                      toast.success(`Exported ${sheet.name} to JSON`);
                    }}
                    className="h-7 bg-white px-2.5 text-[11px] font-bold text-slate-700"
                  >
                    <FileJson className="mr-1 h-3 w-3" />
                    JSON
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FULL SCHOOL BACKUP, VALIDATED RESTORE & LOCAL SNAPSHOT VAULT (ADMIN ONLY) */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* External Backup File Download & Restore */}
          <div className="ndh-card space-y-4 p-4 sm:p-6 lg:col-span-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 text-base font-extrabold text-[#0F172A]">
                  <ShieldCheck className="h-4 w-4 text-[#067647]" />
                  Full School Backup File (.ndhbackup.json)
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Saves 100% of your school database (students, scores, fees, receipts, payroll, logos, and custom report card designs) to a portable file for USB, Google Drive, or moving to another computer.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">
                  Last External Backup:
                </span>
                <span className="font-bold text-[#0F172A]">
                  {custom.lastExternalBackupAt
                    ? new Date(custom.lastExternalBackupAt).toLocaleString()
                    : "Not downloaded yet — recommended weekly"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                onClick={() => {
                  const env = downloadCompleteBackup();
                  if (env) {
                    toast.success(
                      `Full school backup downloaded (Checksum: ${env.checksum}).`
                    );
                  }
                }}
                className="bg-[#0c2340] text-xs font-bold text-white hover:bg-[#1a4a6e]"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Full Backup Now
              </Button>

              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-bold text-[#0F172A] hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5 text-[#1a4a6e]" />
                Restore from Backup File
                <input
                  type="file"
                  accept=".json,.ndhbackup.json,application/json"
                  onChange={handleBackupFileChosen}
                  className="hidden"
                />
              </label>
            </div>

            {/* Validated Pre-Restore Confirmation Box */}
            {pendingRestore && (
              <div className="space-y-3 rounded-xl border-2 border-[#1a4a6e] bg-[#edf7f6] p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-extrabold text-[#0c2340]">
                    Ready to Restore: {pendingRestore.envelope.schoolName}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                    <CheckCircle2 className="h-3 w-3" />
                    {pendingRestore.checksumVerified
                      ? `Checksum Verified (${pendingRestore.envelope.checksum})`
                      : "Valid Schema"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2.5 sm:grid-cols-4">
                  <div>
                    <div className="text-[10px] text-slate-500">Period</div>
                    <div className="font-bold">
                      {pendingRestore.envelope.session} •{" "}
                      {pendingRestore.envelope.term}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Students</div>
                    <div className="font-bold">
                      {pendingRestore.envelope.counts.students}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Scores</div>
                    <div className="font-bold">
                      {pendingRestore.envelope.counts.scores}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Receipts</div>
                    <div className="font-bold">
                      {pendingRestore.envelope.counts.payments}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-700">
                  A safety snapshot of your current workspace will be saved automatically before restoring.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={restoring}
                    onClick={() => void handleConfirmRestore()}
                    className="bg-[#067647] text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {restoring ? "Restoring..." : "Confirm & Restore Backup"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingRestore(null)}
                    className="bg-white text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Local Rolling Restore Points Vault */}
          <div className="ndh-card space-y-4 p-4 sm:p-6 lg:col-span-6">
            <div>
              <h2 className="flex items-center gap-1.5 text-base font-extrabold text-[#0F172A]">
                <History className="h-4 w-4 text-[#1a4a6e]" />
                Instant Local Restore Points (Offline Vault)
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Save instant restore checkpoints on this device before publishing results, running promotions, or editing fee schedules.
              </p>
            </div>

            <form
              onSubmit={(e) => void handleCreateSnapshot(e)}
              className="flex flex-wrap items-end gap-2"
            >
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs font-bold">
                  Restore Point Label (Optional)
                </Label>
                <Input
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder="e.g. Before First Term Result Lock"
                  className="h-9 text-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Save Restore Point
              </Button>
            </form>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {snapshots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No local restore points yet. Click "Save Restore Point" above to create one in 1 second.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[#0F172A]">
                        {snap.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(snap.createdAt).toLocaleString()} •{" "}
                        {snap.studentCount} students • {snap.scoreCount} scores
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const res = await restoreFromBackupSnapshot(
                            snap.snapshot,
                            `Local Point: ${snap.label}`
                          );
                          if (res.ok) {
                            await refreshSnapshots();
                            toast.success(`Restored "${snap.label}"`);
                          }
                        }}
                        className="h-7 bg-white px-2.5 text-[11px] font-bold text-[#1a4a6e]"
                      >
                        Restore
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deleteLocalSnapshot(snap.id);
                          await refreshSnapshots();
                          toast.success("Removed local restore point.");
                        }}
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
