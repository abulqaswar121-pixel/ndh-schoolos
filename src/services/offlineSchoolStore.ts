import type { ActivePortalSession, SchoolDatabaseSnapshot } from "@/types/school";
import type { CloudSchool } from "./cloudSchoolRepository";

export interface OfflineSchoolCopy {
  userId: string;
  school: CloudSchool;
  portal: ActivePortalSession;
  revision: number;
  baseline: SchoolDatabaseSnapshot;
  pending: SchoolDatabaseSnapshot | null;
  savedAt: number;
}
const PREFIX = "ndh-offline-school:";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function saveOfflineSchool(copy: OfflineSchoolCopy, storage: Storage = window.localStorage): void {
  // No tokens, passwords or PINs belong in this record. Server checks still authorize every upload.
  storage.setItem(`${PREFIX}${copy.userId}:${copy.school.id}`, JSON.stringify(copy));
  storage.setItem(`${PREFIX}${copy.userId}:last`, copy.school.id);
}
export function readOfflineSchool(userId: string, schoolId?: string, storage: Storage = window.localStorage, now = Date.now()): OfflineSchoolCopy | null {
  try {
    const id = schoolId || storage.getItem(`${PREFIX}${userId}:last`);
    if (!id) return null;
    const raw = storage.getItem(`${PREFIX}${userId}:${id}`);
    if (!raw) return null;
    const copy = JSON.parse(raw) as OfflineSchoolCopy;
    if (copy.userId !== userId || copy.school.id !== id || now - copy.savedAt > MAX_AGE || !copy.portal.isAuthenticated) return null;
    return copy;
  } catch { return null; }
}
export function clearOfflineSchools(userId: string, storage: Storage = window.localStorage): void {
  for (const key of Object.keys(storage)) if (key.startsWith(`${PREFIX}${userId}:`)) storage.removeItem(key);
}
export function sameOfflineScope(a: ActivePortalSession, b: ActivePortalSession, previous?: SchoolDatabaseSnapshot, current?: SchoolDatabaseSnapshot): boolean {
  const identity = a.role === b.role && a.staffId === b.staffId && JSON.stringify(a.parentStudentIds || []) === JSON.stringify(b.parentStudentIds || []);
  if (!identity || !previous || !current || a.role === "admin") return identity;
  const assignments = (snapshot: SchoolDatabaseSnapshot) => {
    const staff = snapshot.staff.find(person => person.id === a.staffId);
    return [staff?.assignedClassIds, staff?.assignedSubjectIds, staff?.status, staff?.isExamOfficer, snapshot.settings.enableQuranModule];
  };
  return JSON.stringify(assignments(previous)) === JSON.stringify(assignments(current));
}