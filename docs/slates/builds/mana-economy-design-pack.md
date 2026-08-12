# Mana economy design pack — mana as its own conserved quantity

> **Status: design + a DECISION RECORD, captured 2026-08-11. Not
> requirements.** Changes one line of the arcane science and follows the
> consequences: **mana stops being energy and becomes a second conserved
> quantity that couples to energy at a fixed, one-way rate.** The change is
> semantic, not numeric — ⭐ *every shipped number stays valid* (Part 0) —
> and it converts magic from a power-transfer technology into a genuinely
> separate economy.
>
> ⚠ **`arcane-science.md` is NOT edited by this pack.** It is coherent as it
> stands; Part 8 lists exactly what a later edit must touch. Half-changing it
> is worse than either version.

See also: [arcane-science](../../arcane-science.md) (**the doc this amends** —
the postulate, Halloway, the price list, the instruments) ·
[magic](../../subsystems/magic.md) (the shipped mechanism) ·
[supply-design-pack](./supply-design-pack.md) (⭐ **mana becomes its third
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

The instinct is that redefining the unit invalidates the numbers. It does
not, because the coupling constant can simply be **k = 1 kJ/τ**.

> **Every shipped value, every worked example, and every derived figure in
> `arcane-science.md` stays arithmetically correct.** A firebolt still spends
> 35.2 τ to deliver 29.9. Conjure-water still works out to ≈ 34 τ and still
> kills you on the fourth casting. The bands are unchanged.

What changes is **what τ means and what can hold it**:

| | Before | After |
|---|---|---|
| τ | *is* a kilojoule | its own conserved quantity; exchanges at k = 1 kJ/τ |
| Direction | identity, so trivially both ways | ⭐ **one-way**: mana → energy only |
| Who can hold it | only a caster's body (as glycogen) | ⭐ **any substance with a mana density** |
| Ceiling | human metabolism — "a quarter of a banana" | what you can source, refine and carry |

That last row is the whole point: the old model capped a mage at their own
physiology, which is why magic had to be economically irrelevant.

---

## Part 1 — ⭐⭐⭐ Halloway was right. The field over-read him.

The founding result currently concludes *"a mana point **is** a kilojoule."*
It is explicitly framed as the field's Joule paddle-wheel — and **that is
exactly where the over-reading is**, because it misstates what Joule showed.

> Joule did not show that heat **is** work. He measured the **mechanical
> equivalent of heat** — a *conversion constant* between two different
> things. The calorie survived as a unit precisely because it measures
> something you measure differently.

So Halloway's experiment stands, unmodified and still founding: cast into a
stone basin of known mass and specific heat, measure ΔT, compare against the
reserve drawn down. **What the basin measures is the coupling constant**, and
the field read a fixed exchange rate as an identity.

`E_delivered = η · k · M_spent`

⭐⭐⭐⭐ **And the reason nobody caught it is the best part, because it makes
the change diegetic rather than a retcon:**

> **You cannot tell a coupling constant from an identity while every mana
> point you have ever measured came out of a human body.** With one source,
> the two hypotheses make identical predictions. It takes mana that did *not*
> come from a caster to distinguish them.
>
> ⭐ **Magic water is the experiment that breaks Halloway.** The discovery of
> a mana-bearing substance is what falsifies the identity — which means the
> in-world field gets a real scientific revolution, and the game gets to
> *stage* it rather than assert it.

This is also better pedagogy than the current version: conflating two
quantities that exchange at a fixed rate is one of the most common and most
consequential errors in the history of science (caloric theory is the
canonical case), and here a student gets to *find* it.

---

## Part 2 — The two quantities

| | Energy | Mana |
|---|---|---|
| Conserved | ✅ globally and locally | ✅ globally; ⚠ **locally violated by the postulate**, as before |
| Unit | J | τ |
| Stored in matter as | chemical, thermal, electrical, nuclear | ⭐ **mana density** — a material property |
| Made from inputs | ✅ burn fuel | ⛔ **never** (decision 3) |
| Converts to the other | ⛔ | ✅ **one-way**, at k, through a coupling |

The postulate is otherwise **unchanged**: a caster relocates between their own
body and one chosen point, in either direction, without a medium. The caster
is still always one endpoint. **Magic still never creates matter** — mass is
not mana either, so conjuration stays *collection* and the dehumidifier
analysis survives intact.

⭐ `ConduitMixin`'s coupling efficiency stops being an analogy and becomes
**the actual mechanism**: the coupling is where mana becomes joules, and its
losses go where losses go — waste heat.

### ⭐⭐ Decision 6 — nonlocality is ENERGY-ONLY

The postulate grants relocating **energy** between a caster's body and a
chosen point. It says nothing about relocating *mana*, and **extending it to
mana would be a second exemption** — which the discipline clause forbids.

> **Nonlocality is energy-only. Mana moves by CONTACT and CONDUCTION, the way
> charge does.**

This is not a restriction bolted on; it is the postulate read honestly. And it
preserves everything shipped:

- ✅ **`ConduitMixin` is unchanged.** Pushing your own mana into a wand you are
  *holding* is conduction through contact — no postulate required, the way
  touching a wire needs no postulate.
- ⛔ **Ruled out:** pulling mana out of ore across the room, drawing from a
  flask you are not touching, or separating mana from its medium by will.

So materials carry **two** fields, not one:

| Field | Answers |
|---|---|
| **mana density** | how much this substance *holds* — the store |
| ⭐ **mana conductivity** | whether it *passes* mana on contact — what makes a conduit a conduit |

Both are fields on the existing closed Material set (decision 4), so neither
mints a material.

### ⭐⭐⭐ The corollary law: magic is good at ONCE and terrible at HELD

Kell's Partition already says every magical act is an **impulse** (a delivery,
after which the world takes over) or a **binding** (a state held away from
equilibrium, continuously topped up). Voss Decay already says why a binding
costs. **Nobody has drawn the economic conclusion**, and it is the sharpest
thing in this pack:

> ⭐⭐⭐⭐ **Magic writes initial and boundary conditions, never laws — so it
> is excellent at what happens ONCE and terrible at what must be HELD.
> Structure beats sustained assertion, always.**

A concrete dam is a one-time capital cost and then gravity works for free; a
magic dam is an operating cost that never ends. The same verdict falls out
every time: iron lock over magic lock, lamp over glowlight for permanent
light, furnace over firebolt for sustained heat.

Which hands magic its **actual comparative advantage**, cleanly and without
special pleading: **impulse, portability, and places you cannot build.** A
cave, a battlefield, a moment of need.

⚠ This is a **third independent reason magic never industrialized** — and the
most durable one, because it is structural rather than a matter of scale. It
belongs in `arcane-science.md` beside Kell's Partition (Part 8).

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

⚠ **The anti-chug guard already ships:** metabolism's **digestion buffer**
releases a meal over time rather than instantly, so mana potions cannot be
spammed mid-fight. No new rate limit needed.

> ⚠ **Recovery rate now depends on WHERE YOU ARE** — ambient mana density is
> a property of place. That is a new and good mechanic (it gives geography
> teeth and explains why some sites are worth holding), and it is a real
> change to how `CasterMixin` recovery reads.

### ⚠ What this does to "recovering is exercise" — mostly preserved

The current doc's sharpest physiological result is that refilling a reserve
costs ~300 W, *"about the metabolic cost of walking,"* and that **a caster who
wants to refill fast should eat, not meditate.** Under one-way coupling the
body cannot make mana from food, so that line inverts — which would be a real
loss.

**The split saves it, and arguably improves it:**

- The **mana stock** refills by ambient absorption (so meditating in a rich
  place *is* how you refill — the traditional magic answer, now rule-bound).
- The **coupling work is metabolic** — pushing mana through the coupling costs
  the caster joules, which is where the heat and the hunger come from.

> ⭐ So *"recovering is exercise"* becomes ***"casting** is exercise"* — and
> the signature result survives untouched: **the mana bar is still not the
> danger meter**, four conjure-waters is still +4.5 K, and hyperthermia is
> still what kills you.

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

Under the old identity, electricity and mana were **perfect substitutes** —
one price, one market, and the cheaper input wins everywhere. That is why the
current doc has to conclude magic never industrialized: coal beats a caster
100:1.

⭐⭐ **The new industrialization answer is structural and much better:**

> **You cannot build a mana plant. You can only own a mana deposit.**

Magic stays scarce because its input cannot be manufactured — not because a
caster is a bad generator. That reason survives any future rebalancing, and it
makes mana the **land** of the magic economy.

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

### ⚠ One fork left open: is the Confluence a deposit?

The lore already calls it the **"sacred head,"** and sacredness attached to a
specific place is usually fiction marking a real anomaly.

| Option | Buys | Costs |
|---|---|---|
| **No deposit** | cleanest economic geography; the frontier matters | leaves the Confluence's sacredness unexplained |
| **The Confluence is one** | contested sacred site *inside* the city — church, University and state all with claims | weakens the import story |
| ⭐ **Both** — real but **small and protected**, so it can never supply industry | explains **why the founders settled there** while keeping the economy import-dependent | one more thing to author |

*Lean: both.* **Owner's call — not decided here.**

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
| ✳ **Mana as a supply commodity** | the third one; ⭐ **volume-tiered** — retail / bulk contract / pipe (Part 5) | **rides [supply](./supply-design-pack.md)** |
| ✳ **Mana-fertilised cropping** | soil mana as a `feed`-able input; the premium rides bioavailability + extended release | **rides smallholding + metabolism** |

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

## Part 8 — ⚠ What a later edit to `arcane-science.md` must touch

Listed so the edit is scoped rather than exploratory. **Not done here.**

| Section | Change |
|---|---|
| **The Postulate** | add the second quantity; the locality break is unchanged; ⭐ state explicitly that **nonlocality is energy-only** — mana moves by contact (decision 6) |
| ⭐⭐⭐ **Kell's Partition** | **ADD the economic corollary** — magic is excellent at ONCE and terrible at HELD; structure beats sustained assertion; magic's comparative advantage is impulse, portability, and places you cannot build (Part 2) |
| ⭐ **Halloway Equivalence** | **reinterpret, do not delete** — `E = η·k·M`; the basin still measures; add the over-reading and why it survived (Part 1) |
| **Units and quantities** | τ is its own unit; k = 1 kJ/τ; ⚠ **no number changes** |
| **The caster's budget** | the reserve is ambient-sourced, not glycogen; recovery depends on place |
| ⚠ **"The power level, and why it is canon"** | **the industrialization argument must be replaced** — deposit-not-plant (Part 5) |
| **The price list** | costs stay; the payment path is now through the coupling |
| **Conjure-water** | ✅ survives unchanged — still collection, still real work, still heat-limited |
| **Voss Decay, the Reeve Line, Tarn's Rule** | ✅ untouched — they are about coupling and dissipation |
| **The audit log** | re-run it; the doc asks for this before new numbers land |

⚠ **And one fix outside `arcane-science.md`:**
[power-utility-slate](./power-utility-slate.md) lists *"who owns supply?"* as
genuinely open, but **Terminus's hydro was decided in conversation and never
written down.** Record it there — everything in Part 5b leans on it.

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
