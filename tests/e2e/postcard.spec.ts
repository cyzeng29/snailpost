import { expect, test } from "@playwright/test";
import { activeElementIsInert, expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

async function openDemo(page: import("@playwright/test").Page) {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "A little of Alex's day, for you." })).toBeVisible();
  await page.getByRole("button", { name: "Open postcard" }).click();
  await expect(page.getByRole("heading", { name: /From Alex/ })).toBeVisible();
  // let the short entrance finish so checks see the settled page
  await expect(page.locator("main").first()).toHaveCSS("opacity", "1");
}

test.describe("recipient opening and the card turn", () => {
  test("opens without an account, defaults to Easy Reading, never autoplays", async ({ page }) => {
    await openDemo(page);
    await expect(page.locator("html")).toHaveAttribute("data-appearance", "reading");
    await expect(page.getByText("Sample postcard.")).toBeVisible();
    const paused = await page.locator("audio").evaluate((a: HTMLAudioElement) => a.paused);
    expect(paused).toBe(true);
    await expect(page.getByRole("button", { name: "Play Alex's voice" })).toBeVisible();
  });

  test("repeat visits skip the envelope", async ({ page }) => {
    await openDemo(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: /From Alex/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open postcard" })).toHaveCount(0);
  });

  test("turns over with pointer and keyboard; the hidden face is never focusable", async ({ page }) => {
    await openDemo(page);
    const front = page.locator('section[aria-label$=", front"]');
    const back = page.locator('section[aria-label$=", back"]');
    await expect(back).toHaveAttribute("inert", "");

    // pointer: tap the card itself
    await front.click();
    await expect(back).not.toHaveAttribute("inert");
    await expect(front).toHaveAttribute("inert", "");

    // keyboard: the labelled control
    const turn = page.getByRole("button", { name: "See the front" });
    await turn.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Read the back" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "See the front" })).toBeVisible();

    // tab through the whole page: focus must never enter the inert face
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      expect(await activeElementIsInert(page)).toBe(false);
    }
  });

  test("text is never mirrored after turning", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Read the back" }).click();
    await page.waitForTimeout(800);
    const back = page.locator('section[aria-label$=", back"]');
    // the back face is pre-rotated 180° inside a parent rotated 180°: net transform must be unmirrored
    const det = await back.evaluate((el) => {
      let m = new DOMMatrix();
      for (let n: Element | null = el; n; n = n.parentElement) m = new DOMMatrix(getComputedStyle(n).transform === "none" ? undefined : getComputedStyle(n).transform).multiply(m);
      return m.a; // x scale: positive means not mirrored
    });
    expect(det).toBeGreaterThan(0);
  });

  test("reduced motion switches faces without a slow turn", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDemo(page);
    await page.getByRole("button", { name: "Read the back" }).click();
    await page.waitForTimeout(80); // far less than the 650 ms turn
    const rotation = await page.locator('[data-face] [style*="preserve-3d"] [style*="preserve-3d"]').first().evaluate((el) => getComputedStyle(el).transform);
    expect(rotation).toMatch(/matrix3d\(-1|matrix\(-1/);
  });

  test("Read as a letter shows everything in order, in normal document flow", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Read as a letter" }).click();
    const letter = page.getByRole("article", { name: "The postcard as a letter" });
    await expect(letter.getByText("Dear Grandma,")).toBeVisible();
    const captions = await letter.locator("figcaption").allInnerTexts();
    expect(captions.map((c) => c.split("— ")[1])).toEqual([
      "Tried your eggs. Still not as good as yours.",
      "The leaves finally started turning.",
      "Stayed a little late. Felt good to be outside.",
      "We ate together. I saved you a story.",
    ]);
    await expect(letter.getByText(/What the voice note says \(transcript\)/)).toBeVisible();
  });

  test("failed audio explains gently and keeps the written story", async ({ page }) => {
    await page.route("**/sample/narration.m4a", (r) => r.fulfill({ status: 404, body: "" }));
    await openDemo(page);
    await expect(page.getByText("The voice note isn't loading. You can still read the postcard.")).toBeVisible();
    await expect(page.getByText("Nothing big happened today. I just wanted you to be in it.").first()).toBeVisible();
  });

  test("larger text setting persists and reflows without horizontal scroll", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Use larger text" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
    await expectNoHorizontalOverflow(page);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  });

  test("automated accessibility scan: recipient page (card and letter)", async ({ page }) => {
    await openDemo(page);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Read as a letter" }).click();
    await page.waitForTimeout(300); // let the 150 ms button colour transition settle
    await expectNoA11yViolations(page);
  });
});

test.describe("layout at every width", () => {
  for (const width of [320, 390, 1280]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/today", "/keepsakes", "/settings", "/demo"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});

test.describe("automated accessibility scan: creator pages", () => {
  for (const path of ["/today", "/keepsakes", "/settings"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoA11yViolations(page);
    });
  }
});
