import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/about/",
  "/founder/",
  "/podcast/",
  "/spiritual-gifts-inventory/",
  "/donate/",
  "/contact/",
];

for (const route of routes) {
  test(`axe WCAG 2.1 AA: ${route}`, async ({ page }) => {
    // DOM (not image bytes) is what axe scans — avoid load-event flake from
    // the homepage's large editorial images.
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Third-party embeds are outside our control; everything else is ours.
      .exclude("iframe[name=donorbox]")
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
