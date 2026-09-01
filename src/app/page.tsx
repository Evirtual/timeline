import TimelineGrid from "@/components/TimelineGrid";
import ThemeToggle from "@/components/ThemeToggle";
import Legend from "@/components/Legend";
import { loadCategory, CATEGORY_IDS, DEFAULT_CATEGORY } from "@/lib/timeline";

export default function Home() {
  const category = loadCategory(DEFAULT_CATEGORY);

  const dates = category.events.map((e) => e.date).sort();
  const span = `${dates[0].slice(0, 4)} — ${dates[dates.length - 1].slice(0, 4)}`;

  return (
    <main className="min-h-screen">
      <header className="px-4 pb-8 pt-10 md:px-8 md:pt-14">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
              {span}
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
              {category.title}
            </h1>
            <p className="mt-4 text-balance leading-relaxed text-[var(--color-ink-muted)] md:text-lg">
              {category.description}
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <ThemeToggle />
          </div>
        </div>

        {/* Only when there is somewhere to switch to. One tab is not a tab. */}
        {CATEGORY_IDS.length > 1 && (
          <nav aria-label="Timelines" className="mt-6">
            {/* Category switcher renders here once a second dataset exists. */}
          </nav>
        )}

        <div className="mt-8">
          <Legend entities={category.entities} />
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-faint)]">
          Read across a row to see what happened in the same quarter. Every entry
          links to a primary source — select one for the detail.
        </p>
      </header>

      <TimelineGrid category={category} />

      <footer className="border-t border-[var(--color-border)] px-4 py-8 md:px-8">
        <p className="text-sm text-[var(--color-ink-faint)]">
          Built by{" "}
          <a
            href="https://edgarasneverdauskas.com"
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
          >
            Edgaras Neverdauskas
          </a>
          . Dates are taken from primary announcements where one exists.
        </p>
      </footer>
    </main>
  );
}
