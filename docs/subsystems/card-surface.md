# Inspection card

The persistent right-column cockpit surface that displays what the
player is currently **focused** on. Sourced from two long-lived
subscriptions opened **by name** — the `inspect` card for the
focused-thing body and the `location` card for the breadcrumb root —
the card composes a live-updated header (focus display name), a
paint/clear-gated body (detail when single-focus, list when
multi-focus), a unified breadcrumb that combines the player's
current location, past focus shifts, and any active detail drill,
plus a Refresh button.

⭐⭐ **The client names a card; the server says what it is.** The
catalogue (`lib/connection/Cards.ts`) owns each card's query,
cardinality, field set, dependency flags and hold, and the client sends
`{ card: "inspect" }` and nothing else. It used to send
`query: "$focus", cardinality: "many", fields: "detail"` — MQL, in a
`.tsx` file — which is the client holding a server semantic, the same
category error as a client deciding its own affordances.

⚠ The forcing reason was identity, not tidiness. A `subscriptionId` is a
client-minted `nanoid` that dies on reconnect, so it could name a card
for one socket and nothing longer — which is why `cockpit layout save`
could only ever write an empty card list. **A card is a NAMED
subscription; a hold is an optional property of one.** Neither of this
card's two carries a hold, and that is correct: paint/clear means a
focus change clears the body rather than closing the card.

⚠ **This card is no longer the catalogue's only consumer.** A third
entry, `self`, feeds the top bar's widget shelf — and it is the one
whose field set is an explicit list rather than an alias, because
neither alias carries a figure *about* the subject. See
[mql-subscription.md § The card catalogue's field sets](./mql-subscription.md)
and [client-shell.md § The widget shelf](./client-shell.md).

Card policy is **paint/clear**: focus changes clear the body to a
placeholder; an explicit `look` against the current focus paints
it from the live subscription record. The substrate is policy-
agnostic — paint/clear is a client concern that exists to teach
the verbs: *focus is a pointer; look is the verb that paints what
the pointer points at.* A first-delivery auto-paint exception
fires on fresh-session mount so the card lights up without
requiring an explicit `look` from the player.

See:

- `docs/subsystems/mql-subscription.md` — the substrate this build
  consumes and extends (`mql-query` one-shot, the
  `focusDependent` / `locationDependent` flags, `primaryKeyword` +
  `contents` field-set extensions).
- `docs/subsystems/messaging.md` — `MarkupAugmenter` (in `api/mml.ts`)
  is the pipeline `VisibleMixin.getMarkupLong(viewer)` walks; this
  is how detail keys auto-wrap in the long description shipped on
  every detail projection.
- `docs/subsystems/command-routing.md` — phase-effect option
  declarations (`effects: [{phase: 'focus-update', action: 'skip'}]`)
  back the `look --peek` flow.
- `docs/subsystems/prompt.md` — the prompt's focus token; the card
  header mirrors it visually but reads from the subscription, not
  the prompt push.
- `docs/slates/tails/client-cockpit-slate.md` — the cockpit layout the
  card slots into.

## File layout

| File | Role |
|---|---|
| `packages/server/src/mud/api/mql-subscription.ts` | `SubscribeRequest` shape (incl. `focusDependent` / `locationDependent`), `handleSubscribe`, `handleQuery`, `REF_FIELDS` / `DETAIL_FIELDS` extensions |
| `packages/server/src/mud/lib/description/Perceptible.ts` | `primaryKeyword` persistent field, `getPrimaryKeyword` / `setPrimaryKeyword`, fail-soft pool validation, `PerceptibleMixin.subscribableFields` descriptor |
| `packages/server/src/mud/lib/spatial/Container.ts` | `contents` descriptor on `ContainerMixin.subscribableFields`, per-viewer visibility projection, `FieldChangedEvent { field: 'contents' }` fires from `addContainable` / `removeContainable` |
| `packages/server/src/mud/lib/spatial/Containable.ts` | `FieldChangedEvent { field: 'container' }` fires from `setContainer` — the load-bearing signal `locationDependent` subscriptions wake on |
| `packages/server/src/mud/lib/command/Focused.ts` | `setFocus` / `clearFocus` fire `FieldChangedEvent { field: 'focus' }`; `subscribableFields` declares the `focus` descriptor so the index entry installs |
| `packages/server/src/mud/lib/description/Visible.ts` | `getMarkupLong(viewer)` — runs the long description through every contributing mixin's `markupAugmenters` |
| `packages/server/src/mud/lib/description/Detailed.ts` | `wrapDetailKeysAugmenter` contributed via `DetailedMixin.markupAugmenters` — wraps canonical detail keys in `<detail>` MML inline |
| `packages/server/src/mud/lib/boundary/Exitable.ts` | `exits` descriptor on `ExitableMixin.subscribableFields` — ships direction + door affordance for the card's exit block |
| `packages/server/src/mud/cmd/perception/find.yaml` | `find` verb YAML view (snapshot enumeration, no `updates_focus`) |
| `packages/server/src/mud/obj/command/perception/FindController.ts` | `find` controller — renders one MML row per match, admin viewers see template-path suffix |
| `packages/server/src/mud/cmd/perception/look.yaml` | `--peek` option declares `effects: [{phase: 'focus-update', action: 'skip'}]` |
| `packages/server/src/mud/api/command.ts` | Phase / effects vocabulary (`COMMAND_PHASES`, `PhaseEffect`, `validatePhaseEffect`, `collectPhaseEffects`, `consumePhaseEffects`); dispatcher consults it at the focus-update site |
| `packages/server/src/mud/api/mml.ts` | `MarkupAugmenter` type + `augmentMarkup` helper — substrate for `getMarkupLong` and future inline-affordance pipelines |
| `packages/server/src/mud/api/mixin.ts` | `MixinApi.getAllMarkupAugmenters` — prototype-chain walker the augmenter pipeline consumes |
| `packages/types/src/index.ts` | `MqlQueryMessage` / `MqlQueryResultEnvelope` / `MqlQueryErrorEnvelope` wire types; `StuffRefRecord.primaryKeyword`; `focusDependent?` / `locationDependent?` on `MqlSubscribeMessage` |
| `packages/client/src/store/index.ts` | Card slice (paint flag, breadcrumb root, breadcrumb trail, detail path, door context, focus name, last result), stuff-registry slice (`Map<stuffId, StuffMetadata>`), `upsertStuffMetadata` |
| `packages/client/src/services/websocket.ts` | `subscribeMql(spec)` / `unsubscribe`, subscription envelope routing, recursive ref-walk that feeds `upsertStuffMetadata` |
| `packages/client/src/components/InspectionCard.tsx` | Card component — unified breadcrumb (root + trail + detail segments), header, paint/clear body, Refresh, door-context exit synthesis |
| `packages/client/src/components/ui/` | Shared cockpit primitives: `<List>` / `<ListItem>` / `<EntityName>` / `<Button>` + semantic theme `tokens` (see "Shared UI components and theme tokens" below) |
| `packages/client/src/components/MmlRenderer.tsx` | `commandFor()` extended to `<item>` / `<name>` / `<location>` / `<object>` + `<detail>` — registry lookup → `look <primaryKeyword>`, label fallback |

## The card's two subscriptions

The card mounts two long-lived MQL subscriptions through the
wire client's `subscribeMql(spec)` method — raw specs, no
indirection layer:

```ts
// Focused-thing body
websocketClient.subscribeMql({
  query: '$focus',
  cardinality: 'many',
  fields: 'detail',
  focusDependent: true,
});

// Breadcrumb root (current location)
websocketClient.subscribeMql({
  query: 'here',
  cardinality: 'one',
  fields: 'ref',
  locationDependent: true,
});
```

The substrate accepts the spec verbatim; there's no server-side
registry of "named subscriptions." Each spec lives in the client
that issues it, and the wire client replays it on reconnect.

### `focusDependent` and the holder-level focus dependency

For a query like `$focus`, the result set is whatever the focus
fragment resolves to — NOT the `FocusedMixin` host. The natural
descriptor walk (which iterates `collectSubscribableFields(stuff)`
for each Stuff in the result set) would miss the focus
dependency entirely.

The `focusDependent: true` flag tells the substrate to install
an additional `(FieldChangedEvent.KIND, 'field', 'focus')`
dependency entry against the **subscription holder** at subscribe
time, in addition to the per-result-Stuff descriptor walk. When
`setFocus` / `clearFocus` fires `FieldChangedEvent { field:
'focus' }` on the holder Avatar, the index entry matches, the
subscription marks dirty, re-resolve runs against the (now-
updated) `$focus` fragment, and the diff produces a delta.

The flag is meaningless for `mql-query` one-shot reads (no
subscription state to wake) and is not carried on the
`MqlQueryMessage` shape.

### `locationDependent` and the holder-level container dependency

Parallel to `focusDependent`. Installs the dep entry
`(FieldChangedEvent.KIND, 'field', 'container')` against the
holder so the subscription wakes on `Containable.setContainer`
fires — i.e., when the player walks, teleports, boards, or
disembarks. The card uses it to keep the breadcrumb root
synchronized with the current room; without the flag, walking
into a new room would not trigger a re-resolve of `here`.

### `$focus` and `here` at re-resolve time

The substrate runs `ShellApi.expandVariables` against the holder
before each (re-)resolve. For the focus subscription, `$focus`
expands to the holder's current focus fragment fresh on every
tick — that's what makes the `setFocus` → dirty → re-resolve
cascade work end-to-end. The location subscription uses the
built-in MQL pronoun `here`, which resolves to the command
giver's container without any synthetic-var or permission
elevation.

### Single-cardinality slot replacement

The location subscription is `cardinality: 'one'`. When the
player walks from room A to room B, the substrate's diff
produces a single `op: 'replace'` carrying the *new* stuffId —
the old slot is implicitly evicted. The card's delta handler
consumes the replace op directly rather than running it through
the generic `applyChanges` helper (which keys by stuffId and
would append a duplicate). The flat-cardinality `me.focus`
projection uses `applyChanges` normally.

## ⭐ The card set — N cards, each held by a condition

The single focus slot became an **N-card set**. Each card's lifetime is
governed by a **hold condition**, evaluated **server-side**, because
these are facts about the world — a client guessing at them is the same
category error as a client guessing at affordances.

### ⚠ A card is a subscription plus a lifetime rule

That is the whole shape, and it is what keeps criterion 11 honest. An
N-card set *is* N subscriptions, so `hold` is a field on the ordinary
`SubscribeRequest`, the card set **is** the existing subscription
registry, and there is no second registry to drift out of step.

Holds are evaluated on the **drain that was already running**
(`MqlSubscriptionRegistry.reresolveAndEmit`), not on a timer of their
own. A card set with its own tick would be a second clock, and two
clocks disagree.

### The five conditions

| Hold | Held while | Released with |
|---|---|---|
| `unanswered` | it owes a reply | `answered` |
| `here` | you are where it opened | `left` |
| `present` | the subject shares your room | `departed` |
| `inReach` | the subject is in reach or in hand | `out-of-reach` |
| `carried` | the subject is on you | `dropped` |

⭐ **`unanswered` was built first, and it earned it.** It is the one the
design leans on — *nothing that is still actionable ever leaves* — and
the only one whose subject is a pending **command** rather than a Stuff.
A shape derived from the four spatial holds would not have fitted it.
It reads `PromptApi.isPending`: absence from the interactive's bucket
**is** "answered", so there is no second flag to go stale.

`here` captures its anchor (the viewer's container) at subscribe time —
"here" is only meaningful relative to a *where*, and the card's own
subject is not it.

### ⚠ The spatial holds are containment predicates, not MQL scopes

Answering them by re-resolving the viewer's own MQL seeds (`peers` /
`reachable` / `inventory`) was tried first and is **wrong**: those
scopes include the room and the viewer themselves, so the scope is never
empty and a hold keyed on "is anything still in scope" can never lapse.

A card that can never close is worse than no card lifetime at all,
because the feature reads as working. The tests caught it. They are
direct containment predicates now, and the viewer never counts as its
own subject — a card about *you* would otherwise satisfy `carried` and
`present` forever.

### ⚠⚠ A hold must install the dependency that lets it fire

A hold is only evaluated when its subscription **re-resolves**, and a
subscription only re-resolves when something marks it dirty. So every
hold except `unanswered` implies `locationDependent` — they are all
questions about where things are relative to the viewer, and without the
holder-level container dependency nothing wakes them.

**Found by driving it live, with eleven passing tests.** A `here` card
was immortal: the viewer walked out, nothing woke the subscription, the
hold was never evaluated, and the card never closed. The suite was green
throughout because **every test called `refreshForInteractive` by hand**
— the manual refresh stood in for the wake production would never
perform, so the tests asserted the *condition* was right while never
exercising whether anything would ask it.

The lesson generalizes past cards: **a derive-on-read answer is dead
unless something invalidates it**, and a test that pokes the deriver
directly cannot see the difference. Any test for this shape should
perform only the world change and assert the consequence — no manual
refresh. A `refresh*` / `drain*` helper appearing in every case of a
file is the smell.

`unanswered` is excluded deliberately: its subject is a pending prompt,
not a position, and the prompt's own resolution is what should wake it.

### Release carries a reason

`mql-subscription-released { subscriptionId, hold, reason }` — a
distinct envelope from the error one, precisely because nothing went
wrong: the card reached the end of its stated lifetime. **A card that
vanishes without a reason reads as a bug**, and the player cannot tell a
rule from a defect.

### ⚠ The pin overrides in BOTH directions

`cockpit card pin|dismiss|auto|list`.

Pinning is **not a sixth hold condition** — it is an override on the
other five. A sixth condition could only ever *keep* a card; it could
never dismiss one whose condition still holds, which is half of what a
player needs.

`dismiss` does not tear the card down inline. It marks the override and
lets the next drain apply it, so a dismissal is released down the same
reasoned path as every other release. A second teardown path is how a
card ends up vanishing without its reason.

## ⭐⭐ The column is a FEED, and the focus card is one slot in it

The right column stopped being one card. It is now a **feed of cards,
newest → oldest**, with the focus card pinned at the bottom under an
`IN FOCUS` label.

```
CARDS  newest → oldest                    1 pinned
┌──────────────────────────────────────────────┐
│ PLACE  the lounge          held · you are here ⚲│
│ Exitable · Detailed · Visible  +9               │
│ WAYS OUT   [go north]                           │
│ HERE       a Teleport Authority terminal …      │
└──────────────────────────────────────────────┘
IN FOCUS
┌──────────────────────────────────────────────┐
│ hall                                            │
│ the lounge                          [Refresh]   │
│ …                                               │
└──────────────────────────────────────────────┘
```

⚠ **The direction note is not decoration.** The terminal runs
oldest → newest and this runs the other way; a reader who is not told
reads a card appearing at the top as a bug.

⚠ **`IN FOCUS` is load-bearing too.** The focus card used to be the
whole column, so nothing had to name it. Under a stack of cards its
breadcrumb renders as a bare orphan word above an unlabelled box —
found by driving, a room called *Terminus Terminal, the station hall*
put a lone `hall` between the PLACE card and the card, attached to
nothing.

### ⭐⭐ One card, and the subject decides what is in it

There is no location view and no thing view. There is **one card** —
*what I am looking at* — and its body renders the sections its subject
HAS:

| section | present when |
|---|---|
| illustration | the subject has one |
| description | clamped to two lines, with `more` — **and its detail words are the links** |
| measured | the subject declares a reading |
| **exits** | the subject is Exitable |
| here | the subject contains something |
| interfaces | at the FOOT — one labelled line of chips, `+N more` inline |
| refresh | always — `look <keyword>` |

⭐⭐ **The details ARE the description.** The body renders the subject's
own markup, so `loudspeaker`, `benches`, `walls` are clickable where
they are written — each a real `look <keyword>` that opens its own card.
A separate `DETAILS` row beneath said the same words twice, once as
prose and once as a list.

⚠ The clamp hides some of those links until `more`. That was the
argument for flattening the prose to plain text, and it is answered by
the toggle rather than by taking the links away.

### The card's controls

**`↻ refresh · ⚲ pin · × close`**, as icons, top right of every card.

⚠ Glyphs are placeholders for a real icon set — the shapes are the
decision, the typeface is not.

⚠ **Refresh is absent when there is nothing to look at yet.** A card
whose subject has not resolved has no keyword to name, and a control
that cannot do what it says is worse than a missing one. A released
husk keeps only `close`: pin and refresh would both promise to act on a
subscription the world has already torn down, while dismissing a husk is
still something you can do to it.

### ⚠ "Interfaces", not "mixins"

The word is the player's, not the engine's. `Trait`, `Property`,
`Capability`, `Facet` and `Faculty` are all defined terms elsewhere in
the engine and were ruled out on that ground; `Interfaces` was chosen
knowing it assumes a programming background, because the row's whole
purpose is that a player learns these names — *"oh, Visible, I
understand what that means applied to something"*.

⚠ **Sorted plumbing-last, and nothing is hidden.** `PostRegistration`
and friends are internal, but a row that dropped them would misrepresent
what the object composes, and an author learning the palette from these
rows would never learn they exist. ⭐ The real fix is authored per-mixin
metadata — a one-line description and a player-facing flag — which is
also what a tooltip explaining each one would read from. Until then the
ordering does the work.

⚠ **The row sits at the foot: one labelled line of chips with `+N more`
inline.** It is a teaching surface — how a player meets the
content-development palette on real objects — so some of it has to be
legible without a click; a bare count taught nothing. The toggle is
inline with the chips because a toggle underneath turns a one-line row
into a two-line one, which is the space moving it down here saved.

⚠ It re-asks the resolver whenever its answer is MISSING, not only when
the subject changes: `clearAffordances` runs after every command, so a
card that asked once on mount lost its composition and never got it
back.

### ⚠⚠ There is no action row, and that is a SERVER gap

It showed the first few enabled verbs from the resolver, which put
`cast · defend · destruct` on a noticeboard, a room and an implant
alike. They are enabled because **the ACTOR can always do them**, not
because the subject affords anything — and `AffordanceEntry` carries
nothing that tells the two apart (`verb`, `description`, `state`,
`reason`, `operand`, `category`). A client-side filter would have to
guess, and a guess dressed as a recommendation is worse than no row.

The radial already answers *what can I do with this* properly: every
verb, with the validator's own words beside the ones you cannot run.
**Until the resolver can say which verbs a SUBJECT affords, that is the
honest place for it** — and that distinction is the thing to build if a
card-level action row is wanted.

⚠⚠ **A zero quantity is "not declared", not "weighs nothing".** `mass`
rides `DETAIL_FIELDS`, so the projection carries it for anything
Tangible whether or not the object set one — an implant that never
declared a weight came back `0 kg`, putting `MASS 0 kg` on card after
card. The knowing cost: a thing that genuinely masses zero shows no MASS
row, and nothing in the world models one.

⚠ A section that does not apply is **absent, not hatched**. An unwired
hatch is the right answer for a figure the surface *promised* and cannot
fill; this body promises nothing, and a room having no readings is not a
gap in the room. Hatching it put *"nothing about this declares a reading
yet"* on every location card — noise claiming to be honesty.

⚠ **No kind chip.** Every card is the same kind, so a label saying so on
each one never varies, in a column where space is the constraint. What
differs between a room and a lamp is which sections render, which is
where a reader can actually see it.

It shipped as a switch over four kinds — `PLACE` / `AGENT` /
`INSTRUMENT` / `MANIFEST` — with four hand-written bodies taken from the
reference art. That made a room and a lamp two components with two sets
of controls for a difference the player cannot name, and it was reported
as exactly that: *"they all have the same controls, they just differ in
what they spotlight because they have different associates."*

### ⭐⭐ Attention drives the feed

Every subject the focus resolves to gets **its own card**, stacking
newest-first. Re-looking at something you already have a live card for
brings it back into view rather than minting a duplicate.

⚠ The `inspect` subscription is the SIGNAL, not the card. It re-points
as focus moves — one subscription, changing subject — which is precisely
what a card must not do: a card that silently became about something
else would make the stack a lie. The signal opens a per-subject
subscription (`subject` in the catalogue) and that one stays about the
thing it was opened for.

### ⭐⭐ Breadcrumbs are for DETAILS, and nothing else

A detail is not a separate object — it is the same Stuff, looked at more
closely. So drilling **stays inside the card**:

- Clicking a detail word **sends nothing**. It descends a level in that
  card's own state. Sending `look <key>` would move the player's FOCUS
  and open a whole new card for something that is not a separate thing.
- The **description swaps** to the detail's prose. Everything below it
  belongs to the object and stays put; the trail above says which level
  you are reading. The object's illustration goes while you are inside a
  detail — the hall's photograph beside the loudspeaker's prose is a
  picture of the wrong thing. When details carry their own media, that
  is where it renders.
- The **trail appears only once you have drilled**, and never before. A
  breadcrumb on an undrilled card is a trail of one, which says nothing.
- Its root is the object: clicking it leaves the detail entirely.
  Intermediate segments pop to that level; the tail is plain text,
  because clicking it would back you out to where you already are.
- ⚠ The root is the subject's **`primaryKeyword`**, not its display
  name. Every other segment is a detail keyword, so anchoring on prose
  changed register halfway: *"the Terminus arrival gate › avenue"*
  against *"gate › avenue"*. The keyword is also the word the player
  would type, which is what the rest of the surface is teaching.
- ⚠ Only **this subject's own** detail aliases are intercepted. `look
  noticeboard` in a room's prose is a different object and still travels
  as a command, opening its own card.
- ⚠ The path resets when the card's subject changes — a different
  subject has different details, and keeping it would leave the card
  claiming to be inside one that does not exist.

⚠ **The trail has no job outside details.** It used to be the focus
history, back when there was ONE slot and you needed to know how you had
got to what it showed. The card stack is that history now.

### The card's controls, and why they are loud

`↻ refresh · ⚲ pin · × close`, top right of every card, rendered as
buttons rather than faint glyphs — a borderless mark in a dim colour is
discoverable only to someone already looking for it, and these are the
three things you do to a card.

### ⭐ Husks age out; live cards never do

A released husk removes itself after two minutes, swept on an interval
by `useCardFeed` (at the layout, so it runs on a phone too).

⚠⚠ **This is the one legitimate duration in the card model.** A live
card's lifetime is a fact about the world — is that person still here —
and putting a clock on it would end something still actionable, which is
the property the whole design rests on. A husk is already dead: it is a
note saying *what you last saw*, its value decays, and how long the
corpse lingers is purely presentational. The count-based bound
(`MAX_RELEASED`) stays alongside it for the player who walks fast.

### ⚠⚠ A husk keeps its name; it does not keep its body

On release the card fades, states its reason, and **clears its
records** — rendering yesterday's contents as if they were current is
the failure the fade exists to avoid. The subject's *name* is kept
(`lastTitle`), because that is not contents, it is which card this is.
Without it a husk read `PLACE where you are · stale · you left`, which
names nothing at all.

### ⚠⚠ `place` is standing, so a lapse re-opens it

`place` is held by `here`, so walking out releases it — correctly. But
it is opened once, on mount, so without a re-open **one movement costs
the player the place card for the rest of the session** and the mode's
arrangement silently degrades to nothing. `useCardFeed` opens the next
one for the room you arrived in.

⚠ A **subject** card (`agent` / `instrument` / `manifest`) deliberately
does not come back. It is about one thing, and re-opening it after that
thing went out of reach would be a card asserting a condition the world
just denied.

### ⚠⚠ The focus card must not FLASH

The `place` card opens with no records and fills in when its
subscription resolves; the focus subscription resolves separately and on
entry usually first. For that beat the duplicate check had nothing to
compare against, so a `LOOKING AT` card for the room you are standing in
appeared and then vanished when place caught up.

⭐ While `place` is open but unresolved the honest answer to *is this a
duplicate?* is **not yet known**, and the honest render is nothing.

### ⚠⚠ The wiring lives at the LAYOUT, not at this column

`useCardFeed()` — which opens the `place` subscription and registers all
three subscription handlers — is called in `WorldLayout`, the one
component that renders at both form factors. It used to be called
inside `CardFeed`, which is the desktop right column: on a phone
**nothing ever wired the store**, so cards the server pushed for a saved
arrangement were dropped on the floor and a card the radial opened
stayed empty forever. Every mobile unit test passed throughout, because
they render a card with a hand-built state and never touch the wiring.

### On a phone the cards come INLINE

Interleave what is causally related, switch what is independent. A card
is caused by what you just did, so on a phone it renders **in the feed,
in causal position** — not a second column, not a drawer. Pinned cards
keep a chip row above the command bar, because a phone cannot hold a
card permanently beside the feed.

## Focus-change signaling

`FocusedMixin.setFocus(fragment)` and `clearFocus()` both fire
`FieldChangedEvent { field: 'focus' }` via the substrate's
`MqlSubscriptionApi.fireFieldChange` helper (same pattern as
`NamedMixin.setName`, `VisibleMixin.setShortDescription`). The
helper's strict-equals short-circuit suppresses no-op
emissions — setting the same focus twice fires once.

`FocusedMixin.subscribableFields` declares a `focus` descriptor
purely so the substrate's dependency index installs the
`('stuff.fieldChanged', 'field', 'focus')` entry. No v1 client
field-set asks for `focus` directly; the descriptor exists for
its side-effect on the index. Without it, `setFocus` fires
events into the void.

The alternatives (a purpose-built `FocusChangedEvent` class, or
modeling focus as a per-Interactive observable in the dependency
index) were rejected because the existing `fireFieldChange`
plumbing handles this exact shape with one line on the setter
and one descriptor on the mixin — zero substrate-level changes.

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

## Paint/clear policy

Client-side; the substrate is policy-agnostic. The card's body is
gated by `cardBodyPainted` (a flag on the inspection-card Zustand
slice):

- **On mount** — initially cleared; the placeholder text is
  cardinality-adaptive (single: *"focused — `look` to inspect"*;
  multi: *"N <summary> focused — `look` to list"*) and clickable
  (sends `look`).
- **First-delivery auto-paint exception**: the very first
  non-empty `me.focus` subscription result on a fresh session
  flips `cardBodyPainted = true` immediately. On a fresh login
  the player would otherwise sit on the placeholder until they
  typed `look`; auto-paint elides that step without changing
  the focus-shift-clears rule for subsequent deltas.
- **On focus change** (incoming subscription delta where the
  focused stuffId differs from the prior cached one): clear the
  detail-drill stack; the door context drops if it pinned to the
  prior focus.
- **On `look` against the current focus** (player typed `look`
  with no target, or `look <X>` where `<X>` matched the focus):
  set painted = true, capture the most recent subscription
  result snapshot to `cardLastResult`, render from it.
- **While painted**: deltas update `cardLastResult` and the body
  re-renders in place (React's natural diff). Containment add /
  remove diffs patch the contents list without re-painting the
  rest of the body.
- **While cleared**: deltas update `cardFocusName` (header
  tracks live focus) and `cardLastResult` (cache stays warm)
  but the body stays in placeholder mode.

The two paths to "the body just changed" — outbound `look` paint
toggle and inbound subscription delta — compose: the command
sent → painted = true → delta arrives → result captured → body
renders. The fragment-change-clears-the-body rule applies to
`focus` verb usage, not `look` verb usage (because `look` is
itself the verb whose semantic is *paint the body*).

Pedagogically this matters: auto-painting on focus change would
blur `focus` and `look` into "the thing that updates the card"
and erase the lesson at the moment players are most likely to
internalize the model. Keeping them visibly distinct teaches the
verb pair.

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

**Choice: latest-only.** The card's `cardLastResult` snapshot is
replaced by each subscription result / delta; there is no per-
fact union across multiple `look` / `examine` / `measure`
invocations. The latest-only path stays internally consistent
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

Same subscription, same field-set (`'detail'` always). The
renderer branches on result-array length:

- **Single (length 1)**: detail view — display name + long
  description (rendered via `MmlRenderer` so embedded MML
  affordances become clickable) + contents list of clickable
  affordances when the focused host is a container.
- **Multi (length > 1)**: list view — one row per match, each
  row's display name rendered as an `<item>`-affordance.

The substrate doesn't know about this branching. Cardinality-
adaptive projection (ship `'ref'` for multi-focus, `'detail'`
for single) was considered and deferred — `'detail'` always for
v1 in exchange for a single uniform projection policy. The minor
inefficiency on multi-focus is accepted.

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

## Breadcrumbs and Refresh

### Unified breadcrumb

The breadcrumb is a single horizontal strip combining three
sources of context:

1. **Root segment** — the player's current location, sourced
   from the `here` (`locationDependent`) subscription. Movement
   reroots the strip; the room is always the first segment.
2. **Trail segments** — past focus shifts since the last reroot.
   Pushed by `applyOutgoingCommandToCard` (in `App.tsx`) when an
   outgoing `look <target>` or `focus <target>` doesn't match
   the current root. Capped at 6 entries; the head dedups
   against re-clicks of the same target.
3. **Detail segments** — the active detail-drill stack on the
   currently-focused Stuff. Pushed inline when the player clicks
   a `<detail>` MML affordance in the body prose.

Clicking the root re-focuses the room (sends `look <keyword>` and
clears trail + detail). Clicking a trail entry pops everything
past it, clears any detail drill, then re-sends the entry's
stored command. Clicking an intermediate detail segment pops the
detail stack to that level; the leaf detail segment is rendered
as a non-clickable system label (you're already there).

Movement always reroots: when the `me.location` subscription's
single-cardinality slot replaces, the prior breadcrumb trail is
discarded.

### Door context

When the player clicks a door affordance inside an exit
projection (e.g. `the front doors` rendered next to `south` in
the lobby's exits), the click site stashes a
`cardDoorContext: {stuffId, direction}` annotation in the store.
The door's own card then synthesizes an "Obvious exits:
<direction>" link in its body so the player can walk through
from the inspection view. The annotation clears on the next
focus shift to a different stuffId.

Pure UI sugar — no substrate change. The door Stuff itself has
no notion of "which exit am I"; the client reconstructs the
relationship from the click site that has both pieces in scope.

### Refresh button

In the card header. Clicks send `look` through the command bus
exactly like any other click affordance — no special API. Stays
enabled in the cleared-body state (that's its primary use).
Clicks queue if a command is in-flight.

## Reconnect behavior

On WebSocket `connection-established`, the wire client replays
every active subscription's stored spec (the full
`{query, cardinality, fields, focusDependent?, locationDependent?,
detailKey?}` shape it was opened with). The server's substrate
ships the initial result. The card's header populates from the
first record; the first-delivery auto-paint rule fires the body
into the painted state.

The substrate's per-subscription state on the server is rebuilt
fresh on each subscribe; there is no resume / replay shape.
Mid-reconnect message loss is invisible because the initial
result envelope is authoritative.

## What ships unbuilt

Per the closed-scope requirements:

- **Tabs / tab strip.** v1 ships a single focus tab with no
  strip UI.
- **Pinned `find` results in the card.** `find` renders to the
  terminal scroll; pinning lands with tabs.
- **Display-flag vocabulary on `find`** (`--bare`, `--with
  vitals`, etc.).
- **`find --focus` flag.**
- **Shift-click alternative on multi-row.** Plain click sends
  `look <that>` (drill-in). The leaned-for alternative gesture is
  shift-click → `find <that>`, peeking a member without collapsing
  the multi-focus; parked until players actually want to inspect a
  group member without leaving the group.
- **`<peek>` MML tag for scrollback clicks.** All clickable
  affordances in the terminal scroll route as plain
  `look <X>` (focus-shifting). No "peek by default for
  backscroll" rule.
- **Per-row aspect families** on multi-focus rows (vitals,
  slots, position).
- **DescribeApi v2 affordances.**
- **Inventory widget** and the `inventory` verb migration.
  Separate tandem slice.
- **New MML tag types** beyond the four already-emitted
  identity tags (`<npc>`, `<player>`, `<command>`, `<quantity>`,
  `<focus>`, etc.).
- **Right-click context menus on MML affordances.** Click →
  `look <label>` is the universal default; tag-specific
  alternative actions ship when the broader gesture vocabulary
  lands.
- **Multi-card / split view.** Single card only.
- **Persistent breadcrumb history across reconnects.**
- **Animated focus transitions.**
- **Mobile responsiveness.**
- **Other Chunk 2.6 supporting infrastructure** — heartbeat,
  `ShadowChangedEvent` firing, MQL global seeds
  (`online` / `world`), `mql-subscribe-update` with
  `refresh: true`. Only the `mql-query` one-shot ships here
  because `find` motivates it.
- **Cardinality-adaptive projection** — `'detail'` always.
- **Other client-issued subscriptions** — the card uses two
  (`$focus`, `here`); future cards / widgets will issue their
  own raw specs through `subscribeMql`. There is no server-side
  registry of "named" subscriptions; each consumer owns its
  spec.
- **Sense/modality system** (feel / smell / listen as separate
  perception channels), the **magic lens**, and
  **skill-deepens-perception.** Recorded as the future
  revelation-condition spine; v1's cut is "visible" only. See
  the *Body discipline* section above.
- **Per-fact revelation gating beyond visible.** Each property
  today is either projected into the detail field-set
  (perceivable as part of the look output) or not surfaced.
  Per-fact provenance (which act revealed this fact, at what
  fidelity) ships with the perception subsystem.
- **Admin / author surface on the card.** No `isAdmin` flag on
  the auth slice today and no `templatePath` / `mixins` /
  `containerPath` projection on the wire. When admin needs
  arrive, they land with verified substrate (descriptor set,
  per-record gating) rather than client-side speculation.
- **Accumulate-per-focus body.** v1 ships latest-only — each
  subscription result / delta replaces the snapshot. The union
  of percepts across `look` / `measure` / `appraise` waits for
  the revelation-condition spine.
- **`GroupApi` wiring on multi-focus rows.** The grouping
  subsystem isn't built; the row shape (`<EntityName>` carrying
  `stuff-id`) is forward-compatible without component changes.
- **Social-graph bucket styling.** `<EntityName>` already emits
  `data-stuff-id`; the friend / foe / self stylesheet rules land
  when the social-graph subsystem does.
- **Channel stylesheets, `<color>` / `<size>` / heavy layout
  tags.** Out of scope per the message-rendering slate's wave
  ordering; the core stays semantic, presentational tags wait
  for opt-in channel scopes.

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
