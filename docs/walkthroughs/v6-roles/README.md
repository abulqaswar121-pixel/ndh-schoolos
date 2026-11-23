# Version 6 — seven real-screen, phone-first role tutorials

Completed after the user requested: **“finish everything then create and merge pr.”** This release replaces the illustrated v5 playlist with real application-screen tutorials for all seven roles. The site layout and Navy styling stay intact; production auth, blank school seed, server permissions and app modules are unchanged. Original v4/v5 media remains available for rollback.

## Deliverables

**14 independent MP4s**: a portrait **720 × 1280** phone recording and landscape **1280 × 720** desktop recording per role. Every pair shares narration, English VTT/SRT captions and measured chapter cuts, so switching formats retains the same lesson position. H.264 / AAC, 24 fps, fast-start MP4; 47 shared chapter cuts across the seven lessons.

| Role | Runtime (rounded) | Main recorded tasks | Sources |
| --- | --- | --- | --- |
| School Owner / Principal | 2:35 | Website, registration without submission, owner sign-in, dashboard, school identity/short link, staff categories, optional Quran module, A4 report, school-app help | [Narration](../v6-owner/narration.md) · [Scenes](../v6-owner/scenes.md) |
| Exam Officer | 1:26 | School sign-in, missing-paper tracking, status filter, submitted paper preview, demo approval, Word/scheme controls, all-class broadsheets and A4 reports | [Narration](exam_officer/narration.md) · [Scenes](exam_officer/scenes.md) |
| Class Teacher / Mu’allim | 1:49 | Assigned attendance, demo score edit, one-account class/subject duties, broadsheet/report, explicitly enabled optional Surah/Ayah/revision variant | [Narration](class_teacher/narration.md) · [Scenes](class_teacher/scenes.md) |
| Subject Teacher | 1:30 | Assigned subject score edit, combined group, marksheet preview, exam draft editing, role limits | [Narration](subject_teacher/narration.md) · [Scenes](subject_teacher/scenes.md) |
| Bursar / Accountant | 1:42 | Debtor filter, receipt preview, month/payroll selection, payslip preview, non-teaching staff filter | [Narration](bursar/narration.md) · [Scenes](bursar/scenes.md) |
| School Secretary | 1:26 | Roster search, learner/guardian details, attendance summary/sheet, authorised report printing | [Narration](secretary/narration.md) · [Scenes](secretary/scenes.md) |
| Parent / Guardian | 1:27 | Parent sign-in tab, two linked siblings, attendance/results, published A4 report, fee receipt; other family excluded | [Narration](parent/narration.md) · [Scenes](parent/scenes.md) |

Every role also shows the genuine school-app installation help and explains online-first/offline boundaries. Source JSON, VTT/SRT, timing plans, per-role player metadata and checksummed manifests accompany each lesson. The Owner sources live in the original `v6-owner` folder; the six follow-on guides are here. [The combined manifest](media-manifest.json) registers the complete release; [verification.json](verification.json) records the 14 full-decode/audio checks.

## Automatic responsive playback

- **Auto** selects the phone recording below **768 CSS pixels**, otherwise desktop. This is responsive viewport selection, not unreliable user-agent sniffing.
- **Phone / Desktop** buttons allow manual override. Auto restores viewport following.
- Only one MP4 element/source loads at a time. Phone hydration does not first preload the desktop MP4.
- Switching preserves lesson time, paused/playing state, mute, volume, playback speed and caption mode; a paused video does not restart.
- Low-data mode keeps `preload="none"` and suppresses automatic playback/resumption.
- Portrait uses a 9:16, width-limited stage; desktop uses 16:9. Both use `object-contain`, never cropping the interface.
- Public playlists retain next-role playback. Private portal players remain locked to the signed-in role, including after the video ends; changing view does not change role.

## Real screens; explicitly fictional records

The browser renders the actual repository components, forms, responsive menus, tables and print previews. Captures include real scrolling, pointer/tap highlights, typing, filters and permitted local demo edits. A phone is recorded at **390 × 650, 2× pixel scale**, not cut from a desktop screenshot. Desktop is independently recorded at **1280 × 640**. Navy instruction bands provide role, view and persistent **DEMO DATA** labelling.

The user expressly permitted demo data for private screens. A separate recording-only Vite SPA aliases backend clients to local adapters. It uses **NDH Demo Academy**, named demo learners/staff, fictional scores/salaries and reserved `example.invalid` emails. All-zero phone/PIN values are inert fictional form input, not reusable live credentials. Parent fixtures include another family to verify exclusion. The actual application's `getAuthorizedSnapshot` and role permissions scope these records; the recorder does not use an Owner view as if it were a restricted role.

No production route, production query parameter, seed flag or auth bypass was added. The harness is under `scripts/walkthrough-studio` and is never imported by the production website. Capture blocks outbound origins. Real registration, email invitations, credential resets and branding/account writes fail closed. Demo React-state edits can be acknowledged locally; they never reach a live service. Native print is disabled in the harness; only real app previews are recorded. Frames and intermediate WAV/MP4 files stay under ignored `.cache` paths.

### Do not overclaim

- The sign-in transition is an explicitly narrated **local session**, not live authentication. Cloud status visible in an actual component describes the demo adapter, not a real backend save.
- The school-link field uses the local recording origin, not a claim that a live `markaz` or demo school was created. School branding and links do not grant private access.
- Installation chapters show the **actual help dialog**, not a fabricated operating-system prompt or installed home screen. They distinguish Safari Share → Add to Home Screen and Chrome installation guidance.
- Offline/reconnect guidance is narrated, **not verified with a live backend**. First-time sign-in, payments and messages require internet. Open permitted records online first; review conflicts and preserve unsynced drafts.
- The Class Teacher's Quran chapter explicitly switches to a separate **enabled demo configuration**. Conventional school captures keep it off. The current UI shows Surah/Ayah, a recitation score and revision fields; it does **not** invent visible Mumtaz/Jayyid controls. Narration asks schools using those ratings to confirm the mapping. Likewise class/subject duties use the actual menu labels, not manufactured “My Class / My Subjects” buttons.
- A4 report previews show the existing fixed-paper implementation. Other printable screens are shown as they exist; a real printer, browser PDF export, margins and all supported devices remain separate acceptance checks.
- Narration uses the user-selected English **voice-02**. A verified Nigerian-English accent is **not** claimed.

## Reproduce / maintain

The recording tools add no website runtime dependencies. Python tools require `scripts/walkthrough-requirements.txt`; the browser tooling uses Playwright and Sparticuz Chromium installed without changing package manifests/locks. Minimal Linux environments may require extracting Chromium's bundled libraries and setting `LD_LIBRARY_PATH`. DejaVu Sans is used for the instruction bands.

```sh
# One terminal; never the production Vite config:
npx vite --config scripts/walkthrough-studio/vite.config.mjs
# Another terminal, from the repository root:
python scripts/walkthrough-studio/prepare-role-audio.py
ROLE=exam_officer node scripts/walkthrough-studio/capture-roles.mjs phone desktop
ROLE=exam_officer python scripts/walkthrough-studio/render.py
# Repeat capture/render for class_teacher, subject_teacher, bursar, secretary, parent.
# Owner uses capture.mjs and prepare-audio.py without ROLE; original audio retained.
node scripts/walkthrough-studio/export-player.mjs
node scripts/walkthrough-studio/export-player.mjs --check
python scripts/walkthrough-studio/verify-release.py --write-report
node scripts/walkthrough-studio/check-player.mjs
```

Do not rerun `create-role-sources.py` over a timed release unless intentionally replacing its editable sources; it starts a new narration/storyboard draft and discards timing fields. When changing spoken text, generate matching approved-voice audio, re-conform paragraph cuts, capture both views, re-render, export metadata and verify. Captions are phrase-timed within measured scenes, not claimed as word-level transcription. Review detected paragraph pauses before release. Capture output records the real action duration; both variants conform to a shared scene length without dropping audio.

[Final validation](VALIDATION.md) records automated and browser checks. This repository release does not claim a production deployment or live database migration.
