# `lib/` statics — `callable == visible` is broken in 159 classes

> **Status: PARTIAL — scoped for the next session** (see the final
> section, *The remaining scope*, which is written to survive a
> compaction). Was: ⭐ ABSORBED-IN-PRACTICE — the invisible-surface problem is
> fixed; the relocation half was examined family by family and mostly
> should not happen (see the last section). `lint:lib-statics` sits in the
> derived family at **ceiling 462**, and its job from here is stopping
> growth, not burning down to 0.
> **Left:** ✅ rungs 2–3 done (27 `private`, 4 + 25 classes `@internal`;
> ceiling 563 → **464**) · **the real remainder is 123, not 464**: 44
> world-SUBJECT statics that want to be instance methods on the host
> (`lint:object-verbs`' rule), and 79 world-REACH ones that are a genuine
> Api question. ⚠ The other 341 are type-level and the 71 ActiveRecord
> finders belong on their record class — see § Rung 4. ⭐ Not one new Api
> is needed; the single Api change in the homeless set is `Lock` →
> `BoundaryApi`.
> **Size:** a build — 564 statics

**Raised by:** the user, reviewing MR !255, 2026-09-11
**Census:** `pnpm -C packages/server lint:lib-statics` (gate) ·
`… exec tsx scripts/check-lib-statics.ts --report` (the roster)

> **A public `static` on a non-`Api` class is callable by anyone and
> visible to nobody.**

---

## The ruling

The two sanctioned calling surfaces are, and remain:

1. a **public instance method** on a `Stuff` object;
2. a **public static method** on an `Api` object.

`lib/` value classes and interfaces are right and necessary — *that stuff
has to go somewhere* — but they are **types with instance methods**, not
a third calling surface.

⭐ **And the codebase already holds this rule one layer up.** `CLAUDE.md`
forbids `new SomeStuff()` and routes it through `StuffApi.create`.
**Construction is an Api concern.** A value class with public static
factories is the same rule broken in `lib/`.

## The mechanism that makes it bite

`scripts/project-author-surface.ts`:

```ts
const isStaticApi   =  apiClass && member.flags?.isStatic === true;
const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
if (!isStaticApi && !isStuffMethod) continue;   // ← dropped
```

A static on a `lib/` class satisfies **neither branch**. Its *instance*
methods survive; only the statics vanish — which is exactly what somebody
goes looking for. Straight breach of **`callable == visible ==
cared-about`**.

---

## ⚠⚠ The census — bigger, and more interesting, than "some factories"

**159 classes · 535 public statics.**

⚠ **The slate first said 136 / 461, and that was an undercount** — the
script read only the FIRST exported class in each file and required a
static to sit at exactly two spaces of indent. W0 rewrote it over
`pack-roots` and verified all 535 pairs exist. The shape table below was
classified at 461; **the 74 newly-visible statics are unclassified**, so
treat its counts as a floor per row, not a partition. Only **8 files** anywhere in `lib/`
carry an `@internal` marker, so almost none of this is even *declared*
internal.

| shape | count | what it is | where it goes |
|---|---|---|---|
| **logic** | **318** | `Freshness.growthRate`, `Contamination.advance`, `CombatNarration.narrate`, `Fade.ratePerGameSec` | ⭐ **a logic singleton** — `platform/idea/api/<X>Logic.ts`, with the Api forwarding |
| construct | 64 | `Light.of`, `Currency.of`, `Quantity.parse`, `Position.fromData` | the owning **Api** (`GrammarApi.phrase` is the worked example) |
| guard | 56 | `is*` / `has*` over closed vocabularies | the owning **Api** |
| registry/cache | 15 | `Construction.registerFabric`, `AccountBalance.putCached`, `Appearance.clearMemo` | ⚠ module-level mutable state — a **logic singleton**, or a real registry |
| lookup | 8 | `all`, `list`, `keys` | the owning **Api** |

⭐⭐ **The headline is that 318 of 461 are LOGIC, not construction.** These
classes are **logic singletons that never got the memo** — `CLAUDE.md`
already describes the home (`platform/idea/api/<X>Logic.ts`, `@internal`,
`FromModule`-gated, HMR-able) and the `XApi` ↔ `XLogic` split is called
**mandatory** there. So this is mostly not a new rule; it is an existing
rule that ~40 classes predate.

### The worst offenders, by static count

| statics | class | call sites |
|---|---|---|
| 18 | `Freshness` (`lib/material/Freshness.ts`) | 55 |
| 16 | `Contamination` (`lib/material/Contaminable.ts`) | 47 |
| 12 | `CombatNarration` (`lib/combat/CombatNarration.ts`) | 29 |
| 11 | `Construction`, `Cure` (`lib/material/`) | — |
| 9 | `CompetenceBand`, `Currency`, `Quantity`, `GroundCharacter` | 49 / 91 / — / — |

⚠ `Currency` alone has **91 call sites**. This is not a weekend.

---

## Waves

**W0 — the ratchet. ✅ DONE** (`build/lib-statics`). `lint:lib-statics`
is in the derived family (37 gates) at **ceiling 535**, so the count can
only fall. ⭐ Census-then-ratchet, the pattern that took
`lint:object-verbs` from 338 to 0. ⚠ The script was rewritten first:
hardcoded worktree path → `pack-roots`; first-class-only → every exported
class, brace-matched; two-space-indent-only → any indent. That is where
461 → 535 came from, and a ratchet set below the real count is a ceiling
that never bites. 14 unit tests on the decision core.

**W1 — fix the projection. ✅ DONE.** It now emits an **unclassified
report** — every public method that satisfies neither tier rule — instead
of `continue`-ing in silence, grouped by tree so the mudlib half is not
buried under `backend/`'s singleton accessors. ⭐ `@internal` is how a
member declares itself deliberately off the surface; everything else that
falls through is named.

Two findings came straight out of turning the light on:

- ⭐⭐ **`Mml`'s 41 statics were invisible.** `isApiClass` keyed on the
  class *name* ending in `Api`. `Mml` (`mud/api/mml`) is an Api by every
  functional measure — `SecurityApi.decorateApiClass`'d like every other
  face, and `Mml.compose` / `Mml.actor` / `Mml.ref` are among the
  most-called author surface in the tree — but it is not spelled
  `MmlApi`, so all 41 reached no doc. The rule is now **where the class
  is declared** (`CLAUDE.md § Module Categories` admits nothing else into
  a top-level `api/<feature>.ts`), with sealed subdirs (`api/mml/**`,
  `api/mql/**`) explicitly excluded. *A convention enforced by spelling
  is a convention with a hole in it.*
- ⭐ **D2 — the gate widened to `mud/platform/`.** The report showed 31
  equally-invisible statics there, `VisionModality.canSee` among them,
  and the invariant is about visibility, not about which directory a
  class sits in. 535 → **564**.

**W2 — construct + guard + lookup (128 statics).** The mechanical half,
and the one with a worked example already merged. Each class's statics
move to its subsystem Api; the class keeps its instance methods and gains
a **public constructor** (the `new Thing()` precedent — the Api calls it,
and "authors don't" is a convention, not a visibility trick).

**W3 — logic (318 statics), by subsystem, one Api at a time.** Biggest
first: material (`Freshness`, `Contamination`, `Cure`, `Construction`),
then combat, banking, magic, advancement. Each becomes an
`platform/idea/api/<X>Logic.ts` with the Api forwarding.

**W4 — registry/cache (15).** Mutable module state is its own smell; some
of these want to be a real registry singleton, not a class with a `Map`.

---

## Decisions made during the build

| # | decision | what decided it |
|---|---|---|
| D1 | an **Api face** is decided by where the class is declared, not by its name | the `Mml` hole — 41 author-facing statics invisible because of a spelling |
| D2 | `lint:lib-statics` covers `mud/platform/` too, not just `lib/` + packs | `callable == visible` says nothing about directories; the projection found 31 there |
| D3 | the census script was rewritten before the ratchet was set | every one of its three defects set the ceiling BELOW the real count, and a ratchet under the real count never bites |
| D4 | mixin-factory statics stay OUT of scope | they are reached through the composed host — a different question, and one nothing is asking yet |

## ⚠ Homes that do not exist yet

Most subsystems have an Api (89 of them). These do **not**, and each is a
decision the build has to make rather than assume:

`advancement` (`CompetenceBand`) · `wiki` (`WikiPage`, `Sections`) ·
`concealment` (`ConcealmentLevels`) · `identification` (`Appearance`) ·
`metabolism` (`BlendLabel`) · `craft` (`BlendIdentity`, `Techniques`)

⭐ **Apis are per-subsystem**, so a value object with no obvious Api home
is the signal that a subsystem boundary is wrong — not that the rule
needs an exception.

---

## The worked example (merged in !255)

| before | after |
|---|---|
| `NounPhrase.of(stem, register)` | `GrammarApi.phrase(stem, register)` |
| `NounPhrase.proper(name)` | `GrammarApi.properPhrase(name)` |
| `NounPhrase.articleFor(text)` | `GrammarApi.articleFor(text)` |
| `NounPhrase.isRegister(x)` | `GrammarApi.isRegister(x)` |

- The class keeps its instance methods and its vocabularies.
- The constructor is **public**; the Api is the sanctioned path.
- A rule implemented once stays once: the vowel check is a
  **module-private function**, and `GrammarApi.articleFor` is its only
  public surface.
- ⚠ **No cycle** — `api/grammar.ts` → `lib/description/NounPhrase.ts`
  only. A value class reaching *back* for an Api is what would make one.

## ⚠ And run `pnpm lint`

Two ESLint errors (`no-restricted-syntax`, free exported functions in
`lib/`) sat in `NounPhrase.ts` for the whole of !255 because
**`lint:family` cannot see ESLint rules**. ⭐ *A rule that is not in the
family you run is a rule you are not running.* This sweep will trip that
rule constantly; run `pnpm lint` per wave.

## Cross-references

- `CLAUDE.md` § Module Categories · § Export discipline · § Go Through
  the API Layer — *"the `XApi` ↔ `XLogic` split is **mandatory**"*
- `docs/architecture.md` § The Api ↔ logic-singleton split
- `docs/lint-family.md` § census-then-ratchet
- `docs/subsystems/presentation.md` — `NounPhrase`, the worked example

---

# ⭐⭐⭐ The disposition ladder — how each of the 563 is actually decided

*(Written 2026-09-13, after measuring caller spread. This replaces the
W2/W3/W4 bucket split, which sorted by the SHAPE of a static. Shape turns
out to be the second question; **who calls it** is the first.)*

> **Normalization is not the goal — homing these methods is.** Where a
> method's home requires an Api to be split, merged or renamed, that
> refactor happens here and now (user, 2026-09-13). It just turns out
> almost none of them do.

## The ladder, first match wins

| # | test | disposition | count |
|---|---|---|---|
| 0 | **Reached reflectively by the framework?** | stays; not surface, not movable — the mixin-side `@hook` | 1 counted (fixed) |
| 1 | **Type-level?** — construction, a guard over its own closed vocabulary, a lookup of it | **stays on the value class**, visible as `value-static` | ~165 |
| 2 | world-level, **0 callers at all** | `private static` | **27** ✅ |
| 2b | world-level, **test-only callers** | `@internal` — *only where that claim is true* | **4** ✅ |
| 3/4 | has a production caller | move onto it, or to the owning system's Api | **464** |

⚠⚠ **Those counts are the CORRECTED ones. The first pass said 153 / 285 /
126 and every figure was wrong in the unsafe direction**, for one reason:

> ⭐⭐⭐ **Statics are INHERITED, so call sites use the SUBCLASS name.**
> `Document.findById` is called as `User.findById(…)` — a grep for
> `Document.findById(` finds nothing and concludes it is dead. `tsc`
> caught it after 60 statics had already been privatised.

Recount by matching `.<method>(` on **any** receiver — which over-counts
callers, and therefore errs toward leaving things public.

⚠ **Rung 0 is not optional and nearly bit.** `Warren.cleanupOnDestruct`
looked like a dead static with no callers. It is found by `StuffApi` with
`hasOwnProperty.call(mixinCtor, 'cleanupOnDestruct')` — making it private
would have silently broken destruct cleanup. **Before anything is made
private, grep for its name as a string.** The full reflective set is
`fieldMeta · subscribableFields · markupAugmenters · cleanupOnDestruct ·
captureSlice · restoreSlice · settings`.

## ⚠ The call-site count was wrong by 4.1×

The narrowing decision was argued on **5,701 call sites**. That figure
counted **tests and the declaring file's own internal uses**. The honest
number — external, non-test — is **1,404**. `Quantity.of` is **297** sites
across 87 files, not 1,416.

The decision it supported still holds, on the type-vs-world argument
rather than on the arithmetic. But the arithmetic was wrong and the
correction cuts the other way too: the sweep is **smaller and more
tractable** than it was sold as.

## ⚠ What the ladder actually yielded

Rung 2 was sold as 153 statics of free win. **It was 31.** The rest of the
apparently-callerless population was an artefact of the receiver-qualified
grep, and the genuinely test-only remainder turned out to be mostly
legitimate surface:

> ⭐⭐ **"Only tests call it" is not "internal".** Most of the 61 test-only
> statics are constructors and vocabulary guards — `Quantity.fromTag`,
> `Blessing.uncursed`, `Resists.isAxis`. `@internal` is a **claim that
> nobody should call this**; making it about a type's own constructor
> because today's callers happen to be tests asserts something false and
> hides real surface behind a tag nobody will re-question. Zero production
> callers is a fact about today, not about what the type offers.

And ⭐ **an unused factory is not an unwanted one** — six statics were
privatised and then reverted because rung 1 (is it type-level?) was
applied *after* rung 2 instead of before. Run the ladder in order.

**The real shape: 464 of 563 have a production caller**, so the work is
rungs 3 and 4, not the free win.
They were never shared surface; they are implementation that happens to be
spelled `public static`. Neither needs an Api, a logic singleton, or a
decision:

- **rung 2 is pure deletion of visibility** — `private`, and the count
  falls by 153 with no call site touched;
- **rung 3 is a one-file move**, and where the single caller is the mixin
  that owns the concern, the result is the repo's own stated rule —
  *a read or mutation that belongs to ONE object lives on that object.*
  `TraitPosition.derive` → the `Dispositioned` mixin. `Competence.bandOf`
  → the `Advancement` mixin. `Sections.*` → `WikiRegistry` /
  `WikiController`, which already exist.

## ⭐⭐⭐ Therefore: not one of the 18 "homeless" subsystems needs an Api

The dossier declined four Apis *for timing*. The caller data declines them
for a better reason — **there is nothing for them to hold:**

| subsystem | why no Api |
|---|---|
| **wiki** (25) | every static has 1–2 callers, all of them `WikiController` / `WikiRegistry` / `WikiRenderer` / `composition.ts`. `WikiRegistry` is already a platform `Idea` singleton. The statics go there. |
| **trait** (11) | `TraitPosition.*` is called only by the `Dispositioned` mixin; `TraitBand.*` only by `TraitPosition` or nothing. ⚠ `trait.md` names a `TraitApi` twice — **the doc should stop**, not the code start. |
| **advancement** (12) | `Competence.*` → the `Advancement` mixin and `Cast`. The only genuinely shared thing is `CompetenceBand` (`rank` 12 files, `atOrAbove` 5) — and that is a **band vocabulary**, rung 1: it stays, and is now visible. |
| **identification** (12) | `Appearance.currentGeneration` (4 files) is the one shared member; the rest are 0–1 and go to `RecognitionLogic` / `Identifiable`, both of which exist. |
| **standing** (10) | `.key` / `.cached` have exactly one caller each — their own `*Logic` singleton. `warm` is a **boot** concern, not an Api one ([[api-boot-is-an-operator-act]]: self-warming catalogues). |
| **concealment · credential · maturation · reserve · slot · travel · archetype · commerce · metabolism · npc · location** | all 0–2 callers, every one resolvable at rung 1–3 |

**The one real Api change in the whole homeless set** is `Lock.mintKeyway`
and `Lock.issueKey` — 3 callers each (`LeaseController`,
`ProvisionController`, `TitleController`), world-level, async, and they
*mint credentials*. That is shared orchestration and wants a face:
**`BoundaryApi`**, whose mandate (`boundary.md` — "locks & keys") already
covers it without a rename.

## Order of work

1. **Rung 2, the 153** — mechanical, one grep-guard per name, no call site
   changes. Biggest single drop in the ceiling.
2. **Rung 1 audit** — confirm the ~165 type-level ones and leave them;
   they are already visible.
3. **Rung 3, the 285** — by owning file, smallest subsystems first.
4. **Rung 4, the 126** — the only bucket with judgment in it, and the only
   one that can touch an Api's mandate. `Lock` → `BoundaryApi` is the
   exemplar.

---

# ⭐⭐⭐ Rung 4, and what the sweep turned out to be measuring

Rung 4 was sized at 136 statics needing an Api. **It is 79.** Getting
there found three shapes that **cannot** move, and each was found by
almost breaking something.

## The three irreducible shapes

| shape | why it cannot move | found by |
|---|---|---|
| **type-predicate narrowing** — `MixinApi.isX(o): o is Stuff & X` | a TS type predicate must NAME its type, so the narrowing that makes it worth having is exactly what forbids a generic. 156 of them. | reading `MixinApi`'s 175 |
| **framework-reflective contract** — `cleanupOnDestruct`, `fieldMeta`, `captureSlice` | reached by `hasOwnProperty`, never imported. Looks dead to every grep. | `Warren.cleanupOnDestruct` nearly made `private` |
| ⭐ **polymorphic `this`** — `Document.find<T>(this: DocumentConstructor & {new(): T})` | `User.find()` returns `User[]` because `this` carries the subclass. An Api static cannot know the subclass without being handed the constructor — which `this` is already doing. | `tsc`, after 60 statics were wrongly privatised |

## ⭐⭐ And a fourth: a record class's finders belong to the record class

**71 of the remaining 464 statics are ActiveRecord finders on `Document`
subclasses** — `Template`, `StoredDocument`, `ChattelRecord`,
`ParcelRecord`, `AccountBalance`, `SupplyAggregate`, `RenownStanding`,
`DescriptorBank` — covering **523 caller files**.

They are not the antipattern. `TemplateApi`'s own docstring already
records the split as deliberate: *"Templates themselves are modelled as
`Template extends Document` — the standard CRUD surface lives there,
alongside the `findByPath` and `findDescendants` helpers. This Api class
layers on…"*. And `Template.findByPath` exists **precisely because**
`Document.find`'s polymorphic `this` cannot serve an abstract base — it is
the documented workaround for the irreducible shape above.

⭐ Under the governing test — *would a reader look for it here?* — you look
for **how do I find a Template** on `Template`. Moving these would scatter
record materialization away from the record, contradict a documented
decision, and rewrite ~500 call sites for nothing an author can see.

## ⚠⚠ What the ratchet is actually counting now

W2 admitted every public static on a value class into the author surface
as a `value-static`. **So as of W2, none of them is invisible any more** —
the breach the census was built to measure was closed by making them
visible, not by moving them.

The number therefore stopped meaning *"breaches of `callable == visible`"*
and started meaning *"statics we still intend to relocate on OO grounds"*.
That is a weaker and more debatable claim, and the gate should say so
rather than implying the old one. **The honest remaining target is 123:**

- **44 WORLD-subject** — the first parameter is a world object, so
  `lint:object-verbs`' rule applies and they want to be **instance methods
  on the host** (`Freshness.loadOf(slot)` → `slot.freshnessLoad()`).
- **79 WORLD-reach** — async or registry-reaching, not on a record class:
  a genuine Api question, case by case.

Everything else — 341 type-level, 71 record finders, plus the framework
and narrowing shapes — **is where it belongs**.

---

# The 123, one family at a time — and why almost none of them moved

Worked through every one of the 123. **Two moved.** The rest each have a
reason, and in four cases the reason was already written in the code.
Recorded family by family so nobody re-derives this.

| family | n | verdict |
|---|---|---|
| **`Record<string, unknown>` first param** | 4 | ⚠ my classifier's own bug — it listed `Record` as a world type. `Archetype.fromData`, `Emote.fromData`, `Recipe.fromData`, `PlatPlan.parse` are **constructors**. Type-level; stay. |
| **bulk-payload accessors** — `Freshness.loadOf(slot)`, `Contamination.loadsFor(slot)`, `Cure.stateFor(slot)` … | 7 | ⭐ **`bulk.md` documents the design**: `BulkPayload` carries only what cannot derive, and *subsystems declare their own fields onto it*. Spoilage reaching into the payload it declared IS the pattern. `slot.freshnessLoad()` would make the bulk substrate know about spoilage. Stay. |
| **material-first lookups** — `Freshness.growthRate(material,…)`, `MaturationProfile.forMaterial` | 4 | a `Material` here is a **lookup value**, not the subject of a verb. Pure model arithmetic: scalars in, scalar out. Type-level; stay. |
| **ActiveRecord finders** on `Document` subclasses | 71 | see § Rung 4 — deliberate, documented in `TemplateApi`'s own docstring, and the abstract-base variants exist *because* `Document.find`'s polymorphic `this` cannot serve them. |
| **knowledge adapters** — `RecipeKnowledge.knowsOf(actor,…)`, `SpellKnowledge.*` | 7 | reads like a textbook object-verbs violation, and the object-verbs fix is worse: `actor.knowsRecipe(id)` puts a **crafting word in the kernel's `PersonaMixin`** — the documented wrong-host tell. The general surface (`chronicleEntries`, claims/deeds by key) is *already* on Persona; these translate a recipe id into a chronicle key, which is crafting's knowledge and correctly sits in crafting. Stay. |
| ⚠ **`Lock.issueKey` / `issueMasterKey`** | 2 | the one move this slate promised — and it is **wrong**. `BoundaryApi.issueKey(holder, …)` is `XApi.verb(subject, …)`, which is exactly what `lint:object-verbs` forbids and holds at **0**. Moving it would break a green gate to satisfy a softer rule. ⭐ And the docstring already recorded the reasoning: *"Ungated … issuers span kernel + pack controllers, a set no kernel gate can enumerate."* Stay. |
| **modality statics** — `VisionModality.canSee`, `lightAt`, `SmellModality.smellAt` … | 9 | same shape: `PerceptionApi.canSee(viewer, target)` is subject-first. ⚠ `canSee` is separately a **live defect** — it disagrees with `PerceptionApi.perceives` — but that is the concealment slate's, not a relocation. |
| **cross-controller helpers** — `CraftController.declineScene`, `LeaseController.isBuildingAgent` … | 4 | genuinely smelly: one controller reaching into a sibling's static. But every candidate home (`CraftingApi.declineScene(giver,…)`) is subject-first, and a shared controller base does not exist across the three. ⭐ Left as the one open item with no good answer — it wants a shared pack-lib class, which is a design question, not a move. |
| **no caller at all** | 2 | ✅ `Contamination.hostWaterActivity`, `Cure.ambientHumidityOf` → `@internal` (both are called by a module-level function in their own file, so `private` does not reach them). |

## ⭐⭐⭐ The conclusion, stated plainly

**After rungs 1–3, the remaining population is not an antipattern.** Nine
families were examined closely and eight held — four of them defended by
reasoning already written into the code or the subsystem docs, and one
(`Lock`) where the "fix" would have broken a gate that is currently green.

That is the honest end state of this sweep, and it is a better outcome
than a zero: **the invisible-surface problem was real and is fixed** (W2
made every value-class static visible; rungs 2–3 removed 101 that were
never surface at all), while the *relocation* half turned out to be a
solution in search of a problem.

⚠ **So the ratchet should stop being read as a burn-down to 0.** 462 is
approximately the floor, and the gate's job from here is what a ratchet is
actually for — **stopping growth**, so a new static has to argue for
itself.

## What is genuinely left

- the 4 cross-controller helpers (a design question)
- `VisionModality.canSee` vs `PerceptionApi.perceives` → the
  [concealment slate](../tails/concealment-detection-slate.md)
- `SchedulerApi` → `ActivityApi`, and the rest of
  [api-normalization](./api-normalization-slate.md) § 6.6

---

# ⭐⭐⭐ The remaining scope — written to survive a compaction

**Census at this point: 433 public statics · 75 declared `@internal` ·
ceiling 433.** Ruled OFF the table by the user (2026-09-14): the **71
record finders** on `Document` subclasses, and the **193 pure
value-arithmetic** statics (model namespaces — `Contamination.growthRate(
behavior, tempK, aw)` and its kin, scalars in, scalar out, no receiver to
put the verb on). Everything below is on the table.

⚠ **Read this first: my classifier was wrong in one direction, twice.**
Both tests read the *signature's first parameter*, so a static can touch
the world through a **later argument** (6 found) or through its **body**
(9 found) and still be filed "pure". A third error runs the other way:
the name heuristic (`resolve|find|load|…`) filed **pure functions** as
world-reaching. Any count below carries that uncertainty; re-derive
before trusting, and prefer reading the body over the signature.

## The inventory, decomposed

### 1 · Known pattern, no decision needed (≈11)

The gauge shape — a value bound to what it measures — is proven twice in
this build (`new Freshness(slot).load()`, `new Lock(kw, tech).issueKeyTo(holder)`).

| item | n | move |
|---|---|---|
| `Condition.matchesItem/holdsFor/contributionOf(data, item: Stuff)` | 3 | `new Condition(data).matchesItem(item)` |
| `EmoteGrammarRunner.bind/render(emote, …, speaker: Stuff)` | 2 | `new EmoteGrammarRunner(emote).bind(…)` |
| `Freshness.hostTemperatureK` · `Contamination.hostTemperatureK(host)` | 2 | thin thermal reads → the thermal mixin |
| ⚠ **never examined** — `Suppressions.fieldAt(place)`, `DormThemes.applyTo(room)`, `TravelNodes.of(o)` | 3 | ⭐ `TravelNodes.of` has ~129 call sites and looks like a **narrowing helper**, not a verb — check before touching |
| registry/cache mutators — `Construction.registerFabric`/`clearFabrics`, `Quantity.registerTagTable`, `Appearance.clearMemo`, `NameBank.clearCache`, `DialogueEffectRegistry.register` | 6 | module-level mutable state; a **real registry singleton**, not a class with a `Map` |

### 2 · Needs a decision first (≈20)

| item | n | the question |
|---|---|---|
| async persistence lookups — `NameBank.byKey`/`resolve`, `CreditRouting.resolve`, `OuterWarren.conditionOf`/`admitFor`, `HoldingWarren.entryRowOf`, `LaneCatalogue.exitBetween`, `Census.takeCensus` | 7 | are these record finders by another name (→ approved, stay) or Api surface? **They are not `Document` subclasses**, which is the only reason they are not already settled |
| singleton accessors — `DormWarren.resolve()`, `WikiRegistry.instance()`, `Realtor.offers()` | 3 | `X.resolve(): Promise<X>` is a singleton getter. `StuffApi.singletonSync` is the sanctioned path — do these route through it? |
| controller statics — `EnrollController.loadConfig`, `LeaseController.ascentRefusal`, `Login.generateGuestName` | 3 | controller-internal helpers; `private` or `@internal` unless a sibling calls them |
| settings/idiom reads — `Currency.compact`, `ConcealmentLevels.hiddenDefault` (`AppApi`), `Account.newId` (`SecurityApi.uuid`), `Light.bandFor` (`QuantityApi`) | 4 | ⭐ `Account.newId` is the same shape as `Lock.mintKeyway`, which **stayed**. Is reading a dial "the world"? |
| genuinely world-reading — `Freshness.nowSeconds`, `Appearance.currentGeneration` (clock), `Contamination.behaviorOf`, `BankingControllerBase.businessNamed` (registry) | 4 | these read the live world from a "pure" signature |

### 3 · Misclassified — probably belong with the 193 (4)

`AimResolution.resolve`, `Sharpness.resolve`, `GroundCharacter.resolve`,
`Sections.find` — caught by the **name** heuristic, not behaviour. Read
the bodies; if pure, they are settled and the count drops.

### 4 · The 36 vocabulary guards — an unruled widening

`Construction` ×4, `Channels` ×3, `Blessing`/`MagicGrid`/`ConcealmentLevels`/
`Account`/`Dose` ×2 each, then singles. ⚠ The user approved *"leave the
factories"*; **guards and lookups were my extension and were never
ruled on**. If cut back to construction-only, these 36 move.

## ⭐ Recommended order: the HARD ones first

Not the easy sells. The evidence from this build is unambiguous — every
mechanical batch (rungs 2 and 3) moved the number and taught nothing,
while every hard case surfaced a structural fact the codebase needed:

- `Character`'s mixin stack is **at TypeScript's instantiation limit**
  (one more compiles, two collapse it to `never`);
- `MakerMixin`/`CasterMixin` are **augment-gated**, so knowledge on them
  would vanish off-shift;
- `BoundaryApi` is in `lint:object-verbs`' exempt list, which I misread
  as **permission** rather than an accommodation;
- the affordance resolver's `pending-operand` check **ignored `default:`**,
  and would have demoted every defaulted-slot verb game-wide;
- `requires:` steers the **scope chain**, which is the whole subject of
  [explicit-targeting-slate](./explicit-targeting-slate.md).

⭐ And the practical argument: the hard ones need **conversation**, which
is cheap while the context is rich and expensive after a compaction. The
mechanical ones (§1) can be executed from this document alone.

**So: decide §2 and §4 in conversation, then run §1 and §3 unattended.**
