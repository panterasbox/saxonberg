# Fire & combustion slate — the Fire channel (combustion as a driver)

> **Status: PARTIAL** — the whole combustion substrate shipped: the six
> `Material` numbers, the `heat` channel, `Combustible`/`Burning`,
> phase change, the furnace family
> → [fire.md](../../subsystems/fire.md)
> ⭐⭐ **And the refuellable, fuel-aware burner shipped (the fire build,
> 2026-10):** fuel is a BED (kilograms, by material) that `stoke` fills,
> heat / duration / light / exhaust all derive from it, and `draught` is
> one dial moving heat, soot and light together — so *"a REFUELLABLE
> burner, and a burner that knows WHAT it is burning"* is struck from
> **Left**. → [fire.md](../../subsystems/fire.md)
> **Left:** the fire service (§ below) — the fire brigade
> (bucket-brigade → volunteer → paid-service ladder) · fire-code /
> prevention / inspection · fire insurance (incl. the moral-hazard /
> arson tie) · map-scale wildfire · arson-as-crime + investigation ·
> the Tiebout risk-tolerance framing
> **Size:** a build

---

## The fire service — making fire survivable in a property game (2026-07-31)

**(Out of the vocations register, which flagged the fire brigade as the
largest civic hole: combustion ships and nobody fights fires.)** The
user's objection is the right one and worth stating precisely:

> **Irreversible loss while you are offline, in a game whose premise is
> that property is worth investing in, is a rage-quit — not a mechanic.**

Five reframes dissolve most of it, and the first changes what fire *is*.

### ⭐⭐⭐ The brigade exists because fires SPREAD, not because they destroy

One house burning is a private tragedy. Cities built fire services —
and building codes, and insurance — because of **conflagration**:
one house takes the block (London 1666, Chicago 1871).

So the design question is **not** *"how much damage does fire do to your
building"* but ***"does it reach your neighbour."*** Which puts fire
somewhere already modelled:

> **Fire is [the emission model](./zoning-slate.md)'s catastrophic
> case** — a spillover that crosses parcel boundaries.

A **nuisance and an externality**, not a new destruction system. It is
about neighbours — which is the interesting part, and what justifies a
*public* service at all.

### ⭐⭐⭐ Ignition needs a SOURCE, and sources are things you left running

The direct answer to the offline problem, and it needs **no special
rule** because the ignition balance already ships: a lit forge, an
unbanked hearth, a knocked lamp, a lightning strike, arson.

> **No source, no fire.** The player who banked the forge before logging
> off is safe; the player who left it lit is gambling. **A decision, not
> a dice roll.**

**And the history is exact: *curfew* is *couvre-feu* — "cover the
fire."** The medieval curfew bell was a **fire-prevention ordinance**.
So a locality passing a curfew is passing a **fire code** — the best
available example of a mundane law with an honest reason behind it.

### ⭐⭐ Damage, not craters

Fire damage should be **condition damage** — already shipped, with
**repair** as a trade from the salvage work. A burned shop is a
**damaged** shop.

> **Fire produces repair bills, not craters.**

An economic *shock* rather than a wipe; it feeds the building trades;
it is recoverable. **Total loss stays rare and EARNED** — ignoring
warnings, or a compounding failure. Never a bad roll on a Tuesday.

### ⭐⭐ Prevention is the gameplay; firefighting is the emergency

Most of what a real fire service does is **inspection and code
enforcement** — the same `directive` → **inspector** machinery already
designed for the turnpike and the scrapyard.

So the ordinary relationship to fire is **buy the extinguisher, keep the
firebreak, pass the inspection** — ownership *texture*, not disaster:

> **Risk is a dial you control.** A player doing the sensible things
> essentially never burns down.

Which is the whole answer to *"how do you make it not suck"*:
**avoidable by ordinary diligence, expensive to ignore.**

### ⭐⭐⭐ Insurance is the mechanic that exists precisely for this

Fire is *why* insurance exists: it converts a **catastrophic tail risk**
into a **predictable premium** — the honest solution rather than a
mitigation bolted on.

And the history is the best pedagogical object in the thread:

> **Insurers issued FIRE MARKS and ran their own brigades — which would
> let an uninsured building burn.** The most vivid argument for public
> provision anyone has ever made, and the same lesson as the
> LULU/holdout pair, learned the hard way.

⚠ **Insurance is its own industry and its own conversation** — named
here as fire's dependency, **not designed here.**

### ⭐⭐ Fighting it is a public event, not a chore

A fire spreads on a beat, so it is a **durable activity** like the
Journey and the auction — but a **public** one:

> **A burning street is a call to the neighbourhood**, and anyone
> present can join.

**Bucket brigade → volunteer company → paid service** is the three-rung
ladder again, and **the bottom rung needs no employment at all.**
Genuinely rare content: most of what has been designed is solo or
party-scoped; **this is district-scoped by nature.**

### The crime, and the escape valve

**Arson**, and insurance's classic **moral hazard** — burn your failing
business for the payout. A real crime, and **investigable**: the world
knows what happened while the claim asserts something else, which is the
[enforcement slate](./enforcement-slate.md)'s **true / honest-error /
lie** triad applied to a *claim*. It gives the coroner a sibling: **the
fire investigator.**

**And the honest escape valve is Tiebout.** A locality with strict
codes, a paid brigade and mandatory insurance is **safe and taxed**; one
with none is **cheap and dangerous**.

> **You choose your risk tolerance by choosing where to live** — the
> best possible answer to *"this might suck for me"*: **there is
> somewhere it does not.**

---

## ⭐⭐ Offered by the whiskey drives (2026-10-06): fuel is anonymous, and one-shot

Two findings from the two whiskey wire drives, which are both `.dirty.`
*because of this*. Neither is a defect of those builds; both are the
combustion substrate's.

**1. No burner in the game can be refuelled.** `BurnerMixin`'s fuel is a
`%` `Reserve`, a furnace burns its authored fuel once, and **there is no
verb anywhere that puts more in.** So the still at Crowsfoot is a
one-shot object: a drive lights it, runs a charge, and the floor can
never distil again. ⚠ It is the single reason
`whiskey.dirty.wire.test.ts` and `whiskey-styles.dirty.wire.test.ts`
cannot run twice, and it is named in both of their `DIRTY_REASON`s.

**2. ⭐⭐⭐ Fuel is ANONYMOUS, and that one costs a lesson.**
`reachableHeatForImpl` returns a *temperature*, never a source — nothing
in the engine knows what a kiln is burning. So when the whiskey-styles
build needed *"kiln the malt over peat and the smoke is in the barley"*,
it could not derive the smoke from the fire; it had to declare it as
`Recipe.imparts` with the turf as an item slot.

⚠ **Two fires in the fiction, one in the model**: the kiln's reserve
supplies the heat while the turf in the slot supplies the flavour, and a
player cannot tell. What keeps it honest meanwhile is that the turf is
visibly consumed, so the fact stays derivable at the bench even though
the mechanism is declared.

⭐ A burner that knows its fuel would make that derivation real — and it
is the same seam that would let an as-cut turf **refuse** (it already
refuses `ignite` on its own moisture; an item slot cannot see moisture,
so the peated kiln accepts a sodden one and says nothing). See [crafting.md § History — the whiskey-styles build](../../subsystems/crafting.md),
which carries `Recipe.imparts` and the fuel-anonymity reasoning.

## ⬅ From the fire build (2026-10)

Left as a line here rather than in a retired plan.

- **A `Combustible`'s duration should derive from its MASS** (the fire build's D16). A `Burner`'s does now — the bed is kilograms — but a burning log still spends a `%` Reserve, so the two halves of combustion measure fuel differently. `FireLogic.burnPowerFor` is the attach point and it is a one-line swap.
- ⚠ **The sealed cellar's lesson is an order of magnitude slower than its own row claims** (the fire build's live drive). The mechanism is right and the CLAIM is false: 27 m³ with no openings leaks at `achLeak` 0.1, so the room's time constant is **ten game-hours**. Steady state is `airShare` ≈0.687 — just under the 0.70 smother, so it *does* smother, at ~32 game-hours, first noticeable at ~3 (confirmed live: *"ordinary enough"* at 48 game-minutes, *"There is something in the air in here"* at ~4 hours). The row says "tens of ticks". ⭐ The knob is the room's SIZE, not the dials — and how fast a sealed room should kill is a lens-1-against-3a call, not a drive fix.
- ⚠ **A carried fire needs fuel that fits it.** `stoke` is all-or-nothing, so a 1 kg bed can only take an item of ≤1 kg — and a census found 16 items that fit and none that were fuel, which left the bee smoker unlightable until the sweep added a roll of sacking. ⭐ Clause (h) cannot catch this class: the row is well-formed, and the mismatch is between a VESSEL and a SUPPLY.
