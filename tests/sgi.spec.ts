import { test, expect, type Page } from "@playwright/test";

// Contract tests for the Spiritual Gifts Inventory port (ADR 0004).
// Network is stubbed — no real Mailchimp/FormSubmit traffic.

const SGI = "/spiritual-gifts-inventory/";

async function stubMailchimp(page: Page, result = "success") {
  await page.route("**/subscribe/post-json*", async (route) => {
    const url = new URL(route.request().url());
    const cb = url.searchParams.get("c") ?? "cb";
    await route.fulfill({
      contentType: "application/javascript",
      body: `${cb}({"result":"${result}","msg":"ok"})`,
    });
  });
}

test("gate validates email and unlocks quiz on subscribe", async ({ page }) => {
  await stubMailchimp(page);
  await page.goto(SGI);

  await expect(page.locator("#sgi-quiz")).toBeHidden();
  await page.fill("#sgi-email", "not-an-email");
  await page.click('#sgi-gate-form input[type="submit"]');
  await expect(page.locator("#sgi-gate-msg")).toContainText("valid email");

  await page.fill("#sgi-email", "test@example.com");
  await page.click('#sgi-gate-form input[type="submit"]');
  await expect(page.locator("#sgi-quiz")).toBeVisible();

  // Contract: localStorage keys
  expect(await page.evaluate(() => localStorage.getItem("sgi.subscribed"))).toBe("1");
  expect(await page.evaluate(() => localStorage.getItem("sgi.email"))).toBe("test@example.com");
});

test("gate fails open when Mailchimp is unreachable", async ({ page }) => {
  await page.route("**/subscribe/post-json*", (route) => route.abort());
  await page.goto(SGI);
  await page.fill("#sgi-email", "test@example.com");
  await page.click('#sgi-gate-form input[type="submit"]');
  await expect(page.locator("#sgi-quiz")).toBeVisible({ timeout: 15000 });
});

test("known answer vector produces the contract scores and posts results", async ({ page }) => {
  test.setTimeout(120000);
  await stubMailchimp(page);
  let resultsBody: Record<string, string> | undefined;
  await page.route("**/formsubmit.co/ajax/**", async (route) => {
    resultsBody = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: '{"success":"true"}' });
  });

  await page.goto(SGI);
  await page.fill("#sgi-email", "vector@example.com");
  await page.click('#sgi-gate-form input[type="submit"]');
  await expect(page.locator("#sgi-quiz")).toBeVisible();

  // Known vector: n%22==1 → 4 (Apostle=20), n%22==2 → 3 (Prophet=15), else 0.
  await page.evaluate(() => {
    for (let n = 1; n <= 110; n++) {
      const value = n % 22 === 1 ? 4 : n % 22 === 2 ? 3 : 0;
      const input = document.querySelector<HTMLInputElement>(
        `input[name="q${n}"][value="${value}"]`,
      );
      input!.click();
    }
  });
  await expect(page.locator("#sgi-progress-count")).toHaveText("110");

  await page.click('#sgi-quiz-form input[type="submit"]');
  await expect(page.locator("#sgi-results")).toBeVisible();

  const rows = page.locator("#sgi-results-list .sgi-result");
  await expect(rows).toHaveCount(22);
  await expect(rows.nth(0)).toContainText("Apostle");
  await expect(rows.nth(0)).toContainText("20 / 20");
  await expect(rows.nth(1)).toContainText("Prophet");
  await expect(rows.nth(1)).toContainText("15 / 20");

  // Contract: FormSubmit body shape
  expect(resultsBody).toBeDefined();
  expect(resultsBody!._subject).toBe("Spiritual Gifts Inventory results");
  expect(resultsBody!._template).toBe("table");
  expect(resultsBody!.email).toBe("vector@example.com");
  expect(resultsBody!.dominant).toContain("Apostle (20)");
  expect(resultsBody!.dominant).toContain("Prophet (15)");
  expect(resultsBody!.all_scores.split(",").length).toBe(22);
});

test("submit blocks and highlights when questions are unanswered", async ({ page }) => {
  await stubMailchimp(page);
  await page.goto(SGI);
  await page.fill("#sgi-email", "test@example.com");
  await page.click('#sgi-gate-form input[type="submit"]');
  await page.click('input[name="q1"][value="4"]');
  await page.click('#sgi-quiz-form input[type="submit"]');
  await expect(page.locator("#sgi-quiz-msg")).toContainText("109 remaining");
  await expect(page.locator("#sgi-q2")).toHaveClass(/unanswered/);
  await expect(page.locator("#sgi-results")).toBeHidden();
});

test("answers persist across reload; retake clears only sgi.answers", async ({ page }) => {
  await stubMailchimp(page);
  await page.goto(SGI);
  await page.fill("#sgi-email", "test@example.com");
  await page.click('#sgi-gate-form input[type="submit"]');
  await page.click('input[name="q1"][value="4"]');

  await page.reload();
  // Returning visitor: gate skipped, answer restored
  await expect(page.locator("#sgi-quiz")).toBeVisible();
  await expect(page.locator('input[name="q1"][value="4"]')).toBeChecked();
  await expect(page.locator("#sgi-progress-count")).toHaveText("1");

  // Complete + retake
  await page.evaluate(() => {
    for (let n = 1; n <= 110; n++) {
      document.querySelector<HTMLInputElement>(`input[name="q${n}"][value="0"]`)!.click();
    }
  });
  await page.route("**/formsubmit.co/ajax/**", (route) =>
    route.fulfill({ contentType: "application/json", body: '{"success":"true"}' }),
  );
  await page.click('#sgi-quiz-form input[type="submit"]');
  await expect(page.locator("#sgi-results")).toBeVisible();
  await page.click("#sgi-retake");
  await expect(page.locator("#sgi-quiz")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sgi.answers"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("sgi.subscribed"))).toBe("1");
  expect(await page.evaluate(() => localStorage.getItem("sgi.email"))).toBe("test@example.com");
});
