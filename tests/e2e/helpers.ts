import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const SAMPLE_PHOTOS = ["breakfast", "walk", "practice", "dinner"].map((n) => `public/sample/${n}.jpg`);
export const CAPTIONS = [
  "Tried your eggs. Still not as good as yours.",
  "The leaves finally started turning.",
  "Stayed a little late. Felt good to be outside.",
  "We ate together. I saved you a story.",
];

/** Add moments through the real dialog and file input. */
export async function addMoments(page: Page, files: string[], captions: string[] = []) {
  for (let i = 0; i < files.length; i++) {
    await page.getByRole("button", { name: "Add a little moment" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add a little moment" });
    await dialog.getByTestId("library-input").setInputFiles(files[i]);
    if (captions[i]) await dialog.getByLabel(/Caption/).fill(captions[i]);
    await dialog.getByRole("button", { name: "Add to today" }).click();
    await expect(dialog).toBeHidden();
  }
}

export async function captionsInOrder(page: Page) {
  return page.getByTestId("moment-row").locator("textarea").evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
}

/** Make a ready postcard from scratch and land on the preview's share panel. */
export async function makeReadyPostcard(page: Page, count = 2) {
  await page.goto("/today");
  await addMoments(page, SAMPLE_PHOTOS.slice(0, count), CAPTIONS.slice(0, count));
  await page.getByRole("button", { name: "Make today's postcard" }).click();
  await page.getByRole("button", { name: "Next: your note" }).click();
  await page.getByLabel("Dear…").fill("Grandma");
  await page.getByLabel(/Love,/).fill("Alex");
  await page.getByLabel("Message").fill("Nothing big happened today. I just wanted you to be in it.");
  await page.getByRole("button", { name: "Preview the postcard" }).click();
  await page.getByRole("button", { name: "Ready to share" }).click();
  await expect(page.getByRole("heading", { name: "A little of your day, ready to go." })).toBeVisible();
}

/** Automated accessibility scan (WCAG 2 A/AA). Not complete proof; see the manual checks in the build log. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Focus must never land inside an inert (hidden) card face. */
export async function activeElementIsInert(page: Page) {
  return page.evaluate(() => !!document.activeElement?.closest("[inert]"));
}
