// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OWNER_SCREEN_TUTORIAL_V6 as media } from "@/data/ownerScreenTutorialV6";
const read = (path: string) => readFileSync(path, "utf8");
const source = JSON.parse(read("docs/walkthroughs/v6-owner/source.json"));
const manifest = JSON.parse(read("docs/walkthroughs/v6-owner/media-manifest.json"));
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const seconds = (s: string) => {
  const [h = 0, m = 0, sec = 0] = s.split(":").map(Number);
  return h * 3600 + m * 60 + sec;
};

describe("Owner approval sample: genuine phone and desktop screen captures", () => {
  it.each(["phone", "desktop"] as const)(
    "ships a distinct fast-start H264/AAC %s MP4 with correct dimensions",
    (variant) => {
      const bytes = readFileSync(`public${media.variants[variant].videoSrc}`);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
      expect(bytes.indexOf("moov")).toBeLessThan(bytes.indexOf("mdat"));
      const avc1 = bytes.indexOf("avc1", 64);
      expect(avc1).toBeGreaterThan(64);
      expect([bytes.readUInt16BE(avc1 + 28), bytes.readUInt16BE(avc1 + 30)]).toEqual(
        variant === "phone" ? [720, 1280] : [1280, 720],
      );
      expect(bytes.indexOf("mp4a")).toBeGreaterThan(64);
      const poster = readFileSync(`public${media.variants[variant].posterSrc}`);
      expect(poster.subarray(0, 2).toString("hex")).toBe("ffd8");
    },
  );
  it("checks all shipped media and the spoken-text/audio sources against release checksums", () => {
    expect(manifest.fullDecodeVerified).toBe(true);
    expect(manifest.durationSec).toBe(media.durationSec);
    expect(manifest.chapters).toEqual(media.chapters);
    expect(manifest.sourceSha256).toBe(hash(read("docs/walkthroughs/v6-owner/source.json")));
    for (const [path, expected] of Object.entries(manifest.files) as [
      string,
      { bytes: number; sha256: string },
    ][]) {
      const bytes = readFileSync(path);
      expect(bytes.length).toBe(expected.bytes);
      expect(hash(bytes)).toBe(expected.sha256);
    }
    for (const [name, expected] of Object.entries(source.audioSources))
      expect(hash(readFileSync(`public/videos/narration-v6-owner/${name}`))).toBe(expected);
    for (const scene of source.scenes) expect(hash(scene.narration)).toBe(scene.narrationSha256);
  });
  it("keeps nine common measured cuts and complete, readable English captions in sync", () => {
    expect(media.chapters).toHaveLength(9);
    expect(media.chapters[0].startSec).toBe(0);
    for (let i = 1; i < media.chapters.length; i++)
      expect(media.chapters[i]!.startSec).toBeGreaterThan(media.chapters[i - 1]!.startSec);
    const text = read(`public${media.captionsSrc}`);
    expect(text).toBe(read("docs/walkthroughs/v6-owner/admin.en.vtt"));
    const cues = text
      .trim()
      .split("\n\n")
      .slice(1)
      .map((block) => {
        const [id = "", timing = "", ...lines] = block.split("\n");
        const [start = "", end = ""] = timing.split(" --> ");
        return { id, start: seconds(start), end: seconds(end), lines };
      });
    const normalized = (s: string) => s.replace(/\s+/gu, " ").trim();
    expect(normalized(cues.flatMap((c) => c.lines).join(" "))).toBe(
      normalized(source.scenes.map((s: { narration: string }) => s.narration).join(" ")),
    );
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i]!;
      expect(c.start).toBeGreaterThanOrEqual(i ? cues[i - 1]!.end : 0);
      expect(c.end).toBeLessThanOrEqual(media.durationSec);
      const duration = c.end - c.start;
      expect(duration).toBeGreaterThanOrEqual(0.999);
      expect(duration).toBeLessThanOrEqual(7);
      expect(c.lines.length).toBeLessThanOrEqual(2);
      c.lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(42));
      expect(c.lines.join(" ").length / duration).toBeLessThanOrEqual(22.1);
    }
    const srt = read("public/videos/ndh-owner-screen-v6.en.srt");
    expect(srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/gu, "$1.$2")).toBe(
      text.replace("WEBVTT\n\n", ""),
    );
  });
  it("keeps recording-only demo adapters outside the production import tree and retains original videos", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() && entry.name !== "test"
          ? walk(`${dir}/${entry.name}`)
          : entry.isFile() && /\.tsx?$/u.test(entry.name)
            ? [`${dir}/${entry.name}`]
            : [],
      );
    for (const file of walk("src"))
      expect(read(file)).not.toMatch(
        /(?:from|import\()\s*["'][^"']*(?:walkthrough-studio|demo-cloud|demo-data)/u,
      );
    for (const role of [
      "admin",
      "exam-officer",
      "class-teacher",
      "subject-teacher",
      "bursar",
      "secretary",
      "parent",
    ]) {
      expect(readFileSync(`public/videos/ndh-walkthrough-${role}-v4.mp4`).length).toBeGreaterThan(
        100000,
      );
      expect(readFileSync(`public/videos/ndh-walkthrough-${role}-v5.mp4`).length).toBeGreaterThan(
        100000,
      );
    }
  });
});
