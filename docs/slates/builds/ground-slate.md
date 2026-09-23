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
> authors one) · **the **four-rung** underfoot ladder** · **the `onGrade` flag, on
> the floor rather than the Location** · **`/system/ground`**: the column and the
> seeded surface character unified as one substrate read at a depth ·
> `GroundCharacter` out of the farming trade · the floor's first real consumer
> (`dig` asks *what is underfoot* and *is this on grade*) · ⭐⭐ **the closed
> ground-kind vocabulary, DERIVED from `f(material, onGrade)` and never chosen** ·
> **the two-part census** (every Location's resolved kind, and every room whose
> PROSE claims a ground nothing backs — the second list may only shrink)
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

## The four-rung ladder

⚠⚠ **It was five at slate time and one rung was illegal.** *"An authored field on
the Location"* contradicts a doctrine the engine states outright — *"A Location
represents space, not matter — so it is NOT Tangible (rooms have no material or
mass; nothing ever read them)"* (`lib/stuff/Location.ts:32-35`). Putting a
material on a room is the one thing this build must not do, and the floor's own
authored material was always the authored rung. Corrected 2026-09-23.

What is underfoot resolves in the authored-beats-derived shape used everywhere
in this codebase:

1. **the floor's own authored material** — flagstone, board, ice. Always wins.
2. ⭐ **the ground's top band** — *only* where the floor declares itself
   `onGrade`. This is the rung the quarry, the heath and the field use.
3. **the archetype or zone default** — a building's boards, the dorm's floor.
4. **the universal default** — the `default-floor` row that already exists and
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

## ⭐⭐⭐ Ground kinds are derived, not chosen — and the city's roads proved it

**Added 2026-09-23**, after stress-testing the design against the Eternal
city's own road descriptions (the user's suggestion, and it broke the first
version).

The first version had a **closed list an author picks from**: earth · rock ·
loose · mire · paving · beaten · board · slab · plate · contrived. Four shipped
rooms and one designed one were run against it:

| room | its own prose | verdict |
|---|---|---|
| the market square | *"a cobbled square"* | ✅ clean |
| the university crossing | *"underfoot the stone is swept but **worn in a diagonal track**"* | ✅ paving — ⚠ but the wear is a durable fact with nowhere to live |
| the goods yard | *"a long cobbled strip … with **a gutter** running the length of it"* | ✅ paving — ⚠ plus a drainage feature |
| Hinkley's lane | *"**a made road** with nothing on it"*, grass growing through | ⚠ **ambiguous** — paving? gravel? graded earth? An author must guess |
| ⭐ **Limbo Lane** (designed) | *"an odd pink material paves it — **soft, rubbery, faintly aglow**, and it **springs underfoot**"* | ⛔ **BREAKS IT.** Paved, on the ground, and nothing like paving. Either the road lies about itself or the closed list is forced open. |

> ⭐⭐⭐ **So the kind is WORKED OUT, not asserted.** The material already knows
> whether it is set stone, loam, timber, plate or odd-pink-rubbery. Limbo Lane
> then needs **no vocabulary edit at all** — tag the material and the kind falls
> out.

⚠⚠ **`f(material, onGrade)` turned out to be one input short** (found at plan
time, 2026-09-23). **Nothing about a material separates living rock from set
paving** — a quarry floor and a flagged courtyard are both granite, both on the
ground. And the material may not be taught the difference: `wool.yaml:9-11` states
the rule — *"A material must not assert a CONSTRUCTION — `woven` is a form a
garment carries, not something wool IS."*

> **So the fold is `f(material, onGrade, worked)`** — *worked* meaning dressed,
> laid or rammed by somebody rather than lying as it fell. It is construction, so
> it is the floor's own property beside `onGrade`, and what it carries is real:
> **you can lift a flag; you must win a rock shelf.**

What that buys, and each of these was a stated requirement:

- **the same ground behaves the same BY CONSTRUCTION** — two cobbled squares
  cannot diverge, because nothing was chosen for either;
- **subclassing costs one line** — name a material, the cheapest authoring act
  in this world;
- **the list can never refuse an odd floor** — it describes the common cases
  instead of gating them;
- **the "made road" guess disappears** — an author asked what it is made of
  already knows.

⚠ **`onGrade` stays asserted**, because it cannot come from a material: flagstone
sits on the earth in a courtyard and on joists in a hall. So material is derived
or authored; **on-grade is always the floor's own property**, defaulting sensibly.

⚠ **And wear, gutters and worn tracks are DETAILS, never kinds.** A list that
grows a member per worn flagstone is not closed. The floor can already carry
details, and the demo-content design reached the same answer independently —
specifying the pink lane's `paving` as a detail with a touch slot (*"press it and
it presses back, patient, like it's done this before"*).

### The census is two lists, and the second is the useful one

1. every Location and the ground it resolved to — proof all 180 are accounted
   for, with anything falling through to the plain default flagged;
2. ⭐⭐ **every room whose DESCRIPTION claims a ground nothing backs** — read out
   of the prose, not the rows. The crossing's *underfoot*, `GlassAlley`'s broken
   bottles, the yard's gutter. This is the same gap class as `old-workings`' wall
   built *"out of the bigger pieces"* with no building stone in the game, and it
   is the worksheet the 1.0 content pass actually needs. **Its length may only
   fall.**

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
2. ✅ **CLOSED — neither: `adornments:`.** The survey settled it.
   `AdornableMixin` composes on **base `Location`**, so `adornments:` is already an
   authorable instruction field on **every** Location with no new mixin; it has
   **no once-guard** and `captureSlice` stores nothing, so floors rebuild from the
   row every hydrate at **zero disk cost**. ⭐⭐ And it is the **only** lever the
   warren-generated starting room has: `props:` on the lounge template would
   **throw**, because that class composes no `PopulatesMixin`. What remains for the
   plan is only *how the default gets attached when no row authors one* — and
   `default-floor.yaml` already documents a `noDefaultFloor: true` opt-out that no
   code reads, so v1 specified the default and skipped the mechanism.
3. **Does `Floor` stay the class name?** It is about to cover the ground outdoors
   as well as boards indoors, and *floor* reads indoor. `Ground` collides with
   the keyword; `Underfoot` is a read, not a thing. **Lean: keep `Floor`** — a
   quarry floor and a cave floor are both called floors in English, and renaming
   touches six shipped rows for a word.
4. ✅ **CLOSED, and it is subtler than the question assumed.** An arg `default:`
   is **not MQL and not a keyword match** — it runs through shell variable
   interpolation only, so `"ground"` lands as the literal word a player might have
   typed and is resolved afterwards with the `requires:` filter. So yes, the
   default stays untouched **iff something in reach is keyworded `ground` and bears
   a posture**. ⚠ And there is a trap: **`default-floor`'s own keywords are
   `[floor, featureless, plain]` — no `ground`** (only its *detail* keywords have
   it), so attaching that row everywhere may not fix `sit` by itself. The keyword
   set is part of the fix.
5. ⭐ **And two defects the survey found, now in the build:** `sit on ground`
   fails because the posture views declare no `prepositions:`, so `on` binds as the
   target and the leftover word trips *"too many arguments"*; and
   ⚠⚠ **`AdornmentMixin.canEvict` does not exist** although
   `residency.md:218` promises it does — presence cannot keep a fixture warm
   (fixtures are not contents), so 150+ floors with no veto and eviction in
   `enforce` mode means a floor culled from under a standing player, the exact
   failure `Exit.canEvict` was written to prevent.
