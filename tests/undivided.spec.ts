import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The Undivided Assessment (ADR 0006), mirroring the SGI contract tests.
// Network is stubbed — no real Mailchimp/FormSubmit traffic.

const UA = "/undivided-assessment/";

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

async function captureResults(page: Page) {
  const bodies: Record<string, string>[] = [];
  await page.route("**/formsubmit.co/ajax/**", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ contentType: "application/json", body: '{"success":"true"}' });
  });
  return bodies;
}

async function unlock(page: Page, email = "reader@example.com") {
  await page.fill("#ua-email", email);
  await page.click('#ua-gate-form input[type="submit"]');
  await expect(page.locator("#ua-quiz")).toBeVisible();
}

// Answer every question; perPart[i] is the 0-4 value (or five values) for part i.
async function answerAll(page: Page, perPart: (number | number[])[]) {
  await page.evaluate((perPart) => {
    for (let n = 1; n <= 25; n++) {
      const part = (n - 1) % 5;
      const round = Math.floor((n - 1) / 5);
      const spec = perPart[part];
      const value = Array.isArray(spec) ? spec[round] : spec;
      document.querySelector<HTMLInputElement>(`input[name="q${n}"][value="${value}"]`)!.click();
    }
  }, perPart);
  await expect(page.locator("#ua-progress-count")).toHaveText("25");
}

test("page renders with intro, 25 labelled statements and SEO meta", async ({ page }) => {
  await page.goto(UA);
  await expect(page.locator("h1")).toHaveText("The Undivided Assessment");
  await expect(page.locator("#ua-gate")).toContainText(
    "the Undivided Assessment from the book Undivided: What Science Is Discovering About the Whole Person God Made, by C.W. Hamit",
  );
  await expect(page.locator("#ua-quiz")).toBeHidden();
  await expect(page.locator("#ua-quiz-form fieldset")).toHaveCount(25);
  await expect(page.locator("#ua-quiz-form fieldset legend")).toHaveCount(25);
  await expect(page.locator('#ua-q1 input[type="radio"]')).toHaveCount(5);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/undivided-assessment\/$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Undivided Assessment",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", /.+/);
  // Reflection-tool note is always on the page.
  await expect(page.locator(".ua-note")).toContainText("not a medical or psychological assessment");
});

test("gate validates email and unlocks on subscribe", async ({ page }) => {
  await stubMailchimp(page);
  await page.goto(UA);

  await page.fill("#ua-email", "not-an-email");
  await page.click('#ua-gate-form input[type="submit"]');
  await expect(page.locator("#ua-gate-msg")).toContainText("valid email");
  await expect(page.locator("#ua-quiz")).toBeHidden();

  await unlock(page, "test@example.com");
  expect(await page.evaluate(() => localStorage.getItem("ua.subscribed"))).toBe("1");
  expect(await page.evaluate(() => localStorage.getItem("ua.email"))).toBe("test@example.com");
  // Separate namespace: the SGI's keys are untouched.
  expect(await page.evaluate(() => localStorage.getItem("sgi.subscribed"))).toBeNull();
});

test("gate fails open when Mailchimp is unreachable", async ({ page }) => {
  await page.route("**/subscribe/post-json*", (route) => route.abort());
  await page.goto(UA);
  await page.fill("#ua-email", "test@example.com");
  await page.click('#ua-gate-form input[type="submit"]');
  await expect(page.locator("#ua-quiz")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#ua-gate-msg")).toBeHidden(); // gate section hidden with it
  expect(await page.evaluate(() => localStorage.getItem("ua.subscribed"))).toBe("1");
});

test("known answer set scores each part and posts the results shape", async ({ page }) => {
  await stubMailchimp(page);
  const bodies = await captureResults(page);
  await page.goto(UA);
  await unlock(page, "vector@example.com");

  // Heart 4s → 20, Soul 3s → 15, Mind 2s → 10, Strength 1s → 5, Neighbor 0s → 0.
  await answerAll(page, [4, 3, 2, 1, 0]);
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect(page.locator("#ua-results")).toBeVisible();
  await expect(page.locator("#ua-results-heading")).toBeFocused();

  const rows = page.locator("#ua-results-list .ua-result");
  await expect(rows).toHaveCount(5);
  const expected = [
    ["Heart", "20", "Strong"],
    ["Soul", "15", "Steady"],
    ["Mind", "10", "Steady"],
    ["Strength", "5", "Growing"],
    ["Neighbor", "0", "Growing"],
  ];
  for (const [i, [name, score, band]] of expected.entries()) {
    await expect(rows.nth(i).locator("h3")).toHaveText(name);
    await expect(rows.nth(i).locator(".ua-score")).toContainText(`${score} / 20`);
    await expect(rows.nth(i).locator(".ua-band")).toHaveText(band);
    await expect(rows.nth(i).locator(".ua-chapters")).toContainText("Chapter");
    // Bars are decorative; the text carries the score.
    await expect(rows.nth(i).locator(".ua-bars")).toHaveAttribute("aria-hidden", "true");
  }
  // First take: no before/after line yet.
  await expect(page.locator(".ua-prev")).toHaveCount(0);

  await expect.poll(() => bodies.length).toBe(1);
  const body = bodies[0];
  expect(body._subject).toBe("Undivided Assessment results");
  expect(body._template).toBe("table");
  expect(body.email).toBe("vector@example.com");
  expect(body.scores).toBe("Heart (20), Soul (15), Mind (10), Strength (5), Neighbor (0)");
  expect(body.strongest).toBe("Heart (20)");
  expect(body.growing).toBe("Neighbor (0)");
  expect(Object.keys(body).sort()).toEqual(
    ["_subject", "_template", "email", "growing", "scores", "strongest"].sort(),
  );

  // Closing copy: retake, the book, and the SGI cross-link.
  await expect(page.locator(".ua-closing")).toContainText("Take it again when you finish the book");
  await expect(page.locator('.ua-closing a[href="/spiritual-gifts-inventory/"]')).toBeVisible();
  await expect(page.locator('.ua-closing a[href="/founder/"]')).toBeVisible();
});

test("band boundaries: 16 strong, 15 and 9 steady, 8 growing", async ({ page }) => {
  await stubMailchimp(page);
  await captureResults(page);
  await page.goto(UA);
  await unlock(page);
  await answerAll(page, [
    [4, 4, 4, 4, 0], // Heart 16
    [3, 3, 3, 3, 3], // Soul 15
    [2, 2, 2, 2, 1], // Mind 9
    [2, 2, 2, 2, 0], // Strength 8
    0, // Neighbor 0
  ]);
  await page.click('#ua-quiz-form input[type="submit"]');
  const band = (part: string) =>
    page.locator(`.ua-result[data-part="${part}"] .ua-band`);
  await expect(band("Heart")).toHaveText("Strong");
  await expect(band("Soul")).toHaveText("Steady");
  await expect(band("Mind")).toHaveText("Steady");
  await expect(band("Strength")).toHaveText("Growing");
  await expect(band("Neighbor")).toHaveText("Growing");
});

test("ties list every part tied for strongest and growing", async ({ page }) => {
  await stubMailchimp(page);
  const bodies = await captureResults(page);
  await page.goto(UA);
  await unlock(page);
  await answerAll(page, [3, 3, 1, 2, 1]);
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0].strongest).toBe("Heart (15), Soul (15)");
  expect(bodies[0].growing).toBe("Mind (5), Neighbor (5)");
});

test("submit blocks and marks unanswered statements", async ({ page }) => {
  await stubMailchimp(page);
  await page.goto(UA);
  await unlock(page);
  await page.click('input[name="q1"][value="4"]');
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect(page.locator("#ua-quiz-msg")).toContainText("24 remaining");
  await expect(page.locator("#ua-q2")).toHaveClass(/unanswered/);
  await expect(page.locator("#ua-results")).toBeHidden();
});

test("retake keeps history and shows before/after per part", async ({ page }) => {
  await stubMailchimp(page);
  const bodies = await captureResults(page);
  await page.goto(UA);
  await unlock(page);

  await page.click('input[name="q1"][value="4"]');
  await page.reload();
  // Returning visitor: gate skipped, answer restored, no history yet.
  await expect(page.locator("#ua-quiz")).toBeVisible();
  await expect(page.locator('input[name="q1"][value="4"]')).toBeChecked();
  await expect(page.locator("#ua-progress-count")).toHaveText("1");
  await expect(page.locator("#ua-previous-note")).toBeHidden();

  // First take: Heart 20 ... Neighbor 0.
  await answerAll(page, [4, 3, 2, 1, 0]);
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect(page.locator("#ua-results")).toBeVisible();

  const history = await page.evaluate(() => JSON.parse(localStorage.getItem("ua.history")!));
  expect(history).toHaveLength(1);
  expect(history[0].scores).toEqual({ Heart: 20, Soul: 15, Mind: 10, Strength: 5, Neighbor: 0 });
  expect(Date.parse(history[0].date)).not.toBeNaN();

  await page.click("#ua-retake");
  await expect(page.locator("#ua-quiz")).toBeVisible();
  await expect(page.locator("#ua-progress-count")).toHaveText("0");
  await expect(page.locator("#ua-previous-note")).toContainText("You last took the assessment on");
  expect(await page.evaluate(() => localStorage.getItem("ua.answers"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("ua.subscribed"))).toBe("1");
  expect(await page.evaluate(() => localStorage.getItem("ua.email"))).toBe("reader@example.com");

  // Second take, reversed: Neighbor 20 ... Heart 0.
  await answerAll(page, [0, 1, 2, 3, 4]);
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect(page.locator("#ua-results")).toBeVisible();

  const prev = (part: string) => page.locator(`.ua-result[data-part="${part}"] .ua-prev`);
  await expect(prev("Neighbor")).toContainText("Last time");
  await expect(prev("Neighbor")).toContainText(": 0");
  await expect(prev("Neighbor")).toContainText("up 20");
  await expect(prev("Heart")).toContainText(": 20");
  await expect(prev("Heart")).toContainText("down 20");
  await expect(prev("Mind")).toContainText("no change");
  await expect(page.locator(".ua-bar.is-previous")).toHaveCount(5);
  await expect(page.locator("#ua-results-list .ua-result").first().locator("h3")).toHaveText(
    "Neighbor",
  );

  expect(
    (await page.evaluate(() => JSON.parse(localStorage.getItem("ua.history")!))).length,
  ).toBe(2);
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].strongest).toBe("Neighbor (20)");
});

test("axe WCAG 2.1 AA on the questions and the results view", async ({ page }) => {
  await stubMailchimp(page);
  await captureResults(page);
  await page.goto(UA, { waitUntil: "domcontentloaded" });
  await unlock(page);
  const axe = () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude("iframe[name=donorbox]")
      .analyze();
  expect((await axe()).violations).toEqual([]);

  await answerAll(page, [4, 3, 2, 1, 0]);
  await page.click('#ua-quiz-form input[type="submit"]');
  await expect(page.locator("#ua-results")).toBeVisible();
  expect((await axe()).violations).toEqual([]);
});

test("the SGI page and the header link to the assessment", async ({ page }) => {
  await page.goto("/spiritual-gifts-inventory/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('.sgi-companion a[href="/undivided-assessment/"]')).toBeVisible();
  await expect(page.locator('.site-header a[href="/undivided-assessment/"]')).toHaveCount(1);
  await page.goto(UA, { waitUntil: "domcontentloaded" });
  await expect(page.locator('.site-header a[href="/undivided-assessment/"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
});
