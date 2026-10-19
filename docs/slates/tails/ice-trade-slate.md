# Ice trade slate — the first RGO whose product is a weather condition

> **Status: PARTIAL** — v1 shipped 2026-10-18 (MR !378, with
> [storage-slate](./storage-slate.md)) → [watershed.md](../../subsystems/watershed.md)
> § the frozen pool, [storage.md](../../subsystems/storage.md),
> [crafting.md](../../subsystems/crafting.md) § one `cut`: the frozen pool
> and its patch log, scrape · mark · `cut`, the graded block, cold water
> and breaking through, the crew and the ice boss on seasonal seats, the
> Hollow Mere icehouses, the ice company's counter that buys and sells.
> **Left:** what § Open after names — the item-patch seam, floating at the
> thaw, a break-through that never heals, exclusive cutting rights; and
> every ⛔ below.
> ⛔ **Placeholder or deferred:** geography · the haul · ships · the
> iceman's route · the ice card · offcuts · little ice by sky radiation ·
> the general load-bearing surface · ice rescue · thin ice over a current.
> **Size:** a tail — each item a pass, none a build.

---

## 0. ⭐⭐⭐ Why this one and whaling are the last two RGOs

They are complementary **by construction**:

| | **whaling** | **ice** |
|---|---|---|
| reservoir | a population | ⭐ **a weather condition** |
| recharge | decades | ⭐⭐⭐ **100 %, every winter** |
| the commons question | the whole point | ⭐ **does not exist** |
| the act | a seven-stage pipeline | one act, in a short window |
| the credit | a fractional share (a lay) | ordinary |
| what it tests | reservoir and recharge | ⭐ **the act and the credit under free recharge** |

⭐⭐⭐ **Ice is the first RGO with no depletion**, which makes it the
programme's **control case**: every other RGO weighs against the future;
ice weighs against *this season only*. ⭐⭐ **Its recharge is a forecast**
(answered by climate: the sheet is recomputed from the weather).

## 1. The demand already ships and is fed by nothing

The placement build shipped an icebox that **consumes**
`/stuff/thing/ice-block`, and nothing in the realm produces or retails
it; the cookhouse's block is authored once and never replaced. The
placement drive's `DIRTY_REASON` is the standing evidence. Consumers
waiting: the icebox, the bar's `IceBin`, a medic's field coolbox for
blood ([blood.md](../../subsystems/blood.md)), and in time a butcher's
cold store and lager brewing.

⭐ **Melting is the consumption.** A block melts → the keeper's par sheet
shows a shortfall → the shipped `restocks` brain buys more. Every
icebox is a steady buyer the moment a par line names a supplier.

## 2. What climate already answered

| question (old § 7) | answer |
|---|---|
| Q1 climate | ✅ shipped: Stefan thickness, Gold bearing, black vs snow-ice, rotting, per-mover crossing |
| Q3 does the pond recover | ✅ recomputed from the weather; the cut refreezes from its date (§ 4) |
| Q4 thickness thresholds | ✅ derived (Gold): ~6 cm a person, ~14 cm a horse, ~20 cm a loaded cart (the folk rule's 10 cm for a person carries a safety margin) |
| grade (clear vs cloudy) | ✅ black vs snow-ice off the sheet; snow slows growth and makes snow-ice |
| Q2 harvested = pool ice? | ✅ § 4: the same **good** from two **sources** |
| Q5 sawdust | ✅ § 6: the saw's kerf |

## 3. ⭐⭐ Big ice and little ice — the representation changes at scale

**Thermal is untouched.** Its lumped `R` has no size term, so it cannot
tell a block from a stack — and the user's constraint is that its broad
mandate is not stretched for ice. So:

| scale | representation | physics |
|---|---|---|
| **the sheet** on a mere or pool | a derived record (shipped) | Stefan / Gold from the weather |
| **a block** in hand, a cart, an icebox | a `Thermal` Thing (shipped) | latent heat; the 0 °C plateau |
| **the stock** in an icehouse | ⭐ a count on a store ([storage-slate](./storage-slate.md)) | heat in through the stack's surface (∝ m^⅔) and the sawdust, ÷ L |

Rough arithmetic (30 cm dry sawdust, a 120-day summer averaging 12 K
over freezing): **a ~1000 t house loses ~6 %, a ~4 t house ~40 %.** That
is why icehouses were huge, why blocks were cut to a standard and packed
tight, and why a half-empty house loses faster — from one formula on one
class.

**Three bridge acts:** **cut** (sheet → blocks) · **stow** (blocks →
stock) · **draw** (stock → blocks, at about 0 °C).

## 4. The harvest

### The site is a frozen pool you stand on

Maritime's `Pool` is *"a place that IS a small water"*, and its own
comment leaves *"the ice … walking on it, how thick it is"* to this
build. So the harvest site is a frozen pool, and the slate's line
becomes literal: **the only premises that is the same object as its
product. Taking too much of it is standing on less.** The bearing check
moves from an exit (the shipped ice crossing) to the place: can this ice
hold *you, here*. The cited-water binder shipped with shore-as-place, so
`cut ice` binds the place's water and `cut ice from blackmere` binds it
by name.

### The pond's log

The sheet stays a calculation. The pond keeps **a short log of what was
done to it**, as a fishery stores only what was drawn:

- **scraped** — snow cleared off a patch on a date: it grows faster and
  black from then on;
- **marked** — the grid scored by the plough, which sets the block's
  footprint;
- **cut** — a patch taken on a date: open water from then, refreezing
  thinner from that date. A second, thinner crop is possible (historically
  exact), and a fresh cut is a hole in the ice beside the people working it.

`look` at the field shows the work: the grid scored in, the channel of
open water widening, blocks bobbing in it.

### The cut and the block

One act at the bottom rung: saw a block out of the field. Its mass is
thickness × the grid square × ice's density; its grade is read off the
sheet. ✅ **Block size is chosen when the grid is marked**, bounded by
what the hooks, tongs and elevator can handle (row dials on the tools).
Bigger keeps better and handles worse — surface against volume at hand
size. A Hudson cake (~22 × 32 in, ~300 lb) is too heavy to lift, so like
forestry's bole it is worked where it lies: poled down the channel,
hooked out with tongs, run up into the house.

### The ladder and the crew

✅ **Hand saw → crew and horse plough → steam elevator (by Discipline).**
The horse needs ~14 cm where a person needs ~6, so the plough rung
arrives later in the season with no rule written for it.

The crew are **real seats**, hired seasonally on the shipped employment
substrate: cutter, plough driver, poler, house hand, and the **ice boss**,
kept separate from the keeper (lens 3b: an NPC doing two jobs is a
vacancy deleted; historically they were different people in different
seasons). NPCs in seats run **the same verbs a player types** (the
`restocks` precedent): a crew of six is six people cutting. No
multiplier, no progress bar (#64: *a dry interface over an economy of
labour is a job*).

### Timing is a real bet

`analyze weather` forecasts the next 24 game hours exactly; beyond that
a player has the sky's presage and the climate's normals. A harvest is a
bet over weeks, so the ice boss reasons — *"18 cm, a normal January adds
about a centimetre a day, and the sky says a front tomorrow"* — with real
risk left over. ✅ No change needed.

## 5. ⭐⭐ Cold water — breaking through (in this build)

Refusing a mover the ice will not bear is the engine doing the player's
job: *"the honest danger is going out too early"* has no danger in it if
the world stops you. ✅ **User ruling (b), 2026-10-16: all three in this
build.**

1. **A swimmer's body reads the water, not the room's air.** Maritime's
   fix made a swimmer *breathe* the air; the body's temperature still
   reads the room's atmosphere, so a swimmer in a winter pool or sea cools
   as if standing on the shore. The mirror of maritime's ruling: you
   breathe the air, your body is in the water (≈ 20× air's conductivity).
   A **shipped defect for every swimmer** that ice exposes.
2. **The water's own temperature**, from the cited water — about 0 °C
   under ice.
3. **Breaking through**: ice that does not bear you lets you through,
   into the pool, swimming. Deterministic — the ice is a fact, never a
   roll ([uncertainty.md](../../uncertainty.md)).

⛔ The **general** load-bearing surface (rotten floorboards, a roof under
snow, a cart on a weak bridge) stays its own cross-cutting design; ice's
bearing is the water pack's.

## 6. Sawdust — the kerf, and storage's second consumer

Assembly's `saw` turns a log into boards and **the rest of the mass
vanishes** (carve's shavings likewise). ✅ **`saw` leaves sawdust in
proportion to the cuts it made** — one kerf per cut, roughly 10–15 % of a
log through-sawn into ten boards — derived, not a dial, on the pit or mill
floor. ✅ **Offcuts** (slabs, wedges, edgings — most of what quartering
loses; historically firewood) → [carpentry-slate](../builds/carpentry-slate.md).

Sawdust is a declared-poolable good, so the Heart's Delight mill floor
*"ankle deep in sawdust"* is literally a stock line, and the icehouse
buys it by the load: Maine ice and Maine lumber. It needs none of ice's
physics (inert; heat only).

## 7. The icehouse and the ice company

The icehouse is a store on the [storage-slate](./storage-slate.md)
substrate: a shed (an authored room) and **the stack** (ice packed in
sawdust) whose packing and surface set the melt. Its stock chills the
room (heat only), so the icehouse doubles as a cold store.

**The ice company is a business.** Seats: keeper (the store's custodian
— stows, draws, takes stock, sets grade bands, receipt terms and asks),
house hands, the seasonal crew, the ice boss. **Two lines of business on
one store:** merchant (its own ice, receipts in the house's name) and
bailee (a brewery's ice, for a fee).

- ✅ **The counter draws from the store** and stands in the icehouse, kept
  cold by its stock. An empty house is an empty counter in August.
- ✅ **The NPC keeper prices against the store's days of supply** — cheap
  in March, climbing through August, spiking after a warm winter left the
  house half full. *Ice is priced in time*, made literal.
- **Demand is wired, not designed:** the icebox and `IceBin` par lines name
  the ice company as supplier.

## 8. Kernel tidy-ups this build takes

- ✅ **Split `Casting`.** It is the generic re-meltable lump and composes
  `AlloyedMixin`, so ice, glass and wax lumps all claim to be alloyable and
  temperable — a lie the card's mixin chips show a player (lens 1's #28,
  3a). `Casting` becomes the plain re-meltable solid; alloying moves to a
  metal twin, and metal's `castTemplate` and the metal salvage path point
  at it. Owed by [base-class-narrowing-slate](../builds/base-class-narrowing-slate.md)
  since 2026-09-28; *"the trade must not ship on a straight man that
  lies."*
- ✅ **The ice material moves to the commons** beside water, out of
  `/trade/bottling`.
- ✅ **The block carries a grade**: black or snow-ice from the sheet,
  cloudy from a pan (dissolved air leaves as it freezes). The grade is the
  store's pooling key.

## 9. ⛔ Placeholder and deferred, with destinations

- **Geography — placeholder.** *"Consider it all placeholder content"*
  (user): stand up what the tests need and decide nothing about where the
  ice fields sit.
- **The haul from pond to house — placeholder** until freight: existing
  means only (carry, the haulage wagon).
- **Ships** → freight. Ice as ballast going south is the historical
  economics, and a Tudor voyage (ice packed in sawdust, melting by the
  passage) is a good test case for it. ⚠ For freight: expanse lists
  *latitude as a resolved value* as deferred, so a hold's air may not yet
  warm as a ship sails south.
- **The iceman's route** → logistics. **The ice card** (25/50/75/100 lb in
  the window) → [standing-instructions-slate](../builds/standing-instructions-slate.md):
  a standing order and a lovely piece of real-world interface.
- **Little ice by sky radiation** (the Persian yakhchal, the Bengal ice
  pits: shallow pans freezing on clear nights above freezing air) → the
  weather slate; the model has no sky-radiation term.
- **Thin ice over the current, pressure ridges** → watershed (no
  watershed slate exists; recorded here). Attach (storage-and-ice, MR
  !378): `WatercourseCatalogue.iceAt`'s `history`/opts argument is where a
  per-reach variation enters.
- **Ice rescue** — a rope thrown from thicker ice, crawling out flat to
  spread your weight, pulling someone out → this slate, as the harvest's
  next content (the requirements make breaking through real; getting
  someone else out is not yet an act). Attach: `IceSheet.bears(loadKg)`
  and the floor's `canOccupy` are where a prone posture (`lie` on the
  floor's slot) would spread a load; a rope is a `Slottable` pull from a
  supported body.
- **Natural-ice contamination** (the typhoid history) →
  [cold-chain-slate](../builds/cold-chain-slate.md) § natural-ice contamination
  (attach: `IceSheet.cutBlock` reading the reach's contamination).
- **Ice-fishing gear and behaviour** (tip-ups, shanties, cold-water bite)
  → [fishing-slate](../tails/fishing-slate.md). The build makes frozen water
  fishable only through a hole.
- **Who holds the water licenses the cut** — the shipped holding is enough
  for now; a licence beyond it → navigable-water § 5.

## 10. ⭐⭐ The epoch arc is the inverse of whaling's

Whale oil's killer (kerosene) is unbuilt. **Ice's killer already ships**:
`ClimateControl`, the active cold source (2026-10-01). Building ice
builds **the predecessor of something already in the game**, so lens 5's
cleanest case is legible at once: **the capability survives (an icebox
and a refrigerator answer the same commands) and the trade dies.** The
cold chain shipped its industrial rung first; this is the preindustrial
one underneath, demonstrating the three-rung ladder from the top down.

## 11. Lens pass

1. **Pedagogy** — ⭐⭐⭐ **latent heat** (ice and water at 0 °C, wildly
   different energy; the box holds and holds and then goes off a cliff) ·
   ⭐⭐ **Stefan's law you can feel**: the second 10 cm takes three times as
   long as the first · snow is insulation, and scraping is the lesson ·
   the spud test (a reading, tool-made, banded by competence) · surface
   against volume · *insulation is not cold* · cold water kills in minutes.
2. **Expression** — the named-work test: ⭐ *the Walden harvest* (crew
   seats, a plough, a field, a siding) and ⭐⭐ *an icehouse that fails* (a
   warm March, the lot lost, the keeper ruined). Constant: latent heat,
   conduction, Stefan, Gold. Variable: the pond, the season, the grid, the
   crew, the house and its packing, the terms.
3. **3a** — *"clouded white at the heart and sweating along every edge"*:
   a thing visibly losing. The `Casting` chip no longer lies; the ice can
   let you through. **3b** — the ice boss is the seat that matters (when,
   how big, where, scrape or not); the keeper and the crew are vacancies.
4. **Values** — the usual *how much may be taken* evaporates (recharge is
   total); what remains is **when to go out** and **distribution**: who
   gets the cut, at what price in July. *Show the dirt, never the score*:
   the house's state is the dirt.
5. **Continuity** — hand saw → plough → powered conveyor, all answering
   `cut` on the same field; then plant ice, and the icebox does not care.
6. **Economy** — demand authored and unfed; seasonal wages land in the
   farm's dead season; inputs are smithing's saw and tongs, ranching's
   horse, carpentry's sawdust. ⭐⭐⭐ #27 Time: **inventory as arbitrage
   across time**, nothing else in the game is.
7. **Governance** — the water's holder allows the cut; a cut channel is a
   hazard on a public crossing; the icehouse is a bailment whose loss the
   printed terms and the courts decide, never the engine.

## 12. History, for the content pass

- **Ancient and state-run:** Zimri-Lim's icehouse at Terqa (~1780 BC);
  Zhou China's official for ice (a *seat*); Rome's Apennine snow; the
  Persian yakhchal.
- **Estate icehouses** (17th–19th c.), a great-house luxury.
- **New England (1806–1910s):** Frederic Tudor to the Caribbean and, by
  1833, Calcutta — losing money until insulation and scale fixed the
  wastage; Nathaniel Wyeth's horse plough (1825) standardizing the block;
  Maine sawdust; ice as ballast; Thoreau at Walden (1846–47); Hudson and
  Kennebec houses of tens of thousands of tons; Norway's Oppegård lake
  renamed **"Wenham Lake"** to sell under the Massachusetts brand.
- **The end:** the 1890 ice famine; sewage-fouled natural ice and the
  typhoid scare; Carré's ammonia plants (1859) in the blockaded
  Confederacy; the household refrigerator, 1920s–30s.
- **The buyers:** butchers, dairies, lager breweries, fishing fleets,
  hospitals, bars, households.

**See also:** [storage-slate](./storage-slate.md) ·
[preservation-slate](../tails/preservation-slate.md) (the demand, WHO
SELLS ICE) · [cold-chain-slate](../builds/cold-chain-slate.md) (the RGO
classification; the active rung) · [thermal-slate](../tails/thermal-slate.md) ·
[climate-slate](../builds/climate-slate.md) · [navigable-water-slate](../builds/navigable-water-slate.md) ·
[carpentry-slate](../builds/carpentry-slate.md) ·
[base-class-narrowing-slate](../builds/base-class-narrowing-slate.md) ·
[watershed.md](../../subsystems/watershed.md) · [expanse.md](../../subsystems/expanse.md) ·
[thermal.md](../../subsystems/thermal.md).

## Open after storage-and-ice (MR !378, 2026-10-18)

What the build's drive and review left open, for whoever builds next here:

- **The crew walks onto ice that will not hold it.** The roster puts the
  crew and the boss at their station — the mere — on the first day of
  their season; the boss's "will it hold" gates only the WORK, not the
  walk, so on young ice the crew goes through and works the season soaked
  (the drive's Bryn, day 3). A station that is a place you cannot yet
  stand on wants the shore as the waiting place (the brain walks out when
  the ice holds), or the roster to ask the station's floor.
- **The seats were `winter` alone at a site whose ice starts in the
  autumn** (−58°; calendar days 0–90 are the southern fall) — fixed to
  `[fall, winter]` at the sweep. A season is a proxy for "the ice is
  workable"; a seat gated on the reach's ice (`iceAt`) would need no
  per-site season list.
- **An item does not know its patch.** Float/sink sorts at the thaw (the
  whole surface), never at a single cut: nothing records where on a
  4 000 m² sheet a dropped tool lies. The honest seam is a `patchId`
  stamped on things dropped by an actor whose cut is in progress.
- **A floating good at the thaw is unproven** — the drive asserts the
  iron spud sank; a 6 kg block melts in summer water long before day 290,
  so nothing driven floats.
- **The scrape's advantage is not driven at Hollow Mere** — its sky is
  pinned clear, so no snow lies to scrape (`IceSheet.test.ts` proves it
  under snow). Open for the user: a venue whose sky varies is where
  scraping becomes a skill.
- **The sheet's patch log across a restart** rides its own `(scope,
  poolKey)` record and no test round-trips it.
- **A break-through never heals** — a `broken` patch still read so after
  three days of hard frost; it should regrow like a cut patch
  (underwater-slate records the live-walk finding).
- **Exclusivity of the cut** → navigable-water-slate § Ice harvest as a
  use of the reach.
