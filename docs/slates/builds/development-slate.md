# Development slate — land, structure, and what a parcel can carry

> **Status: design captured 2026-08-01, not built.** Grew out of a review
> question on the furnishing build's acreage model (D17): *"land area ×
> storeys is crude — that's the maximum; buildings don't use the whole lot,
> so actual usable area is smaller. Is that expressed anywhere?"*
>
> It wasn't. Chasing it turned up that the corridor problem and the
> **farmland** problem are the same problem, and that the answer is not a
> spatial model at all.

See also: [property-slate](./property-slate.md) (the two conserved
scarcities this adds a leg to) · [zoning-slate](./zoning-slate.md)
(⭐ per-location extent, and who regulates these ratios) ·
[stewardship-slate](./stewardship-slate.md) (land use, the closed six) ·
[farming-slate](./farming-slate.md) (the first consumer) ·
[furnishing.md](../../subsystems/furnishing.md) (acreage as shipped) ·
[husbandry.md](../../subsystems/husbandry.md) (limiting factors) ·
[parcel.md](../../subsystems/parcel.md) · [zone.md](../../subsystems/zone.md).

---

## The governing rule

> **Land is declared. Everything above it is measured.**
>
> And: **you need a parcel when someone can build on it. Authored content
> nobody can extend needs nothing at all.**

The second half is what keeps this from becoming red tape, and it is the
test every part of this design has to pass.

## Three planes, four ratios

The furnishing build conflated two planes; there are three, and planning
already has exact vocabulary for each boundary.

| plane | what it is | source |
|---|---|---|
| **land** | the parcel's ground area | `parcel.area` — **declared** |
| **footprint** | ground a structure stands on | ground-floor zone's cells × `cellSize²` |
| **gross floor** | all storeys | Σ over floor zones |
| **modelled rooms** | space you can walk in | the cells themselves |

| ratio | meaning |
|---|---|
| **coverage** | footprint ÷ land |
| **FAR / plot ratio** | gross floor ÷ land |
| **efficiency** | lettable cells ÷ built cells |
| **draw** | productive capacity used ÷ land (below) |

Every one of these **derives**. Only `parcel.area` is declared.

## Never model the tissue

Corridors, landings, alcoves, wall thickness, risers, the gap between a
farmhouse and its path — none of it becomes a thing.

Within a zone, cells are uniform (`cellSize`), so there is no inter-cell
residue to price. Between zones, inferred content is backstory. **Efficiency
is `lettable cells ÷ built cells` and nothing else** — a corridor is a cell
that lets no unit, a stairwell is a cell. You count rooms by role and you
never model a wall.

This is the LOD ladder doing its job, not a gap in the model.

## Zones overlap — so the remainder is a BUDGET, not a partition

The decisive constraint. A `CartesianZone` is not a cube: it is a
**contiguous room-set**, and two zones can interpenetrate. A farm zone can
wrap the path zone that crosses it.

So "700 m² unused" is not a well-defined quantity, and any spatial
accounting of the remainder is the wrong model. What survives is a
**budget**: how much a parcel can carry, drawn against by the things on it.
Nothing ever needs to know *where* anything is — only *how much*.

## Land's job is to make production scarce

Today it doesn't. An author can drop 500 field-cells on a tiny parcel and
the economy will not object, because output is capped by cell count and
cells are free to author. **`parcel.area` is currently decorative** wherever
it matters most.

The fix:

```
draw       = Σ over productive objects (beds, fields) of their land requirement
available  = parcel.area − draw                 (derive on read, never stored)
```

**Only productive uses draw.** Paths, corridors, lobbies, farmhouses,
yards, decoration: free. That is *why* filler never needed pricing, and why
the farmland remainder does — the distinction was never spatial, it was
**does this use produce?**

It slots into property-slate's standing doctrine — *two conserved
scarcities, never collapsed, coupled only at the parcel* — as the missing
leg: **land prices production, compute prices liveness.**

### The draw rides the productive object

Not the zone, and not a free-text declaration. Both fail:

- **cell-count** fails *expressiveness* — the only lever is how many cells,
  and a barn inside the field zone would draw against farming;
- **a declared per-zone number** fails *honesty* — an author could say a
  thousand-cell estate draws 1 m² and no player could tell.

So the draw is a **land requirement on the bed / field / plot** — the shape
husbandry already has (the pot-as-N=1-bed). Authors compose beds of
whatever size; a greenhouse can draw differently from open ground; a barn
draws nothing because it is not a bed. And the number is backed by things
the player can **count**: *"40 plants in beds totalling 400 m²; your parcel
supports 1000."* A ledger, not a stamp.

### Density is soft. Extent is hard. They are not the same thing.

**This originally said "over-draw is permitted, no penalty mechanic," and
that was wrong** — build-2 caught it. The claim was that crowding is
competition for light, water and nutrients, so the shipped min-of-three
limiting factor handles over-draw with nothing new to build. That is **true
within a bed and false across beds**: each `Cultivable` owns its own
moisture and nitrogen reserves and its own reconcile, so four plants in four
beds compete for nothing. A player who over-draws by *adding beds* gets
linear output and no penalty at all, and land goes on meaning nothing.

The error was conflating two different quantities:

| | real? | model |
|---|---|---|
| **density** — too many plants in one bed | yes, farmers over-sow constantly | **soft**: per-plant share falls, min-of-three does the rest, diminishing returns **emerge** |
| **extent** — more bed than you have land | **no. There is simply no room** | **hard**: refuse the placement |

A hard cap on *density* would teach something false — that is the argument
this slate started with, and it still holds. But extending it to *extent*
was the mistake. **You cannot put a hundred acres of beds on ten acres of
land**, and there is no "you can, it just goes badly" — there is nowhere to
put them. Refusing is not a penalty and not a multiplier; it is geometry,
and it is the most honest statement in the model.

So: **placing a productive object that would exceed the parcel's available
land is refused, because there is no room for it.** Same shape as
`subdivide`'s ceiling, one tier down.

That makes *land's job is to make production scarce* true immediately, and
it is **cheaper than every alternative considered**: no parcel-level shared
water pool (which is physically dubious anyway — two fields share an
aquifer, they do not share topsoil nitrogen), no `min(1, available ÷ draw)`
effective-soil multiplier (the administered penalty this slate exists to
avoid, hidden one level down), and no deferral.

Crowding within a bed stays soft and emergent, exactly as designed.

### Unused capacity is indefinite

It sits as free option value. Land-banking becomes a viable strategy — which
is real, and is precisely what land-value taxes and use-it-or-lose-it rules
exist to fight. So it stops being a mechanical annoyance and becomes
**something the legislature can argue about**, which is the right home for
it in this game.

## The hermit test — no burden on authors who don't care

> *A hermit in a forest. A small shack, maybe a garden. None of it
> parcelled. Does this still work?*

**Yes, and without a single number.** Three things make that true, and none
of them is a special case:

1. **`ParcelApi.ownerOf` is total.** Unparcelled land already resolves — it
   falls back to the state. Nothing breaks by having no parcel.
2. **Unmeasured land is not policed.** A parcel with no declared `area`
   imposes no cap; this is already how the shipped acreage check degrades
   (`if (area > 0 …)`), so the rule is consistent rather than bolted on.
3. **Husbandry never needed parcels.** The shipped houseplant grows in a
   dorm room with no parcel anywhere near it.

The deeper reason the burden lands correctly:

> **The cap constrains player expansion, not authored content.** An author
> writing a hermit's garden places N beds and that is the end of it —
> nobody can add more. A player holding a farm parcel *can* add beds, and
> that is exactly where scarcity has to bind.

So an author who wants a shack and a garden that reminds them of a film
writes a shack and a garden. They opt into the property system only when
they want a player to **own, extend, or be taxed on** it — at which point
they are asking for the machinery deliberately.

### The CMS should propose the numbers, not demand them

The burden inverts if the tooling computes. An author builds the farm; the
CMS says *"this draws 400 m² — set the parcel at 1000?"* Read-outs for
coverage, FAR, efficiency and available capacity; a **warning** (never a
refusal) when a parcel is over-drawn; a proposed `area` inferred from what
was built.

That is the difference between a system that asks authors to do arithmetic
and one that does the arithmetic and lets them disagree with it.

## Entitlement vs built

`storeys` (shipped in the furnishing build) sharpens under this model. The
zone tree says what is **built**; a declared `storeys` says what is
**permitted**:

- **declared storeys** — the envelope you hold
- **built floor zones** — what you have actually put up
- **the gap** — development potential

That is a real-estate primitive, not bookkeeping: it is what a site trades
on, what a planning authority grants, and what a speculator buys. It also
keeps working *before* any floor exists, which a derived count cannot — you
subdivide and lease against a permit, not against poured concrete.

**And it unifies the two halves.** If land caps productive draw, a building
is *how you beat the cap*: four storeys fit four times the lettable draw on
one footprint. Which is what buildings are **for**. It also makes
**vertical farming a coherent late unlock** — the thing that lets
agriculture escape a constraint everything else escaped centuries ago. A
real lesson, arriving as a consequence rather than a feature.

## Open questions

- **Minted identity may already unblock per-room extent.** Build-2 found
  that `StuffApi.clone(source, { asTemplatePath })` mints a clone at a
  scheme-derived identity path, so a per-instance room **can** be a
  `CartesianLocation` — which a Warren-cloned room cannot, and which is why
  `DormRoom` is non-coordinate. If rooms can be cartesian, they have
  `cellSize²` area, and **measured efficiency (lettable cells ÷ built
  cells) becomes computable without any new field.** Worth testing before
  designing anything else here.
- **Zone extent.** A zone declares `cellSize` but has **no bounds** — so
  *"floor plate you are permitted to build on but haven't"* is not
  expressible. Vertical potential is (entitlement vs built); horizontal is
  not. Adding a per-zone extent makes it symmetric and turns an unbuilt cell
  into an ownable, developable thing. **Deferred** — it is the same
  per-location-extent work [zoning](./zoning-slate.md) already flags as
  ⭐ *build early*, and wants deciding alongside setbacks and coverage
  limits. Vertical potential alone is enough to make the mechanic legible.
- **Which uses are productive?** Land use (stewardship's closed six) is the
  natural carrier, but the mapping is not obvious at the edges — a shop is
  commercial and produces; is its floor area a draw against land, or is
  retail's scarcity somewhere else entirely?
- **Does rent count as production?** The farm case is clear. Whether a
  leased unit's lettable area draws against land the way a field does is
  genuinely open, and it decides whether this is one budget or two.
- **Regulation vs engine.** Do coverage/FAR ever *bind*, or are they
  read-outs a legislature may choose to regulate? Strongly the latter —
  that is where zoning becomes playable rather than a constraint solver.

## What this slate does NOT cover

- **Land use itself** — the closed vocabulary → stewardship.
- **Zoning regulation** — setbacks, coverage limits, nuisance → zoning.
- **The growth model** — Liebig, GDD, soil reserves → husbandry / farming.
  This slate only says crowding feeds the *existing* limiting factors.
- **Compute allowance** — the other conserved scarcity → property.
- **A `develop` verb, or development as a vocation.** Named, not designed.

## Corrections this slate makes to shipped code

The furnishing build (MR !159) shipped `parcel.area`, `storeys` and
`workableAreaOf`. Two things want revisiting:

1. **`subdivide`'s ceiling makes *every* child draw against the parent.**
   Wrong for the corridor reason — a circulation sub-parcel would consume
   lettable capacity it does not produce from. **Only productive children
   should draw.**
2. **The ceiling is documented as usable area; it is a maximum.**
   `area × storeys` is *gross*. `furnishing.md` should say so plainly until
   efficiency is measured.
