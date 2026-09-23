# MultiLocation slate (working doc)

> **Status: PARTIAL** — the Warren substrate, the two tiers and the
> lounge shipped → [location.md](../../subsystems/location.md)
> **Left:** the procedural-spatial Warren family (the dungeon, the
> desert) — including the generic multi-role/cardinality catalog a
> heterogeneous graph needs (today's base ships one elastic role + a
> host, not a data-driven catalog), spatial `attachmentFor`,
> generation-driven routing, per-run host teardown · the summoned-graph
> host (v1 only handles the persistent-room case) · the lounge's
> preference-vector matchmaking (`admitArrival` ships least-full only;
> no `seedMember` flavor hook exists yet) — owned by `lounge-slate.md` ·
> an active drain for a room pending merge (today's `reconcile` is a
> passive occupancy-watch + timed reap; a new arrival can still land in
> a room whose reap timer is already running)
> **Size:** a build

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

*(Decisions 1–3 — Zone/Warren orthogonality, the Warren as a
multi-instance incorporeal `Idea`, the host→Warren→members ownership
chain — shipped and are documented at
[location.md § Core model](../../subsystems/location.md#core-model),
[§ The pieces](../../subsystems/location.md#the-pieces).)*

4. **A Warren coordinates a heterogeneous composition via *roles*, each
   with a *cardinality policy* — not "one class."** A singleton is just a
   role pinned to min=max=1; an elastic pocket is a role at 1..N with a
   capacity+hysteresis policy. The dungeon (corridors + chambers + one
   boss + one entrance) forces this; the lounge uses a modest version of
   it.

*(Decision 5 — "the base is a working generic overflow-instancer;
consumers are thin subclasses" — shipped, and more thoroughly than
envisioned: the base (`Warren`/`InnerWarren`/`OuterWarren`) is reused by
`LoungeWarren`, `DormWarren`, `BuildingWarren`, `PlatWarren` and
`MineWarren` — see [location.md § The pieces](../../subsystems/location.md#the-pieces),
[holding.md](../../subsystems/holding.md). Its specific claim about
`LoungeWarren` is superseded by what shipped: there is no `route()` or
`seedMember()` override. `LoungeWarren.admitArrival` is least-full only
— no matchmaking — and rooms clone bare, with no per-member flavor
seeding hook. See [location.md § Base mechanism vs lounge
policy](../../subsystems/location.md#base-mechanism-vs-lounge-policy).)*

*(Decision 6 — "merging drains, it does not slam" — shipped simpler than
designed. `LoungeWarren.reconcile()` is a passive occupancy-watch: a
satellite under the merge watermark gets a delayed reap timer, re-checked
at fire time, but nothing stops new arrivals from being routed into it
while the timer runs — least-full routing can in fact prefer it, since
low occupancy is exactly what least-full seeks. There is no "stops
receiving arrivals" admission block and no active rerouting of
stragglers. See `LoungeWarren.reconcile`/`admitArrival`
(`packages/server/src/mud/world/lounge/idea/LoungeWarren.ts`). Not
documented as more than it is — `location.md` doesn't claim active
draining either — so this is a build gap, not a doc gap.)*

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
- [docs/slates/builds/lounge-slate.md](../builds/lounge-slate.md) — the
  v1 consumer: the social-elastic lounge, the preference-vector
  matchmaking, Dave's Bar. It *consumes* this substrate. (Written since
  this slate was drafted — no longer "forthcoming.")
- [docs/slates/fast-travel-slate.md](../tails/fast-travel-slate.md) — the
  lounge's TPA terminal lives on the **host** (the stable commons), which
  is exactly why the host must be the permanent, never-reaped root.

---

## Principle

*Principles 1–3 and 5 (elastic not sharded · membership orthogonal to
`Zone` · one brain per graph that is not a room · thin consumers over a
working base) shipped and are stated with their why in
[location.md § Core model](../../subsystems/location.md) + § Base
mechanism vs lounge policy (doctrine-homing pass, 2026-09-21). The two
that remain are the unbuilt half:*

4. **Heterogeneous by role + cardinality.** Singleton and elastic are two
   settings of one knob, not two substrates.
6. **Drain, don't slam.** Growth is diegetic ("a doorway opens"); collapse
   is gentle (drain-then-collapse).

---

## The model

*(The "Zone is orthogonal" and "host → Warren → members" design shipped
as-is and is documented at
[location.md § Core model](../../subsystems/location.md#core-model),
[§ The pieces](../../subsystems/location.md#the-pieces). The host is
structurally un-reapable because it owns the Warren rather than being
owned by it — no never-reap flag needed. What's still open below is
which kind of host: v1 only ships the persistent-room case.)*

**The host owns *when* the Warren exists, too — the room-host case ships,
the run-context case doesn't:**

- **Lounge host** spins the Warren up at boot, never tears it down — the
  graph is perpetual.
- **Dungeon host** (a persistent threshold room, the cave mouth) spins the
  Warren up on party entry, tears it down on run completion — the graph is
  per-run.

So "host seats the Warren" subsumes both *who keeps it alive* and *when it
exists*.

*(Lifecycle/persistence/refs shipped and is documented at
[location.md § Core model](../../subsystems/location.md#core-model)
("Lazy + runtime-only"), [§ Concurrency](../../subsystems/location.md#concurrency);
the Pattern-B ref discipline is [ref-shapes.md](../../ref-shapes.md).)*

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

*(The membership discriminator — coordinator-placed → member,
independently-alive → external neighbor — shipped, proven by Dave's Bar,
and is now documented at
[location.md § Core model](../../subsystems/location.md#core-model).)*

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

*(This paragraph's specific diagram — `LoungeWarren` overriding `route()`
for matchmaking and `seedMember()` for flavor — is superseded; see the
note under decision 5 above. What shipped is thinner: `admitArrival`
least-full only, no flavor. A dungeon Warren would still need to override
more — spatial `attachmentFor`, generation-driven routing, per-member
contents, plus a multi-role catalog — which remains the signal that a
dungeon is further from generic overflow than the lounge is.)*

**The hierarchy stays shallow on purpose.** Today the only concrete
subclass is `LoungeWarren`. The two families you can see coming —
*social-elastic* (lounge, future hangouts) and *procedural-spatial*
(dungeon, expanding desert) — are **predicted, not built**; no
`SocialWarren` / `ProceduralWarren` mid-tier until a *second* consumer in
a family actually shares specialization.

*(Hysteresis + budding shipped and are documented at
[location.md § Base mechanism vs lounge
policy](../../subsystems/location.md#base-mechanism-vs-lounge-policy).
The "merging = drain-then-collapse" design here is superseded by what
shipped — see the note under decision 6 above: `reconcile()` is a
passive occupancy-watch + timed reap, with no admission block on a
pending-merge room and no active straggler rerouting. Hard/never-merge
policy overrides remain undesigned beyond this mention.)*

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

*(Module taxonomy fit shipped as envisioned, with one resolution:
there is no separate host mixin — the host is a runtime role any
`WarrenMemberMixin`-composing room can be designated, not a distinct
composed capability. See
[location.md § The pieces](../../subsystems/location.md#the-pieces).)*

---

## Open questions / forks

*(Q1–Q5 are resolved. Q1: shipped differently than the lean — not a
concrete-with-defaults base, but an abstract `Warren` with an abstract
`InnerWarren`/`OuterWarren` tier split (see
[holding.md § Every warren is inner or outer](../../subsystems/holding.md#every-warren-is-inner-or-outer-and-the-compiler-asks)),
a generalization axis nobody in this slate predicted. Q2: shipped
differently than the lean — zero host mixins, one `WarrenMemberMixin`
(see the Module taxonomy note above). Q3: resolved, and not the way this
slate guessed — the lounge **is** on a `CartesianZone`
(`/world/lounge`), not a geography-less social pocket; the invariant
never bites because the star-to-host doorways are ordinary **cardinal**
exits, never semantic labels (see
[zone.md § Cardinal-only-intra-zone exit invariant](../../subsystems/zone.md#cardinal-only-intra-zone-exit-invariant)
and the "every location plots" doctrine at
`packages/content/saxonberg-lounge/content/world/lounge.yaml`). Q4:
shipped (`queueMicrotask` coalescing on `notifyPopulationChange`) and
documented at
[location.md § Concurrency](../../subsystems/location.md#concurrency).
Q5: shipped as tunable code constants, not yet promoted to `AppApi` —
documented at [location.md § Base mechanism vs lounge
policy](../../subsystems/location.md#base-mechanism-vs-lounge-policy).)*

6. **The summoned-graph host** (no persistent room → a runtime run-context
   seats the Warren). Deferred; v1 is the room-host case only.
7. **Does the host/commons participate in flavor/matchmaking, or stay a
   neutral hub?** *Leans lounge-slate concern, not substrate* — flagged
   here because the base treats the host as outside the member set.

---

## Build order

*(Wave 1 — the substrate — shipped; proven by `LoungeWarren` and reused
since by `DormWarren`/`BuildingWarren`/`PlatWarren`/`MineWarren`. See
[location.md § The pieces](../../subsystems/location.md#the-pieces).)*

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
- **Fast travel / TPA** → [fast-travel-slate.md](../tails/fast-travel-slate.md);
  the terminal merely *lives on the host*.
- **Zone internals** → [zone.md](../../subsystems/zone.md). MultiLocation is
  orthogonal to it.
- **Onboarding's use of the lounge** → [onboarding-slate.md](../builds/onboarding-slate.md),
  which today describes the lounge as a *single* mini-zone; the lounge
  slate will amend that to an elastic Warren.

---

*(This slate was shaped into
`docs/requirements/multilocation-lounge-requirements.md` and
`docs/plans/multilocation-lounge-plan.md`, built, and both ephemeral
docs have since been retired per the workflow's retirement rules — see
[location.md § MultiLocation](../../subsystems/location.md#multilocation--the-warren-elastic-graph-substrate--the-lounge).
What that build did not cover is exactly this slate's `Left`, above.)*
