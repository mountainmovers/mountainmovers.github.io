# mountainmovers.org — agent rulebook

Read this before touching any file. Astro static site for Mountain Movers
International (MMI), a 501(c)(3) missions non-profit.

## ⚠ Production status

**Production is the OLD Jekyll site on `master`, served by GitHub Pages'
classic build. Do not merge this branch, push to `master`, or change GitHub
Pages settings without an explicit instruction from Josh.** This branch
(`redesign/astro`) deploys only to a noindexed GitLab Pages preview.

## Before you write code

1. Read `docs/README.md` (current state) and the relevant ADR in `docs/adr/`.
2. Read `src/styles/tokens.css`. Never hardcode a color, font, or size that
   exists as a token. Component styles are scoped `<style>` blocks; global
   element styles live only in `src/styles/global.css`.
3. Run `npm run build` before and after every change — it must stay clean
   (build includes `astro check`).

## Hard rules

- **Copy lives in content collections (`src/content/`), never in `.astro`
  templates.** Schemas in `src/content.config.ts`.
- **SGI contract is frozen** (ADR 0004): `/spiritual-gifts-inventory/` URL,
  `sgi.*` localStorage keys, Mailchimp JSONP endpoint, FormSubmit POST shape,
  scoring math, fail-open gate. Do not "improve" `src/scripts/sgi.js`.
- **Wayne Hamit-derived content stays `draft: true`** (ADR 0005) until Josh
  confirms Wayne's sign-off. Drafts must never reach built HTML or RSS.
- Vanilla JS only. No UI frameworks, no Tailwind, no jQuery.
- Every page needs title, description, canonical, og/twitter meta (via
  `Seo.astro`) and passes axe WCAG 2.1 AA.
- Accessibility overrides design when they conflict (contrast, focus states,
  reduced motion).

## Architecture decisions (do not re-litigate)

- Astro SSG only, no SSR — `docs/adr/0001`.
- GitHub Pages (Actions) for future prod; GitLab Pages preview now — `0002`.
- Hand-rolled podcast RSS with itunes namespace — `0003`.
- SGI port contract — `0004`.
- Wayne content draft gate — `0005`.

## Commands

- `npm run dev` — dev server
- `npm run build` — astro check + build (the gate)
- `npm run preview` — serve dist/
- `npm test` — Playwright (integration, a11y, SGI, RSS, drafts)

## Known state / debt

- `public/images/logo-heritage.jpg` is a low-res Wayback capture — replace
  with the high-res original from Josh.
- Podcast host not chosen; all episodes are drafts. The feed builds and
  validates but is empty by design.
- Old Jekyll content lives in git history on `master` (`git show
  master:_data/spiritual_gifts.yml` etc.) — nothing was lost.
