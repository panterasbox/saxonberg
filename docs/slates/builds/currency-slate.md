# Currency slate — generalizing the issuer, and shipping it with one currency

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
replaces FX), [economy-slate](./economy-slate.md),
[content-packs-slate](./content-packs-slate.md) (trades as the demand
side), [terminus-banking](../../staging/terminus-banking.md) (§7 — the
deferred *credit* subsystem whose name we are giving back).

---

# ⭐⭐⭐ The name: the currency is the **zorkmid**

**Decided 2026-08-04.** The Compact's currency is the **zorkmid**. It
replaces `credit` as the currency tag, and it is the **only authored
money noun in the game**.

Three arguments, in ascending order of how much they matter:

**1. It is on-register.** Zorkmid is NetHack by way of Zork, and NetHack
is a named primary influence — *lean into genre conventions hard, up to
but not including the point where they become cliché*. One borrowed
money noun is homage; three would be a bit.

**2. It gives back a word we need.** [terminus-banking
§7](../../staging/terminus-banking.md) defers an entire **credit**
subsystem — the tab, short-term credit, lending, interest,
creditworthiness, insolvency, deposit insurance — *as one system*.
Meanwhile every ledger leg already speaks of crediting and debiting an
account. Naming the currency `credit` was quietly squatting on the
vocabulary of the build that most needs it.

**3. It is nearly free.** See the migration hazard below — the *code*
change is small. The *data* change is not optional.

---

# ⭐⭐⭐ Denominations are **structural**, not authored

The survey question was *"do we even need to name the coins?"* The answer
turned out to be stronger than "no":

> ⭐⭐ **The two denomination names that exist today — `sovereign` and
> `crown` — have never been seen by a player.**

There is exactly one coin template (`seeds/obj/Coin.yaml`):

```yaml
shortDescription: a credit coin
keywords: [coin, coins, credit, cash, money]
denomination: credit
```

and the mint loop (`BankingLogic` `issueCash`) stamps **only** the
denomination and the quantity:

```ts
const coin = await StuffApi.clone(COIN_PATH);
(coin as unknown as { denomination: string }).denomination = line.denomination;
(coin as unknown as Globbable).setQuantity(line.count);
```

No `shortDescription` restamp, no `keywords` restamp. So a 25-value coin
in your hand today reads **"a credit coin"** and answers to `credit`,
exactly like a 1-value coin. `sovereign` and `crown` exist solely as
lookup keys into `Coinage.DENOMINATIONS` for face value and per-coin
mass. Nothing renders them; nothing parses them; no seed authors them.

## The shape

> **Denomination identity is `(currency, faceValue)`.** A denomination
> record is a value and a mass. Naming it is optional content.

- **`zorkmid` is the currency** — the one name anybody authored.
- **Coins present as `a 25-zorkmid piece` / `a 5-zorkmid piece`**,
  derived from the pair. No author writes them; a second issuer's coins
  render correctly the moment its table exists.
- **An optional `label` on the denomination record** lets an issuer who
  *wants* named coins have them. The Compact declines to use it. A corpo
  issuing scrip almost certainly will, and that asymmetry is characterful
  — the company token has a cute name; real money doesn't need one.
- **Culture supplies the rest.** "Fiver", "benjamin", "two-bit" are
  player slang, they cost nothing, and they cannot be authored
  convincingly anyway. ⭐ This is the [accretion
  thesis](../../lenses/the-toy.md) pointed at money: *the community
  contributes nouns, the substrate supplies the verbs.*

## Why this is the load-bearing choice, not a cosmetic one

Structural denominations are what make the **acceptance test** below
actually achievable. Every currency-specific *name* is a place the code
can learn that the Compact's money is special. Reduce the per-currency
data to `[{value, massKg, label?}]` and there is nothing left to
special-case.

⚠ **It also closes an invisible-mint door** — see the glob-merge hazard
below, which is a naming collision that becomes a conservation bug.

---

# ⚠⚠ CORRECTION — the expensive part is **not** already paid for

The previous revision of this slate led with a ⭐⭐⭐ finding that is
**half wrong**, and the wrong half is the half that costs money.

⚠ **And the corpus already knew.**
[tails/multi-currency-slate.md](../tails/multi-currency-slate.md) has
said, since it was written, that *"the durable spine (ledger, balances,
supply, conservation) … all carry bare minor-unit integers with one
implicit currency"* — with a correct per-piece table. `slates/README.md`
records it accurately too. **Two slates in the corpus contradicted each
other on the single question that sets this build's cost, and the
confident one was wrong.**

Recorded rather than deleted, because the failure mode is the
instructive part: the false claim was the *emphatic* one (⭐⭐⭐, "the
expensive part is already paid for"), it reasoned from a real quote in
`Money.ts`'s doc comment, and it never checked the three `fieldMeta`
blocks that would have refuted it in about ninety seconds. *Errors hide
in the confident passages.*

**What the slate claimed:**

> *"`Money` was never a bare number. v1 shipped the typing with a catalog
> of one. So this is a catalog problem, not a refactor."*

**What is true:** the *transient* value object carries a currency tag.
`Money` has `readonly currency`, `assertSameCurrency` guards every
arithmetic op, and `DEFAULT_CURRENCY` is a named constant. Good.

**What is false:** the **persisted system of record has no currency field
anywhere.** Verified against the three collections:

| Record | Collection | `currency` field? |
|---|---|---|
| `LedgerEntry` | `bank_ledger` | ❌ — `kind, fromAccount, toAccount, amount, memo, category, actor, locality, txId, at, realAt` |
| `AccountBalance` | `bank_accounts` | ❌ — `accountId, owner, bank, bankPath, corpoKey, isPrimary, isActive, balance` |
| `SupplyAggregate` | `bank_supply` | ❌ — `minted, drained`, and it is a **single global row** read via `find({})` |
| `Coin` | (Stuff) | ❌ — `denomination` only, and it **defaults to `DEFAULT_CURRENCY`** |

> ⭐⭐⭐ **The currency tag is dropped at the moment money becomes
> durable.** `Money` knows what it is; the ledger row it produces does
> not. The typing was shipped on the one layer that doesn't persist.

That last row is the tell, and it is worth reading twice:

```ts
/** The coin's denomination (its identity / kind). v1: `'credit'`. */
public denomination: string = DEFAULT_CURRENCY;
```

A **currency** is being assigned to a **denomination** field. It compiles,
and it is correct today, purely because both happen to be the string
`"credit"`. That is the overload this slate's naming decision removes.

**Consequence for scope:** items 2–4 in the table below are a genuine
schema migration on live collections, not a catalog edit. The
generalization is still worth doing and still small in absolute terms —
but it should be planned as *"add a currency dimension to three persisted
records"*, which is the thing the original framing said was unnecessary.

---

# What is actually left

| | Change | Size | Note |
|---|---|---|---|
| 1 | **Currency-intrinsic constants become data** — `Coinage.DENOMINATIONS` / `BASE_DENOMINATION` move onto a per-currency record | small | today they are `static` on a class shared by every currency |
| 2 | ⚠⚠ **Conservation becomes per-issuer** — `bank_supply` goes from one row to one row *per currency* | **the one real invariant change** | |
| 3 | **`LedgerEntry` and `AccountBalance` gain a currency** | medium | schema migration on live rows; see the backfill note |
| 4 | **An issuer identity** — mint authority becomes a role, not a singleton | medium | `reserve mint` is already `requiresGovernor`; that check generalizes to "the governor *of this issuer*" |
| 5 | **Acceptance** — who takes what: a field on the offer | small | |
| 6 | **Coin presentation derives from `(currency, faceValue)`** | small | also closes the shipped gap where all denominations look identical |
| 7 | ⛔ **Exchange** | **do not build — see below** | |

## ⚠⚠ On (2), the invariant that must not be got wrong

Today: *"total money supply = `Σ(mint) − Σ(drain)` over the central-bank
log,"* enforced by `postTransaction` — **the only code path that writes a
`LedgerEntry` or mutates an `AccountBalance`**, validated per leg by
`BankTransaction`.

With N issuers that becomes **N conservation domains**, and the rule that
keeps it structural rather than checked:

> ⭐⭐⭐ **A ledger leg may never cross currencies.** `from` and `to` are
> denominated the same, always. There is no leg kind that converts.

That single constraint is what makes *"no FX"* an **enforced invariant**
rather than a policy someone later relaxes — and it keeps conservation
exactly as structural as it is today, just once per currency.

⚠ **Getting this wrong produces an invisible mint**, which is the one bug
class an economy cannot recover from.

The chokepoint discipline is the asset here: because `postTransaction` is
the sole writer, per-currency conservation is enforced in *one function*,
not audited across a codebase.

---

# ⚠⚠ Three concrete hazards the survey found

## 1. The glob-merge mint

`Coin` declares `globIdentityFields = ['denomination']` — two coin stacks
merge iff the denomination string matches. With one currency that is
correct. With two issuers who both name a coin `crown`:

> **Two different currencies' coins merge into one stack.** Money is
> created by a merge, silently, with no ledger row and no error.

The fix is the naming decision, applied structurally: **glob identity must
be `(currency, faceValue)`**. Not a rule someone remembers — a key.

## 2. The `?? 1` fallback silently destroys value

Both face-value lookups fall back to `1` on an unknown denomination:

```ts
// Money.faceValueOf
return COIN_FACE_VALUES[denomination] ?? 1;
// Coinage.faceValueOf
return Coinage.byKey().get(denomination)?.value ?? 1;
```

The comment calls this deliberate — *"a coin always has a well-defined
value for reconciliation."* But it means:

> ⚠⚠ **Rename the denomination table without migrating live coins, and
> every existing 25-value coin becomes worth 1.** 96% of the cash in the
> world, gone. No throw, no log, and the conservation audit *passes*
> because the bottom-up term recomputes from the same broken lookup.

`perCoinMass` has the same fallback shape (unknown → the base
denomination's mass), so the coins get lighter too — the one observable
symptom, and nobody is watching a gram.

**This is a deploy-gated change.** The seeder is **INSERT-ONLY**, so
editing `Coin.yaml` does nothing to rows that already exist — and the
live box holds real coins and real ledger rows. Any denomination re-key needs a migration
that runs *before* the new table is live, or the fallback needs to become
a throw for the duration.

⭐ **Recommendation: make the unknown-denomination fallback a throw**, and
keep it one. A coin whose denomination isn't in the table is a corrupt
object; valuing it at 1 is a guess that launders the corruption into the
supply. The reconciliation argument the comment makes is real but is
better served by failing loudly.

## 3. Denominations are invisible

Because `issueCash` never restamps presentation, the 1/5/25 spread is
**felt** (through mass, via `LoadBearing`, which is the whole anti-mass
thesis) but never **seen**: every coin reads "a credit coin", every coin
answers to `credit`, and you cannot `drop sovereign`. Item 6 above closes
this, and it lands for free once presentation derives from
`(currency, faceValue)`.

---

# ⭐⭐⭐ Do not build exchange. Currencies are goods.

Coins are already `Stuff` with mass, tradeable through the market like
anything else. So:

> **There is no exchange subsystem. You buy one currency's coins with
> another's in the market that already exists, and the rate is whatever
> people pay.**

- **no oracle, no peg, no FX engine, no new machinery**
- ⭐ **currency crises become EMERGENT rather than simulated** — a scrip
  nobody wants trades at a discount because nobody bids. That is not
  modelled; it is just true
- it keeps the door shut on the thing that would otherwise eat six months

⚠ **The pressure to relent will arrive as *"what's the rate?"*** The
answer is **look at the market**. Write that down now, because it will be
asked by someone reasonable.

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
| **A declared rate** — a peg, a config value, a governed rate, an oracle | ⛔ **Refuse.** This is the part that becomes a subsystem. The changer posts *its own* bid and ask like any merchant prices any good; there is no global rate, and nothing reads one. |
| **The `convert` verb** | ⚠ **Probably unnecessary.** If the changer is a merchant, you `buy` and `sell` at it with the shipped retail verbs. A dedicated verb is what makes exchange feel like a system rather than a shop. |
| **A currency-crossing leg rejected at `postTransaction`** | ✅ **Keep, permanently.** The tail frames this as an inert seam Half B later fills. **It should never be filled** — the never-cross-currencies rule is the invariant, not a placeholder. |

> ⭐⭐ **The changer survives; the rate does not.** A person who will
> trade you zorkmids for scrip at a price they choose is content. A
> number the world agrees on is an FX engine wearing a hat.

⚠ **Action:** the tail's Half B should be amended to match, and its
"inert `convert` seam" reframed from *deferred* to *closed*. Left
unamended, the two documents will disagree again the moment somebody
builds from the tail without reading this.

---

# ⭐⭐ Reserve status is FUNCTIONAL, never decreed

Do not legislate that the zorkmid is the reserve currency.

> **Make Compact obligations payable ONLY in zorkmids** — fees, the
> allowance, cross-locality settlement — **and it becomes the reserve by
> construction.**

That is the actual mechanism behind the dollar (you need it for taxes and
for oil), it is more interesting than a rule, and it makes a local
currency's weakness **structural rather than asserted**: you can pay your
neighbours in scrip, but you cannot pay the Compact in it.

⭐ It also means the reserve property survives a hostile polity. A rule
can be repealed; a payment requirement is what the Compact *is owed*.

⚠ **This is the reconciliation of "the CB currency is special" with the
acceptance test.** The zorkmid *is* special — but its specialness lives
in **what the Compact will accept**, which is policy data, not in a
branch anywhere in the banking substrate.

---

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
| ⚠ **the temptation to build FX** | see above; the never-cross-currencies leg rule is the structural defence |
| ⚠ **per-currency conservation is subtle** | an invisible mint is unrecoverable |
| ⚠⚠ **the rename is a live-data migration** | the `?? 1` fallback turns a missed migration into silent value destruction that the audit does not catch |
| **a second currency nobody uses is dead weight** | which is why the recommendation is to ship **zero** second currencies |

---

# The acceptance test

> ⭐⭐ **The zorkmid is currency #1, and nothing in the code knows it is
> special.**

If any path special-cases it, the generalization did not land — and you
will discover that only when somebody issues #2, which is the worst
possible time.

**Two known violations to clear**, both trivial and both worth naming so
they aren't missed:

- `Money.render()` hardcodes the unit string: `` `${minor} ${unit}` ``
  with `unit = "credit" | "credits"`. Must read the currency record.
- `Coin.denomination` defaults to `DEFAULT_CURRENCY` — a currency in a
  denomination field.

# Scope recommendation

**Ship the issuer generalization with exactly one currency, nobody
empowered to mint a second, and no exchange.** The capability sits inert
and provably correct — the same shape as `grants[]` and `allowance`
shipping inert in property 0a, a pattern this codebase already trusts.

⭐ **The generalization is the deliverable. A second currency is not.**

⚠ **Except the rename, which is not inert.** Renaming `credit` → `zorkmid`
touches live coins and live prose on the deployed box, so it carries a
deploy gate the rest of this work does not. Sequence it deliberately:
either first (small, standalone, migrate once) or last (bundled with the
schema migration items 2–4 so there is one migration, not two). ⭐ *Leans
last* — one migration window, one backfill script, one rehearsal.

# ⚠ Credit — WANTED, deferred, not rejected

`banking.md` lists *"Lending / fractional reserve / interest / bank
failure + deposit insurance"* among its non-goals. **That reads as
rejected. It is not.**

> **User (2026-08-04): "we definitely want credit, I just need to
> understand the entire economy before we can figure out how it works,
> and that depends on most of the rest of the systems being built out
> first."**

⭐ Worth recording because the absence has consequences somebody will
otherwise mistake for design:

> **No credit means no INVESTMENT.** You cannot borrow to start a
> business, so capital formation is savings-only — and combined with
> *capital gets voice but no equity*, there is presently **no mechanism
> by which money finds a venture.**

And it forecloses a whole limb of law that several appendix candidates
want: **debt · bankruptcy · usury · mortgages · bonds · foreclosure ·
credit rating.** ⚠ Notably **bankruptcy**, which
[rerecord-appendix-plan](../../manifesto/rerecord-appendix-plan.md) names
as the humane answer to the 13th-amendment module — **unbuildable until
debt exists.**

**The blocker is deliberate and correct:** credit prices risk, and you
cannot price risk in an economy whose sinks and flows are not yet built
([content-packs-slate](./content-packs-slate.md) § *seed the economy
backwards*). ⭐ **Sequence it after the trades close their loops**, not
before.

## ⭐⭐ This section is the third argument for the rename

The two decisions were reached independently and land on the same point:

> **The word `credit` is spoken for.** This slate's own deferred-but-
> wanted subsystem is *credit* — lending, interest, creditworthiness,
> insolvency — and every ledger leg already speaks of crediting and
> debiting an account. Naming the currency `credit` was squatting on the
> vocabulary of the build directly below it on the roadmap.

⚠ Which sharpens the sequencing: **the rename should land before credit
is designed, not after.** Renaming a currency out from under a live
lending subsystem is strictly worse than doing it now, while the only
holders of the word are a coin table and a render string.

---

# Open questions

1. ~~**Per-currency balances on one account, or an account per
   currency?**~~ **CLOSED — account-per-currency.** Both slates reached
   the same answer independently
   ([tail](../tails/multi-currency-slate.md) § *The one decision Half A
   must make first*), and the survey confirms why: `AccountBalance` has a
   single scalar `balance` behind a warmed sync cache keyed by
   `accountId`. Account-per-currency leaves both untouched; a
   multi-currency wallet rewrites the cache's value shape and every read
   site with it.
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
6. **NEW — does the unknown-denomination fallback become a throw?**
   *Leans yes* (hazard 2 above). It is a one-line change with a real
   behavioural consequence during migration, so it wants a decision
   rather than a drive-by.
7. **NEW — do the existing `sovereign` / `crown` keys survive at all?**
   With structural denominations they have no reason to exist. *Leans
   retire them* — they are unreferenced by content, unseen by players,
   and keeping them preserves the exact overload the naming decision was
   meant to remove.
