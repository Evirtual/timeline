import { test, expect } from "@playwright/test";

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

test("renders a column per organisation and events inside them", async ({ page }) => {
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

test("detail level changes how many events are shown", async ({ page }) => {
  await page.goto("/");
  const count = async () => page.locator("[data-event]").count();

  await page.getByRole("button", { name: "Everything" }).click();
  const all = await count();

  await page.getByRole("button", { name: "Key moments" }).click();
  const key = await count();

  expect(all).toBeGreaterThan(key);
  expect(key).toBeGreaterThan(0);
});

test("the page never scrolls sideways, only the grid does", async ({ page }) => {
  await page.goto("/");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);

  const scrollable = await page.evaluate(() => {
    const region = document.querySelector(".scroll-region");
    return region ? region.scrollWidth > region.clientWidth : false;
  });
  expect(scrollable).toBe(true);
});

test("organisation labels stay put while time scrolls under them", async ({ page }) => {
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

test("every organisation is on screen at once, which is the point", async ({ page }) => {
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

test("opens scrolled to the most recent events", async ({ page }) => {
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

test("a plain vertical wheel moves through time", async ({ page }) => {
  await page.goto("/");
  const scrollLeft = () =>
    page.evaluate(() => document.querySelector(".scroll-region")!.scrollLeft);

  // From the middle: the view opens pinned to the present, where scrolling
  // forward has nowhere to go and the handler correctly defers to the page.
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

test("ctrl and wheel zooms the time axis", async ({ page }) => {
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

test("the zoom buttons work and clamp at the ends", async ({ page }) => {
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

// Mouse drag only: on touch the browser scrolls natively and the hook stays
// out of the way, which the horizontal-overflow test already covers.
test("dragging the grid pans it", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "touch uses native scrolling, not the drag handler");
  await page.goto("/");
  const scrollLeft = () =>
    page.evaluate(() => document.querySelector(".scroll-region")!.scrollLeft);

  // Pinned to the present on load, so there is no room to drag further.
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
