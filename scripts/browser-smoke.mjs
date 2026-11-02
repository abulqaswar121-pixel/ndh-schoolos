import { chromium, expect } from "@playwright/test";
import chromiumBinary from "@sparticuz/chromium";
import { inflate } from "../node_modules/@sparticuz/chromium/build/lambdafs.js";
import path from "node:path";
await inflate(path.resolve("node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
process.env.LD_LIBRARY_PATH = "/tmp/al2023/lib";
const browser = await chromium.launch({
  executablePath: await chromiumBinary.executablePath(),
  args: chromiumBinary.args,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "School overview" })).toBeVisible();
  await expect(page.getByText("Your school’s story starts here")).toBeVisible();
  await page.getByRole("button", { name: "Let’s set up your school" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByPlaceholder("Enter your school’s official name").fill("Browser test workspace");
  await modal.getByRole("button", { name: /Integrated/ }).click();
  await modal.getByRole("button", { name: "Continue", exact: true }).click();
  await modal.getByLabel(/Your class or halqah names/).fill("User-created class");
  await modal.getByRole("button", { name: "Continue", exact: true }).click();
  await modal.getByLabel("Your full name").fill("Browser test administrator");
  await modal.getByLabel("Email or phone number").fill("test@example.invalid");
  await modal.getByLabel("Create an administrator PIN").fill("627491");
  await modal.getByRole("button", { name: "Create school workspace" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Browser." })).toBeVisible();
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ndh_schoolos_live_v3")),
  );
  if (
    snapshot.students.length ||
    snapshot.subjects.length ||
    snapshot.payments.length ||
    snapshot.classes.length !== 1 ||
    snapshot.staff.length !== 1
  )
    throw Error("Empty database contract violated");
  if (!snapshot.settings.enableQuranModule)
    throw Error("Integrated school did not enable Quran tracking");
  for (const label of [
    "Students",
    "Classes & groups",
    "Academics & results",
    "Tahfeez & Islamiyya",
    "Attendance",
    "Fees & payments",
    "Staff & payroll",
    "ID cards",
    "Reports",
    "School settings",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: label, exact: label !== "Tahfeez & Islamiyya" })
      .click();
    await page.waitForTimeout(250);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error(`Desktop overflow: ${label}`);
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Attendance", exact: true })
    .click();
  await page.getByRole("button", { name: "Weekly timetable", exact: true }).click();
  await expect(page.getByText("A little structure for the school week")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const label of [
    "Students",
    "Classes & groups",
    "Fees & payments",
    "Staff & payroll",
    "ID cards",
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await page.waitForTimeout(250);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error(`Mobile overflow: ${label}`);
  }
  await page.goto("http://localhost:8080/platform", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Your platform. Ready to connect." }),
  ).toBeVisible();
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Your school’s story starts here")).toBeVisible();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: integrated onboarding, empty data, persistence, all modules, timetable, desktop/mobile overflow, owner setup, sign-out; no runtime errors.",
  );
} finally {
  await browser.close();
}
