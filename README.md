# timeline

A comparative timeline. Organisations run as rows against a shared time axis
running left to right, so a column is one quarter — read down it to see who
was shipping at the same moment.

Two views over the same subject:

- **The race** (`/`) — the comparative grid. Who was ahead, when, and how fast
  did the others respond?
- **AGI Watch** (`/agi-watch/`) — the chronicle. Is the field actually getting
  there, and should you believe the people saying it has?

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

## The second view, and why it is not a second category

AGI Watch lives in `content/agi.json` with its own schema
(`src/lib/chronicle-schema.ts`). That separation is deliberate — it is a
different question asked over overlapping material, and three things make it a
different contract rather than another dataset for the grid:

- **No entity.** Turing's paper, the Dartmouth proposal, both AI winters and
  the leaked capability ladder belong to no organisation. Nine of its twenty
  milestones have no owner in the race view's roster, and adding rows for IBM,
  MIT, DEC and "the field" would each hold one or two events across
  seventy-six years — that does not extend the comparative grid, it wrecks it.
- **Variable-precision dates.** The race view is day-precise because it groups
  by quarter and has to be. `"1974"` and `"2026-02"` are the honest answers for
  a multi-year winter and a remark placeable only to a month.
- **`kind` is an epistemic axis.** `claim` — somebody asserting a threshold was
  crossed — is orthogonal to model/product/research/funding, not another value
  in the same list. Keeping "we have reached AGI" visually distinct from "this
  thing was built" is the whole editorial position of that view.

**What belongs there.** The test is: *does this change the answer to "are we
getting there?"* A capability threshold that was supposed to be decades off, a
claim that one was crossed, a winter that broke a schedule. Not "a lab shipped
a better version of the thing that already existed" — that is the race view's
job, and it does it properly. Twenty entries across seventy-six years is the
right order of magnitude; `npm test` trips a failure past thirty, because
drift shows up as growth.

## The data is the product

The code is the easy half. What makes this worth reading is that the dates are
right and the claims are sourced, so:

- **Every event requires a `source` URL.** The schema rejects one without it.
  The chronicle allows an empty `sources` array only for milestones listed in
  `SOURCELESS_OK` in `tests/chronicle.test.ts`, each with its reason — one
  entry qualifies, the second AI winter, a multi-year market collapse with no
  citable event. An exception on the record beats a silent omission.
- **A contested figure carries both sources.** The bar-exam milestone cites
  OpenAI's claim and the re-analysis that revised it. Where a number needed
  context, the context ships with it.
- **Dates are day-precise in the race view** even though it groups by quarter,
  so the data survives a change of granularity. The chronicle is
  variable-precision on purpose; see above.
- `npm test` validates both datasets: dangling entity references, duplicate
  ids, events dated in the future, model facts on non-model events, and for
  the chronicle — sort order, era contiguity, exactly one `now` and it being
  the newest, and no HTML entities left over from the standalone version that
  rendered through `innerHTML`.
- `npm run check:sources` fetches every source across both datasets. It sorts
  results into verified, **behind a bot wall** and broken, and only the last
  fails the run — ACM, Oxford Academic, Bloomberg and Axios return 403 to any
  script, which says nothing about whether the page exists. Reporting those as
  failures would just train everyone to ignore the output.

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
