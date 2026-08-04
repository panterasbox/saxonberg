# Currency slate — generalizing the issuer, and shipping it with one currency

**Captured 2026-08-04.** A deliberate reversal of a recorded decision:

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

Related: [banking.md](../../subsystems/banking.md) (**the shipped
substrate — `Money`, `Coinage`, the conservation chokepoint; read it
first**), [balance-slate](./balance-slate.md) (the ledgers-are-currencies
framing, and why the legislature's job is monetary policy),
[corpos-slate](./corpos-slate.md) (the scrip use case),
[retail-slate](./retail-slate.md) (acceptance, and the market that
replaces FX), [economy-slate](./economy-slate.md),
[content-packs-slate](./content-packs-slate.md) (trades as the demand
side).

---

# ⭐⭐⭐ The finding: the expensive part is already paid for

The instinct going in was *"do the typing now, before the economy is big
— retrofitting a currency tag onto live money is brutal."* **Unnecessary.
v1 already did it:**

> **banking.md:** *"`Money` is the amount value-object: integer **minor
> units** + a **currency tag** (v1: one currency, `credit`)… how many
> minor units a denomination is worth is intrinsic to the **currency**
> (`Money.faceValueOf`)."*

And `Coinage` follows the same discipline — **per-coin mass is
currency-intrinsic** (`Coinage.perCoinMass`), derived from denomination,
"robust across clone/split/merge."

> ⭐⭐ **Money was never a bare number. v1 shipped the typing with a
> catalog of one.** So this is a **catalog problem, not a refactor** —
> which is the entire reason the reversal is affordable.

---

# What is actually left

| | Change | Size |
|---|---|---|
| 1 | **Currency-intrinsic constants become data** — `faceValueOf` / `perCoinMass` read a currency record rather than hardcoding `credit` | small |
| 2 | ⚠⚠ **Conservation becomes per-issuer** | **the one real invariant change** |
| 3 | **Accounts carry balances per currency** — or an account per currency, whichever is cheaper | medium |
| 4 | **An issuer identity** — `bank_supply` + mint authority become a role, not a singleton | medium |
| 5 | **Acceptance** — who takes what: a field on the offer | small |
| 6 | ⛔ **Exchange** | **do not build — see below** |

## ⚠⚠ On (2), the invariant that must not be got wrong

Today: *"total money supply = `Σ(mint) − Σ(drain)` over the central-bank
log,"* enforced by `postTransaction` — a module-private free function,
**the only code path that writes a `LedgerEntry` or mutates an
`AccountBalance`**, validated per leg by `BankTransaction`.

With N issuers that becomes **N conservation domains**, and the rule that
keeps it structural rather than checked:

> ⭐⭐⭐ **A ledger leg may never cross currencies.** `from` and `to` are
> denominated the same, always. There is no leg kind that converts.

That single constraint is what makes *"no FX"* an **enforced invariant**
rather than a policy someone later relaxes — and it keeps conservation
exactly as structural as it is today, just once per currency.

⚠ **Getting this wrong produces an invisible mint**, which is the one bug
class an economy cannot recover from.

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

---

# ⭐⭐ Reserve status is FUNCTIONAL, never decreed

Do not legislate that Compact credit is the reserve currency.

> **Make Compact obligations payable ONLY in Compact credit** — fees, the
> allowance, cross-locality settlement — **and it becomes the reserve by
> construction.**

That is the actual mechanism behind the dollar (you need it for taxes and
for oil), it is more interesting than a rule, and it makes a local
currency's weakness **structural rather than asserted**: you can pay your
neighbours in scrip, but you cannot pay the Compact in it.

⭐ It also means the reserve property survives a hostile polity. A rule
can be repealed; a payment requirement is what the Compact *is owed*.

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

---

# ⚠ Risks worth watching

| | |
|---|---|
| **two prices for everything is bad text UX** | mitigated by **narrow acceptance** — almost everywhere takes credit only, and scrip is the exception you *notice* |
| ⚠ **the temptation to build FX** | see above; the never-cross-currencies leg rule is the structural defence |
| ⚠ **per-currency conservation is subtle** | an invisible mint is unrecoverable |
| **a second currency nobody uses is dead weight** | which is why the recommendation is to ship **zero** second currencies |

---

# The acceptance test

> ⭐⭐ **Compact credit is currency #1, and nothing in the code knows it
> is special.**

If any path special-cases it, the generalization did not land — and you
will discover that only when somebody issues #2, which is the worst
possible time.

# Scope recommendation

**Ship the issuer generalization with exactly one currency, nobody
empowered to mint a second, and no exchange.** The capability sits inert
and provably correct — the same shape as `grants[]` and `allowance`
shipping inert in property 0a, a pattern this codebase already trusts.

⭐ **The generalization is the deliverable. A second currency is not.**

# Open questions

1. **Per-currency balances on one account, or an account per currency?**
   *Leans account-per-currency* — it keeps every existing balance
   invariant untouched and makes "does this account hold scrip?" a
   presence check rather than a lookup.
2. **Who may authorize an issuer?** It is a mint, so by
   [balance-slate](./balance-slate.md) it is squarely a **reserved
   matter** — Compact-level, not a locality's own call. ⚠ Which is
   interesting: *a locality may run its own currency only with the
   Compact's leave*, which is realistic and worth being deliberate about
   rather than defaulting into.
3. **Does acceptance default to "credit only" or "anything"?** *Leans
   credit-only* — an opt-in list, so nobody accidentally accepts scrip.
4. **Do wages paid in scrip require consent at hiring?** The truck system
   was abolished by statute in reality; leaving that fight *available* to
   the polity is probably better content than pre-deciding it.
5. **Is there a floor on issuer obligations** — must an issuer redeem?
   A currency nobody must honour is a pure confidence game, which may be
   exactly the point, or may be a griefing surface.
