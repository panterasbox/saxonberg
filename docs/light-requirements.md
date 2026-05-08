# Light Subsystem — Requirements (working doc)

Requirements for the Light subsystem and the prerequisite **Boundary**
abstraction. Intended audience: a planning agent that will turn this
into an implementation plan, then a future implementor working in a
fresh context.

This doc is not a design doc; it states what we're building and the
constraints, not the line-by-line "how." Where there's an
architectural decision that affects the public surface, it's called
out here so the plan honors it.

Cross-references:

- [docs/subsystems/spatial.md](./subsystems/spatial.md) — the
  existing Door / Exit / Sealable / ExitableVessel / Mobile machinery
  this builds on
- [docs/subsystems/perception.md](./subsystems/perception.md) — the
  cross-cutting viewer-aware-query pattern that all of this doc's
  viewer parameters honor
- [docs/mixin-slate.md](./mixin-slate.md) — the wider mixin slate;
  light is one of its committed pieces
- [docs/roadmap.md](./roadmap.md) — entry to update once light lands

---

## Goal

A light subsystem that (a) makes "is the room dark, dim, lit, or
bright?" a queryable, viewer-aware property of every Container, (b)
flows naturally between rooms through Boundaries (windows, open
doors, peepholes, ducts), and (c) exposes a clean Shadow seam for
blindfold / night-vision / darkness-curse style overrides.

Done means: a player can `look` in a room and the description
reflects the ambient light; a candle in your hand changes a dark
room's band; opening a door between a lit and a dark room leaks
light; closing it stops the leak; one-way glass works through
directional transmissivity.

## Non-goals

- 3D realism (no ray tracing, no real photometry — this is a text
  game).
- Mechanical effects of light *color* (color is atmospheric only).
- Per-character vision profiles in v1 (the API surface accepts a
  viewer; the lookup function returns a constant until the Organism
  subsystem populates species profiles).
- Eager invalidation / caching of light state. v1 is fully lazy.
- **Time of day, world clock, outdoor ambient computation,
  phase-transition events, calendar, weather, lunar phase,
  astronomy.** Outdoor rooms in v1 are authored with whatever Light
  value their author wants. When time of day arrives later it slots
  into `Container.getAmbientLight()` overrides on `Outdoor`-marked
  rooms — no API changes here.
- **Fire mechanics: combustion, ignition verbs, fuel, burn-down,
  fire spread.** A v1 candle is `Switchable + LightSource` — toggle
  it on/off, no fuel state. Real fire returns when content needs it.
- Schedule integration. Without ticking burn / fuel / decay, light
  has no scheduled work in v1.
- Sound conduit, sound emission, audible perception. The Boundary
  conduit slot is reserved but no `SoundConduit` ships in v1.
- Mechanical penalties for fine actions in dim/blinding light
  (e.g., "lockpicking is harder in the dark"). Visibility gating
  applies only to *seeing* things; the granularity of action gates
  is a per-controller decision, not a Light system concern.

## Background and constraints

Read these before designing:

- **Spatial subsystem is mature**. Door is a `Thing` composing
  `Visible + Perceptible + Sealable`. It carries `attachedTo:
  Set<Exit>` as a runtime back-reference; `attachExit` / `detachExit`
  manage it; `Door.detach()` walks the set; `prepareDestroy` calls
  `detach()`. Both sides of a bidirectional exit pair reference the
  same Door instance.
- **Mutual-exit invariant** is enforced by
  `ExitableMixin.verifyOutboundExits()`, run at `postRegister` and
  as a traversal-time fallback. Pending verifications live in a
  per-host set.
- **Containable.environment is not in `persistentFields`** — Stuff
  references are persisted via custom `persistenceHandler`, not the
  generic hydrator's bracket assignment. `DoorBearing.door` follows
  the same rule. Anything in the new subsystem that holds a Stuff
  reference (Boundary's two host containers, conduit pointers to
  anchors) follows this pattern.
- **Spherical rooms have a `radius`** on
  `SphericalCoordinatesMixin` (default 1.0). **Cartesian zones have
  a `cellSize`** that's currently informational only and unused.
  Light makes both load-bearing for the first time.
- **Methods-only inter-Stuff contract** — every cross-Stuff read /
  write goes through `getX()` / `setX()` methods, not field access.
  New mixins follow this everywhere.
- **No `_mixinName` suffix in filenames**. Mixins live in
  `lib/<subsystem>/PascalCase.ts`. Apis in `api/lowercase.ts`.
- **Viewer-aware queries follow the pattern in perception.md**.
  Every viewer parameter in this doc is `Stuff & Sensor` and is
  passed explicitly. Do not infer a viewer from execution context
  or from a "current command-giver" notion.

## Subsystem overview

The work splits into four interlocking pieces. Order in the plan
should respect dependencies:

1. **Boundary** — the new abstraction. `Adornable` / `Adornment`,
   `Boundary`, `BoundaryAnchor`, conduit base interface. Empty of
   conduits at this point.
2. **Light value & propagation core** — `Light` value object,
   `LightBand` enum, `LightApi.lightAt(loc)`, `LightApi.bandAt(loc)`,
   the propagation walk through `Container.contents`,
   `Exitable.getObviousExits()`, and `Adornable.getFixtures()` (with
   conduits applied).
3. **`LightSource` mixin** — single mixin for anything that emits
   light. Composes with `Switchable` for on/off control.
4. **Window as first Boundary user** — `Window` class composing
   `Boundary + Adornment + LightConduit + LineOfSight` (and
   `Sealable` for shutters).

`Door` retrofit lands as a fifth phase covered by this doc and ships
with light v1 (NOT as a follow-up): Door becomes a Boundary, with
its existing `Sealable` state driving both the movement-conduit
(existing Exit gating) and the new light/sight conduits. This is
the migration that ties the two universes together — closed door
stops light, not just movement.

---

## 1. Boundary abstraction

**Goal**: a uniform way to model anything that connects two
Containers and gates channels (movement, light, sight, sound, …)
between them.

### `Adornable` mixin

Constraint: composed on `Stuff & Container`.

Adds a `fixtures: Set<Stuff & Adornment>` collection, parallel to
`Exitable`'s `exits` map. Fixtures are *not* in `getContents()` —
they're a separate, non-portable population attached to the
container. They show up in `look` via the room renderer and in MQL
seeds (analogous to `getExitDoors()` returning a queryable
collection).

Required surface (canonical collection vocabulary —
[collections.md](./subsystems/collections.md)):

```ts
interface Adornable {
  addFixture(f: Stuff & Adornment): boolean;
  removeFixture(f: Stuff & Adornment): boolean;
  hasFixture(f: Stuff & Adornment): boolean;
  getFixtures(): readonly (Stuff & Adornment)[];
  getFixturesOfKind<T>(predicate: (f: Stuff & Adornment) => f is T): T[];
}
```

Composed by: `Location` (so all subclasses inherit), `Vessel`
(future). Cartesian and Spherical Locations get it for free via
their existing composition.

`prepareDestroy`: destruct each fixture before chaining to super.
Fixture's own `prepareDestroy` is responsible for unhooking from any
Boundary it's an anchor of (see below).

### `Adornment` mixin

Constraint: composed on `Stuff`. Concrete users will be `Thing`
subclasses but the mixin doesn't require Thing — a Boundary is its
own class, not a Thing.

Adds the host back-reference and the not-portable invariant.

```ts
interface Adornment {
  getAdornedTo(): (Stuff & Adornable) | null;
  setAdornedTo(host: (Stuff & Adornable) | null): void;
}
```

`adornedTo` is **not** in `persistentFields`; it follows the
`Containable.environment` pattern. Composing classes that need the
attachment to survive restart own that via custom
`persistenceHandler`.

Containment invariant: an `Adornment` cannot be in any
`Container.contents` while `adornedTo !== null`. `ContainmentApi.move`
gets a pre-flight veto to enforce. Detaching an adornment (set
`adornedTo` to null) is the prerequisite for moving it as inventory
— same pattern as `Door.detach()` for movable broken doors.

### `Boundary` class

A new top-level Stuff class? No — a `Boundary` is a `Thing`. It has
identity, can be `Visible`, can be `Perceptible`, can be `Sealable`
(shutters / closing panel), and can be moved as an item if all its
anchors are detached.

Composition: `VisibleMixin(PerceptibleMixin(Thing))`. `Sealable`
composes onto subclasses that need a closeable state.

A Boundary has **two anchors**, one held by each adjacent
Container's `Adornable`. Each anchor knows its boundary and its
side (`A` or `B`).

```ts
class Boundary extends VisibleMixin(PerceptibleMixin(Thing)) {
  // The two sides. The Boundary knows about both.
  protected anchorA: BoundaryAnchor | null;
  protected anchorB: BoundaryAnchor | null;

  getAnchorA(): BoundaryAnchor | null;
  getAnchorB(): BoundaryAnchor | null;
  getAnchors(): [BoundaryAnchor | null, BoundaryAnchor | null];
  getOtherAnchor(side: BoundaryAnchor): BoundaryAnchor | null;
  getOtherHost(host: Stuff & Adornable): (Stuff & Adornable) | null;

  // Equivalent to Door.detach: clear both anchors, walk back-refs.
  detach(): void;

  // Conduit registry — concrete conduits register here when their
  // mixin is composed onto a Boundary subclass.
  getConduits(): readonly Conduit[];

  // Lifecycle
  protected override prepareDestroy(): void;  // detaches first
}
```

A Boundary is *not* in either room's `getContents()`. It is in *each
side's* `Adornable.getFixtures()` via a `BoundaryAnchor` that
acts as the visible-on-this-side proxy for the boundary.

### Naming: `BoundaryAnchor` vs `DoorBearing`

Saxonberg already ships an unrelated `DoorBearingMixin`
(`lib/spatial/DoorBearing.ts`) — a host-side mixin that gives an
`Exitable` a single `door` field, used by `ExitableVessel` so its
synthesized `'in'` / `'out'` exits can pull a carried Door at
template/clone time. **`BoundaryAnchor` is a different concept**:
a `Thing` subclass composing `Adornment` that sits in
`Adornable.getFixtures()` as the per-side proxy for a `Boundary`.
The two roles do not overlap; the existing `DoorBearingMixin`
stays unchanged through this work.

### `BoundaryAnchor` class

A `Thing` subclass composing `Adornment`. One anchor per side. The
anchor is what's actually in `getFixtures()`; queries that need
"which boundary is this anchor for" go through
`anchor.getBoundary()`.

```ts
class BoundaryAnchor extends AdornmentMixin(VisibleMixin(Thing)) {
  protected boundary: Boundary | null;
  protected side: 'A' | 'B';

  getBoundary(): Boundary | null;
  getSide(): 'A' | 'B';

  // Convenience: walk through the boundary to the other host.
  getOtherHost(): (Stuff & Adornable) | null;

  protected override prepareDestroy(): void;
}
```

When the anchor is destructed, it unhooks from the Boundary's
`anchorA` / `anchorB` slot and from its host's `getFixtures()`.

### Boundary creation API

Mirror `addBidirectionalExit` for usability:

```ts
// On Boundary or BoundaryApi:
static create<T extends Boundary>(opts: {
  factory: () => T,
  hostA: Stuff & Adornable,
  hostB: Stuff & Adornable,
}): T;
```

Creates the boundary, both anchors, wires `anchorA`/`anchorB` to
the boundary, calls `addFixture` on each host with the corresponding
anchor. Symmetric. Caller doesn't author the anchors directly.

### Conduits

A conduit is an interface a Boundary subclass *composes* (or that's
satisfied by direct method implementation on a subclass). Each
conduit covers one channel and has directional transmissivity. A
boundary may compose any subset.

Common base shape (TypeScript interface, not a mixin):

```ts
interface Conduit {
  // Stable kind tag for the conduit registry. Used for filtering
  // boundaries by channel.
  readonly conduitKind: ConduitKind;
}

type ConduitKind = 'light' | 'sight' | 'movement' | 'sound';
```

v1 ships:

```ts
interface LightConduit extends Conduit {
  conduitKind: 'light';
  // 0..1; how much light passes through, this side → other side.
  transmissivity(fromSide: 'A' | 'B', toSide: 'A' | 'B'): number;
}

interface LineOfSight extends Conduit {
  conduitKind: 'sight';
  // True iff someone on `fromSide` can see through to `toSide`.
  // Detail level may apply later; v1 boolean.
  canSeeThrough(fromSide: 'A' | 'B', toSide: 'A' | 'B'): boolean;
}

interface MovementConduit extends Conduit {
  conduitKind: 'movement';
  // True iff `mode` traversal is allowed `fromSide → toSide`.
  // Door's existing Sealable open/closed gates this for v1.
  canPassThrough(
    fromSide: 'A' | 'B',
    toSide: 'A' | 'B',
    mode: string
  ): boolean;
}
```

Reserved for future:

```ts
interface SoundConduit extends Conduit { ... }  // not v1
```

A `LightConduit`'s transmissivity is allowed to depend on the
boundary's own state — a `Sealable` Boundary returns `0` when
closed (or whatever is appropriate to the subclass). The conduit
interface methods are called on every propagation walk; conduits
should NOT cache.

### Boundaries and zones

Zones are largely orthogonal to the Boundary subsystem, with one
explicit correctness rule. Boundaries can span zones: anchors are
*fixtures* on Locations, not contained Stuff, so the
`ContainmentApi.move` cross-zone ban for Exitables does not apply.
Size scale is **per receiving location**, not per Boundary — when
the propagation walk needs an intensity divisor, it consults each
visited room's own `getSizeScale()` (Cartesian rooms read
`zone.cellSize`, Spherical rooms read their `getRadius()`), so a
Boundary connecting rooms in zones with different `cellSize`
values works correctly with no special handling. The eviction rule
"pin rooms within MAX_HOPS of any active `Interactive`"
generalizes across zone boundaries unchanged.

Forward-looking: when zone instancing eventually lands, the design
question for *that* work will be how Boundaries that span an
instanced zone behave (fork per instance, or stay shared with the
original-zone rooms). It is out of scope here — flagged so the
question is visible when instancing arrives.

---

## 2. Light value and propagation

### `Light` value object

Immutable. Constructed by sources and combined by the propagation
walk.

```ts
class Light {
  readonly intensity: number;     // abstract lumens, 0..N
  readonly color: ColorTag | null; // atmosphere only; null = neutral
  readonly sources: readonly LightSourceRef[]; // for description

  static readonly ZERO: Light;

  add(other: Light): Light;
  attenuate(factor: number): Light;  // factor in [0, 1]
  withColor(color: ColorTag | null): Light;
}
```

`color` blending across multiple sources is open — the simplest
acceptable rule is "the dominant source's color wins" (highest
intensity contributor). The plan can pick a definite rule. Color is
atmospheric only and not load-bearing for any other system in v1, so
the answer can be "first non-null wins" if simpler.

`sources` is a small list — used by the renderer to say "by the
flickering torchlight." Capped at e.g. 3 sources by intensity to
keep the structure bounded.

### `LightBand` enum

```ts
type LightBand =
  | 'pitch-black'
  | 'very-dim'
  | 'dim'
  | 'lit'
  | 'bright'
  | 'blinding';
```

Thresholds come from a single table. The default table can be tuned
later; the planning agent picks reasonable initial values.

### Container-side: ambient and size

Each Container exposes:

```ts
interface Container {
  // Inherent ambient light that exists in this container regardless
  // of what's inside it. Underground room: ZERO. Outdoor room: a
  // stored Light value, authored on the Location. Default: ZERO.
  // The method form (not a property) is so future overrides
  // (e.g., outdoor + time-of-day) can compute on read.
  getAmbientLight(): Light;

  // Spatial scale used for intensity-spread within the container.
  // Spherical: derived from `radius`. Cartesian: derived from
  // `zone.cellSize`. Vessel: from a property on the Vessel subclass.
  // Default: 1.0 if the container has no size signal.
  getSizeScale(): number;
}
```

`getSizeScale()` is the divisor in the band computation (see
propagation). Larger room → same total intensity reads dimmer.

### `LightApi`

```ts
class LightApi {
  // Total light at a location, viewer-agnostic.
  static lightAt(loc: Stuff & Container): Light;

  // Band derivation including size scaling.
  static bandAt(loc: Stuff & Container): LightBand;

  // Viewer-aware. Applies viewer-side Shadow overrides and (later)
  // species vision profile.
  static perceivedBand(
    viewer: Stuff & Sensor,
    loc: Stuff & Container
  ): LightBand;

  // Visibility gate. detail in: 'shape' | 'figure' | 'detail' | 'fine'.
  static canSee(
    viewer: Stuff & Sensor,
    target: Stuff,
    detail?: VisibilityDetail
  ): boolean;

  // Concealment surface for Hidden/Stealthing.
  static shadowsAt(loc: Stuff & Container): ShadowQuality;
}
```

Viewer parameters are `Stuff & Sensor` per the cross-cutting
[perception.md](./subsystems/perception.md) pattern.

`LightApi` ends with `SecurityApi.decorateApiClass(LightApi)` like
every other Api except the four bootstrap-special ones.

### Propagation algorithm

Single recursive walk in `lightAt`:

```
lightAt(loc, depth = 0, visited = new Set<Stuff>()):
  if depth > MAX_HOPS: return Light.ZERO
  if visited.has(loc): return Light.ZERO
  visited.add(loc)

  total = loc.getAmbientLight()

  // Sources contained within this room (and within transparent
  // containers within this room).
  for each item in loc.getContents():
    total = total.add(emittedLightFrom(item, loc))

  // Sources stuck on as fixtures (ceiling lamp, wall sconce).
  for each fixture in loc.getFixtures():
    if fixture isLightSource: total = total.add(fixture.getEmittedLight())

  // Cross-boundary propagation: walk every Boundary on this side.
  for each fixture in loc.getFixtures():
    if fixture is BoundaryAnchor:
      boundary = fixture.getBoundary()
      conduit = boundary.getConduits().find(c => c.kind === 'light')
      if not conduit: continue
      otherHost = fixture.getOtherHost()
      if not otherHost: continue
      otherSide = boundary.getOtherSide(fixture)
      tau = conduit.transmissivity(otherSide, fixture.side)
      if tau <= 0: continue
      contribution = lightAt(otherHost, depth + 1, visited).attenuate(tau)
      total = total.add(contribution)

  // Cross-exit propagation: doors (after retrofit) and open exits.
  for each exit in loc.getObviousExits():
    if exit.canTraverse-light():  // via Door's LightConduit, see § 5
      contribution = lightAt(exit.getDestination(), depth + 1, visited).attenuate(EXIT_TAU)
      total = total.add(contribution)

  return total

bandAt(loc):
  light = lightAt(loc)
  effective = light.intensity / loc.getSizeScale()
  return bandFor(effective)
```

`MAX_HOPS` is a small constant (2 is the proposal — first hop is
through the boundary, second hop is across one further exit). The
plan picks the value.

`emittedLightFrom(item, fromLoc)` recursively walks transparent
Containers (including transparent Vessels and transparent Things) to
find LightSources whose light reaches `fromLoc`. Opaque containers
block. Transparency is a property on `Container` — see § 4.

The visited set prevents cycles in pathological topologies.
Cartesian / Spherical worlds shouldn't produce cycles, but Boundaries
between vessels in vessels can.

### Performance

v1 is fully lazy. Each `lightAt(loc)` call walks the room's
contents, fixtures, and one or two hops outward. No caching. The
plan need not introduce caching.

If profiling later shows the walk is hot, the optimization is event-
driven invalidation hung off Witness hooks (`onLightSourceChanged`,
`onBoundaryStateChanged`, `onContainableMoved`). Out of scope for
this requirements doc.

---

## 3. `LightSource` mixin

Single mixin for anything that emits light. No combustion, no fuel,
no ignition verb, no on/off mechanism in v1.

```ts
interface LightSource {
  isLightSource(): boolean;
  getEmittedLight(): Light;
  setEmittedLight(value: Light): void;
}
```

The Light value emitted is configured per-instance at template
time and persisted as a field on the host. To "extinguish" a
v1 source, set its emission to `Light.ZERO`. To "ignite" it,
set the emission to a non-zero Light. Whether and how that
mutation is exposed to players is a content-authoring concern
outside the v1 light scope — there is no `Switchable` composition,
no `light X` verb, no toggle UI, no fuel state. Light v1 is the
physics layer plus the API surface; it does not enumerate
specific light-source archetypes.

The propagation walk just calls `getEmittedLight()` and uses
whatever Light value comes back. A host can compose `LightSource`
alongside any other mixins it needs for its other roles (`Visible`
for description, `Adornment` for fixture placement, etc.). The
plan does not need to define a catalog of named subclasses —
candles, lamps, sconces, orbs are all just `LightSource` hosts
configured differently.

---

## 4. Window — first Boundary user

A `Window` is a `Boundary` subclass that conducts light and sight
between two `Adornable` containers. Optional `Sealable` for shutters.

### Class

```ts
class Window extends Boundary
  implements LightConduit, LineOfSight, Sealable {

  // Persistent
  protected baseTransmissivity: number;       // 0..1, default 1
  protected directionalOverrides?: { aToB?: number; bToA?: number };
  protected colorTint?: ColorTag;

  transmissivity(from: 'A' | 'B', to: 'A' | 'B'): number {
    if (this.isSealable() && !this.getIsOpen()) return 0;
    const override = (from === 'A' ? this.directionalOverrides?.aToB : this.directionalOverrides?.bToA);
    return override ?? this.baseTransmissivity;
  }

  canSeeThrough(from, to): boolean {
    return this.transmissivity(from, to) > 0;
  }
}
```

A symmetric window leaves `directionalOverrides` undefined.
**One-way glass** sets the relevant override to 0.

`Sealable` drives the closed-shutter case: closing a window's
shutters zeroes transmissivity. The boolean `isOpen` covers it
without inventing a new state.

`colorTint`: stained glass. Atmospheric only — affects the `color`
field on the Light value contributed through this conduit.

### Persistence

Window persists `baseTransmissivity`, `directionalOverrides`,
`colorTint`, plus `isOpen` from `Sealable`. The two anchors are
runtime-only and rebuilt at load by the boundary's loader (mirror
of how Doors rebuild `attachedTo` from Exit reconstruction).

The boundary itself is persisted by some path (TBD by the planning
agent — likely a custom `persistenceHandler` on a domain template
that reconstructs both anchors and registers them on their hosts'
fixture sets, similar to how `addBidirectionalExit` works at clone
time today).

---

## 5. Door retrofit

The interesting integration. `Door` and `Window` should share the
Boundary substrate so a closed door blocks light, sight, and (when
Sound lands) sound — not just movement.

**This retrofit lands with light v1, not as a follow-up.** A
half-shipped state where closed doors don't dim adjacent rooms
would observably contradict the new Window behavior; doing it
together avoids that intermediate confusion.

### Strategy

Door becomes a `Boundary`. Specifically:

```ts
class Door extends Boundary
  implements LightConduit, LineOfSight, MovementConduit {

  // existing: SealableMixin already composed
  // existing: VisibleMixin, PerceptibleMixin
  // existing: attachedTo: Set<Exit>  ← preserved

  transmissivity(from, to): number {
    return this.getIsOpen() ? 1 : 0;  // muffled doors → < 1
  }

  canSeeThrough(from, to): boolean {
    return this.getIsOpen();
  }

  canPassThrough(from, to, mode): boolean {
    return this.getIsOpen();
  }
}
```

`MovementConduit` is the conduit that gates `Exit.canTraverse`.
Today, `Exit.canTraverse` consults `door.getIsOpen()` directly.
After retrofit, `Exit.canTraverse` consults the Boundary's
`MovementConduit.canPassThrough` — same answer, generalized
mechanism. **Existing movement behavior is unchanged.**

### Compatibility with Exit.attachedTo

Exits keep their `door: Door | null` slot. The anchor model adds:
each Door has two `BoundaryAnchor` instances, one in each adjacent
room's `Adornable`. The two-fixture installation is *new*, but the
existing Exit.door pointer is preserved as the movement-channel
fast path.

`addBidirectionalExit(other, dir, { door })` is extended to also
install the Door's two anchors (one in `this`, one in `other`).
Or — the planning agent picks the cleaner factoring — door
construction installs anchors, and `addBidirectionalExit` just
wires Exit.door references as today.

### Backwards compatibility

All existing Door templates keep working. The migration adds
fixture-side wiring; nothing existing changes its public surface.
Closed doors *now* block light because the propagation walk
encounters the Door's anchor in `getFixtures()` and queries its
LightConduit — which returns 0 when closed. That's the intended new
behavior.

---

## 6. Per-viewer perception

`LightApi.perceivedBand(viewer, loc)` and `LightApi.canSee(viewer,
target, detail?)` are the viewer-aware Apis.

Viewer parameter is type-constrained to `Stuff & Sensor`. This
matches the cross-cutting [perception.md](./subsystems/perception.md)
pattern: the viewer is *whoever is perceiving in this specific
check*, not the command-giver, and it's always passed explicitly.

Application order:

1. Compute the raw `Light` at `loc` (loc = location of `target` for
   `canSee`).
2. Apply viewer-side Shadow overrides. The Shadow framework is
   already set up for this — a `BlindfoldShadow`,
   `NightVisionShadow`, `DarknessShadow` composes onto the viewer
   and intercepts `LightApi.perceivedBand` / `canSee` to modify the
   result.
3. Apply species vision profile.
   `LightApi.viewerVisionProfile(viewer): VisionProfile` returns
   `{ scotopicMin, photopicMax, bandShift }`. **v1 returns a constant**
   (human-shaped). The Organism subsystem will populate this from
   `Species` later. Keep the seam.
4. Threshold against the requested detail level.

`canSee` detail levels: `'shape' | 'figure' | 'detail' | 'fine'`,
each mapping to a minimum band threshold.

---

## 7. Lazy loading × propagation

The propagation walk crosses up to MAX_HOPS containers. To prevent
walking through evicted rooms (which would either need to page them
back in or truncate at evicted boundaries, both bad), eviction
policy must pin rooms within MAX_HOPS hops of any active
`Interactive`.

The roadmap's "Idle eviction for Stuff lifecycle" entry is where
this constraint lands. The Light requirements doc just states the
constraint; the eviction subsystem (when it's designed) consumes
it.

For v1, where there is no eviction yet, the constraint is moot —
all loaded rooms stay loaded. But `LightApi.lightAt` must defend
against an evicted destination by short-circuiting cleanly:

```
inside the propagation walk, when crossing to neighbor N:
  if N is not currently loaded (StuffApi.findByTemplatePath returns null):
    skip — do not page in.
```

This makes light "respect" the eviction state when it exists, with
no special integration.

---

## 8. Persistence summary

| Class / mixin | Persistent fields |
|---|---|
| `Adornable` | (none — fixtures are reconstituted by adornment loaders) |
| `Adornment` | (none — `adornedTo` via custom persistenceHandler) |
| `Boundary` | (subclass-specific) |
| `BoundaryAnchor` | `side`; `boundary` via custom persistenceHandler |
| `Window` | `baseTransmissivity`, `directionalOverrides`, `colorTint` (and `isOpen` via Sealable) |
| `LightSource` | (subclass-specific; e.g. an electric lamp's emitted-Light config) |

Stuff cross-references (`adornedTo`, `boundary` on anchor, etc.)
follow the `Containable.environment` pattern — custom
`persistenceHandler` on the relevant class.

---

## 9. Events

v1 emits the following Witness-pattern hooks (optional methods on
relevant interfaces):

- `onLightSourceChanged(source, oldEmission, newEmission)` — fires
  when a LightSource's emitted light changes (e.g., switch flip).
  Future caches invalidate here.
- `onBoundaryStateChanged(boundary, channel, oldState, newState)`
  — fires when a Sealable boundary opens / closes, or any conduit's
  effective transmissivity changes.

No `EventApi` global topics in v1.

---

## 10. Out of scope (explicit reminders)

- Time of day. World clock, outdoor ambient computation, phase
  enums, phase-transition events, calendar, weather, lunar phase,
  astronomy.
- Fire mechanics. `Combustible`, `Lightable`, `Burning` — all
  deferred.
- `Switchable` and other generic state mixins. Light v1 is just
  the emission/propagation/perception layer; on/off semantics,
  fuel state, lit/unlit verbs, recipe composition, and any other
  generic state mechanic are out. Mutate `LightSource.setEmittedLight`
  directly if a test needs to toggle.
- Light-source archetypes. There is no canonical Candle / Lamp /
  Sconce / Orb subclass. Composers configure `getEmittedLight()`
  however they want.
- Schedule integration. No ticking work.
- Sound. `SoundConduit` is reserved as a Conduit kind but no v1
  implementation. No `Audible` mixin emission, no sound propagation.
- Eager cache invalidation. v1 is fully lazy.
- Mechanical effects of `color`.
- Per-controller action gating on light bands (`read X` failing in
  pitch black is the controller's call; Light just exposes the
  band).
- Fire spread. (No `Burning` mixin in v1.)
- Eclipse. Lunar phase.
- Rich color blending across multiple sources beyond a "first
  non-null wins" or "highest-intensity wins" rule.

---

## 11. Decisions and remaining planner choices

### Decisions locked from review

- **MAX_HOPS = 2.** Propagation walks no further than two
  containers from the query origin. Covers "open door / window
  one room over" cleanly and bounds walk cost.
- **`Adornable` composes on `Container`** (not just `Location`).
  Vessels gain `getFixtures()` for free. "Fixture inside a moving
  Vessel" is not a v1 use case but the seam is in place.
- **Default `cellSize` = 1.0.** Cartesian zones without an
  authored `cellSize` use 1.0 for `getSizeScale()`. `cellSize`
  becomes load-bearing for the first time; existing zones get
  1.0 by default.
- **Boundary persistence is hydrate-only.** There is no v1 use
  case for a Window's configuration mutating at runtime —
  `baseTransmissivity`, `directionalOverrides`, `colorTint` are
  authored fields fixed at template time. Shutters use the
  existing `Sealable.isOpen` persistence (already in the spatial
  code; no new work). Anchors are reconstructed at load time by
  the boundary's template loader. **No custom
  `persistenceHandler` is required beyond what `Sealable` already
  provides.** Boundary-as-Stuff itself doesn't carry runtime
  state separate from its subclass fields.
- **MQL exposure is required, with the ergonomic constraint that
  natural commands resolve cleanly.** The planner specifies the
  exact MQL surface; the bar is that `look candle`, `look window`,
  and `open window` all work without contortions for a player.
  Likely shape: `getFixtureLightSources()` and
  `getFixtureBoundaries()` on `Adornable`, parallel to
  `getExitDoors()`, with MQL seeds wired to consult them in
  here-scope queries.

### Planner choice

- **Color-blending rule.** Acceptable: weighted mix,
  highest-intensity-wins, first-non-null-wins. Pick one. Color is
  atmospheric only; the answer doesn't propagate downstream.
- **Light value's `sources` cap.** Used only for atmospheric
  description. Without a cap, large rooms with many sources
  produce unbounded prose. 3 is a reasonable starting point;
  planner picks.

---

## 12. Acceptance criteria

A successful implementation:

- [ ] `LightApi.lightAt(loc)` and `bandAt(loc)` return correct values
      for: empty rooms, rooms with one candle, rooms with multiple
      candles, rooms behind open doors, rooms behind closed doors
      (after Door retrofit), rooms separated by open windows,
      one-way glass scenes.
- [ ] Moving a `LightSource` host between rooms updates each
      affected room's band correctly via lazy `LightApi.lightAt`
      queries (no caching, no missed invalidations).
- [ ] `LightSource.setEmittedLight(Light.ZERO)` zeroes the
      contribution; setting it back to a non-zero Light restores.
- [ ] Closed `Sealable` window blocks light; opening it leaks again.
- [ ] Closed door (post-retrofit) blocks both movement and light;
      this matches what a player would intuit.
- [ ] `LightApi.canSee(viewer, target)` honors `BlindfoldShadow` /
      `NightVisionShadow`-style overrides.
- [ ] Viewer parameters are `Stuff & Sensor`; non-Sensor passed as
      viewer fails to compile.
- [ ] All new mixins follow the codebase rules — methods-only
      contract, no `_mixinName` suffix in filenames, persistent
      fields declared, custom `persistenceHandler` for Stuff
      cross-references, security decoration on the new Apis.
- [ ] Tests colocated under `__tests__/` siblings, Vitest.
- [ ] Documentation: a new `docs/subsystems/light.md` covering the
      shipped subsystem; updates to
      `docs/subsystems/spatial.md` for the Door retrofit and
      `Adornable` mixin; `mixin-slate.md` updated to mark the
      committed mixins; roadmap entry updated.

---

## 13. Notes for the planner

- Order phases so Boundary infrastructure lands before Window;
  Window before Door retrofit; LightSource can land in parallel
  with Boundary.
- A reasonable phase split:
  1. Boundary + Adornable + Adornment (no conduits yet)
  2. Light value, LightApi skeleton (lightAt walks contents,
     fixtures, exits — no boundaries yet)
  3. `LightSource` mixin
  4. LightConduit + LineOfSight + Window (boundary's first user)
  5. Door retrofit (MovementConduit, LightConduit, LineOfSight)
  6. Per-viewer perception (Shadow integration; species seam stub)
  7. Documentation pass
- Decoration order on Boundary subclasses follows existing
  conventions — Final/Unshadowable on lockdown points only; the
  conduit interface methods are not lockdown-eligible because
  Shadow overrides on conduit transmissivity is a legitimate
  use-case (a `DarknessShadow` boundary).
- Tests should include integration scenarios across multiple
  rooms, not just unit-mixin tests. The propagation walk is the
  thing most likely to surprise.
