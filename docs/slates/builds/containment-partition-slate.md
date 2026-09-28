# Containment partition slate — where inside a container a thing sits

> **Status: UNBUILT** — the concept is unnamed. One instance of it ships
> (`restingOn`, surfaces), a second is wanted (chambers, for the
> fridge/freezer), and the shared read is a filter helper on an Api with
> no receiver.
> **Left:** name the concept · move the read onto `Container` · decide
> whether a chamber is an instance of it · the presentation contract the
> four render surfaces share · keep `Location` out of it
> **Size:** a design pass, then a wave

> Written 2026-09-27 out of the base-class-narrowing census, which kept
> failing to answer *"what is a `Vessel`"* because the model has no word
> for the thing it kept bumping into.

See also:

- [spatial.md](../../subsystems/spatial.md) — `Container`/`Containable`,
  the model this must not break.
- [fridge-design-pack](./fridge-design-pack.md) — the multi-chambered
  fridge/freezer, the consumer that reopened the question.
- [legibility-slate](./legibility-slate.md) Part C — contents
  presentation, the four disagreeing renders, and `looseContents` as
  their one point of agreement.
- [base-class-narrowing-slate](./base-class-narrowing-slate.md) — ⛔ this
  blocks it. No class gets renamed until this lands.

---

## ⭐⭐ The gap, stated

**A container's contents are partitioned by *where inside the container*
a thing sits, and the model has no word for that.**

One instance ships. A mug on a desk in a room has `container = the
room`, `restingOn = the desk` — `Surfaced` *"doesn't enclose"*
(`lib/spatial/Surfaced.ts:6`) and holds no list of its own; it derives
its contents by a **lazy walk over the environment's single list**,
filtering on the back-reference (`:123-129`, `const candidates =
env.getContents()`).

⭐ **That shape is right and should be the model's, not a helper's.** It
keeps the promise `Container` makes — *a container is a list of
containables* — while letting a region of it be addressed. It is what
lets eight of Dave's Bar's twenty-five props stay out of the room
listing and be found by examining the back-bar.

What is missing is the **concept**. Today the read is:

```ts
// packages/server/src/mud/api/containment.ts:272
public static looseContents(items: readonly Stuff[]): Stuff[]
```

⚠ Three things wrong with it, in increasing order:

1. It is a **presentation rule filed as a containment read** — its own
   docstring says *"this only shapes what's presented at top level"*.
2. It has **no receiver**, so every caller must remember it exists.
   Three do (`LookController`, `SenseController`, the card projection);
   the fourth surface will not, and the failure is silent clutter.
3. It sits **twelve lines below a comment in the same file** saying the
   `getContainer`/`getContents` read-wrappers *"were removed: those
   reads live on the objects themselves"*. The doctrine is written at
   line 258 and broken at line 272.

⚠ It also escaped `lint:object-verbs` — a ratchet at **zero** for an Api
static whose first parameter is a world object — because its first
parameter is an *array* of them.

## Why it blocks the naming work

The census could not answer *"what is a `Vessel`"* without knowing
whether a vessel can have regions. A design pass that guessed produced
`Vessel`/`Chamber`, which cannot express a fridge-freezer and spends the
word "chamber" on the wrong object
([base-class-narrowing-slate § Rejected](./base-class-narrowing-slate.md)).

⭐ **The wrong turn was trying to solve a second-axis problem with a
first-axis class.** Name the axis and the class question dissolves.

## The constraints any answer must satisfy

1. ⛔ **`Container` stays "a list of containables."** That is *"basically
   the entire promise the player asks the game to make when it comes to
   modelling game worlds"*. One list. The partition is a per-item label
   plus a derived view — **never a second list, never three lists that
   flatten.**
2. ⛔ **`Location` is a `Container` and must never be partitioned.** No
   multi-chambered rooms. Whatever carries the concept is composed only
   by things that have it, exactly as `Surfaced` is.
3. **Reads collapse.** `me:i:fridge:i:steak` finds the steak whichever
   region it is in. A partition is not a containment hop and must not
   become one — `here:mug` already finds a mug on a desk without naming
   the desk.
4. **Writes do not collapse.** `put steak in freezer` names the region,
   as `put vase on table` names the desk today (`put.yaml`:
   `prepositions: [in, on]`, `requires: [Visible, Container|Surfaced]`).
5. ⭐ **Single and multi are the same thing.** A one-region container is
   the degenerate case of N, so `put potion in bag` behaves exactly as
   it does today. Two shapes for one concept is the bad-UX outcome.
6. **Address freely, refuse with a reason.** A shut freezer stays
   bindable and validation says the door is shut. Nothing vanishes from
   the binder because it cannot currently be acted on.

## What the answer is NOT

⛔ **Not an MQL change.** MQL is core-of-the-core and the whole thing has
got this far without touching it. The three cases that look like MQL
problems are not:

| looks like | actually lives in | state |
|---|---|---|
| "a steak in both — which one?" | the **disambiguation prompt**, rendered in the `distinguishing` form (`presentation.md:95`) | a logged gap, already biting on two identical cane rods, no chambers required |
| "only what's in the fridge" | the **drill-in `look`** over `looseContents` | ships and works — it is how the back-bar hides eight props |
| "express the region in a query" | nothing — the region is a nameable object and the drill-in is a `look`, not a query | no change wanted |

## Open questions for the design pass

1. **What is it called?** It names a *region of a container*: the
   desktop, the freezer compartment, the crisper. The word must be
   available for the compartment, not spent on the object.
2. **Is a chamber an instance of it, or a different thing?** A surface
   is open and a chamber encloses; a surface's items are in the room's
   air and a chamber's are in its own. That difference is exactly the
   `Atmospheric` question, so the answer decides finding #1 of the
   narrowing slate.
3. **Where does the read live, and what is it called?** `Container`
   owning *"contents as presented at this level"* is the obvious move;
   the name should say presentation, since that is what it does.
4. **Does the region appear in its container's contents?** A desk
   appears in a room's. So `fridge:i` would return the freezer beside
   the steak — consistent, but a bag whose contents include *"a cold
   compartment"* may read oddly. A presentation call, not a model one.
5. **`ExitableVessel`.** A coach you ride inside is not a fridge you put
   things in. Is the coach's interior a region, or is `ExitableVessel`
   already that concept?
6. **Does `Atmospheric` survive on a non-containment object?** Its
   envelope math reads `getContainer()` and walks outward. A region that
   is not in the containment chain may break that walk — or may be
   exactly the porous outward step the frozen-ambient defect needs
   (`Thermal.ts:580`).

## Why this got missed

Worth recording, because the mechanism will repeat. The concept was
needed by `look`, `look` needed it *now*, and the Api tier accepts a
helper without asking whether the model should have grown a word. The
same file records the same failure once already: deleting
`findReachable` without a signposted replacement cost **eleven
hand-rolled copies** of the two-leg reach walk.

⭐ Both are the same disease the composition census measures from the
other side: **a mixin composed and unused is the model claiming
something false; a helper like this is the model failing to claim
something true.**
