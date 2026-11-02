import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { SchoolOSProvider, useSchoolOS } from "@/context/SchoolOSContext";
import {
  buildCloudSchoolSnapshot,
  cloudSchoolRepository,
  type CloudAccount,
} from "@/services/cloudSchoolRepository";

vi.mock("@/services/cloudSchoolRepository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/cloudSchoolRepository")>()),
  isCloudConfigured: () => true,
}));

let api: ReturnType<typeof useSchoolOS>;
let emitAuth: (id: string | null) => void;
function Probe() {
  api = useSchoolOS();
  return (
    <>
      <span data-testid="auth">{String(api.portal.isAuthenticated)}</span>
      <span data-testid="school">{api.db.settings.name}</span>
      <span data-testid="sync">{api.cloudStatus}</span>
    </>
  );
}
function account(id: string, name: string, isOwner = false): CloudAccount {
  const snapshot = buildCloudSchoolSnapshot({
    schoolName: name,
    adminName: "School Admin",
    adminContact: `${id}@school.test`,
    country: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    currentSession: "2026/2027",
    classNames: ["JSS 1"],
    multiProgrammeEnabled: false,
  });
  return {
    user: { id, email: `${id}@school.test`, user_metadata: {} } as User,
    isOwner,
    school: {
      id: `school-${id}`,
      name,
      school_type: "conventional",
      subscription_status: "Free Trial",
      subscription_expires_at: null,
      created_at: "2026-11-02T00:00:00Z",
      created_by: id,
    },
    workspace: { schoolId: `school-${id}`, revision: 1, snapshot },
  };
}
const schoolA = account("user-a", "School A");
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(cloudSchoolRepository, "subscribe").mockImplementation((listener) => {
    emitAuth = listener;
    return () => {};
  });
  vi.spyOn(cloudSchoolRepository, "currentUserId").mockResolvedValue(null);
  vi.spyOn(cloudSchoolRepository, "loadAccount").mockResolvedValue(schoolA);
  vi.spyOn(cloudSchoolRepository, "signIn").mockResolvedValue(schoolA.user);
  vi.spyOn(cloudSchoolRepository, "signOut").mockResolvedValue(undefined);
  vi.spyOn(cloudSchoolRepository, "save").mockResolvedValue(2);
});
afterEach(() => vi.restoreAllMocks());

describe("verified cloud sessions in the unchanged workspace provider", () => {
  it("does not trust browser authentication flags or load another browser school's records", async () => {
    window.localStorage.setItem(
      "ndh_schoolos_portal_v3",
      JSON.stringify({ role: "admin", isAuthenticated: true, schoolCode: "STOLEN" }),
    );
    window.localStorage.setItem(
      "ndh_schoolos_live_v3",
      JSON.stringify(schoolA.workspace!.snapshot),
    );
    render(
      <SchoolOSProvider>
        <Probe />
      </SchoolOSProvider>,
    );
    await waitFor(() => expect(api.hydrated).toBe(true));
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(screen.getByTestId("school")).toBeEmptyDOMElement();
    expect(cloudSchoolRepository.loadAccount).not.toHaveBeenCalled();
    expect(cloudSchoolRepository.save).not.toHaveBeenCalled();
  });
  it("loads the verified school and sends changes only to its school UUID, without local persistence", async () => {
    render(
      <SchoolOSProvider>
        <Probe />
      </SchoolOSProvider>,
    );
    await act(async () => {
      await api.loginSchoolAdmin("user-a@school.test", "password-only-for-test");
    });
    expect(screen.getByTestId("school")).toHaveTextContent("School A");
    expect(cloudSchoolRepository.save).not.toHaveBeenCalled();
    expect(api.loginProductionStaff({ identifier: "ADM-001", pin: "1234" }).ok).toBe(false);
    expect(api.loginProductionParent({ phone: "08031112222" }).ok).toBe(false);
    act(() => api.updateSettings((previous) => ({ ...previous, name: "School A Updated" })));
    await waitFor(() => expect(cloudSchoolRepository.save).toHaveBeenCalledTimes(1));
    expect(vi.mocked(cloudSchoolRepository.save).mock.calls[0]!.slice(0, 2)).toEqual([
      "school-user-a",
      1,
    ]);
    expect(window.localStorage.getItem("ndh_schoolos_live_v3")).toBeNull();
    expect(window.localStorage.getItem("ndh_schoolos_portal_v3")).toBeNull();
    await act(async () => {
      await api.logoutSession();
    });
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(screen.getByTestId("school")).toBeEmptyDOMElement();
  });
  it("never logs out or discards unsaved work after a failed save", async () => {
    vi.mocked(cloudSchoolRepository.save)
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValue(2);
    render(
      <SchoolOSProvider>
        <Probe />
      </SchoolOSProvider>,
    );
    await act(async () => {
      await api.loginSchoolAdmin("user-a@school.test", "password-only-for-test");
    });
    act(() => api.updateSettings((previous) => ({ ...previous, name: "Unsaved School" })));
    await waitFor(() => expect(api.cloudStatus).toBe("error"));
    await act(async () => {
      await expect(api.logoutSession()).rejects.toThrow(/paused/i);
    });
    expect(cloudSchoolRepository.signOut).not.toHaveBeenCalled();
    expect(api.portal.isAuthenticated).toBe(true);
    expect(api.db.settings.name).toBe("Unsaved School");
    await act(async () => {
      await api.retryCloudSave();
    });
    expect(api.cloudStatus).toBe("saved");
    await act(async () => {
      await api.logoutSession();
    });
    expect(cloudSchoolRepository.signOut).toHaveBeenCalledTimes(1);
  });
  it("does not authenticate an unconfirmed signup", async () => {
    vi.spyOn(cloudSchoolRepository, "signUp").mockResolvedValue({
      user: schoolA.user,
      needsConfirmation: true,
    });
    render(
      <SchoolOSProvider>
        <Probe />
      </SchoolOSProvider>,
    );
    await act(async () => {
      expect(
        (
          await api.registerSchoolAdmin(
            {
              schoolName: "School A",
              adminContact: "user-a@school.test",
              classNames: [],
              currentSession: "2026/2027",
              country: "Nigeria",
              currencyCode: "NGN",
              currencySymbol: "₦",
              multiProgrammeEnabled: false,
            },
            "password-only-for-test",
          )
        ).needsConfirmation,
      ).toBe(true);
    });
    expect(api.portal.isAuthenticated).toBe(false);
    expect(cloudSchoolRepository.loadAccount).not.toHaveBeenCalled();
    expect(cloudSchoolRepository.save).not.toHaveBeenCalled();
  });
  it("clears the old school's data while verifying a different account", async () => {
    vi.mocked(cloudSchoolRepository.currentUserId).mockResolvedValue("user-a");
    render(
      <SchoolOSProvider>
        <Probe />
      </SchoolOSProvider>,
    );
    await waitFor(() => expect(api.db.settings.name).toBe("School A"));
    let resolveB!: (value: CloudAccount) => void;
    vi.mocked(cloudSchoolRepository.loadAccount).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );
    act(() => emitAuth("user-b"));
    expect(api.portal.isAuthenticated).toBe(false);
    expect(api.db.settings.name).toBe("");
    await act(async () => {
      resolveB(account("user-b", "School B"));
    });
    expect(api.db.settings.name).toBe("School B");
    act(() => api.updateSettings((previous) => ({ ...previous, motto: "B only" })));
    await waitFor(() => expect(cloudSchoolRepository.save).toHaveBeenCalledTimes(1));
    expect(vi.mocked(cloudSchoolRepository.save).mock.calls[0]![0]).toBe("school-user-b");
  });
});
