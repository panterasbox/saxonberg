# Multi-currency slate (working doc)

> **Status: PARTIAL** — Half A (currency threaded through the ledger
> spine) shipped 2026-08-05, including per-currency reporting/reconcile
> (`banking.md` § Reporting consumers: *"all per currency… never sum
> across"*) — the standalone "per-currency statement views" item is
> therefore already satisfied and dropped from Left. Half B (FX) is
> refused, not deferred → [banking.md](../../subsystems/banking.md).
> **Cluster-merged 2026-09-21**: the Half B verdict table + mechanics and
> the "who issues a second currency" question moved to
> [builds/currency-slate.md](../builds/currency-slate.md), the file that
> names itself the decision layer over this one — read that slate first.
> **Left:** whether a second currency needs its own cash/coinage · a
> combined cross-currency account statement · the changer's spread/fee
> home
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

> **Cut 2026-09-21, cluster-merge pass — DUPLICATE.** This section's
> verdict table repeated
> [builds/currency-slate.md](../builds/currency-slate.md) §§ *Reconciling
> this with the tail's Half B* and *The peg is a promise, and the promise
> can break* verbatim. The mechanics detail unique to this section (the
> rate-source options, the bureau-de-change walkthrough, the
> `convert`-verb seam, the educational payoff) moved verbatim to that
> slate's *Absorbed from multi-currency-slate — Half B mechanics*
> section. Read the canonical.

---

## Build order

> **Cut 2026-09-21, cluster-merge pass — DUPLICATE.** This recapped the
> same Half B verdict table as a checklist; item 4 (a second currency as
> content, a corpo scrip the natural first) is already carried by
> [builds/currency-slate.md](../builds/currency-slate.md) § *The use case
> worth building toward is SCRIP, not municipal money*. See that slate's
> §§ *Reconciling this with the tail's Half B* / *The peg is a promise,
> and the promise can break* / *Absorbed from multi-currency-slate — Half
> B mechanics*.

---

## Open questions

Q1 (account model) is cut 2026-09-20 — resolved and shipped exactly as
recommended: single-currency accounts (`AccountBalance.ts`: *"An
account holds exactly one currency"*). Q4 (peg vs. float for v1 FX) is
cut — already marked resolved in this doc, and the underlying doctrine
(no world rate, ever; a peg is an issuer's standing offer) now ships in
`banking.md` § Currency, word for word.

Q2 (who issues a second currency) cut 2026-09-21, cluster-merge pass —
DUPLICATE, merged into
[builds/currency-slate.md](../builds/currency-slate.md) § *Open
questions* Q2, which already carried the reserved-matter constraint; the
one-CB-vs-per-currency-issuer angle is now the *Absorbed from
multi-currency-slate — Q2 (issuer structure)* note there.

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
