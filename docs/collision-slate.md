# Collision slate (working doc)

Working slate for collisions, blocking, and pushing — the small
cluster of design questions that sit between locomotion's "can I
move?" and embodiment's "what's where?". The design philosophy
([docs/design-philosophy.md](./design-philosophy.md)) handles the
big tradeoffs (sub-room geometry deferred, layered fidelity); this
slate spells out the v1 mechanics.

The pieces here mostly disperse into existing slates as formal
requirements. This slate is for *reviewing the integration as a
unit* before that disperses.

See also:

- [docs/design-philosophy.md](./design-philosophy.md) — the
  philosophy this slate operates within (bag-of-stuff default,
  opt-in finer fidelity, layered presentation).
- [docs/locomotion-slate.md](./locomotion-slate.md) — block-
  validators extend the locomotion validation chain.
- [docs/embodiment-slate.md](./embodiment-slate.md) — `Pushable`
  fits with other Layer-3 affordance mixins; slot-capacity
  story stays as-designed.
- [docs/activity-slate.md](./activity-slate.md) — `PushActivity`
  is one more concrete activity type with engagement-slot
  semantics.
- [docs/adjoining-systems.md](./adjoining-systems.md) — this
  slate graduates entry #2 ("Collisions, blocking, and pushing").

---

## Principle

Three concerns, decoupled:

1. **Capacity** — when destination has limited room. Per-typed-
   constraint shape; the design philosophy lays out the canonical
   model.
2. **Intentional blocking** — a guard, gatekeeper, or parent
   actively prevents traversal. Verb-level validator pattern;
   third-party intent injected into the locomotion validation
   chain.
3. **Pushing / displacing** — moving objects (or unconscious
   actors) through space. `Pushable` mixin + `PushActivity`.

Conscious-actor shoving is combat-adjacent and deferred. Sub-
room positioning (the guard standing *in* the doorway, requiring
you to go around) is deferred per the design philosophy.

---

## Concern 1 — Capacity

### Containment-scope capacity

The design philosophy specifies the canonical shape: a list of
typed constraints; first-failure wins; framework enforces
uniformly. Empty list = unlimited (default for most rooms).

```yaml
phone-booth.capacities:
  - kind: actor-count
    max: 2
    failureMessage: "The booth is full."

stadium.capacities: []          # unlimited

elevator-car.capacities:
  - kind: actor-count
    max: 8
  - kind: weight
    max: '1500 kg'
```

### Slot capacity

The embodiment slate's "one occupant per slot in v1" stays
unchanged. Slot capacity is its own concern, distinct from
containment-scope capacity.

### Capacity check timing

Capacity checks fire at activity completion (transaction-style
re-validation, per the activity slate). At activity start,
capacity is also checked as a fail-fast — but the activity
slate's "preconditions might change" rule means re-check at
completion.

If destination is full at completion: activity aborts with
"the booth filled up while you were on your way."

---

## Concern 2 — Intentional blocking

### `BlockerBehavior` capability

A Stuff (typically an Agent like a guard) declares it actively
prevents traversal of one or more targets:

```ts
interface BlockerBehavior {
  isBlocking(target: Stuff): boolean;
  blockTargets: Set<Stuff>;            // exits / containers blocked
  blockReason: string;                  // shown on rejection
  unblockCondition?: (actor: Stuff) => boolean;  // who's allowed
}
```

A guard composes `BlockerBehavior`:

```yaml
guard:
  blockTargets: [northGate]
  blockReason: "The guard says, 'state your business.'"
  unblockCondition: hasItem(passportItem)
```

### Block-validator chain

When a player invokes a locomotion verb against a target, the
framework runs:

1. **Actor eligibility validators** (locomotion slate) —
   body-plan, posture, slot-context, target type.
2. **Block validators** (this slate) — for each Stuff in the
   relevant containment scope (the source room, or possibly
   the target room — see open question), if it has
   `BlockerBehavior`, ask whether it's blocking this actor's
   traversal of this target.

First-fail wins; the rejection message is the blocker's
`blockReason` (or a kind-specific message for capacity / other
failures).

```ts
function checkBlockers(actor: Stuff & Agent, target: Stuff): Result<void, string> {
  const room = actor.location;
  for (const occupant of room.contents) {
    if (!hasMixin(occupant, 'BlockerBehavior')) continue;
    if (!occupant.isBlocking(target)) continue;
    if (occupant.unblockCondition?.(actor)) continue;
    return Result.err(occupant.blockReason);
  }
  return Result.ok();
}
```

### Multi-blocker UX

Three guards each refuse for different reasons. Render the first
relevant rejection plus a count of others:

> *The guard says, "state your business." (2 others also refuse
> to let you pass.)*

Authors can override per-blocker; default is first-fail-with-
suffix.

### Block timing — both at start and at completion

Block-validators participate in both initial and completion-
time validation, per the activity slate's transaction-style
re-check rule. The activity's `onComplete` re-checks; if a
block now applies, the activity aborts cleanly.

This catches "the guard arrived during your walk" cases.

### Per-actor exception lists

A guard who lets you through after seeing your passport should
remember tomorrow. The `unblockCondition` is a runtime predicate
that may consult NPC memory:

```ts
guard.unblockCondition = (actor) => {
  return guard.hasGreenlit(actor)        // memory store lookup
      || actor.hasItem(passportItem);
};
```

NPC memory (#7 in adjoining-systems) is the storage; the
predicate just consults it.

---

## Concern 3 — Pushing

### `Pushable` mixin

A Stuff that can be physically moved by an actor:

```ts
interface Pushable {
  mass: Quantity<kg>;             // resistance to motion
  pushDifficulty: number;         // 0 = trivial, 1 = max effort
  // Conveyance: same shape as Mountable's "host's targets"
}
```

Composes onto inanimate Stuff (cart, boulder, statue) and onto
unconscious / non-agentic actors (a sleeping body, depending on
content choice).

### Push verbs

`push <thing> <direction>` — translocates the target to the
adjacent room in the direction, if reachable.

Eligibility:

- Pusher's locomotion mode supports pushing (walking is fine;
  swimming pushes flotsam in water; flying probably doesn't
  push ground objects).
- Target is `Pushable`.
- Target is in the same room as the pusher.
- An exit exists in the named direction.
- The exit's `physical` Conduit transmissivity allows the
  target's mass / size.
- The target has free engagement (it's not wedged, locked,
  bolted).

### `PushActivity`

Pushing has duration proportional to mass / pusher strength
(the latter is a future stats concern; v1 uses a flat
`pushDifficulty`).

```ts
interface PushActivity extends Activity {
  type: 'push';
  pusher: Stuff & Agent;
  target: Stuff & Pushable;
  direction: Direction;
  duration: number;   // derived from target.mass × pushDifficulty
  engagement: { body, hands };
  emittedSound: Sound | null;
}
```

Engagement: `body, hands`. Not concurrent with walking-on-your-
own; not concurrent with reading (attention used).

On `onComplete`: `ContainmentApi.move(target, destinationRoom)`,
re-emit position-change events.

### Shoving conscious actors — deferred

Pushing a conscious NPC who doesn't consent is a hostile
action; combat-adjacent. Belongs in a future combat slate. v1
doesn't ship this verb.

The intermediate case — pushing an unconscious or asleep actor
out of the way — composes naturally if the body declares
`Pushable` while in `lifecycleState: unconscious`. Author
choice; framework supports.

### "Sleeping body in the doorway"

The user's question. Answer per the design philosophy:

- **No sub-room positioning in v1.** A sleeping body in the
  room is "in the room" but doesn't physically obstruct exits.
- **You walk past trivially.** No prompt, no bump, no detour.
- **The room description can flavor**: *"Bob is sleeping by
  the east door."*

If specific content wants an obstacle: the body's author gives
it `BlockerBehavior` while unconscious, with `unblockCondition:
actor => actor.hasActivity('lift', target=body)`. Now you have
to lift the body before passing. That's an explicit content
choice, not a default.

---

## Worked scenario — the gate guard

The canonical use case for the design.

### Composition

```
Guard      Agent + Character + Sensor + Mobile + Organism + Vocal
            + BlockerBehavior
              { blockTargets: [northGate],
                blockReason: "The guard says, 'state your business.'",
                unblockCondition: a => a.hasItem(passportItem)
                                    || guard.hasGreenlit(a) }
```

### Verb sequence

```
> walk north
The guard says, "State your business."
You can't go that way.

> say "I'm here to see Lord Ashford."
[The guard considers you for a moment.]

> show passport to guard
You hand the guard your passport.
The guard examines it, nods. "Pass through."
[Internally: guard records hasGreenlit(player).]

> walk north
You walk through the gate, north into the courtyard.
```

The guard's `[considers you...]` and `[records hasGreenlit]`
are NPC behavior layer concerns (deferred). What this slate
provides:

- The block-validator framework.
- The `BlockerBehavior` mixin shape.
- The clear refusal message routed through the validator chain.

The conversation / passport check happens outside this slate
and feeds the guard's `unblockCondition` via memory.

---

## Worked scenario — the cart in the way

A heavy cart blocks a corridor. You can push it.

### Composition

```
Cart   Thing + Visible + Pushable
        { mass: '300 kg', pushDifficulty: 0.7 }
```

### Verb sequence

```
> walk east
The cart blocks your way east.
[Internally: walk's locomotion validator finds the cart's
position adjacent to the east exit; could be a per-content
authored block, or sub-room geometry — see open questions.]

> push cart east
You begin pushing the cart east. (8 seconds)
[8s elapsed, server-side activity completion]
You push the cart through to the next room.

> walk east
You walk east into the next room.
```

The cart's positioning *as obstruction* is a content-authoring
choice in v1 — a `BlockerBehavior` on the cart that fires while
located in this room. Could also be sub-room geometry once we
opt into it. v1 default: author the block-validator.

---

## What this stresses for existing slates

### Locomotion slate

Adds a new validator chain — block validators — that runs after
actor-eligibility and target-compatibility. Documented as a
section in the locomotion slate; small extension.

### Embodiment slate

`Pushable` lands as a Layer-3 affordance mixin alongside
Wearable, Wieldable, Postured, Mountable, Drivable. Same shape;
no slate restructuring.

### Activity slate

`PushActivity` is one more concrete activity type. Engagement:
`body, hands`. No new mechanism; uses the existing engagement-
slot model.

### Quantities slate

Mass on `Pushable` is `Quantity<kg>`; uses the typed-quantity
shape. Constraint composition (the cart's mass + the pusher's
strength → push difficulty) is real-units-honest.

---

## Open questions

1. **Block-validator scope** — same-room blockers only, or
   adjacent-room (block from outside the gate)? Lean same-room
   v1; flag for guard-on-the-other-side scenarios.
2. **Per-actor exception lists / memory storage** — does
   `unblockCondition` consult an NPC-memory store? Probably
   yes; cross-references adjoining-systems #7.
3. **Multi-blocker UX** — first-fail-with-suffix is the lean.
   Confirm with content cases.
4. **`MaxOccupancy` granularity** — single integer cap, or
   per-species (tigers and tiger cubs differ)? Single integer
   v1.
5. **`Pushable` for unconscious actors** — explicit opt-in (a
   `dead` lifecycle state composes pushable behavior) or always
   (any non-agentic body is pushable)? Lean explicit.
6. **Push verb's mode-as-verb status** — is `push` a locomotion
   verb (it moves the target through an exit) or its own
   family? Lean its own family.
7. **Sub-room positioning** — punted indefinitely per the
   design philosophy. Worth flagging if content cases pile up
   that strain the bag-of-stuff default.
8. **Stranger-blocking** — a random townsperson minding their
   business is in the gate; do they block? In the no-sub-room
   model, no, they don't. They have to declare
   `BlockerBehavior` to block. Default is correct; adds honest
   blocking only when authored.
9. **The `Crowded` status** — soft caps as a future extension?
   `Occupancy.Crowded` Witness fires when occupancy is at
   capacity-1 or so. Defer.
10. **Two-way blocking** — can a single guard block traversal
    in both directions (entering AND leaving)? Lean yes,
    automatic; `blockTargets` is the exit, not the direction.
11. **Pushable through sealed Conduits** — pushing a cart at a
    closed door: fail with "the door is closed"? Or
    automatically open it (push opens)? Lean fail; player must
    open first.
12. **Multi-actor coordinated push** — two characters pushing
    the same cart? Refers to adjoining-systems #8 (multi-actor
    coordination). Defer.

---

## Build order

**Wave 1** — capacity.

- Containment-scope `capacities: Capacity[]` field on Container
  hosts.
- Per-kind `checkCapacity` registered functions (`volume`,
  `weight`, `count`, `actor-count`, `rule`).
- Activity slate's transaction-style validation re-checks
  capacity at completion.

**Wave 2** — intentional blocking.

- `BlockerBehavior` mixin.
- Block-validator chain extension to locomotion's verb pipeline.
- First content: a gate guard.

**Wave 3** — pushing.

- `Pushable` mixin (mixin-slate.md Layer-3 affordance).
- `PushController` + `push` verb.
- `PushActivity`.
- First content: a heavy cart.

**Adjacent / future**:

- Conscious-actor shoving (combat-slate territory).
- Multi-actor coordinated push (adjoining-systems #8).
- Soft caps with `Crowded` status.
- Sub-room positioning (philosophy: defer indefinitely).

---

## What this slate does NOT cover

- **Sub-room positioning.** Punted per design philosophy.
- **Combat-style shoving / ramming / charging.** Combat-slate
  territory.
- **Multi-actor coordination** (lift the log together, push the
  cart together). Adjoining-systems #8.
- **Soft capacity / crowded status.** Future extension; v1 uses
  hard caps only.
- **Conduit physical-passability gradient** (a hole that fits
  arrows but not bodies). Boolean v1 in this slate; refinement
  in the ranged-action slate when it lands.
- **NPC behavior — what does the guard do after greenlight?**
  Behavior-layer concern.

---

## Once shaped into formal requirements

- The `capacities: Capacity[]` field shape on Container hosts +
  per-kind check functions.
- The `BlockerBehavior` mixin spec.
- The block-validator chain wiring into locomotion's
  pipeline.
- The `Pushable` mixin spec.
- The `PushActivity` spec + verb.
- Tests gating: a full container rejects with the typed
  message; a guard's block prevents traversal until
  unblock-condition passes; pushing a cart succeeds; pushing
  through a closed door fails; capacity at activity completion
  re-validates.

The shoving / multi-actor-push / sub-room cases wait for their
own slates.
