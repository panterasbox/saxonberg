# Mana-economy slate — power sources, the grid, and why mana can't eat the economy

**Captured 2026-08-04**, out of the Dave's-Bar supply-chain thread, when
the question *"what can we actually do with only wood?"* ran into the
observation that the project **already ships a science of magic with
conservation of energy.**

> **User: "you underestimate the power of magic. It can be anything we say
> it is. So if we need more power to move water around, you just invent a
> power source. And maybe it's a few power sources — something big and
> central like a gas station and something small and portable like a fuel
> tank. You're assuming the person moving shit around is just casting, but
> they can be driving a magic car… it needs a narrative and it needs to
> respect the math, but other than that it can be as powerful as nuclear or
> as weak as pushing a hand cart. **But that doesn't mean it doesn't need to
> be economical, or everyone will optimize for mana and you have
> deflation.**"**

> **Status: design conversation, captured. Not requirements.** ⚠ Contains
> **one proposed change to the arcane science** (Part 6) — the only thing
> here that is not built on top of what already ships.

Related: [arcane-science.md](../../arcane-science.md) (**the postulate, the
budget, the price list — read it first**),
[magic-items-slate](./magic-items-slate.md) (⭐ **the charge economy; most
of this slate's guards are already in it**),
[magic.md](../../subsystems/magic.md),
[fasttravel.md](../../subsystems/fasttravel.md) (the TPA — the marquee
consumer), [delivery-slate](./delivery-slate.md) (**utilities are trees
rooted at a source** — the grid model),
[freight-slate](./freight-slate.md) (the transport competitor;
refrigeration as the marquee), [discovery-slate](./discovery-slate.md) (the
inflow/stock model nodes reuse),
[supply-chain-slate](./supply-chain-slate.md) (the vertical that raised
this), [currency-slate](./currency-slate.md) (why a second store of value
is dangerous), [zoning-slate](./zoning-slate.md),
[parcel.md](../../subsystems/parcel.md).

⚠ **Not related, deliberately:** *compute*. Compute is a **metaresource,
never diegetic** — mana is in-world energy and must never be plumbed to the
machine's capacity.

---

# Part 0 — ⚠ The correction that opened it

An earlier pass in this conversation priced magic off **the caster's own
metabolic budget** (~120 kJ, *"about a quarter of a banana"*) and concluded
a mage is a worse prime mover than their own legs — therefore magic could
never matter economically.

**That is true of a caster and false of magic**, and
[magic-items-slate](./magic-items-slate.md) already draws the line:

| | supplies | ceiling |
|---|---|---|
| ⭐ **Charged** — wand, orb, ring | energy **+** specification | **energy density** |
| **Consumable** — potion, scroll | one packaged act | one use |

⚠ **`Focus` was CUT before merge** (magic-items build) — it duplicated an
existing decision and shipped with no verb to fire it. **The argument here
survives and simplifies**: `Charged` is now the *only* powered class, and it
is bounded by energy density, full stop. The *"mages should have gear"*
intuition moved to [implements-slate](./implements-slate.md) — an item that
**modifies what happens when you cast**, not one that casts on your mana.

> **A magic car is a charged item. Its limit is what the tank holds, not
> what a body can channel.**

⭐ The general failure: *the physiology chapter is not the physics chapter.*
The caster's budget bounds **what a person can do unaided** — it says
nothing about what a built device can do, exactly as a human's 100 W says
nothing about a locomotive.

---

# Part 1 — ⭐⭐⭐⭐ The governing principle

> **The postulate buys non-local DELIVERY. It never buys free energy.**

`magic-items-slate` states it for items and it generalizes to everything:

> *"A charged item is a battery. A maker moved energy into it; it holds
> that energy **by ordinary means**; using it releases it."*

So **storage obeys ordinary energy density**, and therefore:

> ⭐⭐⭐ **Mana IS energy. It costs whatever energy costs.** You cannot
> optimize for mana, because mana is the energy you already had to produce.

That single sentence is the whole anti-deflation architecture, and it is
what lets magic be *"as powerful as nuclear"* without breaking anything:
**make it as powerful as you like, and it still has to be generated.** The
fiction gets its ceiling raised; the economy does not get a money printer.

⭐ It also settles the narrative requirement cheaply. *Where does mana come
from?* **Wherever energy comes from** — falling water, a furnace bank, a
geothermal vent, sunlight. The magic is not in the making; it is in the
**sending.**

---

# Part 2 — The two guards, and both are already designed

## ⭐⭐ Guard 1 — demurrage: charge self-discharges

`magic-items-slate`: **3%/month**, *"69% after a year, 2.6% after a
decade… **the ruins are full of dead wands.**"*

> ⭐⭐⭐ **Mana cannot be a store of value. Money does not rot; mana does.**

That is **demurrage** — Gesell's stamped scrip — and it structurally
forecloses a mana standard: anyone hoarding it holds a melting asset.
⚠ **This is the guard that most directly answers the user's deflation
worry**, and it costs nothing because it already ships.

⭐ It also guarantees the charging trade **recurring revenue**: *"you find
shells; you buy charge"* — the **shell is the durable (stock), the charge
is the consumable (flow)**, which is exactly the survival test every trade
has to pass ([supply-chain-slate](./supply-chain-slate.md) § flow vs stock).

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

## ⭐⭐⭐⭐ Guard 3 (2026-08-05, from the merged currency build) — mana CANNOT become money

The strongest guard was not available when this slate was written. The
currency build made currencies a **code registry**, not a collection:

> **banking.md: "currency records are *code*, and code is not a collection.
> **Adding a currency is a code edit at the wizard tier** — the
> reserved-matter constraint in its crudest honest form (a mint is
> Compact-level, never a locality's own call)."**

> ⭐⭐⭐⭐ **So "everyone optimizes for mana until it becomes the numéraire"
> is blocked at the registry.** Mana would have to be *registered as a
> currency* to be money, and that is a reviewed code change at the wizard
> tier — not something an economy can drift into.

⭐⭐ And the never-cross-currencies rule fixes mana's category for good:
every ledger leg is same-currency, so **you buy charge WITH zorkmids**
rather than trading one money for another.

> **Mana is a commodity priced in money — exactly like grain.** That is the
> correct relationship, and it is now enforced by the ledger's shape rather
> than argued for here.

## ⭐⭐ And Guard 1 is now citable rather than asserted

This slate claimed *"money doesn't rot; mana does."* Both halves are now
documented rules pointing opposite ways:

| | rule |
|---|---|
| **money** | banking.md **Law 2** — *"banking installs **no** scheduled recompute touching balances/coin, so **nothing decays** — an idle balance/stack is unchanged over a game-clock advance."* |
| **charge** | magic-items-slate — **3%/month self-discharge**, *"the ruins are full of dead wands."* |

⇒ **the asymmetry is structural, not a hope.**

⚠ **One gap inherited from the same survey:** `PricedOffer.prices` is bare
minor units while `Charge` carries a currency — so a charger's price is
denominated **by convention** at the settling site. Harmless at one
currency; see [supply-chain-slate](./supply-chain-slate.md) § *the offer
layer has no currency*.

# Part 2b — ⚠⚠ REFRESHED 2026-08-05: the magic-items build shipped the charge economy

Written against the slate; **the subsystem doc**
([magic-items.md](../../subsystems/magic-items.md)) **now supersedes it**,
and it is both stronger than assumed and in one place **in tension with this
slate.**

## ⭐⭐⭐ The equilibrium is now an equation, not a hand-wave

This slate argued demurrage from a self-discharge rate. The build derives
it properly:

```
  dS/dt = inflow − d·S      ⟹      S* = inflow / d
```

> *"**Two dials whose ratio is the answer**, and a system that settles
> instead of inflating… Throttling inflow alone cannot work — stock grows
> without bound at any throttle, because nothing ever leaves."*

⭐ And the canon line is better than mine: **"magic perishes, matter
doesn't"** — the ruins hold perfect blades and faded rings.

⚠ Note the build's own warning, which **matches the call
[supply-chain-slate](./supply-chain-slate.md) made independently for
fermentation**: charge decay has **no far-past absence guard** — *"an item
must decay while nobody is looking, because that is the entire basis of the
equilibrium. Follow **husbandry**, not metabolism."*

## ⭐⭐⭐⭐ A FOURTH guard, and it is the strongest one

> *"**You find shells and buy charge.** Wealth cannot corner the found
> channel, because **what money buys is caster-labour, which is capped.**"*

Because charge cannot enter an item any other way:

> ⚠ *"`adjust-reserve` now routes **any** positive delta on a `charge`
> reserve through the one implementation (`MagicApi.transferCharge`), so
> **no effect can add charge without a coupling**."*

And a coupling needs three things — **your reserve**, the `transfer` working,
and a **conduit** — with `delivered = committed × coupling × competence`
(crude 0.6 · field 0.85 · bench 0.98), and ⭐ **efficiency that can never
reach 1 by construction**, because *"1 τ ≡ 1 kJ against a conservation law,
so a lossless pump is a perpetual-motion machine."*

⭐⭐ **That is the conversion table Part 1 proposed, shipped** — along with
`lib/magic/PriceList.ts`, which prices `transform` three orders of magnitude
above every other verb so rarity falls out of **arithmetic rather than a
rule somebody has to remember.**

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

---

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

---

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

---

# Part 5 — ⭐⭐⭐ The TPA on mana

> **User: "I think the TPA terminals should be mana powered, getting their
> power from a power grid or a battery or some other kind of mana node.
> Right now they have no in-game physics — they just work."**

Four things this buys, none of which need new substrate:

1. ⭐ **The fare stops being an arbitrary number and becomes cost-plus** —
   energy + capital. The accounts already exist (`fasttravel.tpaAccount`,
   the network fee, the remittance split) and are **currency-tagged end to
   end** since the 2026-08-05 merge — `Charge` carries a currency, so a fare
   is a zorkmid fare and cannot quietly become anything else.
2. **A failure mode, and therefore a politics.** A dark terminal is
   somebody's fault, somebody's budget line, and somebody's election issue.
3. ⭐⭐ **Grid coverage = network coverage.** The mana grid decides *where
   the world is close together* — arguably the most consequential thing a
   locality can build, and a genuine rival to road-building.
4. **Off-grid terminals run on cells**, at the premium — so a remote
   terminal is expensive to keep lit, which is *why* the frontier feels far.

⭐ And it puts teleport into the transport stack **priced**, rather than as
a free exception to it:

| mode | cost | speed | infrastructure |
|---|---|---|---|
| carry it | your time + encumbrance | slow | none |
| cart / wagon | cheap per tonne-km | slow | roads |
| ⭐ **TPA** | **expensive per kg** | instant | grid + terminals |

> **Carts do bulk; TPA does urgent.** Shipping vs. air freight — and
> neither eats the other because the arithmetic says so, not because a rule
> forbids it.

---

# Part 6 — ⚠⚠ The one thing that changes the science: the endpoint clause

The postulate's **"the caster is always one endpoint"** is load-bearing.
`arcane-science.md` says it is *why* the faculty is anatomical, why cold
magic cooks the caster, and why a mage in a conductive pool is part of
their own circuit.

> ⚠⚠ **A terminal-to-terminal network has no caster at either end.**

Two ways out, and this slate does **not** default one:

## ⭐⭐⭐ RESOLVED 2026-08-04 — the traveler IS the caster

The problem dissolved on a clarification:

> **User: "by 'operator' I meant the teleporter — the person using the
> terminal to teleport themselves. There's only one person at the
> terminal."**

> ⭐⭐⭐⭐ **The traveler is the caster. Their own body is one endpoint; the
> destination is the chosen point.** The postulate is satisfied
> **verbatim** — no bound device, no stated exception, no second impossible
> thing. The terminal is a **charged item supplying the energy**; the
> traveler supplies the **endpoint**.

⭐⭐ **And it settles the TPA-vs-freight question structurally rather than by
pricing.** Goods have no body to be an endpoint, so **the TPA moves
people.** Your pack rides because you are carrying it; a wagonload does
not.

> **Encumbrance is the boundary** — which is exactly what
> [freight-slate](./freight-slate.md) already resolved: *"the line is
> capacity, not goods."*

⭐ So matter-teleport needs no amendment to `arcane-science.md` after all:
what moves is **a person and what they carry**, and a person is a caster.
The Part 6 amendment above is **withdrawn as unnecessary** — kept only as a
record of why the endpoint clause matters.

## On teleporting matter at all

> **User: "I do think magic should teleport — we have scrolls of
> teleport."**

⭐ Widening the postulate from *energy* to *energy or matter* is arguably
**the same impossible thing** — relocation without a path — rather than a
second one. That is the cheap widening, and it keeps the discipline.

⚠ **But `arcane-science.md` explicitly says "the postulate moves energy; it
does not manufacture mass,"** so this is a real amendment to a shipped
document, not an interpretation. **It should be made deliberately, with the
price of moving mass as the design lever** — expensive but finite, so the
TPA is a business rather than a miracle.

---

# Part 6b — ⭐⭐⭐⭐ Mana nodes: terminus conditions × access modes

> **User: "I don't want this to be anything goes — there should be some
> science behind it. Or rather, the magic science we have should intersect
> with the other sciences in interesting ways, like the mana spring does
> with geology. Like maybe it's not material-based at all but mechanical,
> like hydro is just not based on water. Or based on radiation like solar
> but not the sun. Or maybe all of the above."**

## The framing that keeps it principled

The postulate already says energy arrives at a place from an unknown far
end (Part 6). So the only open question is:

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

## Capacitors as a storytelling primitive

> **User: "I think we're going to need capacitors right away even if we're
> still pre-industrial, just as a narrative tool. It's like how cell phones
> changed screenwriting — batteries change what stories people can tell in
> an open world (see TPA again)."**

⭐ The analogy is exact. A battery **decouples power from place**, which is
what lets an author put a powered thing on the frontier *without lying about
it* — and the cost is a clock, which is the story. It also mints the
**dead battery**: a failure that is nobody's fault and is recoverable.

> ⭐⭐ **Cheapest possible implementation: a capacitor is a CHARGED ITEM with
> no spell attached.** [magic-items-slate](./magic-items-slate.md) already
> ships charge, self-discharge and *"you find shells; you buy charge."* A
> mana cell is that object with its specification set to *hold and release*.
> **Nothing new is required.**

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

---

# Open questions

1. ⚠⚠ **The endpoint clause (Part 6)** — bound endpoint vs. stated
   exception. **The only decision here that changes the science**, and it
   gates the TPA fiction.
2. **Is charge one fungible quantity, or typed by form?** The price list
   already makes form matter (heat 0.85, etc.). *Leans one quantity + a
   conversion price* — otherwise every device needs its own fuel and the
   grid stops being a grid.
3. ⭐ **Do nodes deplete?** A renewable node has an inflow; a depletable one
   does not. **Both should exist** — it is the same wood/coal choice, and
   having both is what makes siting a real decision.
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
