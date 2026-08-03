# ADR 0004 — Spiritual Gifts Inventory port contract (FROZEN)

- **Date:** 2026-08-03
- **Status:** Accepted
- **Deciders:** Josh Hamit

## Context

The SGI shipped on the Jekyll site in July 2026 and is live and working. The
Astro port must be behavior-identical: third-party endpoints are load-bearing
and returning visitors have state in localStorage.

## Contract — byte-identical values, do not change

- URL: `/spiritual-gifts-inventory/` (trailing slash, directory output).
- localStorage keys: `sgi.subscribed`, `sgi.answers`, `sgi.email`.
- Mailchimp JSONP subscribe:
  `https://mountainmovers.us17.list-manage.com/subscribe/post-json?u=41ee6d7cbb87953dd16e0cfa5&id=5563c68070&EMAIL=...&c=<callback>`
  — unlock on `result === "success"` OR "already subscribed"; **fail-open**
  (network failure still unlocks the quiz).
- Results POST: `https://formsubmit.co/ajax/7f48937430e53ec099756ea37141a101`
  (FormSubmit alias for the destination mailbox — keeps the raw address out of
  page source). JSON body: `_subject`, `_template: "table"`, `email`,
  `dominant`, `sub_dominant`, `all_scores`. Fire-and-forget.
- Scoring: question n scores toward gift (n−1) mod 22; each gift sums
  questions n, n+22, n+44, n+66, n+88; 0–20 range; scale 4=Strongly Agree …
  0=Completely Disagree; top 3 dominant, next 3 sub-dominant.
- Data: `src/content/sgi/inventory.yaml` is the Jekyll
  `_data/spiritual_gifts.yml` verbatim (schema asserts 110/22/5).

## Implementation notes

Markup keeps the original element IDs/class names so
`src/scripts/sgi.js` (the ported IIFE) needed no renaming; page passes config
via `<script type="application/json" id="sgi-config">`. Only visual styling
changed (tokens). Planned future change (separate, explicit): swap
`sgi_results_endpoint` in `src/content/site/company.json` to a Google Apps
Script URL once Josh sets up the Sheet.
