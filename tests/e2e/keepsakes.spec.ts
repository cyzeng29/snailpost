import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, makeReadyPostcard } from "./helpers";

test.describe("keepsake cluster", () => {
  test.beforeEach(async ({ page }) => {
    await makeReadyPostcard(page, 2);
    await page.goto("/keepsakes");
    await expect(page.getByTestId("cluster-resting")).toBeVisible();
  });

  test("rest → browse → select → turn → return, with focus restored", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).click();
    const trigger = page.getByRole("button", { name: /^Open postcard:/ }).first();
    const triggerLabel = await trigger.getAttribute("aria-label");
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("selected-card")).toBeVisible();
    const title = await dialog.locator("#selected-title").innerText();

    await dialog.getByRole("button", { name: "Read the back" }).click();
    await expect(dialog.getByRole("button", { name: "See the front" })).toBeVisible();
    // turning the card never changes which postcard is selected
    await expect(dialog.locator("#selected-title")).toHaveText(title);

    await dialog.getByRole("button", { name: "Back to keepsakes" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: triggerLabel! })).toBeFocused();
  });

  test("Next postcard moves on without turning the card over", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).click();
    await page.getByRole("button", { name: /^Open postcard:/ }).first().click();
    const dialog = page.getByRole("dialog");
    const first = await dialog.locator("#selected-title").innerText();
    await dialog.getByRole("button", { name: "Read the back" }).click();
    await dialog.getByRole("button", { name: "Next postcard" }).click();
    await expect(dialog.locator("#selected-title")).not.toHaveText(first);
    await expect(dialog.getByRole("button", { name: "Read the back" })).toBeVisible();
    await expect(dialog.locator('section[aria-label$=", front"]')).not.toHaveAttribute("inert");
  });

  test("keyboard only: Enter opens, Escape returns, focus goes back", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).focus();
    await page.keyboard.press("Enter");
    const card = page.getByRole("button", { name: /^Open postcard:/ }).first();
    await card.focus();
    const label = await card.getAttribute("aria-label");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#selected-title")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: label! })).toBeFocused();
  });

  test("rapid repeated taps never produce ghost cards or a stuck overlay", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).click();
    const cards = page.getByRole("button", { name: /^Open postcard:/ });
    // three taps in the same tick, before React can re-render
    await page.evaluate(() => {
      const b = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Open postcard:"]')];
      b[0].click();
      b[1].click();
      b[0].click();
    });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('[data-testid="selected-card"]')).toHaveCount(0);
    // usable again right away
    await cards.nth(1).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("resizing while a card is out keeps it usable", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).click();
    await page.getByRole("button", { name: /^Open postcard:/ }).first().click();
    await page.setViewportSize({ width: 340, height: 700 });
    await page.setViewportSize({ width: 1200, height: 850 });
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Read the back" }).click();
    await dialog.getByRole("button", { name: "Back to keepsakes" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the list alternative carries the same postcards and actions", async ({ page }) => {
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.getByRole("heading", { name: "Four little things from Thursday" })).toBeVisible();
    await expect(page.getByText("Ready, on this device")).toBeVisible();
    await expect(page.getByText("Sample", { exact: true })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("delete asks first and can be cancelled", async ({ page }) => {
    await page.getByRole("button", { name: "List" }).click();
    const before = await page.getByRole("button", { name: "Delete" }).count();
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByRole("dialog", { name: "Delete this postcard?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(before);
    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(before - 1);
  });

  test("automated accessibility scan: open card dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Browse postcards" }).click();
    await page.getByRole("button", { name: /^Open postcard:/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test("a ready version is frozen: later edits need an explicit update", async ({ page }) => {
  await makeReadyPostcard(page, 1);
  await page.getByRole("link", { name: "Keep editing" }).last().click();
  await page.getByLabel("Message").fill("Changed after it was ready.");
  await expect(page.getByText("Saved for later, on this device").filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: /Preview/ }).click();
  await expect(page.getByText("You've changed the postcard since this version.")).toBeVisible();
  await page.getByRole("button", { name: "Get the new version ready" }).click();
  await expect(page.getByText(/Version 2/)).toBeVisible();
});

test("double-tapping Ready to share makes one version", async ({ page }) => {
  await page.goto("/today");
  const { addMoments, SAMPLE_PHOTOS } = await import("./helpers");
  await addMoments(page, SAMPLE_PHOTOS.slice(0, 1));
  await page.getByRole("button", { name: "Make today's postcard" }).click();
  await page.getByRole("button", { name: "Next: your note" }).click();
  await page.getByLabel("Message").fill("Once.");
  await page.getByRole("button", { name: "Preview the postcard" }).click();
  const ready = page.getByRole("button", { name: "Ready to share" });
  await ready.dblclick();
  await expect(page.getByText(/Version 1,/)).toBeVisible();
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("snailpost");
        req.onsuccess = () => {
          const c = req.result.transaction("snapshots").objectStore("snapshots").count();
          c.onsuccess = () => resolve(c.result);
        };
      }),
  );
  expect(count).toBe(1);
});
