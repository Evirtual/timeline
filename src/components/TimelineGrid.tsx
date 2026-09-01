"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineCategory, TimelineEvent } from "@/lib/schema";
import { buildRows, quarterOf, quarterRange } from "@/lib/timeline";
import { useTimelineControls, ZOOM_MAX, ZOOM_MIN } from "@/lib/useTimelineControls";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { tintVars } from "@/lib/color";
import EventDialog from "./EventDialog";
import MobileTimeline from "./MobileTimeline";

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
  const narrow = useIsNarrow();
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

  // Below md the race grid cannot show enough columns to compare anything, so
  // the phone gets a view built for the question it can actually answer.
  if (narrow) return <MobileTimeline category={category} />;

  // A gutter either side of the quarters. Without the leading one the first
  // card sits flush against the divider the moment you scroll to the start,
  // and the trailing one keeps the last card off the viewport edge. They are
  // grid tracks rather than padding on the scrolling content, which would
  // unstick the pinned column.
  const template = `var(--label) var(--lead) ${columns
    .map((c) => (c.type === "gap" ? "var(--gapcol)" : `${zoom}px`))
    .join(" ")} var(--lead)`;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          {visible.length} events
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
              className="sticky-label sticky left-0 z-40 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] pl-4 md:pl-8"
            />
            <div className="border-b border-[var(--color-border-strong)]" />
            {columns.map((column) => {
              if (column.type === "gap") {
                return (
                  <div
                    key={`gap-${column.from.key}`}
                    title={`${column.quarters} quarters with nothing in them, skipped`}
                    className="gap-break border-b border-[var(--color-border-strong)] pb-2 pt-2 text-center"
                  >
                    <span className="block font-mono text-[10px] leading-tight text-[var(--color-ink-faint)]">
                      ···
                      <span className="mt-0.5 block">
                        {Math.max(1, Math.round(column.quarters / 4))}y
                      </span>
                    </span>
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
              className="row-band grid border-b border-[var(--color-border)]"
              // A wash of the organisation own colour, so eight rows read as
              // eight bands rather than one striped block. The stylesheet picks
              // the neon or pastel variant depending on the theme.
              style={{ gridTemplateColumns: template, ...tintVars(entity.color) }}
            >
              {/* Stronger tint, painted opaquely: cards scroll under this
                  cell, so a translucent fill would let them show through. */}
              <div className="sticky-label row-label sticky left-0 z-20 flex items-center gap-2 py-3 pl-4 pr-3 md:pl-8">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entity.color }}
                />
                <span className="text-[13px] font-medium leading-tight text-[var(--color-ink)]">
                  {entity.name}
                </span>
              </div>

              <div />

              {columns.map((column) => {
                if (column.type === "gap") {
                  // No content, and no line either: the break is drawn on the
                  // column itself, once, rather than repeated in every row.
                  return <div key={`gap-${column.from.key}`} className="gap-break py-3" />;
                }
                const events = cells.get(column.quarter.key)?.get(entity.id) ?? [];
                const isYearStart = column.quarter.q === 1;
                return (
                  <div
                    key={column.quarter.key}
                    className={`flex flex-col justify-center gap-1 px-2 py-2 ${
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
                        className={`block w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-border)] ${
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
