import { test, expect } from "@playwright/test";

// Newsletter signup relays to FormSubmit (interim while the Mailchimp list
// is dead). Network is stubbed — no real submissions.

const LOCATIONS = ["/", "/contact/"];

for (const route of LOCATIONS) {
  test(`newsletter form on ${route} submits to FormSubmit and confirms`, async ({ page }) => {
    let body: Record<string, string> | undefined;
    await page.route("**/formsubmit.co/ajax/**", async (route_) => {
      body = route_.request().postDataJSON();
      await route_.fulfill({ contentType: "application/json", body: '{"success":"true"}' });
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });
    const form = page.locator(".newsletter-form").first();
    await form.scrollIntoViewIfNeeded();
    await form.locator('input[type="email"]').fill("subscriber@example.com");
    await form.locator('button[type="submit"]').click();

    await expect(form.locator(".newsletter-msg")).toContainText("You're on the list");
    expect(body).toBeDefined();
    expect(body!._subject).toBe("New mailing list signup");
    expect(body!.email).toBe("subscriber@example.com");
    // Input cleared for a second signup
    await expect(form.locator('input[type="email"]')).toHaveValue("");
    // FormSubmit honeypot must ship with the form
    await expect(form.locator('input[name="_honey"]')).toHaveCount(1);
  });
}

test("newsletter form rejects an invalid email without a request", async ({ page }) => {
  let requested = false;
  await page.route("**/formsubmit.co/**", async (route_) => {
    requested = true;
    await route_.fulfill({ contentType: "application/json", body: "{}" });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.locator(".newsletter-form").first();
  await form.locator('input[type="email"]').fill("not-an-email");
  await form.locator('button[type="submit"]').click();

  await expect(form.locator(".newsletter-msg")).toContainText("valid email");
  expect(requested).toBe(false);
});

test("newsletter form surfaces relay failure", async ({ page }) => {
  await page.route("**/formsubmit.co/**", (route_) => route_.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.locator(".newsletter-form").first();
  await form.locator('input[type="email"]').fill("subscriber@example.com");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator(".newsletter-msg")).toContainText("went wrong");
});
