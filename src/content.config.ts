import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// All site copy lives in these collections — never in templates or components.

const site = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/site" }),
  schema: z.object({
    company_name: z.string(),
    tagline: z.string(),
    mission_statement: z.string(),
    address: z.string(),
    email: z.string().email(),
    founding_year: z.number().int(),
    donorbox_campaign: z.string(),
    mailchimp: z.object({
      u: z.string(),
      list_id: z.string(),
      honeypot: z.string(),
    }),
    sgi_results_endpoint: z.string().url(),
    // Interim: newsletter signups relay to the same FormSubmit alias while
    // the Mailchimp account is dead (2026-08-04) — swap to Kit when created.
    newsletter_endpoint: z.string().url(),
  }),
});

// Spiritual Gifts Inventory data, migrated verbatim from _data/spiritual_gifts.yml.
// The length checks are load-bearing: scoring maps question n to gift
// (n - 1) mod 22, so 110 questions / 22 gifts / 5 scale steps must hold.
const sgi = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/sgi" }),
  schema: z.object({
    scale: z
      .array(z.object({ value: z.number().int().min(0).max(4), label: z.string() }))
      .length(5),
    gifts: z.array(z.object({ name: z.string() })).length(22),
    questions: z.array(z.string()).length(110),
  }),
});

// Podcast episodes. Field names mirror the hamit-media corpus schema
// (podcast_series, episode/season numbering, duration) so corpus entries can
// be promoted into episodes without remapping. Anything derived from
// not-yet-cleared source material MUST stay draft: true — drafts never reach
// built HTML or RSS, and CI asserts it.
const episodes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/episodes" }),
  schema: z
    .object({
      podcast_series: z.string(),
      title: z.string(),
      description: z.string(),
      episode_number: z.number().int().positive(),
      season: z.number().int().positive().default(1),
      audio_url: z.string().url().optional(),
      audio_bytes: z.number().int().positive().optional(),
      audio_type: z.string().default("audio/mpeg"),
      duration: z
        .string()
        .regex(/^\d{1,2}:\d{2}(:\d{2})?$/)
        .optional(),
      published: z.coerce.date(),
      image: z.string().optional(),
      draft: z.boolean().default(false),
    })
    // A publishable episode must have a complete RSS enclosure.
    .refine((e) => e.draft || (e.audio_url && e.audio_bytes && e.duration), {
      message:
        "Non-draft episodes require audio_url, audio_bytes, and duration for a valid RSS enclosure",
    }),
});

// Ministry detail renders inside the About page's timeline, joined to a
// timeline entry by era_key (= timeline entry id). No standalone page.
const ministries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/ministries" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    region: z.enum(["international", "domestic", "discipleship"]),
    countries: z.array(z.string()).default([]),
    era: z.string().optional(),
    era_key: z.string(),
    active: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

// Site-history eras for the About page timeline (recovered via the Wayback
// Machine, 2026-08 research).
const timeline = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/timeline" }),
  schema: z.object({
    years: z.string(),
    heading: z.string(),
    body: z.string(),
    order: z.number(),
  }),
});

const founder = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/founder" }),
  schema: z.object({
    title: z.string(),
    role: z.string(),
    published: z.boolean().default(true),
  }),
});

// Per-page hero/intro copy so .astro files stay copy-free.
const pages = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    intro: z.string().optional(),
    sections: z
      .array(
        z.object({
          heading: z.string().optional(),
          body: z.array(z.string()).default([]),
          quote: z.string().optional(),
          attribution: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { site, sgi, episodes, ministries, timeline, founder, pages };
