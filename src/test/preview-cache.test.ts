import { describe, expect, it } from "vitest";
import { refuseOfflineWorker } from "@/services/schoolApp";
describe("Offline worker preview safety", () => {
  it("never registers in development or embedded previews", () => {
    expect(refuseOfflineWorker("localhost", false, false, "")).toBe(true);
    expect(refuseOfflineWorker("school.example", true, true, "")).toBe(true);
  });
  it("rejects main, draft, branded and developer preview hosts", () => {
    for (const host of ["id-preview--abc.lovable.app", "preview-2--abc.lovable.app", "preview-v2--abc.gpt-eng.com", "project--abc-dev.lovable.app", "abc.lovableproject.com", "beta.lovable.dev"]) {
      expect(refuseOfflineWorker(host, true, false, "")).toBe(true);
    }
  });
  it("allows published and custom domains but respects sw=off", () => {
    expect(refuseOfflineWorker("ndhschoolos.lovable.app", true, false, "")).toBe(false);
    expect(refuseOfflineWorker("preview-v2--shop.example.com", true, false, "")).toBe(false);
    expect(refuseOfflineWorker("school.example", true, false, "?sw=off")).toBe(true);
  });
});