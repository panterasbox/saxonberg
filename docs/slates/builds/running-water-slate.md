# Running water slate — plumbing the city, the water trade, and every epoch on one model

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of the
> gap walk (*"we need running water everywhere in the city potentially … have we
> really done a whole 7 lens discussion of the water trade pre-industrial?"*). What
> ships ([watershed.md](../../subsystems/watershed.md)): the `Conduit` ladder (haul →
> gravity → pumped; *a sewer is the same object reversed*), `StorageNode`,
> `ControlStructure`, the six-word `SupplyState`, delivery by extent, water rights,
> contamination by kind; Terminus's works (the city intake, the Cold Fell aqueduct,
> the aqueduct house, the intake pump, the outfall, **one standpipe in the market**);
> Hinkley's District tank. ⚠ And the line: *"Nothing inside the delivered extent is
> modelled … a conduit has two ends. **Coverage is legal, connection is physical.**"*
> Domestic metering was deliberately left out.
> **Left:** the service connection · fixtures (tap, sink, bath, water closet, the
> boiler, the roof cistern) and their mode (runs or opens) · the plumber and lead ·
> frozen and burst pipes · the water rate · hydrants · ⭐ the continuity contract
> (Roman aqueduct to water tower on one model) · ⭐ the divider's shortage policy · the
> water trade (carriers, the well-digger, the town pump, filtering and boiling) ·
> ⭐ Snow's cholera, derivable · the Great Stink
> **Size:** a build (mostly the water pack's, plus fixtures and a trade)

So the city is **covered** and nothing is **connected** — one standpipe, and no house,
bath or kitchen has water. This is the energy build's parallel: the supply ships; the
premises side is the build ([power-utility-slate](./power-utility-slate.md)).

## 1. ⭐⭐ Plumbing the city — the last hundred meters **[DECIDED]**

It keeps the two-ends rule: **no node between intake and delivery**; this is what
happens *inside* a building in the extent.

- ⭐ **The service connection** — a building is *on the main* only once **connected**:
  a plumber lays the service pipe as a construction act, consuming pipe. *Coverage is
  legal, connection is physical*, made a real act with a real bill.
- **Fixtures read the supply through the connection** — the tap, the sink, the bath,
  ⭐ **the water closet** (into the reversed conduit, the sewer), the copper or range
  boiler for hot water (thermal ships).
- **Pressure is head** — *"a tank above you gives every tap below it pressure"*
  (ships) — which is why buildings have a **roof cistern**, and why the top floor runs
  weak when the main is low.
- ⭐ **The plumber works lead** — *plumbum* is Latin for lead, finally a trade for the
  orphaned lead. **Lead pipes leach**: chronic poisoning through
  [metabolism](../../subsystems/metabolism.md)'s shipped lead toxin — Rome had it, and
  Flint, Michigan (2014).
- **Winter is the plumber's season** — `frozen` ships, and ⭐ **pipes burst when the
  water in them freezes** (ice expands); the leak shows on the thaw. Derivable from the
  frozen state and the pipe's material.
- **The water rate** — domestic metering stays out, as watershed decided; historically
  a household paid a **rate by the value of the property**, so the bill is a flat
  charge by property and the meter is a later rung.
- **Hydrants** — the fire brigade needs pressure at the street: the strongest public
  reason to plumb a city.

## 2. ⭐⭐⭐ Every epoch on one model — the continuity contract **[DECIDED — lens 5]**

The owner: *"a Roman aqueduct and the modern alternatives (modern aqueduct, water tower,
pumps) [must] play well together."*

### The contract every element answers

Whatever its epoch, each piece says **what flow it can pass** (capacity), **what head
it gives at its outlet**, and **its `SupplyState`**. The shipped classes cover every
epoch's pieces as rows:

| role | Roman | modern | shipped as |
|---|---|---|---|
| source | a spring, a dammed river | a river intake, a borehole | a reach; a well |
| conveyance | ⭐ **open channel**, falling gently the whole way | ⭐ **pressure pipe**, which can climb | `Conduit` (the sign of the head decides gravity or pumped) |
| crossing a valley | an arcade bridge, or an inverted siphon in lead or stone | a buried main | `Conduit` |
| lifting | none — Rome had no supply pumps | the pump (steam, then electric) | pumped `Conduit`, `Powered` |
| storage | the cistern, ⭐ **the castellum** | the reservoir, ⭐ **the water tower** | `StorageNode` |
| division | the castellum's outlets | valves, district mains | `ControlStructure` |
| the fixture | a **fountain that never stops** | a **tap** | new (§ 1) |

⭐ **The proof that they mix is real**: the **Aqua Virgo** (19 BC) still feeds Rome's
**Trevi Fountain** — a Roman gravity aqueduct delivering into a modern city. In the
model it is a gravity `Conduit` delivering into a `StorageNode`, like any other.

### ⭐⭐ Difference one — continuous flow or delivery on demand

- **Roman water never stopped**: fountains ran day and night, and the overflow
  **flushed the sewers**. No taps; a share was a **flow**, and what you did not use ran
  away.
- **Modern water is pressure held behind a tap**: nothing flows until you open it, and
  the **water tower** holds the pressure and **buffers peak demand** — pumps fill it at
  night, the morning rush draws it down. Its level is the `StorageNode`'s one piece of
  state.
- **One model: a fixture either *runs*** (draws its share continuously) **or *opens***
  (draws only while open).

### ⭐⭐⭐ Difference two — how a shortage is shared; the plumbing is the policy (lens 7)

- **The Roman castellum** — a distribution tank at the city's high point whose outlets,
  Vitruvius records, sat in a **priority order: public fountains first, then the baths,
  then private houses.** The outlets were at different heights, so **in a drought the
  private supply failed first and the public fountain last.** Rome's water policy was
  built into the plumbing.
- ⭐ **The Roman meter was the nozzle** — a private connection paid for a bronze nozzle
  (*calix*) of a legally standard bore; its size *was* your share of the continuous
  flow. **Frontinus**, Rome's water commissioner (97 AD), documented the fraud: illegal
  taps, nozzles bored wider than paid for — water theft with an inspector and an
  evidence trail.
- **The modern system shares a shortage by pressure** — the main runs low, pressure
  falls, **the highest taps fail first** (head makes it derivable); then the utility
  rations by valve (`off`), district by district — somebody's choice.
- ⭐ **In the model, a `ControlStructure` declares how it divides a shortage** — by
  outlet priority (the castellum), in proportion, or by valve. A Roman town and a modern
  town in the same drought **fail differently and teach different politics**, from the
  same classes.

### Two physical limits that keep the epochs honest

- **An open channel cannot climb** — head must fall along the route, which is why
  aqueducts wind along contours and cross valleys on arcades; a rising route is refused
  in words. **A siphon** — a closed pipe under pressure — crosses a valley by dipping
  and rising to just below its source (Rome built them in lead).
- **Without a pump, water never rises above its source** — Rome's cities were served
  from above. The pump and tower break that limit **at the price of energy forever**
  (*"capital and energy, forever"*); a steam or electric pump filling a tower by night
  is the [machines slate](./machines-slate.md) meeting this one.

### Mixing in practice

- **An aqueduct filling a tower** — by gravity if the aqueduct arrives above the tower,
  else a pump lifts it; the heads decide, nobody declares it.
- **A modern city inheriting a castellum** — the castellum keeps its priority outlets; a
  pumped main can feed the same extent.
- **A village pump beside the city main** — two sources, two `SupplyState`s: when the
  main reads `frozen`, the pump still works if its well does not freeze.

## 3. ⭐⭐ Places without running water — the water trade, through the lenses **[DECIDED]**

1. **Pedagogy** — water is **heavy** (a liter is a kilogram; encumbrance ships), so
   moving it is real work. **Sources differ** — a well (the water table), a spring, a
   rain cistern (roof catchment), the river, the town pump. **Quality is a fact** —
   fouled water ships, ⭐ boiling purifies (`purifiedByBoiling` ships), sand and
   charcoal filters work.
2. **Expression** — a town's water is its own: the village pump, the cistern under the
   court, the spring house.
3. **Immersion and participation** — ⭐ **the water carrier** (London's *cobs*, Spain's
   *aguador*, India's *bhishti*): a leather skin, a yoke and buckets, or a cart with a
   cask — tanning and coopering as suppliers, haulage's gig with water as cargo, **paid
   by what arrives** (the ice rule). **The well-digger.** **The town pump as a social
   place** where news travels — the original water cooler.
4. **Values** — carrying water has historically been **unpaid household labor**, mostly
   women's and children's, and still takes hours a day in much of the world; the world
   can show who carries it without preaching. And: is water a right or a good?
5. **Continuity** — haul → aqueduct → mains and pumps → treatment (slow sand
   filtration, 1829; then chlorine). `fill` from a source is the same act at every
   rung (§ 2).
6. **Economy** — water by the bucket, priced by haul distance (derived). ⭐ Private water
   companies were the first big utilities: London's **New River Company** (1613) brought
   water forty miles to the city as a business. ⭐ **When the main arrives the carriers
   lose their living** — the machines slate's Luddite thread at the scale of a city.
7. **Governance** — a well's owner against **the town pump as a commons**; water rights
   (ship); and the public-health acts below.

## 4. ⭐⭐⭐ Snow's cholera — derivable from what ships **[DECIDED]**

In 1854 John Snow traced a cholera outbreak to one contaminated pump on Broad Street,
and proved the waterborne cause with two London water companies: one drew its water
**below the city's sewage outfalls**, one had moved its intake upstream — and cholera
followed the first. Watershed's own doc says an outfall above an intake *"becomes a fact
about terrain that nobody authored."* Snow's natural experiment **is** that fact,
reproducible from shipped systems — contamination by kind,
[spoilage](../../subsystems/spoilage.md)'s pathogens in water, and a sickness that maps
onto who drank from which source.

- ⭐ **Snow's act** — he persuaded the parish to **remove the pump handle**: a
  public-health authority closing a source on evidence, with a criterion and an appeal.
- **The Great Stink** (London, 1858) — the summer the Thames smelled so bad that
  Parliament funded Bazalgette's sewers: public works forced by a smell everyone shared
  ([cleanliness](../../subsystems/cleanliness.md)'s waste, the reversed conduit).

## 5. First venues

- **Terminus** — its streets and houses for the plumbing; the market standpipe as the
  town pump.
- **Rejection** — no main: the carriers.
- **Hinkley** — the District tank's head, already shipped, as the first fixture's
  pressure.

**The drive, in one line:** your Terminus house is in the extent and dry; you hire the
plumber to lay the service pipe, fit a tap and a roof cistern, and pay the rate — and in
the first hard frost the pipe bursts and the plumber is booked for a week.

## 6. Open

1. **Fixture mode** — `runs` or `opens` as a fixture field, and how a running fixture's
   overflow reaches the sewer.
2. **The divider's policy** — the closed list (priority, proportion, valve).
3. **The service connection** — a fact on the structure, the parcel, or the fixture.
4. **The water rate** — who levies it: the works' owner, or the polity.
5. **Siphons** — whether a pressure crossing is a `Conduit` variant or a property of one.
