# Activity slate (working doc)

Working slate for the activity layer — the framework that turns
durative verbs (walk, climb, read, forge, mount) into things-in-
progress that can be observed mid-execution, interrupted, and run
concurrently when their engagement allows.

This slate replaces the implicit "every verb is atomic" assumption
that runs through the existing locomotion + embodiment slates.
It's foundational enough that getting it right matters more than
fitting it into a paragraph in another slate.

See also:

- [docs/runtime-model.md](../runtime-model.md) — Node.js event
  loop, timing precision, wire transmission, multi-client reality,
  isolation tradeoffs. This slate consumes that reference; the
  decisions here are constrained by the runtime constraints there.
- [docs/slates/locomotion-slate.md](./locomotion-slate.md) — verb-as-mode
  dispatch; `Mobile.traverse(target, mode)` becomes the
  *resolution* of a `TraverseActivity`, not the verb's primary
  action.
- [docs/subsystems/slot.md](../subsystems/slot.md),
  [posture.md](../subsystems/posture.md) — slot substrate. Slot
  occupancy and posture changes commit at activity *completion*,
  not start.
- [docs/adjoining-systems.md](../adjoining-systems.md) — this slate
  graduates entry #1 ("Time and sustained actions") into its own
  document.

---

## Principle

Three claims this slate makes:

1. **Verbs that have duration become activities.** A command
   handler runs synchronously and either completes the verb (if
   instant) or starts an activity (if durative). The activity
   runs over time on its own scheduler timer; the command handler
   returns immediately so the connection is ready for the next
   command.
2. **Activities don't block command processing.** A player with an
   in-flight activity can still type new commands. Whether the
   new command runs depends on its compatibility with the current
   activity, not on whether the activity has completed.
3. **Activity completion is a transaction boundary.** The
   completion handler runs synchronously, re-validates
   preconditions, and commits all of the activity's mutations
   atomically. Aborts roll back to pre-activity state without
   touching anything.

These three together turn "atomic-verb" into a property of the
*completion handler*, not of the command handler.

---

## The three time concerns

Easy to conflate; the framework distinguishes them:

| Concern | Example | Mechanism |
|---|---|---|
| **Per-traversal duration** | A single `walk west` takes 4 seconds | `TraverseActivity` runs for `mode.speed × baseDuration` |
| **Sustained mode engagement** | Halfway up a ladder, posture `'climb'`, between traversals | Engaged-mode (locomotion-slate `lifecycle`) |
| **Long-form activity** | Reading a book, brewing a potion, building a wall | Activity framework, same shape as traversal |

The first and third share the framework — they're both `Activity`
instances. The second is a piece of state on the actor that
persists between activities.

A **traversal** is "I'm engaged in walking from here to there for
the duration of one move." A **sustained mode** is "I'm hanging
on the ladder, between traversal moves, in `climb` posture." Both
exist; they don't conflict.

---

## The Activity framework

### Interface

```ts
interface Activity {
  // Identity
  type: string;                    // 'walk', 'read', 'forge', 'mount'
  actor: Stuff & Agent;
  label: string;                   // 'walking west', 'reading "A Brief History"'

  // Time
  startedAt: Timestamp;            // wall-clock; serializable for client
  duration: number | 'sustained';  // ms; 'sustained' = no auto-completion

  // Concurrency
  engagement: Set<EngagementSlot>; // which actor slots are occupied
  replaceableBy: string[];         // activity types that can preempt this
  interruptibleBy: AbortReason[];  // what events can abort this

  // Lifecycle
  onComplete(): void;              // synchronous; re-validates + commits
  onAbort(reason: AbortReason): void;  // cleanup
  onTick?(elapsed: number): void;  // optional periodic side effects
}
```

`type` is the canonical key for cancel-targeting and replaceable
match. `label` is for UI ("you cancel walking west"). `engagement`
drives concurrency. `replaceableBy` and `interruptibleBy` are
per-activity policy.

### Lifecycle

```
[command handler]
  start TraverseActivity
    register on engagement slots
    schedule completion timer (setTimeout for `duration`)
    send "you begin <activity.label>" to client
    return — connection ready for next command

[scheduler tick — `duration` ms later]
  fire onComplete
    re-validate preconditions
    if invalid → call onAbort('preconditions-changed') instead
    if valid → execute mutations synchronously
              send arrival/result messages to all relevant clients

[any time before completion]
  if abort triggered → call onAbort(reason)
                       send abort message to client
                       deregister from engagement slots
```

The completion handler is **synchronous** by convention. No
`await`s. This gives it the implicit-transaction semantics: while
it runs, no other JS code can interleave (per the runtime model);
either every mutation in the body runs, or none of them do because
of an exception.

### Watchdog discipline

Every `onComplete`, `onAbort`, and `onTick` runs inside the
dispatch try/catch (see runtime-model). An exception inside any
of them is logged, the player is notified ("something went wrong
with that action"), and the activity is forced into the abort
state. The server keeps running.

---

## Mid-traversal state

Where is the actor while their `TraverseActivity` is running?

Three defensible answers; the v1 choice:

- **(a) Still in the source room.** ✓ Lean.
- (b) Already in the destination room (optimistic completion).
- (c) In a transitional / boundary state.

(a) composes with everything we have:

- Detection of a sneaker in the corridor — the corridor IS the
  source room; the sneaker is still there with `engagedActivity =
  TraverseActivity(...)`. Observers in the source room can detect
  the activity-in-progress.
- Interruption — the actor abort-resolves to where they already
  are. No partial-position rollback needed.
- Slot semantics — old slot still occupied, new slot still empty.
  Commit happens at completion.

The implication: **rooms aren't always corridors-as-rooms.** A
long corridor might be a single Stuff with a long traverse
duration (4 seconds for a 100ft corridor), or it might be a chain
of three rooms each with a short traverse (4 × 1-second moves).
The author chooses based on what events should fire mid-corridor;
the framework doesn't dictate.

For long-corridor-as-single-Stuff, mid-corridor traps need either
(i) chunking the corridor into sub-rooms, or (ii) attaching trap
evaluation to activity ticks. (i) is simpler; (ii) is an option
the framework allows but doesn't require.

---

## Engagement slots — concurrent activities

The user can read while walking. They can't climb while reading
(climb takes attention). The framework expresses this with
**engagement slots** on the actor — parallel to slot occupancy
on hosts, but for "what part of the actor is engaged."

### Vocabulary

| Slot | Engaged by |
|---|---|
| `body` | locomotion, posture changes, mounting |
| `hands` | climbing, fine manipulation, multi-handed verbs |
| `attention` | reading, casting, observing intently, climbing |
| `voice` | sustained song, chant (instant `say` doesn't engage) |

v1 vocabulary; expand if a content case demands a finer
distinction. (Possible additions: `eyes` separate from
`attention`; `posture-lock` for "can't change posture during
this.")

### Each Activity declares its engagement set

```
walk      → { body }
sneak     → { body }
crawl     → { body }
climb     → { body, hands, attention }
swim      → { body }
fly       → { body }
ride      → { body }                    // passthrough; horse engages its own
drive     → { body }                    // passthrough; car engages itself
mount     → { body }
read      → { attention }
listen-for → { attention }
forge     → { body, hands, attention }
sustained-song → { voice }
```

### The concurrency rule

Two activities can co-occupy iff their engagement sets are
disjoint:

- `walk + read` — `body` ∩ `attention` = ∅. Compatible.
- `walk + listen-for-rumors` — disjoint. Compatible.
- `walk + climb` — both want `body`. Conflict.
- `read + climb` — both want `attention`. Conflict.
- `walk + chant` — body vs voice. Compatible.
- `forge + walk` — both want `body`. Conflict.

### Actor state

```ts
actor.engagedActivities: Map<EngagementSlot, Activity>
```

Each engagement slot maps to at most one activity. An activity
that engages multiple slots populates each.

### Starting a new activity — three outcomes

```ts
function start(newActivity: Activity, actor: Actor): Result {
  const conflicts = newActivity.engagement
    .filter(slot => actor.engagedActivities.has(slot))
    .map(slot => actor.engagedActivities.get(slot));

  if (conflicts.length === 0) {
    register(newActivity);
    return 'started';
  }

  // All conflicting activities allow replacement by this type?
  if (conflicts.every(a => a.replaceableBy.includes(newActivity.type))) {
    conflicts.forEach(a => abort(a, 'replaced'));
    register(newActivity);
    return 'replaced';
  }

  return reject('You are already <activity.label>; cancel first.');
}
```

### Replaceability

Activity authors opt in per-type. Walking opt-ins to `walk`
replacing `walk` (changing direction mid-walk is a natural
intent). Reading does NOT opt-in to `read` replacing `read`
(typing `read book` while reading shouldn't restart). Mounting
does not opt-in to anything.

Defaults are intentional: most activities don't allow replace.
When in doubt, reject and require explicit cancel.

---

## Cancel semantics

### `cancel` (no argument)

Cancels every in-flight activity for the actor. Each one's
`onAbort` runs. Loud, predictable, the panic button.

### `cancel <type>` — targeted

`cancel reading`, `cancel walking`, `cancel climb`. Aborts the
named activity only; leaves others running.

The activity's `type` field is the canonical key. If two
activities of the same type ever run concurrently (rare given the
engagement-slot rule, but possible — `listen-for` against two
different signals?), MQL-style label disambiguation handles them:
`cancel listen-for rumors` vs `cancel listen-for footsteps`.

### `cancel` is a verb, instant

`cancel` itself is an instant verb — it doesn't engage any slots,
runs synchronously, and operates on the actor's
`engagedActivities` map. It's always available regardless of
what's in flight.

### Per-activity cleanup

`onAbort` runs cleanup. Per-activity:

- `walk.onAbort` — actor stays in source room. No-op cleanup; no
  mutations had committed.
- `read.onAbort` — bookmark current page (or not — see open
  question on book design).
- `forge.onAbort` — abandon half-finished sword. Materials might
  be lost or recoverable; per-recipe.
- `mount.onAbort` — slot stayed empty; posture stayed `'stand'`.
  No-op.

Cleanup is the activity author's responsibility. Framework just
calls `onAbort`.

---

## Interruption taxonomy

`AbortReason` — what triggers an abort. Each activity declares
which reasons can interrupt it via `interruptibleBy`.

```ts
type AbortReason =
  | 'cancelled'                  // player explicit cancel
  | 'replaced'                   // another activity preempted
  | 'preconditions-changed'      // re-validation failed at completion
  | 'combat'                     // adjacent actor attacked you
  | 'social-interrupt'           // direct prose at you; per-activity opt-in
  | 'environmental'              // earthquake, lightning, flash, etc.
  | 'posture-changed'            // knocked down, stunned, polymorphed, slept
  | 'host-destroyed'             // the ladder you were climbing got destroyed
  | 'restart'                    // server restart (no resume in v1)
;
```

Most activities accept `cancelled`, `combat`, `posture-changed`,
`host-destroyed`, `restart`. `social-interrupt` is opt-in: a
`MountActivity` ignores it (a player yelling "hey!" doesn't stop
mounting); a `ReadActivity` may accept it (if you tap on the
reader's shoulder, they look up).

`environmental` is mostly for setpiece events. Default reject.

Activities should be honest about what should interrupt them. The
list is short; opt-in is per-activity.

---

## Transaction-style validation

The completion handler is the transaction boundary. The body of
`onComplete`:

1. **Re-validate preconditions** — slot still available, target
   still reachable, actor still where they were when activity
   started, mode still eligible.
2. **If anything's changed** → throw or call `onAbort('preconditions-changed')`.
3. **Otherwise** → execute mutations synchronously.
4. **Send messages** — to the actor, to other affected clients.

No `await` between steps 1 and 4. Synchronous body, atomic from
the JS thread's perspective.

This is the activity-equivalent of the runtime-model's
"synchronous-code-block-is-an-implicit-transaction" property. The
activity is essentially a deferred, scheduled mutation; when its
timer fires, the mutation either applies cleanly or fails
cleanly.

### Cross-activity atomicity: out of scope for v1

If two activities resolve at the same scheduler tick and both
want the same slot, one wins (whichever the scheduler runs
first), the other rejects. Multi-actor coordinated commits (lift
log together) belong in the multi-actor coordination slate
(adjoining-systems #8) and need their own design pass.

### Pre-completion mid-flight validity

An activity scheduled at t=0 to complete at t=4000 sits unattended
in the scheduler. The world might change in that 4 seconds — the
horse you were mounting could be killed. Two policies:

- **Lazy revalidation** — only the completion handler checks; if
  the horse is dead at t=4000, abort. ✓ Lean.
- **Eager revalidation** — periodic ticks check; abort early if
  the world has changed. More responsive but expensive.

Lazy is correct for v1 because most activity preconditions don't
change in flight, and the cost of a 4-second-late abort message
is small. Switch to eager if specific activities benefit (cast a
spell on a target — if target dies mid-cast, fail early to avoid
wasting mana).

---

## What this slate changes for existing slates

### Locomotion slate

`Mobile.traverse(target, mode)` becomes the **resolution** of a
`TraverseActivity`, not the verb's primary action. The verb
starts the activity; the activity calls traverse on completion.
The signature stays; the call site moves.

`mode.speed` becomes load-bearing — it's now a real-time
multiplier on activity duration. Sneak is genuinely 2.5x slower.

Detection during traversal: the `MotionEvent` fires at activity
completion (arrival), but a **continuous emission** mechanism is
also needed for mid-traversal detection. The mode's `noiseLevel`
says "while engaged, emit at this level"; observers integrate
over time. This is per-tick or per-activity; design will fall out
when sound-propagation (#3 in adjoining-systems) is drafted.

Trap timing: traps fire at activity completion (you arrive in the
room, the trap fires). Mid-traversal traps in long corridors
require either chunking the corridor into sub-rooms or attaching
trap-evaluation to activity ticks — the former is simpler.

Pathfinder: cost = sum of mode-duration estimates. ETA is
meaningful. Multi-mode paths sum cleanly.

### Embodiment slate

Slot occupancy changes at activity completion. Mid-mount, the
rider hasn't taken the slot. The slot is "reserved" for the
duration in the sense that no other actor's mount activity can
target the same slot; concretely, this means the start-side check
includes "no in-flight activity targets this slot."

Posture changes also at completion. Mid-mount, your posture is
`'stand'`; the activity *intends* `'mounted'` but only commits on
completion.

The conveyance ripple is unaffected — the host's traversal
completion ripples to slot occupants at completion time, just as
before.

---

## Wire model implications

(Reference: [docs/runtime-model.md](../runtime-model.md).)

Three concrete wire-design decisions:

**1. The `Activity.start` resolution sends the wire message
*before* doing any expensive setup.** "Acknowledge first,
simulate second" minimizes perceived latency. The actual
scheduling, slot reservations, etc. happen synchronously on the
server but after the client's been told "your action is in
flight."

**2. Mid-activity messages are first-class.** Detection events,
periodic ticks, sound emission updates. Plan their cadence
(probably 1-3 per second max for a steady stream, fewer for slow
activities). They're how the player knows the activity is alive.

**3. Progress is a derivable, not a transmitted field.** Don't
send `progress: 0.5` over the wire 50 times during a 5-second
activity. Send `(startedAt, duration)` once in the start message;
let the client compute progress. The server only sends
*unscheduled* mid-activity events (interruptions, detection,
ticks that have side effects).

This trims wire chatter dramatically and makes the client robust
to dropped messages — progress is a function of clock + start
time, not a stream.

---

## Forward compatibility with isolation

(Reference: [docs/runtime-model.md § Isolation
options](../runtime-model.md#isolation-options).)

v1 doesn't put first-party controllers or activities in isolates.
But the `Activity` interface should be **shaped to allow future
isolation** without breaking changes:

- Lifecycle hooks (`onComplete`, `onAbort`, `onTick`) are plain
  functions in v1; they could be replaced with bridge calls to an
  isolate later. The interface stays.
- Activity *state* is plain JS objects with serializable fields;
  could be marshalled across the bridge.
- The scheduler can dispatch hooks via a configurable
  invocation-strategy (sync direct call now; bridge call later).

Concretely: don't shape `Activity` so that the framework holds
direct references to host-only objects in a way that makes
serialization impossible. The host is free to pass *handles* to
isolate code; isolate code uses handles to call back into the
host through the bridge.

This is forward-compatible scaffolding, not isolation today.

---

## Open questions

Ordered by what most needs an answer before formal requirements:

1. **Engagement vocabulary lock-in** — `body`, `hands`,
   `attention`, `voice`. Should `eyes` be separate from
   `attention`? Lean keep simple; split if a counter-example.
2. **Per-activity slowdown when sharing actor** — walk slower
   while reading? Defer; v1 treats concurrent activities as fully
   independent. Flag for v2.
3. **Replaceability defaults** — most activities not replaceable;
   `walk` opt-in to `walk`-replaces-`walk`. Any others where
   replace makes sense?
4. **Scheduler granularity floor** — minimum activity duration?
   Lean 100ms — anything less is noise vs network jitter. Below
   that, just complete synchronously and skip the activity.
5. **Sustained-mode activities (`'sustained'` duration)** — for
   things like "I'm hanging on the ladder, indefinitely." How
   do they end? An explicit verb (`let go` / `dismount` /
   `stand up`) ends the engagement. Probably not the same shape
   as durative activities; they're more like state. Worth
   distinguishing in the framework or folding in?
6. **Pre-completion mid-flight validity** — lazy (lean) vs eager
   revalidation. Per-activity opt-in to eager?
7. **Activity persistence across server restart** — abort all on
   restart (lean), or attempt to resume? Saves state remains
   consistent because nothing committed pre-completion.
8. **Cross-activity coordinated commit** — lift-log-together. Out
   of scope for v1; design in multi-actor coordination
   (adjoining #8).
9. **Mid-activity observability** — what does an observer see of
   a sneaker mid-traversal? "You see Bob moving west through the
   corridor"? Or "you hear footsteps to the west" only? The
   first requires position interpolation. Lean second.
10. **Tick-based vs event-based activity-internal updates** —
    does an activity ever opt into "I want to be ticked every
    100ms" vs "I'll fire updates at specific moments"? Both
    shapes have uses; the framework supports both via the
    optional `onTick` plus the abort/event mechanism.
11. **Reading-as-streaming** — does reading stream content over
    its duration (page-per-tick), or just complete with the
    whole content at the end? Per-content-author choice; the
    framework supports both via `onTick`.
12. **Naming for `cancel`** — verb vocabulary. `cancel` is
    explicit; `stop` is more natural in some contexts; `wait`
    is wrong. Lean `cancel`; ship aliases via `AliasMixin`.
13. **Bookmark-on-abort for read** — the book remembers your
    current page across aborts? Per-book; a bookmark Stuff
    could be the answer. Defer.

---

## Build order (proposed)

**Wave 1** — substrate.

- `Activity` interface + `EngagementSlot` vocabulary.
- `Scheduler` Api owning the active set and time-advancement.
- `LocomotionApi.engagedActivity(actor)` / actor's
  `engagedActivities: Map<slot, activity>`.
- Cancel verb (`CancelController`) + targeted-vs-all logic.
- Dispatch try/catch wrapping every command and activity hook
  (defensive baseline from runtime-model).

**Wave 2** — locomotion integration.

- `TraverseActivity` — proves the framework against the
  locomotion slate's `Mobile.traverse(target, mode)`.
- Per-mode verb controllers updated to start activities instead
  of completing synchronously.
- Mid-traversal detection events (touches sound-propagation
  adjoining slate; coordinate).

**Wave 3** — non-locomotion activities.

- `MountActivity`, `DismountActivity` — slot-occupancy commit at
  completion.
- `ReadActivity` — first non-locomotion activity; proves
  `attention`-engagement.
- Trap-subsystem hook into activity completion (touches trap
  slate when it's drafted).

**Adjacent** — activity-related work in other slates:

- The sound-propagation slate (adjoining #3) consumes mid-
  activity emission.
- The collision slate (adjoining #2) interacts with arrival —
  what if the destination is occupied at completion?
- The recognition slate (adjoining #5) interacts with
  mid-activity observability.

---

## What this slate does NOT cover

- **Combat-specific timing.** Combat may need a tighter tick
  cadence and special interruption rules. Combat-slate territory.
- **Tick-based ambient effects** (weather, decay, NPC behavior).
  These run on their own scheduled cadences using the same
  `setTimeout` scheduler — they're not Activities of an actor.
  Possibly an `AmbientActivity` shape, or just plain scheduled
  jobs. Defer.
- **Specific game-pacing tuning.** Walk should take 2 seconds?
  4? Per-room? Not framework; per-content-author choice.
- **Resumable activities across server restart.** Out of scope;
  abort-on-restart is the v1 policy.
- **The activity observability protocol** — exactly what messages
  are sent to whom on activity start / mid / complete / abort.
  Belongs in the messaging subsystem reference; this slate just
  says it happens.

---

## Once shaped into formal requirements

This slate boils down to:

- The `Activity` interface + `EngagementSlot` set (with v1
  vocabulary).
- The scheduler Api shape.
- The `cancel` verb.
- The dispatch try/catch wrapper.
- Per-activity policy fields: `engagement`, `replaceableBy`,
  `interruptibleBy`.
- The completion-as-transaction-boundary rule, with synchronous
  body convention.
- The mid-traversal-state choice (actor stays in source room).
- The wire-model conventions: derivable progress, server-pushed
  mid-events, ack-first dispatch.
- Tests gating: an activity completes after its duration; a
  cancel mid-flight aborts cleanly; concurrent disjoint-engagement
  activities both run; conflicting activities reject (or replace
  per opt-in); preconditions-changed at completion aborts.

The trap, sound, collision, recognition, and pedagogical slates
all sit downstream of this and consume its hooks.
