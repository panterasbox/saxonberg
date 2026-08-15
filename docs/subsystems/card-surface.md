# The card surface

The right column is a **feed of cards**, and a card is one thing: *a
container for structured content, separate from the unstructured
message feed in the terminal*. It is not a lifetime system, not a
liveness system and not a layout system — everything here exists to
make it that and nothing more.

## ⭐⭐ One birth path

**A card exists because a COMMAND caused the server to push it.** The
client no longer infers a card from a changed query result, and it
cannot ask for one either.

That is enforced three ways, strongest first:

1. **The protocol.** `MqlSubscribeMessage` carries no field that could
   name a card. The one subscription a client may still open for itself
   is `chrome: 'self'` — the widget shelf's figures, which is *not a
   card* (no pinned-ness, no lifetime). A source scan can be defeated by
   a clever call site; a missing protocol field cannot be used at all.
2. **The gate.** A command view declares `opens_card:` (a string, or a
   list where a verb legitimately opens more than one). `CardApi.open`
   reads the running command and **throws** when it opens a card the
   view did not declare — so the vocabulary stays declarative and
   greppable while the call site stays where the resolved operand is
   known. Validated against `CARD_IDS` at **load**, so a typo fails at
   boot rather than at first invocation.
3. **`card-birth-path.test.ts`**, which asserts every mint site and the
   one client writer *by name*, as a set.

The predecessor was the opposite of this: a card was born when the
client noticed the standing `inspect` subscription's first result had
changed — *"the `inspect` subscription is the SIGNAL, not the card."*
Three things made that untenable. A verb like `who` had no way to open a
card at all; the server could not assign a lifetime to something it did
not know existed; and the authoring surfaces have no focus change to
hang off.

## ⭐ Two axes, independent, both REQUIRED

```ts
export interface CardDefinition {
  readonly label: string;
  readonly source: CardSource;
  readonly pinnedByDefault: boolean;   // ⚠ required
  readonly live: boolean;              // ⚠ required
  readonly command: string;
  readonly noProse?: true;
}
```

**Pinned is the whole lifetime.** An unpinned card ages out of a
relevance window since it was last touched, and **says so** when it
goes. A pinned card stays until dismissed. The catalogue declares the
default; the player overrides in both directions with `cockpit card
pin | dismiss | auto`.

**Live is orthogonal and opt-in.** A card is **static by default** —
resolved once, stamped with `takenAt`, carrying a refresh control. A
live card carries neither, because *a static card that looked live
would be a lie*, and a refresh button on a live card is a bandage over
a wake that does not fire — **and, worse, it is how nobody finds out**.
A `here` card was immortal through eleven passing tests because every
one of them called `refreshForInteractive` by hand.

All four combinations are meaningful, and neither axis implies the
other. Both fields are non-optional in a `Record<CardId,
CardDefinition>` — the `COLLECTION_POLICIES` trick from `ResetPolicy` —
so **a new card without a lifetime decision is a compile error**. That
is what makes "a new card cannot ship without choosing its lifetime"
enforceable rather than aspirational.

### What the five holds became

The predecessor had five: `here`, `present`, `inReach`, `carried`,
`unanswered`. The four spatial ones bought precision (a card closed the
moment you left the room rather than eventually) and each cost a wake to
fire. That trade is **declined**: you can scroll back, and the card ages
out.

⚠⚠ `unanswered` is not symmetric with the other four and does not
simply die. Its subject was a pending **command**, and it is the one the
design leans on — *nothing that is still actionable ever leaves*. Its
guarantee moves onto the pinned axis: a **prompt card opens PINNED and
auto-releases with reason `answered`** when the prompt settles
(`PromptLogic.cleanup` → `CardApi.notifyPromptSettled`). Same guarantee,
one axis, no hold vocabulary.

## ⭐ One identity: the normalized command

A card is identified by the command that produced it —
`CardLogic.normalizeKey`, three rungs:

1. `ShellApi.expandAliases` — the player's own aliases.
2. **Canonicalise the verb to `command.verbs[0]`.** ⚠ `examine` is a
   verb SYNONYM, not an alias (`look.yaml` declares `verbs: [look, l,
   examine, exa]`), so `expandAliases` never sees it. Without this rung
   `examine a` and `look a` are two cards.
3. `CommandLineApi.format()` — the canonical round-trip.

| Sequence | Result |
|---|---|
| `who`, `who` | **one** card, brought forward |
| `who`, `who --wizards` | **two** cards |
| `look a`, `look b`, `look a` | **two**; the third brings `a` forward |
| `examine a`, `look a` | **one** — the synonym rung |

Re-issuing does three things at once: brings the card forward, resets
its relevance window, and re-runs it if static.

⚠ **A knowing cost:** `look lamp` and `look brass lamp` are two cards
about one thing. That is identity-is-what-you-typed read literally, and
it is the right trade — but it is a cost, not a defect.

**Ordering.** Unpinned cards reorder to the front on re-issue — the feed
is newest-touched-first. **Pinned cards hold their position**; a pinned
card that jumped around every time you touched something else would be
worse than one that sits still.

⭐ `place`'s key is `look`, its own refresh command. So an
arrangement-pushed `place` and a typed bare `look` collide **on
purpose** — which retires the *"the focus card must not FLASH"* special
case structurally rather than by a duplicate check.

## The catalogue — three sources

MQL speaks **Stuff**. The roster is `RosterRow[]`, releases are `Release`
documents, a wiki page is a rendered payload and the authoring surfaces
are REST. An MQL-only catalogue could not express three of the ten
shipped rows at all, so `CardSource` is a discriminated union:

- **`mql`** — a server-owned query resolved to Stuff and projected. The
  client sends no MQL. A `needsSubject` row resolves by direct lookup
  **behind the perception gate**; ⚠⚠ never an `#<stuffId>` MQL seed,
  which is authoring-tier and ungated, so a card built on it would
  answer for anything whose id the viewer had ever seen on a frame — a
  peep-hole into every room in the game, looking exactly like the
  feature working.
- **`payload`** — a `CardPayload` **the producing controller already
  computed**. ⭐ `WhoController` builds `RosterRow[]` to render its
  prose; the card carries that same array. A producer on the card side
  re-deriving it would be two computations of one answer — the
  two-copies-of-one-sentence shape at the level of data rather than
  words.
- **`client`** — the body is the client's own transport (Monaco, the git
  panel, the Studio catalogue). The **server** still owns the card's
  existence, identity, lifetime and pinned-ness; only the body is the
  client's.
- **`prompt`** — no body at all. The client already holds one prompt
  model and the card joins it by `promptId`.

The ten shipped rows:

| id | source | live | pinned | key | prose |
|---|---|---|---|---|---|
| `subject` | mql `$subject`, `detail` | ✗ | ✗ | `look <subject>` | `look`'s target body |
| `place` | mql `here`, `detail` | **✓** | ✓ | `look` | `look`'s location body |
| `who` | payload `roster` | ✗ | ✗ | `who` | `WhoController` |
| `news` | payload `releases` | ✗ | ✗ | `press` | `PressController` |
| `wiki` | payload `wikiPage` | ✗ | ✗ | `wiki <slug>` | the page read |
| `help` | payload `helpTopic` | ✗ | ✗ | `help <topic>` | the topic read |
| `prompt` | prompt | ✗ | ✓ | `prompt` | `noProse` |
| `cms` | client | ✗ | ✓ | `cms` | `noProse` |
| `git` | client | ✗ | ✓ | `git` | `noProse` |
| `studio` | client | ✗ | ✓ | `studio` | `noProse` |

⭐⭐ **`place` is the one LIVE row, and it is the one that earns it.** A
card pinned by default outlives everything around it, so a stale one is
the classic failure the liveness axis exists to prevent — and
`locationDependent` is a wake that already exists and is already proven,
rather than one this build would have to invent. That last clause is
exactly why **`who` ships static**: the dependency vocabulary is
`focusDependent` / `locationDependent` / the `durableKey` poke channel,
and **nothing wakes on connect or disconnect**. A live `who` would
resolve once and then be permanently wrong while looking exactly like it
worked.

⚠ A catalogue where every row was static would leave `live` a field
nothing reads, and a declaration nothing reads is indistinguishable from
a broken one.

### ⭐⭐ `self` is NOT a card

The widget shelf's subscription lives beside the catalogue as
`SHELF_SUBSCRIPTION`, explicitly outside `CARDS`. It has no pinned-ness
and no lifetime, and forcing it to declare them would make the
required-fields gate meaningless — which is the gate that makes the
whole "strict taxonomy" claim real. The client names it on the wire as
`chrome: 'self'`.

## ⭐ One sweep, and exactly one clock

Lifetime is a **relevance window since last touched**, evicted by ONE
recurring pass over the whole set — the `ResidencyLogic` shape, through
`ScheduleApi.recurring`, never a bare `setInterval` and never a timer
per card.

```
for interactive, card in cardSet:
  if card.pinned: continue                 # pinned is the whole axis
  if now - card.lastTouchedAt < windowMs: continue
  close(card, 'aged-out')                  # → card-closed, which the husk renders
```

⚠ **The client's own husk `setInterval` is deleted.** Two clocks
disagree, and the one the player cannot see is the one that wins
arguments. The server owns the window, so `cockpit card list` and the
client agree by construction.

⚠ The cadence is not the window. A coarse sweep (~30 s) with a fine
window (~10 min) is the residency shape; conflating them means changing
one silently changes the other.

⚠ **The scheduled callback re-plants the principal.** It fires long
after the frame that installed it, so the execution context has no
target and the registry's gate would deny every tick — *silently*,
because a scheduled callback has nobody to report to. `CardApi.boot`
wraps it in `ExecutionContextApi.runRoot` with the logic singleton as
principal.

## ⚠ The structural call: a second registry

The card set does **not** live inside `MqlSubscriptionRegistry`. The
earlier argument — *"the card set IS the existing subscription registry,
and there is no second registry to drift"* — rested on every card being
a subscription. After this build most cards are static, `payload` and
`client` sources are not MQL at all, and a prompt card never was; the
identity is broken, and keeping them fused would put non-MQL state in
the MQL substrate.

The drift risk therefore **moves** to *card ↔ its subscription handle*,
and is closed by making the card **own** the handle:
`instanceId === subscriptionId` for a live card, every teardown through
`CardLogic.close`, and `card-subscription-orphans.test.ts` asserting
zero orphans after closing, sweeping, rearranging and disconnecting.

⭐ It is also what lets a live card's updates keep riding
`mql-subscription-delta` — no new envelope, no join table.

## The tiers

| File | Role |
|---|---|
| `mud/lib/connection/Cards.ts` | The catalogue: `CardSource`, `CardDefinition`, `CARDS`, `CARDS_BY_NAME`, `SHELF_SUBSCRIPTION` |
| `mud/api/card.ts` | `CardApi` — the gated face; owns the sweep handle and the `runRoot` principal |
| `mud/obj/api/CardLogic.ts` | The hot-reloadable logic singleton at `/obj/api/card`; `normalizeKey` lives here |
| `mud/obj/CardRegistry.ts` | The state: per-Interactive open cards, the sweep, `resolveSubject` behind the perception gate |
| `packages/client/src/store/cardFeedSlice.ts` | The client's card set + the husk model |
| `packages/client/src/components/cards/` | `CardFeed`, `Card`, `CardBodies`, `CardViewStrip`, `useCardFeed` |

⭐ `dest /obj/api/card` reloads the logic **without closing anybody's
cards**: the state is on the registry, the resolution is on the logic.

## The wire

Four card envelopes plus the delta a live card rides:

- **`card-opened`** — `instanceId`, `cardId`, `key`, `live`, `pinned`,
  `takenAt?` (static only), `title?`, `subjectId?`, `promptId?`,
  `prose?`, `result?` / `payload?`. **Every** card arrives this way;
  there is no `pushed` flag, because the distinction it drew is gone —
  the client never opens a card, so every open is a push.
- **`card-touched`** — the same command re-issued.
- **`card-closed`** — `instanceId` + `reason`.
- **`card-pinned`** — the override took.

```ts
export type CardCloseReason =
  | 'answered'    // a prompt card settled
  | 'aged-out'    // the relevance window lapsed — it SAYS SO
  | 'dismissed'   // the player dropped it
  | 'rearranged'  // the workspace changed, not the world
  | 'gone';       // a live card's subject stopped existing
```

⚠ **A card that vanishes without a reason reads as a bug, and the
player cannot tell a rule from a defect.** Timing out is a reason and
must be said, which is why `aged-out` exists at all rather than the card
simply disappearing. The husk model carries over unchanged: fade, state
the reason, clear the body, keep the title.

⚠ **The title survives; the body does not.** Rendering yesterday's
contents as if they were current is the failure the fade exists to
avoid — but the title is *which card this is*, and a husk that cannot
say what it was about is less honest rather than more. Found by driving:
teleporting out of the lounge left a card naming nothing at all.

## Named views over the feed

`CardViewStrip` + `store/cardViewActions.ts` mirror the terminal's
`TabStrip` / `consoleActions` — same gestures, same vocabulary. Views
filter on **card kind**, the one axis a player can name.

⭐ **`All` is the absence of a filter**, not a stored row. That is what
makes it locked and undeletable *rather than merely not currently
deleted*, and it is why deleting every view a player made is safe.

⚠⚠ **The seeding clobber, closed one step earlier than the fix it
learns from.** `console.tabs` shipped a bug where an ABSENT key read as
*first run*, so a layout mounting before the connection payload wrote
ship defaults over saved views — fixed by keying the seeding effect on
`Array.isArray(...)`, with **no test ever written for it**. The card
views ship **no defaults at all**, so there is no write to race.
`readViews()` still distinguishes *absent* (`null`) from *empty*
(`[]`), because a caller that could not tell them apart would
reintroduce the same question. Both halves are asserted.

⚠ `activeCardKinds()` returns `null` for `All`, not "every kind": a view
listing every kind and the absence of one look identical until a card
kind is added, at which point the enumerated one silently stops showing
it.

## `shell.result` — a FILTER, not a placement

One setting: `card` (default) · `terminal` · `both`.

**Why a filter.** Placement (the server declining to send) saves the
wire, but the frame then never reaches the frame store and **`recall`
cannot find it**. Filtering keeps your `who` history searchable while
keeping it out of sight.

⚠⚠ **It keys on `meta.carded`, not on a topic — and that is a change
from the requirements' decision 10.** That decision keyed it on the
topic `shell.result`, on the premise that *every structured command
result already carries it*. The per-card prose audit falsifies the
premise: `look`'s two cards ride **`sense.survey`**, which twelve other
verbs share (`get`, `drop`, `inventory`, `wear`, …). A topic key would
either miss `look` entirely or silence all twelve. The marker is exact
by construction — the producer that opens the card is the producer that
stamps the frame.

⚠ Under `terminal` the **card** is suppressed instead — **except where
it declares `noProse`**. A Monaco editor has no terminal rendering, so
suppressing it would take the authoring surface away on a setting that
never claimed to. The absence of `prose` on the wire IS that
declaration arriving.

⭐ **`both` is safe because there is only one rendering.** The card
carries the same `Mml` the controller emitted, materialized once against
the same viewer with the same `Mml.toString(recipient)` the Scene
composer uses. So the test asserts `frame.body === card.prose` —
literal equality of one payload, never the words twice — and `terminal`
is a first-class mode for free rather than a second renderer.

### The per-form-factor override

`SettingsSchemaEntry.perFactor` + `ShellApi.resolveSetting(host, key,
factor?)`: `<key>.<factor>` → `<key>` → schema default. `setSetting`
accepts a suffix **only** on a `perFactor` entry and only for
`desktop`/`mobile` — that is what makes it *one key with an optional
override* rather than an open namespace.

⚠ Rung 1 reads `getOwnSetting`, not `getSetting`. `getSetting` falls
back to the schema default, so a suffixed read would always return
something and rung 2 could never be reached: the override would silently
become **mandatory**, which is the two-independent-keys shape this
design refused.

⚠⚠ **This does not break the no-`cockpit.formFactor` rule.** That key
was never built because the server cannot know a viewport, so it would
be a fake fact. Two stored *preferences* assert nothing about which is
in force: the server ships both resolved answers on
`ConnectionEstablishedPayload.resultDisplay` (re-pushed as
`client-state-update` on every write, so the setting takes effect
without a reconnect) and the client — which genuinely knows its own
width — picks. Same split as `cockpit.shelf`.

## The card's action row

`AffordanceEntry.source: 'subject' | 'actor'`. The row renders
`'subject'` only.

It shipped showing `cast · defend · destruct` on everything, because the
entry could not tell *the actor can always do this* from *this subject
affords it*. ⭐ The resolver **already computed** the distinction
(`fromTarget = affordance.source === target`) and used it as a filter;
it simply never carried it onto the entry.

⚠ **A subject-afforded set of size zero renders nothing**, and for an
ordinary object with no `commandContributions` that is most of the time.
That is correct per *a section that does not apply is absent, not
hatched* — but it is worth saying plainly, because "the row is usually
missing" and "the row does not work" look identical from outside. A
noticeboard's `read`, an NPC's `talk` and a door's `open` are what it is
for.

⚠ The **radial** still shows both sources, deliberately: a radial
answers *what can I do here*, which is the wider question the gesture
asks.

## `PerceptibleMixin.getPrimaryKeyword()` surface

```ts
getPrimaryKeyword(): string | undefined;
setPrimaryKeyword(value: string | undefined): void;
```

A persistent `primaryKeyword` field on `PerceptibleMixin`
(added to a `persistent` entry in `fieldMeta`). The **primary keyword** is
the *guaranteed-resolvable handle* an MML affordance can click —
`look <primaryKeyword>` is the canonical disambiguator.

**Default behavior**: when unset, `getPrimaryKeyword()` returns
`keywords[0]` (the first entry in the derived pool — typically
the first authored keyword, falling back to the first tokenized
name word). When the authored value is set and validly in the
pool, the getter returns it. When the pool is empty (no name,
no authored keywords) and no authored override is set, returns
`undefined`.

**Fail-soft validation on the setter**: the value must appear in
the derived `keywords` pool. Invalid values are ignored with a
warning (so authors can iterate keyword sets without crashes);
state is not corrupted. The getter never calls the setter — they
are strictly independent (a stale invalid stored value is
silently shadowed by the derived-pool head).

**Set-fires-field-change**: real changes route through
`MqlSubscriptionApi.fireFieldChange(this, 'primaryKeyword', ...)`
so subscriptions on `'primaryKeyword'` (any ref record on a
Perceptible host) wake.

## `REF_FIELDS` extension: `primaryKeyword`

```ts
export const REF_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
];
```

Every ref record shipped by the substrate carries `primaryKeyword`
for Perceptible hosts. Non-Perceptible hosts return `undefined`
from the descriptor and the substrate omits the field on the wire
(same as `quantity` for non-Globbable hosts).

The descriptor lives on `PerceptibleMixin.subscribableFields` —
contributed by the mixin that owns the gate, per the rule
`Stuff.subscribableFields` documents. Non-Perceptible hosts
contribute no descriptor; the substrate's projection loop tolerates
the absence and the field is naturally omitted from those hosts'
wire records (same shape `quantity` uses on Globbable). `REF_FIELDS`
can list `'primaryKeyword'` unconditionally because the loop's
`if (!d || !d.read) continue;` skip handles missing descriptors.

`dependsOnFields: ['primaryKeyword', 'name', 'shortDescription']`
— the getter result changes when any of the derived-pool inputs
change. `changes: [{ on: ShadowChangedEvent, by: 'target' }]` —
keyword pool can be reshaped by shadows.

## `DETAIL_FIELDS` extension: `contents`

```ts
export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  'shortDescription',
  'longDescription',
  'details',
  'bulkMaterial',
  'mass',
  'contents',
];
```

> ⚠ **`details` is per-viewer too, and was the widest identification
> leak in the codebase.** Its descriptor read `(stuff)` while its
> neighbour `longDescription` read `(stuff, viewer)` — so the card
> enumerated every detail key *and* description regardless of what the
> reader knew, and a detail key names the part by what it does
> (`sigil`, `scorch`). `look` at least had to be asked a question; the
> card just handed it over. Both layers (`read` and `perDetailRead`)
> now pass the viewer they were always given, through to
> `Detailed.detailRoot(viewer)`. See
> [magic-items.md](./magic-items.md) § *The parts leak harder than the
> prose*.

The `contents` descriptor lives on `ContainerMixin.subscribableFields`.
For container hosts, it ships an array of `'ref'`-shape records
(via `projectFields(child, REF_FIELDS, viewer)`) for visible
contained Stuff. Non-container hosts return `undefined` from the
descriptor and the substrate omits the field on the wire.

**Per-viewer visibility filter**: the descriptor walks
`host.getContents()` and excludes anything the viewer's `Sensor`
perception check rejects (sensory occlusion, etc.). Adornments
and the actor (self) are excluded. The viewer is the
subscription holder threaded through the substrate's
`#projectStuff` pass.

**Containment add/remove diffs** ride
`FieldChangedEvent { field: 'contents' }` fires installed
inline on `ContainerMixin.addContainable` and `removeContainable`.
No new event class, no specialized add/remove diff shape — when
the field-change fires, the substrate re-projects the host, the
new `contents` array goes through the diff machinery, and the
client receives an `op: update` change carrying the patched
list. The cycle is end-to-end via the existing primitives.

The choice to put `contents` directly into `DETAIL_FIELDS`
(rather than a new `'detail-with-contents'` alias or a secondary
subscription on `things in $focus`) trades a minor inefficiency
on non-container detail subscriptions for a uniform projection
policy. If contents grow heavy enough that this matters, that's
the moment to split.

## Body discipline: percepts, not state dump

The card body renders **what a perception verb would reveal to
this viewer**, not the focused thing's internal state. `look` is
vision — it reveals appearance and gross features; an estimate at
best for hidden quantities ("looks warm," never "37.4°C").
Internal properties are not perceivable just because they exist.

This is the inspection-card reconciliation principle (see the
inspection-card slate's *Reconciliation note* and the
[message-rendering-slate](../slates/tails/message-rendering-slate.md)):
every fact has a *revelation condition* — which modality /
instrument / skill reveals it, at what fidelity. The viewer
perceives only the facts whose condition they satisfy. The card's
v1 surface walks this back to the simplest cut:

- **Player body = percept projection.** The substrate's `'detail'`
  field-set ships only percept-shaped fields (display name, short
  / long description, visible contents — already per-viewer
  filtered server-side in `ContainerMixin.contents`); the renderer
  shows them as the look output. No slot maps, mixin lists, raw
  fields, or property bags surface here.
- **Raw internal state is server-side; the v1 card has no admin
  surface.** Template path, stuff id, mixin composition, raw JSON
  dump, and `clone` / `reload` / `eval` quick actions all belong
  in a future admin surface — but the substrate doesn't project
  those fields today and no client `isAdmin` flag exists. Until
  both ship, the card carries no admin block; what authors can do
  is use the typed-command interface (`clone <template>`,
  `reload <template>`) just like any verb.
- **Per-fact revelation gating beyond visible is parked.**
  The sense/modality system (feel/smell/listen as separate
  channels), the magic lens, skill-deepens-perception, and per-
  fact provenance all wait for the perception subsystem; the
  spine (fact → revelation condition) is recorded here for the
  future build, the implementation cut is "visible" only.

### Accumulate vs. latest — v1 ships latest-only

When a viewer performs successive perception acts on the same
focus (look, then measure, then appraise), does the card show
the *union* of percepts each act has revealed, or just the
*latest* act's output?

**Choice: latest-only.** The card's `records` snapshot is replaced by
each resolve (a `card-touched` re-resolve on a static card, a delta on
a live one); there is no per-fact union across multiple `look` /
`examine` / `measure` invocations. The latest-only path stays internally consistent
because the substrate re-projects the *currently-perceivable*
field set on every re-resolve — what the card shows is what's
true *now*, from this viewer, by the modalities currently in
play.

Accumulate-per-focus is the natural target once the revelation-
condition spine lands; that work is parked alongside the
sense/modality system. v1 does not block on it; the simpler
shape ships and stays correct for the percepts the substrate
currently projects.

## Cardinality-polymorphic body

Same field-set (`'detail'` always) for the `mql` rows. The renderer
branches on result-array length:

- **Single (length 1)**: detail view — display name + long
  description (rendered via `MmlRenderer` so embedded MML
  affordances become clickable) + contents list of clickable
  affordances when the focused host is a container.
- **Multi (length > 1)**: list view — one row per match, each
  row's display name rendered as an `<item>`-affordance.

The substrate doesn't know about this branching. Cardinality-
adaptive projection (ship `'ref'` for multi, `'detail'` for single) was
considered and deferred — `'detail'` always, in exchange for a single
uniform projection policy. The minor inefficiency is accepted.

⚠ A `payload` or `client` card does not branch at all: its body is a
`CardPayload` or the client's own surface, and the length of a records
array it does not have says nothing about it.

## `find` verb

```yaml
verbs: [find]
controller: FindController
args:
  - name: query
    type: objects
    required: true
    greedy: true
    scope: ["$focus", "reachable"]
```

**Snapshot semantics.** `find` resolves the query through the
existing MQL pipeline, ships an MML list to the terminal scroll,
one row per match. No `updates_focus` (the absence is load-
bearing — defaults to `'none'`); the giver's focus is unchanged
after `find`. No subscription is registered; no live updates.

**Admin gating.** For admin / Author viewers (checked via
`MixinApi.isAuthor(commandGiver)`), each row appends the
template path in parens — `brass thermometer (/obj/Thermometer)`.
Non-admins see display name only.

**Discovery.** Contributed to `PerceiverMixin.commandContributions.self`
alongside `look`, `scry`, `locate` — `find` is the
enumeration counterpart to `focus`, both surfaced on the
perceiver's verb set.

**`mql-query` integration.** The player-typed `find` rides the
command bus exactly like any other verb (controller renders
prose, player reads it). The `mql-query` one-shot wire surface
exists in parallel for future programmatic consumers — a widget
issuing a `find`-shape read without going through the command
bus. v1 does not exercise that path; the substrate is in place
for when it does.

## `mql-query` one-shot channel

Wire shape in `@saxonberg/types`:

```ts
interface MqlQueryMessage {
  type: 'mql-query';
  queryId: string;
  query: string;
  cardinality: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
}

interface MqlQueryResultEnvelope {
  type: 'mql-query-result';
  frameId: number;
  queryId: string;
  result: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
}

interface MqlQueryErrorEnvelope {
  type: 'mql-query-error';
  frameId: number;
  queryId: string;
  reason: MqlSubscriptionErrorReason;
  detail?: string;
}
```

`MqlSubscriptionApi.handleQuery(req: QueryRequest)`:

- Reuses ONLY the parse + resolve + project pipeline.
- NO registration in `#registry`, NO dependency-index entries,
  NO listener installation. This is the "share the pipeline,
  skip the state" pattern.
- Holder and cardinality checks mirror `handleSubscribe` so a
  client's error-handling code can branch by `reason` uniformly
  across subscribes and queries.
- `focusDependent` / `locationDependent` are not carried on the
  query shape (no subscription state to wake).

`Application.processUserMessage` routes inbound `'mql-query'`
messages through `handleQuery` — same shape as the existing
`'mql-subscribe'` route. Server-side programmatic one-shot
reads call `MqlApi.resolveOne` / `resolveMany` + `projectFields`
directly; this surface is the wire-facing channel.

## `look --peek` and the phase-effects substrate

`look.yaml`'s `peek` boolean option declares a lifecycle effect
against the dispatcher:

```yaml
args:
  - name: target
    type: object
    scope: ["$focus", "reachable"]
    updates_focus: extend
    prepositions: [at]
    default: "$focus"
options:
  peek:
    type: boolean
    description: "Render prose without changing focus"
    effects:
      - { phase: focus-update, action: skip }
```

The dispatcher recognizes a small vocabulary of *lifecycle
phases* — points between parse and emit where an option can
attach a `skip` or `replace` action. The vocabulary is declared
in `api/command.ts` (`COMMAND_PHASES`, `HOOKABLE_PHASES`,
`REPLACE_HANDLERS`, `IMPLEMENTED_REPLACE_HANDLERS`, `PhaseEffect`,
`validatePhaseEffect`, `collectPhaseEffects`, `consumePhaseEffects`).
Today `focus-update` is the only hookable phase; `validate`,
`confirm-prompt`, `dispatch`, and `emit-scene` are documented
placeholders that the schema accepts but the dispatcher throws
against until their substrate lands.

When the dispatcher's positional-arg loop hits the focus-update
site, it consults `consumePhaseEffects('focus-update', model,
optionDefs)`. If any active option declares
`{phase: 'focus-update', action: 'skip'}` and is truthy on the
bound model, the focus-update step is bypassed. Pronoun memory
still updates; only the focus chain push is held back.

`LookController.execute` is unchanged — it renders the prose
body and emits the existing Scene the same way it always has.
The "peek doesn't change focus" semantic is the dispatcher's
job, not the controller's.

The generalization (a phase taxonomy plus an option-side
`effects:` declaration) lets future flags reuse the substrate
without inventing new schema fields:

- `--async` → `{phase: 'dispatch', action: 'replace', with: 'deferred-dispatch'}`
- `--explain` / `--dry-run` → `{phase: 'dispatch', action: 'replace', with: 'explain-plan'}`
- `--force` → `{phase: 'confirm-prompt', action: 'skip'}`
- `--quiet` → `{phase: 'emit-scene', action: 'skip'}`

Each lands by making its target phase hookable, not by adding a
new YAML field. See `docs/subsystems/command-routing.md` for the
dispatcher details.

## Client stuff registry

A single Zustand slice on `useStore`:

```ts
interface StuffMetadata {
  stuffId: string;
  displayName: string;
  primaryKeyword?: string;
}

interface StuffRegistrySlice {
  stuffRegistry: Map<string, StuffMetadata>;
  upsertStuffMetadata: (records: StuffMetadata[]) => void;
}
```

**Populated** by every subscription consumer the client owns.
When the wire client receives an `mql-subscription-result` or
`mql-subscription-delta` envelope, it walks every record and
calls `useStore.getState().upsertStuffMetadata([...records])`
before dispatching to widget handlers. Nested ref-shape fields
(currently just `contents`; future `equipped`, `inventory`,
etc.) are recursively walked so the registry picks up every
stuff-id mentioned anywhere in the subscription payload.

**Merge semantics**: fields present in the new record
overwrite; fields absent leave existing values intact. A ref-
only delta does not clobber detail data; a detail delta
upgrades a previously ref-only entry.

**Read by**: `MmlRenderer.commandFor()` at click-resolution
time. The renderer reads the registry directly from the global
store snapshot (`useStore.getState().stuffRegistry.get(stuffId)`)
— not via a React subscription, since the renderer just needs
the snapshot at render time. Re-renders happen naturally when
the parent (terminal, card body) re-renders.

**No eviction in v1.** Sessions are bounded; the registry is
cheap memory. The "forgotten ref leads to broken click" failure
mode (which eviction would create) is more painful than the
"registry grows unbounded" trade-off (which it prevents).

**The registry is a side-effect cache for rendering metadata,
not a source of truth for client logic.** Widgets that need live
state subscribe for it; they do not query the registry. The
registry's only legitimate reader is rendering paths that need
a per-stuff lookup (currently: `MmlRenderer.commandFor`). If a
widget reaches for the registry to answer "what's in this
container" or "is this thing visible," that's the on-ramp to a
client-side shadow model — stop and have that conversation
explicitly rather than slipping into it by accumulation.

## MML identity-tag rendering

`MmlRenderer.commandFor()` extends to four identity tags:

```ts
case 'item':
case 'name':
case 'location':
case 'object': {
  const stuffId = node.attrs['stuff-id'];
  if (stuffId) {
    const meta = useStore.getState().stuffRegistry.get(stuffId);
    if (meta?.primaryKeyword) return `look ${meta.primaryKeyword}`;
  }
  return `look ${node.label}`;  // label fallback
}
```

**Click target** is `look <primaryKeyword>` when the registry
hits, falling back to `look <node.label>` when the registry
misses or the stuff has no primary keyword. Pedagogically this
matters: `look thermometer` is what the player would type.
Showing them that command on hover and sending it on click
teaches the typed-command surface; sending an opaque `stuff-id`
would not.

**Hover preview** rides the existing `onCommandPreview` surface
unchanged.

`<direction>` and `<speech>` remain non-actionable (no
`commandFor` branch). `<exit>` continues to emit `go <dir>`.

**MML identity tags carry `stuff-id` only.** Per the architectural
rule this build establishes, do not add per-stuff attributes to
`<item>` / `<name>` / `<location>` / `<object>` beyond
`stuff-id`. New per-stuff metadata is a projection field on a
subscription, not a tag attribute.

## Shared UI components and theme tokens

The card composes from a small **shared** primitive set under
`packages/client/src/components/ui/`, not card-private styled
divs. Three rules govern it:

1. **Reusable primitives, not bespoke JSX.** Future cockpit
   widgets (inventory, self-state strip, group windows) compose
   from the same surface — and so does the layout-MML library
   the [message-rendering-slate](../slates/tails/message-rendering-slate.md)
   schedules for its Wave 2. When that lands, its `<table>` /
   `<list>` / `<field>` tags map onto these same React
   components, so the subscription-driven rendering path and the
   message-rendered path converge on one DOM shape. The card
   does not block on that library; it ships its own
   subscription-record → React-component path today.

2. **Semantic DOM = the flatten-linear-labeled floor.** Every
   primitive renders the real HTML element: `<List>` is a `<ul>`
   / `<ol>`, `<EntityName>` is a `<button>`, `<Button>` is a
   `<button>`. No ARIA props are needed to fake what the
   platform already announces. Visual-only `<div>` grids are
   the smell to avoid.

3. **Theme tokens; no hex literals.** All color / spacing / font
   values come from `tokens.ts` — semantic names (`surface`,
   `fg`, `accent`, `border`, `sectionLabel`) that a theme can
   swap wholesale. There is **no** `<color>` or `<size>` MML
   tag; coloring is a stylesheet rule keyed off semantic markup
   (the principle from the message-rendering slate).

| Primitive | Role | Renders |
|---|---|---|
| `<List>` / `<ListItem>` | semantic sequence | `<ul>` / `<ol>` + `<li>` |
| `<EntityName>` | clickable name carrying `stuff-id` | `<button data-stuff-id="...">` |
| `<Button>` | action target with `primary` / `action` / `ghost` variants | `<button>` |
| `tokens` | semantic theme values (color / space / font / radius) | `as const` exports |

### `stuff-id` is double duty: interactivity and styling

`<EntityName>` emits a `data-stuff-id` attribute on the rendered
button. The same attribute drives **two** layers from one source:

- **Interactivity** — the click target resolution layer maps
  `stuffId` (via the stuff registry's `primaryKeyword`) to the
  command this affordance sends. `MmlRenderer.commandFor`
  applies the same registry-then-label fallback for identity
  tags; the card mirrors it for contents-list rows and multi-
  focus rows via the parent's `onSendCommand` sink.
- **Styling** — a future theme stylesheet selects on
  `[data-stuff-id]` against the viewer's social-graph bucket
  (friend / foe / self) to colour the name. The
  [social-graph slate](../slates/tails/social-graph-slate.md) +
  [message-rendering slate](../slates/tails/message-rendering-slate.md)
  describe the bucket model. The attribute is emitted today;
  bucket selectors land when that subsystem does, without any
  card changes.

One attribute, two duties — that's the slate's economy. **There
is no `<color>` or `<size>` MML tag**, and no per-tag color
attribute; coloring is always a stylesheet rule keyed off
semantic markup.

### Multi-focus rows: groups, eventually

Per [grouping.md](./grouping.md), the multi-
cardinality `$focus` result is in principle a **group** — `focus
friends` resolves a group via `GroupApi`; the card renders its
members. v1 has neither `GroupApi` nor friend/foe bucketing, so
the row shape is just "a list of styled names" — and that's the
shape it stays. When `GroupApi` lands, the card resolves the
group server-side via the same `$focus` subscription and the row
component (`<EntityName>` already carrying `stuff-id`) absorbs
the bucket selector without further work.

## Reconnect behavior

⭐⭐ **Cards do not replay, because the client never opened them.**

On `connection-established` the wire client replays the one
subscription it owns — `chrome: 'self'`, the widget shelf — and nothing
else. The CARD set is server state on the `CardRegistry`, keyed by
`Interactive`; a reconnect that lands on the same Interactive still has
its cards, and one that does not is a new session whose arrangement
`Avatar.enter` applies.

⚠ That is a real simplification over the predecessor, which replayed
every subscription's stored spec and had to reconcile the results
against a client-side card set. The failure it removes is the one that
was found live: a result arriving after the client's own unsubscribe —
which React's double-mount produces on **every dev page load** — looked
like an unknown handle and was adopted as a spurious card.

⚠ A `card-opened` for an instance the client already knows is an
idempotent overwrite, so a duplicated push cannot fork the set.

## What ships unbuilt

⚠ **Rewritten against the tree.** The predecessor's list still named
*mobile responsiveness* and *a tab strip* as unbuilt; both had shipped.
A stale hatch is worse than no hatch — it tells a reader the surface
does not exist when it does, and the wiki-search hatch in this same
build was written from exactly that kind of stale table.

- **A card the server pushes for a reason other than a command.** The
  arrangement resolver and the prompt substrate are the only two
  non-command pushes, and both are server code by construction. An
  authored or pack-shipped card would be a third tier and wants a
  resolution order across all three — a design conversation, not a
  map edit.
- **A second LIVE row.** `place` is the only one, and adding another
  means either an existing wake or building one. `who` is the worked
  example of why: a presence wake means every login poking every open
  `who`, which is real cost for a list one click refreshes.
- **A card the player can create.** The catalogue is code; a player's
  *arrangement* (which cards, in what order) is clientState. There is
  no `cockpit card open <query>` and there must not be — the client
  supplies an identity, never a query.
- **Multi-card / split view inside one card.** One card, one body.
- **Persistent pins across reconnects.** A pin is a statement about a
  MOMENT (*keep the card about Bob open even though Bob walked out*);
  an ARRANGEMENT is a statement about a workspace and is durable. The
  asymmetry is deliberate and is worth restating because saved
  arrangements sit right beside it.
- **Animated card transitions.**
- **Per-fact revelation gating beyond visible.** Each property is
  either in the detail field-set or not surfaced; per-fact provenance
  (which act revealed this, at what fidelity) ships with the
  perception subsystem.
- **Accumulate-per-card body.** Latest-only — each resolve replaces the
  snapshot. The union of percepts across `look` / `measure` / `appraise`
  waits for the revelation-condition spine.
- **Display-flag vocabulary on `find`** (`--bare`, `--with vitals`),
  **`find --focus`**, and **pinned `find` results as a card.** `find`
  renders to the terminal.
- **Shift-click alternative on multi-row.** Plain click sends
  `look <that>`.
- **Right-click context menus on MML affordances.**
- **An admin / author projection on a card** — no `templatePath` /
  `mixins` / `containerPath` on the wire. When admin needs arrive they
  land with verified substrate rather than client-side speculation.
- **Channel stylesheets, `<color>` / `<size>` / heavy layout tags.**
  The core stays semantic.

### ⚠ Recorded, not closed

- **`chat on` does not wake an open rail.** Firing from
  `SubjectCatalogue` was tried and reverted (it breaks
  persist-then-fire). The card push is the obvious new seam — `chat on`
  could open or touch a card, and the push would be the wake — but the
  rail is not a card, so this stays recorded rather than half-wired.
  **Do not re-try the reverted seam.**
- **`HERE` rows render `something` — and the requirements' framing of
  WHY is wrong.** They say two visibility gates disagree:
  `Container.contents` keeps a child on `PerceptionApi.perceives`, then
  `projectFields` re-points `displayName` through
  `RecognitionApi.describe`, whose `canSeeGate` says no.

  ⭐ What the tree shows is that they answer **different questions**.
  `perceives` is the **concealment** gate (*is it hidden from you*);
  `canSeeGate` is the **light** gate (`VisionModality.canSee` → the
  perceived band against `REQUIRED_BAND_FOR_DETAIL`). `LookController`
  applies **exactly the same pair**, so the card and the prose agree by
  construction — both would say `something` in the same conditions.

  So the likely defect is not gate arbitration but the **light band of
  ordinary rooms**, which is a light-model question rather than a
  perception one. Recorded here rather than fixed, because the next act
  is to read the band at the room the report came from — and if lit
  rooms also render `something`, the fix is in the light seeding and
  this framing was the thing that was wrong.
- **The radial's `stuffId` on transcript nouns.** Fourteen emitters
  interpolate `getName()` / `getPresentation()` into `Mml.compose`,
  which produces escaped TEXT rather than an identity-bearing tag, so
  the radial has nothing to hook. Most are confirmations and greetings
  where a radial would be meaningless; the handful that name a real
  world object want `Mml.thing` / `Mml.actor`. Bounded and recorded
  rather than swept, per the plan's own instruction not to open the tag
  vocabulary over it.

## Known future considerations

Flag-don't-fix; just record so future debugging knows the
substrate's choices.

### Per-viewer presentation isn't modeled on the client

Disguise / recognition will eventually want different
`displayName` / `primaryKeyword` per observer. The substrate
already projects per-viewer (each subscription's `viewer` is the
holder's Interactive, so wire payloads are already viewer-
specific). The single client-side `stuffRegistry` slice assumes
one viewer per session, which is true for v1's player-only
client; admin spectating, multi-viewer surfaces, or any "see
this through another's eyes" feature will need to revisit the
registry's keying. Likely shape: a `viewerId` axis on the Map
key, or a per-viewer sub-slice that the renderer routes through.

### Last-writer-wins on conflicting records

Two subscriptions could ship records with different `displayName`
for the same stuff-id — legitimately (under per-viewer
projection, recognition state shifting between subscribes) or as
a bug. Today's merge ("fields present overwrite; absent stay")
accepts the first case silently and provides no signal for the
second. Worth knowing when debugging "why does this thing's
name suddenly differ from what I expected." A future contention-
detection pass could log when an upsert overwrites a non-empty
field with a different value; today the registry is intentionally
quiet.

### Eviction policy upgrade path

Sessions are bounded today, so the never-evict policy is fine.
When sessions get long (long-running NPC tutors, persistent
classroom sessions, etc.), eviction will need a strategy (LRU,
reference-counted by active subscriptions, or session-cap). The
upgrade is clean: consumers only call `Map.get`, so any eviction
policy lands behind the existing read shape without changing
call sites. The decision point is when the registry footprint
crosses whatever profiling threshold makes it the next
optimization candidate.

## Build history

Several substrate shapes shifted during MR iteration. Recording
them here so future debugging knows the substrate's choices
weren't always the obvious ones:

- **Canonical-kind registry retired.** The build initially
  shipped a server-side `MqlSubscriptionApi.registerKind` /
  `CanonicalKindSpec` registry that let clients subscribe by
  name (`'me.focus'`). The registry was a pure server-side
  macro over the wire — same bytes, alias-only — so it was
  demolished in favor of clients sending the raw spec
  (`subscribeMql(spec)`). The substrate's `focusDependent` /
  `locationDependent` flags are now part of the request,
  not derived from a registered kind.
- **`me.location` subscription landed.** Added as a second
  client-issued subscription to drive the breadcrumb root
  (separate from the focused-thing body). Required adding
  `locationDependent` to the substrate's `SubscribeRequest`
  shape and firing `FieldChangedEvent { field: 'container' }`
  from `Containable.setContainer`.
- **`primaryKeyword` descriptor relocated.** Originally on
  `Stuff.subscribableFields` with an inline mixin gate
  (`MixinApi.isPerceptible`); moved onto
  `PerceptibleMixin.subscribableFields` per the rule "mixin-
  gated renders go on the mixin that owns the gate."
- **`getMarkupLong` relocated, augmenter pipeline added.**
  Originally on `Detailed` interface/impl with `VisibleMixin`
  duck-typing into it. The method moved to `VisibleMixin` and
  the wrap-detail-keys logic became the first
  `MarkupAugmenter` contribution. Substrate added: the
  `MarkupAugmenter` type + `augmentMarkup` helper in
  `api/mml.ts` and the `MixinApi.getAllMarkupAugmenters`
  prototype-chain walker. Future contributors (exit-direction
  auto-link, language gating, spoiler hide) plug in via
  `static markupAugmenters` on their mixin.
- **`skip_focus_when_option` retired in favor of phase
  effects.** Originally a single-purpose YAML field on
  positional args; replaced by the dispatcher's phase /
  effects vocabulary in `api/command.ts`. The `look --peek`
  YAML now declares
  `effects: [{phase: 'focus-update', action: 'skip'}]`.
- **Unified breadcrumb.** Two parallel strips (top focus
  breadcrumb + in-body detail trail) collapsed into a single
  strip: root + trail + detail segments. The in-body
  `DetailTrail` was deleted.
- **First-delivery auto-paint.** The original spec said "focus
  changes clear the body; explicit `look` paints." On a fresh
  session that left the card sitting on the placeholder until
  the player typed `look`. First-delivery auto-paint elides
  the cold-start step without changing the focus-shift-clears
  rule.
- **Admin extras removed.** Originally shipped as forward-
  compatible scaffolding (template-path + mixins + container-
  path display, `clone` / `reload` / `eval` buttons). Removed
  because the substrate doesn't project the fields and the
  auth slice has no `isAdmin` flag — the scaffolding was
  permanent dead code. Future admin needs land with verified
  substrate.

Commit range: `41240c7..HEAD` on the `inspection` branch.

### The card-surface build (`build/card-surface`)

The wave that turned the inspection *pane* into the card *surface*. What
it retired is the majority of it:

- **The focus signal.** `usePaneFeed`'s focus-watching effect,
  `openSubjectPane`, the `inspect` and `location` catalogue rows, and
  the App-level paint/clear policy with its client-side verb peek. The
  lesson paint/clear taught — *focus is a pointer; look is the verb that
  paints* — is now taught by `look` minting a card, which is stronger.
- **The five holds** (`CardHold`, `HOLD_WAKES_ON`, `evaluateHold`,
  `anySubject`, `emitReleased`, `MqlSubscriptionReleasedEnvelope` and
  its four spatial reasons), for one relevance window plus `pinned`.
- **The switcher** (`PaneSwitch` / `PaneTab` / `PaneSlot`, `rightPane`),
  and with it `WhoPane` / `NewsTickerPane` / `WikiPane` as hand-written
  surfaces with their own data paths. Their row-rendering knowledge was
  **salvaged** into `CardBodies`; what died is the pane shell, its 360px
  chrome and its tab.
- **The CMS's own four-tab mode bar** (`CmsSurface`) — a second
  switcher, in the second column, for the same expired reason.
- **The client's husk `setInterval`**, so there is exactly one clock.
- **`pushed: true`**, because the distinction it drew disappeared: the
  client never opens a card, so every `card-opened` is a push.

Two things were changed AGAINST the plan and are recorded where they
live: `place` ships **live** (the plan's table said static while its
driving script drove "the one live card"), and the `shell.result` filter
keys on **`meta.carded`** rather than on the topic `shell.result` (the
per-card prose audit falsified decision 10's premise).
