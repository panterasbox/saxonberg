# Money-integrity slate — follow the money, end to end

**Captured 2026-08-04**, out of the currency build's requirements phase.

> **User: "we really need to be sure that only the CB can create value
> either through banking or money. that means things that persist value
> and restore it later need to be locked down too. I know some of this
> stuff can't prevent bad faith actors but we gotta do the best we can
> the economy is really sensitive. 'follow the money' isn't just a cliche
> here we need to thread through the entire economy and make sure money
> doesn't leak in or out anywhere."**

> **Status: findings + audit surface. Not requirements.** Three findings
> are **confirmed against the code**; the rest of the surface is
> enumerated but **unswept**. The instrument fix and the two gates ride
> the [currency build](../../requirements/currency-requirements.md); the
> full sweep is its own cycle.

Related: [banking.md](../../subsystems/banking.md) (the conservation
chokepoint), [persistence.md](../../subsystems/persistence.md) (the
self-persistence spine), [glob.md](../../subsystems/glob.md) (fungible
stacks), [sandbox.md](../../subsystems/sandbox.md) (scope taint),
[call-security.md](../../subsystems/call-security.md) (the gating
discipline this slate says to apply), [currency-slate](./currency-slate.md).

---

# ⭐⭐⭐ The governing distinction: there are TWO conservation domains, and only one is sealed

This is the finding everything else hangs off.

| Domain | What conserves it | Sealed? |
|---|---|---|
| **The ledger** — account balances | `postTransaction`, the single writer, validated per leg by `BankTransaction` | ✅ **Yes.** Genuinely excellent: one function, structural validation, `mint`/`drain` the only supply-changing kinds. |
| **Cash** — `Coin` instances in the world | …nothing equivalent | ⛔ **No.** A `Coin` is ordinary `Stuff`. Anything that can make, mutate, duplicate, or restore Stuff can make, mutate, duplicate, or restore **money**. |

> ⭐⭐⭐ **`banking.md` describes cash as "the bearer money form — off the
> governed account ledger." That is a true statement about the fiction
> and an unclosed hole in the engine.** The ledger's discipline was never
> extended to the object that represents the same value.

⚠ The two halves are joined by `issueCash` / `deposit` / `withdraw` (the
supply-neutral cash bridge), so **a leak on the cash side is a leak in
total supply**, not a cosmetic one.

---

# ⚠⚠ Confirmed findings (verified against the code)

## 1. `setQuantity` is ungated — the direct mint

`Coin` composes `GlobbableMixin`. `GlobbableMixin.setQuantity(n)` carries
**no `@CallSecurity`, no `@Final`, no `@Unshadowable`** — only a
positive-integer check:

```ts
public setQuantity(n: number): void {
  if (!Number.isInteger(n) || n < 1) throw new Error(…);
  this.quantity = MqlSubscriptionApi.fireFieldChange(this, 'quantity', …);
}
```

Any code holding a coin reference can call `setQuantity(1_000_000)` and
**mint money with zero ledger involvement.**

⚠ Today's callers are all legitimate (`GlobbableLogic` split/merge,
`BankingLogic.issueCash`, `CraftingLogic` consumption). **That is
convention holding the line, not enforcement.** Compare `Stuff.destroy()`
— `ApiOnly` + `@Final` + `@Unshadowable`. The discipline exists; it was
never pointed at the money.

## 2. `reconcile()` cannot see snapshotted coin

`reconcileImpl` walks `StuffApi.findAllByTemplatePath(COIN_PATH)`, which
reads the **in-memory `byTemplatePath` index** — live instances only.

> ⚠⚠ **Coins that exist only inside a `holder_snapshots` blob are
> invisible to the conservation audit** — which is precisely the
> persist-and-restore surface the user flagged. The audit has a blind
> spot exactly where value durably lives.

## 3. `reconcile()` skips vault cash

```ts
if (container && MixinApi.isBank(container)) continue; // vault cash
```

Deliberate (vault float is not "circulating"), but it means `balanced`
is not a total-value identity — it is a *circulating*-value identity, and
**a leak into a vault is invisible to it.**

## ⚠⚠ Why 2 + 3 matter more than they look

`balanced === (supply === accountTotal + circulatingCoin)` is **the**
follow-the-money instrument — the operator's one honest read. With two
structural blind spots, it is not trustworthy enough to audit *against*.

> ⭐ **Fix the instrument before running the audit.** An audit conducted
> with a leaky gauge is theater.

⚠ It also lands on the currency build directly: that build's migration
rehearsal uses `reserve supply → balanced: true` as a **verification
gate**, so the gate inherits the blind spots. Hence the instrument fix
rides that build (below), not this cycle.

---

# ⭐⭐ The reframe: the threat is an unreviewed call site, not an attacker

The user's framing was *"some of this can't prevent bad faith actors."*
True, and mostly beside the point:

> ⭐⭐ **Almost every finding here is a way for HONEST code to mint money.**
> An ungated `setQuantity` means a future contributor's perfectly
> well-meant feature inflates the supply and **nobody notices**, because
> the instrument that would catch it has a hole.

That threat model is **fully addressable** with the gating discipline the
codebase already applies everywhere else — and it is the realistic one
for a platform whose whole thesis is that the community writes content.

⚠ The bad-faith case is a *second* problem (wizard code-trust,
[access.md](../../subsystems/access.md)) and is already handled by a
different axis. Don't conflate them; the honest-bug case is both likelier
and cheaper to close.

---

# The audit surface — what "follow the money" actually has to sweep

⚠ **This list is enumerated, not swept.** Findings 1–3 came from about
fifteen minutes on four surfaces; that hit rate is itself a finding.
Each row below is a *question to answer*, not a known defect.

## A. Creating a coin

| Surface | The question |
|---|---|
| `StuffApi.clone('/obj/Coin')` | Wizard/code-trust gated — but is cloning a *money* template a distinct act from cloning a chair? Should the money template be uncloneable except through `issueCash`? |
| The `clone` verb's `--into` / quantity opts | Can an author clone a coin stack with an arbitrary quantity? |
| **Crafting yields** | Can a `Recipe`'s `outputTemplate` be `/obj/Coin`? Recipes are data in the `recipes` collection. If yes, **a recipe is a mint.** |
| **Content packs** | `PackApi` reconcile installs authored templates. Can a pack ship a coin-yielding recipe or a pre-stocked container? |
| **The CMS** | It edits `domain` template rows. Can it set `/obj/Coin`'s `data.quantity`? (⚠ the currency build already has to migrate that row — see its §8.) |
| Salvage / disassembly | Does any teardown path yield fungible stacks that could be pointed at coin? |

## B. Mutating quantity

| Surface | The question |
|---|---|
| `setQuantity` | **Finding 1.** Gate it. |
| `GlobbableApi.applyQuantity` | The verb workhorse — does every path through it conserve? |
| `split` / `merge` | `GlobbableLogic` looks correct (split subtracts, merge sums). **Prove it with a property test**, not a reading. |
| Shadows / adornments | `canMergeWith` refuses shadowed stacks — is that a conservation guard or incidental? |

## C. Persist and restore — ⭐ the user's specific concern

| Surface | The question |
|---|---|
| `capture` → `materialize` | **Is materialize idempotent?** Can one record restore twice — two logins, a crash mid-restore, a re-register — and yield two sets of coins? |
| The `(scope, key)` multi-instance records | Can two live instances materialize from one record? |
| `restoreFromTemplate` (CMS/pack go-live) | Re-hydrating a live clone from an edited template — does it re-seed contents? |
| Hot reload | Does a reload re-run anything that seeds goods? |
| The skipped-goods flush (`PersistableLogic`) | Goods a host skipped mid-capture are flushed elsewhere — can a good be captured **twice**, by the skipper and the flusher? |

## D. The sandbox boundary

⭐ The ledger half is **already right** and worth crediting: circle-scope
money never touches `bank_ledger`; in-circle balances live in a per-scope
in-memory overlay, replayed leg-by-leg, cleared at reap.

> ⚠ **The open question is the cash half.** Balances are scoped. `Coin`
> is `Stuff`, and Stuff crosses the Layer-4 boundary via the wire-body /
> wardrobe door. **Can a coin minted or multiplied inside a circle walk
> out?** If yes, the overlay's discipline is bypassed by the bearer form
> — the same ledger-vs-cash asymmetry as finding 1, at a different seam.

## E. Destroying value (the other direction)

Leaks **out** matter too — money destroyed without a `drain` makes the
supply figure wrong in the deflationary direction and breaks reconcile
just as thoroughly.

| Surface | The question |
|---|---|
| `StuffApi.destruct` on a coin | Does anything drain the supply when cash is destroyed? |
| Residency self-eviction | Can a cold coin stack be evicted and lost? ⚠ `canEvict` veto — does `Coin` use it? |
| Room / container destruction | Contents cascade — where does the cash go? |
| A corpse / dropped stack decaying | Sanitation's `collect`-never-`destroy` rule ([sanitation-slate](./sanitation-slate.md)) is the right instinct; is it enforced for cash? |

---

# ⭐ What the currency build already fixes (do not re-scope here)

Folded into [currency-requirements.md](../../requirements/currency-requirements.md)
because those paths are being rewritten anyway:

1. **Gate `setQuantity`** on the money-bearing path (finding 1).
2. **Complete the instrument** — `reconcile` counts snapshotted coin and
   accounts for vault cash explicitly (findings 2 + 3), per-currency.
3. **`Coin` glob identity gains the currency** — two issuers' like-valued
   coins can no longer merge into one stack (an invisible mint by merge).
4. **The unknown-denomination `?? 1` fallback becomes a throw** — a coin
   whose denomination doesn't resolve can no longer be silently valued.

⚠ **Everything else in § *The audit surface* is this slate's cycle.**

---

# Scope recommendation

**A separate build cycle, after the currency build.** Not folded in:
mixing a 174-call-site refactor with a security sweep makes both
unreviewable, and you lose the ability to tell which pass introduced
what.

Shape it as **three passes**:

1. **The census** — enumerate every path in § *The audit surface* and
   answer each question yes/no against the code. Produces a defect list,
   changes nothing. ⭐ Cheap, and it is what turns this slate from a
   hypothesis into a work list.
2. **The gates** — apply the call-security discipline to every
   value-bearing mutation the census flags. Mostly decorators.
3. **The property tests** — the durable defence: conservation as an
   invariant test over the *object* layer, the way `assertConserving`
   already covers the ledger layer.

⭐⭐ **Pass 3 is the actual deliverable.** Gates decay; a contributor
adds a call site and a decorator elsewhere doesn't know. A property test
that says *"no operation changes total value except mint and drain"*
catches the next hole too, including the ones this slate failed to
imagine.

# Open questions

1. **Should `/obj/Coin` be uncloneable except through `issueCash`?** It
   would close most of § A at one stroke. ⚠ Cost: content authors lose a
   legitimate "put some coins in this chest" move — which probably *should*
   route through a seeded float anyway.
2. **Is there a "value-bearing" marker worth having?** A mixin or template
   flag that says *this object represents conserved value*, which the gates
   and the property test key on — rather than hardcoding `/obj/Coin`.
   ⭐ It generalizes to scrip, to bearer credentials, and to anything else
   that later carries value. ⚠ Risks being a new taxonomy; check it
   against the fixed Module Categories before adopting.
3. **Does the supply figure need to count vault cash?** I.e. should there
   be *two* reads — circulating vs. total-in-existence — rather than one
   `balanced` that quietly means "circulating"?
4. **What is the response when reconcile goes unbalanced?** Today it is a
   number an operator reads. Should it alarm? Halt minting? ⚠ It cannot
   halt *transacting* — that would take the economy down over a reporting
   bug.
5. **Does any of this need to survive a hostile wizard?** Or is
   code-trust ([access.md](../../subsystems/access.md)) the honest
   boundary, with this slate defending only against *mistakes*? ⭐ Leaning
   the latter — and saying so out loud is better than implying a
   guarantee the architecture cannot make.
