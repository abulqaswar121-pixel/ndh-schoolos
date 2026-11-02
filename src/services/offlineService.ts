import { useEffect, useState } from "react";

export interface OfflineStatusSummary {
  isOnline: boolean;
  swReady: boolean;
  cachedItemCount: number;
  storageUsedKb: number;
  storageQuotaMb: number;
  lastOfflineWarmAt: string | null;
}

const OFFLINE_WARM_TS_KEY = "ndh_schoolos_offline_warmed_at";

export function registerOfflineServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Skip inside automated jsdom test environment
  if (navigator.userAgent.toLowerCase().includes("jsdom")) return;

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Non-fatal in unsupported contexts
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
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

    const routesToWarm = [
      "/",
      "/app",
      "/login",
      "/features",
      "/for-schools",
      "/pricing",
      "/contact",
      "/manifest.webmanifest",
      "/images/ndh-logo-gateway-cropped.png",
      "/images/ndh-ai-assistant.png",
    ];

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "PRECACHE_URLS",
        urls: routesToWarm,
      });
    } else if ("caches" in window) {
      const cache = await window.caches.open("ndh-schoolos-offline-v3");
      await Promise.allSettled(
        routesToWarm.map(async (u) => {
          const res = await fetch(u, { credentials: "same-origin" });
          if (res.ok) await cache.put(u, res.clone());
        })
      );
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
        if (k.startsWith("ndh-schoolos-")) {
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
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
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
