# Spatial Subsystem

How the world is shaped: rooms, zones, exits, doors, portable
containers, and the locomotion that ties them together. This is the
densest subsystem in `lib/` — the one most likely to surprise a new
contributor — so this doc covers the whole layer in one place rather
than scattering it across class JSDoc.

Sibling docs cover related ground without overlap:

- [zone.md](./zone.md) — the Zone-hierarchy roots (`Zone`,
  `SpatialZone`, `FolderZone`) and `ZoneApi`. The hierarchy lives in
  `lib/zone/`; only the spatial-coordinate concrete zones
  (`CartesianZone`, `SphericalZone`) stay under `lib/spatial/`.
- [templates.md](./templates.md) — clone pipeline,
  `ZoneApi.resolveZoneForPath`, the folder/leaf invariant on `domain`.
- [state-model.md](./state-model.md) — the universal `zone` field
  stamped on every Stuff, why it follows template path rather than
  current container.
- [messaging.md](./messaging.md) — Scene composer, sensor routing.
  Movement narration sits on top of this.
- [prose.md](./prose.md) — the Liquid templating used by
  `Exit.messageOut` / `messageIn` and the Mobile default settings.
- [light.md](./light.md) — the Light & Boundary subsystem that
  layers on top of this one. `Door` is now a `Boundary` (closed
  doors block light, not just movement); `Adornable` composed onto
  `Location` and `Vessel` is what hosts `BoundaryAnchor` fixtures.
- [properties.md](./properties.md), [mixins.md](./mixins.md) — the
  general mechanics that let mixins carry persistent fields.

## The Cast

| Type | Kind | Role |
|---|---|---|
| `Location` | concrete class | Base for any Stuff that holds Stuff but isn't itself contained. `ContainerMixin(Stuff)`. |
| `CartesianLocation` | concrete class | Room living at integer `[x,y,z]` in a `CartesianZone` grid. Cardinal exits unconditional; non-cardinal exits only when crossing zone boundaries. `coords` declarative-content field + `setCoords` setter. |
| `SphericalLocation` | concrete class | Sphere positioned by focus inside a `SphericalZone`. Semantic exits only. `focus` declarative-content field + `setFocus` setter. |
| `Zone` / `SpatialZone` / `FolderZone` | (cross-reference) | See [zone.md](./zone.md) — the Zone hierarchy lives in `lib/zone/` now, carved out of `lib/spatial/`. |
| `CartesianZone` | concrete class | `SingletonMixin(SpatialZone)`. Same-size-cell grid. Derives cardinal exits from adjacency. `hasRoomAt(x, y, z, room?)` predicate for setter idempotency. |
| `SphericalZone` | concrete class | `SingletonMixin(SpatialZone)`. Spheres-with-radius space. No implicit adjacency — every exit is authored. `hasLocationAtFocus(focus, location?)` predicate. |
| `Vessel` | top-level branch | A *mobile place* — Container + Containable. Sibling of Thing / Location / Idea / Agent / Persistable / Shadow; lives in `lib/stuff/`. Concrete vessels: chests, packs, ships, vehicles. Composes `Adornable`. |
| `ContainerMixin` | mixin | Inventory side: `addContainable` / `removeContainable` / `getContents`. |
| `ContainableMixin` | mixin | Lives-inside side: `environment`, `setContainer`. |
| `MobileMixin` | mixin | Locomotion: `traverse` (async)/`teleport` and movement narration. |
| `CartesianCoordinatesMixin` | mixin | `[x,y,z]` data carrier. |
| `SphericalCoordinatesMixin` | mixin | `[rho,theta,phi] + radius` data carrier. |
| `SealableMixin` | mixin | Binary `isOpen` state. Used by `Door` and `Window`; reusable for chests, trapdoors, envelopes. Stays in `lib/spatial/` because it's generic. |
| `SingletonMixin` | mixin | Class-level uniqueness: composing classes refuse a second `clone()` for the same `templatePath`. Composed by `CartesianZone` and `SphericalZone`. |
| `ZoneApi` | static API | Resolves `templatePath → Zone` via `StuffApi.singleton`. Caching is delegated; ZoneApi just owns the ancestor walk. |
| `StuffApi.singleton(path)` | static API | Cache-or-clone tool for any class. Pairs with `SingletonMixin` for enforced uniqueness. |
| `ContainmentApi` | static API | The single public surface for moving Stuff between containers. |
| `NavigationApi` | static API | Direction normalization, aliases, grid offsets, inverses. |

## Class Hierarchy

```
Stuff (one of seven top-level branches — see architecture.md)
  ├── Idea
  │     ├── Zone (abstract scope/folder)
  │     │     ├── SpatialZone (abstract topographical intermediate)
  │     │     │     ├── CartesianZone     (Singleton + grid + derived adjacency)
  │     │     │     └── SphericalZone     (Singleton + focus index, no derivation)
  │     │     └── Clade (taxonomic — see race.md)
  │     └── Exit                    (data + canTraverse() guard, lazy destination)
  ├── Location                      (Adornable + Container, was Container only)
  │     ├── CartesianLocation       (PostRegistration + Exitable + CartesianCoords + Visible)
  │     └── SphericalLocation       (PostRegistration + Exitable + SphericalCoords + Visible)
  ├── Thing                         (ContainableMixin(Stuff))
  │     ├── Boundary                (Visible + Perceptible)            ← see light.md
  │     │     ├── Window            (Sealable + LightConduit + LineOfSight)
  │     │     └── Door              (Sealable + Light/Sight/Movement Conduits)  ← retrofit
  │     └── BoundaryAnchor          (Adornment)                         ← see light.md
  ├── Vessel                        (Adornable + Container + Containable, was Container + Containable)
  │     └── ExitableVessel          (DoorBearing + Exitable + Visible)
  └── Agent                         (Avatar / NPC / vehicle layer Mobile + … on top)
```

The fundamental split for spatial relationships:

- **Locations are containers but not containables** (rooms don't
  live anywhere).
- **Things are containables but not containers** (or, in Vessel-light
  cases, both — a chest *could* be modeled as a Thing-with-Container,
  but anything with navigable interior is a Vessel).
- **Vessels are both** — that's their distinguishing trait. Mobile
  places.
- **Doors are Things** with an attach/detach relationship to Exits,
  not a pure Containable role.
- **Agents are containable + mobile** — they live inside a Location
  and can travel.

Capability checks (`isContainer`, `isContainable`, `isExitable`)
cross all seven branches; class-identity checks (`instanceof`) are
for role.

## Containment

Source: `lib/spatial/Container.ts`, `lib/spatial/Containable.ts`,
`api/containment.ts`.

The most security-hardened slice of the codebase. Any code path that
can mutate "what's inside what" goes through one chokepoint, by design.

### The chokepoint

Three lockdown decorators stack across two methods to make
`ContainmentApi.move` the **only** legitimate way to change inventory.

`Container.addContainable` / `removeContainable`
(`Container.ts:98-113`) are:
- `@Final` — no subclass override (out-of-sync inventory is catastrophic)
- `@Unshadowable` — no shadow bypass
- `@CallSecurity(CalledFromSetContainer)` — reachable only from inside
  `Containable.setContainer`

`Containable.setContainer` (`Containable.ts:91-104`) is:
- `@Final`, `@Unshadowable`
- `@CallSecurity(FromContainmentApi)` — reachable only from
  `ContainmentApi.move`

The result is a hard guarantee: every change to `environment` /
`inventory` flows through `ContainmentApi.move`, which means every
change runs the invariant gates and the witness hooks below.

Detach is `ContainmentApi.move(item, null)`. A direct
`setContainer(null)` is rejected by policy.

### `ContainmentApi.move` pipeline

`ContainmentApi.move(item, to)` (`containment.ts:73-119`):

1. **Pre-flight invariants** (when `to !== null`):
   - Exitables can only land inside other Exitables. (Closes the
     "carry a chest with someone in it" exploit.)
   - Exitables cannot cross zones via containment. The `zone` field
     follows whichever template spawned the item; moving it into a
     foreign zone would silently desync.
2. **Veto hooks** (declaration-of-care order: item, source, dest):
   `canMove` on the item, `canRemoveContainable` on the source,
   `canAddContainable` on the destination. First veto wins, throws
   `ContainmentError`.
3. **State mutation** through `setContainer`. The chokepoint runs the
   three cross-object updates atomically:
   `oldContainer.removeContainable(this)` →
   `newContainer.addContainable(this)` → `this.environment = container`
   (`Containable.ts:94-104`).
4. **Notification hooks** (post-mutation, never veto):
   `onContainableRemoved` on source, `onContainableAdded` on
   destination, `onMoved(from, to)` on the item.

Witness hooks are optional methods on the relevant interface — declare
the ones you want, omit the rest. `containment.ts:157-165` dispatches
them via `typeof === 'function'` so a shadow defining a hook
participates without a `MixinApi.hasMixin` precheck.

### `ContainmentError`

Thrown for **programmatic** contract violations: invariant breaks and
hook vetoes from internal code. User-facing commands (`go`, `get`,
`drop`) validate beforehand and produce friendly messages — the API
never returns boolean success flags. See
[antipatterns.md](../antipatterns.md) for the
"don't manually call setContainer + addContainable" rule.

### `zone` is NOT restamped on move

By design (`containment.ts:64-69`). The authoritative source for zone
membership is the `domain` template path at clone time, not the
current container. Cross-zone movement of Exitables is blocked at
pre-flight; non-Exitable Stuff (an Avatar walking from a Narnia room
into a Caves room) keeps its original `zone` reference, which is
the right answer — see [state-model.md § Stamped-on-Stuff Fields](./state-model.md#stamped-on-stuff-fields).

### Detached Stuff (`environment === null`)

A `Stuff & Containable` whose `environment === null` is **detached**
— not in any container, not anywhere in the world. Detachment comes
up in three normal situations: a Stuff just constructed via
`StuffApi.create` but not yet placed; a door that has been removed
from its Boundary anchor; an item whose container was destroyed
mid-frame.

Detachment is a normal state, not an error. Subsystems that walk
container chains, route messages, or compute perception MUST handle
the null-env case without throwing. The matrix below is canonical;
new code that touches a detached input has to land somewhere on it.

| Subsystem | Site | Behavior on null env |
|---|---|---|
| MQL scope walks | `api/mql/resolver.ts:165, 520, 817, 836` | Silently skip the detached Stuff; resolver continues with what's left. Empty results are normal. |
| MQL scope-walk helper | `api/mql/scope-walk.ts:116, 147` | Returns `[]` when the giver has no environment. |
| MQL predicates | `api/mql/predicates.ts:61, 65` | `inLocation` / `peers` return `false`. |
| Command scoping | `lib/command/CommandGiver.ts:367` | A detached giver's environment-bucket is empty; recency stack reflects only `self` + `inventory`. |
| Perception (canSee) | `api/light.ts:164` | `LightApi.canSee` returns `false` for a detached target. The shadow seam still fires for per-viewer overrides. |
| Mudlog routing | `api/message.ts:237, 411` | `MudlogApi.peers` walks no further. `messageContainer` warns once and returns; nothing is delivered. |
| Boundary (ExitableVessel) | `lib/boundary/ExitableVessel.ts:121, 161, 185` | `getExit` returns `undefined` for a detached vessel. The vessel is still reachable through its interior. |
| Light source notification | `lib/perception/LightSource.ts:156-168` | A detached LightSource emits no notifications. |
| Containment move | `api/containment.ts:107` | Detached → null is a no-op; detached → present follows the regular path with no `from` to remove from. |
| Mobile traversal | `lib/spatial/Mobile.ts:286` | A detached mover can `traverse`; no leaving-message fires (no `previous` to address). |
| Login | `obj/Login.ts:125` | If an avatar is detached at login time, the login frame announces "you are nowhere" and routes to `/void`. |

By behavior class: silently-skip / empty-result for the MQL stack and
command scoping; `false` for `canSee`; `undefined` for boundary
queries; warn-and-return for `messageContainer`. **Nothing throws.**
Code that throws on null-env is a bug — file the regression as a
matrix-invariant violation. Regression tests live in
`lib/spatial/__tests__/Containable.nullEnv.test.ts`.

## Locations

`lib/stuff/Location.ts` is the abstract base. Pure structural role:
"any Stuff that can hold other Stuff but doesn't itself live inside
something." `AdornableMixin(ContainerMixin(Stuff))`.

Concrete rooms layer Visible, Exitable, and a coordinate mixin on top:

- **`CartesianLocation`** = `Exitable(CartesianCoords(Visible(Location)))`.
  Overrides `addExit` (async — awaits zone resolution) per the
  **cardinal-only-intra-zone exit invariant**: cardinal directions
  (`north`/`south`/`east`/`west`/diagonals/`up`/`down`) are accepted
  unconditionally; non-cardinal labels (`portal`, `office`) are
  accepted only when the destination's templatePath resolves to a
  *different* zone than the source's. The check is eager and
  path-based — `ZoneApi.resolveZoneForPath` walks template ancestry
  to compute each side's zone without loading the destination room
  as a Stuff. Intra-zone non-cardinal exits throw with a diagnostic
  naming both seed paths and the shared zone. Per
  zone-architecture-slate § The cardinal-only-intra-zone exit
  invariant.
- **`SphericalLocation`** = `Exitable(SphericalCoords(Visible(Location)))`.
  No restrictions on `addExit` direction labels — spherical zones
  have no implicit adjacency, so semantic labels are the only way to
  author exits.

Both compose `VisibleMixin` so a `look` on the room returns its
description; `NamedMixin` is opt-in for rooms that take proper names
("Town Square").

Both override `getZone()` with a narrowed return type:
`CartesianLocation.getZone(): CartesianZone | null` and
`SphericalLocation.getZone(): SphericalZone | null`. The cast-by-
invariant lives at the boundary method (each `Zone.addLocation`
rejects mismatched coordinate types), so call sites within the
concrete location see the narrowed type for free —
`CartesianLocation.getSizeScale()` reads `getZone()?.getCellSize()`
without any local cast. See
[antipatterns.md § "instanceof, virtual methods, and cast-by-invariant"](../antipatterns.md)
for the underlying pattern.

## Coordinates

Two coordinate mixins, both pure data carriers. Grid registration and
neighbor lookups live on the `Zone`, not on the coordinate mixin.

**`CartesianCoordinatesMixin`** (`CartesianCoordinates.ts:24-50`):
`coordinates: [x, y, z]` plus `getX/Y/Z` and `setX/Y/Z` accessors.
Persistent (auto via `persistentFields = ['coordinates']`).

**`SphericalCoordinatesMixin`** (`SphericalCoordinates.ts:28-64`):
`coordinates: [rho, theta, phi]` (focus) plus `radius`. Persistent.
Default radius is `1.0`.

The setters round-trip through tuple-replacement (`setX(x)` returns a
new triple) so any reactive system watching `coordinates` sees a
single coherent change rather than three partial states.

## Zones

`Zone` (`Zone.ts:27-81`) is an abstract `Idea`. Every zone owns:

- `name: string` — human-readable ("Narnia Castle").
- `rooms: Set<Location>` — membership. Maintained by `addRoom` /
  `removeRoom`, with a back-reference stamped onto `room.zone`.
- Abstract `deriveExit(from, direction): Exit | undefined` — the
  zone-class-specific synthesis strategy.

### `CartesianZone`

`CartesianZone.ts`. Same-size grid cells with **derived** cardinal
exits.

- `addRoom(room, x, y, z)` (`:64-75`) — stamps `room.coordinates` from
  the supplied indices, indexes the room by `"x,y,z"` key, invalidates
  the derived-exit cache. The room must compose
  `CartesianCoordinatesMixin` or `addRoom` throws.
- `getNeighbor(from, direction)` (`:97-104`) — looks up the room at
  `from + offset(direction)`, where `offset` comes from
  `NavigationApi.directionOffset`.
- `deriveExit(from, direction)` (`:113-135`) — checks cardinality,
  membership, then synthesizes a one-way `Exit` from `from` to the
  neighbor cell. Cached per source per direction. Both endpoints must
  compose `ContainerMixin` (otherwise the Exit constructor's typing is
  unsatisfiable).

`cellSize` is informational only — meters/units per cell — unused by
the engine today. Reserved for future scale-aware tooling.

**Derived exits are never persisted.** They're a function of the grid
plus `NavigationApi`'s offset table; rebuilding them on boot is
trivial.

### `HomeZone`

`HomeZone.ts` (`lib/home/HomeZone.ts`). A bare `Zone` subclass with
no body (v1) — exists to anchor the per-player namespace at
`/home/`.

The `/home/` Zone template is created at boot from `seeds/home.yaml`.
The folder/leaf invariant requires a Zone-shaped template at every
internal node of the content tree, so anything stored under
`/home/<playerId>/...` needs `/home/` itself to be a real Zone
template — `HomeZone` is the class behind it.

Per-player sub-folders (`/home/<playerId>/`) are NOT seeded upfront.
They're created lazily the first time a feature needs them — e.g.
`EvalController` stamps its singleton at `/home/<playerId>/_eval`
without first materialising a `/home/<playerId>` Zone (paths in
`templatePath`-stamped Stuff don't go through the persistence
chokepoint).

The empty body is deliberate: future home-tier behaviour
(per-player permissions, quotas, customisation hooks) layers onto
this class without churning callers.

### `SphericalZone`

`SphericalZone.ts`. Spheres positioned by focus, **no implicit
adjacency**.

- `addRoom(room)` (`:42-48`) inherits the base placement and indexes
  by rounded focus tuple in a debug `focusIndex`. The index is for
  authoring tooling only — exit lookup never consults it.
- `deriveExit(_from, _direction)` (`:65-67`) **always returns
  `undefined`** by design. Angles between spheres are arbitrary; every
  exit must be authored by hand as a semantic label (`'office'`,
  `'plaza'`, `'portal'`).

### Zone resolution: `ZoneApi`

`api/zone.ts`. Single entry point for `templatePath → Zone`. Caching
is delegated to `StuffApi.singleton()` (Zones compose
`SingletonMixin`); ZoneApi just owns the ancestor walk.

**`ZoneApi.isFolderClass(classPath)`** answers "does this class count
as a zone folder?" — structural: `prototype instanceof Zone`. Any
Zone subclass — spatial (`CartesianZone`, `SphericalZone`) or
non-spatial (`Clade`, future taxonomic / permission scopes) — passes.
`TemplateApi` consults this for the folder/leaf invariant — see
[templates.md § TemplateApi & the Folder/Leaf Invariant](./templates.md#templateapi--the-folderleaf-invariant).

**`ZoneApi.isSpatialZoneClass(classPath)`** is the strict subset:
`prototype instanceof SpatialZone`. Only spatial Zones stamp
`Stuff.zone`; non-spatial Zones (Clade) are folders but never become
a `Stuff.zone` reference. Adding a new Zone subclass means
`extends Zone` (or `extends SpatialZone` if it's a topographical
flavor) — no central allow-list to edit. Both checks dynamic-import
the class once and cache the result.

`ZoneApi.resolveZoneForPath(templatePath)` walks ancestor paths
nearest-first, consulting `isSpatialZoneClass` to skip non-spatial
Zone ancestors (Clades) during the walk. Returns the singleton
SpatialZone at the first spatial-zone ancestor via
`StuffApi.singleton(ancestor)`. The second resolution for the same
zone path is an O(1) cache hit; first resolution clones. Returns
`null` when:

- The template at `templatePath` is itself a spatial Zone (a zone
  isn't inside itself).
- No ancestor resolves to a spatial Zone template.

The clone pipeline calls `resolveZoneForPath` once at clone time and
stamps the result onto `Stuff.zone` before hydrate, so anything
reading `this.zone` during `postRegister` sees the right value
(see [templates.md](./templates.md#clone-pipeline)).

#### Field inheritance via `ZoneApi.resolveZoneField`

For zone-carried defaults that should inherit through the template
tree, `ZoneApi.resolveZoneField<T>(zone, fieldName)` walks ancestry
nearest-first and returns the first non-null value defined on any
ancestor Zone. **Unlike `resolveZoneForPath`, the inheritance walk
treats every Zone subclass as an inheritance node** —  FolderZone,
HomeZone, Clade, and spatial zones alike. A `celestialProfile` field
set on a universe-root FolderZone is inherited by every spatial zone
beneath it. Returns `null` when nothing in the ancestry defines the
field; callers compose a settings-style default on top:

```ts
const profile =
  (await ZoneApi.resolveZoneField<CelestialProfile>(zone, 'celestialProfile'))
  ?? resolveSetting(host, 'world.zone.celestialProfile.default');
```

Field-read mechanism: the helper looks for `get<PascalCase>()` first
(the inter-Stuff contract surface), then falls back to direct
property access. Per zone-architecture-slate § Inheritance walk for
zone-carried fields.

### The setter-with-side-effects pattern

`CartesianLocation.setCoords({x, y, z})`, `SphericalLocation.setFocus({rho, theta, phi, radius})`,
and `Window.setAttachedHosts([pathA, pathB])` share a single
declarative-content shape: a public setter that **stores the value
AND performs cross-object side effects** atomically. The shape is:

1. Validate the input (TypeError on shape mismatch).
2. Resolve the dependency context (`getZone()` for coords/focus; both
   hosts via `StuffApi.singleton` for attachedHosts).
3. Check idempotency (zone already has this room at these coords?
   anchors already wired to these hosts?). If so, accept and no-op
   the side effect — only the storage assignment runs.
4. Check conflict (already at different coords / attached to
   different hosts?). If so, throw with a diagnostic naming both
   states.
5. Apply the side effect (`zone.addLocation(this, x, y, z)`,
   `BoundaryApi.attachExistingBoundary(...)`).
6. Store the value.

Idempotency makes re-hydrate / HMR-after-destruct / cycle-loop-self-call
safe. Conflict-throw catches drift between the YAML and the runtime
state. The setters are `async` because steps 2 and 5 may call
`await StuffApi.singleton(...)` to lazy-clone dependencies.

`coords` and `coordinates` are distinct fields by design: `coords`
(this build) is the YAML-shape declarative input `{x, y, z}` and
the setter's input shape; `coordinates` (on `CartesianCoordinatesMixin`)
is the runtime tuple `[x, y, z]` consumed by the zone grid. The setter
bridges them: `setCoords` calls `zone.addLocation(this, x, y, z)`,
which internally calls `setCoordinates([x, y, z])`. Unifying them is
out of scope here.

## Exits, Doors, Adornable, ExitableVessel

Moved out of `lib/spatial/` and into `lib/boundary/`. The full
architectural reference for these — exits, doors (now `Boundary`
subclasses), the `Adornable` / `Adornment` fixture surface, and
`ExitableVessel` (which composes `DoorBearing` and migrates the
vessel-door's `(vessel, env)` Boundary anchor pair on `setDoor` /
`onMoved`) — lives in [boundary.md](./boundary.md). Spatial keeps
the containers; boundary holds what connects them.

Locations and Vessels compose `AdornableMixin` so their
`getFixtures()` collection can host `BoundaryAnchor`s; that is
the only Boundary detail that lives in this doc.
## Locomotion: `MobileMixin`

`lib/spatial/Mobile.ts`. The mover's side of movement. Composed by
Avatar today; future NPCs and vehicles will compose it too.

Base constraint: `MixinConstructor<Stuff & Containable>` — a mobile
thing that cannot be contained is nonsensical.

### Two modes: `traverse` and `teleport`

**`traverse(exit, mode)`** — exit-driven movement under a named
locomotion mode (short name: `'walk'`, `'climb'`, `'swim'`, …). `mode`
is required at the API. Pipeline:

1. **Mode-gate:** `exit.canTraverse(this, mode)` — checks blocked /
   door / `Exit.allowsMode(mode)` (mode's medium ∈ exit's `media`).
   Throws `ContainmentError` on rejection (programmatic-violation
   policy; player-input paths pre-check via
   `LocomotionApi.canTraverseExit`).
2. **Traversal vetoes:** `canTraverse` on the mover, `canExit` on the
   source room, `canEnter` on the destination room. First veto throws
   `ContainmentError`.
3. **Departure narration:** `announceDeparture(source, exit)`.
4. **State change:** `ContainmentApi.move(mover, destination)` —
   which fires its own containment-layer hooks (`canMove` /
   `canRemoveContainable` / `canAddContainable` / etc.).
5. **Arrival narration:** `announceArrival(destination, exit)`.
6. **Conveyance ripple:** for each occupant of the mover's slots,
   recursively `traverse(exit, mode)` if Mobile+Containable, else
   `ContainmentApi.move(occupant, destination)`. See
   [conveyance.md § Conveyance ripple](./conveyance.md#conveyance-ripple).
7. **Traversal post-hooks:** `onExited` (source), `onEntered`
   (destination), `onTraversed` (mover).

The `go` verb routes through `LocomotionApi.defaultModeFor(actor)` —
a three-tier chain (explicit setting → bodyplan default → `'walk'`)
— rather than the older `resolveSetting` shape. Literal mode verbs
(`walk`, `climb`, `swim`, `fly`, `ride`, `drive`) extend
`LocomotionControllerBase` with a one-line `modeName()` override. See
[locomotion.md](./locomotion.md).

**`teleport(destination, opts?)`** — Exit-less
move. Default narrates departure + arrival; pass `{ silent: true }`
to suppress both. Login spawning uses `silent: true`: a newly cloned
avatar shouldn't be announced as "vanishing from nowhere" or
"appearing out of thin air" before the player has even seen the room.

### Movement-message resolution

`announceDeparture` / `announceArrival` compose a Scene at
`world.narration.movement` (with Exit) or `world.narration.teleport`
(without). The body resolution is a precedence chain:

`resolveDepartureMessage`, `resolveArrivalMessage`:

1. **`Exit.messageOut` / `messageIn`** — Liquid template, simplest
   override. `{{ mover }}` is bound to the mover's `Mml.name`. Used
   by the vessel's synthesized exits for "Alice enters the wardrobe."
2. **Per-room hook:** `from.getDepartureMessage?(mover, exit)` /
   `to.getArrivalMessage?(mover, exit)` — returns
   `{ self?, peers? }`. Anything missing from the return value falls
   back to step 4. Same shape but `getTeleportOutMessage` /
   `getTeleportInMessage` for the no-Exit case.
3. **Mobile defaults:** `defaultDepartureSelf` etc. — read settings
   from the mover via `resolveSetting` (the cross-host helper from
   [shell-environment.md](./shell-environment.md)). The defaults are
   declared as a `static settings` schema on the mixin
   (`Mobile § settings`) — eight keys covering self/peers × depart/
   arrive × walk/teleport, with Liquid variables `{{ mover }}` and
   `{{ direction }}`.

The schema-on-mixin pattern means an Avatar (which composes
EnvironmentMixin) can override individual keys via the `settings`
command, while NPCs and vehicles render at the schema default through
`resolveSetting`'s non-Environment fallback.

`dispatchMovementScene` sends the resolved
bodies: `toSelf` only when the mover is itself a `Sensor` (a future
vehicle carrying passengers might not be); `toPeers` always.

### Witness hooks summary (movement)

| Hook | On | Fires from |
|---|---|---|
| `canTraverse(via)` | mover | `Mobile.traverse` (pre) |
| `canExit(mover, via)` | source room | `Mobile.traverse` (pre) |
| `canEnter(mover, via)` | dest room | `Mobile.traverse` (pre) |
| `onExited(mover, via)` | source room | `Mobile.traverse` (post) |
| `onEntered(mover, via)` | dest room | `Mobile.traverse` (post) |
| `onTraversed(via)` | mover | `Mobile.traverse` (post) |
| `canMove(to)` | item | `ContainmentApi.move` (pre) |
| `canRemoveContainable(item)` | source container | `ContainmentApi.move` (pre) |
| `canAddContainable(item)` | dest container | `ContainmentApi.move` (pre) |
| `onContainableRemoved(item)` | source container | `ContainmentApi.move` (post) |
| `onContainableAdded(item)` | dest container | `ContainmentApi.move` (post) |
| `onMoved(from, to)` | item | `ContainmentApi.move` (post) |

The traversal layer fires from `Mobile.traverse` and is exit-aware.
The containment layer fires from `ContainmentApi.move` and runs
regardless of whether an Exit was involved (so `teleport` and
`StuffApi.clone`-then-place still trigger the containment hooks).

### Conveyance ripple

After `ContainmentApi.move(mover, destination)` and
`announceArrival`, `Mobile.traverse` walks the immediate level of
the mover's slot map and ripples each occupant by capability:
Mobile occupants `traverse(exit, mode)` so they announce their own
arrival; non-Mobile occupants fall back to `ContainmentApi.move`
silently (the container model). A veto on a rider's `canTraverse`
leaves them behind without aborting the host. The chain self-
recurses through each Mobile occupant's own `traverse()` call, so
the saddle-on-horse-with-rider-with-backpack case just works.

The ripple makes mounts work: a horse moving carries any rider in
its mount slot, and a saddle on a horse with a rider in the saddle
ripples through both layers. See
[conveyance.md](./conveyance.md) for the full story.

### `engagedMode` and the slot-release witness

`MobileMixin` carries a runtime-only `_engagedModePath: string | null`
field (NOT in `persistentFields` — a reloaded actor wakes up
unengaged). `getEngagedMode()` resolves it via the singleton cache;
`setEngagedMode(mode)` stores `mode.getTemplatePath()`.
`isEngagedIn(mode | name)` is polymorphic — accepts either the
singleton or a short-name / full-path string.

`LocomotionApi.engageAround(actor, mode, exit, action)` is the
canonical engagement scope: it sets engagedMode, runs the inner
traversal, then conditionally clears engagedMode based on
`isTransientEngagement(mode, exit)` — passthrough modes (ride / drive)
stay set; walk / vehicular modes clear; climb / swim / fly clear if
the destination doesn't still expose the relevant enablement.

`Mobile.onSlotReleased(host, slotName)` is the witness invoked
synchronously by `Slotted.vacate`. The default body clears
engagedMode when the mode is passthrough AND the vacated host
composes the engaged mode's `conveyanceMixin`. A dismounting rider's
engagement clears automatically without controller-side bookkeeping.
See [locomotion.md § Engagement lifecycle](./locomotion.md#engagement-lifecycle).

### Location floors

Floors are first-class entities — `Adornment`s on the Location's
`Adornable` surface, composing `Postured` (see
[posture.md](./posture.md)). v1 ships no class-level default;
floor presence is authored per-Location in the `adornments` map.

```yaml
# Default Location includes the default floor:
adornments:
  floor: { extends: '/idea/surface/default-floor' }

# Voids omit it, marked with the `noDefaultFloor` opt-out so the
# migration script doesn't auto-add one:
data:
  noDefaultFloor: true
```

## Direction Vocabulary: `NavigationApi`

`api/navigation.ts`. The canonical direction table for cartesian
zones. Spherical and vessel directions live outside this table —
callers treat an `undefined` result as "not cardinal, try as a
semantic label."

The 10 cardinals: `north`, `south`, `east`, `west`, the four diagonals
(`northeast` / `northwest` / `southeast` / `southwest`), `up`, `down`.
Each has:

- A long-form name (canonical).
- Single-letter and two-letter aliases (`n`, `ne`, `u`, ...).
- A `[dx, dy, dz]` offset. **`y` grows north** (matches map-up
  convention); **`z` grows up** (standard).
- A canonical inverse (`north ↔ south`, `up ↔ down`, etc.).

Public methods (all on `NavigationApi`):

- `normalizeDirection(input)` → canonical `CardinalDirection` or
  `undefined`. Trims and lowercases.
- `invertDirection(direction)` → canonical inverse, or `undefined` for
  non-cardinals.
- `directionOffset(direction)` → `[dx, dy, dz]` triple, or `undefined`.
- `isCardinalDirection(direction)` → boolean.
- `cardinalDirections()` → readonly array of all 10.

Used heavily: `CartesianLocation.addExit` validates against
`isCardinalDirection`; `CartesianZone.deriveExit` and `getNeighbor`
go through `normalizeDirection` and `directionOffset`;
`Exitable.addBidirectionalExit` uses `invertDirection` for inferred
opposites; `MobileMixin`'s arrival resolver uses `invertDirection`
for "arrives from the south."

## Loading and Lifecycle

Three runtime mechanisms that operate across the spatial layer at load,
traversal, and destroy time. They all rest on the singleton index in
`StuffApi` (the `byTemplatePath` Map).

### Singleton infrastructure

`StuffApi.singleton(path)` is a generic cache-or-clone tool. It walks
`byTemplatePath`, returns the unique live instance for `path` if any,
otherwise routes through `clone()`. Throws on multi-instance
collision (caller mixed `clone()` and `singleton()` on a class that
doesn't compose `SingletonMixin`).

`SingletonMixin` (`lib/stuff/Singleton.ts`) is the enforcement layer.
Composing classes refuse a second `clone()` for the same templatePath
— the pre-flight in `clone()` checks `MixinApi.hasMixin(cls,
Mixins.Singleton)` against `byTemplatePath`. This makes the framework
itself the single source of truth for "is there already an instance
for this path?", not the call site.

Today, `CartesianZone` and `SphericalZone` compose SingletonMixin —
each zone template has at most one live instance. `ZoneApi` gets path
caching for free via `StuffApi.singleton` and no longer carries its
own bookkeeping. Content authors who need "this Location is unique
by path" (Town Square, the Vault) compose SingletonMixin on their
specific subclass; the base `Location` is deliberately not singleton
so that future `MultiLocation` patterns (procedural deserts,
self-rearranging chambers) can produce many instances per template.

### Destroy choreography

`StuffApi.destruct(stuff)` runs `stuff.prepareDestroy()` and then
`stuff.destroy()`. Spatial-side `prepareDestroy` implementations:

- **`Location.prepareDestroy()`** detaches from the owning Zone
  (`zone.removeLocation(this)`), clearing coordinate-keyed
  indexes (CartesianZone grid, SphericalZone focusIndex).
  Concrete subclasses inherit. `ExitableMixin.prepareDestroy`
  (lib/boundary/) chains here after handling the exit-side
  teardown — see [boundary.md § Doors](./boundary.md#doors) and
  [boundary.md § Exits](./boundary.md#exits).
- **`Zone`:** refuse to destruct while non-empty — caller drains
  rooms first. `CartesianZone` additionally clears
  `derivedCache`.
- **`AdornableMixin`** (composed on Location and Vessel) walks
  `getFixtures()` and destructs each. See
  [boundary.md § Adornable / Adornment](./boundary.md#adornable--adornment).

## Persistence Notes

The spatial subsystem is mostly auto-persistent through
`persistentFields`:

- `CartesianCoordinatesMixin`: `coordinates`.
- `SphericalCoordinatesMixin`: `coordinates`, `radius`.
- `SealableMixin`: `isOpen`.
- `Zone` subclasses: `name` (and `cellSize` on Cartesian).
- `Vessel`: empty list — Vessel itself adds nothing persistent beyond
  what its mixins contribute.

Two intentional non-persistents:

- **Derived exits** are never persisted. They're a pure function of
  the grid and `NavigationApi`'s offsets — recomputed on boot.
- **`Containable.environment`** is NOT in `persistentFields` (see
  `Containable.ts:71-76`). It's a reference to another Stuff; the
  classes that compose Containable must declare a custom
  `persistenceHandler` to choose how to serialize the reference.
- **`zone`** on every Stuff is runtime-only today. The authoritative
  source is the `domain` template path — see
  [state-model.md § Stamped-on-Stuff Fields](./state-model.md#stamped-on-stuff-fields).

## Cross-References

- [architecture.md § Class Hierarchy](../architecture.md#class-hierarchy)
- [architecture.md § Available Mixins](../architecture.md#available-mixins)
- [antipatterns.md](../antipatterns.md) — `ContainmentApi.move` over
  raw `setContainer`, `creature.travel()` over `creature.move()`.
- [templates.md § Clone Pipeline](./templates.md#clone-pipeline) —
  zone resolution at clone time.
- [state-model.md § Paths and Collections](./state-model.md#paths-and-collections)
- [messaging.md](./messaging.md) — Scene composer used by Mobile.
- [prose.md](./prose.md) — Liquid templating used by `Exit.messageOut`
  and the Mobile default settings.
- [shell-environment.md § resolveSetting](./shell-environment.md) —
  cross-host setting resolution used by Mobile defaults.
- [light.md](./light.md) — the Light & Boundary subsystem on top of
  Door, Adornable, and the per-room walks.
- [perception.md](./perception.md) — viewer-aware-query pattern.
