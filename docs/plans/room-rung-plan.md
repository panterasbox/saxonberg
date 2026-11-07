# The room rung — working plan (water-supply review, 2026-11-07)

The owner chose **model A** in MR !520's review: interior places get a rung of
their own, and `PlumbedMixin` composes there and nowhere else. This note
exists so the work survives a compaction; it retires at the next sweep.

## Why (the diagnosis the owner accepted)

- `PlumbedMixin` was right; its HOST was wrong. On `Place` it put a
  `plumbing` field on every place, and nearly every place would never use it
  (review question P2).
- I then deleted it and moved the word to the parcel (`ParcelRecord.pipe`,
  824c8697f). That relocated the same problem to a different interface and
  lost the per-room pin. **Undo it** as part of this work.
- **The root cause is the taxonomy.** The location classes sort a place by
  how it is ADDRESSED (`Locale` = one particular place; `Location` = one of
  many laid out to a plan) and whether it is KEPT (`Persistent…`). Neither
  axis says what a place IS. A bathroom, a lane, a square and an offstage
  holding are all `Locale`. "Indoors" is data only (`enclosure:`/`roof:`),
  and a `Building` knows its rooms only by extent.
- **Census, 2026-11-07:** the 15 rooms with a piped tap span four classes:
  `Locale` 4, `PersistentLocale` 5, `PersistentLocation` 5, Duncan's
  `DormRoom` 1. A `Street` is exempt. Only 4 are inside a `Building`; the
  bathhouse, lavoir, ward, brewing and distilling floors, and the generic
  bar, kitchen and bathroom rows belong to none. That is why model B
  (`Building` owns its services) was not chosen.

## Constraints already decided

- **The naming rules** (owner, 2026-10-18, memory `place-taxonomy-naming`):
  - one descriptor at most (`Foo` / `PersistentFoo`), never stacked prefixes;
  - nouns, not adjectives;
  - don't coin a jargon set;
  - short names.
- **`Locale`'s header reserves "Room"** for an interior: *"'Room' implies an
  interior and is reserved for `PersistentLocation`, the interior somebody
  furnishes."*
- ⭐ **`PersistentLocation` keeps its name** (owner, 2026-11-07) — it is
  NOT renamed `Room`. The header line above is not a rename instruction;
  whatever the room rung is called, the existing four place classes stay as
  they are.
- **Rooms exist on BOTH sides of the Locale/Location split.** Seznick's
  bathroom is one particular place; a Hinkley house's rooms are laid out to
  a plan.
- **No migrations unless forced; no new Mongo collections.** Snapshots
  (`holder_snapshots`) store no class. The old stale-class failure was in
  persisted TEMPLATE rows — check that the pack installer re-syncs a row's
  `class` from content on boot before relying on it.

## The open question to settle FIRST (with the owner)

How does "room" enter a two-axis taxonomy without a stacked name?

1. **A `RoomMixin`** (interior substrate: plumbing, defaults for walls and a
   roof, whatever else only rooms have), composed onto room CLASSES named
   for the noun on each axis. The names are the question — `Room` /
   `PersistentRoom` for the Locale side? And for the Location side?
2. **Rooms are always one side.** E.g. every room is a `Location`, a
   holding's rooms included, and one-of-a-kind rooms are rows of it.
   Then `Room` / `PersistentRoom` are two classes, not four.
3. Something the owner prefers.

**P1 (does it earn a rung):** list what else is interior-only before
building:
- plumbing (the first);
- enclosure and roof defaulting to walls and a roof;
- the floor's kinds;
- furnishing (`PersistentLocation` is "the interior somebody furnishes");
- later, wiring.

If plumbing is alone, say so — that is an argument for a mixin, not a rung.

## Waves (after the question is settled)

- **W1 — census.** Every content row that is an interior (`roof:` declared
  or inherited, or `/stuff/location/room/*`, or a holding's indoor rooms),
  by class. Decide each row's new class. Rows that are exteriors stay.
- **W2 — the rung.** The room class(es) and `PlumbedMixin` composed on
  them:
  - restore the per-room `plumbing: <word>`; default `plumbing.defaultRun`;
    a tap implies its pipe;
  - **revert `ParcelRecord.pipe`** and the claims' `pipe:` (824c8697f);
  - `WaterFixture.standUpRun` asks its room again;
  - kernel classes: `lint:instanceable`, `lint:mixin-names`, the class
    rename rules.
- **W3 — content.** Reclass the interior rows. The three lead rooms (the
  generic bathroom, the Hinkley bathroom, the scullery) say
  `plumbing: lead` again. Check holding plans (`HoldingWarren`, house
  programmes) that mint rooms from rows.
- **W4 — gates and tests.**
  - `lint:water-plumbed` reads room words again;
  - `lint:reachability` maps room words;
  - a gate that `plumbing:` is only on a room class (the P2 guard);
  - unit tests;
  - `pnpm build`, `lint:family`;
  - the wire drive and `e2e/tests/water-supply-walk.spec.ts` (keep its
    Seznick lead check — it must still pass);
  - the full suite once, via `tools/suite`.
- **W5 — docs.** water-supply.md, parcel.md (drop `pipe`), architecture.md
  (the rung and `PlumbedMixin`'s host), location.md, construction.md,
  `Locale`'s header, CLAUDE.md's map line, the place-taxonomy memory.

## State at the time of writing

Branch `reqs/water-supply` at d2a179709, pushed, 0 behind master. Model A is
not started. The tree is otherwise clean.
