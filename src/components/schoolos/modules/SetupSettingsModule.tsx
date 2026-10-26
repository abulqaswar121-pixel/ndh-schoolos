import {
  Building2,
  DatabaseBackup,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { SchoolCrest } from "../SchoolCrest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";

export function SetupSettingsModule() {
  const { db, portal, setActiveNav, updateSettings, setOnboardingWizardOpen } =
    useSchoolOS();
  const { settings } = db;

  const [newProgrammeName, setNewProgrammeName] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  if (portal.role !== "admin") {
    return (
      <div className="ndh-card p-8 text-center text-sm text-slate-600">
        Only the Proprietor / Admin can access school settings.
      </div>
    );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) {
        updateSettings(
          (prev) => ({ ...prev, logoDataUrl: dataUrl }),
          "Uploaded School Logo"
        );
        toast.success(
          "School logo saved. It now appears on report cards, receipts and payslips."
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddProgramme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgrammeName.trim()) {
      toast.error("Enter a programme name (e.g. Evening Lessons).");
      return;
    }
    const id = `prog-${Date.now()}`;
    updateSettings(
      (prev) => ({
        ...prev,
        multiProgrammeEnabled: true,
        programmes: [
          ...prev.programmes,
          { id, name: newProgrammeName.trim() },
        ],
      }),
      `Added Programme: ${newProgrammeName.trim()}`
    );
    setNewProgrammeName("");
    toast.success("Added school programme.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            School Settings
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            School details, logo, programmes, custom labels, fee bank details and optional modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveNav("customize")}
            className="border-[#9ed9d6] bg-white text-xs font-semibold text-[#1a4a6e] hover:bg-[#edf7f6]"
          >
            <Palette className="mr-1.5 h-3.5 w-3.5" />
            Customize Report Sheets & Theme
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveNav("backups")}
            className="border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            <DatabaseBackup className="mr-1.5 h-3.5 w-3.5" />
            Backups, Offline & Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOnboardingWizardOpen(true)}
            className="border-[#9ed9d6] bg-[#edf7f6] text-xs font-semibold text-[#1a4a6e] hover:bg-[#d8efed] hover:text-[#0c2340]"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            School Setup Wizard
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap bg-slate-200/80 p-1">
          <TabsTrigger value="identity" className="text-xs font-bold">
            School Identity & Logo
          </TabsTrigger>
          <TabsTrigger value="programmes" className="text-xs font-bold">
            Programmes & Labels
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs font-bold">
            Bank & Discounts
          </TabsTrigger>
          <TabsTrigger value="optional" className="text-xs font-bold">
            Optional Modules & Footer
          </TabsTrigger>
        </TabsList>

        {/* 1. Identity & Logo */}
        <TabsContent value="identity" className="ndh-card space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-4">
            <SchoolCrest settings={settings} size="lg" />
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-[#0F172A]">
                School Crest / Logo
              </div>
              <p className="text-xs text-slate-600">
                Appears automatically on report cards, broadsheets, fee receipts and staff payslips.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5 text-[#1E3A8A]" />
                Upload School Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">School Name</Label>
              <Input
                defaultValue={settings.name}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, name: e.target.value }),
                    "Updated School Name"
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Short School Code</Label>
              <Input
                defaultValue={settings.code}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, code: e.target.value.toUpperCase() }),
                    "Updated School Code"
                  )
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold">School Motto</Label>
              <Input
                defaultValue={settings.motto}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, motto: e.target.value }),
                    "Updated School Motto"
                  )
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold">Address</Label>
              <Input
                defaultValue={settings.address}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, address: e.target.value }),
                    "Updated School Address"
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Phone Number</Label>
              <Input
                defaultValue={settings.phone}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, phone: e.target.value }),
                    "Updated School Phone"
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Email Address</Label>
              <Input
                defaultValue={settings.email}
                onBlur={(e) =>
                  updateSettings(
                    (prev) => ({ ...prev, email: e.target.value }),
                    "Updated School Email"
                  )
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* 2. Programmes & Customizable Labels */}
        <TabsContent value="programmes" className="space-y-4">
          <div className="ndh-card space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#0F172A]">
                  Does your school run more than one programme?
                </h2>
                <p className="text-xs text-slate-600">
                  Keep this set to <strong>No</strong> for a standard single-programme school, or turn on for Evening Lessons, Vocational Classes or Islamic Studies.
                </p>
              </div>

              <div className="flex items-center rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() =>
                    updateSettings(
                      (prev) => ({ ...prev, multiProgrammeEnabled: false }),
                      "Set Multi-Programme to No"
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 transition ${
                    !settings.multiProgrammeEnabled
                      ? "bg-[#0F172A] text-white"
                      : "text-slate-700"
                  }`}
                >
                  No (Single School)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings(
                      (prev) => ({ ...prev, multiProgrammeEnabled: true }),
                      "Set Multi-Programme to Yes"
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 transition ${
                    settings.multiProgrammeEnabled
                      ? "bg-[#0F172A] text-white"
                      : "text-slate-700"
                  }`}
                >
                  Yes (Multiple Programmes)
                </button>
              </div>
            </div>

            {settings.multiProgrammeEnabled && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  {settings.programmes.map((prog, idx) => (
                    <div
                      key={prog.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
                    >
                      <Input
                        defaultValue={prog.name}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (!val) return;
                          updateSettings(
                            (prev) => ({
                              ...prev,
                              programmes: prev.programmes.map((p) =>
                                p.id === prog.id ? { ...p, name: val } : p
                              ),
                            }),
                            `Renamed Programme to ${val}`
                          );
                        }}
                        className="h-8 max-w-xs bg-white font-bold"
                      />
                      {idx > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSettings(
                              (prev) => ({
                                ...prev,
                                programmes: prev.programmes.filter(
                                  (p) => p.id !== prog.id
                                ),
                              }),
                              `Removed Programme ${prog.name}`
                            )
                          }
                          className="h-8 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddProgramme} className="flex gap-2">
                  <Input
                    value={newProgrammeName}
                    onChange={(e) => setNewProgrammeName(e.target.value)}
                    placeholder="Add programme (e.g. Vocational Classes, Islamic Studies)"
                    className="max-w-sm text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Programme
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Customizable School Labels */}
          <div className="ndh-card space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="text-sm font-extrabold text-[#0F172A]">
                Custom School Labels
              </h2>
              <p className="text-xs text-slate-600">
                "Class" and "Teacher" are used by default. Rename them here if your school prefers "Arm", "Grade", "Halqah" or "Instructor".
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Class (Singular)</Label>
                <Input
                  defaultValue={settings.labels.classSingular}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        labels: {
                          ...prev.labels,
                          classSingular: e.target.value || "Class",
                        },
                      }),
                      "Updated Class Singular Label"
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Classes (Plural)</Label>
                <Input
                  defaultValue={settings.labels.classPlural}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        labels: {
                          ...prev.labels,
                          classPlural: e.target.value || "Classes",
                        },
                      }),
                      "Updated Class Plural Label"
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Teacher (Singular)</Label>
                <Input
                  defaultValue={settings.labels.teacherSingular}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        labels: {
                          ...prev.labels,
                          teacherSingular: e.target.value || "Teacher",
                        },
                      }),
                      "Updated Teacher Singular Label"
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Teachers (Plural)</Label>
                <Input
                  defaultValue={settings.labels.teacherPlural}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        labels: {
                          ...prev.labels,
                          teacherPlural: e.target.value || "Teachers",
                        },
                      }),
                      "Updated Teacher Plural Label"
                    )
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. Bank Account & Sibling Discount */}
        <TabsContent value="finance" className="ndh-card space-y-5 p-4 sm:p-6">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F172A]">
              <Building2 className="h-4 w-4 text-[#1E3A8A]" />
              School Fee Bank Account (Shown to Parents for Bank Transfers)
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Bank Name</Label>
                <Input
                  defaultValue={settings.bankAccountDetails.bankName}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        bankAccountDetails: {
                          ...prev.bankAccountDetails,
                          bankName: e.target.value,
                        },
                      }),
                      "Updated School Bank Name"
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Account Number</Label>
                <Input
                  defaultValue={settings.bankAccountDetails.accountNumber}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        bankAccountDetails: {
                          ...prev.bankAccountDetails,
                          accountNumber: e.target.value,
                        },
                      }),
                      "Updated School Account Number"
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Account Name</Label>
                <Input
                  defaultValue={settings.bankAccountDetails.accountName}
                  onBlur={(e) =>
                    updateSettings(
                      (prev) => ({
                        ...prev,
                        bankAccountDetails: {
                          ...prev.bankAccountDetails,
                          accountName: e.target.value,
                        },
                      }),
                      "Updated School Account Name"
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-[#0F172A]">
                  Automatic Sibling Fee Discount
                </div>
                <p className="text-xs text-slate-600">
                  Applies automatically when {settings.siblingDiscount.minChildren} or more children share the same parent phone number.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.siblingDiscount.enabled}
                onChange={(e) =>
                  updateSettings(
                    (prev) => ({
                      ...prev,
                      siblingDiscount: {
                        ...prev.siblingDiscount,
                        enabled: e.target.checked,
                      },
                    }),
                    `Toggled Sibling Discount ${e.target.checked ? "On" : "Off"}`
                  )
                }
                className="h-4 w-4"
              />
            </div>
          </div>
        </TabsContent>

        {/* 4. Optional Qur'an Module & NDH Footer */}
        <TabsContent value="optional" className="space-y-4">
          <div className="ndh-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
            <div className="max-w-xl">
              <div className="text-sm font-extrabold text-[#0F172A]">
                Optional 114-Surah Qur'an Memorization Module
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Off by default and completely hidden when off. Turn this on only if your school runs an Islamic or Qur'an memorization programme and wants Surah/Ayah tracking and the Mu'allim role.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !settings.enableQuranModule;
                updateSettings(
                  (prev) => ({ ...prev, enableQuranModule: next }),
                  `Set Optional Qur'an Module ${next ? "ON" : "OFF"}`
                );
                toast.success(
                  next
                    ? "Optional 114-Surah Qur'an module enabled."
                    : "Optional Qur'an module turned off and hidden."
                );
              }}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                settings.enableQuranModule
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {settings.enableQuranModule
                ? "Enabled (Click to Turn Off)"
                : "Off by Default (Click to Enable)"}
            </button>
          </div>

          <div className="ndh-card space-y-3 p-4 sm:p-6">
            <div className="text-sm font-extrabold text-[#0F172A]">
              NDH Footer Links
            </div>
            <div className="space-y-2">
              {settings.ndhFooterLinks.map((lnk) => (
                <div
                  key={lnk.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <strong>{lnk.label}</strong>{" "}
                    <span className="text-slate-500">({lnk.url})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSettings(
                        (prev) => ({
                          ...prev,
                          ndhFooterLinks: prev.ndhFooterLinks.filter(
                            (x) => x.id !== lnk.id
                          ),
                        }),
                        "Removed Footer Link"
                      )
                    }
                    className="h-7 border-red-200 bg-white text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Link title"
                className="max-w-[200px] text-xs"
              />
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://ndh.com.ng"
                className="max-w-xs text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
                  updateSettings(
                    (prev) => ({
                      ...prev,
                      ndhFooterLinks: [
                        ...prev.ndhFooterLinks,
                        {
                          id: `ndh-${Date.now()}`,
                          label: newLinkLabel.trim(),
                          url: newLinkUrl.trim(),
                        },
                      ],
                    }),
                    "Added Footer Link"
                  );
                  setNewLinkLabel("");
                  setNewLinkUrl("");
                }}
                className="bg-[#0F172A] text-xs font-bold text-white"
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                Add Link
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
