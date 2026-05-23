# Biome — requirements

The biome build ships Saxonberg's first "physics of places" substrate:
a template tree that classifies *what kind of place* a Location is,
a capability-mixin seam for biome-scoped traits, atmospheric fields
(temperature / pressure / humidity / gravity / atmosphere medium)
that resolve through an outward-walking override chain across
containment ancestors (so vessels and locations both contribute),
and a pedagogical surface (instruments + an `analyze atmosphere`
verb) that exposes the engine's honest physics units to students. Seeded by
[docs/slates/biome-slate.md](../slates/biome-slate.md); composes onto
the shipped `Quantity<T>` substrate, the `Location` / `Zone` /
`CartesianLocation` / `SphericalLocation` hierarchy, the Material
prefix-walk pattern, and `Zone.lookupField` field inheritance. No
un-shipped slate dependencies.

## Goals

- A `Biome` template class exists in `lib/biome/`, **extends `Zone`**
  (parallel to `Clade extends Zone`; see decision 16), carries
  atmospheric defaults (T / P / RH / g / atmosphere) and ambient
  sensory texture (ambient sound + smell as MML strings), persists
  via the standard Hydrator + `QuantityMarshaller` shape, and
  clones cleanly under `/lib/biome/...`. Biomes play both folder
  and leaf roles — every path under `/lib/biome/` is itself a
  Biome that may carry data AND have child Biomes beneath.
- The biome tree is rooted at `/lib/biome/`, which is itself a
  `Biome` template (the **universe biome**) carrying all five
  atmospheric defaults — 295 K, 101325 Pa, 50 %, 9.81 m/s², `'air'`.
  Every path beneath is a sub-Biome that may carry its own
  defaults; un-set fields inherit through the chain-walk's
  templatePath ancestry to the root. No `Biorealm` class — the
  root is just another Biome. 39 biome leaves are seeded across
  the outdoor / indoor / underground tiers per the slate roster.
- `AtmosphericMixin` composes onto `Location` AND `Vessel` (both
  base classes). Pure containers (`Box`, `Backpack`, treasure
  chests, etc.) do NOT compose it — they're atmospherically
  transparent and skipped by the chain walk. Sparse storage: a
  composing container stores a field only when it overrides;
  unset slots fall through outward. Per-Detail overrides follow
  the same shape Tangible uses for `_detailMaterialPaths` (a
  `Map` per field, prefix-walked on read).
- A single Pattern-A biome ref (`_biomePath`) lives on
  `AtmosphericMixin`; the public surface is `getBiome()` /
  `setBiome(value)` returning/accepting the singleton. Both
  Locations and Vessels can carry a biome ref (a submarine's
  cabin biome at `/lib/biome/special/vehicle-cabin`, a tent's
  interior biome, etc.).
- An override chain resolves any atmospheric field for any
  `(scope, detailKey?)` pair where `scope` is the innermost
  `Stuff & Container`. The chain walks outward through
  containment ancestors:
  1. **For each ancestor** (innermost-first) that composes
     `AtmosphericMixin`:
     a. Detail override on this ancestor (only on the innermost
        scope; the detail key does not propagate to outer
        ancestors)
     b. Prefix-inherited Detail override on this ancestor
        (innermost only)
     c. Room-scope override on this ancestor
     d. Biome default on this ancestor's biome (with template-
        ancestry walk)
     - First override found at any step terminates the walk.
     - Pure-container ancestors are skipped entirely.
  2. If no override resolves: spatial zone default on the
     outermost Location's zone (via `Zone.lookupField` with keys
     `'atmosphere.temperature'` / `'atmosphere.pressure'` / etc.
     — same suffix as the universe-setting keys without the
     `world.` prefix).
  3. Terminal: universe default (read from a private const in
     `BiomeApi` — engine constants, not player settings).

  Porous-by-default falls out: a vessel that composes the mixin
  with no overrides simply walks through to its outer container.
  Partial sealing falls out per-field: a vessel that overrides
  atmosphere only (vacuum-sealed bell jar) lets temperature
  resolve outward while atmosphere stops locally.
- Atmospheres are referenced as a `string` tag on Biome /
  AtmosphericMixin. v1 ships three tags — `air`, `water`,
  `vacuum` — with their densities held as a `const Record<string,
  Quantity<'kg/m³'>>` table in `BiomeApi`. No `AtmosphereDef`
  bundle; no `registerAtmosphere` extension point; no
  `isBreathable` / `defaultLocomotionMode` / `isFluid` / `mmlTag`
  fields. Each of those decorations lands with its actual
  consumer (per-species breathing, locomotion-mode-from-
  atmosphere, etc.) when those consumers are built. If a content
  case demands an atmosphere outside the three, the constants
  table grows by one line.
- `BiomeApi` exposes the biome substrate's full static surface:
  singleton lookup (`findByPath`), per-tag density lookup
  (`densityOf`), per-field chain-resolution helpers
  (`resolveTemperatureFor` / `resolvePressureFor` /
  `resolveHumidityFor` / `resolveGravityFor` /
  `resolveAtmosphereFor`), and the sky-exposure predicate
  (`isSkyExposed`). Resolution helpers take `(scope: Stuff &
  Container, detailKey?: string)` and perform the outward
  containment walk. Convenience getters on `AtmosphericMixin`
  (`getTemperature` / etc.) delegate with `this` as `scope`. No
  `findByPathOrThrow` / `allBiomes` convenience helpers in v1;
  add when a real consumer needs them.
- `Location.getVolume()` and `Location.getCeilingHeight()` are
  declared abstract on the base, returning `Quantity<'m³'> | null`
  and `Quantity<'m'> | null`. `CartesianLocation` derives from
  `cellSize` (cube-cell assumption: volume = `cellSize³`, ceiling
  height = `cellSize`). `SphericalLocation` derives from radius
  using the **inscribed-cube** model for usable interior:
  - volume = `(4/3)πr³` (full sphere — the actual reserved
    space the atmosphere fills; what `n = PV/RT` math operates
    against).
  - ceiling height = `2r/√3` (side of the cube inscribed in
    the sphere, whose space diagonal equals the sphere's
    diameter). The room is conceptually filled by the sphere
    but the usable floor-to-ceiling vertical extent is the
    inscribed cube's side.

  `LocationApi.getVolume(room)` / `getCeilingHeight(room)` exist
  as thin geometry-agnostic wrappers.
- `CartesianZone.cellSize` graduates from informational to
  load-bearing with a default of `3.0` meters.
- `SkyExposedMixin` exposes `isSkyExposed(): boolean`.
  `SkyExposedBiome extends SkyExposedMixin(Biome)` is the concrete
  composition class outdoor biome leaves extend (parallel to
  `RadioactiveMaterial`). `BiomeApi.isSkyExposed(scope)` is the
  ergonomic helper that resolves the scope's biome (walking the
  containment chain to find one) + tests the trait via
  `MixinApi.isSkyExposed(biome)`.
- Five universe-default atmospheric values live on the root
  `Biome` at `/lib/biome/` as data on a seed YAML — NOT as a
  source-level const map. These are engine values, NOT player
  settings — players don't get to vote on what air pressure is.
  The chain's terminal step (step 6) is just "consult the root
  biome"; if a field is unset on the root, the chain throws
  (boot-time invariant: root biome must have all five fields
  set). Content authors who want a non-Earth universe either edit
  the root biome seed (`seeds/lib/biome.yaml`) directly, or set
  values on a top-level Zone via `Zone.lookupField` (step 5 of
  the chain, beats step 6).
- Six instruments ship as Thing templates under
  `seeds/obj/instrument/` (flat, alongside existing `balance` and
  `photometer`): `Thermometer`, `Barometer`, `Hygrometer`,
  `GravityMeter`, `GasAnalyzer`, `Altimeter`. Each routes through
  `BiomeApi.resolveXFor(actor.getContainer(), detailKey?)` so the
  full outward chain walk is exercised. `Altimeter` additionally
  derives altitude from the pressure delta against the root
  biome's `_defaultPressure` (sea-level reference; cached at boot
  via `BiomeApi.findByPath('/lib/biome').getDefaultPressure()` to
  avoid hot-path lookups).
- A `measure <field> here [detail]` verb dispatches to the
  appropriate instrument the actor is wielding (or refuses if no
  matching instrument is in hand). Both `measure` and the
  separate `analyze atmosphere [here|detail]` verb read at the
  actor's immediate atmospheric scope (`actor.getContainer()`),
  so a character inside a sealed vessel reads the vessel's
  atmosphere; a character inside a porous vessel reads through to
  the outer Location. `analyze atmosphere` dumps the full
  resolved-state shape (biome + spatial zone + per-field value +
  provenance + derived geometry + per-detail overrides) per the
  Layer 7 example in the slate, with provenance showing which
  ancestor each value came from.
- `docs/subsystems/biome.md` graduates from the slate as the
  permanent reference for the substrate.

## Non-goals

Explicitly out of scope for this build; if listed alongside a
target slate, that's where the work will land.

- **Sub-room geometry.** No coordinates within a room; no
  volumetric distribution of values. Details remain the only
  per-feature seam, and Details don't carry positions.
- **Weather, celestial bodies, day/night.** Owned by a future
  weather slate. `SkyExposedMixin.isSkyExposed()` ships as a
  predicate; no consumer of celestial / weather logic is built.
- **Per-species breathing or atmospheric hazard mechanics.** v1
  does not ship `isBreathable` data, gate logic, or any
  consumer. When per-species breathing lands, it adds whatever
  data shape it needs alongside its consumer (likely a
  per-atmosphere breathability map or a per-Species
  `breathableAtmospheres` set), not in advance.
- **Atmosphere-driven locomotion mode default.** v1 does not
  ship `defaultLocomotionMode` data or wire it into
  `LocomotionApi.defaultModeFor`. The eventual integration is a
  one-line follow-up there at the time it's actually built.
- **`AtmosphereDef` bundle or `registerAtmosphere` extension
  point.** v1 ships only density-by-tag from a const table in
  `BiomeApi`. If content authoring grows beyond the three v1
  tags and needs author-extensible atmospheres, promote to an
  `Atmosphere` templated singleton (parallel to Material) at
  that time — that's strictly additive.
- **Dynamic atmospheric simulation.** Authored constants only. A
  door opening between rooms at different temperatures does not
  gradient. The data shape is honest; dynamic propagation is a
  later wave.
- **Sound and scent propagation.** Sound is sound-slate territory;
  smell is a future sense slate. Biome carries ambient sound +
  smell as MML strings for biome-shaped rendering, but does not
  ship propagation machinery for either.
- **Pedagogical-seam global setting.** A per-player toggle between
  friendly tags and real units (mentioned in both sound and
  biome slates) is deferred to a shared cross-cutting setting
  the relevant slates land together. Biome's instruments + verb
  default to mixed rendering per the slate's Layer 7 example.
- **Procedural / time-of-day biome variants.** A biome whose
  defaults vary per clone is not built; the slate keeps the door
  open by *not* composing `Singleton` on `Biome` by default, but
  no procedural mechanism ships.
- **Atmosphere → Material cross-link.** A future "air in this
  room participates in bulk-gas thermodynamics" link via Material
  is flagged on the Material subsystem doc; no integration in v1.
- **Conduit channel-keyed transmissivity refactor.** Stays in
  the sound slate (which is the consumer that needs it). Biome
  does not modify the Boundary substrate.
- **`acousticImpedance` on Material.** Same: sound-slate concern.
- **Cumulative noise / atmospheric dose tracking** (hearing
  damage, toxin exposure). Future.
- **Off-cube `CartesianZone` cells.** A future `verticalCellSize`
  for "ceilings taller than cells are wide" is out of scope; v1
  commits to cube cells.

## Surface decisions

The closed answers to the slate's 14 open questions. One subheading
per decision; alternatives are recorded only when load-bearing for
understanding the choice.

### 1. No `Biorealm` class — root is itself a Biome

Earlier drafts proposed a `Biorealm extends Zone` folder class to
anchor the biome tree at `/lib/biome/`. Dropped: the root at
`/lib/biome/` is itself a `Biome` template (the **universe
biome**) carrying all five atmospheric defaults. Same pattern
that lets a Clade carry data AND have children — see decision 16.
The Biorealm class isn't built; only `Biome` (+ `SkyExposedBiome`)
exist in `lib/biome/`. `ZoneApi.isFolderClass(Biome)` returns
true (Biomes can have children); `isSpatialZoneClass(Biome)`
returns false (no coordinate system).

### 2. Path layout under `/lib/biome/` — indoor / outdoor / underground top-level

The path tells the reader the SkyExposed-vs-not class choice
immediately. Outdoor leaves live under `outdoor/temperate/`,
indoor under `indoor/{academic,residential,social,civic,special}/`,
underground under `underground/`. Matches the slate's roster.

### 3. `Biome` does not compose `Singleton` by default

Leaves room for future procedural / time-of-day variance per
clone. Authors who need strict singleton behavior compose
`Singleton` on their specific Biome subclass. `BiomeApi.findByPath`
works either way.

### 4. Atmosphere medium tag is a `string`; density lookup via const map

Not a `Quantity` tag-table integration (atmosphere isn't a
scalar). Not an `AtmosphereDef` bundle behind a registry (no v1
consumer needs the four speculative fields the slate proposed —
`isBreathable`, `defaultLocomotionMode`, `isFluid`, `mmlTag`).
Not an `Atmosphere` templated singleton (overhead unjustified
for 3 entries and 2 v1 consumers).

v1 ships:
- `_atmosphere: string | null` on AtmosphericMixin (and `_defaultAtmosphere` on Biome).
- `BiomeApi.densityOf(tag): Quantity<'kg/m³'>` reads a private
  const map with three entries: `air` (1.225), `water` (1000),
  `vacuum` (0).

If a fourth atmosphere is needed for content, the map grows by
one line. If content authoring eventually needs author-
extensible atmospheres (chemistry mod, etc.), promote to an
`Atmosphere extends Idea` templated singleton parallel to
`Material` at that point — strictly additive change.

Reasoning recorded because it overrides the slate: the slate's
"same pattern Material uses" was incorrect (Material is
templates, not a registry); the four extra `AtmosphereDef`
fields are speculative substrate for un-built consumers and fall
afoul of "don't design for hypothetical future requirements"
(CLAUDE.md) + `feedback_no_premature_registries`.

### 5. `AtmosphericMixin` composes onto `Location` AND `Vessel`

Not onto a separate `PhysicalLocation` intermediate, and not onto
the `Container` base. Every Location and every Vessel has the
*possibility* of atmospheric state; pure containers (Box, Backpack,
treasure chest) do not. Sparse storage means the cost on a Vessel
that never sets any atmospheric value is just a handful of `null`
fields + empty `Map`s. A hypothetical future "dream realm" Location
that wants to opt out can override the getters to return universe
defaults or be its own class outside this layer.

See decision 15 below for the porous/sealed/partial-sealing
semantics that fall out of this placement choice.

### 6. Sparse storage on `AtmosphericMixin`

`null` in any field slot means "fall through to the next
atmospheric ancestor / biome / zone / universe." Empty `Map`
slots mean "no per-detail overrides at all." Matches Material's
shape; simpler persistence story (don't persist `null` slots);
honest semantics for "this scope (room or vessel) overrides X."

### 7. No override-chain caching in v1

Each getter walks the chain on every read. Cache invalidation
across biome-template hot reload is messy; defer until profiling
shows real consumers running hot. Re-evaluate if perception scans
or instrument loops drive measurable cost.

### 8. Spherical geometry — inscribed-cube usable interior

`SphericalLocation.getCeilingHeight()` returns `2r/√3` — the side
of the cube inscribed in the sphere (cube's space diagonal `=
2r`, so side `= 2r/√3`). The inscribed cube is the "usable
interior" for floor / ceiling / walk-around purposes; the full
sphere is the room's physical reservation (adjacent spheres
can't overlap).

`SphericalLocation.getVolume()` returns `(4/3)πr³` — the full
sphere volume. Honest for atmospheric mass / `n = PV/RT`
calculations (gas fills the sphere, not the inscribed cube).

The asymmetry is intentional: the two methods measure two
different physical questions. Volume = "how much gas does the
room hold?" Ceiling = "how much vertical headroom is there?"
Sphere answers the first; cube answers the second.

Earlier alternatives considered + rejected:
- `getCeilingHeight() = 2r` (full diameter) — would place the
  ceiling at the top of the sphere, which is unreachable from
  the floor cube. Original draft; replaced.
- `getCeilingHeight() = r` (focus-at-floor convention) — doesn't
  match `spatial.md`'s radius semantics (focus-to-perimeter
  distance) and unrelated to the cube interpretation.
- `getVolume() = (2r/√3)³` (inscribed-cube volume) — symmetric
  with ceiling but loses the actual atmospheric-fill volume; gas-
  law math would underestimate room air mass by ~63%.

### 9. Cube-cell assumption on `CartesianZone`

`getVolume()` returns `cellSize³`; `getCeilingHeight()` returns
`cellSize`. A future "ceilings taller than cells are wide" mode
adds a separate `verticalCellSize` field; out of scope here.

### 10. Detail-key conventions — silent no-effect, prefix walk on read

`AtmosphericMixin` accepts whatever string the host's `DetailedMixin`
uses. No cross-validation that the detail key exists. Authors who
set an override for a non-existent detail key get silent no-effect
on the get side (the value sits in the Map and is never read).
Mirrors `Tangible.setMaterial(value, detailKey)`'s intentional
decoupling.

On read, prefix walk: `'hearth.flame'` checks `'hearth.flame'`
first, then `'hearth'`, then falls through to the room/biome
chain. Longest-prefix-first per the Material walk at
`race.md:129–145`.

### 11. v1 biome roster — full 39 leaves

Seeded under `outdoor/temperate/` (15), `underground/` (3),
`indoor/academic/` (7), `indoor/residential/` (3),
`indoor/social/` (1), `indoor/civic/` (4), `indoor/special/` (6).
Parent biomes at each tier carry shared defaults; leaves declare
what differs. Inheritance via the biome template-ancestry walk
(step 4 of the chain). Roster matches the slate's "v1 biome
roster" section verbatim.

### 12. Weather subsystem coupling — deferred

`SkyExposedMixin` ships the `isSkyExposed()` predicate. Future
`getCelestialBodies()` / `getWeather()` methods on the mixin land
with their consuming subsystems; no weather behavior in v1.

### 13. Locomotion-mode-from-atmosphere coupling — deferred

No `defaultLocomotionMode` data ships in v1 (decision 4 dropped
the `AtmosphereDef` bundle that originally carried it). When the
locomotion slate goes formal and wants atmosphere-aware default
modes, it'll add whatever shape it needs at that time — likely a
small per-tag map alongside `BiomeApi.densityOf` or a direct
case in `LocomotionApi.defaultModeFor`. v1 doesn't change
locomotion.

### 14. Pedagogical-seam global setting — deferred

A per-player toggle between friendly tags and real units belongs
as a cross-cutting setting alongside sound's; not a biome-
specific concern. Instruments + `analyze atmosphere` default to
the mixed rendering shape in the slate's Layer 7 example
(canonical-units + friendly tag in parentheses).

### 15. Vessel atmospherics via outward-walking chain

**Open question raised during requirements review** — the slate
only places `AtmosphericMixin` on `Location` and does not address
vessels.

Closed answer: `AtmosphericMixin` composes onto **both** `Location`
and `Vessel`. The chain walks *innermost-container-outward* through
containment ancestors, taking the first override found at any
atmospheric ancestor. Pure containers (Box, Backpack, treasure
chest) skip the walk by not composing the mixin.

The three vessel behaviors fall out automatically from sparse
storage:

- **Porous vessel** (a wicker basket, a porous diving cage): the
  vessel composes `AtmosphericMixin` but sets no overrides. Every
  field is `null`; the chain walks straight through to the outer
  Location. Behaviorally identical to a vessel that doesn't compose
  the mixin at all — composition is opt-in for forward
  extensibility, not behavioral necessity.
- **Sealed vessel** (a submarine, a pressurized lab module): the
  vessel overrides one or more fields. Reads for those fields
  terminate at the vessel; reads for un-overridden fields fall
  through outward.
- **Partial sealing** (a vacuum bell jar that overrides atmosphere
  to `'vacuum'` but not temperature): per-field falls out for free.
  Atmosphere reads stop at the jar; temperature reads walk outward.

Detail keys (`hearth`, `altar.flame`) apply only at the innermost
scope. A character query at a vessel level doesn't carry a detail
key from the vessel into the enclosing room. An instrument query
addressing a Location-level detail (`measure temperature hearth`)
implies the actor is querying their immediate Location's detail,
not their immediate vessel.

Alternatives considered:

- Defer vessel atmospherics entirely (v1 Location-only). Rejected
  because the design fork is real and the "go big" framing leaves
  no good reason to punt.
- `AtmosphericMixin` on `Container` base (every container
  atmospheric). Rejected because pure containers (backpack,
  treasure chest, glass bottle) shouldn't pay field-storage cost
  for state that has no semantic meaning for them — and "this
  backpack has atmosphere" reads strangely.

### 16. `Biome extends Zone`; folder/leaf invariant does not apply to biome tree

**Open question raised during plan review** — the slate and the
original plan had `Biome extends Idea` and used per-tier `Biorealm`
folders + sibling `_defaults.yaml` Biome seeds to carry inherited
tier defaults. That ran into the folder/leaf invariant (a Zone path
holds folder OR leaf, not both) and produced ugly authoring.

Closed answer: **`Biome extends Zone`** (parallel to `Clade extends
Zone`). Every path under `/lib/biome/` AND the root path itself is
a `Biome` template that may both carry data *and* have children.
No `Biorealm` class exists — the root is just another Biome (the
universe biome) carrying the five universal-default atmospheric
values (decision 1).

Reasoning:

- The folder/leaf invariant exists to prevent nested coordinate
  systems on `SpatialZone` (you can't put a Cartesian grid inside a
  Cartesian grid sensibly). It does NOT apply to taxonomic Zone
  subclasses where the path tree is pure inheritance with no
  coordinate system.
- Direct precedent: `Clade extends Zone` carries data (`name`,
  `rank`) AND hosts children (sub-clades + Species leaves at the
  same path level). The `seeds/lib/species/animalia.yaml` is the
  Clade seed; `seeds/lib/species/animalia/` holds its children.
  Biomes follow the same pattern.
- Chain step 4 walks pure `templatePath` ancestors — each is a
  Biome whose defaults the walker queries. No YAML `extends:`
  ceremony; no `_defaults` siblings; one inheritance mechanism
  (the chain walk), not two.
- Runtime safety: Biome being a Zone does NOT affect runtime
  containment. `someStuff.getZone()` returns the runtime
  `SpatialZone`, never a Biome. The Zone-subclass-ness of Biome
  only affects template-tree resolution.

Single difference from Clade: biomes don't have a separate leaf
class (no analog to `Species` under `Clade`). `Biome` plays both
folder and leaf roles. Sky-exposed biomes use the `SkyExposedBiome`
subclass; everything else uses plain `Biome`.

Alternatives considered + rejected:

- `Biome extends Idea` with per-tier `Biorealm` folders + sibling
  `_defaults.yaml` Biome seeds + leaves using YAML `extends:` —
  the original plan default. Rejected because it requires two
  inheritance mechanisms (chain walk + YAML compile-time merge)
  and authoring `_defaults` siblings is cosmetically ugly.
- Flat namespace — each leaf re-declares all defaults. Rejected
  because it loses inheritance entirely; 15 outdoor/temperate
  edits for a single shared-value change.

## Constraints

The planner must respect these. Each cites the rule's origin.

- **Pattern A for the biome ref.** Singleton-by-template-path;
  field is `_biomePath: string | null`; public surface is
  `getBiome(): Biome | null` / `setBiome(value: Biome | null)`;
  no raw-path getter unless a real consumer demands it; no raw
  setter. Per [docs/ref-shapes.md § Pattern A](../ref-shapes.md).
- **Sparse storage matches Tangible exactly.** Five room-scope
  fields each defaulted to `null`; five per-Detail Maps each
  defaulted to an empty `Map`. `persistentFields` lists all 11.
  No "always-present" alternative; no auto-populate-from-biome on
  clone.
- **Per-field invariants on setters, not on save.** Validation
  for atmospheric field values (Quantity unit match, etc.) lives
  on the `setX` method; no post-hydrate normalize hook. Per
  CLAUDE.md "Per-field invariants belong on setters" and the
  matching memory entry.
- **Quantity round-trip via `QuantityMarshaller`.** Each Quantity-
  typed field gets a `static fieldMarshallers` entry on the
  declaring class binding the field name to
  `QuantityMarshaller.pathFor(unit)`. Per
  [docs/subsystems/quantities.md § QuantityMarshaller](../subsystems/quantities.md).
- **Cross-cutting helpers live on Apis.** Biome-shaped helpers
  (resolution chain walks, sky-exposure, density lookup, biome
  lookup) live on `BiomeApi`. Geometry-agnostic wrappers live on
  `LocationApi.getVolume` / `getCeilingHeight`. No free-floating
  helper modules. Per CLAUDE.md "Module Categories" + "Go
  Through the API Layer."
- **Chain walk through containment ancestors.** The chain
  iterates `scope` and its outward containment ancestors. At
  each ancestor: if `MixinApi.isAtmospheric(ancestor)`, run
  steps a–d (detail → prefix → room-scope → biome ancestry); the
  first override anywhere terminates the walk. Non-atmospheric
  ancestors (pure `Container` subclasses) are skipped. Detail-key
  steps (a + b) apply only on the innermost ancestor; outer
  ancestors are queried for the bulk value only.
- **Zone-default key convention.** When the chain falls through
  to the spatial-zone step, it reads via
  `outerLocation.getZone()?.lookupField<Quantity<U>>('atmosphere.<field>')`
  where `<field>` is the bare name (`temperature`, `pressure`,
  `humidity`, `gravity`, `atmosphere`). The same suffix as the
  universe-setting keys without the `world.` prefix. Zones don't
  need to compose `AtmosphericMixin`; they participate via
  `Zone.lookupField`'s generic field-inheritance walk.
- **Instrument scope handling.** Verb code calls
  `BiomeApi.resolveXFor(scope, detailKey?)` with `scope =
  actor.getContainer()`. If `getContainer()` returns `null`
  (actor outside any container — shouldn't happen for online
  players but possible for limbo'd Stuff), the verb refuses with
  a controller-rejected note rather than throwing.
- **Method-only inter-Stuff contract.** Authors and consumers
  read/write atmospheric state via `room.getTemperature(...)` /
  `room.setTemperature(...)`; no `room.temperature` direct field
  access from outside the host's class body. Per CLAUDE.md
  "Inter-Stuff Contract."
- **Conduit shape unchanged.** Biome does not modify the
  `LightConduit` / sound-future interface, does not add a
  `Record<ChannelKind, number>` shape, does not refactor
  `lightTransmission`. That refactor belongs to sound-slate when
  it ships.
- **Hot-private not used on persistent fields.** All atmospheric
  fields and biome refs are TypeScript `protected`, not `#`, per
  CLAUDE.md "Member Privacy" — the Hydrator reflects into them by
  name.
- **`Biome` placement.** `lib/biome/` is a new
  subsystem folder. `Biome.ts`, `Atmospheric.ts`, `SkyExposed.ts`,
  `SkyExposedBiome.ts`. (No `Biorealm.ts` — decision 1.) Mixin
  filenames drop the `Mixin` suffix per CLAUDE.md "File Naming
  Conventions." `api/biome.ts` for the Api. New mixins added to
  the `Mixins` registry in `lib/mixin.ts`.
- **AtmosphericMixin composition on `Location` AND `Vessel`.**
  Composed into the base class composition for both (so all
  Location subclasses and all Vessel subclasses pick it up via
  inheritance). NOT composed onto `Container` base — pure
  containers stay atmospherically transparent.
- **Cube-cell convention is load-bearing on `CartesianZone`.**
  Document it in the cellSize getter's contract; tests cover it;
  no field-level "non-cube mode" flag.
- **Sphere-center convention is load-bearing on `SphericalLocation`.**
  Same: documented contract; not switchable.
- **Single-room SkyExposed exception via biome subclass.**
  Authors do not flip SkyExposed per-room. The atrium-in-cafeteria
  scenario authors a child biome `/lib/biome/indoor/cafeteria/atrium`
  that extends `SkyExposedBiome` while sibling rooms point at the
  plain-`Biome` parent. The biome chain inherits shared defaults;
  the child overrides what differs.
- **39-leaf inheritance discipline.** Authors push shared defaults
  to the parent biome at each tier (`outdoor/temperate` carries
  the 42°N seasonal-mean defaults; `indoor/academic` carries the
  paper/wood/chalk ambient; etc.). Leaves declare only what
  differs.
- **New unit tag tables to add.** K (thermal: freezing / cold /
  cool / warm / hot / scorching), Pa (vacuum / low / normal /
  high / crushing), % (dry / comfortable / humid / saturated),
  m/s² (microgravity / low / normal / heavy / crushing). m³ and
  m stay tagless (rendered numerically by instruments). kg/m³
  already has a density tag table from Material.
- **Instruments are Things, not Apis.** Each instrument template
  composes the existing `Holdable` shape and dispatches its verb
  through `BiomeApi.resolve*`. No new Api per instrument.
- **`analyze atmosphere` runs without an instrument.** Verb is
  available to any actor; renders the full chain trace + derived
  geometry. Cheap; doubles as a developer debug tool.

## Acceptance criteria

Concrete, checkable, ordered by area.

**Biome class + root universe biome**

- `lib/biome/Biome.ts` defines `class Biome extends Zone` (per
  decision 16, parallel to `Clade extends Zone`) with
  five atmospheric default fields, two ambient MML fields, the
  matching `getX`/`setX` pairs, and `persistentFields` listing
  all seven.
- `seeds/lib/biome.yaml` seeds the root **universe biome** at
  `/lib/biome/` as `class: /lib/biome/Biome` with all five
  defaults set: `_defaultTemperature: 295 K`,
  `_defaultPressure: 101325 Pa`, `_defaultHumidity: 50 %`,
  `_defaultGravity: 9.81 m/s²`, `_defaultAtmosphere: 'air'`. Sub-
  biomes live under `seeds/lib/biome/...`; the boot log shows
  them loaded.
- Boot-time invariant test: the root biome `/lib/biome/` exists
  AND has all five `_defaultX` fields non-null.
- A clone of a Biome template under `/lib/biome/outdoor/temperate/quad`
  round-trips its atmospheric defaults through save/load
  unchanged (Quantity marshaller test).

**Atmosphere density lookup**

- `BiomeApi.densityOf(tag: string): Quantity<'kg/m³'>` exists and
  is decorated. Reads from a private const map; throws on
  unknown tag.
- The const map has three entries: `air` → 1.225 kg/m³, `water`
  → 1000 kg/m³, `vacuum` → 0 kg/m³.
- No `registerAtmosphere` / `getAtmosphereDef` /
  `AtmosphereDef` interface — these are deliberately absent.
- Test: `BiomeApi.densityOf('air')` returns
  `Quantity.of(1.225, 'kg/m³')`. `BiomeApi.densityOf('unobtanium')`
  throws with a clear "unknown atmosphere tag" message.

**AtmosphericMixin + chain resolution**

- `lib/biome/Atmospheric.ts` defines `AtmosphericMixin` with the
  11 protected fields (`_biomePath`, 5 room-scope, 5 per-Detail
  Maps), `persistentFields` listing all 11, and the public
  surface from the slate's Layer 3.
- `Location` composes `AtmosphericMixin` in its base composition;
  `CartesianLocation` and `SphericalLocation` pick it up via
  inheritance.
- `Vessel` composes `AtmosphericMixin` in its base composition;
  `ExitableVessel` picks it up via inheritance. Pure `Container`
  base does NOT compose it.
- `BiomeApi.resolveTemperatureFor(scope, detailKey?)` (and the
  four sibling methods) walks the chain: innermost-container-
  outward through ancestors, checking atmospheric ancestors at
  each step, then zone, then universe. Convenience getters on
  `AtmosphericMixin` (`room.getTemperature(detailKey?)`) delegate
  with `this` as `scope`.
- Test: `room` with no overrides, no biome ref → returns universe
  default for each field.
- Test: `room` with a biome ref but no overrides → returns biome's
  default. With biome's default `null` → walks to biome's
  template-ancestry parent. With ancestry exhausted → walks to
  spatial zone (`Zone.lookupField('atmosphere.temperature')`).
  With zone exhausted → universe default.
- Test: `room.setTemperature(Q(800,'K'),'hearth')` →
  `room.getTemperature('hearth')` returns 800 K;
  `room.getTemperature()` returns the room/biome/zone/universe
  default unchanged.
- Test: `room.setTemperature(Q(1200,'K'),'hearth.embers')` →
  `room.getTemperature('hearth.embers')` returns 1200 K;
  `room.getTemperature('hearth.something-else')` returns 800 K
  (prefix walks to `'hearth'`); `room.getTemperature('elsewhere')`
  returns the room/biome/zone/universe chain.
- Test: setting any field to `null` deletes the slot; next read
  falls through.

**Vessel atmospherics — the outward-walking chain**

- Test: porous vessel — `Vessel` with no overrides inside a
  Location with biome → `BiomeApi.resolveTemperatureFor(vessel)`
  returns the Location's resolved temperature.
- Test: sealed vessel — `Vessel` with `setTemperature(Q(295,'K'))`
  + `setAtmosphere('air')` inside an underwater Location
  (atmosphere='water', T=287K) → resolveFor(vessel) returns 295 K
  / air for the vessel's own query; resolveFor(outerLocation)
  returns the water Location's value, unaffected.
- Test: partial sealing — `Vessel` with only `setAtmosphere('vacuum')`
  (a bell-jar) inside a temperate Location → resolveFor(jar) for
  atmosphere returns `'vacuum'`; resolveFor(jar) for temperature
  returns the outer Location's temperature.
- Test: nested vessels — `Vessel B` (atmosphere='water' only,
  no temperature) inside `Vessel A` (T=295K, atmosphere='air') →
  resolveFor(B) returns atmosphere='water' but T=295K (walks past
  B's null temperature to A's override).
- Test: atmospherically-transparent container — `Box` (pure
  `Container`, no `AtmosphericMixin`) inside a Location with
  biome → `BiomeApi.resolveTemperatureFor(box)` returns the
  Location's resolved temperature (box is skipped in the walk).
- Test: detail-key locality — a vessel with no detail overrides
  is queried with `detailKey: 'hearth'`. Detail-key + prefix
  steps don't apply at the vessel; the walk proceeds to the
  outer Location, which IS queried with the detail key. Same
  query with `scope: outerLocation, detailKey: 'hearth'` returns
  the hearth override at the Location.

**SkyExposed seam**

- `lib/biome/SkyExposed.ts` defines `SkyExposedMixin` with
  `isSkyExposed(): boolean` returning `true`. `Mixins.SkyExposed`
  is registered.
- `lib/biome/SkyExposedBiome.ts` defines
  `class SkyExposedBiome extends SkyExposedMixin(Biome)`.
- All 15 outdoor leaves under `outdoor/temperate/` extend
  `SkyExposedBiome`; the 3 underground leaves and the 21 indoor
  leaves extend plain `Biome`.
- `BiomeApi.isSkyExposed(scope)` resolves the scope's nearest
  biome ref (walking the containment chain) and tests the trait
  via `MixinApi.isSkyExposed(biome)`. Returns `false` for scopes
  with no resolvable biome.
- Test: a room with biome `/lib/biome/outdoor/temperate/quad` →
  `BiomeApi.isSkyExposed` returns true. Same room re-pointed
  at `/lib/biome/indoor/academic/classroom` → returns false.
- Test: scenario C from the slate — `/lib/biome/indoor/cafeteria`
  is plain Biome; `/lib/biome/indoor/cafeteria/atrium` extends
  SkyExposedBiome; the atrium Location reports SkyExposed while
  sibling cafeteria rooms do not.

**Derived geometry**

- `Location.getVolume()` and `Location.getCeilingHeight()` declared
  abstract returning `Quantity<U> | null`.
- `CartesianLocation` overrides both. `CartesianZone.cellSize`
  default is `3.0`. Test: a `CartesianLocation` with a default
  zone returns `Q(27,'m³')` for volume and `Q(3,'m')` for ceiling.
- `SphericalLocation` overrides both. Test: with `radius` 2 m,
  returns `Q((4/3)·π·8,'m³')` (≈ 33.51 m³, full sphere) and
  `Q(4/√3,'m')` (≈ 2.309 m, inscribed cube side).
- `LocationApi.getVolume(room)` and `getCeilingHeight(room)` exist
  as thin wrappers; both decorated.

**Universe-default values on the root biome**

- `seeds/lib/biome.yaml` sets all five defaults on the universe
  biome at `/lib/biome/`: 295 K, 101325 Pa, 50 %, 9.81 m/s²,
  `'air'`.
- Step 6 of the chain walks up to the root biome and reads its
  defaults. NOT a const map in source. NOT a `resolveSetting`
  call. NOT exposed through `EnvironmentMixin` / `settings`.
- If a query exhausts the chain without finding a value (root
  biome unset for that field), the chain throws with a clear
  "root biome missing default for X" error. This is a boot-time
  invariant; a separate test asserts the root biome has all five
  fields set so the throw is unreachable in practice.
- Test: a `BiomeApi.resolveTemperatureFor(scope)` where `scope`
  has no overrides + no biome + no zone defaults returns
  `Quantity.of(295, 'K')` (read from root biome).
- Test: `BiomeApi.findByPath('/lib/biome').getDefaultPressure()`
  returns `Quantity.of(101325, 'Pa')` — this is the path
  `Altimeter` uses for its sea-level reference.

**Instruments + verbs**

- Six instrument templates exist as Thing seeds with appropriate
  `Holdable` composition: `Thermometer`, `Barometer`, `Hygrometer`,
  `GravityMeter`, `GasAnalyzer`, `Altimeter`.
- A `measure <field> [here|<detail>]` verb dispatches to the
  matching instrument the actor is wielding. Refuses with
  controller-rejected note + scene message if no matching
  instrument is in hand.
- Reading an instrument routes through `BiomeApi.resolveXFor`
  with `actor.getContainer()` as scope, so a character inside a
  sealed vessel measures the vessel's atmosphere; the chain walk
  is exercised end-to-end including the outward-walk path.
- `Altimeter` computes altitude from `(reading − universe-pressure)
  / (ρ·g)` using the room's atmosphere density + universe gravity.
- `analyze atmosphere [here|<detail>]` verb produces the output
  shape from the slate's Layer 7 example: biome path, spatial-zone
  path, per-field (value + source layer + path traversed), derived
  (volume + ceiling + density), per-detail overrides if any.
- Verb-output rendering uses the canonical unit + friendly tag in
  parentheses (`295 K (warm)`).

**Biome roster**

- 39 biome leaves seeded under the path layout per decision 2.
- Per-tier parent biomes (`outdoor/`, `outdoor/temperate/`,
  `indoor/`, `indoor/academic/`, `indoor/residential/`,
  `indoor/social/`, `indoor/civic/`, `indoor/special/`,
  `underground/`) carry shared defaults; leaves declare what
  differs.
- Tier counts: outdoor/temperate 15; underground 3; indoor/academic
  7; indoor/residential 3; indoor/social 1; indoor/civic 4;
  indoor/special 6 (= 39).
- Test: `BiomeApi.findByPath('/lib/biome/outdoor/temperate/quad')`
  returns the quad biome; walking the template-ancestry chain
  resolves to the temperate parent's defaults for any field the
  leaf doesn't override.

**Tag tables**

- New `Quantity` tag tables registered for K, Pa, %, m/s² with
  the breakpoints from the constraints list. m³ and m stay
  tagless. kg/m³ already has Material's density table.

**Docs**

- `docs/subsystems/biome.md` graduated from the slate, covering:
  Biome class shape (extends Zone) + field roster + no Biorealm;
  the root universe biome at `/lib/biome/` with all five defaults
  set; AtmosphericMixin field layout + method surface +
  composition onto both Location and Vessel; the override chain
  with example traces including vessel cases (porous, sealed,
  partially sealed, nested); the atmosphere tag shape + the
  3-entry density map (air / water / vacuum) + the "promote to
  templated singleton if extensibility is needed" note;
  SkyExposedMixin + SkyExposedBiome + `BiomeApi.isSkyExposed`;
  derived geometry + cellSize graduation + inscribed-cube
  spherical convention; the instruments + analyze verb (with
  the actor-scope reading rule); the 39-leaf roster shape (tree
  + per-tier defaults inheriting up to the root). Cross-
  references to quantities / spatial / race / light / zone /
  ref-shapes.
- `docs/subsystems/spatial.md` updated: `CartesianZone.cellSize`
  section reflects graduation to load-bearing; `Location`
  section mentions abstract `getVolume()` / `getCeilingHeight()`
  + `AtmosphericMixin` composition; `Vessel` section mentions
  `AtmosphericMixin` composition + the outward-walking chain
  semantics; cross-link to `biome.md`.
- `docs/subsystems/race.md` cross-reference added: a future
  per-species breathing gate will need an atmosphere-tag → breath
  rule shape; v1 does not pre-build that data, but the
  cross-reference flags where the seam will land.
- `docs/ref-shapes.md` Pattern A exemplar list adds `Atmospheric._biomePath`.
- `docs/architecture.md` mentions `lib/biome/` and the new Api.
- `docs/antipatterns.md` gains an entry for "inline atmospheric
  chain walk" → "go through `BiomeApi.resolve*`."
- `CLAUDE.md` Documentation Map subsystems list adds a biome entry
  with the standard description.
- `Mixins` registry constants in `lib/mixin.ts` gain entries for
  `Atmospheric`, `SkyExposed`.

**Test scaffolding overall**

- Vitest coverage for the chain walk (each layer), prefix walk,
  template-ancestry walk, sphere/cube geometry math, SkyExposed
  resolution, scenario A (cafeteria with hot hearth), scenario C
  (atrium exception), scenario E (gas-law numbers on the
  cafeteria — the test computes `n = PV/RT` against the room's
  resolved values and asserts the round-trip is honest).

## Cross-references

**Seeding slate**

- [docs/slates/biome-slate.md](../slates/biome-slate.md) — the
  source for all 7 layers, 14 open questions (closed in this
  doc; #15 added during review), the 39-leaf biome roster, the
  scenarios, and the Layer 7 `analyze atmosphere` example. The
  slate's atmosphere registry roster (7 entries +
  `AtmosphereDef` bundle) is **overridden by decision 4** in
  this doc — v1 ships 3 tags from a const map, no registry.

**Subsystem docs the build composes against**

- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  `Quantity<T>` + `QuantityMarshaller` integration shape +
  existing unit catalog. Per the earlier survey: all biome units
  (K, Pa, %, m/s², m³, m, kg/m³) are present in the v1 unit
  union; kg/m³ has Material's density tag table. Tag tables for
  K / Pa / % / m/s² are added by this build per the constraints
  list (planner picks exact integration shape vs. existing
  catalog).
- [docs/subsystems/spatial.md](../subsystems/spatial.md) —
  Location hierarchy (`Location` ← `CartesianLocation` /
  `SphericalLocation`); `CartesianZone.cellSize` informational
  status that graduates here.
- [docs/subsystems/race.md](../subsystems/race.md) — Material's
  `getMaterial(detailKey?)` prefix-walk pattern that
  `AtmosphericMixin` mirrors exactly (race.md:129–145).
- [docs/subsystems/light.md](../subsystems/light.md) — `LightApi`
  is the prior art for the channel-Api shape; biome doesn't
  modify light or its conduit reads.
- [docs/subsystems/boundary.md](../subsystems/boundary.md) —
  Conduit shape (unmodified by this build).
- [docs/subsystems/zone.md](../subsystems/zone.md) —
  `Zone.lookupField` machinery for step 5 of the chain (already
  shipped; biome consumes).
- [docs/subsystems/shell-environment.md](../subsystems/shell-environment.md)
  — referenced *only* to confirm scope: settings keyspace is for
  player preferences (`shell.parser`, `movement.defaultMode`,
  etc.). Biome's universe-default atmospheric values are NOT
  player settings; they're engine constants in `BiomeApi`.
- [docs/ref-shapes.md](../ref-shapes.md) — Pattern A for the
  biome ref on AtmosphericMixin.
- [docs/architecture.md](../architecture.md) — layout for the
  new `lib/biome/` subsystem folder.
- [docs/antipatterns.md](../antipatterns.md) — naming-by-field-
  storage rule (Pattern A) and the "go through the Api" rules.

**Adjacent slates flagged but not consumed**

- [docs/slates/sound-slate.md](../slates/sound-slate.md) — Conduit
  channel-keyed refactor + Material acoustic-impedance + biome's
  ambient-sound MML field consumer all land there.
- [docs/slates/locomotion-slate.md](../slates/locomotion-slate.md)
  — atmosphere → default-mode coupling is a one-line follow-up
  there when locomotion goes formal.
