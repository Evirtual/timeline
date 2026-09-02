import { test, expect, type Page } from "@playwright/test";

/**
 * The grid scrolls itself to the present one frame after mount. Any test that
 * positions the scroll must let that settle first, or it sets a value the
 * component immediately overwrites — which is exactly what made the drag test
 * flake in CI and pass locally.
 */
async function settled(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const region = document.querySelector(".scroll-region");
        if (!region) return false;
        return region.scrollLeft + region.clientWidth >= region.scrollWidth - 4;
      }),
    )
    .toBe(true);
}

// The grid is the product, so these cover the ways it could break silently:
// losing its sticky headers, overflowing the page sideways on a phone, or
// dropping the source link that makes an entry trustworthy.

test("loads with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The AI race" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("renders a column per organisation and events inside them", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  for (const name of ["OpenAI", "Anthropic", "Google DeepMind", "Nvidia"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  // A well-known event is present at the default detail level.
  await expect(page.locator("[data-event=\"openai-chatgpt\"]")).toHaveCount(1);
});

test("opens an event, shows its source, and closes on Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /GPT-4o/ }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "GPT-4o" })).toBeVisible();

  const source = dialog.getByRole("link", { name: /Source/ });
  await expect(source).toHaveAttribute("href", /^https?:\/\//);
  await expect(source).toHaveAttribute("target", "_blank");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("detail level changes how many events are shown", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const count = async () => page.locator("[data-event]").count();

  await page.getByRole("button", { name: "Everything" }).click();
  const all = await count();

  await page.getByRole("button", { name: "Key moments" }).click();
  const key = await count();

  expect(all).toBeGreaterThan(key);
  expect(key).toBeGreaterThan(0);
});

test("the page never scrolls sideways, only the grid does", async ({ page, isMobile }) => {
  await page.goto("/");
  if (!isMobile) await settled(page);
  // Two pixels of slack: sub-pixel layout at a device pixel ratio above 1 can
  // report a scrollWidth a fraction wider without anything actually spilling.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(overflows).toBe(false);

  // Something on the page must be the thing that scrolls sideways — the grid on
  // desktop, the organisation picker on a phone — but never the page itself.
  const scrollable = await page.evaluate(() =>
    [...document.querySelectorAll(".scroll-region")].some(
      (region) => region.scrollWidth > region.clientWidth,
    ),
  );
  expect(scrollable).toBe(true);
});

test("organisation labels stay put while time scrolls under them", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const label = page.getByText("OpenAI", { exact: true }).last();
  const before = await label.boundingBox();

  await page.evaluate(() => {
    const region = document.querySelector(".scroll-region");
    if (region) region.scrollLeft = 0;
  });
  await page.evaluate(() => {
    const region = document.querySelector(".scroll-region");
    if (region) region.scrollLeft = 900;
  });

  const after = await label.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  // Sticky: the label column holds its x while the quarters move beneath it.
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(4);
});

test("every organisation is on screen at once, which is the point", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const viewport = page.viewportSize();
  const names = ["OpenAI", "Anthropic", "Google DeepMind", "Meta AI", "Mistral AI", "xAI", "Nvidia", "Hugging Face"];
  for (const name of names) {
    const box = await page.getByText(name, { exact: true }).last().boundingBox();
    expect(box, `${name} has no box`).not.toBeNull();
    // Within the horizontal viewport without scrolling sideways.
    expect(box!.x).toBeLessThan(viewport!.width);
  }
});

test("opens scrolled to the most recent events", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  // Polled: the grid settles a frame after mount, so a single read can race it.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const region = document.querySelector(".scroll-region");
        if (!region) return false;
        return region.scrollLeft + region.clientWidth >= region.scrollWidth - 4;
      }),
    )
    .toBe(true);
});

test("theme toggle switches and persists across reload", async ({ page }) => {
  await page.goto("/");
  const before = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
  const after = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(after).not.toBe(before);

  await page.reload();
  const persisted = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(persisted).toBe(after);
});

// The point of these: a horizontal region that only responds to its scrollbar
// is unusable with a mouse, and that is easy to regress without noticing.

test("a plain vertical wheel moves through time", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const scrollLeft = () =>
    page.evaluate(() => document.querySelector(".scroll-region")!.scrollLeft);

  // From the middle: the view opens pinned to the present, where scrolling
  // forward has nowhere to go and the handler correctly defers to the page.
  await settled(page);
  await page.evaluate(() => {
    const region = document.querySelector(".scroll-region")!;
    region.scrollLeft = region.scrollWidth / 2;
  });
  const before = await scrollLeft();

  // The region is taller than the viewport, so its centre can sit below the
  // fold — a wheel dispatched there lands on nothing.
  const box = await page.locator(".scroll-region").boundingBox();
  const viewport = page.viewportSize()!;
  const y = Math.min(box!.y + box!.height / 2, viewport.height - 80);
  await page.mouse.move(box!.x + box!.width / 2, y);
  await page.mouse.wheel(0, 400);
  await expect.poll(scrollLeft).toBeGreaterThan(before);
});

test("ctrl and wheel zooms the time axis", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const columnWidth = () =>
    page.evaluate(
      () =>
        document.querySelector<HTMLElement>("[data-event]")!.parentElement!
          .getBoundingClientRect().width,
    );

  const before = await columnWidth();
  await page.locator(".scroll-region").hover();
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -300);
  await page.keyboard.up("Control");

  await expect.poll(columnWidth).toBeGreaterThan(before);
});

test("the zoom buttons work and clamp at the ends", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");
  const columnWidth = () =>
    page.evaluate(
      () =>
        document.querySelector<HTMLElement>("[data-event]")!.parentElement!
          .getBoundingClientRect().width,
    );

  const start = await columnWidth();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(columnWidth).toBeGreaterThan(start);

  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect.poll(columnWidth).toBe(start);

  // Held down to the floor, the control disables rather than going negative.
  for (let i = 0; i < 12; i++) {
    const button = page.getByRole("button", { name: "Zoom out" });
    if (await button.isDisabled()) break;
    await button.click();
  }
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  expect(await columnWidth()).toBeGreaterThan(0);
});

test("zooming right out shrinks the event titles rather than hiding them", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "the race grid is desktop only; mobile gets the single-organisation view");
  await page.goto("/");

  const title = page.locator("[data-event] span span").first();
  const size = () =>
    title.evaluate((el) => ({
      font: parseFloat(getComputedStyle(el).fontSize),
      box: el.getBoundingClientRect().height,
      text: (el.textContent ?? "").trim(),
    }));

  const wide = await size();
  expect(wide.font).toBe(12);

  // All the way to the floor.
  for (let i = 0; i < 12; i++) {
    const button = page.getByRole("button", { name: "Zoom out" });
    if (await button.isDisabled()) break;
    await button.click();
  }

  const narrow = await size();
  // The regression this guards: the title used to be swapped for a
  // screen-reader-only span below a zoom threshold, leaving rows of blank
  // boxes. Small is the intent; absent is the bug, so the assertions are that
  // it shrank AND that it is still laid out with its text intact.
  expect(narrow.font).toBeLessThan(wide.font);
  expect(narrow.font).toBeGreaterThan(0);
  expect(narrow.box).toBeGreaterThan(0);
  expect(narrow.text).toBe(wide.text);
  await expect(title).toBeVisible();
});

// Mouse drag only: on touch the browser scrolls natively and the hook stays
// out of the way, which the horizontal-overflow test already covers.
test("dragging the grid pans it", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "touch uses native scrolling, not the drag handler");
  await page.goto("/");
  const scrollLeft = () =>
    page.evaluate(() => document.querySelector(".scroll-region")!.scrollLeft);

  // Pinned to the present on load, so there is no room to drag further.
  await settled(page);
  await page.evaluate(() => {
    document.querySelector(".scroll-region")!.scrollLeft = 0;
  });
  const before = await scrollLeft();

  const box = await page.locator(".scroll-region").boundingBox();
  const y = box!.y + box!.height / 2;
  await page.mouse.move(box!.x + box!.width - 60, y);
  await page.mouse.down();
  await page.mouse.move(box!.x + 60, y, { steps: 10 });
  await page.mouse.up();

  await expect.poll(scrollLeft).toBeGreaterThan(before);
});

// Below md the race grid is replaced by one organisation at a time, because
// eight columns of quarters on a 360px screen make the comparison it exists
// for impossible. These cover that view on its own terms.

test.describe("the phone view", () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, "desktop shows the race grid instead");
  });

  test("offers every organisation and starts on the first", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab")).toHaveCount(8);
    await expect(page.getByRole("tab", { name: /OpenAI/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("switching organisation changes the events shown", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-event="openai-chatgpt"]')).toHaveCount(1);

    await page.getByRole("tab", { name: /Anthropic/ }).click();
    await expect(page.locator('[data-event="openai-chatgpt"]')).toHaveCount(0);
    await expect(page.locator('[data-event="anthropic-claude3"]')).toHaveCount(1);
  });

  test("lists newest first", async ({ page }) => {
    await page.goto("/");
    const ids = await page.locator("[data-event]").evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).dataset.event),
    );
    // GPT-5 (2025) must come before ChatGPT (2022).
    expect(ids.indexOf("openai-gpt5")).toBeLessThan(ids.indexOf("openai-chatgpt"));
  });

  test("shows the summary inline rather than hiding it behind a tap", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/reached a hundred million users/)).toBeVisible();
  });
});
