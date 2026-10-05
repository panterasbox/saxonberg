# Instance addressing — two questions, one index

> **Status: UNBUILT** — and the headline is a live defect, not a design
> gap. The registry index keys on `identity ?? template`
> (`api/stuff.ts:230`), and ⛔⛔ **the one invariant against two live
> instances clobbering one record is inert wherever an identity is
> minted**, because its scan needle is the host's own identity. ⭐ The
> index is NOT the defect — a reader asking a question the index cannot
> answer is not the same as an index that answers two (§ 1).
> `findAllByTemplatePath('/platform/agent/PrimaryAvatar')` returns
> **nothing**, and `assertUniqueKey` — the one invariant stopping two live
> instances from clobbering one record — is **vacuous for every stamped
> keyed host**, because its scan needle is the host's own identity.
> **Left:** ⛔⛔ the SCAN's needle — `assertUniqueKey` and `liveKeyed` key
> on the ROW, not on the host's own identity (⭐ **no index split**; the
> keying is correct and the requirements record why) · an honest
> *every instance of this row* read, plus `findByIdentityPath` for the
> bare bucket · ⭐⭐⭐ the name-durability rule (*an identity exists **iff
> THE NAME** is durable — re-derivable from inputs that outlive the
> instance, or recorded somewhere that does; ⚠ **not** iff the instance
> persists, which would wrongly condemn a circulation node*; `stuffId`
> is the ephemeral unique id and already ships) · ⭐⭐ the census question
> — every mint site names what keys on its identity, and the mint's own
> uniqueness probe does not count · one sanctioned read for a keyed
> instance's durable handle (`<row>#<key>`, already computed by
> `placeIdOf`) · validate `asIdentityPath` for the continuity case
> (**thirteen** production sites in **five** shapes, no check) ·
> normalize the market stall's key to its pitch · the `pinOf`/`capture`
> scope divergence
> **Size:** a build

**Captured 2026-10-04**, in the location-graph plan's grounding, when
answering *"what durable handle does this place have"* needed a four-rung
ladder — and the ladder turned out to be a symptom of the index.

---

## Provenance — three corrections, each of which killed a worse answer

> **1.** *"you're mixing up two different patterns. avatar mints an
> identity path because it needs to preserve the same identity across
> three different templates. warrens mint an identity path because it
> already is a common template and it needs individuation. **they are not
> the same thing**"*

> **2.** *"why are the keys absolute paths? that doesnt make sense to me
> because they're all relative to the managing warren… **the identity path
> wants something relative otherwise template path is lost and the
> template path is what you need to search for the object**. its how you
> find its hydration content and its backing class and everything else
> important about it. **everything the warren adds is decorative**"*

> **3.** *"giving everything a unique id path even if its not durable is
> stupid. **that's what stuffid is for.** a non-durable unique id for an
> instance… if the person can't target by stuffid already, then what they
> probably want is **a list of objects that match a template that they can
> choose from**. so I dont want the design trying to be more clever and
> work around any of that"*

⚠ **What the first framing of this slate got wrong, recorded so it is not
repeated.** It read the identity slot and the persistence key as *two
durable handles in conflict, to be reconciled* — and proposed deriving the
identity from `(scope, key)`. That is wrong three ways, and the third is
the one that matters:

1. **It is circular.** The persistence record's `scope` **is**
   `getIdentityPath()` (`PersistableLogic.ts:903, 944, 1187`), so deriving
   the identity from the scope makes the scope a function of itself.
2. ⛔ **It already shipped and was reverted.** `smallholding.md`: *"`PlatWarren`
   minted each room at a `<lotExtent>/<leaf>` path … which made the room's
   `templatePath` resolve to **no row at all**. A rowless path cannot be
   edited by an author, cannot resolve a zone from its ancestry, and cannot
   be hydrated from content… **The channel is deleted.**"*
3. ⭐⭐ **It was answering the wrong question.** There is no conflict to
   reconcile. *Who is this* and *which one of these* are two questions, and
   the only thing wrong is that some readers ask the first when they mean
   the second — and that the index cannot tell them apart.

---

## 1. ⛔⛔ The defect — one bucket, two questions

```ts
// api/stuff.ts:230
const key = Stuff._identityStampOf(obj) ?? obj.getTemplatePath();
```
> *"Deliberately the raw slot, never the overridable method — a sandbox
> vessel projects another identity and must not index there."*

and

```ts
// api/stuff.ts:1456
public static findAllByTemplatePath<T>(path: string): T[] {
  return this.#indexes.byTemplatePath.exact(path) as T[];
}
```

**A stamped instance is filed under its identity and not under its row.**
Three consequences, all live:

- ⛔ **You cannot enumerate clones of a row whose instances are stamped.**
  `findAllByTemplatePath('/platform/agent/PrimaryAvatar')` is empty. The
  only way to find every avatar is to already know every identity.
- ⛔⛔ **`assertUniqueKey` is vacuous exactly where identity is minted.**
  Its scan is `findAllByTemplatePath(scope)` with `scope =
  getIdentityPath()`. For an *unstamped* warren room the scope is the row,
  the bucket holds every room of that row, and the check works. For a
  *stamped* host the scope IS its own identity, so the bucket holds only
  itself — which the scan skips. **The market stall counter is both
  stamped and keyed, so the invariant protecting it from clobbering its
  own record has never been able to fire.** It works where identity is
  absent and is inert where it is present, which is backwards.
- **`liveKeyed` fails the same way and in the same direction** — it reports
  *"not standing up"* and a caller mints a duplicate.

> ⭐⭐ **The fix is one index per question**: the template index keyed on
> the **row**, so clone enumeration works; identity lookup as its own
> read. Nothing about identity changes — the index stops conflating them.

---

## 2. ⭐⭐⭐ An identity path exists IFF it is durable

> **`stuffId` is the non-durable unique id, and it already ships** —
> *"a fresh `uuid()` per construction, not persisted"*.

So:

| the instance | what addresses it |
|---|---|
| durable, one subject across several templates | ⭐ a **declared identity** (continuity) |
| durable, one row with many instances | ⭐ the **row + its durable key** (individuation) |
| **ephemeral** | ⛔ **no identity at all** — `stuffId`, and the template |

⭐ **This deletes the "ephemeral individuation" category an earlier pass
invented.** Ephemera do not get a weaker identity; they get *none*. Which
means the lounge-style procedural Warren — *"runtime clones, gone on
restart, recreated on the next first-landing"*, no stamp — was **already
right and needs no change.**

### ⭐⭐ And the player-facing consequence is the design, not a fallback

> *"if the person can't target by stuffid already, then what they probably
> want is a list of objects that match a template that they can choose
> from."*

**Ambiguity resolves to a list you pick from** — which already ships as
the disambiguation path. ⛔ **The design may not get clever here.** No
per-instance addressing scheme invented so that every clone can be named;
no synthesized path so a selector can be exact. If two things match, the
player chooses. That is the whole answer and it is already built.

---

## 3. ⭐⭐ Substance and decoration — why the handle is `<row>#<key>`

The template path is the **substance** of a keyed instance's identity: it
is how you find the row, the backing class, and the hydration content.
What the warren contributes is **decoration** — it says *which one*, and
nothing about *what it is*.

> ⭐ So a `/` join is wrong because it pretends the decoration is a path
> segment and **loses the row**. A separator that is not a path separator
> keeps substance and decoration separable.

Which is `` `${scope}#${key}` `` — **already implemented**, guarded on
`isPersistenceKeyExplicit()`, with its own recorded reason:

```ts
// PersistableLogic.ts:973 — placeIdOf
// Only an EXPLICIT key qualifies … A keyless host's stashed key is
// scope-DERIVED, so folding it in would give one room two different
// identities either side of its first capture.
return key ? `${scope}#${key}` : scope;
```

⭐ And `Exit`'s discovery key already uses the same joiner
(`<source>#exit:<dir>`). **The durable per-instance handle exists. It is
not called identity, and now there is a principled reason it should not
be.** What is missing is that it has no sanctioned name, so consumers
reach for identity instead.

### ⚠ And the keys ARE relative — the absoluteness is inherited

`HoldingWarren.roomKeyOf(leaf)` is `` `${holdingKey()}/${leaf}` `` where
`holdingKey()` is **the warren's own persistence key**. So the relative
part is `<leaf>`; it reads as absolute only because the manager's own key
is a parcel extent.

The prefix is doing one job: uniqueness is enforced within the **row**,
not within the warren, so a key must disambiguate across every warren that
shares that row. That is a consequence of the index, not a choice about
keys — ⭐ which is another reason § 1 is the real build.

---

## 4. ⛔ The census — six continuity shapes, and nothing validates any of them

`asIdentityPath` is typed `string`. There is no assertion, no prefix
check, no scheme. Every non-test caller, verified 2026-10-04:

| site | shape |
|---|---|
| `EmbodyController.ts:724` | `/platform/agent/Avatar/<playerId>` — ⭐ the FAMILY's namespace, deliberately not the class's |
| `ConditionLogic.ts:681` | `/platform/agent/ShadeAvatar/<playerId>` |
| `ConditionLogic.ts:622` | `<corpse>/<the deceased's identity, slash-stripped>/<gameSecond>[/ordinal]` — ⚠ an identity nested inside an identity |
| `Login.ts:309` | a random guest path |
| `PartyLogic.ts:226, :358` | `rec.path` · `/platform/idea/party/<uuid>` |
| `StallController.ts:119, :141` | `${STALL_SEED}/<leaf>` · `${STALL_BUSINESS_SEED}/<leaf>` |

⭐ **Only continuity needs a declaration**, because its whole job is a
string the template cannot derive. Individuation derives from the row plus
the key and needs no stamp at all. So the validation surface is small: a
continuity identity mints into a **declared namespace its family owns** —
which `TemplatePathPrefixes.avatar` already half-is.

---

## 5. ⚠ The data conflict — and the stall is the one that breaks the rule

Three key shapes ship. The rule they should follow: **a key is relative to
whatever manages the instance.**

| site | key | verdict |
|---|---|---|
| `HoldingWarren` · `MineWarren` · `DormWarren` · `ShoreController` | `<manager's own key>/<leaf or cell>` | ⭐ follows the rule |
| `Plant.ts:239` · `NameController.ts:118` | a bare `uuid()` | honest — no manager to be relative to |
| ⚠ `StallController.ts:120` | `renterKey`, an **Avatar identity path** | ⛔ breaks it — the counter's key says *who rents it*, not *which stall it is* |

⭐ The stall is also the only site writing its discriminator **twice** —
`leaf` is derived from `renterKey`, so the stamp and the key encode one
fact in two places. One normalization fixes both.

---

## 6. ⚠⚠ What the gap has already cost — three consumers

> The rule this project already applies: **promote at the third
> consumer.**

1. ⛔ **A shared bank account** — something keyed a *person* on lineage, so
   every player collapsed into one account.
   [antipatterns.md § Keying a PERSON on `getTemplatePath()`](../../antipatterns.md).
2. ⛔ **The exit discovery key** — `Exit.getDiscoveryKey()` reads
   `source.getTemplatePath()` unconditionally, so a secret door found in
   one dorm room reads as found in **every** room of that row for that
   viewer. ⚠ Wider than the dorm: mine workings and stall counters share
   rows too. Traced, never run — and the two prior instances of this class
   were *"found by driving the world, not by the suite."*
3. ⭐ **The location graph's node key** — the third, and the one that
   produced this slate.

⭐ Plus one found by reading on the way past, unrelated to any of them:
**`ChattelLogic.pinOf` uses `getTemplatePath()` as the residency pin's
scope while `capture` uses `getIdentityPath()`.** For an identity-stamped
host those differ, so the pin's roll looks for a record written under
another scope — a pinned pet stood up nowhere.

---

## 6a. ⭐ The corpse, reconciled with the carcass chain (2026-10-04)

Checked against `reqs/second-tier`'s W0 by that build's own session, and
the two findings agree.

**Nothing reads a corpse's minted identity, and the leg that was open is
now closed.** `Corpse extends Creature {}`; neither composes
`PersistableMixin`, so a corpse is a runtime clone gone on restart.
Nothing in `Corpse.ts` or `lib/mortality/` reads its identity;
`mortality.md:508` — *"`reembody` never reads the corpse"*; the ledgers
key on the **dead thing's** identity, not the corpse's
(`AccountabilityApi.record`, `recordDeathDeed`, pinned in
`ConditionLogic.die.test.ts`). ⭐ **And `belief` — the one plausible
reader nobody had audited — is clear:** `RecognitionLogic`'s three
referent sites all key on `getIdentityPath()`, but the naming path is
gated on `isPersona`, which is composed on `Character` and **not** on
`Creature`; and every production caller of `recognizes` / `learnIdentity`
passes a person. So the only reader is `corpseIdentityFor`'s own ordinal
probe, which exists *because* it minted.

⚠⚠ **And the carcass chain multiplies the mint about fiftyfold with no
new reader.** That build makes *every non-player death* mint a corpse,
and everything it stamps is read off the live **object** —
`getConditionAtDeath()`, mass, `bornAt`, merged keywords, per-instance
contamination — never off the name.

⭐ **One of the identity's own stated jobs moved out from under it,
independently.** The carcass chain unions the dead thing's keywords onto
the corpse (`[body, corpse, carcass] ∪ its own`), so `butcher ewe` and
`look clerk` both find the body. **Telling two bodies apart in a room is
now a PRESENTATION path** — which `corpseIdentityFor`'s docstring claims
as a reason for the identity.

⭐ **The `Mobile` nuance, kept because it stops the next grep going
wrong.** The arrival/departure walk could in principle hand a corpse to
`recognizes()`, which would read its identity and get nothing back. **A
read that can only ever answer false is not a reader in the sense that
matters** — nothing durable keys on it.

⚠ **And `corpseIdentityFor` is byte-identical to its pre-W0 form** on
`reqs/second-tier` (confirmed by that build: zero
`findAllByTemplatePath` lines added or removed in `ConditionLogic.ts`
across the branch), so moving the ordinal probes to
`findByIdentityPath` races nothing.

### ⭐⭐ The rule's own near-miss, kept beside it

An earlier wording of § 2's rule said *an identity exists iff it is
durable*, and that sentence would have **condemned the circulation
node** — which is correct and must keep its stamp. The node is ephemeral
as an object (minted on demand, reaped when empty) and **durably named**
(`<parcel extent>/<plan node id>`, both inputs outliving the instance),
and a parked character's snapshot records it as their container, so
another record points at it across a restart.

> ⭐⭐⭐ **It is the NAME that must be durable, not the instance.** That a
> plausible earlier phrasing got a shipped, correct case wrong is the
> strongest argument for the rule as it now stands — and the reason the
> wrong version is recorded here rather than quietly replaced.

### ⚠ The counter-argument, recorded so "no reader" is not read as "delete it"

From the carcass-chain build, and the framing is the valuable part:

> *A corpse is the one object in the game that is **nobody's and
> everybody's business** — forensic, butcherable, lootable, decaying — so
> if a later build wants "whose body is this, and who moved it", the
> identity is the hook that would carry it. **That is a reason to keep
> the mint, not a reader**, and I would not confuse the two.*

⭐ This slate's rule asks a mint to name **what keys on its identity**. *A
named future consumer* is a weaker answer than a present one, but it is
an honest one — and it belongs to the build that owns the corpse's
lifecycle, not to this one. **Recorded, not decided.**

## 7. Open questions

1. ⭐⭐ **Does splitting the index change `findByTemplatePath`'s
   throw-on-multi contract?** Today *"expected singleton, found N"* is a
   real guardrail. Keyed on the row, an avatar row would have many
   instances legitimately, so every singleton read of a stamped row path
   becomes a throw unless the identity lookup is a distinct call.
   **This is the build's shape decision.**
2. **What is the sanctioned name for the durable per-instance handle?**
   `placeIdOf` is private to the persistence logic and named for places,
   but goods, plants and animals want it too.
3. ⚠ **Does anything depend on the index's current conflation?** ~200
   `getIdentityPath()` readers exist; the ones that matter are the
   `findByTemplatePath(<stored key>)` round-trips, which work *because*
   stamped instances are filed under their identity. Splitting the index
   must keep that resolve working — probably by making it an identity
   lookup explicitly.
4. **Where does the continuity namespace declaration live?** A constant
   per family is the existing shape; the minting site is often a
   controller rather than the class.
5. **Does the corpse's nested identity survive?** It embeds the deceased's
   identity to individuate a corpse — the one place a scheme nests.
6. **Is validation a throw at the mint, or a lint, or both?** *Lean: both
   — the lint censuses the call sites, the mint asserts the declared
   shape.*

---

## 8. Cross-references

- [holding.md § Identity](../../subsystems/holding.md) — the shipped D17
  invariant: lineage always resolves to a row, identity is a stamped slot
- [smallholding.md](../../subsystems/smallholding.md) — ⛔ the reverted
  synthesized-path channel, and why `(scope, key)` replaced it
- [persistence.md](../../subsystems/persistence.md) — `(scope, key)`,
  `assertUniqueKey`, and `scope = getIdentityPath()`
- [antipatterns.md](../../antipatterns.md) — the first consumer's bill
- [location-graph-slate](./location-graph-slate.md) § 5, § 16 · and
  [location-graph-plan](../../plans/location-graph-plan.md) — ⭐ whose W1
  ladder this slate deletes
- [location.md](../../subsystems/location.md) — the Warren's *"no
  synthetic per-instance paths"*, which § 2 confirms was right
- [call-security.md](../../subsystems/call-security.md) — *"a policy that
  trusts an object's identity path must read the raw stamp … never the
  overridable method"*, the same distinction § 1 is about
