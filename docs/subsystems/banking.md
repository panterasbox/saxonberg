# Banking — the monetary substrate

> **Status:** built on `feature/banking-build` (phases 1–5). This doc is the
> source of truth for the banking substrate. Sections marked *(deferred)* name
> parked seams.

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

## Custodial bank ops (Phase 2)

A **bank** bridges cash and accounts 1:1 and can't fail. The capability is
`BankMixin` (`lib/banking/Bank.ts`), hosted on a **teller-counter `Thing`
fixture** (`BankCounter` = `BankMixin(ContainerMixin(Thing))`) *inside* the
branch Location — NOT on the Location, because a Location's own
`commandContributions` don't reach its occupants (only sibling *contents*
feed the `environment` bucket; the `Menu` precedent). The counter's contents
*are* the cash vault; `getTillLiquidity()` = Σ vault coin face-values.

- **Affiliation** rides a plain `corpoKey` resolved on read via `CorpoApi`
  (a bank is *affiliated to* a corpo, not a branded product). `openAccount`
  records that key on the account row — the readable affiliation edge.
- **Resolution by identity** — accounts key on `{owner, bankPath}` (owner =
  the context-derived `templatePath`, bankPath = the counter's templatePath).
  No number is ever typed: `myAccountAt(bankPath)` resolves "your account
  here"; `primaryAccountIdOf(ownerKey)` is the receive-by-identity target;
  the first account an owner opens is their **primary**. Multi-account is
  native (per `{owner, bankPath}`); per-branch context selects.
- **deposit** moves the coin into the vault and credits the balance 1:1
  (`deposit` row, supply-neutral cash bridge). **withdraw** debits and hands
  out coin (split from the vault), bounded by **both** the balance (solvency)
  and the **till** (physical cash, AC#13 — a CB mint to a balance with no
  backing coin is what lets the till bind). **transfer** moves balance→balance
  (conserving), only from your *own* account (anti-spoof; actor from context).
- The **1:1 invariant** (vault coin value == Σ branch balances) holds across
  deposit / withdraw / same-bank transfer. Cross-bank settlement of physical
  cash is deferred (a cross-bank transfer moves ledger balances only).

The branch ops ride **one `bank` verb** with subcommands (the
`chat`/`alias` dispatch-on-`subcommand` precedent, not a verb-per-action):
bare `bank` → balance; `bank open` / `deposit <coins>` / `withdraw <amount>`
/ `transfer <amount> to <who>` / `balance`. One `BankController` dispatcher
extends `BankingControllerBase` (`resolveBank` — the affording counter, else
the room scan; the crafting "agent performs, venue owns state" resolution).
The branch is authored as **city content**:
`seeds/domain/eternal/university-avenue/{bank,bank-counter,npc/teller}.yaml`,
one cell north of the arrival plaza (reachable from the born-with University
Avenue fast-travel node), affiliated to **Goodkin** (the retail bank).

## Uniform settlement + the credential ladder (Phase 3)

Settlement is **one primitive** — `BankingApi.settle(charge, method)` — across
every transaction kind and every method (the method is a *parameter*, the
`ContainmentApi.move` uniform-surface / polymorphic-internals pattern). The
thing owed is a `Charge` (`amount + payee + reason`, **presented** vs
**stated**); mechanism is polymorphic underneath:

- **cash** → coin handover off the governed ledger (coins split from the
  payer to `charge.payeeContainer`; no account touched; supply unchanged).
- **credential** → an on-ledger `payment` posting routed through the
  credential's account (with optional **remittance splits** — a cut to a
  third-party account alongside the main leg: payer −X, payee +(X−Σsplits),
  each split +its cut; conservation holds across all legs). `--from <corpo>`
  routes one payment from a specific linked account without disturbing the
  active setting. Returns a `SettlementReceipt` the scene reads.

The **credential** is now a `payment` **record** held in a
`CredentialWalletMixin` holder (the unified credential substrate — see
[credential.md](./credential.md)): the record carries the linked-account set +
active pointer + `spendCap` + `frozen` + `authorize`. The holder composes over
BOTH a `PaymentCard` (`= CredentialWalletMixin(Thing)`, a 1:1 bearer
instrument you can lose) and the born-with `CredentialWalletUpdate`
(`= CredentialWalletMixin(AetherHostedMixin(Idea))`, the one wallet app holding
every credential kind — installed once by `Avatar.installDefaultLoadout`,
body-bound). Reached via `ContainmentApi.findReachable` keyed on
`MixinApi.isCredentialWallet` + a **non-frozen** `payment` record
(implant-first — the self-hosted leg precedes carried cards), so a reissued
card is found in place of a revoked one. `openAccount` auto-links each new
account to the owner's wallet (first opened → active). `BankingApi`'s
credential surface (`activeCredential` / `setActiveAccount` /
`freezeCredential`) traffics in the `PaymentCredential` record; `issueCard`
returns the card holder (`Stuff & CredentialWallet`).

The **risk ladder + recourse**: cash = bearer, no recourse; implant =
body-bound (not a carryable Thing); card = bearer, bounded by `freeze`
(report-lost → `frozen`, account/balance untouched, reissue via `issueCard`)
and a per-credential `spendCap` (`authorize` refuses over-cap or frozen — a
security cap, never a fee). Verbs: `pay` (the one flat top-level settlement
verb — stated transfer; `--cash`/`--from`) + the `wallet` verb (bare → show
active; `wallet use <corpo>` switch; `wallet freeze <card>` report-lost +
reissue).

> **History.** Phase 3 shipped the payment credential as a
> banking-owned `PaymentCredentialMixin` over a `PaymentCard` Thing and a
> `PaymentImplantUpdate` aether twin. The **credential-wallet build**
> (`feature/credential-wallet-build`) folded it into the shared credential
> substrate: the behavior moved onto a `PaymentCredential` *record* held in a
> `CredentialWalletMixin`, the implant twin became the unified
> `CredentialWalletUpdate`, and resolution re-keyed to
> `MixinApi.isCredentialWallet`. The verb surface and the ledger are
> unchanged — only where the credential's state lives. See
> [credential.md](./credential.md).

## Tabs, wages, demo tax, the P&L (Phase 4)

- **Tabs** — `TabMixin` on the **venue `Location`** (the Bar): per-patron
  accrued unsettled charges, owned by the house so the tab outlives shift
  changes (the bartender acts on the venue's behalf). **Recognition-gated**
  via `RecognitionApi.recognizes(recognizer, patron)` (a new boolean read on
  the recognition surface) — a tab is a privilege of being *known*.
  **Skipping** is priced, not prevented: `skipTab` applies a `RegardApi`
  regard hit from the creditor and revokes the privilege; the unpaid balance
  stays on the books. State on the mixin (decision 3: session-durable). The
  `tab` verb (bare → show; `tab settle` / `tab skip`) is afforded by the
  bar's Menu (the affordance carrier in the room) and records against the
  venue's `TabMixin`.
- **Wages** — `BankingApi.payWage(employerAccount, workerKey, amount)` moves
  coin to the worker's primary account as a `wage`/`wages` line. *Who* is
  employed is authored (out of scope); this is the payment only. **No
  employer-solvency check** — the venue runs its P&L red by design (subsidy
  covers). `house payroll <worker> <amount>` (operator-gated via `AuthorMixin`
  + `requiresWizard`) pays from the present venue's account.
- **Demo sales tax** — `BankingApi.remitDemoTax(sellerAccount, saleAmount)`:
  a **seller-collected** `tax`/`tax` posting seller → placeholder treasury at
  the authored, **inert** rate (`banking.salesTaxRate` AppSetting; recorded,
  not governed — the corpo-affiliation-edge precedent), so the tax shows in
  the *seller's* P&L (a `tax` line) and the treasury merely accumulates (no
  appropriation path). (The general payer-side remittance-split seam from
  Phase 3 stays for tips/fees.)
- **The P&L** — `BankingApi.profitAndLoss(account)`: a derive-on-read
  categorized read (per-category signed net + running balance) — the
  deficit-as-target instrument, red by design. `house pnl` (operator-gated)
  reads it; `reserve mint <amount>` (the CB faucet) mints
  `subsidy` into the venue account to cover the red — a logged, visible,
  accountable faucet. **`reserve` is now Governor-gated** (`requiresGovernor`
  / holding the `central-bank-governor` office — the founder by default, or
  a handed-off holder), no longer `requiresWizard`: minting money is a
  monetary-authority act, not a code-trust one. This realizes the "governance
  of the central bank" `CentralBank.ts` left deferred — see
  [governance.md](./governance.md). (`house` stays operator-gated.)

## Reporting consumers + the bar loop (Phase 5)

Queryability is a property of the architecture, not a feature: the typed
append-only ledger + conservation + only-the-CB-mints means the two and only
two consumers are derive-on-read with no backfill:

- **The P&L** (Phase 4) — `profitAndLoss`.
- **Money supply + reconciliation** — `moneySupply()` (Σ mints − Σ drains,
  O(1) off `SupplyAggregate`) and `reconcile()`: the conservation audit
  (`supply === Σ account balances + Σ circulating coin`, the coins outside
  bank vaults; `cashInExistence = supply − Σ balances`). `reserve supply`
  (operator-gated) renders both.

**Cash genesis** — `issueCash(into, amount)` is the CB physical-cash faucet:
a `mint` issuance → cash bridge (supply grows, no account touched) plus a
`Coin` stack cloned into the world. The only ways coin enters circulation are
`issueCash` and a `withdraw`; both keep `reconcile` balanced.

**The bar loop** — open an account → deposit cash → order a drink → pay (or
tab + settle) → the bar's ledger accrues sales/wages → it runs red → the CB
mints subsidy to cover it → the P&L shows the deficit; `reconcile` holds
throughout. The drink purchase is wired live: `OrderController`, after
crafting, settles a **presented Charge** at the Menu's authored `priceFor`
(silent pay from the credential's active account) and the bar `remitDemoTax`;
an unpriced recipe is served free (backward-compatible). The bar's P&L
account is **lazily ensured** (`ensureVenueAccount`, owner = the venue's
durable path) on first order/pnl/payroll — no boot seeder.

**Law compliance** — Law 1: no good carries a readable worth (a coin has a
`denomination`; face value is a currency property, `Money.faceValueOf`). Law
2: banking installs **no** scheduled recompute touching balances/coin (the
renown divergence), so nothing decays — an idle balance/stack is unchanged
over a game-clock advance.

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
`/obj/api/banking`, gated `FromModule('/api/banking#BankingApi')`; the
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
3. **Tab persistence** — chose the **mixin** (state on `TabMixin`,
   session-durable, the credential precedent) over a `Tab` Document. v1
   tabs don't need to survive a restart; the cross-restart `Tab` Document is
   the deferred option if required. (Phase 4.)
4. **Crafting price source for the presented Charge** — confirmed crafting's
   `order`/`serve` exposes **no** price stance (it crafts the drink free), so
   per the requirements' "authored flat stances" the bar's drink prices will
   be an **authored price field on the `Menu`**, built into a presented
   `Charge` and settled via `settle`. The settle primitive + Charge ship in
   Phase 3; the Menu price field + the order→charge wiring land with the bar
   loop in Phase 5 (the integration point). (Phase 3.)
5. **Verb category / shape** — one `banking/` category, and (post-review)
   **dispatch-on-subcommand parents, not a verb-per-action** (the
   `chat`/`alias` precedent — the framework supports far more than the
   old-MUD flat-verb style): `bank` (open/deposit/withdraw/transfer/balance),
   `wallet` (use/freeze), `tab` (settle/skip), plus the flat `pay`; the
   operator surface splits **`reserve`** (mint/supply, central bank) vs
   **`house`** (pnl/payroll, venue owner): `house` is `requiresWizard` via
   `AuthorMixin`; **`reserve` is `requiresGovernor`** (the
   `central-bank-governor` office — see [governance.md](./governance.md)),
   the monetary-authority axis rather than code-trust. 13 flat verbs → 6, collapsing most verb collisions
   (no more banking `open` shadowing the boundary `open`). A pure view-layer
   regroup — the Api/Logic substrate is untouched. (Phase 2 surface,
   restructured post-MR review.)
6. **Branch/teller homing** — city content under `seeds/domain/eternal/`
   (resolved by the plan). Sub-choice settled: **`BankMixin` on a
   teller-counter `Thing` fixture**, NOT on the branch Location — a
   Location's own `commandContributions` don't reach its occupants, so the
   affordance must come from a fixture in the room (the `Menu` precedent).
   (Phase 2.)

## Deferred seams

Lending / fractional reserve / interest / bank-failure + deposit insurance;
the governed reserve (legislative fiscal cycle); the employment
relationship (banking ships wage *payment* only); live/governed taxation;
player-run banks; the corpo faction-approval consequence of an account's
affiliation; the grey market; a full reporting/analytics surface (v1 ships
only the P&L + supply/reconcile consumers).
