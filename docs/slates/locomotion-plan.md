# Locomotion implementation plan

This is the implementation plan for the locomotion substrate as
specified in
[locomotion-requirements.md](../../play/saxonberg/docs/slates/locomotion-requirements.md).
A fresh agent can execute this plan with only the requirements doc +
`CLAUDE.md` for context. Once approved, the final copy lives at
`/home/bobalu/play/saxonberg/docs/slates/locomotion-plan.md`.

Section numbers below match the deliverable spec from the user
prompt. References to `requirements` mean the locomotion-requirements
doc.

---

## 1. Executive summary

Ship the locomotion substrate: a `LocomotionMode` singleton Idea
class (9 v1 templates), three per-mode enablement mixins (`Climbable`
/ `Swimmable` / `Flyable`), a `LocomotionApi` cross-cutting helper,
six per-mode verb controllers sharing one base, and substrate
extensions to `Exit` (`allowedModes`), `Mobile` (`engagedMode` +
`onSlotReleased` witness), and `Drivable` (`vehicularMode`). Plus
one wiring edit inside `Slotted.vacate` (or wherever the slot
substrate centralizes release) to invoke the witness.

- **File count**: ~38 new + ~7 modified (see § 3).
- **Line count**: estimated ~3000-3500 production LOC + ~2500 test
  LOC.
- **Test count**: ~140-170 `it` blocks across 14 test files.
- **Embodiment dependencies**: `MountableMixin`, `DrivableMixin`,
  `SlotApi.findOccupiedSlots` / `findOccupiedHost`, `Postures`
  vocabulary, `Posed`, `Slotted.vacate`. All confirmed present on
  the current `loco` branch (which descends from the merged `slots`
  branch).
- **MR boundary suggestion**: ship as one cohesive MR. The
  alternative "substrate + walk/climb first; swim/fly/ride/drive
  second" is offered as a Plan B in § 8; preference is the single
  MR because the substrate has no consumer outside its verbs, and
  splitting requires a temporary "verb shipped without controller"
  bridge state.

---

## 2. Dependencies

### 2.1 Embodiment exports consumed

Confirmed present on the current branch:

| Symbol | File | Notes |
|---|---|---|
| `MountableMixin`, `Mountable.getMountSlot()` | `lib/slot/Mountable.ts` | Composition is `Stuff & Slotted`; mount slot defaults to `'mount:1'`. |
| `DrivableMixin`, `Drivable.getControllerSlot()` | `lib/slot/Drivable.ts` | Composition is `Stuff & Slotted`. Pre-existing bug: `controllerSlot` defaults to `'mount:1'` (collides with `Mountable.mountSlot`'s default); **this MR fixes** the default to `'driver:1'` per § 4.12. `Drivable.vehicularMode` does NOT exist yet — this MR adds it. |
| `Postures.Mounted` | `lib/slot/Postured.ts` (const-object) | Frozen 5-entry vocab. |
| `Posed.getPosture()` / `setPosture()` | `lib/character/Posed.ts` | Note: this file is at `lib/character/`, not `lib/slot/` as the requirements doc says in places. The plan honors the actual location. |
| `MixinApi.isMountable` / `isDrivable` / `isPosed` / `isMobile` / `isExitable` / `isContainable` / `isSlotted` / `isSlottable` / `isPostured` | `api/mixin.ts` | All present. |
| `MixinApi.hasMixin(host, mixinName)` | `api/mixin.ts` | Present; uses string mixin names (matches `Mixins` registry). |
| `SlotApi.findOccupiedSlots(candidate)` | `api/slot.ts` | Present; returns `ReadonlyMap<Slotted, readonly string[]>`. |
| `SlotApi.findOccupiedHost(candidate)` | `api/slot.ts` | Present; single-host shortcut. |
| `SlotApi.occupyAll` / `vacateAll` / `transferOccupancy` | `api/slot.ts` | Present. |
| `Slotted.occupy(candidate, slot)` / `Slotted.vacate(slot, candidate)` | `lib/slot/Slotted.ts` | Present. **`vacate` does NOT today fire any release witness — adding the invocation is part of this MR's Wave 3 step.** |

### 2.2 Cross-subsystem edits this MR makes

1. **`Drivable.vehicularMode` field addition** (§ 5.3 / § 14.3.1 of
   requirements). New persistent field `_vehicularModePath:
   string | null` per ref-shapes Pattern A. Public method surface:
   `getVehicularMode(): LocomotionMode | null` /
   `setVehicularMode(value: LocomotionMode | null)`. Existing
   Drivable documents hydrate with `null`.
2. **`Exit.allowedModes` field addition** (§ 8 of requirements).
   New persistent `string[]`, default `[]`. New method
   `allowsMode(modeName)`. Extended `canTraverse(mover, mode?)`
   signature (mode optional for backcompat) returning extended
   `TraversalGuard`.
3. **`TraversalGuard` structured extension** (§ 8.2.1 of
   requirements). Add `gate?: TraversalGate`, `mode?: string`,
   `context?: Record<string, unknown>`. Backcompat-additive.
4. **`Mobile.engagedMode` field addition** (§ 11 of requirements).
   Runtime-only `_engagedModePath: string | null` per ref-shapes
   Pattern A. Methods `getEngagedMode()` / `setEngagedMode()` /
   `isEngagedIn()` / `onSlotReleased()`.
5. **`Mobile.traverse` mode-gate enforcement** (§ 9 / Wave 2).
   `Mobile.traverse` now calls `exit.canTraverse(mover, mode)`
   before announcement and throws (or returns early — TBD per § 9
   layering note) if the gate fails. The current code has `void
   mode;` with a TODO; the locomotion MR replaces that.
6. **Slot release witness invocation** (§ 11.1 + Wave 3 step 19).
   The `Slottable` interface (§ 4.13a) grows an optional
   `onSlotReleased?(host, slotName)` method; `Slotted.vacate(slot,
   candidate)` invokes `candidate.onSlotReleased?.(this, slot)`
   synchronously after the `set.delete(candidate)` line — fully
   TypeScript-typed via the Slottable interface, no duck-typing
   cast. See § 10 risk-register for the rationale on placing this
   in `Slotted.vacate` rather than in `SlotApi`.

### 2.3 Bootstrap-order requirement

The nine `LocomotionMode` templates do NOT need bootstrap-manifest
entries today — the singleton resolution path
(`StuffApi.findByTemplatePath`) returns `null` for unloaded paths,
and the `LocomotionControllerBase.execute` flow uses
`modeOfOrThrow` which throws if its own mode singleton hasn't been
loaded by the time the first verb fires. The current bootstrap
manifest at `mud/bootstrap.ts` is minimal (one entry,
`/obj/EventRegistry`); singletons load lazily.

**Therefore**: the locomotion MR does NOT need to extend the
bootstrap manifest. The nine YAML seeds ship; the seeder inserts
them into the `domain` collection; the singleton cache resolves
them on first `modeOf` call. If profiling later shows verb-time
singleton load latency, lift to the manifest then.

The requirements doc § 4 mentions an "early-substrate wave" as if
bootstrap-required; the codebase doesn't currently work that way.
Flagged in the risk register § 10 entry "Bootstrap wave mismatch."

---

## 3. File-by-file change list

Ordered by wave (substrate first). Test files are listed alongside
their production siblings.

| Path | New/Modified | One-line purpose |
|---|---|---|
| `packages/server/src/mud/lib/slot/Slottable.ts` | Modified | Add optional `onSlotReleased?(host, slotName)` witness method to the `Slottable` interface (typed-safe replacement for the duck-typed call inside `Slotted.vacate`). |
| `packages/server/src/mud/lib/locomotion/LocomotionMode.ts` | New | `LocomotionMode` singleton Idea class. |
| `packages/server/src/mud/lib/locomotion/Enablement.ts` | New | Shared `Enablement` interface implemented by all three per-mode mixins. |
| `packages/server/src/mud/lib/locomotion/Climbable.ts` | New | `ClimbableMixin` implements `Enablement` + `CLIMBING_CAPABILITY_PROP`. |
| `packages/server/src/mud/lib/locomotion/Swimmable.ts` | New | `SwimmableMixin` implements `Enablement` + `SWIMMING_CAPABILITY_PROP`. |
| `packages/server/src/mud/lib/locomotion/Flyable.ts` | New | `FlyableMixin` implements `Enablement` + `FLIGHT_CAPABILITY_PROP`. |
| `packages/server/src/mud/lib/locomotion/__tests__/LocomotionMode.test.ts` | New | Singleton shape, setter validation. |
| `packages/server/src/mud/lib/locomotion/__tests__/Climbable.test.ts` | New | Mixin marker, axes, difficulty, `canBeEngagedBy`. |
| `packages/server/src/mud/lib/locomotion/__tests__/Swimmable.test.ts` | New | Parallel shape. |
| `packages/server/src/mud/lib/locomotion/__tests__/Flyable.test.ts` | New | Parallel shape. |
| `packages/server/src/mud/api/locomotion.ts` | New | `LocomotionApi` cross-cutting helper. |
| `packages/server/src/mud/api/__tests__/locomotion.test.ts` | New | API surface tests (§ 15.5). |
| `packages/server/src/mud/obj/command/LocomotionControllerBase.ts` | New | Abstract base for the 6 verbs. |
| `packages/server/src/mud/obj/command/WalkController.ts` | New | Concrete controller (walk mode). |
| `packages/server/src/mud/obj/command/ClimbController.ts` | New | Concrete controller (climb mode). |
| `packages/server/src/mud/obj/command/SwimController.ts` | New | Concrete controller (swim mode). |
| `packages/server/src/mud/obj/command/FlyController.ts` | New | Concrete controller (fly mode). |
| `packages/server/src/mud/obj/command/RideController.ts` | New | Concrete controller (ride passthrough). |
| `packages/server/src/mud/obj/command/DriveController.ts` | New | Concrete controller (drive passthrough). |
| `packages/server/src/mud/obj/command/__tests__/LocomotionControllerBase.test.ts` | New | Base-class composition / rejection prose. |
| `packages/server/src/mud/obj/command/__tests__/WalkController.test.ts` | New | Walk happy path + each rejection gate. |
| `packages/server/src/mud/obj/command/__tests__/ClimbController.test.ts` | New | Climb happy path + capability gate. |
| `packages/server/src/mud/obj/command/__tests__/SwimController.test.ts` | New | Swim happy path + capability gate. |
| `packages/server/src/mud/obj/command/__tests__/FlyController.test.ts` | New | Fly happy path + capability gate. |
| `packages/server/src/mud/obj/command/__tests__/RideController.test.ts` | New | Ride passthrough + no-conveyance. |
| `packages/server/src/mud/obj/command/__tests__/DriveController.test.ts` | New | Drive passthrough + vehicularMode. |
| `packages/server/src/mud/cmd/walk.yaml` | New | YAML view for walk. |
| `packages/server/src/mud/cmd/climb.yaml` | New | YAML view for climb. |
| `packages/server/src/mud/cmd/swim.yaml` | New | YAML view for swim. |
| `packages/server/src/mud/cmd/fly.yaml` | New | YAML view for fly. |
| `packages/server/src/mud/cmd/ride.yaml` | New | YAML view for ride. |
| `packages/server/src/mud/cmd/drive.yaml` | New | YAML view for drive. |
| `packages/server/src/mud/seeds/lib/locomotion/walk.yaml` | New | walk-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/climb.yaml` | New | climb-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/swim.yaml` | New | swim-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/fly.yaml` | New | fly-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/ride.yaml` | New | ride-mode singleton seed (passthrough). |
| `packages/server/src/mud/seeds/lib/locomotion/drive.yaml` | New | drive-mode singleton seed (passthrough). |
| `packages/server/src/mud/seeds/lib/locomotion/wheeled.yaml` | New | wheeled-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/sailed.yaml` | New | sailed-mode singleton seed. |
| `packages/server/src/mud/seeds/lib/locomotion/aerial.yaml` | New | aerial-mode singleton seed. |
| `packages/server/src/mud/__tests__/integration/locomotion.test.ts` | New | End-to-end compositions (§ 16). |
| `packages/server/src/mud/lib/mixin.ts` | Modified | Append `Climbable` / `Swimmable` / `Flyable` to `Mixins`. |
| `packages/server/src/mud/lib/boundary/Exit.ts` | Modified | `allowedModes` field + setter + `allowsMode()` + extended `canTraverse` + extended `TraversalGuard`. |
| `packages/server/src/mud/lib/boundary/__tests__/Exit.test.ts` | Modified | New describe blocks for `allowedModes` (§ 15.2). |
| `packages/server/src/mud/lib/spatial/Mobile.ts` | Modified | `_engagedModePath` field + method triple + `onSlotReleased` witness + `traverse` mode-gate enforcement. |
| `packages/server/src/mud/lib/spatial/__tests__/Mobile.test.ts` | Modified | New describe blocks for `engagedMode` + mode-gate (§ 15.4 / § 15.7). |
| `packages/server/src/mud/lib/slot/Drivable.ts` | Modified | (1) Bug fix: `controllerSlot` default `'mount:1'` → `'driver:1'`. (2) New `_vehicularModePath` field + method pair. |
| `packages/server/src/mud/lib/slot/__tests__/Drivable.test.ts` | Modified | New describe block for `vehicularMode` (§ 15.5 + § 16). |
| `packages/server/src/mud/lib/slot/Slotted.ts` | Modified | `vacate` invokes `candidate.onSlotReleased?.(this, slot)` after the delete. |
| `packages/server/src/mud/lib/slot/__tests__/Slotted.test.ts` | Modified | New it-block: `vacate` fires release witness. |
| `packages/server/src/mud/obj/command/GoController.ts` | Modified | Extend `LocomotionControllerBase`; `modeName()` reads `movement.defaultMode`. |
| `packages/server/src/mud/obj/command/__tests__/GoController.test.ts` | Modified | New it-blocks for default-mode dispatch (§ 15.6). |
| `packages/server/src/mud/seeds/lib/body-plans/biped.yaml` | Modified | `locomotionModes: ['walk', 'climb', 'swim']`. |
| `packages/server/src/mud/seeds/lib/body-plans/quadruped.yaml` | Modified | `locomotionModes: ['walk', 'swim']`. |

44 new files; 9 modified files. (Sessile body plan stays at `[]`.)

---

## 4. Code-shape preview

Detailed enough that a fresh agent can fill in obvious bodies.

### 4.0 Security-decorator pattern

All new locomotion methods follow the project's "lean permissive
until permissions land" convention. Concretely:

- **`LocomotionApi`** (`mud/api/locomotion.ts`) ends with
  `SecurityApi.decorateApiClass(LocomotionApi)` — same pattern as
  every other Api. This wraps every static method so calls push /
  pop the security frame for shadow / audit / future-policy
  enforcement. The default policy is `Public` (anyone can call);
  no per-method `@CallSecurity(...)` overrides in v1.
- **Mixin methods** (`Climbable`, `Swimmable`, `Flyable`,
  `Mobile.onSlotReleased`, `Drivable.getVehicularMode`,
  `LocomotionMode.getName`, etc.) — **no explicit decorators in
  v1**. They default to `SecurityPolicies.Public`, get proxy
  mediation automatically (so shadows / future policies attach
  cleanly), and that's enough. Invariant enforcement lives in the
  setter validation (e.g., `setDifficulty` throws on
  `0 / negative / NaN / Infinity`), not in security policy.
- **Final / Unshadowable** — used selectively per the existing
  codebase pattern (`Stuff.destroy()`, `Container.addContainable` /
  `removeContainable`) for primitives where override or shadow
  bypass would break invariants. **No v1 locomotion method needs
  this**: setters are runtime-validated; `Mobile.traverse`'s
  mode-gate is enforced by the `exit.canTraverse` check (not by
  preventing subclass override); `engageAround` is on the Api so
  it's class-decorated. If a future audit identifies a real
  invariant-bypass risk, lift then.

Pattern reference: `lib/spatial/Container.ts` shows
`@CallSecurity(CalledFromSetContainer) @Final @Unshadowable` on the
two mutation primitives — that's the most decorated example in the
slot / spatial cone. Locomotion has no parallel; the substrate
gains its invariants through the engageAround / Mobile.traverse
control-flow shape, not through method-level lockdown.

### 4.1 `lib/locomotion/LocomotionMode.ts`

```ts
/**
 * LocomotionMode — singleton Idea describing one mode of locomotion.
 *
 * One canonical instance per templatePath at /lib/locomotion/<name>.
 * v1 ships nine: walk, climb, swim, fly, ride, drive, wheeled,
 * sailed, aerial.
 *
 * Mode references on actors / exits / drivables are STRINGS
 * (templatePath); resolution via LocomotionApi.modeOf(path) returns
 * this singleton. See ref-shapes Pattern A.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';

export type NoiseLevel = 'silent' | 'quiet' | 'normal' | 'loud';
/**
 * Body-shape profile, used by future height-keyed traps and visual
 * detection / silhouette modeling.
 *
 * - `prone`      — body flat on the ground (crawl-style)
 * - `crouched`   — between upright and prone (sneak-style)
 * - `upright`    — vertical body axis (walking, standing, climbing
 *                  a wall face)
 * - `horizontal` — body flat OFF the ground (swimming at the
 *                  surface, flying with wings spread). Distinct from
 *                  `prone` because a tripwire at ankle height misses
 *                  a swimming fish but might catch a crawler — the
 *                  body is at a different height even though both
 *                  are flat.
 * - `varied`     — context-dependent. The mode doesn't determine a
 *                  single profile; consumers should query per-actor
 *                  + per-host data (e.g., a climbing actor's profile
 *                  varies by the Climbable axis they engage; a
 *                  vehicle's profile varies by its specific design).
 */
export type BodyProfile = 'prone' | 'crouched' | 'upright' | 'horizontal' | 'varied';
export type GroundContact = 'none' | 'partial' | 'full';

const NOISE_LEVELS: readonly NoiseLevel[] =
  ['silent', 'quiet', 'normal', 'loud'];
const BODY_PROFILES: readonly BodyProfile[] =
  ['prone', 'crouched', 'upright', 'horizontal', 'varied'];
const GROUND_CONTACTS: readonly GroundContact[] =
  ['none', 'partial', 'full'];

export class LocomotionMode extends SingletonMixin(PropertiedMixin(Idea)) {
  protected name: string = '';
  protected speed: number = 1.0;
  protected noiseLevel: NoiseLevel = 'normal';
  protected bodyProfile: BodyProfile = 'upright';
  protected groundContact: GroundContact = 'full';
  protected requiresBodyPlanMode: string[] = [];
  protected requiresPosture: string[] = [];
  protected costMultiplier: number = 1.0;
  protected passthrough: boolean = false;
  protected conveyanceMixin: string | null = null;
  protected enablementMixin: string | null = null;

  static persistentFields = [
    'name',
    'speed',
    'noiseLevel',
    'bodyProfile',
    'groundContact',
    'requiresBodyPlanMode',
    'requiresPosture',
    'costMultiplier',
    'passthrough',
    'conveyanceMixin',
    'enablementMixin',
  ];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getSpeed(): number { return this.speed; }
  public setSpeed(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `LocomotionMode.setSpeed: must be a finite positive number; got ${value}`
      );
    }
    this.speed = value;
  }

  public getNoiseLevel(): NoiseLevel { return this.noiseLevel; }
  public setNoiseLevel(value: NoiseLevel): void {
    if (!NOISE_LEVELS.includes(value)) {
      throw new TypeError(
        `LocomotionMode.setNoiseLevel: invalid value '${value}'; ` +
        `expected one of ${NOISE_LEVELS.join(', ')}`
      );
    }
    this.noiseLevel = value;
  }

  public getBodyProfile(): BodyProfile { return this.bodyProfile; }
  public setBodyProfile(value: BodyProfile): void {
    if (!BODY_PROFILES.includes(value)) {
      throw new TypeError(/* analogous */);
    }
    this.bodyProfile = value;
  }

  public getGroundContact(): GroundContact { return this.groundContact; }
  public setGroundContact(value: GroundContact): void {
    if (!GROUND_CONTACTS.includes(value)) {
      throw new TypeError(/* analogous */);
    }
    this.groundContact = value;
  }

  public getRequiresBodyPlanMode(): readonly string[] {
    return this.requiresBodyPlanMode;
  }
  public setRequiresBodyPlanMode(value: string[]): void {
    assertUniqueNonEmpty(value, 'setRequiresBodyPlanMode');
    this.requiresBodyPlanMode = value;
  }

  public getRequiresPosture(): readonly string[] {
    return this.requiresPosture;
  }
  public setRequiresPosture(value: string[]): void {
    assertUniqueNonEmpty(value, 'setRequiresPosture');
    this.requiresPosture = value;
  }

  public getCostMultiplier(): number { return this.costMultiplier; }
  public setCostMultiplier(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(/* analogous */);
    }
    this.costMultiplier = value;
  }

  public getPassthrough(): boolean { return this.passthrough; }
  public setPassthrough(value: boolean): void { this.passthrough = value; }

  public getConveyanceMixin(): string | null { return this.conveyanceMixin; }
  public setConveyanceMixin(value: string | null): void {
    this.conveyanceMixin = value;
  }

  /**
   * The enablement-mixin name (Mixins-registry constant) that an
   * actor's scope must compose for this non-passthrough mode to
   * engage. `null` means no enablement-scope check (walk-shaped).
   * Symmetric with `conveyanceMixin` on the passthrough side: both
   * are author-data on the template; the Api reads them via
   * getEnablementMixin() / getConveyanceMixin() rather than
   * switching on mode name.
   */
  public getEnablementMixin(): string | null { return this.enablementMixin; }
  public setEnablementMixin(value: string | null): void {
    this.enablementMixin = value;
  }
}

function assertUniqueNonEmpty(value: string[], where: string): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError(
        `LocomotionMode.${where}: entries must be non-empty strings`
      );
    }
    if (seen.has(v)) {
      throw new TypeError(
        `LocomotionMode.${where}: duplicate entry '${v}'`
      );
    }
    seen.add(v);
  }
}
```

### 4.2 `lib/locomotion/Climbable.ts` (plus shared `Enablement` interface)

#### Shared `Enablement` interface (`lib/locomotion/Enablement.ts`)

Before Climbable's class shape: all three per-mode enablement
mixins (`Climbable` / `Swimmable` / `Flyable`) implement a single
shared TypeScript interface so that `LocomotionApi.checkEnablement`
can dispatch field-driven (off `LocomotionMode.getEnablementMixin()`)
without per-mode method-name switching.

```ts
// lib/locomotion/Enablement.ts

/**
 * Shared contract for the three per-mode enablement mixins
 * (Climbable / Swimmable / Flyable). Each composes on Stuff,
 * declares axes the mode can be engaged in, optionally carries a
 * difficulty score, and gates engagement by comparing an actor's
 * per-mode capability Property against the difficulty.
 *
 * The mixin's own Property constant (CLIMBING_CAPABILITY_PROP,
 * SWIMMING_CAPABILITY_PROP, FLIGHT_CAPABILITY_PROP) stays per-mode
 * for content-authoring clarity — an actor's 'climbing' /
 * 'swimming' / 'flight' Properties are distinct, meaningful
 * identifiers. The method shape unifies so generic Api code
 * never names a specific mode.
 */
import type { Stuff } from '../stuff/Stuff';

export interface Enablement {
  getAxes(): readonly string[];
  setAxes(value: string[]): void;
  /** True if this host enables the mode in the given direction. */
  canEngageAxis(direction: string): boolean;
  getDifficulty(): number | null;
  setDifficulty(value: number | null): void;
  /** True if the actor has enough capability for this scope's difficulty. */
  canBeEngagedBy(actor: Stuff): boolean;
}
```

The per-mode mixin's exported interface extends `Enablement`. The
mixin class implements the four method pairs by reading its own
per-mode field + Property.

#### `ClimbableMixin`

```ts
/**
 * ClimbableMixin — host capability: "I let an actor in scope engage
 * climb mode."
 *
 * Composes on Stuff. Typical hosts: ladders, ropes, vines, cliff
 * faces. Locations can compose Climbable too (a cliff-zone Location
 * is climbable everywhere within it).
 *
 * Difficulty is an RPG-mechanical knob — substrate doesn't enforce a
 * scale. Comparison is actor.CLIMBING_CAPABILITY_PROP (default 1) vs.
 * host.difficulty (when non-null).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Enablement } from './Enablement';
import { Property } from '../stuff/Propertied';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../mixin';

/**
 * Property an actor sets to expose its current climbing capability.
 * Default (unset) is 1.
 */
export const CLIMBING_CAPABILITY_PROP = Property.of<number>('climbing');

// Climbable's exported interface extends the shared Enablement
// contract; no Climbable-specific methods. Authors interact via the
// shared shape; the mixin name (ClimbableMixin) communicates which
// mode this hosts.
export interface Climbable extends Enablement {}

export function ClimbableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class ClimbableMixin extends Base implements Enablement {
    static _mixinName = 'ClimbableMixin';
    static persistentFields = ['axes', 'difficulty'];

    public axes: string[] = [];
    public difficulty: number | null = null;

    public getAxes(): readonly string[] { return this.axes; }
    public setAxes(value: string[]): void {
      assertUniqueNonEmptyAxes(value, 'setAxes');
      this.axes = value;
    }

    public canEngageAxis(direction: string): boolean {
      if (this.axes.includes('*')) return true;
      return this.axes.includes(direction);
    }

    public getDifficulty(): number | null { return this.difficulty; }
    public setDifficulty(value: number | null): void {
      if (value !== null) {
        if (!Number.isFinite(value) || value <= 0) {
          throw new RangeError(
            `Climbable.setDifficulty: must be null or a finite positive ` +
            `number; got ${value}`
          );
        }
      }
      this.difficulty = value;
    }

    public canBeEngagedBy(actor: Stuff): boolean {
      if (this.difficulty === null) return true;
      if (!MixinApi.hasMixin(actor, Mixins.Propertied)) return false;
      const cap =
        (actor as Stuff & {
          getProp: (p: typeof CLIMBING_CAPABILITY_PROP) => number | undefined;
        }).getProp(CLIMBING_CAPABILITY_PROP) ?? 1;
      return cap >= this.difficulty;
    }
  };
}

function assertUniqueNonEmptyAxes(value: string[], where: string): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError(
        `Climbable.${where}: entries must be non-empty strings`
      );
    }
    if (seen.has(v)) {
      throw new TypeError(
        `Climbable.${where}: duplicate entry '${v}'`
      );
    }
    seen.add(v);
  }
}
```

### 4.3 `lib/locomotion/Swimmable.ts`

Structurally identical to Climbable: same imports including
`import type { Enablement } from './Enablement'`; implements the
shared `Enablement` interface; exports
`SWIMMING_CAPABILITY_PROP = Property.of<number>('swimming')`;
fields `axes` + `difficulty`; methods `getAxes` / `setAxes` /
`canEngageAxis` / `getDifficulty` / `setDifficulty` /
`canBeEngagedBy` (the last reads `SWIMMING_CAPABILITY_PROP`).
Marker `_mixinName = 'SwimmableMixin'`.

### 4.4 `lib/locomotion/Flyable.ts`

Structurally identical to Climbable: same imports including
`import type { Enablement } from './Enablement'`; implements the
shared `Enablement` interface; exports
`FLIGHT_CAPABILITY_PROP = Property.of<number>('flight')`; fields
`axes` + `difficulty`; methods `getAxes` / `setAxes` /
`canEngageAxis` / `getDifficulty` / `setDifficulty` /
`canBeEngagedBy` (the last reads `FLIGHT_CAPABILITY_PROP`).
Marker `_mixinName = 'FlyableMixin'`.

### 4.5 `mud/api/locomotion.ts` (LocomotionApi)

```ts
/**
 * LocomotionApi — cross-cutting helpers for the locomotion subsystem.
 *
 * Holds mode resolution, eligibility predicates, enablement walks,
 * passthrough-chain resolution, emission resolution, and the
 * engageAround / isTransientEngagement framework-internal helpers.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Containable } from '../lib/spatial/Containable';
import type { Mobile } from '../lib/spatial/Mobile';
import type { Container } from '../lib/spatial/Container';
import type { Exit, TraversalGuard, TraversalGate } from '../lib/boundary/Exit';
import {
  LocomotionMode,
  NoiseLevel,
  BodyProfile,
  GroundContact,
} from '../lib/locomotion/LocomotionMode';
import type { Enablement } from '../lib/locomotion/Enablement';
import type { Climbable } from '../lib/locomotion/Climbable';
import type { Swimmable } from '../lib/locomotion/Swimmable';
import type { Flyable } from '../lib/locomotion/Flyable';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';
import { SlotApi } from './slot';
import { Mixins } from '../lib/mixin';
import { Postures } from '../lib/slot/Postured';
import { resolveSetting } from '../lib/shell/Environment';

export interface EmissionData {
  modeName: string;
  noiseLevel: NoiseLevel;
  bodyProfile: BodyProfile;
  groundContact: GroundContact;
  resolvedHostChain: Stuff[];
}

export class LocomotionApi {

  // 10.1 ─── mode resolution ────────────────────────────────────────

  /**
   * Resolve a LocomotionMode by short name (e.g. 'walk') or full
   * templatePath (e.g. '/lib/locomotion/walk'). All LocomotionMode
   * singletons live at `/lib/locomotion/<name>`, so the prefix is
   * universal — the Api accepts either form ergonomically.
   */
  public static modeOf(nameOrPath: string): LocomotionMode | null {
    const path = LocomotionApi.#toModePath(nameOrPath);
    return StuffApi.findByTemplatePath<LocomotionMode>(path) ?? null;
  }

  public static modeOfOrThrow(nameOrPath: string): LocomotionMode {
    const mode = LocomotionApi.modeOf(nameOrPath);
    if (!mode) {
      const path = LocomotionApi.#toModePath(nameOrPath);
      throw new Error(`LocomotionMode not loaded: ${path}`);
    }
    return mode;
  }

  /** Short name → full path; full path passes through. */
  static #toModePath(nameOrPath: string): string {
    if (nameOrPath.startsWith('/')) return nameOrPath;
    return `/lib/locomotion/${nameOrPath}`;
  }

  public static allModes(): readonly LocomotionMode[] {
    // Walks StuffApi.getAllObjects() filtering for LocomotionMode
    // instances. Acceptable O(N); v1 universe is small enough.
    const out: LocomotionMode[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (obj instanceof LocomotionMode) out.push(obj);
    }
    return out;
  }

  public static resolveHostMode(host: Stuff & Mobile): LocomotionMode {
    const engaged = host.getEngagedMode();
    if (engaged) return engaged;
    if (MixinApi.isDrivable(host)) {
      const veh = host.getVehicularMode();
      if (veh) return veh;
    }
    return LocomotionApi.modeOfOrThrow('walk');  // short name; resolves to /lib/locomotion/walk
  }

  // 10.2 ─── eligibility predicates ─────────────────────────────────

  public static bodyPlanAllows(actor: Stuff, mode: LocomotionMode): boolean {
    const required = mode.getRequiresBodyPlanMode();
    if (required.length === 0) return true;
    if (!MixinApi.isOrganism(actor)) return false;
    const species = actor.getSpecies();
    const bodyPlan = species?.getBodyPlan();
    const planModes = bodyPlan?.getLocomotionModes() ?? [];
    return required.some(m => planModes.includes(m));
  }

  public static postureAllows(actor: Stuff, mode: LocomotionMode): boolean {
    const required = mode.getRequiresPosture();
    if (required.length === 0) return true;
    const posture = MixinApi.isPosed(actor)
      ? actor.getPosture()
      : Postures.Stand;
    return required.includes(posture);
  }

  public static exitAllowsMode(exit: Exit, mode: LocomotionMode): boolean {
    return exit.allowsMode(mode.getName());
  }

  public static canEngage(actor: Stuff, mode: LocomotionMode): boolean {
    return LocomotionApi.bodyPlanAllows(actor, mode)
        && LocomotionApi.postureAllows(actor, mode);
  }

  /**
   * Run the mode-gating gates against an actor + a pre-resolved
   * exit. Used by `LocomotionControllerBase` after MQL has already
   * resolved `target.via.exit` (via the `canReach` validator on the
   * YAML view). No exit lookup happens here — the exit is given.
   *
   * Order of gates (first failure surfaces):
   *   1. body-plan eligibility
   *   2. posture eligibility
   *   3. exit-allowed-modes (delegates to `Exit.canTraverse`)
   *   4. enablement (per-mode, field-driven via `getEnablementMixin`)
   */
  public static canTraverseExit(
    actor: Stuff & Containable,
    exit: Exit,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    if (!LocomotionApi.bodyPlanAllows(actor, mode)) {
      return {
        ok: false, gate: 'bodyPlan', mode: mode.getName(),
        reason: `Your body can't ${mode.getName()}.`,
      };
    }
    if (!LocomotionApi.postureAllows(actor, mode)) {
      return {
        ok: false, gate: 'posture', mode: mode.getName(),
        reason: `You can't ${mode.getName()} from this posture.`,
      };
    }
    const exitGuard = exit.canTraverse(actor, mode.getName());
    if (!exitGuard.ok) return exitGuard;
    return LocomotionApi.checkEnablement(actor, mode, direction);
  }

  // 10.3 ─── enablement walk ────────────────────────────────────────

  public static checkEnablement(
    actor: Stuff & Containable,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    // Passthrough modes (ride / drive): scope check is slot-
    // occupation on a host composing the mode's conveyanceMixin.
    if (mode.getPassthrough()) {
      return LocomotionApi.#checkConveyance(actor, mode);
    }
    // No enablement mixin (walk-shaped, vehicular host-engaged):
    // no scope check.
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return { ok: true };
    // Mode has an enablement mixin (climb / swim / fly): walk the
    // actor's scope looking for a host that composes the mixin and
    // accepts the direction, then ask the host whether the actor
    // has enough capability. Generic — no per-mode name appears.
    return LocomotionApi.#checkEnablementScope(actor, mode, direction, mixinName);
  }

  static #checkEnablementScope(
    actor: Stuff & Containable,
    mode: LocomotionMode,
    direction: string,
    mixinName: string,
  ): TraversalGuard {
    const host = LocomotionApi.#findEnablementHost(actor, mixinName, direction);
    if (!host) {
      return {
        ok: false, gate: 'enablement', mode: mode.getName(),
        reason: `There's no way to ${mode.getName()} ${direction}.`,
        context: { missing: mixinName },
      };
    }
    if (!host.canBeEngagedBy(actor)) {
      return {
        ok: false, gate: 'capability', mode: mode.getName(),
        reason: `That's too hard for you.`,
        context: { difficulty: host.getDifficulty() },
      };
    }
    return { ok: true };
  }

  // Generic scope walk: find any host in actor's container (or any
  // Containable within it) that composes `mixinName` and accepts
  // `direction`. No mode name appears.
  //
  // Parameter typed `Stuff & Containable` (not bare Stuff) — every
  // caller goes through `canTraverseExit` which is invoked after
  // LocomotionControllerBase.execute has narrowed via
  // `MixinApi.isContainable(actor)`. Tightening the parameter
  // eliminates an in-method cast.
  static #findEnablementHost(
    actor: Stuff & Containable,
    mixinName: string,
    direction: string,
  ): (Stuff & Enablement) | null {
    const container = actor.getContainer();
    if (!container) return null;
    const candidates: Stuff[] = [container];
    if (MixinApi.isContainer(container)) {
      for (const item of container.getContents()) candidates.push(item);
    }
    for (const c of candidates) {
      const enablement = LocomotionApi.#asEnablement(c, mixinName);
      if (enablement && enablement.canEngageAxis(direction)) {
        return enablement;
      }
    }
    return null;
  }

  /**
   * Runtime-checked narrow from `Stuff` to `Stuff & Enablement`.
   * The check (`MixinApi.hasMixin(c, mixinName)`) is the runtime
   * guard; the cast is safe by construction because the only mixin
   * names passed here come from `LocomotionMode.getEnablementMixin()`
   * — a field whose values are guaranteed (by spec, § 4.2) to name
   * mixins that implement the `Enablement` interface. Climbable /
   * Swimmable / Flyable all implement Enablement; future enablement
   * mixins must as well.
   */
  static #asEnablement(c: Stuff, mixinName: string): (Stuff & Enablement) | null {
    if (!MixinApi.hasMixin(c, mixinName)) return null;
    return c as Stuff & Enablement;
  }

  // Passthrough conveyance check (ride / drive).
  static #checkConveyance(actor: Stuff, mode: LocomotionMode): TraversalGuard {
    const conveyance = mode.getConveyanceMixin();
    if (!conveyance) return { ok: true };  // misauthored passthrough
    if (!MixinApi.isSlottable(actor)) {
      return {
        ok: false, gate: 'noConveyance', mode: mode.getName(),
        reason: `You're not ${mode.getName()}ing anything.`,
      };
    }
    const occupied = SlotApi.findOccupiedSlots(actor);
    for (const [host] of occupied.entries()) {
      if (MixinApi.hasMixin(host, conveyance)) return { ok: true };
    }
    return {
      ok: false, gate: 'noConveyance', mode: mode.getName(),
      reason: `You're not ${mode.getName()}ing anything.`,
    };
  }

  // 10.4 ─── passthrough chain ──────────────────────────────────────

  public static findConveyanceHost(
    actor: Stuff,
    mode: LocomotionMode,
  ): Stuff | null {
    if (!mode.getPassthrough()) {
      throw new Error(
        `LocomotionApi.findConveyanceHost: '${mode.getName()}' is not a ` +
        `passthrough mode (programmatic misuse)`
      );
    }
    if (!MixinApi.isSlottable(actor)) return null;
    const mixinName = mode.getConveyanceMixin();
    if (!mixinName) return null;
    const occupied = SlotApi.findOccupiedSlots(actor);
    for (const [host] of occupied.entries()) {
      if (MixinApi.hasMixin(host, mixinName)) return host;
    }
    return null;
  }

  public static emissionAt(mover: Stuff): EmissionData | null {
    if (!MixinApi.isMobile(mover)) return null;
    const chain: Stuff[] = [];
    let cursor: Stuff = mover;
    let mode = (cursor as Stuff & Mobile).getEngagedMode();
    let guard = 16;
    while (mode && mode.getPassthrough() && guard-- > 0) {
      chain.push(cursor);
      const host = LocomotionApi.findConveyanceHost(cursor, mode);
      if (!host || !MixinApi.isMobile(host)) return null;
      cursor = host;
      mode = (cursor as Stuff & Mobile).getEngagedMode()
           ?? LocomotionApi.resolveHostMode(cursor as Stuff & Mobile);
    }
    if (!mode) return null;
    return {
      modeName: mode.getName(),
      noiseLevel: mode.getNoiseLevel(),
      bodyProfile: mode.getBodyProfile(),
      groundContact: mode.getGroundContact(),
      resolvedHostChain: chain,
    };
  }

  // 10.5 ─── eligibility queries ────────────────────────────────────

  public static eligibleModes(actor: Stuff): readonly LocomotionMode[] {
    return LocomotionApi.allModes().filter(mode =>
      LocomotionApi.canEngage(actor, mode)
    );
  }

  // 10.6 ─── engaged mode (untyped-safe) ────────────────────────────

  public static engagedMode(actor: Stuff): LocomotionMode | null {
    if (!MixinApi.isMobile(actor)) return null;
    return actor.getEngagedMode();
  }

  // 10.8 ─── engagement lifecycle ───────────────────────────────────

  public static async engageAround<T>(
    actor: Stuff & Mobile,
    mode: LocomotionMode,
    exit: Exit,
    action: () => Promise<T>,
  ): Promise<T> {
    actor.setEngagedMode(mode);
    try {
      return await action();
    } finally {
      if (LocomotionApi.isTransientEngagement(mode, exit)) {
        actor.setEngagedMode(null);
      }
    }
  }

  public static isTransientEngagement(
    mode: LocomotionMode,
    exit: Exit,
  ): boolean {
    if (mode.getPassthrough()) return false;
    // No enablement-mixin (walk-shaped) → no scope to persist in
    // after the move → always transient.
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return true;
    // Mode HAS an enablement mixin (climb / swim / fly): persistent
    // if the destination still composes the mixin OR contains a
    // Containable with it; transient otherwise.
    const dest = exit.getDestination();
    if (MixinApi.hasMixin(dest, mixinName)) return false;
    if (MixinApi.isContainer(dest)) {
      for (const item of dest.getContents()) {
        if (MixinApi.hasMixin(item, mixinName)) return false;
      }
    }
    return true;
  }

  // 10.9 ─── default-mode convenience ───────────────────────────────

  /**
   * Resolve the actor's `movement.defaultMode` setting (defaults to
   * `'walk'`), look up the corresponding LocomotionMode singleton,
   * and traverse `exit` with full engagement bookkeeping via
   * `engageAround`. Convenience for programmatic callers that want
   * "use the actor's preferred mode" without resolving the singleton
   * themselves.
   *
   * Three traversal paths, distinct:
   * - `Mobile.teleport(destination, opts?)` — raw containment move;
   *   bypasses mode-gate, no engagement, no narration. Use for
   *   magic shove, admin teleport, knockback.
   * - `actor.traverse(exit, mode)` — explicit mode; pipeline runs
   *   gate + engagement. Use when the caller knows the mode.
   * - `LocomotionApi.traverseWithDefault(actor, exit)` (this method)
   *   — use the actor's `movement.defaultMode` setting. Same as
   *   what the `go` verb does, but reachable from non-controller
   *   call sites (scripted NPC AI, activity-driven movement, etc.).
   *
   * Throws on mode-gate failure (mirrors `Mobile.traverse`'s
   * contract per Q12.4).
   */
  public static async traverseWithDefault(
    actor: Stuff & Mobile & Containable,
    exit: Exit,
  ): Promise<void> {
    const modeName =
      resolveSetting<string>(actor, 'movement.defaultMode') ?? 'walk';
    const mode = LocomotionApi.modeOfOrThrow(modeName);
    await LocomotionApi.engageAround(actor, mode, exit, () =>
      actor.traverse(exit, mode),
    );
  }
}

SecurityApi.decorateApiClass(LocomotionApi);
```

### 4.6 `obj/command/LocomotionControllerBase.ts`

```ts
/**
 * LocomotionControllerBase — abstract base for the six locomotion
 * verb controllers (walk / climb / swim / fly / ride / drive).
 *
 * Each concrete controller overrides modeName() to return its mode's
 * short name (e.g. 'climb'); LocomotionApi resolves the full
 * templatePath (`/lib/locomotion/<name>`) internally. Routing for
 * passthrough modes (ride / drive) walks to the conveyance host;
 * non-passthrough modes traverse directly.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Exit, TraversalGuard } from '../../lib/boundary/Exit';
import { ExitableVessel } from '../../lib/boundary/ExitableVessel';
import { LocomotionApi } from '../../api/locomotion';
import type { LocomotionMode } from '../../lib/locomotion/LocomotionMode';
import { MixinApi } from '../../api/mixin';

import type { MqlOneResult } from '../../api/mql';

export interface LocomotionModel extends CommandModel {
  /**
   * MQL-resolved target. The parser stamps `target.via.exit` with
   * the resolved Exit when the player typed a direction (or door
   * alias) that matches an exit on the actor's container. The
   * controller never does manual exit lookup — `target.via?.exit`
   * IS the exit, pre-validated via the `canReach` MQL validator on
   * the YAML view. Same shape as `go.yaml` / `GoController`.
   */
  target?: MqlOneResult;
}

export abstract class LocomotionControllerBase
  extends CommandController<LocomotionModel> {

  /**
   * Short name for this verb's mode (e.g. 'climb', 'swim', 'fly').
   * `LocomotionApi.modeOfOrThrow` resolves the full templatePath
   * `/lib/locomotion/<name>` internally — concrete controllers
   * don't construct paths.
   */
  protected abstract modeName(context: CommandContext): string;

  async execute(
    model: LocomotionModel,
    context: CommandContext,
  ): Promise<CommandResult> {
    const actor = context.commandGiver;
    if (!MixinApi.isContainable(actor) || !MixinApi.isMobile(actor)) {
      return { success: false, summary: "can't move" };
    }
    const mode = LocomotionApi.modeOfOrThrow(this.modeName(context));

    // MQL has already resolved the player's typed direction into a
    // target with `via.exit` populated (per the `canReach` validator
    // on the YAML view). No manual exit lookup.
    const target = model.target;
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: this.composeRejection(
          { ok: false, gate: 'exitMode', mode: mode.getName() },
          mode, model,
        ),
      };
    }
    // Resolve to an Exit. MQL's `target.via.exit` is the primary
    // path (typed-direction or door-alias). The ExitableVessel
    // entry-exit fallback handles sibling-vessel entry (e.g.,
    // `walk cabin` / `climb cabin`) where MQL resolved to the vessel
    // Stuff but not via a direction. Mirrors GoController's pre-
    // locomotion behavior; preserves existing UX across all 6 verbs.
    let exit: Exit | null = target.via?.exit ?? null;
    if (!exit && target.stuff instanceof ExitableVessel) {
      exit = target.stuff.getEntryExit();
    }
    if (!exit) {
      return {
        success: false,
        summary: this.composeRejection(
          { ok: false, gate: 'exitMode', mode: mode.getName() },
          mode, model,
        ),
      };
    }
    const direction = exit.getDirection();

    // Run the remaining gates (body-plan, posture, exit-allowedModes,
    // enablement-with-capability). The MQL canReach validator has
    // already verified the exit is reachable; canTraverse adds the
    // mode-specific gates.
    const guard = LocomotionApi.canTraverseExit(actor, exit, mode, direction);
    if (!guard.ok) {
      return {
        success: false,
        summary: this.composeRejection(guard, mode, model),
      };
    }

    if (mode.getPassthrough()) {
      const host = LocomotionApi.findConveyanceHost(actor, mode);
      if (!host || !MixinApi.isMobile(host) || !MixinApi.isContainable(host)) {
        return {
          success: false,
          summary: this.composeRejection(
            { ok: false, gate: 'noConveyance', mode: mode.getName() },
            mode, model,
          ),
        };
      }
      const hostMode = LocomotionApi.resolveHostMode(host);
      await LocomotionApi.engageAround(host, hostMode, exit, () =>
        host.traverse(exit, hostMode),
      );
    } else {
      await LocomotionApi.engageAround(actor, mode, exit, () =>
        actor.traverse(exit, mode),
      );
    }

    return { success: true };
  }

  /**
   * Controllers own prose. Default base-class composition branches
   * on guard.gate; concrete controllers override per-verb (e.g.
   * Climb's capability prose says "too hard for you").
   */
  protected composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    _model: LocomotionModel,
  ): string {
    switch (guard.gate) {
      case 'bodyPlan':    return `Your body can't ${mode.getName()}.`;
      case 'posture':     return `You can't ${mode.getName()} from this posture.`;
      case 'exitMode':    return `You can't ${mode.getName()} that way.`;
      case 'enablement':  return guard.reason ?? `There's no way to ${mode.getName()} here.`;
      case 'capability':  return guard.reason ?? 'That\'s too hard for you.';
      case 'noConveyance': return `You're not ${mode.getName()}ing anything.`;
      case 'blocked':     return 'The way is blocked.';
      case 'door':        return guard.reason ?? 'The way is closed.';
      default:            return guard.reason ?? "You can't go that way.";
    }
  }
}
```

### 4.7 `obj/command/ClimbController.ts` (full)

```ts
/**
 * ClimbController — climb verb.
 *
 * Verb-appropriate rejection prose: climbs that fail at capability
 * read "this climb looks too hard for you"; missing-Climbable reads
 * "there's nothing to climb {direction}".
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';
import type { LocomotionModel } from './LocomotionControllerBase';
import type { LocomotionMode } from '../../lib/locomotion/LocomotionMode';
import type { TraversalGuard } from '../../lib/boundary/Exit';

export class ClimbController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'climb';
  }

  protected composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'enablement') {
      // The exit's direction is on the resolved target's via stamp.
      const direction = model.target?.via?.exit?.getDirection() ?? 'that way';
      return `There's nothing to climb ${direction}.`;
    }
    if (guard.gate === 'capability') {
      return 'This climb looks too hard for you.';
    }
    return super.composeRejection(guard, mode, model);
  }
}
```

### 4.8 `obj/command/DriveController.ts` (full)

```ts
/**
 * DriveController — drive verb (passthrough to host's vehicularMode).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';

export class DriveController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'drive';
  }
}
```

### 4.8a The other four concrete controllers — same shape

`WalkController` / `SwimController` / `FlyController` /
`RideController` share the trivial `modeName()` body of
DriveController. Per-controller `composeRejection` overrides (when
different from the base default) follow the per-mode prose table
below — substrate defaults apply for all other gates.

| Controller | `modeName()` returns | `composeRejection` overrides |
|---|---|---|
| `WalkController` | `'walk'` | **None.** Default base prose applies for every gate. Walk has no enablement gate (mixinName is null in `checkEnablement`), so the `enablement` and `capability` gates never fire. |
| `ClimbController` | `'climb'` | `enablement` → `"There's nothing to climb ${direction}."`; `capability` → `"This climb looks too hard for you."` |
| `SwimController` | `'swim'` | `enablement` → `"There's no water to swim in."`; `capability` → `"This water's too rough for you."` |
| `FlyController` | `'fly'` | `enablement` → `"There's no room to fly here."`; `capability` → `"The wind's too strong for you to fly."` |
| `RideController` | `'ride'` | `noConveyance` → `"You're not mounted."` |
| `DriveController` | `'drive'` | `noConveyance` → `"You're not driving anything."` |

Each override calls `super.composeRejection(guard, mode, model)`
as the fallback for gates it doesn't customize. ClimbController's
full body is shown in § 4.7; the other four mirror that shape.

### 4.9 `obj/command/GoController.ts` (refactor — full new body)

```ts
/**
 * GoController — locomotion: dispatch-by-default-mode.
 *
 * Reads `movement.defaultMode` setting (default 'walk') and runs the
 * same pipeline as a literal mode verb. Per § 6.6 of the requirements
 * doc, go is deliberately dumb — it dispatches whatever the setting
 * says, regardless of the target exit's allowedModes.
 *
 * Since `LocomotionControllerBase` uses the same `target: MqlOneResult`
 * model shape as `go.yaml` already used (resolved by MQL via the
 * `canReach` validator), GoController needs NO adapter — it just
 * overrides `modeName()`. The ExitableVessel entry-exit fallback
 * (`go cabin` into a sibling vessel) lives in the base class and is
 * inherited cleanly.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';
import { resolveSetting } from '../../lib/shell/Environment';

export class GoController extends LocomotionControllerBase {
  protected modeName(context: CommandContext): string {
    return (
      resolveSetting<string>(context.commandGiver, 'movement.defaultMode')
      ?? 'walk'
    );
  }
}
```

### 4.10 Diff: `lib/spatial/Mobile.ts`

Additions (full descriptions; agent edits surgically):

```ts
// New imports at top:
import { LocomotionApi } from '../../api/locomotion';
import type { LocomotionMode } from '../locomotion/LocomotionMode';

// Modify Mobile interface — UPDATE the existing `traverse` declaration
// (line ~63 of current Mobile.ts) to take the LocomotionMode singleton
// instead of `mode: string`. Add the new methods alongside.
export interface Mobile {
  // ... existing fields (canTraverse, onTraversed, teleport, etc.)

  /**
   * MODIFIED: parameter type changes from `string` to `LocomotionMode`.
   * The existing Mobile.ts:63 declaration:
   *   traverse(exit: Exit, mode: string): Promise<void>;
   * becomes:
   */
  traverse(exit: Exit, mode: LocomotionMode): Promise<void>;

  /** Convenience getter — resolves to the singleton (null if not loaded). */
  getEngagedMode(): LocomotionMode | null;

  /** Setter — accepts the singleton (or null); stores its path internally. */
  setEngagedMode(mode: LocomotionMode | null): void;

  /** Predicate — accepts either the singleton or its name string. */
  isEngagedIn(mode: LocomotionMode | string): boolean;

  /**
   * Witness — invoked by Slotted.vacate when this actor releases
   * occupancy on `host`'s slot. Clears engagedMode when the mode is
   * passthrough and the host composes the mode's conveyanceMixin.
   */
  onSlotReleased?(host: Stuff & Slotted, slotName: string): void;
}

// Inside MobileMixin class body:

// Runtime-only field; NOT in persistentFields.
private _engagedModePath: string | null = null;

public getEngagedMode(): LocomotionMode | null {
  if (this._engagedModePath === null) return null;
  return LocomotionApi.modeOf(this._engagedModePath);
}

public setEngagedMode(mode: LocomotionMode | null): void {
  this._engagedModePath = mode === null ? null : mode.getTemplatePath();
}

public isEngagedIn(mode: LocomotionMode | string): boolean {
  if (this._engagedModePath === null) return false;
  if (typeof mode === 'string') {
    // Accepts short name OR full templatePath
    if (mode === this._engagedModePath) return true;
    const resolved = LocomotionApi.modeOf(this._engagedModePath);
    return resolved?.getName() === mode;
  }
  return this._engagedModePath === mode.getTemplatePath();
}

public onSlotReleased(host: Stuff, _slotName: string): void {
  const mode = this.getEngagedMode();
  if (!mode || !mode.getPassthrough()) return;
  const conveyanceMixin = mode.getConveyanceMixin();
  if (conveyanceMixin && MixinApi.hasMixin(host, conveyanceMixin)) {
    this.setEngagedMode(null);
  }
}

// MODIFY traverse() — takes the LocomotionMode singleton (Pattern C
// per the substrate consistency decision). The existing Mobile.ts
// already imports LocomotionMode for the getEngagedMode return type
// and onSlotReleased body; this just makes the locomotion-awareness
// uniform across the method surface.
async traverse(
  this: Stuff & Containable & Mobile,
  exit: Exit,
  mode: LocomotionMode
): Promise<void> {
  // Mode-gate (NEW — was a TODO): exit.canTraverse takes the short
  // name (matches `Exit.allowedModes` vocabulary).
  const guard = exit.canTraverse(this, mode.getName());
  if (!guard.ok) {
    throw new ContainmentError(
      `Mobile.traverse: ${guard.reason ?? "can't go that way"}`,
      { cause: { traversalGuard: guard } }
    );
  }
  // (rest of method unchanged — mode is available for future
  //  emission / narration threading if the messaging subsystem
  //  decides to read it off the announce hooks; for now it's used
  //  only for the gate check.)
}
```

**Conveyance-ripple recursion**: the existing `Mobile.traverse` body
(around line 291 of the current `Mobile.ts`) makes a recursive call
`await occupant.traverse(exit, mode)` to ripple movement through
slot-occupants (a rider on a horse moves with the horse). After
this MR's signature change, that recursive call is still valid
because the outer `mode: LocomotionMode` is the same singleton —
just pass it through. No body change needed beyond the type-of-mode
update at the call site.

**Programmatic-caller migration**: callers that previously passed
a mode string (e.g., the existing `GoController.traverse` body
calling `mover.traverse(exit, mode)` with `mode: string`) now pass
the singleton. Resolve via
`LocomotionApi.modeOfOrThrow('walk')` (short name; the Api builds
the full path internally) if you only have a string in hand. The refactored `GoController` (§ 4.9) does this
implicitly through `LocomotionControllerBase.execute`, which holds
the singleton from `modeOfOrThrow(this.modeName(context))` (the
Api accepts the short name and resolves the full path internally).

### 4.11 Diff: `lib/boundary/Exit.ts`

```ts
// Extend TraversalGuard:
export type TraversalGate =
  | 'blocked' | 'door' | 'exitMode'
  | 'bodyPlan' | 'posture' | 'enablement' | 'capability' | 'noConveyance';

export interface TraversalGuard {
  ok: boolean;
  reason?: string;
  gate?: TraversalGate;
  mode?: string;
  context?: Record<string, unknown>;
}

// Add field, accessors, allowsMode():
protected allowedModes: string[] = [];

static persistentFields = [...existing, 'allowedModes'];

public getAllowedModes(): readonly string[] { return this.allowedModes; }
public setAllowedModes(value: string[]): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError('Exit.setAllowedModes: entries must be non-empty strings');
    }
    if (seen.has(v)) {
      throw new TypeError(`Exit.setAllowedModes: duplicate '${v}'`);
    }
    seen.add(v);
  }
  this.allowedModes = value;
}

public allowsMode(modeName: string): boolean {
  if (this.allowedModes.length === 0) return modeName === 'walk';
  return this.allowedModes.includes(modeName);
}

// Replace canTraverse signature + body:
public canTraverse(
  _mover: Stuff & Containable,
  mode?: string,
): TraversalGuard {
  if (this.blocked) {
    return { ok: false, gate: 'blocked', reason: 'The way is blocked.' };
  }
  if (this.door && !this.door.getIsOpen()) {
    const doorName = DescribeApi.getDisplayName(this.door, 'door');
    return { ok: false, gate: 'door', reason: `The ${doorName} is closed.` };
  }
  if (mode != null && !this.allowsMode(mode)) {
    return { ok: false, gate: 'exitMode', mode,
             reason: `You can't ${mode} that way.` };
  }
  return { ok: true };
}
```

### 4.12 Diff: `lib/slot/Drivable.ts`

Two edits to this file:

1. **Bug fix**: `controllerSlot` default `'mount:1'` → `'driver:1'`.
   The current default collides with `Mountable.mountSlot`'s default
   (also `'mount:1'`); any Stuff composing both Mountable AND
   Drivable would have rider and driver compete for the same slot
   name. Tests always call `setControllerSlot(...)` explicitly so no
   existing test asserts the default — the change is purely
   forward-looking content authoring hygiene. The new default
   `'driver:1'` is semantically clear (driver's slot, not the
   mount's slot) and consistent with the `<role>:N` slot-naming
   convention.
2. **New field**: `_vehicularModePath` + `getVehicularMode()` /
   `setVehicularMode()` for the cross-subsystem
   locomotion-mode declaration on the vehicle.

```ts
// Add imports:
import type { LocomotionMode } from '../locomotion/LocomotionMode';
import { LocomotionApi } from '../../api/locomotion';

// (1) FIX existing controllerSlot default — line 53:
- public controllerSlot: string = 'mount:1';
+ public controllerSlot: string = 'driver:1';

// (2) Extend Drivable interface:
export interface Drivable {
  // existing
  getVehicularMode(): LocomotionMode | null;
  setVehicularMode(value: LocomotionMode | null): void;
}

// Inside DrivableMixin class body, alongside existing fields.
// REPLACE the existing `static persistentFields = ['controllerSlot']`
// declaration with the augmented list (statics are redeclared, not
// merged; the new declaration shadows the prior one in the same
// class body — the implementation agent updates the existing line
// in place rather than adding a second declaration).
static persistentFields = ['controllerSlot', '_vehicularModePath'];

protected _vehicularModePath: string | null = null;

public getVehicularMode(): LocomotionMode | null {
  if (this._vehicularModePath === null) return null;
  return LocomotionApi.modeOf(this._vehicularModePath);
}

public setVehicularMode(value: LocomotionMode | null): void {
  this._vehicularModePath =
    value === null ? null : value.getTemplatePath();
}
```

### 4.13 Diff: `lib/slot/Slotted.ts`

```ts
// In vacate(), after the `set.delete(candidate)` line:
public vacate(
  slot: string,
  candidate: Stuff & Slottable
): (Stuff & Slottable) | null {
  if (!this.getSlotNames().includes(slot)) {
    throw new Error(`Slotted.vacate: unknown slot '${slot}' on host`);
  }
  const set = this.slots.get(slot);
  if (!set || !set.has(candidate)) return null;
  set.delete(candidate);
  if (set.size === 0) this.slots.delete(slot);

  // NEW: fire release witness on the candidate. The witness method
  // is declared as an optional method on the Slottable interface
  // itself (see § 4.13a) — strictly typed, no duck-typing cast.
  // Locomotion's `Mobile.onSlotReleased` (§ 4.10) is the v1 consumer
  // that clears engagedMode for passthrough modes.
  if (candidate.onSlotReleased) {
    candidate.onSlotReleased(this, slot);
  }

  return candidate;
}
```

**Witness coverage of sibling release paths**:

- **`Slotted.vacateSole(slot)`** (the convenience single-occupant
  variant): also calls through to the same `set.delete` →
  release-witness path. Modify `vacateSole` identically (one
  `candidate.onSlotReleased?.(this, slot)` call after the
  delete). Otherwise riders / drivers dismounting via
  `vacateSole` would skip engagement-clear.
- **`SlotApi.transferOccupancy`** (the embodiment-side
  posture-transfer helper): internally calls `vacate` then
  `occupy`. The witness fires during the vacate half of the
  transfer. The `Mobile.onSlotReleased` body (§ 4.10) is **safe
  during transfer** because it only clears engagedMode when the
  vacated host composes the conveyance mixin — posture-transfer
  between two non-conveyance slot-hosts (e.g., chair → bed)
  doesn't match. The implementation agent should be aware the
  witness can fire mid-transfer and verify in tests
  (idempotency + no-spurious-clear coverage).

### 4.13a Diff: `lib/slot/Slottable.ts`

Add the optional witness method to the `Slottable` interface so
`Slotted.vacate` can invoke it with proper TypeScript narrowing — no
`as unknown as` cast. Any `Stuff & Slottable` may implement
`onSlotReleased` to react when the slot machinery vacates it; absent
implementation is a no-op. v1 consumer is `Mobile` (clears
engagedMode for passthrough modes); future consumers (polymorph
revert, status-clear, etc.) compose the witness the same way.

```ts
// Add to Slottable interface:
export interface Slottable {
  // ... existing methods

  /**
   * Optional witness fired by `Slotted.vacate(slot, candidate)`
   * after the candidate is removed from the host's occupant set.
   * Synchronous, in the same transaction as the vacate. v1's
   * `Mobile.onSlotReleased` clears `engagedMode` for passthrough
   * modes (ride/drive) so a dismounting rider's engagement clears.
   */
  onSlotReleased?(host: Stuff & Slotted, slotName: string): void;
}
```

Implementations that compose the witness (currently only `Mobile`)
get full TypeScript checking at the call site in `Slotted.vacate`.
Programmatic callers vacating a slot directly (e.g.,
`DismountController.execute`) trigger the witness through the same
path — no per-caller wiring.

### 4.14 Diff: `lib/mixin.ts`

Insert three entries at the end of the `Mixins` object, after `Drivable`:

```ts
  Drivable: 'DrivableMixin',
  Climbable: 'ClimbableMixin',     // NEW
  Swimmable: 'SwimmableMixin',     // NEW
  Flyable:   'FlyableMixin',       // NEW
} as const;
```

---

## 5. Seed file inventory

### 5.1 Mode singleton seeds

All nine files have the same YAML shape:

```yaml
# seeds/lib/locomotion/<name>.yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: <name>
  speed: <number>
  noiseLevel: <NoiseLevel>
  bodyProfile: <BodyProfile>
  groundContact: <GroundContact>
  requiresBodyPlanMode: [<string>, ...]
  requiresPosture: []
  costMultiplier: <number>
  passthrough: <boolean>
  conveyanceMixin: <string|null>
  enablementMixin: <string|null>
```

Below: each of the nine v1 mode seeds in full, with values
transcribed from § 5.3 of the requirements doc. Passthrough modes
leave numeric emission fields at their *defaults* (which are walk-
equivalent); the requirements doc table lists them as "(delegated)" —
the YAML doesn't author them, the class defaults take over.

#### `walk.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: walk
  speed: 1.0
  noiseLevel: normal
  bodyProfile: upright
  groundContact: full
  requiresBodyPlanMode: [walk]
  requiresPosture: []
  costMultiplier: 1.0
  passthrough: false
  conveyanceMixin: null
  enablementMixin: null
```

#### `climb.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: climb
  speed: 0.5
  noiseLevel: normal
  bodyProfile: varied
  groundContact: partial
  requiresBodyPlanMode: [climb]
  requiresPosture: []
  costMultiplier: 2.0
  passthrough: false
  conveyanceMixin: null
  enablementMixin: ClimbableMixin
```

#### `swim.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: swim
  speed: 0.5
  noiseLevel: quiet
  bodyProfile: horizontal
  groundContact: none
  requiresBodyPlanMode: [swim]
  requiresPosture: []
  costMultiplier: 2.0
  passthrough: false
  conveyanceMixin: null
  enablementMixin: SwimmableMixin
```

#### `fly.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: fly
  speed: 1.5
  noiseLevel: quiet
  bodyProfile: horizontal
  groundContact: none
  requiresBodyPlanMode: [fly]
  requiresPosture: []
  costMultiplier: 0.7
  passthrough: false
  conveyanceMixin: null
  enablementMixin: FlyableMixin
```

#### `ride.yaml`
```yaml
# ride is passthrough — numeric emission fields stay at class defaults.
# Trap / detection consumers walk the passthrough chain to the host's
# engaged mode via LocomotionApi.emissionAt.
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: ride
  requiresBodyPlanMode: []
  requiresPosture: []
  costMultiplier: 1.0
  passthrough: true
  conveyanceMixin: MountableMixin
  enablementMixin: null
```

#### `drive.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: drive
  requiresBodyPlanMode: []
  requiresPosture: []
  costMultiplier: 1.0
  passthrough: true
  conveyanceMixin: DrivableMixin
  enablementMixin: null
```

#### `wheeled.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: wheeled
  speed: 2.0
  noiseLevel: loud
  bodyProfile: upright
  groundContact: full
  requiresBodyPlanMode: []
  requiresPosture: []
  costMultiplier: 0.5
  passthrough: false
  conveyanceMixin: null
  enablementMixin: null
```

#### `sailed.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: sailed
  speed: 1.5
  noiseLevel: quiet
  bodyProfile: upright
  groundContact: partial
  requiresBodyPlanMode: []
  requiresPosture: []
  costMultiplier: 0.6
  passthrough: false
  conveyanceMixin: null
  enablementMixin: null
```

#### `aerial.yaml`
```yaml
class: /lib/locomotion/LocomotionMode
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: aerial
  speed: 3.0
  noiseLevel: loud
  bodyProfile: varied
  groundContact: none
  requiresBodyPlanMode: []
  requiresPosture: []
  costMultiplier: 0.4
  passthrough: false
  conveyanceMixin: null
  enablementMixin: null
```

### 5.2 Body-plan seed migrations

**Scope of edit**: only the `locomotionModes` list changes. The
`slots` declarations (including the hand-slot split — `hands` as
`WearableMixin` for gloves, `hand:left` / `hand:right` as
`WieldableMixin` for weapons; see `embodiment.md` "Wearable +
Wieldable overlap") are **pre-existing in the codebase** and not
touched by this MR. The `sensoryPorts` declarations likewise stay
unchanged.

#### `seeds/lib/body-plans/biped.yaml` — diff

```diff
   locomotionModes:
     - walk
+    - climb
+    - swim
```

Rationale: bipeds have arms/legs/lungs that physiologically permit
climbing and swimming (capability layer). The
`CLIMBING_CAPABILITY_PROP` / `SWIMMING_CAPABILITY_PROP` Properties
gate per-instance success (skill/equipment layer); a naive biped
defaults to capability 1 and drowns in deep water (`difficulty: 4`)
while succeeding in a calm shallow pond (`difficulty: 1` or null).
See § 9.2 Q12.3.

#### `seeds/lib/body-plans/quadruped.yaml` — diff

```diff
   locomotionModes:
     - walk
+    - swim
```

Rationale: most four-legged creatures can dog-paddle. Quadrupeds
don't have prehensile hands so they can't climb ladders in the
biped sense — climb stays out of their bodyplan.

#### `seeds/lib/body-plans/sessile.yaml`

No change — `locomotionModes: []` stays as authored. Sessile body
plans (peace lily, etc.) reject every locomotion verb at the
body-plan gate.

### 5.3 YAML command views

All six per-mode verb YAMLs share the same `target: object` shape as
`go.yaml` — MQL resolves the player's direction (or vessel name) to
an exit-bearing target via the `canReach` validator. The controller
reads `target.via?.exit` as the resolved Exit. No `direction: string`
field; no manual exit lookup.

#### `mud/cmd/walk.yaml`
```yaml
verbs: [walk]
controller: WalkController
description: "Walk through a named exit (compass, door, or vessel)."
validators:
  - /lib/command/validators/requiresAnimate
args:
  - name: target
    type: object
    required: true
    validators:
      - /lib/command/validators/canReach
```

#### `mud/cmd/climb.yaml`
```yaml
verbs: [climb]
controller: ClimbController
description: "Climb through a named exit (must be Climbable-enabled)."
validators:
  - /lib/command/validators/requiresAnimate
args:
  - name: target
    type: object
    required: true
    validators:
      - /lib/command/validators/canReach
```

#### `mud/cmd/swim.yaml`, `fly.yaml`, `ride.yaml`, `drive.yaml`

All four are structurally identical to `climb.yaml`, substituting
the verb / controller / description. They all use the
`target: object` shape with the `canReach` validator; the
controller reads `target.via?.exit`.

---

## 6. Test inventory

Roughly ~140-170 `it` blocks total. Block headings (no bodies):

### 6.1 `lib/locomotion/__tests__/LocomotionMode.test.ts`

```
describe('LocomotionMode')
  describe('class shape')
    it('extends SingletonMixin(PropertiedMixin(Idea))')
    it('has the expected persistentFields list')
    it('hydrates a walk template with the expected property values')
    it('hydrates a passthrough ride template with passthrough=true and conveyanceMixin=MountableMixin')

  describe('setSpeed')
    it('accepts a positive finite number')
    it('throws on 0')
    it('throws on negative')
    it('throws on NaN')
    it('throws on Infinity')

  describe('setNoiseLevel')
    it('accepts valid NoiseLevel values')
    it('throws on unknown value')

  describe('setBodyProfile')
    it('accepts each of the 5 valid values: prone / crouched / upright / horizontal / varied')
    it('throws on unknown value')
    it('swim seed declares bodyProfile: horizontal')
    it('fly seed declares bodyProfile: horizontal')
    it('climb seed declares bodyProfile: varied')
    it('walk / wheeled / sailed seeds declare bodyProfile: upright')
    it('aerial seed declares bodyProfile: varied')

  describe('setGroundContact')
    it('accepts valid GroundContact values')
    it('throws on unknown value')

  describe('setRequiresBodyPlanMode')
    it('accepts an empty array')
    it('accepts unique non-empty strings')
    it('throws on duplicate entries')
    it('throws on empty-string entry')

  describe('setRequiresPosture')
    it('accepts an empty array')
    it('accepts unique non-empty strings')
    it('throws on duplicate entries')

  describe('setCostMultiplier')
    it('accepts a positive finite number')
    it('throws on 0 / negative / NaN / Infinity')

  describe('setPassthrough / setConveyanceMixin')
    it('round-trips booleans and nullable strings')

  describe('setEnablementMixin')
    it('round-trips a Mixins-registry-constant string')
    it('round-trips null (walk-shaped no-scope-check)')
    it('climb seed declares enablementMixin: ClimbableMixin')
    it('swim seed declares enablementMixin: SwimmableMixin')
    it('fly seed declares enablementMixin: FlyableMixin')
    it('walk/wheeled/sailed/aerial/ride/drive seeds declare enablementMixin: null')

  describe('persistence roundtrip')
    it('clones a mode, mutates a setter, saves, reloads — values round-trip')
```

### 6.2 `lib/locomotion/__tests__/Climbable.test.ts`

```
describe('ClimbableMixin')
  describe('mixin marker')
    it('MixinApi.hasMixin returns true after composition')
    it('Mixins.Climbable resolves to ClimbableMixin')
    it('implements the shared Enablement interface (structural)')

  describe('axes')
    it('returns the configured axes')
    it('canEngageAxis returns true for a configured direction')
    it('canEngageAxis returns false for an unconfigured direction')
    it('canEngageAxis returns true for any direction when "*" is in axes')
    it('persists axes through save/reload')

  describe('setAxes validation')
    it('accepts unique non-empty strings')
    it('throws on duplicates')
    it('throws on empty-string entries')

  describe('difficulty roundtrip')
    it('defaults to null')
    it('setDifficulty(null) is accepted')
    it('setDifficulty(positive finite) is accepted')
    it('throws on 0 / negative / NaN / Infinity')
    it('persists through save/reload')

  describe('canBeEngagedBy')
    it('returns true when difficulty is null regardless of actor capability')
    it('returns true when actor has no Propertied mixin and difficulty is null')
    it('returns false when actor lacks Propertied and difficulty is non-null')
    it('reads CLIMBING_CAPABILITY_PROP (default 1)')
    it('returns true when capability >= difficulty')
    it('returns false when capability < difficulty')
    it('honors capability == difficulty (>= comparison)')
    it('honors a capability set to 0')

  describe('CLIMBING_CAPABILITY_PROP')
    it('is exported and equals Property.of<number>("climbing")')
```

### 6.3 `lib/locomotion/__tests__/Swimmable.test.ts`

Parallel structure to Climbable. Implements the shared `Enablement`
interface; `canBeEngagedBy` reads `SWIMMING_CAPABILITY_PROP`
(`Property.of<number>('swimming')`).

### 6.4 `lib/locomotion/__tests__/Flyable.test.ts`

Parallel structure to Climbable. Implements the shared `Enablement`
interface; `canBeEngagedBy` reads `FLIGHT_CAPABILITY_PROP`
(`Property.of<number>('flight')`).

### 6.4.1 `lib/locomotion/__tests__/Enablement.test.ts`

```
describe('Enablement interface')
  it('Climbable, Swimmable, Flyable all conform structurally')
  it('canEngageAxis on each implementation returns the expected boolean')
  it('canBeEngagedBy on each reads the right per-mode Property')
  it('LocomotionApi.checkEnablement dispatches via getEnablementMixin without naming a mode')
```

### 6.5 `lib/boundary/__tests__/Exit.test.ts` — new describe blocks

```
describe('Exit.allowedModes')
  describe('default behavior')
    it('allowsMode("walk") returns true on a fresh Exit')
    it('allowsMode("climb") returns false on a fresh Exit')
    it('allowsMode("fly") returns false on a fresh Exit')

  describe('whitelist behavior')
    it('allowsMode returns true for whitelist members')
    it('allowsMode returns false for non-whitelist modes')
    it('an empty whitelist falls back to walk-only behavior')

  describe('setAllowedModes validation')
    it('accepts unique non-empty strings')
    it('throws on duplicates')
    it('throws on empty-string entries')

  describe('persistence')
    it('roundtrips through save/reload')
    it('hydrates legacy documents (no field) to empty array')

  describe('canTraverse with mode')
    it('returns ok when mode is in allowedModes')
    it('returns ok=false with gate=exitMode when mode is not in allowedModes')
    it('returns ok=true for mode="walk" when allowedModes is empty')
    it('returns ok=false for mode="climb" when allowedModes is empty')

  describe('canTraverse without mode (legacy callers)')
    it('returns ok when blocked=false and door open or absent')
    it('returns gate=blocked when blocked')
    it('returns gate=door when door is closed')

  describe('TraversalGuard structured fields')
    it('populates gate="blocked" on blocked exit')
    it('populates gate="door" on closed door')
    it('populates gate="exitMode" + mode field on mode rejection')
    it('omits gate when ok=true')
```

### 6.6 `lib/spatial/__tests__/Mobile.test.ts` — new describe blocks

```
describe('Mobile.engagedMode')
  describe('default state')
    it('getEngagedMode returns null on a fresh Mobile')
    it('_engagedModePath is not in persistentFields')

  describe('setEngagedMode / getEngagedMode')
    it('accepts a LocomotionMode singleton and stores its templatePath')
    it('getEngagedMode resolves the stored path back to the singleton')
    it('accepts null and clears')

  describe('isEngagedIn polymorphism')
    it('accepts a LocomotionMode and matches by templatePath')
    it('accepts a short name string (e.g. "walk") and matches by name')
    it('accepts a full templatePath string and matches')
    it('returns false when not engaged')

  describe('unresolved singleton at read time')
    it('returns null when the path is set but the singleton hasnt loaded')

  describe('not persistent')
    it('clone + reload yields getEngagedMode() === null')

  describe('onSlotReleased witness')
    it('clears engagedMode when host composes the mode\'s conveyanceMixin')
    it('does not clear when host does not compose the conveyanceMixin')
    it('does not clear when mode is not passthrough')
    it('does not clear when engagedMode is null')
    it('is invoked by Slotted.vacate synchronously')

describe('Mobile.traverse mode-gate enforcement')
  it('throws when exit.canTraverse returns ok=false (mode-gated)')
  it('successful walk through a default-mode exit')
  it('throws when walking through a climb-only exit')
  it('successful climb through a climb-allowed exit')
  it('does NOT touch engagedMode on its own (caller responsibility)')
```

### 6.7 `lib/slot/__tests__/Slotted.test.ts` — new describe block

```
describe('Slotted.vacate slot-release witness')
  it('invokes candidate.onSlotReleased(host, slotName) after the delete')
  it('does NOT invoke when candidate has no onSlotReleased method')
  it('passes the host as a Stuff reference')
  it('passes the slot name')
```

### 6.8 `lib/slot/__tests__/Drivable.test.ts` — new describe blocks

```
describe('Drivable.controllerSlot default (bug fix)')
  it('a fresh DrivableMixin host has controllerSlot === "driver:1"')
  it('does NOT default to "mount:1" (would collide with Mountable.mountSlot default)')
  it('existing setControllerSlot path unaffected (round-trips arbitrary value)')

describe('Drivable.vehicularMode')
  it('defaults to null')
  it('setVehicularMode(mode) stores templatePath; getVehicularMode resolves singleton')
  it('setVehicularMode(null) clears')
  it('persistentFields includes _vehicularModePath')
  it('roundtrips through save/reload')
```

### 6.9 `mud/api/__tests__/locomotion.test.ts`

```
describe('LocomotionApi')

  describe('modeOf / modeOfOrThrow / allModes')
    it('modeOf accepts a short name ("walk") and resolves the full path')
    it('modeOf accepts a full templatePath ("/lib/locomotion/walk")')
    it('modeOf returns null for an unknown short name')
    it('modeOf returns null for an unknown full path')
    it('modeOfOrThrow throws with the resolved full path in the message')
    it('modeOfOrThrow accepts short name and full path symmetrically')
    it('allModes returns all loaded LocomotionMode singletons')

  describe('resolveHostMode')
    it('returns engagedMode when set')
    it('returns vehicularMode when engagedMode is null and host is Drivable')
    it('falls back to walk when neither is set')
    it('returns walk for a non-Drivable Mountable host')

  describe('bodyPlanAllows')
    it('returns true when requiresBodyPlanMode is empty')
    it('returns true when actor\'s body-plan includes a required mode')
    it('returns false when actor\'s body-plan lacks all required modes')
    it('returns false for non-Organism actors when required is non-empty')
    it('handles any-of semantics across multiple required entries')

  describe('postureAllows')
    it('returns true when requiresPosture is empty')
    it('returns true when actor\'s posture is in requiresPosture')
    it('returns false when actor\'s posture is not in requiresPosture')
    it('treats non-Posed actors as Postures.Stand')

  describe('exitAllowsMode')
    it('delegates to Exit.allowsMode')

  describe('canEngage')
    it('returns true when bodyPlan + posture both allow')
    it('returns false when bodyPlan rejects')
    it('returns false when posture rejects')

  describe('canTraverse')
    it('returns ok for a clean walk path')
    it('returns gate=bodyPlan first when body-plan rejects')
    it('returns gate=posture second when body-plan passes but posture rejects')
    it('returns gate=exitMode third when allowedModes rejects')
    it('returns gate=enablement fourth when no Climbable in scope for climb')
    it('returns gate=capability when difficulty exceeds capability')
    it('returns gate=blocked when exit.blocked')
    it('returns gate=door when door is closed')

  describe('checkEnablement (per-mode)')
    describe('walk')
      it('always returns ok')
    describe('climb')
      it('finds a Climbable in the actor\'s container')
      it('finds a Climbable among the container\'s contents')
      it('returns gate=enablement with reason when no Climbable in scope')
      it('returns gate=capability when the host enablement\'s canBeEngagedBy returns false')
    describe('swim')
      it('finds a Swimmable Location')
      it('returns gate=enablement when no Swimmable in scope')
      it('returns gate=capability on difficulty failure')
    describe('fly')
      it('finds a Flyable Location')
      it('returns gate=enablement when no Flyable in scope')
      it('returns gate=capability on difficulty failure')
    describe('ride')
      it('returns ok when actor occupies a Mountable\'s mount slot')
      it('returns gate=noConveyance when actor occupies no Mountable')
      it('returns gate=noConveyance when actor isn\'t Slottable')
    describe('drive')
      it('returns ok when actor occupies a Drivable\'s controller slot')
      it('returns gate=noConveyance when actor isn\'t in the controller slot')

  describe('findConveyanceHost')
    it('returns the Mountable host for ride')
    it('returns the Drivable host for drive')
    it('throws when called with a non-passthrough mode')
    it('returns null when actor is not in a matching slot')

  describe('emissionAt')
    it('returns null for non-Mobile Stuff')
    it('returns null for a Mobile with engagedMode null')
    it('returns the engaged mode\'s emission for a walking actor')
    it('walks the passthrough chain: rider on walking horse reads walk emission')
    it('walks the passthrough chain: driver of wheeled cart reads wheeled emission')
    it('includes the resolvedHostChain (Stuff array) for introspection')
    it('respects a depth guard (no infinite loop on a cycle)')

  describe('eligibleModes')
    it('returns the full mode set whose bodyPlan + posture gates pass')
    it('excludes modes the actor\'s body-plan lacks')
    it('excludes modes the actor\'s posture rejects')

  describe('engagedMode (untyped-safe API method)')
    it('returns the resolved singleton for Mobile actors')
    it('returns null for non-Mobile Stuff')

  describe('isTransientEngagement')
    it('returns true for walk regardless of destination')
    it('returns false for passthrough modes (ride / drive)')
    it('returns false for climb when destination still composes Climbable')
    it('returns true for climb when destination doesn\'t compose Climbable and has no Climbable contents')
    it('returns false for climb when destination has a Climbable Containable')
    it('returns false for swim when destination is Swimmable')
    it('returns true for swim when destination isn\'t Swimmable')
    it('returns false for fly when destination is Flyable')

  describe('engageAround')
    it('sets engagedMode before invoking the action')
    it('clears engagedMode after a successful transient traversal')
    it('preserves engagedMode after a persistent traversal')
    it('clears engagedMode in the finally clause when the action throws')
    it('returns the action\'s resolved value typed as T')

  describe('traverseWithDefault')
    it('resolves the actor\'s movement.defaultMode setting (default "walk" when unset)')
    it('runs the full engageAround pipeline (engagement is set during, cleared after for transient walk)')
    it('honors a non-walk default-mode setting (e.g., movement.defaultMode = "fly")')
    it('throws on mode-gate failure (mirrors Mobile.traverse contract)')
    it('throws when the resolved mode singleton doesn\'t exist (modeOfOrThrow propagates)')
```

### 6.10 `obj/command/__tests__/LocomotionControllerBase.test.ts`

```
describe('LocomotionControllerBase')
  describe('execute pipeline')
    it('refuses non-Mobile / non-Containable givers')
    it('throws via modeOfOrThrow when the mode singleton isn\'t loaded')
    it('runs canTraverse and short-circuits on rejection')
    it('traverses non-passthrough modes directly')
    it('routes passthrough modes through findConveyanceHost')

  describe('composeRejection (default prose)')
    it('produces verb-templated prose for bodyPlan')
    it('produces verb-templated prose for posture')
    it('produces verb-templated prose for exitMode')
    it('reads guard.reason for enablement fallback')
    it('reads guard.reason for capability fallback')
    it('produces verb-templated prose for noConveyance')
```

### 6.11 `obj/command/__tests__/WalkController.test.ts`

```
describe('WalkController')
  it('happy path: biped walks through a default-mode exit')
  it('rejection: sessile plant rejected at body-plan gate')
  it('rejection: walk through climb-only exit (gate=exitMode)')
  it('verb-templated rejection prose')
  it('engagedMode is transient (walk → null after traverse)')
```

### 6.12 `obj/command/__tests__/ClimbController.test.ts`

```
describe('ClimbController')
  it('happy path: biped climbs a ladder up an attic exit')
  it('rejection: no Climbable in scope → "There\'s nothing to climb up"')
  it('rejection: insufficient capability → "This climb looks too hard for you"')
  it('rejection: body-plan lacks climb')
  it('rejection: exit doesn\'t allow climb')
  it('engagedMode is persistent when destination still has a Climbable')
  it('engagedMode is transient when destination has no Climbable')
  it('verb-templated rejection prose overrides the base for enablement and capability gates')
```

### 6.13 `obj/command/__tests__/SwimController.test.ts`

Parallel: happy path, no-Swimmable rejection, capability rejection,
body-plan, exit-mode, persistent-vs-transient, verb-templated prose.

### 6.14 `obj/command/__tests__/FlyController.test.ts`

Parallel.

### 6.15 `obj/command/__tests__/RideController.test.ts`

```
describe('RideController')
  it('happy path: rider on horse → horse traverses, rider rides along (conveyance ripple)')
  it('rejection: actor not in a Mountable slot (gate=noConveyance)')
  it('host\'s engagedMode is set to walk for the traversal (resolveHostMode fallback)')
  it('host\'s engagedMode is preserved if it was set before ride')
  it('rider\'s engagedMode is "ride" during and after (passthrough persistent)')
  it('rider\'s engagedMode clears via onSlotReleased when dismounting')
```

### 6.16 `obj/command/__tests__/DriveController.test.ts`

```
describe('DriveController')
  it('happy path: driver in cart → cart traverses')
  it('rejection: actor not in the Drivable\'s controller slot')
  it('vehicular mode: cart with vehicularMode=wheeled engages wheeled')
  it('vehicular mode: boat with vehicularMode=sailed engages sailed')
  it('vehicular mode: null vehicularMode falls back to walk')
  it('driver\'s engagedMode is "drive" during and after (passthrough persistent)')
  it('driver\'s engagedMode clears via onSlotReleased when exiting the cart')
```

### 6.17 `obj/command/__tests__/GoController.test.ts` — new describe blocks

```
describe('GoController dispatch-by-default-mode')
  it('dispatches walk when movement.defaultMode is unset (schema default)')
  it('dispatches walk when movement.defaultMode = "walk"')
  it('dispatches fly when movement.defaultMode = "fly"')
  it('dispatches swim when movement.defaultMode = "swim"')
  it('dispatches deliberately dumb: fails honestly on default-mode mismatch with scope')
```

### 6.18 `mud/__tests__/integration/locomotion.test.ts`

```
describe('Locomotion integration — § 16 compositions')

  it('Human walks corridor: biped + walk-only exit → success')
  it('Human climbs ladder to attic: biped + Climbable ladder + climb-allowed exit → success')
  it('Human tries to walk up attic hole: walk through climb-only exit → fails (gate=exitMode)')
  it('Bat flies up attic hole: avian body-plan + Flyable in scope → success')
  it('Horse swims a pond: quadruped + Swimmable Location + swim-allowed exit → success')
  it('Rider on walking horse through corridor: rider rides, horse walks, both arrive')
  it('Driver in horse-drawn wagon: drive east → wagon traverses with wheeled engagement')
  it('Sailor on rowboat: drive west through marine exit → boat traverses with sailed engagement')
  it('Sessile plant ignores all locomotion verbs (body-plan gate)')
  it('Permission-denied climb (no ladder): climb fails at enablement; fly succeeds if body-plan allows')
  it('Mountain face too hard for novice (capability < difficulty → fails with too-hard prose)')
  it('Mountain face — experienced climber succeeds (capability >= difficulty)')
  it('Wall-walking robot vs. mountaineer at same face (Climbable doesn\'t know substrate; reads Property only)')
  it('Spherical mountain face — semantic direction vocabulary (climb the-summit) works end-to-end')
  it('ExitableVessel — climb the-airlock works identically to zone exits')
  it('Aquatic-only species rejected at body-plan gate for walk')
  it('Flying-only species in enclosed room rejected at enablement')
  it('Multi-mode species transitioning mid-journey: swim engagement persistent at water, clears at beach')
  it('Capability exactly equals difficulty (off-by-one verification)')
  it('Parked-conveyance fallback to walk: rider on stationary horse → horse engages walk for traversal')
  it('Driven cart with explicit vehicularMode: cart engages wheeled; trap reads wheeled emission')

describe('Hot-reload')
  it('reloading a mode singleton mid-session: in-flight _engagedModePath survives transparently')
  it('destructing a mode singleton mid-session: getEngagedMode returns null gracefully')
```

---

## 7. Mixins registry diff

`lib/mixin.ts`, append after `Drivable: 'DrivableMixin'` (currently
line 67):

```diff
   Drivable: 'DrivableMixin',
+  Climbable: 'ClimbableMixin',
+  Swimmable: 'SwimmableMixin',
+  Flyable: 'FlyableMixin',
 } as const;
```

The `MixinName` type derives automatically from the `Mixins` object.

---

## 8. Build order with dependencies

The five waves from § 18 of requirements, exploded into ordered
steps. Each step lists the file(s) touched and the test gate before
moving on.

### Wave 1 — substrate (no behavior change yet)

**Step 1.1** — Create `lib/locomotion/LocomotionMode.ts`.
- File: `LocomotionMode.ts` only.
- Test: `LocomotionMode.test.ts` covering shape + every setter
  validation case in § 6.1.
- **Gate**: all 1.1 tests green.

**Step 1.2** — Add Mixins registry entries.
- File: `lib/mixin.ts`.
- Test: existing mixin tests still pass; no new test needed (constants
  are exercised indirectly).
- **Gate**: `pnpm test lib/mixin` green.

**Step 1.3** — Author the nine mode YAML seeds.
- Files: `seeds/lib/locomotion/*.yaml` (9 files).
- Test: the existing seeder test confirms they load without parse
  errors. A new it-block in `LocomotionMode.test.ts` actually loads
  one and checks expected properties.
- **Gate**: seeder run + new it-block green.

**Step 1.4** — Create `lib/locomotion/Climbable.ts`,
`Swimmable.ts`, `Flyable.ts`.
- Files: 3 mixin files.
- Test: `Climbable.test.ts`, `Swimmable.test.ts`, `Flyable.test.ts`.
- **Gate**: all three test suites green.

**Step 1.5** — Add `Exit.allowedModes` + extended `TraversalGuard`
+ extended `canTraverse`.
- File: `lib/boundary/Exit.ts`.
- Test: `Exit.test.ts` new describe blocks.
- **Gate**: Exit tests green; existing callers (NavigationApi tests,
  Mobile.traverse tests that don't pass a mode) still pass.

**Step 1.6** — Add `Mobile.engagedMode` field + accessor triple +
witness method.
- File: `lib/spatial/Mobile.ts` (additions only; `traverse` body
  unchanged in this step — Wave 2 wires the mode-gate).
- Test: `Mobile.test.ts` new describe blocks for engagedMode (NOT
  yet for traverse mode-gate).
- **Gate**: engagedMode tests green.

**Step 1.7** — Add `LocomotionApi` skeleton.
- File: `mud/api/locomotion.ts` — every method in § 4.5 except
  `engageAround` / `isTransientEngagement` (those land in Wave 3).
- Test: `locomotion.test.ts` for `modeOf` / `modeOfOrThrow` /
  `allModes` / `resolveHostMode` / `bodyPlanAllows` / `postureAllows`
  / `exitAllowsMode` / `canEngage` / `checkEnablement` (per-mode) /
  `findConveyanceHost` / `emissionAt` / `eligibleModes` /
  `engagedMode`.
- **Gate**: all 1.7 API tests green.

### Wave 2 — wire Mobile.traverse's mode-gate

**Step 2.1** — Replace the `void mode;` TODO in `Mobile.traverse`
with the mode-gate enforcement (call `exit.canTraverse(this, mode)`
and throw on rejection).
- File: `lib/spatial/Mobile.ts`.
- Test: `Mobile.test.ts` traverse-mode-gate describe block.
- **Gate**: Mobile traverse-gate tests green; existing
  GoController tests still pass (because GoController passes
  'walk' and exits default to walk-only).

### Wave 3 — verb controllers + engagement lifecycle

**Step 3.1** — Add `engageAround` + `isTransientEngagement` to
LocomotionApi.
- File: `mud/api/locomotion.ts` (append).
- Test: extend `locomotion.test.ts` with the engageAround and
  isTransientEngagement describe blocks.
- **Gate**: lifecycle tests green.

**Step 3.2** — Create `LocomotionControllerBase`.
- File: `obj/command/LocomotionControllerBase.ts`.
- Test: `LocomotionControllerBase.test.ts`.
- **Gate**: base-class tests green.

**Step 3.3** — Create `WalkController`, `ClimbController`,
`SwimController`, `FlyController` + corresponding YAML views.
- Files: 4 controllers, 4 YAML files.
- Test: 4 controller test files.
- **Gate**: all 4 controllers' tests green.

**Step 3.4** — Add `Drivable.vehicularMode` field + method pair.
- File: `lib/slot/Drivable.ts`.
- Test: extend `Drivable.test.ts`.
- **Gate**: Drivable tests green.

**Step 3.5** — Add slot-release witness invocation to
`Slotted.vacate`.
- File: `lib/slot/Slotted.ts`.
- Test: extend `Slotted.test.ts`.
- **Gate**: Slotted vacate-witness tests green; the Mobile
  `onSlotReleased` test (already in Step 1.6) now flips from "tests
  the method in isolation" to "tests end-to-end via vacate."
  *Verify*: the `Mobile.test.ts` it-block "is invoked by
  Slotted.vacate synchronously" can be moved up here once both
  pieces are in place.

  **DEPENDENCY**: this step requires steps 1.6 (Mobile.onSlotReleased
  method) and 1.7 (LocomotionApi for the witness to know about
  conveyanceMixin) to have landed. Wave-1 ordering already
  satisfies this.

**Step 3.6** — Create `RideController` + `DriveController` + YAML
views.
- Files: 2 controllers, 2 YAML files.
- Test: 2 controller test files.
- **Gate**: both green.

**Step 3.7** — Refactor `GoController` to extend
`LocomotionControllerBase`.
- File: `obj/command/GoController.ts`.
- The refactor is a ~3-line `modeName()` override (see § 4.9).
  Since `LocomotionControllerBase` already uses `target:
  MqlOneResult` and reads `target.via?.exit` (matching GoController's
  pre-refactor model shape), no adapter is needed. The
  ExitableVessel entry-exit fallback lives in
  `LocomotionControllerBase.execute` (§ 4.6) and is inherited
  cleanly.
- Test: extend `GoController.test.ts` with default-mode dispatch
  it-blocks.
- **Gate**: existing GoController tests still pass; new
  default-mode tests green.

### Wave 4 — content seed updates

**Step 4.1** — Update `seeds/lib/body-plans/biped.yaml`:
`locomotionModes: ['walk', 'climb', 'swim']`.

**Step 4.2** — Update `seeds/lib/body-plans/quadruped.yaml`:
`locomotionModes: ['walk', 'swim']`.

- Test: the body-plan tests (`BodyPlan.test.ts`) read the updated
  YAML and assert the new locomotionModes list.
- **Gate**: BodyPlan tests + every test that depends on a biped or
  quadruped actor still passes (running these as a sanity check;
  existing tests don't assert on the locomotionModes value).

### Wave 5 — integration tests

**Step 5.1** — Create `mud/__tests__/integration/locomotion.test.ts`
covering every § 16 composition (the 21 test cases in § 6.18).
- **Gate**: all 21 it-blocks green.

**Step 5.2** — Update any existing content seeds that benefit from
authoring `allowedModes` (per § 18 Wave 4 step 21). This is a
content-authoring sweep, not substrate work. Skip if no existing
seed obviously calls for it — content authoring lands organically
post-MR.

### Build-order ordering rationale

- **No forward references**: every step depends only on steps
  earlier in the order. Step 3.5 (Slotted.vacate witness) depends
  on 1.6 (Mobile.onSlotReleased) — satisfied. Step 3.6
  (RideController) depends on 3.5 (witness wired up so dismount
  clears) — satisfied. Step 3.7 (GoController refactor) depends on
  3.2 (LocomotionControllerBase) — satisfied.
- **Plan B (phased land)**: if the planning agent decides one MR is
  too big, the natural split point is between Wave 2 and Wave 3:
  ship the substrate + Mobile.traverse mode-gate as MR-1; ship the
  controllers + engagement lifecycle as MR-2. The substrate has no
  consumer between MRs (no verbs land in MR-1; existing `go` still
  uses raw `Mobile.traverse` until MR-2's GoController refactor).
  This plan recommends the single-MR path; the phased split is
  documented for the implementation agent's discretion.

---

## 9. Open-question dispositions

### 9.1 — From requirements doc § 17

| # | Open question | Disposition |
|---|---|---|
| 1 | First-class default-mode UX (a dedicated `mode` verb, character-creation prompt, etc.) | **This MR ships nothing beyond the existing `settings` / `var` infrastructure.** `movement.defaultMode` lives in the generic settings keyspace; players set it with `set movement.defaultMode fly`. No new verb, no character-creation prompt. Carry as roadmap. |
| 2 | Verb-help / `eligibleModes` UI | **`LocomotionApi.eligibleModes(actor)` ships and is tested; no UI wiring in this MR.** The Interactive prompt layer is downstream. Roadmap item. |
| 3 | `swim → dive` alias for downward swim | **No substrate change.** Players who want it set up an `AliasMixin` alias at the character layer (`alias dive 'swim down'`). The alias resolves before verb dispatch. Document as an example in the verb-help docs lift when those land. |
| 4 | Direction-vocabulary normalization (`forward`, etc.) | **Substrate doesn't normalize; players type the exact axis the host declared.** Defer to a future spatial-direction MR when Saxonberg gets actor-facing-direction substrate. v1 keeps direction strings opaque per § 5.6. |

All four are dispositioned without blocking the MR.

### 9.2 — From the codebase survey (user-resolved)

The planning agent surfaced four additional questions during the
codebase survey; the user has resolved all four. Documented here so
the implementation agent doesn't relitigate.

#### Q12.1 — `GoController.target` → `direction` adapter — RETRACTED

**Disposition: no adapter needed.** This question presupposed
that the literal mode controllers (Walk/Climb/Swim/Fly/Ride/Drive)
used a `direction: string` argument shape — which is what an
earlier draft of this plan proposed. That was wrong: the command
framework already runs MQL at parse time, stamping
`target.via.exit` with the resolved Exit (via the `canReach`
validator on the YAML view). All locomotion verbs adopt the same
`target: MqlOneResult` shape `GoController` already uses; the
controller reads `target.via?.exit` for the resolved Exit and
`exit.getDirection()` when it needs the direction string for
prose.

GoController therefore inherits cleanly from
`LocomotionControllerBase` with zero adapter — it only overrides
`modeName()` to read the `movement.defaultMode` setting. See § 4.9
for the trivial body. The "two options" framing of the earlier
disposition is moot.

Knock-on cleanup: Risk 10.2 (canReach validator + target adapter)
similarly retracted — see § 10.2 update.

#### Q12.2 — `onSlotReleased` witness invocation location

**Decision: Inside `Slotted.vacate(slot, candidate)`.**

The witness invocation `candidate.onSlotReleased?.(this, slot)`
lives inside the `Slotted.vacate` mixin method itself, AFTER the
`set.delete(candidate)` line, BEFORE the method returns. Fires
synchronously inside the slot-release transaction.

Rationale: covers every release path, including direct callers
that bypass `SlotApi`. `DismountController.execute` calls
`host.vacate(slotName, giver)` directly (not via SlotApi); putting
the witness in `SlotApi.vacate` would miss these direct callers
and break dismount engagement-cleanup. The mixin-internal location
is the correct seam.

**Typing**: the witness method is declared on the `Slottable`
interface (§ 4.13a) as an optional method —
`onSlotReleased?(host: Stuff & Slotted, slotName: string): void`.
The invocation in `Slotted.vacate` is fully TypeScript-typed, no
`as any` cast. Matches the existing `MovementHookProvider`-style
optional-method pattern (e.g., `Mobile.canTraverse?` /
`Mobile.onTraversed?` already declared on interface, called
directly with optional chaining).

#### Q12.3 — Biped body-plan `locomotionModes`: include `swim`?

**Decision: Yes — biped gets `['walk', 'climb', 'swim']`.**

The capability-vs-skill framing makes this fall out cleanly:

- **Body-plan `locomotionModes` is the CAPABILITY layer.** "Does
  your body permit this action at all?" A biped has arms that
  paddle, legs that kick, lungs that hold breath, a torso that
  floats with effort. Biped bodies CAN swim — even without
  training they can survive in shallow water. A sessile plant
  CANNOT swim — no limbs, no buoyancy, no respiration. A fish
  CAN swim natively.
- **`SWIMMING_CAPABILITY_PROP` vs `Swimmable.difficulty` is the
  SKILL layer.** "Can you do it WELL ENOUGH for this specific
  water?" A naive biped has default `SWIMMING_CAPABILITY_PROP = 1`.
  They can engage swim mode (body-plan gate passes); they succeed
  in a calm shallow pond (`difficulty: 1` or `null`); they fail in
  rough ocean (`difficulty: 4`) — they flail, sink, drown. A
  trained biped with `setProp(SWIMMING_CAPABILITY_PROP, 5)` passes
  more difficulty checks.

So biped's body plan includes `swim` (the capability). Naive
bipeds still drown in deep water because of the difficulty gate,
not the capability gate. Skill / training are RPG-layer concerns
that ride on top via the per-actor Property, not via body plan.

`seeds/lib/body-plans/biped.yaml` ships as
`locomotionModes: [walk, climb, swim]`. Same pattern applies to
quadruped (`[walk, swim]`) — most four-legged creatures can
dog-paddle.

#### Q12.4 — `Mobile.traverse` mode-gate failure behavior

**Decision: Throw on gate failure.**

When `Mobile.traverse(exit, mode)` is called and
`exit.canTraverse(mover, mode)` returns `{ ok: false }`, the
method throws. Matches `ContainmentApi.move`'s programmatic-
violation policy and the existing `assertVeto` pattern already in
`Mobile.traverse` for veto-result handling.

Rationale: this throw is reached only by misbehaving programmatic
callers. The `LocomotionControllerBase.execute` flow short-
circuits via `LocomotionApi.canTraverse` BEFORE calling
`actor.traverse(exit, mode)`, so player-input paths never hit the
throw. Admin tools, scripted NPC AI, or activity-driven movement
that wants to traverse but doesn't want to pre-check mode-gating
either (a) calls `LocomotionApi.engageAround` (which wraps the
canTraverse check) or (b) accepts the throw as the contract for
mode-gate violations.

Silent-return-on-failure was rejected because it swallows bugs:
misbehaving callers would have a "succeeded" traverse where the
actor didn't actually move, with no error surface.

---

## 10. Risk register

Eleven entries. Each: what could go wrong, where it lives, mitigation.

### Risk 10.1 — Bootstrap wave mismatch

**What**: The requirements doc § 4 says "the nine LocomotionMode
templates register in the early-substrate wave of BootstrapManager,
alongside BodyPlan / Material / Species / Clade." The actual
codebase has no such wave — bootstrap.ts is one entry
(`/obj/EventRegistry`); BodyPlan / Material / Species / Clade are
loaded lazily by `StuffApi.findByTemplatePath` from the `domain`
collection (populated by the seeder). LocomotionMode follows the
same path naturally.

**Where**: `mud/bootstrap.ts`, requirements doc § 4.

**Mitigation**: The plan calls this out and does NOT extend the
bootstrap manifest. If profiling shows verb-time singleton-load
latency, lift each of the nine modes to manifest entries with no
`dependsOn` (they have none). The implementation agent should be
aware that the requirements doc's "bootstrap-order requirement"
sentence is aspirational, not actual.

### Risk 10.2 — RETRACTED: no adapter needed

**Original concern**: the literal mode controllers (Walk / Climb /
Swim / Fly / Ride / Drive) would have a `direction: string` arg
shape, requiring a `GoController` adapter to translate its
`target: MqlOneResult` into a direction string.

**Why this was wrong**: the command framework runs MQL at parse
time, stamping `target.via.exit` with the resolved Exit (via the
`canReach` validator on the YAML view). The locomotion plan now
uses the same `target: MqlOneResult` shape across all six per-mode
verbs PLUS `go`. The controller reads `target.via?.exit` directly;
no manual exit lookup or adapter needed.

**Implementation note** (carried forward): when refactoring
`GoController` to extend `LocomotionControllerBase`, the new body
is a ~3-line `modeName()` override (see § 4.9). Run the existing
`GoController.test.ts` suite to ensure none of the existing
green tests regress.

### Risk 10.3 — RESOLVED: `Drivable.controllerSlot` default fixed

**Original concern**: `DrivableMixin` defaulted `controllerSlot` to
`'mount:1'` — the same string `Mountable.mountSlot` uses. A Stuff
composing both Mountable and Drivable (e.g., a horse-drawn carriage
with a rider seat and a driver box) would have rider and driver
slot-names collide.

**Resolution**: this MR fixes the default to `'driver:1'` as part of
the § 4.12 Drivable diff. Tests don't assert the default (every
test calls `setControllerSlot(...)` explicitly), so the change is
purely forward-looking content authoring hygiene. The new default
is semantically clear and consistent with the `<role>:N` slot-
naming convention; the locomotion `#checkConveyance` walk reads the
host's `getControllerSlot()` value, so any host that authored its
own value is unaffected.

The conveyanceMixin string in `ride.yaml` / `drive.yaml`
(`MountableMixin` vs `DrivableMixin`) remains the authoritative
mixin-side discriminator; the slot-name fix is the slot-side
discriminator. Both axes are now distinct.

### Risk 10.4 — TraversalGuard structured-field backcompat

**What**: Existing `Exit.canTraverse` callers (currently
`GoController.traverse` and possibly some teleport / admin tooling)
read `guard.reason` directly. Adding the `gate` / `mode` /
`context` fields is purely additive but the *signature* changing
from `canTraverse(mover)` to `canTraverse(mover, mode?: string)`
is also additive (optional second param).

**Where**: `lib/boundary/Exit.ts`, all existing `canTraverse`
callers.

**Mitigation**: the production `exit.canTraverse` call sites are
enumerated as of the planning audit (run `grep -rn '\.canTraverse('
packages/server/src --include='*.ts'` to refresh):

- `obj/command/GoController.ts:70` — `exit.canTraverse(mover)` (no
  mode). Continues to work post-refactor: when GoController extends
  `LocomotionControllerBase` (§ 3.7), the canTraverse call moves
  inside the base's `canTraverseExit` (with mode passed). The line
  70 call disappears with the refactor.
- `lib/spatial/Mobile.ts:214` — a doc-comment reference, not a
  call.
- `lib/boundary/Exit.ts:38` — the canTraverse method's own
  docstring, not a call.

No third-party consumers. The `mode?: string` parameter is
optional (backwards-compat default `undefined` → no mode-gate
check), so any non-locomotion callers added later who pass only
mover continue working. Verify no test asserts on the exact shape
of `TraversalGuard` (the new optional fields `gate` / `mode` /
`context` shouldn't break structural matching). Run the full test
suite before declaring this risk closed.

### Risk 10.5 — `Mobile.traverse` mode-gate breakage

**What**: The TODO in `Mobile.traverse` is `void mode;` — today the
mode parameter is ignored. Replacing it with an active mode-gate
that throws on rejection could break existing tests that
pass-through "walk" to a mode-gated exit and expect the traverse
to succeed.

Specifically: in current code, an Exit with `allowedModes: []`
allows walk (the new `allowsMode("walk")` returns true). An Exit
with non-empty `allowedModes` doesn't exist anywhere in seeds
today, so no existing test should fail. BUT, any test that
constructs an Exit and asserts an authored allowedModes is hitting
new behavior.

**Where**: `lib/spatial/Mobile.ts:227` (the `void mode;` line),
existing tests in `lib/spatial/__tests__/Mobile.test.ts` and
`lib/boundary/__tests__/Exit.test.ts`.

**Mitigation**: run the full `pnpm test` after Wave 2 lands;
expect zero regressions because (a) no existing exit has
`allowedModes`, (b) `GoController` currently calls
`exit.canTraverse(mover)` without a mode (pre-mode-gate path), and
(c) `Mobile.traverse` is invoked from `GoController.traverse` which
always passes the mover's `movement.defaultMode = 'walk'`. The
combination is "walk through default-walk-allowed exit" — green.

### Risk 10.6 — RESOLVED: witness method typed on the `Slottable` interface

**Original concern**: an earlier draft invoked the witness with a
duck-typed cast `(candidate as any).onSlotReleased?.(this, slot)`
inside `Slotted.vacate`, which lost TypeScript safety and coupled
the slot subsystem to a method name that wasn't declared anywhere
in slot.

**Resolution**: per the "avoid duck typing unless absolutely
necessary" project rule, the witness method is declared on the
`Slottable` interface itself as an optional method
(`onSlotReleased?(host: Stuff & Slotted, slotName: string): void` —
see § 4.13a). `Slotted.vacate` invokes it via
`candidate.onSlotReleased?.(this, slot)` with proper TS typing — no
cast, no `as any`. The optional-method shape matches existing
`MovementHookProvider`-style witness patterns elsewhere in the
codebase (e.g., `Mobile.canTraverse?` / `Mobile.onTraversed?`).

**Implementation note**: `Mobile` implements the witness with a
default body that clears engagedMode for passthrough modes whose
conveyanceMixin matches the vacated host (see § 4.10). Future
witnesses (polymorph revert on dismount, status-clear, etc.)
compose the same `onSlotReleased` slot on their own mixin.

### Risk 10.7 — Hot-reload of mode singletons not yet tested

**What**: § 5.7 of requirements claims "actors with a non-null
`_engagedModePath` survive a reload of the referenced mode
singleton transparently." This is the documented Pattern A
behavior, but no existing test exercises the reload-during-engagement
flow.

**Where**: `LocomotionMode.test.ts`, `Mobile.test.ts`.

**Mitigation**: the integration test file (§ 6.18) has a
`describe('Hot-reload')` block with two it-blocks:

```
it('reloading a mode singleton mid-session: in-flight _engagedModePath survives transparently')
it('destructing a mode singleton mid-session: getEngagedMode returns null gracefully')
```

These exercise the hot-reload contract end-to-end. They rely on
`HotReloadApi`'s existing infrastructure (see
`docs/subsystems/hot-reload.md`). The destruct test is the harder
one — the implementation agent verifies that
`StuffApi.findByTemplatePath` returns null for a destructed
template, and that `getEngagedMode` propagates that null.

### Risk 10.8 — RETRACTED: canReach validator handles this

**Original concern**: literal mode YAMLs would carry bare
`direction: string` args with no MQL validation, leaving exit-
lookup failure prose to `canTraverse` at execute time.

**Why this no longer applies**: all six per-mode verbs adopt the
`target: object` shape with the `canReach` validator (same as
`go.yaml`). MQL resolves the player's typed direction to an exit-
bearing target at parse time; unresolvable directions short-
circuit before the controller's `execute` runs. The locomotion
substrate inherits the same exit-resolution UX `go` has used since
phase 7+.

Player-facing prose for unresolved directions matches the existing
`go` behavior — the planner doesn't need to add new failure-prose
seams.

### Risk 10.9 — `LocomotionApi.allModes()` performance

**What**: `allModes()` iterates `StuffApi.getAllObjects()` filtering
for `LocomotionMode` instances. O(N) over the global registry.
With v1's world size (small), fine. `eligibleModes(actor)` calls
`allModes()` for every invocation, and the prompt UI might call
`eligibleModes` on every render.

**Where**: `mud/api/locomotion.ts`.

**Mitigation**: cache `allModes()` result; invalidate on
`HotReloadApi` mode-template events. Out of scope for v1; flag as
follow-up. The Api method returns `readonly LocomotionMode[]` so
the caller can't mutate, supporting future memoization.

### Risk 10.10 — `BodyPlan.locomotionModes` accessor inconsistency

**What**: `BodyPlan.getLocomotionModes()` returns
`readonly string[]`. The values are short names (`'walk'`),
matching what `LocomotionMode.getRequiresBodyPlanMode()` stores.
Same vocabulary. The `_engagedModePath` field stores the full
templatePath (`'/lib/locomotion/walk'`). The `requiresBodyPlanMode`
array stores short names. The `Exit.allowedModes` stores short
names. Cross-checking is consistent — `bodyPlanAllows` compares
short names; `exitAllowsMode` compares short names; `isEngagedIn`
accepts either form. Documented in code, but easy to confuse.

**Where**: All of the above.

**Mitigation**: the LocomotionMode singleton class doc-comment
explicitly states the two vocabularies (full path vs. short name)
and where each is used. Test coverage in § 6.6 (`isEngagedIn
accepts a short name` and `accepts a full templatePath`) verifies
the polymorphism.

### Risk 10.11 — `Drivable.persistentFields` reorder

**What**: Adding `_vehicularModePath` to `Drivable.persistentFields`
extends the persisted-field list. Existing `Drivable` documents in
Mongo won't have the field; hydration relies on the class default
(`null`). Standard pattern (matches `Tangible._materialPath`
addition); should be fine. But if some test snapshots a Drivable's
persistent state, the snapshot fixture grows.

**Where**: `lib/slot/Drivable.ts`, possibly fixture tests.

**Mitigation**: run the full test suite; update snapshots if any
break. The integration test for `vehicularMode` round-trip already
covers the hydrate-from-empty case.

---

## 11. Verification plan

End-to-end verification before merging:

### 11.1 Automated

- `pnpm test` from repo root — every new and existing test passes
  (target: zero regressions, 140-170 new green its).
- `pnpm lint` — zero warnings introduced.
- `pnpm build` — TypeScript compiles cleanly (`noUncheckedIndexedAccess`,
  strict).
- `pnpm format` — diff is clean against the committed files.

### 11.2 Manual smoke (scripted scenarios)

Run a dev server with the new substrate; verify each of the six
modes end-to-end:

| Scenario | Steps | Expected |
|---|---|---|
| Walk | Biped in corridor; `walk east` | Exit message; arrival in next room; engagedMode null on arrival |
| Climb | Biped in room with Climbable ladder; up exit has `allowedModes: [climb]`; `climb up` | Climbs successfully; engagedMode persistent if attic also has Climbable |
| Swim | Biped in pond Location (Swimmable); `swim south` (exit allowed) | Swims; engagedMode persistent |
| Fly | Avian body-plan in outdoor Location (Flyable); `fly up` (exit allowed) | Flies; engagedMode persistent |
| Ride | Biped mounted on horse (`back:1`); `ride east` | Horse traverses; rider rides along; rider engagedMode = 'ride' |
| Drive | Biped in cart driver slot; cart vehicularMode = 'wheeled'; `drive east` | Cart traverses; cart engagedMode = 'wheeled' |

For each: verify trap-style introspection via the
`LocomotionApi.emissionAt(mover)` returning the expected emission
(walks the passthrough chain for ride/drive).

### 11.3 Backward compat

- `go east` from an existing Avatar in an existing seed Location
  still works — runs through the refactored `GoController` reading
  `movement.defaultMode = 'walk'`, dispatching the walk pipeline.
- Existing Exit documents (with no `allowedModes` field) still
  allow walk traversal — `Exit.allowsMode('walk')` returns true
  when `allowedModes` is empty (legacy default).
- Existing Drivable documents (with no `_vehicularModePath`) still
  function as Drivables — `getVehicularMode()` returns null,
  `resolveHostMode` falls back to walk.
- Existing `Mobile.traverse` callers that pass `'walk'` mode (i.e.,
  `GoController`) continue to traverse default-mode exits — gated
  only when an authored `allowedModes` rejects walk, which no v1
  seed does.

### 11.4 Sign-off checklist

- [ ] Wave 1 substrate: every test in § 6.1-6.9 green.
- [ ] Wave 2 mode-gate: `Mobile.test.ts` traverse-mode-gate green;
      no existing tests regress.
- [ ] Wave 3 controllers: § 6.10-6.17 green; all six smoke
      scenarios pass.
- [ ] Wave 4 body-plans: existing tests (e.g., `BodyPlan.test.ts`)
      still pass with the updated `locomotionModes` arrays.
- [ ] Wave 5 integration: § 6.18 green.
- [ ] Hot-reload: both hot-reload it-blocks green.
- [ ] Slot-release witness wired in `Slotted.vacate`; dismount in
      existing `DismountController` still clears posture; new
      Mobile.onSlotReleased witness clears engagedMode on dismount.
- [ ] `pnpm lint` + `pnpm build` clean.

---

## 12. Open questions to surface back to the user

**None.** Every open question raised during the requirements pass
(§ 17 of `locomotion-requirements.md`) and during the codebase
survey for this plan has been resolved. § 9 carries all
dispositions — § 9.1 for the requirements-doc questions, § 9.2 for
the codebase-survey questions (including the `target` adapter, the
witness invocation location, biped's `swim` inclusion, and
`Mobile.traverse`'s gate-failure behavior).

If the implementation agent discovers new ambiguities at code time,
those should be flagged in MR review rather than back-propagated
into this plan doc.

---

## Appendix A — Self-check

Before declaring the plan complete:

- [x] Every § 4 file in `requirements.md` appears in § 3 of this plan.
      Verified by mapping requirements § 4 entries to plan § 3 rows.
- [x] Every singleton Idea-class field on `LocomotionMode` has a
      getter + setter in § 4.1's code preview.
- [x] Every test acceptance bullet in requirements § 15 has a
      corresponding `it` block in plan § 6 (cross-checked § 15.1–15.7
      against § 6.1–6.18).
- [x] Build order in plan § 8 has no forward references —
      Wave 1 lands before Wave 2 needs it; Wave 3 lands after the
      LocomotionApi from Wave 1 + the Mobile mode-gate from Wave 2;
      Step 3.5 lands after 1.6 (Mobile.onSlotReleased) + 1.7
      (LocomotionApi).
- [x] Every open question in requirements § 17 has a disposition
      in plan § 9.
- [x] Risk register has 11 entries.
- [x] The plan reads top-to-bottom; a fresh agent could execute it.

— End of plan —
