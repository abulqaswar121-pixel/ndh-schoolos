// Recording-only SPA. This config is NEVER imported by the website build.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
export default defineConfig({
  root: here,
  publicDir: path.join(root, "public"),
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/cloudSchoolRepository", replacement: path.join(here, "demo-cloud.ts") },
      { find: /^.*schoolPortal\.functions$/, replacement: path.join(here, "demo-functions.ts") },
      { find: "@/integrations/supabase/client", replacement: path.join(here, "demo-supabase.ts") },
      { find: "@tanstack/react-start", replacement: path.join(here, "server-function-shim.ts") },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  server: { host: "0.0.0.0", port: 8081, allowedHosts: true, fs: { allow: [root] } },
  build: { outDir: path.join(root, ".cache/walkthrough-studio"), emptyOutDir: true },
});
