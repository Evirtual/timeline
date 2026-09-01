import aiRaw from "../../content/ai.json";
import { timelineCategory, type TimelineCategory, type TimelineEvent } from "./schema";

// One entry per category. A second one appears here and the switcher turns
// itself on; until then the site is the AI timeline and says so.
const raw: Record<string, unknown> = {
  ai: aiRaw,
};

export const CATEGORY_IDS = Object.keys(raw);
export const DEFAULT_CATEGORY = "ai";

/** Parsed at module load, so a malformed dataset fails the build, not the page. */
export function loadCategory(id: string): TimelineCategory {
  const found = raw[id];
  if (!found) throw new Error(`Unknown timeline category: ${id}`);
  const parsed = timelineCategory.safeParse(found);
  if (!parsed.success) {
    throw new Error(`content/${id}.json is invalid:\n${parsed.error.message}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export type Quarter = { year: number; q: 1 | 2 | 3 | 4; key: string };

export function quarterOf(date: string): Quarter {
  const [y, m] = date.split("-").map(Number);
  const q = (Math.floor((m - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return { year: y, q, key: `${y}-Q${q}` };
}

export function quarterLabel({ year, q }: Quarter): string {
  return `Q${q} ${year}`;
}

/**
 * Every quarter from the first event to the last, with none missing — gaps have
 * to occupy space or the axis lies about how fast things happened. The early
 * years are sparse on purpose: that emptiness is the story.
 */
export function quarterRange(events: TimelineEvent[]): Quarter[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const start = quarterOf(sorted[0].date);
  const end = quarterOf(sorted[sorted.length - 1].date);

  const out: Quarter[] = [];
  let { year, q } = start;
  for (;;) {
    out.push({ year, q: q as 1 | 2 | 3 | 4, key: `${year}-Q${q}` });
    if (year === end.year && q === end.q) break;
    if (q === 4) {
      q = 1;
      year += 1;
    } else {
      q = (q + 1) as 1 | 2 | 3 | 4;
    }
    // Guard against a malformed dataset spinning forever.
    if (out.length > 400) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shaping for the view
// ---------------------------------------------------------------------------

export type Cell = { quarter: Quarter; events: TimelineEvent[] };
export type EntityColumn = { entityId: string; cells: Map<string, TimelineEvent[]> };

/** Events bucketed by entity, then by quarter — the shape the grid renders. */
export function buildColumns(category: TimelineCategory): EntityColumn[] {
  return category.entities.map((entity) => {
    const cells = new Map<string, TimelineEvent[]>();
    for (const event of category.events) {
      if (event.entity !== entity.id) continue;
      const key = quarterOf(event.date).key;
      const bucket = cells.get(key);
      if (bucket) bucket.push(event);
      else cells.set(key, [event]);
    }
    for (const bucket of cells.values()) {
      bucket.sort((a, b) => a.date.localeCompare(b.date));
    }
    return { entityId: entity.id, cells };
  });
}

/** Long gaps with nothing in any column are collapsed rather than scrolled through. */
export function findEmptyRuns(
  quarters: Quarter[],
  category: TimelineCategory,
  minRun = 4,
): Set<string> {
  const occupied = new Set(category.events.map((e) => quarterOf(e.date).key));
  const collapsed = new Set<string>();
  let run: Quarter[] = [];

  const flush = () => {
    if (run.length >= minRun) {
      // Keep the first and last of a gap so the jump reads as deliberate.
      run.slice(1, -1).forEach((q) => collapsed.add(q.key));
    }
    run = [];
  };

  for (const q of quarters) {
    if (occupied.has(q.key)) flush();
    else run.push(q);
  }
  flush();
  return collapsed;
}

export type Row =
  | { type: "quarter"; quarter: Quarter }
  | { type: "gap"; from: Quarter; to: Quarter; quarters: number };

/**
 * The axis as rows to render. Quarters where nothing happened anywhere are
 * folded into a single gap marker rather than scrolled through — the early
 * years are mostly empty, and making the reader travel that emptiness in real
 * time buys nothing. The marker still states how long the gap was, so the
 * compression is visible rather than a silent lie about the pace.
 */
export function buildRows(
  quarters: Quarter[],
  category: TimelineCategory,
  minRun = 3,
): Row[] {
  const occupied = new Set(category.events.map((e) => quarterOf(e.date).key));
  const rows: Row[] = [];
  let run: Quarter[] = [];

  const flushRun = () => {
    if (run.length === 0) return;
    if (run.length >= minRun) {
      rows.push({
        type: "gap",
        from: run[0],
        to: run[run.length - 1],
        quarters: run.length,
      });
    } else {
      run.forEach((quarter) => rows.push({ type: "quarter", quarter }));
    }
    run = [];
  };

  for (const quarter of quarters) {
    if (occupied.has(quarter.key)) {
      flushRun();
      rows.push({ type: "quarter", quarter });
    } else {
      run.push(quarter);
    }
  }
  flushRun();
  return rows;
}

/** Events at or above the given weight. 1 shows everything. */
export function atWeight(events: TimelineEvent[], min: number): TimelineEvent[] {
  return events.filter((e) => e.weight >= min);
}
