# Storage slate — goods held at scale, as a count and not as objects

> **Status: UNBUILT** — designed 2026-10-12…16 in conversation, out of
> the ice trade (the icehouse is its first consumer). Builds **in one
> build with** [ice-trade-slate](./ice-trade-slate.md).
> **Left:** the store object · stock lines and the poolable declaration ·
> deposit / withdraw · lazy reconcile under the climate that reaches the
> store · stock → room heat · receipts, the shrinkage allowance and the
> pro-rata loss · the takeable stack · stocktake as a reading · a counter
> line whose source is a store, priced against the store's days of supply.
> ⛔ **Deferred:** store-to-store transfer, the ship's hold, any cargo
> (→ freight, *after every RGO is designed*) · damp and spontaneous
> combustion · a navigable warehouse interior · migrating the timber yard.
> **Size:** a build, shared with the ice trade.

*This is the design [logistics-slate](./logistics-slate.md) Part 11.5
("Warehousing") has been waiting on since 2026-09-03. Part 11.5 said
what bigness changes and why its spine could not ship; this slate supplies
the missing piece and the mechanism.*

---

## 0. Why it exists

Ten thousand blocks of ice are not ten thousand objects. A Hudson
icehouse held tens of thousands of tons, which is millions of blocks;
residency alone rules it out. And `Thermal`'s lumped model has no size
or surface-area term, so it cannot tell one block from a stack anyway.
The user's constraint is that **`Thermal`'s broad mandate must not be
stretched with area, volume or position in an enclosure just for ice.**

The answer is the one the repo already gives everywhere scale bites:
**at scale, the representation changes.** A wood is a place, not trees;
a fishery is a record on a reach, not fish; a mere's ice is a derived
sheet, not ice Things. Goods in storage become **a count held by a
store**, and the store owns the physics of the count.

⭐ **Storage is cross-cutting**, so it is its own slate and the ice trade
consumes it. It ships with **two consumers in the same build** (ice and
sawdust), so it is not a hook with one implementer.

## 1. What already exists (survey, 2026-10-12)

Nothing ships that holds goods as a count per grade and re-mints them on
withdrawal. What does ship:

| mechanism | what it is | gap |
|---|---|---|
| haulage depot `Warehouse` | a bailee holder + a `warehouse-receipt` document row | goods stay live Things; **no withdraw**; no capacity |
| retail `Stock` counter | discrete Things topped to par; `reset()` clones imports | Stackable staples are banned; an import is a faucet |
| consignment | custody + a listing record; a lot of one | titles single objects only |
| `Stackable` / `Bulkable` | a quantity on one Stuff / litres on a holder | no store, no receipts |
| watershed `StorageNode` | ⭐ one scalar with its own physics | the precedent for "a number and its physics" |
| banking | ⭐ a ledger of balances over coin kept PHYSICALLY in the vault, one-for-one — record vs reality already, but nothing dematerializes | money has no grade |

Design that already exists: logistics Part 11.5 (space · stock ·
institution; contents RECORDED; record vs reality as the spine; capacity
is MASS via `canRest` — renamed since: the seam is `Placing.canPlace`), freight-slate (stores are *"instance data, no new
class"*; rungs warehouseman → forwarder → network), and the bailee
cluster (warehouse · impound · auction house · bank · inn).

## 2. The kinds of lot this must hold

| lot | holds | provides | what time does |
|---|---|---|---|
| warehouse | cased, baled goods | dry, secure | theft, damp, vermin |
| bonded warehouse | goods with duty unpaid | + a customs seal | tax deferred to withdrawal |
| granary / elevator | grain in bulk | dry, ventilated | heating, mould, shrinkage |
| haymow / rick | hay | dry | ⚠ self-ignites when wet |
| cellar / cave | wine, cheese, roots | steady, dark | ageing **improves** |
| icehouse / cold store | ice, perishables | cold, insulation | melt |
| timber yard / loft | boards in stick | airflow | seasoning **improves** |
| coal yard / ore pile | open heaps | little | weathering; ⚠ coal self-heats |
| tank farm / cistern | liquids | sealed | evaporation, leaks |
| stockyard / pen | live animals | feed, water | they eat; they die |
| powder magazine | explosives | isolation | ⚠ a hazard to neighbours |
| strongroom / vault | value | security | theft only |

**The five axes that separate them:** the goods' **form** (fungible by
grade · bulk · alive · unique), the **climate** the store gives, what
**time** does (decay · improvement · nothing), **custody** (own ·
bailment · pooled), and **danger to neighbours**. Only fungible goods
become a count; unique goods (a named cask, a painting) stay objects in
the depot as today, and live animals are ranching's herdbook.

## 3. The decisions

### 3.1 The store is an object in an authored room — not a place

*"It's only a place if you can actually navigate it"* (user). A walkable
interior of aisles would be generated rooms, so it is out. The
**building** is an ordinary authored room with its own conditions; the
**store** is an object standing in it (the depot `Warehouse` grown up).

⭐ **The packing belongs to the stock, not the building.** An icehouse's
store is *the stack*: ice packed in sawdust. Historically the insulation
was the sawdust round the ice and the walls mostly kept off the weather.

⭐ The store reads its climate through the shipped **"what air reaches
me"** walk, which starts at an assembly-build `Chamber` when it stands in
one. So an ice chamber inside a larger building is rows, for free.

### 3.2 A stock line, and what it remembers

A line is **good + grade band + amount**, plus the per-object state the
good declares worth keeping (ice: temperature · timber: seasoning ·
grain: moisture and microbial load). Everything else is dropped at
deposit.

- **Deposit** merges the incoming state by the good's own rule:
  temperature mass-weighted (heat is conserved), seasoning the minimum
  (assembly's rule), microbial load mass-weighted.
- **Withdraw** mints objects carrying the line's state: a block drawn in
  August comes out at 0 °C and starts its icebox clock there.
- **The line reconciles lazily**, like everything else. Given the
  conditions that reached it since its last read, it applies the good's
  response. The stack's surface comes from its mass and a shape the store
  declares (area ∝ m^⅔), so "tall and square" is a row value.

⭐⭐ **The good decides what time does to it; the store decides the
conditions it gives.** Lens 1 (the real mechanism: ice melts because of
heat, wherever it sits) and lens 2 (a new kind of store is rows,
freight's *"no new class"*) both pick this, so it was never a fork.

### 3.3 Poolability is declared per good

A good opts in, and says how its grades pool. They genuinely differ
(ore averages its grade by mass; timber takes the least-seasoned), so
the good has to speak anyway. A good that does not declare stays an
object and goes on a shelf or in the depot.

⭐ **Pooling destroys information** — your good ice in with somebody's
bad makes yours worse — which is the real reason grades exist: you pool
only with peers. **The grade bands are the institution's rule, not
physics** (Chicago's were the Board of Trade's). The keeper sets them by
default; a standards body could later (logistics calls weights and
measures *"the load-bearing one"*).

### 3.4 Stock affects its room — heat only, for now

Physically a store's stock changes its room: a big ice stock chills it
(icehouses doubled as cold stores for butchers), wet hay heats it. The
icebox already does this in miniature (its interior follows the coldest
mass). **This build couples heat only**, which the icehouse needs. Damp
and spontaneous combustion wait for the goods that need them.

### 3.5 Two ledgers, and why they drift — the spine Part 11.5 could not ship

| | what | who knows it exactly |
|---|---|---|
| **the stock** | the lines, debited by physics | the world |
| **the receipts** | claims the keeper issued: depositor, good, grade, amount, terms | the keeper |

Part 11.5 refused its spine because *"a stocktake that always balances
is inert content"* — nothing caused divergence. Now three things do:

1. **Physics.** Ice melts; grain shrinks.
2. **Pilferage.** ✅ **The stack is physically takeable by anyone in the
   room** — it is a pile, not a vault. Receipts govern only what the
   keeper pays out. Theft is real, invisible when it happens, and visible
   only against the books (*"pilfered, not robbed"*). The keeper defends
   the stock with a lock, a watchman or presence — never an engine rule.
   Lens 3b picks it: the polity can do something we did not want.
3. **The keeper's own knowledge.** The keeper knows the claims exactly
   but **must measure the stock**: you do not weigh an icehouse, you
   measure the stack and estimate. A reading row, tool-made and banded by
   competence (*"about 900 tons"* / *"938, give or take five"*).
   **Stocktake is that reading done on purpose** — close for a day and
   count.

### 3.6 Who eats the loss

✅ **Default: pro-rata, plus the shrinkage allowance printed on the
receipt.** The historical rule for commingled fungible goods: they are
owned in common, so ordinary loss is shared pro rata; within the printed
allowance (*"4 % a season"*) it is nobody's fault. The keeper writes the
terms, so terms compete between houses. Lens 1 picks it: it is the real
rule and it teaches what *commingled* means.

- **Negligence is never judged by the engine** (thin sawdust, an open
  door, staff theft). The engine reports the stock, the claims and the
  room's history; a dispute goes to the shipped courts. *Engine measures,
  people judge.*
- **Claims beyond stock past the allowance** pay out pro rata until
  settled. That is a run on the store, exactly a bank run.

One store serves **two lines of business** on one substrate: a
**merchant** holds its own goods (receipts in the house's own name), a
**bailee** holds others' for a fee. Only the name on the receipt differs.

### 3.7 A counter can draw from a store

✅ A stock line whose **source is a store**: topping up par withdraws
from it instead of cloning an import. **An empty store means an empty
counter** — nothing from nowhere. (Retail's `reset()` import is a faucet;
a supplier line is bought by the keeper's beat; this is the third
source.)

✅ **A store-fed line prices against the store's stock**, as days of
supply left — not the shelf's, which a deep store keeps full until it is
nearly gone. So the season emerges in the price with no calendar
authored, and a player keeper can always override it.

### 3.8 Capacity

Part 11.5 decided it: **mass**, via the placement validator seam (`canRest` then, `Placing.canPlace` now)
(authored on 126 rows; cannot be gamed by nesting). A full store is a
legitimate world state, refused at the validator.

## 4. ⛔ Deferred, with destinations

- **Store-to-store transfer, the ship's hold, any cargo** → freight. ⛔
  *User, 2026-10-14: a whole cargo design and build, put off until all
  the RGOs are designed.* Moving goods between stores in this build uses
  existing means (carry, the haulage wagon) and is **placeholder**. Note
  for freight: maritime deferred *"cargo in a ship's hold"* to a vessel
  build because the hold rooms are not persisted; a count-store in the
  hold is that cargo for fungible goods.
- **Damp, spontaneous combustion, vermin** → this slate's next pass, with
  the granary and the haymow as consumers.
- **A navigable warehouse interior** → nowhere for now (procgen).
- **Migrating the timber yard** (a Stock counter of seasoning stacks
  today) → a candidate, not done here.
- **Transferable receipts** (futures; a receipt as collateral, which
  `credit.md` already wants) → later; the receipt document is the seam.
- **⭐ The bank vault as a store, and the money warehouse** → banking /
  currency slate (recorded 2026-10-16, not now). Banking already IS this
  slate's spine — account balances are the claims, the vault's coin is the
  stock, till liquidity and the withdrawal cap are claims against stock, a
  run is a run. The vault would be a **second consumer** of the store
  mechanism (coin lines per currency and denomination; robbery is taking
  from the stack; **the audit is stocktake**), with the claims kept in the
  sealed `bank_ledger`, never in receipt documents. The gain is coherence,
  not objects (coin is already one stack per denomination); the cost is
  re-proving banking's conservation. ⚠ **The literal money warehouse is a
  different institution:** a warehouse keeps 100 % of its goods and a bank
  lends them, and a gold receipt that people pass hand to hand **is a
  banknote** — the goldsmith path to paper money and fractional reserve.
  A keeper who quietly sells depositors' pooled stock is already running
  one (or embezzling, depending who asks). Its own slate.
- **The NPC loop while unobserved** (a keeper restocking with nobody on)
  → [unobserved-economy-slate](./unobserved-economy-slate.md). The
  physics needs nothing: lines reconcile on read.

## 5. Lens pass

1. **Pedagogy** — record versus reality; *inventory is money you cannot
   spend*; surface against volume as the reason stores are big; what
   *commingled* means; why grades exist.
2. **Expression** — every lot in § 2 is a good's declaration plus a
   room's conditions plus a store row. Constant: the physics and the
   ledgers. Variable: the goods, the room, the packing, the terms.
3. **3a** — you look at the stock and read the books. `look` describes it
   from the count (*"stacked to the rafters, the sawdust dark and wet along
   the bottom courses"*); the number lives in a ledger that can be wrong.
   **3b** — the keeper, the watchman and the clerk are seats, and theft
   is possible.
4. **Values** — the terms a keeper prints, whether to hold or sell, and
   how a run is handled have no right answer.
5. **Continuity** — an icehouse, a cold store, a bonded warehouse and a
   container yard answer the same deposit / withdraw / receipt.
6. **Economy** — the store's carrying cost is its loss and its labour;
   the demand already ships (every icebox restocks).
7. **Governance** — loss is decided by printed terms and the courts,
   never by the engine; the grade bands are an institution's rule.

**See also:** [logistics-slate § 11.5](./logistics-slate.md) ·
[freight-slate](./freight-slate.md) ·
[ice-trade-slate](./ice-trade-slate.md) ·
[logistics.md](../../subsystems/logistics.md) (the depot and the receipt) ·
[retail.md](../../subsystems/retail.md) ·
[banking.md](../../subsystems/banking.md) ·
[thermal.md](../../subsystems/thermal.md) (the Coolbox) ·
[assembly.md](../../subsystems/assembly.md) (`Chamber`).
