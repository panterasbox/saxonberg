# Estate nesting slate — an owner's record grows with everything they own

> **Status: REQUIREMENTS** — agreed 2026-11-22 in
> [estate-nesting-requirements](../../requirements/estate-nesting-requirements.md):
> every owned good keeps itself and the estate is an index; failed saves
> are loud, isolated and told to operator and player.
> **Left:** the plan, then the build
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

---

## Reuse ledger for the plan

Verified in code 2026-11-22 (`be83f63ce`). Every row is one the plan must
account for.

| concept the build needs | what already does it | reuse / generalize |
|---|---|---|
| a good that saves itself, referenced from the estate | `EstateEntry.key` + `state: {}`; `Estate.captureSlice` reference branch (`lib/chattel/Estate.ts:243-255`); `Bonded` promotion of a named `KeptAnimal` (`Bonded.ts:696-706`) | **generalize** — the reference becomes the default for every owned good, not a promotion |
| standing a keyed good back up on restore | `standUpKeyed` in `Estate.hydrateSlice` (`Estate.ts:311-387`) | reuse |
| putting an owner's goods back in a room that loads | `overlayOwnedGoods` (`PersistableLogic.ts:1466-1544`), `putBackWithin` (`:1555-1599`) | reuse; its keyless branch (`restoreDetached`) likely retires |
| where a good was last placed | the `chattel` row's `place` + `pin`, `ChattelLogic.pinOf`; `HostPlacement` in `record.place` | reuse — closes the public-room gap for owned goods |
| a non-host good captured without a record | `captureDetached` / `restoreDetached` (`api/persistable.ts:186-210`), only caller `ChattelLogic.syncEstate` | **retire or narrow** — the counter-argument the slate states; decide in the plan |
| per-record identity | `holder_snapshots` `(scope, owner)` unique index; `owner` holds the key (`PersistableLogic.ts:1331,1389-1393`) | reuse; ⚠ `persistence.md:672-677` misdescribes `owner` — fix the doc |
| a container nesting its contents | `ContainerSlice` / `captureItem` (`Container.ts:733-813`, `PersistableLogic.ts:814-837`); owned goods already skipped via `noteOwnedGood` | reuse unchanged — physics bounds it |
| batched record writes | `PersistenceManager.saveMany` (`bulkWrite`, `ordered: false`, `:807-863`) | **generalize** — per-record failure isolation |
| surfacing a failure to an author | `DiagnosticApi` store + `errors` verb ([diagnostics.md](../../subsystems/diagnostics.md)) | reuse — a new producer, not a new store |
| telling the player | the ordinary message to the body | reuse |
| a signed-out body's retirement | `retireSignedOutBody` (`Avatar.ts:1802-1816`) | fix — always completes |
| updating a signed-out owner's estate | `patchStoredEstate` (`PersistableLogic.ts:663-678`) — drops `escheatedAt`/`beneficiary`, writes outside `serialRecordWrite` | fix (requirements: folded in) |
| a keyed good's estate entry written unloaded | `ChattelLogic.syncEstate` (`:520-541`) writes a full copy with no `key` | fix (folded in) |
| removing a destroyed good's record | `cleanupOnDestruct` (`Persistable.ts:456-467`) | reuse; verify it runs for every owned good |
| measuring record sizes | nothing (`SAXONBERG_QUERY_TRACE` counts ops, not bytes) | **genuinely new** — operator reading |
