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
- ⚠⚠ **Only the issuer can create value, on the cash side as well as the
  ledger side.** The quantity of a value-bearing stack cannot be changed
  by ungated code — the gating discipline `Stuff.destroy()` already uses
  is applied to the money path.
- ⚠⚠ **The conservation audit can see all coin.** `reconcile` accounts
  for coin held in `holder_snapshots` and in vaults, not only live
  circulating instances — so "follow the money" has a trustworthy
  instrument.

## Non-goals

- **No second live currency**, and nobody empowered to mint one. The
  generalization is the deliverable; a second currency is not.
- **No world exchange rate — permanently.** No oracle, no order book, no
  FX engine, no `convert` path, and no number the world agrees on. The
  currency-crossing leg rejection is a **permanent invariant, not a seam
  awaiting a later build**
  ([currency-slate](../slates/builds/currency-slate.md) § *Do not build
  exchange*).
- **No money-changer NPC, and no pegged issuer** — both are *legitimate
  designs deferred to the currency that creates demand for them*, not
  refusals. See *A peg is a promise, not a rate* below for the
  distinction and the constraint it places on this build.
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
- ⚠ **No full follow-the-money audit.** This build closes the four
  value-integrity holes that sit on paths it already rewrites (the
  `setQuantity` gate, the `reconcile` blind spots, coin glob identity,
  the `?? 1` throw). The rest of the surface — crafting yields, content
  packs, the CMS coin-row edit, clone-a-coin, `materialize` idempotency,
  the sandbox cash boundary, and destroy-without-drain — is enumerated in
  [money-integrity-slate](../slates/builds/money-integrity-slate.md) and
  is **its own cycle**. Mixing a 174-site refactor with a security sweep
  makes both unreviewable.

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

### A peg is a promise, not a rate

Two things were conflated under "peg" and only one is refused:

| | Verdict |
|---|---|
| **A world oracle rate** — the system knows *1 scrip = 4 zorkmids* and trades settle at it | ⛔ **Refused permanently.** It makes the rate authoritative, which breaks [economy-slate](../slates/builds/economy-slate.md) Law 1 — *a price is an event between two parties, not a property of a thing* — and it needs rate storage, rate governance, and propagation to every price site. |
| **A peg as an issuer's redemption promise** — the issuer holds zorkmid reserves and redeems its scrip at a published rate **at its own window** | ✅ **Legitimate, deferred to the scrip build.** Not a global rate; one party's standing offer, which **can break when the reserves run out.** |

⭐ The second is the best content in this area and is *already* what the
slate's philosophy asks for. A breaking peg is the **canonical emergent
currency crisis** — Bretton Woods, the ERM in 1992, Argentina 2001 — and
it breaks because somebody drained the reserves, not because a designer
scripted a devaluation. A currency board is literally *"I will redeem at
this rate as long as I have reserves."*

It also **settles as two same-currency transfers**, so it is implementable
without ever crossing a leg. That is a *validation* of the
never-cross-currencies invariant, not a threat to it.

> ⚠⚠ **The constraint this places on this build: the rate must never live
> on the currency record.** A `pegRate` field beside the denominations is
> the natural place to put it and is exactly the world-oracle shape —
> every reader of the currency would get an authoritative rate for free.
> **The rate belongs to the issuer's standing offer, not to the money.**
> Costs nothing to respect today; expensive to undo once things read it.

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
- ⚠⚠ **The currency record carries no rate, and no reference to another
  currency.** Denominations, masses, optional labels, and the issuer —
  nothing that relates one currency's value to another's. A future peg is
  an *issuer's standing offer*, not a property of the money (see *A peg is
  a promise, not a rate*). This is the one forward-looking constraint the
  build must respect to keep that door open.
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
- **The currency record holds no rate and no cross-currency reference** —
  inspectable on the record's shape; nothing in the codebase can ask
  "what is currency A worth in currency B."
- **Coins present distinguishably**: a 25-value coin and a 1-value coin
  differ in `shortDescription` and are separately addressable by the
  parser; a test covers the parse.
- **`setQuantity` is gated** on the value-bearing path — a call from an
  unlisted module throws, a shadow cannot intercept it, and every
  legitimate caller (split/merge, `issueCash`, crafting consumption)
  still works. The gate sits on the **mixin**, so a future value-bearing
  glob inherits it.
- **`reconcile` sees all coin** — the per-currency identity is
  `supply === accountTotal + circulatingCoin + vaultCoin + snapshotCoin`.
  A test proves a coin captured into a snapshot still balances, a coin in
  a vault still balances, and that **corrupting a snapshot's quantity
  makes `balanced` go false** (the instrument detects what it exists to
  detect).
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
