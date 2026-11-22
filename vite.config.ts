// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Fallback for published builds where the .env values were not provided at build time.
// These are the public (publishable) backend URL and key — safe to ship in the browser.
process.env["VITE_SUPABASE_URL"] ||= "https://yhsvivcoapsuifxsxqrz.supabase.co";
process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||= "sb_publishable_05WwstX-uUlpzKbAORp71Q_YYDZt0oU";
process.env["VITE_SUPABASE_PROJECT_ID"] ||= "yhsvivcoapsuifxsxqrz";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW", filename: "sw.js", outDir: "dist/client", manifest: false,
      injectRegister: null, registerType: "autoUpdate", devOptions: { enabled: false },
      workbox: {
        globPatterns: ["assets/*.{js,css,woff,woff2}"], navigateFallback: null,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true,
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !/^\/(?:~oauth|api|auth|rest|functions)(?:\/|$)/.test(url.pathname), handler: "NetworkFirst", options: { cacheName: "ndh-schoolos-pages-v7", networkTimeoutSeconds: 4, expiration: { maxEntries: 40, maxAgeSeconds: 7 * 86400 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.*-[a-zA-Z0-9_-]+\.(js|css|woff2?)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "ndh-schoolos-assets-v7", expiration: { maxEntries: 250, maxAgeSeconds: 30 * 86400 } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /^\/api\/public\/school-app\//.test(url.pathname), handler: "NetworkFirst", options: { cacheName: "ndh-schoolos-branding-v7", cacheableResponse: { statuses: [200] } } },
        ],
      },
    })],
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
