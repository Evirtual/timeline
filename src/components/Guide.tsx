"use client";

import { useIsNarrow } from "@/lib/useIsNarrow";

/**
 * What the marks mean.
 *
 * The grid uses three conventions that are not self-evident — a hatched break
 * for skipped time, an accent dot for the events that mattered most, and a
 * detail control whose labels only make sense if you know events are weighted.
 * Inventing a visual language and not explaining it just makes the reader feel
 * stupid, so this is always on screen rather than hidden behind a help icon.
 */
export default function Guide() {
  const narrow = useIsNarrow();

  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pb-4 md:px-8">
      <div className="flex items-center gap-2">
        <dt className="shrink-0">
          <span
            aria-hidden="true"
            className="block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]"
          />
          <span className="sr-only">Accent dot</span>
        </dt>
        <dd className="text-[12px] text-[var(--color-ink-muted)]">
          A moment that changed the field
        </dd>
      </div>

      {!narrow && (
        <div className="flex items-center gap-2">
          <dt className="shrink-0">
            <span
              aria-hidden="true"
              className="gap-break block h-4 w-6 rounded-sm border border-[var(--color-border)]"
            />
            <span className="sr-only">Hatched column</span>
          </dt>
          <dd className="text-[12px] text-[var(--color-ink-muted)]">
            Quiet years, folded up so you don&apos;t scroll through them
          </dd>
        </div>
      )}

      <div className="flex items-center gap-2">
        <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
          Detail
        </dt>
        <dd className="text-[12px] text-[var(--color-ink-muted)]">
          {narrow
            ? "Tap any entry for the full story and its source"
            : "Key moments, or everything — the control on the right"}
        </dd>
      </div>

      {!narrow && (
        <div className="flex items-center gap-2">
          <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            Move
          </dt>
          <dd className="text-[12px] text-[var(--color-ink-muted)]">
            Drag or scroll across time · hold ctrl and scroll to zoom
          </dd>
        </div>
      )}
    </dl>
  );
}
