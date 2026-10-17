// Visual check helper: screenshots routes at phone and desktop widths.
// Usage: node scripts/visual.mts <outDir> <baseUrl> <path>[@action] ...
//   action "open"  clicks "Open postcard" first
//   action "back"  also clicks "Read the back"
//   action "letter" clicks "Read as a letter"
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [outDir, base, ...routes] = process.argv.slice(2);
const widths = (process.env.WIDTHS ?? "320,390,1280").split(",").map(Number);
const textLarge = process.env.LARGE === "1";
mkdirSync(outDir, { recursive: true });

async function act(page: Page, action?: string) {
  if (!action) return;
  for (const a of action.split("+")) {
    if (a === "open") {
      const btn = page.getByRole("button", { name: "Open postcard" });
      if (await btn.isVisible()) await btn.click();
    }
    if (a === "back") await page.getByRole("button", { name: "Read the back" }).click();
    if (a === "letter") await page.getByRole("button", { name: "Read as a letter" }).click();
    await page.waitForTimeout(900);
  }
}

const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  if (textLarge)
    await ctx.addInitScript(() => localStorage.setItem("snailpost.appearance", JSON.stringify({ textSize: "large" })));
  const page = await ctx.newPage();
  for (const r of routes) {
    const [path, action] = r.split("@");
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await act(page, action);
    const name = `${path.replace(/\W+/g, "_") || "root"}${action ? "-" + action.replace(/\+/g, "-") : ""}-${w}${textLarge ? "-large" : ""}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(name, overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : "ok");
  }
  await ctx.close();
}
await browser.close();
