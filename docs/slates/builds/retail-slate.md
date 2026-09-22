# Retail slate (working doc)

> **Status: PARTIAL** — S1, the general store, shipped (MR !143):
> `PricedOffer`, the `Stock` counter, consignment over chattel,
> `buy`/`consign`/`reclaim` → [retail.md](../../subsystems/retail.md)
> **Left:** S2 the Circulation Reserve (the welfare-floor buy) ·
> S3 producer + real cost/supply pricing (the derived stance, then
> characterization) · S4 player-owned storefronts, franchising and the
> market arena · ⚠ **a business never stands DOWN** (below) · the
> standing bar-refresh intent
> **Size:** a build

Working slate for the **shop** — the **retailer** business archetype and
the multi-build arc it lives across. The governing framing, and the
reason this isn't one build: **a shop is one small build plus two economy
substrates it grows into.** The retail counter ships complete-at-its-tier
now; it gets richer as the Circulation Reserve and the producer/pricing
supply chain land beneath it, and is never half-grown at any stage.

This slate owns the **build decomposition** (what ships when, at what
magnitude, gated by what). The underlying *theory* lives in the economy
slate; this references it rather than re-deriving it.

See also:

- [economy-slate](./economy-slate.md) — **the theory spine.** The two
  conservation-clean shop models (bounded merchant vs consignment; the
  default *sells and brokers, does not fixed-price-buy*, §3 Circulation);
  *pricing is characterization* / stance-not-property (§ Pricing);
  player shops as "the apex of the model" (§ Player shops); corpo retail
  — producers/franchisers/the market arena (§ Corpo retail); the
  reserve-governed labor faucet (§ Employment). This slate is the *build
  plan* for that design surface.
- [../../staging/terminus-city.md](../../staging/terminus-city.md) §6–7 —
  the **Atmosphere / Ledger economy + the Circulation Reserve autopilot**.
  This is **S2 below** — the shop *references* it, does not own it: it's
  the city's core deliverable in its own right, and the shop is one
  consumer that lights up when it lands.
- [../../staging/terminus-banking.md](../../staging/terminus-banking.md) —
  the business-landscape model (everything is a business; one money-tier
  fixed at birth; real is derived from player money-loops), the
  bank-banks-with-itself pattern, the early corpo royalty. The shop is
  the second worked instance of that model after the bank.
- [../../subsystems/banking.md](../../subsystems/banking.md) — `settle` /
  `Charge` (a purchase is a settled charge), the conserved ledger, the
  opening-float precedent, the CB `subsidy` / deficit-P&L seam.
- [../../subsystems/attendant.md](../../subsystems/attendant.md) — the
  storefront-attention counter the shopkeeper attends you at (reception /
  scrum / line disciplines already ship).
- [../../subsystems/employment.md](../../subsystems/employment.md) — the
  `Business` entity + roster + wages + tips the shop is built on (the
  shopkeeper is an on-shift employee).
- [../../subsystems/crafting.md](../../subsystems/crafting.md) — the bar's
  `Menu` / `priceFor` / `order` offer pattern the retail counter
  generalizes (and the moment to refactor the bar onto a shared
  storefront abstraction).
- [corpos-slate](./corpos-slate.md) — the megacorp affiliation/competition
  fault line + the `Branded` mark. **S4** (franchising + the market
  arena) is corpo Phase-2 pointed at retail.
- [mining-slate](./mining-slate.md) — the **producer** side of **S3**
  (the mine as a resource-node-plus-labor faucet); mining-as-play grounds
  what a producer business actually does.
- [../../roadmap.md](../../roadmap.md) — the surfaced-but-deferred
  "Economy / trade" backlog this stages.

---

## The retailer, among the business archetypes

Sort businesses by *which player money-loop they touch* (the
business-landscape model), and four archetypes fall out. The shop is one
of them, distinct from everything shipped:

| Archetype | Example | Player loop | Status |
|---|---|---|---|
| **Producer** | mine, farm, workshop | work (wages) · sell what you gathered | S3 (mine); farming its own slate |
| **Retailer (shop)** | general store | **spend** (buy) · **sell/consign** | **this slate** |
| **Maker-seller** | Dave's Bar | spend (buy the made good) | shipped (crafts *on demand*, no stock) |
| **Service** | bank, clinic, TPA | spend (buy a service) | bank shipped |

The retailer's defining difference from the shipped maker-seller (the
bar): it holds a **persistent, priced, bounded stock** and both **sells
from** and **buys/brokers into** it. The bar crafts on demand and has no
stock; the shop's whole nature is the stock and the spread.

## The conservation crux (why the arc splits where it does)

One fact shapes the entire arc: **a *sell* price cannot break the
economy, but a *buy-from-player* price can.**

- **Selling to a player is a transfer** — the player's real coin moves to
  the shop's account; nothing is minted. A "wrong" sell price is only a
  good or bad *deal*, self-correcting via player behavior. Sell prices
  are a **feel knob, not a safety knob.** (Notional restock is fine too:
  items aren't money, so converting free Atmosphere stock into real
  player coin is a *sink*, not a mint — it's the money players spend
  *into* the NPC economy.)
- **Buying from a player at a fixed price is the faucet** — the classic
  vendor-trash money printer. Conservation-clean buying is either a
  **bounded merchant** (real, finite till; won't buy what it can't
  resell — the solvency filter *is* the anti-vendor-trash rule) or
  **consignment** (list + commission, never fronts coin). The bounded
  merchant paying *guaranteed instant coin* as a welfare floor needs the
  till backed by the **Circulation Reserve** so it never lies about being
  bottomless.

So the sell side and the consignment side are safe to ship immediately;
the instant-coin buy side is deferred to the reserve — and that fault
line *is* the S1 ↔ S2 boundary.

## Pricing model (how prices are actually set)

There is deliberately **no price oracle** (Law 1: *count things, don't
price things* — worth is not a stored property of a good). A price is the
shop's **stance**, authored on its offer/price-list, exactly as
`Menu.prices` authors drink prices on the *Menu*, never on the drink.
Different shop → different price, legitimately.

- **later (S3): derived stance.** Once there's a real supply chain,
  price *derives* from cost-plus (what the shop paid its supplier) and
  supply/demand (stock level). The `priceFor` seam stays; only its source
  gets smarter.
- **later still: characterization.** Stance that varies by *who you are*
  (recognition discounts, relationship) — the recognition-slate forward
  link; flat in v1.

---

## The build arc

Dependency spine: **S1 stands alone → S2 unlocks the buy side → S3
unlocks real pricing + closes the loop → S4 makes it player-owned.** Each
build ships a *complete* shop at its tier; the deferred beats are clean
seams, not stubs.

### S1 — The general store (the retail primitive) · *small–medium* — **SHIPPED (MR!143)**

> **Shipped** → [retail.md](../../subsystems/retail.md) + [chattel.md](../../subsystems/chattel.md): the `Stock` counter, buy-that-stamps, custody-vs-ownership consignment, the reset sweep, `PricedOfferMixin` extracted from the bar's `Menu`, the five staples. One standing intent survives:

- **Bar-cleanup opportunity:** this is the second retail-shaped venue, so
  it's the moment to extract a shared **storefront / offer / price-list**
  abstraction and refactor Dave's Bar (written long ago) onto it — the
  second example that justifies generalizing. **Standing intent across the
  whole arc:** Dave's Bar is the **living reference venue** — each retail
  build refreshes it onto the newly-generalized patterns so its code never
  drifts stale. Budget bar-refresh work into S1–S4, not just S1.

### S2 — The Circulation Reserve (referenced, not owned) · *large · the city core deliverable*

**This is the city-economy build, not a shop build** — see
[terminus-city.md](../../staging/terminus-city.md) §6–7. The shop is one
consumer. Listed here only for the dependency it satisfies.

- **What it is:** the two-layer Atmosphere / Ledger economy + the
  CB-governed Circulation Reserve faucet/sink + reserve autopilot
  (default-safe) + the reserve-governed labor faucet.
- **What it gives the shop:** the **welfare-floor buy** — a bounded
  merchant can now pay *guaranteed instant coin* for staples, because the
  reserve backs the till without minting per-shop. This is the honest
  home for the "bootstrap / welfare" concern: welfare is **monetary
  policy** (the CB expanding supply into a governed reserve), *not* a shop
  feature. Lands *everywhere at once* when the reserve does.
- **Until then**, bootstrap is the onboarding stipend + wages (take a
  job) — "sell your ore" is "consign it, or go work the mine," which is
  arguably the right incentive anyway (labor over vendor-dumping).

### S3 — Producer + real pricing (the supply chain) · *medium–large*

Closes the full **mine → ore → shop → player** loop with *real*
economics. Depends on S2 (real cost needs real coin flowing).

- **The producer archetype** — the mine (resource node + labor → goods);
  see [mining-slate](./mining-slate.md). The upstream half of the loop.
- **Derived pricing** — cost-plus (from the shop's real acquisition cost)
  + supply/demand (from stock level). Ore prices *move* because the
  shop's coin and the supply are both real.
- **The corpo-retail supply chain** — corpos as upstream wholesalers,
  shops as downstream retail (economy-slate § Corpo retail); none of it
  mints (all transfers).

### S4 — Player-owned shops + the market arena (the apex) · *medium–large · its own build*

The economy-slate calls player shops "the apex of the model." Kept
distinct from S3 on purpose.

- **Franchising as the capital on-ramp** — a corpo fronts capital +
  inventory + brand, the player fronts the labor, they split the margin
  (solving "how does a broke player stock a shop"); running a franchise
  raises standing with that corpo (the retail twin of "your bank is a
  corpo-affiliation"). Corpo Phase-2 pointed at retail — see
  [corpos-slate](./corpos-slate.md).
- **Player storefronts / pushcarts / vendor stalls** — the same object as
  an NPC shop (a located holder of goods + stances); comparison shopping
  costs you a walk (un-aggregated by design — the anti-"search every shop
  for the cheapest blade" stance).
- **The market-competition arena** — whose franchises win the street's
  consumers *is* the corpo market-share competition, made concrete and
  visible in the bazaar.

---

## Open questions (for when each build opens)

- **S1 — the storefront abstraction.** Extract a shared offer/price-list
  primitive and refactor the bar onto it *within* S1, or ship the store
  standalone and refactor as a fast-follow? (Leaning: within S1 — the
  second example is the right time.)
- **S1 — consignment settlement at low DAU.** With no reserve, a consigned
  good needs a real player buyer. Is P2P-only consignment satisfying
  enough to ship, or does S1 lean on the existing CB `subsidy` /
  deficit-P&L seam for a thin notional-demand settlement? (Leaning:
  P2P-only; keep the notional buyer for S2.)
- **S3 — where dynamic pricing lives.** On the offer object
  (`priceFor` derives) vs a separate market/price-index service. Ties to
  how the Atmosphere demand model is shaped in S2.
- **S4 vs S3 boundary.** Does the *first* player-run store (a single
  proprietor, no franchising) ride S3, with franchising + the arena as
  S4? Or is any player ownership S4? (Open.)

---

## ⚠ Wire finding (consequence build, 2026-09-10) — a venue visited once is operated forever

`EmploymentApi.ensureOperatorAt` stands a business up **lazily on the
first `order`**, which is right: a room with a tariff and no operator
would otherwise serve on the house, silently, forever. But **nothing
anywhere stands one down again.**

⭐ It surfaced as a *dirtiness* question rather than a bug.
`consequence.dirty.wire.test.ts` had to be marked dirty for exactly one
reason — every other command in it is a read — and that reason is *"the
infirmary's business stands up and stays up."* A wire file's dirty reason
is a question for the owning trade, and this is the question: **what ends
an operation?**

Candidates: nothing (correct if standing up is genuinely permanent — say
so); an idle sweep (the `AttendantLogic` lease-eviction shape); or the
roster deciding it (no positions filled for N days → not operating).

⚠ It matters beyond tidiness because **the P&L is derived from operating
businesses**: a realm where every venue anyone ever ordered from is
permanently "operating" reports an economy that is not happening.
