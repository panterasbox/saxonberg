/**
 * Semantic theme tokens consumed by the shared `ui/` components and
 * the inspection card. Per the message-rendering slate, styling is a
 * client stylesheet mapped from semantic selectors to visual
 * treatments — components reference these tokens by *role*
 * (`surface`, `fg`, `accent`, `border`), not by literal color.
 *
 * **Every colour below is a `var(--sx-…)` reference into the active
 * theme's `ground`** (see `styles/ground.ts`), so chrome repaints when
 * the theme changes with no component touched. The names and shape are
 * unchanged from the pre-civic table on purpose: the migration is one
 * token module, not 1468 call sites.
 *
 * Component code must NEVER hardcode hex literals; if a needed treatment
 * isn't here, add a token rather than inlining. That sentence has stood
 * unenforced since this file was written —
 * `lib/style/__tests__/noHexLiterals.test.ts` now makes good on it.
 *
 * ⚠ A `var()` string is indistinguishable from any other string to
 * TypeScript. Do not do colour arithmetic on a token, and do not write
 * one into a non-CSS context (SVG `fill=`, canvas `fillStyle`, a string
 * compare) — both break with no type error. `styles/ground.ts` carries
 * the long form of this warning.
 *
 * ⚠⚠ **Two aliases cross over, and the crossing is deliberate.** The
 * pre-civic palette was VS Code dark, whose emphasis colour was a gold
 * and whose accent was a teal; the civic palette's accent is brass and
 * its `good` is verdigris. Mapping by *appearance* rather than by name
 * is what let every call site stay put:
 *
 *   - `color.fgEmphasis` was the gold `#d7ba7d` → `--sx-accent` (brass)
 *   - `color.accent`     was the teal `#4ec9b0` → `--sx-good` (verdigris)
 *
 * ⭐ And `color.danger` resolves to `--sx-ember`, **not** `--sx-bad`.
 * That is how "red never touches blue" becomes testable rather than
 * aspirational: Ink's `bad` is Old Glory Red at 2.66:1 against the navy
 * surface — unreadable as text. `ember` is the alert-on-field colour at
 * 5.57:1. `bad`/`red` remain reserved for the seal, the flag rule and
 * the single committing action per screen, and `contrast.test.ts`
 * asserts no token here resolves to `--sx-bad`.
 */

import { FACE_STACKS } from "../../styles/faces";
import { SX } from "../../styles/ground";

export const tokens = {
  color: {
    surface: SX.surface,
    surfaceAlt: SX.raised,
    surfaceMuted: SX.ground,
    surfaceSunken: SX.sunken,
    fg: SX.fg,
    // ⭐ The three-level text hierarchy the chrome build needed:
    // `fg` (what you are reading) → `fgDim` (present, secondary — a
    // shelf label beside its value) → `fgMuted` (barely there — a hint,
    // an at-rest placeholder). `fg-dim` was already a defined ground
    // role in all three themes and already classified as a
    // floor-clearing TEXT_ROLE; it simply had no alias here.
    fgDim: SX["fg-dim"],
    fgMuted: SX["fg-mute"],
    fgEmphasis: SX.accent,
    accent: SX.good,
    accentHover: SX["good-lift"],
    onAccent: SX["accent-ink"],
    primary: SX.field,
    primaryHover: SX["field-lift"],
    primaryActive: SX["field-press"],
    border: SX.line,
    borderMuted: SX["line-soft"],
    borderEmphasis: SX["line-strong"],
    sectionLabel: SX["fg-mute"],
    actionBg: SX.raised,
    actionBgHover: SX.line,
    // Connection-health signals — narrow, high-meaning state only
    // (reconnecting / dropped). Not for general decoration.
    warning: SX.warn,
    danger: SX.ember,
    // ── Additive keys the hex sweep needed. No call site changed to
    //    gain these; they exist so the literals they replace had a home.
    /** Informational, non-alarming state. The `not wired` glyph. */
    info: SX.info,
    /** A translucent accent film — self-mention background, selection. */
    accentWash: SX["accent-wash"],
    /** Foreground on a saturated field (buttons, the blue canton). */
    onField: SX.white,
    /**
     * ⭐ Old Glory Red as the **official colour**, distinct from the
     * `bad` semantic role — reserved for the seal, the flag rule and
     * the single committing action per screen. Every one of those
     * carries white separation, which is what makes it usable at 2.66:1
     * where `bad` as text would not be; `color.danger` resolves to
     * `ember` for alerts and always will.
     *
     * ⚠ A background/border colour only. Never put text in this.
     */
    seal: SX.red,
    /** The white that separates the seal from what it sits on. */
    sealInk: SX.white,
    /** Drop shadow under a raised surface. */
    shadow: SX.shadow,
    /** Full-surface dim behind a modal or a disabled region. */
    scrim: SX.scrim,
    /** The unbuilt-state hatch, and its higher-contrast stripe. */
    hatch: SX.hatch,
    hatchStrong: SX["hatch-strong"],
    /** The plate register — an author illustration's paper mount. */
    paper: SX.paper,
    paperInk: SX["paper-ink"],
    paperLine: SX["paper-line"],
  },
  // Named social-graph highlight palette. The server emits a token name
  // (never raw hex — see `NotifyRule.PaletteToken`); the client maps it
  // here so a theme swap re-tints every social highlight in one edit.
  // `paletteFor(token)` falls back to `neutral` for an unknown token.
  // 1:1 with the ground's `tint-*` tier, which is what keeps the
  // server's token vocabulary and the ground's in step.
  palette: {
    amber: SX["tint-amber"],
    teal: SX["tint-teal"],
    rose: SX["tint-rose"],
    slate: SX["tint-slate"],
    violet: SX["tint-violet"],
    emerald: SX["tint-emerald"],
    sky: SX["tint-sky"],
    neutral: SX["tint-neutral"],
  } as Record<string, string>,
  // Third-party platform marks. Not theme colours — somebody else's
  // trademarks, identical in every ground. They live in the token layer
  // because the alternative is three hex literals loose in
  // `relayTemplate`, and an evasion is worse than a home.
  brand: {
    google: SX["brand-google"],
    twitch: SX["brand-twitch"],
    youtube: SX["brand-youtube"],
    kick: SX["brand-kick"],
  },
  // DESIGN-SYSTEM § Scale: 4 / 6 / 9 / 12 / 16 / 22px. Theme-invariant,
  // so these stay literal — a ground does not change how far apart
  // things sit.
  space: {
    xs: "4px",
    sm: "6px",
    md: "9px",
    lg: "12px",
    xl: "16px",
    xxl: "22px",
  },
  font: {
    // ── Faces. `family` is the app-chrome default voice (Public Sans).
    // Every chrome component (`tokens.font.family`) reads it; the command
    // register (CommandBar input/echo, `<pre>`/`<code>`) opts into `mono`
    // explicitly, and the engraved display voice into `engraved`. All
    // four stacks come from the single face-stack source so a swap is one
    // edit in `styles/faces`. `sans`/`serif`/`mono` are the pre-civic
    // alias names, kept so no call site moved.
    //
    // ⚠ The face is `engraved`, not `display` — `display` is the 22px
    // step in the size scale below. DESIGN-SYSTEM names the role
    // "Engraved capitals, display"; the two halves of that phrase are the
    // two keys.
    family: FACE_STACKS.chrome,
    sans: FACE_STACKS.chrome,
    serif: FACE_STACKS.narrative,
    mono: FACE_STACKS.command,
    engraved: FACE_STACKS.display,
    // ── Sizes. The DESIGN-SYSTEM § Scale type ramp: 10px engraved labels
    // · 11.5–12.5px secondary · 13–14px body chrome · 15–17px world prose
    // · 19–26px display.
    label: "10px",
    micro: "11.5px",
    small: "12.5px",
    body: "13px",
    title: "14px",
    prose: "16px",
    display: "22px",
  },
  // DESIGN-SYSTEM § Scale: "Radius 3px everywhere. Engraved, not
  // friendly." Both keys are kept so no call site moved; they are the
  // same value on purpose, and a future divergence would be a design
  // decision rather than a leftover.
  radius: {
    sm: "3px",
    md: "3px",
  },
  // The side rail — the fixed-width complement to a fluid primary column
  // (chat rail, glance terminal). Fixed rem on purpose: a percentage rail
  // collapses on narrow screens and balloons on ultrawide. `wide` is the
  // CMS/builder variant that needs room for the explorer + editor.
  rail: {
    width: "22rem",
    minWidth: "16rem",
    wideWidth: "24rem",
    wideMinWidth: "18rem",
  },
  // The focal split — the canonical content-vs-content vertical ratio
  // (composition grammar): the focal card (video / stats) claims the
  // dominant share, the never-blind game terminal keeps the rest.
  ratio: {
    focal: 62,
    focalComplement: 38,
  },
  /**
   * Viewport thresholds. ⭐ **One named constant, so the chrome cannot
   * drift into disagreeing with itself about what "narrow" means.**
   *
   * `compact` sits above phone landscape and below tablet portrait: the
   * width at which the top bar stops being a bar that can wrap and
   * starts being two rows plus a pull-down, because *a bar that wraps
   * has nowhere to wrap to* when every row it takes is a row the feed
   * loses.
   *
   * ⚠ It deliberately does NOT match `CharGenStage`'s ad-hoc 640/520.
   * Those are a different question — intake layout, whose mobile art is
   * its own wave — and retuning them here would be building half of
   * that wave blind. A sweep can unify later; an accidental match now
   * would make two unrelated decisions look like one.
   */
  breakpoint: {
    compact: "760px",
  },
} as const;

export type Tokens = typeof tokens;
