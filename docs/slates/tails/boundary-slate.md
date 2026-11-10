# Boundaries — one shared edge, each side is the exit

> **Status:** PARTIAL — opened 2026-11-03 (harbors review !511); the build shipped in !559
> (2026-11-10): one `Boundary` per way whose sides are the exits, the channel table, `freeFrom`,
> the edge rules for every way + `track`s, one `WayRecord`. The model lives in
> [boundary.md](../../subsystems/boundary.md).
> **Left:** the gangway as a minted boundary · the opening read by clearances (size and carrying)
> · the compass rose reading `WayRecord` (map-slate) · `water` as a channel when it has a reader ·
> lockcraft · two cleanups.
> **Size:** a tail.

What the build did not do, each with where it goes. Everything else this slate held is in
`boundary.md` (the model, the edge rules, keyed ways, `WayRecord`) and its History.

## 1. The gangway as a minted boundary

`BerthExit` and the deck's `AshoreExit` still each carry `LockableMixin` and delegate to
`Ship.gangwayLocked` — already ONE lock with two faces, so the product requirement holds, but it is
the last of the four old models (exits with a lock of their own). The shape is decided (boundary
plan D6): the ship mints `/platform/thing/boundaries/gangway` from `gangwayKeyway/gangwayLocked` at
stand-up, attaches it to the berth way and the `ashore` way, and `persistMooring()` copies the bolt
back; the berth way keeps `lockedWhenAsleep`/`keywayWhenAsleep` as the one named fallback for a
ship that is asleep. Deferred because build-2 (controller liquidity) was rewriting those exact
overrides. **Size:** a wave, after build-2 merges.

## 2. The opening read by clearances

`Exit.getOpening()` (the way's) and `Boundary.getOpening()` (the object's) exist and are checked
against the face. Nothing yet asks *does this wagon, wardrobe or horse fit through* — that is
[size](../builds/size-slate.md) (requirements: `size-and-carrying-requirements.md`)'s first read. Most ways author no
opening (null = the whole face); doorways, stairs and hatches will want their kind rows to say one.

## 3. The compass rose and the interzone list

The navigator reads `WayRecord.state`/`crossesZone`/`boundary` minimally (dashed arm, a window's
arm disabled, the title). The rose and the threshold list are [map-slate](../builds/map-slate.md)
Wave 1.

## 4. `water` as a channel

The vocabulary is closed and refuses `water:` until a walk reads it (an ice hole, a flooded hatch,
a ship's watertight door). Add the word with its first reader.

## 5. Lockcraft

`lockTechnology: none`, picking, master keys by trade — [lock-slate](../builds/lock-slate.md).
`freeFrom` already gives a door a thumb-turn side.

## 6. Cleanups (findings, no design)

- `ExitableVessel` composes `Adornable` only for the retired anchors; whether a vessel still needs
  fixtures is a question for its next build.
- `FrontDoorExit` and `DormDoor` keep a class only for `computeDestination`; they may reduce to
  `DeferredDestinationExit` plus a kind-row datum.
- The pump house has no light of its own: with its door shut, its door reads *something* from
  inside (terminus content).
