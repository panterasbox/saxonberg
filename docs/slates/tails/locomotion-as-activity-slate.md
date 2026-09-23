# Locomotion as activity (working slate)

> **Status: PARTIAL** — `sneak` shipped via the concealment build
> ([locomotion.md § The care↔speed axis](../../subsystems/locomotion.md));
> the vehicular half and the duration source shipped as the transport
> pack's Journey over `Exit.edgeMinutes × 1/speed`
> ([locomotion.md § Duration lives in the Journey](../../subsystems/locomotion.md),
> [logistics.md](../../subsystems/logistics.md)); the `Exit` sync getter
> and the trap hook exist. Pedestrian movement is still synchronous and
> nothing below is built; the framework has live consumers to copy — see
> [host-slot-activities-slate](./host-slot-activities-slate.md)'s audit.
> **Left:** the durative `TraverseActivity` promotion (mode-name as
> engagement type) · the sync/async split (`Mobile.traverseSync` +
> `TraverseActivity.beginFor`) · the `engagedMode` storage migration onto
> `EngagedMixin` · the three retirements (`engageAround` ·
> `traverseWithDefault` · `isTransientEngagement`, and the CLAUDE.md
> antipattern-table edit they force) · the per-mode controller refactor to
> the shared `beginFor` shape · `crawl`, if still wanted · Q1–Q5 (the
> replacement set · cancel prose · the NPC-AI initiator · footstep
> emissions · the restart lifecycle)
> **Size:** a wave

> **⚠ AUDIT 2026-08-08 — partial delivery.** Checked against the tree when
> GitLab #10 was closed here.
>
> - ❌ **`crawl` did not ship.** No `crawl.yaml`, no crawl mode anywhere.
>   **Open question before anyone builds it:** is it still wanted, given
>   `sneak` plus [posture.md](../../subsystems/posture.md) may cover
>   between them what it was for?
> - ❌ **The durative promotion did not happen.** `engageAround` is live at
>   `api/locomotion.ts:299` and `traverseWithDefault` is referenced at
>   :124 — and note that **both are still the *recommended* API in
>   `CLAUDE.md`'s antipattern table.** So the three retirements this slate
>   proposes are a change to *documented guidance* as well as to code, and
>   whoever does it owns that edit too.

Working slate for promoting movement verbs (walk, run, sneak,
crawl, climb, swim, fly, ride) from synchronous instant-commit
controllers into durative engagements on the activity framework.

The activity framework substrate is already shipped — see
[docs/subsystems/activity.md](../../subsystems/activity.md). What this
slate sketches is the **consumer side**: what locomotion looks like
when it earns a slot in the engagement framework, and the
infrastructure changes that decision pulls along.

> *The vehicular half shipped — the transport pack's Journey
> ([logistics.md § The Journey](../../subsystems/logistics.md)); the split
> it settled (pedestrian movement stays synchronous, and why) is
> [locomotion.md § Duration lives in the Journey](../../subsystems/locomotion.md).*

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

*The sync cached-destination getter exists: `Exit.getDestination()`
throws when the destination is not loaded —
[boundary.md § Lazy Exit destination resolution](../../subsystems/boundary.md).*

---

## Duration source — time-based, not distance-based

*Superseded by the code. The principle held — time, not distance; no
`Exit.length` — but the fields did not: duration shipped as
`Exit.edgeMinutes` (game minutes, authored per EDGE, default
`transport.defaultEdgeMinutes`, read by nothing in the kernel) ×
`1/LocomotionMode.speed` (a relative multiplier vs walk — walk 1.0 · run
2.0 · sneak 0.5 — not m/s) × load factor, spent by the transport pack's
Journey. No `defaultDurationMs`, no `durationOverrideMs`, no m/s speeds.
[locomotion.md § Duration lives in the Journey](../../subsystems/locomotion.md)
· [logistics.md § The metronome and the score](../../subsystems/logistics.md).*

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
`/platform/idea/LocomotionMode/sneak` and `/platform/idea/LocomotionMode/crawl` with the
field values in the duration table above. Sneak uses the
walk-body (`requiresBodyPlanMode: ['walk']`), crawl too;
`noiseLevel: 'silent'` for sneak / `'quiet'` for crawl;
`bodyProfile: 'crouched'` / `'prone'` respectively. Adding these
modes doesn't *require* the activity refactor — they could ship
as instant verbs today — but they're the natural occasion to
bundle the refactor.

---

## Trap subsystem hook

*Superseded by the code — traps shipped and fire inside `Mobile.traverse`
at the post-move `onEntered` site (the scan over destination · deployed
hazards · the exit itself), not on an activity's `onComplete`:
[hazard.md § `Trap` + the trigger hook](../../subsystems/hazard.md). A
future `TraverseActivity` inherits it through `traverseSync` for free.*

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
- **NPC AI** — its own subsystem; uses `TraverseActivity.beginFor`
  when it ships.

## Once shaped into formal requirements

This slate boils down to:

- `TraverseActivity` class registered under each mode name.
- `TraverseActivity.beginFor` async static factory as the
  canonical traversal initiator.
- `Mobile.traverseSync(exit, mode): void` sibling alongside the
  unchanged async `Mobile.traverse`.
- *(the `Exit` sync getter exists; `defaultDurationMs` /
  `durationOverrideMs` are superseded by `Exit.edgeMinutes × 1/speed` —
  see § Duration source above)*
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
