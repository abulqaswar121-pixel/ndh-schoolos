import { mirrorDatabaseToIndexedDB } from "./backupExportService";
import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import type { SchoolDatabaseSnapshot } from "@/types/school";

const STORAGE_KEY = "ndh_schoolos_live_v3";
const TENANT_REGISTRY_KEY = "ndh_schoolos_tenants_v3";
const TENANT_KEY_PREFIX = "ndh_schoolos_tenant__";
const CURRENT_SCHEMA_VERSION = 3;

export interface RegisteredSchoolTenant {
  code: string;
  name: string;
  updatedAt: string;
}

export function normalizeSchoolCodeKey(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function isValidSnapshot(
  parsed: Partial<SchoolDatabaseSnapshot> | null | undefined
): parsed is SchoolDatabaseSnapshot {
  return Boolean(
    parsed &&
      parsed.version === CURRENT_SCHEMA_VERSION &&
      parsed.settings &&
      Array.isArray(parsed.students) &&
      Array.isArray(parsed.classes) &&
      Array.isArray(parsed.subjects)
  );
}

export interface ISchoolRepository {
  loadSnapshot: () => SchoolDatabaseSnapshot;
  saveSnapshot: (snapshot: SchoolDatabaseSnapshot) => void;
  resetToSeed: () => SchoolDatabaseSnapshot;
  loadTenantByCode: (schoolCode: string) => SchoolDatabaseSnapshot | null;
  listRegisteredSchools: () => RegisteredSchoolTenant[];
}

class LocalStorageSchoolRepository implements ISchoolRepository {
  loadSnapshot(): SchoolDatabaseSnapshot {
    if (typeof window === "undefined") {
      return createSeedDatabase();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createSeedDatabase();
        this.saveSnapshot(fresh);
        return fresh;
      }

      const parsed = JSON.parse(raw) as Partial<SchoolDatabaseSnapshot>;
      if (!isValidSnapshot(parsed)) {
        const fresh = createSeedDatabase();
        this.saveSnapshot(fresh);
        return fresh;
      }

      return parsed;
    } catch {
      const fallback = createSeedDatabase();
      this.saveSnapshot(fallback);
      return fallback;
    }
  }

  saveSnapshot(snapshot: SchoolDatabaseSnapshot): void {
    if (typeof window === "undefined") return;
    try {
      const serialized = JSON.stringify(snapshot);
      window.localStorage.setItem(STORAGE_KEY, serialized);

      // Isolate each registered school workspace in its own tenant slot by School Code
      const normCode = normalizeSchoolCodeKey(snapshot.settings.code || "");
      if (snapshot.settings.setupCompleted && normCode.length >= 2) {
        window.localStorage.setItem(
          `${TENANT_KEY_PREFIX}${normCode}`,
          serialized
        );
        const existing = this.listRegisteredSchools().filter(
          (t) => normalizeSchoolCodeKey(t.code) !== normCode
        );
        const updated: RegisteredSchoolTenant[] = [
          {
            code: normCode,
            name: snapshot.settings.name,
            updatedAt: new Date().toISOString(),
          },
          ...existing,
        ].slice(0, 25);
        window.localStorage.setItem(
          TENANT_REGISTRY_KEY,
          JSON.stringify(updated)
        );
      }
    } catch (error) {
      console.error("[NDH SchoolOS] Failed to save school snapshot:", error);
    }
    void mirrorDatabaseToIndexedDB(snapshot);
  }

  loadTenantByCode(schoolCode: string): SchoolDatabaseSnapshot | null {
    if (typeof window === "undefined") return null;
    const normCode = normalizeSchoolCodeKey(schoolCode);
    if (!normCode) return null;

    try {
      const tenantRaw = window.localStorage.getItem(
        `${TENANT_KEY_PREFIX}${normCode}`
      );
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw) as Partial<SchoolDatabaseSnapshot>;
        if (isValidSnapshot(parsed)) {
          return parsed;
        }
      }

      // Fallback check on active slot if its code matches
      const activeRaw = window.localStorage.getItem(STORAGE_KEY);
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw) as Partial<SchoolDatabaseSnapshot>;
        if (
          isValidSnapshot(parsed) &&
          normalizeSchoolCodeKey(parsed.settings.code) === normCode
        ) {
          return parsed;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  listRegisteredSchools(): RegisteredSchoolTenant[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(TENANT_REGISTRY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is RegisteredSchoolTenant =>
          Boolean(
            item &&
              typeof item.code === "string" &&
              typeof item.name === "string"
          )
      );
    } catch {
      return [];
    }
  }

  resetToSeed(): SchoolDatabaseSnapshot {
    const fresh = createSeedDatabase();
    this.saveSnapshot(fresh);
    return fresh;
  }
}

export const schoolRepository: ISchoolRepository =
  new LocalStorageSchoolRepository();
