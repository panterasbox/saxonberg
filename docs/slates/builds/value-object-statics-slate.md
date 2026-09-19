# `lib/` statics — `callable == visible` is broken in 159 classes

> **Status: PARTIAL** — the sweep ran and merged (`build/lib-statics`,
> 2026-09-14): `lint:lib-statics` holds at **ceiling 337** (from 563;
> 175 declared `@internal`), the invisible-surface problem is fixed (every
> value-class static is a `value-static` in the author surface), and the
> doctrine lives in [antipatterns.md](../../antipatterns.md) § *A public
> `static` on a `lib/` value class* and [lint-family.md](../../lint-family.md)
> § `lint:lib-statics` / § *Three ways a census lies*. The gate's job from
> here is stopping growth, not burning down. ⚠ `antipatterns.md` still
> says *"see the slate for the ladder"* — the ladder below is kept for
> that reason and is in the compaction ledger's handoff. *(Compacted
> 2026-09-19; ledger: `docs/plans/slate-compaction/unlinked-1.md`.)*
> **Left:** `GroundCharacter.forZone` / `resolve` (a finder returning its
> own class that is not a `Document`; a null-model static) · the unruled
> async lookups `OuterWarren.conditionOf` / `admitFor`,
> `HoldingWarren.entryRowOf` · `Login.generateGuestName` · `readInt` ×3 →
> `AppApi.settingInt` (a behaviour change to `SandboxLogic`) · the
> `linearToDb` false-friend rename · `scoreEvents` ×3 (a design change)
> **Size:** a tail

**Raised by:** the user, reviewing MR !255, 2026-09-11
**Census:** `pnpm -C packages/server lint:lib-statics` (gate) ·
`… exec tsx scripts/check-lib-statics.ts --report` (the roster)

> **A public `static` on a non-`Api` class is callable by anyone and
> visible to nobody.**

---

## The ruling · the mechanism · the census · the waves · the decisions

*Shipped and documented — the two calling surfaces, the projection snippet and *construction is an Api concern* are verbatim in [antipatterns.md](../../antipatterns.md) § *A public `static` on a `lib/` value class* (563 statics / 159 classes → 337); the gate, its scope (kernel `lib/` + `platform/` + every pack's `src/`), the type-vs-world test, the `value-static` consumer kind and the mixin-factory exclusion (D2, D4) are [lint-family.md](../../lint-family.md) § `lint:lib-statics`; the census-lies lessons (D3) are its § *Three ways a census lies*. D1 — an Api face is decided by WHERE the class is declared, not its name (the `Mml` hole) — is undocumented and sits in the compaction ledger's handoff. W2–W4 were superseded by the disposition ladder below.*

## ⚠ Homes that do not exist yet

*Superseded — none of the six needed an Api (§ *not one of the 18 homeless subsystems* below); `TraitApi` was retired outright. The worked example (`NounPhrase` → `GrammarApi`) is [presentation.md](../../subsystems/presentation.md) and [antipatterns.md](../../antipatterns.md) § *A public `static` on a `lib/` value class*, which also carries the "run `pnpm lint` too" trap.*

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

## The ladder

*Graduated to [antipatterns.md § A public `static` on a `lib/` value class](../../antipatterns.md) (2026-09) — the ladder, the three rules, the door pattern, the three irreducible shapes and the record-finder ruling now live there.*

## What the ratchet is counting now

*The ceiling is 337 and its job is stopping growth, not burning down — [lint-family.md](../../lint-family.md) § `lint:lib-statics`. Every value-class static is admitted to the author surface as a `value-static`, so none is invisible any more.*

# The 123, one family at a time — and why almost none of them moved

*Decided in the build and recorded at the sites: the bulk-payload accessors stay (`bulk.md`), the record finders stay (`TemplateApi`'s docstring), the knowledge adapters stay in crafting, the cross-controller helpers resolved (`lib/craft/CraftingDecline.ts` — vocabulary, not a verb; `isBuildingAgent` → `AccessLogic.isAgentOf`), `VisionModality.canSee` is an instance method (its disagreement with `PerceptionApi.perceives` is the [concealment slate](../tails/concealment-detection-slate.md)'s), `SchedulerApi` → `ActivityApi` is [api-normalization](./api-normalization-slate.md) § 6.6's. ⚠ The `Lock` row's "stay" was later REVERSED — `mintKeyway` moved to `BoundaryApi` (minting is an act on the world; issuing is the lock answering about itself), and `boundary.md:59` still says `Lock.mintKeyway()`.*

---

# ⭐⭐⭐ The remaining scope

*Census now: `pnpm -C packages/server lint:lib-statics` → **337** public statics (ceiling 337) · 175 declared `@internal`. The 71 record finders, the pure value-arithmetic statics and touch-nothing construction are ruled off the table. What follows is what was still open when the build merged.*

## The inventory, decomposed

### 1 · Known pattern, no decision needed

*Executed in §A/§B (gauges: `new Condition(data).matchesItem(item)`, `new EmoteGrammarRunner(emote).bind(…)`; `DormThemes` → a singleton `Idea`; `DormWarren.resolve`/`peek` deleted; the registry mutators `@internal`). ⚠ `TravelNodes.of`'s "~129 call sites" was a bad grep that counted the TYPE — it had zero and was inlined (sweep commit `708d805f4`).*

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

### 4 · The 36 vocabulary guards

*Audited 2026-09-14 — nothing moved; see the audit note below.*

# ⭐⭐⭐ THE KILL LIST — ruled 2026-09-14

*Executed — see PROGRESS below. The ruling that stays: the only statics that remain are type predicates over a closed same-file string union, record finders on `Document` subclasses, pure value arithmetic, and construction that touches nothing ([antipatterns.md](../../antipatterns.md) § *A public `static` on a `lib/` value class*).*

---

# ⭐ PROGRESS

*The kill list was executed in full — §A all 40 rows, §B 12 moved / 1 corrected / 1 deferred-then-ruled — and the build merged (`build/lib-statics`, 2026-09-14). The rules it paid for are in [antipatterns.md](../../antipatterns.md) § *A public `static` on a `lib/` value class* (the door pattern's cycle trap, 40→5) and [lint-family.md](../../lint-family.md) § *Three ways a census lies*; the three `private`/`@internal` rules, the door pattern, `Construction.registerFabric`'s no-door ruling and the `Lock.mintKeyway` line are in the compaction ledger's handoff. ⏸ Still undecided from §B: `GroundCharacter.forZone` / `resolve` (`trade-farming/src/idea/GroundCharacter.ts:202,233`).*

## ✅ The registry/cache cluster — RULED AND BUILT (2026-09-14)

*Shipped — `lib/persistence/WarmedIndex.ts` owns the storage and deliberately not the warm: [architecture.md](../../architecture.md) l.167, [banking.md](../../subsystems/banking.md) § the balance index, [renown.md](../../subsystems/renown.md) l.76; the hot-reload reason it cannot live on an `XLogic` singleton is on `WarmedIndex` itself and in the compaction ledger's handoff. Groups B/C/D: `@internal` with no door · stay · stay.*

## ✅ The 36 vocabulary guards — AUDITED 2026-09-14

*Shipped — nothing moved; the three defective predicates (`Construction.isForm`, `Techniques.isTechniqueName`, `Disposition.isAxis`) were fixed in place, and the naming-accident lesson is [lint-family.md](../../lint-family.md) § *Three ways a census lies*.*

## ✅ The formula dedupes — what the census was for (2026-09-14)

*Shipped — `lib/Seeded.ts` (`Seeded.mix` / `unit`), `lib/Decay.ts` (`Decay.byHalfLife` / `toward`), `Light.mixColorTemperature`, `Currency.stackValue`: [architecture.md](../../architecture.md) § the `lib/` value objects (l.160–164).*

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

*The binder-skipping test class is now a gate — `lint:binder-models` (ceiling 0, raised by declaring an object arg): [lint-family.md](../../lint-family.md) § `lint:binder-models`, [testing.md](../../testing.md).*

## ✅ The content-pack exposure gap — CLOSED 2026-09-14

*Shipped — the federated mixin namespace + `SingletonMixin` for pack logic: [content-packs.md](../../subsystems/content-packs.md), [mixins.md](../../subsystems/mixins.md).*
