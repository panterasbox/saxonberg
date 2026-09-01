# Metal-chain slate — the three trades that make metal

> **Captured 2026-08-31**, design session in `build-1` while farming
> (`build/farming`) and residences (`build/residences`) were building.
> **Status: decided design, pre-requirements.**
>
> This slate owns **the supply chain**: extraction, fuel, and smelting as
> three trades, and the chemistry that makes them real.
> [mining-slate](./mining-slate.md) owns mining-as-play (the four play
> layers, the dangers, the deep ecology, the Delving 9 mirror).
> [rejection-slate](./rejection-slate.md) owns the venue and the cast.
> Read all three; they do not overlap, and where this one **supersedes**
> the mining slate it says so explicitly (§ *What this supersedes*).

Substrate: [crafting](../../subsystems/crafting.md) ·
[fire](../../subsystems/fire.md) ·
[materials-response](../../subsystems/materials-response.md) ·
[smallholding](../../subsystems/smallholding.md) ·
[husbandry](../../subsystems/husbandry.md) ·
[parcel](../../subsystems/parcel.md) ·
[employment](../../subsystems/employment.md) ·
[contract](../../subsystems/contract.md) ·
[boundary](../../subsystems/boundary.md) ·
[zone](../../subsystems/zone.md) ·
[uncertainty](../../uncertainty.md) ·
[content-packs](../../subsystems/content-packs.md).

---

## The governing rule this session ran on **[DECIDED]**

> **The pedagogically richest option that teaches real science wins.
> Tie-break on content-author expressiveness.**

Stated by the user as permanent. Cheapness, build size and elegance are
not tiebreakers against real mechanism. Every `[DECIDED]` below that
isn't a scope call was decided by this rule; the scope calls (what ships
in v1 vs. what is staged) were the user's.

---

## Where the chain breaks today **[SHIPPED STATE]**

```
[ the ground ] → ??? → [ ore ] → ??? → [ ingot ] → forge/hammer → [ gear ]
                                          ↑
                        world-seed: terminus/general-store/counter.yaml
                        stocks iron ingots from nowhere
```

That shop shelf **is** the metal-import era. `trade-smithing` ships and
works (`forge`/`hammer`/`quench`/`sharpen`, five recipes, a knowledge
ladder); everything upstream of the ingot is missing. Exactly two links.

`docs/vocations.md` had already flagged both by the demand test, before
anyone proposed building them: line 257 — **charcoal burner / collier —
GAP — "fuel for everything above"**; line 125 — **smelter — GAP —
premises (industrial zoning)**.

---

## The shape: three packs, not one **[DECIDED]**

| Pack | Input | Act | Venue | Sells to |
|---|---|---|---|---|
| **`trade-mining`** | the ground | prospect · drive · stope · haul | the diggings — a claim, dangerous | the smelter |
| **`trade-fuel`** | wood (coal later) | coppice · burn · draw | a fuel yard + its coppice | everyone who burns |
| **`trade-smelting`** | ore + fuel + flux | roast · charge · blow · tap | a furnace yard, capital-heavy, fixed | the smith (`trade-smithing`, shipped) |

**The seam between packs is a market.** This follows the shipped
precedent exactly: `trade-distilling` makes the spirits,
`trade-hospitality` serves them, and the transaction between them is the
economy working. Three businesses in a row, each with a real P&L, each a
place you can be employed, each arguing with the other two about price.

Folding smelting into mining saves a pack and costs the market. Folding
it into `trade-smithing` makes the smith self-sufficient and kills the
seam entirely. Neither is worth it.

---

## ⭐⭐ Fuel is the trade; charcoal is a product **[DECIDED]**

The first cut of this design called the trade "collier." That named a
product where the engine had already named the commodity:

- **`CombustibleMixin`** is a `'fuel'` **Reserve** on matter, with
  ignition point and fuel value **derived from the material**.
- **`FurnaceMixin`** is "a Combustible-fuelled appliance holding a
  `burnTemperatureK × bellows` temperature."
- Shipped classes: `Firewood` (which already carries
  `charMaterialPath` — *what it becomes when it burns out*), `Kiln`,
  `Forge`, `Campfire`, `Candle`.
- [fire.md](../../subsystems/fire.md) states the target outright:
  **"smelting heat (iron's 1811 K) reachable only with the bellows."**

Fuel is already a quantity the world drains, and **every hearth, forge,
kiln, cookfire and lamp in the game is a customer** — no other trade in
the roster has that demand surface.

### ⭐ The reason fuel is structural, not merely upstream

**Charcoal is not just hotter. It is the reducing agent.** Iron ore is
not iron; it is iron bonded to oxygen, and no temperature alone frees it.
Carbon strips the oxygen off. So the fuel trade is a **physical input to
the metal**, not a utility bill — and no amount of furnace engineering
routes around it. That is the structural position a real trade wants.

### The one craft: pyrolysis **[DECIDED]**

Burn matter in starved air; the volatiles leave, the carbon stays. One
skill, not a product list — wood in, charcoal out; coal in, coke out.
The judgment is airflow: too much air and the charge burns to ash and you
have nothing; too little and it never carbonises and you get half-burnt
brands. It runs for days and must be watched (read the smoke, choke the
vents), which is `EngagedMixin` + the scheduler + fire/thermal, all
shipped.

⭐ It gives the trade a **real failure mode**, which most crafting lacks:
you can lose a whole burn.

### The coppice is the fuel trade's own capital **[DECIDED]**

A managed stand on a parcel, cut on a rotation, regrowing on a clock —
land + a crop + a clock, which is farming's shipped substrate
([smallholding](../../subsystems/smallholding.md)). **Forestry is not a
fourth pack**; it is what the fuel yard does with its land. It splits out
later if timber demand (mine props, construction) is ever exercised
enough to want a specialist — per
`docs/vocations.md`'s demand test.

### Coal is parked as the arc payload **[SCOPE — user's call]**

v1 ships **wood and charcoal only**. Coal→coke is the industrial
revolution step and belongs to the temporal mirror: the medieval mine
burns charcoal off a coppice it has to tend; the industrialised mine
burns coal it digs itself and **stops needing the forest at all**. That
is Delving 9 told as an energy transition, which is what actually
happened historically, and it is a better use of coal than one more seam
on day one.

---

## ⭐⭐ Ore is already modelled — the grade is a shipped field **[DECIDED]**

`Material` ships **`composition: CompositionEntry[]`** —
`{materialPath, fraction}`, weight fractions, persistent, with
`getComposition`/`setComposition`. Steel uses it today (iron 0.998 /
carbon 0.002). Materials also carry `formula` and `molarMass` for
compounds. And `granite.yaml` carries this comment, unprompted:

> *"v1 leaves `composition` empty pending mineral templates — content
> extends by adding `/stuff/idea/material/mineral/quartz`, … and
> populating composition entries here."*

So:

```yaml
mineral/hematite    formula: Fe2O3      # iron is 69.9% of it by mass — chemistry, not a dial
rock/iron-ore       composition: [ hematite 0.55, quartz 0.45 ]   # ← the 0.55 IS the grade
```

**Ore grade is not a new primitive. It is a fraction the engine already
stores.** A 10 kg lump at 0.55 hematite holds 10 × 0.55 × 0.699 = 3.8 kg
of iron, and everything downstream is arithmetic on shipped data.
`analyze X with Y` — real Material chemistry with *partial
identification* — is the assay verb, also already there.

⭐ **The trade's product is not "an iron ore" the item.** It is a lump
with a composition, and every lump is different. That is what makes
assaying real work, pricing real, and the deep-law's *"true weight, true
grade"* a claim somebody can lie about.

### ⚠ A live inaccuracy this closes

```yaml
# base-library .../alloy/bronze.yaml
tags: ["alloy", "metal", "copper", "tin"]
composition:
  - { materialPath: .../element/copper, fraction: 0.88 }   # ← and nothing else
```

**Bronze is authored as 88% copper and 12% nothing.** There is no `tin`
material; the tag claims tin, the composition cannot. Minting tin and
making bronze sum to 1.0 is the smallest possible proof of the whole
model and fixes a shipped lie. (Copper is correct —
`meltingPoint: 1358` K is 1085 °C.)

---

## ⭐⭐ The smelt is physics, not a recipe **[DECIDED]**

A recipe is a fixed input→output spec; a smelt's output depends on the
particular lump's composition. If the smelt flattens grade, then
prospecting — the one genuinely new primitive the mining slate commits
to, the reason the trade is interesting — **is theatre**: a deduction
game whose answer doesn't matter.

**The shape: hybrid.** `smelt` stays a craft with a maker, tools and
inputs, so it rides the shipped crafting spine and the employment/shift
machinery — but the **yield derives from composition** rather than being
authored. The delta is the reduction math and nothing else; melting and
`Casting` are already shipped (heat a Meltable past its point, freeze it
into a stamped object, bidirectionally).

⭐ Grade then stays load-bearing all the way to the blade:
[materials-response](../../subsystems/materials-response.md) reads
material properties into combat, so **lean ore honestly makes a worse
sword**. The chain pays off end to end — read the ground badly and eight
steps later the edge folds.

### ⭐⭐ Carbon is the one number

Iron, steel and cast iron are the same element at three carbon contents,
and that number decides everything. It is also the number the **fuel
trade supplies**. The chain, with nothing added, *is* the iron–carbon
system:

| Furnace | Real behaviour | Product | Carbon |
|---|---|---|---|
| **Bloomery** | ~1200 °C, below iron's 1538 °C melting point — reduces in the **solid state**, never melts | a **bloom**: spongy iron with slag trapped in it | ~0.05% |
| **Blast furnace** | taller, stronger blast, more charcoal — the iron absorbs carbon, which **drops its melting point to ~1150 °C**, so it runs liquid | **cast iron** — hard, brittle, castable, **unforgeable** | 3–4% |
| the band between | historically the hardest thing to make on purpose | **steel** | 0.2–2% |

Two consequences:

- ⭐ **The shipped smithing verbs become real.** A bloom *must* be
  hammered hot to consolidate it and squeeze the slag out — that is what
  wrought iron is, and why the smith is a separate trade. And `quench`
  becomes a lesson learned by failing: quench wrought iron and nothing
  happens, quench cast iron and it cracks, quench steel and it hardens.
  **`trade-smithing` gets scientifically grounded retroactively, without
  being touched.**
- **Flux stops being a recipe ingredient.** Limestone is there to lower
  the melting point of the gangue — the quartz half of the ore — so it
  runs off as slag. Which makes grade matter twice: lean ore is less
  metal *and* more slag to flux away.

For authors the whole metal economy becomes **composition in, composition
out** — the same `CompositionEntry` mechanism at both ends. A new ore is
a composition; a new furnace is three dials (temperature, blast, charge
ratio) and the chemistry decides what comes out. **No class per metal.**

---

## ⭐⭐ The ladder: start at copper **[DECIDED + SCOPE]**

The shipped material sheets are *already* thermodynamically ordered —
copper melts at 1358 K, iron at 1811 K. **The Bronze Age came first
because it is colder**, and a player could derive that from the data.

| Rung | Gated by | The lesson |
|---|---|---|
| **copper** | your eyes — malachite (Cu₂CO₃(OH)₂) is *visibly green* | the first metal is the one you can see |
| **bronze** | a **trade route** — copper here, tin (cassiterite, SnO₂) elsewhere | superior alloys can be a supply-chain problem, not a skill problem |
| **iron** | **fuel technology** — 1811 K needs charcoal and a bellows | the barrier is energy |
| **steel** | carbon control | the barrier is knowledge |

⭐ **Four rungs, four different *kinds* of barrier** — observation, trade,
technology, knowledge. And the tin fact is a history lesson, not
flavour: cassiterite is rare and almost never occurs with copper, so the
Bronze Age ran on long-distance trade because **bronze cannot be made
locally anywhere**. Iron ore is everywhere, which is why iron ended the
palace economies and armed everyone.

Consequence for the venue: **Rejection can end the copper import and
never the tin one.** Finding a tin deposit becomes somebody's life goal,
and gives Saxonberg (the second city) something to be for.

---

## Prospecting: real geology over a fixed truth **[DECIDED]**

[uncertainty.md](../../uncertainty.md) bans resolutional randomness —
*roll to decide what the world IS, never what your action DID*. So:

> **The deposit is seeded once and deterministic. It is either there or
> it isn't. Everything the player does is a knowledge game over a fixed
> truth** — which is what prospecting actually is.

The inference chain is real technique, and it ladders — each rung is a
different sense of the word *look*:

- **Staining** — green on the rock. Copper, findable by eye. Rung one
  needs no tools, which is what makes the trade enterable.
- **Float** — ore fragments shed downhill from an outcrop. Find one and
  walk **up**; where the float stops is below the source. A real method,
  and already a movement game.
- **Gossan** — the rust-coloured weathered cap over a sulphide body. The
  surface is evidence about what is underneath: the epistemics of the
  whole trade in one rock.
- **Assay** — `analyze X with Y`, shipped, with partial identification.
  Where a guess becomes a number, and where *"true weight, true grade"*
  becomes checkable on a person.

**Placer / panning is parked** (scope, user's call). It is real physics
(density separation; water sorts heavy minerals into stream beds) and it
is the low-barrier newbie path the mining slate wants — but it is a
second extraction venue with its own geography, and the lode mine is
already the build.

---

## ⭐⭐ The ore body is finite **[DECIDED — closes a mining-slate OPEN]**

No regeneration. A deposit is a fixed quantity of matter emplaced by a
geological event that is not happening again, and **a seam that refills
teaches the opposite of the one thing mining has to teach.** The compute
argument for "regenerates on breathe" was about culling cold *rooms* —
a separate concern; rooms can cull while the ore ledger stands.

⭐ What it buys is the sharpest lesson in the venue, sitting next to its
own control: **the coppice regrows and the vein does not.** One trade
tends a renewable faucet on a rotation; the trade across the road is
spending a finite one. Same town, same furnace, opposite clocks.

And when the ore runs out **the town dies** — which is what mining towns
do, and is the arc Rejection is named for.

What keeps it a trade rather than a tutorial: the *deposit* is finite,
the *world* is not. Exhaustion sends prospectors out to find the next
one, permanently.

*(This closes mining-slate § Open — "Seam model [OPEN, LEAN finite]".)*

---

## ⭐⭐⭐ The mine's geometry: spherical, and the vein is an object

### Strike and dip **are** theta and phi

A lode is mineral filling a fracture. It has a **strike** (compass
bearing) and a **dip** (angle down from horizontal), and those two
numbers exist before anyone digs. `SphericalCoordinatesMixin` is
`[rho, theta, phi] + radius`.

> **Driving a heading along a vein is incrementing rho at fixed angles.**

This is not an analogy. A mine survey *is* a traverse of
(bearing, inclination, distance) triples — how every underground working
on Earth is mapped. A Cartesian grid cannot express a vein dipping at 40°
without stair-stepping it into a lie.

### The vein is a geometric object in the same zone

A tabular body with strike, dip, thickness and grade. Then:

> **A working's sphere intersected with the vein's plane is how much ore
> you got.** Miss the plane and you moved waste rock at full cost.

⭐ **The geometry is the mass accounting** — you cannot excavate a void
without moving its volume of rock, and where that volume falls relative
to the vein decides whether it was ore or spoil. No dice, real geology,
and **the spoil is the loose ground** the mining slate wants dirt dragons
to swim through: *the mine manufactures its own threat*.

### What this inherits from build-3 (farming), nearly whole

Their Stage-B plan (`docs/plans/farming-plan.md` § P7) landed:

- A field is **one sphere in a `SphericalZone`**, `radius = √(areaM2/π)`,
  one room per field.
- **Tangent packing** — first sphere tangent to the anchor, each later
  one tangent to an existing sphere, spiralling out: *"no overlap and
  connectivity both by construction."* Exits derive from the geometry.
- A persistent **ledger** on the titled programme
  (`{leaf, name, areaM2, focus, radius}`) — so overlap checking is ledger
  arithmetic and wake re-wires exits deterministically.
- **One zone per district, shared by all holdings** — a holding never
  gets its own zone, because shared rows are what make region-level facts
  resolve.
- `break ground --area <n>`: title-gated, an engagement over game time,
  appends the ledger, buds the room.

Mining is the same machinery with **one more degree of freedom**:
`drive <bearing> <dip> <distance>` instead of `break ground <area>`, and
packing in 3D along a vein instead of on a plane. **One `SphericalZone`
per ore body**, all workings in it, exactly as all holdings share the
district — which means your neighbour's drift can hole through into
yours, and the vein you are following is the vein they are following from
the other side.

⚠ This **supersedes** `docs/staging/ferrow-delving.md`'s "3D
`CartesianZone` with negative z."

---

## The trade is collective, and that is the lesson **[DECIDED]**

Farming laddered houseplant → bed → field → holding, private at every
rung. Mining has no backyard shaft — but the solo end of the ladder is
real, and it is what makes the venue onboardable:

| Rung | Who | Capital |
|---|---|---|
| **prospect** — walk ground, read staining and float | one person | a hammer |
| **stake a claim** — the property lesson | one person | a filing fee |
| **costean / test pit** — a shallow trench to prove grade | one person, days | none |
| **adit + drift** — face, tramming, surface | 2–3 | timber |
| **shaft + hoist + pump** | a crew | a company |

> ⭐⭐ **The jump from rung 3 to rung 4 is the lesson, not the obstacle.**

The player discovers that mining goes collective because one body cannot
hold the roof up, run the tram and cut the face — which is why mining
companies exist historically. **Collectivity is derived, not imposed.**

(The true backyard rung is free: Heart's Delight ships titled rural
ground, so a copper stain in a creek bank on land you already hold is
prospecting with zero new anything.)

### The structure: private workings in a shared deposit

Not a foreman deciding everything, and not event-soup. The historical
answer is better than both, and the deep-law already wrote it —
***"work your bounds or lose them."***

- **The working is private.** A claim is title over ground, the same
  shape as a farm holding, and its holder decides its headings.
- **The deposit is shared.** One zone, many independently-decided
  workings. **Geology makes them collective before any social rule
  does.**
- **The infrastructure is a commons.** The shaft, the pump, the
  ventilation, the main haulage — non-excludable within the mine,
  expensive, and everyone would rather the other party paid. **The pump
  keeps everyone's workings dry.** That is the free-rider problem
  arriving as groundwater.

**The commons ships in v1 — "that's the whole point"** (user's call). It
is the political-economy payload and the reason the venue is worth
building. It generalises the Rejection slate's seismic-network commons
from optional to load-bearing.

### ⭐ Geometry is state; contribution is events

The answer to *foreman vs. shared event substrate* is **both, split by
what they model**:

| Concern | Mechanism | Why |
|---|---|---|
| **Voids, veins, connectivity** | authoritative **ledger state** (build-3's shape) | voids must not overlap; derive-on-read over an append log makes that ugly |
| **Who cut what, who paid for the pump, whose timbering failed** | append-only **`*_events`**, derive-on-read | it is what makes a commons dispute adjudicable |

**The foreman is not an architecture — he is an employment `Position`
with a hiring right**, which ships. NPC hands and player hands are
interchangeable in it, exactly as `farm-hand.yaml` and the distillery
hands already are.

### Development, production, dead work

- **Development** — driving headings through waste to reach ore. Costs
  money, produces nothing, must be done first. Every mine is a bet on it.
- **Production** — stoping the ore out. The only part that pays.
- **Dead work** — timbering, tramming, pumping. Necessary, unpaid, and
  why *"sap not the props"* is the deep-law's gravest clause: a miner who
  skips dead work is stealing from everyone in the drift.

Entry is a capital decision: an **adit** is driven horizontally into a
hillside, **drains itself by gravity**, and is cheap — which is why real
mines are on slopes. A **shaft** needs hoisting and pumping forever.
`LiftMixin` earns its place from geology instead of from a wish list.

---

## ⭐⭐ Exit naming in a spherical zone **[DECIDED]**

The problem: spherical rooms have no cardinal grid, and **relative
directions are rejected** — `forward` demands a facing on every actor and
every object, and the moment one lacks it the scheme lies.

The engine's position is already compatible: `Exit.direction` is typed
"cardinal long-form, **semantic label**, or …";
[boundary.md](../../subsystems/boundary.md) says *"Non-cardinal exits are
a ZONE boundary, not a naming choice"*; `SphericalZone` is documented as
**explicit named exits only**.

### The distinction that gives cardinals back

> **A bearing is a measurement. A grid cardinal is a topology label.**

In a Cartesian zone "north" means *the cell at y+1* — a pointer wearing a
direction's clothes. In a spherical zone theta is a stored angle, so
"north" means **this tunnel actually runs at 000°**. Miners say "the
north drift" because it runs north. The player typing `northeast` is
doing the trade's own navigation, and the geometry they reasoned about
(*the vein dips northeast, so drive northeast*) is the geometry they
walk.

### ⭐⭐ You name what you make; you number what you find

Farm fields take **player-given names** because a farmer *chooses* the
crop — the choice is the identity, and `break ground <name>` already
banks it. **That does not transfer to mines**, and not merely
awkwardly: a farm has three to twelve fields, a working mine has
hundreds of voids. Naming scales with patience; mines exhaust it.

Real mines solved this by **surveying, not naming** — and the address
falls out of geometry that is already stored:

```
the 400 level, north drift          ← depth + bearing
no. 3 stope off the 400 north       ← + ordinal, only on genuine ambiguity
```

**The mine addresses itself**, which is the payoff of having gone
spherical — the coordinates were already there, so the naming problem was
self-inflicted. The player types what they would type in any mud —
`north`, `down`, `up`, `out` — because inside a drift you are in a linear
passage; the only real fan-out is a shaft station, where exits are levels
and you say the depth.

Mining's vertical vocabulary is precise and worth learning: a **winze**
sinks, a **raise** climbs, an **adit** goes out to daylight, a
**crosscut** cuts across the vein, a **drift** runs along it, a **stope**
is the void left by extraction.

### What distinguishes one void from another is geology

A field's name works because it names its *content*. A working has
content too — it is just geological: in ore or in barren country rock,
good grade or lean, wet or dry, timbered or raw, on the vein or chasing a
lost one. That is how a miner tells two drifts apart, it is the only
thing a player cares about, and **all of it derives from the vein
geometry we already need**. The room reads as what it is; the address
stays a coordinate.

Nicknames become **earned** rather than required — the pump chamber, the
bad ground, the Blue Drift. Places accrue names by mattering, which is
how mines really get them, and an optional alias on an exit is nothing to
support.

| | Address | Why |
|---|---|---|
| **Fields** (build-3) | player-given name | a farmer chooses the crop; the choice *is* the identity |
| **Workings** (this slate) | derived survey coordinate | a miner finds what is there; the ground decides |

One mechanism — a semantic label plus keywords — with the label sourced
differently per trade. **Build-3's naming act stands unchanged.**

⚠ **Coordination note:** build-3 has *not* built Stage B yet (it is gated
behind residences), and their plan leaves exit naming open — "touching
spheres get a lateral exit," with no naming scheme. The fields half of
the table above is a ruling they will otherwise make alone.

---

## Beneficiation: the line is the furnace **[DECIDED — closes Open 7]**

Between the face and the smelter you throw rock away. Three mechanical
steps, all pre-industrial:

- **Cobbing / sorting** — break the lump, hand-pick the barren rock out.
  No capital at all.
- **Crushing** — reduce until the mineral is liberated from the gangue.
- **Washing / jigging** — density separation in water; the dense ore
  sinks, the light rock washes off.

⭐ That last one is **the same physics as panning**, so parking placer as
a venue did not cost us its lesson — it returns as the dressing floor.

**Where it lives is decided by whether it needs a furnace.** Mechanical
dressing (sort · crush · wash) is **`trade-mining`** — a hammer and
water, at the pithead. **Roasting** — heating ore in air to drive off
sulphur or carbonate before reduction — is a furnace act and belongs to
**`trade-smelting`**. A principled line, and it matches where the work
physically happened.

### It is mass balance, so it is the same arithmetic

Beneficiation creates no metal. It **raises grade by discarding mass**:
10 kg at 0.30 becomes 4 kg at 0.70 plus 6 kg of tailings at 0.03. Metal
in equals metal out, minus losses — the `composition` arithmetic already
doing all the other work in this chain.

### ⭐⭐ Why it exists is location theory

**Ore is heavy and mostly worthless, and haulage is priced by mass.** You
dress at the mine because it is cheaper to throw rock away where it lies
than to carry it. [encumbrance](../../subsystems/encumbrance.md) already
ships the haulage draft term to price it. And the consequence:

> The mine sits on the ore. But **the smelter sits near the fuel** —
> you burn more mass of charcoal than you smelt of ore, and charcoal is
> bulky and fragile. Historically smelters were in the woods, not at the
> pithead.

That is Weber's least-cost location — *industry locates at its heaviest
input* — derived by the player from freight costs rather than asserted.
⭐ **It is also why the three trades want to be in three different
places**, which is what makes them a supply chain instead of a diorama.

### Two things it hands the venue for free

- ⭐ **The dressing floor is the onboarding ramp.** Surface work, indoors,
  safe, low-skill, and it pays — historically done by women and children
  while the men were underground. A new player earns on the dressing
  floor of a lethal industry, learning ore from rock by handling a
  hundred lumps, without going down the shaft. **A dangerous vertical
  badly needs a safe rung**, and this one is not invented.
- **Tailings are terrain and inventory.** Crushed rock in piles — loose
  ground, which is what dirt dragons swim through, so the dressing floor
  manufactures the threat too. And real mines rework their own tailings
  when prices rise or dressing improves: a permanent low-grade fallback
  that rewards better technique later.

---

## ⭐⭐⭐ The commons: excludability is physics, not policy **[DECIDED — closes Open 2]**

### The four goods split themselves

| Infrastructure | Can you gate it? | So it is |
|---|---|---|
| **Hoist / shaft** | **yes** — meter who rides and what comes up | a **toll good**. Whoever owns the shaft owns the mine's throat — a natural monopoly. |
| **Haulage / tramway** | **yes** | toll |
| **Pump / drainage** | **no** — water finds its level; draining my working drains yours | **true public good** |
| **Ventilation** | **no** — air moves through connected workings | **true public good** |

> ⭐⭐ **You can put a gate on a shaft. You cannot put a gate on
> groundwater.** That is why the pump is the political problem and the
> hoist is not — and it is a physical fact the player can verify, not a
> rule they are handed.

### The problem arrives with depth, never on day one

An **adit drains by gravity, free, forever**. Only workings *below adit
level* flood. So the mine begins with no commons problem at all, and the
moment someone sinks below the adit, everyone's dry workings become
contingent on somebody's pump. ⭐ **The free-rider problem arrives as a
consequence of success** — real, and a far better teaching curve than
starting there.

### ⚠ The layer correction: this is NOT an Office

A first pass reached for the `Office` substrate. That is the wrong layer
and the distinction is load-bearing:

- **`Office`** ([governance.md](../../subsystems/governance.md)) — *"a
  named single-holder seat with a branch and an origin, **authored in
  code**. Not user-minted."* This is the **Compact's** apparatus — the
  meta-institution that determines how systems work by nature. The
  Governor of the Central Bank is one.
- **`Government`** ([civics.md](../../subsystems/civics.md)) — diegetic,
  plural, **content**; *"jurisdiction is declared on the `Locality`"*,
  seats are **employment positions** on an organization's chart.
- The line, from governance.md: ***"whether a constitutional document
  points at the position."***

A Barmaster is not an Office. **And it cannot be a `Government` seat
either — jurisdiction is declared on a Locality, and there is no
Locality.**

### ⭐⭐ So the district is an Organization — a voluntary association

Which is what the history actually is. **The surface was granted; the
minerals were claimed.** Surface land went by survey and patent (the
Homestead Act — Hinkley Hills' `PlatBook`/`LotHolder` exactly). Mineral
land on the public domain was **free entry**: find it, post a notice,
record it with your district, hold it by working it. Miners in California
from 1848 were legally **trespassers on federal land** — there was no
federal mining law until 1866.

What they did instead is the thing worth building: each district held a
meeting, **wrote its own code** (claim size, staking, how much work per
year holds it, how disputes settle) and elected a recorder. Hundreds of
them. Then Congress ratified them after the fact — the General Mining Act
of 1872 defers to *"the local customs or rules of miners in the several
mining districts,"* and is still in force. **The state adopted the
miners' law rather than imposing its own.**

⭐ This is the deliberate **yes** that rejection-slate Open 1b asked for:
Hinkley teaches the grant, Rejection teaches the claim, and **split
estate is the real distinction between them**, not a contrivance to
justify a second property venue.

Build-3 already laid the track: ***"Unincorporated is modelled by
absence"*** — Heart's Delight ships no `Government` row — and decisively,
***"title works without government (property is Compact-level)."*** A
claim can exist with no polity at all.

So the district is an **`Organization`** with a **register** and a **code
that is a contract among its members**. It has no sovereignty and must
not pretend to: its authority comes entirely from the fact that *a claim
nobody recognizes is just a hole you are standing in.*

**Enforcement follows, and is cheap.** The association cannot fine
anyone. What it can do to a member who will not pay is **strike their
claim from the register and stop recognizing it** — expulsion from the
property system, the actual historical sanction. That is already the
deep-law's middle rung (*restitution → claim-forfeiture → exile*), and it
satisfies civics's own constraint that there be **no legal machinery**.

### ⭐⭐ The funding: you tax what you can observe

You cannot charge for drainage. But the hoist is the **excludable** good,
and every ounce anyone raises has to come up the shaft.

> **Toll the thing you can meter, to fund the thing you cannot.**

No assessment institution, no honest-weight audit, no measuring what each
working produced — the levy sits on the one chokepoint the physics
already gives you. That is real public finance (states tax what is
observable, which is why tariffs and salt taxes precede income tax by
millennia), and it explains why owning the shaft is owning the mine's
throat: **the toll is both the mine's funding mechanism and its principal
instrument of power.**

⭐ It also means **the commons can be funded in v1 without building a
state.**

### The labor half: tutwork and tribute

The content bible already says Ferrow runs "on tutwork and tribute," and
those are precisely the two work-types this slate split:

- **Tutwork** — paid by the fathom driven. **Development**: paid for
  progress through rock, ore or not.
- **Tribute** — paid a share of the value of what you raise.
  **Production**: paid for results.

⭐ And tributers **bid**. On setting day a pitch is auctioned, miners
bidding down the fraction they will accept, on their own read of the
ground. **The auction price is a public reading of what experienced
miners believe about that vein** — the prospecting skill made liquid,
over the shipped [contract](../../subsystems/contract.md) substrate and
nothing else.

### ⭐⭐ Formed, not forming **[DECIDED — closes Open 8]**

The district exists and works on day one: claims recorded, a code
adopted, a hoist charging its toll, a pump running. **Decided on the
economic axis, and the pedagogy axis agrees once the lesson is looked at
properly.**

**Forming is a one-shot.** The first cohort founds the district; player
fifty arrives at a formed one regardless. So *formed* ships eventually
either way — the only question is whether the economy waits on a
handful of early players to get there.

**And it would wait on a collective-action problem being solved by a
population that does not exist yet.** Forming means no recorded claims, a
flooding level, and no ore until players coordinate. If they do not — and
a thin population is exactly the condition under which they do not — the
mine drowns, no ingots reach the smith, and the metal chain ships with
its faucet shut. That is the failure this build exists to fix,
reintroduced as a feature.

**The lesson is not lost; it is upgraded.** Two recoveries:

- **The founding lives in the record, not in prose.** The register is an
  artifact you can *read* — claims in order, with dates, including the
  ones that lapsed; the code with its amendments; the drainage levy with
  an adoption date and a fight behind it. Append-only history is what
  [chronicle](../../subsystems/chronicle.md) and
  [provenance](../../subsystems/provenance.md) already do. The player
  **reconstructs the founding from evidence** — the venue's own deduction
  skill, pointed at institutions instead of rock.
- ⭐⭐ **The commons problem is a maintenance burden, not an event.**
  Free-riding does not end when the pump is built. It recurs: the
  workings deepen and the pump needs a bigger engine; a claimholder
  refuses the levy and must be struck off; someone sinks below the
  current pump's reach and asks everyone to fund the next stage; a new
  adit would drain a whole side cheaper but crosses three people's
  claims.

> **A formed district under live stress teaches the free-rider problem to
> every player, continuously. A founding teaches it once, to whoever was
> there.**

It also gives the arc its grip: Veshko's offer is to buy the shaft and
take the pump private — **solving the commons by abolishing it.** A
buyout can only threaten something that exists.

### The arc

Terminus later declares jurisdiction over the claim field and either
**adopts the district's register** — the 1866/1872 move — or **replaces
it**. That is *recognition vs absorption*, the political tension the
mining slate already names as the deep-law's central question, arriving
as a specific legislative act with a specific artifact at stake.

---

## ⭐⭐⭐ The demand side — what the metal is FOR **[DECIDED]**

Audited 2026-08-31 against shipped content. The finding reframes the
build:

**Arms and armor content already ships — 17 templates** in
`generic-objects`: steel sword · dagger · mace · flail · spear ·
warhammer · shield · whip · oak waster; and a full **layered** armor set
— padded gambeson · mail hauberk · steel breastplate · **bronze
breastplate** · hide jerkin · leather boots. That is the layered stack
[materials-response](../../subsystems/materials-response.md) was built to
read, already authored.

**Recipes across every pack — 39 total, and 34 are drinks or food.** The
complete list of durable-goods recipes in the game:

```
trade-smithing: belt-knife · cook-pot · fire-poker · leather-jerkin · smiths-hammer
```

> ⚠⚠ **Of 17 arms and armor items, roughly three are craftable. The rest
> enter the world by being authored into a room. A player cannot make a
> sword** — not because swords do not exist, but because no recipe does.

*(Wear is fine: `DurableMixin` is composed on the `Weapon` and `Armor`
classes themselves, so condition and repeat demand are structural, not
per-item authoring anyone forgot.)*

### ⭐⭐ The structural point

> **The ingot is not the only faucet. Every finished good is one too.** A
> metal-chain build that stops at the ingot **moves** the faucet without
> closing it. The recipe layer is not a follow-on — it is the half that
> makes this build economic rather than scenic.

### Three demand classes, in build order **[SCOPE — user's call: A then B]**

**A. Tools — the keystone, and not one ships.** No pick, sledge, axe,
billhook, tongs, hoe, sickle, spade or pruning knife exists. Every
trade's instruments are today either big placed fixtures (anvil,
workbench, still) or absent. Author them and **every shipped trade
becomes a daily customer of the metal chain** — farmer, collier, cook,
bartender, miner. ⭐ It is the loop that connects the whole graph, it is
why every village had a smith, and **it is the demand that does not
depend on a player choosing to fight.**

**B. Arms and armor — the showcase, and the cheapest unlock.** The
templates are done; what is missing is transform specs, which are data
files, not design. This is where the chain visibly pays off — the sword's
material and grade descend from the ore somebody dug, and `analyze
weapon` reads it back. ⭐ **`bronze-breastplate` already exists**: the
copper rung has its payoff item authored and waiting.

**C. Domestic and building metal — the cross-build demand.** Locks and
keys (the [credential](../../subsystems/credential.md) substrate ships
lock/key + `presentsKey`), lamps, pots, hinges, nails, bar and sheet
stock. Residences is landing homes with nothing to fit out and
[furnishing](../../subsystems/furnishing.md) ships `place`. **A lock is
the most demanded metal object in any settlement and is currently
unmakeable.** Rides along wherever it touches residences.

On the governing rule: recipes are the single most **expressive** thing
for content authors — the whole known-of → can-make ladder rides them,
and a recipe is a data file — and pedagogically **the chain only teaches
anything if the last link is a thing a player wanted.**

---

## ⭐⭐⭐ The build's shape — what must ship together **[DECIDED]**

The scope statement this design implies, stated plainly because it is
easy to under-size:

> **A mine without a smelter is a pile of rock. A smelter without recipes
> is a pile of ingots.**

For the economy to change at all, **four things ship together**:

1. **`trade-mining`** — prospect, claim, drive, stope, dress.
2. **`trade-fuel`** — coppice, pyrolysis, charcoal.
3. **`trade-smelting`** — roast, charge, blow, tap.
4. **Tool recipes** (demand class A) — so the ingot becomes something
   somebody wanted.

Plus one thing that is easy to forget and fatal to omit:

- ⭐ **An NPC crew that works whether or not players log in.** Supply
  cannot be zero on a quiet night, or the smith's inputs are a function
  of concurrency. Build-3 shipped exactly this shape as **the farms
  producer brain** (`feat(behavior): the farms producer brain`, farming
  A7) — a mine producer brain is the same pattern over
  [behavior](../../subsystems/behavior.md).

⚠ **Anything less is scenery.** A mine alone moves the metal-import
faucet from the general store's shelf to the mine's mouth without closing
it; it does not make metal an economy. This is the same point as § *The
demand side*'s "every finished good is a faucet too," applied to build
scope rather than to content.

---

## What this supersedes

- **mining-slate § *Materials, metallurgy & money***: "metallurgy is a
  craft supply-chain … each a crafting node (transform-only, `Grade`
  weakest-link)." **Superseded** — the smelt is composition physics, not
  a recipe node with a weakest-link grade. The *supply-chain* claim and
  everything about money, salt and gold stands.
- **mining-slate § *Open* — "Seam model [OPEN, LEAN finite]"**:
  **CLOSED, finite.**
- **`docs/staging/ferrow-delving.md`** — the "3D `CartesianZone` with
  negative z" is superseded by the `SphericalZone`. ⚠ That file is
  **ephemeral staging** and still holds unmigrated mechanics (three-state
  Spine/Held/Provisional persistence, vein-vs-heading, seal-and-reap at
  chokepoints) that must graduate before it is deleted — see
  rejection-slate § Open item 3.

---

## Open

1. **Ownership model, narrowed but not ratified** — `content-pack-units.md:94`
   calls Ferrow *commons / deep-law*; `ferrow-delving.md` §9 makes it a
   company mine held by a co-op `Business`. This slate's *private workings
   in a shared deposit, with the district as a voluntary `Organization`*
   reconciles them in principle (a company operation with independents on
   the margins is the historical norm), but it has not been checked
   against those two documents line by line.
2. ~~How the commons is funded~~ — **CLOSED**: toll the hoist (excludable)
   to fund the pump (not). See § *The commons*.
3. **The per-heading cap** — farming caps a field at ~4 ha so one room
   stays honest. Mining needs the equivalent: the maximum advance one
   `drive` may cut. Probably a function of the crew and the ground.
4. **Cave-in** — still the one hazard with no owned system
   (mining-slate's residual open). Shoring is the counter and dead work
   is the cost, so the design pressure now exists; the mechanic does not.
5. **Where the vein geometry lives** — on the zone, on a deposit `Idea`,
   or as a `ParcelRecord` annexe. *(rejection-slate Open 1b — whether the
   Hinkley/Rejection pairing is a deliberate yes — is answered YES by
   § The commons: the surface was granted, the minerals were claimed.)*
6. **Tin's home** — if bronze needs a trade route, some *other* locality
   must hold cassiterite. Saxonberg is the obvious candidate and does not
   exist yet; the interim is an importer with a price.
7. ~~Beneficiation~~ — **CLOSED**: mechanical dressing is mining, roasting
   is smelting, the line is the furnace. See § *Beneficiation*.
8. ~~District formed or forming~~ — **CLOSED: formed.** Forming is a
   one-shot that gates the whole chain on a collective-action problem in a
   thin population; the lesson is recovered better as a recurring
   maintenance burden. See § *Formed, not forming*.
9. **Recipe scope for demand classes A and B** — how many tool and
   arms/armor recipes ship in the first cut, and whether the smith's
   known-of → can-make ladder gates them or they all ship known.
10. **Who owns the shaft at Rejection** — the toll good is a natural
   monopoly and the mine's instrument of power. The co-op, a corpo
   (Veshko's lever for the buyout arc), or the district itself? This is
   where the temporal mirror gets its grip.

*(Retire when: this promotes to formal requirements for a metal-chain
build, or folds into the Rejection venue build that adopts it.)*
