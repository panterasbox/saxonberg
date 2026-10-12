# The shore as a place — the water citation moves onto the room

> **Status: BUILT** in maritime revision 3 (MR !358, 2026-10-11) — the place names its water, the fishing verbs bind the place, drawing water ships. **Tail kept:** a waterside place of another class (a dyehouse, a mill race) needs its own composed class; a general way for any place to be made waterside from its own row is the open design. Originally raised in the climate build's review (2026-10-11),
> handed to the maritime build (`maritime-space`, build-1) to do in its MR.
> **Left:** the citation on the room · the faces · the cited water as a
> target (`look kestrel`) · the verbs and brains that bind a `Shore` ·
> `Gunwale` as a deck's derived citation · the five shipped rows · the
> `Shore` class's retirement
> **Size:** a wave

## ⚠ Two rulings since this slate was written (maritime's review)

The maritime build (`maritime-space`) took this slate, sequenced after
MR !360 merges and after its own revision 2. Two of the proposals below
are **overruled** by the user in maritime's review, and the build follows
the rulings, not this text:

1. **No room-level contribution hook — the engine never appends to a
   room's prose.** The water read is reached by LOOKING AT the cited
   water by name (`look kestrel`), so the binder resolves a cited water
   as a target. Proposal 2 and the "who renders the read" question below
   are superseded; proposal 3 (the binder) carries the whole read.
2. **The vantage needs nothing here.** Maritime revision 1 already made
   the vantage a zone with its own `elevation` plus `horizon`. Proposal 6
   is answered.

The `fishing.md` defect (*"a prop contributes nothing to its room's
prose"*) therefore does not close by the room's `look` — the read is the
water's own `look`, which the cited water carries wherever it is named.

## The question

`/system/water/thing/Shore` is a **Thing**: a room-fixed prop that cites a
reach (`reachRef`) and reads the water in `look`. The user asked:

> *"what do we think about Shore being a thing? I feel like it makes more
> sense as a mixin on locations."*

This slate's answer is **yes — the citation belongs on the room.** It
weighs the decisions already made around `Shore`, says what replaces each
job it does, and leaves the engineering to the maritime build's plan.

## What `Shore` does today

| job | how |
|---|---|
| say *this room is beside that water* | `reachRef` on a prop listed in the room's `props:` |
| the water read in `look` | `look edge` / `look mere`, by the prop's own keyword: a `markupAugmenter` on the Shore (physical read for everyone, fishery read by band, the ice line) |
| bind a verb to a water | `fish` / `lay`: `shore` arg, `default: "reachable:[class.Shore]"`, falling back to the Locality's `_reach` |
| configure a brain | `reads-water` and `fishes` take `config.shore: <Shore path>` and read its `getReachRef()` |
| a moving shore | maritime: `Gunwale extends Shore`, citing `"<expanse>@<lat>,<lon>"` from a deck |
| keep its reads warm | a memo refreshed fire-and-forget at `onCreate` and once a weather segment (the `GristMill` shape) |

**Rows (five):** the wharfside `river-edge` (`kestrel:confluence`), the
moor's `heath-mere` (`holloway:head`), and the climate build's `blackmere`,
`circlemere`, `clearmere`. Plus maritime's gunwale.

## The decisions already made, and what they actually say

- ⭐⭐⭐ **navigable-water § 5a — "the coast is the `Shore`".** A beach is a
  LAND `Location` that **cites** a water node; *"water is cited, never
  contained and never containing — **the same relation a room already has
  to `_biomePath` and `_address`**."* ⚠ Those two are **fields on the
  room**. The slate's own analogy argues for a citation on the room; the
  Thing was the vehicle that shipped, not the decision. **Everything § 5a
  rules — cited not contained, land graph, titled by the ground's owner,
  `ashore` / `aboard` exits — survives unchanged.** Only the vehicle moves.
- ⭐⭐ **§ 5a's three faces on one citation** — *act on* water (Shore),
  *enter* it (a dive entrance), *put a craft on* it (a mooring / launch).
  As props these are three classes; as a citation they are **three flags
  on one entry**, which is what "three faces on one citation" literally
  says.
- ⭐⭐ **The landmark vantage is "the `Shore` pattern"** (§ 3): a room that
  cites what it overlooks. Same shape — a citation on the room.
- ⚠ **`fishing.md` flags the prop as a defect:** *"a prop contributes
  nothing to its room's prose … a room-level contribution hook is a
  finding for the sweep."* navigable-water counts three consumers for that
  hook (the shore, the Deliverance reach, the landmark). **A citation on
  the room makes the room's own `look` carry the water** — the defect
  closes as a consequence rather than needing the hook.

## Lens pass

- **2 · creative expression** decides it. Today a waterside room costs a
  second row (the Shore) and a `props:` line. As a citation it is **one
  line in the room's own row**, beside `_biomePath` and `_address` — an
  author who knows the room knows the water.
- **3a · immersion.** The water is part of the room you walk into, not an
  object you must `look` at by the right keyword (`fishing.md` records the
  keyword trap: `water` and `mere` are room details and *prompt*).
- **5 · continuity.** A boat deck is a Location that is beside water
  wherever it is; a dock is a Location that is beside water always. One
  mechanism, the citation **derived** on the deck and **authored** on the
  dock — the `Gunwale` stops being a prop that follows a deck around.
- **1 · pedagogy** is neutral — the reads are the same reads.

## Proposed shape (product-level; the plan decides the code)

1. **A room cites the water it is beside**, as a list (a confluence bank
   is beside two): each entry a reach plus its faces — `shore` (act on),
   `dive` (enter), `launch` (put a craft on). Authored on the room's row.
2. ~~**The room's `look` carries the water read**~~ — ⛔ overruled (see
   the rulings above): the read is `look <the water>`, by name.
3. **Verbs bind the water by name or by default.** `fish` with no water
   named fishes the room's single cited reach (else the Locality's — the
   existing fallback); with two, the water's name picks one (`fish
   blackmere`). ⚠ This is the one piece with real cost: the binder must
   resolve a *cited water* as a target. Decide whether a cited water is a
   detail, a resolver, or the river's own row (`/stuff/idea/Watercourse/
   <key>` exists for every river; whether it is a live, targetable
   instance is for the plan to check — if it is, it may be the natural
   target).
4. **Brains** take the reach (or the room) in config, not a Shore path.
5. **A deck derives its citation** from where the craft is (today's
   `Gunwale` cell, `"<expanse>@<lat>,<lon>"`), so `fish` from a deck still
   needs no fishing-pack change.
6. ~~**The vantage**~~ — answered by maritime revision 1 (a zone with
   its own `elevation` plus `horizon`).

## Engineering questions the plan must answer (not decided here)

- ⚠ **Where the citation lives, given the kernel/pack line.** The kernel
  cannot import the water pack, and a pack cannot add a field to a kernel
  class (the hydrator discards undeclared keys). Precedents: `SpatialZone`
  stores `deposit` / `groundCharacter` as **citations the kernel does not
  interpret**, and the ground pack reads them through a seam
  (`GroundSourceMixin`); `Locality` already stores `_reach`. A Location
  citation + a seam the water pack implements is the likely shape —
  *not* a water-pack Location subclass, because a waterside room is also a
  shop, a wharf, a cottage, and a room picks one class.
- ~~**Who renders the read**~~ — ⛔ no room-level hook (ruling 1). The
  read rides the cited water as a `look` target.
- **The memo's lifecycle** (refresh at create + per weather segment) moves
  from a Thing's `onCreate` to the room or the seam.
- **No migrations** — the five rows are rewritten, the dev DB dropped.
- **Tests and gates:** fishing's verb tests bind `[class.Shore]`; the
  climate drive's `analyze water` / ice checks stand at the meres; the
  `lint:location-graph` conditional-exit shape is unaffected (ice and ford
  exits cite `_crossesReach` on the exit, which stays — an exit that
  crosses water is not a room beside it).

## Collisions

- **The climate build (MR !360)** shipped three of the five Shore rows
  (`blackmere`, `circlemere`, `clearmere`) and the Shore's ice line. Its
  drive (`climate-and-water.dirty.wire.test.ts`) reads `analyze water` at
  those shores — re-run it after the move.
- **Fishing** (`trade-fishing`): `fish` / `lay` args, `FishingController.
  reachFor`, `reads-water` / `fishes` brain config, `Waters.reachAt`.
- **Maritime** (`maritime-space`): `Gunwale extends Shore`, the headland
  vantage, `Expanse.peekShorePositionFor`.
- **Docs:** `fishing.md § The shore, and the read`, navigable-water § 5a
  (amend the vehicle, keep the ruling), `watershed.md`, `expanse.md`.

## Cross-references

- [navigable-water-slate.md § 5a](./navigable-water-slate.md) — the coast
  ruling this keeps
- [fishing.md](../../subsystems/fishing.md) — the read, the bite, the
  prop defect
- [ground.md](../../subsystems/ground.md) — the citation-plus-seam
  precedent (`GroundSourceMixin`)
- [zone.md](../../subsystems/zone.md) — `deposit` / `groundCharacter` as
  uninterpreted citations
