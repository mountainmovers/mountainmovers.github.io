import { test, expect } from "@playwright/test";

test("podcast RSS is well-formed with required channel tags", async ({ request }) => {
  const response = await request.get("/podcast/rss.xml");
  expect(response.ok()).toBeTruthy();
  // Prerendered to a static file — the preview server (and GitHub Pages)
  // choose the header, so just require an XML content type.
  expect(response.headers()["content-type"]).toContain("xml");

  const xml = await response.text();
  expect(xml).toContain('<rss version="2.0"');
  expect(xml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
  expect(xml).toContain("<itunes:author>");
  expect(xml).toContain("<itunes:owner>");
  expect(xml).toContain("<itunes:category");
  expect(xml).toContain('rel="self"');

  // Every item (if any) must carry a complete enclosure and itunes numbering.
  const items = xml.match(/<item>/g)?.length ?? 0;
  const enclosures = xml.match(/<enclosure url="https?:\/\/[^"]+" length="[1-9]\d*" type="[^"]+"\/>/g)?.length ?? 0;
  const durations = xml.match(/<itunes:duration>\d{1,2}:\d{2}(:\d{2})?<\/itunes:duration>/g)?.length ?? 0;
  expect(enclosures).toBe(items);
  expect(durations).toBe(items);
});
