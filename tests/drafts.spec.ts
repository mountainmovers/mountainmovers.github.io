import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

// ADR 0005: draft-gated content must never reach any built output.

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("no draft episode title appears anywhere in dist/", () => {
  const episodesDir = "src/content/episodes";
  const draftTitles = walk(episodesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => matter(readFileSync(f, "utf8")))
    .filter((parsed) => parsed.data.draft === true)
    .map((parsed) => parsed.data.title as string);

  expect(draftTitles.length).toBeGreaterThan(0); // sanity: gate is being exercised

  const distFiles = walk("dist").filter((f) => f.endsWith(".html") || f.endsWith(".xml"));
  for (const file of distFiles) {
    const content = readFileSync(file, "utf8");
    for (const title of draftTitles) {
      expect(content, `${file} leaks draft "${title}"`).not.toContain(title);
    }
  }
});
