# Supply-chain slate — the missing middle, and how goods actually move

**Captured 2026-08-04**, out of *"Dave's Bar is going to be one of the first
full verticals to ship."*

> **User: "right now we've only modelled the ends of the supply chain.
> Farming is more or less there and the bar itself is more or less there,
> but everything in between we haven't really designed, and if we don't want
> a magic economy I think we need it to go live."**

> **Status: design conversation, captured. Not requirements.** ⚠ Contains
> **one proposed change to shipped code** (fungible consignment, Part 2) —
> flagged as such, not yet a defect report.
>
> **⭐ Overtaken by farming Stage A (2026-09-01):** "the content is one
> crop — carrot" is no longer true (ten grown families ship, with the
> fruit cycle behind them), and Part 4's **rung 1 — the spot market — is
> real** at the farmers market (consignment stalls off the
> counting-houses, per-shelf caps). Rungs 2–4 (direct purchase,
> contracts, the firm) and the fungible middle stay unbuilt.

Related: [crafting.md](../../subsystems/crafting.md),
[retail.md](../../subsystems/retail.md) (⭐ the correction in Part 2),
[chattel.md](../../subsystems/chattel.md) (discrete-goods-only),
[glob.md](../../subsystems/glob.md),
[husbandry.md](../../subsystems/husbandry.md) (⭐ the shape the new mixin
copies), [smallholding.md](../../subsystems/smallholding.md),
[banking.md](../../subsystems/banking.md) (the bar's P&L),
[contract.md](../../subsystems/contract.md) (forward contracts; haulage
gigs), [employment.md](../../subsystems/employment.md),
[content-packs-slate](./content-packs-slate.md) (⭐ *pack = a TRADE*; *seed
backwards from sinks*), [freight-slate](./freight-slate.md),
[credit-slate](./credit-slate.md) (the cold start),
[vocations.md](../../vocations.md).

---

# Part 0 — ⭐⭐⭐⭐ The magic is four lines, and the fix is a deletion

`seeds/world/lounge/bar.yaml`:

```yaml
populates:
  - { template: /world/lounge/gin-bottle,      onto: /world/lounge/back-bar }
  - { template: /world/lounge/vermouth-bottle, onto: /world/lounge/back-bar }
  - { template: /world/lounge/rum-bottle,      onto: /world/lounge/back-bar }
  - { template: /world/lounge/lime-bottle,     onto: /world/lounge/back-bar }
```

**The bottles re-clone fresh every boot.** Bulk drains as drinks are poured;
the reboot refills them. That is the whole magic economy.

> **The single highest-leverage change in the vertical is a DELETION.**
> Remove those lines and Dave must **buy** gin — which creates the first real
> demand in the world and pulls the rest of the chain into existence.

⭐ This is the content-pack slate's own rule (*seed the economy backwards
from sinks that already ship*) applied literally: **the sink is built; it is
being supplied by magic.**

⭐⭐ **And it makes the bar's P&L honest.** Today Dave's only cost is wages,
so the deficit the central bank subsidises is an artifact. Once inputs are
bought, the bar is a real business and the `match_rate` taper in
[credit-slate](./credit-slate.md) has something true to measure.

## The target is precise

`config/recipes.yaml` names exactly what the bar consumes — Material
categories at **`minGrade: fair`**:

| martini | daiquiri |
|---|---|
| gin 0.06 L + vermouth 0.01 L | rum 0.06 L + lime 0.02 L |

⭐ **Grade is load-bearing**: a distiller making `poor` spirit *cannot supply
this bar.* The quality ladder is already the gate.

## What already ships (more than expected)

| | |
|---|---|
| ✅ **Bulk-output recipes** | `outputApplication: 'bulk' \| 'tangible' \| 'edible'` |
| ✅ **Heat-gated transforms** | `requiresHeatK` against the hottest reachable lit furnace — **a still is a furnace recipe**, proven by the smithing branch |
| ✅ **Grade, maker's mark, discipline** | on every crafted output |
| ✅ **Retail, consignment, banking, employment, contracts** | |
| ⚠ **Farming** | the *substrate* ships; the *content* is **one crop — carrot** |

---

# Part 1 — ⭐⭐⭐ The one genuinely missing mechanic: a durative transform

> ✅ **OVERTAKEN — the fermentation build shipped this (2026-09-01,
> MR !215):** `MaturingMixin` (lib/maturation/) is the durative
> transform — its own mixin, not a mode on Growing; profile-driven
> (`MaturationProfile` rows), temperature+time, reconcile-on-read, no
> far-past guard; overshoot IS where the stakes live (an open finished
> batch turns to vinegar over `turnDays`). Part 6's kernel bill and the
> grade seam landed with it. See docs/subsystems/maturation.md.

**Crafting is instantaneous** — inputs in, output out, one act. Fermentation
and aging happen **over game-time, under conditions.**

> **The missing middle is not a subsystem. It is a durative transform, and
> the corpus already has its shape twice** — `GrowingMixin` (reconcile-on-read,
> stages via `daysToStage`, a limiting factor, its own checkpoint) and
> metabolism's digestion buffer.

## ⭐⭐ Its own mixin, not a mode on `GrowingMixin`

> **User: "probably its own mixin, fermentation is a different chemical
> process."**

Right, and there is a mechanical reason:

> ⭐⭐⭐ **Growth ACCRETES. Fermentation CONVERTS.**

A plant pulls mass in from soil, water and light — `GrowingMixin`'s
min-of-four limiting factor is about *supply of inputs*. A vat's mass is
already present; what changes is **what it is**. Different equation,
different drivers.

| | Growing | Fermenting |
|---|---|---|
| **driver** | min-of-four (water / soil / light / nutrient) | ⭐ **temperature** (`ThermalMixin` ships) + time |
| **neglect** | grades poorly; recovers | ⭐⭐ **overshoots — irreversibly** |
| **shape** | reconcile-on-read, staged, own checkpoint | *identical* |

## ⭐⭐⭐ Overshoot is where the stakes live

A neglected crop grades badly. **A neglected wash turns to vinegar.** That
is the mechanic that makes the vocation *playable* rather than an idle
timer — **you have to be there to catch the batch.**

⭐ And nothing is wasted: **vinegar is a real product the cook wants.** The
failure mode still feeds someone downstream — the value drops, it does not
vanish (*everything is a business*).

⭐ **Independently confirmed 2026-08-05:** the magic-items build reached the
same call for charge decay — *"an item must decay while nobody is looking,
because that is the entire basis of the equilibrium. **Follow husbandry, not
metabolism.**"* Two subsystems, same choice, arrived at separately.

⚠ **The tension, and its diegetic answer.** Husbandry deliberately has **no
far-past guard**, so a fortnight away means a spoiled batch — harsher than a
sickly carrot. The mitigation should be a *place*, not a rule: **a cold
cellar slows everything down**, so **storage is the skill**, and a distiller
who builds a good cellar can take a week off. Gives thermal a second
consumer.

---

# Part 2 — ⚠ Proposed change to shipped code: fungible consignment

> **User: "wait, why can't things be globbable? that sounds like something
> that can be fixed easily."**

**Correct.** The refusal is **one guard** in `ConsignController`:

```ts
// Discrete-goods only — a fungible stack is owned-by-possession.
if (MixinApi.isGlobbable(item)) { … reject … }
```

The reason chain: `consign` proves ownership via `ChattelApi.ownerOf` →
`ownerOf` refuses globs → therefore globs cannot be consigned.

> ⭐⭐⭐ **The blocker is not consignment. It is using CHATTEL as the proof
> of ownership.**

## chattel.md already supplies the alternative

> *"a glob's `_chattelId` stays empty, and fungible stacks are
> **owned-by-possession** (whoever holds them)."*

So for a stack, *"is this yours to sell?"* has a trivially correct answer —
**you are holding it** — which `resolveHeld(giver, model.thing)` established
two lines earlier. **The chattel check is redundant on the glob path.**

⭐ The doc's structural objection is real but aimed elsewhere: *"a split of a
stack of five has no answer for which unit keeps the id."* True — **and it
evaporates when nothing is ever stamped.**

## The change

| | |
|---|---|
| **consign** | you hold it ⇒ you may list it. The listing carries `{consignor, quantity, askPerUnit}` |
| **buy** | split N units off, hand over — **no stamp** (possession transfers with the goods) — settle `N × ask`, split to the consignor |
| **reclaim** | split the remainder back |
| ⚠ **the one hazard** | two consignors' stacks **merging** on the shelf. Fix: **each listing holds its own lot**, segregated — no `globIdentityFields` change |

## ⭐⭐ Refreshed 2026-08-05 — the currency build merged, and it ARGUES FOR THIS

The currency build (MR !169) had this exact fight and settled it in this
slate's favour. Its plan called for gating `setQuantity` on
`GlobbableMixin` so future value-bearing globs would inherit conservation.
**55 failing tests said no**, and the recorded conclusion was:

> ⭐⭐⭐ ***"A pile of ore is not money."*** The gate belongs on **`Coin`**,
> the value-bearing class — not on every glob in the world.

⇒ **Ordinary commodity globs are deliberately, and now testedly, NOT
conservation-gated.** Splitting and merging grain freely is a position the
codebase has already defended, so fungible consignment is not asking for an
exception — it is using the substrate as decided.

⭐ `Coin.setQuantity` is now `@CallSecurity`-gated with the caller set
*"the glob mechanics (split/merge) and the cash faucet"* — so **split and
merge remain the sanctioned mutators even for money.** Commodity lots need
nothing beyond them.

### ⚠⚠ CORRECTION to the merge hazard above

Coin now carries **`globIdentityFields = ['currency', 'denomination']`** —
the currency build's fix for the two-issuers-merge mint. That establishes
the house pattern for *"these stacks must not fuse"*, and the obvious
question is whether consignment should add the **consignor** the same way.

> **No — and the reason sharpens the design.**
>
> ⭐⭐⭐ **`globIdentityFields` is for what the matter IS, never for who
> holds it.**

Two things break otherwise: `globIdentityFields ⊂ persistentFields`, so a
consignor field would put **per-instance ownership back onto fungibles** —
exactly what [chattel.md](../../subsystems/chattel.md) refuses — and
identity-by-holder would **fragment a stack on every transfer**, since two
sacks of the same grain would stop merging the moment they changed hands.

⇒ **Segregated lots stand** (each listing holds its own), now with a better
justification than convenience: *currency is intrinsic to a coin; a
consignor is not intrinsic to grain.*

### ⚠ A gap this surfaces: the offer layer has no currency

`PricedOffer.prices` is `Record<offerKey, minorUnits>` — **bare numbers**,
while `Charge` carries a currency (*"the cut, in the charge's currency"*).
So the bar's `martini: 12` is denominated **by convention**, resolved at the
settling site.

> ⚠ Harmless at one currency; **the first locality to issue scrip breaks
> it** — a shop that wants to price in scrip cannot say so.

⭐ It is the same defect [currency-slate](./currency-slate.md) found one
layer down (*"the currency tag is dropped the moment money becomes
durable"*), surviving in the **offer** rather than the ledger. Worth fixing
when the supply chain gives multiple venues real pricing power, not before.

## ⭐⭐ Why this is a prerequisite, not a nicety

- **Partial purchase.** *"Buy 40 kg of grain"* rather than forty
  grain-objects. **Commodity trade is quantity-denominated by nature**, and
  discrete-only would have made the whole middle of the chain feel fake.
- ⭐⭐ **It has a name, a precedent, AND an existing design:
  [freight-slate § The warehouse receipt](./freight-slate.md).** That slate
  already reached the same primitive from the other direction — *"a
  **Document** naming a chattel **or a bulk quantity**,"* on the
  bearer/registered split (*"a bearer receipt is a Thing you can steal; a
  registered receipt is a record you cannot"*). **Fungible ownership by
  document is already the designed answer; this is its first consumer.**
  The discrete/fungible split maps to law's own **specific vs. fungible
  goods** distinction.

> ⭐⭐⭐ **And it solves [credit-slate](./credit-slate.md)'s collateral
> problem.** That slate concluded most lending would be **unsecured**,
> because a stripped parcel is worthless and seized content is worth less to
> the creditor than the author. **A warehouse receipt is neither** — it is
> fungible, market-valued, and transferable without the creditor wanting the
> goods. freight-slate says it outright: *"the origin of **collateral**: you
> can borrow against a warehouse receipt, the classic secured loan."*
> **Inventory financing is the classic small-business loan, and it is
> exactly what a distiller with aging casks needs.**

> ⭐⭐ **What the lint got wrong: it conflated "sellable" with
> "chattel-stampable."** Chattel models *specific* goods — this sword,
> forged by Bob, with a chain of title. **Owning a carrot is absurd;
> possessing it is not.** The store's own stock has the same issue from the
> other side (`buy` stamps the buyer), so one branch — *discrete → stamp,
> glob → split* — fixes both paths.

---

# Part 3 — How the chain connects: the store is the hinge

> **User: "is everything just consignment from farm to table?"**

**No.** The rule from Part 2 has a hard edge:

> ⭐⭐⭐ **Consignment settles on RESALE, so it only spans links where the
> good SURVIVES. A link where the input is CONSUMED by a transform cannot be
> consignment** — there is no resale event to settle against, and tracing
> value through a transform is exactly what the ledger refuses to do (*a
> price is an event between two parties*).

So the chain **alternates**:

> **Consignment is how you SELL. Purchase is how you BUY. The store is the
> hinge — and nobody ever consigns to a consumer.**

| Step | Mechanism |
|---|---|
| Farmer **consigns** grain / limes to the store | ✅ consignment (with Part 2) |
| Distiller **buys** them off the shelf | ✅ purchase |
| Distiller **consigns** bottled spirit back | ✅ consignment |
| Bar **buys** the spirit | ⚠ see the gap below |
| Patron buys a drink | ✅ ships |

⭐ **No direct B2B relationship anywhere, and no new commerce mechanism** —
which is also how farmers actually sold for most of history. Contracts came
with scale, not before it.

## ⚠ The one gap: a business cannot buy

`BuyController`'s payer is the command giver settling from their own
credential — fine for a player, nothing for a bar. ⭐ **v1 workaround costs
zero code: the bar's owner buys the bottles personally and carries them
in.** Crude, entirely diegetic, and it defers *"a purchase paid from a
business account"* to the first quality-of-life pass — the same **who pays**
seam [credit-slate](./credit-slate.md) circles.

## The chain is exactly as long as there are playable JOBS

Not as long as reality — real gin is grain → malt → wash → distil →
botanicals, four steps for *one* ingredient. A link earns its place if
someone could make a living at it ([vocations.md](../../vocations.md): *a
vocation exists iff there is unmet demand*).

> **Farmer → Distiller → Publican.** Both ends ship. **The middle is ONE
> trade pack.**

Malting, bottling and blending fold into the distiller's recipe ladder
rather than becoming their own vocations.

---

# Part 4 — ⭐⭐⭐ The stepping stone: spot market → contracts → the firm

> **User: "is that a stepping stone to a different model?"**

Yes — and each stage is **already a shipped subsystem**, so the progression
needs nothing invented. What changes is only which is *cheapest*:

| Stage | Mechanism | Cost it removes | Cost it adds |
|---|---|---|---|
| **1 — Spot market** | consignment + `buy` at the store | ⭐ **no capital to sell; no counterparty risk** | the store's commission; the walk |
| **2 — Direct purchase** | `buy` at the farm | the commission | **counterparty risk** returns; you must find each other |
| **3 — Forward contract** | [contract.md](../../subsystems/contract.md) clauses + escrow | ⭐ **harvest uncertainty** | capital locked in escrow |
| **4 — Vertical integration** | employment + parcel title | the market entirely | you now run a farm |

> ⭐⭐⭐ **The driver of the whole progression is TRANSACTION COST — which is
> literally Coase.** The firm exists because using the market has costs.
> Here the commission and the haul **are** those costs, so vertical
> integration emerges exactly when organising internally is cheaper than
> transacting. **Not a metaphor — the actual mechanism, and it will be
> observable.**

⭐ Stage 3 is the one agriculture historically *invented*, and for the reason
the game supplies free: **harvests are lumpy** (crops mature on a clock)
while a distillery wants steady input. A forward contract is the answer, and
`contract.md` already does clauses over verifiable conditions.

---

# Part 5 — Logistics, and who pays

> **User: "what about logistics? who pays for that?"**

## ⭐⭐ It already has a price, and it is already paid

Goods move because somebody **carries** them, and **encumbrance ships** —
`LoadBearing`, per-coin and per-item mass, the consequence ladder. Hauling
40 kg of grain is *already* costly in carrying capacity and time. **No new
mechanism is needed for logistics to have a cost.**

## ⭐⭐⭐ Who pays falls out of WHERE the sale happens

| Sale venue | Who hauls |
|---|---|
| the farmer consigns **at the store** | the **farmer** bore the carriage |
| the distiller buys **at the farm** | the **distiller** hauls |

> **The venue of the sale IS the delivery term.** That is **Incoterms** —
> FOB vs. delivered — and it needs no modelling, because the engine already
> makes place the settlement fact (`ensureOperatorAt(venuePath)`; *the money
> goes to the business because of WHERE the sale happened*).

⭐ So *who pays for logistics* is not a new question. **It is a consequence
of where two people chose to meet** — which is a negotiation, in the world,
with no schema.

## Haulage as a service already exists

*"Move 40 kg from Hinkley Hills to Terminus for 15 zorkmids"* is a **gig** —
`contract.md` has the board, the escrow and the verifiable condition.
⭐ **A courier vocation exists the moment somebody posts one**, with no
build.

## Freight is the OPTIMIZATION, not the prerequisite

[freight-slate](./freight-slate.md) earns its place when volume exceeds a
backpack: a cart carries more than a person, and **vehicles are durative**,
so time is the cost.

> ⭐⭐ **Von Thünen falls straight out**: the further from market, the more of
> a crop's value is eaten by haulage — so land use sorts by distance,
> unauthored. The freight slate already expects this; **the supply chain is
> what makes it happen.**

---

# Part 6 — ⭐⭐ The martini, end to end

> **User: "let's do the martini end to end."**

## The cast already exists in the seeds

The bar's bottles carry brands, and the brands carry a **competitive
structure nobody has to invent**:

| Brand | Owner | Role |
|---|---|---|
| ⭐ **Crowsfoot Gin** | `owner: ""` — *"a small-batch gin out of a little place across town — independent, carried by no corpo"* | **the player-ownable distillery** |
| **Vionne Rouge** (vermouth) | Vionne | corpo competitor |
| **Hollis Cane** (rum) | Hollis | corpo competitor |

> ⭐⭐ **A player distiller competes with two corpo brands for Dave's rail** —
> and the bar's own room description already says *"read the wall and you can
> read the whole avenue's quarrels."* The industry's politics is seeded.

## Lane A — gin (the independent)

| # | Step | Mechanism | Status |
|---|---|---|---|
| 1 | grow **grain** | `CultivableMixin` bed → `GrowingMixin` → harvest, grade from the worst stretch | ✅ substrate · ⚠ new crop |
| 2 | sell / buy | consign at the store → distiller buys | ⚠ needs **Part 2** if grain is fungible |
| 3 | **mash** grain + water | heat-gated transform; `/stuff/idea/material/bulk/water` ships, and the Hinkley standpipe is an `UnboundedReceptacle` source | ✅ **recipe shape ships** |
| 4 | ⭐ **ferment** → wash | **the durative transform** (Part 1). Temperature-driven, overshoots to **vinegar** | ❌ **the one new mechanic** |
| 5 | **distil** → neutral spirit | `requiresHeatK` + a `still` tool capability — *the smithing shape exactly* | ✅ **ships**, needs the tool + recipe |
| 6 | **compound** spirit + juniper → **gin** | redistil (heat) or macerate (durative) | ✅/❌ per choice |
| 7 | **bottle** | fill a `GradedReceptacle` (`interiorMaterial` + `interiorAmount`) | ⚠ **see the grade seam** |
| 8 | **brand** it | `_brandKey: crowsfoot-gin`, `BrandedMixin` resolve-on-read | ✅ ships |
| 9 | sell to the bar | consign bottles → the owner buys and carries them in | ✅ (Part 3 workaround) |

## Lane B — vermouth, and the convergence that makes it interesting

grapes → **ferment** → wine → **fortify with neutral spirit + infuse
botanicals** → vermouth.

> ⭐⭐⭐ **Vermouth needs Lane A's own output.** Fortified wine takes spirit,
> so the vermouth maker must **buy from the distiller** — a real B2B
> relationship that falls out of the chemistry rather than being authored,
> and it puts the distiller at the centre of the trade.

## The bar end is untouched

`order martini` → the shipped recipe (gin 0.06 L + vermouth 0.01 L, both
`minGrade: fair`, `mixing-glass`) → settle a presented Charge → the bar's
P&L. ⭐ **Nothing changes here. That is the point** — the sink is finished,
and the whole build is upstream of it.

## ⚠ The grade seam to verify first

`gradeBand: fine` sits on the **receptacle** (`GradedReceptacle`), not on
the material — a *bottle* is graded, not the gin in the abstract. So
**filling a bottle from a vat must carry the batch's grade onto the
bottle.** If it does not, every distilled spirit arrives ungraded and
`minGrade: fair` rejects it. **Check this before building anything else** —
it is small, and it is load-bearing for the entire chain.

⭐ **Grade should come from the process, symmetric with husbandry**: a crop's
band comes off the plant's *worst stretch*; **a batch's band should come off
its worst temperature stretch.** Same rule, second consumer, no new concept.

## ⭐ Sequencing — the martini is the superset

| | ferment | distil | malt/mash | compound | convergent |
|---|---|---|---|---|---|
| **daiquiri** — rum + lime | ✔ | ✔ | — | — | — |
| **martini** — gin + vermouth | ✔ | ✔ | ✔ | ✔ | ⭐ ✔ |

**Cane ferments directly (no malting) and lime is pressed, not distilled** —
so the daiquiri is the strictly smaller loop, and the martini chain
**contains it**. Building the martini gets the daiquiri for **two crops and
one recipe, with no new mechanics.**

> ⚠ **But the martini also contains the hardest single ingredient** —
> vermouth, which cannot be made until the gin lane runs. **If one working
> loop is wanted before anything else, the daiquiri is it; if one push to
> unlock both is wanted, the martini is right.** The user's instinct is
> defensible either way — this is a staging call, not a design one.

## What is genuinely new, all in

**Code:** the durative-transform mixin · fungible consignment (Part 2) ·
grade carry-across on bulk fill (verify — may already work).

**Content:** crops (grain, grapes, juniper) · materials (grain, wash, wine,
neutral spirit, **vinegar**, juniper) · fixtures (mash tun, fermenting vat,
still, **a cold cellar**) · recipes (mash, distil, compound, fortify) · a
`distilling` Discipline · the premises — *"a little place across town."*

⭐ **Everything else in the chain is already shipped substrate.**

---

# Build order

| # | | Why here |
|---|---|---|
| 1 | ⭐ **Delete the four `populates:` bottle lines** | creates the demand that pulls everything else |
| 2 | **Fungible consignment** (Part 2) | prerequisite — every middle link trades in bulk |
| 3 | **Crops**: grain, cane, grapes, limes, juniper | content on a shipped pattern |
| 4 | ⭐ **The durative-transform mixin** + a cellar | the only new mechanic |
| 5 | **The distilling trade pack** — recipe ladder, still, vat, cask | the middle, as one trade |
| 6 | **A business can buy** | promotes the carry-it-in workaround |
| 7 | Forward contracts · haulage gigs · freight | the progression, as volume demands |

---

# Open questions

1. ⚠ **Does the durative mixin belong to a new `lib/` subsystem, or under
   crafting?** It is transformation (crafting) measured in time (husbandry)
   and sits between. *Leans its own folder* — the mixin-placement rule says
   propose a subsystem rather than force a fit.
2. ⭐ **How many crops before the chain feels real?** Four ingredients ×
   their sources is the floor. *Leans: ship the martini's chain complete
   before starting the daiquiri's* — one working loop beats two half ones.
3. **Does the distiller's output consign as bulk, or as sealed bottles?**
   Bulk is truer and needs Part 2; bottles are discrete and work today. ⚠ The
   bar draws in litres either way.
4. ⚠ **Is a per-draw settlement ("sale or return") ever wanted** — the bar
   pays the distiller per 0.06 L poured? Mechanically possible, since the
   draw is an event. *Leans no for v1* — it makes the bar's cost of goods
   invisible, which is the opposite of what deleting the bottles achieves.
5. **Should the store take commission on commodities at all?** It is the
   transaction cost that motivates Stage 2 — so *leans yes*, and the rate is
   the dial that decides when direct trade begins.
6. ⚠ **What stops the store being the only market forever?** Nothing, if the
   commission stays low. That is fine — **the progression should be pulled
   by volume, not pushed by design.**
