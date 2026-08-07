# Figures on the wire — requirements

Every figure this game computes currently reaches the player as **prose
inside an MML frame**. `StandingController` calls
`InfluenceApi.bandOf(id, 'consumer')` and `RenownApi.renownOf(id)`, then
renders the answers into a sentence; the measurement verbs compute a
temperature and emit `1240 °C` as characters. A client that wants to pin
a value to a shelf, convert its units, compare it against a working
range, or chart it over time has to re-parse strings it should never
have had to parse.

This build closes that gap on both halves — the **span** half (the
`<quantity>` MML tag) and the **frame** half (topic facets), plus the
**subscription** half that carries a live figure to a widget without a
frame at all. It is Track A steps 1–2 and Track C of
[client-slate](../slates/builds/client-slate.md), which argues why they
are one build: they are the same problem — *structured figures instead
of prose* — and each proves the other.

It ships ahead of any client work because everything in it is additive:
old clients see unchanged flattened prose, and the facets are new fields
on an existing wire type.

Seeded by [client-slate](../slates/builds/client-slate.md) §4.1 and
§4.3, whose source is `docs/design_handoff/MML and Topics - Redesign
Spec.dc.html`. Load-bearing subsystem docs:
[messaging.md](../subsystems/messaging.md),
[topics.md](../subsystems/topics.md),
[mql-subscription.md](../subsystems/mql-subscription.md),
[renown.md](../subsystems/renown.md),
[influence.md](../subsystems/influence.md),
[advancement.md](../subsystems/advancement.md),
[trait.md](../subsystems/trait.md),
[participation.md](../subsystems/participation.md).

## Goals

- **A measured value survives the wire as a number.** Every shipped
  reading that is a scalar with a unit carries its channel, canonical
  value, unit, provenance and (where the emitter knows one) its working
  range — with the server's own rendering as children, so flatten and a
  bare telnet client are unchanged.
- **The tag that already does half of this becomes a registered,
  first-class one.** `<quantity>` is emitted today but appears in no tag
  vocabulary; this build registers it, extends it, and pins its
  security posture.
- **A frame declares what kind of attention it wants**, in data, so no
  client ever again keys a filter, badge, mute or notification decision
  on a hardcoded topic string. Five facets, authored in the topic seeds,
  riding the `TopicDescriptor` snapshot that already ships on
  session-establish.
- **A ledger append is observable.** Each of the five standing ledgers
  fires a typed event when it appends, so anything downstream can
  recompute without polling.
- **The five standing figures are live-subscribable as data.** Play
  standing, make standing, renown, dominant trait and practising
  competence are readable through the existing MQL subscription
  substrate as derived fields, recomputing when their ledger fires.
- **A wiped database can still show a real number.** A backfill script
  writes plausible ledger history onto a named existing character, so
  the figures above read non-zero on a fresh instance without anything
  being hardcoded.
- **The measurement-channel vocabulary exists once**, is closed, and is
  not conflated with the materials-response `Channel`.

## Non-goals

- **The topic renames.** `world.perception.measurement.*` →
  `world.measure.<channel>`, `system.shell.*` → `author.shell`, the
  `system.auth|connection|session` merge, retiring `world.emote`,
  folding `direction` into `exit`, and the player-voice label rewrite
  are all deliberately held for **S3** (client-slate §7). The facets
  land first precisely so S3 can be judged against a working filter
  model rather than a guess. The renames are breaking; everything here
  is additive.
- **The affordance track.** The `mx` digest, the `(id, viewer, now)`
  resolver, `item`+`object`→`thing`, retiring `name`, and the sixth
  `affordance` facet are **S2**, and wait on `build/affordance-scope`
  merging.
- **Any client work beyond a throwaway harness.** See *Verification*
  under Constraints. Nothing in `packages/client` shipped by this build
  is intended to survive the rebuild.
- **Non-ledger shelf figures.** Coin (banking), the world clock (time),
  online count (presence) and the civic docket all appear in the
  handoff's widget catalogue and are **out of scope** — they have their
  own Apis and no ledger-event problem. Only the five ledger-derived
  figures ship here.
- **Other-viewer standing projection.** The five derived fields are
  **self-only**. Reading another character's standing already has a
  surface with a redaction model — the `profile` verb — and duplicating
  its rules on a subscription is how the two drift.
- **Non-scalar readings.** Grid, composition and qualitative outputs
  (the materials resist/deliver grid from `analyze response` is the
  clear case) keep their prose rendering. `<quantity>` is for a scalar
  with a unit; a tag that also had to carry a matrix would be two tags.
- **`<skill>` and `<coin>`.** The spec's own lower-priority additions,
  correctly deferred until the extended `<quantity>` proves the pattern.
- **The aged demo world.** Chronicle depth, chain-of-title history,
  named regulars with belief state and the rest of
  [demo-slate](../slates/builds/demo-slate.md) item 2 remain that
  build's design pass. This build ships only the ledger slice the
  figures need.

## Surface decisions

### ⭐ The spec's `<measure>` is NOT a new tag — it is `<quantity>`, extended

**Superseded decision, corrected during grounding.** The handoff spec
proposes adding a `<measure>` tag, and an earlier draft of this document
agreed. Both were written without knowing that
`Quantity.buildMarkup` already emits:

```
<quantity unit="degC" value="1240" tag="searing">1240 °C</quantity>
```

…and that **every measurement controller already routes through it**,
via `Quantity.formatMml`. The canonical numeric and unit are already on
the wire. What is missing is four attributes and any kind of
registration.

So this build **extends the existing tag** rather than adding a second
one:

```
<quantity channel="thermal" unit="degC" value="1240" tag="searing"
          via="pyrometer" lo="1150" hi="1300">1240 °C</quantity>
```

Shipping `<measure>` beside `<quantity>` was rejected because it would
be **two tags producing one affordance** — precisely the test the spec's
own §4 applies to every other tag ("that is one affordance wearing two
names; the composer pays at every call site and the user gets nothing").
Renaming `<quantity>` → `<measure>` was also rejected: better name, but
breaking, and this build is additive-only. The rename belongs with S3's
other breaking changes if it is ever judged worth it.

The four added attributes: `channel` gives stable identity for pinning
and charting a series. `via` names the instrument — the pedagogical
seam, *a reading is only honest if you can say how it was taken*.
`lo`/`hi` are optional and declare the working range on the server's
authority instead of hardcoding it per craft in the client. The existing
`tag` attribute (a qualitative band, e.g. `searing`) stays; it answers a
different question from `channel` and both are wanted.

**⚠ `<quantity>` is in no tag vocabulary today**, which is a latent bug
this build must fix regardless: `Mml.isKnownTag('quantity')` returns
false, so by the documented rule it is a *component candidate* whose
name becomes the module path `/lib/wiki/components/quantity`. It goes
into `KNOWN_TAGS`, and **never into `INERT_TAGS` or any passthrough
policy** — by the reasoning already written into the inert-tag list, a
quantity is a factual claim about the world on the server's authority,
exactly like `speech`. A player who could type it literally into chat
could forge instrument data, which is worse than misattributing words
because the entire premise of the product is that the numbers are real.

**No `flatten` case is added.** `flattenNode`'s `default` branch already
returns children verbatim, which is precisely the required behaviour. A
test pins it, because relying on a default is fragile the moment someone
adds a case above it.

**`Quantity.buildMarkup` is the single chokepoint**, which is what makes
this cheap: the attributes are threaded through `formatMml`/`toMml`
rather than written at ~18 controller call sites.

### The measurement channel vocabulary is new, closed, and NOT the materials `Channel`

The spec left this open — *does the measurement channel list match the
engine's own channel enum?* **It does not, and they must not be
merged.** `lib/material/Channel.ts` defines `edge · point · blunt ·
shock · heat` — that is how *force is delivered to a material*, the
resist/deliver grid's axis. A measurement channel is *what kind of
reading this is*. They are homonyms: unify them and `heat` means two
unrelated things at two layers.

So this build authors a **separate, closed vocabulary** as its own
named-value module, and every shipped measurement controller maps onto
exactly one member:

| Channel | Shipped readings |
|---|---|
| `thermal` | measure temperature |
| `mass` | weigh |
| `light` | measure light, measure shadow |
| `atmosphere` | measure atmosphere, measure humidity, measure pressure |
| `chemistry` | analyze chemistry |
| `electrical` | analyze electrical |
| `position` | measure altitude, measure gravity, analyze address |
| `time` | analyze time |
| `weather` | analyze weather, analyze sky |
| `response` | analyze response — **grid, so prose in this build**; the channel name is reserved so S3's topic rename has a target |

The same list is what S3's `world.measure.<channel>` renames onto, so it
is authored once and read by both.

### Which readings get the attributes: a rule, not a list

**Every shipped reading that is a scalar with a unit carries `channel`
and `via`**, plus `lo`/`hi` wherever the emitter knows a working range.
Not a hand-enumerated controller list, which drifts the first time a
reading is added. The acceptance criterion is stated against the rule:
no shipped numeric-with-unit reading is left as bare prose or as a
channel-less `<quantity>`.

Partial adoption is explicitly rejected. Half the readings tagged means
the client still needs a string parser, which is the whole defect.

### Five facets, authored in the seed, riding the existing snapshot

| Facet | Values | What it decides |
|---|---|---|
| `address` | `direct` · `personal` · `ambient` · `broadcast` | Badging and notification. `direct` earns a push; `ambient` never does. |
| `actor` | `self` · `person` · `world` · `system` | Gutter colour and voice — replacing colour-by-family, which encodes the emitter. |
| `weight` | `consequence` · `activity` · `chatter` · `diagnostic` | Default filter levels. "Quiet" becomes `weight ≤ activity` — one rule instead of ninety paths. |
| `audience` | `player` · `author` · `all` | Which surface it belongs to. |
| `durable` | boolean | Keep in scrollback and transcripts, or let it age out. |

They are authored in each topic seed's `data:` block and projected onto
`TopicDescriptor`, which the client already receives as
`topicCatalogue: TopicDescriptor[]` on session-establish. **No new
channel, no new endpoint.**

`communicative` is the precedent and the shape to follow: it is authored
in `data:`, read by `TopicCatalogue` straight from the template
documents, and consulted through a catalogue method. Facets work the
same way. **`communicative` itself stays server-only in this build** —
putting it on the wire so the client can explain why an utterance earned
renown is a real idea and belongs with S3's label rewrite, where the
player-facing vocabulary is being settled anyway.

### Facet defaults derive; review touches exceptions

Five facets across ~90 topics is not 450 hand decisions. `audience` and
`actor` derive mechanically from the family prefix (`system.*` →
`system`/`all`, `world.*` → `world`/`player`, and so on). The build
derives defaults for every topic, then hand-reviews only the ones the
derivation gets wrong. The spec's worked examples are the fixture that
proves the derivation.

**Every topic ends with all five facets populated.** A facet that is
sometimes absent puts the fallback back in the client, which is the
defect this build exists to remove.

### Each standing ledger fires a typed event on append

Five ledgers, five event classes — `renown_events`,
`participation_events`, `producer_events`, `transcripts`,
`disposition_events`. **Concrete named classes, not `GenericEvent`**:
these have stable payloads that other subsystems will consume, which is
exactly the line `GenericEvent`'s own doc draws.

This is the only genuinely new mechanism in the build, and it is the
seam that makes every downstream projection — this build's subscription
fields, and later the pane feed — reactive instead of polled.

### The five figures are derived subscribable fields on `Avatar`

They ride `static subscribableFields: SubscribableFieldDescriptor[]`,
whose `read: (stuff, viewer) => unknown` hook is exactly the shape
needed: `read` calls the existing gated ledger Api and returns a
structured value; `changes: [{ on: <LedgerEvent>, by: … }]` drives
re-resolve.

**Declared on `Avatar`, not on a new mixin.** There is no existing host
— `lib/renown/`, `lib/influence/` and `lib/participation/` hold no
mixins at all, because these subsystems are Api + logic singleton +
collection. Minting a `StandingMixin` for five fields on one class is
the per-feature minting the conventions warn against. If a second host
ever needs them, that is when it becomes a mixin.

The five: **play standing** (`InfluenceApi.bandOf(id,'consumer')`),
**make standing** (`…'producer'`), **renown**
(`RenownApi.renownOf(id)`), **dominant trait**, and **practising
competence**. These are exactly what `score` reports today, which is the
point — the data is already reachable; only its shape is wrong.

### The aged-ledger slice is a script, not a boot seeder

A backfill script under `packages/server/scripts/`, taking a named
existing character and writing plausible history into the five ledgers.

Not a `SeederManager` seed (that collection is `domain` templates only)
and not one of the boot seeders in `backend/`, because those run against
a fixed dataset at startup and this has to target **whichever character
is being driven** after a wipe. A script is also the established home
for exactly this kind of one-shot operational tooling.

It is the honest answer to the client's own convention. On a wiping
instance every derive-on-read ledger starts empty, so the shelf, the
practice grid and the standing curve all correctly render `—` — wired,
with nothing to say. The handoff's preference order says the fix is
option 3, *seed the world so the real endpoint answers*, and calls it
"the only version that survives contact with a screenshot."

## Constraints

- **The security gate runs inside `read`.** The ledger Apis are gated,
  and `read` is invoked by the subscription resolver rather than by a
  command. The principal must come from the execution context, never be
  passed as a parameter — see the `gated-api-actor-from-context` rule.
  Self-only scope (above) keeps this narrow.
- **`<quantity>` must not become inert by later drift.** A test asserts
  it is absent from `INERT_TAGS` and rejected by every passthrough
  policy, so a future tag sweep cannot silently admit it.
- **Additive only.** Old clients must render every changed frame
  unchanged. No topic path changes, no tag removals, no `TopicDescriptor`
  field removals. Anything breaking belongs to S3.
- **⚠ Verification is by driving, not by suite.** Everything here
  produces data for a consumer that does not exist yet, which is the
  precise condition under which a green suite means nothing. Each of the
  three surfaces must be observed working end-to-end against the
  **current** client — a `<quantity>` reading in today's `MmlRenderer`,
  a facet-driven filter in today's `TabStrip`, a live figure in a
  throwaway widget. That wiring is disposable and is expected to be
  thrown away by the rebuild; the server contract it proves is
  permanent. Controller tests skip the binder, so the YAML verb shape is
  untested until it is typed.
- **The database will be wiped.** No migration is written for the facet
  additions. The seeder is insert-only, so editing a seeded topic's
  `data:` does nothing on a booted database — the workflow is delete the
  rows and restart, and the demo instance's scheduled wipe makes this
  the standing authoring loop for reference data.
- **`TopicCatalogue` is not affected by the reference-Idea boot bug.**
  It warms `postRegister` by reading template documents directly and
  never clones `Topic` instances, so the facets cannot land inert the
  way `Material` and `Condition` did. Verified, and worth keeping true.
- **Module categories.** The channel vocabulary is a named
  value-object/vocabulary module in the subsystem folder that owns it —
  not a `types.ts`, not a free-floating helper. The event classes go in
  `lib/events/` beside their siblings.

## Acceptance criteria

1. `quantity` is in `KNOWN_TAGS`, absent from `INERT_TAGS`, and
   rejected by every passthrough policy — each asserted by test.
2. `flatten` of a `<quantity>` node yields its children verbatim, pinned
   by a test that does not depend on the `default` branch's position.
3. Every shipped reading that is a scalar with a unit emits `<quantity>`
   with `channel`, `value`, `unit` and `via` populated, and `lo`/`hi`
   wherever the emitter knows a working range. A test enumerates the
   measurement controllers and asserts none renders a bare numeric
   reading or a channel-less `<quantity>`.
4. The measurement channel vocabulary is a closed, exported list; every
   emitting controller maps to a member; a test asserts the mapping is
   total. It is a distinct module from `lib/material/Channel.ts`.
5. All ~90 topic seeds carry all five facets. A test asserts no topic
   resolves with a missing facet, through both the authored path and the
   family-inherited path.
6. `TopicDescriptor` carries the five facets and they arrive in the
   session-establish `topicCatalogue` snapshot.
7. Each of the five standing ledgers fires its typed event on append,
   asserted per ledger.
8. Subscribing to your own Avatar yields the five figures as structured
   values, and each re-resolves when its ledger fires — asserted by
   driving an append and observing the delta.
9. The backfill script populates all five ledgers for a named character,
   and the five figures subsequently read non-zero.
10. **Live-driven end to end**: a measurement reading, a facet-driven
    filter and a live standing figure each observed working in a running
    client, with the session recorded in the MR.
11. Subsystem docs updated: [messaging.md](../subsystems/messaging.md)
    (the tag + its non-inert rule),
    [topics.md](../subsystems/topics.md) (the facets, their derivation,
    the completeness invariant),
    [mql-subscription.md](../subsystems/mql-subscription.md) (derived
    ledger fields), and the five ledger docs each note their append
    event.
12. `pnpm lint`, `pnpm lint:gates`, `pnpm lint:instanceable`,
    `pnpm lint:imports`, `pnpm lint:module-scope` and the full test
    suite pass.

## Cross-references

- **Seeding slate** — [client-slate](../slates/builds/client-slate.md)
  §4.1 (Track A), §4.3 (Track C), §7 (the wave cut). Source design:
  `docs/design_handoff/MML and Topics - Redesign Spec.dc.html`.
- **Follows** — `build/affordance-scope` (ranged + directional command
  buckets) must merge first; S2 depends on it directly, and this build
  should not race it.
- **Blocks** — S2 (affordance resolution) inherits this build's
  subscription answer; S3 (the topic tree) is judged against the filter
  model the facets establish; client Wave 1 reads the figures.
- **Related** — [demo-slate](../slates/builds/demo-slate.md) item 2 (the
  aged demo world, which this build's backfill script is the minimum
  slice of), [attestation-slate](../slates/builds/attestation-slate.md)
  (durable clips, deferred).
- **Subsystem docs** — messaging, topics, mql-subscription, renown,
  influence, advancement, trait, participation.
