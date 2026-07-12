# Residency — scheduled object self-maintenance

The **residency** substrate hosts a family of scheduled sweeps that share
one shape: the engine periodically visits objects and lets each decide a
maintenance action on itself — *engine informs, object decides*. Two
sweeps live here:

- **Eviction (shipped)** — a real-time background sweep that lets
  abandoned in-memory `Stuff` **evict itself**, reclaiming the cold tail
  of clones that were made, drifted, and then forgotten (a dropped item
  nobody returns for, a room nobody re-enters, an NPC nobody visits, a
  shadow lifted off its host and orphaned). Before it, the only way a
  live `Stuff` left memory was an explicit `StuffApi.destruct()`.
- **Reset (deferred, same shape, same home)** — a game-time repop sweep
  over `ResettableMixin`, restorative-of-self. Not built yet; it slots in
  as a sibling sweep (`installResetSweep()` on the game-time clock,
  `residency.reset.*` knobs) — see *Deferred* below.

The rest of this doc describes the eviction sweep.

**This is a garbage-culler, not a swapfile.** Memory *scaling* is an
explicit non-goal (the answer to that is a distributive model). The
culler never promises rehydration and never snapshots drift: an evicted
object is simply *gone*, and if it's referenced again the existing
Pattern-A / Pattern-C resolution re-clones it fresh from its template.
That's acceptable by construction — the premise is that nobody cared
about the drift, because nobody touched it. This collapses the hard
"passivate stateful clones" problem entirely: there is no state to
preserve, because we only cull what's already abandoned.

See [residency-requirements.md](../requirements/residency-requirements.md)
and the seeding [residency-slate.md](../slates/builds/residency-slate.md).

## The whole mechanism

Deliberately small: **one method, one signal, one sweep.**

### One method — `Stuff.canEvict`, default cull, override to prevent

The decision is fully inverted: the sweep asks, the object decides.
`Stuff.canEvict(context: EvictionContext): VetoResult` defaults to
`{ ok: true }` — a fresh backing class is reclaimable by default and only
becomes sticky when its author deliberately vetoes (the correct bias for
a leak-plugger). It is a public, ungateable `@hook` (a subclass's
`super.canEvict()` is author code), landing in the **extension** doc
tier. There is **no scope filter and no class-keyed default**; every
`Stuff` is asked the same question. Vetoes layer on the mixin/class that
*owns* the relevant relationship, composed via `super.canEvict(context)`
— base `Stuff` stays permissive and never reaches into
Container/Shadow/Avatar/Exit knowledge.

`EvictionContext` is thin and **extensible** — `{ idleMs, reason }`
today. It carries only runtime facts the object can't self-derive; the
sole reason `canEvict` takes a context rather than being no-arg is so a
future resource-pressure trigger (the property slate's compute-dormancy)
can add fields (`memoryPressure`, …) and a new `reason` without touching
a single existing override.

### One signal — recency (`lastTouched`)

A coarse, transient `lastTouched` timestamp on `Stuff` base (never
persisted, not in `persistentFields`; resets to construction time on
every clone/hydrate). `touch()` / `getLastTouched()` are the surface.
The security gate calls `touch()` on the raw target after **every
successful non-getter method dispatch** — being *used* is being touched,
so anything a player or the system exercises stays warm for free, and
only genuinely un-called objects go cold. Denied dispatches don't touch;
getter reads don't touch (a passive read shouldn't keep an object
resident).

**Presence is the strongest form of touch.** A connected player sitting
silently in a room may dispatch nothing, so before each scan a *presence
walk* (`ConnectionApi.getAllInteractives()` → holder → room →
`getDeepContents()`, the `WeatherLogic.runBoundaryFanout` pattern)
refreshes the recency of every occupied room and everything nested in it
(co-occupants, floor items, and — since the player is himself
deep-contents of his room — each player's inventory). This is a touch
*source*, not a pin.

> **The enumeration-is-not-use rule.** `StuffApi.getAllObjects()` checks
> liveness on the **raw** target (`ProxyApi.unwrap(obj).isDestroyed()`),
> not the proxy. Enumerating the registry — which the sweep does every
> tick — must not dispatch-touch every object, or the sweep would refresh
> all recency before reading it and could never cull anything.

### One sweep — a lazy O(n) scan

`ResidencyLogic` (at `/obj/api/residency`, behind the thin gated
`ResidencyApi`) drives a real-time `ScheduleApi.recurring` sweep:

```
presenceWalkImpl()                                  // refresh presence first
for obj in StuffApi.getAllObjects():                // proxies
  raw = ProxyApi.unwrap(obj)
  idleMs = now - raw.getLastTouched()                // RAW: idle check must not touch
  if idleMs < idleThresholdMs: continue              // LRU grace
  if not obj.canEvict({ idleMs, reason: 'idle' }).ok: continue   // PROXY: this-relative vetoes resolve
  observe → log(candidate);  enforce → StuffApi.destruct(obj)
```

The split is deliberate: recency is read on the **raw** target so the
idle check itself is never a touch (that's what keeps idle detection
honest), but `canEvict` is asked on the **proxy** — a veto's
self-knowledge can be `this`-relative through the framework (a shadow's
host lives in a proxy-keyed WeakMap, so `this.host` only resolves when
`this` is the proxy). The touch proxy-dispatch incurs is harmless: only
cold-tail candidates (past the idle threshold) are asked, and only
*after* the idle decision — a culled candidate is moot, a vetoing one is
merely refreshed.

**Not an ordered LRU list.** The textbook LRU structure is for eviction
*on the hot access path* (find-a-victim-now under memory pressure); ours
is a lazy background timer, which flips the tradeoff. An ordered list
would move cost onto the touch path (every dispatch a move-to-front;
presence bursts a whole subtree); a plain scan keeps touch at a single
write and reads `n` timestamps once per sweep — cheaper in aggregate.
Budgeted/incremental slicing, then a true LRU, are drop-in escalations if
`n` ever makes a single scan spike; `canEvict` never changes.

**Eviction is `StuffApi.destruct`, not a new teardown path.** Culling
runs the ordinary choreography (`onDestruct` → mixin `cleanupOnDestruct`
(R2.4) → shadow detach → unregister), so a culled object's live-ref
holders are cleaned/self-healed by the existing R2.x rules — a dangling
Pattern-B ref is a hazard `destruct` already handles, not one eviction
introduces (which is why residency needs **no reverse-ref index**).
`canEvict` and `canDestruct` are independent: an object that permits
eviction may still `canDestruct`-veto, so the enforce path tolerates a
`DestructError` (log + continue).

## Observe-first, then tune

Because the go-live memory profile is unknown, the sweep **ships in
observe mode** — it logs what it *would* cull (cold-tail size + a sample)
and destructs nothing. Watch that against real load, then flip
`residency.eviction.mode` to `enforce`. Mode is re-read each sweep (no
restart). Knobs are per-sweep-namespaced (`residency.eviction.*` here;
the reset sweep will add `residency.reset.*`), seeded in
`config/app-settings.yaml`:

- `residency.eviction.mode` — `observe` | `enforce` (default `observe`)
- `residency.eviction.intervalMs` — sweep cadence (default 60000)
- `residency.eviction.idleThresholdMs` — grace window (default 1800000)

Settings reads are try/catch-guarded and fail **safe** (to `observe`,
never cull) when AppSettings isn't warmed (pre-boot / tests).

## The veto roster

`Stuff.canEvict` base returns `{ ok: true }`. Two kinds of veto layer on:

**(A) Categorical infrastructure.**

- **All `*Logic` singletons**, via a shared **`ApiLogic extends Idea`**
  base whose `canEvict` vetoes unconditionally. Logic singletons are a
  finite, load-bearing set underpinning every system; they'd self-heal if
  culled (`StuffApi.singletonSync` re-warms), but there's no benefit to
  churning them, so the veto is applied once on the base rather than as
  ~65 per-class overrides. `ApiLogic` is the sanctioned home for future
  shared logic-singleton concerns. (`instanceof Idea` still holds.)
- **Stateful registries + `Interactive`** (`ReactionRegistry`,
  `MqlSubscriptionRegistry`, `OfficeRegistry`, the catalogues,
  `Interactive`, …) veto per-instance: they hold irreplaceable in-memory
  state and can't ride `ApiLogic` (not `*Logic`) nor be blanket-protected
  on `PostRegistrationMixin` (also worn by cullable `NPC`).

**(B) Relational / structural — derived from the R2.x ref-cleanup
rules.** The attachment relationships that require coordinated cleanup on
destruct (see [ref-shapes.md](../ref-shapes.md)) are exactly the ones
that require veto-coupling on evict: **an object in an R2.1-owned or
R2.2-symmetric relationship vetoes while its anchor is alive.** This is
self-knowable — the object sees its own side of the edge (its container,
its host, its owner) — so it never reintroduces the rejected reverse-ref
index.

| Host | Vetoes while… | Owns |
|---|---|---|
| `Container` | non-empty **AND not a persistence host** | cold contents cull first; the emptied container culls a later sweep (bottom-up — R2.4 owning-cascade never surprises). A **persistable host** (`PersistableMixin`) falls THROUGH this veto — the sweep `await`s `PersistableApi.capture` before `StuffApi.destruct`, so contents are durably captured then re-materialize on next reference (see [persistence.md § eviction seam](./persistence.md#the-eviction-seam)) |
| `Containable` | inside a `HasInteractive` holder | protects a disconnected-but-in-memory avatar's inventory that presence-touch can't reach |
| `HasInteractive` | always (Avatar / Login) | the session holder itself; lifecycle owned by connection teardown |
| shadow | its host is alive | one-directional (checks `host.isDestroyed()`, never `host.canEvict()` — no recursion); orphaned shadow culls |
| `Exit` / `Adornment` | its source room / wall is alive | R2.1 owned — else an exit is culled out from under a live room |
| `Behaved` | it holds a behavior spec | authored NPC cast; re-clone would erase it |
| `WarrenMember` | it's in a live warren (`getWarren() !== null`) | culling a satellite out from under the elastic graph (host designation, hub exits, migration) is the Warren's call, not residency's |

A plain `Location` does **not** veto. Rooms are path-addressable, so an
empty, unreferenced, idle room culls and simply re-clones from its
template on next entry (exits carry `destinationPath` to re-resolve). A
room with contents is held by the `Container` veto; a room in the Warren
graph by the `WarrenMember` veto — nothing else about a room is worth
keeping resident.

Occupied furniture and engaged actors get **no explicit veto** — the
occupant is present, so presence + dispatch touch already keep them warm.

## Module homes

- `api/residency.ts` — `ResidencyApi` gated forwarding shell (`boot`
  installs the residency sweeps; `evictNow` for test/manual).
- `obj/api/ResidencyLogic.ts` — the `@internal` logic singleton, home to
  the scheduled sweeps: `installEvictionSweep()` + `runEvictionSweep` +
  the presence walk today, one retained handle per sweep (the reset
  sweep's `installResetSweep()` + `runResetSweep` land alongside).
  `extends ApiLogic`, so it self-exempts.
- `lib/stuff/Stuff.ts` — `canEvict`, `EvictionContext`, `lastTouched`,
  `touch()` / `getLastTouched()`.
- `lib/stuff/ApiLogic.ts` — the logic-singleton base carrying the
  categorical veto.

## Deferred

- **The reset sweep** (game-time repop) — the second sweep this substrate
  is built to host: `resets:` + `ResettableMixin`, restorative-of-self,
  never destructive-of-others, reusing the presence walk as a skip. It
  installs a sibling `installResetSweep()` on the game-time clock (vs.
  eviction's real-time clock), reads `residency.reset.*`, and its
  `runResetSweep` body mirrors `runEvictionSweep`. Designed in the slate;
  a separate follow-on build. (Note the subsumption: a cold resettable
  object is simply culled and re-cloned fresh — its template state *is*
  its reset state — so explicit reset only earns its keep for
  warm/resident objects.)
- **Memory-pressure-driven aggressiveness** — a sweep-side threshold
  modulation (shrink the grace window under heap pressure), *not* an
  input to `canEvict`. Documented seam; not built.
- **Per-object retained footprint** — a future `EvictionContext` field
  for the property slate's compute-dormancy trigger (a resource-pressure
  eviction that rides this same `canEvict` + `destruct` seam). True
  retained size needs a heap walk we can't afford per-sweep.
- **Ordered LRU / incremental sweeping** — escalations if observe-mode
  data ever shows the O(n) scan spiking.
