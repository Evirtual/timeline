import agiRaw from "../../content/agi.json";
import { chronicle, type Chronicle, type Era, type Milestone } from "./chronicle-schema";

/** Parsed at module load, so a malformed dataset fails the build, not the page. */
export function loadChronicle(): Chronicle {
  const parsed = chronicle.safeParse(agiRaw);
  if (!parsed.success) {
    throw new Error(`content/agi.json is invalid:\n${parsed.error.message}`);
  }
  return parsed.data;
}

export const KIND_LABELS: Record<Milestone["kind"], string> = {
  breakthrough: "Breakthrough",
  release: "Release",
  setback: "Setback",
  claim: "AGI claim",
};

/** Half-open range test. The one place era membership is decided. */
export function inEra(m: Milestone, e: Era): boolean {
  return m.date >= e.from && m.date < e.before;
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/** Pads a variable-precision date to something Date can parse. */
export function toDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export type EraGroup = { era: Era; milestones: Milestone[] };

/** Eras in order, each with its milestones. Empty eras are dropped. */
export function groupByEra(c: Chronicle): EraGroup[] {
  return c.eras
    .map((era) => ({ era, milestones: c.milestones.filter((m) => inEra(m, era)) }))
    .filter((g) => g.milestones.length > 0);
}

export function eraRange(e: Era, now: number): string {
  const end = yearOf(e.before) - 1;
  return `${e.from.slice(0, 4)}–${end >= now ? "now" : end}`;
}

export type Bin = {
  /** First year of the half-decade. */
  start: number;
  count: number;
  /** True for the half-decade we are currently inside. */
  open: boolean;
  /** Years elapsed of the five, for the open bin. */
  yearsIn: number;
  /** Count carried to a full half-decade at the current rate. */
  projected: number;
};

/**
 * Milestones per half-decade, 1950 to the bin we are standing in.
 *
 * The open bin is the whole reason this returns more than counts. It is short
 * because it is unfinished, not because the pace dropped, and a bar chart that
 * does not say so implies a slowdown that is not in the data.
 */
export function bins(c: Chronicle, now: Date): Bin[] {
  const counts = new Map<number, number>();
  for (const m of c.milestones) {
    const start = Math.floor(yearOf(m.date) / 5) * 5;
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }

  const thisYear = now.getFullYear();
  const openStart = Math.floor(thisYear / 5) * 5;
  const openYearsElapsed = Math.max(
    (now.getTime() - Date.UTC(openStart, 0, 1)) / (365.25 * 86_400_000),
    1 / 365.25,
  );
  const out: Bin[] = [];
  for (let start = 1950; start <= openStart; start += 5) {
    const count = counts.get(start) ?? 0;
    const open = start === openStart;
    const yearsIn = open ? openYearsElapsed : 5;
    out.push({ start, count, open, yearsIn, projected: (count / yearsIn) * 5 });
  }
  return out;
}

/**
 * Whether the open half-decade is running faster than any completed one. Worth
 * computing rather than asserting: if the pace genuinely drops, the page should
 * stop claiming it has not.
 */
export function openIsFastest(all: Bin[]): boolean {
  const open = all.find((b) => b.open);
  if (!open) return false;
  const best = Math.max(...all.filter((b) => !b.open).map((b) => b.count / 5), 0);
  return open.count / open.yearsIn > best;
}

/** "70.2 years" / "1 day". Two years is where the unit switches. */
export function elapsed(from: string, now: Date): string {
  const days = Math.floor((now.getTime() - toDate(from).getTime()) / 86_400_000);
  const years = days / 365.25;
  if (years >= 2) return `${years.toFixed(1)} years`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}
