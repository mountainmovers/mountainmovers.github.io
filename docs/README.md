# Current state — mountainmovers.org redesign

_Last updated: 2026-08-04 — **LIVE IN PRODUCTION**_

## Next session — start here

1. Read `CLAUDE.md`, then this file.
2. **Production = this Astro site.** `master` push = production deploy
   (GitHub Actions → Pages). Work on branches; Josh gates merges.
3. `npm run build` must be clean before and after your change.

## Deferred / known-accepted

- npm audit: residual esbuild advisories (dev-server, Windows-only — no
  production exposure for a static site). Full fix = Astro 7 major upgrade,
  planned as its own task. sharp pinned ≥0.35 via package.json overrides.
- GitLab preview/mirror never stood up (went straight to prod after Wayne's
  approval) — optional future redundancy.
- Search Console: re-submit sitemap-index.xml (Josh, needs Google login).

## What exists

| Area | Status |
|---|---|
| Astro 5 scaffold, tokens.css design system | ✅ |
| Core pages (Home, About, Founder, Donate, Contact, 404) | ✅ |
| Ministries folded into About timeline (era_key join; /ministries/ → /about/) | ✅ iteration 2 |
| Heritage logo (900×616 original + 320px header version) | ✅ iteration 2 |
| **Editorial design won review → promoted to THE design** (homepage + shared .kicker/.page-hero language on all pages; /variants/ removed) | ✅ iteration 3 |
| Wayne Hamit portrait (LinkedIn headshot) on Founder page + homepage feature | ✅ iteration 3 |
| SGI port (frozen contract, ADR 0004) | ✅ build-verified; needs Playwright + live cross-check |
| Podcast infra (index, episode pages, itunes RSS) | ✅ feed empty by design (all episodes draft) |
| Content collections + zod schemas | ✅ |
| Playwright tests (a11y/sgi/rss/seo/drafts) | ✅ |
| CI (GitHub Actions gate) | ✅ inert deploy.yml committed |
| GitLab Pages preview (.gitlab-ci.yml) | ✅ config; needs GitLab project + first push |
| Claude Design project sync | pending |

## Open questions

| Question | Owner | Status |
|---|---|---|
| ~~Design direction~~ — resolved: editorial design won review, now the only version | Josh | closed 2026-08-04 |
| Donations: swap Donorbox → Givebutter? (0% + donor tips vs. Donorbox's 2.95% + processing; one-component change via DonorboxEmbed; recurring donors would need to re-enroll) | Josh | deferred to next iteration, after Wayne's feedback |
| ~~Editorial photo licenses~~ — resolved: MMI holds full rights to the recovered 2015–2017 imagery | Josh | closed 2026-08-04 |
| Mailchimp audience is DEAD (both list IDs 404, account likely purged for inactivity). Newsletter form relays to FormSubmit → dev@ as interim; SGI gate fails open by design. Rebuild list on Kit (free ≤10k) + reseed from dev@ SGI emails / Donorbox export / inbox archaeology; Givebutter + n8n glue planned | Josh | open — interim shipped 2026-08-04 |
| Real MMI field photography (shot list below) | Josh | open |
| Wayne's sign-off on podcast/sermon content | Josh + Wayne | open — everything draft-gated (ADR 0005) |
| Sermon ownership: Wayne vs. Hope Lutheran | Josh + Wayne | open |
| Podcast host (RSS.com / Buzzsprout / Ghost / self) | Josh | open — doesn't block site work |
| SGI results → Google Sheets endpoint swap | Josh | open (separate thread) |
| Wayne portrait photo (better than 2003 capture) | Josh | open |

## Deviations from the Jekyll site

| Jekyll | Astro | Why |
|---|---|---|
| `http://mountainmovers.org` canonical | `https://www.mountainmovers.org` | https+www is the real serving host |
| `sitemap.xml` | `sitemap-index.xml` | @astrojs/sitemap default; robots.txt updated |
| Google Fonts Open Sans | self-hosted Source Serif 4 + Source Sans 3 | perf/privacy; heritage serif |
| jQuery smooth-scroll | CSS `scroll-behavior` | dependency-free |
| 2016 posts | meta-refresh redirects → /about/ | throwaway content |

## Photo shot list (for MMI archives / future field photography)

Optional enrichment — authentic field imagery to complement the licensed set:
mission-field portraits (with consent), water-well drilling, school/orphanage
classrooms, food distribution, Wayne teaching/preaching, team + partner
candids, one strong landscape per field region. Target ≥1600px wide.
Nothing authentic survives online from 2001–2012 — the originals exist only
in MMI/family archives, if anywhere.

## Launch checklist (for the FUTURE cutover — do not execute)

- P0: live SGI cross-check vs Jekyll · Apple feed validation
- P1: real OG share image · Wayne portrait · Search Console re-submit
- P2: git-as-CMS editing doc for non-developers · per-ministry subpages
