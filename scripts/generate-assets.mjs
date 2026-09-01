// One-off asset generator: renders the timeline mark via Playwright/Chromium at
// exact pixel sizes, then writes the favicon, app icons and OG image to
// /public. Not part of the build — run manually:
//
//   npm run assets
//
// Same approach as the portfolio, so the two sites' icons are made the same way
// and land on a phone home screen looking like siblings.
import { chromium } from "@playwright/test";
import pngToIco from "png-to-ico";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });

const BG = "#0a0b0c";

/**
 * The mark: four bars against a shared axis — the product's own shape, one row
 * per organisation, offset so they read as events at different moments. Colours
 * are taken from the four leading organisations in the dataset.
 */
function markSvg(size) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="${BG}"/>
      <line x1="17" y1="11" x2="17" y2="53" stroke="#3a4045" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="23" y="14" width="24" height="7" rx="3.5" fill="#5eead4"/>
      <rect x="23" y="25" width="15" height="7" rx="3.5" fill="#d97757"/>
      <rect x="23" y="36" width="31" height="7" rx="3.5" fill="#4285f4"/>
      <rect x="23" y="47" width="11" height="7" rx="3.5" fill="#e0a800"/>
    </svg>
  `.trim();
}

/**
 * Icons are full-bleed on purpose: the background reaches every edge, with no
 * rounding and no transparency. Android treats an icon with transparent corners
 * as a legacy icon and drops it onto a white circle, which is what produces the
 * white ring around an installed app.
 */
async function shoot(page, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:${BG};}svg{display:block}</style>${markSvg(size)}`,
  );
  const buffer = await page.screenshot({ omitBackground: false });
  writeFileSync(path.join(publicDir, file), buffer);
  console.log(`  ${file} (${size}x${size})`);
  return buffer;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

console.log("Icons:");
const ico32 = await shoot(page, 32, "favicon-32x32.png");
await shoot(page, 16, "favicon-16x16.png");
await shoot(page, 180, "apple-touch-icon.png");
await shoot(page, 192, "android-chrome-192x192.png");
await shoot(page, 512, "android-chrome-512x512.png");

writeFileSync(path.join(publicDir, "favicon.ico"), await pngToIco([ico32]));
console.log("  favicon.ico");

// Open Graph card: the mark beside the title, on the site's own background.
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
  <div style="flex:0 0 260px">${markSvg(260)}</div>
  <div>
    <p class="meta">2007 — 2026</p>
    <div class="rule"></div>
    <h1>The AI race</h1>
    <p>Who shipped what, and when.</p>
  </div>
`);
writeFileSync(path.join(publicDir, "og-image.png"), await page.screenshot());
console.log("  og-image.png (1200x630)");

await browser.close();
console.log("Done.");
