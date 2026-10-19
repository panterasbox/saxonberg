# Brickmaking slate — clay won, weathered, moulded, dried and burnt

> **Status: UNBUILT** — designed 2026-10-18 with the owner, as the first new
> consumer the [moulding slate](./moulding-slate.md) ruled (§ 0) and right
> after its mechanism was examined (§ 0a: clay's sources, shape-and-release,
> the temper window). Nothing makes brick today.
> **Left:** `/trade/ceramics` (brick first, pottery later) · the Delight
> valley brickfield (pit, weathering ground, temper pit, moulding shed,
> hacks, clamp ground) · winning in autumn on the ground protocol · weathering
> as a freeze-thaw count · tempering with sand and breeze · moulding as a
> durative `shape` · the statute brick · drying on the wetness model · the brick
> clamp on the fuel trade's clamp shape, grades by position, absorption from
> firing temperature, colour from iron and the draught · firebrick, roof
> tiles, drain tiles · lime mortar by cure, repointing, the hard-mortar spall ·
> Terminus authored partly in brick
> **Size:** a build — after repair's W7 (building upkeep) lands, which is its
> demand

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

Structures clone fully built ([construction-slate](./construction-slate.md)
is parked), so nobody *builds* with brick. The demand is **upkeep**:

- ⭐ **`maintain` on brick envelopes** — repair's W7: *"a building's walls and
  roof are layers, each weathers at its material's pace, and `maintain`
  replaces what time took — materials in hand, by that layer's trade."* A
  brick wall that weathers needs bricks and mortar on a schedule weathering
  sets. Gated on rubber's layers reaching master, as W7 is.
- ⭐ **Firebrick for the furnaces that exist** — the glasshouse, the smelter,
  the ashery's kiln and the brick kiln itself are lined with refractory
  brick that **wears per firing**; every hot trade gets a recurring brick
  bill (§ 6).
- Ovens, hearths, flues; roof tiles; drain tiles; chimney pots.

⚠ **Demand needs CONTENT**: today's default envelope is 0.3 m of granite and
the bakery's brick oven is prose. **Terminus is authored partly in brick** —
the market, the wharf warehouses, the bakery's oven, the chimneys — or W7 has
no brick walls to weather. A content change in this build.

## 2. Winning, weathering, tempering **[DECIDED]**

- **Winning** — digging clay from the pit: a `trade-quarrying` `OpenWorking`
  on a clay `Deposit`, the shipped `dig` (*the ground answers*), quality from
  the deposit. In **autumn**.
- ⭐ **Weathering** — the heap left out over winter; frost shatters the lumps
  so it tempers smoothly in spring. **The count of freeze-thaw days since the
  heap was made**, reconciled on read, on the climate build's shipped
  `WeatherApi.dailyRangeAt` (the maple's freeze-thaw window). More cycles,
  better clay, to a ceiling; a mild winter gives worse clay. ⭐ **The same
  count has other readers**: frost tilth on ploughed soil (soil's `structure`)
  and frost damage to stone and brick (the decomposition slate's). Lens 1:
  why you dig clay before winter and plough before frost.
- **Tempering** in spring — soak, pick out stones, **tread** (later a horse
  pugmill) to the moisture window (moulding § 0a). Fat clay is tempered with
  the quarry's **sand** or it cracks drying. ⭐ **London's breeze**: household
  ash and cinders mixed into the clay fire the brick from within — the
  dust-yards sold the city's sifted ash to the brickfields. **Town ash has two
  buyers**, the ashery and the brickfield, bidding on one line.

## 3. Moulding, and the statute brick **[DECIDED]**

- **The physics is moulding's shape-and-release** — a clot thrown into a
  sanded wooden mould, struck off, turned out green.
- **The act is a durative `shape`** — glass's shipped forming verb, unified
  across glass, pottery and brick (*shape clay into brick* at the brick mould;
  [pottery-slate](./pottery-slate.md) § 2). ⚠ Corrected 2026-10-18: this
  first said `make`, which is the recipe-script runner (becoming the shell's
  `do`), never a crafting act — *a recipe without a verb is a missing act, and
  the act belongs to the trade*: a skilled moulder and his gang made **three to five thousand a
  day**, so by the abstraction law (*legitimate while it still costs somebody
  the activity*) a game-day of work at a rate set by competence (grain),
  consuming tempered clay and putting green bricks on a pallet. The gang —
  clay carrier, moulder, the boy who takes them away — is employment's
  roster.
- ⭐ **Size is a standard, and standards are authority** (moulding § 8): a
  mould's dimensions are its shape; a polity may declare a **statute brick**
  (England, 1571: 9 × 4½ × 2¼ in) as a governance standard (the gauger's
  `Government.standards`). ⭐ **England's brick tax of 1784** was charged *per
  brick*, so bricks grew, and Parliament then capped the size — a per-unit tax
  changing a building material's physical size, a lever with a computable
  effect. Mismatched bricks `maintain` a wall and the look reads the patch;
  the engine records size and never forbids.

## 4. Drying **[DECIDED]**

Green bricks dry in **hacks** — long open rows under a light roof of boards
or straw caps — for two to six weeks, on the shipped wetness model:

- **drying** is the shipped evaporation (air, warmth, shelter, the material's
  capacity) — leather-hard, then bone-dry; only a dry brick fires (a wet one
  bursts: steam, the damp mould's physics);
- ⭐ **rain ruins it** — a soaked green brick slumps (*"a wet night could ruin
  a week's work"*); the shipped rain push, blocked by shelter, so the **cap**
  is the remedy;
- ⭐ **frost destroys it** — a wet green brick that freezes shatters
  (weathering turned against you), so **moulding stops before the first
  frost**: the brickmaker's year enforced by physics, not a calendar rule;
- **too fast cracks it** — sun and wind dry the face before the core and fat
  clay cracks; the cap slows it, sand prevents it — derived from drying rate
  against plasticity;
- **bricks shrink** a few percent drying, so the mould is made **oversize**
  (the pattern-maker's rule again).

## 5. Firing **[DECIDED]**

- ⭐ **The brick clamp is the charcoal clamp's shape** (the same word
  historically) — dried bricks stacked with fuel channels and the breeze
  inside them, sealed with clay and old brick, burned for weeks: `trade-fuel`'s
  clamp with bricks as the charge, **read at the end**, so an unwatched fire's
  freeze does not bite and a whole firing can still be lost. Rain and wind on
  an outdoor clamp matter.
- ⭐ **Grades by position** — beside the fire channels **over-burnt** (burrs,
  clinker); the middle **well-burnt** (hard, ringing — outer walls); the
  outside **under-burnt** place or samel bricks (soft, salmon — inside walls
  only). Sorting the clamp is the grading, derived from the temperature each
  position reached — the sugar loaf's lesson.
- ⭐⭐ **Firing temperature derives water absorption** — a well-fired brick is
  partly vitrified and absorbs little; an under-fired one takes up rain,
  freezes and spalls. So the fired brick's `waterAbsorptionCapacity` derives
  from its firing, and **W7's weathering rate depends on it**: soft brick in
  an outside wall needs `maintain` far sooner — **the brick's grade becomes
  the building's upkeep bill**, and § 1's demand sustains itself.
- **Colour** from **iron** (moulding § 0a) **and the draught** — oxidizing
  red, reducing blue-black (Staffordshire blue engineering brick). ⭐ The
  clamp's draught again: one fire, one dial, three trades (charcoal, ash,
  brick).
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

⭐ **Fireclay from a deposit at Rejection** — the mine country, near the
furnaces that need it — hauled down to the Delight brickfield.

## 7. Mortar, and the bricklayer **[DECIDED]**

- **Mortar** — quicklime from the quarry **slaked** to putty (a `chemical`
  step and a caustic harm route, as lye) + quarry sand. ⭐ It **sets by cure**
  — slow carbonation from the air's CO₂ over months: a maturation `chemical`
  set with no act, moulding's *cure*, its second consumer after plaster.
- ⭐ **Hydraulic lime** (lime burnt with clay, or Roman *pozzolana*) **sets
  under water** — Roman harbours, Smeaton's Eddystone (1759) — the material
  the hard-hat diver's footings and harbour works need
  ([underwater-slate](./underwater-slate.md) § 11). The next rung.
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

- **`/trade/ceramics`** — brick, tile, drain tile, firebrick and later pottery
  share their whole physics (clay, its quality, tempering, firing, kilns), so
  one pack (*trade is mechanism, locality is expression*), brickmaking its
  first content, pottery rows and a wheel later. Avoids splitting fired-clay
  substrate across two packs.
- **The bricklaying discipline lives here until W7 ships**, and W7 may gather
  the **building trades** (bricklayer, mason, tiler, thatcher — each
  envelope material naming its trade) into their own pack.
- ⭐ **The Delight valley brickfield** (the owner's choice), on the farming
  valley's alluvial clay:

| place | what happens | on |
|---|---|---|
| the clay pit | winning, in autumn | a quarrying `OpenWorking` on the valley's clay `Deposit` |
| the weathering ground | the winter heaps | outdoors; the freeze-thaw count |
| the temper pit | soaking and treading, with sand and breeze | tempering |
| the moulding shed | the table, the mould, the gang's `shape` | employment's roster |
| the hacks | drying under caps | the wetness model |
| the clamp ground (later a kiln) | firing and sorting | the fuel trade's clamp shape |

  Plus **the brickmaster** (a business buying breeze from the ash-man and lime
  from the quarry), **a fireclay deposit at Rejection**, and ⭐ **the haul to
  Terminus** — the Delight joins the Kestrel at the confluence where Terminus
  stands, so **bricks go downstream by barge** (the classic barge cargo):
  [river-slate](./river-slate.md)'s second freight after potash.

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

1. The brick clamp's charge — the fuel trade's `CharcoalPit` shape exactly,
   or a sibling row with a `bricks` charge.
2. Whether furnace lining wear is assembly wear on a lining part today, or a
   seam this build adds.
3. How W7 reads a wall's brick grade — the layer's material row, or a grade on
   the layer state.
4. Whether the drive needs W7 to have shipped, or proves demand with furnace
   linings alone.
