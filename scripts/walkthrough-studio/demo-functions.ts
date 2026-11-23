// Fail closed: recording cannot create accounts, send invitations or call real APIs.
const forbidden = async () => {
  throw new Error("Recording only — no live account changes are allowed.");
};
export const loadSchoolPortal = forbidden;
// Acknowledge local React-state edits only. No network or real persistence.
export const saveSchoolPortal = async ({ data }: { data: { revision: number } }) =>
  data.revision + 1;
export const inviteSchoolAccount = forbidden;
export const createPhoneLogin = forbidden;
export const resetPhonePin = forbidden;
export const removeSchoolAccount = forbidden;
export const listPortalLogins = async () => [];
