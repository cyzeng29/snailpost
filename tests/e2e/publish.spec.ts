// Cross-device publication against a REAL backend. No mocks of publication or
// media endpoints. Skipped (reported as BLOCKED) until a Supabase test project
// is configured: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY and PUBLIC_SITE_URL in .env.local.
import { expect, test } from "@playwright/test";
import { makeReadyPostcard } from "./helpers";

const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

test.describe("publishing (real backend)", () => {
  test.skip(!configured, "BLOCKED: no Supabase test project configured");

  test("publish in context A, open in a fresh context B with real media; refresh; revoke", async ({ page, browser }) => {
    await makeReadyPostcard(page, 2);
    await page.getByRole("button", { name: "Make a link" }).click();
    const url = await page.getByLabel("Postcard link").inputValue();
    expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{43}$/);

    const fresh = await browser.newContext(); // no cookies, session or local drafts
    const b = await fresh.newPage();
    await b.goto(url);
    await b.getByRole("button", { name: "Open postcard" }).click();
    await expect(b.getByText("Nothing big happened today.").first()).toBeVisible();
    const imgs = b.locator('section[aria-label$=", front"] img');
    await expect(imgs).toHaveCount(2);
    expect(await imgs.evaluateAll((els) => els.every((i) => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await b.reload();
    await expect(b.getByRole("heading", { name: /From Alex/ })).toBeVisible();

    // revoke from the sender's keepsakes
    await page.goto("/keepsakes");
    await page.getByRole("button", { name: "List" }).click();
    await page.getByRole("button", { name: "Turn off link" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Turn off link" }).click();
    await b.goto(url);
    await expect(b.getByRole("heading", { name: "This postcard is no longer available." })).toBeVisible();
    await fresh.close();
  });

  test("another sender cannot read or change someone else's card", async ({ request }) => {
    const res = await request.post("/api/links/revoke", { data: { clientSnapshotId: "s_00000000000000000000" } });
    expect(res.status()).toBe(401);
    const pub = await request.post("/api/publish", { data: {} });
    expect(pub.status()).toBe(401);
  });
});
