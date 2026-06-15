# Access

The access subsystem is the permission seam that `call-security`
explicitly reserved: a thin **`AccessApi`** facade with five
predicates plus a path-resolver helper, plus a new **narrow-entry
pattern** for privileged mutations. The substrate lands on top of
the existing `grouping` (membership) and `zone` (inheritance walk)
substrates.

State and behavior live on the singleton **`AccessRegistry`**
Stuff at `/obj/AccessRegistry`; `AccessApi` is a thin facade that
delegates through the security gate. Every public Registry method
carries `@CallSecurity(FromModule('mud/api/access#AccessApi'))`, so
the only legitimate calling path is through the Api — external code
that grabs the Registry instance via `StuffApi.findByTemplatePath`
gets a reference but `SecurityError` thrown on any method call.

## The five axes

The build ships five orthogonal predicates:

1. **`AccessApi.can(subject, action, resource)`** — resource-
   targeted slice walk. Walks `resource.getZone()` upward via
   `ZoneApi.getEnclosingZone`, collecting the closest stamped
   `ownerGroup` AND every `accessGroups` entry along the way. If
   the walk finds no owners, falls back to the universal `'core'`
   group. The action is a free string; this build doesn't filter
   ownership by action (any member-of-a-permitted-group authorizes
   any action).
2. **`AccessApi.canMutateZone(subject, zone)`** — role-gated. True
   iff `subject` has `'owner'` role in the zone's primary
   `ownerGroup`. Used by verb controllers when the target IS a Zone
   Template (transfer ownership, mutate `accessGroups`, destruct
   the slice).
3. **`AccessApi.isAuthor(subject)`** — broad "is the actor a
   member of any group with content scope?". Used for MQL
   pre-gates that can't be resource-targeted (the result set IS
   the question, so a lounge member legitimately doing MQL work
   in their slice gets the same pre-gate behavior as a core
   operator).
4. **`AccessApi.isDeveloper(subject)`** — orthogonal developer
   axis. True iff `subject` is in `'developers'`. Determines who
   can write TypeScript source, run `eval`, or `reload` modules.
   Doesn't matter what slices you own; the question is whether
   you have escape capability.
5. **`AccessApi.isStreamer(subject)`** — orthogonal streamer axis.
   True iff `subject` is in `'streamers'`. Gates the livestream
   control plane (the `stream` verb; later scene / lower-third /
   afk). Distinct from the developer axis — a streamer drives the
   broadcast overlay without holding TS-escape capability. See
   [livestream.md](./livestream.md).

Plus one helper for slice-aware workspace verbs:

- **`AccessApi.resolveSourceFolderZone(sourcePath)`** — walks a
  source path against the template tree most-specific-first,
  returning the closest extant FolderZone instance. Workspace
  controllers in source/mirror mode pass the resolved zone as the
  access resource.

## `AccessRegistry` Stuff

The Registry is an `Idea + PostRegistrationMixin` singleton at
`/obj/AccessRegistry`. Instance state:

- `cachedCoreRef` / `cachedLoungeRef` / `cachedDevelopersRef` /
  `cachedStreamersRef` — resolved `GroupRef`s for the
  bootstrap-seeded groups.
- `cachedDeveloperPlayerIds` / `cachedStreamerPlayerIds` — Sets of
  playerIds in `'developers'` / `'streamers'`; warmed lazily on
  first `isDeveloper` / `isStreamer` call, invalidated via the
  managed provider's `onChange` callback.
- `cachedAuthorGroups` — list of `GroupRef`s that count as
  "author scope"; every group referenced by some Zone's
  `ownerGroup` or `accessGroups`, plus `'core'`.
- `developerCacheCancel` / `streamerCacheCancel` — onChange
  cancellation handles, cleared on destruct.

`postRegister` runs idempotent bootstrap seeding:

1. Mint `'core'` Group if absent (universal fallback owner).
2. Mint `'lounge'` Group + stamp `FolderZone` templates at
   `/lib/lounge` and `/domain/lounge` with
   `data.ownerGroup = 'managed:<loungeGroupId>'`.
3. Mint `'developers'` Group if absent (no FolderZone stamp —
   it's a tag-like group whose only role is gating the
   `isDeveloper` axis).
4. Mint `'streamers'` Group if absent (no FolderZone stamp —
   tag-like, gates the `isStreamer` axis), then add any playerIds
   from the `STREAMER_PLAYER_IDS` env var (comma-separated,
   additive + idempotent — never removes).

Re-running boot against a populated DB is a no-op (existing
Groups + existing FolderZone stamps are not overwritten; member
seeding only adds missing ids).

## Ownership on the Zone tree

Two new persistent fields on `Zone`:

```ts
class Zone {
  protected _ownerGroup?: GroupRef;       // primary owner — single group
  protected _accessGroups?: GroupRef[];   // secondary permitted groups
  getOwnerGroup(): GroupRef | undefined;
  setOwnerGroup(ref: GroupRef | undefined): void;
  getAccessGroups(): readonly GroupRef[] | undefined;
  setAccessGroups(refs: readonly GroupRef[] | undefined): void;
}
```

Both setters validate the `source:id` shape and throw on
malformed entries. Both fields land in
`Zone.persistentFields = ['ownerGroup', 'accessGroups']`, so the
Hydrator's two-phase dispatch round-trips them automatically.

Both fields participate in the existing inheritance walk
(`Zone.lookupField` / `Zone.lookupAncestorField`):

- `ownerGroup` is the slice's primary owner — singular. The
  `'owner'` role in this group can transfer ownership,
  grant/revoke secondary access, and destruct the slice. Other
  roles in this group still get content access via `can()`.
- `accessGroups` is a list of secondary permitted groups —
  collaborators, reviewers, guest contributors. All members of
  any `accessGroups` entry get content access (any role) via
  `can()`. They cannot perform zone-ownership-mutation ops.
- `accessGroups` entries from parent zones **propagate to
  children** — filesystem ACL semantics.

## The narrow-entry pattern

A new engine substrate introduced by this build. A privileged
mutation Api method gets a `FromController(...)` policy
restricting it to one (or a few) verb controllers, and those
controllers do the access check via `AccessApi.can` before
invoking. Combined, the mutation has exactly one legitimate
entry path AND that path enforces who is authorized.

Two adoption sites this build flips:

- `StuffApi.forceDestruct` → gated by
  `FromModule('mud/obj/command/author/DestructController#DestructController')`
  (the string form of `FromController(DestructController)` —
  string-keyed to avoid a value-level static-import cycle).
  `DestructController` runs `AccessApi.can(giver,
  'force-destruct', target)` on the force branch (and
  `'destruct'` on the polished branch). Zone targets route to
  `canMutateZone` instead.
- `ContainmentApi.forceMove` → gated by
  `AnyOf(FromModule(TeleportController), FromModule(GotoController))`.
  Each controller's `execute` runs `AccessApi.can(giver,
  'force-teleport' | 'force-goto', ...)` on the force branch
  (and `'teleport'` / `'goto'` on the polished branch).

The Registry itself is the access-side instance of the same
pattern: every public Registry method carries
`@CallSecurity(FromModule('mud/api/access#AccessApi'))`, so
external code's only reachable surface is the Api facade.

## Where the gate lives — validator vs controller body

The dispatcher's validator phase is the right home for an access check
when the decision is sync-decidable from the giver alone (no need for
the resolved model). Two declarative validators cover the simpler
cases:

- **`requiresCoreAccess`** — `can(giver, ctx.verb, null)`. Action
  string is the verb name; resource is null, so the walk falls to
  `'core'`. Used by `soul` and `broadcast`.
- **`requiresDeveloper`** — `isDeveloper(giver)`. Used by `eval`
  and `reload`.
- **`requiresStreamer`** — `isStreamer(giver)`. Used by `stream`.

All follow the typed-preload pattern documented on
`CommandValidator<T>`: the async preload returns the boolean
decision (`AccessApi.can(...)` / `isDeveloper(...)` / `isStreamer(...)`); the
dispatcher captures it in a per-dispatch `ValidatorPreloads` map and
passes it back to the sync validator body as its second argument
(`preloaded`). No module-level state, no manual cleanup.

The model-dependent cases — `destruct` / `teleport` / `goto` (force
flag + target stuff + Zone-target detection), `clone` (source
template), and the workspace verbs (tree-mode branching, dual-
endpoint cp/mv, source-path resolution) — stay in the controller
body. CommandValidator's `preload(context)` signature doesn't expose
the resolved model, and splitting the branching across many narrow
validators trades one controller check for several preload+sync
pairs. When the matrix simplifies (an inert force flag, a single
tree mode, etc.) we revisit.

## Verb-controller gates (matrix)

| Controller | Check |
|---|---|
| `DestructController` | Zone target: `canMutateZone(giver, target)`. Else non-force: `can(giver, 'destruct', target)`; force: `can(giver, 'force-destruct', target)`. |
| `TeleportController` | non-force: `can(giver, 'teleport', target)`; force: `can(giver, 'force-teleport', target)`. |
| `GotoController` | non-force: `can(giver, 'goto', dest)`; force: `can(giver, 'force-goto', dest)`. |
| `SoulController` | `requiresCoreAccess` (validator) — `can(giver, 'soul', null)` via the verb-name action. |
| `BroadcastController` | `requiresCoreAccess` (validator) — `can(giver, 'broadcast', null)`. |
| `EvalController` | `requiresDeveloper` (validator) — `isDeveloper(giver)`; no slice (eval is TS execution). |
| `StreamController` | `requiresStreamer` (validator) — `isStreamer(giver)`; no slice (livestream control plane). |
| `CloneController` | `can(giver, 'clone', sourceResource)` — slice walk on source path. |
| `ReloadController` | `requiresDeveloper` (validator) — `isDeveloper(giver)`; no slice. |
| `WriteController` content | Zone target: `canMutateZone(giver, target)`. Else: `can(giver, 'write', target)`. |
| `WriteController` source/mirror | `isDeveloper(giver)` AND `can(giver, 'write', resolveSourceFolderZone(path))`. |
| `MkdirController` content | `can(giver, 'mkdir', parent)` flat — sub-zone creation is a member-level op. |
| `MkdirController` source | developer + slice. |
| `RmController` content | Zone target: `canMutateZone(giver, target)`. Else: `can(giver, 'rm', target)`. |
| `RmController` source | developer + slice. |
| `CpController` | Source endpoint: READ rules (slice walk only). Dest endpoint: WRITE rules per tree mode. |
| `MvController` | Both endpoints WRITE rules — `mv` REMOVES source after write. |
| `LsController` / `CatController` / `GrepController` | source/mirror mode: `can(giver, 'read', resolveSourceFolderZone(path))`. Content-tree reads are public. |
| `PwdController` / `CdController` | **no access check** in any mode (state queries on the actor, not file reads). |

## Subject = current command giver

The subject of every `can()` check is the current `CommandGiver`
resolved via `ExecutionContextApi.getCurrentCommandGiver()`. NPCs
nested under a staff player's command chain are NOT in the staff
group and therefore do NOT inherit the player's authority — an
invariant, not a leak.

`playerIdOf(subject)` extracts an Avatar's `playerId` (NPCs return
null and fail closed). `getCurrentCommandGiver()` returning `null`
(no command in flight) evaluates against an unauthenticated subject
and fails closed.

## Source-path → template-path resolution

`resolveSourceFolderZone(sourcePath)` walks the source path
against the template tree most-specific-first:

- `lib/lounge/foo.ts` → tries `/lib/lounge/foo` (no match) →
  walks up to `/lib/lounge` (match, extant FolderZone) → returns
  it.
- `lib/security/SecurityPolicies.ts` → walks up → no FolderZone
  match → returns `null` (caller falls through to `'core'`).

Workspace mutation controllers in source/mirror mode pass the
resolved zone as the access resource; source paths inherit the
filesystem-style convention (longer paths shadow shorter ones;
the nearest extant FolderZone wins).

## MQL pre-resolution gating

The dispatcher precomputes a `{ isAuthor, coreMemberIds? }`
snapshot per command (in `CommandApi.resolveModel`) and stamps it
on `ctx.permission`. The resolver consults the snapshot
synchronously:

- Pre-resolution operators (`:world`, path seeds `/obj/...`,
  stuffId seeds `#abc`, `prop:` / `mixin:` / `class:` /
  `template:` filters) call a small inline `gateAuthor` that
  throws `MqlPermissionError` when the snapshot is populated and
  `isAuthor` is false. Absent snapshot → permits (server-internal
  callers building MqlContexts directly continue to work
  unchanged — the legacy `_MqlAdminFlag` precondition path).
- The `:admin` predicate's per-target check consults
  `ctx.permission?.coreMemberIds` (precomputed once per
  dispatch). Absent → false.
- The `keyword:` filter was dropped from the gate list entirely
  — keywords are user-facing identifiers, equivalent to bare
  keyword seeds which are already public.

`MqlPermissionError` lives at `api/mql/types.ts`. The old
`api/mql/permissions.ts` and `_MqlAdminFlag` test seam are
retired.

## The four bootstrap-seeded groups

| Group | Owner | FolderZone stamps | Purpose |
|---|---|---|---|
| `'core'` | `'system'` | none (universal fallback) | Default owner when the zone walk finds no stamped owner. Members authorize broadcast, soul, and any action against null-resource targets. |
| `'lounge'` | `'system'` | `/lib/lounge`, `/domain/lounge` | Content slice owner for the lounge subsystem. Members can author lounge content. |
| `'developers'` | `'system'` | none (orthogonal axis) | TS escape capability. Members can `eval`, `reload`, and write source. The slice walk constrains WHICH source area — see source-tree mode below. |
| `'streamers'` | `'system'` | none (orthogonal axis) | Livestream control plane. Members can run the `stream` verb. Seeded from `STREAMER_PLAYER_IDS`. See [livestream.md](./livestream.md). |

All four start empty (bar any `STREAMER_PLAYER_IDS` seeds). With
no members, every gated path denies — the secure default. Adding
a new scoped group later is two records (Group + FolderZone
stamp); adding a new TS-developer or streamer is a single
member-add to `'developers'` / `'streamers'`.

## Action vocabulary

`can(subject, action, resource)` takes the action as a free
string. This build doesn't filter ownership by action — any
member-of-permitted-group authorizes any action. When a real
per-action need lands (a read-only-grant, an audit-only-grant),
the grant shape extends then.

The vocabulary in use today: `'destruct'` / `'force-destruct'` /
`'teleport'` / `'force-teleport'` / `'goto'` / `'force-goto'` /
`'soul'` / `'broadcast'` / `'clone'` / `'write'` / `'mkdir'` /
`'rm'` / `'read'`.

## HMR notes

- Reload of `api/access.ts` invalidates the cached pointer
  (`AccessApi._resetRegistryRefForReload()`); Registry state is
  unaffected.
- Reload of `obj/AccessRegistry.ts` re-clones the Stuff per
  HotReloadApi's pattern. State resets; `postRegister` re-runs
  idempotently; caches re-warm lazily on first read. The
  `developerCacheCancel` / `streamerCacheCancel` handles are
  cleared in `onDestruct` so the leaked subscriptions don't
  survive.
- `ManagedGroupProvider.findByName` is the by-name lookup used
  by both bootstrap seeding and the developer-cache warm path.
- **`'core'` deleted at runtime** is benign: the cached
  `GroupRef` points at a deleted Group and `GroupApi.isMember`
  against it returns `false`, so every gated path denies. The
  invariant "empty `'core'` = every gate denies" holds. After
  re-mint at next bootstrap, an HMR reload of
  `obj/AccessRegistry.ts` re-warms the cache; otherwise the
  stale ref persists until restart. A `GroupRegistry`-side
  change-notification subscription is a future tighten-up.

## What's NOT in this build

These are deferred either because no consumer needs them today,
or because they're their own conversation:

- **Audit sink wiring** (Pillar 5 of call-security). Denial
  paths emit `controller-rejected` envelope notes and scene
  messages; nothing more.
- **Possession capability source** (keys/badges).
- **Ownership-of-personal-stuff capability source.**
- **Location/context capability source.**
- **Action-level enforcement for non-staff verbs** (chat gag-
  as-deny, door locks, channel post permission, field-mask
  access).
- **Deny composition** ("deny-wins"). No deny source ships
  yet.
- **`getResponsibleAvatar` / `ByResponsibleAvatar` /
  `ByActingAvatar`** — retired from the call-security roadmap.
- **Spoiler SEE/KNOW read gating** — own slate.
- **Read gating beyond source/mirror workspace verbs.**
  Content-tree reads stay public.
- **Tier vocabulary** (`'player' | 'builder' | 'wizard' |
  'owner'` from the slate). Authority is group membership at
  the zone-walked owner.
- **Admin-override entries for other Document collections**
  (`forceDeleteGroup`, `forceDisbandChannel`, `forceEditEmote`).
- **Per-action filtering on grants.**
- **Class-allowlist for content-tree Template writes.** A
  lounge member writing `/domain/lounge/sneaky` with
  `class: /lib/eval/EvalScript` could then `clone` it — the
  mitigation is a follow-on build.
- **Per-result resource targeting on MQL filters.** The
  pre-resolution `isAuthor` check is the simplification; the
  per-result async work is a future MQL build.

## Open question: `'core'` is fallback, not override

A player in `'lounge'` can write content under `/domain/lounge/`
(zone walks to lounge owner; member passes). A player in
`'core'` writing under `/domain/lounge/` walks to the lounge
owner — but `'core'` isn't a lounge member, so the check returns
`false`. Net effect: scoped groups *replace* the global fallback
for their slice; they don't add to it.

This may or may not be desired. The alternative — `'core'`
members authorize everything regardless of scope — is a one-line
`||` in `can()`'s outer return. The current shape is the literal
read of "the resource's owner group is who decides"; the
alternative is "operators always win." Surface as a real
decision when the first scoped-authoring consumer cares.

## Cross-references

- [call-security.md](./call-security.md) — `FromController`
  narrow-entry pattern, async `allows` contract, the framework
  this builds on.
- [grouping.md](./grouping.md) — `GroupApi.isMember` / `roleOf`,
  `ManagedGroupProvider.findByName`.
- [zone.md](./zone.md) — `Zone.lookupField` inheritance walk,
  `ZoneApi.getEnclosingZone`, the `ownerGroup` / `accessGroups`
  fields documented here.
- [persistence.md](./persistence.md) +
  [templates.md](./templates.md) — `persistentFields` round-trip
  via `PersistentHydrator` for the new Zone fields.
- [response-envelope.md](./response-envelope.md) —
  `controller-rejected` Note shape used on access denials.
