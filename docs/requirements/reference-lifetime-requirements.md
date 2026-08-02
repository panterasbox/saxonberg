# Reference-lifetime — requirements

> Phase 2 of the feature cycle (see [workflow.md](../workflow.md)).
> Source slate: [reference-lifetime-slate.md](../slates/builds/reference-lifetime-slate.md).
> Retired at the pre-merge sweep.

## The gap

Two problems, one shape.

**1. Reference lifetime is convention.** `ref-shapes.md` defines four
cleanup rules (R2.1–R2.4) for what happens when one side of a live ref
destructs. R2.4 is framework-enforced; **R2.1, R2.2 and R2.3 are prose
plus discipline** — hand-written boilerplate an author must remember, and
forgetting fails *silently*.

The census (2026-08-01) says the discipline is already not holding: **21
Pattern B sites carry no cleanup rule at all**, and `ref-shapes.md`
documents one relationship — `Adornment ↔ Adornable` as R2.2 symmetric —
**whose Adornment half does not exist in code**. The doc asserts a
guarantee the codebase does not provide.

This matters more as the world grows. Most cross-object references today
are path strings (Pattern A) because most of the world is singletons.
That is a property of a young world. As content grows, most objects are
clones — and every clone relationship is Pattern B, carrying a cleanup
obligation. This is the pattern content authors will follow thousands of
times; it should not be one they can get wrong by forgetting four lines.

**1b. Hand-written witnesses silently collide.** Master gained an
antipattern entry on 2026-08-01 — *"An optional witness implemented by
more than one composed layer"* — after `PosedMixin.onSlotReleased` was
found never to fire, because `MobileMixin` is composed further out and
**mixin methods do not merge: the outermost wins and the inner one is
silently replaced.** A sleeper stood up and stayed recorded as occupying
the bed.

That is the same failure the mortality build hit (three drivers sharing a
protected `applyDeath` on one host, the outermost shadowing the other
two), which makes it a recurring class rather than an incident. It is
also **a second, independent argument for this build**: `fieldMeta` is a
*static*, collected per-layer by a `hasOwnProperty` prototype walk, so
two layers declaring cleanup for their own fields cannot shadow each
other the way two `onDestruct` bodies can. Moving cleanup from
hand-written witnesses to declarations does not merely remove
boilerplate — **it removes a whole collision class.**

**2. Field metadata is scattered across parallel statics.** Adding a
seventh (`referenceFields`) would deepen the problem the build is
supposed to fix. Invert instead: one field-keyed structure where each
field declares everything about itself.

## Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | **All three rules** (R2.1, R2.2, R2.3) ship together | The destruct-side rules are where the real bugs are; splitting leaves the sweep half-done |
| D2 | **Big-bang codemod first**, then the rules | One shape in the tree at any moment; no dual-read path to build and later remove |
| D3 | **Build-time error** when a field is both persistent and a live ref | Persisted live refs do not exist in the substrate; mirrors the `@Final` validator throwing at registration |
| D4 | **Residency: regression tests only** | The `canEvict` vetoes are not mechanical (see R6); pin them, do not derive them |
| D5 | **Fix all 21 sweep sites** | The mechanism without the fixes leaves the bugs it exists to prevent |
| D7 | **W7c registries: finish the read-side prune, don't declare a rule** | A registry keyed by a live Stuff is an *index*, not a reference — it doesn't own its keys (`owned` wrong) and `Interactive` must not grow a back-ref (`symmetric` wrong). Also fixes the real leak: `Interactive.onDestruct` never calls `teardownSubstrateState`, which the three registries rely on |
| D8 | **Fold `@authorable` + `@runtimeState` into `fieldMeta`**; delete the source scan | They ARE field metadata (172 + 78 sites), and `StudioLogic.scanClassification` reads them by walking the source tree as TEXT and regex-binding JSDoc to identifiers — with underscore-insensitive name *guessing* because it cannot tell which field a comment belongs to. Shipping "one field-keyed structure" while leaving 250 declarations in comments the runtime greps would be the same disease with a worse mechanism. It also makes the tag **checkable**: `@runtimeState` currently lies about `Organism.lifecycleState`, which is persisted |
| D9 | **Fold the held-side R2.4 unhooks into the declaration** | A second route for declaring a reference relationship leaves "one way" two-thirds true. **Six of the ten** `cleanupOnDestruct` sites qualify (see R10) — the other four are policy, not cascade |
| D10 | **Fix the two missing `super.onDestruct()` calls here** | `Exit` and `Boundary`, two lines each, and W6 converts both files anyway. A known-broken destruct chain inside code this build is rewriting invites blaming the wrong commit. **Now backed by repo doctrine**: master's new witness-collision antipattern names this exact contract ("a subclass `onDestruct` calls `super.onDestruct()`") |
| D6 | **No decorators** | Verified: legacy decorators are invalid on any member of a class *expression* (TS1206 — field and method alike), and 105 mixins return class expressions. Not a field-vs-method issue. ES decorators do permit it, but migrating decorator modes is a separate build (call-security is legacy + `emitDecoratorMetadata`, which has no ES equivalent). |

## Scope

### IN

- `static fieldMeta` — the inverted, field-keyed metadata structure.
- A codemod converting the **four genuinely field-keyed statics** to it,
  and deleting them.
- `MixinApi.getAllFieldMeta(ctor)` — one collector replacing four.
- The `ref` key: `'weak'` (R2.3), `'symmetric'` (R2.2), `'owned'` (R2.1),
  enforced by the framework at destruct/read.
- Build-time validation (D3) + a `pnpm lint:field-meta` gate.
- The sweep: a rule declared for all 21 unruled sites.
- `ref-shapes.md` graduates from "boilerplate to write" to "rule to
  declare".

### OUT — hard fences

- **`commandContributions`, `settings`, `subscribableFields`,
  `markupAugmenters` do NOT fold in.** They are statics, but they are not
  *field* metadata (see R2). Touching them is scope creep.
- **The residency veto roster stays hand-written** (D4).
- **Decorator-mode migration** (D6).
- **Folding `commandContributions` / `settings` / `subscribableFields` /
  `markupAugmenters` together.** They are not field-keyed (R2); whether
  the *class*-level statics deserve their own unification is a separate
  question this build does not open.
- No new Api. This rides `MixinApi` and `StuffApi.#destructCore`.

## Requirements

### R1 — `fieldMeta` shape

```ts
static fieldMeta: FieldMeta = {
  age:          { persistent: true },
  mass:         { persistent: true, marshaller: '/lib/…/kg' },
  container:    { instruction: true },
  _stackKey:    { globIdentity: true },

  _speciesPath: { ref: 'identity', persistent: true },
  _container:   { ref: 'instance', lifetime: 'weak' },
  _hauling:     { ref: 'instance', lifetime: 'symmetric', inverse: '_hauledBy' },
  exits:        { ref: 'instance', lifetime: 'owned' },
};
```

**The two-axis model** (see [ref-shapes.md](../ref-shapes.md), rewritten
by this build). `ref` says *what you are pointing at*; `lifetime` says
*what happens when it dies*, and applies to instance refs only.

The discriminator on axis 1 is **the holder's meaning, not a property of
the target** — "the room I am in" is an instance ref even though rooms
have unique paths. It is therefore not inferrable, which is exactly why
it is declared. (An earlier draft had the framework derive path-vs-id
from whether the target was uniquely path-addressable. That was wrong and
is recorded here so it is not re-proposed.)

Axis 1 replaces the old three-pattern vocabulary: A and C stored the
identical thing (a templatePath) and differed only in what the getter did
with it, so they are one shape — an **identity** ref. B is an
**instance** ref.

- Keyed by **instance field name** — the same key `PersistentHydrator`
  and `MixinApi.pascalCase` already resolve against.
- Collected up the prototype chain, own-property only, exactly as
  `getAllPersistentFields` does today.
- **Merge rule: PROPERTY-level, first-declaration-wins per property**
  (concrete class first). **Not field-level** — that was a defect in the
  first draft of this doc and it loses data. `lib/equipment/Weapon.ts:80`
  declares a `fieldMarshallers` entry for `mass` while `mass` is
  *persistent* on `lib/material/Tangible.ts:105`. Field-level first-wins
  makes Weapon's `{marshaller}` shadow Tangible's `{persistent: true}`
  and **`mass` stops persisting on every weapon in the game** — silently,
  inside a 240-file diff. Per-property, booleans first-wins ≡ union;
  `marshaller` first-wins ≡ today's `getAllFieldMarshallers`;
  `ref`/`lifetime`/`inverse` first-wins ≡ "a subclass may sharpen".
- **Key order is load-bearing.** `getAllPersistentFields` returns
  concrete-first chain order and `PersistentHydrator` Phase 1 applies in
  that order. Emit keys per class body as `persistentFields` (declared
  order) → `instructionFields` → `globIdentityFields` → `fieldMarshallers`
  keys not already emitted, so
  `Object.keys(merged).filter(k => merged[k].persistent)` reproduces
  today's array exactly.

### R2 — Only four statics fold in

Verified counts, **re-measured 2026-08-02 after the furnishing and
Hinkley-Hills merges**. Non-test files as tabled; including `__tests__`
it is 241/17/10/7, and the **union of files declaring any of the four is
250** — the codemod's real input set. (Pre-merge those figures were
193/15/8/3 and a union of 240; the two builds added ~10 files, which
moves no structural conclusion.) `@authorable` is now 75 files,
`@runtimeState` 39.

| static | files | field-keyed? | disposition |
|---|---|---|---|
| `persistentFields` | 200 | ✅ | → `{ persistent: true }` |
| `fieldMarshallers` | 15 | ✅ | → `{ marshaller: '…' }` |
| `instructionFields` | 8 | ✅ | → `{ instruction: true }` |
| `globIdentityFields` | 3 | ✅ | → `{ globIdentity: true }` |
| `commandContributions` | — | ❌ | keyed by *audience* (`{self, peers}`) — leave |
| `settings` | — | ❌ | keyed by *setting key* (`'shell.interpolate-vars'`) — leave |
| `subscribableFields` | — | ❌ | virtual projections carrying a `read` fn, not instance fields — leave |
| `markupAugmenters` | — | ❌ | a list of functions — leave |

The slate said "six statics". It was wrong; four are field-keyed. Correct
the slate at sweep time.

### R3 — The collector

`MixinApi.getAllFieldMeta(ctor): FieldMeta`, mirroring
`getAllPersistentFields`'s four invariants byte-for-byte: the loop guard,
`Object.prototype.hasOwnProperty.call` (statics are inherited), the type
guard, and the terminal dedupe.

The four legacy collectors (`getAllPersistentFields`,
`getAllFieldMarshallers`, `getAllInstructionFields`,
`getAllGlobIdentityFields`) are **reimplemented as thin derivations** of
`getAllFieldMeta` and keep their signatures, so ~200 call sites do not
move. `getPersistenceContributors` keeps its own per-layer walk (it needs
`_mixinName` ownership, which the flattened map loses) but sources its
field lists from `fieldMeta`.

### R4 — The three lifetime rules (instance refs only)

| rule | declaration | mechanism | when |
|---|---|---|---|
| **R2.3** | `lifetime: 'weak'` | the **proxy get trap** self-heals: if the slot's target `isDestroyed()`, null the slot and return null | lazy, on read |
| **R2.2** | `lifetime: 'symmetric', inverse: '<field>'` | on destruct, clear this object's back-ref on the other side | eager, on destruct |
| **R2.1** | `lifetime: 'owned'` | on destruct, `StuffApi.destruct` each held object | eager, on destruct |

An **identity** ref takes no lifetime: it re-resolves from its path on
read, so it cannot dangle. `identity` + `lifetime` is a build-time error
(R7).

**Read-side self-heal is the DEFAULT for every `ref: 'instance'` single
ref**; axis 2 names only the *destruct-side* rule. The first draft made
these three mutually exclusive, which the tree contradicts: `Hauler` /
`Haulable` are symmetric **and** self-heal on read, `Containable` is
self-heal **and** R2.4, and `Boundary.anchorA/anchorB` are symmetric
**and** owned on the same two fields. So `weak` means *"no destruct-side
rule"*, and `symmetric` / `owned` fields self-heal on read as well.
Scoped to **single refs only** — pruning a Map on every read is O(n) on
the exit-listing hot path and buys nothing the R2.4 chokepoints don't.

**`owned` is the dangerous declaration** and gets the most scrutiny in
the sweep. `weak` and `symmetric` fail safe — a leaked reference or a
late clear, both recoverable. `owned` calls `StuffApi.destruct`, so a
mis-declaration destroys live world objects. Note that
`Container.cleanupOnDestruct` is deliberately **not** a plain cascade: it
evacuates contents outward first and destructs only as a last resort. So
`owned` means *"this has no existence without me"*, not *"I hold it"* —
and `Container.contents` must NOT be declared `owned`.

Three shape requirements the census forces:

- **`inverse` is mandatory for `symmetric`.** The rule is "each side
  clears the back-ref on the other" — without the inverse field name the
  framework cannot find what to clear. A `symmetric` declaration missing
  `inverse` is a build-time error (R7).
- **`owned` and `symmetric` must handle collections**, not just single
  refs. The shipped exemplars are `Exitable.exits` (a `Map`) and
  `Adornable.fixtureSlots` (a `Map`). Support a lone ref, `Array`, `Set`
  and `Map` values.
- **`weak` is lazy, not eager.** It nulls on read, needing no reverse
  index. (Slate open question — resolved: lazy everywhere. Eager would
  require the framework to maintain a reverse index of every holder of
  every object, which is precisely the retention the rule exists to
  avoid.)

### R4b — How `weak` self-heals (was unspecified)

R4 said "the getter self-heals" without naming a mechanism, which decides
whether the conversion is 6 files or 300. Settled: **the `ProxyApi` get
trap**.

- A **prototype accessor pair is dead on arrival**: the repo targets
  ES2022 without `useDefineForClassFields`, so it defaults `true` and
  class fields become own data properties that **shadow** prototype
  accessors.
- A **per-instance accessor install** works with any declaration form,
  but `ProxyApi.wrap`'s get trap finds `descriptor.get` and routes
  through the security pipeline with `isGetter: true` — turning a plain
  field read into a call-security run on the engine's hottest path.
- The **get trap** costs ~nothing if the weak-field set is computed once
  per `wrap()` into the handler closure (as `wrapperCache` already is)
  and guarded with `if (weakFields !== null && weakFields.has(prop))`.
  For nearly every class the set is `null` and the cost is one `!== null`.

`api/proxy.ts` imports only `SecurityApi`; a value import of `MixinApi`
would create `proxy → mixin → security → proxy`. **Pass the set in**
instead — `ProxyApi.wrap(raw, weakFields?)`, computed by the two callers
in `api/stuff.ts` via a memoized `MixinApi.getWeakRefFields(ctor)`. No
new Api, no new import edge.

**Known gap, to be documented at the site**: reads on the **raw** target
(`Stuff.RAW_TARGET`, `ProxyApi.unwrap`, `ResidencyLogic`'s deliberately
raw sweeps) do not heal.

### R5 — Where the rules run

`StuffApi.#destructCore` has a **locked five-slot order**. The declared
cleanup runs as a new slot **2.5** — after the `onDestruct` user witness,
before the mixin `cleanupOnDestruct` walk:

```
1. canDestruct witness
2. onDestruct user witness
2.5 DECLARED REFERENCE CLEANUP   ← new (owned cascade, symmetric clear)
3. mixin cleanupOnDestruct walk
4. ShadowApi._detachAllForHost
5. destroy()
```

After (2) so a hand-written `onDestruct` still sees its children; before
(3) so substrate invariants run last.

**Coexistence is direction-dependent** — the first draft claimed "every
current R2.1 site" is written in `onDestruct`, which is false and would
have shipped a double-fire. Sites in **`onDestruct`** (slot 2 —
`Exitable`, `Adornable`, `Boundary`, `Exit`, `Hauler`, `Haulable`,
`Species`, `Location`, `SandboxCrossing`) run *before* 2.5 and clear
their slots, so 2.5 no-ops and they may migrate lazily. Sites in
**`cleanupOnDestruct`** (slot 3 — `Aether`, `Warren`, `Container`,
`Containable`, `Spawned`, `WarrenMember`, `AetherHosted`, `Slottable`,
`Slotted`, `Persistable`) run *after* 2.5, so 2.5 would destruct first
and slot 3 would then walk destroyed objects and throw. **Those must be
converted atomically** — declaration in and handler out in one commit.

Slot 2.5 therefore also: skips `isDestroyed()` targets, treats
null/empty as a no-op, clears the holder's slot afterwards, and runs
**all `symmetric` clears before all `owned` cascades** (an owned cascade
destroys its targets, so a back-ref clear scheduled after it would
operate on destroyed objects).

**Exception policy matches slot 3**: log-and-continue per field, with
field name + stuff id. A throwing cleanup must never prevent `destroy()`.

### R6 — Residency (D4)

Add regression tests pinning the current `canEvict` behaviour **before**
touching anything, covering at minimum `Exit.canEvict` (the unbound
post-clone carve-out) and `Container.canEvict` (the persistence-spine
carve-out — a persistable host does *not* veto on contents because they
are captured before the cull).

These vetoes are **not** derivable from the declarations: both carry
case-specific carve-outs that a mechanical rule would flatten. The veto
roster stays hand-written; this build only proves it did not move.

### R7 — Build-time validation

At class registration, throw on:

1. `ref: 'instance'` with `persistent: true` (D3). Not a style rule —
   `stuffId` does not survive a reboot, so there is nothing durable to
   write down. (An **identity** ref with `persistent: true` is the
   normal, expected case.)
2. `ref: 'identity'` with any `lifetime` — an identity ref re-resolves
   and cannot dangle.
3. `lifetime: 'symmetric'` with no `inverse`.
4. An `inverse` naming a field that does not carry a reciprocal
   `symmetric` declaration pointing back — **same-class pairs only**.
   A cross-class pair (`Adornment.adornedTo` ↔ `Adornable.fixtureSlots`)
   lives on two different hosts, and registering one cannot see the
   other; that case belongs to `lint:field-meta`, which sees the whole
   tree statically. The first draft conflated the two.

Plus `pnpm lint:field-meta` (CI-gating) for what registration cannot see:
a legacy static still present after the codemod, and a `fieldMeta` key
that matches no declared field on the class.

### R10 — Which R2.4 unhooks fold in (D9)

"Fold R2.4 in" is **not** a blanket conversion of all ten
`cleanupOnDestruct` statics. The `owned` audit's step 4 is the filter: if
the handler does anything other than unhook or destruct — moves,
evacuates, notifies, schedules, conditionally destructs — it is
**policy**, and policy stays hand-written.

| site | verdict |
|---|---|
| `Containable` (:194) `ContainmentApi.move(self, null)` | **fold** — held-side unhook |
| `Spawned` (:67) `spawner.untrackSpawn(self)` | **fold** |
| `WarrenMember` (:89) `warren.removeMember(self)` | **fold** |
| `AetherHosted` (:85) `setHost(null)` + `_dropHostedUpdate` | **fold** — becomes the `symmetric` half of W6 #7 |
| `Slottable` (:83) / `Slotted` (:465) vacate | **fold** — but the `onSlotReleased` notification is policy and stays |
| `Container` (:206) evacuates outward, destructs last resort | **keep** — policy |
| `Aether` (:204) owned cascade + pre-clear | **keep the cascade in W6 #7**; only the pre-clear becomes declarative |
| `Warren` (:506) elastic-graph reaping | **keep** — policy |
| `Persistable` (:248) capture | **keep** — not a reference at all |

Each kept site gets a one-line comment at its handler saying which audit
step it fails, so the next census does not re-raise it.

### R11 — The doc-tag fold (D8)

`fieldMeta` gains:

```ts
authorable?: true;        // was @authorable
authorPicker?: string;    // was `@authorable ref:<Type>`
runtimeState?: true;      // was @runtimeState
```

`authorPicker`, not a nested `ref`, so it cannot be confused with axis 1.

`StudioLogic.scanClassification` (:164) and its `authorable-fields.json`
cache are **deleted**; the Studio reads `MixinApi.getAllFieldMeta`.

**Risk to check before committing to it**: the scan reads *source*, so it
sees fields on classes that may never have been loaded, whereas
`getAllFieldMeta` needs the constructor. Verify the Studio catalogue is
built over registered classes (it describes composable mixins, which are
in the `Mixins` registry) before deleting the scan. If some tagged class
is genuinely never loaded, that is itself a finding.

**`@runtimeState` is currently able to lie** — it tags
`Organism.lifecycleState`, which is persisted (found during the mortality
build). Once folded, `runtimeState: true` alongside `persistent: true` is
a build-time error (R7), so the contradiction becomes unrepresentable.

### R12 — Findings from the post-merge census (2026-08-02)

Re-censused after furnishing + Hinkley Hills merged. Three findings, all
folded into this build.

**R12.1 — A destroyed chattel good RESURRECTS. Verified, not reported.**
`Estate._dropEstateEntry` is the declared prune point for a released or
destroyed good. It is fully gated, documented — and has **zero call
sites anywhere, including tests**. The destruct path stops short of it:
`ChattelMixin.onDestruct` → `ChattelApi.release` → `ChattelLogic.release`
→ `ChattelRegistry.release`, which deletes the Mongo title row and the
index entry **and returns**.

Consequence, traced through both halves: `Estate.captureSlice` iterates
`getEstateEntries()` (reading `_estate`, which nothing prunes), finds the
good no longer live, takes the `: entry` branch and writes the entry into
the durable slice **verbatim**. `restoreSlice` re-mints any `inventory`
entry through `ctx.restoreItem`. Because `_chattelId` is persistent, the
resurrected good carries a chattel id whose title row was deleted — so it
returns **and** returns with a dangling title reference. Eat a carrot,
log out, log back in, the carrot is in your pack.

Exactly the class of bug this build exists to prevent, so it is fixed
here (W7) rather than filed. The correct form is a
**`ChattelMixin.cleanupOnDestruct`** — framework-enforced, so a subclass
`onDestruct` that forgets to chain cannot bypass it.

**R12.2 — `LotGateExit.holder` (`obj/LotGateExit.ts:52`)** stores a live
`LotHolder`, which composes `SingletonMixin` and is path-addressable.
Identity question, instance representation — A.4. The same build does it
correctly twice elsewhere (`PlatBook.holderPath:122`,
`TitleController.holderFor:111`), so this is the outlier, not the
convention. Low severity (`LotHolder.canEvict` refuses eviction, so only
a hot-reload or torn-down test world strands it); one-line fix to
`holderPath` + resolve in `computeDestination`. → W7a.

**R12.3 — `LotHolder._roomsByLot` (`obj/LotHolder.ts:128`)** — all three
readers guard on `isDestroyed()` but none `delete` the stale key, and
`LotHolder` is a process-lifetime singleton. Not a correctness bug (no
dangling ref escapes); a **retention leak**. → W7a, two `delete` calls.

Also noted, needing no change: `GardenBed`, `Crop`, `PlantPot`,
`PlatBook`, `LandUse`, `FurnishableRoom` and `Cultivable` hold **no**
instance refs at all, and `Plant` actively *removed* a concrete
`PlantPot` ref in this range in favour of a `Cultivable` type import. The
new code is mostly on the right side of the line.

### R8 — The sweep (D5)

A rule declared for all 21 unruled sites from the census. Notable:

- **`Adornment.adornedTo`** → `symmetric` with `Adornable.fixtureSlots`.
  Closes the documented-but-absent R2.2 pair.
- **`Interactive.holder` ↔ `HasInteractive.interactives`** → `symmetric`.
  Both directions are currently uncovered.
- **`Exit.source`, `Exit._destination`** → `weak`; **`Exit.inverse`** →
  `symmetric` (today it is half-symmetric: cleared on its own destruct,
  not on its partner's).
- **`DoorBearing.door`** → `weak` (the mixin has no destruct hook at all).
- **`ChannelCatalogue.subjectsRef`** → **Pattern C** (resolve-on-read).
  A cached live ref to a Stuff singleton with no invalidation — the
  genuine instance of the replacement hazard below.
- **`Shade.shadeSpecies` and `WireBody.wireSpecies` are NOT sweep
  sites.** The census called them A.4; that was wrong and is recorded
  here so it is not re-raised. Both are **constructor parameters**, held
  only until `postRegister` hands them to `setSpecies()` — and
  `OrganismMixin` stores species as `_speciesPath`, re-resolving through
  `findByTemplatePath` on every `getSpecies()` call (the shape its own
  doc marks LOCKED and "HMR-safe; no instance cache"). The durable
  reference is already Pattern C. Leave both alone.
- The three `Interactive`-keyed registries (`MqlSubscriptionRegistry`,
  `ForumSubscriptionRegistry`, `ReactionRegistry`) and the `domain/`
  caches (`DormWarren`, `LoungeWarren`) → per-case; several want the
  read-side prune they already half-implement.

### R9 — Documentation

- `ref-shapes.md` — **rewritten to the two-axis model** (done during the
  requirements phase; the doc is the design authority, so settling the
  doctrine was design work, not implementation). Patterns A/B/C are
  retired in favour of identity/instance + lifetime; the decision matrix
  is now two ordered questions; A.4 is restated around the property that
  actually matters. Remaining build tasks in that file: R2.1–R2.3
  restated as declarations at each rule, the exemplar table updated, the
  **`getRestingOn()` exemplar added** (a second R2.3 site in
  `Containable.ts` the doc omits), and the false `Adornment ↔ Adornable`
  claim corrected.
- Every other doc that speaks the A/B/C vocabulary needs its terms
  updated — `CLAUDE.md`'s ref-shapes map entry names "Pattern A/B/C"
  explicitly, and the subsystem docs reference the pattern letters.
  Sweep the `docs/` tree for `Pattern A`/`Pattern B`/`Pattern C`.
- Fix the stale comment at `Containable.ts:210-212`, which references a
  `_restingOnPath` field and a `static persistentFields` that do not
  exist in that file.
- `architecture.md`: `fieldMeta` in the field-metadata section.
- `residency.md`: note that the veto roster stays hand-written and why.

## Acceptance criteria

1. `static fieldMeta` exists; the four legacy statics are **gone from the
   tree**; `lint:field-meta` fails if one returns.
2. `getAllFieldMeta` collects up the chain with concrete-class-first
   precedence; the four legacy collectors keep their signatures.
3. Declaring `weak` removes the hand-written self-heal from all six
   shipped R2.3 getters, with behaviour unchanged (existing tests pass
   untouched).
4. Declaring `owned` / `symmetric` reproduces the current behaviour of
   every shipped R2.1/R2.2 site.
5. A field both `persistent` and `ref` throws at registration, naming the
   field and pointing at ref-shapes.md.
6. All 21 sweep sites carry a rule; each has a test proving the dangling
   ref is cleared.
7. Residency regression tests pass unchanged before and after.
8. Full suite green in chunks; type-clean; all lint gates green.

## Risks

- **193 files touched by the codemod, and persistence is the
  highest-consequence subsystem in the tree.** The slate explicitly
  warned against bundling this with a behavioural change; D2 overrides
  that. Mitigation: land the codemod as its **own commit**, fully green,
  before any reference-rule behaviour lands, so a bisect separates them.
- **Slot 2.5 changes destruct ordering.** Mitigated by running after
  `onDestruct`, so existing hand-written cleanup is unaffected until
  converted.
- **The census is a lead, not a verdict.** It classified
  `Shade.shadeSpecies` / `WireBody.wireSpecies` as A.4 when both are
  transient constructor parameters over an already-correct Pattern C
  field. Every sweep site must be read at its own call sites before a
  rule is declared for it — a wrong `owned` would destruct something the
  holder does not own.
