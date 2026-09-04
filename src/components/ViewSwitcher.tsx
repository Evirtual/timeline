import Link from "next/link";

/**
 * The two views are one site, and a reader who finds either should be able to
 * see the other exists. They answer different questions over overlapping
 * material: the race grid asks who was ahead and when, the chronicle asks
 * whether the field is getting there at all.
 */
const VIEWS = [
  { href: "/", id: "race", label: "The race", hint: "Who shipped what, side by side" },
  { href: "/agi-watch/", id: "agi", label: "AGI Watch", hint: "Are we getting there?" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export default function ViewSwitcher({ current }: { current: ViewId }) {
  return (
    <nav aria-label="Views" className="flex flex-wrap items-center gap-2">
      {VIEWS.map((v) => {
        const active = v.id === current;
        return (
          <Link
            key={v.id}
            href={v.href}
            // The RSC prefetch payload 404s against the dev server, which names
            // it differently from the static export. Two links do not need
            // prefetching anyway, and this removes a failed request on every
            // page view rather than betting on which naming production uses.
            prefetch={false}
            aria-current={active ? "page" : undefined}
            title={v.hint}
            className={
              active
                ? "rounded-full border border-[var(--color-accent)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)]"
                : "rounded-full border border-[var(--color-border)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink-muted)]"
            }
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
