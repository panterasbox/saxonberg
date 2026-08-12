/**
 * useGround — write the active theme's {@link Ground} onto
 * `documentElement` as `--sx-*` custom properties.
 *
 * This is the emission half of the colour layer: `styles/ground.ts`
 * declares the vocabulary and the `var()` references, each theme module
 * supplies one record of values, and this module puts those values where
 * the references can find them.
 *
 * ## ⚠ Why this is imperative and not a second `createGlobalStyle`
 *
 * `GlobalFonts` has to be mounted *outside* `React.StrictMode` because a
 * `createGlobalStyle` under StrictMode is injected on mount, removed by
 * the simulated mount→unmount→remount, and never re-added
 * (styled-components #3601). Any new global-style sink inherits that
 * trap. Four reasons the ground sidesteps it entirely:
 *
 * 1. There is nothing injected, so there is nothing to be removed and
 *    never re-added.
 * 2. It can therefore live *inside* StrictMode and read the store
 *    normally, instead of being hoisted next to `GlobalFonts` where it
 *    could not see the overlay.
 * 3. `setProperty` is idempotent, so StrictMode's double-invoked effect
 *    is harmless.
 * 4. It is testable: jsdom does not substitute `var()` in
 *    `getComputedStyle`, but it *does* store and return custom
 *    properties set on `documentElement.style`. A `createGlobalStyle`
 *    sink would be untestable for exactly the thing that matters.
 *
 * ⚠ **Do not add a cleanup that removes the properties.** A cleanup on
 * the simulated unmount is precisely how #3601 bites; the ground is
 * global page state with a single writer, and leaving the last-applied
 * values in place is the correct behaviour on unmount anyway.
 */

import { useEffect } from "react";
import { useStore } from "../../store";
import { pickTheme } from "./themes";
import type { Ground } from "../../styles/ground";
import { GROUND_ROLES } from "../../styles/ground";
import type { StyleOverlay } from "./types";

const EMPTY_OVERLAY: StyleOverlay = {};

/**
 * Write every role of `ground` onto `document.documentElement` as a
 * `--sx-<role>` custom property. Idempotent; safe to call before React
 * mounts (and `main.tsx` does, so first paint has a ground rather than
 * a flash of inherited defaults).
 */
export function applyGround(ground: Ground): void {
  const root = document.documentElement;
  for (const role of GROUND_ROLES) {
    root.style.setProperty(`--sx-${role}`, ground[role]);
  }
}

/**
 * Keep the emitted ground in step with the active theme.
 *
 * ⚠ Call this at the **top of `App()`**, above the phase switch. `App`
 * early-returns per connection phase, so a hook mounted inside one case
 * would miss the other four — the start screen and char-gen would render
 * on whatever ground `main.tsx` happened to pre-apply.
 *
 * Reads the same `clientState['style.overlay']` slice as
 * {@link useStylesheet} and resolves through the same {@link pickTheme},
 * which is the divergence guard: if the chrome and the transcript picked
 * their theme separately they could disagree, and the transcript is the
 * one surface that must never carry a mode's dress.
 */
export function useGround(): void {
  const themeName = useStore(
    (state) =>
      (
        (state.clientState["style.overlay"] as StyleOverlay | undefined) ??
        EMPTY_OVERLAY
      ).theme,
  );

  useEffect(() => {
    applyGround(pickTheme(themeName).ground);
  }, [themeName]);
}
