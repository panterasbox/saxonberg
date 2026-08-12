/**
 * **High contrast** — the accessibility ground, re-based on civic.
 *
 * Its acceptance gate is unchanged and is the reason it exists: every
 * treatment that sets a colour also sets at least one **non-colour cue**
 * (weight, italic, prefix, chip), so the theme stays legible with the
 * colour channel removed. Colour-alone semantics is the failure this
 * theme is the test for, and `themes.test.ts` audits it.
 *
 * Re-basing on civic means it now supplies the same 44-role `ground` as
 * Ink and Marble rather than a private palette — so it participates in
 * the same guards, and a role added to the vocabulary cannot be quietly
 * skipped here.
 *
 * ⚠ **`ground === surface === sunken === #000000` on purpose.** Maximal
 * separation between text and field is the whole point, and inventing a
 * separation floor *between* the structural greys would fail exactly the
 * theme that needs the most contrast. `contrast.test.ts` classifies the
 * structural roles as carrying no floor for this reason.
 *
 * ⚠ **`bad` diverges from `red` here, and only here.** `red` is Old
 * Glory Red and stays exact in every ground; `bad` is the semantic role
 * and takes a legible value (#ff4d4d, 6.42:1) because a 2.66:1 red would
 * defeat the theme.
 */

import type { Theme } from "../types";
import type { Ground } from "../../../styles/ground";
import { SX } from "../../../styles/ground";
import { BASE_REGISTERS, BASE_FONT_ROLES } from "./registers";
import { INVARIANT_GROUND } from "./invariant";

/** Ratios in comments are against `--surface` (#000000) unless noted. */
const HIGH_CONTRAST_GROUND: Ground = {
  ...INVARIANT_GROUND,
  // ── Tier 1 — contrast-maximal, not a published ground
  ground: "#000000",
  surface: "#000000",
  raised: "#1a1a1a",
  sunken: "#000000",
  line: "#ffffff",
  "line-soft": "#767676",
  fg: "#ffffff", // 21.00
  "fg-dim": "#e6e6e6", // 16.83
  "fg-mute": "#cccccc", // 13.08
  accent: "#ffff00", // 19.56
  "accent-ink": "#000000", // 19.56 against accent
  good: "#00ff00", // 15.30
  warn: "#ffff00", // 19.56
  bad: "#ff4d4d", // 6.42 — the semantic role, made legible
  info: "#00ffff", // 16.75
  paper: "#ffffff",
  "paper-ink": "#000000", // 21.00 against paper
  "paper-line": "#767676",
  // ── Tier 1b
  ember: "#ff4d4d", // 6.42
  // ── Tier 2 — derived chrome
  "good-lift": "#66ff99", // 16.33
  "field-lift": "#0044aa", // white on it: 8.72
  "field-press": "#001133", // white on it: 18.62
  "line-strong": "#ffffff",
  "accent-wash": "#000000",
  hatch: "#001a33",
  "hatch-strong": "#00ffff",
  shadow: "#000000",
  scrim: "#000000e6",
  "stripe-s": "100%",
  "stripe-l": "60%",
  // ── Tier 2b — social tints
  "tint-amber": "#ffff00",
  "tint-teal": "#00ffff",
  "tint-rose": "#ff4d4d",
  "tint-slate": "#cccccc",
  "tint-violet": "#ff99ff", // 11.25
  "tint-emerald": "#00ff00", // 15.30
  "tint-sky": "#66b3ff", // 9.46
  "tint-neutral": "#ffffff", // 21.00
};

export const HIGH_CONTRAST_THEME: Theme = {
  name: "high-contrast",
  ground: HIGH_CONTRAST_GROUND,
  palette: {
    fg: SX.fg,
    bg: SX.surface,
    fgMuted: SX["fg-mute"],
    chanChip: SX["tint-amber"],
    speech: SX.fg,
    link: SX["tint-teal"],
    inertLink: SX["tint-slate"],
    mentionSelfFg: SX.accent,
    mentionSelfBg: SX.surface,
    mentionOther: SX.fg,
    channelDefaults: {
      gossip: SX["tint-amber"],
      trade: SX["tint-teal"],
      newbie: SX["tint-emerald"],
    },
  },
  topic: {
    // Per-word markers (`<strong>`, `<em>`, `<code>`) are how
    // emphasis lands; topic-cascade rules must NOT claim those same
    // dimensions or the per-word markers become invisible. Tell uses
    // a prefix glyph (non-color cue) for high-contrast and a slightly
    // dimmer fg for the public/private distinction; nothing claims
    // italic or bold at the frame level.
    "speech.comms": { fg: SX["fg-mute"], prefix: "» " },
  },
  element: {
    // The renderer's hardcoded styled-components carry per-tag
    // emphasis (StrongSpan, EmSpan, CodeSpan). Theme entries reserved
    // for future divergence; empty so the renderer's defaults stand.
  },
  bucket: {
    neutral: {},
    // Friend / foe pair fg color with weight + prefix so the
    // distinction survives a monochrome render.
    friend: { fg: SX["tint-emerald"], weight: "bold", prefix: "+" },
    foe: { fg: SX.bad, weight: "bold", prefix: "!" },
  },
  mention: {
    match: {
      fg: SX.accent,
      bg: SX.surface,
      weight: "bold",
      prefix: "►",
    },
    other: { fg: SX.fg, weight: "bold" },
  },
  // Identical font register mapping as every other theme — typography
  // register is orthogonal to the contrast axis.
  registers: BASE_REGISTERS,
  fontRoles: BASE_FONT_ROLES,
};
