# Ref Shapes & Ownership — Implementation Plan

Concrete build plan for the design in
[`docs/slates/ref-shapes-slate.md`](./ref-shapes-slate.md). Single
MR, single review, single merge. Phases below describe the build
order *within* one branch; they are NOT a backlog of separate
tickets.

Read the slate first — this plan assumes its decisions are locked.

---

## Executive summary

### Scope

This MR ships the framework-enforced destruct-cleanup story for
substrate Pattern-B fields plus a small ancillary set of fixes
that fall out of the slate's resolutions.

**Lands:**

- Mixin-registry "cleanup handler" key + new
  `StuffApi.destruct` dispatcher slot that walks mixins
  most-derived-first and invokes each mixin's static
  `cleanupOnDestruct(stuff)`.
- New cleanup handlers, replacing convention-based stale-state
  hazards (R2.4 sites):
  - `Containable.cleanupOnDestruct` (S2 — unhook from
    `Container.contents`).
  - `Container.cleanupOnDestruct` (S1 — evacuate contents to
    outer container, recursive).
  - `Slottable.cleanupOnDestruct` (migrate
    `Slottable.onDestruct` body to the static).
  - `Species.cleanupOnDestruct` (OPEN-4 — unhook from
    `Clade.species`).
- `Containable.getContainer()` self-heal on `isDestroyed()`
  (R2.3 backstop for S1 / S8).
- `Exit._destination` cache slot removed; the getter resolves on
  every call via `StuffApi.findByTemplatePath`.
- New mixin pair `SpawnerMixin` / `SpawnedMixin` (in
  `lib/stuff/`).
- `Stuff.lastTouchMs` hard-private slot + the one-line proxy
  interceptor write that maintains it (prerequisite-only — no
  GC sweep, no `considerSelfDestruct` body).
- `Stuff.templatePath` tamper-resistance lockdown (move to
  `#templatePath` hard-private slot + symbol-keyed pre-register
  stamp seam; remove from `PASSTHROUGH_KEYS`). Same shape as
  `lastTouchMs` lockdown, plus migration of three read-site
  bracket casts in `StuffApi`.
- Doc rewrite: `docs/ref-shapes.md` rewritten per the slate's
  "Doc rewrite consequences" section; slate retired.

**Explicitly does NOT land:**

- The GC sweep loop. Spec'd at contract level only; the body of
  `considerSelfDestruct`, the sweep iteration, and LRU upgrade
  belong to a future dedicated slate.
- `considerSelfDestruct` default on `Stuff`. Slate-deferred.
- `PopulatesMixin`. Lives in `spawn-shape-slate.md`; this MR
  composes alongside but doesn't implement it.
- Pattern C "generalized to instances." Dropped per the
  foundational stuffId constraint.
- Marshaller-for-live-refs cleanup. There are none in `lib/` to
  remove (confirmed by codebase scan); only the doc text comes
  out.
- A `CascadingSpawnerMixin` named convenience. Cascade is
  document-only (subclass overrides `onDestruct`).
- Any pre-existing convention-based `onDestruct` migration where
  failure is "object leaks" rather than "invariant corrupts"
  (Exitable, Adornable, Boundary, BoundaryAnchor, Exit, Door).

### Definition of done

- `pnpm lint` clean (no new ESLint warnings on touched files).
- `pnpm build` clean (TS strict, `noUncheckedIndexedAccess`
  preserved).
- `pnpm test` green. New tests cover every invariant in the
  "Concrete invariants to test" section below.
- Slate ships in code: every "Implementation gap" bullet at
  `ref-shapes-slate.md:1183-1216` resolves either to a code
  change or an explicit deferral note in `ref-shapes.md`.
- `docs/ref-shapes.md` rewritten consistent with the slate's
  "Doc rewrite consequences" section (lines 1220-1244).
- `docs/slates/ref-shapes-slate.md` retired — moved to a
  retired-slates folder or deleted; either way it's gone from
  `docs/slates/`. (The slate itself says it retires when the
  design ships.)
- `Mixins` registry constant added for `SpawnerMixin` /
  `SpawnedMixin` (sister keys to existing entries — see CLAUDE.md
  notes on the registry as single source of truth).
- `MixinApi.isSpawner` / `isSpawned` predicates added,
  consistent with the existing `isX` family.

---

## Phase ordering

Six phases, sequenced so each builds on infrastructure put in
place by the previous. Within each phase, code + tests + doc
text land together — no "tests later."

### Phase 1 — Slate corrections (pre-build review pass)

**Purpose.** Fix anything the slate says that's wrong about the
current codebase before the developer starts following it.

This phase is a doc edit only; no source files change. If the
slate edits land cleanly the developer should re-read the slate
before starting Phase 2.

See the "Slate corrections needed" section near the bottom of
this plan for the specific edits.

### Phase 2 — Foundation: mixin-registry cleanup hook + dispatcher

**Purpose.** Stand up the new infrastructure FIRST, with a
no-op test setup, so subsequent phases just register handlers
and watch them fire. Building this first means later phases
exercise it as a real path, not a stub.

**Changed files:**

- `packages/server/src/mud/lib/mixin.ts` — add `Spawner` /
  `Spawned` to the `Mixins` constants object (Phase 4 will use
  these; adding now is cheaper than touching this file twice).
  (No changes required to this file for the cleanup-handler
  dispatch itself — discovery happens via the existing
  `MixinApi.queryMixins` walk.)
- `packages/server/src/mud/api/stuff.ts` — modify
  `#destructCore` (currently lines 604-627) to walk
  `MixinApi.queryMixins(object.constructor)` between the
  `onDestruct` witness call and `ShadowApi._detachAllForHost`.
  For each mixin whose constructor has its OWN static
  `cleanupOnDestruct` function (using
  `Object.prototype.hasOwnProperty.call(mixinCtor,
  'cleanupOnDestruct') && typeof mixinCtor.cleanupOnDestruct ===
  'function'`), invoke it with the destructing proxy. Walk order
  is `queryMixins`' natural prototype-walk order — most-derived
  first.
- `packages/server/src/mud/api/mixin.ts` — `queryMixins` already
  returns the right shape (`MixinClass[]` walking from concrete
  class up). No change strictly required UNLESS we want a
  dedicated helper. Recommendation: do NOT add a separate
  registry; the dispatcher walks `queryMixins` directly and
  filters by `hasOwnProperty('cleanupOnDestruct')` — keeps
  discovery one mechanism, no parallel state to keep in sync.
  The slate's "registry walk" wording (line 980, 1198) is
  satisfied by this.

**New public API surface.**

- A static class member shape on mixin classes:
  `static cleanupOnDestruct(stuff: Stuff): void`. Not declared
  in any TypeScript interface — it's pure registry discipline,
  same shape as `_mixinName`. Add a section to
  `docs/subsystems/mixins.md` documenting it (lands later in
  Phase 6's doc work).

**Tests to add or modify.**

- New file:
  `packages/server/src/mud/api/__tests__/stuff.cleanup.test.ts`
  - **Dispatcher fires registered handler.** Construct a tiny
    test mixin with a `cleanupOnDestruct` that pushes to a
    capture array; destruct an instance; assert capture has one
    entry.
  - **Walk order is most-derived-first.** Compose two test
    mixins A(B(Stuff)); both have `cleanupOnDestruct` that push
    a tag. Destruct; assert order is `['A','B']`. (Sibling
    invariant for the slate's locked walk order.)
  - **Force-bypass invokes cleanup.** Call
    `StuffApi.forceDestruct` (via a permissions-allowed test
    seam — see `StuffApi.forceDestruct` line 593 for current
    AdminOnly setup; tests that exercise it today use
    `assertTestOnly` seams or call `#destructCore` indirectly).
    Confirm cleanup runs identically.
  - **canDestruct veto path skips cleanup.** Veto'd
    `StuffApi.destruct` throws `DestructError` and the cleanup
    handler is NOT invoked. Confirms cleanup is after veto.
  - **try/catch per handler: `Stuff.destroy()` runs even if a
    cleanup handler throws; no propagation to caller.**
    Register a handler that throws; call `destruct`; assert
    the call returns normally (does NOT throw), assert
    `isDestroyed()` is `true`, assert the registry no longer
    has the object, assert the log seam was called once with
    the mixin name and the error.
  - **One bad handler doesn't block the next.** Register two
    handlers; the first throws. Assert the second still ran
    (capture array has its tag). Assert both logs landed.
  - **Mixins without `cleanupOnDestruct` are skipped silently.**
    Sanity check.
  - **Subclass override of `onDestruct` does NOT bypass
    cleanup.** Compose `class Sub extends MyMixin(Stuff)`; Sub
    overrides `onDestruct` but doesn't call `super.onDestruct()`
    (deliberate misbehavior). Cleanup still fires. This is the
    R2.4 "structural impossibility of bypass" guarantee.

**Invariants the tests must cover.**

- Walk order: most-derived first, base last.
- Force/non-force both run cleanup uniformly.
- Cleanup runs AFTER `onDestruct` (user customization first;
  framework cleanup second).
- Cleanup runs BEFORE `ShadowApi._detachAllForHost` and
  `Stuff.destroy()` (so handlers can still inspect `this` and
  read shadow state).
- Exception propagation: a throwing cleanup handler does not
  prevent later steps. Specifically `destroy()` still
  unregisters.

**Subtle pitfalls.**

- `queryMixins` walks the prototype chain. A concrete class
  that itself defines `cleanupOnDestruct` is NOT a mixin — it's
  the leaf class and won't appear in `queryMixins` output
  unless it carries `_mixinName`. Document this: the cleanup
  hook is mixin-only by design (concrete classes use the
  `onDestruct` witness).
- `Object.prototype.hasOwnProperty.call(mixinCtor,
  'cleanupOnDestruct')`, not `mixinCtor.cleanupOnDestruct !==
  undefined`. The latter would walk up the static chain and
  invoke ancestor handlers on every layer — duplicate fires.
- Wrap the per-mixin invocation in try/catch. Recommendation
  (per open question #1): **log-and-continue, never rethrow.**
  One bad handler can't block others; `Stuff.destroy()` always
  runs; caller never sees cleanup failures (no recovery path
  anyway). Log seam carries mixin name + stuff id + error.
  Partial state after a throw is already recoverable via the
  R2.3 self-heal + GC sweep backstop.

### Phase 3 — Substrate hookups: Containable + Container + Slottable + Species

**Purpose.** Pull the substrate's known R2.4 sites onto the new
mechanism. Slottable migrates from the existing convention
shape (its current `onDestruct`); Containable + Container +
Species are new. These get tested as a group because the
Container/Containable composition specifically requires walk
order to be right.

**Changed files:**

- `packages/server/src/mud/lib/spatial/Containable.ts`
  - Add `static cleanupOnDestruct(stuff: Stuff): void`. Body:
    `const env = (stuff as Stuff & Containable).getContainer();
    if (env) ContainmentApi.move(stuff as Stuff & Containable,
    null);`. The `move(item, null)` is the canonical detach;
    `onMoved(from, null)` fires for any audit hooks; the
    container's `contents` set gets pruned through
    `removeContainable`.
  - Modify `getContainer()` (line 123) to self-heal: if
    `this.environment !== null && this.environment.isDestroyed()`,
    clear `this.environment` to `null` and return `null`. R2.3
    backstop for S1 / S8. Cheap one-liner.
  - Import `ContainmentApi` at the top (will introduce a
    `Containable → ContainmentApi → Containable` import cycle
    that's already broken by other Apis; verify with TS
    compilation — if TS complains, the static `cleanupOnDestruct`
    can lazy-import via `await import()` (sync via `require` is
    not an option). Recommendation: prefer top-level import; if
    cycle bites, refactor to lazy-require inside the static.

- `packages/server/src/mud/lib/spatial/Container.ts`
  - Add `static cleanupOnDestruct(stuff: Stuff): void`. Body:
    take a snapshot (`Array.from(this.contents)` semantics — see
    pitfalls below), determine the outer container
    (`(stuff as Stuff & Containable).getContainer?.() ?? null`
    — guard because not every Container is also Containable),
    iterate the snapshot, call `ContainmentApi.move(item,
    outer)` for each. The recursive base case is `null` (top of
    containment).

- `packages/server/src/mud/lib/slot/Slottable.ts`
  - Add `static cleanupOnDestruct(stuff: Stuff): void` that
    runs the existing `onDestruct` logic (lines 79-89):
    walks `SlotApi.findOccupiedSlots`, vacates each. Use the
    proxy receiver (the arg).
  - Delete the existing `onDestruct` (lines 79-89) — replaced
    by the static. CAUTION: this is the only existing
    onDestruct migration. The slate (line 736) confirms this
    migration: "Slottable.onDestruct's existing logic migrates
    to the same shape."

- `packages/server/src/mud/lib/slot/Slotted.ts`
  - Add `static cleanupOnDestruct(stuff: Stuff): void`.
    Snapshots the slot map; for each occupied slot, calls
    the canonical `SlotApi.vacate` chokepoint (firing
    `onVacated`/`onUnwielded`/posture-witness chain on the
    held side). See open question #5 resolution for the
    chair-and-sword rationale.
  - Delete the existing `Slotted.onDestruct` body
    (`this.slots.clear()` at lines 326-329) — the static
    handles it via the chokepoint, witnesses now fire
    correctly. Parallel to the Slottable migration.

- `packages/server/src/mud/lib/species/Species.ts`
  - Add `static cleanupOnDestruct(stuff: Stuff): void`. Body:
    walk `(stuff as Species).getParentClade()`; if non-null,
    call `clade.removeSpecies(stuff)`. R2.4 per OPEN-4
    resolution.

**New public API surface.**

- No new instance methods; only `static cleanupOnDestruct` on
  four mixin classes. The slate explicitly notes
  `cleanupOnDestruct` is NOT in any interface — discovered
  structurally.

**Tests to add or modify.**

- `packages/server/src/mud/lib/spatial/__tests__/Container.test.ts`
  (new test cases — or new file `Container.destruct.test.ts`)
  - **S1: contents evacuate to outer container.** A backpack
    inside a room, with items inside the backpack; destruct
    the backpack; items end up in the room. Their
    `onMoved(backpack, room)` fires (verify witness fires).
  - **S1: top-of-containment evacuation goes to null.** A room
    with items; destruct the room; items' `getContainer()`
    returns null afterward.
  - **S1: container with NO outer (Container that isn't a
    Containable, e.g., a base Location).** Same as previous
    case — `getContainer?.()` returns null; items evacuate to
    null.
  - **Recursive case: nested containers.** Box-in-bag-in-room;
    destruct the bag; box ends up in the room with its own
    contents intact (i.e., Container's cleanup does NOT cascade
    to destruct, only re-parent).
  - **Walk order: Container fires before Containable for a
    Container+Containable composition.** Compose
    `ContainerMixin(ContainableMixin(Stuff))`, place inside an
    outer Container, destruct. Container's evacuation must
    happen while `getContainer()` still returns the outer;
    otherwise Containable's self-unhook (Phase 3 below) would
    fire first and the evacuation would land items in `null`
    instead of the outer.

- `packages/server/src/mud/lib/spatial/__tests__/Containable.test.ts`
  (new test cases)
  - **S2: destructed item is removed from container's
    contents.** Verify the container's `getContents()` no
    longer includes the destructed item; `hasContainable` is
    false; the count is correct.
  - **S2 with `ContainmentApi.move(item, null)` chokepoint:**
    confirm `onContainableRemoved` witness fires on the
    container; confirm `onMoved(from, null)` fires on the item.
  - **R2.3 self-heal: getContainer returns null when container
    was destroyed without going through evacuation.** Force
    the bug case (set the field directly via RAW_TARGET, then
    destruct the container without the new framework cleanup —
    this means you'll need to short-circuit; recommendation: do
    this test by destructing a container that's been
    artificially prevented from cleaning up. Or simpler: have
    one test that just artificially destroys the env and
    re-reads through `getContainer()`.)

- `packages/server/src/mud/lib/slot/__tests__/Slottable.test.ts`
  (modify existing tests)
  - The migration is behavior-preserving; existing tests
    should still pass.
  - Add: **subclass override of `onDestruct` no longer skips
    slot vacate.** A `class Sub extends SlottableMixin(Stuff) {
    override onDestruct() { /* deliberately doesn't call super
    */ } }`; occupy a host slot; destruct the Sub; assert the
    host's slot is vacated (proves the cleanup migrated to a
    place subclasses can't accidentally skip).

- `packages/server/src/mud/lib/species/__tests__/Species.test.ts`
  or `Clade.test.ts`
  - **OPEN-4 sanity: a Species destructed via `StuffApi.destruct`
    is removed from its parent Clade's `species` set.** Requires
    seeding a clade-species relationship. (Note: today's
    production code doesn't actually call `addSpecies` at
    hydrate yet — see open question #9 — so this test has to
    seed the relationship explicitly. The handler is still
    correct in principle.)

**Invariants the tests must cover.**

- Walk order matters: most-derived first.
- Iteration safety: a snapshot of the contents set is taken
  before iterating (the move-out causes
  `removeContainable` to mutate the live set).
- `ContainmentApi.move` chokepoint: every detach goes through
  it; witnesses fire.
- Self-heal on `getContainer` when env was destroyed.

**Subtle pitfalls.**

- The Container cleanup walks `this.contents`, but
  `removeContainable` (called via `setContainer`, called via
  `ContainmentApi.move`) mutates that same set. Snapshot
  first: `const snapshot = Array.from(this.contents);` then
  iterate the snapshot. Same applies to Slottable's existing
  pattern (`occupied.entries()` returns a fresh Map).
- A Container that's not also Containable (e.g., a top-level
  Location whose own getContainer returns null without going
  through Containable) needs a duck-type check:
  `const outer = MixinApi.isContainable(stuff) ? (stuff as Stuff &
  Containable).getContainer() : null;` (recommended) or
  `'getContainer' in stuff ? (stuff as any).getContainer() :
  null`.
- For the Species cleanup, `getParentClade()` is a Pattern A
  path-resolution: it can return null after hot-reload churns
  the Clade singleton. Don't throw on null; just skip.
- The Slottable migration deletes `super.onDestruct()`. Verify
  no Slottable subclass in the codebase calls
  `super.onDestruct()` expecting THIS layer's logic to fire —
  search the codebase for `SlottableMixin` users that
  themselves define `onDestruct`. If any do, their chain
  doesn't break (the layer below — `Stuff.onDestruct()` — is a
  no-op terminal), but it does mean their cleanup never fires.
  Per phase 2's dispatcher, that's correct: framework cleanup
  is separate.

### Phase 4 — New mixin pair: SpawnerMixin + SpawnedMixin

**Purpose.** New named substrate per the slate's "Spawner /
Spawned — within-session dynamic-spawn tracking" section.
Composes on the infrastructure from Phases 2–3 (uses the new
`cleanupOnDestruct` mechanism for R2.4).

**Changed files (all new):**

- `packages/server/src/mud/lib/stuff/Spawner.ts` — new file.
  ```ts
  export interface Spawner {
    trackSpawn(spawned: Stuff & Spawned): void;
    untrackSpawn(spawned: Stuff & Spawned): boolean;
    getSpawned(): ReadonlySet<Stuff & Spawned>;
    hasSpawned(spawned: Stuff & Spawned): boolean;
  }
  ```
  Mixin marker `_mixinName = 'SpawnerMixin'`. Composes on
  `Stuff` (no `Container` prereq). Field
  `protected _spawned: Set<Stuff & Spawned> = new Set()`. NOT
  in `persistentFields` — transient.
- `packages/server/src/mud/lib/stuff/Spawned.ts` — new file.
  ```ts
  export interface Spawned {
    getSpawner(): (Stuff & Spawner) | null;  // R2.3 self-heal
    setSpawner(s: (Stuff & Spawner) | null): void;
  }
  ```
  Mixin marker `_mixinName = 'SpawnedMixin'`. Field
  `private _spawner: (Stuff & Spawner) | null = null`. Self-heal
  getter (R2.3) following the slate template at lines 128-137.
  Static `cleanupOnDestruct(stuff)`: read `getSpawner()`; if
  non-null call `spawner.untrackSpawn(stuff)`.
- `packages/server/src/mud/lib/mixin.ts` — add `Spawner` /
  `Spawned` entries to `Mixins`. (Already noted in Phase 2.)
- `packages/server/src/mud/api/mixin.ts` — add type imports for
  `Spawner` / `Spawned`; add `MixinApi.isSpawner` /
  `MixinApi.isSpawned` predicates.

**Tests to add (`packages/server/src/mud/lib/stuff/__tests__/`):**

- `Spawner.test.ts`:
  - `trackSpawn` / `untrackSpawn` round-trip.
  - `getSpawned` returns a readonly view.
  - `hasSpawned` predicate.
- `Spawned.test.ts`:
  - `getSpawner` returns the live ref.
  - `getSpawner` self-heals to null when the spawner is
    destructed (R2.3).
- `Spawner.cleanup.test.ts`:
  - **R2.4 symmetric cleanup.** Track a spawn; destruct the
    spawn; assert the spawner's `_spawned` no longer contains
    it. Confirms `Spawned.cleanupOnDestruct` fires.
  - **Default: no cascade on Spawner destruct.** Track a spawn;
    destruct the spawner. Spawn survives. (`isDestroyed()` of
    the spawn is false; calling `getSpawner()` returns null
    after self-heal.)
  - **Author opt-in cascade via override of `onDestruct`.**
    Subclass `SpawnerMixin(Idea)` overrides `onDestruct` to
    iterate `getSpawned()` and `StuffApi.destruct(each)` before
    `super.onDestruct()`. Verify spawns are destructed.

**Invariants the tests must cover.**

- Transient collection (clone/hydrate produces empty
  `_spawned`).
- R2.3 self-heal on `Spawned.getSpawner`.
- R2.4 symmetric cleanup wired through the new framework
  dispatcher.
- No automatic cascade — the override is the extension site.

**Subtle pitfalls.**

- `getSpawner` returns null after self-heal; subsequent calls
  do NOT re-read a destroyed ref (idempotent).
- `trackSpawn` should set BOTH sides (call
  `spawned.setSpawner(this as Stuff & Spawner)`); `untrackSpawn`
  should clear (call `spawned.setSpawner(null)` if the spawner
  argument matches). Author the symmetric-pair semantics
  carefully; mirror the `Boundary.detach` pattern.
- The slate sketches the method surface as a sketch (line
  481-491). The actual API needs to match the
  `collections.md` `addX` / `removeX` / `getXs` / `hasX`
  convention. Recommendation: keep `trackSpawn` / `untrackSpawn`
  (the slate's gameplay-aware names) rather than `addSpawn` /
  `removeSpawn` — the gameplay reading is the point. Document in
  collections.md as a named exception or add a `track*` /
  `untrack*` clause.

### Phase 5 — Ancillary code drops: Exit cache, lastTouchMs instrumentation

**Purpose.** Independent fixes that fall out of the slate's
resolutions but don't depend on Phases 2–4. Sequenced LAST
inside the build so they don't get tangled with the more
load-bearing changes — but still in the same MR.

**Changed files:**

- `packages/server/src/mud/lib/boundary/Exit.ts`
  - Drop the `_destination` cache field (line 119). The
    `protected get destination()` accessor (lines 140-156)
    simplifies to: read `_destinationPath`; if null and no live
    ref was stored, throw "no destination"; otherwise call
    `StuffApi.findByTemplatePath<Stuff & Container>(_destinationPath)`
    and return the result (throw if not loaded, matching the
    current "not yet loaded" throw).
  - `setDestination(value)` needs reconsideration: previously
    it set the `_destination` cache; now it should stamp
    `_destinationPath` from `value.getTemplatePath()` (Pattern
    A style). Verify all callers' expectations.
  - `resolveDestination()` (line 328) stays — it can still
    trigger zone-load faults; what's gone is the runtime cache.
    Update its body to no longer use `_destination` as a cache
    slot.
  - Update `getDestinationTemplatePath()` (line 346) — the
    `_destination` branch goes away.
  - Update the constructor (line 294) — both
    `destination` and `destinationPath` opts still accepted, but
    `destination` arg gets converted to a path stamp at the
    constructor.
  - Update the JSDoc comment above the field block (lines
    114-128 and surrounding) to reflect the post-cache shape.

- `packages/server/src/mud/lib/stuff/Stuff.ts`
  - Add `#lastTouchMs: number = Date.now();` — hard-private
    slot on the raw target. Tamper-proof against external
    writes: not bracket-reachable, not visible to subclasses,
    not visible to shadows, not in `PASSTHROUGH_KEYS`. Only
    code lexically inside the `Stuff` class body can touch it.
    This is exactly the "Special case 1 / 2 / 3" carve-out
    documented in CLAUDE.md for `#` in trusted-surface code:
    an invariant-critical field whose write must NOT be
    forgeable by a malicious mixin or shadow.
  - Add static read/write seams (also in the `Stuff` class
    body — required so the `#` access is lexically permitted):
    ```ts
    // Write seam. Only ever sets to Date.now(); cannot inject
    // arbitrary values. Called from SecurityApi.#interceptor.
    static touch(stuff: Stuff): void {
      const raw = (stuff as any)[Stuff.RAW_TARGET] ?? stuff;
      raw.#lastTouchMs = Date.now();
    }
    // Read seam. Used by the future GC sweep.
    static getLastTouchMs(stuff: Stuff): number {
      const raw = (stuff as any)[Stuff.RAW_TARGET] ?? stuff;
      return raw.#lastTouchMs;
    }
    ```
  - Why static (not instance methods): inside an instance
    method, `this` is the proxy. `this.#lastTouchMs` throws
    "Cannot read private member" because `#` slots live on the
    raw target only. The static seam takes the stuff as an arg
    and unwraps via `RAW_TARGET` before reaching `#`. Same
    pattern the codebase already uses for `Stuff.RAW_TARGET`-
    style access.
  - **Do NOT** add `lastTouchMs` to `PASSTHROUGH_KEYS` — the
    whole point is to keep it off the proxy surface.
  - **Do NOT** add to `persistentFields` — transient by
    definition; resets at construction (which fires fresh on
    clone/hydrate).
  - **Do NOT** add a `setLastTouchMs(value)` of any kind. The
    only write path is `Stuff.touch()`, which is
    timestamp-fixed.

- `packages/server/src/mud/api/security.ts`
  - In `#securityGate` (line 502), after step 1 (destroyed
    guard, line 516-522) and AFTER step 2 (entry policy, line
    525), add:
    ```ts
    // Maintain GC last-touch timestamp. Only fires on a
    // successful (non-denied) dispatch — denied calls don't
    // count as "touches." Write goes through the tamper-proof
    // static seam, not a public field.
    Stuff.touch(ctx.target);
    ```
  - Placement rationale: AFTER policy check, so denied calls
    don't update the timestamp. Slate says line 662: "writes a
    timestamp on every method dispatch" — strict reading is
    every successful dispatch.
  - The interceptor has access to `ctx.target` (the raw
    target). `Stuff.touch()` accepts either the raw target or
    the proxy and unwraps internally; passing the raw target
    is cheaper, so pass `ctx.target` directly.

#### Phase 5 addendum — `templatePath` tamper-resistance

**Scope.** Lock down `Stuff.templatePath` the same way as
`lastTouchMs`. Today the field is `public` and in
`PASSTHROUGH_KEYS` (proxy.ts:89-98), and the proxy has no `set`
trap (proxy.ts:132 comment). Any code can do
`(stuff as any).templatePath = '/forged/path'` and the write
lands on the raw target — bypassing both the ApiOnly gate on
`setTemplatePath()` AND the `byTemplatePath` reindex. A forged
Stuff becomes invisible to `findByTemplatePath` lookups while
its `getTemplatePath()` returns the forged value. Worse than
`lastTouchMs` forgery because it breaks hot-reload's identity
contract.

**Probe findings (verified against the codebase before
writing this section):**

- `templatePath` is `public` at `Stuff.ts:86`.
- Today's `setTemplatePath()` (`Stuff.ts:107-112`) writes
  `this.templatePath = path` — works only because passthrough
  on a method receiver lets the write reach the raw target.
- `templatePath` is NOT in any mixin's `persistentFields`.
  The PersistentHydrator's generic loop
  (`PersistentHydrator.ts:75-77`) never touches it. **No
  Hydrator seam needed.**
- Two write sites total:
  - `Stuff.setTemplatePath()` (post-register, re-keys index)
  - `StuffApi.#cloneInner` line 344 (pre-register stamp,
    deliberately skips reindex; comment at 338-343 explains
    why)
- Three read sites that bracket-cast today:
  - `Stuff.getTemplatePath()` line 88
  - `StuffApi.#updateIndexes` lines 90-91
  - `StuffApi.#registerAndInit` event emit lines 522-523

**Proposed lockdown.**

```ts
// In Stuff.ts (module-level export).
export const STAMP_TEMPLATE_PATH_SEAM = Symbol(
  "Stuff.stampTemplatePath"
);

class Stuff {
  #templatePath: string | null = null;

  // Read seam — instance method form. The proxy-receiver
  // problem is handled by unwrapping via RAW_TARGET before
  // reaching the # slot.
  public getTemplatePath(): string | null {
    const raw = (this as any)[ProxyApi.RAW_TARGET] ?? this;
    return raw.#templatePath;
  }

  // Public write — ApiOnly-gated; reindexes byTemplatePath.
  @Final @Unshadowable @CallSecurity(SecurityPolicies.ApiOnly)
  public setTemplatePath(path: string): void {
    const raw = (this as any)[ProxyApi.RAW_TARGET] ?? this;
    if (raw.#templatePath === path) return;
    const prev = raw.#templatePath;
    raw.#templatePath = path;
    StuffApi._reindexTemplatePath(this, prev, path);
  }

  // Pre-register stamp seam — used by StuffApi.#cloneInner.
  // Symbol-keyed: eval scripts / shadows / content code that
  // doesn't import the symbol can't reach this. Skips the
  // reindex (the caller is responsible for ensuring the Stuff
  // isn't yet in the byTemplatePath index when called).
  static [STAMP_TEMPLATE_PATH_SEAM](
    stuff: Stuff,
    path: string | null
  ): void {
    const raw = (stuff as any)[ProxyApi.RAW_TARGET] ?? stuff;
    raw.#templatePath = path;
  }
}
```

**Changed files:**

- `packages/server/src/mud/lib/stuff/Stuff.ts`
  - Change `public templatePath: string | null = null;` (line
    86) to `#templatePath: string | null = null;`.
  - Add `STAMP_TEMPLATE_PATH_SEAM` symbol export at module
    top.
  - Update `getTemplatePath()` (lines 87-89) to the unwrap
    form shown above.
  - Update `setTemplatePath()` (lines 107-112) to the unwrap
    form (decorators and reindex call unchanged).
  - Add the `static [STAMP_TEMPLATE_PATH_SEAM]` seam.

- `packages/server/src/mud/api/proxy.ts`
  - Remove `'templatePath'` from `PASSTHROUGH_KEYS` (line 94).
  - Update the comment block at lines 79-87 — `templatePath`
    is now `#`-private and accessed via `Stuff.getTemplatePath`
    / `Stuff[STAMP_TEMPLATE_PATH_SEAM]`, not via passthrough.

- `packages/server/src/mud/api/stuff.ts`
  - Lines 90-91 (`#updateIndexes`): change
    `const templatePath = (obj as unknown as { templatePath?: string }).templatePath;`
    to `const templatePath = obj.getTemplatePath();`. (The
    instance method handles unwrap internally; this is also a
    cleaner pattern matching the inter-Stuff contract.)
  - Line 344 (`#cloneInner` pre-register stamp): change
    `(obj as unknown as { templatePath?: string }).templatePath = templatePath;`
    to `Stuff[STAMP_TEMPLATE_PATH_SEAM](obj, templatePath);`.
    Import the symbol at the top of the file.
  - Lines 522-523 (`#registerAndInit` event emit): change
    `const templatePath = (proxy as unknown as { templatePath?: string }).templatePath;`
    to `const templatePath = proxy.getTemplatePath();`.

**Tests to add or modify** (alongside the lastTouchMs tamper
tests in the same `lastTouchMs.test.ts` file, or a separate
`templatePath-lockdown.test.ts`):

- **Pre-/post-condition:** `getTemplatePath()` returns the
  value `setTemplatePath()` was last called with. Round-trip
  through the ApiOnly gate still works.
- **`#cloneInner` pre-register stamp still works:**
  `StuffApi.clone(path)` produces a Stuff whose
  `getTemplatePath()` returns `path`. Behavior unchanged.
- **Index round-trip:** `StuffApi.findByTemplatePath(path)`
  returns the cloned Stuff. The seam-based pre-register stamp
  feeds the index correctly via the existing
  `#updateIndexes` pass.
- **Tamper attempts (all are no-ops on the `#`-slot value):**
  - `(stuff as any).templatePath = '/forged/path'` — lands as
    a stray own-property on the raw target (no proxy set
    trap), but `getTemplatePath()` still returns the real
    value. The stray property doesn't appear in
    `JSON.stringify` output (it's writable on raw, but the
    proxy's get trap returns `undefined` after PASSTHROUGH
    removal — verify behavior).
  - `(stuff as any)['templatePath']` reads `undefined` (no
    passthrough, no field on the proxy surface).
  - `Reflect.set(stuff, 'templatePath', '/forged')` is a
    no-op for the `#` slot.
  - A shadow method registered on `getTemplatePath` is still
    callable (it dispatches through the shadow chain), but
    even a shadow that returns a forged string can't change
    the underlying `#` slot — `findByTemplatePath` still
    works correctly because the index keys on the registered
    write site.
- **Index integrity under tamper:** forging
  `(stuff as any).templatePath = '/forged'` does NOT cause
  `findByTemplatePath('/forged')` to return the forged Stuff.
  Confirms the byTemplatePath index can't be poisoned via
  field-write.
- **`STAMP_TEMPLATE_PATH_SEAM` is not reachable without the
  import:** a test that simulates "an eval script tries to
  enumerate Stuff's static methods and finds the seam" —
  `Object.getOwnPropertyNames(Stuff)` does NOT include the
  symbol; only `Object.getOwnPropertySymbols(Stuff)` reveals
  it, and the symbol is a private module export. Document the
  threat boundary: a determined attacker with full code
  reflection (e.g., from inside an `EvalScript`) could find
  the symbol; the lockdown is defense in depth, not perfect
  capability isolation. This matches the level of protection
  the rest of the substrate provides.

**Migration risk.** The three read-site changes are mechanical.
The pre-register stamp seam call is one line. Test coverage on
the existing clone pipeline (which has broad test coverage
already) is the main regression guard — if `#cloneInner`'s
stamp-then-register-then-emit sequence breaks, many tests
fail loudly.

**Out of scope.** `zone` has the same field-write attack
surface (also in PASSTHROUGH_KEYS, no ApiOnly gate on
`setZone` at all). Different threat model — `setZone()` is
freely callable by domain code, so the lockdown rationale
doesn't carry over. Worth a follow-up audit on whether the
zone-write surface needs hardening, but NOT in scope for
this MR.

**Tests to add or modify:**

- `packages/server/src/mud/lib/boundary/__tests__/Exit.test.ts`
  - Existing tests need updates: any that assert
    `_destination` cache shape break. The cache is gone.
  - **Resolution still works for loaded singleton.**
  - **Resolution returns/throws same as before when the
    target is not loaded.**
  - **`getDestinationTemplatePath` returns the correct path
    regardless of whether destination is resolved.**

- `packages/server/src/mud/api/__tests__/stuff.test.ts` or a
  new `lastTouchMs.test.ts`:
  - **Initialized at construction.** `Stuff.getLastTouchMs(s)`
    returns a value close to `Date.now()` immediately after
    creation.
  - **Updated on every successful method dispatch.** Call any
    method through the proxy; read via the static; confirm it
    advanced (use a fake clock).
  - **NOT updated on a denied (policy-rejected) dispatch.**
    Set up a Stuff whose policy denies; attempt a call;
    confirm the value didn't advance.
  - **NOT persisted across clone/hydrate** — sanity check that
    `persistentFields` doesn't include it and that
    `StuffApi.clone` produces a Stuff whose lastTouchMs is
    fresh (`Date.now()` at clone time).
  - **Tamper-resistance:**
    - `(stuff as any).lastTouchMs = X` is a no-op on the
      proxy surface (assignment lands on the proxy as an own
      property, but does NOT reach the `#lastTouchMs` slot;
      reading via `Stuff.getLastTouchMs` returns the
      framework value, not the injected one).
    - `(stuff as any)['lastTouchMs']` reads `undefined` (no
      public field exists).
    - `JSON.stringify(stuff)` does not include `lastTouchMs`.
    - A subclass that tries to read `this.#lastTouchMs` from
      its own class body fails at parse time (subclasses
      can't reach `Stuff`'s `#` slots).
    - A shadow that tries to override the write fails — the
      static seam isn't dispatched through the proxy.

**Invariants:**

- `Exit.findByTemplatePath` is O(1); dropping the cache adds
  no measurable cost.
- `lastTouchMs` write is one assignment, no allocation. The
  proxy gate is already on the hot path.

**Subtle pitfalls:**

- `_destination` removal: `protected set destination(value)`
  currently sets `this._destination = value`. After removal,
  the public `setDestination` should stamp the path via
  `value.getTemplatePath()`, matching the Pattern-A style. Two
  decisions arise:
  - What if `value.getTemplatePath()` is null at the moment of
    set? (A runtime-only target with no path.) Throw — that's
    the constraint per the slate ("Pattern C stays
    singleton-only" + "lookup mechanism `findByTemplatePath`
    throws if multiple instances share a path"). Decision
    item.
  - Constructor was accepting `destination: Stuff & Container`
    directly. Same conversion applies.
- `PASSTHROUGH_KEYS` in `proxy.ts` is read on every property
  access. Adding to it is safe but each addition is a small
  hot-path cost. Acceptable.
- The proxy interceptor write to `ctx.target.lastTouchMs` reads
  the raw target slot (not the proxy). Direct write OK because
  the field is non-private public.

### Phase 6 — Doc rewrite

**Purpose.** `docs/ref-shapes.md` consistent with the slate's
final shape. The slate's "Doc rewrite consequences" section
(lines 1220-1244) enumerates exactly what changes.

**Changed files:**

- `docs/ref-shapes.md` — rewrite per the consequences
  enumeration. Key edits:
  - Pattern A: largely unchanged.
  - Pattern B: rewritten with the four R2.x sub-flavors
    explicit. Replaces "Persistence" subsection — point out that
    live refs are transient by definition, that fields needing
    save-survival either store a path string (Pattern A/C) or
    live on a higher-layer mixin.
  - Pattern C: stays singleton-only. Remove the
    `_xxxResolved` cache slot from the field-shape example;
    the getter does `StuffApi.findByTemplatePath` on every
    call. Remove `async resolveXxx()` from the default surface
    — Exit's stays because it can fault in a zone load, but
    that's an Exit-specific affordance not a Pattern C
    requirement.
  - Exemplar tables (current lines 195-203, 248-253) updated:
    - `Container.contents` and `Containable._container`
      annotated as "Runtime-only" (not "persisted via
      marshaller").
    - `Exit._destination` row removed.
  - Antipatterns section (current lines 277-352) gains four
    new entries from the slate's "Doc rewrite consequences":
    1. **Persisting a live ref.** Live refs are transient by
       definition.
    2. **Using a live ref for cross-scope to a singleton.**
       Should use Pattern C.
    3. **Holding an asymmetric single without self-heal.**
       Must implement R2.3 getter shape.
    4. **Holding a collection of live refs without symmetric
       cleanup.** Must register `cleanupOnDestruct`.
  - Add a "Cleanup rules R2.1–R2.4" subsection (text mostly
    lifted from the slate's `ref-shapes-slate.md:91-173`).
  - Add SpawnerMixin / Spawned exemplar — possibly with a
    cross-reference to a future `docs/subsystems/spawn.md` once
    that subsystem doc exists.

- `docs/subsystems/mixins.md` — add documentation for the
  `static cleanupOnDestruct(stuff)` convention, paralleling
  the existing `static _mixinName` and `static
  persistentFields` documentation (current lines 138-155 and
  201).

- `CLAUDE.md` — update if any of these surfaces are referenced
  there. Scan for `cleanupOnDestruct`, `Pattern B`, etc. (Quick
  scan; likely no change needed.)

**Tests:** none (doc-only). Confirm no internal links break.

### Phase 7 — Slate retirement

**Purpose.** The slate's existence is its retirement criterion.

**Action:**

- Delete `docs/slates/ref-shapes-slate.md`. (Or move to
  `docs/slates/retired/`; check what convention other retired
  slates use — `git log` for `docs/slates/` shows the pattern.)

If the slate's PR-15 reference (line 215 of
`spawn-shape-slate.md`) suggests slates are retired alongside
their MR, this MR's commit description should note: "Retires
docs/slates/ref-shapes-slate.md."

---

## Concrete invariants to test (cross-cutting)

A flat list of load-bearing invariants. Each test in the phase
plans above maps back to one of these. Phases 2–4 should each
add the invariants in their phase that map to this list; phase
5's tests cover the lastTouchMs and Exit ones.

1. **Walk order: most-derived-first.** For
   `ContainerMixin(ContainableMixin(Stuff))`, Container's
   cleanup runs before Containable's.
2. **Force and non-force both run framework cleanup.** Only the
   `canDestruct` veto differs.
3. **Log-and-continue on cleanup-handler throw.** Per-handler
   try/catch; throws logged with mixin name + stuff id; loop
   continues; `Stuff.destroy()` runs unconditionally; the
   `StuffApi.destruct` call itself does NOT throw. One bad
   handler can't block subsequent handlers or destroy().
4. **`ContainmentApi.move` is the chokepoint.** Container cleanup
   evacuates via `move(item, outer)`. `onMoved(from, to)`
   witnesses fire on the evacuated items.
5. **`Containable.getContainer()` self-heals.** If `environment`
   points at a destroyed Container, the next read returns null
   and clears the slot.
6. **Iteration safety: contents mutation during cleanup walk.**
   The cleanup snapshot is taken before iteration. `removeContainable`
   firing during the loop does not throw / skip.
7. **`Slottable` cleanup migration is bypass-resistant.** A
   subclass `onDestruct` override that omits `super.onDestruct()`
   does NOT skip the slot vacate.
7a. **`Slotted` holder destruct actively vacates occupants
    via the canonical chokepoint.** Chair destructs → sitter
    gets `onVacated` witness and posture transitions; avatar
    destructs → wielded items get `onUnwielded` witness AND
    move to outer container (via the prior Container cleanup
    step). Slot occupants don't get left with stale host refs
    waiting on lazy self-heal.
8. **`Spawned._spawner` self-heals on Spawner destruct.**
9. **Spawner destruct does NOT cascade to spawns by default.**
   Override of `onDestruct` is the opt-in path; tested via a
   subclass.
10. **Transient collections reset on clone/hydrate.**
    `Spawner._spawned`, `Slotted.slots`, `Adornable.fixtureSlots`,
    `Container.contents` (already true), `Stuff.lastTouchMs` (resets
    to construction time).
11. **`findByTemplatePath` throws on multi-instance violation.**
    Exit destination safety: a runtime test that registers two
    instances at the same path; `getDestination()` throws,
    matching the existing contract (`api/stuff.ts:691-694`).
12. **`Exit` destination resolves on every read after cache
    removal.** Verify hot-reload of the destination is observed
    on the next call.
13. **`lastTouchMs` is monotonic-ish across method dispatches.**
14. **`templatePath` is tamper-resistant.** A field-write attempt
    (`(stuff as any).templatePath = '/forged'`) does not change
    the value returned by `getTemplatePath()` and does not
    poison the `byTemplatePath` index. Only `setTemplatePath()`
    (ApiOnly) and `Stuff[STAMP_TEMPLATE_PATH_SEAM]`
    (symbol-keyed, used pre-register) can change the slot.
15. **No regression on existing tests.** The full test suite
    must pass; specifically the existing
    `Adornable.onDestruct destructs every fixture` test (line 78
    of `Adornable.test.ts`) must still pass — `AdornableMixin`'s
    convention-based `onDestruct` (R2.1 owning cascade) is NOT
    being migrated.

---

## Open implementation-time questions

Surfaced here before the build starts so they're handled
deliberately. Each has a recommendation.

### 1. Exception policy when a cleanup handler throws

**Question:** what's the contract when a registered
`cleanupOnDestruct` throws? Log + swallow? Rethrow after
destroy? Collect and rethrow as `AggregateError`?

**Why it matters:** the framework-cleanup loop in
`#destructCore` walks N handlers per destruct. If one throws,
subsequent handlers don't fire; the registry never unhooks the
Stuff; future code sees a half-destroyed entity.

**Recommendation:** **log-and-continue, never rethrow.** Wrap
each per-mixin invocation in try/catch; on throw, log the
error with context (mixin name, stuff id, the error itself);
continue to the next handler. After the cleanup loop, run
`ShadowApi._detachAllForHost` and `Stuff.destroy()`
unconditionally. `StuffApi.destruct` itself never rethrows
cleanup-handler failures.

**Rationale.**

- **The caller has no recovery path.** `destruct(obj)`
  conceptually means "this object is gone." The caller can't
  un-destruct, can't re-run cleanup, can't repair partial
  state. The realistic production catch-block is
  `} catch (e) { log(e); }` — exactly what we'd be doing
  centrally anyway.
- **Substrate cleanup is best-effort bookkeeping, backed by
  GC.** The slate's R2.1–R2.3 failure-mode framing is "owned
  objects leak — caught later by GC; doesn't corrupt
  invariants." Throwing turns that recoverable leak into an
  unpredictable destruct primitive.
- **Partial state after throw is already recoverable.** If
  `Container.cleanupOnDestruct` evacuates 3 of 5 items and
  then throws, the remaining 2 items keep `_container`
  pointing at a soon-to-be-destroyed container — caught by
  the R2.3 self-heal on `Containable.getContainer()`. GC
  catches the orphans. The design ALREADY assumes some
  cleanup paths can fail silently and the system recovers.
- **Forceful vs normal destruct uniform.** Both run cleanup
  with the same exception policy.

**Test visibility.** Tests assert "no cleanup errors during
destruct" by spying on the log seam (console.error or the
framework logger) and confirming it wasn't called. Vitest
configs typically also fail tests on uncaught console.error
in strict modes. Test fidelity matches what
`expect(() => …).not.toThrow()` would give for the common
case.

**Implementation shape:**

```ts
const destructing = ctx.target; // raw target
for (const mixinCtor of mixinChainMostDerivedFirst) {
  if (!Object.prototype.hasOwnProperty.call(
        mixinCtor, 'cleanupOnDestruct'
      )) continue;
  try {
    mixinCtor.cleanupOnDestruct(proxy);
  } catch (err) {
    console.error(
      `StuffApi.destruct: ${mixinCtor._mixinName}.` +
      `cleanupOnDestruct threw for stuff ${proxy.stuffId}`,
      err
    );
    // continue
  }
}
```

(Replace `console.error` with whatever logger seam the
framework standardizes on — single touch site, easy to swap.)

Does NOT block coding — can be locked at PR-start time.

### 2. Iteration-during-mutation in Container cleanup

**Question:** does the dispatcher itself provide an iteration
helper, or does each handler snapshot defensively?

**Recommendation:** **per-handler.** Each handler that walks a
collection takes its own snapshot. Adding a generic snapshot
helper to the dispatcher pre-supposes the handler's storage
shape (Set? Map? Array?). Per-handler is more honest. Document
the requirement in `mixins.md`.

Does NOT block coding.

### 3. Destruct re-entry from inside a cleanup handler

**Question:** can a cleanup handler call `StuffApi.destruct(other)`
on a different Stuff? If so, what happens to the outer destruct's
flow?

**Why it matters:** Container.cleanupOnDestruct on a cascading
subclass might want to destruct contents instead of evacuate.
Adornable's owning cascade (R2.1) destructs fixtures from
`onDestruct` — this already happens today. It WILL happen during
the new framework-cleanup walk for subclasses that opt into
cascade.

**Recommendation:** **allowed.** The destruct flow is reentrant
by today's design (Adornable already does it). The new
dispatcher just adds more steps before destroy() runs; nested
destructs run as normal recursive calls. No queue, no defer.
Test: subclass override of `Container.onDestruct` that calls
`StuffApi.destruct(item)` for each content; verify no
infinite-loop / no double-destruct (Stuff.destroy() guards
against the latter via `_isDestroyed` check at line 413).

Does NOT block.

### 4. What happens to items evacuated to `null`

**Question:** when the top-of-containment Location destructs,
its contents evacuate to `null`. What's an item with
`environment === null` semantically? Float in limbo?
Auto-destruct?

**Why it matters:** Players in a destructing zone are
Containable. If their Location destructs, they end up with
`environment === null`. What's that mean for them?

**Resolved:** null-environment means "in limbo" — no special
framework behavior. The framework drops the ref; whatever the
game-layer wants to do is its concern. The Stuff sits without
a container, can't move via exits (there are no exits on
null), and gets caught by the GC sweep eventually. This is
the current implicit contract — `Containable.environment` is
already null before first placement, so "stuff with null env"
isn't a new state.

**Future content-layer concern (NOT in scope for this MR):**
for interactives (Avatars), zone destruct stranding the
player is a real user-facing problem. The escape hatch is
likely an Avatar-side witness on `Containable.onMoved(from,
null)` that teleports the avatar to a configured safe
location (home zone, last-known-good location, etc.). Lives
on Avatar, not in the substrate.

Does NOT block.

### 5. `Slotted` HOLDER destruct (not held side)

**Resolved: active vacate via canonical chokepoint.** Add
`Slotted.cleanupOnDestruct(stuff)` static to Phase 3, parallel
to the `Slottable.cleanupOnDestruct` migration. Snapshots the
slot map, calls the canonical `SlotApi` vacate method per
occupant, witnesses fire on the held side automatically. The
existing `Slotted.onDestruct` body (the `this.slots.clear()`
call at lines 326-329 of `Slotted.ts`) is removed — the static
covers it cleanly.

**Why active vacate (not just `slots.clear()`).** The substrate
invariant (no stale refs) is satisfied by `slots.clear()` —
the held Slottable's `getOccupiedHost()` would return null
lazily. But two concrete scenarios reveal a semantic gap:

- **Chair destructs while avatar sits in `sit:1`.** With just
  `slots.clear()`, the avatar's posture system never gets a
  "stood up" event. Posture state on the avatar goes stale.
  Active vacate fires the canonical witness; the posture
  system listens and transitions to standing.
- **Avatar destructs while wielding sword in hand-slot.** The
  Container cleanup (most-derived) already evacuates the
  sword to the outer container (per S1). But without active
  slot vacate, the sword's `_occupiedHost` still points at
  the destructed avatar until lazily self-healed. The wield
  witnesses (`onUnwielded`, etc.) never fire. Active vacate
  closes the gap: sword ends up in the outer container AND
  cleanly unwielded.

**Composition walk-through (avatar with sword example):**

Avatar composes (roughly) something like
`WearableMixin(ContainerMixin(SlottedMixin(Mobile(Stuff))))`.
Cleanup walks most-derived first:
1. `Container.cleanupOnDestruct` — evacuates contents to outer
   (sword goes to the room via `ContainmentApi.move`).
2. `Slotted.cleanupOnDestruct` — vacates each occupied slot
   via `SlotApi.vacate` (sword's hand-slot clears,
   `onUnwielded` fires).
3. `Containable.cleanupOnDestruct` — avatar unhooks from its
   own container.

Ordering matters and the most-derived-first rule gets us the
right behavior naturally.

**Implementation sketch:**

```ts
// Slotted.ts (new — parallel to the Slottable migration)
static cleanupOnDestruct(stuff: Stuff): void {
  const host = stuff as Stuff & Slotted;
  // Snapshot — SlotApi.vacate mutates the slot map.
  const occupants: Array<{ slottable: Stuff & Slottable; slot: string }> =
    /* derived from host.getSlots() */;
  for (const { slottable, slot } of occupants) {
    try {
      SlotApi.vacate(slottable, slot);
    } catch (err) {
      // log-and-continue per open question #1
      console.error(/* mixin name, stuff id, err */);
    }
  }
}
```

**Tests** (in addition to the Phase 3 Slottable migration
tests already planned):
- **Chair scenario:** Avatar sitting in chair; destruct the
  chair; assert avatar's `getOccupiedHost()` is null AND
  avatar's posture state transitioned to standing (via the
  witness chain) AND the canonical `onVacated` witness fired
  once.
- **Avatar+sword scenario:** Avatar wielding sword (which
  occupies a hand-slot AND is contained by the avatar);
  destruct the avatar; assert sword's `getContainer()` is
  the room (Container.cleanupOnDestruct), sword's
  `getOccupiedHost()` is null (Slotted.cleanupOnDestruct),
  and the canonical unwield witness fired.
- **Walk-order check:** confirm Container cleanup runs
  before Slotted cleanup for the avatar case (so the
  evacuation completes before slot vacation).
- **Snapshot safety:** vacating an occupant mutates the
  slot map; iteration uses a snapshot to avoid skipped
  entries.
- **Existing `Slotted.onDestruct`** behavior preserved
  (no slottable left in the map post-destruct), confirmed
  via regression on whatever tests today's `slots.clear()`
  supports.

**Phase 3 file impact:** add `Slotted.cleanupOnDestruct` to
`Slotted.ts`; remove the existing `onDestruct` body that
clears `slots`. (Same migration shape as Slottable's
existing `onDestruct` → static.)

Does NOT block.

### 6. `resolveDestination` async-to-sync migration

**Resolved by codebase audit:** no migration needed. Existing
call sites already pick the right method:

- 4 sync callers (`Exitable.ts:413`,
  `LocomotionControllerBase.ts:107`, `locomotion.ts:480`,
  `light.ts:413`) already use `getDestination()`. They assume
  the destination is loaded; sync is correct.
- 1 async caller (`Mobile.ts:315` in `traverse()`) uses
  `await resolveDestination()`. The inline comment explicitly
  identifies this as the zone-load-fault case — Mobile
  crossing a zone boundary may be the moment the destination
  zone needs to load. Async is correct.

The OPEN-3 cache-drop preserves both methods. After the cache
is gone:
- `getDestination()` does `findByTemplatePath(path) ?? null`
  per call (no fault).
- `resolveDestination()` keeps its existing zone-load path
  (no runtime cache slot, but still async-loads on demand).

Nothing to migrate.

### 7. `Stuff.lastTouchMs` (and `templatePath`) visibility & tamper-resistance

**Question:** how do we prevent a malicious mixin / shadow /
eval script from writing an arbitrary value to `lastTouchMs`
and rendering itself effectively immortal to the future GC
sweep?

**Why it matters:** any field reachable on the proxy surface
is writable from anywhere — setters have no proxy trap. The
"public + PASSTHROUGH_KEYS" pattern used by `templatePath` /
`zone` works for those because their misuse is detectable and
non-catastrophic. `lastTouchMs` is different: its job is to
gate lifecycle decisions, so any forgeable value is a real
exploit.

**Recommendation:** see Phase 5. `#lastTouchMs` hard-private
slot on `Stuff` + static `Stuff.touch(stuff)` write seam (only
sets `Date.now()`) + static `Stuff.getLastTouchMs(stuff)` read
seam. The `#` slot is not bracket-reachable, not visible to
subclasses, not visible to shadows, not in `PASSTHROUGH_KEYS`,
not enumerable. Only code lexically inside the `Stuff` class
body can touch it; that's the entire surface where the
invariant is enforced. The write seam is timestamp-fixed, so
even a caller who reaches `Stuff.touch()` can only refresh
their Stuff to the current time, never inject a future or
sentinel value.

Static (not instance) because instance methods called via the
proxy receive `this = proxy`, and `this.#lastTouchMs` throws
"Cannot read private member" — `#` slots live on the raw
target only. The static seam takes the stuff as arg and
unwraps via `RAW_TARGET`.

This is exactly the carve-out CLAUDE.md describes for `#`
inside `lib/`: an invariant-critical slot whose write must
not be forgeable by a subclass or shadow.

**Parallel applies to `templatePath`** for the same reason:
public + PASSTHROUGH means any field-write forges the value
and bypasses the `byTemplatePath` reindex. Lockdown shape is
identical except for one extra detail: `templatePath` has a
pre-register stamp site (`StuffApi.#cloneInner`:344) that
deliberately skips the reindex. That site uses a symbol-keyed
seam (`Stuff[STAMP_TEMPLATE_PATH_SEAM]`) instead of the static
`touch`-style write. Verified by probe: `templatePath` is NOT
in any mixin's `persistentFields`, so no Hydrator changes are
needed — the only call sites are `setTemplatePath` (public,
gated) and the pre-register stamp (seam).

Out of scope for this MR: `zone` has the same public-field
shape but its `setZone()` is NOT ApiOnly-gated. Different
threat model; flag as a follow-up audit.

Does NOT block.

### 8. Hot-reload interaction with new cleanup hooks

**Question:** what if a mixin's `cleanupOnDestruct` static is
replaced mid-destruct by HMR? The dispatcher already grabbed a
reference to the old static.

**Why it matters:** out of scope per OPEN-7. But noteworthy.

**Recommendation:** **document the gap.** The dispatcher reads
`mixinCtor.cleanupOnDestruct` per-invocation, not per-class-load;
HMR replacing the static between Phase 2 dispatcher entry and
the actual call would be visible. Add a one-line note to the
cleanup-hook documentation in `mixins.md`. Defer to the
hot-reload subsystem's own concern.

Does NOT block.

### 9. Audit of existing live-ref marshallers

**Question:** the slate's S10 (line 866-882) asserts "every
live-ref exemplar in the codebase is actually transient — no
live-ref field in `lib/` actually uses a marshaller for
persistence." Plan needs to verify before claiming the
marshaller-for-live-refs story is gone from the doc.

**Verification done in this plan's probe:** grep for
`fieldMarshallers` shows two entries (`Material.density` /
`molarMass` and `Tangible`) — both quantity marshallers, NOT
live-ref marshallers. Confirmed: no live-ref marshaller in
`lib/`. The S10 claim holds. The doc rewrite removes the
marshaller text safely.

Does NOT block.

### 10. Broader scan of live-ref-typed fields in `lib/`

**Question:** beyond `Containable._container`, `Container.contents`,
`Slotted.slots`, `Adornable.fixtureSlots`, `Door.attachedTo`,
`Exit._destination` (going away), `Clade.species`,
`Boundary.anchorA` / `anchorB`, `Exit._door`, `BoundaryAnchor.getBoundary`
— are there others that need R2.1–R2.4 evaluation?

**Codebase scan (this plan's probe):**

- `Stuff & Container` / `Stuff & Containable` ref fields:
  `Containable.environment` (S1/S8), `Container.contents` (S2/S9).
  ✓ Covered.
- `Stuff & Slottable` collections: `Slotted.slots`,
  `Adornable.fixtureSlots`. ✓ Covered (Slottable, and
  Adornable's R2.1 stays convention).
- `Adornment` fields: `Adornable.fixtureSlots`. ✓ Covered (R2.1
  owning cascade, stays).
- `Door.attachedTo: Set<Exit>` (line 86 of `Door.ts`). Symmetric
  pair (Exit ↔ Door). R2.2. Stays convention; Exit.onDestruct
  detaches and Door.detach clears reciprocally.
- `Boundary.anchorA / anchorB`. R2.2 symmetric pair. Stays
  convention; existing `Boundary.onDestruct` /
  `BoundaryAnchor.onDestruct` handle.
- `Exitable.exits: Map<dir, Exit>`. R2.1 owning cascade. Stays
  convention; existing `Exitable.onDestruct` (lines 455-474 of
  `Exitable.ts`) destructs each.
- `Clade.species: Set<Species>`. R2.4, covered by
  `Species.cleanupOnDestruct`.

No other significant ref-typed fields surface. The slate's
inventory is complete.

Does NOT block.

### 11. `considerSelfDestruct` placement

**Question:** does this MR define `considerSelfDestruct(context):
boolean` as a no-op default on `Stuff`?

**Recommendation:** **defer entirely to the future GC slate.**
The MR ships `lastTouchMs` only as the GC prerequisite. The
default `considerSelfDestruct` body, the context shape, and the
sweep loop all live in a separate slate. Adding a no-op default
on `Stuff` now is premature; the future slate may pick a
different shape (an interface? a mixin? a base-class method
with a context param). Skip.

Does NOT block.

### 12. `addSpecies` is not wired in production at hydrate

**Question:** the slate plans `Species.cleanupOnDestruct` to
unhook from `Clade.species`. Today, production code never
populates that set — `addSpecies` is called only in unit tests
(verified by grep). The unhook handler is structurally correct
but tests need to seed the relationship to exercise it.

**Why it matters:** OPEN-4's resolution lands a handler whose
production trigger doesn't exist yet. The handler is harmless
(no-ops when the parent clade is not yet wiring up) but the
slate's framing suggests the relationship is real.

**Recommendation:** **land the handler anyway.** It's
maintainable; once `addSpecies` gets wired (likely Species
template hydration adds itself to its parent clade), the
handler is automatically correct. Add a regression test that
forcibly seeds the relationship and tears it down. Add a TODO
note in `Species.ts` next to `cleanupOnDestruct` that the
wire-up side is pending.

**Resolved: land anyway.** Cheap to add, costs nothing if
dormant, and the slate's R2.4 universality (line 158-161)
wants no exception list. The handler stays correct
structurally; once `addSpecies` wires up at template hydrate
time, it activates without further code changes. Test seeds
the relationship explicitly; production-side wire-up can be a
separate follow-up task. Add a TODO comment in `Species.ts`
next to `cleanupOnDestruct` noting the production trigger is
pending.

Does NOT block.

### 13. Where do SpawnerMixin / SpawnedMixin live in the tree?

**Resolved:** `lib/stuff/Spawner.ts` and `lib/stuff/Spawned.ts`,
siblings to `PostRegistration.ts`, `Singleton.ts`, etc.
`lib/stuff/` is the natural home for foundational mixins that
attach broadly to the Stuff hierarchy. A dedicated `lib/spawn/`
folder would be premature given there's no other spawn-related
content yet. If the substrate later grows additional spawn
files (e.g., a spawn-policy mixin, scheduling helpers), that's
the moment to promote to a subsystem folder. Until then, keep
it flat.

---

## Slate corrections needed

The slate is largely accurate against the codebase but has
small drifts. Resolve these BEFORE building (Phase 1 of the
plan).

### Correction A: line number reference for `Containable.environment`

- **Slate says** (line 90): "`Containable.environment` (see
  `packages/server/src/mud/lib/spatial/Containable.ts:90`) is
  never cleared."
- **Codebase state:** the field declaration IS at line 90.
  Accurate. **No correction needed.**

### Correction B: line number reference for `Slottable.onDestruct`

- **Slate says** (line 79): "`Slottable.onDestruct` already
  does the right thing for slots — see
  `packages/server/src/mud/lib/slot/Slottable.ts:79`."
- **Codebase state:** `onDestruct` declaration is at line 79.
  Accurate. **No correction needed.**

### Correction C: production code does not yet wire `addSpecies`

- **Slate says** (line 165-166): "`Species` → `Clade.species`
  (OPEN-4 resolution)" — implying a real production
  relationship.
- **Codebase state:** `addSpecies` / `removeSpecies` exist on
  Clade (lines 64-68 of `Clade.ts`) but no production caller
  invokes them — only unit tests. The relationship is
  designed-but-unwired.
- **Action:** add a parenthetical note in the slate's OPEN-4
  section: "*Note: Species → Clade.species is currently
  wired only in tests; the handler ships now and stays dormant
  until template hydration wires the call.*"

### Correction D: `Stuff.destroy()` ordering

- **Slate says** (line 940-946): the dispatcher slot order
  shows `canDestruct → user onDestruct → mixin registry walk →
  ShadowApi detach → Stuff.destroy()`.
- **Codebase state:** today's `#destructCore` (line 604-627 of
  `api/stuff.ts`) is `canDestruct → onDestruct →
  ShadowApi._detachAllForHost → object.destroy() → emit`. The
  slate's slot is the insertion between `onDestruct` and
  `_detachAllForHost`. Matches. **No correction needed.**

### Correction E: minor — Spawner method names

- **Slate sketches** (line 482): `trackSpawn`, `untrackSpawn`,
  `getSpawned`, `hasSpawned`.
- **`collections.md` canonical surface** prescribes `addX` /
  `removeX` / `getXs` / `hasX`. Spawner's gameplay-aware names
  break that convention.
- **Action:** decide before build whether to honor the
  gameplay names (recommended — they read better and are
  established in game-dev culture) or align with the
  collections-doc default. If gameplay names: add a clause to
  `collections.md` documenting this as an intentional
  exception.

---

## Risk and rollback

### Riskiest pieces

1. **Mixin registry dispatcher (Phase 2).** Inserting a new
   slot in `#destructCore` runs on EVERY destruct in the
   codebase. A bug here can prevent objects from
   unregistering, cause double-destruct, or throw on perfectly
   benign destructs. Mitigation: phase 2 tests cover the
   exception path comprehensively. Phase 3 adds load-bearing
   handlers immediately — the test surface gets broad coverage
   fast.
2. **Walk order between Container and Containable (Phase 3).**
   If Containable's cleanup fires before Container's,
   evacuating items end up in `null` instead of the outer
   container. Test 1 above is the regression guard.
3. **Slottable migration (Phase 3).** Removing the existing
   `onDestruct` body and moving it to a static could break any
   subclass that calls `super.onDestruct()` expecting the slot
   vacate to happen there. Verified: no such subclasses in
   `lib/`. But this is a behavior change with broad reach.
4. **Proxy interceptor `lastTouchMs` write (Phase 5).** The
   write is on the hot path. Bench: 1 assignment per intercept.
   Should be negligible. Worth measuring before/after via a
   microbench if test suite timings drift noticeably.

### Rollback story

- The MR is one branch; revert is `git revert <merge-commit>`.
- The slate document is gone post-merge; revert puts it back.
- The lastTouchMs field is transient and unused by anything
  else this MR ships; reverting it is clean.
- Spawner / Spawned is new code; no callers; reverting it is
  clean.
- The dispatcher and handlers are NEW behavior; pre-existing
  callsites of `StuffApi.destruct` keep working without them.
  Revert restores the old `#destructCore` body.

### Pre-merge sanity checklist

- [ ] All tests green.
- [ ] No new ESLint warnings.
- [ ] `pnpm build` clean.
- [ ] `docs/ref-shapes.md` rewritten and links resolve.
- [ ] Slate document removed (or moved to retired/).
- [ ] `Mixins` registry entries added for Spawner/Spawned.
- [ ] No regressions in existing destruct tests
  (`witness.test.ts`, `Adornable.test.ts`, etc.).
- [ ] `lastTouchMs` is monotonically updated on every method
  dispatch; not persisted; init at construction.

---

## File map (quick reference for the developer)

Phase 2 — Foundation:
- `packages/server/src/mud/api/stuff.ts` (modify
  `#destructCore`)
- `packages/server/src/mud/api/__tests__/stuff.cleanup.test.ts`
  (new)
- `packages/server/src/mud/lib/mixin.ts` (add Spawner/Spawned
  to `Mixins`)

Phase 3 — Substrate hookups:
- `packages/server/src/mud/lib/spatial/Containable.ts` (add
  static + self-heal getter)
- `packages/server/src/mud/lib/spatial/Container.ts` (add
  static)
- `packages/server/src/mud/lib/slot/Slottable.ts` (migrate
  `onDestruct` to static)
- `packages/server/src/mud/lib/slot/Slotted.ts` (add static
  vacate-on-destruct per #5; remove existing `slots.clear()`
  onDestruct)
- `packages/server/src/mud/lib/species/Species.ts` (add static)
- `packages/server/src/mud/lib/spatial/__tests__/Container.test.ts`
  (modify) or `Container.destruct.test.ts` (new)
- `packages/server/src/mud/lib/spatial/__tests__/Containable.test.ts`
  (modify)
- `packages/server/src/mud/lib/slot/__tests__/Slottable.test.ts`
  (modify)
- `packages/server/src/mud/lib/slot/__tests__/Slotted.test.ts`
  (modify — add chair-and-sword scenarios)
- `packages/server/src/mud/lib/species/__tests__/Species.test.ts`
  or `Clade.test.ts` (modify)

Phase 4 — Spawner/Spawned:
- `packages/server/src/mud/lib/stuff/Spawner.ts` (new)
- `packages/server/src/mud/lib/stuff/Spawned.ts` (new)
- `packages/server/src/mud/lib/stuff/__tests__/Spawner.test.ts`
  (new)
- `packages/server/src/mud/lib/stuff/__tests__/Spawned.test.ts`
  (new)
- `packages/server/src/mud/lib/stuff/__tests__/Spawner.cleanup.test.ts`
  (new)
- `packages/server/src/mud/api/mixin.ts` (predicates + imports)

Phase 5 — Ancillary:
- `packages/server/src/mud/lib/boundary/Exit.ts` (drop cache)
- `packages/server/src/mud/lib/stuff/Stuff.ts` (add
  `#lastTouchMs` + `Stuff.touch()` + `Stuff.getLastTouchMs()`;
  migrate `templatePath` to `#templatePath` + add
  `STAMP_TEMPLATE_PATH_SEAM` symbol + rewrite getter/setter)
- `packages/server/src/mud/api/proxy.ts` (`PASSTHROUGH_KEYS` —
  remove `templatePath`; update comment)
- `packages/server/src/mud/api/security.ts` (`#securityGate`
  one-line `Stuff.touch()` call)
- `packages/server/src/mud/api/stuff.ts` (migrate three
  templatePath bracket-cast sites to method/seam calls)
- `packages/server/src/mud/lib/boundary/__tests__/Exit.test.ts`
  (modify)
- `packages/server/src/mud/api/__tests__/lastTouchMs.test.ts`
  (new)
- `packages/server/src/mud/api/__tests__/templatePath-lockdown.test.ts`
  (new — or fold into stuff.test.ts)

Phase 6 — Doc rewrite:
- `docs/ref-shapes.md` (rewrite per slate's "Doc rewrite
  consequences")
- `docs/subsystems/mixins.md` (add `cleanupOnDestruct`
  convention)

Phase 7 — Slate retirement:
- `docs/slates/ref-shapes-slate.md` (delete or move to
  retired/)
