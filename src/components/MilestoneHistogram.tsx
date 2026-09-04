"use client";

import type { Bin } from "@/lib/chronicle";

/**
 * Milestones per half-decade, and the navigation.
 *
 * The chart is the argument the page makes before you read a single card: a
 * flat century, then a curve. It counts threshold-moving events rather than
 * releases, so a quarter with four new models and no new answer counts zero.
 *
 * Heights are percentages of the track, which is why the ghost for the open
 * bin can be pure CSS — the earlier version measured the track in pixels
 * because a percentage on a child resolves against its parent, not the track.
 * Making each bin a full-height column and stacking bar and ghost inside it
 * removes the measurement entirely.
 */
export default function MilestoneHistogram({
  bins,
  openIsFastest,
  onPick,
}: {
  bins: Bin[];
  openIsFastest: boolean;
  onPick: (start: number) => void;
}) {
  // Scale to the projection too, so the ghost cannot overflow the track.
  const max = Math.max(...bins.map((b) => Math.max(b.count, b.open ? b.projected : 0)), 1);

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-[var(--color-ink-faint)]">
        Threshold-moving events per half-decade — 1950 to now. Not release
        cadence: a quarter with four new models and no new answer counts zero
      </p>

      <div className="flex h-14 items-end gap-[3px]">
        {bins.map((b) => {
          const barPct = Math.max(3, (b.count / max) * 100);
          const ghostPct = b.open ? Math.max(0, ((b.projected - b.count) / max) * 100) : 0;

          const title = b.open
            ? `${b.start}–${b.start + 4}: ${b.count} so far, ${b.yearsIn.toFixed(1)} of 5 years elapsed — running at ${(
                b.count / b.yearsIn
              ).toFixed(1)}/yr${
                openIsFastest ? ", the fastest stretch on this chart" : ""
              }. The dashed outline is that rate carried to a full half-decade.`
            : `${b.start}–${b.start + 4}: ${b.count} milestone${b.count === 1 ? "" : "s"}`;

          return (
            <button
              key={b.start}
              type="button"
              onClick={() => onPick(b.start)}
              title={title}
              aria-label={title}
              className="group flex h-full flex-1 cursor-pointer flex-col justify-end"
            >
              {ghostPct > 0 && <span className="bin-ghost block" style={{ height: `${ghostPct}%` }} />}
              <span
                className={
                  b.open
                    ? "block rounded-t-sm bg-[var(--kind-claim)]"
                    : "block rounded-t-sm bg-[var(--color-ink-faint)] opacity-40 transition-opacity group-hover:opacity-100"
                }
                style={{ height: `${barPct}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[3px]">
        {bins.map((b, i) => (
          <div
            key={b.start}
            className="flex-1 text-center font-mono text-[9px] text-[var(--color-ink-faint)]"
          >
            {i % 3 === 0 ? `'${String(b.start).slice(2)}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
