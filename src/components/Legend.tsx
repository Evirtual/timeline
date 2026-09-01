import type { TimelineEntity } from "@/lib/schema";

/** The organisations, with the colour that identifies their column. */
export default function Legend({ entities }: { entities: TimelineEntity[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {entities.map((entity) => (
        <li key={entity.id} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: entity.color }}
          />
          <span className="text-sm text-[var(--color-ink-muted)]">{entity.name}</span>
        </li>
      ))}
    </ul>
  );
}
