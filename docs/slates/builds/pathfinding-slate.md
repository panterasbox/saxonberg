# Pathfinding slate — one graph search, or none

> **Status: UNBUILT** — ⚠ **three independent graph searches already
> ship**, over three different graphs with three different admission
> rules, and none knows about the others. No shared primitive exists;
> [logistics.md § Routing](../../subsystems/logistics.md) holds the
> standing decision *no general pathfinding Api yet — promote the walk
> when a second edge set needs search*.
> **Left:** ⭐⭐ decide whether a shared pathfinder should exist at all
> (the pets build concluded *not for animals*; the economic bootstrap
> concluded *not for a shopkeeper crossing her own street* — see the
> second datum below, where the answer was authored directions) · the graph vocabulary —
> exits vs lanes vs conduits vs the elastic Warren · the cost model
> (legs · distance · difficulty · mode) · where it lives, given
> `lint:object-verbs` forbids a subject-first Api static · whether the
> two shipped walks migrate onto it
> **Size:** **a build** — it is a substrate question with three existing
> consumers, and the wrong answer is a shared abstraction nobody's
> consumer actually fits

**Captured 2026-09-16**, in review of the pets MR (!257), when the user
stopped a fourth walk from being added to `MobileMixin`. ⚠ **Twice now:
2026-09-23, in review of the economic-bootstrap MR (!272)**, when the
same walk was hoisted onto `NPC` — the second datum below.

**Provenance:**

> **User: "what's with this `Mobile.firstStepToward()` method. is this
> pathfinding? Because if we're going to introduce pathfinding into the
> game let's do it in one place for every consumer to share."**

The answer was yes, it was pathfinding, and it was reverted. ⭐ **The
pets build then found it did not need any** — see *What pets did
instead* below, which is the most useful finding here.

**Sits on:** [location.md](../../subsystems/location.md) (the room graph
and the elastic Warren) · [logistics.md](../../subsystems/logistics.md)
(induced lanes, the Route/Journey) · [boundary.md](../../subsystems/boundary.md)
(`Exit.canTraverse` — the admission rule) ·
[locomotion.md](../../subsystems/locomotion.md) (modes, which a cost
model would have to respect).

---

## The census — three searches, measured at `868c35b46`

| where | graph | admission rule | shape |
|---|---|---|---|
| `platform/idea/api/FireLogic.ts` | rooms via exits | can fire spread through the opening | flood fill, `visited` set |
| `content/transport/src/idea/LaneCatalogue.ts` `planRoute` | a **compiled lane adjacency set**, not rooms | shortest in **legs** | BFS with a `prev` map |
| *(reverted)* `Mobile.firstStepToward` | rooms via exits | `exit.canTraverse(mover, 'walk').ok` | BFS, first step only |

⚠⚠ **Note what the table shows: the graphs are not the same graph.**
Transport does not walk rooms at all — it walks a compiled lane network.
Fire ignores whether anybody could *walk* through an opening. A shared
"pathfinder" that serves all three has to abstract over the edge set AND
the admission predicate AND the cost, at which point it is a graph
library with three callers, and it is worth asking whether that is
better than three honest twenty-line searches.

⭐ That is the real question this slate exists to answer, and *"obviously
yes, share it"* is not a foregone conclusion.

---

## ⭐⭐ What pets did instead, and why it is the more interesting result

Shipped as **memory, not navigation** — `BondedMixin.rememberPlace`'s
trail + the `homes` brain; [pets.md § The brains — `homes`](../../subsystems/pets.md).

⚠ **So the first question for any pathfinding build is whether its
consumer wants a path at all.** One of the three walks above turned out
to want memory; it is worth asking the same of the other two before
building something for them to share.

---

## ⭐⭐ The second datum: the economic bootstrap, 2026-09-23

The same move was made again and caught again, and what it turned into
is worth more than the catch.

The bootstrap's `stocks` brain needed a shop keeper to reach her bank
and her wholesaler, so the `consigns` walk was hoisted out of that brain
onto **`NPC.walkTo`** — a public method on the kernel NPC base class, in
reach of all 38 NPC rows. No new search (it called the same
`LaneCatalogue.planRoute`), but it planted *an NPC routes itself* as
kernel surface ahead of this slate, which is exactly what
`Mobile.firstStepToward` did one layer down.

> **User: "either lose pathfinding from this build or let's actually
> talk about it."** And then, of a three-option menu that graded the
> damage: *"things were in a fucked state, and you made it more fucked,
> so your solution is to make it just fucked instead of more fucked."*

⭐⭐⭐ **The finding that answered it: the errand was two rooms.** The
general store is ON the counting-house block — its only exit is south
onto the avenue, the bank is one west of that and the wholesaler one
south. The keeper was running a breadth-first search over a compiled
**inter-city freight network** to walk two doors down her own street.
The pathfinding was never load-bearing; it was reached for because the
neighbouring brain had reached for it.

**What shipped instead:** `stocks` walks **authored directions** — a
`ways: [{to, go: [...], back: [...]}]` list on the keeper's row, the
shipped `patrols` shape — and searches nothing. `NPC.walkTo` is gone;
`consigns` is byte-identical to what logistics shipped.

Three things this adds to the questions below:

1. ⭐⭐ **Ask how far the consumer is actually going.** Pets wanted
   memory, not navigation. A shopkeeper wants *the way she knows*, not a
   route — she is going two doors. Of the consumers examined so far,
   exactly one (`consigns`, producer's yard → city counter) has an
   errand a router is the honest answer to. A pathfinder built for a
   census of consumers may find the census is one.
2. **Authored routes are a real third answer**, beside *search* and
   *memory*: content, zero code, zero runtime cost, and a wrong one
   fails visibly in the content that got it wrong. They are also the
   only one of the three that lets a second general store in another
   town need no pack code at all.
3. ⚠ **The promotion trigger held and was misread.** `logistics.md §
   Routing` says promote when *a second EDGE SET needs search*; what
   existed was a second **consumer of the same edge set**. Worth
   restating in whatever this slate becomes, because the misreading was
   natural and cost a review round.

---

## If it is built anyway — the questions it must answer

1. **Which graph.** Rooms-via-exits and the compiled lane network are
   different objects. Conduits ([watershed.md](../../subsystems/watershed.md))
   are a third. The elastic Warren ([location.md](../../subsystems/location.md))
   mints rooms on demand, so its graph is not fully enumerable ahead of a
   walk.
2. **The cost model.** Transport counts **legs** because that is what a
   traveller experiences. A walking animal would count rooms. A hauler
   would count difficulty and mode. These are not the same number and a
   shared search has to take it as a parameter.
3. **Where it lives.** ⚠ `lint:object-verbs` forbids an Api static whose
   first parameter is a world object, so `NavApi.pathFrom(room, …)` is
   out. The candidates are a method on the **room** (`Exitable.routeTo`)
   — the graph is made of rooms, so the node owning the question is
   defensible — or a value object in `lib/`, which then meets the
   `lint:lib-statics` ceiling.
4. **Cost at runtime.** A per-beat search across a live world is a very
   different bill from a compiled adjacency set consulted once.
   Transport compiles its lanes for exactly this reason.
5. **Do the two shipped walks migrate?** If they do not, the shared
   primitive has one consumer and should not exist. ⭐ That is the
   acceptance test for this build.

---

## What is NOT in scope

- **The pets `homes` brain.** It is memory-based and stays that way; it
  is a worked example of the *"does this consumer want a path?"*
  question, not a future migration target.
- **`FireLogic` and `LaneCatalogue` as written.** Both work. They are the
  census, and whether they move is decided by question 5 rather than
  assumed at the start.
