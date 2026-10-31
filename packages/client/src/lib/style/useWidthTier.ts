/**
 * `useWidthTier()` — how much room the window gives, in the units the
 * layout thinks in (client-surface D9).
 *
 * ⭐ **The one reader of the window's width.** Everything is rem: the
 * tier thresholds, the unit column, the terminal measure — so browser
 * zoom changes the answer exactly as a smaller window would, which is
 * the point (Windows laptops ship at 125–150%).
 *
 * `units` is how many card-area columns fit beside the terminal column,
 * with the panel open and with it shut; the stage collapses the panel
 * first, because the panel costs two-thirds of a unit.
 *
 * ⚠ It subscribes to resize — dragging a window narrow is the cheapest
 * way anyone tests a layout, and a one-shot read would go stale.
 */

import { useEffect, useState } from "react";
import { tokens } from "../../components/ui/tokens";

export type WidthTier = "phone" | "narrow" | "feed" | "workspace" | "wide";

export interface WidthReading {
  tier: WidthTier;
  /** The window's width in rem. */
  remWidth: number;
  /** Card-area columns beside the terminal, panel open / panel shut. */
  units: { withPanel: number; withoutPanel: number };
}

/** The tier a rem width falls in. */
export function tierOf(remWidth: number): WidthTier {
  const t = tokens.tier;
  if (remWidth < t.phone) return "phone";
  if (remWidth < t.narrow) return "narrow";
  if (remWidth < t.feed) return "feed";
  if (remWidth < t.workspace) return "workspace";
  return "wide";
}

/**
 * How many unit columns fit: what is left after the rail, the panel (if
 * open) and the terminal column, over a unit plus its gap.
 */
export function unitsFor(remWidth: number, panelOpen: boolean): number {
  const w = tokens.width;
  const left = remWidth - w.rail - (panelOpen ? w.panel : 0) - w.measure;
  return Math.max(0, Math.floor(left / (w.unit.min + w.gap)));
}

/** Read the window now. */
export function readWidth(): WidthReading {
  if (typeof window === "undefined") {
    return { tier: "feed", remWidth: 90, units: { withPanel: 1, withoutPanel: 1 } };
  }
  const rootPx =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const remWidth = window.innerWidth / rootPx;
  return {
    tier: tierOf(remWidth),
    remWidth,
    units: {
      withPanel: unitsFor(remWidth, true),
      withoutPanel: unitsFor(remWidth, false),
    },
  };
}

export function useWidthTier(): WidthReading {
  const [reading, setReading] = useState<WidthReading>(() => readWidth());
  useEffect(() => {
    const update = (): void => {
      const next = readWidth();
      setReading((prev) =>
        prev.tier === next.tier &&
        prev.units.withPanel === next.units.withPanel &&
        prev.units.withoutPanel === next.units.withoutPanel &&
        Math.abs(prev.remWidth - next.remWidth) < 0.5
          ? prev
          : next,
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return reading;
}
