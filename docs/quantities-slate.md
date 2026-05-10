# Quantities slate (working doc)

Working slate for the cross-cutting `Quantity<T>` pattern —
**real-units-underneath, friendly-tags-on-top, instruments-reveal**.
Saxonberg's pedagogical claim ("students exercise classroom
concepts inside the game") becomes a **substrate property** rather
than per-feature rhetoric: when a chemistry student inspects a
beaker, the engine has real molarity; when a biology student plays
a dog, the engine has real species hearing range; when a physics
student fires a tuning fork, the engine has real frequency.

This slate captures the pattern that emerged from the sound
discussion. Sound is the second instance after light; codifying
the pattern now pays for itself across every future physics
channel and every quantitative property.

See also:

- [docs/vision.md](./vision.md) — Saxonberg's pedagogical
  premise.
- [docs/sound-slate.md](./sound-slate.md) — first explicit
  consumer; sound-slate references this slate's `Quantity<T>`
  shape and the pedagogical seam pattern.
- [docs/subsystems/light.md](./subsystems/light.md) — light is
  the implicit first instance; current implementation predates
  the pattern but adopts it as part of the sound rollout.
- [docs/subsystems/race.md](./subsystems/race.md) — Material
  substrate already carries scientific data (atomic mass,
  density). The pattern formalizes what's already implicit.
- [docs/subsystems/properties.md](./subsystems/properties.md) —
  `PropertiedMixin` + typed `Property<T>`. `Quantity<T>` extends
  the typed-value pattern with units + tag-mapping.

---

## Principle

Three claims this slate makes:

1. **Saxonberg's canonical types use real units.** dB SPL, Hz,
   K, kg, m, mol, lux, nm. Not "0–100 percent" or "1–5 stars."
   The math is honest.
2. **Authors keep working with friendly tags.** `noiseLevel:
   'loud'`, `temperature: 'warm'`, `mass: 'heavy'`. No physics
   degree required to author content.
3. **Students introspect the world to see the physics.**
   Instruments — wielded as Stuff in-world — and `analyze` verbs
   reveal the canonical units. Same engine, two rendering paths.

The result is **layered fidelity**: gameplay tags on top, real
units underneath, both consistent. The conversion is explicit,
documented, and inspectable.

---

## The `Quantity<T>` shape

```ts
class Quantity<U extends Unit> {
  readonly value: number;        // canonical SI / standard unit value
  readonly unit: U;              // type-tag for which unit family

  // Construction
  static of<U extends Unit>(value: number, unit: U): Quantity<U>;
  static fromTag<U extends Unit>(tag: string, kind: U): Quantity<U>;

  // Conversion
  rawValue(): number;            // for math
  format(): string;              // canonical-unit display: "60 dB"
  tag(): string;                 // friendly-tag display: "loud"
  to(targetUnit: U): Quantity<U>; // for non-canonical display (e.g. dB → linear)

  // Math
  add(other: Quantity<U>): Quantity<U>;   // unit-aware (logarithmic for dB)
  scale(factor: number): Quantity<U>;
  // … per-unit-kind helpers
}

type Unit =
  | 'dB' | 'Hz' | 'kg' | 'm' | 'm/s' | 's' | 'K'
  | 'lux' | 'nm' | 'mol' | 'mol/L' | 'Pa' | 'N' | 'J' | 'W'
  ;
```

Storage is the canonical SI / standard unit. Display is per-unit
formatter logic. Math respects unit semantics — adding two
`Quantity<dB>` values uses logarithmic addition; adding two
`Quantity<kg>` values is straight-arithmetic.

### Per-unit math

A small registry of per-unit operations:

```ts
const UnitMath: Record<Unit, UnitOps> = {
  dB:  { add: logarithmicAdd, scale: logarithmicScale },
  Hz:  { add: arithAdd,        scale: arithScale },
  kg:  { add: arithAdd,        scale: arithScale },
  K:   { add: arithAdd,        scale: arithScale },
  // …
};
```

Logarithmic dB addition (`10 × log₁₀(10^(a/10) + 10^(b/10))`)
isn't surfaced to authors; the framework handles it. Students
introspecting see the result and can verify against their own
calculation — that's the pedagogical moment.

### `Property<Quantity<U>>` integration

`PropertiedMixin` already supports typed `Property<T>`:

```ts
const noiseLevelProp = Property.of<Quantity<dB>>('emission.amplitude');
const temperatureProp = Property.of<Quantity<K>>('thermal.temperature');
const massProp        = Property.of<Quantity<kg>>('physical.mass');

stuff.setProp(massProp, Quantity.of(10, 'kg'));
const m = stuff.getProp(massProp);    // Quantity<kg>(10)
m.format();   // '10 kg'
m.tag();      // 'heavy' (per kg's tag table)
```

Existing typed-property machinery works unchanged; `Quantity<U>`
is just the value type.

---

## Tag-to-unit mappings

Per-unit tag tables. Conversion is documented and stable:

```ts
// dB SPL — sound amplitude (sound-slate.md table 1)
'silent'  → 0  dB
'quiet'   → 25 dB
'normal'  → 60 dB
'loud'    → 75 dB
'painful' → 110 dB

// kg — mass
'feather'  → 0.001 kg
'light'    → 0.5 kg
'medium'   → 5 kg
'heavy'    → 50 kg
'enormous' → 500 kg

// K — temperature
'freezing' → 273 K
'cold'     → 283 K
'cool'     → 290 K
'warm'     → 295 K
'hot'      → 320 K
'scalding' → 360 K

// lux — illuminance
'pitch-dark' → 0 lux
'dim'        → 1 lux
'normal'     → 300 lux
'bright'     → 1000 lux
'dazzling'   → 50000 lux

// Hz — frequency band centers (or band low-high)
'infrasonic'    → < 20 Hz
'low-pitched'   → 20–250 Hz
'mid-pitched'   → 250–2000 Hz
'high-pitched'  → 2000–8000 Hz
'ultrasonic'    → > 20000 Hz
```

Tables are content-defined per kind. Authors and engine code
consult the same table; round-trips (`Quantity → tag → Quantity`)
are stable.

### Author shortcut

Direct quantity literals are also accepted:

```yaml
mass: 'heavy'           # tag — maps to 50 kg
mass: '12 kg'           # canonical — exactly 12 kg
mass: '12000 g'         # any unit — converts to 12 kg internally
```

Frameworks parses both shapes; canonical underneath either way.

---

## Display modes — gameplay vs instrumented

Two rendering targets driven by player setting:

```ts
type PedagogicalSeamLevel =
  | 'gameplay-prose'    // default; "you hear water trickling"
  | 'tags-visible'      // subtle inline tags; "you hear water trickling [quiet]"
  | 'instruments-only'  // instrument readings show units; prose stays casual
  | 'full-detail'       // everything in canonical units always
;
```

Per-player setting (the `EnvironmentMixin` keyspace from
shell-environment.md is the natural home — `pedagogical.seam:
'gameplay-prose'` is the v1 default).

The MML composer (api/mml.ts and the scene composer) reads this
setting and chooses tag vs. canonical formatting at render time.
The engine's internal calculation is identical; only the
serialization to the wire differs.

A **server-side default** can be configured per-deployment — an
educational deployment might default to `'tags-visible'` or
`'instruments-only'` so students see the science by default.

---

## Pedagogical seam — instruments-reveal

Instruments are **Stuff in the game world** that, when used,
expose canonical-unit readings of engine state.

> The wielded-instrument path is one branch of a broader
> verb-acquisition pattern (innate / skill / instrument /
> implant / consumable / ambient). See
> [docs/verb-provisioning-slate.md](./verb-provisioning-slate.md)
> for the full taxonomy and the unified-controller wiring; the
> per-channel instrument roster below is this slate's
> contribution to that taxonomy.

### Pattern

A scientific-instrument `Stuff`:

- Composes `Wieldable` (you hold it).
- Has a verb that reads engine state and renders in instrument
  mode.
- The data accessed is the same the engine uses internally —
  no shadow data, no out-of-band channel.

```ts
class SoundLevelMeter extends Wieldable(Thing) {
  // verb: `measure sound here`
  static measureCmd(actor) {
    const sound = SoundApi.soundAt(actor.location);
    return `${sound.amplitude.format()} SPL, dominant ${sound.dominantBand.format()}`;
  }
}
```

This is the cleanest expression of the pedagogical claim: the
student's `measure sound` reading IS what the engine sees. No
abstraction, no curtain.

### Roster (cross-channel; populated as channels arrive)

| Instrument | Verb | Reveals | Channel |
|---|---|---|---|
| `SoundLevelMeter` | `measure sound here` | dB SPL aggregate | sound |
| `SpectrumAnalyzer` | `measure spectrum here` | Frequency content | sound |
| `Stethoscope` | `listen-with stethoscope to X` | Quiet body sounds | sound |
| `TuningFork` | `strike tuning-fork` | Emits a known frequency | sound |
| `Sonar` | `ping sonar` | Echo time → distance | sound |
| `Photometer` | `measure light here` | Illuminance in lux | light |
| `Thermometer` | `measure temperature of X` | Kelvin / Celsius | heat (future) |
| `Hygrometer` | `measure humidity here` | Relative humidity | atmosphere (future) |
| `Balance` (scale) | `weigh X` | Mass in kg | mass |
| `Rangefinder` | `measure distance to X` | Distance in meters | distance |
| `pH-meter` | `measure pH of X` | pH value | chemistry |
| `Voltmeter` | `measure voltage at X` | Volts | electrical (future) |

Each instrument is one Stuff template + one controller. The
data it accesses is whatever Api the channel exposes
(`SoundApi`, `LightApi`, `MaterialApi`, etc.).

---

## The `analyze` verb family

A second pedagogical surface — verbs that don't require
instruments but still expose canonical numbers. Useful in
contexts where the player doesn't have an instrument handy
(authoring, debugging, study mode).

```
> analyze sound here
[full breakdown of sources, attenuation, masking, thresholds —
 see sound-slate.md § "The analyze pattern"]

> analyze light here
Aggregate illuminance: 320 lux
Sources:
  ceiling-lamp (500 lux at source, 350 lux at floor level)
  daylight through window (200 lux at window, 100 lux here)
Color temperature: ~3000 K (warm white dominant)
Your visual band perception: scotopic threshold 0.001 lux
                              photopic threshold 1 lux

> analyze chemistry of beaker
Material: water (H₂O)
  Mass: 250 g
  Volume: 250 mL
  Temperature: 295 K
  pH: 7.0
Dissolved: NaCl, 0.05 mol/L
```

Same pattern across channels. Implementation: `analyze`
controller dispatches to per-channel sub-controllers based on
the second word.

`analyze` is also a developer debug tool — same surface, two
audiences.

---

## Cross-channel application examples

How the pattern lands in each channel — sound is the worked
example, the rest are sketches.

### Sound

- `Sound.amplitude: Quantity<dB>`
- `Sound.dominantBand: { low: Quantity<Hz>, high: Quantity<Hz> }`
- `Location.reverbTime: Quantity<s>`
- `Species.hearingProfile.threshold: Quantity<dB>` and
  `frequencyRange: { low: Quantity<Hz>, high: Quantity<Hz> }`
- Conduit `transmissivity['sound']: number` (0–1; not a
  Quantity itself — it's a ratio)
- Instruments: SoundLevelMeter, SpectrumAnalyzer, Stethoscope,
  TuningFork, Sonar
- `analyze sound here`

### Light (existing; adopts the pattern)

- `Light.intensity: Quantity<lux>` (currently a scalar; folds
  into `Quantity<lux>`)
- `Light.color`: CIE coordinates or color temperature
  `Quantity<K>`
- `Species.visionProfile`: thresholds in lux
- Conduit `transmissivity['light']: number`
- Instruments: Photometer
- `analyze light here`

The light system pre-dates this pattern; adoption is a
mechanical refactor that lands alongside the sound rollout's
Conduit refactor.

### Mass

- `Stuff.mass: Quantity<kg>` (replaces the scalar `mass`
  property today; `'heavy'` tag still works)
- Authors continue writing `mass: 'heavy'`; framework parses to
  `Quantity<kg>(50)`
- Carry-capacity calculations work in canonical units
- Instruments: Balance / scale

### Distance

- `Quantity<m>` for ranges, locations' physical extents, weapon
  reach
- Instruments: Rangefinder, surveyor's tape
- `analyze distance to X` reports meters and tag

### Temperature (future heat channel)

- `Stuff.temperature: Quantity<K>`
- `Material.thermalProperties.specificHeat: Quantity<J/(kg·K)>`
- `Conduit.transmissivity['heat']: number`
- Instruments: Thermometer

### Chemistry (existing material substrate; adopts pattern)

- `Material.molarMass: Quantity<g/mol>` (currently scalar `molarMass`)
- `Solution.concentration: Quantity<mol/L>`
- `Solution.pH: number` (dimensionless; not a `Quantity`)
- Instruments: pH meter, balance, pipette
- `analyze chemistry of X`

The Material substrate (race.md) already carries chemistry
data. Adoption of `Quantity<T>` is a refactor; same data, typed
shape.

---

## Open questions

1. **Is `Quantity<T>` a class with operator overloading shim, or
   plain object + helpers?** TypeScript can't operator-overload;
   either methods (`a.add(b)`) or helper functions
   (`add(a, b)`). Lean methods for ergonomics; uniform across
   units.

2. **Tag-table ownership.** Per-channel tag tables — defined in
   the channel's slate / Api, or centralized?
   Lean per-channel-Api; the channel owns its semantic
   vocabulary.

3. **Locale-aware formatting.** Imperial display for English
   players? `Quantity<m>` displaying as feet/inches in US
   locale? Lean defer; stick with SI display in v1; add locale
   layer when content team asks.

4. **Mixed-unit math.** `Quantity<m> / Quantity<s>` should be
   `Quantity<m/s>`. Compile-time enforcement in TypeScript is
   possible with template literal types; runtime enforcement is
   easy. Lean runtime v1; typed-derivation v2 if it earns its
   complexity.

5. **Quantity comparison vs equality.** Two `Quantity<dB>(60)`
   instances — equal? Identity vs structural — lean structural
   (`a.equals(b)` checks value + unit).

6. **`PedagogicalSeamLevel` granularity.** Four levels v1
   (`gameplay-prose` / `tags-visible` / `instruments-only` /
   `full-detail`). Right number? Fewer is simpler; more is
   finer-grained. Lean four; reduce if some are redundant.

7. **Instrument calibration / accuracy.** Real instruments have
   accuracy ratings (a $20 thermometer is ±2 K; a lab thermometer
   is ±0.1 K). Model in v1? Lean defer; flag as an authoring
   axis for future when instrument variety justifies.

8. **Quantity persistence shape.** Stored as `{ value, unit }` JSON
   vs. as a single string `"60 dB"` vs. just the value (with
   unit implicit per-property)? Lean `{ value, unit }` —
   self-describing, robust to future unit changes. Slightly
   bigger on disk; not a real cost.

9. **Authoring tooling for tag tables.** Should the friendly-tag
   tables be hot-editable / data-driven from YAML, or
   compile-time TypeScript? Lean YAML — content team can
   adjust without code.

10. **Do all numeric properties become `Quantity<T>`?** Most;
    some genuinely dimensionless (pH, ratio fields, percentages,
    counts). The dimensionless cases stay plain `number`. Rule
    of thumb: if it has a unit, use `Quantity`; if it's
    dimensionless or per-mille, plain.

---

## Build order

This slate's implementation lands alongside the sound-slate's
Wave 1, since sound is the first explicit consumer.

**Wave 1** — pattern infrastructure.

- `Quantity<U>` class + per-unit math registry.
- Per-channel tag tables (start with sound, light, mass,
  temperature).
- `pedagogical.seam` setting in `EnvironmentMixin` keyspace.
- MML composer reads the setting and routes tag vs. canonical
  rendering.

**Wave 2** — light migration.

- Light's existing scalar `intensity` becomes
  `Quantity<lux>`.
- LightSource emission spec uses tags / canonical mix.
- Photometer instrument + `analyze light` verb.

**Wave 3** — sound rollout (per sound-slate).

- Sound system uses the pattern from inception.
- SoundLevelMeter + `analyze sound` verb.

**Wave 4** — material / chemistry adoption (incremental).

- `Material.molarMass`, `Material.density`, etc. typed as
  `Quantity<T>`.
- pH meter, balance, ruler instruments.

**Adjacent / future**:

- Heat channel (when third channel forces `PhysicsChannel`
  generalization).
- Locale-aware display.
- Instrument accuracy / calibration.
- Sensor-side gaze-and-instrument convergence (if it ever
  lands).

---

## What this slate does NOT cover

- **Specific channel implementations.** Sound has its own slate
  consuming this; light's adoption is a refactor; future
  channels each get their own slate consuming this.
- **The `analyze` verb dispatcher details.** Lives with the
  command framework; this slate just specifies the shape (each
  channel registers an analyzer; a top-level `analyze` verb
  routes by second-word).
- **Instrument durability / decay.** Instruments are Stuff;
  whatever damage / decay subsystem lands applies to them like
  any Stuff. Not a quantities concern.
- **Pedagogical content authoring tooling.** Future: a UI for
  authors to set unit-tag tables, configure server defaults
  for `pedagogicalSeam`, etc. Out of scope here.
- **Curriculum mapping.** Tagging which engine concepts map to
  which curriculum standards (NGSS, AP Physics, etc.). That's
  a content-team and educational-mod concern, not a substrate
  concern.

---

## Once shaped into formal requirements

- The `Quantity<U>` class spec + per-unit math registry.
- The unit kinds catalog (`Unit` type).
- Per-channel tag tables (initial set: sound, light, mass,
  temperature, distance, frequency).
- `pedagogical.seam` setting spec.
- MML composer integration (which formatter to call given the
  setting).
- The `analyze` verb dispatcher shape.
- Instrument-Stuff pattern: how a SoundLevelMeter or Thermometer
  routes engine values into MML.
- Tests gating: a tag round-trips through canonical
  representation; logarithmic-unit math matches the formula;
  display modes render correctly per setting; mixed-unit math
  errors are clean.

The instrument roster grows as channels add their first
instruments. Sound-slate ships SoundLevelMeter; future heat-slate
ships Thermometer; etc.
