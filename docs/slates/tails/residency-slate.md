# Residency — self-eviction of the cold tail + scheduled state-reset

> **Status: TAIL — the eviction sweep shipped 2026-07**
> ([residency.md](../../subsystems/residency.md)); this slate now holds
> the deferred **reset** sweep. Shipped: the real-time cold-tail culler —
> a scheduled sweep that lets abandoned `Stuff` **evict itself** via the
> `canEvict` default-cull hook (recency by dispatch-touch + presence,
> `ApiLogic` categorical veto, the R2.x-derived relational veto roster,
> observe-first). Deferred (this tail): the game-time sibling — objects
> that **reset themselves** to a baseline on a cadence (`resets:` +
> `ResettableMixin`, restock vs field-revert). Two scheduled sweeps over
> one "engine informs, object decides" primitive; the second is the
> remaining design surface below.

**This is a garbage-culler, not a swapfile.** The explicit non-goal is
memory *scaling* — if the box is that constrained the answer is a
distributive model, not paging objects to disk and back. So the culler
never promises rehydration and never snapshots drift: an evicted object
is simply *gone*, and if it's referenced again the existing Pattern-A /
Pattern-C resolution re-clones it **fresh from its template**. That's
acceptable *by construction* — the premise of eviction is that nobody
cared about the drift, because nobody touched it. This collapses the
hard "passivate stateful clones" problem entirely: there is no state to
preserve, because we only cull what's already been abandoned.

## See also

- [lifecycle.md](../../subsystems/lifecycle.md) — create/destroy
  choreography, `canDestruct` veto, `onDestruct` witness, the
  construction sentinel. **Eviction is not a new teardown path — it *is*
  `StuffApi.destruct`**, driven by a different trigger and gated by one
  extra consent hook.
- [ref-shapes.md](../../ref-shapes.md) — the three reference shapes and
  the **R2.1–R2.4** cleanup rules for live-ref (Pattern B) fields. The
  reassurance that lets us skip any refcount: a culled object goes
  through the *ordinary* destruct choreography, so R2.4's
  framework-enforced `cleanupOnDestruct` unhooks it from collections,
  R2.3 getters self-heal on `isDestroyed()`, and R2.2 back-refs clear — a
  dangling Pattern-B ref is a hazard `destruct` **already** handles, not
  one eviction introduces.
- [time.md](../../subsystems/time.md) — `ScheduleApi.recurring`
  (real-time, `runRoot`-wrapped) for the culler sweep; `SchedulerApi`
  riding game-time via `WorldClockApi` for the reset sweep. The
  two-clock split mirrors metabolism (real-time) vs weather (game-time).
- [app-settings.md](../../subsystems/app-settings.md) — every knob here
  is an operator-tunable `AppSettingKeys` entry, because the go-live
  memory profile is unknown and the sweep ships in **observe mode** to
  learn it before it enforces.
- [weather.md](../../subsystems/weather.md) — `WeatherLogic`'s
  `runBoundaryFanout` is the precedent for the **presence walk**:
  enumerate `ConnectionApi.getAllInteractives()`, deref to each holder's
  room, dedup by `stuffId`. Here it's a *touch source*, not a pin.
- [behavior.md](../../subsystems/behavior.md),
  [activity.md](../../subsystems/activity.md) — `EngagedMixin` supplies
  the "am I mid-activity" signal an NPC reads in its own veto; `Behaved`
  cast veto while they hold a behavior spec.

## The whole mechanism

It is deliberately small. One method, one signal, one sweep.

**One method — `canEvict()` on `Stuff`, default cull, override to
prevent.** The decision is fully inverted: the sweep asks, the object
decides. There is **no scope filter and no class-keyed default** — every
`Stuff` is asked the same question, and anything that must survive says
so by overriding. (Earlier drafts tried to key the default off `Idea` or
`Containable`; both are wrong — `Idea` is a structural catch-all, and a
lifted-and-orphaned shadow is not `Containable` yet is exactly the
garbage we want gone. The filter idea is dead.)

```ts
// on Stuff, reusing the existing VetoResult type
canEvict(): VetoResult { return { ok: true }; }   // cull unless you veto
```

Who overrides to veto — a per-backing-class call, reading the object's
*own* knowledge, which is the whole point of the inversion:

- **Logic singletons / registries / reference-data** (`OfficeLogic`,
  `OfficeRegistry`, `Corpo`, `Emote`, …) — resident by design; veto.
  One line each. (They're also never in a room, so presence never
  touches them and they'd otherwise decay into candidates — the veto is
  the honest reason they survive, not "they stay warm.")
- **`Container` while non-empty** — cold contents cull individually
  first; the emptied container culls a sweep later. **Bottom-up culling
  means R2.1's owning-cascade never surprises us** — a container never
  destructs a subtree out from under itself.
- **`Behaved` NPCs while `engaged` or holding a behavior spec** —
  authored cast; re-clone-on-touch would erase them.
- **Authored `Location`s** — persist (and reset, below); an
  ephemeral/`Warren`-bud room overrides *back* to cull-when-empty.

The base default is **cull**, so a brand-new backing class is
garbage-collectable by default and only becomes sticky when its author
deliberately makes it so. That's the right bias for a leak-plugger.

**One signal — recency.** A coarse, tunable `lastTouched` timestamp is
the only thing tracked. It answers "is this worth even asking about."
Three touch sources, all `AppSettings`-selectable:

- **`MessageApi.sendMessage(recipient, frame)`** — the lone delivery
  funnel; bumps the recipient. Catches perception scenes, speech,
  emotes — most in-world activity produces a message to a sensor.
- **`ContainmentLogic.moveCore()`** — the atomic move chokepoint; bumps
  the item and both containers.
- **Presence** — a connected player *in* a room is the strongest form of
  touch. The session→subtree walk (`runBoundaryFanout` pattern) bumps
  `lastTouched` on everything a player can currently reach. This is not a
  separate "pin" or "reachability" concept — presence is simply the
  touch that keeps a silently-occupied room and its contents fresh.

`lastTouched` is a **transient** (never-persisted) timestamp on `Stuff`
base with a `touch()` / `getLastTouched()` surface — GC'd with the
object, no persistence-field concern. The recency chokepoints call
`ResidencyApi.touch(stuff)`.

**One sweep — a lazy O(n) scan.** An `@internal` `ResidencyLogic`
singleton at `/obj/api/residency` behind a thin `ResidencyApi` facade,
driven by `ScheduleApi.recurring`:

```
for obj in StuffApi.getAllObjects():                    // enumerable registry
  if now - obj.getLastTouched() < idleThresholdMs: continue   // LRU grace
  if obj.canEvict().ok:                                       // it decides
    observe-mode → log(obj)                                   // ship this first
    enforce-mode → StuffApi.destruct(obj)                     // the real thing
```

### Why a plain scan, not an ordered LRU list

The instinct to keep a proper LRU list — walk the cold end, stop at the
threshold, skip the rest — is textbook-correct for a cache that evicts
*on the hot access path* under memory pressure, where victim-selection
must be O(1). **Ours is a lazy background timer, not access-pressure
eviction**, and that flips the tradeoff:

- An ordered list moves the cost onto the **touch path** — every message,
  every move, and every presence-bump does a move-to-front. Presence
  bumps a whole room's deep-contents at once, so it's bursty. Touches
  outnumber sweeps by orders of magnitude; you'd pay this constantly.
- A plain scan keeps the touch path at a single timestamp write and reads
  `n` timestamps every N seconds. At realistic `n` (10⁴–10⁵ live
  objects) that's tens-to-hundreds of microseconds *once per sweep* —
  amortized, nothing.

So the scan is cheaper *in aggregate* here; the ordered list would
optimize a cost we don't have by adding one we would. If observe-mode
ever shows `n` large enough that a single scan spikes, the escalation
*before* a true LRU is **budgeted/incremental sweeping** — a bounded
slice of the registry per tick, round-robin across sweeps. Both are
drop-in later; `canEvict` never changes.

## Observe-first, then tune

Because the go-live memory profile is unknown, the sweep ships in
**observe mode** and enforces nothing — it computes the cull candidates
and logs the cold-tail size, shape, and a sample. We watch that against
real load, then flip `residency.mode` to `enforce` and tune. Knobs
(`AppSettingKeys`):

- `residency.mode` — `observe` | `enforce` (default `observe`).
- `residency.sweepIntervalMs` — sweep cadence.
- `residency.idleThresholdMs` — the grace window.
- `residency.touchSignals` — which sources bump recency.

## The sibling: scheduled state-reset (game-time repop)

A smaller, separate mechanism sharing only the "engine informs, object
decides" shape. Authored *content* policy, not an engine-wide sweep: a
`resets:` instruction field on a template → `ResettableMixin`, scheduled
on the **game-time** clock (`SchedulerApi` over `WorldClockApi`).

- **Restorative-of-self, never destructive-of-others.** Restock own
  spawn contents when empty; revert own drifted fields to template
  baseline. Never yanks a player-held item.
- **Skips objects a player is present at** so it never repops in a
  player's face (reusing the presence walk, here as a skip condition).
- **Eviction subsumes reset for cold objects:** a cold resettable object
  is simply culled and re-cloned fresh — its template state *is* its
  reset state — on next visit. So explicit reset earns its keep only for
  **warm / resident** objects that should return to baseline without ever
  unloading (a door that recloses, an NPC whose vitals recover while a
  player is around).

The two sweeps differ on everything else: clock (real vs game), trigger
(idle-scan vs fixed-interval), and effect (destruct vs restore).

## Open questions for requirements

- **`lastTouched` storage** — transient field on `Stuff` base (proposed)
  vs a side-map in `ResidencyLogic`. The field is cleaner (GC's with the
  object, no cleanup hook) but touches the base class; confirm at plan.
- **Recency bump mechanism** — a proxied `touch()` method call from the
  mediator chokepoints vs a raw-target write from trusted code. Hot-path
  cost detail for plan.
- **Reset scope for v1** — restock-only (additive, safe) vs
  restock + field-revert. Field-revert needs the template-baseline diff;
  restock-only is the smaller first slice.
- **Module home for `ResettableMixin`** — `lib/lifecycle/` alongside the
  destruct choreography, or its own `lib/residency/` with the culler.
