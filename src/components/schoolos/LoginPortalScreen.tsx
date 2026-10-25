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
    loginProductionStaff,
    loginProductionParent,
    setOnboardingWizardOpen,
  } = useSchoolOS();

  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffError, setStaffError] = useState("");

  const [parentPhone, setParentPhone] = useState("");
  const [parentError, setParentError] = useState("");

  const isSchoolRegistered = db.settings.setupCompleted;

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    if (!isSchoolRegistered && db.staff.length === 0) {
      setStaffError(
        "No school registered on this device yet. Click 'Register Your School' below."
      );
      return;
    }
    const res = loginProductionStaff({
      identifier: staffIdentifier,
      pin: staffPin,
    });
    if (!res.ok) {
      setStaffError(res.error ?? "Unable to sign in.");
      return;
    }
    toast.success("Signed in to your school workspace.");
    void navigate({ to: "/app" });
  };

  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParentError("");
    const res = loginProductionParent({ phone: parentPhone });
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

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:items-center">
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
            Staff sign in with Staff ID & PIN. Parents sign in with their registered phone number.
          </p>

          <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
            <img
              src="/images/ndh-cover-login-v3.jpg"
              alt="Modern Nigerian school administrative office desk"
              className="h-44 w-full object-cover"
            />
            <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-[#0b1220]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#067647]" />
              <span>Role-scoped access for Owners, Teachers, Bursar, Secretary & Parents</span>
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
          <div className="rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-sm sm:p-8">
            <Tabs defaultValue="staff" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 bg-[#eef1f6] p-1">
                <TabsTrigger value="staff" className="text-xs font-bold sm:text-sm">
                  <UserCheck className="mr-1.5 h-4 w-4" />
                  Staff Sign In
                </TabsTrigger>
                <TabsTrigger value="parent" className="text-xs font-bold sm:text-sm">
                  <Phone className="mr-1.5 h-4 w-4" />
                  Parent Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-staff-id" className="text-xs font-bold">
                      Staff ID, Email or Phone
                    </Label>
                    <Input
                      id="login-staff-id"
                      placeholder="e.g. ADM-001 or phone / email"
                      value={staffIdentifier}
                      onChange={(e) => setStaffIdentifier(e.target.value)}
                      required
                      className="h-11 border-[#d0d5dd] bg-[#f5f6f8] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-staff-pin" className="text-xs font-bold">
                      Staff PIN
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#667085]" />
                      <Input
                        id="login-staff-pin"
                        type="password"
                        placeholder="Enter PIN"
                        value={staffPin}
                        onChange={(e) => setStaffPin(e.target.value)}
                        required
                        className="h-11 border-[#d0d5dd] bg-[#f5f6f8] pl-9 text-sm"
                      />
                    </div>
                  </div>

                  {staffError && (
                    <div className="rounded-lg border border-red-200 bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#b42318]">
                      {staffError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-full bg-[#1a4a6e] text-sm font-bold text-white hover:bg-[#0c2340]"
                  >
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="parent">
                <form onSubmit={handleParentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-parent-phone" className="text-xs font-bold">
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
