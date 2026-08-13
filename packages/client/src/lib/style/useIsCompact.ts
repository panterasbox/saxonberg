/**
 * `useIsCompact()` — is the viewport narrow enough that the chrome must
 * invert?
 *
 * ⭐⭐ **A JS switch, not a CSS-only reflow, and the reason is
 * structural rather than stylistic.** The mobile bar is not the desktop
 * bar rearranged: it is a different composition — two rows, a pull-down,
 * and no status bar at all. CSS-only means rendering BOTH and hiding
 * one, which puts two `StatusBar`s in the DOM and makes the requirement
 * *"exactly one status bar renders above the breakpoint"* unassertable,
 * because the tree would always hold two. A hook lets the unwanted half
 * not exist.
 *
 * ⚠ **It subscribes; it does not read once.** Dragging a desktop window
 * narrow is the cheapest way anyone will test this build, and a one-shot
 * read at mount would make exactly that not work — the chrome would
 * stay whatever it was when the tab opened, which reads as "the mobile
 * layout is broken" rather than "the hook is stale".
 *
 * ⚠ Lives here beside `useGround` / `useStylesheet` rather than in a
 * `hooks/` directory of its own: it is the third presentation hook, and
 * a directory holding one file is a category invented for one member.
 *
 * `matchMedia` is absent in some non-browser environments, so its
 * absence resolves to *not compact* — a desktop-shaped default, which
 * is the composition that has been shipping.
 */

import { useEffect, useState } from "react";
import { tokens } from "../../components/ui";

/** `(max-width: 760px)` — built from the one named token. */
export const COMPACT_QUERY = `(max-width: ${tokens.breakpoint.compact})`;

export function useIsCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(() => matches());

  useEffect(() => {
    const mql = window.matchMedia?.(COMPACT_QUERY);
    if (!mql) return;
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    // Re-read on subscribe: the viewport can have crossed the threshold
    // between the initial render and this effect, and a listener alone
    // would only learn about the NEXT crossing.
    setCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return compact;
}

function matches(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COMPACT_QUERY).matches;
}
