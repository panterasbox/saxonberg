# Banking — the monetary substrate

> **Status:** building on `feature/banking-build`. This doc is the source of
> truth for the banking substrate and grows phase by phase; the
> [requirements](../requirements/banking-requirements.md) and
> [plan](../plans/banking-plan.md) are the spec/how. Sections marked
> *(deferred)* name parked seams.

Banking is **phase 4 ("Money") of the Dave's-Bar track**: the two-tier money
model (physical **cash** vs auditable **account balances**), bridged by a
custodial **bank**, with a single governed-but-logged **central bank** mint.
It mirrors the `lib/standing/` **append-only-log → rebuildable-materialized-
standing** shape (renown / participation / producer) with one hard addition:
**conservation**.

## The money model (the load-bearing decisions)

Money exists in two domains, joined only at the bank:

- **Cash** — `Coin`, a physical `Globbable` `Thing` carrying per-coin
  **mass**. Off the *governed* ledger: a hand-to-hand handover changes
  *location*, not *total supply*. Self-limiting by mass (a `Coin` stack's
  `getMass()` is per-coin × quantity, read by the shipped `LoadBearing`
  gauge — the cap on cash is honest physics, not a rule).
- **Account balances** — weightless minor-unit balances **derived from an
  append-only ledger** (`bank_ledger`), materialized in a warm cache
  (`bank_accounts`), behind the gated `BankingApi` / `BankingLogic` pair.

`Money` is the amount value-object: integer **minor units** + a currency tag
(v1: one currency, `credit`). It is a *transient settlement quantity* and a
*ledger record* — **never a "worth N" stamped on a good** (Law 1). A coin
carries a `denomination` (its identity); how many minor units a denomination
is worth is intrinsic to the *currency* (`Money.faceValueOf`), read by the
banking layer, never written onto the object.

### Conservation

> **Total money supply** = `Σ(mint amounts) − Σ(drain amounts)` over the
> central-bank log. It changes **only** by a central-bank mint (faucet) or
> drain (sink). Every other posting conserves it.

Enforcement is a **sealed posting chokepoint** — `postTransaction`, a
module-private free function in `BankingLogic`, the **only** code path that
writes a `LedgerEntry` or mutates an `AccountBalance`. Each ledger row is a
**transfer leg** (`amount` minor units, `fromAccount` → `toAccount`).
Conservation is *structural*, validated per leg by `BankTransaction`
(`lib/banking/Transaction.ts`) against the leg's `kind`:

| kind | from → to | supply effect |
|---|---|---|
| `mint` | issuance sentinel → real account | **+amount** |
| `drain` | real account → issuance sentinel | **−amount** |
| `deposit` | cash bridge → real account | neutral (coin → vault) |
| `withdraw` | real account → cash bridge | neutral (vault → coin) |
| `transfer`/`payment`/`wage`/`tax` | real account → real account | neutral |

A leg of a non-mint/drain kind that names the **issuance sentinel** (money
from nowhere) **throws** — a programmatic conservation breach (the
crafting/containment discipline: contract violations are exceptions, not
boolean flags). The throw is pure (runs before persistence, DB or not).

The **sentinels** (`lib/banking/Account.ts`) are non-account counterparties
with no balance row: `Account.ISSUANCE` (mint source / drain sink — the only
counterparty that moves supply) and `Account.CASH_BRIDGE` (deposit source /
withdraw sink — the off-ledger↔on-ledger boundary). `Account.CENTRAL_BANK`
is a *real* account (it can hold/float money); "in circulation" excludes its
holdings.

The headline supply is kept O(1) by `SupplyAggregate` (`bank_supply`, a
single rebuildable row) and reconstructable by a full ledger scan
(`recomputeSupply`). The reconciliation invariant —
`supply == Σ account balances + Σ circulating coins` — is the conservation
audit (the coin term lands with the cash bridge in Phase 2+).

## Module layout

`lib/banking/` (the new subsystem folder):
- `Money.ts` — the amount value-object + currency / coin-face-value consts.
- `Account.ts` — the account-id vocabulary (sentinels, CB account, classify
  / mint helpers as statics).
- `Transaction.ts` — `BankTransaction`, the pure conservation rule
  (`assertConserving` / `supplyDelta`) + the `LedgerLeg` shape.
- `LedgerEntry.ts` — the append-only `bank_ledger` row (`Document`).
- `AccountBalance.ts` — the materialized account registry + balance
  (`bank_accounts`, warm cache; registry folded onto the row — decision 2).
- `SupplyAggregate.ts` — the single-row supply headline (`bank_supply`).

`obj/Coin.ts` — the physical cash object (`GlobbableMixin(Thing)`); a
concrete content object beside `Flask`/`AirTank` (memory: *obj vs lib Stuff
placement*).

`obj/CentralBank.ts` — the singleton mint/sink + world-presence anchor
(`PostRegistrationMixin(Idea)`; mint/drain logic surfaced through
`BankingApi`, developer-gated at the verb layer).

`api/banking.ts` — `BankingApi`, the thin gated forwarding shell.
`obj/api/BankingLogic.ts` — the `@Unshadowable` logic singleton at
`/obj/api/banking`, gated `FromModule('mud/api/banking#BankingApi')`; the
sealed `postTransaction` chokepoint lives here as a module-private fn.

Collections (`backend/PersistenceManager.ts`): `bank_ledger` (indexed
`fromAccount`/`toAccount`/`kind`/`at`), `bank_accounts` (unique `accountId`,
indexed `owner`/`bankPath`), `bank_supply` (single row). Warm wiring in
`AppBootstrap` (`AccountBalance.warm` + `SupplyAggregate.warm` +
`BankingApi.boot`); the `/obj/CentralBank` singleton is in the bootstrap
manifest.

## Open-choice decisions log

The plan flagged 6 open implementation choices; settled as reached:

1. **Mint balancing** — chose the **latter** (supply tracked explicitly by
   `SupplyAggregate`; mint/drain are supply-changing single-leg postings,
   deposit/withdraw are cash-bridge postings, the rest zero-sum) over the
   former (a finite pre-seeded CB "unissued reserve" making every posting
   literally zero-sum). *Why:* the cash↔balance bridge is single-sided
   regardless, so the former's "every posting is zero-sum" elegance buys
   nothing once deposits exist; the latter is cleaner and makes
   deposit/withdraw first-class. (Phase 1.)
2. **Account registry home** — **folded** the registry fields (owner /
   bankPath / corpoKey / isPrimary / isActive) onto the `AccountBalance`
   row in `bank_accounts`, rather than a separate `Account` Document. The
   `RenownStanding` precedent (one collection carries both key and value);
   `Account.ts` is a pure id-vocabulary value-object, not a Document.
   (Phase 1.)
3. **Tab persistence** — *(deferred to Phase 4.)*
4. **Crafting price source for the presented Charge** — *(deferred to
   Phase 3.)*
5. **Verb category** — *(deferred to Phase 2, when the first verbs land.)*
6. **Branch/teller homing** — resolved by the plan (city content under
   `seeds/domain/eternal/`); sub-choice (BankMixin on the Location vs a
   teller-counter fixture) deferred to Phase 2.

## Deferred seams

Lending / fractional reserve / interest / bank-failure + deposit insurance;
the governed reserve (legislative fiscal cycle); the employment
relationship (banking ships wage *payment* only); live/governed taxation;
player-run banks; the corpo faction-approval consequence of an account's
affiliation; the grey market; a full reporting/analytics surface (v1 ships
only the P&L + supply/reconcile consumers).
