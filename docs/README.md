# Current state — mountainmovers.org redesign

_Last updated: 2026-08-03_

## Next session — start here

1. Read `CLAUDE.md`, then this file.
2. **Production = old Jekyll site on `master`. This branch is preview-only.**
3. `npm run build` must be clean before and after your change.

## What exists

| Area | Status |
|---|---|
| Astro 5 scaffold, tokens.css design system | ✅ |
| Core pages (Home, About, Founder, Ministries, Donate, Contact, 404) | ✅ |
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
| High-res heritage logo file (chat image → repo) | Josh | open |
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

## Launch checklist (for the FUTURE cutover — do not execute)

- P0: high-res logo · live SGI cross-check vs Jekyll · Apple feed validation
- P1: real OG share image · Wayne portrait · Search Console re-submit
- P2: git-as-CMS editing doc for non-developers · per-ministry subpages
