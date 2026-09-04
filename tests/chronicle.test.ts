import { describe, expect, it } from "vitest";
import { loadChronicle, bins, groupByEra, inEra, elapsed, eraRange, openIsFastest } from "@/lib/chronicle";

const data = loadChronicle();

/**
 * Milestones allowed to carry no source, each with the reason. Everything else
 * needs a citation — that rule is most of why this view is worth reading, so
 * the exceptions are deliberately few and written down rather than tolerated.
 */
const SOURCELESS_OK: Record<string, string> = {
  "second-ai-winter": "a multi-year market collapse has no single citable event",
};

describe("content/agi.json", () => {
  it("parses against the schema", () => {
    expect(data.milestones.length).toBeGreaterThan(0);
    expect(data.eras.length).toBeGreaterThan(0);
  });

  it("has unique milestone ids", () => {
    const ids = data.milestones.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is sorted by date", () => {
    const dates = data.milestones.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("dates nothing in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const m of data.milestones) expect(m.date <= today).toBe(true);
  });

  it("cites every milestone, bar the documented exceptions", () => {
    for (const m of data.milestones) {
      if (m.sources.length === 0) {
        expect(
          SOURCELESS_OK[m.id],
          `${m.id} has no source and no recorded reason`,
        ).toBeTruthy();
      }
    }
  });

  it("marks exactly one milestone as the latest, and it is the newest", () => {
    const flagged = data.milestones.filter((m) => m.now);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].id).toBe(data.milestones[data.milestones.length - 1].id);
  });

  it("puts every milestone in exactly one era", () => {
    for (const m of data.milestones) {
      const hits = data.eras.filter((e) => inEra(m, e));
      expect(hits, `${m.id} (${m.date}) landed in ${hits.length} eras`).toHaveLength(1);
    }
  });

  it("keeps eras contiguous and ordered", () => {
    for (let i = 0; i < data.eras.length; i++) {
      expect(data.eras[i].from < data.eras[i].before).toBe(true);
      if (i > 0) expect(data.eras[i - 1].before).toBe(data.eras[i].from);
    }
  });

  it("carries no HTML entities — this renders as text, not innerHTML", () => {
    for (const m of data.milestones) {
      expect(m.title + m.summary).not.toMatch(/&(amp|mdash|lt|gt|#\d+);/);
    }
  });

  it("stays small enough that the inclusion test is still being applied", () => {
    // Not a hard rule, a tripwire: past ~30 the view has drifted back into
    // being a release log, which is the sibling view's job.
    expect(data.milestones.length).toBeLessThanOrEqual(30);
  });
});

describe("era grouping", () => {
  it("drops empty eras and keeps every milestone", () => {
    const groups = groupByEra(data);
    const total = groups.reduce((n, g) => n + g.milestones.length, 0);
    expect(total).toBe(data.milestones.length);
    for (const g of groups) expect(g.milestones.length).toBeGreaterThan(0);
  });

  it("labels the era we are living in as ending now", () => {
    expect(eraRange({ from: "2026", before: "2027", name: "x", note: "y" }, 2026)).toBe("2026–now");
    expect(eraRange({ from: "1950", before: "1974", name: "x", note: "y" }, 2026)).toBe("1950–1973");
  });

  it("treats era bounds as half-open", () => {
    const era = { from: "2023", before: "2024", name: "x", note: "y" };
    const at = (date: string) => inEra({ date } as never, era);
    expect(at("2023")).toBe(true);
    expect(at("2023-03-14")).toBe(true);
    expect(at("2023-12-31")).toBe(true);
    expect(at("2024")).toBe(false);
    expect(at("2022-12-31")).toBe(false);
  });
});

describe("histogram bins", () => {
  it("covers 1950 to the open half-decade in steps of five", () => {
    const b = bins(data, new Date("2026-09-04T00:00:00Z"));
    expect(b[0].start).toBe(1950);
    expect(b[b.length - 1].start).toBe(2025);
    expect(b[b.length - 1].open).toBe(true);
    expect(b.filter((x) => x.open)).toHaveLength(1);
  });

  it("counts every milestone exactly once", () => {
    const b = bins(data, new Date("2026-09-04T00:00:00Z"));
    expect(b.reduce((n, x) => n + x.count, 0)).toBe(data.milestones.length);
  });

  it("projects the open bin at its current rate", () => {
    const b = bins(data, new Date("2026-09-04T00:00:00Z"));
    const open = b.find((x) => x.open)!;
    expect(open.yearsIn).toBeCloseTo(1.675, 2);
    expect(open.projected).toBeCloseTo((open.count / open.yearsIn) * 5);
  });

  it("closed bins are never projected up", () => {
    for (const b of bins(data, new Date("2026-09-04T00:00:00Z")).filter((x) => !x.open)) {
      expect(b.yearsIn).toBe(5);
      expect(b.projected).toBe(b.count);
    }
  });

  it("only calls the open bin fastest when it actually is", () => {
    const slow = [
      { start: 2020, count: 10, open: false, yearsIn: 5, projected: 10 },
      { start: 2025, count: 1, open: true, yearsIn: 2, projected: 2.5 },
    ];
    const fast = [
      { start: 2020, count: 2, open: false, yearsIn: 5, projected: 2 },
      { start: 2025, count: 5, open: true, yearsIn: 2, projected: 12.5 },
    ];
    expect(openIsFastest(slow)).toBe(false);
    expect(openIsFastest(fast)).toBe(true);
  });
});

describe("elapsed", () => {
  const now = new Date("2026-09-04T00:00:00Z");

  it("pads variable-precision dates", () => {
    expect(elapsed("2026-09-03", now)).toBe("1 day");
    expect(elapsed("2026-09", now)).toBe("3 days");
  });

  it("switches to years past two", () => {
    expect(elapsed("1956-06-18", now)).toMatch(/^70\.\d years$/);
  });
});
