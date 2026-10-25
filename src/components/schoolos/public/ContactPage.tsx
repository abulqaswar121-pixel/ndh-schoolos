import {
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { PublicSiteLayout } from "./PublicSiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NDH_PARENT_CONTACT } from "@/data/ndhLinks";

export function ContactPage() {
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }
    setSubmitted(true);
    toast.success("Message recorded. You can also reach NDH directly on WhatsApp or phone.");
  };

  return (
    <PublicSiteLayout>
      <section className="border-b border-[#e4e7ec] bg-[#f5f6f8] py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="text-xs font-extrabold tracking-[0.14em] text-[#1a4a6e] uppercase">
              Najeeb Digital Hub • Support
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[#0b1220] sm:text-4xl">
              Speak directly with the NDH team
            </h1>
            <p className="mt-2 text-sm text-[#364152] sm:text-base">
              Fast onboarding & support by phone, WhatsApp, email, or at our Sokoto office.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-xs">
              <img
                src="/images/ndh-cover-support-v3.jpg"
                alt="Nigerian customer onboarding specialist at Najeeb Digital Hub support desk"
                className="h-52 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-18">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-12">
          {/* Official NDH Contact Cards */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7f6] text-[#1a4a6e]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#667085] uppercase">
                    Direct Phone
                  </div>
                  <a
                    href={NDH_PARENT_CONTACT.phoneHref}
                    className="font-display mt-0.5 block text-lg font-bold text-[#0b1220] hover:text-[#1a4a6e]"
                  >
                    {NDH_PARENT_CONTACT.phoneDisplay}
                  </a>
                  <p className="mt-0.5 text-xs text-[#364152]">
                    Monday – Saturday • 8:00 AM – 6:00 PM WAT
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#067647]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#667085] uppercase">
                    WhatsApp Support
                  </div>
                  <a
                    href={NDH_PARENT_CONTACT.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display mt-0.5 block text-lg font-bold text-[#067647] hover:underline"
                  >
                    Chat on WhatsApp ({NDH_PARENT_CONTACT.phoneDisplay})
                  </a>
                  <p className="mt-0.5 text-xs text-[#364152]">
                    Fast onboarding support for school owners, bursars & principals
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7f6] text-[#1a4a6e]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#667085] uppercase">
                    Support Email
                  </div>
                  <a
                    href={`mailto:${NDH_PARENT_CONTACT.email}`}
                    className="font-display mt-0.5 block text-base font-bold text-[#0b1220] hover:text-[#1a4a6e]"
                  >
                    {NDH_PARENT_CONTACT.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e7ec] bg-[#f5f6f8] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0c2340] text-[#9ed9d6]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#667085] uppercase">
                    Head Office Address
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[#0b1220]">
                    {NDH_PARENT_CONTACT.address}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#e4e7ec] bg-white p-6 shadow-xs sm:p-8">
              {submitted ? (
                <div className="space-y-4 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ecfdf3] text-[#067647]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#0b1220]">
                    Thank you, {name}
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-[#364152]">
                    Your enquiry for <strong>{schoolName || "your school"}</strong> has been noted. For immediate response, tap below to send directly to our WhatsApp desk.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button
                      asChild
                      className="rounded-full bg-[#067647] font-bold text-white hover:bg-[#055a36]"
                    >
                      <a
                        href={`${NDH_PARENT_CONTACT.whatsappHref}?text=${encodeURIComponent(
                          `Hello NDH SchoolOS team, my name is ${name} from ${schoolName || "our school"}. ${message}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Continue on WhatsApp
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="rounded-full border-[#d0d5dd] text-xs font-semibold"
                    >
                      Send Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#0b1220]">
                    Send an Enquiry
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cnt-name" className="text-xs font-bold">
                        Your Name *
                      </Label>
                      <Input
                        id="cnt-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Mrs. Amina Yusuf"
                        required
                        className="h-11 border-[#d0d5dd] bg-[#f5f6f8]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cnt-school" className="text-xs font-bold">
                        School Name
                      </Label>
                      <Input
                        id="cnt-school"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g. Crestview Schools"
                        className="h-11 border-[#d0d5dd] bg-[#f5f6f8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cnt-phone" className="text-xs font-bold">
                      Phone / WhatsApp Number *
                    </Label>
                    <Input
                      id="cnt-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0803 000 0000"
                      required
                      className="h-11 border-[#d0d5dd] bg-[#f5f6f8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cnt-msg" className="text-xs font-bold">
                      How can we help your school?
                    </Label>
                    <Textarea
                      id="cnt-msg"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us your approximate student count or any setup questions..."
                      className="border-[#d0d5dd] bg-[#f5f6f8]"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-full bg-[#1a4a6e] font-bold text-white hover:bg-[#0c2340]"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit Enquiry
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
