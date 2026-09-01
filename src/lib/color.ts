/**
 * A brand colour at low opacity, for tinting a row so it reads as one band
 * rather than another stripe in a grid of eight.
 */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The same tint, but opaque.
 *
 * The pinned organisation column cannot be translucent — event cards scroll
 * underneath it and would show through — so its tint goes on as a gradient
 * layer above an opaque background rather than as a see-through fill.
 */
export function opaqueTint(hex: string, alpha: number) {
  const layer = tint(hex, alpha);
  return {
    backgroundColor: "var(--color-bg)",
    backgroundImage: `linear-gradient(${layer}, ${layer})`,
  } as const;
}
