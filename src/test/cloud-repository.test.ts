import { describe, expect, it, vi } from "vitest";
import {
  buildCloudSchoolSnapshot,
  buildInvoiceProjection,
  CloudSaveQueue,
  sanitizeCloudSnapshot,
} from "@/services/cloudSchoolRepository";
import type { Student } from "@/types/school";
import type { OnboardingPayload } from "@/context/SchoolOSContext";

const onboarding: OnboardingPayload = {
  schoolName: "Real School",
  adminName: "Administrator",
  adminContact: "admin@school.test",
  adminPin: "never-upload-this",
  country: "Nigeria",
  currencyCode: "NGN",
  currencySymbol: "₦",
  classNames: ["JSS 1", "JSS 2"],
  currentSession: "2026/2027",
  multiProgrammeEnabled: false,
};

describe("cloud adapter without changes to module APIs", () => {
  it("initializes only requested school data, never default pupils or credentials", () => {
    const snapshot = buildCloudSchoolSnapshot(onboarding);
    expect(snapshot.classes.map((c) => c.name)).toEqual(["JSS 1", "JSS 2"]);
    expect(snapshot.students).toEqual([]);
    expect(snapshot.payments).toEqual([]);
    expect(snapshot.attendance).toEqual([]);
    expect(snapshot.staff[0]!.email).toBe("admin@school.test");
    expect(snapshot.staff[0]).not.toHaveProperty("loginPin");
    expect(JSON.stringify(snapshot)).not.toContain("never-upload-this");
    const withPin = { ...snapshot, staff: [{ ...snapshot.staff[0]!, loginPin: "1234" }] };
    expect(sanitizeCloudSnapshot(withPin).staff[0]).not.toHaveProperty("loginPin");
    expect(withPin.staff[0]!.loginPin).toBe("1234");
    expect(buildInvoiceProjection(snapshot)).toEqual([]);
  });
  it("persists the original fee calculations, including waivers and unconfirmed payments", () => {
    const snapshot = buildCloudSchoolSnapshot(onboarding);
    snapshot.settings.siblingDiscount.enabled = false;
    snapshot.students = [
      {
        id: "student-a",
        admissionId: "TEST-001",
        fullName: "Fixture Student",
        gender: "Male",
        dateOfBirth: "2014-01-01",
        bloodGroup: "O+",
        healthNotes: "",
        homeAddress: "",
        status: "Active",
        admissionDate: "2026-09-01",
        guardianName: "Fixture Guardian",
        guardianRelationship: "Parent",
        parentPhone: "",
        parentEmail: "",
        programmeClasses: { "prog-main": "cls-main-1" },
        manualFeeWaiver: 500,
      } satisfies Student,
    ];
    snapshot.feeItems = [
      {
        id: "tuition",
        label: "Tuition",
        category: "Tuition",
        programmeId: "prog-main",
        applicableClassIds: [],
        amount: 10000,
        mandatory: true,
      },
    ];
    snapshot.payments = [
      {
        id: "payment-confirmed",
        receiptNumber: "RECEIPT-1",
        studentId: "student-a",
        session: "2026/2027",
        term: "First Term",
        invoiceProgrammeId: "prog-main",
        amount: 2000,
        method: "Cash",
        confirmationStatus: "Confirmed",
        reference: "",
        date: "2026-11-02",
        recordedBy: "School Admin",
      },
    ];
    snapshot.payments.push({
      ...snapshot.payments[0]!,
      id: "pending-payment",
      amount: 3000,
      confirmationStatus: "Pending Confirmation",
    });
    expect(buildInvoiceProjection(snapshot)).toEqual([
      expect.objectContaining({
        studentId: "student-a",
        session: "2026/2027",
        term: "First Term",
        grossSubtotal: 10000,
        waiver: 500,
        netPayable: 9500,
        amountPaid: 2000,
        balance: 7500,
        status: "Partial",
      }),
    ]);
    snapshot.payments = JSON.parse(JSON.stringify(snapshot.payments));
    expect(buildInvoiceProjection(JSON.parse(JSON.stringify(snapshot)))).toEqual(
      buildInvoiceProjection(snapshot),
    );
  });
  it("serializes/coalesces autosaves and never uploads the initial loaded state again", async () => {
    const original = buildCloudSchoolSnapshot(onboarding);
    let finishFirst!: (revision: number) => void;
    const save = vi
      .fn<NonNullable<ConstructorParameters<typeof CloudSaveQueue>[3]>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(3);
    const queue = new CloudSaveQueue("school-a", 1, original, save);
    await queue.enqueue(original);
    expect(save).not.toHaveBeenCalled();
    const first = queue.enqueue({
      ...original,
      settings: { ...original.settings, name: "First edit" },
    });
    await Promise.resolve();
    const second = queue.enqueue({
      ...original,
      settings: { ...original.settings, name: "Latest edit" },
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.dirty).toBe(true);
    finishFirst(2);
    await Promise.all([first, second]);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0]![0]).toBe("school-a");
    expect(save.mock.calls[1]![1]).toBe(2);
    expect(save.mock.calls[1]![2].settings.name).toBe("Latest edit");
    expect(queue.dirty).toBe(false);
  });
  it("keeps failed work in memory, pauses writes, and retries the latest pending edit", async () => {
    const original = buildCloudSchoolSnapshot(onboarding);
    const save = vi
      .fn<NonNullable<ConstructorParameters<typeof CloudSaveQueue>[3]>>()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(2);
    const onState = vi.fn();
    const queue = new CloudSaveQueue("school-a", 1, original, save, onState);
    await expect(
      queue.enqueue({
        ...original,
        students: [{ id: "student-a" } as (typeof original.students)[number]],
      }),
    ).rejects.toThrow("Network unavailable");
    expect(queue.dirty).toBe(true);
    expect(onState).toHaveBeenCalledWith("error", "Network unavailable");
    await expect(queue.flush()).rejects.toThrow(/failed/i);
    await expect(
      queue.enqueue({
        ...original,
        students: [{ id: "student-a" } as (typeof original.students)[number]],
        settings: { ...original.settings, name: "Newer edit" },
      }),
    ).rejects.toThrow(/paused/i);
    expect(save).toHaveBeenCalledTimes(1);
    await queue.retry();
    expect(save.mock.calls[1]![1]).toBe(1);
    expect(save.mock.calls[1]![2].settings.name).toBe("Newer edit");
    expect(queue.dirty).toBe(false);
  });
});
