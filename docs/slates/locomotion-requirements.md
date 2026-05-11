# Locomotion requirements (formal)

Distilled from [locomotion-slate.md](./locomotion-slate.md) after the
scoping pass. This is the spec the planning agent will turn into an
implementation plan.

Scope decisions, mixin lists, API ownership, BodyPlan additions, verb
suite, persistence shape, test acceptance, and the explicit
out-of-scope list live below. Open questions from the slate are
either resolved here (with the chosen answer + one-line rationale)
or carved out to a follow-up.

This slate sits **downstream of embodiment**. The slot substrate
(`Slotted` / `Slottable`), the `Postured` mixin, and the
conveyance mixins (`Mountable`, `Drivable`) are dependencies — they
land first (slots branch); locomotion consumes them.

---

## 1. Goals

Ship the **locomotion-mode substrate** plus the verb suite that drives
movement and the per-mode enablement mixins, end-to-end:

- A `LocomotionMode` singleton Idea, templates per mode at
  `/lib/locomotion/<name>`.
- The v1 mode roster: `walk` / `climb` / `swim` / `fly` / `ride` /
  `drive`, with a clean extension path for medium-keyed vehicular
  modes (`wheeled` / `sailed` / `aerial` initial set).
- A new `Exit.allowedModes: string[]` field that gates which
  locomotion modes can traverse a given exit. Empty = walk-only
  (today's default).
- Per-mode enablement mixins: `Climbable` (on Stuff, declares
  climb axes), `Swimmable` (on Stuff & Container — bodies of water),
  `Flyable` (on Stuff & Container — open airspace).
- One verb controller per mode: `walk` / `climb` / `swim` / `fly` /
  `ride` / `drive`. Mode IS the verb.
- A `LocomotionApi` cross-cutting helper (mode resolution, engagement
  check, passthrough-chain walk, eligibility query).
- An `engagedMode` runtime-only field on `Mobile`, set during
  mode-engaged traversal/posture, surfaced for trap / detection /
  pathfinder consumers.
- BodyPlan migration: add `swim`, `climb`, `fly` to the relevant body
  plans' `locomotionModes` lists (currently authored as `[walk]`).

## 2. Non-goals

Explicitly **out of scope** for this MR:

- **Run / sneak / crawl modes.** Pedagogically thin against the v1
  consumer set (mostly different numbers on noise/profile dials).
  Land each with its actual consumer subsystem:
  - `run` → stamina/exhaustion subsystem.
  - `sneak` → detection / stealth subsystem.
  - `crawl` → vent content or constricted-space subsystem.
  Substrate doesn't preclude any of them — `BodyPlan.locomotionModes`
  is open-ended; new template at `/lib/locomotion/<name>` is the
  pattern.

- **Trap subsystem.** This slate names the consumer interface (traps
  read mode properties via `LocomotionApi.emissionAt` and similar).
  Trap mixins, trigger taxonomy, disarm verbs, and the trap MR
  framework belong in a separate trap-slate.

- **Pathfinder.** The cost-multiplier shape is locked here as a
  scalar (`mode.costMultiplier: number`). The algorithm, the
  multi-axis cost-function generalization (if it lands), and the
  pathfinder UI surface are pathfinder-slate territory.

- **Detection / auditory perception.** The mode emission data is the
  source of truth this slate ships; the receiver-side perception
  pipeline (`PerceptionApi.canHear`, hearing thresholds, distance
  attenuation, ambient-noise rules) lands with a separate perception
  extension.

- **Vehicular-emission modifiers.** A steel-shod horse louder than a
  barefoot one; a muffler quieter than a straight pipe. Per-host
  emission amplification is **deferred to v2**. Passthrough chains
  resolve to the host's engaged mode but don't yet carry per-host
  modifiers. If two pieces of v1 content force the issue, lift; not
  expected.

- **Combat-relevant locomotion** (charge, retreat, parry-shift).
  Combat-slate territory.

- **NPC behavior layer that decides which verb to invoke.**
  Substrate only; behavior trees / scripted routines live elsewhere.

- **Encumbrance / fatigue / stamina** affecting mode selection.
  `costMultiplier` is for pathfinder cost; doesn't drive a stamina
  meter.

- **3D direction vocabulary for fly.** Compass + `up` / `down` is
  the v1 direction set for all modes. Spherical-zone full-3D
  diagonals are deferred to per-zone declaration when a zone needs
  them; substrate doesn't preclude.

- **Mid-air collision, fall damage, drowning, suffocation.** Modes
  are about *how you move*; mode failure has player-facing prose
  but no physical-consequence machinery yet. (A `fly` mode actor
  losing flight engagement falls into the next room down — physics
  for later.)

- **Polymorph / shapeshift mode reconciliation.** Body-plan swap is
  out of scope for substrate; locomotion just must not preclude it.

- **Mode `extends` (template inheritance).** Each mode template
  fully restates its properties. Sneak/run/crawl-shaped duplication
  doesn't bite yet (those modes aren't in v1). If a second Idea
  hierarchy hits the same wall, lift then.

## 3. Decision log

Resolutions to the slate's open-question list, scoped to this MR.

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Engaged-mode shape — posture projection (a) or independent state (b)? | **(b) Independent state**: `actor.engagedMode: string \| null` lives on `Mobile`. Posture stays at the `Postured` vocab (`Stand`/`Sit`/`Lie`/`Kneel`/`Mounted`). | Existing `Postured` vocab is frozen at 5 entries; climbing / swimming / flying don't fit those body-configuration semantics. Engaging a locomotion mode is a *movement-state* concept, orthogonal to social/conversational posture. Decouples cleanly. |
| 2 | `requiresBodyPlanMode` cardinality | **`string[]`** (any-of). | Crawl forces it long-term; cheap to ship now. Each entry must appear in the body-plan's `locomotionModes` list for the mode to be eligible. |
| 3 | Run as a mode of its own? | **Deferred.** Not in v1 roster. Land with stamina subsystem. | Pedagogy lens: walk-with-a-bigger-speed-number isn't substantive. |
| 4 | Direction-set composition (mode vs. target) | **Target-side enforcement.** Modes don't carry direction lists; enablement mixins (`Climbable.climbAxes`, etc.) are the sole authority. Single-sided, not intersected. | The slate framed this as `mode axes ∩ target axes`, but `LocomotionMode` has no `acceptedDirections` field. Validation is exclusively on the enablement mixin's `<mode>Axes`. |
| 5 | Template `extends` for shared property defaults | **No.** Each mode template restates properties. Revisit if a second Idea hierarchy hits the same wall. | Avoids inventing a framework feature (template-inheritance + array-override-semantics) just for locomotion. v1 modes are simple enough to restate. |
| 6 | Pathfinder cost-function shape | **Scalar `costMultiplier: number`**. Pathfinder slate redesigns if multi-axis matters. | Today's substrate honesty: one number per mode. Future-extensible. |
| 7 | `Climbable.climbAxes` richness | **Bare direction strings.** No per-axis destination refs. | Climbables are **enablement** — they let you engage climb mode in a scope. Destinations live on Exits. Step-ladder-to-ceiling is `Slotted` (embodiment), not `Climbable`. See §§ 5.4 + 7.1. |
| 8 | Passthrough emission amplification | **Deferred to v2.** No per-host modifiers in v1. | Steel shoes / mufflers / etc. add later via an `EmissionModifier` mixin if content asks. |
| 9 | Direction vocabulary | **Substrate is direction-vocabulary-agnostic.** Cartesian zones use compass + `up` / `down` by convention; Spherical zones (and `ExitableVessel` hosts) use author-defined semantic strings (`'the-summit'`, `'the-fireplace'`, `'the-cockpit-hatch'`). Both flow through the same machinery. Cartesian full-3D diagonals deferred. | Direction strings flow opaquely through the locomotion pipeline; substrate never inspects or validates them against a vocabulary. See § 5.6 substrate invariant. |
| 10 | Verb-vocabulary lock-in | **`walk` / `climb` / `swim` / `fly` / `ride` / `drive`** (6 modes). | Each carves a real pedagogy axis or substrate seam. Trimmed roster (no `run` / `sneak` / `crawl`) per the pedagogy lens applied above. |
| 11 | Trap subsystem ownership | **Separate slate.** | Locomotion ships substrate; trap-slate designs the consumer. |
| 12 | Pathfinder ownership | **Separate slate.** | Same shape — substrate now, algorithm + UI later. |
| 13 | Vehicular mode modeling | **Open-ended set of medium-keyed modes.** v1 ships `wheeled` / `sailed` / `aerial`. Future templates plug in at `/lib/locomotion/<name>` with no substrate cap. | Three baseline media (ground / marine / air); substrate doesn't enforce a closed list. |
| 14 | `Mobile.traverse` signature generalization | **Don't generalize.** Stay `traverse(exit, mode: string): Promise<void>`. Climbable/Swimmable/Flyable are *enablement* gates the controller checks before calling traverse — not alternative target types. | The slate proposed `traverse(target, mode)` allowing target = Exit | Climbable | Swimmable. Under the locked enablement-mixin shape, that generalization isn't needed: every traversal goes through an Exit. |
| 15 | Climbable's host shape | **Composes on `Stuff`** (no Container prereq). A ladder Thing in a room is Climbable; a cliff-zone Location is Climbable. Engagement check walks the actor's container + its Containables. | Symmetric with Swimmable/Flyable; each composes on Stuff; engagement check finds *any* enablement-mixin host in scope (current container OR a Containable in it). |
| 16 | Swimmable / Flyable host shape | **Composes on `Stuff`** (no Container prereq, but typically `Stuff & Container` — Locations / zones). | A water-filled dungeon room IS Swimmable. A small pond Thing could compose Swimmable too — but bodies of water are usually Locations in v1. |
| 17 | Engaged-mode persistence | **Runtime-only.** Not in `persistentFields`. | World re-initializes on hydrate (same model as slot occupancy in embodiment). Cross-reboot worn/wielded/mounted/engaged-mode all reset on clone. Future stash patterns lift collectively. |
| 18 | Mode template references | **Strings (templatePath).** Not `SingleRef<LocomotionMode>`. Mode plumbing reads strings; `LocomotionApi.modeOf(path)` resolves to singleton when properties are needed. | Avoids singleton-ref ceremony at every call site; matches existing `movement.defaultMode` setting shape and current `traverse(exit, mode: string)` parameter. |
| 19 | Posture mutation on mode engagement | **Decoupled.** Engaging climb does NOT set a `'climb'` posture (no such constant exists). Engaging ride DOES set posture `Postures.Mounted` (because the actor occupies a Mountable slot, and the slot's accepted posture is `Mounted`). Conveyance modes drive posture *indirectly via slot occupancy*; non-conveyance modes don't drive posture. Value is the `Postures` constant string (lowercase `'mounted'` per the embodiment vocabulary). | Mode = movement-state field; posture = slot-occupation-state field. Conveyance modes happen to imply slot occupation via the embodiment substrate, which sets posture transitively. |
| 20 | `producesPosture` field on `LocomotionMode` | **Removed.** Slate's proposed field is dropped given decision #19. The slate's "engaging climb sets posture climb" doesn't hold up against the existing `Postured` vocab. | Substrate stays simpler; one less property to author and consume. |
| 21 | Fly enablement — body-plan alone vs. scope-side `Flyable` | **Scope must compose `Flyable`.** Body-plan having `fly` is necessary but not sufficient; the actor's current container (or a Containable in scope) must also compose `Flyable`. A bird in a closed room can't fly through a wall; the room not being Flyable is the substrate's "no" answer. | Authoring burden is mitigated by **the room-classification system + a mixin library** (out of locomotion-doc scope): outdoor-room mixins auto-compose `Flyable`; indoor-room mixins don't. Underground is case-by-case — large open caverns can compose Flyable, tight tunnels can't; the author makes the call per room. See § 7.3 authoring note. |

## 4. File / module layout

A new subsystem folder under `packages/server/src/mud/lib/`:

```
locomotion/
  LocomotionMode.ts       (Idea class — singleton template)
  Climbable.ts            (mixin)
  Swimmable.ts            (mixin)
  Flyable.ts              (mixin)
  __tests__/
```

Plus an Api in `packages/server/src/mud/api/`:

```
locomotion.ts             (LocomotionApi)
```

Plus the singleton templates at `/lib/locomotion/<name>`. Each is a
`Persistable`-track YAML seed loaded via the existing
template-singleton pipeline:

```
seeds/lib/locomotion/walk.yaml
seeds/lib/locomotion/climb.yaml
seeds/lib/locomotion/swim.yaml
seeds/lib/locomotion/fly.yaml
seeds/lib/locomotion/ride.yaml
seeds/lib/locomotion/drive.yaml
seeds/lib/locomotion/wheeled.yaml
seeds/lib/locomotion/sailed.yaml
seeds/lib/locomotion/aerial.yaml
```

Plus the verb pairs (each is a YAML view + controller):

```
mud/cmd/walk.yaml,    mud/obj/command/WalkController.ts
mud/cmd/climb.yaml,   mud/obj/command/ClimbController.ts
mud/cmd/swim.yaml,    mud/obj/command/SwimController.ts
mud/cmd/fly.yaml,     mud/obj/command/FlyController.ts
mud/cmd/ride.yaml,    mud/obj/command/RideController.ts
mud/cmd/drive.yaml,   mud/obj/command/DriveController.ts
```

The existing `mud/cmd/go.yaml` + `GoController.ts` becomes the
**unbiased / mode-dispatch** verb: `go` resolves the actor's
default mode from the `movement.defaultMode` setting (today `'walk'`)
and delegates to the corresponding controller's logic — or, simpler,
is retained as an alias of `walk` while the actor's `defaultMode` is
`'walk'` and treated as a synonym otherwise. See § 6.6.

`Mixins` registry (`lib/mixin.ts`) gains entries:

```ts
Climbable:  'ClimbableMixin',
Swimmable:  'SwimmableMixin',
Flyable:    'FlyableMixin',
```

**Boundary substrate addition**: `Exit.ts` grows an `allowedModes:
string[]` persistent field plus the validator described in § 8.

**Mobile addition**: `Mobile.ts` grows an `engagedMode: string | null`
runtime-only field plus accessor methods (see § 11).

**BodyPlan additions**: seed file edits to `biped.yaml`,
`quadruped.yaml` (and any future body plans) to expand
`locomotionModes` beyond `['walk']` where appropriate.

> **Scope flag for plan review**: the verb roster is six controllers
> in one MR. If the planning agent prefers a phased land (substrate
> + walk/climb first; swim/fly/ride/drive second), flag in plan
> review — the trade is "one cohesive substrate MR" vs "two narrower
> MRs sharing a substrate bridge commit."

**Bootstrap load order**: the nine `LocomotionMode` templates
register in the **early-substrate wave** of `BootstrapManager`,
alongside (or just after) `BodyPlan` / `Material` / `Species` /
`Clade`. They must be loaded before any actor-bearing template
clones (i.e., before any `Mobile` is alive) and before any verb
controller fires, since `LocomotionControllerBase.execute` calls
`LocomotionApi.modeOfOrThrow(this.modePath())` at dispatch time.
Bootstrap manifest entry shape mirrors the existing
`/lib/material/*` / `/lib/body-plans/*` entries.

**Cross-subsystem dependency from embodiment**: the planning MR
consumes from the embodiment slate the following symbols, which
must already be in place: `MountableMixin` (with
`getMountSlot()`), `DrivableMixin` (with `getControllerSlot()` —
plus the new `getVehicularMode()` this MR adds), `SlotApi`
(specifically `findOccupiedHost` and the slot-release witness
hook used in Wave 3 step 19), `Postured` (with `Postures.Mounted`
constant), and `Posed.getPosture()`. If embodiment hasn't shipped
these, the locomotion MR is blocked on the embodiment branch
landing first.

## 5. `LocomotionMode` singleton (`lib/locomotion/LocomotionMode.ts`)

A `Persistable`-track `Idea` subclass; one instance per template at
`/lib/locomotion/<name>`. Same singleton-by-templatePath shape as
`Material`, `Species`, `BodyPlan`.

### 5.1 Class shape

```ts
// Composition matches the existing singleton-Idea pattern
// (Material, BodyPlan, Species, Clade).
export class LocomotionMode extends SingletonMixin(PropertiedMixin(Idea)) {
  protected name: string = '';
  protected speed: number = 1.0;
  protected noiseLevel: NoiseLevel = 'normal';
  protected bodyProfile: BodyProfile = 'upright';
  protected groundContact: GroundContact = 'full';
  protected requiresBodyPlanMode: string[] = [];
  protected requiresPosture: string[] = [];
  protected targetTypes: string[] = ['Exit'];
  protected costMultiplier: number = 1.0;
  protected passthrough: boolean = false;
  protected conveyanceMixin: string | null = null;
  // (no producesPosture — see decision #20)

  // accessors (getter + setter pair per field)
  // public method surface for inter-Stuff contract:
  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }
  public getPassthrough(): boolean { return this.passthrough; }
  public setPassthrough(value: boolean): void { this.passthrough = value; }
  public getConveyanceMixin(): string | null { return this.conveyanceMixin; }
  public setConveyanceMixin(value: string | null): void { this.conveyanceMixin = value; }
  // ... etc. (all fields follow the same getter/setter pair pattern)
}

export type NoiseLevel = 'silent' | 'quiet' | 'normal' | 'loud';
export type BodyProfile = 'prone' | 'crouched' | 'upright' | 'varied';
export type GroundContact = 'none' | 'partial' | 'full';
```

`persistentFields` includes every authored field. `name` mirrors the
last segment of the templatePath by convention.

### 5.2 Field semantics

| Field | Type | Consumer / purpose |
|---|---|---|
| `name` | `string` | Display, debug, error prose. Mirrors templatePath terminal. |
| `speed` | `number` (multiplier; walk=1.0) | Pathfinder, scheduling. |
| `noiseLevel` | `'silent' \| 'quiet' \| 'normal' \| 'loud'` | Auditory detection (consumer slate). |
| `bodyProfile` | `'prone' \| 'crouched' \| 'upright' \| 'varied'` | Trap subsystem (height-keyed triggers); visual detection. |
| `groundContact` | `'none' \| 'partial' \| 'full'` | Trap subsystem (pressure / pit). |
| `requiresBodyPlanMode` | `string[]` (any-of) | Eligibility: actor's species body-plan must include one of these. Empty = no body-plan gate. |
| `requiresPosture` | `string[]` (any-of) | Eligibility: actor's `Postured.posture` (or `null` if not postured) must match. Empty = no posture gate. |
| `targetTypes` | `string[]` | Type names this mode resolves against. Today: `['Exit']` for most. Read by the verb's target-resolution step. |
| `costMultiplier` | `number` | Pathfinder cost weight. |
| `passthrough` | `boolean` | When `true`, emission / motion-property reads delegate to the host's engaged mode (rider → horse → walk). See § 10.4. |
| `conveyanceMixin` | `string \| null` | Required when `passthrough === true`; ignored otherwise. Names the `Mixins` registry constant for the host-side capability whose slot the actor must occupy. `ride` declares `'MountableMixin'`; the Api locates the actor's hosting Mountable and asks it for `getMountSlot()` (which may be `'mount:1'`, `'back:1'`, or any per-host name — see `lib/slot/Mountable.ts`). `drive` declares `'DrivableMixin'`; the Api consults the host's `Drivable.getControllerSlot()`. Future passthrough modes declare their host-mixin here; no prefix-matching string is involved. |

### 5.3 v1 property values

| Mode template | speed | noise | profile | ground | bodyPlanMode | targets | costMult | passthrough |
|---|---|---|---|---|---|---|---|---|
| `walk` | 1.0 | normal | upright | full | `['walk']` | `['Exit']` | 1.0 | false |
| `climb` | 0.5 | normal | varied | partial | `['climb']` | `['Exit']` | 2.0 | false |
| `swim` | 0.5 | quiet | varied | none | `['swim']` | `['Exit']` | 2.0 | false |
| `fly` | 1.5 | quiet | varied | none | `['fly']` | `['Exit']` | 0.7 | false |
| `ride` | (delegated) | (delegated) | (delegated) | (delegated) | `[]` (mount-slot occupation is the gate) | `['Exit']` | 1.0 | true; conveyanceMixin `'MountableMixin'` |
| `drive` | (delegated) | (delegated) | (delegated) | (delegated) | `[]` (driver-slot occupation is the gate) | `['Exit']` | 1.0 | true; conveyanceMixin `'DrivableMixin'` |
| `wheeled` | 2.0 | loud | upright | full | `[]` (vehicular modes engage from the conveyance host, not the body plan) | `['Exit']` | 0.5 | false |
| `sailed` | 1.5 | quiet | upright | partial | `[]` | `['Exit']` | 0.6 | false |
| `aerial` | 3.0 | loud | varied | none | `[]` | `['Exit']` | 0.4 | false |

Passthrough modes (`ride` / `drive`) leave their numeric fields at
their defaults; they're not read directly — `LocomotionApi.emissionAt`
walks the passthrough chain to the host's mode.

Vehicular modes (`wheeled` / `sailed` / `aerial`) are engaged by
the conveyance host on traversal. They have no body-plan
requirement; the host's `Drivable` declares which vehicular mode it
engages.

**Scope addition — `Drivable.vehicularMode: string | null`**.
The existing `Drivable` mixin (from the embodiment substrate) does
NOT have a `vehicularMode` field; this locomotion MR adds it as a
persistent field on `Drivable`. Default `null` (a Drivable that
isn't a vehicular conveyance — e.g., a steerable boat with no
distinct mode engagement). When non-null, names the templatePath of
the `LocomotionMode` the conveyance engages on traversal (e.g.,
`'/lib/locomotion/wheeled'` for a cart, `'/lib/locomotion/sailed'`
for a sailboat). Read by `LocomotionApi.findConveyanceHost` /
`Mobile.traverse` to set `engagedMode` on the conveyance during
movement. The plan-review file list (§ 4) calls this out as a
deliberate cross-subsystem edit.

### 5.4 The personal-vs-vehicular axis

The v1 mode roster sits on an orthogonal 2×3 design grid: the
**medium** axis (ground / water / air) crosses the **mover-identity**
axis (personal / vehicular). Six modes fill the grid; two
passthrough modes glue the two halves together.

|         | Personal (actor engages) | Vehicular (conveyance engages) |
|---------|--------------------------|--------------------------------|
| Ground  | `walk`                   | `wheeled`                      |
| Water   | `swim`                   | `sailed`                       |
| Air     | `fly`                    | `aerial`                       |

**Personal modes** are bodyplan-gated. The mover is itself an
**agent** (PC / NPC / sentient creature); the mover's species body
plan declares which personal modes it supports via
`BodyPlan.locomotionModes`. A bird's body plan includes `fly`; a
human's typically does not; a peace lily's includes nothing. The
mover engages the mode in response to its own verb invocation
(`fly east`).

**Vehicular modes** are conveyance-property-gated. The mover is
**not an agent** — it's a vehicle, vessel, or device that doesn't
make its own choices. The conveyance composes `Drivable` and
declares which vehicular mode it engages (e.g., a jet's `Drivable`
declares `aerial`). The mode is engaged via the passthrough plumbing
(`ride` / `drive`): an agent occupies the controller slot, invokes
`drive east`, and the conveyance engages its declared vehicular
mode on the conveyance side. The agent's `drive` mode is
passthrough; trap / detection / pathfinder consumers read the
conveyance's engaged mode, not the agent's.

**Worked contrast — flying bird vs. flying jet**:

| | Bird (agent) | Jet (vehicle) |
|---|---|---|
| Mover identity | Bird IS the Mobile | Jet IS the Mobile |
| Engaged mode on the mover | `fly` | `aerial` |
| Eligibility gate | Body-plan includes `fly` | Vehicle composes Drivable with `aerial` declaration + pilot in controller slot |
| Verb dispatch | `fly east` from the bird (PC or NPC behavior) | `drive east` from the pilot → passthrough → jet engages `aerial` |
| Trap subsystem reads | bird's `fly` emission | jet's `aerial` emission |
| Bodyplan involved? | yes (bird has one) | no (jets have no bodyplan) |

**Edge cases the matrix handles cleanly**:

- **Pegasus carrying a rider.** Pegasus IS a personal-mode actor
  (bodyplan includes `fly`). When it traverses, it engages `fly`,
  not `aerial`. The rider in its mount slot engages `ride`
  (passthrough). Trap subsystem reads pegasus's `fly` emission.
- **Hot-air balloon carrying a pilot.** Balloon is a Drivable
  conveyance declaring `aerial`. Pilot in basket engages `drive`
  (passthrough). Trap subsystem reads balloon's `aerial` emission.
- **Magic carpet.** Drivable; engages `aerial` like the balloon.
  (If conceived as a semi-intelligent actor, model as Mobile +
  Mountable — same shape as pegasus.)
- **Walking horse vs. driven cart.** Horse engages `walk` (personal,
  bodyplan-gated). Cart engages `wheeled` (vehicular). Same pattern.

The matrix is the substrate's answer to "where does the agent /
non-agent distinction live?" It's not a flag on the mover; it's
the choice between which side of the matrix the engaged mode falls
on.

### 5.5 Validation invariants on setters

Per the project's "per-field invariants on setters" rule:

- `setSpeed(value)` — throws if `value <= 0` or `!isFinite(value)`.
- `setNoiseLevel(value)` — throws if not in the closed union (compile-
  time gated by TS, but runtime-validated for hydrate paths).
- `setBodyProfile(value)` / `setGroundContact(value)` — same.
- `setRequiresBodyPlanMode(value)` — array of unique non-empty
  strings. Substrate doesn't validate that values appear in a real
  BodyPlan — content/authoring tools do.
- `setRequiresPosture(value)` — array of unique non-empty strings.
  Substrate doesn't validate against the `Postures` constants module
  — content/authoring tools do.
- `setTargetTypes(value)` — array of unique non-empty strings.
  Substrate doesn't validate against `Mixins` registry — leaves
  future shape-of-target evolution open.
- `setCostMultiplier(value)` — throws if `value <= 0` or
  `!isFinite(value)`.
- `setPassthrough(value)` — boolean; no further validation.

### 5.6 Substrate invariant — direction-vocabulary-agnostic

**The locomotion substrate never inspects or validates direction
strings.** Every direction reference in the design — `Exit.direction`,
`Climbable.climbAxes`, `Swimmable.swimAxes`, `Flyable.flyAxes`, the
verb's `direction` argument, the enablement-mixin `can<Mode>Axis`
predicate — is a `string` flowing opaquely through the pipeline.
Substrate doesn't enforce compass-vs-semantic vocabulary; doesn't
normalize aliases; doesn't recognize a closed enum.

The two existing zone conventions both ride this substrate cleanly:

- **Cartesian zones** — directions are compass (`'north'` /
  `'south'` / `'east'` / `'west'`) plus `'up'` / `'down'`.
  `getExitInDirection(container, 'east')` looks up the compass entry.
- **Spherical zones** — directions are semantic strings
  (`'the-summit'`, `'the-fireplace'`, `'toward-the-altar'`). Same
  Api call, same lookup, different vocabulary.
- **`ExitableVessel`** — same shape; vessel exits use vessel-internal
  semantic strings (`'cockpit-hatch'`, `'cargo-bay-door'`).

Content authors picking direction vocabulary author their enablement
mixins to match: a Cartesian mountain-face Location has
`climbAxes: ['up', 'down']`; a Spherical mountain-face zone has
`climbAxes: ['the-summit', 'the-base-camp', 'the-ledge']`.

The reserved axis `'*'` (§ 7.2 / 7.3) means "any direction this
host's container considers an exit" — vocabulary-agnostic by
construction.

This invariant is what makes the substrate work uniformly across
both zone types and `ExitableVessel`s. Any future direction-keyed
feature (alias normalization, direction-set introspection) lives
outside the substrate — in MQL, in the command parser, or in
authoring tools.

### 5.7 Why singleton

Same reasons as `Material`, `Species`, `BodyPlan`:

- One canonical instance per templatePath. New modes ship as new
  templates with no framework code change.
- Hot-reload friendly: editing `seeds/lib/locomotion/climb.yaml`
  reloads the climb singleton; controllers reading via
  `LocomotionApi.modeOf('/lib/locomotion/climb')` pick up the new
  property values on next access.
- Persistence is per-template-path; the runtime mode reference is
  always a string, never a `SingleRef`.

**Hot-reload semantics for in-flight `_engagedModePath`**: actors
with a non-null `_engagedModePath` survive a reload of the
referenced mode singleton transparently. Because the field stores
a path, not a live ref, the next call to `actor.getEngagedMode()`
re-resolves via `StuffApi.findByTemplatePath` and returns the new
(reloaded) singleton with its updated properties. Same Pattern A
property as `_speciesPath` / `_materialPath`. No special cleanup
needed; no event fires; consumers reading mode emission
(`LocomotionApi.emissionAt`) see the new values on their next read.

If a mode template is **destructed** mid-session (no current
production flow does this, but it's possible in dev / admin
contexts), actors still holding the path get `null` from
`getEngagedMode()`. The substrate treats this the same as "engaged
in a mode that isn't loaded" — no crash, just degraded read. The
admin tool destructing a mode template is responsible for
correctness, not the substrate.

## 6. Per-mode verb controllers

Each mode is a verb. Each verb is a controller in `obj/command/`.
Each pairs with a YAML view in `mud/cmd/`. The six controllers share
a common base.

**Substrate principle — verbs are literal.** `walk west` walks west;
`swim west` swims west. If the current scope doesn't support the
mode, the verb fails honestly with a per-validator message; the
substrate never silently substitutes a working mode, never
auto-adjusts `engagedMode` to "rescue" the player, and never makes
`go` clever (see § 6.6). Players adapt their verb choice to the
scope they're in — the substrate stays predictable, and `engagedMode`
remains an honest record of *what mode you used to get here* (read
by trap / detection / emission consumers), not a guess at what mode
you'd use next. The existing transient-vs-persistent rule for
engagedMode (§ 11) handles the natural cases: walking arrives with
`engagedMode = null` (transient cleared); swimming into a still-
Swimmable destination arrives with `engagedMode = swim` (persistent);
swimming into a non-Swimmable destination arrives with `engagedMode
= null` (the engagement is judged transient by
`isTransientEngagement` per § 10.8).

Authoring tools, prompt UI, and per-player aliases can layer
ergonomics on top — that work is out of substrate scope.

**Substrate principle — controllers own prose.** The substrate Api
returns *structured* failure information (`TraversalGuard` with a
`gate` tag plus `mode` / `context` — see § 8.2.1) and a default
fallback `reason` string. Player-facing wording is the controller's
job: it branches on `gate` and composes prose appropriate to the
verb. The Api's gate ordering (cheap-first: bodyPlan → posture →
exitMode → enablement → capability) determines which failure the
substrate surfaces when multiple gates would reject; controllers
honor or override that prose per their own UX choices. Tests,
admin tools, and non-controller callers can use the fallback
`reason` as-is.

### 6.1 `LocomotionControllerBase`

Abstract base class capturing the shared shape. Each concrete
controller overrides `modePath()`. Lives at
`packages/server/src/mud/obj/command/LocomotionControllerBase.ts`.

Follows the existing controller pattern (`extends CommandController<TModel>`,
returns a `CommandResult` of `{success, summary}`) — see `GoController.ts`
and `docs/subsystems/command-spec.md` for the canonical shape. The
sketch below is structural; field-level and verb-level validators
land most of the rejection paths declaratively in the YAML.

```ts
import { CommandController } from '../../lib/command/CommandController';
import { CommandContext, CommandResult } from '../../lib/command';
import { LocomotionApi } from '../../api/locomotion';
import { resolveSetting } from '../../lib/shell/Environment';

interface LocomotionModel {
  direction: string;  // populated by YAML field validator + (for go) default-mode substitution
}

export abstract class LocomotionControllerBase
  extends CommandController<LocomotionModel> {

  /** TemplatePath for this verb's mode. */
  protected abstract modePath(): string;

  async execute(
    model: LocomotionModel,
    context: CommandContext,
  ): Promise<CommandResult> {
    const actor = context.commandGiver;
    const mode = LocomotionApi.modeOfOrThrow(this.modePath());

    // 1. Run the gates (Api returns first failure with structured
    //    `gate` tag). Controllers OWN the prose — branch on gate
    //    and compose verb-appropriate wording. See § 6 "controllers
    //    own prose" principle and § 8.2.1 TraversalGuard.
    const guard = LocomotionApi.canTraverse(actor, model.direction, mode);
    if (!guard.ok) {
      return { success: false, summary: this.composeRejection(guard, mode, model) };
    }

    // 2. Resolve the exit by direction. Containers expose
    //    `getExits()` (ReadonlyMap<string, Exit>); narrow via
    //    MixinApi.isExitable. (canTraverse already verified exit
    //    exists and allows the mode.)
    const container = actor.getContainer();
    const exits = MixinApi.isExitable(container) ? container.getExits() : null;
    const exit = exits!.get(model.direction)!;

    // 3. Routing — non-passthrough vs passthrough.
    if (mode.getPassthrough()) {
      const host = LocomotionApi.findConveyanceHost(actor, mode)!;
      // Resolve the host's engaged mode. For an idle conveyance with
      // no engagedMode, fall back to its Drivable.vehicularMode (for
      // vehicles) or 'walk' (for Mountable creatures). See § 10.4.
      const hostMode = LocomotionApi.resolveHostMode(host);
      await LocomotionApi.engageAround(host, hostMode, exit, () =>
        host.traverse(exit, hostMode.getTemplatePath()),
      );
    } else {
      // Engagement lifecycle (set engagedMode, clear if transient) is
      // owned by LocomotionApi.engageAround — keeps Mobile.traverse
      // spatial-pure. See § 9 and § 10.8.
      await LocomotionApi.engageAround(actor, mode, exit, () =>
        actor.traverse(exit, mode.getTemplatePath()),
      );
    }

    return { success: true };
  }

  /**
   * Controllers own prose. Default base-class composition branches
   * on guard.gate for substrate-appropriate wording; concrete
   * controllers can override per-verb (e.g. ClimbController may
   * say "this climb is too hard for you" for `gate: 'capability'`
   * while SwimController says "the current's too strong").
   */
  protected composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    switch (guard.gate) {
      case 'bodyPlan':    return `Your body can't ${mode.getName()}.`;
      case 'posture':     return `You can't ${mode.getName()} from this posture.`;
      case 'exitMode':    return `You can't ${mode.getName()} that way.`;
      case 'enablement':  return guard.reason ?? `There's no way to ${mode.getName()} here.`;
      case 'capability':  return guard.reason ?? `That's too hard for you.`;
      case 'noConveyance': return `You're not ${mode.getName()}ing anything.`;
      case 'blocked':     return 'The way is blocked.';
      case 'door':        return 'The way is closed.';
      default:            return guard.reason ?? 'You can\'t go that way.';
    }
  }
}
```

The sketch is structural; many of these rejection paths land
declaratively as YAML-level validators per the command-spec
author guide rather than imperative `return { success: false }`
inside `execute`. The Api calls (`bodyPlanAllows`, `postureAllows`,
`exitAllowsMode`, `checkEnablement`) are the natural validator
hooks. Property reads use methods (`getSpecies()` etc.) per the
inter-Stuff-contract rule.

### 6.2 Concrete controllers

Each is thin:

```ts
export class WalkController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/walk'; }
}
export class ClimbController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/climb'; }
}
export class SwimController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/swim'; }
}
export class FlyController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/fly'; }
}
export class RideController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/ride'; }
}
export class DriveController extends LocomotionControllerBase {
  protected modePath() { return '/lib/locomotion/drive'; }
}
```

### 6.3 YAML view shape

Follows the existing command-YAML schema
(`mud/cmd/command.schema.json`). Verbs are a primary-first array;
arguments are positional via the `args:` block. See `mud/cmd/look.yaml`
and `docs/subsystems/command-spec.md` for the canonical shape.

```yaml
# mud/cmd/climb.yaml
verbs: [climb]
controller: ClimbController
description: Climb a Climbable surface in a given direction.
args:
  - name: direction
    type: string
    required: true
    description: The direction to climb (compass + up/down).
```

`walk` may grow a `default: $defaultMode` to allow `walk` (no arg)
to fall through to the `movement.defaultMode` setting, but for v1
the bare verb expects a direction.

### 6.4 Eligibility validators

**Four gates**, all delegating to `LocomotionApi` (method-chain
access only — per the "Inter-Stuff Contract: Methods Only" rule
in `CLAUDE.md`, no field access across Stuff boundaries):

- **Body-plan**: `LocomotionApi.bodyPlanAllows(actor, mode)` —
  shape (pseudocode using method chains; substrate handles
  null-safety for unloaded singletons):
  ```ts
  const required = mode.getRequiresBodyPlanMode();
  if (required.length === 0) return true;
  const bodyPlanModes = actor.getSpecies()?.getBodyPlan()?.getLocomotionModes() ?? [];
  return required.some(m => bodyPlanModes.includes(m));
  ```
- **Posture**: `LocomotionApi.postureAllows(actor, mode)` —
  ```ts
  const required = mode.getRequiresPosture();
  if (required.length === 0) return true;
  const posture = MixinApi.isPosed(actor) ? actor.getPosture() : null;
  return required.includes(posture ?? Postures.Stand);
  ```
- **Exit-allowed-modes gate**: `LocomotionApi.exitAllowsMode(exit, mode)`
  — delegates to `Exit.allowsMode(mode.getName())` (see § 8.2).
- **Enablement**: `LocomotionApi.checkEnablement(actor, mode, direction)`
  — per-mode walks described in § 10.3. For modes with a difficulty
  field (Climbable / Swimmable / Flyable), the enablement check
  ALSO runs the capability-vs-difficulty gate via the host mixin's
  `canBeXxxBy(actor)` method — see § 7.1 "four-layer stack" note.

These ship as either field-level validators (if a clean fit) or
verb-level validators (if multi-field). The command-framework
validator surface is the existing one from
[docs/subsystems/command-spec.md](../subsystems/command-spec.md).

Note the gate ordering: exit-mode-gate fires before enablement, so
a player on a beach typing `walk east` into an ocean exit with
`allowedModes: ['swim']` gets "you can't walk that way" rather than
"there's no water to swim in." The first rejection in the
pipeline wins (per "verbs are literal, no auto-adjust" — § 6
intro).

### 6.5 Direction acceptance

Modes don't constrain direction at the mode level (no
`acceptedDirections` field); per-target enablement constrains by
`<mode>Axes` on the enablement mixin (see § 7).

The direction vocabulary itself is **set by the zone**, not by the
substrate or by the verb. Cartesian zones use compass + `up` /
`down`; Spherical zones and `ExitableVessel` hosts use author-
defined semantic strings. The verb passes whatever the player typed
through to the exit-lookup Api and to the enablement check — both
treat the direction as an opaque string. See § 5.6 for the full
substrate invariant.

### 6.6 `go` — dispatch by default mode

The existing `go` verb is the **dispatch-by-default-mode** entry
point. It is **not** an alias of `walk` — it's a deliberate
indirection so a player (or species default) can configure their
"how I get around" mode once and have a single ergonomic verb honor
it.

Mechanism:

- `go <direction>` resolves the actor's `movement.defaultMode`
  setting (existing `EnvironmentMixin` keyspace; defaults to
  `'walk'` if unset — preserves today's behavior for every actor).
- The resolved mode-name names a `LocomotionMode` template;
  `GoController` then runs the same six-step pipeline as any
  concrete mode controller (body-plan → posture → exit
  `allowedModes` → enablement → routing → traverse).

Implementation: `GoController` extends `LocomotionControllerBase`
and overrides `modePath()` to call the free function
`resolveSetting<string>(actor, 'movement.defaultMode') ?? 'walk'`
(imported from `lib/shell/Environment` — the existing surface
`GoController` already uses today) and constructs the templatePath
`'/lib/locomotion/' + modeName`. The existing `go.yaml` doesn't
need a behavioral change beyond carrying the new base class.

**Relationship to `walk` / `climb` / `swim` / etc.**: each per-mode
verb is *literal* — `walk west` is always walk-mode, regardless of
default. The per-mode verbs are for explicit override (a flying
character can still `walk west` when they want to land); `go` is
the ergonomic default-honoring form.

**`go` is deliberately dumb.** It dispatches whatever
`movement.defaultMode` says, regardless of the target exit's
`allowedModes` or the actor's current scope. If `defaultMode =
'walk'` and the actor is in the ocean, `go west` tries walk, fails
honestly at the exit-mode-gate or enablement check; the player
either retypes with a literal verb (`swim west`) or changes their
default. The substrate does NOT peek at the resolved exit and pick
a compatible mode — that would corrupt the simple invariant ("`go`
uses my chosen default") and produce unpredictable per-direction
behavior in mixed-medium Locations (a beach with one land exit and
one water exit). Player-facing UX for changing the default
preference (a `mode` verb, a character-creation prompt, persisted
character state) is one layer up from this substrate; see § 17 OQ
on first-class default-mode UX.

**Settings examples**:

- `movement.defaultMode = 'walk'` (default): `go west` walks west.
- `movement.defaultMode = 'fly'` (aerial-character preference):
  `go west` flies west (subject to all four eligibility layers).
- `movement.defaultMode = 'swim'` (the actor is a fish, set via
  species hook): `go north` swims north.

The setting can be per-actor (set by the player) or species-default
(a `Species` clone hook initializes it). No substrate change beyond
honoring the existing setting in `GoController.modePath()`.

## 7. Per-mode enablement mixins (`lib/locomotion/`)

Three mixins; each declares per-mode axes that can be engaged in
the scope of a host. Composed on `Stuff` (no Container prereq).
The engagement check (§ 10) walks the actor's container and its
Containables to find any enablement-mixin host with matching axes.

### 7.1 `Climbable` (`lib/locomotion/Climbable.ts`)

Host capability: "I let an actor in scope engage `climb` mode."

**Composition constraint**: composes on `Stuff`. Typical hosts:
ladders, ropes, vines, cliff faces, rough walls. Locations
themselves can compose Climbable (a cliff-zone Location is climbable
everywhere within it).

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `climbAxes` | `string[]` | Directions in which `climb` mode can be engaged via this host. Vocabulary follows the host's zone type (§ 5.6): a Cartesian-zone ladder has `['up', 'down']`; a Cartesian-zone rock face might have `['up', 'down', 'horizontal']`; a Spherical-zone mountain face has semantic axes like `['the-summit', 'the-base-camp', 'the-ledge']`; a vessel's exterior might have `['the-bridge', 'the-engine-room']`. The reserved axis `'*'` (vocabulary-agnostic) means "any direction." |
| `difficulty` | `number \| null` (default `null`) | How hard this climb is. `null` = no difficulty check (anyone with climb in body-plan succeeds — the right shape for ladders, vines, easy terrain). Non-null = capability check required (see § 10.3). **Difficulty is an RPG-mechanical tuning knob, not a physics measurement** — it's the substrate's gameplay-challenge dial, not a teaching surface for real-world climbing-grade systems (those are physics-derived and don't map cleanly to an actor's `climbing` Property). Substrate doesn't enforce a scale; content picks a consistent one (e.g., arbitrary 1-10). Comparison is `actor capability ≥ host difficulty`. |

**Well-known Property constant** (exported from `Climbable.ts`):

```ts
/**
 * The Property an actor sets to expose its current climbing
 * capability. Climbable.canBeClimbedBy reads this Property; the
 * default (when unset) is 1.
 */
export const CLIMBING_CAPABILITY_PROP = Property.of<number>('climbing');
```

**Method surface**:

```ts
interface Climbable {
  getClimbAxes(): readonly string[];
  setClimbAxes(value: string[]): void;
  /** Does this host enable climbing in the given direction? */
  canClimbAxis(direction: string): boolean;
  /** How hard is this climb? Null = no difficulty check. */
  getDifficulty(): number | null;
  setDifficulty(value: number | null): void;
  /**
   * Does this actor have enough capability to climb here?
   * Always true when difficulty is null. Otherwise reads the
   * actor's CLIMBING_CAPABILITY_PROP (default 1 if unset) and
   * compares to difficulty. The mixin owns its own admission test;
   * locomotion-general code (checkEnablement) calls this without
   * knowing the Property name.
   */
  canBeClimbedBy(actor: Stuff): boolean;
}
```

**Why the Property contract**: actors set
`CLIMBING_CAPABILITY_PROP` at clone time (or via runtime updates
from skill / equipment / status subsystems when those exist). A
mountaineer (biped) defaults to `1`; a constructa-clade wall-walker
sets `12` in its clone hook; a future skilled mountaineer with rope
+ harness has the Property updated to the aggregate by the
contributing subsystems. Climbable knows only the Property name —
it doesn't know whether the actor is biological, mechanical, magical,
or anything else. When skill / equipment / status substrate forces
multi-source aggregation that's hard to keep in a single Property
honestly, the migration path is to replace the Property read with a
method call on a future `Climber` mixin — Climbable's
`canBeClimbedBy` is the only line that changes.

**Validation on setters**:

- `setClimbAxes(value)` — array of unique non-empty strings. No
  closed vocabulary; authoring can use compass / up / down / domain-
  specific labels (`'horizontal'`, `'inverted'`).
- `setDifficulty(value)` — `null` or a finite positive number.
  Throws on `0` / negative / `NaN` / `Infinity`. The scale is
  author-chosen; substrate doesn't validate against a closed enum.

**Why no destination ref**: traversal is always via an `Exit`.
Climbables are *enablement* — they unlock climb mode in their scope.
Where you land is the exit's destination, not the climbable's.
Step-ladder-to-ceiling (no exit, change-of-vertical-position-
within-room) is **not Climbable**; it's `Slotted` (embodiment
substrate — a `top:1` slot the actor occupies via `climb <step-
ladder>` without a direction). See § 19 for the disambiguation.

**Difficulty vs. enablement — the four-layer stack**: the climb
verb's eligibility check now has four layers, not three. Body-plan
("can your species climb?") + posture ("can you climb from this
posture?") + scope enablement ("is there a Climbable here?") + new
capability-vs-difficulty ("are you good/equipped enough for *this*
climb?"). The four-layer stack is the substrate's answer to "the
mountain face is a different beast than a ladder" — a ladder has
`difficulty: null` (or `1`); a vertical rock face has
`difficulty: 7`. Same Climbable mixin; different authoring data.

### 7.2 `Swimmable` (`lib/locomotion/Swimmable.ts`)

Host capability: "I let an actor in scope engage `swim` mode."

**Composition constraint**: composes on `Stuff`. Typical hosts:
water-filled rooms (Location composing Swimmable), pools/ponds
modeled as Locations. A *thing in a room* being Swimmable is
unusual in v1 content but the substrate allows it.

**Well-known Property constant** (exported from `Swimmable.ts`):

```ts
/**
 * The Property an actor sets to expose its current swimming
 * capability. Swimmable.canBeSwimmedBy reads this Property;
 * the default (when unset) is 1.
 */
export const SWIMMING_CAPABILITY_PROP = Property.of<number>('swimming');
```

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `swimAxes` | `string[]` | Directions in which `swim` mode can be engaged from this host. Typically `['*']` (any direction) for body-of-water Locations; specific subsets for partial-immersion content. |
| `difficulty` | `number \| null` (default `null`) | How hard this swim is. `null` = no difficulty check. Non-null = capability check required. Substrate doesn't enforce a scale — it's an RPG-mechanical tuning knob (see § 7.1 "difficulty is game-mechanical, not physics"). Content drivers: deep / cold water, strong currents, rough surf. |

The reserved axis `'*'` means "any direction this host's container
considers an exit" — vocabulary-agnostic. In a Cartesian zone, `'*'`
covers compass + up/down; in a Spherical zone, it covers whatever
semantic exits the zone declares. Substrate treats `'*'` specially in
`canSwimAxis` (returns true regardless of input direction). See § 5.6
for the substrate invariant on direction vocabulary.

**Method surface**:

```ts
interface Swimmable {
  getSwimAxes(): readonly string[];
  setSwimAxes(value: string[]): void;
  canSwimAxis(direction: string): boolean;
  getDifficulty(): number | null;
  setDifficulty(value: number | null): void;
  /** Does this actor have enough capability to swim here? */
  canBeSwimmedBy(actor: Stuff): boolean;
}
```

**Validation on setters**: same shape as Climbable —
`setDifficulty(value)` accepts null or a finite positive number;
0 / negative / NaN / Infinity throw.

**`canBeSwimmedBy`** mirrors `Climbable.canBeClimbedBy`: returns
`true` when difficulty is null, otherwise compares actor's
`SWIMMING_CAPABILITY_PROP` (default 1) against difficulty. Same
migration path: when skill / equipment / status substrate forces
multi-source aggregation, the line inside `canBeSwimmedBy` swaps to
a `Swimmer` mixin method.

### 7.3 `Flyable` (`lib/locomotion/Flyable.ts`)

Host capability: "I let an actor in scope engage `fly` mode."

**Composition constraint**: composes on `Stuff`. Typical hosts:
open-air Locations, Spherical zones modeling free 3D space, rooftop
Locations.

**Well-known Property constant** (exported from `Flyable.ts`):

```ts
/**
 * The Property an actor sets to expose its current flight
 * capability. Flyable.canBeFlownBy reads this Property;
 * the default (when unset) is 1.
 */
export const FLIGHT_CAPABILITY_PROP = Property.of<number>('flight');
```

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `flyAxes` | `string[]` | Directions in which `fly` mode can be engaged from this host. `['*']` for open sky (vocabulary-agnostic — § 5.6); subsets for partial-flight content (a Cartesian cave with a single vertical shaft = `['up', 'down']`; a Spherical aviary zone with semantic exits = `['the-perch', 'the-window']`). |
| `difficulty` | `number \| null` (default `null`) | How hard flying here is. `null` = no difficulty check. Non-null = capability check required. Content drivers: high winds, low ceiling, thin air at altitude, hostile thermals. Substrate doesn't enforce a scale (RPG-mechanical — see § 7.1). |

**Method surface**:

```ts
interface Flyable {
  getFlyAxes(): readonly string[];
  setFlyAxes(value: string[]): void;
  canFlyAxis(direction: string): boolean;
  getDifficulty(): number | null;
  setDifficulty(value: number | null): void;
  /** Does this actor have enough capability to fly here? */
  canBeFlownBy(actor: Stuff): boolean;
}
```

**Validation on setters**: same shape as Climbable —
`setDifficulty(value)` accepts null or a finite positive number;
0 / negative / NaN / Infinity throw.

**`canBeFlownBy`** mirrors `Climbable.canBeClimbedBy`: returns
`true` when difficulty is null, otherwise compares actor's
`FLIGHT_CAPABILITY_PROP` (default 1) against difficulty. Same
migration path: when skill / equipment / status substrate forces
multi-source aggregation, the line inside `canBeFlownBy` swaps to
a `Flyer` mixin method.

**Authoring guidance** (per decision #21): scope-side `Flyable` is
**required** for fly engagement — body-plan having `fly` is necessary
but not sufficient. The authoring burden of "every airspace Location
must compose Flyable" is mitigated by the **room-classification
system + mixin library** (out of locomotion-doc scope):

- **Outdoor-room mixin** auto-composes `Flyable` with `flyAxes:
  ['*']`. A bird in an outdoor location can fly freely without per-
  Location authoring.
- **Indoor-room mixin** doesn't compose `Flyable`. A bird in a
  parlor can't fly through walls; flight silently fails at the
  enablement check, which is the substrate's "no" answer.
- **Underground** is case-by-case. A large open cavern can author
  Flyable explicitly; a tight tunnel doesn't. The author makes the
  call per room — there's no "underground" classification that
  blanket-applies.

The same room-classification family will house ambient-light,
weather, ground-type, and other environment-keyed concerns; Flyable
is one row in that table.

### 7.4 Shape symmetry — why three mixins, not one

Three sibling mixins with identical structure (one `<mode>Axes`
field, one `can<Mode>Axis` predicate) might tempt a unified
`Engageable` mixin with a `Map<mode, axes>` field. Rejected because:

- Each mode's *consumer set* is different. Climbable is checked by
  `ClimbController` and the climb enablement walk; future climbing-
  skill verbs read it; traps don't. Swimmable is checked by
  `SwimController` plus future drowning / underwater perception.
  Co-locating obscures the per-mode evolution path.
- The three mixins want distinct authoring vocabularies long-term
  (climbing has `'horizontal'` axes; swimming has direction +
  current-strength; flying has direction + ceiling-height). The v1
  shape happens to overlap; the long-term shape doesn't.
- A future per-mode mixin (`Crawlable`, `Slitherable`) lands by
  copying the pattern, not by extending a map's key set.

Three mixins; one shape today; honest substrate for tomorrow.

### 7.5 What about `Crawlable` / others?

Deferred with `crawl` mode. The substrate generalization is clean
(any future mode `X` ships with an `Xable` enablement mixin if it
needs scope-keyed engagement). Substrate doesn't gate new mode
mixins.

## 8. `Exit.allowedModes` addition (`lib/boundary/Exit.ts`)

The existing `Exit` class grows one persistent field and a small
behavior change in `canTraverse`.

### 8.1 New field

| Field | Type | Default | Notes |
|---|---|---|---|
| `allowedModes` | `string[]` | `[]` | Locomotion-mode names allowed to traverse this exit. Empty = walk-only (today's default; preserves all existing exits). Non-empty = strict whitelist (only listed modes traverse). |

Added to `persistentFields`. Setter validates uniqueness of entries
and non-empty strings; substrate doesn't validate against the
`LocomotionMode` template-singleton registry (content/authoring
tools do, and the registry may load templates after the exit).

### 8.2 New method

```ts
public allowsMode(modeName: string): boolean {
  if (this.allowedModes.length === 0) return modeName === 'walk';
  return this.allowedModes.includes(modeName);
}
```

`canTraverse(mover, mode?: string)` is extended:

```ts
public canTraverse(mover: Stuff & Containable, mode?: string): TraversalGuard {
  if (this.blocked) {
    return { ok: false, gate: 'blocked', reason: 'The way is blocked.' };
  }
  if (this.door && !this.door.getIsOpen()) {
    return { ok: false, gate: 'door', reason: 'The way is closed.' };
  }
  if (mode != null && !this.allowsMode(mode)) {
    return { ok: false, gate: 'exitMode', mode,
             reason: `You can't ${mode} that way.` };
  }
  return { ok: true };
}
```

The `mode` parameter is optional for backward compatibility with
non-locomotion callers; verb controllers always pass it.

### 8.2.1 Structured `TraversalGuard`

The existing `TraversalGuard` shape (from `lib/boundary/Exit.ts`)
grows structured failure tags so consumers (locomotion controllers,
admin tools, tests) can branch on the failure reason without
parsing prose. The `reason` string stays as a substrate-default
fallback prose — controllers compose their own player-facing
prose by reading `gate` and `mode` / `context`.

```ts
export interface TraversalGuard {
  ok: boolean;
  /** Default substrate prose; controllers override per the
   *  "controllers own prose" principle (§ 6 intro). */
  reason?: string;
  /** Structured failure tag for controller branching. */
  gate?: TraversalGate;
  /** The locomotion-mode that was attempted, when relevant. */
  mode?: string;
  /** Optional details (e.g., the missing enablement-host mixin,
   *  the actor's current posture, the required capability). */
  context?: Record<string, unknown>;
}

export type TraversalGate =
  | 'blocked'          // Exit.blocked === true
  | 'door'             // Door is closed
  | 'exitMode'         // Exit.allowedModes doesn't include the mode
  | 'bodyPlan'         // actor's body-plan lacks the mode
  | 'posture'          // actor's posture not in requiresPosture
  | 'enablement'       // no enablement mixin in scope (no Climbable, etc.)
  | 'capability'       // capability check failed (canBeClimbedBy → false)
  | 'noConveyance';    // ride/drive: actor isn't in a mount/driver slot
```

Backward compat: callers that ignore `gate` and read `reason` see
the same prose-strings they would have before. The new field is
purely additive.

### 8.3 Authoring examples

```yaml
# Attic hole: ladder OR flight.
allowedModes: [climb, fly]

# Underwater passage: swim only.
allowedModes: [swim]

# Crawl-only vent shaft (when crawl mode lands):
allowedModes: [crawl]

# Standard corridor: empty (walk-only default).
allowedModes: []
```

### 8.4 Door interaction

`Door.canPassThrough(from, to, mode: string)` already takes mode and
returns `getIsOpen()` unconditionally in v1. The locomotion MR
doesn't change Door behavior — but documents the seam: future
mode-aware doors (a squeeze-only crack, a climb-only chimney) read
mode in `canPassThrough`.

`Exit.canTraverse`'s door check stays at "is open?"; the
mode-gating lives on the Exit's `allowedModes`, not on the Door.
(A door is a removable seal; the mode requirement is a property of
the passage itself.)

## 9. `Mobile.traverse` — no signature change

Per decision #14, the current signature stays:

```ts
traverse(exit: Exit, mode: string): Promise<void>;
```

The `mode` param is already plumbed in `Mobile.ts` (TODO-noted as
not yet wired into narration / validation); locomotion fully wires
it:

- **`traverse` calls `exit.canTraverse(mover, mode)` BEFORE the
  containment move.** Fails the traversal if the mode is not
  allowed.
- **Motion-narration hooks** (`announceDeparture` /
  `announceArrival` on Mobile) — these exist today. The doc's
  references to a `MotionEvent` payload are **aspirational** —
  there is no `MotionEvent` type in v1. Mode-narration (walks-in
  vs. climbs-down vs. flies-up) is deferred to the messaging
  subsystem; substrate just needs to pass the mode through to
  these hooks (which can be done by extending their signatures or
  reading from the mover's `engagedMode` at announce time). The
  planning agent should choose between: (a) extend
  `announceArrival(to, exit, mode?: string)` signature, or
  (b) have the announce-implementations read
  `mover.getEngagedMode()` at firing time. The substrate doesn't
  ship a new event class in v1.
- **Narration**: the slate's "walks in / runs in / climbs down"
  is deferred to the messaging subsystem (out of scope here). The
  mode is available to the scene composer when it lands; substrate
  carries the data.

**What `Mobile.traverse` does NOT do**: it doesn't manage
`engagedMode`. That field is locomotion-layer state; the locomotion
controller pipeline (§ 6.1) owns its lifecycle. Mobile is the
spatial primitive — it knows how to move an actor through an exit
and the mode-gate check, but doesn't carry locomotion-mode
semantics like transient-vs-persistent. Keeping engagement out of
Mobile preserves the layering: locomotion is built ON spatial, not
the other way around.

**Programmatic callers of `Mobile.traverse` outside the locomotion-
controller path** (admin teleport-as-traverse, future activity-
driven movement, scripted NPC AI) get no engagement bookkeeping
automatically. If they want it, they call `LocomotionApi.engageAround`
(§ 10.8) — a thin wrapper that does the set / await / clear-on-
transient dance around any traverse-shaped operation. Raw
`Mobile.traverse` callers that don't want engagement (e.g.,
non-locomotion movement) skip the wrapper entirely.

No call-site change for `GoController` beyond reading
`movement.defaultMode` (which it already does).

## 10. `LocomotionApi` (`mud/api/locomotion.ts`)

Static utility class; ends with
`SecurityApi.decorateApiClass(LocomotionApi)`. Holds all the
cross-cutting helpers.

### 10.1 Mode resolution

```ts
LocomotionApi.modeOf(modePath: string): LocomotionMode | null;
LocomotionApi.modeOfOrThrow(modePath: string): LocomotionMode;
LocomotionApi.allModes(): readonly LocomotionMode[];
LocomotionApi.resolveHostMode(host: Stuff & Mobile): LocomotionMode;
```

`modeOf` returns the singleton resolved via
`StuffApi.findByTemplatePath` (the existing singleton mechanism).
Returns `null` for unloaded / unknown paths. `modeOfOrThrow` is the
strict variant — throws `Error('LocomotionMode not loaded: <path>')`
when the singleton isn't available; used by call sites that have
already validated the path at command-spec time (e.g., the controller
base reading its own `modePath()`).

`allModes` returns every currently-loaded LocomotionMode singleton.
Useful for help text / `eligibleModes` introspection / future
`mode list` verb. v1 substrate exposes; consumer UI is roadmap.

`resolveHostMode` is the passthrough-routing helper used by
`LocomotionControllerBase` when invoking a passthrough mode (ride /
drive). Algorithm:

1. If `host.getEngagedMode()` is non-null, return it.
2. Else, if `host` composes `Drivable` and `host.getVehicularMode()`
   is non-null, return `modeOfOrThrow(host.getVehicularMode())`.
3. Else, fall back to `modeOfOrThrow('/lib/locomotion/walk')`
   (Mountable creatures default to walk when idle).

### 10.2 Eligibility predicates

```ts
LocomotionApi.bodyPlanAllows(actor: Stuff, mode: LocomotionMode): boolean;
LocomotionApi.postureAllows(actor: Stuff, mode: LocomotionMode): boolean;
LocomotionApi.exitAllowsMode(exit: Exit, mode: LocomotionMode): boolean;

LocomotionApi.canEngage(actor: Stuff, mode: LocomotionMode): boolean;
// (= bodyPlanAllows && postureAllows)

LocomotionApi.canTraverse(
  actor: Stuff,
  exit: Exit,
  mode: LocomotionMode,
  direction: string,
): TraversalGuard;
// runs every gate (canEngage + exitAllowsMode + checkEnablement)
// and returns a unified result.
```

### 10.3 Enablement walk

The verb-controller §6.1 step 5:

```ts
LocomotionApi.checkEnablement(
  actor: Stuff,
  mode: LocomotionMode,
  direction: string,
): TraversalGuard;
```

Algorithm:

- For `walk`: always `{ ok: true }`. No enablement gate.
- For `climb`: walk `actor.getContainer()` + its Containables. Find
  a host composing `Climbable` with the right axis. If none, return
  `{ ok: false, reason: "There's nothing to climb ${direction}." }`.
  Then call `climbable.canBeClimbedBy(actor)` — the mixin owns its
  own admission test (capability vs. difficulty, reading the actor's
  `CLIMBING_CAPABILITY_PROP`). If false, return
  `{ ok: false, reason: "This climb looks too hard for you." }`.
  Otherwise `{ ok: true }`. `LocomotionApi` never reads the
  actor's capability Property directly — the Property name is a
  Climbable-owned constant.
- For `swim`: walk `actor.getContainer()` + its Containables. Find
  a host composing `Swimmable` with the right axis. If none, return
  `{ ok: false, reason: "There's no water to swim in." }`. Then
  call `swimmable.canBeSwimmedBy(actor)`. If false, return
  `{ ok: false, reason: "This water's too rough for you." }`.
  Otherwise `{ ok: true }`.
- For `fly`: walk `actor.getContainer()` + its Containables. Find
  a host composing `Flyable` with the right axis. If none, return
  `{ ok: false, reason: "There's no room to fly here." }`. Then
  call `flyable.canBeFlownBy(actor)`. If false, return
  `{ ok: false, reason: "The wind's too strong for you to fly." }`.
  Otherwise `{ ok: true }`. (Per-mixin per-message tuning lives in
  content; substrate provides default prose.)
- For `ride`: actor must occupy a slot whose name starts with
  `'mount:'` on a Mountable host. Return
  `{ ok: false, reason: "You're not mounted." }` if not.
- For `drive`: actor must occupy the slot named by the host's
  `Drivable.getControllerSlot()`. Return `{ ok: false, reason:
  "You're not driving anything." }` if not.

### 10.4 Passthrough chain walk

**Substrate invariant**: passthrough modes always correspond to
**slot occupation on a moving host**. The actor is in a slot of the
conveyance (mount slot for ride, controller slot for drive); the
conveyance engages its own non-passthrough mode; the actor's
emission delegates to the conveyance's emission. This isn't a v1
happenstance — it's the shape of every passthrough mode the
substrate ever ships (see § 19 for future examples).

The invariant makes `findConveyanceHost` generic: look up the slot
the actor occupies, return its host. No per-mode special-casing for
ride vs drive; future passthrough modes plug in without an Api
change beyond declaring which slot-name pattern they consult.

```ts
LocomotionApi.findConveyanceHost(actor: Stuff, mode: LocomotionMode): Stuff | null;
// Generic: walks the actor's slot occupancy via SlotApi, returns
// the host whose slot matches the mode's `conveyanceSlotPrefix`.
// For non-passthrough modes: throws (programmatic misuse).

LocomotionApi.emissionAt(mover: Stuff): EmissionData | null;
// Walks the actor's engaged mode, following passthrough chains to the
// host's engaged mode. Returns the resolved non-passthrough mode's
// emission properties (noiseLevel, bodyProfile, groundContact).
// Returns null when the actor isn't engaged in a mode.

interface EmissionData {
  modeName: string;
  noiseLevel: NoiseLevel;
  bodyProfile: BodyProfile;
  groundContact: GroundContact;
  resolvedHostChain: Stuff[];  // for debugging / introspection
}
```

The `conveyanceSlotPrefix` is a per-passthrough-mode property
naming the slot pattern that engagement requires. v1 values:

- `ride` → `'mount:'` (any slot whose name starts with `mount:`).
- `drive` → consult the host's `Drivable.getControllerSlot()` (single
  slot name per Drivable host).

For future passthrough modes (passenger, carried, towed —
see § 19), each declares its own slot-name pattern; the Api walks
the actor's slot occupancy looking for a match.

The trap subsystem (separate slate) consumes `emissionAt` when
deciding whether a passthrough-mode mover triggers a height- or
ground-keyed trigger. A rider on a walking horse's emission =
horse's `walk` emission, not rider's `ride` emission.

### 10.5 Eligibility queries

```ts
LocomotionApi.eligibleModes(actor: Stuff): readonly LocomotionMode[];
// Returns the set of modes the actor could engage right now.
// Used by help text, UI hints, future affordance rendering.
```

### 10.6 Engaged-mode read

```ts
LocomotionApi.engagedMode(actor: Stuff): LocomotionMode | null;
// Returns the LocomotionMode singleton currently engaged on the
// actor. Null when the actor is not Mobile, not engaged in any
// mode, or has an _engagedModePath whose singleton doesn't resolve.
//
// For Mobile-typed callers, prefer the direct getter
// `actor.getEngagedMode()` (returns LocomotionMode | null with the
// same semantics). This Api method is the safe wrapper for
// untyped-Stuff callers and for consumers that don't want to
// MixinApi.isMobile-narrow first.
```

### 10.7 Capability — owned by the enablement mixin

There is no `LocomotionApi.climbingCapability(actor)` method. Climb
capability is intentionally **not** a locomotion-general concept —
it's a climb-specific gate that lives on `Climbable.canBeClimbedBy`
(see § 7.1). Each enablement mixin owns its own admission test;
`LocomotionApi.checkEnablement` calls those tests without ever
reading the actor's capability Property directly.

**Why this shape**: keeping the Property name (`'climbing'`) and the
default (`1`) inside `Climbable` means locomotion-general code
stays vocabulary-free. Swimmable and Flyable follow the same shape
in v1 — each owns its own `canBeSwimmedBy` / `canBeFlownBy` method
and Property constant (`SWIMMING_CAPABILITY_PROP`,
`FLIGHT_CAPABILITY_PROP`). `LocomotionApi` doesn't accrete a per-
mode capability-reading method per mixin.

**Migration to method contract when needed**: if future skill /
equipment / status substrate forces multi-source aggregation that
can't honestly be coordinated through a single Property write, the
fix is one new mixin (`Climber`) and one line change in
`Climbable.canBeClimbedBy` — from `actor.getProp(climbingProp)` to
`(actor as Climber).getClimbingCapability()`. No callers change.

### 10.8 Engagement lifecycle — `engageAround` + `isTransientEngagement`

This section holds the **framework-internal** helpers that manage
`engagedMode` lifecycle around a traverse. Mainline content authors
don't call these — they invoke literal mode verbs; the controller
pipeline calls these on their behalf. Programmatic callers of
`Mobile.traverse` (admin teleport, scripted NPC AI, future
activity-driven movement) call `engageAround` if they want
engagement bookkeeping.

```ts
LocomotionApi.engageAround<T>(
  actor: Stuff & Mobile,
  mode: LocomotionMode,
  exit: Exit,
  action: () => Promise<T>,
): Promise<T>;
// Wraps a traverse-shaped operation with engagement lifecycle:
//   actor.setEngagedMode(mode)
//   try { return await action(); }
//   finally { if (isTransientEngagement(mode, exit)) actor.setEngagedMode(null); }
// LocomotionControllerBase calls this around its actor.traverse(exit, mode).
// Programmatic callers do the same when they want engagement tracked.
//
// Mobile.traverse itself does NOT call engageAround — that would
// couple lib/spatial to lib/locomotion. Engagement is a locomotion-
// layer concern; this helper is where the layering lands.

LocomotionApi.isTransientEngagement(mode: LocomotionMode, exit: Exit): boolean;
// True when the mode should clear after a successful traversal.
// False when the engagement persists (climb mid-shaft, swim in
// water, ride/drive). The base rule:
// - mode.passthrough === true → persistent (ride/drive last until
//   dismount/exit-vehicle)
// - mode = walk → transient (we walk through corridors)
// - mode = climb/swim/fly: persistent if the destination exit's
//   container still composes the relevant enablement mixin OR has
//   the relevant Containable; transient otherwise.
//
// Framework-internal: only engageAround and the controller pipeline
// read it. Content authors don't call this; they observe its
// consequence (engagedMode set or null after a traverse).
```

The persistent-vs-transient rule is the substrate's answer to the
slate's lifecycle examples (halfway up a ladder = climb persists;
walking from room to room = walk transient; sitting in a parked
car = drive engaged once driving starts, not while parked).

## 11. `Mobile.engagedMode` field

`Mobile.ts` grows one runtime-only field and its method surface.

### 11.0 At a glance

**What it is.** A per-actor runtime field holding the templatePath
of the `LocomotionMode` the actor is currently committed to (or
`null`). Read as "what mode am I in *right now*" — not "what mode
will I use next" (that's the player's verb choice).

**Who writes it (v1)**:

| Writer | When | What |
|---|---|---|
| `LocomotionApi.engageAround` (called by `LocomotionControllerBase`) | Around `traverse` | `actor.setEngagedMode(mode)` at start; `actor.setEngagedMode(null)` at end if `isTransientEngagement` |
| `Mobile.onSlotReleased` witness | When a rider/driver vacates a mount or controller slot | `setEngagedMode(null)` (passthrough modes only) — fires inside the slot-release transaction; see § 11.1 |
| Future activity / unengage paths | When those land | Same setter (most via `engageAround`; some directly) |
| Programmatic callers of `Mobile.traverse` outside locomotion verbs | If they want engagement | Wrap their traverse in `engageAround`; otherwise skip |
| `Mobile.traverse` itself | Never | Engagement is locomotion-layer, not spatial-substrate |
| Mainline content authors | Never directly | — |

In v1, the **only writer is `LocomotionApi.engageAround`**, called
from the controller pipeline. Content authors cause writes by
invoking the literal verbs.

**Who reads it**:

| Reader | Where | Purpose |
|---|---|---|
| `LocomotionApi.emissionAt` | § 10.4 | Resolve emission via passthrough chain (for trap / detection) |
| `LocomotionApi.eligibleModes` | § 10.5 | "What can I do here?" UI |
| `MotionEvent` payload | § 9 | Scene composer narration ("walks in" / "climbs down") |
| `LocomotionApi.engagedMode(actor)` | § 10.6 | Resolve templatePath → singleton when properties are needed |
| Future trap / detection / pathfinder subsystems | Their own slates | Read mode emission + cost |
| Tests | § 15.4 | Verify post-traverse state |

**Mainline-dev surface.** The actor-side method triple
(`getEngagedMode` / `setEngagedMode` / `isEngagedIn`) is public on
Mobile; authors *can* call them for special behavior (e.g., an NPC
AI deciding which mode to engage based on observed state), but
typical content doesn't. The literal mode verbs are the normal
write path; reading is via:

- `actor.getEngagedMode()` → `LocomotionMode | null` (Mobile-typed
  callers; returns the resolved singleton).
- `LocomotionApi.engagedMode(actor)` → `LocomotionMode | null`
  (untyped-Stuff-safe wrapper).

**Not persisted.** Runtime-only (decision #17); resets to `null` on
clone/hydrate. See § 11.2.

### 11.1 Field and method surface

**Runtime-only field** (private, with `_` prefix and `Path` suffix
per the project's singleton-ref convention — see
[docs/ref-shapes.md](../ref-shapes.md)):

| Field | Type | Notes |
|---|---|---|
| `_engagedModePath` | `string \| null` | TemplatePath (e.g. `'/lib/locomotion/walk'`) of the currently-engaged `LocomotionMode`, or `null`. Private; consumers go through `getEngagedMode()`. Not in `persistentFields`. Resets to `null` on clone/hydrate. **Stores the full templatePath**, not the short mode name — matches `_materialPath` / `_speciesPath` and the ref-shapes Pattern A convention (path is the singleton's canonical identifier; short names are for set-membership in `Exit.allowedModes` / `BodyPlan.locomotionModes`, separate vocabulary). |

**Method surface** (inter-Stuff contract; follows the established
codebase pattern for singleton refs — c.f. `Organism._speciesPath`
/ `getSpecies()`, `Tangible._materialPath` / `getMaterial()`):

```ts
interface Mobile {
  // ... existing

  /** Convenience getter — resolves to the singleton (null if not loaded). */
  getEngagedMode(): LocomotionMode | null;

  /** Setter — accepts the singleton (or null); stores its path internally. */
  setEngagedMode(mode: LocomotionMode | null): void;

  /** Predicate — accepts either the singleton or its name string for ergonomics. */
  isEngagedIn(mode: LocomotionMode | string): boolean;

  /**
   * Witness — invoked by the slot machinery when this actor
   * vacates a slot on `host` (dismount, exit-vehicle, generic slot
   * release). Default Mobile implementation: if engagedMode is a
   * passthrough mode whose `conveyanceMixin` matches a mixin `host`
   * composes, clear engagedMode. See § 18 Wave 3 step 19 + § 10.4.
   */
  onSlotReleased?(host: Stuff, slotName: string): void;
}
```

**`onSlotReleased` default body**:

```ts
public onSlotReleased(host: Stuff, slotName: string): void {
  const mode = this.getEngagedMode();
  if (!mode || !mode.getPassthrough()) return;
  const conveyanceMixin = mode.getConveyanceMixin();
  if (conveyanceMixin && MixinApi.hasMixin(host, conveyanceMixin)) {
    this.setEngagedMode(null);
  }
}
```

The slot API (embodiment substrate) calls
`actor.onSlotReleased?.(host, slotName)` synchronously inside the
slot-release transaction. The check is host-mixin-keyed
(`MixinApi.hasMixin(host, 'MountableMixin')`) so it doesn't depend
on slot-name shape; a dismount from a horse's `back:1` clears `ride`
because the horse composes Mountable, not because the slot name
starts with `'mount:'`.

Subclasses or future witnesses can override `onSlotReleased` to add
behavior (a polymorphed actor reverting on dismount, etc.); per
the witness pattern, calling `super.onSlotReleased(host, slotName)`
preserves the base clear.

**No raw getter / setter for `_engagedModePath`** — locomotion has
no consumer that needs to key off the path without resolving.
Following the project rule of thumb (matches `Species._bodyPlanPath`
which DOES expose `getBodyPlanPath()` only because slot claims key
off the path): expose a raw-path getter only when a real consumer
needs it.

**Validation on setter**:

- `setEngagedMode(mode)` — `mode === null` always allowed. Non-null
  values must be a `LocomotionMode` instance; method extracts and
  stores `mode.getTemplatePath()` on `_engagedModePath`. Substrate
  doesn't validate that the singleton resolves (lookup is on read
  via `LocomotionApi.modeOf`, returns null if unknown).

**Hydration**: `_engagedModePath` is runtime-only and never persisted,
so Hydrator bracket-assign doesn't fire on it. (Were it persisted,
it'd follow the standard pattern — Hydrator writes the path string
directly onto the private field, bypassing the public singleton-form
setter.)

**Engagement transitions**:

- `LocomotionApi.engageAround` (§ 10.8) sets `engagedMode` at the
  start of the wrapped action and clears it at the end if
  `isTransientEngagement` returns true. The controller pipeline
  uses this wrapper around its `actor.traverse(exit, mode)` call.
- `Mobile.traverse` itself doesn't touch `engagedMode` — that's
  locomotion-layer state. See § 9 for the layering reasoning.
- Persistent engagement (when `isTransientEngagement` returned
  false) is cleared by:
  - The actor invoking a new mode-engaging verb — the next
    `engageAround` overwrites `engagedMode` to the new mode at
    start, and clears it if that engagement turns out transient.
  - Dismount / exit-vehicle (for `ride` / `drive` — handled by
    embodiment slot vacate; calls `setEngagedMode(null)` on the
    rider directly).
  - Explicit `unengage` verb? **Not in v1.** If a player needs to
    "stop swimming," they walk in some direction; the swim
    engagement clears when they reach a non-Swimmable container.

### 11.2 Cross-reboot

`engagedMode` is runtime-only (decision #17). On clone/hydrate, all
actors start with `engagedMode = null`. Same model as slot
occupancy in embodiment. Future stash patterns lift collectively.

## 12. BodyPlan `locomotionModes` additions

`BodyPlan.locomotionModes` already exists, authored-but-unused. This
MR adds the readers (the eligibility validators above) and updates
the seed body plans to author beyond `['walk']` where appropriate.

### 12.1 Seed migrations

| Body plan | Current | New |
|---|---|---|
| `biped` | `['walk']` | `['walk', 'climb', 'swim']` (humans can climb ladders and swim in water by default; no fly without wings) |
| `quadruped` | `['walk']` | `['walk', 'swim']` (horses / dogs can swim; can't climb ladders) |
| `sessile` | `[]` | `[]` (plants don't locomote) |

Adding body plans later (avian, aquatic, etc.) ships with their own
appropriate `locomotionModes` arrays.

### 12.2 Future per-species overrides

`locomotionModes` is a property of the *body plan*, not the species.
If a species variant has different locomotion (a flightless bird, a
peg-legged sailor) it carries body-plan override metadata — out of
scope for this MR. Substrate doesn't preclude.

### 12.3 No new field on BodyPlan

The `locomotionModes` field stays as-is. No `locomotionConstraints`,
no per-mode-cost overrides on the body plan. Body-plan declares
*which modes* are possible; mode templates carry the cost data; the
slot-substrate / embodiment substrate carries posture data.

## 13. `Mixins` registry additions (`lib/mixin.ts`)

Three new entries:

```ts
Climbable: 'ClimbableMixin',
Swimmable: 'SwimmableMixin',
Flyable:   'FlyableMixin',
```

Append to the existing `Mixins` const-object. Type union
(`MixinName`) derives automatically.

## 14. Persistence

Most persistence work is implicit in the field declarations above.
Summary:

### 14.1 `LocomotionMode` singleton

Persistent fields: `name`, `speed`, `noiseLevel`, `bodyProfile`,
`groundContact`, `requiresBodyPlanMode`, `requiresPosture`,
`targetTypes`, `costMultiplier`, `passthrough`. All primitive or
`string[]` — no custom marshallers.

### 14.2 `Climbable` / `Swimmable` / `Flyable`

Persistent fields per mixin:
- `<mode>Axes: string[]`
- `difficulty: number | null`

No custom marshallers. `number | null` round-trips cleanly through
JSON/BSON (Mongo). Existing documents without a `difficulty` field
hydrate with `null` (class default), matching today's no-check
behavior.

### 14.3 `Exit.allowedModes`

Persistent. `string[]`. No custom marshaller. Existing documents
hydrate with empty `[]` (class default) — preserves walk-only
behavior for all existing exits.

### 14.3.1 `Drivable.vehicularMode` (cross-subsystem)

Persistent. `string | null`. No custom marshaller. Templatepath
string referencing a `LocomotionMode` singleton (follows the
ref-shapes Pattern A — see `docs/ref-shapes.md`). Existing
`Drivable` documents hydrate with `null` (a Drivable without a
declared vehicular mode falls back to walk via
`LocomotionApi.resolveHostMode`).

**Field naming nit**: per ref-shapes Pattern A, the storage field
should be `_vehicularModePath` (private, `Path` suffix), with
public getter `getVehicularMode()` returning the resolved
singleton. The planning agent should implement this convention
when extending Drivable.

### 14.4 `Mobile.engagedMode`

**Runtime-only.** NOT in `persistentFields`. Resets on
clone/hydrate.

### 14.5 BodyPlan migration

`locomotionModes` is already persistent. Seed migrations are file
edits to existing `seeds/lib/body-plans/*.yaml`; no schema change
to the persistence layer.

### 14.6 No migration script needed

Existing Exit documents in MongoDB hydrate with `allowedModes`
defaulting to `[]` (an absent persistent field hydrates to its
class-default). Empty `allowedModes` = walk-only, which matches
their current behavior (everything walks). Migration is a no-op.

## 15. Test acceptance

Tests live in `lib/locomotion/__tests__/` for mixin tests,
`mud/api/__tests__/` for `LocomotionApi`, `obj/command/__tests__/`
for controllers. Vitest. Follow project conventions.

### 15.1 `LocomotionMode` singleton

- **Template load**: each of the nine v1 templates resolves via
  `LocomotionApi.modeOf(path)` to a `LocomotionMode` with the
  expected property values.
- **Persistence roundtrip**: clone a mode, mutate a setter, save,
  reload — values round-trip.
- **Setter validation**: each setter rejects invalid input
  (e.g., `setSpeed(-1)`, `setSpeed(NaN)`,
  `setNoiseLevel('weird')`, `setRequiresBodyPlanMode(['', 'walk'])`).

### 15.2 `Exit.allowedModes`

- **Default behavior**: a fresh `Exit` allows `walk` and rejects
  every other mode.
- **Whitelist**: `allowedModes: ['climb', 'fly']` allows `climb`
  and `fly`, rejects `walk` / `swim`.
- **Setter validation**: rejects duplicates, empty strings.
- **canTraverse mode-gating**: `exit.canTraverse(mover, 'climb')`
  returns `{ ok: false, reason }` when `'climb'` not in
  `allowedModes`; returns `{ ok: true }` when it is.
- **No-mode call**: `exit.canTraverse(mover)` (mode omitted)
  preserves current behavior — door / blocked / etc. checks
  only.
- **Structured `gate` field**: every non-ok result carries a
  populated `gate` tag (`'blocked'`, `'door'`, `'exitMode'`).
  Existing `reason` prose remains for backward compat.

### 15.3 `Climbable` / `Swimmable` / `Flyable`

For each:

- **Mixin marker**: `MixinApi.hasMixin(host, Mixins.Climbable)` is
  true after composition.
- **Axis check**: `host.canClimbAxis('up')` returns true /
  false per `climbAxes`.
- **Persistence roundtrip**: `climbAxes` round-trips.
- **Setter validation**: rejects duplicate axes, empty strings.

Plus, **Climbable-specific** (difficulty + capability):

- **`getDifficulty` / `setDifficulty` roundtrip**: null and
  non-null values round-trip; setter rejects 0 / negative / NaN /
  Infinity.
- **`canBeClimbedBy` with null difficulty**: returns `true`
  regardless of actor capability.
- **`canBeClimbedBy` with non-null difficulty**:
  - Actor with no `CLIMBING_CAPABILITY_PROP` set → reads default
    `1`. Returns `true` only when `difficulty <= 1`.
  - Actor with `setProp(CLIMBING_CAPABILITY_PROP, 7)` against
    `difficulty: 5` → `true`. Against `difficulty: 8` → `false`.
  - Property write of `0` is honored (some actors are *worse* than
    default); against `difficulty: 1` → `false`.
- **`CLIMBING_CAPABILITY_PROP` constant** is exported from
  `Climbable.ts` and equals `Property.of<number>('climbing')`.

Plus, **Swimmable-specific** (parallel shape):

- **`getDifficulty` / `setDifficulty` roundtrip**: same shape as
  Climbable.
- **`canBeSwimmedBy`**: returns `true` with null difficulty;
  otherwise reads `SWIMMING_CAPABILITY_PROP` (default 1) and
  compares to difficulty. Same threshold semantics as climb.
- **`SWIMMING_CAPABILITY_PROP` constant** is exported from
  `Swimmable.ts` and equals `Property.of<number>('swimming')`.

Plus, **Flyable-specific** (parallel shape):

- **`getDifficulty` / `setDifficulty` roundtrip**: same shape.
- **`canBeFlownBy`**: returns `true` with null difficulty;
  otherwise reads `FLIGHT_CAPABILITY_PROP` (default 1) and
  compares to difficulty.
- **`FLIGHT_CAPABILITY_PROP` constant** is exported from
  `Flyable.ts` and equals `Property.of<number>('flight')`.

### 15.4 `Mobile.engagedMode`

- **Default**: a fresh `Mobile` actor has `getEngagedMode() ===
  null`.
- **Set / clear**: `setEngagedMode(walkMode)` reflects;
  `getEngagedMode()` returns `walkMode`. `setEngagedMode(null)`
  clears.
- **`isEngagedIn` accepts either form**: `isEngagedIn(walkMode)`
  and `isEngagedIn('walk')` both return `true` after engagement;
  both return `false` after `setEngagedMode(null)`.
- **Unknown / unloaded singleton at read time**: if the mode whose
  name is stored hasn't been loaded yet (e.g., template registry
  not yet populated), `getEngagedMode()` returns `null` even though
  the field has a name set. This is the documented Api semantic
  (consistent with `Organism.getSpecies()` when species isn't
  loaded). Tests can force this state via bracket-assign on
  `_engagedModePath`.
- **Not persistent**: clone + reload yields `getEngagedMode() ===
  null`.
- **`onSlotReleased` witness — passthrough cleared on dismount**:
  Actor with `engagedMode = ride`, occupying `back:1` on a
  Mountable horse. Invoking the witness via
  `actor.onSlotReleased(horse, 'back:1')` clears engagedMode
  (host composes Mountable; ride's conveyanceMixin matches).
- **`onSlotReleased` witness — non-matching host is no-op**:
  Actor with `engagedMode = ride`, witness invoked with a
  non-Mountable host (`onSlotReleased(chair, 'sit:1')`). No
  clear — engagedMode stays as ride.
- **`onSlotReleased` witness — non-passthrough mode no-op**:
  Actor with `engagedMode = swim`, witness invoked. No clear
  (swim isn't passthrough). engagedMode stays as swim.

### 15.5 `LocomotionApi`

- **`modeOf`**: returns the right singleton; `null` for unknown
  paths.
- **`bodyPlanAllows`**: any-of semantics; empty
  `requiresBodyPlanMode` means "no gate."
- **`postureAllows`**: same shape.
- **`exitAllowsMode`**: delegates to `Exit.allowsMode`.
- **`canEngage`**: composes the two predicates.
- **`canTraverse`**: composes the three gates; returns a unified
  `TraversalGuard` with the appropriate `reason` for whichever
  gate fails first.
- **`checkEnablement`**: per-mode walks (see § 10.3 algorithm);
  returns ok=true with a Climbable in scope, false with reason
  when absent.
- **`findConveyanceHost`**: returns the right Mountable / Drivable
  for ride / drive; throws for non-passthrough modes.
- **`emissionAt`**: walks passthrough chain; returns the
  non-passthrough mode's emission. Test a rider-on-walking-horse
  case.
- **`eligibleModes`**: returns the correct subset for various
  body-plan + posture combinations.
- **`isTransientEngagement`**: returns true for walk transitions;
  false for climb / swim / fly into the relevant scope; false for
  ride / drive.
- **No `climbingCapability` method on LocomotionApi** — capability
  is owned by Climbable (see § 15.3).
- **`engageAround` lifecycle**:
  - Sets `engagedMode` at start; calls the wrapped action; clears
    if `isTransientEngagement` returns true.
  - **Finally-clause clears on throw**: when the wrapped action
    throws, `engagedMode` is still cleared (transient) — the
    finally block runs regardless of success.
  - Returns the action's resolved value (typed `T`).
- **`modeOfOrThrow`**: throws when given an unknown path; error
  message names the offending path.
- **`engagedMode(actor)` (Api method)**: returns the resolved
  singleton for Mobile-typed actors; returns `null` for non-Mobile
  Stuff (untyped-safe).
- **`allModes()`**: returns every loaded LocomotionMode; empty
  before bootstrap loads templates; nine after v1 bootstrap.
- **`resolveHostMode(host)`**: returns host's engagedMode if set;
  else host's Drivable.vehicularMode if set; else walk.
- **`findConveyanceHost` non-passthrough throws**: calling with a
  non-passthrough mode (e.g., walk) throws (programmatic misuse).
- **Gate ordering in `canTraverse`**: when multiple gates would
  fail, the first-checked failure is returned (body-plan first,
  then posture, then exit-mode, then enablement-with-capability).

### 15.6 Controllers

For each of the six controllers:

- **Happy path**: actor in scope, valid direction, exit allows mode
  — traverse fires; engagedMode is set during and (for transient
  modes) cleared after.
- **Body-plan rejection**: actor whose species body-plan lacks the
  mode requirement — `canTraverse` returns
  `{ ok: false, gate: 'bodyPlan' }`; the controller's
  `composeRejection` produces verb-appropriate prose.
- **Posture rejection**: rejection carries `gate: 'posture'`.
- **Exit-allowedModes rejection**: `gate: 'exitMode'`.
- **Enablement rejection**: `gate: 'enablement'` with optional
  `context` carrying the missing mixin name.
- **Capability rejection** (climb / swim / fly with insufficient
  capability vs. host difficulty): `gate: 'capability'` with
  `context: { difficulty, capability }`.
- **No-conveyance rejection** (ride / drive with no occupied
  mount/driver slot): `gate: 'noConveyance'`.
- **Controller prose composition**: each controller's
  `composeRejection(guard, mode, model)` returns verb-appropriate
  player-facing prose given the structured guard. Verify per-verb
  wording differs where it should (ClimbController's capability
  prose says "too hard for you"; SwimController's says "too rough
  for you"; etc.).
- **Passthrough**: rider invokes `ride east` — the horse traverses,
  not the rider directly; both rider and horse end up in the new
  room.
- **`go` dispatches default mode**: actor with
  `movement.defaultMode = 'walk'` (or unset, since `walk` is the
  default) types `go west` — `WalkController`'s pipeline fires.
  Same actor with `movement.defaultMode = 'fly'` types `go west` —
  `FlyController`'s pipeline fires instead (subject to eligibility).
  The literal `walk west` always fires walk regardless of the
  setting.
- **Vehicular host engagement**: a car composing `Drivable` with
  `vehicularMode: 'wheeled'` — the driver invokes `drive east`,
  the car's engaged mode is `'wheeled'` during traversal.

### 15.7 `Mobile.traverse` mode-gating

- **Successful walk**: through a default-mode (`allowedModes: []`)
  exit — succeeds.
- **Rejected climb**: through a default-mode exit with
  `mode='climb'` — `canTraverse` rejects.
- **Successful climb**: through a `['climb']`-allowed exit —
  succeeds.
- **Does NOT touch `engagedMode`**: `Mobile.traverse` called
  directly (without `engageAround` wrapping) leaves
  `actor.getEngagedMode()` unchanged. Engagement is a locomotion-
  layer concern; programmatic callers wrap explicitly when they
  want it.
- **MotionEvent payload**: carries the mode string. Note: the
  `MotionEvent` shape and its emission path are not yet implemented
  in v1 — the announce-departure / announce-arrival hooks fire as
  today; the mode threading is a future MR's concern (drop or
  defer this test if `MotionEvent` doesn't materialize in v1).

## 16. Compositions to verify

Sample stuff configurations that exercise the substrate end-to-end.
These ship as integration tests (or worked examples in seed
content).

- **Human walks corridor.** Biped body plan
  (`locomotionModes: ['walk', 'climb', 'swim']`); plain corridor
  exit (`allowedModes: []`); `walk east` succeeds.
- **Human climbs ladder to attic.** Biped; room with a Climbable
  ladder Thing (`climbAxes: ['up', 'down']`); up exit
  (`allowedModes: ['climb', 'fly']`); `climb up` succeeds.
- **Human tries to walk up through attic hole.** Same setup;
  `walk up` rejected (`canTraverse` mode-gating: walk not in
  `['climb', 'fly']`).
- **Bat flies up through attic hole.** Avian-ish body plan with
  `locomotionModes: ['fly']`; same hole; no ladder needed
  (Flyable on the attic Location, or just bodyPlan satisfies fly
  enablement — see § 17 open question); `fly up` succeeds.
- **Horse swims a pond.** Quadruped with
  `locomotionModes: ['walk', 'swim']`; pond is a Swimmable
  Location; pond's exits have `allowedModes: ['swim']`;
  `swim south` from the pond succeeds.
- **Rider on walking horse through corridor.** Rider occupies
  `back:1` mount slot on horse (Mountable); rider invokes
  `ride east`; `RideController` resolves the horse as the
  conveyance host; horse's engaged mode is `walk`; horse
  traverses; rider rides along (containment ripple — embodiment
  substrate handles this).
- **Driver in horse-drawn wagon.** Wagon is Drivable with
  `vehicularMode: 'wheeled'`; driver in `driver:1` slot; `drive
  east`; wagon's engaged mode is `wheeled`; wagon traverses.
- **Sailor on rowboat.** Boat is Drivable with `vehicularMode:
  'sailed'`; sailor in driver slot; `drive west` on a
  marine-exit-allowed exit; boat traverses.
- **Sessile plant ignores all locomotion verbs.** Body plan
  `locomotionModes: []`; every locomotion verb rejects at the
  body-plan gate.
- **Permission-denied climb (no ladder).** Biped in a room with no
  Climbable; up exit with `allowedModes: ['climb', 'fly']`;
  `climb up` rejected at enablement check — but `fly up` succeeds
  IF body-plan supports fly. (Standard biped doesn't; would need a
  wings/flight affordance.)
- **Mountain face — too hard for an unaided novice.** A Location
  composes `Climbable` with `climbAxes: ['up', 'down']` and
  `difficulty: 7`; its up exit allows `['climb']`. A biped with no
  `CLIMBING_CAPABILITY_PROP` set attempts `climb up` — body-plan
  check passes (humans climb), enablement walk finds the Climbable
  surface, but `climbable.canBeClimbedBy(actor)` returns `false`
  (`1 < 7`). Rejected with "This climb looks too hard for you."
- **Mountain face — experienced climber succeeds.** Same scene,
  same biped, but with `setProp(CLIMBING_CAPABILITY_PROP, 8)`.
  `canBeClimbedBy` returns `true` (`8 >= 7`); traverse fires.
  Future equipment substrate expands this: skill/equipment/status
  subsystems contribute to the actor's Property value (or, if
  multi-source coordination becomes hairy, the migration is to a
  `Climber` mixin with a `getClimbingCapability()` method that
  Climbable calls instead — see § 10.7).
- **Wall-walking robot vs. mountaineer at the same face.** A
  constructa-clade automaton with `setProp(CLIMBING_CAPABILITY_PROP,
  12)` in its clone hook attempts the same `difficulty: 7` face —
  `canBeClimbedBy` returns `true` (`12 >= 7`). Climbable doesn't
  know whether the actor is biological or mechanical; it reads the
  one Property and compares. The polymorphism between mountaineer
  and wall walker is entirely in *who writes the Property when* —
  not in Climbable's gate.
- **Spherical mountain face — semantic direction vocabulary.** A
  Spherical zone composes `Container + Climbable` with
  `climbAxes: ['the-summit', 'the-base-camp', 'the-ledge']` and
  `difficulty: 7`; its exits are `direction: 'the-summit'`
  (`allowedModes: ['climb', 'fly']`), `direction: 'the-base-camp'`
  (`allowedModes: ['climb']`), `direction: 'the-ledge'`
  (`allowedModes: ['climb']`). A biped with `climbing: 8` types
  `climb the-summit` — same six-step pipeline as the Cartesian
  version; only the direction strings differ. Verifies the
  direction-vocabulary-agnostic substrate invariant (§ 5.6)
  end-to-end. Same actor types `fly the-summit` — succeeds if
  body-plan has fly + scope composes Flyable.
- **ExitableVessel — semantic vessel-internal directions.** A
  spaceship's exterior hull composes `Climbable` with
  `climbAxes: ['the-airlock', 'the-cargo-hatch']`; the
  EVA-suited crew member types `climb the-airlock` to traverse the
  exit to the ship's interior. Substrate doesn't distinguish vessel
  exits from zone exits; the verb pipeline is identical.
- **Aquatic-only species rejected at body-plan gate.** A fish (body
  plan `locomotionModes: ['swim']`) tries `walk east` from a water
  Location. Body-plan check fails (`walk` not in fish's locomotion
  modes) before any scope check. Rejected at the body-plan gate
  with mode-specific prose.
- **Flying-only species (winged but not biped) in an enclosed
  room.** A bird (body plan `['fly']`) in an indoor parlor (no
  `Flyable` composition) types `fly up`. Body-plan check passes,
  but enablement walk finds no Flyable in scope; rejected with
  "There's no room to fly here." Mirrors the closed-room
  affordance from decision #21.
- **Multi-mode species transitioning mid-journey.** An amphibian
  (body plan `['walk', 'swim']`) starts on a beach (engaged
  walk-mode-transient), invokes `swim south` to enter the ocean
  (Swimmable Location). `swim` engagement is persistent at arrival
  (destination still Swimmable); `engagedMode = 'swim'` after
  traverse. Subsequent `walk west` back to the beach: swim
  engagement clears at arrival (destination not Swimmable);
  walk is transient, clears at end; `engagedMode = null` on beach.
- **Capability exactly equals difficulty.** Mountain face with
  `difficulty: 7`; biped with `setProp(CLIMBING_CAPABILITY_PROP, 7)`.
  `canBeClimbedBy` uses `>=` comparison, so `7 >= 7` is true; the
  climb succeeds. Off-by-one verification test.
- **Parked-conveyance fallback to walk.** A rider on a stationary
  horse (horse's `engagedMode = null`; not Drivable, so no
  `vehicularMode`) invokes `ride east`. `resolveHostMode(horse)`
  falls through to `'/lib/locomotion/walk'`; horse engages walk
  for the traversal. Rider's `ride` mode passthroughs to the
  horse's walk; emission consumers read walk's emission.
- **Driven cart with explicit `vehicularMode`.** A cart with
  `Drivable.vehicularMode = '/lib/locomotion/wheeled'`, driver in
  controller slot, no current engagement. Driver invokes
  `drive east`. `resolveHostMode(cart)` skips the null
  `engagedMode`, reads `getVehicularMode()`, returns the wheeled
  singleton. Cart engages wheeled for the traversal; trap
  subsystem reads wheeled emission (loud, upright, full ground
  contact), not the driver's drive (passthrough).

## 17. Open questions (carried to plan review)

These don't block the requirements doc but the planning agent will
land them in the implementation MR:

1. **First-class default-mode UX.** `movement.defaultMode` lives in
   the generic settings keyspace, reachable via the `settings` /
   `var` commands. v1 ships this as-is — a string-typed setting,
   nothing more. Revisit only if the setting grows beyond a
   string / enum (e.g., a structured preference that needs
   schema-aware editing). For now: no dedicated `mode` verb, no
   character-creation prompt, no character-level persistence shape
   beyond what the setting already provides. None of these touch
   the locomotion substrate.
2. **Verb help / `eligibleModes` UI.** The Api method exists;
   the prompt UI for "what can I do here?" isn't wired. v1
   substrate exposes everything the UI needs to surface
   (`LocomotionApi.eligibleModes(actor)` returns the full set);
   the wiring lands when the Interactive prompt stack does. Carry
   as roadmap item.
3. **Aliasing `swim` → `dive` for downward swim?** Player-side
   alias via `AliasMixin`. No substrate change. The alias
   resolves before verb dispatch, so locomotion never sees the
   alias form. Side note: detecting alias-vs-literal at the
   substrate layer would be an antipattern — aliasing should be
   transparent in UX. Document in examples; not a substrate
   concern.
4. **Direction vocabulary normalization (`'forward'` etc.).**
   Saxonberg has no "forward" concept yet — neither Cartesian
   spaces (which use compass + up/down) nor Spherical spaces
   (semantic-string exits) carry actor-facing direction. Cartesian
   normalization would be straightforward to bolt on (facing
   compass + offset); Spherical is more abstract — author-defined
   semantic exits don't naturally express relative direction.
   Hold off on normalization until Spherical spaces get a proper
   engineering pass and / or actor-facing-direction lands as a
   substrate concept. v1 substrate doesn't normalize; players type
   the exact axis the host declared.

## 18. Build order within the MR

The substrate-first, consumers-second sequencing:

**Wave 1 — substrate (no behavior change yet)**

1. `LocomotionMode.ts` class.
2. `lib/locomotion/__tests__/LocomotionMode.test.ts` covering
   shape + setters.
3. The nine `seeds/lib/locomotion/*.yaml` templates.
4. `Mixins` registry entries for `Climbable` / `Swimmable` /
   `Flyable`.
5. `Climbable.ts`, `Swimmable.ts`, `Flyable.ts` + tests.
6. `Exit.allowedModes` field + tests; setter validation.
7. `Mobile.engagedMode` field + tests; getter/setter.
8. `LocomotionApi` skeleton + tests for `modeOf`,
   `bodyPlanAllows`, `postureAllows`, `exitAllowsMode`,
   `canEngage`, `checkEnablement` (per-mode), `findConveyanceHost`,
   `emissionAt`, `eligibleModes`, `isTransientEngagement`,
   `engagedMode`.

**Wave 2 — wire `Mobile.traverse`'s mode-gate**

9. `Mobile.traverse` calls `exit.canTraverse(mover, mode)` with
   the passed mode. (Mode-gate enforcement only — engagedMode
   lifecycle is locomotion-layer; see § 9 for layering rationale,
   § 10.8 for the `engageAround` wrapper that lands in Wave 3.)
10. Updated `Mobile.test.ts` for the new mode-gate behavior.

**Wave 3 — verb controllers + engagement lifecycle**

11. `LocomotionApi.engageAround` + `isTransientEngagement` (§ 10.8).
12. `LocomotionControllerBase` class + tests.
13. `WalkController` (replaces / supplements `GoController` per
    § 6.6) + tests.
14. `ClimbController`, `SwimController`, `FlyController` + tests.
15. `RideController`, `DriveController` + tests (depends on
    embodiment slot substrate being in place — specifically
    `Mountable`, `Drivable`, `SlotApi.findOccupiedHost`,
    `Postures.Mounted`).
16. `Drivable.vehicularMode: string | null` field added to the
    existing `Drivable` mixin (cross-subsystem edit; see § 5.3
    scope addition).
17. `mud/cmd/<verb>.yaml` files for each.
18. Existing `GoController` update to extend
    `LocomotionControllerBase` and dispatch via the default-mode
    setting (§ 6.6).
19. **Engagement clear on dismount — witness method on Mobile.**
    Locomotion adds an `onSlotReleased(host, slotName)` witness
    method to the Mobile interface (§ 11.1); the embodiment slot
    API invokes `actor.onSlotReleased?.(host, slotName)`
    synchronously inside `releaseOccupancy`. Mobile's default
    implementation clears engagedMode when a passthrough mode's
    `conveyanceMixin` matches the vacated host's mixins. The
    invoking-side wiring is a small embodiment edit (one line in
    `SlotApi.releaseOccupancy` or `Mountable.releaseOccupancy`,
    depending on where the substrate centralizes release). If the
    embodiment substrate doesn't already invoke an
    `onSlotReleased` witness, this MR adds the invocation
    alongside the Mobile method.

**Wave 4 — content seed updates**

20. `seeds/lib/body-plans/biped.yaml`,
    `quadruped.yaml` — expand `locomotionModes`.
21. Selected existing Exit content with `allowedModes` set where
    the seed authoring already implies it (an attic-hole exit
    gains `['climb', 'fly']`; an underwater passage gains
    `['swim']`).

**Wave 5 — integration tests + worked-example seeds**

22. End-to-end tests for the compositions in § 16.

## 19. Out-of-scope follow-ups (for downstream MRs)

Things this slate's shape explicitly anticipates but doesn't ship:

- **Voluntary mode disengagement / `unengage` verb.** v1 has no
  "stop swimming" or "stop climbing" verb. Engagement clears
  naturally on transient traverses (walk; swim-to-shore; climb-out-
  of-shaft) and on dismount (ride/drive). Mid-traversal pause
  (hanging on a vine mid-climb without traversing) is **not
  supported in v1** — the substrate has no "engaged-without-
  traversing" mechanism; controllers always engage around a
  traverse. If content lands that requires it (a sustained "hold
  position on the rock face" affordance), it ships with the future
  activity slate as a durative engagement.
- **Forced mode changes (admin teleport while engaged).** When an
  admin uses `@teleport` or other raw-containment-move tools that
  bypass `Mobile.traverse`, `engagedMode` is **not** cleared
  automatically. The teleport tool is responsible for calling
  `actor.setEngagedMode(null)` (or `LocomotionApi.engageAround`
  with the destination's appropriate mode) as part of its
  contract. The substrate doesn't install a containment-move
  witness for this — same minimal-coupling philosophy as
  `Mobile.traverse` staying spatial-pure. Document this in
  `shell-author.md` when the teleport command is touched next.
- **Witness hooks for engagement transitions.** v1 fires no
  separate `EngagementEvent` when `engagedMode` flips. Consumers
  read mode via `MotionEvent` (which carries the mode the actor
  used to move) or via direct `getEngagedMode()` polling. If a
  future consumer needs notification on idle engagement changes
  (e.g., a "you start swimming" environmental narration), lift
  to an event then.
- **Customizable per-content failure prose.** § 10.3's failure
  messages ("This climb looks too hard for you", "This water's too
  rough for you", "The wind's too strong for you to fly") are
  substrate defaults. Content authors who want context-specific
  prose ("the icefall is glassy under your bare hands") need an
  override seam — e.g., an optional `getDifficultyFailureMessage(actor)`
  method on each enablement mixin. Not in v1; flag for content-
  authoring lift.
- **Run / sneak / crawl modes** — land with their consumer
  subsystems. Template path pattern is already locked.
- **`run` + activity-substrate integration.** `run` is the forcing
  example for activity coupling: long-running multi-room locomotion
  (running from A to F via pathfinding) is itself an *activity*,
  with engagement slots, cancel semantics, and interrupt rules. The
  activity slate carries those concerns. When it lands, the
  activity requirements doc will inform new fields on
  `LocomotionMode` — likely `attentionCost` (how distracted are you
  while engaged?), `interruptDifficulty` (how hard is it for an
  external event to stop you?), `vulnerabilityModifier` (how much
  does this mode expose you to attacks/hazards?). The substrate is
  already extensible by design (templates can grow fields without
  breaking existing consumers); no v1 change is needed. Pathfinding
  similarly plugs in by reading `costMultiplier` more aggressively
  — it's already on the template; the consumer just hasn't shipped.
  Designing those fields now risks locking in shape that hasn't
  survived contact with the actual activity-substrate requirements
  pass — let the activity doc drive.
- **Skill / equipment / status substrate that contributes to the
  capability Properties (`CLIMBING_CAPABILITY_PROP`,
  `SWIMMING_CAPABILITY_PROP`, `FLIGHT_CAPABILITY_PROP`).** v1 ships
  actors writing the Properties directly at clone time
  (mountaineer-climbing = 1, wall-walker-climbing = 12, fish-
  swimming = 10, eagle-flight = 9). Future MRs add subsystems that
  update the Property in response to events (skill gained → +N;
  rope donned → +3; injured → -2; raining → -1). If multi-source
  coordination through a single Property becomes hairy, the
  migration is to per-mode `Climber` / `Swimmer` / `Flyer` mixins
  with `get<Mode>Capability()` methods; the only line that changes
  is inside the corresponding `canBeXxxBy` method on each
  enablement mixin. The seam is locked; the computation grows in
  place across all three modes.
- **Pathfinder** — reads `costMultiplier`; gets its own slate.
- **Trap subsystem** — reads `noiseLevel`, `bodyProfile`,
  `groundContact`, `emissionAt`; gets its own slate.
- **Detection / auditory perception** — reads `emissionAt`,
  walks passthrough chain; extends `PerceptionApi`.
- **Narration of mode-specific arrival/departure** — "walks in /
  climbs down / flies up" lands with the messaging slate.
- **Per-host emission modifiers** — steel-shod horse, muffled
  car, silent wings — composable via a future `EmissionModifier`
  mixin.
- **Future passthrough modes.** The slot-occupation-on-a-moving-host
  invariant (§ 10.4) gives every future passthrough mode a free
  shape:
  - `passenger` — non-controller occupant of a vehicle (bus rider,
    train passenger, hay-wagon passenger). Slot pattern
    `'passenger:'`.
  - `carried` — small character carried in arms by a larger one.
    Slot pattern `'cradle:'` or similar.
  - `pocketed` — tiny character in someone's pocket / pouch.
    Slot pattern `'pocket:'`.
  - `towed` — water-skier behind a boat, sled behind a dogsled
    team. Slot pattern `'tow:'`.
  - `dragged` — fallen rider still attached but no longer in the
    mount slot. Slot pattern depends on the dragging relationship.

  Each lands as a single new template at `/lib/locomotion/<name>`
  with `passthrough: true` + its slot pattern; no substrate change.
  Distinct from non-passthrough modes that happen to involve other
  entities — **levitation** (you move, but you're not in someone
  else's slot), **group/formation marching** (emission aggregates,
  it doesn't delegate), and **cargo** (no engaged mode, just
  containment) — none of these are passthrough.
- **Mode `extends` template inheritance** — if a second Idea
  hierarchy hits the same wall.
- **3D direction vocabulary** for fly — per-zone declaration
  when Spherical-zone content needs it.
- **Step-ladder, free-standing perches, climbing-to-vertical-
  position-within-room** — these go through the **embodiment
  Slotted+Postured substrate**, not Climbable. A step-ladder is a
  `Slotted` Stuff with a `top:1` slot that accepts
  `Postures.Stand`; the verb `climb step-ladder` (no direction,
  with a target arg) targets the slot, not a direction. Distinct
  from `climb up` (locomotion with direction). The two verbs
  share a name but disambiguate via argument shape — direction
  arg → locomotion; target arg → slot occupation.
- **Polymorph / shapeshift locomotion-mode reconciliation** —
  body-plan swap mid-engagement. Substrate doesn't preclude;
  reconciliation rules land with shapeshift.
- **Tile-level positional reachability** (which corner of the
  room must you be in to climb the wall-mounted ladder?) —
  not a v1 concern. Sub-room positional model is a future
  substrate.
- **Mid-air collision / fall damage / drowning / suffocation** —
  physical-consequence machinery for failed mode engagement
  (lose flight → fall; can't breathe water → drown). Future
  physics MRs.

## 20. Documentation deliverables

When this MR lands, the following docs are added / updated:

- **New**: `docs/subsystems/locomotion.md` — the reference doc
  paralleling other subsystem docs. Cross-references this
  requirements doc and the slate.
- **Updated**: `CLAUDE.md` — add `locomotion.md` to the subsystem
  reference list.
- **Updated**: `docs/architecture.md` — locomotion gets a
  paragraph in the substrate enumeration.
- **Updated**: `docs/roadmap.md` — locomotion moves from "active
  design slate" to "shipped" foundation; the "Substrate
  buildout" wave #3 is checked off.
- **Updated**: `docs/subsystems/spatial.md` — `Mobile.traverse`
  documentation gains the mode-gating layer; the locomotion
  reference is linked.
- **Updated**: `docs/subsystems/boundary.md` — `Exit.allowedModes`
  documented in the Exit section.
- **Updated**: `docs/subsystems/race.md` — `BodyPlan.locomotionModes`
  consumer story documented (it was previously authored-but-unused).
- **Updated**: `docs/subsystems/conveyance.md` — `Drivable.vehicularMode`
  field added (cross-subsystem edit from this MR — see § 5.3
  scope addition); passthrough-mode-related additions
  (rider/driver slot interaction with `engagedMode`,
  conveyance-host mode resolution via `resolveHostMode`).
- **Updated**: `docs/subsystems/posture.md` — note that posture
  and `engagedMode` are orthogonal axes (decisions #19 / #20);
  `Postured` vocab unchanged; engaged-mode tracked separately on
  Mobile, not as a posture.
- **Updated**: `docs/antipatterns.md` — new entries:
  - **Don't** call `actor.setEngagedMode(mode)` directly outside
    `LocomotionApi.engageAround`. **Do** wrap traversals in
    `engageAround` to get correct transient-vs-persistent cleanup.
  - **Don't** read `_engagedModePath` directly across Stuff
    boundaries. **Do** call `actor.getEngagedMode()` (or
    `LocomotionApi.engagedMode(actor)` for untyped-safe variant).
  - **Don't** read `actor.species.bodyPlan.locomotionModes` via
    field chain. **Do** use `LocomotionApi.bodyPlanAllows(actor, mode)`
    or method-chain (`getSpecies()?.getBodyPlan()?.getLocomotionModes()`).
  - **Don't** make `Mobile.traverse` manage engagement directly
    (the layering rationale).
- **Optional**: `docs/mql-grammar.md` — if `Climbable` /
  `Swimmable` / `Flyable` become MQL-filterable. Probably no
  change to MQL itself; the new mixins are MQL-queryable via
  the existing mixin-filter mechanism.

## 21. What the planning agent should produce

The deliverable for plan review:

1. **File-by-file change list** — every new file, every existing
   file edited, with one-line purpose.
2. **Code-shape preview** — `LocomotionMode.ts` class skeleton;
   `LocomotionControllerBase.ts` skeleton; one of the per-mode
   mixin skeletons; `LocomotionApi.ts` method-signature
   inventory; `Exit.ts` diff showing the `allowedModes` addition;
   `Mobile.ts` diff showing the `engagedMode` addition.
3. **Test-file inventory** — every test file added, with the
   `describe`/`it` headings (not bodies).
4. **Seed file inventory** — the nine mode YAML files with their
   property values transcribed from § 5.3.
5. **Body-plan seed diffs** — the `locomotionModes` updates.
6. **Build-order critique** — Wave 1 / 2 / 3 / 4 / 5 as proposed,
   or a different sequencing with rationale.
7. **Open-question dispositions** — for each of § 17, either a
   concrete decision the planning agent makes, or a flag for
   user review before implementation starts.
8. **Risk register** — anything in this requirements doc that
   the planning agent suspects won't survive contact with the
   code as written. Per the project ethos: surface friction
   before writing 2000 lines.

This requirements doc is intentionally exhaustive on substrate
shape. The planning agent's job is to thread it through the
existing codebase honestly — call out any place the doc's
assumptions don't match what's actually there.
