import { describe, expect, it } from "vitest";
import { cleanScannedRows } from "@/services/paperScanner";

const students = [{ id: "s1", name: "AISHA" }, { id: "s2", name: "BELLO" }];
const columns = [{ id: "ca1", label: "CA1", max: 20 }];

describe("cleanScannedRows", () => {
  it("caps marks at the column maximum", () => {
    expect(cleanScannedRows([{ studentId: "s1", scores: { ca1: 35 } }], students, columns)[0]?.scores["ca1"]).toBe(20);
  });
  it("drops learners not in this class", () => {
    expect(cleanScannedRows([{ studentId: "x9", scores: { ca1: 5 } }], students, columns)).toHaveLength(0);
  });
  it("keeps unreadable marks empty instead of zero", () => {
    expect(cleanScannedRows([{ studentId: "s2", scores: { ca1: "?" } }], students, columns)[0]?.scores["ca1"]).toBeNull();
  });
});
