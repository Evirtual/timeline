"use client";

import { useMemo, useRef, useState } from "react";
import type { Chronicle as ChronicleData, Milestone, MilestoneKind } from "@/lib/chronicle-schema";
import {
  KIND_LABELS,
  bins as computeBins,
  elapsed,
  eraRange,
  groupByEra,
  openIsFastest,
  yearOf,
} from "@/lib/chronicle";
import MilestoneHistogram from "./MilestoneHistogram";
import CapabilityGauge from "./CapabilityGauge";

const KINDS = Object.keys(KIND_LABELS) as MilestoneKind[];

const SWATCH: Record<MilestoneKind, string> = {
  breakthrough: "bg-[var(--kind-breakthrough)]",
  release: "bg-[var(--kind-release)]",
  setback: "bg-[var(--kind-setback)]",
  claim: "bg-[var(--kind-claim)]",
};

export default function Chronicle({ data }: { data: ChronicleData }) {
  const [hidden, setHidden] = useState<Set<MilestoneKind>>(new Set());
  const eraRefs = useRef<Record<number, HTMLElement | null>>({});

  // Rendered once on the client. Reading the clock during render on the server
  // would bake the build date into a static export and quietly freeze every
  // counter, so `now` is state seeded on mount.
  const [now] = useState(() => new Date());
  const thisYear = now.getFullYear();

  // Newest first. The data is stored oldest-first because that is the order it
  // is reasoned about and validated in, but the thing a reader arrives wanting
  // is what just happened — and on this view the newest entry is the live claim
  // the whole page is arguing with. Reading back into the winters from there is
  // the right direction of travel.
  const groups = useMemo(
    () =>
      groupByEra(data)
        .reverse()
        .map((g) => ({ ...g, milestones: [...g.milestones].reverse() })),
    [data],
  );
  const bins = useMemo(() => computeBins(data, thisYear), [data, thisYear]);
  const fastest = useMemo(() => openIsFastest(bins), [bins]);
  const counters = useMemo(() => data.milestones.filter((m) => m.counter), [data]);

  const counts = useMemo(() => {
    const c = {} as Record<MilestoneKind, number>;
    for (const k of KINDS) c[k] = data.milestones.filter((m) => m.kind === k).length;
    return c;
  }, [data]);

  function toggle(kind: MilestoneKind) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  /** Jump to the first era the half-decade touches. Bins and eras do not line
      up, so this lands you in the right neighbourhood, not exactly. */
  function jumpTo(start: number) {
    const idx = groups.findIndex((g) => yearOf(g.era.before) > start && yearOf(g.era.from) <= start + 4);
    const target = eraRefs.current[idx === -1 ? groups.length - 1 : idx];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="px-4 md:px-8">
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] text-[var(--color-ink-faint)]">
          {counters.map((m) => (
            <span key={m.id}>
              <b className="font-semibold text-[var(--color-ink)]">{elapsed(m.date, now)}</b>{" "}
              {m.counter}
            </span>
          ))}
        </div>

        <div className="mt-6 border-t border-dashed border-[var(--color-border)] pt-5">
          <MilestoneHistogram bins={bins} openIsFastest={fastest} onPick={jumpTo} />
        </div>

        {/* Full measure, matching the chart above and the cards below. It was
            narrower, which made the three read as unrelated blocks. */}
        <div className="mt-8">
          <CapabilityGauge />
        </div>
      </div>

      <div className="sticky top-0 z-20 mt-7 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 md:px-8">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => {
            const on = !hidden.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-raised)] py-1.5 pl-2.5 pr-3 font-mono text-[12px] text-[var(--color-ink-muted)] transition-opacity ${
                  on ? "" : "opacity-40"
                }`}
              >
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${SWATCH[k]}`} />
                {KIND_LABELS[k]}
                <span className="text-[var(--color-ink-faint)]">{counts[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-4 md:px-8">
        {groups.map((g, i) => {
          const visible = g.milestones.filter((m) => !hidden.has(m.kind));
          return (
            <section
              key={g.era.from}
              ref={(el) => {
                eraRefs.current[i] = el;
              }}
              className="scroll-mt-24"
            >
              <div className="flex items-baseline gap-3 border-b border-[var(--color-border)] pb-2 pt-8">
                <h2 className="text-xl font-medium tracking-tight text-[var(--color-ink)]">
                  {g.era.name}
                </h2>
                <span className="font-mono text-[12px] text-[var(--color-ink-faint)]">
                  {eraRange(g.era, thisYear)}
                </span>
              </div>
              <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {g.era.note}
              </p>

              {visible.length === 0 ? (
                <p className="py-6 text-[13px] text-[var(--color-ink-faint)]">
                  Everything in this era is filtered out.
                </p>
              ) : (
                visible.map((m) => <Card key={m.id} milestone={m} />)
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}

function Card({ milestone: m }: { milestone: Milestone }) {
  // The winters are the reason to be careful about the claims, so they stay
  // visible and quiet at once: dashed rule, dimmed, never hidden.
  const setback = m.kind === "setback" ? "border-l-2 border-dashed border-l-[var(--color-border-strong)] pl-3.5 opacity-85" : "";
  const latest = m.now
    ? "rounded-lg bg-[color-mix(in_oklab,var(--kind-claim)_8%,transparent)] px-3 ring-1 ring-[color-mix(in_oklab,var(--kind-claim)_40%,transparent)]"
    : "";

  return (
    <article
      id={m.id}
      className={`grid grid-cols-1 gap-y-1 border-b border-[var(--color-border)] py-4 md:grid-cols-[96px_1fr] md:gap-x-4 ${setback} ${latest}`}
    >
      <div className="pt-0.5 font-mono text-[12.5px] text-[var(--color-ink-faint)]">{m.display}</div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${SWATCH[m.kind]}`} />
            {KIND_LABELS[m.kind]}
          </span>
          {m.critical && (
            <span className="rounded-full border border-[color-mix(in_oklab,var(--kind-critical)_45%,transparent)] bg-[color-mix(in_oklab,var(--kind-critical)_16%,transparent)] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-[var(--kind-critical-ink)]">
              ⚠ critical risk flag
            </span>
          )}
        </div>
        <h3 className="text-[16.5px] font-semibold leading-snug text-[var(--color-ink)]">{m.title}</h3>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          {m.summary}
        </p>
        {m.sources.length > 0 && (
          <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
            {m.sources.length > 1 ? "Sources: " : "Source: "}
            {m.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ", "}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2 hover:text-[var(--color-accent)]"
                >
                  {s.label}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
