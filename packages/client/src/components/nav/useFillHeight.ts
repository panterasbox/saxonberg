/**
 * useFillHeight — the card fills the height it is given (navigation card
 * D8): sections open in order while there is room, and the last one the
 * card opened folds first when there is not. A section the player opened
 * or closed by hand is never touched.
 *
 * The RULE is `fitSections`, a pure function (jsdom has no layout, so it
 * is unit-tested with numbers); the hook is a thin measurer around it.
 * Each section's need is learned by one trial, so the loop settles; a
 * width change clears what was learned.
 */

import React from "react";

export type SetState = "open" | "closed";

export interface FitInput {
  /** The optional sections, widest first. */
  order: readonly string[];
  /** Sections the player set by hand. */
  userSet: Readonly<Record<string, SetState>>;
  /** Sections the card opened itself. */
  auto: ReadonlySet<string>;
  /** What a section needed when it was last tried open, px. */
  needs: Readonly<Record<string, number>>;
  /** Room left, px (0 when overflowing). */
  free: number;
  /** How far the content overflows, px (0 when it fits). */
  overflow: number;
  /** Room enough to try a section whose need is unknown (about four lines). */
  tryRoom: number;
}

export type FitStep = { kind: "open"; name: string } | { kind: "fold"; name: string } | { kind: "settled" };

/** One step toward filling the height (D8). */
export function fitSections(input: FitInput): FitStep {
  const { order, userSet, auto, needs, free, overflow, tryRoom } = input;
  if (overflow > 0) {
    for (let i = order.length - 1; i >= 0; i--) {
      const name = order[i]!;
      if (auto.has(name) && userSet[name] === undefined) return { kind: "fold", name };
    }
    return { kind: "settled" };
  }
  for (const name of order) {
    if (userSet[name] !== undefined || auto.has(name)) continue;
    const need = needs[name];
    if (need === undefined ? free >= tryRoom : need <= free) return { kind: "open", name };
  }
  return { kind: "settled" };
}

/** The nearest ancestor that scrolls — the panel the card is docked in. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
    p = p.parentElement;
  }
  return null;
}

export interface FillOptions {
  rootRef: React.RefObject<HTMLElement>;
  order: readonly string[];
  userSet: Readonly<Record<string, SetState>>;
  /** A section's open height, px — its need, learned when it folds. */
  measure: (name: string) => number;
  /** Off for a body that does not fill a panel. */
  enabled?: boolean;
}

/** The sections the card opened itself. */
export function useFillHeight(opts: FillOptions): ReadonlySet<string> {
  const { rootRef, order, userSet, measure, enabled = true } = opts;
  const [auto, setAuto] = React.useState<ReadonlySet<string>>(() => new Set());
  const [needs, setNeeds] = React.useState<Record<string, number>>({});
  const [tick, setTick] = React.useState(0);
  const width = React.useRef<number | null>(null);

  // Re-measure when the panel or the content changes size; a width change
  // clears what was learned.
  React.useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const panel = scrollParent(root);
    if (!root || !panel || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = panel.clientWidth;
      if (width.current !== null && Math.abs(w - width.current) > 1) setNeeds({});
      width.current = w;
      setTick((t) => t + 1);
    });
    ro.observe(panel);
    ro.observe(root);
    return () => ro.disconnect();
  }, [enabled, rootRef]);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    const panel = scrollParent(rootRef.current);
    if (!panel || panel.clientHeight === 0) return;
    const overflow = Math.max(0, panel.scrollHeight - panel.clientHeight);
    const free = overflow > 0 ? 0 : panel.clientHeight - contentHeight(panel);
    const step = fitSections({ order, userSet, auto, needs, free, overflow, tryRoom: 72 });
    if (step.kind === "open") {
      setAuto((a) => new Set([...a, step.name]));
    } else if (step.kind === "fold") {
      const need = measure(step.name);
      setNeeds((n) => ({ ...n, [step.name]: need }));
      setAuto((a) => {
        const next = new Set(a);
        next.delete(step.name);
        return next;
      });
    }
  });
  void tick;
  return auto;
}

/** The height the panel's children take — not the panel's own box. */
function contentHeight(panel: HTMLElement): number {
  let h = 0;
  const style = getComputedStyle(panel);
  const gap = parseFloat(style.rowGap || "0") || 0;
  const kids = [...panel.children] as HTMLElement[];
  for (const k of kids) h += k.getBoundingClientRect().height;
  h += gap * Math.max(0, kids.length - 1);
  h += (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  return h;
}
