# Activate the existing SchoolOS workspace on Lovable Cloud / Supabase

## Deployment status

This change implements the application integration and an additive database migration. It does **not** provision a Supabase project or claim the migration is applied to your live project. The development sandbox had no database connection or Supabase environment variables. Tests use a local PostgreSQL engine (PGlite) and mocked authentication, not live accounts.

The existing public pages, photos, videos, stylesheets, and app modules are retained. No demonstration schools, students, payments, or subscriptions are inserted by these migrations.

## 1. Use your existing Cloud project

In Lovable Cloud / Supabase deployment settings, provide the project's public URL and **publishable** key:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are the existing generated Supabase client's variable names. For local development, copy `.env.example` to `.env.local` and fill them in locally. Restart the development server after changing them; rebuild/redeploy production after build-time changes. Never put a service-role key, database password, or migration connection string in `VITE_*`, source control, or chat.

Without configuration, the public website still loads, but the login/registration UI does not create browser-only accounts or pretend to save cloud records. Existing browser data is not deleted.

## 2. Apply migrations safely

Back up your existing database first. Through your trusted Lovable migration workflow or Supabase SQL Editor:

1. If the core tables do not already exist, apply `drizzle/migrations/0000_create_schoolos_core.sql` first. **Do not re-run it against an already-initialized database.**
2. Apply `drizzle/migrations/0001_cloud_workspaces.sql` once, transactionally. The SQL Editor can execute the entire file wrapped in `BEGIN; ... COMMIT;`. The migration journal also includes it for the existing migration workflow.
3. If your actual schema differs from the checked-in core migration, review/reconcile it before applying this migration. Do not drop live tables to make it fit.

Do **not** run `drizzle-kit push` against the empty generated `drizzle/schema.ts`; use the checked-in migrations. Migration `0001` adds tables/functions/policies, does not drop existing tables, and changes generic record writes from unverified member-wide access to administrator-only access.

A pre-existing administrator membership with an empty school can initialize a workspace. If its school already contains generic cloud records but has no compatible workspace, initialization deliberately stops and asks for a reviewed migration instead of overwriting those records with an empty snapshot.

## 3. Configure and verify email/password authentication

Enable email/password accounts in Supabase Auth. Set your real deployed Site URL and allow its `/login` confirmation redirect; allow a development/preview origin only if you intend to use it. Do not disable email confirmation merely to bypass configuration errors.

- The existing three-step registration modal now accepts an administrator email and password (minimum eight characters; stricter project password policies still apply).
- If confirmation is enabled, registration displays a check-email message and does **not** authenticate the administrator or create school records until a verified Auth session exists.
- The non-credential school setup draft is kept in session storage, if available, until the first confirmed login. Keep that tab open. Confirmation/login on another device without that draft initializes an empty school using the account's school name; configure its classes, programmes, currency, and branding afterward. Passwords are never included in that draft or workspace.
- The server assigns the school UUID, school code, administrator membership, and default 30-day trial; the browser cannot set subscription status or expiry.
- Login uses `signInWithPassword`; restored sessions are checked using `getUser`, not trusted local portal flags. The school comes from the verified user's administrator membership, never the optional displayed school code.

**Non-administrator portals:** all existing modules remain, but legacy staff PINs and parent phone numbers do not authenticate cloud access. This integration intentionally grants full workspace access only to verified school administrators. Provisioning verified teacher/parent identities and narrower data APIs is a separate rollout; do not re-enable phone/PIN fallback for cloud records.

## 4. Provision the platform owner once, server-side

Have the actual owner create and confirm their Auth account. An authorized database operator can then run this in the trusted SQL Editor, replacing the email with the **verified owner's** email:

```sql
INSERT INTO public.platform_owners (user_id)
SELECT id FROM auth.users
WHERE lower(email) = lower('replace-with-the-verified-owner-email')
  AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;
```

Confirm that exactly the intended account is in `platform_owners`. No public signup field, client role switch, staff title, or auth user metadata grants owner privileges. Do not add ordinary school administrators to this table.

Sign out and back in, then open `/platform`. The Super Admin screen lists actual registered school names, IDs, types, registration dates, subscription statuses, and expiry dates. Refresh retrieves the current registry. Only the owner-checked `list_registered_schools()` RPC can supply this list. An expired date is displayed as Expired even when an old stored label says Active/Free Trial. This screen is read-only; existing owner-only `manage_subscription` remains available to trusted operations, not ordinary administrators.

Owners can see the school registry, **not** every school's private workspace/student data. A platform owner with no school can use `/platform` without accidentally creating a sample school.

## 5. How existing modules persist data

`src/services/cloudSchoolRepository.ts` adapts the existing snapshot APIs without replacing module layouts:

- `school_workspaces`: complete original school snapshot, keyed by authenticated school UUID. Preserves settings, student records, classes, attendance, fees/payments, scores, staff, and other existing module data.
- `school_records`: school-scoped student, class, attendance, and fee-structure projections for database queries. These projections are adapter-owned; edit them through the workspace API, not independently.
- `school_invoices`: persisted invoice summaries computed using the app's existing fee, discount, waiver, and confirmed-payment calculations. Summaries are also included as `feeInvoices` in the cloud snapshot and loaded with it. Existing fee screens retain their original calculation/display behavior based on restored cloud fee/payment inputs. This does not introduce an immutable accounting ledger or change historical fee calculation semantics.
- `save_school_workspace`: validates the authenticated administrator and active subscription, atomically writes the snapshot/projections/invoices, and increments a revision. A stale revision fails rather than overwriting another tab/device.

RLS protects reads; direct workspace/invoice writes are not granted. RPCs check school membership themselves. Staff PINs are stripped before upload. Browser registries are never used to select a cloud tenant. The service worker also excludes authenticated and API responses from its offline cache, including same-origin Cloud proxies.

Saves are serialized and coalesced. The header displays cloud save status. If saving fails, the workspace shows retry/download/reload actions, keeps pending work in memory, warns before closing, and does not sign out while changes remain unsaved. Subscription-inactive schools can read their existing workspace but cannot save changes. During a connection loss, keep the tab open and retry; closing it can lose unacknowledged edits. Cloud data is not silently substituted with another local school.

Explicit downloads/local restore points remain user-controlled backups, not authentication or the source of truth. Cloud restore points are tagged with school UUID and shown only for the current school. Protect downloaded/browser backups on shared devices; database RLS cannot encrypt or revoke a file someone has already downloaded.

## 6. Migrate this browser's previous local school explicitly

After signing in to the intended **empty** cloud school, open **Backups** and choose **Import This Browser’s School**. Review both school names in the confirmation. This uploads only after confirmation, keeps the authenticated cloud school UUID/code and subscription, strips legacy PINs, and retains the original local copy. Imports cannot replace an already-populated cloud school using this shortcut. Review a JSON backup through the existing restore workflow when a more deliberate restore is needed.

No local records are uploaded just because someone opens the website or logs in. Do not import another person's school on a shared browser.

## Live acceptance checklist

After configuration and migration, test using real, disposable test schools/accounts in your project:

1. Register and confirm two administrator accounts. Test incorrect password and a fresh-browser login.
2. Create a student/class, mark attendance, configure fees, and record a confirmed payment. Refresh and use another device; confirm records, invoice totals, and payment balances persist.
3. As school A, try reading school B's workspace/records/invoices and calling save with B's UUID: no data must be returned and the write must fail.
4. Attempt `/platform` and `list_registered_schools()` as an ordinary administrator: access must be denied. Verify the provisioned owner sees both schools and their real statuses.
5. Edit the same school in two tabs. The stale tab must show a conflict and must not overwrite the first save. Download a backup before discarding stale work.
6. Simulate network loss/save failure and subscription expiry. Verify visible error states, retained pending work, and blocked sign-out until saved.
7. Recheck the original public homepage/video and existing workspace modules. Clear only obsolete service-worker caches if an old deployed shell persists; do not delete school storage to fix a cache issue.

Local verification commands: `npm test`, `npx tsc --noEmit`, and `npm run build`. Local tests cover authentication-state handling, cloud save serialization/failures, actual PostgreSQL migrations/RLS, school isolation, owner-only registry access, subscriptions, and the original routes/video behavior. Passing them does not substitute for the live checklist.
