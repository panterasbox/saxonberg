# Identity schemes — completing D17, and the two patterns it never named

> **Status: UNBUILT** — D17 shipped the **mechanism** (a hard-private
> `#identityPath` slot, `asIdentityPath` at the clone, the registry
> indexing on `identity ?? template`, `asTemplatePath` retired) and
> enforced it with `lint:census` → [holding.md § Identity](../../subsystems/holding.md).
> ⛔ **It never named the SCHEMES.** `asIdentityPath` accepts any string,
> six shipped minting sites invent six shapes, and `getIdentityPath()`
> silently returns the **template path** when nothing was stamped — which
> is the collision, not a fallback.
> **Left:** ⭐⭐ the two schemes named and declared (**continuity** vs
> **individuation**) · validation at the mint instead of a free string ·
> individuating warrens stamping what they already compute · the
> `(scope, key)` duplication reconciled against the identity (⭐ the key
> means *individuation* in a warren and *a relationship* at the stall) ·
> whether `getIdentityPath()`'s default-to-template survives · the census
> lint
> **Size:** a build

**Captured 2026-10-04**, in the location-graph plan's grounding, when the
plan needed a four-rung ladder to answer *"what durable handle does this
place have"* and the ladder turned out to be a symptom.

**Provenance — the correction that produced the slate:**

> **User:** *"you're mixing up two different patterns. avatar mints an
> identity path because it needs to preserve the same identity across
> three different templates. warrens mint an identity path because it
> already is a common template and it needs individuation. **they are not
> the same thing**"*

> **User:** *"we shouldn't let just any object set its identity path to
> whatever it wants. that needs to happen within some kind of schema or
> something so template path is preserved as part of the identifying
> string"*

> **User, on scope:** *"my answer is do the one that's best. I dont care
> about cost I care about **being design complete and not leaving a bunch
> of loose ends I'll never come back to**"*

⚠ **The first correction matters because it kills the obvious wrong
answer.** A single rule — *the template path must prefix the identity* —
breaks the Avatar, whose whole job is outliving its template. There is no
one schema. There are two, and they point opposite ways.

---

## 1. ⭐⭐⭐ The two schemes

| | **continuity** | **individuation** |
|---|---|---|
| the question | *one subject, several costumes* | *one row, several instances* |
| direction | many templates → **one** identity | one template → **many** identities |
| the template is | ⭐ **deliberately absent** — it is the thing being outlived | ⭐ **required as the prefix** — it is what the siblings share |
| the discriminator is | the subject (`<playerId>`) | the instance (a slot, a coordinate, a renter) |
| exemplar | `/platform/agent/Avatar/<playerId>`, worn by `PrimaryAvatar`, `ShadeAvatar` and the sandbox vessel | `${STALL_SEED}/<leaf>` — the market stall |
| what breaks without it | a shade's deeds attribute to a different person | two instances of one row share one record |

> ⭐⭐ **Both are already in the tree. Neither is declared.** The Avatar
> family's namespace is a constant (`TemplatePathPrefixes.avatar`); the
> stall's shape is computed inline in a controller. Nothing validates
> either, and nothing says which pattern a given call site is using.

---

## 2. What D17 shipped, and the one line that hides the gap

`holding.md § Identity` states the shipped invariant:

> - **`templatePath`** is a clone's LINEAGE and it always names a real
>   content row.
> - **`identityPath`** is an instance's minted identity — a hard-private
>   stamped slot, read through `getIdentityPath()`, **defaulting to the
>   template path when unstamped.**
> - The `byTemplatePath` registry indexes on **identity ?? template**, so
>   every existing lookup is byte-identical…

⭐ **That default was chosen for a good reason** — it made the D17 reform
a no-op for every existing reader. And it is exactly what makes the
individuation gap invisible: ask an unstamped warren room who it is and
it answers with its **row**, confidently, forty times over.

⚠ So this slate is not a correction of D17. It is the half D17 deferred:
the mechanism shipped, the schemes did not.

---

## 3. ⛔ The census — six minting sites, six improvised shapes

Every non-test caller of `asIdentityPath`, verified 2026-10-04:

| site | shape | scheme |
|---|---|---|
| `EmbodyController.ts:724` | `/platform/agent/Avatar/<playerId>` | continuity |
| `ConditionLogic.ts:681` | `/platform/agent/ShadeAvatar/<playerId>` | continuity |
| `ConditionLogic.ts:622` | `<mortalityCorpse>/<the deceased's identity, leading slash stripped>/<gameSecond>[/ordinal]` | ⭐ **both** — it individuates a corpse *by embedding another identity* |
| `Login.ts:309` | a random guest path | individuation (of a throwaway) |
| `PartyLogic.ts:226, :358` | `rec.path` · `/platform/idea/party/<uuid>` | individuation |
| `StallController.ts:119, :141` | `${STALL_SEED}/<leaf>` · `${STALL_BUSINESS_SEED}/<leaf>` | ⭐ **individuation, done right** |

⛔ **And nothing validates any of it.** `StuffApi.clone`'s
`asIdentityPath` is a `string`; there is no assertion, no prefix check,
no scheme. The seventh caller will invent a seventh shape.

### The other half of the census — individuation with NO stamp

These individuate correctly and never touch the identity slot, because
`restoreOrSeed` carries it in a **persistence key** instead:

| site | key |
|---|---|
| `HoldingWarren.ts:351` | `<holdingExtent>/<leaf>` |
| `MineWarren.ts:332` | the coordinate, via `memberKeyOf(cell)` |
| `DormWarren.ts:184` | the programme's slot |
| `ShoreController.ts:134` | the working's cell |

⭐ `MineWarren.ts:329` says the whole thing in one line: *"**The
coordinate IS the identity**: the persistence key, the survey address and
the MQL atom are one fact with three faces."* Three faces — and the face
that would make it an identity is the one nobody stamps.

---

## 4. ⭐⭐⭐ The stall already got it right — and still carries two handles

`StallController.identitiesOf` is the rule, implemented:

```ts
const leaf = renterKey.split('/').filter(Boolean).pop() ?? renterKey;
return { counter: `${STALL_SEED}/${leaf}`, house: `${STALL_BUSINESS_SEED}/${leaf}` };
```

Row path plus a discriminator. Then, two lines apart:

```ts
counter = await StuffApi.clone<Stock>(STALL_SEED, undefined, { asIdentityPath: ids.counter });
const restored = await PersistableApi.restoreOrSeed(counter, renterKey);
```

**One instance, two durable handles, stamped and keyed in adjacent
lines** — and its persistence scope *is* the minted identity
(`hasRecord(ids.counter, renterKey)`), with the key holding the
**renter**.

> ⭐⭐⭐ **So the inconsistency is not "warrens are an exception." Both
> halves are shipped and they put individuation at different levels.**
>
> | | identity slot | scope | key |
> |---|---|---|---|
> | **the stall** | `<row>/<leaf>` | the identity | the **renter** — a relationship |
> | **a warren room** | *unstamped* → the row | the row | `<extent>/<leaf>` — **individuation** |
>
> Same job, scope shifted by one level, and `key` means a different kind
> of thing in each. **That is the design question this slate exists to
> close**, and no consumer build can close it.

⚠ Why `Business.getAccountPath()` is the tell: its comment reads *"a
minted business — a player's rented stall, cloned from one seed with
`asIdentityPath` — carries its own, so two players' stalls never share an
account (**the shared-account regression, the other way round**)."* The
author knew the hazard and fixed it *at one call site*.

---

## 5. ⚠⚠ What the gap has already cost — and the third consumer is here

> **The rule this project already applies: promote at the third
> consumer.**

1. ⛔ **A shared bank account.** Something keyed a *person* on lineage,
   so every player collapsed into one account.
   [antipatterns.md § Keying a PERSON on `getTemplatePath()`](../../antipatterns.md)
   is the entry it left, and `getIdentityPath()` was the answer — *for
   people*.
2. ⛔ **The exit discovery key.** `Exit.getDiscoveryKey()` reads
   `source.getTemplatePath()` unconditionally, so finding a secret door
   in one dorm room reads as found in **every** room of that template for
   that viewer. ⚠ And the colliding set is wider than the dorm: mine
   workings and market-stall counters share rows too. Traced, never run —
   and the two prior instances of this class were *"found by driving the
   world, not by the suite."*
3. ⭐ **The location graph's node key** — the third, and the one that
   produced this slate. Its plan needed a four-rung ladder (*minted stamp
   ?? persistence key ?? singleton template path ?? null*) to answer a
   question that should have one answer. Two of those rungs exist only to
   bridge this inconsistency.

---

## 6. The sketch — to be argued with, not implemented

- **A scheme is DECLARED by the minting class, and the mint validates
  against it.** Not a free string. The two forms:
  - **individuation** → `<the row's path>/<discriminator>`. The template
    is preserved because the template is what the siblings share. The
    user's rule, and already the stall's.
  - **continuity** → a declared namespace the family owns, with no
    template in it, because outliving the template is the point.
- ⭐ **An individuating warren stamps what it already computes.** It has
  the discriminator (a slot, a coordinate); it just never puts it in the
  slot. The lounge-style procedural Warren stamps **nothing**, correctly —
  its rooms are not durable, and *"gone on restart, recreated on the next
  first-landing"* is the honest answer.
- **Reconcile `(scope, key)` against the identity.** If the identity
  individuates, the warren's key is redundant; if the key individuates,
  the stall's identity is. One of the two is the canonical home and the
  other is a relationship. ⚠ This is the load-bearing decision and it
  reaches into the persistence spine.
- **Then `getDiscoveryKey()`, the graph's node key, and every
  `getIdentityPath()` reader get ONE answer** with no ladder.
- ⚠ **The failure mode to write down in advance:** a scheme registry
  that grows into a second type system. One mechanism, one job — the
  declaration says *which of two shapes*, and nothing more.

### ⚠ The cost, stated plainly

`restoreOrSeed` uses `getIdentityPath()` as the persistence **scope**.
Stamping a warren room's identity changes that scope from the row to
`<row>/<key>`, which **orphans every `holder_snapshots` record** for
every dorm room, mine working and keyed stall. Per the standing rule
there is no migration: the database drops and the packs reinstall.
Accepted by the user in advance (*"I dont care about cost"*), recorded
here so the build does not rediscover it at the drive.

---

## 7. Open questions

1. ⭐⭐⭐ **Is `key` individuation, or a relationship?** The stall says
   relationship (the renter) with individuation in the identity; the
   warren says individuation with the scope left at the row. Both ship.
   **Deciding this decides the whole build**, and it is the one question
   that cannot be deferred to a consumer.
2. ⭐⭐ **Does `getIdentityPath()`'s default-to-template survive?** Keeping
   it keeps the collision reachable by anyone who forgets. Removing it
   makes the return type nullable and sweeps every reader — grants, group
   membership, chattel stamps, snapshot owners, the domicile stamp,
   belief viewer keys, chronicle owners, transcripts. *Lean: keep the
   method and its default (it answers "who do I act as", which always has
   an answer), and add the honest-null read beside it.*
3. **Is validation a throw at the mint, or a lint?** A throw changes
   runtime behaviour for a path that currently never fails; a lint
   catches authoring and not a runtime mint. *Lean: both — the lint
   censuses the call sites, the mint asserts the declared shape.*
4. **Where does a scheme declaration live?** A static on the minting
   class is the project's idiom (`_mixinName`, `collectionName`), but the
   minting site is often a controller rather than the class.
5. **Does the corpse's double scheme stay?** It individuates by embedding
   another identity, which is the only place a scheme nests. Honest, or
   two schemes wearing one string?
6. ⚠ **Does anything read a warren room's `getIdentityPath()` today and
   rely on getting the ROW?** The sweep must find out before stamping;
   a reader that wants the row should be asking `getTemplatePath()`.

---

## 8. Cross-references

- [holding.md § Identity](../../subsystems/holding.md) — the shipped D17
  invariant, and the default-to-template line this slate reopens
- [persistence.md](../../subsystems/persistence.md) — the self-persistence
  spine, `(scope, key)`, and the D17 slot read at the registry
- [antipatterns.md § Keying a PERSON on `getTemplatePath()`](../../antipatterns.md)
  — the first consumer's bill
- [location-graph-slate](./location-graph-slate.md) § 5, § 16 — the four
  keys, and the discovery defect
- [location-graph-plan](../../plans/location-graph-plan.md) — the
  four-rung ladder this slate exists to delete; ⭐ its W1 shrinks to *read
  the identity* once this lands
- [location.md](../../subsystems/location.md) — the Warren's deliberate
  *"no synthetic per-instance paths"*, which is correct for the
  procedural case and is what the durable case needs reversing
- [belief.md](../../subsystems/belief.md) · [banking.md](../../subsystems/banking.md)
  — two readers whose own docs cite D17 and would be swept by open
  question 2
