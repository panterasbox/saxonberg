# Holding — the residential ladder: plats, warrens, programmes, condition

A **holding** is a place somebody holds: a dorm room, a let unit, a
house on a bought lot. This doc is the source of truth for the substrate
all three ride — the two-tier elastic institution, the authored plat
plan, the per-holding programme, the front door, the weathering clock
and the acts that read and repair it.

The governing shape, and the whole reason there is one doc rather than
three:

> **A holding is a warren one level down.** An institution (a dorm, an
> apartment building, a subdivision) is a `Warren` whose members are
> holdings; a holding is a `Warren` whose members are ROOMS. The two
> tiers are the same machinery at two cardinalities, which is why the
> dorm's one-room bedsit and Hinkley's six-room house are one code path
> with different authored data.

The ladder as shipped:

| Rung | Institution | Holding | Tenure | Upkeep term |
|---|---|---|---|---|
| Granted | `DormWarren` (Duncan Hall) | one room | parcel grant (lease) | `institution-all` |
| Let | `UnitBuilding` (Seznick House) | a multi-room unit | parcel grant (lease) | `landlord-shell` |
| Owned | `LotHolder` (Hinkley Hills) | a house on a lot | parcel **title** | `owner-all` |

The dorm is documented end-to-end in [residence.md](./residence.md);
this doc is what it converged ONTO.

---

## The four roles

Four classes, and each answers exactly one question. Getting a change
into the right one is almost always the whole design decision.

| Role | Class | Question it answers |
|---|---|---|
| The institution | `lib/location/HoldingWarren` (kernel, abstract) | *Which holdings exist, and how do you get to them?* |
| The layout | `lib/location/PlatPlan` (kernel, value object) | *Where does the next holding GO?* |
| The holding | `residence/idea/HoldingProgramme` (pack) | *What rooms is this one made of, and what shape is it in?* |
| The way in | `residence/idea/FrontDoorExit` (pack) | *May you cross this threshold?* |

Two of the four are kernel and two are a capability pack's, and the line
is not arbitrary: the elastic-graph machinery and the layout algebra are
substrate anything could use, while a *residential programme* is content
vocabulary — a floorplan, a tenure term, a weathering clock. The kernel
never imports the pack; where it must read a programme (the `survey`
verb, the `maintains` brain) it does so through the `WarrenMember`
back-ref BY SHAPE, or through MQL by class NAME.

---

## Tier 1 — `HoldingWarren`, the institution

`abstract class HoldingWarren extends Warren`. Everything three
institutions had in common, lifted out of `DormWarren`:

- **the holdings map** (`_holdingsByKey`) — a holding per parcel extent,
  stood up lazily and reaped when empty;
- **the circulation map** (`_circulationByNode`) — the corridors, floors
  and road segments you reach holdings THROUGH, minted on demand from
  `circulationTemplateFor(node)`;
- **the provisioned + keyway caches**, refreshed off
  `ParcelApi.childParcelsOf(parentExtent)` — who has a grant or a title,
  and what keyway opens their door;
- **`admit(key)`** — cache → stand the holding up → wire it → return its
  entry room. The single way in, from a gate, a door, a re-entry after
  dormancy, or a boot re-hang;
- **`capacity()`** — the operator dial (below);
- **the reap invariant**.

### The reap invariant

> **Circulation reaps outside-in.** A node never reaps while a live
> holding hangs off it, or while a live node sits beyond it on its road
> or stair. The graph stays contiguous back to the authored entrance.

An empty middle floor stays standing if floor 3 is occupied, because a
tenant on 3 must be able to walk down. The same rule, horizontal, is
what makes Hinkley's lane honest: segment 2 is impassable until its
frontage sells, and it does not vanish once segment 3 has a house on it.
The rule lives once, in the base's `reconcile`; no institution
re-implements it.

### The policy hooks

Four, and a subclass is expected to override exactly these:

```ts
protected standUpHolding(key: string): Promise<MemberStuff>
protected circulationTemplateFor(node: string): string | null
protected wireCirculationNode(node: string): Promise<void>
protected entryEdgeFor(key: string): Promise<Exit | null>
```

`DormWarren` stands a holding up as a programme over the `dormroom`
row and hangs a `DormDoor`; `UnitBuilding` does the same with
`FrontDoorExit` off a corridor; `LotHolder` does it with a
`LotGateExit` off a road segment. Nothing else differs.

---

## Tier 1½ — `PlatPlan`, the layout as authored data

Where the next holding goes stopped being arithmetic in a class and
became a field on the institution's row. Three shapes:

| Shape | Node | Slot grammar | Who uses it |
|---|---|---|---|
| `static` | an authored node | authored | a venue with a fixed set of rooms |
| `linear` | an index (a floor) | `f<n>-r<p>` / `f<n>-u<p>` | Duncan Hall, Seznick House |
| `branched` | `(road, segment)` | `lot-<n>` | Hinkley Hills |

The surface is four reads — `nodeOfSlot`, `nextFreeSlot`,
`nodesInOrder`, `isAuthored` — and it holds no state. The branched shape
carries `roads: [{ key, segments, frontagesPerSegment, branchesFrom? }]`,
which is enough to say *"the lane runs west four frontages at a time, and
a court branches off segment 2"* without a line of code, and enough for
`isAuthored` to mark segment 1 as the hand-written lane while segments 2+
are minted from a road-segment row.

That last point is the reason the shape exists: **bespoke streets,
minted homes, one institution.** A locality author writes the piece that
should be written and lets the rest grow.

---

## Tier 2 — `HoldingProgramme`, the holding

An instanceable `Warren` (`PersistableMixin(PostRegistrationMixin(
Warren))`) — deliberately **not** a singleton, because there is one live
instance per holding, all sharing one row and separated by their
persistence key.

**Authored on the row** (one row, every holding of that kind):

- `floorplan` — `[{ leaf, room, exits, entry?, door? }]`. Each entry
  names a real template row for the room; `entry: true` marks the way
  in; `door: { locked: true }` marks the threshold the key gates.
- `upkeepTerm` — the tenure vocabulary (below).
- `addressBase?` — the human address the per-room addresses hang off.

**Persistent per instance:** `shellCondition`, `shellStamp`.

**`wake()`** is the whole of standing a holding up: every room in the
floorplan is stood up as a **keyed instance** — `(scope = the room's row,
key = <holdingExtent>/<leaf>)` through `PersistableApi.restoreOrSeed` —
then the intra-holding exits are wired, the locked front-door edge is
hung, and each room is stamped with its address.

### Dormancy is whole-holding, never room-by-room

The population witness aggregates across the holding's rooms. When the
last interactive leaves, the programme captures **every** room and
itself, then reaps the whole set. A half-reaped house — a bedroom
dormant while the hall is awake — is not a state the model admits, and
the reason is placement: a good is placed against a room's `(scope,
key)`, so a room that sleeps while its siblings wake would have to
resolve placements against a graph that is half gone.

### The floorplan is the INITIAL mint, never the closed set

⚠ Load-bearing for the farming build's Stage B: a programme's member set
stays **open to runtime-added members**. Break-ground buds field rooms
into a holding from a programme-level ledger, on this base. Nothing in
`wake`, dormancy or capture may assume floorplan-only membership.

---

## The way in — keys, doors and the ascent gate

Keys mint at the **chokepoints**, and there are exactly three:
`title buy` (the sale), `lease` (the grant), and the dorm's `provision`.
Each does the same three calls in the same order:

```
Lock.mintKeyway() → ParcelApi.setKeyway(extent) → CredentialApi.issueKey(holder, keyway, 'pin-tumbler')
```

`FrontDoorExit` is the generic threshold: eager on its face with the
entry room's **row** (a real template, so the zone resolves and the exit
reads honestly before anything is minted), `canTraverse` gated on
`CredentialApi.presentsKey` against the holding's keyway (a sync read off
the warren's cache — an empty keyway admits nobody), and
`computeDestination` faulting the holding in through `admit`.

Locked in, free out: you need the key to get IN, never to get out.

### The ascent gate

At `title buy` and at `lease`, before the money moves: read the
condition of every residential holding the actor already has
(`ParcelApi.heldUnitsOf`) and refuse below
`residence.ascent.minCondition` (shipped default `0.5`), **naming the
band**. Holding nothing passes; the dorm grant has no gate.

The rung above is earned by keeping the rung you have — which is a
statement about upkeep, not about money.

---

## Condition — the weathering clock

**Storage:** `shellCondition` (0..1) + `shellStamp` (game-time) on the
programme instance. **Reconciled on read**, linear slope, rate from
`residence.weather.daysToWorn` (default 45 game-days from sound to
worn — half the scale, so a full slide takes twice that). Stamp-forward.
**No scheduler**, and the stamp is persistent, so the decline is honest
across a restart and across a holding sleeping for a month.

Five bands, and the readout is **only ever a band**:

`sound` · `weathered` · `worn` · `shabby` · `dilapidated`

with a cause line that says what happened in words ("the paint has gone;
rain has gotten into the sills"). No number, no percentage, no gauge —
`survey`'s suite asserts that no digit reaches the readout.

### ⚠ Two clocks, and they must never touch

A **shell** weathers on the passage of days. A **good** wears only when
you use it (economy Law 2). A regression test pins a durable good at
unchanged condition across a game YEAR that takes the shell from sound
to dilapidated. If a durable ever loses condition to the calendar, every
object a player owns rots while they sleep, and the second law of the
economy is gone.

### Terms — who OWES the upkeep

A validated open string on the programme class (`UPKEEP_TERMS`), not a
closed kernel vocabulary — a future `hoa-shell` should be a content
edit:

| Term | Means |
|---|---|
| `institution-all` | the institution keeps it, inside and out (the dorm) |
| `landlord-shell` | the landlord keeps the shell; what you put in it is yours (a let unit) |
| `owner-all` | all of it is yours (a bought house) |

The term says who *owes* the upkeep. It does **not** say who *may*
perform it — `maintain` refuses nobody, because a neighbour who paints
your window frames has painted them, and modelling permission there
would be modelling permission where the world models work.

### The acts

- **`survey`** (platform, perception — afforded actor-side beside
  `look`): the room archetypes with what met and missed each, and at
  home the whole holding plus the shell band, its cause and the term in
  words. Read-only. See [the archetype half](#archetype-satisfaction).
- **`maintain`** (residence pack, crafting — conferred by a carried
  householder's kit): restores the shell to sound and wears the kit. The
  kit is a class rather than a row precisely because **an affordance is a
  static on a class**, so the tool is what makes the verb visible.
- **the `maintains` brain** (kernel, `lib/behavior/maintains`): the
  agency that performs a term. Katie walks the dorms, Walter the Seznick
  shell, on a cadence, bounded by `batch`, through the LITERAL verb via
  `forceCommand` — so every gate on a typed `maintain` gates the beat.
  Take the kit off Katie and the dorm weathers.

---

## Capacity — the operator dial

D10's "runtime operator dial" is the shipped `AppSettings` mechanism, and
nothing else. An institution row authors a `capacityKey` and a
`defaultCapacity`; `capacity()` reads `AppApi.setting(capacityKey)` and
falls back to the authored default; `assertBelowCap` refuses at the cap
**with the reason named**. The wizard-gated `config` verb is the
adjustment surface:

```
config set hinkley-hills.lotCap 60
```

Shipped defaults live in the residence pack's own settings contribution
(`content/settings/residence.yaml`): the plat cap, `dorm.roomsPerFloor`,
`mayfield.unitCap`, the weathering rate and the ascent threshold.

Refuse → raise → admit is the whole loop, and it needs no rebuild:
capacity is read at provision time, never baked into a roster.

---

## Archetype satisfaction

`lib/archetype/Archetype` grew a third derived read beside `describe()`
and `materialize()`:

```ts
satisfies(space: Container | Container[]): Satisfaction
```

Per capability slot: satisfied, and **by what**. Evaluated over the union
of one or more spaces' contents AND their fixtures, so a holding answers
as a whole and a lamp on the wall counts as much as one on the floor.

`industry` became optional — a **room** archetype derives nothing,
because no recipe makes a bedroom, and that absence is exactly what
distinguishes it from a venue archetype. Two needs joined the vocabulary:
`rest: n` (a posture-bearing `lie` slot with `restQuality ≥ n`) and
`presence: <keyword>` (deliberately the weakest need available, and the
honest one for a toilet that composes no capability mixin on purpose).

Four room archetypes ship in `generic-objects`: bedroom, kitchen,
bathroom, living.

⚠ **Nothing consumes a satisfaction.** An unrecognized room provisions,
persists and functions identically; no multiplier, gate or price reads
one. A source walk asserts it, because a habit is not a guarantee.

---

## Owned goods in a holding

The furnishing subsystem's owner-based persistence carries straight
across ([furnishing.md](./furnishing.md), [persistence.md](./persistence.md)):
a stamped good persists in its OWNER's estate against a `place`, and a
room going dormant simply forgets furniture it never owned.

Two residences-era additions:

- **the keyed place.** `placeIdOf(host)` is `scope#key` for a keyed
  host, so many rooms sharing one row keep distinct placements — and a
  captured placement records `{ container, containerKey }` so a
  restoring host re-enters through `HoldingWarren.admitFor(key)`. That
  is the "log out in your own yard, log back into the same yard"
  acceptance.
- **the mount marker.** A good hung on a wall (`hang`) records
  `mounted: { slot }` on its estate entry, derived from where it
  actually hangs so it can never disagree with the fixture map; the room
  overlay re-attaches it as a fixture instead of dropping it on the
  floor. `AdornableMixin` contributes a capture pass that reports
  stamped fixtures to `noteOwnedGood` — without it, a room that slept
  while its owner was offline took the lamp with it and nobody captured
  it.

---

## Identity — `templatePath` always resolves to a row

The D17 split, shipped in this build and now an invariant the
`lint:census` gate enforces:

- **`templatePath`** is a clone's LINEAGE and it always names a real
  content row.
- **`identityPath`** is an instance's minted identity — a hard-private
  stamped slot, read through `getIdentityPath()`, defaulting to the
  template path when unstamped.
- The `byTemplatePath` registry indexes on **identity ?? template**, so
  every existing lookup (`findByTemplatePath('/platform/agent/Avatar/<pid>')`)
  is byte-identical, and principal readers (grants, group membership,
  chattel stamps, snapshot owners, the domicile stamp) moved to
  `getIdentityPath()` with their VALUES unchanged.
- `StuffApi.clone`'s `asTemplatePath` option is **gone**, replaced by
  `asIdentityPath`. The lint proves the channel stays retired and that
  every template-path-valued field in every shipped row resolves.

Rowless minted paths were how the old `LotHolder` conjured a yard, and
they are why a bought lot's rooms could not be edited, addressed or
resolved to a zone. Keyed instances of real rows replaced them.

---

## The packaging

Four packs were cut for this build (D18), and the membership test is
arcana's — *a capability pack holds what other packs' content names*:

- **`residence`** — the substrate classes and the substrate's own verbs,
  settings and goods: `PlatBook`, `LotHolder`, `LotGateExit`,
  `HoldingProgramme`, `UnitBuilding`, `FrontDoorExit`, `KeyedDoorExit`,
  `DeedDesk`, `HouseholdersKit`, `maintain`.
- **`eternal-university`**, **`terminus`**, **`hinkley-hills`** — the
  three localities, each homed whole (content + its own `src/`).

`world-seed` kept the four remaining localities and the commons.

⚠ **A locality is not a path prefix.** The first cut homed University
Avenue in `eternal-university` because it shared the `/world/eternal`
path root with Duncan Hall — a fact about the filesystem, not about the
world. The avenue is a **Terminus** street: it runs from the terminal
mouth past the campus wall down to the Counting-Houses, its own prose is
full of travellers off the Terminus trains, and the campus Locality row
has said `_address: terminus/city/campus` all along — the campus is a
district *inside* the city, and the gate is the boundary. It now ships
in `terminus` at `/world/terminus/university-avenue`. When homing
content, read what the room SAYS it is, not where its file happens to
sit.

---

## Cross-references

- [residence.md](./residence.md) — the dorm rung end to end, and the
  multi-instance persistence model this generalizes
- [smallholding.md](./smallholding.md) — the holder half (plat book, lot
  holder, the title gate) and the cultivation half beyond it
- [furnishing.md](./furnishing.md) — owner-based persistence, the estate
  slice, `place`, the room overlay
- [persistence.md](./persistence.md) — the spine, keyed hosts, the
  `mounted` marker
- [parcel.md](./parcel.md) — title, grants, `heldUnitsOf`, keyways
- [credential.md](./credential.md) — keys as credentials
- [archetype coverage](./furnishing.md#archetypes) — what a room is FOR

---

## Deferred seams

Named, not stubbed — each is a clean attach point:

- **inn rooms** — a nightly grant with an expiry, on the same base;
- **remodel** — the dorm's theme overlay generalized to a holding
  (a programme-level prose + fixture personalization);
- **HOA / a third-party shell term** (`hoa-shell`) — the vocabulary is
  already open; what is missing is the body that collects for it;
- **valuation and resale** — a lot sells at the book's authored price
  and nothing values it afterwards; there is no market;
- **rent as a recurring charge** — a lease is a grant with no money leg;
  the contract substrate is where that belongs;
- **a second realty desk anywhere** — already possible (populate a
  `DeedDesk`); nothing has needed one;
- **the branch that a plan authors but no frontage has reached** — the
  court off Hinkley's segment 2 exists in the plan and materializes as
  frontage fills; deeper trees (a court off a court) are untested.
