import { test, expect } from "@playwright/test";

// Donorbox is a cross-origin iframe and a real payment processor — the
// interior checkout can't (and shouldn't) be driven by CI. These tests
// pin the embed contract: right campaign, right widget, present on every
// page that promises a way to give.

// widget.js rewrites the src at runtime (appends query params) — match prefix.
const CAMPAIGN_SRC = /^https:\/\/donorbox\.org\/embed\/mountainmovers/;
const PAGES_WITH_DONATE = ["/", "/donate/"];

for (const route of PAGES_WITH_DONATE) {
  test(`Donorbox embed wired on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const iframe = page.locator('iframe[name="donorbox"]');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute("src", CAMPAIGN_SRC);
    // Accessible name for screen readers
    await expect(iframe).toHaveAttribute("title", /donate/i);
    // Widget script that auto-resizes the frame
    expect(await page.locator('script[src="https://donorbox.org/widget.js"]').count()).toBe(1);
  });
}

test("SGI results section carries the Donorbox embed", async ({ page }) => {
  await page.goto("/spiritual-gifts-inventory/", { waitUntil: "domcontentloaded" });
  // Results section is hidden until the quiz completes, but the embed must
  // be present in the DOM so it's there the moment results render.
  const iframe = page.locator('#sgi-results iframe[name="donorbox"]');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute("src", CAMPAIGN_SRC);
});

test("header and homepage donate CTAs lead to the donate embed", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header .donate-cta")).toHaveAttribute("href", "/donate/");
  // Homepage donate band anchor still exists for legacy /#donate links
  await expect(page.locator("#donate")).toHaveCount(1);
});
