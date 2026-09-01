"use client";

import { useEffect, useRef } from "react";
import type { TimelineEntity, TimelineEvent } from "@/lib/schema";

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  model: "Model",
  product: "Product",
  research: "Research",
  funding: "Funding",
  org: "Org",
  policy: "Policy",
};

function factRow(label: string, value: string) {
  return (
    <div key={label} className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
        {label}
      </span>
      <span className="text-right text-[13px] text-[var(--color-ink-muted)]">{value}</span>
    </div>
  );
}

export default function EventDialog({
  event,
  entity,
  onClose,
}: {
  event: TimelineEvent | null;
  entity: TimelineEntity | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and the close button takes focus on open so keyboard users
  // are not dropped back at the top of a very long grid.
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [event, onClose]);

  if (!event || !entity) return null;

  const facts: Array<[string, string]> = [];
  if (event.model?.context) {
    facts.push(["Context", `${event.model.context.toLocaleString("en-GB")} tokens`]);
  }
  if (event.model?.modality?.length) {
    facts.push(["Modality", event.model.modality.join(", ")]);
  }
  if (event.model?.openWeights !== undefined) {
    facts.push(["Weights", event.model.openWeights ? "Open" : "Closed"]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-6 sm:rounded-2xl"
        style={{ borderTop: `3px solid ${entity.color}` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: entity.color }} />
              <span className="text-[var(--color-ink-muted)]">{entity.name}</span>
            </p>
            <h2
              id="event-title"
              className="mt-2 text-xl font-medium leading-snug text-[var(--color-ink)]"
            >
              {event.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--color-ink-faint)]">
          <span>
            {new Date(event.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span aria-hidden="true">·</span>
          <span>{KIND_LABEL[event.kind]}</span>
          {event.weight === 3 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--color-accent)]">Key moment</span>
            </>
          )}
        </p>

        <p className="mt-4 leading-relaxed text-[var(--color-ink-muted)]">{event.summary}</p>

        {facts.length > 0 && (
          <div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {facts.map(([label, value]) => factRow(label, value))}
          </div>
        )}

        <a
          href={event.source}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
        >
          Source
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3.5 8.5L8.5 3.5M8.5 3.5H4.5M8.5 3.5V7.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
