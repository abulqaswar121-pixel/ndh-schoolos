// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Fallback for published builds where the .env values were not provided at build time.
// These are the public (publishable) backend URL and key — safe to ship in the browser.
process.env["VITE_SUPABASE_URL"] ||= "https://yhsvivcoapsuifxsxqrz.supabase.co";
process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||= "sb_publishable_05WwstX-uUlpzKbAORp71Q_YYDZt0oU";
process.env["VITE_SUPABASE_PROJECT_ID"] ||= "yhsvivcoapsuifxsxqrz";

export default defineConfig({
  vite: {
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
