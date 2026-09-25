# Money-integrity slate — follow the money, end to end

> **Status: PARTIAL** — findings 1 and 2 shipped with the currency build
> (2026-08-05): the `Coin.setQuantity` gate and the complete
> `fullReconcile` (snapshot coin, non-resident only; vault float reported
> not counted) → [banking.md](../../subsystems/banking.md). Finding 3 was
> withdrawn as a non-bug.
> **Left:** ⭐ the **write-off doctrine** (2026-09-24 — ground coin is
> ephemeral BY DESIGN; the boot `fullReconcile` + the typed shrinkage
> drain, write-offs automatic / write-UPS never, fail-closed, the
> two-tier attributed-vs-residual posting, the single `Coin.onDestruct`
> chokepoint, shrinkage in the reset keep set) · pass 1 the census over
> surfaces A–E (create · mutate · persist/restore · sandbox cash
> crossing · destroy) — **§ C and § E are partly answered, see below** ·
> pass 2 the gates · pass 3 the object-layer conservation property test —
> the actual deliverable · ⭐ the **surplus side** (the restore latch —
> nothing guards a HOST from two restores the way `assertUniqueKey`
> guards a RECORD from two hosts — ⭐ it protects an Api CONTRACT from
> pack authors rather than plugging a live leak; `standUpKeyed` and hot
> reload both traced SAFE 2026-09-24; the duplicate-RECORD vector, which
> mints on every restore forever) · ⚠⚠ **the GO-LIVE DRAIN** (a CMS save
> or pack reconcile on the Coin row re-hydrates every live stack to
> `quantity: 1` — the run-once guard covers instruction fields, not
> persistent ones) · the `/stuff/thing/Coin` uncloneable question · the
> value-bearing marker question · whether this needs to survive a
> hostile wizard or only a mistake
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

*The lesson (a term that looks like a missing reservoir may be a duplicate
of one already counted — ask what already represents it before adding it to
a conservation identity; the snapshot term is the same hazard) is housed at
`banking.md § Open-choice decisions log` #12 and `§ Reporting consumers`
(`fullReconcile`'s two subtleties).*

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

### What the 2026-09-24 pass already answered

⭐ **The host layer is genuinely guarded; the CONTENTS layer is not.**

`PersistableLogic.assertUniqueKey` scans every live instance at the
scope and throws when a second one claims the same `(scope, key)`. It is
**precise rather than eager** — it fires only when another live host has
actually *claimed* the key (freshly-cloned unkeyed siblings own no record
and do not collide) — and the two-rooms-one-keyed-host race was already
found and fixed (`cloneHost` resolves first, last-to-materialize wins,
the stale record heals on its next capture). **Two hosts cannot share one
record.** That direction is closed.

⚠ **The other direction is not, and `Avatar.restore` says so in its own
doc comment:**

> v1: developer/admin operation … intended for a **fresh** instance (the
> normal login path materializes via `postRegister`; **re-running
> `restore()` on a live avatar that already holds inventory would
> re-clone the captured items on top**).

`materializeImpl` checks opt-out, resolves the key, asserts host
uniqueness, finds the record and restores. **There is no "have I already
restored" check anywhere in it.**

> ⭐⭐ **`assertUniqueKey` guards the RECORD from two hosts. Nothing
> guards the HOST from two restores.** One direction is enforced; its
> twin is not.

And the consequences are asymmetric in the worst way:

| collision | what happens |
|---|---|
| two hosts, one record | **throws**, with a three-line explanation |
| one host, two restores | ⛔ **succeeds silently** — and now there is more money |

### The census rows this opens

The mechanism is verified; the callers are not. Paths that could reach a
**populated** host:

| path | the question |
|---|---|
| `Avatar.restore()` | Public and documented as admin-only. Is it reachable by a verb? ⭐ See open question 6. |
| ~~`postRegister` under **hot reload**~~ | ✅ **TRACED 2026-09-24 — SAFE.** `clone` is the only HMR-aware site; `reload` never touches a live instance. See below. |
| ~~`standUpKeyed` → `restoreOrSeed`~~ | ✅ **TRACED 2026-09-24 — SAFE, and they are not one path.** See below. |
| `restoreOrSeed` | ⚠ A **separate** public Api, called from five capability packs. Every caller passes a fresh clone today; the precondition is enforced nowhere. See below. |
| `restoreFromTemplate` (CMS / pack go-live) | ⚠⚠ **TRACED — the CONTENTS are guarded (run-once appliers) but the FIELDS are not.** Not a mint: a silent DRAIN. See § *Go-live pushes persistent fields*. |

### ✅ Traced 2026-09-24 — `standUpKeyed` is safe by construction

⚠ **Correction.** An earlier revision of this section said
*"`standUpKeyed` → `restoreOrSeed` … the double-restore by the ORDINARY
path."* **That is wrong twice over**: the two do not call each other, and
`standUpKeyed` cannot double-restore. Corrected here rather than cut, so
the mistake does not get re-derived.

`PersistableApi.standUpKeyed` resolves to `cloneHost`:

```ts
const live = liveKeyed(scope, key);
if (live) return live;                  // ⭐ returns early — NO materialize
const nested = await StuffApi.clone<Stuff>(scope);
if (nested && MixinApi.isPersistable(nested)) {
  nested.setPersistenceKey(key);
  await materializeImpl(nested, key);   // only ever on a FRESH clone
}
```

⭐ **`materializeImpl` is unreachable on a populated host from here.** A
live instance holding the key is returned untouched; the keyless branch
routes through `StuffApi.singleton` for the same reason, with the code's
own comment saying *"neither can mint a second."* All three call sites —
`ResidencyLogic`'s pin roll, `Estate.restoreSlice` (×2) and the
`RestoreContext` slice hook — go through this one function.

⭐ The resolve-first was added to fix an `assertUniqueKey` abort, not a
duplication bug. **It closed this vector as a side effect**, which is
worth noting: the guard that made the system *correct* also made it
*conserving*.

### ⚠ `restoreOrSeed` is the separate path, and its consumers are PACKS

Not called by `standUpKeyed`. Called directly, and **not from the
kernel** — which is why a server-only search finds nothing:

| pack | site |
|---|---|
| `trade-mining` | `MineWarren._carveOne`, `ShoreController` |
| `residence` | `PlatWarren`, `HoldingWarren`, `BuildingWarren` |
| `eternal-university` | `DormWarren.standUpHolding` |
| `terminus` | `StallController` |

**Every one passes a freshly cloned host** (`StuffApi.clone(...)` or
`createMemberSerialized()` immediately before the call), so today the
usage is correct everywhere. ⚠ But the *"host must be fresh"*
precondition is **enforced nowhere**, and this is a **public Api method
capability-pack authors call.** A pack author who passes a live room
mints money and gets no error.

> ⭐⭐ That reframes the restore latch: it is **protecting an Api
> contract from pack authors**, not plugging a live leak.

### ⭐⭐ What this narrows the vulnerable set to

The ordinary play path has **two** resolve-first layers —
`OuterWarren.admit` checks its cache before standing anything up, and
`cloneHost` checks for a live keyed instance. If both miss (a warren's
in-memory cache gone cold while a holding is still live),
`assertUniqueKey` **throws**: two live hosts would claim one key. **Loud,
not silent.**

So duplication requires materialize to run on a host that **already
holds its contents AND already owns the key**. `assertUniqueKey` skips
`host` itself, so it structurally *cannot* catch that — it is looking for
a *different* instance. Exactly three ways in:

1. ✅ **`Avatar.restore()`** — confirmed, by its own comment.
2. ⚠ **A pack calling `restoreOrSeed(liveHost, sameKey)`** — nobody does
   today; nothing stops it.
3. ⚠⚠ **Hot reload re-running `postRegister`** — ⭐ **the only untraced
   row left, and the only one that could still be a live leak.**

### ⚠⚠ And the CAPTURE side is worse than the restore side

Promote § C's last row. *The skipped-goods flush — goods a host skipped
mid-capture are flushed elsewhere; can a good be captured **twice**, by
the skipper and the flusher?*

> **A duplicate RESTORE mints once, when it happens. A duplicate RECORD
> mints on EVERY restore, forever** — and the extra money looks entirely
> legitimate, because it came out of a real snapshot.

That is the failure nobody finds by reading. Only conservation
arithmetic finds it.

---

# ⭐⭐ The surplus side — three layers, and only one of them is a guard

Pairs with § *The write-off doctrine*. That section makes a **shortfall**
honest; this one is about the direction that is **always a bug**.

### 1. Prevent — a restore latch

A per-instance flag set on a successful `materialize`; a second call
**throws**, exactly as `assertUniqueKey` throws. ⭐ It resets naturally,
because the eviction seam destructs the host (capture → destruct →
re-materialize on next reference is a **new instance** each time), so the
latch needs no clearing logic and no lifetime of its own.

⚠ **NOT "clear then restore."** Two reasons, either sufficient: a crash
in the window between clearing and restoring loses everything, and
clearing would clobber items legitimately acquired *after* the snapshot
was taken. **Refusing beats reconciling** — the same call this slate
already made for the host layer.

### 2. ⭐⭐⭐ Detect in test — and this is the real answer

This slate already names its own deliverable: a property test over the
object layer saying **no operation changes total value except `mint` and
`drain`**. A duplicate materialize fails it. So does a duplicate record.
So do the holes neither the latch nor this slate imagined.

> **The latch fixes today's bug; the property test fixes the class.**
> Build both, in that order of *confidence* and the reverse order of
> *effort*.

### 3. Detect in production — the surplus alarm

From § *The write-off doctrine* rule 1, and this is what it exists for: a
surplus **alarms and never auto-corrects.** An audit that balanced itself
here would launder exactly the bug this section is about.

### ⭐ One good thing, and it sharpens the shortfall side too

`PersistableApi.captureAtShutdown` exists — a **graceful** shutdown
captures, so only a genuine crash loses ground coin. That tightens the
write-off doctrine's residual term: the anonymous boot delta is a
**crash-only** event, not a routine one, so **a nonzero residual in
normal operation is immediately a signal rather than noise.** The
two-tier ratio is sharper than it looked.

### ✅ Traced 2026-09-24 — `reload` is safe, and the census is closed

[hot-reload.md](../../subsystems/hot-reload.md) is unambiguous:
**`StuffApi.clone` is the only HMR-aware site.** `reload(path)`
re-imports the module with a cache-busting query and stamps new class
objects under fresh `ModuleId` entries — it changes what **future**
clones resolve to. It does not re-register, re-hydrate or re-materialize
any live instance, so `postRegister` never re-runs on a populated host.

⭐ **All three duplication paths are now accounted for:**
`Avatar.restore()` confirmed · a pack passing a live host hypothetical ·
**hot reload ruled out.**

---

# ⚠⚠ Go-live pushes PERSISTENT fields onto live instances — and `quantity` is one

Found while closing the hot-reload row, and it is the **opposite
direction** from everything above: not a mint, a **silent drain**.

### The duplication half was already closed, and well

`lib/stuff/Staged.ts`, in this slate's own vocabulary:

> ## ⭐ Run ONCE, at birth — props and cast are initial furnishing
>
> Each applier no-ops once its flag is set. **This is load-bearing, not
> hygiene:** `TemplateApi.restoreFromTemplate` — the CMS save go-live and
> the pack reconcile go-live — re-runs the FULL `hydrate`, which
> re-dispatches every instruction applier. Without the guard, editing a
> `props` row and publishing minted a fresh set into every live instance:
> every crate in the world gaining six more grapefruits… **A content edit
> is not a faucet.**

### ⚠ But that guard covers INSTRUCTION fields, not PERSISTENT ones

Same shape as the surplus finding — one direction guarded, its twin not.
The chain, every link verified:

| link | fact |
|---|---|
| `CmsLogic` go-live | `StuffApi.findAllByTemplatePath(path)` → `restoreFromTemplate(instance)` **for every live clone**. `PackLogic` does the same on a pack reconcile. |
| `restoreFromTemplate` | runs the full `hydrate(stuff, tpl.data)` — no per-field opt-out. |
| the Coin row | `generic-objects/content/stuff/thing/Coin.yaml` declares **`data.quantity: 1`**. |
| the gate | `PersistentHydrator` is an **allowed caller** of the gated `Coin.setQuantity` — deliberately. The gate's own comment: *"A `Hydrator` applies a template's … `quantity` through the two-phase `set<Field>` dispatch."* |

> ⛔ **A CMS save or a pack reconcile on the Coin row re-hydrates every
> live coin stack in the world to `quantity: 1`.** A 500-coin stack
> becomes one coin. No ledger post, so supply is unchanged and
> `fullReconcile` reports a shortfall afterwards.

⚠ **The pack path is the likelier one.** A CMS edit of the Coin row
needs somebody to go and do it; a **pack reconcile** needs only
`generic-objects` to ship a changed `Coin.yaml`. Nobody has to do
anything unusual.

### ⭐ The near-miss is instructive

The gate's comment *does* anticipate the adjacent risk — *"a template
authored with `data.quantity: 1000000` would clone into a fortune"* — and
files it here as this cycle's work. **But that is the CLONE direction.**
The **go-live** direction, where stacks that already exist are reset, is
named nowhere. A hazard was seen from one side and the mirror image went
unrecorded, which is worth noting as a review habit, not just a bug.

### What closes it

⚠ Not the restore latch, and not the write-off doctrine either — a drain
with no ledger row is exactly what the doctrine forbids, but **posting it
after the fact does not help anyone whose money vanished.** The shape is:

> **A value-bearing field must not be hydrated by go-live.**

⭐⭐ Which lands on **open question 2 — the value-bearing marker** — and
gives it a second, sharper justification than it had. It is no longer
only *"generalize the gate so scrip inherits it"*; it is **"go-live needs
to know which fields it may not push."** Two consumers for one marker is
what turns it from a tidiness idea into the thing that closes a live
drain.

⚠ Open, and cheap to answer: does the same hazard reach **any other
value-bearing field** hydrated from a template — `denomination`, a
future scrip's face value, a bearer credential's amount? The marker
should be chosen against that list, not against `Coin` alone.

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

### What the 2026-09-24 pass already answered

Read against the code and the subsystem docs; the rest of § E stays
census work.

| Surface | Finding |
|---|---|
| `StuffApi.destruct` on a coin | ⛔ **Nothing drains.** `drainCoins` is internal to `BankingLogic` with a single caller — the cash-bridge deposit. Any other destruct of a coin stack is an **unaudited sink reachable from ordinary object lifecycle.** |
| Room / container destruction | ⭐ **Mostly right, one hole.** `ContainerMixin.cleanupOnDestruct` re-parents every direct content item to the **outer** container when there is one — the spill-up behaviour, already shipped. ⚠ But when the outer is **null** (a host at top-of-containment) and the item is not `HasInteractive`, the policy is **cascade-destruct** — so coin is silently destroyed. Defensible for a sword; an unauthorized sink for money. |
| A corpse decaying | ✅ **Already correct, and argued in the same terms.** [mortality.md](../../subsystems/mortality.md): at `spent` the corpse *"stops vetoing `canEvict` rather than destructing — withdrawing an objection, so goods on it evacuate through shipped container behaviour instead of dying with it."* ⚠ Note this fixes **containment**, not durability: `Corpse extends Creature {}` composes no `PersistableMixin`, so the spilled coin is still RAM-only. |
| Residency self-eviction | Partially answered. `Coin` is `StackableMixin(Thing)` and declares no `canEvict` veto of its own; `Container.canEvict` vetoes while non-empty **and** not a persistence host, so a container holding coin pins itself in memory rather than losing it. ⚠ The location cases are census work. |
| Who runs the audit | ⛔ **`fullReconcile` has exactly ONE caller** — `ReserveController`, the governor-gated `reserve supply` verb. Nothing runs it at boot, on a schedule, or on any trigger. **It is an instrument, not a control.** |

---

# ⭐⭐⭐ The write-off doctrine — conservation means no unauthorized SINK

> **User, 2026-09-24, deciding the fork this slate had left open:** *"I
> don't know why coin on the ground needs to survive a crash at all. it
> seems ephemeral by nature. I just want to make sure the accounting is
> all accurate."*

**Decided: ground coin is ephemeral by design.** Cash is a **bearer
instrument** — being off the governed ledger is its defining property,
which is exactly why `reconcile` needs a separate `circulating` term at
all. Off-ledger bearer money that nobody is holding when the process
dies is gone, in life as in the game. So the invariant is **not** *"no
coin is ever lost."* It is:

> ⭐⭐⭐ **Supply always equals reality. Money never disappears WITHOUT A
> LEDGER ENTRY** — the exact mirror of the faucet rule
> [banking.md](../../subsystems/banking.md) already states
> (*"conservation means no unauthorized faucet, not a fixed supply"*).

⭐ This buys the whole feature set for free: coin on the ground, corpses
spilling their purses, dropped money behaving like dropped money — with
a conservation law that actually holds and **no durable-ground-coin
machinery at all.** A pile of coin does not need a persistence record;
its *disappearance* needs a ledger row.

## The arithmetic of the leak

`fullReconcile`'s identity has four terms. **Three live in Mongo and one
lives in RAM:**

| term | home | survives a crash |
|---|---|---|
| `supply` | `bank_supply` | ✅ |
| `Σ balances` | `bank_accounts` | ✅ |
| `snapshotCoin` | `holder_snapshots` | ✅ |
| `circulating` | **the in-memory index** | ⛔ |

So after a crash, supply overstates the world by exactly the coin that
was live and unsnapshotted — permanently, and today **nothing notices**,
because the only audit caller is a verb a governor has to type.

The fix: **run `fullReconcile` at boot and post the delta as a typed
drain against the cash bridge.** Supply becomes true, the loss is
timestamped on the append-only record, and the number stops lying.

## ⚠⚠ The four rules, three of which prevent a silent bug

### 1. Write-offs are automatic. Write-UPS are never.

| direction | meaning | response |
|---|---|---|
| **shortfall** (supply > reality) | coin vanished | expected physics — **post it** |
| **surplus** (reality > supply) | coin appeared from nowhere | ⛔ **always a bug** — alarm, never post |

⭐⭐ If only one rule survives this section, it is this one. **An
auto-balancing audit is worse than no audit**, because it launders a
duplication bug into legitimacy and leaves the books looking perfect
while the faucet keeps running.

### 2. ⚠⚠ Fail closed — a bad write-off destroys money that exists

A write-off is **irreversible** in an append-only ledger. If the boot
audit runs before `holder_snapshots` is readable, `snapshotCoin` reads
zero and it writes off **every logged-out player's savings** — quietly,
permanently, and with the books agreeing afterwards.

So the audit must **prove it read every term** before it is allowed to
post, and alarm rather than post when it cannot. *"Couldn't complete the
audit"* is a far better outcome than *"completed it wrong."*

### 3. ⭐⭐ Two tiers — and the ratio is the bug detector

Do not let every loss fall into one anonymous boot number:

- **Attributed loss** — posted **at the moment it happens**, with a
  reason and an exact amount (`shrinkage/destruct`,
  `shrinkage/eviction`).
- **Residual loss** — the boot delta. Anonymous, whatever is left.

⭐⭐ The payoff is free instrumentation: **the residual should be near
zero, and if it is not, there is an unposted sink.** That ratio is how a
conservation bug actually gets *found*, rather than discovered as a slow
drift nobody can source. One lumped number says money went missing; two
tiers say **which code path is not posting.**

### 4. ⚠ One chokepoint, or you will double-drain

The natural home for attributed loss is `Coin.onDestruct` — it catches
the cascade-destruct hole and every other destruct path at once. ⚠ But
`drainCoins` **already** destroys coin on the cash-bridge deposit *and*
posts the equal value. A second posting site would drain that path
twice, inventing a leak while closing one.

So: **one posting site**, with the already-accounted path marking the
stack before it destructs. Never two independent sites that have to stay
in agreement — the arrangement that is correct the day it is written and
wrong six months later.

## ⚠ The reset will eat the audit trail

`bank_ledger`, `bank_supply`, `bank_accounts` and `holder_snapshots` are
**all `reset: wipe`**. That is why none of this has bitten yet: the money
system is recreated nightly and any crash leak self-heals by morning.
Two consequences:

1. **Conservation has never been tested over a horizon longer than one
   day**, and the first thing that changes at launch is exactly the thing
   masking this.
2. When money stops being wiped, **shrinkage entries must be in the keep
   set** — otherwise the mechanism destroys its own evidence every night
   at 04:00 and the residual-vs-attributed ratio above is unreadable.

## What this does NOT close

The **surplus** side. `fullReconcile`'s own comment says a snapshot is
*"a copy of state that may also be live"* — it compensates for double-
*counting*, which means **the copy is real**. Nothing found so far
guarantees a holder cannot materialize from a snapshot while the live
instance still exists, which would be an actual mint. The boot audit
would see it as a surplus — which is precisely why rule 1 matters — but
the durable fix is an enforced invariant that **snapshot and live
instance are mutually exclusive**, rather than a convention. This is
§ C's first two rows, and it stays census work.

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

   ⭐⭐ **UPGRADED 2026-09-24 — it now has a SECOND consumer, and that
   one closes a live drain.** Beyond generalizing the `setQuantity`
   gate, **go-live needs to know which fields it may not push**: a CMS
   save or pack reconcile on the Coin row re-hydrates every live stack
   to the template's `quantity: 1` (see § *Go-live pushes persistent
   fields*). Two consumers for one marker is what turns this from a
   tidiness idea into the thing that has to be built.

   Q3 (should the supply figure have two reads — circulating vs.
   total-in-existence) is cut 2026-09-20 — shipped exactly as proposed:
   `reconcile(currency)` is the sync circulating-only read,
   `fullReconcile(currency)` is the async complete identity including
   snapshot coin, with vault float reported but not added (`banking.md`
   § Reporting consumers).
4. ~~**What is the response when reconcile goes unbalanced?**~~ —
   ✅ **ANSWERED 2026-09-24**, see § *The write-off doctrine*. The
   response is **direction-dependent**: a shortfall posts a typed
   shrinkage drain automatically (money vanished, which is what bearer
   cash does); a surplus **alarms and never posts** (money appeared,
   which is always a bug). The original instinct here was right that it
   *cannot halt transacting* — and it does not need to, because a
   shortfall is not an error condition, it is an accounting event.
6. ⭐ **Should `Avatar.restore()` exist as a public operation at all?**
   It is described as v1 developer/admin, it carries a documented
   duplication hazard in its own comment, and the normal login path does
   not use it (`postRegister` materializes). ⚠ **The cheapest close is
   deleting it rather than guarding it** — but check what depends on it
   first; a public method with one documented caller is exactly the
   shape of something load-bearing somewhere unexpected.

5. **Does any of this need to survive a hostile wizard?** Or is
   code-trust ([access.md](../../subsystems/access.md)) the honest
   boundary, with this slate defending only against *mistakes*? ⭐ Leaning
   the latter — and saying so out loud is better than implying a
   guarantee the architecture cannot make.
