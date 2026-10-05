# Client vocabulary slate — the closed unions become rows, and routing gets a second axis

> **Status: UNBUILT, and it is the hinge five other things hang off.**
> ⛔ `CardId` is a **closed eleven-word TypeScript union** in
> `@saxonberg/types` (`subject · who · news · wiki · help · prompt · cms ·
> git · studio · stock · survey`), server-validated, with
> `INSPECTION_CARD_IDS = ['subject']`. The routing engine
> (`FEED_DESTINATIONS`, `RoutingRule`, `FeedPredicate`, `DEFAULT_ROUTING`)
> **already ships** — and **a card is not one of its destinations.**
> **Left:** `CardId` + the client vocabulary as row-extensible catalogues
> · a `nature` facet on `SubscribableFieldDescriptor` · cards as routing
> destinations · a routing table per arrangement · the card-body registry
> (a body as a document kind) · retiring `CardBodies`' `PLUMBING` and
> description deny-lists · the every-datum-has-a-destination gate
> **Size:** **a build**, and the only real one in the client-governance
> cluster. [client-parcel-slate](./client-parcel-slate.md) is a namespace
> design that cannot reach anything without it.

**Captured 2026-10-02**, out of the card/image/iconography conversations.

> **User: "my opinion is a lot of this client behavior should be
> configurable by the player not decided for them… prose goes into term
> and the other stuff goes in cards… property values that are numerical
> or enumerated strings go in cards… all of this is just general
> guidelines."**

---

## 1. ⭐⭐⭐ The guidelines are the GRAIN, not the law

The doctrine above is a **routing table**, and the design's job is to
make it *a default somebody can change* rather than a rule baked into a
React component. That is `design-lenses`'s altitude rule verbatim — **say
which answers are the grain (a default an author may change) rather than
the law.**

> **Get the mechanism right and the taxonomy stops being something anyone
> has to agree on**, because it becomes a default with a knob.

## 2. ⭐⭐⭐ The author declares the NATURE; the player configures the ROUTE

Two decisions, and conflating them is the whole trap:

| decision | whose | example |
|---|---|---|
| **is this datum prose, a measurement, or a fragment?** | ⭐ **the mixin author** — nobody else can know | `clo` is a measurement · `longDescription` is prose · `shortDescription` is an identifying fragment |
| **where do measurements go in THIS layout?** | ⭐ **the player** | *measurements → cards · prose → term · decorative fragments → term* |

Neither can do the other's job: the author cannot know your layout, the
player cannot know whether `clo` is a number or a sentence.
⭐ **It is the content-declaration doctrine applied to presentation** —
*we don't measure it, the author declares it.*

> **User: "definitely nature."** — nature, not preferred destination,
> because nature survives a layout nobody has invented yet.

### The home exists and has no such facet

`SubscribableFieldDescriptor` (`api/mql-subscription.ts`) is already a
**per-field declaration, static on the mixin that owns the field**, on
the projection path:

```ts
interface SubscribableFieldDescriptor {
  name: string;
  read?: …;  perDetailRead?: …;
  dependsOnFields?: string[];  changes?: ChangeSource[];  static?: true;
}
```

`VisibleMixin` contributes one for `illustration` exactly as for the
descriptions. **Nothing says what kind of thing the value is**, so every
consumer downstream guesses.

### ⭐⭐ And one of them is guessing by hand, right now

`CardBodies`, in its own words:

> *"**Field names that are DESCRIPTION rather than measurement** — the
> header and the prose already render them, so they must not double as
> rows. ⚠ A deny-list rather than an allow-list, deliberately. An
> allow-list would have to **name every reading a mixin might ever
> declare, which is the enumeration this module exists not to hold**."*

> **That is the taxonomy above, implemented as a hardcoded client-side
> list of field names, by a module that explicitly refused to hold the
> enumeration — because the enumeration does not belong to it.** It
> belongs to the mixin that declares the field.

⚠ Precise scope: the deny-list answers *"does this field become a row
inside the card"* — card-internal layout, not term-vs-card. But it is
**the same question keyed on the same taxonomy at a second site**, which
is the argument for declaring it once. (`PLUMBING`, the mixin-chip
demotion list, is a third.)

## 3. ⭐⭐ The routing engine already exists — and cards are not destinations

`@saxonberg/types` ships `FEED_DESTINATIONS` = `world · attention ·
channels · diagnostics`, `FeedDisposition` = `move | copy`,
`RoutingRule` = `{when, to, disposition}` and `DEFAULT_ROUTING` as three
rules. And the predicate is better than anything this slate would have
proposed:

> ⭐⭐⭐ *"**A predicate over the frame's FACETS, not over topic strings.**
> `weight = diagnostic` is one rule; the same rule expressed as topic
> paths is a list of sixty that drifts every time a topic is added, and
> **the drift is silent.**"*

`disposition: 'copy'` already handles one frame reaching two places (a
tell lands in Attention *and* World).

> ⛔ **All four destinations are terminal feeds. A card is not one.** The
> term↔card decision is still the separate global `shell.result`
> (`card | terminal | both`) — **one switch for every content kind.**

**So the doctrine needs two things, both small against what is there:**

1. **cards as destinations** in the existing engine;
2. **the `nature` facet** (§ 2), so a *datum* has something to match on
   the way a *frame* already does.

The mechanism is not missing. One axis is.

### Per-layout comes free

> **User: "it may depend on what layout you're engaged with… your needs
> when in the forums may be different than when exploring a dungeon."**

`cockpit` already has mode × arrangement, and arrangements are *"savable,
not a frozen list"* — player-composed, player-named, persisted to
`cockpit.arrangements`. ⭐ **A routing table per arrangement rides the
thing that already persists your layout.** No new concept.

## 4. ⚠ The one invariant configurability requires

A fully configurable routing table means **content can be configured into
invisibility** — and we know exactly what that looks like, because
[carded-prose-slate](../tails/carded-prose-slate.md) is it happening by
accident.

> **Every datum must have at least one destination. A configuration that
> routes something nowhere is refused, not accepted silently.**

⭐ Already half-implemented, with the principle stated: `visibleCards`
suppresses a card under `terminal` **only when it has prose to fall back
to**, because *"suppressing it would take the authoring surface away on a
setting that never claimed to."* The rule exists; it needs to be the
general one.

## 5. ⛔⛔ Why the unions must become rows

> **The client's statute book lives in `@saxonberg/types`** — `CARD_IDS`,
> `COCKPIT_MODES`, `LAYOUT_NAMES`, `FEED_DESTINATIONS`,
> `DEFAULT_ROUTING`, `SHELF_ROW_IDS` — with the stated reason that *"both
> ends import this one list so they can never drift."*
>
> **A pack cannot contribute to `@saxonberg/types`.** It is a build-time
> TypeScript package; a pack's contribution installs at runtime. **You
> cannot `import type { CardId }` from a Mongo row.**

Two shapes, and only one of them means anything a committee can exercise:

| | what *"installed by preference, not by fiat"* means |
|---|---|
| **(a) the vocabulary becomes rows** | ⭐ chosen **at runtime** — the committee legislates and the world changes |
| **(b) the pack is an npm build input** | chosen **at build/deploy time** — the committee legislates and the executive ships |

⚠ **(b) is the delegation problem again** (*"it relocates enormous power
to whoever writes the code"*). If the client committee is to be more than
memos, it has to be **(a)**.

### ⭐⭐⭐ Rows close five open problems at once

`CardId` becomes a **row-extensible vocabulary**, the way `Placement` and
`Reading` already are — a catalogue warming a roster, validated at boot,
contributed by whichever pack ships it. One move, and:

1. the closed union stops being a kernel edit for every new presentation;
2. ⭐ **a pack can ship a card** — a definition row plus a body view,
   exactly as it already ships a verb;
3. ⭐⭐ the **client committee gets runtime authority** — its statute book
   becomes rows it can amend without a deploy;
4. the **body registry** falls out, because a definition naming its body
   is the same row;
5. ⭐⭐⭐ it is **the only path by which a third party reaches the client
   without a build** — *rows cross the wire; `src/` does not*
   ([client-parcel-slate § 9](./client-parcel-slate.md)).

It is also the pattern this codebase reaches for every time — *the kernel
ships the mechanism, the row carries the content* — and `Reading` proves
it: *"a trade adds a reading with no platform file changed and no new
verb."*

### ⚠ The cost, stated plainly

**You lose the compile-time *can never drift* guarantee.** Today one
shared import makes drift impossible; rows move that to a boot/lint gate.
That is the same trade the lint family already made for `Collections`
(`lint:schema`) and mixin names (`lint:mixin-names`), so both the
precedent and the machinery exist — **but it is a real downgrade in kind,
from *impossible* to *caught*.**

## 6. The body registry, and why a plugin is DATA

The server's whole trust model is the proxy, call-security and
`FromModule`. **None of it exists in a browser.** A JS plugin holds the
session cookie, the socket and the DOM — it is **root on the player's
session**, and the player installing it did not write it. Categorically
worse than wizard TS-access, where root is over your own things.

> ⭐⭐⭐ **So a client plugin is declarative, and the codebase already has
> the shape: a command view is a YAML document; the controller is code.**
> A card body described as data — which fields, in what order, which
> layout, which icons, which routing — rendered by the client's own
> components, **executes nothing in the browser.**

**A card body becomes a `DocumentKinds` entry served over the document
store, exactly like `command-view`.** The closed `CardId` union — now
rows — is the *controller* side; the body is content. ⭐ *A pack ships a
card view the same way it ships a verb view*, and the committee governs
**the vocabulary those views may name.**

## 7. What it unlocks (and the image question it settles)

### ⭐ The doctrine answers where pictures go, without special-casing

An illustration is an **identifying, non-prose datum** → *a card*, by the
taxonomy itself rather than by an argument about registers. ⭐⭐ **And the
asset design survives [carded-prose](../tails/carded-prose-slate.md)
precisely because it is field-shaped:** `illustration` is in
`DETAIL_FIELDS`, so the MQL projection carries it. **The things that break
are the *composed* ones, and an illustration is never composed.**

⚠ Measured 2026-10-01: **19 rows carry an `illustration`, 16 of them
species** (the char-gen race picker) and 3 locations. The capability is on
nearly every Stuff; the usage is one feature — because **nobody knew where
the picture would go.**

### The five image jobs — three are assets, one is code

| job | unit | nature |
|---|---|---|
| **identification** — what does this look like | ⭐ a **kind** (keys are shared: `sensitivus` → `species/sapiens.png`, so a library is **sublinear in content**) | asset |
| **establishing** — what is this place like | a location | asset, the expensive one |
| **portraiture** — who is this | an identity | asset; ⚠ per-player is combinatorial |
| ⭐⭐⭐ **diagrammatic** — how does this work / where am I | **state** | **a renderer** |
| decorative | — | the theme |

> ⭐⭐⭐ **Invest in renderers before assets.** A renderer's cost is fixed
> and serves unbounded content; an asset library's cost is linear in
> content and never generalises. The minimap's SVG is the first renderer
> and the one that compounds.

⚠ And the economics: every generated illustration is a **permanent
storage ratchet** plus a **one-time token spend**, for content that may go
dormant — the two nastiest channels in
[scarcity-slate](./scarcity-slate.md) at once.

### ⭐⭐ The precedent, because it is not an obvious genre

- **Fallen London / Sunless Sea** (Failbetter, 2009–) — the direct
  ancestor: dense prose, and the whole visual language is **one square
  illustration per card**, ~100px, consistent style. **Their storylet is
  our card.** Three rules: one image per card, always the same size,
  never inline with prose.
- **Kingdom of Loathing** — the crudeness is a **budget strategy wearing
  an aesthetic**: expectations set low enough that consistency is free.
- **Roguelikes with a glyph↔tile toggle** (Caves of Qud, Cogmind, DCSS,
  DF) — ⭐ **the glyph is canonical and the tile is optional**, which is
  degrade-to-the-word proven on a text-attached audience.
- **IRE's MUD clients** — ⭐ the one graphic MUD players universally
  accept is **the map**. A sequencing datum.
- ⭐⭐⭐ **The non-game answer: an illustrated field guide.** Peterson's, a
  flora, an anatomy atlas, a bestiary — prose plus *one plate per
  subject*, plate always in the same position, never interrupting the
  text. **A 400-year-old solved form for exactly this problem.**

⭐ **And do not aim at "looks like a modern game."** We lose that
comparison on day one and *the comparison is optional* — nobody measures
Fallen London against Baldur's Gate. **The style choice IS the budget
decision**, and *a consistent style with 40 images beats an inconsistent
style with 400.*

### Surfaces this unblocks

- ⭐ an **image-first body** for a `location` — the field-guide plate.
  Today the picture is a *header on a text body*.
- a **list-of-images** body: a species roster, a map legend, an item grid.
  **No body is that shape today.**
- ⛔ **not modals.** A modal is a *mode*; it blocks, and in a live world
  where things happen while you read, **a blocking surface is a lie** —
  which is why the feed is non-blocking. The one honest exception is a
  **lightbox**. ⭐ And the project already shipped a separate surface for
  different content and **folded it back**: the CMS's `?surface=cms`
  takeover was retired in favour of being the `build` mode with three
  cards in one feed.

## 8. ⚠ Build the prose contract first

[carded-prose-slate](../tails/carded-prose-slate.md) is a **live defect**
under all of this: the controller composes a body, hands it to the card as
`prose`, marks the frame `carded` — and the card re-derives from fields
and **never renders the prose it was handed.** The floor-puddle summary
*has never been seen by a browser player*; `look hook` says *"Hanging from
it: a prime cut of meat"* on the wire and may show nothing in a client.

⭐ **Cheaper than that slate implies:** `prose` is already stored on card
state server-side and already arrives at the client — `cardFeedSlice:211`
reads `c.prose`, but only to decide *visibility*, never to render. **The
data is on the wire and in the store; it is a client render, not a
protocol change.**

⭐⭐ And the sharper framing the reading gives: `shell.result` already
means *the prose is the fallback and the card is the upgrade.* **The
defect is not that two renderings disagree — it is that the card is
supposed to be a superset of the prose and is actually a different set.**

**Order:** prose contract → `PlacingMixin`'s card projection → the
`nature` facet + cards as destinations → rows → bodies.

## 9. Open questions

1. ⭐⭐⭐ **Does `CardId` go to rows?** The fork everything hangs off, and
   the cost is the compile-time guarantee (§ 5).
2. ⭐ **Does the client pack own `FEED_DESTINATIONS` / `DEFAULT_ROUTING`
   too?** Given § 2: *nature* is engine (a mixin declares it) and
   *destinations and rules* are one client's answer — so yes, and that is
   a clean line.
3. ⚠ **What happens to a saved arrangement naming a card the installed
   pack no longer ships?** Impossible today by compilation; under rows it
   is live, and the standing rule is **no migrations ever** — which here
   means **the arrangement degrades and says so**, never fails.
4. **Does the log ever need an index?** The feed is *"a LOG, so a card
   STACKS by default"* — deliberate, and right for attention. But there
   is no way back to something except re-issuing the command, which
   re-executes. ⭐ For reference-shaped use (a legend, a bestiary, a
   gallery) an index beats a log, and that is a product call about whether
   this client is also a reference work.

## Cross-refs

- [client-parcel-slate.md](./client-parcel-slate.md) — the governance this
  build gives teeth to; § 9 there is *rows cross the wire, `src/` does not*.
- [carded-prose-slate.md](../tails/carded-prose-slate.md) — ⚠ the live
  defect that must be fixed before bodies are added.
- [card-surface.md](../../subsystems/card-surface.md) — the feed, the one
  inspection card, the single birth path, pinned vs live, the sweep.
- [iconography-slate.md](./iconography-slate.md) — the icons a declarative
  body names; *shape is identity, colour is state*.
- [map-slate.md](./map-slate.md) — the first renderer, and the graphic a
  MUD audience already accepts.
- [media.md](../../subsystems/media.md) — `Visible.illustration`,
  `mediaUrl()`, `MediaAsset`: the shipped asset contract.
- [measurement.md](../../measurement.md) — **B4**, which is why there is
  one axis and no facets, and why an icon colour must never mean
  *well-rated*.
- [scarcity-slate.md](./scarcity-slate.md) — the storage ratchet and token
  spend behind every generated image.
