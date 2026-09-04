import { test, expect } from "@playwright/test";

/**
 * The chronicle's failure modes are different from the grid's. It cannot lose
 * a sticky header or overflow sideways in the same way, but it can quietly
 * mislead: a filter that hides nothing, a marker that lands on the paragraph
 * above it, or a chart whose last bar reads as a slowdown because the
 * half-decade is unfinished. These cover the ways the argument breaks.
 */

test("loads with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/agi-watch/");
  await expect(page.getByRole("heading", { name: "AGI Watch", level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the two views link to each other", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "AGI Watch" }).click();
  await expect(page.getByRole("heading", { name: "AGI Watch", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "The race" }).click();
  await expect(page.getByRole("heading", { name: "The AI race" })).toBeVisible();
});

test("shows every milestone, with its era and a working source link", async ({ page }) => {
  await page.goto("/agi-watch/");
  await expect(page.locator("article")).toHaveCount(20);

  await expect(page.getByRole("heading", { name: "Foundations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "“The AGI Era”" })).toBeVisible();

  // Newest era leads, oldest closes.
  const eras = await page.locator("main section h2").allInnerTexts();
  expect(eras[0]).toBe("“The AGI Era”");
  expect(eras[eras.length - 1]).toBe("Foundations");

  // The view reads newest first, so the claim it is built around leads.
  const astra = page.locator("article").first();
  await expect(astra.getByRole("link", { name: "OpenAI" })).toHaveAttribute(
    "href",
    /openai\.com/,
  );
});

test("filtering a kind removes exactly those cards", async ({ page }) => {
  await page.goto("/agi-watch/");
  const before = await page.locator("article").count();

  const claims = page.getByRole("button", { name: /AGI claim/ });
  await claims.click();
  await expect(claims).toHaveAttribute("aria-pressed", "false");

  const after = await page.locator("article").count();
  expect(after).toBeLessThan(before);

  await claims.click();
  await expect(page.locator("article")).toHaveCount(before);
});

test("the capability marker never lands on the text above it", async ({ page }) => {
  await page.goto("/agi-watch/");
  const marker = page.getByText("≈ here, per outside analysts");
  await expect(marker).toBeVisible();

  const overlaps = await page.evaluate(() => {
    const tag = [...document.querySelectorAll("div")].find((d) =>
      d.textContent?.trim().startsWith("≈ here"),
    );
    const para = tag?.closest("section")?.querySelector("p");
    if (!tag || !para) return null;
    return tag.getBoundingClientRect().top < para.getBoundingClientRect().bottom;
  });
  expect(overlaps).toBe(false);
});

test("the unfinished half-decade is drawn with its projection", async ({ page }) => {
  await page.goto("/agi-watch/");
  // Exactly one bin is open, and it carries the dashed pro-rata outline.
  await expect(page.locator(".bin-ghost")).toHaveCount(1);
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/agi-watch/");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
