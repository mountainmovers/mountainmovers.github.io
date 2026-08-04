import { test, expect } from "@playwright/test";

const routes = ["/", "/about/", "/founder/", "/podcast/", "/donate/", "/contact/", "/spiritual-gifts-inventory/"];

for (const route of routes) {
  test(`SEO meta present: ${route}`, async ({ page }) => {
    // Meta tags are in the parsed HTML — don't wait for the homepage's
    // large editorial images to finish loading.
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /mountainmovers|localhost|gitlab/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /.+/);
    // Script tags have no "visible text" — read textContent directly.
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain("Mountain Movers International");
    // Exactly one h1 per page
    await expect(page.locator("h1")).toHaveCount(1);
  });
}
