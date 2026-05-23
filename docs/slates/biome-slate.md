# Biome slate (working doc)

Working slate for the biome substrate — the template tree that
classifies *what kind of place* a Location is, the capability mixins
that compose onto Biomes for things like sky-exposure, the atmospheric
Quantity layer on Locations (temperature, pressure, humidity, gravity,
atmosphere medium), the override chain that resolves field values
from detail → room → biome → zone → universe, and the geometry
derivations that promote `cellSize` and `radius` to load-bearing.

This is the first pass at the "physics of places" layer. It
deliberately stays *upstream* of gameplay role (a Lab vs a Library
is content, not classification) and *downstream* of sub-room
geometry (no coordinates inside a room — Details are the only
authorial seam for per-feature variation).

See also:

- [docs/subsystems/spatial.md](../subsystems/spatial.md) — the
  Location / Zone / coordinate-mixin substrate this layer composes
  onto. `CartesianZone.cellSize` graduates from informational to
  load-bearing here.
- [docs/subsystems/race.md](../subsystems/race.md) — Clade / Species
  is the structural prior art for Biorealm / Biome (taxonomic folder
  Zone + template).
- [docs/subsystems/quantities.md](../subsystems/quantities.md) — the
  `Quantity<U>` substrate consumed by every atmospheric field below.
  Same pattern as Light intensity / Material density / TangibleMixin
  mass.
- [docs/subsystems/light.md](../subsystems/light.md) — light's
  per-detail walk via `lightAt` is the second prior art (alongside
  Material) for the detail-override chain.
- [docs/subsystems/race.md § Material](../subsystems/race.md) —
  Material's `bulk default + per-Detail override with prefix
  inheritance` is the canonical shape for the detail-override layer
  in this slate.
- [docs/ref-shapes.md](../ref-shapes.md) — Pattern A
  (string-stored singleton ref) is the room→biome reference shape.
- [docs/slates/sound-slate.md](./sound-slate.md) — ambient sound
  consumes the biome's ambient-sound Mml string; biome carries the
  source, sound-slate's machinery propagates it.

---

## Principle

Two claims this slate makes:

1. **Variety of places comes from capability mixins + a template
   tree, not a Location class hierarchy.** Same shape Race chose
   for Species, Material chose for substances, Boundary chose for
   doors. A new "kind of place" is a new Biome template (often a
   leaf in the Biorealm folder), optionally composing one or two
   capability mixins; no new ts class for `ForestLocation extends
   OutdoorLocation extends Location`.
2. **A Location's environmental physics resolves through a chain.**
   A field value (temperature, humidity, ...) comes from the most
   specific override available: a Detail-keyed override on the room
   wins over the room's default, which wins over the biome's
   default, which wins over the spatial zone's default, which falls
   back to a universe constant. Authors override at whatever layer
   makes sense for their content.

The hard constraint pulling against expansion: **no sub-room
geometry.** Values apply to the room-as-a-unit (or to named
Details). No coordinates within a room. No volumetric distribution.
A "hot spot near the hearth" exists as a Detail with a temperature
override, not as a position inside a room's space.

---

## Layered design

| Layer | Concern | Lives in |
|---|---|---|
| 1. Biome substrate | The `Biome` template class + `Biorealm` folder Zone | `lib/biome/Biome.ts`, `lib/biome/Biorealm.ts` |
| 2. Capability mixins on Biome | `SkyExposedMixin`, `SkyExposedBiome`, and the seam for future biome-capability mixins | `lib/biome/SkyExposed.ts`, `lib/biome/SkyExposedBiome.ts` |
| 3. Atmospheric fields on Location | `AtmosphericMixin` carrying sparse overrides + per-detail map | `lib/biome/Atmospheric.ts` |
| 4. Atmosphere medium registry | The tag table for `air` / `water` / `vacuum` / ... with carried physical properties | `lib/biome/Atmosphere.ts` |
| 5. Derived geometry | Virtual `getVolume()` / `getCeilingHeight()` on `Location`; concrete on `CartesianLocation` / `SphericalLocation`. `cellSize` graduation. | `lib/spatial/Location.ts` (extends), `lib/spatial/CartesianLocation.ts`, `lib/spatial/SphericalLocation.ts` |
| 6. `BiomeApi` + `LocationApi` helpers | Resolution chain walk; sky-exposure shortcut; geometry-agnostic accessor | `api/biome.ts`, `api/location.ts` |
| 7. Pedagogical seam | Real-units rendering; instruments (`Thermometer`, `Barometer`, `Hygrometer`); `analyze atmosphere` verb | Layer 7 + first instruments |

Layers 1, 2, 3, 4, 5 are the substrate; 6 is the API surface; 7 is
the educational payoff.

---

## Layer 1 — Biome substrate

### `Biome` — the template class

```ts
class Biome extends Idea {
  // Atmospheric defaults — Quantity-typed, all optional.
  // null means "fall through to the spatial zone or universe default."
  protected _defaultTemperature: Quantity<'K'> | null = null;
  protected _defaultPressure: Quantity<'Pa'> | null = null;
  protected _defaultHumidity: Quantity<'%'> | null = null;
  protected _defaultGravity: Quantity<'m/s²'> | null = null;

  // Medium tag — null means "fall through."
  protected _defaultAtmosphere: string | null = null;

  // Sensory texture as Mml strings — biome-shaped, no Quantity.
  protected _ambientSoundMml: string | null = null;
  protected _ambientSmellMml: string | null = null;

  // Persistent fields list — auto-handled by Hydrator.
  static persistentFields = [
    '_defaultTemperature', '_defaultPressure', '_defaultHumidity',
    '_defaultGravity', '_defaultAtmosphere',
    '_ambientSoundMml', '_ambientSmellMml',
  ];

  // Getter/setter pairs follow Pattern A conventions for the medium
  // string and ordinary getter/setter for the Quantity fields.
  // Each Quantity field gets a marshaller-bearing initProp wiring
  // (see quantities.md § QuantityMarshaller).
}
```

A concrete Biome is a clone of a `Biome` template at a templatePath
like `/idea/biome/outdoor/forest/temperate`. Authors can subdivide
the tree freely; the engine doesn't care about the internal shape.

Composition: `Biome` doesn't compose `Singleton` on its own; biomes
are singletons by *path convention* but a content author who wants
"every clone of this biome is the same one" can compose `Singleton`
on a specific Biome subclass. The default is non-singleton because
a few use cases (procedurally varied weather biomes) might want
multiple instances per template.

### `Biorealm` — the folder Zone

```ts
class Biorealm extends Zone {
  // Empty body. Exists to anchor the biome template tree at
  // /idea/biome/ — same shape as HomeZone for /home/.
}
```

Bare Zone subclass. Its only job is to satisfy the folder/leaf
invariant for the `/idea/biome/` subtree of the template tree.
`ZoneApi.isFolderClass(Biorealm)` returns true; `isSpatialZoneClass`
returns false (no Stuff gets `zone: biorealm` stamped — Biorealms
are template-tree folders, not spatial zones, parallel to Clade).

The `/idea/biome/` Biorealm template is seeded at boot from
`seeds/biome.yaml`, parallel to `seeds/home.yaml`. Sub-categories
(`/idea/biome/outdoor/`, `/idea/biome/indoor/`, ...) are authored
as further Biorealm templates; biome leaves are authored as
`Biome` templates.

### Reference shape from Location to Biome

Pattern A (string-stored singleton ref, per
[docs/ref-shapes.md](../ref-shapes.md)):

```ts
// On AtmosphericMixin (Layer 3):
protected _biomePath: string | null = null;
// persistentFields includes '_biomePath'

getBiome(): Biome | null;        // resolves via BiomeApi.findByPath
setBiome(value: Biome | null): void;
```

Biomes are singleton-by-template-path; the path is the stable
identifier across hot-reload churn. Pattern C is overkill — biomes
load eagerly with the world; no cross-scope zone-fault concern.

---

## Layer 2 — Capability mixins on Biome

### `SkyExposedMixin`

The first (and v1-only) capability mixin on Biome. Marks the
biome as open-to-sky, which gates celestial-body visibility,
weather application, and the ambient-illuminance source.

```ts
interface SkyExposed {
  // Whether this biome can see celestial bodies (sun, moon, stars).
  // Default true once composed; an explicit `false` override is
  // unusual (most authors who want enclosed biomes simply don't
  // compose the mixin).
  isSkyExposed(): boolean;

  // Future v1.5: getCelestialBodies(), getWeather(), etc.
  // v1 ships the predicate; the methods land alongside their
  // first consumer (light's celestial pass, the weather subsystem).
}

function SkyExposedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SkyExposedMixin extends Base implements SkyExposed {
    static _mixinName = 'SkyExposedMixin';
    isSkyExposed(): boolean { return true; }
  };
}
```

### `SkyExposedBiome`

The concrete class that composes the mixin onto Biome. Biome
templates that should expose the trait extend this class
(`/idea/biome/outdoor/forest/temperate`); biomes that don't
extend plain `Biome`. Direct parallel to `RadioactiveMaterial`
extending `Material` with `RadioactiveMixin` (see
[lib/material/RadioactiveMaterial.ts](../../packages/server/src/mud/lib/material/RadioactiveMaterial.ts)).

```ts
export class SkyExposedBiome extends SkyExposedMixin(Biome) {}
```

### `LocationApi.isSkyExposed` ergonomic helper

The trait lives on the biome, not the Location. To answer "is this
*room* sky-exposed?" callers go through the biome ref. To make this
ergonomic at consumer call sites:

```ts
// api/location.ts
class LocationApi {
  static isSkyExposed(room: Stuff & Container): boolean {
    const biome = (room as Atmospheric).getBiome?.();
    if (!biome) return false;
    return MixinApi.isSkyExposed(biome);
  }
}
```

Single-room exceptions (the glass atrium in an otherwise enclosed
building) are handled by authoring a child biome template that
flips the trait, not by overriding on the Location. This keeps the
biome's other defaults (temperature, sound texture) available to
override in the same place.

### Future biome-capability mixins (not v1)

Sketched here so the seam is understood; not implemented in this
wave:

- `WeatherableMixin` — biome generates weather (composes on
  `SkyExposedBiome` typically).
- `SpawnsMixin` — flora/fauna spawn tables. Pulls in Race / Species
  integration.
- `HazardousMixin` — declares hazard kinds the biome implies
  (toxic atmosphere falls out of `atmosphere` tag; this is for
  hazards orthogonal to medium).

---

## Layer 3 — Atmospheric fields on Location

`AtmosphericMixin` composes onto `Location` (so every concrete
location — `CartesianLocation`, `SphericalLocation`, future
variants — picks it up via the base composition).

### Storage shape

Sparse storage: a Location stores a field only when it overrides.
Reading falls through the chain when the slot is empty.

```ts
function AtmosphericMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AtmosphericMixin extends Base implements Atmospheric {
    static _mixinName = 'AtmosphericMixin';

    // The biome ref (Pattern A).
    protected _biomePath: string | null = null;

    // Room-scope overrides — null means "fall through to biome / zone."
    protected _temperature: Quantity<'K'> | null = null;
    protected _pressure: Quantity<'Pa'> | null = null;
    protected _humidity: Quantity<'%'> | null = null;
    protected _gravity: Quantity<'m/s²'> | null = null;
    protected _atmosphere: string | null = null;

    // Per-Detail overrides — Material's prefix-inheritance shape.
    // Map keys are dotted detail paths ('hearth', 'altar.flame').
    protected _detailTemperatures: Map<string, Quantity<'K'>> = new Map();
    protected _detailPressures: Map<string, Quantity<'Pa'>> = new Map();
    protected _detailHumidities: Map<string, Quantity<'%'>> = new Map();
    protected _detailGravities: Map<string, Quantity<'m/s²'>> = new Map();
    protected _detailAtmospheres: Map<string, string> = new Map();

    static persistentFields = [
      '_biomePath',
      '_temperature', '_pressure', '_humidity', '_gravity', '_atmosphere',
      '_detailTemperatures', '_detailPressures', '_detailHumidities',
      '_detailGravities', '_detailAtmospheres',
    ];

    // Public method surface — one pair per field.
    getTemperature(detailKey?: string): Quantity<'K'>;
    setTemperature(value: Quantity<'K'> | null, detailKey?: string): void;
    getPressure(detailKey?: string): Quantity<'Pa'>;
    setPressure(value: Quantity<'Pa'> | null, detailKey?: string): void;
    getHumidity(detailKey?: string): Quantity<'%'>;
    setHumidity(value: Quantity<'%'> | null, detailKey?: string): void;
    getGravity(detailKey?: string): Quantity<'m/s²'>;
    setGravity(value: Quantity<'m/s²'> | null, detailKey?: string): void;
    getAtmosphere(detailKey?: string): string;
    setAtmosphere(value: string | null, detailKey?: string): void;

    // Biome ref (Pattern A).
    getBiome(): Biome | null;
    setBiome(value: Biome | null): void;
  };
}
```

Each getter walks the override chain (Layer 6 below). Each setter
mutates only the directly-addressed slot:

- `setTemperature(q, undefined)` → sets `_temperature = q`
- `setTemperature(q, 'hearth')` → sets `_detailTemperatures.set('hearth', q)`
- Either with `null` → deletes the slot (falls through on next read)

Per-detail prefix inheritance: lookup of `'hearth.flame'` first
checks for an exact `'hearth.flame'` key, then `'hearth'`, then
falls through to the room/biome chain. Same shape as
`Tangible.getMaterial(detailKey)`.

### Field rationale

| Field | Unit | Why this field |
|---|---|---|
| `temperature` | K | Drives thermodynamics (PV=nRT against gas mix), comfort gates, melt/freeze, biology habitat. K not °C because Quantity's canonical unit for thermal is K. Friendly tags render as "warm" / "cold." |
| `pressure` | Pa | Gas law math, depth gradients in water-medium rooms (hydrostatic), altitude effects, sealed-chamber differential. |
| `humidity` | % | Biology (plant viability, comfort), simple corrosion/decay gating, fog gating once visibility lands. |
| `gravity` | m/s² | Reserves the dimension for non-Earth environments (observatory in orbit, future vessel-into-space). Default 9.81 universe-wide; non-default usage gates falling, jumping math, projectile arcs. |
| `atmosphere` | tag | The fluid that fills the room. Doubles as the locomotion-medium hint (Layer 4). |

### What's NOT a field

- **Illuminance** — already covered by the Light subsystem's
  per-detail `lightAt` walk.
- **Volume / ceiling height** — derived from geometry (Layer 5).
- **Sound / smell ambient texture** — these are biome-scope Mml
  strings, not Quantity fields. Stored on Biome only.
- **Radiation / magnetic field / EM / charge / pH** — deferred
  until a content case asks. The shape extends trivially when one
  arrives.

---

## Layer 4 — Atmosphere medium registry

`atmosphere` is a tag, not a Quantity. The registry maps a tag to
a small bundle of physical properties so consumers don't hard-code
per-tag behavior.

```ts
interface AtmosphereDef {
  tag: string;                    // 'air', 'water', 'vacuum', 'hydrogen', ...
  density: Quantity<'kg/m³'>;     // for hydrostatic pressure, buoyancy
  isBreathable: boolean;          // gate for default species; per-species
                                  //   future override via biology profile
  defaultLocomotionMode: string;  // 'walk' for air, 'swim' for water,
                                  //   'fly' for vacuum (with thrust), etc.
  mmlTag?: string;                // optional MML descriptor for rendering
  isFluid: boolean;               // swim-capable medium?
}
```

v1 roster (extensible; authors add via `BiomeApi.registerAtmosphere`):

| Tag | Density | Breathable | Default mode | Fluid |
|---|---|---|---|---|
| `air` | 1.225 kg/m³ | yes | `walk` | no |
| `water` | 1000 kg/m³ | no | `swim` | yes |
| `seawater` | 1025 kg/m³ | no | `swim` | yes |
| `vacuum` | 0 kg/m³ | no | `fly` | no |
| `hydrogen` | 0.0899 kg/m³ | no | `walk` | no |
| `chlorine` | 3.21 kg/m³ | no | `walk` | no |
| `smoke` | ~0.5 kg/m³ | no | `walk` | no |

Connections:

- **Locomotion** — `LocomotionApi.defaultModeFor(actor)` already
  reads bodyplan + setting. Adding atmosphere as a fourth tier
  ("atmosphere overrides bodyplan if the bodyplan doesn't natively
  handle this medium") is a follow-up nit; defers cleanly. v1
  doesn't change locomotion; the `defaultLocomotionMode` field is
  reserved for that follow-up.
- **Biology** — `isBreathable` gates a default suffocation check.
  Per-species exception (`Pisces` characters in `water`) is a
  future Race-side concern; v1 ships only the boolean field on
  the tag.
- **Quantity** — `density` is `Quantity<'kg/m³'>` (already exists
  on Material). Quantity arithmetic works across both registries
  without retrofit.

---

## Layer 5 — Derived geometry

Two methods, virtual on `Location`, concrete on the coordinate-
bearing subclasses. The constraint: **no stored fields for these.**
Geometry is the single source of truth.

```ts
// Location.ts (abstract base — returns null because pure-base
// Locations have no coordinates)
abstract getVolume(): Quantity<'m³'> | null;
abstract getCeilingHeight(): Quantity<'m'> | null;
```

```ts
// CartesianLocation.ts
override getVolume(): Quantity<'m³'> | null {
  const cell = this.getZone()?.getCellSize();   // meters
  if (cell == null) return null;
  return Quantity.of(cell ** 3, 'm³');
}
override getCeilingHeight(): Quantity<'m'> | null {
  const cell = this.getZone()?.getCellSize();
  return cell == null ? null : Quantity.of(cell, 'm');
}
```

```ts
// SphericalLocation.ts
override getVolume(): Quantity<'m³'> | null {
  const r = this.getRadius();
  return Quantity.of((4 / 3) * Math.PI * r ** 3, 'm³');
}
override getCeilingHeight(): Quantity<'m'> | null {
  const r = this.getRadius();
  return Quantity.of(2 * r, 'm');  // diameter; sphere-center floor convention
}
```

### `cellSize` graduation

`CartesianZone.cellSize` is documented today as informational and
unused by the engine. This slate promotes it to load-bearing:

- **Default value**: `3.0` meters (typical interior room).
- **Cube-cell assumption**: cells are cubes — `getVolume()` returns
  `cellSize³`, `getCeilingHeight()` returns `cellSize`. A future
  "non-cube cell" mode would require a separate axis-height field
  on the zone; not added in v1.
- **Persistence**: already persistent on `CartesianZone`; no change.

### Spherical floor convention

For `SphericalLocation`, the focus is at sphere **center** in v1.
`getCeilingHeight()` returns `2·radius` (the full diameter).
Alternative "focus at floor" convention is rejected for v1 because
sphere-center matches the existing physics interpretation of a
spherical zone (radius being distance-from-center to perimeter).

### `LocationApi` geometry-agnostic accessor

Callers that don't want to type-narrow can go through:

```ts
// api/location.ts
class LocationApi {
  static getVolume(room: Stuff & Container): Quantity<'m³'> | null;
  static getCeilingHeight(room: Stuff & Container): Quantity<'m'> | null;
}
```

Trivial wrappers that delegate to the virtual method via the
existing typed surface.

---

## Layer 6 — The override chain

Resolution order for any atmospheric field, most-specific first:

```
1. Detail override on the Location          (room._detailTemperatures.get(detailKey))
2. Prefix-inherited Detail override         (room._detailTemperatures.get(parent of detailKey))
3. Room-scope override on the Location      (room._temperature)
4. Biome default                            (room.getBiome().getDefaultTemperature())
5. Spatial zone default                     (room.getZone().getDefault(field))
6. Universe default                          (e.g. 9.81 m/s² for gravity, 1 atm pressure)
```

Steps 1–2 mirror Material's `Tangible.getMaterial(detailKey)`
prefix walk. Step 4 walks the biome's own template ancestry: a
biome `/idea/biome/outdoor/forest/temperate` falls through to
`/idea/biome/outdoor/forest`, then `/idea/biome/outdoor`, then the
spatial zone, then universe defaults. The biome chain is
implemented by walking the templatePath ancestry; the same caching
shape `ZoneApi` uses on Cartesian/Spherical zones applies.

Step 5 (spatial zone default) walks the zone's own template-tree
ancestry per the [zone-architecture slate](./zone-architecture-slate.md)
— FolderZones participate as inheritance nodes, the nearest-defined
value wins. Step 6 uses the existing `resolveSetting`-style
fallback (per [shell-environment.md](../subsystems/shell-environment.md))
under a new namespace `world.atmosphere.{field}`.

### `BiomeApi` API surface

```ts
// api/biome.ts
class BiomeApi {
  // Singleton resolution
  static findByPath(path: string): Biome | null;

  // Atmosphere registry
  static registerAtmosphere(def: AtmosphereDef): void;
  static getAtmosphereDef(tag: string): AtmosphereDef | null;
  static getAtmosphereDensity(tag: string): Quantity<'kg/m³'>;

  // Chain resolution (used internally by AtmosphericMixin getters;
  // exposed for tooling and `analyze atmosphere` verb)
  static resolveTemperature(room: Atmospheric, detailKey?: string): Quantity<'K'>;
  static resolvePressure(room: Atmospheric, detailKey?: string): Quantity<'Pa'>;
  // ... one per field
}
```

The per-field resolve methods walk the chain explicitly. The
mixin's `getTemperature` etc. delegate to these so the chain logic
lives in one place.

---

## Layer 7 — Pedagogical seam

Same pattern as Light and Sound: real units underneath, friendly
tags on top, instruments-and-analyze-verb-reveal-the-math.

### Seam 1 — Real units in `Quantity<T>`

All five atmospheric fields are Quantity-typed. A student
introspecting via instrument or `analyze` sees Kelvin, Pascals,
relative-humidity percent, m/s², kg/m³ — the same units they'd
use in coursework.

### Seam 2 — Gas-law math falls out

Once `volume`, `pressure`, `temperature`, and `atmosphere` (with
density) are all real units, PV=nRT works. A chemistry student
introspecting the cafeteria's atmosphere can compute moles of
oxygen present. An engineering student modeling a sealed chamber
can predict pressure change vs temperature change. The engine
isn't simulating it dynamically in v1, but the data is honest and
the math is computable.

### Seam 3 — Density-driven buoyancy and hydrostatic pressure

Water-medium rooms with depth (via vertical Cartesian zones) gain
hydrostatic-pressure detail overrides as authoring decoration:
`pressure` at deeper Details rises with `ρ·g·h`. A physics student
verifying ocean-depth pressure values against textbook math gets
the correct numbers.

### Seam 4 — Instruments

Stuff a player can wield to read the room's physics:

| Instrument | Verb | Reveals |
|---|---|---|
| `Thermometer` | `measure temperature here` | `temperature` in K (and °C / °F via toggle) |
| `Barometer` | `measure pressure here` | `pressure` in Pa (and atm / mmHg via toggle) |
| `Hygrometer` | `measure humidity here` | `humidity` in % |
| `GravityMeter` | `measure gravity here` | `gravity` in m/s² (off-Earth biomes) |
| `GasAnalyzer` | `analyze atmosphere here` | `atmosphere` tag + density |
| `Altimeter` | `measure altitude here` | derives altitude from pressure delta |

Each instrument is a `Thing` (probably composing `Holdable`).
Reading routes through `BiomeApi.resolve*` so it gets the chain
walk for free. Instruments accept a Detail-key argument:
`measure temperature hearth`.

### Seam 5 — The `analyze atmosphere` verb

Same pattern as sound-slate's `analyze sound`. One verb, two
audiences (casual prose for the default rendering; physics-grade
when invoked):

```
> analyze atmosphere here

Biome: temperate-forest (/idea/biome/outdoor/forest/temperate)
Spatial zone: narnia-overworld

Field          Value           Source            Path traversed
─────────────  ──────────────  ────────────────  ───────────────────────
temperature    295 K (warm)    room default      (this Location override)
pressure       101325 Pa       universe default  → biome → zone → universe
humidity       62 %            biome default     → biome
gravity        9.81 m/s²       universe default  → biome → zone → universe
atmosphere     air             biome default     → biome

Derived:
  volume        27 m³          (3×3×3 m cell)
  ceiling       3 m
  density       1.225 kg/m³   (air @ standard conditions)

Detail overrides on this Location:
  hearth        temperature = 800 K (very hot)
  hearth.embers temperature = 1200 K (very hot)
```

Cheap to implement; high pedagogical surface. Doubles as a
developer debug tool.

### Seam 6 — Off-Earth play

Non-9.81 gravity rooms make projectile arcs different, jump heights
different, terminal-velocity computations different. A future
"asteroid mining station" biome with `gravity: 0.5 m/s²` lets a
physics student do the kinematics and observe consequences.

v1 doesn't model these mechanics dynamically — but the substrate
is in place. When kinematics-aware verbs land they read `gravity`
through `BiomeApi.resolveGravity(room)` and get the chain walk for
free.

---

## Worked scenarios

### Scenario A — Cafeteria with a hot fire pit

Author intent: cafeteria at 22°C; ornamental hearth at one end is
hot.

- Cafeteria Location references biome `/idea/biome/indoor/cafeteria`.
- Cafeteria biome default temperature: `Quantity.of(295, 'K')` (~22°C).
- Cafeteria Location adds a Detail `hearth` via DetailedMixin.
- Authoring: `room.setTemperature(Quantity.of(800, 'K'), 'hearth')`.
- `room.getTemperature()` → 295 K (room default).
- `room.getTemperature('hearth')` → 800 K (Detail override).
- A student `measure temperature hearth` → 800 K rendered with the
  Thermometer's prose ("scorching hot").

### Scenario B — Underwater room

- Location references biome `/idea/biome/outdoor/sea/shallow`.
- Biome `_defaultAtmosphere: 'seawater'`, `_defaultTemperature:
  Quantity.of(287, 'K')` (~14°C ocean default).
- `room.getAtmosphere()` → `'seawater'`.
- The locomotion-mode follow-up reads
  `BiomeApi.getAtmosphereDef('seawater').defaultLocomotionMode` →
  `'swim'`, gates locomotion accordingly.
- Hydrostatic pressure on a `deep-detail` is authored at the depth
  the author intends: `room.setPressure(Quantity.of(110000, 'Pa'),
  'deep')` (≈1 atm + ~1 m water column).
- A `Pisces` species character breathes (per future Race
  integration); a `Homo sapiens` suffocates (gates after a held-
  breath timer — future work).

### Scenario C — Single-room exception (cafeteria atrium)

- Author wants the main cafeteria enclosed but the atrium room
  sky-exposed.
- Authoring: create `/idea/biome/indoor/cafeteria/atrium` as a
  child biome that extends `SkyExposedBiome` (vs the parent which
  extends plain `Biome`).
- The atrium Location's biome path is the child; everything else
  in the cafeteria points at the parent.
- `LocationApi.isSkyExposed(atrium)` → true; same query on other
  cafeteria rooms → false.
- Child biome inherits the parent's default temperature, humidity,
  etc. unless it overrides them — typical use is "I just want the
  sky-exposure flag flipped." Override what you mean; chain handles
  the rest.

### Scenario D — Different species, same room

- A room with `atmosphere: 'hydrogen'` is unbreathable for Homo
  sapiens (`isBreathable: false` on the atmosphere def).
- The species-side breathing gate (future work) reads
  `BiomeApi.getAtmosphereDef(room.getAtmosphere()).isBreathable`
  and applies an asphyxiation tick.
- A hypothetical `Anaerobe` species (extremophile) overrides at
  the species layer to ignore the gate.
- Both species can stand in the room; only one suffocates.

### Scenario E — Gas law on the cafeteria

- Cafeteria: 3×3×3 m cell → 27 m³ volume (derived).
- Atmosphere `air`, density 1.225 kg/m³ → total air mass ~33 kg.
- Temperature 295 K, pressure 101325 Pa.
- A chemistry student introspects via `analyze atmosphere here`
  and computes `n = PV / RT` → ~1117 mol of mixed gas in the
  room.
- The author didn't write a single line of physics simulation.
  The data is honest; the math is the student's.

---

## v1 biome roster

The minimum biome library to start authoring **campus +
surrounding city + nearby wilderness** content at 42°N. **39
leaves** total. Inheritance does the heavy lifting — the parent
biomes at each tier carry shared defaults; leaves just declare
what differs.

### Tree shape

```
/idea/biome/                  (Biorealm — folder zone)
  outdoor/                    (Biome — sky-exposed, weather-affected,
                                ambient breeze / distant birdsong,
                                seasonal temperature swings
                                inherited from celestial profile)
    temperate/                (Biome — 42°N seasonal cycle, ~50% RH,
                                Earth-like solar declination,
                                temperate flora/fauna texture)
      <leaves>
  underground/                (Biome — not-sky-exposed, no weather,
                                stable cool ~12°C, mineral smell,
                                drip / echo ambient)
    <leaves>
  indoor/                     (Biome — not-sky-exposed,
                                climate-controlled ~21°C, ~45% RH,
                                low HVAC hum)
    academic/                 (defaults: paper / wood / chalk smell,
                                quiet murmur)
      <leaves>
    residential/              (defaults: personal-clutter soft texture)
      <leaves>
    social/                   (defaults: food / voice ambient, warmer)
      <leaves>
    civic/                    (defaults: wood / mixed-trade smells,
                                conversational ambient)
      <leaves>
    special/                  (defaults vary per leaf)
      <leaves>
```

### Campus

**Outdoor (5)** under `outdoor/temperate/`:

- `quad` — open grassy plaza between buildings; the heart of campus
- `path` — treelined walkway between buildings
- `garden` — botanical / ornamental (biology fieldwork hook)
- `athletic-field` — open turf for sports
- `courtyard` — building-enclosed outdoor space (sky-exposed but sheltered)

**Indoor — academic (7)** under `indoor/academic/`:

- `lecture-hall` — tiered seating, podium, low ambient
- `classroom` — smaller seminar / teaching space
- `wet-lab` — chemistry/biology; ventilation hum, faint chemical smell
- `dry-lab` — physics/computing; equipment hum
- `library-stacks` — quiet, paper/leather smell
- `library-reading-room` — slightly less quiet, daylight
- `faculty-office` — small, personal-clutter texture

**Indoor — residential (2)** under `indoor/residential/`:

- `dorm-room` — personal space
- `common-room` — shared lounge, social ambient

**Indoor — social (1)** under `indoor/social/`:

- `cafeteria` — food smells, clatter, warm

**Indoor — special (6)** under `indoor/special/`:

- `observatory-dome` — cool, quiet, occasional mechanical
  movement; sky-exposed via aperture (special-case candidate
  — likely needs SkyExposed composed onto a normally-enclosed
  profile; may be the first content case that exercises that
  capability seam)
- `gymnasium` — echoey, rubber-and-sweat
- `theater` — dark, plush, hushed
- `art-studio` — paint/clay smell, north light
- `chapel` — quiet, incense
- `archive` — rare-books storage; dry, cool, dust, leather

### Surrounding city

**Outdoor (4)** under `outdoor/temperate/`:

- `street` — cobblestone or paved, daytime bustle
- `alley` — narrow, refuse-tinged, quieter
- `plaza` — open public space
- `riverbank` — water-edge texture

**Indoor — civic (4)** under `indoor/civic/`:

- `shop` — varied wares, varied smells, conversational ambient
- `tavern` — woodsmoke, ale, voices and music
- `inn` — like tavern but quieter, with sleeping areas
- `workshop` — smithy / cobbler / carpenter; metalwork, leather, sawdust

**Indoor — residential (1)** under `indoor/residential/`:

- `townhouse` — domestic, personal

### Wilderness (6 outdoor)

Under `outdoor/temperate/`:

- `forest-deciduous` — leafy canopy, birdsong, seasonal foliage
- `forest-coniferous` — pine/spruce, denser shade, year-round green
- `meadow` — grassland, full sun, insect hum
- `wetland` — marsh/swamp, standing water, frog/cricket chorus
- `lakeshore` — open water adjacent
- `highland` — rolling hills, exposed, windier

### Underground (3)

Under `underground/`:

- `tunnel` — campus secret passages; cool, damp stone, drips
- `sewer` — city sewer; wet, fetid, echoing
- `cave` — wilderness caves; deep dark, dripping, stable cool

### Totals by category

| Category | Leaves |
|---|---|
| outdoor/temperate | 15 |
| underground | 3 |
| indoor/academic | 7 |
| indoor/residential | 3 |
| indoor/social | 1 |
| indoor/civic | 4 |
| indoor/special | 6 |
| **Total** | **39** |

### Explicitly deferred (not v1)

Easy to add later when content asks:

- Specialized labs (chemistry vs biology vs physics) — split
  off from `wet-lab` / `dry-lab` when curriculum content
  demands per-discipline distinction.
- Stables / barn — for horse-keeping or pasture content.
- Coastline (beach, cliffs) — depends on whether the campus
  region has a sea.
- Subterranean specialization (cavern vs mine vs crypt vs
  natural-cave) — `cave` covers v1; split as content asks.
- Magical / fey biomes (ley-line node, fey circle) — belong
  in Narnia / other realms, not this campus tier.
- Weather-extreme biomes (frozen waste, desert, jungle) — not
  for v1 42°N campus area.

---

## What this stresses for existing subsystems

### Spatial subsystem

- `CartesianZone.cellSize` graduates from informational to load-
  bearing. Adds default (`3.0`), cube-cell assumption, persistence
  unchanged. Update `docs/subsystems/spatial.md § CartesianZone`.
- `Location` gains abstract `getVolume()` / `getCeilingHeight()`
  declared on the abstract base (returning `null`), with concrete
  implementations on `CartesianLocation` and `SphericalLocation`.
- `Location` composes `AtmosphericMixin` in the base composition.

### Quantities subsystem

- New unit literals if not already in catalog: `'K'`, `'Pa'`, `'%'`,
  `'m/s²'`, `'m³'`, `'m'`. Each gets a tag table for friendly
  rendering (e.g. K: "freezing" / "cold" / "cool" / "warm" / "hot"
  / "scorching"; Pa: "vacuum" / "low" / "normal" / "high" / "crushing").
- Each gets a `QuantityMarshaller` for persistence round-trip. The
  shape is already proven by Light's lux/lumen/K marshalling.

### Light subsystem

- No code change required. `lightAt` already does the per-detail
  walk; the atmospheric chain doesn't interfere.
- The biome's `SkyExposedMixin` is the seam for an eventual
  ambient-illuminance-from-the-sun computation (currently authored
  per-room). Out of scope for this slate; flagged for the
  weather/celestial work.

### Race subsystem

- Future hook: Species could carry a `breathableAtmospheres:
  Set<string>` field to override the atmosphere-def-default. Not
  shipped here.
- `Atmosphere.isBreathable` is the default-species gate; v1 codes
  no per-species exception path. When it lands, the resolution is
  species-override → atmosphere-def-default.

### Material subsystem

- No code change. Material's prefix-inheritance pattern is what
  `AtmosphericMixin._detail*` maps copy.
- Possible future cross-link: a room's `atmosphere` tag could
  resolve to a Material reference if "the air in this room"
  needs to participate in mass / heat-capacity calculations as a
  bulk substance. Out of scope for v1; flagged.

### Persistence

- New persistent field shapes: `Map<string, Quantity<U>>` per
  detail-override map per field. The `PersistApi` framework
  already handles Map → JSON; the Quantity values use their
  registered marshaller.

### Shell / settings

- New `resolveSetting`-style keys under `world.atmosphere.{field}`
  for universe-default fallback. Schema declared on the universe
  config. Values shipping in v1:
  - `world.atmosphere.temperature` = `295 K`
  - `world.atmosphere.pressure` = `101325 Pa`
  - `world.atmosphere.humidity` = `50 %`
  - `world.atmosphere.gravity` = `9.81 m/s²`
  - `world.atmosphere.atmosphere` = `'air'`

### Documentation

- New `docs/subsystems/biome.md` once the substrate ships,
  graduating from this slate.
- Updates to `spatial.md` (cellSize graduation, getVolume /
  getCeilingHeight references), `ref-shapes.md` (add biome to
  Pattern A exemplars), `race.md` (mention biome's `breathable`
  gate as the seam for future species-breath integration).

---

## Open questions

1. **Folder Zone class name.** `Biorealm` vs `BiomeRealm` vs
   `BiomeKingdom` vs simply `BiomeZone`. Lean `Biorealm` for
   brevity. Trivially renameable later.

2. **Path layout under `/idea/biome/`.** Two reasonable shapes:
   (a) `outdoor/...` vs `indoor/...` top-level split (mirrors the
   sky-exposed-vs-not divide that authors will hit constantly);
   (b) flat — `forest/`, `lab/`, `cafeteria/`, `cave/`. Lean (a) —
   the indoor/outdoor split aligns with the SkyExposedBiome class
   choice, so the path tells you the class.

3. **Biome composing `Singleton`?** Per the doc, the engine doesn't
   currently require it; `BiomeApi.findByPath` works either way.
   Lean **not** composing Singleton by default — leaves room for
   future "this biome generates per-clone variance" use cases
   (procedural weather, time-of-day microclimate). Content authors
   who need strict singleton compose it themselves.

4. **Atmosphere tag = string vs registered Quantity tag-table?**
   Strings are flat and trivial; tag-table integration would let
   `Quantity.parse('air', 'atmosphere')` work, but `atmosphere`
   isn't a Quantity (no scalar value). Lean **string with its own
   registry** (separate from Quantity's tag tables). Same pattern
   Material uses.

5. **`AtmosphericMixin` placement.** Compose onto every Location at
   the base, or onto a separate `PhysicalLocation` intermediate?
   Lean **onto Location base** — every Location has physics in v1.
   The hypothetical abstract location (a "dream realm" with no
   atmosphere) can override the getters to return universe defaults
   or be its own class outside this layer.

6. **Sparse storage vs always-present.** Sparse (v1 proposal):
   `null` in the slot means "fall through." Always-present:
   every Location carries every field, default-populated from
   biome on clone. Lean **sparse** — matches Material's shape,
   simpler persistence story (don't persist `null` slots),
   clearer semantics for "this room overrides X."

7. **Override-chain caching.** v1 walks the chain on every read.
   Cache invalidation across biome-template hot reload is messy,
   so the simple shape is best for now. Re-evaluate if profiling
   shows hot-path consumers (perception scans? a Thermometer in
   a tight loop?).

8. **Spherical floor convention.** Chose sphere-center per Layer
   5. The alternative ("focus at floor level, ceiling = radius")
   is rejected for v1 — sphere-center matches the existing
   spatial doc's interpretation of `radius` (focus-to-perimeter
   distance).

9. **Non-cube cells in `CartesianZone`.** Deferred. v1 commits
   to `volume = cellSize³` / `ceilingHeight = cellSize`. A future
   "ceilings are taller than cells are wide" mode adds a separate
   `verticalCellSize` field; out of scope here.

10. **Detail-key conventions.** `AtmosphericMixin` accepts whatever
    string the Location's `DetailedMixin` host uses. No
    cross-validation that the key exists as a Detail (mirrors
    Tangible's intentional decoupling). Authors who set an
    atmospheric override for a non-existent detail key get silent
    no-effect; that's the same shape Material chose.

11. **Initial v1 biome roster.** *Resolved* — see the dedicated
    "v1 biome roster" section above. 39 leaves total covering
    campus (outdoor + academic + residential + social + special),
    surrounding city (outdoor + civic + residential), wilderness
    (6 temperate biomes), and underground (3 biomes shared
    across all three regions). Tree structured for inheritance:
    parent biomes at each tier carry shared defaults; leaves
    declare what differs.

12. **Weather subsystem coupling.** Mentioned in
    `SkyExposedMixin`'s future-method list. Weather is its own
    subsystem and gets its own slate. Biome v1 ships the
    sky-exposure predicate and nothing else weather-shaped.

13. **Locomotion-mode-from-atmosphere coupling.** Adding the
    atmosphere as a tier in `LocomotionApi.defaultModeFor` is a
    one-liner once Atmosphere defs land. Not part of this slate's
    scope; can be a follow-up after the substrate is in.

14. **Pedagogical-seam setting** (analogous to sound-slate's
    `pedagogicalSeam`). A per-player setting that switches default
    rendering between friendly tags and real units. Defer to a
    shared cross-cutting setting alongside Sound's; not a biome-
    specific concern.

---

## Build order

User intent (this conversation): ship the substrate ambitiously,
all five fields + derivations + biome class + sky-exposed mixin.

**Wave 1** — substrate classes + registry.

- `Biome` class (no mixins yet) with the seven fields + getters /
  setters.
- `Biorealm` Zone-folder class. Seed `seeds/biome.yaml` for
  `/idea/biome/`.
- `BiomeApi.findByPath` + atmosphere registry + per-field
  resolveX methods + chain walk.
- The atmosphere registry initial roster (Layer 4 table) seeded
  at boot.

**Wave 2** — Location-side integration.

- `AtmosphericMixin` with the sparse storage shape + per-detail
  maps + Pattern A biome ref.
- Compose `AtmosphericMixin` onto `Location` base.
- New universe-default settings under `world.atmosphere.*`.

**Wave 3** — Derived geometry + cellSize graduation.

- `getVolume()` / `getCeilingHeight()` abstract on `Location`,
  concrete on `CartesianLocation` / `SphericalLocation`.
- `CartesianZone.cellSize` default → 3.0; doc the cube-cell
  assumption.
- `LocationApi.getVolume` / `getCeilingHeight` thin wrappers.

**Wave 4** — Sky-exposed seam.

- `SkyExposedMixin`, `SkyExposedBiome`, `LocationApi.isSkyExposed`.
- v1 method surface is just the predicate; weather / celestial
  methods land with their consuming subsystems.

**Wave 5** — Pedagogical surface.

- `Thermometer`, `Barometer`, `Hygrometer`, `GravityMeter`,
  `GasAnalyzer` as Thing templates + verbs.
- `analyze atmosphere` verb.
- Seed the v1 biome roster (see dedicated section above — 39
  leaves under `outdoor/temperate/`, `underground/`, and
  `indoor/{academic,residential,social,civic,special}/`).

**Adjacent / future** (not this slate):

- `WeatherableMixin` + weather generation.
- Per-species breathing gate.
- Atmosphere-driven locomotion-mode default.
- Procedural / time-of-day biome variants.
- `Atmosphere` → Material cross-link for bulk-gas thermodynamics.
- Hearing-damage style "atmospheric dose" tracking (toxic gases,
  radiation if/when added).

---

## What this slate does NOT cover

- **Sub-room geometry.** No coordinates within a room; no
  volumetric distribution of values. Details are the only seam
  for per-feature variation, and Details don't carry positions.
- **Weather, celestial bodies, day/night.** Owned by future
  weather and celestial slates. This slate ships the sky-exposure
  *predicate* but no behavior consuming it.
- **Hazard mechanics.** Toxic atmospheres, radiation, electrical
  fields. The atmosphere tag carries `isBreathable`; everything
  past that is future work.
- **Per-species breathing / habitat overrides.** The seam is
  flagged (atmosphere def's `isBreathable` is the v1 default; per-
  species exception is a Race-side hook for later).
- **Atmosphere as a dynamic simulation.** v1 atmospheric fields
  are authored constants, not propagated by physics. A door that
  opens between a hot and cold room doesn't gradient. The data
  shape is honest; dynamic gradient simulation is a later wave.
- **Audio/scent propagation.** Sound is sound-slate's territory.
  Smell is a future sense slate.
- **Function-flavored Locations** (Lab vs Library vs Classroom).
  Stays content — author Things that compose appropriate fixture
  Adornments, choose a biome leaf for the room, don't subclass
  `Location`.

---

## Once shaped into formal requirements

- The `Biome` class definition + field roster + getter/setter
  surface + persistentFields list.
- `Biorealm` Zone-folder class + `seeds/biome.yaml` shape.
- The atmosphere registry + the v1 atmosphere-def roster.
- `AtmosphericMixin` field shape (sparse storage + per-detail
  maps) + method surface.
- `BiomeApi` surface (full method list) + resolution chain
  implementation.
- `SkyExposedMixin` + `SkyExposedBiome` + `LocationApi.isSkyExposed`.
- `Location.getVolume()` / `getCeilingHeight()` abstract +
  Cartesian / Spherical overrides + `LocationApi` wrappers.
- `CartesianZone.cellSize` default value + doc update on the
  cube-cell assumption.
- The v1 universe-default settings under `world.atmosphere.*`.
- `Thermometer` / `Barometer` / `Hygrometer` / `GravityMeter` /
  `GasAnalyzer` Thing templates + verbs.
- `analyze atmosphere` verb.
- Initial v1 biome roster (per open question #11).
- Tests gating: chain walk hits each layer in order; per-detail
  override + prefix inheritance work; biome ancestry walk
  traverses templatePath ancestors; sky-exposure predicate
  works on the right side of the biome inheritance; geometry
  derivations match the cube / sphere math.

Future-wave items (weather, per-species breathing, dynamic
gradients, locomotion-mode-from-atmosphere) wait for their own
slates.
