# Access — implementation plan

> Graduates [docs/requirements/access-requirements.md](../requirements/access-requirements.md)
> (seeded by [docs/slates/access-slate.md](../slates/access-slate.md)).
> Scope: the **access seam** that `call-security` reserved — three
> orthogonal `AccessApi` predicates (`can` for resource-targeted slice
> walk; `isAuthor` for MQL pre-gates; `isDeveloper` for
> the developer axis); a new **narrow-entry pattern** (`FromController`
> policy sugar + verb-side check); `ownerGroup` as a persistent
> inheritable Zone field with source-path → template-path resolution;
> the `AdminOnly` v1 stub retirement; the deletion of
> `api/mql/permissions.ts`; and three bootstrap-seeded groups
> (`'core'`, `'lounge'`, `'developers'`) with two backing FolderZones
> at `/lib/lounge/` and `/domain/lounge/`.
>
> Read the requirements doc first. It is the closed-scope spec; this
> plan sequences the work it describes and pins down the choices
> requirements deliberately leaves to the build agent.
>
> **Required subsystem reading before starting any step:**
> [call-security.md](../subsystems/call-security.md) (the framework
> being extended — note `FrameKind`, the policy resolver,
> `SecurityPolicy.allows` shape, "why some Api files don't
> self-decorate"); [grouping.md](../subsystems/grouping.md) (`GroupApi`,
> `ManagedGroupProvider`, `Group` Document — find `findByName`'s
> natural shape from the existing provider surface);
> [zone.md](../subsystems/zone.md) (`Zone.lookupAncestorField`, `ZoneApi.getEnclosingZone`);
> [persistence.md](../subsystems/persistence.md) +
> [templates.md](../subsystems/templates.md) (`persistentFields` +
> Hydrator round-trip for the new `ownerGroup` field);
> [messaging.md](../subsystems/messaging.md) +
> [response-envelope.md](../subsystems/response-envelope.md) (Scene
> composer + `controller-rejected` Note shape for the controller
> rejection path); [command-routing.md](../subsystems/command-routing.md)
> (dispatcher and how controllers reject).

## Overview

This build wires three orthogonal access axes onto the existing
substrate. `AccessApi` is a new cross-cutting Api with three public
methods:

- `can(subject, action, resource)` — resource-targeted slice walk via
  `Zone.lookupField('ownerGroup')` + `GroupApi.isMember`. Used for
  content-tree write/read decisions, force-ops, most Author verbs.
- `isAuthor(subject)` — broad "is the actor in any group with
  content scope?". Used for MQL pre-gates where the resource isn't
  known until after resolution.
- `isDeveloper(subject)` — narrow "is the actor in
  `'developers'`?". Used for `eval`, `reload`, and source-tree
  workspace mutation verbs (AND-combined with the slice walk).

The build introduces the **narrow-entry pattern** as engine
substrate (`FromController(...)` policy in
`lib/security/SecurityPolicies.ts`, plus a verb-side `AccessApi.can`
check) and adopts it on the two `forceX` admin entries the v1
`AdminOnly` stub had been gating. It widens `SecurityPolicy.allows`
to optionally async; deletes `api/mql/permissions.ts`; and seeds
three groups at bootstrap: `'core'` (universal fallback owner),
`'lounge'` (content slice owner with FolderZones minted at
`/lib/lounge/` and `/domain/lounge/`), and `'developers'` (developer
axis; no FolderZone stamp anywhere).

A source-path → template-path resolver
(`AccessApi.resolveSourceFolderZone`) makes filesystem-tree workspace
verbs slice-aware: source paths walk against the template tree
most-specific-first to find the closest extant FolderZone. Workspace
mutation verbs in source-tree mode AND-combine `isDeveloper`
with the slice walk; content-tree mode uses slice walk only. The
three content-exposing read verbs (`ls`/`cat`/`grep`) gate via the
slice walk in source/mirror mode; `pwd` and `cd` remain public.

The build is sequenced so the framework substrate (`allows` async,
`FromController`, `Zone.ownerGroup` field, the three `AccessApi`
predicates + the source-path resolver,
`ManagedGroupProvider.findByName`, the three group + two FolderZone
seeds) lands before any consumer flips. Consumer changes (verb
controller gates, `forceX` narrow-entry adoptions, MQL inline
checks) then ride on the live substrate without churn.

## Files affected

### New files

- `packages/server/src/mud/obj/AccessRegistry.ts` — singleton
  Stuff (Idea + `PostRegistrationMixin`) holding all access state
  and behavior: the four predicates (`can`, `canMutateZone`,
  `isAuthor`, `isDeveloper`), the source-path resolver, the
  cached `GroupRef`s for `'core'` / `'lounge'` / `'developers'`,
  the cached developer-playerId `Set`, the developer `onChange`
  cancel handle, and the bootstrap-seeding methods invoked from
  `postRegister`. Same pattern as `GroupRegistry`,
  `SoulCatalogue`, `ChannelCatalogue`.
- `packages/server/src/mud/api/access.ts` — `AccessApi` thin
  facade. One module-scope cached pointer to the
  `AccessRegistry` Stuff (not domain state — just a lookup
  cache); each public method delegates to the Registry.
- `packages/server/src/mud/api/__tests__/access.test.ts` — facade
  tests (delegation, decorator presence, encapsulation gate —
  external Registry-method calls throw).
- `packages/server/src/mud/obj/__tests__/AccessRegistry.test.ts` —
  behavior tests for `can` / `canMutateZone` / `isAuthor` /
  `isDeveloper` / `resolveSourceFolderZone` invoked through the Api
  facade (since direct calls are gate-denied); cache invalidation
  via the developer `onChange`; idempotent re-bootstrap.
- `packages/server/src/mud/lib/security/__tests__/FromController.test.ts`
  — narrow-entry pattern unit + integration tests.
- `packages/server/src/mud/lib/zone/__tests__/Zone.ownerGroup.test.ts`
  — `ownerGroup` setter validation, inheritance walk hit, Hydrator
  round-trip.
- `docs/subsystems/access.md` — new subsystem reference.

### Modified files

**Framework (substrate first):**

- `packages/server/src/mud/lib/security/SecurityPolicies.ts` —
  (a) widen `SecurityPolicy.allows` return type to
  `boolean | Promise<boolean>`; (b) delete the `AdminOnlyPolicy`
  singleton and its registry entry; (c) add and export
  `FromController(...c)` sugar.
- `packages/server/src/mud/api/security.ts` — make `#securityGate`
  await `policy.allows(...)`; make the static-method wrapper in
  `#wrapStaticDescriptor` await it; both branches still throw
  `SecurityError` synchronously on deny but the call into `allows`
  uses `await`.
- `packages/server/src/mud/lib/zone/Zone.ts` — add
  `static persistentFields = ['ownerGroup', 'accessGroups']`, the
  `_ownerGroup?: GroupRef` and `_accessGroups?: GroupRef[]` fields,
  `getOwnerGroup()` / `setOwnerGroup(ref)` (with `parseGroupRef`
  invariant), `getAccessGroups()` / `setAccessGroups(refs)` (with
  per-entry `parseGroupRef` invariant). Update the doc-comment block
  to note both fields as Zone substrate — primary owner (single
  group) plus secondary permitted groups (list).
- `packages/server/src/mud/lib/social/providers/ManagedGroupProvider.ts`
  — add `async findByName(name: string): Promise<Group | null>` using
  the existing `Group.find({ name })` collection helper, returning the
  first match (`name` is unique-indexed) or `null`.

**Consumers (after substrate):**

- `packages/server/src/mud/api/stuff.ts` — replace
  `@CallSecurity(SecurityPolicies.AdminOnly)` on `forceDestruct` with
  `@CallSecurity(FromController(DestructController))`. Add the import.
  Doc-comment updated to describe the narrow-entry shape.
- `packages/server/src/mud/api/containment.ts` — replace
  `@CallSecurity(SecurityPolicies.AdminOnly)` on `forceMove` with
  `@CallSecurity(FromController(TeleportController, GotoController))`.
- `packages/server/src/mud/obj/command/DestructController.ts` — at
  `execute()` entry, detect Zone target: if `model.target.stuff`
  resolved class extends Zone (via `ZoneApi.isFolderClass` /
  `isSpatialZoneClass`), call
  `AccessApi.canMutateZone(giver, model.target.stuff)` for both
  force and non-force branches; deny on fail. Else (non-Zone
  target) call `AccessApi.can(giver, 'destruct', model.target.stuff)`
  (non-force) or `'force-destruct'` (force). Make `execute` `async`.
- `packages/server/src/mud/obj/command/TeleportController.ts` — add
  `AccessApi.can(giver, 'teleport', resource)` gate (force branch
  uses `'force-teleport'`). Make `execute` `async`. Resource is the
  giver in the bare case; `model.target.stuff` when `--target` is set.
- `packages/server/src/mud/obj/command/GotoController.ts` — same shape;
  resource = destination Stuff.
- `packages/server/src/mud/obj/command/SoulController.ts` — add
  `AccessApi.can(giver, 'soul', null)` at `execute()` entry. One gate
  covers all subcommands (`make`/`edit`/`delete`/`show`/`list`); the
  controller's internal dispatch on subcommand stays unchanged. The
  existing docstring's "gated by composition" line is misleading
  (every Avatar has AuthorMixin); remove or rephrase the comment to
  reference the runtime gate this build adds.
- `packages/server/src/mud/obj/command/BroadcastController.ts` — add
  `AccessApi.can(giver, 'broadcast', null)` at `execute()` entry,
  after the existing `requiresVerbalESP` validator path. Update the
  docstring to remove the "v1 ships ungated… The permission gate…
  lands when the access substrate ships" sentence since the gate
  has now landed.
- `packages/server/src/mud/obj/command/EvalController.ts` —
  `AccessApi.isDeveloper(giver)` at entry. No slice walk
  (eval is TS execution; resource scoping is meaningless).
- `packages/server/src/mud/obj/command/CloneController.ts` —
  `AccessApi.can(giver, 'clone', sourceTemplate)` at entry; resource
  resolved via `TemplateApi.findByPath` against the source path.
- `packages/server/src/mud/obj/command/ReloadController.ts` —
  `AccessApi.isDeveloper(giver)` at entry. Same rationale as
  Eval.
- `packages/server/src/mud/obj/command/WriteController.ts` — at entry,
  branch per `pickWorkspaceTree(giver)`:
  - `'content'`:
    - Resolve `target = TemplateApi.findByPath(model.path)` ??
      `findByPath(parentOf(model.path))` ?? `null`.
    - If `target` is a Zone Template (class extends Zone via
      `ZoneApi.isFolderClass` / `isSpatialZoneClass`): call
      `AccessApi.canMutateZone(giver, target)`. Deny on fail.
    - Else: call `AccessApi.can(giver, 'write', target)`. Deny on
      fail.
  - `'source'` → first check `AccessApi.isDeveloper(giver)`;
    deny on fail. Then resolve source zone via
    `AccessApi.resolveSourceFolderZone(model.path)` ??
    `resolveSourceFolderZone(parentOf(model.path))` ?? `null`,
    and check `AccessApi.can(giver, 'write', resource)`. Deny on
    fail. Both must pass.
  - `'mirror'` → source-tree check (TS + slice walk on source-zone)
    AND content-tree check (Zone-target detection routing to
    `canMutateZone` or `can`). All must pass.
- `packages/server/src/mud/obj/command/MkdirController.ts` — same
  shape as Write but the target doesn't yet exist; resolution
  uses `parentOf(model.path)`. In this build mkdir is treated as
  creation-under-parent (flat `can(giver, 'mkdir', parent)`)
  rather than zone-mutation — sub-zone creation is a member-level
  op until consumers demand tighter gating.
- `packages/server/src/mud/obj/command/RmController.ts` — same
  Zone-target detection as Write. Content-tree:
  `target = findByPath(model.path)`; if target is a Zone Template,
  call `canMutateZone(giver, target)`; else call
  `can(giver, 'rm', target)`. Source-tree: `isDeveloper(giver)`
  AND `can(giver, 'rm', resolveSourceFolderZone(model.path))`.
- `packages/server/src/mud/obj/command/CpController.ts` — **two
  checks per call**: source endpoint (always a slice-walked READ;
  no TS check on reads even in source mode; resolve per tree mode)
  + dest endpoint (per-tree write rules from `Write` above). Mirror
  dest: both source-side AND content-side dest checks fire (the
  source-side dest fires the TS check + slice walk; the content-side
  dest fires slice walk only). All checks must pass.
- `packages/server/src/mud/obj/command/MvController.ts` — same
  two-check shape as `cp`. Note: `mv` REMOVES the source after
  write, so a source-tree `mv` source endpoint is effectively an
  rm-and-write — the SOURCE-side endpoint must pass TS + slice
  (write rules) too, not just read rules. Implement by treating
  the source endpoint as a write check when the operation is `mv`
  rather than `cp`.
- `packages/server/src/mud/obj/command/LsController.ts` — at entry,
  if `pickWorkspaceTree(giver)` is `'source'` or `'mirror'`, resolve
  `resource = AccessApi.resolveSourceFolderZone(model.path) ?? null`
  and run `AccessApi.can(giver, 'read', resource)`. Content-tree mode
  skips the check.
- `packages/server/src/mud/obj/command/CatController.ts` — same
  shape; resolve against `model.path`.
- `packages/server/src/mud/obj/command/GrepController.ts` — same
  shape; resolve against `model.path` (the search root).
- `packages/server/src/mud/obj/command/PwdController.ts` and
  `CdController.ts` — **no change**. Public in all tree modes (state
  queries on the actor, not file reads).

**MQL — `permissions.ts` retires:**

- `packages/server/src/mud/api/mql/types.ts` — add the relocated
  `MqlPermissionError` class (verbatim move; preserves
  `operator`/`tier` fields). Add an optional
  `permission?: { authoring: boolean; admin: boolean; coreMemberIds?: ReadonlySet<string> }`
  field on `MqlContext`. The resolve sites consult it
  synchronously.
- `packages/server/src/mud/api/mql/resolver.ts` — drop the
  `checkTier` and `MqlPermissionError` imports from `./permissions`;
  import `MqlPermissionError` from `./types` and re-export it;
  replace every `checkTier(tier, op, giver)` call with the inline
  check shape (see **Async/sync MQL bridge** below).
- `packages/server/src/mud/api/mql/predicates.ts` — replace
  `isAdmin`'s `_MqlAdminFlag.granter(...)` call with a sync per-target
  check against `ctx.permission?.coreMemberIds` (precomputed at
  dispatch time).
- `packages/server/src/mud/api/mql/permissions.ts` — **delete file.**
- `packages/server/src/mud/api/mql-subscription.ts` — update import
  path from `./mql/permissions` to `./mql/types`.
- `packages/server/src/mud/api/command.ts` — in the existing
  async `preloadValidatorDeps` phase (already runs before sync
  `resolveAndValidate`), add a small preflight that computes
  `{ authoring, admin, coreMemberIds? }` via `AccessApi.can` +
  `GroupApi.membersOf('managed:<core>')` (when admin) and stamps it
  on the `MqlContext` the dispatcher subsequently passes to
  `MqlApi.resolveOne`/`resolveMany`.
- `packages/server/src/mud/api/mql/online-wire.ts`,
  `lib/social/providers/MqlGroupProvider.ts`, `lib/social/EmoteGrammar.ts`
  and any other `MqlApi.resolveOne`/`resolveMany` consumers that build
  an `MqlContext` directly (not via the dispatcher): by the new
  "absent snapshot → allow" rule, these continue to work unchanged.
  Verify via grep that none depend on the deny side firing for
  programmatic-internal calls.

**Bootstrap:**

- `packages/server/src/backend/AppBootstrap.ts` — after
  `BootstrapManager.run()` returns (which has just fired
  `GroupRegistry.postRegister`), clone the AccessRegistry:
  `await StuffApi.clone('/obj/AccessRegistry')`. The Registry's
  `postRegister` runs the idempotent seeding. See Step 6.

**Tests — extend existing files:**

- `packages/server/src/mud/lib/security/__tests__/SecurityPolicies.test.ts`
  — delete the `AdminOnly` describe block (currently asserts
  always-deny). Add awaits in the few places that call
  `policy.allows(...)` directly if any rely on the sync return value.
- `packages/server/src/mud/api/__tests__/witness.test.ts` — replace
  the `forceDestruct` rejection assertion ("AdminOnly stub denies")
  with the new narrow-entry behavior. The witness still fires; the
  call is rejected when from a non-DestructController module.
- `packages/server/src/mud/api/__tests__/stuff.cleanup.test.ts` — same:
  the test that asserts `forceDestruct rejects (AdminOnly stub)`
  becomes `forceDestruct rejects from outside DestructController`.
- `packages/server/src/mud/api/__tests__/mql.test.ts` and
  `mql-subscription.one-shot.test.ts` — replace every
  `_MqlAdminFlag.granter = () => true` with the test helper that
  seeds `'core'` membership via `GroupApi.registry().then(r => r.managed().<addMember>)`;
  see **Test seam migration** (Step 10). Update import for
  `MqlPermissionError`.
- `packages/server/src/mud/obj/command/__tests__/CloneController.test.ts`
  and `TeleportController.test.ts` — extend with the new access-gate
  cases per the acceptance criteria.

**Documentation:**

- `docs/subsystems/access.md` — new (see **Documentation
  deliverables** below).
- `docs/subsystems/call-security.md` — edit: drop the `AdminOnly` row
  from the policy table and the `AdminOnly`/force-bypass section;
  document `FromController` as the narrow-entry pattern's policy half;
  add a note that `SecurityPolicy.allows` is now
  `boolean | Promise<boolean>`; cross-link `access.md`.
- `docs/subsystems/zone.md` — document the `ownerGroup` field and its
  inheritance behavior in the "Field inheritance" section. Note that
  the field is a Zone substrate hook for access, not a Zone-internal
  concept.
- `docs/subsystems/grouping.md` — document
  `ManagedGroupProvider.findByName` in the managed-provider section.
- `docs/architecture.md` — add an `access.md` link in the layer-list.
- `CLAUDE.md` — add entries to the "Go through the API layer"
  table for the four `AccessApi` methods (`can`, `canMutateZone`,
  `isAuthor`, `isDeveloper`). Verb code that needs an access check
  uses `AccessApi`, never `GroupApi.isMember` directly for staff
  checks. Also note the encapsulation convention: never call
  `AccessRegistry` methods directly even though the Stuff is
  findable — the FromModule decorator denies it, but the
  convention should be documented too.

### Deleted files

- `packages/server/src/mud/api/mql/permissions.ts`

## Implementation steps

Each step lands as a coherent commit. Steps are sequenced so prereqs
are satisfied before the next step starts.

### Step 1 — Async `SecurityPolicy.allows`

**What.** Widen the contract; update the two await sites.

**Files.**
- `lib/security/SecurityPolicies.ts` — change the `allows` return
  type on `SecurityPolicy` to `boolean | Promise<boolean>`.
- `api/security.ts` — in `#securityGate`, change
  `if (!policy.allows(caller, ctx.proxy, ctx.prop))` to
  `if (!(await policy.allows(caller, ctx.proxy, ctx.prop)))`. The
  function must become `async`; the proxy interceptor signature
  already permits returning a `Promise<unknown>` (no change to
  `Interceptor` type needed — existing methods returning unknown
  are awaitable downstream).
- `api/security.ts` — in `#wrapStaticDescriptor`'s inner
  `wrapped(...)`, change
  `if (!policy.allows(caller, cls, methodName))` to
  `if (!(await policy.allows(caller, cls, methodName)))`. The
  wrapper itself must become `async`. Existing callers of static
  Api methods that don't already await get a `Promise<...>` back
  from the wrapper. **Verification:** every static Api call site in
  the codebase is either already `await`-ed (most Api calls are
  async today) or its result isn't observed; the wrapper change
  shouldn't break existing semantics for those sites. Run the test
  suite to confirm. If a sync caller depends on the original sync
  return (one that consumes the value without awaiting), the test
  will fail; fix by adding `await`.

**Test.** Run the full security test suite. No new tests at this
step — every existing policy returns sync `boolean` and continues to
work because `await sync` resolves identically. The new awaits
exercise the async path.

**Caveat for the build agent:** the static-method wrapper change is
the riskier of the two awaits because the wrapper has been sync until
now. Audit the codebase for `XApi.someMethod()` call sites that don't
`await` and rely on the synchronous return value. Most Api methods
are already async (the test suite confirms behavior). If a sync caller
is identified that genuinely can't await, surface as an open
question — but every Api method we've inspected returns either
`void`, `Promise<T>`, or a thenable, so the migration should be
free.

### Step 2 — `FromController` policy

**What.** Add `FromController` sugar in `SecurityPolicies.ts`. No
new policy *class* — it composes existing primitives.

**Files.**
- `lib/security/SecurityPolicies.ts`:
  ```ts
  type ControllerClass = abstract new (...args: any[]) => unknown;

  export function FromController(
    ...controllers: ControllerClass[]
  ): SecurityPolicy {
    if (controllers.length === 0) {
      throw new Error('FromController: at least one controller required');
    }
    if (controllers.length === 1) {
      const id = ModuleApi.lookup(controllers[0] as object);
      if (!id) {
        // Fail-closed at policy-build time isn't right; the loader
        // hasn't stamped the class yet if FromController is called
        // at decorator-evaluation time. Build a policy that resolves
        // the id lazily, fail-closed if still unstamped at allows-time.
        return lazyFromModulePolicy(controllers[0]);
      }
      return FromModule(id);
    }
    return AnyOf(...controllers.map((c) => {
      const id = ModuleApi.lookup(c as object);
      return id ? FromModule(id) : lazyFromModulePolicy(c);
    }));
  }

  function lazyFromModulePolicy(cls: ControllerClass): SecurityPolicy {
    return {
      name: `FromController(<pending>)`,
      allows(caller, target, method) {
        const id = ModuleApi.lookup(cls as object);
        if (!id) return false;            // fail-closed
        return FromModule(id).allows(caller, target, method);
      },
    };
  }
  ```
  Add to the `SecurityPolicies` namespace object so callers can use
  either `FromController(...)` (named export) or
  `SecurityPolicies.FromController(...)` — both shapes are used
  elsewhere in the codebase.

- `lib/security/__tests__/FromController.test.ts` (new):
  - Single-controller form: a method decorated with
    `@CallSecurity(FromController(FooController))` rejects calls from
    outside FooController's module and allows calls from inside.
  - Multi-controller form: rejects from non-listed, allows from any
    listed. Use the existing `FromModule.test.ts` test scaffolding as
    reference (it sets up identity stamping for test classes).

**Test.** New test file passes. Existing FromModule tests unchanged.

### Step 3 — `Zone.ownerGroup` field

**What.** Add the persistent, inheritable field with a setter
invariant.

**Files.**
- `lib/zone/Zone.ts`:
  - Import `GroupRef, parseGroupRef` from `../social/GroupProvider`.
  - Add `static persistentFields = ['ownerGroup'];` (Zone has no
    inherited persistent fields today).
  - Add `protected _ownerGroup?: GroupRef;`
  - Add `getOwnerGroup(): GroupRef | undefined { return this._ownerGroup; }`
  - Add
    ```ts
    setOwnerGroup(ref: GroupRef | undefined): void {
      if (ref === undefined) {
        this._ownerGroup = undefined;
        return;
      }
      parseGroupRef(ref);  // throws on malformed; per-field invariant
      this._ownerGroup = ref;
    }
    ```
  - The setter is the per-field invariant per the CLAUDE.md rule
    ("Per-field invariants on setters"). `parseGroupRef` already
    throws on malformed shape (no colon).
  - The Hydrator's two-phase dispatch picks up `setOwnerGroup`
    automatically (Phase 1 prefers `set<Field>`).
  - The field reads through `lookupAncestorField('ownerGroup')` via
    `readField`'s `getOwnerGroup()` accessor lookup, so the existing
    inheritance walk works unchanged.

**Test.** `lib/zone/__tests__/Zone.ownerGroup.test.ts`:
- Setter throws on `'malformed-no-colon'`.
- Setter accepts `'managed:abc123'`.
- `lookupAncestorField('ownerGroup')` walks up to the nearest stamped
  ancestor. Use a 3-zone chain (`/root → /mid → /leaf`); stamp on
  `/root`; read from `/leaf` → returns root's ref.
- Hydrator round-trip: build a Template doc with
  `data: { ownerGroup: 'managed:xyz' }`, clone, assert
  `getOwnerGroup()` returns it; then re-snapshot via
  `TemplateApi.snapshotToTemplate` (or use the existing
  `Zone.lookupField.test.ts` pattern) and assert the saved doc's
  `data.ownerGroup` matches.

### Step 4 — `ManagedGroupProvider.findByName`

**What.** Add the by-name lookup helper that bootstrap + `AccessApi`
will use.

**Files.**
- `lib/social/providers/ManagedGroupProvider.ts`:
  ```ts
  async findByName(name: string): Promise<Group | null> {
    const all = await Group.find({ name });
    return all[0] ?? null;
  }
  ```
  `name` is unique-indexed (see `PersistenceManager.ts` index
  declarations), so the array is 0-or-1 entries.

**Test.** Add to an existing managed-provider test file (or a new
small one if none exists for the provider itself). Two cases:
- `findByName('nonexistent')` → `null`.
- After creating a Group via `Group.save`, `findByName(group.name)`
  returns it.

### Step 5 — `AccessRegistry` Stuff + `AccessApi` facade

**What.** New singleton Stuff (`AccessRegistry`) holding all access
state and behavior, plus a thin `AccessApi` facade. Same pattern as
`GroupRegistry` / `SoulCatalogue` / `ChannelCatalogue`: state lives
on the Stuff (instance fields), the Api is a delegating call surface
with one cached pointer to the Stuff (a lookup convenience, not
domain state).

The four public predicates (`can`, `canMutateZone`, `isAuthor`,
`isDeveloper`), the internal source-path resolver, the cached
`GroupRef`s, the developer-playerId `Set`, and the bootstrap-seeding
methods all live on `AccessRegistry` as instance state. The
Registry's `postRegister` invokes the seeding methods, which makes
bootstrap a single clone of `/obj/AccessRegistry` (Step 6).

**Files.**
- `obj/AccessRegistry.ts` (new) — singleton Stuff holding all
  access state and behavior. See sketch below.
- `api/access.ts` (new) — thin facade. See sketch below.

#### `obj/AccessRegistry.ts` sketch

```ts
import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/mixin/PostRegistration';
import { GroupApi } from '../api/group';
import { ZoneApi } from '../api/zone';
import { TemplateApi } from '../api/template';
import type { Stuff } from '../lib/stuff/Stuff';
import type { GroupRef } from '../lib/social/GroupProvider';

export class AccessRegistry extends PostRegistrationMixin(Idea) {
  // Instance state. NOT static — lives on the singleton Stuff and
  // survives across api/access.ts reloads (the Registry's own
  // class file is where HMR-with-state hits; that's the tradeoff
  // documented in the requirements).
  private cachedCoreRef: GroupRef | null = null;
  private cachedLoungeRef: GroupRef | null = null;
  private cachedDevelopersRef: GroupRef | null = null;
  private cachedAuthorGroups: readonly GroupRef[] | null = null;
  private cachedDeveloperPlayerIds: ReadonlySet<string> | null = null;
  private developerCacheCancel: (() => void) | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    // Idempotent seeding. Ordering: core first (universal fallback);
    // lounge second (mints scoped FolderZones); developers last
    // (no FolderZone, just the group).
    await this.seedCoreGroup();
    await this.seedLoungeSlice();
    await this.seedDevelopersGroup();
    // Caches warm lazily on first read.
  }

  @CallSecurity(FromModule('mud/api/access#AccessApi'))
  public async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null,
  ): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    // Walk the zone tree, collecting closest ownerGroup +
    // every accessGroups entry up to root.
    const permittedGroups: GroupRef[] = [];
    let zone = (resource as Stuff & { getZone?: () => Stuff | null })
      ?.getZone?.() ?? null;
    while (zone !== null) {
      const owner = (zone as unknown as { getOwnerGroup?: () => GroupRef | undefined })
        .getOwnerGroup?.();
      if (owner) permittedGroups.push(owner);
      const access = (zone as unknown as { getAccessGroups?: () => readonly GroupRef[] | undefined })
        .getAccessGroups?.();
      if (access) permittedGroups.push(...access);
      zone = await ZoneApi.getEnclosingZone(zone);
    }
    if (permittedGroups.length === 0) {
      const coreRef = this.cachedCoreRef ?? (await this.resolveCoreRef());
      if (coreRef) permittedGroups.push(coreRef);
    }
    for (const ref of permittedGroups) {
      if (await GroupApi.isMember(playerId, ref)) return true;
    }
    return false;
  }

  @CallSecurity(FromModule('mud/api/access#AccessApi'))
  public async canMutateZone(subject: Stuff | null, zone: Stuff): Promise<boolean> {
    if (subject === null) return false;
    const playerId = this.playerIdOf(subject);
    if (playerId === null) return false;
    // Find the closest ownerGroup starting from zone itself.
    let z: Stuff | null = zone;
    let primary: GroupRef | undefined;
    while (z !== null && !primary) {
      primary = (z as unknown as { getOwnerGroup?: () => GroupRef | undefined })
        .getOwnerGroup?.();
      if (!primary) z = await ZoneApi.getEnclosingZone(z);
    }
    primary ??= this.cachedCoreRef ?? (await this.resolveCoreRef()) ?? undefined;
    if (!primary) return false;
    const role = await GroupApi.roleOf(playerId, primary);
    return role === 'owner';
  }

  @CallSecurity(FromModule('mud/api/access#AccessApi'))
  public async isAuthor(actor: Stuff | null): Promise<boolean> {
    if (actor === null) return false;
    const playerId = this.playerIdOf(actor);
    if (playerId === null) return false;
    const groups = this.cachedAuthorGroups
      ?? (await this.resolveAuthorGroups());
    for (const ref of groups) {
      if (await GroupApi.isMember(playerId, ref)) return true;
    }
    return false;
  }

  @CallSecurity(FromModule('mud/api/access#AccessApi'))
  public async isDeveloper(actor: Stuff | null): Promise<boolean> {
    if (actor === null) return false;
    const playerId = this.playerIdOf(actor);
    if (playerId === null) return false;
    const cache = this.cachedDeveloperPlayerIds
      ?? (await this.warmDeveloperCache());
    return cache.has(playerId);
  }

  @CallSecurity(FromModule('mud/api/access#AccessApi'))
  public async resolveSourceFolderZone(sourcePath: string): Promise<Stuff | null> {
    // Walks the source path most-specific-first against the
    // template tree, returning the closest extant FolderZone Stuff
    // (or null if no match). See requirements doc § "Workspace
    // controllers — slice-aware via source-path resolution."
    let candidate = '/' + sourcePath.replace(/^\.\//, '').replace(/\/+$/, '');
    while (candidate !== '/' && candidate.length > 0) {
      const tpl = await TemplateApi.findByPath(candidate);
      if (tpl) {
        const cloned = await StuffApi.findByTemplatePath(candidate);
        if (cloned && cloned instanceof FolderZone) return cloned;
      }
      const lastSlash = candidate.lastIndexOf('/');
      candidate = candidate.slice(0, lastSlash) || '/';
    }
    return null;
  }

  // ── Private helpers ──

  private playerIdOf(subject: Stuff): string | null {
    const maybeAvatar = subject as Stuff & { getPlayerId?: () => string };
    if (typeof maybeAvatar.getPlayerId === 'function') {
      const id = maybeAvatar.getPlayerId();
      return id && id.length > 0 ? id : null;
    }
    return null;
  }

  private async resolveCoreRef(): Promise<GroupRef | null> {
    const reg = await GroupApi.registry();
    const core = await reg.managed().findByName('core');
    if (!core) return null;
    const ref: GroupRef = `managed:${core._id!}`;
    this.cachedCoreRef = ref;
    return ref;
  }

  private async resolveAuthorGroups(): Promise<readonly GroupRef[]> {
    const refs = new Set<GroupRef>();
    const allTemplates = await TemplateApi.findByPaths('/**');
    for (const t of allTemplates) {
      const isZone = (await ZoneApi.isFolderClass(t.class))
        || (await ZoneApi.isSpatialZoneClass(t.class));
      if (!isZone) continue;
      const owner = t.data?.ownerGroup as GroupRef | undefined;
      if (owner) refs.add(owner);
      const access = t.data?.accessGroups as readonly GroupRef[] | undefined;
      if (access) for (const ref of access) refs.add(ref);
    }
    const coreRef = this.cachedCoreRef ?? (await this.resolveCoreRef());
    if (coreRef) refs.add(coreRef);
    const list = Array.from(refs);
    this.cachedAuthorGroups = list;
    return list;
  }

  private async warmDeveloperCache(): Promise<ReadonlySet<string>> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const dev = await provider.findByName('developers');
    if (!dev) {
      this.cachedDeveloperPlayerIds = new Set();
      return this.cachedDeveloperPlayerIds;
    }
    this.cachedDevelopersRef = `managed:${dev._id!}`;
    const cache = new Set(dev.memberIds);
    this.cachedDeveloperPlayerIds = cache;
    this.developerCacheCancel?.();
    const handle = provider.onChange?.(dev._id!, () => {
      this.cachedDeveloperPlayerIds = null;
    });
    this.developerCacheCancel = handle?.cancel ?? null;
    return cache;
  }

  // ── Seeding (idempotent, called from postRegister) ──

  private async seedCoreGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const existing = await provider.findByName('core');
    if (existing) {
      this.cachedCoreRef = `managed:${existing._id!}`;
      return;
    }
    const { Group } = await import('../lib/social/Group');
    const g = new Group();
    g.name = 'core';
    g.owner = 'system';
    await g.save();
    this.cachedCoreRef = `managed:${g._id!}`;
  }

  private async seedLoungeSlice(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let lounge = await provider.findByName('lounge');
    if (!lounge) {
      const { Group } = await import('../lib/social/Group');
      const g = new Group();
      g.name = 'lounge';
      g.owner = 'system';
      await g.save();
      lounge = g;
    }
    const loungeRef: GroupRef = `managed:${lounge._id!}`;
    this.cachedLoungeRef = loungeRef;
    for (const path of ['/lib/lounge', '/domain/lounge']) {
      const existing = await TemplateApi.findByPath(path);
      if (existing) {
        if (!existing.data?.ownerGroup) {
          existing.data = { ...existing.data, ownerGroup: loungeRef };
          await TemplateApi.saveTemplate(existing);
        }
        continue;
      }
      await TemplateApi.saveTemplate({
        path,
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { ownerGroup: loungeRef },
      });
    }
  }

  private async seedDevelopersGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const existing = await provider.findByName('developers');
    if (existing) {
      this.cachedDevelopersRef = `managed:${existing._id!}`;
      return;
    }
    const { Group } = await import('../lib/social/Group');
    const g = new Group();
    g.name = 'developers';
    g.owner = 'system';
    await g.save();
    this.cachedDevelopersRef = `managed:${g._id!}`;
  }
}
```

The Registry is a Stuff, so its methods route through the security
gate like any other Stuff method. The `obj/AccessRegistry` template
document is part of the bootstrap seed set (same pattern as
`/obj/GroupRegistry`).

**Encapsulation contract.** The `@CallSecurity(FromModule('mud/api/access#AccessApi'))`
decorator on every public Registry method enforces that **only
`AccessApi` can invoke them**. External code that grabs the Registry
instance via `StuffApi.findByTemplatePath('/obj/AccessRegistry')`
gets a reference but `SecurityError` thrown on any method call. There
is **no escape hatch** on `AccessApi` exposing the Registry — the
`#registry` pointer is `private` and is never exported, returned, or
surfaced. All access goes through the four `AccessApi` public methods.
Tests work the same way: they call `AccessApi.can(...)` etc., which
delegates through the gate (the Api's caller-frame matches FromModule
allowance), not the Registry directly.

This is the access-side instance of the same narrow-entry pattern
this build introduces for `forceDestruct` / `forceMove`. The Registry's
public method surface is reachable from exactly one module
(`mud/api/access`); the Api is reachable from anywhere but mediates
every call. Combined: state has one home (the Registry Stuff), one
calling surface (the Api), and one structurally-enforced path between
them.

#### `api/access.ts` sketch

```ts
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import type { Stuff } from '../lib/stuff/Stuff';
import type { AccessRegistry } from '../obj/AccessRegistry';

/**
 * AccessApi — thin facade over the AccessRegistry singleton.
 * The Registry holds state and behavior; the Api is the public
 * call surface, delegating each method. The cached pointer below
 * is a lookup convenience (not domain state); it re-resolves on
 * reload.
 */
export class AccessApi {
  static #registry: AccessRegistry | null = null;

  private static async registry(): Promise<AccessRegistry> {
    if (AccessApi.#registry) return AccessApi.#registry;
    const found = await StuffApi.findByTemplatePath<AccessRegistry>(
      '/obj/AccessRegistry',
    );
    if (!found) {
      throw new Error('AccessRegistry not yet cloned by BootstrapManager');
    }
    AccessApi.#registry = found;
    return found;
  }

  public static async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null,
  ): Promise<boolean> {
    return (await AccessApi.registry()).can(subject, action, resource);
  }

  public static async canMutateZone(
    subject: Stuff | null,
    zone: Stuff,
  ): Promise<boolean> {
    return (await AccessApi.registry()).canMutateZone(subject, zone);
  }

  public static async isAuthor(subject: Stuff | null): Promise<boolean> {
    return (await AccessApi.registry()).isAuthor(subject);
  }

  public static async isDeveloper(subject: Stuff | null): Promise<boolean> {
    return (await AccessApi.registry()).isDeveloper(subject);
  }

  public static async resolveSourceFolderZone(sourcePath: string): Promise<Stuff | null> {
    return (await AccessApi.registry()).resolveSourceFolderZone(sourcePath);
  }

  /** HMR reset for the cached pointer. Registry state itself is
   *  unaffected by api/access.ts reloads — it lives on the Stuff. */
  public static _resetRegistryRefForReload(): void {
    AccessApi.#registry = null;
  }
}

SecurityApi.decorateApiClass(AccessApi);
```

**HMR notes:**
- Reload of `api/access.ts` invalidates only the cached pointer
  (`_resetRegistryRefForReload`). State on the Registry is
  unaffected.
- Reload of `obj/AccessRegistry.ts` re-clones the Registry Stuff
  per `HotReloadApi`'s pattern; state resets (the documented
  HMR-with-state tradeoff). On re-clone, `postRegister` runs again
  — the seeding methods are idempotent, so groups + FolderZones
  stay intact; only the runtime caches re-warm on first read.

**Test.** `api/__tests__/access.test.ts` + `obj/__tests__/AccessRegistry.test.ts`:
- `can(null, 'admin', null)` → `false`.
- `can(npcSubject, 'admin', null)` → `false` (NPC has no playerId).
- `can(avatarInCore, 'admin', null)` → `true` after seeding.
- `can(avatarNotInCore, 'admin', null)` → `false`.
- `can(avatar, 'force-destruct', target)` → `true` when target's zone
  walks up to the root and the cached `'core'` fallback fires.
- `can(avatar, 'write', null)` → `true` for an avatar in core (null
  resource → falls back to `'core'`).
- Idempotent bootstrap: clone `/obj/AccessRegistry` twice (or
  equivalently, invoke `postRegister` twice on the running
  Registry instance); only one Group document exists with name
  `'core'` (same for `'lounge'`, `'developers'`); FolderZone stamps
  not overwritten.
- Empty `'core'` denies every call until a member is added.

### Step 6 — Bootstrap wiring

**What.** Mint the AccessRegistry singleton at boot. Its
`postRegister` does all the seeding.

**Files.**
- `backend/AppBootstrap.ts` — after `await BootstrapManager.run()`
  (which has already initialized `GroupRegistry`'s providers via
  its `postRegister`), clone the AccessRegistry:
  ```ts
  await StuffApi.clone('/obj/AccessRegistry');
  ```
  The Registry's `postRegister` runs as part of the clone
  pipeline; it idempotently seeds `'core'`, `'lounge'` (+ the two
  scoped FolderZones), and `'developers'`. Running boot twice is
  a no-op.

- A Template document at `/obj/AccessRegistry` must exist for
  the clone to succeed. Follow the same pattern other singletons
  use (e.g., `GroupRegistry` at `/obj/GroupRegistry`) — the
  template is either author-seeded in a YAML fixture, or
  `BootstrapManager` mints a minimal one with class
  `/obj/AccessRegistry` and the default hydrator. Build agent
  picks whichever mechanism the existing singletons use.

  **Note on the "root zone" question.** Earlier drafts of the
  requirements proposed stamping a "root zone" template at `/`. The
  codebase has no canonical root-zone template — the zone tree has
  multiple top-level zones (`/domain/...`, `/lib/biome/...`,
  `/obj/...`). The `can()` algorithm uses the cached `'core'`
  ref as the universal fallback whenever the zone walk terminates
  without finding an `ownerGroup`, which is what the resolved
  shape ships with. The lounge FolderZones are stamped explicitly
  in the Registry's `seedLoungeSlice`; future scoped slices follow the same
  pattern (mint the Group, mint or stamp the FolderZone). No
  root-zone stamp is needed for correctness.

**Test.** Boot the test harness against a clean DB; assert:
- Groups named `'core'`, `'lounge'`, and `'developers'` exist, each
  with no members.
- A Template at `/lib/lounge` exists with
  `data.ownerGroup = 'managed:<loungeGroupId>'` and class
  `/lib/zone/FolderZone`.
- A Template at `/domain/lounge` exists with the same shape.
- NO Template has `data.ownerGroup` pointing at the developers
  GroupRef (confirms developers is the orthogonal axis with no
  content scope).
- Boot twice → no duplicates, no overwrites of existing
  `ownerGroup` stamps.
- With all three groups empty, every gated path denies.
- After adding a player to `'lounge'` AND `'developers'`, that
  player can `write /lib/lounge/foo` (TS + slice both pass) but
  not `write /lib/security/foo` (slice fails). Adding the same
  player to `'core'` instead of `'lounge'` lets them write
  `/lib/security/foo`.

### Step 7 — `AdminOnly` retirement + narrow-entry on the two `forceX`

**What.** Replace the two `AdminOnly` decorations with `FromController`;
delete `AdminOnly` from the SecurityPolicies registry.

**Files.**
- `api/stuff.ts`:
  - Import `DestructController` from `'../obj/command/DestructController'`
    AND `FromController` from `'../lib/security/SecurityPolicies'`.
  - Change `@CallSecurity(SecurityPolicies.AdminOnly)` on
    `forceDestruct` to `@CallSecurity(FromController(DestructController))`.
  - Update the doc-comment to describe narrow-entry shape.
- `api/containment.ts`:
  - Import `TeleportController`, `GotoController`, and
    `FromController`.
  - Change `@CallSecurity(SecurityPolicies.AdminOnly)` on `forceMove`
    to `@CallSecurity(FromController(TeleportController, GotoController))`.
- `lib/security/SecurityPolicies.ts`:
  - Delete `AdminOnlyPolicy` (the singleton object).
  - Delete `AdminOnly:` from the `SecurityPolicies` namespace object.

**Watch for cycles.** `api/stuff.ts` importing `DestructController`
adds a new edge in the module graph. Verify no cycle by tracing
imports. `DestructController` imports `StuffApi` — that's the
established direction. The reverse (StuffApi importing the
controller) is new and would normally form a cycle. The fix is to
import the controller `type`-only at the top
(`import type { DestructController } from '...'`) and use a
lazy-`@CallSecurity(FromController(DestructController))` shape. **But
decorator arguments are evaluated eagerly at class definition time**,
so a bare `type`-only import isn't enough — the decorator needs the
runtime class value.

**Resolution choice.** `FromController(cls)` already handles
unstamped-at-decorator-eval-time classes via the
`lazyFromModulePolicy` path (step 2). Use a value-import of the
controller class but accept that this creates a static import cycle.
TypeScript handles class hoisting; the cycle works because the
`FromController(...)` policy only consults `ModuleApi.lookup(cls)` at
*call-time*, not at module-eval time. By the time any
`forceDestruct` call fires, both modules have finished evaluating
and the controller class is fully stamped.

If a cycle does break the build, the alternative is the lazy form:
defer the `FromController` decorator application via a separate
`SecurityApi._setMethodPolicy(...)` call at the bottom of the
controller file — but that's a substrate edit. The build agent
should attempt the direct import first and only fall back to the
lazy form if module evaluation actually fails.

**Test.** Existing `stuff.cleanup.test.ts`'s assertion that
`forceDestruct` rejects from outside DestructController stays green
(same denial; different policy name). Add a test that
`forceDestruct` from a synthesized DestructController-module frame
*succeeds* (gate the test through stamping a fake frame whose
caller's module ID matches DestructController's, the test scaffolding
in `FromModule.test.ts` shows the pattern).

### Step 8 — Verb controller access checks

**What.** Wire the access check into the 11 verb controllers per the
requirements.

The pattern is the same at every site:

```ts
async execute(model: Model, context: CommandContext): Promise<void> {
  const giver = context.commandGiver;
  const resource = /* per controller, see table */;
  const action = /* per controller, see table */;
  if (!(await AccessApi.can(giver, action, resource))) {
    MessageApi.scene(giver)
      .topic('system.shell.author')  // or shell.fs for workspace verbs
      .toSelf(Mml.fromMarkup(`\nyou don't have permission to ${action}\n`))
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'access-denied',
      detail: `you don't have permission to ${action}`,
    });
    return;
  }
  // … existing body …
}
```

For `DestructController`, `TeleportController`, `GotoController`,
the check fires at `execute()` entry and applies to **both** force
and non-force branches; the action string is `'force-X'` when
`model.force` is set, `'X'` when not.

**Action / resource matrix:**

The "Check" column shows the full predicate. AND-combined checks
all must pass for the verb to proceed.

| Controller | Check |
|---|---|
| `DestructController` | If target is Zone Template: `canMutateZone(giver, target)` (both branches). Else non-force: `can(giver, 'destruct', target)`; force: `can(giver, 'force-destruct', target)`. |
| `TeleportController` | non-force: `can(giver, 'teleport', model.target.stuff ?? giver)`; force: same with `'force-teleport'` |
| `GotoController` | non-force: `can(giver, 'goto', destination)`; force: same with `'force-goto'` |
| `SoulController` | `can(giver, 'soul', null)` — null falls to `'core'` |
| `BroadcastController` | `can(giver, 'broadcast', null)` — null falls to `'core'` |
| `EvalController` | `isDeveloper(giver)` — no slice (eval is TS execution) |
| `CloneController` | `can(giver, 'clone', sourceTemplate)` — slice walk on source path |
| `ReloadController` | `isDeveloper(giver)` — no slice (reload is TS execution) |
| `WriteController` content | If target is Zone Template: `canMutateZone(giver, target)`. Else: `can(giver, 'write', target)`. |
| `WriteController` source | `isDeveloper(giver)` AND `can(giver, 'write', resolveSourceFolderZone(model.path)` chain`)`. |
| `WriteController` mirror | source-check AND content-check (with content-check applying Zone-target detection). |
| `MkdirController` | Content: `can(giver, 'mkdir', parent)` flat — sub-zone creation is member-level in this build. Source: developer + slice. |
| `RmController` | Content: if target is Zone Template, `canMutateZone(giver, target)`; else `can(giver, 'rm', target)`. Source: developer + slice. |
| `CpController` | per endpoint — source endpoint applies READ rules (no TS check; slice walk only); dest endpoint applies WRITE rules per tree mode |
| `MvController` | per endpoint — source endpoint applies WRITE rules too (because `mv` REMOVES source; TS check fires on source-tree-source); dest endpoint applies WRITE rules |
| `LsController` | source/mirror mode: `can(giver, 'read', resolveSourceFolderZone(model.path) ?? null)` — slice walk; no TS check on reads. Content-tree mode skips. |
| `CatController` | same as `Ls`. |
| `GrepController` | same as `Ls`. |
| `PwdController` / `CdController` | **no access check** in any mode. |

For controllers whose `execute()` is currently sync, change to
`async execute(...): Promise<void>`. The dispatcher already awaits
controller execution; this is invisible at the call site.

For `DestructController`, `TeleportController`, `GotoController` —
the access check is the **only** entry point in this build that decides
authority. The narrow-entry policy on `forceDestruct`/`forceMove` is
the defensive backstop (it denies if someone tries to call
`StuffApi.forceDestruct(...)` from outside `DestructController`'s
module), not the access decision itself. The controller's
`AccessApi.can` check is what actually gates.

**Test.** Per-controller test in each controller's existing
`__tests__/` directory (or a new one). The pattern:
- Build an Avatar giver.
- Build a target Stuff with the appropriate zone wiring.
- Without seeding `'core'` membership, call `controller.execute(...)`
  and assert: scene message fired, `ctx.note` carries
  `controller-rejected` with `reason: 'access-denied'`, no underlying
  Api call happened.
- Seed `'core'` membership (via the test helper from **Test seam
  migration**), call again, assert success.

Test the bare-NPC-under-staff case once (e.g., on
`DestructController`): build an NPC whose command is nested under a
staff Avatar's chain via `ExecutionContextApi`; the current-command-
giver is the NPC; `AccessApi.can` returns `false` because the NPC
has no `playerId`. Asserts the no-inheritance invariant the
requirements doc highlights.

Test the Zone-target detection: `destruct /domain/lounge` from a
lounge member with `'member'` role denies (`canMutateZone` requires
`'owner'`). Same from a lounge `'owner'`-role member succeeds. Same
from a member of `'reviewers'` (in `accessGroups`) denies (they're
secondary, not primary).

Test the accessGroups propagation: a player in `'reviewers'`
(granted access to `/domain/`) can `write /domain/lounge/foo`
(reviewers walks down). Same player cannot `write /lib/security/foo`
(reviewers isn't granted there).

Test `pwd` and `cd` are NOT changed — no `AccessApi.can` call; they
remain public in all tree modes. Test that `ls`/`cat`/`grep` gate ONLY
when `pickWorkspaceTree(giver)` is `'source'` or `'mirror'` —
content-tree mode keeps them public (no check fires).

Test that a player in `'lounge'` can `ls /lib/lounge/` in source mode
but cannot `ls /lib/security/` (the lounge group doesn't own that
slice; walk falls through to `'core'`; lounge member isn't in core).

### Step 9 — MQL `permissions.ts` retirement

**What.** Inline the access checks; relocate `MqlPermissionError`;
delete the file.

#### Async/sync MQL bridge

The MQL resolver is sync (no `await`s in the resolve loop). The
`AccessApi.isAuthor` call is async. Resolution: precompute the
`{ isAuthor: boolean, coreMemberIds?: ReadonlySet<string> }`
snapshot on the MqlContext at the async preflight step *before* sync
resolve runs.

The eleven `checkTier` sites in the resolver migrate to either
`ctx.permission?.isAuthor` (for pre-resolution gates) or drop entirely
(`keyword:` filter — see "Per-site migration" below).

**Files.**
- `api/mql/types.ts`:
  - Move the `MqlPermissionError` class from
    `api/mql/permissions.ts` to here (verbatim — same constructor,
    same fields, same `name`).
  - Add to `MqlContext`:
    ```ts
    /** Precomputed permission snapshot. The dispatcher populates
     *  this via AccessApi.isAuthor before sync resolve runs;
     *  the resolver consults it synchronously. Server-internal
     *  callers (online-wire, contacts-as-group) leave it absent
     *  (absent → allow, matching today's behavior for those paths). */
    permission?: {
      isAuthor: boolean;
      coreMemberIds?: ReadonlySet<string>;
    };
    ```
- `api/mql/resolver.ts`:
  - Drop `import { checkTier } from './permissions'`.
  - Re-export `MqlPermissionError` from `./types`.
  - At lines 205, 220, 301, 568, 585, 593, 991, 1174, 1177, 1180,
    1186 — replace `checkTier(...)` with:
    ```ts
    if (ctx.permission && !ctx.permission.isAuthor) {
      throw new MqlPermissionError(
        `You don't have permission to use '${op}' here.`,
        op,
        'admin',
      );
    }
    ```
  - At line **1183** (the `keyword:` filter): **drop the gate
    entirely** — keywords are user-facing identifiers, equivalent
    to bare keyword seeds which are public. The previous
    `checkTier('authoring', op, ctx.commandGiver)` call here is
    deleted; the body of the case proceeds unconditionally.

    When `ctx.permission` is absent (programmatic call without a
    populated snapshot), the check passes — matching the original
    `_MqlAdminFlag` default for server-internal callers (they
    bypassed `checkTier` by precondition because their callers
    weren't going through the dispatcher path). The new shape:
    absent snapshot → allow, populated snapshot → enforced. This
    preserves server-internal-caller behavior while routing
    dispatcher-driven calls through the populated snapshot.

    **Reasoned choice rationale:** the absent-snapshot-allows shape
    keeps every server-internal MQL caller working without per-site
    audits. The dispatcher always populates; player traffic is
    correctly gated. Tests that exercise denied paths set
    `ctx.permission = { isAuthor: false }` explicitly. Build agent
    should not invert this default.

- `api/mql/predicates.ts`:
  - Drop `import { _MqlAdminFlag } from './permissions'`.
  - Rewrite `isAdmin`: the per-target check consults
    `ctx.permission?.coreMemberIds` (precomputed at dispatch). Body:
    ```ts
    function isAdmin(target: Stuff, _giver: Stuff & CommandGiver, ctx: MqlContext): boolean {
      const playerId = (target as { getPlayerId?: () => string })
        .getPlayerId?.();
      if (!playerId) return false;
      return ctx.permission?.coreMemberIds?.has(playerId) ?? false;
    }
    ```
    The predicate keeps `tier: 'admin'` so the resolver's
    `predicate.tier` lookup gates *use* of `:admin(...)` via the
    same `ctx.permission?.isAuthor` inline check.
  - In the predicate registry, change `keyword:` predicate entry
    (if a tier-tagged entry exists) to `tier: 'public'`. The
    primary keyword-filter site at resolver.ts:1183 is the
    drop-gate-entirely target; this is the predicate-table
    consistency edit if needed.

- `api/command.ts` — extend `preloadValidatorDeps` (or its caller —
  whichever owns building the MqlContext for the dispatch path) with:
  ```ts
  const giver = context.commandGiver;
  const isAuthor = await AccessApi.isAuthor(giver);
  let coreMemberIds: Set<string> | undefined;
  if (isAuthor) {
    // Cheap snapshot for the :admin(...) per-target predicate.
    // Only needed if the actor can use the filter at all (isAuthor
    // gates it); the per-target check inside the filter consults
    // this set.
    const reg = await GroupApi.registry();
    const core = await reg.managed().findByName('core');
    if (core) {
      const coreRef: GroupRef = `managed:${core._id!}`;
      const members = await GroupApi.membersOf(coreRef);
      coreMemberIds = new Set(
        members.map((m) => (m as { getPlayerId?: () => string })
          .getPlayerId?.() ?? '').filter(Boolean)
      );
    }
  }
  context._mqlPermission = { isAuthor, coreMemberIds };
  ```
  Where `_mqlPermission` rides on the `CommandContext` and the
  dispatcher's MqlContext-building helper copies it to
  `ctx.permission`.

- `api/mql/online-wire.ts`,
  `lib/social/providers/MqlGroupProvider.ts`,
  `lib/social/EmoteGrammar.ts`,
  `obj/command/FindController.ts`, `BroadcastController.ts`, and any
  other direct MqlApi caller — these don't populate `ctx.permission`,
  so by the new "absent → allow" rule they continue to work
  unchanged. Verify each via grep that they don't depend on the gate
  ever firing.

- `api/mql/permissions.ts` — **delete file.**

- `api/mql-subscription.ts` — change import from `./mql/permissions`
  to `./mql/types` (`MqlPermissionError` is re-exported from
  `resolver.ts` as well; either path works, but `types.ts` is the
  natural home).

**Test.** Update existing MQL tests:
- `mql.test.ts`: every `_MqlAdminFlag.granter = () => false/true`
  becomes a `ctx.permission` populate-with-flags pattern.
- `mql-subscription.one-shot.test.ts`: same.

Acceptance criteria-driven tests for `'core'` membership end-to-end:
- MQL with `:online` (`'admin'` tier) + giver in `'core'` succeeds.
- Same query + giver not in `'core'` throws `MqlPermissionError`.

### Step 10 — Test seam migration

**What.** `_MqlAdminFlag` is gone; tests that used it must now
populate `'core'` membership.

**Test helper** (add to a shared test helpers file under
`lib/security/__tests__/test-setup.ts` or a new
`mud/__tests__/access-test-helpers.ts`):

```ts
export async function seedCoreMembership(playerId: string): Promise<void> {
  // Ensure AccessRegistry has been cloned (idempotent — boot
  // harnesses usually do this; tests that bring up the full
  // bootstrap can rely on it. Otherwise this helper triggers it.)
  await StuffApi.clone('/obj/AccessRegistry');
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const core = await provider.findByName('core');
  if (!core) throw new Error('core group not seeded');
  core.addMember(playerId);
  await core.save();
}

export async function clearCoreMembership(): Promise<void> {
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const core = await provider.findByName('core');
  if (!core) return;
  core.memberIds = [];
  core.memberRoles = [];
  await core.save();
}
```

Tests that used `_MqlAdminFlag.granter = () => true` now call
`seedCoreMembership(testAvatar.getPlayerId()!)` before the assertion.
Tests that used `() => false` either don't populate or call
`clearCoreMembership()`.

## Tests — grouped by coverage

### `AccessApi` unit tests
**File:** `api/__tests__/access.test.ts` (new). Per acceptance
criteria.

### Zone-side ownership
**File:** `lib/zone/__tests__/Zone.ownerGroup.test.ts` (new). Setter
validation, inheritance hit, Hydrator round-trip.

### `FromController` policy
**File:** `lib/security/__tests__/FromController.test.ts` (new).
Allows from inside controller's module, denies from outside,
multi-controller union form.

### `AdminOnly` retirement
**Files:** `lib/security/__tests__/SecurityPolicies.test.ts` (edit —
delete the `AdminOnly` describe block);
`api/__tests__/witness.test.ts`, `stuff.cleanup.test.ts` (edit —
update the rejection-path tests to assert the new
`FromController`-based denial instead of `AdminOnly`).

### Per-verb access gates
**Files:** `obj/command/__tests__/DestructController.test.ts`,
`TeleportController.test.ts`, `GotoController.test.ts`,
`EvalController.test.ts`, `CloneController.test.ts`,
`ReloadController.test.ts`, `SoulController.test.ts`,
`BroadcastController.test.ts`, `WriteController.test.ts`,
`MkdirController.test.ts`, `RmController.test.ts`,
`CpController.test.ts`, `MvController.test.ts`,
`LsController.test.ts`, `CatController.test.ts`,
`GrepController.test.ts` — some exist
(`CloneController.test.ts`, `TeleportController.test.ts`); the rest
are new files following the pattern.

Per file: not-in-core denies + scene message + envelope note; in-core
proceeds. For `DestructController` only: bare-NPC-under-staff case
asserts no inheritance.

### Read-verb regression
A small test in the workspace test directory (or extending an
existing `pwd`/`cd` test) asserting that `pwd`, `cd`, `ls`, `cat`,
`grep` work without `'core'` membership — confirms the read-side
isn't accidentally gated.

### MQL authoring-tier
**Files:** `api/__tests__/mql.test.ts`,
`mql-subscription.one-shot.test.ts` (edit — replace
`_MqlAdminFlag.granter` with the `'core'`-seed helper; update
`MqlPermissionError` import).

### Bootstrap
**File:** `backend/__tests__/BootstrapManager.test.ts` (edit if it
makes sense to add the AccessRegistry-clone check here; otherwise add
a small `backend/__tests__/AppBootstrap.access.test.ts`). Tests boot
idempotency, fresh-DB seeding, `'core'` empty after seed.

### Framework — async `allows`
No new tests at this level — existing security tests exercise the
async path because they go through the gate. Verify the suite stays
green.

## Documentation deliverables

### New: `docs/subsystems/access.md`

**Sections to write:**

1. **Overview.** The four axes (resource ownership, content
   authoring breadth, developer capability, zone-ownership
   mutation) and how they compose. AccessApi as the facade; the
   AccessRegistry singleton Stuff holding state and behavior.
2. **`AccessApi` surface.** Four public methods (`can`,
   `canMutateZone`, `isAuthor`, `isDeveloper`); thin facade
   delegating to `AccessRegistry`; no escape hatch — the
   `#registry` pointer is private. Encapsulation enforced
   structurally via `@CallSecurity(FromModule('mud/api/access#AccessApi'))`
   on every public Registry method.
3. **`AccessRegistry` Stuff.** Singleton at `/obj/AccessRegistry`;
   composes `PostRegistrationMixin`; `postRegister` runs idempotent
   seeding of the three groups + lounge FolderZones. State on the
   Stuff: cached `GroupRef`s, developer playerId Set, author-groups
   list, onChange cancel handle.
4. **Ownership on the Zone tree.** Two fields — `ownerGroup`
   (primary, single) and `accessGroups` (secondary, list). Both
   persistent, both inheritable; the `can()` walk collects all
   permitted groups (closest ownerGroup + every accessGroups entry
   up to root). `accessGroups` from parent zones propagate to
   children (filesystem ACL semantics).
5. **`can` — the flat-union walk.** Signature, body, the
   `playerIdOf` rule (Avatar only; NPC fails closed), the `'core'`
   fallback when the walk finds no owners.
6. **`canMutateZone` — role-gated.** Used when the target IS a Zone
   Template; requires `'owner'` role in the primary `ownerGroup`.
   `'admin'`/`'member'` and secondary-group members don't authorize
   zone-mutation in this build.
7. **`isAuthor` and `isDeveloper`.** The MQL pre-gate predicate
   (broad — anyone in any content-scope group) and the developer
   predicate (narrow — `'developers'` group with cached Set,
   `onChange` invalidation).
8. **The narrow-entry pattern.** Engine substrate: a privileged
   mutation Api method gets `FromController(...)`; the verb
   controller does the access check before invoking. Adoption
   sites: `StuffApi.forceDestruct` (DestructController) and
   `ContainmentApi.forceMove` (TeleportController + GotoController).
9. **Subject = `getCurrentCommandGiver()`.** NPCs don't inherit
   their nesting player's authority — invariant, not a leak.
10. **The three bootstrap-seeded groups.** `'core'`, `'lounge'`,
    `'developers'`; ownership stamps on `/lib/lounge/` +
    `/domain/lounge/` FolderZones; secure-default semantics.
11. **Action vocabulary.** Free string. No per-action filtering
    on grants yet — any member-of-permitted-group authorizes any
    action. Per-action filtering lights up when a real consumer
    asks for it.
12. **Source-path → template-path resolution.** How
    `resolveSourceFolderZone` walks source paths against the
    template tree to find the closest extant FolderZone.
13. **Cross-references.** call-security.md, grouping.md, zone.md,
    response-envelope.md.
14. **What's NOT in this build.** Audit, deny composition,
    action-level enforcement for non-staff verbs,
    possession/ownership/location capability sources, additional
    scoped staff groups beyond `'lounge'`, role-aware actions
    beyond `canMutateZone`, class-allowlist for content-template
    writes.

### Edit: `docs/subsystems/call-security.md`

- Built-in policies table: drop the `AdminOnly` row; add a
  `FromController(...c)` row noting it's sugar over
  `FromModule + AnyOf`.
- "AdminOnly and the force-bypass shape" section: replace the v1-stub
  framing with the narrow-entry shape; describe the pattern's two
  parts and link to access.md.
- Add an "async `allows`" note in the policy contract section.
- Cross-reference access.md.

### Edit: `docs/subsystems/zone.md`

- Add `ownerGroup` to the "Field inheritance" section as the first
  named substrate field that uses the walk. Note that it's persisted
  via `Zone.persistentFields` and validated on the setter.

### Edit: `docs/subsystems/grouping.md`

- Document `ManagedGroupProvider.findByName(name)` as a public method
  of the managed provider — uniqueness assumption, return shape,
  bootstrap consumer.

### Edit: `docs/architecture.md`

- Add `access.md` to the subsystem-references list.

### Edit: `CLAUDE.md`

- "Go through the API layer" table: add a row
  `if (await GroupApi.isMember(playerId, ref))` → `await AccessApi.can(giver, action, resource)` (whenever the check is a staff-capability gate).

## Open architectural questions

These don't block the build but the agent should be aware of them and
surface findings in PR comments.

1. **`'core'` is fallback, not override.** A player in `'lounge'`
   can write content under `/domain/lounge/` (zone walks to lounge
   owner; member passes). A player in `'core'` writing under
   `/domain/lounge/` walks to the lounge owner — but `'core'` isn't
   a lounge member, so the check returns `false`. Net effect:
   scoped groups *replace* the global fallback for their slice, they
   don't add to it.

   This may or may not be desired. The alternative shape — `'core'`
   members authorize everything regardless of scope — requires
   `can()` to check both the resolved owner group AND `'core'`
   membership and accept on either. The current shape is the literal
   read of "the resource's owner group is who decides"; the
   alternative is "operators always win." If the build agent finds
   `'core'`-as-override is what the operators actually want, the
   change is a one-line `||` in `can()`'s outer return. Surface
   the trade-off as a question on the PR rather than assuming.

   The TS axis is separate from this trade-off: `isDeveloper`
   gates on `'developers'` only and isn't part of the resource walk
   at all, so the override question doesn't apply to it.

2. **MQL sync/async bridge.** The plan adds a precomputed
   `ctx.permission` snapshot rather than making the MQL resolver
   async. The requirements doc's sample snippet (`await
   AccessApi.can(...)` inline in resolver code) implies an async
   resolver but doing so would require an enormous cascade of
   changes through `MqlApi.resolveOne`/`resolveMany` and their many
   sync consumers. The snapshot shape is the minimum-churn
   resolution. The trade-off: the `:admin` predicate's per-target
   check needs `coreMemberIds` precomputed, which costs one
   `membersOf('core')` per dispatch when the giver is an admin. The
   cost is one Mongo read; acceptable. If the build agent finds the
   resolver is already async (or trivially conversion-friendly),
   prefer inlining `await AccessApi.can` per the requirements doc.

3. **`'core'` deleted at runtime.** If an admin runs
   `group delete core` (or someone forces a destruct), the cached
   `GroupRef` on the Registry becomes stale. Acceptance is that
   every gate denies (since `GroupApi.isMember` against a
   non-existent ref returns `false`). The cached ref is benign —
   it points at a deleted Group; member checks return false. After
   `'core'` is re-minted at next bootstrap (or via `group make core`)
   the cache is reset by the HMR hook if `obj/AccessRegistry.ts`
   reloads, otherwise the cached stale ref persists until a server
   restart. The invariant ("empty `'core'` = every gate denies")
   holds; the secure-default story is intact. Recommend a future
   `GroupRegistry`-side change-notification hook that the Registry
   subscribes to (similar to its existing developer-cache
   subscription) for `'core'` destruct events, but it's not blocking.

4. **`forceDestruct`/`forceMove` cyclic import risk.** Wiring
   `FromController(DestructController)` onto `StuffApi.forceDestruct`
   creates a new edge `api/stuff.ts → obj/command/DestructController.ts`,
   reversing the established controller-imports-api direction. The
   plan describes the fallback (`lazyFromModulePolicy`) inside
   `FromController` for the case where the class isn't stamped at
   decorator-evaluation time. The build agent should confirm the
   eager-import path works; if it doesn't (cycle breaks the build),
   the lazy form is the substitute. Flag if neither works.

5. **HMR hook wiring.** Two hooks need registration in
   `reloadHookManifest`:
   - `AccessApi._resetRegistryRefForReload()` on
     `api/access.ts` reload — clears the cached Registry pointer
     so the next call re-resolves.
   - The Registry's runtime caches (refs, developer-playerId Set)
     reset naturally when `obj/AccessRegistry.ts` reloads (the
     Stuff re-clones; instance state goes with it). The
     onChange-cancel handle for the developer cache needs to fire
     in `prepareDestroy` of the old Registry instance to avoid a
     leaked subscription. Build agent should add a
     `prepareDestroy` (or equivalent lifecycle hook) on
     `AccessRegistry` that calls `this.developerCacheCancel?.()`.
   The `'core'`/`'lounge'`/`'developers'` group documents on disk
   aren't affected by HMR.

6. **Content-class allowlist for non-core authors.** The TS hard
   line on source-tree writes closes the direct sandbox escape
   (writing arbitrary `.ts` files). It does NOT close the indirect
   one: a lounge member can author a content Template at
   `/domain/lounge/sneaky` with `class: /lib/eval/EvalScript`, then
   `clone` it. The clone-controller gate checks against the SOURCE
   template's zone (`/domain/lounge/`), which authorizes lounge.
   Result: lounge member effectively has eval capability via
   content authoring.

   The mitigation is a class-allowlist enforced at template
   write/save time: a Template's `class:` field must reference a
   class from a vetted "content-bearing" set (FolderZone, Item,
   Room, etc.) unless the author is in `'core'`. This is the
   natural next access-related build. It needs a vocabulary for
   "this class is safe-to-instantiate-as-content" (probably a
   static marker on Stuff subclasses, similar to how `_mixinName`
   works), a check in `TemplateApi.saveTemplate` that gates on
   `AccessApi.isAuthor(actor) AND class-is-content-safe`,
   and a follow-up audit of existing classes.

   Surface as a known limitation in the build PR; the build itself
   doesn't add it but documents the gap.

## Cross-references

- Source requirements: [docs/requirements/access-requirements.md](../requirements/access-requirements.md)
- Seeding slate: [docs/slates/access-slate.md](../slates/access-slate.md)
- New subsystem doc target: `docs/subsystems/access.md`
- Subsystem refs edited: call-security.md, grouping.md, zone.md,
  architecture.md; CLAUDE.md
- Deferred follow-on slates: scoped-authoring-slate.md (scoped staff
  groups), spoiler-slate.md (SEE/KNOW read gating), chat-slate.md
  (gag-as-deny composition).
