# Access — requirements

The access build realizes the permission seam that `call-security`
explicitly reserved: a thin `AccessApi.can(subject, action, resource)`
predicate consulted at verb-level enforcement points, plus a new
**narrow-entry pattern** for privileged mutations — the underlying Api
method is restricted via call-stack policy to be reachable only from
its verb controller, and the verb controller does the access check
before invoking. Combined, the mutation has exactly one legitimate
entry path AND that path enforces who's authorized.

The build ships four axes:

1. **Resource ownership** (content side) — `Zone.ownerGroup` (primary
   owner, single group) plus `Zone.accessGroups` (secondary
   permitted groups), both walked via the existing field-inheritance
   mechanism. `'core'` is the universal fallback owner; `'lounge'`
   is the lounge slice's primary owner.
2. **Content authoring breadth** (`AccessApi.isAuthor`) — for
   MQL pre-gates that can't be resource-targeted. True for any
   member of any content-owning group — `ownerGroup` OR
   `accessGroups` entries anywhere in the zone tree.
3. **Developer capability** (`AccessApi.isDeveloper`) —
   orthogonal to the other axes; gated by membership in a separate
   `'developers'` group. Determines who can write TypeScript source,
   run `eval`, or `reload` modules. Doesn't matter what slices you
   own; the question is whether you have escape capability.
4. **Zone-ownership mutation** (`AccessApi.canMutateZone`) — for
   ops that modify a Zone Template itself (transfer ownership,
   grant/revoke secondary access, destruct the slice). Role-gated:
   requires `'owner'` role in the zone's primary `ownerGroup`. This
   is the minimum role differentiation this build ships; `'admin'` tier
   lights up with consumers (scoped authoring etc.).

Bootstrap mints three Groups (`'core'`, `'lounge'`, `'developers'`)
and two FolderZones (`/lib/lounge/`, `/domain/lounge/` stamped with
the lounge owner). Source-path → template-path resolution makes
filesystem-tree verbs slice-aware without controller code knowing
the difference. Gates fire on every workspace mutation verb (source
+ content trees), every workspace read verb in source/mirror mode,
all seven `AuthorMixin` verb controllers, the two `forceX` admin
entries (narrow-entry pattern), `BroadcastController`, the MQL
resolver, and the substrate hot points (`SecurityPolicy.allows`
async, `FromController` policy added).

Seeded by
[docs/slates/access-slate.md](../slates/access-slate.md). Reconciles
with
[docs/subsystems/call-security.md](../subsystems/call-security.md)
(the subsystem doc retired `getActingAvatar` /
`getResponsibleAvatar` and their policies in favor of
`getCurrentCommandGiver()` — this build matches the shipped framework)
and consumes
[docs/subsystems/grouping.md](../subsystems/grouping.md)
(`GroupApi.isMember` / `roleOf` as the membership source) and
[docs/subsystems/zone.md](../subsystems/zone.md) (`Zone.lookupAncestorField`
as the ownership-walker).

## Goals

- The access subsystem is structured as a **singleton `AccessRegistry`
  Stuff** holding state and behavior, plus a thin **`AccessApi`
  facade** that delegates to it. Same pattern as `GroupRegistry`
  (registry holds code; catalogues hold data — per the convention
  documented in `grouping.md` and `CLAUDE.md`, the access singleton
  holds the predicate method bodies and seeding code, so "Registry"
  is the correct half of the convention).
- **The Registry is encapsulated structurally**: every public method
  on `AccessRegistry` carries
  `@CallSecurity(FromModule('mud/api/access#AccessApi'))`, so the
  security gate denies any caller outside `api/access.ts`. External
  code that grabs the Registry Stuff via `StuffApi.findByTemplatePath`
  cannot call its methods; `SecurityError` throws at the gate.
  `AccessApi` exposes NO escape hatch — the `#registry` pointer is
  private and never returned. All access goes through `AccessApi`'s
  five public methods. Same narrow-entry pattern applied to the
  `forceX` adoption sites elsewhere in this build.
- **State lives on the Registry, not the Api.** Cached refs (for
  `'core'`, `'lounge'`, `'developers'`), the cached
  developer-playerId `Set`, the cached author-groups list, the
  developer `onChange` cancel handle, and the bootstrap-seeding
  methods are all instance fields/methods on `AccessRegistry`. The
  `AccessApi` carries only one module-scope pointer to the Registry
  (a lookup convenience, not domain state). Reload of
  `api/access.ts` clears the pointer; the Registry's state survives
  it. Reload of `obj/AccessRegistry.ts` re-clones the Registry per
  HotReloadApi's pattern — state resets, `postRegister` re-runs
  idempotently, caches re-warm on first read (the HMR-with-state
  tradeoff documented explicitly).
- The Registry exposes **five public methods** through the Api:
  - `can(subject, action, resource)` — resource-targeted slice walk;
    the flat-union answer to "is this actor permitted to perform
    this action on this resource?" Anyone in `ownerGroup` or any
    `accessGroups` entry across the walk passes (any role).
  - `canMutateZone(subject, zone)` — role-gated. True iff subject
    has `'owner'` role in the zone's primary `ownerGroup`. Used by
    verb controllers when the target IS a Zone Template (transfer,
    grant access, destruct the slice itself).
  - `isAuthor(subject)` — broad "is this actor a member of any
    group with content scope?"; used for MQL pre-gates. Includes
    `accessGroups` entries.
  - `isDeveloper(subject)` — narrow "is this actor in
    `'developers'`?"; the orthogonal developer axis.
  - `resolveSourceFolderZone(sourcePath)` — walks a source path
    against the template tree, returning the closest extant
    FolderZone. Used by workspace controllers in source/mirror mode
    to compute the resource zone before calling `can()`.
- The developer axis is **orthogonal** to slice ownership. Source-tree
  writes require BOTH `isDeveloper` AND the `can` slice walk
  (so a lounge developer can edit lounge source; a lounge content-
  only person cannot; a pure developer with no slice can edit source
  in slices they own via `'core'`). `eval` and `reload` require
  `isDeveloper` only (no slice — TS execution can do anything,
  so the slice doesn't meaningfully constrain it).
- A new **narrow-entry pattern** is introduced as engine substrate: a
  privileged mutation Api method gets a `FromController(...)` policy
  restricting it to one (or a few) verb controllers, and those
  controllers do the access check via `AccessApi.can` before
  invoking. Combined, the mutation is structurally unreachable from
  any other code path, and the verb is structurally the enforcement
  point for who can use it.
- Resource ownership lives **on the Zone tree** as two new
  inheritable fields — `ownerGroup` (primary, single) and
  `accessGroups` (secondary, list) — walked via `Zone.lookupField`
  and the `can()` flat-union walk. No new Document collection for
  access metadata; ownership relationships persist as zone-template
  data in the existing `domain` collection. `accessGroups` entries
  from parent zones propagate to children (filesystem ACL
  semantics).
- The `AdminOnly` v1 stub on `StuffApi.forceDestruct` and
  `ContainmentApi.forceMove` is replaced by the narrow-entry pattern:
  `FromController(DestructController)` on `forceDestruct`,
  `FromController(TeleportController, GotoController)` on `forceMove`.
  The respective controllers' `-f` branches call `AccessApi.can` first.
- `AuthorMixin` verb controllers gate via the right axis for each:
  - `EvalController` and `ReloadController` check
    `AccessApi.isDeveloper(giver)` (TS execution).
  - `CloneController`, `DestructController`, `TeleportController`,
    `GotoController`, `SoulController` check `AccessApi.can` against
    their target resources (slice walk). Cloning instantiates an
    existing class, doesn't author new TS; destruct/teleport/goto
    operate on Stuff (slice walk); soul authors emote catalog
    documents which are content.
  - `DestructController`, `TeleportController`, `GotoController`
    gate both force and non-force branches.
  - The underlying general-purpose Apis stay open to their existing
    system callers; checks fire at the verbs. Soul's existing
    "gated by composition" docstring is misleading and gets removed.
- `BroadcastController` checks `AccessApi.can(giver, 'broadcast', null)`
  at `execute()` entry. The controller's existing docstring names
  this gate as the consumer waiting on the access substrate; this
  build lights it up. Resource is `null` (broadcast is global; not a
  slice concern), so the check routes through the `'core'`
  fallback — only `'core'` members can broadcast.
- Every `WorkspaceMixin` mutation verb controller (`WriteController`,
  `MkdirController`, `RmController`, `CpController`, `MvController`)
  checks at `execute()` entry per tree mode:
  - **Content-tree mode**: `AccessApi.can(giver, action, resolvedZone)`
    — slice walk only.
  - **Source-tree mode**: `AccessApi.isDeveloper(giver)` AND
    `AccessApi.can(giver, action, resolvedZone)` — both axes must
    pass. The TS check enforces the orthogonal escape-capability
    gate; the slice walk constrains which area of source you can
    write to.
  - **Mirror mode**: source-side check AND content-side check (so
    mirror writes require TS access AND content-tree slice access).
  - `cp` and `mv` run two checks per invocation (source endpoint
    read + dest endpoint write); each endpoint applies the rules
    above. Deny if any check fails.
- The three workspace read verbs that expose content
  (`LsController`, `CatController`, `GrepController`) check
  `AccessApi.can` when `pickWorkspaceTree(giver)` returns `'source'`
  or `'mirror'`. `pwd` and `cd` remain public (state queries on the
  actor, not file reads).
- The MQL authoring-tier stub (`api/mql/permissions.ts` —
  `_MqlAdminFlag.granter` returning `false` by default,
  `checkTier` as a wrapper) is **deleted entirely**. The eleven
  current `checkTier` call sites in `resolver.ts` migrate to a new
  primitive `AccessApi.isAuthor(actor)` — "is the actor a
  member of any group with authoring scope?" — rather than the
  binary "is this `'core'`?" the existing stub was projecting. The
  reasoning: MQL pre-resolution gates can't target a specific
  resource (the result set IS the question), so the natural gate
  is "you're an author of something" rather than "you're an
  operator of everything." A lounge member legitimately doing
  MQL work in their slice gets the same pre-gate behavior as a
  core operator. The file name "permissions" predates the access
  framework and collides conceptually with `access.ts`; removing
  it kills the parallel-vocabulary trap. `MqlPermissionError`
  relocates to `api/mql/types.ts`. The `keyword:` filter at
  resolver.ts:1183 is dropped from the gate list entirely — it's
  equivalent to a bare keyword seed which is already public, so
  gating it was an incoherent miscategorization.
- **Three groups are seeded at bootstrap** — `'core'` (universal
  fallback owner), `'lounge'` (content slice owner), and
  `'developers'` (developer axis). All three start empty. `'developers'`
  has NO `ownerGroup` stamp anywhere — it's a tag-like group with no
  slice ownership; its only role is the `isDeveloper` check.
  The bootstrap ALSO mints minimal `FolderZone` instances at
  `/lib/lounge/` and `/domain/lounge/` (idempotent — skip if
  existing), each stamped with `ownerGroup: 'managed:<loungeGroupId>'`.
  With all three groups empty, every gate denies — secure default.
  Adding a new scoped group later is two records (Group + FolderZone
  stamp); adding a new TS-developer is a single member-add to
  `'developers'`.
- **Source-tree access is slice-aware.** `AccessApi` exposes an
  internal `resolveSourceFolderZone(sourcePath)` that walks the
  source path against the template tree most-specific-first, finding
  the closest extant `FolderZone` (e.g., `lib/lounge/foo.ts` →
  `/lib/lounge/`). Workspace controllers in source/mirror mode pass
  the resolved zone as the access resource. Source paths with no
  matching FolderZone fall through to the `'core'` cached fallback.
- The subject of every `can()` check is the current `CommandGiver`
  resolved via `ExecutionContextApi.getCurrentCommandGiver()`. NPCs
  nested under a staff player's command chain are NOT in the staff
  group and therefore do NOT inherit the player's authority — an
  invariant, not a leak.

## Non-goals

These are deferred either because no consumer needs them in-repo
today (build-without-consumer is the speculation antipattern) or
because they're their own conversation:

- **Audit sink wiring.** `MudlogApi` is in-game messaging, not an
  audit log. Audit (Pillar 5 of call-security) is its own subsystem
  conversation. This build ships the access checks; on deny they
  throw `SecurityError` or emit `controller-rejected` envelope notes
  and nothing more.
- **Possession capability source** (keys/badges). No lockable-door
  / key content needs it. The substrate is shaped so adding
  possession later is a new branch in `can()`, not a rework.
- **Ownership-of-personal-stuff capability source.** No verb today
  needs "is this yours?" gating; scoped-authoring would be the
  consumer and isn't being built here.
- **Location/context capability source.** No consumer.
- **Action-level enforcement for non-staff verbs.** Chat moderation
  gag-as-deny, door locks, broadcast permission gate, channel post
  permission, field-mask access — all named in the slate — stay
  where they are. They land when their consumers (chat moderation
  tooling, scoped authoring, etc.) build.
- **Deny composition.** "Deny-wins" lands when the first deny
  source exists. No deny source ships in this build.
- **`getResponsibleAvatar` / `ByResponsibleAvatar` / `ByActingAvatar`.**
  The `call-security` subsystem doc retired these from the roadmap.
  This build matches that posture. If a future consumer needs
  bottom-most-human-avatar attribution, the framework gains it then.
- **Spoiler SEE/KNOW read gating.** Different threat model
  (best-effort vs hard); own slate
  ([spoiler-slate.md](../slates/spoiler-slate.md)).
- **Read gating beyond source/mirror tree workspace verbs.**
  Content-tree reads stay public.
- **Tier vocabulary.** `'player' | 'builder' | 'wizard' | 'owner'`
  from the slate is not built. Authority is group membership at the
  zone-walked owner.
- **Admin-override entries for other Document collections.** No
  `forceDeleteGroup`, no `forceDisbandChannel`, no
  `forceEditEmote`. These collections (`groups`, `channels`,
  `emotes`, `users`, `google_profiles`, contacts as mixin state)
  keep their existing per-controller / per-Document gating.
  Moderation-control-plane and scoped-authoring builds add the
  access checks when their consumers land.
- **Per-action filtering on grants.** `can(subject, action, resource)`
  takes the action as a free string; this build doesn't filter
  ownership by action (any actor in the resource's owner group
  authorizes any action). When a real per-action need lands (a
  read-only-grant, an audit-only-grant), the grant shape extends
  then.
- **Class-allowlist for content-tree Template writes.** A lounge
  member writing `/domain/lounge/sneaky` with `class: /lib/eval/EvalScript`
  could then `clone` it (slice-walk authorizes, EvalScript runs).
  The mitigation — a content-class allowlist restricting non-core
  authors to a vetted set of safe-to-instantiate classes — is a
  real next-build conversation but not in scope here. The principle
  to land first is the source-tree hard line; the content-tree
  capability multiplier follows as its own pass.
- **Per-result resource targeting on MQL filters.** The
  `prop:`/`mixin:`/`class:`/`template:` filters and the path/stuffId
  seeds *should* eventually become per-result resource checks
  (the filter sees only candidates the actor has author access to,
  hides others). That's the principled shape per the build's
  "resource-targeted by default" rule, but it requires async-per-
  result work in the currently-sync MQL resolver — substantial
  enough to be its own MQL build. This build keeps those gates as
  pre-resolution `isAuthor` checks, matching the simplification
  but documenting the evolution.
- **Settings-level access policy on `workspace.tree`.** Per-verb
  source/mirror-mode gating covers this; gating the setting itself
  is redundant.
- **`Stuff.destroy()` re-gating beyond `forceDestruct`.** The
  `ApiOnly` + `@Final` + `@Unshadowable` stack on `Stuff.destroy()`
  stays as documented; only the `forceDestruct` entry's policy
  changes.

## Surface decisions

### Subject resolution = `getCurrentCommandGiver()`

The subject of every `can()` check is the most recent
`CommandGiver` (Avatar or NPC) currently executing, resolved via
`ExecutionContextApi.getCurrentCommandGiver()`. This is the only
in-world-actor stack walker the framework exposes; the slate's
`ByActingAvatar` / `ByResponsibleAvatar` framing is retired (the
`call-security` subsystem doc moved them off the roadmap).

Current-giver is the **safer** default, not a leak. An NPC nested
under a staff player's command chain is the giver during its portion
of the chain; no staff group contains the NPC; deny propagates.

When `getCurrentCommandGiver()` returns `null` (no command in
flight), `can()` evaluates against an unauthenticated subject and
fails closed.

### Ownership = `ownerGroup` (primary) + `accessGroups` (secondary)

Two persistent fields on `Zone`:

```ts
class Zone {
  protected _ownerGroup?: GroupRef;         // primary owner — single group
  protected _accessGroups?: GroupRef[];     // secondary permitted groups
  getOwnerGroup(): GroupRef | undefined;
  setOwnerGroup(ref: GroupRef | undefined): void;
  getAccessGroups(): readonly GroupRef[] | undefined;
  setAccessGroups(refs: readonly GroupRef[] | undefined): void;
}
```

Both setters validate via `parseGroupRef` (throw on malformed
entries). Both fields are added to `Zone.persistentFields`.

**Semantic distinction:**
- `ownerGroup` is the slice's owner — singular, conceptually
  primary. The `'owner'` ROLE in this group can transfer ownership,
  grant/revoke secondary access, and destruct the slice. Other
  roles in this group still get content access.
- `accessGroups` is a list of secondary permitted groups —
  collaborators, reviewers, guest contributors. All members of any
  accessGroups entry get content access (any role). They cannot
  perform zone-ownership-mutation ops.

### `can()` — flat union walk

```ts
async can(subject: Stuff | null, action: string, resource: Stuff | null): Promise<boolean> {
  if (subject === null) return false;
  const playerId = playerIdOf(subject);
  if (playerId === null) return false;

  const permittedGroups: GroupRef[] = [];
  let zone = resource?.getZone() ?? null;
  while (zone !== null) {
    const owner = zone.getOwnerGroup();
    if (owner) permittedGroups.push(owner);
    const access = zone.getAccessGroups();
    if (access) permittedGroups.push(...access);
    zone = await ZoneApi.getEnclosingZone(zone);
  }
  if (permittedGroups.length === 0) {
    permittedGroups.push(await cachedCoreGroupRef());
  }
  for (const ref of permittedGroups) {
    if (await GroupApi.isMember(playerId, ref)) return true;
  }
  return false;
}
```

`accessGroups` entries from parent zones **propagate to children** —
if `/domain/` carries `accessGroups: ['reviewers']` and
`/domain/lounge/` carries `ownerGroup: 'lounge'`, then both lounge
members AND reviewers have content access at `/domain/lounge/*`.
Matches filesystem ACL inheritance.

`playerIdOf(subject)`:
- An `Avatar` → its `getPlayerId()`.
- Any other Stuff (including NPCs) → `null`. NPCs fail closed.

Action is a free string. `can()` doesn't filter by action — role
differentiation lives in `canMutateZone()`, not here.

### `canMutateZone()` — role-gated on primary owner

```ts
async canMutateZone(subject: Stuff | null, zone: Stuff): Promise<boolean> {
  if (subject === null) return false;
  const playerId = playerIdOf(subject);
  if (playerId === null) return false;
  // Walk the zone tree to find the primary (closest) ownerGroup.
  let z: Stuff | null = zone;
  let primary: GroupRef | undefined;
  while (z !== null && !primary) {
    primary = (z as Zone).getOwnerGroup();
    if (!primary) z = await ZoneApi.getEnclosingZone(z);
  }
  primary ??= await cachedCoreGroupRef();
  if (!primary) return false;
  const role = await GroupApi.roleOf(playerId, primary);
  return role === 'owner';
}
```

Controllers call this when the target IS a Zone Template (transfer
ownership, mutate `accessGroups`, destruct the slice). `'admin'` and
`'member'` roles don't authorize zone-mutation ops in this build; the
admin tier lights up when a real consumer (scoped-authoring slate)
needs it.

### The narrow-entry pattern (new engine substrate)

A new policy function is added to `lib/security/SecurityPolicies.ts`:

```ts
export function FromController(...controllers: ControllerClass[]): SecurityPolicy;
```

For one controller, sugar over `FromModule(moduleIdOf(c))`. For many,
`AnyOf(FromModule(idOf(c1)), …)`. Lookup uses
`ModuleApi.lookup(controllerClass)` — same module-id machinery as
`FromModule`, same fail-closed posture.

Adoption sites:
- `StuffApi.forceDestruct` → `FromController(DestructController)`;
  access check fires in `DestructController.execute()` on the `-f`
  branch before invoking.
- `ContainmentApi.forceMove` →
  `FromController(TeleportController, GotoController)`; same pattern
  in both controllers' `-f` branches.

### Verb-check shape for general-Api-delegating verbs

For verbs that wrap general-purpose Apis (which legitimately have
many callers): controller `execute()` opens with `await AccessApi.can(...)`;
deny → emit `controller-rejected` envelope note + scene message,
return. The underlying Api stays open.

Controllers in this group:
- `EvalController` — `isDeveloper(giver)`. No slice check
  (eval runs arbitrary TS; scoping by resource is meaningless).
- `ReloadController` — `isDeveloper(giver)`. Same rationale.
- `CloneController` — `can(giver, 'clone', sourceTemplate)`. Cloning
  instantiates an existing class; doesn't author new TS. Slice walk.
- `DestructController` non-force — `can(giver, 'destruct', model.target.stuff)`.
- `TeleportController` non-force — `can(giver, 'teleport', resource)`,
  resource = giver (bare form) or `model.target.stuff` (`--target X`).
- `GotoController` non-force — `can(giver, 'goto', destination Stuff)`.
- `SoulController` — `can(giver, 'soul', null)`. Emote catalog is
  global content (no zone), falls back to `'core'`. One gate covers
  all subcommands.
- `BroadcastController` — `can(giver, 'broadcast', null)`. Global
  comms, `'core'` only.

For Workspace controllers, see the next section.

### Workspace controllers — slice-aware via source-path resolution

`AccessApi.resolveSourceFolderZone` (public — delegates to the
Registry):

```ts
async function resolveSourceFolderZone(sourcePath: string): Promise<Stuff | null>;
```

It walks `sourcePath` against the template tree most-specific-first:

- `lib/lounge/foo.ts` → tries `/lib/lounge/foo` (no match) → walks up
  to `/lib/lounge/` (match, extant FolderZone) → returns it.
- `lib/security/SecurityPolicies.ts` → walks up → no FolderZone
  match → returns `null` (caller falls through to `'core'`).

The resolution maps source paths into the same Zone-walk machinery
the rest of `can()` already uses. Source paths inherit the
filesystem-style convention: longer paths shadow shorter ones; the
nearest extant FolderZone wins.

**Mutation controllers** (`WriteController`, `MkdirController`,
`RmController`, `CpController`, `MvController`).

**Source-tree writes require BOTH `isDeveloper` AND
`can(action, resolvedZone)`.** The two axes are orthogonal: developer
authorizes the *capability* (you can write executable code at all);
slice walk constrains *which area* of the source tree. A lounge
developer writes `lib/lounge/foo.ts`: dev ✓ + lounge owner ✓. A
lounge content-only person writes the same: dev ✗ — fail. A pure
developer with no slice writes `lib/lounge/foo.ts`: dev ✓ + slice ✗.
A core developer writes `lib/security/SecurityPolicies.ts`: dev ✓ +
`'core'` fallback ✓.

**Content-tree writes use slice walk only.** No developer gate —
template documents are declarative content, not executable code.

**When the target is a Zone Template, controllers route to
`canMutateZone` instead of `can`.** `WriteController`,
`DestructController`, and `RmController` detect this by resolving
the target Template and checking via `ZoneApi.isFolderClass` /
`ZoneApi.isSpatialZoneClass`. If yes, the check is
`canMutateZone(giver, target)` — `'owner'` role in primary
ownerGroup required. If no, the standard slice-walk `can(giver,
action, target)` fires. `MkdirController` is treated as content
creation under the parent (flat `can(giver, 'mkdir', parent)`) —
sub-zone creation is a member-level op in this build; tightening to
admin/owner role lands with consumers.

| Controller | Source-tree (both checks) | Content-tree resource |
|---|---|---|
| `WriteController` | `isDeveloper(giver)` AND `can(giver, 'write', resolveSourceFolderZone(model.path) ?? resolveSourceFolderZone(parentOf(model.path)) ?? null)` | `can(giver, 'write', findByPath(model.path) ?? findByPath(parentOf(model.path)) ?? null)` |
| `MkdirController` | `isDeveloper(giver)` AND `can(giver, 'mkdir', resolveSourceFolderZone(parentOf(model.path)) ?? null)` | `can(giver, 'mkdir', findByPath(parentOf(model.path)) ?? null)` |
| `RmController` | `isDeveloper(giver)` AND `can(giver, 'rm', resolveSourceFolderZone(model.path))` | `can(giver, 'rm', findByPath(model.path))` |
| `CpController` / `MvController` | per endpoint (source + dest); source endpoint applies read rules (no TS check, slice walk on the read), dest endpoint applies write rules (TS check + slice walk if source-tree dest) | per endpoint, slice walk only |

**Mirror mode** writes run BOTH the source-side check (TS + slice)
AND the content-side check (slice). Net effect: mirror writes
require `isDeveloper` AND content-side slice ownership AND
source-side slice ownership.

**Read controllers in source/mirror mode** (`LsController`,
`CatController`, `GrepController`):

```ts
const tree = await pickWorkspaceTree(giver);
if (tree === 'source' || tree === 'mirror') {
  const resource = await AccessApi.resolveSourceFolderZone(model.path);
  if (!(await AccessApi.can(giver, 'read', resource))) {
    // deny: scene message + ctx.note
    return;
  }
}
// content-tree read: no check; existing body runs.
```

`pwd` and `cd` remain public unconditionally — state queries on the
actor, not file reads.

### MQL authoring-tier — `api/mql/permissions.ts` deletes entirely

The file's name predates the access framework and now collides
conceptually with `access.ts`. The migration is in two parts: one
new primitive on `AccessApi` and a per-site decision for the
existing tier check.

**New primitive:** `AccessApi.isAuthor(actor: Stuff | null): Promise<boolean>`.
Returns `true` if `actor` is an `Avatar` whose `playerId` is a
member of any group that's referenced as the `ownerGroup` of some
zone-tree FolderZone, OR is in `'core'` (the universal fallback
owner). The set is `{'core', 'lounge'}` after bootstrap and extends
automatically as future scoped groups are minted. Note: `'developers'`
is NOT in this set — `'developers'` is the orthogonal developer axis,
not a content-scope group.

**Per-site migration:**

| Site | Today | After |
|---|---|---|
| `:world` scope (lines 301, 568) | `checkTier('admin', 'world', giver)` | `isAuthor(giver)` — pre-resolution; un-targetable |
| `:admin` predicate (line 991 via `predicate.tier`) | `checkTier('admin', name, giver)` | `isAuthor(giver)` — privacy |
| Path seeds `/obj/...` (line 205, 585) | `checkTier('authoring', pattern, giver)` | `isAuthor(giver)` — flagged for per-result evolution |
| StuffId seeds `#abc` (line 220, 593) | `checkTier('authoring', id, giver)` | `isAuthor(giver)` — flagged for per-result evolution |
| `prop:foo=value` filter (line 1174) | `checkTier('authoring', op, giver)` | `isAuthor(giver)` — flagged for per-result evolution |
| `mixin:Bar` filter (line 1177) | `checkTier('authoring', op, giver)` | `isAuthor(giver)` — flagged for per-result evolution |
| `class:Baz` filter (line 1180) | `checkTier('authoring', op, giver)` | `isAuthor(giver)` — flagged for per-result evolution |
| `keyword:qux` filter (line 1183) | `checkTier('authoring', op, giver)` | **drop the gate** — keywords are user-facing, equivalent to bare seeds which are already public |
| `template:zap` filter (line 1186) | `checkTier('authoring', op, giver)` | `isAuthor(giver)` — flagged for per-result evolution |

**The dispatch-time snapshot pattern stays:** the dispatcher
precomputes `isAuthor(giver)` once per command and stamps it on
`MqlContext` (replacing the `{authoring, admin, coreMemberIds}`
snapshot from the earlier sync/async bridge proposal). The resolver
reads `ctx.permission?.isAuthor` synchronously. Absent snapshot →
permits (server-internal callers).

**Migration mechanics:**

- `MqlPermissionError` moves to `api/mql/types.ts`. Sibling of the
  other MQL-specific types already there.
- `_MqlAdminFlag` deletes.
- `checkTier` deletes; resolver call sites consult
  `ctx.permission?.isAuthor` and throw `MqlPermissionError` on deny:
  ```ts
  if (ctx.permission && !ctx.permission.isAuthor) {
    throw new MqlPermissionError(
      `You don't have permission to use '${operator}' here.`,
      operator,
      'admin',
    );
  }
  ```
- The `:admin` predicate's per-target `isAdmin(target)` check needs
  `coreMemberIds` still (since "is *that target* admin?" is a
  per-target question); the snapshot becomes
  `{ isAuthor: boolean, coreMemberIds?: ReadonlySet<string> }`.
- `api/mql/permissions.ts` deletes.

### Bootstrap seeds — driven by `AccessRegistry.postRegister`

`AppBootstrap` clones `/obj/AccessRegistry` after
`BootstrapManager.run()` has initialized `GroupRegistry` (whose
providers the Registry's seeding relies on). The Registry's
`postRegister` runs the access-bootstrap sequence:

1. **Seed `'core'` Group** if no managed Group named `'core'` exists.
   Owner = `'system'`. No initial members.
2. **Seed `'lounge'` Group** if no managed Group named `'lounge'`
   exists. Owner = `'system'`. No initial members. Mint
   `/lib/lounge/` FolderZone if no template exists at that path;
   stamp `data.ownerGroup = 'managed:<loungeGroupId>'`. Same for
   `/domain/lounge/`.
3. **Seed `'developers'` Group** if no managed Group named
   `'developers'` exists. Owner = `'system'`. No initial members.
   This group has NO FolderZone stamps anywhere — it's a tag-like
   group whose only role is gating the `isDeveloper` axis.

All steps are idempotent — re-running boot against a populated DB
is a no-op (existing groups + existing FolderZone stamps are not
overwritten). The Registry's cached `GroupRef`s for all three groups
prime during seeding and persist as instance fields on the Registry
Stuff (not on `AccessApi`).

**Empty initial membership is the secure default.** With no members
in any group, every gate denies. The first operator is added by a
dev-DB direct seed; subsequent additions happen via
`group add <name> <playerId>` once at least one operator can run it.

## Constraints

- **`SecurityPolicy.allows` async migration.** The single framework-
  side change is widening `allows` to return
  `boolean | Promise<boolean>`. The security gate and the
  static-method wrapper both await. Existing policies return sync
  booleans and continue working.
- **Hot reload integrity.** Reload of `api/access.ts` invalidates
  only the `AccessApi.#registry` pointer (via
  `_resetRegistryRefForReload`); the Registry's instance state is
  unaffected. Reload of `obj/AccessRegistry.ts` re-clones the
  Registry Stuff per HotReloadApi; `postRegister` re-runs
  idempotently and caches re-warm lazily.
  `ManagedGroupProvider.findByName` reads through its existing
  machinery, no new caching layer.
- **Per-field invariants on setters.** `Zone.setOwnerGroup` runs
  `parseGroupRef(ref)` and throws on malformed input.
  `Zone.persistentFields` includes `'ownerGroup'` so the Hydrator
  round-trips it.
- **No new Apis by default.** `AccessApi` is justified explicitly:
  cross-cutting predicate, no host, user-requested as a separate
  layer, slate calls it out as the sanctioned cross-cutting case.
  `AccessApi`'s public surface is exactly five delegating methods
  (`can`, `canMutateZone`, `isAuthor`, `isDeveloper`,
  `resolveSourceFolderZone`). The helper internals (`playerIdOf`,
  `resolveCoreRef`, `resolveAuthorGroups`, `warmDeveloperCache`,
  the three `seed*` methods) live on the Registry as private
  methods.
- **Substrate has no content hooks.** Ownership isn't actively
  registered by content; FolderZone authors stamp `ownerGroup`
  declaratively on their templates and the walker reads it. No
  runtime `registerOwner`-style hooks.
- **No premature registries.** The narrow-entry pattern uses
  `FromController` — sugar over the existing `FromModule` policy +
  `AnyOf` composition. No new registry.
- **Settings out of scope.** Access state is not player-tunable.
- **Audit explicitly deferred.** No `MudlogApi` calls from policies,
  controllers, or `AccessApi.can`. Denial paths emit a scene message
  + envelope note (verb-check case) or throw `SecurityError`
  (narrow-entry case).
- **Test seam cleanup.** `_MqlAdminFlag` deletes. `AccessApi` exposes
  no `_setGrantsForTest`-style seam — tests manipulate access by
  seeding group membership directly via
  `GroupApi.registry().managed().findByName(name)?.addMember`.

## Acceptance criteria

### `AccessApi`

- `AccessApi` is exported from `api/access.ts`, decorated by
  `SecurityApi.decorateApiClass`. Public methods: `can`,
  `canMutateZone`, `isAuthor`, `isDeveloper`,
  `resolveSourceFolderZone` — each delegates to the
  `AccessRegistry` via `await AccessApi.registry()`. The
  `#registry` static is private. No `registry()` public accessor.
- `AccessApi.isAuthor(subject): Promise<boolean>` is exported.
  A test asserts it returns `true` for members of `'core'`,
  `'lounge'`, and any group present in any `accessGroups` entry
  in the zone tree. Returns `false` for a pure-`'developers'`-only
  member (developer axis, no content scope).
- `AccessApi.isDeveloper(subject): Promise<boolean>` is
  exported. A test asserts it returns `true` for members of
  `'developers'` and `false` for members of `'core'` or `'lounge'`
  who are NOT in `'developers'`. The two axes are independent.
- `AccessApi.canMutateZone(subject, zone): Promise<boolean>` is
  exported. A test asserts it returns `true` for an actor with
  `'owner'` role in the zone's primary `ownerGroup`, and `false`
  for actors with `'admin'` or `'member'` role in the same group,
  and `false` for actors who are members of an `accessGroups`
  entry (regardless of their role within that group). NPCs and
  null subjects fail closed.
- A test asserts the encapsulation gate: invoking any public method
  on the `AccessRegistry` Stuff from a non-`api/access.ts` module
  (e.g., a test file calling `registry.can(...)` directly) throws
  `SecurityError`. Calling the same operation through
  `AccessApi.can(...)` succeeds, confirming the facade is the only
  reachable surface.

### `AccessRegistry` Stuff

- `obj/AccessRegistry.ts` exists, composes `PostRegistrationMixin(Idea)`,
  and its template at `/obj/AccessRegistry` is cloned by
  `AppBootstrap` after `BootstrapManager.run()`.
- The Registry's five public methods (`can`, `canMutateZone`,
  `isAuthor`, `isDeveloper`, `resolveSourceFolderZone`) each carry
  `@CallSecurity(FromModule('mud/api/access#AccessApi'))`. A test
  asserts each method's policy via the SecurityApi inspection seam
  (or by direct denial test).
- The Registry's `postRegister` runs the seeding methods
  (`seedCoreGroup`, `seedLoungeSlice`, `seedDevelopersGroup`)
  idempotently. A test asserts running `postRegister` twice doesn't
  duplicate Groups or overwrite existing FolderZone `ownerGroup`
  stamps.
- Instance fields (`cachedCoreRef`, `cachedLoungeRef`,
  `cachedDevelopersRef`, `cachedAuthorGroups`,
  `cachedDeveloperPlayerIds`, `developerCacheCancel`) are private
  to the class; nothing exposes them externally.
- A test asserts the developer cache is populated lazily on first
  `isDeveloper` call and invalidated when the
  `ManagedGroupProvider.onChange` callback fires (e.g., after a
  member is added/removed from `'developers'`).
- A test asserts `can(null, 'admin', null)` returns `false`.
- A test asserts `can(npcSubject, 'admin', null)` returns `false`
  (NPC has no playerId).
- A test asserts `can(avatarInCoreGroup, 'admin', null)` returns
  `true`.
- A test asserts `can(avatarNotInCoreGroup, 'admin', null)` returns
  `false`.
- A test asserts `can(avatarInLoungeGroup, 'admin', null)` returns
  `false` (lounge member isn't authorized for global actions).
- A test asserts `can(avatarInLoungeGroup, 'write', stuffUnderLoungeFolderZone)`
  returns `true` (walk finds the lounge ownerGroup).
- A test asserts `can(avatarInCoreGroup, 'write', stuffUnderLoungeFolderZone)`
  returns `false` (core isn't a member of lounge — global authority
  is fallback, not override). Note: this is the design choice;
  scoped groups *replace* the fallback for their slice, they don't
  add to it. If this should be "core overrides everything," surface
  before locking.

### Zone-side ownership

- `Zone.persistentFields` includes both `'ownerGroup'` and
  `'accessGroups'`. `setOwnerGroup` / `getOwnerGroup` /
  `setAccessGroups` / `getAccessGroups` exist; both setters throw
  on malformed entries.
- A test asserts `zone.lookupAncestorField('ownerGroup')` returns
  the closest ancestor's value when the current zone is unset.
- A test asserts `accessGroups` entries from parent zones
  contribute to the `can()` walk when the child has its own
  `ownerGroup` (the parent's accessGroups still grants access at
  the child).
- A test asserts both fields round-trip through the Hydrator
  (template-data → Stuff → template-data).

### Narrow-entry pattern

- `SecurityPolicies.FromController(...controllers)` is exported and
  returns a `SecurityPolicy`.
- A test asserts `@CallSecurity(FromController(DestructController))`
  on a method rejects calls from outside DestructController's module
  with `SecurityError`.
- A test asserts the same decorator allows calls from inside.
- `StuffApi.forceDestruct` carries
  `@CallSecurity(FromController(DestructController))`; direct call
  from outside throws.
- `ContainmentApi.forceMove` carries
  `@CallSecurity(FromController(TeleportController, GotoController))`;
  direct call from outside either throws.

### Verb-controller access checks

- A test asserts each of the seven Author controllers (`Eval`,
  `Clone`, `Reload`, `Destruct`, `Teleport`, `Goto`, `Soul`) rejects
  when giver isn't in `'core'` AND the resource doesn't walk to a
  group the giver belongs to.
- A test asserts `BroadcastController` rejects when giver isn't in
  `'core'` and succeeds when giver is in `'core'`.
- A test asserts `DestructController` rejects in both force and
  non-force branches (gates uniformly).
- A test asserts force-branch invocations of `Destruct`/`Teleport`/
  `Goto` use the appropriate force action string (`'force-destruct'`
  / `'force-teleport'` / `'force-goto'`).
- A test asserts each of the five workspace mutation controllers
  (`Write`, `Mkdir`, `Rm`, `Cp`, `Mv`) rejects when giver isn't in
  `'core'` and the resource doesn't walk to a relevant group.
- A test asserts `Cp` and `Mv` deny when EITHER endpoint denies.
- A test asserts mirror-mode writes run two checks (content + source)
  and deny if either fails.
- A test asserts `Ls`/`Cat`/`Grep` in source-tree mode reject
  non-staff; in content-tree mode they don't run the access check at
  all.
- A test asserts `pwd` and `cd` work for non-staff in any tree mode.
- A test asserts an avatar in `'lounge'` but NOT `'developers'`
  can read source under `lib/lounge/**` (slice walk passes), can
  write Templates under `/domain/lounge/**` (content slice walk
  passes), but is denied source-tree writes anywhere (no
  `isDeveloper`). Confirms TS axis is orthogonal.
- A test asserts an avatar who is a member of a Group named in
  some Zone's `accessGroups` (e.g., `'reviewers'` granted access
  to `/domain/lounge/`) but NOT in `'lounge'` can write Templates
  under `/domain/lounge/**` but CANNOT mutate the
  `/domain/lounge/` FolderZone itself (`canMutateZone` denies —
  they're a secondary, not the primary owner).
- A test asserts a lounge member with `'admin'` role in `'lounge'`
  can write Templates under `/domain/lounge/**` but CANNOT mutate
  `/domain/lounge/` FolderZone (admin role isn't owner in this build).
- A test asserts a lounge member with `'owner'` role in `'lounge'`
  CAN mutate `/domain/lounge/` FolderZone (transfer ownership,
  modify accessGroups, destruct).
- A test asserts an avatar in `'lounge'` AND `'developers'` (a
  lounge developer) can write source under `lib/lounge/**` (both
  axes pass) but cannot write source under `lib/security/**` (TS ✓
  but slice walk fails — not in core, no lounge ownership of
  /lib/security).
- A test asserts an avatar in `'developers'` but no content group
  cannot write source anywhere (TS ✓ but slice walk fails
  everywhere — no slice ownership, no `'core'` fallback).
- A test asserts an avatar in `'core'` AND `'developers'` can
  write source anywhere (TS ✓ + slice walk authorizes via `'core'`
  fallback).
- A test asserts `eval` and `reload` are gated only by
  `isDeveloper` (no slice check). A `'core'`-only avatar
  (no `'developers'`) is denied `eval`; a `'developers'`-only
  avatar succeeds.
- A test asserts a non-staff avatar cannot read source under
  `lib/lounge/**` (slice walk doesn't authorize them) and cannot
  write anywhere.
- A test asserts an NPC `CommandGiver` (a `Character` with no
  `playerId`) is denied — the no-inheritance invariant.

### MQL authoring-tier swap

- A test asserts MQL using `:online` (an `'admin'`-tier seed) with a
  giver in `'core'` succeeds.
- A test asserts the same query with a giver not in `'core'` throws
  `MqlPermissionError`.
- `api/mql/permissions.ts` no longer exists; no source file
  references `_MqlAdminFlag` or `checkTier`.
- `MqlPermissionError` is exported from `api/mql/types.ts`.

### Bootstrap

- Managed `Group` records named `'core'`, `'lounge'`, and
  `'developers'` exist after first boot, each with empty member
  list.
- A `FolderZone` Template at `/lib/lounge/` exists, with
  `data.ownerGroup = 'managed:<loungeGroupId>'`.
- A `FolderZone` Template at `/domain/lounge/` exists with the same
  shape.
- NO FolderZone is stamped with the `'developers'` ref anywhere
  (`'developers'` is the TS-axis group, has no content scope).
- A test asserts boot is idempotent: running it twice against a
  populated DB does not create duplicates and does not overwrite
  existing `ownerGroup` stamps.
- A test asserts that with all three groups empty, every gated path
  denies (secure default).

### Framework: `SecurityPolicy.allows` async migration

- `SecurityPolicy.allows` is typed `boolean | Promise<boolean>`.
- `SecurityApi.#securityGate` awaits the result.
- `_wrapStaticDescriptor`'s wrapper awaits the result.
- Every existing policy returns a sync boolean; no test churn beyond
  the awaits.

### Cleanup

- `SecurityPolicies.AdminOnly` no longer exists; no source file
  references it.
- `ManagedGroupProvider.findByName(name): Promise<Group | null>` is
  exported and used by the `AccessRegistry`'s seeding methods and
  by its developer-cache warm path.

### Documentation

- `docs/subsystems/access.md` is created. Covers all four
  predicates, the Registry/Api split, the encapsulation contract,
  the narrow-entry pattern, the three seeded groups, and the
  source-path resolver.
- `docs/subsystems/call-security.md` is updated: `AdminOnly` retires;
  `FromController` documented; `allows` is now optionally-async.
- `docs/subsystems/zone.md` is updated: `ownerGroup` and
  `accessGroups` fields documented as Zone substrate, with the
  flat-union walk semantic and accessGroups parent-to-child
  propagation behavior noted.
- `docs/subsystems/grouping.md` is updated: `findByName`
  documented.
- `docs/architecture.md` references `access.md`.
- `CLAUDE.md`'s "Go through the API layer" table gains entries for
  all four `AccessApi` methods.

## Cross-references

- Seeding slate: [docs/slates/access-slate.md](../slates/access-slate.md)
- Lounge slate (seed for the `'lounge'` group + FolderZones):
  [docs/slates/lounge-slate.md](../slates/lounge-slate.md)
- Subsystem reference being created: `docs/subsystems/access.md` (new)
- Subsystem references this build edits:
  - [docs/subsystems/call-security.md](../subsystems/call-security.md)
  - [docs/subsystems/grouping.md](../subsystems/grouping.md)
  - [docs/subsystems/zone.md](../subsystems/zone.md)
- Slates deferred but adjacent:
  - [scoped-authoring-slate.md](../slates/scoped-authoring-slate.md)
  - [spoiler-slate.md](../slates/spoiler-slate.md)
  - [chat-slate.md](../slates/chat-slate.md)
