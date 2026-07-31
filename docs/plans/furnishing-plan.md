# Furnishing — implementation plan

Plan for [furnishing-requirements.md](../requirements/furnishing-requirements.md)
(D1–D16). Phase 2 of the workflow: *how*, given that doc's *what* and
*why*.

The requirements split cleanly in two, and D15 is why:

- **The engine half** (D1–D5, D8) — owner-based persistence. D15
  established this is **venue-generic**: a shopkeeper's tools in a leased
  shop want the same rule. It stands alone and is the whole risk.
- **The content half** (D6, D7, D10–D14, D16) — four archetypes over a
  room-state seam. By constraint it is seed rows, with exactly **two**
  exceptions (D10's occupancy round-trip; D7/D14's declared fields).

Build the engine half first; it does not depend on any archetype.

## What the code survey changed

Five findings from reading the shipped seams. Each one shrinks the work
or moves it.

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
rung is a derived fallback that is never stamped into a `chattel` row, so
no stored row ever gains a group owner and the persisted schema is
untouched. Blast radius stays at type-level narrowing in consumers.

**4. Every archetype fixture is `/obj/Chair`.** *"Postured over Slotted
over Detailed over a Thing. The actual `sit:1` slot spec is authored
per-seed; the class just supplies the capability. The reusable seat kind
the whole campus wants."* Bed (`lie`), tub (`lie`, `warmth`), sofa
(`sit`, capacity 2) are **seed rows over one shipped class**. `Bench
extends Chair` is the precedent for a thin subclass bought purely for a
seed path + prose, if the reviewer wants `/obj/Bed` to read as `/obj/Bed`.
Note the name collision to avoid: `/domain/eternal/duncan-hall/Bed` is
the existing `Surfaced` dorm prop and stays one (D10 says so).

**5. `DormWarren.admit` is the provisioning shape, one tier up.**
`createMemberSerialized` → `addMember` → `setPersistenceKey(unitKey)` →
`hasRecord ? materialize : seedBornWith + capture` → wire exit. The unit
is this over *n* rooms with a shared key prefix.

## Wave 1 — `ownerOf` gains the parcel rung (D5)

Self-contained, read-only, and it fixes the vocabulary the later waves
speak. Start here.

- Widen `ChattelOwner` to `ParcelOwner`'s union (finding 3). Fix
  narrowing at consumers; **no stored row changes**.
- In `ChattelLogic.ownerOf`, insert between the registry read and the
  `ProvenanceApi.authorOf` fallback: resolve the item's `templatePath`
  through `ParcelApi.ownerOf(path)` (already longest-prefix over the
  coverage index) and return it when a covering parcel exists.
- Keep the glob refusal and the null-path guard exactly as they are.

**Tests.** Three rungs, total: stamped → stamp; unstamped under an
extent → parcel owner; unstamped outside → author; neither → null. Plus
the named regression: every existing `ownerOf` consumer (general store)
resolves identically for goods outside any extent.

**Risk: low.** Additive, one function, pure read.

## Wave 2 — `place`, and the owner's estate slice (D1, D3)

The core. Two artifacts.

**`place` on the good.** A persistent field carried by `ChattelMixin`
(the good already composes it, and only an owned good has a place),
written **only** through `ChattelLogic` per D1's gate. Values: a room
identity, `'inventory'`, `'storage'` (default). That one write path also
stamps the `chattel` row's indexed `place` (see *Resolved*, below) — one
call, both writes, which is what keeps the index from drifting.

**A new owner-side slice.** The owner's `holder_snapshots` record gains
a slice holding every **stamped** good the owner titles, as
`{ templatePath, state, place }`. Goods with `place: 'inventory'` move
here too — one slice, one three-way switch on materialize, rather than
inventory riding the container slice and everything else riding a second
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
Avatar regression tests pass unchanged. The behavior only diverges where
a stamp exists, which is the point.

**Tests.** `place` round-trips; the setter is gated (a direct write
throws); a glob cannot carry one; storage survives capture/restore
without ever being cloned; an inventory good round-trips into the
owner's container.

**Risk: medium.** New slice type in the spine. Mitigation: the slice is
*additive* and empty for every existing record, so old records restore
on the unchanged path.

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
The byte-identical tests are the guard and should be written first.

## Wave 4 — the room overlay (D4)

On a room's materialize, after its own record restores (fixtures first,
so a placed good can rest on a surface that exists): find goods whose
`place` names this room, clone each **as the owner principal**, and place
it.

Ordering is the whole decision, and it is already stated. The room
captures nothing owner-side on the way down.

The lookup is one indexed query — `chattel` where `place = <room
identity>` — then owner → owner's record per hit (see *Resolved*, below).

**Tests.** The furnish loop (lease → place → dormancy → restart → same
goods, same rooms, fixtures respawned separately); the guest-drop leak
(a visitor's good is titled to the visitor, rides the visitor's record,
names the foreign room, reappears there, and **never** appears in the
host's record); fixtures-before-overlay ordering, asserted by placing a
good `onto` a fixture.

**Risk: medium-high.** Cross-scope, and the open question sits here.

## Wave 5 — title-aware verbs (D8)

No new verbs. `put`/`drop`/`place` on an owned good move custody via
`ContainmentApi` and stamp `place` to the room; `get`/`take` return
custody and set `place: 'inventory'`. Taking a good you do not hold title
to is **theft** — permitted, recoverable, never blocked. Actor from
`ExecutionContextApi`, never a parameter.

**Tests.** Each verb sets `place` correctly; theft is permitted and
leaves title intact; no verb changes a good's class.

**Risk: low.**

## Wave 6 — the unit (D9 + the floorplan)

`DormWarren.admit` one tier up (finding 5): provisioning mints a unit
sub-parcel via the shipped `subdivide`, grants the lease via `grantUse`,
and materializes *n* rooms empty of movable goods — built-in fixtures
only, from `populates:` through the shipped seed-then-persist handoff.
Rooms connect within the unit; the front door gates on the lease.

Revert reuses `revokeUse` → `retire`, with D9's one addition: force every
owned good placed under the unit to `storage` — intact, titled,
recoverable — **before** the shell reverts.

**Tests.** Multi-room and lease-gated (a non-leaseholder cannot enter);
revert evicts to storage and the unit re-lets empty; re-provisioning a
different unit and re-placing from storage furnishes the new one.

**Risk: medium.** Mostly assembly over shipped parcel surface.

## Wave 7 — room-level state + the posted designation (D7, D14)

Tiny, and it unblocks the archetypes. `persistentFields` on the generic
room class; the designation as an opaque string defaulting to
`unrestricted`.

**The D14 constraint is the test**: a grep for the field name finds its
declaration, accessors, tests and prose — **and no consumer**. Never
compared against `getPronouns()` or `getSex()`, never read by
`AccessApi`, a movement validator, an exit, or a locomotion check.

**Tests.** The field round-trips; a posted room does not affect entry for
anyone (the test that pins D14's point).

**Risk: low.**

## Wave 8 — the archetypes as content (D6, D12, D13, D16)

Seed rows, by constraint (finding 4). One generic room class,
venue-generic per D15.

- **bedroom** — `/obj/Chair`-class bed with a `lie` slot and authored
  `restQuality > 1`; the room's `populates:`.
- **kitchen** — `/obj/Oven` skin, `UnboundedReceptacle` tap, a `Surfaced`
  counter, an `/obj/Chest` larder. **Plus the `air` reserve block**
  copied from `cellar.yaml` — the one authored decision with teeth.
- **bathroom** — toilet (`Detailed` prose, no capability mixin), basin
  (`UnboundedReceptacle`), tub (`/obj/Chair` class, `lie` + `restQuality`
  + `warmth`).
- **living** — nearly empty: floor, light, at most a hearth. Seating is
  chattel the tenant buys, not a fitted built-in.

**Tests.** Four archetypes seed their own fixture sets and share one
class; **zero new classes, mixins or verbs** (a named assertion); cook at
home end-to-end; the larder's lid gates the craft gather walk; the
ventilation trio (open → complete burn; sealed → incomplete, smoke, CO,
self-smother; reopen → recovers); the toilet exposes no affordance; the
tub's `restQuality` and `warmth` are both read; **the archetypes seed
into a plain non-residential location** with no parcel, lease or tenant
(D15's check).

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
floor case is not below the no-residence baseline. Plus the dormancy
guard from D12's constraint: a dormant unit's range burns no fuel and
suffocates nobody (no silent tax on being offline).

**Risk: medium.** Touches the restore path for every avatar. The
never-throws constraint is the guard.

## Resolved — how a room finds the goods placed in it

**Decision: `place` rides the existing `chattel` row, indexed** (option 1
of the three costed during planning; agreed 2026-07-31).

Wave 4 needs a by-room index: the goods' state lives in the owner's
record (Wave 2), and a materializing room cannot scan every owner's
record to find what belongs in it. D1 says `place` is a field on the good
and explicitly **not** a second registry — but its reasoning ("a registry
would need reconciling against the containment tree it duplicates") holds
against a *new* registry and never settled where a by-room index lives.

So: one indexed field on a row that already exists per owned good. The
registry is already the authority for *who owns this*; *where they keep
it* changes on the same acts, through the same gate. Concretely —

- The good's live instance keeps `place` as a persistent field, so D1's
  round-trip is exactly as specified. **The row is an index, not a second
  source of truth.**
- `ChattelLogic` is the single writer (D1 already mandates this), and it
  writes both in one call. That is what keeps them from diverging, and it
  is the reason this is safe rather than merely convenient.
- Wave 4's lookup is one query: `chattel` where `place = <room
  identity>`, then owner → owner's record for each hit.

**The duplication is real and gets documented**, in the subsystem doc, as
"the row indexes what the instance owns" — not quietly resolved. The
rejected alternatives, for the record: a manifest of chattel ids on the
*room's* record (costs a hop, and puts something about the good in the
host's record, which rubs against the guest-drop goal's "the host's
record never carries it"), and scanning owners (correct, unworkable).

The plan is fully executable.

## Ordering and parallelism

```
Wave 1 (parcel rung)  ─┐
Wave 2 (place+slice)  ─┴→ Wave 3 (skip) → Wave 4 (overlay) → Wave 5 (verbs)
                                                    ↓
                                              Wave 6 (unit)
Wave 7 (room state) ──────────────────────→ Wave 8 (archetypes)
                                                    ↓
                                              Wave 9 (sleep)
```

Waves 1, 2 and 7 have no dependencies on each other. Wave 9 needs Wave 4's
ordering rule and Wave 8's bed.

## Acceptance-criteria map

Every criterion in the requirements lands in a wave: `place`
round-trip → 2; skip rule + byte-identical → 3; storage → 2; furnish
loop + guest-drop → 4; three-rung `ownerOf` → 1; fixture displacement →
1+5; four archetypes + cook-at-home + larder + ventilation + built-ins-vs-pot
→ 8; room-level state + posted room → 7; venue-generic (both halves) →
8 (content) and 4 (engine); multi-room + lease-gated + revert → 6; wake
where you slept + sleep pays → 9; function is fixed → 5; suite green +
subsystem doc → sweep.

## Cross-references

- Requirements: [furnishing-requirements.md](../requirements/furnishing-requirements.md)
- Spine: [persistence.md](../subsystems/persistence.md) ·
  [chattel.md](../subsystems/chattel.md) ·
  [parcel.md](../subsystems/parcel.md) ·
  [residence.md](../subsystems/residence.md)
- Archetype substrate: [posture.md](../subsystems/posture.md) ·
  [slot.md](../subsystems/slot.md) ·
  [fire.md](../subsystems/fire.md) ·
  [crafting.md](../subsystems/crafting.md) ·
  [metabolism.md](../subsystems/metabolism.md)
