const LEVELS = ["Chatbots", "Reasoners", "Agents", "Innovators", "Organizations"];

/**
 * OpenAI's five-level capability ladder, with a marker for roughly where
 * outside analysts place the frontier.
 *
 * The caveat underneath is part of the design, not a disclaimer to trim: this
 * is one dated opinion rendered as an instrument, and a gauge is a persuasive
 * shape. Saying so is the price of using it.
 *
 * Two layout notes, both bugs in the original: the marker tag is positioned
 * above the track and reserves no space of its own, so the track carries top
 * padding — without it the tag lands on the paragraph above at every width.
 * And the level names are given room to wrap, because at 375px they otherwise
 * grow to exactly their text width and run together into one line.
 */
export default function CapabilityGauge({ level = 2.5 }: { level?: number }) {
  const total = LEVELS.length;
  const markerPct = (level / total) * 100;

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-5 md:p-6">
      <h2 className="text-lg font-medium tracking-tight text-[var(--color-ink)]">
        Where the frontier sits, on one framework
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
        OpenAI&apos;s own five-level capability ladder, disclosed internally in
        July 2024. The marker is outside analysts&apos; rough read, not an
        OpenAI score.
      </p>

      {/* Reserves the space the absolutely-positioned marker needs. */}
      <div className="relative mt-11">
        <div
          className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[var(--kind-claim)]"
          style={{ left: `${markerPct}%` }}
        >
          ≈ here, per outside analysts
        </div>
        <div
          className="pointer-events-none absolute -top-2 z-10 h-8 w-0.5 bg-[var(--kind-claim)]"
          style={{ left: `${markerPct}%` }}
        />

        <div className="flex h-3.5 gap-[3px]">
          {LEVELS.map((_, i) => {
            const filled = Math.min(1, Math.max(0, level - i));
            return (
              <div
                key={i}
                className="relative flex-1 overflow-hidden border border-[var(--color-border-strong)] bg-[var(--color-bg)] first:rounded-l-full last:rounded-r-full"
              >
                {filled > 0 && (
                  <div
                    className="h-full bg-[var(--kind-claim)] opacity-35"
                    style={{ width: `${filled * 100}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div lang="en" className="mt-2 grid grid-cols-5 gap-x-1">
        {LEVELS.map((name, i) => (
          <div key={name} className="text-center">
            <span className="block font-mono text-[10px] font-semibold text-[var(--color-ink-muted)]">
              {i + 1}
            </span>
            <span className="block hyphens-auto break-words text-[10px] leading-tight text-[var(--color-ink-faint)] sm:text-[11px]">
              {name}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-[var(--color-border)] pt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-faint)]">
        Nobody agrees this ladder is the right one, or that &ldquo;AGI&rdquo; is
        a single threshold rather than a fuzzy region. Treat the marker as one
        dated opinion, not a reading off an instrument — the whole view is,
        honestly.
      </p>
    </section>
  );
}
