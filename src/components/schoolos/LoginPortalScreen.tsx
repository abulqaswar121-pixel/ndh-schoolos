import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Phone,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { NDHBrandLockup } from "./NDHBrandLockup";
import { SchoolCrest } from "./SchoolCrest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { NDH_PARENT_CONTACT } from "@/data/ndhLinks";

export function LoginPortalScreen() {
  const navigate = useNavigate();
  const {
    db,
    portal,
    registeredSchools,
    loginSchoolAdmin,
    cloudConfigured,
    cloudStatus,
    cloudError,
    isPlatformOwner,
    hydrated,
    setOnboardingWizardOpen,
  } = useSchoolOS();

  const [schoolCodeInput, setSchoolCodeInput] = useState(
    db.settings.code || ""
  );
  const [userEditedSchoolCode, setUserEditedSchoolCode] = useState(false);

  React.useEffect(() => {
    if (!userEditedSchoolCode && db.settings.code) {
      setSchoolCodeInput(db.settings.code);
    }
  }, [db.settings.code, userEditedSchoolCode]);

  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffError, setStaffError] = useState("");

  const [parentPhone, setParentPhone] = useState("");
  const [parentError, setParentError] = useState("");

  const isSchoolRegistered = db.settings.setupCompleted;
  const [busy, setBusy] = useState(false);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setBusy(true);
    try {
      const owner = await loginSchoolAdmin(staffIdentifier, staffPin);
      setStaffPin("");
      toast.success("Signed in to your cloud account.");
      await navigate({ to: owner ? "/platform" : "/app" });
    } catch (error) {
      setStaffError(
        error instanceof Error ? error.message : "Unable to sign in."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParentError("");
    const res = {
      ok: false,
      error:
        "Phone-only sign-in cannot access cloud records. Ask your school for a verified account.",
    };
    if (!res.ok) {
      setParentError(res.error ?? "Phone number not found.");
      return;
    }
    toast.success("Welcome to the Parent Portal.");
    void navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#0b1220]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c2340] px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/">
            <NDHBrandLockup theme="dark" />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-xs font-semibold text-[#9ed9d6] hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link to="/tutorials">
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Video Guide
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 pt-8 pb-24 sm:px-6 sm:pt-10 sm:pb-14 lg:grid-cols-12 lg:items-center">
        {/* Concise Left Column with Distinct Reception Photo */}
        <div className="space-y-4 lg:col-span-5">
          {isSchoolRegistered ? (
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-[#e4e7ec] bg-white px-3.5 py-2 shadow-xs">
              <SchoolCrest settings={db.settings} size="sm" />
              <div>
                <div className="text-xs font-extrabold text-[#0b1220]">
                  {db.settings.name}
                </div>
                <div className="text-[11px] text-[#667085]">
                  {db.settings.currentSession} • {db.settings.currentTerm}
                </div>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9ed9d6] bg-[#edf7f6] px-3.5 py-1 text-xs font-bold text-[#1a4a6e]">
              <Sparkles className="h-3.5 w-3.5" />
              2-Minute School Setup
            </div>
          )}

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b1220] sm:text-3xl">
            Sign in to your portal
          </h1>
          <p className="text-sm text-[#364152]">
            School administrators sign in with their verified email and
            password. Your account is linked securely to your school.
          </p>

          <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
            <img
              src="/images/ndh-cover-login-v3.jpg"
              alt="Modern Nigerian school administrative office desk"
              className="h-44 w-full object-cover"
            />
            <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-[#0b1220]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#067647]" />
              <span>
                Role-scoped access for Owners, Teachers, Bursar, Secretary &
                Parents
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!isSchoolRegistered && (
              <Button
                type="button"
                size="sm"
                onClick={() => setOnboardingWizardOpen(true)}
                className="rounded-full bg-[#1a4a6e] px-4 text-xs font-bold text-white hover:bg-[#0c2340]"
              >
                Register Your School
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full border-[#9ed9d6] bg-white px-4 text-xs font-bold text-[#1a4a6e] hover:bg-[#edf7f6] hover:text-[#0c2340]"
            >
              <Link to="/tutorials">
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Watch Video Tutorials
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Sign-In Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm sm:p-8">
            <Tabs defaultValue="staff" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 bg-[#eef1f6] p-1">
                <TabsTrigger
                  value="staff"
                  className="px-2 py-2 text-xs font-bold sm:px-3 sm:text-sm"
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span>Staff Sign In</span>
                </TabsTrigger>
                <TabsTrigger
                  value="parent"
                  className="px-2 py-2 text-xs font-bold sm:px-3 sm:text-sm"
                >
                  <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span>Parent Portal</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  {portal.isAuthenticated && <Link to="/app" className="text-xs font-bold underline">Open School Workspace</Link>}
                  {isPlatformOwner && (
                    <Link
                      to="/platform"
                      className="text-xs font-bold underline"
                    >
                      Open Super Admin
                    </Link>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="login-school-code"
                        className="text-xs font-bold"
                      >
                        School Workspace Code (assigned to your account)
                      </Label>
                      {registeredSchools.length > 1 && (
                        <select
                          aria-label="Choose registered school workspace"
                          value={schoolCodeInput}
                          onChange={(e) => {
                            setUserEditedSchoolCode(true);
                            setSchoolCodeInput(e.target.value);
                          }}
                          className="h-7 rounded border border-[#d0d5dd] bg-[#f5f6f8] px-2 text-[11px] font-semibold text-[#1a4a6e]"
                        >
                          {registeredSchools.map((sch) => (
                            <option key={sch.code} value={sch.code}>
                              {sch.name} ({sch.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Input
                      id="login-school-code"
                      placeholder="Automatically linked after sign-in"
                      disabled
                      value={schoolCodeInput}
                      onChange={(e) => {
                        setUserEditedSchoolCode(true);
                        setSchoolCodeInput(e.target.value.toUpperCase());
                      }}
                      className="h-10 border-[#d0d5dd] bg-[#f5f6f8] font-mono text-xs font-bold tracking-wider uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-staff-id"
                      className="text-xs font-bold"
                    >
                      Administrator Email
                    </Label>
                    <Input
                      id="login-staff-id"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@school.ng"
                      value={staffIdentifier}
                      onChange={(e) => setStaffIdentifier(e.target.value)}
                      required
                      className="h-11 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-staff-pin"
                      className="text-xs font-bold"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#667085]" />
                      <Input
                        id="login-staff-pin"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter password"
                        value={staffPin}
                        onChange={(e) => setStaffPin(e.target.value)}
                        required
                        className="h-11 border-[#d0d5dd] bg-[#f5f6f8] pl-9 text-sm"
                      />
                    </div>
                  </div>

                  {(staffError ||
                    cloudError ||
                    !cloudConfigured ||
                    cloudStatus === "loading") && (
                    <div className="rounded-lg border border-red-200 bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#b42318]">
                      {staffError ||
                        cloudError ||
                        (!cloudConfigured
                          ? "Cloud setup is required. Connect Lovable Cloud / Supabase; browser-only sign-in is disabled."
                          : "Loading your cloud school…")}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      !hydrated ||
                      cloudStatus === "loading" ||
                      !cloudConfigured
                    }
                    className="h-11 w-full rounded-full bg-[#1a4a6e] text-sm font-bold text-white hover:bg-[#0c2340]"
                  >
                    {busy ? "Signing In…" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="parent">
                <form onSubmit={handleParentSubmit} className="space-y-4">
                  <p className="text-xs text-[#667085]">
                    Cloud access currently requires a verified school
                    administrator account. Phone-only parent sign-in is
                    disabled; contact your school for access.
                  </p>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-parent-school-code"
                      className="text-xs font-bold"
                    >
                      School Workspace Code (assigned to your account)
                    </Label>
                    <Input
                      id="login-parent-school-code"
                      placeholder="e.g. GHA or MRK-2026"
                      value={schoolCodeInput}
                      onChange={(e) => {
                        setUserEditedSchoolCode(true);
                        setSchoolCodeInput(e.target.value.toUpperCase());
                      }}
                      className="h-10 border-[#d0d5dd] bg-[#f5f6f8] font-mono text-xs font-bold tracking-wider uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-parent-phone"
                      className="text-xs font-bold"
                    >
                      Guardian Phone Number
                    </Label>
                    <Input
                      id="login-parent-phone"
                      placeholder="Phone registered with the school"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      required
                      className="h-11 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                    />
                  </div>

                  {parentError && (
                    <div className="rounded-lg border border-red-200 bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#b42318]">
                      {parentError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-full bg-[#1a4a6e] text-sm font-bold text-white hover:bg-[#0c2340]"
                  >
                    Open Parent Portal
                  </Button>

                  <p className="text-center text-[11px] text-[#667085]">
                    Support:{" "}
                    <a
                      href={NDH_PARENT_CONTACT.phoneHref}
                      className="font-semibold text-[#1a4a6e] hover:underline"
                    >
                      {NDH_PARENT_CONTACT.phoneDisplay}
                    </a>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
