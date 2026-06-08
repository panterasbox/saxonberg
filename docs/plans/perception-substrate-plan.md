# Perception substrate — implementation plan

> Graduates [docs/requirements/perception-substrate-requirements.md](../requirements/perception-substrate-requirements.md)
> (seeded by [senses-slate.md](../slates/senses-slate.md); absorbs the
> retired [sound-slate.md](../slates/sound-slate.md); pulls in Wave 1 of
> [augmentation-slate.md](../slates/augmentation-slate.md)).
>
> The senses build that shipped 2026-06 delivered the **authoring** half
> (per-sense `Detail` maps, `<sense channel="X">` MML wrappers,
> `senseStripAugmenter`, four contact-only verbs, gestalt `sense`). This
> build delivers the **physics** half: a unified `PerceptionApi` +
> `Modality` substrate that vision, smell, sound, touch, taste,
> verbal-ESP, and emotive-ESP instantiate as modality singletons; honest
> field propagation walks for smell and sound; ambient + contact
> thermoreception for touch; the organ-gates-modality rule widened to
> walk both BodyPlan organs and installed augments via
> `PerceptionApi.sensorium`; the implantable-augment affordance + the
> baseline comm implant that gives every Avatar ESP organs through
> Wave 1 of the augmentation slate; per-frame modality attribution
> wired through `MessageFrame.meta.modality` for reception gating at
> `SensorMixin.filterMessage`; and the `tell` → `dm` rebrand. `LightApi`
> dissolves into the new substrate as the vision modality's
> implementation.

This plan assumes the reader knows the Idea / Hydrator / mixin
framework primitives — when in doubt, defer to the subsystem docs
referenced inline rather than restating them. Per the requirements
doc's closed-scope rule, every "Surface decision" in the requirements
is final; this plan is the *how*, not the *what*.

## Phasing overview

Nine phases, each independently sanity-checkable (`pnpm -C
packages/server build && pnpm -C packages/server test` green before
moving on). Phase 1 is the load-bearing substrate that everything else
slots into; Phases 2–5 are the four modality implementations (vision is
a relocation; smell, sound, touch are net-new walks); Phase 6 lands
the augmentation Wave 1 affordance + baseline implant (which is what
puts ESP modalities in any Avatar's sensorium); Phase 7 wires per-frame
modality attribution + reception gating; Phase 8 is the `tell` → `dm`
rebrand; Phase 9 is the docs sweep.

| Phase | Scope | Roughly |
|---|---|---|
| 1 | `Modality` base + 7 modality singletons + seeds + `PerceptionApi` + `modalityByName` + retire `SpeciesApi.deriveSensorium` | 180 min |
| 2 | Vision migration — `api/light.ts` deletion, walk relocates into `VisionModality.signalAt`, instrument controllers update | 90 min |
| 3 | Smell — `Smell` value object + `SmellSourceMixin` + `SmellConduit` + Door/Window impl + `SmellModality.signalAt` walk + bare `smell` verb upgrade + masking + ppm tag table | 180 min |
| 4 | Sound — `Sound` value object + `SoundSourceMixin` + `SoundConduit` + Door/Window impl + `SoundModality.signalAt` walk + `Biome._defaultAmbientSoundLevel` + `BiomeApi.resolveAmbientSoundLevelFor` + `SoundLevelMeter` instrument + `measure sound` verb + bare `listen` verb upgrade + masking + dB/Hz tag tables | 240 min |
| 5 | Touch — `Touch` value object + `TouchBand` + `TouchModality.signalAt` reads biome + bare `feel` ambient line + targeted `feel <target>` per-Detail temperature read | 90 min |
| 6 | Augmentation Wave 1 — augment-confers-mixin substrate (`AugmentMixin.confers()`, `MixinApi.getActiveMixins`/`isActive`, predicate generator routes through `isActive`, `@RequiresActive` decorator, `_augmentGated` + `_grantsModalities` on AetherMixin) + cranial slot on biped/quadruped + `BaselineCommImplant` template + Avatar bootstrap + ESP validators | 240 min |
| 7 | Per-frame modality attribution + reception gating — `MessageFrame.meta.modality` in `@saxonberg/types` + `Scene.modality(name)` + `VocalMixin.say`/`AetherMixin.dm` populate modality + `SensorMixin.filterMessage` modality check + actor bypass | 120 min |
| 8 | `tell` → `dm` rebrand — YAML rename + controller rename + AetherMixin method rename + topic rename + alias wiring + `requiresVerbalESP` adoption | 75 min |
| 9 | Docs sweep — `senses.md` rewrite, `light.md` LightApi retirement, `messaging.md` modality-attribution wire-up, `perception.md` impl note, `race.md` cranial slot note, new `augmentation.md`, slate status updates, `architecture.md` + `antipatterns.md` additions | 90 min |

**Hard dependency edges:**

- Phase 1 blocks Phases 2–7 (every modality and `sensorium` walk needs
  the base class + Api).
- Phases 3 and 4 are independent — **can land in either order or in
  parallel slices on a branch**. Each ships its own value object,
  source mixin, conduit, walk, verb upgrade.
- Phase 5 only depends on Phase 1 (the existing biome chain is
  already in place; `TouchModality.signalAt` just calls
  `BiomeApi.resolveTemperatureFor`).
- Phase 6 depends on Phase 1 (`PerceptionApi.sensorium` walks the
  active mixin set for `_grantsModalities`; augments confer mixins;
  the modality singletons resolved at the end of that chain are
  Phase 1's).
- Phase 7 depends on Phase 1 (the modality check uses
  `PerceptionApi.canPerceive`) and on Phase 6 if you want the deaf /
  implant-less acceptance tests green (otherwise the gating works,
  just no v1 species exercises a missing-ESP-modality scenario).
- Phase 8 depends on Phase 6 (`requiresVerbalESP` exists) and Phase 7
  (modality attribution wired). Both must land before the rebrand
  exercises its full design.
- Phase 9 (docs) gates only the merge.

```
Phase 1 (substrate)  ──┬──→ Phase 2 (vision migration)
                       │
                       ├──→ Phase 3 (smell)        ────┐
                       │                                │
                       ├──→ Phase 4 (sound)        ────┤
                       │                                ↓
                       ├──→ Phase 5 (touch)        ────┘
                       │
                       └──→ Phase 6 (augmentation Wave 1)
                                  │
                                  ↓
                        Phase 7 (reception gating)
                                  │
                                  ↓
                          Phase 8 (dm rebrand)
                                  │
                                  ↓
                          Phase 9 (docs sweep)
```

A weekend split: Friday evening, Phase 1. Saturday: Phase 2, then
Phases 3/4 in parallel slices (smell first since it's smaller),
then Phase 5. Sunday morning, Phase 6 + Phase 7. Sunday afternoon,
Phase 8 + Phase 9.

---

## Phase 1 — `Modality` substrate + seven modality singletons + `PerceptionApi`

Goal: stand up the modality-singleton hierarchy modeled on
[`LocomotionMode`](../subsystems/locomotion.md), the seven concrete
subclasses, the seed YAMLs, the `modalityByName` lookup helper, the
`PerceptionApi` with the four-method surface, and retire
`SpeciesApi.deriveSensorium`.

### Files

- **Create** `packages/server/src/mud/lib/perception/Modality.ts`:
  ```ts
  export type ModalityFamily = 'field' | 'contact' | 'network';

  /** Marker type — each modality returns its own value-object shape. */
  export type Signal = unknown;

  /** Marker type — each modality returns its own percept shape. */
  export type Percept = unknown;

  export class Modality
    extends SingletonMixin(PropertiedMixin(Idea))
  {
    protected name: string = '';
    protected family: ModalityFamily = 'field';
    protected modality: string = '';

    static persistentFields = ['name', 'family', 'modality'];

    public getName(): string { return this.name; }
    public setName(value: string): void { /* non-empty invariant */ }
    public getFamily(): ModalityFamily { return this.family; }
    public setFamily(value: ModalityFamily): void { /* union invariant */ }
    public getModality(): string { return this.modality; }
    public setModality(value: string): void { /* non-empty invariant */ }

    /** Default returns null — contact/network modalities keep this. */
    public signalAt(_loc: Stuff & Container): Signal | null { return null; }
    public perceiveFor(_viewer: Stuff & Sensor, _signal: Signal): Percept | null {
      return null;
    }
  }
  ```
  Setter invariants reject empty strings; `setFamily` rejects values
  outside the three-member union. No `LightConduit`/`SmellConduit`
  imports — the base class is modality-agnostic.

- **Create** `packages/server/src/mud/lib/perception/modalities/` directory
  with seven files (all extend `Modality`, all marked
  `_isModalitySingleton = true` for future detection if needed but no
  current consumer):
  - `VisionModality.ts` — exports `class VisionModality`. Phase 1 stub:
    `signalAt` returns `null` (relocated walk lands in Phase 2);
    `perceiveFor` returns `null` (also Phase 2). Stub keeps Phase 1
    green; Phase 2 fills the bodies.
  - `SmellModality.ts` — stub (filled in Phase 3).
  - `SoundModality.ts` — stub (filled in Phase 4).
  - `TouchModality.ts` — stub (filled in Phase 5).
  - `TasteModality.ts` — empty subclass (taste is contact-only, no
    `signalAt` override — inherits null).
  - `VerbalESPModality.ts` — empty subclass. v1 `signalAt` returns
    `null` per the hybrid framing's reserved seam (network-routing is
    `AetherMixin.dm`, not `signalAt`).
  - `EmotiveESPModality.ts` — same shape as VerbalESP.

- **Create** `packages/server/src/mud/seeds/lib/perception/modalities/`
  with seven YAMLs (parallel to `seeds/lib/locomotion/`):
  - `vision.yaml`:
    ```yaml
    class: /lib/perception/modalities/VisionModality
    hydratorClass: /lib/persistence/PersistentHydrator
    data:
      name: vision
      family: field
      modality: vision
    ```
  - `smell.yaml` — `family: field`, `modality: smell`.
  - `sound.yaml` — `family: field`, `modality: hearing` (note: the
    BodyPlan organ key is `hearing`, the modality name is `sound`).
  - `touch.yaml` — `family: contact`, `modality: touch`.
  - `taste.yaml` — `family: contact`, `modality: taste`.
  - `verbal-esp.yaml` — `family: field`, `modality: verbal-esp`.
  - `emotive-esp.yaml` — `family: field`, `modality: emotive-esp`.

- **Modify** `packages/server/src/mud/bootstrap.ts` — add
  `{ templatePathPrefix: '/lib/perception/modalities/' }` so the seven
  modality singletons clone at boot. Place adjacent to the existing
  `/lib/locomotion/` prefix entry.

- **Create** `packages/server/src/mud/api/perception.ts`:
  ```ts
  export class PerceptionApi {
    /** Resolve a modality singleton by name. */
    public static modalityByName(name: string): Modality {
      const path = `/lib/perception/modalities/${name}`;
      const ch = StuffApi.findByTemplatePath<Modality>(path);
      if (!ch) throw new Error(`PerceptionApi: no modality '${name}' at ${path}`);
      return ch;
    }

    public static signalAt(
      loc: Stuff & Container,
      modality: Modality,
    ): Signal | null {
      return modality.signalAt(loc);
    }

    public static perceiveAt(
      viewer: Stuff & Sensor,
      loc: Stuff & Container,
      modality: Modality,
    ): Percept | null {
      const signal = modality.signalAt(loc);
      if (signal === null) return null;
      return modality.perceiveFor(viewer, signal);
    }

    /**
     * Effective sensorium — viewer's innate organs (BodyPlan
     * sensoryPorts → modality strings, resolved into modality
     * singletons) ⊕ contributions from each Stuff in any of the
     * viewer's slots that composes AugmentMixin.
     * Returns [] for non-Organism viewers.
     */
    public static sensorium(viewer: Stuff): readonly Modality[] {
      // Phase 1: walks BodyPlan modalities only — augment walk lands
      // in Phase 6.
      // ...
    }

    public static canPerceive(
      viewer: Stuff,
      modality: Modality,
    ): boolean {
      return this.sensorium(viewer).some((c) => c === modality);
    }
  }

  SecurityApi.decorateApiClass(PerceptionApi);
  ```
  `sensorium` for Phase 1 does only the innate-organ walk (replicating
  `SpeciesApi.deriveSensorium`'s logic, mapping each modality string
  to its modality singleton via `modalityByName`). The augment walk is
  added in Phase 6. Non-Organism viewers, missing Species, missing
  BodyPlan all return `[]` (matches the defensive-shape contract
  per the requirements doc's "Animacy / sensorium widening"
  constraint).

- **Modify** `packages/server/src/mud/lib/description/Visible.ts` —
  `senseStripAugmenter` switches from `SpeciesApi.deriveSensorium` to
  `PerceptionApi.sensorium(viewer)`, mapping the returned modalities to
  their `getModality()` to compare against the `SenseChannel` literals
  in the existing filter intersection. (The five physical modalities'
  modalities ARE the `SenseChannel` literals, so the mapping is
  identity for non-ESP modalities; ESP modalities' modalities aren't in
  the `SenseChannel` union and naturally drop from the filter
  intersection — augmenter behavior preserved.)

- **Modify** the four physical `requires*` validators
  (`requiresSmell.ts`, `requiresHearing.ts`, `requiresTouch.ts`,
  `requiresTaste.ts`):
  ```ts
  const validator: CommandValidator = (context) => {
    const giver = context.commandGiver;
    if (PerceptionApi.canPerceive(giver, PerceptionApi.modalityByName('smell'))) return undefined;
    return 'You have no sense of smell.';
  };
  ```
  Same refusal strings; same shape. Caching the modality singleton at
  module load is NOT required (the lookup is O(1)).

- **Modify** `packages/server/src/mud/api/species.ts` — **delete**
  `SpeciesApi.deriveSensorium`. The other methods stay. Remove the
  `SenseChannel` import if it becomes dead.

- **Modify** `packages/server/src/mud/api/__tests__/species.test.ts` —
  drop the `deriveSensorium` tests; they reincarnate as
  `PerceptionApi.sensorium` tests below.

### Tests

- **Create**
  `packages/server/src/mud/lib/perception/__tests__/Modality.test.ts`
  — base class field round-trip, setter invariants reject invalid
  family values, empty strings rejected on name/modality, default
  `signalAt` / `perceiveFor` return null.
- **Create**
  `packages/server/src/mud/lib/perception/modalities/__tests__/modality-singletons.test.ts`
  — for each of the seven modalities, assert
  `StuffApi.findByTemplatePath('/lib/perception/modalities/<name>')`
  resolves at boot and carries the expected `name` / `family` /
  `modality`. HMR test: reload one modality subclass, verify next
  method dispatch hits the reloaded behavior (mirror the
  `LocomotionMode` HMR test pattern).
- **Create**
  `packages/server/src/mud/api/__tests__/perception.test.ts`:
  - `modalityByName('vision')` returns the VisionModality singleton;
    unknown name throws.
  - `sensorium(non-Organism)` returns `[]`.
  - `sensorium(homo-sapiens-avatar)` returns
    `[VisionModality, SoundModality, SmellModality]` (matching the v1
    biped BodyPlan: vision + hearing + smell ports). Note modality
    singletons are compared by identity; the modality `'hearing'`
    maps to the modality named `'sound'`.
  - `sensorium(peace-lily)` returns `[]` (sessile).
  - `canPerceive(viewer, modality)` returns true ↔ modality in
    sensorium.
- **Modify**
  `packages/server/src/mud/lib/description/__tests__/Visible.senseStrip.test.ts`
  — exercises the same shape but reads via `PerceptionApi.sensorium`
  internally; existing test cases (default sensorium, filter-only,
  intersection) all pass unchanged.
- **Modify**
  `packages/server/src/mud/lib/command/validators/__tests__/requiresSensorium.test.ts`
  — same shape; ensure the four physical validators all use
  `PerceptionApi.canPerceive`.

### Acceptance signal

- `pnpm -C packages/server build` clean.
- `pnpm -C packages/server test` green.
- Boot logs report seven `/lib/perception/modalities/*` clones.
- `grep "SpeciesApi.deriveSensorium" packages/server/src` returns
  zero hits.

### Risks / decisions left to the builder

- **Modality → singleton mapping in `sensorium`.** Phase 1's
  `PerceptionApi.sensorium` walks `BodyPlan.sensoryPorts.modality`
  (strings like `'vision'`, `'hearing'`, `'smell'`) and resolves each
  to a modality singleton. The mapping is by `getModality()` lookup
  across all seven singletons. The simplest implementation iterates
  `StuffApi.findByTemplatePath('/lib/perception/modalities/<modality>')`
  for each port-modality string — but note `'hearing'` modality maps
  to modality `'sound'`. The cleanest path: walk the seven loaded
  modality singletons once, build a `Map<modality, Modality>`
  on first call (cached on the Api as a private static lazy
  initializer, invalidated by an HMR hook subscribed on
  `Events.StuffCreated` / `Events.StuffDestructed` filtered to
  `/lib/perception/modalities/`). Mirror the `TopicCatalogue` HMR
  pattern.
- **`Modality` lives in `lib/perception/`, modality subclasses
  in `lib/perception/modalities/`.** The `Modality` suffix on the
  subclass files avoids collision with the value-object files one
  level up (`lib/perception/Smell.ts` is the value object;
  `lib/perception/modalities/SmellModality.ts` is the singleton).
  Requirements doc § File organization spells this out — verify the
  imports stay disambiguated.
- **`Signal` / `Percept` marker types.** Both are `unknown` in v1 per
  the requirements doc's "No premature substrate widening" constraint.
  Channel methods narrow at the call site (e.g. `VisionModality.signalAt`
  returns `Light | null`; consumers narrow on `instanceof Light`).

### Rough size estimate

180 min — the substrate itself is small, but seven concrete subclasses
+ seven YAMLs + the bootstrap wiring + the four validator updates +
the augmenter update + `deriveSensorium` retirement + tests on all
seven modalities add up.

---

## Phase 2 — Vision migration: `api/light.ts` retires into `VisionModality.signalAt`

Goal: relocate the propagation walk from `api/light.ts` into
`lib/perception/modalities/VisionModality.ts`'s `signalAt`, update the
two instrument controllers, retire dead surface, delete `api/light.ts`.

Vision-specific value types (`Light`, `LightBand`, `AmbientLitMixin`,
`LightSourceMixin`, `LightConduit`) stay in `lib/perception/` and
`lib/boundary/` — they're the modality's domain, not Api-shaped.

### Files

- **Modify**
  `packages/server/src/mud/lib/perception/modalities/VisionModality.ts`:
  - Override `signalAt(loc: Stuff & Container): Light | null` — the
    body is the lifted `walkFluxAt` + flux→lux divide + source
    finalization + `Light.from` wrap from `api/light.ts:192-204`.
    Returns `Light.ZERO` (not `null`) when no signal — preserves the
    pre-migration contract.
  - Override `perceiveFor(viewer, signal): VisionPercept | null` — for
    v1 the "percept" shape is just the perceived `LightBand` after the
    species vision profile band-shift + `perceivedBandModifier` shadow
    hook. Returning a thin object `{ band, signal }` is enough; the
    instrument controllers consume `signal` directly via `signalAt`.
  - **Internal helper functions** (`walkFluxAt`, `newAccumulator`,
    `addContribution`, `finalizeSources`, `mixColorTemperature`,
    `mergeAttenuated`, `readSizeScale`, `asBoundaryAnchor`,
    `findLightConduit`, `isLightConduit`) — copy verbatim from
    `api/light.ts`. They were always module-private; just move them
    inside `VisionModality.ts` as module-level functions.
  - **Constants** (`MAX_HOPS`, `EXIT_TAU`, `LUX_SCALE`) — move with
    the helpers. Export `MAX_HOPS` from `VisionModality.ts` so the
    smell and sound walks (Phases 3, 4) can use the same depth cap
    by importing it (modality-level walks share the depth budget, not
    the walker code).

- **Modify** `packages/server/src/mud/lib/perception/Light.ts`:
  - Move `bandFor(luxValue)` and the related `LIGHT_BAND_SET`,
    `applyBandShift`, `compareBand`, `REQUIRED_BAND_FOR_DETAIL`,
    `ShadowQuality` from `api/light.ts` to live alongside `Light` —
    they're vision-modality domain.
  - Add a vision-helper exported function or static
    `Light.viewerVisionProfile(viewer)` (relocated from
    `LightApi.viewerVisionProfile`) — `VisionModality.perceiveFor`
    calls it internally.
  - Move the `LightSourceObserver` interface from `api/light.ts` to
    `LightSource.ts` next to `LightSourceMixin`. Witness-hook
    consumers update their import paths.

- **Modify** `packages/server/src/mud/obj/command/MeasureLightController.ts`:
  - Replace `LightApi.lightAt(loc)` with
    `const modality = PerceptionApi.modalityByName('vision'); const light = PerceptionApi.signalAt(loc, modality) as Light;`.
  - Same body emission, same topic; observable behavior unchanged.

- **Modify** `packages/server/src/mud/obj/command/AnalyzeLightController.ts`:
  - Same swap. The body it generates uses `Light` fields directly
    (intensity, color, sources) — that consumption stays unchanged.

- **Delete** `packages/server/src/mud/api/light.ts`.

- **Delete** `packages/server/src/mud/api/__tests__/light.test.ts`
  (if it exists) or **rename** to
  `packages/server/src/mud/lib/perception/modalities/__tests__/VisionModality.test.ts`
  and update the call sites:
  - `LightApi.lightAt(loc)` → `PerceptionApi.signalAt(loc, modalityByName('vision'))`
  - `LightApi.bandAt(loc)` → `bandFor(signal.intensity.rawValue())`
    (via the relocated helper)
  - `LightApi.perceivedBand(viewer, loc)` → call
    `modality.perceiveFor(viewer, signal)` and read `.band`
  - `LightApi.canSee(...)` — the visibility detail-gate threshold
    logic moves into `Light.canSee(viewer, target, detail)` or a
    `VisionModality.canSee` method. Pick the location that minimizes
    churn for tests; recommend a static on `Light` since the helpers
    already live there.

- **Modify** `packages/server/src/mud/lib/perception/Perception.ts` —
  JSDoc references to `LightApi` retarget to `PerceptionApi` /
  `VisionModality`.

### Tests

- **Modify / Move** all existing vision tests to
  `lib/perception/modalities/__tests__/VisionModality.test.ts`:
  - Cross-boundary propagation through open Door
  - Closed Door blocks propagation
  - Closed Window blocks
  - Ambient + emitter accumulation
  - Doored exits single-count (boundary walk handles, exit skip)
  - Depth cap respected (3-hop chain returns 2-hop only)
  - Cycle guard (room ↔ room via doors don't loop)
  - Source cap (>3 contributors → top 3 by flux)
  - Color temperature flux-weighted average
- Two new round-trip tests:
  - `MeasureLightController` produces the same readout pre- and
    post-migration (assert via golden output).
  - `AnalyzeLightController` produces the same provenance breakdown.

### Acceptance signal

- `grep -rn "LightApi" packages/server/src --include='*.ts'` returns
  zero hits (other than any intentional doc-comment rename).
- `grep -rn "from '.*api/light'" packages/server/src --include='*.ts'`
  returns zero hits.
- Vision propagation test suite passes in its new home.
- Both instrument controllers produce byte-identical readouts pre
  and post.

### Risks / decisions left to the builder

- **`canSee` / `perceivedBand` / `shadowsAt` placement.** The
  requirements doc absorbs the dead surface — generic detection moves
  to `PerceptionApi.canPerceive`; vision-specific band-threshold moves
  into `VisionModality.perceiveFor`. The builder decides whether
  `canSee` becomes a static on `Light` (cleanest — sits next to the
  band vocabulary) or a method on `VisionModality` (more consistent
  with the modality-owns-its-vocabulary framing). Recommend
  `Light.canSee(viewer, target, detail)` — static helper, next to the
  band vocabulary, mirrors the existing `bandFor` / `compareBand`
  pattern. `shadowsAt` currently has no callers; drop it entirely or
  leave as a vision helper on `Light` if the test suite asserts on it
  (test grep first).
- **`Signal` is `unknown` — caller narrowing pattern.** Each
  consumer-facing call site that knows it's reading vision does
  `PerceptionApi.signalAt(loc, modalityByName('vision')) as Light`.
  The cast is unavoidable given the marker-type stance per the
  requirements doc's "No premature substrate widening" rule. Document
  the pattern in `senses.md`'s subsystem doc once it's in place.
- **`MAX_HOPS` shared constant.** Export from
  `VisionModality.ts` as the canonical depth budget; Phases 3 and 4
  import it. If the smell / sound walks want a different depth, that's
  per-modality-data on the singleton (add `maxHops: number = 2` as a
  persistent field) — but per the requirements doc's "Per-modality
  walks, not a generic walker" decision, keep it ad-hoc per modality
  in v1.

### Rough size estimate

90 min — most of the time is moving code and re-routing two
controllers + updating test imports. The walk body is verbatim.

---

## Phase 3 — Smell: value object + source mixin + conduit + propagation walk + verb upgrade + masking

Goal: ship honest field physics for smell. Independent of Phase 4
(sound) — the two can land in parallel.

### Files

- **Create** `packages/server/src/mud/lib/perception/Smell.ts`:
  ```ts
  export interface SmellSourceRef {
    readonly stuffId: string;
    readonly concentration: number;  // ppm
    readonly identity: string;
  }

  export class Smell {
    public static readonly ZERO: Smell;

    public readonly concentration: Quantity<'ppm'>;
    public readonly identity: string;
    public readonly sources: readonly SmellSourceRef[];

    public static of(concentration, identity, source?): Smell;
    public static from(data: SmellDataShape): Smell;

    public add(other: Smell): Smell;
    public attenuate(factor: number): Smell;
  }
  ```
  Mirror `Light`'s shape exactly: capped source list
  (`SMELL_SOURCE_CAP = 3`), immutable, factory-constructed, JSON
  round-trip. The `identity` field is a string odor identifier
  (`'garlic'`, `'smoke'`, `'pine'`) — when sources contribute different
  identities at similar concentrations, prefer dominant-by-concentration
  for the top-level field.

- **Create** `packages/server/src/mud/lib/perception/SmellSource.ts`:
  ```ts
  export interface SmellSource {
    getEmittedConcentration(): Quantity<'ppm'>;
    setEmittedConcentration(v: Quantity<'ppm'> | number | string): void;
    getOdorIdentity(): string;
    setOdorIdentity(v: string): void;
  }

  export function SmellSourceMixin<TBase>(Base: TBase) { ... }
  ```
  Mirror `LightSourceMixin` exactly: scalar-default persistence
  (`_emittedConcentration: number = 0`, `_odorIdentity: string = ''`),
  per-field invariants on the accessor pair, Witness hook
  `onSmellSourceChanged` fired on the immediate environment when the
  stored value changes (parallel to `LightSourceObserver`). Interface
  declared in `SmellSource.ts`.

- **Create** `packages/server/src/mud/lib/boundary/SmellConduit.ts`:
  ```ts
  export interface SmellConduit extends Conduit {
    readonly conduitKind: 'smell';
    transmissivity(from: BoundarySide, to: BoundarySide): number;
  }
  ```

- **Modify** `packages/server/src/mud/lib/boundary/Conduit.ts` —
  add `'smell'` to the `ConduitKind` union.

- **Modify** `packages/server/src/mud/lib/boundary/Door.ts`:
  - Add a `smellConduitFor(door)` factory at the bottom returning a
    `SmellConduit` whose `transmissivity` returns `door.isOpen() ? 1 : 0`.
  - `getConduits()` returns the new conduit in its array alongside
    Light / Sight / Movement.

- **Modify** `packages/server/src/mud/lib/boundary/Window.ts`:
  - Add a `smellConduitFor(window)` factory: closed shutter → 0,
    open shutter → 1.
  - `getConduits()` exposes it alongside the existing
    Light / Sight conduits.

- **Modify**
  `packages/server/src/mud/lib/perception/modalities/SmellModality.ts` —
  override `signalAt` with a propagation walk parallel to vision's
  but modality-specific:
  - (a) Ambient (room itself): if `loc` composes `AmbientSmellMixin`
    — **but no such mixin exists in v1**. Per the requirements doc
    "Biome ambient sound graduates from prose to typed" decision,
    smell does NOT get a typed ambient field. Skip step (a) entirely;
    room-scope ambient smell comes from non-target `SmellSourceMixin`
    emitters in the room.
  - (b) Contents-side emitters: walk `loc.getContents()` filtered to
    `MixinApi.isSmellSource(item)`, read `getEmittedConcentration()`
    and `getOdorIdentity()`, sum into the accumulator.
  - (c) Fixture-side emitters: walk
    `loc.getFixtureSmellSources()` (NEW method on `AdornableMixin`
    parallel to `getFixtureLightSources`; see below).
  - (d) Cross-boundary: for each Adornment that's a
    BoundaryAnchor, look up the boundary's `SmellConduit`, attenuate
    by `transmissivity`, recurse with `depth + 1`.
  - (e) Cross-exit: doored exits skip (handled by boundary); doorless
    exits recurse at `EXIT_TAU = 1.0`.
  - **Vacuum check:** before recursing into a destination `loc`, read
    `BiomeApi.densityOf(BiomeApi.resolveAtmosphereFor(loc))`. If
    density is 0 (vacuum tag), skip — vacuum blocks smell. (Aligns
    with the requirements doc's "vacuum blocks" rule.)
  - Depth-capped (`MAX_HOPS`); cycle-guarded via `visited` set.

- **Modify**
  `packages/server/src/mud/lib/spatial/Adornable.ts` (or wherever
  `getFixtureLightSources` lives) — add `getFixtureSmellSources(): readonly Stuff[]`,
  default implementation filters `getFixtures()` by
  `MixinApi.isSmellSource`. Same pattern as the existing fixture-side
  light walk.

- **Modify** `packages/server/src/mud/api/mixin.ts`:
  - Add `isSmellSource` type predicate.
  - Add `Mixins.SmellSource: 'SmellSourceMixin'` constant.

- **Modify** `packages/server/src/mud/obj/command/SmellController.ts`:
  - Bare form (`smell` with no target) becomes:
    ```ts
    const modality = PerceptionApi.modalityByName('smell');
    const signal = PerceptionApi.signalAt(loc, modality) as Smell | null;
    // Apply viewer's species olfactoryProfile.acuity threshold +
    // ambient masking (max(threshold, ambient_at_loc)).
    // Render prose via Mml composition with source attribution.
    ```
  - Targeted form (`smell <target>`) keeps the existing per-Detail
    `getDetail(dotted, 'smell')` read via `SingleSenseControllerBase`.
    Distinguish the two branches: if `target.stuff === context.location`
    and `target.via?.detailPath` is empty, run the bare-form field
    read; otherwise inherit the base class behavior.

- **Apply the viewer's `Species.olfactoryProfile.acuity` threshold.**
  The existing field is a scalar tag (e.g. `'dull'`, `'normal'`,
  `'keen'`); map each to a concentration threshold (e.g.
  `dull: 100 ppm`, `normal: 10 ppm`, `keen: 1 ppm`). The mapping
  table is small — declare it as a const inside `SmellModality.ts` or
  on `Smell.ts`; per the requirements doc no profile customization
  is needed in v1. The masking rule:
  `effectiveThreshold = max(acuityThreshold, totalRoomSmellConcentration_excluding_target)`.

- **Create** `packages/server/src/mud/config/quantity-tags.yaml` —
  add a `ppm` tag table entry. The masking table values double as
  the tag thresholds (`dull: 100, normal: 10, keen: 1`); use whatever
  the masking constant table needs.

- **Modify** `packages/server/src/mud/lib/quantity.ts` — add `'ppm'`
  to the `Unit` type union and to the `unitOps` arithmetic registry
  (`ppm` adds + scales like the other physical Quantities).

### Tests

- **Create**
  `packages/server/src/mud/lib/perception/__tests__/Smell.test.ts` —
  value-object factory tests, `add` / `attenuate` round-trip, source
  cap, ppm marshalling.
- **Create**
  `packages/server/src/mud/lib/perception/__tests__/SmellSource.test.ts`
  — mixin contract: get/set emitted concentration, identity setter
  invariants, Witness hook fires on change.
- **Create**
  `packages/server/src/mud/lib/perception/modalities/__tests__/SmellModality.test.ts`
  — propagation:
  - A candle emitting `100 ppm garlic` in room A is perceived in
    room B through an open Door at the same concentration.
  - Closed Door blocks (transmissivity 0 → zero signal in room B).
  - Closed Window's shutter blocks.
  - Vacuum atmosphere blocks regardless of conduit.
  - Depth cap respected.
  - Cycle guard.
  - Source cap (>3 emitters → top 3 by concentration).
- **Create**
  `packages/server/src/mud/lib/boundary/__tests__/Door.smell.test.ts`
  — Door exposes a SmellConduit; open/closed gates it.
- **Create**
  `packages/server/src/mud/lib/boundary/__tests__/Window.smell.test.ts`
  — Window exposes a SmellConduit; shutter open/closed gates it.
- **Modify**
  `packages/server/src/mud/obj/command/__tests__/SmellController.test.ts`
  — bare-form scenarios:
  - Empty room with no emitters → polite "you don't smell anything
    notable here."
  - Room with one candle → "You smell garlic" with source
    attribution.
  - Multiple emitters → top-3 source list.
  - Acuity threshold: a `dull` species in a `5 ppm garlic` room
    perceives nothing; a `keen` species perceives it.
  - Masking: a `1 ppm pine` source in a room saturated with `100 ppm
    garlic` is masked for normal-acuity viewers.
  - Targeted form: existing per-Detail tests pass unchanged.

### Acceptance signal

- All Smell tests pass.
- Bare `smell` verb produces field-physics-driven prose.
- `pnpm build` clean (no broken `'smell'` import).
- The four reception-gating modalities (vision + smell + sound + touch)
  are now substrate-real for one more modality.

### Risks / decisions left to the builder

- **Olfactory profile threshold table is content.** The
  `dull: 100, normal: 10, keen: 1` values are placeholders; the build
  can pick anything sensible (or pull from the senses-slate's notes
  if specified). The point is the threshold mechanism works; numeric
  calibration is content authoring.
- **`Smell` value object vs accumulator type.** Vision's walk uses a
  separate `FluxAccumulator` internal shape then wraps in `Light`.
  Smell can do the same (a `ConcentrationAccumulator`) or accumulate
  directly into `Smell.add()` per recursion. Recommend the
  accumulator pattern for cycle-correctness symmetry with the vision
  walk.
- **Multi-identity merging.** If room A has 50 ppm garlic and room B
  has 30 ppm smoke and they connect through an open door, what does
  the renderer say? Recommend: per-identity accumulation (a
  `Map<identity, accumulator>` internally), with the final `Smell`'s
  top-level `identity` field set to the dominant identity by total
  concentration. The source list carries both identities for prose
  attribution.

### Rough size estimate

180 min — value object + mixin + conduit + 2 Boundary impls + walk +
controller upgrade + threshold table + ppm tag-table is real surface
area. Vision's walk is the template, so coding velocity is high once
the shape locks in.

---

## Phase 4 — Sound: value object + source mixin + conduit + biome ambient + propagation walk + instrument + verb upgrade + masking

Goal: ship honest field physics for sound, parallel in shape to Phase
3. The acoustic depth from the retired
[sound-slate.md](../slates/sound-slate.md) is absorbed here for the
hearing modality instance. Independent of Phase 3 — can land in
parallel.

### Files

- **Create** `packages/server/src/mud/lib/perception/Sound.ts`:
  ```ts
  export interface SoundSourceRef {
    readonly stuffId: string;
    readonly amplitude: number;  // dB
    readonly character: string;
    readonly bandLow: number;   // Hz
    readonly bandHigh: number;  // Hz
  }

  export class Sound {
    public static readonly SILENT: Sound;

    public readonly amplitude: Quantity<'dB'>;
    public readonly dominantBand: { low: Quantity<'Hz'>; high: Quantity<'Hz'> };
    public readonly character: string;
    public readonly sources: readonly SoundSourceRef[];

    public static of(amplitude, band, character, source?): Sound;
    public static from(data: SoundDataShape): Sound;

    public add(other: Sound): Sound;
    public attenuate(factor: number): Sound;
  }
  ```
  Cap source list (`SOUND_SOURCE_CAP = 3`). The
  `add` operator for dB is **logarithmic** (per the existing
  `quantity.ts` comment "dB's logarithmic addition is deferred"). v1
  implements the dB add via the canonical formula:
  `10 * log10(10^(a/10) + 10^(b/10))`. Attenuation is multiplicative
  on linear amplitude → translated to dB subtraction.

- **Create** `packages/server/src/mud/lib/perception/SoundSource.ts`:
  ```ts
  export interface SoundSource {
    getEmittedAmplitude(): Quantity<'dB'>;
    setEmittedAmplitude(v: Quantity<'dB'> | number | string): void;
    getEmittedBand(): { low: Quantity<'Hz'>; high: Quantity<'Hz'> };
    setEmittedBand(low, high): void;
    getCharacter(): string;
    setCharacter(v: string): void;
  }

  export function SoundSourceMixin<TBase>(Base: TBase) { ... }
  ```
  Scalar-default persistence: `_emittedAmplitude: number`,
  `_emittedBandLow: number`, `_emittedBandHigh: number`,
  `_emittedCharacter: string`. Witness hook
  `onSoundSourceChanged` fired on the immediate environment when any
  scalar changes.

- **Create** `packages/server/src/mud/lib/boundary/SoundConduit.ts`:
  ```ts
  export interface SoundConduit extends Conduit {
    readonly conduitKind: 'sound';
    transmissivity(from: BoundarySide, to: BoundarySide): number;
  }
  ```
  This graduates `SoundConduit` from the **existing placeholder** in
  `Conduit.ts` (the requirements doc § "Sound conduit slot" notes it
  was "reserved for the future Sound subsystem"). Delete the
  placeholder, declare it properly in its own file.

- **Modify** `packages/server/src/mud/lib/boundary/Conduit.ts` —
  remove the placeholder `SoundConduit` interface; the new one lives
  in its own file. The `ConduitKind` union already has `'sound'`.

- **Modify** `packages/server/src/mud/lib/boundary/Door.ts` — add a
  `soundConduitFor(door)` factory returning a `SoundConduit` with
  `transmissivity` 0 or 1 on `isOpen()`. `getConduits()` exposes it
  alongside the existing four.

- **Modify** `packages/server/src/mud/lib/boundary/Window.ts` —
  parallel: shutter open/closed gates sound transmissivity.

- **Modify**
  `packages/server/src/mud/lib/perception/modalities/SoundModality.ts` —
  `signalAt` walk:
  - (a) **Ambient** from biome: read
    `BiomeApi.resolveAmbientSoundLevelFor(loc)`. If non-null, add to
    the accumulator as a synthetic source with stuffId of the
    resolving biome (or location, whichever provides the value).
  - (b) Contents-side `SoundSourceMixin` emitters.
  - (c) Fixture-side via new `getFixtureSoundSources()` on
    `AdornableMixin` (parallel to `getFixtureSmellSources` from
    Phase 3 — same shape).
  - (d) Cross-boundary via `SoundConduit`, attenuated by transmissivity
    (multiplied on the linear amplitude scale before re-converting
    to dB).
  - (e) Cross-exit at base transmissivity (`EXIT_TAU = 1.0`).
  - Vacuum check before recursing.
  - Depth-capped, cycle-guarded.

- **Modify** `packages/server/src/mud/lib/biome/Biome.ts`:
  - Add field `protected _defaultAmbientSoundLevel: Quantity<'dB'> | null = null;`
  - Add to `persistentFields` list.
  - Add to `fieldMarshallers`: `_defaultAmbientSoundLevel: QuantityMarshaller.pathFor('dB')`.
  - Add `getDefaultAmbientSoundLevel()` / `setDefaultAmbientSoundLevel(value)`
    parallel to `getDefaultTemperature` / `setDefaultTemperature`.
    Setter uses `assertQuantity(value, 'dB', 'defaultAmbientSoundLevel')`.

- **Modify** `packages/server/src/mud/api/biome.ts` — add
  `resolveAmbientSoundLevelFor(scope, detailKey?): Quantity<'dB'> | null`
  parallel to `resolveTemperatureFor`. Walks the existing chain
  (detail → detail-prefix → room → biome → biome-ancestor → zone →
  universe). Returns `null` if no biome along the chain declares a
  default — silent ambient is the universe-default state, not a
  hard 0 dB.

- **Modify** the biome demonstrative templates under
  `seeds/lib/biome/` — add `_defaultAmbientSoundLevel` to the
  three baseline biomes (universe, outdoor, indoor):
  - `seeds/lib/biome/universe.yaml`: `null` (silent at the root).
  - `seeds/lib/biome/outdoor.yaml`: an authored ambient (e.g. 30 dB
    for a quiet outdoor day; content team value).
  - `seeds/lib/biome/indoor.yaml`: an authored ambient (e.g. 25 dB
    for room tone).
  - Leaf biomes (e.g. cafeteria-atrium showcase) get their own
    overrides.

- **Create**
  `packages/server/src/mud/obj/instrument/SoundLevelMeter.ts` (or YAML
  template + content if instrument templates are YAML-only) — Thing
  template carrying `MeasureSubVerbMixin` contributions for
  `measure sound`. Mirror the `Photometer` precedent for vision.

- **Create**
  `packages/server/src/mud/seeds/obj/instrument/sound-level-meter.yaml`
  — template seed for the SoundLevelMeter Thing.

- **Modify** `packages/server/src/mud/cmd/measure.yaml` — add a
  `sound` subcommand entry alongside the existing
  light/temperature/pressure/etc. subcommands. The verb `measure`
  itself already exists with subcommand routing (no two-word verb
  is introduced). The new subcommand routes to
  `MeasureSoundController`.

- **Create**
  `packages/server/src/mud/obj/command/MeasureSoundController.ts` —
  mirror `MeasureLightController` structure. Reads
  `PerceptionApi.signalAt(loc, modalityByName('sound')).amplitude`
  and emits a self-frame at
  `world.perception.measurement.measure-sound`. Carried-by-instrument
  semantics inherited from the existing `measure` substrate.

- **Modify** `packages/server/src/mud/obj/command/ListenController.ts`
  bare form — same pattern as smell's bare form:
  ```ts
  const modality = PerceptionApi.modalityByName('sound');
  const signal = PerceptionApi.signalAt(loc, modality) as Sound | null;
  // ambient masking: max(viewerThreshold, ambientFromBiome)
  // render prose: "You hear ..." with source attribution and the
  // dominant character/band
  ```
  Targeted form (`listen <target>`) inherits the existing per-Detail
  read from `SingleSenseControllerBase`.

- **Modify** `packages/server/src/mud/api/mixin.ts`:
  - Add `isSoundSource` predicate.
  - Add `Mixins.SoundSource: 'SoundSourceMixin'`.

- **Modify** `packages/server/src/mud/config/quantity-tags.yaml`:
  - Add `dB` tag table (e.g. `'inaudible' < 0`, `'whisper' < 30`,
    `'conversation' < 60`, `'loud' < 80`, `'painful' < 120`).
  - Add `Hz` tag table (e.g. `'low' < 250`, `'midrange' < 4000`,
    `'high' < 20000`).
- **Modify** `packages/server/src/mud/lib/quantity.ts` — add `'ppm'`
  if not done by Phase 3 (it should be; double-check at integration).
  No `dB` unit changes here (declared already; the logarithmic-add
  arithmetic registry entry is what's new — register a dB-specific
  `UnitOps` whose `add` does the logarithmic sum:
  `10 * log10(10^(a/10) + 10^(b/10))`).

### Tests

- **Create**
  `packages/server/src/mud/lib/perception/__tests__/Sound.test.ts` —
  value-object factory, logarithmic `add`, `attenuate` round-trip,
  source cap, dB/Hz marshalling.
- **Create**
  `packages/server/src/mud/lib/perception/__tests__/SoundSource.test.ts`
  — mixin contract.
- **Create**
  `packages/server/src/mud/lib/perception/modalities/__tests__/SoundModality.test.ts`
  — propagation:
  - A whistle blast at 110 dB in room A attenuates predictably across
    an open Door to room B (open-door transmissivity 1 → identical
    dB; partial transmissivity → dB drop).
  - Closed Door blocks.
  - Closed Window's shutter blocks.
  - Vacuum atmosphere blocks regardless of conduit.
  - Biome ambient: walk chain resolves the right
    `_defaultAmbientSoundLevel` per scope.
  - Logarithmic summation: two 60 dB sources sum to 63 dB, not 120.
  - Cycle guard, depth cap.
- **Create**
  `packages/server/src/mud/lib/boundary/__tests__/Door.sound.test.ts`
  and `Window.sound.test.ts`.
- **Create**
  `packages/server/src/mud/lib/biome/__tests__/Biome.ambientSound.test.ts`
  — field round-trip, chain resolution.
- **Create**
  `packages/server/src/mud/obj/command/__tests__/MeasureSoundController.test.ts`
  — reads ambient + emitter; emits the expected dB.
- **Modify**
  `packages/server/src/mud/obj/command/__tests__/ListenController.test.ts`
  bare-form cases:
  - Silent room → polite "you don't hear anything notable here."
  - Room with one whistle → "You hear a piercing whistle" with
    character + source.
  - Masking: a whisper-level (20 dB) source in a 50 dB ambient is
    inaudible to a normal-threshold viewer.
  - Targeted form unchanged.

### Acceptance signal

- All Sound tests pass.
- `pnpm build` clean.
- `measure sound` verb dispatches successfully from a
  `SoundLevelMeter` in inventory; reads the right dB.
- Bare `listen` produces field-physics prose, with masking.

### Risks / decisions left to the builder

- **dB arithmetic.** Logarithmic addition lives in `quantity.ts`'s
  per-unit `UnitOps` registry. Register a dB-specific ops object that
  overrides `add` to do the logarithmic sum. `scale` for dB also has a
  funky behavior (multiplying linear amplitude by a factor → adding
  `10 * log10(factor)` to the dB value) — implement carefully and
  add unit tests in `Quantity.dB.test.ts`. Reference the `quantity.ts`
  pre-existing comment about deferring this.
- **Frequency band representation.** The requirements doc specifies
  `dominantBand: { low: Quantity<'Hz'>, high: Quantity<'Hz'> }`. When
  multiple sources contribute different bands, the walker's merge
  rule needs to be specified — recommend: union the bands (min low,
  max high) for the rendered `dominantBand`; keep per-source bands in
  the source list for prose nuance. Document the choice in the
  value-object's JSDoc.
- **Hearing profile placeholder.** Per the non-goal "`hearingProfile`
  lands per content demand," all v1 species use a default
  hearing threshold (e.g. 0 dB). The masking implementation
  reads from a const-default in `SoundModality`; no species data
  participates yet.
- **`SoundLevelMeter` template authoring.** The instrument-template
  shape is content; mirror `Photometer.ts` or whatever the existing
  measure-light instrument template uses. The whistle content
  (referenced in the senses-slate as the load-bearing v1 consumer)
  authors itself by composing `SoundSourceMixin` onto a Thing
  template; that's content authoring outside this build's scope
  but the build should ship at least one demo whistle in the
  test fixtures.

### Rough size estimate

240 min — sound is the heaviest physical modality: dB arithmetic, Hz
bands, biome ambient field + chain extension, instrument template +
sub-verb + controller + YAML, tag tables for two new units. The
walker shape is templated from vision/smell so velocity is high once
the dB arithmetic stabilizes.

---

## Phase 5 — Touch: `Touch` value object + `TouchModality.signalAt` + bare `feel` ambient line + targeted per-Detail temp read

Goal: ship real touch field physics by reusing the biome temperature
chain. No propagation walk (touch is contact); no source mixin (no
new authoring concept); no conduit. Smallest of the four modality
phases.

### Files

- **Create** `packages/server/src/mud/lib/perception/Touch.ts`:
  ```ts
  export type TouchBand =
    | 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot' | 'scalding';

  export const TOUCH_BANDS: readonly TouchBand[] = [ ... ];

  export class Touch {
    public readonly temperature: Quantity<'K'>;
    public readonly band: TouchBand;

    public static of(temperature: Quantity<'K'>): Touch;
    public static bandFor(temperatureK: number): TouchBand;
  }
  ```
  Band threshold table calibrated against universe baseline 295 K
  (≈ comfortable). Recommended thresholds (build can adjust):
  - `cold < 273` (freezing)
  - `cool < 290`
  - `comfortable < 305`
  - `warm < 320`
  - `hot < 345`
  - `scalding >= 345`

- **Modify**
  `packages/server/src/mud/lib/perception/modalities/TouchModality.ts` —
  override:
  ```ts
  public override signalAt(loc: Stuff & Container): Touch | null {
    if (!MixinApi.isAtmospheric(loc)) return null;
    const tempQ = BiomeApi.resolveTemperatureFor(loc);
    if (!tempQ) return null;
    return Touch.of(tempQ);
  }
  ```
  `perceiveFor` stays default-null (no per-viewer band shift in v1;
  vitals integration is the non-goal that gates this).

- **Modify** `packages/server/src/mud/obj/command/FeelController.ts`:
  - Bare form adds an ambient-temperature line **above** the existing
    per-Detail touch read. Pseudocode:
    ```ts
    const modality = PerceptionApi.modalityByName('touch');
    const touch = PerceptionApi.signalAt(loc, modality) as Touch | null;
    const ambientLine = touch
      ? Mml.compose`The air feels ${touch.band}.`
      : Mml.compose``;
    // Then dispatch the existing per-Detail or location render
    // chain; prepend the ambientLine to the body.
    ```
  - Targeted form (`feel <target>`): if `target.via?.detailPath` is
    present, additionally read
    `BiomeApi.resolveTemperatureFor(target.host, detailKey)` and
    prepend a "It feels <band>." line above the existing detail
    prose. The detail-key lookup follows the existing per-Detail
    temperature override chain on `AtmosphericMixin._detailTemperatures`
    — no new mixin needed (requirements doc explicit).

### Tests

- **Create**
  `packages/server/src/mud/lib/perception/__tests__/Touch.test.ts` —
  band threshold table, factory, K marshalling.
- **Create**
  `packages/server/src/mud/lib/perception/modalities/__tests__/TouchModality.test.ts`
  — `signalAt` returns ambient K from the biome chain; band
  derivation is correct for sentinel values
  (250K → cold, 295K → comfortable, 350K → scalding).
- **Modify**
  `packages/server/src/mud/obj/command/__tests__/FeelController.test.ts`:
  - Bare `feel` in a `295 K` ambient → "The air feels comfortable."
  - Bare `feel` in a `350 K` ambient → "The air feels scalding."
  - Targeted `feel <target>` for a detail with no temperature
    override → no temperature line, just the existing detail prose.
  - Targeted `feel stove` where the detail has `_detailTemperatures.stove = 700K`
    → "It feels scalding." line prepended.

### Acceptance signal

- All Touch tests pass.
- Bare `feel` exhibits ambient-temperature reporting.
- Targeted `feel <target>` reports detail-temperature when authored.

### Risks / decisions left to the builder

- **Band threshold values.** The plan recommends one calibration; the
  build can tune. Document the chosen table in `senses.md` Phase 9.
- **`AtmosphericMixin._detailTemperatures` access pattern.** The
  field exists; the `setTemperature(value, detailKey?)` route already
  handles detail-keyed writes/reads via the biome chain. Verify the
  read path supports detailKey resolution at perception time.
  Inspect `Atmospheric.ts` lines around `_detailTemperatures` and the
  setter that delegates to `BiomeApi.resolveTemperatureFor`.
- **No vitals integration.** Touching a `scalding` surface emits
  prose only; no damage. Per the explicit non-goal.

### Rough size estimate

90 min — small. Value object + modality impl + controller updates +
tests. No propagation, no new mixin, no new biome field.

---

## Phase 6 — Augmentation Wave 1: augment-confers-mixin substrate + baseline implant + ESP validators

Goal: ship Wave 1 of the augmentation slate as a uniform
substrate where augments and mixins are parallel expressions of
capability. Mixin composition is build-time semantics; augment
installation is runtime semantics. The substrate carries the
union through `MixinApi.isActive` / `getActiveMixins`, the
`_augmentGated` + `_grantsX` mixin self-declarations, the
`AugmentMixin.confers()` augment-side surface, and the
`@RequiresActive` method-level decorator. After this phase, every
Avatar has the baseline comm implant in its cranial slot;
`AetherMixin` is `_augmentGated`; `dm()` runs iff the implant is
installed; `MixinApi.isAether(avatar)` reflects active state.

### Files

- **Create** `packages/server/src/mud/lib/augmentation/` (new subsystem
  directory — augmentation IS a subsystem the slate ships; not a
  module-category violation per CLAUDE.md).

- **Create** `packages/server/src/mud/lib/augmentation/Augment.ts`:
  ```ts
  export interface Augment {
    confers(): readonly string[];  // mixin names this augment activates
  }

  export function AugmentMixin<TBase extends MixinConstructor>(Base: TBase) {
    return class AugmentMixin extends Base {
      static _mixinName = 'AugmentMixin';

      /**
       * Mixin names this augment activates when installed. Default
       * returns []. Subclasses override.
       */
      confers(): readonly string[] {
        return [];
      }
    };
  }
  ```
  This is the entire augment-side surface in v1. The augment names
  mixins; the mixins describe their grants.

- **Create**
  `packages/server/src/mud/lib/security/RequiresActive.ts`:
  ```ts
  /**
   * Method decorator: gate the call at runtime on
   * MixinApi.isActive(this, mixinName). Throws
   * InactiveCapabilityError if not active. Lives next to
   * @CallSecurity / @Final / @Unshadowable.
   */
  export class InactiveCapabilityError extends Error {
    constructor(public readonly mixinName: string, public readonly methodName: string) {
      super(`${mixinName}.${methodName} is inactive — no augment confers ${mixinName}`);
    }
  }

  export function RequiresActive(mixinName: string): MethodDecorator {
    return function (target, propertyKey, descriptor: PropertyDescriptor) {
      const original = descriptor.value;
      descriptor.value = function (this: Stuff, ...args: unknown[]) {
        if (!MixinApi.isActive(this, mixinName)) {
          throw new InactiveCapabilityError(mixinName, String(propertyKey));
        }
        return original.apply(this, args);
      };
      return descriptor;
    };
  }
  ```

- **Modify** `packages/server/src/mud/api/mixin.ts` — add the
  active-mixin substrate:
  ```ts
  /**
   * Active mixin set = native composition ∪ augment-conferred.
   *
   * For each mixin in the entity's class chain:
   *   - If !_augmentGated → active (native composition is enough)
   *   - If _augmentGated → active iff some installed augment has
   *     this mixin's name in its confers() list
   *
   * Lazy walk in v1 — no cache. Augment install/remove takes
   * effect immediately.
   */
  static getActiveMixins(stuff: Stuff): readonly MixinClass[] {
    const composed = MixinApi.getMixins(stuff);
    const active: MixinClass[] = [];
    let conferredNames: Set<string> | null = null;
    for (const mixin of composed) {
      if (!mixin._augmentGated) {
        active.push(mixin);
        continue;
      }
      if (conferredNames === null) {
        conferredNames = collectAugmentConferralNames(stuff);
      }
      if (conferredNames.has(mixin._mixinName)) {
        active.push(mixin);
      }
    }
    return active;
  }

  static isActive(stuff: Stuff, mixinName: string): boolean {
    return MixinApi.getActiveMixins(stuff).some(m => m._mixinName === mixinName);
  }
  ```
  Helper `collectAugmentConferralNames(stuff)` walks slot occupants
  via `MixinApi.isAugment` + `Augment.confers()`.

- **Modify** `packages/server/src/mud/api/mixin.ts` — update the
  `is<MixinName>` predicate generator to back onto `isActive`
  rather than `hasMixin`. For un-gated mixins behavior is identical;
  for gated ones the predicate reflects active state. **Uniform
  calling convention across all predicates.** Existing call sites
  see no behavior change for un-gated mixins.

- **Modify** `packages/server/src/mud/lib/message/Aether.ts` —
  rename `tell()` → `dm()` (as part of the augment-gating rework
  since this phase touches the method anyway; Phase 8 handles the
  rest of the rebrand — YAML, controller, topic) and add the
  `_augmentGated`, `_grantsModalities`, and `@RequiresActive`
  declarations to `AetherMixin`:
  ```ts
  export function AetherMixin<TBase>(Base: TBase) {
    return class AetherMixin extends Base {
      static _mixinName = 'AetherMixin';
      static _augmentGated = true;
      static _grantsModalities: readonly string[] = ['verbal-esp', 'emotive-esp'];

      @RequiresActive('AetherMixin')
      dm(target: Stuff & Sensor, text: string): void {
        // existing implementation, renamed from tell()
      }
    };
  }
  ```

- **Create**
  `packages/server/src/mud/lib/augmentation/BaselineCommImplant.ts`:
  ```ts
  /**
   * BaselineCommImplant — Wave 1 implant Thing template. Composes
   * SlottableMixin (targets cranial slot) + TangibleMixin (small
   * cybernetic object) + AugmentMixin (confers AetherMixin).
   */
  export class BaselineCommImplant extends AugmentMixin(SlottableMixin(TangibleMixin(Thing))) {
    static readonly TEMPLATE_PATH = '/lib/augmentation/BaselineCommImplant';

    override confers(): readonly string[] {
      return ['AetherMixin'];
    }
  }
  ```

- **Create**
  `packages/server/src/mud/seeds/lib/augmentation/baseline-comm-implant.yaml`:
  ```yaml
  class: /lib/augmentation/BaselineCommImplant
  hydratorClass: /lib/persistence/PersistentHydrator
  data:
    name: baseline-comm-implant
    shortDescription: "a baseline comm implant"
    longDescription: "A small, hardened cybernetic device."
    targetSlot: cranial
    mass: { value: 0.005, unit: kg }
    # ... other Tangible / Slottable / Named author fields
  ```
  Content-call fields (material, full prose) are author-tunable.

- **Modify** `packages/server/src/mud/lib/mixin.ts` — add
  `Mixins.Augment: 'AugmentMixin'`.

- **Modify** `packages/server/src/mud/api/mixin.ts` — add
  `MixinApi.isAugment(obj)` predicate.

- **Modify** `packages/server/src/mud/lib/slot/Slotted.ts` — add
  `'implant'` to the slot's `accepts` validation. But — per the
  requirements doc, the slot's `accepts` is the OCCUPANT'S mixin name
  (e.g. `'SlottableMixin'`), not a slot-kind tag. The `cranial` slot
  declares `accepts: SlottableMixin` (mirroring how `'hand:left'`
  declares `accepts: WieldableMixin`); the *implant slot kind* is
  encoded in the slot's `name` (`'cranial'`) and in the augment's
  `targetSlot: 'cranial'`. **No `Slotted.ts` change required** — the
  requirements doc's "BodyPlan.slots gains the 'implant' slot kind"
  language is satisfied by adding a new `cranial` named slot with
  `accepts: SlottableMixin` to biped/quadruped BodyPlans. The
  semantic kind ("implant") is documented prose, not a new validation
  enum. (Verify this against `Slotted.ts:validateSlotSpecs` — if it
  hard-codes a slot-kind enum, the requirements decision needs a
  validator extension. Current code shows it validates `accepts`
  against the `Mixins` registry only.)

- **Modify**
  `packages/server/src/mud/seeds/lib/body-plans/biped.yaml`:
  ```yaml
  slots:
    # ... existing slots ...
    - { name: cranial, accepts: SlottableMixin }
  ```
- **Modify**
  `packages/server/src/mud/seeds/lib/body-plans/quadruped.yaml` —
  same addition.
- **Do NOT modify** `sessile.yaml` (plants don't get implants).

- **Modify** `packages/server/src/mud/bootstrap.ts` — add
  `{ templatePathPrefix: '/lib/augmentation/' }` so the baseline
  implant template clones at boot.

- **Modify** `packages/server/src/mud/api/perception.ts`'s
  `sensorium` method — walk the active mixin set for
  `_grantsModalities` declarations:
  ```ts
  public static sensorium(viewer: Stuff): readonly Modality[] {
    const innate = walkInnateOrgans(viewer);  // Phase 1 logic (BodyPlan.sensoryPorts)
    const grantedNames = new Set<string>();
    for (const mixin of MixinApi.getActiveMixins(viewer)) {
      const grants = (mixin as { _grantsModalities?: readonly string[] })._grantsModalities;
      if (grants) {
        for (const name of grants) grantedNames.add(name);
      }
    }
    const granted = [...grantedNames].map(name => PerceptionApi.modalityByName(name));
    return dedupe([...innate, ...granted]);
  }
  ```
  Augment conferral is transparent here — `MixinApi.getActiveMixins`
  already includes augment-conferred mixins; their
  `_grantsModalities` flow in without `sensorium` knowing about
  augments directly. Lazy walk in v1; cache layer when profiling
  shows load.

- **Modify** `packages/server/src/mud/obj/Avatar.ts` — `enter` method:
  - Before `startAutoSave`, run:
    ```ts
    await this.bootstrapBaselineImplant();
    ```
  - Add private async method:
    ```ts
    private async bootstrapBaselineImplant(): Promise<void> {
      if (!MixinApi.isSlotted(this)) return;
      const cranial = this.getOccupant('cranial');
      if (cranial && MixinApi.isAugment(cranial)) return;  // idempotent
      const implant = await StuffApi.clone<BaselineCommImplant>(
        BaselineCommImplant.TEMPLATE_PATH,
      );
      await SlotApi.occupy(this, 'cranial', implant);
    }
    ```
  - Idempotent: re-entry on an Avatar already carrying the implant
    short-circuits. Test fixture flows that bypass `enter` may install
    via `SlotApi.occupy` directly.

- **Create**
  `packages/server/src/mud/lib/command/validators/requiresVerbalESP.ts`:
  ```ts
  const validator: CommandValidator = (context) => {
    const giver = context.commandGiver;
    const ch = PerceptionApi.modalityByName('verbal-esp');
    if (PerceptionApi.canPerceive(giver, ch)) return undefined;
    return 'You have no way to send a thought.';
  };
  export default validator;
  ```

- **Create**
  `packages/server/src/mud/lib/command/validators/requiresEmotiveESP.ts`
  — same shape with modality `'emotive-esp'` and refusal
  "You have no way to send a feeling."

### Tests

- **Create**
  `packages/server/src/mud/lib/augmentation/__tests__/Augment.test.ts`
  — `AugmentMixin` default `confers()` returns []; subclass
  override returns mixin names.
- **Create**
  `packages/server/src/mud/lib/augmentation/__tests__/BaselineCommImplant.test.ts`
  — clones from template path; composes
  `Slottable + Tangible + Augment`; `confers()` returns
  `['AetherMixin']`.
- **Create**
  `packages/server/src/mud/lib/security/__tests__/RequiresActive.test.ts`
  — decorator allows the call when `MixinApi.isActive` returns
  true; throws `InactiveCapabilityError` when false; the error
  carries `mixinName` and `methodName`.
- **Modify**
  `packages/server/src/mud/api/__tests__/mixin.test.ts` — new
  cases:
  - `getActiveMixins(entity)` for an entity with no augments returns
    only un-gated composed mixins (gated ones missing).
  - With an augment composed that confers a gated mixin, the gated
    mixin appears in the active set.
  - Removing the augment from the slot drops the gated mixin
    immediately (lazy walk).
  - `isActive(entity, 'NamedMixin')` matches existing `hasMixin`
    behavior for un-gated mixins.
  - `isActive(entity, 'AetherMixin')` reflects implant presence
    on Avatars.
  - The `is<MixinName>` predicate generator routes through
    `isActive` (verify with a fixture mixin).
- **Modify**
  `packages/server/src/mud/lib/species/__tests__/BodyPlan.test.ts`
  — biped + quadruped declare a cranial slot.
- **Modify**
  `packages/server/src/mud/api/__tests__/perception.test.ts` (existing
  from Phase 1) — extend:
  - Fresh homo-sapiens avatar pre-bootstrap → sensorium is
    `[Vision, Sound, Smell]` (no ESP).
  - Same avatar after `Avatar.enter` bootstrap → sensorium adds
    `[VerbalESP, EmotiveESP]` via the AetherMixin grants.
  - Removing the implant via `SlotApi.releaseOccupancy` →
    sensorium loses ESP modalities immediately (active-mixin
    walk drops AetherMixin).
  - Re-installing → sensorium restores them.
  - Bullfrog (quadruped, no implant) → no ESP.
  - Peace lily (sessile, no slots) → sensorium is `[]`.
- **Modify**
  `packages/server/src/mud/obj/__tests__/Avatar.test.ts` — `enter()`
  installs the implant; second-enter is no-op (idempotent).
  Plus: `MixinApi.isAether(avatar)` is false before bootstrap and
  true after. Direct `avatar.dm(...)` throws
  `InactiveCapabilityError` before bootstrap, runs after.
- **Create**
  `packages/server/src/mud/lib/command/validators/__tests__/requiresESP.test.ts`
  — both validators gate via `PerceptionApi.canPerceive`; refusal
  string matches.

### Acceptance signal

- All augmentation + active-mixin substrate tests pass.
- `MixinApi.isAether(avatar)` reflects implant presence (false
  pre-bootstrap; true post-bootstrap).
- `avatar.dm(...)` throws `InactiveCapabilityError` when no
  implant; runs normally when implant is installed.
- `PerceptionApi.sensorium(post-bootstrap-avatar)` includes ESP
  modalities via the AetherMixin grant path.
- `Avatar.enter` installs the implant idempotently.
- `requiresVerbalESP` / `requiresEmotiveESP` validators gate
  correctly.

### Risks / decisions left to the builder

- **Slot kind vs slot name.** The "implant" kind is a documentation
  concept on the slot's name (`'cranial'`), not a new validator
  enum. Verify against current `validateSlotSpecs` before
  depending on it.
- **`AetherMixin` stays composed on Avatar in v1.** The augment is
  the runtime activation flag; the wiring (`AetherMixin.dm` method
  + state) is always present via build-time composition. The
  `@RequiresActive` decorator + the active-mixin walk are what
  toggle behavior. Future Wave 2+ refactor moves AetherMixin off
  Avatar and onto the implant Stuff itself (verb dispatch would
  then route through the augment); explicitly out of v1 scope.
  Document the transition path in `augmentation.md` Phase 9.
- **Predicate generator change.** The `is<MixinName>` family now
  backs onto `isActive` instead of `hasMixin`. For un-gated
  mixins behavior is identical (active iff composed). Verify
  with a comprehensive sweep — if any existing call site relies
  on the build-time-only semantics for what is now `_augmentGated`,
  it'll break. v1 only marks `AetherMixin` as gated, and no
  existing `isAether` consumer exists, so the risk is low.
- **`BaselineCommImplant` material / mass.** Content call — the
  seed YAML can pick anything reasonable. The slate says "small
  cybernetic object" / "brass / silicon material" — go with that.
- **Bootstrap timing.** `Avatar.enter` runs before `autoSenseOnArrival`,
  so the implant is installed before the first auto-sense — ESP
  modalities are in the sensorium for the first scene the player
  sees. Don't reorder.
- **`SlotApi.occupy` vs `SlotApi.occupyAll`.** Single-slot install,
  use `occupy`. The implant doesn't claim multi-slot (parallel to
  how an earring claims one slot, not the multi-slot atomicity
  from embodiment).
- **Decorator declaration order.** `@RequiresActive` should run
  BEFORE `@CallSecurity` (the runtime gate fires first; the
  call-security check fires second). If the existing decorator
  framework cares about order, document and enforce.

### Rough size estimate

240 min — bumped from the previous 180 because the substrate
expanded: `MixinApi.getActiveMixins` + `isActive`, predicate
generator change, `@RequiresActive` decorator + tests, the
AetherMixin self-declarations + method wrapping. The augment
+ implant + bootstrap + validators + sensorium walk stay roughly
the same. The substrate work is the new lift.

---

## Phase 7 — Per-frame modality attribution + reception-side gating

Goal: wire the modality-level filtering pattern ratified in
[perception.md](../subsystems/perception.md) but never implemented.
Frame metadata names the modality; `SensorMixin.filterMessage` drops
frames whose modality isn't in the recipient's sensorium; actor
self-frames bypass the check.

### Files

- **Modify** `packages/types/src/index.ts` — extend `MessageFrame`:
  ```ts
  export interface MessageFrame<T = unknown> {
    id: string;
    topic: string;
    tags?: string[];
    body: string;
    payload?: T;
    meta: {
      timestamp: number;
      commandId?: string;
      causingCommandId?: string;
      frameId?: number;
      modality?: string;  // NEW — optional modality attribution
    };
  }
  ```
  Optional. Backwards-compatible — system / log / narrative frames
  don't set it and deliver unconditionally.

- **Modify** `packages/server/src/mud/api/message.ts`:
  - Add `.modality(name: string)` setter to `Scene`:
    ```ts
    #modality: string | null = null;

    modality(name: string): this {
      this.#modality = name;
      return this;
    }
    ```
  - Modify `buildFrame` in `send()` to populate
    `meta.modality = this.#modality` when non-null.

- **Modify** `packages/server/src/mud/lib/message/Vocal.ts` — `say`
  composes `scene.modality('hearing')` before `.send()`.

- **Modify** `packages/server/src/mud/lib/message/Aether.ts` — `dm()`
  body composes `scene.modality('verbal-esp')` before `.send()`. (The
  method was renamed from `tell()` to `dm()` in Phase 6 as part of the
  AetherMixin augment-gated rework; Phase 8 handles the rest of the
  rebrand — YAML verb name, controller, topic.)

- **Modify** `packages/server/src/mud/lib/message/Sensor.ts` —
  extend `filterMessage`:
  ```ts
  protected filterMessage(frame: MessageFrame): MessageFrame | null {
    const modalityName = frame.meta?.modality;
    if (!modalityName) return frame;  // unconditional delivery
    // Actor self-frames bypass the modality check.
    if (frame.tags?.includes('audience:actor')) return frame;
    const modality = PerceptionApi.modalityByName(modalityName);
    if (!PerceptionApi.canPerceive(this as unknown as Stuff, modality)) {
      return null;  // drop
    }
    return frame;
  }
  ```
  - Uses `PerceptionApi.modalityByName` and `canPerceive` — both
    introduced in Phase 1.
  - Actor self-frames (`audience:actor` tag) always deliver. The
    existing tag is auto-attached by `Scene.toSelf`; reuses
    `MessageApi.Tags.Audience.Actor`.
  - Frames without `meta.modality` deliver unconditionally.

### Tests

- **Create**
  `packages/server/src/mud/api/__tests__/scene.modality.test.ts`:
  - `Scene.modality('hearing')` stamps `meta.modality === 'hearing'` on
    every composed frame (self, target, peers, contents).
  - `Scene` without `.modality()` produces no `meta.modality`.
- **Modify**
  `packages/server/src/mud/lib/message/__tests__/Sensor.test.ts`:
  - Frame with `meta.modality === 'hearing'` delivered to a recipient
    with hearing in sensorium → delivered.
  - Same frame to a recipient without hearing → dropped (returns null
    from `filterMessage`).
  - Actor self-frame (tagged `audience:actor`) with mismatched
    modality → delivered (bypass).
  - Frame with no `meta.modality` to recipient with empty sensorium →
    delivered (system / log / narrative path).
- **Modify**
  `packages/server/src/mud/lib/message/__tests__/Vocal.test.ts` —
  `say` produces frames with `meta.modality === 'hearing'`.
- **Modify**
  `packages/server/src/mud/lib/message/__tests__/Aether.test.ts` —
  `tell` (Phase 7) / `dm` (Phase 8) produces
  `meta.modality === 'verbal-esp'`.

### Acceptance signal

- All modality-attribution tests pass.
- Deaf-by-BodyPlan player (test fixture species with no ear modality)
  in a room where another player `say`s does NOT receive the `say`
  frame body (verified via reception gating test).
- The speaker DOES receive their own self-frame ("You say…") even if
  they're deaf (actor-bypass).
- Implant-less player in a room where another player `tell`s them
  does NOT receive the tell frame body.
- Frames without `meta.modality` to a recipient with empty sensorium
  deliver normally.

### Risks / decisions left to the builder

- **`PerceptionApi.modalityByName` per-frame cost.** Every filtered
  message does a path lookup. For high-traffic sensors this could
  matter — recommend a module-level `Map<string, Modality>`
  cache on `PerceptionApi`, populated lazily on first access, HMR-
  invalidated via subscription on `Events.StuffCreated` /
  `Events.StuffDestructed` filtered to `/lib/perception/modalities/`.
  Phase 1 already needs a similar cache for the sensorium walk — share
  the storage.
- **Pre-existing `say` / `tell` tests that mock recipients** — verify
  none assert on full-frame body content without setting up a
  sensorium for the recipient. After Phase 7, any test fixture
  receiving modality-attributed frames needs a body plan with the
  matching modality (or `audience:actor` tag). Audit and fix.
- **Unsubscribed flows.** Non-Sensor receivers (debug observers) get
  the frame unchanged because they don't have `filterMessage`. The
  gating is recipient-side via `SensorMixin`; producer-side fans out
  the same frame to all sensors — no per-recipient pre-filter.
- **The augmenter's existing per-region `<sense channel="X">` strip**
  is **orthogonal** to this check. Both live: `filterMessage` drops
  whole frames; the augmenter strips regions within a delivered
  frame. Document the interplay in `senses.md` Phase 9.

### Rough size estimate

120 min — small surface (one type extension, one setter, one filter
extension) but the test coverage is broad (every modality + actor
bypass + no-modality + multiple species fixtures).

---

## Phase 8 — `tell` → `dm` rebrand

Goal: rename the user-facing addressed-ESP verb from `tell` to `dm`,
keep `tell` as an alias for muscle-memory, propagate the rename
internally (YAML file rename, controller class rename, AetherMixin
method rename, topic string rename, polite refusal updates), adopt
the `requiresVerbalESP` validator.

### Files

- **Rename** `packages/server/src/mud/cmd/tell.yaml` →
  `packages/server/src/mud/cmd/dm.yaml`. Update contents:
  ```yaml
  verbs: [dm, tell]
  controller: DmController
  description: "Send a direct message to someone"
  validators:
    - /lib/command/validators/requiresAnimate
    - /lib/command/validators/requiresVerbalESP
  args:
    - name: target
      type: object
      required: true
      scope: "online"
      validators:
        - /lib/command/validators/mustBeAgent
      onExcess: prompt
    - name: message
      type: string
      required: true
      greedy: true
  ```
  Adds `requiresVerbalESP` (Phase 6 introduced it).

- **Rename**
  `packages/server/src/mud/obj/command/TellController.ts` →
  `DmController.ts`. Update class name:
  ```ts
  export class DmController extends CommandController<DmModel> {
    execute(model: DmModel, context: CommandContext): void {
      const speaker = context.commandGiver;
      if (!MixinApi.isAether(speaker)) {
        MessageApi.scene(speaker)
          .topic('world.speech.dm')
          .toSelf(Mml.compose`You have no way to send a thought.`)
          .send();
        context.note({ kind: 'mixin-missing', mixin: 'AetherMixin' });
        return;
      }
      // ...
      speaker.dm(target, model.message);  // renamed method
    }
  }
  ```
  Refusal string updates to "You have no way to send a thought." to
  match `requiresVerbalESP`'s polite refusal.

- **Modify** `packages/server/src/mud/lib/message/Aether.ts`:
  - The method itself was renamed `tell(target, text)` →
    `dm(target, text)` in Phase 6 as part of the augment-gating
    rework. This phase handles the rest of the file:
  - Update the interface: `Aether.dm` not `Aether.tell`.
  - Update `static commandContributions.self` from `['tell.yaml']` →
    `['dm.yaml']`.
  - Update topic: `world.speech.tell` → `world.speech.dm`.
  - Scene call: `.modality('verbal-esp')` (kept from Phase 7).
  - Self-body prose: keep the existing chat-form `<speaker> → <target>:
    <body>` shape, just update the topic.
  - JSDoc updates: "tell" → "dm" wherever it appears as a verb name,
    "AetherMixin.tell" → "AetherMixin.dm". The `chat` future-mention
    stays.

- **Modify** `packages/server/src/mud/api/mixin.ts` — `isAether`
  predicate doesn't change shape, but the interface narrowing
  (`Stuff & Aether`) carries the renamed method.

- **Modify**
  `packages/server/src/mud/seeds/lib/messaging/Topic/world.speech.tell.yaml`
  — **rename** to `world.speech.dm.yaml` and update:
  ```yaml
  data:
    topic: world.speech.dm
    family: world.speech
    label: DM
    description: "A direct ESP-network message"
  ```

- **Modify** `packages/server/src/mud/lib/message/__tests__/Aether.test.ts`
  — every `tell` call site → `dm`; topic assertion updated to
  `world.speech.dm`.

- **Modify** any test fixture that calls `aether.tell(...)` —
  rename to `aether.dm(...)`. Likely just `Aether.test.ts` and any
  controller test.

- **Modify** `packages/server/src/mud/obj/command/__tests__/`
  `TellController.test.ts` → `DmController.test.ts`. Update assertions:
  - Verb dispatches via both `dm` and `tell` aliases.
  - Self-body uses the new topic.
  - Refusal with no implant matches `requiresVerbalESP`'s polite
    refusal.

- **Modify** `packages/client/src/components/templates/`:
  `tell` chat-form template renames or updates topic match to
  `world.speech.dm`. If the client has a per-topic template (per
  the message-rendering substrate's per-message-type templates),
  rename the template file or remap.

- **Audit** all string occurrences of `'world.speech.tell'` across
  `packages/server/src` and `packages/client/src` and replace with
  `'world.speech.dm'`. Then audit `'tell'` references in JSDoc and
  prose templates — judgment call which to update. Any prose
  referencing the verb name in player-facing strings updates to "dm"
  (or "dm/tell" if ambiguity helps).

### Tests

All under-tests above. Plus:
- **New scenario** in `DmController.test.ts` — invoking via the `tell`
  alias dispatches to `DmController.execute` identically.
- **New scenario** — invoking `dm` without the implant (test fixture
  Avatar with no implant) refuses with
  `"You have no way to send a thought."` from `requiresVerbalESP`.

### Acceptance signal

- `grep -rn "world.speech.tell" packages` returns zero hits (except
  intentional rename log entries).
- `grep -rn "AetherMixin.tell\|\.tell(target" packages/server/src
  --include='*.ts'` returns zero hits (the method rename is
  complete).
- `dm hello world` from a player carrying the implant works.
- `tell hello world` (alias) also works.
- Player without the implant gets the refusal.

### Risks / decisions left to the builder

- **The `AetherMixin` name itself is NOT renamed.** Per the
  requirements doc's explicit non-goal, the mixin name stays held
  pending the worldbuilding conversation. Only the method renames.
  Do not rename the mixin class or the `isAether` predicate.
- **Client-side prose templates.** The
  [message-rendering subsystem](../subsystems/message-rendering.md)
  references per-message-type templates including `tell`. If the
  client has a `tell.template.tsx` or similar file, rename to
  `dm.template.tsx` and remap topic routing. Audit before merge.
- **External callers of `aether.tell(target, text)`.** Search for
  any non-controller callsite (no expected production hits, but
  test fixtures and scripts might). Update them all.
- **Polite refusal vs validator refusal.** Two refusal paths exist:
  1. The validator (`requiresVerbalESP`) returns the refusal string
     before dispatch.
  2. The controller (`DmController`) early-out for non-Aether
     speakers returns a different refusal.
  Both should say the same thing — "You have no way to send a
  thought." The Phase 8 audit confirms both paths converge.

### Rough size estimate

75 min — mostly mechanical rename across the full file set, plus the
validator wiring and the refusal-string convergence.

---

## Phase 9 — Documentation sweep

Goal: ship every doc that needs updating for the new substrate. Per
the requirements doc's full doc list.

### Files

- **Major rewrite**: `docs/subsystems/senses.md`. New shape:
  - Replace the "Wave 1 ships authoring only" framing with "Wave 1
    physics complete."
  - Document the `Modality` substrate + the seven modality
    singletons.
  - Document `PerceptionApi` surface: `signalAt` / `perceiveAt` /
    `sensorium` / `canPerceive` / `modalityByName`.
  - Document the propagation walks (vision, smell, sound) at a
    structural level — each has the same shape (ambient + contents
    + fixtures + cross-boundary + cross-exit + atmosphere check),
    each is implemented independently per the requirements doc's
    "per-modality walks, not a generic walker" decision.
  - Document touch as the contact modality with ambient + per-detail
    temperature reads.
  - Document the hybrid ESP framing (`family: 'field'` substrate,
    network-routing in v1, field-half reserved).
  - Document `Mobile.autoSenseOnArrival` → unchanged from prior
    senses build.
  - Document the **organ-gates-modality rule widened to walk both
    innate BodyPlan organs AND augment contributions** via
    `PerceptionApi.sensorium`.
  - Document **modality attribution living in BOTH per-frame
    `meta.modality` AND per-region `<sense channel="X">` body MML**.
    Explain the interplay (per the requirements doc Goal 8).
  - Document the masking rule
    `effectiveThreshold = max(viewer_threshold, ambient_signal_strength_on_modality)`
    and where ambient comes from per modality (sound: biome chain;
    smell: room-scope non-target emitters; touch: per-detail
    override).
  - Document bare-verb upgrades for `smell` / `listen` / `feel`.
  - Document the reserved seams (ESP field walk, smell trails,
    active sense pattern, hearing/tactile/gustatory profiles,
    vitals integration).

- **Major rewrite**: `docs/subsystems/light.md`:
  - Replace "LightApi" section header and surface with the
    `PerceptionApi.signalAt(loc, VisionModality)` shape.
  - Keep all `Light` value object / `LightBand` / `AmbientLitMixin`
    / `LightSourceMixin` / `LightConduit` sections — they're
    unchanged.
  - Move the band-lookup arithmetic
    (`bandFor` / `applyBandShift` / `compareBand`) docs from the
    `LightApi` section into the `Light` value-object section.
  - Cross-reference `senses.md` for the substrate-level surface.

- **Update**: `docs/subsystems/messaging.md`:
  - Document the new `MessageFrame.meta.modality?: string` field.
  - Document `Scene.modality(name)` setter.
  - Document `SensorMixin.filterMessage`'s modality check + actor
    bypass.
  - Cross-reference `senses.md` for the modality-level surface.

- **Update**: `docs/subsystems/perception.md`:
  - The modality-level filtering paragraph that's existed for a
    while updates to "this pattern is now implemented at
    `SensorMixin.filterMessage`; frames name the modality via
    `meta.modality`; `PerceptionApi.canPerceive` is the predicate."
  - No structural changes — just promoting the documented pattern
    to implemented status.

- **Update**: `docs/subsystems/race.md`:
  - BodyPlan section notes the cranial slot addition to biped /
    quadruped.
  - `sensoryPorts.modality` notes that ESP modalities are reserved
    (substrate accepts arbitrary strings) but no v1 species uses
    them.
  - Cross-reference `augmentation.md` for the implant-as-augment
    story.

- **Create**: `docs/subsystems/augmentation.md` (NEW). Outline:
  ```markdown
  # Augmentation

  The substrate for "acquired capability via slotted Stuff" — the
  axis distinct from BodyPlan's "innate biological capability."
  Mixin composition expresses capability at build time; augment
  installation toggles activation at runtime. A small uniform
  substrate carries the union.

  ## Substrate

  - `MixinApi.getActiveMixins(stuff)` / `isActive(stuff, name)` —
    active set = (native composition) ∪ (augment-conferred mixins
    where `_augmentGated: true`).
  - `MixinApi.is<MixinName>` predicates route through `isActive` —
    uniform calling convention for un-gated and gated mixins alike.
  - `AugmentMixin.confers(): readonly string[]` — mixin names the
    augment activates.
  - Mixin self-declarations:
    - `_augmentGated: true` — opt into augment-required activation
    - `_grantsModalities: readonly string[]` — modalities the mixin
      contributes (read by PerceptionApi.sensorium)
    - Open shape: `_grantsLanguages`, `_grantsAttributeMasks`,
      `_grantsVitalFunctions`, `_grantsSlots` — reserved for their
      consumer subsystems (not read in v1).
  - `@RequiresActive('<MixinName>')` method decorator (in
    `lib/security/`) — runtime gate on every method of an
    augment-gated mixin. Throws `InactiveCapabilityError` when
    the mixin isn't active.

  ## File layout
  - lib/augmentation/Augment.ts — `AugmentMixin`
  - lib/augmentation/BaselineCommImplant.ts — Wave 1 implant template
  - seeds/lib/augmentation/baseline-comm-implant.yaml — seed
  - lib/security/RequiresActive.ts — decorator + error class

  ## The cranial slot
  - biped/quadruped declare a `cranial` slot accepting SlottableMixin
  - sessile doesn't get one (plants don't have implants)
  - slot capacity 1

  ## BaselineCommImplant
  - Composes Slottable + Tangible + Augment
  - `confers()` returns `['AetherMixin']`
  - Hardened — no power state or failure modes in v1

  ## AetherMixin in v1
  - `_augmentGated = true`
  - `_grantsModalities = ['verbal-esp', 'emotive-esp']`
  - `@RequiresActive('AetherMixin')` on `dm()` and other
    Aether-grouped methods
  - Composed natively on Avatar (so methods + state exist) but
    inert without augment-conferral

  ## Avatar bootstrap
  - `Avatar.enter` installs the implant in the cranial slot if absent
  - Idempotent
  - v1 stand-in for char-gen's baseline-implant issuance

  ## How other augment kinds plug in (substrate proof)

  | Augment Stuff | `confers()` | Mixin's grants | Subsystem |
  |---|---|---|---|
  | BaselineCommImplant | ['AetherMixin'] | `_grantsModalities` | PerceptionApi.sensorium |
  | ThermalVisionImplant | ['ThermalVisionMixin'] | `_grantsModalities` | PerceptionApi.sensorium |
  | CyberArm | ['ProstheticArmMixin'] | `_grantsSlots`, `_grantsAttributeMasks` | SlotApi, PropertiedMixin |
  | TranslationChip | ['TranslationMixin'] | `_grantsLanguages` | LanguageApi (future) |
  | ArtificialHeart | ['HeartFunctionMixin'] | `_grantsVitalFunctions` | VitalsApi (future) |

  v1 ships only the first row. The rest demonstrate the same
  substrate handles them — new augments need no framework
  change.

  ## Wave 1 boundary
  - Implant is real Stuff (clone + occupy + persist)
  - Only `_grantsModalities` is read by any v1 consumer
  - No install/remove medical procedure (Wave 2+)
  - No other augments (Wave 2+)
  - No char-gen loadout (Wave 2+)
  - No failure modes or power state (Wave 2+)
  - No methods/state CONFERRED by augments — they live on the
    natively composed mixin; the augment is the activation flag
    (Wave 2+ may move methods/state onto the augment Stuff
    proper via verb-dispatch routing)

  ## Conventions
  - Augment-gated mixins MUST decorate methods with `@RequiresActive`
  - Don't mint `isFooActive` parallel predicates — `isFoo` already
    answers the active question
  - Build-time-only composition checks use the low-level
    `MixinApi.hasMixin` directly; the high-level `isFoo` family is
    runtime
  ```

- **Update**: `docs/slates/senses-slate.md` — status block: Wave 1
  physics half shipped. List what's still ahead (trails, active
  sense, ESP field walk, profiles, vitals integration).

- **Update**: `docs/slates/sound-slate.md` (tombstone) — hearing
  instance shipped; acoustic depth absorbed into Phase 4 / hearing
  modality.

- **Update**: `docs/slates/augmentation-slate.md` — status block:
  Wave 1 (implantable affordance + baseline implant) shipped.
  Wave 2+ enumerated as remaining (install/remove procedure, other
  augments, char-gen loadout, failure modes, generalized contribute-
  capability surface).

- **Update**: `docs/architecture.md` — mentions new
  `lib/perception/modalities/` and `lib/augmentation/` substrate
  locations.

- **Update**: `docs/antipatterns.md` — add four entries:
  ```markdown
  ## Don't add a per-sense Api
  - WRONG: `SmellApi.signalAt(loc)`, `SoundApi.signalAt(loc)`
  - RIGHT: modalities are singletons extending `Modality`; add a
    new subclass + seed YAML; consumers go through
    `PerceptionApi.signalAt(loc, modality)`.

  ## Don't model augments by listing grants directly
  - WRONG: `AugmentMixin.getContributedModalities()` returning
    a hardcoded modality list per augment.
  - RIGHT: `AugmentMixin.confers()` returns mixin names; the
    mixin declares its own `_grantsModalities` (and any future
    `_grantsX`). Decentralized declarations beat coupled lists.

  ## Augment-gated mixins MUST decorate methods with @RequiresActive
  - WRONG: marking a mixin `_augmentGated = true` but leaving its
    methods unguarded. The verb-level validator only catches
    command-dispatched calls; direct callers bypass it.
  - RIGHT: every public method on an `_augmentGated: true` mixin
    carries `@RequiresActive('<MixinName>')`. The decorator is
    the late-catch backstop symmetric with the verb-level
    validator early-catch.

  ## Don't mint a parallel `isFooActive` predicate
  - WRONG: adding `MixinApi.isAetherActive` alongside `isAether`,
    requiring callers to know which one to use per mixin.
  - RIGHT: `MixinApi.isFoo` uniformly answers the runtime active
    question for every mixin (un-gated and gated alike).
    Build-time-only composition checks are an edge case using
    `MixinApi.hasMixin` directly.
  ```

- **Update**: `CLAUDE.md` documentation map — add `augmentation.md`
  in alphabetical position; update the `light.md` line to reflect
  the substrate retirement; update the `senses.md` line to reflect
  the physics shipment.

### Tests

No tests in this phase. Docs link check (if any tooling exists) passes.

### Acceptance signal

- All docs build cleanly (Markdown lint if any).
- Every doc referenced in the requirements doc's "Files updated"
  section has corresponding edits.
- `grep -rn "LightApi" docs/` returns either zero hits or
  intentional historical-reference hits with strikethrough framing.
- New `augmentation.md` is committed and linked from `CLAUDE.md`.

### Rough size estimate

90 min — pure docs, but the senses.md rewrite is non-trivial because
the substrate is bigger now.

---

## Risks / open implementation questions

Cross-cutting unknowns the planner sees as load-bearing:

1. **Modality string → modality-singleton lookup map.** `sensorium`
   needs an efficient map from modality strings (`'vision'`,
   `'hearing'`, `'smell'`, `'verbal-esp'`, ...) to the corresponding
   `Modality` singleton. Note `'hearing'` modality maps to
   the modality named `'sound'`. The cleanest implementation: cache a
   `Map<string, Modality>` on `PerceptionApi` populated
   lazily from
   `StuffApi.findByTemplatePath('/lib/perception/modalities/*')`
   iteration, HMR-invalidated via subscription on
   `Events.StuffCreated` + `Events.StuffDestructed` filtered to the
   prefix. Same shape used by `TopicCatalogue`. Centralize the cache
   so Phase 7's `filterMessage` benefits from it too.

2. **dB arithmetic accuracy + Quantity tag-table interaction.**
   Sound is the only modality using a logarithmic-add unit. The
   `quantity.ts` `UnitOps` registry has a placeholder for dB; the
   real implementation needs careful test coverage (10 + 10 →
   13.01 dB, not 20 dB). The tag-table (`'inaudible'` / `'whisper'`
   / etc.) interaction with logarithmic comparison should match dB
   semantics — verify the existing `Quantity.tag()` /
   `Quantity.compareTag()` machinery works correctly for dB. If it
   doesn't (e.g. it assumes monotonic linear math), document the
   shortfall and either fix or scope-down to "dB tag comparison is
   raw numeric for v1."

3. **Atmospheric `_detailTemperatures` chain extension for touch
   targeted reads.** The `feel <target>` targeted form reads
   per-detail temperature via the existing biome chain. Verify
   `BiomeApi.resolveTemperatureFor(scope, detailKey)` handles the
   detail-key path correctly — the existing `Thermometer`
   `measure temperature <thing>` flow exercises this, so the path
   exists; just ensure the `FeelController` call matches the
   detail-key argument shape.

4. **The cranial slot's effect on existing biped tests.** Adding a
   cranial slot to the biped BodyPlan changes the slot universe.
   Any test asserting on the full slot list for biped (e.g.
   `BodyPlan.test.ts`'s "biped has 10 slots") needs updating. Audit
   first; likely 1-2 sites.

5. **Vision propagation tests in their new home.** Phase 2 moves the
   walk into `VisionModality.signalAt` but the test logic doesn't
   change. Some tests may have been using `LightApi`-internal helpers
   directly (e.g. `walkFluxAt` exposed for test scaffolding) — audit
   `api/__tests__/light.test.ts` for any non-public-surface call
   sites and update them to either use the public
   `PerceptionApi.signalAt` shape or to import the (now module-local)
   helpers from `VisionModality.ts`. Recommend keeping the helpers
   module-local and updating tests to public-surface calls.

6. **Per-modality walk depth.** All three field walks (vision, smell,
   sound) share `MAX_HOPS = 2` from vision. Per the requirements
   doc's "Per-modality walks, not a generic walker" decision, this is
   import-shared, not abstracted. If a content authoring need
   surfaces during the build for per-modality depth (e.g. "sound
   propagates further than light"), the path is to add a
   `getMaxHops()` accessor on `Modality` with the default
   `2` and override per modality — but don't do this speculatively.

7. **`Avatar.enter` bootstrap idempotency under reconnect.** The
   Avatar lifecycle has a single `enter` call per session-start (per
   `Avatar.ts:229-235` comment "One call per session-start, not per
   connection"). The bootstrap-implant call lives inside `enter`, so
   it runs once. But for tests that exercise multiple `enter` flows
   (e.g. integration tests that simulate reconnect-after-disconnect
   cycles via test-specific reset), verify the bootstrap is a no-op
   when the implant is already installed.

8. **Reception gating regression risk for existing controller
   tests.** Phase 7 adds modality-attribution to `VocalMixin.say` and
   `AetherMixin.dm`. Any existing test that has a `say`/`tell`
   recipient without a complete sensorium setup will now see
   silently-dropped frames. Audit `say.test.ts` and any prose-
   delivery integration test before Phase 7 lands. Recommend a
   pre-Phase-7 audit grep:
   `grep -rn "isContainable.*Sensor" packages/server/src --include='*.test.ts'`
   to find tests that construct minimal recipients.

9. **YAML migration: the existing `world.speech.tell` topic seed.**
   Phase 8 renames the topic seed YAML file. Any test asserting on
   the topic catalogue or the in-bootstrap clone count of
   `/lib/messaging/Topic/*` updates accordingly. Audit
   `TopicCatalogue.test.ts` for any topic-string assertions.

10. **`Mml.markdownToMml` mention scope for `dm`.** The current
    `AetherMixin.tell` notes "mention scope = the speaker's
    perceivable neighbors (same room) — the Aether-side mention pool
    (who's on the call) is the chat-slate's concern." The rebrand
    inherits this. No change in scope; document the eventual
    chat-slate widening in the docs sweep.

11. **`SecurityApi.decorateApiClass(PerceptionApi)`.** Required per
    CLAUDE.md's "New Apis end with `SecurityApi.decorateApiClass`."
    Don't forget the decoration at the bottom of `api/perception.ts`.

12. **No new module categories.** Augmentation is a new subsystem
    directory (`lib/augmentation/`) per the slate, but the file
    types within are all canonical (mixin, Stuff class, seed YAML).
    Verify no helper modules creep in during Phase 6 build —
    cross-cutting helpers go on `PerceptionApi` (sensorium walk
    extension) or stay private to the relevant Stuff class.

13. **Cross-Quantity dB ↔ linear conversions in the walk.** The
    sound propagation walk needs to do dB arithmetic at every
    accumulator step. Recommended pattern: accumulate in **linear
    amplitude** (`pow(10, dB/10)`) inside the walker, sum linearly
    (which is the correct physical model for incoherent sources),
    convert back to dB at the wrap step. Same pattern as the vision
    walk's lumen-accumulator → lux-divide-by-area at the wrap. The
    `Sound.add` value-object operator does logarithmic addition for
    callers that pre-have dB-typed values; the walker uses linear
    internals.

14. **`PerceptionApi` lazy modality map and HMR.** The modality →
    modality cache needs to invalidate when a modality singleton is
    HMR'd. Use the same `postRegister` subscription pattern as
    `TopicCatalogue` (subscribe to `Events.StuffCreated` /
    `Events.StuffDestructed`, filter to the prefix
    `/lib/perception/modalities/`, drop the cache). Since `PerceptionApi`
    is a static-only class, the subscription registers in a one-time
    module-init block at the bottom of `api/perception.ts`, after
    the `decorateApiClass` call.

15. **Documentation references to "tell" in older docs.** Several
    subsystem docs reference `tell` as a verb (e.g. messaging.md,
    message-rendering.md). Phase 9 needs to canonicalize the verb
    name. Recommend: docs use "dm (alias: tell)" the first time per
    section; "dm" thereafter. Refusal-string docs use the dm form.

---

## Documentation sweep (Phase 9, expanded reference)

| File | Change | Rationale |
|---|---|---|
| `docs/subsystems/senses.md` | Major rewrite | Substrate complete; physics half shipped; modality attribution lives in both meta and body MML |
| `docs/subsystems/light.md` | `LightApi` section retires; vision references `PerceptionApi.signalAt(loc, VisionModality)`; value-object sections stay | Vision migrated into modality substrate |
| `docs/subsystems/messaging.md` | Document `meta.modality`, `Scene.modality(name)`, `SensorMixin.filterMessage` modality check + actor bypass | Reception-gating wired |
| `docs/subsystems/perception.md` | Promote the modality-level filtering pattern from documented to implemented | Pattern now real |
| `docs/subsystems/race.md` | Note cranial slot addition to biped/quadruped; document `sensoryPorts.modality` accepting ESP modalities (reserved, no v1 species exercises) | BodyPlan extension surface |
| `docs/subsystems/augmentation.md` (NEW) | `AugmentMixin.confers()`, `MixinApi.getActiveMixins`/`isActive`, predicate routing, `_augmentGated` + `_grantsX` mixin declarations, `@RequiresActive` decorator, cranial slot, baseline implant, augment-kinds substrate-proof table, Wave 1 boundary | Substrate the slate ships |
| `docs/subsystems/biome.md` | Mention new `_defaultAmbientSoundLevel` field + `BiomeApi.resolveAmbientSoundLevelFor` resolver | Sound ambient chain |
| `docs/subsystems/boundary.md` | Add `SmellConduit` + `SoundConduit` to the conduit family doc; note Door/Window now expose all five | New conduits shipped |
| `docs/subsystems/quantities.md` | Note new `ppm` unit + `dB`/`Hz` tag-table entries; mention dB's logarithmic-add UnitOps entry | Quantities extended |
| `docs/slates/senses-slate.md` | Status: Wave 1 physics shipped; remaining: trails, active sense, ESP field walk, profiles, vitals | Slate status |
| `docs/slates/sound-slate.md` (tombstone) | Mark hearing instance shipped; acoustic depth absorbed | Slate retirement |
| `docs/slates/augmentation-slate.md` | Status: Wave 1 (affordance + baseline implant) shipped; remaining: Wave 2+ enumerated | Slate status |
| `docs/architecture.md` | Mention new `lib/perception/modalities/` and `lib/augmentation/` substrate dirs | Module map currency |
| `docs/antipatterns.md` | Four new entries (per-sense Api / augment-lists-grants / @RequiresActive mandatory / no isFooActive parallel) | Anti-patterns the substrate forbids |
| `CLAUDE.md` | Documentation map: add `augmentation.md`; refresh `senses.md` + `light.md` entries | Project orientation |

---

## Critical files for implementation

- /home/bobalu/play/saxonberg/packages/server/src/mud/lib/perception/Modality.ts (NEW — substrate base)
- /home/bobalu/play/saxonberg/packages/server/src/mud/api/perception.ts (NEW — single Api surface, with HMR-aware modality cache)
- /home/bobalu/play/saxonberg/packages/server/src/mud/api/light.ts (DELETE — walk relocates into VisionModality.signalAt)
- /home/bobalu/play/saxonberg/packages/server/src/mud/lib/message/Sensor.ts (modality-attribution gating at filterMessage)
- /home/bobalu/play/saxonberg/packages/server/src/mud/obj/Avatar.ts (Avatar.enter bootstraps the baseline implant; payload composition for the welcome scene reuses this entry point)
- /home/bobalu/play/saxonberg/packages/server/src/mud/lib/augmentation/BaselineCommImplant.ts (NEW — Wave 1 implant template; confers AetherMixin via AugmentMixin.confers(); AetherMixin._grantsModalities supplies the ESP modalities)
