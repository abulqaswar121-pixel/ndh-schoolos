import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NDHBrandLockup } from "@/components/schoolos/NDHBrandLockup";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { cloudSchoolRepository, type CloudSchool } from "@/services/cloudSchoolRepository";

export function PlatformAdminPage() {
  const { hydrated, cloudStatus, isPlatformOwner, cloudConfigured, cloudError, logoutSession } =
    useSchoolOS();
  const [schools, setSchools] = useState<CloudSchool[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    setSchools([]);
    if (!isPlatformOwner) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void cloudSchoolRepository
      .listSchools()
      .then((result) => {
        if (!cancelled) setSchools(result);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Unable to load schools.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPlatformOwner, refresh]);
  const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "—");
  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#0b1220]">
      <header className="border-b border-white/10 bg-[#0a192f] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link to="/">
            <NDHBrandLockup theme="dark" />
          </Link>
          <div className="flex gap-3 text-xs font-bold">
            <Link to="/app">School Workspace</Link>
            {isPlatformOwner && (
              <button
                type="button"
                onClick={() => {
                  void logoutSession()
                    .then(() => navigate({ to: "/login" }))
                    .catch((reason) =>
                      setError(reason instanceof Error ? reason.message : "Sign out failed."),
                    );
                }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[#0a192f]">Super Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Registered schools and their subscription status.
        </p>
        {!hydrated || cloudStatus === "loading" ? (
          <p role="status" className="mt-6">
            Verifying platform owner access…
          </p>
        ) : !isPlatformOwner ? (
          <div className="ndh-card mt-6 p-6">
            <h2 className="font-bold">Platform owner access required</h2>
            <p className="mt-2 text-sm">
              {!cloudConfigured
                ? "Connect Lovable Cloud / Supabase to use this screen."
                : cloudError ||
                  "Only an account provisioned in the platform owner registry can view all schools. School administrator accounts cannot open this screen."}
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-bold underline">
              Sign In
            </Link>
          </div>
        ) : (
          <section className="ndh-card mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="font-bold">Schools {loading ? "" : `(${schools.length})`}</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => setRefresh((n) => n + 1)}
              >
                Refresh
              </Button>
            </div>
            {error && (
              <p role="alert" className="p-4 text-sm text-red-700">
                {error}
              </p>
            )}
            {loading ? (
              <p role="status" className="p-6 text-sm">
                Loading registered schools…
              </p>
            ) : !error && schools.length === 0 ? (
              <p className="p-6 text-sm text-slate-600">No schools have registered yet.</p>
            ) : (
              !error && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600">
                      <tr>
                        <th className="p-4">School</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Subscription</th>
                        <th className="p-4">Expires</th>
                        <th className="p-4">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((school) => (
                        <tr key={school.id} className="border-t border-slate-100">
                          <td className="p-4 font-semibold">
                            {school.name}
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              {school.id}
                            </span>
                          </td>
                          <td className="p-4 capitalize">{school.school_type}</td>
                          <td className="p-4 font-semibold">{school.subscription_status}</td>
                          <td className="p-4">{date(school.subscription_expires_at)}</td>
                          <td className="p-4">{date(school.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/platform")({ component: PlatformAdminPage });
