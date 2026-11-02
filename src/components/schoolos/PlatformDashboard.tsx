import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Download,
  Eye,
  GraduationCap,
  LockKeyhole,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  getLiveClient,
  liveSchoolRepository,
  type PlatformSchool,
  type LiveSchoolRecord,
  type SubscriptionStatus,
} from "@/services/liveSchoolRepository";
import { exportRowsToCsv } from "@/services/calculations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import "./workspace.css";

export function PlatformDashboard() {
  const [owner, setOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [totals, setTotals] = useState({ students: 0, revenue: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [add, setAdd] = useState(false);
  const [support, setSupport] = useState<PlatformSchool | null>(null);
  const [records, setRecords] = useState<LiveSchoolRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const configured = Boolean(getLiveClient());
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      if (!(await liveSchoolRepository.isPlatformOwner())) {
        setOwner(false);
        return;
      }
      const [list, summary] = await Promise.all([
        liveSchoolRepository.listSchools(),
        liveSchoolRepository.platformTotals(),
      ]);
      setSchools(list);
      setTotals(summary);
      setOwner(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load platform data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (configured) void refresh();
  }, [configured]);
  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || s.subscription_status === filter),
  );
  async function subscription(school: PlatformSchool, status: SubscriptionStatus, renew = false) {
    setBusy(true);
    try {
      await liveSchoolRepository.setSubscription(school.id, status, renew);
      await refresh();
      toast.success(
        renew ? "Subscription renewed for 30 days." : `School account ${status.toLowerCase()}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update subscription.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="os-workspace os-platform">
      <header className="os-platform-header">
        <a className="os-brand" href="/">
          <span className="os-logo">
            <GraduationCap size={24} />
          </span>
          <span>
            School<span className="os-brand-green">OS</span>
            <small>NAJEEB DIGITAL HUB · PLATFORM</small>
          </span>
        </a>
        <a href="/" className="os-platform-back">
          <ArrowLeft size={14} />
          School workspace
        </a>
        {owner && (
          <button
            className="os-secondary"
            onClick={async () => {
              await liveSchoolRepository.signOut();
              setOwner(false);
              setSchools([]);
              setRecords([]);
              setSupport(null);
              setTotals({ students: 0, revenue: 0 });
            }}
          >
            Sign out
          </button>
        )}
      </header>
      <main className="os-platform-content">
        <div className="os-page-heading">
          <div>
            <div className="os-eyebrow">THE BIGGER PICTURE</div>
            <h1>Platform administration</h1>
            <p>A dedicated command centre for the NDH SchoolOS family.</p>
          </div>
          <span className="os-local-note">
            <ShieldCheck size={16} />
            Platform owner access only
          </span>
        </div>
        {!owner ? (
          <section className="os-panel os-owner-login">
            <span className="os-large-empty-icon">
              <LockKeyhole size={32} strokeWidth={1.5} />
            </span>
            <h2>{configured ? "Welcome, platform owner." : "Your platform. Ready to connect."}</h2>
            <p>
              {configured
                ? "Use your verified NDH owner account to manage registered schools."
                : "Connect your live Supabase project to enable owner authentication, school subscriptions, and cross-school reporting."}
            </p>
            {!configured ? (
              <div className="os-local-note">
                <ShieldCheck size={22} />
                <span>
                  No schools or revenue are invented. Apply <code>database/001_schoolos.sql</code>,
                  configure the public environment variables, and provision the owner account
                  through your trusted database administrator.
                </span>
              </div>
            ) : (
              <form
                className="os-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  setError("");
                  try {
                    await liveSchoolRepository.signIn(
                      String(f.get("email")),
                      String(f.get("password")),
                    );
                    if (!(await liveSchoolRepository.isPlatformOwner())) {
                      await liveSchoolRepository.signOut();
                      setError("This account does not have platform owner access.");
                    } else await refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Sign-in failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Owner email
                  <input name="email" type="email" required autoComplete="username" />
                </label>
                <label>
                  Password
                  <input name="password" type="password" required autoComplete="current-password" />
                </label>
                <button className="os-primary" type="submit" disabled={busy}>
                  {busy ? "Verifying access…" : "Sign in securely"}
                </button>
              </form>
            )}
            {error && (
              <p role="alert" className="os-error">
                {error}
              </p>
            )}
            <a href="/" className="os-text-button">
              <ArrowLeft size={14} />
              Back to your school workspace
            </a>
          </section>
        ) : (
          <>
            <section className="os-metrics os-owner-metrics">
              {[
                {
                  name: "Registered schools",
                  value: schools.length.toLocaleString(),
                  icon: Building2,
                },
                { name: "Total students", value: totals.students.toLocaleString(), icon: Users },
                {
                  name: "Total platform revenue",
                  value: `₦${totals.revenue.toLocaleString()}`,
                  icon: Wallet,
                },
              ].map((m) => (
                <div className="os-metric" key={m.name}>
                  <div className="os-metric-top">
                    <span>{m.name}</span>
                    <span className="os-metric-icon green">
                      <m.icon size={20} />
                    </span>
                  </div>
                  <strong>{m.value}</strong>
                  <small className="os-muted">From your live database</small>
                </div>
              ))}
            </section>
            {error && (
              <div role="alert" className="os-error">
                {error}
              </div>
            )}
            <section className="os-panel">
              <div className="os-panel-heading">
                <div>
                  <h3>Registered schools</h3>
                  <p>Manage subscriptions and lend a helping hand.</p>
                </div>
                <button className="os-primary" onClick={() => setAdd(true)}>
                  <Plus size={15} />
                  Add School
                </button>
              </div>
              <div className="os-table-toolbar">
                <div className="os-table-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search registered schools..."
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="Subscription filter"
                >
                  <option value="all">All subscriptions</option>
                  {["Free Trial", "Active", "Expired", "Suspended"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button className="os-secondary" onClick={() => void refresh()} disabled={loading}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  className="os-secondary"
                  onClick={() =>
                    exportRowsToCsv(
                      "registered-schools.csv",
                      ["School", "Type", "Status", "Expiry"],
                      filtered.map((s) => [
                        s.name,
                        s.school_type,
                        s.subscription_status,
                        s.subscription_expires_at || "",
                      ]),
                    )
                  }
                >
                  <Download size={14} />
                  CSV
                </button>
                <button className="os-secondary" onClick={() => window.print()}>
                  <Printer size={14} />
                  Print
                </button>
              </div>
              {loading ? (
                <div className="os-loading">Loading live schools…</div>
              ) : !filtered.length ? (
                <div className="os-module-empty-body">
                  <span className="os-large-empty-icon">
                    <Building2 size={33} />
                  </span>
                  <h3>
                    {schools.length ? "No schools match this filter" : "No schools registered yet"}
                  </h3>
                  <p>
                    {schools.length
                      ? "Try another search or subscription status."
                      : "Welcome your first school to the NDH family."}
                  </p>
                  <button className="os-primary" onClick={() => setAdd(true)}>
                    <Plus size={15} />
                    Add School
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="os-platform-table">
                    <thead>
                      <tr>
                        {[
                          "School",
                          "School type",
                          "Subscription",
                          "Expires",
                          "Account actions",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <small>{new Date(s.created_at).toLocaleDateString()}</small>
                          </td>
                          <td>{s.school_type}</td>
                          <td>
                            <span
                              className={`os-sub-status ${s.subscription_status === "Active" ? "green" : s.subscription_status === "Suspended" ? "amber" : "blue"}`}
                            >
                              {s.subscription_status}
                            </span>
                          </td>
                          <td>
                            {s.subscription_expires_at
                              ? new Date(s.subscription_expires_at).toLocaleDateString()
                              : "Not set"}
                          </td>
                          <td>
                            <div className="os-owner-actions">
                              <button
                                disabled={busy}
                                title="Read-only support view"
                                onClick={async () => {
                                  setRecords([]);
                                  setBusy(true);
                                  try {
                                    const result = await liveSchoolRepository.records(s.id);
                                    setRecords(result);
                                    setSupport(s);
                                  } catch (e) {
                                    toast.error(
                                      e instanceof Error ? e.message : "Unable to inspect school.",
                                    );
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                <Eye size={14} />
                                Support
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => void subscription(s, "Active")}
                              >
                                Activate
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Suspend ${s.name}? School members will lose live data access until reactivated.`,
                                    )
                                  )
                                    void subscription(s, "Suspended");
                                }}
                              >
                                Suspend
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => void subscription(s, "Active", true)}
                              >
                                Renew
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
        <footer className="os-footer">
          <span>NDH SchoolOS · Najeeb Digital Hub</span>
          <a href="https://ndh.com.ng" target="_blank" rel="noreferrer">
            Explore the NDH ecosystem
          </a>
        </footer>
      </main>
      <Dialog open={add} onOpenChange={setAdd}>
        <DialogContent className="os-dialog">
          <DialogHeader>
            <DialogTitle>Welcome a school to the family.</DialogTitle>
            <DialogDescription>
              Create a live school account. A trusted administrator must provision its school owner
              separately.
            </DialogDescription>
          </DialogHeader>
          <form
            className="os-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await liveSchoolRepository.addSchool(
                  String(f.get("name")),
                  String(f.get("type")) as PlatformSchool["school_type"],
                );
                setAdd(false);
                await refresh();
                toast.success("School registered.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Unable to create school.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Official school name
              <input name="name" required />
            </label>
            <label>
              School type
              <select name="type">
                <option value="conventional">Conventional</option>
                <option value="islamic">Islamiyya / Tahfeez</option>
                <option value="integrated">Integrated</option>
              </select>
            </label>
            <button className="os-primary" disabled={busy}>
              Register School
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(support)}
        onOpenChange={(v) => !v && (setSupport(null), setRecords([]))}
      >
        <DialogContent className="os-dialog">
          <DialogHeader>
            <DialogTitle>{support?.name}</DialogTitle>
            <DialogDescription>
              Read-only support view. Platform owners cannot change school records.
            </DialogDescription>
          </DialogHeader>
          <div className="os-local-note">
            <ShieldCheck size={18} />
            Support access is read-only at the database policy level.
          </div>
          {!records.length ? (
            <p className="os-muted">This school has not added any records yet.</p>
          ) : (
            <div className="os-support-records">
              {records.map((r) => (
                <details key={r.id}>
                  <summary>
                    {r.kind} · {String(r.payload["fullName"] || r.payload["name"] || r.id)}
                  </summary>
                  <pre>{JSON.stringify(r.payload, null, 2)}</pre>
                </details>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
