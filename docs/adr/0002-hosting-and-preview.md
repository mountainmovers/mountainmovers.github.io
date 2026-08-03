# ADR 0002 — GitHub Pages for production (deferred); GitLab Pages preview now

- **Date:** 2026-08-03
- **Status:** Accepted
- **Deciders:** Josh Hamit

## Context

DNS and the `www.mountainmovers.org` domain already point at GitHub Pages
(classic Jekyll build from `master`). Josh has both GitHub and GitLab and
wants free hosting plus redundancy. **Directive: the redesign is non-prod
only until an explicit manual cutover instruction.**

## Decision

- Production stays the Jekyll site on `master` until Josh says otherwise.
- The `redesign/astro` branch deploys to **GitLab Pages** via `.gitlab-ci.yml`
  as a noindexed preview (`PUBLIC_NOINDEX=true` → robots meta; `SITE_URL`
  overrides canonical origin). This doubles as the GitLab mirror.
- Future production: GitHub Pages via Actions (`.github/workflows/deploy.yml`,
  triggers on `master` only — inert until cutover). `public/CNAME` keeps the
  custom domain sticky. CI (`ci.yml`) is a gate, not a deployer.

## Cutover procedure (requires explicit instruction)

Tag `jekyll-final` → merge → Settings → Pages → Source: GitHub Actions →
re-verify custom domain + Enforce HTTPS → verify live → re-submit sitemap.

## Consequences

- Zero risk to production during the redesign; preview shareable at a
  gitlab.io URL.
- Two CI systems exist in the repo; GitLab's only builds previews.
