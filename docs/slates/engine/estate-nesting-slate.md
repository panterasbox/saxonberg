# Estate nesting slate — an owner's record grows with everything they own

> **Status: UNBUILT** — the nesting is shipped and unbounded; one
> mitigation landed in the pets build (a keyed good rides as a reference).
> **Left:** ⭐⭐ decide what an estate entry should CARRY — a reference, a
> copy, or a copy under a cap · the 16 MB document ceiling and what
> happens at it · whether a good's state belongs in the owner's record at
> all now that `EstateEntry.key` proves it need not · the migration for
> entries already written
> **Size:** **a build** — it changes the shape of every estate record and
> touches capture, restore and the room overlay

**Captured 2026-09-16**, in review of the pets MR (!257), while answering
a question about which collection persistence uses.

**Provenance:**

> **User: "I'm pretty sure you took my 'no new collections' mandate and
> started doing something worse, making one single collection fit any
> size data persisting for any reason at all."**

⭐ The specific worry turned out not to hold — `holder_snapshots` is one
of 48 authored collections, it has a defined job, and 14 classes opt in.
**But the instinct found a real thing one level down**, which is this.

**Sits on:** [persistence.md](../../subsystems/persistence.md) (the spine
and its slices) · [chattel.md](../../subsystems/chattel.md) (the
per-instance ownership index) · [furnishing.md](../../subsystems/furnishing.md)
(owner-based persistence, the estate slice).

---

## The thing

`EstateMixin.captureSlice` nests **every owned good's complete captured
state** inside its owner's `holder_snapshots` record:

```ts
entries.push({ ...entry, state: ctx.captureState(live) });
```

There is no cap. A player with 200 owned things has 200 full captures in
one document, and Mongo's hard ceiling is **16 MB**.

Measured on a freshly-driven dev world (`c881fd34e`): 9 records, 20 KB
total; the largest is a player Avatar at **4.7 KB across 42 layers**,
whose biggest single layer is `ContainerMixin` at 802 bytes — its
inventory, nested — on a character who owns almost nothing.

⚠ The growth is in the number of things a player owns, which is the one
number a game like this is *designed* to make go up.

---

## ⭐ What the pets build already proved

Shipped and documented: a self-persisting good rides in the estate as a
reference (`EstateEntry.key`, `state: {}`) —
[furnishing.md § Owner-based persistence](../../subsystems/furnishing.md)
(*a good that persists itself is a REFERENCE in the estate*),
[persistence.md § Keyed nested hosts](../../subsystems/persistence.md).

⭐⭐ **That is the shape the rest of the estate probably wants**, and the
question this slate exists to answer is why it should not be the default:
if a good can persist itself, an owner's record has no business carrying
a second copy of it.

⚠ The counter-argument, stated fairly: giving every owned good its own
record trades one large document for many small ones, and the estate's
current design is deliberate — `restoreDetached`/`captureDetached` exist
so a NON-host good can be reconstituted without a record of its own.
Whether a saucer deserves a row is exactly the trade.

---

## The questions

1. **What does an entry carry?** Reference, copy, or copy-under-a-cap.
   The pets build proved a reference works; the cost is a record per good.
2. **What happens at 16 MB?** Today: nothing checks. A capture that
   exceeds it fails at save, and the failure path is a `console.warn` in
   `cleanupOnDestruct`. ⚠ That is a silent data-loss shape.
3. **Does the container model still pay for itself?** ⭐ The two models
   are *persist the CONTAINER top-down* (expensive, preserves a whole
   contents tree) and *persist the CONTAINABLE, which remembers where it
   spawns into* (cheap, needs nothing from the container). Only four
   location classes use the first. The pets build's room overlay showed
   the second answers more cases than it was being used for.
4. **Migration.** Records already written carry nested state. ⚠ Project
   rule is **no migrations, ever** — so the answer is a DB drop, which is
   free today and will not be after launch. That makes this time-bounded.

---

## What is NOT in scope

- **`holder_snapshots` as a collection.** It is not a junk drawer and
  does not need splitting; its `(scope, owner)` unique index serves the
  identity lookups that are ~all of its traffic.
- **The pets build's `EstateEntry.key`.** It ships, it is the mitigation,
  and it is the worked example this slate generalises from.
