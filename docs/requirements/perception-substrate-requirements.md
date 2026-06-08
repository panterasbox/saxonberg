# Perception substrate — requirements

The senses build's authoring surface shipped in 2026-06 (per-sense
`Detail` slot maps, `<sense channel="X">` MML wrappers,
`senseStripAugmenter`, the four single-sense verbs, the gestalt `sense`
verb, perception topic vocabulary). This build delivers the **physics
half**: a unified `PerceptionApi` + `Modality` substrate that
vision, smell, sound, touch, and ESP all instantiate as modality
singletons; new propagation walks for smell and sound mirroring
vision's shape through containment + Boundary conduits + exits;
ambient + contact thermoreception for touch via the existing biome
chain; the formal organ-gates-modality rule via `PerceptionApi.sensorium`
walking BodyPlan organs *and* installed augments; the hybrid
(local-field + network-routing) ESP model recognized as the substrate's
reserved shape, with ESP organs arriving via **augmentation Wave 1**
(the baseline comm implant); and per-frame modality attribution wired
through `MessageFrame.meta` to gate reception at `SensorMixin.filterMessage`.
`LightApi` dissolves into the new substrate as the vision modality's
implementation. Bare `smell` / `listen` / `feel` verbs upgrade from
authoring-only contact reads to true field reads via
`PerceptionApi.signalAt`.

Seeded by [docs/slates/senses-slate.md](../slates/senses-slate.md);
absorbs the deep acoustic spec from the retired
[docs/slates/sound-slate.md](../slates/sound-slate.md) for the hearing
instance; pulls in Wave 1 of
[docs/slates/augmentation-slate.md](../slates/augmentation-slate.md)
(the implantable affordance + baseline implant) to make ESP organs
substrate-honest. Wires the modality-level reception filtering
ratified in
[docs/subsystems/perception.md](../subsystems/perception.md) ("the
frame's metadata names the modality; modality-level filtering lives
[in `filterMessage`]") — the pattern has been documented but not
implemented.

---

## Goals

1. **One Api, modality singletons (LocomotionMode pattern).** A single
   `PerceptionApi` plus a `Modality` base class extending
   `SingletonMixin(PropertiedMixin(Idea))` — exactly the
   [`LocomotionMode`](../subsystems/locomotion.md) shape. Vision,
   smell, sound, touch, taste, verbal-ESP, emotive-ESP are concrete
   `Modality` subclasses, each with its own seed YAML at
   `seeds/lib/perception/modalities/<name>.yaml`. Consumers resolve
   singletons via `StuffApi.findByTemplatePath` (a thin lookup
   helper is fine). Adding a new sense = a new subclass + seed
   YAML; no new Api class. **No per-sense Apis** (no `SmellApi`,
   no `SoundApi`, no `TouchApi`).

2. **`LightApi` retired.** The propagation walk relocates from
   `api/light.ts` into `lib/perception/modalities/VisionModality.ts` as
   the modality's `signalAt`. `MeasureLightController` and
   `AnalyzeLightController` update to read via
   `PerceptionApi.signalAt(loc, VisionModality)`. The vision-specific
   value types (`Light`, `LightBand`, `AmbientLitMixin`,
   `LightSourceMixin`, `LightConduit`) stay where they live —
   they're the modality's domain, not Api-shaped.

3. **Smell propagates with honest field physics.**
   - `Smell` value object: `concentration: Quantity<'ppm'>` + odor
     identity string + capped source attribution list.
   - `SmellSourceMixin` for Stuff emitters (concentration + identity
     + Witness hook on change).
   - `SmellModality.signalAt` — propagation walk parallel to vision's:
     contents-side emitters + fixture-side emitters + cross-Boundary
     via new `SmellConduit` interface + cross-exit at a base
     transmission. Depth-capped, cycle-guarded, atmosphere-aware
     (vacuum blocks via `BiomeApi.densityOf`).
   - `Species.olfactoryProfile.acuity` (already shipped) drives
     per-viewer threshold.
   - `SmellConduit` interface on Boundary; Door + Window implement
     (gated on `isOpen()` / `Sealable.isOpen` respectively).

4. **Sound propagates with parallel field physics.**
   - `Sound` value object: `amplitude: Quantity<'dB'>` + dominant
     frequency band `{ low: Quantity<'Hz'>, high: Quantity<'Hz'> }` +
     `character: string` + capped source attribution.
   - `SoundSourceMixin` for Stuff emitters (active sound sources).
   - Ambient sound on `Biome`: new
     `_defaultAmbientSoundLevel: Quantity<'dB'> | null` field, parallel
     to existing `_defaultTemperature` etc. The biome chain resolves
     ambient SPL per scope.
   - `SoundModality.signalAt` — propagation walk parallel to smell's.
     Depth-capped, cycle-guarded, atmosphere-aware (vacuum blocks
     sound).
   - `SoundConduit` interface on Boundary (graduates from the
     `reserved` placeholder in the Boundary substrate); Door +
     Window implement.
   - `SoundLevelMeter` instrument template + `measure sound`
     sub-verb (parallel to the biome instrument roster). The whistle
     content design is the load-bearing v1 consumer of sound
     propagation.

5. **Touch has real field physics — ambient + contact.**
   - `TouchModality.signalAt(loc)` reads ambient temperature via
     `BiomeApi.resolveTemperatureFor(loc)`. Returns a `Touch` value
     object (`temperature: Quantity<'K'>` + `band: TouchBand`).
   - Bare `feel` adds an ambient-temperature band line above the
     existing per-Detail touch read.
   - Targeted `feel <target>` reads target temperature via the
     existing per-Detail temperature override chain
     (`AtmosphericMixin._detailTemperatures`). No new mixin needed.
   - Coarse `TouchBand` union: `'cold' | 'cool' | 'comfortable' |
     'warm' | 'hot' | 'scalding'`. Threshold table calibrated against
     the universe-baseline 295 K (≈ comfortable).
   - **Vitals burn damage (touching a scalding surface) is explicit
     non-goal** — needs vitals substrate.

6. **ESP framing locks in as hybrid; ESP modalities arrive via
   augmentation, not native biology.**
   - `VerbalESPModality` + `EmotiveESPModality` singletons declared,
     `family: 'field'` (the underlying physics is field-based; the
     network-routing layer is a layer on top, not a separate family).
   - **ESP organs are NOT declared on BodyPlan for any v1 species.**
     Homo sapiens, Homo khazadicus, Constructa metallica, bullfrog,
     and peace lily all have no native ESP modalities. ESP arrives
     through the baseline comm implant (see goal 7). The
     fantasy/alien-species path stays reserved — a future telepath
     species (a magical empath, an alien with biological aether
     receivers) can declare an ESP modality on its BodyPlan via the
     same `sensoryPorts` mechanism as physical organs; the substrate
     accepts it. No v1 species exercises that path.
   - `PerceptionApi.sensorium(viewer)` returns ESP modalities for
     viewers with the implant installed (via the augment-contribution
     walk in goal 7).
   - `AetherMixin.dm` behavior unchanged — provides the `dm()`
     implementation (renamed from `tell()` per the rebrand decision
     below). The `dm` verb (with `tell` as alias) gates on the
     augment-contributed ESP modality via a new `requiresVerbalESP`
     validator. `AetherMixin` stays composed on Avatar in v1
     (transitional); eventually moves to the implant Stuff as a
     contribute-verb capability when augmentation matures (Wave 2+
     refactor).
   - The hybrid model is documented in the senses subsystem doc as
     the substrate's reserved shape; the field-half (aether
     propagation, `AetherConduit` on Boundary, eavesdropping,
     encryption stripping) is reserved for a future ESP-physics build.
   - `VerbalESPModality.signalAt` / `EmotiveESPModality.signalAt`
     return `null` in v1 (no field signal). Documented as the
     reserved seam.

7. **Augmentation Wave 1 — the augment-confers-mixin substrate +
   the baseline implant.** Pulled in from
   [augmentation-slate.md](../slates/augmentation-slate.md) Wave 1
   because ESP organs need a substrate home and the slate explicitly
   names the baseline implant as "the do-now load-bearing piece."
   The substrate makes augments and mixins parallel: mixin
   composition is build-time semantics (the entity *has* this
   capability); augment installation is runtime semantics (the
   capability is *active*).
   - **Mixins self-declare what they grant.** Each mixin may
     declare any of a small set of `_grantsX` static fields
     alongside its existing `_mixinName` marker. v1 reads only
     `_grantsModalities: readonly string[]`; the framework is
     shaped to accommodate `_grantsLanguages`,
     `_grantsAttributeMasks`, `_grantsVitalFunctions`,
     `_grantsSlots`, etc., when their consumer subsystems land.
     Per the colocate-mixin-interface rule — the mixin owns its
     grants.
   - **Mixins that require augment-conferral declare
     `_augmentGated: true`.** Native composition alone does not
     activate them; they need an installed augment that confers
     them. v1 sets this on `AetherMixin`. Most mixins (Named,
     Container, Visible, Mobile, etc.) are NOT augment-gated and
     work identically to today.
   - **`AugmentMixin`** — composed by augment Stuff.
     `confers(): readonly string[]` returns the list of mixin
     names the augment activates when installed. v1 doesn't add
     other declarations; this single method is the augment-side
     surface.
   - **`MixinApi.getActiveMixins(stuff)` + `MixinApi.isActive(stuff,
     mixinName)`** — new uniform substrate query. Active set =
     mixins composed natively (existing `hasMixin` walk) ∪ mixins
     conferred by installed augments. For un-gated mixins, native
     composition is sufficient; for `_augmentGated` mixins, an
     augment must confer them.
   - **`MixinApi.isFoo` predicates check ACTIVE state, uniformly.**
     `isContainer(x)` / `isVisible(x)` / `isAether(x)` all answer
     "is this mixin currently active on x." For un-gated mixins,
     this is the existing build-time check. For augment-gated
     mixins, the predicate returns false when the conferring
     augment is absent — type narrowing reflects runtime reality.
     **No bifurcated calling convention**; callers see one
     predicate kind across all mixins.
   - **`@RequiresActive('<MixinName>')` decorator** on the methods
     of augment-gated mixins. Lives in `lib/security/` alongside
     `@CallSecurity` / `@Final` / `@Unshadowable`. At call time
     checks `MixinApi.isActive(this, mixinName)`; throws
     `InactiveCapabilityError` if false. Closes the direct-call
     gap (any code path that bypasses the verb-level validator
     still hits this gate). v1 applies the decorator to
     `AetherMixin.dm()`.
   - **Cranial slot on body plans.** `BodyPlan.slots` (the unified
     `SlotSpec` universe) gains an `'implant'` slot kind. v1 ships
     one slot — `cranial` — on `biped` and `quadruped`; `sessile`
     gets none (plants don't get implants). The implant slot
     accepts `SlottableMixin` occupants, same as other body-side
     slots.
   - **`BaselineCommImplant` Thing template.** Composes
     `SlottableMixin` (targets the cranial slot) + `TangibleMixin`
     (small cybernetic object) + `AugmentMixin` with
     `confers() = ['AetherMixin']`. Hardened (per slate); no power
     state or failure modes in v1.
   - **`AetherMixin`** in v1: `_augmentGated = true`,
     `_grantsModalities = ['verbal-esp', 'emotive-esp']`, methods
     wrapped with `@RequiresActive('AetherMixin')`. Composed
     natively on Avatar (so methods + state exist), but inert
     unless an augment confers it. Mixin definition unchanged
     otherwise.
   - **Avatar bootstrap.** `Avatar.enter` checks the cranial slot;
     if no baseline implant is present, clones
     `BaselineCommImplant` and installs via the existing
     slot-occupy mechanism. Idempotent. Char-gen takes over
     installation ceremony when that slate ships; v1 just defaults
     the implant in for every Avatar diegetically.
   - **`PerceptionApi.sensorium(viewer)`** walks the active mixin
     set (via `MixinApi.getActiveMixins`) and collects each
     mixin's `_grantsModalities`, plus the viewer's BodyPlan
     organs. Augments contribute modalities indirectly through
     the mixins they confer — the augment doesn't enumerate
     modalities itself.
   - **New verb-level validators** — `requiresVerbalESP`,
     `requiresEmotiveESP` — in `lib/command/validators/`. Gate the
     verb via `PerceptionApi.canPerceive(giver, modality)`. Match
     the existing `requiresAnimate` / `requiresSmell` validator
     shape. `dm` (with `tell` as alias) adopts `requiresVerbalESP`.
     Future emote verbs adopt `requiresEmotiveESP`. The validator
     is the polite-refusal early-catch; the method-level
     `@RequiresActive` decorator is the late-catch backstop.
   - **No install/remove medical procedure, no other augments, no
     char-gen loadout, no failure modes, no other `_grantsX` field
     consumers** — all explicit non-goals deferred to augmentation
     Wave 2+.

8. **Per-frame modality attribution + reception-side gating.**
   Implements the modality-level filtering ratified in
   [perception.md](../subsystems/perception.md#the-viewer-type--two-orthogonal-axes)
   ("the frame's metadata names the modality; modality-level filtering
   lives [in `filterMessage`]"). The pattern has been written down
   for a while but never wired up. This build wires it.
   - `MessageFrame.meta.modality?: string` added to `@saxonberg/types`.
     Optional — system / log / narrative frames don't set it
     (deliver unconditionally).
   - `Scene` builder gains a `.modality(name)` setter. Producers
     populate it at compose time:
     - `VocalMixin.say` → `'hearing'`
     - `AetherMixin.dm` → `'verbal-esp'` (verb `dm`, alias `tell`)
     - Future `SoulMixin` emotes → `'emotive-esp'`
     - Multi-modality events (door slam = sight + sound) stay
       authored as separate `Scene.send` calls per modality — matches
       the existing "events single-modality per frame" authoring
       discipline in [senses.md](../subsystems/senses.md).
   - `SensorMixin.filterMessage` gains a modality check: drops the
     frame (returns null) if `meta.modality` is set AND
     `PerceptionApi.canPerceive(self, modalityByName)` is false.
   - **Actor self-frames bypass the check** — frames tagged
     `audience:actor` always deliver to the actor regardless of the
     recipient's sensorium. (You always perceive your own acts
     diegetically — the actor-narrates-own-act principle.)
   - **Symmetric across all modalities** — a deaf-by-BodyPlan player
     no longer receives `say` frames in full; an implant-less player
     doesn't receive `dm` frames. Closes a gap in the existing
     senses build's treatment of physical modalities, not just ESP.
   - Senses subsystem doc updates: modality attribution now lives in
     **both** places — per-frame `meta.modality` for whole-frame
     reception gating; per-region `<sense channel="X">` body MML
     for partial filtering within multi-modality frames. The two
     work together: the augmenter strips regions for a viewer
     within a frame they ARE allowed to receive; `filterMessage`
     drops the whole frame entirely if the viewer can't perceive
     its modality.

9. **Organ-gates-modality is the formal rule, widened via the
   active-mixin walk.**
   - `PerceptionApi.sensorium(viewer)` walks (a) the viewer's
     BodyPlan organs via `BodyPlan.sensoryPorts`, AND (b)
     `MixinApi.getActiveMixins(viewer)` collecting each active
     mixin's `_grantsModalities`. Returns the union, deduped.
   - `SpeciesApi.deriveSensorium` retires; callers move to
     `PerceptionApi.sensorium`.
   - `BodyPlan.sensoryPorts.modality` stays at the 5 physical
     channel literals (`SenseChannel` union). ESP modalities are
     reserved (the substrate accepts them when a future telepath
     species declares one), but no v1 species uses them. ESP
     enters the sensorium via augment-conferred AetherMixin's
     `_grantsModalities`.

10. **Simple ambient-level masking — sound + smell.**
   - A viewer's effective perception threshold on a modality is
     `max(viewer_threshold, ambient_signal_strength_on_modality)`.
   - For sound: ambient comes from the biome's
     `_defaultAmbientSoundLevel` resolved at the viewer's scope.
   - For smell: ambient comes from the room's own smell signal (the
     room scope's total odor concentration from non-target sources).
   - Per-frequency-band masking and per-odor-class masking are NOT
     in scope.

11. **Bare verb upgrades.**
    - Bare `smell` reads room-scope via
      `PerceptionApi.signalAt(loc, SmellModality)`, applies the
      viewer's threshold, renders the perceived odors with source
      attribution. Targeted `smell <target>` keeps current per-Detail
      `smell` slot read.
    - Bare `listen` — same shape with `SoundModality`. Targeted
      `listen <target>` keeps current per-Detail `hearing` slot read.
    - Bare `feel` — current per-Detail `touch` read PLUS an
      ambient-temperature line. Targeted `feel <target>` adds target
      temperature read.
    - Bare `look` unchanged (vision's pipeline is the relocated
      LightApi walk; the verb's behavior is preserved).
    - Bare `taste` — unchanged. Taste stays contact-only this build.

12. **`PerceptionApi.canPerceive(viewer, modality)`** — the
    "do you have the organ (innate or augmented)" check, used by
    validators and any consumer that needs the predicate without a
    full `perceiveAt` call. Internally just `sensorium(viewer).some(c
    => c === modality)`.

---

## Non-goals

Each item below has an explicit reason — none are arbitrary deferrals.

- **Smell trails / temporal persistence** — Wave 3. No tracker NPC or
  other persistent-residue consumer in current content.
- **Active-sense pattern (echolocation, electroreception,
  pit-sensing)** — Wave 3. No bat-like or sonar-instrument content
  consumer. The interface taxonomy (an `ActiveModality` sub-pattern)
  lands when a consumer earns it.
- **`tactileProfile` / `hearingProfile` / `gustatoryProfile`** — land
  per content demand. All v1 species use default thresholds; the
  customization knobs aren't customized by anything.
- **Vitals integration** (burn damage on scalding contact;
  organ-condition modulation) — vitals substrate doesn't exist.
  Slate identifies as Wave 2.
- **ESP local-field propagation walk** — `AetherConduit` on Boundary,
  aether medium on Biome, range / attenuation, eavesdropping in
  range (the "you feel ESP activity nearby" mechanic), the
  encryption-stripping body substitution for non-addressee dms —
  all reserved for a future ESP-physics build. The hybrid framing
  documents the shape; the build defers the implementation. Dms
  in v1 deliver only to the addressee (existing `AetherMixin.dm`
  behavior), gated by `requiresVerbalESP` at the giver and
  modality-attribution at the recipient — no eavesdropper-in-range
  delivery.
- **Per-modality rendering formatter hook** — no concrete formatters
  ship. The interface slot is bloat without consumers; add when
  per-modality idiom (smell-emphasizes-identity, echolocation
  spatial-only) becomes real content authoring.
- **`AetherMixin` rename** — held by user pending worldbuilding
  conversation. Mechanical rename pass anytime; not load-bearing for
  this build.
- **Sound RT60 / reverberation** — complex acoustic modeling, not
  load-bearing for the whistle or any current content.
- **NPC tracking AI** (dog follows scent gradient) — content layer,
  needs NPC behavior slate.
- **Sensorium-relative stealth, hiding skill, camouflage** —
  substrate naturally supports invisibility-by-no-signal; active
  concealment is content / game-design.
- **Augmentation Wave 2+** — install/remove as a medical
  procedure (vitals tie), other augments (translation,
  prosthetics, sensor packages, motor / cognitive augments),
  char-gen loadout selection, failure modes / power state /
  jamming / hacking / spoofing, magic-flavor augments, the
  generalized "contribute capability" surface beyond
  `Modality` (verbs, motor, vital functions). All
  reserved per the augmentation slate's Wave 2+ framing.
- **Network-layer modeling as a first-class engine concept** —
  `AetherMixin.dm` (the renamed `tell`) is the routing layer today; that's enough.
  Formal modeling when routing complexity earns it (chat modalities,
  broadcast networks).
- **Taste compound chemistry (Scoville, pH, salinity, sweetness
  index, glutamate / molar concentration).** Taste stays
  contact-only this build — the bare verb reads per-Detail `taste`
  slot prose; authors write "fiery, sharp at the back of the
  tongue" rather than "70,000 SHU." Real-chemistry tag tables for
  taste land when content forces it (a gustatory profile per
  species + an ingestible chemistry tie-in via the deferred diet
  / edible system).
- **Chemesthesis / trigeminal sense** ("spicy", "cool-mint",
  carbonation tingle). In real anatomy, capsaicin doesn't trigger
  taste receptors at all — it triggers TRPV1 heat-sensing
  receptors on the tongue (same family as touch thermoreception);
  menthol triggers TRPM8 cold-sensing. So Scoville is technically
  a touch/temperature scale applied via chemical trigger, not a
  taste scale. For v1, fold into either touch (prose: "burning
  hot on your tongue") or taste (prose: "sharp, fiery") as
  authoring permits. A dedicated chemesthesis modality lands when
  content earns it.
- **Pheromones** as a smell sub-domain (alarm, mating, territory).
  For v1, treat as ordinary smells with appropriate identity
  strings (`"alarm-pheromone"`). Could become its own modality
  family later if NPC-behavior content depends on it.
- **Vibration sensing** (mechanoreception bridging touch and
  low-frequency hearing — what snakes, spiders, and fish use).
  Not in scope; its own modality or touch sub-modality when
  content demands.
- **Pain / nociception** as a touch sub-modality — needs vitals
  for damage scoring; deferred per the vitals slate.
- **Proprioception / vestibular / interoception** (knowing where
  your body is, balance, internal organ state). These are
  internal senses, not externally perceived; they likely never
  become perception modalities — more naturally state on
  vitals/character.
- **More alien physical modalities beyond what's in scope** —
  electroreception, magnetoreception, pit-sensing land per content
  demand. The substrate accommodates them via authored BodyPlan
  organs + new modality singletons.
- **Generic propagation walker** — a parameterized walker that
  vision, smell, sound all share. Each modality writes its own walk
  in v1; consolidate when a fourth field modality earns the
  parameterization. Per the "stop adding abstraction" feedback rule.
- **Convergence of `Light` value object onto a shared `Signal`
  base** — `Light`, `Smell`, `Sound`, `Touch` are independent value
  types in v1. Shared structure surfaces in shape, not in a base
  class.

---

## Surface decisions

The agreed answers to the slate's open questions, with the
load-bearing reasoning preserved.

### One Api + modalities as templated Idea singletons

**Decision:** `PerceptionApi` is the single dispatch surface.
`Modality` is a **base class** following the
[`LocomotionMode`](../subsystems/locomotion.md) precedent — a
templated `Idea` singleton hierarchy. Each modality is a concrete
subclass with its own seed YAML; subclasses override default
behavior. No `SmellApi`, no `SoundApi`, no `TouchApi`. Even
`LightApi` retires (see next decision).

```ts
// lib/perception/Modality.ts
export class Modality
  extends SingletonMixin(PropertiedMixin(Idea))
{
  // Persistent fields (data loaded from seed):
  //   name: string                          ('vision', 'smell', 'verbal-esp', …)
  //   family: 'field' | 'contact' | 'network'
  //   modality: string                       (BodyPlan organ key)

  // Default behavior — contact/network modalities keep these as-is.
  signalAt(_loc: Stuff & Container): Signal | null { return null; }
  perceiveFor(_viewer: Stuff & Sensor, _signal: Signal): Percept | null {
    return null;
  }
}
```

```ts
// lib/perception/modalities/VisionModality.ts
export class VisionModality extends Modality {
  override signalAt(loc: Stuff & Container): Light | null {
    // the propagation walk relocated from api/light.ts
  }
  override perceiveFor(viewer, signal): VisionPercept | null {
    // viewer's vision profile, band threshold, shadow seam, etc.
  }
}
```

```yaml
# seeds/lib/perception/modalities/vision.yaml
class: '/lib/perception/modalities/VisionModality'
hydratorClass: '/lib/persistence/PersistentHydrator'
data:
  name: 'vision'
  family: 'field'
  modality: 'vision'
```

Repeated for the seven modalities. The family value is data, not a
class hierarchy — no intermediate `FieldModality` subclass. Contact
and network modalities just don't override the default null returns.

`PerceptionApi`:

```ts
class PerceptionApi {
  static signalAt(loc, modality: Modality): Signal | null;
  static perceiveAt(viewer, loc, modality: Modality): Percept | null;
  static sensorium(viewer): Modality[];     // organ + augment walk
  static canPerceive(viewer, modality: Modality): boolean;
}
```

Consumer call sites look like
`PerceptionApi.signalAt(loc, modalityByName('vision'))` where
`modalityByName` is a thin module-level helper that wraps
`StuffApi.findByTemplatePath('/lib/perception/modalities/<name>')`.

**Reasoning:** Matches the existing codebase precedent for "named
singleton vocabulary with per-instance behavior" — exactly what
`LocomotionMode` (walk/climb/swim/fly/…) does today. The
const-object-implementing-interface shape I floated earlier is not
in the codebase and would be a new module category; templated Idea
singletons are precedented and inherit the singleton lifecycle, HMR
support, persistence cache, and discoverability via
`StuffApi.findByTemplatePath` for free.

The slate's "substrate" framing IS a single Api with a modality
contract. Per-sense Apis would force a new Api class every time a
sense is added — explicitly opposed by the "no new Apis by default"
feedback rule. The subclass-per-modality + seed-YAML pattern is the
right amount of overhead once the third modality (smell + sound
forces it past two) exists; below that it'd be premature.

The future-content benefit: a content team adding a new modality
(echolocation, electroreception, magnetoreception) drops in a new
subclass + seed YAML without engine changes, the same way new
locomotion modes can be authored.

### `LightApi` deletion

**Decision:** `api/light.ts` is removed. The propagation walk
(`walkFluxAt`, `lightAt`, `bandAt`) relocates into
`lib/perception/modalities/VisionModality.ts` as the modality's
`signalAt` implementation. `MeasureLightController` and
`AnalyzeLightController` update from `LightApi.lightAt(loc)` to
`PerceptionApi.signalAt(loc, VisionModality)` — same return type
(`Light`), different entry point.

The dead `LightApi` surface (`canSee`, `perceivedBand`,
`viewerVisionProfile`, `shadowsAt`, `bandAt`, `bandFor`) is
absorbed:
- `canSee` / `perceivedBand` — the generic detection check moves to
  `PerceptionApi.canPerceive(viewer, modality)`; the vision-specific
  band-threshold check moves into `VisionModality.perceiveFor`.
- `viewerVisionProfile` — moves to a `VisionModality` static or a
  `lib/perception/vision.ts` helper module; called by
  `VisionModality.perceiveFor` internally. Not part of the
  modality-agnostic `PerceptionApi` surface.
- `bandFor` / `bandAt` — vision-specific helpers; live in
  `lib/perception/Light.ts` next to the `LightBand` union.
- `shadowsAt` — currently unused; relocate to a vision helper or
  drop entirely (no consumers, no tests reference it as
  non-aspirational).

**Reasoning:** A grep of `LightApi.*` shows only TWO non-test
consumers (`MeasureLightController`, `AnalyzeLightController`),
both calling `lightAt`. Everything else is undertested
infrastructure mentioned in JSDoc comments only.
`LightApi.lightAt` IS the vision modality's signal walk;
keeping it as a separate Api would be cosmetic with no public
role beyond what `PerceptionApi.signalAt` already does.

**The slate flagged "converge vision gradually, no big-bang
refactor."** This convergence is small in practice — two call
sites + a code move + a doc sweep.

### `SenseChannel` union unchanged

**Decision:** `SenseChannel = 'vision' | 'hearing' | 'smell' |
'touch' | 'taste'` stays exactly as today. ESP modalities do not
join this union and do not get a parallel string-literal type
alias.

`Modality.modality: string` (the modality-contract field
that identifies the BodyPlan organ key) accepts any string;
physical modalities happen to use `SenseChannel` literals, ESP
modalities use plain strings (`'verbal-esp'`, `'emotive-esp'`).

**Reasoning:** The three surfaces that consume `SenseChannel`
(`<sense channel="X">` MML wrapper, Detail per-sense slot map keys,
`senseStripAugmenter` filter) are all **room-state authoring**
surfaces. ESP does not appear in room state — there is no
`<sense channel="verbal-esp">` region in any room description,
and Detail slots don't carry ESP entries. Keeping `SenseChannel`
physical preserves the type-level guarantee that authors can't
mistakenly write ESP into state authoring.

A small asymmetry: `VisionModality.modality` is tagged as
`SenseChannel`-typed; `VerbalESPModality.modality` is tagged as
plain `string`. Not load-bearing in practice — call sites that
care use the modality singleton directly.

### ESP physics model — hybrid (local field + network routing)

**Decision:** ESP is `family: 'field'` at the substrate level.
The underlying physics is a field (the aether — to be renamed);
network routing is a layer on top, not a separate family. v1
ships the network-routing layer (existing `AetherMixin.dm`
behavior, renamed from `tell` per the dm rebrand) and documents
the field-half as the reserved substrate slot; field-half
implementation defers.

**Reasoning:** The user's read is that ESP is genuinely a sense —
"as much as vision is" — and should feel physical, not network-y.
Pure-network framing made ESP feel like a phone, not a sense.
Pure-field framing breaks dm-is-private-to-addressee (anyone
in range could pick up the signal). The hybrid mirrors how
cellular networks actually work: the radio link is short-range
physics, but a global routing fabric makes calls work
geographically anywhere. So:

- *Locally* (future build): the aether carries any ESP activity;
  eavesdropping is possible via tuning your implant; closed
  shielded rooms block the field; range matters.
- *Long-distance* (today): the network routes addressed messages
  regardless of distance.
- *Privacy* (future build): dm frames are encrypted at the
  local link; eavesdroppers detect ESP activity but not content.

The substrate decision is: declare ESP modalities as `family: 'field'`
NOW so the contract is honest; implement only the network layer
in this build (i.e., `signalAt` returns `null` and `AetherMixin.dm`
is the delivery mechanism); the documented hybrid model tells the
future ESP-physics build what shape to implement.

### Touch ambient temperature scope

**Decision:** Bare `feel` reports an ambient-temperature band line
derived from `BiomeApi.resolveTemperatureFor(viewer.getContainer())`
(via `TouchModality.signalAt`). Targeted `feel <target>` reads the
target's temperature via the existing biome per-Detail temperature
override chain. Coarse band: `cold` / `cool` / `comfortable` /
`warm` / `hot` / `scalding`. No new mixin needed for per-Stuff
temperature — the room authors `_detailTemperatures.stove = 700K`
on the location.

**Reasoning:** Without ambient + contact thermoreception, the touch
modality ships as authoring-only-with-no-physics — the same shape
as taste. Including this in v1 makes touch substantively real for
~one BiomeApi call + a band-mapping table. Vitals burn damage
stays deferred; the prose surfaces "scalding" without a damage
hook.

### Vision-specific value types stay home

**Decision:** `Light` value object, `LightBand` union,
`AmbientLitMixin`, `LightSourceMixin`, `LightConduit` interface
all stay in `lib/perception/` (their current home). They're the
vision modality's domain vocabulary, not Api-shaped.

`Smell` and `Sound` value objects sit alongside as parallel
modality-domain types: `lib/perception/Smell.ts`,
`lib/perception/Sound.ts`. New `SmellConduit` interface lives in
`lib/boundary/`; `SmellSourceMixin` lives in `lib/perception/`.
Same for sound.

**Reasoning:** Each modality owns its value types. No shared `Signal`
base or `Source` base — structural similarity stays informal.
Future generalization when patterns stabilize.

### Per-modality walks, not a generic walker

**Decision:** `VisionModality.signalAt`, `SmellModality.signalAt`,
`SoundModality.signalAt` each implement their own propagation walk.
The walks share structural shape (ambient + contents + fixtures +
cross-boundary + cross-exit, depth-capped, cycle-guarded) but
remain independent code.

**Reasoning:** Value types, source-merging logic, and attenuation
rules differ per modality. A generic walker parameterized on those
would be over-abstracted for three concrete modalities. Consolidate
when a fourth field modality earns it. Per the "stop adding
abstraction" feedback rule.

### "Modality" vs "channel" — terminology split

**Decision:** The substrate concept is named **modality**
(`Modality` base class, `VisionModality` / `SmellModality` / …
subclasses, `meta.modality?: string` on the frame,
`Scene.modality(name)` setter, `PerceptionApi.signalAt(loc,
modality)`). The word **channel** is reserved for two pre-existing
authoring/domain concerns:

- The `<sense channel="X">` MML wrapper attribute (shipped
  authoring vocabulary). "Sense channel" reads naturally as a
  compound noun in that context; renaming the attribute would be
  a wire-shape change to shipped authoring.
- Future chat channels (per [chat-slate.md](../slates/chat-slate.md))
  — Discord-style group routing surfaces.

The `SenseChannel` TypeScript literal union (the 5-physical-sense
string-literal type shipped in `lib/description/Perceiver.ts`)
keeps its name, because it specifically describes the legal values
of the MML `channel` attribute and the keys of Detail per-sense
slot maps. It is a *narrower* type than `Modality` (it excludes
ESP modalities). Both coexist.

**Reasoning:** "Channel" is overloaded — it already meant something
in the senses MML authoring layer and will mean something different
in chat. "Modality" is the technical term from neuroscience for
exactly what we mean (a category of perception — visual modality,
auditory modality, olfactory modality), and the codebase already
half-used it: `BodyPlan.sensoryPorts.modality` was string-keyed
this way. Adopting `Modality` for the substrate class disambiguates
all three concerns cleanly. The MML attribute stays "channel"
because in that scoped authoring context it's unambiguous and
renaming wire-shape ships.

### `tell` rebranded as `dm`

**Decision:** The user-facing addressed-ESP verb is renamed from
`tell` to `dm`. `tell` survives as an alias for muscle-memory
compatibility — both verbs dispatch to the same controller. The
rename propagates internally:

- YAML: `mud/cmd/dm.yaml` with `verbs: [dm, tell]`
- Controller: `obj/command/DmController.ts` (class `DmController`)
- AetherMixin method: `AetherMixin.dm()` (renamed from `.tell()`)
- Topic: `world.speech.dm` (renamed from `world.speech.tell`) —
  the TopicCatalogue YAML for the descriptor updates to match
- Polite refusal strings + prose templates updated to use "dm"
  framing

**Reasoning:** `tell` was inherited from old-MUDs where it
represented conversation because there was no other directed-comms
verb. Now that directed `say --to` exists for acoustic
conversation, `tell` is doing a different job — addressed ESP via
the implant network — and the name lags the semantics. `dm`
lands immediately for any audience that's used a modern chat
client, and it's diegetically accurate (you ARE sending a direct
message over the implant network). Keeping `tell` as an alias
preserves muscle memory; the canonical form is what shows in
docs, prose, and the inspection pane.

The internal-method + topic rename pull together with the verb
rebrand because half-renaming would leave an awkward gap (`dm`
verb dispatching to `AetherMixin.dm()` firing the
`world.speech.tell` topic). All-or-nothing is cleaner. The
`AetherMixin` rename itself remains held pending the
worldbuilding conversation — the method's renamed within the
mixin; the mixin's name doesn't change here.

### ESP capability arrives via augment-conferred AetherMixin

**Decision:** No v1 species declares ESP modalities on its
BodyPlan. ESP arrives in a viewer's sensorium via the
**baseline comm implant** — an `AugmentMixin`-composing Stuff
installed in the cranial slot, whose `confers()` returns
`['AetherMixin']`. `AetherMixin` itself declares
`_grantsModalities = ['verbal-esp', 'emotive-esp']`. When the
implant is installed, the active-mixin walk includes AetherMixin;
the substrate collects AetherMixin's grants into the sensorium;
the verbal-esp and emotive-esp modalities perceive. Every Avatar
gets the implant bootstrap-installed by `Avatar.enter`; the
implant is "hardened" per the augmentation slate (no power state,
can't fail in v1).

`AetherMixin` is also marked `_augmentGated = true` — native
composition alone does not activate it; an augment must confer.
Its methods are wrapped with `@RequiresActive('AetherMixin')`,
so direct calls to `avatar.dm(...)` throw
`InactiveCapabilityError` when no augment confers the mixin. The
verb-level `requiresVerbalESP` validator is the polite-refusal
early-catch; the decorator is the late-catch backstop for any
direct caller.

The fantasy/alien-species path stays reserved: a future telepath
species (magical empath, alien biological aether receiver) can
either (a) declare an ESP modality on its BodyPlan via the
existing `sensoryPorts` mechanism, OR (b) carry a slotted
biological-empathy organ that confers AetherMixin the same way
the implant does. The substrate accepts both; no v1 species
exercises either, but the mechanism handles it.

**Reasoning:** BodyPlan is biology — species-level innate
capability. Implants are augmentation — acquired capability via
slotted Stuff. The "innate ⊕ acquired" axis from the
augmentation slate maps directly onto the active-mixin walk
(native composition ∪ augment conferral). Pulling in augmentation
Wave 1 gives ESP a substrate home that won't have to be
refactored when augmentation matures.

The mental model is "mixin composition is build-time semantics;
augment is runtime semantics for whether the mixin is active."
`AetherMixin` stays composed on Avatar (so methods + state
exist), but the augment toggles activation. Predicates
(`MixinApi.isAether`), sensorium walks, validators, and the
method-level decorator all read the same "active?" question.
Callers see one calling convention — no bifurcated typecheck
per mixin kind.

### Per-frame modality attribution + reception gating

**Decision:** `MessageFrame.meta.modality?: string` becomes the
canonical place a frame names its modality. `SensorMixin.filterMessage`
drops frames whose modality isn't in the recipient's sensorium.
Actor self-frames (`audience:actor` tag) bypass the check.

Producers populate the modality at compose time:
- `VocalMixin.say` → `'hearing'`
- `AetherMixin.dm` → `'verbal-esp'`
- Future emote `SoulMixin` → `'emotive-esp'`
- Multi-modality events (a door slam) stay as separate `Scene.send`
  calls per modality; one frame is one modality (matches the existing
  "events single-modality per frame" authoring discipline).

System / log / narrative frames don't set `meta.modality` and
deliver unconditionally — those aren't sensory events at all.

**Reasoning:** Wires up a substrate pattern that's been ratified
in [perception.md](../subsystems/perception.md) but never
implemented. Closes a real gap — without this, deaf players still
receive `say` frames in full, and implant-less players would
receive `dm` frames. With this, the senses substrate is
symmetric across physical and ESP modalities: organ (or augment)
required for reception, period.

**What was previously rejected and why this isn't it:** During
the senses MR Round 2, modality was put into the TOPIC field
(`world.perception.vision` / `.hearing`). That was reverted
because it conflated kind-of-event with sensory-modality and
collapsed frames into too few topics. The fix was: topic stays
kind-of-event; modality goes elsewhere. "Elsewhere" splits two
ways depending on what's being attributed:
- *State* (multi-modality room descriptions) → per-region
  `<sense channel="X">` body MML wrappers (shipped).
- *Events* (whole-frame modality attribution for reception) →
  per-frame `meta.modality` (this build).

The two work together: `filterMessage` decides whether the
frame arrives at all; the augmenter decides what regions of the
frame's body MML the viewer sees within an arrived frame.

### `PerceptionApi.sensorium` is canonical and walks the active mixin set

**Decision:** `PerceptionApi.sensorium(viewer)` is the
modality-agnostic walker. Walks (a) the viewer's BodyPlan organs
via `BodyPlan.sensoryPorts`, AND (b) `MixinApi.getActiveMixins(viewer)`
collecting each active mixin's `_grantsModalities`. The active-mixin
walk transparently includes augment-conferred mixins (their
`_grantsModalities` flow in via the conferral mechanism).
Returns the union, deduped.

`SpeciesApi.deriveSensorium` retires entirely. Callers update:
- `senseStripAugmenter` (`lib/description/Visible.ts`) — uses
  `PerceptionApi.sensorium`.
- The four `requires*` validators for physical modalities
  (`requiresSmell`, `requiresHearing`, `requiresTouch`,
  `requiresTaste`) — use `PerceptionApi.canPerceive(giver, modality)`.
- The new `requiresVerbalESP` / `requiresEmotiveESP` validators
  for ESP — same shape.

**Reasoning:** The "do you have the organ (innate or augmented)?"
question is modality-agnostic; it lives on the modality-agnostic Api.
Walking augments alongside organs makes the effective-sensorium =
innate ⊕ acquired derivation real (per the augmentation slate).

### Augmentation Wave 1 — augment-confers-mixin substrate + baseline implant

**Decision:** Pull in Wave 1 of
[augmentation-slate.md](../slates/augmentation-slate.md). The
load-bearing design move is making augments and mixins **parallel
expressions of the same concept** — capability declarations.
Mixin composition is build-time semantics ("this entity has the
capability"); augment installation is runtime semantics ("the
capability is currently active"). A small uniform substrate
carries the union across the codebase.

**Substrate concretely:**

1. **Mixins self-declare grants.** A mixin's class body may carry
   `_grantsX` static fields alongside its `_mixinName` marker.
   v1 reads only `_grantsModalities: readonly string[]`. The
   shape is open — `_grantsLanguages`, `_grantsAttributeMasks`,
   `_grantsVitalFunctions`, `_grantsSlots` are reserved for their
   consumer subsystems. Per the colocate-mixin-interface rule,
   the mixin owns its grants; subsystems walk them.

2. **Mixins that require augment-conferral declare
   `_augmentGated: true`.** Most mixins do not — they remain
   active whenever composed (Named, Container, Visible, Mobile,
   etc.). v1 marks only `AetherMixin` as gated. Future cybernetic
   capability mixins follow the same pattern.

3. **`AugmentMixin`** in `lib/augmentation/Augment.ts`. Composed
   by augment Stuff. Surface:
   ```ts
   confers(): readonly string[];  // mixin names the augment activates
   ```
   That's the whole augment-side surface in v1. No modality list,
   no grant enumeration — augments name mixins; mixins describe
   grants.

4. **`MixinApi.getActiveMixins(stuff): readonly MixinClass[]` and
   `MixinApi.isActive(stuff, mixinName): boolean`** — uniform
   substrate query:
   ```
   active set = { m | hasMixin(stuff, m) AND
                      (not m._augmentGated OR
                       exists augment in slots with m ∈ confers()) }
   ```
   v1 walks installed augments lazily (no cache); a future
   optimization caches the set on the entity, invalidated on slot
   occupy/release. For v1 with one augment, cost is negligible.

5. **`MixinApi.isFoo` predicates query active state.** The
   existing `is<MixinName>` predicate generator now wraps the
   `isActive` check rather than the bare `hasMixin` walk. For
   un-gated mixins, the result is identical to today's behavior
   (active iff composed). For gated mixins, the predicate
   reflects the augment-toggled reality. **Uniform calling
   convention across all mixins** — no special case for
   augment-gated ones.

6. **`@RequiresActive('<MixinName>')` decorator** in
   `lib/security/RequiresActive.ts`. Wraps every method on an
   augment-gated mixin. At call time:
   ```ts
   if (!MixinApi.isActive(this, mixinName)) {
     throw new InactiveCapabilityError(mixinName, methodName);
   }
   ```
   Lives next to the existing call-security decorators
   (`@CallSecurity`, `@Final`, `@Unshadowable`); plays the same
   role of method-level enforcement. v1 applies it to
   `AetherMixin.dm()`. Closes the direct-call gap symmetrically
   with the verb-level validator.

**Concrete content for v1:**

- `BodyPlan.slots` (the unified `SlotSpec` universe shipped with
  embodiment) gains `'implant'` as a valid `accepts` mixin kind.
  `biped` and `quadruped` body plans declare a `cranial` slot of
  this kind in v1; `sessile` doesn't get one. Slot capacity = 1.
- `BaselineCommImplant` Thing template under
  `lib/augmentation/BaselineCommImplant.ts` + a seed under
  `seeds/lib/augmentation/baseline-comm-implant.yaml`. Composes
  `SlottableMixin` (targets cranial slot) + `TangibleMixin` (small
  cybernetic object; brass / silicon material is content choice
  for the seed) + `AugmentMixin` with
  `confers() = ['AetherMixin']`. Hardened — no power state or
  failure modes in v1.
- `AetherMixin` gains `_augmentGated = true`,
  `_grantsModalities = ['verbal-esp', 'emotive-esp']`, and
  `@RequiresActive('AetherMixin')` on `dm()` (and other
  Aether-grouped methods as they land).
- `Avatar.enter` checks the cranial slot via `SlotApi`; if no
  baseline implant present, clones the template via
  `StuffApi.clone` and installs via `SlotApi.occupy`.
  Idempotent — re-entering an Avatar already carrying the
  implant is a no-op.
- Two new verb-level validators in `lib/command/validators/`:
  `requiresVerbalESP.ts` and `requiresEmotiveESP.ts`. Bodies
  are one-liner `PerceptionApi.canPerceive(giver, modality)`
  checks. `dm.yaml` (with `verbs: [dm, tell]`) adopts
  `requiresVerbalESP`. Polite refusal strings: `"You have no
  way to send a thought."` / `"You have no way to send a
  feeling."`

**Augmentation generalizes beyond ESP — substrate proof.**

Every other augment kind named in the augmentation slate uses
the SAME pattern. The substrate stays small; breadth comes from
mixin self-declarations and subsystem walks:

| Augment Stuff | `confers()` | Conferred mixin's grants | Consumer subsystem |
|---|---|---|---|
| `BaselineCommImplant` | `['AetherMixin']` | `_grantsModalities` | PerceptionApi.sensorium |
| `ThermalVisionImplant` (future) | `['ThermalVisionMixin']` | `_grantsModalities` | PerceptionApi.sensorium |
| `CyberArm` (future) | `['ProstheticArmMixin']` | `_grantsSlots`, `_grantsAttributeMasks` | SlotApi, PropertiedMixin |
| `TranslationChip` (future) | `['TranslationMixin']` | `_grantsLanguages` | LanguageApi (future) |
| `ArtificialHeart` (future) | `['HeartFunctionMixin']` | `_grantsVitalFunctions` | VitalsApi (future) |

v1 ships only the first row. The rest are intentional non-goals
— but the substrate they'd plug into is the same substrate v1
delivers. Adding a future augment = a new Stuff template with a
`confers` list, plus the mixin it confers declaring whatever it
grants. No framework lift.

**Reasoning:** The user pushed hard on the "augments are narrow"
concern — my first design only modeled augment-grants-modality.
The redesign makes the substrate genuinely wide: each grant kind
is one field on the mixin; each consumer subsystem walks the
active mixin set for its kind. v1 ships the framework and reads
only the modality grant; future grant kinds (locomotion modes,
attribute masks, vital functions, languages, slots) plug in
without substrate changes.

The two-layer enforcement (verb validator + method decorator) is
symmetric with how Saxonberg already gates capabilities (`@Final`
+ build-time + runtime). Callers never branch on whether a mixin
is gated; the substrate enforces it transparently.

Two things remain in flight, both Wave 2+: methods/state
*conferred* by an augment (today they live on the natively
composed mixin), and the install/remove medical procedure. v1
keeps the simpler shape — methods on the natively composed
mixin, augment as activation gate. The transition path (move
AetherMixin off Avatar; verb dispatch routes through the
augment Stuff) is documented as the seam but not built.

### Ambient masking — single-level, no frequency bands

**Decision:** A viewer's effective threshold on a modality is
`max(viewer_threshold, ambient_signal_on_modality)`. For sound,
ambient comes from `Biome._defaultAmbientSoundLevel` resolved at
the viewer's scope (using the existing biome chain). For smell,
ambient is the total odor concentration in the room scope from
non-target sources. Per-frequency-band masking and per-odor-class
masking are out of scope.

**Reasoning:** The universal mechanic — whisper in a loud room, faint
smell in a strong-smell room — falls out of single-level masking
cheaply. Full acoustic / olfactory masking is its own complexity
that waits for content demand.

### Conduit defaults on Boundary

**Decision:** Closed Door blocks both `SmellConduit` and
`SoundConduit` (transmissivity 0) parallel to its existing
`LightConduit` gating on `isOpen()`. Open Door transmits both
fully (transmissivity 1). Window mirrors via its `Sealable.isOpen`
shutter state — closed shutter blocks all three (light, smell,
sound).

**Reasoning:** Physically honest. A closed door blocks smell and
sound, period. The "vacuum blocks" rule is independent — checked
during the walk via `BiomeApi.densityOf(atmosphere)` on the
recipient scope; a vacuum scope reads as zero signal regardless
of conduit transmissivity.

### Biome ambient sound graduates from prose to typed

**Decision:** `Biome._defaultAmbientSoundLevel: Quantity<'dB'> | null`
becomes a new field on `Biome`, parallel to the existing
`_defaultTemperature` / `_defaultPressure` / etc. The biome chain
(`BiomeApi.resolveAmbientSoundLevelFor`) resolves it per scope. The
existing prose-only `_ambientSoundMml` stays — it's narrative
description, not propagating signal.

Smell does NOT get a typed ambient field on Biome. Per-room ambient
smell is content authoring via `<sense channel="smell">` regions
on Location prose. The existing prose-only `_ambientSmellMml` stays
unchanged.

**Reasoning:** Sound has constant ambient activity (the room hums
at some baseline SPL). Smell is more episodic — a kitchen smells
of garlic during cooking; cooking ambient is best modeled as a
`SmellSourceMixin` on the oven, not a biome default.

### File organization

**Decision:** New files:
- `lib/perception/Modality.ts` — the base class
  `Modality extends SingletonMixin(PropertiedMixin(Idea))`
  with persistent `name` / `family` / `modality` fields and
  default null-returning `signalAt` / `perceiveFor` methods.
  Also exports the `Signal` / `Percept` marker types and the
  family literal type.
- `lib/perception/modalities/VisionModality.ts`, `SmellModality.ts`,
  `SoundModality.ts`, `TouchModality.ts`, `TasteModality.ts`,
  `VerbalESPModality.ts`, `EmotiveESPModality.ts` — the seven
  concrete subclasses. Per-modality override of `signalAt` /
  `perceiveFor` as needed (taste / ESP inherit the null
  defaults; vision / smell / sound / touch override). The
  `Modality` suffix avoids collision with the value-object files
  one level up (`lib/perception/Smell.ts` is the `Smell` value
  object; `lib/perception/modalities/SmellModality.ts` is the
  singleton class).
- `seeds/lib/perception/modalities/vision.yaml`, `smell.yaml`,
  `sound.yaml`, `touch.yaml`, `taste.yaml`, `verbal-esp.yaml`,
  `emotive-esp.yaml` — seven seed templates (parallel to
  `seeds/lib/locomotion/<mode>.yaml`).
- `lib/perception/modalityByName.ts` (or inlined into
  `api/perception.ts`) — thin lookup helper wrapping
  `StuffApi.findByTemplatePath('/lib/perception/modalities/<name>')`.
- `lib/perception/Smell.ts` — `Smell` value object.
- `lib/perception/Sound.ts` — `Sound` value object.
- `lib/perception/Touch.ts` — `Touch` value object + `TouchBand`
  union.
- `lib/perception/SmellSource.ts` — `SmellSourceMixin`.
- `lib/perception/SoundSource.ts` — `SoundSourceMixin`.
- `lib/boundary/SmellConduit.ts` — interface only.
- `lib/boundary/SoundConduit.ts` — interface only (graduates from
  the existing `reserved for v2` placeholder).
- `api/perception.ts` — `PerceptionApi`.
- `obj/instrument/SoundLevelMeter.yaml` (template) — instrument
  Stuff template.
- `mud/cmd/measure-sound.yaml` + controller — sub-verb for
  `SoundLevelMeter`.
- `lib/augmentation/Augment.ts` — `AugmentMixin` with
  `confers()` method.
- `lib/augmentation/BaselineCommImplant.ts` — Thing subclass for
  the baseline implant template.
- `seeds/lib/augmentation/baseline-comm-implant.yaml` — seed
  for the implant template.
- `lib/security/RequiresActive.ts` —
  `@RequiresActive(mixinName)` method decorator +
  `InactiveCapabilityError` class.
- `lib/command/validators/requiresVerbalESP.ts`,
  `requiresEmotiveESP.ts` — new validators.
- `docs/subsystems/augmentation.md` — new subsystem doc
  (substrate sketch: `AugmentMixin.confers()`,
  `MixinApi.getActiveMixins` / `isActive`, `_augmentGated` +
  `_grantsX` mixin declarations, `@RequiresActive` decorator,
  the cranial slot, the baseline implant, the augment table
  showing how the same substrate handles future augment kinds,
  Wave 1 boundary).

Files removed:
- `api/light.ts` (`LightApi`) — retired.

Files updated:
- `obj/command/MeasureLightController.ts` and
  `AnalyzeLightController.ts` — read via `PerceptionApi`.
- `obj/command/SmellController.ts` and `ListenController.ts` —
  bare form reads via `PerceptionApi`.
- `obj/command/FeelController.ts` — bare form adds
  ambient-temperature line; targeted form reads target
  temperature via biome chain.
- `lib/boundary/Door.ts` — implements `SmellConduit` +
  `SoundConduit` alongside existing conduits.
- `lib/boundary/Window.ts` — same.
- `lib/species/BodyPlan.ts` — `slots` gains the `'implant'`
  slot kind. `SensoryPort.modality` accepts ESP modality strings
  (no v1 species uses them; reserved for future telepath species).
  `biped` and `quadruped` body plans declare a `cranial` slot.
- `lib/species/Biome.ts` — `_defaultAmbientSoundLevel` field +
  getter/setter.
- `api/biome.ts` — `resolveAmbientSoundLevelFor` resolver.
- `lib/description/Perceiver.ts` — `SenseChannel` stays as-is; no
  union change.
- `lib/description/Visible.ts` — `senseStripAugmenter` updates
  to use `PerceptionApi.sensorium`.
- `lib/command/validators/requires{Smell,Hearing,Touch,Taste}.ts`
  — update to use `PerceptionApi.canPerceive(giver, modality)`.
- `lib/message/Sensor.ts` (`SensorMixin`) — `filterMessage`
  adds the modality-attribution check and actor-bypass.
- `lib/character/Avatar.ts` — `enter` bootstraps the baseline
  implant into the cranial slot if absent (idempotent).
- `api/species.ts` — `deriveSensorium` removed.
- `api/message.ts` — `Scene.modality(name)` setter added;
  `MessageApi.scene` flows the modality through to the composed
  frame's `meta.modality`.
- `packages/types/src/MessageFrame.ts` (or wherever the type is
  declared in `@saxonberg/types`) — `meta.modality?: string`.
- `lib/message/Vocal.ts` (`VocalMixin`) — `say` calls `.modality('hearing')`
  on its Scene.
- `lib/message/Aether.ts` (`AetherMixin`) — `dm()` (renamed from `tell()`)
  calls `.modality('verbal-esp')` on its Scene.
- `mud/cmd/dm.yaml` (renamed from `tell.yaml`; carries
  `verbs: [dm, tell]`) — adds `requiresVerbalESP` validator.
- `obj/command/DmController.ts` (renamed from `TellController.ts`)
  — same controller, new class name.
- `docs/subsystems/senses.md` — major update to cover the new
  substrate, modality attribution living in BOTH per-frame meta
  AND per-region body MML.
- `docs/subsystems/light.md` — `LightApi` section retires; vision
  references the new substrate; Light value object section stays.
- `docs/subsystems/messaging.md` — `MessageFrame.meta.modality`
  documented; `SensorMixin.filterMessage` modality-check
  documented; `Scene.modality` documented.
- `docs/subsystems/perception.md` — already documents the
  modality-level filtering pattern; update to note it's now
  implemented (was "vision/hearing/ESP all ride this" with
  meta naming the modality).
- `docs/subsystems/race.md` — note the cranial slot addition
  to biped/quadruped body plans.
- `docs/subsystems/biome.md` — new `_defaultAmbientSoundLevel`
  field on Biome documented; `BiomeApi.resolveAmbientSoundLevelFor`
  added to the resolver list.
- `docs/subsystems/boundary.md` — `SmellConduit` and
  `SoundConduit` interfaces added to the Conduit family;
  Door and Window now implement both.
- `docs/subsystems/quantities.md` — new tag tables for
  `ppm` (smell concentration), `dB` (sound amplitude), `Hz`
  (sound frequency) documented.
- `docs/subsystems/augmentation.md` — NEW subsystem doc (see
  "New files" above).
- `docs/slates/senses-slate.md` — status block updated marking
  Wave 1 physics half shipped.
- `docs/slates/sound-slate.md` — tombstone updated marking
  hearing instance shipped.
- `docs/slates/augmentation-slate.md` — status block updated
  marking Wave 1 (implantable affordance + baseline implant)
  shipped; Wave 2+ remain.
- `docs/architecture.md` — mentions the new
  `lib/perception/modalities/` and `lib/augmentation/` substrate
  locations.

**Reasoning:** Per CLAUDE.md's "module categories — DO NOT INVENT
NEW ONES." Mixins live in `lib/<subsystem>/`. Apis live in `api/`.
Substrate types live next to the subsystem they describe.
`lib/augmentation/` is a new subsystem directory (not a deviation
from the rule — augmentation IS a new subsystem the augmentation
slate is shipping; this just makes its Wave 1 directory real).
The `lib/perception/modalities/` subdirectory is a discoverability
grouping for the seven modality singletons.

---

## Constraints

### Imports + isolation

- New `Modality` base class + `Signal` + `Percept`
  marker types live at `lib/perception/Modality.ts`.
  Channel subclasses import from there directly.
- `PerceptionApi` (`api/perception.ts`) is the only outside
  surface. Domain code calls through it, not directly into
  modality singletons (except where the modality is the dispatch
  target, e.g., `PerceptionApi.signalAt(loc, SmellModality)`).
- Modality singletons may import from their own modality's value
  type module (`SmellModality` imports `Smell`) and from the
  Boundary substrate (Conduit interfaces). They MAY import from
  `BiomeApi` (atmosphere medium check, ambient temperature) and
  `MixinApi` (host introspection).
- The vision modality's existing dependencies (LightSourceMixin,
  AmbientLitMixin, Boundary's LightConduit) stay.

### Property vs instruction fields

- All `Quantity`-typed scalar fields (`Smell.concentration`,
  `Sound.amplitude`, `Touch.temperature`, the new
  `_defaultAmbientSoundLevel` on Biome) follow the scalar-default
  rule from [persistence.md](../subsystems/persistence.md):
  stored as primitive scalars; runtime getters reconstruct the
  `Quantity`. The setters accept numeric / string / Quantity input
  for authoring ergonomics; storage is primitive.
- Per-field invariants belong on setters (`feedback_field_invariants_on_setters`):
  non-finite or negative concentration / amplitude / temperature
  throws TypeError at hydrate time.

### Method surface — methods only between Stuff

Per CLAUDE.md's "Inter-Stuff contract: methods only" rule:
- `SmellSourceMixin` / `SoundSourceMixin` expose
  `getEmittedConcentration()` / `setEmittedConcentration()` etc.;
  consumers read via methods, not fields.
- Witness hooks on emission change follow `LightSourceMixin`'s
  shape — `onSmellSourceChanged` / `onSoundSourceChanged` fire on
  the immediate environment when the stored value changes.

### Collection vocabulary

- The `Smell` / `Sound` value objects carry capped source
  attribution lists. Methods follow the collection vocabulary in
  [collections.md](../subsystems/collections.md) — ordered-list
  shape (`getSources()`, source merge happens via the value
  object's `add` factory).

### Conduit contract

- `SmellConduit` / `SoundConduit` follow the existing Conduit
  contract: `conduitKind: 'smell' | 'sound'`,
  `transmissivity(from, to): number` for smell (continuous
  attenuation); for sound the contract is the same (continuous dB
  attenuation, but v1 ships transmissivity 0 or 1 for
  Door/Window).
- Conduits MUST NOT cache — boundary state (e.g., `Sealable.isOpen`)
  participates in transmissivity.

### Pretty round-trip — `Light` precedent

- Light, Smell, Sound, Touch value objects are runtime-only —
  constructed by propagation walks from stored scalars; never
  persisted directly. Same shape as `Light` today.

### Animacy / sensorium widening

- `PerceptionApi.sensorium(viewer)` returns `[]` when the viewer
  isn't an Organism, when the Organism has no Species, or when
  any walk step is null — same defensive shape as the current
  `SpeciesApi.deriveSensorium`. Non-Organism viewers (debug
  consoles, observers) don't perceive anything.

### No premature substrate widening

- `Modality` and its sub-interfaces do not gain a
  `renderFor` formatter slot. The interface stays minimal until
  a concrete formatter consumer surfaces.
- No `Signal` base class hierarchy or unified `Percept` shape —
  each modality's value type stands alone. The marker types in
  `Modality.ts` (`type Signal = unknown` or similar) exist
  for documentation / generic typing only.
- `AugmentMixin` v1 has only the `confers()` method. The augment
  doesn't enumerate grants directly — the mixins it confers do.
  Additional mixin grant kinds (`_grantsLanguages`,
  `_grantsAttributeMasks`, `_grantsVitalFunctions`, `_grantsSlots`)
  are recognized as the open shape but **no v1 consumer reads
  them**. Each lands when its consumer subsystem ships.

### Augmentation Wave 1 — substrate-honest, no shortcuts

- The implant is a real `Stuff` template — clone-via-`StuffApi`,
  install-via-`SlotApi`, persist through the standard
  Stuff/Document pipeline. NOT a property on Avatar, NOT a
  boolean flag.
- `Avatar.enter` bootstrap is the v1 stand-in for char-gen's
  baseline-implant issuance. Idempotent. When char-gen lands,
  it takes over installation and `Avatar.enter` either keeps
  the bootstrap or hands off — the requirement is that every
  Avatar ends up with an installed implant by the time it
  starts perceiving, not the specific install timing.
- `BodyPlan.slots` is the existing unified slot universe from
  embodiment; reuse, don't add a parallel `implantSlots` field.
- `AetherMixin.dm` stays composed on Avatar (so the method
  + state are present). Augment-conferral activates it via
  the `_augmentGated` + `@RequiresActive` mechanism. Moving
  the method/state off Avatar onto the implant is Wave 2+
  work (requires verb-dispatch routing through augments).
- **No `isAetherActive` parallel predicate.** `MixinApi.isAether`
  IS the active predicate; build-time-only checks are an
  edge case using the low-level
  `MixinApi.hasMixin(stuff, AetherMixin)` directly. The
  high-level predicates uniformly answer the runtime question.
- `@RequiresActive` is mandatory on augment-gated mixin
  methods. The plan's review checklist enforces this when
  any mixin sets `_augmentGated = true`.

### Per-frame modality attribution — wire it correctly

- `MessageFrame.meta.modality` is the canonical place; nothing
  else on the frame names the modality (topic stays kind-of-event;
  audience tag stays the audience axis).
- `Scene.modality(name)` is the producer-side setter; callers
  don't reach into `meta` directly.
- `SensorMixin.filterMessage` is the lone reception-gating
  chokepoint. `onMessage` itself is NOT shadowable/overridable
  (per the existing messaging substrate's "filterMessage is the
  shadowable point" rule).
- Actor-bypass uses the existing `audience:actor` tag the Scene
  composer auto-attaches. No new tag, no new mechanism.
- Frames without a `meta.modality` deliver unconditionally —
  preserves backwards compatibility with every system / log /
  narrative frame that exists today and doesn't ride a sense.

### LightApi retirement is non-deletable-by-grep

- The removal of `api/light.ts` requires updating two production
  controllers (instrument readers), the JSDoc references in
  `lib/perception/Perception.ts` and `Light.ts`, and any tests.
  No `LightApi.*` references survive in `packages/server/src/`
  after the build.

---

## Acceptance criteria

### Architectural

- `api/light.ts` does not exist in the working tree.
- `api/perception.ts` exists with `PerceptionApi.signalAt`,
  `perceiveAt`, `sensorium`, `canPerceive`. Decorated with
  `SecurityApi.decorateApiClass(PerceptionApi)`.
- `lib/perception/Modality.ts` exports the base class
  `Modality extends SingletonMixin(PropertiedMixin(Idea))`.
- `lib/perception/modalities/` contains 7 modality subclass files
  (`VisionModality.ts` … `EmotiveESPModality.ts`), each extending
  `Modality`.
- `seeds/lib/perception/modalities/` contains 7 YAML seeds, one per
  modality.
- The seven singletons load successfully via
  `StuffApi.findByTemplatePath('/lib/perception/modalities/<name>')`
  and carry the expected `name` / `family` / `modality` data.
- HMR reloads of a modality subclass file update the singleton's
  method behavior on the next call (same shape as `LocomotionMode`
  HMR; tested with at least one modality).
- No file outside `api/perception.ts` and the modality singletons
  imports `lib/perception/modalities/` directly. Outside consumers
  go through `PerceptionApi`.
- `SpeciesApi.deriveSensorium` is removed; no call sites remain.

### Vision (refactor)

- `MeasureLightController` and `AnalyzeLightController` read via
  `PerceptionApi.signalAt(loc, VisionModality)` and produce the
  same observable output as before the refactor.
- The existing light propagation tests (cross-boundary,
  cross-exit, ambient + emitter accumulation, doored exits
  single-count, depth cap, cycle guard) pass against the
  relocated walk.
- `LightBand`, `AmbientLitMixin`, `LightSourceMixin`,
  `LightConduit` are unchanged in API; their tests pass.

### Smell propagation

- `SmellModality.signalAt` walks rooms: a candle emitting odor in
  room A is perceived in room B through an open Door; closed
  Door blocks; closed Window's shutter blocks. Vacuum atmosphere
  blocks regardless of conduit.
- Depth cap (matches vision's MAX_HOPS) and cycle guard tested.
- `olfactoryProfile.acuity` thresholds correctly: a `keen`-acuity
  viewer perceives a faint signal a `dull`-acuity viewer doesn't.
- Bare `smell` verb returns prose describing perceived odors with
  source attribution. Targeted `smell <target>` keeps per-Detail
  read.
- Source attribution lists are capped (parallel to Light's
  source-cap-3).

### Sound propagation

- `SoundModality.signalAt` walks rooms: a whistle blast at ~110 dB
  in room A attenuates predictably across an open Door to room
  B; closed Door blocks. Vacuum blocks.
- `Sound.amplitude` and `Sound.dominantBand` round-trip honestly
  through the walk.
- Bare `listen` verb reads room-scope sound and renders prose.
- `SoundLevelMeter` instrument reads
  `PerceptionApi.signalAt(loc, SoundModality).amplitude` and emits
  the dB reading.
- Biome ambient sound resolves via the chain (universe default →
  zone → biome ancestor → room override → vessel override),
  parallel to the existing temperature chain.

### Touch

- `TouchModality.signalAt(loc)` returns a `Touch` value with the
  ambient temperature from `BiomeApi.resolveTemperatureFor`.
- Bare `feel` renders the ambient-temperature band line for the
  viewer's current scope.
- Targeted `feel <target>` reads per-Detail temperature override
  (`AtmosphericMixin._detailTemperatures`) and renders the band
  for that detail.
- All six bands (`cold` / `cool` / `comfortable` / `warm` / `hot`
  / `scalding`) map predictably from K values.

### Masking

- A whisper-level source (e.g. 20 dB) in a room with ambient SPL
  of 50 dB is reported as inaudible to a normal-threshold viewer.
- A faint smell (concentration below the room's ambient odor
  level) is reported as imperceptible to a normal-acuity viewer.
- A keen-acuity viewer overcomes some masking the normal viewer
  doesn't.

### ESP via augmentation

- `PerceptionApi.sensorium(fresh-homo-sapiens-avatar-pre-bootstrap)`
  does NOT include ESP modalities.
- After `Avatar.enter` runs and the baseline implant is installed,
  `PerceptionApi.sensorium(avatar)` includes `VerbalESPModality`
  + `EmotiveESPModality`.
- `PerceptionApi.sensorium(bullfrog)` does NOT include ESP
  modalities (no implant; not sentient by content authoring).
- `PerceptionApi.sensorium(peace-lily)` does NOT include any
  modalities (sessile, no organs).
- An Avatar whose baseline implant is forcibly removed (via test
  fixture or admin verb) loses ESP modalities from its sensorium
  immediately on the next call (no caching staleness — augment walk
  is lazy).
- `dm` verb (and its `tell` alias) refuses with
  `requiresVerbalESP`'s polite refusal string when invoked by a
  giver without the implant.
- `AetherMixin.dm` itself behaves identically to today when it
  IS allowed to run (no behavioral regression beyond the gate).
- `VerbalESPModality.signalAt(loc)` returns `null` in v1.

### Augmentation Wave 1

- `AugmentMixin` exists with `confers(): readonly string[]`
  method (returns mixin names).
- `MixinApi.getActiveMixins(stuff)` and
  `MixinApi.isActive(stuff, mixinName)` exist and walk
  (native composition ∪ augment conferral via
  `_augmentGated` lookup).
- `MixinApi.is<MixinName>` predicates (the auto-generated
  family) now back onto `isActive`. Behavior identical for
  un-gated mixins; reflects augment-toggled reality for
  gated ones.
- `BodyPlan.slots` accepts `'implant'` as a slot kind; the
  `biped` and `quadruped` body plans declare a `cranial`
  slot. Capacity 1.
- `BaselineCommImplant` template clones successfully and
  composes the expected mixin chain (`Slottable` + `Tangible`
  + `Augment`). Its `confers()` returns `['AetherMixin']`.
- `AetherMixin` declares
  `_augmentGated = true` and
  `_grantsModalities = ['verbal-esp', 'emotive-esp']`.
- `AetherMixin.dm` is decorated with
  `@RequiresActive('AetherMixin')`. Code review confirms every
  public method on an `_augmentGated: true` mixin carries the
  decorator (v1: just `dm()`; the rule is forward-looking).
- `MixinApi.isAether(avatar)` returns false pre-bootstrap
  (no implant) and true post-bootstrap. Direct
  `avatar.dm(...)` throws `InactiveCapabilityError` when no
  implant; runs normally when implant is installed.
- `Avatar.enter` installs the baseline implant in the
  cranial slot when absent; second-entry is a no-op
  (idempotent).
- The implant persists across save/restore (standard
  Stuff/Document round-trip; nothing implant-specific to
  test beyond the clone+occupy mechanism).
- `requiresVerbalESP` and `requiresEmotiveESP` exist and
  gate via `PerceptionApi.canPerceive`.
- `dm.yaml` carries the `requiresVerbalESP` validator.

### Per-frame modality attribution + reception gating

- `MessageFrame.meta.modality` exists in `@saxonberg/types` and
  is optional.
- `Scene.modality(name)` exists and stamps the modality onto every
  composed frame's `meta`.
- `VocalMixin.say` produces frames with
  `meta.modality === 'hearing'`.
- `AetherMixin.dm` produces frames with
  `meta.modality === 'verbal-esp'`.
- `SensorMixin.filterMessage` drops frames where `meta.modality`
  is set AND the modality is not in the recipient's sensorium.
- Actor self-frames (`audience:actor` tag) bypass the modality
  check and always deliver to the actor.
- Frames without `meta.modality` (system, log, narrative)
  deliver unconditionally — verified by a test that emits a
  `system.log.info` frame to a recipient with empty sensorium
  and observes delivery.

### Reception-gating scenarios

- A deaf-by-BodyPlan player (a fixture species with no
  ear modality) in a room where another player `say`s does NOT
  receive the `say` frame body.
- The speaker DOES receive their own self-frame ("You say…")
  even if the speaker is deaf (actor-bypass).
- An implant-less player (fixture: avatar whose implant has been
  forcibly removed) in a room where another player `dm`s them
  does NOT receive the dm frame.
- A player without a smell organ (fixture) does NOT receive any
  frame with `meta.modality === 'smell'` (proves the framework
  is modality-agnostic; smell frames if/when emitted by some
  future producer would be gated symmetrically).

### Sensorium widening (augment walk)

- `PerceptionApi.sensorium` walks both organs and augments;
  removing the implant reduces the sensorium; reinstalling
  restores it.
- `senseStripAugmenter` calls `PerceptionApi.sensorium` and
  produces the correct filter set for each species + implant
  state in the v1 roster.
- The four physical `requires*` validators call
  `PerceptionApi.canPerceive(giver, modality)` and gate
  identically to before (still polite-refusal-on-missing-organ).

### Documentation

- `docs/subsystems/senses.md` updated to document the full
  substrate (modalities, PerceptionApi surface, propagation walks
  for smell + sound + touch ambient, masking, organ-gates-modality
  rule widened to include augment contributions, hybrid ESP
  framing with field-half reserved, per-frame modality attribution
  living in both `meta.modality` AND body MML).
- `docs/subsystems/light.md` updated: `LightApi` section retired;
  vision references `PerceptionApi.signalAt(loc, VisionModality)`;
  Light value object + AmbientLit + LightSource + LightConduit
  sections stay.
- `docs/subsystems/messaging.md` updated: documents the new
  `MessageFrame.meta.modality` field; `Scene.modality(name)`
  setter; `SensorMixin.filterMessage` modality-check + actor-bypass.
- `docs/subsystems/perception.md` updated: the
  modality-level-filtering paragraph notes the pattern is now
  implemented (was documented but unimplemented).
- `docs/subsystems/race.md` updated: cranial slot addition to
  biped and quadruped body plans; reserved ESP modality
  acceptance for future telepath species.
- `docs/subsystems/augmentation.md` NEW: documents `AugmentMixin`,
  the cranial slot, `BaselineCommImplant`, the Avatar bootstrap,
  the augment-confers-mixin mechanism, Wave 1 scope boundary
  (what's NOT yet built per Wave 2+).
- `docs/slates/senses-slate.md` status block notes Wave 1 physics
  half shipped; lists what's still ahead (trails, active sense,
  full ESP field, profiles, vitals integration).
- `docs/slates/sound-slate.md` tombstone notes hearing instance
  shipped; retains acoustic spec depth for future polish.
- `docs/slates/augmentation-slate.md` status block notes Wave 1
  (implantable affordance + baseline implant) shipped; Wave 2+
  (install/remove procedure, other augments, char-gen loadout,
  failure modes, generalized contribute-capability) remain.
- `docs/architecture.md` mentions the new
  `lib/perception/modalities/` and `lib/augmentation/` substrate
  locations.
- `docs/antipatterns.md` augmented with four entries:
  - "Don't add a per-sense Api — modalities are singletons
    extending the `Modality` base class; add a singleton + seed
    YAML, not a new Api class."
  - "Don't model augments by listing grants directly. An
    augment declares which mixins it confers; the mixin
    declares what it grants. `BaselineCommImplant.confers()`
    returns `['AetherMixin']`; `AetherMixin._grantsModalities`
    has the modality list. Decentralized declarations beat
    coupled lists."
  - "Augment-gated mixins MUST decorate their methods with
    `@RequiresActive('<MixinName>')`. The verb-level validator
    is the polite-refusal early-catch; the decorator is the
    late-catch backstop for direct callers. Skipping the
    decorator leaves a gap any non-verb consumer hits."
  - "Don't mint a parallel `isFooActive` predicate when adding
    an augment-gated mixin. `MixinApi.isFoo` already answers
    the active question uniformly. Build-time-only composition
    checks are an edge case using `MixinApi.hasMixin`
    directly."

### Cleanups

- No JSDoc references to `LightApi.*` survive in the codebase
  (the references in `lib/perception/Perception.ts` and
  `lib/perception/Light.ts` update to point at
  `PerceptionApi` / `VisionModality`).
- No `SpeciesApi.deriveSensorium` references survive.

### Tests

- Per-modality propagation tests live under
  `lib/perception/modalities/__tests__/`.
- `PerceptionApi.sensorium` is covered for each species in the
  v1 acceptance roster, in both pre-bootstrap and post-bootstrap
  states for Avatars.
- Vision tests continue to pass against the relocated walk
  unchanged in behavior.
- The masking edge cases above each have a dedicated test.
- Augmentation: bootstrap installs the implant; sensorium walks
  augments; removing the implant strips ESP modalities;
  re-installing restores them.
- Per-frame modality reception gating: each of the four
  reception-gating scenarios above is a dedicated test
  (deaf+say, actor-bypass+self-frame, implant-less+dm,
  no-meta+system-frame-delivers).

---

## Cross-references

### Seeding slates
- [docs/slates/senses-slate.md](../slates/senses-slate.md) — the
  unified `Modality` substrate, organ-gates-modality,
  three physics families, gestalt verb, ESP-as-modality framing,
  Wave 1/2/3 build plan.
- [docs/slates/sound-slate.md](../slates/sound-slate.md)
  (tombstone) — the acoustic depth absorbed into this build's
  hearing instance.
- [docs/slates/augmentation-slate.md](../slates/augmentation-slate.md)
  — Wave 1 (implantable affordance + baseline implant) pulled in
  to give ESP organs a substrate home; Wave 2+ (install/remove
  procedure, other augments, char-gen loadout, failure modes,
  generalized contribute-capability) remain.

### Relevant subsystem docs
- [docs/subsystems/senses.md](../subsystems/senses.md) — the
  authoring substrate that shipped 2026-06; this build extends it
  with the physics half + per-frame modality attribution.
- [docs/subsystems/light.md](../subsystems/light.md) — vision
  exemplar; the LightApi walk that relocates into VisionModality.
- [docs/subsystems/biome.md](../subsystems/biome.md) — atmosphere
  medium for vacuum-blocks behavior; per-detail temperature
  override chain for contact thermoreception; new ambient SPL
  field follows the same pattern as `_defaultTemperature`.
- [docs/subsystems/boundary.md](../subsystems/boundary.md) —
  Conduit interfaces; new `SmellConduit` / `SoundConduit` follow
  the existing `LightConduit` shape.
- [docs/subsystems/race.md](../subsystems/race.md) — BodyPlan;
  the cranial slot gets added to biped and quadruped body plans;
  the existing `sensoryPorts` mechanism stays available for
  future telepath species without exercise in v1.
- [docs/subsystems/slot.md](../subsystems/slot.md) — the unified
  `SlotSpec` universe that the cranial slot graduates from;
  reuse, not parallel.
- [docs/subsystems/embodiment.md](../subsystems/embodiment.md) —
  body-side affordance precedent for the implant
  (`SlottableMixin` reuse).
- [docs/subsystems/messaging.md](../subsystems/messaging.md) —
  `Scene` composer gains `.modality(name)`; `MessageFrame.meta`
  gains `modality?: string`; `SensorMixin.filterMessage` gains
  the modality check; `AetherMixin.dm` is the ESP network-
  routing layer (unchanged behavior, now annotated with
  `meta.modality`).
- [docs/subsystems/perception.md](../subsystems/perception.md) —
  the viewer-aware-query pattern this substrate honors (viewer
  always explicit, `Stuff & Sensor`); the modality-level filtering
  pattern this build wires up (was documented, now implemented).
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  `Quantity<U>` substrate; new tag-tables for dB, Hz, ppm follow
  the existing pattern.
- [docs/subsystems/persistence.md](../subsystems/persistence.md) —
  scalar-default rule for value-object storage.
- [docs/antipatterns.md](../antipatterns.md) — "go through the API
  layer", method-surface rules, no premature abstraction.

### Related requirements
- None currently in flight. The vitals slate and NPC behavior
  slate are named non-goals; this build doesn't constrain them.
  The augmentation slate's Wave 1 is in scope here; Wave 2+ get
  their own requirements when content earns them.
