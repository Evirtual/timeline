import TimelineGrid from "@/components/TimelineGrid";
import Guide from "@/components/Guide";
import ThemeToggle from "@/components/ThemeToggle";
import { loadCategory, CATEGORY_IDS, DEFAULT_CATEGORY } from "@/lib/timeline";

export default function Home() {
  const category = loadCategory(DEFAULT_CATEGORY);

  const dates = category.events.map((e) => e.date).sort();
  const span = `${dates[0].slice(0, 4)} — ${dates[dates.length - 1].slice(0, 4)}`;

  return (
    <main className="min-h-screen">
      <header className="px-4 pb-5 pt-8 md:px-8 md:pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
              {span}
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-[var(--color-ink)] md:text-4xl">
              {category.title}
            </h1>
            <p className="mt-3 text-balance leading-relaxed text-[var(--color-ink-muted)]">
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

        {/* No legend: every organisation names itself at the head of its own
            row, so a colour key would only repeat what the grid already says. */}
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-faint)]">
          <span className="hidden md:inline">
            Every organisation is a row and time runs left to right, so a column
            is one quarter — read down it to see who was shipping at the same
            moment.
          </span>
          <span className="md:hidden">
            Pick an organisation to read its history, newest first.
          </span>
        </p>
      </header>

      <Guide />

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
