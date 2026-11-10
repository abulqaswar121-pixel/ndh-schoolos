import { describe, expect, it } from "vitest";
import { canSchoolResetPin, isValidPin, phoneLoginEmail, resolveSignIn } from "@/services/phoneLogin";

describe("phone and PIN school access", () => {
  it("accepts exactly four PIN digits, including a leading zero", () => {
    expect(isValidPin("0123")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
  it("uses the same login for local and international Nigerian numbers", () => {
    expect(phoneLoginEmail("08012345678")).toBe(phoneLoginEmail("+234 801 234 5678"));
    expect(resolveSignIn("08012345678", "0123")).toEqual({ email: "2348012345678@phone.ndhschoolos.app", password: "ndh-pin-0123" });
  });
  it("keeps email passwords unchanged", () => {
    expect(resolveSignIn(" person@example.com ", " password ")).toEqual({ email: "person@example.com", password: " password " });
  });
  it("rejects a missing phone and an invalid PIN before sign-in", () => {
    expect(() => resolveSignIn("123", "0123")).toThrow("valid email or phone");
    expect(() => resolveSignIn("08012345678", "12")).toThrow("exactly 4");
  });
  it("allows a school to reset a PIN for its own single-school account only", () => {
    expect(canSchoolResetPin(["school-a"], "school-a")).toBe(true);
    expect(canSchoolResetPin(["school-a", "school-b"], "school-a")).toBe(false);
    expect(canSchoolResetPin([], "school-a")).toBe(false);
    expect(canSchoolResetPin(["school-b"], "school-a")).toBe(false);
  });
});