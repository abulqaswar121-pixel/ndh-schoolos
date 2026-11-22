import { createFileRoute } from "@tanstack/react-router";
import { getPublicSchoolBranding } from "@/services/publicSchoolBranding.functions";
import { schoolManifest } from "@/services/schoolApp";

export const Route = createFileRoute("/api/public/school-app/$schoolId")({
  server: { handlers: { GET: async ({ params, request }) => {
    // Public branding only. This endpoint never reads school workspaces or user records.
    const school = await getPublicSchoolBranding({ data: params });
    const icon = new URL(request.url).searchParams.get("icon");
    const headers = { "Cache-Control": "public, max-age=0, must-revalidate" };
    if (icon === "192" || icon === "512") {
      const { decode, encode } = await import("fast-png");
      const size = Number(icon);
      const pixels = new Uint8Array(size * size * 4).fill(255);
      if (school.logoUrl && /^data:image\/(png|jpeg);base64,/.test(school.logoUrl)) {
        try {
          const input = Uint8Array.from(atob(school.logoUrl.split(",")[1] || ""), c => c.charCodeAt(0));
          const source = school.logoUrl.startsWith("data:image/png") ? decode(input) : { ...(await import("jpeg-js")).decode(input, { useTArray: true, maxResolutionInMP: 16 }), channels: 4 };
          const scale = Math.min(size * 0.9 / source.width, size * 0.9 / source.height);
          const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const from = (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * source.channels;
            const to = ((y + Math.floor((size - height) / 2)) * size + x + Math.floor((size - width) / 2)) * 4;
            const gray = source.channels <= 2;
            pixels[to] = Number(source.data[from] ?? 255);
            pixels[to + 1] = Number(source.data[from + (gray ? 0 : 1)] ?? 255);
            pixels[to + 2] = Number(source.data[from + (gray ? 0 : 2)] ?? 255);
            pixels[to + 3] = source.channels === 4 || source.channels === 2 ? Number(source.data[from + source.channels - 1] ?? 255) : 255;
          }
        } catch { return new Response("School logo could not be read. Upload a PNG or JPEG school logo.", { status: 422 }); }
      } else {
        // A school without a crest must not silently install the NDH family icon.
        return new Response("Upload a PNG or JPEG school logo before installing this school app.", { status: 422 });
      }
      const bytes = encode({ width: size, height: size, data: pixels, channels: 4 });
      return new Response(new Uint8Array(bytes).buffer, { headers: { ...headers, "Content-Type": "image/png" } });
    }
    return Response.json(schoolManifest(school), { headers: { ...headers, "Content-Type": "application/manifest+json" } });
  } } },
});