"use client";

import { useMemo, useState } from "react";
import type { TimelineCategory, TimelineEvent } from "@/lib/schema";
import EventDialog from "./EventDialog";

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  model: "Model",
  product: "Product",
  research: "Research",
  funding: "Funding",
  org: "Org",
  policy: "Policy",
};

/**
 * The phone view: one organisation at a time, its history running down the page.
 *
 * The race grid does not survive a 360px viewport — eight columns of quarters
 * leave about one and a half on screen, so the comparison it exists for is
 * impossible and you are left swiping through a spreadsheet. Rather than shrink
 * that layout until it is merely bad, this answers the question a phone can
 * actually answer: what did this company do, and when.
 *
 * Newest first, because the recent years are why anyone opens this and nobody
 * wants to scroll through 2015 to reach them.
 */
export default function MobileTimeline({ category }: { category: TimelineCategory }) {
  const [entityId, setEntityId] = useState(category.entities[0].id);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  const entity = category.entities.find((e) => e.id === entityId) ?? category.entities[0];

  const events = useMemo(
    () =>
      category.events
        .filter((e) => e.entity === entityId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [category.events, entityId],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of category.events) map.set(e.entity, (map.get(e.entity) ?? 0) + 1);
    return map;
  }, [category.events]);

  return (
    <div className="px-4">
      {/* Horizontally scrolling picker: eight names will not fit across a phone,
          and a native select hides the colours that identify each one. */}
      <div className="scroll-region -mx-4 overflow-x-auto px-4 pb-2">
        <div
          role="tablist"
          aria-label="Organisation"
          className="flex w-max gap-2"
        >
          {category.entities.map((e) => {
            const active = e.id === entityId;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setEntityId(e.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] text-[var(--color-ink)]"
                    : "border-[var(--color-border)] text-[var(--color-ink-muted)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: e.color }}
                />
                {e.name}
                <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                  {counts.get(e.id) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 leading-relaxed text-[var(--color-ink-muted)]">{entity.blurb}</p>

      {/* The same rail the portfolio uses, so the two sites read as one family. */}
      <ol className="relative mt-6 border-l border-[var(--color-border)] pb-8 pl-5">
        {events.map((event, i) => (
          <li key={event.id} className={i === events.length - 1 ? "" : "pb-6"}>
            <span
              aria-hidden="true"
              className="absolute -left-[4.5px] mt-[7px] h-[9px] w-[9px] rounded-full ring-4 ring-[var(--color-bg)]"
              style={{
                background:
                  event.weight === 3 ? entity.color : "var(--color-border-strong)",
              }}
            />
            <button
              type="button"
              data-event={event.id}
              onClick={() => setSelected(event)}
              className="block w-full text-left"
            >
              <span className="block font-mono text-[11px] tracking-wide text-[var(--color-ink-faint)]">
                {new Date(event.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                <span aria-hidden="true"> · </span>
                {KIND_LABEL[event.kind]}
              </span>
              <span className="mt-1 block text-[15px] font-medium leading-snug text-[var(--color-ink)]">
                {event.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {event.summary}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <EventDialog event={selected} entity={entity} onClose={() => setSelected(null)} />
    </div>
  );
}
