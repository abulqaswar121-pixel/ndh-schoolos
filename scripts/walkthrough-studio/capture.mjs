// Capture actual components at two independent viewport sizes, with local demo adapters.
// npm install --no-save --no-package-lock --legacy-peer-deps @playwright/test @sparticuz/chromium
import { chromium as playwright } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
const ROOT = process.cwd();
const pack = JSON.parse(await readFile("docs/walkthroughs/v6-owner/source.json", "utf8"));
const base = process.env.STUDIO_URL || "http://localhost:8081";
const origin = new URL(base).origin;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const variants = process.argv.slice(2).length ? process.argv.slice(2) : ["phone", "desktop"];
for (const variant of variants) {
  const browser = await playwright.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
  try {
    if (!["phone", "desktop"].includes(variant)) throw new Error("Unknown variant");
    const phone = variant === "phone";
    const context = await browser.newContext({
      viewport: phone ? { width: 390, height: 650 } : { width: 1280, height: 640 },
      deviceScaleFactor: phone ? 2 : 1,
      reducedMotion: "reduce",
    });
    const errors = [],
      blockedRequests = [];
    // Both browser-side and Vite-side adapters prevent use of a real backend.
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ["data:", "blob:"].includes(url.protocol))
        return route.continue();
      blockedRequests.push(url.origin);
      return route.abort();
    });
    await context.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const pointer = document.createElement("div");
        pointer.id = "recording-pointer";
        pointer.style.left = "-50px";
        pointer.style.top = "-50px";
        document.body.append(pointer);
        document.addEventListener("mousemove", (e) => {
          pointer.style.left = `${e.clientX}px`;
          pointer.style.top = `${e.clientY}px`;
        });
        document.addEventListener("mousedown", () => pointer.classList.add("click"));
        document.addEventListener("mouseup", () =>
          setTimeout(() => pointer.classList.remove("click"), 350),
        );
        // A native print dialog cannot be recorded here. Only the genuine app preview is used.
        window.print = () => {
          throw new Error("Recording preview only — native print is disabled.");
        };
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(10000);
    const out = path.join(ROOT, ".cache/walkthrough-recordings", variant);
    await mkdir(out, { recursive: true });
    const point = async (locator) => {
      await locator.scrollIntoViewIfNeeded();
      await wait(180);
      const box = await locator.boundingBox();
      if (!box) throw new Error("Target has no visible box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await wait(250);
    };
    const click = async (locator) => {
      await point(locator);
      await locator.click();
      await wait(420);
    };
    const type = async (selector, text) => {
      const loc = page.locator(selector);
      await click(loc);
      await loc.pressSequentially(text, { delay: 55 });
      await wait(250);
    };
    const show = async (locator) => {
      await locator.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
      await wait(700);
      await point(locator);
    };
    const nav = async (name) => {
      if (phone) await click(page.getByRole("button", { name: "Open navigation menu" }));
      await click(page.getByRole("button", { name, exact: true }));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await wait(650);
    };
    const record = async (id, action) => {
      if (process.env.CAPTURE_ONLY && process.env.CAPTURE_ONLY !== id) return;
      const scene = pack.scenes.find((s) => s.id === id);
      const dir = path.join(out, id);
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      let done = false,
        frames = 0;
      const began = Date.now();
      const capture = (async () => {
        while (!done) {
          const tick = Date.now();
          await page.screenshot({
            path: path.join(dir, `${String(frames++).padStart(6, "0")}.jpg`),
            type: "jpeg",
            quality: 83,
          });
          await wait(Math.max(0, 125 - (Date.now() - tick)));
        }
      })();
      let error;
      try {
        await action();
        await wait(Math.max(0, scene.durationSec * 1000 - (Date.now() - began)));
      } catch (e) {
        error = e;
      } finally {
        done = true;
        await capture;
      }
      const meta = {
        id,
        frames,
        elapsedSec: (Date.now() - began) / 1000,
        minimumDurationSec: scene.durationSec,
        viewport: page.viewportSize(),
      };
      await writeFile(path.join(dir, "capture.json"), JSON.stringify(meta, null, 2) + "\n");
      console.log(variant, id, meta.frames, "frames", meta.elapsedSec, "seconds");
      if (error) throw error;
    };
    await page.goto(base);
    await page.getByRole("button", { name: "Register Your School", exact: true }).waitFor();
    await wait(1800);
    if (["05", "06", "07", "08"].includes(process.env.CAPTURE_ONLY)) {
      await page.goto(`${base}/login`);
      await page.locator("#login-staff-id").fill("owner@example.invalid");
      await page.locator("#login-staff-pin").fill("RecordingOnly!");
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      await page.getByRole("heading", { name: /School Dashboard/ }).waitFor();
    }
    await record("01", async () => {
      await wait(4200);
      await show(page.getByRole("button", { name: "Register Your School", exact: true }));
      await wait(1800);
      await click(page.getByRole("button", { name: "Register Your School", exact: true }));
    });
    await record("02", async () => {
      await type("#onb-school-name", "NDH Demo Academy");
      await type("#onb-address", "Fictional training school");
      await page
        .locator("input[type=file]")
        .setInputFiles("scripts/walkthrough-studio/demo-crest.png");
      await show(page.getByLabel("Country & Currency"));
      await wait(2000);
      await click(page.getByRole("button", { name: "Continue", exact: true }));
    });
    await record("03", async () => {
      await type("#onb-admin-name", "Demo School Owner");
      await type("#onb-admin-contact", "owner@example.invalid");
      await type("#onb-admin-pin", "RecordingOnly!");
      await click(page.getByRole("button", { name: "Continue", exact: true }));
      await wait(1500);
      await show(page.getByLabel("Active Term"));
      await wait(1500);
      await show(page.getByText("No — Single School Programme", { exact: true }));
      // Deliberately do NOT submit the registration or fabricate an email confirmation.
    });
    await record("04", async () => {
      await page.goto(`${base}/login`);
      await wait(900);
      await type("#login-staff-id", "owner@example.invalid");
      await type("#login-staff-pin", "RecordingOnly!");
      await click(page.getByRole("button", { name: "Sign In", exact: true }));
      await page.getByRole("heading", { name: /School Dashboard/ }).waitFor();
      await wait(2000);
    });
    await record("05", async () => {
      await nav("Settings");
      await wait(1200);
      await show(page.getByText("School Crest / Logo", { exact: true }));
      await wait(1500);
      await show(page.getByText("School Motto", { exact: true }));
      await wait(1800);
      await show(page.getByRole("heading", { name: "School portal & accounts" }));
      await wait(1000);
      await point(page.getByLabel("School portal link"));
    });
    await record("06", async () => {
      await nav("Staff & Payroll");
      await click(page.getByRole("tab", { name: /Staff & Role Assignments/ }));
      const filter = page.getByLabel("Filter by staff type");
      await point(filter);
      await filter.selectOption("non_teaching");
      await wait(1800);
      await point(filter);
      await filter.selectOption("teaching");
      await wait(1200);
      await show(page.getByRole("row").filter({ hasText: "Demo Class Teacher" }));
      // The true directory displays assigned class and subjects; scroll its table horizontally on phone.
      if (phone) {
        await page
          .locator("table")
          .evaluate((el) => el.parentElement.scrollTo({ left: 250, behavior: "smooth" }));
        await wait(1200);
      }
    });
    await record("07", async () => {
      await nav("Settings");
      await click(page.getByRole("tab", { name: "Optional Modules & Footer" }));
      await show(page.getByRole("button", { name: "Off by Default (Click to Enable)" }));
      // Show the genuine optional toggle without changing this conventional demo school.
    });
    await record("08", async () => {
      await nav("Dashboard");
      await show(page.getByRole("button", { name: "Report Card", exact: true }).first());
      await click(page.getByRole("button", { name: "Report Card", exact: true }).first());
      await page.locator("#ndh-print-portal .a4-preview").waitFor();
      await wait(1400);
      await page
        .locator("#ndh-print-portal")
        .evaluate((el) => el.scrollTo({ top: 140, behavior: "smooth" }));
      await wait(3000);
      await page.screenshot({ path: path.join(out, "a4-proof.jpg"), type: "jpeg", quality: 92 });
    });
    await record("09", async () => {
      await page.goto(`${base}/s/demo-academy`);
      await wait(900);
      await show(page.getByRole("button", { name: "Install school app" }));
      await click(page.getByRole("button", { name: "Install school app" }));
      await wait(3500);
      await page
        .getByRole("dialog")
        .screenshot({ path: path.join(out, "install-proof.jpg"), type: "jpeg", quality: 92 });
    });
    await writeFile(
      path.join(out, "qa.json"),
      JSON.stringify(
        {
          variant,
          errors,
          blockedExternalOrigins: [...new Set(blockedRequests)],
          demo: true,
          liveBackend: false,
        },
        null,
        2,
      ) + "\n",
    );
    if (errors.length) throw new Error(errors.join("\n"));
    await context.close();
  } finally {
    await browser.close();
  }
}
