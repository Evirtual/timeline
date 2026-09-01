# timeline

A comparative timeline. Organisations run as columns against a shared time
axis, so you can read across a row and see who shipped what in the same quarter.

Live at **[timeline.edgarasneverdauskas.com](https://timeline.edgarasneverdauskas.com)**.

The first dataset is the AI race — the frontier labs and the infrastructure
underneath them, from the founding of OpenAI to the current generation of
models.

## Why it works this way

A chronology of one company is a Wikipedia article. The question this answers
is the comparative one: **who was ahead, when, and how fast did the others
respond?** When GPT-4 shipped, what did Anthropic have in market? Who reached
multimodal first? That is why the organisations sit side by side rather than
one after another, and every design decision serves it.

Three consequences:

- **Quarters, not years.** Year rows collapse the 2023–2025 stretch into an
  unreadable pile. Quarters give the dense period room and let the sparse early
  years compress.
- **Weight, not everything.** Each event is rated 1–3. The default view shows
  the significant ones; the density control reveals or hides the rest. Without
  it the recent years are a wall.
- **Gaps are folded.** Runs of quarters where nothing happened anywhere collapse
  to a single marker that states how long the gap was. The compression stays
  visible rather than quietly lying about the pace.

## Adding a category

Each category is a JSON file under `content/`, registered in
`src/lib/timeline.ts`. They share a minimal contract — entities, and events with
a date, kind, weight, summary and source — and may extend it with whatever they
need. The AI dataset extends events with model facts (context window, modality,
open weights); another category can carry something else entirely.

The category switcher renders only when there is more than one category. A tab
strip with a single tab reads as unfinished, so until a second dataset exists
the site simply is the AI timeline.

## The data is the product

The code is the easy half. What makes this worth reading is that the dates are
right and the claims are sourced, so:

- **Every event requires a `source` URL.** The schema rejects one without it.
- **Dates are day-precise** even though the view groups by quarter, so the data
  survives a change of granularity.
- `npm test` validates the dataset: dangling entity references, duplicate ids,
  events dated in the future, model facts on non-model events.
- `npm run check:sources` fetches every source and fails on a dead link.

## Commands

```bash
npm run dev            # development server
npm run build          # static export to out/
npm run verify         # lint, typecheck, unit tests, build
npm run test           # dataset and logic tests
npm run test:e2e       # Playwright, against the built output
npm run check:sources  # fetch every source URL and report failures
```

## Stack

Next.js static export, React, TypeScript, Tailwind, zod for the content schema,
Vitest and Playwright. Deployed to GitHub Pages on push to `main`. Type is Geist
and the palette is shared with
[edgarasneverdauskas.com](https://edgarasneverdauskas.com), so the two read as
one family.
