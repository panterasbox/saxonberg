# Furnishing — implementation plan

Plan for [furnishing-requirements.md](../requirements/furnishing-requirements.md)
(D1–D18). Phase 2 of the workflow: *how*, given that doc's *what* and
*why*.

The requirements fall into three parts, and D15 is why the first two
separate:

- **The engine half** (D1–D5, D8) — owner-based persistence. D15
  established this is **venue-generic**: a shopkeeper's tools in a leased
  shop want the same rule. It stands alone and carries most of the risk.
- **The content half** (D6, D10–D14, D16) — four archetypes over the
  room-state seam. By constraint it is seed rows, with two exceptions:
  D10's occupancy round-trip and D7/D14's declared fields.
- **The property tier** (D9, D17, D18) — the unit, its acreage, its zone.
  Mostly assembly over shipped parcel surface, but it is the part that
  **touches build-2**, so it is where coordination lives.

Build the engine half first; it depends on no archetype.

## Prerequisites — one cross-branch dependency

**`PersistableApi.restoreOrSeed(host, key)` should land on master before
Wave 6.** Build-2's Hinkley Hills Wave 2 extracts it and moves
`DormWarren` onto it. Our Wave 6 stands units up on exactly that shape,
so without it we hand-roll the same six lines and then three-way merge
inside the persistence spine — the worst place to have one. We are not
blocked (nothing is built yet); the ask is sequencing, and it is agreed
in `HANDOFF-to-hinkley-hills.md`.

**A second, smaller one:** if build-2 adds the area-band check at
`subdivide`, it should write the conservation ceiling as
`area × (storeys ?? 1)` (D17). Costs them nothing today; otherwise the
check lands in two commits on one function.

Neither blocks Waves 1–5. **Rebase before Wave 1 if `restoreOrSeed` has
landed by then.**

## What the code survey changed

Six findings from reading the shipped seams. Each shrinks the work or
moves it.

**1. The skip rule already exists, for another reason.**
`Container.captureSlice` already filters contents:

> *"A live player avatar (`HasInteractive`) is a transient occupant, never
> a host's persistent content — it persists itself, under its own record.
> Skipping it here keeps the shared content index (which the Slotted slice
> references) aligned with the emitted entries."*

That is D2's rationale verbatim, for avatars. D2 is **a second predicate
at a site that already does this**, and the comment names the invariant
D2 must preserve (the Container and Slotted slices share one content
ordering, so both must see the same filtered list).

**2. D2's "key on the stamp, not on `ownerOf`" makes the predicate
synchronous — and that is load-bearing.** `captureSlice` is **sync**;
`ChattelApi.ownerOf` is **async**. But `ChattelRegistry.ownerOf(id)` is
sync (`ChattelLogic` calls it without `await`), so
`isChattel(item) && getChattelId() && registry.ownerOf(id) != null` is a
sync test. D2 chose the stamp for a *semantic* reason (D5 fixtures are
owned-but-not-stamped and must keep riding the room's record); it also
happens to be the only version that fits the capture path. Do not
"improve" it into an `ownerOf` call.

**3. `ChattelOwner` cannot express a parcel owner — and the shipped code
anticipated it.** `ChattelOwner = { kind: "player"; templatePath }`;
`ParcelOwner` adds `{ kind: "group"; ref? }`. `ChattelRecord`'s own
docstring already says the union *"leaves room for a group/corpo owner
without a schema change."* Widen it — but **read-side only**: the parcel
rung is a derived fallback never stamped into a `chattel` row, so no
stored row gains a group owner and the persisted schema is untouched.
Blast radius stays at type-level narrowing in consumers.

**4. Every archetype fixture is `/obj/Chair`.** *"Postured over Slotted
over Detailed over a Thing. The actual `sit:1` slot spec is authored
per-seed; the class just supplies the capability. The reusable seat kind
the whole campus wants."* Bed (`lie`), tub (`lie`, `warmth`), sofa
(`sit`, capacity 2) are **seed rows over one shipped class**. `Bench
extends Chair` is the precedent for a thin subclass bought purely for a
seed path + prose, if you want `/obj/Bed` to read as `/obj/Bed`. Name
collision to avoid: `/domain/eternal/duncan-hall/Bed` is the existing
`Surfaced` dorm prop and stays one (D10 says so).

**5. `DormWarren.admit` is the provisioning shape, one tier up.**
`createMemberSerialized` → `addMember` → `setPersistenceKey(unitKey)` →
`hasRecord ? materialize : seedBornWith + capture` → wire exit. The unit
is this over *n* rooms with a shared key prefix — and it is the method
`restoreOrSeed` is being extracted from.

**6. The parcel row already encodes floors.** `slotOfExtent` parses a
trailing `f<floor>-r<pos>` — *"DECISION J: the extent IS the slot"* —
built for the dorm. D17's `storeys` gives an existing grammar area
semantics rather than inventing a vertical model.

## Wave 1 — `ownerOf` gains the parcel rung (D5)

Self-contained, read-only, and it fixes the vocabulary later waves speak.
Start here.

- Widen `ChattelOwner` to `ParcelOwner`'s union (finding 3). Fix
  narrowing at consumers; **no stored row changes**.
- In `ChattelLogic.ownerOf`, insert between the registry read and the
  `ProvenanceApi.authorOf` fallback: resolve the item's `templatePath`
  through `ParcelApi.ownerOf(path)` (already longest-prefix over the
  coverage index) and return it when a covering parcel exists.
- Keep the glob refusal and the null-path guard exactly as they are.

**Tests.** Three rungs, total: stamped → stamp; unstamped under an extent
→ parcel owner; unstamped outside → author; neither → null. Plus the
named regression: every existing `ownerOf` consumer (the general store)
resolves identically for goods outside any extent.

**Risk: low.** Additive, one function, pure read.

## Wave 2 — `place`, and the owner's estate slice (D1, D3)

The core. Two artifacts.

**`place` on the good.** A persistent field carried by `ChattelMixin`
(the good already composes it, and only an owned good has a place),
written **only** through `ChattelLogic` per D1's gate. Values: a room
identity, `'inventory'`, `'storage'` (default). That one write path also
stamps the `chattel` row's indexed `place` (see *Resolved*) — one call,
both writes, which is what keeps the index from drifting.

**A new owner-side slice.** The owner's `holder_snapshots` record gains a
slice holding every **stamped** good the owner titles, as
`{ templatePath, state, place }`. Goods with `place: 'inventory'` move
here too — one slice and one three-way switch on materialize, rather than
inventory riding the container slice while everything else rides a second
path. Materialize routes:

| `place` | action |
|---|---|
| `'inventory'` | clone into the owner's own container (today's effect, new route) |
| `'storage'` | **nothing.** No clone. Live in the registry and the record only |
| room identity | **nothing here.** Deferred to that room's materialize (Wave 4) |

This is what makes storage free: it is the absence of a placement, not a
place.

**Why byte-identical still holds.** With no stamped goods the new slice
is empty and the container slice is untouched — so the dorm-room and
Avatar regression tests pass unchanged. Behavior diverges only where a
stamp exists, which is the point.

**Tests.** `place` round-trips; the setter is gated (a direct write
throws); a glob cannot carry one; storage survives capture/restore
without ever being cloned; an inventory good round-trips into the owner's
container.

**Risk: medium.** A new slice type in the spine. Mitigation: it is
*additive* and empty for every existing record, so old records restore on
the unchanged path.

## Wave 3 — the host skip rule (D2)

One predicate in `Container.captureSlice`, beside the shipped
`HasInteractive` filter (finding 1), using the sync stamp test (finding
2). Both filters must produce the single ordering the `SlottedSlice`
indexes into — extend the existing `.filter()`, do not add a second pass.

**Tests.** A room holding a stamped good does not capture it; a room
holding an unstamped fixture does; **byte-identical** capture/restore for
a dorm room and an Avatar holding no stamped goods (the named
regression); slotted indices stay aligned when a stamped good sits
between two worn items.

**Risk: low, blast radius high.** Every persistable host runs this line.
The byte-identical tests are the guard and **should be written first**.

## Wave 4 — the room overlay (D4)

On a room's materialize, after its own record restores (fixtures first,
so a placed good can rest on a surface that exists): find the goods whose
`place` names this room, clone each **as the owner principal**, and place
it.

Ordering is the whole decision, and it is already stated. The room
captures nothing owner-side on the way down.

The lookup is one indexed query — `chattel` where `place = <room
identity>` — then owner → owner's record per hit (*Resolved*, below).

Cloning as the owner rather than the room is what keeps provenance and
the security principal right; it runs through the execution-context root,
never a passed-in actor.

**Tests.** The furnish loop (lease → place → dormancy → restart → same
goods, same rooms, fixtures respawned separately); the guest-drop leak (a
visitor's good is titled to the visitor, rides the visitor's record,
names the foreign room, reappears there, and **never** appears in the
host's record); fixtures-before-overlay ordering, asserted by placing a
good `onto` a fixture; the engine half exercised **outside a residence**
(D15's check — a good owned by one character, placed in a room on a
parcel someone else holds).

**Risk: medium-high.** Cross-scope, cross-principal, and the most
intricate ordering in the build.

## Wave 5 — title-aware verbs (D8)

No new verbs. `put`/`drop`/`place` on an owned good move custody via
`ContainmentApi` and stamp `place` to the room; `get`/`take` return
custody and set `place: 'inventory'`. Taking a good you do not hold title
to is **theft** — permitted, recoverable, never blocked. Actor from
`ExecutionContextApi`, never a parameter.

*(Naming note: the `place` **verb** and the `place` **field** now share a
word. Keep the field's identifier distinct in prose and docstrings.)*

**Tests.** Each verb sets `place` correctly; theft is permitted and
leaves title intact; fixture displacement leaves a let unit's fixture
titled to the parcel owner and recoverable; no verb changes a good's
class.

**Risk: low.**

## Wave 6 — the unit: floorplan, acreage, zone (D9, D17, D18)

`DormWarren.admit` one tier up (finding 5, on `restoreOrSeed` if it has
landed). Four things, in order.

**Provision.** Mint a unit sub-parcel via the shipped `subdivide`, grant
the lease via `grantUse`, materialize *n* rooms empty of movable goods —
built-in fixtures only, from `populates:` through the shipped
seed-then-persist handoff. Rooms connect within the unit; the front door
gates on the lease.

**Acreage (D17).** Two ledgers:

- **Ground** — `workable = area − Σ children.area`, **derived on read,
  never stored.** No structure/non-structure distinction: any child
  consumes ground. The building's footprint *is* its parcel's `area`, so
  no footprint field exists.
- **Floor** — `storeys` on the parcel row, default 1. Children conserve
  against `area × storeys`. Every ground parcel is `storeys: 1` and
  behaves exactly as today (the named regression).

⚠ Area is **declared at provision, never derived** — no summing rooms, no
reading `getSizeScale()` (a photometric denominator with one consumer,
the vision walk). Our rooms are mostly non-coordinate Locations anyway,
so there is no geometry to sum.

**Zone (D18).** One zone per building, `cellSize` authored (~3 m
residential), the building parcel's `zonePath` finally naming something
other than its own extent. Sub-zones deferred.

**Land use (D18).** Provisioning reads `ParcelApi.landUseOf` and refuses
where the covering use forbids a residence, naming the reason. Land use
stays on the **parcel row**, never a zone template.

**Revert.** `revokeUse` → `retire`, with D9's addition: force every owned
good placed under the unit to `storage` — intact, titled, recoverable —
**before** the shell reverts.

**Tests.** Multi-room and lease-gated (a non-leaseholder cannot enter);
a `storeys: 4` building lets four times its footprint while the same sum
against a `storeys: 1` lot is refused; a parcel with no `storeys`
declared behaves as today; `workable` derives and never drifts (adding a
structure reduces it with no write); the building's `zonePath` names a
real zone and rooms resolve scale from it; provisioning is refused where
land use forbids it, with the reason named; revert evicts to storage and
the unit re-lets empty; re-provisioning a different unit and re-placing
from storage furnishes the new one.

**Risk: medium.** Mostly assembly, but it is the wave that touches
build-2's surface — see *Prerequisites*.

## Wave 7 — room-level state + the posted designation (D7, D14)

Tiny, and it unblocks the archetypes. `persistentFields` on the generic
room class; the designation as an opaque string defaulting to
`unrestricted`.

Note D11: debris, energy, air and pests are **named and homed, not
declared**. Nothing runs on a cadence and no cadence field ships. The
posted designation is what satisfies the "a room declares at least one
field of its own" criterion.

**The D14 constraint is the test**: a grep for the field name finds its
declaration, accessors, tests and prose — **and no consumer**. Never
compared against `getPronouns()` or `getSex()`, never read by
`AccessApi`, a movement validator, an exit, or a locomotion check.

**Tests.** The field round-trips; a posted room does not affect entry for
anyone (the test that pins D14's whole point).

**Risk: low.**

## Wave 8 — the archetypes as content (D6, D12, D13, D16)

Seed rows, by constraint (finding 4). One generic room class,
venue-generic per D15.

- **bedroom** — `/obj/Chair`-class bed with a `lie` slot and authored
  `restQuality > 1`, in the room's `populates:`.
- **kitchen** — `/obj/Oven` skin, `UnboundedReceptacle` tap, a `Surfaced`
  counter, an `/obj/Chest` larder. **Plus the `air` reserve block** copied
  from `cellar.yaml` — the one authored decision with teeth.
- **bathroom** — toilet (`Detailed` prose, no capability mixin), basin
  (`UnboundedReceptacle`), tub (`/obj/Chair` class, `lie` + `restQuality`
  + `warmth`).

⚠ While writing the kitchen and bathroom rows, keep them **tier-agnostic**
— no row encodes "Terminus" or assumes municipal plumbing (*Resolved —
water by tier*). It costs nothing now and is the difference between the
frontier build adding a resolver and the frontier build editing every
archetype.
- **living** — nearly empty: floor, light, at most a hearth. Seating is
  chattel the tenant buys, not a fitted built-in.

**Tests.** Four archetypes seed their own fixture sets and share one
class; **zero new classes, mixins or verbs** (a named assertion); cook at
home end-to-end; the larder's lid gates the craft gather walk; the
ventilation trio (open → complete burn; sealed → incomplete, smoke, CO,
self-smother; reopen → recovers); a dormant unit's range burns no fuel
and suffocates nobody (D12's no-silent-tax constraint); the toilet
exposes no affordance; the tub's `restQuality` **and** `warmth` are both
read; kitchen built-ins resolve to the landlord and the pot to the
tenant; the living room materializes empty and a visitor sees exactly the
tenant's placed goods; a bought armchair really seats and leaves with the
tenant; the archetypes seed into a **plain non-residential location**
with no parcel, lease or tenant (D15's check).

**Risk: low.** Content, and the ventilation behavior is shipped.

## Wave 9 — sleep-as-logout (D10)

The one genuinely new engine work among the archetype decisions.
`PosedMixin` persists `posture`, but `getOccupiedHost()` is a live scan
over `SlotApi.findOccupiedHost` — so the *bed* is gone on restore and
`currentRestQuality()` reads 1.0 on the very reconcile meant to pay out.

Capture the occupied host + slot name **owner-side** (a fact about the
sleeper, not about someone else's furniture) and re-occupy on materialize
**after** the room's fixtures restore — Wave 4's ordering, one step
further. Re-occupancy goes through `SlotApi`'s occupy path so `fitsSlot`,
capacity and `onSlotReleased` behave identically to a live `lie`.

Degradations — bed destroyed, no longer admits the posture, already
occupied — resolve to the room floor: standing, 1.0, **no error, no
teleport**. Restoring a player must never fail because their furniture
moved.

Metabolism is **not** modified. `metabolicClockStamp`, `STEP_SEC: 60` and
`MAX_STEPS: 720` stay exactly as shipped.

**Tests.** You wake where you slept; three named degradations; two
avatars over identical elapsed game-time differ by exactly the bed's
multiplier; a week away is capped and nobody recovers past full; the
floor case is not below the no-residence baseline.

**Risk: medium.** Touches the restore path for every avatar. The
never-throws constraint is the guard.

## Resolved — how a room finds the goods placed in it

**Decision: `place` rides the existing `chattel` row, indexed** (option 1
of three costed during planning; agreed 2026-07-31).

Wave 4 needs a by-room index: the goods' state lives in the owner's
record (Wave 2), and a materializing room cannot scan every owner's
record. D1 says `place` is a field on the good and explicitly **not** a
second registry — but that reasoning ("a registry would need reconciling
against the containment tree it duplicates") holds against a *new*
registry and never settled where a by-room index lives.

So: one indexed field on a row that already exists per owned good. The
registry is already the authority for *who owns this*; *where they keep
it* changes on the same acts, through the same gate.

- The good's live instance keeps `place` as a persistent field, so D1's
  round-trip is exactly as specified. **The row is an index, not a second
  source of truth.**
- `ChattelLogic` is the single writer (D1 already mandates this) and
  writes both in one call. That is what keeps them from diverging, and
  the reason this is safe rather than merely convenient.
- Wave 4's lookup is one query: `chattel` where `place = <room
  identity>`, then owner → owner's record per hit.

**The duplication is real and gets documented** in the subsystem doc as
"the row indexes what the instance owns" — not quietly resolved. Rejected
alternatives, for the record: a manifest of chattel ids on the *room's*
record (costs a hop, and puts something about the good in the host's
record, which rubs against the guest-drop goal's "the host's record never
carries it"), and scanning owners (correct, unworkable).

## Resolved — water by tier

**Decision: ship the tap, soften the criterion** (agreed 2026-07-31).
D13's prose and its acceptance criterion had disagreed — the prose said
v1 ships the tap, the criterion demanded a tier→fixture resolver and a
synthetic second-tier fixture. The requirements now say one thing.

A resolver is real code (`populates:` is a list of literal template paths
and cannot branch) and there is no frontier dwelling in this build to
resolve against, so it would be written, tested against a fixture, and
used by nothing. It defers to the build that has one.

**What Wave 8 owes instead is an invariant, not a mechanism: no archetype
row is tier-specific.** No bathroom or kitchen row encodes "Terminus" or
assumes municipal plumbing. Checked by reading the rows — it is a review
item, not a test — because the failure it guards against is *retrofit
cost*, not behavior: get it wrong and every archetype needs editing when
the second tier lands; get it right and the resolver later slots in above
rows that never mentioned a tap.

D12's authored-not-coded constraint survives intact, which was the other
reason to prefer this shape.

## Ordering and parallelism

```
Wave 1 (parcel rung)  ─┐
Wave 2 (place+slice)  ─┴→ Wave 3 (skip) → Wave 4 (overlay) → Wave 5 (verbs)
                                                    ↓
                                              Wave 6 (unit + acreage + zone)
Wave 7 (room state) ──────────────────────→ Wave 8 (archetypes)
                                                    ↓
                                              Wave 9 (sleep)
```

Waves 1, 2 and 7 are independent of each other. Wave 9 needs Wave 4's
ordering rule and Wave 8's bed. Wave 6 wants `restoreOrSeed` on master
first (*Prerequisites*).

## Acceptance-criteria map

All 31 criteria, each to a wave.

| Criterion | Wave |
|---|---|
| `place` round-trips | 2 |
| skip rule holds + byte-identical no-op | 3 |
| storage is the absence of a placement | 2 |
| the furnish loop persists | 4 + 6 |
| the guest-drop leak is closed | 4 |
| `ownerOf` is three rungs and total | 1 |
| fixture displacement is theft, recoverable | 1 + 5 |
| four archetypes exist as content | 8 |
| living room empty; a visitor sees placed goods | 8 (+ 4) |
| a bought chair really seats | 8 (+ 5) |
| rooms carry room-level state | 7 |
| you wake where you slept | 9 |
| sleeping somewhere good pays, and only that | 9 |
| the archetypes are venue-generic | 8 |
| the engine half is venue-generic too | 4 |
| a posted room says so and stops there | 7 |
| the tub is a real rest surface, and warm | 8 |
| the toilet does nothing, deliberately | 8 |
| no archetype row is tier-specific | 8 (review item) |
| you can cook at home, no engine change | 8 |
| the larder's lid is load-bearing | 8 |
| the kitchen ventilates or it doesn't | 8 |
| built-ins are the landlord's, the pot the tenant's | 8 (+ 1) |
| the bedroom bed is lieable | 8 |
| multi-room and lease-gated | 6 |
| a four-storey building lets 4× its footprint | 6 |
| `workable` derives and never drifts | 6 |
| the building has a zone of its own | 6 |
| provisioning respects land use | 6 |
| revert evicts to storage | 6 |
| function is fixed | 5 |
| full suite green + subsystem doc | sweep |

## Cross-references

- Requirements: [furnishing-requirements.md](../requirements/furnishing-requirements.md)
- Cross-branch: `HANDOFF-from-hinkley-hills.md` /
  `HANDOFF-to-hinkley-hills.md` (repo root, untracked)
- Spine: [persistence.md](../subsystems/persistence.md) ·
  [chattel.md](../subsystems/chattel.md) ·
  [parcel.md](../subsystems/parcel.md) ·
  [residence.md](../subsystems/residence.md)
- Archetype substrate: [posture.md](../subsystems/posture.md) ·
  [slot.md](../subsystems/slot.md) ·
  [fire.md](../subsystems/fire.md) ·
  [crafting.md](../subsystems/crafting.md) ·
  [metabolism.md](../subsystems/metabolism.md)
- Property tier: [zone.md](../subsystems/zone.md) ·
  [address.md](../subsystems/address.md)
