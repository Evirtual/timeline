"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineCategory, TimelineEvent } from "@/lib/schema";
import { buildRows, quarterOf, quarterRange } from "@/lib/timeline";
import { useTimelineControls, ZOOM_MAX, ZOOM_MIN } from "@/lib/useTimelineControls";
import EventDialog from "./EventDialog";

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  model: "Model",
  product: "Product",
  research: "Research",
  funding: "Funding",
  org: "Org",
  policy: "Policy",
};

const DETAIL_LEVELS = [
  { v: 3, label: "Key moments" },
  { v: 2, label: "Significant" },
  { v: 1, label: "Everything" },
] as const;

/**
 * Organisations are rows and time runs left to right.
 *
 * The obvious alternative — a column per organisation, time running down — puts
 * only five or six columns on screen at once and one on a phone. Since the
 * entire point is reading across organisations at a moment in time, that
 * layout defeats itself: you cannot compare what you cannot see together. As
 * rows, all of them stay visible and only time scrolls.
 */
export default function TimelineGrid({ category }: { category: TimelineCategory }) {
  const [minWeight, setMinWeight] = useState<number>(2);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { zoom, zoomAt, resetZoom } = useTimelineControls(scroller, () =>
    labelRef.current ? labelRef.current.getBoundingClientRect().width : 0,
  );
  // Below this a title cannot fit, so cards become bars and lean on the tooltip
  // and the dialog instead of truncating into noise.
  const compact = zoom < 108;

  const visible = useMemo(
    () => category.events.filter((e) => e.weight >= minWeight),
    [category.events, minWeight],
  );

  // Columns come from the visible set, so raising the detail level collapses
  // the stretches that just emptied rather than leaving dead space behind.
  const columns = useMemo(() => {
    const shown: TimelineCategory = { ...category, events: visible };
    return buildRows(quarterRange(visible), shown);
  }, [category, visible]);

  // quarter key -> entity id -> events
  const cells = useMemo(() => {
    const map = new Map<string, Map<string, TimelineEvent[]>>();
    for (const event of visible) {
      const key = quarterOf(event.date).key;
      let column = map.get(key);
      if (!column) map.set(key, (column = new Map()));
      const bucket = column.get(event.entity);
      if (bucket) bucket.push(event);
      else column.set(event.entity, [event]);
    }
    for (const column of map.values()) {
      for (const bucket of column.values()) {
        bucket.sort((a, b) => a.date.localeCompare(b.date));
      }
    }
    return map;
  }, [visible]);

  // Open on the present. The recent years are why anyone is here, and starting
  // at 2007 would make the first impression an empty screen. Deferred a frame
  // because scrollWidth is not final until the grid has actually laid out —
  // set it synchronously and a phone lands short of the end.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [columns]);

  const template = `var(--label) repeat(${columns.length}, ${zoom}px)`;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          {visible.length} events
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] p-1">
            <button
              type="button"
              onClick={() => zoomAt(1 / 1.35)}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
              className="rounded-full px-2.5 py-1 font-mono text-[13px] leading-none text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-30"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              aria-label="Reset zoom"
              className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => zoomAt(1.35)}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
              className="rounded-full px-2.5 py-1 font-mono text-[13px] leading-none text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-30"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] p-1">
          {DETAIL_LEVELS.map((opt) => (
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
      </div>

      <div
        ref={scroller}
        tabIndex={0}
        role="group"
        aria-label="Timeline. Drag or use arrow keys to move through time, ctrl and scroll to zoom."
        className="scroll-region cursor-grab overflow-x-auto pb-6 focus-visible:outline-none"
      >
        <div className="min-w-max">
          {/* Time axis, sticky to the top. */}
          <div
            className="sticky top-0 z-30 grid bg-[var(--color-bg)]"
            style={{ gridTemplateColumns: template }}
          >
            <div
              ref={labelRef}
              className="sticky left-0 z-40 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] pl-4 md:pl-8"
            />
            {columns.map((column) => {
              if (column.type === "gap") {
                return (
                  <div
                    key={`gap-${column.from.key}`}
                    className="border-b border-[var(--color-border-strong)] px-1 pb-2 pt-2 text-center"
                  >
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">···</span>
                  </div>
                );
              }
              const { quarter } = column;
              const isYearStart = quarter.q === 1;
              return (
                <div
                  key={quarter.key}
                  className={`border-b border-[var(--color-border-strong)] px-2 pb-2 pt-2 ${
                    isYearStart ? "border-l border-l-[var(--color-border-strong)]" : ""
                  }`}
                >
                  <span
                    className={`block font-mono text-[11px] ${
                      isYearStart
                        ? "font-medium text-[var(--color-ink)]"
                        : "text-[var(--color-ink-faint)]"
                    }`}
                  >
                    {isYearStart ? quarter.year : `Q${quarter.q}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* One row per organisation. All of them stay on screen. */}
          {category.entities.map((entity) => (
            <div
              key={entity.id}
              className="grid border-b border-[var(--color-border)]"
              style={{ gridTemplateColumns: template }}
            >
              <div className="sticky left-0 z-20 flex items-start gap-2 bg-[var(--color-bg)] py-3 pl-4 pr-3 md:pl-8">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entity.color }}
                />
                <span className="text-[13px] font-medium leading-tight text-[var(--color-ink)]">
                  {entity.name}
                </span>
              </div>

              {columns.map((column) => {
                if (column.type === "gap") {
                  return (
                    <div
                      key={`gap-${column.from.key}`}
                      className="flex items-center justify-center py-3"
                      title={`${column.quarters} quarters with nothing`}
                    >
                      <span className="h-px w-full bg-[var(--color-border)]" />
                    </div>
                  );
                }
                const events = cells.get(column.quarter.key)?.get(entity.id) ?? [];
                const isYearStart = column.quarter.q === 1;
                return (
                  <div
                    key={column.quarter.key}
                    className={`px-1 py-2 ${
                      isYearStart ? "border-l border-[var(--color-border-strong)]" : ""
                    }`}
                  >
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        data-event={event.id}
                        onClick={() => setSelected(event)}
                        title={`${event.title} — ${event.summary}`}
                        className={`mb-1 block w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-border)] ${
                          compact ? "h-3.5" : "px-2 py-1.5"
                        }`}
                        style={{ borderLeft: `2px solid ${entity.color}` }}
                      >
                        {compact ? (
                          <span className="sr-only">{event.title}</span>
                        ) : (
                          <span className="flex items-start justify-between gap-1">
                            <span className="line-clamp-2 text-[12px] font-medium leading-snug text-[var(--color-ink)]">
                              {event.title}
                            </span>
                            {event.weight === 3 && (
                              <span
                                aria-hidden="true"
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                              />
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)] md:px-8">
        Drag or scroll to move through time · ctrl + scroll to zoom · ··· marks a stretch with nothing in it
      </p>

      <EventDialog
        event={selected}
        entity={
          selected ? (category.entities.find((e) => e.id === selected.entity) ?? null) : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export { KIND_LABEL };
