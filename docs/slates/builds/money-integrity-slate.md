# Money-integrity slate — follow the money, end to end

> **Status: PARTIAL** — findings 1 and 2 shipped with the currency build
> (2026-08-05): the `Coin.setQuantity` gate and the complete
> `fullReconcile` (snapshot coin, non-resident only; vault float reported
> not counted) → [banking.md](../../subsystems/banking.md). Finding 3 was
> withdrawn as a non-bug.
> **Left:** pass 1 the census over surfaces A–E (create · mutate ·
> persist/restore · sandbox cash crossing · destroy) · pass 2 the gates ·
> pass 3 the object-layer conservation property test — the actual
> deliverable · the `/stuff/thing/Coin` uncloneable question · the
> value-bearing marker question · the unbalanced-reconcile response ·
> whether this needs to survive a hostile wizard or only a mistake
> **Size:** a build

**Captured 2026-08-04**, out of the currency build's requirements phase.

> **User: "we really need to be sure that only the CB can create value
> either through banking or money. that means things that persist value
> and restore it later need to be locked down too. I know some of this
> stuff can't prevent bad faith actors but we gotta do the best we can
> the economy is really sensitive. 'follow the money' isn't just a cliche
> here we need to thread through the entire economy and make sure money
> doesn't leak in or out anywhere."**

Related: [banking.md](../../subsystems/banking.md) (the conservation
chokepoint), [persistence.md](../../subsystems/persistence.md) (the
self-persistence spine), [stacks.md](../../subsystems/stacks.md) (fungible
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

> **Findings 1 and 2 cut 2026-09-20 — SHIPPED · DOCUMENTED.** Finding 1
> (`setQuantity` ungated): `Coin.setQuantity` now carries
> `@CallSecurity(CoinQuantityMutators) @Final @Unshadowable`
> (`platform/thing/Coin.ts`), tested in
> `lib/banking/__tests__/money-integrity.test.ts`. Finding 2
> (`reconcile()` blind to snapshotted coin): `fullReconcile(currency)`
> now counts non-resident snapshot coin — `banking.md` § Reporting
> consumers. Both are also summarized just below under *What the
> currency build already fixes*, which is the section this slate's own
> status block points at.

## ~~3. `reconcile()` skips vault cash~~ — ⛔ **THIS FINDING WAS WRONG**

*Corrected 2026-08-05, by driving the currency build.*

The slate read the vault-cash skip as a blind spot. It is not — it is
**load-bearing accounting.** `seedFloat` mints coin into the till **and
credits the branch's own operating account 1:1 against it**, so vault float
is *already represented on the ledger* by that balance. Counting the coin
as well double-counts it by exactly the float.

The currency build "fixed" the non-bug, and the live audit immediately
reported a bottom-up **exceeding** supply — which is how the error was
caught. Vault float is now *reported* (labelled "backed on-ledger") and
excluded from the identity, which is what the original `continue` was
doing all along.

⭐ **The lesson worth keeping:** a term that looks like a missing reservoir
may be a *duplicate* of one already counted elsewhere. Before adding
anything to a conservation identity, ask what else already represents it.
Finding 2's snapshot term has the same hazard in a different costume — a
snapshot is a **copy** of state that may also be live, so it counts only
for holders that are not currently resident.

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

⚠ **This list is enumerated, not swept.** The findings above came from
about fifteen minutes on four surfaces; that hit rate is itself a finding
— as is the fact that **one of the three was wrong**, and only driving the
code caught it. Each row below is a *question to answer*, not a known
defect, and each deserves the same "what already represents this?" check
that finding 3 failed.

## A. Creating a coin

| Surface | The question |
|---|---|
| `StuffApi.clone('/stuff/thing/Coin')` | Wizard/code-trust gated — but is cloning a *money* template a distinct act from cloning a chair? Should the money template be uncloneable except through `issueCash`? |
| The `clone` verb's `--into` / quantity opts | Can an author clone a coin stack with an arbitrary quantity? |
| **Crafting yields** | Can a `Recipe`'s `outputTemplate` be `/stuff/thing/Coin`? Recipes are data in the `recipes` collection. If yes, **a recipe is a mint.** |
| **Content packs** | `PackApi` reconcile installs authored templates. Can a pack ship a coin-yielding recipe or a pre-stocked container? |
| **The CMS** | It edits `domain` template rows. Can it set `/stuff/thing/Coin`'s `data.quantity`? (⚠ the currency build already has to migrate that row — see its §8.) |
| Salvage / disassembly | Does any teardown path yield fungible stacks that could be pointed at coin? |

## B. Mutating quantity

| Surface | The question |
|---|---|
| `setQuantity` | **Finding 1.** Gate it. |
| `StackableApi.applyQuantity` | The verb workhorse — does every path through it conserve? |
| `split` / `merge` | `StackableLogic` looks correct (split subtracts, merge sums). **Prove it with a property test**, not a reading. |
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

Shipped by the currency build (see [banking.md](../../subsystems/banking.md))
because those paths are being rewritten anyway:

1. **Gate `setQuantity`** on the money-bearing path (finding 1) — landed
   on `Coin`, not on `StackableMixin`: a glob is not necessarily money, and
   gating the mixin gates every pile of ore in the world.
2. **Complete the instrument** — `fullReconcile` counts snapshotted coin
   (finding 2), **scoped to non-resident holders**, and reports vault float
   without adding it (the finding-3 correction).
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

1. **Should `/stuff/thing/Coin` be uncloneable except through `issueCash`?** It
   would close most of § A at one stroke. ⚠ Cost: content authors lose a
   legitimate "put some coins in this chest" move — which probably *should*
   route through a seeded float anyway.
2. **Is there a "value-bearing" marker worth having?** A mixin or template
   flag that says *this object represents conserved value*, which the gates
   and the property test key on — rather than hardcoding `/stuff/thing/Coin`.
   ⭐ It generalizes to scrip, to bearer credentials, and to anything else
   that later carries value. ⚠ Risks being a new taxonomy; check it
   against the fixed Module Categories before adopting.

   Q3 (should the supply figure have two reads — circulating vs.
   total-in-existence) is cut 2026-09-20 — shipped exactly as proposed:
   `reconcile(currency)` is the sync circulating-only read,
   `fullReconcile(currency)` is the async complete identity including
   snapshot coin, with vault float reported but not added (`banking.md`
   § Reporting consumers).
4. **What is the response when reconcile goes unbalanced?** Today it is a
   number an operator reads. Should it alarm? Halt minting? ⚠ It cannot
   halt *transacting* — that would take the economy down over a reporting
   bug.
5. **Does any of this need to survive a hostile wizard?** Or is
   code-trust ([access.md](../../subsystems/access.md)) the honest
   boundary, with this slate defending only against *mistakes*? ⭐ Leaning
   the latter — and saying so out loud is better than implying a
   guarantee the architecture cannot make.
