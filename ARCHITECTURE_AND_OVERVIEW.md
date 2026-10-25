# NDH SchoolOS — Nigerian School Management Platform (v3 Live)

**NDH SchoolOS** is a fast, production-ready Nigerian school management platform built under the **Najeeb Digital Hub (`ndh.com.ng`)** family for Nursery, Primary, Secondary, and Combined campuses.

---

## 1. Public Website & Portal Routes (TanStack Start)

- **`/` (`src/routes/index.tsx`)** — Concise Homepage:
  - Moving pre-nav announcement ticker (`.ndh-top-ticker`) that scrolls away naturally while `<header>` stays sticky at `top: 0`.
  - Embedded HTML5 `<video>` `.mp4` role walkthrough player with spoken voice narration (`public/videos/tutorial-*.mp4`), auto-playing and rolling automatically across all 6 school roles.
  - Distinct executive Nigerian cover photos (`public/images/cover-*.jpg`).
- **`/tutorials` (`src/routes/tutorials.tsx`)** — Narrated `.mp4` video guides + at-a-glance permissions for all 6 roles.
- **`/features` (`src/routes/features.tsx`)** — Scannable overview of daily academic, financial, attendance, payroll, and printable tools.
- **`/for-schools` (`src/routes/for-schools.tsx`)** — Configurations for Nursery/Primary, JSS/SSS Colleges, and Combined Campuses.
- **`/pricing` (`src/routes/pricing.tsx` & `src/config/pricing.ts`)** — **Per Term** & **Per Session (3 Terms • Save 17%)** billing in Naira (`₦`):
  - **Starter** (up to 150 students): `₦30,000 / term` or `₦75,000 / session` *(save `₦15,000`)*
  - **Standard** (up to 500 students, **Most Popular**): `₦80,000 / term` or `₦200,000 / session` *(save `₦40,000`)*
  - **Large** (500+ students or multi-campus): Custom termly or discounted session plan
  - Early schools: *1st Term Free Pilot* • Optional setup & staff training: `₦50,000`
- **`/contact` (`src/routes/contact.tsx`)** — Direct phone (`0902 993 2794`), WhatsApp, email (`support@ndh.com.ng`), Sokoto head office address, and enquiry form.
- **`/login` (`src/routes/login.tsx`)** — Live sign-in for Staff (`Staff ID / Email / Phone + PIN`) and Parents (`Registered Guardian Phone Number`). Zero demo switchers or fake student records.
- **`/app` (`src/routes/app.tsx`)** — Authenticated School Workspace & Parent Portal.

---

## 2. Live Onboarding, Data-Layer RBAC & Nigerian Printables

1. **Zero-Demo Clean Database (`ndh_schoolos_live_v3`)**:
   - Starts completely clean with zero fake students or demo sandboxes.
   - Completing the 3-step **Register Your School** wizard (`SaaSOnboardingWizard.tsx`) provisions your school's classes (`Nursery`, `Primary 1–6`, `JSS 1–3`, `SSS 1–3`), Nigerian `CA 1 (20) / CA 2 (20) / Exam (60)` grading scale, creates the Proprietor/Admin account (`ADM-001` with chosen PIN), and signs straight into `/app`.
2. **Strict Data-Layer Access Control (`src/services/accessControl.ts`)**:
   - `admin` (School Owner / Principal): Full setup, staff PINs, fee waivers, score-edit approvals, term result locks, and Audit Log.
   - `class_teacher`: Scoped strictly to assigned class(es) for attendance, CA/Exam marksheets, remarks, affective ratings, and report cards.
   - `subject_teacher`: Scoped strictly to assigned subject(s) in assigned class(es); edits to published terms enter the Admin approval queue.
   - `bursar`: Class fee schedules, bank-transfer confirmation, numbered receipts, debtors list, and staff payroll (zero academic score access).
   - `secretary`: Student admissions, sibling phone linking, attendance, parent notices, and read-only report printing.
   - `parent`: One phone login scoped strictly to all linked siblings for attendance, report cards, fee bills, transfer submission, and receipts.
   - `muallim` *(optional)*: Enabled only when the optional 114-Surah Qur'an module is turned on in School Settings (off by default).
3. **Parent Brand & AI Assistant Isolation**:
   - Matches `ndh.com.ng` design tokens (`#1a4a6e` / `#0c2340`), Open Gateway family tile with `School` sector badge, and bottom-right circular **Ask Amina** assistant (`SchoolOSAIAssistant.tsx`) strictly isolated from student database records.
4. **Clean A4 Printables (`src/components/schoolos/printables/`)**:
   - Single-page Nigerian A4 Report Cards, Master Class Broadsheets, Sequential Official Fee Receipts, and Monthly Staff Payslips.
