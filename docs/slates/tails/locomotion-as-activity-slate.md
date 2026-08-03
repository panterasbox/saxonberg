# Locomotion as activity (working slate)

Working slate for promoting movement verbs (walk, run, sneak,
crawl, climb, swim, fly, ride) from synchronous instant-commit
controllers into durative engagements on the activity framework.

The activity framework substrate is already shipped — see
[docs/subsystems/activity.md](../../subsystems/activity.md). What this
slate sketches is the **consumer side**: what locomotion looks like
when it earns a slot in the engagement framework, and the
infrastructure changes that decision pulls along.

> **⭐ UPDATE 2026-07-31 — the consumer arrived, and it is FREIGHT.**
> [freight-slate § The Journey](../builds/freight-slate.md) is the home
> this slate has been waiting for, and it resolves the deferral without
> reversing it: **pedestrian movement stays synchronous; *vehicular*
> movement becomes durative.** So the responsiveness argument below is
> preserved intact — walking one room is a step, driving a wagon to the
> next town is a journey. Design landed there: a `SustainedEngagement`
> with a per-leg `ScheduledEmission` (respiration's shape, not a
> `DurativeActivity` — a journey's duration is not trustworthy up
> front); **arrival is a completion, not an abort**; the journey
> **issues the same `traverse` a player would** rather than moving
> anything itself; and it takes the **`hands`** slot, which is what
> makes *you cannot drive and fight* — and therefore the escort job —
> fall out of the shipped slot vocabulary.

> **Status: deferred *for pedestrians*.** v1 keeps walking, climbing,
> etc. synchronous and instant. Game responsiveness is a selling point; durative
> movement only earns its slot when content design calls for it
> (sneak as a stealth mechanic with detection windows, climb as a
> skill-check arc with mid-event interrupts, long-corridor
> traversal with mid-traversal observability). This slate
> preserves the design space so the implementer doesn't start
> from scratch.

See also:

- [docs/subsystems/activity.md](../../subsystems/activity.md) — the
  shipped engagement framework substrate. Read this first.
- [docs/subsystems/locomotion.md](../../subsystems/locomotion.md) —
  the shipped mode-and-verb substrate this slate's
  `TraverseActivity` would consume.
- [docs/subsystems/spatial.md](../../subsystems/spatial.md) — the
  current async `Mobile.traverse` contract.
- [docs/design-philosophy.md](../../design-philosophy.md) —
  Principle 2 (model honestly) drives the duration-source
  decision.

---

## When this earns its slot

Three classes of content motivate the switch from instant to
durative locomotion:

1. **Stealth as a mechanic.** Sneak only matters if there's a
   detection window during traversal. An instant commit gives
   observers no chance to notice; durative traversal makes
   sneaking observable mid-corridor.
2. **Skill-check arcs.** Climbing a 100ft cliff isn't a single
   commit — it's a sequence of hold-to-hold moves with failure
   chances, possible mid-event interrupts (rope slips, hold
   crumbles), and continuous risk exposure.
3. **Long-corridor observability.** Following a target through a
   long stretch should let pursuers gain or lose ground; that
   only works if traversal has a measurable duration.

None of these are the v1 game's primary content. When one
becomes primary content, this slate becomes a build.

**Alternative for "long corridor feel":** the activity slate
also surfaces "chunk corridors into sub-rooms." Authors who want
a sense of distance keep traversal instant per-step but break
the corridor into multiple Locations. Cheaper than durative
traversal; available today.

---

## Shape of the integration

`TraverseActivity` becomes a `DurativeActivity` in
`lib/locomotion/`. The actor's body slot holds it during
traversal. On completion, the actor commits the move via a sync
sibling of `Mobile.traverse`.

```ts
class TraverseActivity implements DurativeActivity {
  readonly type: string;        // mode.getName() — 'walk', 'climb', 'sneak'
  readonly actor: Stuff & Engaged & Mobile & Containable;
  readonly exit: Exit;
  readonly mode: LocomotionMode;
  readonly slots = new Set<EngagementSlot>(['body']);
  readonly duration: number;    // exit override or mode default
  readonly replaceableBy = ['walk', 'run', 'sneak', /* … */];
  readonly cancelable = true;

  onComplete(): void {
    if (!this.validateOnCompletion()) {
      SchedulerApi.cancel(this, 'preconditions-changed');
      return;
    }
    this.actor.traverseSync(this.exit, this.mode.getName());
  }
}
```

`Engagement.type` carries the **mode name** (`'walk'` / `'climb'` /
`'sneak'`), not the generic `'traverse'`. This makes
`cancel walking` / `cancel climb` natural at the verb layer
without controller-side aliasing. The activity-class registry
on `SchedulerApi` can register one `TraverseActivity` class
under every mode-name key.

---

## The sync/async traversal split

`Mobile.traverse(exit, mode)` is async today because of three
tails:

- `await exit.resolveDestination()` — rooms are lazy-loaded.
- `await occupant.traverse(...)` — conveyance ripple awaits riders.
- `await this.autoLookOnArrival()` — post-arrival look.

Lazy room loading is core to the world model. `Mobile.traverse`'s
public contract must stay async; any caller that hasn't pre-warmed
the destination cache needs to keep using it.

Activities want sync commit at `onComplete`. The resolution is a
**sibling sync method** with a tighter precondition:

| Method | Contract |
|---|---|
| `Mobile.traverse(exit, mode): Promise<void>` | Unchanged. Async, lazy-loads destination, calls async `autoLookOnArrival`. The public API. |
| `Mobile.traverseSync(exit, mode): void` | New. Reads destination from `Exit`'s sync cached-destination getter; throws if cache is cold. `autoLookOnArrival` is fire-and-forget. Riders traversed via `traverseSync` (the outer call warmed the cache). |

The activity framework's async pre-flight lives on a static
factory:

```ts
class TraverseActivity {
  static async beginFor(
    actor: Stuff & Engaged & Mobile,
    exit: Exit,
    mode: LocomotionMode,
  ): Promise<StartResult> {
    await exit.resolveDestination();   // warm cache
    return SchedulerApi.start(new TraverseActivity(actor, exit, mode));
  }
}
```

`beginFor` is the canonical entry point for **every** initiator
of activity-shaped traversal: per-mode controllers, NPC AI ticks,
trap displacements, scheduled-event handlers. Any caller that
wants the existing async traversal contract (admin teleports,
test fixtures) keeps using `Mobile.traverse` directly. The new
`traverseSync` is an internal escape hatch the activity body
relies on — available, not encouraged.

**Cache eviction during the activity** is rare; if it happens
`traverseSync` throws, the scheduler's watchdog catches and
fires `onAbort('thrown')`. Acceptable failure mode.

The Exit needs a sync cached-destination getter
(`getCachedDestination(): (Stuff & Container) | null` or
equivalent) if it doesn't have one. The resolution cache (the
singleton index) already exists internally; this is exposing a
synchronous accessor.

---

## Duration source — time-based, not distance-based

The world model has **no room-to-room distance**. Rooms are
atomic places with effectively-spaceless boundaries; the
author's intuition is "walking through a typical room feels
like four seconds," not "a typical room is 5.6 meters across."

That kills the dimensionally-honest `length / speed` derivation
an earlier draft proposed. The substrate that fits the model is:

| Where | Field | Units | Role |
|---|---|---|---|
| `LocomotionMode` | `speed` | m/s | **Real gait speed.** Surfaced via `analyze`; consumed by future chase / stamina / pathfinder ETA systems. Does NOT drive duration. |
| `LocomotionMode` | `defaultDurationMs` | ms | Time to cross a typical exit at this gait. Authors set this — they have time intuition. |
| `Exit` | `durationOverrideMs?` | ms | Optional per-exit override for atypical exits (long corridors). Falls through to `mode.defaultDurationMs` when null. |

`TraverseActivity.duration =
exit.getDurationOverrideMs() ?? mode.getDefaultDurationMs()`.

The two-channel split honors
[design-philosophy.md § Principle 2](../../design-philosophy.md):
real measurements stay real (gait speed in m/s, gait cadence in
ms when the sound subsystem ships); fictional measurements
(room-to-room distance) don't get invented to keep a derivation
looking honest.

**Internally-consistent v1 values** for a notional ~5.6m "typical
room" (a curious student can verify the arithmetic):

| Mode | `speed` (m/s) | `defaultDurationMs` (ms) | Notes |
|---|---|---|---|
| walk | 1.4 | 4000 | human walking baseline |
| run | 3.0 | 1900 | human jog/run |
| sneak | 0.6 | 9300 | crouched cautious walk |
| crawl | 0.3 | 18700 | hands-and-knees |
| climb | 0.3 | 18700 | hand-over-hand vertical |
| swim | 1.0 | 5600 | front-crawl stroke |
| fly | 5.0 | 1100 | mid-range body-plan wingbeat |
| ride | 5.0 | 1100 | horse-walk under a rider; passthrough |
| drive | 10.0 | 600 | vehicle-defined |

The framework does NOT enforce the relationship. Authors of new
modes pick `defaultDurationMs` from gameplay feel; the m/s
`speed` is descriptive metadata.

**No `Exit.length` field.** Authors who want a long-corridor case
set `durationOverrideMs` directly in time units, or split the
corridor into multiple Locations.

---

## Migration consequences

The decision to ship locomotion-as-activity pulls a handful of
existing surfaces along with it. None of these need to be
designed-from-scratch; the activity framework already exists, and
the locomotion subsystem already runs.

**`Mobile.engagedMode` storage migrates onto `EngagedMixin`.**
Today `Mobile.getEngagedMode()` reads from a private
`_engagedModePath` field. Once activities own the body slot, the
mode is whatever the body-slot engagement carries:

```ts
getEngagedMode(): LocomotionMode | null {
  const engagement = this.getEngagementBySlot('body');
  // Only TraverseActivity exposes an engaged mode.
  return engagement?.getEngagedMode?.() ?? null;
}
```

`setEngagedMode()` becomes a no-op or deletes entirely; callers
don't set engaged mode directly anymore. `_engagedModePath`
deletes from `Mobile`. The usage today is contained — a couple of
methods on `Mobile`, one test, one jsdoc comment on
`LocomotionMode`.

**`LocomotionApi.engageAround` and `traverseWithDefault` retire.**
They were convenience wrappers for the "engaged-mode is a field;
flip it for the duration of a traverse call" model that the
activity framework replaces. The replacement is
`TraverseActivity.beginFor`. Programmatic teleports keep using
`Mobile.teleport()` (no engaged-mode dance); admin and test code
that wants synchronous one-shot traversal builds a
`TraverseActivity` directly or uses `Mobile.traverse` async.

`LocomotionApi.isTransientEngagement` also retires — engagements
end when the activity completes or aborts, not based on
destination-side mixin composition. Climb-from-face-to-face is a
sequence of activities, each completing; "stays engaged across
moves" is now `replaceableBy: [/* same mode */]` on the next
activity accepting the prior one.

**`LocomotionApi.canTraverseExit`** is unchanged — it's the gate
the controller runs **before** building the activity. Reuse
as-is.

**Per-mode controllers** all refactor to the same shape:

```ts
async execute(model: LocomotionModel, ctx: CommandContext): Promise<void> {
  // existing capability + body-plan + posture + exit + enablement guards
  // (unchanged from today)

  const result = await TraverseActivity.beginFor(actor, exit, mode);

  switch (result.ok) {
    case true:
      switch (result.status) {
        case 'started':
        case 'replaced':
          ctx.note(result.note);
          this.renderBeginProse(actor, mode, exit);
          break;
        case 'completed-sync':
          // sub-100ms; treat as instant
          this.renderCompletionProse(actor, mode, exit);
          break;
      }
      break;
    case false:
      ctx.note({ kind: 'controller-rejected', reason: result.reason, /* … */ });
      // Scene.send rejection prose
      break;
  }
}
```

`LocomotionControllerBase` collects the shared shape. Passthrough
modes (`ride`) construct the `TraverseActivity` for the
conveyance host, not the actor.

**New modes: `sneak` and `crawl`.** Templates at
`/obj/LocomotionMode/sneak` and `/obj/LocomotionMode/crawl` with the
field values in the duration table above. Sneak uses the
walk-body (`requiresBodyPlanMode: ['walk']`), crawl too;
`noiseLevel: 'silent'` for sneak / `'quiet'` for crawl;
`bodyProfile: 'crouched'` / `'prone'` respectively. Adding these
modes doesn't *require* the activity refactor — they could ship
as instant verbs today — but they're the natural occasion to
bundle the refactor.

---

## Trap subsystem hook

The slate calls out trap activation on `TraverseActivity.onComplete`
as an integration point. The trap subsystem is paper today; when
it ships, the integration is one line inside `onComplete`:

```ts
TrapApi.fireOnArrival(this.actor, this.exit.getDestination());
```

The activity framework's lifecycle hooks (start, complete, abort,
emissions) are the only seam traps need. No prior coordination
required.

---

## Open questions

### Q1. Replacement set

Should `TraverseActivity.replaceableBy` include all locomotion
modes, or only modes the actor's body-plan can switch to? Slate
proposes "all locomotion modes" — typing `climb up` while walking
should preempt the walk regardless. The body-plan check happens
at activity construction (the controller's eligibility cascade);
by the time replacement runs, the new activity is valid for the
actor.

### Q2. Cancel-prose default

`cancel walking` mid-walk emits abort-prose via the activity's
`onAbort` — what wording? "You stop walking." is the obvious
default. Controller-rendered or activity-rendered? Recommend
activity-rendered (the scheduler invokes `onAbort` long after
the dispatch finishes, so there's no `CommandContext` in scope
— same situation as completion prose). Wording becomes a
content-author override seat via `EngagedMixin` settings keys if
one author asks for it.

### Q3. NPC-AI initiator pattern

NPC autonomous wander would use
`TraverseActivity.beginFor(npc, exit, mode)` the same as
controllers. The NPC AI subsystem is paper; what it looks like
informs whether `beginFor` is the right entry point or whether
something tighter belongs at the AI layer (priority-aware
preemption, multi-step path queuing). Defer until AI starts.

### Q4. Footstep cadence + emissions

`TraverseActivity.emissions` is empty in v1 of this wave. The
sound subsystem owns:

- `SoundEvent` shape addition to `lib/events.ts`.
- `LocomotionMode.footstepCadenceMs` field (real gait period —
  a property of HOW the actor moves).
- Propagation walk + `noiseLevel` → dB SPL conversion.
- Wiring `TraverseActivity.emissions` to fire `SoundEvent` at
  `mode.footstepCadenceMs` cadence.

Sound is its own slate; coupling the locomotion-as-activity build
to sound is the wrong order. Ship locomotion-as-activity with
empty emissions; sound subsystem plugs in additively when it
arrives.

### Q5. Server-restart lifecycle

In-flight `TraverseActivity` engagements don't survive a server
restart (engagements are runtime-only). On restart, every
mid-traversal actor wakes up in their source room — they didn't
move. That's fine for v1; the eventual fix is a shutdown-lifecycle
pass that aborts engagements with reason `restart` (an
`AbortReasonRegistry` augmentation) and persists in-flight
positions if any content earns it.

---

## What this slate doesn't cover

- **The activity framework itself** — already shipped, see
  [activity.md](../../subsystems/activity.md).
- **Host-slot activities** (mount, sit, lie, drive, read) —
  separate concern, separate slate at
  [host-slot-activities-slate.md](../tails/host-slot-activities-slate.md).
- **Combat-specific timing** — combat slate territory.
- **The sound subsystem** — its own slate; emits no `SoundEvent`
  in this wave.
- **The trap subsystem** — its own slate; integration point
  documented above.
- **NPC AI** — its own subsystem; uses `TraverseActivity.beginFor`
  when it ships.

## Once shaped into formal requirements

This slate boils down to:

- `TraverseActivity` class registered under each mode name.
- `TraverseActivity.beginFor` async static factory as the
  canonical traversal initiator.
- `Mobile.traverseSync(exit, mode): void` sibling alongside the
  unchanged async `Mobile.traverse`.
- `Exit` sync cached-destination getter (if not already present).
- `LocomotionMode.defaultDurationMs: number` field; reauthor
  `speed` as m/s; reauthor all nine modes per the duration table.
- Optional `Exit.durationOverrideMs: number | null` field.
- `Mobile.engagedMode` storage migration onto `EngagedMixin`.
- `LocomotionApi.engageAround` / `traverseWithDefault` /
  `isTransientEngagement` retirement.
- Per-mode controller refactor to the shared `beginFor` shape.
- New `sneak` and `crawl` mode templates.
- Tests gating per-mode acceptance (duration formula, precondition
  revalidation, host-destruction abort, cross-mode replace,
  sub-100ms completed-sync, cancel mid-walk leaves actor in
  source room).

When the build runs, the `cancel <type>` matching semantics
resolution from this slate (mode-name = engagement-type) flows
into the activity registry's per-mode self-registration.
