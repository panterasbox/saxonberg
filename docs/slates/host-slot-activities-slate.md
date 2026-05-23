# Host-slot activities (working slate)

Working slate for the second consumer wave of the activity
framework: non-self-locomotion activities that claim a slot on a
host Stuff (mount on a horse, sit on a chair, lie on a bed,
drive a cart) plus the first attention-engaged activity (read a
book).

The activity framework substrate is already shipped — see
[docs/subsystems/activity.md](../subsystems/activity.md). What
this slate sketches is what mount/sit/lie/drive/read look like
when they become durative engagements, and the `SlotApi`
extension that decision requires.

> **Status: deferred.** v1 keeps these verbs synchronous and
> instant. The atomicity of a single JS tick is enough — only
> one actor can win a slot per dispatch. `SlotApi.claimPending`
> only earns its complexity when there's a real duration window
> between claim and commit (i.e., when these become real
> activities). When that day arrives, this slate is the starting
> point.

See also:

- [docs/subsystems/activity.md](../subsystems/activity.md) — the
  shipped engagement framework.
- [docs/subsystems/slot.md](../subsystems/slot.md) — the slot
  substrate this slate extends.
- [docs/subsystems/posture.md](../subsystems/posture.md) — the
  current sit/lie/stand verb shape.
- [docs/subsystems/embodiment.md](../subsystems/embodiment.md) —
  Wearable / Wieldable body-side affordances; mount/dismount
  rides the same surface.
- [docs/subsystems/conveyance.md](../subsystems/conveyance.md) —
  Mountable / Drivable, the conveyance ripple Drive plugs into.
- [docs/slates/locomotion-as-activity-slate.md](./locomotion-as-activity-slate.md) —
  parallel deferred wave; Drive depends on it because it
  composes with `TraverseActivity` for the host vehicle.

---

## When this earns its slot

JS-tick atomicity carries the cross-actor race today. Two
players typing `mount saddle` on the same horse in the same
tick — the dispatcher orders them; whoever runs first claims
the slot; the second sees an "already occupied" rejection.
Instant commit means no window for the race to matter.

The activity-shaped version is forced by content that wants:

1. **Visible mid-mount state** — "you're climbing onto the
   saddle" emitted to peers in the room while the mount
   completes. Detection windows, interrupt opportunities.
2. **Hard slot races over a duration window** — two players
   reaching for the only seat. With durative mount, the loser's
   `claimPending` throws immediately; the winner's commit lands
   when their mount completes. Both see consistent prose.
3. **Mid-claim aborts** — the horse gets killed while you're
   climbing into the saddle. Eager host-destruction subscription
   on the activity fires `onAbort('host-destroyed')` before the
   commit ever runs.
4. **Sustained attention activities** — reading a book ties up
   the `attention` slot for a duration; concurrent activities
   (walking AND reading) are the motivating example for
   multi-slot engagement.

None of these are v1 game content. When one becomes content,
this slate becomes a build.

---

## `SlotApi` pending-claim extension

The slot substrate today is two-state per slot: either committed-
occupied (occupant Stuff in the set) or empty. Activities need a
third state: **claimed but not yet committed**. The activity
holds the claim for the duration of the mount/sit/etc.; on
commit the claim transitions to committed occupancy.

Three new `SlotApi` methods:

```ts
SlotApi.claimPending(host, slot, claimant): void;  // throws if claimed
SlotApi.commitClaim(host, slot, occupant): void;   // pending → committed
SlotApi.releaseClaim(host, slot, claimant): void;  // cancel the claim
SlotApi.isPendingClaimedBy(host, slot, claimant?): boolean;  // race check
```

Storage shape on `SlottedMixin`:

```ts
interface SlotState {
  occupants: Set<Stuff & Slottable>;  // committed
  pendingClaimant: Engagement | null;  // at most one
}
```

A slot with a pending claim is "soft-occupied" — `canOccupy`
returns false, `isSlotFull` returns true, but the existing
`occupy()` path still throws because the slot isn't actually
committed-occupied. The pending claim blocks new claimants;
the original claimant can `commitClaim` to convert it to a real
occupancy.

**The activity is the claimant, not the actor.** Activities are
short-lived and uniquely identified by engagement ID; passing
the activity instance pairs the claim to a specific engagement.
If the actor starts a new activity, the old claim can be
released unambiguously without affecting whatever's running now.

**Pending claims are runtime-only.** They don't survive server
restart; the activity that holds the claim doesn't survive
either. Mirrors `Mobile._engagedModePath`'s runtime-only
treatment today.

---

## `MountActivity` / `DismountActivity`

The model:

```ts
class MountActivity implements DurativeActivity {
  readonly type = 'mount';
  readonly actor: Stuff & Engaged & Slottable & Posed;
  readonly host: Stuff & Slotted & Mountable;
  readonly slots = new Set<EngagementSlot>(['body']);
  readonly duration = 2000;   // tunable later
  readonly cancelable = true;

  getHost(): Stuff { return this.host; }

  onStart(): void {
    SlotApi.claimPending(this.host, this.host.getMountSlot(), this);
  }
  onComplete(): void {
    if (!this.validateOnCompletion()) {
      SchedulerApi.cancel(this, 'preconditions-changed');
      return;
    }
    SlotApi.commitClaim(this.host, this.host.getMountSlot(), this.actor);
    this.actor.setPosture(Postures.Mounted);
  }
  onAbort(_reason: AbortReason): void {
    SlotApi.releaseClaim(this.host, this.host.getMountSlot(), this);
  }
}
```

**`MountController` refactor.** Goes from "do everything inline"
to the same shape every activity controller uses: validate, build,
start, switch on `StartResult`. Same body shrinks-substantially
shape as the locomotion-as-activity controller refactor.

**`DismountActivity`** is the symmetric companion — claim the
dismount during the duration window (preventing a third actor
from claiming the now-being-vacated slot mid-dismount), then on
commit release the actor's `Mounted` posture and remove from the
host's mount slot. Likely shorter duration than mount.

**The race resolution.** Two actors reach for the saddle. Both
controllers' eligibility cascade passes (slot is empty at the
moment of validation). Both call
`MountActivity.beginFor(actor, host)`. Whichever runs first
calls `claimPending` and wins; the second throws → its
`SchedulerApi.start` returns
`{ ok: false, reason: 'start-rejected', error }`. Controller
renders "you reach for the saddle but Alice has it." Wire
ordering is preserved by single-threaded JS dispatch even though
the duration window is real.

**Host destruction mid-mount.** Eager subscription via
`getHost()`. If the horse dies while you're climbing on, the
scheduler fires `onAbort('host-destroyed')`. Pending claim
released; actor's state unchanged (no posture commit ran).

---

## `SitActivity` / `LieActivity`

Same pattern as `MountActivity` with two differences:

- Slot resolution uses `SlotApi.resolveSlot` against the
  posture-bearing slot (chair seat, bed surface) rather than
  `getMountSlot()`.
- Posture commit is `Postures.Sit` / `Postures.Lie`.
- Default duration is shorter (sitting is faster than mounting);
  `1000` ms is a reasonable v1 default. Under the activity
  framework's 100ms floor, authors who want truly-instant sit
  ship `duration: 50` and the framework's `completed-sync`
  path handles it.

The existing `posture.md` substrate already has
`PostureApi.transferOccupancy` (atomic vacate-then-occupy). With
pending-claim, the activity's `onStart` does
`claimPending(toHost, toSlot)`; `onComplete` does the actual
`transferOccupancy(actor, from, to)`. `onAbort` releases the
pending claim only; the actor's old posture-slot stays put
because `transferOccupancy` never ran.

**The stand verb stays instant.** Standing up doesn't need a
duration window — it's a release, not a claim. (Authors can
make it durative trivially if some content earns it.)

---

## `DriveActivity`

Promotes the `LocomotionMode.drive` singleton to a real activity.
Structurally it's `MountActivity` plus an implicit follow-up of
starting a `TraverseActivity` on the host vehicle with the host
in the driver position.

**Open question on scope** — two reasonable cuts:

**Option A: `DriveActivity` is mount-only.** It only handles the
driver-seat claim/commit. Subsequent traversal is a separate
activity the player initiates with a separate verb
(`drive north` after `drive cart` mounted them as driver). Same
separation as mount/ride today.

**Option B: `DriveActivity` is mount + traverse.** A single
verb (`drive cart north`) builds both activities or a composite
that owns both. Tighter UX, more framework cleverness.

Recommend Option A — it composes from primitives already on the
table. Option B can be a content-author convenience verb layered
on top later.

**`DriveController` refactor.** Two argument shapes:
- Target is the vehicle → build `DriveActivity` (claim driver seat).
- Target is a direction with actor already driver-seated → build
  `TraverseActivity` for the host vehicle.

---

## `ReadActivity`

The first non-locomotion, non-host-slot activity. Proves the
`attention` engagement slot.

```ts
class ReadActivity implements DurativeActivity {
  readonly type = 'read';
  readonly actor: Stuff & Engaged;
  readonly target: Stuff & Readable;
  readonly slots = new Set<EngagementSlot>(['attention']);
  readonly duration: number;   // target.getReadDuration() or 5000
  readonly cancelable = true;

  getHost(): Stuff { return this.target; }

  onStart(): void {}
  onComplete(): void {
    // emit the target's text content to actor
  }
  onAbort(_reason: AbortReason): void {}
}
```

**`Readable` mixin (stub).** v1 doesn't need real book content:

```ts
interface Readable {
  getReadText(): string;
  getReadDuration(): number;   // ms; default 5000
}
```

Real book content (multi-page, bookmark, navigable) is its own
slate. v1's abort discards progress — the slate's "bookmark on
abort" is explicitly deferred.

**The motivating example: walk + read concurrently.** Actor has
two engagements live in the map — `TraverseActivity` on `body`,
`ReadActivity` on `attention`. They don't conflict at the slot
level. Aborting one leaves the other running. This is the v1
proof of multi-slot engagement.

---

## What this slate doesn't cover

- **The activity framework itself** — already shipped, see
  [activity.md](../subsystems/activity.md).
- **Locomotion as activity** — parallel deferred wave; separate
  slate at
  [locomotion-as-activity-slate.md](./locomotion-as-activity-slate.md).
  `DriveActivity` depends on it for the host-traversal half but
  ships as a no-op until both are built.
- **Real book content** — bookmark-on-abort, multi-page,
  navigable reading. Its own slate when reading earns content.
- **Combat-specific timing** — combat slate territory.
- **Spellcasting, forging, brewing, ritual, summoning** — the
  durative content the framework was built for. Each is its own
  content slate; each plugs in additively as an activity class
  registered under its `type` string.

## Open questions

### Q1. Multi-mount choreography

A wagon with four seats (driver + three passengers). Four
players typing `mount wagon` at once. Each `MountActivity`
claims a different slot (driver-seat, seat-1, seat-2, seat-3)
via `SlotApi.resolveSlot`'s existing dispatch. The pending
claims are independent — no conflict, no race. The framework
handles this without further design; the slate flags it for the
build to verify.

### Q2. Cancel-while-mounted vocabulary

Once mounted, `cancel mount` doesn't mean dismount — mount is
complete. `cancel ride` would target an in-flight Traverse on
the host vehicle. `dismount` is its own verb. Slate flags this
as a content-author wording call; the framework handles all
three cleanly.

### Q3. Posture vs. mount slot overlap

Sitting on the horse's back IS a mount; can you also "sit" while
on a horse? The existing `posture.md` substrate handles posture
slots distinctly from mount slots; sitting on a horse is just
the `Mounted` posture, not the `Sit` posture. No coordination
needed. Slate flags it as something the activity build
double-checks.

### Q4. `ReadActivity` and walking concurrently

The motivating example needs walking-as-activity to land first
— otherwise there's no `TraverseActivity` to share slots with.
If host-slot activities ship before locomotion-as-activity, the
walk + read demo can't run. Recommend bundling: ship the two
waves together, or ship locomotion-as-activity first and
host-slot-activities second.

## Once shaped into formal requirements

This slate boils down to:

- `SlotApi.claimPending` / `commitClaim` / `releaseClaim` /
  `isPendingClaimedBy` methods.
- `SlottedMixin` slot-state shape gains `pendingClaimant`
  (runtime-only).
- `MountActivity` / `DismountActivity` classes; `MountController`
  / `DismountController` refactor.
- `SitActivity` / `LieActivity` classes; `SitController` /
  `LieController` refactor.
- `DriveActivity` class (Option A scope); `DriveController`
  refactor.
- `Readable` mixin stub; `ReadActivity` class; `read` verb +
  controller.
- Trap-subsystem hook breadcrumb in
  `TraverseActivity.onComplete` (when the trap slate ships).
- Tests gating slot-race resolution, host-destruction mid-claim,
  posture transitions, and the walk + read concurrent demo.

When the build runs, document the result in
`docs/subsystems/slot.md` (pending claims section) and
`docs/subsystems/posture.md` / `embodiment.md` (activity-shaped
verbs).
