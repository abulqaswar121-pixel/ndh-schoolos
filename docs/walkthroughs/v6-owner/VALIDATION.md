# Initial Owner screen validation (historical)

This records the initial Owner-only checks. Final seven-role checks are in [the release validation](../v6-roles/VALIDATION.md).

## Automated

- `npx tsc --noEmit`: passed.
- `npm test`: 85 tests passed, 16 test files.
- `npm run build`: passed.
- Focused ESLint on both player components, new tests and recording-studio JS/TS: passed.
- Version 5 deterministic exporter check: unchanged assets pass.
- Git whitespace check: passed (including all new text files).

The routing tests still emit the pre-existing test-harness warning about rendering the root `<html>` under Testing Library's `<div>`. The real-browser check reports no page errors. This sample does not change the root route or document shell.

## Media

Both MP4s fully decode with FFmpeg, contain H.264 video / AAC mono narration at 48 kHz, and use fast-start layout. Phone: 720 × 1280. Desktop: 1280 × 720. Both encoded runtimes are approximately 154.813 seconds; common chapter-plan duration is 154.792 seconds. Narration is audible, with a mean near -20.3 dBFS and peak near -2.2 dBFS. Assets, source narration and captions have checksum tests; VTT/SRT words match the retained narration, with nine common chapter cuts.

## Actual website browser checks

`scripts/walkthrough-studio/check-player.mjs` ran against `/tutorials`, **not** the recording SPA:

- At 390 CSS pixels, only the phone MP4 was initially requested; video metadata reports 720 × 1280.
- The portrait stage keeps its 9:16 aspect ratio; content uses `object-contain`, not cropping.
- Manual Desktop selection loads the distinct 1280 × 720 recording.
- Position 76 seconds, paused state, mute, volume 0.4 and speed 1.25 survive format switching.
- Auto returns to phone and follows resizing to a 1440-pixel desktop viewport.
- English captions load/show (29 cues); chapter seeks work.
- The Exam Officer retains its existing v5 video/captions and does not show unavailable Phone/Desktop options.
- No horizontal overflow at phone width; no page errors.

Unit tests also cover manual override precedence, listener cleanup, caption-mode preservation, playing-state restoration, low-data preload/autoplay rules, and muted-autoplay fallback after metadata is ready.

## Boundaries

No live private data, real account creation, real sign-in, deployed-school branding write, native home-screen installation, physical printing or live reconnect synchronization was tested. The user authorised fictional demo records. Production auth, blank seed data and all original media remain unchanged. The six non-Owner guides were subsequently completed after the user authorised finishing the release.
