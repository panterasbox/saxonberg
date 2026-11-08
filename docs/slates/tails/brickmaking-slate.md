# Brickmaking slate — clay won, weathered, moulded, dried and burnt

> **Status: PARTIAL** — designed 2026-10-18 with the owner, as the first new
> consumer the [moulding slate](./moulding-slate.md) ruled (§ 0). The
> ceramics build (MR !437, merged 2026-10-30) shipped the trade —
> `trade-ceramics` at `/trade/ceramics`, the Delight brickfield, winning ·
> weathering · tempering · `shape` at the brick table · the clamp and its
> grades · the statute brick · firebrick linings — see
> [ceramics.md](../../subsystems/ceramics.md). What remains is the demand
> side that waits on repair W7 (compacted 2026-11-05).
> **Left:** the per-brick tax and its size effect (§ 3) · W7 reading a brick's
> grade as the wall's upkeep bill (§ 5, Open 3) · the Scotch and Hoffmann kiln
> rungs (§ 5) · roof tiles, drain tiles and chimney pots as consumers (§ 6) ·
> lime mortar by cure, hydraulic lime, repointing, the hard-mortar spall and
> the bricklayer (§ 7) · the building trades gathered into W7's pack (§ 8)
> **Size:** a wave — rides repair W7 (building upkeep), which is its demand;
> the per-brick tax rides governance's standards; the kiln rungs are a tail

**Sits on:** [moulding-slate](./moulding-slate.md) § 0a ·
[ground.md](../../subsystems/ground.md) (the worked-act protocol) ·
`trade-quarrying` (content-packs.md) · [weather.md](../../subsystems/weather.md)
(`dailyRangeAt`, wetness) · [taps.md](../../subsystems/taps.md) (the
freeze-thaw window) · [mining.md](../../subsystems/mining.md) § the clamp ·
[maturation.md](../../subsystems/maturation.md) (`chemical`) ·
[assembly.md](../../subsystems/assembly.md) (wear, `repair`) ·
[repair-slate](./repair-slate.md) (W7, building upkeep) ·
[soil.md](../../subsystems/soil.md) (drainage) · the potash slate (the
ash-man; on the cleanliness branch).

---

## 1. ⭐⭐ The demand — who uses bricks **[DECIDED]**

Structures clone fully built ([construction-slate](../builds/construction-slate.md)
is parked), so nobody *builds* with brick. The demand is **upkeep**:

- ⭐ **`maintain` on brick envelopes** — repair's W7: *"a building's walls and
  roof are layers, each weathers at its material's pace, and `maintain`
  replaces what time took — materials in hand, by that layer's trade."* A
  brick wall that weathers needs bricks and mortar on a schedule weathering
  sets. Gated on rubber's layers reaching master, as W7 is.
- Firebrick linings — shipped: [fire.md § Linings](../../subsystems/fire.md),
  [ceramics.md § Linings and crucibles](../../subsystems/ceramics.md).
- Ovens, hearths, flues; roof tiles; drain tiles; chimney pots.

Brick envelopes to weather — shipped as content: [ceramics.md § What the
brick is for](../../subsystems/ceramics.md).

## 2. Winning, weathering, tempering **[DECIDED]**

Shipped: [ceramics.md](../../subsystems/ceramics.md) §§ *Clay is a
composition* · *Clay has a year* · *Tempering is mixing*. (The count's other
readers — frost tilth, frost damage to brick — are in its *Deferred* table.)

## 3. Moulding, and the statute brick **[DECIDED]**

Moulding as a durative `shape` at the brick table, the gang as the roster —
shipped: [ceramics.md § Forms and the potter's hand](../../subsystems/ceramics.md).
The statute brick — shipped: [ceramics.md § `measure size`](../../subsystems/ceramics.md).
The per-brick tax below is still open.

- ⭐ **Size is a standard, and standards are authority** (moulding § 8): a
  mould's dimensions are its shape; a polity may declare a **statute brick**
  (England, 1571: 9 × 4½ × 2¼ in) as a governance standard (the gauger's
  `Government.standards`). ⭐ **England's brick tax of 1784** was charged *per
  brick*, so bricks grew, and Parliament then capped the size — a per-unit tax
  changing a building material's physical size, a lever with a computable
  effect. Mismatched bricks `maintain` a wall and the look reads the patch;
  the engine records size and never forbids.

## 4. Drying **[DECIDED]**

Shipped: [ceramics.md § Green ware — the water decides](../../subsystems/ceramics.md)
(the hacks, slump, frost, checks; the oversize mould under § *Forms*).

## 5. Firing **[DECIDED]**

The clamp and its grades by position — shipped:
[ceramics.md § The clamp grades by position](../../subsystems/ceramics.md).

- ⭐⭐ **Firing temperature derives water absorption** — a well-fired brick is
  partly vitrified and absorbs little; an under-fired one takes up rain,
  freezes and spalls. So the fired brick's `waterAbsorptionCapacity` derives
  from its firing, and **W7's weathering rate depends on it**: soft brick in
  an outside wall needs `maintain` far sooner — **the brick's grade becomes
  the building's upkeep bill**, and § 1's demand sustains itself.
- Colour from iron and the draught — shipped: [ceramics.md § Clay is a
  composition](../../subsystems/ceramics.md) (`firedColor`), § *The clamp*
  (the reducing blue brick).
- **The kiln is the next rung** — the Scotch kiln fired through arches burns
  more evenly (fewer bad bricks, less fuel per thousand); the Hoffmann
  continuous kiln (1858) is industrial. All are the fired recipe, rubber's
  way.

## 6. What else the brickfield makes **[DECIDED]**

| product | different | buyer |
|---|---|---|
| ⭐ **firebrick** | **fireclay** — refractory, low in iron and fluxes, from under coal seams | every furnace's **lining** — a **part** of the furnace (assembly) that **wears per firing** and is relined by the shipped `repair` |
| **roof tiles** | thin moulds; pantiles | W7's **roof layers** — the same under-firing lesson (soft tiles let the rain in) |
| ⭐ **drain tiles** | hollow pipe moulds | **farming** — laid in a field they improve its **drainage** (soil seeds it; ground character *prices improvement*): the 1840s tile-drainage revolution on wet clay |
| chimney pots, terracotta | moulded shapes | trim; rows |
| earthenware | thrown or press-moulded | ⭐ **the potter — the next trade**, not this build; the sugar cones and plaster moulds are its first customers |

Fireclay at Rejection — shipped (`rejection/…/idea/deposit/quarry-hill`;
[ceramics.md § Clay is a composition](../../subsystems/ceramics.md)).

## 7. Mortar, and the bricklayer **[DECIDED]**

- **Mortar** — quicklime from the quarry **slaked** to putty (a `chemical`
  step and a caustic harm route, as lye) + quarry sand. ⭐ It **sets by cure**
  — slow carbonation from the air's CO₂ over months: a maturation `chemical`
  set with no act, moulding's *cure*, its second consumer after plaster.
- ⭐ **Hydraulic lime** (lime burnt with clay, or Roman *pozzolana*) **sets
  under water** — Roman harbors, Smeaton's Eddystone (1759) — the material
  the hard-hat diver's footings and harbor works need
  ([underwater-slate](../builds/underwater-slate.md) § 11). The next rung.
- **The bricklayer is W7's trade** (*"by that layer's trade"*). ⭐ **Mortar is
  sacrificial** — water and frost leave a wall through its soft lime joints, so
  joints erode and bricks survive; **repointing** is the commonest brick
  upkeep, mostly a mortar bill.
- ⭐⭐ **The famous mistake is derivable**: repoint soft brick with **hard,
  impermeable cement** and the water can no longer leave by the joints — it
  leaves through the brick, freezes there, and the faces **spall**. Building
  conservation's central lesson, from two numbers already on the materials
  (relative permeability and hardness — the wet law): water leaves through the
  more permeable material. Lens 1 and lens 4: conservation against
  convenience.
- **Bonds** (English, Flemish, stretcher) are a wall's look — authored prose,
  no rule.

## 8. The pack and the venue **[DECIDED]**

The pack (`trade-ceramics`, `/trade/ceramics`, both trades) and the Delight
brickfield-and-pottery — shipped:
[ceramics.md § The works and their people](../../subsystems/ceramics.md)
(bricks by barge is in its *Deferred* table → river-slate). The masonry
Discipline ships in the pack (`idea/Discipline/masonry`;
[fire.md § Linings](../../subsystems/fire.md)).

- **The bricklaying discipline lives here until W7 ships**, and W7 may gather
  the **building trades** (bricklayer, mason, tiler, thatcher — each
  envelope material naming its trade) into their own pack.

## 9. The lens pass (2026-10-18)

1. **Pedagogy** — frost weathering (the freeze-thaw count); the temper
   window; drying shrinkage and the oversize mould; why moulding stops before
   frost; firing temperature → vitrification → absorption → weathering;
   oxidizing vs reducing colour; carbonation; ⭐ the hard-mortar spall.
2. **Expression** — the ordinary case is rows (a clay deposit, a brickfield,
   a second works); a realm's bricks have its own clay's colour; bonds are
   prose.
3. **Immersion** — the smoking clamp, the capped hacks, a red town or a
   yellow one by its clay. **Participation** — the brickmaster, the moulder
   and gang, the clamp burner, the bricklayer, the ash-man selling breeze, the
   bargee; ⭐ *can the polity do something we didn't want?* — **tax bricks**
   and watch them grow.
4. **Values** — cheap soft brick costs the next owner (the upkeep falls on
   whoever holds the wall later); hard cement versus a building's survival —
   both with no right answer the engine supplies.
5. **Continuity** — clamp → Scotch kiln → Hoffmann; treading → pugmill →
   extrusion; hand mould → press: the same `shape`, `maintain`, `repair`.
6. **Economy** — demand from W7 upkeep and furnace linings (both
   recurring, both on content that exists once Terminus is authored in
   brick); consumes clay, sand, lime, breeze, fuel; produces brick by grade,
   tiles, drain tiles, firebrick; ⚠ demand **waits on W7**, which is why this
   build sequences after it.
7. **Governance** — the **statute brick** as a standard; ⭐ the **per-brick
   tax** and its size effect; smoke from clamps as a nuisance (the potash
   slate's ordinance); each a criterion and an appeal when designed.

**Altitude** — *invariant*: brick is fired clay whose properties derive from
what it reached; size is a standard the polity holds. *Grain*: the moulding
rate, the weathering ceiling, the clamp's gradient. *Title*: the Delight
brickfield, the Rejection fireclay.

## 10. Open

1. Q1 resolved: `BrickClamp` is its own class on the `Firebox` chain —
   [ceramics.md § The clamp grades by position](../../subsystems/ceramics.md).
2. Q2 resolved: the lining is an assembly part line that wears per firing —
   [fire.md § Linings](../../subsystems/fire.md).
3. How W7 reads a wall's brick grade — the layer's material row, or a grade on
   the layer state.
4. Q4 resolved by the build: it drove on furnace linings alone
   ([ceramics.md § History](../../subsystems/ceramics.md)); W7 has not shipped.
