// Browser acceptance for the REAL website, not the demo recording SPA.
import { chromium as playwright } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const browser = await playwright.launch({
  executablePath: await chromium.executablePath(),
  args: chromium.args,
  headless: true,
});
const base = process.env.WEBSITE_URL || "http://localhost:8080";
const errors = [],
  requests = [];
const dir = ".cache/walkthrough-recordings/player-qa";
await mkdir(dir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().endsWith(".mp4")) requests.push(new URL(r.url()).pathname);
});
const assert = (v, message) => {
  if (!v) throw new Error(message);
};
const ready = async (suffix) => {
  await page.waitForFunction(
    (s) => {
      const v = document.querySelector("video");
      return v?.currentSrc.endsWith(s) && v.readyState >= 2 && v.videoWidth > 0;
    },
    suffix,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () => document.querySelector("video")?.textTracks[0]?.cues?.length > 0,
  );
  return page.locator("video").evaluate((v) => ({
    src: new URL(v.currentSrc).pathname,
    width: v.videoWidth,
    height: v.videoHeight,
    duration: v.duration,
    error: v.error?.message || null,
    captions: v.textTracks[0]?.mode,
    cues: v.textTracks[0]?.cues?.length,
  }));
};
try {
  await page.goto(`${base}/tutorials`);
  const player = page.getByTestId("role-video-tutorial-player");
  await player.scrollIntoViewIfNeeded();
  const phone = await ready("ndh-owner-screen-phone-v6.mp4");
  console.log("PHONE", phone);
  assert(phone.width === 720 && phone.height === 1280, "Not real portrait media");
  assert(
    requests.every((p) => !p.includes("desktop")),
    "Desktop file was unnecessarily requested on initial mobile load",
  );
  const ratio = await page
    .getByTestId("walkthrough-video-stage")
    .evaluate((el) => el.clientHeight / el.clientWidth);
  assert(Math.abs(ratio - 16 / 9) < 0.02, "Phone stage not portrait");
  await page.locator("video").evaluate((v) => {
    v.pause();
    v.currentTime = 76;
    v.muted = true;
    v.volume = 0.4;
    v.playbackRate = 1.25;
  });
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  const desktop = await ready("ndh-owner-screen-desktop-v6.mp4");
  console.log("MANUAL DESKTOP", desktop);
  const preserved = await page.locator("video").evaluate((v) => ({
    time: v.currentTime,
    paused: v.paused,
    muted: v.muted,
    rate: v.playbackRate,
    volume: v.volume,
  }));
  assert(
    Math.abs(preserved.time - 76) < 0.15 &&
      preserved.paused &&
      preserved.muted &&
      preserved.rate === 1.25 &&
      preserved.volume === 0.4,
    "Playback state not preserved",
  );
  console.log("PRESERVED", preserved);
  await page.getByRole("button", { name: "Auto", exact: true }).click();
  await ready("ndh-owner-screen-phone-v6.mp4");
  await page.getByRole("button", { name: /8\. Real A4 report preview/ }).click();
  await page.waitForTimeout(2200);
  await page.locator("video").evaluate((v) => v.pause());
  await player.screenshot({ path: `${dir}/phone-player.png` });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile horizontal overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready("ndh-owner-screen-desktop-v6.mp4");
  await player.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /5\. Settings & school link/ }).click();
  await page.waitForTimeout(4500);
  await page.locator("video").evaluate((v) => v.pause());
  await player.screenshot({ path: `${dir}/desktop-player.png` });
  const final = await page
    .locator("video")
    .evaluate((v) => ({ time: v.currentTime, error: v.error?.message || null }));
  assert(final.time > 72 && final.time < 90 && !final.error, "Chapter seek failed");
  const release = JSON.parse(await readFile("docs/walkthroughs/v6-roles/media-manifest.json", "utf8"));
  const labels = {admin:"School Owner",exam_officer:"Exam Officer",class_teacher:"Class Teacher",subject_teacher:"Subject Teacher",bursar:"Bursar",secretary:"Secretary",parent:"Parent"};
  const checkedRoles = [];
  for (const role of release.roles) {
    await page.setViewportSize({width:390,height:844});
    await player.getByRole("tab",{name:new RegExp(labels[role.roleId])}).click();
    await player.scrollIntoViewIfNeeded();
    const portrait = await ready(role.variants.phone.videoSrc.split("/").at(-1));
    assert(portrait.width===720&&portrait.height===1280&&portrait.captions==="showing", "Invalid phone media/captions: "+role.roleId);
    await page.getByRole("button",{name:`2. ${role.chapters[1].label}`,exact:true}).click();
    await page.waitForTimeout(500);
    const time = await page.locator("video").evaluate(v=>{v.pause();return v.currentTime});
    assert(time>=role.chapters[1].startSec-0.2&&time<role.chapters[1].startSec+3,"Chapter seek failed: "+role.roleId);
    await page.setViewportSize({width:1440,height:1000});
    const landscape=await ready(role.variants.desktop.videoSrc.split("/").at(-1));
    const restored=await page.locator("video").evaluate(v=>({time:v.currentTime,paused:v.paused}));
    assert(landscape.width===1280&&landscape.height===720&&restored.paused&&Math.abs(restored.time-time)<0.15,"Desktop switch failed: "+role.roleId);
    assert(await page.locator("video").count()===1,"Duplicate hidden media players");
    await page.getByRole("button",{name:"Phone",exact:true}).click();await ready(role.variants.phone.videoSrc.split("/").at(-1));
    await page.getByRole("button",{name:"Auto",exact:true}).click();await ready(role.variants.desktop.videoSrc.split("/").at(-1));
    checkedRoles.push({roleId:role.roleId,phone:portrait,desktop:landscape,chapterTime:time,restoredTime:restored.time});
    console.log("ROLE PASS",role.roleId,portrait.duration,landscape.duration);
  }
  assert(errors.length === 0, errors.join("\n"));
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify(
      {
        checkedRoles,
        phone,
        desktop,
        preserved,
        initialRequests: [...new Set(requests)],
        errors,
        mobileOverflow: false,
        chapterSeek: final,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: automatic mobile/desktop, one source, manual override, captions, seeks, state preservation, all seven role variants, no page errors/overflow.",
  );
} finally {
  await browser.close();
}
