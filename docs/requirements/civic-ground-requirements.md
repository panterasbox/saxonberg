# Civic ground — requirements

**Build A of three** in client-rebuild Wave 1 (Foundation). The ground
every later surface stands on, and deliberately **zero features**: after
this build the client looks civic, both grounds switch, four voices are
self-hosted, and a surface has a vocabulary for admitting it has no data.

Seeded by [client-slate § 7 Wave 1](../slates/builds/client-slate.md).
Design surface: `docs/design_handoff/DESIGN-SYSTEM.md`,
`CONVENTIONS.md`, `Art Direction - Civic.dc.html`,
`Unbuilt States.dc.html` — **reference art**, not diffable, so decisions
live here and pixels stay there.

The Wave 1 cut, and why the boundary is here:

| Build | Ships | Status |
|---|---|---|
| **A — civic ground** | theme-aware colour, both grounds, four voices, the honest-state primitives | **this doc** |
| **B — honest chrome** | desktop top bar + shelf + status bar, and its server work | next |
| **C — chrome on a phone** | the mobile inversion | after B |

Build A is separated because it is the only piece with **no feature
surface at all** — it is the substrate B, C and Wave 2 Arrival each need,
and Arrival needs the honest-state primitives specifically (character
select renders per-character figures: MR C shipped `lastSeen`, play
standing, last location and practice per roster entry).

## Goals

- **Chrome colour resolves from the active theme at render time.** No
  component names a colour literal, and the two colour systems that exist
  today become one: the switchable `Theme.palette` (transcript only) and
  the static `components/ui/tokens.ts` (read by 52 files) resolve through
  the same source.
- **Both grounds ship selectable** — Ink (dark, default) and Marble
  (light), at the exact values `DESIGN-SYSTEM.md` publishes.
- **`high-contrast` survives, re-based on civic**, still legible with the
  colour channel removed.
- **Four voices, self-hosted**: Spectral (engraved display) · Public Sans
  (chrome) · Newsreader (world prose) · IBM Plex Mono (command), from one
  face-stack source, with `FontRole` carrying a fourth `display` member.
- **The theme vocabulary is `ink` / `marble` / `high-contrast`** across the
  client types, the server verb, and the YAML view together.
- **The three honest states are renderable primitives** — live (plain) ·
  empty (`—` plus a reason) · not-wired (hatched ground, dashed border,
  `╌╌` where the value goes) — with tokens in every ground.

## Non-goals

- **Everything in Build B**: the widget shelf, the desktop status bar,
  `GhostCommandLine`'s relocation, the read-only mode indicator, the
  `cockpit shelf` subcommand and `cockpit.shelf` key, the `self` pane
  entry, and the `PaneDefinition.fields` widening.
- **Everything in Build C**: the mobile bar, pull-down shelf, glance-line
  slot, command sheet, the dropped-connection first row, safe areas and
  tap-target rules.
- **Applying the honest states to any surface.** Build A ships the
  primitives and their tests; Build B is their first real consumer (the
  shelf, whose catalogue is mostly not-wired). ⚠ This is the one accepted
  risk in the cut — a primitive with no consumer can drift — and the
  mitigation is that B is the immediately following build, not a deferred
  one.
- **The plate component.** § 3.7's paper-mount illustration is a feed
  element and lands with the feed in Wave 4. The plate **register's
  tokens** (`paper`, `paper-ink`, `paper-line`) ship here, since they are
  part of both published grounds.
- **The mode switcher, and migrating the frame off `cockpit.layout`.**
  Wave 4. The S3 compatibility projection keeps working untouched.
- **The pane feed, hold policy, N-pane subscription set**, and the
  arrangement-recall decision (slate § 4.4 ⚠⚠). Wave 4.
- **The facet-based filter surface.** `FilterDrawer` keeps toggling topic
  paths; the facets are already resolved in the store, so this is a UI
  change waiting in Wave 4.
- **The notification tray.** Deferred, and **not shipped as a stub** —
  `NotifyPolicy` / `NotifyRule` want reading first, because what belongs
  in that surface is whatever the receiver *said* they wanted.
- **The `traits` widget — never.** `Global Chrome.dc.html` lists it; the
  psychology vocation rests on self-other asymmetry, and a pinned
  always-on readout of your own personality is the stat sheet that makes
  the therapist unnecessary. S1's guard test forbidding subscribable field
  names matching `trait|disposition|personality` stands unmodified.
- **Arrival** (front door, intake, lounge, character select, the
  account/character split) — Wave 2. **Forums, wiki, livestream** —
  Wave 6. **CMS, help, git panel** — Wave 7.
- **A tree-wide unbuilt-state audit.** Each wave classifies its own
  surfaces as it builds them.
- **Per-player frame store, durable clips, attestation** (slate § 4.3) and
  **`prompt.format` rendering** (Wave 4).

## Surface decisions

### Colour resolves through CSS custom properties; call sites do not change

The obvious reading of "make `tokens` theme-aware" is a 52-file migration.
It is not necessary. There are **1468 `tokens.*` reference sites over 44
distinct token paths, and every use is CSS-valued** — interpolated into a
styled-components template, or passed as a `$tint` / `$tone` prop into
one. Audited for the cases that would break: no inline `style={{}}`, no
SVG `fill=`/`stroke=`, no string comparison, no colour arithmetic.

So `tokens.color.*` and `tokens.palette.*` keep their exact names and
become `var(--sx-*)` strings, with each theme emitting the custom
properties. **Zero call sites change**; the work is one token module, a
custom-property emitter, and three palettes.

⚠ **The cost, which the plan must cover.** A `var()` string is
indistinguishable from any other string to TypeScript, and a typo'd or
missing custom property fails **silently** — CSS drops the declaration
and the element inherits. That is the silent-fallback failure mode this
repo has been bitten by repeatedly, so it is closed by a test rather than
by care: every `--sx-*` referenced anywhere must be defined by every
theme.

⚠ It also creates a new way to be wrong: a future call site that does
colour math, or writes a token into a non-CSS context, breaks with no
type error. Worth a note where the tokens are declared.

### Both grounds ship, because Marble is what tests the mechanism

Deferring Marble would cost no rework — with the mechanism in place a
second ground is a palette module, not a second sweep. It would cost the
verification.

**A theme-aware colour layer with exactly one theme is untested by
construction**: nothing distinguishes a component that resolves at render
time from one that read a constant at import time. Marble is the second
variant that proves the abstraction, which is also why it cannot be
"added later once we're sure" — being sure is what it provides.

### Theme vocabulary: `ink` / `marble` / `high-contrast`

`default` is retired and **not aliased**. It stops naming anything the
moment there are two grounds — the design doc calls it Ink and so should
the verb. The S2 precedent governs: no playerbase to protect, the demo
wipes nightly, and an alias keeps a dead vocabulary alive for nobody.

Three flat names, **not** a ground × contrast matrix: a 2×2 is four
palettes to author and test for one accessibility consumer, and if
high-contrast Marble is ever wanted it is a fourth name rather than a
re-architecture.

⚠ The rename moves as one change across `Theme['name']`,
`StyleController.KNOWN_THEMES`, that controller's failure copy, and the
`cmd/shell/cockpit.yaml` examples. **The theme vocabulary is
server-owned**, so a client-only rename leaves the verb refusing a theme
the client has.

### One colour source, not two

`Theme.palette` (the transcript's switchable palette) resolves onto the
same custom properties as the chrome tokens. Two independently-authored
colour tables for one product is the drift the slate's "a face swap is one
edit" claim already assumes away, and unifying them is cheapest now,
while both are being rewritten.

The stylesheet engine's contract is unaffected: a `Treatment` keeps its
small fixed key set, and no raw CSS reaches the engine.

### The fourth font role is `display`, and it is client-only

`FontRole` goes from three members to four, and stays off the wire:
`StyleTreatment` is a shared wire type with a fixed key set and **no
`font` key**, so the font indirection lives entirely in the client
`Theme.registers` / `Theme.fontRoles` pair. The server never names a
register.

Like `chrome` today, `display` maps to **no transcript topic** — it is
chrome-only (section labels, headings, wordmark, binomials). Unmapped
topics keep defaulting to `command` (mono), the conservative default that
stops an unclassified future topic from silently acquiring a voice.

### Fonts stay self-hosted; the handoff's `<link>` is declined

`DESIGN-SYSTEM.md` ships a Google Fonts `<link>`. Adopting it would be a
**regression**: `GlobalFonts.ts` already self-hosts subset OFL woff2 from
`public/fonts/`, and `globalFonts.test.ts` asserts the `src` URLs are
relative — no third-party CDN request at runtime. For a product whose
claim is that it is auditable, the existing arrangement is the answer.

**Slate open question 5 is therefore closed by precedent**, and this build
generates four new subsets rather than making an architecture choice.

Newsreader is requested **without** the `opsz` axis — with it the face
silently fails to load and falls back to Times.

### Theme-invariant token groups stay plain values

Only `color` and `palette` become custom-property references. `space`,
`radius`, the `font` size scale, `rail` and `ratio` are the same in every
ground and stay literal — `ratio.focal` in particular is a bare number
consumed by a `flex` shorthand, so wrapping it would be actively wrong.

## Constraints

- **`GlobalFonts` mounts outside `React.StrictMode`.** A
  `createGlobalStyle` under StrictMode is injected then removed by the
  simulated mount→unmount→remount and never re-added
  (styled-components #3601), so its `@font-face` block silently never
  lands. Do not move it. The same hazard applies to any new
  `createGlobalStyle` sink the custom-property emitter introduces.
- **The cascade order survives**: theme → user overlay → plain-mode
  override. Plain mode collapses treatments to identity but **never
  strips the register** — font is structural legibility, not decoration,
  and the failsafe message string stays unchanged.
- **`high-contrast`'s acceptance gate**: every coloured treatment paired
  with a non-colour cue (weight / prefix / chip / position). Legibility
  without the colour channel is the gate against colour-alone semantics.
- **Contrast is computed against `--surface`**, the tighter of each
  theme's two grounds — not against `--ground`.
- **Red never touches blue.** Every red element carries white separation;
  if it cannot, it is not brand red. Red is reserved for the seal, the
  flag rule, the single committing action per screen, and live/alert
  states. Old Glory Blue is a canton, not the whole cloth — at full
  saturation it is unreadable under dense text.
- **Scale**: radius 3px everywhere; spacing 4/6/9/12/16/22px; the
  `DESIGN-SYSTEM.md` type scale. Two voices on screen at once, never more.
- **Registers are mode-scoped, not frame-scoped.** The terminal is the one
  constant across every mode and never carries a mode's dress; do not
  alternate grounds down a feed.
- **Never render a figure the server did not send**, and never hardcode
  one, including "just for now". Both carve-outs hold: **prose never
  hedges** (a room description carries no engineering stamp — if a thing
  cannot be described yet, it is not in the room yet), and **commands
  refuse honestly** in the machine voice.
- **Server-side module categories** hold for the `StyleController` edit;
  no new free-floating helper modules. See CLAUDE.md § Module Categories.
- **Worktree discipline**: stage by name, never `git add -A`; push every
  turn. Merge only through the GitLab MR.
- **Test cadence**: `pnpm test:near` for the mid-build loop, `pnpm test`
  **once** before opening the MR.

## Acceptance criteria

**Colour**

- ⭐ A test asserts **every `--sx-*` custom property referenced anywhere is
  defined by every theme**. This is the guard against the mechanism's
  silent-failure mode and is not optional.
- All three themes are selectable end-to-end: `cockpit style theme ink`,
  `marble` and `high-contrast` each repaint chrome *and* transcript with
  no reconnect.
- `cockpit style theme default` refuses in the machine voice, naming the
  three known themes. No alias resolves it.
- A test asserts no hex literal appears outside the theme modules —
  making good on the standing "component code must NEVER hardcode hex
  literals" comment, which is currently unenforced.
- A test asserts each ground's foreground/background pairs meet their
  contrast floor **computed against `--surface`**.
- `high-contrast` still passes its non-colour-cue gate.
- `Theme.palette` and the chrome tokens resolve through the same source —
  asserted, not just intended.

**Type**

- Four faces self-hosted under `public/fonts/`; `globalFonts.test.ts`
  still asserts every `src` URL is relative — no runtime CDN request.
- Newsreader loads rather than falling back to Times, asserting the
  `opsz`-free request.
- `FontRole` has four members and all three themes supply all four
  `fontRoles` entries from the single face-stack source.
- Register behaviour is unchanged: `world.*` → narrative, `system.*` /
  `shell.diagnostic.*` → command, unmapped → command. `display` maps to
  no topic.

**Honest states**

- The three states are primitives, visually distinct, each covered by a
  test — including that the not-wired state renders `╌╌` and **no**
  number, and that the empty state renders `—` **plus a reason**.
- The S1 guard test forbidding subscribable field names matching
  `trait|disposition|personality` passes unmodified.

**Driven, not just green**

- ⚠ Theme switching is **verified by driving a browser** — all three
  themes, chrome and transcript — not by the suite alone. Controller tests
  skip the binder, so `cockpit style theme` is exercised as a typed
  command against a running server.

**Docs**

- `docs/subsystems/message-rendering.md` updated: four font roles, three
  themes, the `ink`/`marble`/`high-contrast` vocabulary, the
  custom-property colour layer and its guard test, the one-colour-source
  unification.
- `docs/slates/builds/client-slate.md`: § 7 records the A/B/C cut within
  Wave 1, and open question 5 is marked closed by precedent.

## Cross-references

**Seeding slate** — [client-slate](../slates/builds/client-slate.md)
(§ 3.1 honesty, § 3.7 registers, § 5 what is superseded, § 7 Wave 1;
open question 5)

**Design surface** — `docs/design_handoff/`: `DESIGN-SYSTEM.md`,
`CONVENTIONS.md`, `Art Direction - Civic.dc.html`,
`Unbuilt States.dc.html`

**Subsystem docs** —
[message-rendering](../subsystems/message-rendering.md) (the stylesheet
engine and its cascade, themes, font-by-register, the user overlay +
`cockpit style`),
[client-shell](../subsystems/client-shell.md) (the frame and its reserved
seams),
[cockpit](../subsystems/cockpit.md) (the one verb and its subcommands)

**Follow-on builds** — B honest chrome (desktop top bar, shelf, status
bar, `GhostCommandLine` relocation, mode indicator, and the server work:
`self` pane, `PaneDefinition.fields` widening, `cockpit shelf`);
C chrome on a phone (the mobile inversion). Then Wave 2 Arrival.
