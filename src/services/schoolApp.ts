export const RESERVED_SCHOOL_LINKS = new Set(["app", "login", "admin", "platform", "api", "www", "schoolos", "ndh"]);
export function normalizeSchoolSlug(value: string): string { return value.trim().toLowerCase(); }
export function validSchoolSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(value) && !RESERVED_SCHOOL_LINKS.has(value);
}
export function schoolManifest(school: { schoolId: string; name: string }) {
  const base = `/api/public/school-app/${school.schoolId}`;
  return {
    id: `/s/${school.schoolId}`, name: school.name, short_name: school.name,
    start_url: `/s/${school.schoolId}`, scope: "/", display: "standalone", orientation: "any",
    theme_color: "#0c2340", background_color: "#f5f6f8",
    icons: [192, 512].map(size => ({ src: `${base}?icon=${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
  };
}
export function refuseOfflineWorker(hostname: string, production: boolean, framed: boolean, query: string): boolean {
  const host = hostname.toLowerCase();
  const labels = host.split(".");
  const label = labels[0] || "";
  const lovableDomain = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host);
  return !production || framed || new URLSearchParams(query).get("sw") === "off" ||
    (lovableDomain && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label))) ||
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(host);
}