# ADR 0003 — Hand-rolled podcast RSS endpoint

- **Date:** 2026-08-03
- **Status:** Accepted
- **Deciders:** Josh Hamit

## Context

Apple/Spotify-valid podcast feeds need the itunes namespace (author, owner,
image, category, explicit, duration, episode/season). `@astrojs/rss` forces
all of those into raw `customData` strings, at which point the library adds
nothing.

## Decision

`src/pages/podcast/rss.xml.ts` builds the XML with template literals and an
`escapeXml` helper. Requirements enforced: RSS 2.0, `<enclosure>` with
url/length/type (schema refuses non-draft episodes without `audio_url`,
`audio_bytes`, `duration`), GUID = permalink, RFC-822 pubDate,
`atom:link rel="self"`. Episode frontmatter mirrors the hamit-media corpus
schema (`podcast_series`, episode/season numbering) so corpus entries promote
without remapping. One feed per `podcast_series` when a second series ships.

## Consequences

- Audio hosting stays external and undecided without blocking anything; if a
  managed host (RSS.com/Buzzsprout/Ghost) is chosen later, this feed can be
  retired or redirected.
- We own feed validity: `tests/rss.spec.ts` + a manual Apple validator pass
  before any real episode publishes.
