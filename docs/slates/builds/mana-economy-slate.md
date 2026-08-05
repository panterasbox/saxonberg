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
| **Focus** — rod, lens, staff | specification only | **your reserve** |
| ⭐ **Charged** — wand, orb, wearable | energy **+** specification | **energy density** |

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
   the network fee, the remittance split).
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

| | | Cost |
|---|---|---|
| **(a)** terminals contain a **bound endpoint** — a device that genuinely *is* one end of a transfer | keeps the postulate intact | needs a narrative for what that device is, and it will be asked about |
| **(b)** the endpoint clause takes a **stated exception for built devices** | simpler | ⚠ **a second impossible thing** — and the doc's whole discipline is *one* |

⭐ *Leans (a)*, because the doc's hard rule is that invented content stays
confined to a single postulate, and because a **bound endpoint is a
manufacturable object** — which makes it a trade, a capital good, and a
thing that can be stolen or fail.

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
