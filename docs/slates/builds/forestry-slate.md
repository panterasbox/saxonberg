# Forestry slate — the crop you inherit

> **Status: design surface, unbuilt, no phase gate passed.** Written
> 2026-09-03 out of the [farmstead](../../requirements/farmstead-requirements.md)
> land-use pass, which found that **wood has more consumers than any other
> material in the game and no producer designed for it.**
>
> ⚠ **Partly built already, and by accident.** `trade-fuel` ships a coppice
> because charcoal needed one — and its README names the seam this slate is
> for, verbatim: *"the coppice — authored beds over the shipped
> `CultivableMixin`/`GrowingMixin` … **a cut-and-regrow rotation is the seam a
> later build widens.**"* Farmstead **D70** widens it; this slate is the
> industry around it.
>
> **There is no forestry vocation in the register.** The only wood entry is
> *charcoal burner / collier*, marked shipped — which is a customer, not a
> producer.

See also: [farmstead requirements](../../requirements/farmstead-requirements.md)
(**D63** winter fuel · **D70** woodland as a land use · **D74** the commons
rights) · [mining-slate](./mining-slate.md) + [metal-chain-slate](./metal-chain-slate.md)
(**the three-pack precedent, and the timber customer**) ·
[fire-combustion-slate](./fire-combustion-slate.md) ·
[hunting-slate](./hunting-slate.md) (forest law is one law) ·
[vocations register](../../vocations.md) · [trade-roster-slate](./trade-roster-slate.md).
Substrates: [husbandry.md](../../subsystems/husbandry.md) (`GrowingMixin`) ·
[smallholding.md](../../subsystems/smallholding.md) (`CultivableMixin`) ·
[fire.md](../../subsystems/fire.md) · [mining.md](../../subsystems/mining.md)
(`TimberSet`) · [crafting.md](../../subsystems/crafting.md) ·
[materials-response.md](../../subsystems/materials-response.md) ·
[watershed.md](../../subsystems/watershed.md) (**water power**) ·
[field-substrate-slate](./field-substrate-slate.md).

---

## What actually ships today

| | State |
|---|---|
| `trade/fuel/thing/hazel-stool` | a `Plant` with `harvestTemplatePath: cordwood`, **authored already-grown**, with the rotation named as a seam on the species row |
| `trade/fuel/thing/cordwood` | a `Provision` — *"the ONE supply two trades compete for: the collier chars it and the mine shores with it"* |
| `corylus/avellana` | the hazel species row |
| `charcoal`, `ash`, `brands`, `clamp` | the burn, both as things and as material rows |
| `TimberSet` (mining) | a placed `Durable` that decays and is repaired — ground support as an object |
| `material/wood/oak` | ⚠ **the only wood material in the game** |

> ⚠⚠ **A content defect to fix in passing:** `cordwood.yaml` describes *"a
> straight length of hazel"* and carries `_materialPath: …/wood/oak`. Hazel
> cordwood made of oak. It is invisible today because oak is the only wood row
> that exists — which is itself the finding.

**One wood species is the real gap.** Wood is not one material: oak for
structure and tannin, ash for anything that takes shock, hazel for hurdles and
wattle, willow for baskets, elm for water pipes because it does not rot wet,
pine for cheap boards. `materials-response` already models response as
`f(mechanism, material, construction)`, so the substrate is waiting; only the
rows are missing.

---

## ⭐⭐⭐ The crop you inherit — and it dissolves the timescale problem

A worked wood produces **two crops on two timescales from one piece of ground**,
which is the structural fact of pre-industrial forestry:

- **Coppice** — cut to the stool, regrows from the stump, a short rotation.
  Poles, rods, fuel, charcoal, hurdles, withies.
- **Standards** — scattered trees left to grow, for decades, into structural
  timber.

*Coppice with standards* is one stand doing both, and it is the sharpest
multi-timescale decision available to a player: every standard you leave shades
the coppice beneath it.

The clock is the obvious objection. A game year is **30 real days**, so a
seven-year hazel rotation is seven real months and an oak standard is
unreachable in a human lifetime of play. Farmstead **D23** already set the
policy — *compress the absolute scale, preserve the ratios* — and here it
resolves into something better than a dial:

> **Coppice is a crop you can complete. Timber is a crop you inherit.**
>
> A mature stand was planted by somebody long dead. You manage it, you harvest
> it, you decide how fast to spend it — and planting a standard is an act of
> faith for a player who does not exist yet.

**Forestry is the only industry in the game whose full cycle a single player
cannot close**, and that is not a limitation to engineer around. It is the
content. It gives the chronicle something real to hold, it makes an inherited
holding materially different from a bought one, and it is the honest reason
forests were governed by institutions rather than owners.

---

## Wood's consumers — the deepest demand list in the game

| Consumer | Product | Status |
|---|---|---|
| **the collier** | cordwood → charcoal | **ships** |
| **the mine** | timber sets | **ships** |
| **winter** | firewood | farmstead **D63** |
| **building** | structural timber, boards | the residence ladder |
| **the tanner** | ⭐ **oak bark** | `tannin.yaml` ships in `trade-dyeing`; bark is its source |
| **the pigs** | mast — pannage | farmstead **D30**, **D74** |
| **fencing** | hurdles, stakes, hedgerow | farmstead **D56** |
| **soil** | wood ash → potash | farmstead **D68**; `ash` ships |
| **basketry, hafts, wheels, barrels** | withies, ash, elm | the crafting chain |
| **brine boiling** | fuel | farmstead **D71** |

⭐ **Oak bark closes hide → leather**, which farmstead D68 left with a reagent
and no source. And bark stripping is properly seasonal — spring, when the sap
rises and the bark peels — so it is a real labour spike, not a stock you draw on.

**The wood contest is now at least four-way** for one stand: charcoal, mine
timber, hearth firewood, and construction. `cordwood.yaml` already calls the
two-way version *"the whole reason the fuel yard is a business rather than a
prop."*

---

## ⭐⭐ Deforestation is the lesson, and it must be allowed to happen

A forest is renewable **only while the cut rate stays under the growth rate**,
and that inequality is the entire subject. Exceed it and you get the documented
history: the salt towns ate their woods, navies panicked about oak, and
**coal replaced charcoal because the wood ran out.**

The game has a mining chain. So the arc is available end to end:

> **A player can be made to discover *why coal*** — not told it, driven to it by
> a stand that could not keep up.

Which means the design must **let a wood be destroyed.** Not a warning, not a
soft cap, not a regrowth timer that quietly outruns demand. A stand cut past its
increment declines, and the consequence arrives as a fuel price and a cold
winter. This is farmstead D45's cliff/slope distinction applied at the scale of
a locality rather than a player, and it is the commons problem in its most
consequential form.

---

## Silviculture — what the discipline actually is

Real, teachable, and it rides substrate we have:

- **Species by site.** Farmstead **D2**'s seeded ground character — soil, aspect,
  drainage, depth — decides what will grow well where. The survey (**D4**) is
  already the instrument.
- **Rotation length** — the coppice decision, trading pole size against
  frequency.
- **Thinning** — take some now so the rest grow better. Genuinely
  counter-intuitive and genuinely correct.
- **Regeneration** — natural seeding versus planting, and whether stock browsing
  the regrowth prevents it. ⭐ *Grazing a wood stops it being a wood* — the
  farmstead's own animals are the threat, which is why wood pasture was managed
  and fought over.
- **Stool longevity** — a coppice stool outlives the trees around it; some are
  centuries old, which is the inherited asset made concrete.

## Conversion, and seasoning is the interesting half

Felling → cross-cutting → **cleaving** (riving along the grain, strong, fast,
no mill) versus **sawing** (dimensionally accurate, slow by pit, fast by water).

⭐ **Water-powered sawing** is a natural consumer of the shipped watershed —
flow, head, and a mill site that is worth owning. It is the clearest case in the
game of a *place* having industrial value.

⭐⭐ **Seasoning** is the decision worth building. Green wood is easy to work and
then **shrinks and moves**; seasoned wood is stable and hard. Air-drying runs
roughly a year per inch of thickness, which makes a timber store a **capital
asset that appreciates while sitting still** — the same shape as the
fermentation build's cellar, on the same reconcile-on-read machinery, and a
direct consumer of the moisture model farmstead already extends.

---

## The law — and this is where estovers finally lands

Farmstead **D74** listed the *profits à prendre* and left them unowned. Wood
holds three of them, and they are named separately for a reason:

| Right | What it takes |
|---|---|
| **housebote** | wood to repair your dwelling |
| **haybote** | wood to repair your fences |
| **firebote** | wood to burn |

Together they are **estovers**, and they are limited by *reasonableness* — the
classic vague standard, which is exactly why it generated centuries of
litigation. A polity that has to decide what "reasonable" means, for a resource
that visibly runs out, is doing real legal work.

The **woodward** is the medieval office for it — an officer who guards the wood
— and it is the same shape as the gamekeeper in
[hunting-slate](./hunting-slate.md). ⭐ **Historically it was the same law**:
forest law governed *vert and venison*, the wood and the deer, together. The two
slates should share their enforcement design rather than inventing two.

---

## ⭐ A stand is a record — the pattern's fourth consumer

Herd (farmstead **D20**) → hive (**D34**) → wild population
([hunting-slate](./hunting-slate.md)) → **stand.** You do not instance five
hundred trees. A stand is **a population with an age structure and a species mix
over an area**, from which an individual materializes when you engage it — you
fell it, or it is the named oak everybody navigates by.

Its halves compose the way soil's do: **seeded character** (what grows here,
from site and biome) × **derived state** (what is left, from what has been cut).

⚠ **No regrowth timers.** Growth is an increment against a standing stock, which
is what makes the cut-rate-versus-growth-rate lesson expressible at all.

---

## Where it lives

**A `trade-forestry` pack, with the coppice moving out of `trade-fuel`**, which
becomes its customer. That is the metal chain's shipped precedent —
`trade-mining` / `trade-fuel` / `trade-smelting` as three packs over one
locality — and it is the honest supply chain: **a forester and a collier are
different trades**, and the collier buying cordwood rather than growing it is
what makes the contest real.

The **forester / woodward** is the register's missing vocation, and its demand
test passes on the consumer table above without needing a single new customer.

---

## What must not happen

- **No infinite trees, and no regrowth timer that outruns demand.** Growth is an
  increment; if it cannot be outrun, nothing here teaches anything.
- **Do not prevent deforestation.** The whole arc depends on it being possible.
- **No tech-tree unlock for the sawmill or anything else** — trades advance by
  exercised disciplines.
- **Do not instance a forest.**
- **No single "wood" material.** Species differ, and `materials-response` is
  already built to express that.

## Open questions

- **How compressed are the rotations?** Lean: coppice ≈ one game year, so a
  player can complete one; standards over many, so they are inherited. Ratios
  preserved per farmstead D23.
- Is standing timber a **seeded** field (like a `Deposit`) or a **derived** stock
  (like foraging)? *Lean: both, composed — species from site, volume from
  history.*
- Does planting a standard need any mechanism beyond an act with an absurdly
  distant payoff, and **is that payoff to the chronicle rather than the player?**
- Where does the **sawmill** sit — its own trade, or the carpenter's premises?
  And does water power make it a `watershed` consumer in v1?
- Do forest law and game law share one enforcement design, per *vert and
  venison*? *Lean: yes, and it should be settled once across both slates.*
- Does the **hazel/oak `cordwood` mismatch** get fixed here or in a farmstead
  wave? *(It is one line either way.)*

## Scope guardrails

- **Reuse the growth model.** `GrowingMixin` and `CultivableMixin` already run
  plants on reconcile-on-read; a stand is a density decision, not a new engine.
- **No new Mongo collections.**
- **The wood species rows are the cheapest high-value work here** — one material
  row per species unlocks `materials-response` behaviour that is already built.
- **If this is cut for scope, cut conversion before the stand.** The stand and
  the cut-rate-versus-growth-rate inequality are the lesson; sawing is a
  convenience on top of it.
