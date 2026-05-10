# Locomotion slate (working doc)

Working slate for the locomotion subsystem — modes, the verbs that
invoke them, the target shapes they accept, and the four features
that consume mode data (traps, pathfinding, detection, validation).
Drafted as a comment-able design doc; the next pass shapes this
into formal requirements before going to a planning agent.

The embodiment slate (`docs/embodiment-slate.md`) handles slots and
conveyance; this slate handles *how movement actually happens*.
They're sibling subsystems and reference each other at the seams.

See also:

- [docs/slates/embodiment-slate.md](./embodiment-slate.md) — slot
  substrate, `Mountable` / `Drivable`, conveyance ripple. Layer 4
  there links here.
- [docs/slates/mixin-slate.md](./mixin-slate.md) — names `Climbable` /
  `Swimmable` / `Crawlable` / `Flyable` as the per-mode target
  mixins; this slate is where they actually get designed.
- [docs/subsystems/race.md](../subsystems/race.md) — `BodyPlan`
  carries `locomotionModes: string[]`, the per-species menu.
- [docs/subsystems/spatial.md](../subsystems/spatial.md) — exits,
  `Mobile.traverse`, the existing locomotion entrypoint.

---

## Principle

Modes carry **data, not behavior**. A small number of consumers
(verb controllers, traps, pathfinder, detection, validators) each
ask the mode the same handful of questions. New modes — `slither`,
`burrow`, `skate` — are one new template each, no framework code
churn.

The verb is the dispatch surface. `walk west`, `sneak west`,
`climb up`, `swim east`, `ride west`, `drive west`. Mode IS the
verb (not a hidden parameter inferred from posture). Every consumer
of mode data reads from the singleton — they don't run through the
verb dispatch.

---

## Layered design

| Layer | Concern | What lives here |
|---|---|---|
| 1. The mode singleton | Per-mode property data | `LocomotionMode` Idea + `/lib/locomotion/<mode>` templates |
| 2. Verb controllers | Dispatch — one verb per mode | `WalkController`, `ClimbController`, `RideController`, … |
| 3. Target mixins | What kinds of things this mode can traverse | `Climbable`, `Swimmable`, `Crawlable`, `Flyable` |
| 4. Cross-cutting Api | Shared queries (eligibility, emission, current mode) | `LocomotionApi` |
| 5. Consumers | Subsystems that read mode data | Trap subsystem, pathfinder, perception, command validators |

Layers 1–4 are the substrate. Layer 5 is everything that uses it
and is the proof the substrate is shaped right.

---

## Layer 1 — `LocomotionMode` singleton

Singleton-by-templatePath `Idea`, same shape as `Material`,
`Species`, `BodyPlan`. Adding a mode is one new template at
`/lib/locomotion/<name>`; no framework code changes.

### Template paths (v1 roster)

```
/lib/locomotion/walk
/lib/locomotion/run
/lib/locomotion/sneak
/lib/locomotion/crawl
/lib/locomotion/climb
/lib/locomotion/swim
/lib/locomotion/fly
/lib/locomotion/ride       (passthrough)
/lib/locomotion/drive      (passthrough)
```

`ride` and `drive` are *passthrough* modes — they delegate every
emission / motion property to their host (the horse, the car).
The conveyance is what emits sound and consumes traps; the rider
or driver inherits.

### Property axis

What every `LocomotionMode` carries:

| Field | Type | Used by |
|---|---|---|
| `name` | string | display, debug |
| `speed` | number (relative to walk = 1.0) | pathfinder, scheduling |
| `noiseLevel` | `'silent' \| 'quiet' \| 'normal' \| 'loud'` | detection (auditory) |
| `bodyProfile` | `'prone' \| 'crouched' \| 'upright' \| 'varied'` | detection (visual), traps (height-keyed) |
| `groundContact` | `'none' \| 'partial' \| 'full'` | traps (pressure / pit) |
| `producesPosture` | string — what posture engaging this mode sets | embodiment, eligibility for other modes |
| `requiresPosture` | `string[]` — postures from which this mode is reachable | eligibility |
| `requiresBodyPlanMode` | `string \| null` — must be in body plan's `locomotionModes` | eligibility |
| `targetTypes` | `string[]` — type names this mode resolves against | validation, MQL filter |
| `costMultiplier` | number — pathfinder cost weight | pathfinder |
| `passthrough` | `boolean` — delegates emission to host | detection, traps |

### v1 property values

| Mode | Speed | Noise | Profile | Ground | Posture | Targets | Body-plan req |
|---|---|---|---|---|---|---|---|
| walk | 1.0 | normal | upright | full | stand | `Exit` | walk |
| run | 2.0 | loud | upright | full | run | `Exit` | walk (run is the same body-plan capability) |
| sneak | 0.4 | silent | crouched | full | crouch | `Exit` | walk |
| crawl | 0.3 | quiet | prone | full | prone | `Exit`, `Crawlable` | walk or crawl |
| climb | 0.5 | normal | varied | partial | climb | `Climbable` | climb |
| swim | 0.5 | quiet | varied | none | swim | `Swimmable` | swim |
| fly | 1.5 | varied | varied | none | fly | `Flyable`, `Exit` (open) | fly |
| ride | host's | host's | host's | host's | mounted | host's | (mount slot) |
| drive | host's | host's | host's | host's | sit | host's | (driver slot) |

These are first-cut values; the formal requirements lock them in.
A few notes:

- **`run` shares `walk`'s body-plan requirement.** A bipedal
  organism that walks can also run. Body plan declares `walk`;
  `run` is a state of `walk` capability, not a separate axis. We
  don't need `run` in `BodyPlan.locomotionModes`.
- **`sneak` is a stealth-flavored walk.** Same body-plan
  requirement as `walk`; differs in `noiseLevel` and
  `bodyProfile`. The mode itself is meaningful as data.
- **`crawl` admits two body-plan reqs.** Many bipeds can crawl
  (`requiresBodyPlanMode: walk` accepted as a fallback for crawl);
  some species are obligate crawlers. The `requiresBodyPlanMode`
  field probably needs `string[]` (any-of) for this case. Open
  question.

---

## Layer 2 — Per-mode verb controllers

Each mode is a verb. Each verb is a controller in `obj/command/`.
Each pairs with a YAML view in `mud/cmd/`.

```
mud/cmd/walk.yaml         + obj/command/WalkController.ts
mud/cmd/run.yaml          + obj/command/RunController.ts
mud/cmd/sneak.yaml        + obj/command/SneakController.ts
mud/cmd/crawl.yaml        + obj/command/CrawlController.ts
mud/cmd/climb.yaml        + obj/command/ClimbController.ts
mud/cmd/swim.yaml         + obj/command/SwimController.ts
mud/cmd/fly.yaml          + obj/command/FlyController.ts
mud/cmd/ride.yaml         + obj/command/RideController.ts
mud/cmd/drive.yaml        + obj/command/DriveController.ts
```

Each controller does three things:

1. **Eligibility validators** — verb-level `CommandValidator`s
   gate "can I use this mode right now?" Pulled from the mode's
   `requiresBodyPlanMode` / `requiresPosture` / slot-context. A
   shared `LocomotionApi.canEngage(actor, mode)` lets each
   controller's validator be one line.
2. **Target resolution** — MQL filter for
   `mode.targetTypes`. Walk picks an `Exit`; climb picks a
   `Climbable`; swim picks a `Swimmable`. The verb's direction
   argument selects within the candidate set.
3. **Routing** — for non-passthrough modes, calls
   `actor.traverse(target, mode)`. For passthrough (`ride` /
   `drive`), finds the conveyance host via `Mountable` /
   `Drivable` and calls `host.traverse(target, mode)`.

Most of this is the same shape across controllers. A
`LocomotionControllerBase` carries the boilerplate; each concrete
controller is thin.

### Direction acceptance

Modes vary in which direction sets they accept:

- `walk`, `run`, `sneak`, `crawl` — compass + maybe `up`/`down`
  (stairs).
- `climb` — `up` / `down` plus the climbable target's declared
  axes (a horizontal monkey-bar accepts `'horizontal'`; a vine
  swing accepts whatever the swing's target exit is in compass).
- `swim` — compass + `up` / `down` (3D underwater).
- `fly` — full 3D (compass + up/down + diagonals if zone
  supports).
- `ride` / `drive` — host's declared direction set (a horse on
  open terrain has compass; a car on roads is constrained by the
  road network).

The direction set is partly a property of the mode and partly a
property of the target. Resolved at the controller — the mode says
"these are the directions I'll consider"; the target says "these
are the directions I expose."

---

## Layer 3 — Target mixins

Modes need targets. `walk` consumes regular `Exit`s; the other
modes consume mode-specific targets.

| Mixin | Hosted on | What it declares |
|---|---|---|
| `Climbable` | Stuff (ladder, chain, vine, rough wall, tree) | `climbAxes: string[]` (`['up', 'down']`, `['horizontal']`) and a destination (where `climb up` lands you) |
| `Swimmable` | Stuff or Location (water bodies) | direction set + emergence points |
| `Crawlable` | Stuff or Adornable seam (vent shaft, low tunnel) | size constraints (a fat character may not fit) |
| `Flyable` | Locations / zones | open-air rooms accept fly |

The slate's "synthetic exits vs. pluralism" question (mixin-slate.md
§ "Climbable & locomotion modes") is **resolved**: pluralism. Each
mode's verb resolves against its own target type via the mode's
`targetTypes`. The `Mobile.traverse(target, mode)` signature
generalizes from `(exit, mode)` to `(target: Stuff, mode:
LocomotionMode)`; an `Exit` is one of many target shapes.

### Target / mode validation examples

The user-facing examples that drove this design:

- **"climb a ladder"** — ladder is `Climbable`, `climbAxes: ['up',
  'down']`. ✓
- **"climb a chain"** — chain is `Climbable`. ✓
- **"climb a board"** — board is not `Climbable`. ✗
  ("There's no climbable surface on the board.")
- **"climb a lake"** — lake is `Swimmable`, not `Climbable`. ✗
  ("You'd need to swim that, not climb.")
- **"swim a board"** — board is not `Swimmable`. ✗
- **"climb up"** — direction is in the climbable target's
  `climbAxes`. ✓ (where the climb target is the resolved
  default, e.g. the room's only Climbable.)

Each rejection is a per-validator message, not a generic
"can't do that there."

---

## Layer 4 — `LocomotionApi`

Cross-cutting helpers; static class ending with
`SecurityApi.decorateApiClass(LocomotionApi)` per the API pattern.

- `LocomotionApi.modeOf(modePath)` — singleton resolve.
- `LocomotionApi.canEngage(actor, mode)` — runs the three
  eligibility layers (body-plan + posture + slot-context). Used by
  verb-level validators.
- `LocomotionApi.canTraverse(actor, target, mode)` — `canEngage`
  plus target compatibility.
- `LocomotionApi.engagedMode(actor)` — the actor's currently
  engaged mode (see § "Mode lifecycle"). Null when not engaged
  in a sustained mode.
- `LocomotionApi.emissionAt(mover)` — current mode's emission
  data, walking through passthrough chains. A rider's emission is
  the horse's; the horse's emission is `walk`'s. Returns the
  resolved non-passthrough mode + amplification from host
  attributes (e.g., a steel-shod horse is louder than barefoot).
- `LocomotionApi.eligibleModes(actor)` — the set of modes the
  actor could engage right now. Convenience for UI / help text.

---

## Layer 5 — Consumers

The four features the user named, expressed against the substrate:

### Traps

A `Trap` mixin on Stuff in a location (or as an Adornment of a
seam). The trap subsystem hooks the `MotionEvent` emitted from
`Mobile.traverse` and asks: *given this mover and the resolved
mode, do I trigger?*

Each trap type is a different mixin or a different
`triggerCondition` predicate. The predicate reads mode properties:

- **Pressure plate** — `mode.groundContact !== 'none'`. Crawlers
  trigger; flyers don't. Sneakers do (full ground contact even
  when crouched). Bypassing requires fly mode or sufficient
  weight reduction (separate weight check).
- **Tripwire (ankle height)** — `mode.bodyProfile === 'upright'`.
  Walkers, runners, sneakers trip. Crawlers go under
  (`'prone'`). Climbers / fliers (`'varied'`) miss it.
- **Pit trap** — same as pressure plate.
- **Snare (calf)** — `mode.bodyProfile === 'upright' &&
  mode.groundContact === 'full'`. Catches walkers; misses
  climbers, fliers, crawlers.
- **Magic glyph** — mode-independent. Triggers on any
  `MotionEvent.into`.

For passthrough modes (rider, driver), the trap walks up the
conveyance chain and reads the *non-passthrough* mode. A rider on
a horse trips a tripwire because the *horse* is `walk` /
`upright`; the rider's `ride` mode is passthrough. Same logic
catches the driven car.

The trap subsystem is small once the substrate exists: ~30 lines +
per-trap-type controllers. The mode singleton is the source of
truth for predicates; new trap types compose; new modes get
honest trap interaction free if their property values are honest.

### Pathfinding

Pathfinder operates on a graph of `(location, target, mode)`
edges. Per edge:

- **Reachability** — actor's body plan supports
  `mode.requiresBodyPlanMode`; target's type matches
  `mode.targetTypes`.
- **Cost** — `mode.costMultiplier × edgeBaseCost`. Sneaking
  cross-country is slow; the pathfinder accepts that as the cost
  of stealth.
- **Mode transitions** — switching mid-path is allowed; the path
  is a list of `(target, mode)` pairs and the player executes
  them in sequence. Some transitions need preconditions (drive →
  walk requires getting out of the car); the pathfinder accounts
  for those as zero-distance "transition edges."

The pathfinder takes a *cost function*, not a fixed metric, which
lets stealth-aware planning work without redesigning the graph: a
20-room sneaky route costs more in time but might be the only
path with `cost(noiseLevel = silent)` low enough to avoid
detection.

### Detection

Mover emits a signal; observer compares against a threshold. Same
shape as `LightApi.canSee` — viewer-aware, modulated by distance /
obstruction / acuity:

```
PerceptionApi.canHear(viewer, mover) =
  emissionLevel(mover.engagedMode, mover) ≥
    hearingThreshold(viewer, distance, obstruction)
```

Mode contributes the *emission level*: `noiseLevel` plus a derived
`motionVisibility` (running creates motion visible at distance,
sneaking does not). Distance / walls / ambient noise adjust
further. The viewer's species `hearingProfile` (a parallel to
`visionProfile` from race.md, not yet shipped) sets the threshold.

The `MotionEvent` payload carries the mode, so observers in nearby
rooms get a hook fire and decide to react. *"You hear hoofbeats
from the east"* falls out: hoofbeats = `ride` mode + horse host =
appropriate motion-emit text. The Mml/scene composer reads the
event and renders.

Per-mover dampers compose naturally — a `MutedFootsteps` shadow on
the actor's mode lookup, or a `Stealthing` status that downgrades
whatever the actor's mode would emit.

### Validation

Three layers, all mode-property reads. Already partially covered
under § "Verb controllers"; restated here for the consumer view:

- **Body-plan eligibility** — `mode.requiresBodyPlanMode` ∈
  `actor.species.bodyPlan.locomotionModes`. A peace lily can't
  walk; a fish swims but doesn't walk.
- **Posture eligibility** — `actor.posture` ∈
  `mode.requiresPosture`. Sitting in a chair, you can't walk
  until you stand up.
- **Target compatibility** — target's type ∈ `mode.targetTypes`.
  Climb up the *ladder* (`Climbable` ✓); climb up the *board*
  (✗); climb up the *lake* (Swimmable, not Climbable ✗); swim
  into the lake (`Swimmable` ✓).

Each rejection ships its own message. "Can't" generic-rejection is
an anti-pattern for player-facing prose.

---

## Mode lifecycle — engaged vs. transient

Two questions about what "current mode" means:

a. **Posture is the projection.** `posture: 'climb' | 'prone' |
   'mounted' | 'swim' | 'fly' | 'stand' | 'sit' | 'lie'` and the
   mode is *inferred* from posture. Mode is otherwise transient,
   only set during a traversal.
b. **Mode is its own persistent state.** `actor.engagedMode:
   SingleRef<LocomotionMode> | null` — independent of posture.
   `posture` and `engagedMode` move together by convention but
   aren't the same field.

Lean **(a)** for v1: simpler, fewer fields, derives cleanly.
Counter-example: posture `'crouched'` for non-locomotion reasons
(using a low workbench) without engaging `sneak` mode. If that
case matters, switch to (b). Probably doesn't matter in v1.

Persistent vs. transient examples:

- **Walking from room to room** — engaged only during traversal,
  posture stays `'stand'` between rooms.
- **Halfway up a ladder** — engaged in `climb` *between*
  traversals (you're hanging on the ladder); posture is
  `'climb'`.
- **Mounted on a horse, horse standing still** — engaged in
  `ride` (passthrough); posture is `'mounted'`.
- **Sitting in a parked car** — engaged in `drive` only when the
  car is *being driven*. Just sitting in a parked car, posture is
  `'sit'`, not engaged.

The pattern: **modes engage when the body is committed to that
mode** (climb, swim, ride, drive while moving), not just when
traversing.

---

## What this resolves vs. what's still open

Resolved by this slate:

- **Mode is the verb** (mode-as-verb is locked in).
- **Synthetic exits vs. pluralism** — pluralism. Each mode resolves
  against its own target type.
- **Where mode data lives** — singleton Idea per mode, not enum
  cases or class hierarchy.
- **Conveyance ripple** for passthrough modes — passthrough
  resolves to host's mode for emission and trap purposes.

Still open (carried into the open-questions list):

- Engaged-mode persistence shape (a vs b above).
- `requiresBodyPlanMode` cardinality (`string` vs `string[]`).
- Direction-set composition (mode-side vs. target-side merge
  rule).
- The cost function shape for pathfinding (single scalar, weighted
  multi-axis, custom predicate).
- Whether `run` is a separate mode or a state of `walk` (and
  similar for `sprint`, `tiptoe`, `stalk`, `march`).

---

## Open questions

Ordered by what most needs an answer before formal requirements:

1. **Engaged-mode shape — posture-projection (a) or
   independent-state (b)?** (Layer 1 / lifecycle.) Lean (a) for v1.
2. **`requiresBodyPlanMode` cardinality** — `string` (single
   required mode) or `string[]` (any-of)? Crawl is the forcing
   case. Lean `string[]`.
3. **Run is a mode, or a flag on walk?** Same body-plan
   requirement as walk. Cleanest answer: separate verb (`run
   west`), separate `LocomotionMode` singleton with shared
   `requiresBodyPlanMode = 'walk'`. But once we accept that, do
   `tiptoe`, `march`, `stalk` get the same treatment? They're all
   walk-flavored.
4. **Direction-set composition** — when a mode declares a set
   (`compass + up/down`) and the target declares a set
   (`['up', 'down']` for a ladder), what's the merge rule? The
   intersection? The target wins? The mode wins? Lean
   intersection (you can use a direction iff both mode and target
   accept it).
5. **Run / sneak / crawl as `walk`-derived** — should the
   `LocomotionMode` schema have an `extends` field for shared
   property defaults? E.g., `sneak` extends `walk` with overrides
   for noise / profile / posture / cost. Cleaner than restating
   every property; risk is template-hierarchy complexity.
6. **Pathfinder cost-function shape** — single scalar (time),
   weighted multi-axis (time + risk + visibility), or custom
   predicate per query? Real cost-function design happens with
   pathfinder, but the mode's `costMultiplier` is the single
   scalar today — extensible to multiple if needed.
7. **`Climbable` direction declarations** — `climbAxes: string[]`
   shape (lean), or richer (each axis carries a destination ref
   for "where does climb up land you")? Probably richer, since a
   ladder needs to point at the room above.
8. **Passthrough mode emission amplification** — does a steel-shod
   horse emit louder hoofbeats than a barefoot one? If yes, where
   does that data live — on the horse's species? On the
   horse-shoes (Wearable)? On a per-host emission modifier?
   Probably worth a per-host `emissionModifier` mixin in v2; not
   in v1 scope.
9. **Direction vocabulary for `fly`** — full 3D (compass +
   up/down + 3D diagonals)? Just compass + up/down? Most rooms
   are 2D. Open-air zones (Spherical zones?) get the full set.
   Defer to per-zone declaration.
10. **Verb-vocabulary lock-in** — `walk` / `run` / `sneak` /
    `crawl` / `climb` / `swim` / `fly` / `ride` / `drive`. Plus
    aliases via `AliasMixin` (`go` → `walk`?).
11. **Trap subsystem ownership** — does trap design live in this
    slate, or get a separate trap-slate that depends on this one?
    Lean separate trap-slate; the consumer here is just "traps
    read mode properties," not "design the whole trap system."
12. **Pathfinder ownership** — same question. Lean separate
    pathfinder-slate. The consumer here is "pathfinder reads mode
    cost + reachability."

---

## Build order (proposed)

Three waves; the substrate has to land before consumers can be
honest.

**Wave 1** — substrate.

- `LocomotionMode` Idea + property schema.
- `/lib/locomotion/walk`, `/run`, `/climb`, `/swim` template
  singletons. (`sneak`, `crawl`, `fly` follow once the schema is
  proven.)
- `LocomotionApi` shape (`modeOf`, `canEngage`, `canTraverse`).
- `Mobile.traverse(target, mode)` signature generalized from
  `(exit, mode)`.

**Wave 2** — verbs + targets.

- `WalkController`, `ClimbController`, `SwimController` first.
  These prove the verb-controller pattern.
- `Climbable`, `Swimmable` mixins; first content (a ladder, a
  pond).
- `RideController` / `DriveController` once embodiment slate's
  `Mountable` / `Drivable` land.
- `sneak`, `crawl`, `run`, `fly` verbs as content needs them.

**Wave 3** — consumers.

- Trap subsystem (separate slate; reads `LocomotionMode` data).
- Pathfinder (separate slate; reads `costMultiplier` +
  reachability).
- Detection wiring into `PerceptionApi` (extends existing
  perception subsystem with auditory + motion channels).

---

## What this slate does NOT cover

- **Trap subsystem design.** This slate names the consumer
  interface (traps read mode properties). Trap mixins, trigger
  taxonomy, disarm verbs, and so on belong in a future
  trap-slate.
- **Pathfinder algorithm.** The cost function shape is touched
  here; the algorithm (Dijkstra / A* / weighted BFS), the seed
  geometry, and the pathfinder's UI surface are pathfinder-slate
  territory.
- **Encumbrance / fatigue / stamina.** Modes have `costMultiplier`
  for pathfinding cost in time; they don't drive a stamina meter.
  Stamina is game-layer.
- **Combat-relevant locomotion** (charge, retreat, parry-shift).
  Not physics-layer; combat-slate territory.
- **Mounted-combat shape changes.** A rider holding a lance vs.
  a rider holding nothing isn't a locomotion concern; it's a
  Wearable / Wieldable + slot-occupancy concern from the
  embodiment slate.
- **NPC behavior layer** that decides which verb-mode to invoke.
  This slate provides the substrate; behavior trees / scripted
  routines live elsewhere.

---

## Sample compositions

For sanity-checking. Per-actor + per-target combinations that the
substrate handles cleanly:

- **Human walking through a corridor** — body plan declares
  `walk`; posture `stand`; verb `walk east`; target `Exit` east;
  `Mobile.traverse(exit, walkMode)`. No traps, no detection
  modifiers.
- **Human sneaking past a guard** — body plan declares `walk`;
  posture changes to `crouch`; verb `sneak east`;
  `Mobile.traverse(exit, sneakMode)`; `noiseLevel: silent` means
  the guard's `Sensor` doesn't get a `MotionEvent` notification
  above hearing threshold.
- **Human climbing a ladder up** — ladder is `Climbable`,
  `climbAxes: ['up', 'down']`; verb `climb up`;
  `Mobile.traverse(ladder, climbMode)`; posture engages `climb`,
  persists at the top until next verb. Lands on the room the
  ladder's `Climbable` points at.
- **Frog swimming a pond** — frog body plan declares `swim`;
  pond is `Swimmable`; verb `swim south`;
  `Mobile.traverse(pond, swimMode)`. Frog's species
  `lifecycleState: 'alive'`; mode `noiseLevel: quiet`.
- **Human crawling through a vent** — vent is `Crawlable` (size
  constraint: small enough to fit); body plan declares `walk`
  (allowed by `requiresBodyPlanMode: ['walk', 'crawl']`); verb
  `crawl east`. Posture `prone`. Tripwires miss.
- **Rider on a horse, horse walks** — rider engaged in `ride`
  (passthrough); horse engaged in `walk`. Trap subsystem reads
  horse's `walk` (`bodyProfile: upright`, `groundContact: full`)
  → trips tripwires, triggers pressure plates.
- **Driver in a car, car drives** — driver engaged in `drive`
  (passthrough); car engaged in `walk` ... wait. A car doesn't
  walk. It needs its own mode (`vehicular`?), or a generalization
  of `walk` to "ground-contact wheeled." Actually the cleanest
  shape is the car has its own *engaged mode* on traversal —
  `vehicular` or `wheeled`, with its own emission profile (engine
  noise, road sound). Open question: how many "vehicle modes" do
  we need, or is it one (`wheeled`) with per-vehicle emission
  modifiers? Probably one. Flagged as part of open question #8.

The car case surfaces a real design choice: vehicles need their
own non-passthrough mode that they engage when traversing. The
simplest answer is one shared `vehicular` mode whose emission
properties are amplified by a per-host modifier (engine type,
muffler condition). Doesn't change the substrate; one more
template at `/lib/locomotion/vehicular`.

---

## Cross-references back to the embodiment slate

Three things the embodiment slate references that this slate
finalizes:

- **Posture vocabulary** (embodiment open question #16) — the
  union of `mode.producesPosture` across v1 modes is the
  `Postured` v1 set: `'stand'`, `'run'`, `'crouch'`, `'prone'`,
  `'climb'`, `'swim'`, `'fly'`, `'mounted'`, `'sit'`. Plus
  `'lie'` and `'kneel'` from non-locomotion postures.
- **Verb vocabulary** (embodiment open question #12, locomotion
  open question #10) — locomotion verb set settles here.
- **Mountable / Drivable controller-slot routing** (embodiment
  Layer 3) — the verb (`ride` / `drive`) is the routing answer;
  no `controlling: boolean` flag needed on slots.

---

## Once shaped into formal requirements

This slate boils down to:

- The `LocomotionMode` Idea + `/lib/locomotion/<mode>` template
  set (with property values).
- The per-mode verb controllers (with eligibility validators).
- The target mixins (`Climbable`, `Swimmable`, `Crawlable`,
  `Flyable`).
- `LocomotionApi` shape.
- The generalization of `Mobile.traverse(exit, mode)` to
  `Mobile.traverse(target, mode)`.
- Tests gating per-mode acceptance (each verb works with its
  target type, fails with the wrong type, respects body-plan and
  posture eligibility).

The trap subsystem and pathfinder come in their own slates. This
slate's deliverable is the substrate they consume.
