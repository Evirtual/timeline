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
