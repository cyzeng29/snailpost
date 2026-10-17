import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { makeReadyPostcard } from "./helpers";

test.describe("sharing honestly", () => {
  test("without a publishing backend, no personal link is invented", async ({ page }) => {
    await makeReadyPostcard(page, 1);
    await expect(page.getByTestId("links-unavailable")).toContainText("Sending links isn't switched on");
    await expect(page.locator('input[readonly][value*="/p/"]')).toHaveCount(0);
  });

  test.describe("the sample link (a real public URL)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/keepsakes");
      await page.getByRole("button", { name: "List" }).click();
    });

    test("copy link: success", async ({ page, context, browserName }) => {
      test.skip(browserName !== "chromium", "Clipboard permission grants are Chromium-only in Playwright");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Share the sample link" }).click();
      await page.getByRole("button", { name: "Copy link" }).click();
      await expect(page.getByText("Link copied.")).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/demo$/);
    });

    test("copy link: failure selects the link instead", async ({ page }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true });
      });
      await page.getByRole("button", { name: "Share the sample link" }).click();
      await page.getByRole("button", { name: "Copy link" }).click();
      await expect(page.getByText("Copying didn't work here.")).toBeVisible();
    });

    test("no share sheet available: Copy link is the visible primary action", async ({ page }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      });
      await page.getByRole("button", { name: "Share the sample link" }).click();
      await expect(page.getByRole("button", { name: "Share…" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copy link" })).toHaveClass(/btn-primary/);
    });

    test("share sheet cancelled is normal; completed never claims delivery", async ({ page }) => {
      await page.addInitScript(() => {
        let calls = 0;
        Object.defineProperty(navigator, "share", {
          value: () => (++calls === 1 ? Promise.reject(new DOMException("cancel", "AbortError")) : Promise.resolve()),
          configurable: true,
        });
        Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      });
      await page.reload();
      await page.getByRole("button", { name: "List" }).click();
      await page.getByRole("button", { name: "Share the sample link" }).click();
      await page.getByRole("button", { name: "Share…" }).click();
      await expect(page.getByText("No problem. The link is still ready whenever you are.")).toBeVisible();
      // cancelling is not an error state (Next's route announcer is the page's only role=alert)
      await expect(page.getByText(/didn't open|failed|error/i)).toHaveCount(0);
      await page.getByRole("button", { name: "Share…" }).click();
      await expect(page.getByText("Passed to your messaging app.")).toBeVisible();
      await expect(page.getByText(/delivered|was read|opened it/i)).toHaveCount(0);
    });
  });
});

test.describe("print", () => {
  test("downloads a two-page 6 × 4 in PDF bound to the shown postcard", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "Open postcard" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Print this postcard" }).click();
    const file = await (await download).path();
    const doc = await PDFDocument.load(readFileSync(file!));
    expect(doc.getPageCount()).toBe(2);
    for (const p of doc.getPages()) expect([p.getWidth(), p.getHeight()]).toEqual([432, 288]);
    expect(doc.getTitle()).toBe("Four little things from Thursday");
    await expect(page.getByText("Print at actual size (100%")).toBeVisible();
  });
});

test.describe("bearer-link pages", () => {
  test("an unknown link says so plainly, and is private, unindexed and unreferred", async ({ page }) => {
    const res = await page.goto("/p/not-a-real-token");
    await expect(page.getByRole("heading", { name: "This postcard is no longer available." })).toBeVisible();
    const h = res!.headers();
    expect(h["cache-control"]).toContain("no-store");
    expect(h["x-robots-tag"]).toContain("noindex");
    expect(h["referrer-policy"]).toBe("no-referrer");
    // generic preview: no private photo in the link preview metadata
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  });
});

test.describe("setting up how it opens for them", () => {
  test("new postcards start from the Settings defaults and can be changed per postcard", async ({ page }) => {
    await page.goto("/settings");
    const send = page.getByRole("region", { name: "For the people you send to" });
    await send.getByLabel("Largest").check(); // already the default
    await send.getByRole("checkbox", { name: /Start playing/ }).uncheck();

    await makeReadyPostcard(page);
    const setup = page.getByTestId("reading-setup");
    await expect(setup).toContainText("One page at a time, largest text");

    await page.getByRole("button", { name: "One page at a time" }).click();
    await expect(page.getByTestId("simple-reader")).toBeVisible();
    await expect(page.getByText("Page 1 of 5", { exact: true })).toBeVisible();

    // the setup is part of the ready version, so changing it asks for a new one
    await setup.locator("summary").click();
    await setup.getByLabel(/Everything on one page/).check();
    await expect(setup.locator("summary")).toContainText("Everything on one page");
    await expect(page.getByText("You've changed the postcard since this version.")).toBeVisible();
  });
});
