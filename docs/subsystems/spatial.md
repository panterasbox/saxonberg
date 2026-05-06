# Spatial Subsystem

How the world is shaped: rooms, zones, exits, doors, portable
containers, and the locomotion that ties them together. This is the
densest subsystem in `lib/` — the one most likely to surprise a new
contributor — so this doc covers the whole layer in one place rather
than scattering it across class JSDoc.

Sibling docs cover related ground without overlap:

- [templates.md](./templates.md) — clone pipeline,
  `ZoneApi.resolveZoneForPath`, the folder/leaf invariant on `domain`.
- [state-model.md](./state-model.md) — the universal `zone` field
  stamped on every Stuff, why it follows template path rather than
  current container.
- [messaging.md](./messaging.md) — Scene composer, sensor routing.
  Movement narration sits on top of this.
- [prose.md](./prose.md) — the Liquid templating used by
  `Exit.messageOut` / `messageIn` and the Mobile default settings.
- [properties.md](./properties.md), [mixins.md](./mixins.md) — the
  general mechanics that let mixins carry persistent fields.

## The Cast

| Type | Kind | Role |
|---|---|---|
| `Location` | concrete class | Base for any Stuff that holds Stuff but isn't itself contained. `ContainerMixin(Stuff)`. |
| `CartesianLocation` | concrete class | Room living at integer `[x,y,z]` in a `CartesianZone` grid. Cardinal exits only. |
| `SphericalLocation` | concrete class | Sphere positioned by focus inside a `SphericalZone`. Semantic exits only. |
| `Zone` | abstract class | First-class subdivision of the world. Owns its rooms and a `deriveExit()` strategy. |
| `CartesianZone` | concrete class | Same-size-cell grid. Derives cardinal exits from adjacency. |
| `SphericalZone` | concrete class | Spheres-with-radius space. No implicit adjacency — every exit is authored. |
| `Exit` | concrete `Idea` | One-way passage between two `Container & Exitable` endpoints. Carries direction, lazy-resolvable destination, optional door, `oneWay` flag, traversal flags, and custom messages. |
| `Door` | concrete `Thing` | Shared open/closed state. As a `Thing` it has Containable, so a broken/detached door can live in a Location's contents and be picked up. `attachedTo: Set<Exit>` is the runtime back-reference. |
| `Vessel` | top-level branch | A *mobile place* — Container + Containable. Sibling of Thing / Location / Idea / Agent / Persistable / Shadow; lives in `lib/stuff/`. Concrete vessels: chests, packs, ships, vehicles. |
| `ExitableVessel` | concrete class | A Vessel you can enter. Composes `DoorBearingMixin`. Synthesizes `'out'` / entry exits on demand, optionally carrying the vessel's door. |
| `ContainerMixin` | mixin | Inventory side: `addContainable` / `removeContainable` / `getContents`. |
| `ContainableMixin` | mixin | Lives-inside side: `environment`, `setContainer`. |
| `ExitableMixin` | mixin | Explicit exit map + zone-delegated lookup; `addExit` wires `Door.attachedTo`. |
| `MobileMixin` | mixin | Locomotion: `traverse` (async)/`teleport` and movement narration. |
| `CartesianCoordinatesMixin` | mixin | `[x,y,z]` data carrier. |
| `SphericalCoordinatesMixin` | mixin | `[rho,theta,phi] + radius` data carrier. |
| `SealableMixin` | mixin | Binary `isOpen` state. Used by `Door`; reusable for chests, trapdoors, envelopes. |
| `DoorBearingMixin` | mixin | Adds a `door` field for hosts whose exits are synthesized rather than authored (`ExitableVessel`). Constrained to `Stuff & Exitable`. |
| `SingletonMixin` | mixin | Class-level uniqueness: composing classes refuse a second `clone()` for the same `templatePath`. Composed by `CartesianZone` and `SphericalZone`. |
| `ZoneApi` | static API | Resolves `templatePath → Zone` via `StuffApi.singleton`. Caching is delegated; ZoneApi just owns the ancestor walk. |
| `StuffApi.singleton(path)` | static API | Cache-or-clone tool for any class. Pairs with `SingletonMixin` for enforced uniqueness. |
| `ContainmentApi` | static API | The single public surface for moving Stuff between containers. |
| `NavigationApi` | static API | Direction normalization, aliases, grid offsets, inverses. |

## Class Hierarchy

```
Stuff (one of seven top-level branches — see architecture.md)
  ├── Idea
  │     ├── Zone (abstract)
  │     │     ├── CartesianZone     (Singleton + grid + derived adjacency)
  │     │     └── SphericalZone     (Singleton + focus index, no derivation)
  │     └── Exit                    (data + canTraverse() guard, lazy destination)
  ├── Location                      (ContainerMixin(Stuff))
  │     ├── CartesianLocation       (PostRegistration + Exitable + CartesianCoords + Visible)
  │     └── SphericalLocation       (PostRegistration + Exitable + SphericalCoords + Visible)
  ├── Thing                         (ContainableMixin(Stuff))
  │     └── Door                    (Visible + Perceptible + Sealable + Containable)
  ├── Vessel                        (ContainerMixin(ContainableMixin(Stuff)))
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
"don't manually call setEnvironment + addContainable" rule.

### `zone` is NOT restamped on move

By design (`containment.ts:64-69`). The authoritative source for zone
membership is the `domain` template path at clone time, not the
current container. Cross-zone movement of Exitables is blocked at
pre-flight; non-Exitable Stuff (an Avatar walking from a Narnia room
into a Caves room) keeps its original `zone` reference, which is
the right answer — see [state-model.md § Stamped-on-Stuff Fields](./state-model.md#stamped-on-stuff-fields).

## Locations

`lib/stuff/Location.ts` is the abstract base. Pure structural role:
"any Stuff that can hold other Stuff but doesn't itself live inside
something." `ContainerMixin(Stuff)` and nothing else.

Concrete rooms layer Visible, Exitable, and a coordinate mixin on top:

- **`CartesianLocation`** = `Exitable(CartesianCoords(Visible(Location)))`.
  Overrides `addExit` to reject any non-cardinal direction
  (`CartesianLocation.ts:32-39`) — you cannot author `addExit('portal')`
  on a grid cell because the grid topology guarantees a known inverse
  for every direction. Labeled exits belong on Spherical or Vessel.
- **`SphericalLocation`** = `Exitable(SphericalCoords(Visible(Location)))`.
  No restrictions on `addExit` direction labels.

Both compose `VisibleMixin` so a `look` on the room returns its
description; `NamedMixin` is opt-in for rooms that take proper names
("Town Square").

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

`ZONE_CLASS_PATHS` is the whitelist of class paths that count as zone
folders:

```typescript
export const ZONE_CLASS_PATHS = new Set<string>([
  '/lib/spatial/CartesianZone',
  '/lib/spatial/SphericalZone',
]);
```

Adding a new Zone subclass = one line here. `TemplateApi` shares the
same set to enforce the folder/leaf invariant on `domain` — see
[templates.md § TemplateApi & the Folder/Leaf Invariant](./templates.md#templateapi--the-folderleaf-invariant).
This set is **structural** (which template kinds aggregate descendants),
distinct from `SingletonMixin` composition (which classes are
unique-per-templatePath); the two happen to overlap today but should
not be conflated when adding new template kinds.

`ZoneApi.resolveZoneForPath(templatePath)` walks ancestor paths
nearest-first; returns the singleton Zone of the first ancestor whose
template names a Zone class via `StuffApi.singleton(ancestor)`. The
second resolution for the same zone path is an O(1) cache hit; first
resolution clones. Returns `null` when:

- The template at `templatePath` is itself a Zone (a zone isn't inside
  itself).
- No ancestor resolves to a Zone template.

The clone pipeline calls `resolveZoneForPath` once at clone time and
stamps the result onto `Stuff.zone` before hydrate, so anything
reading `this.zone` during `postRegister` sees the right value
(see [templates.md](./templates.md#clone-pipeline)).

## Exits

`lib/spatial/Exit.ts`. An `Exit` is a first-class `Idea` — runtime
identity, but no physical presence in any room's inventory. An Exit
carries the following slots; **external callers use the `getX()` /
`setX()` method pair** (per the inter-stuff contract — see
[CLAUDE.md § Inter-Stuff Contract: Methods Only](../../CLAUDE.md)),
not direct field access:

- `direction: string` — cardinal long-form (`'north'`, `'up'`),
  semantic label (`'office'`), or vessel-synthesized (`'out'`, `'in'`).
- `source: Stuff & Container` — the Exitable this exit leaves from.
- `destination` — either a live `Stuff & Container` ref OR a
  `destinationPath: string` (templatePath) that resolves lazily via
  `StuffApi.singleton()`. The synchronous `getDestination()` resolves
  from the singleton cache when possible; if the path-only form is
  unloaded, it throws and the caller must `await exit.resolveDestination()`
  first. `MobileMixin.traverse` does this.
- `door: Door | null` — optional. Both sides of a bidirectional pair
  reference the same instance. `setDoor()` / `addExit` / `removeExit`
  maintain `Door.attachedTo`.
- Flags: `hidden`, `blocked`, `muffled` (reserved), `noFollow`
  (reserved), `oneWay`.
- Optional Liquid templates: `messageOut` (departure narration to
  source-side audience) and `messageIn` (arrival narration to
  destination-side audience).
- `inverse?: Exit` — counterpart on the other side, wired by
  `addBidirectionalExit` at construction OR by the mutual-exit
  verifier when both ends are loaded. `undefined` for one-way exits,
  vessel `'out'` exits, and unwired pairs.

`Exit.canTraverse(mover)` is the only guard on the Exit itself:
rejects when `blocked` or when an attached door is shut. The mover
argument is reserved for future hooks (stamina, permissions) and
unused today.

**`oneWay`** opts an Exit out of the mutual-exit invariant — portals,
teleporters, one-way valves. The verifier skips these. Forgetting to
author the back side of an ordinary bidirectional exit should NOT set
this flag; the verifier exists to catch that mistake.

### Lookup precedence: `ExitableMixin.getExit`

`ExitableMixin` (`Exitable.ts`) is composed by `CartesianLocation`,
`SphericalLocation`, and `ExitableVessel` — the three navigable
container kinds. It owns the explicit `exits: Map<direction, Exit>`
and the merged-lookup algorithm.

`getExit(direction)` merges in this order:

1. **Explicit map.** Wins absolutely. If you authored
   `addExit({direction:'north', ...})`, that's what `'north'` returns
   regardless of grid neighbor.
2. **Subclass hook.** `ExitableVessel.getExit` overrides to handle
   `direction === 'out'` (`ExitableVessel § getExit`) before falling
   through.
3. **Zone-derived.** `getExit` calls `zone.deriveExit(this, direction)`
   when the zone is a `CartesianZone`. SphericalZone always returns
   `undefined`, so the third step is effectively cartesian-only.
4. `undefined`.

`getObviousExits()` is the union used by
`look`. Walks explicit exits first, then iterates the 10 cardinals
through `zone.deriveExit` for any direction not already explicit.
Filters by `!exit.hidden`.

`getExitDoors()` collects every non-null
`exit.door` reachable through `getObviousExits` — used by MQL so a
player can target a door by keyword without it living in an inventory.

### Bidirectional exits

`Exitable.addBidirectionalExit(other, direction, opts?)`
installs both sides in one call:

- For cardinal `direction`, the opposite is inferred via
  `NavigationApi.invertDirection`. For semantic labels (vessel
  keywords, spherical names) the caller MUST pass `opts.opposite`.
- A shared `door` reference is installed on both sides — opening from
  either room flips one state.
- `forward.inverse = back` and `back.inverse = forward` are wired so
  Mobile's arrival-message resolver can reach `exit.inverse?.direction`
  for "Alice arrives from the south" without a separate cross-room
  lookup.

One-way exits use `addExit` and leave `inverse` undefined.

## Doors and Sealables

### `SealableMixin`

`lib/spatial/Sealable.ts`. Binary open/closed state, intentionally
narrow.

- `isOpen: boolean` — backed by `_isOpen`. Default closed. The setter
  rejects non-boolean assignments with `TypeError`
  (`Sealable § isOpen accessor pair`); since the `Hydrator` bracket-assigns through
  setters, a malformed template (`isOpen: 1`) crashes loudly at
  hydrate time rather than coercing silently at runtime.
- `open()` / `close()` — idempotent. Persistent (`isOpen`).

Locks, keys, and unlock commands are deliberately out of scope. Doors
are the canonical sealable, but the concept generalizes — chests,
trapdoors, windows, envelopes can compose Sealable directly.

### `Door`

`lib/spatial/Door.ts`. Composition:
`VisibleMixin(PerceptibleMixin(SealableMixin(Thing)))`.

A Door is a `Thing` — Visible + Perceptible + Sealable + Containable.
The Containable composition is what enables broken/unhinged doors to
become inventory items: in the **attached** state `door.environment`
is `null` and the door is reachable only through the `Exit.door`
references that track it; in the **detached** state (broken, removed,
carried) the door is moved into a Location or Avatar via
`ContainmentApi.move` and appears in that container's `getContents()`.

The same physical door is referenced by potentially many Exits (the
canonical case is two — forward + back). The `attachedTo: Set<Exit>`
field on `Door` is the runtime back-reference, populated by:

- `ExitableMixin.addExit` when the exit it accepts has a non-null
  `door`.
- `ExitableMixin.addBidirectionalExit` indirectly, since the pair of
  Exits it constructs each get added through `addExit`.
- `ExitableVessel`'s synthesized exit factories (`'out'`, `'in'`)
  when `vessel.door` is non-null.

…and unwired by `removeExit`, by `Exit.prepareDestroy`, by
`vessel.setDoor` cache invalidation, and by `Door.detach()`.

**`Door.detach()`** walks `attachedTo`, clears each Exit's `door`,
empties the set. The caller follows with
`ContainmentApi.move(door, location)` to plant the broken/removed
door somewhere in the world. Reinstalling reverses the steps:
`ContainmentApi.move(door, null)` (or to a new attachment site)
plus a fresh `addBidirectionalExit(other, dir, { door })`.

`Door.getKeywords()` overrides Perceptible to union the explicit
keyword list with tokens of the `shortDescription`. So a door
authored with only `shortDescription: 'heavy oak door'` is targetable
as `oak` / `door` without re-listing those as keywords.

Doors are template-loadable: clone from a `domain` template via
`StuffApi.clone()` with
`hydratorClass: '/lib/persistence/PersistentHydrator'`.

`Door.prepareDestroy()` calls `detach()` first, so destructing a Door
clears every Exit's reference to it.

## Vessels

### `Vessel`

`lib/stuff/Vessel.ts`. **One of the seven top-level branches** — a
*mobile place*, sibling of `Thing` / `Location` / `Idea` / `Agent` /
`Persistable` / `Shadow`. Composition:
`ContainerMixin(ContainableMixin(Stuff))`. A Vessel holds stuff
(Container) and lives somewhere itself (Containable). No inheritance
edge to `Thing` — vessels aren't items; "is this place-like?" /
"is this item-like?" questions go through `MixinApi.isContainer` /
`isContainable`, not `instanceof`. See
[architecture.md § Top-level branches](../architecture.md#top-level-branches)
for the full rationale.

Concrete vessels (chests, packs, ships, vehicles) extend `Vessel` and
layer on whatever they need (`VisibleMixin` for description,
locked-chest behavior, bag-of-holding magic, etc.).

### `ExitableVessel`

`lib/spatial/ExitableVessel.ts`. An *enterable, door-capable* vessel:
`DoorBearingMixin(ExitableMixin(VisibleMixin(Vessel)))`. Container +
Containable + Exitable + DoorBearing + Visible.

**Containment constraint** (enforced in `ContainmentApi.move`):
an `ExitableVessel` may only land inside another Exitable. This is
the exploit-closer: vessels with player-traversable interiors cannot
end up in an Avatar's inventory, even empty. Loose `Vessel`s (chests,
packs) have no such restriction — they CAN sit in inventories.

#### Synthesized `'out'` and entry exits

A vessel that's been placed somewhere needs a way out — but the
target depends on where the vessel currently is, so the exit can't be
pre-authored. ExitableVessel synthesizes two exits on demand:

- `getExit('out')` — the inside-to-outside edge. Source = vessel;
  destination = vessel's current `environment`. Direction `'out'`.
- `getEntryExit()` — the outside-to-inside edge. Source =
  current environment; destination = vessel. Direction `'in'`. Used
  by `go <vessel-keyword>` so the GoController doesn't hand-build an
  Exit.

Both pick up the vessel's `door` (from `DoorBearingMixin`) at
construction time. If `vessel.door` is non-null, the synthesized
exits carry that door reference and the synth exits are registered
in `door.attachedTo` — so a closed wardrobe door blocks `go out` /
`go wardrobe`, and `Door.detach()` walks back to the synth exits
exactly as it does for explicit exits.

Both are cached and **invalidated** in two situations:

1. **Vessel moves** — `onMoved` (Witness hook) fires once per
   transition; the cached exits are dropped (and unhooked from
   `door.attachedTo`) so the next access recreates them with the new
   environment.
2. **Vessel's door changes** — `setDoor(door)` invalidates the same
   way so the next access uses the new door (and registers it in the
   new door's `attachedTo`).

The synthesized `'out'` exit is added to `getObviousExits` output, so
`look` from inside the vessel mentions it.

#### `DoorBearingMixin`

`lib/spatial/DoorBearing.ts`. Adds `door: Door | null` (runtime-only,
**not** in `persistentFields` — a `Door` is a separate Stuff and
the generic hydrator's bracket-assign cannot round-trip a Stuff
reference; composing classes that need door identity to survive
restart own that via a custom `persistenceHandler`, the same shape
`Containable.environment` uses), `getDoor()`, and a default
`setDoor()` that just updates the field. Bound to `Stuff & Exitable`
because a door without an exit doesn't make sense; the constraint
enforces the layering at compile time.

ExitableVessel overrides `setDoor` to additionally invalidate the
synthesized-exit caches — the default mixin implementation is enough
for hosts whose exits are all explicit (where `addExit`/`removeExit`
already wire `attachedTo`). Future single-defining-door Locations
(gatehouse, vault) compose the mixin and rely on the default.

## Locomotion: `MobileMixin`

`lib/spatial/Mobile.ts`. The mover's side of movement. Composed by
Avatar today; future NPCs and vehicles will compose it too.

Base constraint: `MixinConstructor<Stuff & Containable>` — a mobile
thing that cannot be contained is nonsensical.

### Two modes: `traverse` and `teleport`

**`traverse(exit, mode)`** — exit-driven movement under a named
locomotion mode (`'walk'`, `'run'`, `'climb'`, …). `mode` is required
at the API; `go` resolves its value from the `movement.defaultMode`
setting (declared on `MobileMixin`, schema-defaulted to `'walk'`),
explicit-verb controllers pass their own verb. Mode threads through
the call but isn't yet wired into narration or per-exit validation —
see the TODO in `Mobile.traverse`.
Two-layer hook dispatch:

1. **Traversal vetoes:** `canTraverse` on the mover, `canExit` on the
   source room, `canEnter` on the destination room. First veto throws
   `ContainmentError`.
2. **Departure narration:** `announceDeparture(source, exit)`.
3. **State change:** `ContainmentApi.move(mover, destination)` —
   which fires its own containment-layer hooks (`canMove` /
   `canRemoveContainable` / `canAddContainable` / etc.).
4. **Arrival narration:** `announceArrival(destination, exit)`.
5. **Traversal post-hooks:** `onExited` (source), `onEntered`
   (destination), `onTraversed` (mover).

The Phase 7 contract: callers (typically `GoController`) have already
validated traversal via `exit.canTraverse(mover)` — that's the door's
"is this passable?" gate. The Witness hooks here layer additional
pre-move vetoes, not a replacement.

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

### Lazy Exit destination resolution

An Exit can be authored two ways:

- With a live `destination` ref — the historical case. Used by
  `addBidirectionalExit`, `CartesianZone.deriveExit`, vessel
  synthesizers, and runtime tests.
- With a `destinationPath` — a templatePath string. Resolves on first
  `await getDestination()` via `StuffApi.singleton(path)`. Cached
  thereafter on the Exit instance.

The synchronous `destination` getter consults the singleton cache
first; if the destination is loaded it caches and returns. If only a
path is set and the destination isn't loaded, the getter throws —
async-aware callers (`Mobile.traverse`) `await getDestination()`
before reading. `Exit.getDestinationTemplatePath()` returns the path
regardless of resolution state, used by the verifier.

This is what makes lazy Location loading work. Exits authored across
Locations don't force the destination Location to clone at content
load time; the destination is materialized when traversal forces it.

### Mutual-exit verification

The framework requires every authored exit to have a matching back-
exit on its destination, modulo the explicit `oneWay` flag. Content-
authoring tools should catch most asymmetries at save time. Runtime
catches what slips through, and wires `inverse` pointers as a
side-effect.

`ExitableMixin.verifyOutboundExits()` (instance method on every
Exitable) walks the **per-exit `_pendingVerify` set** — the subset of
`this.exits` that was flagged at `addExit` time as having work the
verifier could do (path-only destination or unsettled inverse).
Settled exits are evicted from the set so subsequent calls are
cheap. For each pending exit:

- Skip if `oneWay`, already-`inverse`-wired, or non-cardinal direction.
- Look up destination's templatePath in `byTemplatePath`. If not
  loaded, leave it pending (the other side's load will run the
  verifier).
- If loaded, query `destination.getExit(invert(direction))`:
  - **Match** (back-exit's destination is `loc`): wire
    `forward.inverse = back`, `back.inverse = forward`, and evict
    from `_pendingVerify` — but only when both are explicit (in
    their respective `exits` map; derived cartesian exits are
    recreated per-call and inverse pointers to them would dangle).
  - **Mismatch** or **missing**: set `forward.blocked = true`, log
    a warning, evict from `_pendingVerify`.

`hasPendingVerification()` exposes the set's emptiness so the
traversal-time fallback can short-circuit when nothing's pending.

Fires from two places:

- **Load-time:** `CartesianLocation.postRegister` and
  `SphericalLocation.postRegister` invoke the verifier as part of
  the clone pipeline. Whichever side of a pair loads second gets the
  wire-up.
- **Traversal-time fallback:** `MobileMixin.traverse` calls the
  verifier on the source location after resolving the destination.
  Catches pairs whose load-time verification couldn't fire because
  the destination wasn't loaded yet, and wires up the inverses
  before traversal proceeds.

The verifier is idempotent — already-wired exits short-circuit.

### Destroy choreography

`StuffApi.destruct(stuff)` runs `stuff.prepareDestroy()` and then
`stuff.destroy()`. The spatial subsystem implements `prepareDestroy`
across four classes:

- **`ExitableMixin.prepareDestroy()`** handles the exit-side
  teardown:
  1. Mark each `exit.inverse?.blocked = true` so neighbors can't
     traverse here once we're gone.
  2. Destruct each owned outbound exit. `Exit.prepareDestroy()`
     clears the inverse-side back-pointer so neighbors don't retain
     dead references.
  3. Empty `exits`.
  4. `super.prepareDestroy()` chains to **`Location.prepareDestroy()`**
     which detaches from the owning Zone (`zone.removeRoom(this)`),
     clearing coordinate-keyed indexes (CartesianZone grid,
     SphericalZone focusIndex). Concrete subclasses
     (CartesianLocation, SphericalLocation) inherit the chain — no
     overrides needed unless they have additional cleanup.
- **`Exit`:** clear `inverse?.inverse`; clear `door` (the setter
  detaches us from `door.attachedTo`).
- **`Zone`:** refuse to destruct while non-empty — caller drains
  rooms first. `CartesianZone` additionally clears `derivedCache`.
- **`Door`:** call `detach()` to walk `attachedTo` and clear every
  Exit's `door` reference.

There's no central inbound-Exit index; the verifier's job of wiring
`inverse` pointers AT load time is what makes destroy-time inbound
discovery cheap (just walk `outbound.map(e => e.inverse)`).

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
  raw `setEnvironment`, `creature.travel()` over `creature.move()`.
- [templates.md § Clone Pipeline](./templates.md#clone-pipeline) —
  zone resolution at clone time.
- [state-model.md § Paths and Collections](./state-model.md#paths-and-collections)
- [messaging.md](./messaging.md) — Scene composer used by Mobile.
- [prose.md](./prose.md) — Liquid templating used by `Exit.messageOut`
  and the Mobile default settings.
- [shell-environment.md § resolveSetting](./shell-environment.md) —
  cross-host setting resolution used by Mobile defaults.
