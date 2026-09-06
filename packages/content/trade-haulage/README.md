# trade-haulage

Carriage as a **trade** — a capability pack (`src/` + `content/`).
Package `@saxonberg/content-trade-haulage`; namespace root
**`/trade/haulage`** — the *who makes · who owns* axis.

**The split with `transport`** is the `/system/` test, applied: *a system
is true whether or not anyone is participating in it.* A road and a river
exist with nobody employed by them, so the lane, the `Route`, the Journey
and the vehicle substrate are `/system/transport`'s. Who carries what
across them for money is practised by somebody and can be quit, so it is
here.

## What is here

| | |
|---|---|
| `WaybillRegistry` | the **bill of lading** every completed carriage files — `ship` at a counter, the `hauls` brain, and a player who claimed a gig, all the same paper. Path-keyed under the filing business's own branch, so **a depot's records cover exactly what it handled**. `house traffic` counts edges over it, and no traffic counter is stored anywhere. |
| `RateCardRegistry` | a carrier's published prices. **Visible** (a stranger can read one), because rate discrimination has to be a table rather than an accusation; **settable**, because a carrier that cannot choose its prices cannot be the villain of that arc. |
| `ShipmentDeskMixin` · `DepotCounter` · `Warehouse` | the depot: an attendant queue, a shipment desk, a bailee's shed. Every piece a shipped shape. |
| `teamstering` | the discipline. Buys **information** (what you knew before you committed) and **capability** (a bigger team) — never a faster wagon on the same road. |
| `hauls` | the brain. ⭐⭐ The NPC is the **reserve supply**, so it sets the wage: a player cannot charge more than it costs and need not accept less. |

## What is deliberately NOT here

- **Warehousing as a business** — rent, shrinkage, the stocktake. Its
  spine is *record versus reality*, and nothing in scope makes the two
  diverge, so a stocktake would always balance. What ships is the
  receipt and the duty.
- **A passenger service.** The taxonomy is recorded; the market does not
  exist yet, because walking is free across a five-minute basin.
- **Tolls, barricades, banditry, congestion, road wear.** The contested
  road build.
- **The wainwright.** You can own a wagon; you cannot make one.

See [docs/subsystems/logistics.md](../../../docs/subsystems/logistics.md).
