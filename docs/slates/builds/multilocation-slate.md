# MultiLocation slate (working doc)

> **Status: substrate architecture set; build the social-elastic case
> (the lounge); procedural/spatial consumers deferred.** Elastic location
> instancing with coalescing: one room template, many ephemeral live
> instances forming a connected graph that **buds** as population rises
> and **merges** as it falls. The owner of each graph is a **Warren** (an
> incorporeal `Idea`, sibling to `Zone`), seated by a persistent **host**.

Working slate for **MultiLocation** — the substrate for rooms that aren't
singletons. A MultiLocation is one room *template* with many *live
instances* that coordinate as a group: the graph grows new rooms when it
fills and collapses them back when it empties. Think a dynamically
expanding desert, a procedural dungeon, or — the v1 driver — a social
**lounge** that sprouts rooms as people arrive and merges them as people
leave.

This is **not** classic MMO hard-shard instancing (parallel copies you
pick one of and can never cross). The instances here are **connected by
exits into one growing graph**, and they **merge back down**. The graph
is elastic, not sharded.

The load-bearing decisions (settled over the design conversation):

1. **The instance-graph and the spatial scope are orthogonal axes.**
   `Zone` is *where rooms physically are* (a coordinate frame, a bag of
   connected rooms, class-agnostic). "These N rooms are one elastic group
   that grows and merges together" is a **membership** fact with nothing
   to do with spatial scope. So `Zone` owns none of this — one zone can
   hold several elastic graphs plus ordinary singletons, and one elastic
   graph can thread across zones (the dungeon).

2. **Each graph is owned by a per-graph coordinator — the `Warren` — not
   the zone and not an arbitrary room.** A `Warren` is an incorporeal
   `Idea` (identity + state, no physical presence), sitting **right next
   to `Zone`** in the Idea branch. `Zone` owns a *fixed* set of
   `Location`s; a `Warren` owns an *elastic* one. It is **multi-instance**
   (not `SingletonMixin`): multiple lounges → multiple Warrens.

3. **host → Warren → members.** A **persistent host** seats the Warren
   (owns its lifecycle, holds the live-ref, recreates it on reload). The
   **Warren** (runtime-only) owns the **members** (ephemeral satellite
   rooms it spawns and reaps). The host is **never a member** — which is
   what gives it its permanence, and what makes the lifecycles clean.

4. **A Warren coordinates a heterogeneous composition via *roles*, each
   with a *cardinality policy* — not "one class."** A singleton is just a
   role pinned to min=max=1; an elastic pocket is a role at 1..N with a
   capacity+hysteresis policy. The dungeon (corridors + chambers + one
   boss + one entrance) forces this; the lounge uses a modest version of
   it.

5. **The Warren base is a working generic overflow-instancer; consumers
   are thin subclasses.** Least-full routing, star-to-host attachment,
   threshold-driven bud/merge come for free in the base. `LoungeWarren`
   overrides only `route` (matchmaking) and `seedMember` (flavor).

6. **Merging drains, it does not slam.** A room marked for merge stops
   *receiving* arrivals and lets its stragglers drift out naturally; it
   collapses only once nearly empty. Nobody is teleported mid-
   conversation. Hard-merge / never-merge are policy overrides for other
   consumers.

See also:

- [docs/subsystems/zone.md](../../subsystems/zone.md) — the orthogonal
  sibling. `Warren` and `Zone` are both incorporeal `Idea`s that own sets
  of `Location`s; they slice different axes (elastic membership vs spatial
  scope). The **cardinal-only-intra-zone exit invariant** is a real
  interaction to resolve (open questions).
- [docs/ref-shapes.md](../../ref-shapes.md) — host↔Warren and Warren↔member
  are **Pattern-B live refs** (within-session instances), with the
  R2.1–R2.4 cleanup rules. None of them are persisted.
- [docs/subsystems/slot.md](../../subsystems/slot.md) — the **cardinality /
  capacity** vocabulary the role model reuses (incl. `UNBOUNDED_CAPACITY`).
- [docs/subsystems/lifecycle.md](../../subsystems/lifecycle.md) /
  [state-model.md](../../subsystems/state-model.md) — the runtime-only vs
  persisted split (host persists; Warren + members are ephemeral, like
  `Login` and command-staging Stuff).
- [docs/subsystems/boundary.md](../../subsystems/boundary.md) — exit wiring
  on bud (the async `addExit` family) lives here.
- [docs/subsystems/spatial.md](../../subsystems/spatial.md) — members are
  `Location`s; the host is a `Location`.
- [docs/architecture.md](../../architecture.md) — the seven top-level
  branches (`Idea` is one); "orchestration lives one layer up from raw
  steps" (the Warren orchestrates existing Apis).
- [docs/slates/lounge-slate.md](../builds/lounge-slate.md) *(forthcoming)* — the
  v1 consumer: the social-elastic lounge, the preference-vector
  matchmaking, Dave's Bar. It *consumes* this substrate.
- [docs/slates/fast-travel-slate.md](../builds/fast-travel-slate.md) — the
  lounge's TPA terminal lives on the **host** (the stable commons), which
  is exactly why the host must be the permanent, never-reaped root.

---

## Principle

1. **Elastic, not sharded.** One template, many instances, connected into
   one graph that grows and merges — not parallel hard shards.
2. **Membership is orthogonal to spatial scope.** `Zone` owns neither the
   graph nor its coordination.
3. **One brain per graph, and it isn't a room.** The `Warren` coordinates;
   a persistent host seats it; members are ephemeral.
4. **Heterogeneous by role + cardinality.** Singleton and elastic are two
   settings of one knob, not two substrates.
5. **Thin consumers over a working base.** The base is a functioning
   generic overflow-instancer; subclasses override only decisions.
6. **Drain, don't slam.** Growth is diegetic ("a doorway opens"); collapse
   is gentle (drain-then-collapse).

---

## The model

### Zone is orthogonal — and stays out

A `Zone` is a spatial scope: a coordinate frame and a class-agnostic bag
of connected rooms. "These rooms are one elastic group" is a membership
fact, not a spatial one. The moment `Zone` owns coordination you've welded
two axes that must slide independently:

- One zone can hold **several independent Warrens** plus ordinary
  singleton rooms.
- One Warren can **span zones** (a procedural dungeon threading through
  five of them).

So coordination is keyed on **Warren identity**, never on zone.

### host → Warren → members

The runtime `Warren` is an `Idea` — so something must (a) create it,
(b) hold a live-ref so it's reachable, and (c) recreate it after a
restart. That "something" is the **host**, and recognizing that is what
dissolves the earlier "anchor" idea: the permanent root isn't a special
*member*, it's the *seat*.

| Role | Branch | Lifetime | Responsibility |
|---|---|---|---|
| **host** | `Location` (+ host mixin) | **persistent** | Seats the Warren: creates it, holds the live-ref, recreates on reload, decides *when* it exists. Never a member. Carries stable fixtures (e.g. the lounge's TPA terminal + the exit to Dave's). |
| **Warren** | `Idea` (multi-instance) | **runtime-only** | Owns the member set; the reconcile loop; spawn/reap; exit-wiring; `admit()` / `teardown()`. |
| **member** | `Location` (+ member mixin) | **runtime-only** | An ephemeral satellite the Warren spawned. Reaped on collapse. |

The host is structurally **un-reapable by the graph's own logic** because
it *owns* the Warren rather than being owned by it. The "permanent anchor"
property falls out of the ownership direction — no never-reap flag needed.

**The host owns *when* the Warren exists, too:**

- **Lounge host** spins the Warren up at boot, never tears it down — the
  graph is perpetual.
- **Dungeon host** (a persistent threshold room, the cave mouth) spins the
  Warren up on party entry, tears it down on run completion — the graph is
  per-run.

So "host seats the Warren" subsumes both *who keeps it alive* and *when it
exists*.

### Lifecycle, persistence, refs

Only the **host persists.** The Warren and all members are runtime-only.

- **Restart is trivial:** host reloads from persistence → host mixin
  recreates the Warren → Warren starts with **zero members** → first
  arrival lands in the host (commons) or buds the first satellite. No
  "re-adopt the persistent member" special case, because the host was
  never a member.
- **All graph refs are Pattern-B live refs**, none persisted:
  host↔Warren (mutual, rebuilt on host reload) and Warren↔member (mutual;
  R2.x cleanup reaps members when the Warren dies and drops a member from
  the set when it is individually reaped). The host's `warren` field is a
  *transient* slot, not a persisted field — the correct "don't persist
  live refs" behavior anyway.

*(The honest general definition is "host = whatever owns the Warren's
lifecycle" — usually a persistent threshold `Location`, occasionally a
runtime run-context for a fully-summoned graph with no fixed room. v1 only
needs the room case.)*

### Roles + cardinality

A Warren manages a **role catalog** (data), not a single class. Each role
is `(template × cardinality policy × attachment)`:

- **Singleton role** — min=max=1, never-merge. The dungeon's boss, its
  entrance.
- **Elastic role** — 1..N with a capacity + hysteresis policy. The lounge
  satellites; the dungeon corridors.

"Singleton vs MultiLocation" collapses into one knob — the same vocabulary
as slot capacity and the command-layer cardinality policy.

**Membership discriminator** — *does the room's existence and placement
depend on the Warren's policy?*

- **Yes → member.** The dungeon boss exists because the run brain placed
  exactly one and wired it in. A singleton, but coordinated.
- **No → external.** Dave's Bar persists on its own, has its own NPC and
  life, and doesn't care about lounge population. It's a **neighbor**
  reached by a plain exit from the host, **not** a member. Don't absorb
  rooms that don't need coordinating.

So the lounge Warren owns `{ host-commons (the seat), satellites:
elastic-role }`. Dave's is outside. A dungeon Warren owns `{ entrance:
singleton (and host), corridors: elastic, chambers: elastic, boss:
singleton }`.

### The Warren class hierarchy

A **concrete base + a few overridable decisions** (template-method +
strategy-by-subclass). The base is itself a working coordinator.

**Common (base impl):** the member set, the host backref, spawn/reap
mechanics (orchestrating `StuffApi.clone`/`destruct` + the boundary
subsystem — *no new Api*), the reconcile loop, exit-wiring, `admit()`,
`teardown()`. That public surface — `admit(actor) → Location`,
`teardown()`, `getMembers()`, self-driven `reconcile()` — **is the common
interface** the host talks to; it never knows the concrete subclass.

**Varies three ways (not all subclassing):**

| Concern | Mechanism |
|---|---|
| member set, spawn/reap, reconcile, exit-wiring, teardown, `admit()` | **base impl** |
| capacity / hysteresis thresholds | **config data** (default predicate consumes it) |
| role catalog (templates × cardinality) | **data** |
| routing / admission decision | **override** `route(actor)` |
| topology / attachment | **override** `attachmentFor(member)`, default star-to-host |
| per-member seeding (flavor / contents) | **override hook** `seedMember(member)`, default no-op |

The base defaults — least-full `route`, star-to-host `attachmentFor`,
no-op `seedMember`, threshold-driven bud/merge — add up to a complete
**generic overflow-instancer** (host + one elastic role, bud at capacity,
merge below the floor). So:

```
Warren                  (concrete: generic least-full overflow)
  └── LoungeWarren        overrides route()      = preference-vector matchmaking
                          overrides seedMember() = synthesize the room's "flavor order"
```

`LoungeWarren` touches exactly two seams. A dungeon Warren would override
more (`route` = generation, `attachmentFor` = spatial adjacency,
`seedMember` = contents, plus a multi-role catalog) — the right signal
that a dungeon is *further* from generic overflow than the lounge is.

**The hierarchy stays shallow on purpose.** Today the only concrete
subclass is `LoungeWarren`. The two families you can see coming —
*social-elastic* (lounge, future hangouts) and *procedural-spatial*
(dungeon, expanding desert) — are **predicted, not built**; no
`SocialWarren` / `ProceduralWarren` mid-tier until a *second* consumer in
a family actually shares specialization.

### Bud / merge mechanics

The work the reconcile loop executes. The central enemy is **thrash**.

- **Hysteresis (two watermarks + time).** **Bud** when a member exceeds
  **N**; **merge** two members when their combined load fits under **M**,
  with **M comfortably below N** (the count gap that stops oscillation).
  Plus **time hysteresis** — an emptied member waits out a short reap
  grace, so stepping out and back doesn't collapse a room under you.
- **Budding (easy, diegetic).** "A new doorway opens." New satellite
  attaches **star-to-host** for the lounge (every satellite keeps an exit
  back to the commons); `attachmentFor` override for spatial consumers.
- **Merging = drain-then-collapse (the hard UX).** A member flagged for
  merge stops *receiving* arrivals and routes stragglers toward the target
  as they'd naturally move; it collapses only once nearly empty, with the
  fiction carrying it ("the room quiets and you drift toward the
  commons"). Never yank someone mid-chat. Hard-merge / never-merge remain
  `shouldMerge`-policy overrides (a dungeon may prefer them).

---

## Worked scenario — the lounge graph over an evening

1. **Quiet night.** One player logs in. Host commons exists; Warren has
   zero members. Player socializes in the commons.
2. **It fills.** Arrivals push the commons past **N**. The Warren buds a
   satellite (`route` matchmaking seeds it from the newcomer's flavor),
   wires a doorway back to the host. "A new doorway opens to the east."
3. **It clusters.** Further arrivals are routed by `LoungeWarren.route` to
   the satellite whose aggregate flavor best matches them, or bud fresh
   ones — the graph grows **along preference clusters**.
4. **It thins.** People leave via the host's TPA terminal. A satellite
   drops below **M** combined with a sibling. It's flagged for merge:
   stops receiving arrivals; stragglers drift back toward the commons as
   they move.
5. **Collapse.** Once nearly empty and past the reap grace, the husk
   satellite is reaped; its doorway closes. R2.x cleanup drops it from the
   Warren.
6. **Restart mid-evening.** The server bounces. Host reloads (persistent);
   recreates the Warren (zero members); everyone re-lands in the commons
   and the graph re-grows from population. The TPA terminal — on the host
   — survived.

---

## Module taxonomy fit

Nothing new is invented:

- **`Warren`** — an `Idea` subclass (a Stuff class — allowed category).
  Multi-instance, runtime-only.
- **host mixin** + **member mixin** — Mixins (allowed). Open whether
  these are one role-flagged mixin or two.
- **No Api, no registry, no global singleton.** Per-graph instances rooted
  by a host. The Warren *orchestrates* existing Apis (`StuffApi`,
  boundary) — the composition lives on the Warren, the raw steps go
  through the Api layer.

---

## Open questions / forks

1. **Base concrete-with-defaults vs abstract + an `OverflowWarren` default
   subclass.** *Lean concrete-with-defaults* (so "lounge is thin" is
   literally true); a plan-time taste call.
2. **One mixin or two on the room side** (host vs member). The host has
   the lifecycle-rooting job; members are lighter. *Lean: probably two.*
3. **Exit kind between members and host, and the cardinal-only-intra-zone
   invariant.** [zone.md](../../subsystems/zone.md) rejects *semantic-label*
   exits between rooms in the **same** zone (they're allowed only
   cross-zone). Star-to-host doorways are semantic, not cardinal — so if
   lounge members share one Cartesian zone this invariant bites. *Likely
   resolution: the lounge isn't on a Cartesian coordinate frame at all
   (it's a social pocket, no real geography)* — but confirm the zone type
   for members at plan time.
4. **Reconcile trigger + debounce.** Which population events fire the loop,
   and how it's batched (the `setImmediate`-style batching the
   subscription substrate already uses is a candidate).
5. **Watermark values (N, M) + reap-grace duration.** Content/config
   tuning, not engine constants.
6. **The summoned-graph host** (no persistent room → a runtime run-context
   seats the Warren). Deferred; v1 is the room-host case only.
7. **Does the host/commons participate in flavor/matchmaking, or stay a
   neutral hub?** *Leans lounge-slate concern, not substrate* — flagged
   here because the base treats the host as outside the member set.

---

## Build order

**Wave 1 — the substrate (social-elastic).** The `Warren` base (working
generic overflow) + the host mixin + the member mixin + the role/cardinality
model + budding (star-to-host, capacity N) + merging (drain-then-collapse,
hysteresis M + reap grace) + the lifecycle/persistence/ref shapes +
`admit` / `reconcile` / `teardown`. Proven by `LoungeWarren` (the lounge
slate's consumer) — or a trivial overflow test consumer first.

**Wave 2+ — procedural-spatial family (deferred).** The dungeon's
multi-role catalog + spatial `attachmentFor` + generation `route` +
per-run host teardown; the expanding desert. Each its own cycle; do **not**
build the generator now — only ensure the role/cardinality + override
seams admit it.

---

## What this slate does NOT cover

- **The lounge content** — the preference-vector matchmaking math, the
  pizza/cocktail flavor skin, Dave's Bar + employment → the **lounge
  slate** (the v1 consumer). This slate is the substrate it rides.
- **The dungeon / desert consumers** — their own slates and cycles; only
  the seams they'll need are validated here.
- **Fast travel / TPA** → [fast-travel-slate.md](../builds/fast-travel-slate.md);
  the terminal merely *lives on the host*.
- **Zone internals** → [zone.md](../../subsystems/zone.md). MultiLocation is
  orthogonal to it.
- **Onboarding's use of the lounge** → [onboarding-slate.md](../builds/onboarding-slate.md),
  which today describes the lounge as a *single* mini-zone; the lounge
  slate will amend that to an elastic Warren.

---

## Once shaped into formal requirements

This slate boils down to:

- The **`Warren`** — a multi-instance, runtime-only `Idea` (sibling to
  `Zone`) that owns an **elastic graph of member `Location`s**, orthogonal
  to spatial scope.
- The **host → Warren → members** ownership chain: a persistent host seats
  a runtime Warren that owns ephemeral members; the host is never a
  member; it owns *whether and when* the Warren exists. Restart rebuilds
  from the host. All graph refs are non-persisted Pattern-B live refs.
- The **role + cardinality** model (singleton = min/max 1; elastic = 1..N
  + capacity/hysteresis), with the membership discriminator
  (coordinator-placed → member; independently-alive → external neighbor).
- The **concrete base Warren** (generic least-full overflow: `route` /
  `attachmentFor` / `seedMember` defaults + threshold-driven bud/merge) +
  **`LoungeWarren`** overriding `route` + `seedMember`; thresholds and the
  role catalog as **data**, not subclassing.
- **Bud** (star-to-host, capacity N, diegetic doorway) and **merge**
  (**drain-then-collapse**, watermark M < N, reap grace) mechanics, with
  hard/never-merge as policy overrides.
- The common interface: `admit(actor) → Location`, `teardown()`,
  `getMembers()`, self-driven `reconcile()`.
- Tests: a graph buds past capacity and the new room has a doorway home; a
  thinning room **drains** before collapse (no one is moved mid-stay); the
  host survives a restart with zero members and the graph re-grows; two
  Warrens coexist in one zone independently; an external neighbor (Dave's)
  is reachable but never reaped by the Warren; live refs clean up on
  member reap and on Warren teardown.

The procedural-spatial family (dungeon, desert), the summoned-graph host,
and the lounge's matchmaking math wait for their own work.
