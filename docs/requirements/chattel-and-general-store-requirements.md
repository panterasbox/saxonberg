# Chattel possession core + the general store — requirements

A property-first cycle: land the **chattel possession core** (per-instance ownership of goods — the twin of the shipped parcel title) and prove it with the first **retailer** business, a **general store**. The store is the S1 slice of the [retail slate](../slates/builds/retail-slate.md); it now rides *real* ownership rather than a possession stand-in, and its consignment loop is the proving consumer that forces the ownership design honest (custody-vs-ownership is exactly what a shop tests). One cycle, splittable into two MRs at the substrate↔consumer line.

The chattel core is the [property slate](../slates/builds/property-slate.md)'s Phase-0 possession core, chattel half — a foundation pets, apartments, ranching, and retail S4 all want, built once, first. Scope is the **minimal ownership slice**: the owner-stamp, `ownerOf(item)`, and first-class transfer. The compute/economy machinery of property (cost-owner, the `Charge`-debtor gap, allowance) stays deferred to later property phases.

Built on shipped substrate: the parcel-title precedent (`ParcelApi`/`ParcelRegistry`/`parcel_events` — the pattern the chattel registry mirrors), `ProvenanceApi.authorOf` (the ownership fallback), the persistence spine (durable instance identity), `Business`/employment, Attendant, banking `settle`/`Charge`/splits, containment, the bar's `Menu` offer pattern (generalized), Corpo `Branded`. No new economics: every money leg is a transfer, nothing mints.

## Goals

### The chattel possession core

- **Goods have per-instance ownership, stored unspoofably.** Ownership of a movable good (a Stuff instance) is a row in a **separate, gated registry** keyed on a **durable per-instance id** — the twin of the `parcels` registry, and for the same governing reason: ownership must not be spoofable by editing the item, and must survive the item moving between containers. Never a field on the editable item.
- **`ownerOf(item) = stamp ?? authorOf`.** A per-instance owner-stamp overrides; absent a stamp, ownership defaults to the item's author (via the shipped `authorOf` resolution). So unstamped content items resolve cleanly to their author with **no world-wide restamp**, and only goods that have actually changed hands carry a stamp.
- **Ownership is distinct from custody.** *Custody* is possession/containment (who is holding it); *ownership* is the stamp. The two move independently — a good in someone else's custody can still be yours. This split is the whole point, and consignment is its first real exercise.
- **First-class transfer.** Ownership transfers by writing a stamp (mirroring a parcel `transfer` writing a title row), through a gated Api, with the actor derived from execution context — never a caller-supplied param. A transfer is auditable (the `parcel_events` chain-of-title precedent).
- **A gated `ownerOf`/`stamp`/`transfer` surface** (`ChattelApi`/`ChattelLogic` over a `ChattelRegistry`, mirroring the parcel trio) — the single legitimate path; the registry's methods gate to the facade.
- **Proven beyond the store.** A demo/test vehicle exercises the ownership core independent of the shop (a good is stamped, `ownerOf` resolves, a transfer re-stamps, ownership survives a container move + a persistence round-trip) — so it's a real substrate, not shop-specific.

### The general store (the proving consumer)

- **A general store exists as a complete `Business`** — a proprietor, a clerk position on a roster (= hours), an operating account (its P&L: buy income + consignment commission − clerk wages), one storefront location. **Independent** (not a corpo franchise — that's S4).
- **The buy loop works, and stamps ownership.** `buy <thing>` over authored priced stock settles a `Charge` (cash **or** card), credits the store account, hands over the item, decrements stock, and **stamps the buyer as owner**. Prices are the store's **authored stance** (a price-list, Law 1 — never on the good), calibrated to the shipped stipend/wage/coinage anchors.
- **Stock is reliably available via the reset sweep.** The store's stock is a `ResettableMixin` consumer; its `reset()` **tops each stock line to authored par** (cloning missing staples — notional restock, items not money). The reset sweep is the deferred game-time restorative sibling of the shipped eviction sweep (`residency.md`), landed here complete-at-tier (any `ResettableMixin`), presence-walk-aware, with the shop overriding the presence-skip (restock-while-browsed is fine).
- **The consignment sell loop works, on real ownership, conservation-clean.** `consign <thing>` at an ask **moves custody** to the store's consignment shelf while **your owner-stamp stays put**; when **another player buys it**, the ask splits (commission → store account, remainder → the consignor's **primary bank account**), custody *and* the owner-stamp transfer to the buyer, and the listing clears. The store **never fronts coin** (zero faucet). `reclaim` returns custody of an unsold listing (ownership never left you). `consign` requires the consignor to hold a bank account (nudge otherwise). A **per-consignor listing cap** guards the shared consignment shelf (the withdrawal-quota sibling).
- **The store runs Attendant** — a clerk attends purchases (staffed-during-hours, instant/scrum), reusing the shipped storefront-attention substrate + its lease.
- **Dave's Bar and the store share one offer model** — a shared priced-offer/price-list abstraction is extracted; the bar's `Menu` and the store's stock both consume it; **the bar retains behavioral parity** (existing bar tests are the gate).
- **Subsystem docs land** (finalize): a chattel/possession doc (or a property-doc section) for the ownership core, and a retail doc for the store; `residency.md` graduates the reset sweep.

## Non-goals

### Chattel core
- **The property compute/economy.** Cost-owner / compute attribution, the parcel tax, allowance — Phase 1 of the property slate. The chattel core is **pure ownership, no economy** (the slate's "Phase 0 … no economy yet").
- **The `Charge`-has-no-debtor gap.** Tying ownership into who-pays / debt is the economy tie-in — deferred with the compute phase.
- **General transfer economy** — a player-facing `give <item> to <player>` gifting verb, trades, disputes/theft/recovery, escrow. The transfers in scope are the store's (buy/consign-sale) + the `ChattelApi.transfer` primitive they call; a general gifting/exchange surface is deferred (though the primitive makes it a thin later add).
- **Ownership of real property or slots** — that's parcels (shipped 0a) and host-parcel structure. Chattel bottoms out at the movable good.

### The general store
- **The NPC buying goods for its own coin** (fixed-price-buy / welfare-floor buy) — the vendor-trash faucet, deferred behind the Circulation Reserve (retail S2). S1 sell-side is consignment only.
- **Cost-plus / supply-demand pricing** (retail S3); **the producer / mine** (retail S3); **player-owned shops / franchising / the market arena** (retail S4); **depleting/scarce stock**, **auctions/expiry**, **a bazaar** — all later.
- **Other reset-sweep consumers** (respawning NPCs, resource nodes, container/door repop) — the sweep ships complete but only the shop is wired; and its own residency seams (memory-pressure, incremental sweeping) stay deferred.

## Surface decisions

### Property-first, one cycle, two MRs (option B)
Chattel-possession is a foundation many builds want (pets/apartments/ranching/retail-S4), so it's built first and the store consumes it — not a shop-local possession pointer migrated later. Keeping it one cycle (with the store as the proving consumer) gives the real foundation *and* a visible payoff, and forces the ownership design honest against consignment. Split into two MRs at the substrate↔consumer seam.

### Ownership is a registry fact, not a mixin field (the parcels twin)
Ownership lives in a gated `ChattelRegistry` keyed on a durable instance id, resolved `stamp ?? authorOf` — mirroring `ParcelRegistry`/`ownerOf(path)`. No `Ownable` mixin and no owner field on the item: ownership applies to any durably-identified instance, and unstamped items fall back to author. This holds the security invariant (unspoofable, stored apart from editable content) and avoids stamping every scrap in the world.

### The durable instance identity is the crux (resolved in planning)
Parcels key on durable zone paths; chattel needs a **durable per-instance id** that survives persistence and container moves. Whether the shipped **persistence spine** already affords one (instances it persists), or the chattel core must **mint a durable id on first stamp** (and persist it), is the load-bearing architecture question for the plan. The requirement is the *property* — ownership keyed on a stable per-instance identity — not the mechanism.

### Custody-vs-ownership is the consignment model
With the stamp, consignment needs no bespoke `consignorKey` ownership pointer: **custody (containment) moves to the shop; the owner-stamp stays with the consignor**; the sale transfers the stamp to the buyer; reclaim returns custody. The consignment *listing* still exists as a brokerage record (ask price, commission, the custody relationship), but "whose is it" is answered by the ownership registry, not the listing.

### Minimal chattel scope; store decisions carried from S1
The chattel slice is owner-stamp + `ownerOf` + transfer (+ the store consuming it), deferring the economy. The store's own decisions are unchanged from the S1 requirements: **buy + consignment both in**; **consignment payout → the consignor's primary bank account**, account required to consign; **per-consignor listing cap**; **reliably-available stock via the reset sweep** (folded in, shop `reset()` overrides the presence-skip); **independent store**; **instant/scrum staffed counter**; **sales tax reuses `remitDemoTax`** (consignment tax = the store's commission); **prices authored as stance**, calibrated to stipend 20 / wages 4–6 per game-hour / coinage 1/5/25; **the bar refactor is in-scope with parity a hard constraint**.

## Constraints

- **The chattel registry mirrors the parcel registry's security invariant** — ownership stored SEPARATELY from the editable good, in a gated collection, resolved through a facade Api; the registry methods gate to the facade (`FromModule`), actor derived from context, never a param. `ownerOf(item) = stamp ?? authorOf` reuses the shipped `authorOf` resolution.
- **Ownership must survive persistence and container moves** — the durable-instance-id property is load-bearing; a good you own, logged out and back, still resolves to you; moving it between containers doesn't change its owner.
- **Conservation / banking invariants** — every money leg is a transfer through `settle`/`postTransaction`; nothing mints. A consignment sale splits a real buyer's coin to two real accounts; the store never fronts coin. Law 1 (no worth on a good — price on the offer), Law 2 (no scheduled maintenance drain; restock touches items, never balances).
- **Reuse shipped substrate, no new primitives where one fits** — the parcel trio as the chattel template, `authorOf`, the persistence spine, `Business`/employment, Attendant + lease, banking (`settle`/`Charge.splits`/`primaryAccountIdOf`/tax), containment, the bar offer pattern (generalized), `Branded`, the residency sweep home. The net-new pieces are the **chattel ownership registry**, the **retail counter**, the **consignment listing + cap**, and the **reset sweep**.
- **Anti-grief is a completeness requirement** — the consignment shelf ships with its per-consignor cap; the counter's exclusive attention reuses the Attendant lease.
- **Bar behavioral parity** — the offer-abstraction extraction must not change the bar's observable behavior; existing bar tests are the regression gate.
- **Module taxonomy / gating** — the chattel Api/logic-singleton/registry mirror the parcel trio's homes; retail substrate in its own `lib/` home; content under `domain/terminus/` + seeds; no invented module-file categories (a new `retail` command category + new `lib/` subsystem folders get explicit sign-off).

## Acceptance criteria

- Ownership of a good resolves via a gated `ownerOf(item)` = stamp-or-author; a `transfer` re-stamps; ownership is stored in a gated registry keyed on a durable per-instance id, **NOT** a field on the item. Covered by tests.
- Ownership **survives** a container move and a persistence round-trip (log out / back), and defaults to the author for an unstamped item. A demo/test vehicle proves the core **independent of the shop**. Covered by tests.
- A general store exists as a `Business` (proprietor + clerk + roster + account) with one storefront + a running P&L. Covered by tests.
- `buy <thing>` settles a `Charge` (cash **and** card), credits the store, hands over + **stamps** the item to the buyer, decrements stock; the reset sweep restores stock to par (any `ResettableMixin`; shop overrides the presence-skip; no eviction regression). Covered by tests.
- Prices come from the shared authored offer/price-list consumed by **both** store and bar; the **bar's existing tests stay green** (parity). Covered by tests.
- `consign <thing>` moves **custody** to the store while the owner-stamp stays with the consignor; a **second player** buying it splits the ask (commission → store, remainder → consignor's primary account) and transfers custody **and** the stamp to the buyer; the store's own coin is untouched; `reconcile().balanced` holds. Covered by tests.
- `consign` requires an account (nudges otherwise); `reclaim` returns an unsold item (ownership unchanged); the per-consignor listing cap refuses over-cap. Offline-consignor payout works. Covered by tests.
- The store runs Attendant (clerk attends; staffed-during-hours; lease applies) with no Attendant regression. Covered by tests.
- End-to-end live/integration: arrive → open+fund at Goodkin → `buy` staples by card (now owned) → `consign` a spare → another player buys it → proceeds land in the consignor's account and the buyer owns the good.
- Subsystem docs land (finalize): the chattel/possession ownership core documented (property doc or a new doc), a retail doc for the store, `residency.md` graduates the reset sweep; `banking.md`/`attendant.md`/`employment.md`/`crafting.md`/`parcel.md` touched where the build meets them. Full suite green; typecheck + lint:gates clean.

## Cross-references

- **Seeding slates:** [property-slate.md](../slates/builds/property-slate.md) (Phase-0 possession core, the chattel half — §"two registries", the `ownerOf(item) = stamp ?? authorOf` twin), [retail-slate.md](../slates/builds/retail-slate.md) (S1, the store), [economy-slate.md](../slates/builds/economy-slate.md) (shop models, pricing-as-stance, Law 1/2).
- **Load-bearing subsystem docs:** [parcel.md](../subsystems/parcel.md) (the title registry the chattel registry mirrors + `ownerOf`/`authorOf`), [provenance.md](../subsystems/provenance.md) (`authorOf`, the ownership fallback), [persistence.md](../subsystems/persistence.md) (durable instance identity), [banking.md](../subsystems/banking.md), [attendant.md](../subsystems/attendant.md), [employment.md](../subsystems/employment.md), [crafting.md](../subsystems/crafting.md), [residency.md](../subsystems/residency.md), [corpo.md](../subsystems/corpo.md).
- **Deferred to later builds:** the property compute economy (property slate Phase 1); the Circulation Reserve / welfare buy (retail S2, [terminus-city.md](../staging/terminus-city.md) §6–7); producer + real pricing (retail S3, [mining-slate.md](../slates/builds/mining-slate.md)); player shops + franchising (retail S4, [corpos-slate.md](../slates/builds/corpos-slate.md)).
- **Governing memories:** never-half-grown/everything-a-business, anti-grief-resource-guards, the property substrate (two conserved scarcities; possession-core Phase 0).
