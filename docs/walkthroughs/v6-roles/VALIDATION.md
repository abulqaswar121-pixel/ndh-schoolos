# Final seven-role release validation

Release checks completed 2026-11-02 on `arena/8b55b964-ndh-schoolos`, based on `c7b24c7`. These are repository/build and isolated demo/browser checks, not production acceptance or a deployment claim.

## Automated checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm test` | **102 tests passed, 18 files** |
| `npm run build` | PASS |
| Focused ESLint: changed player/page/tests and recording studio TypeScript | PASS |
| `node scripts/walkthrough-studio/export-player.mjs --check` | PASS: 7 roles, 14 MP4s, 47 shared chapter cuts; checksums and deterministic exports |
| `python scripts/walkthrough-studio/verify-release.py --write-report` | PASS: 14 full video/audio decodes, H.264/AAC, portrait/landscape dimensions, sample aspect ratio, durations and audible narration |
| `node scripts/walkthrough-studio/check-player.mjs` against actual website `/tutorials` | PASS for all seven roles |
| `git diff --check` | PASS |

The build retains non-blocking bundler/PWA warnings (`inlineDynamicImports` with code splitting and an unmatched Workbox asset glob). Routing tests retain their existing root `<html>` nesting warning in the jsdom harness. No unrelated app/build configuration was changed to hide them. A repository-wide ESLint cleanup is not part of this release; focused lint covers this change's hand-authored TypeScript.

## Real browser, actual website

The browser acceptance script runs against the normal website dev server, **not** the fictional recording SPA. It confirms:

- Initial 390-pixel viewport requests only the Owner phone MP4, not the desktop source.
- One video element/source, native controls, loaded English VTT cues and a 9:16 phone stage; no mobile horizontal overflow.
- Manual Desktop loads a distinct 1280 × 720 MP4. Position 76 seconds, paused state, mute, volume 0.4 and speed 1.25 remain intact.
- Auto follows viewport changes; manual Phone overrides desktop width until Auto is selected again.
- For **each of all seven roles**, phone metadata is 720 × 1280, desktop metadata is 1280 × 720, captions show, chapter two seeks to its declared cut, a paused chapter position survives the viewport switch, and both manual formats plus Auto work.
- No JavaScript page errors. Full run output and measured per-role metadata are in [browser-qa.json](browser-qa.json).

Additional component tests cover every role's locked portal player (no role tabs, correct captions/variants, chapter seek, no role advance at `ended`), low-data preload/autoplay, playing-state restoration, caption preference, muted autoplay fallback and media-query cleanup. Public playlist next-role behaviour is covered by the existing updated integration test.

## Capture integrity, role scoping and privacy

- Independent browser captures for phone and desktop use the repository's actual portal components and real role-access filtering, not a cropped desktop or painted interface.
- The six follow-on roles' capture reports contain no page errors or outbound service requests. [capture-qa.json](capture-qa.json) retains these reports and phone/desktop role-scope text. Owner capture details are in the original `v6-owner` documentation.
- Parent fixtures deliberately contain a third learner in a different family. Unit and capture checks confirm only the two linked siblings appear; payroll remains hidden. Subject Teacher receives only its assigned subject, no fees/payroll. Recorded roster/payroll figures and identifiers are fictional.
- Production authorization, server functions, seeds, school data providers, app routes, `src/styles.css`, package manifests/locks and Vite/PWA configuration have no release changes. The studio's aliases, local sessions and demo adapters are excluded from the production entry graph.
- Public school links remain branding-only. There are no live account passwords, PINs, parent phone numbers or real school records in the fixtures.

## Media / caption integrity

- All 14 final MP4s completely decoded again after rendering; [verification.json](verification.json) includes dimensions, duration, audio level and SHA-256 per file. Audio means are approximately −20.3 to −21.1 dBFS. Files contain fast-start metadata before the media payload.
- Each role has common phone/desktop scene cuts, MP4s, posters, narration sources, VTT/SRT and a checksummed manifest. The compiled aggregate metadata and readable scripts regenerate deterministically.
- Caption words match every source narration in order. Cues are monotonic, within the movie duration, approximately 1–7 seconds, at most two lines of 42 characters and at most 22.1 characters/second. Captions are phrase-timed, **not claimed word-aligned**.
- Phone framing and several role sign-in/poster screens were visually reviewed. Capture selectors also verify the real task controls, report/receipt print portals and role-limited menus. This is not a claim of exhaustive physical-device or human accessibility testing.

## Deliberate limits

No production account creation, live phone/PIN authentication, billing/bank verification, real payroll write, deployed school branding change, operating-system PWA installation, live reconnect conflict handling or physical printer was tested. Sign-in transitions and any saves inside the isolated recording harness are local, labelled demo behaviour. Installation footage shows the genuine in-app help dialog only. Optional Quran content is enabled only in its labelled variant. Fixed A4 reports are captured as implemented; receipt and payroll previews are not falsely described as sharing the report renderer. Selected English voice-02 is not represented as a verified Nigerian accent.

The release preserves existing website layout, Navy branding and original v4/v5 history/media. It is approved for repository integration by the user's instruction to finish all guides, create a PR and merge using a **merge commit**, not squash/rebase.
