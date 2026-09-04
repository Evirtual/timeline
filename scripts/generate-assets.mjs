// One-off asset generator: renders the timeline mark through Chromium at exact
// pixel sizes, then writes the favicon, app icons and OG image to /public.
// Not part of the build — run manually:
//
//   npm run assets
//
// Same approach as the portfolio, so both sites' icons are made the same way.
import { chromium } from "@playwright/test";
import pngToIco from "png-to-ico";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });

const agi = JSON.parse(
  readFileSync(new URL("../content/agi.json", import.meta.url), "utf8"),
);

const BG = "#0a0b0c";

// The mark's ink spans 48 of the 64 viewBox.
const INK = 48 / 64;

// How much of the icon the ink should occupy, per use.
//
// Android crops a "maskable" icon to a squircle and guarantees only the centre
// 80% survives — a mark running corner to corner loses its corners. These are
// the same ratios the portfolio settled on, so the two apps sit on a home
// screen at matching visual weight.
const FAVICON_GLYPH = 0.86; // no mask, so it can breathe
const APPLE_GLYPH = 0.74; // iOS rounds the corners but does not crop hard
const MASKABLE_GLYPH = 0.64; // survives any mask shape Android applies

/**
 * The mark: four bars against a shared axis — the product's own shape, one row
 * per organisation, offset so they read as events at different moments. Colours
 * come from the four leading organisations in the dataset.
 *
 * The ink is a 48×48 square inside the 64 viewBox: the axis sets the left edge,
 * the longest bar the right, and the four rows together span exactly the same
 * height. A mark whose ink is square sits correctly in a tab, a rounded app
 * tile and a rectangular card without being re-centred for each one.
 */
function markSvg(size, { plate, glyph = INK }) {
  const scale = glyph / INK;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
      ${plate ? `<rect width="64" height="64" fill="${BG}"/>` : ""}
      <g transform="translate(32 32) scale(${scale.toFixed(4)}) translate(-32 -32)">
        <rect x="8" y="8" width="2.5" height="48" rx="1.25" fill="#6c7275"/>
        <rect x="16" y="8" width="28" height="8" rx="4" fill="#5eead4"/>
        <rect x="16" y="21.33" width="18" height="8" rx="4" fill="#d97757"/>
        <rect x="16" y="34.67" width="40" height="8" rx="4" fill="#4285f4"/>
        <rect x="16" y="48" width="14" height="8" rx="4" fill="#e0a800"/>
      </g>
    </svg>
  `.trim();
}

/**
 * `plate: true` fills the square edge to edge, for icons that get installed.
 * Android treats an icon with transparent corners as a legacy icon and drops it
 * onto a white circle, which is where the white ring around an installed app
 * comes from — so home-screen icons must be full-bleed.
 *
 * `plate: false` leaves it transparent, which is what a browser tab wants. A
 * favicon carrying its own dark plate looks like a sticker stuck on the tab
 * strip, and looks plainly wrong in a light-themed browser.
 */
async function shoot(page, size, file, { plate, glyph }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:${
      plate ? BG : "transparent"
    };}svg{display:block}</style>${markSvg(size, { plate, glyph })}`,
  );
  const buffer = await page.screenshot({ omitBackground: !plate });
  writeFileSync(path.join(publicDir, file), buffer);
  console.log(`  ${file} (${size}px, ${plate ? "plated" : "transparent"})`);
  return buffer;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

console.log("Browser icons — transparent, so they sit in any tab strip:");
const ico32 = await shoot(page, 32, "favicon-32x32.png", {
  plate: false,
  glyph: FAVICON_GLYPH,
});
await shoot(page, 16, "favicon-16x16.png", { plate: false, glyph: FAVICON_GLYPH });
writeFileSync(path.join(publicDir, "favicon.ico"), await pngToIco([ico32]));
console.log("  favicon.ico");

console.log("Installed app icons — full-bleed, so no white ring:");
await shoot(page, 180, "apple-touch-icon.png", { plate: true, glyph: APPLE_GLYPH });
await shoot(page, 192, "android-chrome-192x192.png", {
  plate: true,
  glyph: MASKABLE_GLYPH,
});
await shoot(page, 512, "android-chrome-512x512.png", {
  plate: true,
  glyph: MASKABLE_GLYPH,
});

// The in-app and portfolio logo, as a file rather than a render.
writeFileSync(
  path.join(publicDir, "mark.svg"),
  // Reflowed: the template is indented for readability inside this file, and
  // that indentation has no business ending up in the committed asset.
  markSvg(64, { plate: false })
    .replace(/\n\s*<g transform[^>]*>/, "")
    .replace(/\n\s*<\/g>/, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n  ")
    .replace("\n  </svg>", "\n</svg>")
    // Cropped to the ink. As an icon the mark needs breathing room inside its
    // plate, but as a logo on a card it has to fill its box or it reads as
    // smaller than every other logo beside it.
    .replace('viewBox="0 0 64 64"', 'viewBox="6 6 52 52"') + "\n",
);
console.log("  mark.svg");

/**
 * The chronicle's own shape: milestones per half-decade, drawn from the real
 * dataset so the card cannot drift from the page it advertises. A flat century
 * and then a curve is the entire argument of that view, which makes it a better
 * cover than the site mark — and it tells the two OG cards apart at a glance in
 * a feed, which is the job.
 *
 * The open half-decade is amber and carries the same dashed pro-rata outline
 * the page draws, for the same reason: it is short because it is unfinished.
 */
function histogramSvg(width, height) {
  const counts = new Map();
  for (const m of agi.milestones) {
    const start = Math.floor(Number(m.date.slice(0, 4)) / 5) * 5;
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const thisYear = Math.max(...agi.milestones.map((m) => Number(m.date.slice(0, 4))));
  const openStart = Math.floor(thisYear / 5) * 5;

  const bars = [];
  for (let s = 1950; s <= openStart; s += 5) bars.push({ s, count: counts.get(s) ?? 0 });

  const open = bars.find((b) => b.s === openStart);
  const yearsIn = thisYear - openStart + 1;
  const projected = (open.count / yearsIn) * 5;
  const max = Math.max(...bars.map((b) => b.count), projected);

  const gap = 4;
  const w = (width - gap * (bars.length - 1)) / bars.length;

  const rects = bars
    .map((b, i) => {
      const x = i * (w + gap);
      const h = Math.max(3, (b.count / max) * height);
      const isOpen = b.s === openStart;
      const ghostH = isOpen ? ((projected - b.count) / max) * height : 0;
      const ghost = isOpen
        ? `<rect x="${x.toFixed(1)}" y="${(height - h - ghostH).toFixed(1)}" width="${w.toFixed(
            1,
          )}" height="${ghostH.toFixed(
            1,
          )}" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.55"/>`
        : "";
      return `${ghost}<rect x="${x.toFixed(1)}" y="${(height - h).toFixed(1)}" width="${w.toFixed(
        1,
      )}" height="${h.toFixed(1)}" rx="2" fill="${
        isOpen ? "#fbbf24" : "#6c7275"
      }" ${isOpen ? "" : 'opacity="0.5"'}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}</svg>`;
}

console.log("Open Graph:");
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`
  <style>
    html,body{margin:0;height:100%;background:${BG};}
    body{display:flex;align-items:center;gap:64px;padding:0 96px;
         font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#f2f2f0;}
    h1{font-size:74px;font-weight:500;letter-spacing:-0.02em;margin:0 0 18px;}
    p{font-size:32px;line-height:1.4;color:#a7abae;margin:0;max-width:30ch;}
    .rule{height:1px;background:#1f2224;margin:26px 0;}
    .meta{font-family:ui-monospace,monospace;font-size:20px;letter-spacing:0.16em;
          text-transform:uppercase;color:#5eead4;margin:0;}
  </style>
  <div style="flex:0 0 240px">${markSvg(240, { plate: false })}</div>
  <div>
    <p class="meta">2007 — 2026</p>
    <div class="rule"></div>
    <h1>The AI race</h1>
    <p>Who shipped what, and when.</p>
  </div>
`);
writeFileSync(path.join(publicDir, "og-image.png"), await page.screenshot());
console.log("  og-image.png (1200x630)");

// The chronicle's card. Amber where the race card is teal, and the histogram
// where the race card puts the mark, so the two are never mistaken for each
// other in a feed.
await page.setContent(`
  <style>
    html,body{margin:0;height:100%;background:${BG};}
    body{display:flex;flex-direction:column;justify-content:center;padding:0 96px;
         font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#f2f2f0;}
    h1{font-size:74px;font-weight:500;letter-spacing:-0.02em;margin:0 0 18px;}
    p{font-size:32px;line-height:1.4;color:#a7abae;margin:0;max-width:34ch;}
    .rule{height:1px;background:#1f2224;margin:26px 0;}
    /* Both of these are <p>, so they inherit the 34ch measure meant for the
       standfirst — which wraps the date and bunches the axis labels. */
    .meta{font-family:ui-monospace,monospace;font-size:20px;letter-spacing:0.16em;
          text-transform:uppercase;color:#fbbf24;margin:0;max-width:none;
          white-space:nowrap;}
    .chart{margin-top:44px;}
    .axis{font-family:ui-monospace,monospace;font-size:16px;letter-spacing:0.12em;
          color:#5c6165;margin:10px 0 0;display:flex;justify-content:space-between;
          width:1008px;max-width:none;}
  </style>
  <div>
    <p class="meta">Instrument log · 1950 — ${new Date().getFullYear()}</p>
    <div class="rule"></div>
    <h1>AGI Watch</h1>
    <p>Seventy-six years of the same promise. Are we getting there?</p>
    <div class="chart">${histogramSvg(1008, 132)}</div>
    <p class="axis"><span>1950</span><span>now</span></p>
  </div>
`);
writeFileSync(path.join(publicDir, "og-agi-watch.png"), await page.screenshot());
console.log("  og-agi-watch.png (1200x630)");

await browser.close();
console.log("Done.");
