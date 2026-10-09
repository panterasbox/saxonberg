# Routing slate — the tail of *one traversal, or none*

> **Status: SHIPPED ✅ MR!350** — the pathfinding slate's one open
> question (*should a shared pathfinder exist at all?*) is answered:
> yes, and `lint:graph-walks` holds the hand-written-walk count at
> **zero**. Eleven walks were measured on an untouched tree — the
> slate's own census said three, over three graphs; the instrument
> found eight more, four of them order-dependent in ways players
> could perceive.
> **Left:** seven attach points, each with a named destination; two
> content gaps the build surfaced and did not close (75 of 128 places
> declare no address; a `walked` claim does not record what you were
> driving); and one vacancy — `knows:` makes a **guide** an
> economically coherent role for the first time.
> **Size:** a tail — the seven attach points are a sitting each, the
> two content gaps are authoring, and none of it blocks anything.

Supersedes `builds/pathfinding-slate.md` (retired at the sweep). The
design is [location-graph.md § Routing](../../subsystems/location-graph.md);
this file holds only what was deliberately not built.

---

## What the build decided, so nobody re-opens it

- ⭐⭐⭐ **A plan is a hypothesis.** It carries `assumptions` as a
  first-class field, because both knowledge sources can be wrong in
  different ways and the defect would be a plan that did not say so.
- ⭐⭐ **The firewall is STRUCTURAL.** `Traversal` · `KnowledgeGraph` ·
  `TravelProfile` · `RoutePlan` may import nothing that reaches the
  index; `lint:graph-walks`' second check holds it with no ceiling. A
  map planner that *could* reach the index would eventually consult
  it, not maliciously but because it was convenient once.
- ⭐⭐ **Cost is quoted in the currency the traveller pays.** Legs on
  foot, minutes under a conveyance. Ordinary movement is instantaneous
  and free by design, so quoting a pedestrian a duration teaches a
  figure the world declines to collect.
- ⭐⭐ **Incomparable plans both come back** and the engine does not
  pick. ⚠ Stated plainly: that is a per-axis subset of the Pareto
  front, not a full multi-objective search.
- ⭐ **The matrix ships without an optimiser**, deliberately. The
  engine computes what the roads cost; the player decides which stop
  to make first.
- ⭐ **A budget is a PERFORMANCE bound, never a knowledge one.** What a
  character knows is its author's (`knows:`); what it may think about
  in one beat is the operator's.
- ⭐ **Routing is the engine's only NODE-naming consumer.** Rooms are
  lazily loaded and the usual handle for reaching one is an **exit** —
  pathfinding cannot take that deal, because the exit sequence is its
  output. That is why the durable handle is load-bearing here and
  `#<stuffId>` is only a convenience (it resolves iff the room is
  resident).
- ⚠ **Two callers keep their own neighbour reader**, each for a reason:
  mine air reads `getExits()` (a hidden heading still has air in it)
  and the forage census admits a destination that is not a
  `Container`. Routing either through the shared guards would quietly
  change a number.

---

## The seven attach points

| what | the seam that exists | → |
|---|---|---|
| **Hierarchical search (HPA\*)** | `source: 'world'` + `extent` already materialises one subtree sync after an async load; `interzoneSkeleton` is the coarse graph | a tail beside `map-slate`, when the realm has a fourth corridor |
| **Service legs** | `RouteLeg` grows `kind: 'exit' \| 'service'` with `{board, fee, departures}` from `node.travel`, admitted only when `departures === null`; timetabled routes stay refused | `fast-travel-slate` |
| **The compute allowance** | every outcome carries `expanded` — the meter's input, and nothing else is built | parcel / governance |
| **Containment-graph walks** | `Traversal` is generic over `N`; a containment `neighbours` is one function. ⚠ `FireLogic` is the standing case and the gate records why it is excluded | a named later wave |
| **Client-side planning** | the core's import allowlist is the property that lets it move; `fromClaims` + `Traversal` + `RoutePlan` are wire-shippable today | `map-slate` |
| **`told` provenance on claims** | *"somebody said"* as an assumption source | accountability, as already filed |
| **The tour / several-stop verb** | `costMatrix` + the `route between` reader | cargo |

---

## ⚠⚠ Two content gaps the build surfaced and did not close

### 1 · 75 of 128 places declare no address

An address names a **collection** of rooms and a keyword picks within
it — which is what makes naming a destination tractable, since giving
every room a unique address does not work (you get `old-road-12` and
`desert-34x95`, and only half of that is legible).

Measured at the build: **53** places carry an `_address`, 52 of them
distinct, **zero** last-segment collisions. **127 of 128 already author
keywords**, and scoped to one address exactly **one** bucket in the
whole realm has an internal keyword collision.

So the keyword tier is free and the collection tier is thin. For the
75 unaddressed places the only durable handle is the row path — the
one thing that must never reach a player — so `route` falls back to
the banked short description there. ⭐ That gap is what stands between
this verb and a fully typeable UX, and it is **authoring**, not code.

→ `address.md` / the locality packs.

### 2 · A `walked` claim does not record what you were driving

So a map knows a way exists and cannot know whether a cart fits
through it, and `route … by wagon` refuses in words and names
`journey` instead. The honest alternatives were both worse: reading
"no media recorded" as "a footpath" refuses every conveyance with a
mode-break sentence about needing `ground`, and inventing an
assumption would have the engine telling a player something their map
never recorded.

→ `map-slate`, as a claim-shape question.

---

## ⭐ And one VACANCY, which is the interesting one

`knows:` makes a character's knowledge of the way **authorable**,
which makes a **guide** an economically coherent role for the first
time: somebody whose stock-in-trade is a map nobody else has. The
build created the hole and filled nothing.

→ `vocations.md`'s gap list.

---

## Cross-references

- [location-graph.md § Routing](../../subsystems/location-graph.md) — the design
- [logistics.md § Routing](../../subsystems/logistics.md) — the three standing decisions this build overturned, with the superseded text kept
- [lint-family.md § `lint:graph-walks`](../../lint-family.md) — the census, the two checks, the three false positives
- [builds/logistics-slate.md](../builds/logistics-slate.md) — the cost surface
