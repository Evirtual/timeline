type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

/**
 * Two washes of a brand colour, one per theme.
 *
 * The same rgba over both backgrounds does not work. On near-black, a mid-tone
 * brand colour at low opacity turns to mud — the eye reads it as dirt on the
 * background rather than as the colour. So the dark wash takes the hue, pushes
 * it bright and saturated, then applies a very low alpha: a neon trace instead
 * of a stain. The light wash does the opposite, dropping saturation for a
 * pastel that does not fight the text sitting on it.
 *
 * Returned as CSS custom properties so the stylesheet picks per theme, which an
 * inline style cannot do.
 */
export function brandTints(hex: string, strength: "row" | "label") {
  const { h, s } = hexToHsl(hex);

  // A saturation floor matters more than the ceiling. Several of these brands
  // are inherently dull — a grey, an olive, a mustard — and at low alpha over
  // near-black a dull hue does not read as subtle, it reads as sludge. Lifting
  // saturation to a minimum keeps every row looking like a colour.
  const neon = (alpha: number) =>
    `hsl(${h.toFixed(0)} ${Math.max(68, Math.min(95, s + 25)).toFixed(0)}% 72% / ${alpha})`;
  const pastel = (alpha: number) =>
    `hsl(${h.toFixed(0)} ${Math.max(52, Math.min(82, s - 8)).toFixed(0)}% 62% / ${alpha})`;

  // Kept deliberately faint. The band only has to be enough to follow a row
  // across the screen; any stronger and it competes with the cards sitting on
  // it, which are the thing you are actually meant to read.
  // The label sits only a little above the row rather than at double it. A
  // strong two-tone row draws the eye to the left edge, when the thing worth
  // looking at is the events out to the right.
  return strength === "row"
    ? { dark: neon(0.028), light: pastel(0.05) }
    : { dark: neon(0.042), light: pastel(0.085) };
}

/** The custom properties a row sets for itself and its pinned label cell. */
export function tintVars(hex: string): React.CSSProperties {
  const row = brandTints(hex, "row");
  const label = brandTints(hex, "label");
  return {
    "--tint-row-dark": row.dark,
    "--tint-row-light": row.light,
    "--tint-label-dark": label.dark,
    "--tint-label-light": label.light,
  } as React.CSSProperties;
}

/** A single wash, for places that are not theme-swapped by the stylesheet. */
export function tint(hex: string, alpha: number): string {
  const { h, s } = hexToHsl(hex);
  return `hsl(${h.toFixed(0)} ${Math.min(95, s + 15).toFixed(0)}% 62% / ${alpha})`;
}
