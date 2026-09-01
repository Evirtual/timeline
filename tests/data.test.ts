import { describe, it, expect } from "vitest";
import { loadCategory, quarterOf, quarterRange, buildColumns, CATEGORY_IDS } from "@/lib/timeline";

// The content is the product here, so these guard the data as much as the code.
// A wrong date or a dangling entity reference is worse than a layout bug: the
// whole point of the timeline is that you can trust what it says.

describe("category loading", () => {
  it("every declared category parses against the schema", () => {
    for (const id of CATEGORY_IDS) {
      expect(() => loadCategory(id)).not.toThrow();
    }
  });
});

describe("ai dataset integrity", () => {
  const ai = loadCategory("ai");

  it("has entities and events", () => {
    expect(ai.entities.length).toBeGreaterThan(0);
    expect(ai.events.length).toBeGreaterThan(0);
  });

  it("every event points at an entity that exists", () => {
    const ids = new Set(ai.entities.map((e) => e.id));
    const orphans = ai.events.filter((e) => !ids.has(e.entity));
    expect(orphans.map((e) => `${e.id} -> ${e.entity}`)).toEqual([]);
  });

  it("every entity has at least one event", () => {
    const used = new Set(ai.events.map((e) => e.entity));
    const empty = ai.entities.filter((e) => !used.has(e.id));
    expect(empty.map((e) => e.id)).toEqual([]);
  });

  it("event ids are unique", () => {
    const seen = new Map<string, number>();
    for (const e of ai.events) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
    expect(dupes).toEqual([]);
  });

  it("no event is dated in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    const future = ai.events.filter((e) => e.date > today);
    expect(future.map((e) => `${e.id} (${e.date})`)).toEqual([]);
  });

  it("every source is an http(s) url", () => {
    const bad = ai.events.filter((e) => !/^https?:\/\//.test(e.source));
    expect(bad.map((e) => e.id)).toEqual([]);
  });

  it("only model events carry model facts", () => {
    const wrong = ai.events.filter((e) => e.model && e.kind !== "model");
    expect(wrong.map((e) => e.id)).toEqual([]);
  });

  it("summaries are a sentence or two, not an essay", () => {
    const tooLong = ai.events.filter((e) => e.summary.length > 320);
    expect(tooLong.map((e) => `${e.id} (${e.summary.length})`)).toEqual([]);
  });
});

describe("quarter maths", () => {
  it("maps months onto the right quarter", () => {
    expect(quarterOf("2024-01-15").key).toBe("2024-Q1");
    expect(quarterOf("2024-03-31").key).toBe("2024-Q1");
    expect(quarterOf("2024-04-01").key).toBe("2024-Q2");
    expect(quarterOf("2024-12-31").key).toBe("2024-Q4");
  });

  it("spans a range with no quarters missing and none repeated", () => {
    const range = quarterRange([
      { date: "2020-02-01" },
      { date: "2021-07-01" },
    ] as never);
    expect(range[0].key).toBe("2020-Q1");
    expect(range[range.length - 1].key).toBe("2021-Q3");
    expect(range).toHaveLength(7);
    expect(new Set(range.map((q) => q.key)).size).toBe(range.length);
  });

  it("handles a single event", () => {
    const range = quarterRange([{ date: "2023-05-05" }] as never);
    expect(range.map((q) => q.key)).toEqual(["2023-Q2"]);
  });

  it("returns nothing for no events", () => {
    expect(quarterRange([])).toEqual([]);
  });
});

describe("column building", () => {
  const ai = loadCategory("ai");
  const columns = buildColumns(ai);

  it("builds one column per entity, in declared order", () => {
    expect(columns.map((c) => c.entityId)).toEqual(ai.entities.map((e) => e.id));
  });

  it("places every event in exactly one cell", () => {
    const placed = columns.reduce(
      (n, col) => n + [...col.cells.values()].reduce((m, list) => m + list.length, 0),
      0,
    );
    expect(placed).toBe(ai.events.length);
  });

  it("sorts events within a quarter by date", () => {
    for (const col of columns) {
      for (const bucket of col.cells.values()) {
        const dates = bucket.map((e) => e.date);
        expect(dates).toEqual([...dates].sort());
      }
    }
  });
});
