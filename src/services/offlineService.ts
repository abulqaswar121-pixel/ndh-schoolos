import { useEffect, useState } from "react";
import { refuseOfflineWorker } from "./schoolApp";

export interface OfflineStatusSummary {
  isOnline: boolean;
  swReady: boolean;
  cachedItemCount: number;
  storageUsedKb: number;
  storageQuotaMb: number;
  lastOfflineWarmAt: string | null;
}

const OFFLINE_WARM_TS_KEY = "ndh_schoolos_offline_warmed_at";

export async function registerOfflineServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Skip inside automated jsdom test environment
  if (navigator.userAgent.toLowerCase().includes("jsdom")) return;

  const refused = refuseOfflineWorker(window.location.hostname, import.meta.env.PROD, window.self !== window.top, window.location.search);
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (refused) {
    await Promise.all(registrations.filter(registration => [registration.active, registration.waiting, registration.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js")).map(registration => registration.unregister()));
    if ("caches" in window) for (const key of await caches.keys()) if (key.startsWith("ndh-schoolos-") || (key.startsWith("workbox-precache-") && key.endsWith(`${window.location.origin}/`))) await caches.delete(key);
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    void registration.update();
    // Retire only the old hand-written app cache; leave messaging workers and other caches alone.
    if ("caches" in window) await caches.delete("ndh-schoolos-offline-v6");
  } catch { /* Unsupported browser or offline first visit. */ }
}

export async function warmAllPortalModulesAndRoutes(
  preloadImports?: () => Promise<unknown>
): Promise<{ ok: boolean; cachedCount: number }> {
  if (typeof window === "undefined") {
    return { ok: false, cachedCount: 0 };
  }

  try {
    if (preloadImports) {
      await preloadImports();
    }

    // The generated worker owns caches. Never manually cache dev HTML or authenticated responses.
    if (!refuseOfflineWorker(window.location.hostname, import.meta.env.PROD, window.self !== window.top, window.location.search)) {
      await Promise.allSettled([window.location.pathname, "/app"].map(path => fetch(path, { headers: { Accept: "text/html" } })));
    }

    const nowIso = new Date().toISOString();
    try {
      window.localStorage.setItem(OFFLINE_WARM_TS_KEY, nowIso);
    } catch {
      // Ignore storage quota warnings
    }

    const stats = await inspectOfflineCacheStats();
    return { ok: true, cachedCount: stats.cachedItemCount };
  } catch {
    return { ok: false, cachedCount: 0 };
  }
}

export async function inspectOfflineCacheStats(): Promise<{
  swReady: boolean;
  cachedItemCount: number;
  storageUsedKb: number;
  storageQuotaMb: number;
  lastOfflineWarmAt: string | null;
}> {
  if (typeof window === "undefined") {
    return {
      swReady: false,
      cachedItemCount: 0,
      storageUsedKb: 0,
      storageQuotaMb: 0,
      lastOfflineWarmAt: null,
    };
  }

  let swReady = false;
  let cachedItemCount = 0;
  let storageUsedKb = 0;
  let storageQuotaMb = 0;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration("/");
      swReady = Boolean(reg?.active);
    }
  } catch {
    swReady = false;
  }

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      for (const k of keys) {
        if (k.startsWith("ndh-schoolos-") || k.startsWith("workbox-precache-")) {
          const c = await window.caches.open(k);
          const reqs = await c.keys();
          cachedItemCount += reqs.length;
        }
      }
    }
  } catch {
    cachedItemCount = 0;
  }

  try {
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      const est = await navigator.storage.estimate();
      storageUsedKb = Math.round((est.usage ?? 0) / 1024);
      storageQuotaMb = Math.round((est.quota ?? 0) / (1024 * 1024));
    } else {
      const raw = window.localStorage.getItem("ndh_schoolos_live_v3") ?? "";
      storageUsedKb = Math.max(1, Math.round((raw.length * 2) / 1024));
    }
  } catch {
    storageUsedKb = 0;
  }

  let lastOfflineWarmAt: string | null = null;
  try {
    lastOfflineWarmAt = window.localStorage.getItem(OFFLINE_WARM_TS_KEY);
  } catch {
    lastOfflineWarmAt = null;
  }

  return {
    swReady,
    cachedItemCount,
    storageUsedKb,
    storageQuotaMb,
    lastOfflineWarmAt,
  };
}

export function useOfflineStatus(): OfflineStatusSummary {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState<{
    swReady: boolean;
    cachedItemCount: number;
    storageUsedKb: number;
    storageQuotaMb: number;
    lastOfflineWarmAt: string | null;
  }>({
    swReady: false,
    cachedItemCount: 0,
    storageUsedKb: 0,
    storageQuotaMb: 0,
    lastOfflineWarmAt: null,
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    void inspectOfflineCacheStats().then(setStats);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return {
    isOnline,
    ...stats,
  };
}
