# Zone subsystem

The `lib/zone/` subsystem holds the **Zone-hierarchy roots** — the
abstract scope abstraction (`Zone`), the abstract spatial-coordinate
base (`SpatialZone`), and the generic organizational `FolderZone`.
Concrete spatial-coordinate zones (`CartesianZone`, `SphericalZone`)
live in `lib/spatial/`; non-spatial taxonomy zones (`Clade`, `HomeZone`,
`Biorealm`) live in their own domain folders. All of them extend `Zone`.

## Why a separate subsystem

`Zone` is not a spatial concept — it's the common parent of every
folder-shaped scope in the template tree, spatial and non-spatial.
`SpatialZone` is the abstract base for coordinate-bearing zones, but
its identity isn't a coordinate frame itself. Carving them out of
`lib/spatial/` makes the semantic boundary honest: zone-hierarchy
concerns live in `lib/zone/`; only the spatial-coordinate-bearing
subclasses stay under `lib/spatial/`.

## The class hierarchy

```
                    Zone        (lib/zone/Zone.ts)
                  /  |  \
                 /   |   \
                /    |    \
               /     |     \
   SpatialZone    FolderZone   non-spatial Zone subclasses
   (lib/zone/    (lib/zone/    (in their own folders):
   SpatialZone)  FolderZone)     - HomeZone   (lib/home/)
   /     \                       - Biorealm   (lib/biome/)
  /       \                      - Clade      (lib/species/)
CartesianZone  SphericalZone
(lib/spatial/) (lib/spatial/)
```

- **`Zone`** — bare scope abstraction. Carries a name and the
  folder-of-templates contract (`ZoneApi.isFolderClass` checks
  `prototype instanceof Zone`). Subclasses participate
  automatically without editing a central allow-list.
- **`SpatialZone`** — abstract intermediate carrying the
  location-aware surface (`addLocation`, `getLocations`,
  `removeLocation`, `contains`, `deriveExit`, `canDestruct`).
  Stamps `Stuff.zone`. `CartesianZone` and `SphericalZone`
  extend this — not `Zone` directly.
- **`FolderZone`** — generic organizational scope, no spatial
  topology. Use for templatePath folders like `/domain/narnia/`
  that organize a content team's tree without anchoring a
  coordinate grid. Sub-folders that DO need a coordinate frame
  extend `CartesianZone` / `SphericalZone` instead.
- **`HomeZone`** / **`Biorealm`** / **`Clade`** — domain-specific
  non-spatial Zone subclasses. They extend `Zone` directly, satisfy
  the folder/leaf invariant, but never stamp `Stuff.zone`.

## ZoneApi

`api/zone.ts` owns two concerns:

- **`resolveZoneForPath(templatePath)`** — walks template ancestry to
  find the nearest *spatial* zone; clones lazily via `StuffApi.singleton`.
  Non-spatial Zone ancestors (Clades, FolderZones) are **skipped** —
  they're folders for the template-tree invariant, but never the
  spatial zone for a descendant. Returns `null` when nothing in the
  ancestry is a SpatialZone, or when the input path is itself a
  SpatialZone (a zone isn't inside itself).
- **`isFolderClass(classPath)`** / **`isSpatialZoneClass(classPath)`** —
  structural class-shape predicates. `isFolderClass` is the broad
  check (extends `Zone`); `isSpatialZoneClass` is the narrow one
  (extends `SpatialZone`). The former gates the folder/leaf
  template invariant; the latter gates `Stuff.zone` stamping.

## Field inheritance: `Zone.lookupField`

Field inheritance is an **instance method on Zone**, not a ZoneApi
static — because subclasses can override the walk to participate
differently. Two instance methods make up the polymorphic surface,
backed by one Api orchestration helper:

- **`Zone.lookupField<T>(fieldName): Promise<T | null>`** —
  top-level entry. Reads `fieldName` on this zone first; if absent,
  delegates to `lookupAncestorField`. Returns the nearest
  non-null/non-undefined value, or `null` at universe-root.
  Field-read uses `get<PascalCase>()` first (the inter-Stuff
  contract surface), then direct property access.
- **`Zone.lookupAncestorField<T>(fieldName): Promise<T | null>`** —
  the override seam. Default: ask `ZoneApi.getEnclosingZone(this)`
  for the nearest enclosing Zone, then delegate to *its*
  `lookupField`. The recursion carries the walk upward. Subclasses
  override here to root or redirect inheritance.
- **`ZoneApi.getEnclosingZone(zone): Promise<Zone | null>`** —
  orchestration helper. Walks `Template.ancestorPaths`, skips
  non-folder segments, lazy-clones the hit via
  `StuffApi.singleton`. Lives on the Api layer (not on Zone)
  because the walk is pure plumbing — see
  [architecture.md § Orchestration lives one layer up from raw
  steps](../architecture.md#orchestration-lives-one-layer-up-from-raw-steps).

**Every Zone subclass participates as an inheritance node** —
FolderZones, HomeZones, Clades, and spatial zones alike — because
zone-carried defaults flow through folder ancestry too (e.g., a
`celestialProfile` set on the universe-root FolderZone is inherited
by every spatial zone beneath). Callers layer a settings-style
default on top:

```ts
const profile =
  (await zone.lookupField<CelestialProfile>('celestialProfile'))
  ?? resolveSetting(host, 'world.zone.celestialProfile.default');
```

### Barrier subclasses

A subclass that overrides `lookupAncestorField` to return `null`
becomes an **inheritance barrier**: its own defaults are authoritative
for descendants, and ancestor values do not flow through:

```ts
class RootedZone extends Zone {
  // The zone roots its own defaults — nothing from above leaks in.
  override async lookupAncestorField<T>(_field: string): Promise<T | null> {
    return null;
  }
}
```

No barrier subclass ships in this build — the seam is there for the
moment a real consumer needs it. A subclass could also override
`lookupAncestorField` to consult a non-template-parent source
(e.g., a sibling-template inheritance, or a per-field fallback
chain).

## Zone derivation rule

When the clone pipeline stamps `Stuff.zone` for a freshly-cloned
template, it walks ancestor paths nearest-first and picks the first
ancestor whose `class` resolves to a `SpatialZone` subclass.
**FolderZones (and other non-spatial Zone subclasses) are skipped
during this walk** — they're inheritance nodes for `Zone.lookupField`
but never become `Stuff.zone`. This decouples "this Stuff lives in
this scope" (the spatial nearest-ancestor) from "this Stuff inherits
fields through this scope" (every Zone ancestor).

## Cardinal-only-intra-zone exit invariant

A CartesianLocation accepts cardinal exits unconditionally and
semantic-label exits only when the destination's templatePath
resolves to a *different* zone than the source's. The check is eager
and path-based — `ZoneApi.resolveZoneForPath` walks template ancestry
without loading the destination room. See
[`spatial.md`](./spatial.md) for the full Location-side detail.

## Folder/leaf invariant

The persistence chokepoint validates: a node with descendants must
be a folder (Zone subclass); a leaf node must be a non-Zone class.
Adding a new Zone subclass to satisfy a folder need is the right move
when no existing class fits. `FolderZone` is the generic answer when
the folder doesn't carry domain-specific behavior.

## History

The Zone subsystem was carved out of `lib/spatial/` as part of the
spatial+boundary substrate build that shipped declarative-content
field shapes (`coords`, `focus`, `exits`, `attachedHosts`). The
field-inheritance walk was drafted as `ZoneApi.resolveZoneField` in
the requirements/plan docs but moved to instance methods on `Zone`
during implementation review — the override-on-subclass extension
point (for barrier zones that root inheritance at themselves)
needed instance dispatch. The build's source slates
([zone-architecture-slate.md](../slates/zone-architecture-slate.md)
and [declarative-content-slate.md](../slates/declarative-content-slate.md))
remain as design references; the spawn-shape side
(`PopulatesMixin` + `container:` field + `Login.enter` change) is
deferred to a follow-up build.

The Wave 1 + Wave 2 build landed on the `spacial` branch between
commits `b9afbaa` and `869c47a`.
