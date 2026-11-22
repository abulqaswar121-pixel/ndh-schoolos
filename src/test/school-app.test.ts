import { describe, expect, it, vi } from "vitest";
import { normalizeSchoolSlug, validSchoolSlug, schoolManifest } from "@/services/schoolApp";
import { clearOfflineSchools, readOfflineSchool, saveOfflineSchool, sameOfflineScope } from "@/services/offlineSchoolStore";
import { CloudSaveQueue, emptyCloudSnapshot } from "@/services/cloudSchoolRepository";
import type { CloudSchool } from "@/services/cloudSchoolRepository";
describe("School links and school apps", () => {
  it("accepts short memorable school links and rejects invalid/reserved names", () => {
    expect(normalizeSchoolSlug(" MARKAZ ")).toBe("markaz");
    expect(validSchoolSlug("markaz")).toBe(true);
    for (const value of ["ab", "-markaz", "markaz-", "Markaz", "my school", "api", "platform", "a".repeat(33)]) expect(validSchoolSlug(value)).toBe(false);
  });
  it("installs the school's name and crest with a stable school launch URL", () => {
    const manifest = schoolManifest({ schoolId: "school-a", name: "MARKAZUSSALAF" });
    expect(manifest.name).toBe("MARKAZUSSALAF");
    expect(manifest.id).toBe("/s/school-a");
    expect(manifest.start_url).toBe("/s/school-a");
    expect(manifest.icons.map(i => i.src)).toEqual(["/api/public/school-app/school-a?icon=192", "/api/public/school-app/school-a?icon=512"]);
  });
  it("isolates offline records by user and school, expires copies and clears on sign-out", () => {
    localStorage.clear();
    const baseline = emptyCloudSnapshot();
    const school = { id: "school-a" } as CloudSchool;
    const portal = { isAuthenticated: true, role: "parent" as const, displayName: "Parent", subtitle: "", parentStudentIds: ["child-a"] };
    saveOfflineSchool({ userId: "user-a", school, portal, revision: 7, baseline, pending: null, savedAt: 1000 });
    expect(readOfflineSchool("user-a", "school-a", localStorage, 1001)?.revision).toBe(7);
    expect(readOfflineSchool("user-b", "school-a", localStorage, 1001)).toBeNull();
    expect(readOfflineSchool("user-a", "school-b", localStorage, 1001)).toBeNull();
    expect(readOfflineSchool("user-a", "school-a", localStorage, 1000 + 8 * 86400000)).toBeNull();
    clearOfflineSchools("user-a");
    expect(readOfflineSchool("user-a", "school-a", localStorage, 1001)).toBeNull();
    expect(sameOfflineScope(portal, { ...portal, parentStudentIds: ["child-b"] })).toBe(false);
  });
  it("retains a draft before upload, uses its original revision, and checkpoints the saved result", async () => {
    const baseline = emptyCloudSnapshot();
    const draft = { ...baseline, settings: { ...baseline.settings, name: "Updated School" } };
    const save = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(8);
    const checkpoint = vi.fn();
    const queue = new CloudSaveQueue("school-a", 7, baseline, save, () => {}, checkpoint);
    await expect(queue.enqueue(draft)).rejects.toThrow("Offline");
    expect(checkpoint).toHaveBeenCalledWith(7, baseline, draft);
    await queue.retry();
    expect(save.mock.calls[1]?.[1]).toBe(7);
    expect(checkpoint).toHaveBeenLastCalledWith(8, draft, null);
    expect(queue.dirty).toBe(false);
  });
});