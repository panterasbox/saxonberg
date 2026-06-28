# Banking (the monetary substrate) — implementation plan

A grounded, phased plan for the banking build — phase 4 ("Money") of the
Dave's-Bar track. Authoritative spec:
[banking-requirements.md](../requirements/banking-requirements.md). Read
it in full before starting; every Goal, Surface decision, Constraint, and
Acceptance criterion there is binding and **settled** — this plan is *how*,
not *what*. The build is **server-only**; all code paths are under
`packages/server/src/`. Branch: `feature/banking-build`, freshly branched
from `origin/master`.

This build mirrors a shipped precedent end-to-end: the money ledger is the
`lib/standing/` **append-only-event-log → rebuildable-materialized-standing**
shape (renown / participation / producer), with one hard addition —
**conservation**: money is neither created nor destroyed except by the
central bank's logged mint/drain, enforced at a sealed chokepoint mirroring
the `PersistApi` / `lint:pm` seal the standing ledgers use.

## 0. Self-bootstrapping orientation (read these mirrors first)

You have not seen the design conversation. Everything you need is in the
requirements doc plus the shipped precedents below. Build against these
mirrors; do not invent new shapes.

| Banking piece | Mirrors exactly | Evidence (read before coding) |
|---|---|---|
| `Coin` (massed fungible cash) | `Globbable` host + `Tangible` mass | `lib/stuff/Globbable.ts`, `lib/material/Tangible.ts` (`getMass`/`setMass` → `Quantity<'kg'>`); [glob.md](../subsystems/glob.md), [encumbrance.md](../subsystems/encumbrance.md) |
| `LedgerEntry` (append-only money log) | `RenownEvent` (`extends Document`, `collectionName`, `persistentFields`, both clocks `at`/`realAt`, scope-tagged, raw payload) | `lib/standing/RenownEvent.ts` |
| `AccountBalance` (materialized warm cache) | `RenownStanding` (`extends Document`, `_cache` Map, `warm()`, `cached()`, `key()`, `_resetForTesting`) | `lib/standing/RenownStanding.ts` |
| `BankingApi` / `BankingLogic` | `RenownApi` (thin `StuffApi.singletonSync` shell + `SecurityApi.decorateApiClass`) ↔ `RenownLogic` (`@Unshadowable extends Idea`, `FromModule` gate, module-private free fns, `PersistApi.isConnected()` guard) | `api/renown.ts` + `obj/api/RenownLogic.ts` |
| Conservation seal | `PersistApi.isConnected()` chokepoint + the `lint:pm` discipline | `api/persist.ts`; [persistence.md](../subsystems/persistence.md) |
| `PaymentCredential` (card ⊕ implant) | `TravelCredentialMixin` (base-agnostic, composes over a `Thing` card AND an `AetherHostedMixin(Idea)` update; persistent set field via accessor pair; `AetherMixin` host-descent reach) | `lib/fasttravel/TravelCredential.ts`, `lib/fasttravel/TravelCredentialUpdate.ts`; [fasttravel.md](../subsystems/fasttravel.md), [augmentation.md](../subsystems/augmentation.md) |
| Bank's corpo affiliation | `BrandedMixin` resolve-on-read + `CorpoApi` | `lib/corpo/Branded.ts`, `api/corpo.ts`; [corpo.md](../subsystems/corpo.md) |
| Catalogue/registry singleton (if needed) | `RecipeCatalogue` / `TopicCatalogue` (`PostRegistrationMixin(Idea)`, `postRegister` warm, ungated reads, singleton-destruct refusal) | `obj/RecipeCatalogue.ts` |
| `pay` / settlement hook into the bar | crafting `order`/`serve` returning the drink + the `Menu` `commandContributions` surface | [crafting.md](../subsystems/crafting.md), `domain/lounge/Menu.ts` |
| Tab recognition-gate + skip penalty | `RecognitionApi` (resolve "your account" by identity) + `RegardApi.adjustRegard` (signed scalar) | `api/recognition.ts`, `api/regard.ts`; [belief.md](../subsystems/belief.md) |
| NPC teller (placeholder) | the bar's `dave.yaml` seed (`/lib/character/Crafter`, `Persona`, canned `greets`/`idles` brains) | `seeds/domain/lounge/npc/dave.yaml`; [behavior.md](../subsystems/behavior.md) |
| Collections + indexes | `Collections` enum + `createIndexes()` (the `renown_events` / `renown` blocks) | `backend/PersistenceManager.ts` |
| Developer gate for mint/drain | `AccessApi.isDeveloper(subject)` | `api/access.ts`; [access.md](../subsystems/access.md) |
| Acting principal from context | `ExecutionContextApi.getActingAuthor()` | `api/execution-context.ts` (`getActingAuthor` at L341) |

### House conventions this plan obeys (do not drift)

- **No new module categories.** One new subsystem folder `lib/banking/`
  (value-objects + mixins + Document classes), `api/banking.ts` forwarding
  shell, `obj/api/BankingLogic.ts` singleton, `obj/command/<cat>/` + `mud/cmd/<cat>/`
  verb MVC triples, `backend/PersistenceManager.ts` collections. No
  free-floating helpers — fold into Api statics or value-objects. See
  CLAUDE.md *Module Categories*.
- **Nothing imports `BankingLogic`** except `api/banking.ts`. Consumers
  call `BankingApi`.
- **Acting principal derived from context** (`getActingAuthor`), never a
  parameter (the gated-Api rule). Mint/drain/float are developer-gated
  (`AccessApi.isDeveloper`-class), not player surface.
- **Member privacy:** `api/` defaults to `#`; `lib/`/`obj/` mixin
  instance state uses TypeScript `private` (proxy-trap rule), persistent
  fields public for the Hydrator.
- **Inter-Stuff contract = methods only.**
- **Export discipline:** classes & types only; lint flags stray exported
  helpers — fold them in, do not add a disable.

## 1. The conservation invariant (the load-bearing decision)

Conservation is the one divergence from the renown precedent and the
spine of correctness. State it precisely so every phase honors it:

> **Total money supply** = `Σ(mint amounts) − Σ(drain amounts)` over the
> `CentralBank` log. It changes **only** by a `CentralBank` mint or drain.
> Every other operation (deposit, withdraw, transfer, pay, wage,
> tax-remittance, remittance-split) is **balanced**: the signed sum of all
> legs it writes to the ledger is exactly zero, including cash↔balance
> bridges (deposit moves coin *into* the vault while crediting the
> balance; the two cancel) and multi-leg settlement (payer −X; payee +Y;
> treasury +Z; with X = Y + Z).

**Enforcement mechanism — a sealed posting chokepoint.** All ledger
mutation funnels through a single module-private free function in
`BankingLogic` — `postTransaction(legs: LedgerLeg[], meta)` — which:

1. asserts `Σ legs.amount === 0` for any transaction NOT tagged
   `kind: 'mint' | 'drain'` (a non-zero sum **throws** — a programmatic
   conservation breach, the crafting/containment discipline: contract
   violations are exceptions, not boolean flags);
2. for `mint`/`drain`, asserts exactly one leg and that the counterparty
   is the `CentralBank` account (mint = CB debit → target credit; drain =
   target debit → CB credit — modeled so the CB account itself holds the
   "unissued" pool, making mint a *transfer from the CB's own reserve* and
   keeping even mint balanced at the ledger level; supply is then the CB
   account's net issuance, see §Phase 5);
3. writes one `LedgerEntry` row per leg (rich-tagged, §Phase 1), updates
   the affected `AccountBalance` rows, and bumps the running supply
   aggregate;
4. is the **only** code path that constructs/saves a `LedgerEntry` or
   mutates an `AccountBalance` — gated `FromModule('mud/api/banking#BankingApi')`
   at every public entry, with `postTransaction` itself a module-private fn
   (no intra-singleton `this.x()` to trip the gate, the `RenownLogic`
   pattern). No `new LedgerEntry().save()` anywhere else (the
   go-through-the-Api constraint; assert in tests).

> **Open implementation choice (flag, do not silently decide):** whether
> mint models the CB account as a finite pre-seeded "unissued reserve"
> (every leg-sum zero, supply = CB net-out) **or** mint is a genuine
> single-leg faucet exempted from the zero-sum check (supply = Σ mints −
> Σ drains over a `kind`-filtered scan). Both satisfy the acceptance
> criteria. This plan assumes the **former** (cleaner: *every* posting is
> zero-sum, the reconciliation invariant becomes a single equality). If
> the builder finds the unissued-reserve seeding awkward against the warm
> cache, the latter is the sanctioned fallback — note the choice in
> `banking.md`.

## 2. Proposed file/module layout

All under `packages/server/src/mud/` unless noted. Every file maps to an
existing Module Category.

**`lib/banking/` (the new subsystem folder):**
- `Money.ts` — the amount value-object: an integer-minor-unit scalar + currency tag, with `add`/`subtract`/`isZero`/`compareTo`/`render` (never a "worth" stamp on a good — a transient settlement quantity). The home that kills a `types.ts`. [Value-object]
- `LedgerEntry.ts` — `extends Document`, `bank_ledger` collection. Rich tags (§Phase 1). [Document]
- `AccountBalance.ts` — `extends Document`, `bank_accounts` collection, warm `_cache` Map mirroring `RenownStanding`. [Document]
- `SupplyAggregate.ts` — `extends Document`, `bank_supply` collection (a single-row running headline keeping the supply query O(1)); rebuildable from the ledger. [Document]
- `Account.ts` — the account value-object/descriptor: durable `accountId`, owner durable key (`templatePath`), `bankPath`, `corpoKey`, `isPrimary`/`isActive` flags. **Not** a Document if balances live on `AccountBalance` and the account registry rides the ledger; if a registry row is cleaner, make it a Document in `bank_accounts` alongside the balance — see open choice below. [Value-object or Document]
- `BankMixin.ts` — exports `BankMixin`, `_mixinName='BankMixin'`; the custodial branch: corpo affiliation (composes/reads `BrandedMixin` or carries a `corpoKey` + resolves via `CorpoApi`), a cash-vault accounting handle, `tillLiquidity` (the bounded-branch cap), and `commandContributions` lighting up `open`/`deposit`/`withdraw`/`balance` on the `environment` bucket (the `Menu` precedent). [Mixin]
- `PaymentCredential.ts` — exports `PaymentCredentialMixin`, base-agnostic (the `TravelCredentialMixin` shape): linked-account set + active-account pointer + per-credential `spendCap` + `frozen` flag + `authorize(amount)`. Composes over the card `Thing` and the hosted implant `Idea`. [Mixin]
- `PaymentCard.ts` — the carryable card `Thing` = `PaymentCredentialMixin(Thing)` (1:1 with one account; the bearer instrument). [Stuff class]
- `PaymentImplantUpdate.ts` — `PaymentCredentialMixin(AetherHostedMixin(Idea))`, the wallet (links all accounts, one active). [Stuff class]
- `Charge.ts` — the settlement value-object: `{ amount: Money, payeeAccountId, reason, presented: boolean, splits?: RemittanceSplit[] }`; `RemittanceSplit = { accountId, amount }`. The uniform settlement primitive's data. [Value-object]
- `Tab.ts` — exports `TabMixin`. **Host = the venue `Location` (e.g. the singleton `domain/lounge/Bar`), NOT the bartenders and NOT the `Menu`.** The tab is the *establishment's* credit relationship + receivable: it must outlive shift changes (Mara opens it, Remy adds to it, you settle with whoever's on — one tab, owned by the house), it rides the **venue's account** (the one the P&L reads; a skip is the venue's bad debt), and recognition-gating is the *house* recognizing you as a regular. The bartender (the present `MakerMixin` agent) merely **acts on behalf of** the venue: the `tab` verb resolves the establishment the agent works in and records against *its* `TabMixin` — the "agent performs, venue owns the state" split, mirroring crafting's fulfilling-bartender resolution. Surface: per-patron accrued unsettled charges, recognition-gate read, settle/skip. Or a `Document` keyed by `{venueAccount, patron}` if a tab must persist across restart — see open choice. **`TabMixin` is purely the *additive credit* layer — there is no "proprietor"/"merchant" mixin in this build, and none should be invented.** A basic pay-as-you-go proprietor is expressed by *composition*: the venue **receives** by having an account (a `bank_accounts` registry row addressed by identity — not a mixin; a pure-cash seller needs only a till container) and **offers priced goods** through the crafting layer's `Menu` + `MakerMixin` (authored flat stances per the requirements). `pay` settles the resulting Charge. Mix `TabMixin` onto the venue *only* when it extends credit; without it every sale settles immediately. A future player shop puts `TabMixin` on its own venue object the same way. The general variable/relational vendor-stance abstraction is the **deferred trade build** (a banking non-goal). [Mixin or Document]

**`api/banking.ts`** — `BankingApi`, thin forwarding shell over `BankingLogic` (the `renown.ts`/`corpo.ts` template: `StuffApi.singletonSync`, `HotReloadApi.getCurrentExport`, ends `SecurityApi.decorateApiClass`). Re-exports the call-shape types (`Money`, `Charge`, `LedgerEntryFields`, `RemittanceSplit`). [Api]

**`obj/api/BankingLogic.ts`** — `@Unshadowable extends Idea` at `/obj/api/banking`, gated `FromModule('mud/api/banking#BankingApi')`, all sub-logic in module-private free functions (`postTransaction`, `active`, `durableKey`, `balanceOf`, …), connection-guarded via `PersistApi.isConnected()`. [Api logic singleton]

**`obj/Coin.ts`** — `GlobbableMixin(ContainableMixin(TangibleMixin(NamedMixin(Idea))))` (verify the exact shipped Tangible/Containable base stack against `BrandedBottle`/the glob author guide); `globIdentityFields = ['denomination']`; per-coin mass via `Tangible.setMass`. The cash object. A **concrete standalone content object** (composes only shipped mixins, defines no banking mixin), so it lives at top-level `/obj/` beside `Flask`/`AirTank`/`Campfire` — **not** in `lib/banking/`. (Contrast `PaymentCard`/`PaymentImplantUpdate` below, which instantiate the banking-defined `PaymentCredentialMixin` and so live with it in `lib/banking/`, the `TravelCredential` precedent.) [Stuff class]

**`obj/CentralBank.ts`** — the singleton mint/sink. A `PostRegistrationMixin(Idea)` singleton at `/obj/CentralBank` (the catalogue-singleton precedent; singleton-destruct refusal). Holds the CB account identity; its mint/drain/float surface is exposed **through `BankingApi`** (developer-gated), not as a free Stuff method players can reach. [Stuff/Idea singleton]

**Verb MVC triples** (each: `cmd/<cat>/<verb>.yaml` + `obj/command/<cat>/<Verb>Controller.ts` + `seeds/obj/command/<cat>/<Verb>Controller.yaml` reg seed — the `advancement-plan` controller-registration layer). Category placement is an open choice (§Verb surface); proposed home `mud/cmd/banking/` + `obj/command/banking/`:
- `open.yaml` / `OpenController.ts` — open an account at the present bank.
- `deposit.yaml` / `DepositController.ts`
- `withdraw.yaml` / `WithdrawController.ts`
- `transfer.yaml` / `TransferController.ts`
- `balance.yaml` / `BalanceController.ts` — read your balance at this branch (Law 1 count).
- `pay.yaml` / `PayController.ts` — the uniform settlement verb (`--cash` / default-implant / `--from <bank>` / present-card; `pay <who> <amount>` stated transfer; settles a presented Charge for purchase/tab).
- `wallet.yaml` / `WalletController.ts` — switch the implant's active account.
- `freeze.yaml` / `FreezeController.ts` — report-lost: freeze a credential, reissue.
- `tab.yaml` / `TabController.ts` — run/settle a tab (subcommands or `tab` + `pay`).
- `payroll.yaml` / `PayrollController.ts` — developer/employer-gated wage payment.
- `mint.yaml` / `MintController.ts` — developer-gated CB mint/drain/float (operator surface).
- `pnl.yaml` / `PnlController.ts` — read the bar's P&L (a categorized ledger read).
- `supply.yaml` / `SupplyController.ts` — developer-gated supply + reconciliation query.

**Seed data (authored content, `seeds/`):**
- `seeds/obj/CentralBank.yaml` — the CB singleton (+ its unissued-reserve seeding).
- `seeds/domain/eternal/<corpo>-bank.yaml` — the corpo-affiliated branch, authored as **city content** (a building on/off University Avenue — `domain/eternal/` is the Eternal University city, where world locations live; there are no city-specific *classes*, so this is a pure seed template composing `BankMixin` onto a `Location`, affiliating via `corpoKey`/`BrandedMixin` to the shipped corpo roster — goodkin retail, vionne private, aevex fintech, veshko lender). Wire an exit from the University Avenue plaza; reachable from the bar via the born-with University-Avenue fast-travel node. v1 needs only **one** reachable branch for the demo.
- `seeds/domain/eternal/npc/<teller>.yaml` — placeholder NPC teller in the branch (`/lib/character/Crafter` or the plain `NPC` class + `Persona` + canned `greets`/`idles` brains — the `dave.yaml` shape; a name, a role line, presence; full characterization deferred).
- `seeds/domain/lounge/bar-account.yaml` (or fold into the bar seed) — the bar's account + a starter coin float.
- A treasury placeholder account seed (accumulating sales-tax sink).
- A starter coin-stack seed for demo/testing.

**Edits to existing files:**
- `backend/PersistenceManager.ts` — add `Collections.BankLedger='bank_ledger'`, `Collections.BankAccounts='bank_accounts'`, `Collections.BankSupply='bank_supply'`; add index blocks in `createIndexes()` (mirror the `RenownEvents`/`Renown` blocks).
- `lib/mixin.ts` — `Mixins.Bank`, `Mixins.PaymentCredential`, `Mixins.Tab` (+ predicates).
- `lib/paths.ts` — any `TemplatePathPrefixes` needed for accounts/banks.
- `AppBootstrap` / `bootstrap.ts` `bootstrapManifest` — warm `AccountBalance.warm()` + `SupplyAggregate` at boot (the `RenownStanding.warm()` precedent) and warm `/obj/CentralBank`.
- `mud/config/app-settings.yaml` + `AppSettingKeys` — the authored/inert dials: demo sales-tax rate, default per-card / per-implant spend caps, default branch till liquidity. (Authored, not governed — the corpo-affiliation-edge precedent.)
- `docs/subsystems/banking.md` (new, source of truth) + `CLAUDE.md` (doc-map entry + collections list).

## 3. Phase breakdown

Each phase ends green (typechecks + its colocated Vitest suite passes +
`pnpm lint`, `pnpm lint:pm`, `pnpm lint:gates` stay green) and is
independently reviewable. **AC#** refers to the requirements' Acceptance
criteria, in document order. Phase ordering is the requirements' mandated
sequence: **money spine first**, then bank ops, then settlement +
credentials, then tabs/wages/tax/P&L, then bar content + reporting.

### Phase 1 — The money spine (cash, ledger, balance, CentralBank, conservation)

The reusable substrate every bar-facing surface rides. No verbs yet
except a developer mint to seed liquidity for tests; no settlement.

- **`Coin`** (`obj/Coin.ts` — concrete content object, top-level `/obj/`
  beside `Flask`/`AirTank`, not `lib/banking/`) — `Globbable` + `Tangible` mass +
  `Containable`. Verify the composition against the glob constraints
  (`Globbable ⊥ Container`, `Globbable ⊥ Singleton`,
  `globIdentityFields ⊂ persistentFields`). Per-coin mass seeded from
  template `data.mass`; a stack's borne mass = per-coin × `getQuantity()`
  flows through the shipped `LoadBearing` weighted tree-walk (no new
  encumbrance code — coin is just massed Tangible matter).
- **`Money`** value-object (`lib/banking/Money.ts`) — integer minor units,
  arithmetic, render. No floats in ledger math.
- **`LedgerEntry`** (`lib/banking/LedgerEntry.ts`, `bank_ledger`) — the
  rich-tagged append-only row (the `RenownEvent` shape). Fields (the
  reporting substrate guarantee — tag richly so reports need no backfill):
  `kind` (`'mint'|'drain'|'deposit'|'withdraw'|'transfer'|'payment'|'wage'|'tax'`),
  `fromAccount`, `toAccount`, `amount` (minor units), `memo`, `category`
  (P&L line: `'sales'|'cogs'|'wages'|'subsidy'|'tax'|…`), `actor` (durable
  key from `getActingAuthor`), `scope`/`locality` (the renown
  scope-location tag), `at` (game-seconds), `realAt` (epoch ms). Indexed
  on `fromAccount`, `toAccount`, `{kind}`, and `at` (mirror the
  `renown_events` index block).
- **`AccountBalance`** (`lib/banking/AccountBalance.ts`, `bank_accounts`) —
  materialized warm cache (the `RenownStanding` shape: `_cache` Map,
  `warm()`, `cached()`, `key(accountId)`, `_resetForTesting`). Carries the
  account registry fields too (owner durable key, `bankPath`, `corpoKey`,
  `isPrimary`, `isActive`) OR a sibling registry row — see open choice.
  **Rebuildable from the ledger:** a `rebuild(accountId)` replays
  `bank_ledger` rows; the cached value must be byte-identical to the
  replay (AC: rebuild-from-log).
- **`SupplyAggregate`** (`lib/banking/SupplyAggregate.ts`, `bank_supply`) —
  the O(1) running headline, bumped by `postTransaction` on mint/drain,
  rebuildable by a full ledger scan.
- **`CentralBank`** (`obj/CentralBank.ts`) — the singleton holding the CB
  account identity + the unissued reserve. Its mint/drain/float logic
  lives in `BankingLogic`, surfaced via `BankingApi` (developer-gated).
- **`BankingApi` / `BankingLogic`** — the gated pair. Phase-1 surface:
  - `mint(toAccountId, amount, memo)` / `drain(fromAccountId, amount, memo)`
    — developer-gated (the controller checks `AccessApi.isDeveloper`;
    actor from `getActingAuthor`); each a `postTransaction` mint/drain.
  - `float(bankOrVendorAccountId, amount)` — convenience over mint.
  - `balanceOf(accountId)` — sync warm read.
  - `entriesFor(accountId)` — the substrate ledger reader.
  - `rebuildBalance(accountId)` / `recomputeSupply()` — the audit seams.
  - `boot()` — warm caches + warm CentralBank.
  - **`postTransaction`** — the sealed conservation chokepoint (§1).
- **Modify** `PersistenceManager.ts` (collections + indexes), `lib/mixin.ts`,
  bootstrap warm wiring, app-settings dials.
- **Tests:** `obj/__tests__/Coin.test.ts` (split/merge/count +
  mass→encumbrance coupling through the shipped gauge — AC#1); the rest in
  `lib/banking/__tests__/` —
  `LedgerEntry.test.ts` (round-trip + the entry-shape assertion: kind /
  from-to / amount / both clocks / scope-location — AC: entry shape);
  `AccountBalance.test.ts` (warm cache == replay-from-log, byte-identical —
  AC#2); `BankingLogic.conservation.test.ts` (a property/invariant test:
  total supply invariant under a mixed op sequence, changes only by
  mint/drain, a deliberately-unbalanced posting **throws** — AC#3);
  `BankingLogic.supply.test.ts` (supply = CB net issuance; reconciliation
  equality after a mixed sequence — AC: supply query + reconciliation).

**AC covered:** #1 (coin/mass), #2 (rebuild-from-log), #3 (conservation),
entry-shape, supply/reconciliation substrate.

### Phase 2 — Custodial bank ops (open, deposit, withdraw, transfer)

The bank bridges cash and accounts, 1:1, can't fail. Accounts reached by
identity. Corpo affiliation recorded.

- **`BankMixin`** (`lib/banking/Bank.ts`) — corpo affiliation
  (`corpoKey`/`BrandedMixin`, resolved via `CorpoApi`), the cash vault
  accounting, `tillLiquidity`, and `commandContributions` lighting up the
  banking verbs at the branch.
- **Account resolution by identity** in `BankingLogic`: at a branch,
  "your account" = `resolveAccount(actor, bankPath)` using the actor's
  durable key (`getActingAuthor` → `templatePath`) + the branch — **no
  account number typed** (AC#7). A durable `accountId` keys the ledger
  underneath (the `templatePath`/`ContactsMixin` "durable id, friendly
  identity" pattern). Multi-account: keyed per `{owner, bankPath}`, a
  designated primary for identity-addressed receiving (AC#8).
- **`BankingApi` additions:**
  - `openAccount(bankPath)` — actor from context; mints an `accountId`,
    creates the `AccountBalance` registry row, records the corpo
    affiliation (the bank's `corpoKey`; readable via the corpo substrate —
    AC#5), auto-registers the account to the actor's implant wallet
    (Phase 3 dependency: stub the link now, wire in Phase 3), sets primary
    if first.
  - `deposit(bankPath, coinStack)` — coin → balance: `postTransaction`
    credits the account, the coin enters the vault (move the `Coin` Stuff
    into the bank's vault container), the two legs balance.
  - `withdraw(bankPath, amount)` — balance → cash: debit the account,
    coin out of the vault (bounded by `tillLiquidity` — a withdrawal
    exceeding the branch's till is refused with a diegetic reason, not an
    arbitrary gate — AC#13); split/clone a `Coin` stack out.
  - `transfer(fromAccountId, toAccountId, amount)` — balance → balance,
    conserving.
  - **1:1 invariant:** the vault's coin total always equals Σ balances at
    that bank; assert in `postTransaction` for bank-scoped legs (AC#4).
- **Verbs:** `open`, `deposit`, `withdraw`, `transfer`, `balance` (MVC
  triples + reg seeds). `balance` is a Law-1 count read.
- **Seeds:** the corpo-affiliated branch fixtures + placeholder tellers
  (the `dave.yaml` shape) — AC: staffed branch.
- **Tests:** `Bank.custodial.test.ts` (deposit/withdraw/transfer; vault ==
  Σ balances after any sequence — AC#4); `open.affiliation.test.ts` (open
  records a readable corpo affiliation — AC#5); `resolution.test.ts` (no
  typed number; identity + branch context resolves; multi-account
  disambiguation — AC#7, #8); `withdraw.liquidity.test.ts` (till bound —
  AC#13 part); controller tests for the five verbs; a teller-presence test
  (AC: NPC teller present during interactions).

**AC covered:** #4, #5, #7, #8 (partial — multi-account receive), #13
(till-liquidity bound), NPC-teller.

### Phase 3 — Uniform settlement + the credential risk ladder

One `pay` primitive, method-as-parameter, the Charge model; the dual-base
credential; the freeze/cap recourse ladder.

- **`PaymentCredentialMixin`** (`lib/banking/PaymentCredential.ts`) — the
  `TravelCredentialMixin` shape, base-agnostic: linked-account set, active
  pointer, `spendCap`, `frozen`, `authorize(amount)` (rejects over-cap or
  frozen). `PaymentCard` (`PaymentCredentialMixin(Thing)`, 1:1) and
  `PaymentImplantUpdate` (`PaymentCredentialMixin(AetherHostedMixin(Idea))`,
  the wallet linking all accounts, one active). Reached via the
  shipped host-descent + carried-inventory `findReachable` legs (the
  `teleport` TPA-fork precedent — one scan, either base).
- **`Charge`** value-object + **`BankingApi.settle(charge, method)`** —
  the polymorphic-mechanism-behind-uniform-surface primitive (the
  `ContainmentApi.move` pattern):
  - method `cash` → coin handover, off the governed ledger (the coin Stuff
    moves payer→payee; no `AccountBalance` touched; cash-in-existence
    derived as `supply − Σ balances`, unchanged by hand-to-hand).
  - method `credential` (implant active / `--from <bank>` override /
    presented card) → `authorize` then an on-ledger `postTransaction`
    payment routed through the owning corpo bank.
  - **presented vs stated:** a presented Charge carries its amount (the
    payer never types a purchase price — the bar prices it); a stated
    transfer is payer-initiated (`pay <who> <amount>`).
  - **remittance-split seam:** `charge.splits[]` route cuts to third-party
    accounts alongside the main leg; `postTransaction` balances across all
    legs (AC: split clears, conservation holds).
- **The implant-as-wallet routing:** silent-pay-from-active (no
  point-of-sale prompt — the time-respect valve) while the settlement
  scene **names** the credential/account tapped ("you tap your Goodkin
  implant" — `MessageApi.scene`). `wallet` switches the active account
  (persists; changes the routing corpo bank); `pay --from <bank>`
  overrides for one payment without disturbing the active setting. A card
  pays 1:1 from its own account.
- **The risk ladder + recourse:** `freeze` (report-lost) revokes a
  credential (sets `frozen`, account/balance **untouched**), reissue mints
  a fresh card; per-credential `spendCap` bounds pre-freeze damage; the
  implant is body-bound (extraction deferred). No fees/maintenance (Law 2).
- **Verbs:** `pay` (the uniform settlement verb — method flags), `wallet`,
  `freeze`. Wire `open` (Phase 2) to auto-register the new account onto the
  actor's implant wallet now.
- **Hook crafting:** the drink purchase routes crafting's `order`/`serve`
  price into a **presented Charge** settled by this `pay` (the bar prices
  it from its stance). Confirm the crafting `order` flow returns/exposes a
  price stance to build the Charge from — if it does not yet, the bar's
  drink prices are authored flat stances on the `Menu`/recipe (a small
  authored price field), per the requirements' "authored flat stances."
- **Tests:** `settlement.cash.test.ts` + `settlement.credential.test.ts`
  (both paths, off-ledger vs on-ledger distinction — AC: clears both ways);
  `pay.uniform.test.ts` (presented-purchase + stated-transfer through one
  primitive, by cash and credential, method-as-parameter — AC: single pay
  flow); `wallet.routing.test.ts` (active-account routing, switch,
  `--from` override — AC: implant wallet); `credential.ladder.test.ts`
  (spend-before-freeze, freeze-then-denied, account-untouched, reissue,
  per-card cap rejects over-cap — AC: found/stolen card + cap, AC#13 cap);
  `split.test.ts` (remittance split to a third account, conservation —
  AC: split).

**AC covered:** uniform `pay` / Charge, both settlement methods, implant
wallet + switch + override, credential ladder + freeze + reissue + caps,
remittance split, #13 (per-credential cap).

### Phase 4 — Tabs, wages, demo tax, and the P&L instrument

The credit primitive, the labor line, the tax seam exercised inertly, and
the deficit-as-target readout.

- **`TabMixin`** (`lib/banking/Tab.ts`) on the **venue `Location`** (the
  singleton `Bar`, not the bartenders/Menu — see §2): accrue
  unsettled charges against a known patron (the bartender acts on the
  venue's behalf, resolving the establishment it records against);
  **recognition-gated** (reads
  `RecognitionApi` — a privilege of being *known*); settle later via `pay`
  (cash or account). **Skipping** is possible and *priced*:
  `RegardApi.adjustRegard(creditor, patron, −delta)` + revoke the tab
  privilege (not prevented). The tab is the smallest credit primitive.
- **Wage payment:** `BankingApi.payWage(employerAccountId, workerId, amount)`
  — employer-account → worker (identity-addressed → worker's primary
  account), a `kind:'wage'` `category:'wages'` ledger line. **Who is
  employed is authored** (the bar's NPC staff draw a wage line — seed the
  staff with an employment marker the payroll reads); the employment
  *relationship* is out of scope. Developer/employer-gated.
- **Demo sales tax:** on a purchase, `settle` remits a token tax via the
  remittance-split seam to the **placeholder treasury account**
  (`kind:'tax'`, `category:'tax'`). Rate is an authored/inert AppSettings
  dial (recorded, not governed — the corpo-affiliation-edge precedent);
  the treasury merely **accumulates** (no appropriation path).
- **The P&L:** `BankingApi.profitAndLoss(bankAccountId)` — a categorized
  read of the bar's ledger (cogs/booze-in, sales, wages, subsidy, tax) +
  a running balance that **sits red by design** (Law 1: a count, not a
  worth-assertion). The `CentralBank` mints subsidy (`kind:'mint'`
  `category:'subsidy'`) to cover the red — a logged, visible, accountable
  faucet.
- **Verbs:** `tab`, `payroll`, `pnl` (+ the `mint`/`float` operator verb
  from Phase 1 now used to cover the deficit).
- **Seeds:** the treasury account; the bar's account + starter float; the
  staff employment markers + their wage lines.
- **Tests:** `tab.test.ts` (recognition-gated accrue → settle; skip →
  regard hit + privilege revoke — AC: tab consequence); `wage.test.ts`
  (employer→worker movement + the P&L wage line — AC: payroll);
  `tax.test.ts` (token tax remitted to treasury, appears in P&L, inert
  rate, treasury only accumulates — AC: demo tax); `pnl.deficit.test.ts`
  (seeded deficit scenario end-to-end: cogs/sales/wages/subsidy, running
  balance red, CB mint covers it — AC: deficit P&L).

**AC covered:** tab accrue/settle/skip, payroll + P&L line, demo tax +
P&L appearance, CB subsidy + red-by-design P&L.

### Phase 5 — Reporting consumers + the bar end-to-end demo + Law audit

The two and only two reporting consumers, the whole-loop exercise, and the
Law-compliance assertions.

- **Money-supply / reconciliation query:** `BankingApi.moneySupply()`
  (= CB net issuance / `Σ mints − Σ drains`, O(1) off `SupplyAggregate`)
  + `BankingApi.reconcile()` (the conservation audit: top-down minted ==
  bottom-up `Σ all coins in the world + Σ all account balances`;
  cash-in-existence = `supply − Σ balances`). The `supply` operator verb
  is the minimal consumer; "in circulation" = a filter excluding the CB's
  own holdings. These two (P&L from Phase 4 + supply/reconcile) are the
  **only** consumers; a full analytics surface is deferred.
- **The bar loop demo:** wire/seed the end-to-end exercise — open an
  account at a corpo branch → deposit cash → order a drink (shipped
  crafting) → `pay` it (cash or implant) or `tab` and settle later → the
  bar's ledger accumulates costs → the CB covers the red → the P&L shows
  the deficit. This is the AC: "whole loop exercisable at the bar."
- **Law-compliance audit:** assert no readable "worth" property on any
  good (amounts are transient settlement quantities + ledger records, never
  stamped on a Stuff); assert no fee/rent/decay accrues to an idle account
  or coin stack over a time advance (Law 2).
- **Tests:** `reconciliation.test.ts` (the equality after a mixed
  mint/deposit/withdraw/transfer/pay/wage/tax sequence — AC:
  reconciliation); `supply.test.ts` (the supply query — AC: supply);
  `law-compliance.test.ts` (no worth property; no idle fee/decay over a
  game-clock advance — AC: Law compliance); an integration
  `bar-loop.test.ts` (the full demo — AC: whole loop).

**AC covered:** money-supply query + reconciliation invariant, Law
compliance, whole-loop-at-the-bar.

### Doc phase (folded into the pre-merge sweep)

`docs/subsystems/banking.md` — the source of truth for the substrate:
cash / accounts / ledger / conservation chokepoint / CentralBank /
custodial bank / credential ladder / settlement / tabs / wages / tax seam
/ P&L / supply+reconciliation, with the deferred seams (lending, governed
reserve, employment relationship, live taxation, player-run banks, faction
approval, grey market) explicitly listed. Link it from CLAUDE.md's
documentation map; add the three new collections to CLAUDE.md's collection
list. (AC: banking.md exists + linked + collections listed.)

## 4. Proposed verb surface

| Verb | Category (proposed `banking/`) | Gate | Shape |
|---|---|---|---|
| `open` | banking | animate, at a branch | `open` (account at the present bank) |
| `deposit` | banking | animate, at a branch | `deposit <coin>` |
| `withdraw` | banking | animate, at a branch | `withdraw <amount>` (till-bounded) |
| `transfer` | banking | animate, at a branch / via credential | `transfer <amount> to <who>` |
| `balance` | banking | animate, at a branch / via credential | `balance` (Law-1 count) |
| `pay` | banking | animate | `pay <who/charge> [<amount>] [--cash \| --from <bank>]` — the uniform settlement verb |
| `wallet` | banking | animate, holds an implant | `wallet [<bank>]` — switch active account |
| `freeze` | banking | animate, owns the credential | `freeze <card>` — report-lost + reissue |
| `tab` | banking | recognition-gated patron | `tab` / `tab settle` / `tab skip` |
| `payroll` | banking | employer/developer | `payroll <worker> <amount>` |
| `mint` | banking | developer (`AccessApi.isDeveloper`) | `mint`/`drain`/`float` — CB operator surface |
| `pnl` | banking | (operator or bar-owner) | read the bar's categorized P&L |
| `supply` | banking | developer | money-supply + reconciliation query |

> **Open implementation choice:** whether all banking verbs share one
> `banking/` command category, or split operator verbs (`mint`/`supply`)
> into `author/`/`system/` beside `teleport`/`config`. This plan proposes
> one `banking/` category for the player surface and reuses the
> developer-gating pattern for the operator verbs; adjust if a reviewer
> prefers the operator verbs in `author/`.

## 5. New Mongo collections

Registered in `backend/PersistenceManager.ts` (`Collections` enum +
`createIndexes()`) and listed in CLAUDE.md, following the renown
event-log + materialized-standing indexing precedent:

| Collection | Shape | Indexes (mirror) |
|---|---|---|
| `bank_ledger` | append-only `LedgerEntry` rows (the system of record) | `{ fromAccount: 1 }`, `{ toAccount: 1 }`, `{ kind: 1 }`, `{ at: 1 }` (the `renown_events` block) |
| `bank_accounts` | materialized `AccountBalance` + account registry rows (rebuildable cache) | `{ accountId: 1 }` unique, `{ owner: 1 }`, `{ bankPath: 1 }` (the `renown` block) |
| `bank_supply` | the single-row running `SupplyAggregate` headline (rebuildable) | none needed (single row) |

## 6. Open implementation choices (flagged, not silently decided)

1. **Mint balancing** (§1) — unissued-CB-reserve (every posting zero-sum)
   vs single-leg faucet (supply = `kind`-filtered scan). Plan assumes the
   former; latter is the sanctioned fallback. Record the choice in
   `banking.md`.
2. **Account registry home** — fold the registry fields onto
   `AccountBalance` rows in `bank_accounts`, or a separate `Account`
   Document. Plan leans to folding (one collection, the `RenownStanding`
   precedent carries both the key and the value); split only if the warm
   cache gets muddy.
3. **Tab persistence** — `TabMixin` on the creditor (session-state, the
   `TravelCredential` v1 caveat) vs a `Tab` Document for cross-restart
   durability. Plan leans to the mixin for v1 parity with the credential's
   session-durable precedent; flag if cross-restart tabs are required.
4. **Crafting price source for the presented Charge** — whether crafting's
   `order`/`serve` already exposes a price stance, or the bar's drink
   prices are authored flat stances on the `Menu`/recipe. Verify against
   the live crafting surface in Phase 3; the requirements explicitly allow
   authored flat stances, so default to an authored price field if no
   stance hook exists.
5. **Verb category** (§4) — one `banking/` category vs operator verbs in
   `author/`.
6. **Branch/teller homing** — *resolved:* the bank is **city content under
   `seeds/domain/eternal/`** (a building on/off University Avenue, the
   Eternal University city where world locations live), authored as a seed
   template composing `BankMixin` onto a `Location` (no city-specific
   class). Wire an exit from the University Avenue plaza; reachable from the
   bar via the born-with University-Avenue fast-travel node. The demo needs
   only one reachable branch. (Remaining sub-choice: whether `BankMixin`
   hosts on the branch `Location` itself or on a teller-counter `Thing`
   fixture inside it — the `Menu`-fixture precedent; builder's call.)

## 7. Cross-references

- Spec: [banking-requirements.md](../requirements/banking-requirements.md).
- Precedents (read before each phase): [renown.md](../subsystems/renown.md) /
  [participation.md](../subsystems/participation.md) /
  [provenance.md](../subsystems/provenance.md) (the `lib/standing/` ledger
  shape + `PersistApi`/`lint:pm` seal), [glob.md](../subsystems/glob.md) +
  [encumbrance.md](../subsystems/encumbrance.md) (massed coin),
  [corpo.md](../subsystems/corpo.md) (bank affiliation),
  [fasttravel.md](../subsystems/fasttravel.md) +
  [augmentation.md](../subsystems/augmentation.md) (the dual-base
  credential), [crafting.md](../subsystems/crafting.md) (the bar's
  order/serve + conservation discipline), [belief.md](../subsystems/belief.md)
  (recognition + `RegardApi` for tabs), [access.md](../subsystems/access.md)
  (the developer gate), [persistence.md](../subsystems/persistence.md)
  (the `PersistApi` chokepoint).
- Conventions: CLAUDE.md *Module Categories*, *Go Through the API Layer*,
  *Inter-Stuff Contract*, *Member Privacy*, export discipline; memory:
  *gated-api-actor-from-context*, *no-logic-module-imports*,
  *prefer-fewer-directories*.
- Forward-links (deferred consumers): the trade/clearing build, the
  lending build, the employment build (consumes wage-payment), the
  cooperative build (the governed reserve), the corpos faction-approval
  game (consumes the recorded bank affiliation).
