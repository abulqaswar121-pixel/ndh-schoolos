import { describe, expect, it } from "vitest";
import { createEmptySchoolDatabase } from "@/data/emptySchoolDatabase";
import {
  canManageFees,
  canManageSettings,
  canManageStudents,
  getAuthorizedSnapshot,
} from "@/services/accessControl";
import type { ActivePortalSession } from "@/types/school";

describe("Strict empty-data contract", () => {
  it("starts every school record collection empty, with no invented school identity", () => {
    const db = createEmptySchoolDatabase();
    for (const value of Object.values(db)) if (Array.isArray(value)) expect(value).toHaveLength(0);
    expect(db.settings.name).toBe("");
    expect(db.settings.motto).toBe("");
    expect(db.settings.daysSchoolOpened).toBe(0);
    expect(db.settings.siblingDiscount.enabled).toBe(false);
    expect(db.settings.grading.defaultComponents.reduce((total, c) => total + c.maxScore, 0)).toBe(
      100,
    );
  });
  it("does not reveal data or allow writes using a signed-out administrator role", () => {
    const db = createEmptySchoolDatabase();
    db.settings.name = "Private test tenant";
    db.classes.push({
      id: "private-class",
      name: "Private class",
      programmeId: "prog-main",
      levelOrder: 1,
      nextGroupId: null,
      room: "",
    });
    const session: ActivePortalSession = {
      isAuthenticated: false,
      role: "admin",
      displayName: "",
      subtitle: "",
    };
    expect(getAuthorizedSnapshot(db, session).classes).toHaveLength(0);
    expect(getAuthorizedSnapshot(db, session).settings.name).toBe("");
    expect(canManageSettings(session)).toBe(false);
    expect(canManageStudents(session)).toBe(false);
    expect(canManageFees(session)).toBe(false);
  });
  it("returns independent empty snapshots rather than shared mutable records", () => {
    const first = createEmptySchoolDatabase();
    first.settings.name = "Changed in test";
    expect(createEmptySchoolDatabase().settings.name).toBe("");
  });
});
