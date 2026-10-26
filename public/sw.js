/* NDH SchoolOS — Offline-First Minimal-Data Service Worker */
const CACHE_NAME = "ndh-schoolos-offline-v3";
const SHELL_URLS = [
  "/",
  "/app",
  "/login",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/images/ndh-logo-gateway-cropped.png",
  "/images/ndh-ai-assistant.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          SHELL_URLS.map((url) =>
            fetch(url, { credentials: "same-origin" }).then((res) => {
              if (res && res.ok) {
                return cache.put(url, res.clone());
              }
              return undefined;
            })
          )
        )
      )
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ndh-schoolos-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "PRECACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const url of data.urls) {
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res && res.ok) {
              await cache.put(url, res.clone());
            }
          } catch {
            // Ignore offline errors while warming cache
          }
        }
        if (event.source && "postMessage" in event.source) {
          event.source.postMessage({ type: "PRECACHE_COMPLETE" });
        }
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept range video streams or cross-origin analytics — saves mobile data
  if (
    req.headers.has("range") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".webm")
  ) {
    return;
  }

  // Only cache same-origin assets + Google Fonts stylesheets/woff2
  const isSameOrigin = url.origin === self.location.origin;
  const isFontAsset =
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com";

  if (!isSameOrigin && !isFontAsset) {
    return;
  }

  // Ignore Vite HMR websocket/ping endpoints in dev
  if (url.pathname.startsWith("/@vite") || url.search.includes("t=")) {
    return;
  }

  // 1. HTML Page Navigations: Fast network attempt (2.5s timeout) -> Cached page or /app shell fallback
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const networkRes = await fetch(req, { signal: controller.signal });
          clearTimeout(timer);
          if (networkRes && networkRes.ok) {
            await cache.put(url.pathname, networkRes.clone());
            return networkRes;
          }
        } catch {
          // Offline or slow connection: serve instantaneously from cache
        }

        const exactMatch =
          (await cache.match(req)) || (await cache.match(url.pathname));
        if (exactMatch) return exactMatch;

        const fallbackShell =
          (await cache.match("/app")) || (await cache.match("/"));
        if (fallbackShell) return fallbackShell;

        return new Response(
          "<!doctype html><html><head><meta charset='utf-8'><title>NDH SchoolOS Offline</title></head><body style='font-family:sans-serif;padding:2rem'><h1>NDH SchoolOS — Offline</h1><p>Please open the app once with data enabled to save offline assets, then reload.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })()
    );
    return;
  }

  // 2. Hashed Build Assets (/assets/*), Icons & Fonts: Cache-First (0 KB mobile data after first load!)
  const isImmutableAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/images/ndh-logo") ||
    url.pathname.startsWith("/images/ndh-ai-assistant") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest" ||
    isFontAsset;

  if (isImmutableAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            await cache.put(req, res.clone());
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 3. Other Same-Origin Scripts, Styles & Images: Stale-While-Revalidate (instant offline + low data)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            void cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached);

      return cached || (await fetchPromise) || Response.error();
    })
  );
});
