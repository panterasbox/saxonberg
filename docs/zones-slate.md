# Zones / Templates Subsystem Refactor (working doc)

Requirements for the templates / zones refactor that the race
subsystem (and any future permission-or-rule-scoped subsystem)
depends on. Intended audience: a planning agent that will turn
this and `race-slate.md` into a single implementation plan, and a
future implementor working in a fresh context.

This doc is not a design doc; it states what we're building and
the constraints, not the line-by-line "how." Where there's an
architectural decision that affects the public surface, it's
called out so the plan honors it. Same shape as
[`subsystems/light.md`](./subsystems/light.md),
[`mixin-slate.md`](./mixin-slate.md), and
[`race-slate.md`](./race-slate.md).

`(have)` = already in the tree.

Cross-references:

- [docs/race-slate.md](./race-slate.md) — the dependent slate;
  uses `Clade` as a Zone subclass and assumes this refactor has
  landed.
- [docs/mixin-slate.md](./mixin-slate.md) — adjacent slate.
- [docs/subsystems/templates.md](./subsystems/templates.md) —
  existing clone pipeline, `Template`, `DomainHook`, the
  folder/leaf invariant. This refactor revises that subsystem.
- [docs/subsystems/spatial.md](./subsystems/spatial.md) —
  `Zone`, `CartesianZone`, `SphericalZone`, `Stuff.zone`.

---

## Goal

Reframe `Zone` and `Template` to honor what zones actually are:
the **permission / rule / scope unit of the template tree.**
Topography (`CartesianZone`, `SphericalZone`) is one *flavor* of
zone, not zone's primary job. The current code conflates "spatial
container" with "template-tree folder"; this refactor pulls them
apart so non-spatial zones (taxonomic clades, future permission
groups, future runtime-rule scopes) can share the same machinery
without inheriting spatial behavior.

Done means: `Zone` is the bare scope abstraction, `SpatialZone`
extends it with the location-aware surface, `CartesianZone` /
`SphericalZone` extend `SpatialZone`, `Template` splits into
`ZoneTemplate` / `LeafTemplate` as type-level subclasses,
`ZoneApi.resolveZoneForPath` / `Stuff.zone` stamping use a
narrower spatial-only set, and the folder/leaf invariant works
over the broader folder set. `Clade extends Zone` is the
canonical first non-spatial Zone subclass; it lands as part of
the race-subsystem build, not here. v1 of this refactor is
purely structural — no permission enforcement, no runtime-rule
machinery.

## Non-goals

- **Permission enforcement.** Single-user game today. No group →
  access mode tables, no permission checks at template
  save/load, no per-zone access-control. Future scope; the
  conceptual story (zones-as-permission-scope) is documented so
  the future work has a clear home.
- **Runtime rule engine.** "Narnian things stay in Narnia" rule
  machinery isn't built. Future scope when content asks for it.
- **Reserved permission / rule slots on `Zone`.** Even the slot
  is deferred — when the machinery lands, it adds the field. v1
  ships nothing speculative.
- **Inheritable defaults from zones to descendants.** "All
  Hominidae default to body plan X" is a Clade-side feature
  (race-slate's territory) deferred until a second species lands
  and earns it.
- **Migration of existing spatial code.** The refactor preserves
  the existing `CartesianZone` / `SphericalZone` API surface;
  their spatial methods just live one class deeper. Callers
  don't notice.
- **Stuff.zone semantics changes.** `Stuff.zone` continues to
  point at the nearest spatial zone (or null). Non-spatial
  zones (Clades) do NOT stamp onto `Stuff.zone`; they're
  reachable through other paths (e.g., species → kingdom).

---

## Principle

Three load-bearing claims:

1. **Zones are permission / rule / scope units of the template
   tree.** The folder/leaf invariant exists because folders
   carry policy that descendants inherit (today: spatial; later:
   permissions, rules).
2. **Topography is one flavor of zone.** The spatial subclasses
   are concrete uses; they don't define what a zone is.
3. **Folder vs leaf is a type distinction, not a runtime
   sniff.** A `ZoneTemplate` is structurally different from a
   `LeafTemplate`. Code that holds one or the other should know
   which it has.

---

## Subsystem overview

Three pieces, dependency-ordered:

1. **Zone class refactor.** Pull spatial-only behavior
   (`addLocation`, `getLocations`, `removeLocation`, `contains`,
   `deriveExit`) out of the abstract `Zone` base into a new
   `SpatialZone` intermediate. `CartesianZone` and `SphericalZone`
   extend `SpatialZone`. The bare `Zone` carries a name and
   nothing zone-flavor-specific.
2. **Template split.** `Template` becomes abstract; introduce
   `ZoneTemplate` and `LeafTemplate` as concrete subclasses.
   `Template.findByPath` discriminates based on `class ∈
   FOLDER_CLASS_PATHS`.
3. **Class-path set rename and split.** `ZONE_CLASS_PATHS` →
   `FOLDER_CLASS_PATHS` (broader; drives the folder/leaf
   invariant). New `SPATIAL_ZONE_CLASS_PATHS` (subset; drives
   `Stuff.zone` stamping in `ZoneApi.resolveZoneForPath`).

---

## Zone as scope unit

What `Zone` is, after the refactor:

- A name.
- The folder-of-templates contract: a Zone's templatePath is a
  prefix under which descendants live; the folder/leaf invariant
  holds.
- Whatever member contract the subclass declares. The abstract
  base does NOT declare a generic member set.

What `Zone` is NOT, after the refactor:

- Spatial (that's `SpatialZone`).
- A container of locations (that's `SpatialZone`).
- The thing universally stamped on every `Stuff.zone` — only
  spatial zones stamp.

### Zone subclasses

| Subclass | Lives in | Members | Purpose |
|---|---|---|---|
| `SpatialZone` (abstract) | `lib/spatial/` | `Set<Location>` | Topographical aggregation; current `Zone` behavior. |
| `CartesianZone` | `lib/spatial/` | inherited | Grid-cell coordinate space. |
| `SphericalZone` | `lib/spatial/` | inherited | Sphere-with-radius coordinate space. |
| `Clade` | `lib/species/` (defined in race-slate) | `Set<Species>` | Taxonomic scope (kingdoms, sub-clades). v1 ships kingdom-rank Clades only. |

Future Zone subclasses (a permission-grouping zone, a
runtime-rule scope) layer in the same way: extend `Zone`,
declare their member type, get folder-classified by adding to
`FOLDER_CLASS_PATHS`.

### What stamps onto Stuff.zone

`Stuff.zone` is the *spatial* zone reference, not the generic
folder reference. `ZoneApi.resolveZoneForPath` walks ancestors
looking for the nearest **spatial** zone, ignoring non-spatial
zone classes.

This implies splitting the existing class-path set:

- **`FOLDER_CLASS_PATHS`** — every Zone subclass. Drives the
  folder/leaf invariant in `DomainHook`.
- **`SPATIAL_ZONE_CLASS_PATHS`** — only `SpatialZone`-derived
  classes. Drives `ZoneApi.resolveZoneForPath` and `Stuff.zone`
  stamping.

`SPATIAL_ZONE_CLASS_PATHS ⊂ FOLDER_CLASS_PATHS`.

For the race tree this means: a species template at
`/obj/species/animalia/.../sapiens` walks ancestors and finds
the Clade at `/obj/species/animalia/`, but Clade isn't in
`SPATIAL_ZONE_CLASS_PATHS`, so the walk skips it and continues
up. No spatial zone exists in `/obj/species/...`, so the species'
`Stuff.zone` is null. Code that needs the species' kingdom asks
`SpeciesApi.getKingdom`, not `species.getZone`.

---

## Template split

`Template` becomes abstract. Two concrete subclasses:

```typescript
abstract class Template extends Persistable {
  static collectionName = 'domain';
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}

class ZoneTemplate extends Template {
  // Type-level marker in v1. Future fields (permissions,
  // rules, inheritable defaults) land here when the
  // corresponding subsystems land.
}

class LeafTemplate extends Template {
  // Standard leaf shape, no zone-only fields.
}
```

`Template.findByPath` resolves the document, then constructs the
right subclass based on `class ∈ FOLDER_CLASS_PATHS`. Callers
narrow at the call site or stay generic against `Template`.

`DomainHook`'s folder/leaf invariant validators stay as a hook
(defense-in-depth at the persistence chokepoint); the type
distinction is the primary expression of the invariant, the hook
catches anything that slips past at runtime.

`hydratorClass` stays on the abstract base — both subclasses can
name hydrators. The clone-pipeline path is unchanged: load
template, validate class path, dynamic-import, construct,
hydrate. The only difference is that `clone()` can statically
know whether a path resolves to a zone or a leaf.

### What the split buys

- **Type-level distinction.** Code that holds a Template knows
  whether it's a folder. No more `ZONE_CLASS_PATHS.has(t.class)`
  sniffing scattered across call sites.
- **A natural home for zone-only fields** (permissions, rules,
  inheritable defaults) when they land. v1 doesn't ship those
  fields, but they have a place reserved when they do.
- **Cleaner `clone` pipeline.** Zone clone returns a singleton;
  leaf clone constructs fresh (modulo `SingletonMixin`). Both
  paths exist already; the type split makes the fork explicit.

### Persistence

`ZoneTemplate` and `LeafTemplate` share the `domain` collection
and `Persistable` machinery. The discriminator at load is the
`class` field's membership in `FOLDER_CLASS_PATHS`.

`PersistentHydrator` works for both. Custom hydrators plug in
via `hydratorClass` like any other hydrator.

---

## Stuff.zone stamping (unchanged in mechanism, narrowed in scope)

`ZoneApi.resolveZoneForPath` continues to walk ancestor paths
nearest-first, but it consults `SPATIAL_ZONE_CLASS_PATHS`
instead of the broader folder set. A non-spatial zone in the
ancestor chain (a Clade) is skipped during the walk. Result:
`Stuff.zone` is the nearest *spatial* zone or null.

The folder/leaf invariant in `DomainHook` continues to consult
the broader `FOLDER_CLASS_PATHS` — non-spatial zones are still
folders, descendants are still allowed under them, the
"ancestor must be a zone-folder" rule still holds.

---

## Decisions locked

- **Zone is the abstract scope unit.** Not spatial. Not
  container-of-locations. The bare base carries name + the
  folder-of-templates contract. No permission slot, no rule
  slot in v1 (deferred).
- **`SpatialZone` is the concrete intermediate** for
  topographical use. `CartesianZone` and `SphericalZone` extend
  `SpatialZone`. All location-aware methods (`addLocation`,
  `getLocations`, `contains`, `deriveExit`, …) live on
  `SpatialZone`, not `Zone`.
- **Template splits into `ZoneTemplate` and `LeafTemplate`,**
  both abstract-`Template` subclasses. Discriminator is `class
  ∈ FOLDER_CLASS_PATHS`. `ZoneTemplate` is a type-level marker
  in v1; future fields land on it.
- **`ZONE_CLASS_PATHS` is renamed `FOLDER_CLASS_PATHS`** (drives
  folder/leaf invariant), and a new `SPATIAL_ZONE_CLASS_PATHS`
  subset drives `Stuff.zone` stamping.
- **`ZoneApi.resolveZoneForPath` consults
  `SPATIAL_ZONE_CLASS_PATHS`,** not the broader folder set. A
  Clade in the ancestor chain does NOT become the
  `Stuff.zone`.
- **`DomainHook`'s folder/leaf invariant continues to fire** at
  the persistence chokepoint, defense-in-depth alongside the
  type distinction. Whether validators stay in the hook or move
  to subclass setters is implementation detail.
- **No permission or rule machinery in v1.** Conceptual story
  documented; implementation deferred. Slots land when the
  corresponding subsystems do.

---

## Open threads

### Naming

Working pick: keep `Zone*` vocabulary throughout (`ZoneTemplate`,
`Zone`, `ZoneApi`), accept that "Zone" is now the broader
concept. Less churn than renaming everything to `Folder*`. The
doc-side reframe (zones-as-scope-unit) carries the semantic.

`FOLDER_CLASS_PATHS` is the one rename worth doing because the
set's role really is "things that are folders," and it cleanly
distinguishes from the new `SPATIAL_ZONE_CLASS_PATHS`. Open to
counter-arguments.

### Whether the abstract `Zone` should declare a generic member contract

`SpatialZone` has `Set<Location>`; `Clade` will have
`Set<Species>`. Should the abstract base declare an abstract
`getMembers(): ReadonlySet<Stuff>` or stay bare?

Working pick: stay bare. Abstract member-type contracts get
awkward fast (variance, narrowing, generic constraints), and
each subclass tends to want its own typed surface anyway. If a
unifying contract turns out to be useful, add it later.

### Whether `DomainHook` validators should move into subclass
constructors

If `ZoneTemplate` / `LeafTemplate` enforce the invariant
structurally at construction (a `LeafTemplate` whose path has a
zone ancestor throws in its constructor), the hook becomes
redundant. But construction-time validation requires looking up
the ancestor template, which is async — awkward in a
constructor.

Working pick: keep the hook. The type distinction is a strong
signal; the hook catches edge cases (misclassified `class`
fields, async validation) at the persistence chokepoint.

---

## Build order

This refactor lands as a preliminary phase ahead of the race
work — same shape as Phase 1 (Boundary infrastructure) in the
Light & Boundary plan. The race build assumes Phases Z1–Z3
have shipped.

**Phase Z1 — Zone class refactor**

1. Introduce `SpatialZone` as an abstract intermediate. Move
   `addLocation` / `removeLocation` / `getLocations` /
   `contains` / `deriveExit` from `Zone` to `SpatialZone`.
   `CartesianZone` and `SphericalZone` extend `SpatialZone`.
2. Strip `Zone` to bare scope shape (just `name` and the
   folder-of-templates contract).
3. Update existing tests; spatial behavior should be unchanged
   end-to-end.

**Phase Z2 — Template split**

4. Make `Template` abstract. Introduce `ZoneTemplate` and
   `LeafTemplate` as concrete subclasses (`ZoneTemplate` is
   type-level only in v1 — no extra fields).
5. Update `Template.findByPath` to construct the right subclass
   based on `class ∈ FOLDER_CLASS_PATHS`.
6. Confirm `DomainHook` still fires its folder/leaf invariant
   correctly. Validators stay where they are unless something
   reads cleaner under the type split.

**Phase Z3 — Class-path set rename and split**

7. `ZONE_CLASS_PATHS` → `FOLDER_CLASS_PATHS` (the existing set,
   broader-named).
8. New `SPATIAL_ZONE_CLASS_PATHS` containing only
   `/lib/spatial/CartesianZone` and `/lib/spatial/SphericalZone`.
9. Update `ZoneApi.resolveZoneForPath` to consult
   `SPATIAL_ZONE_CLASS_PATHS`.
10. Update doc comments in
    `docs/subsystems/templates.md` to reflect the
    folder-vs-spatial-zone split.

(The race subsystem's `Clade extends Zone` work — defining the
class, adding `/lib/species/Clade` to `FOLDER_CLASS_PATHS`,
authoring the kingdom Clade templates — happens in the race
build order, after Phase Z3.)

---

## Acceptance criteria

A successful refactor:

- [ ] `Zone` no longer carries spatial methods. `SpatialZone`
      does.
- [ ] `CartesianZone` and `SphericalZone` extend `SpatialZone`.
      Existing spatial tests pass without behavioral change.
- [ ] `Template` is abstract; `ZoneTemplate` and `LeafTemplate`
      are the concrete subclasses. `Template.findByPath`
      returns the right subclass based on `class` membership in
      `FOLDER_CLASS_PATHS`.
- [ ] `FOLDER_CLASS_PATHS` (broader) and
      `SPATIAL_ZONE_CLASS_PATHS` (subset) exist and drive their
      respective concerns.
- [ ] `ZoneApi.resolveZoneForPath` consults
      `SPATIAL_ZONE_CLASS_PATHS`. A non-spatial zone ancestor
      does NOT stamp onto `Stuff.zone`.
- [ ] `DomainHook`'s folder/leaf invariant continues to fire
      correctly (saves under leaves rejected, deletes of zones
      with descendants rejected).
- [ ] Tests live colocated under `__tests__/`, Vitest.
- [ ] Documentation: `docs/subsystems/templates.md` updated to
      reflect the folder-vs-spatial-zone split, the Template
      subclasses, and the role of zones as scope units.

---

## Notes for the planner

- **Phase by dependency.** The Zone class refactor (Z1) lands
  first because it has the smallest blast radius and Z2/Z3
  build on it conceptually.
- **The Template split is invasive in `TemplateApi`,
  `DomainHook`, and the clone pipeline.** Read
  [docs/subsystems/templates.md](./subsystems/templates.md)
  before planning Phase Z2.
- **Don't design permissions or rule machinery.** v1 doesn't
  reserve slots for them on `Zone` — when the corresponding
  subsystems land, they add the slot. Resist the urge to add
  speculative `permissions: PermissionTable | null` / `rules:
  RuleSpec[] | null` fields.
- **The folder/leaf invariant must keep working through the
  refactor.** It's the load-bearing contract `DomainHook`
  enforces today; any change to the invariant's behavior is
  out of scope.
- **Keep the rename minimal.** Only `ZONE_CLASS_PATHS` →
  `FOLDER_CLASS_PATHS` is mandatory; the rest of the `Zone*`
  vocabulary stays.
