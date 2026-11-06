# ADR 0006 — The Undivided Assessment, next to the Spiritual Gifts Inventory

- **Date:** 2026-11-05
- **Status:** Accepted (built on `feature/undivided-assessment`; Josh reviews before `master`)
- **Deciders:** Josh Hamit (site owner), with Wayne Hamit's sign-off as confirmed by Josh

## Context

C.W. Hamit's book *Undivided: What Science Is Discovering About the Whole
Person God Made* (Mountain Movers Press; five parts, Heart, Soul, Mind,
Strength and Neighbor, after Mark 12:30) sends readers to mountainmovers.org
for "a free, online, self-scoring assessment that looks at the five parts of
this book and shows you where you are strong and where you are growing. It
sits right next to the Mountain Movers spiritual gifts inventory, and the two
belong together. It is not a test you can fail. It is a mirror. Take it now,
and take it again when you finish." The book's group guide asks members to take
it before session 1 and again before session 6. The book's design note (Oct
2026) adds: "Like the spiritual gifts inventory, an 'Undivided Assessment'
scored online gives each reader a heart, soul, mind, strength and neighbor
score." No question set existed; this build wrote it, grounded in each part's
three chapters.

Josh, 2026-11-05: "use the mountainmovers website ... next to the spiritual
gifts inventory, create an assessment ... This is the assessment referenced in
undivided, and needs to be referenced as such ... make sure it is compatible
with the format that exists in mmi website today." Asked how to proceed, his
choice was "Build it and publish."

## Decision

### Draft gate (ADR 0005)

The assessment's content derives from Wayne's book, which ADR 0005 would
normally hold at `draft: true`. Josh instructed the build and confirmed
Wayne's sign-off for this content, so **the Undivided Assessment is not
draft-gated**. This decision covers the assessment page and its cross-links
only; it does not lift the gate on sermons, podcast episodes or any other
Wayne-derived material.

### Contract (mirrors the SGI; new values are this assessment's own)

- URL: `/undivided-assessment/` (trailing slash, directory output).
- Content: `src/content/undivided/assessment.yaml`; the schema in
  `src/content.config.ts` asserts 25 questions / 5 parts / 5 scale steps,
  parts in book order, every question in its interleaved slot, the 4…0 scale,
  and the bands. A misplaced question fails the build.
- Scoring: question n scores toward part (n−1) mod 5 (Heart, Soul, Mind,
  Strength, Neighbor); each part sums questions n, n+5, n+10, n+15, n+20 on the
  SGI's scale (4 = Strongly Agree … 0 = Completely Disagree), 0–20 per part.
  Bands: strong 16–20, steady 9–15, growing 0–8. Results are listed strongest
  first (ties keep book order).
- localStorage: `ua.subscribed`, `ua.answers`, `ua.email`, and `ua.history`
  (array of `{ date: ISO string, scores: { Heart, Soul, Mind, Strength,
  Neighbor } }`, oldest first, last 20 kept). Retake clears only `ua.answers`;
  the next result shows "Last time (date): score · up/down n" per part.
- Email gate: identical to the SGI — the same Mailchimp JSONP endpoint and
  list, unlock on success or "already subscribed", **fail-open**. The
  Mailchimp audience is dead (both list IDs 404 since 2026-08-04), so in
  practice every reader unlocks through the fail-open path, exactly as the SGI
  does today; the email still reaches MMI in the results POST.
- Results POST: `company.json` → `undivided_results_endpoint` (today the same
  FormSubmit alias as `sgi_results_endpoint`, kept as its own field so either
  can move without the other). JSON body: `_subject: "Undivided Assessment
  results"`, `_template: "table"`, `email`, `scores` (all five, book order,
  `"Heart (n), Soul (n), …"`), `strongest`, `growing` (every part tied for the
  top / bottom score). Fire-and-forget.
- Script: `src/scripts/undivided.js`, a vanilla IIFE modelled on `sgi.js`;
  config via `<script type="application/json" id="ua-config">`. `sgi.js`, the
  SGI's keys, endpoints and inventory data are untouched (ADR 0004).

### "Next to the SGI"

- Header nav: "Undivided" directly after "Spiritual Gifts" (stays on one row
  from the 768px breakpoint up).
- SGI page: a companion line under the gate and a companion card after the
  results — markup and copy only (copy from the assessment's `crosslinks`
  block); no frozen ID, key or script changed.
- Homepage SGI callout: a companion line under "Take the Inventory".
- 404 page: listed beside the SGI.
- The assessment's closing links back to the SGI ("the two belong together").

### Book link

There is no `/books/` section yet (planned at mountainmovers.org/books). The
closing's book link points to `/founder/` (the author, C.W. Hamit, is MMI's
founder Wayne Hamit). It is one field — `closing.book.url` — to swap to
`/books/undivided/` when that page ships. The closing states the Feb 2, 2027
release date as printed in the book.

## Consequences

- The assessment is public once merged to `master`; the copy can be revised
  in YAML without touching code, but the scoring rule above is a contract
  readers' saved history depends on — reordering questions or parts would
  silently corrupt before/after comparisons.
- When the list provider changes (Kit / MailerLite), the SGI and this gate
  should move together, as one explicit change.
