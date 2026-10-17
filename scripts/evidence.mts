// Captures the visual-check set into docs/evidence: Today, Compose, card
// front/back, Reader, the resting and selected cluster, at narrow phone,
// standard phone and desktop widths, plus enlarged text and both appearances.
// Usage: npx tsx scripts/evidence.mts [baseUrl]   (server must be running)
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const out = join(import.meta.dirname, "..", "docs", "evidence");
mkdirSync(out, { recursive: true });
const photos = ["breakfast", "walk", "practice", "dinner"].map((n) => `public/sample/${n}.jpg`);
const captions = ["Tried your eggs. Still not as good as yours.", "The leaves finally started turning.", "Stayed a little late. Felt good to be outside.", "We ate together. I saved you a story."];
const report: string[] = [];

async function shot(page: Page, name: string, full = true) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `${name}.jpg`), fullPage: full, type: "jpeg", quality: 72 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  report.push(`${name}: ${overflow > 0 ? `OVERFLOW ${overflow}px` : "no horizontal overflow"}`);
}

const browser = await chromium.launch();
for (const [w, h] of [[320, 700], [390, 844], [1280, 900]] as const) {
  for (const large of w === 390 ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    if (large) await ctx.addInitScript(() => localStorage.setItem("snailpost.appearance", JSON.stringify({ textSize: "large" })));
    const page = await ctx.newPage();
    const tag = `${w}${large ? "-large" : ""}`;

    await page.goto(`${base}/today`);
    await shot(page, `today-empty-${tag}`);
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Add a little moment" }).first().click();
      const d = page.getByRole("dialog", { name: "Add a little moment" });
      await d.getByTestId("library-input").setInputFiles(photos[i]);
      await d.getByLabel(/Caption/).fill(captions[i]);
      await d.getByRole("button", { name: "Add to today" }).click();
      await d.waitFor({ state: "hidden" });
    }
    await shot(page, `today-${tag}`);
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();
    await page.getByLabel("Dear…").fill("Grandma");
    await page.getByLabel(/Love,/).fill("Alex");
    await page.getByLabel("Message").fill("Nothing big happened today. I just wanted you to be in it.");
    await shot(page, `compose-${tag}`);
    await page.getByRole("button", { name: "Preview the postcard" }).click();
    await shot(page, `preview-front-${tag}`);
    await page.getByRole("button", { name: "Read the back" }).click();
    await shot(page, `preview-back-${tag}`);
    await page.getByRole("button", { name: "Ready to share" }).click();
    await page.goto(`${base}/keepsakes`);
    await shot(page, `cluster-resting-${tag}`);
    await page.getByRole("button", { name: "Browse postcards" }).first().click();
    await page.getByRole("button", { name: /^Open postcard:/ }).first().click();
    await shot(page, `cluster-selected-${tag}`, false);
    await page.keyboard.press("Escape");

    await page.goto(`${base}/demo`);
    await shot(page, `reader-envelope-${tag}`);
    await page.getByRole("button", { name: "Open postcard" }).click();
    await shot(page, `reader-${tag}`);
    await page.getByRole("button", { name: "Read as a letter" }).click();
    await shot(page, `reader-letter-${tag}`);
    await ctx.close();
  }
}
// the creator can choose the calm look too
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem("snailpost.appearance", JSON.stringify({ creator: "reading" })));
const page = await ctx.newPage();
await page.goto(`${base}/today`);
await shot(page, "today-easy-reading-390");
await browser.close();
console.log(report.join("\n"));
