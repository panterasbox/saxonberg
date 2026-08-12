/**
 * **Marble** — the light ground.
 *
 * Marble ships in the same build as Ink on purpose. A theme-aware colour
 * layer with exactly one theme is untested by construction: nothing
 * distinguishes a component that resolves at render time from one that
 * read a constant at import time. Marble is the second variant that
 * proves the abstraction, which is also why it could not be "added later
 * once we're sure" — being sure is what it provides.
 *
 * Tier-1 values are verbatim from `docs/design_handoff/DESIGN-SYSTEM.md`
 * § Marble.
 *
 * ⚠ Two things invert relative to Ink and are easy to get wrong:
 *
 * - **`-lift` / `-press` move *away from the ground's luminance*.** On a
 *   light ground that means *darker*, so `field-lift` is a deeper blue
 *   here and a brighter one in Ink.
 * - **`bad` clears its floor here (5.88:1) and does not in Ink.** Old
 *   Glory Red is legitimate on a marble ground, because the
 *   red-never-touches-blue rule is about red against the *blue field*,
 *   which Marble does not use as its reading surface. So `ember`
 *   collapses onto Old Glory Red here rather than needing an invented
 *   value — two of its three cells are published colours.
 */

import type { Theme } from "../types";
import type { Ground } from "../../../styles/ground";
import { SX } from "../../../styles/ground";
import { BASE_REGISTERS, BASE_FONT_ROLES } from "./registers";
import { INVARIANT_GROUND } from "./invariant";

/** Ratios in comments are against `--surface` (#f7f6f2) unless noted. */
const MARBLE_GROUND: Ground = {
  ...INVARIANT_GROUND,
  // ── Tier 1 — DESIGN-SYSTEM § Marble, verbatim
  ground: "#eceae4",
  surface: "#f7f6f2",
  raised: "#FFFFFF",
  sunken: "#dcd9d0",
  line: "#c4c0b4",
  "line-soft": "#e0ddd4",
  fg: "#0b1830", // 16.35
  "fg-dim": "#42506b", // 7.49
  "fg-mute": "#5c6880", // 5.18
  accent: "#8a6d1f", // 4.53 — clears, barely
  "accent-ink": "#fffdf5", // 4.81 against accent
  good: "#2f6d62", // 5.57
  warn: "#6e5510", // 6.54
  bad: "#BF0A30", // 5.88 — clears here; see the header note
  info: "#002868", // 12.92
  paper: "#f7f1e3",
  "paper-ink": "#2a2418", // 13.67 against paper
  "paper-line": "#ddd3bc",
  // ── Tier 1b
  ember: "#BF0A30", // 5.88 — Old Glory Red, legitimate on marble
  // ── Tier 2 — derived chrome. On a light ground, `lift`/`press` darken.
  "good-lift": "#235349", // 8.07
  "field-lift": "#001b48", // white on it: 16.80
  "field-press": "#00112e", // white on it: 18.80
  "line-strong": "#a8a498",
  "accent-wash": "#8a6d1f1f",
  hatch: "#e6e8e8",
  "hatch-strong": "#a3abb5",
  shadow: "#0b183026",
  scrim: "#dcd9d0d9",
  "stripe-s": "55%",
  "stripe-l": "34%",
  // ── Tier 2b — social tints
  "tint-amber": "#8a6d1f", // = accent
  "tint-teal": "#2f6d62", // = good
  "tint-rose": "#BF0A30", // = ember
  "tint-slate": "#5c6880", // = fg-mute
  "tint-violet": "#6a5db0", // 5.10
  "tint-emerald": "#2f7d3a", // 4.72
  "tint-sky": "#002868", // = info
  "tint-neutral": "#42506b", // = fg-dim
};

export const MARBLE_THEME: Theme = {
  name: "marble",
  ground: MARBLE_GROUND,
  // Identical in shape and in role references to Ink's — the whole
  // claim of the ground layer is that a second theme is a palette
  // module and not a second sweep, so any divergence below would be a
  // bug rather than a design.
  palette: {
    fg: SX.fg,
    bg: SX.surface,
    fgMuted: SX["fg-mute"],
    chanChip: SX["tint-amber"],
    speech: SX.fg,
    link: SX.good,
    inertLink: SX["tint-slate"],
    mentionSelfFg: SX.accent,
    mentionSelfBg: SX["accent-wash"],
    mentionOther: SX["tint-violet"],
    channelDefaults: {
      gossip: SX["tint-amber"],
      trade: SX["tint-sky"],
      newbie: SX["tint-emerald"],
    },
  },
  topic: {
    // Empty for the same reason as Ink: frame-level rules must not
    // claim a dimension the per-word markers use.
  },
  element: {},
  bucket: {
    neutral: {},
    friend: { fg: SX["tint-emerald"], weight: "bold" },
    foe: { fg: SX.ember, weight: "bold" },
  },
  mention: {
    match: {
      fg: SX.accent,
      bg: SX["accent-wash"],
      weight: "bold",
    },
    other: { fg: SX["tint-violet"] },
  },
  registers: BASE_REGISTERS,
  fontRoles: BASE_FONT_ROLES,
};
