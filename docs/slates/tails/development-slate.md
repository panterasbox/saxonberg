# Development slate — land, structure, and what a parcel can carry

> **Status: PARTIAL** — the land draw (only productive things draw)
> shipped with farming → [smallholding.md](../../subsystems/smallholding.md);
> the hermit test and coverage/an area-based efficiency also shipped →
> smallholding.md + [furnishing.md](../../subsystems/furnishing.md)
> (`ParcelApi.spaceOf`)
> **Left:** FAR + a cell-counted efficiency ratio (`lettable cells ÷
> built cells`, not the area-based one that shipped) · the `subdivide`
> ceiling correction (only productive children draw — still unbuilt,
> `childAreaTotal` sums every child) · the hard extent cap on over-draw
> (density stays soft; contradicts today's shipped/tested "over-draw is
> inert" behavior — unresolved, see the compaction ledger) · unused
> capacity as a land-banking/legislative dial · the CMS proposing the
> numbers · entitlement vs built
> **Size:** a wave

See also: [property-slate](../builds/property-slate.md) (the two conserved
scarcities this adds a leg to) · [zoning-slate](../builds/zoning-slate.md)
(⭐ per-location extent, and who regulates these ratios) ·
[stewardship-slate](../builds/stewardship-slate.md) (land use, the closed six) ·
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

> The fix shipped: `draw = Σ` over productive objects' land requirement,
> `available = parcel.area − draw`, authored on the bed/field/plot (not
> the zone, not a per-parcel declaration), only productive uses draw —
> see `smallholding.md § The land draw`. What's still open is below.

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

> The hermit test itself — a shack and a garden in an unparcelled forest,
> working with zero numbers — shipped and is documented twice already:
> `smallholding.md § Unparcelled ground is NOT policed` and
> `furnishing.md`'s "Unmeasured land is not policed" line. What's still
> open is the tooling half, below.

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

- ~~Minted identity may already unblock per-room extent~~ — **answered,
  the other way.** The `asTemplatePath` channel this leaned on is
  retired; a holding's rooms are now keyed instances of a real
  `FurnishableRoom` row — deliberately **not** `CartesianLocation`,
  because a room minted per lot cannot safely be a grid member. See
  `smallholding.md § A lot's room is NOT on the street's grid`. Cartesian
  per-room area is not how per-room extent will be reached.
- **Zone extent.** A zone declares `cellSize` but has **no bounds** — so
  *"floor plate you are permitted to build on but haven't"* is not
  expressible. Vertical potential is (entitlement vs built); horizontal is
  not. Adding a per-zone extent makes it symmetric and turns an unbuilt cell
  into an ownable, developable thing. **Deferred** — it is the same
  per-location-extent work [zoning](../builds/zoning-slate.md) already flags as
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
`workableAreaOf`. One correction still wants making:

1. **`subdivide`'s ceiling makes *every* child draw against the parent.**
   Wrong for the corridor reason — a circulation sub-parcel would consume
   lettable capacity it does not produce from. **Only productive children
   should draw.** Still true: `ParcelRegistry.childAreaTotal` sums every
   child unconditionally, with no `landUse`/productive filter, even
   though `landUse` itself has since landed on `ParcelRecord`.

(The second correction — documenting `area × storeys` as a maximum, not a
usable figure — is done: `furnishing.md § The space account` says so
plainly.)
