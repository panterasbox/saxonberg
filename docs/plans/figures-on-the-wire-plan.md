# Figures on the wire — implementation plan

Executes
[figures-on-the-wire-requirements.md](../requirements/figures-on-the-wire-requirements.md).
Read that first — this plan assumes its decisions and does not re-argue
them.

**Read before starting:** [messaging.md](../subsystems/messaging.md),
[topics.md](../subsystems/topics.md),
[mql-subscription.md](../subsystems/mql-subscription.md),
[quantities.md](../subsystems/quantities.md). Skim
[renown.md](../subsystems/renown.md),
[influence.md](../subsystems/influence.md),
[advancement.md](../subsystems/advancement.md),
[trait.md](../subsystems/trait.md),
[participation.md](../subsystems/participation.md) for their append
paths.

Seven waves. **Waves 1–5 are independent of each other** and may be
built in any order or in parallel; Wave 6 needs all of them; Wave 7 is
the doc pass. Each wave ends green.

> ⚠ **Branch discipline.** Four worktrees share one bare repo. Check
> `./tools/wt-status` first, stage by name, never `git add -A`. See
> [CLAUDE.md § Worktrees](../../CLAUDE.md).

---

## Wave 1 — the `<quantity>` tag: register it, extend it, seal it

### 1.1 Register the tag

`packages/server/src/mud/api/mml/tags.ts`

- Add `'quantity'` to `KNOWN_TAGS`, in a new comment group —
  "Measured values" — beside the identity/affordance block.
- **Do NOT add it to `INERT_TAGS`.** A quantity is a factual claim on
  the server's authority, exactly like `speech`; a player who could type
  it literally into chat could forge instrument data.
- Verify `passthroughAllows(policy, 'quantity')` is false for every
  `TagPolicy` value (`'none' | 'spoiler' | 'inert' | 'all'`) — note that
  `'all'` may admit it by construction; if so, confirm which surfaces
  use `'all'` and whether that is acceptable, and **say so in the MR
  rather than silently widening**.

> **Why this is a bug fix, not just setup.** `<quantity>` is emitted
> today but is in no vocabulary, so `Mml.isKnownTag('quantity')` is
> false and by the documented rule it becomes a *component candidate*
> whose name resolves to the module path
> `/lib/wiki/components/quantity`. Registering it closes that.

### 1.2 The measurement-channel vocabulary

**New file:** `packages/server/src/mud/lib/perception/MeasureChannel.ts`

A named-vocabulary module in the subsystem that owns perception — the
Module Categories table's "Named value-object / vocabulary / registry"
row. Export the closed list plus its type, in the `CHANNELS` /
`Channel` shape `lib/material/Channel.ts` already uses:

```ts
export const MEASURE_CHANNELS = [
  'thermal', 'mass', 'light', 'atmosphere', 'chemistry',
  'electrical', 'position', 'time', 'weather', 'response',
] as const;
export type MeasureChannel = (typeof MEASURE_CHANNELS)[number];
```

> ⚠ **This is NOT `lib/material/Channel.ts`.** That one is
> `edge · point · blunt · shock · heat` — how *force is delivered to a
> material*. This is *what kind of reading this is*. They are homonyms;
> merging them makes `heat` mean two unrelated things at two layers.
> Put a comment saying so at the top of both files.

### 1.3 Extend `Quantity`'s markup

`packages/server/src/mud/lib/quantity.ts` (`buildMarkup` ~line 975,
`toMml` ~956, `formatMml` ~966)

Thread an options bag through both public emitters into the one private
builder:

```ts
export interface QuantityMarkupOptions {
  channel?: MeasureChannel;
  /** Instrument provenance — how the reading was taken. */
  via?: string;
  /** Optional working range, in the same unit as `value`. */
  lo?: number;
  hi?: number;
}
```

- `toMml(viewer?, scaleName?, opts?)` and
  `formatMml(viewer?, scaleName?, opts?)` — **append** the parameter;
  every existing call site keeps working untouched.
- `buildMarkup` emits each attribute only when supplied. Existing
  `unit` / `value` / `tag` behaviour is unchanged.
- **Escape every attribute value** via the existing `escapeText`, the
  way `unit`/`value`/`tag` already are. `via` is the one that can carry
  authored text.
- Attribute order in the emitted string must be stable (the order in
  the requirements' example) so snapshot tests do not thrash.

### 1.4 Thread channel + provenance from the emitters

`packages/server/src/mud/obj/command/perception/` — the `Measure*`,
`Analyze*` and `Weigh` controllers.

Apply the **rule**, not a list: every reading that is a scalar with a
unit passes `channel` and `via`, plus `lo`/`hi` where the emitter knows
a working range. `via` is the instrument the controller already checks
for — `MeasureTemperatureController` already requires a `Thermometer` in
inventory, so `via` is that instrument's presentation.

Mapping (from the requirements' decision):

| Channel | Controllers |
|---|---|
| `thermal` | MeasureTemperature |
| `mass` | Weigh |
| `light` | MeasureLight, MeasureShadow |
| `atmosphere` | MeasureAtmosphere, MeasureHumidity, MeasurePressure |
| `chemistry` | AnalyzeChemistry |
| `electrical` | AnalyzeElectrical |
| `position` | MeasureAltitude, MeasureGravity, AnalyzeAddress |
| `time` | AnalyzeTime |
| `weather` | AnalyzeWeather, AnalyzeSky |
| `response` | AnalyzeResponse — **grid, stays prose**; channel reserved |

**Non-scalar readings keep their prose rendering.** If a controller's
output is a grid, composition or qualitative band rather than one number
with a unit, leave it alone and note it in the MR.

### 1.5 Tests

`packages/server/src/mud/api/mml/__tests__/` and
`packages/server/src/mud/lib/__tests__/`

- `quantity` ∈ `KNOWN_TAGS`, ∉ `INERT_TAGS`.
- `passthroughAllows` rejects it per 1.1.
- **Flatten pins children verbatim** — a test that asserts
  `flatten('<quantity …>1240 °C</quantity>') === '1240 °C'`. No
  `flatten` case is added; the `default` branch already does this, and
  the test exists so a future case added above it cannot break the
  contract silently.
- `buildMarkup` with and without each optional attribute.
- **The totality test**: enumerate the measurement controllers, drive
  each, assert no output contains a bare numeric-with-unit outside a
  `<quantity>`, and that every emitted `<quantity>` from a scalar
  reading carries `channel` and `via`. This is the acceptance criterion
  in executable form — write it so adding a new measurement verb without
  a channel fails.
- Every `MEASURE_CHANNELS` member is reachable from at least one
  controller (catches a vocabulary entry nothing emits).

---

## Wave 2 — the five topic facets

### 2.1 The wire type

`packages/types/src/index.ts` (`TopicDescriptor`, ~line 1666)

Add the five fields. All **required**, not optional — a sometimes-absent
facet puts the fallback back in the client, which is the defect this
build removes.

```ts
address:  'direct' | 'personal' | 'ambient' | 'broadcast';
actor:    'self' | 'person' | 'world' | 'system';
weight:   'consequence' | 'activity' | 'chatter' | 'diagnostic';
audience: 'player' | 'author' | 'all';
durable:  boolean;
```

Export the four value unions as named types beside it so the seeds'
validator and any consumer share one list.

### 2.2 Read them in the catalogue

`packages/server/src/mud/obj/TopicCatalogue.ts`
(`loadCacheFromTemplates`)

**Follow the `communicative` precedent exactly**: the facets are
authored in each seed's `data:` block and read straight off `tpl.data`
in the loader. Topic *instances* are never cloned, so `Topic.ts` does
not need fields for them — do not add any.

The three-tier resolution in `getDescriptor` must carry facets through
**all three** tiers:

1. **Cache hit** — verbatim.
2. **Family-inherited** — inherit the ancestor's facets along with its
   description.
3. **Derived default** — must still produce all five. Use the
   conservative floor: `address: 'ambient'`, `actor: 'system'`,
   `weight: 'diagnostic'`, `audience: 'all'`, `durable: false`. An
   unknown topic should be quiet, not loud.

### 2.3 Author the facets across the ~90 seeds

`packages/server/src/mud/seeds/obj/Topic/*.yaml`

Derive first, review second. `audience` and `actor` fall out of the
family prefix mechanically (`system.*` → `system`/`all`, `world.*` →
`world`/`player`, `author.*` → `system`/`author`, and so on). Write the
derivation as a **one-shot script under
`packages/server/scripts/`** — the `migrate-lib-to-obj.ts` /
`lib-to-obj-moves.ts` pair is the precedent — run it, then hand-review
only the topics the derivation gets wrong.

The requirements' worked table is the fixture:

| Topic | address | actor | weight | audience | durable |
|---|---|---|---|---|---|
| `world.chat.message` | broadcast | person | chatter | player | true |
| `world.expression.emote` | ambient | person | activity | player | false |
| `world.narration.action` | ambient | world | activity | player | false |
| `system.command.error` | personal | system | consequence | all | false |
| `system.log.command` | personal | self | diagnostic | all | false |

**Do not touch any topic path, label or description** — those are S3.

### 2.4 Tests

- Every seeded topic resolves with all five facets populated —
  assert across the real seed corpus, not a fixture subset.
- The family-inherited tier carries facets.
- The derived-default tier produces the conservative floor.
- The worked table above, asserted row by row.

> ⚠ **The seeder is INSERT-ONLY.** Editing a seeded topic's `data:` does
> nothing on a database that has already booted. The dev loop is drop
> the `domain` rows under `/obj/Topic/` and restart. Note this in the MR
> — a reviewer running against an old DB will see no facets and think it
> is broken.

---

## Wave 3 — ledger append events

### 3.1 Five event classes

**New files** in `packages/server/src/mud/lib/events/`, following
`ReactionFiredEvent.ts` exactly — a payload interface, a class with
`static readonly KIND`, `readonly kind`, and a payload constructor.
Concrete named classes, **not `GenericEvent`**: these have stable
payloads other subsystems will consume, which is the line
`GenericEvent`'s own doc draws.

| Class | `KIND` | Fired from |
|---|---|---|
| `RenownAppendedEvent` | `renown.appended` | `RenownApi.append` (`api/renown.ts:76`) — or its logic singleton if the Api is a forwarder |
| `ParticipationAppendedEvent` | `participation.appended` | `ConsumerLogic` (~`obj/api/ConsumerLogic.ts:122`, `new ParticipationEvent()`) |
| `ProducerAppendedEvent` | `producer.appended` | `ProducerLogic` (~`obj/api/ProducerLogic.ts:107`, `new ProducerEvent()`) |
| `TranscriptAppendedEvent` | `transcript.appended` | `AdvancementApi.recordSignature` + `recordDeed` |
| `DispositionAppendedEvent` | `disposition.appended` | `TraitApi.recordSignature` + `recordDeed` |

Payloads carry at minimum the **subject id** (what the standing is
keyed on) and the **scope/stock/discipline/axis** the append touched, so
a listener can decide whether it cares without re-reading the ledger.
Keep them raw and uninterpreted — no bands, no scores. `ReactionFiredEvent`'s
doc is the model for that posture.

### 3.2 Fire them

At each append site, after the write succeeds, `EventApi.fire(new
XAppendedEvent({…}))`. **After** the persist, never before — a listener
that recomputes must not read a ledger that has not been written.

Two appends per site for advancement and trait (`recordSignature` and
`recordDeed`); both fire.

### 3.3 Tests

Per ledger: append, assert the event fires once with the right payload;
assert it fires *after* the row is readable.

---

## Wave 4 — the five derived subscribable fields

### 4.1 Declare them on `Avatar`

`packages/server/src/mud/obj/Avatar.ts`

Add `static subscribableFields: SubscribableFieldDescriptor[]` — the
class has `static fieldMeta` (~line 193) and no subscribable list yet.
`lib/material/Tangible.ts` (~line 135) is the shape to copy.

**On `Avatar`, not a new mixin.** `lib/renown/`, `lib/influence/` and
`lib/participation/` contain no mixins at all — those subsystems are Api
+ logic singleton + collection. A `StandingMixin` for five fields on one
class is the per-feature minting the conventions warn against.

| Field | `read` calls | `changes` on |
|---|---|---|
| `playStanding` | `InfluenceApi.bandOf(id, 'consumer')` | `ParticipationAppendedEvent` |
| `makeStanding` | `InfluenceApi.bandOf(id, 'producer')` | `ProducerAppendedEvent` |
| `renown` | `RenownApi.renownOf(id)` | `RenownAppendedEvent` |
| `dominantTrait` | `TraitApi.pronouncedFor(avatar)` → first | `DispositionAppendedEvent` |
| `practisingCompetence` | `AdvancementApi.bandsFor(avatar)` → most recent | `TranscriptAppendedEvent` |

Return **structured values**, not strings — `{ value, band }` or
equivalent, never a pre-rendered sentence. That is the entire point of
the build.

### 4.2 The async problem

`SubscribableFieldDescriptor.read` is **synchronous**
(`read?: (stuff, viewer) => unknown`), but `TraitApi.pronouncedFor`,
`AdvancementApi.bandsFor` and `AdvancementApi.bandFor` are **async**,
while `InfluenceApi.bandOf` and `RenownApi.renownOf` are sync.

**Resolve this before writing the descriptors, and do not paper over
it.** Two shapes are acceptable; pick one and say which in the MR:

- **(a)** The two async figures read from an already-warmed cache the
  ledger event populates — the append event is the invalidation signal,
  so the field's `read` is a cache lookup. Fits the existing
  derive-on-read-with-a-cache pattern used by `renown` /
  `participation` standings.
- **(b)** Widen `read` to allow a promise and have the subscription
  resolver await it.

(a) is preferred — it is local to this build, and (b) changes a
substrate contract that S2 and the pane feed will both lean on, which is
a decision that deserves its own conversation. **If (b) looks necessary,
stop and raise it rather than doing it inline.**

### 4.3 Call security

The ledger Apis are gated. `read` is invoked by the subscription
resolver, not by a command, so the principal must come from the
execution context — **never passed as a parameter**
(`gated-api-actor-from-context`). Confirm the resolver establishes a
context; if it does not, that is a finding to raise, not to work around.

Scope is **self-only**: the descriptors resolve for the subscribing
viewer's own Avatar. Do not build other-viewer projection — `profile`
owns that, with a redaction model this must not duplicate.

### 4.4 Tests

- Subscribe to your own Avatar, assert each of the five resolves to a
  structured value.
- Drive a real append per ledger; assert the subscription delta carries
  the recomputed figure.
- Assert a viewer subscribing to *another* Avatar does not receive them.

---

## Wave 5 — the standing backfill script

**New file:** `packages/server/scripts/seed-standing.ts`

Takes a character name/id and writes plausible history into all five
ledgers. `migrate-currency.ts` and `currency-census.ts` are the
precedent for shape, argument handling and mongo access.

- **Idempotent** — re-running does not double the history. Stamp the
  seeded rows so a re-run can detect and skip them.
- Spread appends across a realistic time span, because the practice
  record and the standing curve are both *shaped over time*; a burst of
  rows at one timestamp renders as a spike and proves nothing.
- Enough volume that all five figures read non-zero and the trade mix
  has visible structure.
- Writes **only** to the five ledger collections. It does not mint an
  Avatar, touch `domain`, or create world content — that is
  [demo-slate](../slates/builds/demo-slate.md) item 2.

Document it in the MR with the exact invocation, since this is the
command anyone re-running after a wipe will need.

---

## Wave 6 — ⚠ the live drive

**This wave is the point of the build, not a formality.** Everything in
Waves 1–5 produces data for a consumer that does not exist, which is
exactly the condition under which a green suite means nothing.

Wire a **throwaway** harness into the current client and observe all
three surfaces working end to end:

1. A `<quantity>` reading rendering in today's `MmlRenderer` with its
   channel and provenance visible — drive `measure temperature` at a
   forge or heat source.
2. A facet-driven filter in today's `TabStrip` — a "quiet" rule
   expressed as `weight ≤ activity`, one rule rather than a topic list.
3. A live standing figure in a scratch widget — run `seed-standing.ts`,
   observe a real number, then drive an action that appends to a ledger
   and watch it change without a reload.

None of this client code is intended to survive the rebuild. Say so in
the commit message so the sweep does not try to graduate it into
`docs/subsystems/`.

**Record the drive in the MR** — the commands run and what came back.
Controller tests skip the binder, so the YAML verb shape is untested
until something types it.

---

## Wave 7 — documentation

- [messaging.md](../subsystems/messaging.md) — the `<quantity>` tag: its
  attributes, its non-inert rule, and why it is one tag rather than
  `<measure>` beside it.
- [topics.md](../subsystems/topics.md) — the five facets, the
  derivation, the all-three-tiers completeness invariant, and the
  insert-only reseed loop.
- [mql-subscription.md](../subsystems/mql-subscription.md) — derived
  ledger-backed fields, and whichever answer Wave 4.2 took.
- [quantities.md](../subsystems/quantities.md) — the extended markup and
  the options bag.
- [renown.md](../subsystems/renown.md),
  [influence.md](../subsystems/influence.md),
  [advancement.md](../subsystems/advancement.md),
  [trait.md](../subsystems/trait.md),
  [participation.md](../subsystems/participation.md) — each notes its
  append event.
- **Leave `docs/slates/README.md`, `CLAUDE.md` and `roadmap.md` alone** —
  index lines are swept, not raced.

---

## Verification checklist

Run before the MR:

```bash
pnpm lint
pnpm lint:gates
pnpm lint:instanceable
pnpm lint:imports
pnpm lint:module-scope
pnpm test
```

Plus the twelve acceptance criteria in the requirements doc, which this
plan's tests are written against one-for-one.

## Known traps

- **`<quantity>` already exists.** Do not add a `<measure>` tag. If you
  find yourself writing one, re-read the requirements' first surface
  decision.
- **The two channel vocabularies are homonyms.** `lib/material/Channel.ts`
  is not this build's channel list and must not be imported by it.
- **The seeder is insert-only.** Facets will not appear on a booted
  database until the `/obj/Topic/` rows are dropped and the server
  restarted.
- **`TopicCatalogue` warms from template documents, not Topic
  instances** — so it does *not* have the reference-Idea-inert-at-boot
  failure that hit `Material` and `Condition`. Keep it that way; do not
  "fix" it into cloning instances.
- **Fire ledger events after the write, never before.**
- **`read` is sync; two of the five figures are async.** See Wave 4.2.
- **Attribute values must be escaped.** `via` can carry authored text.
