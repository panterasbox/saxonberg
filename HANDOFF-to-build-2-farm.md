# Handoff → the farm build (build-2), from build-3

You are building a farm. We just spent a design session on **how land
relates to what is grown on it**, and it lands directly on you. Full write-up:
`docs/slates/builds/development-slate.md`. This is the short version.

---

## The one thing to internalise

> **Land's job is to make production scarce — and today it does not.**

An author can drop 500 field-cells onto a tiny parcel and the economy will
not object, because output is capped by cell count and cells are free to
author. `parcel.area` is currently **decorative** exactly where it matters
most. If the farm ships without this, land area means nothing agriculturally.

---

## Five decisions, already made

### 1. The land draw rides the BED, not the zone and not a declaration

```
draw      = Σ over productive objects (beds, fields, plots) of their land requirement
available = parcel.area − draw          (derive on read, NEVER stored)
```

Rejected, with reasons — please don't re-litigate without reading them:

- **cell-count** fails *expressiveness*: the only lever is how many cells,
  and a barn inside the field zone would draw against farming;
- **a declared per-zone number** fails *honesty*: an author could claim a
  thousand-cell estate draws 1 m² and no player could tell.

A land requirement on the bed is expressive (compose beds of any size; a
greenhouse can draw differently from open ground) **and** honest (the number
is backed by things the player can count). Same shape as `restQuality` on a
bed: an authored constant on the object, consumed by a system that exists.

### 2. Only PRODUCTIVE things draw

Paths, corridors, farmhouses, barns, lobbies, yards, decoration: **free**.
The distinction was never spatial — it is *does this use produce?* That is
also why filler never needed pricing.

### 3. Over-draw is permitted, and you build NO penalty mechanic

A hard cap is the **dishonest** option — real land does not refuse. But do
not write a soft cap either. **Crowding is competition for light, water and
nutrients**, so over-planting reduces the per-plant share of exactly those
and the existing **min-of-three limiting factor** does the rest.

Diminishing returns should **emerge**, not be administered. Nothing new to
build. This is the part most likely to get "helpfully" reimplemented as a
yield multiplier — please don't.

### 4. Unused capacity is indefinite

No decay. It sits as free option value, land-banking becomes viable, and
that becomes something the **legislature** argues about (land-value tax,
use-it-or-lose-it) rather than a mechanic we pre-empt.

### 5. ⚠ The hermit test — DO NOT create red tape

> *A hermit in a forest. A shack, maybe a garden. Nothing parcelled.*

**That must keep working with zero numbers**, and it does — no special case
needed:

- `ParcelApi.ownerOf` is **total**; unparcelled land already resolves.
- **Unmeasured land is not policed** — a parcel with no declared `area`
  imposes no cap (this is how the shipped acreage check already degrades).
- **Husbandry never needed parcels** — the shipped houseplant grows in a
  dorm room.

The reason the burden lands correctly:

> **The cap constrains player expansion, not authored content.** An author
> places N beds and that is the end of it. A player holding a farm parcel
> *can* add beds — that is where scarcity has to bind.

**If your farm work makes an author declare a number to write a garden, it
is wrong.** The CMS should *propose* numbers from what was built ("this
draws 400 m² — set the parcel at 1000?") and warn rather than refuse.

---

## What already exists on `feature/furnishing` (MR !159)

Merging soon; rebase onto it rather than duplicating:

- **`ParcelRecord.area`** (m², gross ground) — declared at provision, never
  derived. Same declaration shape build-2 was already planning, so the merge
  is trivial.
- **`ParcelRecord.storeys`** (default 1) — `subdivide` conserves children
  against `area × storeys`. Multi-storey breaks plain area conservation: a
  300 m² footprint at four storeys offers ~1200 m² of interior, and a rule
  written against ground area alone refuses apartments on the second floor.
- **`ParcelApi.workableAreaOf(extent)`** = `area − Σ children.area`, derived
  on read, never stored.
- Unmeasured land is not policed — the named regression.

### Two corrections that branch needs, and you may hit first

1. **`subdivide`'s ceiling makes EVERY child draw against the parent.**
   Wrong for the corridor reason — a circulation sub-parcel consumes
   lettable capacity it does not produce from. **Only productive children
   should draw.**
2. **`area × storeys` is a MAXIMUM, not usable area.** It is gross floor;
   real lettable is less (walls, cores, corridors). Documented as a ceiling.

---

## Two asks from the earlier handoff, still open

1. **Land `PersistableApi.restoreOrSeed` on master first** — your Wave 2
   extracts it, and build-3's unit provisioning uses exactly that shape.
2. **Write your `subdivide` band check as `area × (storeys ?? 1)`** — costs
   nothing today, avoids two commits on one function.

---

## Context you may want but don't need

Efficiency (`lettable cells ÷ built cells`), coverage, FAR, and
entitlement-vs-built are all in the slate. They matter for **buildings**, not
for your farm — the farm only needs the productive-draw half. The one line
worth knowing: **a building is how you beat the land cap** (four storeys fit
four times the draw on one footprint), which makes **vertical farming a
coherent late unlock** rather than a special case.

## A warning from build-3, earned the hard way

Four real defects shipped past a green 7,300-test suite this build, and all
four lived between *a passing test* and *a reachable feature* — a class that
composed no `PopulatesMixin` (so every seed's `populates:` was inert), an
insert-only seeder that never updated an edited row, and posture verbs no
player could issue. See `docs/antipatterns.md` § *Testing the layer you wrote
instead of the layer a player reaches*.

**For a farm, that means: boot it, walk to the field, and plant something.**
A seed file is not the world, and an Api call is not a verb.
