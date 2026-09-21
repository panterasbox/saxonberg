# Currency slate — generalizing the issuer, and shipping it with one currency

> **Status: PARTIAL** — the zorkmid rename, structural `(currency,
> denomination)` identity, per-currency conservation, the never-cross-
> currencies invariant, the `?? 1`-fallback fix, and reserve-status-by-
> construction all shipped exactly as this slate specified →
> [banking.md](../../subsystems/banking.md) §§ Currency / Conservation.
> **Read that doc first** — most of this slate's own analysis is now
> history there. What's left is entirely about a *second* currency, which
> v1 deliberately never registers.
> **Left:** a second issuer + who may authorize a mint · opt-in acceptance
> lists / corpo scrip · the peg as a redeemable standing offer (designed,
> not built — no second currency exists to redeem) · wages-in-scrip
> consent
> **Size:** a build (much smaller than it reads — the substrate shipped;
> what remains is a second currency's content and policy, not machinery)

**Captured 2026-08-04. Revised 2026-08-04** (naming decision + a code
survey that corrected this slate's own headline finding).

A deliberate reversal of a recorded decision:

> **User: "I don't actually want multiple currencies, but I want all the
> infrastructure in place so that if a locality wanted to start minting
> their own currency, their central bank would function exactly like ours
> and the rest of banking and money and the economics simulation is able
> to handle it. I would always want the Compact-issued currency to be the
> reserve currency of the realm in the way the US dollar is, because it
> should always be stable. But if someone wanted to start printing their
> own money and trying to keep it balanced, they're welcome to try.
> Players adopt it at their own risk."**

> **Status: design + scope recommendation. Not requirements.** The
> recommendation is to **ship the generalization with exactly one
> currency, no second issuer, and no exchange** — the same
> present-but-inert pattern property 0a used for `grants[]` and
> `allowance`.

> ⭐ **This slate is the DECISION layer. The implementation spec already
> exists** — [tails/multi-currency-slate.md](../tails/multi-currency-slate.md)
> carries the schema table, the ~12 `postTransaction` call sites, the
> per-currency `assertConserving` rule, and a ~1–2 day Half-A build order.
> Do not duplicate it here. This document decides *what the money is
> called, how denominations are identified, what makes the zorkmid the
> reserve, and what we refuse to build*; the tail decides *how the
> currency dimension gets threaded*.

Related: [banking.md](../../subsystems/banking.md) (**the shipped
substrate — `Money`, `Coinage`, the conservation chokepoint; read it
first**), [tails/multi-currency-slate](../tails/multi-currency-slate.md)
(**the Half A implementation spec**), [balance-slate](./balance-slate.md) (the ledgers-are-currencies
framing, and why the legislature's job is monetary policy),
[corpos-slate](./corpos-slate.md) (the scrip use case),
[retail-slate](./retail-slate.md) (acceptance, and the market that
replaces FX), [economy-slate](./economy-slate.md).

---

> **Cut 2026-09-20, all SHIPPED · DOCUMENTED in
> [banking.md](../../subsystems/banking.md):** the zorkmid rename (§
> Currency — the record, and the one place it lives); structural
> `(currency, denomination)` denomination identity (same section, and
> `lib/banking/Currency.ts`'s `CurrencyRecord`); the "expensive part"
> correction (the currency field now lives on `LedgerEntry`,
> `AccountBalance` and `bank_supply` — § Conservation); the per-currency
> conservation table and the never-cross-currencies invariant (same
> section); and all three hazards this slate found — the glob-merge fix
> (`Coin.stackIdentityFields = ['currency', 'denomination']`), the `?? 1`
> fallback replaced by a throw (`Currency.faceValueOf`, doc-commented at
> the site and in banking.md), and denomination presentation deriving
> from `(currency, faceValue)` (`Currency.describeDenomination`, *"a
> 25-zorkmid piece"*).

# ⭐⭐⭐ Do not build exchange. Currencies are goods.

> The opening doctrine here (no oracle, no FX engine, buy currencies as
> goods) is cut 2026-09-20 as SHIPPED · DOCUMENTED — `banking.md`'s
> Conservation section states the same "a ledger leg may never cross
> currencies… nothing in this codebase asks what one currency is worth in
> another, and nothing ever should" almost verbatim. The Half B
> reconciliation below and the peg design are kept: no second currency
> exists yet, so nothing here has actually been built.

## ⚠ Reconciling this with the tail's Half B

[tails/multi-currency-slate](../tails/multi-currency-slate.md) § *Half B*
designs an exchange: a rate source (**peg vs. live market**), a
**money-changer** holding reserves of both currencies and settling via
two same-currency transfers, and a `convert` verb at the chokepoint.
That is in direct tension with the ⛔ above, and the tension resolves
cleanly once you separate the two things Half B bundles:

| Half B component | Verdict |
|---|---|
| **The money-changer** — an NPC with bounded reserves of both currencies, settling as two same-currency transfers, keeping a spread, able to **run out** | ✅ **Keep.** This is not an FX engine; it is a **merchant who deals in coins**, which "currencies are goods" already permits. It mints no new conservation rule and reuses the shipped attendant + bounded-participant patterns. |
| **A world oracle rate** — a number the world agrees on, that trades settle at | ⛔ **Refuse.** This is the part that becomes a subsystem, and it makes the rate *authoritative* — breaking economy-slate Law 1 (*a price is an event between two parties, not a property of a thing*). |
| ⭐ **A peg as an issuer's REDEMPTION PROMISE** — the issuer holds zorkmid reserves and redeems its scrip at a published rate *at its own window* | ✅ **Keep.** ⚠ *Corrected 2026-08-04 — an earlier revision refused "peg" as a category and cut this with it.* It is not a global rate; it is one party's standing offer, and **it can break when the reserves run out.** See below. |
| **The `convert` verb** | ⚠ **Probably unnecessary.** If the changer is a merchant, you `buy` and `sell` at it with the shipped retail verbs. A dedicated verb is what makes exchange feel like a system rather than a shop. |
| **A currency-crossing leg rejected at `postTransaction`** | ✅ **Keep, permanently.** The tail frames this as an inert seam Half B later fills. **It should never be filled** — the never-cross-currencies rule is the invariant, not a placeholder. |

> ⭐⭐ **The changer survives, and so does a promise. The ORACLE does
> not.** A person who will trade you zorkmids for scrip at a price they
> choose is content. A person who *commits* to a price and can fail to
> honour it is better content. A number the world agrees on is an FX
> engine wearing a hat.

## ⭐⭐⭐ The peg is a promise, and the promise can break

The single best piece of content in this whole area, and it needs no FX
machinery at all:

> **A pegged issuer holds reserves of zorkmids and offers to redeem its
> scrip at a published rate, at its own window, for as long as the
> reserves last.**

- **It is not a global rate.** Nothing else in the world reads it; it is
  one merchant's standing offer, and the market may price the scrip
  anywhere it likes regardless.
- ⭐⭐ **It breaks endogenously.** When the reserves drain, the peg
  fails — and that is the **canonical emergent currency crisis**
  (Bretton Woods, the ERM in 1992, Argentina 2001). It breaks because
  somebody drained it, not because an author scripted a devaluation.
  This is exactly what *"currency crises become emergent rather than
  simulated"* was asking for; the earlier revision refused it by
  accident.
- ⭐ **A currency board is literally** *"I will redeem at this rate as
  long as I have reserves"* — the most legible finance lesson available,
  and fully endogenous.
- **It settles as two same-currency transfers**, so it never crosses a
  leg. ⭐ That makes the peg a *validation* of the never-cross-currencies
  invariant rather than a threat to it.

> ⚠⚠ **The one constraint this places on the substrate build: the rate
> must NEVER live on the currency record.** A `pegRate` field beside the
> denominations is the natural place to put it and is exactly the
> world-oracle shape — every reader of the currency would get an
> authoritative rate for free. **The rate belongs to the issuer's
> standing offer, not to the money.**

⚠ **Action:** the tail's Half B should be amended to match, and its
"inert `convert` seam" reframed from *deferred* to *closed*. Left
unamended, the two documents will disagree again the moment somebody
builds from the tail without reading this.

---

> **"Reserve status is FUNCTIONAL, never decreed" cut 2026-09-20 — SHIPPED
> · DOCUMENTED, near-verbatim, in
> [banking.md](../../subsystems/banking.md) § Currency**: *"Reserve
> status is functional, never decreed: make Compact obligations payable
> only in zorkmids and it is the reserve by construction."*

# ⭐⭐ The use case worth building toward is SCRIP, not municipal money

*"Terminus dollars"* is a boring feature. **Company scrip is content.**

> A corpo issues currency → **pays wages in it** → redeemable at the
> company store.

That is the **truck system**, and it is historically real, exploitative,
legible, and generates conflict without an author writing any. It gives
the labor market genuine politics, it is a natural
[corpos-slate](./corpos-slate.md) feature, and it **self-demonstrates the
reserve mechanism**: scrip is worse money, and the game makes you feel
exactly why.

⭐ It is also the mirror of the collective-ownership question this
session opened with — **labor vouchers and company scrip are the same
mechanism pointed in opposite directions**, which makes the pair a
genuinely good teaching object.

⭐ And it is where the optional denomination `label` earns its keep: the
Compact's coins are "a 5-zorkmid piece"; Hollis pays you in **chits**.

---

# ⚠ Risks worth watching

| | |
|---|---|
| **two prices for everything is bad text UX** | mitigated by **narrow acceptance** — almost everywhere takes zorkmids only, and scrip is the exception you *notice* |
| **a second currency nobody uses is dead weight** | which is why the recommendation is to ship **zero** second currencies |

Three rows cut 2026-09-20, resolved by shipping: *the temptation to build
FX* (the never-cross-currencies leg rule is now an enforced invariant,
not a defence-in-depth hope — `banking.md` § Conservation); *per-currency
conservation is subtle* (shipped, and it held: `bank_supply` is N
independent domains); *the rename is a live-data migration* (done — the
`?? 1` fallback is now a throw, so a future re-key fails loudly instead
of silently).

---

> **Three sections cut 2026-09-20.** *The acceptance test* — both named
> violations fixed: `Money.render()` now reads
> `Currency.renderMinor(this.minor, this.currency)` (no hardcoded unit),
> and `Coin.denomination` is a numeric face value, not a currency string
> defaulting to `DEFAULT_CURRENCY`. *Scope recommendation* — executed:
> v1 shipped with exactly one currency, no exchange. *Credit — WANTED,
> deferred, not rejected* — superseded: credit is no longer just wanted,
> it has a full requirements doc,
> [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md),
> seeded by the (now-compacted)
> [credit-slate](./credit-slate.md). The rename-frees-the-word-`credit`
> argument is history — the rename already shipped.

# Open questions

Q1 (per-currency balances: one account or one per currency) was already
marked CLOSED in this doc and cut 2026-09-20 — shipped exactly as
decided: `AccountBalance.currency` (persistent field), *"an account
holds exactly one currency… a zorkmid account and a scrip account are
two accounts"*. Q6 (does the unknown-denomination fallback throw) and Q7
(do `sovereign`/`crown` survive) are both resolved by shipping: it
throws (`Currency.faceValueOf`), and they didn't (banking.md: *"the
retired `sovereign`/`crown` names had never been seen by a player"*).

2. **Who may authorize an issuer?** It is a mint, so by
   [balance-slate](./balance-slate.md) it is squarely a **reserved
   matter** — Compact-level, not a locality's own call. ⚠ Which is
   interesting: *a locality may run its own currency only with the
   Compact's leave*, which is realistic and worth being deliberate about
   rather than defaulting into.
3. **Does acceptance default to "credit only" or "anything"?** *Leans
   zorkmid-only* — an opt-in list, so nobody accidentally accepts scrip.
4. **Do wages paid in scrip require consent at hiring?** The truck system
   was abolished by statute in reality; leaving that fight *available* to
   the polity is probably better content than pre-deciding it.
5. **Is there a floor on issuer obligations** — must an issuer redeem?
   A currency nobody must honour is a pure confidence game, which may be
   exactly the point, or may be a griefing surface.
