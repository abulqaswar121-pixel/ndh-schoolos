import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import type { SchoolDatabaseSnapshot } from "@/types/school";

const STORAGE_KEY = "ndh_schoolos_live_v3";
const CURRENT_SCHEMA_VERSION = 3;

export interface ISchoolRepository {
  loadSnapshot: () => SchoolDatabaseSnapshot;
  saveSnapshot: (snapshot: SchoolDatabaseSnapshot) => void;
  resetToSeed: () => SchoolDatabaseSnapshot;
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
      if (
        !parsed ||
        parsed.version !== CURRENT_SCHEMA_VERSION ||
        !parsed.settings ||
        !Array.isArray(parsed.students) ||
        !Array.isArray(parsed.classes) ||
        !Array.isArray(parsed.subjects)
      ) {
        const fresh = createSeedDatabase();
        this.saveSnapshot(fresh);
        return fresh;
      }

      return parsed as SchoolDatabaseSnapshot;
    } catch {
      const fallback = createSeedDatabase();
      this.saveSnapshot(fallback);
      return fallback;
    }
  }

  saveSnapshot(snapshot: SchoolDatabaseSnapshot): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error("[NDH SchoolOS] Failed to save school snapshot:", error);
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
