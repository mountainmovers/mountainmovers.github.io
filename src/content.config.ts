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
    // Undivided Assessment results (ADR 0006): the same FormSubmit alias as
    // the SGI, kept as its own field so either can move without the other.
    undivided_results_endpoint: z.string().url(),
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

// The Undivided Assessment, from the book Undivided by C.W. Hamit (ADR 0006).
// Mirrors the SGI's interleave: question n scores toward part (n - 1) mod 5,
// so 25 questions / 5 parts / 5 scale steps must hold, every question must sit
// in its interleaved slot, and the bands must tile 0-20 exactly.
const UNDIVIDED_PARTS = ["Heart", "Soul", "Mind", "Strength", "Neighbor"] as const;
const UNDIVIDED_BANDS = [
  { key: "strong", min: 16, max: 20 },
  { key: "steady", min: 9, max: 15 },
  { key: "growing", min: 0, max: 8 },
] as const;
const undividedCopy = z.object({
  heading: z.string(),
  text: z.string(),
  link_label: z.string(),
});
const undivided = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/undivided" }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      hero: z.object({ kicker: z.string(), heading: z.string(), epigraph: z.string() }),
      intro: z.object({
        heading: z.string(),
        body: z.array(z.string()).min(1),
        email_label: z.string(),
        email_placeholder: z.string(),
        start_label: z.string(),
      }),
      messages: z.object({
        invalid_email: z.string(),
        subscribed: z.string(),
        subscribe_offline: z.string(),
        subscribe_error: z.string(),
        unanswered: z.string().includes("{count}"),
      }),
      quiz: z.object({
        heading: z.string(),
        instructions: z.string(),
        progress_suffix: z.string(),
        submit_label: z.string(),
        previous_note: z.string().includes("{date}"),
      }),
      scale: z
        .array(z.object({ value: z.number().int().min(0).max(4), label: z.string() }))
        .length(5),
      bands: z
        .array(
          z.object({
            key: z.enum(["strong", "steady", "growing"]),
            label: z.string(),
            min: z.number().int(),
            max: z.number().int(),
          }),
        )
        .length(3),
      parts: z
        .array(
          z.object({
            name: z.enum(UNDIVIDED_PARTS),
            chapters: z.string(),
            results: z.object({ strong: z.string(), steady: z.string(), growing: z.string() }),
          }),
        )
        .length(5),
      questions: z
        .array(z.object({ part: z.enum(UNDIVIDED_PARTS), text: z.string() }))
        .length(25),
      results: z.object({
        heading: z.string(),
        key: z.string(),
        read_label: z.string(),
        previous_label: z.string().includes("{date}").includes("{score}"),
        change_up: z.string().includes("{n}"),
        change_down: z.string().includes("{n}"),
        change_same: z.string(),
        retake_label: z.string(),
      }),
      closing: z.object({
        heading: z.string(),
        body: z.array(z.string()).min(1),
        book: z.object({ text: z.string(), link_label: z.string(), url: z.string() }),
        sgi: z.object({ text: z.string(), link_label: z.string(), url: z.string() }),
        note: z.string(),
        donate: z.string(),
      }),
      crosslinks: z.object({
        sgi_page: undividedCopy,
        home: undividedCopy.omit({ heading: true }),
        nav_label: z.string(),
      }),
    })
    .superRefine((data, ctx) => {
      data.parts.forEach((part, i) => {
        if (part.name !== UNDIVIDED_PARTS[i]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["parts", i, "name"],
            message: `Part ${i + 1} must be ${UNDIVIDED_PARTS[i]} (book order)`,
          });
        }
      });
      data.questions.forEach((question, i) => {
        const expected = UNDIVIDED_PARTS[i % 5];
        if (question.part !== expected) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["questions", i, "part"],
            message: `Question ${i + 1} scores toward ${expected} ((n - 1) mod 5), not ${question.part}`,
          });
        }
      });
      UNDIVIDED_BANDS.forEach((band, i) => {
        const actual = data.bands[i];
        if (actual.key !== band.key || actual.min !== band.min || actual.max !== band.max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["bands", i],
            message: `Band ${i + 1} must be ${band.key} ${band.min}-${band.max}`,
          });
        }
      });
      if (data.scale.map((s) => s.value).join() !== "4,3,2,1,0") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scale"],
          message: "Scale must run 4 (Strongly Agree) to 0 (Completely Disagree), as in the SGI",
        });
      }
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

export const collections = { site, sgi, undivided, episodes, ministries, timeline, founder, pages };
