# Currency — implementation plan

Phase 2 for [currency-requirements.md](../requirements/currency-requirements.md).
This plan says **how**; the requirements say what and why and are not
re-litigated here. Where the seeding slates
([currency-slate](../slates/builds/currency-slate.md),
[multi-currency-slate](../slates/tails/multi-currency-slate.md)) differ
from the requirements, the requirements win — and this plan follows the
requirements.

Read before executing: the requirements, [banking.md](../subsystems/banking.md),
and CLAUDE.md § *Module Categories*, § *Inter-Stuff Contract*, § *Member
Privacy*, § *Go Through the API Layer*.

§0 settles the three decisions the requirements delegate. §1 orders the
waves. §2–§9 are the waves. §10 is the risk register, §11 the concerns —
including two places where this plan **corrects or extends** the
requirements' picture of the world.

---

## 0. The delegated decisions, settled

### 0.1 The currency-record module shape — **a registry, not a data Idea + catalogue**

**Decision: `packages/server/src/mud/lib/banking/Currency.ts`**, in the
sanctioned **"Named value-object / vocabulary / registry"** category
(CLAUDE.md: *"a substrate primitive that isn't an instanceable Stuff but IS
the module's one concept: value class, enum-like vocabulary + its
validation array, or a platform registry"*). It is the direct generalization
of today's `Coinage` statics — same folder, same category, one concept per
file.

```ts
/** One denomination: identity is (currency, value). No name required. */
export interface Denomination {
  /** Face value in minor units — the STRUCTURAL identity key. */
  readonly value: number;
  /** Per-coin mass in kilograms. */
  readonly massKg: number;
  /** Optional issuer-chosen coin name. The Compact does not use it. */
  readonly label?: string;
}

/** One currency, whole. Every currency-intrinsic fact lives here. */
export interface CurrencyRecord {
  readonly key: string;             // 'zorkmid' — the durable join
  readonly unit: string;            // 'zorkmid'  (render, singular)
  readonly plural: string;          // 'zorkmids' (render, plural)
  readonly issuer: string;          // institution key — 'central-bank'
  readonly governorOffice: string;  // 'central-bank-governor'
  readonly denominations: readonly Denomination[]; // largest-first
}
```

`Currency` is a static-method class over a private `Map<string, CurrencyRecord>`
holding exactly one shipped record (the zorkmid). Surface:

| Method | Note |
|---|---|
| `of(key): CurrencyRecord` | **throws** on unknown |
| `has(key)` / `all()` | `all()` is what per-currency reports iterate |
| `compact(): string` | §0.2 |
| `faceValueOf(currency, denomination): number` | ⚠ **throws** on an unknown pair — the `?? 1` retirement |
| `perCoinMass(currency, denomination): Quantity<'kg'>` | ⚠ **throws** on an unknown pair |
| `baseDenomination(currency): number` | the 1-unit coin |
| `renderMinor(minor, currency): string` | `Money.render()` delegates here |
| `describeDenomination(currency, value): string` | `label ?? "a 25-zorkmid piece"` |
| `_registerForTesting(record)` / `_resetForTesting()` | `SecurityApi.assertTestOnly` — §9 |

**Why not a data `Idea` + catalogue (the `Corpo`/`CorpoCatalogue` shape).**
Four reasons, in ascending weight:

1. **Sync, pure, boot-order-free.** `Currency.faceValueOf` is on the hot path
   of `Coin.getMass()`, `reconcile()`, `Coinage.planSpend`, and the
   `Perceptible` keyword getter. A catalogue is warmed asynchronously in
   `postRegister` from the `domain` collection; a cold catalogue (every unit
   test that skips the clone pipeline, plus any read before boot completes)
   would resolve nothing — and *nothing* now **throws**. Every existing
   `Coin` test would need a warmed catalogue to survive.
2. **The fixture currency (requirements § *the generalization is proven by a
   test-only currency*) must never exist in a live collection.** A catalogue
   sources its records from `domain` rows; a fixture would have to be either
   seeded (forbidden) or injected through a test-only cache poke — which is
   the registry's `_registerForTesting` seam with extra machinery underneath
   it. The registry satisfies the requirement *by construction*: currency
   records are code, and code is not a collection.
3. **A code edit is the sanctioned way to add a currency.** The requirements
   are explicit: *"Adding a currency therefore requires a code/content edit
   at the wizard tier — which is the reserved-matter constraint in its
   crudest honest form, not a gap."*
4. **No new Api.** A catalogue singleton wants a read face; the requirements
   forbid a `CurrencyApi`, and reaching a Stuff singleton from a pure
   value-object in `lib/` would be the wrong shape anyway. `api/banking.ts`
   simply **re-exports `Currency`** beside its existing `Money` / `Account`
   re-exports — the whole surface, no new tier.

The door to authored currencies stays open and is *one* seam wide: a future
scrip build adds a catalogue that reads `domain` rows and calls
`Currency.register(...)` into this same map. Nothing else changes. **Do not
build that now.**

⚠ **The record carries no rate and no cross-currency reference — permanently.**
Write that constraint into the module doc comment in those words. A `pegRate`
field beside the denominations is the world-oracle shape (requirements §
*A peg is a promise, not a rate*); a peg belongs to an issuer's standing
offer, not to the money.

`Coinage.ts` **survives** as the pure make-change **algebra** (`dispense` /
`planSpend`), now currency-parameterized and holding **zero** currency data —
it reads `Currency.of(key).denominations`. Its doc comment must say so, so
nobody re-lands a constant there.

### 0.2 "Which currency?" — `banking.compactCurrency`, read through one accessor

Several sites must answer *"what currency is this, when there's no account to
ask?"* — `openAccount`, a fresh venue/treasury account, `reserve issue`, the
migration backfill.

**Decision: a new AppSetting `banking.compactCurrency` (seeded `zorkmid`),
read by exactly one accessor, `Currency.compact()`.** Nothing else in the
codebase may name a currency.

This is precisely what the requirements demand of the zorkmid's specialness:
*"policy data, not a branch in the banking substrate"* and *"Reserve status is
functional, never decreed."* The code never compares a currency to a literal;
it asks which currency the Compact transacts in, and that answer is
configuration.

⭐ **It is also the acceptance test's lever.** The acceptance test (§9) flips
`banking.compactCurrency` to the fixture currency and drives the *entire*
banking flow. If any path knew the zorkmid was special, that run would fail.
"Nothing in the code knows it is special" is then **proved by substitution**,
not asserted by grep.

### 0.3 Currency joins the account-resolution key

Accounts are single-currency (requirements § *Accounts are single-currency*).
The consequence, which must be applied uniformly or the acceptance test cannot
run: **every place that resolves "the account for X" gains a currency.**

| Was | Becomes |
|---|---|
| `accountAtImpl(owner, bank)` | `accountAtImpl(owner, bank, currency)` |
| `primaryAccountIdOf(ownerKey)` | `primaryAccountIdOf(ownerKey, currency)` |
| `ensureVenueAccountImpl(ownerPath, bank, corpoKey)` | `+ currency` |
| `ensureCorpoTreasuryImpl(corpoKey, bank)` | `+ currency` |
| `myAccountAt(bank)` | `+ currency` |
| the demo-tax treasury id (`banking.treasuryAccount`, `"treasury"`) | **always** `` `${treasuryId}:${currency}` `` |
| `Account.CENTRAL_BANK` (`"central-bank"`) | `Account.centralBankAccountFor(currency)` → `` `central-bank:${currency}` `` |

⚠ The two well-known **fixed** account ids (`treasury`, `central-bank`) are
suffixed **unconditionally** — never "the bare id for the compact currency,
suffixed otherwise". A conditional there would be exactly the zorkmid branch
the acceptance test exists to forbid. The live rows are renamed by the
migration (§8).

`Account.escrowAccountFor(contractId)` is **unchanged** — a contract has one
currency and the escrow row carries it.

---

## 1. Wave sequencing

```
W0 census (read-only, against a copy of live data)  ── retires the migration's unknowns
 │
W1 the Currency registry + the fixture seam   ── retires "what shape", "no rate", the throw
 │
W2 the Money.of currency sweep (mechanical)   ── compiler enumerates the threading
 │
W3 the durable spine: LedgerEntry / AccountBalance / SupplyAggregate
 │     + per-currency conservation + the 16 postTransaction sites   ── THE core
 ├── W4 cash: Coin (currency, faceValue), glob identity, presentation
 └── W5 issuer + per-issuer mint authority + per-currency reporting
 │
W5b money integrity: the gates + the instrument   ── MUST precede W6
 │
W6 migration + rehearsal (the deploy gate)
 │
W7 the acceptance test + banking.md + deployment.md
```

⚠ **W5b is not optional and its position is load-bearing.** W6's
rehearsal uses `reserve supply → balanced: true` as its verification gate.
`reconcile` today has two structural blind spots (§7b), so **that gate is
untrustworthy until W5b lands.** Fixing the instrument after the
migration would mean the migration was never actually verified.

Each wave leaves the tree green (`pnpm test`, `pnpm lint`, `pnpm build`) and
is independently reviewable.

**Risk order.** The migration is the highest-risk item, and it is
*structurally* last (it needs the target schema). What can be retired on day
one is its **unknowns** — so **W0 is a read-only census script run against a
restored copy of the live DB, before a line of production code changes.** It
answers "how much is out there, in what shapes, and where" and produces the
"before" fingerprint the rehearsal compares against. It costs an afternoon and
it is the difference between a rehearsal and a hope.

**The fixture currency ships in W1**, not at the end, so W3's per-currency
conservation tests have a second currency to conserve from day two.

---

## 2. Wave 0 — the census (read-only)

### New

| File | Category |
|---|---|
| `packages/server/scripts/currency-census.ts` | Script (sibling of `check-*.ts`; `scripts/` is outside `src/`, so `lint:module-scope` and the import boundary do not apply) |

Connects with the raw `mongodb` driver to a **restored copy** of the live
database (never production) and prints, writing nothing:

- `bank_ledger`: row count; Σ `amount` grouped by `kind`; count of rows already
  carrying `currency` (expected 0).
- `bank_accounts`: row count; per-`accountId` balance; Σ balance; the set of
  distinct `accountId`s matching the well-known fixed ids (`treasury`,
  `central-bank`, `tpa`) — §0.3's rename targets.
- `bank_supply`: the row(s); `minted − drained`.
- `domain`: the `/obj/Coin` row's `data` verbatim.
- `holder_snapshots`: a recursive walk counting every content entry with
  `templatePath === '/obj/Coin'`, grouped by its captured `denomination`
  string, with Σ `quantity` per group and the implied Σ value under
  **today's** face-value table.
- Any `denomination` string encountered that is **not** one of
  `credit` / `crown` / `sovereign` — a non-empty list here changes the plan.

### Why this shape

The coin population is **not** where the requirements imply. `BankCounter`
does *not* compose `PersistableMixin` (it is
`BankMixin(DetailedMixin(PostRegistrationMixin(Vessel)))`), so **vault coin
does not survive a restart** (the opening float re-seeds lazily on the first
customer). The durable coin population is:

1. Coins captured inside `holder_snapshots` blobs (avatar inventories,
   persistable containers) — a **nested-JSON** rewrite, the real work; and
2. the `/obj/Coin` **`domain` template row** — which the requirements do not
   name and which is the one that matters most: the seeder is INSERT-ONLY, so
   editing `Coin.yaml` leaves the live row stamping every *future* coin with a
   legacy denomination forever.

The census is what confirms both, on real data, before anything is committed
to.

### Tests

None (a script, run by hand as part of the rehearsal). Its output is checked
into the MR description as the "before" fingerprint.

---

## 3. Wave 1 — the `Currency` registry

### New

| File | Category |
|---|---|
| `mud/lib/banking/Currency.ts` | Named value-object / vocabulary / **registry** (§0.1) |
| `mud/lib/banking/__tests__/Currency.test.ts` | Test |

### Modified

- **`mud/lib/banking/Coinage.ts`** — `DENOMINATIONS`, `BASE_DENOMINATION`,
  `faceValueOf`, `perCoinMass` **deleted** (they move onto the currency
  record). `dispense(currency, value)` and `planSpend(currency, supply, value)`
  become currency-parameterized and read `Currency.of(currency).denominations`.
  `CoinLine` / `CoinSupply` gain `currency` and their `denomination` becomes a
  `number`. Doc comment rewritten: *"holds no currency data."*
- **`mud/lib/banking/Money.ts`** — `DEFAULT_CURRENCY` and `COIN_FACE_VALUES`
  **deleted**. `Money.faceValueOf` **deleted** (callers move to
  `Currency.faceValueOf(currency, denomination)` — the requirements' "both
  face-value lookups" become **one**). `render()` → `Currency.renderMinor(this.minor, this.currency)`.
  `Money.of` / `Money.zero` lose their default argument (W2 lands the call
  sites; W1 leaves the default in place so the tree stays green, and W2
  removes it — or land both in W2 if the build agent prefers one commit).
  `assertSameCurrency` is untouched and stays the *only* arithmetic guard.
- **`mud/lib/config/AppSettings.ts`** + **`mud/config/app-settings.yaml`** —
  `bankingCompactCurrency: "banking.compactCurrency"`, seeded `zorkmid`,
  documented as *the currency the Compact transacts and denominates its
  obligations in* (policy data, not a property of the money).
- **`mud/api/banking.ts`** — re-export `Currency` and its types beside `Money`
  / `Account`. No new method.
- **`mud/lib/banking/__tests__/banking-test-harness.ts`** — export
  `TEST_CURRENCY` (the fixture record, §9) and install/uninstall it in
  `installBankingHarness` / `teardownBankingHarness`.

### Tests

`Currency.test.ts`:
- the zorkmid record's denominations are `[25, 5, 1]`, masses `8/4/2 g`, no
  labels;
- `faceValueOf` / `perCoinMass` **throw** on an unknown denomination and on an
  unknown currency (⭐ the `?? 1` retirement — AC *"An unknown denomination
  throws at both face-value lookups"*, now one lookup);
- `renderMinor` reads unit/plural off the record (`1 zorkmid` / `12 zorkmids`);
- `describeDenomination` yields `"a 25-zorkmid piece"`, and yields the `label`
  when one is present (drive with the fixture record);
- ⚠ **shape assertion**: `Object.keys` of a `CurrencyRecord` contains no key
  matching `/rate|peg|exchange|convert|worth|vs|per/i`, and no field whose
  value is another currency's key. This is the mechanized form of the AC *"the
  currency record holds no rate and no cross-currency reference"*, and it will
  fail the moment somebody adds one.
- `_registerForTesting` throws when the caller is not test code
  (`SecurityApi.assertTestOnly`).

`Coinage.test.ts` updated to the currency-parameterized signatures;
`sovereign` / `crown` disappear from it.

### Risk

Low. Pure modules with no persistence. The one thing to get right is that
`Coinage` retains **no** constant — grep it after.

---

## 4. Wave 2 — the `Money.of` currency sweep

One mechanical pass, no behaviour change, reviewed as such.

### Modified

- **`mud/lib/banking/Money.ts`** — `Money.of(minor, currency)` and
  `Money.zero(currency)`: **the currency parameter becomes required.**
- **60 production call sites + 114 test sites** (`grep -rn "Money\.of(\|Money\.zero("`
  — counts verified). Every site passes `Currency.compact()` unless a currency
  is already in hand (`charge.amount.currency`, `amount.currency`). W3
  re-points the account-derived subset to the account's own currency — a
  deliberate double touch at ~15 sites, kept separate so this wave stays
  reviewable as "mechanical".
  Heaviest files: `ReserveController` (8), `BankingLogic` (8),
  `BuyController` / `BankController` / `ContractLogic` (5 each),
  `TipController` / `OrderController` / `HouseController` (4 each).
- **`mud/lib/banking/__tests__/banking-test-harness.ts`** — export a
  `zm(minor)` helper (`Money.of(minor, ZORKMID)`) so the test sweep is a
  find/replace rather than 114 judgement calls.

### Why a required parameter and not a default

**The compiler enumerates the migration.** A default (even
`Currency.compact()`) lets a site silently assume the wrong currency; the
endpoint check in W3 would catch the *ledger* consequence, but only at
runtime, and only for sites that post. A required parameter turns the whole
threading into a compile error list — which is the strongest available defence
against the one bug class the requirements call unrecoverable. This is the
single largest mechanical cost in the build; see §11 *Concerns* 1.

### Tests

No new tests. `pnpm build` is the test: the sweep is done when it compiles.
The full existing suite must pass unchanged — this wave changes no behaviour.

---

## 5. Wave 3 — the durable spine (the core)

### Modified — the records

- **`mud/lib/banking/LedgerEntry.ts`**
  - `currency = ""` + `fieldMeta.currency = { persistent: true }`.
  - ⚠ **The default is `""`, not the compact currency.** An unmigrated row
    hydrates currency-less and is *loud*; a compact-currency default would
    make an unmigrated row look correct, which is the silent-revalue failure
    mode in a different costume.
  - `LedgerEntryFields.currency` added.
  - `ReconcileResult` gains `currency`.
- **`mud/lib/banking/AccountBalance.ts`**
  - `currency = ""` + fieldMeta.
  - ⚠ **A second warmed map, not a reshaped one.** `_cache: Map<id, number>`
    is untouched (every existing sync read site survives verbatim); a sibling
    `_currencyCache: Map<id, string>` is warmed alongside it. New sync reads:
    `cachedCurrency(accountId): string`, `cachedTotalsByCurrency(): Map<string, number>`.
    `putCached(accountId, balance, currency)` maintains both;
    `removeCached` drops both.
  - `warm()` **throws** on a row with an empty `currency`, naming the
    migration script. Boot failing on an unmigrated database is the designed
    guard (§8, §11 *Concerns* 5).
- **`mud/lib/banking/SupplyAggregate.ts`**
  - `currency = ""` + fieldMeta; the collection becomes **one row per
    currency**.
  - `_cache` becomes `Map<string, {minted, drained}>`.
  - `cachedSupply(currency): number`, `cached(currency)`, `allCached(): Map<...>`.
  - `warm()` throws on a currency-less row, same as above.
- **`backend/PersistenceManager.ts`** — add
  `BankSupply.createIndex({ currency: 1 }, { unique: true })`; update the
  "single row — no index needed" comment.

### Modified — conservation

- **`mud/lib/banking/Transaction.ts`**
  - `LedgerLeg` gains `currency: string`.
  - `assertConserving(kind, legs)` gains, **before** the per-leg walk:
    - every leg carries a non-empty currency, else throw;
    - **all legs share one currency**, else throw
      `"BankTransaction: a transaction may not cross currencies (<a> vs <b>) — this is a permanent invariant"`.
  - ⚠ Write the doc comment as a **permanent invariant**, never as a seam.
    Do not name `convert`. Do not write "yet", "for now", or "until FX".
    ([currency-slate](../slates/builds/currency-slate.md) § *Do not build
    exchange*; the tail's "inert seam Half B fills" framing is **superseded**.)
  - `supplyDelta(kind, legs)` returns `{ currency, minted, drained }`.
  - `assertLegKind` is **unchanged** — the counterparty rules are
    currency-blind, and keeping them so is what makes the crossing rejection a
    separate, unconditional gate rather than twelve per-kind opinions.

### Modified — `obj/api/BankingLogic.ts`

The whole wave's weight. Ordered work:

1. **`postTransaction(kind, legs, opts)`** — after `assertConserving`, and
   before any write, the **endpoint check** (the impure half of the invariant):
   for each leg, for each non-sentinel endpoint, if
   `AccountBalance.cachedCurrency(id)` is non-empty and differs from
   `leg.currency`, **throw**. Sentinels are currency-agnostic. Then
   `row.currency = leg.currency` on every `LedgerEntry`.
2. **`applyDelta(accountId, delta, currency)`** — the auto-create branch
   stamps the currency; `putCached` carries it.
3. **`bumpSupply(currency, minted, drained)`** — finds/creates by `{currency}`.
4. **`recomputeSupplyImpl()`** — groups the full ledger scan by `r.currency`,
   writes one row per currency.
5. **The 16 `postTransaction` call sites**, each with its currency source:

| # | Line (pre-change) | Site | Leg currency from |
|---|---|---|---|
| 1 | 478 | `seedFloatImpl` (deposit) | the branch account's currency |
| 2 | 553 | `chargeFeeImpl` (transfer) | the customer account's currency |
| 3 | 728 | `settleImpl` cash-bridge (deposit) | `charge.amount.currency` |
| 4 | 785 | `settleImpl` credential (payment) | `charge.amount.currency` |
| 5 | 812 | `payWageImpl` (wage) | `amount.currency` |
| 6 | 878 | `escrowHoldImpl` | `amount.currency` |
| 7 | 911 | `escrowMoveImpl` (release/revert) | `amount.currency` |
| 8 | 973 | `payDrawImpl` (draw) | `amount.currency` |
| 9 | 1087 | `remitDemoTaxImpl` (tax) | `saleAmount.currency` |
| 10 | 1113 | `issueCashImpl` (mint) | `amount.currency` |
| 11 | 1397 | `mint` | `amount.currency` |
| 12 | 1423 | `drain` | `amount.currency` |
| 13 | 1431 | `float` (mint) | `amount.currency` |
| 14 | 1535 | `deposit` | the coin stack's currency |
| 15 | 1608 | `withdraw` | the account's currency |
| 16 | 1657 | `transfer` | the source account's currency |

6. **§0.3's resolution-key changes** — `accountAtImpl`, `primaryAccountIdOf`,
   `ensureVenueAccountImpl`, `ensureCorpoTreasuryImpl`, `openAccountImpl`,
   `myAccountAt` all take a currency and match on it;
   `demoTaxConfig().treasury` becomes `` `${treasuryId}:${currency}` ``;
   `Account.centralBankAccountFor(currency)` replaces `Account.CENTRAL_BANK`
   (which stays as the *institution* constant — `CENTRAL_BANK_INSTITUTION` is
   untouched).
   ⚠ Site 2 is the sharp one: a fee in currency X must reach a branch account
   *and* a corpo treasury in currency X, or the leg crosses and throws. The
   currency-keyed `ensure*` calls are what make the fixture-currency
   acceptance test survive a fee.
7. **`reconcileImpl(currency)`** — supply from `cachedSupply(currency)`;
   `accountTotal` from `cachedTotalsByCurrency().get(currency)`;
   `circulatingCoin` sums only coins of that currency (`isCashLike` gains
   `getCurrency()`).
8. **`balanceOf`, `moneySupply(currency)`, `escrowBalanceOf`** — `balanceOf`
   returns `Money.of(balanceMinor(id), AccountBalance.cachedCurrency(id))`.
   All stay **sync** off the warmed caches.
9. **`restampCustodiansImpl`** — the legacy `tpa` re-own also stamps a
   currency (`Currency.compact()`).
10. **The scoped balance overlay** (sandbox) — keyed by `accountId` only;
    unchanged. An account has one currency, so the overlay needs none.

### Modified — the facade + bootstrap

- **`mud/api/banking.ts`** — signature updates only, forwarding shell
  unchanged: `moneySupply(currency)`, `reconcile(currency)`,
  `openAccount(bank, corpoKey, currency)`, `myAccountAt(bank, currency)`,
  `primaryAccountIdOf(ownerKey, currency)`,
  `ensureVenueAccount(ownerPath, bank, corpoKey, currency)`,
  `ensureCorpoTreasury(corpoKey, bank, currency)`.
- **`backend/AppBootstrap.ts`** — ⚠ **reorder**: `BankingApi.boot()` **before**
  `AccountBalance.warm()` / `SupplyAggregate.warm()`. The boot backfill (§8)
  must run before the warms, because the warms now throw on a currency-less
  row. `restampCustodiansImpl` reads rows directly and never touches the warm
  caches, so the reorder is safe. Leave a comment saying why, and record it in
  `banking.md`.

### Other consumers touched

`obj/api/EmploymentLogic.ts` (`ensurePayableWorker` opens the worker's account
in the payer's currency — the scrip-wages story pre-wired, not built),
`obj/api/ContractLogic.ts` (escrow currency = the funding account's),
`obj/command/banking/*`, `obj/command/retail/*`,
`obj/command/employment/TipController.ts`,
`obj/command/crafting/OrderController.ts`,
`obj/command/civics/TitleController.ts`,
`obj/command/author/TeleportController.ts`,
`obj/command/charactergen/EnrollController.ts`.

### Tests

- `BankingLogic.conservation.test.ts` — extended: **per-currency
  conservation.** Post mints and drains in the zorkmid *and* the fixture
  currency; assert each supply is independently correct and neither leaks.
  (AC: *per-currency conservation*.)
- New `mud/lib/banking/__tests__/currency-crossing.test.ts` — ⭐ the permanent
  invariant:
  - `assertConserving` throws for a two-leg transaction whose legs differ in
    currency, **for every one of the 12 `LedgerKind`s** (a table-driven loop —
    proving *"there is no flag, option, or kind that permits it"*);
  - `postTransaction` throws for a single `transfer` leg between a
    zorkmid account and a fixture-currency account (the endpoint check);
  - a leg with an empty currency throws;
  - a reflection check that `LedgerLeg`'s runtime shape carries no
    `allowCrossCurrency`-style escape.
- `BankingLogic.supply.test.ts` — `bank_supply` holds one row per currency;
  `moneySupply(c)` is sync and per-currency; `recomputeSupply` rebuilds both
  rows from a mixed ledger.
- `AccountBalance.test.ts` / `LedgerEntry.test.ts` — **round-trip**: save/load
  preserves `currency` on all three records (AC).
- `AccountBalance.test.ts` — `warm()` throws on a currency-less row.
- `reconciliation.test.ts` — `reconcile(c)` partitions; a fixture-currency coin
  does not appear in the zorkmid reconcile and vice versa.

### Risk — the riskiest wave

- **The endpoint check must read the warmed cache, never `await` a find** —
  putting an await per endpoint on the posting path is a real cost and would
  invite someone to remove the check.
- **An account row created *inside* the transaction** (`applyDelta`
  auto-create) has no cache entry yet; the check must treat an empty
  `cachedCurrency` as "new, adopt the leg's currency", not as a mismatch.
- **Site 2 (`chargeFeeImpl`)** posts to accounts it may have just created via
  `ensure*`. Confirm the ensure runs before the check sees them.
- **The `treasury` / `central-bank` id renames** change strings that appear in
  live rows and in `app-settings.yaml`. The migration owns the rows; the
  setting keeps its value (`treasury`) and gains the suffix at read time.

---

## 6. Wave 4 — cash

### Modified

- **`mud/obj/Coin.ts`**
  ```ts
  static fieldMeta: FieldMeta = {
    currency:     { persistent: true, globIdentity: true },
    denomination: { persistent: true, globIdentity: true },
  };
  public currency: string = "";     // TS-public — persisted, never `#`
  public denomination: number = 0;  // face value in minor units — the structural key
  ```
  - ⚠ **`globIdentity` on BOTH.** This is the invisible-mint defence: two
    issuers' like-valued coins must not merge. Not a rule someone remembers —
    a key.
  - `getCurrency(): string`, `getDenomination(): number` — the inter-stuff
    method contract.
  - `getMass()` → `Currency.perCoinMass(this.currency, this.denomination).scale(qty)`
    — **throws** on an unstamped/unknown pair. Valuation must never guess.
  - `override getShortDescription()` → `Currency.describeDenomination(...)`,
    degrading to `"a blank coin"` when the pair does not resolve.
    ⚠ **The asymmetry is deliberate:** presentation must never crash a `look`;
    valuation must never lie. State it in the doc comment.
  - `override getKeywords()` → `[...super.getKeywords(), currency, plural]`.
    The `Perceptible` keyword getter already tokenizes `getShortDescription()`
    on whitespace, so `"a 25-zorkmid piece"` yields the tokens `25-zorkmid`
    and `piece` **for free** — that token is what makes a 25-coin separately
    addressable from a 1-coin.
- **`mud/seeds/obj/Coin.yaml`** — a blank cash shell. **No currency, no
  denomination, no `shortDescription`** (`issueCash` stamps both fields;
  presentation derives). `keywords: [coin, coins, cash, money]`. The comment
  block loses every mention of `credit` / `crown` / `sovereign`.
- **`obj/api/BankingLogic.ts`** — `isCashLike` gains `getCurrency()`;
  `stackValue` → `Currency.faceValueOf(stack.getCurrency(), stack.getDenomination()) * qty`;
  `cashSupply` / `takeCoins` / `moveCoins` / `drainCoins` / `cashOnHand` become
  currency-filtered (a payer holding two currencies pays the charge's currency
  only); `issueCashImpl` stamps `currency` **and** `denomination` on each
  cloned stack.
- **`mud/lib/banking/Bank.ts`** — its private `isCashLike` / `stackValue`
  twins; `getTillLiquidity(currency): Money`.
- **`mud/obj/command/banking/BankController.ts`** — `withdraw` passes the
  account's currency to `getTillLiquidity`.

### Tests

- `mud/obj/__tests__/Coin.test.ts` — rewritten off `sovereign`/`crown`:
  masses by face value; a 25-coin is heavier per coin and lighter per unit
  than a 1-coin; split/merge preserves `(currency, denomination)`.
- ⭐ **New**: two coin stacks of **different currencies** with the **same**
  face value do **not** merge (AC: *glob identity includes the currency*).
- ⭐ **New**: a 25-coin and a 1-coin differ in `getShortDescription()` and are
  **separately addressable by the parser** — drive a real scope-walk resolve
  for `25-zorkmid` and assert it binds the 25 stack and not the 1 stack (AC:
  *coins present distinguishably*).
- An unstamped coin's `getMass()` throws; its `getShortDescription()` does not.
- `withdraw.liquidity.test.ts` / `settlement.test.ts` — per-currency till and
  per-currency exact-change planning.

### Risk

- `getKeywords` / `getShortDescription` are on the **scope-walk hot path**.
  Keep both allocation-light; `Currency.of` is a `Map` get.
- `Coinage.planSpend`'s greedy correctness argument depends on the denomination
  set containing a 1-unit coin. `Currency` should assert that at registration
  (a currency with no base coin cannot make exact change) — cheap, and it
  makes the fixture currency's shape a deliberate choice rather than an
  accident.

---

## 7. Wave 5 — issuer, mint authority, per-currency reporting

### Modified

- **`mud/lib/command/validators/requiresGovernor.ts`** — generalized from the
  hardcoded `central-bank-governor` to *"the governor of the issuer of the
  currency this act concerns."* The async `preload` resolves the target
  currency from the command model (`--currency`, defaulting to the currencies
  whose `governorOffice` the giver holds) and returns
  `CompactApi.holdsOffice(giver, Currency.of(key).governorOffice)`. The
  rejection message names the office generically. With one currency and one
  issuer this **resolves identically to today** — the founder holds the seat,
  the gate behaves the same.
- **`mud/cmd/banking/reserve.yaml`** — an `options:` block with
  `currency: { short: c, type: string }` (the `pay --from` precedent). Help
  text updated.
- **`mud/obj/command/banking/ReserveController.ts`** —
  - `mint` / `issue` resolve the currency (flag → the giver's issuer-governed
    currency) and pass it into `Money.of`;
  - `supply` **loops `Currency.all()`**, rendering one block per currency from
    `BankingApi.reconcile(key)`. ⚠ It **never sums across currencies**
    (requirements § non-goals: *no cross-currency reporting*). With one
    currency the output is identical to today.
- **`mud/obj/command/banking/BankController.ts`** — `balance` and `statement`
  read the account's own currency; `Money.render()` does the rest. Nothing
  totals across currencies.
- **`mud/obj/api/BankingLogic.ts`** — `profitAndLossImpl` is already
  per-account and therefore already per-currency; add the account's currency to
  `ProfitAndLoss` so the report can render it.

### Tests

- `mud/lib/command/validators/__tests__/requiresGovernor.test.ts` — extended:
  a giver holding the zorkmid issuer's office is refused for a currency whose
  issuer names a *different* office (drive with the fixture record).
- `reporting.test.ts` — `reserve supply` renders one block per registered
  currency and no combined total.

### Risk

Low. The verb-layer surface only; the substrate is untouched.

---

## 7b. Wave 5b — money integrity: the gates and the instrument

Scoped in from [money-integrity-slate](../slates/builds/money-integrity-slate.md).
**Only the four items that ride paths this build already rewrites** — the
full follow-the-money sweep is that slate's own cycle. Do not widen this
wave.

### Why it is here and not deferred

> ⭐⭐⭐ **There are two conservation domains and only one is sealed.**
> The ledger is genuinely well defended: `postTransaction` is the single
> writer, `assertConserving` validates per leg, `mint`/`drain` are the
> only supply-changing kinds. **Cash is not.** A `Coin` is ordinary
> `Stuff`, so anything that can make, mutate or restore Stuff can make,
> mutate or restore *money* — and `issueCash`/`deposit`/`withdraw` bridge
> the two, so a cash-side leak is a **total-supply** leak.

Two of the four items below are the audit's *instrument*. The rest of the
audit cannot be trusted until they land, and neither can W6.

### 7b.1 Gate `setQuantity` (the direct mint)

`GlobbableMixin.setQuantity(n)` carries **no `@CallSecurity`, no
`@Final`, no `@Unshadowable`** — only a positive-integer check. Any code
holding a coin reference can mint by assignment.

- Apply the shipped discipline: `@CallSecurity(...)` naming the
  legitimate callers, plus `@Final @Unshadowable`. The existing callers
  are `GlobbableLogic` (split/merge), `BankingLogic` (`issueCash`), and
  `CraftingLogic` (consumption) — that caller set **is** the policy.
- ⚠ `Stuff.destroy()` is the precedent to copy exactly
  (`ApiOnly + @Final + @Unshadowable`).
- ⚠ **Gate the mixin method, not `Coin`.** A subclass or a second
  value-bearing glob (scrip, bearer credentials) must inherit the gate,
  not need its own.
- Tests: a call from an unlisted module throws; every existing legitimate
  caller still works; a shadow cannot intercept it.

### 7b.2 Complete the instrument — `reconcile` sees all coin

Today `reconcileImpl` walks `StuffApi.findAllByTemplatePath(COIN_PATH)`,
which reads the **in-memory index — live instances only**, and skips vault
cash (`if (container && MixinApi.isBank(container)) continue`). So
`balanced` is blind to (a) coins inside `holder_snapshots` and (b)
anything in a vault.

- **Count snapshotted coin.** `reconcile` gains a term for coin held in
  `holder_snapshots` records. ⚠ This is necessarily an **async** read,
  while `reconcile` is sync today — so split the surface rather than
  breaking the sync read:
  `reconcile(currency)` stays sync and circulating-only (its current
  meaning, now honest about it), and a new
  `reconcileFull(currency): Promise<FullReconcile>` adds the snapshot and
  vault terms. The verb (`reserve supply`) awaits the full form; anything
  on a hot path keeps the sync one.
- **Account for vault cash explicitly** — a named `vaultCoin` term rather
  than a `continue`, so it is visible rather than excluded.
- The identity becomes, per currency:
  `supply === accountTotal + circulatingCoin + vaultCoin + snapshotCoin`.
- Tests: a coin captured into a snapshot still balances; a coin in a vault
  still balances; deliberately corrupting a snapshot's quantity makes
  `balanced` go **false** (the instrument detects what it exists to
  detect).

### 7b.3 + 7b.4 — already in scope, recorded here for the audit trail

- **Glob identity gains the currency** (§6/W4) — closes the
  merge-two-issuers'-coins invisible mint.
- **The `?? 1` fallback becomes a throw** (§3/W1) — closes the silent
  revalue.

Both are already planned; this section exists so the money-integrity
sweep can tick them off without re-deriving them.

### Risk

- ⚠ **7b.2's async split is the subtle part.** Do not make `reconcile`
  async — `balanceOf` and the posting path depend on sync reads. Two
  named surfaces with honest names beats one that lies.
- Gating `setQuantity` may surface call sites the grep missed (a shadow, a
  test helper). Each one is a finding, not an obstacle — record it.

### What this wave explicitly does NOT do

Crafting yields, content packs, the CMS coin-row edit, clone-a-coin,
materialize idempotency, the sandbox cash boundary, and the
destroy-without-drain direction. All enumerated in
[money-integrity-slate](../slates/builds/money-integrity-slate.md) § *The
audit surface*, all for that cycle. ⚠ **Do not let this wave grow** — the
whole reason it is bounded is so the currency MR stays reviewable.

---

## 8. Wave 6 — the migration and its rehearsal (the gate)

⚠ **Nothing deploys until the rehearsal passes.** This is the requirements'
deploy gate.

### The four backfill targets

| Target | Mechanism | Why there |
|---|---|---|
| `bank_ledger` · `bank_accounts` · `bank_supply` | **idempotent boot backfill** inside `BankingLogic.boot()` | flat collections banking owns; `boot()` already carries the custodian restamp — the shipped precedent |
| `domain` row `path: /obj/Coin` | **script** | one row, outside banking's collections, and the seeder will never touch it |
| `holder_snapshots` coin blobs | **script** | a nested-JSON walk of a collection banking does not own; running it at every boot forever is unacceptable |
| the well-known ids (`treasury` → `treasury:zorkmid`, `central-bank` → `central-bank:zorkmid`) | **script** (rows) + boot backfill (cache) | id renames must precede the boot backfill's currency stamp |

### New

| File | Category |
|---|---|
| `packages/server/scripts/migrate-currency.ts` | Script — `--uri`, `--db`, `--report-only` \| `--apply` |

Its contents, and the **only** place the legacy table exists:

```
credit    → { currency: 'zorkmid', denomination: 1  }
crown     → { currency: 'zorkmid', denomination: 5  }
sovereign → { currency: 'zorkmid', denomination: 25 }
```

⚠ Deliberately **outside** `src/mud/` so it cannot pollute the grep-checkable
AC, and so the legacy vocabulary dies with the script.

Steps under `--apply`:

1. `bank_ledger` / `bank_accounts` / `bank_supply`:
   `updateMany({ currency: { $exists: false } }, { $set: { currency: 'zorkmid' } })`.
2. Rename the well-known account ids in `bank_accounts.accountId` and in
   `bank_ledger.fromAccount` / `toAccount`: `treasury` → `treasury:zorkmid`,
   `central-bank` → `central-bank:zorkmid`. (W0's census says whether either
   row exists.)
3. `domain`, `path: '/obj/Coin'`: rewrite `data` to the new `Coin.yaml` shape —
   remove `denomination: credit` and `shortDescription`, set the currency-free
   `keywords`. **Without this, every coin minted after the deploy is born
   stale.**
4. `holder_snapshots`: recursive walk of each record; at every content entry
   whose `templatePath === '/obj/Coin'`, rewrite each `fields` slice beneath
   it — `denomination: <legacy string>` → `denomination: <number>` plus
   `currency: 'zorkmid'`. **Throw on any denomination string not in the
   table** — a half-migration must be loud.

Under `--report-only` it writes nothing and prints the fingerprint (§ below).

### Modified

- **`obj/api/BankingLogic.ts`** — `backfillCurrencyImpl()`, run **first**
  inside `boot()`, before `restampCustodiansImpl`: for each of the three
  collections, stamp `Currency.compact()` onto any row with an empty
  `currency`, and log the count. Idempotent; a no-op on a migrated DB.
  ⚠ It runs before the warms (the W3 reorder), so it is the last line of
  defence — but it **cannot** reach `holder_snapshots` or `domain`, which is
  exactly why the script exists.

### The rehearsal — exactly how, and what proves it

1. `mongodump` the live Atlas database (or take an Atlas snapshot).
2. `mongorestore` into a scratch database — **never point any tooling at
   production during a rehearsal.**
3. `pnpm --filter @saxonberg/server exec tsx scripts/migrate-currency.ts --uri <scratch> --db <scratch> --report-only`
   → the **before fingerprint**:
   - per-`accountId` balance (the full map, not just the total);
   - Σ balances; `bank_supply.minted − drained`;
   - `bank_ledger` row count and Σ `amount` grouped by `kind`;
   - the coin census: per legacy denomination, Σ quantity, and Σ value under
     the legacy table;
   - the `/obj/Coin` `domain` row's `data`.
4. `... --apply`.
5. `... --report-only` again → the **after fingerprint**, and the script
   **exits non-zero** unless all of:
   - every per-account balance is byte-identical (per account, not just the
     total);
   - total supply is identical;
   - ledger row count and Σ amount by kind are identical;
   - Σ over all coins of `Currency.faceValueOf('zorkmid', d) × qty` equals the
     before total — ⭐ **this is the test that catches the silent revalue**;
   - **zero** rows remain in the three `bank_*` collections without a
     `currency`;
   - **zero** legacy denomination strings remain anywhere.
6. Boot a local server with the new code against the scratch DB. Run
   `reserve supply` → `balanced: true`, supply unchanged from step 3.
7. Log in as a migrated character: inventory reads *"a 25-zorkmid piece"*;
   `bank deposit` / `bank withdraw` round-trip; `reserve supply` still
   balanced.

**What proves it:** step 5 is a pass/fail gate the script enforces, not an
eyeball — every balance, every ledger row and every coin has identical value
before and after, and total supply is unchanged (the AC, verbatim). Step 6 is
the same claim re-derived by the *running system's own audit* on real data.

### The deploy runbook (into `docs/deployment.md`)

1. Atlas snapshot.
2. **Stop the service.**
3. `migrate-currency.ts --apply` against production.
4. Deploy the new code; start.
5. `reserve supply` → `balanced`.

⚠ **Order matters and the code enforces it**: the new code's `warm()` throws
on a currency-less `bank_*` row, so starting before migrating fails fast and
harmlessly rather than running the world on half-migrated money. Rollback =
restore the snapshot + redeploy the previous commit.

### Tests

- `mud/lib/banking/__tests__/currency-backfill.test.ts` — the boot backfill
  over harness-seeded currency-less rows: stamps them, is idempotent on a
  second run, and moves no money (balances and supply identical before/after).
- `packages/server/scripts/__tests__/migrate-currency.test.ts` — the script's
  pure transform functions (the `holder_snapshots` walker and the legacy map)
  against a hand-built nested fixture record, including the throw on an
  unknown denomination string. No DB.

---

## 9. Wave 7 — the fixture currency, the acceptance test, the docs

### The test-only fixture currency

Where it lives: **`mud/lib/banking/__tests__/banking-test-harness.ts`**
(shipped in W1, exercised throughout).

```ts
export const TEST_CURRENCY = "testcoin";
const TEST_RECORD: CurrencyRecord = {
  key: "testcoin", unit: "testcoin", plural: "testcoins",
  issuer: "test-mint", governorOffice: "test-mint-governor",
  denominations: [ { value: 10, massKg: 0.005, label: "a chit" },
                   { value: 1,  massKg: 0.001 } ],
};
```

Three independent reasons it can never exist in play or in a live collection:

1. **It is registered only through `Currency._registerForTesting`, which calls
   `SecurityApi.assertTestOnly`** — a stack walk that throws unless a
   `.test.ts` or `__tests__/` frame is in the chain. Production code that
   reaches the seam fails loudly at the call site.
2. **It lives in a `__tests__/` file**, which no production module imports.
3. **The registry is code, not a collection** — there is no persistence path
   by which a currency record could reach `domain` or any other collection.
   (This is §0.1's fourth argument, cashed.)

Plus a guard test: outside the harness, `Currency.all()` is exactly the shipped
set; `_registerForTesting` throws from a non-test frame.

Its denomination set is deliberately **not** 1/5/25 — a different shape with a
`label` on one denomination, so every derived behaviour (dispense, exact
change, presentation, mass) is exercised against something the zorkmid's
constants cannot accidentally satisfy.

### The acceptance test, mechanized

New: **`mud/lib/banking/__tests__/currency-generalization.test.ts`**.

Setup: install the harness + the fixture currency, then **stub
`banking.compactCurrency` to `TEST_CURRENCY`** (§0.2). The world's default
currency is now the fixture; the zorkmid is registered but unused.

Then drive the full flow, in one test, in order — mint → deposit → withdraw →
transfer → payment → wage → tax → escrow → draw:

| Step | Call |
|---|---|
| mint (cash) | `BankingApi.issueCash(actor, Money.of(200, TEST_CURRENCY))` |
| open | `BankingApi.openAccount(bank, corpo, TEST_CURRENCY)` |
| deposit | `BankingApi.deposit(bank, stack)` |
| withdraw | `BankingApi.withdraw(bank, Money.of(30, TEST_CURRENCY))` |
| transfer | `BankingApi.transfer(a, b, …)` |
| payment | `BankingApi.settle(charge, { kind: "credential" })` **with a remittance split** |
| wage | `BankingApi.payWage(employer, workerKey, …)` |
| tax | `BankingApi.remitDemoTax(seller, …)` |
| escrow | `escrowHold` → `escrowRelease` → `escrowClose` |
| draw | `BankingApi.payDraw(business, proprietorKey, …)` |

Assertions after every step:

- `BankingApi.reconcile(TEST_CURRENCY).balanced === true`;
- `moneySupply(TEST_CURRENCY)` equals Σmint − Σdrain, exactly;
- ⭐ `moneySupply("zorkmid") === 0` and
  `reconcile("zorkmid").accountTotal === 0` — **no leakage into the other
  currency at any step**;
- coins present as `"a 10-testcoin piece"` / `"a chit"` (the labelled one), not
  as anything zorkmid-shaped.

A second block runs the *same* flow with **both** currencies live and
interleaved, asserting the two supplies move independently.

A third: the currency-crossing rejections (W3's `currency-crossing.test.ts`
covers the table; assert here that the *end-to-end* path throws too — a
transfer between a zorkmid account and a testcoin account).

**Why this proves the AC.** *"No path branches on the currency being the
zorkmid"* is proved by substitution: the entire monetary substrate ran with
the zorkmid demoted to a registered-but-unused record, and every audit held.
A branch on the zorkmid could not survive that run.

New: **`mud/lib/banking/__tests__/currency-hygiene.test.ts`** — the
grep-checkable AC, mechanized. `readFileSync` (the harness precedent) over
`Money.ts`, `Coinage.ts`, `Coin.ts` and `seeds/obj/Coin.yaml`, asserting:

- no `zorkmid` / `credit` literal as a currency tag;
- no `sovereign` / `crown` anywhere in `src/` or `seeds/` (AC: *they no longer
  appear in code, fixtures, or content*);
- `Money.render` contains no `"credit"`/`"credits"` string and delegates to
  `Currency`.

### Docs

**`docs/subsystems/banking.md`** (it describes shipped state, so it changes
*with* the build — requirements § Constraints). Specifically:

| Section | Change |
|---|---|
| *The money model* | `Money` = minor units + a currency tag; v1 ships exactly one, the **zorkmid**; `credit` is retired and the word given back to the deferred lending subsystem |
| **new** *Currency — the record, and the one place it lives* | the registry, the `CurrencyRecord` shape, the issuer + governorOffice fields, and — in these words — **the record carries no rate and no reference to another currency, permanently**; the peg-is-a-promise distinction |
| *Conservation* | conservation is **per-currency**; the leg table gains "every leg carries a currency"; a new line: **a leg may never cross currencies — a permanent invariant, not a seam** |
| *Reporting consumers* | `bank_supply` is one row per currency; `moneySupply(currency)` / `reconcile(currency)` are per-currency and sync; reports **partition by currency and never sum across** |
| *Coinage* | denominations are **structural `(currency, faceValue)`**; `sovereign`/`crown` retired; the unknown-denomination **throw**; coins present as "a 25-zorkmid piece"; glob identity is `(currency, denomination)` and why |
| *Phase 4 / the reserve verb* | mint authority is **per-issuer** via the record's `governorOffice` |
| *Module layout* | `lib/banking/Currency.ts` added; `Coinage.ts` re-described as pure algebra holding no currency data |
| *Collections* | the `currency` field on all three; the `bank_supply` unique index; the boot ordering constraint (`BankingApi.boot()` before the warms, and why) |
| *Open-choice decisions log* | **7.** registry over data-Idea+catalogue (§0.1's four reasons). **8.** `Money.of` currency is required, not defaulted (§4's rationale). **9.** currency joins the account-resolution key (§0.3) |
| **new** *History* note | the currency build: the rename, the schema migration, the one migration window |

**`docs/deployment.md`** — a new *"Live-data migration: the currency
dimension"* section carrying the runbook + the rehearsal procedure (§8),
beside the existing legacy-avatar-rows section.

**`docs/subsystems/glob.md`** — its Coin exemplar shows
`denomination: { globIdentity: true }`; update to the two-field key and add one
line on why (the invisible-mint defence).

⚠ **`CLAUDE.md`'s collections line is an index line** — leave it to the sweep
(CLAUDE.md § Worktrees rule 5).

### At the sweep

Retire this plan and `docs/requirements/currency-requirements.md`. Trim
`docs/slates/tails/multi-currency-slate.md` — **Half A is consumed by this
build**; its Half B record survives as the record of what was considered.
`docs/slates/builds/currency-slate.md` keeps its scrip and credit sections
(remaining design surface) and loses the Half-A implementation detail.

---

## 10. Cross-cutting risk register

| Risk | Wave | Mitigation |
|---|---|---|
| ⚠⚠ An invisible mint via a crossed leg | 3 | Two independent gates: the pure all-legs-agree assert **and** the impure endpoint check; a table-driven test across all 12 kinds |
| ⚠⚠ A silent revalue during migration | 6 | `?? 1` → **throw** (W1); `currency` defaults to `""` not the compact currency; the rehearsal's per-coin value census; the script throws on an unknown legacy key |
| ⚠ The `/obj/Coin` `domain` row is never re-seeded | 6 | Named as its own backfill target; W0's census reads the live row |
| ⚠ Boot fails on an unmigrated DB | 3, 6 | **Intended.** Runbook is migrate-then-deploy; the failure message names the script |
| Coins merging across currencies | 4 | `globIdentity` on both fields + an explicit non-merge test |
| The endpoint check on the posting path | 3 | Sync warmed-cache read only; empty currency = new row, adopt the leg's |
| Well-known account ids (`treasury`, `central-bank`) crossing currencies | 3, 6 | **Unconditional** `:<currency>` suffix — never a conditional, which would be the zorkmid branch |
| Corpo treasury / branch account in the wrong currency at a fee leg | 3 | Currency joins the `ensure*` resolution key (§0.3) |
| Presentation throwing on an unstamped coin | 4 | `getShortDescription` degrades, `getMass` throws — asymmetry documented |
| `Money.of` sweep churn hiding a real change | 2 | Wave 2 is mechanical **and nothing else**; behaviour-change-free, whole suite green |
| The crossing rejection re-read as a seam | 3, 7 | Doc comment + `banking.md` say *permanent invariant*; the word `convert` appears nowhere |
| ⚠⚠ **Cash is a second, unsealed conservation domain** — `setQuantity` mints by assignment | 5b | Gate the mixin method with the `Stuff.destroy()` discipline; the legitimate caller set is the policy |
| ⚠⚠ **The rehearsal's own gate is blind** — `reconcile` cannot see snapshotted or vault coin | 5b before 6 | `reconcileFull` adds both terms; W5b is sequenced *before* the migration for exactly this reason |

## 11. Concerns — where this plan pushes back on, or extends, the requirements

1. **The `Money.of` sweep is the build's largest single cost** (60 production +
   114 test call sites, counts verified), and it is bigger than the tail
   slate's "~1–2 focused days" framing. I recommend it anyway (§4): a required
   parameter turns the threading into a compile-error list, and the
   requirements name an invisible mint as the one bug class an economy cannot
   recover from. If a reviewer wants it smaller, the only acceptable reduction
   is a default of `Currency.compact()` (never a literal) — and it trades
   compiler enforcement for runtime enforcement at the endpoint check.

   > ✅ **SETTLED 2026-08-04 — required, no default.** User: *"no shortcuts
   > or half measures, whatever needs to be done for this do it blast radius
   > be damned."* The 174 call sites are the point: the compiler enumerates
   > the migration instead of leaving it to runtime.

2. **`Coin.denomination` holding a number is in tension with the letter of
   Banking Law 1** (*"face value is intrinsic to the currency and is never a
   worth stamped on the good"*). The reconciliation, which must be written
   into `banking.md`: the number is the denomination's **structural key**, not
   an assertion of worth — a coin whose `(currency, denomination)` pair does
   not resolve in the currency's table **throws** rather than being worth what
   it says. The good does not price itself; the currency validates and prices
   it. Law 1's substance holds; its phrasing needs the update.

3. **`banking.compactCurrency` puts the string `zorkmid` in
   `app-settings.yaml`**, outside the currency record. The AC's grep is scoped
   to `Money` / `Coinage` / `Coin` / `Coin.yaml` and passes. I hold that the
   setting is a **reference** to a record, not currency-*intrinsic* data — it
   says which currency the Compact transacts in, which is policy, exactly
   where the requirements say the zorkmid's specialness belongs. Flagging it
   because it is the one place a reviewer could reasonably say "that's a
   currency constant outside the record."

4. **Two corrections to the requirements' picture of the migration surface**
   (both verified against the code).
   (a) `BankCounter` does **not** compose `PersistableMixin` — it is
   `BankMixin(DetailedMixin(PostRegistrationMixin(Vessel)))` — so **vault coin
   does not survive a restart**, and the live coin population is smaller than
   "every coin in the world" implies. (b) The `/obj/Coin` row in `domain` is a
   backfill target the requirements do not name, and it is the most
   consequential one: unmigrated, the INSERT-ONLY seeder leaves it stamping
   every *future* coin with a legacy denomination. W0's census confirms both
   against real data before anything is committed to.

5. **Boot will hard-fail on an unmigrated database.** This is the requirements'
   *"an unmigrated coin must fail loudly"* applied to the ledger spine, and it
   is deliberate — but it makes the deploy order **stop → migrate → deploy →
   start**, not the usual deploy-then-fix. That belongs in the runbook and in
   the MR description, not as a surprise on the night.

6. **Terms fees, retail prices and `banking.onboardingStipend` stay bare
   minor-unit integers**, denominated implicitly by the account they touch.
   That is correct for this build (the requirements defer acceptance to the
   scrip build and forbid a currency field on offers), but note the
   consequence: a bank whose customers hold two currencies would need
   per-currency Terms. Out of scope, correctly, and the seam is a `Terms`
   lookup — no schema anywhere reads a rate.

7. **`ensurePayableWorker` opening a worker's first account in the *payer's*
   currency** is how company-scrip wages will eventually work. This build
   ships it because it falls out of §0.3, not because it is scoped. Do not
   build anything else toward scrip here.

---

## 12. Build record — what actually happened

Filled in during the build; the sweep should read this before retiring the
plan.

**Wave shape held, wave *boundaries* did not.** W1/W2 merged (removing
`Money.of`'s default immediately is what produced the compile-error list, so
there was no green intermediate state worth preserving), and W4's cash work
had to land with them because nothing compiled without it. W3/W5/W5b/W6
landed together for the same reason: the account-resolution key threads
through all of them.

**The `Money.of` sweep cost exactly what §11.1 predicted** — 200 compile
errors, 60 production + 114 test call sites, now zero. The compiler
enumerating the migration worked as designed; a scripted pass with a
balanced-paren matcher did the mechanical part, and the three sites it got
wrong were all *syntax* errors, i.e. loud.

**⚠ §7b.1 was wrong about where the gate goes.** The plan said to gate
`setQuantity` on `GlobbableMixin` so future value-bearing globs inherit it.
That gates **every glob in the world** — 55 tests failed, correctly: a pile
of ore is not money. The gate belongs on `Coin`, the value-bearing class
(and scrip will be a `Coin`, so it does inherit for the real case). A
general *value-bearing marker* is the money-integrity slate's open question
2, not this build's business. Recorded in `banking.md`'s decision log as #10.

**A second surprise in the same area:** `GlobbableMixin` returns a class
*expression*, and `experimentalDecorators` refuses decorators on the members
of one. Gating anything on that mixin needs the `Bank`/`Containable` class-
declaration form first. Left alone, since the gate moved to `Coin`.

**Test fixtures needed a seam.** ~10 test files built coin stacks by calling
`setQuantity`, which the gate now refuses. They write the `quantity` field
directly instead, with a comment saying why — a test constructing raw
starting state is not minting, and making that distinction visible in the
fixture is the point.

**Not done, and deliberately so:**

- ⚠⚠ **W0's census and W6's migration have never been RUN.** Both need a
  restored copy of the live database, which this environment does not have.
  The rehearsal in §8 is the gate; **it has not been executed**, so the
  migration is unproven against real data. This is the single largest
  outstanding risk in the build.
- The `--report-only` self-check and the fingerprint comparison are
  unit-tested only through their pure transforms.
