# Mana economy design pack — mana as its own conserved quantity

> **Status: PARTIAL** — the `arcane-science.md` edit landed 2026-08-11 and
> the TPA buys and resells mana →
> [fasttravel.md](../../subsystems/fasttravel.md). **2026-09-21 cluster
> merge:** the sibling `mana-economy-slate.md` retired into this pack — see
> *Absorbed from mana-economy-slate.md* below.
> **Left:** the two Material fields (mana density · mana conductivity — canon
> in arcane-science.md, no field on `Material` yet) · mana deposits +
> prospecting/refining (partition + volatility, purity as a `Grade`) ·
> ambient mana density of place driving recovery · the soil mana reserve +
> the `mana` meal tag · magic water / the mana crystal as traded bulk goods ·
> the volume-tiered sale (bulk contract · the piped-mana utility tier) · the
> mana farm · the Confluence in Terminus canon · the three vocations ·
> binding devices (a per-second draw that lapses when the reservoir runs
> dry — `'binding'` is declared on `DrawMode`, nothing reads it) · sited mana
> NODES on the terminus-condition × access-mode grid (geological/dynamic/
> celestial/biotic × surface/subsurface-solid/subsurface-fluid) · node
> title, rent and the first natural monopoly · whether a grid-power node
> depletes (distinct from the farmed-soil-deposit case above) · demurrage on
> a GRID vs. only on stored charge · distribution as a tree and the grid
> edge as an economic boundary · the magic vehicle (a charged `Drivable`
> priced against feed) · the reserve-that-is-not-a-body call (matter now
> holds mana by canon, so whether the polity governs a node's `inflow` by
> quota/rent must be decided deliberately) · the offer layer's currency
> (`PricedOffer.prices` is bare minor units — owned by supply-chain-slate)
> **Size:** a build

See also: [arcane-science](../../arcane-science.md) (**the doc this amends** —
the postulate, Halloway, the price list, the instruments) ·
[magic](../../subsystems/magic.md) (the shipped mechanism) ·
[supply-design-pack](../tails/supply-design-pack.md) (⭐ **mana becomes its third
commodity**) · [magic-items](../../subsystems/magic-items.md) (`ChargedMixin`,
the `S* = inflow/d` charge economy) ·
[crafting](../../subsystems/crafting.md) (`Grade`, the refining chain) ·
[bulk](../../subsystems/bulk.md) (magic water is a bulk material) ·
[retail](../../subsystems/retail.md) + [chattel](../../subsystems/chattel.md)
(bottled trade — ships) · [mining-slate](./mining-slate.md) (the extractive
shape) · [vocations](../../vocations.md) (three entries fall out) ·
[parcel](../../subsystems/parcel.md) (deposits are land).

---

## The decisions on record

Settled with the owner, 2026-08-11:

| # | Decision |
|---|---|
| **1** | **Mana is a separate conserved quantity**, coupled to energy through a fixed constant — the electric-charge relationship, not an identity |
| **2** | **The coupling is ONE-WAY** — mana → energy, never back. No amount of fuel makes mana |
| **3** | **Mana is EXTRACTIVE, not manufactured** — found in places, never produced from inputs |
| **4** | **Only some substances hold it** — a new field on the existing closed Material set, not a new material |
| **5** | ⭐ **Some sources need refinement** before they are practically usable (Part 4) |
| **6** | ⭐⭐ **Nonlocality is ENERGY-ONLY.** The postulate moves energy, never mana; **mana moves by contact and conduction**, like charge. Adds *mana conductivity* as a second material field (Part 2) |
| **7** | ⭐ **Mana PARTITIONS on separation**, with a volatility loss to ambient each pass — refining is a skilled trade, not a boil (Part 4) |

---

## Part 0 — ⭐⭐ What this costs: numerically, nothing

✅ Landed — [arcane-science.md](../../arcane-science.md)'s 2026-08-11 audit
entry (*no numbers changed, `k = 1 kJ/τ`*), § Units and quantities, § The
second quantity; the engine side is
[magic-items.md](../../subsystems/magic-items.md) § The denominator is τ (the
`Unit` became the neutral `'pt'`; *no shipped number moved*).

---

## Part 1 — ⭐⭐⭐ Halloway was right. The field over-read him.

✅ Landed — [arcane-science.md](../../arcane-science.md) § Halloway
Equivalence + § ⚠ And the field over-read it for a century (`E = η·k·M`; the
basin measures `k`; *it takes mana that did not come from a caster — a
mana-bearing substance — to tell them apart*).

---

## Part 2 — The two quantities

✅ Landed — [arcane-science.md](../../arcane-science.md) § The second
quantity (the table's every row; the postulate otherwise unchanged; *magic
still never creates matter*).

### ⭐⭐ Decision 6 — nonlocality is ENERGY-ONLY

✅ Landed — [arcane-science.md](../../arcane-science.md) § The second
quantity (*mana itself moves by contact, not nonlocally… which is why a
caster must hold a conduit to charge it*; the ⚠ *two clauses point opposite
ways* box). ⚠ The two **fields** (`manaDensity` / `manaConductivity`) are
canon properties, not yet fields on `Material` — that build item is Part 7's
table.

### ⭐⭐⭐ The corollary law: magic is good at ONCE and terrible at HELD

✅ Landed — [arcane-science.md](../../arcane-science.md) § Kell's Partition
(*magic is excellent at what happens ONCE and poor at what must be HELD;
structure beats sustained assertion*; the comparative advantage: impulse,
portability, places you cannot build).

---

## Part 3 — Where mana comes from, and what a caster is now

**Two sources, and the split preserves the free floor:**

1. **Deposits** — ground, springs, and substances that hold mana. Extractive,
   geographic, ownable (a deposit is **land**, and title/rent/land-use all
   ship).
2. ⭐ **Ambient absorption** — living things slowly accumulate mana from their
   surroundings. This is the caster's innate reserve: small, slow, **free**,
   and it keeps a broke player able to cast. A magic system where poverty
   means powerlessness is a worse game and a worse politics.
3. **Ingestion** — eating or drinking something that carries mana (below).

### ⭐⭐ The banana question: no, and it is scale that behaves like compatibility

**Ordinary food cannot become mana.** One-way coupling means a banana is
440 kJ of chemical energy and nothing else; eating does not refill the
reserve.

But no separately-invented "magic banana" is needed either. Mana density is a
**material property**, and living things absorb ambient mana — so a crop grown
in mana-rich ground **accumulates** it, exactly the way plants accumulate
selenium or iodine from soil. An ordinary potato has some selenium; a Brazil
nut has a thousand times more.

> ⭐ **It is a scale difference spanning enough orders of magnitude to behave
> like a compatibility difference** — which is the honest version of both
> intuitions, and it needs no new rule.

Three consequences, and two are nearly free on shipped substrate:

- ⭐⭐ **Mana in soil is just another soil reserve.**
  [Smallholding](../../subsystems/smallholding.md) already carries `moisture`
  and `nitrogen` as depleting reserves with a reconcile. Mana is a third of the
  same shape — **and crops draw it down**, so *farming a deposit depletes it*
  with no new depletion model to write.
- ⭐⭐⭐ **Which makes husbandry an extraction industry.** Growing crops on a
  deposit is slow mining, with the plant as the concentrator. That is
  **phytomining** — real technology, used to pull nickel out of soil with
  hyperaccumulator plants.
- **Ingestion is one more meal tag.**
  [Metabolism](../../subsystems/metabolism.md) already fans multi-tag meals to
  several reserves (`water`→hydration, `carb`→fast satiation, `fat`→slow). A
  `mana` tag routing to the mana reserve rides the same seam.

⚠ **The anti-chug guard already ships** — the mana potion IS a meal chemistry
that feeds coupled recovery through the digestion buffer
([magic-items.md](../../subsystems/magic-items.md) § The mana potion is
metabolic).

> ⚠ **Recovery rate now depends on WHERE YOU ARE** — ambient mana density is
> a property of place. That is a new and good mechanic (it gives geography
> teeth and explains why some sites are worth holding), and it is a real
> change to how `CasterMixin` recovery reads.

### What this does to "recovering is exercise"

✅ Landed — [arcane-science.md](../../arcane-science.md) § The caster's
budget (*CASTING is exercise*; the ⚠ *Revised 2026-08-11* box: the stock
refills by ambient absorption, the coupling work is metabolic; the mana bar
is still not the danger meter).

---

## Part 4 — ⭐⭐ Refinement: the chain, and why it makes the economies complements

Decision 5. Raw mana-bearing matter is **dilute**, and dilute is not
practically usable — the same relationship ore has to metal, or sap to syrup.

```
prospect → extract → assay → refine (concentrate) → store → use
```

**Refining is concentration, never creation.** You remove medium to raise
density — evaporate the water out of a mana-bearing spring water, smelt the
gangue out of a mana-bearing ore. Conservation holds exactly: no mana is made,
some is inevitably lost to the tailings.

> ⭐⭐⭐ **And concentration costs ENERGY** — real latent heat, real furnace
> work, all of it already shipped ([fire](../../subsystems/fire.md),
> [thermal](../../subsystems/thermal.md)).
>
> **So the energy economy is an INPUT to the mana economy.** The two are
> non-substitutable but **complementary**: you cannot make mana with
> electricity, but you cannot *refine* mana without it. They meet at exactly
> one place — the refinery — and nowhere else.

That single fact is what stops two parallel utilities from being redundant,
and it is the strongest argument that this model is the right one.

**Purity is a `Grade`** ([crafting](../../subsystems/crafting.md) ships it), so
the family's weakest-link and limiting-factor patterns apply unchanged, and a
spell or a charged item can demand a minimum purity the way it already demands
a band.

### ⭐ Decision 7 — mana PARTITIONS, and leaks a little every pass

When you evaporate mana-bearing water, does the mana stay with the residue or
leave with the vapour? Three answers were available; the third is the one that
makes refining a **trade** rather than a boil:

| | Consequence |
|---|---|
| stays with the residue | distillation concentrates it — refining is trivial |
| leaves with the vapour | collect the condensate — trivial, inverted |
| ⭐ **partitions between both** | **fractional separation, multiple passes, a purity ladder** |

**Partitioning is the decision**, plus a small **volatility loss to ambient on
every pass**. That single pair buys four things at once: raw sources deplete
when disturbed, purity is genuinely expensive, a skilled refiner is worth
paying, and the [assayer](../../vocations.md) has something invisible to
measure. It is petroleum fractionation and isotope enrichment, which are
exactly the right real analogues to be teaching.

### ⭐⭐⭐ Who can do the work — and the 2×2 collapses

The natural question is whether magic material needs magic processing. Two
rules already in hand answer **every cell**:

| | ordinary process | magic process |
|---|---|---|
| **ordinary material** | ✅ ordinary industry | ⛔ **worse** — the binding law (Part 2): a furnace beats a caster, permanently |
| **magic material** | ✅ **the only way** | ⛔ **impossible** — the postulate moves energy, not mana (decision 6) |

> **Magic oil does not need a magic refinery, and cannot have one.** Refining
> is physical separation, and an ordinary still does it perfectly well.

---

## Part 5 — The economy: a commodity that becomes a utility at scale

### ⭐⭐⭐ The consequence that shapes everything: the mana industry is MUNDANE

Decision 6 plus the 2×2 above means prospectors, miners, refiners, teamsters
and assayers **need not be casters — and could not use magic for the job even
if they were.**

> **Mana is a commodity that ordinary industry produces and extraordinary
> people consume. Mages are CUSTOMERS, not producers.**

That is the spice model, and it is where the politics lives: the people with
power **structurally depend** on people without it, and cannot cut them out —
not by law or custom, but because the physics will not permit it. Nobody has
to *design* the dependency; it is forced.

⭐ **What is broader than melange**, and worth naming because it is the part
that pays off: spice is one substance from one planet — a macguffin. This is a
**class** of substances with density, conductivity and purity as continuous
properties. That yields a materials science rather than a plot device: grades,
blends, substitutes, an assay trade, and the real possibility of somebody
discovering a better feedstock.

### Two utilities, not one

✅ Landed — [arcane-science.md](../../arcane-science.md) § The power level
(*you cannot build a mana plant; you can only own a mana deposit* — the
industrialization argument replaced).

### ⭐⭐⭐ How it is sold: volume-tiered, and industrial gases settle it

> ⚠ **Supersedes two earlier readings in this pack** — "two utilities" (too
> generous) and its over-correction, "mana is never a utility, only a
> commodity" (too strict). Neither survives contact with an actual industrial
> consumer.

The real world already has a commodity with **no residential demand and
genuine continuous industrial demand** — industrial gases — and it is
delivered three ways, chosen **by volume**:

| Scale | Delivery | Relationship | Needs |
|---|---|---|---|
| **small** | flasks, crystals, charged items | **retail** | bulk ✅ · `PricedOffer` ✅ · chattel ✅ · `ChargedMixin` ✅ — **no new machinery** |
| **medium** | bulk delivery | **a contract** | [contract](../../subsystems/contract.md) ✅ + [freight](./freight-slate.md) |
| ⭐ **large** | **a pipe, often a refinery built over the fence** | **a genuine utility relationship** | the power slate's middle tier |

> **Mana is a commodity that becomes a utility at industrial scale.** Nobody
> has an argon tap at home; a float-glass plant has an oxygen pipeline. Both
> are true at once, and **the tier boundary is a player's decision, made on
> volume** — not a design decision made in advance.

⭐ **Which gives a real business arc**: buy flasks → contract bulk delivery →
**own the refinery over the fence.** That progression teaches *why firms
vertically integrate* — transaction costs, Coase — by letting a player feel
the moment buying becomes worse than building.

⚠ **Piped mana still never reaches housing**, because housing has no standing
demand (the binding law, Part 2). And the [recurring-charge
call](../../stewardship-doctrine.md) applies unchanged wherever a pipe does
exist: meter on use, dischargeable without attendance, non-payment never takes
the asset.

**Build order is still smallest-first** — the icebox before the fridge. Magic
water is a bulk material with a mana density sold by the flask; a crystal is
the solid form; a charged wand is the same store with a fixture around it.

### ⭐⭐⭐ The arbitrage floor — asymmetric physics makes asymmetric prices

Mana → energy works; energy → mana never does. So:

> **Mana has a price FLOOR at its energy content.** Anyone can convert at rate
> `k`, so mana can never trade below the electricity it would yield. Expensive
> electricity drags mana up; expensive mana never touches electricity.

Asymmetric physical coupling producing **asymmetric price coupling** is a real
financial structure, and it falls out of decision 2 with nothing added.

⚠ **And the guard that keeps it from eating the design:** the coupling is
lossy and mana is extractive-scarce, so **burning mana for electricity is
always uneconomic** — the same reason nobody burns banknotes. The floor exists
and is **never binding in practice**, which is exactly how a price floor
should behave.

### ⭐⭐ The dam and the refinery are rivals for FLOW

A turbine extracts **gravitational potential energy** and does not couple to
mana at all, so water leaves the far side carrying every bit of mana it
arrived with. Hydro and refining want entirely different things from the same
river.

But refining is concentration *by removing the medium* — so a refinery
upstream takes water **out** of the river that the turbine downstream never
sees.

> **They compete for the flow, not for the energy and not for the mana.**

That is a water-rights problem — prior appropriation, riparian doctrine,
senior and junior claims — one of the richest bodies of real property law
there is, and the [parcel](../../subsystems/parcel.md) title, land-use and
[governance](../../subsystems/governance.md) machinery to adjudicate it
already ships.

### ⭐⭐⭐ The mana farm — and why "it's always a loss" does not close it

Feeding refined mana into soil to grow mana-bearing crops **loses mana every
time**: conservation plus refining losses mean the crop cannot return more
than went in. It is tempting to conclude nobody would do it, and that
conclusion is **wrong** — it is a physics argument doing economic work it
cannot do.

> ⚠ **The farmer is not selling mana. He is selling carrots.** A smelter
> loses metal to dross and runs anyway, because the output is worth more than
> the input. The loss settles the question only if the *output* is mana.

**Two results, and both hold at once:**

1. ✅ **You still cannot farm mana into existence.** No agricultural loop
   creates mana, so decision 3 survives — this is the loophole that would
   otherwise launder "extractive, never manufactured" through a field.
2. ⭐ **Mana-fertilised farming is nonetheless a real industry**, whenever the
   product's premium exceeds (mana in + farming cost).

#### ⭐⭐ What justifies the premium — and it is not convenience

"One item instead of two" supports a small margin and no industry. Two better
answers, one of which is a mechanism:

- **Extended release.** [Metabolism](../../subsystems/metabolism.md)'s
  digestion buffer releases food over time. A flask is a bolus; a carrot is a
  drip — and if ingestion is band-capped (open question 2), slow release lets a
  caster absorb **more total per day** than a flask they cannot finish.
- ⭐⭐⭐ **Bioavailability.** Mana a plant has already incorporated into
  organic matter absorbs far better than refined mana does — **heme iron
  versus iron filings**, which is real nutrition science. That makes the
  farmer's process not concentration but **conversion into a bioavailable
  form**: a genuine quality gain, and what pays for the loss.

⭐ **The product category that falls out:** the mana reserve sits beside
satiation and hydration, so a crop hitting all three is literally **the
caster's field ration** — which an army quartermaster buys, and that is a far
larger customer than any individual mage.

#### ⭐⭐ Two ways to supply the farm — and it is labour versus capital

| | Casters on the payroll | Bought refined mana |
|---|---|---|
| What it is | an **ambient-harvesting machine** — each caster a small trickle refilled from the air | a purchased input |
| Scales by | **hiring** | **investing** |
| Character | labour-intensive, low capital, scales badly | capital-intensive, scales well |

> **Which wins depends on wages against the mana price.** That is **factor
> substitution** — the labour-versus-capital decision that drives
> mechanisation — so a mana farm *mechanises over its lifetime* for exactly
> the reasons real farms did. A smallholder uses hands; a large operation buys
> the input.

⚠ **Keep the political texture rather than sanding it off.** Paying people for
what their bodies slowly accumulate has uncomfortable real analogues — plasma
donation, sharecropping. In a world with a dockers' hall and a labour
movement, that is a feature.

#### Does the market exist? It passes the register's own test

The [vocations](../../vocations.md) register's hardest brake is **NEVER INVENT
A NEED TO CREATE A MARKET**. This clears it: casters already need mana,
everyone already eats, and the mana carrot **combines two existing demands**
rather than imposing a new obligation. With bioavailability it is a *product
improvement*, not a bundle.

---

## Part 5b — ⭐⭐⭐ Where Terminus gets it: the city refines what it cannot produce

**The canon.** [terminus-city](../../staging/terminus-city.md): two rivers
meet at the **Confluence** at the north head ("sacred head"), the combined
river runs south splitting West Bank from East, and **Wharfside** is the
riverfront. ⚠ **The hydro decision is NOT in the corpus** —
[power-utility-slate](./power-utility-slate.md) still lists *"who owns
supply?"* as genuinely open. It was decided in conversation and never
recorded; Part 8 flags the fix.

**The proposal, and it makes the hydro decision load-bearing rather than
incidental:**

> ⭐⭐⭐ **Terminus refines mana it does not produce.** Raw mana-bearing
> material comes in from the frontier; Terminus's cheap hydro concentrates it
> (refining costs energy, Part 4); refined mana is sold locally and exported.

**This is aluminium, exactly.** Smelters locate at cheap hydro — Iceland,
Norway, Quebec, the Pacific Northwest — and import bauxite from the tropics,
because ore is cheap to ship and electricity is not. *Aluminium is solid
electricity.* Making Terminus a **processing** city rather than a **resource**
city buys four things at once: an industry that is not merely "the city," a
trade route for [freight](./freight-slate.md), an economic reason the frontier
exists, and von Thünen doing the work that slate already wanted done.

### The two farming modes, and where each belongs

| Mode | Where | Yield | What it actually is |
|---|---|---|---|
| **On a deposit** | frontier, rich ground | good | ⭐ **slow mining**, with the plant as concentrator |
| **On ordinary ground** | anywhere | tiny per hectare | **harvesting ambient** — diffuse, like sunlight before cheap panels |

⭐ Mode 2 is **the frontier's business model**: land that is nearly free, no
competing use, enormous acreage, thin yield. That is marginal agricultural
land in reality, it is von Thünen again (low value per hectare locates far
from market), and it puts the magic-carrot farmer *somewhere specific*.

### ⭐⭐⭐ DECIDED — the Confluence is the source, and it is chosen for NARRATIVE

**(Owner, 2026-08-11: Terminus needs a mana source; the criterion is a rich
surface for NPCs and stories players can engage with, not economic tidiness.)**

On that criterion it is not close. An import-only city puts every conflict out
on the frontier and leaves Terminus **downstream of its own drama** — a place
that processes other people's problems. Putting the source in the middle of
the map makes it everyone's.

> ⭐⭐⭐ **A sacred site that is also an economic resource is the richest single
> object you can put in a city**, because it forces every character to choose
> between two incommensurable values. That is not a puzzle with a solution —
> it is a **position**, and positions are what make NPCs read as people rather
> than quest dispensers.

**Six legitimate claims on one piece of ground — all already named and housed
on the shipped map, with no new worldbuilding:**

| Claim | Who | Position |
|---|---|---|
| **occupation** | the **University** — the campus sits on it | it is ours; we study it |
| **sacred** | the **clergy** — the Sanctuary is *below* the campus | it is not a resource at all |
| **civic** | the **locality** ([governance](../../subsystems/governance.md) ships) | it is public |
| **capital** | **Aevex · Goodkin · Vionne · Hollis** | name a price |
| **labour** | the **dockers' hall**, Wharfside | it is jobs |
| **security** | the **Garrison**, already guarding the northern approaches | ⭐ guarding *what*, exactly? |

That last row is the tell that the geography was already pointing here.

### ⭐⭐ The fog is the evidence, and it is already canon

[terminus-city](../../staging/terminus-city.md) gives the city a signature:
**"fog off the confluence."** Decision 7 says mana is **volatile and leaks to
ambient on every disturbance.**

> **The fog IS the deposit venting.** A line of existing flavour text becomes
> the visible signature of the source, with nothing invented to join them.

And it pays off mechanically: Terminus carries **high ambient mana**, so
casters recover faster in the city. That is a reason mages live there, a
reason the University is there, and a reason East Bank rent is high — all out
of one weather line already written.

⭐ **The import economy survives intact**, because all three hold at once:
**rich ambient** (free, everywhere, good for casters) + a **protected
deposit** (too sacred and too small to industrialise) + **imported raw
material** for the refineries. The tension between the three *is* the story.

### The hooks the systems already generate

Situations, not a plot list — each is mechanically supported today or by a
designed pack:

- **Rationing.** The deposit is drawn down; who gets an allocation? The supply
  pack's common-pool **quota**, which makes an NPC administrator a person with
  enemies.
- **Refinery downstream vs sacred site upstream** — the flow-rivalry
  water-rights seam (Part 5), already designed.
- **Illegal extraction** — the Gray, the fence, the dead-drop, all on the map.
- **A worker hurt at the site** —
  [accountability](../../subsystems/accountability.md), already shipped.
- **Samples the church will not permit** — the University's research blocked by
  a claim it cannot overrule.

⚠ **Name positions, not people.** Six factions with a stated stance is a
*generator*; a roster of twelve named characters is a carve you pay for
immediately and rewrite later. NPCs stay just-in-time.

---

## Part 5c — ⭐⭐⭐ Teleportation, TPA, and devices that hold effects

✅ Shipped and landed. The owner's call → [fasttravel.md](../../subsystems/fasttravel.md)
§ ⭐ What the TPA reform changed (a real `teleport` spell, `m·g·Δh`, paid
by the fare, fed by a line in the city or cells on the frontier, `dry` when
the mana runs out). The science → [arcane-science.md](../../arcane-science.md)
§ The Postulate (revised 2026-08-11: the exemption is LOCALITY; *magic never
creates matter* survives as an affordability argument about creation),
§ Control·Body and the terminal network (teleport is Control·Body, no
fourteenth noun; the cost is SPECIFICATION — a terminal is a pre-specified,
surveyed destination and `register` is the traveller being specified into
the system; the fare table: altitude · mass · **no distance**; *you can only
teleport yourself*). Code: `MagicLogic.relocationCostImpl` (mass + borne
burden × g × Δh, no distance term), `arcane-library/.../Spell/teleport.yaml`
(`cost: 40` = the survey floor; `costModel: potential`; AC5).

### ⭐⭐⭐ The general category: devices that hold effects

TPA is the first non-agent caster and will not be the last. The postulate
already permits the category through **Kell's Partition**, with no new physics:

> **A device does not cast. It sustains a binding a caster established.** The
> wizard was the endpoint *once*, at installation; the device holds the state,
> and a **mana reservoir tops it up instead of a person.** When the mana runs
> out, the binding lapses.

The impulse half shipped: `ManaPoweredMixin` declares `DrawMode = 'impulse' |
'binding'` (Kell's own distinction) and every shipped device is impulse — a
battery-shaped draw per use, fed by a cell, the city line, or a person in
contact, the supply chosen per row (`fasttravel.md` § The gate runs on mana,
§ The three supplies; Terminus line-fed, the frontier on cells). `status`
now DERIVES from supply, so the grey light has its cause (§ The condition).
⚠ Nothing yet reads `'binding'`: no device draws per second and no binding
lapses when its reservoir runs dry — that half is the build item.

### ⭐⭐ What this means for a home

> **Domestic devices are IMPULSE devices** — a lock that opens, a lamp you
> light, a hearth that kindles. Small per-use costs, topped up **by contact
> from the resident's own pool** (`ConduitMixin` doing exactly its job). So a
> home needs **no mana connection at all**, and the reason is not "homes do not
> use magic" but **"homes use impulses, and a resident is a sufficient
> battery."**
>
> **Binding devices need a real supply**, and those are institutional — a
> permanent ward is a guild's problem, never a homeowner's.

---

## Part 6 — ⭐ Three vocations fall out, and two are already listed as GAPs

| Vocation | Register status | Gate | Fit |
|---|---|---|---|
| **prospector** | **already a GAP** — gate *"assay (instrument + competence)"* | finds deposits | ⭐ the listed gate is **exactly** this |
| **mana refiner** | the **miller/smelter/tanner GAP** shape | premises + industrial zoning | concentration is a process trade |
| ⭐⭐ **thaumic assayer** | the **information-asymmetry family** (appraiser · assayer · underwriter · banker · surveyor) | a certified instrument | **purity is invisible** |

The assayer is the strongest of the three against the register's own test —
*"if both sides know the same things build a MENU; if one side knows more,
build a VOCATION"* — because you genuinely cannot see mana density by looking.
And the arcane science already ships the instrument shelf (the basin, the
reserve gauge, the survey meter, the probe detector, the thaumometer) that
such a trade would use.

---

## Absorbed from mana-economy-slate.md (2026-09-21 cluster merge)

The sibling `mana-economy-slate.md` opened the mana-economy question a week
before this pack (2026-08-04) on the premise *mana IS energy*; this pack's
2026-08-11 decisions superseded that premise and this pack absorbed every
shipped fact the slate carried. What follows is the slate's remaining
UNBUILT design — moved here verbatim because it is not duplicated above —
and the slate itself is retired (conservation table:
`docs/plans/slate-compaction/cluster-mana.md`).

### Absorbed from mana-economy-slate.md — Guard 2: rent: nodes are Ricardian land

## ⭐⭐ Guard 2 — rent: nodes are Ricardian land

A **node** is a site where conversion is *better* — a good fall of water, a
hot vent. So sites are heterogeneous and the best ones go first.

> **Best site first, then worse ones; the rent on the best site is the
> difference.** Classic Ricardian rent — which means **the marginal cost of
> mana RISES with demand**, and a rising supply curve is precisely what
> stops an input from eating every industry.

⭐ And it needs no new mechanism: a node is a stock with an inflow, the same
equation [discovery-slate](./discovery-slate.md) already uses for forage
(inflow = regrowth) and ore (inflow = zero). **A renewable node has an
inflow; a depletable one does not.**

> ⚠ **The failure to avoid: a manufacturable mana at constant cost.** If
> more mana can always be made for the same price, it becomes the numéraire
> and every price in the world tracks it. **Mana must be rent-bearing, not
> manufacturable.**

⚠ This slate's Q3/Q5 (below, "Absorbed — open questions") extend this guard
to the node-depletion decision and to node ownership; a **node** here is the
same kind of thing as this pack's Part 3 **deposit** — the two docs used two
names for one concept.

### Absorbed from mana-economy-slate.md — the offer layer's currency gap

⚠ **One gap inherited from the same survey:** `PricedOffer.prices` is bare
minor units while `Charge` carries a currency — so a charger's price is
denominated **by convention** at the settling site. Harmless at one
currency; see [supply-chain-slate](../tails/supply-chain-slate.md) § *the
offer layer has no currency* (⚠ this line item is shared with
supply-chain-slate, which owns it — recorded here only because the slate
that carried it retired).

### Absorbed from mana-economy-slate.md — The tension: a city-scale node breaks `S* = inflow / d`

## ⚠⚠⚠ The tension: a city-scale node breaks `S* = inflow / d`

This slate said a node may *"fart out enough energy to power a city."* The
shipped economy says **all item-charge is caster-sourced and deliberately
capped** — and the cap is load-bearing, because it is *why* wealth cannot
corner the channel.

> **An unbounded node inflow sends `S*` to infinity and dissolves the
> guarantee the item build rests on.**

### ⭐⭐⭐⭐ But the coupling already resolves it, and elegantly

**A node has no reserve, and charge requires a caster's reserve as one of
its three supplies.** So:

> ⭐⭐⭐ **A node can power a city's MACHINES. It cannot charge a wand.**
> Items are charged by people, full stop — not by decree, but because the
> coupling demands an endpoint a node does not have.

Two economies, separated by mechanism rather than by rule:

| | supply | bounded by |
|---|---|---|
| **grid / machine power** | nodes, hydro, fire | the site — Ricardian rent |
| ⭐ **item charge** | **caster labour** | metabolism, and it is *capped* |

⭐⭐ And that yields the best version of Part 7's development arc, now
*mechanically* true instead of asserted:

> **Magic power is expensive because it is HAND-MADE. The grid is cheap
> because it is mechanised.** Artisanal → industrial, which is the actual
> history, and here it is a consequence of the coupling rather than a
> balance decision.

⚠ **The open call this leaves:** whether anything may ever *be* a reserve
that is not a body. **Say no and the cap holds forever**; say yes and
`S* = inflow / d` needs the polity to govern `inflow` — which is exactly the
quota/rent machinery this slate already describes, so it is answerable
either way. **But it must be answered deliberately, because it is the one
decision that can silently undo the item economy.**

⭐ Note the build's own instinct points the same way: `transfer` is
**gated at `novice` on purpose** — *"it is the part that makes a mage useful
to other people. Gating it high would turn a service anyone can sell into a
specialist's monopoly."* **Charge is meant to be a broad labour market, not
a chokepoint** — which an industrial node would flatten.

⚠⚠ **This section is now partly CONTRADICTED by canon and kept anyway.**
`arcane-science.md § The second quantity` (landed after this section was
written) says matter — not only bodies — holds mana, so the premise "a node
has no reserve" and the ⚠ open call above should be read against that: a
non-body reserve may already be possible, which is exactly the case this
section says would force the polity to govern `inflow`. The consequence
this section names is the live design question; its premise is not settled
fact. Requirements should read this against Guard 2 and this pack's
decision 3, not inherit "items are charged by people, full stop" as closed.

### Absorbed from mana-economy-slate.md — The stack

# Part 3 — The stack

```
  SOURCE            →  CHARGER          →  DISTRIBUTION      →  CONSUMER
  water / fire /       converts to         grid (tree)          TPA terminal
  vent / sun           storable charge     or cells (portable)  vehicle
  (a sited node)       ⭐ a real trade                          refrigeration
                                                                items / tools
```

Every arrow is a price, and every box is somebody's business. ⭐ **That is
the test this design has to pass and does**: a power economy with only one
paid step is a utility bill, not an industry.

### Absorbed from mana-economy-slate.md — Grid vs. cell is a GEOGRAPHY, not a convenience

# Part 4 — ⭐⭐ Grid vs. cell is a GEOGRAPHY, not a convenience

The user's own two-source sketch — *"something big and central like a gas
station and something small and portable like a fuel tank"* — maps onto
things already designed:

| | | |
|---|---|---|
| **Central station + grid** | a **utility tree rooted at a source** ([delivery-slate](./delivery-slate.md)) | cheap per unit · fixed · **only where the line reaches** |
| **Portable cell** | a charged store, filled at a station | expensive per unit · **goes anywhere** |

Exactly gas mains vs. propane bottles, or grid power vs. batteries. And the
consequence is spatial:

> ⭐⭐⭐ **The grid's edge is an economic boundary.** On-grid is cheap;
> off-grid pays the cell premium. Von Thünen again — and this time the ring
> is **built**, not natural.

⭐⭐ **Which finally gives a locality committee something real to do.**
Extending the line raises the value of every parcel behind it, so
infrastructure becomes a legible political act with a measurable payoff —
and it is the first case where a locality's *spending* creates *land value*
rather than merely regulating it.

⚠ **Status per the code today:** the cell-vs-line price gap is real
(`tpa.manaRate.cell 0.01` vs `.mains 0.002`), so *on-grid is cheap, off-grid
pays the premium* already holds at a TPA gate. What has no code is the
*utility tree rooted at a source* and *extending the line* as a locality's
act — `ManaMain` is a per-room fixture named by `mainsRef`, not a network.

### Absorbed from mana-economy-slate.md — Mana nodes: terminus conditions × access modes

# Part 6b — ⭐⭐⭐⭐ Mana nodes: terminus conditions × access modes

> **User: "I don't want this to be anything goes — there should be some
> science behind it. Or rather, the magic science we have should intersect
> with the other sciences in interesting ways, like the mana spring does
> with geology. Like maybe it's not material-based at all but mechanical,
> like hydro is just not based on water. Or based on radiation like solar
> but not the sun. Or maybe all of the above."**

## The framing that keeps it principled

The postulate already says energy arrives at a place from an unknown far
end (⚠ "Part 6" in the original slate — its endpoint-clause section, now
shipped and documented at `fasttravel.md` § 2 · The TPA ride and
`arcane-science.md` § The Postulate). So the only open question is:

> **What determines WHERE a standing transfer terminates?**

And that question does not belong to magic — it belongs to whichever
ordinary science governs the place.

> ⭐⭐⭐⭐ **Magic does not get its own science. It gets a FOOTHOLD in every
> other one.** One postulate, several **terminus conditions**, each of which
> is a different discipline's question.

## Axis 1 — the terminus condition (the physics)

| condition | output profile | intersects | consequence |
|---|---|---|---|
| **Geological** — bound to a vein, intrusion, or structure | ⭐ **constant, depletable** | geology, mining, materials | found by *prospecting*; can be worked out |
| **Dynamic** — needs persistent motion (a gyre, a race, a standing wind) | **variable, renewable** | ⭐ **weather — already ships as a procedural field** | output swings with storm and season |
| **Celestial** — fed by incident radiation that is *not* sunlight | ⭐⭐ **periodic, predictable** | astronomy, `CelestialApi` | an **almanac becomes saleable** |
| **Biotic** — forms where life is dense | **slow, destructible** | ecology | clearing the forest kills the node |

⭐ The celestial row is already half-written: [discovery-slate](./discovery-slate.md)
says *"astrology needs no special case — it is a **time-varying inflow
term**, periodic coefficient, predictable, which is what makes it saleable
as an almanac."* **A celestial node is that term pointed at power.**

> ⭐⭐⭐ **This grid is not only mana's — it is the RGO roster's shared
> taxonomy, and it was invisible there.** Axis 2 below (surface · subsurface
> solid · subsurface fluid = **foraged · mined · drilled**) is the general
> access-mode vocabulary for every extractive industry, and the node/inflow
> equation further down (*forage inflow = regrowth, ore inflow = zero*) is the
> general field equation. The RGO census closed the roster without reading
> this pack, and **the whole industrial epoch went missing from `roadmap.md`
> as a result** — a discoverability failure, not a design gap. Cross-indexed
> from [rgo-unification-slate](./rgo-unification-slate.md) § *The grid that
> already exists* (2026-09-25). Read against the roster, the systematic hole
> is **subsurface fluid: nothing in the game has ever been drilled.**

## ⭐⭐⭐ Axis 2 — the access mode (the economics)

**Independent of the physics**, and it is what decides who can have one:

| mode | where it is | who can tap it |
|---|---|---|
| **Surface** — it simply outcrops or seeps | in the open | ⭐ **anyone — this is the foraging case** |
| **Subsurface solid** | in rock | a **miner**; capital + a shaft |
| ⭐ **Subsurface fluid** | under pressure | a **driller**; capital + a well — **and it comes to you** |

> **A mana SPRING is geological × fluid.** Where it surfaces on its own it
> is foraged; where it does not, you drill for it.

⭐⭐ And that pairing writes its own history:

> **The seep → drill arc is the entire history of oil.** Surface seeps were
> known for millennia and used at trivial scale; **drilling made the
> industry.** Free to find, tiny; expensive to reach, enormous.

⭐⭐⭐ Which is also the **frontier → developed** arc: a new settlement uses
what surfaces, a developed one drills. **Nobody has to author the
transition — capital does it**, exactly as it did in reality.

## ⭐⭐ The portfolio, and why capacitors stop being optional

Read the profile column and it is a real energy portfolio: **baseload
(geological), intermittent (dynamic), predictable-variable (celestial),
slow-and-political (biotic).** Which means grid management becomes a
genuine engineering problem whose right answer varies by site.

> ⭐⭐⭐⭐ **Intermittent sources require storage. So capacitors are
> STRUCTURAL, not merely narrative** — and the two justifications reinforce
> instead of competing.

⚠ **This axis pair (terminus condition × access mode) has no code today** —
`ManaNode`/`ManaDeposit`/`ambientMana` are 0 hits across the tree. It is the
finer-grained SOURCE model this pack's Part 3 (deposits, ambient absorption)
and Part 5b (the Confluence) describe more coarsely; a future build should
reconcile the two before authoring nodes.

### Absorbed from mana-economy-slate.md — What this does to the wood question (Doctrine)

# Part 7 — What this does to the wood question

The supply-chain thread asked what is possible with wood alone. Answer
unchanged, but now with an upper storey:

- **Wood alone supports the complete pre-industrial economy** —
  agriculture, distilling, ironworking (via charcoal, ~1900 K), glass,
  pottery, textiles. **Coal is needed for RATE, not capability.**
- ⭐⭐ **Mana does not lift that ceiling, because mana is energy.** A mana
  grid fed by waterwheels is limited by the rivers, exactly as charcoal is
  limited by the forest. **The postulate moves the energy you have; it does
  not make more.**
- ⭐ **What mana changes is PLACEMENT.** Energy can arrive where no fuel
  could be carried — which is why its best consumers are
  **precision-placed, low-quantity, high-value**: ignition, precision heat,
  and ⭐⭐ **refrigeration** (the postulate is bidirectional, priced by
  Carnot, and [freight-slate](./freight-slate.md) already calls
  refrigeration *"the marquee: refrigeration relocates an industry"*).

> ⭐⭐⭐ **Magic does not replace an industry; it relocates one.** That is the
> honest statement of its economic role, and it is the reason a mana
> economy makes the world bigger instead of flattening it.

⚠ **The second bullet's premise is now false** (*"because mana is
energy"* — `arcane-science.md § The second quantity` says the opposite);
the conclusion survives on the extractive footing instead: a grid fed by
DEPOSITS is limited by the deposits the way one fed by fuel is limited by
the fuel. The overall thesis (magic relocates, does not create, an
industry) still holds and is why it is kept as doctrine rather than cut.

### Absorbed from mana-economy-slate.md — open questions

3. ⭐ **Do nodes deplete?** A renewable node has an inflow; a depletable one
   does not. **Both should exist** — it is the same wood/coal choice, and
   having both is what makes siting a real decision. (This extends this
   pack's own Q3 above, which answers the question for a farmed **soil**
   deposit; this is the same question asked of a **grid-power** node.)
4. ⚠ **Does the demurrage rate apply to a GRID, or only to stored charge?**
   3%/month on a wand is flavour; 3%/month on a utility's inventory is a
   business model. *Leans: storage decays, flow does not* — which is a
   real advantage of being on the line and another reason the grid's edge
   matters.
5. **Who may own a node?** It is rent-bearing land, so
   [parcel.md](../../subsystems/parcel.md) title covers it — but a node is
   the single most contested kind of parcel there could be, and the
   **first natural monopoly** the legislature will meet.
6. ⚠ **What is the vehicle?** *"A magic car"* needs a shape: a charged
   `Drivable` drawing from a cell is the obvious one
   ([conveyance.md](../../subsystems/conveyance.md) ships
   Mountable/Drivable), and it competes with a horse on **charge cost vs.
   feed cost** — which is a genuinely nice comparison to be able to make.

---

## Part 7 — Designed to the format

**1–2. What it is / composition.** A **unit-semantics change** plus a
**material property** plus a **processing chain**. No new physics engine.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐ **Mana density on materials** | one new field on the existing closed Material set | **new (a field, not a material)** |
| ⭐ **Mana conductivity on materials** | the second field — what makes a conduit a conduit (decision 6) | **new (a field, not a material)** |
| ⭐⭐ **Soil mana reserve** | a third soil reserve beside `moisture` + `nitrogen`; crops draw it down | **rides [smallholding](../../subsystems/smallholding.md) — same shape as nitrogen** |
| ✳ **`mana` meal tag** | ingestion routes to the mana reserve; the digestion buffer rate-limits it | **rides [metabolism](../../subsystems/metabolism.md) — one more tag** |
| ✳ **Partition + volatility on refining** | fractional passes, a purity ladder, ambient loss (decision 7) | **rides crafting** |
| ⭐ **Magic water / mana crystal** | a bulk material + a solid, with density + `Grade` purity | **new content on shipped substrates** |
| ⭐⭐ **The coupling** | mana → energy at k, one-way, lossy | **`ConduitMixin` already IS this** |
| ✳ **Ambient mana density of place** | drives innate recovery | **new (derived, per place)** |
| ✳ **Refining** | a crafting transform; cost in real joules | **rides [crafting](../../subsystems/crafting.md) + [fire](../../subsystems/fire.md)** |
| ✳ **Deposits** | ownable ground | **rides [parcel](../../subsystems/parcel.md)** |
| ✳ **Mana as a supply commodity** | the third one; ⭐ **volume-tiered** — retail / bulk contract / pipe (Part 5) | **rides [supply](../tails/supply-design-pack.md)** |
| ✳ **Mana-fertilised cropping** | soil mana as a `feed`-able input; the premium rides bioavailability + extended release | **rides smallholding + metabolism** |
| ⭐⭐ **Device mana reservoirs** | impulse → battery (per use) · binding → wired (per second); a lapsed binding when it runs dry | **new — `ChargedMixin` is most of the battery half** |
| ⭐ **TPA retrofit** | teleport as a real Control·Body effect: fare = `mgh` (altitude × mass), **distance-free**; supply per terminal; the `status` seam gains `dry` | **rides [fasttravel](../../subsystems/fasttravel.md) — the status seam + grey light already ship** |

**4. Verbs & affordances.** **No new verbs.** Drawing on a flask is `drink` /
`fill` / the charge economy; refining is `craft`; assaying is `analyze`.

**5. Persisted fields.** Mana density + purity on the substances that carry
it. The caster's reserve already persists.

**6. Seams & dependencies.** Unblocked by nothing — the bottled tier rides
entirely shipped substrate. Deposits want the mining slate's extractive shape;
piped mana wants the power slate's middle tier.

**7. Fault line.** ⭐ **The unit-semantics change + magic water as a traded
bulk good is a near-term slice.** Deposits, prospecting and refining are a
second build. Piped mana is a third and optional.

---

## Part 8 — ✅ What the edit to `arcane-science.md` touched

✅ **Landed 2026-08-11** — every row of the scope table is in
[arcane-science.md](../../arcane-science.md) (the audit log at its head
carries the summary; *no numbers changed*, no second exemption). Fix 1 — the
Terminus hydro decision — is recorded in
[power-utility-slate](./power-utility-slate.md) § Generation — DECIDED.
Still open outside `arcane-science.md`:

2. ⚠ [terminus-city](../../staging/terminus-city.md) needs **the Confluence
   as a mana source** (Part 5b) — the deposit, the six claims, and the fog as
   its visible signature. **Deliberately NOT written yet**, for the same
   reason `arcane-science.md` is untouched: the mana model is a design pack,
   not ratified, and putting it into the city's canon doc first would invert
   the dependency. Land it when the model lands.

---

## Part 9 — ⚠ Dangers

**1. The second exemption, relocated.** The old model's discipline — *"every
time magic appears to need a second exemption, that is a modelling error"* —
must survive the change. **The postulate now breaks locality AND adds one
quantity. That is the whole budget.** A third exemption is still a bug.

**2. ⚠⚠ Losing the checkability.** The current doc's greatest strength is that
a student can recompute every figure against reality. Mana density is
*invented*, so numbers that depend on it are not externally checkable. Guard:
**keep the invented layer thin** — density is one authored constant per
material, and everything downstream (refining costs, coupling losses, heat) is
real physics on top of it.

**3. Pay-to-cast.** If bought mana is strictly better than innate mana, magic
becomes a wallet check. Guard: the innate ambient reserve is a **floor that
always works**; purchased mana raises the ceiling and buys *scale*, never
access.

**4. Two utilities, double the surface.** Guard: they share one supply model
(one failure vocabulary, one `analyze`, one draw/connect grammar), and only
their physics differs — exactly as power, gas and water do.

---

## Part 10 — Pedagogy

- ⭐⭐⭐ **Substitutes vs complements**, lived. Two goods that cannot replace
  each other, one of which is an input to the other's production. That is a
  genuine industrial-organization lesson and it falls straight out of the
  refinery.
- ⭐⭐ **Conserved quantities and coupling constants** — the general structure
  behind charge, chemical potential and the mechanical equivalent of heat.
  Better than teaching thermodynamics twice.
- ⭐ **How a field over-reads its founding result** (Part 1), and what it takes
  to catch it: a source outside the original apparatus. That is experimental
  design taught as a story.
- **Concentration vs creation** — ore beneficiation, distillation, tailings
  losses. Why refining costs energy and why purity is graded.
- ⭐⭐ **Fractional separation**, taught by doing it: partitioning means
  multiple passes and a purity ladder, which is petroleum fractionation and
  isotope enrichment with the serial numbers filed off.
- ⭐⭐⭐ **Resource-dependency politics.** The powerful structurally depend on
  an industry they cannot enter (Part 5). That is oil, that is spice, and it is
  a far better vehicle for the argument than any lecture — because here the
  dependency is enforced by physics rather than asserted by a plot.
- **Bioaccumulation** — crops concentrating a soil constituent is real
  (selenium, iodine, hyperaccumulator phytomining), and it makes soil chemistry
  matter to something a player wants.
- ⭐ **Price floors and arbitrage bounds** — a one-way conversion sets a floor
  that is real but never binding. Most students meet arbitrage as a trick;
  here it is a physical fact with a price consequence.
- ⭐⭐ **Why firms vertically integrate** — the retail → contract → own-the-pipe
  arc (Part 5) lets a player *feel* the moment buying becomes worse than
  building. That is transaction-cost economics learned by hitting it, not by
  reading Coase.
- ⭐⭐ **Factor substitution and mechanisation** — casters-on-the-payroll vs
  bought input is labour vs capital, decided on relative prices, and a farm
  that mechanises over its lifetime for the same reasons real farms did.
- ⭐ **Industrial location** — why a smelter sits at cheap power and imports
  its ore (Part 5b). Terminus is the worked example, and the answer is
  legible from a map.
- **Bioavailability** — heme iron vs iron filings: *the form a nutrient
  arrives in changes how much of it you get.* One of the most useful and
  least-known facts in ordinary nutrition.

---

## Open questions

1. **What is the ambient mana density of an ordinary place, and what sets
   it?** Uniform baseline with rare rich sites, or a field with structure
   (depth, geology, ley-like gradients)? *Lean: uniform-low baseline plus
   authored rich sites* — cheapest, and it makes deposits content rather than
   simulation.
2. **Is ambient absorption capped by the caster's own reserve, or can a mage
   hold more with a vessel?** *Lean: body caps at the band; vessels extend* —
   which is exactly what makes bottled mana worth buying.
3. ✅ **Does a deposit deplete? — ANSWERED.** Yes, and the model already
   ships: soil mana is a reserve of nitrogen's shape and crops draw it down
   (Part 3). Regeneration rate is the remaining dial — the supply pack's
   finite-but-regenerating depth tier, and the rivalry axis it was written for.
4. **What is mana's "second law"?** Energy has exergy degradation; the
   coupling's η < 1 is the obvious analogue, but whether mana itself degrades
   (a stored flask going flat) is unanswered. *Lean: yes and slowly* — it
   makes storage a real problem and gives refiners repeat business, but it
   must not become an upkeep treadmill on a player's own stock.
5. **Does the one-way rule need an in-world explanation, or is it a
   brute fact of the postulate?** *Lean: brute fact* — the postulate is
   already one impossible thing, and asking why it is one-way is like asking
   why charge is conserved.
6. ⭐ **Can a deposit be exhausted permanently, or only drawn down?** Decision
   3 makes mana unmanufacturable, so a *dead* deposit is dead forever — which
   is real (aquifers, oil fields) and gives prospecting genuine stakes, but it
   also means a griefer or a careless neighbour can destroy a shared asset
   irreversibly. *Lean: drawn-down-not-destroyed for shared sources*, with the
   common-pool quota doing the work; permanent exhaustion reserved for
   authored content beats.
7. **Does mana conductivity correlate with electrical conductivity?** Making
   them independent is more interesting (a superb electrical conductor that
   blocks mana is a *shield*, and vice versa) and costs nothing, since both
   are already separate authored fields. *Lean: independent.*
8. ⭐ **Which way does mana partition, and how much leaks?** Decision 7 fixes
   the *shape* (it partitions, with ambient loss); the coefficients are the
   content dial, and they set how many passes a purity ladder needs. Deferred
   to a running game.
