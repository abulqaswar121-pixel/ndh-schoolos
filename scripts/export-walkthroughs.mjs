#!/usr/bin/env node
/** Generate editing assets only. Never rewrites or relabels a deployed MP4. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = path.join(root, "docs/walkthroughs/v5");
const pack = JSON.parse(readFileSync(path.join(dir, "source.json"), "utf8"));
const check = process.argv.includes("--check");
if (process.argv.slice(2).some((argument) => argument !== "--check")) {
  throw new Error("Usage: node scripts/export-walkthroughs.mjs [--check]");
}
const expectedRoles = [
  "admin",
  "exam_officer",
  "class_teacher",
  "subject_teacher",
  "bursar",
  "secretary",
  "parent",
];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const normalize = (text) => text.replace(/\s+/gu, " ").trim();
const pad = (n, length = 2) => String(n).padStart(length, "0");
const clock = (ms, separator = ".") => {
  const seconds = Math.floor(ms / 1000);
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}${separator}${pad(ms % 1000, 3)}`;
};
const shortClock = (seconds) =>
  `${Math.floor(Math.ceil(seconds) / 60)}:${pad(Math.ceil(seconds) % 60)}`;
const output = (name, text) => {
  const target = path.join(dir, name);
  if (check) {
    assert(
      readFileSync(target, "utf8") === text,
      `${name} is out of date. Run node scripts/export-walkthroughs.mjs`,
    );
  } else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
};

/** Two lines at most, 42 characters per line; preserve every narration word. */
function captionBlocks(text) {
  const blocks = [];
  for (const sentence of normalize(text).split(/(?<=[.!?])\s+/u)) {
    const sentenceBlocks = [];
    let lines = [""];
    for (const word of sentence.split(" ")) {
      assert(word.length <= 42, `Caption word too long: ${word}`);
      const last = lines.length - 1;
      if ((lines[last] ? `${lines[last]} ${word}` : word).length <= 42) {
        lines[last] = lines[last] ? `${lines[last]} ${word}` : word;
      } else if (lines.length === 1) {
        lines.push(word);
      } else {
        sentenceBlocks.push(lines.join("\n"));
        lines = [word];
      }
    }
    sentenceBlocks.push(lines.join("\n"));
    // Avoid orphan endings such as a single final “school.” caption.
    if (sentenceBlocks.length > 1 && normalize(sentenceBlocks.at(-1)).length < 20) {
      const words = normalize(sentenceBlocks.slice(-2).join(" ")).split(" ");
      const half = Math.ceil(words.length / 2);
      const balanced = [words.slice(0, half), words.slice(half)].map((part) => {
        const wrapped = [""];
        for (const word of part) {
          const last = wrapped.length - 1;
          const next = wrapped[last] ? `${wrapped[last]} ${word}` : word;
          if (next.length <= 42) wrapped[last] = next;
          else wrapped.push(word);
        }
        return wrapped;
      });
      if (balanced.every((part) => part.length <= 2)) {
        sentenceBlocks.splice(-2, 2, ...balanced.map((part) => part.join("\n")));
      }
    }
    blocks.push(...sentenceBlocks);
  }
  return blocks;
}

assert(
  pack.version === 5 && pack.status === "narrated-illustrated-release",
  "Expected version 5 narrated illustrated release sources.",
);
assert(
  JSON.stringify(pack.roles.map((r) => r.roleId)) === JSON.stringify(expectedRoles),
  "The seven role IDs/order must match the existing player.",
);
const chapters = { version: 5, status: pack.status, timingBasis: pack.timingBasis, roles: [] };
const rows = [];
for (const role of pack.roles) {
  assert(role.scenes.length >= 6, `${role.roleId}: incomplete scene guide`);
  const spoken = role.scenes.map((scene) => scene.narration).join("\n\n");
  const sha = (data) => createHash("sha256").update(data).digest("hex");
  assert(
    sha(spoken) === role.narrationSha256,
    `${role.roleId}: narration changed; regenerate audio before release`,
  );
  assert(
    sha(readFileSync(path.join(root, "public", role.audioSource))) === role.audioSha256,
    `${role.roleId}: narration audio checksum changed`,
  );
  const ids = new Set();
  let elapsed = 0;
  const cues = [];
  const sceneGuide = [];
  const narration = [];
  const plannedChapters = [];
  for (const scene of role.scenes) {
    assert(!ids.has(scene.id), `${role.roleId}: duplicate scene ID ${scene.id}`);
    ids.add(scene.id);
    assert(
      Number.isFinite(scene.durationSec) && scene.durationSec >= 4,
      `${scene.id}: invalid duration`,
    );
    assert(
      scene.narration?.trim() &&
        scene.onScreen?.trim() &&
        scene.verification?.trim() &&
        scene.actions?.length,
      `${scene.id}: missing production instructions`,
    );
    assert(
      scene.features.every((feature) => Object.hasOwn(pack.features, feature)),
      `${scene.id}: unknown feature`,
    );
    const start = elapsed;
    const end = Number((start + scene.durationSec).toFixed(3));
    plannedChapters.push({ id: scene.id, label: scene.title, startSec: start, endSec: end });
    narration.push(
      `### ${shortClock(start)}–${shortClock(end)} · ${scene.title}\n\n${scene.narration}`,
    );
    sceneGuide.push(
      `## ${shortClock(start)}–${shortClock(end)} · ${scene.title}\n\n**On-screen callout:** ${scene.onScreen}\n\n**Future live-capture reference (the released video uses diagrams):**\n${scene.actions.map((action) => `- ${action}`).join("\n")}\n\n**Narration:** ${scene.narration}\n\n**Verify before sign-off:** ${scene.verification}\n\n**Feature tags:** ${scene.features.length ? scene.features.join(", ") : "Existing role workflow retained"}`,
    );
    const blocks = captionBlocks(scene.narration);
    const totalWeight = blocks.reduce((sum, block) => sum + normalize(block).length, 0);
    const available = Math.round((scene.speechEndSec - scene.speechStartSec) * 1000);
    const minimum = blocks.reduce(
      (sum, block) => sum + Math.max(1000, (normalize(block).length / 22) * 1000),
      0,
    );
    assert(available >= minimum, `${scene.id}: too many captions for the planned duration`);
    let cursor = Math.round(scene.speechStartSec * 1000);
    for (const block of blocks) {
      const slot =
        Math.max(1000, (normalize(block).length / 22) * 1000) +
        ((available - minimum) * normalize(block).length) / totalWeight;
      const from = Math.round(cursor);
      const to = Math.round(cursor + Math.min(7000, slot));
      cues.push({ id: `${role.roleId}-${pad(cues.length + 1, 3)}`, from, to, text: block });
      cursor += slot;
    }
    elapsed = end;
  }
  const original = normalize(role.scenes.map((scene) => scene.narration).join(" "));
  assert(
    normalize(cues.map((cue) => cue.text).join(" ")) === original,
    `${role.roleId}: captions lost narration text`,
  );
  cues.forEach((cue, index) => {
    assert(cue.to > cue.from && cue.to <= elapsed * 1000, `${cue.id}: invalid caption interval`);
    assert(index === 0 || cue.from >= cues[index - 1].to, `${cue.id}: overlapping captions`);
    assert(
      cue.text.split("\n").every((line) => line.length <= 42),
      `${cue.id}: long caption line`,
    );
    assert(
      normalize(cue.text).length / ((cue.to - cue.from) / 1000) <= 22,
      `${cue.id}: caption reading speed exceeds 22 characters/second`,
    );
  });
  const intro = `# ${role.title}\n\nVersion 5 · English · Runtime **${shortClock(elapsed)}**\n\n**Audience:** ${role.audience}\n\n**Status:** Narrated illustrated release. Scene cuts follow measured paragraph pauses in the selected audio; captions are conformed within each spoken scene. These are illustrated guides, not private-school screen recordings.\n`;
  output(
    `${role.roleId}.narration.md`,
    `${intro}\n## Voice direction\n\nSelected clear English educational voice; not a verified Nigerian-English accent. The following words match the included narration audio. Read CA as “C A”, A4 as “A four”, PIN as “pin”, and Qur’an, Tahfeez, Mu’allim, Halqah, Mumtaz and Jayyid naturally. Pause for taps, offline/save indicators and full-page print checks. Do not read headings or screen callouts aloud.\n\n${narration.join("\n\n")}\n`,
  );
  output(
    `${role.roleId}.scenes.md`,
    `${intro}\nFollow the shared recording and privacy checklist in README.md. “My Class”, “My Subjects”, “Tahfeez”, “Mumtaz” and “Jayyid” are the requested product terms: confirm the deployed labels before capture and update the script/captions together if needed. Never manufacture UI to match a storyboard.\n\n${sceneGuide.join("\n\n")}\n`,
  );
  output(
    `${role.roleId}.en.vtt`,
    `WEBVTT\n\nNOTE Version 5 selected-voice illustrated walkthrough; timed to its matching v5 MP4, not the legacy v4 recording.\n\n${cues.map((cue) => `${cue.id}\n${clock(cue.from)} --> ${clock(cue.to)}\n${cue.text}`).join("\n\n")}\n`,
  );
  output(
    `${role.roleId}.en.srt`,
    `${cues.map((cue, index) => `${index + 1}\n${clock(cue.from, ",")} --> ${clock(cue.to, ",")}\n${cue.text}`).join("\n\n")}\n`,
  );
  const mediaName = `ndh-walkthrough-${role.roleId.replaceAll("_", "-")}-v5`;
  for (const ext of ["vtt", "srt"]) {
    const text =
      ext === "vtt"
        ? `WEBVTT\n\n${cues.map((cue) => `${cue.id}\n${clock(cue.from)} --> ${clock(cue.to)}\n${cue.text}`).join("\n\n")}\n`
        : `${cues.map((cue, index) => `${index + 1}\n${clock(cue.from, ",")} --> ${clock(cue.to, ",")}\n${cue.text}`).join("\n\n")}\n`;
    const publicPath = path.join(root, "public/videos", `${mediaName}.en.${ext}`);
    if (check)
      assert(
        readFileSync(publicPath, "utf8") === text,
        `${mediaName}: public captions out of date`,
      );
    else writeFileSync(publicPath, text);
  }
  chapters.roles.push({
    roleId: role.roleId,
    title: role.title,
    durationSec: elapsed,
    durationLabel: shortClock(elapsed),
    videoSrc: `/videos/${mediaName}.mp4`,
    posterSrc: `/videos/poster-${mediaName}.jpg`,
    captionsSrc: `/videos/${mediaName}.en.vtt`,
    oneLiner: role.summary,
    chapters: plannedChapters,
  });
  rows.push({ role, duration: shortClock(elapsed) });
}
output("chapters.json", `${JSON.stringify(chapters, null, 2)}\n`);
const metadataPath = path.join(root, "src/data/walkthroughVideosV5.ts");
const metadata = `// Generated from docs/walkthroughs/v5/source.json; run scripts/export-walkthroughs.mjs.\nexport const WALKTHROUGH_V5 = ${JSON.stringify(chapters.roles, null, 2)} as const;\n`;
if (check) assert(readFileSync(metadataPath, "utf8") === metadata, "Player metadata out of date");
else writeFileSync(metadataPath, metadata);
const coverage = Object.entries(pack.features)
  .map(
    ([id, title]) =>
      `| ${title} | ${rows.map(({ role }) => (role.scenes.some((scene) => scene.features.includes(id)) ? "✓" : "—")).join(" | ")} |`,
  )
  .join("\n");
output(
  "README.md",
  `# NDH SchoolOS walkthrough production pack — version 5

## Completed release

All seven roles now have **playable version 5 MP4s**, selected-voice narration, 57 illustrated scenes, posters, English VTT/SRT subtitles and measured chapter cuts. The site player uses the matching new media, captions and timings. The original v4 videos remain available for rollback; they have not been relabelled.

**Visual format:** these are clearly labelled illustrated workflow guides, not recordings of a live/private school account. They explain the supplied product-upgrade brief without inventing learner data or pretending that diagrams are actual app screens. The scene guides also retain references for a future authorised live-screen recording.

**Voice:** the user selected the English educational voice after being told that a verified Nigerian-English accent was unavailable. This release does not claim a Nigerian accent. Narration audio is preserved in public/videos/narration-v5 for reproducible rendering.

Scene cuts are conformed to detected paragraph pauses in the actual narration; captions are phrase-timed within each spoken scene, rather than copied from the unrelated v4 timings. Re-record and re-time together if the wording changes.

## Role files

| Role | Runtime | Narration | Scene guide | Subtitles |
| --- | --- | --- | --- | --- |
${rows.map(({ role, duration }) => `| ${role.title} | ${duration} | [Script](${role.roleId}.narration.md) | [Scenes](${role.roleId}.scenes.md) | [VTT](${role.roleId}.en.vtt) · [SRT](${role.roleId}.en.srt) |`).join("\n")}

The class-teacher guide includes a clearly labelled Mu’allim/Halqah variant; it does not add an eighth role or force Qur’an terminology into a conventional school. Existing exam-paper review, score-edit permissions, receipts, admissions, sibling links and result-publication boundaries are retained where relevant.

## Upgrade coverage by role

A dash means that feature is not that role’s responsibility, not that the platform lacks it. Cross-role inserts must be visibly labelled and must not imply expanded permissions.

| Capability | Owner | Exam Officer | Class Teacher / Mu’allim | Subject Teacher | Bursar | Secretary | Parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
${coverage}

## Reference checklist for future live-screen recordings

1. Use the current **published** application and an expressly authorised recording school with consented test fixtures. Mask phone numbers, PINs, passwords, bank details and non-fixture learner/salary data. Never record production credentials, real family details or an owner session as if it were a restricted role.
2. The address **ndhschoolos.app/s/markaz** is an example supplied in the brief, not a claim that this sandbox verified a live school. Replace it with the approved school link for actual capture. Markazussalaf is an optional school-type example, not permission to access its private data.
3. Preserve the school’s saved crest, motto, colours and templates. Keep existing NDH editorial branding and Navy **#0a192f**. Do not redesign the app, invent buttons or manufacture screenshots. Verify the deployed names of My Class/My Subjects and Tahfeez rating controls before recording; if labels differ, update narration and captions together.
4. Show the owner’s email/password path separately. Staff and parents use school-provisioned phone/four-digit-PIN accounts with scoped access. Branding and installation do not grant access; parents see only their linked children. Never show a reusable sample PIN or imply that payroll inclusion creates a teacher login.
5. Record actual home-screen installation on a supported browser. Use **Install school app** on Android Chrome when available; on iPhone show Safari → Share → Add to Home Screen. Capture the resulting school crest/name and launch into the same school. This is a home-screen web app, not an app-store package. Use the real browser fallback if no native install prompt is available.
6. For offline scenes, first sign in online and open permitted records on the user’s own device. Use the published app, not an editor/iframe preview. Turn off data/Wi-Fi, save attendance, CA/exam scores and (where enabled/assigned) memorization, then reconnect with the app open. Show actual sync acknowledgement and verify persisted values after reload or on a second authorised device. Never promise first-time offline sign-in, offline online-payments/messages, or invisible cross-device updates before sync. Device copies are cleared on sign-out; do not sign out or clear storage with unsynced work. Conflicts require review and must never be shown silently overwriting newer work.
7. Keep conventional and Islamic/dual-stream cuts explicit. Only enabled schools use Tahfeez, Halqah, Surah/Ayah and the configured memorization ratings. Mu’allim edits require the assigned role; a parent or exam-officer contextual insert is not permission to edit those records.
8. For payroll, demonstrate teaching/non-teaching categories using nannies, security guards, cleaners, drivers and cooks. Check salary-sheet inclusion and totals without teacher assignments or unnecessary portal logins for support staff.
9. For reports, show the **same fixed A4 document** on phone, tablet and desktop. The preview scales paper, not responsive report contents. Use A4 portrait and the supported print settings; inspect all margins, page counts and (where appropriate) an exported PDF/physical page. Disable browser headers/footers if necessary. Do not crop clipped edges or claim identical output from an untested printer configuration. Parents receive published results only.
10. Record a warm, clear voice at about 140 words per minute, preserving the scene holds. Subtitles use at most two 42-character lines, no overlapping cues and a maximum planned reading speed of 22 characters/second. The scripts are not literal speech synthesis markup. Check Qur’an-related pronunciation with the school’s preferred usage. Re-time both VTT/SRT and chapter offsets against the final audio; captions must match the actual spoken words.

## Editing and release

The editable content source is [source.json](source.json). [chapters.json](chapters.json) and src/data/walkthroughVideosV5.ts supply the same measured scene cuts to documentation and the player. Media checksums and codec/duration details are in [media-manifest.json](media-manifest.json).

The renderer uses the pinned packages in scripts/walkthrough-requirements.txt (Pillow and imageio-ffmpeg, or an explicit FFMPEG_BINARY); runtime playback has no new dependencies. PNG frames and intermediate renders stay under .cache and are not committed. To re-render the existing recorded voice, use Python with these tools installed and run scripts/render-walkthroughs.py. If changing spoken text, first generate fresh narration with the approved voice, then run scripts/prepare-walkthrough-timings.py. Audio/text SHA-256 checks prevent silently pairing a changed script with old speech.

From the repository root:

${String.fromCharCode(96).repeat(3)}sh
node scripts/export-walkthroughs.mjs
node scripts/export-walkthroughs.mjs --check
# For re-rendering/verification only; not needed for the website runtime:
# python -m pip install -r scripts/walkthrough-requirements.txt
# python scripts/render-walkthroughs.py
# python scripts/verify-walkthrough-media.py
${String.fromCharCode(96).repeat(3)}

The exporter uses only Node built-ins, checks the seven role IDs and source fields, validates caption timing/readability, and deterministically regenerates the scripts, guides, chapter plan and subtitle pairs. Its check mode is read-only. Do not hand-edit generated assets; edit source.json, regenerate, and review the results.

**Release verification:** all seven media files must decode, contain H.264 video and audible AAC narration, and match their checked-in captions/posters/chapters. Check role locking, autoplay/next-video behaviour, chapter seeks, caption loading, desktop/mobile framing and low-data behaviour. Future live-screen recordings require an authorised school, verified task flows and new timing review before replacing these illustrations.
`,
);
console.log(
  `${check ? "Verified" : "Exported"} ${rows.length} walkthroughs; ${chapters.roles.reduce((sum, role) => sum + role.chapters.length, 0)} scenes. Version 5 captions and player metadata matched.`,
);
