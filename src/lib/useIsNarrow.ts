"use client";

import { useSyncExternalStore } from "react";

/** Matches Tailwind's `md`. Below this the race grid stops being readable. */
const QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * True on a phone-sized viewport.
 *
 * Subscribed rather than measured in an effect, so there is no render where the
 * component has already decided wrongly. The server snapshot is `false`: the
 * static export is prerendered once, and the desktop grid is the honest default
 * for a page whose whole subject is comparison.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
