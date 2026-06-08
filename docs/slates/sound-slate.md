# Sound slate (working doc)

> **⚰️ RETIRED — hearing instance shipped 2026-06.** This slate's
> core graduated into Phase 4 of the perception substrate build (see
> [docs/subsystems/senses.md](../subsystems/senses.md)). Shipped:
> `Sound` value object (dB + character + 3-entry source list),
> `SoundSourceMixin`, `SoundConduit` (Door + Window),
> `SoundModality.signalAt` walk with LINEAR-amplitude accumulation
> + logarithmic dB merge at the wrap step (physically correct for
> incoherent sources), `Biome._defaultAmbientSoundLevel` field,
> universe-root sync ambient floor, bare `listen` verb upgrade,
> dB UnitOps registry, dB + Hz tag tables. Door / Window now expose
> five conduits (light, sight, movement, smell, sound).
>
> Deferred polish: SoundLevelMeter instrument + `measure sound`
> sub-verb, async biome-chain `resolveAmbientSoundLevelFor` walker,
> RT60 / reverberation, partial-transmissivity muffled-door
> subclasses, per-species `hearingProfile`. The acoustic spec
> below is **retained** as the depth source for those future
> polishes — do not start new design here, mine for depth.

Working slate for the sound subsystem — propagation through the
Boundary substrate, three source kinds (ambient / activity-driven
/ events), per-viewer detection, and the **pedagogical seam** that
makes the engine's internals consistent with the real acoustics
students learn in physics, biology, and engineering coursework.

This slate threads pedagogical honesty through the design rather
than treating it as a polish layer. The framework's canonical
units are real (dB SPL, Hz, RT60 seconds); content authors keep
working with friendly tags; students introspecting the world see
the real values and the real math.

See also:

- [docs/subsystems/quantities.md](../subsystems/quantities.md) — the
  cross-cutting `Quantity<T>` pattern (real-units-underneath,
  friendly-tags-on-top, instruments-reveal). Sound is the second
  instance of the pattern after light. Consumed by every
  amplitude/frequency/timing field below.
- [docs/subsystems/light.md](../subsystems/light.md) — light's
  shipped propagation walk; sound's `SoundApi` mirrors `LightApi`.
- [docs/subsystems/boundary.md](../subsystems/boundary.md) —
  Adornable / Adornment / Boundary / Conduit substrate. Conduits
  get a channel-keyed transmissivity update.
- [docs/subsystems/locomotion.md](../subsystems/locomotion.md) —
  `mode.noiseLevel` is the source data for activity-driven
  emission. The shipped locomotion subsystem's mode table is
  consumed; no changes required there.
- [docs/subsystems/activity.md](../subsystems/activity.md) —
  emission starts/stops on activity lifecycle hooks;
  `ScheduledEmission` for cadenced side effects on
  `DurativeActivity` / `SustainedEngagement`.
- [docs/subsystems/race.md](../subsystems/race.md) — `Species`
  template gains a `hearingProfile` field, parallel to the
  existing `visionProfile`.
- [docs/adjoining-systems.md](../adjoining-systems.md) — this
  slate graduates entry #3 ("Sound propagation as a physics
  channel").

---

## Principle

Two claims this slate makes:

1. **Sound is a physics channel parallel to light.** Sources emit;
   values propagate through containment + Boundary conduits;
   listeners read aggregated values; per-viewer modulation shapes
   detection. Same shape as the shipped light system.
2. **The framework's canonical sound types use real physics
   units.** dB SPL for amplitude, Hz for frequency, seconds for
   reverberation. Friendly tags map to canonical values via the
   `Quantity<T>` pattern. Authors keep working with tags; students
   introspecting see the physics; the engine math is honest.

The substrate decision is to **mirror `LightApi` as `SoundApi`
v1**, with shape compatible with a future `PhysicsChannel`
generalization once the third channel (heat or scent) arrives.

---

## Layered design

| Layer | Concern | Lives in |
|---|---|---|
| 1. The `Sound` value object | Amplitude + frequency + character | `lib/perception/Sound.ts` |
| 2. Source mixins / event types | What emits sound | `AmbientSoundEmitter`, `SoundEvent` |
| 3. Conduit channel-keyed transmissivity | How sound crosses Boundaries | Boundary substrate update |
| 4. `SoundApi` propagation + detection | Aggregate at a location, per-viewer perception | `api/sound.ts` |
| 5. Pedagogical seam | Real-units rendering, instruments, analysis verbs | `analyze`, `Stethoscope`, `SoundLevelMeter`, etc. |
| 6. Consumers | Activity slate emission hooks; perception subsystem | Mostly in those slates, not here |

---

## Layer 1 — The `Sound` value object

```ts
interface Sound {
  amplitude: Quantity<dB>;          // sound pressure level (SPL)
  dominantBand: { low: Quantity<Hz>; high: Quantity<Hz> };
  character: string;                // 'water-trickling', 'voice', 'metal-clanging'
  // future v2: frequencyBands?: Record<bandName, Quantity<dB>>
}
```

`Quantity<T>` is the typed-units shape from
[docs/subsystems/quantities.md](../subsystems/quantities.md). `Quantity<dB>(75)`
carries the canonical value, the unit, a friendly tag (`'loud'`),
and formatters for both gameplay and instrumented rendering.

`character` is a short descriptor for MML rendering — "you hear
water trickling" — and isn't load-bearing for the propagation
math. It's authorial flavor.

`dominantBand` is required even in v1 because it sets up the
species-frequency-range pedagogy (Layer 5). Even if v1
propagation doesn't model frequency-selective attenuation, the
listener-side detection check uses it (a dog hears the
high-pitched whistle; a human in the same room doesn't).

### Tag-to-unit mappings

The friendly tags from the locomotion `noiseLevel` axis map to canonical
values (and authors can declare canonical values directly):

| Tag | Amplitude (dB SPL) |
|---|---|
| `silent` | 0 |
| `quiet` | 25 |
| `normal` | 60 |
| `loud` | 75 |
| `painful` | 110 |

| Frequency tag | Band (Hz) |
|---|---|
| `infrasonic` | 1–20 |
| `low-pitched` | 20–250 |
| `mid-pitched` | 250–2,000 |
| `high-pitched` | 2,000–8,000 |
| `ultrasonic` | 20,000–100,000 |
| `voice` | 80–4,000 |

These are author-friendly defaults; physics-grade authors can
write `amplitude: '70 dB'` directly.

### Logarithmic addition

When two sources combine at a listener's location, amplitude
adds **logarithmically**:

```
combined_dB = 10 × log₁₀(10^(a/10) + 10^(b/10))
```

So 60dB + 60dB = 63dB (not 120dB). 60dB + 30dB ≈ 60.04dB (the
quieter source is masked). This is the genuine acoustics math
and is exposed by the `analyze sound` verb when invoked.

---

## Layer 2 — Three source kinds

Sound diverges from light here. Light is mostly steady-state
emission; sound has three flavors that need different shapes.

### `AmbientSoundEmitter` mixin

A Stuff that steadily emits sound regardless of activity. A
fountain, a forge, a humming refrigerator, a ticking clock.

```ts
interface AmbientSoundEmitter {
  getEmittedSound(): Sound | null;     // null = not currently emitting
  setEmittedSound(s: Sound | null): void;
  // optional: getEmissionDirection() for directional emitters (radio)
}
```

Composition mirrors `LightSource`. Persistent state:
`_emittedSound: Sound`. Toggleable for things that go silent
(fountain off; forge cold).

### Activity-driven sound

While an activity is in progress, the actor emits sound at the
activity-defined level. For locomotion, the value comes straight
from `mode.noiseLevel` (see [locomotion.md](../subsystems/locomotion.md)). For
non-locomotion activities, the activity declares its emission.

```ts
// Added to the Activity interface — see subsystems/activity.md
interface Activity {
  // ...
  emittedSound?: Sound | null;   // null while running = silent
  emissionScheduleHz?: number;   // optional: emit a SoundEvent at this rate
                                  // (for footstep cadence, hammering rhythm)
}
```

The activity slate's `onStart` / `onComplete` / `onAbort` /
`onTick` hooks are the emission lifecycle anchors:

- `onStart` (implicit in activity registration) — emit a "start"
  `SoundEvent` if the activity has emission.
- `onTick` — periodic `SoundEvent`s for sustained emission
  (footsteps every ~500ms, hammer strikes every ~2s).
- `onComplete` / `onAbort` — emit "stop" `SoundEvent`.

### `SoundEvent` — discrete events

A one-shot. Glass breaks. A door slams. Someone yelps. A
thunderclap. These don't sit on a host as state; they emit once,
propagate, are perceived, and are gone.

```ts
interface SoundEvent {
  source: Stuff | null;             // the emitting Stuff (or null for env)
  location: Stuff & Container;       // where it originated
  sound: Sound;
  timestamp: Timestamp;
  // optional: causedBy field for "voice from <speaker>" pretty-rendering
}
```

Emitted via the events subsystem (see events.md). Picked up by
Sensors in propagation range. Distinct from `MotionEvent`
because sound emission doesn't require motion (a fountain emits
without moving).

The first two source kinds (ambient + activity) are
*queryable* — `SoundApi.soundAt(loc)` reads them. The third is
*event-driven* — handled as it arrives. Both shapes coexist;
listeners aggregate transient events into their current
perception state.

---

## Layer 3 — Channel-keyed Conduit transmissivity

The Boundary substrate today carries channel-specific fields on
Conduit (e.g. `lightTransmission`). Sound generalizes this to:

```ts
interface Conduit {
  transmissivity: Record<ChannelKind, number>;
  // light: 0..1, sound: 0..1, future heat: 0..1, scent: 0..1
}

type ChannelKind = 'light' | 'sound';   // grows over time
```

Worked examples (canonical values; authors override per content):

| Conduit | Light | Sound |
|---|---|---|
| Open doorway | 1.0 | 0.95 |
| Closed wooden door | 0.0 | 0.4 |
| Closed steel door | 0.0 | 0.1 |
| Open glass window | 0.95 | 0.95 |
| Closed glass window | 0.95 | 0.3 |
| Curtained doorway | 0.6 | 0.7 |
| Blanket-over-window | 0.05 | 0.6 |
| Locked steel hatch | 0.0 | 0.05 |

This refactor is small (one field shape change on Conduit) and
backward-compatible — light keeps working through the new shape
identically.

### Material-derived transmissivity (Pedagogical Seam #3)

Authors don't have to hand-tune every Conduit. Sound transmission
through a material can be **derived from acoustic impedance**:

```
transmissivity ≈ f(thickness, density, acousticImpedance)
```

The Material substrate (race.md) already carries density and
related properties. Adding `acousticImpedance` to materials and
deriving Conduit values from `(material, thickness)` is **physics
honest and authorially efficient** — pick a material, get correct
acoustic behavior.

A student studying acoustic engineering or materials science can
verify the model's predictions against their textbook. v1
implementation: a helper `MaterialApi.derivedTransmissivity(mat,
thicknessM, channel)`; authors call it explicitly. v2: implicit
derivation with override.

### Walls in v1 — silent

Sound only propagates through Conduits. Two adjacent rooms with
a wall between them and no Conduit are sonically isolated.
Authors place a "thin wall" Adornment with low-transmissivity
Conduit when they want cross-wall sound.

This is a fidelity loss (real walls leak sound at low levels);
the alternative requires the spatial subsystem to expose
geometric adjacency, which is a bigger lift than this slate
takes on. Revisit if content cases pile up.

---

## Layer 4 — `SoundApi` propagation and detection

```ts
class SoundApi {
  // Propagation
  static soundAt(loc: Stuff & Container): Sound;       // aggregate at location
  static loudestSourceAt(loc): SoundSource | null;

  // Per-viewer detection
  static perceivedSound(viewer: Stuff & Sensor): Sound;
  static canHear(viewer: Stuff & Sensor, source: SoundSource): boolean;
  static loudnessThreshold(viewer: Stuff & Sensor): Quantity<dB>;
  static directionOf(viewer: Stuff & Sensor, source): Direction | null;

  // Reverberation (Layer 5)
  static reverbTimeAt(loc: Stuff & Container): Quantity<seconds>;
}
```

Almost line-for-line mirror of `LightApi`.

### Aggregate at a location

Recursive walk through containment + Conduits, attenuating by
each Conduit's `transmissivity[sound]`, summing logarithmically
across sources, depth-bounded the way `LightApi.lightAt` is.
Returns a single `Sound` value for the location's aggregate.

Per-source attenuation:

```
attenuated_amplitude = source_amplitude × ∏(conduit_transmissivities)
```

In dB space (logarithmic), multiplying by 0.5 transmissivity is
~6dB attenuation. The propagation walk does this in linear space
internally and reports dB on the boundary.

### Per-viewer detection

```ts
function canHear(viewer, source) {
  const ambient = SoundApi.soundAt(viewer.location);
  const sourceContribution = sourceLoudnessAt(source, viewer.location);
  // Frequency check — outside species range, not perceived
  if (!speciesHearsBand(viewer, sourceContribution.dominantBand)) return false;
  // Threshold check — quieter than viewer's threshold
  if (sourceContribution.amplitude.value < loudnessThreshold(viewer).value) return false;
  // Masking check — buried by louder ambient
  const masking = ambient.amplitude.value - sourceContribution.amplitude.value;
  if (masking > MASKING_THRESHOLD) return false;
  return true;
}
```

The masking check is real acoustics — a 30dB whisper in a 60dB
forge room isn't perceived. Falls out of the additive model.

### Localization (direction)

The propagation walk records which Conduit each source last
crossed to reach the listener. The viewer's MML rendering
includes that direction:

```
"You hear footsteps to the east."
"There is a steady humming from the north."
```

Multiple paths at similar levels render as ambiguous:
*"from somewhere northeast."*

---

## Layer 5 — Pedagogical seam

Sound's pedagogical surface is unusually rich because acoustics
shows up in physics, biology, and engineering curricula. Each
seam is a real curriculum touchpoint that falls out of
physics-honest implementation.

The full pattern (real units, friendly tags, instruments-reveal)
lives in [docs/subsystems/quantities.md](../subsystems/quantities.md). What
sound contributes:

### Seam 1 — Decibels as a logarithmic scale

Real dB SPL underneath. Logarithmic addition exposed when
combinable. The `analyze sound` verb shows the math (see below).

### Seam 2 — Frequency ranges per species

Real Hz ranges, sourced from biology references, attached to
each `Species` template's new `hearingProfile`:

| Species | Hearing range |
|---|---|
| Homo sapiens | 20–20,000 Hz |
| Homo khazadicus | 16–16,000 Hz (low-shifted; matches scotopic vision pattern) |
| Canis familiaris | 67–45,000 Hz |
| Felis catus | 55–79,000 Hz |
| Chiroptera | 1,000–110,000 Hz |
| Loxodonta | 16–12,000 Hz (low-shifted; perceives infrasound) |
| Lithobates catesbeianus | 100–2,000 Hz |
| Mus musculus | 1,000–90,000 Hz |
| Constructa metallica (tutor-bot) | 20–22,000 Hz |
| Spathiphyllum wallisii | none (no Sensor) |

Frequencies outside a species' range are simply not perceived. A
dog hears a high-pitched whistle a human in the same room
doesn't.

This connects directly to **biology coursework** on sensory
systems and species adaptation.

### Seam 3 — Acoustic impedance from materials

Already covered in Layer 3. Material's acoustic properties drive
Conduit transmissivity; students with physics knowledge can
predict; authors with no physics knowledge use friendly defaults.

### Seam 4 — Reverberation per location

```ts
location.reverbTime: Quantity<seconds>;   // RT60
```

| Space archetype | RT60 |
|---|---|
| Anechoic chamber | <0.1s |
| Bedroom (carpeted) | 0.4s |
| Living room | 0.6s |
| Lecture hall | 1.2s |
| Cathedral | 6–10s |
| Large cave | 5–15s |

Authors pick an archetype; the value comes pre-set. Pedagogy:
real numbers, real consequences. MML rendering includes echo
characterization for high-reverb spaces ("your footsteps echo
for several seconds").

A music-production / acoustic-engineering student recognizes the
metric.

### Seam 5 — The Doppler effect (deferred to v2)

When v2 brings frequency content + activity-driven motion
vectors, the Doppler shift falls out of correct math:

```
f_observed = f_source × (c + v_observer) / (c + v_source)
```

Iconic physics demonstration; deferred to v2 because frequency
content + motion vectors aren't in v1.

### Seam 6 — Scientific instruments as in-world Stuff

Stuff in the game world that, when used, expose the engine's
internal numbers:

| Instrument | Verb | Reveals |
|---|---|---|
| `SoundLevelMeter` | `measure sound here` | Aggregate amplitude in dB SPL |
| `SpectrumAnalyzer` | `measure spectrum here` | Dominant band, contribution per band |
| `Stethoscope` | `listen-with stethoscope to X` | Quiet body sounds, otherwise sub-threshold |
| `TuningFork` | `strike tuning-fork` | Emits a precise frequency for resonance / tuning demonstration |
| `Sonar` | `ping sonar` | Emits a sound, measures reflection time, reports distance |

Same data the engine uses internally; rendering chooses
instrument-output style.

This is the second-order pedagogical win: students do science
in-game with the same tools they'd use in a lab. Connects to
chemistry (lab equipment), biology (auscultation), engineering
(acoustic measurement), physics (wave properties).

### Seam 7 — Hearing damage and noise dose (v2-ish)

Real noise-induced hearing loss (NIHL) follows dose-response.
OSHA limits: 85dB for 8 hours, 90dB for 4 hours, etc.

```
actor.cumulativeNoiseDose: Quantity<dB·hours>
```

High-amplitude exposure increments; over-threshold accumulation
reduces species hearing range temporarily (or permanently for
severe doses).

Connects to **occupational safety, audiology, public health**
curricula — and gives players a concrete reason to care about
ear protection items (which is good gameplay AND good
education). Defer to a later wave; design slot reserved.

---

## The `analyze` pattern

A verb (or family) that exposes the engine's internal numbers in
pedagogical form. Same code path, different rendering than
casual prose.

Sample output:

```
> analyze sound here

Sources audible at your location:

  fountain (10ft west)
    Source:        30 dB SPL @ 100–800 Hz (water-trickling)
    At your pos:   28 dB (1 dB attenuation through open door)

  refrigerator-compressor (in next room)
    Source:        38 dB SPL @ 80–200 Hz (compressor-hum)
    Path:          through wooden door (transmissivity 0.4)
    At your pos:   30 dB

Aggregate:         32.1 dB SPL (logarithmic sum)
Dominant band:     80–800 Hz
Reverberation:     0.6s (living room)
Your threshold:    0 dB (Homo sapiens, age 22)
Detected:          both sources audible
```

The same engine; different rendering paths. Casual players see
prose ("you hear water trickling and a faint hum"); students get
the physics.

`analyze` is also a developer debug tool — same surface, two
audiences. Cheap to implement, high pedagogical surface.

---

## Worked scenarios

### Scenario A — sneaker past a sleeping guard

- Sneaker engages `walk` Activity with mode `sneak`.
  `mode.noiseLevel: silent` → emitted Sound has amplitude 0.
- Activity emits no `SoundEvent` (`null` emission). Adjacent
  room's sleeping guard NPC's Sensor receives no notification.
- Guard's behavior layer doesn't fire wake-on-sound.
- Activity completion: traversal moves sneaker into corridor.
  Same.
- Guard sleeps undisturbed.

Falls out of the existing locomotion-subsystem `noiseLevel`
scalar; no new design.

### Scenario B — runner past a fountain room

- Fountain `AmbientSoundEmitter`,
  `_emittedSound: { amplitude: 30 dB, dominantBand: 100–800 Hz,
  character: 'water-trickling' }`.
- Runner enters room A (Activity emits at `noiseLevel: loud`,
  ~75 dB).
- Listeners in room A perceive both: fountain (close, 30 dB) and
  footsteps (close, 75 dB). Aggregate ~75 dB; fountain is
  masked.
- Runner traverses east. `MotionEvent + SoundEvent`:
  "footsteps moving east" to room A; "footsteps arriving from
  west" to room B.
- Listener in room A: footsteps fade; fountain audible again.
- Listener in room B: hears approaching footsteps + room B's
  ambient.
- Listener in room C (across hall, glass wall): fountain
  attenuated through window (×0.3) → 30 dB × 0.3 ≈ 21 dB at
  conduit; below most species thresholds.

### Scenario C — Romeo and Juliet through a closed window

- Juliet outside. Yells at high amplitude.
- Boundary between balcony and Romeo's chamber is a `Window`
  with `transmissivity[sound] = 0.4`.
- 80 dB → ~32 dB by the time it reaches Romeo's room.
- Romeo's `hearingProfile` threshold is 0 dB → he hears it.
- MML rendered: *"You hear Juliet calling, faintly: 'Romeo, oh
  Romeo!'"* — "faintly" comes from the attenuation.

### Scenario D — masking

- Forge in room A emits 60 dB of clanging.
- Whispered conversation (instant `whisper` verb, 25 dB) happens
  in room A.
- Masking: 25 dB source vs 60 dB ambient → masked. Listener
  doesn't perceive whispers.
- Same conversation in room B (no forge): perceived.

The additive logarithmic-amplitude model handles this naturally.

### Scenario E — biology student plays a dog

- Dog character (Canis familiaris). `hearingProfile: 67–45,000
  Hz`.
- Hidden device emits ultrasonic pulse at 25,000 Hz, 50 dB.
- Human characters in the room: their `hearingProfile: 20–20,000
  Hz` excludes 25,000 Hz. Not perceived.
- Dog character: in range. MML: *"You hear a high-pitched
  pulsing whine humans likely cannot detect."*

The student playing the dog literally has different perception.
Curriculum win.

---

## What this stresses for existing slates

### Light subsystem

Conduits gain `transmissivity: Record<ChannelKind, number>`,
replacing channel-specific `lightTransmission`. Backward-
compatible if old field kept as a derived view.

Probably the moment to commit to channel-keyed transmissivity
even before SoundApi ships, so the light substrate is doing it
idiomatically when sound arrives.

### Boundary substrate

Same — Conduits become channel-aware. The `Adornable` /
`Adornment` / `Boundary` interfaces don't change; just Conduit.

### Locomotion slate

`mode.noiseLevel` becomes the source data for activity-driven
sound emission. Already designed; sound consumes it. The
mode-table stays as drafted.

Passthrough modes (`ride`, `drive`) resolve to host's emission —
already specified in "Conveyance ripple."

### Activity slate

Activity hooks gain emission responsibilities:

- `onStart` (implicit in registration) — emit `SoundEvent` if
  the activity has emission.
- `onTick` — periodic `SoundEvent`s for sustained-emission
  activities.
- `onComplete` / `onAbort` — emit "stop" `SoundEvent`s.

This is additive to the activity slate; doesn't change its core
shape. The `Activity` interface gains `emittedSound` and
`emissionScheduleHz` fields.

### Race subsystem

`Species` template gets a `hearingProfile` field. Single-band
v1 (low/high cutoff in Hz, plus a sensitivity scalar);
structure for full Fletcher-Munson curves later. The race.md
doc updates to mention it; same shape as existing
`visionProfile`.

### Perception subsystem

`PerceptionApi` extends to cover `canHear` / `perceivedSound`,
parallel to `canSee`. The viewer-aware-query pattern from
perception.md is the same machinery.

### Material substrate

Materials gain optional `acousticImpedance`. Used by Conduit's
material-derived transmissivity helper. Most existing material
templates can defer authoring this until a content case asks
for it.

---

## Open questions

1. **Scalar amplitude or spectrum?** Lean scalar v1; add
   frequency bands when content needs (animal communication,
   music, dog whistles).
2. **Wall propagation in v1?** Lean strict (silent walls);
   authors place "thin wall" Adornments for the leaking case.
3. **Channel-keyed Conduit transmissivity now, or parallel
   `soundTransmissivity` field?** Lean refactor now; clean shape
   for channel #3 (heat or scent).
4. **`SoundEvent` vs unified `MotionEvent`?** Lean separate;
   sound emission isn't always motion. May share infrastructure
   via a base `PerceptibleEvent`.
5. **Approach detection** (multi-event integration: "footsteps
   approaching, getting louder")? Defer to v2.
6. **Listener thresholds — fixed scalar per species or
   contextual?** Fixed v1; real-world adaptation in v2.
7. **NPC reaction to detected sound — whose responsibility?**
   Sensor records; behavior layer (deferred) decides whether to
   react. v1 Sensor just records.
8. **Same-room same-tick emission ordering** — separate events
   or aggregated? Lean separate; renderer aggregates if it cares.
9. **Default unit display — SPL or friendly tags?** Friendly tags
   by default; players opt into instrument readings via verb. A
   `pedagogicalSeam` setting could surface units globally for
   student-mode players. (See [docs/subsystems/quantities.md](../subsystems/quantities.md).)
10. **Acoustic impedance from material — automatic or opt-in?**
    Lean opt-in; helper for explicit derivation, no surprise
    runtime errors when material lacks acoustic data.
11. **Hearing-damage curve fidelity** — full OSHA dose-response
    or simpler approximation? Simpler v1; granular if/when
    audiology curriculum content arrives.
12. **Echolocation as a verb / capability** for bats? Pedagogical
    biology curriculum win. Defer; flag for future.
13. **Sound has direction; light doesn't (in v1).** If sound
    localizes and light doesn't, they diverge in API surface.
    Probably fine; sound localization is more important to
    gameplay than light directionality.
14. **The Sonar instrument's reflection model** — full ray
    tracing, or a simple "distance to nearest non-traversable
    boundary"? Lean simple; the pedagogical seam is the timing
    arithmetic, not the geometry.

---

## Build order

User intent: ship all three waves out of the gate. Ordered for
review:

**Wave 1** — substrate refactor (small).

- Conduit gains `transmissivity: Record<ChannelKind, number>`.
- Light migrates from `lightTransmission` to `transmissivity['light']`.
- Helper `MaterialApi.derivedTransmissivity(material, thickness, channel)`.
- `Quantity<T>` shape lands (see subsystems/quantities.md).

**Wave 2** — `SoundApi` parallel to `LightApi`.

- `Sound` value object.
- `SoundApi.soundAt(loc)` propagation walk.
- `SoundApi.canHear` / `perceivedSound` / `directionOf`.
- `Species.hearingProfile` field on the v1 species roster.

**Wave 3** — sources + integration.

- `AmbientSoundEmitter` mixin + first content (a fountain, a
  forge, a clock).
- `SoundEvent` event type + propagation.
- Activity emission hooks + first activity-driven content
  (footsteps, hammering).
- `analyze sound` verb + `SoundLevelMeter` instrument.
- `Location.reverbTime` field + first archetypes.

**Adjacent / future**:

- `SpectrumAnalyzer`, `Stethoscope`, `TuningFork`, `Sonar`
  instruments as content asks.
- Hearing damage / noise dose subsystem.
- Doppler effect (requires v2 frequency content + motion
  vectors).
- `PhysicsChannel` substrate generalization (when channel #3
  arrives).

---

## What this slate does NOT cover

- **Non-acoustic sensory channels** (smell, taste, tactile —
  see adjoining-systems.md).
- **Heat as a physics channel.** Probably the third channel; its
  arrival forces the `PhysicsChannel` generalization.
- **Music systems** — composition, instruments-as-instruments-
  for-music vs sensory. Deferred; if Saxonberg ever wants
  "playable music," that's its own design.
- **Combat-specific acoustics** (the sound of a sword hit,
  damage from sonic weapons). Combat-slate territory.
- **Ambient-noise authoring tooling.** A future authoring UI
  for filling in reverbTime, ambient sources etc. across many
  rooms; not framework, content tooling.
- **Fully realistic frequency-selective propagation.** v2 if
  ever. v1 doesn't model frequency-dependent attenuation
  through Conduits — every frequency gets the same
  transmissivity scalar.

---

## Once shaped into formal requirements

- The `Sound` value object + `Quantity<T>` integration.
- `AmbientSoundEmitter` mixin spec.
- `SoundEvent` event type spec.
- Conduit's `transmissivity` field shape.
- `SoundApi` surface (full method list).
- `Species.hearingProfile` field shape + v1 species roster
  values.
- The first wave of instruments + the `analyze sound` verb +
  wiring.
- Tag-to-canonical-unit mappings for amplitude, frequency,
  reverberation.
- Tests gating: a single source's amplitude attenuates
  correctly through a Conduit; logarithmic addition matches the
  math; species frequency-band gating works; masking works;
  localization reports the correct direction.

The hearing-damage / Doppler / multi-band roadmap items wait
for their own waves with their own slates.
