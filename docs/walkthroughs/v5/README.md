# NDH SchoolOS walkthrough production pack — version 5

## Completed release

All seven roles now have **playable version 5 MP4s**, selected-voice narration, 57 illustrated scenes, posters, English VTT/SRT subtitles and measured chapter cuts. The site player uses the matching new media, captions and timings. The original v4 videos remain available for rollback; they have not been relabelled.

**Visual format:** these are clearly labelled illustrated workflow guides, not recordings of a live/private school account. They explain the supplied product-upgrade brief without inventing learner data or pretending that diagrams are actual app screens. The scene guides also retain references for a future authorised live-screen recording.

**Voice:** the user selected the English educational voice after being told that a verified Nigerian-English accent was unavailable. This release does not claim a Nigerian accent. Narration audio is preserved in public/videos/narration-v5 for reproducible rendering.

Scene cuts are conformed to detected paragraph pauses in the actual narration; captions are phrase-timed within each spoken scene, rather than copied from the unrelated v4 timings. Re-record and re-time together if the wording changes.

## Role files

| Role | Runtime | Narration | Scene guide | Subtitles |
| --- | --- | --- | --- | --- |
| School Owner / Principal | 1:32 | [Script](admin.narration.md) | [Scenes](admin.scenes.md) | [VTT](admin.en.vtt) · [SRT](admin.en.srt) |
| Exam Officer | 1:12 | [Script](exam_officer.narration.md) | [Scenes](exam_officer.scenes.md) | [VTT](exam_officer.en.vtt) · [SRT](exam_officer.en.srt) |
| Class Teacher / Mu’allim | 1:19 | [Script](class_teacher.narration.md) | [Scenes](class_teacher.scenes.md) | [VTT](class_teacher.en.vtt) · [SRT](class_teacher.en.srt) |
| Subject Teacher | 1:09 | [Script](subject_teacher.narration.md) | [Scenes](subject_teacher.scenes.md) | [VTT](subject_teacher.en.vtt) · [SRT](subject_teacher.en.srt) |
| Bursar / Accountant | 1:14 | [Script](bursar.narration.md) | [Scenes](bursar.scenes.md) | [VTT](bursar.en.vtt) · [SRT](bursar.en.srt) |
| School Secretary | 1:11 | [Script](secretary.narration.md) | [Scenes](secretary.scenes.md) | [VTT](secretary.en.vtt) · [SRT](secretary.en.srt) |
| Parent / Guardian | 1:06 | [Script](parent.narration.md) | [Scenes](parent.scenes.md) | [VTT](parent.en.vtt) · [SRT](parent.en.srt) |

The class-teacher guide includes a clearly labelled Mu’allim/Halqah variant; it does not add an eighth role or force Qur’an terminology into a conventional school. Existing exam-paper review, score-edit permissions, receipts, admissions, sibling links and result-publication boundaries are retained where relevant.

## Upgrade coverage by role

A dash means that feature is not that role’s responsibility, not that the platform lacks it. Cross-role inserts must be visibly labelled and must not imply expanded permissions.

| Capability | Owner | Exam Officer | Class Teacher / Mu’allim | Subject Teacher | Bursar | Secretary | Parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Own short school link, logo, motto and colours | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staff and parent phone + four-digit PIN; owner email/password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| School-branded home-screen installation on supported devices | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Prepared teacher/Mu’allim offline attendance, scores and memorization; automatic reconnect sync | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Teaching/non-teaching salary sheets without unnecessary teacher accounts | ✓ | — | — | — | ✓ | — | — |
| Optional Tahfeez, Surah/Ayah, Mumtaz/Jayyid and Halqah management | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| One assigned teacher login for My Class and My Subjects | ✓ | ✓ | ✓ | ✓ | — | ✓ | — |
| Fixed standard A4 reports scaled across devices and printed with intact margins | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |

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

```sh
node scripts/export-walkthroughs.mjs
node scripts/export-walkthroughs.mjs --check
# For re-rendering/verification only; not needed for the website runtime:
# python -m pip install -r scripts/walkthrough-requirements.txt
# python scripts/render-walkthroughs.py
# python scripts/verify-walkthrough-media.py
```

The exporter uses only Node built-ins, checks the seven role IDs and source fields, validates caption timing/readability, and deterministically regenerates the scripts, guides, chapter plan and subtitle pairs. Its check mode is read-only. Do not hand-edit generated assets; edit source.json, regenerate, and review the results.

**Release verification:** all seven media files must decode, contain H.264 video and audible AAC narration, and match their checked-in captions/posters/chapters. Check role locking, autoplay/next-video behaviour, chapter seeks, caption loading, desktop/mobile framing and low-data behaviour. Future live-screen recordings require an authorised school, verified task flows and new timing review before replacing these illustrations.
