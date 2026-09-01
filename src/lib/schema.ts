import { z } from "zod";

// The shared contract every category satisfies. A category may extend an event
// with its own fields — the AI one carries model metadata — but this much is
// always present, so the race view can render any dataset without knowing what
// it is looking at.
//
// `kind` and `weight` are authored now and only partly surfaced in v1. They are
// cheap to write alongside the copy and expensive to backfill across a hundred
// events later, which is the whole reason they exist this early.

/** Day precision, even though the view groups by quarter. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine((d) => !Number.isNaN(Date.parse(d)), "date must be a real calendar date");

export const eventKind = z.enum([
  "model", // a released model or system
  "product", // a shipped product or feature
  "research", // a paper or published result
  "funding", // raise, valuation, IPO
  "org", // founding, hires, restructures, departures
  "policy", // regulation, safety commitments, licensing
]);

/**
 * How much an event mattered, used to thin the view when zoomed out.
 *   3 — field-defining. Visible at every zoom level.
 *   2 — significant. The default.
 *   1 — context. Only shown when zoomed in.
 */
export const weight = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Extra facts a model release carries. Absent on every other kind. */
export const modelFacts = z.object({
  /** Context window in tokens, when it was published. */
  context: z.number().int().positive().optional(),
  modality: z.array(z.enum(["text", "vision", "audio", "video", "code"])).optional(),
  /** Whether the weights were released publicly. */
  openWeights: z.boolean().optional(),
});

export const timelineEvent = z.object({
  id: z.string().min(1),
  entity: z.string().min(1),
  date: isoDate,
  title: z.string().min(1),
  kind: eventKind,
  weight,
  summary: z.string().min(1),
  /** A claim without a source is a blog post. Required, deliberately. */
  source: z.url(),
  model: modelFacts.optional(),
});

export const timelineEntity = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Drives the column accent. The only decoration in the design. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color must be a #rrggbb hex"),
  blurb: z.string().min(1),
  founded: z.string().regex(/^\d{4}$/).optional(),
});

export const timelineCategory = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  entities: z.array(timelineEntity).min(1),
  events: z.array(timelineEvent).min(1),
});

export type TimelineEvent = z.infer<typeof timelineEvent>;
export type TimelineEntity = z.infer<typeof timelineEntity>;
export type TimelineCategory = z.infer<typeof timelineCategory>;
export type EventKind = z.infer<typeof eventKind>;
