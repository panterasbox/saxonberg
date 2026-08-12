# Civic ground — implementation plan

Build A of three in client-rebuild Wave 1. Read
`docs/requirements/civic-ground-requirements.md` in full first — this plan is
*how*, not *what*, and does not restate its decisions. Also read
`docs/subsystems/message-rendering.md` (§§ Stylesheet engine, Themes,
Font-by-register typography, The user overlay + the `style` verb) and
`CLAUDE.md` §§ Worktrees, Module Categories, Export discipline.

Design surface (reference art, not diffable): `docs/design_handoff/DESIGN-SYSTEM.md`,
`CONVENTIONS.md`, `Art Direction - Civic.dc.html`, `Unbuilt States.dc.html`.

**Zero features.** After this build the client looks civic, both grounds
switch, four voices are self-hosted, and a surface has a vocabulary for
admitting it has no data.

---

## Grounding (facts established by investigation — do not re-verify)

### The two measurements the requirements rest on — both confirmed

**1. Every `tokens.*` use is CSS-valued.** Confirmed. `1468` reference sites
(excluding `__tests__`) over `45` distinct `tokens.<group>.<key>` paths
(the requirements say 44; the extra is `tokens.font.serif`, immaterial).
Audited every `tokens.color.*` / `tokens.palette.*` site that is *not* a
plain `${…}` interpolation inside a styled-components template. All 50-odd
residuals fall into exactly four shapes, every one CSS-valued:

- multi-line ternaries **inside** a styled template
  (`CommandBar`, `TabStrip`, `StartScreen`, `CharGenStage`, `PressRoom`,
  `ForumView`, `ViewsMenu`, `Frame`, `ReactionBar`, `TemplateForm`,
  `CmsEditor`, `CmsDiagnosticsPane`, `ComposerView`,
  `SocialNotificationsPane`);
- `Record` lookup tables read by a styled component through a transient
  prop (`WhoPane.STATUS_TINT` → `$status`; `NewsTickerPane.REALM_TONE` →
  `$tone`);
- a value passed as `$color` and interpolated (`ConnectionIndicator`'s
  `Dot`);
- dynamic index reads feeding a `$tint` (`MmlRenderer.paletteFor`,
  `SocialNotificationsPane`'s local equivalent).

No inline `style={{}}` carrying a token, no SVG `fill=`/`stroke=`, no string
comparison, no colour arithmetic. **`var()` strings are safe at all 1468
sites.** The one non-CSS token is `tokens.ratio.focal` (a bare `62` in a
`flex` shorthand) — it stays a literal, exactly as the requirements say.

**2. `REF_FIELDS` / `DETAIL_FIELDS` carry no standing fields.** Confirmed,
verbatim from `packages/server/src/mud/api/mql-subscription.ts:107-125`:
`REF_FIELDS = [displayName, quantity, primaryKeyword]`;
`DETAIL_FIELDS` adds `shortDescription, longDescription, illustration,
details, bulkMaterial, mass, contents, exits`. Both are object-description
sets; no `playStanding`, `makeStanding`, `renown`, `lastSeen`. (Relevant
only as confirmation that Build B's `PaneDefinition.fields` widening is
real work and stays out of scope here.)

**3. `StyleTreatment` has no `font` key.** Confirmed —
`packages/types/src/index.ts:2465` is `{ fg?, bg?, weight?, italic?,
prefix?, chip?, indent? }`. The `display` role stays client-only.

### ⭐ New measurement: jsdom does not substitute `var()`

Measured directly against the client's own jsdom:

```
el.style.color = 'var(--sx-fg)'    → cssText "color: var(--sx-fg);"   (accepted)
getComputedStyle(el).color         → "var(--sx-fg)"                   (NOT substituted)
root.style.setProperty('--sx-ground', '#071224')
  → getPropertyValue / getComputedStyle().getPropertyValue → "#071224" (works)
```

Three consequences, all load-bearing:

- Two existing tests **will break** and must be rewritten (see Phase 2).
- The `--sx-*` guard test **cannot** work by rendering and reading resolved
  colours; it works on the theme objects + a source scan + the applier's
  written custom properties.
- Custom properties on `documentElement.style` **are** readable in jsdom,
  so the applier is directly testable.

### The tree as it stands

| Fact | Detail |
|---|---|
| `tokens.color` | 21 keys, VS-Code-dark hex. `tokens.palette` 8 named tints. `space` in rem, `radius` 2/4px, `font` 11–14px |
| `Theme` | `lib/style/types.ts` — `name: 'default' \| 'high-contrast'`, `palette` (11 keys incl. `channelDefaults`), `topic`, `element`, `bucket`, `mention`, `registers`, `fontRoles` |
| Themes | `themes/default.ts`, `themes/highContrast.ts`, shared `themes/registers.ts` (`BASE_REGISTERS` + `BASE_FONT_ROLES`) |
| `pickTheme` | private to `lib/style/useStylesheet.ts`; `useStylesheet` is consumed **only** by `Terminal.tsx` |
| `BASE_REGISTERS` | keyed on topic **roots**: `shell`/`session` → command; `speech`/`act`/`sense`/`self`/`publication` → narrative. **There is no `world` or `system` key** |
| Faces | `styles/faces.ts` — 3 stacks; `public/fonts/` has 4 Source woff2 + `OFL.txt` |
| `GlobalFonts` | `createGlobalStyle`, mounted in `main.tsx` **outside** `React.StrictMode` with the #3601 comment; guarded by `styles/__tests__/globalFonts.test.tsx` (which already reads source off disk with `node:fs` — the precedent for a Vitest static guard) |
| App shape | one `createRoot`, no portals; `App()` is a `switch` with **early returns per phase** (`unauthenticated` / `connecting` / `character-select` / `char-gen` / `in-world`) |
| Hex literals | 29 in `tokens.ts`, 36 in the two theme modules, **18 in `MmlRenderer.tsx` over 17 lines**, plus 14 elsewhere. Also `rgba()` in 6 files, one `hsl()` generator, two `color: white` |
| Theme vocabulary, server | `StyleController.KNOWN_THEMES`, its usage + failure copy, its `as` cast, its header comment; **`CockpitController.ts:83` defaults to `'default'`** (a fifth rename site the requirements do not enumerate); `cockpit.yaml` lines 34-35, 207, 221-222; `packages/types/src/index.ts:2482` doc comment |
| Test wiring | root `pnpm test` = `pnpm --filter='!@saxonberg/e2e' -r test` → **includes the client**, and CI's `test` job runs it. Root `pnpm test:near` = `packages/server/scripts/test-near.ts` → **server-only** |
| Lint family | every `lint:*` lives in `packages/server/package.json` and has its own CI line; `packages/client` has no `scripts/` dir and no `tsx` dep |
| e2e | Playwright at `e2e/`, `openWorldAs` / `runCommand` helpers, per-test avatar; own CI stage, **not** in `pnpm test` |
| Contrast, measured | Every published DESIGN-SYSTEM text role clears 4.5:1 against its ground's `--surface` in **both** grounds — except Ink's `--bad` (`#BF0A30` on `#0d1c38` = **2.66**). Ink `--ember` (`#e8705c`) = 5.57. Marble's `--accent` = 4.53 (clears, barely) |

---

## Decisions

### D1 — One vocabulary, emitted imperatively onto `:root`

`styles/ground.ts` declares the **role vocabulary** (`GROUND_ROLES`), the
`Ground = Record<GroundRole, string>` type, and `SX` — the `var()`
*reference* table (`SX.surface === "var(--sx-surface)"`), built from
`GROUND_ROLES` so a name can never be typed twice. It contains **no hex**.

Each theme module supplies one `ground: Ground` record of hex. Because
`Ground` is `Record<GroundRole, string>`, **"every theme defines every
property" is a compile error first and a test second** — which is the
strongest available answer to the silent-fallback failure mode.

Emission is **imperative**, not a second `createGlobalStyle`:

```ts
// lib/style/useGround.ts
export function applyGround(ground: Ground): void;   // documentElement.style.setProperty per role
export function useGround(): void;                    // effect; re-applies on theme change
```

Why imperative:

1. **It sidesteps styled-components #3601 entirely.** The requirements flag
   that any new `createGlobalStyle` sink inherits `GlobalFonts`' StrictMode
   failure mode. There is nothing to inject, so there is nothing to be
   removed-and-never-re-added.
2. It can therefore live **inside** `StrictMode` and read the store
   normally, instead of being hoisted next to `GlobalFonts`.
3. `setProperty` is idempotent, so StrictMode's double-invoked effect is
   harmless. ⚠ **Do not add a cleanup that removes the properties** — a
   cleanup on the simulated unmount is precisely how #3601 bites.
4. It is testable in jsdom (measured above); a `createGlobalStyle` sink is
   not, for custom properties.

`main.tsx` calls `applyGround(INK_THEME.ground)` synchronously **before**
`createRoot(...).render(...)` so first paint has a ground. `useGround()` is
called once at the **top of `App()`**, above the phase `switch` — the switch
early-returns, so anything mounted inside a case misses the other four
phases.

### D2 — The cascade is unchanged; the ground sits *under* it

`theme → user overlay → plain-mode` survives untouched. The ground is not a
fourth cascade step; it is what the theme layer's values *resolve to*.
`Stylesheet.ts` is **not modified**: its tables still hold strings, the
strings are now `var(--sx-…)`. Selector resolution, the fixed `Treatment`
key set, and "no raw CSS reaches the engine" are all unaffected. An overlay
override still wins (it is returned earlier in the same cascade, and a
player-typed `blue` or `#ff0000` still works); plain mode still returns
`EMPTY`; `fontFamilyForTopic` still ignores `isPlain()`.

### D3 — Two colour systems become one by *reference*, not by merge

`tokens.color.*`, `tokens.palette.*`, `Theme.palette.*`,
`Theme.palette.channelDefaults.*` and every theme treatment's `fg`/`bg` all
become `SX.<role>` reads. **Hex appears in exactly one place per value: the
theme module's `ground` record.** That is the assertible form of "one
source" — Phase 5's test asserts every one of those values matches
`var(--sx-<role>)` with `role ∈ GROUND_ROLES`.

### D4 — `tokens.color`'s 21 keys become aliases; zero call sites change

⚠ Two aliases cross over and the crossing is deliberate — record it in a
comment block at the top of `tokens.ts`:
`tokens.color.fgEmphasis` was the **gold** (`#d7ba7d`) and inherits
`--sx-accent` (brass); `tokens.color.accent` was the **teal** (`#4ec9b0`)
and inherits `--sx-good` (verdigris).

| `tokens.color` key | role | `tokens.color` key | role |
|---|---|---|---|
| `surface` | `surface` | `primary` | `field` |
| `surfaceAlt` | `raised` | `primaryHover` | `field-lift` |
| `surfaceMuted` | `ground` | `primaryActive` | `field-press` |
| `surfaceSunken` | `sunken` | `border` | `line` |
| `fg` | `fg` | `borderMuted` | `line-soft` |
| `fgMuted` | `fg-mute` | `borderEmphasis` | `line-strong` |
| `fgEmphasis` | `accent` | `sectionLabel` | `fg-mute` |
| `accent` | `good` | `actionBg` | `raised` |
| `accentHover` | `good-lift` | `actionBgHover` | `line` |
| `onAccent` | `accent-ink` | `warning` | `warn` |
| | | `danger` | `ember` |

⭐ **`danger → ember`, not `danger → bad`, is how "red never touches blue"
becomes testable.** Ink's `--bad` (`#BF0A30`) measures **2.66:1** against
Ink's `--surface` — it is unreadable as text on the navy field, which is the
constraint stated as a measurement. `--ember` (`#e8705c`, published in every
reference-art root block) is the alert-on-field colour at 5.57:1. `bad` /
`red` stay in the vocabulary for the seal, the flag rule and the single
committing action — surfaces that carry white separation and land in Build B
and later. Phase 5 asserts **no `tokens.*` alias resolves to `--sx-bad`**.

New token keys the hex sweep needs (additive — no call site changes):
`tokens.color.info`, `.onField`, `.shadow`, `.scrim`, `.hatch`,
`.hatchStrong`, `.paper`, `.paperInk`, `.paperLine`; and a new
`tokens.brand = { twitch, youtube, kick }` group (see D8).

### D5 — The vocabulary: 44 roles in five tiers

**Tier 1 — published grounds (18).** Verbatim from `DESIGN-SYSTEM.md`:
`ground surface raised sunken line line-soft fg fg-dim fg-mute accent
accent-ink good warn bad info paper paper-ink paper-line`.
⚠ Where `Art Direction - Civic.dc.html` disagrees with `DESIGN-SYSTEM.md`
(`--fg-mute`: `#66799a`/`#78849a` vs `#8494b3`/`#5c6880`), **`DESIGN-SYSTEM.md`
wins** — the requirements say "at the exact values `DESIGN-SYSTEM.md`
publishes".

**Tier 1b — official colours + reference-art (4).** `field` `red` `white`
`ember`. The three official colours are exact and identical in **all three**
grounds (the flag is the flag; high-contrast does not repaint the seal).
⚠ `bad` is a *semantic role* that happens to equal the official red in Ink
and Marble — which is why `red` and `bad` are separate names, and why
high-contrast may give `bad` a legible value while `red` stays `#BF0A30`.

**Tier 2 — derived chrome (11).** `good-lift field-lift field-press
line-strong accent-wash hatch hatch-strong shadow scrim stripe-s stripe-l`.
Derivation rule: a `-lift` / `-press` step moves **away from the ground's
luminance** (lighter in Ink, darker in Marble). `stripe-s`/`stripe-l` are
percentages, not colours (see D8).

**Tier 2b — social tints (8).** `tint-amber tint-teal tint-rose tint-slate
tint-violet tint-emerald tint-sky tint-neutral` — the 1:1 target of
`tokens.palette` and therefore of the server's `NotifyRule.PaletteToken`
vocabulary. Six reuse the ground's own Tier-1 values; `tint-violet` and
`tint-emerald` are the only authored additions.

**Tier 3 — invariant platform marks (3).** `brand-twitch brand-youtube
brand-kick`. Identical in every ground; declared once in
`themes/invariant.ts` and spread into all three records, so no theme can
diverge on the flag or a third-party mark.

⚠ **Tier 2's values are not published in `DESIGN-SYSTEM.md`.** Nothing in it
is a new *hue* — each is a lightness step off a published family. The
contrast test (Phase 5) is the acceptance gate: if a proposed value fails,
move it along the same hue rather than changing the hue. Every value below
has been contrast-checked; the figures are in Phase 2's table.

### D6 — Theme-invariant groups stay plain, but their values change

Only `color` and `palette` become `var()`. `space`, `radius`, `font` sizes,
`rail`, `ratio` stay literal — and the requirements' Scale constraint means
the literals themselves change to the published scale:

- `radius`: `sm` 2px → **3px**, `md` 4px → **3px** (both keys kept; radius 3px
  everywhere)
- `space`: `xs` 4px · `sm` 6px · `md` 9px · `lg` 12px · `xl` 16px · **new**
  `xxl` 22px (currently rem: 2.4/4/8/12/16px)
- `font`: `body` 13px · `small` 12.5px · `micro` 11.5px · `title` 14px ·
  **new** `label` 10px (engraved) · `prose` 16px (world prose) · `display`
  22px
- `ratio.focal` stays the bare number `62`

⚠ This is a visible spacing/type shift across the whole client. It is in
scope (requirements § Constraints → Scale) and it is the main reason the
build needs a browser drive, not just green tests.

### D7 — Themes: three modules, one register source, one registry

`lib/style/themes/`:

| File | Contents |
|---|---|
| `ink.ts` | `INK_THEME` — `name: 'ink'`, `ground` (hex), palette + treatments as `SX.*` |
| `marble.ts` | `MARBLE_THEME` — `name: 'marble'` |
| `highContrast.ts` | `HIGH_CONTRAST_THEME` — `name: 'high-contrast'`, **re-based on civic**: same role set, contrast-maximal values |
| `registers.ts` | `BASE_REGISTERS` **byte-unchanged** + `BASE_FONT_ROLES` gaining `display`. The single register-mapping source for all three themes |
| `invariant.ts` | `INVARIANT_GROUND` — the flag trio + the three platform marks. New, and shaped exactly like `registers.ts` (a shared table across all themes) so the hex guard needs no exception outside `themes/` |
| `index.ts` | `THEMES: Record<ThemeName, Theme>` + `pickTheme(name: unknown): Theme` (falls back to `INK_THEME`). **New.** The single place that knows there are three themes — consumed by `useStylesheet`, `useGround`, and every guard test |

`themes/default.ts` is **deleted** (`git rm`, staged by name). `default` is
retired unaliased: `pickTheme('default')` falls through to Ink like any
other unknown string, and the server refuses the word.

Each theme module composes its record as `{ ...INVARIANT_GROUND, ...BASE }`
plus tint entries that reference `BASE`'s consts, so each hex value is typed
once per file.

### D8 — Two colour sites that are not palette values

- **Platform brand marks** (`lib/templates/relayTemplate.tsx`: `#9146ff`
  `#ff0000` `#53fc18`). These are third-party marks, not theme colours — but
  the AC bans hex outside the theme modules, and an evasion is worse than a
  home. They join the vocabulary as Tier 3, identical in every ground, and
  `relayTemplate` reads `tokens.brand.*`.
- **`GutterStripe.colorForTopic`** hashes a topic family to a hue and returns
  `hsl(hue, 65%, 50%)` — the one *computed* colour in the client, with S/L
  hand-tuned "legible on the dark terminal background", i.e. theme-blind.
  Rewrite to the space-separated form `hsl(${hue} var(--sx-stripe-s)
  var(--sx-stripe-l))` so the hue stays computed and the calibration comes
  from the ground. This is why the guard permits a colour function whose
  arguments include `var(` (see Phase 5).

### D9 — Faces: four voices, seven woff2, procedure recorded

`FACE_STACKS` gains `display`; `FontRole` gains `'display'`:

```
display   'Spectral', Georgia, serif
chrome    'Public Sans', system-ui, sans-serif
narrative 'Newsreader', Georgia, serif
command   'IBM Plex Mono', 'Courier New', monospace
```

`display` maps to **no transcript topic** (like `chrome` today);
`BASE_REGISTERS` is unchanged; unmapped topics keep defaulting to `command`.
`tokens.font.family` → `FACE_STACKS.chrome`; `tokens.font.display` is new.

⚠ **No subsetting tooling or recorded procedure exists in this repo.**
Verified: no `pyftsubset` / `glyphhanger` / `fonttools` / `subfont`
reference anywhere in `docs/`, `packages/`, `tools/`, or any
`package.json`; `packages/client/` has no `scripts/` dir; the only trace is
commit `1f8fcdfa9` ("self-host Source OFL faces") whose message records the
*result*, not the method. The build must therefore establish one, and
**record it in `message-rendering.md`** so it stops being tribal knowledge.

**Procedure A (use this — no new toolchain).** All four families are OFL and
Google-hosted, and Google serves per-`unicode-range` pre-subset woff2 (the
existing 9–16 KB Source files are exactly these):

```bash
# One face at a time. A woff2-capable UA makes the API return woff2 URLs.
curl -sH 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 \
  (KHTML, like Gecko) Chrome/120 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Spectral:wght@400;500&display=swap' \
  | grep -B4 'unicode-range: U+0000-00FF'      # the `latin` block
# then curl the fonts.gstatic.com URL from that block into public/fonts/
```

This is a **one-off build-time fetch**. It does not create a runtime CDN
dependency, which is the thing `globalFonts.test.ts` guards — and the
requirements' decline of the handoff's `<link>` is about the *runtime*
request.

**Procedure B (fallback).** `pip install fonttools brotli`, then
`pyftsubset <family>.ttf --unicodes=U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD --flavor=woff2 --layout-features='*' --output-file=<name>-latin.woff2`.

⚠ **Newsreader must be requested without the `opsz` axis** — with it the
face silently fails to load and falls back to Times. Note that
`Art Direction - Civic.dc.html`'s own `<link>` *does* carry
`opsz,wght@0,6..72,400` — the reference art contains the trap
`DESIGN-SYSTEM.md` warns about. Follow `DESIGN-SYSTEM.md`.

**The seven files** (see Flag F1 — this is the one place the requirements are
silent):

```
spectral-latin.woff2            400   (headings)
spectral-500-latin.woff2        500   (engraved capitals — the design specifies 500)
public-sans-latin.woff2         400   (chrome body)
public-sans-600-latin.woff2     600   (chrome emphasis, buttons)
newsreader-latin.woff2          400   (world prose)
newsreader-italic-latin.woff2   400i  (plate captions, *emphasis*)
plex-mono-latin.woff2           400   (commands, measurements, ids)
```

Spectral 500 must be a **real face**: browsers synthesize bold only and
round 500 to 400, which loses the engraved weight. Everything else relies on
synthesis as today. The four Source woff2 are deleted; `OFL.txt` gains the
four families' copyright notices (OFL requires the notice to travel with
the font).

⚠ **The metric-mismatch note changes.** The current doc justifies
`font-display: swap` by "the Source superfamily shares metrics, so the swap
is near-imperceptible." Four unrelated families do not share metrics, so
swap will now reflow. Keep `swap` (non-blocking first paint is the stronger
property) and **replace that sentence** in `message-rendering.md` rather
than leaving a claim the build made false.

### D10 — Honest-state primitives: one component, a discriminated union

Home: `components/ui/` — the shared-primitives directory, exported from
`ui/index.ts`. Two exports.

```ts
// components/ui/Figure.tsx
export type FigureState =
  | { readonly state: "live";    readonly value: string }
  | { readonly state: "empty";   readonly reason: string }
  | { readonly state: "unwired"; readonly reason: string };

interface FigureProps {
  /** Engraved label (display voice, uppercase, tokens.font.label). */
  label: string;
  /** Which honest state this figure is in. Not optional — ever. */
  figure: FigureState;
  /** 0–1 band fill. Honored in `live` only. */
  fill?: number;
  className?: string;
}
export function Figure(props: FigureProps): React.ReactElement;

// components/ui/UnbuiltGround.tsx
/** Hatched ground + dashed border. `Figure`'s unwired state uses it;
 *  exported for whole-widget hatching (convention preference order #1:
 *  "ship the surface, hatch the value" — sometimes the whole card hatches). */
export const UnbuiltGround: StyledComponent<"div", …>;
```

⭐ **The union is the deliverable.** One component with a required
discriminated `figure` prop makes the choice unforgettable and typed: you
cannot render a figure without naming its state, `empty` cannot omit its
reason, and `unwired` has **no `value` field at all** — so "never render a
figure the server did not send" is enforced by the compiler, not by
vigilance. Three separate components would leave `<span>{n}</span>` as the
path of least resistance.

Rendering, from `Unbuilt States.dc.html` + `CONVENTIONS.md` #1:

| State | Box | Value | Band | Reason |
|---|---|---|---|---|
| `live` | 1px solid `border`, radius 3px | mono `font.title`, `color.accent` (→ `--sx-good`) | `sunken` track, `fill`-wide bar in the same colour | none |
| `empty` | same | `—` in `color.fgMuted` | empty `sunken` track | rendered, `font.micro`, `fgMuted` |
| `unwired` | `UnbuiltGround`: 1px **dashed** `border` + `repeating-linear-gradient(135deg, hatch 0 6px, transparent 6px 12px)` | `╌╌` in `color.info` | hatch band (`hatchStrong` 0 4px / `sunken` 4px 8px) | rendered |

Decisions inside the primitive:

- ⚠ **No stamp.** The reference art's `live` / `empty` / `not wired` chips
  are documentation labels for its three example cards, and the convention's
  own wording is "a reason, **not a stamp**". Shipping a stamp would be
  inventing chrome the convention argues against.
- **No `color-mix(in oklab, …)`**, which the reference art uses throughout.
  `hatch` / `hatch-strong` / `accent-wash` / `shadow` / `scrim` are
  **precomputed per ground** as plain or 8-digit hex. This keeps them
  honest per ground (a marble hatch is not an ink hatch), avoids a
  browser-support question, and makes them readable in jsdom.
- Accessibility carries the honesty to the screen reader:
  `role="group"`; `aria-label` = `` `${label}: not wired — ${reason}` `` /
  `` `${label}: none — ${reason}` `` / `` `${label}: ${value}` ``. Plus
  `data-figure-state` for the tests and for Build B.
- The four voices show up here: label in `font.display` uppercase with
  `letter-spacing: .19em`, value in `font.mono`, reason in `font.family`
  (chrome) — **two voices per card**, per the constraint.

They ship with **no consumer**. That is the accepted risk the requirements
name; the mitigation is Build B.

### D11 — The two load-bearing guards are Vitest tests in `packages/client`

The requirements ask for a justified pick. **Vitest**, because:

1. Both guards must **import the theme modules** (to iterate `THEMES` and
   compare against `GROUND_ROLES`) and one must **exercise the applier in a
   DOM**. A `tsx` static script gets the first and not the second.
2. Every `lint:*` in this repo lives in `packages/server` and is wired to
   its own CI line. A client guard as a script needs a new
   `packages/client/scripts/` dir, a `tsx` devDependency the client does
   not have, and a new CI line — three new things.
3. `pnpm test` already includes the client (`--filter='!@saxonberg/e2e' -r
   test`) and CI's `test` job already runs it, so a Vitest guard is
   **CI-gating on day one with zero wiring**.
4. There is direct precedent for a *static source* guard as a client Vitest
   test: `styles/__tests__/globalFonts.test.tsx` already reads
   `GlobalFonts.ts`, `index.html` and `main.tsx` off disk with `node:fs` and
   asserts on their text.

### D12 — One MR

One branch, one MR (`build/civic-ground` → `master`), eight commits. A stack
would not help: the client cannot compile mid-rename if the type and the
theme modules split, and the hex guard is red until the sweep lands — so
the guard commit *must* follow the sweep in the same MR. Each commit below
is individually green in the order given.

---

## Phase 1 — Four civic voices

Do fonts first: the ground phase rewrites the theme modules, and those
modules must already carry four `fontRoles`.

### Files

- `packages/client/public/fonts/` — add the seven woff2 (D9); `git rm` the
  four `source-*.woff2`; extend `OFL.txt` with the four copyright notices.
- `packages/client/src/styles/faces.ts` — four stacks
  (`display`/`chrome`/`narrative`/`command`). ⚠ Keep the old key names
  `serif`/`sans`/`mono` as aliases **only if** a call site needs them —
  `tokens.font.{sans,serif,mono}` and `MmlRenderer`'s
  `FACE_STACKS.mono` do, so keep all seven keys and document the mapping
  (`sans → chrome`, `serif → narrative`, `mono → command`). Zero call sites
  change.
- `packages/client/src/styles/GlobalFonts.ts` — seven `@font-face` blocks,
  `font-display: swap`, `body { font-family: ${FACE_STACKS.chrome} }`.
  Replace the "Source superfamily shares metrics" comment (D9).
  **Do not move the mount point.**
- `packages/client/src/lib/style/types.ts` — `FontRole` gains `'display'`;
  update its TSDoc from the three-voice to the four-voice model.
- `packages/client/src/lib/style/themes/registers.ts` —
  `BASE_FONT_ROLES.display = FACE_STACKS.display`. `BASE_REGISTERS`
  **unchanged**; add a comment that `display` maps to no topic, for the same
  reason `chrome` does not.
- `packages/client/src/components/ui/tokens.ts` — `font.family` →
  `FACE_STACKS.chrome`; add `font.display`; apply D6's size scale.

### Tests

- `styles/__tests__/globalFonts.test.tsx` — swap the three Source family
  assertions for the four civic families; the "every `src` is a same-origin
  `/fonts/*.woff2`" and "no Google/gstatic/`http(s)` font URL" assertions
  stay **verbatim** (`>= 4` becomes `>= 7`); the injection test names the
  four families; the outside-StrictMode structural test is untouched.
- **New** in the same file: assert each of the seven woff2 **exists on
  disk** (`node:fs.existsSync` against `public/fonts/`) — a declared face
  with no file is the silent fallback this guards.
- **New**: assert no client source contains `opsz` (Flag F2's minimal
  alternative for "Newsreader loads rather than falling back to Times").
- `lib/style/__tests__/registers.test.ts` + `themes.test.ts` — the role loop
  becomes `['narrative','chrome','command','display']`; assert all four
  stacks are non-empty and pairwise distinct; assert `display` appears in no
  `BASE_REGISTERS` **value**.

`git commit`: `feat(client): four civic voices — Spectral / Public Sans / Newsreader / Plex Mono`

---

## Phase 2 — The `--sx-*` ground, three themes, one colour source

The big atomic commit. Splitting it leaves the branch with two live colour
systems.

### Files

**New — `packages/client/src/styles/ground.ts`** (no hex; pure):

```ts
export const GROUND_ROLES = [ /* the 44 of D5, in tier order */ ] as const;
export type GroundRole = (typeof GROUND_ROLES)[number];
/** A theme's concrete values — one per role. Record<> is the first guard:
 *  a theme missing a role is a compile error, not a silent CSS drop. */
export type Ground = Record<GroundRole, string>;
/** The var() reference table. The ONLY place a `--sx-` name is constructed,
 *  so a typo is impossible rather than silent. */
export const SX: Record<GroundRole, string> = /* built from GROUND_ROLES */;
```

⚠ Add the warning the requirements ask for, at the declaration: *a `var()`
string is indistinguishable from any other string to TypeScript. Do not do
colour arithmetic on a token, and do not write one into a non-CSS context —
both break with no type error.*

**New — `lib/style/useGround.ts`**: `applyGround(ground)` +
`useGround()` (D1). `applyGround` is an exported function; client precedent
(`applyTreatment`, `useStylesheet`, `commandFor`, `parseMml`) covers this —
CLAUDE.md's export-discipline rule scopes to `packages/server/src/mud/`.

**New — `lib/style/themes/invariant.ts`**, **`ink.ts`**, **`marble.ts`**,
**`index.ts`**. **Delete** `themes/default.ts`.

The three grounds, contrast-checked against each ground's `--surface`:

| role | ink | marble | high-contrast |
|---|---|---|---|
| `ground` | `#071224` | `#eceae4` | `#000000` |
| `surface` | `#0d1c38` | `#f7f6f2` | `#000000` |
| `raised` | `#15274a` | `#FFFFFF` | `#1a1a1a` |
| `sunken` | `#040b17` | `#dcd9d0` | `#000000` |
| `line` | `#22355e` | `#c4c0b4` | `#ffffff` |
| `line-soft` | `#132441` | `#e0ddd4` | `#767676` |
| `line-strong` | `#35507f` | `#a8a498` | `#ffffff` |
| `fg` | `#f2f5fa` 15.49 | `#0b1830` 16.35 | `#ffffff` 21.0 |
| `fg-dim` | `#9fb0cc` 7.70 | `#42506b` 7.49 | `#e6e6e6` 16.83 |
| `fg-mute` | `#8494b3` 5.54 | `#5c6880` 5.18 | `#cccccc` 13.08 |
| `accent` | `#c9a227` 7.00 | `#8a6d1f` 4.53 | `#ffff00` 19.56 |
| `accent-ink` | `#171204` 7.72¹ | `#fffdf5` 4.81¹ | `#000000` 19.56¹ |
| `accent-wash` | `#c9a2271f` | `#8a6d1f1f` | `#000000` |
| `good` | `#4a9d8f` 5.25 | `#2f6d62` 5.57 | `#00ff00` 15.30 |
| `good-lift` | `#6bbfaf` 7.82 | `#235349` 8.07 | `#66ff99` 16.33 |
| `warn` | `#c9a227` 7.00 | `#6e5510` 6.54 | `#ffff00` 19.56 |
| `bad` | `#BF0A30` ² | `#BF0A30` 5.88 | `#ff4d4d` 6.42 |
| `info` | `#5b8fd6` 5.12 | `#002868` 12.92 | `#00ffff` 16.75 |
| `ember` | `#e8705c` 5.57 | `#BF0A30` 5.88 | `#ff4d4d` 6.42 |
| `field` | `#002868` 13.97³ | `#002868` 13.97³ | `#002868` 13.97³ |
| `field-lift` | `#16407f` 10.13³ | `#001b48` 16.80³ | `#0044aa` 8.72³ |
| `field-press` | `#001b48` 16.80³ | `#00112e` 18.8³ | `#001133` 18.62³ |
| `red` | `#BF0A30` | `#BF0A30` | `#BF0A30` |
| `white` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `paper` | `#f2ebdc` | `#f7f1e3` | `#ffffff` |
| `paper-ink` | `#2a2418` 12.97⁴ | `#2a2418` 13.67⁴ | `#000000` 21.0⁴ |
| `paper-line` | `#d8cdb4` | `#ddd3bc` | `#767676` |
| `hatch` | `#122443` | `#e6e8e8` | `#001a33` |
| `hatch-strong` | `#1b2d49` | `#a3abb5` | `#00ffff` |
| `shadow` | `#00000099` | `#0b183026` | `#000000` |
| `scrim` | `#040b17cc` | `#dcd9d0d9` | `#000000e6` |
| `stripe-s` | `65%` | `55%` | `100%` |
| `stripe-l` | `50%` | `34%` | `60%` |
| `tint-amber` | `#c9a227` | `#8a6d1f` | `#ffff00` |
| `tint-teal` | `#4a9d8f` | `#2f6d62` | `#00ffff` |
| `tint-rose` | `#e8705c` | `#BF0A30` | `#ff4d4d` |
| `tint-slate` | `#8494b3` | `#5c6880` | `#cccccc` |
| `tint-violet` | `#a89bd8` 6.73 | `#6a5db0` 5.10 | `#ff99ff` 11.25 |
| `tint-emerald` | `#6abf69` 7.47 | `#2f7d3a` 4.72 | `#00ff00` 15.30 |
| `tint-sky` | `#5b8fd6` 5.12 | `#002868` 12.92 | `#66b3ff` 9.46 |
| `tint-neutral` | `#9fb0cc` 7.70 | `#42506b` 7.49 | `#ffffff` 21.0 |

Ratios are against that ground's `--surface` unless noted.
¹ against `accent`. ² **2.66 — deliberately below floor; `bad` is exempt and
unconsumed by any `tokens.*` alias (D4).** ³ `white` against that field
step. ⁴ against `paper`. Tier 3 marks, identical everywhere:
`brand-twitch #9146ff`, `brand-youtube #ff0000`, `brand-kick #53fc18`.

**Modified**

- `lib/style/types.ts` — add `export type ThemeName = 'ink' | 'marble' |
  'high-contrast'`; `Theme['name']: ThemeName`; add `ground: Ground`;
  update the `Theme` TSDoc (three themes, and that palette values are
  `var()` references into `ground`).
- `lib/style/useStylesheet.ts` — import `pickTheme` from `themes/index`;
  delete the local copy. **This is the divergence guard**: the hook and the
  ground applier must resolve the *same* theme object or the chrome and the
  transcript can disagree.
- `components/ui/tokens.ts` — the 21 aliases + the 8 tints + the new keys as
  `SX.*` reads (D4); the size/space/radius scale (D6); the alias-crossing
  comment; **replace** the stale header comment ("The values here are the
  dark-terminal default theme… A future theme swap replaces this file's
  exports") — that is no longer how it works, and keep the "must NEVER
  hardcode hex literals" sentence, which Phase 5 finally enforces.
- `main.tsx` — `applyGround(INK_THEME.ground)` before `createRoot`.
- `App.tsx` — `useGround()` as the first line of `App()`, above the `switch`.
- `lib/style/themes/highContrast.ts` — `ground` record; palette + treatments
  to `SX.*`.

**`Stylesheet.ts` is not modified.** (D2)

### Tests (updated, not new — the new guards are Phase 5)

⚠ These break on the `var()` change and must be rewritten, not deleted:

- `lib/style/__tests__/Stylesheet.test.ts` — `channelColor('gossip')`
  `'#c8b76a'` → `'var(--sx-tint-amber)'`; `channelColor('trade')` →
  `'var(--sx-tint-sky)'`; `palette.link` `'#4ec9b0'` →
  `'var(--sx-good)'`; the hc `palette.link` assertion likewise;
  `mention` `fg` assertions → `'var(--sx-accent)'` /
  `'var(--sx-tint-violet)'`; `themeName` `'default'` → `'ink'`. The
  overlay-wins test keeps its literal `'#ff00ff'` — a player-typed value is
  still a raw string and that is the point.
- `components/__tests__/MmlRenderer.test.tsx:271,286` —
  `getComputedStyle(span).color` `'rgb(215, 186, 125)'` →
  `'var(--sx-tint-amber)'` / `'var(--sx-tint-rose)'`. jsdom returns the
  unresolved string (measured); keep the comment explaining why, because the
  next reader will assume it is a bug.
- `lib/style/__tests__/themes.test.ts` — `palette.fg` `'#ffffff'` →
  `'var(--sx-fg)'`; add `expect(HIGH_CONTRAST_THEME.ground.fg).toBe('#ffffff')`
  so the *value* assertion survives, one layer down.

`git commit`: `feat(client): the --sx-* custom-property colour ground + Ink / Marble / civic high-contrast`

---

## Phase 3 — The rename, as one coordinated change

The theme vocabulary is **server-owned**; a client-only rename leaves the
verb refusing a theme the client has.

### Files

- `packages/server/src/mud/obj/command/shell/StyleController.ts`
  — `KNOWN_THEMES = new Set(['ink', 'marble', 'high-contrast'])`;
  usage `'usage: cockpit style theme <ink|marble|high-contrast>'`;
  failure copy `` `unknown theme '${name}' (known: ink, marble,
  high-contrast)` ``; the cast at line 130 →
  `as 'ink' | 'marble' | 'high-contrast'`; the header comment line 8.
  ⚠ The `default:` arm of `execute` and the `STYLE_SUBS` list are about
  *subcommands*, not themes — leave them alone. No new module, no new
  helper: this is four string edits inside an existing controller.
- `packages/server/src/mud/obj/command/shell/CockpitController.ts:83` — the
  report's fallback `'default'` → `'ink'`. **Not enumerated in the
  requirements**; without it `cockpit` reports a theme name the verb
  refuses.
- `packages/server/src/mud/cmd/shell/cockpit.yaml` — line 34-35 example →
  `cockpit style theme marble` / "Switch to the Marble (light) ground";
  line 207 usage → `cockpit style theme <ink|marble|high-contrast>`;
  line 221-222 example → same as 34-35. (Line 13's summary needs no change.)
- `packages/types/src/index.ts:2482` — the `StyleOverlay` doc comment's
  `theme` row → `` `'ink' | 'marble' | 'high-contrast'` ``. Doc-only; the
  type is `Record<string, …>`. (`packages/types/dist/` is gitignored —
  nothing to rebuild.)

### Tests

- `packages/server/src/mud/obj/command/shell/__tests__/StyleController.test.ts`
  — existing `'high-contrast'` cases still pass; **add** `ink` accepted,
  `marble` accepted, and ⭐ **`default` refused** with a
  `controller-rejected` note of reason `'unknown-theme'` whose detail names
  all three known themes.
- `packages/server/src/mud/api/__tests__/cockpit-verb.test.ts` and
  `applyInputMode.test.ts` bind `cockpit style theme high-contrast` — still
  valid, no change.

Run: `pnpm --filter @saxonberg/server test src/mud/obj/command/shell/__tests__/StyleController.test.ts src/mud/api/__tests__/cockpit-verb.test.ts`
— ⚠ `pnpm test:near` maps a changed non-test file to its **sibling
`__tests__` dir**, and `mud/cmd/shell/` has none, so the YAML edit selects
nothing. Name the files.

`git commit`: `feat(shell): rename the theme vocabulary to ink / marble / high-contrast`

---

## Phase 4 — Sweep the remaining hex literals onto tokens

Mechanical; every site is a value substitution. The complete list, measured:

| File | Sites |
|---|---|
| `components/MmlRenderer.tsx` | **18 literals over 17 lines** (153, 160, 165, 227, 250, 262, 271, 272, 276, 281×2, 298, 301, 316, 323, 328, 339, 345) **+ the `rgba()` at 283** → `accentWash`. Also `paletteFor`'s `tokens.palette[…]` reads now return `var()` strings — no code change, but re-read the function to confirm |
| `components/Terminal.tsx` | 34-35 `#1e1e1e`/`#d4d4d4` → `surfaceSunken` / `fg` |
| `components/CharGenStage.tsx` | 449, 451 `#e06c75` → `danger` |
| `components/CommandBar.tsx` | 421 `#e06c75` → `danger`; 222 `'white'` → `onField`; 321 `rgba(0,0,0,.4)` → `shadow` |
| `components/StartScreen.tsx` | 66 `"#fff"` → `onField` |
| `components/frame/ReconnectBanner.tsx` | 35 `#fff` → `onField` |
| `components/embed/StreamEmbed.tsx` | 43 `#000` → `sunken` |
| `components/ui/Button.tsx` | 28 `color: white` → `onField` |
| `components/settings/SettingsPane.tsx` | 122 `color: white` → `onField` |
| `components/ViewsMenu.tsx` | 71 `rgba(0,0,0,.4)` → `shadow` |
| `components/settings/SocialNotificationsPane.tsx` | 64 `rgba(0,0,0,.5)` → `scrim` |
| `layouts/WorldLayout.tsx` | 56-57 `rgba(255,255,255,.14)` → `raised` / `lineStrong` |
| `lib/templates/chatTemplate.tsx` | 32 `'#c8b76a'` fallback → `tokens.color.fgEmphasis` |
| `lib/templates/relayTemplate.tsx` | 31-33 → `tokens.brand.{twitch,youtube,kick}` |
| `lib/templates/tellTemplate.tsx` | 4 — a **comment** mentioning `'#aaa'`; update the prose |
| `components/GutterStripe.tsx` | `colorForTopic` → `hsl(${hue} var(--sx-stripe-s) var(--sx-stripe-l))` (D8), with a comment saying the hue is computed and the calibration is the ground's |

`main.tsx:11`'s `#3601` is an issue number inside a comment — the guard's
regex must not match it (`3601` is not a 3/4/6/8-digit hex run followed by a
word boundary in a `#`-prefixed colour position; confirm with the guard, and
if it does match, anchor the regex to reject `#` followed by digits only).

### Tests

- `components/__tests__/GutterStripe.test.tsx:60` already only asserts a
  non-empty value — it survives.
- Re-run the whole client suite; the sweep is where an accidental
  regression shows.

`git commit`: `refactor(client): sweep every remaining hex literal onto the token layer`

---

## Phase 5 — The guards

Four new test files under `packages/client/src/lib/style/__tests__/`.
Each names its acceptance criterion in the header.

### 5a — `customProperties.test.ts` ⭐ *the load-bearing one*

> AC: *every `--sx-*` custom property referenced anywhere is defined by
> every theme.*

Four assertions, closing all four directions:

1. **Definition (value route).** For each `theme of Object.values(THEMES)`:
   `expect(Object.keys(theme.ground).sort()).toEqual([...GROUND_ROLES].sort())`
   and every value non-empty. (Redundant with `Record<GroundRole, string>` at
   compile time — deliberately, because the compile-time guarantee is the
   one a `// @ts-expect-error` or a cast could someday erase.)
2. **Reference (source route) — the typo guard.** Walk every
   `packages/client/src/**/*.{ts,tsx}` with `node:fs` (the
   `globalFonts.test.tsx` pattern), regex `--sx-[a-z0-9-]+`, and assert every
   captured name is in `GROUND_ROLES`. This is what catches a hand-typed
   `var(--sx-surace)` that bypassed `SX`. Exclude only
   `styles/ground.ts` (which constructs the names) and this test file.
3. **Emission (DOM route).** For each theme: `applyGround(theme.ground)`
   against a fresh `document.documentElement`, then assert
   `getComputedStyle(root).getPropertyValue('--sx-' + role)` is non-empty for
   all 44 roles. (Measured to work in jsdom.) Also assert `SX[role]` is
   exactly `` `var(--sx-${role})` `` for every role.
4. **Reverse direction — defined but unconsumed.** Collect the roles reached
   by any `tokens.*` alias, any theme `palette`/`channelDefaults` value, and
   any theme treatment `fg`/`bg`; assert the unconsumed remainder equals an
   **explicit list**: `bad`, `red`, `paper`, `paper-ink`, `paper-line`
   (+ any others the build finds). Each entry carries a one-line reason in
   the test source: `bad`/`red` are reserved for the seal / flag rule /
   committing action (D4), and the paper trio **ships because it is part of
   both published grounds even though the plate component is Wave 4** — a
   requirement, made visible instead of looking like dead code.

### 5b — `noHexLiterals.test.ts`

> AC: *no hex literal appears outside the theme modules* — making good on
> the standing, currently-unenforced `tokens.ts` comment.

Walk `packages/client/src/**/*.{ts,tsx}`. Allowed locations: **only**
`src/lib/style/themes/`. Excluded from scanning: `**/__tests__/**` (a test
may legitimately assert a value) — note the exclusion in the header so it is
a decision, not an oversight.

Banned patterns:

- `#` followed by exactly 3, 4, 6 or 8 hex digits at a word boundary,
  **excluding** all-digit runs (so `#3601` and `#12` do not trip);
- `rgb(` / `rgba(` **whose argument list contains no `var(`**;
- `hsl(` / `hsla(` **whose argument list contains no `var(`** — this is
  precisely why `GutterStripe` composes with `var()` (D8), and it closes the
  obvious evasion (rewriting `#2a2a2a` as `rgb(42,42,42)`).

⚠ Flag F9: named CSS colours (`color: white`) are not hex and would slip a
hex-only guard. Phase 4 removes both current instances; the guard **also**
bans the bare words `white` / `black` in a `color:` / `background:` /
`border*:` position outside the theme modules. Small, and it closes the
cheapest evasion.

### 5c — `contrast.test.ts`

> AC: *each ground's foreground/background pairs meet their contrast floor
> **computed against `--surface`***.

A test-local WCAG 2.1 relative-luminance + ratio pair of functions (test
file scope — not a production export, and not an Api).

- **TEXT_ROLES ≥ 4.5:1 vs that ground's `surface`**: `fg fg-dim fg-mute
  accent good good-lift warn info ember` + all eight `tint-*`.
- **On-ground pairs ≥ 4.5:1**: `white`/`field`, `white`/`field-lift`,
  `white`/`field-press`, `accent-ink`/`accent`, `paper-ink`/`paper`.
- **EXEMPT, each with its reason in source**: `bad` (2.66 in Ink — the
  red-never-touches-blue measurement; asserted unconsumed by 5a-4),
  `red`, `stripe-s`, `stripe-l` (percentages, not colours).
- **STRUCTURAL, no floor asserted**: `ground surface raised sunken line
  line-soft line-strong accent-wash hatch hatch-strong shadow scrim paper
  paper-line` + the three `brand-*`. No floor is invented for them — the AC
  is about foreground pairs, and high-contrast deliberately sets
  `ground === surface === sunken === #000000`, which any separation floor
  would fail.
- ⭐ **Totality gate**, in the repo's `lint:topics` spirit:
  `expect(new Set([...TEXT, ...ON_GROUND_flat, ...EXEMPT, ...STRUCTURAL]))
  .toEqual(new Set(GROUND_ROLES))` — a new role cannot be added without
  categorizing it.
- ⭐ **The red rule as an assertion**:
  `expect(Object.values(tokens.color)).not.toContain(SX.bad)`.

### 5d — `oneColourSource.test.ts`

> AC: *`Theme.palette` and the chrome tokens resolve through the same
> source — asserted, not just intended.*

For every value in `tokens.color`, `tokens.palette`, `tokens.brand`, and for
every theme's `palette.*`, `palette.channelDefaults.*`, and every
`topic`/`element`/`bucket`/`mention` treatment's `fg` and `bg`: assert the
string matches `/^var\(--sx-([a-z0-9-]+)\)$/` and the captured role is in
`GROUND_ROLES`. That is what "one source" means operationally — the only
colour *values* in the client are the three `ground` records.

### 5e — extend the existing `themes.test.ts`

- The non-colour-cue audit still **must** pass for `high-contrast`; `ink`
  and `marble` inherit `default`'s existing exemption from the strict audit
  (unchanged posture, renamed subject — say so in the comment).
- `name` assertions → `'ink'` / `'marble'` / `'high-contrast'`.
- The "element / topic rules stay empty" invariant holds for `ink` and
  `marble` (the ground is not a topic rule).
- Register mapping identical across **all three** themes:
  `expect(MARBLE_THEME.registers).toEqual(INK_THEME.registers)` and the same
  for `fontRoles` and for high-contrast — the single-source claim, now over
  three consumers.

`git commit`: `test(client): guard the custom-property layer — every --sx-* defined by every theme, no hex outside the theme modules, contrast against --surface`

---

## Phase 6 — The honest-state primitives

### Files

- **New** `components/ui/UnbuiltGround.tsx` — the hatch + dashed styled
  wrapper (D10), reading `tokens.color.hatch` / `.border` / `.radius`.
- **New** `components/ui/Figure.tsx` — `FigureState`, `Figure` (D10).
- `components/ui/index.ts` — export `Figure`, `UnbuiltGround`, and
  `type FigureState`; extend the file's header comment to name the honesty
  convention and point at `CONVENTIONS.md` #1.

⚠ These ship with **no consumer**. Do not wire them into any surface —
applying the honest states to a surface is explicitly a non-goal, and Build
B (the shelf, whose catalogue is mostly not-wired) is their first consumer.

### Tests — `components/ui/__tests__/Figure.test.tsx`

> AC: *the three states are primitives, visually distinct, each covered by a
> test — including that the not-wired state renders `╌╌` and **no** number,
> and that the empty state renders `—` **plus a reason**.*

1. `live` renders the value text and **no** `╌╌`, **no** `—`.
2. `empty` renders `—` **and** the reason string; renders no digit
   (`expect(container.textContent).not.toMatch(/\d/)` with a
   digit-free label).
3. `unwired` renders `╌╌`, **renders the reason**, and renders **no digit** —
   the AC's "no number", asserted as the absence of any digit rather than the
   absence of one specific value.
4. **Visually distinct**: the three states' rendered root elements carry
   three different `data-figure-state` values and three different resolved
   `border-style` / `background-image` shapes. ⚠ Assert on
   `data-figure-state` and on the presence of `repeating-linear-gradient` /
   `dashed` in the emitted styled-components CSS — **not** on resolved
   colours, which jsdom leaves as `var()` strings (measured).
5. Accessibility: each state's `aria-label` contains the label and, for
   `empty`/`unwired`, the reason; `unwired`'s contains "not wired".
6. **Type-level**: a `// @ts-expect-error` line proving
   `{ state: 'unwired', value: '31' }` does not compile — the union *is* the
   deliverable, so the compiler's refusal is part of the test surface.

Also run, unmodified, and confirm green:
`packages/server/src/mud/obj/__tests__/Avatar.standing.test.ts` — the S1
guard forbidding subscribable field names matching
`/trait|disposition|personality/i`. Do not touch that file.

`git commit`: `feat(client): the honest-state primitives — Figure (live / empty / not-wired) + UnbuiltGround`

---

## Phase 7 — Driven, not just green

> ⚠ AC: *theme switching is verified by **driving a browser** — all three
> themes, chrome and transcript — not by the suite alone. Controller tests
> skip the binder, so `cockpit style theme` is exercised as a typed command
> against a running server.*

Two artifacts, because the criterion has two halves.

**7a — `e2e/tests/theme.spec.ts`** (the durable half). Follow
`cockpit.spec.ts`'s shape: `openWorldAs(browser, 'theme')` + `runCommand`.

```
for name of ['ink', 'marble', 'high-contrast']:
  runCommand(page, `cockpit style theme ${name}`)
  # chrome repainted, from the real cascade — a live browser DOES substitute var()
  expect(page.evaluate(() => getComputedStyle(document.documentElement)
          .getPropertyValue('--sx-ground').trim())).toBe(<that ground's hex>)
  # transcript repainted through the same theme object
  expect(<a transcript row>).toHaveCSS('color', <rgb of that ground's fg>)
  # no reconnect: the connection indicator never appears
runCommand(page, 'cockpit style theme default')
expect(<last transcript line>).toContainText('unknown theme')
expect(<last transcript line>).toContainText('ink, marble, high-contrast')
# and the ground did not move
```

⚠ `pnpm test` excludes `@saxonberg/e2e`; run it explicitly with `pnpm e2e`
(it has its own CI stage). Server + client must be up.

**7b — the manual drive** (the acceptance half). With `pnpm dev` running,
drive Chrome and *look at it*, in all three themes:
the start screen · char-gen · the in-world frame · a transcript with a
`say` (serif), a `look` (serif), and a command echo (mono) · the inspection
pane · the settings pane · the CMS editor · `<pre>`/`<code>` · the command
bar · a `<color value="purple">` span · the reconnect banner. Confirm: two
voices per surface never three; no unstyled flash on load (the
pre-render `applyGround`); the transcript never alternates grounds down the
feed; Spectral 500 is a real face, not a synthesized 400.

`git commit`: `test(e2e): drive all three themes through cockpit style theme`

---

## Phase 8 — Docs

### `docs/subsystems/message-rendering.md`

- **§ Stylesheet engine** — one sentence: the cascade is unchanged
  (`theme → user overlay → plain-mode`); the custom-property ground sits
  *below* it as the resolution substrate, not as a fourth step; a
  `Treatment` keeps its fixed key set and no raw CSS reaches the engine.
- **§ Themes** — rewrite. Three themes: `ink` (dark, default), `marble`
  (light), `high-contrast` (accessibility, re-based on civic). `default` is
  retired unaliased. Then the new subsection **"The custom-property colour
  layer"**: `styles/ground.ts` (the 44-role vocabulary, `Ground`, `SX`), the
  `ground` record per theme, `applyGround`/`useGround`, ⚠ **why the emitter
  is imperative rather than a second `createGlobalStyle`** (#3601), the
  one-source claim, the silent-failure mode, and the four guards with the
  ⭐ on 5a. Include the D4 alias table and the `danger → ember` /
  red-never-touches-blue measurement.
- **§ Font-by-register typography** — four roles; `display` maps to no
  topic, for the same reason `chrome` does not; the four faces + the
  seven-file weight cut; ⚠ **the metric-mismatch note replacing the
  "Source shares metrics" claim**; and the **subsetting procedure** (D9,
  both A and B) so the next face swap is not a rediscovery. Keep the
  self-hosting / no-CDN paragraph and the `GlobalFonts`-outside-StrictMode
  paragraph verbatim. ⚠ **Also fix the stale mapping prose**: this section
  still says `world.*` → narrative and `system.*` → command, roots that died
  in the S2 corpus replacement. `BASE_REGISTERS` keys the current seven.
- **§ The user overlay → Selector vocabulary** — the `theme` row becomes
  `'ink' | 'marble' | 'high-contrast'`.
- **§ `cockpit style`** — the `theme <name>` row likewise.
- **§ Acceptance shape (Wave 1)** — "two themes (default + high-contrast)"
  → three, named.

### `docs/subsystems/client-shell.md`

⚠ Not named by the requirements, and the primitives have no natural home in
`message-rendering.md`. A short new § **"The honest-state primitives"** here
is the honest choice — this doc already owns "client front door: frame
primitives". Content: the three states, the `FigureState` union and why it is
a union, the token set (`hatch` / `hatchStrong` / `info` / `fgMuted`), the
no-stamp and no-`color-mix` decisions, the two carve-outs (prose never
hedges; commands refuse honestly), and the ⚠ that Build A ships them with no
consumer and Build B is the first. Flagged as F10 — cut it if the user
prefers the requirements' literal doc list.

### `docs/slates/builds/client-slate.md`

- § 5's `styles/faces.ts` row → shipped (four faces, `display` role).
- § 5's "The VS Code dark palette" row → shipped (the `--sx-*` ground).
- § 7 wave table + § 7.1 — mark **Build A shipped**; the A/B/C cut is
  already recorded there, so this is a status edit, not new prose.
- § 8 **open question 5 → closed by precedent** (self-hosted subsets;
  the handoff's `<link>` declined; four subsets generated by this build,
  procedure recorded in `message-rendering.md`).

### Not touched

`CLAUDE.md`, `docs/workflow.md`, `roadmap.md`, `launch-worklist.md` — index
files, swept, not raced (CLAUDE.md § Worktrees rule 5). The
`docs/design_handoff/` files are reference art and are **not** edited even
where the tree now disagrees with them (the `opsz` `<link>`, the `--fg-mute`
divergence) — the requirements' framing is "decisions live here and pixels
stay there".

`git commit`: `docs(message-rendering): the civic ground — four voices, three themes, the custom-property colour layer`

---

## Ordering, and the test cadence

Work top to bottom; each phase leaves the branch green.

```
1 fonts  →  2 ground + themes  →  3 rename  →  4 hex sweep
        →  5 guards  →  6 primitives  →  7 driven  →  8 docs
```

Why this order and not another:

- **Fonts before ground** — the ground phase rewrites the theme modules, and
  they must already carry four `fontRoles`.
- **Ground before rename** — between the two the server still writes
  `'default'`, which `pickTheme` falls through to Ink. Harmless. The reverse
  order is not: the verb would accept `ink` before a theme called `ink`
  exists.
- **Sweep before guards** — 5b is red until the last hex is gone. A guard
  committed before its sweep is a knowingly-red commit.
- **Guards before primitives** — the primitives are new code that must be
  born compliant.
- **Driven after everything** — the e2e spec exercises the finished cascade.

### Test cadence

⚠ **`pnpm test:near` is server-only** (`packages/server/scripts/test-near.ts`),
so on a build that is ~90% client it selects almost nothing. The mid-build
loop is therefore:

```bash
pnpm --filter @saxonberg/client test          # the whole client suite; fast, jsdom
pnpm --filter @saxonberg/client test src/lib/style   # tighter, during phases 2 & 5
pnpm test:near                                # after Phase 3 (the server edit)
pnpm --filter @saxonberg/server test \
  src/mud/obj/command/shell/__tests__/StyleController.test.ts \
  src/mud/api/__tests__/cockpit-verb.test.ts  # named, because the YAML edit selects nothing
```

**`pnpm test` exactly once**, after Phase 8, before opening the MR. Then
`pnpm lint`, then `pnpm e2e` (its own stage; not in `pnpm test`).

### Worktree discipline

`./tools/wt-status` **first**, before touching a file. Stage by name — never
`git add -A`. Phase 1 and Phase 2 each delete files (four woff2;
`themes/default.ts`) — that is 5 deletions, under the hook's ten-file
threshold, so no `SAXONBERG_ALLOW=1` is needed; if a later phase pushes past
ten, stop and check why rather than setting the flag. **Push every turn.**
Merge only through the GitLab MR.

### The MR

One MR, `build/civic-ground` → `master`:
`feat(client): civic ground — theme-aware colour, both grounds, four voices, honest-state primitives`.
Body: the eight commits, the four guards and what each closes, the browser-drive
checklist from 7b, and the flag list below as open review questions.

---

## ⚠ Flags — underspecified, or unimplementable as written

Nothing below is silently substituted. F2 and F3 are the two ACs that cannot
be satisfied literally; each has a minimal alternative. **F2 and F3 have been
folded back into the requirements doc**; the rest stand as review questions.

| # | Flag | Minimal alternative / decision needed |
|---|---|---|
| **F1** | **Font weights are unspecified.** `DESIGN-SYSTEM.md`'s `<link>` requests 14 face/weight combinations; the existing arrangement ships regular-only and synthesizes bold. | Plan proposes **7 files** (D9). Spectral **500 must be real** — browsers synthesize bold only and round 500 to 400, losing the engraved weight. Sign off or amend before Phase 1. |
| **F2** | ⚠ **AC "Newsreader loads rather than falling back to Times, asserting the `opsz`-free request" is unimplementable as written** — under self-hosting there is no request tuple to assert. (The requirements decline the `<link>` in the same document.) | Two assertions instead: (a) no client source contains `opsz`; (b) `public/fonts/newsreader-latin.woff2` exists on disk and is named by a `@font-face` block. ⚠ Note that `Art Direction - Civic.dc.html`'s own `<link>` **does** carry `opsz` — the reference art contains the trap. **Requirements updated.** |
| **F3** | ⚠ **AC "Register behaviour is unchanged: `world.*` → narrative, `system.*` / `shell.diagnostic.*` → command" quotes prefixes that are not in the shipped table.** `BASE_REGISTERS` keys the seven topic **roots** (`speech act sense self publication` → narrative; `shell session` → command); there is no `world` or `system` key. The AC's wording tracks an older revision of `message-rendering.md`, whose § "Font-by-register typography" still says `world.*`. | Assert the *shipped* mapping unchanged (`BASE_REGISTERS` byte-identical across all three themes) + unmapped → `command` + `display` in no value. **Also fix the stale prose in `message-rendering.md`** while updating that section. **Requirements updated.** |
| **F4** | **Palette conflict between the design docs.** `--fg-mute`: `DESIGN-SYSTEM.md` says `#8494b3` (ink) / `#5c6880` (marble); `Art Direction - Civic.dc.html` says `#66799a` / `#78849a`. | `DESIGN-SYSTEM.md` wins — the requirements say "at the exact values `DESIGN-SYSTEM.md` publishes". Recorded, not silently resolved. |
| **F5** | **`--ember` is published in every reference-art root block but not in `DESIGN-SYSTEM.md`'s palette listing, and Marble has no ember value.** It is load-bearing: Ink's `--bad` measures **2.66:1** against Ink's `--surface`. | Ink `#e8705c` (5.57, from the reference art); **Marble `#BF0A30`** — Old Glory Red is legitimate on a marble ground, because the red-never-touches-blue rule is about red against the *blue field*, which Marble does not have; high-contrast `#ff4d4d` (6.42). Zero invention in two of three cells. |
| **F6** | **Tier-2 derived values are not published anywhere.** 11 roles × 3 grounds. | Every proposed value in Phase 2's table is contrast-checked and no value introduces a new hue. The contrast test is the gate: on failure, move along the same hue. |
| **F7** | **`pnpm test:near` is server-only**, so the brief's mid-build loop selects nothing on this build. | The commands in § Test cadence. `pnpm test` still runs **once**. |
| **F8** | **Three existing test files assert concrete colour values** and break on the `var()` change — they are not deletable, they are the tests that prove the palette. | Rewritten in Phase 2, enumerated there. Root cause is new information: **jsdom does not substitute `var()`** (measured). |
| **F9** | **A hex-only guard has three evasions**: `rgb()`, `hsl()`, and named colours (`color: white`, two live instances). | The guard bans hex + `rgb(`/`hsl(` **without** a `var(` argument + bare `white`/`black` in a colour position. Needs a nod that the guard is wider than the AC's letter. The `var(`-argument carve exists for exactly one site (`GutterStripe`, D8) and is a pattern permission, not a file allowlist. |
| **F10** | **The honest-state primitives have no doc home in the requirements' list** (which names only `message-rendering.md` + the slate). | A short § in `docs/subsystems/client-shell.md` (Phase 8). Cut it if the literal list is preferred — but then the primitives ship undocumented as well as unconsumed. |
| **F11** | **The Scale constraint changes `space` (rem → 4/6/9/12/16/22px) and the type scale across the whole client** — a visible layout shift at ~1468 sites' neighbours, with no test that can see it. | In scope (requirements § Constraints → Scale). This is the strongest reason the browser drive (7b) is an acceptance step and not a formality. |
| **F12** | **Two `tokens.color` aliases cross over**: `fgEmphasis → --sx-accent` (was the gold) and `accent → --sx-good` (was the teal). Confusing on first read. | Kept, because zero call sites may change. Documented in a comment block at the top of `tokens.ts` and in `message-rendering.md`'s alias table. |

**Not planned, deliberately:** no new server module, no new server exported
helper, no new `eslint-disable no-restricted-syntax`, no new module
category. The server side of this build is four string edits in
`StyleController.ts`, one in `CockpitController.ts`, four in `cockpit.yaml`
and one doc comment in `packages/types`. If anything during the build seems
to need a new server module or a new exported free function, **stop and get
sign-off** — the lint failing is the intended tripwire.

---

## Critical files

- `packages/client/src/components/ui/tokens.ts`
- `packages/client/src/lib/style/types.ts`
- `packages/client/src/lib/style/themes/registers.ts`
- `packages/client/src/styles/GlobalFonts.ts`
- `packages/server/src/mud/obj/command/shell/StyleController.ts`
