# Currency — requirements

Generalize the money substrate from **one implicit currency to N**, and
ship it with **exactly one**: the **zorkmid**. Today `Money` carries a
currency tag but the durable spine does not — `bank_ledger`,
`bank_accounts` and `bank_supply` all store bare minor-unit integers, and
`bank_supply` is a single global row. This build threads the currency
dimension through those records, makes conservation per-currency, moves
currency-intrinsic constants into one data record, renames `credit` →
`zorkmid` (giving the word `credit` back to the deferred lending
subsystem), and makes denomination identity **structural** —
`(currency, faceValue)` — so no second issuer ever needs a naming
ceremony. It is done now, deliberately, because the retrofit is cheap
against a young ledger and brutal against a populated one.

Seeded by [currency-slate](../slates/builds/currency-slate.md) (the
decision layer) and [multi-currency-slate](../slates/tails/multi-currency-slate.md)
(the Half-A implementation spec). The shipped substrate is
[banking.md](../subsystems/banking.md).

## Goals

- **Every persisted money record carries a currency.** `LedgerEntry`,
  `AccountBalance`, and `SupplyAggregate` are currency-tagged; no money
  is durable without knowing what it is.
- **Conservation is enforced per-currency.** `supply = Σmint − Σdrain`
  holds independently for each currency, and **a ledger leg may never
  cross currencies** — `from` and `to` are always denominated the same.
- **Money supply is per-currency.** `bank_supply` becomes one row per
  currency, with the warmed cache keyed to match and the sync read
  surface preserved.
- **Currency-intrinsic data lives in exactly one place** — denominations
  (face value + per-coin mass + optional label) and the issuer, as a
  single data record per currency. No currency constant survives
  anywhere else.
- **The Compact's currency is the zorkmid, everywhere**, including live
  data on the deployed box.
- **Denomination identity is `(currency, faceValue)`** — structural, not
  an authored name. `zorkmid` is the only authored money noun.
- **Coins present distinguishably by denomination.** A 25-value coin no
  longer reads and parses identically to a 1-value coin.
- **Mint authority is per-issuer.** `reserve mint` authorizes against the
  governor of *that currency's* issuer, not a hardcoded singleton.
- **Live data migrates with zero value change.** Every balance, every
  ledger row, every coin in the world is worth exactly what it was worth
  before.
- **The generalization is proven, not asserted** — exercised by a
  test-only second currency that never exists in play.

## Non-goals

- **No second live currency**, and nobody empowered to mint one. The
  generalization is the deliverable; a second currency is not.
- **No exchange, ever** — no rate, peg, oracle, order book, FX engine, or
  `convert` path. The currency-crossing rejection is a **permanent
  invariant, not a seam awaiting a later build**
  ([currency-slate](../slates/builds/currency-slate.md) § *Do not build
  exchange*; supersedes the tail's Half B).
- **No money-changer NPC.** It survives as a *design* (a merchant who
  deals in coins) but lands with the currency that creates demand for it.
- **No acceptance field on offers** — deferred to the scrip build; see
  *Surface decisions*.
- **No governance path to charter a new issuer.** Authorizing an issuer
  is a mint, so it is a reserved matter
  ([balance-slate](../slates/builds/balance-slate.md)) — real civics
  work, unusable until a second currency is wanted.
- **No credit / lending / interest / bankruptcy.** Wanted, deferred,
  sequenced after the trades close their loops
  ([currency-slate](../slates/builds/currency-slate.md) § *Credit —
  WANTED*).
- **No currency-reset event.** Stays with
  [economy-slate](../slates/builds/economy-slate.md).
- **No cross-currency reporting** — no combined net-worth view, no
  multi-currency statement totals. Reports partition by currency; they
  never sum across.
- **No corpo scrip content.** The use case this generalization exists
  for, built later ([corpos-slate](../slates/builds/corpos-slate.md)).

## Surface decisions

### The currency is the zorkmid

`zorkmid` replaces `credit` as the currency tag. Three reasons: it is
on-register for a named primary influence (NetHack by way of Zork); it
**gives the word `credit` back** to the deferred lending subsystem that
needs it, and to the credit/debit vocabulary every ledger leg already
uses; and the code change is small. The rename lands **before** credit is
designed — renaming a currency out from under a live lending subsystem is
strictly worse than doing it now.

### Denominations are structural, not authored

Identity is `(currency, faceValue)`. Coins present as *"a 25-zorkmid
piece"*, derived from the pair. An **optional `label`** on a denomination
record lets a future issuer name its coins; the Compact does not use it.

The evidence this is safe: the two names that exist today —
`sovereign` (25) and `crown` (5) — **have never been seen by a player.**
There is one coin template, and `issueCash` restamps only `denomination`
and `quantity`, never `shortDescription`/`keywords`. They are pure lookup
keys.

**`sovereign` and `crown` are retired.** Keeping them preserves exactly
the currency-name/coin-name overload the structural key removes.

### Accounts are single-currency

One `AccountBalance` row carries one currency; holding two currencies
means two accounts, as in real banking. This keeps the scalar `balance`
and the warmed sync cache keyed on `accountId` untouched; a
multi-currency wallet would rewrite the cache's value shape and every
read site with it. Both slates reached this independently.

### Issuer identity: minimal

The currency record names its issuer. `reserve mint` authorizes against
the governor of *that currency's* issuer rather than a hardcoded
`central-bank-governor` singleton — which resolves identically today,
with one currency and one issuer.

Chosen over building the governance path to *charter* a new issuer:
that's a reserved matter with real legislative surface, unusable until a
second currency is wanted, and it would drag civics into a banking build.
**Adding a currency therefore requires a code/content edit at the wizard
tier** — which is the reserved-matter constraint in its crudest honest
form, not a gap.

### An unknown denomination throws

Both face-value lookups currently fall back to `?? 1`. That fallback
turns an unmigrated coin into a silently revalued one — every 25-coin
becomes worth 1, **and the conservation audit still passes**, because its
bottom-up term recomputes from the same broken lookup. A coin whose
denomination is not in its currency's table is a corrupt object; valuing
it at 1 launders the corruption into the money supply.

It becomes a **throw**. The migration cannot half-succeed quietly.

### Acceptance is deferred to the scrip build

A currency field on the offer surface, with zero second currencies, has
nothing to assert against — no payer, no refusal path, no observable
behavior. The bar for shipping inert capability is **inert *and* provably
correct**: the ledger dimension clears it (a synthetic second currency in
a test proves conservation), acceptance does not. It also belongs to a
surface this build doesn't own ([retail.md](../subsystems/retail.md)).

### Exchange is refused, not deferred

Currencies are goods. Coins are already `Stuff` with mass, so you buy one
currency's coins with another's in the market that already exists, and
the rate is whatever people pay. No global rate exists and nothing reads
one. ⭐ Currency crises become **emergent rather than simulated**.

Consequence for this build: the currency-crossing leg rejection is
**permanent**. It must not be written or documented as a placeholder.

### Reserve status is functional, never decreed

The zorkmid's specialness lives in **what the Compact will accept** —
obligations payable only in zorkmids — which is policy data, not a branch
in the banking substrate. Nothing in this build may special-case the
zorkmid to make it the reserve.

### The generalization is proven by a test-only currency

A fixture currency exists **only in tests** — never seeded, never
mintable in play, never present in a live collection. It is how the
acceptance test below is made checkable rather than aspirational.

### One migration window

The rename and the schema migration land **together**. Both touch live
rows on the deployed box, and the seeder is INSERT-ONLY, so editing
`Coin.yaml` does nothing to existing coins. One window, one backfill, one
rehearsal — not two.

## Constraints

- **`postTransaction` is the sole writer** of a `LedgerEntry` or mutation
  of an `AccountBalance`, validated per leg by `BankTransaction`. There
  are **16 call sites, all inside `obj/api/BankingLogic.ts`** — the
  threading is confined to one file plus the record classes. This
  chokepoint is the asset: per-currency conservation is enforced in one
  function, not audited across a codebase. **Do not add a second writer.**
- **Coin glob identity must include the currency.**
  `Coin.globIdentityFields = ['denomination']` today; with two issuers,
  like-keyed coins would **merge into one stack — an invisible mint with
  no ledger row and no error**. The key is the defence, not a rule
  someone remembers.
- **`Money` already guards arithmetic** via `assertSameCurrency`. Reuse
  it; do not add a parallel check.
- **The balance read surface must stay synchronous.**
  `AccountBalance` reads hit a warmed in-memory cache; `SupplyAggregate`
  the same. Per-currency keying must preserve sync reads
  (`BankingApi.balanceOf`, `moneySupply`).
- **No new Api.** Currency rides `BankingApi` / `BankingLogic`. Apis are
  per-*subsystem*, never per-concept — a `CurrencyApi` is the
  antipattern.
- **Currency data lives in a sanctioned module category** (see CLAUDE.md
  § *Module Categories*) — one data record, not scattered constants.
  Registry-vs-catalogue shape is a planning call; what is required is
  that **no currency constant survives outside it**.
- **Banking Law 1 holds**: a denomination is a coin's *identity*; face
  value is intrinsic to the currency and is never a worth stamped on the
  good.
- **`Coin` is Stuff behind the call-security proxy** — persisted fields
  stay public/TS-private, never `#`.
- **Inter-stuff contract**: currency is read through methods, not fields.
- **Deploy gate.** The live box holds real coins, balances and ledger
  rows. A migration that runs before the new table is live is mandatory,
  and the throw above is what makes a partial migration loud.
- **`banking.md` describes shipped state.** It is updated *by* this build,
  not ahead of it.

## Acceptance criteria

- **The acceptance test, mechanized:** ⭐⭐ *the zorkmid is currency #1
  and nothing in the code knows it is special.* A test exercises the
  fixture currency through mint, deposit, withdraw, transfer, payment,
  wage, tax, escrow and draw, and **no path branches on the currency
  being the zorkmid**.
- `LedgerEntry`, `AccountBalance`, and `SupplyAggregate` each persist a
  currency; a round-trip test proves it survives save/load.
- **Per-currency conservation:** a test posts mints and drains in two
  currencies and asserts each supply is independently correct, and that
  neither leaks into the other.
- **A currency-crossing leg throws.** A test asserts it, and asserts the
  rejection is unconditional — there is no flag, option, or kind that
  permits it.
- **`bank_supply` holds one row per currency**; `moneySupply` is
  per-currency and reads synchronously.
- **An unknown denomination throws** at both face-value lookups, with a
  test.
- **Glob identity includes the currency:** a test proves two same-value
  coins of *different* currencies do **not** merge.
- **No currency constant outside the currency record** — grep-checkable:
  no `"zorkmid"` / `"credit"` literal remains in `Money`, `Coinage`,
  `Coin`, or `Coin.yaml` as a currency tag.
- **`Money.render()` reads the currency record** — no hardcoded unit
  string.
- **Coins present distinguishably**: a 25-value coin and a 1-value coin
  differ in `shortDescription` and are separately addressable by the
  parser; a test covers the parse.
- **Migration proven on a copy of live data**: every account balance,
  ledger row and coin has identical value before and after; total supply
  is unchanged. Rehearsed before the deploy, not during.
- **`sovereign` and `crown` no longer appear** in code, fixtures, or
  content.
- **`docs/subsystems/banking.md` is updated** to describe the shipped
  per-currency substrate and the zorkmid.
- **The slates are retired or trimmed at the sweep** — the tail's Half A
  is consumed by this build; its Half B record and the builds slate's
  scrip/credit sections survive as remaining design surface.

## Cross-references

**Seeding slates**
- [currency-slate](../slates/builds/currency-slate.md) — the decision
  layer (naming, structural denominations, reserve-by-obligation, the
  refusal to build exchange, the three hazards)
- [multi-currency-slate](../slates/tails/multi-currency-slate.md) — the
  Half-A implementation spec (schema table, call sites, build order)

**Subsystem docs**
- [banking.md](../subsystems/banking.md) — the substrate this extends;
  updated by this build
- [glob.md](../subsystems/glob.md) — the fungible-stack substrate coins
  ride; the glob-identity constraint
- [governance.md](../subsystems/governance.md) — `reserve` is
  `requiresGovernor`; the per-issuer authorization
- [retail.md](../subsystems/retail.md) — the offer surface acceptance
  would touch (out of scope)

**Design context**
- [balance-slate](../slates/builds/balance-slate.md) — a mint is a
  reserved matter
- [economy-slate](../slates/builds/economy-slate.md) — the 2026-07
  dismissal, refined; the currency-reset event
- [corpos-slate](../slates/builds/corpos-slate.md) — company scrip, the
  use case this generalization exists for
- [terminus-banking](../staging/terminus-banking.md) § 7 — the deferred
  credit subsystem the rename gives the word back to
