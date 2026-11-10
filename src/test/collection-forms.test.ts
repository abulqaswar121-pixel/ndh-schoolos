import { describe, expect, it } from "vitest";
import { collectionPages, parentSlipPages } from "@/services/collectionForms";

describe("collection paper batches", () => {
  it("puts three parent slips on each A4 sheet", () => {
    const pages = parentSlipPages(610);
    expect(pages).toHaveLength(204);
    expect(pages[0]).toEqual([0, 1, 2]);
    expect(pages[203]).toEqual([609]);
    expect(pages.flat()).toHaveLength(610);
  });
  it("keeps every staff member once across paper sheets", () => {
    const staff = Array.from({ length: 37 }, (_, i) => i);
    const pages = collectionPages(staff, 18);
    expect(pages.map(page => page.length)).toEqual([18, 18, 1]);
    expect(pages.flat()).toEqual(staff);
  });
});