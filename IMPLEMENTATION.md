# NDH SchoolOS — implementation and deployment notes

## Run locally

```sh
npm install --legacy-peer-deps
npm run dev -- --host 0.0.0.0
```

- `/` and `/app`: responsive school workspace.
- `/platform`: separate, live-database-backed platform owner portal.
- `npm run build`: production build.
- `npm test`: component, calculations, permissions, exports, and onboarding tests.
- `npx tsc --noEmit`: type check.

## Strict empty-data behavior

`createEmptySchoolDatabase()` creates an **empty** school database. Students, staff, classes, subjects, fees, receipts, attendance, timetable lessons, and Quran progress all start empty. The grading rules, Quran reference catalogue, and academic configuration are reference/settings data, not school records.

Onboarding creates only the school profile, the administrator entered by the user, and class names explicitly entered by the user. Integrated school setup does not silently create groups or subjects. No sample records are loaded into the application. Explicit fixtures live only under `src/test`.

## School workspace: working browser implementation

The school modules currently use the repository's browser-local snapshot adapter (`schoolRepository.ts`) with IndexedDB backup support. They are **not** automatically synchronized to Supabase.

Available workflows include school onboarding, school-type selection, class management, student registration with photos/guardian details/sibling linking, class transfers/promotion, subject and grading setup, CA/exam entry, printable reports, fee structures/payments/receipts, daily attendance and weekly CSV, conflict-checked weekly timetables, Tahfeez progress, staff/payroll, QR ID cards, branding/signatures, and backup/export.

Role-scoped views and write guards improve the browser experience, but **local PIN/session storage is not secure server authentication or a production multitenancy boundary**. Data can be read or modified by someone with access to browser storage. Do not put real children's sensitive records in this mode. The UI explicitly labels it a browser workspace and explains this in setup/help.

## Live database foundation and owner portal

1. Create a Supabase project using PostgreSQL 15 or newer.
2. Apply `database/001_schoolos.sql` using the migration administrator.
3. Copy `.env.example` to an untracked `.env`, configure the public project URL and anon/publishable key, and restart the dev server.
4. Create a real owner Auth account through a trusted administrative process, then add that user's actual UUID to `platform_owners` using the trusted database console. There are deliberately no built-in accounts or credentials.
5. Visit `/platform` and sign in. Users without an owner row cannot enter. Platform owners can register schools, search/filter/export the school list, manage subscription state, renew for 30 days, see live totals, and open read-only support records.
6. Provision each school's real Auth users and `school_memberships` through a trusted server/admin process. Roles cannot be self-assigned from the public client.

`liveSchoolRepository.ts` contains authenticated, asynchronous record CRUD, payment creation, platform queries, subscription RPC, and auth methods. It uses the user's JWT, **never** a service-role credential. Database RLS enforces tenant membership, assigned classes, parent links, active subscriptions, and read-only platform support. Receipt numbers are allocated by a database sequence, not by client counts; the payment ledger is append-only to public clients.

Subscription revenue comes only from `subscription_payments`, which must be written by a verified payment webhook/trusted server. School fees are a separate ledger and are not counted as NDH revenue. Neither table has seed data.

## Remaining production integration

The school context still needs migration from synchronous local snapshot writes to `liveSchoolRepository` calls, with authenticated server-verified identity, async error handling, and conflict/retry behavior. The platform portal is wired to the live adapter; the school workspace is not. Local school creation does not register a live school. The two stores are deliberately not silently mixed.

Before production deployment also implement:

- Verified invitation/onboarding and account recovery; secure parent authentication using admission number plus verified guardian ownership (never admission number alone).
- School-level settings/profile update endpoints and tenant-bound photo/stamp object storage policies.
- Transactional server grading/result publication, promotion and payroll operations; server-side payload validation and audit logging.
- Live mapping of programmes/classes, linked guardians and teacher assignments; RLS integration tests against two real test tenants.
- Verified subscription webhooks; actual expiry scheduling and audited support access.
- A reviewed data-retention/backup policy and security review appropriate for children's records.

The SQL is a foundation, not a claim of an audited, deployed production service. No database project, credentials, or hosted service is fabricated by this repository. The migration is exercised against an ephemeral PostgreSQL engine (PGlite) in `src/test/database.test.ts`, including two-tenant isolation, assigned-class access, published parent results, read-only owner support, suspended-school denial, and immutable sequential receipts. Re-test policies in the deployed Supabase project before launch.
