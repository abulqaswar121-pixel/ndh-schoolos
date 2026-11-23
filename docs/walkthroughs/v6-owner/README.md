# Owner screen tutorial — Phone / Desktop release

This was the first screen-led sample. The user subsequently authorised finishing all roles; it is now part of the [complete seven-role release](../v6-roles/README.md). Existing v4/v5 media is retained; no site redesign, production seed changes, authentication bypass, migrations or deployment are included.

## Watch

- [Phone recording](../../../public/videos/ndh-owner-screen-phone-v6.mp4): **720 × 1280**, portrait.
- [Desktop recording](../../../public/videos/ndh-owner-screen-desktop-v6.mp4): **1280 × 720**, landscape.
- Both are **2:35**, H.264 / AAC, fast-start MP4s, with the same narration, nine chapters and English [VTT](admin.en.vtt) / [SRT](admin.en.srt) captions.
- The existing public and role-locked players use Auto / Phone / Desktop for each role. Auto chooses Phone below 768 CSS pixels and Desktop otherwise. It loads just one MP4, not two hidden players. A format change keeps playback position, paused state, audio settings and speed. Low-data mode still disables preloading/autoplay.

## What is actually shown

Independent browser captures render the **existing application components** at 390 × 650 (phone, 2× device scale) and 1280 × 640 (desktop). Click/tap highlights, slow typing, real menus, scrolls, actual forms and the real fixed-A4 preview are recorded. The output adds narrow navy instruction/DEMO bands; it never draws a fake portal screenshot or crops a desktop page into a phone frame.

The nine chapters show the homepage, registration steps (without submission), owner sign-in UI, dashboard, settings and school-link controls, staff-type filtering and assignment information, the optional Qur'an-module control, a learner's A4 report preview and the genuine school-app installation help dialog.

The narration sometimes calls the directory “Staff Directory”; the actual tab shown and clicked is **Staff & Role Assignments**. Registration's forward button is **Continue**. On-screen instructions use the real labels.

## Demo and privacy boundaries

The user explicitly authorised demo records for private screens. **NDH Demo Academy**, **Demo Learner A/B/C**, the staff names, salaries and scores are fictional fixtures. Emails use the reserved `example.invalid` domain; there are no real phone, bank or learner records. “RecordingOnly!” is meaningless local form input, not a real account credential.

The standalone recording SPA lives under `scripts/walkthrough-studio`, outside production routes and the production seed. Its separate Vite config aliases backend clients to in-memory adapters. Account creation, account/branding writes, email sending and native printing fail closed. Playwright blocks every external origin. The normal website's auth and server authorization code are unchanged, and production builds never import the demo adapters.

The sign-in transition is an explicitly narrated **local demo session**, not verified live authentication. Cloud-status text visible in the real components describes the demo adapter, not a real cloud save. The school-link field contains the local recording origin, not a deployed school URL. No registration is submitted. The video shows the real install help, **not** a fabricated native installation, and it does not claim that live offline/reconnect sync or a physical printer was tested.

Narration uses the previously selected English **voice-02**. No verified Nigerian accent is claimed. Captions are phrase-timed within each spoken scene, not claimed as word-level alignment. Screens were recorded independently but intentionally share scene cuts so switching views keeps the same lesson position.

## Source and reproduction

- [source.json](source.json): spoken text, selected-audio checksums and scene instructions.
- [timings.json](timings.json) / [chapters.json](chapters.json): measured common scene cuts.
- [media-manifest.json](media-manifest.json): checksums, sizes and full-decode verification.
- Original approved-voice clips: `public/videos/narration-v6-owner`. The combined clip contains six paragraphs; three other clips were generated separately. The preparation script cuts the six paragraphs at reviewed silence boundaries and omits the incorrect “Programmes and Labels” lead-in from the optional-module paragraph. The retained spoken words match the captions/source.

```sh
# Website dependencies already installed. These extra packages are tooling only:
npm install --no-save --no-package-lock --legacy-peer-deps --ignore-scripts @playwright/test @sparticuz/chromium
python -m pip install -r scripts/walkthrough-requirements.txt
npx vite --config scripts/walkthrough-studio/vite.config.mjs
# In another shell, at the repository root:
python scripts/walkthrough-studio/prepare-audio.py
node scripts/walkthrough-studio/capture.mjs phone desktop
python scripts/walkthrough-studio/render.py
```

Use a system Chromium/Playwright installation if appropriate. In minimal Linux environments the Sparticuz archive's bundled shared libraries may need extraction and `LD_LIBRARY_PATH` configuration before Chromium can launch. Frames, WAV intermediates and browser QA evidence stay in ignored `.cache/walkthrough-recordings`; no large frame sequences enter Git. Rendering uses DejaVu Sans, Pillow and imageio-ffmpeg. Re-record both views after UI changes; changing narration requires matching speech and timing updates.

## Release progression

The initial Owner sample established the screen-led style, mobile framing and narration. The user then requested completion of all roles and PR creation/merge. All seven role pairs are now recorded; see the final release validation and verification report in ../v6-roles. Live authentication, native installation, reconnect conflict handling and physical A4 output remain separate authorised acceptance checks.
