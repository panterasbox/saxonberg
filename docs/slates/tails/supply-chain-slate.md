# Supply-chain slate — the missing middle, and how goods actually move

> **Status:** PARTIAL — the whole chain this slate asked for shipped: the
> magic-bottle deletion, the durative transform, fungible consignment (in
> a simpler shape than designed here), the distilling/winemaking/brewing
> trades with the Crowsfoot/Vionne/Hollis competitive cast, and a business
> account that can buy → see [maturation.md](../../subsystems/maturation.md),
> [chattel.md](../../subsystems/chattel.md),
> [employment.md](../../subsystems/employment.md),
> [corpo.md](../../subsystems/corpo.md),
> [content-packs.md](../../subsystems/content-packs.md).
> **Left:** the offer layer has no currency (`PricedOffer.prices` is bare
> minor units, Part 2) · rung 2 — a direct farmer→distiller purchase
> (bypassing the store) has no authored example (Part 4) · rung 3 — a
> forward contract on a crop has no authored example (Part 4) · rung 4 —
> vertical integration (one owner across farm/distillery/bar) has no
> authored example (Part 4) · what stops the store being the only market
> forever (Open question 6, doctrine)
> **Size:** a tail

**Captured 2026-08-04**, out of *"Dave's Bar is going to be one of the first
full verticals to ship."*

> **User: "right now we've only modelled the ends of the supply chain.
> Farming is more or less there and the bar itself is more or less there,
> but everything in between we haven't really designed, and if we don't want
> a magic economy I think we need it to go live."**

Related: [crafting.md](../../subsystems/crafting.md),
[retail.md](../../subsystems/retail.md),
[chattel.md](../../subsystems/chattel.md) (discrete-goods-only),
[stacks.md](../../subsystems/stacks.md),
[husbandry.md](../../subsystems/husbandry.md) (⭐ the shape the new mixin
copies), [smallholding.md](../../subsystems/smallholding.md),
[banking.md](../../subsystems/banking.md) (the bar's P&L),
[contract.md](../../subsystems/contract.md) (forward contracts; haulage
gigs), [employment.md](../../subsystems/employment.md),
[content-packs-slate](../builds/content-packs-slate.md) (⭐ *pack = a TRADE*; *seed
backwards from sinks*), [freight-slate](../builds/freight-slate.md),
[credit-slate](../builds/credit-slate.md) (the cold start),
[vocations.md](../../vocations.md).

---

# Part 0 — ⭐⭐⭐⭐ The magic is four lines, and the fix is a deletion

✅ **SHIPPED.** Dave's Bar carries no `populates:` bottles: the rail is
stocked by the keeper buying against the par sheet, and what she bought
persists as chattel of the business across a reboot
(`world/lounge/location/bar.yaml`; the `restocks` brain,
[employment.md § the keeper reads the par sheet and buys](../../subsystems/employment.md)).

---

# Part 1 — ⭐⭐⭐ The one genuinely missing mechanic: a durative transform

✅ **SHIPPED** — the fermentation build (2026-09-01, MR !215) and the
maturation rename that followed it. `MaturingMixin`, the growth-accretes/
maturation-converts distinction, the overshoot-to-vinegar stakes, and the
cold cellar as the diegetic mitigation for the no-far-past-guard tension
are all in [maturation.md](../../subsystems/maturation.md). The
independently-confirmed *"follow husbandry, not metabolism"* parallel with
magic-item charge decay is in
[magic-items.md § an item must decay while nobody is looking](../../subsystems/magic-items.md).

---

# Part 2 — ⚠ Proposed change to shipped code: fungible consignment

✅ **SHIPPED, in a simpler shape than designed here.** The slate proposed
segregated per-consignor lots (a `stackIdentityFields` consignor tag, a
warehouse-receipt document of title). What actually shipped needs neither:
`consign` takes **one unit** off a stack and titles it — a lot of one
cannot merge, so there is nothing to segregate. See
[chattel.md § a stack cannot bear title; a lot of one can](../../subsystems/chattel.md)
(the same textile-chain story this slate anticipated) and
`ConsignController`. The credit-slate collateral hope rode a bearer
warehouse receipt that was cut before merge — the logistics batch's
ledger (`docs/plans/slate-compaction/logistics.md`) has that call.

### ⚠ A gap this surfaces: the offer layer has no currency

`PricedOffer.prices` is `Record<offerKey, minorUnits>` — **bare numbers**,
while `Charge` carries a currency (*"the cut, in the charge's currency"*).
So the bar's `martini: 12` is denominated **by convention**, resolved at the
settling site.

> ⚠ Harmless at one currency; **the first locality to issue scrip breaks
> it** — a shop that wants to price in scrip cannot say so.

⭐ It is the same defect [currency-slate](../builds/currency-slate.md) found one
layer down (*"the currency tag is dropped the moment money becomes
durable"*), surviving in the **offer** rather than the ledger. Worth fixing
when the supply chain gives multiple venues real pricing power, not before.
Verified still true: `packages/server/src/mud/lib/commerce/PricedOffer.ts`
carries no currency field today.

---

# Part 3 — How the chain connects: the store is the hinge

✅ **SHIPPED**, exactly as designed: consignment is how you sell, purchase
is how you buy, and the store is the hinge — verified end to end in the
shipped chain (a farmer's crop consigns, the distiller buys and consigns
spirit, the bar buys via `wallet use house`). The *"a business cannot buy"*
gap is closed: `wallet use house` makes the wallet's active account the
buying principal, documented in
[employment.md § wallet use house](../../subsystems/employment.md). *"The
middle is ONE trade pack"* is exactly what shipped — `trade-distilling`,
documented in
[content-packs.md](../../subsystems/content-packs.md).

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

⚠ **Verified 2026-09-20: stage 1 shipped** (the farmers-market spot
market — consignment stalls off the counting-houses, per-shelf caps) **and
stages 2–4 have no authored example.** Nothing new needs building for any
of them — `buy` already works at any `Stock`/shelf, `contract.md`'s
clauses already do forward escrow, employment + parcel title already do
vertical integration — but nobody has authored a farmer selling direct to
a distiller's own counter, a forward contract on a harvest, or a business
that owns both a farm and a still. That is genuinely open content, not
open design.

---

# Part 5 — Logistics, and who pays

✅ **SHIPPED and documented.** *"It already has a price, and it is already
paid"* (encumbrance) and *"who pays falls out of where the sale
happens"* (the Incoterms point — `ensureOperatorAt` routes revenue to
whoever operates where the sale happened) are both in
[employment.md](../../subsystems/employment.md) and
[encumbrance.md](../../subsystems/encumbrance.md). *"Haulage as a service
already exists"* — the gig board's `delivery`/`supply` conditions — is in
[logistics.md § the condition vocabulary is closed](../../subsystems/logistics.md)
(the separate logistics-batch compaction pass covered this in full;
see `docs/plans/slate-compaction/logistics.md`).

## Freight is the OPTIMIZATION, not the prerequisite

[freight-slate](../builds/freight-slate.md) earns its place when volume exceeds a
backpack: a cart carries more than a person, and **vehicles are durative**,
so time is the cost.

> ⭐⭐ **Von Thünen falls straight out**: the further from market, the more of
> a crop's value is eaten by haulage — so land use sorts by distance,
> unauthored. The freight slate already expects this; **the supply chain is
> what makes it happen.**

---

# Part 6 — ⭐⭐ The martini, end to end

✅ **SHIPPED**, essentially as designed. The competitive cast (Crowsfoot
Gin the independent, Vionne Rouge, Hollis Cane) ships and is documented in
[corpo.md](../../subsystems/corpo.md) and
[content-packs.md](../../subsystems/content-packs.md); the vermouth
lane's dependency on the distiller's spirit (the B2B leg) is documented
in content-packs.md's `trade-winemaking` entry; the grade-carry-across
seam (a bottle inherits its batch's grade) is
[maturation.md § the transfer seam carries the batch's identity](../../subsystems/maturation.md);
the glass pool, rail rule and recipe resolution are
[crafting.md § the glass pool, the technique, ice, garnish](../../subsystems/crafting.md).
The martini-contains-the-daiquiri sequencing call was moot in practice —
both recipes ship (`trade-hospitality/content/recipes/martini.yaml`,
`daiquiri.yaml`).

---

# Build order

✅ All seven steps shipped — see Parts 0–6 above.

---

# Open questions

1. ✅ Resolved — its own subsystem: [maturation.md](../../subsystems/maturation.md)
   (`lib/maturation/`).
2. ✅ Resolved — ten grown families ship (`trade-farming`), including the
   martini chain's own crops (barley, juniper, grapes, limes).
3. ✅ Resolved — bottles, as `GradedReceptacle`, carrying grade from the
   batch. [maturation.md](../../subsystems/maturation.md).
4. ✅ Resolved as leaned — no per-draw settlement; the bar buys bottles,
   not pours.
5. ✅ Resolved — yes, the store takes commission on every consignment sale
   (`BuyController`).
6. ⚠ **What stops the store being the only market forever?** Nothing, if the
   commission stays low. That is fine — **the progression should be pulled
   by volume, not pushed by design.**
