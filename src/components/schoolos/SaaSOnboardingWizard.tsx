import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ImagePlus,
  Layers,
  Lock,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRICING_CONFIG } from "@/config/pricing";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { DEFAULT_NIGERIAN_CLASS_NAMES } from "@/data/seedMarkazAcademy";

const COUNTRY_CURRENCIES: Array<{
  country: string;
  symbol: string;
  code: string;
}> = [
  { country: "Nigeria", symbol: "₦", code: "NGN" },
  { country: "Ghana", symbol: "GH₵", code: "GHS" },
  { country: "Kenya", symbol: "KSh", code: "KES" },
  { country: "United Kingdom", symbol: "£", code: "GBP" },
];

export function SaaSOnboardingWizard() {
  const navigate = useNavigate();
  const {
    db,
    onboardingWizardOpen,
    setOnboardingWizardOpen,
    completeSchoolOnboarding,
  } = useSchoolOS();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: School details
  const [schoolName, setSchoolName] = useState(
    db.settings.setupCompleted ? db.settings.name : ""
  );
  const [schoolPhone, setSchoolPhone] = useState(db.settings.phone || "");
  const [schoolAddress, setSchoolAddress] = useState(db.settings.address || "");
  const [countryIndex, setCountryIndex] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    db.settings.logoDataUrl
  );

  // Step 2: Proprietor / Admin credentials
  const [adminName, setAdminName] = useState("");
  const [adminContact, setAdminContact] = useState("");
  const [adminPin, setAdminPin] = useState("1234");

  // Step 3: Session, Term, Programmes & Classes
  const [currentSession, setCurrentSession] = useState("2026/2027");
  const [currentTerm, setCurrentTerm] = useState("First Term");
  const [multiProgramme, setMultiProgramme] = useState(false);
  const [extraProgrammeInput, setExtraProgrammeInput] = useState("");
  const [extraProgrammes, setExtraProgrammes] = useState<string[]>([
    "Evening Lessons",
  ]);
  const [classList, setClassList] = useState<string[]>([
    ...DEFAULT_NIGERIAN_CLASS_NAMES,
  ]);
  const [newClassInput, setNewClassInput] = useState("");

  const selectedCurrency =
    COUNTRY_CURRENCIES[countryIndex] ?? COUNTRY_CURRENCIES[0]!;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Please choose a logo image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const addExtraProgramme = () => {
    const clean = extraProgrammeInput.trim();
    if (!clean) return;
    if (!extraProgrammes.includes(clean)) {
      setExtraProgrammes((prev) => [...prev, clean]);
    }
    setExtraProgrammeInput("");
  };

  const addClassToList = () => {
    const clean = newClassInput.trim();
    if (!clean) return;
    if (!classList.includes(clean)) {
      setClassList((prev) => [...prev, clean]);
    }
    setNewClassInput("");
  };

  const removeClassFromList = (name: string) => {
    if (classList.length <= 1) {
      toast.error("Keep at least one class to finish setup.");
      return;
    }
    setClassList((prev) => prev.filter((c) => c !== name));
  };

  const handleNextFromStep1 = () => {
    if (!schoolName.trim()) {
      toast.error("Please enter your school name to continue.");
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!adminName.trim()) {
      toast.error("Enter the School Owner / Principal full name.");
      return;
    }
    if (!adminPin.trim() || adminPin.trim().length < 4) {
      toast.error("Set at least a 4-digit Admin PIN for staff login.");
      return;
    }
    setStep(3);
  };

  const handleFinish = () => {
    if (!schoolName.trim()) {
      toast.error("Please enter your school name.");
      setStep(1);
      return;
    }

    completeSchoolOnboarding({
      schoolName: schoolName.trim(),
      country: selectedCurrency.country,
      currencySymbol: selectedCurrency.symbol,
      currencyCode: selectedCurrency.code,
      schoolPhone: schoolPhone.trim(),
      schoolAddress: schoolAddress.trim(),
      logoDataUrl,
      multiProgrammeEnabled: multiProgramme,
      additionalProgrammeNames: multiProgramme ? extraProgrammes : [],
      currentSession: currentSession.trim() || "2026/2027",
      currentTerm,
      classNames: classList,
      adminName: adminName.trim() || "School Proprietor",
      adminContact: adminContact.trim() || schoolPhone.trim(),
      adminPin: adminPin.trim() || "1234",
    });

    toast.success(
      `${schoolName.trim()} is ready! Signed in as ${adminName.trim() || "School Proprietor"} (Staff ID: ADM-001).`
    );
    void navigate({ to: "/app" });
  };

  return (
    <Dialog open={onboardingWizardOpen} onOpenChange={setOnboardingWizardOpen}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[#e4e7ec] bg-white p-0">
        {/* Top Banner matching ndh.com.ng deep gateway navy */}
        <div className="border-b border-white/10 bg-[#0c2340] px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-2 text-xs font-bold tracking-wider text-[#9ed9d6] uppercase">
            <span>Register Your School • Step {step} of 3</span>
            <span>{PRICING_CONFIG.pilotOfferBanner}</span>
          </div>
          <DialogHeader className="mt-1.5 text-left">
            <DialogTitle className="font-display text-xl font-bold text-white">
              Set Up Your Live School Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 sm:text-sm">
              Register your school, create your Proprietor login PIN, and start admitting students, recording scores and issuing receipts immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Dots */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  step >= n ? "bg-[#9ed9d6]" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* STEP 1: School Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0b1220]">
                <Building2 className="h-4 w-4 text-[#1a4a6e]" />
                <span>1. School Identity & Contact</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onb-school-name" className="text-xs font-bold">
                  School Name *
                </Label>
                <Input
                  id="onb-school-name"
                  placeholder="e.g. Heritage Model Academy, Sokoto"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="h-11 border-[#d0d5dd] bg-[#f5f6f8] text-sm font-medium text-[#0b1220]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-school-phone" className="text-xs font-bold">
                    Official School Phone
                  </Label>
                  <Input
                    id="onb-school-phone"
                    placeholder="e.g. 0803 000 0000"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    className="h-10 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onb-country" className="text-xs font-bold">
                    Country & Currency
                  </Label>
                  <select
                    id="onb-country"
                    value={countryIndex}
                    onChange={(e) => setCountryIndex(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-[#d0d5dd] bg-[#f5f6f8] px-3 text-sm font-medium text-[#0b1220]"
                  >
                    {COUNTRY_CURRENCIES.map((item, idx) => (
                      <option key={item.code} value={idx}>
                        {item.country} ({item.symbol} {item.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-address" className="text-xs font-bold">
                    School Address (Printed on Report Cards & Receipts)
                  </Label>
                  <Input
                    id="onb-address"
                    placeholder="Street, Area, City & State"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="h-10 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">
                    School Crest / Logo (Optional)
                  </Label>
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#d0d5dd] bg-[#f5f6f8] px-3 text-xs font-semibold text-[#364152] hover:border-[#1a4a6e] hover:bg-white">
                    <ImagePlus className="h-4 w-4 text-[#1a4a6e]" />
                    <span>
                      {logoDataUrl ? "Logo Uploaded ✓ (Change)" : "Upload PNG / JPG"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Proprietor / Admin Account */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0b1220]">
                <ShieldCheck className="h-4 w-4 text-[#1a4a6e]" />
                <span>2. School Owner / Principal Login Account</span>
              </div>

              <div className="rounded-xl border border-[#9ed9d6] bg-[#edf7f6] p-3.5 text-xs text-[#0c2340]">
                Your account receives Staff ID <strong>ADM-001</strong> with full Proprietor & Principal control. You can create logins for your Class Teachers, Subject Teachers, Bursar, and Secretary right inside <strong>Staff & Payroll</strong>.
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onb-admin-name" className="text-xs font-bold">
                  Proprietor / Principal Full Name *
                </Label>
                <Input
                  id="onb-admin-name"
                  placeholder="e.g. Alhaji Musa Bello / Mrs. Grace Adeyemi"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="h-11 border-[#d0d5dd] bg-[#f5f6f8] text-sm font-medium text-[#0b1220]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-admin-contact" className="text-xs font-bold">
                    Admin Phone or Email (For Login)
                  </Label>
                  <Input
                    id="onb-admin-contact"
                    placeholder="e.g. 08031234567 or admin@school.ng"
                    value={adminContact}
                    onChange={(e) => setAdminContact(e.target.value)}
                    className="h-10 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onb-admin-pin" className="text-xs font-bold">
                    Set 4–6 Digit Login PIN *
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#667085]" />
                    <Input
                      id="onb-admin-pin"
                      type="password"
                      placeholder="4+ digits"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="h-10 border-[#d0d5dd] bg-[#f5f6f8] pl-9 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Session, Programmes & Classes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0b1220]">
                <Layers className="h-4 w-4 text-[#1a4a6e]" />
                <span>3. Academic Session, Term & Classes</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-session" className="text-xs font-bold">
                    Current Academic Session
                  </Label>
                  <Input
                    id="onb-session"
                    value={currentSession}
                    onChange={(e) => setCurrentSession(e.target.value)}
                    placeholder="2026/2027"
                    className="h-10 border-[#d0d5dd] bg-[#f5f6f8] text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-term" className="text-xs font-bold">
                    Active Term
                  </Label>
                  <select
                    id="onb-term"
                    value={currentTerm}
                    onChange={(e) => setCurrentTerm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[#d0d5dd] bg-[#f5f6f8] px-3 text-sm font-medium text-[#0b1220]"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  Does your school run more than one programme?
                </Label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMultiProgramme(false)}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                      !multiProgramme
                        ? "border-[#1a4a6e] bg-[#edf7f6] ring-1 ring-[#1a4a6e]"
                        : "border-[#e4e7ec] bg-white hover:bg-[#f5f6f8]"
                    }`}
                  >
                    <div className="text-xs font-extrabold text-[#0b1220]">
                      No — Single School Programme
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#364152]">
                      Standard Nursery, Primary or Secondary day school.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiProgramme(true)}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition ${
                      multiProgramme
                        ? "border-[#1a4a6e] bg-[#edf7f6] ring-1 ring-[#1a4a6e]"
                        : "border-[#e4e7ec] bg-white hover:bg-[#f5f6f8]"
                    }`}
                  >
                    <div className="text-xs font-extrabold text-[#0b1220]">
                      Yes — Multiple Programmes
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#364152]">
                      Add an afternoon, weekend, vocational or Islamic track.
                    </p>
                  </button>
                </div>
              </div>

              {multiProgramme && (
                <div className="space-y-2 rounded-xl border border-[#e4e7ec] bg-[#f5f6f8] p-3.5">
                  <Label className="text-xs font-bold text-[#0b1220]">
                    Additional Programme Names
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {extraProgrammes.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full border border-[#d0d5dd] bg-white px-2.5 py-1 text-xs font-semibold text-[#0b1220]"
                      >
                        {p}
                        <button
                          type="button"
                          onClick={() =>
                            setExtraProgrammes((prev) =>
                              prev.filter((item) => item !== p)
                            )
                          }
                          className="text-[#667085] hover:text-[#b42318]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Afternoon Coaching, Weekend Track..."
                      value={extraProgrammeInput}
                      onChange={(e) => setExtraProgrammeInput(e.target.value)}
                      className="h-9 bg-white text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExtraProgramme}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  Classes ({classList.length}) — Click × to remove any class you don&apos;t run
                </Label>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-[#e4e7ec] bg-[#f5f6f8] p-3">
                  {classList.map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d0d5dd] bg-white px-2.5 py-1 text-xs font-semibold text-[#0b1220]"
                    >
                      {cls}
                      <button
                        type="button"
                        onClick={() => removeClassFromList(cls)}
                        className="text-[#667085] hover:text-[#b42318]"
                        aria-label={`Remove ${cls}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newClassInput}
                    onChange={(e) => setNewClassInput(e.target.value)}
                    placeholder="Add custom class (e.g. Creche, Reception, JSS 1 Gold)"
                    className="h-9 border-[#d0d5dd] bg-white text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addClassToList();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addClassToList}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Class
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#e4e7ec] pt-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="gap-1.5 border-[#d0d5dd] text-xs font-semibold text-[#364152]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOnboardingWizardOpen(false)}
                className="text-xs text-[#667085]"
              >
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={step === 1 ? handleNextFromStep1 : handleNextFromStep2}
                className="gap-1.5 bg-[#1a4a6e] text-xs font-bold text-white hover:bg-[#0c2340]"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                className="gap-1.5 bg-[#067647] px-5 text-xs font-bold text-white hover:bg-[#055a36]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Setup & Open Workspace
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
