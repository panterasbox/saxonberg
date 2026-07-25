# Multi-currency slate (working doc)

> **Status: scoped, buildable in two clean halves.** The banking
> substrate **shipped** ([banking.md](../../subsystems/banking.md)) with a
> single currency (`credit`). The amount value-object (`Money`) is already
> **currency-tagged and currency-closed** — the intent is there. What is
> *not* there is the currency dimension threaded through the durable spine
> (ledger, balances, supply, conservation), which all carry bare
> minor-unit integers with one *implicit* currency. This slate is two
> asks, deliberately kept apart:
>
> - **Half A — the multi-currency substrate.** Thread `currency` through
>   the four persistence surfaces + the conservation check + the ~12
>   `postTransaction` sites + the display verbs. Mechanical, ~1–2 focused
>   days. **Worth doing from day 1** (launch one currency), because it is
>   painful to retrofit onto a populated ledger and cheap to do while the
>   ledger is young.
> - **Half B — currency *markets* (FX).** Rates + a conservation-correct
>   conversion + (optionally) price discovery. Design-heavy, its own
>   build. **Deferred**, with the one exchange-model decision named below
>   so Half A can leave the right inert seam.

Working slate for **more than one currency** — and, eventually, an
**exchange** between them. The governing claim, and the reason it's a
banking *tail* rather than a fresh build: **a second currency is an
additive change to a substrate that was written for it, not a refactor.**
`Money.ts` says exactly this in its own doc comment; this slate is the
work of making the sentence true underneath.

See also:

- [docs/subsystems/banking.md](../../subsystems/banking.md) — the shipped
  monetary substrate this extends: cash (`Coin`/`Coinage`) vs. account
  balances, the `bank_ledger`/`bank_accounts`/`bank_supply` collections,
  the sealed `postTransaction` conservation chokepoint, `BankingApi`/
  `BankingLogic`.
- [docs/slates/builds/economy-slate.md](../builds/economy-slate.md) —
  the macro-economics home. **FX rate policy (peg vs float) is a monetary
  question and belongs to that layer's deferred macro problems**, not to
  the physics this slate builds. Half A is physics; Half B's *rate* is
  macro.
- [docs/slates/builds/cooperative-slate.md](../builds/cooperative-slate.md)
  — the reserve-as-central-bank. Which office issues *which* currency, and
  whether a second currency has its own issuer or the one CB mints all, is
  a governance call that lands here.
- [docs/subsystems/governance.md](../../subsystems/governance.md) — the
  `reserve` (mint) verb is already office-gated to the
  `central-bank-governor`. A per-currency issuer is a governance
  extension, not a banking one.
- [docs/subsystems/corpo.md](../../subsystems/corpo.md) — a plausible
  *source* of a second currency (a corpo scrip / company-store token) and
  the flavor that makes multi-currency diegetic rather than a menu.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — the
  `Quantity<U>` precedent for "a tagged scalar with closed arithmetic";
  `Money` is the same shape with `currency` as the tag.

---

## What it is — and isn't

| This slate | Not this slate |
|---|---|
| A `currency` dimension threaded through ledger / balances / supply / conservation | A rewrite of the money model — `Money` is already currency-tagged |
| Per-currency conservation (money conserved *within* each currency) | Cross-currency conservation magic (a convert is drain-A + mint-B, see Half B) |
| Launch with one currency (`credit`); the substrate ready for N | Launching a second live currency (content + issuer decision, deferred) |
| An inert `convert` / exchange-rate seam laid at the conservation chokepoint | The FX market itself — rates, order book, price discovery (Half B) |
| A per-currency coinage/denomination/render table | A second physical `Coin` cast in v1 (deferrable if the 2nd currency is account-only) |

---

## The gap — the ledger spine is currency-blind

`Money` (`lib/banking/Money.ts`) carries a `currency` tag and enforces it
(`assertSameCurrency` throws on a mismatch, `add`/`subtract`/`compareTo`
are all same-currency). But `Money` lives at the **edges** — the
settlement quantity at a transaction. The durable spine it settles *into*
speaks bare integers with one implicit currency:

| Piece | Today | Half-A change |
|---|---|---|
| `LedgerEntry` (`bank_ledger`) | `amount` only, no currency | add a `currency` field per leg (persistent) |
| `AccountBalance` (`bank_accounts`) | single `balance` scalar | add a `currency` field — **an account is single-currency** (the recommended model) |
| `SupplyAggregate` (`bank_supply`) | one `{minted, drained}` row + one cached pair | key by currency (row-per-currency + `Map<currency,…>` cache); `cachedSupply(currency)` |
| `BankTransaction.assertConserving` | conservation is per-*transaction* | conservation per-*currency*: a transfer/payment/wage/tax leg's two ends must be the same currency; `supplyDelta` returns per-currency |
| `postTransaction` + ~12 call sites | assume `credit` | thread the leg currency through (mint / drain / deposit / withdraw / transfer / payment / wage / tax) |
| `Coinage` / `Money.render` / `Coin` | hardcodes "credit(s)" + 1/5/25 | a per-currency denomination + display-name table |
| Reporting: `bank statement`, `profitAndLoss`, `moneySupply`/`reconcile` | one-currency display | currency-aware display + per-currency reconcile |

The **load-bearing** one is `assertConserving`. Today "money isn't created
or destroyed" is enforced with an *implicit* single currency. The moment a
second currency exists, that invariant must become **per-currency** — and,
critically, **any transaction that crosses currencies breaks it** (it
would mint one currency and drain another). That is not a bug to paper
over; it is the exact seam where Half B plugs in. Half A's job is to make
the invariant per-currency and to **reject** a currency-crossing leg,
leaving a named, inert `convert` path for Half B to fill.

---

## The one decision Half A must make first

**Is an account single-currency, or a multi-currency wallet?**

- **Single-currency account (recommended).** Each `AccountBalance` row
  carries one `currency`; you hold a `credit` account and (later) a
  `scrip` account, distinct rows. Matches real banking (a USD account and
  a EUR account are two accounts). The `_cache` keyed on `accountId` is
  unchanged; the currency rides the row. `openAccount` takes a currency
  (defaulting to `credit`). Reads that *sum* group by currency.
  **Cheapest, most honest, and the conservation check stays trivially
  per-currency** (a leg's currency = both endpoints' account currency).
- **Multi-currency wallet.** One account holds a `Map<currency, balance>`.
  Fewer account rows, but every read/write/cache/conservation site grows
  a currency lookup, and "which currency did this leg move" becomes a
  per-leg tag divorced from the account. More flexible, materially more
  work, and it buys nothing v1 needs.

**Lean: single-currency accounts.** It is the smaller change and the one
that keeps conservation a one-line per-currency assertion. Revisit only if
a consumer genuinely wants one account that holds many currencies (nothing
on the roadmap does).

---

## Half B — currency markets (FX), deferred

The actual *exchange* is its own build, and it needs a design decision
that can't be skipped. Named here so Half A leaves the right seam:

1. **Rate source.**
   - **Fixed peg** (config / governed rate) — a day's work; the CB or an
     author declares "1 scrip = 4 credits"; educational for pegs, currency
     boards, devaluation-as-a-policy-event.
   - **Live market** (order book, price discovery, market makers) — a
     whole build; educational for spreads, floats, arbitrage, speculation.
     This is the capital-markets-adjacent apex and shares its "build the
     underlying first" caution (economy-slate § *Capital markets*).

2. **A conservation-correct conversion.** The honest model is **not** a
   currency-crossing mint. It is a **bureau-de-change / money-changer**
   (an NPC or CB window) that **holds reserves of both currencies** and
   does **two same-currency transfers**: it debits your `credit` account
   to its own `credit` reserve, and credits your `scrip` account from its
   own `scrip` reserve, at the day's rate (keeping the spread). Each leg is
   same-currency, so per-currency conservation holds untouched — the
   changer's *inventory* of each currency is the thing that moves, exactly
   like a bounded merchant's coin float. The **spread is the changer's
   margin** (a fee, an ordinary transfer), and a changer can **run out** of
   a currency (bounded, like every other participant). This reuses the
   attendant + bounded-participant patterns already shipped; it mints no
   new conservation rule.

3. **The `convert` verb + seam.** Half A lays an inert `convert` path at
   the conservation chokepoint that **throws "cross-currency conversion
   not yet supported."** Half B replaces the throw with the two-transfer
   changer settlement above.

Educational payoff (why it's worth eventually): pegs vs. floats, the bid/
ask spread, why you lose money round-tripping, reserves and convertibility,
devaluation as a governed event. All of it rides the conserved,
auditable ledger — no printed FX faucet.

---

## Build order

### Half A — the multi-currency substrate (~1–2 focused days)

1. **Decide** single-currency accounts (above) — do this first; every
   later step assumes it.
2. **Schema** — add `currency` to `LedgerEntry` + `AccountBalance`
   (persistent fields, default `credit`); key `SupplyAggregate` by
   currency (row-per-currency + the cache becomes a `Map`).
3. **Conservation** — `BankTransaction.assertConserving` gains the
   per-currency rule (same-currency endpoints for movement kinds;
   per-currency `supplyDelta`); **reject** any currency-crossing leg with
   the reserved `convert`-not-supported error.
4. **Thread** — `postTransaction` takes/propagates the currency; walk the
   ~12 call sites (mint/drain/deposit/withdraw/transfer/payment/wage/tax)
   so each posts in the right currency (all `credit` at launch — this step
   is proving the plumbing, not adding a currency).
5. **Coinage/render** — a per-currency denomination + display-name table
   (drop the hardcoded "credit(s)" in `Money.render`); `Coin`/`Coinage`
   parameterized by currency. Deferrable to account-only if the 2nd
   currency ships without cash.
6. **Reporting** — `bank statement`, `profitAndLoss`, `moneySupply`/
   `reconcile` become currency-aware (per-currency reconcile is the
   audit that proves the threading correct).
7. **Seam** — the inert `convert` path + a test that a currency-crossing
   transaction throws. Ship one currency; the substrate is now N-ready.

### Half B — FX (its own cycle, deferred)

1. Decide **peg vs. market** (governance/macro call).
2. The **money-changer** (bounded both-currency reserve holder; two
   same-currency transfers + spread; attendant + bounded-participant
   reuse).
3. Light up `convert` at the chokepoint (replace the Half-A throw).
4. A second live currency as **content** (its issuer decided with
   governance; a corpo scrip is the natural first).

---

## Open questions

1. **Account model** — single-currency vs. wallet (lean: single-currency;
   §*The one decision*).
2. **Who issues a second currency?** One CB mints all currencies, or each
   currency has its own issuer (a corpo for a scrip)? Governance call
   (governance.md); doesn't block Half A.
3. **Does the 2nd currency have cash?** If account-only, Half A step 5
   (Coinage) is deferrable. Lean: whatever the first real 2nd currency
   wants — probably a corpo scrip that *is* physical (a company token).
4. **Peg vs. float for v1 FX** — lean peg first (simpler, teaches
   currency-board mechanics; a float is the capital-markets apex).
5. **Cross-currency in one account statement** — if accounts are
   single-currency, `bank statement` is naturally per-account/per-currency;
   a combined "net worth across currencies" view would need a rate (Half B)
   and is deferred.
6. **Spread/fee home** — the changer's spread as a `Terms` fee row
   (banking.md already has per-bank fee schedules) vs. a bare rate delta.
   Lean: reuse `Terms` — it's already a conserved fee leg.

---

## What this slate does NOT cover

- **The FX rate *policy*** (peg level, float dynamics, devaluation events)
  — a monetary-macro question for the economy/cooperative layer, tuned
  against a running game, not solved in the abstract.
- **Capital markets / securities** — a second currency is not a security;
  the corpo stock exchange stays deferred behind a working retail economy
  (economy-slate § *Capital markets*).
- **Cross-currency *pricing* of goods** — a menu priced in `scrip` is just
  a `Charge` in a different currency (falls out of Half A); a good priced
  in *two* currencies at once is a Half-B convenience, deferred.
- **Inflation / supply balance across currencies** — the macro tuning
  problem, parked with the rest of the economy's macro.
