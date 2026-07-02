# Residency (self-eviction of the cold tail) — requirements

A scheduled, real-time background sweep that lets abandoned in-memory
`Stuff` **evict itself** — reclaiming the cold tail of clones that were
made, drifted, and then forgotten (a dropped item nobody returns for, a
room nobody re-enters, an NPC nobody visits, a shadow lifted off its host
and orphaned). Today the only way a live `Stuff` leaves memory is an
explicit `StuffApi.destruct()`; nothing reclaims what's merely been
abandoned, so the registry grows for the life of the process. This build
delivers the **culler**. It is seeded by
[residency-slate.md](../slates/builds/residency-slate.md) and reuses the
existing destruct choreography rather than inventing a teardown path.

**This is a garbage-culler, not a swapfile.** Memory *scaling* is an
explicit non-goal — the answer to that is a distributive model. The
culler never promises rehydration and never snapshots drift: an evicted
object is *gone*, and if referenced again the existing Pattern-A /
Pattern-C resolution re-clones it fresh from its template. That is
acceptable by construction — the premise is that nobody cared about the
drift, because nobody touched it.

## Goals

- Abandoned, world-placed `Stuff` (and any other non-resident `Stuff`,
  e.g. an orphaned shadow) is reclaimed automatically when it has gone
  untouched past a tunable idle threshold — without anyone calling
  `destruct` on it.
- Every `Stuff` decides its own fate: the sweep asks, the object answers.
  The default is *cull*; an object that must survive vetoes, reading its
  own knowledge (it holds live state, it's busy, it contains things).
- Objects in active use are kept resident for free — being *called* is a
  touch, so anything a player or the system is exercising stays warm
  without bookkeeping the caller has to remember.
- Load-bearing infrastructure singletons — the `*Logic` set, the stateful
  registries/catalogues, live sessions — are **never** culled:
  categorically via a shared base where one cleanly exists (`ApiLogic`),
  per-instance veto where it doesn't. They're finite and underpin every
  system; there is no benefit to ever reclaiming them.
- The mechanism ships **safe to enable**: an observe-only mode that
  reports what it *would* cull, so the unknown go-live memory profile can
  be measured before enforcement is switched on.
- The eviction-decision hook is a **stable extension point** for a
  future resource-pressure-driven trigger (the property slate's
  compute-dormancy), addable without touching existing overrides.

## Non-goals

- **Scheduled state-reset / repop.** The game-time sibling
  (`resets:` + `ResettableMixin`, restock/field-revert) is *designed* in
  the slate but **deferred to a follow-on build**. It shares only the
  presence walk; its restock/field-revert semantics touch
  spawn-instruction internals that are their own chunk.
- **Passivation / swap / stateful rehydration.** No snapshotting drift
  to disk, no promise that an evicted object returns identical. Culled
  means gone; re-reference re-clones fresh from template.
- **Reference counting / a reverse live-ref index.** Rejected: a culled
  object goes through ordinary `destruct`, so R2.1–R2.4 already handle
  referent-disappearance (R2.4 unhooks collections, R2.3 self-heals,
  R2.2 clears back-refs).
- **Memory-pressure-driven aggressiveness.** v1 uses a fixed, configured
  idle threshold. Pressure-modulation (shrink the threshold / walk
  further under heap pressure) is documented as a **sweep-side** seam,
  not built. It is deliberately *not* an input to `canEvict`.
- **Per-object retained-footprint accounting.** True retained size needs
  a heap walk we can't afford per-sweep. Documented as a future
  `EvictionContext` field for the compute-dormancy consumer; not built.
- **An ordered LRU list / incremental sweeping.** v1 is a plain lazy
  scan (see decision below). Budgeted/incremental slicing and a true LRU
  are drop-in escalations if observe-mode data ever demands them.
- **Scope filters or class-marker defaults.** No "only `Containable`,"
  no "`Idea` vetoes." Every `Stuff` is asked the same question.

## Surface decisions

### The mechanism: `canEvict`, default cull, override to prevent

A single method on `Stuff` base. The decision is fully inverted — the
sweep informs, the object decides. There is **no scope filter and no
class-keyed default**; every `Stuff` is asked, and anything that must
survive overrides. The base default is *cull*, so a new backing class is
reclaimable by default and only becomes sticky when its author
deliberately makes it so — the correct bias for a leak-plugger.

```ts
// on Stuff, reusing the existing VetoResult type
canEvict(context: EvictionContext): VetoResult { return { ok: true }; }
```

`{ ok: true }` = "yes, cull me"; an override returns `{ ok: false, reason }`
to veto (same convention as `canDestruct`).

### `canEvict(context)` — a thin, extensible context

`canEvict` takes a context object, **not** no-arg and **not** a wide
situation bundle. Rationale: everything self-knowable (contents,
engagement, held spec, mixins, templatePath) the object introspects
better than we could assemble — so the context carries only *runtime
facts the object cannot derive*. v1 populates exactly:

```ts
interface EvictionContext {
  idleMs: number;          // now - lastTouched, already computed by the sweep
  reason: "idle";          // the trigger; extensible ('memory-pressure', …)
}
```

The context object exists so the property slate's compute-dormancy
trigger can later add `memoryPressure` / `computeStanding` fields (and a
new `reason`) **without changing a single existing override's signature**.
That extensibility is the whole reason for a context param over no-arg.

### Who vetoes, and why

`Stuff.canEvict` base stays permissive (`{ ok: true }`). Vetoes layer on
via `super.canEvict()`-composed overrides on the mixin/class that *owns*
each concern — base `Stuff` must not import knowledge of
Container/Shadow/Avatar/Exit (same reason containment logic isn't on base
Stuff). Two kinds of veto:

**(A) Categorical infrastructure vetoes.**

- **All `*Logic` singletons veto, via a shared `ApiLogic` base.** Not
  because they'd break if culled — they self-heal through
  `StuffApi.singletonSync` — but because they are a **finite,
  load-bearing set that underpins every system**, and there is no benefit
  to ever churning them. A new **`ApiLogic extends Idea`** base
  (`lib/stuff/ApiLogic.ts`, beside `Idea`) carries `canEvict → veto`, and
  **every `obj/api/*Logic.ts` migrates to extend it** (they extend `Idea`
  directly today, so the change is mechanical and `instanceof Idea` is
  preserved). In scope for this build; also the sanctioned home for future
  shared logic-singleton concerns.
- **Stateful registries and `Interactive` veto per-instance.**
  Registries/catalogues holding irreplaceable in-memory state
  (`ReactionRegistry`, `MqlSubscriptionRegistry`, `OfficeRegistry`, the
  catalogues) and `Interactive` (a live session) resolve via bare
  `findByTemplatePath` (no self-heal); culling would *lose* state. They
  **cannot** ride `ApiLogic` (not `*Logic`) and cannot be blanket-protected
  on `PostRegistrationMixin` (also worn by cullable `NPC`). Each overrides
  `canEvict` to veto.

**(B) Relational / structural default vetoes — derived from the R2.x
ref-cleanup rules.** The attachment relationships that require
*coordinated cleanup on destruct* (ref-shapes.md R2.1–R2.4) are exactly
the ones that require *veto-coupling on evict*: **an object in an
R2.1-owned or R2.2-symmetric relationship vetoes while its anchor is
alive.** This is self-knowable — the object sees its own side of the edge
(its container, its host, its owner) — which is why it does *not*
reintroduce the rejected reverse-ref index: we only cover relationships
visible from the object's own side, never "does anything point at me." The
roster, each living on the owning mixin:

- **`Container` while non-empty** (R2.4) — cold contents cull first, the
  emptied container culls a later sweep; bottom-up, so the owning-cascade
  never destructs a subtree out from under itself.
- **`Containable` anywhere inside an `Avatar`** — walk the container chain,
  veto if any ancestor is an `Avatar`. Player stuff is precious. Note:
  presence-touch already keeps a *connected* avatar's subtree warm; this
  check is what protects a *disconnected-but-in-memory* avatar's inventory,
  which presence doesn't reach. Complements the container veto (the avatar
  itself vetoes as a non-empty container; its contents veto via this walk).
- **A shadow while its host is alive** — veto while `host !isDestroyed()`;
  an orphaned / dead-host shadow culls. **One-directional only:** the
  attached thing defers to its anchor, never the reverse — a host does NOT
  veto for its shadow's sake (host destruct runs `_detachAllForHost`,
  orphaning the shadow, which the next sweep reaps). The shadow checks
  `host.isDestroyed()`, **not** `host.canEvict()`, to avoid any recursion.
- **An `Exit` / `Adornment` while its owning room / wall is alive** (R2.1
  owned) — else the sweep culls an exit out from under a live room.
- **A `Postured` host with a posed occupant, or any object that is the
  subject of an active engagement** — veto while occupied/in-use. (The
  `Behaved`-NPC-engaged veto is the actor-side instance of this.)
- **`Behaved` NPCs** additionally veto while holding a behavior spec —
  authored cast; re-clone would erase them.
- **A `WarrenMember` room vetoes while it's in a live warren** — culling a
  satellite out from under the elastic graph is the Warren's call. A plain
  `Location` does **not** veto: rooms are path-addressable, so an empty,
  unreferenced room culls and re-clones from its template on next entry
  (a room with contents is already held by the `Container` veto).

### Touch signal: method dispatch, plus a presence supplement

The one tracked signal is recency. It is bumped on **any instance-method
dispatch through the call-security proxy** — the proxy already intercepts
every `method.apply(proxy, …)`, so a touch is one field-write on an
already-hot path. To avoid a per-call `Date.now()`, touch writes a
**cached tick** (a counter the sweep scheduler advances ~once/sec). This
makes "in use ⇒ resident" true for free: singletons in use stay warm,
rendering a room touches its contents, and only genuinely un-called
objects go cold.

- **Presence supplement** — a connected player sitting silently in a room
  may call nothing. A lightweight session→subtree walk (the
  `WeatherLogic.runBoundaryFanout` pattern:
  `ConnectionApi.getAllInteractives()` → holder → room →
  `getDeepContents()`) bumps `lastTouched` on what a player can currently
  reach. This is a *touch source*, not a pin or a scope filter.
- **The sweep must not self-touch.** The sweep reads `getLastTouched()`
  and calls `canEvict()` via the raw target (`Stuff.RAW_TARGET`), so its
  own introspection doesn't bump recency through the proxy.

### `lastTouched` storage: transient field on `Stuff` base

A transient (never-persisted) timestamp/tick on `Stuff` base, with a
`touch()` / `getLastTouched()` method surface. Chosen over a side-map in
`ResidencyLogic`: it GC's with the object (no cleanup hook), and read/write
is a direct field access rather than a map lookup. TS `private` modifier
(not `#` — the proxy makes `#` unworkable for instance state); external
access only through the method surface.

### The sweep: a lazy O(n) scan, not an ordered LRU

```
for obj in StuffApi.getAllObjects():                       // enumerable registry
  if now - obj.getLastTouched() < idleThresholdMs: continue
  if obj.canEvict(context).ok:
    observe → log(obj);  enforce → StuffApi.destruct(obj)
```

An ordered LRU list is the textbook structure for eviction *on the hot
access path* under memory pressure. Ours is a **lazy background timer**,
which flips the tradeoff: a list moves cost onto the touch path (every
dispatch does a move-to-front; presence bumps a whole subtree at once),
while a plain scan keeps touch at a single write and reads `n` timestamps
once per sweep — tens-to-hundreds of microseconds at realistic `n`. The
scan is cheaper in aggregate here. Budgeted/incremental slicing, then a
true LRU, are drop-in escalations if `n` ever makes a single scan spike.

### Eviction is `StuffApi.destruct`, not a new teardown path

Culling routes through the existing `StuffApi.destruct(obj)` — so
`onDestruct` fires, the mixin `cleanupOnDestruct` walk runs (R2.4), shadows
detach, and the object unregisters, exactly as a manual destruct. The only
additions are the trigger (the sweep) and the `canEvict` consent gate
layered before it.

### Observe-first, tunable via AppSettings

Ships in observe mode; enforcement is a flip. Knobs are per-sweep
namespaced under `residency.<sweep>.*` (the reset sweep will add
`residency.reset.*`); dispatch-touch is unconditional, so no touch-signal
knob. Eviction (`AppSettingKeys`):

- `residency.eviction.mode` — `observe` | `enforce` (default `observe`)
- `residency.eviction.intervalMs` — sweep cadence
- `residency.eviction.idleThresholdMs` — the grace window

### Module homes

- `api/residency.ts` — `ResidencyApi` facade (`boot` installs the
  residency sweeps; `evictNow` for test/manual), ending in
  `SecurityApi.decorateApiClass`.
- `obj/api/ResidencyLogic.ts` — the `@internal` logic singleton at
  `/obj/api/residency` owning the sweep loop, the cached tick, and
  observe/enforce dispatch.
- `lib/stuff/Stuff.ts` — `canEvict(context)`, the transient `lastTouched`
  slot, `touch()` / `getLastTouched()`.

## Constraints

- **Go through the Api layer.** Culling calls `StuffApi.destruct(obj)`,
  never `destroy()`; the sweep runs on `ScheduleApi.recurring`, never a
  bare `setInterval` (see antipatterns.md / [time.md](../subsystems/time.md)).
- **Api ↔ logic split.** `ResidencyApi` forwards to `ResidencyLogic`;
  nothing imports the logic singleton directly (facade + types only).
- **`canEvict` is a public, ungateable override hook** — like
  `canDestruct` / `onDestruct`, a subclass's `super.canEvict()` is author
  code, so it can't be gated. It must carry the `@hook` TSDoc tag to land
  in the **extension** doc tier (callable == visible == cared-about).
- **Proxy-safe field.** `lastTouched` is TS `private`, not `#`; touched
  and read only via the method surface / `RAW_TARGET`.
- **No self-touch during the sweep** — introspection via `RAW_TARGET`.
- **Reuse `VetoResult`** from `lib/errors.ts`; do not invent a new
  result type.
- **No new module categories** and no `lib/mixins/`-style folders; the
  culler is Api + logic singleton + base-class method. `ApiLogic` is a
  framework base class (Stuff-class category, `lib/stuff/`), not a new
  category.
- **Taxonomy update.** Logic singletons now extend `ApiLogic` (which
  extends `Idea`), not `Idea` directly; the CLAUDE.md Module Categories
  row ("Stateless `Stuff` (`extends Idea`, no `PostRegistrationMixin`)")
  updates to match at finalize.
- **Default-observe guarantees safe deploy** — enabling the build must not
  cull anything until an operator flips `residency.eviction.mode`.

## Acceptance criteria

- `Stuff.canEvict(context)` exists, defaults to `{ ok: true }`, is
  `@hook`-tagged, and is overridable; `EvictionContext` is `{ idleMs,
  reason }` and shaped to extend.
- A dispatched method bumps `lastTouched`; a recently-called object is
  skipped by the sweep. (test)
- Presence keeps an occupied room's contents warm across a sweep. (test)
- The sweep reads state via `RAW_TARGET` and does not itself reset
  recency. (test)
- In **observe** mode the sweep culls nothing and logs candidates; in
  **enforce** mode an idle, non-vetoing `Containable` / orphaned shadow /
  idle stateless clone is culled via `StuffApi.destruct` (onDestruct
  fires, R2.x cleanup runs). (tests)
- Stateful residents (`ReactionRegistry`, `MqlSubscriptionRegistry`,
  `Interactive`, a catalogue) survive a sweep via their `canEvict` veto.
  (tests)
- The relational vetoes hold, each composed via `super.canEvict()`: a
  non-empty `Container`; a `Containable` inside an `Avatar` (incl. a
  disconnected avatar's inventory); a shadow while its host lives (and an
  orphaned shadow culls); an `Exit`/`Adornment` while its room/wall lives;
  an engaged/spec `Behaved` NPC; a `WarrenMember` while in a warren
  (and an empty, unaffiliated `Location` culls). (tests)
- The shadow veto checks `host.isDestroyed()`, not `host.canEvict()`, and
  no host-defers-to-shadow reciprocal exists (no recursion). (test)
- `ApiLogic extends Idea` exists with `canEvict → veto`; **every**
  `obj/api/*Logic.ts` extends it; a `*Logic` singleton survives an
  enforce-mode sweep. (tests)
- `residency.*` AppSettings keys are defined, seeded, and read; changing
  `residency.eviction.mode` toggles enforcement without a restart.
- Subsystem doc `docs/subsystems/residency.md` exists and is linked from
  the CLAUDE.md documentation map.

## Cross-references

- **Seeding slate:** [residency-slate.md](../slates/builds/residency-slate.md)
- **Subsystem docs:**
  [lifecycle.md](../subsystems/lifecycle.md) (destruct choreography,
  `canDestruct`/`onDestruct`),
  [ref-shapes.md](../ref-shapes.md) (R2.1–R2.4 cleanup),
  [time.md](../subsystems/time.md) (`ScheduleApi.recurring`),
  [call-security.md](../subsystems/call-security.md) (proxy dispatch —
  the touch chokepoint),
  [app-settings.md](../subsystems/app-settings.md) (the knobs),
  [activity.md](../subsystems/activity.md) /
  [behavior.md](../subsystems/behavior.md) (engagement / spec vetoes).
- **Precedent:** `WeatherLogic.runBoundaryFanout` — the presence walk.
- **Future consumer:** the property slate's compute-dormancy
  (`enforce = freeze→evict`) is a resource-pressure eviction trigger that
  rides this `canEvict` context + `destruct` seam — the reason
  `EvictionContext` is extensible.
