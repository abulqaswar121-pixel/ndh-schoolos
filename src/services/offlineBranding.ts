type Branding = { schoolId: string; name: string; logoUrl?: string; motto: string; slug: string | null };
const KEY = "ndh-public-school-branding:";
export function rememberSchoolBranding(branding: Branding): void {
  try {
    localStorage.setItem(KEY + branding.schoolId, JSON.stringify(branding));
    if (branding.slug) localStorage.setItem(KEY + branding.slug, JSON.stringify(branding));
  } catch { /* Public branding can be fetched again online. */ }
}
export function offlineBranding(id: string): Branding | null {
  try { const raw = localStorage.getItem(KEY + id); return raw ? JSON.parse(raw) as Branding : null; }
  catch { return null; }
}