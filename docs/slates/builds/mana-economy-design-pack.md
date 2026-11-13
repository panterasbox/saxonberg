# Mana economy design pack — mana as its own conserved quantity

> ⭐⭐⭐ **2026-11-11 → Part 13: the field settled with the owner** — mana is
> primordial charge in crustal rock (zone grades + seeded deposits), moving
> by contact down level differences like warmth; one partition rule for
> every phase change; fishery-shaped depletion; the performance rules; the
> warmth metaphor and eight demonstrations.
>
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
> dry — `'binding'` is declared on `DrawMode`, nothing reads it) · ⭐⭐ **the
> FOURTH faculty band — `conductance`, the pipe the faculty does not model
> (Part 7)** · ⚠ **re-pricing `transform` as expensive rather than absent, and
> the `PriceList.ts` docstring that cites 10⁶ over a table reading 10³
> (Part 7)** · sited mana
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

## Part 7 — ⭐⭐⭐ The SCALE problem, and the band that is missing

Added 2026-10-09, from a conversation that started as *"every cool spell idea
gets refuted by the physics"* and found that two of the refutations are
numbers rather than laws.

### ⚠⚠ First, a correction to the record

⛔ **Mana was proposed in that conversation as its own RGO** — a reservoir
with a recharge rate, gathered by a new act. **Wrong, and it contradicts
decisions 3 and 4 already on this page**: *mana is EXTRACTIVE, found in
places*, and *only some substances hold it — **a new field on the existing
closed Material set, not a new material.*** The user's correction, verbatim:

> *"Mana isn't really an RGO. It's more that mana has a material form or forms
> that **existing** RGOs can gather as a normal resource. So magic is its own
> R but not its own O — unless you think there should be a mana specific
> operation, but that feels like it fails on the same thinking why we didn't
> do 'magic damage' and 'magic health'. **What are you really getting except
> an exact copy of a thing that already exists as a second concern to
> manage?**"*

⭐⭐⭐ **That is the duplicate-ontology test and it should be the standing
guard for anything magical**: a magic *resource* is fine, a magic *operation*
is a parallel system every author then has to learn twice. The tell in my own
proposal was that it required a **new act** (`accumulate`) beside `hew`,
`fell`, `harvest` and `tap` — and it would have been a worse version of all
four.

### ⚠⚠⚠ And a correction to what I told the user magic cannot do

I said *"magic cannot create anything, only move it."* **`PriceList.ts`
disagrees:**

```
perceive: 0.5 · destroy: 1 · create: 2 · control: 3 · transform: 1000
```

⭐⭐ **`create` is the second-cheapest verb in the game.** The expensive one is
**`transform`** — and the five verbs already draw the distinction I was
failing to draw: **making a thing is cheap; changing what a thing is MADE OF
is not.** The doctrine was never as restrictive as I was reporting it.

### ⭐⭐⭐ The scale problem, stated properly

The user's objection, and it is a real structural one that no content fixes:

> *"A matter 'creation' spell that rearranges things subatomically costs so
> much more than your generic force bolt — that means powering one spell makes
> the other either irrelevant or extremely overpowered."*

**Correct, and unanswerable in one currency.** A supply that can pay for a
10⁶ working makes a 10⁰ bolt free; a supply that makes the bolt meaningful
cannot reach the working. There is no single price list that spans 10⁷.

⭐⭐⭐ **But the premise is wrong, and the 10⁶ guards ONE thing only: changing
what something is made of at the atomic level.** Almost nothing anybody wants
from magic requires that.

| the wish | what it physically is | scale |
|---|---|---|
| water out of the air | collection + phase change | **latent heat — kJ** |
| a wall of ice | phase change | **kJ** |
| fire, heat, ignition | chemical | **kJ–MJ** |
| shaping stone, hardening steel | chemical / structural | **kJ–MJ** |
| growing food | carbon fixing — **plants do it on sunlight** | **eV per bond** |
| force, motion, lifting | mechanical | **joules** |
| **lead into gold** | **element change** | ⚠ **GJ** |
| matter from nothing | *mc²* | ⛔ absurd |

⭐⭐ **So the useful band spans ~10³ — the difference between a candle and a
bonfire — and one currency handles that comfortably.** The ruling is not
*magic cannot create*; it is **magic cannot change what a thing is made of**,
which forbids exactly the one item (alchemical gold) that *should* be a
legendary multi-month works.

### ⭐⭐⭐ A spell and a WORKING are different objects, priced in different currencies

The second half of the answer. Pricing a force bolt and a transmutation in one
list is the error; they are not the same kind of act.

| | the act | the limit | who | timeframe | priced in |
|---|---|---|---|---|---|
| **a spell** | you deliver a burst | **your throughput** | one caster | seconds | **conductance** |
| **a working** | a crew sustains a draw | **supply × duration** | a ritual, or an apparatus | hours to months | **tonnes of feedstock** |

⭐ **Deliberately non-interoperable, bridged only by equipment** — nobody buys
a power station in dry cells and nobody runs a lamp off a substation without a
transformer. And **Kell's Partition already says half of it**: *an impulse
device draws per use off a stored charge; a binding device draws per second off
a standing supply.* The doctrine distinguished the two and then kept them in
one price list.

⭐⭐ **That is also what makes the great work content rather than a refusal.**
100 GJ stops being *impossible* and becomes *"how many tonnes of ore, at what
purity, from whom, hauled how far"* — which is Part 4's chain, an economy, and
therefore other players.

### ⭐⭐⭐ THE FINDING: the faculty models the tank and the refill, and not the PIPE

The user's sharper worry: *"is your personal mana capacity going to be
meaningful?"* if a working needs GJ and a body holds 80 kJ — a caster becomes a
socket for the ore in their pack.

**It is meaningful iff the limiting quantity is POWER rather than ENERGY.** And
`lib/magic/Faculty.ts` ships three bands and none of them is that:

| band | what it is | |
|---|---|---|
| `depth` | **capacity** — 80/120/180 pt | the tank |
| `serenity` | **recovery rate** | the refill |
| `composure` | **resistance to being patterned by another** (the Reeve Line, `C = C_band·(f + (1−f)·m)`) | ⚠ a *defence* stat, **not** a spend limit |

> ⚠⚠ **There is no discharge-rate cap anywhere.** The faculty models how much
> you hold and how fast it comes back, and says nothing about how fast you can
> **spend** it. (The doc's own line — *"depth × serenity are orthogonal: a
> deep-slow mage and a shallow-fast one"* — is the two axes it does have.)

⭐⭐⭐ **And the concept already exists, on the wrong host.** Decision 6:
*mana moves by contact and **conduction**, like charge*, adding **mana
conductivity as a material field.* **A caster is a conductor whose conductance
is unmodelled.** So the proposal is not a new concept — it is an existing,
already-decided material field reaching the one host that lacks it:

> ⭐⭐⭐ **A fourth faculty band: conductance — how much mana you can pass per
> second.**

**What it buys, all of it falling out rather than needing balance:**

- ⭐⭐ **A huge external supply no longer makes you stronger — only supplied.**
  Hauling a tonne of concentrate extends your afternoon; it does not raise your
  ceiling. **The "biggest battery wins" problem dies at the root**, which is
  the user's question answered.
- ⭐⭐ **The great work becomes impossible for a person even with infinite
  fuel**, because no faculty can pass GJ/s. So it needs **conductors in
  parallel — a ritual — or a non-living conduit — an apparatus.** *The
  mechanism generates the ritual*, instead of the ritual being flavour, and the
  apparatus is the epoch ladder.
- ⭐⭐⭐ **The failure mode is not invented: a conductor over its rating
  HEATS.** `electricity.md` already ships the Ohm's-law core and
  `SustainedShock` on a different host, and `thermal` ships the consequence.
  **A caster who overdraws burns, by the same arithmetic as a wire** — and
  ⚠ **not via `composure`**, which an earlier draft of this proposal wrongly
  reached for.
- ⭐ **A novice with a rich supply is dangerous to himself, not to you** — which
  inverts the usual power fantasy and is a better first lesson.
- ⭐⭐ **Two shipped numbers already set two regimes.** Recovery is **180 W**; a
  faculty that can empty its reserve in a few seconds bursts on the order of
  **20 kW** — a ratio of ~**100**. So **combat is burst-limited and sustained
  work is supply-limited**, which is Kell's impulse/binding split arriving as
  *arithmetic* rather than as a rule. ⚠ The 20 kW is inferred, not shipped; the
  ratio wants deriving.

### ⚠⚠ Two rulings that are a NUMBER, not the physics

The distinction the user asked for — *"we can argue about whether and to what
extent those constraints should exist"* — and it is checkable.

**1. `PriceList.ts`'s docstring cites a result it does not implement.** The
comment reads *"`transform` is prohibitive, and that is the point: material
transformation is priced out by **~10⁶** (chemical bonds in eV against…)"*.
The table reads `transform: 1000`. ⚠⚠ **10³, not 10⁶** — and `VERB_LABOUR` is
a **labour** multiplier feeding a derived rarity, not a mana cost at all. So
**the transform ruling is enforced by a rarity knob wearing the physics'
clothes**, and the effect is to make the verb **dead rather than expensive**.
*Dead is the loss.* The physics says *unaffordable to a person*; the price list
says *unavailable to anyone*.

**2. The specification veto is a difficulty axis used as a prohibition.** On
body transformation `arcane-science.md` runs two arguments — the energy is
prohibitive **and** *"the specification is worse."* The second does independent
work, and **specification difficulty is exactly what a skill ladder is for.**
Using it as a second veto converts a hard problem into an impossible one.

⭐ **Three of the constraints in this area are physics and earn their keep:**
*once is cheap, held is dear* (it decides design questions without a judgement
call — lamp over glowlight, iron lock over held lock, ward as a utility bill) ·
**the one-way coupling**, which is the quiet load-bearer, because **it is what
makes magic an ECONOMY at all** (if a waterwheel made mana, mana would be free
and there would be nothing to mine, sell, steal, tax or run out of) · and
**site-dependent ambient recovery**, which gives magic a geography. **Two are
numbers somebody set once.**

### Open, from this pass

1. ⭐⭐ **Does the fourth band ship as `conductance`?** It is the user-facing
   fix for *"is my capacity meaningful"*, and the one new field in this whole
   pass.
2. **Derive the burst ratio** rather than asserting 20 kW — from a force
   bolt's intended effect, backwards.
3. **Re-price `transform`** as *expensive* rather than *absent*, now that Part
   4's chain can supply a works; and decide whether `VERB_LABOUR` should carry
   the physics claim at all, or whether the claim belongs on the mana cost.
4. **Does conductance correlate with a material's mana conductivity?** Open
   question 7 already asks the electrical/mana version; this is the body one.

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

**The canon.** [terminus-city](./eternal-university-drafts-slate.md#2-terminus-the-city): two rivers
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

[terminus-city](./eternal-university-drafts-slate.md#2-terminus-the-city) gives the city a signature:
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

2. ⚠ [terminus-city](./eternal-university-drafts-slate.md#2-terminus-the-city) needs **the Confluence
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

## Part 11 — ⭐⭐⭐ The 2026-11-07 conversation: never forbidden, only priced **[the owner — in principle]**

Out of the prison design (the custody summons needed a third-party teleport, which `magic.md` bans
structurally). The owner: *"That magic doc is terrible. Every time we think of something fun we want
to do with magic the doc says it's illegal, and I have no idea how or why that even got decided. The
one thing I have allowed is scaling mana costs for things, but the game needs to provide the mana for
them to fire or they may as well not exist. That means capacitors and other forms of mana
generation."*

### 11a. The doctrine — every ban becomes a price, a skill, a defense, or a supply chain

| keep — physics that prices or makes an economy | convert — prohibitions |
|---|---|
| cost scaling (kJ, `m·g·Δh`, `lint:spell-cost`) — *the one thing allowed* | `transform: 1000` — a rarity knob that makes the verb **dead**, not expensive (Part 7 found it) → a real price; a great working |
| η ≤ 1 | *"the specification is worse"* — a difficulty used as a veto → a skill ladder |
| the **one-way coupling** — what makes mana mineable, sellable, stealable, taxable | *"a caster cannot teleport a third party"* (structural, `relocate` lands on the actor) → **specification** (you must know them — the belief store) **+ the target's composure** (the Reeve Line, already shipped) |
| *a spell uses the same mechanism as the mundane act* (the owner's duplicate-ontology test) | *"may as well not exist"* — **nothing supplies mana** → the supply build |

⚠ **Not yet written into `arcane-science.md` or `magic.md`** — *"it all depends on the mana economy,
and how we handle scaling costs that doesn't just turn into costs-that-matter and costs-that-don't."*
⭐ **Timing:** magic is an unbuilt RGO, and RGO unification runs only once every RGO is in place (*a
pass run with gaps unifies around the easy cases*), so the mana RGO is **designed before unification**,
beside whaling.

### 11b. Scaling — a linear ledger and a logarithmic ladder

- **The quantity is linear**: conserved, so it adds. Costs are linear in physical work.
- **The range spans orders of magnitude**, so the scales people read are **logarithmic**: a faculty or
  competence band is roughly **a decade** of throughput (the conductance band, Part 7) or of
  specification. At any band, what is within about a decade is what you think about; far below is
  trivial and honestly so (an electrician does not budget a AA battery); far above is a working.
- **Specification is information** — one person among N is log₂ N bits (Landauer is already course
  content).

### 11c. ⭐⭐⭐ The primitive — mana behaves like moisture **[the owner: "mostly fine"]**

*"The iron isn't magic, the mine is — that would fit more the farming model."* The **locality carries
the field**; things become charged by **residing** in it, the way wood settles to an equilibrium
moisture content set by a room's humidity (sorption isotherms; `MoistureMixin` and forestry's seasoning
ship it):

| moisture | mana |
|---|---|
| humidity | **the place's field** — a seeded scalar field (like Deposit or GroundCharacter), its sources the node types of Axis 1 |
| hygroscopicity | **capacity** (material) — borrowed from the real **dielectric constant**: water about 80, rutile about 100, **titanates in the hundreds to thousands** (the capacitor ore — real capacitors are made of them) |
| moisture content | **charge** (instance state) |
| the time constant | **residence time** — geological for ore in place, decades for a tree, a season for a pig |
| drying away from the source | stores **leak** toward a weaker ambient field (Voss decay) |

Living things settle faster and **concentrate** what they eat — hyperaccumulation in plants (Part 3's
phytomining), **biomagnification** up food chains (so the long-lived apex predator — the **whale** —
is the richest biological store). Processing passes lose some (retention factors); time decays it.
⭐ **Where in the body (ruled 2026-11-09):** a store holds charge by its dielectric, and **fat holds
almost none** (ε ≈ 2–3), against ≈ 80 for the water-rich blood and muscle. So a whale's charge is in
its **fresh tissue**, and the try-pot boils it off: **rendered oil is dead oil**. Its value is in
working the carcass fresh, at sea or on ice. Capacity also depends on **geometry** (`C = εA/d`), which
is why an electric organ is a stack of thin plates. See the
[organism-biology slate](./organism-biology-slate.md) § 12.

- **What makes a magic mine magical: two factors** (drilling's precedent) — a **field** at the place, and
  **rock that can hold it**. A titanate seam in a strong field is saturated; iron in the same field holds
  far less.
- ⭐⭐ **Conduction is permanent; only stores are spent** **[the owner]**. *"Having to keep the sword
  around some other field just so it works is not great."* The real analogue is **doping**: ore from a
  magic mine carries mana-bearing inclusions fixed into the lattice at the smelt, so **magic iron
  conducts forever, anywhere** — conductivity borrowed from the real electrical table (silver, copper,
  then iron). Structure is permanent; contents are consumable.
- ⭐⭐ **A mana-bearing good is used only through its own ordinary use.** No good gains a new use for
  being magic. **Magic bacon in a sword socket fails three numbers** — capacity (fat's dielectric about
  2–3), stability (it rots on spoilage's clock, and the charge leaks as tissue breaks down), fit (the
  socket `accepts` a rigid stone). Magic bacon is **eaten** — a slow refill, bounded by stomach capacity,
  saturable absorption (Michaelis–Menten) and the tank. ⭐ **Bodies run on food; devices run on
  stones** — biology makes good fuel and bad batteries.
- **No new elements.** The periodic table is real chemistry and the hard rule caps the invented budget;
  decision 4 already said *a new field, not a new material*. Magic iron is iron with a provenance, told
  apart only by **assay** (so counterfeits exist).

### 11d. Across every RGO — the shared contract

| RGO | how the field gets in | charged output | its own use carries it |
|---|---|---|---|
| mining | geological residence | ore — ⭐ the **titanate seam** | smelted (doped conduits), set, refined into stores |
| drilling | deep fluids in a strong field | brine, crude | separated, partitioning at every cut |
| water | flow through the field; high capacity | ⭐ **mana springs**, diluted downstream | drunk, potion solvent |
| farming | a fourth soil reserve, drawn down by crops | crops — hyperaccumulator species | eaten, fed on |
| ranching · taps | charged feed + residence | meat, fat, milk, eggs, wool | eaten (bacon), rendered (tallow) |
| apiculture | bees forage **other people's land** | honey **averaging the field over the forage radius** | eaten, mead |
| forestry | decades of residence | ⭐ **heartwood**; seasoning may partition some out with the water | built, carved, burned |
| fishing · whaling | aquatic biomagnification | ⭐⭐ **fresh whale tissue**: blood, muscle, the spermaceti organ. Oil and blubber hold little (fat's ε) | worked fresh or iced. Rendering boils the charge off |
| sericulture | worms on charged leaf | silk, holding little | worn |
| potash · ash | burning partitions it, ash vs smoke | lye | its usual uses |
| magic's own rung | the caster settles toward the field | the reserve | casting |

⭐⭐ **Every row needs the same five things** — a **field** at the place, a **capacity** on the material,
a **residence time**, **uptake and concentration** for the living, and **partition and leakage**. Mana
needs no RGO contract of its own; it **rides the one every RGO already shares**. That is an input to
[RGO unification](./rgo-unification-slate.md): each RGO should answer those five without special-casing.

### 11e. Devices — three roles, runes derived **[the owner: "fine for now"]**

An enchanted item is an **assembly** of three roles: the **conduit** (a doped blade — throughput), the
**store** (gems in sockets — the shipped `Slotted` / `fitsSlot` substrate — how much), the
**specification** (runes, `carve` — what it does). **Most Tangibles have no magic version**: a thing from
a magic place carries a charge through its ordinary use and nothing more; it becomes a device only with
all three roles.

A rune works where three facts line up: it **names an effect from the closed roster** (*an Effect
exists iff a gated Api does the work*), a **store reaches it through a conduit**, and it **fires on a
verb the item already affords** (strike, worn, drink, open). Compatibility is derived, never a
rune-by-item table.

⚠ **The owner's honest critique, kept:** *"You're just burying the problem a layer deeper — the trigger
is a verb describes a space in the hundreds still … the procgen also handwaves 'pick an effect whose
channel fits that verb' … but I expect the spellbook to grow organically, and we can come back to this
when we actually have effects to talk about."* Rune × verb × effect fit is **deferred until the effect
roster grows**.

### 11f. Open, from this conversation

- Write the 11a doctrine into `arcane-science.md` and `magic.md` (with the mana supply design).
- Derive the shipped numbers again (180 W recovery, 80/120/180 depth) — never derived the first time.
- Does the place's field deplete when its charged goods are removed, or is it a standing source?
- The supply build itself — capacitors, generation, the grid (this pack's *Left* list).
- Rune × verb × effect fit, when the roster has grown.

## Part 12 — ⭐⭐ The stone list, and gems' two values (2026-11-07) **[the owner: "I buy this"]**

By Part 11c's rule (capacity borrowed from the real dielectric constant):

| gem | mineral | dielectric constant | as a store |
|---|---|---|---|
| quartz, amethyst | silica | ~4.5 | weak |
| diamond | carbon | ~5.7 | **poor**, for all its beauty |
| emerald, topaz | beryl, topaz | ~6–8 | modest |
| ⭐ ruby, sapphire | corundum | ~9–11 | **the best of the classic gems** |
| ⭐⭐ rutile; rutilated quartz (*Venus hair*) | TiO₂ | ~90–170 | an enchanter's stone |
| ⭐⭐⭐ **fabulite** | strontium titanate | ~300 | ⭐ **sold in the 1950s as a fake diamond** |

⚠ Titanite (sphene) and benitoite are titanium gems and likely strong. Their values are unverified.

- **Two value systems:** **beauty**, priced in zorkmids by the jewelry market, and **capacity**, from
  the mineral, the mass and the field it sat in. Diamond is high in the first and low in the second,
  rutile the reverse, ruby good at both. ⭐ **The best mana stone is the fake diamond.**
- If capacity depends on **geometry** (open, `C = εA/d`), enchanters cut **layered plates rather than
  brilliants**, a *plate cut* a jeweler would call ruined.
- **Charge stays invisible to ordinary senses.** That's drilling's precedent (*whether a trap is charged
  has no reading*). Only an instrument, an assay or a mana sense tells you, which is what gives
  counterfeits, assayers and the hallmark their meaning
  ([spellbook-slate](./spellbook-slate.md) § 7a).
- **The vocabulary** (stores, conduits, specifications, places, acts) is in spellbook § 7a and the size
  build's requirements.

## Part 13 — ⭐⭐⭐ The field, settled: where mana is, how it moves, how a player learns it (2026-11-11) **[the owner: "this fits"]**

Captured from a conversation with the owner after controller-liquidity merged. It started as *"we
have a design that works like moisture but I don't know what that means for content"*. Each answer
below survived an owner challenge, and the challenges are kept because they are why the answers have
the shape they do. It refines Part 11c (*mana behaves like moisture*). The "place's field" in 11c is
now stated precisely: **it is a level of matter, never a property of empty space.**

### 13a. Where mana is: in rock, and only because of matter

> **The owner:** *"the place is made of space, it's a vacuum unless you fill it with something —
> what are we filling it with?"* … *"if it doesn't come from space, it comes from matter. matter means
> a Tangible Thing. so what is the thing that's radiating the mana?"*

- **The source is the ground.** Every Location already mints a floor Thing at `postRegister`, with its
  material set by the ground pack's five-rung ladder ([ground.md](../../subsystems/ground.md)). That
  rock holds **primordial** mana: nobody makes it (decision 3), and the world's total was fixed when
  the rock formed (decision 1). It leaks out slowly into whatever touches it.
- **Primordial sources are solid, and that is derived, not chosen.** A liquid source flows away and
  mixes until it matches its surroundings. A gas holds almost nothing (capacity ≈ 1). Only rock stays
  put over geological time, so only rock can still hold the original endowment. Anything else can be a
  **temporary** source (a pail of spring water, a whale carcass) that gives its charge back as it sits.
- **Every rock holds mana, in proportion.** How much a rock *can* hold is its capacity (the dielectric
  constant, Part 11c). How much it *does* hold is its **grade**, seeded by geology the way ore grade
  already is ([mining.md](../../subsystems/mining.md)'s Deposit field). Country rock is low-capacity,
  so a weak background. A titanate seam is high-capacity, so a strong peak. That is *why* the peaks
  are seams.
- **Why the crust and not the core.** *(The owner: "why is it at the surface at all instead of
  concentrated at the planet's core?")* Mana doesn't sink. It is carried by matter, and gravity acts
  on the carrier. When the young planet separated, dense iron sank and light oxide and silicate melts
  floated. By the separation rule (13d, *a separation partitions charge by capacity*), the iron took
  little (low capacity) and the oxides took most of it. **The core is nearly empty and the crust holds
  it.** That is exactly why Earth's uranium and thorium sit in the crust and not the core.
- **Space has almost none. Meteorites carry other worlds' endowment.** *(The owner: "this means
  there's no natural mana in space?")*
  - Empty space has almost no matter to carry charge, and **a vacuum does not conduct**, so space is an
    insulating shell. A planet is a sealed mana thermos, which is why it still holds its endowment.
  - Every rocky body separated the same way and has its own crustal grade (the
    [worlds design](./worlds-slate.md) authors each world's).
  - Celestial mana arrives as **matter**: a meteorite is a piece of another body's crust, falling with
    its own charge. ⭐ The **strike site** is a node, and meteoric iron the classic blade, now with a
    derivable reason. *(The owner: "I like the meteorite idea.")*
  - ⚠ **The "celestial" node kind (Axis 1) is reinterpreted.** Mana cannot cross space at a distance
    (decision 6: nonlocality is energy-only), so a conjunction cannot *beam* mana. A celestial node is
    either a **strike site** or **a source whose flow the sky modulates by ordinary means**: tides
    pushing water through a seam, the calendar timing a flow.

### 13b. How it moves: one rule, no toggle

> **The owner:** *"water can't both be radiating and absorbing mana — you have to decide or have some
> toggle switch that different bodies set to in or out."*

**There is no toggle, because every body both gives and takes all the time. The net flow runs from the
higher level to the lower, exactly as heat does.**

```
net flow between two touching bodies = conductance × (level_A − level_B)
level of a body                      = its charge per kg ÷ its capacity
equilibrium charge                   = level × capacity
```

- **Water at the seam** takes charge (the seam is higher). **The same water downstream** gives it to
  the lower banks. The direction comes from the two levels at that moment.
- **Things settle to the same level, not the same charge.** A titanate and a quartz pebble side by
  side reach one level, and the titanate holds many times the charge. That is why water (≈ 80) and
  titanates are the good stores.
- **The rate is the contact's conductance**, which is *mana conductivity*, the second material field
  already on record (decision 6). Silver and doped iron are fast; wax, glass and vacuum are almost nil.
  The time constant is capacity ÷ conductance. Two consequences follow:
  - a gem sealed in a vacuum flask keeps its charge anywhere: **the mana thermos**, an industrial-epoch
    store;
  - **a binding is cut by grounding**, which the bestiary already decided
    ([bestiary-slate](./bestiary-slate.md)).
- **It moves by contact, never by radiation** (decision 6). The ground touches everything in a place
  (the walls, the water running through it, whatever is set on the floor), so the place's level is the
  ground's.
- ⚠ **Not geothermal.** The heat analogy describes how mana *flows*, not where it comes from. Nothing
  generates mana; the endowment has only been redistributing since the rock formed.

### 13c. Sources: there is no "ambient", only sources at two scales

> **The owner:** *"temperature is moved by an energy source — it's not actually ambient."*

| | diffuse source | concentrated source (a node) |
|---|---|---|
| what it is physically | a region's country rock, weakly graded | an ore body: a seam, often a titanate |
| authored as | **one grade on a zone or locality's ground**, inherited down through the zone field inheritance that already ships (`zone.lookupField`); default 0, so the ordinary world needs no edit | **a seeded deposit** on the ground, mining's Deposit shape: data on the ground, never a loose Tangible, until somebody hews it |
| inflow and recovery | large and fast (a whole region) | set by kind; a seam never refills |

- **The authoring story, all of it:** *paint* grades on a few zones (which regions run high), *drop*
  deposits for the peaks, and everything else derives (water, ore, crops, beasts, a caster's recovery).
  An author never writes charge onto an item. *(The owner: "some areas just want the background field
  without having to author a big massive underground lump" — answered by the zone grade.)*
- **A mana spring is ordinary water.** *(The owner: "is it the water or what?")* The water is the
  **carrier, never the source**. A spring is water whose path underground passes through a charged
  seam. The seam is the source, the spring is where its charge comes out, and the creek is that charge
  thinning downstream (the watershed's existing dilution). That is real mineral-spring hydrology. A
  holy well blessed for some other reason is the bespoke case, with its own row; it is not the default.
- **Lost mana returns to the ground it touches.** Gas cannot hold it, so anything boiled, burned or
  smelted off goes into the contacting ground. Over the years the ground around refineries and
  smelters rises. Conservation decides this; no taste is involved.

### 13d. Phases: one quantity, three rules, across every RGO

> **The owner:** *"solid matter in all forms, particulate and lumped, liquid matter, and gas if it
> exists — and how phase changes work exactly: condensation or crystallization."*

Mana is carried by matter (decision 4), so "mana in a phase" means what the **charge** does when its
carrier is lumped, particulate, liquid or gas, and when the carrier changes form. The quantity is
**specific charge** (per kg), capped by capacity:

| form | where the number lives |
|---|---|
| lumped solid (an ingot, a log, a cake of black salts) | a stamp on the instance, like moisture and freshness |
| particulate (ore heap, flour, ash, sand) | the same stamp, per stack (`Stackable`) |
| liquid (spring water, lye, oil, molten metal) | one more field on `BulkPayload` (bulk.md: *subsystems declare their own fields onto it*) |
| gas (steam, smoke, fume) | **nowhere** (rule 3) |

1. **Conserved by mass.** A split keeps the charge per kg; a merge or mix takes the mass-weighted
   average.
2. **Any separation partitions charge by capacity.** This is the real segregation coefficient, the
   law behind zone refining. One function covers every process:

   | process | the charge | the real analogue |
   |---|---|---|
   | melting / freezing | carried across; any excess over the new phase's capacity is released | latent change |
   | **crystallization** (salt from brine, potash in the iron pot) | the crystal takes *k ×* the liquor's concentration. **Recrystallizing strips it or concentrates it** (decision 7: a skilled trade) | zone refining, recrystallization |
   | evaporation / boiling down | vapor carries almost none, so **the residue concentrates** | non-volatile solutes |
   | **condensation / distillation** | the condensate comes out nearly clean; **the still keeps the mana** | distillation purifies |
   | burning | ash keeps it, smoke carries the loss | Part 11d's potash row |
   | dissolving | into solution up to the solvent's capacity; the rest stays in the solid | solubility |
   | smelting | metal against slag by capacity; the doped conductivity fixed at this event | Part 11c |

3. **Gas is the loss channel, never a store.** Its capacity is about 1, so anything a separation sends
   to vapor or smoke goes back into the contacting ground (13c). It needs no gas state and no
   atmosphere inventory.

- **Lumped and particulate differ only in speed.** The settling time scales as **size²** (diffusion):
  a powder takes the level in hours and a lump in years. Grind magic ore and it charges fast and leaks
  fast. Milling, sintering and casting change the time constant, never the charge.
- **Capacity is one number per material**, with an optional per-phase override where phase matters
  (ice is not water).

### 13e. Depletion and ownership **[the owner: "sure"]**

- **A node depletes against its inflow and recovers by its kind** — the fishery's shape
  ([fishing.md](../../subsystems/fishing.md): *only `drawn` is state, recovery by half-life*):
  - **geological seams are finite** (mining frontiers, ghost towns);
  - **springs recover at their flow**;
  - **biotic sources recover at regrowth**;
  - **celestial sources follow the sky** (13a).
- **A diffuse source depletes too**, by the same math. Its recovery is simply fast, so one person's
  draw is noise. A whole industry drawing on one district **can** outrun it: the district's level sags,
  and its crops and beasts feel it. That needs no special case. *(This closes a conservation hole: a
  "background that never depletes" would have been mana from nothing.)*
- **Ownership: nodes follow parcel title.** Deposits are already land
  ([parcel.md](../../subsystems/parcel.md)), so rent and monopoly come out of the land market with no
  new governance machinery. This answers Open question 6's griefer worry: a seam is somebody's land,
  not a commons anyone can ruin.
- **The engine measures; the polity imposes** ([measurement.md](../../measurement.md)). A node
  publishes its inflow and its drawn amount as a gauge (layer 1). A quota is a law the polity passes
  (tier C), never an engine rule.

### 13f. Creatures: the field sets where bound beasts thrive

- **A bound creature's upkeep is its binding's mana draw**, met by the level of the ground it lives on
  and by what it eats (biomagnification, 11c). **Off-field it weakens; it does not die.** Lens 1
  decides this: *the reserve drains when draw exceeds uptake* is derivable, while *it dies when it
  leaves* is a rule someone set.
- **Ranges, territories and migrations emerge from the field.** No author places "the wyrm in the
  gorge"; a strong node draws it. A hunter who lures a beast off its ground fights a weaker beast
  (lens 3b). Hunting it pays because the apex creature is the richest store.
- "Seek the field" is one more option in the agent's single deliberation beat
  ([behavior.md](../../subsystems/behavior.md)), reading the neighbor gradient in the place levels.

### 13g. ⭐⭐ Performance: rules, not tuning

> **The owner:** *"we also need to be wary of performance."*

Mana touches every place, every material and every creature. That is the same shape as the potash
drive's stall (2026-11-11, controller-liquidity: `look` walked the whole light graph once per listed
thing), so these are **design rules**:

1. **Compile, never walk at read time.**
   - A place's level is the zone grade (one inherited, cached lookup) plus Σ weight × strength over a
     short per-place list of nearby deposits, usually 1–3.
   - A read is a couple of terms. Nothing walks the location graph from sources when something is read.
2. **Closed-form settling.** `q(t) = q_eq + (q₀ − q_eq)·e^(−Δt/τ)` is one multiply per read, however
   long since the last one. No integration over elapsed history: the slow shore reads (2–18 s in that
   day's drives) were exactly that smell.
3. **Settle at events, never on a tick.** Charge changes only when a thing arrives, is drawn, is
   crafted or changes phase. A million inert things cost zero.
4. **A source depletes in closed form.** Strength = base − drawn·e^(−t/τ). Drawing is one O(1) event
   on the node, and nothing recompiles.
5. **A guard test from day one,** in the shape of `look-light-held.test.ts`: one read must cost the
   same however many sources and things exist.
6. ⚠ **Springs do not build on the watershed's read path until its slow reads are fixed.** The
   `WatercourseCatalogue.readWaterNow` cost was measured at 2–18 s (37 s peak).

### 13h. ⭐⭐ The metaphor, and how the content teaches it

> **The owner:** *"this is kind of a complicated model with all the different flow rates … we need to
> do our best to give them metaphors they can relate to and good examples in the content that
> demonstrate the physics in a legible way."*

**Mana behaves like warmth.** Every rule above has a kitchen equivalent players learned as children:

| the rule | what the player already knows |
|---|---|
| level: flows from high to low | a hot mug in a cold room cools; a cold spoon in tea warms |
| capacity | a hearthstone holds heat all night; a leaf is cold a second after the fire |
| settling time ∝ size² | a cracker cools at once; a roast stays hot for an hour |
| conductance | a metal pan handle burns you; a wooden one doesn't |
| vacuum / insulator | the thermos keeps tea hot all day |
| grounding (silver cuts a binding) | grab cold iron and it pulls the warmth out of your hand |
| separation partitions | boil brine dry and the salt stays in the pot |
| loss returns to the ground | the ground around a forge is warm all winter |
| depletion and recovery | a well drawn hard runs low and fills again overnight |
| seams and the crust | the warm rocks are near the surface; you don't dig to the core |
| meteorites | a coal carried in from someone else's hearth |

- **The register (lens 3a).** The fiction speaks in warmth words: the ground *runs high*, a stone
  *holds* well, a spring is *full* or *drawn down*, silver *drinks* it. Low instrument rungs answer in
  words and bands, **never a number** (the potash egg test's register). The numbers stay the engine's.
  Charge is invisible to ordinary senses (Part 12).
- **Where it's taught:**
  - the first screen of `help mana` is the table above (*the first screen is the syllabus*,
    measurement.md);
  - the university teaches it in the arcane-science course, and the demonstrations live out in the
    world;
  - the instrument ladder (dowsing rod, then electroscope, then meter) gains finer bands with
    competence. Competence resolves detail, never access
    ([instrumentation.md](../../subsystems/instrumentation.md)).

**Eight demonstrations, one rule each, placed in content that already exists:**

1. **Two pails at the Confluence** *(level, dilution)*: water drawn at the spring reads *full*; a pail
   from the creek a mile down reads *thin*.
2. **The assayer's windowsill** *(capacity)*: a titanate and a quartz pebble left a week on the seam
   ledge read *equally high*. The titanate runs a lamp for a month, the quartz for an evening.
3. **The jeweler's two stands** *(conductance, insulation)*: a charged gem on silver is empty by
   morning, on glass it keeps, and sealed in a vacuum flask it keeps anywhere.
4. **The still** *(partition)*: mash from spring-fed barley. The spirit comes off *clean*, and the
   still's residue is the richest thing in the distillery (trade-distilling ships the still).
5. **The smelter town** *(loss returns)*: a dowser's survey of the same field, years apart, shows the
   ground rising downwind of the works.
6. **The tired spring** *(depletion)*: after a dry week of the whole village drawing it reads *drawn
   down*, and after a rested week it is full again. Its gauge lets the parish decide whether to ration.
7. **The strike site** *(meteorites)*: a crater with a skystone, and a smith who makes the one blade in
   the realm that conducts like silver.
8. **The lured wyrm** *(off-field weakening)*: a hunter's tale, and then a hunt that tests it.

### 13i. The lens pass

| lens | verdict |
|---|---|
| 1 pedagogy | ✅ Dielectric capacity, level-driven flow, partition coefficients, diffusion time ∝ size², crustal differentiation and biomagnification are all real physics. The Discipline is field physics, taught through warmth. |
| 2 creative expression | ✅ The ordinary place costs nothing (grade 0). A realm paints a few zone grades and seeds a few deposits. Ley lines or a holy well are a new node kind or a bespoke row, not an engine change. |
| 3a immersion | ✅ Warmth words; no number below the top instrument rung; charge is invisible to ordinary senses. |
| 3b participation | ✅ Dowsers selling surveys, bids on high ground, luring a beast off its ground, a district that sags under its own industry, recrystallizers and still-masters as trades. |
| 4 values | ✅ Decided above: seams finite; nodes are owned land; quotas belong to the polity. |
| 5 continuity | ✅ The physics doesn't depend on the epoch. The *instrument* climbs (rod, electroscope, meter) and answers the same `measure mana`. The vacuum flask arrives with glass-blowing. |
| 6 economy | ✅ Demand existed first (caster recovery, device stores). Charged goods are produced by residence time. The extractor pays in time, the landholder collects rent. |
| 7 governance | Only through title (parcel) and polity quotas (tier C). The engine judges no person. |

### 13j. What this closes, and what it leaves

- **Closes** Open question 1 (what sets a place's mana density) and 11f's *"does the place's field
  deplete"*, and turns Open question 6 into a decision (seams finite; the griefer is answered by
  title, not by making seams indestructible).
- **Leaves:**
  - the coefficients (Open question 8, deferred to a running game);
  - Open question 7 (mana vs electrical conductivity). The demonstrations use silver, which favors
    *correlated* for the classic conductors; *independent* remains possible for exotic materials;
  - the grade map itself: **how much charge the world started with, and where, is authorship and
    taste** (lens 2), never derivation;
  - the rune × verb × effect fit (11e).

## Open questions

1. ✅ **What is the ambient mana density of an ordinary place, and what sets
   it? — ANSWERED by Part 13** (a zone grade on the ground plus seeded
   deposits; there is no "ambient", only sources). Original framing: Uniform baseline with rare rich sites, or a field with structure
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
6. ✅ **DECIDED in Part 13e: geological seams are finite, and nodes are
   owned land (parcel title), so the griefer is answered by title rather
   than by making seams indestructible.** Original framing:
   ⭐ **Can a deposit be exhausted permanently, or only drawn down?** Decision
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
