# Spawn substrate + Avatar persist-back — Implementation Plan

---

## 0. Reading guide for the build agent

This plan drives a build agent that has read the requirements doc
`../requirements/spawn-substrate-requirements.md` and the slate it
ratifies but not the conversation in which this plan was written.

Required reading before starting:

- `../requirements/spawn-substrate-requirements.md` (the input contract)
- `../slates/declarative-content-slate.md` (design history — note that
  this doc's header divergence note **supersedes** the slate's
  "top-level on the Template doc" framing for `container:`)
- `../subsystems/templates.md`, `../subsystems/spatial.md`,
  `../subsystems/persistence.md`, `../subsystems/connection.md`,
  `../subsystems/lifecycle.md`, `../subsystems/state-model.md`,
  `../subsystems/hot-reload.md`, `../subsystems/mixins.md`,
  `../subsystems/activity.md` (skim for SchedulerApi state — note
  this is the engagement framework, distinct from the
  `mud/api/schedule.ts` `ScheduleApi` plain-scheduling wrapper
  used by Wave 7's periodic save)
- `../ref-shapes.md`
- `../../CLAUDE.md` (file-naming, module categories, inter-Stuff
  contract, "Go Through the API Layer")

Precedent for plan shape: the now-retired
`spatial-boundary-substrate-plan.md` (commit `6d01214^`). This plan
matches its depth and section structure.

When this plan and the requirements doc disagree, the requirements
doc wins. When the requirements doc and the slates disagree, the
requirements doc wins (per its header divergence note).

---

## 1. Overview

This build is the **second** of two substrate carve-outs from the
declarative-content slate. The first (commit `b9afbaa`) shipped the
structural field shapes (`coords`, `focus`, `exits`,
`attachedHosts`). This build ships the **spawn shape** —
`PopulatesMixin` + `populates:` on Container hosts, `container:` as
an instruction field on `ContainableMixin`, the Login adjunct that
reads the avatar's live container — and the **minimal Avatar
persist-back** that takes the Login change from same-session-only to
across-restart.

The persist-back addition is bounded but real: two new methods on
the existing `TemplateApi` carry the general snapshot-to-template /
restore-from-template mechanism; `Avatar.save()` /
`Avatar.restore()` are thin Avatar-lifecycle shims over that Api.
The snapshot covers the Avatar's `persistentFields` chain plus a
derived `data.container` capturing the live container ref;
auto-save fires on logout/linkdead; a periodic auto-save acts as
backstop. The per-player Avatar template doc at
`/obj/Avatar/<playerId>` already serves as the persistence anchor;
save writes back to that doc and the existing clone-from-template
flow IS restore for the across-restart case.

**Architectural note.** The snapshot machinery (walk
persistentFields, marshal per field, derive container, mutate
`template.data`) is fully general — none of it is Avatar-specific.
It extends the existing `mud/api/template.ts` (`TemplateApi`) as
two new static methods: `snapshotToTemplate` and
`restoreFromTemplate`. `TemplateApi` already houses
Stuff-to/from-Template directional helpers
(`validateFolderLeafSave`, `saveTemplate`), so the new methods fit
naturally; no new Api class is invented. (Class-loading from a
template's `class:` path already lives on `StuffApi.loadClassByPath`
— see Q3 — so that concern doesn't pull anything new into
TemplateApi either.) Avatar
remains the only consumer in v1 (no `PersistableStuffMixin`; no
generalization to other Stuff). **`snapshotToTemplate` returns the
mutated `Template` without persisting** — the caller decides when
to commit via `tpl.save()`. This keeps snapshot a pure capture-
state operation; persistence is the caller's choice (allows
inspect / batch / short-circuit before committing). Avatar's
`save()` is a two-line shim: snapshot, then save the returned
template. No in-process reentry coordination — concurrent saves
each produce a valid full-state snapshot, and MongoDB's
last-write-wins resolves ordering (see Q15 below).

After this build, the declarative-content slate is fully closed at
the substrate layer.

**Tangible completion criterion (spawn shape)**: a content author
can author a Containable with `container: /some/singleton-location`
in its `data:` block and a separate Container with
`populates: [/path/a, /path/b]` also in `data:`, have the populates
dispatch correctly between singleton and non-singleton entries on
lazy hydration, have `applyContainer` self-place the Containable
into the declared container, and have the `clone` verb's
destination resolution defer to that hydration-time self-placement.
All without writing TypeScript.

**Tangible completion criterion (persist-back)**: a player logs in,
mutates persistent state (settings, location), logs out;
auto-save fires; on next login (even across server restart) the
avatar clones from the now-updated template and `applyContainer`
places them in the saved location with saved field values intact.

### Wave structure

Seven waves. The Wave 1/2/3 sequence carries the spawn-shape spine;
Waves 4/5 do verb-and-login cleanup; Waves 6/7 ship persist-back. The
dependencies are real but several waves admit parallel sub-tasks.

- **Wave 1 — `Mixins.Populates` + composition prereq verification.**
  Pure prereqs. Add the registry constant; verify the scheduling
  Api shape (resolves Open Q13: `ScheduleApi.recurring` is the
  right wrapper for periodic save, NOT `SchedulerApi` and NOT bare
  `setInterval`); verify Hydrator Phase 2's async dispatch (already
  in place per spatial+boundary build, but the plan re-confirms via
  code inspection). Wave 1 is small and primarily a sanity check.

- **Wave 2 — `PopulatesMixin` (new file + tests).** Adds
  `lib/stuff/Populates.ts` with `static instructionFields =
  ['populates']` and `applyPopulates(specs)`. Single deliverable plus
  test file. Depends on Wave 1's registry constant.

- **Wave 3 — `ContainableMixin.applyContainer` + singleton-target
  validation (Template-save seam).** Extends
  `lib/spatial/Containable.ts` with the instruction-field surface;
  adds the validator in `TemplateApi.validateFolderLeafSave` (or
  alongside it via a new `validateData` step). Tests extend the
  existing `Containable.test.ts` and `TemplateApi`-adjacent tests.

- **Wave 4 — `CloneController` hydrate-first refactor + `clone.yaml`
  cleanup.** Refactors the controller per deliverable #9. Depends on
  Wave 3 (the verb defers to `applyContainer`, which must work).

- **Wave 5 — `Login.enter` live-ref consultation + tests.** Replaces
  the hardcoded path-singleton call with a live-ref read; falls back
  to the default starting location only when the avatar has no
  container. Depends on Wave 3 (because the test fixture sets a
  starting location via the Avatar template's `data.container` and
  expects `applyContainer` to land the avatar before `Login.enter`
  fires).

- **Wave 6 — `TemplateApi.snapshotToTemplate` /
  `restoreFromTemplate` + Avatar `save()` / `restore()` shims +
  tests.** Two pieces in one wave: (a) two new static methods on
  the existing `mud/api/template.ts` carrying the general
  snapshot/restore mechanism (walk persistentFields, marshal,
  derive `data.container`, mutate `template.data` and **return the
  Template — the caller calls `tpl.save()`**; or hydrate from the
  template doc onto a live instance); (b) thin `Avatar.save()` /
  `Avatar.restore()` that delegate to `TemplateApi`. No new file
  at `api/persistence.ts` — the new methods live alongside the
  existing template-direction helpers in `api/template.ts`.
  Depends on Wave 3 (because restore exercises `applyContainer`'s
  move semantics, which need the refinement chosen in Open Q12 to
  land first).

- **Wave 7 — Auto-save-on-logout + periodic save backstop + tests.**
  Wires `avatar.save()` into `Avatar.onLinkdead` (and/or a parallel
  pre-destruct hook); installs a periodic timer at `Login.enter`
  time, cleaned up in `Avatar.onDestruct`. The wave calls
  `avatar.save()` (the thin shim from Wave 6) — Avatar's `save()`
  internally does the snapshot + commit. Concurrent saves are
  acceptable (full-state snapshots; MongoDB last-write-wins).
  Depends on Wave 6.

Doc updates land at the end of Wave 7.

---

## 2. Resolved Open Questions (citations to code that informed each)

The requirements doc lists 18 open questions. Each is resolved below
with code/doc citations. The build agent should consult the cited
code if a resolution seems off, but should not re-decide without
strong evidence.

### Q1 — Hydrator Phase 2 vs `postRegister` timing for `applyPopulates` / `applyContainer`

**Q.** Does Phase 2 instruction-field dispatch fire during hydration
(before `postRegister`) or after? Do the new appliers compose
`PostRegistrationMixin`?

**Resolution.** Phase 2 fires **during hydration, before
`postRegister`**, and both new appliers are invoked **directly by the
Hydrator** — neither mixin composes `PostRegistrationMixin`.

Evidence:

- `lib/persistence/PersistentHydrator.ts:61-137`: `hydrate()` is a
  single async method that runs Phase 1 (`set<X>`) then Phase 2
  (`apply<X>`). It is called by `StuffApi.#cloneInner` at
  `api/stuff.ts:354-357` (the `hydrate ? (o) => hydrator.hydrate(o,
  template.data ?? {}) : null` closure), and the registration tail at
  `api/stuff.ts:511-522` runs `hydrate` BEFORE `postRegister`. So
  Phase 2 appliers run before any `postRegister` would fire.
- `lib/boundary/Exitable.ts:190` declares `static instructionFields =
  ['exits']` and `lib/boundary/Exitable.ts:414` defines
  `applyExits(map)` — `ExitableMixin` does NOT compose
  `PostRegistrationMixin`. That's the precedent: Phase 2 invokes
  `applyX` on the host directly, no postRegister round-trip.

**Implications for this build:**

- `PopulatesMixin` declares `static instructionFields = ['populates']`
  and `applyPopulates(specs)`. It does **not** compose
  `PostRegistrationMixin`. The slate's Scenario A mention of
  "PopulatesMixin's postRegister cascades child content" is
  superseded by Phase 2 dispatch; both are functionally equivalent
  for the v1 cascade, but Phase 2 is the simpler, more direct
  shape and consistent with `ExitableMixin`'s precedent.
- `ContainableMixin.applyContainer` is added directly to the existing
  mixin and dispatched by Phase 2. The existing
  `ContainableMixin` doesn't compose `PostRegistrationMixin` and
  doesn't need to start now.

**Ordering specific to this build (mid-cascade):**

When a Container with `populates: [/child]` hydrates, Phase 2
calls `applyPopulates`. For each entry, the applier does:

1. `MixinApi.hasMixin(templateClass, Mixins.Singleton)` — class
   inspection only; no instantiation.
2. Singleton: `await StuffApi.singleton(path)` — this either
   returns a cached instance OR triggers a recursive
   `clone(path)`, which runs the child's own hydration to
   completion (including the child's own Phase 2 `applyContainer`).
   Non-singleton: `await StuffApi.clone(path)` — same recursive
   hydrate-to-completion.
3. Existing-container check on the freshly-resolved instance:
   `child.getContainer() !== null`?
   - For a singleton already placed by its own
     `applyContainer(/A)`: the child IS in `/A`; parent's
     applyPopulates **skips the move**, leaves the singleton where
     it was.
   - For a non-singleton: child was freshly cloned; if it had
     `data.container: /A`, it was placed in `/A` during its own
     hydration. Existing-container check returns true → applier
     **must still move** the child into the parent (the slate's
     policy: `populates:` parent's move overrides the
     `applyContainer` default for non-singletons, since
     non-singletons can have many homes and the parent is the
     active mover).
4. `ContainmentApi.move(child, this)` when the move is to fire.

The precise condition for "skip vs move" lives on the singleton-ness
of the child, not on whether it already has a container. See § 3.2's
`applyPopulates` implementation for the exact logic.

### Q2 — Template-save validation seam for the singleton-target check

**Q.** Where does Template-doc validation live? Where do we inject
the `data.container` target-singleton check?

**Resolution.** Validation lives in
`mud/api/template.ts:90-123` (`TemplateApi.validateFolderLeafSave`),
which is registered as an aroundSave hook on the `domain` collection
via the manifest at `mud/obj/hooks/hooks.yaml` (per
`backend/PersistenceManager.ts:343-393`'s `loadHooks` machinery).
The hook signature is `(collection, doc, next)`. The validator runs
**before** `next(doc)` invokes the terminal write.

We add a new validation step inside the same hook: after the
folder/leaf check, if `doc.class` resolves to a class that composes
`ContainableMixin` AND `doc.data.container` is a non-empty string,
verify that the resolved target template's class composes
`SingletonMixin`. Implementation lives in a new static method
`TemplateApi.validateSingletonContainerTarget(doc)` for symmetry
with the existing `validateFolderLeafSave` shape.

Why a new method on `TemplateApi`, not a separate Api: the
existing aroundSave hook already calls
`TemplateApi.validateFolderLeafSave`; the new check is the next
sibling. Putting it on `TemplateApi` keeps "template-save
validation" in one place. Per CLAUDE.md § "Module Categories — DO NOT
INVENT NEW ONES": new free-floating helpers default to an existing
Api class.

The check is async (must resolve the target's `class` via
`Template.findByPath(targetPath)`). The validator throws
`TemplateError` (the existing error type at
`mud/api/template.ts:32-37`); the message names both the source
template path AND the offending target path.

Both checks (folder/leaf + singleton-container-target) run inside the
SAME hook invocation; the build agent edits `mud/obj/hooks/DomainHook.ts`
(or wherever the aroundSave registration body lives — find via grep)
to add the new call after `validateFolderLeafSave(doc)`.

**Determining "the doc declares container":** the validator runs
sync extraction `const containerPath = (doc.data as Record<string,
unknown> | undefined)?.container`. If that's a non-string or
undefined, skip. The `ContainableMixin` precondition isn't strictly
necessary to check separately — a class that doesn't compose
ContainableMixin won't have `applyContainer` defined and Phase 2
would throw anyway at hydrate time. But for a clearer error message
at template-save time (a content author saving a malformed template
sees the violation immediately, not on first clone), the validator
SHOULD also call `MixinApi.hasMixin(classCtor, Mixins.Containable)`
to confirm. **Lean: check both — singleton-target AND
class-is-Containable** — the cost is one extra dynamic import for the
class.

**Determining "the target is singleton":** resolve via
`Template.findByPath(targetPath)`. If null → throw with "container
target template does not exist." Otherwise call
`await StuffApi.loadClassByPath(targetTpl.class)` and check
`MixinApi.hasMixin(targetClassCtor, Mixins.Singleton)`. See Q3 for
the full pick — `StuffApi.loadClassByPath` already exists as the
public class-loading surface (`api/stuff.ts:932-979`); no new
helper function is introduced in this build.

### Q3 — `MixinApi.hasMixin(templateClass, Mixins.Singleton)` — class vs instance

**Q.** Does `MixinApi.hasMixin` accept a class constructor for the
class-check needed in `applyPopulates`? Is `TemplateApi.getClassFor`
the right call to resolve a templatePath's class?

**Resolution.**

- `MixinApi.hasMixin` accepts a class constructor (overload at
  `api/mixin.ts:185-188`): `public static hasMixin(constructor:
  AnyConstructor, mixinName: MixinName): boolean;`. The
  implementation walks the prototype chain via `queryMixins` — no
  instance required.
- The class-loading dance — extract `className` from `classPath`,
  consult `HotReloadApi.getCurrentExport(absoluteClassPath, className)`
  for an HMR-aware override, fall back to dynamic
  `import(modulePath)`, extract `module[className]`, throw with a
  clear diagnostic on missing class — **already exists as a
  first-class Api surface**: `StuffApi.loadClassByPath(classPath)`
  at `api/stuff.ts:932-979`. It returns the constructor as
  `Promise<unknown>` (the caller narrows). Existing consumers:
  `ZoneApi.isFolderClass`, `ZoneApi.isSpatialZoneClass`
  (`api/zone.ts:86, 111`), and `WriteController`
  (`obj/command/WriteController.ts:194`).

**Pick:** **use the existing `StuffApi.loadClassByPath`**.

`PopulatesMixin.applyPopulates` (§ 3.2) and the singleton-target
validator on `TemplateApi` (§ 3.3) both call
`await StuffApi.loadClassByPath(classPath)` (the `classPath`
coming from `tpl.class` after a `Template.findByPath` lookup).
With these two new consumers, the method has 5 call sites total —
this isn't a premature abstraction, this is hitting the abstraction
that exists.

```ts
async applyPopulates(specs: string[]): Promise<void> {
  for (const path of specs) {
    // Load the Template, then load its backing class via the
    // existing Api surface. No new helper.
    const tpl = await Template.findByPath(path);
    if (!tpl) {
      throw new Error(
        `PopulatesMixin: no template at '${path}'`
      );
    }
    const cls = (await StuffApi.loadClassByPath(tpl.class)) as
      new (...args: unknown[]) => Stuff;
    if (MixinApi.hasMixin(cls, Mixins.Singleton)) {
      const inst = await StuffApi.singleton(path);
      if (inst.getContainer() !== null) continue; // already elsewhere
      ContainmentApi.move(inst, this);
    } else {
      const inst = await StuffApi.clone(path);
      ContainmentApi.move(inst, this);
    }
  }
}
```

**Three review passes settled this.**

**Pass 1 — original lean:** put the resolution dance inside
`PopulatesMixin.applyPopulates` as a non-exported helper
`resolveClassForTemplate`. Rationale: "no premature abstractions —
only one consumer." That was wrong: there were ALREADY two existing
inline copies of the same dance (`api/stuff.ts:246-287` inside
`#cloneInner`, and `api/stuff.ts:947-979` as
`StuffApi.loadClassByPath`), plus this build adds two more consumers
(`applyPopulates` and `validateSingletonContainerTarget`).

**Pass 2 — user pushback on the duplication:** "that
resolveClassForTemplate method may already exist somewhere... it'd
go in templateapi probably." The user was right that the helper
already exists; my pass-1 inline helper would have been the fourth
copy.

**Pass 3 — locate the existing surface:** `grep -rn loadClassByPath`
finds `StuffApi.loadClassByPath` at `api/stuff.ts:932-979`, already
used by `ZoneApi.isFolderClass` / `isSpatialZoneClass` and
`WriteController`. The docstring literally says "Public companion
to the inline class-loading logic in `clone()`." This is the
established Api surface; no new TemplateApi method is needed. The
"in TemplateApi" hint was a guess about WHERE to put it ("probably"
— their word) — the actual answer is "it already lives on StuffApi."
Adding `TemplateApi.resolveClass` as a wrapper would create another
near-duplicate.

The class-loading concern is fundamentally Stuff-shape (resolves
a `classPath` to a class constructor), not Template-shape. Living
on StuffApi matches the conceptual axis. Per CLAUDE.md §
"Go Through the API Layer": this is exactly the case where the
table answer is "use the existing Api method, don't reach for
internal mechanism directly."

**StuffApi's two internal sites — refactor decision: leave inline.**

The two existing usages inside `api/stuff.ts` are not symmetric
with the two new external callers:

- **`#cloneInner` at `api/stuff.ts:246-287`** — uses
  `#validateClassPath` (private), `#resolveAbsoluteClassPath`
  (private), and threads the result into a `StuffConstructor<T>`
  generic that the surrounding Singleton-mixin check at line 293
  reuses. The 12-line block is part of a longer cloning ceremony
  that ALSO checks `isFrozen`, validates the path shape, and
  feeds into the post-load Singleton-pre-flight at line 293-300.
  Refactoring to call `loadClassByPath` would force the public
  method to either return the validated absolute class path
  alongside the constructor (widens the return shape), or force
  `#cloneInner` to redo the absolute-path computation for the
  freeze check that already happened inside `loadClassByPath`.
  Net: refactoring isn't a clean 12-line collapse; it's a
  reshape of `loadClassByPath`'s return contract or a
  re-introduction of duplicated work.

- **`loadClassByPath` at `api/stuff.ts:932-979`** — IS the public
  method. It's not a duplicate of itself.

So the existing situation is: **one public method
(`loadClassByPath`) + one inline copy (`#cloneInner`).** This
build adds two new callers, all of which route through the
public method. Net: one inline copy in the codebase, four
external consumers of the public method. Acceptable v1
end-state. The `#cloneInner` refactor can land as a separate
sweep once the public method's contract has settled across the
broader consumer set.

**Why this isn't the same situation that motivated extracting
`snapshotToTemplate` to TemplateApi:** that extraction was about
preventing the new mechanism from being buried in one consumer
(Avatar). Here the mechanism already lives on a public Api with
existing external consumers — the new external consumers (Populates,
validator) join that consumer set. Avatar's `save()` had nowhere
established to live; `loadClassByPath` has been the right home
since it was introduced for ZoneApi's needs.

### Q4 — `applyContainer` / `applyPopulates` re-fire semantics under HMR

**Q.** Class swap re-fires `postRegister`. Do the new appliers re-fire too?

**Resolution: appliers do NOT re-fire on HMR.**

- The Wave-2 plan's Q6 already verified the spatial+boundary build
  (`docs/subsystems/hot-reload.md` "What's intentionally out of
  scope"): existing instances keep their old prototype chain; setters
  and `postRegister` do not re-fire on class swap. Only NEW clones
  pick up the new class.
- Phase 2 appliers fire as part of `Hydrator.hydrate`, which is only
  invoked during `StuffApi.clone` (`api/stuff.ts:354-357`). A class
  swap does not re-clone existing instances, so Phase 2 doesn't
  re-fire.
- The HMR-correctness question reduces to: "if an admin destructs an
  existing instance and re-clones from the now-current class, does
  applyPopulates / applyContainer produce correct results?" Yes —
  the existing-container check on the freshly-cloned instance covers
  re-clone-after-destruct cleanly. Pre-existing containment from a
  previous lifecycle is gone (destruct evacuates contents per
  `lib/spatial/Container.ts:110-132`); fresh clones see clean state.

**No flag, no extra guard.** The existing `#inFlightClonePaths`
cycle guard (`api/stuff.ts:80, 216-230`) catches in-flight cycles
during the cascade itself; that's the only re-entry path that
matters.

### Q5 — Async Hydrator dispatch

**Q.** Are async appliers awaited by the Hydrator?

**Resolution: yes, the Hydrator already awaits both phases.**

`PersistentHydrator.hydrate` at `lib/persistence/PersistentHydrator.ts:104-107`
(Phase 1) and `:132-135` (Phase 2) explicitly `await` the dispatch:

```ts
await (setter as (v: unknown) => unknown | Promise<unknown>).call(target, value);
// ...
await (applier as (v: unknown) => unknown | Promise<unknown>).call(target, value);
```

This is the spatial+boundary build's contribution (commit `b9afbaa`).
The new appliers in this build (`applyPopulates`, `applyContainer`)
inherit the await guarantee automatically — no Hydrator change
needed.

### Q6 — `Login.enter` interaction with hydration-time self-placement

**Q.** If the Avatar template's `data.container: /X` already placed
the avatar during hydration, does `Login.enter` need a teleport for
scene emission?

**Resolution: no re-teleport when the avatar already has a container.**

Evidence:

- `Login.enter` at `mud/obj/Login.ts:73-79` currently calls
  `avatar.teleport(startingLocation, { silent: true })` after
  `StuffApi.singleton(DEFAULT_STARTING_LOCATION_PATH)`. The `silent:
  true` option suppresses the movement narration; the teleport's
  only purpose is the `ContainmentApi.move`-equivalent placement.
- The welcome scene at `:103-107` fires from `MessageApi.scene(avatar)`,
  which routes by the avatar's current container at send time. It
  does NOT depend on a preceding `teleport` event firing — it depends
  on the avatar BEING somewhere. As long as the avatar has a
  non-null `getContainer()` when `MessageApi.scene` runs, the welcome
  scene fires correctly.
- The `sendLookDescription(avatar)` call at `:109, 122-151` also
  reads `avatar.getContainer()` directly — no teleport dependency.

**New `Login.enter` shape (matches deliverable #10 pseudocode):**

```ts
let startingLocation = avatar.getContainer();
if (!startingLocation) {
  startingLocation = await StuffApi.singleton<Location>(
    DEFAULT_STARTING_LOCATION_PATH
  );
  avatar.teleport(startingLocation, { silent: true });
}
// Avatar is now somewhere; fall through to welcome scene.
```

The teleport call in the fallback branch remains `silent: true` for
the same reason it always was: this is the initial spawn, not a
mid-game move.

### Q7 — `container:` vs `populates:` order in the conflict case

**Q.** When a Containable declares `container: /A` and Container
`/B` declares `populates: [/that-containable]`, who wins?

**Resolution.** **For singletons:** first-mover-wins via the
existing-container check in `applyPopulates`. **For non-singletons:**
the `populates:` parent always wins; `data.container` is fallback-only
per the slate (`declarative-content-slate.md:109`).

Evidence + resolution detail:

- If `/B` hydrates first, its `applyPopulates` resolves the child
  template via `StuffApi.singleton(path)` (for singletons) or
  `clone(path)` (for non-singletons). The resolve-call triggers the
  child's own hydration; the child's Phase 2 fires `applyContainer(/A)`
  → child lands in `/A`. Control returns to the parent's
  `applyPopulates`:
  - For singletons: `child.getContainer()` is `/A` (non-null) → skip
    the move. Singleton stays in `/A`.
  - For non-singletons: `child.getContainer()` is `/A` (non-null) →
    `applyPopulates` STILL moves the child into `/B` (the slate says
    "non-singletons' container: is fallback-only"; the parent is the
    active mover).
- If the child hydrates first (touched by a different path):
  `applyContainer(/A)` places it in `/A`. Later, `/B`'s
  `applyPopulates` runs:
  - For singletons: existing-container check returns "in /A," skip.
    Singleton stays in `/A`.
  - For non-singletons: `singleton(path)` returns the existing live
    instance (per `api/stuff.ts:379-396`). `applyPopulates` still
    moves it into `/B`. **But** if multiple non-singletons exist for
    the path, `singleton()` throws (`api/stuff.ts:386-391`); the only
    way to get a non-singleton via the cascade is via `clone()` (a
    fresh instance), so this case doesn't arise in practice.

So the practical rule encodes cleanly:

```ts
// applyPopulates entry:
if (isSingleton) {
  const inst = await StuffApi.singleton(path);
  if (inst.getContainer() !== null) continue;  // skip; already elsewhere
  ContainmentApi.move(inst, this);
} else {
  const inst = await StuffApi.clone(path);     // fresh non-singleton
  ContainmentApi.move(inst, this);             // always move into self
}
```

For non-singletons we **don't read `inst.getContainer()`** at all
post-clone — we always move. This is the slate's "fire-and-forget"
shape for non-singletons.

### Q8 — `PopulatesMixin` / `ContainableMixin` composability

**Q.** Does `Container.ts` have any compositional pattern that would
conflict with `PopulatesMixin`? Does `Containable.ts` already declare
`static instructionFields`?

**Resolution: no conflicts.**

- `lib/spatial/Container.ts:89-204` doesn't declare any
  `instructionFields`. The mixin's static-field set is limited to
  `_mixinName`, `commandContributions`, `cleanupOnDestruct`. Adding
  `PopulatesMixin` as a separate mixin (composed *after* Container in
  a host's chain) lands cleanly.
- `lib/spatial/Containable.ts:81-182` doesn't declare any
  `instructionFields` either. The build adds
  `static instructionFields = ['container']` to it without collision.

The composition `PopulatesMixin(ContainerMixin(Base))` is the
expected pattern. `PopulatesMixin`'s base constraint will be `Stuff &
Container` (Container provides `addContainable`, which `setContainer`
on the moved Containable triggers); the build agent expresses this
via `MixinConstructor<Stuff & Container>` like `ExitableMixin` at
`lib/boundary/Exitable.ts:179`.

### Q9 — `Stuff.getTemplatePath()` interaction with singleton-already-elsewhere skip

**Q.** When the dispatch in `applyPopulates` checks
`instance.getContainer() !== null`, is the live ref the right thing
to read?

**Resolution: yes.**

`getContainer()` (`lib/spatial/Containable.ts:151-158`) returns the
live container or null, with an R2.3 self-heal for stale refs to
destroyed containers. It's the right read for "is this instance
currently placed?" The slate's logic + the resolution of Q7 above
all rest on this exact predicate.

**Edge case to be aware of:** during the cascade, `singleton(path)`
may return an instance that is currently in the middle of its own
hydration (its `_container` is being set as part of the same chain).
Per `api/stuff.ts:498-522`, the instance is registered BEFORE the
hydrate closure runs, so `singleton` will return the proxy. But the
container may not be set yet at the moment of the parent's
`applyPopulates` re-entry. This is fine for singletons: the
`#inFlightClonePaths` cycle guard catches the recursion at the
template level (`api/stuff.ts:216-223`) before we'd see an
inconsistent state from outside.

### Q10 — `Persistable.getPersistentFieldsChain` (or equivalent)

**Q.** Does an Api method exist for walking the persistentFields
chain across a Stuff's mixin composition?

**Resolution: yes — `MixinApi.getAllPersistentFields(constructor)`
at `api/mixin.ts:306-322`.**

Walks the prototype chain, collecting `static persistentFields`
declared at each level (with `hasOwnProperty` to handle subclass
shadowing). Returns deduplicated array of field names. Already used
by `PersistentHydrator.hydrate` (`PersistentHydrator.ts:66`) and
`Persistable.toDocument` / `fromDocument` (`Persistable.ts:113-116`).

`Avatar.save()` uses the SAME helper:

```ts
const fields = MixinApi.getAllPersistentFields(
  this.constructor as new (...args: unknown[]) => Stuff
);
```

No new method needed. The companion
`MixinApi.getAllFieldMarshallers(constructor)` (`api/mixin.ts:246-271`)
provides the marshaller registry for the same fields. `Avatar.save()`
uses both: walk the fields, marshal via `toStored` when a marshaller
is declared, otherwise pass through directly. (Mirrors
`Persistable.toDocument` at `lib/persistence/Persistable.ts:128-161`.)

### Q11 — `PersistenceManager.save(template)` surface for Avatar write-back

**Q.** Is there an existing template-write-back surface? Or does
this build introduce template-doc mutation as a new pattern?

**Resolution: yes — `Persistable.save()` (inherited by Template) is
the surface.** `Avatar.save()` reuses it.

Evidence:

- `lib/persistence/Persistable.ts:211-218`: `public async save():
  Promise<void>` is the inherited surface. It calls
  `PersistenceManager.get().save(collection, doc)` after running
  `toDocument()`. For `Template`, `collection = 'domain'`
  (`lib/stuff/Template.ts:41`).
- `mud/api/template.ts:49-71`: `TemplateApi.saveTemplate(path,
  classPath, data, hydratorClassPath?)` is the higher-level
  factory used by `Application.createDefaultAvatarTemplate`
  (`backend/Application.ts:400-405`). It does `findByPath →
  populate fields → save()`.
- The persist-back flow is: look up the existing template by the
  Stuff's runtime-stamped `getTemplatePath()`, MUTATE its `data`
  field with the snapshotted state, call `template.save()`. We do
  NOT use `TemplateApi.saveTemplate` (it would force-re-set
  `class`/`hydratorClass`/`data` from arguments; we want to
  surgically update `data` only).

**The flow lives in `TemplateApi.snapshotToTemplate`, not on
Avatar.** Nothing in the snapshot mechanism is Avatar-specific:
walk `MixinApi.getAllPersistentFields(stuff.constructor)`, marshal
each via `MixinApi.getAllFieldMarshallers`, derive
`data.container` from `stuff.getContainer()?.getTemplatePath()`
when the Stuff is Containable, mutate `tpl.data`, **return the
template (the caller calls `tpl.save()`)**. Avatar's `save()` is a
two-line shim — see Q15 below and the Wave 6 file plan in § 3.6.

**Concrete `TemplateApi.snapshotToTemplate` flow:** (extends
existing `packages/server/src/mud/api/template.ts`)

```ts
public static async snapshotToTemplate(stuff: Stuff): Promise<Template> {
  const path = stuff.getTemplatePath();
  if (!path) {
    throw new Error(
      `TemplateApi.snapshotToTemplate: Stuff has no templatePath stamp`
    );
  }
  const tpl = await Template.findByPath(path);
  if (!tpl) {
    throw new Error(
      `TemplateApi.snapshotToTemplate: no template at '${path}'`
    );
  }

  const ctor = stuff.constructor as new (...args: unknown[]) => Stuff;
  const fields = MixinApi.getAllPersistentFields(ctor);
  const marshallerPaths = MixinApi.getAllFieldMarshallers(ctor);
  const self = stuff as unknown as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in stuff)) continue;
    snapshot[field] = self[field];
  }
  // Derived container — only when the host is Containable.
  let containerPath: string | null = null;
  if (MixinApi.isContainable(stuff)) {
    containerPath = stuff.getContainer()?.getTemplatePath() ?? null;
  }

  const data: Record<string, unknown> = { ...(tpl.data ?? {}) };
  for (const field of fields) {
    if (!(field in snapshot)) continue;
    const value = snapshot[field];
    const mPath = marshallerPaths[field];
    if (mPath) {
      const m = StuffApi.findByTemplatePath<
        Marshaller<unknown, unknown>
      >(mPath);
      if (!m) {
        throw new Error(
          `TemplateApi.snapshotToTemplate: marshaller '${mPath}' ` +
            `for field '${field}' not registered.`
        );
      }
      data[field] = m.toStored(value);
    } else {
      data[field] = value;
    }
  }
  if (MixinApi.isContainable(stuff)) {
    if (containerPath !== null) {
      data.container = containerPath;
    } else {
      delete data.container;
    }
  }

  tpl.data = data;
  return tpl;  // Caller commits via tpl.save() — see Avatar.save().
}
```

**`Avatar.save()` is thin** — two lines, no flag, no coordination:

```ts
public async save(): Promise<void> {
  const tpl = await TemplateApi.snapshotToTemplate(this);
  await tpl.save();
}
```

Concurrent saves are acceptable. JS is single-threaded; each
snapshot's persistentFields walk completes synchronously before any
await yield, so each save produces a valid full-state snapshot.
MongoDB's last-write-wins resolves the ordering. The flag would
only have prevented wasted work (extra walk + write), not
correctness — not worth the substrate (Q15).

**Note on `getTemplatePath()`.** TemplateApi reads
`stuff.getTemplatePath()` (the runtime stamp every Stuff carries
post-clone). It does NOT use `Avatar.getTemplatePath(playerId)`
(the static derivation from a playerId) — the goal is to be
Stuff-shape-agnostic, and the runtime stamp is the canonical
surface per CLAUDE.md's antipattern table.

### Q12 — `applyContainer` idempotency vs `restore()`'s expected move

**Q.** `applyContainer`'s idempotency check is "skip if already in a
container," but `restore()` needs to MOVE the avatar to the new
declared location. Which option (a/b/c) does the substrate pick?

**Resolution: option (c) — `applyContainer` compares the current
container's templatePath against the declared path and no-ops only
when they match exactly.** Slightly more semantically correct;
behavior diverges across normal-clone and restore in exactly the way
we want without a flag.

Why not (a):

- (a) "restore clears container first" introduces a transient null
  state observable to peers and observers (a player briefly
  "vanishing" mid-restore). Not a v1 concern for admin-only restore,
  but ugly.
- (a) also requires a special path inside `Avatar.restore`, not just
  on the substrate side.

Why not (b):

- (b) "applyContainer behavior diverges by call-site" requires a
  flag (per-call or thread-local). Muddies the substrate. A
  call-site-agnostic applier is cleaner.

Why (c) works for both flows:

- **Normal hydrate:** instance is freshly cloned, container is null.
  Compare-and-move: null vs declared path → mismatch → move. Same
  observable behavior as today's "if null then move."
- **populates: parent overrides:** parent's `applyPopulates` moves the
  child to itself AFTER the child's `applyContainer` ran. The child's
  applier already executed and saw null → declared → moved. Parent's
  subsequent move just changes the container again. Net outcome:
  child in parent (same as today; non-singletons-always-move from Q7).
- **Restore:** instance is live, current container is `/A`, declared
  is `/B`. Compare: `/A !== /B` → move. Correct.
- **No-op case:** instance is live, current container is `/A`,
  declared is `/A`. Compare matches → skip. Correct.

**Concrete `applyContainer` body** (added to
`lib/spatial/Containable.ts`):

```ts
async applyContainer(path: string): Promise<void> {
  const target = await StuffApi.singleton<Stuff & Container>(path);
  const current = this.getContainer();
  if (current && current.getTemplatePath() === path) {
    return;  // already in declared container; no-op.
  }
  ContainmentApi.move(this as unknown as Stuff & Containable, target);
}
```

The `getTemplatePath()` comparison is the canonical idempotency
predicate. It also handles the "current container is the same
singleton resolved fresh" case naturally (both refer to the same
templatePath; comparison succeeds).

**Edge case:** what if `path` is the templatePath of a current
container that no longer exists (target destructed mid-cascade)?
`StuffApi.singleton(path)` would attempt to re-clone, which may
either succeed (if Template still exists in Mongo) or throw
(`Template not found`). Either is correct — fail loudly with the
Mongo error, or succeed with the freshly re-cloned target. Don't
add defensive code.

**`restore()` benefits from option (c) directly** — it just calls
`hydrator.hydrate(this, freshData)`, which calls
`applyContainer(declaredPath)`, which moves if needed. No special
restore logic.

### Q13 — Periodic-save scheduler mechanism

**Q.** `SchedulerApi`, bare `setInterval`, or `ScheduleApi`?

**Resolution: `ScheduleApi.recurring`** — the purpose-built
substrate wrapper at `mud/api/schedule.ts`. NOT `SchedulerApi`
(wrong shape); NOT bare `setInterval` (skips the substrate).

The codebase has two scheduling Apis, easy to confuse by name:

- `mud/api/scheduler.ts` (`SchedulerApi`): the **engagement
  framework** — `EngagedMixin` actors, `DurativeActivity` /
  `SustainedEngagement` shapes, four engagement slots, abort
  reasons. The Avatar persist-back is NOT an engagement (no actor +
  slot semantics; no completion timer; no host-destruction semantics
  relevant in the "abort/replace" sense). Furthermore per
  `docs/subsystems/activity.md`, Wave 1 ships the substrate inert —
  no activity classes register against it in this build. Adopting
  SchedulerApi here would force Avatar-as-Engaged and a
  `PersistSaveActivity` class — overkill for a periodic "snapshot
  field values" timer. **Rejected: wrong shape.**
- `mud/api/schedule.ts` (`ScheduleApi`): the **purpose-built
  substrate** for plain scheduling. Doc header literally says:
  *"Single-purpose for v1: schedule, recurring, cancel."* The
  surface is `ScheduleApi.schedule(delayMs, fn, opts?)`,
  `ScheduleApi.recurring(intervalMs, fn, opts?)` returning a
  `ScheduleHandle`, and `ScheduleApi.cancel(handle)` (idempotent).
  Each fire runs inside `ExecutionContextApi.runRoot(ScheduleApi,
  'fire', ...)` so frames composed inside the callback have a
  well-defined Root frame. **Picked: this is exactly the surface
  the periodic-save needs.**

Bare `setInterval` is the wrong default — it skips the substrate's
Root-frame guarantee and the attribution propagation choice. Going
through ScheduleApi means future cross-cutting concerns (audit, HMR
introspection of pending tasks, game-time scheduling) gain a single
seam to extend.

**Recurring options chosen:**

- `propagateAttribution: false`. The periodic save isn't
  semantically caused by the login command; severing the
  attribution chain is cleaner ("save fires on its own cadence,
  not as a follow-on of login"). The default is `true` — we
  override.
- `initialDelayMs`: leave default (= `intervalMs`). First fire
  after one full interval; don't double-save right after login
  when the host is freshly cloned and unmutated.
- `mode: 'fixed-delay'`. Drift-tolerant; we don't need predictable
  cadence; we just need "roughly every N minutes." Avoids pile-ups
  if a save runs long.

**Concrete shape on Avatar** (added in Wave 7; the `intervalMs`
argument comes from the `world.autosave.interval` setting per
Q14):

```ts
import {
  ScheduleApi,
  type ScheduleHandle,
} from '../api/schedule';
import { resolveSetting } from '../lib/shell/Environment';

// On Avatar:
private periodicSaveHandle: ScheduleHandle | null = null;

public startAutoSave(): void {
  if (this.periodicSaveHandle !== null) return; // idempotent
  const intervalMs =
    resolveSetting<number>(this, 'world.autosave.interval') ??
    5 * 60 * 1000;
  this.periodicSaveHandle = ScheduleApi.recurring(
    intervalMs,
    () => {
      // Fire-and-forget; errors logged but don't crash the session.
      void this.save().catch((err) => {
        console.error(
          `Avatar.autoSave: save failed for playerId=${this.playerId}:`,
          err
        );
      });
    },
    { propagateAttribution: false, mode: 'fixed-delay' }
  );
}

public stopAutoSave(): void {
  if (this.periodicSaveHandle !== null) {
    ScheduleApi.cancel(this.periodicSaveHandle);
    this.periodicSaveHandle = null;
  }
}
```

`startAutoSave()` is called from `Login.enter()` after the avatar is
bound (post `ConnectionApi.transfer`). `stopAutoSave()` is called
from `Avatar.onDestruct()` (the existing hook at
`obj/Avatar.ts:161-167`) before the existing cleanup steps run.

### Q14 — Periodic-save interval source

**Q.** Constant, setting, or per-Avatar override?

**Resolution: setting, declared on Avatar, resolved at
timer-install time via `resolveSetting(avatar,
'world.autosave.interval')`.** Default 5 minutes (`300_000` ms).
Cross-references Q13 — the resolved interval is the `intervalMs`
argument to `ScheduleApi.recurring(intervalMs, fn, opts)`.

**Three review passes settled this.**

**Pass 1 — original lean: constant.** The first plan put
`AVATAR_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000` in
`mud/config/constants.ts` alongside `DEFAULT_STARTING_LOCATION_PATH`.
Rationale: `feedback_no_premature_registries` — don't reach for
the setting-resolution chain when a constant suffices for v1.

**Pass 2 — review override: setting.** The user (and the
updated requirements doc § 15 + Open Question §14) ruled the
constant out: the autosave cadence is exactly the kind of policy
players and admins should tune, and the `resolveSetting` lookup
chain (per-host override → schema default) gives per-Avatar
override for free. The "constant for v1, layer setting on later"
shape would be the wrong substrate from the start — the
mid-session change limitation is fine, but the setting itself
belongs in this build.

**Pass 3 — schema placement: declared on Avatar.** Per
`docs/subsystems/shell-environment.md`'s schema-on-mixin pattern,
each setting lives on the mixin that owns the concept it
describes. The autosave concept is owned by the Avatar persist-back
substrate; Avatar is the only consumer. Existing precedents
(`MobileMixin.settings`, `WorkspaceMixin.settings`,
`AuthorMixin.settings`, `EnvironmentMixin.settings`) all declare
on mixins, but those mixins each own a feature concern shared
across several hosts. The autosave is purely Avatar-lifecycle
policy: only Avatar saves, only Avatar carries the periodic-save
handle, only Avatar cancels the timer on destruct. Declaring on
Avatar keeps the substrate discipline ("the concept's owner
declares it") while honoring "no extension hook on
EnvironmentMixin." When a second persist-back consumer materializes
(`PersistableStuffMixin`-style future build), the setting moves to
that mixin and Avatar composes it — same shape, different layer.

**Setting key:** `world.autosave.interval`. Matches the
user-facing "autosave" wording (Open Question §14's body), and the
`world.*` namespace leaves room for sibling autosave-policy keys
(retention windows, save triggers) without retroactive renaming.
The alternative `world.persist.interval` floated in the slate is
narrower (locks the name to the v1 implementation detail —
"persistence" — rather than the player-visible behavior —
"autosave").

**Schema entry shape** (declared on `class Avatar`, added in
Wave 7 alongside the timer wiring):

```ts
import { SettingTypes, type SettingsSchemaEntry } from '../lib/shell/Environment';

// inside class Avatar body, static section:
static settings: SettingsSchemaEntry[] = [
  {
    key: 'world.autosave.interval',
    type: SettingTypes.Number,
    default: 5 * 60 * 1000, // 5 minutes in milliseconds
    description:
      'Cadence (milliseconds) for the Avatar persist-back ' +
      'periodic backstop. Resolved once at login time; mid-session ' +
      'changes do not restart the running timer (effect lands at ' +
      'next login).',
  },
];
```

**Resolution at timer-install time:**

```ts
import { resolveSetting } from '../lib/shell/Environment';

// inside startAutoSave():
const intervalMs =
  resolveSetting<number>(this, 'world.autosave.interval') ??
  5 * 60 * 1000;
this.periodicSaveHandle = ScheduleApi.recurring(intervalMs, ...);
```

The `?? 5 * 60 * 1000` defensive fallback is belt-and-suspenders
— `resolveSetting` returns `undefined` only when the key isn't
declared anywhere on the host's mixin chain. Since the schema
entry is on `Avatar` itself, the lookup will always resolve.
The fallback exists to keep `startAutoSave` callable even from
test fixtures that mock out the schema walk.

**Per-Avatar override falls out for free.** `resolveSetting` walks
the standard lookup chain (`getSetting` → `persistentStore` →
`sessionStore` → schema default). A player overriding via
`settings set world.autosave.interval 600000` writes to
`persistentStore`; the next login picks it up. No Wave 7 code
supports this explicitly — the substrate carries the lookup chain
end-to-end.

**Mid-session changes do not restart the timer.** Documented
limitation. The Wave 7 code resolves the setting **once** at
`startAutoSave()` invocation (in `Login.enter`); the resulting
`intervalMs` is closed over by the captured callback. Changing
`world.autosave.interval` mid-session updates the persistent
store but does not affect the running schedule. Re-login or
explicit destruct/re-spawn re-installs the timer at the new
cadence. Acceptable for v1 — a player tuning their autosave
cadence is doing it once per session, not repeatedly mid-flight.

**Unit (R-side):** milliseconds, **not** seconds, **not** minutes.
The description string above states this explicitly. The
schema's `type: SettingTypes.Number` accepts any numeric value;
the schema layer does not enforce min/max today (the
`SettingsSchemaEntry.validator` callback supports custom
validation, but no current setting uses it — see
`grep -rn "validator:" packages/server/src/mud/.../settings`
returns zero hits). v1 ships without a validator; pathological
values (zero, negative, microsecond-level) would be a user
self-inflicted wound that the next-login fixes by re-setting.
A future tightening could add `validator: (v) => v >= 1000 || 'must
be at least 1000ms'`.

**No constant.** `mud/config/constants.ts` does **not** gain an
`AVATAR_AUTOSAVE_INTERVAL_MS` export. The file stays as it is
(only `DEFAULT_STARTING_LOCATION_PATH`); Wave 7 does not modify
it.

See `docs/subsystems/shell-environment.md` for the schema-on-mixin
pattern, `EnvironmentMixin`, the two-store model, and the
`resolveSetting` cross-host helper.

### Q15 — In-flight save coordination

**Q.** Skip-when-in-flight vs queueing?

**Resolution: no coordination. No flag. Concurrent saves are
acceptable.**

Per the requirements doc's updated § 15: each save reads avatar
state atomically. JS is single-threaded; the synchronous
`persistentFields` walk at the top of
`TemplateApi.snapshotToTemplate` completes BEFORE any await yield,
so each concurrent save produces a valid full-state snapshot.
MongoDB's `replaceOne` resolves ordering as last-write-wins. A
flag would only have prevented wasted work (an extra
persistentFields walk + an extra Mongo write), not correctness.
For a 5-minute periodic cadence with the only other save firing
on disconnect, the redundant-work cost is trivially negligible —
not worth the substrate complexity.

**Race conditions, re-examined:**

- Periodic timer fires while a previous periodic save is still
  running: both run; both produce the same snapshot (no state
  mutation between them); MongoDB's last-write-wins picks one.
  Wasted work, no incorrectness.
- Linkdead hook fires while a periodic save is running: both run;
  later snapshot may capture later container ref; MongoDB picks
  the last write. No incorrectness.
- Manual `eval avatar.save()` while another save is in flight: both
  run; same outcome.

The "snapshot-before-await" correctness lives in TemplateApi's
implementation (R9, restated: the persistentFields walk and
container ref read happen sync-before-first-await). That's the
load-bearing invariant; no flag needed on top.

Cross-process coordination (multi-shard backend) is explicitly
out of scope for v1; if/when it ships, the fix lives at the
Mongo client layer (optimistic concurrency) or at the lifecycle
layer — NOT in TemplateApi.snapshotToTemplate. Per
`feedback_no_premature_registries`.

### Q16 — Restore against an actively-multiplexed avatar

**Q.** Multiple connections share one Avatar; `restore()` mutates
fields under live observation. Coordination?

**Resolution: v1 doesn't add coordination.** Per the requirements
doc's stated lean: "restore() is a developer/admin operation; the
multiplexed-session case is rare enough that v1 doesn't add
coordination; if connections observe inconsistent state during a
restore, that's acceptable."

Documented in the connection.md update with a forward note: when a
"restore mid-session" gains gameplay relevance (e.g., a "rewind"
verb), coordination will need to be designed — likely via a brief
`DurativeActivity` that blocks input for the duration of the
restore.

### Q17 — Save on construction-sentinel boundary

**Q.** Could auto-save fire while the avatar's state is mid-construction?

**Resolution: no — auto-save only fires post-Login.enter.**

Evidence:

- `Login.enter` (`mud/obj/Login.ts:52-120`) is the only place this
  build adds an auto-save call. By the time `Login.enter` runs:
  - `PlayerApi.loadAvatarsForUser` (`api/player.ts:98-116`) has
    completed, which has fully run `StuffApi.clone` + the avatar's
    own `postRegister`. The construction sentinel is FALSE by
    construction (it's cleared inside `StuffApi.#registerAndInit`
    flow).
  - `ConnectionApi.transfer(interactive, avatar)` has succeeded —
    Avatar is in steady state.
- The periodic timer starts AFTER `ConnectionApi.transfer` and before
  the welcome scene (the exact line is up to the build agent;
  putting it before `sendLookDescription` is fine).
- The linkdead-driven save fires from `Avatar.onLinkdead` or
  `Avatar.onDestruct`, both of which run after the avatar has been
  in steady state for the duration of the session. Construction
  sentinel is FALSE.

No fix needed. `Avatar.save()` reading field values during the timer
window sees a fully-settled instance.

### Q18 — `User` doc participation

**Q.** Does User need a schema migration for persist-back?

**Resolution: no.** Per the requirements doc's lean: "User's
`playerIds` already lists what Avatars exist; no User-side change."

Evidence: `lib/identity/User.ts:23` declares `static
persistentFields = ['googleProfileId', 'playerIds']`. The
per-player avatar template at `/obj/Avatar/<playerId>` is the
persistence anchor; User just lists the playerIds. Save-back
operates on the template, not on User. No User-side change.

---

## 3. File-by-file plan

Files grouped by wave. New files marked `(new)`; modified files cite
line numbers being changed.

### 3.1 Wave 1 — Prereqs

**File: `packages/server/src/mud/lib/mixin.ts`**

Modify lines 21-75 to add `Populates: 'PopulatesMixin'` to the
`Mixins` constants object. Insert alphabetically — between
`PostRegistration: 'PostRegistrationMixin'` (line 41) and
`HasInteractive: 'HasInteractiveMixin'` (line 42) is wrong (those
aren't alphabetical either; the file's order is the order in which
mixins were added). Pick a stable spot: append at the end of the
spatial cluster (after `Spawner` / `Spawned` at lines 71-72), or
**simpler — add `Populates: 'PopulatesMixin'` right after
`Spawned: 'SpawnedMixin'` on line 72** (the spawner/spawned cluster
is the spatial-cousin to populates; the build agent picks).

```ts
  Spawner: 'SpawnerMixin',
  Spawned: 'SpawnedMixin',
  Populates: 'PopulatesMixin',
  Globbable: 'GlobbableMixin',
```

**No `Singleton` constant added** — already exists at line 45
(`Singleton: 'SingletonMixin'`).

**File: `packages/server/src/mud/api/mixin.ts`** (no change needed)

Verify `MixinApi.hasMixin` overload at lines 185-188 accepts a
constructor argument. (It does — Q3 resolution.) Verify
`MixinApi.getAllPersistentFields` at lines 306-322 and
`getAllFieldMarshallers` at lines 246-271 are available for
`Avatar.save()`. (They are.) **No edits.**

**File: `packages/server/src/mud/api/scheduler.ts`** (no change)

`SchedulerApi` — confirmed NOT a fit for periodic save (engagement-
shaped; see Q13). No edits.

**File: `packages/server/src/mud/api/schedule.ts`** (no change)

`ScheduleApi` — confirmed as the right wrapper for periodic save
(`ScheduleApi.recurring` with `propagateAttribution: false`,
`mode: 'fixed-delay'`; see Q13 and Wave 7). No edits to the Api
itself; Wave 7 just consumes it.

**File: `packages/server/src/mud/lib/persistence/PersistentHydrator.ts`** (no change)

Confirmed Phase 2 dispatch awaits async appliers (Q5). No edits.

### 3.2 Wave 2 — `PopulatesMixin`

**File (new): `packages/server/src/mud/lib/stuff/Populates.ts`**

```ts
/**
 * PopulatesMixin — declarative content-spawn for Container hosts.
 *
 * Composes onto `Container` (`Stuff & Container`). Declares
 * `static instructionFields = ['populates']` and exposes
 * `applyPopulates(specs: string[]): Promise<void>` — Phase 2 of the
 * Hydrator's two-phase dispatch invokes the applier with the YAML-
 * declared `populates: [path, ...]` list.
 *
 * For each entry, the applier dispatches by the source template's
 * class:
 *
 *   - Singleton-shaped (composes `SingletonMixin`):
 *     `StuffApi.singleton(path)` returns the unique instance; if
 *     the instance is already placed somewhere
 *     (`getContainer() !== null`), the move is skipped — the
 *     singleton lives wherever it was first placed (its own
 *     `applyContainer`, another `populates:` parent, player action).
 *   - Non-singleton: `StuffApi.clone(path)` mints a fresh instance,
 *     unconditionally moved into self via `ContainmentApi.move`.
 *
 * Cycle protection: inherited from `StuffApi.clone`'s existing
 * `#inFlightClonePaths` guard. A populates → populates cycle
 * surfaces a clear diagnostic naming the path chain.
 *
 * v1 spec entries are bare path strings. Richer shapes
 * (`{ template, count }`, conditional spawns) are out of scope;
 * see `docs/slates/declarative-content-slate.md` § Future.
 *
 * Per `feedback_property_vs_instruction_fields`: `populates` is an
 * instruction field (consumed by `applyPopulates` to produce
 * runtime placements). There is NO paired `getPopulates()` accessor
 * on the runtime instance — the spec is discarded after Phase 2.
 *
 * Per `feedback_no_api_for_content`: this mixin is substrate. It
 * does not enumerate content at boot; it triggers lazy clones from
 * the data the content author wrote.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

/**
 * Public shape provided by PopulatesMixin.
 *
 * The applier is the only public surface. The spec is consumed
 * during Phase 2 hydration and not retained.
 */
export interface Populates {
  applyPopulates(specs: string[]): Promise<void>;
}

export function PopulatesMixin<TBase extends MixinConstructor<Stuff & Container>>(
  Base: TBase
) {
  return class PopulatesMixin extends Base {
    static _mixinName = 'PopulatesMixin';

    /**
     * Instruction field consumed by `applyPopulates`. The YAML data
     * is an array of templatePath strings; Phase 2 dispatches by
     * source-template singleton-shape and moves the resulting
     * instance into self.
     */
    static instructionFields = ['populates'];

    /**
     * Phase 2 applier. See class docstring for dispatch semantics.
     *
     * Class resolution goes through `StuffApi.loadClassByPath` —
     * the existing public class-loading Api surface
     * (`api/stuff.ts:932-979`); see plan Q3 for the discussion of
     * why this is the right home for the resolver. The Template
     * lookup is a separate Template.findByPath call so we have
     * `tpl.class` to feed into `loadClassByPath`.
     */
    async applyPopulates(specs: string[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      // Lazy import to dodge any cycle through Stuff.
      const { Template } = await import('./Template');
      for (const path of specs) {
        if (typeof path !== 'string' || path.length === 0) continue;
        const tpl = await Template.findByPath(path);
        if (!tpl) {
          throw new Error(
            `PopulatesMixin.applyPopulates: no template at '${path}'`
          );
        }
        const cls = (await StuffApi.loadClassByPath(tpl.class)) as new (
          ...args: unknown[]
        ) => Stuff;
        if (MixinApi.hasMixin(cls, Mixins.Singleton)) {
          const inst = await StuffApi.singleton<Stuff & Containable>(path);
          if (inst.getContainer() !== null) continue; // skip; already elsewhere
          ContainmentApi.move(inst, this as unknown as Stuff & Container);
        } else {
          const inst = await StuffApi.clone<Stuff & Containable>(path);
          ContainmentApi.move(inst, this as unknown as Stuff & Container);
        }
      }
    }
  };
}
```

**Notes for the build agent:**

- The base constraint is `MixinConstructor<Stuff & Container>`,
  matching `ExitableMixin`'s shape at
  `lib/boundary/Exitable.ts:179`. Compose order in a host: `class
  Foo extends PopulatesMixin(ContainerMixin(Base)) { ... }`.
- Type predicate `MixinApi.isPopulates(obj)` is **NOT added** to
  `MixinApi` in this build — the only consumer of the predicate is
  the Hydrator's Phase 2 dispatch, which uses
  `getAllInstructionFields` not `hasMixin`. Adding the predicate
  speculatively violates `feedback_no_premature_registries`.
- No `resolveClassForTemplate` helper is introduced in this module.
  The class-loading dance lives on `StuffApi.loadClassByPath` — see
  Q3 for the full discussion. `HotReloadApi` import is therefore
  NOT in this module's import list (it's only needed by the
  underlying `loadClassByPath`).

**File (new): `packages/server/src/mud/lib/stuff/__tests__/Populates.test.ts`**

See § 5.2 for test specifications.

### 3.3 Wave 3 — `ContainableMixin.applyContainer` + template-save validation

**File: `packages/server/src/mud/lib/spatial/Containable.ts`**

Modify near lines 81-105 to add `static instructionFields =
['container']`. Add new `applyContainer(path)` async method on the
mixin class body. Add interface declaration of `applyContainer` on
the `Containable` interface (lines 44-74).

**Diff sketch:**

1. Update `Containable` interface (lines 44-74) to add:
   ```ts
   /**
    * Declarative-content applier. Phase 2 of the Hydrator's two-
    * phase dispatch reads `data.container` from the source template
    * and calls this method with the resolved templatePath. The
    * applier resolves the target via `StuffApi.singleton` (the
    * target MUST be singleton-shaped — validated at template-save
    * time by `TemplateApi.validateSingletonContainerTarget`) and
    * moves self into it via `ContainmentApi.move`.
    *
    * Per-call idempotency: compare current container's
    * templatePath to the declared path; no-op when they match.
    * The compare-and-move shape (option (c) in the requirements
    * doc's Open Question §12) supports both fresh-clone placement
    * AND `Avatar.restore()` re-move semantics with no flag.
    */
   applyContainer(path: string): Promise<void>;
   ```
2. Inside `ContainableMixin` class body (after line 83's `static
   _mixinName`), add:
   ```ts
   /**
    * Instruction field — declarative spawn target. Consumed by
    * Phase 2 of the Hydrator. There is NO paired `getContainer(path)`
    * declaration accessor; the live `getContainer()` ref is the
    * only runtime getter.
    *
    * Per declarative-content-slate § container: on Template,
    * adjusted for the in-`data:` shape (requirements doc header
    * note).
    */
   static instructionFields = ['container'];
   ```
3. Add the applier method body (after `getRootContainer` at line
   179, before the closing `}`):
   ```ts
   /**
    * Phase 2 applier — see interface docstring for semantics.
    */
   async applyContainer(path: string): Promise<void> {
     const target = await StuffApi.singleton<Stuff & Container>(path);
     const current = this.getContainer();
     if (current && current.getTemplatePath() === path) {
       return; // already in declared container; no-op.
     }
     ContainmentApi.move(
       this as unknown as Stuff & Containable,
       target,
     );
   }
   ```
4. Add the `StuffApi` import to the file's import list (line 35
   imports `MixinApi`; add `StuffApi`).

**Composition note for the build agent:** existing classes that
already compose `ContainableMixin` (the Containable-Container chain
is wide — most leaf game objects) automatically gain `applyContainer`
when this lands. No content changes are needed today because no
existing YAML seed declares `data.container` (per requirements doc
out-of-scope: no content authoring); but the substrate is ready for
when content lands.

**File: `packages/server/src/mud/api/template.ts`**

Add a new static method `validateSingletonContainerTarget(doc)`
between `validateFolderLeafSave` (lines 90-123) and
`validateFolderLeafDelete` (lines 133-143):

```ts
/**
 * Validate a candidate domain-template doc's `data.container`
 * against the singleton-target constraint:
 *
 *   - Skip when `data.container` is absent or non-string.
 *   - Resolve the target template at the declared path; throw if
 *     it doesn't exist.
 *   - Resolve the target's backing class; throw if the class does
 *     NOT compose `SingletonMixin`.
 *   - Additionally validate the source template's class composes
 *     `ContainableMixin` — a non-Containable declaring `container`
 *     is a config bug (Phase 2 would fail loudly at hydrate time,
 *     but template-save is the earlier surface to catch it).
 *
 * Used by `DomainHook.aroundSave` alongside
 * `validateFolderLeafSave`. Per declarative-content-slate
 * § container: on Template — singleton-target constraint.
 */
public static async validateSingletonContainerTarget(
  doc: Record<string, unknown>
): Promise<void> {
  const data = doc.data as Record<string, unknown> | undefined;
  if (!data || typeof data.container !== 'string') return;
  const targetPath = data.container;
  const sourcePath = typeof doc.path === 'string' ? doc.path : '(unknown source)';

  // 1. Source class must compose ContainableMixin.
  const sourceClass = doc.class;
  if (typeof sourceClass !== 'string') return; // folder-leaf validator handles
  const sourceCtor = (await StuffApi.loadClassByPath(sourceClass)) as new (
    ...args: unknown[]
  ) => unknown;
  if (!MixinApi.hasMixin(sourceCtor, Mixins.Containable)) {
    throw new TemplateError(
      `Template '${sourcePath}' declares 'data.container' but its ` +
        `class '${sourceClass}' does not compose ContainableMixin.`
    );
  }

  // 2. Target template must exist.
  const targetTpl = await Template.findByPath(targetPath);
  if (!targetTpl) {
    throw new TemplateError(
      `Template '${sourcePath}' declares 'data.container: ${targetPath}' ` +
        `but no template exists at that path.`
    );
  }

  // 3. Target class must compose SingletonMixin.
  const targetCtor = (await StuffApi.loadClassByPath(targetTpl.class)) as new (
    ...args: unknown[]
  ) => unknown;
  if (!MixinApi.hasMixin(targetCtor, Mixins.Singleton)) {
    throw new TemplateError(
      `Template '${sourcePath}' declares 'data.container: ${targetPath}' ` +
        `but the target's class '${targetTpl.class}' does not compose ` +
        `SingletonMixin. The container: target must be singleton-shaped ` +
        `(see declarative-content-slate § container:).`
    );
  }
}
```

Class resolution goes through `StuffApi.loadClassByPath` — the
existing public Api surface (`api/stuff.ts:932-979`); no private
`resolveTemplateClass` helper is added to this file. See plan Q3
for the discussion of why this is the right home for the resolver
(four+ existing/new external consumers — Populates, this validator,
ZoneApi×2, WriteController).

Add imports (`StuffApi` is already imported in `api/template.ts`
at line 26):

```ts
import { MixinApi } from './mixin';
import { Mixins } from '../lib/mixin';
```

**File: `packages/server/src/mud/obj/hooks/DomainHook.ts`** (or
wherever the aroundSave registration lives — build agent verifies
via `grep -rn validateFolderLeafSave packages/server/src/`)

In the aroundSave hook body that currently calls
`TemplateApi.validateFolderLeafSave(doc)`, add a second call:
`await TemplateApi.validateSingletonContainerTarget(doc);`. Same
position in the chain; both must complete before `next(doc)`.

If the hook file doesn't exist explicitly (the registration may be
inline somewhere), the build agent identifies the call site and
adds the second validation step.

**File: `packages/server/src/mud/obj/command/CloneController.ts`**
(NOT modified in Wave 3 — see Wave 4.)

**Test file: `packages/server/src/mud/lib/spatial/__tests__/Containable.test.ts`**

Extend existing tests with the `applyContainer` suite per § 5.3.

**Test file (new or in existing): `packages/server/src/mud/api/__tests__/template.validateSingletonContainerTarget.test.ts`**

See § 5.3 for specifications.

### 3.4 Wave 4 — CloneController hydrate-first refactor

**File: `packages/server/src/mud/obj/command/CloneController.ts`**

Replace the entire `execute()` and `resolveDestination()` methods
with the new hydrate-first flow. The file's `import` block and
class-level structure stay the same.

Specific line-level changes:

1. **Header docstring (lines 1-29):** rewrite to describe the new
   precedence stack:
   ```
   Destination resolution (precedence):
     1. --into <dest>             — explicit Container.
     2. --here                    — sugar for the avatar's environment.
     3. Hydration self-placement  — applyContainer ran during clone and
                                     placed the instance somewhere.
     4. fallback                  — the giver's inventory.

   Step 3 is implicit; the clone runs first and observes where the
   instance landed. Steps 1 + 2 (when present) override step 3
   AFTER the clone, via ContainmentApi.move. Step 4 fires only when
   the post-clone container is still null.
   ```
2. **`execute()` body (lines 56-133):** new flow:
   ```ts
   async execute(model: CloneModel, context: CommandContext): Promise<void> {
     const giver = context.commandGiver;

     // 1. Resolve the template path. Same as today.
     let path: string | null = null;
     if (model.mql) {
       const stuff = model.mql.stuff;
       if (!stuff) return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
       path = stuff instanceof Template ? stuff.path : stuff.getTemplatePath();
     } else if (model.template) {
       if (MixinApi.isWorkspace(giver)) {
         const home = giver.getHome();
         path = SourceTreeApi.joinLogical(
           giver.getCwd('content'),
           model.template,
           { home },
         );
       } else {
         path = model.template;
       }
     } else {
       return this.fail(context, 'clone needs a <template>');
     }
     if (!path) return this.fail(context, 'no template path');

     // 2. Clone. Hydration's Phase 2 fires applyContainer if the
     //    template declares data.container; the instance may
     //    self-place during this step.
     let cloned: Stuff;
     try {
       cloned = await StuffApi.clone(path);
     } catch (err) {
       return this.fail(context, (err as Error).message);
     }
     const name = DescribeApi.getDisplayName(cloned, '?');

     if (!MixinApi.isContainable(cloned)) {
       this.tell(
         context,
         `\ncloned ${path} → ${name} (${cloned.stuffId}); not Containable, left unplaced\n`,
       );
       return;
     }
     const item = cloned as Stuff & Containable;

     // 3. Apply destination precedence post-clone.
     const placement = this.resolvePlacement(model, giver, item, context);
     if ('error' in placement) {
       // The instance exists; surface the destination error but don't
       // fail the clone itself.
       this.tell(
         context,
         `\ncloned ${path} → ${name} (${cloned.stuffId}); destination resolution failed: ${placement.error}\n`,
       );
       return;
     }
     if (placement.dest === null) {
       // Layer 3 hit (hydration placed it); no move needed.
       const where = item.getContainer();
       const destName = DescribeApi.getDisplayName(where, 'somewhere');
       this.tell(
         context,
         `\ncloned ${path} → ${name} (${cloned.stuffId}); placed by template into ${destName}\n`,
       );
       return;
     }

     // Move to the resolved destination. May override hydration's
     // self-placement (Layer 1/2 explicit overrides Layer 3 implicit).
     const movingFromHydration = item.getContainer() !== null
       && item.getContainer() !== placement.dest;
     try {
       ContainmentApi.move(item, placement.dest);
     } catch (err) {
       this.tell(
         context,
         `\ncloned ${path} → ${name} (${cloned.stuffId}); placement failed: ${(err as Error).message}\n`,
       );
       return;
     }
     const destName = DescribeApi.getDisplayName(placement.dest, 'somewhere');
     const overrideNote = movingFromHydration
       ? ` (overrode template's container)`
       : '';
     this.tell(
       context,
       `\ncloned ${path} → ${name} (${cloned.stuffId}) into ${destName}${overrideNote}\n`,
     );
     return;
   }
   ```
3. **`resolveDestination()` (lines 140-181) → `resolvePlacement()`
   (rename):** new return shape:
   ```ts
   private resolvePlacement(
     model: CloneModel,
     giver: Stuff,
     item: Stuff & Containable,
     context: CommandContext,
   ):
     | { dest: Stuff & Container | null }  // null = hydration placed it
     | { error: string } {
     // Layer 1: --into <dest>.
     if (model.into) {
       const stuff = model.into.stuff;
       if (!stuff) return { error: `no match for --into ${model.into.raw ?? ''}` };
       if (!MixinApi.isContainer(stuff)) {
         return { error: `${DescribeApi.getDisplayName(stuff, 'that')} is not a container` };
       }
       return { dest: stuff };
     }
     // Layer 2: --here.
     if (model.here) {
       const env = context.location;
       if (!env || !MixinApi.isContainer(env)) {
         return { error: 'no environment to place into' };
       }
       return { dest: env };
     }
     // Layer 3: hydration self-placement. If the instance already has
     // a container, accept it — no additional move.
     if (item.getContainer() !== null) {
       return { dest: null };
     }
     // Layer 4: fallback — the giver's inventory.
     if (!MixinApi.isContainer(giver)) {
       return { error: 'no destination — pass --into or --here' };
     }
     return { dest: giver };
   }
   ```

The `tell` / `fail` private methods at lines 183-198 stay
unchanged.

**File: `packages/server/src/mud/cmd/clone.yaml`** (no functional change)

Inspect lines 1-20 to confirm no `environment` references remain. The
file as it stands (per § 1 inspection) is already shaped per the
new flow; just verify nothing needs touching. **Build agent: confirm
file is unchanged.**

**Test file (new): `packages/server/src/mud/obj/command/__tests__/CloneController.test.ts`**

See § 5.4 for specifications. (No existing tests for CloneController
today.)

### 3.5 Wave 5 — `Login.enter` live-ref consultation

**File: `packages/server/src/mud/obj/Login.ts`**

Modify lines 73-79 (the starting-location resolution block):

**Before:**

```ts
const startingLocation = await StuffApi.singleton<Location>(
  DEFAULT_STARTING_LOCATION_PATH
);
avatar.teleport(startingLocation, { silent: true });
console.info(
  `Login: Placed ${avatar.getFullName()} in ${DescribeApi.getDisplayName(startingLocation, 'somewhere')}`
);
```

**After:**

```ts
let startingLocation = avatar.getContainer();
if (!startingLocation) {
  startingLocation = await StuffApi.singleton<Location>(
    DEFAULT_STARTING_LOCATION_PATH
  );
  avatar.teleport(startingLocation, { silent: true });
}
console.info(
  `Login: ${avatar.getFullName()} in ${DescribeApi.getDisplayName(startingLocation, 'somewhere')}`
);
```

The console.info message is reshaped slightly to remove the past-
tense "Placed" word (it's no longer always a fresh placement).

**Imports unchanged.** `Location` import at line 15 stays — still
used in the type annotation.

**Test file: `packages/server/src/mud/obj/__tests__/Login.test.ts`**

Extend with the test triad per § 5.5.

### 3.6 Wave 6 — `TemplateApi.snapshotToTemplate` / `restoreFromTemplate` + Avatar `save()` / `restore()` shims

Two pieces in one wave:

1. **Two new static methods on existing `mud/api/template.ts`** —
   `snapshotToTemplate(stuff)` (returns `Template`) and
   `restoreFromTemplate(stuff)` (void). The Api itself is
   unchanged in shape — no new file, no new class. The methods
   are stateless; no instance fields; no per-Stuff coordination.
2. **Thin `save()` / `restore()` methods on Avatar** — `save()`
   is two lines (snapshot, then commit); `restore()` is one line
   (delegate). No reentry guard; no `#` slot added.

The user surfaced the architectural call explicitly during plan
review: the snapshot/restore mechanism is fully general, but it's
also Stuff↔Template directional — exactly the direction
`TemplateApi` already handles (`validateFolderLeafSave`,
`saveTemplate`). Per CLAUDE.md §
"Module Categories — DO NOT INVENT NEW ONES" and "No premature
registries", general substrate machinery defaults to an existing
Api class when one fits. Snapshot/restore lives in TemplateApi;
no new file at `api/persistence.ts`.

Separation of concerns for the snapshot:
**`snapshotToTemplate` is pure capture-state — it returns the
mutated `Template` without committing.** The caller invokes
`tpl.save()`. This makes the snapshot composable: callers can
inspect, batch, or short-circuit before committing.

**File: `packages/server/src/mud/api/template.ts`** (extend
existing — adds two new static methods alongside
`saveTemplate`, `validateFolderLeafSave`, etc.)

Add imports (at the top of the file, alongside the existing
import block):

```ts
import type { Stuff } from '../lib/stuff/Stuff';
import { MixinApi } from './mixin';
import type { Marshaller } from '../lib/persistence/Marshaller';
import { PersistentHydrator } from '../lib/persistence/PersistentHydrator';
```

(`Template` and `StuffApi` are already imported at the top of
the file; verify.)

Add the two methods inside the existing `TemplateApi` class
body, after `validateFolderLeafDelete` (or similar — placement
is whatever reads cleanly):

```ts
  /**
   * Snapshot a live Stuff host's `persistentFields` chain back
   * to its backing Template doc's `data` block. Walks the
   * composed mixin chain via
   * `MixinApi.getAllPersistentFields(stuff.constructor)`;
   * marshals values per
   * `MixinApi.getAllFieldMarshallers`; derives `data.container`
   * from the live container ref when the host is Containable;
   * merges over the existing `tpl.data` (preserves non-mixin-
   * managed keys).
   *
   * **Pure capture-state: does NOT call `tpl.save()`.** Returns
   * the mutated Template; the caller decides when to commit.
   * Separating capture from commit lets callers inspect, batch,
   * or short-circuit before persisting. The default usage is
   * `const tpl = await TemplateApi.snapshotToTemplate(host);
   * await tpl.save();`
   *
   * Keyed on `stuff.getTemplatePath()` — the runtime stamp
   * every Stuff carries post-clone — NOT on any class-specific
   * helper (Avatar.getTemplatePath(playerId) etc.). The method
   * is class-shape-agnostic; callers don't need to know how
   * their templatePath was derived.
   *
   * **Synchronous-prefix-before-first-await ordering (R9):**
   * the persistentFields walk and the container ref read run
   * synchronously, BEFORE `Template.findByPath` yields. This
   * is load-bearing for `onDestruct`-driven fire-and-forget
   * saves: they capture pre-cleanup field values even though
   * the MongoDB write itself is async.
   *
   * Concurrent calls produce equivalent full-state snapshots
   * — no in-process coordination. MongoDB's `replaceOne`
   * resolves ordering as last-write-wins. See Open Q15.
   *
   * v1 consumer surface: Avatar only. No `PersistableStuffMixin`;
   * no generalization to arbitrary Stuff (per requirements doc
   * § Out of scope). The method is general so the next consumer
   * doesn't repeat the mechanism inline.
   *
   * Throws:
   *   - Stuff has no templatePath stamp.
   *   - No Template at the resolved path.
   *   - A marshalled field references an unregistered marshaller.
   */
  public static async snapshotToTemplate(
    stuff: Stuff
  ): Promise<Template> {
    const path = stuff.getTemplatePath();
    if (!path) {
      throw new Error(
        `TemplateApi.snapshotToTemplate: Stuff has no templatePath stamp`
      );
    }

    // Synchronous snapshot — captures field values + container
    // ref BEFORE any event-loop yield. Load-bearing for
    // onDestruct-driven saves. See R9.
    const ctor = stuff.constructor as new (...args: unknown[]) => Stuff;
    const fields = MixinApi.getAllPersistentFields(ctor);
    const marshallerPaths = MixinApi.getAllFieldMarshallers(ctor);
    const self = stuff as unknown as Record<string, unknown>;
    const snapshot: Record<string, unknown> = {};
    for (const field of fields) {
      if (!(field in stuff)) continue;
      snapshot[field] = self[field];
    }
    const hostIsContainable = MixinApi.isContainable(stuff);
    const containerPath = hostIsContainable
      ? stuff.getContainer()?.getTemplatePath() ?? null
      : null;

    const tpl = await Template.findByPath(path);
    if (!tpl) {
      throw new Error(
        `TemplateApi.snapshotToTemplate: no template at '${path}'`
      );
    }

    const data: Record<string, unknown> = { ...(tpl.data ?? {}) };
    for (const field of fields) {
      if (!(field in snapshot)) continue;
      const value = snapshot[field];
      const mPath = marshallerPaths[field];
      if (mPath) {
        const m = StuffApi.findByTemplatePath<
          Marshaller<unknown, unknown>
        >(mPath);
        if (!m) {
          throw new Error(
            `TemplateApi.snapshotToTemplate: marshaller '${mPath}' ` +
              `for field '${field}' not registered.`
          );
        }
        data[field] = m.toStored(value);
      } else {
        data[field] = value;
      }
    }
    if (hostIsContainable) {
      if (containerPath !== null) {
        data.container = containerPath;
      } else {
        delete data.container;
      }
    }

    tpl.data = data;
    return tpl; // Caller commits via tpl.save().
  }

  /**
   * Re-hydrate a live Stuff host's in-memory state from its
   * current Template doc. Operates on the existing instance;
   * preserves identity / stuffId / wired Interactives. Phase 1
   * setters overwrite field values; Phase 2 appliers re-fire
   * (e.g. `applyContainer` moves the host via compare-and-move).
   *
   * v1 coordination: developer/admin operation; does NOT
   * synchronize against multiplexed observers (see requirements
   * doc Open Q16).
   *
   * Throws on missing templatePath, missing Template doc, or
   * hydration failure.
   */
  public static async restoreFromTemplate(stuff: Stuff): Promise<void> {
    const path = stuff.getTemplatePath();
    if (!path) {
      throw new Error(
        `TemplateApi.restoreFromTemplate: Stuff has no templatePath stamp`
      );
    }
    const tpl = await Template.findByPath(path);
    if (!tpl) {
      throw new Error(
        `TemplateApi.restoreFromTemplate: no template at '${path}'`
      );
    }
    // Reuse the canonical hydrator (singleton).
    const hydrator = await StuffApi.singleton<PersistentHydrator>(
      PersistentHydrator.templatePath
    );
    await hydrator.hydrate(stuff, tpl.data ?? {});
  }
```

**Notes for the build agent:**

- TemplateApi already ends with
  `SecurityApi.decorateApiClass(TemplateApi)`; adding new static
  methods to the class body before the decoration line is the
  standard extension pattern.
- The methods accept `Stuff` (the base type). Container
  derivation is gated by a runtime
  `MixinApi.isContainable(stuff)` check — for hosts that aren't
  Containable (rare; Avatar IS Containable via the Character
  chain), `data.container` is not touched in either direction.
- The `getTemplatePath()` read goes through the runtime stamp.
  Stuff that was never `clone`-stamped (e.g., a freshly `new`'d
  test fixture) throws cleanly. Callers should not pre-clone
  Stuff via `new` then call snapshotToTemplate; they should
  `clone` from a Template (which is the normal path).
- `snapshotToTemplate` does NOT call `tpl.save()`. The caller
  is responsible for committing. Tests verifying the contract
  must explicitly call `await tpl.save()` after the snapshot
  to round-trip through the in-memory Mongo store.

**File: `packages/server/src/mud/obj/Avatar.ts`**

Two thin additions; no new `#` slot, no reentry guard, no extra
imports for the snapshot/restore machinery:

1. **Add import** (after line 24):
   ```ts
   import { TemplateApi } from '../api/template';
   ```
   No need to import `Template`, `MixinApi`, `StuffApi`,
   `Marshaller`, or `PersistentHydrator` — TemplateApi hides all
   of that machinery. The Avatar file's import list stays
   minimal.

2. **Add `save()` method** (place after the existing constructor
   prefix region, before `postRegister` at line 109):
   ```ts
   /**
    * Snapshot this Avatar's persistentFields chain back to its
    * per-player template doc.
    *
    * Two-line shim: `TemplateApi.snapshotToTemplate(this)`
    * captures state into the returned Template; `tpl.save()`
    * commits it. Concurrent saves (periodic timer + linkdead
    * hook + manual eval) each produce a valid full-state
    * snapshot; MongoDB resolves ordering as last-write-wins
    * (see plan Q15).
    *
    * Throws (propagated from TemplateApi or Persistable.save):
    *   - Missing template (per-player record absent).
    *   - Missing marshaller for a marshalled field.
    *   - Underlying PersistenceManager.save errors.
    */
   public async save(): Promise<void> {
     const tpl = await TemplateApi.snapshotToTemplate(this);
     await tpl.save();
   }
   ```

3. **Add `restore()` method** (immediately after `save`):
   ```ts
   /**
    * Re-hydrate this Avatar's in-memory state from its current
    * template doc. One-line shim: delegates to
    * `TemplateApi.restoreFromTemplate`. Distinct from a fresh
    * clone: operates on the existing live instance, preserving
    * identity / stuffId / connected Interactives.
    *
    * v1 coordination: developer/admin operation only — does NOT
    * add multi-connection synchronization (see requirements doc
    * Open Q16). Connections that observe field flips during a
    * restore see inconsistent state; documented limitation.
    */
   public async restore(): Promise<void> {
     await TemplateApi.restoreFromTemplate(this);
   }
   ```

4. **Update `onDestruct()` (lines 161-167)** to call `stopAutoSave`
   before existing cleanup. This change is technically part of Wave
   7 but is mentioned here for ordering visibility — see § 3.7.

**Test files:**

- Extend (or create if missing):
  `packages/server/src/mud/api/__tests__/template.test.ts`
  — mechanism-level tests for `snapshotToTemplate` and
  `restoreFromTemplate`. See § 5.6.
- Extend: `packages/server/src/mud/obj/__tests__/Avatar.test.ts`
  — Avatar-specific tests (delegation shape; the auto-save
  lifecycle tests land in Wave 7). See § 5.6.

### 3.7 Wave 7 — Auto-save + periodic backstop

**File: `packages/server/src/mud/config/constants.ts`** (no change)

The earlier plan iteration added `AVATAR_AUTOSAVE_INTERVAL_MS = 5 *
60 * 1000` here. The Pass-2 review override in Q14 retires that
constant — the interval lives as a `world.autosave.interval` setting
declared on `Avatar`, resolved via `resolveSetting` at timer-install
time. The constants file is unmodified by this wave.

**File: `packages/server/src/mud/obj/Avatar.ts`**

Two additions in Wave 7:

1. **Schema declaration for `world.autosave.interval`** —
   schema-on-mixin pattern (per
   `docs/subsystems/shell-environment.md`) applied to a class:
   declare `static settings` on `Avatar` itself, the substrate
   that consumes the setting. The schema walk in
   `MixinApi.queryMixins(host.constructor)` picks up class-level
   `static settings` the same way it picks up mixin-level
   declarations.
2. **Periodic-save handle + start/stop methods** — alongside the
   `save()` / `restore()` shims from Wave 6, using the setting-
   resolved interval.

```ts
import {
  ScheduleApi,
  type ScheduleHandle,
} from '../api/schedule';
import {
  SettingTypes,
  resolveSetting,
  type SettingsSchemaEntry,
} from '../lib/shell/Environment';

// inside the class body, in the static section:

/**
 * Schema entries declared by Avatar. Picked up by the schema walk
 * via `MixinApi.queryMixins(host.constructor)` — class-level
 * `static settings` are unioned alongside mixin-level entries.
 *
 * `world.autosave.interval` controls the cadence of the periodic-
 * save backstop installed in `Login.enter`. Resolved once at
 * `startAutoSave()` time; mid-session changes don't restart the
 * timer (documented limitation, see plan Q14).
 *
 * Per `docs/subsystems/shell-environment.md`'s schema-on-mixin
 * principle: the setting lives on the substrate that owns the
 * concept. Autosave is purely Avatar-lifecycle policy, so Avatar
 * is the right home. A future `PersistableStuffMixin` would pull
 * this entry up to that mixin and Avatar would compose it.
 */
static settings: SettingsSchemaEntry[] = [
  {
    key: 'world.autosave.interval',
    type: SettingTypes.Number,
    default: 5 * 60 * 1000, // 5 minutes in milliseconds
    description:
      'Cadence (milliseconds) for the Avatar persist-back ' +
      'periodic backstop. Resolved once at login time; mid-session ' +
      'changes do not restart the running timer (effect lands at ' +
      'next login).',
  },
];

// inside the class body, near the save/restore shims:

/**
 * Periodic auto-save handle. Started by Login.enter post-
 * connection; cleared by onDestruct. Saves run via the standard
 * `save()` path; concurrent saves are acceptable (full-state
 * snapshots; MongoDB last-write-wins resolves ordering — see Q15).
 *
 * Mechanism: `ScheduleApi.recurring` — the purpose-built substrate
 * wrapper at `mud/api/schedule.ts`. NOT bare `setInterval` (skips
 * the Root-frame and attribution-propagation substrate); NOT
 * SchedulerApi (engagement-shaped, wrong fit — see Q13).
 *
 * Cadence comes from the `world.autosave.interval` setting
 * declared above; resolved at install time via `resolveSetting`.
 * Per-Avatar overrides fall out of the standard lookup chain
 * (persistent store → schema default).
 *
 * Options:
 *   - propagateAttribution: false — the periodic save is not
 *     causally a follow-on of the login command. The chain is
 *     severed; callback frames carry no causingCommandId.
 *   - initialDelayMs: default (= intervalMs) — first fire after
 *     one full interval; no double-save at login.
 *   - mode: 'fixed-delay' — drift-tolerant; cadence is "roughly
 *     every N minutes," not a guaranteed wall-clock rate. Prevents
 *     pile-ups if a save runs long.
 *
 * Domain code; TypeScript `private` per CLAUDE.md (not `#` —
 * mixin proxy receiver compatibility).
 */
private periodicSaveHandle: ScheduleHandle | null = null;

public startAutoSave(): void {
  if (this.periodicSaveHandle !== null) return; // idempotent
  // Resolve setting once at install time. Mid-session changes to
  // the setting don't restart the timer in v1 (documented
  // limitation; see plan Q14). The `?? default` belt-and-suspenders
  // covers test fixtures that mock out the schema walk; in
  // production the schema entry above guarantees a non-undefined
  // return.
  const intervalMs =
    resolveSetting<number>(this, 'world.autosave.interval') ??
    5 * 60 * 1000;
  this.periodicSaveHandle = ScheduleApi.recurring(
    intervalMs,
    () => {
      // Fire-and-forget; errors logged but don't crash the session.
      void this.save().catch((err) => {
        console.error(
          `Avatar.autoSave: save failed for playerId=${this.playerId}:`,
          err
        );
      });
    },
    { propagateAttribution: false, mode: 'fixed-delay' }
  );
}

public stopAutoSave(): void {
  if (this.periodicSaveHandle !== null) {
    ScheduleApi.cancel(this.periodicSaveHandle);
    this.periodicSaveHandle = null;
  }
}
```

Modify `onDestruct()` (lines 161-167) to add the linkdead-driven
save and timer cleanup. The order matters: **save BEFORE
stopAutoSave; stop BEFORE the existing cleanup.**

```ts
public onDestruct(): void {
  // Persist-back final snapshot. Fire-and-forget to keep
  // onDestruct synchronous (per Stuff's onDestruct contract). The
  // save() body kicks off a TemplateApi snapshot whose
  // synchronous prefix captures field values + container ref
  // BEFORE the first await (see plan R9 / TemplateApi docstring).
  // The MongoDB write itself is async; missing the write during
  // process shutdown is acceptable for v1 — the periodic backstop
  // covers prior state. Concurrent in-flight save (from the
  // periodic timer) is also fine: both produce valid snapshots
  // and MongoDB resolves last-write-wins.
  void this.save().catch((err) => {
    console.error(
      `Avatar.onDestruct: final save failed for playerId=${this.playerId}:`,
      err
    );
  });

  this.stopAutoSave();
  PlayerApi.unregisterAvatar(this);
  for (const interactive of [...this.interactives]) {
    ConnectionApi.detach(interactive);
  }
}
```

**Critical correctness note for the build agent:** the `void
this.save()` call goes through `TemplateApi.snapshotToTemplate`.
The synchronous-prefix-before-first-await ordering constraint
lives **in TemplateApi**, not on Avatar — see § 3.6's
implementation. The snapshot region (walk persistentFields,
capture values into `snapshot`, read containerPath) runs
synchronously, before `await Template.findByPath`. An
`onDestruct`-driven fire-and-forget save captures pre-cleanup
state even though the MongoDB write itself is async.

Avatar.save() does NOT need to restructure anything — the
two-line shim just delegates. The correctness lives in
`TemplateApi.snapshotToTemplate`'s synchronous prefix.

**File: `packages/server/src/mud/obj/Login.ts`**

Modify the `enter()` body to call `avatar.startAutoSave()` after
`ConnectionApi.transfer(interactive, avatar)` (which is at line
69 today). Insert at the line right after the transfer call:

```ts
// inside enter(), after line 69 (`ConnectionApi.transfer(interactive, avatar);`):
avatar.startAutoSave();
```

(This is the same insertion point regardless of the Wave 5 change to
the starting-location resolution above it.)

**Test file: `packages/server/src/mud/obj/__tests__/Avatar.test.ts`**
(extended further with Wave 7 tests per § 5.7)

---

## 4. Subsystem doc updates (rolled into Wave 7)

Per requirements doc deliverable #18.

- **`docs/subsystems/templates.md`** — confirm every wiring field
  lives in `data:`; if a passage suggests top-level fields, rewrite.
  Add a sentence to the Hydrator-contract section noting that
  `applyContainer` and `applyPopulates` are the two instruction-field
  appliers shipped by this build. Note the per-player Avatar
  template's bidirectional use (template-as-persistence-anchor).
  Document the two new TemplateApi surfaces:
  `TemplateApi.snapshotToTemplate(stuff)` (returns mutated
  Template; caller commits via `tpl.save()`) and
  `TemplateApi.restoreFromTemplate(stuff)` (re-runs the Hydrator
  against a live instance). Call out the
  synchronous-snapshot-before-first-await ordering constraint
  (R9) and the no-coordination contract (concurrent saves
  acceptable; MongoDB last-write-wins).
- **`docs/subsystems/spatial.md`** — under the Containable section,
  add `applyContainer` to the public surface. Document the
  compare-and-move idempotency. Cross-reference to the new
  containment-doc section on `populates:` (which lands in the same
  doc — no new `containment.md` carved out, per planner judgment).
- **`docs/subsystems/connection.md`** — Login.enter live-ref read;
  the new auto-save-on-linkdead-driven-destruct wiring; the periodic
  backstop scheduled via `ScheduleApi.recurring` with the interval
  resolved from `world.autosave.interval` (handle captured on the
  Avatar, cancelled in `onDestruct`); per-Avatar override falls out
  of `resolveSetting`'s standard lookup chain; mid-session setting
  changes don't restart the timer (limitation). The Avatar-template-
  `container:` interaction. Forward-note: when a richer save-trigger
  surface is needed (per-connection-detach vs full linkdead),
  revisit.
- **`docs/subsystems/shell-environment.md`** — schema entries are
  not exclusively mixin-declared; the `world.autosave.interval`
  entry on `class Avatar` is the canonical example of a setting
  whose concept is owned by a substrate class rather than a
  cross-cutting mixin. The schema walk via
  `MixinApi.queryMixins(host.constructor)` picks up class-level
  `static settings` the same way it picks up mixin-level entries.
  Add a one-paragraph note under "Schema-on-mixin" explaining the
  carve-out (consumer-owns-its-concept; promote-when-second-
  consumer-arrives).
- **`docs/subsystems/state-model.md`** — promote Avatar persist-back
  from NYI to v1: persistentFields round-trip via `save()` /
  `restore()`; container derivation; inventory NOT in v1 scope.
- **`docs/subsystems/persistence.md`** — add a brief
  cross-reference to the new `TemplateApi.snapshotToTemplate` /
  `restoreFromTemplate` methods (full documentation lives in
  templates.md; persistence.md notes only that Avatar persist-back
  flows through the existing `Persistable.save()` surface, with
  the snapshot mutation step happening upstream in TemplateApi).
  No new persistence-layer plumbing is introduced — the
  template-doc write path is unchanged.
- **`CLAUDE.md` antipattern table** — add two rows:
  - `(stuff as any).save?.()` → `if (stuff instanceof Avatar) await stuff.save();` — Avatar-specific surface for v1; don't try to call it on arbitrary Stuff.
  - Reading `template.container` from a verb → let `applyContainer` do it; verbs route post-clone.
- **`docs/slates/declarative-content-slate.md`** — out-of-scope for
  this build per requirements doc § 18. Slate retire happens
  separately.

---

## 5. Test specifications

Tests are non-negotiable per acceptance criteria. Each deliverable
that mutates behavior has dedicated tests. The integration test
(deliverable #17) and persist-back tests (deliverable #16) are
called out specifically by the acceptance criteria.

### 5.1 Wave 1 — `Mixins.Populates` constant

No dedicated test file; covered implicitly by Wave 2 (PopulatesMixin
test references `Mixins.Populates`).

### 5.2 Wave 2 — `PopulatesMixin` (`lib/stuff/__tests__/Populates.test.ts`)

Pattern: in-memory Mongo mock (mirrors
`lib/spatial/__tests__/declarativeContent.integration.test.ts:31-61`'s
`installInMemoryStore` helper). Each test seeds a small set of
template docs, then triggers cascade via `StuffApi.singleton`.

**Tests:**

- `it('declares populates as an instruction field')` — verifies
  `MixinApi.getAllInstructionFields(SomeContainerComposingPopulates)`
  includes `'populates'`.
- `it('declares _mixinName = "PopulatesMixin"')` — sanity check on
  marker.
- `it('dispatches to singleton() for singleton-shaped source templates')`
  — seed parent `/test/parent` with `populates: [/test/singleton-child]`;
  child class composes SingletonMixin. Singleton-resolve the parent;
  spy on `StuffApi.singleton` and verify it was called with the
  child's path. Verify child landed in parent.
- `it('dispatches to clone() for non-singleton source templates')` —
  seed parent with `populates: [/test/non-singleton-child]`; child
  does not compose Singleton. Singleton-resolve the parent; spy on
  `StuffApi.clone` and verify it was called with the child's path.
  Verify child landed in parent.
- `it('skips the move for a singleton already placed elsewhere')` —
  seed singleton child with `data.container: /test/elsewhere` (so
  its `applyContainer` places it in `/test/elsewhere`). Parent at
  `/test/parent` declares `populates: [/test/singleton-child]`.
  Singleton-resolve the parent; verify the child is still in
  `/test/elsewhere`, NOT in `/test/parent`.
- `it('always moves non-singletons into the populates parent, even when data.container declared elsewhere')` —
  seed non-singleton child with `data.container: /test/elsewhere`.
  Parent's populates list the child. Verify child ends in
  `/test/parent` (parent wins for non-singletons; see Q7).
- `it('protects against cycles via the existing #inFlightClonePaths guard')` —
  parent A declares `populates: [/test/B]`; B declares
  `populates: [/test/A]`. Both A and B compose SingletonMixin (to
  ensure the cycle goes through `singleton`-path). Trigger
  `singleton('/test/A')`; expect a clear error containing "circular
  template dependency" (per `StuffApi.clone:216-223`).
- `it('handles empty populates array gracefully')` — parent declares
  `populates: []`; cascade completes without throwing or moving
  anything.
- `it('handles malformed entries (non-strings) by skipping them')` —
  parent declares `populates: ['valid/path', null, 42]`. Verify the
  valid one is resolved; the others are silently skipped (no
  throw). This is defensive — bad YAML shouldn't crash hydration.
- `it('idempotent on re-apply (singletons stay; non-singletons re-clone)')` —
  call `host.applyPopulates([singletonPath, nonSingletonPath])`
  twice in sequence. First call places both. Second call:
  singleton's existing-container check skips; non-singleton is
  cloned afresh and moved in. Verify count of children in parent
  (1 singleton + 2 non-singleton clones).

### 5.3 Wave 3 — `applyContainer` + singleton-target validator

**Test file: extend `lib/spatial/__tests__/Containable.test.ts`**

- `it('declares container as an instruction field')` —
  `MixinApi.getAllInstructionFields` for a Containable-composing
  class includes `'container'`.
- `it('places self into the declared container on first hydrate')` —
  seed Containable template with `data.container: /test/target`;
  target template (a singleton Container). Singleton-resolve the
  child; verify `child.getContainer().getTemplatePath() ===
  '/test/target'`.
- `it('no-ops when current container equals declared (compare-and-move)')` —
  pre-place a child in `/test/target`; call `applyContainer('/test/target')`
  again directly; verify no move event fired and container is unchanged.
- `it('moves when current container differs from declared')` —
  pre-place a child in `/test/elsewhere`; call
  `applyContainer('/test/target')`; verify the child is now in
  `/test/target`. (This is the restore() motion.)
- `it('throws when target template does not exist')` —
  `applyContainer('/test/nonexistent')`; expect Template-not-found
  error from `StuffApi.singleton`.
- `it('throws when target is not Container-shaped')` — target
  template is a leaf non-Container; expect the move to fail (the
  type system catches at compile but `applyContainer` should still
  produce a clear runtime error if YAML data went around the type
  check).

**Test file (new): `mud/api/__tests__/template.validateSingletonContainerTarget.test.ts`**

- `it('skips when data.container is absent')` — doc has no
  `data.container`; validator returns without error.
- `it('skips when data.container is non-string')` —
  `data.container: { not: 'a string' }`; validator returns.
- `it('throws when source class is not Containable')` — doc's class
  doesn't compose ContainableMixin (e.g., a folder-zone class);
  expect `TemplateError` naming source path.
- `it('throws when target template does not exist')` —
  `data.container: /nonexistent`; expect TemplateError with both
  source and target paths in the message.
- `it('throws when target class is not Singleton')` — target
  template's class doesn't compose SingletonMixin (e.g., a generic
  multi-instance Item class); expect TemplateError with the target
  class name and "does not compose SingletonMixin" verbiage.
- `it('passes when target is singleton-shaped')` — target class
  composes both Container and Singleton; expect no throw.

### 5.4 Wave 4 — `CloneController` refactor (`obj/command/__tests__/CloneController.test.ts`)

A new test file (none exists today). Patterns follow
`GoController.test.ts` and other controller tests in the same dir.

**Tests:**

- `it('clones a non-Containable template and reports unplaced')` —
  template's class doesn't compose Containable; verb reports
  "not Containable, left unplaced."
- `it('places in --into when explicit override provided')` — clone
  with `model.into` resolving to a Container; verify the cloned
  instance is in `model.into.stuff`.
- `it('places in giver environment with --here')` — clone with
  `model.here = true`; verify in giver's container.
- `it('accepts hydration self-placement when no override given')` —
  template declares `data.container: /test/target`; clone without
  `--into` / `--here`; verify the instance is in `/test/target`;
  verify the verb's success message references "placed by template."
- `it('falls back to giver inventory when no override AND no self-placement')` —
  template has no `data.container`; clone without options; verify
  the instance is in the giver.
- `it('Layer 1 overrides hydration self-placement (--into wins)')` —
  template declares `data.container: /test/foo`; clone with
  `--into /test/bar`; verify the instance ends in `/test/bar`;
  verify the verb's message includes "overrode template's container."
- `it('reports placement-failed when move throws after clone')` —
  mock `ContainmentApi.move` to throw; verify the verb's tell-string
  includes "placement failed" and the cloned stuffId.

### 5.5 Wave 5 — `Login.enter` triad (`obj/__tests__/Login.test.ts`)

Three new tests appended to the existing file:

- `it('uses avatar.getContainer() when the avatar is placed by hydration')` —
  Avatar has a pre-set container (simulating hydration's applyContainer
  having placed it). `enter()` runs; verify `StuffApi.singleton(
  DEFAULT_STARTING_LOCATION_PATH)` was NOT called; verify
  `avatar.teleport` was NOT called; verify the avatar's container
  is the pre-set one.
- `it('falls back to DEFAULT_STARTING_LOCATION_PATH when avatar has no container')` —
  Avatar with `getContainer() === null`. `enter()` runs; verify
  `singleton(DEFAULT_STARTING_LOCATION_PATH)` was called; verify
  `avatar.teleport` was called with the resolved location and
  `{ silent: true }`.
- `it('fallback teleport is silent (no movement narration)')` —
  Avatar has no container; spy on `MessageApi.scene`; verify the
  pre-welcome teleport produced no `world.narration.teleport`
  envelope (only the explicit welcome scene at end of `enter()`
  fires).

Mocks needed: stub `PlayerApi.loadAvatarsForUser` to return a single
avatar (existing tests already do this — extend the existing
`describe('enter')` block); stub `StuffApi.singleton` to return a
test Location; stub `ConnectionApi.transfer` to no-op; stub
`MessageApi.scene().toSelf().send()` to capture.

### 5.6 Wave 6 — TemplateApi snapshot/restore + Avatar shims

Split across two test files: mechanism-level tests on
`template.test.ts`, Avatar-specific tests on `Avatar.test.ts`.

**Test file: extend (or create if absent)
`packages/server/src/mud/api/__tests__/template.test.ts`**

Pattern: install in-memory Mongo (per the spatial
declarativeContent integration test's `installInMemoryStore`
helper) so `Template.findByPath` and `tpl.save()` round-trip
through a mock store. Use a small Stuff fixture — Avatar is fine
(it composes Containable + has persistentFields via Gendered),
but a synthetic Stuff subclass is also acceptable if it reads
cleaner. Build agent picks. New tests join the existing
TemplateApi suite (or open the file fresh if it doesn't exist —
build agent verifies via `ls packages/server/src/mud/api/__tests__/`).

**Tests:**

- `it('snapshotToTemplate() captures persistentFields chain back to the template')` —
  Create a host via `StuffApi.clone` from a seeded template.
  Mutate a persistentField (e.g. Avatar's `pronouns` from
  Gendered); call `const tpl = await
  TemplateApi.snapshotToTemplate(host); await tpl.save();`.
  Re-fetch the template from the in-memory store; verify
  `data.<field> === <mutated value>`.
- `it('snapshotToTemplate() returns the mutated template WITHOUT persisting (caller commits)')` —
  Load-bearing for the separation-of-concerns contract. Snapshot
  a mutated host; do NOT call `tpl.save()`. Re-fetch the
  template from the store via a fresh `findByPath`; verify
  `data.<field>` is STILL the pre-mutation stored value (the
  snapshot mutated the in-memory tpl but didn't commit).
  Verify the returned `tpl.data.<field>` IS the mutated value
  (mutation lives on the returned object).
- `it('snapshotToTemplate() captures the derived container from the live ref')` —
  Host (Containable) in `/test/room-A`. Snapshot; commit;
  re-fetch; verify `data.container === '/test/room-A'`.
- `it('snapshotToTemplate() clears data.container when host is in null container')` —
  Host with `getContainer() === null`. Snapshot; commit;
  re-fetch; verify `data.container` is absent.
- `it('snapshotToTemplate() does not touch data.container when host is not Containable')` —
  Synthetic non-Containable Stuff fixture. Pre-seed
  `data.container: '/junk/path'` in the template. Snapshot;
  commit; re-fetch; verify `data.container === '/junk/path'`
  (untouched).
- `it('snapshotToTemplate() routes through marshaller for marshalled fields')` —
  Host with a marshalled persistentField. Snapshot; verify the
  marshaller's `toStored` was invoked and the result landed in
  the returned template's data.
- `it('snapshotToTemplate() preserves non-persistentFields template-data keys')` —
  Pre-seed `data: { someAuthorAddedKey: 'preserved', ... }`;
  snapshot; verify `data.someAuthorAddedKey === 'preserved'` on
  the returned tpl (the merge keeps unknown keys).
- `it('snapshotToTemplate() throws when host has no templatePath stamp')` —
  Fixture constructed via `new` (not `StuffApi.clone`); expect
  "Stuff has no templatePath stamp" error.
- `it('snapshotToTemplate() throws when the template does not exist')` —
  Delete the template doc before snapshot; expect "no template at
  '...'" error.
- `it('snapshotToTemplate() throws when a marshaller is required but not registered')` —
  Mutate a marshalled field; reset the marshaller registry;
  snapshot; expect "marshaller '...' not registered" error.
- `it('snapshotToTemplate() captures field values synchronously before first await (R9)')` —
  Call `const p = TemplateApi.snapshotToTemplate(host)` (no
  await on the snapshot); immediately mutate a persistentField
  on the host; await `p` to get `tpl`; call `await tpl.save()`;
  re-fetch; verify the saved value is the PRE-mutation value
  (the snapshot ran sync at the top of the method). This test
  is load-bearing for the `onDestruct`-driven-save correctness
  path.
- `it('restoreFromTemplate() re-applies field values from the current template')` —
  Mutate a host's persistentField in-memory; update the template
  doc's `data.<field>` to a different value via the store
  directly; call `await TemplateApi.restoreFromTemplate(host)`;
  verify the field is now the template's value.
- `it('restoreFromTemplate() moves the host via applyContainer when template.data.container differs')` —
  Host in `/test/room-A`; update template's `data.container` to
  `/test/room-B`; restore; verify
  `host.getContainer().getTemplatePath() === '/test/room-B'`.
- `it('restoreFromTemplate() throws when host has no templatePath stamp')` —
  Symmetric to the snapshot throw test.
- `it('restoreFromTemplate() throws when the template does not exist')` —
  Symmetric.

**Test file: extend `packages/server/src/mud/obj/__tests__/Avatar.test.ts`**

A new `describe('persist-back')` block, scoped to Avatar's
contribution (the thin delegation). The mechanism (snapshot/restore
semantics) is covered by the TemplateApi suite above.

**Tests:**

- `it('save() calls TemplateApi.snapshotToTemplate and commits via tpl.save()')` —
  Spy on `TemplateApi.snapshotToTemplate` AND on `Template.prototype.save`
  (or substitute the mock store's save observer); call
  `await avatar.save()`; verify the snapshot spy was called
  once with the avatar instance AND the template's save was
  called once (commit happened).
- `it('restore() delegates to TemplateApi.restoreFromTemplate')` —
  Symmetric.
- `it('across-restart simulation: save → destruct → re-clone preserves saved state')` —
  Avatar-specific integration test. Clone avatar; mutate state;
  call `avatar.save()`; destruct via `StuffApi.destruct`;
  re-clone from same template path; verify the new instance has
  the mutated values (pronouns AND container).

### 5.7 Wave 7 — Auto-save + periodic backstop

Appended to the same `Avatar.test.ts` `describe('persist-back')`
block (or a sibling `describe('auto-save')`).

**Test layer choice.** With `ScheduleApi.recurring` as the
mechanism, tests have two defensible shapes:

1. **Mock ScheduleApi (preferred default for unit tests).** Spy
   on `ScheduleApi.recurring` to capture `(intervalMs, fn, opts)`
   and return a controllable `ScheduleHandle`. Invoke the captured
   `fn` directly to verify save fires. Spy on
   `ScheduleApi.cancel` and assert it is called with the right
   handle on destruct. Drop `vi.useFakeTimers()` — direct callback
   invocation is simpler.
2. **Integration through ScheduleApi (defensible alternative).**
   Use `vi.useFakeTimers()`; let `ScheduleApi.recurring` install
   real timers internally; advance time. Heavier setup but
   exercises the full substrate path.

**Lean:** option 1 for the auto-save suite below (the substrate
mechanics of ScheduleApi are owned by ScheduleApi's own tests, not
Avatar's). The build agent may flip to option 2 for the "logs and
continues on throw" test if option 1 produces a less-readable
sequence.

**Tests:**

- `it('declares world.autosave.interval as a Number setting on Avatar')` —
  inspect `Avatar.settings` directly; verify an entry with key
  `'world.autosave.interval'`, `type: SettingTypes.Number`, and
  `default: 5 * 60 * 1000`. Verify the description string
  mentions "milliseconds" (the unit contract). Pins the schema
  shape so a future drift fails loudly.
- `it('the schema entry surfaces through the EnvironmentMixin lookup chain')` —
  Avatar instance with no override; call
  `resolveSetting<number>(avatar, 'world.autosave.interval')`;
  verify it returns `300_000` (the schema default). Then call
  `avatar.setSetting('world.autosave.interval', 600_000, avatar)`;
  verify the next `resolveSetting` returns `600_000`. Pins the
  per-Avatar override path.
- `it('startAutoSave() resolves world.autosave.interval and passes it to ScheduleApi.recurring')` —
  spy on `ScheduleApi.recurring`; create avatar; pre-set
  `world.autosave.interval` to a test value (e.g.,
  `avatar.setSetting('world.autosave.interval', 120_000, avatar)`);
  call `startAutoSave()`. Verify recurring was called once with
  `(120_000, <fn>, { propagateAttribution: false, mode:
  'fixed-delay' })`. Run a second instance of the test with NO
  pre-set; verify recurring was called with `(300_000, ...)` —
  the schema default. Verify the captured handle is stored on the
  instance (observable indirectly via the idempotency test
  below).
- `it('startAutoSave() is idempotent (does not double-register)')` —
  spy on `ScheduleApi.recurring`; call `startAutoSave()` twice
  in a row; verify recurring was called exactly once.
- `it('the captured callback delegates to save()')` — spy on
  `ScheduleApi.recurring`; capture the `fn` argument; spy on
  `Avatar.prototype.save`; invoke `fn()` directly; verify save
  was called once on the avatar.
- `it('stopAutoSave() cancels the handle via ScheduleApi.cancel')` —
  stub `ScheduleApi.recurring` to return a sentinel handle; spy
  on `ScheduleApi.cancel`; start; stop; verify cancel was called
  with the sentinel handle. After stop, the field is reset to
  null (calling stop again is a no-op).
- `it('onDestruct() fires a final save and cancels the schedule')` —
  spy on `Avatar.prototype.save` AND `ScheduleApi.cancel`; create
  avatar; start auto-save; call `StuffApi.destruct(avatar)`;
  verify save was called at destruct time AND cancel was called
  with the stored handle.
- `it('linkdead-driven destruct fires the final save')` —
  Avatar with a live Interactive; detach the Interactive; verify
  the cleanup cascade reaches `Avatar.onDestruct()` (via
  `Interactive.onDestruct → ConnectionApi.detach`), which fires
  the final save. Pattern: spy on `Avatar.prototype.save`;
  simulate disconnect; verify save was called once before
  destruct completes.
- `it('periodic-save callback logs and stays alive when save throws')` —
  spy on `ScheduleApi.recurring`; capture the `fn`; mock
  `Avatar.prototype.save` to reject; invoke the captured `fn()`;
  await microtasks; verify `console.error` was called and the
  thrown rejection was swallowed by the `.catch()` (the
  recurring substrate would continue firing — `ScheduleApi`'s
  own contract — but the relevant guarantee at this layer is
  that the callback doesn't propagate the rejection).

### 5.8 Integration test (deliverable #17)

**File (new): `packages/server/src/mud/__tests__/integration/spawnSubstrate.integration.test.ts`**

Pattern matches
`lib/spatial/__tests__/declarativeContent.integration.test.ts` —
in-memory Mongo store with `vi.spyOn(PersistenceManager, 'get')`.

**Fixture:**

- Hydrator template at `/lib/persistence/PersistentHydrator`
  (terminates recursion).
- Singleton Container template at `/test/treasury` (composes
  Singleton + Container + Containable).
- Singleton sword template at `/test/sword` with `data.container:
  /test/treasury` (composes Singleton + Containable).
- Non-singleton potion template at `/test/potion` (composes
  Containable but NOT Singleton). No `data.container`.
- Singleton Container template at `/test/library` (Container +
  Singleton + Populates) with `data.populates: [/test/sword,
  /test/potion]`.

**Tests:**

- `it('lazy hydrate of /test/library wires sword and potion correctly')` —
  `StuffApi.singleton('/test/library')`. After resolution:
  - Sword is a singleton; its `applyContainer(/test/treasury)`
    placed it in treasury when the library's `applyPopulates` called
    `singleton(/test/sword)`. Library's existing-container check
    sees sword in treasury → skip. Final: sword in treasury, NOT in
    library.
  - Potion is non-singleton; library's `applyPopulates` calls
    `clone(/test/potion)` → fresh potion. Move into library. Final:
    potion in library.
  - Verify `library.getContents()` is `[potion]` (no sword); verify
    `treasury.getContents()` contains sword.
- `it('clone --template /test/sword (no --into, no --here) lands in treasury via Layer 3')` —
  Mock-execute the CloneController with `model.template =
  '/test/sword'`, no into/here. Verify the cloned sword ended in
  treasury. (This is the only sword globally — singleton.) Verify
  verb's `tell` message includes "placed by template into ..."
- `it('clone --template /test/potion (no --into, no --here) lands in giver inventory via Layer 4')` —
  Similar shape but template is non-singleton potion. Verify the
  cloned potion landed in the giver's inventory (not in library,
  not in treasury).
- `it('populates: cycle (/test/a populates /test/b populates /test/a) trips the cycle guard')` —
  Seed templates A and B with mutual populates. Trigger
  `singleton('/test/a')`. Expect "circular template dependency"
  error.
- `it('container: cycle (/test/x.container=/test/y, /test/y.container=/test/x) trips the cycle guard')` —
  Seed templates X and Y with mutual `data.container` and both as
  singletons. Trigger `singleton('/test/x')`. Expect a circular-
  dependency error through the `applyContainer → singleton →
  applyContainer` recursion.

---

## 6. Member privacy — load-bearing details

Per CLAUDE.md § Member Privacy: domain code defaults to TypeScript
modifiers. Avatar is domain code (`obj/Avatar.ts`).

**Avatar gains NO new `#` slots in this build.** The `#`-slot count
on Avatar is unchanged from the pre-this-build baseline. The
earlier plan iteration proposed a `#saveInFlight` reentry guard,
but that was retired during plan review: each save reads avatar
state atomically (synchronous persistentFields walk completes
before any await yield), so concurrent saves produce valid
full-state snapshots and MongoDB's last-write-wins resolves
ordering. The flag would only have prevented wasted work, not
correctness — not worth the substrate. See Q15.

**TemplateApi has no new `#` slots either.** The two new static
methods are stateless; no caches, no per-call coordination state.
The existing TemplateApi class structure is unchanged.

The `periodicSaveHandle` field on Avatar is a plain `private
periodicSaveHandle: ScheduleHandle | null` (TypeScript modifier
per CLAUDE.md domain-code default — NOT `#`, which would break
under the mixin proxy receiver). `startAutoSave` and `stopAutoSave`
are the inter-Stuff contract surface; the field is host-internal.
No subclass needs to override the schedule lifecycle in a way that
would break invariants; the handle is just bookkeeping for the
`ScheduleApi.cancel` call.

No `resolveClassForTemplate` / `resolveTemplateClass` helper is
introduced anywhere in this build. The class-loading dance lives
on the existing `StuffApi.loadClassByPath` public method
(`api/stuff.ts:932-979`); see Q3 for the resolution.

---

## 7. Risks and mitigations

### R1 — `Avatar.save` inside `onDestruct` is fire-and-forget

`onDestruct` is synchronous per the Stuff lifecycle contract. The
final save runs `void this.save()` — synchronous-up-to-the-first-
await. After the await, MongoDB writes are async; if the process is
shutting down, the write may not complete.

**Mitigation.** The synchronous snapshot at the top of `save()`
captures field values + container path before any await. So even
if MongoDB writes are interrupted, the next-run **periodic** save
will have already flushed prior state. The "lose 0-5 minutes of
state on a hard crash" window is acceptable for v1.

If the build agent finds that a substantial concurrent state-
mutation occurs between the disconnect signal and `onDestruct`
running (unlikely — there's no avatar-state-mutating code between
`ConnectionApi.detach` firing and `Avatar.onDestruct` completing),
the snapshot read might miss the very latest mutation. This is
acceptable for v1.

### R2 — Hydrator re-entry against an existing instance (restore semantics)

`Avatar.restore()` calls `hydrator.hydrate(this, freshData)` on the
live instance. The Hydrator's loop is currently designed for **first-
time** hydration; re-running on a live instance is a new pattern.

**Mitigation.** Audit Phase 1 setters for restore-safety. Most are
field-write-with-validation; safe. The instruction-field appliers
are the gotcha — `applyExits` would refire (adding exits already
present); `applyAttachedHosts` (on Window) would refire similarly.

**For Avatar specifically**, the relevant instruction fields are
exactly `container` (from this build, on Containable). `applyExits`,
`applyAttachedHosts`, `applyPopulates` don't apply to Avatar (Avatar
is Containable + Character, not Exitable + Container + Populates).
So restore is safe for the Avatar-specific case.

**Future risk** (not v1): if `Avatar.restore()` is generalized to a
`Stuff.restore()` for any class, instruction fields with non-
idempotent appliers become a problem. The compare-and-move
shape this build adopts for `applyContainer` is the model — every
applier should be idempotent on re-fire. Build agent: add a forward
note in `docs/subsystems/persistence.md` flagging the constraint.

### R3 — Template doc mutation is a new pattern

Today, the only template-mutation surface is
`Application.createDefaultAvatarTemplate` and the seeder. This build
introduces `Avatar.save()` mutating its own template doc, plus a
possible bulk-mutate pattern if more Stuff types adopt save-back.

**Mitigation.** Document the new pattern in
`docs/subsystems/persistence.md` and `state-model.md`. The template
becomes both "what is" (initial state) AND "what was" (last save
state) for per-player avatar templates. This is a load-bearing
ambiguity; the docs should explicitly call it out: per-player avatar
templates are bidirectional, but other templates (zones, generic
items) are read-only-from-content-author's-perspective.

### R4 — Periodic timer lifecycle and HMR

`ScheduleApi.recurring` produces a `ScheduleHandle` that wraps a
Node `setInterval` / `setTimeout` chain internally. Going through
the substrate wrapper doesn't fundamentally solve the HMR-
composition problem: on hot reload of `Avatar.ts`, the existing
instance keeps its old prototype chain (per
`docs/subsystems/hot-reload.md` "Existing instances keep their old
prototype chain"); HMR-reloading the class doesn't re-fire
`postRegister` for the existing instance in a way that would
re-install the recurring task; the in-memory handle survives the
class swap; the captured callback still references the old
`avatar.save` binding. Field references in the old code still
resolve to the right slot on the live instance because field
identity is by name, but methods are now stale.

**Mitigation.** Track the handle on the instance
(`periodicSaveHandle`) and cancel it on destruct via
`ScheduleApi.cancel`. HMR-reload of the Avatar class does NOT
re-install the timer, but it also does NOT leak: the handle is
captured on the live instance, and destruct cancels it. v1 doesn't
ship HMR for Avatar.ts; this is a forward risk. Document in
`docs/subsystems/connection.md`. The first time an admin reloads
Avatar.ts in production, they should destruct existing avatars
first (`destruct /obj/Avatar/<playerId>`) — which cancels the
recurring task — or accept slightly-stale save behavior until the
next reconnect.

### R5 — Concurrent saves are unsynchronized (in-process and cross-process)

No in-process coordination ships in this build. Concurrent
`Avatar.save()` calls (periodic timer + linkdead-driven destruct
+ manual eval) each run their own snapshot. JS is single-threaded;
each snapshot's synchronous prefix captures a valid full-state
snapshot before yielding to await. MongoDB's `replaceOne` resolves
ordering as last-write-wins. The redundant-work cost (an extra
persistentFields walk + an extra Mongo write at a 5-minute cadence)
is trivially negligible. See Q15 for the resolution rationale.

The cross-process variant is also unsynchronized: if a multi-
process backend topology ever ships (e.g., one Avatar per shard),
two processes could attempt to save the same template doc
simultaneously, again resolved as last-write-wins by MongoDB. The
fix in that world is cross-process locking, which is **not** a
TemplateApi-substrate concern — it would belong at the Avatar /
lifecycle layer or at the Mongo client layer via optimistic
concurrency.

**Mitigation.** Not a v1 concern. Document in `state-model.md` as
a known v1 limitation; design will revisit with the multi-process
topology. The substrate stays stateless either way; coordination
policy (if ever needed) lives at the consumer layer.

### R6 — Template-save validator's class-resolution cost

The new `validateSingletonContainerTarget` runs at every Template
save against the `domain` collection. Each call resolves the
**source** class AND the **target** class via dynamic import. If
the same class wasn't already loaded, this adds latency. For
content-author bulk-save (a seeder run), the cost compounds.

**Mitigation.** Dynamic imports are cached by Node's ESM loader, so
subsequent calls are fast. Cold-path latency is acceptable. If a
content author reports slow seeding, the build agent can add a
per-save class-resolution memo, but v1 ships without.

### R7 — Singleton-target validator vs already-seeded data

If a content author runs the new validator against existing data
that has malformed `container:` references (none exist in production
because content-side authoring is out-of-scope for this build, but
seeds may contain test fixtures), the validator may surface as a
new wave of errors.

**Mitigation.** Run `pnpm test` early in the build cycle. The
in-memory store used by tests won't dispatch through the live
validator unless the test explicitly registers DomainHook. So tests
won't break. For production seeds: there are no `data.container`
declarations today (per requirements doc out-of-scope); the
validator only fires when authors add them in future content
builds.

### R8 — `Avatar.restore` mutates fields under live observation

Per Q16, v1 doesn't coordinate restore with multiplexed sessions.
A player watching their own avatar via a second connection may
observe mid-restore field flips.

**Mitigation.** Document in `connection.md` as a known v1 limitation.
For an admin-only operation this is acceptable. Future builds may
add a `DurativeActivity`-style block.

### R9 — Snapshot capture timing in `TemplateApi.snapshotToTemplate`

The synchronous snapshot at the top of
`TemplateApi.snapshotToTemplate` is critical for the
`onDestruct`-driven save's correctness. A future refactor that
moves the field-value capture AFTER the first `await` would
silently break "snapshot reflects pre-destruct state."

The constraint lives in TemplateApi (substrate), not on
Avatar (the consumer). Avatar's `save()` is a two-line shim and
doesn't know about the ordering — it relies on the substrate
honoring it.

**Mitigation.** Code comment in
`TemplateApi.snapshotToTemplate` explicitly calls out the
ordering constraint. The TemplateApi test suite (§ 5.6) includes
a load-bearing test that verifies a sync-prefix-vs-mutate race:
schedule the snapshot, mutate the host's field, await the
returned tpl, commit; the stored value is the pre-mutation
snapshot. That test pins the contract; refactors that break it
fail the test loudly.

### R10 — `applyContainer`'s target resolution races with destruction

`StuffApi.singleton(path)` inside `applyContainer` clones the target
on first call. If the target was just-destructed mid-cascade
(unlikely but possible in HMR / admin scenarios), the singleton
resolution might race with the destruct cleanup.

**Mitigation.** The `byTemplatePath` index update is atomic with
destruct (see `api/stuff.ts` register/unregister mechanics). The
race window is narrow. v1 doesn't add defensive handling; the
fail-mode is a clear "Template not found" error during cascade,
which the operator can recover from by re-running the seeder /
seed re-clone.

---

## 8. Out of scope (re-stated)

Lifted directly from the requirements doc § Out of scope. The build
agent should refuse adjacent work; flag scope creep back to the user.

- Eternal University YAML seeds / content for Duncan Hall.
- Changes to `DEFAULT_STARTING_LOCATION_PATH`.
- Character-creation hook for new freshman placement.
- Inventory persist-back (only Avatar's own persistentFields chain
  plus derived container).
- Per-field opt-out from persist-back.
- Save-as / named saves / save history.
- Save-back for non-Avatar Stuff (no `PersistableStuff` mixin,
  no generalization).
- `clone` verb redesign or new verb options beyond the existing
  `--into` / `--here` / fallback shape.
- Save / restore as player-facing commands (no `player save` /
  `player restore` verbs).
- Reset / respawn substrate (slate Open Question §10).
- Multi-room / facade targets for `container:` (slate Open
  Question §11).
- Boot-time content ref-resolution CLI.
- Richer `populates:` entry shapes (`{ template, count }`, etc.).
- Zone-template `populates:`.
- In-game runtime editor for content shape.
- Topology / spawn migrations.

And per the requirements doc § Architectural constraints:

- **No top-level addition to the Template doc.** Every wiring field
  lives in `data:`. The Template doc's top level remains
  `path`/`class`/`hydratorClass`/`data`.
- **No new registries.** `Mixins.Populates` is a single constant
  added to the existing `Mixins` constants object.
- **No content YAML.** The bootstrap manifest stays content-free.
- **No new substrate beyond the deliverables listed.** Rejected from
  prior slate iteration and remaining rejected:
  `LoginRoutingRegistry`, per-Avatar `savedLocation` field,
  `WiringSynthesizer`, dep extractor, `BootstrapAction` interface,
  `seedOnlyFields` flag, `initialContents` field, content
  participation in login. Content has no Api class.

---

## 9. Concerns the planner surfaced

Things the planner noticed during code investigation that the
requirements doc didn't anticipate; the build agent should be aware.

### C1 — `setContainer(null)` is policy-gated, but `applyContainer` uses `ContainmentApi.move`

`Containable.setContainer` (`lib/spatial/Containable.ts:128-141`) is
`@CallSecurity(FromContainmentApi)` and `@Final` and `@Unshadowable`
— it's reachable ONLY from inside `ContainmentApi.move`. The new
`applyContainer` calls `ContainmentApi.move(this, target)`, which is
the right path; no security violation. **No build action needed**
beyond honoring the existing rule.

### C2 — `applyContainer` runs *during* the Containable's own hydration

When `applyContainer` is called as part of Phase 2, the Containable's
own hydrate is mid-flight. The instance is registered (so other code
can find it via `singleton`) but its own subsequent setters may
mutate state after `applyContainer` runs. The slate's Q7 ordering
relies on this — `applyContainer` lands the instance somewhere, then
other appliers run.

The order of Phase 2 instruction-field dispatch is determined by
`MixinApi.getAllInstructionFields`, which walks the prototype chain
**concrete-class-first**. For Avatar, the chain order is
roughly Avatar → PostRegistrationMixin → HasInteractiveMixin →
ShelledCharacter → ... → ContainableMixin → ContainerMixin → ... →
Stuff. The instruction-field arrays are concatenated in walk order,
so `ContainableMixin.instructionFields` comes near the END of the
list (because Containable is deep in the chain).

If a class composes both `ContainableMixin` AND `PopulatesMixin`
(theoretically possible — a Stuff that both lives inside something
AND contains things), the order of `container` vs `populates` in the
combined instruction-field list depends on which mixin is more
concrete in the composition.

**Impact for this build:** Avatar doesn't compose `PopulatesMixin`,
so the order question doesn't bite. Build agent: add a test in
§ 5.2 that documents the order for any class composing both
(prefer: `container` runs first because Containable is usually a
deeper base; then `populates` runs second; net order: self-place
first, then populate children).

### C3 — `PostRegistrationMixin` on Avatar

Avatar composes `PostRegistrationMixin` (`obj/Avatar.ts:37`). Its
`postRegister(context)` at line 109 stamps `user` and `playerId`
runtime fields. This fires AFTER hydration Phase 1 + Phase 2,
i.e., AFTER `applyContainer` (if `data.container` was declared).

**Implication for Wave 5:** the existing `Login.enter` reads
`avatar.getContainer()`. By the time `enter()` runs, hydrate has
completed; if `data.container` was declared, the avatar IS in that
container. Good — no special case needed.

**Implication for Wave 6:** if `Avatar.save()` is called from
within `postRegister`, the playerId would be stamped but other
runtime state might not be. **Don't call save from postRegister.**
The auto-save timer starts later in `Login.enter` AFTER the avatar
is fully wired; that's the right ordering.

### C4 — `TemplateApi.snapshotToTemplate` merges over existing `data`

When `TemplateApi.snapshotToTemplate` runs
`const tpl = await Template.findByPath(path)`, it fetches the
current persisted state. The `data: { ...tpl.data, ... }` merge
means save preserves template-doc fields not in `persistentFields`
(e.g., a field the content author added that isn't yet reflected
in any mixin's persistentFields declaration). This is the safe
behavior — non-substrate-managed fields survive.

But it also means: **if a content author edits the template doc
directly while a live host is in memory, the next snapshot will
preserve their edits** (for non-persistentFields keys) and
**overwrite their edits** (for persistentFields keys). This is the
v1 trade-off — admin tooling that mutates per-player Avatar
templates should be aware. Applies to any future
TemplateApi.snapshotToTemplate consumer, not just Avatar.

### C5 — Singleton-target validator depends on the target template existing at save time

If a content author saves a Containable template with `data.container:
/X` BEFORE saving the `/X` template (out-of-order authoring), the
validator throws because `/X` doesn't exist yet. The author has to
save in dependency order.

**Impact:** acceptable for v1; the slate's "lazy resolution + cycle
guard" handles run-time order, but template-save validation is
eager. Future build could relax this — defer the singleton-target
check to first-clone-from-template time. v1 ships eager.

### C6 — `restore()` against an in-flight cascade

If `restore()` is called WHILE the avatar's `applyContainer` is
still running (mid-clone cascade), the re-hydrate would run another
Phase 2 in parallel with the first. The `#inFlightClonePaths` guard
catches in-flight CLONES, not in-flight HYDRATES on an already-
registered instance.

**Mitigation:** `restore()` is documented as a developer/admin
operation that should not run during initial Avatar clone. v1 does
NOT add a guard against mid-clone restore — it would over-engineer.
Build agent: add a comment in `Avatar.restore` flagging this.

### C7 — `clone.yaml` already removed `environment` references

The current `clone.yaml` (`mud/cmd/clone.yaml:1-20`) does NOT
reference `environment`. The only references in the codebase are
in `CloneController.ts:13-14, 165-170` and its header docstring.
**Wave 4's "remove environment references in clone.yaml" is a
no-op** — the YAML is already clean. Build agent: spot-check, then
move on.

### C8 — Some persistentFields are populated by `postRegister`, not by hydrator

`Avatar.playerId` and `Avatar.user` are stamped by `postRegister`
from clone context, NOT by hydrator from data. They're NOT in
`persistentFields` (they're runtime-only, per `obj/Avatar.ts:83, 93`).
`save()`'s iteration over `MixinApi.getAllPersistentFields` won't
include them. Correct — they shouldn't round-trip via the template
data (the template path already encodes the playerId).

**Build agent must not "fix" this by adding `playerId` to
persistentFields.** It would create a self-referential mess
(template path → playerId → template path). The Avatar template's
identity IS the playerId.

### C9 — `Persistable.save()` overwrites the entire doc

`Persistable.toDocument` (`lib/persistence/Persistable.ts:128-161`)
builds a doc from all persistentFields. When `template.save()`
fires, it calls `toDocument` which serializes all of
`Template.persistentFields = ['path', 'class', 'hydratorClass',
'data']`. So the save IS comprehensive — `class`/`hydratorClass`/
`path` are re-set from the in-memory Template object.

This means **the in-memory `tpl` object MUST have correct
class/hydratorClass values** when `tpl.save()` fires. `findByPath`
returns a fully-populated Template (per `Template._materialize` at
`lib/stuff/Template.ts:73-93`); these fields are populated. So
`TemplateApi.snapshotToTemplate`'s `tpl.data = data; return tpl;`
+ the caller's `await tpl.save()` flow is safe. But the build
agent should verify the round-trip in tests (the "across-restart
simulation" test in § 5.6 covers this implicitly).

### C10 — Review-pass log (snapshot/restore, scheduler, interval, class-loader)

The original v1 plan had the snapshot/restore mechanism inlined
into `Avatar.save()` / `Avatar.restore()`. First review pass: the
user pushed back: "Avatar.save() has a lot going on. is this
avatar specific stuff, or logic that applies to any save back. if
it's any save back, it probably doesn't belong in Avatar.ts, it
probably should live somewhere shared. We still need an
Avatar.save() but it should be pretty thin." That carved out a
proposed new `PersistenceApi`.

Second review pass: the user pushed back on the new Api class —
TemplateApi already houses Stuff↔Template directional helpers
(`saveTemplate`, `validateFolderLeafSave`), and the new methods
fit that direction naturally. Per CLAUDE.md § "Module Categories
— DO NOT INVENT NEW ONES" and "No premature registries," the
right home was the existing TemplateApi, not a fresh file. The
proposed `api/persistence.ts` was retired before any code landed.

Two related calls landed in the same review: (a) the snapshot
method returns the mutated Template rather than calling
`tpl.save()` internally — a separation-of-concerns split that
makes the snapshot composable; and (b) the `#saveInFlight`
reentry guard was retired entirely (concurrent saves each
produce a valid full-state snapshot; MongoDB last-write-wins
resolves ordering — see Q15). Together these shrank Avatar's
contribution to two thin shims with no `#` slots.

**Third review pass — periodic-save scheduler choice.** The
original Q13 resolution went `SchedulerApi → rejected (engagement-
shaped) → bare setInterval`. The user pointed out the missed
substrate: `mud/api/schedule.ts` (`ScheduleApi`) is the
purpose-built scheduling wrapper, distinct from the
similarly-named `mud/api/scheduler.ts` (`SchedulerApi`, the
engagement framework). Corrected resolution: `SchedulerApi →
rejected (engagement-shaped) → ScheduleApi.recurring (the right
wrapper)`. The substrate guarantees a Root frame on every fire
and gives a per-call attribution-propagation choice
(`propagateAttribution: false` for periodic save — severs the
chain so saves aren't causally login-attributed). Worth a single
named lesson: scheduling has two Apis, easy to confuse, distinct
shapes. See Q13 for full citations.

**Fourth review pass — periodic-save interval source: setting,
not constant.** Q14 originally landed on
`AVATAR_AUTOSAVE_INTERVAL_MS` in `mud/config/constants.ts`. The
user pushed back during review: the cadence is exactly the kind
of policy players and admins should tune, and the project's
schema-on-mixin setting infrastructure (`EnvironmentMixin`,
`resolveSetting`) handles the per-host override case for free.
The corrected resolution declares `world.autosave.interval` as a
`SettingTypes.Number` schema entry on `class Avatar` (the
consumer that owns the concept), resolves it once at
`startAutoSave()` time via `resolveSetting<number>(this,
'world.autosave.interval')`, and accepts the mid-session-doesn't-
restart limitation as v1-appropriate. The constants file is
unmodified. See Q14 for the full three-pass history and the
class-level-static-settings carve-out (a setting declared on a
substrate class rather than a cross-cutting mixin).

**Fifth review pass — class-loading helper: use the existing
`StuffApi.loadClassByPath`, do not invent a new one.** Q3
originally proposed a `resolveClassForTemplate` private function
inside `lib/stuff/Populates.ts` plus a `resolveTemplateClass`
private function inside `api/template.ts`'s validator file — two
~12-line duplicates of the class-loading dance. The user pushed
back: "that resolveClassForTemplate method may already exist
somewhere... it'd go in templateapi probably." It does already
exist — `StuffApi.loadClassByPath` at `api/stuff.ts:932-979`,
introduced for ZoneApi's `isFolderClass` / `isSpatialZoneClass`
needs and also used by `WriteController`. The corrected
resolution routes the new external consumers (Populates'
applier, the singleton-container-target validator) through the
existing public method — no `TemplateApi.resolveClass` wrapper,
no Populates-internal helper, no validator-file-internal helper.
Net post-build: one public class-loading method on StuffApi with
five external consumers, one inline copy inside
`StuffApi.#cloneInner` (left untouched because its surrounding
ceremony — `#validateClassPath`, `#resolveAbsoluteClassPath`,
`isFrozen` check, `StuffConstructor<T>` typing into the
singleton pre-flight — doesn't collapse to a clean
`loadClassByPath` call without reshaping the public method's
return contract). The cloneInner refactor can land as a
separate sweep once the public method's contract has settled
across the broader consumer set. See Q3 for the full
three-pass history and the StuffApi-refactor-deferred
rationale.

Worth re-evaluating only if a future build pulls the
snapshot/restore mechanism in a direction Avatar wouldn't follow
(e.g., partial saves, delta saves, queued saves). At that
point the substrate-vs-consumer split this build draws is
already in the right place: the substrate carries the mechanism,
the consumer carries the policy. The build agent should NOT
re-litigate the location.

---

## 10. Acceptance criteria recap (from requirements doc § Acceptance criteria)

The build is **done** when:

- [ ] All 18 deliverables ship and pass their tests.
- [ ] `pnpm test`, `pnpm build`, `pnpm lint` all pass.
- [ ] Doc updates land per § 4 above.
- [ ] Integration test (§ 5.8) passes end-to-end.
- [ ] Login.enter test triad (§ 5.5) passes.
- [ ] Avatar persist-back round-trip tests (§§ 5.6, 5.7) pass.
- [ ] `CloneController` no longer references `template.environment` or
  `template.container` by name.
- [ ] `Avatar.save()` / `Avatar.restore()` callable from eval / tests.
- [ ] Auto-save fires during the disconnect/linkdead choreography
  BEFORE Avatar destructs.
- [ ] No new content; no `DEFAULT_STARTING_LOCATION_PATH` change;
  no top-level Template doc field addition; no inventory persist-
  back; no new substrate beyond the deliverable list.
- [ ] The 18 open questions are answered (§ 2) or deliberately
  deferred with stated reason.

---

## 11. Followups enabled (lifted from requirements doc § Followup builds)

For the build agent's situational awareness, NOT for inclusion in
this build:

- Eternal University Phase 1 content authoring (YAML seeds for Duncan
  Hall).
- Character-creation hook for new freshman placement.
- Inventory persist-back (substantial; its own substrate slate).
- Save / restore as player-facing verbs.
- Reset / respawn substrate (slate Open Question §10).
- Multi-room / facade `container:` targets (slate Open Question §11).
- Boot-time content ref-resolution CLI.
- Richer `populates:` entry shapes (`{ template, count }`, etc.).
- Generalized save/restore for non-Avatar Stuff
  (`PersistableStuffMixin`).
- Per-field opt-out / explicit persist-back manifest.

Each is independently shippable; none re-touches stuff, templates,
or connection at the substrate layer.
