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
| controller statics — `EmbodyController.loadConfig`, `LeaseController.ascentRefusal`, `Login.generateGuestName` | 3 | controller-internal helpers; `private` or `@internal` unless a sibling calls them |
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


---

# ⭐⭐⭐ THE KILL LIST — ruled 2026-09-14, execute after the compaction

**The rule (user):** the only statics that stay are **type predicates over
a closed string union declared in the same file** (`isForm(s): s is
ConstructionForm`) — irreducible, because a TS predicate must name its
type. ⭐ Everything else **moves to the Api layer**, or is **deleted and
inlined into its caller** where there is ~1 caller and no duplication
saved.

Also still settled and off the table: the **71 record finders** on
`Document` subclasses, the **193 pure value-arithmetic** statics, and
**construction** (`of`/`from`/`parse`) that touches nothing.

**59 statics on the table** — 40 inline-and-delete,
19 move-to-Api.

⚠ **Two artefacts in the counts below.** `Document.find`/`findById` are
excluded here — they read as 0–1 callers only because callers use the
SUBCLASS name (`User.findById`), and they are approved record finders
anyway. And a caller count of 0 means *no non-test caller*: check for a
reflective or string-keyed reach before deleting (`cleanupOnDestruct`
nearly went that way).

## A · Delete and inline — 0 or 1 caller (40)

| static | callers | where |
|---|---|---|
| `Dyestuff.all` | 0 | — |
| `Freshness.growthRate` | 0 | — |
| `Freshness.isPerishable` | 0 | — |
| `Freshness.hostTemperatureK` | 0 | — |
| `LeaseController.ascentRefusal` | 0 | — |
| `MaturationProfile.all` | 0 | — |
| `MaturationProfile.forMaterial` | 0 | — |
| `NameBank.byKey` | 0 | — |
| `Realtor.offers` | 0 | — |
| `Account.newId` | 1 | BankingLogic.ts |
| `AimResolution.resolve` | 1 | CombatLogic.ts |
| `Appearance.clearMemo` | 1 | PackLogic.ts |
| `BankingControllerBase.businessNamed` | 1 | WalletController.ts |
| `BlendIdentity.keywordsOf` | 1 | scope-walk.ts |
| `BlendLabel.nutrientsOf` | 1 | Metabolic.ts |
| `BlendLabel.amountsOf` | 1 | NutritionLabel.ts |
| `BlendLabel.tagsOf` | 1 | CraftVessel.ts |
| `Census.takeCensus` | 1 | ResidencyLogic.ts |
| `ConcealmentLevels.hiddenDefault` | 1 | Exit.ts |
| `Condition.contributionOf` | 1 | ContractLogic.ts |
| `Condition.holdsFor` | 1 | ContractLogic.ts |
| `Construction.clearFabrics` | 1 | FabricCatalogue.ts |
| `Contamination.hostTemperatureK` | 1 | ButcherController.ts |
| `CreditRouting.resolve` | 1 | ProducerLogic.ts |
| `EmoteGrammarRunner.render` | 1 | Soul.ts |
| `EmbodyController.loadConfig` | 1 | Login.ts |
| `Expression.evaluate` | 1 | Interpreter.ts |
| `Freshness.waterActivityOf` | 1 | Contaminable.ts |
| `Freshness.advance` | 1 | ButcherController.ts |
| `Freshness.withDose` | 1 | EatController.ts |
| `Freshness.nowSeconds` | 1 | Contaminable.ts |
| `LaneCatalogue.exitBetween` | 1 | Journey.ts |
| `Light.bandFor` | 1 | VisionModality.ts |
| `NameBank.clearCache` | 1 | PackLogic.ts |
| `Prose.parse` | 1 | ProseLogic.ts |
| `Quantity.registerTagTable` | 1 | QuantityLogic.ts |
| `Sections.find` | 1 | WikiController.ts |
| `Sharpness.resolve` | 1 | CombatLogic.ts |
| `TravelNodes.of` | 1 | TeleportController.ts |
| `WikiRegistry.instance` | 1 | PackLogic.ts |

## B · Move to the owning Api (19)

| static | callers | where |
|---|---|---|
| `BlendIdentity.nameOf` | 2 | Metabolic.ts, scope-walk.ts |
| `BlendLabel.toxicityOf` | 2 | Metabolic.ts, NutritionLabel.ts |
| `Condition.matchesItem` | 2 | ContractLogic.ts, hauls.ts |
| `Construction.registerFabric` | 2 | Fabric.ts, FabricCatalogue.ts |
| `Contamination.behaviorOf` | 2 | Metabolic.ts, Vitals.ts |
| `DialogueEffectRegistry.register` | 2 | BankCounter.ts, Realtor.ts |
| `DormThemes.applyTo` | 2 | ProvisionController.ts, RemodelController.ts |
| `EmoteGrammarRunner.bind` | 2 | CommandGiver.ts, ReactController.ts |
| `GroundCharacter.resolve` | 2 | Field.ts, SoilChannelController.ts |
| `NameBank.resolve` | 2 | Login.ts, Species.ts |
| `Suppressions.fieldAt` | 2 | MagicLogic.ts, Vitals.ts |
| `BlendLabel.isEdible` | 3 | EatController.ts, NutritionLabel.ts, mustBeE |
| `DormWarren.resolve` | 3 | DormDoor.ts, FloorStairExit.ts, ProvisionCon |
| `Lock.mintKeyway` | 3 | LeaseController.ts, ProvisionController.ts,  |
| `Appearance.currentGeneration` | 4 | Identifiable.ts, MagicLogic.ts, RecognitionL |
| `DormWarren.peek` | 4 | DormDoor.ts, FloorStairExit.ts, ProvisionCon |
| `GroundCharacter.forZone` | 4 | Field.ts, FieldWorkController.ts, PlotContro |
| `BlendIdentity.appearanceOf` | 5 | DrinkController.ts, EatController.ts, FeedCo |
| `Currency.compact` | 21 | AppSettings.ts, Bank.ts, BankController.ts |

⭐ **`Currency.compact` (21 callers) is the one real job here** — every
other row is ≤5. It reads `AppApi.setting(bankingCompactCurrency)` and
falls back to "the only registered currency, else throw", so it is a
*settings read wearing a value-class name*: `BankingApi` is its home.

⚠ **`Lock.mintKeyway` is on this list**, and the user has pointed out
that Lock was my call and is not precedent. Under this ruling it moves
(it reaches `SecurityApi.uuid`), which is worth noting because
`issueKeyTo` was just moved ONTO `Lock` as an instance method — the two
are consistent only if you read `mintKeyway` as minting a token (an Api
act) and `issueKeyTo` as the lock handing out its own key (an instance
act). Re-decide it rather than inherit it.

## Order of execution

1. **A first** — 41 deletions, each one file, no design. Guard every
   zero-caller row with a string-literal grep before deleting.
2. **B second**, smallest first; `Currency.compact` last, alone, because
   21 call sites deserve their own diff.
3. Re-baseline the ceiling after each, and re-read § *The remaining
   scope*'s health warning: the classifier reads signatures, so confirm
   each row by opening the body.

---

# ⭐ PROGRESS — read this before the kill list above

**Ceiling: 563 → 343.** 144 statics declared `@internal`, **38** gates
green, tsc clean, eslint 0 errors, build clean. Branch
`build/lib-statics`, no MR opened.

## § A — DONE (all 40 rows)

⚠⚠ **Of the 40 rows filed "inline-and-delete", 5 actually were.** The
dispositions were guessed from caller counts and the **bodies overruled
them nearly every time**:

| what happened | n |
|---|---|
| `@internal` — one production caller **plus tests that white-box it** | 23 |
| `private` / `@internal` — zero callers outside the declaring file | 9 |
| ⭐ genuinely inlined + static deleted | 5 |
| `@internal` — inlining would have to **export a module-private helper** (`BlendIdentity.recipeOf`, `Census.regionOf`, `buildRenderContext`) | 3 |

⭐ **The rules that emerged, and they are not optional:**

1. **`private` requires ZERO callers outside the declaring file.** A row
   with one external caller is `@internal`. Four misfires this build; the
   compiler caught every one.
2. **A "0-caller" row is a `private`/`@internal` decision, never a
   deletion** — the count means *no caller outside the home file*, and
   same-file or test use is the norm.
3. **Inlining that exports a private helper fails the rule** — it trades
   one static for a wider surface.

## § B — 1 of 19 done

✅ `Currency.compact` → **`BankingApi.compactCurrency`**, 65 call sites. A
settings read (`AppApi` dial + "the only registered currency") wearing a
value class's name.

✅ **The 5 pack-blocked rows are UNBLOCKED and 3 of 5 are done**
(2026-09-14, `c7bf52e0c`). The federation shipped, and with it the answer
to *how a pack exposes anything*: a singleton declared with
`SingletonMixin`, reached by `StuffApi.singleton`.

| row | disposition |
|---|---|
| `DormThemes.applyTo` (+ `ids`, `labelOf`) | ✅ instance methods on a singleton `Idea` at `/world/terminus/eternal/duncan-hall/idea/dorm-themes` |
| `DormWarren.resolve` / `peek` | ✅ **deleted**, not converted — a singleton accessor cannot be an instance method, and both forwarded verbatim to `StuffApi.singleton` / `findByTemplatePath`. 8 call sites say it directly. |
| `GroundCharacter.forZone` | ⏸ **on the table, undecided** — a finder returning its own class. Same shape as the approved record finders, but not a `Document` subclass, which is the only reason it is not already settled (§2 above). |
| `GroundCharacter.resolve` | ⏸ **on the table, undecided** — takes a **null model** as its ordinary case, which is *why* it is static. Wants a conversation, not a guess. |

⭐ **Ceiling 392 → 387.**

## ✅ §B COMPLETE (2026-09-14) — 12 moved, 1 corrected, 1 deferred

**Ceiling 387 → 372.** What the bodies said, against what the row list
guessed:

| static | shipped disposition |
|---|---|
| `Contamination.behaviorOf` | `MaterialApi.pathogenBehaviorOf` |
| `BlendLabel.isEdible` / `toxicityOf` | `MaterialApi.blendEdibility` / `blendToxicity` |
| `BlendIdentity.nameOf` / `appearanceOf` / `disciplineOf` | `CraftingApi.blendName` / `blendAppearance` / `blendDiscipline` (the third was not on the list; leaving one of three behind made the class incoherent) |
| `Suppressions.fieldAt` | `MagicApi.suppressionAt` — ⭐ which **already existed** and already forwarded here. The static was a second, undocumented way in |
| `Appearance.currentGeneration` | `MagicApi.appearanceGeneration` |
| `NameBank.resolve` | `SpeciesApi.resolveNamePools` |
| `Lock.mintKeyway` | `BoundaryApi.mintKeyway` — re-decided, not inherited (below) |
| `Condition.matchesItem` | ⛔ **not an Api move** — a GAUGE (below) |
| `EmoteGrammarRunner.bind` | ⛔ **not an Api move** — a GAUGE (below) |
| `Construction.registerFabric` | ⛔ `@internal` with **no Api door** (below) |
| `DialogueEffectRegistry.register` | ⏸ **deferred** — head of the registry cluster |

### ⭐⭐ The pattern: the Api gets the DOOR, the body stays with its privates

Almost none of these bodies could move. Each sits on a module-private map
or helper — `Construction`'s `FABRICS`, `BlendLabel`'s `ingredientsOf`,
`BlendIdentity`'s `recipeOf`, `NameBank`'s `#cache` — and moving the body
would have to **export** it. That is the §A rule verbatim: *inlining that
exports a private helper fails the rule*.

So the shape is: the `lib/` static becomes `@internal`, and the Api gets
the callable door. ⭐ **The difference from §A's bare `@internal` is the
door** — §A hid 32 statics with nothing put in their place; these are
hidden *because* there is now somewhere visible to call.

### ⭐⭐⭐ `lint:object-verbs` overruled two rows, and it was right

`ContractApi.conditionMatchesItem(data, …)` and
`SoulApi.bindEmote(emote, …)` were written, and the gate **failed the
build**: a first parameter typed as a world object means *the verb is in
the wrong place*. The slate's own §1 had already said so — `new
Condition(data).matchesItem(item)`, `new EmoteGrammarRunner(emote).bind(…)`
— and §B's row list had overridden it.

Both are gauges now, and the gauge was the better outcome anyway: it took
**five** statics instead of two (`Condition`'s `watchHolds`/`countOf`/
`holdsFor` came with `matchesItem`; `EmoteGrammarRunner`'s `render` came
with `bind`), and added no Api surface at all.

### `Construction.registerFabric` — `@internal`, and deliberately no door

Its two callers are `Fabric.postRegister` and `FabricCatalogue.warm`: the
textile subsystem populating its own vocabulary at boot. Putting
`MaterialApi.registerFabric` in the generated docs would advertise a boot
seam as author surface. ⭐ **The fix for an invisible callable is not
always to make it callable by everyone.**

### `Lock.mintKeyway` — re-decided, with the line written down

It moves to `BoundaryApi.mintKeyway`, and the line that puts it there is:
**minting is an act on the world** (it reaches `SecurityApi.uuid`), so it
is the Api's; **issuing is the lock answering about itself**, so
`issueKeyTo` / `opensFor` stay instance methods. That is the whole reason
one moved and the others did not.

### ⚠⚠ The cycle this cost — read before adding an Api import to `lib/`

`api/mql/**` is imported by nearly everything low in the graph. An edge
from `scope-walk.ts` into `CraftingApi` pulls `CraftingLogic`'s whole
import graph in behind it and **closes a load-time cycle onto the mixin
factories**: `TypeError: ContainableMixin is not a function`, thrown at
import, in four validator suites. Found by bisection, not by reading.

Three call sites therefore keep calling the `@internal` static and must:
`api/mql/scope-walk.ts`, `lib/stuff/Stackable.ts` and
`lib/identification/Identifiable.ts` (the last two for the same reason,
one layer lower). ⭐ **The test before adding `import { XApi }` to a
`lib/` file: does anything below it import you?**

### ⏸ `DialogueEffectRegistry.register` — deferred, and why

It is a class with a `Map` and four statics — the **registry/cache
cluster** (~37 statics: `AccountBalance` ×8, the three standings ×3 each,
`DescriptorBank`, `SupplyAggregate`, `AppSettings`…) that the slate's §1
already calls *"a real registry singleton, not a class with a `Map`"* and
that the user has not ruled on. Deciding this one alone would prejudge
the other 36. It stays until that conversation.

---

**13 remained at the start of this pass**, each with a kernel home:

| Api | rows |
|---|---|
| `MaterialApi` | `Construction.registerFabric`, `Contamination.behaviorOf` |
| `CraftingApi` | `BlendIdentity.nameOf`, `appearanceOf` |
| `MagicApi` | `Suppressions.fieldAt`, `Appearance.currentGeneration` |
| `SpeciesApi` | `NameBank.resolve` |
| `SoulApi` | `EmoteGrammarRunner.bind` |
| `ContractApi` | `Condition.matchesItem` |
| `BoundaryApi` | ⚠ `Lock.mintKeyway` — **re-decide, do not inherit**; the user has noted `Lock` was the agent's call and is not precedent |
| **no home** | `BlendLabel.isEdible`/`toxicityOf` (metabolism has no Api), `DialogueEffectRegistry.register` (a registry, not an Api question) |

## ✅ The registry/cache cluster — RULED AND BUILT (2026-09-14)

**Ceiling 372 → 343.** ⚠ First: the "~37 statics in one cluster" figure
was wrong. Read against the bodies it is **36, and four different
things**, two of which were already-ruled categories I had misfiled.

| group | n | what it actually is |
|---|---|---|
| **A · sync read-index on a `Document`** | 27 | `AccountBalance` 8 · `DescriptorBank` 4 · `SupplyAggregate` 4 · `Renown`/`Producer`/`ParticipationStanding` 3×3 · `AppSettings` 2 |
| **B · registration seams** | 6 | `DialogueEffectRegistry` 3 · `Construction.fabric`/`fabricKeys` 2 · `Quantity.registerTagTable` 1 |
| **C · roster queries over live Stuff** | 2 | `MaturationProfile.byKey`/`cultureForStrain` — `findByPathGlob` finders, **no cache at all** |
| **D · misfiled** | 2 | `WaybillRegistry.legsOf` is pure string arithmetic; `DefaultCalendar.singleton()` is a lazy getter |

### ⭐⭐ The two findings that decided group A

1. **The warm-holder singleton already exists** for three of them.
   `RenownStandings`, `ProducerStandings` and `ParticipationStandings` are
   `PostRegistrationMixin` Ideas whose `postRegister` calls
   `RenownStanding.warm()`, with `canEvict` / `canDestruct` vetoes. So the
   shape was a **split-brain**: the singleton owned the lifecycle, the
   Document static owned the state.
2. ⚠⚠ **The index cannot live on the `XLogic` singleton** — the
   obvious-looking home. A logic singleton is *stateless by construction*
   so `dest` can reload it, and the next `singletonSync` builds a fresh
   one. A warmed index there would be **silently dropped on every hot
   reload**. Recorded on `WarmedIndex` so nobody re-derives it.

### What shipped: `lib/persistence/WarmedIndex.ts`

A value object owning the **storage** — the map, the atomic
`replaceWith`, `get`/`put`/`remove`, and a `warmed` flag that separates
*"empty because the world is fresh"* from *"empty because boot order is
wrong"*.

⭐ It does **not** own the warm, and that is the design, not a shortcut.
Each warm carries the invariant that is the point of its subsystem:
`SupplyAggregate` SUMS duplicate rows rather than taking the last (the
figure is the money supply, and last-wins silently dropped money);
`AccountBalance` THROWS on a currency-less row rather than running the
world on money whose denomination nobody knows; the standings join a
composite `subject|scope` key. Folding those into one loop would fold
away the three things worth reading.

⭐ **The best thing it bought was not the deduplication.**
`AccountBalance` kept `_cache` (balance) beside `_currencyCache`
(currency), keyed identically, with a comment calling the split
deliberate. Two maps can disagree about which accounts exist — and both
aggregates (`cachedTotalsByCurrency`, `cachedOverdraftByCurrency`) read
both. One index, one value shape, invariant gone.

⚠ And `cached()` now returns a `ReadonlyMap`, which **caught four tests
writing standings straight through the read accessor**
(`RenownStanding.cached().set(…)`). A read surface a caller can mutate is
not a read surface; those are a named, test-gated `_putForTesting` now.

### ⛔ Why NOT the mixin / base-class shape

The option was previewed as `class RenownStanding extends
WarmedIndex(Document)` promising −27 statics. Two problems, both found
while building:

1. ⚠⚠ **The −27 would have come from the GATE'S EXCLUSION, not from a
   fix.** `check-lib-statics` skips "statics inside a mixin factory's
   returned class expression" — *"out of scope by definition, not by
   oversight"*. Composing the mixin would move 27 statics behind that
   exclusion while leaving them exactly as callable and exactly as
   invisible. The ceiling would have fallen for a reason that is not the
   reason the ceiling exists.
2. A mixin over `Document` carries no `_mixinName` and is never walked by
   `queryMixins` — a **new module shape**, which CLAUDE.md says to get
   sign-off for. The value object fits the taxonomy's *named
   value-object* row with nothing to argue about.

So: the substrate kills the duplication, and the **`@internal` marking
does the ceiling work honestly**, each one naming the Api door that
replaced it (`BankingApi.balanceOf`, `RenownApi.renownOf`,
`ConsumerApi.participationOf`, `ProducerApi.producerOf`, `AppApi.setting`).

### The two that do NOT fit, and why it is written at their site

- **`AppSettings`** caches ONE ROW, not an index — the "index" would have
  a single entry under a constant key. Forcing the shape costs a real
  indirection to buy a false uniformity.
- **`DescriptorBank`** is **lazy-by-key** (`find({key})` on a miss,
  memoised) plus a boot prime, not warm-the-whole-collection. A bank is a
  big authored row and most worlds touch three; the index shape would
  load every bank at boot to serve a read that already answers in one
  query.

### Groups B, C, D

- **B → `@internal`, no door.** All six are `postRegister` registration
  seams. ⚠ Including `DialogueEffectRegistry.register`, which a PACK
  calls (terminus's `Realtor`): pack `src/` is code at the capability
  rung, not content, so a pack caller does not make a registration seam
  something a content author reaches for.
- **C → they stay.** Finders returning their own class over the live
  population — the record-finder shape one layer up from Documents. ⭐ A
  small widening of what was approved (Documents only), flagged as such.
- **D → they stay.** Both fall in categories already ruled off the table;
  including them in the cluster was my error.

## ✅ The 36 vocabulary guards — AUDITED 2026-09-14

**Nothing moved, and the ceiling did not change.** That is the finding,
not a dodge: read against the *signatures* rather than the *names*, every
one of the 36 resolves under a ruling already made — and three were
defective in a way no disposition would have caught.

| verdict | n | disposition |
|---|---|---|
| **A real type predicate over a closed string union declared in the same file** | 18 | ✅ **stay** — the explicit carve-out, now VERIFIED rather than assumed |
| **Pure value arithmetic wearing an `is` name** | 15 | ✅ **stay** — already ruled off the table with the other 193 |
| ⛔ **Defective — the predicate promises a check it does not make** | 3 | **fixed, not moved** |

### The 18 that earn the carve-out

`Blessing.isBand` · `Construction.isDeliveryForm` · `LandUses.isLandUse` ·
`WikiPage.isProtection` · `Faculty.isBand` · `MagicGrid.isVerb`/`isNoun` ·
`ConcealmentLevels.isLevel` · `Dose.isResponse` · `Grade.isBand` ·
`Resists.isAxis` · `Channels.isChannel`/`isMechanicalChannel`/
`isThermalChannel` · `MeasureChannels.isMeasureChannel` ·
`ScriptBuiltins.isBuiltin` · `CompetenceBand.isBand` · `TraitBand.isBand`.

Each was checked three ways: does it return `x is T`; is `T` a closed
string union; is that union declared in the same file. All three, all
eighteen.

### ⚠ The 15 were never vocabulary guards — they were in §4 by a NAMING accident

`isClean(loads)` · `hasOdds(odds)` · `hasActiveGrant(record, holder, now)` ·
`isCoveringForm` · `isFabricForm` · `isUntreated(cure)` · `isMelee(band)` ·
`isConcealed(level)` · `isEffective(spec, litres)` · `isEscrowAccount(id)` ·
`isSentinel(id)` · `isRecordCurrent(a, b)` · `isItemSlot(slot)` ·
`isAtTarget(census, …)` · `isReleased(path)`.

Every one is data in, boolean out, no world read — `isRecordCurrent` is
literally `a >= b`. They landed in "the 36 vocabulary guards" because the
census grouped by **name**, which is the exact error this slate's own
health warning names: *"the name heuristic filed pure functions as
world-reaching"*. They belong with the 193.

⚠ One nuance, stated rather than glossed: `isCoveringForm` and
`isFabricForm` read the module-level `FABRICS` registry a pack extends, so
"pure" is generous — they are vocabulary lookups over open state. They
touch no Stuff, no Document and no clock, which is the test that matters
here.

### ⛔⛔ The three defects — a predicate that promises a check it does not make

This is what the audit was actually worth.

**`Construction.isForm(s): s is ConstructionForm`** and
**`Techniques.isTechniqueName(s): s is Technique`** — and in both files
`ConstructionForm` / `Technique` **IS `string`**, because both vocabularies
are open by design (a pack registers a fabric; a technique word is
authored). So each predicate narrowed `string` to `string`: **a no-op
wearing a guarantee.** A reader of the signature believes a check has been
threaded into the type system; nothing has. Both now return `boolean`, and
⭐ **no call site lost anything** — all five use them as validators
(`if (!isForm(x)) throw`), never to narrow, which is also why nothing ever
noticed.

**`Disposition.isAxis(value: unknown): value is string`** — a real
narrowing, and a useless one: a caller who has just checked a value
against a nineteen-entry roster learns nothing from being told the result
is a string. ⭐ The roster was closed all along — nineteen authored
entries — and only its *typing* (`readonly DispositionAxis[]`) widened
every `key` to `string`. `as const satisfies` closes it, and `isAxis` now
narrows to a derived `DispositionAxisKey`. **It moves INTO the approved
category rather than out of the file.**

⭐ And the audit turned up a bystander: `lib/npc/tree.ts` re-implemented
the guard inline (`DISPOSITION_AXES.some((a) => a.key === key)`) — the
guard's body copied out, which is how a roster edit reaches one reader and
not the other. It calls `Disposition.isAxis` now.

## ✅ The formula dedupes — what the census was for (2026-09-14)

The census reported **15 names in more than one file**. These are the ones
where the definition could actually change; the rest are listed below with
why they stayed.

| what | was | now |
|---|---|---|
| `mix2` + `roll01` | **4 copies each**, kernel + 3 packs | `lib/Seeded.ts` — `Seeded.mix` / `Seeded.unit` |
| `decayWeight` ×3 + `decayFactor` (base 2) | 4 copies, 3 tiers | `lib/Decay.ts` — `Decay.byHalfLife` |
| Newton's cooling | **2 anonymous expressions** inside methods | `Decay.toward` |
| `mixColorTemperature` | byte-identical ×2 | `Light.mixColorTemperature` |
| `stackValue` | byte-identical ×2 | `Currency.stackValue` |

⭐⭐ **`mix2` was the one that mattered.** It is the determinism primitive
the whole procedural world rests on — *seed from the address, never roll
and store* — and it was written four times, module-private in each. Four
copies of a hash is not tidiness: **if one drifts, two subsystems
disagree about the same address**, and no test catches it because each
suite checks its own copy against itself.

⭐ **Newton's cooling is the one an index could never have found.** It was
a bare expression inside a method in both `Thermal` and
`ThermalRegulation` — no name, so nothing could see the two as the same
formula. Naming it was the fix; sharing it was the consequence.

### ⚠ What was deliberately NOT deduplicated, and the rule that decided it

> **Duplication matters when the definition could change.**

- `round1`/`round2` — **8 copies across four packs**, the most-repeated
  thing in the tree, and left alone. `Math.round(v * 100) / 100` cannot
  acquire a second opinion; a shared home would buy a kernel import for
  nothing.
- `bucketOf` ×2 — `Math.floor(a / b)` where the divisor is a *different
  dial* per subsystem. Sharing a one-liner across two configs buys
  nothing.
- `readInt` ×3 — two identical, one using `parseInt` and admitting
  non-positive values. Merging would be a **behaviour change** to
  `SandboxLogic`, not a dedupe. Wants `AppApi.settingInt` and a decision.
- `scoreEvents` ×3 — Consumer's is Producer's without `ev.weight`;
  Renown's is genuinely different. Unifying two subsystems' scoring is a
  design change.
- `getVolume` ×2 — Cartesian vs spherical. That is polymorphism.
- `linearToDb` ×2 — ⚠ **not a duplicate at all: the same name on two
  different functions** (`sourceDb + 10·log₁₀(τ)` vs `10·log₁₀(x)`). A
  false friend, worth a rename, not a merge.

### ⚠⚠ And the regression it surfaced — a THIRD binder victim

Running the pack suites found `farms.test.ts` failing, and a bisect showed
it was **pre-existing on this branch**, from the retail conversion:
`consign` gained a declared `shelf` arg, and three suites hand-build the
model and so skip the binder. `farms`, `cellars` and `restocks` all now
carry what the view would have bound.

⭐ The standing warning said *"expect the same for every remaining
conversion"* — and I had only checked CONTROLLER suites. **A brain suite
dispatches through `forceCommand` and is just as exposed.** Widen the
check to any suite that constructs a controller by hand.

## ⚠ Controller tests skip the BINDER — nine suites and counting

Every verb whose object became a declared arg broke its own unit tests,
because a controller test builds the model by hand and never runs the
binder. Fixed in `BuyController`, `Consignment`, `CheckRack`,
`MenuController`, `HouseAccount` and `trade-distilling` — **expect the
same for every remaining conversion.** The model must carry what the view
would have bound.

## ✅ The content-pack exposure gap — CLOSED 2026-09-14

A content pack can hold **no Api, no logic singleton, and no free
exported function** (`CLAUDE.md § Module Categories`). So when a pack
class needs to expose anything to callers outside itself, the only
mechanisms it has are a **public static** or an **instance method on a
Stuff**. That is why the 5 blocked rows exist, and it is the same gap
that stops `requires:` naming a pack mixin (the gate reads the **kernel**
`Mixins` registry) and stopped `ship.yaml` declaring its object arg.

⭐ **Three separate symptoms, one cause.** Worth treating as its own
design question rather than routing around three times — see
[content-packs-slate](./content-packs-slate.md).

✅ **Built.** The mixin namespace is federated (`PackApi` registers every
`_mixinName` under a discovered pack's `src/`; `lint:mixin-names` holds
the flat namespace collision-free), and a pack exposes logic as a
singleton declared with `SingletonMixin`. All three symptoms are gone.
Read [content-packs-slate § ✅ BUILT](./content-packs-slate.md) for what
shipped and, more usefully, **the one place the recorded plan was wrong**
— registration had to move from install to discovery, because the offline
command preload parses pack views before anything is installed.
