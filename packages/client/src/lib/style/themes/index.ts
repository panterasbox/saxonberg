/**
 * The theme registry — the single place that knows there are three
 * themes, and the single place that resolves a name to one.
 *
 * ⭐ **This is the divergence guard.** `useStylesheet` (the transcript's
 * cascade) and `useGround` (the chrome's custom properties) must resolve
 * the *same* theme object from the *same* overlay value; if they picked
 * separately they could disagree, and the result would be a transcript
 * wearing one ground inside chrome wearing another. Both call
 * {@link pickTheme}, and so does every guard test.
 *
 * ⚠ `default` is retired **unaliased**. It stopped naming anything the
 * moment there were two grounds — the design doc calls the dark ground
 * Ink and so does the verb. `pickTheme('default')` therefore falls
 * through to Ink like any other unknown string, and the server's
 * `cockpit style theme` refuses the word outright rather than quietly
 * accepting it. (The S2 precedent governs: no playerbase to protect, the
 * demo wipes nightly, and an alias keeps a dead vocabulary alive for
 * nobody.)
 */

import type { Theme, ThemeName } from "../types";
import { INK_THEME } from "./ink";
import { MARBLE_THEME } from "./marble";
import { HIGH_CONTRAST_THEME } from "./highContrast";

export { INK_THEME, MARBLE_THEME, HIGH_CONTRAST_THEME };

/** Every shipped theme, keyed by the name the `style` verb accepts. */
export const THEMES: Record<ThemeName, Theme> = {
  ink: INK_THEME,
  marble: MARBLE_THEME,
  "high-contrast": HIGH_CONTRAST_THEME,
};

/**
 * Resolve an overlay's `theme` value to a theme. Takes `unknown`
 * because the overlay is `Record<string, …>` off the wire — an
 * unrecognized value falls back to Ink rather than throwing, since a
 * stale or hand-edited overlay must never be able to blank the client.
 */
export function pickTheme(name: unknown): Theme {
  if (typeof name === "string" && name in THEMES) {
    return THEMES[name as ThemeName];
  }
  return INK_THEME;
}
