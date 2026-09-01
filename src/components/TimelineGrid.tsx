"use client";

import { useMemo, useState } from "react";
import type { TimelineCategory, TimelineEvent } from "@/lib/schema";
import { buildRows, quarterOf, quarterRange } from "@/lib/timeline";
import EventDialog from "./EventDialog";

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  model: "Model",
  product: "Product",
  research: "Research",
  funding: "Funding",
  org: "Org",
  policy: "Policy",
};


export default function TimelineGrid({ category }: { category: TimelineCategory }) {
  const [minWeight, setMinWeight] = useState(2);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  const visible = useMemo(
    () => category.events.filter((e) => e.weight >= minWeight),
    [category.events, minWeight],
  );

  // Rows come from the visible set, so raising the detail level collapses the
  // stretches that just emptied rather than leaving them as dead space.
  const rows = useMemo(() => {
    const shown: TimelineCategory = { ...category, events: visible };
    return buildRows(quarterRange(visible), shown);
  }, [category, visible]);

  // quarter key -> entity id -> events
  const grid = useMemo(() => {
    const map = new Map<string, Map<string, TimelineEvent[]>>();
    for (const event of visible) {
      const key = quarterOf(event.date).key;
      let row = map.get(key);
      if (!row) map.set(key, (row = new Map()));
      const cell = row.get(event.entity);
      if (cell) cell.push(event);
      else row.set(event.entity, [event]);
    }
    for (const row of map.values()) {
      for (const cell of row.values()) cell.sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [visible]);

  const colorOf = useMemo(
    () => new Map(category.entities.map((e) => [e.id, e.color])),
    [category.entities],
  );

  // Widths come from CSS custom properties so they can respond to the viewport.
  // Trailing spacer keeps the last column off the viewport edge without
  // padding the scrolling content, which would unstick the axis.
  const template = `var(--axis) repeat(${category.entities.length}, var(--col)) var(--gutter)`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          {visible.length} events · {category.entities.length} organisations
        </p>
        <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] p-1">
          {[
            { v: 3, label: "Key moments" },
            { v: 2, label: "Significant" },
            { v: 1, label: "Everything" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setMinWeight(opt.v)}
              aria-pressed={minWeight === opt.v}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
                minWeight === opt.v
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-region overflow-x-auto pb-16">
        <div className="min-w-max">
          {/* Header row: sticky to the top so you never lose which column is who. */}
          <div
            className="sticky top-0 z-30 grid bg-[var(--color-bg)]"
            style={{ gridTemplateColumns: template }}
          >
            <div className="sticky left-0 z-40 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)]" />
            {category.entities.map((entity) => (
              <div
                key={entity.id}
                className="border-b border-[var(--color-border-strong)] px-2 pb-2 pt-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: entity.color }}
                  />
                  <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {entity.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => {
            if (row.type === "gap") {
              return (
                <div
                  key={`gap-${row.from.key}`}
                  className="grid"
                  style={{ gridTemplateColumns: template }}
                >
                  <div className="sticky left-0 z-20 bg-[var(--color-bg)]" />
                  <div
                    className="flex items-center gap-3 py-3 pl-2"
                    style={{ gridColumn: `2 / span ${category.entities.length}` }}
                  >
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                      {row.quarters} quiet quarters
                    </span>
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                  </div>
                </div>
              );
            }

            const rowEvents = grid.get(row.quarter.key);
            // Q1 anchors the year; so does the very first row, which would
            // otherwise open on a bare quarter with nothing to date it.
            const isYearStart = row.quarter.q === 1;
            const showsYear = isYearStart || rowIndex === 0;

            return (
              <div
                key={row.quarter.key}
                className="grid"
                style={{ gridTemplateColumns: template }}
              >
                {/* Axis: sticky to the left so the date survives horizontal scroll. */}
                <div
                  className={`sticky left-0 z-20 bg-[var(--color-bg)] pl-4 pr-3 pt-3 text-right md:pl-8 ${
                    isYearStart ? "border-t border-[var(--color-border)]" : ""
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] ${
                      showsYear
                        ? "text-[var(--color-ink-muted)]"
                        : "text-[var(--color-ink-faint)]"
                    }`}
                  >
                    {showsYear ? row.quarter.year : `Q${row.quarter.q}`}
                  </span>
                </div>

                {category.entities.map((entity) => {
                  const events = rowEvents?.get(entity.id) ?? [];
                  return (
                    <div
                      key={entity.id}
                      className={`px-1 pb-1 pt-3 ${
                        isYearStart ? "border-t border-[var(--color-border)]" : ""
                      }`}
                    >
                      {events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          data-event={event.id}
                          onClick={() => setSelected(event)}
                          className="group mb-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-2 text-left transition-colors hover:border-[var(--color-border-strong)]"
                          style={{ borderLeft: `2px solid ${colorOf.get(entity.id)}` }}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-medium leading-snug text-[var(--color-ink)]">
                              {event.title}
                            </span>
                            {event.weight === 3 && (
                              <span
                                aria-label="Key moment"
                                title="Key moment"
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                              />
                            )}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
                            <span>{KIND_LABEL[event.kind]}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {new Date(event.date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <EventDialog
        event={selected}
        entity={
          selected
            ? (category.entities.find((e) => e.id === selected.entity) ?? null)
            : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export { KIND_LABEL };
