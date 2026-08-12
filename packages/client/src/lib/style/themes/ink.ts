/**
 * **Ink** — the dark ground, and the default.
 *
 * A deepened navy drawn from Old Glory Blue, because the blue itself is
 * "a canton, not the whole cloth" — at full saturation it is unreadable
 * under dense text, so it holds mastheads, seals and panels while the
 * reading ground is the navy below it. Brass accent, hairline rules,
 * squared corners.
 *
 * Tier-1 values are verbatim from `docs/design_handoff/DESIGN-SYSTEM.md`
 * § Ink. Tier-2 values are derived (a lightness step off a published
 * family, never a new hue) and every one is contrast-checked against
 * `--surface` by `lib/style/__tests__/contrast.test.ts` — that test is
 * the gate, and a value that fails it should move along its own hue
 * rather than change hue.
 *
 * ⚠ **`bad` is deliberately below the contrast floor here** — Old Glory
 * Red on the navy field measures 2.66:1 and is unreadable as text. That
 * is not a defect to fix by lightening the red; it *is* the "red never
 * touches blue" rule expressed as a measurement. `ember` (#e8705c,
 * 5.57:1) is the alert-on-field colour, and `tokens.color.danger`
 * resolves to `ember`, never to `bad`. `bad` and `red` stay in the
 * vocabulary for the seal, the flag rule and the single committing
 * action per screen — surfaces that carry white separation.
 */

import type { Theme } from "../types";
import type { Ground } from "../../../styles/ground";
import { SX } from "../../../styles/ground";
import { BASE_REGISTERS, BASE_FONT_ROLES } from "./registers";
import { INVARIANT_GROUND } from "./invariant";

/**
 * Ink's concrete colour values — one of only three places in the client
 * where a colour literal may appear (the other two are `marble.ts` and
 * `highContrast.ts`; `invariant.ts` holds the flag and the marks).
 * Ratios in comments are against `--surface` (#0d1c38) unless noted.
 */
const INK_GROUND: Ground = {
  ...INVARIANT_GROUND,
  // ── Tier 1 — DESIGN-SYSTEM § Ink, verbatim
  ground: "#071224",
  surface: "#0d1c38",
  raised: "#15274a",
  sunken: "#040b17",
  line: "#22355e",
  "line-soft": "#132441",
  fg: "#f2f5fa", // 15.49
  "fg-dim": "#9fb0cc", // 7.70
  "fg-mute": "#8494b3", // 5.54
  accent: "#c9a227", // 7.00 — brass
  "accent-ink": "#171204", // 7.72 against accent
  good: "#4a9d8f", // 5.25
  warn: "#c9a227", // 7.00
  bad: "#BF0A30", // 2.66 — EXEMPT; see the header note
  info: "#5b8fd6", // 5.12
  paper: "#f2ebdc",
  "paper-ink": "#2a2418", // 12.97 against paper
  "paper-line": "#d8cdb4",
  // ── Tier 1b — ember, the alert-on-field colour (reference art)
  ember: "#e8705c", // 5.57
  // ── Tier 2 — derived chrome. `-lift`/`-press` move away from the
  //    ground's luminance, so on a dark ground `lift` is lighter.
  "good-lift": "#6bbfaf", // 7.82
  "field-lift": "#16407f", // white on it: 10.13
  "field-press": "#001b48", // white on it: 16.80
  "line-strong": "#35507f",
  "accent-wash": "#c9a2271f",
  hatch: "#122443",
  "hatch-strong": "#1b2d49",
  shadow: "#00000099",
  scrim: "#040b17cc",
  // Percentages, not colours: the saturation/lightness calibration for
  // `GutterStripe`'s computed hue, hand-tuned to stay legible here.
  "stripe-s": "65%",
  "stripe-l": "50%",
  // ── Tier 2b — social tints. Six reuse Tier-1 values; violet and
  //    emerald are the only authored additions.
  "tint-amber": "#c9a227", // = accent
  "tint-teal": "#4a9d8f", // = good
  "tint-rose": "#e8705c", // = ember
  "tint-slate": "#8494b3", // = fg-mute
  "tint-violet": "#a89bd8", // 6.73
  "tint-emerald": "#6abf69", // 7.47
  "tint-sky": "#5b8fd6", // = info
  "tint-neutral": "#9fb0cc", // = fg-dim
};

export const INK_THEME: Theme = {
  name: "ink",
  ground: INK_GROUND,
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
    // Frame-level rules stay EMPTY for content topics. Per-word
    // markers (`<strong>`, `<em>`, `<code>`) live at the element
    // level — if the topic rule claims the same dimension (bold,
    // italic), the per-word marker becomes invisible. Speech is
    // already marked by the quote characters in the body and the
    // "You say," / "X says," framing; no extra typographic claim
    // needed at the frame level.
  },
  element: {
    // Per-word markers via the renderer's hardcoded styled-components
    // (StrongSpan = bold, EmSpan = italic, CodeSpan = monospace + bg).
    // Theme entries reserved for future per-element divergence;
    // empty here so the renderer's defaults stand uncontested.
  },
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
  // Font-by-register: topic→register map + role→family stacks, shared
  // with every theme (typography is orthogonal to the ground).
  registers: BASE_REGISTERS,
  fontRoles: BASE_FONT_ROLES,
};
