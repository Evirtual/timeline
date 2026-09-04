import { z } from "zod";

/**
 * The chronicle is the site's second view, and it is deliberately not a second
 * category of the race grid. Three things make it a different contract rather
 * than an extension of `schema.ts`:
 *
 *   1. No entity. Turing's paper, the Dartmouth proposal, both AI winters and
 *      the leaked capability ladder belong to no organisation. Nine of the
 *      twenty milestones have no owner in the race view's roster, and inventing
 *      rows for IBM, MIT, DEC and "the field" would wreck the grid that view
 *      exists to be.
 *   2. Variable-precision dates. The race view is day-precise because it groups
 *      by quarter and has to be. Here, "1974" and "2026-02" are the honest
 *      answers for a multi-year winter and a remark we can only place to a
 *      month. Inventing a day would be a small lie the rest of the page carries.
 *   3. `kind` is an epistemic axis, not a taxonomy of what happened. `claim` —
 *      somebody asserting a threshold was crossed — is the load-bearing value,
 *      and it is orthogonal to the race view's model/product/research/funding.
 */

/**
 * Year, year-month, or full date. These sort correctly as plain strings, which
 * is what lets era ranges be compared without parsing anything.
 */
export const chronicleDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "date must be YYYY, YYYY-MM or YYYY-MM-DD")
  .refine((d) => {
    const [y, m, day] = d.split("-").map(Number);
    if (m !== undefined && (m < 1 || m > 12)) return false;
    if (day !== undefined) {
      const parsed = new Date(Date.UTC(y, m - 1, day));
      return parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === day;
    }
    return true;
  }, "date must be a real calendar date");

export const milestoneKind = z.enum([
  "breakthrough", // a result that moved what machines can do
  "release", // a thing shipped that changed the public answer
  "setback", // a winter, a retraction, a collapse
  "claim", // somebody asserting a threshold was crossed
]);

export const source = z.object({
  label: z.string().min(1),
  url: z.url(),
});

export const milestone = z.object({
  id: z.string().min(1),
  date: chronicleDate,
  /** What the card shows. Separate from `date` so it can read "Summer 1956". */
  display: z.string().min(1),
  title: z.string().min(1),
  kind: milestoneKind,
  summary: z.string().min(1),
  /**
   * Every milestone needs a citation. The array may be empty only for the
   * handful of events with genuinely nothing to cite — see SOURCELESS_OK in
   * the chronicle tests, where each exception is recorded with its reason.
   */
  sources: z.array(source),
  /** Highlights the card as the latest thing that happened. Exactly one. */
  now: z.boolean().optional(),
  /** Adds the risk badge. */
  critical: z.boolean().optional(),
  /** Opts this milestone into a live elapsed counter in the header. */
  counter: z.string().min(1).optional(),
});

/**
 * Half-open: `from` inclusive, `before` exclusive. That is what makes the
 * variable-precision strings compare correctly at the boundaries — "2023-03-14"
 * is not <= "2023", but it is < "2024".
 */
export const era = z.object({
  from: chronicleDate,
  before: chronicleDate,
  name: z.string().min(1),
  note: z.string().min(1),
});

export const chronicle = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  eras: z.array(era).min(1),
  milestones: z.array(milestone).min(1),
});

export type Milestone = z.infer<typeof milestone>;
export type Era = z.infer<typeof era>;
export type Chronicle = z.infer<typeof chronicle>;
export type MilestoneKind = z.infer<typeof milestoneKind>;
export type Source = z.infer<typeof source>;
