# Biome substrate

Saxonberg's first "physics of places" subsystem. Biomes are leaf
Idea templates carrying atmospheric defaults (temperature / pressure
/ humidity / gravity / atmosphere) plus ambient sensory texture
(sound + smell MML); Locations and Vessels compose `AtmosphericMixin`
to override those defaults at their own scope or per-Detail;
`BiomeApi.resolveXFor` walks innermost-container-outward through
containment ancestors, then the spatial zone, then the root universe
biome — returning the first override at any layer.

The whole substrate produces honest engineering numbers — Kelvin,
Pascals, m/s², m³ — so pedagogy can compute `n = PV/RT` against the
substrate's own state without needing a parallel "real units" track.

## Two trees, separated by job

The biome substrate uses **two independent structures** that meet at
the `Biome` template:

| Tree | Role | Where it lives | Mechanism |
|---|---|---|---|
| **Admin tree** | Ownership / write-access scoping ("biome team") | `FolderZone` templates at `/lib/biome/`, `/lib/biome/outdoor/`, `/lib/biome/indoor/`, etc. | templatePath organization |
| **Inheritance tree** | Atmospheric defaults inherited from parent biomes | `Biome` leaf templates with `_extendsBiomePath` refs | explicit Pattern-A ref (independent of path) |

Biomes are **leaves** in the admin tree — they're not folders; they
don't extend `Zone`. They're reference data, like `Material` and
`Species`. The inheritance tree they form is independent of where
they happen to live in the templatePath: a biome at one path can
extend a parent at any other path via its `_extendsBiomePath` ref.

Concretely, the shipped roster is deliberately slim — a handful of
demonstrative templates, parallel to how `Material` and `Species`
ship a representative sample rather than a content roster. Content
teams flesh out their own tree from here.

```
admin tree (FolderZones — ownership/write-access):

/lib/biome/                        FolderZone     ← biome team root
  universe.yaml                    Biome leaf     ← inheritance root
  outdoor/                         FolderZone     ← outdoor sub-team
    baseline.yaml                  SkyExposedBiome
    meadow.yaml                    SkyExposedBiome
  indoor/                          FolderZone     ← indoor sub-team
    baseline.yaml                  Biome
    cafeteria.yaml                 Biome
    cafeteria-atrium.yaml          SkyExposedBiome ← scenario C
```

```
inheritance tree (Biome._extendsBiomePath — independent of paths):

   universe
   ├── outdoor/baseline (SkyExposedBiome)
   │   └── outdoor/meadow            ← 3-deep chain
   └── indoor/baseline
       └── indoor/cafeteria
           └── indoor/cafeteria-atrium ← scenario C: sibling-with-
                                         extends-ref (path-decoupled
                                         inheritance + SkyExposed
                                         override on the child)
```

Each shipped template earns its place demonstrating a substrate
property: universe (chain terminal), tier baselines (extends-chain
+ SkyExposed/plain split), the meadow leaf (3-deep chain), and the
cafeteria + cafeteria-atrium pair (scenario C — path-decoupled
inheritance).

**Why two trees:** the admin tree answers "who owns this template,
who can write to it." The inheritance tree answers "what defaults
does this biome inherit." Those are different concerns — coupling
them via path was the original design's mistake. A future "alien
planet" biome can sit at any admin path and explicitly extend
`/lib/biome/universe` (or any other biome); the path doesn't
constrain its inheritance.

## Organizing the inheritance tree — the spine

The `_extendsBiomePath` tree is the *mechanism*; this is the *principle* for
**where a biome sits** in it. **Order by atmospheric dominance** — each level
down is the next-biggest determiner of what a biome exists to carry (temp /
humidity / pressure / light / medium). Coarse → fine:

1. **medium** — air / water / vacuum (biggest lever: breathability, pressure,
   density)
2. **sky exposure** — outdoor / indoor / subterranean (weather, light, thermal
   stability)
3. **climate** — temperate / arid / tropical / polar (the temp + humidity
   envelope)
4. **surface / cover** — forested / grassland / sandy / **paved** / **urban** …
   (local humidity, thermal mass, the ground)

Placement rule: **coarser = bigger lever.** A node's home is found by asking
"how much does this move the actual numbers vs. its neighbors." Depth =
specificity, and that's fine — a deep biome like `outdoor/temperate/urban` is
**reusable** (any temperate city street).

**Cross-cutting attributes are cousins, not parent/child.** "urban" (paved +
built density + heat-island) and "paved" (bare hard surface — thermal mass,
runoff) both sit at the surface level on *different* branches: a rural highway
is paved-not-urban, a city park urban-not-paved.

**Reusable atmospheric *type* vs. place *identity* — the load-bearing line.** A
biome is a reusable environmental type; it is **never a specific place.**
"Terminus deferred-city street" is *not* a biome — `outdoor/temperate/urban`
is, and **Terminus is the `SpatialZone`** that uses it and adds the
place-specific overrides + mood. Single-inheritance means a leaf carries the
**dominant** atmospheric stack; leftover bits that are more *identity* than
*atmosphere* live on the **zone** as overrides (the spatial zone sits in the
resolve chain above the biome — see *The override chain*). Two
genuinely-atmospheric axes with no dominant (coastal-urban) → a combined leaf,
or let the zone carry one; rare, per-case.

## `Biome` class

A leaf `extends Idea`. Nine persistent fields:

- `name: string` (e.g., `'universe'`, `'temperate-baseline'`,
  `'quad'`)
- `_extendsBiomePath: string | null` — Pattern A ref to the parent
  biome; `null` on the root. `getExtendsBiome()` /
  `setExtendsBiome(value)` resolve via
  `StuffApi.findByTemplatePath` (HMR-safe); `getExtendsBiomePath()`
  exposes the raw string for the chain walker.
- `_defaultTemperature: Quantity<'K'> | null`
- `_defaultPressure: Quantity<'Pa'> | null`
- `_defaultHumidity: Quantity<'%'> | null`
- `_defaultGravity: Quantity<'m/s²'> | null`
- `_defaultAtmosphere: string | null`
- `_ambientSoundMml: string | null`
- `_ambientSmellMml: string | null`

`null` on a Quantity / string default means "fall through to my
extends parent." A leaf biome carrying only `_ambientSoundMml`
inherits all four Quantity defaults from the chain.

`Biome` does NOT compose `SingletonMixin` in v1 — leaves room for
future procedural / time-of-day variance per clone.

The four Quantity-typed fields round-trip through
`QuantityMarshaller`s; setters are strict-on-unit and throw
TypeError on mismatch.

## `AtmosphericMixin`

Composed onto **both** `Location` and `Vessel` base classes. Pure
containers (Box, Backpack, treasure chest) do NOT compose it and
are atmospherically transparent (skipped by the chain walk).

Eleven persistent fields per host (sparse storage):

```
_biomePath                                   # Pattern A biome ref
_temperature, _pressure, _humidity,          # five room/vessel-scope
_gravity, _atmosphere                        # bulk overrides
_detailTemperatures, _detailPressures,       # five per-detail maps
_detailHumidities, _detailGravities,         # (Record<string, V>)
_detailAtmospheres
```

`null` slots persist as absent; empty maps mean "no per-detail
overrides." A Vessel composing the mixin but setting nothing costs
five `null` fields + five empty objects and otherwise reads
identically to a non-composing pure container.

### Method surface

```ts
interface Atmospheric {
  getBiome(): Biome | null;
  setBiome(value: Biome | null): void;

  getTemperature(detailKey?: string): Promise<Quantity<'K'>>;
  setTemperature(value: Quantity<'K'> | null, detailKey?: string): void;
  // pressure / humidity / gravity follow the same shape.
  getAtmosphere(detailKey?: string): Promise<string>;
  setAtmosphere(value: string | null, detailKey?: string): void;
}
```

Getters are async because chain step 5 (spatial zone via
`Zone.lookupField`) is async. The getters are thin delegators to
`BiomeApi.resolve*For(this, detailKey)`.

Setters are sync. `set*(null)` clears the bulk override or deletes
the detail entry (per-detail key form). Each Quantity setter
asserts the runtime unit matches and throws TypeError on mismatch.

## The override chain

For any `(scope, detailKey?)` pair where `scope` is the innermost
`Stuff & Container`:

1. Walk innermost-container-outward through containment ancestors.
   For each ancestor that composes `AtmosphericMixin`:
   - **(a)** Exact detail override at `detailKey` on this ancestor
     — innermost scope only.
   - **(b)** Prefix-inherited detail override on this ancestor
     (longest-prefix-first walk — `hearth.embers` checks
     `hearth.embers` then `hearth`) — innermost scope only.
   - **(c)** Room-scope (bulk) override on this ancestor.
   - **(d)** Biome default with `_extendsBiomePath` walk on this
     ancestor's biome (if it has one): walks the explicit ref
     chain, consulting each biome for the field; first non-null
     value wins. Cycle-guarded (visited set + depth cap of 32).

2. **Spatial zone** — outermost Location's
   `getZone()?.lookupField<T>('atmosphere.<field>')`. Zones don't
   compose `AtmosphericMixin`; they participate via
   `Zone.lookupField`'s generic field-inheritance walk.

3. **Universe terminal** — `BiomeApi.getRootBiome()` returns the
   cached `/lib/biome/universe` template. Each `_defaultX` field
   on it is mandatory; the resolver throws a boot-invariant error
   if a field is unset at the root.

First override at any layer terminates the walk. Pure-container
ancestors (Box, Backpack, …) are skipped entirely.

### Worked traces

```
# Empty room with no biome — universe default.
resolveTemperatureFor(room) → 295 K   (source: 'universe')

# Room with biome /lib/biome/outdoor/temperate/quad (which extends
# temperate-baseline at 285 K).
resolveTemperatureFor(room) → 285 K   (source: 'biome-ancestor',
                                       sourcePath: '/lib/biome/outdoor/temperate/baseline')

# Room with biome AND room.setTemperature(Q(310, 'K')).
resolveTemperatureFor(room) → 310 K   (source: 'room')

# Same room + room.setTemperature(Q(800, 'K'), 'hearth').
resolveTemperatureFor(room, 'hearth') → 800 K        (source: 'detail')
resolveTemperatureFor(room, 'hearth.embers') → 800 K (source: 'detail-prefix')
resolveTemperatureFor(room, 'elsewhere') → 310 K     (source: 'room')

# Vessel inside the room with vessel.setAtmosphere('vacuum').
resolveAtmosphereFor(vessel) → 'vacuum'              (source: 'room')
resolveTemperatureFor(vessel) → 310 K                (source: 'room' on the OUTER room)
```

### Vessel cases (sparse storage falls out)

- **Porous** — vessel composes the mixin but sets no overrides.
  Every field is `null`; the chain walks straight through to the
  outer Location.
- **Sealed** — vessel overrides one or more fields. Those fields
  terminate at the vessel; un-overridden fields walk outward.
- **Partial sealing** — a bell jar that overrides atmosphere only.
  Atmosphere reads stop at the jar; temperature reads walk to the
  enclosing Location.
- **Nested** — Vessel B inside Vessel A. B's `null` fields walk to
  A; A's `null` fields walk to the outer Location.
- **Transparent** — a Box (pure container) inside a Location. The
  walk skips Box entirely; the Location's overrides win.

### Detail-key locality

Detail keys apply only at the innermost scope. A vessel-scope query
with `detailKey: 'hearth'` does NOT carry the detail key onto outer
ancestors — the vessel's own `_detailTemperatures` map is consulted
first, then the walk proceeds with the detail key dropped. Querying
the outer Location directly with `detailKey: 'hearth'` does see the
Location's hearth override.

## Atmosphere medium tags

v1 ships **three** tags from a private const map in `BiomeApi`:

| tag      | density at standard conditions |
|----------|--------------------------------|
| `air`    | 1.225 kg/m³                    |
| `water`  | 1000  kg/m³                    |
| `vacuum` | 0     kg/m³                    |

`BiomeApi.densityOf(tag)` reads the map; throws on unknown tag.
`AtmosphericMixin.setAtmosphere(value)` accepts any string silently
— validation is the read-side concern (the density lookup or the
verb consumer's typed surface). If content authoring grows past the
three tags, the map grows by one line. If author-extensible
atmospheres become a real need, promote to an `Atmosphere extends
Idea` templated singleton parallel to `Material` at that point —
strictly additive.

No `AtmosphereDef` bundle, no `registerAtmosphere` extension
point — premature abstraction for the three v1 consumers.

## `SkyExposedMixin`

Capability seam for biomes whose Locations look out on the open
sky. `SkyExposedBiome extends SkyExposedMixin(Biome)` is the
concrete subclass outdoor biome leaves extend (parallel to
`RadioactiveMaterial`).

`isSkyExposed(): boolean` — the predicate is the entire substrate
in v1. Future `getCelestialBodies()` / `getWeather()` methods land
with their consuming subsystems.

`BiomeApi.isSkyExposed(scope)` walks the containment chain outward
looking for the nearest atmospheric ancestor with a biome ref, then
narrows the biome via `MixinApi.isSkyExposed(biome)`. Returns
`false` when no biome resolves anywhere in the chain.

The atrium-in-cafeteria scenario authors a sibling biome
`/lib/biome/indoor/social/cafeteria-atrium` that extends
`SkyExposedBiome` and `_extendsBiomePath`-refs the cafeteria —
inheriting all of the cafeteria's profile while adding the
sky-exposed trait. The biome chain inherits shared defaults; the
sibling overrides only the trait.

## `BiomeApi`

Static surface:

```ts
findByPath(path: string): Biome | null
densityOf(tag: string): Quantity<'kg/m³'>        // throws on unknown tag
getRootBiome(): Biome                             // cached; HMR invalidates
invalidateRootBiomeCache(): void

resolveTemperatureFor(scope, detailKey?): Promise<Quantity<'K'>>
resolvePressureFor(scope, detailKey?): Promise<Quantity<'Pa'>>
resolveHumidityFor(scope, detailKey?): Promise<Quantity<'%'>>
resolveGravityFor(scope, detailKey?): Promise<Quantity<'m/s²'>>
resolveAtmosphereFor(scope, detailKey?): Promise<string>

traceResolveTemperatureFor(scope, detailKey?): Promise<AtmosphericTrace<…>>
// + four sibling trace variants, and traceResolveAll which returns
// a typed bag of all five for the `analyze atmosphere` verb.

isSkyExposed(scope): boolean
```

`AtmosphericTrace<V>` carries `{ value, source, sourcePath,
ancestorChain }` — provenance for verb rendering and tests.
`source` is one of `'detail' | 'detail-prefix' | 'room' | 'biome' |
'biome-ancestor' | 'zone' | 'universe'`.

No `findByPathOrThrow` / `allBiomes` convenience helpers in v1 —
add when a real consumer needs them.

## Derived geometry on `Location`

`Location` declares two abstract methods that concrete subclasses
override per their topology:

- `getVolume(): Quantity<'m³'> | null`
- `getCeilingHeight(): Quantity<'m'> | null`

### `CartesianLocation` — cube cell

`CartesianZone.cellSize` graduates from informational to
**load-bearing** with a default of **3.0 m** linear (a typical
room). Each cell is a cube:

| derived            | formula           | default (cellSize = 3) |
|--------------------|-------------------|------------------------|
| `getVolume()`      | `cellSize³`       | 27 m³                  |
| `getCeilingHeight()` | `cellSize`      | 3 m                    |
| `getSizeScale()`   | `cellSize²`       | 9 m² (light scale)     |

The light substrate's receiving-surface area divisor is now
**derived** from the linear cellSize by squaring it — rather than
authored separately as m². A 5 m × 5 m room is `cellSize: 5`; the
light walk sees a 25 m² scale. Tests pinning specific LightBand
values may need to set `cellSize: 1` for the prior 1 m² calibration.

### `SphericalLocation` — sphere + inscribed cube

A sphere of radius `r` reserves its full volume but presents an
inscribed cube as the usable floor-to-ceiling interior:

| derived              | formula              | radius 2 m       |
|----------------------|----------------------|------------------|
| `getVolume()`        | `(4/3)·π·r³`         | ≈ 33.51 m³       |
| `getCeilingHeight()` | `2r/√3` (cube side)  | ≈ 2.309 m        |

The asymmetry is intentional: volume answers "how much gas does
the room hold?" — the sphere; ceiling answers "how much vertical
headroom is there?" — the cube inscribed in the sphere.

### Reading the derived geometry

Both methods live on `AtmosphericMixin` (composed onto Location
AND Vessel), so any atmospheric scope exposes them directly — no
Api wrapper:

```ts
if (MixinApi.isAtmospheric(scope)) {
  const volume  = scope.getVolume();        // Quantity<'m³'> | null
  const ceiling = scope.getCeilingHeight(); // Quantity<'m'> | null
}
```

The mixin returns `null` from its default implementations; concrete
Location subclasses override per their topology. A future Vessel
subclass with a real interior volume (submarine, pressurized
module) overrides the same way.

## Instruments + verbs

Six handheld instruments ship as `Thing` templates under
`/obj/instrument/`:

| instrument     | verb                       | reads                     |
|----------------|----------------------------|---------------------------|
| `Thermometer`  | `measure temperature`      | `resolveTemperatureFor`    |
| `Barometer`    | `measure pressure`         | `resolvePressureFor`       |
| `Hygrometer`   | `measure humidity`         | `resolveHumidityFor`       |
| `GravityMeter` | `measure gravity`          | `resolveGravityFor`        |
| `GasAnalyzer`  | `measure atmosphere`       | `resolveAtmosphereFor`     |
| `Altimeter`    | `measure altitude`         | barometric delta vs root   |

Each instrument contributes the `measure.yaml` view to its
inventory bucket — carrying the instrument grants the relevant
sub-verb. Controllers refuse with a `controller-rejected` note
when the matching instrument isn't in the actor's contents.

Instruments query at `actor.getContainer()` — a character inside a
sealed vessel reads the vessel's atmosphere; a character in a
porous vessel reads through to the outer Location via the chain.

`Altimeter` derives `(P_sea − P_local) / (ρ · g)` from
`BiomeApi.getRootBiome().getDefaultPressure()` as the sea-level
reference and refuses in vacuum (ρ = 0 → no medium to define
altitude).

`analyze atmosphere [detail]` runs without an instrument. It dumps
the full resolved state — biome path, spatial zone, per-field value
with provenance, derived volume / ceiling / density, per-detail
overrides — using the `traceResolve*` family. Cheap; doubles as a
developer debug tool.

Rendering convention: canonical units rendered via `q.formatMml()`
plus friendly tag in parentheses — `<quantity unit="K"
value="295">295 K</quantity> (warm)`. The pedagogical-seam toggle
for "friendly-only" vs "canonical-only" rendering is deferred to a
cross-cutting setting alongside sound's.

## Cross-references

- [docs/subsystems/quantities.md](./quantities.md) — `Quantity<U>`
  + `QuantityMarshaller`; biome adds tag tables for K (thermal
  scale), Pa, %, m/s² and marshallers for Pa / % / m/s² / m / m³.
- [docs/subsystems/spatial.md](./spatial.md) — Location hierarchy +
  the `CartesianZone.cellSize` graduation.
- [docs/subsystems/zone.md](./zone.md) — `Zone.lookupField` for
  chain step 5; biome admin folders use `FolderZone`.
- [docs/subsystems/race.md](./race.md) — Material's `getMaterial`
  prefix-walk shape that `AtmosphericMixin`'s detail walk mirrors
  exactly; Material/Species are the precedents for the leaf-Idea
  + explicit-ref-inheritance pattern Biome now follows; the
  cross-link for a future per-species breathing gate.
- [docs/subsystems/light.md](./light.md) — `LightApi`'s chain-walk
  shape; the receiving-surface area divisor is now derived from
  `cellSize²`.
- [docs/ref-shapes.md](../ref-shapes.md) — Pattern A for the
  `_biomePath` and `_extendsBiomePath` refs.
- [docs/subsystems/shell-environment.md](./shell-environment.md) —
  the universe defaults are NOT settings; the chain's terminal
  step reads from the root biome at `/lib/biome/universe`.

## History

Three substantive design shifts during the biome substrate build
(MR `panterasbox/saxonberg!26`):

1. **`Biome extends Idea`, not `Zone`.** The initial requirements
   doc had `Biome extends Zone` (parallel to `Clade extends Zone`)
   with templatePath-walking inheritance. MR review surfaced that
   this stretched Zone's meaning beyond its original "admin /
   ownership scope" intent. The refactor moved Biome to a leaf
   Idea with explicit `_extendsBiomePath` parent refs, and
   introduced `FolderZone` templates under `/lib/biome/` for the
   biome team's admin tree. Inheritance is now decoupled from
   templatePath organization. (Commits `2cc46c2` → `44ada01`.)
2. **`getVolume` / `getCeilingHeight` live on `AtmosphericMixin`,
   not `Location`.** Initially declared on Location with an
   `api/location.ts` wrapper; MR review surfaced that vessels can
   have meaningful interior volume too, and the wrapper Api was a
   misnomer (its parameters took `Stuff & Container`, not
   Location). The refactor moved the methods to AtmosphericMixin
   so both Location and Vessel hosts expose them directly; the
   wrapper Api was deleted. (Commit `a7166f6`.)
3. **Slim demonstrative roster, not 39 content commitments.** The
   plan called for 39 biome leaves across outdoor/temperate,
   underground, and five indoor sub-tiers. MR review pushed back
   on baking that much content into the substrate seed roster.
   The slim-down dropped 35 leaves + their tier folders, leaving
   8 demonstrative templates (universe + outdoor/indoor tier
   baselines + a couple of leaves + the cafeteria-atrium scenario-
   C showcase) — parallel to Material's 10-leaf and Species's
   8-template demonstrative rosters. (Commit `3650011`.)

The `_extendsBiomePath` ref-walk + `FolderZone` separation is the
shape that survives. Future biome content authoring extends from
`/lib/biome/universe` (or any other biome) via the explicit ref;
the path tree organizes ownership, not inheritance.
