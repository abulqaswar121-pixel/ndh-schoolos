// @vitest-environment node
import { createHash } from "node:crypto";
import { WALKTHROUGH_V5 } from "@/data/walkthroughVideosV5";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Scene {
  id: string;
  title: string;
  durationSec: number;
  features: string[];
  onScreen: string;
  narration: string;
  actions: string[];
  verification: string;
}
interface RoleScript {
  roleId: string;
  title: string;
  scenes: Scene[];
}
const base = "docs/walkthroughs/v5/";
const read = (name: string) => readFileSync(base + name, "utf8");
const pack = JSON.parse(read("source.json")) as {
  version: number;
  status: string;
  features: Record<string, string>;
  roles: RoleScript[];
};
const normalize = (text: string) => text.replace(/\s+/gu, " ").trim();
function milliseconds(timestamp: string) {
  const [h = 0, m = 0, s = 0, ms = 0] = timestamp.split(/[:,.]/u).map(Number);
  return ((h * 60 + m) * 60 + s) * 1000 + ms;
}
function captions(text: string) {
  return text
    .trim()
    .split(/\n\n+/u)
    .filter((block) => block.includes(" --> "))
    .map((block) => {
      const [id = "", interval = "", ...lines] = block.split("\n");
      const [start = "", end = ""] = interval.split(" --> ");
      expect(start).toMatch(/^\d{2}:\d{2}:\d{2}[.,]\d{3}$/u);
      expect(end).toMatch(/^\d{2}:\d{2}:\d{2}[.,]\d{3}$/u);
      return { id, start: milliseconds(start), end: milliseconds(end), lines };
    });
}

describe("version 5 role walkthrough editing assets", () => {
  it("covers the existing seven roles and all eight requested upgrades", () => {
    const playerRoles = WALKTHROUGH_V5.map((role) => role.roleId);
    expect(pack.version).toBe(5);
    expect(pack.status).toBe("narrated-illustrated-release");
    expect(pack.roles.map((role) => role.roleId)).toEqual(playerRoles);
    expect(Object.keys(pack.features)).toHaveLength(8);
    expect(
      new Set(pack.roles.flatMap((role) => role.scenes.flatMap((scene) => scene.features))),
    ).toEqual(new Set(Object.keys(pack.features)));
    for (const role of pack.roles) {
      const coverage = new Set(role.scenes.flatMap((scene) => scene.features));
      for (const shared of ["school_branding", "phone_pin", "school_app", "offline_sync"])
        expect(coverage.has(shared)).toBe(true);
      expect(new Set(role.scenes.map((scene) => scene.id)).size).toBe(role.scenes.length);
      for (const scene of role.scenes) {
        expect(scene.actions.length).toBeGreaterThan(0);
        expect(scene.onScreen.length).toBeGreaterThan(10);
        expect(scene.verification.length).toBeGreaterThan(20);
      }
    }
    expect(new Set(pack.roles[0]!.scenes.flatMap((scene) => scene.features))).toEqual(
      new Set(Object.keys(pack.features)),
    );
    const bursar = pack.roles.find((role) => role.roleId === "bursar")!;
    expect(bursar.scenes.map((scene) => scene.narration).join(" ")).toMatch(
      /nannies, security guards, cleaners, drivers and cooks/iu,
    );
    const teacher = pack.roles.find((role) => role.roleId === "class_teacher")!;
    expect(teacher.scenes.map((scene) => scene.narration).join(" ")).toMatch(/Mumtaz or Jayyid/u);
    expect(teacher.scenes.map((scene) => scene.narration).join(" ")).toMatch(
      /My Class and My Subjects/u,
    );
  });

  it.each(pack.roles)(
    "keeps $roleId captions complete, legible and matched across VTT/SRT",
    (role) => {
      const vttText = read(`${role.roleId}.en.vtt`);
      expect(vttText).toMatch(/^WEBVTT\n/u);
      expect(vttText).toContain("matching v5 MP4");
      const vtt = captions(vttText);
      const srt = captions(read(`${role.roleId}.en.srt`));
      expect(vtt.length).toBeGreaterThan(role.scenes.length);
      expect(srt.map(({ start, end, lines }) => ({ start, end, lines }))).toEqual(
        vtt.map(({ start, end, lines }) => ({ start, end, lines })),
      );
      expect(srt.map((cue) => cue.id)).toEqual(srt.map((_, index) => String(index + 1)));
      expect(normalize(vtt.flatMap((cue) => cue.lines).join(" "))).toBe(
        normalize(role.scenes.map((scene) => scene.narration).join(" ")),
      );
      const duration = role.scenes.reduce((sum, scene) => sum + scene.durationSec, 0) * 1000;
      for (let i = 0; i < vtt.length; i++) {
        const cue = vtt[i]!;
        expect(cue.start).toBeGreaterThanOrEqual(i ? vtt[i - 1]!.end : 0);
        expect(cue.end).toBeLessThanOrEqual(duration);
        expect(cue.end - cue.start).toBeGreaterThanOrEqual(1000);
        expect(cue.end - cue.start).toBeLessThanOrEqual(7000);
        expect(cue.lines.length).toBeLessThanOrEqual(2);
        for (const line of cue.lines) expect(line.length).toBeLessThanOrEqual(42);
        expect(
          normalize(cue.lines.join(" ")).length / ((cue.end - cue.start) / 1000),
        ).toBeLessThanOrEqual(22);
      }
      for (const suffix of ["narration.md", "scenes.md"]) {
        const guide = read(`${role.roleId}.${suffix}`);
        expect(guide).toContain("Narrated illustrated release");
        expect(guide).toContain("not private-school screen recordings");
        for (const scene of role.scenes) expect(guide).toContain(scene.narration);
      }
    },
  );

  it("keeps measured chapters contiguous and matched to the live playlist", () => {
    const plan = JSON.parse(read("chapters.json")) as {
      status: string;
      roles: {
        roleId: string;
        durationSec: number;
        chapters: { startSec: number; endSec: number; id: string }[];
      }[];
    };
    expect(plan.status).toBe("narrated-illustrated-release");
    for (const [index, role] of plan.roles.entries()) {
      const source = pack.roles[index]!;
      expect(role.roleId).toBe(source.roleId);
      let end = 0;
      for (const [sceneIndex, chapter] of role.chapters.entries()) {
        expect(chapter.startSec).toBe(end);
        expect(chapter.id).toBe(source.scenes[sceneIndex]!.id);
        expect(chapter.endSec - chapter.startSec).toBeCloseTo(
          source.scenes[sceneIndex]!.durationSec,
          3,
        );
        end = chapter.endSec;
      }
      expect(role.durationSec).toBe(end);
    }
    const readme = read("README.md");
    expect(readme).toContain("playable version 5 MP4s");
    expect(readme).toContain("not recordings of a live/private school account");
    expect(readme).toContain("first sign in online");
    expect(readme).toContain("Conflicts require review");
    expect(readme).toContain("Parents receive published results only");
  });

  it.each(WALKTHROUGH_V5)(
    "ships matching playable media, captions and posters for $roleId",
    (video) => {
      const manifest = JSON.parse(read("media-manifest.json")) as {
        roles: {
          roleId: string;
          durationSec: number;
          fullDecodeVerified: boolean;
          videoCodec: string;
          audioCodec: string;
          files: Record<string, { bytes: number; sha256: string }>;
        }[];
      };
      const media = manifest.roles.find((role) => role.roleId === video.roleId)!;
      expect(media.fullDecodeVerified).toBe(true);
      expect(media.videoCodec).toBe("h264");
      expect(media.audioCodec).toBe("aac");
      expect(media.durationSec).toBe(video.durationSec);
      for (const [name, expected] of Object.entries(media.files)) {
        const data = readFileSync(`public${name}`);
        expect(data.length).toBe(expected.bytes);
        expect(createHash("sha256").update(data).digest("hex")).toBe(expected.sha256);
      }
      const mp4 = readFileSync(`public${video.videoSrc}`);
      expect(mp4.subarray(4, 8).toString()).toBe("ftyp");
      expect(mp4.indexOf("moov")).toBeGreaterThan(0);
      expect(mp4.indexOf("moov")).toBeLessThan(mp4.indexOf("mdat"));
      const poster = readFileSync(`public${video.posterSrc}`);
      expect(poster.subarray(0, 2).toString("hex")).toBe("ffd8");
      const external = captions(readFileSync(`public${video.captionsSrc}`, "utf8"));
      expect(external).toEqual(captions(read(`${video.roleId}.en.vtt`)));
      const source = pack.roles.find((role) => role.roleId === video.roleId)!;
      expect(video.chapters.map((chapter) => chapter.id)).toEqual(
        source.scenes.map((scene) => scene.id),
      );
    },
  );

  it("regenerates deterministically and checks without writing any editing assets", () => {
    const before = readdirSync(base).map((name) => ({
      name,
      text: read(name),
      mtime: statSync(base + name).mtimeMs,
    }));
    const result = execFileSync(process.execPath, ["scripts/export-walkthroughs.mjs", "--check"], {
      encoding: "utf8",
    });
    expect(result).toContain("Verified 7 walkthroughs; 57 scenes");
    for (const file of before) {
      expect(read(file.name)).toBe(file.text);
      expect(statSync(base + file.name).mtimeMs).toBe(file.mtime);
    }
  });
});
