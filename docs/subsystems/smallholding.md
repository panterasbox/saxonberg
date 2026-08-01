# Smallholding — ground you own, and what grows on it

Living-world **phase 2**. Phase 1 ([husbandry.md](./husbandry.md)) built a
houseplant: one plant, one pot, on someone else's windowsill. This phase
is the same growth model on **ground you hold title to** — a garden bed
with several plants sharing soil, a crop you take off it, and a suburb to
put it in.

Three things arrive that phase 1 had no use for:

| Concern | Lives in |
|---|---|
| **What may be done on a piece of ground** | `lib/parcel/LandUse.ts` — the closed six, on `ParcelRecord` |
| **Ground that holds plants** | `lib/husbandry/Cultivable.ts` — the pot's surface, generalized |
| **The keyed-holder ground pattern** | `PersistableApi.restoreOrSeed` — see [persistence.md](./persistence.md) |

Read [husbandry.md](./husbandry.md) first: the growth model itself is
unchanged except additively, and every claim here rests on it.

---

## The governing reduction: a pot is a bed with one slot

The farming slate specifies a bed as *"a `Slotted` fixture with N slots;
each plant is a `Slottable`"*, and phase 1 built a pot as exactly that at
**N = 1**. `CultivableMixin` is that shared surface, lifted off `PlantPot`
unchanged: the soil read, the plant-slot vocabulary, the
populate-then-adopt applier, the carrier `onMoved` forward, and the soil's
own state.

**N is one authored number**, not a new field and not N named slots — the
`plant` slot's existing `capacity`. A pot says `1`; a bed says `4`. The
shipped pot seeds needed no change to become the degenerate case of the
new thing.

Every generalization in this phase reduces to phase 1's behaviour at
N = 1, and the phase-1 suite passing untouched is how that is known.

### The one structural difference, and where it is NOT

A bed cannot be carried and a pot can. That is **mass**, not class:

> *"Carry / drag / ride / can't-budge is emergent from mass vs. a bearer's
> capacity, never a type flag — you can't pocket a ship is a mass gate,
> not `instanceof`."* — `lib/stuff/Vessel.ts`

`GardenBed` composes the identical stack over `Thing`, weighs 340 kg
filled, and `GetController`'s encumbrance ceiling (≈ the bearer's own body
mass) answers *"it doesn't budge"*. Two consequences fall out for free: an
**empty** bed's frame could be shifted by a strong character, and a bed
stays `Containable` — which it must be, because containment is how a thing
is in a room, and a bed that could not be placed would leave the land-use
gate nothing to gate.

---

## Shared soil, and why density is a real decision

```
rootRoomPerPlant() = soilVolume / max(1, occupiedSlots)
```

At N = 1 that is exactly phase 1's expression. Above it, the **unchanged**
`satRoot` curve does new work for nothing: four plants in one bed each get
a quarter of the soil, so a crowded bed root-limits its plants exactly as a
too-small pot does, with the same cause line.

Dividing by **occupied** rather than capacity is deliberate — an
under-planted bed genuinely gives each plant more, so thinning is a real
choice and crowding is a real cost.

`fitsSlot` asks the question **prospectively** (`rootRoomPerPlant(1)`).
Asking it non-prospectively would wave a fourth plant into a bed sized for
three and only bind it afterwards.

---

## Soil state: the soil has a checkpoint of its own

The phase-2 change that touches phase 1's model. Water moved out of the
plant and into the ground; a fourth limiting factor arrived with it.

A `Cultivable` host owns:

- a **`moisture`** reserve (litres) — what the earth is holding;
- a **`nitrogen`** reserve (percentage points) — **beds only**;
- its own **`soilClockStamp`**, **`reconcileSoil()`** and **reentry
  guard**.

It drains moisture by the **summed** `waterDemandPerGameDay()` of its
occupants × warmth over its own elapsed window, and reports the window's
**mean** for a plant integrating that window whole. The plant only reads,
through three host seams on `GrowingMixin`: `soilMoisture()`,
`meanSoilMoisture()` and `nutrientLevel()`.

The full rationale — including why this is two self-contained checkpoints
rather than one split across two objects, the recursion hazard, and the
three ordering rules (both clocks start together; occupancy changes settle
the window; a re-seat is not a transplant) — is in
[husbandry.md](./husbandry.md) § the moisture callout. It belongs there
because it *reverses* a decision recorded there.

### Nitrogen is the fourth factor, and a pot never sees it

`satNutrient` joins `Math.min(satWater, satLight, satRoot, satNutrient)`
with its own cause line (*"The soil is spent."*). It reads `null` when the
ground declares no nitrogen reserve, and `null` means 1 — **so a
houseplant is never nutrient-limited, because a pot authors none.** That
is the seam that keeps phase 1's behaviour intact while the axis exists.

Harvesting **exports** nitrogen; `feed` puts it back. An unfed bed yields
worse each round, which is the whole loop.

---

## Quality: farming rewards your worst moment

`_worstLimiting` is a **monotone minimum** of the limiting satisfaction
over a plant's whole life, seeded at 1 and updated every reconcile step.
`harvest` maps it to a `GradeBand` through four dials.

It cannot be derived after the fact from the smoothed `_vigor`: a plant
nursed back from a drought **looks perfectly healthy** at harvest and must
still grade badly. Attention is the input, and you cannot buy the band
back at the end.

The crop itself is a plain `Thing` plus **`CraftedMixin`** — crafting
already models "a made thing whose quality is a verdict and whose maker is
recorded", and a harvest is a making. Same five-rung `Grade`, same
`renderVerdict()` prose, same maker's mark as a knife off a bench, and the
maker derives from the execution context rather than being a parameter.
See [crafting.md](./crafting.md).

> A crop carries a **maker**, not an **owner**. `CraftedMixin` stamps who
> grew it; chattel-title stamps who holds it. Once chattel-title lands a
> harvested crop may want both — see [chattel.md](./chattel.md).

---

## Land use — the closed six, and it refuses

`lib/parcel/LandUse.ts`: `residential · agricultural · commercial ·
industrial · civic · wild`, closed the way Module Categories and the
Material library are closed. Each use declares **capability + ceiling** —
how much cultivation it admits (`none · bed · field`) and a permissible
lot-area band.

`ParcelApi.landUseOf(path)` resolves by **longest prefix**: the covering
parcel, then its `parentParcel` chain, then `wild`.

### ⚠ `wild` admits nothing, and that is load-bearing

**Most parcel rows are not ground at all.** `/studio`, `/lib/lounge` and
the `/obj/…` roots are path-branch titles over the template tree, and they
all answer `wild`. Had `wild` admitted a bed, cultivation would be legal
on every branch nobody thought to zone. Stewardship's own gloss agrees —
*"~nothing built; passage and gathering"* is gathering, not farming.

### ⚠ It lives on the parcel row, never on the zone

Land use **gates behaviour**, which makes it access-check data, and
`config/parcels.yaml`'s header is explicit:

> *"ownership is declared HERE (a gated platform seed channel), **never on
> the editable `domain` zone template**… **access-check data lives only in
> this collection.**"*

On an editable zone template a content author could rezone their own land
— the precise forgery the retired `data.ownerGroupName` stamps were
removed to close.

### The gate applies to GROUND, not to furniture

`Cultivable.fixedGround` (authored data, not a class check) decides.
A garden bed is ground: what may be grown in it is the parcel's business,
and a bed on the Registry's civic floor is refused with the use named. A
pot is furniture — a houseplant on a windowsill in a rented office is not
agriculture, and gating it would make every commercial room in the game
unfurnishable.

### Area is DECLARED, never derived

`ParcelRecord.area: Quantity<'m²'> | null`, set at provision.
`subdivide` refuses a child outside its effective use's band.

**Do not derive it from room geometry.** `Location.getSizeScale()` is m²
too, but it is a **photometric denominator** (flux ÷ area → lux) with one
consumer. Deriving from it would make placeholder rooms load-bearing *and*
promote a lighting constant into a land-tenure fact, so every future
lighting tweak became a title migration. A structure's draw on its parcel
is its **authored blueprint footprint**, not a sum over its rooms.

The band is a **lot** band, checked only on a subdivided child. A
24-hectare `residential` district is not a contradiction with a 2-hectare
residential lot ceiling — a district is what lots are subdivided *out of*.

---

## The keyed-holder ground pattern

`PersistableApi.restoreOrSeed(host, key)` — key the host, then either
restore its `(scope, key)` record or lay down its born-with fixtures and
capture them. Returns `true` on restore, `false` on a fresh seed.

`DormWarren.admit` and `LotHolder` are its two consumers, and the
extraction earns itself on the branch it gets right: hand-rolled, the six
lines invite capturing on the restore path, re-seeding a room that already
has contents, or skipping the key stash so the next keyless capture writes
a second record.

`LotHolder` keys on the **parcel extent**, so title and durable state share
one identity — sell the lot and the garden goes with it, because there is
nothing else it could do. It is content, so it is **not** boundary-exempt,
and should not be (`DormWarren` likewise is not).

See [persistence.md](./persistence.md) and [residence.md](./residence.md).

---

## `title` — the act the property build lacked

Every piece of title machinery shipped with the property build and none of
it had a verb. `title` / `title list` / `title buy <lot>`, in **civics**,
next to `government`.

Not `buy`: retail hands over an item off a `PricedOffer` and
chattel-stamps it, and land is real property on a different registry. And
not a verb conferred by the Registry counter — the shipped rule is that a
commerce object affords only its **commerce** verbs.

**The order is the design:** at the Registry → funds check → money through
banking's settle chokepoint → `subdivide` (stamping use and area, where
zoning refuses a bad lot) → `transfer` → stand the yard up. The money
moves before the row is written, so an unfunded buyer changes nothing at
all — no parcel row, no chain-of-title event, no yard. A half-completed
land sale is worse than a refused one.

Two steps rather than one for the mint, deliberately: the chain of title
should read *subdivided, then transferred*, because that is what happened.

Sandbox-safe for free — `subdivide` and `transfer` both carry
`assertFieldMutation`, and `parcels` is REFUSE in `COLLECTION_POLICIES`. A
title minted in a holodeck would be a real title.

---

## Hinkley Hills

A Locality at `terminus/hinkley-hills` — **beside** the city, not inside
it, which is the geographic argument in one address. Terminus is dense and
has no room for a garden; the Hills are what happens at its edge.

It **governs itself**. That is the Tiebout point made concrete: a second
polity a short walk away, with different rules, so leaving is a real option
long before anyone writes a law worth leaving over. The Improvement
District is the thinnest government in the game — no departments, no
treasury, no seats, because it has none of those things, and writing empty
structure in would be pretending. (Which is also why the city's records
office takes the payment for a lot: a paper government's finances look
exactly like that.)

Three rooms: the stop, the lane, the yard. The **unbuilt neighbouring
lots** are `details:` prose on the lane, not nine empty rooms — their
emptiness is the story, and prose tells it better at a hundredth the cost.
The **house is prose too**, deliberately: the residence build is furnishing
real interiors in parallel, and a described house can be upgraded later
instead of rebuilt.

The zone runs **6 m cells** against the city's 3 — open ground with room
between things, which is what makes a room out here read as a yard.

---

## Deferred seams

- **Nothing fills the bed's moisture from the sky.** Rain and real
  evapotranspiration are phase 4's; the reserve is now a *working* one
  rather than an inert seam, which is strictly better for it.
- **`landUse` answers `field`** and nothing implements a field. Phase 4.
- **`_worstLimiting` is the quality substrate.** Phase 4's per-stage
  sensitivities (drought at flowering costs *count*; at filling costs
  *size*) refine it.
- **The allowance cascade** stays inert.
- **No residence ladder and no ascent gate** — stewardship owns them, and
  both this build and the parallel apartment build decline them.
- **Perennials.** A harvest ends the plant; re-fruiting is a later
  question.

---

## Cross-references

- [husbandry.md](./husbandry.md) — the growth model, and the moisture
  reversal in full
- [parcel.md](./parcel.md) — the title registry this builds on
- [persistence.md](./persistence.md) — `restoreOrSeed` and the spine
- [address.md](./address.md) — the Locality tier
- [civics.md](./civics.md) — governments and jurisdiction
- [crafting.md](./crafting.md) — `CraftedMixin`, `Grade`, the maker's mark
- [banking.md](./banking.md) — the settle chokepoint the sale rides
