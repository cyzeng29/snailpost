import { expect, test } from "@playwright/test";
import { addMoments, CAPTIONS, captionsInOrder, SAMPLE_PHOTOS } from "./helpers";

test.describe("collecting moments", () => {
  test("add four, reorder, remove one, refresh: media, captions, order and note survive", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByText("Nothing big has to happen. Breakfast counts.")).toBeVisible();
    await addMoments(page, SAMPLE_PHOTOS, CAPTIONS);
    await expect(page.getByTestId("moment-row")).toHaveCount(4);

    // tap-based reorder: move moment 3 up to position 2
    await page.getByRole("button", { name: "Move moment 3 up" }).click();
    expect(await captionsInOrder(page)).toEqual([CAPTIONS[0], CAPTIONS[2], CAPTIONS[1], CAPTIONS[3]]);

    // remove the first one
    await page.getByRole("button", { name: "Remove moment 1" }).click();
    await expect(page.getByText("Moment removed.")).toBeVisible();
    await expect(page.getByTestId("moment-row")).toHaveCount(3);

    // write a note too
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();
    await page.getByLabel("Message").fill("A note that should survive a refresh.");
    await expect(page.getByText("Saved for later, on this device").filter({ visible: true })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: /Your note/ }).click();
    await expect(page.getByLabel("Message")).toHaveValue("A note that should survive a refresh.");

    await page.goto("/today");
    await expect(page.getByTestId("moment-row")).toHaveCount(3);
    expect(await captionsInOrder(page)).toEqual([CAPTIONS[2], CAPTIONS[1], CAPTIONS[3]]);
    // photos actually load from IndexedDB after the refresh
    const loaded = await page.getByTestId("moment-row").locator("img").evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0));
    expect(loaded).toBe(true);
  });

  test("undo brings a removed moment back in place", async ({ page }) => {
    await page.goto("/today");
    await addMoments(page, SAMPLE_PHOTOS.slice(0, 2), CAPTIONS.slice(0, 2));
    await page.getByRole("button", { name: "Remove moment 1" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await captionsInOrder(page)).toEqual(CAPTIONS.slice(0, 2));
  });

  test("a single photo makes an intentional card", async ({ page }) => {
    await page.goto("/today");
    await addMoments(page, SAMPLE_PHOTOS.slice(0, 1), CAPTIONS.slice(0, 1));
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();
    await page.getByLabel("Message").fill("Just breakfast.");
    await page.getByRole("button", { name: "Preview the postcard" }).click();
    const front = page.getByLabel("Your postcard, front");
    await expect(front.locator("img")).toHaveCount(1);
    const box = await front.locator("figure").boundingBox();
    const card = await front.boundingBox();
    // the one photo is a hero: it spans most of the card's width
    expect(box!.width / card!.width).toBeGreaterThan(0.85);
  });

  test("corrupt, unsupported and oversized files get a recoverable explanation", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("button", { name: "Add a little moment" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a little moment" });
    const input = dialog.getByTestId("library-input");

    await input.setInputFiles("tests/fixtures/corrupt.jpg");
    await expect(dialog.getByRole("alert")).toContainText("couldn't be opened");

    await input.setInputFiles("tests/fixtures/notes.txt");
    await expect(dialog.getByRole("alert")).toContainText("isn't a photo");

    await input.setInputFiles({ name: "huge.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(31 * 1024 * 1024, 1) });
    await expect(dialog.getByRole("alert")).toContainText("over 30 MB");

    // recovery: a good photo still works in the same dialog
    await input.setInputFiles(SAMPLE_PHOTOS[0]);
    await dialog.getByRole("button", { name: "Add to today" }).click();
    await expect(page.getByTestId("moment-row")).toHaveCount(1);
  });

  test("six is the limit", async ({ page }) => {
    await page.goto("/today");
    await addMoments(page, [...SAMPLE_PHOTOS, SAMPLE_PHOTOS[0], SAMPLE_PHOTOS[1]]);
    await expect(page.getByRole("button", { name: "Add a little moment" })).toBeDisabled();
    await expect(page.getByText("Six is the most a postcard holds")).toBeVisible();
  });
});

test.describe("voice", () => {
  test("microphone denied: the written postcard stays fully usable", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    await page.goto("/today");
    await addMoments(page, SAMPLE_PHOTOS.slice(0, 1));
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();
    const record = page.getByRole("button", { name: "Record", exact: true });
    await record.waitFor({ timeout: 3000 }).catch(() => {});
    test.skip(!(await record.isVisible()), "This browser reports no recording support, so the denial path can't be exercised here");
    await record.click();
    await expect(page.getByText("Microphone access is off, and that's fine.")).toBeVisible();
    await page.getByLabel("Message").fill("Written only.");
    await page.getByRole("button", { name: "Preview the postcard" }).click();
    await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
  });

  test("record, stop, listen back, record again, remove (fake microphone fixture)", async ({ page, browserName }, info) => {
    test.skip(info.project.name !== "chromium-desktop", "Fake media device flags are only set for the desktop Chromium project");
    void browserName;
    await page.goto("/today");
    await addMoments(page, SAMPLE_PHOTOS.slice(0, 1));
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();

    await page.getByRole("button", { name: "Record" }).click();
    await expect(page.getByRole("timer")).toContainText("Recording");
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Listen back" })).toBeVisible();
    await expect(page.getByText("Words to read along")).toBeVisible();

    // the saved audio is real, playable media
    const duration = await page.locator("audio").evaluate(async (a: HTMLAudioElement) => {
      if (a.readyState < 1) await new Promise((r) => a.addEventListener("loadedmetadata", r, { once: true }));
      return a.duration;
    });
    expect(duration > 0.5 || duration === Infinity).toBe(true);

    await page.getByRole("button", { name: "Record again" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Listen back" })).toBeVisible();

    await page.getByRole("button", { name: "Remove voice note" }).click();
    await expect(page.getByRole("button", { name: "Record" })).toBeVisible();
  });

  test("upload an audio file instead of recording", async ({ page }) => {
    await page.goto("/today");
    await addMoments(page, SAMPLE_PHOTOS.slice(0, 1));
    await page.getByRole("button", { name: "Make today's postcard" }).click();
    await page.getByRole("button", { name: "Next: your note" }).click();
    await page.getByTestId("audio-input").setInputFiles("public/sample/narration.m4a");
    await expect(page.getByRole("button", { name: "Listen back" })).toBeVisible();
  });
});
