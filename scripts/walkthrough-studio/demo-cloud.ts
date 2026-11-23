// Only the recording Vite config aliases this adapter. Not a production login path.
export * from "../../src/services/cloudSchoolRepository";
import { buildPortalSessionForRole } from "../../src/context/SchoolOSContext";
import type { UserRole } from "../../src/types/school";
import { createRecordingDatabase, demoSchool } from "./demo-data";
export const isCloudConfigured = () => true;
let snapshot = createRecordingDatabase();
let role: UserRole = "admin";
export const cloudSchoolRepository = {
  subscribe: () => () => {},
  currentUserId: async () => null,
  signIn: async (email: string) => {
    const requested = new URLSearchParams(window.location.search).get("recordingRole") || "admin";
    if (
      ![
        "admin",
        "exam_officer",
        "class_teacher",
        "subject_teacher",
        "bursar",
        "secretary",
        "parent",
      ].includes(requested)
    )
      throw new Error("Unknown demo role");
    if (email !== "owner@example.invalid" && email !== "00000000000")
      throw new Error("Use the fictional recording identity.");
    role = requested as UserRole;
    snapshot = createRecordingDatabase(
      new URLSearchParams(window.location.search).get("stream") === "tahfeez",
    );
    return { id: "recording-only-owner", email };
  },
  signOut: async () => {},
  signUp: async () => {
    throw new Error("Recording only — real registration is disabled.");
  },
  loadAccount: async () => ({
    user: { id: "recording-only-owner", email: "owner@example.invalid" },
    isOwner: false,
    portal:
      role === "admin"
        ? undefined
        : buildPortalSessionForRole(role, snapshot, {
            isAuthenticated: true,
            parentPhone: "00000000000",
          }),
    school: demoSchool,
    workspace: { schoolId: demoSchool.id, revision: 1, snapshot },
  }),
  save: async (_id: string, revision: number, next: typeof snapshot) => {
    snapshot = structuredClone(next);
    return revision + 1;
  },
};
