# Biome substrate

Saxonberg's first "physics of places" subsystem. Biomes carry
atmospheric defaults (temperature / pressure / humidity / gravity /
atmosphere) plus ambient sensory texture (sound + smell MML);
Locations and Vessels compose `AtmosphericMixin` to override those
defaults at their own scope or per-Detail; `BiomeApi.resolveXFor`
walks innermost-container-outward through containment ancestors,
then the spatial zone, then the root universe biome, returning the
first override at any layer.

The whole substrate produces honest engineering numbers — Kelvin,
Pascals, m/s², m³ — so pedagogy can compute `n = PV/RT` against the
substrate's own state without needing a parallel "real units" track.

## The biome template tree

`Biome extends Zone` — parallel to `Clade extends Zone` in the
species substrate. Both are taxonomic Zone subclasses that play
folder + leaf at every path level; the folder/leaf invariant exists
for `SpatialZone` (no nested coordinate systems) and does NOT apply
to taxonomic Zones. `ZoneApi.isFolderClass(Biome)` returns true;
`isSpatialZoneClass(Biome)` returns false.

There is no `Biorealm` class — the root at `/lib/biome/` is itself
a `Biome` template (the **universe biome**) carrying all five
atmospheric defaults. Sub-biomes at every depth may carry their own
defaults; un-set fields inherit through the chain-walk's
templatePath ancestry to the root.

```
/lib/biome/                       # universe biome — 295 K, 101325 Pa,
                                  # 50% humidity, 9.81 m/s², 'air'
  outdoor/                        # outdoor tier (SkyExposedBiome)
    temperate/                    # 42°N seasonal mean: 285 K
      quad/                       # leaf — only ambient texture
      forest-deciduous/           # leaf
      … 13 more
  underground/                    # not sky-exposed; 285 K, 70% RH
    tunnel, sewer, cave           # 3 leaves
  indoor/                         # climate-controlled: 294 K, 45% RH
    academic/                     # paper-and-chalk ambient
      lecture-hall, classroom,    # 7 leaves
      …
    residential/                  # 296 K
      dorm-room, common-room,     # 3 leaves
      townhouse
    social/cafeteria              # 1 leaf
    civic/                        # 4 leaves
      shop, tavern, inn, workshop
    special/                      # 6 leaves
      observatory-dome,           # SkyExposedBiome (aperture)
      gymnasium, theater,
      art-studio, chapel, archive
    cafeteria/atrium              # scenario C — SkyExposed child
                                  # biome of a plain-Biome parent
```

The tier biomes (`outdoor/temperate`, `indoor/academic`, etc.)
carry shared defaults; leaves declare what differs. Inheritance is
entirely the chain-walk's job — no YAML `extends:` ceremony, no
`_defaults` siblings.

39 leaves total. Sky-exposed leaves use `class:
/lib/biome/SkyExposedBiome`; everything else uses plain `class:
/lib/biome/Biome`.

## `Biome` class

Seven persistent fields:

- `_defaultTemperature: Quantity<'K'> | null`
- `_defaultPressure: Quantity<'Pa'> | null`
- `_defaultHumidity: Quantity<'%'> | null`
- `_defaultGravity: Quantity<'m/s²'> | null`
- `_defaultAtmosphere: string | null`
- `_ambientSoundMml: string | null`
- `_ambientSmellMml: string | null`

`null` means "fall through to the next ancestor in the chain walk"
— so a leaf biome carrying only `_ambientSoundMml` inherits all four
Quantity defaults from its parent.

`Biome` does NOT compose `SingletonMixin` in v1 — leaves room for
future procedural / time-of-day variance per clone.
`BiomeApi.findByPath` works either way (delegates to
`StuffApi.findByTemplatePath`).

The four Quantity-typed fields round-trip through
`QuantityMarshaller`s; setters are strict-on-unit and throw
TypeError on mismatch (per CLAUDE.md "Per-field invariants on
setters").

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
   - **(d)** Biome default with template-ancestry walk on this
     ancestor's biome (if it has one): walks the biome's
     `getTemplatePath()` ancestors down to `/lib/biome`, returning
     the first non-null default.

2. **Spatial zone** — outermost Location's
   `getZone()?.lookupField<T>('atmosphere.<field>')`. Zones don't
   compose `AtmosphericMixin`; they participate via
   `Zone.lookupField`'s generic field-inheritance walk.

3. **Universe terminal** — `BiomeApi.getRootBiome()` returns the
   cached `/lib/biome` template. Each `_defaultX` field on it is
   mandatory; the resolver throws a boot-invariant error if a field
   is unset at the root.

First override at any layer terminates the walk. Pure-container
ancestors (Box, Backpack, …) are skipped entirely.

### Worked traces

```
# Empty room with no biome — universe default.
resolveTemperatureFor(room) → 295 K   (source: 'universe')

# Room with biome /lib/biome/outdoor/temperate/quad (which inherits
# temperature from /lib/biome/outdoor/temperate at 285 K).
resolveTemperatureFor(room) → 285 K   (source: 'biome-ancestor',
                                       sourcePath: '/lib/biome/outdoor/temperate')

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

No `AtmosphereDef` bundle, no `registerAtmosphere` extension point.
Per requirements decision 4.

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

The atrium-in-cafeteria scenario authors a child biome
`/lib/biome/indoor/cafeteria/atrium` extending `SkyExposedBiome`
while sibling cafeteria rooms point at the plain-`Biome` parent.
The biome chain inherits shared defaults; the child overrides only
the trait.

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

### `LocationApi`

Geometry-agnostic wrappers for callers that don't care which kind
of Location they hold:

```ts
LocationApi.getVolume(room): Quantity<'m³'> | null
LocationApi.getCeilingHeight(room): Quantity<'m'> | null
```

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
  chain step 5; the folder/leaf invariant carve-out for taxonomic
  Zones (`Biome` extends `Zone` parallel to `Clade`).
- [docs/subsystems/race.md](./race.md) — Material's `getMaterial`
  prefix-walk shape that `AtmosphericMixin`'s detail walk mirrors
  exactly; the cross-link for a future per-species breathing gate.
- [docs/subsystems/light.md](./light.md) — `LightApi`'s chain-walk
  shape; the receiving-surface area divisor is now derived from
  `cellSize²`.
- [docs/ref-shapes.md](../ref-shapes.md) — Pattern A for the
  `_biomePath` ref.
- [docs/subsystems/shell-environment.md](./shell-environment.md) —
  the universe defaults are NOT settings; the chain's terminal
  step reads from the root biome at `/lib/biome`.
