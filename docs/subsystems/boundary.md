# Boundary Subsystem

Everything that *lives on a boundary* — the seams between
containment scopes. Exits gate movement between rooms. Doors gate
exits. The `Boundary` substrate gates cross-room channels (light,
sight, future sound) through a fixture-anchor model. Adornments
attach non-portable Stuff to a host. Sit in `lib/boundary/`.

The companion subsystem is [spatial.md](./spatial.md) — locations,
zones, coordinates, containment, locomotion. Spatial defines the
containers; boundary defines what connects and attaches to them.

Cross-references:

- [spatial.md](./spatial.md) — locations, zones, vessels (the
  containers boundaries connect), coordinates, containment
  chokepoint, locomotion.
- [light.md](./light.md) — the Light & Boundary subsystem on top
  of the substrate here (Window + Door retrofit, propagation
  walks, per-viewer perception).
- [perception.md](./perception.md) — viewer-aware-query pattern.
- [collections.md](./collections.md) — `addX` / `removeX` /
  `hasX` / `getXs` vocabulary the fixture surfaces use.
- [persistence.md](./persistence.md) — scalar-default rule that
  Boundary subclasses' fields honor.

## The Cast

| Type | Kind | Role |
|---|---|---|
| `Exit` | concrete `Idea` | One-way passage between two `Container & Exitable` endpoints. Carries direction, lazy-resolvable destination, optional door, traversal flags, custom messages. |
| `ExitableMixin` | mixin | Explicit exit map + zone-delegated lookup; `addExit` wires `Door.attachedTo` and (for doored exits) `BoundaryApi.attachExistingBoundary`. |
| `ExitableVessel` | concrete class | A Vessel you can enter. `DoorBearingMixin(ExitableMixin(VisibleMixin(Vessel)))`. Synthesizes `'in'`/`'out'` exits. Migrates the `(vessel, environment)` Boundary anchor pair on `setDoor` / `onMoved`. |
| `DoorBearingMixin` | mixin | Adds a `door: Door | null` field for hosts whose exits are synthesized rather than authored (`ExitableVessel`). Constrained to `Stuff & Exitable`. |
| `Door` | concrete `Thing` subclass | `SealableMixin(Boundary)`. Shared open/closed state referenced by exit pairs. Implements all three conduits — `LightConduit`, `LineOfSight`, `MovementConduit` — gated on `getIsOpen()`. `attachedTo: Set<Exit>` is the runtime back-reference. |
| `AdornableMixin` | mixin | Container-side surface for non-portable attached Stuff (`getFixtures()` parallel to `getContents()`). Composed onto `Location` and `Vessel`. |
| `AdornmentMixin` | mixin | Host-side back-reference (`adornedTo`) and not-portable invariant. Composed by `BoundaryAnchor`; future fixtures (sconces) too. |
| `Boundary` | concrete `Thing` subclass | The two-anchor abstraction for cross-room channels. `VisibleMixin(PerceptibleMixin(Thing))`. Subclasses (`Window`, `Door`) compose `Sealable` for shutter / closed state. |
| `BoundaryAnchor` | concrete `Thing` subclass | `Adornment` Thing — the per-side proxy in each host's `getFixtures()`. Two anchors per Boundary. |
| `Conduit` | TS interface | Channel-shape: `LightConduit`, `LineOfSight`, `MovementConduit`, reserved `SoundConduit`. Boundary subclasses implement (a subset of) these via `getConduits()`. |
| `Window` | concrete `Boundary` subclass | `SealableMixin(Boundary)` implementing `LightConduit + LineOfSight`. `baseTransmissivity`, optional one-way `aToBOverride` / `bToAOverride`, `colorTint`. Shutters via `Sealable.isOpen`. |
| `BoundaryApi` | static API | `attachExistingBoundary({ boundary, hostA, hostB })`, `create({ factory, hostA, hostB })`, `destruct(boundary)`. |

## Exits

`lib/boundary/Exit.ts`. An `Exit` is a first-class `Idea` —
runtime identity, no physical presence in any room's inventory.
Carries:

- `direction: string` — cardinal long-form, semantic label, or
  vessel-synthesized (`'out'`, `'in'`).
- `source: Stuff & Container` — the Exitable this exit leaves
  from.
- `destination` — live ref OR `destinationPath: string`
  (templatePath, lazy-resolved via `StuffApi.singleton`).
- `door: Door | null` — optional; both sides of a bidirectional
  pair reference the same instance.
- Flags: `hidden`, `blocked`, `muffled`, `noFollow`, `oneWay`.
- Optional Liquid templates: `messageOut` / `messageIn` for
  movement narration.
- `inverse?: Exit` — counterpart on the other side, wired by
  `addBidirectionalExit` or by the mutual-exit verifier.

`Exit.canTraverse(mover)` rejects when `blocked` or when an
attached door is shut. After the Door retrofit
`Exit.canTraverse` still consults `door.getIsOpen()` directly
(rather than going through `MovementConduit.canPassThrough`) —
they return the same answer. Routing through the conduit is
deferred to a future Door subclass that varies on traversal mode.

### `ExitableMixin` lookup precedence

`ExitableMixin` (`lib/boundary/Exitable.ts`) is composed by
`CartesianLocation`, `SphericalLocation`, and `ExitableVessel`.
`getExit(direction)` merges:

1. **Explicit map.** Wins absolutely.
2. **Subclass hook.** `ExitableVessel.getExit` overrides for
   `direction === 'out'`.
3. **Zone-derived.** `zone?.deriveExit(this, direction)` —
   polymorphic: `CartesianZone` synthesizes from grid adjacency,
   `SphericalZone` always returns `undefined`. No `instanceof`
   check at the call site (see
   [antipatterns.md § instanceof, virtual methods, and
   cast-by-invariant](../antipatterns.md)).

`getObviousExits()` is the union used by `look`. Walks explicit
exits first, then iterates the 10 cardinals through
`zone.deriveExit` only when `zone?.hasDerivedAdjacency()` —
again polymorphic, no `instanceof`.

`getExitDoors()` collects every non-null `exit.door` reachable
through `getObviousExits` — used by MQL so a player can target a
door by keyword without it living in inventory.

### Bidirectional exits

`Exitable.addBidirectionalExit(other, direction, opts?)` installs
both sides in one call:

- For cardinal `direction`, the opposite is inferred via
  `NavigationApi.invertDirection`. For semantic labels the caller
  passes `opts.opposite` explicitly.
- A shared `door` reference installs on both sides.
- `forward.inverse = back` and `back.inverse = forward` wired so
  `Mobile`'s arrival-message resolver can reach
  `exit.inverse?.direction`.
- **After the Boundary retrofit**: when `opts.door` is non-null,
  `addBidirectionalExit` also calls
  `BoundaryApi.attachExistingBoundary({ boundary: opts.door,
  hostA: this, hostB: other })` to install the door's anchor pair.

One-way exits use `addExit` directly and leave `inverse`
undefined.

### Mutual-exit verification

`ExitableMixin.verifyOutboundExits()` walks the
`_pendingVerify` set — exits flagged at `addExit` time as
needing inverse-wiring. Settled exits (wired, oneWay, blocked,
non-cardinal, no resolvable destPath) are evicted as the
verifier observes them. Idempotent. Fires from
`postRegister` (load-time) and from `Mobile.traverse`
(traversal-time fallback).

### Lazy Exit destination resolution

An Exit can be authored with a live `destination` ref or a
`destinationPath` (templatePath string). The synchronous
`destination` getter consults the singleton cache first; if the
destination isn't loaded the getter throws — async-aware
callers (`Mobile.traverse`) `await
exit.resolveDestination()` first.

## Doors

`lib/boundary/Door.ts`. Composition: `SealableMixin(Boundary)`.
Boundary supplies `Visible + Perceptible + Thing`. The
Containable composition (from Thing) is what enables broken /
unhinged doors to become inventory items.

The same physical door is referenced by potentially many Exits
(canonical case: forward + back). The `attachedTo: Set<Exit>`
field is the runtime back-reference, populated by:

- `ExitableMixin.addExit` when the exit's `door` is non-null
- `ExitableMixin.addBidirectionalExit` indirectly
- `ExitableVessel`'s synthesized exit factories when
  `vessel.door` is non-null

…and unwired by `removeExit`, `Exit.prepareDestroy`,
`vessel.setDoor` cache invalidation, and `Door.detach()`.

### Conduit registry

A Door advertises three conduits — `LightConduit`,
`LineOfSight`, `MovementConduit` — all gated on `getIsOpen()`:

```ts
public override getConduits(): readonly Conduit[] {
  return [lightConduitFor(this), lineOfSightFor(this), movementConduitFor(this)];
}

public transmissivity(_from, _to): number { return this.getIsOpen() ? 1 : 0; }
public canSeeThrough(_from, _to): boolean { return this.getIsOpen(); }
public canPassThrough(_from, _to, _mode): boolean { return this.getIsOpen(); }
```

A closed Door blocks light, sight, and movement uniformly. The
Light propagation walk consumes the `LightConduit` via the
boundary path; `Exit.canTraverse` consults `getIsOpen()`
directly (same answer as the `MovementConduit`).

### Detach choreography

`Door.detach()` walks BOTH back-references:

1. Existing `attachedTo` — for each Exit, clear its `door` ref.
2. `super.detach()` (Boundary) — clear both anchor slots and
   remove the anchors from each host's `getFixtures()`.

Then `ContainmentApi.move(door, location)` plants the
broken/removed door somewhere. Reinstall reverses:
`ContainmentApi.move(door, null)` plus
`addBidirectionalExit(other, dir, { door })` (which also
installs the new anchor pair).

`Door.prepareDestroy` is inherited from Boundary — it calls
`detach()` (now also clearing attachedTo) and then destructs the
captured anchors.

### `Door.getKeywords()`

Overrides Perceptible to union the explicit keyword list with
the tokens of the door's `shortDescription`, so a door authored
with only `shortDescription: 'heavy oak door'` is targetable as
`oak` / `door` without re-listing.

### `DoorBearingMixin`

`lib/boundary/DoorBearing.ts`. Adds `door: Door | null`
(runtime-only, NOT in `persistentFields`), `getDoor()`, default
`setDoor()`. Bound to `Stuff & Exitable`. Composed by
`ExitableVessel` so its synthesized `'in'`/`'out'` exits can
pull the carried door at template/clone time.

`ExitableVessel` overrides `setDoor` to invalidate the
synthesized-exit caches AND to migrate the door's
`(vessel, environment)` Boundary anchor pair (see "ExitableVessel
anchor migration" below).

**`DoorBearing` is NOT the same as `BoundaryAnchor`** —
`DoorBearing` is a host-side mixin holding one Door reference;
`BoundaryAnchor` is a `Thing` subclass that proxies a Boundary
on one side. Both can be present on `ExitableVessel` for
different roles.

### `ExitableVessel` anchor migration

A vessel-door is a Boundary on the runtime triple
`(vessel, environment)`. As the vessel moves, the boundary
follows.

- `ExitableVessel.onMoved(_from, to)` — destructs the existing
  anchor pair via `Boundary._detachAndDestructAnchors()` (the
  subclass-bypass seam that doesn't touch Door's `attachedTo`),
  then re-installs the pair on `(vessel, to)`.
- `ExitableVessel.setDoor(door)` — destructs the old door's
  anchor pair, updates the door reference, installs the new
  door's pair on `(vessel, currentEnv)`.

So a wardrobe with an open Door reads room ambient inside; a
closed Door reads ZERO inside; moving the wardrobe to a different
room migrates the boundary so the inside reads the new room's
ambient.

## Adornable / Adornment

`lib/boundary/Adornable.ts` and `lib/boundary/Adornment.ts`.

`Adornable` (composed onto `Location` and `Vessel`) gives any
Container a `fixtures: Set<Stuff & Adornment>` collection
parallel to `contents`. Fixtures are NOT inventory; they don't
show up in `look`-list output by default. The not-portable
invariant is enforced at `ContainmentApi.move`: attempting to
move an attached `Adornment` rejects with `ContainmentError`
until the host calls `removeFixture` first.

Surface (canonical collection vocabulary —
[collections.md](./collections.md)):

```ts
addFixture(f: Stuff & Adornment): boolean;
removeFixture(f: Stuff & Adornment): boolean;
hasFixture(f: Stuff & Adornment): boolean;
getFixtures(): readonly (Stuff & Adornment)[];
getFixtureBoundaries(): Boundary[];      // dedupes via anchor → boundary
getFixtureLightSources(): (Stuff & Adornment)[];
```

`Adornment` is the host-side back-reference (`adornedTo`) and the
not-portable invariant. Composed by `BoundaryAnchor`; future
fixture types (sconces, decorations) compose it too.

`AdornableMixin.prepareDestroy()` walks `fixtures` and destructs
each via `StuffApi.destruct`. A `BoundaryAnchor` being destructed
clears its slot in the boundary; if the host on the other side
is still alive, that side's anchor stays put and the boundary
lingers half-attached until explicitly destructed.

## Boundary Substrate

`lib/boundary/Boundary.ts`, `lib/boundary/BoundaryAnchor.ts`,
`lib/boundary/Conduit.ts`.

A `Boundary` connects two `Adornable` containers and gates
channels (light, sight, movement, future sound) between them.
The runtime triple is `(boundary, anchorA, anchorB)` — the
Boundary itself plus a `BoundaryAnchor` Thing in each host's
`getFixtures()`.

```
       Boundary
       /       \
  anchorA    anchorB
     |          |
   hostA      hostB         ← Adornable containers (rooms / vessels)
```

`Boundary` is `VisibleMixin(PerceptibleMixin(Thing))` — has
identity, can be addressed by keyword, can become inventory if
detached from both sides. Subclasses (`Window`, `Door`) compose
`Sealable` for shutter / closed state.

`BoundaryAnchor` is `AdornmentMixin(Thing)` — sits in
`getFixtures()`, knows its boundary and side (`'A'` or `'B'`).

### Conduits

A `Conduit` is a TypeScript interface a Boundary subclass
implements via wrapper objects returned from `getConduits()`.
Each conduit covers one channel with directional methods that
take `BoundarySide` arguments:

```ts
interface LightConduit    { conduitKind: 'light';
  transmissivity(from: BoundarySide, to: BoundarySide): number;
}
interface LineOfSight     { conduitKind: 'sight';
  canSeeThrough(from: BoundarySide, to: BoundarySide): boolean;
}
interface MovementConduit { conduitKind: 'movement';
  canPassThrough(from: BoundarySide, to: BoundarySide, mode: string): boolean;
}
interface SoundConduit    { conduitKind: 'sound'; }   // reserved for v2
```

Conduits MUST NOT cache — the boundary's own state (e.g.,
Sealable `isOpen`) participates in transmissivity and changes at
runtime.

### `BoundaryApi`

```ts
BoundaryApi.attachExistingBoundary({ boundary, hostA, hostB });
// Constructs the two anchors, wires anchorA/anchorB on the boundary,
// calls hostA.addFixture(anchorA) and hostB.addFixture(anchorB).

BoundaryApi.create({ factory, hostA, hostB });
// Convenience: StuffApi.create(factory) + attachExistingBoundary.

BoundaryApi.destruct(boundary);
// StuffApi.destruct(boundary) → boundary.prepareDestroy()
// detaches anchors from hosts and destructs them → boundary destroys.
```

Asymmetry guards: rejects `hostA === hostB` and rejects
re-installing on a boundary that already has anchors (would
silently orphan the previous pair).

### Naming: `BoundaryAnchor` vs `DoorBearing`

The two roles do not overlap. `DoorBearing` is a host-side
**mixin** giving an Exitable a single `door` field (used by
`ExitableVessel` for synthesized exits). `BoundaryAnchor` is a
`Thing` subclass + `Adornment` that sits in `getFixtures()` as
the per-side proxy of a `Boundary`. After the Door retrofit,
`ExitableVessel` participates in BOTH — `DoorBearingMixin` for
the field, anchor-pair for the runtime fixture installation. Do
not unify.

## Window

`lib/boundary/Window.ts`. The first concrete Boundary user
beyond Door. `SealableMixin(Boundary)`. Implements `LightConduit
+ LineOfSight` via wrapper objects from `getConduits()`.

Persistent state (per the [persistence.md](./persistence.md)
scalar-default rule):

- `baseTransmissivity: number` (default 1.0) — symmetric
  pass-through factor when open.
- `aToBOverride: number | null` — one-way override for A→B (set
  to `0` for the dark side of one-way glass).
- `bToAOverride: number | null` — same for B→A.
- `colorTint: ColorTag | null` — stained glass.
- `isOpen: boolean` (from Sealable) — shutter state.

The structured runtime API `getDirectionalOverrides()` /
`setDirectionalOverrides()` reconstructs / decomposes the
`{ aToB?, bToA? } | null` shape from the two stored scalars.

`transmissivity(from, to)`:

- Returns 0 if `!isOpen` (shutters closed).
- Returns the relevant directional override if non-null, else
  `baseTransmissivity`.

`canSeeThrough(from, to)` — `transmissivity(from, to) > 0`.

Template authoring: Window is template-loadable like Door
(`class: '/lib/boundary/Window'`,
`hydratorClass: '/lib/persistence/PersistentHydrator'`). Seed
code calls `BoundaryApi.attachExistingBoundary` to install on
two rooms.

## Persistence Notes

- Exits: `direction`, `destinationPath`, flags. The `door` Stuff
  reference goes via custom `persistenceHandler`. Derived
  cartesian exits are recomputed on boot.
- Doors: `isOpen` (from Sealable). The `attachedTo` Set and the
  anchor pair are runtime-only.
- Boundaries: subclass-specific (Window's transmissivity +
  overrides + colorTint). Anchors are runtime-only; v1 anchor
  wiring is hydrate-only via seed code calling
  `BoundaryApi.attachExistingBoundary`.
- Adornments: `adornedTo` is a Stuff cross-reference, follows
  the `Containable.environment` shape (custom
  `persistenceHandler`). Composing classes that need attachment
  to survive restart own that.

## Cross-References

- [spatial.md](./spatial.md) — locations, zones, vessels,
  containment, locomotion. The containers boundary objects
  attach to.
- [light.md](./light.md) — Light propagation walk consumes the
  `LightConduit` and `getFixtures()` surfaces.
- [perception.md](./perception.md) — viewer-aware queries.
- [persistence.md](./persistence.md) — scalar-default rule the
  Boundary subclasses honor.
- [antipatterns.md](../antipatterns.md) — `ContainmentApi.move`
  over raw `setEnvironment`; pre-asserted casts; instanceof
  vs. virtual methods vs. cast-by-invariant.
