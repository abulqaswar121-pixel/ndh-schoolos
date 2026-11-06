import { describe, expect, it } from "vitest";
import {
  classTeacherCommentFromAverage,
  headTeacherCommentFromTotal,
} from "@/components/schoolos/printables/HalqahExcelReportSheet";

describe("Markazus-Salaf Excel comment rules", () => {
  it("head teacher comment uses total marks bands", () => {
    expect(headTeacherCommentFromTotal(500)).toBe("A good student always attentive in class.");
    expect(headTeacherCommentFromTotal(399)).toBe("A good student always trying to achieve the best.");
    expect(headTeacherCommentFromTotal(199)).toBe("A good student needs to wake up.");
  });
  it("class teacher comment uses average % bands", () => {
    expect(classTeacherCommentFromAverage(70)).toMatch(/^An excellent result/);
    expect(classTeacherCommentFromAverage(45)).toMatch(/^A fair result/);
    expect(classTeacherCommentFromAverage(44.9)).toMatch(/^An unintresting result/);
  });
});
