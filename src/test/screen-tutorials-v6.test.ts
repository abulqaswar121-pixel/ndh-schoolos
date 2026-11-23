// @vitest-environment node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCREEN_TUTORIALS_V6 } from "@/data/screenTutorialsV6";
import { createRecordingDatabase } from "../../scripts/walkthrough-studio/demo-data";
import { getAuthorizedSnapshot } from "@/services/accessControl";

const read = (p: string) => readFileSync(p, "utf8");
const hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const normalize = (s: string) => s.replace(/\s+/gu, " ").trim();
const timestamp = (s: string) => {
  const [h = 0, m = 0, sec = 0] = s.split(":").map(Number);
  return h * 3600 + m * 60 + sec;
};
const release = JSON.parse(read("docs/walkthroughs/v6-roles/media-manifest.json"));

describe("seven complete responsive screen tutorials", () => {
  it("ships every original role with two independent sources, shared timing and release checksums", () => {
    expect(SCREEN_TUTORIALS_V6.map((r) => r.roleId)).toEqual([
      "admin",
      "exam_officer",
      "class_teacher",
      "subject_teacher",
      "bursar",
      "secretary",
      "parent",
    ]);
    expect(release.status).toBe("screen-tutorial-release");
    expect(release.roles).toHaveLength(7);
    expect(SCREEN_TUTORIALS_V6.reduce((n, r) => n + r.chapters.length, 0)).toBe(47);
    for (const role of release.roles) {
      expect(role.fullDecodeVerified).toBe(true);
      for (const [path, expected] of Object.entries(role.files) as [
        string,
        { bytes: number; sha256: string },
      ][]) {
        const bytes = readFileSync(path);
        expect(bytes.length).toBe(expected.bytes);
        expect(hash(bytes)).toBe(expected.sha256);
      }
    }
  });
  it.each(SCREEN_TUTORIALS_V6)(
    "keeps $roleId real phone/desktop MP4s, all spoken captions and common chapter cuts matched",
    (role) => {
      expect(role.variants.phone.videoSrc).not.toBe(role.variants.desktop.videoSrc);
      for (const view of ["phone", "desktop"] as const) {
        const b = readFileSync(`public${role.variants[view].videoSrc}`);
        expect(b.indexOf("moov")).toBeLessThan(b.indexOf("mdat"));
        const avc = b.indexOf("avc1", 64);
        expect(avc).toBeGreaterThan(64);
        expect([b.readUInt16BE(avc + 28), b.readUInt16BE(avc + 30)]).toEqual(
          view === "phone" ? [720, 1280] : [1280, 720],
        );
        expect(b.indexOf("mp4a")).toBeGreaterThan(64);
      }
      const docs =
        role.roleId === "admin"
          ? "docs/walkthroughs/v6-owner"
          : `docs/walkthroughs/v6-roles/${role.roleId}`;
      const source = JSON.parse(read(`${docs}/source.json`));
      const text = read(`public${role.captionsSrc}`);
      expect(text).toBe(read(`${docs}/admin.en.vtt`));
      const cues = text
        .trim()
        .split("\n\n")
        .slice(1)
        .map((b) => {
          const [, range = "", ...lines] = b.split("\n");
          const [a = "", z = ""] = range.split(" --> ");
          return { start: timestamp(a), end: timestamp(z), lines };
        });
      expect(normalize(cues.flatMap((c) => c.lines).join(" "))).toBe(
        normalize(source.scenes.map((s: { narration: string }) => s.narration).join(" ")),
      );
      for (let i = 0; i < cues.length; i++) {
        const c = cues[i]!;
        const duration = c.end - c.start;
        expect(c.start).toBeGreaterThanOrEqual(i ? cues[i - 1]!.end : 0);
        expect(c.end).toBeLessThanOrEqual(role.durationSec);
        expect(duration).toBeGreaterThanOrEqual(0.999);
        expect(duration).toBeLessThanOrEqual(7);
        expect(c.lines.length).toBeLessThanOrEqual(2);
        c.lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(42));
        expect(c.lines.join(" ").length / duration).toBeLessThanOrEqual(22.1);
      }
      if (role.roleId !== "admin") {
        expect(hash(readFileSync(`public${source.audioSource}`))).toBe(source.audioSha256);
        expect(
          hash(source.scenes.map((s: { narration: string }) => s.narration).join("\n\n")),
        ).toBe(source.narrationSha256);
      }
      expect(role.chapters.length).toBe(source.scenes.length);
      expect(role.chapters[0].startSec).toBe(0);
      expect(read(`${docs}/chapters.json`)).toBe(JSON.stringify(role.chapters, null, 2) + "\n");
    },
  );
  it("uses real data-layer scoping for fictional recording records and keeps Tahfeez optional", () => {
    const db = createRecordingDatabase();
    expect(db.settings.enableQuranModule).toBe(false);
    expect(createRecordingDatabase(true).settings.enableQuranModule).toBe(true);
    const parent = getAuthorizedSnapshot(db, {
      role: "parent",
      isAuthenticated: true,
      schoolCode: "DEMO",
      displayName: "Demo Guardian",
      subtitle: "Recording only",
      parentPhone: "00000000000",
    });
    expect(parent.students.map((s) => s.fullName)).toEqual(["Demo Learner A", "Demo Learner B"]);
    expect(parent.students.some((s) => s.fullName === "Demo Learner C")).toBe(false);
    expect(parent.payroll).toHaveLength(0);
    const teacher = getAuthorizedSnapshot(db, {
      role: "subject_teacher",
      isAuthenticated: true,
      schoolCode: "DEMO",
      staffId: "demo-subject",
      displayName: "Demo Subject Teacher",
      subtitle: "Recording only",
    });
    expect(teacher.subjects.map((s) => s.id)).toEqual([db.subjects[0]!.id]);
    expect(teacher.payroll).toHaveLength(0);
    expect(teacher.payments).toHaveLength(0);
  });
  it("regenerates playlist registration and manifests deterministically without writing in check mode", () => {
    expect(
      execFileSync(process.execPath, ["scripts/walkthrough-studio/export-player.mjs", "--check"], {
        encoding: "utf8",
      }),
    ).toContain(
      "Verified 7 role screen tutorials; 14 independent phone/desktop MP4s; 47 common chapter cuts",
    );
  });
});
