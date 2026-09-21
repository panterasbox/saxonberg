# Multi-currency slate (working doc)

> **Status: PARTIAL** — Half A (currency threaded through the ledger
> spine) shipped 2026-08-05, including per-currency reporting/reconcile
> (`banking.md` § Reporting consumers: *"all per currency… never sum
> across"*) — the standalone "per-currency statement views" item is
> therefore already satisfied and dropped from Left. Half B (FX) is
> refused, not deferred → [banking.md](../../subsystems/banking.md)
> **Left:** a second issuer and the corpo scrip that motivates one (with
> its coinage) · the money-changer as a merchant · the pegged issuer's
> redemption window
> **Size:** a tail

> ✅ **HALF A IS BUILT AND MERGED** (the currency build, 2026-08-05 —
> `docs/subsystems/banking.md` is now the live reference for everything in
> it). What survives here is the **record of what was considered** for the
> refused Half B, and the open questions the build did not close. The
> Half-A descriptive sections (*what it is/isn't*, *the gap*, *the one
> decision*, the Half-A build order) were **cut 2026-09-20** during
> slate compaction — code-verified shipped exactly as specified:
> `AccountBalance.currency` (single-currency accounts, per the
> recommendation), per-currency `bank_supply`, `assertConserving`'s
> per-currency rule, and the ~12 `postTransaction` sites all threading
> currency. Read [banking.md](../../subsystems/banking.md) instead.
>
> **Original status: scoped, buildable in two clean halves.** The banking
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

Q1 (account model) is cut 2026-09-20 — resolved and shipped exactly as
recommended: single-currency accounts (`AccountBalance.ts`: *"An
account holds exactly one currency"*). Q4 (peg vs. float for v1 FX) is
cut — already marked resolved in this doc, and the underlying doctrine
(no world rate, ever; a peg is an issuer's standing offer) now ships in
`banking.md` § Currency, word for word.

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
