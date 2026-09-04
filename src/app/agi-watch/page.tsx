import type { Metadata } from "next";
import Chronicle from "@/components/Chronicle";
import ThemeToggle from "@/components/ThemeToggle";
import ViewSwitcher from "@/components/ViewSwitcher";
import { loadChronicle } from "@/lib/chronicle";

const description =
  "Seventy-six years of a field promising the same destination — the capability thresholds, the setbacks that broke the last two schedules, and the claims that we have arrived.";

export const metadata: Metadata = {
  title: "AGI Watch — are we getting there?",
  description,
  alternates: { canonical: "/agi-watch/" },
  openGraph: {
    type: "website",
    url: "https://timeline.edgarasneverdauskas.com/agi-watch/",
    siteName: "Timeline",
    title: "AGI Watch — are we getting there?",
    description,
  },
  twitter: { card: "summary_large_image", title: "AGI Watch — are we getting there?", description },
};

export default function AgiWatchPage() {
  const data = loadChronicle();
  const span = `${data.milestones[0].date.slice(0, 4)} – present`;

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-2 pt-8 md:px-8 md:pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--kind-claim)]">
              Instrument log · {span}
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-[var(--color-ink)] md:text-4xl">
              {data.title}
            </h1>
            <p className="mt-3 text-balance leading-relaxed text-[var(--color-ink-muted)]">
              Seventy-six years of a field promising the same destination. This
              is not a release log — it carries only the moments that changed
              the answer to <em>are we getting there</em>: the capability
              thresholds, the setbacks that broke the last two schedules, and,
              increasingly, the claims that we have arrived.{" "}
              {data.milestones.length} entries in seventy-six years, so the ones
              that are here have to earn it.
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-6">
          <ViewSwitcher current="agi" />
        </div>
      </header>

      <Chronicle data={data} />

      <footer className="mt-10 border-t border-[var(--color-border)] px-4 py-8 md:px-8">
        <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--color-ink-faint)]">
          A curated, opinionated set of milestones — not an exhaustive history.
          &ldquo;AGI&rdquo; itself is contested; every entry marked as a claim is
          a claim, not a confirmed event. Built by{" "}
          <a
            href="https://edgarasneverdauskas.com"
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
          >
            Edgaras Neverdauskas
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
