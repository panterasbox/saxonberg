# Reference-lifetime — implementation plan

> Phase 3 of the feature cycle. Source:
> [reference-lifetime-requirements.md](../requirements/reference-lifetime-requirements.md).
> Produced by the Plan subagent 2026-08-01, then amended with the four
> decisions it escalated (see "Decisions on the escalated questions").

## Findings that changed the requirements

The plan pass verified the census and the requirements against the tree
and found **three defects and one genuine gap**. All four are corrected
in the requirements; they are restated here because the waves depend on
them.

### F1 (scope relief) — the class-expression constraint does not touch the codemod

D6 rules decorators out because of TS1206. That is settled *design*, and
it has **no bearing on the codemod**: `static fieldMeta = {…}` is a
`PropertyDeclaration`, and `ts.ClassDeclaration` / `ts.ClassExpression`
expose `.members` identically. The "7 extending a composed base" and "1
whose `extends` wraps a line" are equally irrelevant — the codemod never
touches heritage clauses. Do not over-engineer for this.

### F2 (DEFECT — silent data loss) — the merge must be property-level

R1 said "concrete-class-first wins" at **field** granularity. There is a
live case that breaks: `lib/equipment/Weapon.ts:80-88` declares
`fieldMarshallers` for `mass`, while `mass` is *persistent* on
`lib/material/Tangible.ts:105`. Field-level first-wins means Weapon's
`{marshaller}` shadows Tangible's `{persistent: true}` and **`mass` stops
persisting on every weapon in the game** — silently, inside a 240-file
diff.

> **Corrected rule: merge each descriptor's PROPERTIES independently,
> first-declaration-wins per property.** Booleans first-wins ≡ union
> (nothing declares `false`); `marshaller` first-wins ≡ today's
> `getAllFieldMarshallers`; `ref`/`lifetime`/`inverse` first-wins ≡ the
> "subclass may sharpen" rule R1 wanted.

**Key order is load-bearing.** `getAllPersistentFields` returns
concrete-first chain order and `PersistentHydrator` Phase 1 applies in
that order. The codemod emits keys per class body as: `persistentFields`
in declared order → `instructionFields` → `globIdentityFields` →
`fieldMarshallers` keys not already emitted. Then
`Object.keys(merged).filter(k => merged[k].persistent)` reproduces
today's array **exactly** — directly assertable.

### F3 (DEFECT) — `lifetime` cannot be single-valued

Three shipped sites already carry two rules, and `ref-shapes.md`'s own
table says so ("R2.2 symmetric **+** R2.3 self-heal getters"):

- `Hauler._hauling` / `Haulable._hauledBy` — symmetric destruct **and**
  self-heal getters on both sides.
- `Containable.environment` — self-heal getter **and** R2.4 cleanup.
- `Boundary.anchorA/anchorB` — `onDestruct` does `detach()` (symmetric)
  **then** destructs each anchor (owned), on the same two fields.

> **Corrected: read-side self-heal is the DEFAULT for every
> `ref: 'instance'` single-ref field.** Axis 2 then names only the
> *destruct-side* rule — `weak` means "no destruct-side rule", and
> `symmetric`/`owned` fields self-heal on read as well.

Scoped to **single refs only**. Pruning `Exitable.exits` (a Map) on every
read is O(n) on the exit-listing hot path and buys nothing the R2.4
chokepoints don't already give. Collections get destruct-side rules only.

### F4 (DEFECT) — R5's coexistence claim was false; slot 2.5 double-fires

R5 asserted hand-written R2.1 lives in `onDestruct` "which is how every
current R2.1 site is written". It isn't:

| hand-written in | vs slot 2.5 | safe un-migrated? |
|---|---|---|
| **`onDestruct`** (slot 2) — `Exitable`, `Adornable`, `Boundary`, `Exit`, `Hauler`, `Haulable`, `Species`, `Location`, `SandboxCrossing` | runs **before** 2.5, and each clears its slot | **Yes** — 2.5 sees null/empty, no-ops |
| **`cleanupOnDestruct`** (slot 3) — `Aether`, `Warren`, `Container`, `Containable`, `Spawned`, `WarrenMember`, `AetherHosted`, `Slottable`, `Slotted`, `Persistable` | runs **after** 2.5 | **No** — 2.5 fires first, then slot 3 walks destroyed objects and `StuffApi.destruct` throws |

> **Migration rule is direction-dependent.** An `onDestruct`-form site may
> be converted in two steps (declare, then delete). A
> `cleanupOnDestruct`-form site must be converted **atomically** —
> declaration in and handler out in the same commit.

Belt and braces regardless: slot 2.5 skips `isDestroyed()` targets,
treats null/empty as no-op, and clears the slot afterwards. That makes
un-migrated `onDestruct` sites provably inert and downgrades a missed
`cleanupOnDestruct` site from a throw to a skip.

### F5 (GAP) — R4 never said *how* `weak` self-heals

Determines whether W4 is 6 files or 300. Investigated:

- **Prototype accessor pair — dead.** `tsconfig.base.json` targets ES2022
  without `useDefineForClassFields`, so it defaults `true`: class fields
  are own data properties and **shadow** prototype accessors.
- **Per-instance accessor install — works, bad side effect.**
  `ProxyApi.wrap`'s get trap (`api/proxy.ts:149-177`) finds
  `descriptor.get` and routes through `#runPipeline` with
  `isGetter: true` — a plain field read would start running call-security
  on the hottest path in the engine.
- **Proxy get trap — chosen.** `this` inside every mixin method already
  *is* the proxy, so `this._x` reads already traverse the trap. Cost made
  ~zero by computing the weak-field set **once per `wrap()`** into the
  handler closure (as `wrapperCache` already is) and guarding with
  `if (weakFields !== null && weakFields.has(prop))`.

Cycle hazard: `api/proxy.ts` imports only `SecurityApi`; a value import
of `MixinApi` would create `proxy → mixin → security → proxy`. **Avoided
by passing the set in**: `ProxyApi.wrap(raw, weakFields?)`, computed by
the two callers (`api/stuff.ts:589`, `:689`) via a memoized
`MixinApi.getWeakRefFields(ctor)`. No new Api, no new import edge.

**Known gap to document**: reads on the **raw** target
(`Stuff.RAW_TARGET`, `ProxyApi.unwrap`, `ResidencyLogic`'s deliberately
raw sweeps) do not heal.

### F6 — three smaller corrections

- **R9's doc sweep undercounts**: 12 subsystem docs + `CLAUDE.md` + 6
  slates **+ 24 source files** carry the `Pattern A/B/C` vocabulary.
- **`Exit.onDestruct` (:703) and `Boundary.onDestruct` (:219) never call
  `super.onDestruct()`** — pre-existing latent chain breaks in this
  build's blast radius. Note; do not fix here.
- **`Exit.canEvict` (:208-216) goes partly dead** once `source` is weak
  (the read self-heals, so `!this.source` catches both branches). A clean
  equivalence proof point — but the R6 regression test must be written
  *before* it or the evidence is lost.

### Verified counts

193/15/8/3 is correct **for non-test files**; including `__tests__` it is
231/16/10/7, and the **union of all files declaring any of the four is
240** (201 non-test, 39 test).

## Decisions on the escalated questions

| # | Question | Decision |
|---|---|---|
| Q1 | F3 — default self-heal, or `lifetime` becomes a set? | **Default self-heal.** Smaller change, matches all three counter-examples, and keeps the declaration one value. |
| Q2 | F5 — proxy trap or per-instance accessor? | **Proxy trap**, with the `wrap(stuff, weakFields?)` parameter. The accessor install drags plain field reads into the security pipeline — unacceptable on that path. |
| Q3 | W7c registries — prune or declare? | **Finish the read-side prune**, do not declare. A registry keyed by a live Stuff is an *index*, not a reference: it does not own its keys (`owned` is wrong) and `Interactive` must not grow a back-ref (`symmetric` is wrong). **Also fix the real leak the census found**: `Interactive.onDestruct` (:171) does not call `teardownSubstrateState` (:164), which is what the three registries rely on. |
| Q4 | Slot 2.5 internal ordering, and Aether's pre-clear | **Symmetric clears run before owned cascades within 2.5**, and this is specified, not incidental: an owned cascade destroys its targets, so a back-ref clear scheduled after it would operate on destroyed objects. With that order fixed, `Aether`'s `u.setHost(null)` pre-clear **is** expressible as `symmetric` on `AetherHosted._host`. |

## The waves

Each wave is one green, reviewable commit (or a short named sequence).
`pnpm build` + the relevant chunk gate every one. Chunks: `src/mud/api`,
`src/mud/obj`, `src/mud/lib`, and
`src/mud/cmd`+`src/mud/domain`+`src/backend`+`src/services`. **Never
`pnpm test` in one pass on this box.**

### W0 — Pin the ground truth (tests only)

Everything the build must not change gets an assertion first.

- `scripts/check-field-meta.ts` in `--snapshot` mode, following
  `check-module-scope.ts` exactly (`tsx` + `ts` compiler API +
  `readdirSync`; no new dependency). For **every class body** across the
  240 files emit `{file, className, persistentFields[],
  fieldMarshallers{}, instructionFields[], globIdentityFields[]}`, using
  the initializer's **source text** for marshaller values (they are
  expressions — `QuantityMarshaller.pathFor('kg')` — not literals).
  Checked in as `scripts/__fixtures__/field-meta-golden.json`.
- `lib/stuff/__tests__/residencyVetoes.test.ts` — **extend**. It already
  covers `Container` non-empty and `Exit` live-source. Add the two
  carve-outs R6 names and it misses: a `Persistable` container with
  contents **not** vetoing, and an unbound `Exit` being cullable.
- `lib/stuff/__tests__/refLifetime.pins.test.ts` — new. One `it` per
  shipped site asserting *current* behaviour through the public surface.

**Risk**: pinning wrong behaviour freezes a bug. Write every pin from the
*doc's* claim; a pin that fails on master is a **finding**, not a reason
to adjust the assertion.

**Verified by**: all chunks green; the golden file regenerates
byte-identically on a second run.

### W0b — WireBody / Shade constructor fix (independent)

First and separate: unrelated to `fieldMeta`, ~10 lines, and it exercises
the mortality + sandbox-crossing paths early.

Files: `lib/sandbox/WireBody.ts` (:74-93), `lib/mortality/Shade.ts`
(:63-79), `obj/api/SandboxLogic.ts` (:338), `obj/api/ConditionLogic.ts`
(:594), `lib/mortality/__tests__/Shade.composition.test.ts` (:63). Only
one production construction site each.

1. `constructor(playerId: string, species: Species | null)` — both
   **required** (`species` explicitly nullable; both call sites pass a
   possibly-null `getSpecies()`). Drop the `if (x)` guards.
2. Delete the `context?.playerId ?? this.wirePlayerId` merge. Keep the
   deliberate `{...context, playerId: undefined}` suppression and
   document why.
3. **Null the ctor field immediately after `setSpecies()`.** The
   substantive fix: `ref-shapes.md` A.4's "not an instance of this
   antipattern" carve-out only holds if the ctor-held live `Species` ref
   is genuinely transient. Today it is retained for the object's life.

**Verified by**: `src/mud/obj` + `src/mud/api` chunks (covers
`sandbox.crossing.test.ts`) + `e2e/tests/mortality.spec.ts`.

### W1 — `FieldMeta` type + `getAllFieldMeta`, purely additive

- `lib/mixin.ts` — export `FieldMetaEntry` / `FieldMeta`. CLAUDE.md names
  this module as shared mixin infrastructure, and it keeps 200+ `lib/`
  mixins from importing an annotation out of `api/`.
- `api/mixin.ts` — `getAllFieldMeta(ctor)` immediately above
  `getAllPersistentFields` (:514), mirroring its four invariants
  byte-for-byte. Merge **per F2**: property-level, first-wins.
- `api/__tests__/mixin.fieldMeta.test.ts` — synthetic 3-deep chains.
  **The `Weapon.mass` shape is the headline case**: base declares
  `{persistent:true}`, subclass declares `{marshaller}`, result must
  carry both.

### W2 — THE CODEMOD. One atomic commit, no behaviour change

The commit the whole sequencing exists to isolate.

**Why it cannot be split**: the four collectors must flip from "read
legacy static" to "derive from `fieldMeta`" at the same instant the
statics disappear. Splitting by directory needs a transitional read-both
collector, which D2 forbids — and the golden master is a *stronger*
guarantee than within-wave bisectability. **Keep D2 as written.**

1. **The transform**, `scripts/codemod-field-meta.ts` (lives on the
   branch so reviewers can re-run it; deleted at the sweep). Per class
   body: collect the four statics; emit one `static fieldMeta` at the
   **text position of the first** node it replaces, preserving that
   node's leading JSDoc; key order per F2; values copied as **source
   text**, never re-serialized; `= []` (59 files) → `= {}`; delete the
   other nodes and their trivia; add the `import type { FieldMeta }`
   when absent.
2. **The core rewire** (~120 lines, hand-written): the four collectors
   become thin derivations, **signatures unchanged** so ~50 call sites
   don't move. `getPersistenceContributors` (:551) keeps its per-layer
   walk (it needs own-`_mixinName` ownership the flattened map loses)
   but reads each layer's **own** `fieldMeta` filtered on `persistent`.
3. **The two non-MixinApi readers**: `obj/api/StudioLogic.ts:1204-1226`
   (`ownArray(m,'persistentFields')` per layer), and ~25 test files
   asserting `C.persistentFields` directly — rewritten to assert through
   `MixinApi.getAllPersistentFields(C)`. They were reaching past the
   accessor already; this is what makes acceptance criterion 1
   achievable.

Then `pnpm format` over exactly the touched files.

**Validation** — three passes, because 240 files of persistence is not
reviewable as one blob:

1. **Mechanical proof.** `check-field-meta.ts --verify` re-derives the
   W0 record from the *post*-codemod AST and diffs against the golden
   file. A per-class-body **syntactic equivalence proof**, independent of
   the runtime. Catches every dropped field, reordered key, and mangled
   marshaller expression. **The highest-value artifact in the build.**
2. **Bulk-vs-bespoke split.** ~236 mechanical files spot-checked by
   sampling; the ~8 hand-edited files reviewed line by line. Call the
   split out in the commit message.
3. **Shape census.** The codemod prints a histogram of input forms
   consumed. If the total ≠ statics found, it silently skipped
   something.

Re-runnability: pure AST → text-range edits, no state, plus a `--check`
mode. Running twice must be a no-op.

**Gate**: `lint:field-meta` (CI-gating) failing on a surviving legacy
static or a `fieldMeta` key matching no declared field/accessor.

**Verified by**: `--verify` clean · four chunks · `pnpm build` ·
`pnpm lint` · `pnpm e2e` · re-run is a no-op.

### W2c — Fold the TSDoc field tags (D8)

Its own commit, its own golden master, after W2 so the two transforms are
separately bisectable.

- Extend `check-field-meta.ts --snapshot` to also record, per class body,
  the `@authorable` / `@authorable ref:<T>` / `@runtimeState` markers **as
  `StudioLogic.scanClassification` currently resolves them** — including
  its underscore-insensitive candidate expansion and its `apply<Field>` →
  field mapping. The golden master must capture the *current* resolution,
  quirks and all, or the diff cannot prove equivalence.
- Codemod pass 2: fold each marker into the owning field's `fieldMeta`
  entry (`authorable`, `authorPicker`, `runtimeState`) and **strip the tag
  from the JSDoc**, leaving the prose.
- Delete `scanClassification` (`obj/api/StudioLogic.ts:164`), its
  `walkTsFiles` traversal, and the `authorable-fields.json` cache
  (:125). The Studio reads `MixinApi.getAllFieldMeta`.

**Verify first, before deleting the scan**: the scan reads *source*, so it
can see fields on classes that are never loaded, whereas
`getAllFieldMeta` needs a constructor. Assert the post-fold catalogue is
set-equal to the pre-fold one; any class present only in the scan is a
finding to report, not a diff to accept.

**Risk**: the regex scan's name-guessing may bind a tag to a field the
declaration will bind differently. That is exactly what the golden-master
diff surfaces — and where it differs, the *declaration* is right and the
scan was wrong; record each such case in the commit message rather than
"fixing" the declaration to match.

### W2b — Doc vocabulary sweep (docs + comments only)

Its own commit so the codemod diff stays pure. 12 subsystem docs,
`CLAUDE.md`'s ref-shapes map entry, 6 slates, and the **24 source files**
carrying the pattern letters. Also `Containable.ts:210-212`, whose
comment references a `_restingOnPath` field and a `static
persistentFields` that do not exist there — now doubly stale.

The rest of `ref-shapes.md` lands **wave by wave with the code that makes
each claim true**, so the doc is never ahead of the tree.
`architecture.md`, `residency.md` and the slate corrections land at the
pre-merge sweep per workflow.md §5.

### W3 — R7 validation, before any `ref` is declared

`api/mixin.ts` — `#validateFieldMeta(ctor)` called from
`assertComposable`, which `StuffApi.register` (:759) already invokes once
per class and memoizes on constructor identity. That memo is already
HMR-correct (a reloaded module yields a fresh identity) — reuse it.

Throws naming field, class, and ref-shapes.md on: `instance` +
`persistent`; `identity` + any `lifetime`; `symmetric` without
`inverse`; an `inverse` whose target is not a reciprocal `symmetric`.

**Note**: the reciprocal check needs the *target's* fieldMeta, reachable
only for a same-class pair. A cross-class pair (`Adornment.adornedTo` ↔
`Adornable.fixtureSlots`) lives on different hosts and registration of
one cannot see the other. **Same-class at registration; cross-class in
`lint:field-meta`**, which sees the whole tree statically. R7 conflated
these.

Lands inert — nothing declares `ref` yet.

### W4 — `weak`: mechanism, then the six shipped getters

**W4a — mechanism, inert.** `MixinApi.getWeakRefFields(ctor)` (memoized
`WeakMap`, `null` when empty); `ProxyApi.wrap(stuff, weakFields?)` gains
the param and the closure-hoisted guard (`api/proxy.ts:149`); the two
callers compute and pass it. No production class declares one yet, so the
guard is provably a no-op. Run all four chunks — a regression here shows
up everywhere at once, which is why it lands alone.

**W4b — convert the six.** `Containable.environment`,
`Containable._restingOn`, `Spawned._spawner`, `Hauler._hauling`,
`Haulable._hauledBy`, `WarrenMember`'s warren ref. **Keep the
hand-written heals in this commit** and add a test proving the proxy
heals independently; delete the six bodies in the same commit after.

**Risk**: F5's raw-target gap. `obj/api/ResidencyLogic.ts` deliberately
walks raw proxies — audit its reads of these six before deleting.

**Verified by**: acceptance criterion 3 — **the existing tests for these
six pass untouched**. Plus the W0 pins. `ref-shapes.md`'s R2.3 section
rewritten as a declaration and the missing `getRestingOn()` exemplar
added, same commit.

### W5 — Slot 2.5: the destruct-side engine, zero declarations

`api/stuff.ts` — private `static #applyDeclaredRefCleanup(object)`,
invoked between `callDestructHook(object,'onDestruct')` and the mixin
cleanup walk in `#destructCore` (:838). Inline in `StuffApi` (no new
module, no new Api); the mixin walk is the precedent. Update the
slot-order doc comment (:834-848) to name 2.5.

Semantics:
- entries with `ref === 'instance'` and a `lifetime`;
- null / undefined / empty → no-op;
- **skip any target where `isDestroyed()`**;
- **all `symmetric` clears run before all `owned` cascades** (Q4);
- `symmetric`: clear the `inverse` on each target (single → null;
  Set/Map/Array → delete this holder);
- `owned`: `StuffApi.destruct(target)` per target;
- support lone ref, `Array`, `Set`, `Map`;
- **clear the holder's own slot afterwards**;
- **exception policy matches slot 3**: try/catch per field,
  `console.error` with field + stuff id, continue; `destroy()` always
  runs;
- every `owned` destruct logs holder+target at `console.debug` through
  W6/W7 — the cheapest tripwire for a mis-declared `owned`. Removed at
  the sweep.

Lands inert: no class declares a `lifetime`, so the loop body never
executes on a real object.

### W5b — `super.onDestruct()` (D10)

Two lines. `lib/boundary/Exit.ts:703` and `lib/boundary/Boundary.ts:219`
never chain. Landing it *before* W6 converts those two files means the
chain is correct when the declarations arrive, and a W6 regression cannot
be confused with this pre-existing break.

### W6 — Convert the shipped-correct sites (the fidelity proof)

Correct sites go **first**: they are the only places where "did the
mechanism reproduce the behaviour?" has an existing answer. W0's pins are
the oracle. One relationship per commit.

| # | Site | Form | Declaration | Note |
|---|---|---|---|---|
| 1 | `Hauler._hauling` ↔ `Haulable._hauledBy` | `onDestruct` | `symmetric` mutual | Cleanest pair in the tree. `hitch`/`unhitch` stay — atomic setter, not cleanup |
| 2 | `BoundaryAnchor.boundary` | `onDestruct` :124 | `symmetric` | |
| 3 | `Exit.inverse` | `onDestruct` :703 | `symmetric` | Today **half**-symmetric; declaring makes it whole — a real behaviour change, needs a new test not just a pin |
| 4 | `Exitable.exits` | `onDestruct` :765 | `owned` (Map) | The `inverse.setBlocked(true)` pre-pass stays hand-written |
| 5 | `Adornable.fixtureSlots` | `onDestruct` :310 | `owned` (Map) | |
| 6 | `Boundary.anchorA/anchorB` | `onDestruct` :219 | `owned` | Symmetric **and** owned (F3). `detach()` stays hand-written — a policy chokepoint |
| 7 | `Aether._hostedUpdates` | **`cleanupOnDestruct` :204** | `owned` | **Atomic** per F4. The `setHost(null)` pre-clear becomes `symmetric` on `AetherHosted._host`, ordered before the cascade (Q4) |
| 8 | `Species` → `Clade.species` :564 | `onDestruct` | `symmetric` | Concrete class, not a mixin |

**W6b — the six held-side R2.4 unhooks (D9).** `Containable` (:194),
`Spawned` (:67), `WarrenMember` (:89), `AetherHosted` (:85), `Slottable`
(:83), `Slotted` (:465). All are `cleanupOnDestruct`-form, so **all
convert atomically** per F4. `Slotted`/`Slottable`'s `onSlotReleased`
notification is policy and stays hand-written.

**NOT converted**, each with a one-line comment naming the audit step it
fails: `Container.contents` (evacuates outward — step 4),
`Warren`/`DormWarren` (elastic reaping — step 4), `SandboxCrossing`
(closeSession — step 4), `Persistable` (capture; not a reference at
all).

### W7 — The 21-site sweep (where behaviour changes)

Unruled sites come **last**: unlike W6 they have no oracle, so each needs
its own new test (criterion 6). Three commits by risk class.

**W7a — `weak`-only (fails safe).** `Exit.source`, `Exit._destination`,
`DoorBearing.door`, `SandboxCrossingExit.crossing`,
`ExitableVessel.outCache`/`entryCache`, `LoungeWarren._reapTimers`,
`DormWarren._unitsByKey`/`_corridorsByFloor`/`_doorsByKey`. Assert the
`Exit.canEvict` equivalence (F6) rather than deleting silently.

**W7b — new `symmetric` pairs.** `Adornment.adornedTo` ↔
`Adornable.fixtureSlots` (closes the pair ref-shapes has been claiming);
`Interactive.holder` ↔ `HasInteractive.interactives` (both directions
uncovered today).

**W7c — judgement calls.**
- `ChannelCatalogue.subjectsRef` → **identity ref, resolve-on-read**, not
  a lifetime. It is the A.4 replacement hazard exactly: `weak` would heal
  to `null` permanently across a hot-reload that already produced a good
  replacement. Delete the cache slot; resolve on read.
- The three `Interactive`-keyed registries → **finish the read-side
  prune** (Q3), and **fix the leak**: `Interactive.onDestruct` (:171)
  never calls `teardownSubstrateState` (:164), which is what they rely
  on.

## The `owned` audit protocol

No site gets `owned` until it survives all six steps, **written into that
site's commit message**. `Container.contents` is the reference failure —
it fails steps 3 and 4.

1. **Who mints it?** If the holder is not the creator, not owned.
2. **Who else holds it?** A second non-derived holder ⇒ symmetric or weak.
3. **The counterfactual.** If the holder dies, does the target have a
   legitimate remaining reader? A sword in a destroyed room is
   re-homeable ⇒ not owned. An outbound Exit of a destroyed room has no
   meaning ⇒ owned.
4. **Does the current cleanup do anything other than destruct?** The
   mechanical filter that catches every trap: if it moves, evacuates,
   notifies, schedules, or conditionally destructs, it is a **policy**,
   not a cascade. Catches `Container`, `SandboxCrossing`, `Warren`,
   `Aether`.
5. **Does the residency corollary hold?** An owned target should veto
   `canEvict` while its holder lives. If no veto exists, the ownership
   claim is undocumented — surface before declaring. (Per D4 this is a
   *check*, not a derivation.)
6. **Write the test first, both directions** — positive cascade, and the
   negative case where a second holder references the target.

## Sequencing

```
W0   pins + golden master        tests only          ─┐
W0b  WireBody/Shade              4 files             ─┤ no fieldMeta yet
W1   FieldMeta + collector       additive            ─┘
──────────────────────────────────────────────────── bisect line
W2   THE CODEMOD                 ~250 files, no behaviour change
W2c  fold the TSDoc tags         ~71 files + delete the source scan
W2b  doc vocabulary sweep        docs + comments
──────────────────────────────────────────────────── bisect line
W3   R7 validation               inert
W4a  weak mechanism              inert
W4b  the 6 shipped self-heals    behaviour-preserving
W5   slot 2.5 engine             inert
W6   the 8 shipped correct sites behaviour-preserving   (fidelity proof)
W7   the 21 unruled sites        BEHAVIOUR CHANGE       (a/b/c by risk)
```

A bisect landing on W2 is a metadata-shape bug; on W4b/W6 a fidelity bug
in the mechanism; on W7 a deliberate behaviour change. That separation is
the point.

## Critical files

- `api/mixin.ts` — the four collectors (:410, :514, :1179, :1286),
  `getPersistenceContributors` (:551), `assertComposable`, the
  `MixinClass` interface (:191)
- `api/stuff.ts` — `#destructCore` (:838) and slot 2.5; `register`
  (:746); the two `ProxyApi.wrap` callers (:589, :689)
- `lib/mixin.ts` — home of `FieldMeta` / `FieldMetaEntry`
- `api/proxy.ts` — the get trap (:149-177) where `weak` installs
- `scripts/check-module-scope.ts` — the exact script pattern the codemod
  and checker must follow
- `lib/equipment/Weapon.ts` (:80-88) — proves F2; make it a permanent
  test case
