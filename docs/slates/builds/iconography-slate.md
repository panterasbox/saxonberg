# Iconography slate — shape is identity, colour is state

> **Status: UNBUILT, and the debt is already written down in the client.**
> `components/cards/Card.tsx:94` — *"⚠ **Glyphs for now, and they are
> placeholders for a real icon set** — the shapes are the decision, the
> typeface is not."*
> **Measured 2026-10-01 at `b23bcd01d`:** no icon library in
> `packages/client/package.json`; no `src/assets/`; **two** files in the
> whole client contain inline SVG (`frame/Seal.tsx`, three 24×24 glyphs
> in `StartScreen.tsx`); `StatusBar`'s only glyph is the character `">"`.
> **Left:** the colour-is-state decision · the four branch marks · the
> ~12 chrome icons · the direction/elevation set (⭐ the minimap is
> already blocked on it) · the two-size question for the domain tier ·
> the pack-colour fork · the `icon` key on a vocabulary row
> **Size:** ⭐ **the structural tier is a small build** (4 drawn marks +
> 12 sourced + a contrast test, pointed at one surface). The domain tier
> is a separate, larger one and should not be bundled.

**Captured 2026-10-01.**

> **User: "right now its all typography and boxes, pure css. I want to
> start incorporating a lot more iconography… icons telling you what
> class of thing it is at a glance would be valueable along with the
> description."**

---

## 0. ⚠ A correction, recorded because the reason was a real rule

The first pass asserted icons must be **monochrome**, citing
`components/ui/tokens.ts`'s warning about theme tokens in non-CSS
contexts. **That was wrong, and `Seal.tsx` — the one piece of real
artwork in the client — is already multicolour with four token-coloured
classes.** The actual rule is stated in its own docstring:

> *"`tokens.color.*` are `var(--sx-…)` strings, and a `var()` in an SVG
> **presentation attribute** (`fill="…"`) does not resolve — it silently
> paints nothing. So every colour here is applied through a CSS rule on
> a class, which is a real CSS-valued position."*

> ⭐ **The constraint is `fill:` versus `fill=` — where the colour goes,
> not how many there are.** An icon may carry as many colours as it has
> classes. *A syntax hazard was promoted to a design law; the lesson is
> the general one — a warning's scope is part of the warning.*

## 1. The three jobs an icon can do — and only two are ours

Conflating these is how icon sets go bad.

| job | the vocabulary | icon carries |
|---|---|---|
| **classification** — *what kind of thing is this* | ⭐ **closed and tiny** — the four Stuff branches | a *type* |
| **affordance** — *what can I do with it* | semi-closed | an *action* |
| **compression** — *which interfaces does this compose* | ⛔ **open, unbounded, third-party** | a *name* |

### ⛔ The measurement that settles compression

| | count |
|---|---|
| kernel mixins in the `Mixins` registry (`lib/mixin.ts`) | **191** |
| capability-pack files declaring `_mixinName` | **51** |
| `lib/` subsystem directories (a per-family fallback) | **~95** |

Pack mixins register at discovery and are nameable by `requires:` like
any other, so **the vocabulary is extensible by third parties.** An icon
per mixin is a multi-month commission for a set a pack extends next week,
and per-subsystem families do not reduce it.

> ⭐⭐⭐ **The pattern that works is the one VS Code uses: IntelliSense
> has no icon per symbol, it has ~20 `CompletionItemKind` icons.** An
> open vocabulary of *names* under a closed vocabulary of *kinds*.
>
> **Icon the KIND. Label the NAME.**

⚠ **So the mixin chip row does not get icons instead of words.** Its own
doc says its job is *"to show a player the composition palette they would
author with"* — and the word is the right affordance for that, because
**the word is the thing you would type.** Replacing `Flammable` with a
flame does not help anybody author with it. What the row wants is a
**leading kind glyph** plus a tighter chip, not a substitution.

⭐ **One reversal, and it is instructive.** In the **studio** the verdict
flips: `cms/studio/ComposerView.tsx` already carries text-glyph
`IconButton`s, and an author there is picking from 242 mixins, where a
kind glyph is a **filter affordance** — exactly VS Code's job. **Same
glyph set, opposite verdict, because the surface's job is different** —
which is a reason to build the kind vocabulary even though the play
surface's chip row will not consume it.

## 2. ⭐⭐⭐ Colour is STATE; shape is identity

### What already exists

`styles/ground.ts` **`GROUND_ROLES` Tier 2b — social tints**:
`amber · teal · rose · slate · violet · emerald · sky · neutral`. Eight
hues, present in **all three themes**, with contrast ratios annotated in
source (`6.73 · 7.47 · 9.46 · 11.25 · 15.30 · 21.00`).

⭐⭐ **And `highContrast` keeps them hue-distinct rather than flattening
them** — `#ffff00 · #00ffff · #ff4d4d · #00ff00 · #66b3ff`. The
accessibility theme maximises contrast *per hue*; it does not collapse
the palette. **A theme-aware, contrast-tested, eight-way categorical ramp
exists and passes the gates today.** Nothing needs inventing.

### ⚠ The real constraint

In `ink`, **five of the eight tints are aliases of semantic roles**, and
the source says so:

```
"tint-amber":   "#c9a227",  // = accent
"tint-teal":    "#4a9d8f",  // = good
"tint-rose":    "#e8705c",  // = ember
"tint-sky":     "#5b8fd6",  // = info
"tint-neutral": "#9fb0cc",  // = fg-dim
```

> **A rose icon and an `ember` danger state are the same pixel value in
> the shipped theme.** Not hypothetical, and not avoidable by picking
> other colours — only so many hues clear contrast on a navy ground, and
> the semantic roles already claimed them.

`tokens.ts` adds that red/`bad` is *"reserved for the seal, the flag rule
and the single committing action per screen"*, and `warning`/`info` are
*"narrow, high-meaning state only… **not for general decoration**."*

⭐⭐ **So the icon palette is a vocabulary-design problem, not an
art-sourcing problem:** every colour an icon spends is a meaning it
either reuses honestly or counterfeits.

### ⭐⭐⭐ The codebase already hit this wall, and reached for a glyph

`themes/highContrast.ts`:

```ts
friend: { fg: SX["tint-emerald"], weight: "bold", prefix: "+" }
```

against `ink`'s `friend: { fg: tint-emerald, weight: "bold" }` — **no
prefix.** The high-contrast theme adds a *character* because at that
contrast colour alone stopped carrying the distinction.

> **Meaning in shape, colour as accelerant, is already implemented in one
> place — and the thing it reached for was a glyph channel.** Icons are
> not a new idea in this client; they are the generalisation of a move it
> already made under pressure.

### The decision

| axis | verdict |
|---|---|
| colour **by branch** (4 hues for Location/Agent/Thing/Idea) | ⚠ weak — spends 4 of 8 tints on the *least* informative axis; once you have read the shape you know the branch |
| colour **by family/subsystem** | ⚠ does not close — ~95 subsystems do not reduce to 8 hues, and it collides with reserved meanings hardest |
| ⭐⭐⭐ colour **by STATE** — shape says *what*, colour says *how it is right now* | **the spine of this slate** |

State is what **changes**, and what a player needs at a glance: lit/unlit
· fresh/spoiling · powered/severed · open/locked · published/draft ·
discovered/unexplored · dormant/live. Shape alone cannot express it
without doubling the asset count.

⭐⭐ **And we already have a pervasive state vocabulary with no visual
form:** `SupplyState`'s six words, the freshness bands, `Light.signalAt`,
the competence bands, `Figure`'s live/empty/unwired. **That is the gap
multicolour fills.**

> ⭐⭐⭐ **It dissolves the reserved-colour problem rather than working
> around it.** `ember` on a spoiling-food icon is not counterfeiting
> ember's meaning — **it IS ember's meaning.** `warn` on an unmaintained
> structure is `warn` used correctly. **The moment colour encodes state
> rather than category, the reserved semantic palette stops being a
> constraint and becomes the palette** — leaving the eight tints free for
> the genuinely categorical work they were cut for.

## 3. Where the wins are, ranked, with the evidence

1. ⭐⭐⭐ **Contents lists — the most-read surface in the game.**
   `CardBodies.HereList` caps at `HERE_SHOWN = 5` and renders bare
   clickable names. A kind glyph per row lets a player scan *three
   people, two things, a door* without reading a word. **The vocabulary
   is four**, the branch predicates shipped on `Stuff` (MR !310),
   `StuffKind` is already on the wire and already dispatched on at
   `CardBodies:1337`. Four icons, enormous reach, **zero vocabulary
   risk.**
2. ⭐⭐ **The minimap is already blocked on this.**
   [map-slate](./map-slate.md) specced *up/down as a corner glyph per
   cell* plus a compass rose for the zone navigation card.
   **Iconography is on the critical path for a planned build**, and
   directions are the one family whose shapes are already universal.
3. ⭐ **Card controls** — refresh · pin · close. The documented debt, and
   the smallest possible fix. `Card.tsx:110` also notes they *"read as
   BUTTONS, not as faint marks."*
4. ⭐ **`WornList`** — slot marks (head/torso/hand). An ordered-by-layer
   list where position *is* the information.
5. **Reading channels** — **32** `idea/reading/*` rows today. A natural
   icon surface, and a **row-extensible** set, which makes it the proving
   ground for the content tier (§ 5).
6. **The mixin rail**, as a leading glyph. `MIXIN_LINE = 3` — *"three is
   what fits at 360px with the longest names in the shipped set."*
   ⭐ Knock-on: `PLUMBING` demotion exists only because *"two of the three
   visible slots on a teaching surface were spent on machinery"*, and the
   doc notes hiding it would be *"the client editing a server fact."*
   **Relieve the pressure and plumbing can be dimmed instead of demoted,
   which is strictly more honest.**
7. **`+N more` is text.** A count badge or stacked glyph on the caps
   (`HERE_SHOWN`, the mixin overflow) is cheap and reads instantly.

## 4. ⚠ Four hard boundaries

1. ⭐⭐ **The transcript is off limits, and the line already exists in
   code.** `themes/registers.ts`: `chrome` and `display` are
   *"intentionally NOT mapped to any transcript topic."* **Icons belong
   to the chrome.** Glyphs in the world's prose is the single most
   immersion-damaging move available; the boundary is architectural, not
   a matter of taste.
2. ⚠⚠ **An icon must never encode quality**, and colour makes the
   temptation far stronger than shape did. A dim grey mark on somebody's
   content *says* this is lesser. Per
   [feedback-slate](./feedback-slate.md) and **B4**: a colour that means
   *well-rated* is **a gauge**.
3. **Every icon surface degrades to the word.** Already the client's
   instinct — `CardBodies:634`: *"a missing asset is not information; **a
   broken icon claims something failed**."* And the generalisation:
   ⭐ **an icon is a claim.** If `Detailed` gets a magnifying glass and
   `Perceiver` gets an eye, players learn a taxonomy nobody designed — so
   the mark needs a **naming authority**, and the honest one is whoever
   owns the vocabulary row. *The kernel ships the mechanism; the row
   carries the mark.*
4. ⛔⛔ **A third-party pack cannot introduce a colour.**
   `lib/style/__tests__/noHexLiterals.test.ts` permits colour values
   **only** in `src/lib/style/themes/` — hex, `rgb()`, `hsl()` *and named
   CSS colours*, with one carve-out for a colour function composing a
   `var(`. So a pack-supplied icon either uses existing tokens or is a
   raster outside the theme system, **which is a visible second class of
   asset.** This is § 7 Q2 and it should be decided before anything
   ships.

## 5. The asset strategy — four tiers

| tier | count | shape source | colour | delivery |
|---|---|---|---|---|
| **structural** | ~15 | ⭐ **drawn** — the four branch marks encode *our* ontology and no existing set has "an Idea" | `fg` / `fgDim` / `accent` | inline React in `ui/icons/`, token classes (the `Seal` pattern) |
| **state overlay** | ~8 | a dot · ring · corner tick — **not a separate icon** | ⭐⭐⭐ the **semantic** roles, for their actual meanings | a class on the structural icon |
| **domain** | ~150, ⚠ **two sizes** | an open set + **game-icons.net** for the RPG nouns | the eight **tints**, categorically | one SVG symbol sheet, `<use>` — one request, cacheable |
| **content** | open | ⚠ the author supplies it | ⛔ constrained — see § 4.4 | an `icon` key on the row → `mediaUrl()` |

⭐⭐ **The content tier needs no new substrate.**
[media.md](../../subsystems/media.md) already does *server emits a
bucket-relative key → client prepends the base* via
`config.ts`'s `mediaUrl()`, with `MediaAsset` carrying provenance. **An
icon is a small illustration with different render rules; the addressing
is solved and only the delivery differs.**

### ⚠⚠ The size problem is the real sourcing risk

**game-icons.net covers our nouns** — anvil, skep, retort, ore cart,
things no general UI set will ever draw — **but it is drawn as 512px
silhouettes.** At 16–20px those are mud. So the domain tier is a
**two-size system**: detailed art for card headers and inspection,
simplified marks for list rows. That roughly **doubles** the domain
tier's cost and is the thing most likely to derail a naive adoption.

### Candidate sources

⚠ **Licences below are from memory and were NOT verified in this
session — read them before adoption.**

| set | shape | fit |
|---|---|---|
| **Lucide** (ISC, ~1600, 24px stroke) | Feather's successor | the default-correct answer for **chrome affordances** |
| **Phosphor** (MIT, ~9000, six weights) | the weights matter — we need a dim state and an emphasis state | strong second |
| **Tabler** (MIT, ~5800) | 24px stroke | alternative |
| ⭐ **game-icons.net** (CC-BY, ~4000) | explicitly fantasy/RPG | **the only set covering our domain** |

⭐ CC-BY requires attribution, which for this project is a **feature, not
a tax**: we have an authorship ledger, a provenance subsystem and a
credits surface, and the whole thesis is that attribution is
load-bearing.

### ⛔ Two paths ruled out

- **Don't generate them.** We have the pipeline
  ([media.md](../../subsystems/media.md)) and it is the wrong tool: an
  icon set's value is **consistency of visual language across the
  family**, and per-icon generation yields 200 icons that do not look
  related. Generation is right for **illustrations** — which is exactly
  what it already does.
- **Don't use an icon font**, despite it fitting the existing delivery
  path perfectly (one more woff2 beside the six in `public/fonts`, with
  the loading machinery already there). Screen readers read PUA
  codepoints, weight cannot vary per icon, and `font-display: swap`
  flashes boxes.
  - ⭐ **But one case genuinely wins with the font, and it is worth
    knowing the door exists:** a mark *inside a sentence*. The transcript
    is MML with font-by-register, so a glyph that must sit inline at the
    prose's size and colour **in the right register** is a *typographic*
    problem, and the font is the only thing that composes with
    `registers.ts`. ⚠ Which § 4.1 says not to do — so the door stays
    shut, and the reason is recorded rather than rediscovered.

## 6. Specifically, what is needed

| | count | note |
|---|---|---|
| branch marks | **4** | the only genuinely bespoke work. A day, not a programme |
| chrome | **~12** | refresh · pin · close · expand · collapse · search · settings · link · warning · 3 connection states |
| direction + elevation | **~14** | 8 compass + up/down/in/out + *exit exists but unexplored* + *exit is a door*. ⭐ Needed by the minimap regardless |
| slot marks | **~10** | `WornList` |
| state overlays | **~8** | the semantic roles as a shared overlay |
| channel marks | **32** | readings — and the proving ground for the row-carried `icon` key |
| **the mechanism** | 1 | an `icon` key on a vocabulary row → `mediaUrl()`, with a **word fallback that is never optional** |

**Build first:** the **4 branch marks + 12 chrome icons**, inline in
`ui/icons/` on the `Seal` pattern, with a contrast test across all three
themes — and point them at **`HereList`** first, because that is the
surface a player reads a hundred times an hour.

## 7. Open questions — values, not mechanism

1. ⭐⭐⭐ **State or category for colour?** This slate argues **state**
   hard (§ 2), but it is a real choice: state makes the UI *informative*;
   category makes it prettier and more learnable at a glance. Everything
   downstream hangs on it.
2. ⛔ **Do pack icons get to be theme-aware?** (§ 4.4.) Either a
   constrained token palette for authors — which needs an authoring rule
   and a lint — or **two visual classes of icon in the same list**, one
   of which does not repaint.
3. ⚠ **One size or two for the domain tier**, which really asks: *do we
   pay to redraw the RPG art small, or do icons appear only on cards and
   never in rows?* **Rows are where the value is** (§ 3.1), so "cards
   only" is a much smaller build that misses the best surface.
4. **Does the state overlay sit on the icon, or beside it?** On the icon
   is denser and reads faster; beside it survives a pack-supplied raster
   that the overlay cannot recolour.

## Cross-refs

- [card-surface.md](../../subsystems/card-surface.md) — the feed, the
  one inspection card laid out by `StuffKind`, and where § 3's surfaces
  live.
- [map-slate.md](./map-slate.md) — the zone navigation card; the
  direction/elevation set is its dependency.
- [media.md](../../subsystems/media.md) — `Visible.illustration`,
  `mediaUrl()`, `MediaAsset`: the content tier's shipped contract.
- [message-rendering.md](../../subsystems/message-rendering.md) +
  `themes/registers.ts` — the chrome/world line § 4.1 must not cross.
- [client-shell.md](../../subsystems/client-shell.md) — the honest-state
  primitives the state overlay must agree with (`Figure`'s
  live/empty/unwired).
- [feedback-slate.md](./feedback-slate.md) + [measurement.md](../../measurement.md)
  — **B4**: an icon colour that means *well-rated* is a gauge.
- [studio.md](../../subsystems/studio.md) — the surface where the
  mixin-kind glyph **does** pay off (§ 1).
