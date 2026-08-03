# ADR 0005 — Wayne Hamit content draft gate

- **Date:** 2026-08-03
- **Status:** Accepted
- **Deciders:** Josh Hamit

## Context

MMI's founder Wayne Hamit has a sermon corpus and podcast pipeline (the
private hamit-media repo). Per that repo's own governance: Wayne has not
reviewed or signed off on the content framework, the sermon-ownership
question (Wayne personally vs. Hope Lutheran Church) is unresolved, and the
Bible studies are explicitly held from distribution. The founder *bio* is
historic public content (it ran on mountainmovers.org in 2004) and is safe.

## Decision

- The `/founder/` page ships with the historic bio only.
- Any episode or content entry derived from Wayne's sermons/corpus is
  `draft: true`. Drafts are excluded from `getStaticPaths`, index pages, and
  the RSS feed; `tests/drafts.spec.ts` asserts no draft title leaks into any
  built output.
- Flipping an entry to `draft: false` requires Josh confirming Wayne's
  sign-off (and the ownership question resolved for sermon-derived material).

## Consequences

- The podcast pipeline is proven end-to-end before any sensitive content is
  published; lighting it up is a one-line frontmatter change per episode.
