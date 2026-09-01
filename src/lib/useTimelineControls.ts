"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const ZOOM_MIN = 56;
export const ZOOM_MAX = 340;
export const ZOOM_DEFAULT = 150;

/** Column width in px for one quarter. Everything else derives from it. */
export type Zoom = number;

/**
 * Pan and zoom for the timeline, the way a video or audio editor does it.
 *
 * Touch panning already works — `overflow-x` gives native momentum swipe. What
 * is missing is everything a desktop mouse needs, because a wheel does nothing
 * to a horizontal container and the only way across is dragging the scrollbar.
 * That is a miserable way to read a timeline, so:
 *
 *   - wheel, including a plain vertical one, pans time
 *   - ctrl/⌘ + wheel zooms the time axis — which is also what a browser sends
 *     for a trackpad pinch, so two-finger zoom comes for free
 *   - click and drag pans, like a map
 *   - arrow keys, Home and End when the region has focus
 *
 * Zoom is anchored at the pointer: the quarter under the cursor stays under the
 * cursor. Zooming to the centre instead is the difference between a control
 * that feels like an editor and one that feels like a slider.
 *
 * The wheel handler hands scrolling back to the page at either end, so reaching
 * the last quarter does not trap you in the grid.
 */
export function useTimelineControls(
  ref: RefObject<HTMLElement | null>,
  labelWidth: () => number,
) {
  const [zoom, setZoom] = useState<Zoom>(ZOOM_DEFAULT);
  // Read inside listeners without re-binding them on every zoom change. Synced
  // in an effect rather than during render: handlers only fire after commit, so
  // they always see the value the user is currently looking at.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  /** Scale about a point, keeping the content under it stationary. */
  const zoomAt = useCallback(
    (factor: number, clientX?: number) => {
      const el = ref.current;
      const from = zoomRef.current;
      const to = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, from * factor));
      if (to === from) return;

      if (el) {
        const rect = el.getBoundingClientRect();
        const label = labelWidth();
        // Where the pointer sits, in content coordinates.
        const pointer = clientX ?? rect.left + rect.width / 2;
        const offset = pointer - rect.left;
        const contentX = el.scrollLeft + offset;
        // The label column is fixed; only the quarters either side of it scale.
        const inQuarters = Math.max(0, contentX - label);
        const scaled = label + inQuarters * (to / from);
        // Applied after the DOM takes the new width.
        requestAnimationFrame(() => {
          el.scrollLeft = scaled - offset;
        });
      }
      setZoom(to);
    },
    [ref, labelWidth],
  );

  const resetZoom = useCallback(() => zoomAt(ZOOM_DEFAULT / zoomRef.current), [zoomAt]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canPan = () => el.scrollWidth > el.clientWidth + 1;
    const atStart = () => el.scrollLeft <= 0;
    const atEnd = () => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

    function onWheel(e: WheelEvent) {
      // ctrl/⌘ + wheel is zoom, and is what a trackpad pinch sends.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Small steps: a pinch fires many events, and a coarse factor overshoots.
        zoomAt(Math.exp(-e.deltaY * 0.002), e.clientX);
        return;
      }
      if (!canPan()) return;
      // A trackpad's horizontal gesture already scrolls this axis natively;
      // only translate when the dominant movement is vertical.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const forward = e.deltaY > 0;
      if ((forward && atEnd()) || (!forward && atStart())) return;

      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;

    function onPointerDown(e: PointerEvent) {
      // Touch is left to the browser. Native momentum scrolling is better than
      // anything reimplemented here, and driving scrollLeft by hand during a
      // touch drag fights it — the finger and the content disagree.
      if (e.pointerType === "touch") return;
      if (e.button !== 0 || !canPan()) return;
      // Drags start anywhere, including on an event card. Refusing to start on
      // controls would mean almost nowhere is draggable, since the grid is
      // mostly cards; instead the click is suppressed below if the pointer
      // actually travelled, which is how a map behaves.
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startScroll = el!.scrollLeft;
      el!.style.cursor = "grabbing";
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 3) {
        el!.style.userSelect = "none";
        if (!el!.hasPointerCapture(e.pointerId)) el!.setPointerCapture(e.pointerId);
      }
      el!.scrollLeft = startScroll - dx;
    }

    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      el!.style.cursor = "";
      el!.style.userSelect = "";
      if (el!.hasPointerCapture(e.pointerId)) el!.releasePointerCapture(e.pointerId);
    }

    // A drag that ends on a card would otherwise open that card's dialog.
    function onClickCapture(e: MouseEvent) {
      if (moved > 3) {
        e.stopPropagation();
        e.preventDefault();
      }
      moved = 0;
    }

    function onKeyDown(e: KeyboardEvent) {
      const page = el!.clientWidth * 0.8;
      if (e.key === "ArrowRight") el!.scrollBy({ left: e.shiftKey ? page : 160, behavior: "smooth" });
      else if (e.key === "ArrowLeft") el!.scrollBy({ left: e.shiftKey ? -page : -160, behavior: "smooth" });
      else if (e.key === "Home") el!.scrollTo({ left: 0, behavior: "smooth" });
      else if (e.key === "End") el!.scrollTo({ left: el!.scrollWidth, behavior: "smooth" });
      else if (e.key === "+" || e.key === "=") zoomAt(1.25);
      else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.25);
      else if (e.key === "0") resetZoom();
      else return;
      e.preventDefault();
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, zoomAt, resetZoom]);

  return { zoom, zoomAt, resetZoom };
}
