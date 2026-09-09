# World-scan slate — you may not be handed the world; you may ask it a question

**Captured 2026-09-01** as a performance inventory. **Decided
2026-09-08**: the remedy is not only "make `world:` cheap" — it is a
**prohibition plus a gate**, and it extends to a second surface with the
same shape, Api methods that hand back their whole backing table.

> **Status: design conversation settled. Requirements not written.**
> Every ⭐ decision in Part 3 was taken in the 2026-09-08 conversation,
> not proposed. Call sites re-verified against `master` at
> `ae891fa52` (2026-09-08); line numbers drift — the enclosing
> **function names** are the durable anchors.

**Provenance — two conversations:**

> **2026-09-01 — User: "any inventory on anything that's doing mql
> queries with 'world' … things that do a full scan of every stuff item
> in the game. we have to get rid of that shit or somehow make it
> performant."**
>
> **2026-09-01 (the crux): "even if we index mixin.X, depending on what
> X is the scan could still be really expensive."**
>
> **2026-09-08: "we need to deal with anything that's doing world-based
> MQL queries … we've basically got to prohibit it across the board. And
> let's gate 'world' as a predicate to only things being run by the
> prime-minister or something. it should not be possible for just
> anything to do full table scans against the stuff runtimes."**
>
> **2026-09-08 (the shape of the fix): "I don't want some ever growing
> bag of indices on the stuff table especially ones that only apply to a
> specific slice of the taxonomy. but if like 15 or 17 are all just
> mixin checks, that probably tells us we should be indexing on mixin
> composition. for the specialized check's I'd rather apis keep their own
> indexes and offer their own APIs for operating over those indexes …
> with maybe some optional MQL grammar later on if there are some common
> use cases we want to be queryable."**
>
> **2026-09-08 (the second surface): "any Api class that's returning back
> full copies of it's tables/lists … it shouldn't just expose its
> internal data structures for anyone. same problem, different causes."**

**Sits on:** [mql.md](../../subsystems/mql.md) (the `world` seed + system
mode — **read first**), [antipatterns.md](../../antipatterns.md)
(§ Bespoke Object-Search Algorithms — ⚠ **this build inverts it**),
[lint-family.md](../../lint-family.md) (census-then-ratchet),
[employment.md](../../subsystems/employment.md) (the roster two of the
worst sites should be reading),
[augmentation.md](../../subsystems/augmentation.md) (the active-vs-composed
mixin question), [content-packs.md](../../subsystems/content-packs.md)
(⚠ a pack cannot ship an Api — Part 3 D2).

---

## Part 0 — ⚠⚠ The doctrine reversal

Two facts, held together:

1. ⚠⚠ **`docs/antipatterns.md` currently teaches the defect as the
   fix.** § *Bespoke Object-Search Algorithms* shows a `getAllObjects()`
   attendant loop as BAD and
   `MqlApi.resolveMany('world:[mixin.AttendantMixin]', …)` as INSTEAD —
   **which is the live code in `AttendantLogic.allPoints`, and the same
   scan behind nicer syntax.** `pnpm lint:world-scan` (CI-gating) exists
   to herd code *onto* it. The 2026-09-01 capture read this as settling
   the question ("the goal is **not** get rid of `world:`"); ⭐ the
   2026-09-08 decision is that it does not. The previous sweep moved the
   scan and shipped it as a fix.
2. ⚠ **Every `world:` query is a full O(n) scan, and it is worse than
   O(n).** `resolver.ts` resolves the `world` seed to
   `StuffApi.getAllObjects()` — the entire `#indexes.byId` registry,
   which holds **every template row as well as every instance** (1,820
   content YAML files' worth) — and applies `[mixin.X]` / `[class.X]`
   **after**, per object. The registry keeps `byId` and a
   `byTemplatePath` PathTrie and **nothing else**. ⭐ And
   `MixinApi.queryMixins` is **not memoized** — it re-walks the
   prototype chain on every call — so `world:[mixin.X]` costs
   *registry-size × chain-depth*, not registry-size.

**It has already bitten once.** `Metabolic.ts` carries the post-mortem
at `currentRestQuality`: *"A live drive found the server pinned at a core
with five of five debugger pauses in that chain"* —
`getConditionBand → … → getOccupiedHost → world:[SlottedMixin]`, per
metabolism tick. The fix was a short-circuit on the common case; the scan
is still there, still carrying its own "promote to an inverse index if
profiling demands" note. Profiling demanded, once, and got a bypass.

---

## Part 1 — ⭐⭐ The crux: indexing `mixin.X` is a PARTIAL fix

A by-mixin index turns O(n) into O(matches). **That is a win only when
`matches` is small.** The call sites split exactly on the selectivity of
X, and the split is the whole design:

- **Selective X** (few displays, few banks, ~5 locomotion modes) → an
  index makes the query effectively free. Clean win.
- **Broad X** (`EmployedMixin` = every employed NPC+player;
  `SlottedMixin` = most wearables; `PersistableMixin` = nearly
  everything) → the index hands you a huge set and you still pay
  O(matches). **Indexing does nothing that matters.**

⭐⭐⭐ **And the tell for the broad sites is that they are scanning to
reconstruct a relationship another object already holds.** `flowSplitsFor`
walks *every employed actor in the game* to pay one business's wages —
but the Business already has a roster. That is not a query to make
faster; it is a query to **stop making**, by asking the owner.

So there are **three** remediations, not one — and the gate in D3 is what
keeps the third from quietly becoming the first again.

---

## Part 2 — The inventory, triaged

**16 live call sites**, re-verified 2026-09-08. (A 17th grep hit is the
worked example in `check-world-scan.ts`'s own header comment.) Split by
filter namespace:

- **11 `[mixin.X]`** → the one index (D1).
- **5 `[class.X]`** → the owner's own lookup (D2). ⭐ Every one is
  **catalogue-shaped** — *"give me the roster of X"* — which is the
  `reference Ideas inert at boot` trap showing up a fourth time. Nobody
  warmed a roster, so everybody scanned for one.

⭐⭐ **All 16 already pass `commandGiver: null`.** Zero engine call sites
use `world` with a real viewer, so **gating it (D3) breaks nothing** — it
closes only the player-typed door.

⚠ **And none of the 16 is a boot warm.** *Catalogue-shaped* describes what
they **want** (a roster), not **when they run**. The only two cold sites
are at **shutdown**; everything else is per-command, per-login, per-tick,
per-payment or per-equip. So there is no "warming at boot" case to
carve out and bless — the expensive calls are all in the hot path, which
is why the money paths are step 1 and not the substrate.

### Bucket A — selective population → **the index wins** (~8)

| site | query | rough pop | note |
|---|---|---|---|
| `CommandController.resolveScreen` | `[mixin.DisplayMixin]` | dozens | per-command (Aether display resolve, `house` verbs) — warm, so the win matters |
| `BankingLogic.findBranchOf` | `[mixin.BankMixin]` | handful | find-one-by-`getBank()` key → a bank-key map beats even a mixin index |
| `AttendantLogic.allPoints` | `[mixin.AttendantMixin]` | dozens | registry sweep; ⚠ **the antipatterns doc's own worked example** |
| `EmploymentLogic.allBusinessesImpl` | `[mixin.BusinessMixin]` | dozens | registry sweep — and `findBusiness` does `allBusinesses().find(…)`, so one keyed lookup is a full registry walk |
| `TitleController.books` | `[class.PlatBook]` | handful | per-title command · ⚠ kernel controller naming a **pack** class |
| `OuterWarren.admitFor` | `[class.OuterWarren]` | handful | per-login admit |
| `PressLogic.holdsAnyPublishingPosition` | `[mixin.PublisherMixin]` | few | permission check |
| `LocomotionLogic.allModes` | `[class.LocomotionMode]` | **~5 singletons** | ⭐ immutable; a warmed roster beats an index |

### Bucket B — broad population, keyed subset → **read the owner** (~5)

Expensive *even indexed*: broad mixin, narrow want. **Two are money paths.**

| site | query | wants | should read |
|---|---|---|---|
| ⚠ `EmploymentLogic.flowSplitsForImpl` | `[mixin.EmployedMixin]` (broad) | employees of **one business** with share-of-flow | the **Business roster** — **MONEY PATH** (wage/tip remittance) |
| ⚠ `EmploymentLogic.holdersByPositionImpl` | `[mixin.EmployedMixin]` (broad) | holders of **one org's** positions | the org roster, keyed by position |
| `Slottable.occupiedSlots` | `[mixin.SlottedMixin]` (broad) | who holds **one item** | a **back-reference on the item**; warm (equip/unequip/combat/metabolism) |
| ⚠⚠ `maintains.holdingsUnder` | `[class.HoldingWarren]` | holdings under **one extent** | keyed-on-extent lookup. **An NPC BRAIN → per-tick scan**, the worst frequency profile in the set · ⚠ kernel brain naming a **pack** class |
| `MagicLogic.execMisidentify` | `[mixin.IdentifiableMixin]` (broad) | **one** arbitrary decoy (`others[0]`) | a descriptor/decoy pool, or at minimum **early-exit** — it builds the whole filtered list to take element 0 |

### Bucket C — genuinely wants ALL, cold path → **leave it** (2)

| site | query | why it is fine |
|---|---|---|
| `AppBootstrap.shutdown` + `Persistable.capturesAtShutdown` | `[mixin.PersistableMixin]` (broadest) | wants literally all of them, **once, at shutdown**. O(n) is correct — and it is indexed anyway under D1. |
| `mixin.getAllStackIdentityFields` (doc) / dev `[mixin.StackableMixin]` reload | `[mixin.StackableMixin]` | a dev-triggered "reload every stackable" — rare, wants all |

### Benign frequency (verify before touching)

`Census.takeCensus` (`[mixin.CirculatingMixin]`) is scheduled/periodic;
fine unless the interval is tight, and free under D1 if `Circulating` is
selective.

---

## Part 3 — ⭐ The decisions (2026-09-08)

### D1 — ONE new registry index, and it is mixin composition

`Map<mixinName, Set<Stuff>>` maintained at the existing register/unregister
chokepoint (`StuffApi.#updateIndexes`, beside `byTemplatePath`);
invalidation by construction. The resolver's `world:[mixin.X]` path
consults it and never enumerates.

⭐ **Legitimate because it is an axis of the substrate, not a slice of the
taxonomy.** Every Stuff has a mixin composition; the index describes the
type system, not one subsystem's content. That is the line the user drew,
and it is the test for any future registry index: *does this describe
every object, or does it describe my feature?*

⛔ **No `byClassName` index.** Rejected explicitly — *"I don't want some
ever growing bag of indices on the stuff table especially ones that only
apply to a specific slice of the taxonomy."* The 5 `[class.X]` sites go
to D2.

**Enabling fact:** `hasMixinByLowercaseName` and `matchesClass` are
**pure functions of the constructor** — no instance state. So the index
is exact and memoizable **per class**, not per object. Memoize
`queryMixins` on a `WeakMap<ctor, Set<lowercased name>>`; that is what
makes the index cheap to maintain, and it speeds every `hasMixin` check
in the codebase as a side effect.

### D2 — Specialized slices: the cheapest rung that answers the question

Not a registry axis, not MQL. The owning module holds the lookup and
exposes the **question**, never the table. ⭐ **Take the cheapest rung
that answers it** — the ladder, in order:

**Rung 1 — a template-path glob, if the rows share a prefix.** ⭐⭐
`StuffApi.findByPathGlob` is **already trie-backed**
(`byTemplatePath.glob`) — the registry's one existing index. So a roster
whose rows sit under a common prefix needs **no new substrate at all**:

```
world:[class.LocomotionMode]   →   /platform/idea/LocomotionMode/*
```

All 11 `LocomotionMode` rows live under that prefix, in the platform pack
only. That is the site this slate flags as *"~5 immutable singletons
re-derived by full registry walk on every call"* — fixed today, by a
query rewrite.

⚠ **The other four do not qualify**, and the reason is structural rather
than an oversight: `PlatBook` and `HoldingWarren` rows are declared **per
locality** (`/world/terminus/hinkley-hills/idea/plat-book`,
`/world/eternal/duncan-hall/idea/dorm-programme`,
`/world/terminus/mayfield-row/seznick-house/unit-programme`), so there is
no prefix to glob. Check the rung before assuming the rung below.

**Rung 2 — the owner's keyed map, filled at `postRegister`.** For the
scattered rosters. The framework's existing per-object registration hook
is the push seam; no new mechanism.

- **kernel-owned slice** → the owning `*Api` / `*Logic` (`EmploymentApi`
  grows `businessAt(path)` instead of `allBusinesses().find(…)`).
- **pack-owned slice** → ⚠ **a pack cannot ship an Api or a logic
  singleton** (CLAUDE.md § Module Categories). It ships a **catalogue
  `Idea`** — the shape `LaneCatalogue` (transport) and
  `WatercourseCatalogue` (water) already have. `PlatBook` and
  `HoldingWarren` belong to the `residence` pack, which has no catalogue
  yet; it needs one.

⭐ **One catalogue serves two of the sites.** `OuterWarren` has **no rows
of its own** — `[class.OuterWarren]` is matching `HoldingWarren`
subclasses. So `OuterWarren.admitFor` and `maintains.holdingsUnder` are
hunting **the same three objects** from two different places, and the
residence catalogue answers both.

**Rung 3 — memoize, never warm.** ⭐⭐ The reload answer. A **cache** that
is empty after a hot reload costs a **scan**; a **memo** that is empty
after a hot reload costs one **re-derive**. The whole difference is
whether the re-derive is indexed — so D1 and rung 1 are not an
alternative to solving reload, they are what **makes reload cheap**.
Consistent with the standing rule that `Api.boot()` is an operator act
and catalogues are self-warming.

⭐ **Bonus: this retires the `lint:world-scan` allowlist's fourth entry.**
`WatercourseCatalogue` already *has* an allowlisted `getAllObjects()`
scan — surrendered to precisely because a pack could not ship an Api.
Indexing inside the catalogue removes it, leaving only the three
structural homes (the definition in `stuff.ts`, the seed's own
implementation in `resolver.ts`, and `ResidencyLogic`'s deliberate
raw-proxy sweeps).

⭐ **And it fixes a layering smell.** `TitleController` (kernel civics)
and `maintains.ts` (kernel brain) both reach for **pack-owned classes by
name**; `class.X` is a string, so that kernel→pack dependency is
invisible to the type system today.

### D3 — Two gates, because there are two failure modes

**Gate A — who.** Registry-wide resolution moves behind a **separate,
gated entry point** (the narrow-entry pattern —
[access.md](../../subsystems/access.md)). `MqlApi.resolveMany` stays
`Public` and **refuses the `world` seed outright, for everyone**,
throwing a resolver error naming `reachable` / `here` / `person`;
`MqlPermissionError` already exists and no path throws it today — a
ready seam. Strip `world:` from the player-facing `docs/mql-grammar.md`,
which advertises `world:[mixin.Door]` today.

The gated entry's policy is **`FromTemplateMethod`** — ⭐ the user's
recorded preferred trust basis (`call-security-pass-slate`, 2026-09-02):
*"the calling TEMPLATE combined with the calling FUNCTION in that
template's backing class"*, with module trust secondary. `AnyOf(…)`
composes the permitted pairs at the definition site, so widening the set
is a visible diff in review.

⚠ **That is the CODE arm. There is a second, actor arm for the office
holder — D3b below.** The two are independent: code qualifies by
provenance, a person qualifies by seat, and neither substitutes for the
other.

⛔⛔ **The code arm is NOT an actor check, and specifically NOT
`isWizard` / `isArchwizard`.** Three drafts of this slate reached for a
principal —
archwizard, then the wizard axis, then a `commandGiver === null`
convention — and all three were wrong in the same way: **"who may run a
registry-wide scan" is a question about the CALLING CODE, not about a
person.** ⚠ The wizard axis is TypeScript authoring and takes **no new
consumers, ever**. ⚠ And `commandGiver === null` is not a gate at all —
the caller chooses that argument, so any code that wants to scan simply
passes `null`; it constrains only the player-typed path, which is
already handled by the seed refusal above.

⭐ **If a human-facing registry-wide read is ever wanted, it is a VERB
with a seat** — offices (`OFFICE_APPARATUS` / `CompactApi.holdsOffice`),
groups, committees, titles
([governance.md](../../subsystems/governance.md),
[civics.md](../../subsystems/civics.md)). A separate design question with
a separate answer; not MQL's, and not this slate's. `call-security.md`
already names the growth path — **trust-layer policies** (ownership via
`ParcelApi`, authorship via `ProvenanceApi`, group membership via
`GroupApi`) as sibling policies, with `allows` already async-capable —
so such a reader would qualify **by relationship**, never by a tier.

### D3a — ⭐⭐ Building `FromTemplateMethod` is in this build's scope

The primitive is designed and **unbuilt** — item 1 of *Future gate
primitives* in
[call-security-pass-slate](../builds/call-security-pass-slate.md).
World-scan is its **first consumer**, and a good one: after the Part 4
remediation the legitimate registry-wide readers are a handful of
*specific functions* (`EmploymentLogic.flowSplitsFor`,
`AppBootstrap.shutdown`), which is exactly where a template+function pair
is strongest and a module glob is sloppiest — a glob would admit every
method in those files.

⭐ **Correction to that slate, in the primitive's favour.** It records
the blocker as *"the CALLER's method name is not currently tracked in
frames."* The dispatch says otherwise:

```
policy.allows(caller, cls, methodName, args)      // ← evaluated FIRST
SecurityApi.#pushFrame()(caller, cls, methodName, …)
```

Every gated dispatch pushes `(caller, target, method)`, and the policy
runs **before** the callee's frame is pushed — so at decision time the
**top** frame is the caller's own, and `top.method` is the calling
function's name. No new frame field is needed; the primitive is
`FromTemplate`'s existing hard `#templatePath` read plus one
top-of-stack lookup.

⚠⚠ **A first draft of this said the frame BELOW the top.** That assumed
the callee's frame was already pushed. It is not — verified in
`api/security.ts` during planning.

⚠ **And attribution is a guard, not a guarantee.** `top.target ===
caller` (excluding a synthetic `Root` frame) is the check, but **an
un-dispatched caller inherits the nearest dispatched frame**. A free
function called from a permitted method IS admitted — deliberate — while
a brain's `act()` is attributed to the NPC's tick and can never qualify.
⭐ So the gate reads *"the nearest dispatched (template, method)"*, not
*"exactly this function"*: coarser than the recorded preference, and the
plan records it as doctrine rather than leaving it implicit.

**⭐ Decided — the two shape questions:**

1. **Fail closed.** No template stamp, template glob miss, no top
   frame, `top.target !== caller`, a synthetic `Root` frame, or
   `top.method !== methodName` → **deny**. Never guess a function name
   from an unattributable frame. ⚠ **Consequence to accept
   deliberately: a caller whose own entry was never dispatched cannot
   name itself** — it inherits the nearest dispatched frame instead. A
   free function called from a permitted method is therefore admitted
   (deliberate), while **a brain's `act()` is attributed to the NPC's
   tick and can never qualify**. `maintains.ts` is a brain and one of
   the seventeen sites, so it hits this on day one — correctly, since it
   should be reading the residence roster (D2) rather than the registry
   at all.
2. **The module term is OPTIONAL** — `FromTemplateMethod(templatePath,
   methodName, opts?)` with the module glob as a third, opt-in term.
   ⭐ It is a **disambiguator**, not part of the identity: `flowSplitsFor`
   is unique in the codebase and needs none, while a `shutdown` almost
   certainly is not and does. Always-on module matching would re-import
   the module basis the recorded position calls *secondary and redundant
   once template + function are checked*.

**Gate B — what.** Inside system mode, `world` must be answerable **from
the mixin index**: `world:[mixin.X]` resolves; bare `world`,
`world:[class.X]`, `world:[prop.X]`, `world:[address=…]` and `world` +
keyword search **throw**.

⭐⭐ **Gate B is the load-bearing half.** Without it `world` stays a scan
that merely requires a better badge, and nothing stops engine code
reintroducing one. It is also what *forces* the 5 class sites onto D2
rather than letting them linger.

### D3b — ⭐⭐ The second arm: the Prime Minister may type it

> **User: "I would want the prime minister to be able to run world:
> based MQL queries for any command they want. maybe with a warning."**

Gate A has **two arms**, and an earlier draft of this slate wrongly
collapsed them to one by removing the actor arm altogether:

| arm | who | basis |
|---|---|---|
| **code** | the engine's own registry-wide sweeps | `FromTemplateMethod` (D3a) |
| **seat** | a person **holding the `prime-minister` office**, typing | `CompactApi.holdsOffice(giver, 'prime-minister')` |

⭐ **Ask the office directly — not the axes that descend from it.**
`isWizard` / `isArchwizard` fall back to `holdsPrimeMinister`, so they
would *happen* to admit the PM, but they also admit the wizard and
archwizard groups, and they are the code-trust and conferral axes rather
than a statement about who may read the world. `holdsOffice` is the
honest question, derived per check, never stored — *check offices, never
the founder* ([record-layer.md](../../subsystems/record-layer.md)).
Authority follows the seat through a handoff in both directions.

**⚠ Where the check must live, and why it is not the resolver.**
`CompactApi.holdsOffice` is **async** (`Promise<boolean>`);
`MqlApi.resolveMany` is **sync**. So the seat test cannot happen inside
the resolver at all. It belongs in the **binder** —
`CommandLogic.resolveModel`, which is already `public async` and is the
one place a player's raw MQL string enters. It detects a `world:` seed
in the raw argument, awaits the office check, and on success calls the
gated registry-wide entry.

⛔ **NOT a permission flag on `MqlContext`.** The reflex is to add
`allowRegistryScan?: boolean` and have the binder set it — which is the
`commandGiver === null` mistake exactly: a caller-supplied field is not a
gate, because any code can set it. **The trust boundary is the gated
entry point**, which `FromTemplateMethod` admits the binder's own
function to; the binder is trusted because it is the only caller that
can reach it, and it is the thing that did the office check.

**⭐ Gate B degrades to a warning on this arm — that is what the warning
is FOR.** Gate B (index-answerable shapes only) stays **absolute for
code**: engine code may never ask an unindexed registry question. For the
seat holder it becomes **permitted-with-warning** — a human at a keyboard
running one O(n) scan is fine, and the note is how they learn what it
cost (object count scanned, and that the shape was unindexed). ⚠ The
`Note` union carries no cost-warning shape today, so this adds a kind
(`RegistryScanNote`-ish) — a `@saxonberg/types` change, called out here
because it is the one piece of new wire surface in the build.

**⭐ Decided — the seat arm does NOT extend to MQL subscriptions.**
(*User, asked directly: "no subscriptions is fine, keep it that way."*)
A live `world:` *subscription* re-resolves on every dependency change, so
a single typed query would become a **standing** rescan — strictly worse
than the one-shot this arm permits, and invisible after the fact.
Subscribing surfaces refuse the seed for **everyone, PM included**. ⚠ Not
a widen-later dial: the whole point is that nobody, including the office,
can leave a rescan running that they will not remember starting.

### D4 — The second surface: an Api may not hand back its table

Same defect from the other end. `EmploymentLogic` reads
`this.allBusinesses().find(match)` — a caller doing a linear scan because
the Api handed it the array, over a collection that was itself a world
scan. `ParcelApi.allRecords()` (the whole Mongo collection — read by
`AccessRegistry` and by the water pack), `WikiRegistry.allPages()` (5
internal callers, each re-reading everything), `CommandApi.allDefinitions()`,
`PlayerApi.getAllAvatars()` with `.find()` / `.filter()` at 8 sites.

⭐ **The discriminator is whether the collection grows with the world**,
not whether the method returns an array:

- ✅ **Fine** — a bounded authored vocabulary returning its whole roster:
  `Disposition.all()` (17 axes), `Currency.all()`, `LocomotionApi.allModes()`
  (~5), the `*Catalogue` rosters. These are enum-shaped.
- ⛔ **Not fine** — a collection that grows with play: parcels, wiki
  pages, avatars, interactives, businesses, ledger entries, lanes,
  reaches. The Api must expose the **question** (`businessAt`,
  `parcelCovering`, `pageBySlug`, `avatarFor`) answered from its own
  index, and keep the collection private.

**Mechanism: census, then ratchet** ([lint-family.md](../../lint-family.md)).
`lint:whole-table` counts the offending returns, gates today's count as
the ceiling, and each caller that gets a named question drives it down.
⚠ The census is the build's **first** task — the numbers above are a
survey, not a count.

### D5 — MQL grammar for the specialized slices: later, if at all

A D2 index stays behind its owner's method surface. **If** a common
queryable pattern emerges, it can be lifted into MQL then — as a new
seed or filter namespace with an index behind it, never as a scan. Not
speculative work now.

### ⛔ Rejected — a global event bus that pushes objects into caches

> **User: "what about using our event framework here and for these caches
> we actually use global event subscription for making sure the caches get
> informed of all the objects that need to be cached. is that any better
> or just moving furniture around?"**

Considered and rejected: **mostly furniture, and worse in two specific
ways.** Both designs maintain a derived set at the register chokepoint, so
they are equivalent in principle. They are not in practice:

1. ⚠ **Fan-out taxes object creation.** *N* caches subscribing means every
   object creation dispatches to *N* subscribers, each running its own
   predicate — on the hottest path in the engine (every clone, every
   template materialization at boot). The index does one map insert per
   composed mixin. **Adding a cache must not make creating a chair
   slower**, and with a bus it does, permanently, worse with each cache.
2. ⚠⚠ **The cold-start hole — the bus CAUSES the reload problem rather
   than solving it.** A subscriber only learns about objects created
   *after* it subscribed, so every cache must answer *"what about
   everything that existed before I did?"* — and the only general answer
   is a full scan. **The bus's recovery path is the banned thing.** Reload
   a singleton and its copy is empty; rewarm it and you have done the
   scan. A registry-owned index has no such question, because the registry
   is the thing that knows; and one place can be wrong instead of *N*.

⭐ **Precedent, one build ago.** The same question was asked during the
logistics review — *"do you really need a global ContractSettled event? is
there not a more local solution instead?"* — and the answer was a typed
`onContractSettled` `@hook`. A global event is the wrong shape for a fact
with exactly one legitimate consumer.

⭐ **What survives from the instinct is real, and already built.**
`PostRegistrationMixin.postRegister` *is* the push hook — per object, no
subscription lifecycle, no fan-out, fires for every instance including at
boot. (`PlatBook` already composes it and does not use it.) That is D2
rung 2. It is still push, so it still has the reload hole — which is what
rung 3 answers.

---

## Part 4 — Remediation order

⭐ **Priority is frequency × population, and it does NOT track "is it a
world scan."**

1. ⚠⚠ **The money paths first, independently of any index work.**
   `flowSplitsFor` + `holdersByPosition` scan every employed actor in the
   game to pay one business's staff, on a money path, and **the roster
   already exists on the Business.** Read-the-owner, no new substrate,
   highest value. (Bucket B)
2. ⚠ **The per-tick brain.** `maintains.holdingsUnder` — a world scan per
   NPC per cadence. Keyed-on-extent lookup, and the same lookup
   `OuterWarren.admitFor` wants (step 7), so land them together if the
   catalogue exists by then. (Bucket B)
3. **The item back-reference.** `Slottable.occupiedSlots` on
   equip/combat/metabolism paths. (Bucket B)
4. ⭐ **`allModes` → a path glob** (D2 rung 1). **Zero new substrate** —
   the trie already answers it. Not gated on anything below; take it the
   moment somebody is in the file.
5. **The mixin index + the `queryMixins` memo** (D1). Makes all of
   Bucket A free at once; the one piece of new substrate.
6. **`FromTemplateMethod` (D3a), then Gate A's two arms (D3a code /
   D3b seat), then Gate B** — after 1–5, so nothing legitimate is
   stranded when the door shuts, and so the permitted
   `(template, function)` set is already small enough to enumerate
   honestly. ⚠ The seat arm carries the one new wire surface (the
   warning `Note` kind) and the binder's async office check.
7. **The remaining D2 owners**: the `residence` pack catalogue (which
   retires `admitFor` **and** `holdingsUnder` together — same three
   objects), and `WatercourseCatalogue` off its allowlisted scan.
8. **`execMisidentify` → early-exit or a decoy pool.** (Bucket B)
9. **D4: census, ratchet, then the named questions**, subsystem by
   subsystem behind the lint.
10. **Invert `docs/antipatterns.md` § Bespoke Object-Search Algorithms**
    and add the D4 rule beside it. ⚠ **Do this in the same MR as Gate B** —
    the doc currently instructs the opposite, and a gate whose rationale
    is not written down gets an allowlist entry the first time it is
    inconvenient.
11. **Leave Bucket C.**

> ⭐ **The index is deliberately not step 1.** The instinct is to build
> the shiny substrate first, but the money-path fixes need no substrate
> and carry more value, and the index does **nothing** for the
> broad-mixin sites that are the actual scaling risk. Substrate last.

---

## Part 5 — The rule this leaves behind

> ⭐⭐ **You may not be handed the world. You may ask the world a
> question.**
>
> `world:[mixin.X]` is for a **selective, global** population you
> genuinely want all of, from engine code. If you are filtering the
> result down to one business / one item / one extent / one owner, you
> want that owner's relationship — no matter how well the mixin is
> indexed. And an Api that returns a collection which grows with the
> world is the same mistake made one layer out: name the question,
> keep the table.

The narrower MQL seeds already say the first half: `reachable` / `person`
/ `inventory` are actor-anchored. `world:` was being reached for where an
anchored query or a relationship read belongs.

---

## Lens pass

Honest finding: **four of the five barely bite.** This is engine hygiene,
not design — no Discipline is exercised, no fiction changes, no value is
conferred, and the mechanism is epoch-neutral because it is not a
mechanism in the world at all.

The one that bites is **lens 2, creative expression**. Gate A takes a
documented capability away from whoever is typing MQL, and the ordinary
authored case must not need code to get it back: an author asking *"every
door in my extent"* should reach a scoped seed, not be told no. ⚠ Check at
requirements time that the authored cases `world:` currently serves are
served by `heldExtents` / path globs / `reachable` — and if one is not,
that gap is a seed to add, not a reason to widen the gate.

---

## Open questions

1. ⚠⚠ **Composed or active mixins?** Augmentation confers mixins at
   runtime; `getActiveMixins` changes post-register. `[mixin.X]` matches
   **composed** today, so a constructor-keyed index is faithful to
   current semantics — but D1 **hardens that** into the engine. Decide
   deliberately: keep composed-only (and an active-mixin selector becomes
   its own operator later), or index actives too and pay
   augment/unaugment invalidation. **Recommended: composed-only**, named
   as such in `mql.md`, because the alternative is the
   invalidation-by-construction hard part for a use case nothing has
   asked for.
2. ✅ **Answered — it is TWO questions, and I kept answering only one.**
   Code qualifies by provenance (`FromTemplateMethod`, D3a); the **Prime
   Minister qualifies by seat** (`holdsOffice`, D3b), checked in the
   async binder because `holdsOffice` is async and the resolver is not.
   ⚠ Recorded because four drafts missed it in two opposite directions:
   three read *"who may scan"* as an actor question and reached for a
   **tier** (archwizard → `isWizard` → the `commandGiver === null`
   non-gate); the fourth, over-correcting, removed the actor arm
   **entirely** and made it code-only — dropping the user's actual
   requirement. ⭐ The lesson is not "it is about code" or "it is about
   people": **it is about both, by different bases**, and a correction
   is a reason to add the missing half, not to swing to the other pole.
3. **Does the residence catalogue key on the base class or the concrete
   one?** `[class.OuterWarren]` matches `HoldingWarren` subclasses today
   (a prototype-chain walk). A catalogue keyed on the concrete class
   misses a future sibling; keyed on the base, it must know the subclass
   set. ⭐ Likely moot in practice — both consumers want *"every holding
   warren"*, so the catalogue should be named for that population rather
   than for either class. Confirm when it is written.
4. **Selectivity of `CirculatingMixin` / `PublisherMixin`** — measure
   before finalizing Bucket A vs B for the borderline ones.
5. **How many objects is `n`, actually?** `StuffApi.getObjectCount()` at a
   populated boot (`Server.ts` already logs it). The priority order
   assumes n is large enough to matter; confirm, and record the number.
6. **Does `lint:whole-table` key on the return type or on the method
   name?** A type-driven rule catches more and misfires on the bounded
   vocabularies; a name-driven one (`all*` / `getAll*` / `list*`) is
   cruder and easier to ratchet. Decide at census time, when the shape of
   the offenders is visible.

---

## What this slate does NOT cover

- **The raw-`getAllObjects` allowlist's three structural homes**
  (`resolver`, `ResidencyLogic`, `stuff.ts`) — correct as-is; the
  residency sweeps *must* walk raw proxies so enumeration never counts as
  a dispatch-touch (documented at both loops). The fourth entry
  (`WatercourseCatalogue`) is in scope — see D2.
- **The `flat` seed** (also `getAllObjects`) — the deep-contents scan, a
  different consumer; audit separately.
- **Api surface/depth normalization** —
  [api-normalization-slate](./api-normalization-slate.md) measures the
  layer on different axes and does not overlap D4.
- **MQL subscription re-resolve cost**
  ([mql-subscription.md](../../subsystems/mql-subscription.md)) — a live
  `world:` *subscription* re-scans on every dep change, strictly worse
  than a one-shot. ✅ **Re-checked 2026-09-08: zero `world:` subscriptions
  exist**; every inventoried site is one-shot. Gate B makes a future one
  impossible from player input, and Bucket-B-urgent if engine code ever
  adds one.
