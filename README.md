# NDH SchoolOS

Without building I trying to build this

Create NDH SchoolOS, an all-in-one School Operating System built under the Najeeb Digital Hub (NDH) family.



Key features to build:

1. School Setup: Allow schools to choose if they are Single Section (Conventional only or Islamiyya only) or Dual / Integrated (both under one roof).

2. Custom Labels: Let schools name their own groups (e.g., Primary 1, JSS 1, Class, Halqah, or Group).

3. Student Profiles: One student profile that can enroll in Conventional, Islamiyya, or both without duplicate records.

4. Academic Grading: Termly continuous assessments, exams, automatic broadsheet calculation, and clean printable report cards with grades and teacher remarks.

5. Tahfeez Tracker: For Islamiyya sections, track Quran memorization (Surah, Ayah, revision score, and teacher notes).

6. Fee Management: Track termly tuition, balance debts, generate receipts, and record payments via Paystack/cash.

7. Staff Payroll: Track teacher salaries, monthly payment records, and allowances.

8. Modern UI: Clean white-and-navy aesthetic matching the @project:9789b85d-b379-4213-9185-d84f8dddee41:"Najeeb Digital Hub"  NDH ecosystem with student, teacher, and principal roles.

So I wanted to go give arena agent to build with this prompt 

You are building NDH SchoolOS, an all-in-one School Management and Operating System built under the Najeeb Digital Hub (NDH) ecosystem. 



Build a complete, production-ready web application designed for African, Middle Eastern, and global schools. It must support both traditional schools and integrated schools (Conventional + Islamiyya/Tahfeez running under one roof).



Follow the NDH Precision design rules:

- Clean, premium, high-contrast look.

- Background: Soft porcelain canvas (#F8FAFC), crisp elevated white cards with subtle borders (#E2E8F0) and rounded corners (12px).

- Navigation header: Two-line brand lockup: "NAJEEB DIGITAL HUB" on the top line, "NDH SchoolOS" on the main line. No sibling links in the top navbar; ecosystem links go in the footer only.

- Fully mobile-friendly: Teachers and parents must be able to use every screen on their phones without horizontal scrolling or broken tables.



---



### MODULE 1: SCHOOL ONBOARDING & FLEXIBLE STRUCTURE (SETUP WIZARD)



1. School Type Choice:

   During setup, the admin chooses their school model:

   - Option A: Single Section (Conventional / Western only OR Islamiyya / Tahfeez only).

   - Option B: Dual / Integrated (Both Conventional & Islamiyya operating together).



2. Flexible Naming & Custom Labels:

   Schools do not all use the same words. The school admin must be able to define their own naming conventions before adding students:

   - Academic Grouping labels: Ability to call their groups "Class", "Grade", "Primary", "JSS", "Halqah", "Fasl", "Stream", or "Arm".

   - Section names: e.g., "Morning Section", "Islamiyya Section", "Tahfeez Department".

   - Terms & Sessions: Setup sessions (e.g., 2026/2027) and Terms (First, Second, Third Term or Semesters).



3. Grading Scale Configuration:

   - Customizable score breakdown per class or section (e.g., Continuous Assessment 40% + Exam 60%, or CA1 10% + CA2 10% + Midterm 20% + Final Exam 60%).

   - Grading thresholds (e.g., A = 70–100, B = 60–69, C = 50–59, D = 40–49, F = 0–39) with custom remarks (Excellent, Very Good, Good, Fair, Fail).



---



### MODULE 2: STUDENT & PARENT PROFILES (ONE RECORD, DUAL TRACK)



1. Master Student Profile:

   - Every student has ONE central identity: Full Name, Admission/Student ID, Gender, Date of Birth, Blood Group, Health Notes, Passport Photo, Home Address.

   - Guardian/Parent link: Connect multiple siblings to the same parent phone number and email.



2. Dual Enrollment (For Integrated Schools):

   A student can be marked as:

   - Conventional Only (e.g., Primary 4).

   - Islamiyya Only (e.g., Halqah Imam Nafi').

   - Both / Dual (e.g., Primary 4 in the morning AND Halqah Imam Nafi' in the afternoon).

   This avoids duplicate student profiles while keeping academic records cleanly separated.



---



### MODULE 3: ACADEMIC MARKSHEET & TAHFEEZ TRACKER



1. Subject Management:

   - Conventional subjects (Mathematics, English, Basic Science, Social Studies, etc.).

   - Islamiyya subjects (Qur'an Recitation, Tajweed, Hadith, Fiqh, Sirah, Nahwu, Adab, Tawheed).



2. Quick Marksheet Entry:

   - A fast, spreadsheet-style grid for teachers to type in CA and Exam scores on mobile or laptop.

   - Autosave with instant total calculation, percentage, class average, and automatic class position ranking.



3. Tahfeez & Qur'an Progress Log:

   - Dedicated tracker for memorization: Current Surah, Ayah range, and Hizb completed.

   - Revision tracking (Muraja'ah status: Strong, Needs Work, Fluent).

   - Daily or weekly Tilawah (recitation) score.



4. Broadsheet & Report Cards:

   - Master class broadsheet showing all students, all subjects, totals, and positions.

   - Printable / PDF Student Report Card:

     - For single schools: Standard report card.

     - For integrated schools: Option for a split double-sided or combined report card showing Conventional scores on one side and Islamiyya / Tahfeez evaluation on the other.

     - Includes attendance summary, affective domain ratings (Punctuality, Neatness, Politeness, Honesty), and Head Teacher / Mu'allim signature lines.



---



### MODULE 4: DAILY ATTENDANCE



1. Quick Attendance Register:

   - Daily roll-call per class or halqah with simple 1-tap toggles: Present, Late, Absent, Excused.

   - Integrated schools can record morning and afternoon sessions separately.

2. Term Summary:

   - Automatically counts Days School Opened, Days Present, and Days Absent, feeding directly into each student's term report card.



---



### MODULE 5: FEES, BILLING & RECEIPTS



1. Flexible Fee Schedules:

   - Setup fees by class/section: Tuition, Feeding, Uniform, Books, PTA, Bus, Boarding.

   - Integrated billing: Single combined invoice per student covering both Conventional and Islamiyya fees, or separate invoices.

2. Sibling Discounts & Waivers:

   - Apply discount percentages or flat waivers for families with 3 or more children.

3. Payment Collection & Tracking:

   - Record payments: Cash, Bank Transfer, or Online Gateway.

   - Auto-generate clean, printable receipts with official receipt numbers.

   - Track balance remaining, payment history, and list debtors with 1-click filter.



---



### MODULE 6: STAFF DIRECTORY & PAYROLL (SALARIES)



1. Staff Profiles:

   - Record details: Full Name, Role (Conventional Teacher, Mu'allim/Islamic Teacher, Both, Principal, Accountant, Cleaner, Driver), Phone, Bank Account Details.

2. Monthly Salary Structure:

   - Base salary.

   - Additions: Teaching allowances, overtime, transport support.

   - Deductions: Absenteeism fines, pension, advance salary repayments.

   - Net salary calculation.

3. Payroll Sheet:

   - 1-click monthly payroll generation.

   - Mark as Paid / Pending with payment reference.

   - Printable payslips for each staff member.



---



### MODULE 7: ROLE-BASED ACCESS & PORTALS



1. Super Admin / School Director: Full access to financial charts, school settings, fee ledger, payroll, and academic broadsheets.

2. Teachers & Mu'allims: Only see and edit their assigned classes, mark attendance, and input marksheet scores.

3. Parents: Secure portal or student lookup to see child’s attendance, download report cards, check fee balance, and view receipts.



---



### BUILD REQUIREMENTS



- Include mock realistic demo data for an integrated school ("Markaz Model Academy") showing classes like "Primary 4" and "Halqah Imam Nafi'", with sample students, fee receipts, teacher marksheets, and staff payroll.

- Build clean tabs or a side-drawer navigation for: Overview Dashboard, Students, Classes/Halqahs, Marksheet & Tahfeez, Attendance, Fees & Invoices, Staff & Payroll, and Settings.

- Ensure every table has search, filtering by class/term, and export/print capability.

So can I go or you wanna add something so after it finish I sync back through repo

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1eabae04-8862-4b39-8d11-612df0d4f217).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
