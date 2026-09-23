# Ground slate — one column, three depths, and a floor you can target

> **Status: UNBUILT — design closed 2026-09-23 (in conversation), ready for
> `/requirements`.** Nothing here exists as a unified thing: ground is modelled
> in three vocabularies owned by three different places, the kernel holds two
> citation slots for it and interprets neither, and **a Location has no material
> field at all.**
> **Left:** ⚠⚠ **the posture bug is CONFIRMED — driven 2026-09-23 over the real
> socket, as a brand-new player in the Lounge (`defaultStartLocation`): `sit`,
> `lie` and `kneel` ALL decline `empty-result[target]`, and so do `look ground`
> and `look floor`. A new player cannot sit down in the first room they see.**
> ⭐ A second, separate defect fell out of the same probe: **`sit on ground`
> declines `command-rejected: shape-fall-through`** — the prepositional form a
> person would naturally type is not a recognised shape, so even naming the
> ground explicitly does not reach it. ·
> **floors as universal Things** (an adornment every Location gets unless it
> authors one) · **the five-rung underfoot ladder** · **the `onGrade` flag, on
> the floor rather than the Location** · **`/system/ground`**: the column and the
> seeded surface character unified as one substrate read at a depth ·
> `GroundCharacter` out of the farming trade · the floor's first real consumer
> (`dig` asks *what is underfoot* and *is this on grade*)
> **Size:** a build

See also: [extraction-slate](./extraction-slate.md) (⭐⭐ **the build this one
unblocks** — a quarry is the first host in the game that needs the floor, the
soil and the strata at once, and its `dig` needs a bindable ground) ·
[field-substrate-slate](../tails/field-substrate-slate.md) (the seeded × derived
seam; this build does its hardest half, so the later RGO-interface unification
shrinks) · [mining-slate](./mining-slate.md) + [forestry-slate](../tails/forestry-slate.md)
(the two trades that own ground models today) ·
[rejection-slate](./rejection-slate.md) (the 1.0 content pass that owns column
*density*). Substrates: [location.md](../../subsystems/location.md) ·
[posture.md](../../subsystems/posture.md) · [slot.md](../../subsystems/slot.md) ·
[soil.md](../../subsystems/soil.md) · [mining.md](../../subsystems/mining.md) ·
[zone.md](../../subsystems/zone.md) · [residency.md](../../subsystems/residency.md)
(what makes universal floors affordable) ·
[furnishing.md](../../subsystems/furnishing.md) (acreage — *ground* for a child
of a lot, *floor* for a child of a building).

**Captured 2026-09-23**, out of the extraction plan's review. The user asked
whether *"all our current content models the ground appropriately and is consumed
as expected"* — and it turned out there are **three** different things called
ground, one of which is barely modelled at all.

---

## ⭐⭐ Why this slate exists — three vocabularies, three owners

| the thing | what it answers | where it lives | who actually has it |
|---|---|---|---|
| **the floor** | what am I standing *on* | `platform/thing/Floor` | **27 of 180 Locations** |
| **the soil / character** | what will *grow* | reserves in the **kernel** (`lib/husbandry/Soil.ts`); ⚠ the seeded half (texture · drainage · aspect · depth · stoniness · native pH) in **`trade-farming`** (`idea/GroundCharacter.ts`) | reserves: bed, pot, `Field`, `Wood`. Character: **`Field` only** |
| **the strata** | what is *underneath* | ⚠ **`trade-mining`** (`idea/Deposit.ts`) | Rejection only |

Plus the cover (forestry's `Stand`, farming's `Sward`) and the tenure (the
kernel's `Cultivable`, the parcel register's title).

⭐⭐ **And the kernel already admits ground is its problem.** `SpatialZone`
carries **both** `deposit` and `groundCharacter` as authorable strings and
interprets neither, with the reason in the file:

> *"A pack cannot add a field to a kernel class — the failure is silent, and it
> cost a live drive to find… citation is not importing a concept."*

So the kernel cites two halves of ground, refuses to interpret either, and the
trades interpret them privately. **Nothing owns the concept.**

**What that already produces:** a `Wood` has soil reserves and **no** ground
character, so a forest has no texture, drainage or depth while forestry's stand
claims to derive from *"its own soil"*. A mine room has strata and **no soil at
all**. A `Field` is the only host in the game with both. And any ground that
wants drainage must depend on the **farming trade**.

## ⚠⚠ The floor is barely modelled, and something is probably broken

`platform/thing/Floor` is a `Thing` — so it carries a material through Tangible
— composed Bulkable + Postured + Slotted + Adornment + Detailed + Visible. But:

- **"v1 ships no class-level default for 'every Location has a floor' … the
  choice of which Locations include a floor adornment is per-template
  authoring."** (the class's own comment)
- **Six floor rows exist in the whole game**: `default-floor`, `forge-floor`,
  `weeping-floor`, `heath-floor`, `brine-floor`, `flooded-floor`.
- **A Location has no material field of any kind** — nothing floor-, ground- or
  surface-material shaped on any location class.
- The floor's material is declared load-bearing **for the future** (*"future
  material-aware floor-acceptance work — lava floors gating actor-vs-material"*)
  and is **read by nothing today**. Its one live job is puddles: a spill pools in
  the floor's surface-bulk slot.
- ⭐ The fiction already wants more: `GlassAlley`'s own comment describes
  *"broken bottles underfoot… walking in bare-footed"* — a promised consequence
  with no mechanism, the same class as `old-workings`' wall of *"the bigger
  pieces"* and the moor's *"black peat-water"*.

### The suspected bug — confirm by DRIVING, not by reading

`sit`, `lie` and `kneel` **all** declare `default: "ground"` with
`requires: [VisibleMixin, PosturedMixin]`. And:

- `ground` is **not** a special MQL keyword — it is an ordinary keyword match;
- **no Location composes `PosturedMixin`** anywhere in the tree;
- **nothing attaches the `default-floor` row** — it is referenced only by a doc
  comment and a unit test;
- ⚠ **the dorm room, where every new player wakes, has no floor** (props: the
  lamp, bed, desk, footlocker, wardrobe; keywords `[room, dorm]`).

Which reads as: **the whole ground-posture family cannot bind in most of the
world, including a new player's first room.** That is the fifth reachability
link — a view's `requires:` naming a mixin its real targets do not compose, the
`hammer`/`DurableMixin` failure again.

> ✅ **CONFIRMED by driving, 2026-09-23** — a fresh world on the wire suite's own
> port, a brand-new character, the Lounge:
>
> | typed | result |
> |---|---|
> | `sit` · `lie` · `kneel` | **declined** — `empty-result[target]` |
> | `look ground` · `look floor` | **declined** — `empty-result[target]` |
> | `sit on ground` | **declined** — `command-rejected: shape-fall-through` |
> | `stand` | ok (vacates a slot; needs no target) |
>
> So the reading was right and the scope is wider than it looked: the bare form
> cannot bind **and** the prepositional form does not parse. Both are in the
> build.
>
> ⭐ Observed in the same probe and **not this build's**: three of the twelve
> reachable things in the starting room render as *"something"*. In a lit room
> that reads as missing descriptions rather than darkness. Recorded for whoever
> owns it.

---

## ⭐⭐⭐ The thesis

> **One column, three depths, and a floor you can target.**

The floor, the soil and the strata are not three models. They are **one column
sampled at three depths** — and the machinery is already shipped:
`Deposit.hostAt(z)` walks a column top-down and returns a **material path**, and
each band already carries a `host`. The floor is the top of it.

⚠ **But the column is a RUNG, never the model.** An interior, an upper storey, a
ship's deck and the holodeck have no geology beneath them in any honest sense.
The universal is the **read**; geology is one source of its answer.

## Floors are Things, and essentially universal

Two arguments, and the first is a rule rather than a preference:

1. ⭐⭐ **A command argument binds to a Stuff.** `dig <ground>`, `look floor`,
   `search the ground` need a target that *exists*. A read on a Location gives
   nothing to bind, nothing to look at, and nothing for MQL to narrow. The
   forage act's own recorded shape says *"the ground is the argument."*
2. **Affordances live on the floor.** `PosturedMixin` is what makes sitting and
   lying on the ground possible, and it is on `Floor`. A room with no floor
   cannot be sat in.

**So: every Location gets a floor adornment unless it authors its own**, which
reverses v1's "no default" — and v1 was right about the *object per room* being
a cost and wrong to leave rooms with no floor at all.

⭐ **Residency is what makes it affordable**, not absence: a cold room evicts
wholesale and takes its floor with it, and a floor whose composition is *derived*
carries no record to keep. One extra Stuff per loaded room, against a room that
is already a Stuff with props that are Stuff.

## The five-rung ladder

What is underfoot resolves in the authored-beats-derived shape used everywhere
in this codebase:

1. **the floor's own authored material** — flagstone, board, ice. Always wins.
2. **an authored field on the Location** — the cheap override for a room that
   wants no bespoke floor row.
3. ⭐ **the ground's top band** — *only* where the floor declares itself
   `onGrade`. This is the rung the quarry, the heath and the field use.
4. **the archetype or zone default** — a building's boards, the dorm's floor.
5. **the universal default** — the `default-floor` row that already exists and
   is currently attached to nothing.

**`onGrade` belongs to the FLOOR, not the Location** — and that is the detail
that makes it work indoors: a cottage's beaten-earth floor is on grade while its
loft's boards are not, and both are floors in one building. An interior never
reaches rung 3 unless somebody says it does.

## What `/system/ground` owns

The column **and** the seeded surface character, as one substrate read at a
depth — so `GroundCharacter` leaves the farming trade and geology leaves the
mining trade, and the two citation slots `SpatialZone` already carries finally
have one interpreter. A locality's ground row then names a class **without
installing a trade**, which is the whole reason the pack exists.

⚠ **`/system/` is the right axis and the test passes cleanly:** *a system is
true whether or not anyone is participating in it.* Ground holds what it holds
whether or not anybody digs. `/system/water` is the precedent, and its manifest
already states the doctrine — *the works, as distinct from the physics; this pack
owns what other packs' content NAMES.*

## The first consumer

`dig` asks the floor two questions — **what are you made of** and **are you on
grade** — because you cannot dig a plank floor or the third storey of a building,
and the refusal should say which. That is the floor's first real consumer in the
game, and it is why the extraction build is what surfaced all of this.

---

## Lens pass

1. **Pedagogy.** The world becomes derivable underfoot: a heath's floor is peat
   *because the top band is peat*, and a quarry's floor changes as it is
   stripped. Nothing is a lookup; the same column answers the plant, the pick
   and the boot. Exercises no new Discipline — this is substrate — which is the
   honest reading, not a gap to paper over.
2. **Creative expression.** ⭐ The ordinary case becomes **nothing**: every
   Location gets an honest floor with no authoring at all, where today 153 of 180
   have none. The bespoke case is one authored material or one floor row, and it
   wins over the derivation. A room that wants a lava floor says so.
3. **Immersion & roleplay.** You can sit on the ground anywhere — which is
   supposed to be true already. `look at the floor` answers. `GlassAlley`'s bare
   feet become buildable.
4. **Values.** Thin, and recorded as thin: this is substrate, and it confers no
   standing. The choices it unlocks belong to its consumers (what you may dig,
   whose ground it is).
5. **Technology & magic.** A floor is a floor from a cave to an orbital deck;
   what changes is what it is made of and whether anything is under it. The
   `onGrade` flag is exactly the axis that survives the epoch change.
6. **Economy.** Produces nothing directly; it is the **precondition** for
   quarrying, for foraging's patches, and for any act that cares what it is
   standing on. Consumes one Stuff per loaded room, paid back by every consumer
   that stops inventing its own ground.

---

## Non-goals — each with its destination

- **Authoring a composition per room** — boards here, flagstone there. The
  defaults answer all 180 honestly; choosing per room is content work →
  [rejection-slate](./rejection-slate.md)'s 1.0 content pass and the localities.
- **Column density** — whether one hillside may stack four useful bands →
  [rejection-slate](./rejection-slate.md), already recorded there.
- **The other consumers the read unlocks** — traction and slipping · footstep
  sound · fire spreading across a board floor · tracks in mud · `GlassAlley`'s
  bare feet. Each is a small wiring job once the read exists, and each belongs to
  its own subsystem: [locomotion.md](../../subsystems/locomotion.md) ·
  [senses.md](../../subsystems/senses.md) ·
  [fire.md](../../subsystems/fire.md) ·
  [stealth.md](../../subsystems/stealth.md) (the tracks) ·
  [materials-response.md](../../subsystems/materials-response.md) (bare feet on
  glass is the harm channel, not a floor feature).
- **Giving every zone a column** so every room can use rung 3 → the coverage
  half of the audit; the ladder degrades honestly without it.
- **The rest of the RGO-interface unification** — the derived half, the covers,
  `Strata` × `Soil` composition →
  [field-substrate-slate](../tails/field-substrate-slate.md). This build does its
  hardest half.
- **Fixing `Wood`'s missing character or a mine room's missing soil** — real
  gaps, but they are *coverage*, and they are cheap once one substrate answers
  both. Nowhere yet, deliberately: name them when the audit runs.

---

## Open questions

1. ✅ **CLOSED — the posture bug reproduces**, driven 2026-09-23 (above). This
   build **is** a bug fix with a substrate attached, and its drive leads with the
   four commands a new player cannot use. `sit on ground`'s parse failure joins
   the scope.
2. **Where does the floor come from — a prop or a class default?** A `props:`
   entry every Location inherits, or the location class minting one at
   registration. The second cannot be overridden by an author as easily; the
   first has to survive a room that authors its own floor without getting two.
   **Lean: the class mints iff no authored floor is present**, which is the
   `restoreOrSeed` shape.
3. **Does `Floor` stay the class name?** It is about to cover the ground outdoors
   as well as boards indoors, and *floor* reads indoor. `Ground` collides with
   the keyword; `Underfoot` is a read, not a thing. **Lean: keep `Floor`** — a
   quarry floor and a cave floor are both called floors in English, and renaming
   touches six shipped rows for a word.
4. **Do the three ground postures keep `default: "ground"`?** If every floor row
   carries the `ground` keyword the default works untouched, which argues for
   putting the keyword on the class's seed rather than per row.
