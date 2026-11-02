import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { PrintableReportCard } from "@/components/schoolos/printables/PrintableReportCard";
import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import { getAuthorizedSnapshot } from "@/services/accessControl";
import {
  buildBackupEnvelope,
  buildMasterSchoolWorkbookSheets,
  buildSpreadsheetXmlWorkbook,
  parseAndValidateBackupJson,
} from "@/services/backupExportService";
import {
  createDefaultCustomization,
  resolveReportCardRemarks,
} from "@/services/customizationDefaults";

describe("Offline Vault, Backups, Multi-Sheet Excel Export & Report Sheet Customization", () => {
  it("builds a checksummed full school backup and validates it cleanly on restore", () => {
    const db = createSeedDatabase();
    db.settings.name = "Crescent Royal Academy";
    db.settings.code = "CRA";
    db.students.push({
      id: "stu-1",
      admissionId: "CRA/2026/001",
      fullName: "Zainab Musa",
      gender: "Female",
      dateOfBirth: "2014-03-11",
      bloodGroup: "O+",
      healthNotes: "None",
      homeAddress: "Sokoto",
      programmeClasses: { "prog-main": "cls-main-2" },
      status: "Active",
      admissionDate: "2026-09-10",
      guardianName: "Alhaji Musa",
      guardianRelationship: "Father",
      parentPhone: "08031234567",
      parentEmail: "musa@example.com",
    });

    const envelope = buildBackupEnvelope(db);
    expect(envelope.format).toBe("ndh-schoolos-backup");
    expect(envelope.counts.students).toBe(1);
    expect(envelope.checksum).toHaveLength(8);

    const validated = parseAndValidateBackupJson(JSON.stringify(envelope));
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.checksumVerified).toBe(true);
      expect(validated.envelope.schoolName).toBe("Crescent Royal Academy");
      expect(validated.envelope.snapshot.students[0]?.fullName).toBe(
        "Zainab Musa"
      );
    }
  });

  it("generates RBAC-scoped multi-sheet Microsoft Excel (.xls) workbooks", () => {
    const db = createSeedDatabase();
    db.settings.name = "Unity Model College";

    const adminScoped = getAuthorizedSnapshot(db, {
      isAuthenticated: true,
      role: "admin",
      displayName: "Proprietor",
      subtitle: "Admin",
    });
    const adminSheets = buildMasterSchoolWorkbookSheets(adminScoped, "admin");
    const adminSheetNames = adminSheets.map((s) => s.name);
    expect(adminSheetNames).toContain("Students Register");
    expect(adminSheetNames).toContain("Scores & Grades");
    expect(adminSheetNames).toContain("Fee Ledger & Debtors");
    expect(adminSheetNames).toContain("Staff & Payroll");
    expect(adminSheetNames).toContain("Audit Log");

    const bursarScoped = getAuthorizedSnapshot(db, {
      isAuthenticated: true,
      role: "bursar",
      displayName: "Bursar",
      subtitle: "Bursar",
    });
    const bursarSheets = buildMasterSchoolWorkbookSheets(
      bursarScoped,
      "bursar"
    );
    const bursarSheetNames = bursarSheets.map((s) => s.name);
    expect(bursarSheetNames).toContain("Fee Ledger & Debtors");
    expect(bursarSheetNames).toContain("Staff & Payroll");
    expect(bursarSheetNames).not.toContain("Scores & Grades");
    expect(bursarSheetNames).not.toContain("Audit Log");

    const xml = buildSpreadsheetXmlWorkbook(adminSheets, "#064E3B");
    expect(xml).toContain('xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"');
    expect(xml).toContain('Worksheet ss:Name="Students Register"');
    expect(xml).toContain("#064E3B");
  });

  it("resolves A–F auto-comments with placeholders and renders Final Grade Only mode without positions", () => {
    const db = createSeedDatabase();
    const custom = createDefaultCustomization();
    custom.reportSheet.template = "executive_banner";
    custom.reportSheet.rankingMode = "grade_only";
    custom.reportSheet.customReportTitle = "Terminal Progress Certificate";
    custom.autoComments.enabled = true;
    custom.autoComments.mode = "override_all";
    custom.autoComments.rules.A = {
      grade: "A",
      teacherComment: "Superb distinction, {firstName}! Keep shining ({grade}).",
      principalComment: "Outstanding {average}% average — proud of you, {name}.",
    };
    custom.autoComments.rules.F = {
      grade: "F",
      teacherComment: "{firstName} requires structured remedial coaching.",
      principalComment: "Parent conference requested for {firstName}.",
    };
    db.settings.customization = custom;

    // Verify all A–F rules resolve cleanly
    const remarksF = resolveReportCardRemarks({
      customization: custom,
      overallGrade: "F",
      averagePercentage: 31.5,
      studentName: "Ibrahim Bello",
    });
    expect(remarksF.teacherRemark).toBe(
      "Ibrahim requires structured remedial coaching."
    );
    expect(remarksF.principalRemark).toBe(
      "Parent conference requested for Ibrahim."
    );

    // Add an active student with an A score (88%) and render PrintableReportCard
    db.students.push({
      id: "stu-a1",
      admissionId: "SCH/2026/001",
      fullName: "Fatima Abdullahi",
      gender: "Female",
      dateOfBirth: "2015-01-20",
      bloodGroup: "A+",
      healthNotes: "None",
      homeAddress: "Lagos",
      programmeClasses: { "prog-main": "cls-main-2" },
      status: "Active",
      admissionDate: "2026-09-01",
      guardianName: "Mrs. Abdullahi",
      guardianRelationship: "Mother",
      parentPhone: "08099887766",
      parentEmail: "",
    });
    db.scores.push({
      id: "sc-1",
      studentId: "stu-a1",
      subjectId: "sub-eng",
      classId: "cls-main-2",
      programmeId: "prog-main",
      session: db.settings.currentSession,
      term: db.settings.currentTerm,
      scores: { ca1: 18, ca2: 18, exam: 52 },
    });

    render(
      <PrintableReportCard
        db={db}
        studentId="stu-a1"
        session={db.settings.currentSession}
        term={db.settings.currentTerm}
        layout="merged"
      />
    );

    expect(
      screen.getByText(/Terminal Progress Certificate/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Final Grade: A/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Superb distinction, Fatima! Keep shining \(A\)\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Outstanding 88\.0% average — proud of you, Fatima Abdullahi\./i)
    ).toBeInTheDocument();

    // Ensure positions are completely hidden in grade_only mode
    expect(screen.queryByText(/1st of/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Pos$/i })).not.toBeInTheDocument();
  });
});
