/**
 * The civic **ground** — the CSS custom-property colour vocabulary every
 * other colour surface in the client resolves through.
 *
 * There is exactly one place a colour *value* lives: the `ground` record
 * on each theme module under `lib/style/themes/`. Everything else — the
 * chrome tokens in `components/ui/tokens`, `Theme.palette`, every theme
 * treatment's `fg`/`bg` — holds a `var(--sx-…)` **reference** built from
 * {@link SX}. That is what "one colour source" means operationally, and
 * `lib/style/__tests__/oneColourSource.test.ts` asserts it rather than
 * trusting it.
 *
 * This module contains **no hex**. It declares the vocabulary, the
 * `Ground` shape, and the reference table; the themes supply values.
 *
 * ## Why `Record<GroundRole, string>` and not a partial
 *
 * A missing custom property fails **silently**: CSS drops the
 * declaration and the element inherits whatever its ancestor had. That
 * is this repo's recurring failure mode, so it is closed twice —
 * `Ground = Record<GroundRole, string>` makes "every theme defines every
 * role" a *compile* error, and `customProperties.test.ts` re-asserts it
 * at runtime in case a cast ever erases the compile-time guarantee.
 *
 * ## ⚠ The cost of a token that is a string
 *
 * A `var()` string is indistinguishable from any other string to
 * TypeScript. Two things therefore break with **no type error**:
 *
 * 1. **Colour arithmetic on a token.** `lighten(tokens.color.fg, 0.2)`,
 *    a substring compare, a `parseInt` of the hex — none of these can
 *    work on `"var(--sx-fg)"`, and none of them will fail to compile.
 * 2. **Writing a token into a non-CSS context.** An SVG `fill=`
 *    attribute, a canvas `fillStyle`, a `<meta name="theme-color">` — a
 *    `var()` reference is only meaningful inside a CSS declaration.
 *
 * If you need to *compute* a colour, compose with `var()` instead of
 * resolving it: `hsl(${hue} var(--sx-stripe-s) var(--sx-stripe-l))` is
 * how `GutterStripe` keeps a computed hue while the calibration stays
 * the ground's. See `lib/style/__tests__/noHexLiterals.test.ts`, which
 * permits a colour function only when its arguments include a `var(`.
 */

/**
 * The role vocabulary, in tier order. A name appears here **once**;
 * {@link SX} and {@link Ground} are both derived from it, so a role
 * cannot be spelled two ways.
 *
 * **Tier 1 — the published grounds (18).** Verbatim from
 * `docs/design_handoff/DESIGN-SYSTEM.md`. ⚠ Where
 * `Art Direction - Civic.dc.html` disagrees (it gives `--fg-mute` as
 * `#66799a`/`#78849a`), DESIGN-SYSTEM wins — it is the published palette
 * and the reference art is reference art.
 *
 * **Tier 1b — the official colours + reference art (4).** `field`,
 * `red`, `white` are the three official colours and are *identical in
 * every ground*: the flag is the flag, and high-contrast does not
 * repaint the seal. ⚠ `bad` and `red` are separate names on purpose —
 * `bad` is a semantic role that merely *happens* to equal Old Glory Red
 * in Ink and Marble, which lets high-contrast give `bad` a legible value
 * while `red` stays exact. `ember` is the alert-on-field colour: Ink's
 * `bad` measures 2.66:1 against Ink's surface and is unreadable there.
 *
 * **Tier 2 — derived chrome (11).** Not published anywhere; each is a
 * lightness step off a published family, never a new hue. A `-lift` /
 * `-press` step moves *away from the ground's luminance* (lighter in
 * Ink, darker in Marble). `stripe-s` / `stripe-l` are percentages, not
 * colours — they calibrate the one computed colour in the client.
 *
 * **Tier 2b — social tints (8).** The 1:1 target of `tokens.palette`,
 * and therefore of the server's `NotifyRule.PaletteToken` vocabulary.
 * Six reuse the ground's own Tier-1 values; `tint-violet` and
 * `tint-emerald` are the only authored additions.
 *
 * **Tier 3 — invariant platform marks (3).** Third-party marks, not
 * theme colours. Identical in every ground, declared once in
 * `themes/invariant.ts` and spread into all three records so no theme
 * can diverge on someone else's trademark.
 */
export const GROUND_ROLES = [
  // ── Tier 1 — published grounds
  "ground",
  "surface",
  "raised",
  "sunken",
  "line",
  "line-soft",
  "fg",
  "fg-dim",
  "fg-mute",
  "accent",
  "accent-ink",
  "good",
  "warn",
  "bad",
  "info",
  "paper",
  "paper-ink",
  "paper-line",
  // ── Tier 1b — official colours + reference art
  "field",
  "red",
  "white",
  "ember",
  // ── Tier 2 — derived chrome
  "good-lift",
  "field-lift",
  "field-press",
  "line-strong",
  "accent-wash",
  "hatch",
  "hatch-strong",
  "shadow",
  "scrim",
  "stripe-s",
  "stripe-l",
  // ── Tier 2b — social tints
  "tint-amber",
  "tint-teal",
  "tint-rose",
  "tint-slate",
  "tint-violet",
  "tint-emerald",
  "tint-sky",
  "tint-neutral",
  // ── Tier 3 — invariant platform marks
  "brand-twitch",
  "brand-youtube",
  "brand-kick",
] as const;

export type GroundRole = (typeof GROUND_ROLES)[number];

/**
 * A theme's concrete values — one per role, no exceptions. The `Record`
 * is the first guard: a theme missing a role is a compile error, not a
 * custom property that silently resolves to nothing.
 */
export type Ground = Record<GroundRole, string>;

/**
 * The `var()` **reference** table — `SX.surface === "var(--sx-surface)"`.
 *
 * The only place in the codebase where a `--sx-` name is constructed, so
 * a typo is impossible here rather than silent everywhere else. Hand-
 * writing `var(--sx-surace)` somewhere is still possible, which is why
 * `customProperties.test.ts` also scans source for `--sx-*` names that
 * are not in {@link GROUND_ROLES}.
 */
export const SX: Record<GroundRole, string> = Object.fromEntries(
  GROUND_ROLES.map((role) => [role, `var(--sx-${role})`]),
) as Record<GroundRole, string>;
