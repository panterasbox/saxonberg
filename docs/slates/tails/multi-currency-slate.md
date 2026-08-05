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
> - ⛔ **Half B — currency *markets* (FX). REFUSED 2026-08-04**, not
>   deferred. `builds/currency-slate.md` decided there is no exchange
>   subsystem: **currencies are goods**, traded in the market that
>   already exists, at whatever price people pay. What survives is the
>   **money-changer as a merchant**; what is refused is any **declared
>   rate**. ⚠ Half A's currency-crossing rejection is therefore a
>   **permanent invariant, not an inert seam awaiting Half B** — the one
>   change to Half A's brief this makes. The original Half B is retained
>   below as the record of what was considered.

Working slate for **more than one currency** — and, eventually, an
**exchange** between them.

> ⚠ **Naming (decided 2026-08-04):** the Compact's currency is the
> **zorkmid**, not the `credit` — the rename gives `credit` back to the
> deferred lending subsystem
> ([terminus-banking §7](../../staging/terminus-banking.md)) that needs
> the word. **Below, `credit` appearing in a description of *today's
> code* is correct and left alone; `credit` as the *target* currency tag
> is now `zorkmid`.** Denomination identity also becomes structural —
> `(currency, faceValue)`, no authored coin names — which changes step 5
> materially. See
> [builds/currency-slate](../builds/currency-slate.md).

⚠⚠ **Read the claim below precisely; it has already been misread once.**
`Money.ts`'s doc comment says a second currency is *"an additive change,
not a refactor."* **That is true of `Money` and false of everything that
persists** — and the gap table two sections down is the proof.
`builds/currency-slate.md` restated the doc comment as though it covered
the whole substrate, concluded the work was "a catalog problem," and was
**wrong about the thing that sets the build's cost**. This slate's
governing claim is the narrower one:

> **The value object was written for N currencies. The durable spine was
> not.** This slate is the work of making `Money.ts`'s sentence true
> underneath it.

It stays a banking *tail* rather than a fresh build because the change is
**mechanical and well-bounded** (~1–2 focused days), not because it is
free.

See also:

- [docs/subsystems/banking.md](../../subsystems/banking.md) — the shipped
  monetary substrate this extends: cash (`Coin`/`Coinage`) vs. account
  balances, the `bank_ledger`/`bank_accounts`/`bank_supply` collections,
  the sealed `postTransaction` conservation chokepoint, `BankingApi`/
  `BankingLogic`.
- [docs/slates/builds/currency-slate.md](../builds/currency-slate.md) —
  ⭐ **the DECISION layer above this one** (the zorkmid, structural
  denominations, reserve-by-obligation, and the refusal to build an
  exchange). This slate is its Half-A implementation spec. Read that one
  first; where the two differ, it wins.
- [docs/slates/builds/economy-slate.md](../builds/economy-slate.md) —
  the macro-economics home, and where the **currency reset** (the
  Rentenmark / Plano Real move) lives. ⛔ *Superseded: this slate used to
  route "FX rate policy (peg vs float)" here as a deferred macro
  question. There is no rate policy, because there is no rate.*
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
| Launch with one currency (`zorkmid`); the substrate ready for N | Launching a second live currency (content + issuer decision, deferred) |
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
| `Coinage` / `Money.render` / `Coin` | hardcodes "credit(s)" + 1/5/25; `Coin.denomination` **defaults to `DEFAULT_CURRENCY`** (a currency in a denomination field); `globIdentityFields = ['denomination']` | per-currency `[{value, massKg, label?}]`; denomination identity becomes **`(currency, faceValue)`** — ⚠ **glob identity must include the currency or two issuers' like-valued coins MERGE (an invisible mint)**; presentation derives from the pair |
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
  carries one `currency`; you hold a `zorkmid` account and (later) a
  `scrip` account, distinct rows. Matches real banking (a USD account and
  a EUR account are two accounts). The `_cache` keyed on `accountId` is
  unchanged; the currency rides the row. `openAccount` takes a currency
  (defaulting to `zorkmid`). Reads that *sum* group by currency.
  ⭐ **Confirmed independently by `builds/currency-slate.md`** — both
  slates reached account-per-currency by different routes.
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

## Half B — currency markets (FX) — ⛔ SUPERSEDED 2026-08-04

> ⛔ **`builds/currency-slate.md` decided against building an exchange
> at all.** Currencies are *goods*: coins are already `Stuff` with mass,
> so you buy one currency's coins with another's in the market that
> already exists, and the rate is whatever people pay. No oracle, no
> world rate, no FX engine. ⭐ Currency crises become **emergent** rather
> than simulated — ⭐⭐ *which is exactly why a **pegged issuer** belongs
> and a world rate does not: a peg that breaks when its reserves drain IS
> the emergent currency crisis.*
>
> **The resolution, component by component:**
>
> | Half B component | Verdict |
> |---|---|
> | The **money-changer** (bounded both-currency reserves, two same-currency transfers, keeps a spread, can run out) | ✅ **Survives** — it is a *merchant who deals in coins*, not an FX engine. Mints no new conservation rule. |
> | A **world oracle rate** — a number the world agrees on that trades settle at | ⛔ **Refused.** It makes the rate authoritative, breaking economy-slate Law 1. Nothing reads a global rate. |
> | ⭐ A **peg as the issuer's REDEMPTION PROMISE** (reserves + a published rate at its own window) | ✅ **Survives.** ⚠ *Corrected 2026-08-04* — an earlier revision refused "peg" as a category and cut this with it. It is one party's standing offer, it settles as two same-currency transfers, and **it breaks when the reserves run out** — the canonical emergent currency crisis. |
> | The **`convert` verb** | ⚠ Probably unnecessary — `buy`/`sell` at the changer with the shipped retail verbs. A dedicated verb is what makes exchange feel like a system rather than a shop. |
> | **Rejecting a currency-crossing leg** at `postTransaction` | ✅ **Keep — PERMANENTLY.** Below it is called an "inert seam Half B fills." **It should never be filled.** The never-cross-currencies rule is the invariant, not a placeholder. |
>
> ⭐⭐ **The changer survives; the rate does not.** A person who will
> trade you zorkmids for scrip at a price they choose is content. A
> number the world agrees on is an FX engine wearing a hat.

The original Half B design is retained below **as the record of what was
considered**, not as a build plan. ⚠ Its peg-vs-float decision (item 1)
and its framing of `convert` as a deferred seam are the two parts
superseded above.

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
   (persistent fields, default `zorkmid`); key `SupplyAggregate` by
   currency (row-per-currency + the cache becomes a `Map`).
3. **Conservation** — `BankTransaction.assertConserving` gains the
   per-currency rule (same-currency endpoints for movement kinds;
   per-currency `supplyDelta`); **reject** any currency-crossing leg with
   the reserved `convert`-not-supported error.
4. **Thread** — `postTransaction` takes/propagates the currency; walk the
   ~12 call sites (mint/drain/deposit/withdraw/transfer/payment/wage/tax)
   so each posts in the right currency (all `zorkmid` at launch — this
   step is proving the plumbing, not adding a currency).
5. **Coinage/render** — a per-currency denomination table
   (`[{value, massKg, label?}]`); drop the hardcoded "credit(s)" in
   `Money.render`; `Coin`/`Coinage` parameterized by currency.
   ⚠ **Three things this step must get right** (see
   [builds/currency-slate](../builds/currency-slate.md) § *Three concrete
   hazards*):
   - **Denomination identity is `(currency, faceValue)`** — structural,
     not an authored name. `zorkmid` is the only authored money noun;
     coins present as "a 25-zorkmid piece". The optional `label` is for
     an issuer who wants named coins (a corpo scrip will; the Compact
     won't).
   - ⚠⚠ **`Coin.globIdentityFields` must include the currency**, or two
     issuers' like-keyed coins merge into one stack — money created by a
     merge, no ledger row, no error.
   - ⚠⚠ **The `?? 1` unknown-denomination fallback should become a
     throw.** As written, re-keying denominations without migrating live
     coins silently revalues every 25-coin to 1, and the conservation
     audit still *passes* because the bottom-up term recomputes from the
     same broken lookup.

   ⚠ **This step is the deploy gate.** It touches live `Coin` instances
   on the deployed box, and the seeder is INSERT-ONLY, so editing
   `Coin.yaml` does nothing to rows that already exist. Sequence it with
   the step-2 schema migration so there is **one** migration window and
   one backfill, not two. Deferrable to account-only only if the 2nd
   currency ships without cash — which does not apply to the rename,
   which lands regardless.
6. **Reporting** — `bank statement`, `profitAndLoss`, `moneySupply`/
   `reconcile` become currency-aware (per-currency reconcile is the
   audit that proves the threading correct).
7. **Seam** — the inert `convert` path + a test that a currency-crossing
   transaction throws. Ship one currency; the substrate is now N-ready.

### Half B — FX (⛔ superseded; retained as the record of what was considered)

1. ⭐ Decide **peg vs. market** (governance/macro call). — **PARTLY
   SURVIVES.** ⛔ A *world oracle* rate is refused. ✅ A **peg as the
   issuer's redemption promise** (reserves + a published rate at its own
   window, breakable when the reserves drain) is the good version and is
   retained for the scrip build. ⚠ *This item was marked wholly refused
   on 2026-08-04; that was too broad a cut and is corrected here.*
2. ✅ The **money-changer** (bounded both-currency reserve holder; two
   same-currency transfers + spread; attendant + bounded-participant
   reuse). — **Survives**, as a merchant who deals in coins.
3. ⛔ Light up `convert` at the chokepoint (replace the Half-A throw). —
   **The throw is permanent.** Trade at the changer with `buy`/`sell`.
4. A second live currency as **content** (its issuer decided with
   governance; a corpo scrip is the natural first).

---

## Open questions

1. **Account model** — single-currency vs. wallet (lean: single-currency;
   §*The one decision*).
2. **Who issues a second currency?** One CB mints all currencies, or each
   currency has its own issuer (a corpo for a scrip)? Governance call
   (governance.md); doesn't block Half A. ⚠ **`builds/currency-slate`
   adds a constraint**: authorizing an issuer is a *mint*, so by
   [balance-slate](../builds/balance-slate.md) it is a **reserved
   matter** — Compact-level, not a locality's own call. *A locality may
   run its own currency only with the Compact's leave.*
3. **Does the 2nd currency have cash?** If account-only, Half A step 5
   (Coinage) is deferrable. Lean: whatever the first real 2nd currency
   wants — probably a corpo scrip that *is* physical (a company token).
4. **Peg vs. float for v1 FX** — ⭐ **RESOLVED 2026-08-04: neither, as
   posed.** There is no *world* rate to peg or float; the market price is
   whatever people pay. But a **pegged issuer** — reserves plus a
   published redemption rate at its own window, breakable when the
   reserves drain — survives as the good half, deferred to the scrip
   build. ⚠ *Briefly recorded as wholly closed; that was too broad and is
   corrected.*
5. **Cross-currency in one account statement** — if accounts are
   single-currency, `bank statement` is naturally per-account/per-currency;
   a combined "net worth across currencies" view would need a rate (Half B)
   and is deferred.
6. **Spread/fee home** — the changer's spread as a `Terms` fee row
   (banking.md already has per-bank fee schedules) vs. a bare rate delta.
   Lean: reuse `Terms` — it's already a conserved fee leg.

---

## What this slate does NOT cover

- ~~**The FX rate *policy***~~ — ⛔ **there is no rate policy**, because
  there is no rate (Half B supersession). Devaluation still happens; it
  happens the way it happens in life, by people declining to hold your
  paper. The one governed monetary event that survives is the
  **currency reset** ([economy-slate](../builds/economy-slate.md) —
  the Rentenmark / Plano Real move), which needs mint/drain + a
  governance act and no market at all.
- **Capital markets / securities** — a second currency is not a security;
  the corpo stock exchange stays deferred behind a working retail economy
  (economy-slate § *Capital markets*).
- **Cross-currency *pricing* of goods** — a menu priced in `scrip` is just
  a `Charge` in a different currency (falls out of Half A); a good priced
  in *two* currencies at once is a Half-B convenience, deferred.
- **Inflation / supply balance across currencies** — the macro tuning
  problem, parked with the rest of the economy's macro.
