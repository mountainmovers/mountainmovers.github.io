# ADR 0001 — Astro, fully static, no UI framework

- **Date:** 2026-08-03
- **Status:** Accepted
- **Deciders:** Josh Hamit

## Context

The Jekyll 3.3.1 / CloudCannon site (2016 template) can't support the planned
podcast and digital-presence growth, and can no longer be built locally on
Apple Silicon without Docker. The gottatennis.com project proved a stack the
team likes working in.

## Decision

Astro 5, fully static output. No SSR, no React/Vue/Svelte islands, no
Tailwind, no CSS framework. Design tokens in `src/styles/tokens.css` (CSS
custom properties, fluid rem/clamp() type scale) are the single source of
truth; components use scoped styles referencing tokens only. Interactivity is
plain vanilla JS (`src/scripts/`). All copy lives in content collections with
zod schemas.

## Consequences

- Near-perfect Lighthouse scores by default; nothing to patch on a server.
- Non-developers edit YAML/Markdown content files; a bad edit fails the build
  instead of breaking the live site.
- Any future interactive feature must justify itself against the
  vanilla-JS-only rule.
