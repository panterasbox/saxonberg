# Locomotion

Mode-aware movement: `LocomotionMode` singletons, per-mode enablement
mixins (`Climbable` / `Swimmable` / `Flyable`), the
`LocomotionControllerBase` verb suite (`walk` / `climb` / `swim` /
`fly` / `ride` / `drive`), and the engagement lifecycle that hangs
`engagedMode` on the actor for the duration of a traversal.

## The Cast

| Name | Location | Role |
|---|---|---|
| `LocomotionMode` | `lib/locomotion/LocomotionMode.ts` | Singleton Idea — one per mode. Author-data: speed / noise / body-profile / ground-contact / cost / passthrough / conveyance + enablement mixin names / medium |
| `Enablement` | `lib/locomotion/Enablement.ts` | Shared interface (axes + difficulty + capability gate) implemented by all three per-mode enablement mixins |
| `Climbable` / `Swimmable` / `Flyable` | `lib/locomotion/{Climbable,Swimmable,Flyable}.ts` | Host capability mixins. Each exports its own `*_CAPABILITY_PROP` for the per-mode skill gate |
| `LocomotionApi` | `api/locomotion.ts` | Mode resolution, eligibility, engagement lifecycle, passthrough chain, emission walk, default-mode resolution |
| `LocomotionControllerBase` | `obj/command/LocomotionControllerBase.ts` | Abstract base for the six per-mode verbs and refactored `go` |
| `Walk` / `Climb` / `Swim` / `Fly` / `Ride` / `DriveController` | `obj/command/*.ts` | Concrete controllers — override `modeName()` and (optionally) `composeRejection()` for verb-templated prose |

`LocomotionMode` extends `SingletonMixin(PropertiedMixin(Idea))`. The
nine v1 modes live at `/lib/locomotion/<name>`.

## Modes (v1)

| Name | Medium | Passthrough | Enablement | Required body-plan |
|---|---|---|---|---|
| walk | ground | — | — | `['walk']` |
| climb | vertical | — | `ClimbableMixin` | `['climb']` |
| swim | water | — | `SwimmableMixin` | `['swim']` |
| fly | air | — | `FlyableMixin` | `['fly']` |
| ride | — (null) | ✓ MountableMixin | — | — |
| drive | — (null) | ✓ DrivableMixin | — | — |
| wheeled | ground | — | — | — |
| sailed | water | — | — | — |
| aerial | air | — | — | — |

Walk / climb / swim / fly are organism modes — actors engage directly.
Ride / drive are passthrough — the actor's slot occupancy on a
Mountable / Drivable host stands in for direct engagement; the host
traverses, the actor rides along via the conveyance ripple. Wheeled /
sailed / aerial are vehicular modes — hosts declare them on
`Drivable.vehicularMode` and engage them when driven.

## Two parallel mode vocabularies

The substrate juggles two string vocabularies for the same conceptual
mode:

- **Full templatePath** (`/lib/locomotion/walk`) — what storage holds
  (`Mobile._engagedModePath`, `Drivable._vehicularModePath`).
- **Short name** (`walk`) — what authoring uses (`Exit.media` →
  medium lookup, `BodyPlan.locomotionModes`, `BodyPlan.defaultLocomotionMode`,
  `LocomotionMode.requiresBodyPlanMode`, Mml prose).

`LocomotionApi.modeOf(nameOrPath)` accepts either form. Internally the
Api normalizes short names to `/lib/locomotion/<name>` and looks up
the singleton via `StuffApi.findByTemplatePath`. `Mobile.isEngagedIn`
accepts both forms too.

## Reference shapes

The substrate exercises every reference pattern from
[ref-shapes.md](../ref-shapes.md):

- **`_engagedModePath`** on Mobile — Pattern A (string-by-path).
  Runtime-only (NOT in `persistentFields`): a reloaded actor wakes up
  unengaged. The mode singleton itself persists by templatePath in the
  domain collection.
- **`_vehicularModePath`** on Drivable — Pattern A (string-by-path).
  Persistent: a horse-drawn wagon ships with `vehicularMode: wheeled`
  in its template and round-trips through saves.
- **`defaultLocomotionMode`** on BodyPlan — short name string
  (Pattern A variant with no leading slash). Resolved by
  `LocomotionApi.defaultModeFor` when no explicit setting is set.

## LocomotionApi surface

```
modeOf(nameOrPath)           → LocomotionMode | null
modeOfOrThrow(nameOrPath)    → LocomotionMode (throws if not loaded)
allModes()                   → readonly LocomotionMode[]
resolveHostMode(host)        → LocomotionMode (engagedMode → vehicularMode → walk)
bodyPlanAllows(actor, mode)  → boolean
postureAllows(actor, mode)   → boolean
exitAllowsMode(exit, mode)   → boolean
canEngage(actor, mode)       → boolean (bodyPlan + posture only)
canTraverseExit(actor, exit, mode, direction) → TraversalGuard
checkEnablement(actor, mode, direction)        → TraversalGuard
findConveyanceHost(actor, mode) → Stuff | null (throws on non-passthrough)
emissionAt(mover)            → EmissionData | null
eligibleModes(actor)         → readonly LocomotionMode[]
engagedMode(actor)           → LocomotionMode | null (non-Mobile-safe)
isTransientEngagement(mode, exit) → boolean
engageAround(actor, mode, exit, action) → Promise<T>
defaultModeFor(actor)        → string (chain: setting → bodyplan → 'walk')
traverseWithDefault(actor, exit) → Promise<void>
```

## Mode-gate cascade

`canTraverseExit` runs four gates in order; first failure surfaces:

1. **body-plan** — `BodyPlan.locomotionModes` must include at least
   one of the mode's `requiresBodyPlanMode`. Non-Organism actors pass
   trivially (no anatomy constraint applies). Sessile plants ARE
   organisms with empty `locomotionModes` — rejected here.
2. **posture** — actor's `Posed.getPosture()` must be in the mode's
   `requiresPosture`. Empty set means no posture gate.
3. **exit.canTraverse** — checks `blocked`, `door`, and `media` (mode
   medium must match the exit's medium list, or empty media → walk-
   only legacy default).
4. **enablement** — for non-passthrough modes with an `enablementMixin`,
   walk the actor's scope for a host that composes that mixin AND
   accepts the direction AND can be engaged (capability ≥ difficulty).
   For passthrough modes, walk slot occupancy for a host composing
   the mode's `conveyanceMixin`.

Each rejection carries `gate` / `mode` / optional `context` so
controllers can render verb-templated prose without re-parsing
`reason`.

## Engagement lifecycle

`engageAround(actor, mode, exit, action)` sets `actor.engagedMode = mode`,
runs the action, then conditionally clears engagedMode:

- **Transient** (cleared): walk + the vehicular modes (no enablement-
  mixin to remain "in" at the destination), OR climb/swim/fly when
  the destination doesn't compose the enablement mixin AND contains
  no Containable that does.
- **Persistent** (kept): passthrough modes — the rider stays engaged
  in `ride` while occupying the mount slot; `Slotted.vacate` fires
  the `Slottable.onSlotReleased` witness which `Mobile.onSlotReleased`
  uses to clear engagedMode on dismount. Or climb/swim/fly when the
  destination is also enabled (climbing from one face to another).

Errors from `action` propagate; the `finally` clause still clears
engagement for transient modes, so a failed traversal doesn't leave
a stale `engagedMode` behind.

## Verb dispatch

`go <target>` dispatches under `LocomotionApi.defaultModeFor(actor)`
— a three-tier chain:

1. Actor's explicit `movement.defaultMode` setting (`EnvironmentMixin`
   composers only).
2. Actor's `Species → BodyPlan → defaultLocomotionMode` (Organism
   composers).
3. Universe default `'walk'`.

Birds get `fly` for free; fish get `swim`. Players override per-
character via `set movement.defaultMode <name>`.

Literal mode verbs (`walk`, `climb`, `swim`, `fly`, `ride`, `drive`)
extend `LocomotionControllerBase` with a one-line `modeName()`
override and (optionally) verb-templated `composeRejection` prose.

## Exit.media

The exit-side gate. Authors declare which media (`'ground'` /
`'water'` / `'air'` / `'vertical'`, open vocab) the exit admits;
`allowsMode(modeName)` resolves the mode singleton and matches its
`medium` against the exit's set.

| Exit shape | Admits |
|---|---|
| `media: []` (default) | walk only (legacy backcompat) |
| `media: ['ground']` | walk + wheeled + (future run/crawl/sneak) |
| `media: ['vertical']` | climb |
| `media: ['water']` | swim + sailed |
| `media: ['air']` | fly + aerial |
| `media: ['ground', 'water']` | mixed (beach shore) |

Passthrough modes (`ride`, `drive`) have `medium: null` and are never
admitted directly — the controller substitutes the host's mode at
the gate call site (see `LocomotionControllerBase.execute`).

## Mobile.traverse mode-gate

`Mobile.traverse(exit, mode)` now enforces `exit.canTraverse(this, mode)`
before announcement and throws `ContainmentError` on rejection.
Programmatic-violation policy: player-input paths always pre-check via
`LocomotionApi.canTraverseExit`, so the throw is reached only by
misbehaving programmatic callers (admin tools, scripted NPC AI). The
throw payload carries the structured `TraversalGuard` on
`cause.traversalGuard` for debug surfaces.

## Drivable.vehicularMode — fail-loud

`Drivable.vehicularMode === null` for a host that's about to be driven
is a content-author bug: `LocomotionApi.resolveHostMode` throws. The
template-time authoring contract is: a cart declares
`vehicularMode: wheeled`, a rowboat `sailed`. The previous version
silently fell back to walk, which masked the bug; the new contract
surfaces it loudly in dev.

The companion fix: `Drivable.controllerSlot` defaults to `'driver:1'`
(not `'mount:1'`) so a Stuff composing both `Mountable` and `Drivable`
doesn't collide rider and driver on the same slot name.

## Slot-release witness

`Slottable.onSlotReleased?(host, slotName)` is an optional method on
the `Slottable` interface. `Slotted.vacate` and `Slotted.vacateSole`
invoke it synchronously after removing the candidate. `Mobile`
implements it to clear `engagedMode` when the vacated host composes
the engaged mode's `conveyanceMixin` — a dismounting rider's
engagement clears automatically without any controller-side
bookkeeping.

## Emission

`LocomotionApi.emissionAt(mover)` walks the passthrough chain (depth
capped at 16) to the host whose engaged mode is non-passthrough and
returns its emission data (noise / body-profile / ground-contact +
the resolved host chain). Future trap / detection / sound consumers
read this to ask "what does this mover sound / look / feel like right
now?" — a rider on a galloping horse reads the horse's wheeled-style
emission, not the rider's own walk.

## Authoring locomotion content

Adding a new mode (e.g., `slither`):

1. Author the singleton seed at `seeds/lib/locomotion/slither.yaml`
   with `class: /lib/locomotion/LocomotionMode`, the property values,
   and the appropriate `medium`.
2. If the mode needs an enablement scope, create a `*ableMixin` that
   implements `Enablement`, add it to the `Mixins` registry, and set
   the seed's `enablementMixin` field to the registry constant.
3. Add a verb YAML view (`mud/cmd/slither.yaml`) and a controller
   that extends `LocomotionControllerBase` with `modeName()` returning
   `'slither'`. Author a controller seed at
   `seeds/obj/command/SlitherController.yaml`.
4. Update body-plan seeds that should permit the mode (add to
   `locomotionModes`) and optionally bump `defaultLocomotionMode`
   for species whose default movement is the new mode.

## Cross-references

- [conveyance.md](./conveyance.md) — Mountable / Drivable hosts,
  conveyance ripple, vehicle design space.
- [spatial.md](./spatial.md) — `Mobile.traverse`, conveyance ripple
  integration, movement messaging.
- [boundary.md](./boundary.md) — Exit substrate, `TraversalGuard`
  shape.
- [slot.md](./slot.md) — slot universe, `Slottable.onSlotReleased`
  witness shape.
- [race.md](./race.md) — `BodyPlan.locomotionModes` +
  `defaultLocomotionMode`.
- [ref-shapes.md](../ref-shapes.md) — Pattern A path-by-string for
  mode references on actor / drivable.
