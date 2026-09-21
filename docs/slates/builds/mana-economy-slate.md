# Mana-economy slate — power sources, the grid, and why mana can't eat the economy

> **Status: PARTIAL** — the charge economy shipped (`S* = inflow/d`, the
> three item classes, `ManaPowered` as the wall socket, `ManaCell` and
> `ManaMain` in the arcana pack) →
> [magic-items.md](../../subsystems/magic-items.md), and the TPA now runs
> on mana with a derived rate and the three supplies →
> [fasttravel.md](../../subsystems/fasttravel.md).
> **Left:** the SOURCE — sited mana nodes on the terminus-condition ×
> access-mode grid (a `ManaMain` just refills today) · the CHARGER as a
> trade · distribution as a tree and the grid edge as an economic
> boundary · node title, rent and the first natural monopoly · whether
> nodes deplete · demurrage on flow vs storage · the magic vehicle (a
> charged `Drivable` priced against feed) · the reserve-that-is-not-a-body
> call (Part 2b — matter now holds mana by canon, so whether the polity
> governs a node's `inflow` by quota/rent must be decided deliberately) ·
> the offer layer's currency (`PricedOffer.prices` is bare minor units —
> owned by supply-chain-slate)
> **Size:** a build

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
[supply-chain-slate](../tails/supply-chain-slate.md) (the vertical that raised
this), [currency-slate](./currency-slate.md) (why a second store of value
is dangerous), [zoning-slate](./zoning-slate.md),
[parcel.md](../../subsystems/parcel.md).

⚠ **Not related, deliberately:** *compute*. Compute is a **metaresource,
never diegetic** — mana is in-world energy and must never be plumbed to the
machine's capacity.

---

# Part 0 — ⚠ The correction that opened it

*Superseded by the 2026-08-11 science change* — the correction's mechanism
(*storage obeys ordinary energy density*) went with the identity `τ = kJ`:
mana is a separate conserved quantity that matter holds by **mana density**,
and a device's ceiling is *what you can source, refine and carry*, not a body
→ [arcane-science.md](../../arcane-science.md) § The second quantity, § The
caster's budget. The `Focus` cut and *Charged as the only powered class* →
[magic-items.md](../../subsystems/magic-items.md) § The mana potion is
metabolic (the ⚠ box), § The three item classes.

---

# Part 1 — ⭐⭐⭐⭐ The governing principle

*Superseded* — **mana is NOT energy.** It is a second conserved quantity,
one-way coupled at `k = 1 kJ/τ`, **never made from fuel** (*there is no such
thing as a mana generator*), found and never manufactured →
[arcane-science.md](../../arcane-science.md) § The second quantity, § The
power level (*you cannot build a mana plant; you can only own a mana
deposit*). The anti-deflation conclusion survives on the new footing —
rent-bearing, not manufacturable — which is Guard 2 below.

---

# Part 2 — The two guards, and both are already designed

## ⭐⭐ Guard 1 — demurrage: charge self-discharges

Shipped → [magic-items.md](../../subsystems/magic-items.md) § The charge
economy (*decay is load-bearing*; `S* = inflow / d`; *you find shells and buy
charge*; recharging is a service).

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

Shipped → [banking.md](../../subsystems/banking.md): currency records are
*code* (*adding a currency is a code edit at the wizard tier*), and ⚠⚠ *a
ledger leg may never cross currencies* — so mana is a commodity priced in
money, enforced by the ledger's shape.

## ⭐⭐ And Guard 1 is now citable rather than asserted

Both halves are documented rules: money — banking.md § Law 2 (*nothing
decays*); charge — magic-items.md § The charge economy (the standby draw,
`S* = inflow/d`). The asymmetry is structural.

⚠ **One gap inherited from the same survey:** `PricedOffer.prices` is bare
minor units while `Charge` carries a currency — so a charger's price is
denominated **by convention** at the settling site. Harmless at one
currency; see [supply-chain-slate](../tails/supply-chain-slate.md) § *the offer
layer has no currency*.

# Part 2b — ⚠⚠ REFRESHED 2026-08-05: the magic-items build shipped the charge economy

## The equilibrium is an equation — shipped

→ [magic-items.md](../../subsystems/magic-items.md) § The charge economy
(`dS/dt = inflow − d·S ⟹ S* = inflow / d`; *magic perishes, matter doesn't*;
⚠ *charge decay has NO far-past absence guard — follow husbandry, not
metabolism*).

## The fourth guard — shipped

→ [magic-items.md](../../subsystems/magic-items.md) § Recharging: three
things, and a coupling that loses some (`adjust-reserve` on `charge` routes
through `MagicApi.transferCharge`; `delivered = committed × coupling ×
competence`, crude 0.6 · field 0.85 · bench 0.98; a lossless pump is a
perpetual-motion machine); `lib/magic/PriceList.ts` prices `transform` three
orders of magnitude above every other verb.

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

Shipped → [fasttravel.md](../../subsystems/fasttravel.md) § ⭐ What the TPA
reform changed, § The gate runs on mana (the three supplies — a cell in the
bay, a `ManaMain` the row names, a person in contact), § The arming floor
(`dry`/`overdrawn`; a gate with no traffic drains), § The mana charge (the
rate is DERIVED from the supply — line `0.002`, cells `0.01`, BYO `0` — so a
frontier post on cells quotes a dearer ride than a city gate on the line).
The transport-stack pricing (carts do bulk, TPA does urgent) rides `m·g·Δh`
with the traveller's borne burden in the mass term
(`MagicLogic.relocationCostImpl`).

---

# Part 6 — ⚠⚠ The one thing that changes the science: the endpoint clause

Resolved and shipped — **the traveller is the caster**: `relocate` always
lands on `ctx.actor` (the `teleport` spell row, AC5 — *you cannot send a third
party*), the ride quotes `MagicApi.relocationCost` on the traveller's own
mass, and the postulate is satisfied verbatim. The matter question is
settled the other way round: the exemption is **LOCALITY**, not *energy*,
so teleportation is the same impossible thing and no amendment was needed
beyond restating it → [arcane-science.md](../../arcane-science.md) § The
Postulate (revised 2026-08-11), § Control·Body and the terminal network;
[fasttravel.md](../../subsystems/fasttravel.md) § 2 · The TPA ride, § 3 · The
anchored spell. Encumbrance is the freight boundary: the pack rides in the
mass term.

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

Shipped — a **`ManaCell`** is `Slottable + Charged` and no new mixin, sold at
the general store, swapped into a device's `battery` bay →
[magic-items.md](../../subsystems/magic-items.md) § `ChargedMixin`'s second
consumer; [fasttravel.md](../../subsystems/fasttravel.md) § The gate runs on
mana. The narrative-tool rationale (*a battery decouples power from place;
the cost is a clock, which is the story; the dead battery is a recoverable
failure that is nobody's fault*) is in the compaction ledger's Handoff for
magic-items.md.

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

1. ~~The endpoint clause~~ — resolved: the traveller is the caster, and the
   exemption is locality (Part 6 note; arcane-science.md § The Postulate).
2. ~~Is charge one fungible quantity, or typed by form?~~ — resolved: one
   quantity. A shell's tank and a caster's pool are the same denominator
   (τ, `Unit` `'pt'`), and form is priced by `PriceList` at the effect
   (magic-items.md § The denominator is τ).
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
