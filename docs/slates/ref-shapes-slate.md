# Ref Shapes — Working Slate

Working doc for the non-singleton expansion of
[docs/ref-shapes.md](../ref-shapes.md). Retire when the design ships
in full.

Paused mid-conversation while the locomotion build wraps. The
existing `ref-shapes.md` handles singleton refs (Pattern A) well; this
slate captures the design discussion around **instance refs** and the
stale-handling story that Pattern B today glosses over. Resume here
when locomotion is done.

## Where the existing doc is solid

- **Pattern A (string-stored singleton ref)** — locked. Field naming,
  method surface, getter/setter behavior, antipatterns all
  grounded in shipped exemplars (`Tangible`, `Organism`, `Species`,
  `Mobile`). Don't touch.
- **Pattern C (lazy ref)** — shape is right for the singleton case
  (`Exit._destinationPath`). Slate proposes generalizing C to instances
  below.
- **Decision matrix and "where to put new singleton refs"** — fine.

## Where the gap is

`Pattern B (live Stuff reference)` gets one short section and a
five-row exemplar table. Two real questions land there and aren't
addressed:

1. **Stale-ref semantics.** Holder has a live ref to a target that
   gets `StuffApi.destruct`ed. The ref is dangling immediately — the
   security proxy will throw `DestroyedObjectError` on the next method
   call. What's the cleanup story?
2. **Cross-scope / lazy-load.** The world loads lazily ("fault-tolerant"
   is the stated preference). A persisted ref's target may not be
   loaded when the holder hydrates. Pattern B + marshaller doesn't
   address this; Pattern C does, but only for singletons today.

## Locked decisions from the conversation

- **No fourth pattern for stamp-stored instance refs.** The use case
  (audit logs, "remember without pinning") is satisfied by capturing
  a display string at the moment of the event with the live ref in
  hand. We don't compose loglines retroactively. Drop the idea.
- **Pattern B is only safe inside an atomic-load-unit.** Holder and
  target must be guaranteed to load together (containment, slot
  occupancy). Anything cross-scope must use Pattern C, generalized
  to instances. This keeps "lazy everywhere" consistent with
  "eager marshaller resolution at hydrate" — Pattern B's eager
  resolution is fine because the target is already loaded.
- **Owning forward refs cascade destruct.** The destructing owner's
  `onDestruct()` walks its owned refs and destructs them in turn.
  This is already the pattern: `Exitable.onDestruct()` destructs its
  outbound Exits; `Adornable.onDestruct()` destructs its fixtures.
  Doc should name this and codify it.
- **Bidirectional symmetric refs clean up via the setter.** Exit↔Door
  works today: Exit's `setDoor()` calls `door.detachExit()` to keep
  both sides aligned. Generalize as the pattern for two-way relations.
- **Lazy self-heal is essentially free for asymmetric single refs.**
  `Stuff.isDestroyed()` is `@Final @Unshadowable`, can't be lied
  about, costs nothing. The Pattern B getter becomes:
  ```ts
  public getXxx(): (Stuff & XxxType) | null {
    if (this._xxx === null) return null;
    if (this._xxx.isDestroyed()) {
      this._xxx = null;
      return null;
    }
    return this._xxx;
  }
  ```
  No new infrastructure. Use for single refs where the held side
  doesn't know about the holder.

## Open questions to resolve on resume

### 1. Symmetric cleanup vs. doc-and-convention (the structural choice)

For **collections** (Set/Map of live refs), lazy self-heal is too
expensive (would walk the collection on every read). Two paths:

- **(a) Doc-and-convention.** Require callers to go through the
  subsystem Api (`ContainmentApi.move(item, null)`,
  `SlotApi.vacate`, etc.) *before* destructing a participant. Nothing
  enforces this. This is what the codebase does today, partially.
- **(b) Symmetric cleanup via held side's `onDestruct`.**
  `Containable.onDestruct` calls `environment.removeContents(this)`.
  `Slottable.onDestruct` calls `host.releaseFromSlot(this)`. The
  destructing object actively unhooks itself from every tracked
  collection it's a member of. Same shape as Exit↔Door, generalized.

User chose **(b)**, but flagged it introduces code we don't have yet.
Slate it as the target; the doc will describe where we're going, and
the implementation work is a follow-on.

### 2. Container/contents persistence — RESOLVED

`Container.contents` and `Containable._container` are **transient
live refs at that level**. The exemplar table in
`docs/ref-shapes.md` ("persisted via marshaller") is wrong and needs
fixing.

Persistent containment relationships live **a layer up**:

- **Template-seeded spawn** — a room template declares what spawns
  inside it; those clones are created at hydrate via the seeding
  pipeline. The persistent fact is "room X spawns Y", not "this
  specific instance of Y is in this specific instance of X."
- **Captured visitors** — a room that wants to remember a transient
  visitor that wandered in handles it case-by-case via a mixin (or
  set of mixins) the room composes. Not a base-Container concern.

**Implication for Pattern B's persistence story.** Pretty much
every exemplar in the current B table is actually transient:

- `Container.contents` / `Containable._container` — transient
  (confirmed)
- `Slotted.slots` — explicitly runtime-only
- `Clade.species` — explicitly runtime-only registration

`Exit._door` is also transient — the Exit↔Door pairing is owned by
a third party (the shared Boundary substrate they both adorn) and
rederived at load time, not persisted on either side. Confirmed.

**Therefore Pattern B = transient live refs, period.** No marshaller
story. Any persisted ref goes through Pattern C (or a higher-layer
mixin that owns the relationship). The rewritten Pattern B doc has
no "persistence" subsection.

Adjacent cases the user flagged (re-hydrating an existing container
with a runtime ref to it; a container that manages a clone pool) are
the **owning-ref cascade** sub-flavor of Pattern B — owner's
`onDestruct` destructs its owned clones. Pattern, not a new
mechanism.

### 3. Silent-stale gaps in current code

Surfaced during the explore pass; not catastrophic but worth fixing
when (b) lands:

- **`Containable.environment`**: held ref. If the container is
  destructed without first moving the item out, the item's
  `environment` ref is silently stale. Next method call throws
  `DestroyedObjectError`.
  See `packages/server/src/mud/lib/spatial/Containable.ts:90–125`.
- **`Slotted.slots`**: occupant Set. If an occupant is destructed
  without vacating the slot, the set retains the dead ref. Slotted is
  runtime-only so full reload clears it, but mid-session you can
  accumulate destructed occupants in a slot.
  See `packages/server/src/mud/lib/slot/Slotted.ts:170`.

Pattern (b) closes both — the held side's `onDestruct` removes itself
from the holder's collection.

### 4. Pattern C generalized to instances

Existing exemplar (`Exit._destination`) is a Location, which is
borderline (instance class, but conventionally one-per-templatePath).
The generalized form for true multi-clone instances:

- Persist the stamp string (templatePath of the clone).
- Async `resolveXxx()` may fault in the target zone.
- Sync `getXxx()` returns the cached live ref or null (null if not
  warm OR if cached target is destructed — same self-heal as B).
- Hydrate is null-tolerant; persistence is a simple string; no
  marshaller ceremony.

This is the answer for any persisted cross-scope ref to an instance.
Worth a full Pattern C section once (b) is settled and the
container/contents contradiction is resolved.

## What the resulting doc will look like (sketch)

Roughly:

1. Pattern A — unchanged (singleton path ref)
2. Pattern B — rewritten
   - Atomic-load-unit constraint stated upfront
   - Three sub-flavors: **owning** (destruct cascades),
     **symmetric** (both-sides setter cleanup, e.g. Exit↔Door),
     **asymmetric single** (lazy self-heal via `isDestroyed()`)
   - Collections require symmetric bookkeeping by construction —
     held side's `onDestruct` removes itself from holder
3. Pattern C — generalized to instances
   - For all cross-scope persisted refs
   - Async resolve, sync get, null-tolerant
4. Antipatterns — add the new ones
   - "Pattern B for a cross-scope ref" → use C
   - "Hold an asymmetric single ref without self-heal in the getter"
   - "Hold a collection of live refs without symmetric cleanup"

## Pickup point

Read this slate and `docs/ref-shapes.md` together. Both factual
questions are now resolved: containment is transient at the base
layer; Exit↔Door is transient via the Boundary substrate; **Pattern B
has no marshaller story**. Remaining work:

1. **Decide on (b)** — symmetric cleanup via held side's `onDestruct`.
   Already chosen as the design target; outstanding is whether the
   doc rewrite ships with the implementation or as a forward-looking
   spec.
2. **Rewrite Pattern B** in `docs/ref-shapes.md` per the sketch above
   — atomic-load-unit constraint, three sub-flavors (owning /
   symmetric / asymmetric single), no persistence subsection.
3. **Add Pattern C for instances** (cross-scope persisted refs) once
   B is settled.
